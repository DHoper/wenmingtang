// 問名堂「叩問先生」中繼站（Cloudflare Worker）
// 網頁只送「批命依據」（basis）與客人的一句叩問（question），提示詞在這裡組好再轉給 DeepSeek，串流回傳。
// 金鑰放在 Worker 機密：npx wrangler secret put DEEPSEEK_API_KEY（不寫進任何檔案）。
// 每日次數：每個人（以 IP 雜湊計）USER_PER_DAY 次、全站 SITE_PER_DAY 次，臺灣時間零點重算，記在 KV（LIMITS）。
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

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map(s => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const ok = allowed.includes(origin);
    const cors = { "Access-Control-Allow-Origin": ok ? origin : allowed[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Expose-Headers": "X-User-Left, X-Site-Left", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (req.method !== "POST" || !ok) return json({ error: "forbidden" }, 403, cors);
    if (!env.DEEPSEEK_API_KEY) return json({ error: "not_configured" }, 500, cors);

    const userMax = +(env.USER_PER_DAY || LIMITS.USER_PER_DAY), siteMax = +(env.SITE_PER_DAY || LIMITS.SITE_PER_DAY);
    const ip = req.headers.get("CF-Connecting-IP") || "local";
    const now = Date.now();
    const recent = (burst.get(ip) || []).filter(t => now - t < 60e3);

    let body;
    try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400, cors); }
    const basis = body && body.basis;
    if (!basis || typeof basis !== "object" || Array.isArray(basis) || JSON.stringify(basis).length > 9000) return json({ error: "bad_request" }, 400, cors);
    const rawQ = typeof body.question === "string" ? body.question : "";
    if ([...rawQ.trim()].length > LIMITS.QUESTION_MAX) return json({ error: "too_long", max: LIMITS.QUESTION_MAX }, 400, cors);
    const question = cleanQuestion(rawQ);

    // 每日次數（KV 沒綁就只靠前端與短時間保護）
    const day = twDay(), userKey = `u:${day}:${await sha(ip + (env.SALT || "wenming"))}`, siteKey = `s:${day}`;
    let userUsed = 0, siteUsed = 0;
    if (env.LIMITS) {
      [userUsed, siteUsed] = (await Promise.all([env.LIMITS.get(userKey), env.LIMITS.get(siteKey)])).map(v => +v || 0);
      if (siteUsed >= siteMax) return json({ error: "site_limit", max: siteMax }, 429, cors);
      if (userUsed >= userMax) return json({ error: "user_limit", max: userMax }, 429, cors);
    }
    if (recent.length >= 3) return json({ error: "too_fast" }, 429, cors);
    recent.push(now); burst.set(ip, recent); if (burst.size > 5000) burst.clear();

    const up = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: env.MODEL || "deepseek-chat", messages: messagesFor(basis, question), stream: true, max_tokens: question ? 420 : 650, temperature: 0.85 }),
    });
    if (!up.ok || !up.body) return json({ error: "upstream", status: up.status }, 502, cors);
    // DeepSeek 有回應才扣次數
    if (env.LIMITS) await Promise.all([env.LIMITS.put(userKey, String(userUsed + 1), { expirationTtl: 172800 }), env.LIMITS.put(siteKey, String(siteUsed + 1), { expirationTtl: 172800 })]);
    return new Response(up.body, { headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-User-Left": String(Math.max(0, userMax - userUsed - 1)), "X-Site-Left": String(Math.max(0, siteMax - siteUsed - 1)) } });
  },
};
