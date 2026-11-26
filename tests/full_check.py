"""問名堂完整檢查：所有流程 × 多種尺寸截圖，並自動檢查溢出、錯誤、元件重疊。
用法：python tests/full_check.py <輸出資料夾> [尺寸...]
輸出：<資料夾>/<尺寸>/<編號>_<步驟>.png 與 report.json
"""
import sys, os, json
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from fake_worker import fake_worker

U = os.environ.get("WM_URL", "http://127.0.0.1:8765/")
out = sys.argv[1]
sizes = sys.argv[2:] or ["390x844", "360x740", "768x1024", "1366x768", "1920x1080"]

CHECK = r"""() => {
  const issues = [];
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  // 1) 超出視窗左右
  for (const el of document.querySelectorAll('#act *, .top *, #say, .share-in *')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) issues.push('超出視窗：' + (el.id ? '#' + el.id : (el.className || el.tagName)) + ` ${Math.round(r.left)}～${Math.round(r.right)}`);
  }
  // 2) 文字被截斷（內容比框大）
  for (const el of document.querySelectorAll('#act button, #act .t, #act .s, .share-in button, .share-in a, .chip, .brand, #say')) {
    if (!vis(el)) continue;
    if (el.matches('.chip, .back, .stick, .sign')) continue; // 這些有刻意外擴的可點範圍或印章
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto') issues.push('文字超框：' + (el.id || el.className || el.tagName) + '「' + el.textContent.trim().slice(0, 12) + '」');
  }
  // 3) 可點的東西太小
  for (const el of document.querySelectorAll('#act button, .share-in button, .share-in a, .top button')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 30 || r.width < 30) issues.push('按鈕太小：' + (el.id || el.textContent.trim().slice(0, 8)) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  // 4) 操作區內兩個按鈕互相重疊
  const btns = [...document.querySelectorAll('#act button, #act a.btn')].filter(vis).map(b => [b, b.getBoundingClientRect()]);
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
    const [a, ra] = btns[i], [b, rb] = btns[j];
    if (a.contains(b) || b.contains(a)) continue;
    if (a.closest('.rhead, .actions') || b.closest('.rhead, .actions')) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 4 && oy > 4) issues.push('按鈕重疊：「' + a.textContent.trim().slice(0, 6) + '」與「' + b.textContent.trim().slice(0, 6) + '」');
  }
  // 5) 頁面本身有橫向捲軸
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('整頁可以橫向捲動');
  // 6) 頂列、對話條蓋到老師傅的臉（只在舞台露出時檢查）
  const face = document.querySelector('#slotMaster img');
  const say = document.querySelector('#say');
  if (face && say && vis(say)) {
    const f = face.getBoundingClientRect(), s = say.getBoundingClientRect();
    const fx1 = f.left + f.width * .32, fx2 = f.left + f.width * .68, fy1 = f.top + f.height * .1, fy2 = f.top + f.height * .45;
    if (s.left < fx2 && s.right > fx1 && s.top < fy2 && s.bottom > fy1) issues.push('對話條蓋到老師傅的臉');
  }
  return [...new Set(issues)];
}"""

def run(size):
    w, h = map(int, size.split("x"))
    d = os.path.join(out, size); os.makedirs(d, exist_ok=True)
    rep = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, has_touch=w < 900, locale="zh-TW", timezone_id="Asia/Taipei")
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        pg = ctx.new_page(); errs = []
        fake_worker(pg)
        pg.on("pageerror", lambda e: errs.append("頁面錯誤：" + str(e)))
        pg.on("console", lambda m: errs.append("主控台：" + m.text) if m.type == "error" else None)
        n = [0]
        def shot(tag, desc, wait=700):
            pg.wait_for_timeout(wait)
            n[0] += 1
            f = f"{n[0]:02d}_{tag}.png"
            pg.screenshot(path=os.path.join(d, f))
            rep.append({"shot": f, "step": desc, "issues": pg.evaluate(CHECK), "errors": errs[:]})
            errs.clear()
        def scroll_sheet(frac):
            pg.evaluate(f"(() => {{ const s = document.querySelector('#sheet'); s.scrollTop = (s.scrollHeight - s.clientHeight) * {frac}; }})()")
        def enter(url=U):
            pg.goto(url); pg.wait_for_selector("#enter:not([disabled])", timeout=30000)
        # ── A 主流程 ──
        enter(); shot("intro", "開場")
        pg.click("#enter"); shot("seat", "入座（第一次來）", 1300)
        pg.click("[data-m=read]"); shot("name_empty", "報名：空白")
        pg.fill("#nameIn", "刘德华"); pg.dispatch_event("#nameIn", "input"); shot("name_s2t", "報名：輸入簡體「刘德华」，自動轉正體")
        pg.fill("#nameIn", "欧阳娜娜"); pg.dispatch_event("#nameIn", "input"); shot("name_compound", "報名：複姓「歐陽娜娜」")
        pg.fill("#nameIn", "劉德華"); pg.dispatch_event("#nameIn", "input"); pg.wait_for_timeout(300)
        pg.click("#nameOk"); shot("qiankun", "乾坤：選男女")
        pg.click("[data-g=m]"); shot("birth_ask", "生辰：問要不要給生日", 1200)
        pg.click("#giveCard"); pg.wait_for_timeout(1200)
        pg.select_option("#bY", "1961"); pg.select_option("#bM", "9"); pg.select_option("#bD", "27"); pg.select_option("#bH", "10")
        shot("birth_solar", "生辰帖：國曆 1961/9/27 10 點", 900)
        pg.click("#tY"); pg.wait_for_selector(".picker.on"); shot("birth_picker", "生辰帖：點「年」跳出宣紙選單", 500)
        pg.click('.pk-o[data-v="1961"]'); pg.wait_for_timeout(400)
        pg.click("#tH"); pg.wait_for_selector(".picker.on"); shot("birth_picker_hour", "生辰帖：時辰選單", 500)
        pg.click('.pk-o[data-v="10"]'); pg.wait_for_timeout(400)
        pg.click("#calBtn"); shot("birth_lunar", "生辰帖：切換農曆", 900)
        pg.click("#calBtn"); pg.wait_for_timeout(500)
        pg.select_option("#bY", "1961"); pg.select_option("#bM", "9"); pg.select_option("#bD", "27"); pg.select_option("#bH", "10"); pg.wait_for_timeout(300)
        pg.click("#bOk"); shot("topic", "問事：五塊招牌")
        pg.click("[data-t=career]"); shot("topic_pick", "問事：點了「事業」", 900)
        pg.click("#goCount"); shot("count", "數筆畫進行中", 2200)
        pg.wait_for_selector(".hero", timeout=40000); shot("reading_top", "批命：最上面（評等、五格）", 1200)
        pg.evaluate("document.querySelector('#grid5').scrollIntoView({block:'start'})"); shot("reading_grid", "批命：五格", 500)
        pg.evaluate("document.querySelector('#askBox') && !document.querySelector('#askBox').hidden && document.querySelector('#askBox').scrollIntoView({block:'start'})"); shot("reading_ask", "批命：叩問先生區", 500)
        scroll_sheet(.3); shot("reading_mid", "批命：中段", 500)
        scroll_sheet(.6); shot("reading_bazi", "批命：八字段落附近", 500)
        scroll_sheet(1); shot("reading_end", "批命：最後（總結與按鈕）", 500)
        pg.click("[data-v=pi]"); scroll_sheet(.2); shot("reading_pi", "批命：只看批語", 500)
        pg.click("[data-v=both]"); scroll_sheet(0)
        pg.click("#shareTop"); pg.wait_for_selector(".share-pic img", timeout=20000); shot("share", "分享面板", 800)
        pg.click("#shClose"); pg.wait_for_timeout(400)
        pg.click("#toRename"); pg.wait_for_selector(".stick", timeout=30000); shot("rename_top", "改名：上方", 1200)
        pg.click("#condBtn"); shot("rename_cond", "改名：展開條件", 600); pg.click("#condBtn"); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#slips').scrollIntoView({block:'start'})"); shot("rename_slips", "改名：候選紅紙", 600)
        pg.fill("#ownIn", "家豪 宥廷"); pg.click("#ownGo"); pg.evaluate("document.querySelector('#slips').scrollIntoView({block:'start'})"); shot("rename_own", "改名：加入自己想的名字", 900)
        pg.click(".stick:not(.own)"); shot("compare", "兩名對照", 900)
        pg.click("#cFull"); pg.wait_for_selector(".hero"); shot("cand_reading", "候選名的完整批命", 900)
        # ── B 回訪＋上回批命 ──
        enter(); pg.click("#enter"); shot("seat_return", "回訪：入座（有「上回批命」）", 1300)
        pg.click("#historyBtn"); shot("history", "上回批命清單")
        # ── C 幫小孩取名 ──
        pg.click("#backBtn"); pg.wait_for_timeout(500)
        pg.click("[data-m=name]"); pg.fill("#nameIn", "陳"); pg.dispatch_event("#nameIn", "input"); shot("kid_name", "幫小孩取名：寫姓氏")
        pg.click("#nameOk"); shot("kid_gender", "幫小孩取名：男孩女孩")
        pg.click("[data-g=f]"); pg.wait_for_timeout(1000); pg.click("#noCard"); pg.wait_for_selector(".stick", timeout=30000); shot("kid_slips", "幫小孩取名：候選名", 1200)
        # ── D 朋友連結 ──
        enter(U + "r/2.html#n=%E6%9E%97%E5%AE%B6%E8%B1%AA&g=m&s=1&gr=%E4%B8%8A&sc=84"); pg.click("#enter"); shot("friend", "朋友打開分享連結", 1300)
        pg.click("#seeFriend"); pg.wait_for_selector(".hero"); shot("friend_reading", "朋友看分享者的筆畫", 900)
        b.close()
    return rep

report = {s: run(s) for s in sizes}
json.dump(report, open(os.path.join(out, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s, rows in report.items():
    bad = [(r["shot"], r["issues"], r["errors"]) for r in rows if r["issues"] or r["errors"]]
    print(s, len(rows), "張；有問題：", len(bad))
    for x in bad: print("  ", x)
