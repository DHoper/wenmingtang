// 「叩問先生」：AI 以引擎算出的批命（R）為依據，加上客人的一句叩問，用老先生的人設回答；結論不得與 R 相反
import { CONFIG } from "./config.js";
import { messagesFor, cleanQuestion, LIMITS } from "./ai-prompt.js";
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
const LS = "wenming:ask";
function usedToday() { try { const v = JSON.parse(localStorage.getItem(LS)); return v && v.d === twDay() ? v.n : 0; } catch (_) { return 0; } }
function markUsed() { try { localStorage.setItem(LS, JSON.stringify({ d: twDay(), n: usedToday() + 1 })); } catch (_) {} }
export function askLeft() { return Math.max(0, LIMITS.USER_PER_DAY - usedToday()); }

export function aiBasis(R) {
  const w = R.wuge, g = k => `${w[k].n}畫，${w[k].el}，${w[k].level}，「${w[k].name}」`;
  return {
    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 所問: R.sections.find(s => s.key === "topic")?.title,
    各字筆畫: R.chars.map(c => `${c.part}「${c.ch}」${c.strokes}畫`).join("、"),
    評等: R.grade, 分數: R.score, 批語: R.headline, 白話總評: R.headlinePlain,
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
export async function aiAsk(R, question, onText) {
  const q = cleanQuestion(question);
  if ([...String(question || "").trim()].length > LIMITS.QUESTION_MAX) throw Object.assign(new Error("too_long"), { code: "too_long" });
  if (askLeft() <= 0) throw Object.assign(new Error("user_limit"), { code: "user_limit" });
  const sample = framed ? await getSample() : null;
  if (CONFIG.AI_ENDPOINT && !sample) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), question: q }) });
    if (!res.ok || !res.body) {
      let code = "http"; try { code = (await res.json()).error || code; } catch (_) {}
      if (code === "user_limit") { try { localStorage.setItem(LS, JSON.stringify({ d: twDay(), n: LIMITS.USER_PER_DAY })); } catch (_) {} }
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
