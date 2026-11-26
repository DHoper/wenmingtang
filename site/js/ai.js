// 「請老師細說」：AI 以引擎的 R 為依據延伸說明；結論不得與 R 相反
import { CONFIG } from "./config.js";
import { messagesFor } from "./ai-prompt.js";

let samplePromise = null;
function getSample() {
  if (!samplePromise) samplePromise = (window.claude && claude.use ? claude.use("sample") : Promise.resolve(null)).catch(() => null);
  return samplePromise;
}
// 被框住（Claude 預覽）時對外連線會被擋，只有預覽本身提供的模型能用
const framed = (() => { try { return top !== self; } catch (_) { return true; } })();
export async function aiAvailable() { return framed ? !!(await getSample()) : !!CONFIG.AI_ENDPOINT || !!(await getSample()); }

export function aiBasis(R) {
  const w = R.wuge, g = k => `${w[k].n}畫（${w[k].el}）${w[k].level}・${w[k].name}`;
  return {
    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 所問: R.sections.find(s => s.key === "topic")?.title,
    各字筆畫: R.chars.map(c => `${c.part}「${c.ch}」${c.strokes}畫`).join("、"),
    評等: R.grade, 分數: R.score, 批語: R.headline,
    五格: { 天格: g("tian"), 人格: g("ren"), 地格: g("di"), 外格: g("wai"), 總格: g("zong") },
    三才: `${R.sancai.key} ${R.sancai.level}`,
    八字: R.bazi ? { 四柱: R.bazi.pillars.map(p => p.gz).join(" "), 日主: R.bazi.dmGan + R.bazi.dm, 強弱: R.bazi.strength, 用神: R.bazi.yong, 喜: R.bazi.xi, 忌: R.bazi.ji, 推論: R.bazi.reasons } : "未提供生辰",
    各段批語: Object.fromEntries(R.sections.map(s => [s.title, s.pi.join("")])),
    各段白話: Object.fromEntries(R.sections.map(s => [s.title, s.bai])),
    建議改名: R.renameAdvised ? R.renameWhy : "不必",
  };
}
export function aiMessages(R) { return messagesFor(aiBasis(R)); }

export async function aiReading(R, onText) {
  if (CONFIG.AI_ENDPOINT && !(await getSample())) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R) }) });
    if (!res.ok || !res.body) throw Object.assign(new Error("http"), { code: res.status === 429 ? "rate_limited" : "http" });
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
  const sample = await getSample();
  if (!sample) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
  let out = "";
  await sample(aiMessages(R).map(m => m.content).join("\n\n"), { cache: false, onText: ({ text }) => { if (text !== "Thinking...") { out = text; onText(text); } } });
  return out;
}
