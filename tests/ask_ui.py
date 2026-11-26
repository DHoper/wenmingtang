"""叩問區與神力耗盡視窗截圖（攔截 Worker，用固定回答，不花 DeepSeek 次數）。python tests/ask_ui.py 輸出資料夾"""
import sys, os, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
ans = "你問自己出來做生意，我照名字講。\n\n你姓「林」八畫加「家」十畫，人格十八畫，屬金，「鐵鏡重磨」，吉數。這格有魄力，自己當頭家撐得起來。外格「豪」十四畫再加一，十五畫，「福壽」，大吉，出外有貴人。\n\n只是三才水金火配得不順，家裡跟底下的人常給你出難題。要做，本錢留厚一點，家裡先安頓好，再往外衝。\n\n名字是一半，你怎麼做是另一半。"
rd = "【總評】林家豪這個名字，骨架硬，肯拚，就是家裡那一塊要多顧。【天格】姓「林」八畫加一，天格九畫，屬水，祖上給的，順帶看。【人格】「林」八畫加「家」十畫，人格十八畫，屬金，「鐵鏡重磨」，有魄力，做事撐得住。【地格】「家」十畫加「豪」十四畫，地格二十四畫，屬火，前半生靠自己打拚。【外格】「豪」十四畫加一，外格十五畫，屬土，出外有貴人。【總格】三個字加起來三十二畫，屬木，後半輩子順。【三才】水金火，金被火剋，家裡跟底下的人常給你出難題。【出外與晚運】外格土生人格金，朋友會幫你。【所問】自己當頭家撐得起來，本錢留厚一點。【改名】不必改。【總結】好在肯拚，怕在家裡。先把家裡顧好，再往外衝。"
def mk(t): return "".join("data: " + json.dumps({"choices": [{"delta": {"content": t[i:i+6]}}]}, ensure_ascii=False) + "\n\n" for i in range(0, len(t), 6)) + "data: [DONE]\n\n"
sse_r = mk(rd)
sse = "".join("data: " + json.dumps({"choices": [{"delta": {"content": ans[i:i+6]}}]}, ensure_ascii=False) + "\n\n" for i in range(0, len(ans), 6)) + "data: [DONE]\n\n"
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(390, 844), (1366, 768)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=w < 900); pg = ctx.new_page()
        mode = {"v": "ok"}
        def route(r):
            if r.request.method == "OPTIONS": return r.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
            if mode["v"] == "ok": r.fulfill(status=200, body=sse_r if '"reading"' in (r.request.post_data or "") else sse, headers={"Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "X-User-Left", "X-User-Left": "2"})
            else: r.fulfill(status=429, body=json.dumps({"error": mode["v"]}), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})
        pg.route("https://wenming-ai.oracle-tarot.workers.dev/**", route)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])"); pg.click("#enter"); pg.wait_for_timeout(900)
        pg.click("[data-m=read]"); pg.fill("#nameIn", "林家豪"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(500)
        pg.click("#nameOk"); pg.wait_for_timeout(400); pg.click("[data-g=m]"); pg.wait_for_timeout(900); pg.click("#noCard"); pg.wait_for_timeout(500)
        pg.click("[data-t=career]"); pg.click("#goCount"); pg.click(".skip"); pg.wait_for_selector("#askBox:not([hidden])", timeout=30000); pg.wait_for_timeout(1500); pg.screenshot(path=f"{out}/{w}_0_reading.png", full_page=False)
        pg.evaluate("document.querySelector('#askBox').scrollIntoView({block:'start'})"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_1_ask_empty.png")
        pg.fill("#askQ", "這個名字適合自己出來做生意嗎？"); pg.dispatch_event("#askQ", "input"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{out}/{w}_2_ask_typed.png")
        pg.click("#askGo"); pg.wait_for_timeout(2500)
        pg.evaluate("document.querySelector('#askBox').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{out}/{w}_3_answer.png")
        mode["v"] = "user_limit"; pg.fill("#askQ", "那感情呢？"); pg.dispatch_event("#askQ", "input"); pg.click("#askGo"); pg.wait_for_selector(".limit"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_4_user_limit.png"); pg.click("#lmOk"); pg.wait_for_timeout(400)
        pg.evaluate("localStorage.removeItem('wenming:asks2'); document.querySelector('#askQ').dispatchEvent(new Event('input'))"); pg.fill("#askQ", "那財運呢？"); pg.dispatch_event("#askQ", "input")
        mode["v"] = "site_limit"; pg.click("#askGo"); pg.wait_for_selector(".limit"); pg.wait_for_timeout(500)
        pg.screenshot(path=f"{out}/{w}_5_site_limit.png")
        print(w, "errors:", errs); ctx.close()
    b.close()
