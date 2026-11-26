import sys, base64
from playwright.sync_api import sync_playwright
out = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else "林廷一"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])")
    d = pg.evaluate("""async (name) => { const { initChars } = await import('./js/engine/chars.js'); await initChars(f => fetch('js/data/' + f).then(r => r.json()));
      const { splitName } = await import('./js/engine/wuge.js'); const { reading } = await import('./js/engine/reading.js'); const { drawPostcard } = await import('./js/share.js');
      const R = reading({ ...splitName([...name]), gender: 'm', topic: 'all', bazi: null }); return (await drawPostcard(R)).toDataURL('image/png'); }""", name)
    open(out, "wb").write(base64.b64decode(d.split(",")[1])); print("errors", errs); b.close()
