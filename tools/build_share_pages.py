"""產生分享用的靜態頁與預覽圖。
用法：python tools/build_share_pages.py https://dhoper.github.io/wenmingtang/
- site/og/home.jpg、site/og/g1.jpg～g5.jpg：1200×630 預覽圖（用瀏覽器 canvas 以網站素材畫，需本機伺服器 127.0.0.1:8765 在跑）
- site/r/1.html～5.html：每個評等一頁，OG 寫死；人打開會帶著 # 後面的資料轉回首頁
- site/index.html：OG 標籤（絕對網址）
"""
import sys, os, re, base64, html
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip("/") + "/"
ROOT = os.path.join(os.path.dirname(__file__), "..", "site")
GRADES = ["上上", "上", "中", "中下", "下"]
SAY = {
    "上上": "名字批到上上，先生點頭說難得。",
    "上": "名字批到上，先生說這名字不錯。",
    "中": "名字批到中，先生說還可以，有幾個所在要注意。",
    "中下": "名字批到中下，先生老實講了幾句。",
    "下": "名字批到下，先生說這名字要想一想。",
}
DESC = "夜裡的廟口，算命攤前坐下，把名字交給算命先生：康熙筆畫、五格三才、八字喜用神，一張批命紅紙說分明。"

JS = r"""async ([grade]) => {
  const im = s => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
  const [bg, plaque, frame, master] = await Promise.all(['assets/scene/bg-wide.webp', 'assets/ui/plaque.webp', 'assets/ui/red-frame.webp', 'assets/master/' + (grade && (grade === '中下' || grade === '下') ? 'stern' : grade ? 'approve' : 'idle') + '.webp'].map(im));
  const SONG = '"Noto Serif TC", serif', KAI = '"WM Kai", serif';
  await document.fonts.load(`900 200px ${SONG}`, '問名堂上中下'); await document.fonts.load(`400 40px ${KAI}`, '夜裡的廟口把名字交給算命先生康熙筆畫五格三才八字喜用神看你的名字批到');
  const W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const s = Math.max(W / bg.width, H / bg.height); c.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2 - 60, bg.width * s, bg.height * s);
  const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(8,10,18,.25)'); g.addColorStop(.55, 'rgba(8,10,18,.7)'); g.addColorStop(1, 'rgba(8,10,18,.85)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const mh = 600, mw = mh * master.width / master.height; c.drawImage(master, 10, H - mh + 30, mw, mh);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const cx = 860;
  const pw = 400, ph = pw * plaque.height / plaque.width; c.drawImage(plaque, cx - pw / 2, 40, pw, ph);
  c.font = `900 62px ${SONG}`; c.fillStyle = '#f3d48c'; const t = '問名堂'; let x = cx - 100; for (const ch of t) { c.fillText(ch, x, 40 + ph / 2 + 2); x += 100; }
  if (grade) {
    const nine = (im, sl, x, y, w, h, b) => { const W2 = im.width, H2 = im.height, sx = [0, sl, W2 - sl, W2], sy = [0, sl, H2 - sl, H2], dx = [x, x + b, x + w - b, x + w], dy = [y, y + b, y + h - b, y + h]; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) c.drawImage(im, sx[k], sy[r], sx[k + 1] - sx[k], sy[r + 1] - sy[r], dx[k], dy[r], dx[k + 1] - dx[k], dy[r + 1] - dy[r]); };
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 24; c.shadowOffsetY = 10; nine(frame, 56, cx - 220, 200, 440, 300, 26); c.restore();
    c.font = `400 34px ${KAI}`; c.fillStyle = '#ffe6d2'; c.fillText('我的名字批到', cx, 252);
    c.font = `900 ${grade.length > 1 ? 150 : 170}px ${SONG}`; c.fillStyle = '#ffe3a3'; c.shadowColor = 'rgba(70,0,0,.75)'; c.shadowOffsetY = 5; c.fillText(grade, cx, 382); c.shadowColor = 'transparent';
    c.font = `400 36px ${KAI}`; c.fillStyle = '#f6ead4'; c.fillText('你的名字呢？', cx, 560);
  } else {
    c.font = `400 40px ${KAI}`; c.fillStyle = '#f6ead4';
    c.fillText('夜裡的廟口，', cx, 290); c.fillText('把名字交給算命先生。', cx, 350);
    c.font = `400 30px ${KAI}`; c.fillStyle = '#e8c47a'; c.fillText('康熙筆畫・五格三才・八字喜用神', cx, 440);
  }
  return cv.toDataURL('image/jpeg', .86);
}"""

def og_tags(title, desc, img, url=None):
    t = [f'<meta property="og:type" content="website">', f'<meta property="og:site_name" content="問名堂">',
         f'<meta property="og:title" content="{html.escape(title)}">', f'<meta property="og:description" content="{html.escape(desc)}">',
         f'<meta property="og:image" content="{img}">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
         '<meta name="twitter:card" content="summary_large_image">']
    if url: t.insert(2, f'<meta property="og:url" content="{url}">')
    return "\n".join(t)

os.makedirs(os.path.join(ROOT, "og"), exist_ok=True); os.makedirs(os.path.join(ROOT, "r"), exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])", timeout=20000)
    for i, gname in enumerate([None] + GRADES):
        data = pg.evaluate(JS, [gname])
        name = "home" if gname is None else f"g{i}"
        open(os.path.join(ROOT, "og", name + ".jpg"), "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()

for i, g in enumerate(GRADES, 1):
    page = f"""<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>我的名字批到【{g}】｜問名堂</title>
<meta name="description" content="{html.escape(SAY[g])}">
{og_tags(f"我的名字批到【{g}】｜問名堂", SAY[g] + "換你，名字拿去給先生看看。", BASE + f"og/g{i}.jpg", BASE + f"r/{i}.html")}
<script>location.replace("../" + (location.hash.length > 1 ? location.hash : ""));</script>
</head><body style="background:#0d1420;color:#f6ead4;font-family:serif;padding:2em">
<p><a href="../" style="color:#e8c47a">到問名堂看你的名字</a></p>
</body></html>
"""
    open(os.path.join(ROOT, "r", f"{i}.html"), "w", encoding="utf-8", newline="\n").write(page)

idx = os.path.join(ROOT, "index.html")
s = open(idx, encoding="utf-8").read()
s = re.sub(r"\n<!-- OG -->.*?<!-- /OG -->", "", s, flags=re.S)
s = s.replace('<meta name="description"', "\n<!-- OG -->\n" + og_tags("問名堂｜廟口算命攤，看你的名字", DESC, BASE + "og/home.jpg", BASE) + "\n<!-- /OG -->\n<meta name=\"description\"", 1)
open(idx, "w", encoding="utf-8", newline="\n").write(s)
print("ok", BASE)
