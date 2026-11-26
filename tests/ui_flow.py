"""問名堂全流程截圖：入座 → 報名 → 乾坤 → 生辰 → 問事 → 數筆畫 → 批命 → 改名 → 對照。
用法：python tests/ui_flow.py [輸出資料夾] [尺寸...]   例：python tests/ui_flow.py shots 390x844 1366x800
會檢查：主控台錯誤、水平溢出（scrollWidth > clientWidth）。
"""
import sys, os, json
from playwright.sync_api import sync_playwright

URL = os.environ.get("WM_URL", "http://127.0.0.1:8765/")
out = sys.argv[1] if len(sys.argv) > 1 else "shots"
sizes = sys.argv[2:] or ["390x844", "1366x800"]
NAME = os.environ.get("WM_NAME", "林家豪")
os.makedirs(out, exist_ok=True)

def overflow(page):
    return page.evaluate("""() => {
      const bad = [];
      for (const el of document.querySelectorAll('#act *, .top *, #say')) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        if (r.right > innerWidth + 1 || r.left < -1) bad.push((el.id ? '#' + el.id : el.className || el.tagName) + ` ${Math.round(r.left)}..${Math.round(r.right)}`);
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible' && el.children.length === 0) bad.push('text-overflow ' + (el.className || el.tagName));
      }
      return bad.slice(0, 8);
    }""")

with sync_playwright() as p:
    b = p.chromium.launch()
    report = {}
    for sz in sizes:
        w, h = map(int, sz.split("x"))
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=w < 900, locale="zh-TW", timezone_id="Asia/Taipei")
        page = ctx.new_page()
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(URL)
        page.wait_for_selector("#enter:not([disabled])", timeout=20000)
        n = 0
        def shot(tag):
            global n
            n += 1
            page.wait_for_timeout(700)
            path = os.path.join(out, f"{sz}_{n:02d}_{tag}.png")
            page.screenshot(path=path)
            report.setdefault(sz, []).append({"shot": os.path.basename(path), "overflow": overflow(page)})
        shot("intro")
        page.click("#enter"); page.wait_for_timeout(1200); shot("seat")
        page.click("[data-m=read]"); page.wait_for_timeout(600)
        page.fill("#nameIn", NAME); page.dispatch_event("#nameIn", "input"); page.wait_for_timeout(800); shot("name")
        page.click("#nameOk"); page.wait_for_timeout(600); shot("qiankun")
        page.click("[data-g=m]"); page.wait_for_timeout(1200); shot("birth")
        page.click("#giveCard"); page.wait_for_timeout(1500)
        page.select_option("#bY", "1990"); page.select_option("#bM", "5"); page.select_option("#bD", "17"); page.select_option("#bH", "9")
        page.wait_for_timeout(800); shot("birthcard")
        page.click("#birthForm button[type=submit]"); page.wait_for_timeout(900); shot("topic")
        page.click("[data-t=career]"); page.wait_for_timeout(400)
        page.click("#goCount"); page.wait_for_timeout(2600); shot("count")
        page.wait_for_selector(".hero", timeout=30000); page.wait_for_timeout(900); shot("reading")
        page.evaluate("document.querySelector('#sheet').scrollTop = 900"); shot("reading2")
        page.click("#toRename"); page.wait_for_selector(".slip", timeout=20000); page.wait_for_timeout(1200); shot("rename")
        page.evaluate("document.querySelector('#slips').scrollIntoView()"); shot("rename2")
        page.click(".slip"); page.wait_for_timeout(900); shot("compare")
        report[sz].append({"errors": errs})
        ctx.close()
    b.close()
print(json.dumps(report, ensure_ascii=False, indent=1))
