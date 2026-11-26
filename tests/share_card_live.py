"""分享卡端到端：AI 用假的，存圖走線上 Worker；檢查專屬連結的預覽頁與圖片。python tests/share_card_live.py 輸出資料夾"""
import sys, os, json, re, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from fake_worker import sse, READING, ASK
out = sys.argv[1]; os.makedirs(out, exist_ok=True)

def route(r):
    if r.request.url.split("?")[0].endswith("/card"):
        return r.continue_()  # 存圖走線上
    if r.request.method == "OPTIONS":
        return r.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
    body = sse(READING if '"reading"' in (r.request.post_data or "") else ASK)
    r.fulfill(status=200, body=body, headers={"Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*"})

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    ctx.route("https://wenming-ai.oracle-tarot.workers.dev/**", route)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])"); pg.click("#enter"); pg.wait_for_timeout(900)
    pg.click("[data-m=read]"); pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(400)
    pg.click("#nameOk"); pg.wait_for_timeout(400); pg.click("[data-g=m]"); pg.wait_for_timeout(900); pg.click("#noCard"); pg.wait_for_timeout(500)
    pg.click("[data-t=career]"); pg.click("#goCount"); pg.click(".skip"); pg.wait_for_selector("#askBox:not([hidden])", timeout=30000); pg.wait_for_timeout(1500)
    pg.click("#shareR"); pg.wait_for_selector("#shMain:not([disabled])", timeout=20000); pg.wait_for_timeout(500)
    pg.screenshot(path=f"{out}/panel.png")
    href = pg.get_attribute("#toLine", "href"); tip = pg.inner_text("#shTip")
    print("tip:", tip)
    link = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)["url"][0]
    print("link:", link)
    print("errors:", errs); b.close()

for ua in ["facebookexternalhit/1.1", "Mozilla/5.0 (compatible; Line/13.0)"]:
    html = urllib.request.urlopen(urllib.request.Request(link, headers={"User-Agent": ua})).read().decode("utf-8")
    ogimg = re.search(r'og:image" content="([^"]+)"', html).group(1)
    title = re.search(r'og:title" content="([^"]+)"', html).group(1)
    print(ua.split("/")[0], "title:", title, "image:", ogimg)
data = urllib.request.urlopen(urllib.request.Request(ogimg, headers={"User-Agent": "facebookexternalhit/1.1"})).read()
open(f"{out}/og.jpg", "wb").write(data); print("image bytes:", len(data))
