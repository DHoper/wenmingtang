// 分享：批命紅紙圖（canvas 用網站的素材畫）、分享連結、分享面板
// 分享圖與分享連結都不放生辰；連結只帶名字、乾坤、所問與評等。
import { CONFIG } from "./config.js";
import { GRID_INFO, GRID_KEYS } from "./engine/analyze.js";
import { han } from "./engine/reading.js";

const SONG = '"Noto Serif TC", "PMingLiU", serif';
const KAI = '"WM Kai", "LXGW WenKai TC", "BiauKai", serif';
const SANS = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';
const EL_COLOR = { 木: ["#2f5d3a", "#e8f4e2"], 火: ["#a8231a", "#ffe6d8"], 土: ["#87622c", "#fbeed4"], 金: ["#8d7f62", "#fffaf0"], 水: ["#23415e", "#dbe9f6"] };

const imgCache = new Map();
function img(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgCache.get(src);
}

/** 九宮格：像 CSS border-image（含 fill），slice 是原圖切線，b 是畫出來的邊寬 */
function nine(ctx, im, slice, x, y, w, h, b) {
  const W = im.naturalWidth, H = im.naturalHeight, s = slice;
  const sx = [0, s, W - s, W], sy = [0, s, H - s, H];
  const dx = [x, x + b, x + w - b, x + w], dy = [y, y + b, y + h - b, y + h];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const sw = sx[c + 1] - sx[c], sh = sy[r + 1] - sy[r], dw = dx[c + 1] - dx[c], dh = dy[r + 1] - dy[r];
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) ctx.drawImage(im, sx[c], sy[r], sw, sh, dx[c], dy[r], dw, dh);
  }
}
function tile(ctx, im, x, y, w, h, size) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let ty = y; ty < y + h; ty += size) for (let tx = x; tx < x + w; tx += size) ctx.drawImage(im, tx, ty, size, size);
  ctx.restore();
}
/** 中文逐字換行，回傳行陣列 */
function wrap(ctx, text, maxW) {
  const lines = []; let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      // 標點不放行首
      if ("，。、；：！？」』）".includes(ch)) { line += ch; continue; }
      lines.push(line); line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

export function siteURL() {
  return CONFIG.SITE_URL || (location.origin + location.pathname);
}
/** 分享連結：朋友打開會看到這張批命的摘要與「我也要看」 */
export const GRADES = ["上上", "上", "中", "中下", "下"];
export function shareLink(R) {
  const q = new URLSearchParams({ n: R.name, g: R.gender, s: String(R.surname.length), gr: R.grade, sc: String(R.score) });
  if (R.topic && R.topic !== "all") q.set("t", R.topic);
  if (R.bazi) q.set("b", "1");
  // r/1.html～r/5.html 各有自己的預覽圖（上上～下）；名字放在 # 後面
  return siteURL().replace(/[^/]*$/, "") + `r/${GRADES.indexOf(R.grade) + 1}.html#` + q.toString();
}
/** App 內瀏覽器（LINE、IG、FB）會擋下載 */
export const inApp = /Line\/|Instagram|FBAN|FBAV/i.test(navigator.userAgent);
export function shareText(R) {
  return `我的名字給廟口先生批到【${R.grade}】${R.score}分：「${R.headline}」。換你，名字拿去給先生看看。`;
}

/** 畫批命紅紙分享圖，回傳 canvas（1080×1350） */
export async function drawCard(R, story = false) {
  const W = 1080, H = story ? 1920 : 1350, oy = (H - 1350) / 2;
  const [bg, plaque, frame, red, paper, slip, seal] = await Promise.all([
    "assets/scene/bg.webp", "assets/ui/plaque.webp", "assets/ui/red-frame.webp", "assets/ui/redpaper-light.webp",
    "assets/ui/paper.webp", "assets/ui/slip-frame.webp", "assets/props/seal.webp",
  ].map(img));
  const nameChars = [...R.name];
  await Promise.all([
    document.fonts.load(`900 120px ${SONG}`, R.name + R.grade + "問名堂分"),
    document.fonts.load(`700 40px ${SONG}`, "天格人格地格外格總格"),
    document.fonts.load(`400 40px ${KAI}`, R.headline + R.headlinePlain + "廟口算命攤看名字"),
    document.fonts.load(`700 30px ${SANS}`, "木火土金水吉凶大半多於"),
  ]).catch(() => {});

  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // 背景：廟埕夜景，壓暗
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
  ctx.drawImage(bg, (W - bg.naturalWidth * s) / 2, 0, bg.naturalWidth * s, bg.naturalHeight * s);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "rgba(8,10,18,.35)"); gr.addColorStop(.3, "rgba(8,10,18,.55)"); gr.addColorStop(1, "rgba(8,10,18,.88)");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.translate(0, oy);

  // 匾額
  const pw = 420, ph = pw * plaque.naturalHeight / plaque.naturalWidth, px = (W - pw) / 2, py = 44;
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.drawImage(plaque, px, py, pw, ph);
  ctx.shadowColor = "transparent";
  ctx.font = `900 64px ${SONG}`; ctx.fillStyle = "#f3d48c";
  drawSpaced(ctx, "問名堂", W / 2, py + ph / 2 + 2, 22);

  // 左：名字紅紙（直式，一字一行）
  const lx = 64, ly = 250, lw = 190, lh = 760;
  shadow(ctx, () => { tile(ctx, red, lx, ly, lw, lh, 260); });
  nine(ctx, frame, 56, lx, ly, lw, lh, 18);
  tile(ctx, red, lx + 14, ly + 14, lw - 28, lh - 28, 260);
  const n = nameChars.length, fs = n >= 5 ? 112 : n === 4 ? 130 : 150, lineH = fs * 1.12;
  ctx.font = `900 ${fs}px ${SONG}`; ctx.fillStyle = "#170905";
  const top = ly + lh / 2 - (lineH * n) / 2 - 20;
  nameChars.forEach((c, i) => ctx.fillText(c, lx + lw / 2, top + lineH * (i + .5)));
  // 朱印：印框素材＋程式寫字，蓋在紅紙右下
  ctx.save(); ctx.translate(lx + lw - 58, ly + lh - 78); ctx.rotate(-0.14);
  ctx.fillStyle = "rgba(255,236,214,.88)"; ctx.fillRect(-40, -40, 80, 80);
  ctx.drawImage(seal, -48, -48, 96, 96);
  ctx.font = `900 30px ${SONG}`; ctx.fillStyle = "#b01e14";
  ctx.fillText("問", 0, -16); ctx.fillText("名", 0, 18); ctx.restore();

  // 右：評等紅紙
  const rx = 290, ry = 250, rw = 726, rh = 760;
  shadow(ctx, () => nine(ctx, frame, 56, rx, ry, rw, rh, 34));
  ctx.fillStyle = "#ffe6d2"; ctx.font = `700 34px ${SONG}`;
  ctx.fillText(R.gender === "f" ? "坤造" : "乾造", rx + rw / 2, ry + 82);
  ctx.font = `900 ${R.grade.length > 1 ? 230 : 260}px ${SONG}`; ctx.fillStyle = "#ffe3a3";
  ctx.shadowColor = "rgba(70,0,0,.75)"; ctx.shadowOffsetY = 6; ctx.shadowBlur = 0;
  drawSpaced(ctx, R.grade, rx + rw / 2, ry + 260, 20);
  ctx.shadowColor = "transparent"; ctx.shadowOffsetY = 0;
  ctx.font = `700 40px ${SONG}`; ctx.fillStyle = "#ffe6d2";
  drawSpaced(ctx, han(R.score) + "分", rx + rw / 2, ry + 418, 10);
  // 批語（文言）與白話一句：依實際行數往下排，不超出紅紙
  ctx.font = `400 52px ${KAI}`; ctx.fillStyle = "#fff3dc";
  // 依逗號斷句，能併就併，不在詞中間斷行
  const hl = [];
  R.headline.split("，").forEach((c, i, a) => {
    const piece = c + (i < a.length - 1 ? "，" : "。"), last = hl[hl.length - 1];
    if (last && ctx.measureText(last + piece).width <= rw - 130) hl[hl.length - 1] = last + piece; else hl.push(piece);
  });
  let ty = ry + 492;
  hl.forEach(t => { ctx.fillText(t, rx + rw / 2, ty); ty += 68; });
  ctx.font = `400 31px ${KAI}`; ctx.fillStyle = "rgba(255,240,228,.92)";
  const room = Math.max(0, Math.floor((ry + rh - 58 - (ty + 4)) / 44) + 1);
  wrap(ctx, R.headlinePlain, rw - 150).slice(0, Math.min(2, room)).forEach(t => { ctx.fillText(t, rx + rw / 2, ty + 4); ty += 44; });

  // 五格小籤
  const gy = 1050, gh = 170, gap = 16, gw = (W - 64 * 2 - gap * 4) / 5;
  GRID_KEYS.forEach((k, i) => {
    const g = R.wuge[k], x = 64 + i * (gw + gap);
    shadow(ctx, () => tile(ctx, paper, x + 6, gy + 6, gw - 12, gh - 12, 300));
    nine(ctx, slip, 118, x, gy, gw, gh, 16);
    ctx.fillStyle = "#5a4232"; ctx.font = `700 26px ${SONG}`; ctx.fillText(GRID_INFO[k].label, x + gw / 2, gy + 34);
    ctx.fillStyle = "#2a1a10"; ctx.font = `900 56px ${SONG}`; ctx.fillText(String(g.n), x + gw / 2, gy + 84);
    const [bgc, fgc] = EL_COLOR[g.el];
    ctx.font = `700 24px ${SANS}`; const tw = ctx.measureText(g.el).width + 18;
    const lvSize = g.level.length > 2 ? 21 : 26;
    ctx.font = `700 ${lvSize}px ${SONG}`; const lw = ctx.measureText(g.level).width;
    const startX = x + gw / 2 - (tw + 8 + lw) / 2;
    ctx.fillStyle = bgc; ctx.fillRect(startX, gy + 118, tw, 32);
    ctx.font = `700 24px ${SANS}`; ctx.fillStyle = fgc; ctx.fillText(g.el, startX + tw / 2, gy + 135);
    ctx.font = `700 ${lvSize}px ${SONG}`; ctx.fillStyle = g.lv >= 1 ? "#2f6b3a" : g.lv <= -1 ? "#a8231a" : "#5a4232";
    ctx.fillText(g.level, startX + tw + 8 + lw / 2, gy + 135);
  });
  // 頁尾
  ctx.font = `400 30px ${KAI}`; ctx.fillStyle = "rgba(246,234,212,.85)";
  ctx.fillText("夜裡的廟口，把名字交給算命先生。你的名字呢？", W / 2, 1268);
  ctx.font = `500 24px ${SANS}`; ctx.fillStyle = "rgba(232,196,122,.9)";
  ctx.fillText(siteURL().replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 1310);
  return cv;
}
function shadow(ctx, fn) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12; fn(); ctx.restore(); }
function drawSpaced(ctx, text, cx, cy, sp) {
  const chars = [...text], ws = chars.map(c => ctx.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((c, i) => { ctx.fillText(c, x + ws[i] / 2, cy); x += ws[i] + sp; });
}

export function cardBlob(cv) { return new Promise(r => cv.toBlob(r, "image/png")); }
