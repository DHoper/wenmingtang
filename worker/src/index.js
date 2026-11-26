// 問名堂「請先生細說」中繼站（Cloudflare Worker）
// 網頁只送「批命依據」（basis），提示詞在這裡組好再轉給 DeepSeek，串流回傳。
// 金鑰放在 Worker 機密：npx wrangler secret put DEEPSEEK_API_KEY（不寫進任何檔案）。
import { messagesFor } from "../../site/js/ai-prompt.js";

const DEFAULT_ORIGINS = "https://dhoper.github.io,http://127.0.0.1:8765,http://localhost:8765";
const hits = new Map(); // 每個 isolate 各自計數，盡力而為的限流

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map(s => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const ok = allowed.includes(origin);
    const cors = { "Access-Control-Allow-Origin": ok ? origin : allowed[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (req.method !== "POST" || !ok) return json({ error: "forbidden" }, 403, cors);
    if (!env.DEEPSEEK_API_KEY) return json({ error: "not_configured" }, 500, cors);

    // 限流：同一個 IP 十分鐘內最多 RATE_MAX 次
    const ip = req.headers.get("CF-Connecting-IP") || "local";
    const now = Date.now(), win = 10 * 60e3, max = +(env.RATE_MAX || 12);
    const list = (hits.get(ip) || []).filter(t => now - t < win);
    if (list.length >= max) return json({ error: "rate_limited" }, 429, cors);
    list.push(now); hits.set(ip, list);
    if (hits.size > 5000) hits.clear();

    let body;
    try { body = await req.json(); } catch (_) { return json({ error: "bad_json" }, 400, cors); }
    const basis = body && body.basis;
    if (!basis || typeof basis !== "object" || Array.isArray(basis) || JSON.stringify(basis).length > 8000) return json({ error: "bad_request" }, 400, cors);

    const up = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: env.MODEL || "deepseek-chat", messages: messagesFor(basis), stream: true, max_tokens: 1000, temperature: 0.9 }),
    });
    if (!up.ok || !up.body) return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502, cors);
    return new Response(up.body, { headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" } });
  },
};
