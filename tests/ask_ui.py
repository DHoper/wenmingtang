"""叩問區與神力耗盡視窗截圖（攔截 Worker，用固定回答，不花 DeepSeek 次數）。python tests/ask_ui.py 輸出資料夾"""
import sys, os, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
ans = "你問自己出來做生意，我照名字講。\n\n你姓「林」八畫加「家」十畫，人格十八畫，屬金，「鐵鏡重磨」，吉數。這格有魄力，自己當頭家撐得起來。外格「豪」十四畫再加一，十五畫，「福壽」，大吉，出外有貴人。\n\n只是三才水金火配得不順，家裡跟底下的人常給你出難題。要做，本錢留厚一點，家裡先安頓好，再往外衝。\n\n名字是一半，你怎麼做是另一半。"
sse = "".join("data: " + json.dumps({"choices": [{"delta": {"content": ans[i:i+6]}}]}, ensure_ascii=False) + "\n\n" for i in range(0, len(ans), 6)) + "data: [DONE]\n\n"
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(390, 844), (1366, 768)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=w < 900); pg = ctx.new_page()
        mode = {"v": "ok"}
        def route(r):
            if r.request.method == "OPTIONS": return r.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
            if mode["v"] == "ok": r.fulfill(status=200, body=sse, headers={"Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "X-User-Left", "X-User-Left": "2"})
            else: r.fulfill(status=429, body=json.dumps({"error": mode["v"]}), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})
        pg.route("https://wenming-ai.oracle-tarot.workers.dev/**", route)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])"); pg.click("#enter"); pg.wait_for_timeout(900)
        pg.click("[data-m=read]"); pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(500)
        pg.click("#nameOk"); pg.wait_for_timeout(400); pg.click("[data-g=m]"); pg.wait_for_timeout(900); pg.click("#noCard"); pg.wait_for_timeout(500)
        pg.click("[data-t=career]"); pg.click("#goCount"); pg.click(".skip"); pg.wait_for_selector("#askBox:not([hidden])", timeout=30000)
        pg.evaluate("document.querySelector('#askBox').scrollIntoView({block:'start'})"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_1_ask_empty.png")
        pg.fill("#askQ", "這個名字適合自己出來做生意嗎？"); pg.dispatch_event("#askQ", "input"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{out}/{w}_2_ask_typed.png")
        pg.click("#askGo"); pg.wait_for_timeout(2500)
        pg.evaluate("document.querySelector('#askBox').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{out}/{w}_3_answer.png")
        mode["v"] = "user_limit"; pg.click("#askGo"); pg.wait_for_selector(".limit"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_4_user_limit.png"); pg.click("#lmOk"); pg.wait_for_timeout(400)
        pg.evaluate("localStorage.removeItem('wenming:ask')"); pg.evaluate("document.querySelector('#askQ').dispatchEvent(new Event('input'))")
        mode["v"] = "site_limit"; pg.click("#askGo"); pg.wait_for_selector(".limit"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_5_site_limit.png")
        print(w, "errors:", errs); ctx.close()
    b.close()
