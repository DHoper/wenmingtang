"""印出有生辰的完整批命全文，人工逐句檢查用。python tests/dump_readings.py 輸出.txt"""
import sys
from playwright.sync_api import sync_playwright

JS = r"""async ([name, g, y, m, d, h, topic]) => {
  const { initChars } = await import('./js/engine/chars.js'); await initChars(f => fetch('js/data/' + f).then(r => r.json()));
  await new Promise(r => { if (window.Solar) return r(); const s = document.createElement('script'); s.src = 'vendor/lunar.js'; s.onload = r; document.head.append(s); });
  const { splitName } = await import('./js/engine/wuge.js');
  const { reading } = await import('./js/engine/reading.js');
  const { computeBazi } = await import('./js/engine/bazi.js');
  const { PLACES } = await import('./js/data/misc.js');
  const bazi = computeBazi({ calendar: 'solar', y, m, d, h, mi: 0, place: PLACES[1], ziRule: 'early' }, { Solar: window.Solar, Lunar: window.Lunar });
  const R = reading({ ...splitName([...name]), gender: g, topic, bazi });
  const NL = String.fromCharCode(10);
  return [R.name + '　' + R.grade + '　' + R.headline, R.headlinePlain,
    ...R.sections.map(s => '【' + s.title + '】' + NL + '批：' + s.pi.join('') + NL + '白：' + s.bai + (s.reasons ? NL + '推：' + s.reasons.join(' ') : ''))].join(NL);
}"""
CASES = [("劉德華", "m", 1961, 9, 27, 10, "career"), ("陳怡君", "f", 1995, 3, 8, None, "love"), ("司馬光", "m", 1980, 12, 30, 23, "money")]
out = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto("http://127.0.0.1:8765/"); pg.wait_for_selector("#enter:not([disabled])")
    for c in CASES: out.append(pg.evaluate(JS, list(c)))
    b.close()
open(sys.argv[1], "w", encoding="utf-8").write("\n\n==========\n\n".join(out)); print("ok")
