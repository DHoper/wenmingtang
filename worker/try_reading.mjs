// 實測整張 AI 批命：node worker/try_reading.mjs 名字 m|f topic
import { readFileSync } from "node:fs";
import worker from "./src/index.js";
import { aiBasis } from "../site/js/ai.js";
import { READING_TAGS } from "../site/js/ai-prompt.js";
const base = new URL("../site/js/", import.meta.url);
const { initChars } = await import(new URL("engine/chars.js", base));
const { splitName } = await import(new URL("engine/wuge.js", base));
const { reading } = await import(new URL("engine/reading.js", base));
await initChars(async f => JSON.parse(readFileSync(new URL("data/" + f, base), "utf8")));
const [name = "林廷一", g = "m", topic = "career"] = process.argv.slice(2);
const R = reading({ ...splitName([...name]), gender: g, topic, bazi: null });
const key = readFileSync(new URL("./.dev.vars", import.meta.url), "utf8").match(/DEEPSEEK_API_KEY=(\S+)/)[1];
const t0 = Date.now();
const res = await worker.fetch(new Request("https://x/", { method: "POST", headers: { Origin: "http://127.0.0.1:8765", "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), mode: "reading" }) }), { DEEPSEEK_API_KEY: key });
const t = await res.text(); let s = "";
for (const l of t.split("\n")) { const m = l.match(/^data:\s*(.*)$/); if (m && m[1] !== "[DONE]") { try { s += JSON.parse(m[1]).choices[0].delta.content || ""; } catch (_) {} } }
console.log("狀態", res.status, "秒數", ((Date.now() - t0) / 1000).toFixed(1), "字數", [...s].length);
const tags = READING_TAGS.map(x => x[0]);
const found = tags.filter(x => s.includes("【" + x + "】"));
console.log("段落：", found.join("、"), "｜缺：", tags.filter(x => !found.includes(x)).join("、"));
console.log(s);
