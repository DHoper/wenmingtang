// 「叩問先生」：AI 以引擎算出的批命（R）為依據，加上客人的一句叩問，用老先生的人設回答；結論不得與 R 相反
import { CONFIG } from "./config.js";
import { messagesFor, cleanQuestion, LIMITS, READING_TAGS } from "./ai-prompt.js";
export { LIMITS };

let samplePromise = null;
function getSample() {
  if (!samplePromise) samplePromise = (window.claude && claude.use ? claude.use("sample") : Promise.resolve(null)).catch(() => null);
  return samplePromise;
}
// 被框住（Claude 預覽）時對外連線會被擋，只有預覽本身提供的模型能用
const framed = (() => { try { return top !== self; } catch (_) { return true; } })();
export async function aiAvailable() { return framed ? !!(await getSample()) : !!CONFIG.AI_ENDPOINT || !!(await getSample()); }

// 本機也記一份今天問了幾次（臺灣時間），不必等伺服器就先擋；伺服器那邊另有每人、全站的真正上限
const twDay = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const LS = { ask: "wenming:ask", reading: "wenming:readings" };
function usedToday(k = "ask") { try { const v = JSON.parse(localStorage.getItem(LS[k])); return v && v.d === twDay() ? v.n : 0; } catch (_) { return 0; } }
function markUsed(k = "ask", n) { try { localStorage.setItem(LS[k], JSON.stringify({ d: twDay(), n: n ?? usedToday(k) + 1 })); } catch (_) {} }
export function askLeft() { return Math.max(0, LIMITS.USER_ASKS - usedToday("ask")); }
export function readingsLeft() { return Math.max(0, LIMITS.USER_READINGS - usedToday("reading")); }

// 看過的 AI 批命存在瀏覽器，重看不再扣次數（最多留 20 張）
const CK = "wenming:aiCache";
export function readingKey(R) { return [R.name, R.surname.length, R.gender, R.topic, R.bazi ? R.bazi.pillars.map(p => p.gz).join("") : "-"].join("|"); }
export function cachedReading(R) { try { return (JSON.parse(localStorage.getItem(CK)) || {})[readingKey(R)] || null; } catch (_) { return null; } }
function saveReading(R, data) {
  try {
    const all = JSON.parse(localStorage.getItem(CK)) || {}, k = readingKey(R);
    all[k] = { ...data, t: Date.now() };
    const keys = Object.keys(all).sort((a, b) => all[b].t - all[a].t);
    keys.slice(20).forEach(x => delete all[x]);
    localStorage.setItem(CK, JSON.stringify(all));
  } catch (_) {}
}
// 把 AI 依【標籤】分段的文字切成 { key: 文字 }
export function parseReading(t) {
  const map = Object.fromEntries(READING_TAGS), out = {};
  const parts = String(t).split(/【([^】]{1,6})】/);
  for (let i = 1; i < parts.length; i += 2) { const k = map[parts[i]]; if (k) out[k] = (parts[i + 1] || "").trim(); }
  return out;
}

export function aiBasis(R) {
  const w = R.wuge, g = k => `${w[k].n}畫，${w[k].el}，${w[k].level}，「${w[k].name}」`;
  return {
    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 所問: R.sections.find(s => s.key === "topic")?.title,
    各字筆畫: R.chars.map(c => `${c.part}「${c.ch}」${c.strokes}畫`).join("、"),
    評等: R.grade, 批語: R.headline, 白話總評: R.headlinePlain,
    五格: { 天格: g("tian"), 人格: g("ren"), 地格: g("di"), 外格: g("wai"), 總格: g("zong") },
    三才: `${R.sancai.key}，${R.sancai.level}`,
    八字: R.bazi ? { 四柱: R.bazi.pillars.map(p => p.gz).join(" "), 日主: R.bazi.dmGan + R.bazi.dm, 強弱: R.bazi.strength, 用神: R.bazi.yong, 喜神: R.bazi.xi, 忌神: R.bazi.ji, 推論: R.bazi.reasons } : "沒有給生辰",
    各段批語: Object.fromEntries(R.sections.map(s => [s.title, s.pi.join("")])),
    各段白話: Object.fromEntries(R.sections.map(s => [s.title, s.bai])),
    建議改名: R.renameAdvised ? R.renameWhy.join("，") : "不必",
  };
}

/**
 * 叩問。onText 收到目前為止的全文。
 * 失敗時丟出 { code }：user_limit、site_limit、too_long、too_fast、unavailable、http
 */
// 回答太長時，在上限內最後一個句號處截斷
function capText(t, max) {
  if ([...t].length <= max) return t;
  const cut = [...t].slice(0, max).join(""), i = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"));
  return i > max * 0.5 ? cut.slice(0, i + 1) : cut + "……";
}
export async function aiAsk(R, question, onText0) {
  const q = cleanQuestion(question);
  const max = LIMITS.ANSWER_MAX_Q;
  let capped = false;
  const onText = t => { if (capped) return; const c = capText(t, max); if (c !== t) capped = true; onText0(c); };
  if ([...String(question || "").trim()].length > LIMITS.QUESTION_MAX) throw Object.assign(new Error("too_long"), { code: "too_long" });
  if (askLeft() <= 0) throw Object.assign(new Error("user_limit"), { code: "user_limit" });
  const sample = framed ? await getSample() : null;
  if (CONFIG.AI_ENDPOINT && !sample) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), question: q }) });
    if (!res.ok || !res.body) {
      let code = "http"; try { code = (await res.json()).error || code; } catch (_) {}
      if (code === "user_limit") markUsed("ask", LIMITS.USER_ASKS);
      throw Object.assign(new Error(code), { code });
    }
    markUsed();
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", txt = "";
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
      for (const l of lines) {
        const m = l.match(/^data:\s*(.*)$/); if (!m || m[1] === "[DONE]") continue;
        try { const j = JSON.parse(m[1]); const d = j.choices?.[0]?.delta?.content; if (d) { txt += d; onText(txt); } } catch (_) {}
      }
    }
    return txt;
  }
  const s2 = sample || await getSample();
  if (!s2) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
  markUsed();
  let out = "";
  await s2(messagesFor(aiBasis(R), q).map(m => m.content).join("\n\n"), { cache: false, onText: ({ text }) => { if (text !== "Thinking...") { out = text; onText(text); } } });
  return out;
}

/**
 * 整張批命由 AI 寫：onUpdate(段落物件, 是否寫完)。看過的直接用存檔、不扣次數。
 * 失敗時丟出 { code }：reading_limit、site_limit、unavailable、http
 */
export async function aiReadingFull(R, onUpdate) {
  const hit = cachedReading(R);
  if (hit) { onUpdate(hit.parts, true); return hit.parts; }
  if (readingsLeft() <= 0) throw Object.assign(new Error("reading_limit"), { code: "reading_limit" });
  const sample = framed ? await getSample() : null;
  let txt = "";
  if (CONFIG.AI_ENDPOINT && !sample) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), mode: "reading" }) });
    if (!res.ok || !res.body) {
      let code = "http"; try { code = (await res.json()).error || code; } catch (_) {}
      if (code === "reading_limit") markUsed("reading", LIMITS.USER_READINGS);
      throw Object.assign(new Error(code), { code });
    }
    markUsed("reading");
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
      for (const l of lines) {
        const m = l.match(/^data:\s*(.*)$/); if (!m || m[1] === "[DONE]") continue;
        try { const d = JSON.parse(m[1]).choices?.[0]?.delta?.content; if (d) { txt += d; onUpdate(parseReading(txt), false); } } catch (_) {}
      }
    }
  } else {
    const s2 = sample || await getSample();
    if (!s2) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
    markUsed("reading");
    await s2(messagesFor(aiBasis(R), "", "reading").map(m => m.content).join("\n\n"), { cache: false, onText: ({ text }) => { if (text !== "Thinking...") { txt = text; onUpdate(parseReading(txt), false); } } });
  }
  const parts = parseReading(txt);
  if (Object.keys(parts).length >= 5) saveReading(R, { parts });
  onUpdate(parts, true);
  return parts;
}
