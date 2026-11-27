#!/usr/bin/env python3
"""Export A1 lesson pages from Notion (read-only token) into data/a1/lesson-N.json.
Audio is saved as files under audio/a1/ so playback does not depend on expiring URLs.
Prints only counts, never URLs or tokens."""
import json, os, sys, time, hashlib, urllib.request, urllib.error

TOKEN = os.environ['NOTION_TOKEN']
API = 'https://api.notion.com/v1/'
HDR = {'Authorization': 'Bearer ' + TOKEN, 'Notion-Version': '2022-06-28'}

def get(path):
    for i in range(6):
        try:
            req = urllib.request.Request(API + path, headers=HDR)
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(2 + i * 2); continue
            raise SystemExit('notion http %s' % e.code)
        except Exception:
            time.sleep(2)
    raise SystemExit('notion unreachable')

def children(bid):
    out, cur = [], None
    while True:
        r = get('blocks/%s/children?page_size=100%s' % (bid, '&start_cursor=' + cur if cur else ''))
        out += r['results']
        if not r.get('has_more'): return out
        cur = r['next_cursor']

def rich(rt):
    parts = []
    for t in rt or []:
        a = t.get('annotations', {})
        parts.append({'t': t.get('plain_text', ''), 'b': a.get('bold') or None, 'i': a.get('italic') or None,
                      'c': a.get('code') or None, 'href': t.get('href')})
    return parts

SAVED = {}
def save_audio(block, lesson):
    a = block['audio']
    src = (a.get('file') or {}).get('url') or (a.get('external') or {}).get('url')
    if not src: return None
    h = hashlib.sha1(block['id'].encode()).hexdigest()[:10]
    ext = '.mp3'
    low = src.split('?')[0].lower()
    for e in ('.mp3', '.m4a', '.wav', '.ogg', '.aac'):
        if low.endswith(e): ext = e
    rel = 'audio/a1/%02d-%s%s' % (lesson, h, ext)
    if not os.path.exists(rel):
        os.makedirs(os.path.dirname(rel), exist_ok=True)
        for i in range(3):
            try:
                with urllib.request.urlopen(src, timeout=60) as r, open(rel, 'wb') as f:
                    f.write(r.read())
                break
            except Exception:
                time.sleep(2)
        else:
            return None
    return rel

def conv(block, lesson):
    t = block['type']; d = block.get(t, {})
    n = {'type': t}
    if t in ('paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item',
             'quote', 'callout', 'toggle', 'to_do'):
        n['text'] = rich(d.get('rich_text'))
        if t == 'callout': n['icon'] = (d.get('icon') or {}).get('emoji')
        if t == 'to_do': n['checked'] = d.get('checked')
    elif t == 'audio':
        n['file'] = save_audio(block, lesson)
        n['caption'] = rich(d.get('caption'))
    elif t in ('pdf', 'file', 'video', 'image', 'embed', 'bookmark'):
        n['note'] = 'media-not-exported'
        n['caption'] = rich(d.get('caption'))
        u = d.get('url') or (d.get('external') or {}).get('url')
        if u and 'amazonaws' not in u and 'secure.notion' not in u: n['href'] = u
    elif t == 'table':
        n['rows'] = []
        for row in children(block['id']):
            n['rows'].append([rich(c) for c in row['table_row']['cells']])
        return n
    elif t == 'divider':
        pass
    else:
        n['text'] = rich(d.get('rich_text')) if isinstance(d, dict) else []
    if block.get('has_children') and t != 'table':
        n['children'] = [conv(c, lesson) for c in children(block['id'])]
    return n

def main():
    idx = json.load(open('data/a1-index.json'))
    os.makedirs('data/a1', exist_ok=True)
    only = set(sys.argv[1:])
    total_audio = 0
    for item in idx['lessons']:
        n = item['n']
        if only and str(n) not in only: continue
        blocks = [conv(b, n) for b in children(item['page_id'])]
        def count(bs):
            c = 0
            for b in bs:
                if b['type'] == 'audio' and b.get('file'): c += 1
                c += count(b.get('children', []))
            return c
        a = count(blocks); total_audio += a
        out = {'n': n, 'title': item['title'], 'blocks': blocks, 'audio_count': a}
        tmp = 'data/a1/lesson-%d.json.tmp' % n
        json.dump(out, open(tmp, 'w'), ensure_ascii=False, separators=(',', ':'))
        os.replace(tmp, 'data/a1/lesson-%d.json' % n)
        print('lesson', n, 'ok audio', a)
    print('total audio', total_audio)

main()
