"""一次性：批命頁改成評語全部由 AI 寫，引擎文字只當依據與備援；批完追問三次。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

sub(r'''import { aiAvailable, aiAsk, askLeft, LIMITS } from "./ai.js";''',
    r'''import { aiAvailable, aiAsk, askLeft, LIMITS, aiReadingFull, readingsLeft, readingKey } from "./ai.js";
import { READING_TAGS } from "./ai-prompt.js";''')

# 追問區從五格下面移到整張批命後面
sub(r'''    <div class="ask f-slip" id="askBox" hidden>
      <p class="ask-h">還有想問的，跟先生講</p>
      <div class="ask-log" id="askLog"></div>
      <textarea id="askQ" rows="2" placeholder="例如：這個名字適合自己做生意嗎？" aria-label="想問先生的事"></textarea>
      <div class="ask-foot"><span id="askMeta"></span><button type="button" class="btn main" id="askGo">請先生細說</button></div>
    </div>
    <article class="reading" id="readingBody" data-mode="${view}">''', r'''    <p class="ai-note" id="aiNote" hidden></p>
    <article class="reading" id="readingBody" data-mode="${view}">''')
sub(r'''    </article>
    <div class="after">''', r'''    </article>
    <div class="ask f-slip" id="askBox" hidden>
      <p class="ask-h">追問先生</p>
      <p class="ask-sub">批完了，還有想問的，這張可以再問 ${LIMITS.FOLLOWUPS} 次。</p>
      <div class="ask-log" id="askLog"></div>
      <textarea id="askQ" rows="2" placeholder="例如：這個名字適合自己做生意嗎？" aria-label="想問先生的事"></textarea>
      <div class="ask-foot"><span id="askMeta"></span><button type="button" class="btn main" id="askGo">追問</button></div>
    </div>
    <div class="after">''')

# 批命頁打開後：AI 一段一段寫評語
sub(r'''  aiAvailable().then(ok => { if (ok && $("#askBox")) setupAsk(R); });''', r'''  aiAvailable().then(ok => {
    if (!$("#readingBody")) return;
    if (!ok) return;
    runAIReading(R);
    setupAsk(R);
  });''')

sub(r'''// ───────── 叩問先生（AI） ─────────''', r'''// ───────── 先生親口批（AI 寫全部評語；引擎文字是依據，也是備援） ─────────
function runAIReading(R) {
  const slots = READING_TAGS.map(([, k]) => [k, k === "headline" ? act.querySelector(".hero .hlp") : act.querySelector(`#sec-${k} .bai`)]).filter(([, el]) => el);
  const engine = Object.fromEntries(slots.map(([k, el]) => [k, el.innerHTML]));
  const cap = (k, t) => { const max = k === "ren" ? LIMITS.SECTION_MAX + 60 : LIMITS.SECTION_MAX; const a = [...t]; if (a.length <= max) return t; const c = a.slice(0, max).join(""); const i = c.lastIndexOf("。"); return i > max * .5 ? c.slice(0, i + 1) : c + "……"; };
  slots.forEach(([, el]) => { el.classList.add("wait"); el.innerHTML = `<span class="ink-wait">先生正在寫……</span>`; });
  const fill = (parts, done) => {
    if (!$("#readingBody")) return;
    for (const [k, el] of slots) {
      const t = parts[k];
      if (t) { el.classList.remove("wait"); el.textContent = cap(k, toTrad(t)); }
      else if (done) { el.classList.remove("wait"); el.innerHTML = engine[k]; }
    }
    if (done) { R.aiParts = parts; }
  };
  aiReadingFull(R, fill).catch(e => {
    fill({}, true);
    const note = $("#aiNote");
    if (e.code === "reading_limit" || e.code === "site_limit") {
      if (note) { note.hidden = false; note.textContent = e.code === "site_limit" ? "今晚來問的人太多，先生歇了。下面先照筆畫排給你看。" : `今天先生已經親口批了 ${LIMITS.USER_READINGS} 張，下面先照筆畫排給你看。`; }
      limitModal(e.code);
    } else if (e.code !== "unavailable" && note) { note.hidden = false; note.textContent = "香斷了，先生這回講不下去。下面先照筆畫排給你看。"; }
  });
}

// ───────── 追問先生（AI） ─────────''')

# 追問：一定要寫問題；每張三次
sub(r'''  const sync = () => {
    const n = [...q.value.trim()].length, left = askLeft();
    go.textContent = n ? "叩問" : "請先生細說";''', r'''  const key = readingKey(R);
  S.fu = S.fu || {};
  const fuLeft = () => Math.max(0, LIMITS.FOLLOWUPS - (S.fu[key] || 0));
  const sync = () => {
    const n = [...q.value.trim()].length, left = Math.min(askLeft(), fuLeft());
    go.textContent = "追問";''')
sub(r'''    meta.innerHTML = n > LIMITS.QUESTION_MAX ? `<em>超過 ${n - LIMITS.QUESTION_MAX} 個字</em>，講重點就好` : `${n}／${LIMITS.QUESTION_MAX} 字・今天還能問 <b>${left}</b> 次`;
    go.disabled = n > LIMITS.QUESTION_MAX;''', r'''    meta.innerHTML = n > LIMITS.QUESTION_MAX ? `<em>超過 ${n - LIMITS.QUESTION_MAX} 個字</em>，講重點就好` : `${n}／${LIMITS.QUESTION_MAX} 字・這張還能問 <b>${left}</b> 次`;
    go.disabled = n > LIMITS.QUESTION_MAX || n === 0;''')
sub(r'''    if (askLeft() <= 0) { limitModal("user_limit"); return; }
    const text = q.value.trim();''', r'''    if (fuLeft() <= 0) { limitModal("followup_limit"); return; }
    if (askLeft() <= 0) { limitModal("user_limit"); return; }
    const text = q.value.trim();
    if (!text) return;''')
sub(r'''    item.innerHTML = `<p class="qa-q">${text ? "你問：" + esc(text) : "請先生把整張再細說一次"}</p><p class="qa-a">先點一炷香……</p>`;''',
    r'''    item.innerHTML = `<p class="qa-q">你問：${esc(text)}</p><p class="qa-a">先點一炷香……</p>`;''')
sub(r'''      await aiAsk(R, text, t => { out.textContent = toTrad(t); });
      q.value = "";''', r'''      await aiAsk(R, text, t => { out.textContent = toTrad(t); });
      S.fu[key] = (S.fu[key] || 0) + 1;
      q.value = "";''')

# 神力耗盡：多三種情況
sub(r'''function limitModal(kind) {
  const site = kind === "site_limit";''', r'''function limitModal(kind) {
  const site = kind === "site_limit";
  const MSG = {
    reading_limit: [`先生今天已經親口替你批了 ${LIMITS.USER_READINGS} 張，神力耗盡，要歇一下。`, `每個人一天只能請先生親口批 ${LIMITS.USER_READINGS} 張`],
    user_limit: [`先生今天已經回你 ${LIMITS.USER_ASKS} 個問題，神力耗盡，要歇一下。`, `每個人一天只能追問 ${LIMITS.USER_ASKS} 次`],
    followup_limit: [`這張已經追問 ${LIMITS.FOLLOWUPS} 次了，先生講得差不多了。`, `每張批命只能追問 ${LIMITS.FOLLOWUPS} 次`],
    site_limit: ["今晚來問的人太多，廟裡的香都燒完了，先生也要歇了。", `整個網站一天只能請先生講 ${LIMITS.SITE_CALLS} 回`],
  }[kind] || ["先生要歇一下。", "次數有限"];''')
sub(r'''      <p class="limit-t" id="lmT">${site ? "今晚來問的人太多，廟裡的香都燒完了，先生也要歇了。" : `先生今天已經替你看了 ${LIMITS.USER_PER_DAY} 回，神力耗盡，要歇一下。`}</p>
      <p class="limit-n">這是免費的網站，為了節省成本，${site ? `整個網站一天只能叩問 ${LIMITS.SITE_PER_DAY} 次` : `每個人一天只能叩問 ${LIMITS.USER_PER_DAY} 次`}。批命、擬名照樣可以看，叩問明天再來。</p>''',
    r'''      <p class="limit-t" id="lmT">${MSG[0]}</p>
      <p class="limit-n">這是免費的網站，為了節省成本，${MSG[1]}。${kind === "followup_limit" ? "想再問，換一個名字請先生看。" : "批命、擬名照樣可以看，明天再來請先生親口講。"}</p>''')
sub(r'''      <div class="limit-seal" aria-hidden="true">${site ? "香盡" : "神倦"}</div>''', r'''      <div class="limit-seal" aria-hidden="true">${site ? "香盡" : kind === "followup_limit" ? "話盡" : "神倦"}</div>''')
sub(r'''      <p class="share-h" id="lmH">神力耗盡</p>''', r'''      <p class="share-h" id="lmH">${kind === "followup_limit" ? "這張問完了" : "神力耗盡"}</p>''')
open(p, "w", encoding="utf-8", newline="\n").write(s)

# 明信片的「先生總說」用 AI 的總結
p2 = r"C:\Users\dhope\repos\wenmingtang\site\js\share.js"
t = open(p2, encoding="utf-8").read()
a = r'''export function summaryLine(R) {
  const s = R.sections.find(x => x.key === "summary");'''
assert t.count(a) == 1
t = t.replace(a, r'''export function summaryLine(R) {
  if (R.aiParts && R.aiParts.summary) return R.aiParts.summary;
  const s = R.sections.find(x => x.key === "summary");''')
open(p2, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
