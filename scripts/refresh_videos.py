import json, os, sys, time, urllib.request

TOKEN = os.environ["NOTION_TOKEN"]
PAGES = json.loads(os.environ["VIDEO_PAGES"])


def api(path):
    req = urllib.request.Request(
        "https://api.notion.com/v1/" + path,
        headers={"Authorization": "Bearer " + TOKEN, "Notion-Version": "2022-06-28"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def find_video(page_id):
    cursor = None
    while True:
        q = "blocks/%s/children?page_size=100" % page_id
        if cursor:
            q += "&start_cursor=" + cursor
        d = api(q)
        for b in d.get("results", []):
            if b.get("type") == "video" and b["video"].get("type") == "file":
                return b["video"]["file"]["url"]
        if not d.get("has_more"):
            return None
        cursor = d["next_cursor"]


out = {}
now = int(time.time())
for key, pid in PAGES.items():
    try:
        url = find_video(pid)
    except Exception as e:
        print("session", key, "error", type(e).__name__)
        continue
    if url:
        out[key] = {"url": url, "fetched_at": now, "expires_at": now + 55 * 60}
        print("session", key, "ok")
    else:
        print("session", key, "no video block")

if not out:
    print("no urls fetched, keeping previous file")
    sys.exit(1)
os.makedirs("data", exist_ok=True)
with open("data/video-urls.json", "w") as f:
    json.dump(out, f)
