"""把分享圖畫出來存檔：python tests/card.py 輸出.png [名字] [m|f]"""
import sys, base64
from playwright.sync_api import sync_playwright
out = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else "林家豪"; g = sys.argv[3] if len(sys.argv) > 3 else "m"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])", timeout=20000)
    data = pg.evaluate("""async ([name, g]) => {
      const { initChars } = await import('./js/engine/chars.js');
      await initChars(f => fetch('js/data/' + f).then(r => r.json()));
      const { splitName } = await import('./js/engine/wuge.js');
      const { reading } = await import('./js/engine/reading.js');
      const { drawCard } = await import('./js/share.js');
      const R = reading({ ...splitName([...name]), gender: g, topic: 'all', bazi: null });
      const cv = await drawCard(R); return cv.toDataURL('image/png');
    }""", [name, g])
    open(out, "wb").write(base64.b64decode(data.split(",")[1]))
    print("errors:", errs); b.close()
