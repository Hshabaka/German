#!/usr/bin/env python3
"""Static pre-publish check for course sessions. Run from the repo root: python3 scripts/check_course.py
Fails (exit 1) on: wrong or missing lesson-audio binding, playlist/session mismatch,
supplementary sections, practice audio keys not loaded by the session page,
missing chunk files, session pages missing from the offline cache list."""
import json, re, sys, os, glob, base64

errs = []
def bad(m): errs.append(m)

reg = json.load(open('data/registry.json'))
lessons = {l['n']: l for l in reg['levels']['a1']['lessons']}
audio = {e['n']: e for e in json.load(open('data/audio.json'))['a1']}
sw = open('sw.js').read()
app = open('js/app.js').read()

if re.search(r'AUD\.list\[\s*0\s*\]|AUD\.list\[AUD\.i\]', app):
    bad('app.js falls back to the first audio entry')
if 'renderExtra' in app:
    bad('app.js still contains the supplementary (extra) section')

for path in sorted(glob.glob('data/session-*.json')):
    n = int(re.search(r'session-(\d+)', path).group(1))
    d = json.load(open(path))
    tag = 'S%02d' % n
    if d.get('id') != 'session-%d' % n: bad('%s: id is %r' % (tag, d.get('id')))
    if 'extra' in d: bad('%s: has a supplementary "extra" section' % tag)
    if n not in lessons: bad('%s: not in data/registry.json' % tag); continue
    L = lessons[n]
    if not os.path.exists(L['route'] + 'index.html'): bad('%s: page %s missing' % (tag, L['route']))
    yt = (d.get('video') or {}).get('url')
    if yt and yt != L.get('youtube'): bad('%s: session json video differs from registry' % tag)
    if './data/session-%d.json' % n not in sw: bad('%s: data file not in sw.js CORE' % tag)
    html = open(L['route'] + 'index.html').read()
    loaded = re.findall(r'src="([^"]*audio-[^"]*\.js)"', html)
    keys = set()
    for s in loaded:
        f = os.path.normpath(s)  # pages resolve scripts from the site root
        if not os.path.exists(f): bad('%s: script %s missing' % (tag, s)); continue
        keys |= set(re.findall(r'"(audio/[^"]+\.mp3)"', open(f).read()))
    txt = re.sub(r'"audio_target": "[^"]*"', '', json.dumps(d))  # words flagged noaudio keep a target only
    used = set(re.findall(r'audio/[\w/.-]+\.mp3', txt))
    for u in sorted(used - keys): bad('%s: practice audio %s not loaded by its page' % (tag, u))
    # lesson audio (recording) must be bound to this session only
    e = audio.get(n)
    if not e: bad('%s: no lesson recording in data/audio.json (playlist would skip it)' % tag)
    if e:
        files = [e['src']] if e.get('src') else e.get('parts', [])
        if not files: bad('%s: audio entry has no source' % tag)
        for f in files:
            if not os.path.exists(f): bad('%s: lesson audio file %s missing' % (tag, f))
        if e.get('parts'):
            try:
                raw = base64.b64decode(''.join(open(f).read() for f in files if os.path.exists(f)))
                if raw[4:8] != b'ftyp': bad('%s: chunks do not decode to an m4a file' % tag)
            except Exception as x:
                bad('%s: chunk decode failed (%s)' % (tag, x))
for n in audio:
    if n not in lessons: bad('audio.json entry %d has no lesson in registry' % n)
    if not os.path.exists('data/session-%d.json' % n): bad('audio.json entry %d has no session data' % n)
pl = open('js/playlist.js').read()
if 'A[x.n]' not in pl: bad('playlist does not bind audio by lesson number')

print('FAIL' if errs else 'PASS', '-', len(errs), 'problem(s)')
for m in errs: print(' -', m)
sys.exit(1 if errs else 0)
