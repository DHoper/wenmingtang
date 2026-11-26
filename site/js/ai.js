// 「叩問先生」：AI 以引擎算出的批命（R）為依據，加上客人的一句叩問，用老先生的人設回答；結論不得與 R 相反
import { CONFIG } from "./config.js";
import { messagesFor, cleanQuestion, LIMITS, READING_TAGS } from "./ai-prompt.js";
import { toTrad } from "./engine/chars.js";
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
const LS = { ask: "wenming:asks2", reading: "wenming:readings2" };
function usedToday(k = "ask") { try { const v = JSON.parse(localStorage.getItem(LS[k])); return v && v.d === twDay() ? v.n : 0; } catch (_) { return 0; } }
function markUsed(k = "ask", n) { try { localStorage.setItem(LS[k], JSON.stringify({ d: twDay(), n: n ?? usedToday(k) + 1 })); } catch (_) {} }
function cid() {
  try { let v = localStorage.getItem("wenming:cid"); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem("wenming:cid", v); } return v; } catch (_) { return ""; }
}
// 伺服器回的剩餘次數，拿來校正本機記的
function syncLeft(res, k, max) { const left = +res.headers.get("X-User-Left"); if (res.headers.has("X-User-Left") && left >= 0) markUsed(k, Math.max(0, max - left)); }
export function askLeft() { return Math.max(0, LIMITS.USER_ASKS - usedToday("ask")); }
export function readingsLeft() { return Math.max(0, LIMITS.USER_READINGS - usedToday("reading")); }

// 看過的 AI 批命存在瀏覽器，重看不再扣次數（最多留 20 張）
const CK = "wenming:aiCache";
const CACHE_VER = "v6";
export function readingKey(R) { return [CACHE_VER, R.grade, R.name, R.surname.length, R.gender, R.topic, R.bazi ? R.bazi.pillars.map(p => p.gz).join("") : "-"].join("|"); }
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
// AI 偶爾漏出 AI 腔的字（模型沒辦法百分之百照規定），顯示前換成先生的講法。清單見 docs/voice.md
const FIX = [
  [/(老實說|說真的|坦白講|我老實講|老實講)[，,：:]?/g, ""], [/(值得注意的是|值得一提的是|總的來說|總而言之|整體而言|綜上所述)[，,]?/g, ""], [/此外[，,]?/g, "還有，"],
  [/撐得住/g, "扛得住"], [/撐不住/g, "扛不住"], [/硬撐/g, "硬扛"], [/撐起/g, "扛起"], [/撐/g, "扛"],
  [/穩穩的/g, "踏踏實實的"], [/穩穩地?/g, "慢慢"], [/站穩/g, "站好"], [/(安穩|穩定)/g, "安定"], [/穩當/g, "妥當"], [/穩重/g, "沉著"], [/穩健/g, "踏實"], [/穩/g, "牢"],
  [/(看|聽)懂/g, "$1明白"], [/不懂/g, "不曉得"], [/懂得/g, "曉得"], [/懂/g, "曉得"],
  [/做出/g, "做"], [/進行/g, ""], [/機會/g, "時機"], [/一份/g, ""], [/代表/g, "就是"], [/意味著/g, "就是"], [/象徵/g, "就像"],
  [/[—–]+/g, "，"], [/！/g, "。"],
];
export function cleanAI(t) { let o = String(t); for (const [a, b] of FIX) o = o.replace(a, b); return o.replace(/，{2,}/g, "，").replace(/^，/, ""); }

// 把 AI 依【標籤】分段的文字切成 { key: 文字 }
const TAG_MAP = Object.fromEntries([...READING_TAGS, ["总评", "headline"], ["总格", "zong"], ["出外与晚运", "outer"], ["所问", "topic"], ["总结", "summary"], ["晚運", "outer"], ["出外", "outer"]]);
export function parseReading(t) {
  const out = {};
  const parts = toTrad(String(t)).split(/\**\s*【\s*([^】]{1,8}?)\s*】\s*\**\s*[：:]?/);
  for (let i = 1; i < parts.length; i += 2) {
    const k = TAG_MAP[parts[i]] || TAG_MAP[toTrad(parts[i])];
    if (k) out[k] = cleanAI((parts[i + 1] || "").replace(/\*+/g, "").trim());
  }
  return out;
}

// 年紀：有給生日才算（臺灣時間），還沒出世的寫預產期
function ageText(R) {
  const b = R.bazi && R.bazi.input; if (!b || !b.y) return "沒有給生日，不知道幾歲";
  const now = new Date(Date.now() + 8 * 3600e3), y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, d = now.getUTCDate();
  const roc = b.y - 1911, born = new Date(Date.UTC(b.y, b.m - 1, b.d)), today = new Date(Date.UTC(y, m - 1, d));
  if (born > today) return `還沒出世，預產期民國${roc}年${b.m}月${b.d}日`;
  let age = y - b.y; if (m < b.m || (m === b.m && d < b.d)) age--;
  return `民國${roc}年次，今年${age}歲`;
}
export function aiBasis(R) {
  const w = R.wuge, g = k => `${w[k].n}畫，${w[k].el}，${w[k].level}，「${w[k].name}」，判語「${w[k].verdict}」，${(w[k].tags || []).join("、") || "無"}`;
  return {
    姓名: R.name, 乾坤: R.gender === "f" ? "坤造（女）" : "乾造（男）", 年紀: ageText(R),
    名字用字: R.chars.filter(c => c.part !== "姓").map(c => c.ch).join("、"), 所問: R.sections.find(s => s.key === "topic")?.title,
    各字筆畫: R.chars.map(c => `${c.part}「${c.ch}」${c.strokes}畫`).join("、"),
    評等: R.grade, 批語: R.headline,
    五格: { 天格: g("tian"), 人格: g("ren"), 地格: g("di"), 外格: g("wai"), 總格: g("zong") },
    三才: `${R.sancai.key}，${R.sancai.level}`,
    八字: R.bazi ? { 四柱: R.bazi.pillars.map(p => p.gz).join(" "), 日主: R.bazi.dmGan + R.bazi.dm, 強弱: R.bazi.strength, 用神: R.bazi.yong, 喜神: R.bazi.xi, 忌神: R.bazi.ji, 推論: R.bazi.reasons } : "沒有給生辰",
    各段批語: Object.fromEntries(R.sections.map(s => [s.title, s.pi.join("")])),
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
  const onText = t => { if (capped) return; t = cleanAI(toTrad(t)); const c = capText(t, max); if (c !== t) capped = true; onText0(c); };
  if ([...String(question || "").trim()].length > LIMITS.QUESTION_MAX) throw Object.assign(new Error("too_long"), { code: "too_long" });
  const sample = framed ? await getSample() : null;
  if (CONFIG.AI_ENDPOINT && !sample) {
    const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), question: q, cid: cid() }) });
    if (!res.ok || !res.body) {
      let code = "http"; try { code = (await res.json()).error || code; } catch (_) {}
      if (code === "user_limit") markUsed("ask", LIMITS.USER_ASKS);
      throw Object.assign(new Error(code), { code });
    }
    markUsed(); syncLeft(res, "ask", LIMITS.USER_ASKS);
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
const inflight = new Map(); // readingKey → { parts, subs:Set, promise }
export function readingPending(R) { const f = inflight.get(readingKey(R)); return f ? f.promise : null; }
export async function aiReadingFull(R, onUpdate) {
  const hit = cachedReading(R);
  if (hit) { onUpdate(hit.parts, true); return hit.parts; }
  const key = readingKey(R);
  // 同一張已經在寫（例如寫到一半離開又回來）：接著用，不再發新請求、不再扣次數
  const going = inflight.get(key);
  if (going) {
    going.subs.add(onUpdate); onUpdate(going.parts, false);
    return going.promise;
  }
  const job = { parts: {}, subs: new Set([onUpdate]) };
  const emit = done => job.subs.forEach(f => { try { f(job.parts, done); } catch (_) {} });
  job.promise = (async () => {
    const sample = framed ? await getSample() : null;
    let txt = "", truncated = false;
    try {
      if (CONFIG.AI_ENDPOINT && !sample) {
        const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ basis: aiBasis(R), mode: "reading", cid: cid() }) });
        if (!res.ok || !res.body) {
          let code = "http"; try { code = (await res.json()).error || code; } catch (_) {}
          if (code === "reading_limit") markUsed("reading", LIMITS.USER_READINGS);
          throw Object.assign(new Error(code), { code });
        }
        markUsed("reading"); syncLeft(res, "reading", LIMITS.USER_READINGS);
        const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "";
        for (;;) {
          const { done, value } = await rd.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
          for (const l of lines) {
            const m = l.match(/^data:\s*(.*)$/); if (!m || m[1] === "[DONE]") continue;
            try { const c = JSON.parse(m[1]).choices?.[0]; const d = c?.delta?.content; if (c?.finish_reason === "length") truncated = true; if (d) { txt += d; job.parts = parseReading(txt); emit(false); } } catch (_) {}
          }
        }
      } else {
        const s2 = sample || await getSample();
        if (!s2) throw Object.assign(new Error("unavailable"), { code: "unavailable" });
        markUsed("reading");
        await s2(messagesFor(aiBasis(R), "", "reading").map(m => m.content).join("\n\n"), { cache: false, onText: ({ text }) => { if (text !== "Thinking...") { txt = text; job.parts = parseReading(txt); emit(false); } } });
      }
    } catch (e) {
      // 中途斷掉：已經寫完整的段落留著（最後一段可能只寫一半，丟掉）
      const ks = Object.keys(job.parts); if (ks.length) delete job.parts[ks[ks.length - 1]];
      e.parts = job.parts; inflight.delete(key); throw e;
    }
    const parts = parseReading(txt);
    if (truncated) { const ks = Object.keys(parts); if (ks.length) delete parts[ks[ks.length - 1]]; }
    job.parts = parts;
    if (Object.keys(parts).length >= 3) saveReading(R, { parts });
    inflight.delete(key);
    emit(true);
    return parts;
  })();
  inflight.set(key, job);
  return job.promise;
}
