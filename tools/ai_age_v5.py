"""一次性：次數只聽伺服器、送年紀與名字用字、清掉舊本機計數、快取換版。"""
import re
R = r"C:\Users\dhope\repos\wenmingtang"
def edit(path, pairs):
    p = R + "\\" + path
    s = open(p, encoding="utf-8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (path, a[:60])
        s = s.replace(a, b)
    open(p, "w", encoding="utf-8", newline="\n").write(s)

edit(r"tools\ai_words_check.py", [(r'SKIP_LINE = re.compile(r"不用這些詞|', r'SKIP_LINE = re.compile(r"不要這樣|不用這些詞|')])

edit(r"site\js\ai.js", [
    # 換掉舊的本機計數鍵（之前的舊紀錄會讓網頁誤以為用完）
    (r'''const LS = { ask: "wenming:ask", reading: "wenming:readings" };''', r'''const LS = { ask: "wenming:asks2", reading: "wenming:readings2" };'''),
    (r'''const CACHE_VER = "v3";''', r'''const CACHE_VER = "v5";'''),
    # 不在本機擋：次數以伺服器為準（伺服器回 reading_limit／user_limit 才算用完）
    (r'''  if (askLeft() <= 0) throw Object.assign(new Error("user_limit"), { code: "user_limit" });
''', ""),
    (r'''  if (readingsLeft() <= 0) throw Object.assign(new Error("reading_limit"), { code: "reading_limit" });
''', ""),
    # 送年紀與名字用字
    (r'''    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）",''', r'''    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 年紀: ageText(R),
    名字用字: R.chars.filter(c => c.part !== "姓").map(c => c.ch).join("、"),'''),
    (r'''export function aiBasis(R) {''', r'''// 年紀：有給生日才算（臺灣時間），還沒出世的寫預產期
function ageText(R) {
  const b = R.bazi && R.bazi.input; if (!b || !b.y) return "沒有給生日，不知道幾歲";
  const now = new Date(Date.now() + 8 * 3600e3), y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, d = now.getUTCDate();
  const roc = b.y - 1911, born = new Date(Date.UTC(b.y, b.m - 1, b.d)), today = new Date(Date.UTC(y, m - 1, d));
  if (born > today) return `還沒出世，預產期民國${roc}年${b.m}月${b.d}日`;
  let age = y - b.y; if (m < b.m || (m === b.m && d < b.d)) age--;
  return `民國${roc}年次，今年${age}歲`;
}
export function aiBasis(R) {'''),
])

edit(r"site\js\main.js", [
    (r'''    if (askLeft() <= 0) { limitModal("user_limit"); return; }
''', ""),
])

edit(r"site\js\engine\reading.js", [
    (r'''"中晚年擔子較重，四十歲以後的事，要早一點準備。"''', r'''"中晚年擔子較重，後半輩子的事，要早一點準備。"'''),
])

edit(r"worker\src\index.js", [
    (r'''const BASIS_KEYS = new Set(["姓名", "乾坤",''', r'''const BASIS_KEYS = new Set(["姓名", "乾坤", "年紀", "名字用字",'''),
    (r'''max_tokens: mode === "reading" ? 2200 : 420, temperature: 0.85 }''', r'''max_tokens: mode === "reading" ? 2200 : 420, temperature: mode === "reading" ? 1.1 : 0.95 }'''),
])
edit(r"worker\wrangler.toml", [
    (r'''USER_READINGS = "3"''', r'''USER_READINGS = "10"'''),
    (r'''USER_ASKS = "9"''', r'''USER_ASKS = "30"'''),
])
print("ok")
