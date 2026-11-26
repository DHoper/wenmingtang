// 印出一份完整批命，檢查文字：node tests/print_reading.mjs 林家豪 m
import { readFileSync } from "node:fs";
const base = new URL("../site/js/", import.meta.url);
const { initChars, kangxi } = await import(new URL("engine/chars.js", base));
const { splitName } = await import(new URL("engine/wuge.js", base));
const { reading } = await import(new URL("engine/reading.js", base));
await initChars(async f => JSON.parse(readFileSync(new URL("data/" + f, base), "utf8")));
const [name = "林家豪", gender = "m", topic = "career"] = process.argv.slice(2);
const sp = splitName([...name]);
const R = reading({ ...sp, gender, topic, bazi: null });
console.log(`${R.name}　${R.grade}　${R.score}分　${R.headline}\n${R.headlinePlain}\n`);
for (const s of R.sections) console.log(`【${s.title}】\n批：${s.pi.join("")}\n白：${s.bai}\n`);
