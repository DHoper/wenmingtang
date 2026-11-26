// 問名堂特效：香煙與火星粒子、燈火搖曳、老師傅換表情淡入、對話逐字出現、操作區內容依序浮起。
// 系統開啟「減少動態」時，粒子與逐字效果全部關閉。
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ───────── 粒子（畫在舞台畫布座標裡，跟著舞台一起縮放） ─────────
export function particles(cv, getMode) {
  if (reduced || !cv.getContext) return;
  const g = cv.getContext("2d", { alpha: true });
  // 手機效能較弱時少放一點
  const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  // 預先畫好煙與火星的小圖，每一格畫面只貼圖，不重算漸層
  const sprite = (r, stops) => { const c = document.createElement("canvas"); c.width = c.height = r * 2; const x = c.getContext("2d"); const grd = x.createRadialGradient(r, r, 0, r, r, r); stops.forEach(([o, col]) => grd.addColorStop(o, col)); x.fillStyle = grd; x.fillRect(0, 0, r * 2, r * 2); return c; };
  const SMOKE = sprite(32, [[0, "rgba(222,214,204,1)"], [1, "rgba(222,214,204,0)"]]);
  const EMBER = sprite(8, [[0, "rgba(255,220,150,1)"], [0.35, "rgba(255,150,70,.55)"], [1, "rgba(255,120,40,0)"]]);
  let W = 0, H = 0, mode = "";
  const smoke = [], embers = [];
  const SRC = { port: [[56, 404], [70, 410]], land: [[120, 330], [136, 334]] };
  const NE = low ? 7 : 12, GAP = low ? 0.34 : 0.22;
  function resize() {
    mode = getMode();
    const cw = mode === "land" ? 512 : 384, ch = mode === "land" ? 512 : 688;
    if (cw === W && ch === H) return;
    W = cw; H = ch; cv.width = W; cv.height = H; cv.style.width = W + "px"; cv.style.height = H + "px";
    embers.length = 0;
    for (let i = 0; i < NE; i++) embers.push(newEmber(true));
  }
  function newEmber(anywhere) {
    return { x: Math.random() * W, y: anywhere ? Math.random() * H * 0.75 : H * (0.55 + Math.random() * 0.2), vy: -(4 + Math.random() * 8), vx: (Math.random() - 0.5) * 4, r: 0.8 + Math.random() * 1.4, ph: Math.random() * 6.28, life: 6 + Math.random() * 8, t: 0 };
  }
  let last = performance.now(), acc = 0, skip = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = ts; return; }
    if ((skip = (skip + 1) % 2)) return;          // 30fps 就夠
    const dt = Math.min(0.08, (ts - last) / 1000); last = ts;
    resize();
    g.clearRect(0, 0, W, H);
    acc += dt;
    if (acc > GAP) {
      acc = 0;
      const [sx, sy] = SRC[mode][Math.random() < 0.5 ? 0 : 1];
      smoke.push({ x: sx, y: sy, t: 0, life: 7 + Math.random() * 3, seed: Math.random() * 6.28, r0: 4 + Math.random() * 3 });
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]; p.t += dt;
      const k = p.t / p.life; if (k >= 1) { smoke.splice(i, 1); continue; }
      const x = p.x + Math.sin(p.seed + p.t * 0.7) * (6 + k * 26) + k * 30, y = p.y - p.t * 24, r = p.r0 + k * 34;
      g.globalAlpha = 0.11 * Math.sin(Math.PI * k);
      g.drawImage(SMOKE, x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < embers.length; i++) {
      const e = embers[i]; e.t += dt;
      if (e.t > e.life || e.y < -10) { embers[i] = newEmber(false); continue; }
      e.x += (e.vx + Math.sin(e.ph + e.t * 1.3) * 3) * dt; e.y += e.vy * dt;
      const fl = 0.55 + 0.45 * Math.sin(e.ph + e.t * 5), fade = Math.min(1, e.t / 1.2, (e.life - e.t) / 1.5);
      g.globalAlpha = 0.75 * fl * fade;
      const r = e.r * 4; g.drawImage(EMBER, e.x - r, e.y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
}

// ───────── 老師傅換表情：新圖疊上淡入，再移走舊圖 ─────────
export function crossfade(holder, src) {
  const cur = holder.querySelector("img:last-of-type");
  if (cur && cur.getAttribute("src") === src) return;
  if (!cur || reduced) { if (cur) cur.src = src; return; }
  const img = new Image(); img.src = src; img.alt = ""; img.className = "fade-in";
  const done = () => { holder.querySelectorAll("img").forEach(x => { if (x !== img) x.remove(); }); img.classList.remove("fade-in"); };
  img.onload = () => { cur.parentNode.append(img); img.addEventListener("animationend", done, { once: true }); setTimeout(done, 600); };
}

// ───────── 逐字出現（保留 <span class="q"> 這類標記） ─────────
const typing = new WeakMap();
export function typeHTML(el, html, { speed = 34, onDone } = {}) {
  typing.get(el)?.cancel();
  el.innerHTML = html;
  if (reduced || !html) { onDone?.(); return; }
  // 每段文字拆成「已寫」與「未寫（透明）」兩段，版面一開始就是最終大小，打字時不會跳
  const parts = [], walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType !== 3) return walk(c);
    const s1 = document.createElement("span"), s2 = document.createElement("span");
    s2.className = "tw-rest"; s2.textContent = c.nodeValue;
    c.replaceWith(s1, s2); parts.push([s1, s2]);
  });
  walk(el);
  let i = 0, stop = false;
  const tick = () => {
    if (stop) return;
    while (i < parts.length && !parts[i][1].textContent) i++;
    if (i >= parts.length) { onDone?.(); return; }
    const [a, b] = parts[i], ch = b.textContent[0];
    a.textContent += ch; b.textContent = b.textContent.slice(1);
    setTimeout(tick, "，。？！、".includes(ch) ? speed * 5 : speed);
  };
  typing.set(el, { cancel() { stop = true; parts.forEach(([a, b]) => { a.textContent += b.textContent; b.textContent = ""; }); } });
  tick();
}
export function finishTyping(el) { typing.get(el)?.cancel(); }

// ───────── 操作區換內容時，子元素依序浮起 ─────────
export function riseOnChange(box) {
  new MutationObserver(() => {
    if (reduced) return;
    [...box.children].forEach((c, i) => {
      c.style.setProperty("--i", Math.min(i, 8));
      c.classList.remove("rise"); void c.offsetWidth; c.classList.add("rise");
      c.addEventListener("animationend", e => { if (e.target === c) c.classList.remove("rise"); }, { once: true });
    });
  }).observe(box, { childList: true });
}

// ───────── 小工具 ─────────
export function pulse(el, cls, ms = 700) {
  if (!el || reduced) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
