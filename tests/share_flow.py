"""分享面板與朋友連結截圖：python tests/share_flow.py 輸出資料夾"""
import sys, os
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__)); from fake_worker import fake_worker
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
U = "http://127.0.0.1:8765/"
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(390, 844), (1366, 800)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=w < 900)
        ctx.grant_permissions(["clipboard-read", "clipboard-write"]); fake_worker(ctx)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(U); pg.wait_for_selector("#enter:not([disabled])"); pg.click("#enter"); pg.wait_for_timeout(900)
        pg.click("[data-m=read]"); pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(400)
        pg.click("#nameOk"); pg.wait_for_timeout(400); pg.click("[data-g=m]"); pg.wait_for_timeout(900)
        pg.click("#noCard"); pg.wait_for_timeout(500); pg.click("#goCount")
        pg.click(".skip"); pg.wait_for_selector(".hero", timeout=30000); pg.wait_for_timeout(800)
        pg.evaluate("document.querySelector('#shareR').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{out}/{w}_1_reading_share_btn.png")
        pg.click("#shareR"); pg.wait_for_selector(".share-pic img", timeout=20000); pg.wait_for_timeout(600)
        pg.screenshot(path=f"{out}/{w}_2_panel.png")
        pg.click("#shLink"); pg.wait_for_timeout(300)
        link = pg.evaluate("navigator.clipboard.readText()")
        print(w, "link:", link)
        pg.click("#shClose"); pg.wait_for_timeout(400)
        # 朋友打開連結
        pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e)))
        pg2.goto(link); pg2.wait_for_selector("#enter:not([disabled])"); pg2.click("#enter"); pg2.wait_for_timeout(1200)
        pg2.screenshot(path=f"{out}/{w}_3_friend.png")
        pg2.click("#seeFriend"); pg2.wait_for_selector(".hero .grade"); pg2.wait_for_timeout(800)
        pg2.screenshot(path=f"{out}/{w}_4_friend_reading.png")
        print(w, "errors:", errs); ctx.close()
    b.close()
