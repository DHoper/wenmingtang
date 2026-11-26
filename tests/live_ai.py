"""線上實測（會花 DeepSeek 次數）：本機網站＋線上 Worker，真的批一張、追問一句、分享存卡。python tests/live_ai.py 輸出資料夾"""
import sys, os, re, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    pg = ctx.new_page(); errs = []; reqs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("response", lambda r: reqs.append(f"{r.status} {r.request.method} {r.url.split('?')[0]}") if "workers.dev" in r.url else None)
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])"); pg.click("#enter"); pg.wait_for_timeout(900)
    pg.click("[data-m=read]"); pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(400)
    pg.click("#nameOk"); pg.wait_for_timeout(400); pg.click("[data-g=m]"); pg.wait_for_timeout(900); pg.click("#noCard"); pg.wait_for_timeout(500)
    pg.click("[data-t=career]"); pg.click("#goCount"); pg.click(".skip"); pg.wait_for_selector(".hero", timeout=30000)
    pg.wait_for_function("!document.querySelector('.ink-wait')", timeout=90000); pg.wait_for_timeout(500)
    print("headline:", pg.inner_text(".hero .hlp"))
    print("ren:", pg.inner_text("#sec-ren .bai")[:120])
    print("note:", pg.inner_text("#aiNote") if pg.is_visible("#aiNote") else "-")
    pg.screenshot(path=f"{out}/reading.png")
    pg.fill("#askQ", "適合自己出來做生意嗎？"); pg.dispatch_event("#askQ", "input"); pg.click("#askGo")
    pg.wait_for_function("document.querySelector('.qa-a') && !document.querySelector('.qa-a').textContent.includes('點一炷香') && !document.querySelector('#askQ').disabled", timeout=60000)
    print("answer:", pg.inner_text(".qa-a"))
    print("left:", pg.inner_text("#askLeft"))
    pg.evaluate("document.querySelector('#askBox').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{out}/ask.png")
    pg.click("#shareR"); pg.wait_for_selector("#shMain:not([disabled])", timeout=40000); pg.wait_for_timeout(400)
    href = pg.get_attribute("#toLine", "href"); link = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)["url"][0]
    print("share link:", link, "| tip:", pg.inner_text("#shTip"))
    pg.screenshot(path=f"{out}/share.png")
    print("worker:", reqs); print("errors:", errs); b.close()
html = urllib.request.urlopen(urllib.request.Request(link, headers={"User-Agent": "facebookexternalhit/1.1"})).read().decode("utf-8")
print("og:", re.search(r'og:title" content="([^"]+)"', html).group(1), re.search(r'og:image" content="([^"]+)"', html).group(1))
