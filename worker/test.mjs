// 在本機直接跑 Worker（不用 wrangler）：node worker/test.mjs
// 金鑰讀 worker/.dev.vars（git 不追蹤）。會實際呼叫 DeepSeek 一次。
import { readFileSync } from "node:fs";
import worker from "./src/index.js";

const key = readFileSync(new URL("./.dev.vars", import.meta.url), "utf8").match(/DEEPSEEK_API_KEY=(\S+)/)[1];
const env = { DEEPSEEK_API_KEY: key };
const post = (origin, body) => worker.fetch(new Request("https://x/", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }), env);

const bad = await post("https://evil.example", { basis: { a: 1 } });
console.log("陌生來源被擋：", bad.status === 403);
const noBasis = await post("http://127.0.0.1:8765", { messages: [{ role: "user", content: "hi" }] });
console.log("沒有依據被擋：", noBasis.status === 400);

const basis = { 姓名: "林家豪", 乾坤: "乾造（男）", 所問: "事業", 評等: "中", 分數: 74, 批語: "人格得數，三才未順，晚景可期",
  五格: { 天格: "9畫（水）大凶", 人格: "18畫（金）吉", 地格: "24畫（火）大吉", 外格: "15畫（土）大吉", 總格: "32畫（木）吉" }, 三才: "水金火 凶", 八字: "未提供生辰", 建議改名: "不必" };
const res = await post("http://127.0.0.1:8765", { basis });
console.log("狀態：", res.status, res.headers.get("content-type"));
const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", txt = "";
for (;;) {
  const { done, value } = await rd.read(); if (done) break;
  buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
  for (const l of lines) { const m = l.match(/^data:\s*(.*)$/); if (!m || m[1] === "[DONE]") continue; try { txt += JSON.parse(m[1]).choices?.[0]?.delta?.content || ""; } catch (_) {} }
}
console.log("字數：", txt.length);
console.log(txt);
