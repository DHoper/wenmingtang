"""一次性：main.js 依程式審查修正。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)

sub(r'''import { aiAvailable, aiAsk, askLeft, LIMITS, aiReadingFull, readingsLeft, readingKey } from "./ai.js";''',
    r'''import { aiAvailable, aiAsk, askLeft, LIMITS, aiReadingFull, readingsLeft, readingKey, cachedReading, readingPending } from "./ai.js";''')

# 歷史：同名但不同性別、生辰不要互蓋
sub(r'''const hist = store.get("history", []).filter(h => h.name !== R.name);''',
    r'''const hk = h => [h.name, h.gender, h.birth ? JSON.stringify(h.birth) : "", h.topic].join("|");
  const me = { name: R.name, surnameLen: R.surname.length, gender: S.gender, birth: S.birth, topic: S.topic, grade: R.grade, t: Date.now() };
  const hist = store.get("history", []).filter(h => hk(h) !== hk(me));''')
sub(r'''  hist.unshift({ name: R.name, surnameLen: R.surname.length, gender: S.gender, birth: S.birth, topic: S.topic, grade: R.grade, t: Date.now() });''',
    r'''  hist.unshift(me);''')

# 批命頁：記住現在是哪一張；朋友那張不自動扣看的人的次數
sub(r'''function showReading(R, opts = {}) {''', r'''let curReading = null;
function showReading(R, opts = {}) {
  curReading = R;''')
sub(r'''  aiAvailable().then(ok => {
    if (!$("#readingBody")) return;
    if (!ok) return;
    runAIReading(R);
    setupAsk(R);
  });''', r'''  aiAvailable().then(ok => {
    if (!$("#readingBody") || curReading !== R || !ok) return;
    if (opts.friend && !cachedReading(R) && !readingPending(R)) {
      const note = $("#aiNote");
      note.hidden = false;
      note.innerHTML = `下面是照筆畫排的。<button type="button" class="opt small" id="askFull">請先生親口批</button>`;
      $("#askFull").onclick = () => { note.hidden = true; runAIReading(R); setupAsk(R); };
      return;
    }
    runAIReading(R);
    setupAsk(R);
  });''')

# 先生親口批：失敗時留著已寫好的段落；R.aiParts 存截斷後的版本，分享、抄文跟畫面一致；神力耗盡每次進站只跳一次
sub(r'''  const fill = (parts, done) => {
    if (!$("#readingBody")) return;
    for (const [k, el] of slots) {
      const t = parts[k];
      if (t) { el.classList.remove("wait"); el.textContent = cap(k, toTrad(t)); }
      else if (done) { el.classList.remove("wait"); el.innerHTML = engine[k]; }
    }
    if (done) { R.aiParts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, toTrad(v)])); }
  };
  aiReadingFull(R, fill).catch(e => {
    fill({}, true);''', r'''  const fill = (parts, done) => {
    if (done) R.aiParts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, cap(k, toTrad(v))]));
    if (!$("#readingBody") || curReading !== R) return;
    for (const [k, el] of slots) {
      const t = parts[k];
      if (t) { el.classList.remove("wait"); el.textContent = cap(k, toTrad(t)); }
      else if (done) { el.classList.remove("wait"); el.innerHTML = engine[k]; }
    }
  };
  aiReadingFull(R, fill).catch(e => {
    fill(e.parts || {}, true);
    if (curReading !== R) return;''')
sub(r'''      limitModal(e.code);
    } else if (e.code !== "unavailable" && note)''', r'''      if (!S.limitShown) { S.limitShown = true; limitModal(e.code); }
    } else if (e.code !== "unavailable" && note)''')

# 追問次數：每張三句記在瀏覽器（重新整理不會歸零），臺灣日換日才清
sub(r'''  S.fu = S.fu || {};
  const fuLeft = () => Math.max(0, LIMITS.FOLLOWUPS - (S.fu[key] || 0));''', r'''  const twDay = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const fuAll = () => { const v = store.get("followups", null); return v && v.d === twDay ? v.m : {}; };
  const fuLeft = () => Math.max(0, LIMITS.FOLLOWUPS - (fuAll()[key] || 0));''')
sub(r'''      S.fu[key] = (S.fu[key] || 0) + 1;''', r'''      { const m = fuAll(); m[key] = (m[key] || 0) + 1; store.set("followups", { d: twDay, m }); }''')

# 抄整張批命：不帶八字、生肖（會透露生辰）
sub(r'''    ...R.sections.map(s => `【${s.title}】''', r'''    ...R.sections.filter(s => s.key !== "bazi" && s.key !== "zodiac").map(s => `【${s.title}】''')

# 朋友那張：標記 friend
sub(r'''$("#seeFriend").onclick = () => showReading(R0, { back: () => showFriend(x), say:''', r'''$("#seeFriend").onclick = () => showReading(R0, { friend: true, back: () => showFriend(x), say:''')

# 分享：先生還在寫，就等寫完再出圖（分享卡、長圖、抄文都用先生的字）
sub(r'''  // 1. 畫預覽卡、存到 Worker，換成帶圖的連結
  try {''', r'''  // 1. 先生還在寫就等一下；畫預覽卡、存到 Worker，換成帶圖的連結
  const pend = readingPending(R);
  if (pend) {
    box.querySelector("#shPic").innerHTML = `<span>先生還在寫，寫完就幫你貼紅紙……</span>`;
    await Promise.race([pend.catch(() => {}), sleep(30000)]);
    if (!box.isConnected) return;
  }
  try {''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
