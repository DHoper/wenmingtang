"""分享長圖：引擎版與 AI 版各畫一張。python tests/longcard.py 輸出資料夾 [名字]"""
import sys, os, base64, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else "林家豪"; os.makedirs(out, exist_ok=True)
AI = {"headline": "林家豪這個名字，骨架硬，肯拚，就是家裡那一塊要多顧。", "ren": "「林」八畫加「家」十畫，人格十八畫，屬金，「鐵鏡重磨」。這格有魄力，做事撐得住，認定了就不回頭。只是脾氣硬，講話直，有時候得罪人自己還不知道。", "wai": "「豪」十四畫加一，外格十五畫，屬土，福壽之數。出外有貴人，朋友肯拉你一把。", "zong": "三個字加起來三十二畫，屬木，僥倖得寵。後半輩子順，晚年有人照顧。", "sancai": "水金火，金被火剋。家裡跟底下的人常給你出難題，不是你不好，是位置卡住。", "topic": "你問事業：自己當頭家撐得起來，本錢留厚一點，家裡先安頓好，再往外衝。", "rename": "不必改。人格、外格都站得住，三才那一塊靠做人補。", "summary": "好在肯拚，怕在家裡。先把家裡顧好，再往外衝。"}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])")
    for tag, ai in [("engine", None), ("ai", AI)]:
        d = pg.evaluate("""async ([name, ai]) => { const { initChars } = await import('./js/engine/chars.js'); await initChars(f => fetch('js/data/' + f).then(r => r.json()));
          const { splitName } = await import('./js/engine/wuge.js'); const { reading } = await import('./js/engine/reading.js'); const { drawLongCard } = await import('./js/share.js');
          const R = reading({ ...splitName([...name]), gender: 'm', topic: 'career', bazi: null }); if (ai) R.aiParts = ai; return (await drawLongCard(R)).toDataURL('image/png'); }""", [name, ai])
        open(f"{out}/long_{tag}.png", "wb").write(base64.b64decode(d.split(",")[1]))
    print("errors", errs); b.close()
