"""一次性：ai.js 依程式審查修正——裝置 ID、伺服器剩餘次數校正、標籤先轉繁體再切、進行中的批命共用（離開再回來不重扣）、截斷不存半句、快取版本。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\ai.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

sub(r'''import { messagesFor, cleanQuestion, LIMITS, READING_TAGS } from "./ai-prompt.js";''',
    r'''import { messagesFor, cleanQuestion, LIMITS, READING_TAGS } from "./ai-prompt.js";
import { toTrad } from "./engine/chars.js";''')

# 裝置 ID：伺服器用它算「每台裝置」的次數（手機網路很多人共用 IP）
sub(r'''export function askLeft() {''', r'''function cid() {
  try { let v = localStorage.getItem("wenming:cid"); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem("wenming:cid", v); } return v; } catch (_) { return ""; }
}
// 伺服器回的剩餘次數，拿來校正本機記的
function syncLeft(res, k, max) { const left = +res.headers.get("X-User-Left"); if (res.headers.has("X-User-Left") && left >= 0) markUsed(k, Math.max(0, max - left)); }
export function askLeft() {''')

# 快取 key 加版本與評等：之後改提示詞或引擎，舊的先生文字不會跟新評等打架
sub(r'''export function readingKey(R) { return [R.name,''', r'''const CACHE_VER = "v3";
export function readingKey(R) { return [CACHE_VER, R.grade, R.name,''')

# 標籤：先轉繁體；容許空白、粗體星號、冒號；加簡體別名
sub(r'''export function parseReading(t) {
  const map = Object.fromEntries(READING_TAGS), out = {};
  const parts = String(t).split(/【([^】]{1,6})】/);
  for (let i = 1; i < parts.length; i += 2) { const k = map[parts[i]]; if (k) out[k] = (parts[i + 1] || "").trim(); }
  return out;
}''', r'''const TAG_MAP = Object.fromEntries([...READING_TAGS, ["总评", "headline"], ["总格", "zong"], ["出外与晚运", "outer"], ["所问", "topic"], ["总结", "summary"], ["晚運", "outer"], ["出外", "outer"]]);
export function parseReading(t) {
  const out = {};
  const parts = toTrad(String(t)).split(/\**\s*【\s*([^】]{1,8}?)\s*】\s*\**\s*[：:]?/);
  for (let i = 1; i < parts.length; i += 2) {
    const k = TAG_MAP[parts[i]] || TAG_MAP[toTrad(parts[i])];
    if (k) out[k] = (parts[i + 1] || "").replace(/\*+/g, "").trim();
  }
  return out;
}''')

# 追問：帶裝置 ID、用伺服器剩餘次數校正
sub(r'''body: JSON.stringify({ basis: aiBasis(R), question: q }) });''', r'''body: JSON.stringify({ basis: aiBasis(R), question: q, cid: cid() }) });''')
sub(r'''    markUsed();
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", txt = "";''', r'''    markUsed(); syncLeft(res, "ask", LIMITS.USER_ASKS);
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", txt = "";''')

# 整張批命：進行中的共用、截斷處理、失敗時把已收到的段落交回去
a = s.index("export async function aiReadingFull(R, onUpdate) {")
s = s[:a] + r'''const inflight = new Map(); // readingKey → { parts, subs:Set, promise }
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
  if (readingsLeft() <= 0) throw Object.assign(new Error("reading_limit"), { code: "reading_limit" });
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
'''
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
