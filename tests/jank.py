"""量測換頁時的抖動：舞台被移動幾次、紅紙瞬間跳動、版面位移（layout shift）。
用法：python tests/jank.py [尺寸]
"""
import sys, json
from playwright.sync_api import sync_playwright
size = sys.argv[1] if len(sys.argv) > 1 else "390x844"
w, h = map(int, size.split("x"))
INSTR = r"""() => {
  window.__log = [];
  const t0 = performance.now(), log = (k, v) => window.__log.push([Math.round(performance.now() - t0), k, v]);
  const cv = document.querySelector('#canvas');
  new MutationObserver(() => log('stage', cv.style.transform.replace(/translate\(|px|scale\(|\)/g, '').trim() + ' pt=' + cv.style.getPropertyValue('--pt'))).observe(cv, { attributes: true, attributeFilter: ['style'] });
  new MutationObserver(() => log('phase', document.querySelector('#app').dataset.phase)).observe(document.querySelector('#app'), { attributes: true, attributeFilter: ['data-phase'] });
  const sheet = document.querySelector('#sheet'); let last = 0;
  new ResizeObserver(() => { const r = Math.round(sheet.getBoundingClientRect().top); if (r !== last) { log('sheetTop', r); last = r; } }).observe(sheet);
  new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.value > 0.001) log('shift', +e.value.toFixed(4)); })).observe({ type: 'layout-shift', buffered: false });
  new PerformanceObserver(l => l.getEntries().forEach(e => log('longtask', Math.round(e.duration)))).observe({ type: 'longtask' });
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": w, "height": h}, has_touch=w < 900).new_page()
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])")
    pg.evaluate(INSTR)
    steps = [("入座", lambda: pg.click("#enter")), ("看名字", lambda: pg.click("[data-m=read]")),
             ("打名字", lambda: (pg.fill("#nameIn", "林家豪"), pg.dispatch_event("#nameIn", "input"))),
             ("送出名字", lambda: pg.click("#nameOk")), ("選乾造", lambda: pg.click("[data-g=m]")),
             ("給生日", lambda: pg.click("#giveCard")), ("就這樣算", lambda: pg.click("#bOk")),
             ("選招牌", lambda: pg.click("[data-t=career]")), ("請先生算", lambda: pg.click("#goCount"))]
    report = []
    for name, fn in steps:
        pg.evaluate("window.__log = []"); fn(); pg.wait_for_timeout(2200 if name != "請先生算" else 9000)
        L = pg.evaluate("window.__log")
        moves = [x for x in L if x[1] == "stage"]; shifts = [x for x in L if x[1] == "shift"]; tops = [x for x in L if x[1] == "sheetTop"]; lt = [x for x in L if x[1] == "longtask"]
        report.append({"step": name, "舞台移動次數": len(moves), "操作區高度變化": [t[0] for t in tops], "移動時間ms": [m[0] for m in moves], "版面位移": round(sum(s[2] for s in shifts), 3), "卡頓ms": [x[2] for x in lt]})
    b.close()
for r in report: print(json.dumps(r, ensure_ascii=False))
