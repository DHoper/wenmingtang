// 「請老師細說」：AI 以引擎的 R 為依據延伸說明；結論不得與 R 相反
import { CONFIG } from "./config.js";

let samplePromise = null;
function getSample() {
  if (!samplePromise) samplePromise = (window.claude && claude.use ? claude.use("sample") : Promise.resolve(null)).catch(() => null);
  return samplePromise;
}
export async function aiAvailable() { return !!CONFIG.AI_ENDPOINT || !!(await getSample()); }

export function aiBasis(R) {
  const w = R.wuge, g = k => `${w[k].n}畫（${w[k].el}）${w[k].level}・${w[k].name}`;
  return {
    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 所問: R.sections.find(s => s.key === "topic")?.title,
    評等: R.grade, 分數: R.score, 批語: R.headline,
    五格: { 天格: g("tian"), 人格: g("ren"), 地格: g("di"), 外格: g("wai"), 總格: g("zong") },
    三才: `${R.sancai.key} ${R.sancai.level}`,
    八字: R.bazi ? { 四柱: R.bazi.pillars.map(p => p.gz).join(" "), 日主: R.bazi.dmGan + R.bazi.dm, 強弱: R.bazi.strength, 用神: R.bazi.yong, 喜: R.bazi.xi, 忌: R.bazi.ji, 推論: R.bazi.reasons } : "未提供生辰",
    各段批語: Object.fromEntries(R.sections.map(s => [s.title, s.pi.join("")])),
    各段白話: Object.fromEntries(R.sections.map(s => [s.title, s.bai])),
    建議改名: R.renameAdvised ? R.renameWhy : "不必",
  };
}
export function aiMessages(R) {
  const system = `你是台灣廟口算命攤的算命先生，看了幾十年的名字。請用繁體中文、台灣日常口語回答，像面對面坐在攤前講話：直接、溫厚、實在，自稱「我」，不用「老夫」這類武俠腔；可以偶爾夾一兩個常見台語詞（例如「囝仔」「所在」「較好」），但要讓不會台語的人也看得懂。

以下「批命依據」由姓名學系統依康熙筆畫、熊崎五格、三才與八字喜用神算出。你的細說必須以它為準：
- 評等與是否建議改名必須一致，不可給相反結論；各格吉凶、喜用神以依據為準，不要自己重算或編造。
- 可以把各格串成一個人的故事：個性、做事方式、人際、感情、財運、晚運，並回應「所問」。

寫作要求：
1. 第一段直接講這個名字整體給人的感覺與最關鍵的一點。
2. 中段把幾個格與三才、八字（若有）串起來說，不要逐格背誦。
3. 最後給 2～3 個具體可做的建議；若建議改名，說明要往哪個五行、什麼筆畫方向去找。
4. 不說宿命論；講到健康只用傳統說法並提醒就醫；不加免責聲明。
5. 全文約 350～500 字，分成短段落，不用 Markdown 標題、粗體或項目符號。`;
  return [{ role: "system", content: system }, { role: "user", content: "批命依據：\n" + JSON.stringify(aiBasis(R), null, 1) }];
}

export async function aiReading(R, onText) {
  const msgs = aiMessages(R);
  if (CONFIG.AI_ENDPOINT) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs }) });
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
  await sample(msgs.map(m => m.content).join("\n\n"), { cache: false, onText: ({ text }) => { if (text !== "Thinking...") { out = text; onText(text); } } });
  return out;
}
