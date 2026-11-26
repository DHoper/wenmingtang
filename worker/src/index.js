// 問名堂中繼站（Cloudflare Worker）
// 1. POST /      先生親口批（mode=reading）與追問（mode=ask）：網頁送「批命依據」（basis），提示詞在這裡組好轉給 DeepSeek，串流回傳。
// 2. POST /card  分享卡：存 1200×630 預覽圖到 D1，回 /s/<id>；GET /s/<id> 給 LINE、臉書抓預覽，人點進去轉到網站；GET /c/<id>.jpg 是圖。
// 金鑰放在 Worker 機密：npx wrangler secret put DEEPSEEK_API_KEY（不寫進任何檔案）。SALT 也是機密。
// 每日次數記在 D1 的 counters 表（原子遞增，先扣再呼叫 DeepSeek，失敗退回），臺灣時間零點重算：
//   每台裝置（網頁產生的匿名 ID）每天 USER_READINGS 張批命、USER_ASKS 句追問；
//   每個 IP 另有寬一點的上限（手機網路很多人共用同一個 IP）；全站每天 SITE_CALLS 次。
import { messagesFor, cleanQuestion, LIMITS } from "../../site/js/ai-prompt.js";

const DEFAULT_ORIGINS = "https://gxgemini777.github.io,https://dhoper.github.io,http://127.0.0.1:8765,http://localhost:8765";
const SITE_PATH = "/wenmingtang/";
const IP_FACTOR = 8; // 同一個 IP 的上限 = 每台裝置上限 × 8
const burst = new Map(); // 短時間連發的保護（同一個 isolate 內）

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
const twDay = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}
const local = o => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);

// ───────── 次數（D1 原子遞增） ─────────
// 沒超過上限就 +1 並回傳新值；已到上限回傳 null
async function bump(db, k, max) {
  const row = await db.prepare("INSERT INTO counters (k, n, exp) VALUES (?1, 1, ?2) ON CONFLICT(k) DO UPDATE SET n = n + 1 WHERE n < ?3 RETURNING n").bind(k, Date.now() + 2 * 86400e3, max).first();
  return row ? row.n : null;
}
const unbump = (db, k) => db.prepare("UPDATE counters SET n = n - 1 WHERE k = ? AND n > 0").bind(k).run();

// ───────── 批命依據白名單：只收網頁 aiBasis() 會送的欄位，每個值限長度 ─────────
const BASIS_KEYS = new Set(["姓名", "乾坤", "年紀", "名字用字", "所問", "各字筆畫", "評等", "批語", "白話總評", "五格", "三才", "八字", "各段批語", "各段白話", "建議改名"]);
function okValue(v, depth) {
  if (typeof v === "string") return [...v].length <= 600;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return depth < 2 && v.length <= 16 && v.every(x => typeof x === "string" && [...x].length <= 300);
  if (v && typeof v === "object") { const e = Object.entries(v); return depth < 1 && e.length <= 16 && e.every(([k, x]) => [...k].length <= 24 && okValue(x, depth + 1)); }
  return v == null;
}
function okBasis(b) {
  if (!b || typeof b !== "object" || Array.isArray(b) || JSON.stringify(b).length > 12000) return false;
  if (!Object.keys(b).every(k => BASIS_KEYS.has(k))) return false;
  if (typeof b.姓名 !== "string" || !/^\p{Script=Han}{2,5}$/u.test(b.姓名)) return false;
  return Object.values(b).every(v => okValue(v, 0));
}

// ───────── 分享卡 ─────────
const CARD_DAYS = 30, CARD_PER_IP = 30, CARD_PER_DAY_SITE = 3000, CARD_MAX_BYTES = 450 * 1024;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function newId() { const a = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", b = crypto.getRandomValues(new Uint8Array(10)); return [...b].map(x => a[x % a.length]).join(""); }
const TITLE_RE = /^\p{Script=Han}{2,5}的名字，先生批【(上上|上|中|中下|下)】｜問名堂$/u;
const DESC_RE = /^「[^<>「」]{1,40}」換你，名字拿去給先生看看。$/u;
async function saveCard(req, env, cors, allowed) {
  if (!env.CARDS) return json({ error: "not_configured" }, 500, cors);
  const u = new URL(req.url);
  const title = (u.searchParams.get("t") || "").trim(), descr = (u.searchParams.get("d") || "").trim();
  let target = "";
  try { const t = new URL(u.searchParams.get("u") || ""); if (allowed.includes(t.origin) && (local(t.origin) || t.pathname.startsWith(SITE_PATH))) target = t.href; } catch (_) {}
  if (!TITLE_RE.test(title) || !DESC_RE.test(descr) || !target) return json({ error: "bad_request" }, 400, cors);
  if (+(req.headers.get("Content-Length") || 0) > CARD_MAX_BYTES) return json({ error: "bad_image" }, 400, cors);
  const bin = new Uint8Array(await req.arrayBuffer());
  if (bin.length > CARD_MAX_BYTES || bin.length < 1000 || bin[0] !== 0xff || bin[1] !== 0xd8) return json({ error: "bad_image" }, 400, cors);
  const who = await sha((req.headers.get("CF-Connecting-IP") || "local") + (env.SALT || "wenming")), now = Date.now();
  const [mine, all] = await Promise.all([
    env.CARDS.prepare("SELECT COUNT(*) AS n FROM cards WHERE who = ? AND created > ?").bind(who, now - 86400e3).first("n"),
    env.CARDS.prepare("SELECT COUNT(*) AS n FROM cards WHERE created > ?").bind(now - 86400e3).first("n"),
  ]);
  if (mine >= CARD_PER_IP || all >= CARD_PER_DAY_SITE) return json({ error: "card_limit" }, 429, cors);
  const id = newId();
  await env.CARDS.prepare("INSERT INTO cards (id, img, title, descr, target, who, created) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, bin, title, descr, target, who, now).run();
  if (Math.random() < 0.05) await env.CARDS.batch([
    env.CARDS.prepare("DELETE FROM cards WHERE created < ?").bind(now - CARD_DAYS * 86400e3),
    env.CARDS.prepare("DELETE FROM counters WHERE exp < ?").bind(now),
  ]);
  return json({ id, url: u.origin + "/s/" + id }, 200, cors);
}
const fresh = () => Date.now() - CARD_DAYS * 86400e3;
async function showCard(id, env, origin) {
  const row = env.CARDS && /^[A-Za-z0-9]{6,16}$/.test(id) ? await env.CARDS.prepare("SELECT title, descr, target FROM cards WHERE id = ? AND created > ?").bind(id, fresh()).first() : null;
  if (!row) return Response.redirect("https://dhoper.github.io" + SITE_PATH, 302);
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
  const row = env.CARDS && /^[A-Za-z0-9]{6,16}$/.test(id) ? await env.CARDS.prepare("SELECT img FROM cards WHERE id = ? AND created > ?").bind(id, fresh()).first() : null;
  if (!row) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(row.img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" } });
}

// ───────── 先生親口批／追問 ─────────
async function askAI(req, env, cors) {
  if (!env.DEEPSEEK_API_KEY || !env.CARDS) return json({ error: "not_configured" }, 500, cors);
  const ip = req.headers.get("CF-Connecting-IP") || "local", now = Date.now();
  // 短時間連發：在任何 await 之前就記下來，同時送出的請求也擋得住
  const recent = (burst.get(ip) || []).filter(t => now - t < 60e3);
  if (recent.length >= 4) return json({ error: "too_fast" }, 429, cors);
  recent.push(now); burst.set(ip, recent); if (burst.size > 5000) burst.clear();

  let body;
  try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400, cors); }
  const basis = body && body.basis;
  if (!okBasis(basis)) return json({ error: "bad_request" }, 400, cors);
  const mode = body.mode === "reading" ? "reading" : "ask";
  const rawQ = typeof body.question === "string" ? body.question : "";
  if ([...rawQ.trim()].length > LIMITS.QUESTION_MAX) return json({ error: "too_long", max: LIMITS.QUESTION_MAX }, 400, cors);
  const question = mode === "ask" ? cleanQuestion(rawQ) : "";
  if (mode === "ask" && !question) return json({ error: "empty" }, 400, cors);

  const userMax = mode === "reading" ? +(env.USER_READINGS || LIMITS.USER_READINGS) : +(env.USER_ASKS || LIMITS.USER_ASKS);
  const siteMax = +(env.SITE_CALLS || LIMITS.SITE_CALLS);
  const salt = env.SALT || "wenming", day = twDay(), m = mode === "reading" ? "r" : "a";
  const cid = typeof body.cid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.cid) ? body.cid : "";
  const ipH = await sha(ip + salt), devH = cid ? await sha("c" + cid + salt) : ipH;
  const kDev = `d:${day}:${devH}:${m}`, kIp = `i:${day}:${ipH}:${m}`, kSite = `s:${day}`;
  const db = env.CARDS, limitErr = mode === "reading" ? "reading_limit" : "user_limit";
  // 先扣：裝置 → IP → 全站，任何一關沒過就把前面扣的退回
  const used = await bump(db, kDev, userMax);
  if (used == null) return json({ error: limitErr, max: userMax }, 429, cors);
  if ((await bump(db, kIp, userMax * IP_FACTOR)) == null) { await unbump(db, kDev); return json({ error: limitErr, max: userMax }, 429, cors); }
  const siteUsed = await bump(db, kSite, siteMax);
  if (siteUsed == null) { await Promise.all([unbump(db, kDev), unbump(db, kIp)]); return json({ error: "site_limit", max: siteMax }, 429, cors); }
  const refund = () => Promise.all([unbump(db, kDev), unbump(db, kIp), unbump(db, kSite)]).catch(() => {});

  let up;
  try {
    up = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: env.MODEL || "deepseek-chat", messages: messagesFor(basis, question, mode), stream: true, max_tokens: mode === "reading" ? 2200 : 420, temperature: mode === "reading" ? 0.9 : 0.85 }),
    });
  } catch (_) { up = null; }
  if (!up || !up.ok || !up.body) { await refund(); return json({ error: "upstream", status: up ? up.status : 0 }, 502, cors); }
  return new Response(up.body, { headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-User-Left": String(Math.max(0, userMax - used)), "X-Site-Left": String(Math.max(0, siteMax - siteUsed)) } });
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
    try {
      if (url.pathname === "/card") return await saveCard(req, env, cors, allowed);
      return await askAI(req, env, cors);
    } catch (e) {
      return json({ error: "server" }, 500, cors);
    }
  },
};
