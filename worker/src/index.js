// 問名堂「叩問先生」中繼站（Cloudflare Worker）
// 網頁只送「批命依據」（basis）與客人的一句叩問（question），提示詞在這裡組好再轉給 DeepSeek，串流回傳。
// 金鑰放在 Worker 機密：npx wrangler secret put DEEPSEEK_API_KEY（不寫進任何檔案）。
// 每日次數：每個人（以 IP 雜湊計）每天 USER_READINGS 張批命、USER_ASKS 次追問，全站 SITE_CALLS 次，臺灣時間零點重算，記在 KV（LIMITS）。
import { messagesFor, cleanQuestion, LIMITS } from "../../site/js/ai-prompt.js";

const DEFAULT_ORIGINS = "https://gxgemini777.github.io,https://dhoper.github.io,http://127.0.0.1:8765,http://localhost:8765";
const burst = new Map(); // 短時間連發的保護（同一個 isolate 內）

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
const twDay = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ───────── 分享卡：圖存在 D1（CARDS）30 天；/s/<id> 是給 LINE、臉書抓預覽的頁面，人點進去就轉到網站 ─────────
const CARD_DAYS = 30, CARD_PER_DAY = 30, CARD_MAX_BYTES = 450 * 1024;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function newId() { const a = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", b = crypto.getRandomValues(new Uint8Array(10)); return [...b].map(x => a[x % a.length]).join(""); }
async function saveCard(req, env, cors, allowed) {
  if (!env.CARDS) return json({ error: "not_configured" }, 500, cors);
  let body; try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400, cors); }
  const m = typeof body.img === "string" && body.img.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 60) : "", descr = typeof body.desc === "string" ? body.desc.trim().slice(0, 140) : "";
  let target = ""; try { const t = new URL(body.target); if (allowed.includes(t.origin)) target = t.href; } catch (_) {}
  if (!m || !title || !target) return json({ error: "bad_request" }, 400, cors);
  const bin = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
  if (bin.length > CARD_MAX_BYTES || bin[0] !== 0xff || bin[1] !== 0xd8) return json({ error: "bad_image" }, 400, cors);
  const who = await sha((req.headers.get("CF-Connecting-IP") || "local") + (env.SALT || "wenming")), now = Date.now();
  const n = await env.CARDS.prepare("SELECT COUNT(*) AS n FROM cards WHERE who = ? AND created > ?").bind(who, now - 86400e3).first("n");
  if (n >= CARD_PER_DAY) return json({ error: "card_limit" }, 429, cors);
  const id = newId();
  await env.CARDS.prepare("INSERT INTO cards (id, img, title, descr, target, who, created) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, bin, title, descr, target, who, now).run();
  if (Math.random() < 0.05) await env.CARDS.prepare("DELETE FROM cards WHERE created < ?").bind(now - CARD_DAYS * 86400e3).run();
  return json({ id, url: new URL(req.url).origin + "/s/" + id }, 200, cors);
}
async function showCard(id, env, origin) {
  const row = env.CARDS && /^[A-Za-z0-9]{6,16}$/.test(id) ? await env.CARDS.prepare("SELECT title, descr, target FROM cards WHERE id = ?").bind(id).first() : null;
  const home = "https://dhoper.github.io/wenmingtang/";
  if (!row) return Response.redirect(home, 302);
  const img = `${origin}/c/${id}.jpg`, self = `${origin}/s/${id}`;
  const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(row.title)}</title><meta name="description" content="${esc(row.descr)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="問名堂"><meta property="og:url" content="${self}">
<meta property="og:title" content="${esc(row.title)}"><meta property="og:description" content="${esc(row.descr)}">
<meta property="og:image" content="${img}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${img}">
<script>location.replace(${JSON.stringify(row.target)});</script></head>
<body style="margin:0;background:#0d1420;color:#f6ead4;font-family:serif;text-align:center;padding:1.5em">
<p><img src="${img}" alt="" style="max-width:100%;height:auto"></p><p><a href="${esc(row.target)}" style="color:#e8c47a;font-size:1.2em">到問名堂看你的名字</a></p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
async function cardImage(id, env) {
  const row = env.CARDS && /^[A-Za-z0-9]{6,16}$/.test(id) ? await env.CARDS.prepare("SELECT img FROM cards WHERE id = ?").bind(id).first() : null;
  if (!row) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(row.img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=2592000, immutable" } });
}

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map(s => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const ok = allowed.includes(origin);
    const cors = { "Access-Control-Allow-Origin": ok ? origin : allowed[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Expose-Headers": "X-User-Left, X-Site-Left", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    const url = new URL(req.url);
    if (req.method === "GET" || req.method === "HEAD") {
      let m;
      if ((m = url.pathname.match(/^\/s\/([^/]+)$/))) return showCard(m[1], env, url.origin);
      if ((m = url.pathname.match(/^\/c\/([^/]+)\.jpg$/))) return cardImage(m[1], env);
      return new Response("問名堂", { status: 404 });
    }
    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (req.method !== "POST" || !ok) return json({ error: "forbidden" }, 403, cors);
    if (url.pathname === "/card") return saveCard(req, env, cors, allowed);
    if (!env.DEEPSEEK_API_KEY) return json({ error: "not_configured" }, 500, cors);

    const ip = req.headers.get("CF-Connecting-IP") || "local";
    const now = Date.now();
    const recent = (burst.get(ip) || []).filter(t => now - t < 60e3);

    let body;
    try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400, cors); }
    const basis = body && body.basis;
    if (!basis || typeof basis !== "object" || Array.isArray(basis) || JSON.stringify(basis).length > 12000) return json({ error: "bad_request" }, 400, cors);
    const mode = body.mode === "reading" ? "reading" : "ask";
    const rawQ = typeof body.question === "string" ? body.question : "";
    if ([...rawQ.trim()].length > LIMITS.QUESTION_MAX) return json({ error: "too_long", max: LIMITS.QUESTION_MAX }, 400, cors);
    const question = mode === "ask" ? cleanQuestion(rawQ) : "";
    if (mode === "ask" && !question) return json({ error: "empty" }, 400, cors);

    // 每日次數：每個人的批命、追問分開算；全站算總呼叫數。KV 沒綁就只靠前端與短時間保護
    const userMax = mode === "reading" ? +(env.USER_READINGS || LIMITS.USER_READINGS) : +(env.USER_ASKS || LIMITS.USER_ASKS);
    const siteMax = +(env.SITE_CALLS || LIMITS.SITE_CALLS);
    const day = twDay(), who = await sha(ip + (env.SALT || "wenming"));
    const userKey = `u:${day}:${who}:${mode === "reading" ? "r" : "a"}`, siteKey = `s:${day}`;
    let userUsed = 0, siteUsed = 0;
    if (env.LIMITS) {
      [userUsed, siteUsed] = (await Promise.all([env.LIMITS.get(userKey), env.LIMITS.get(siteKey)])).map(v => +v || 0);
      if (siteUsed >= siteMax) return json({ error: "site_limit", max: siteMax }, 429, cors);
      if (userUsed >= userMax) return json({ error: mode === "reading" ? "reading_limit" : "user_limit", max: userMax }, 429, cors);
    }
    if (recent.length >= 4) return json({ error: "too_fast" }, 429, cors);
    recent.push(now); burst.set(ip, recent); if (burst.size > 5000) burst.clear();

    const up = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: env.MODEL || "deepseek-chat", messages: messagesFor(basis, question, mode), stream: true, max_tokens: mode === "reading" ? 2200 : 420, temperature: 0.85 }),
    });
    if (!up.ok || !up.body) return json({ error: "upstream", status: up.status }, 502, cors);
    // DeepSeek 有回應才扣次數
    if (env.LIMITS) await Promise.all([env.LIMITS.put(userKey, String(userUsed + 1), { expirationTtl: 172800 }), env.LIMITS.put(siteKey, String(siteUsed + 1), { expirationTtl: 172800 })]);
    return new Response(up.body, { headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-User-Left": String(Math.max(0, userMax - userUsed - 1)), "X-Site-Left": String(Math.max(0, siteMax - siteUsed - 1)) } });
  },
};
