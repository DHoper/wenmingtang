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
function nine(ctx, im, slice, x, y, w, h, b, hollow = false) {
  const W = im.naturalWidth, H = im.naturalHeight, s = slice;
  const sx = [0, s, W - s, W], sy = [0, s, H - s, H];
  const dx = [x, x + b, x + w - b, x + w], dy = [y, y + b, y + h - b, y + h];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (hollow && r === 1 && c === 1) continue;
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
/** 被別的網頁框住（例如 Claude 預覽）時，下載與系統分享都會被擋 */
export const framed = (() => { try { return top !== self; } catch (_) { return true; } })();
export const noDownload = inApp || framed;
export function shareText(R) {
  return `我的名字給廟口先生批了「${R.grade}」：「${R.headline}」。換你，名字拿去給先生看看。`;
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
    const lvText = ({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[g.level] || g.level, lvSize = 26;
    ctx.font = `700 ${lvSize}px ${SONG}`; const lw = ctx.measureText(lvText).width;
    const startX = x + gw / 2 - (tw + 8 + lw) / 2;
    ctx.font = `900 28px ${SONG}`; ctx.fillStyle = bgc; ctx.fillText(g.el, startX + tw / 2, gy + 135);
    ctx.font = `700 ${lvSize}px ${SONG}`; ctx.fillStyle = g.lv >= 1 ? "#2f6b3a" : g.lv <= -1 ? "#a8231a" : "#5a4232";
    ctx.fillText(lvText, startX + tw + 8 + lw / 2, gy + 135);
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

/** 分享卡上的三句重點：本性看人格、出外看外格、晚運看總格，取老先生對那個數的話，前一兩句 */
export function keyLines(R) {
  const LV = { 2: "大吉", 1: "吉", 0.5: "半吉", "-0.5": "半凶", "-1": "凶", "-2": "大凶" };
  const first = t => { const ps = t.split(/(?<=。)/); let o = ps[0]; if ([...o].length < 16 && ps[1]) o += ps[1]; return o; };
  return [["本性", "人格", "ren"], ["出外", "外格", "wai"], ["晚運", "總格", "zong"]].map(([label, grid, k]) => ({ label, grid, n: R.wuge[k].n, lv: R.wuge[k].lv, lvName: LV[R.wuge[k].lv], text: first(R.wuge[k].text) }));
}
export function summaryLine(R) {
  if (R.aiParts && R.aiParts.summary) return R.aiParts.summary;
  const s = R.sections.find(x => x.key === "summary");
  return s ? s.bai.replace(/^總的來講，/, "") : R.headlinePlain;
}
// QR code：qrcode-generator（MIT），用到時才載入
let qrLib = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLib) qrLib = new Promise(res => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; sc.onload = () => res(window.qrcode || null); sc.onerror = () => res(null); document.head.append(sc); setTimeout(() => res(window.qrcode || null), 4000); });
  return qrLib;
}
async function drawQR(ctx, text, x, y, size, color) {
  const qr = await loadQR(); if (!qr) return false;
  const q = qr(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), cell = size / n;
  ctx.fillStyle = color;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(Math.round(x + c * cell), Math.round(y + r * cell), Math.ceil(cell), Math.ceil(cell));
  return true;
}
const CN = "〇一二三四五六七八九";
const cnum = n => n < 10 ? CN[n] : n < 20 ? "十" + (n % 10 ? CN[n % 10] : "") : CN[Math.floor(n / 10)] + "十" + (n % 10 ? CN[n % 10] : "");

/** 明信片（1500×1000 橫式）：左邊廟埕與老先生；右邊名字、評等朱印、批語、三句重點、總結、五格與 QR code */
export async function drawPostcard(R) {
  const W = 1500, H = 1000;
  const pose = R.renameAdvised ? "stern" : "approve";
  const [bg, master, paper, slip, frame, seal, stroke, strokeRed] = await Promise.all([
    "assets/scene/bg.webp", `assets/master/${pose}.webp`, "assets/ui/paper.webp", "assets/ui/slip-frame.webp",
    "assets/ui/red-frame.webp", "assets/props/seal.webp", "assets/ui/stroke.webp", "assets/ui/stroke-red.webp",
  ].map(img));
  const keys = keyLines(R), sum = summaryLine(R);
  await Promise.all([
    document.fonts.load(`900 120px ${SONG}`, R.name + R.grade + "問名堂乾坤造天人地外總格本性出外晚運批先生總說掃一下看你的名字" + keys.map(k => k.lvName).join("")),
    document.fonts.load(`400 40px ${KAI}`, R.headline + keys.map(k => k.text).join("") + sum + "夜裡的廟口把名字交給算命先生掃一下看你的名字"),
  ]).catch(() => {});
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); ctx.textBaseline = "middle"; ctx.textAlign = "left";
  tile(ctx, paper, 0, 0, W, H, 360);
  nine(ctx, slip, 118, 0, 0, W, H, 44);
  // 左：插畫
  const px = 62, py = 62, pw = 470, ph = H - 124;
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  const s = Math.max(pw / bg.naturalWidth, ph / bg.naturalHeight);
  ctx.drawImage(bg, px + (pw - bg.naturalWidth * s) / 2, py - 40, bg.naturalWidth * s, bg.naturalHeight * s);
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, "rgba(10,12,20,0)"); g.addColorStop(.62, "rgba(10,12,20,.1)"); g.addColorStop(1, "rgba(10,12,20,.75)");
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  const mw = pw * 1.18, mh = mw * master.naturalHeight / master.naturalWidth;
  ctx.drawImage(master, px + (pw - mw) / 2, py + ph * .36, mw, mh);
  ctx.restore();
  nine(ctx, frame, 56, px - 10, py - 10, pw + 20, ph + 20, 18, true);
  ctx.shadowColor = "rgba(0,0,0,.85)"; ctx.shadowBlur = 12;
  ctx.font = `900 64px ${SONG}`; ctx.fillStyle = "#f3d48c"; ctx.fillText("問名堂", px + 36, py + ph - 104);
  ctx.font = `400 24px ${KAI}`; ctx.fillStyle = "#f6ead4"; ctx.fillText("夜裡的廟口，把名字交給算命先生", px + 38, py + ph - 58);
  ctx.font = `500 20px ${SANS}`; ctx.fillStyle = "#e8c47a"; ctx.fillText(siteURL().replace(/^https?:\/\//, "").replace(/\/$/, ""), px + 38, py + ph - 24);
  ctx.shadowColor = "transparent";
  // 右上：評等朱印
  const rx = 586, rr = W - 70, rw = rr - rx;
  ctx.save(); ctx.translate(rr - 92, 150); ctx.rotate(-0.1);
  ctx.drawImage(seal, -92, -92, 184, 184);
  ctx.textAlign = "center"; ctx.fillStyle = "#a8231a"; ctx.font = `900 ${R.grade.length > 1 ? 62 : 86}px ${SONG}`;
  if (R.grade.length > 1) { ctx.fillText(R.grade[0], 0, -30); ctx.fillText(R.grade.slice(1), 0, 38); } else ctx.fillText(R.grade, 0, 4);
  ctx.restore();
  // 名字
  const nameStr = [...R.name].join(" "), roomW = rw - 220;
  let fs = 104; ctx.font = `900 ${fs}px ${SONG}`; ctx.fillStyle = "#1c0f08";
  while (ctx.measureText(nameStr).width > roomW && fs > 60) { fs -= 4; ctx.font = `900 ${fs}px ${SONG}`; }
  ctx.fillText(nameStr, rx, 132);
  ctx.font = `400 27px ${KAI}`; ctx.fillStyle = "#6b5443"; ctx.fillText(`${R.gender === "f" ? "坤造" : "乾造"}・問名堂批`, rx + 4, 212);
  // 批語：一行（放不下就兩行）
  ctx.font = `400 40px ${KAI}`; ctx.fillStyle = "#2a1a10";
  const hl = R.headline + "。"; let hlLines = [hl];
  if (ctx.measureText(hl).width > rw - 30) { const parts = R.headline.split("，"); const mid = Math.ceil(parts.length / 2); hlLines = [parts.slice(0, mid).join("，") + "，", parts.slice(mid).join("，") + "。"]; }
  hlLines.forEach((t, i) => ctx.fillText(t, rx + 24, 276 + i * 54));
  ctx.fillStyle = "#a8231a"; ctx.fillRect(rx, 252, 5, hlLines.length * 54 - 6);
  // 三句重點
  let y = 276 + hlLines.length * 54 + 30;
  for (const k of keys) {
    ctx.drawImage(strokeRed, rx, y - 22, rw, 5);
    ctx.font = `900 30px ${SONG}`; ctx.fillStyle = "#a8231a"; ctx.fillText(k.label, rx, y + 14);
    ctx.font = `700 21px ${SONG}`; ctx.fillStyle = "#6b5443"; ctx.fillText(`${k.grid}${cnum(k.n)}・${k.lvName}`, rx, y + 48);
    ctx.font = `400 27px ${KAI}`; ctx.fillStyle = "#24160c";
    wrap(ctx, k.text, rw - 150).slice(0, 2).forEach((t, i) => ctx.fillText(t, rx + 140, y + 14 + i * 38));
    y += 104;
  }
  // 總結
  ctx.drawImage(strokeRed, rx, y - 22, rw, 5);
  ctx.font = `900 26px ${SONG}`; ctx.fillStyle = "#a8231a"; ctx.fillText("先生總說", rx, y + 14);
  ctx.font = `400 25px ${KAI}`; ctx.fillStyle = "#3a2618";
  // 最多三行，而且在句號斷開
  let sumT = sum, sl = wrap(ctx, sumT, rw - 150);
  while (sl.length > 3) { const i = sumT.slice(0, -1).lastIndexOf("。"); if (i < 0) break; sumT = sumT.slice(0, i + 1); sl = wrap(ctx, sumT, rw - 150); }
  sl.slice(0, 3).forEach((t, i) => ctx.fillText(t, rx + 140, y + 14 + i * 36));
  // 底部：五格與 QR
  const by = H - 128;
  ["tian", "ren", "di", "wai", "zong"].forEach((k, i) => {
    const gg = R.wuge[k], x = rx + i * 104;
    ctx.font = `700 20px ${SONG}`; ctx.fillStyle = "#6b5443"; ctx.fillText({ tian: "天格", ren: "人格", di: "地格", wai: "外格", zong: "總格" }[k], x, by);
    ctx.font = `900 36px ${SONG}`; ctx.fillStyle = "#1c0f08"; ctx.fillText(String(gg.n), x, by + 38);
    ctx.font = `700 19px ${SONG}`; ctx.fillStyle = gg.lv >= 1 ? "#2f6b3a" : gg.lv <= -1 ? "#a8231a" : "#5a4232";
    ctx.fillText(({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[gg.level] || gg.level, x, by + 72);
  });
  const qs = 112, qx = rr - qs, qy = H - 62 - qs;
  const ok = await drawQR(ctx, shareLink(R), qx, qy, qs, "#2a1408").catch(() => false);
  ctx.textAlign = "right"; ctx.font = `400 24px ${KAI}`; ctx.fillStyle = "#3a2618";
  if (ok) { ctx.fillText("掃一下，", qx - 18, qy + 40); ctx.fillText("看你的名字", qx - 18, qy + 76); }
  else ctx.fillText("換你，名字拿去給先生看看", rr, qy + 60);
  ctx.textAlign = "left";
  return cv;
}

/** 長圖（1080 寬，高度看內容）：一張從頭寫到尾的批命帖。不放八字那段，免得透露生辰。 */
export async function drawLongCard(R) {
  const W = 1080, M = 76, IW = W - M * 2;
  const pose = R.renameAdvised ? "stern" : "approve";
  const [bg, master, paper, slip, frame, seal, plaque, strokeRed, red] = await Promise.all([
    "assets/scene/bg.webp", `assets/master/${pose}.webp`, "assets/ui/paper.webp", "assets/ui/slip-frame.webp",
    "assets/ui/red-frame.webp", "assets/props/seal.webp", "assets/ui/plaque.webp", "assets/ui/stroke-red.webp", "assets/ui/redpaper-light.webp",
  ].map(img));
  const ai = R.aiParts || {};
  const sec = k => R.sections.find(s => s.key === k);
  const LV = l => ({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[l] || l;
  const capT = (t, max = 230) => { const a = [...String(t || "")]; if (a.length <= max) return a.join(""); const c = a.slice(0, max).join(""), i = c.lastIndexOf("。"); return i > max * .5 ? c.slice(0, i + 1) : c + "……"; };
  const say = k => capT(ai[k] || sec(k)?.bai || "", 360);
  const verse = k => (sec(k)?.pi || []).join("");
  const items = [];
  for (const k of GRID_KEYS) items.push({ label: GRID_INFO[k].label, sub: `${cnum(R.wuge[k].n)}畫・${R.wuge[k].el}・${LV(R.wuge[k].level)}`, verse: verse(k), text: say(k) });
  if (sec("sancai")) items.push({ label: "三才", sub: `${[...R.sancai.key].join("・")}・${R.sancai.level}`, verse: verse("sancai"), text: say("sancai") });
  if (sec("outer")) items.push({ label: "出外與晚運", sub: "", verse: verse("outer"), text: say("outer") });
  if (sec("topic")) items.push({ label: "所問", sub: (sec("topic").title.split("：")[1] || "綜合"), verse: verse("topic"), text: say("topic") });
  if (sec("rename")) items.push({ label: "改名", sub: R.renameAdvised ? "要改" : "不必改", verse: verse("rename"), text: say("rename") });
  const hlPlain = capT(ai.headline || R.headlinePlain, 90), sum = capT(summaryLine(R), 260);
  const allText = R.name + R.grade + R.headline + hlPlain + sum + items.map(x => x.label + x.sub + x.verse + x.text).join("") + "問名堂乾坤造批天人地外總格先生總說掃一下看你的名字夜裡的廟口把名字交給算命先生";
  await Promise.all([document.fonts.load(`900 100px ${SONG}`, allText), document.fonts.load(`400 40px ${KAI}`, allText)]).catch(() => {});
  const link = shareLink(R), urlText = siteURL().replace(/^https?:\/\//, "").replace(/\/$/, "");

  async function render(ctx, H) {
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    tile(ctx, paper, 0, 0, W, H, 360);
    nine(ctx, slip, 118, 0, 0, W, H, 44);
    // 上：廟埕夜景與先生
    const bx = 56, by = 56, bw = W - 112, bh = 620;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    const s = Math.max(bw / bg.naturalWidth, bh / bg.naturalHeight);
    ctx.drawImage(bg, bx + (bw - bg.naturalWidth * s) / 2, by - 30, bg.naturalWidth * s, bg.naturalHeight * s);
    const gd = ctx.createLinearGradient(0, by, 0, by + bh); gd.addColorStop(0, "rgba(10,12,20,.15)"); gd.addColorStop(.7, "rgba(10,12,20,.2)"); gd.addColorStop(1, "rgba(10,12,20,.7)");
    ctx.fillStyle = gd; ctx.fillRect(bx, by, bw, bh);
    const mw = bw * .8, mh = mw * master.naturalHeight / master.naturalWidth;
    ctx.drawImage(master, bx + (bw - mw) / 2, by + 170, mw, mh);
    ctx.restore();
    nine(ctx, frame, 56, bx - 10, by - 10, bw + 20, bh + 20, 18, true);
    const pw = 380, ph = pw * plaque.naturalHeight / plaque.naturalWidth, ppx = (W - pw) / 2, ppy = by + 26;
    shadow(ctx, () => ctx.drawImage(plaque, ppx, ppy, pw, ph));
    ctx.textAlign = "center"; ctx.font = `900 58px ${SONG}`; ctx.fillStyle = "#f3d48c";
    drawSpaced(ctx, "問名堂", W / 2, ppy + ph / 2 + 2, 20);
    ctx.textAlign = "left";
    // 名字與評等朱印
    let y = by + bh + 110;
    const nameStr = [...R.name].join(" ");
    let fs = 118; ctx.font = `900 ${fs}px ${SONG}`;
    while (ctx.measureText(nameStr).width > IW - 250 && fs > 64) { fs -= 4; ctx.font = `900 ${fs}px ${SONG}`; }
    ctx.fillStyle = "#1c0f08"; ctx.fillText(nameStr, M, y);
    ctx.font = `400 30px ${KAI}`; ctx.fillStyle = "#6b5443";
    ctx.fillText(`${R.gender === "f" ? "坤造" : "乾造"}・問名堂批`, M + 4, y + 84);
    ctx.save(); ctx.translate(W - M - 100, y + 30); ctx.rotate(-0.1);
    ctx.drawImage(seal, -100, -100, 200, 200);
    ctx.textAlign = "center"; ctx.fillStyle = "#a8231a"; ctx.font = `900 ${R.grade.length > 1 ? 66 : 92}px ${SONG}`;
    if (R.grade.length > 1) { ctx.fillText(R.grade[0], 0, -32); ctx.fillText(R.grade.slice(1), 0, 40); } else ctx.fillText(R.grade, 0, 4);
    ctx.restore();
    // 批語（直接用朱線帶起）與總評
    y += 170;
    ctx.font = `400 46px ${KAI}`; ctx.fillStyle = "#2a1a10";
    const hl = [];
    R.headline.split("，").forEach((c, i, a) => { const piece = c + (i < a.length - 1 ? "，" : "。"), last = hl[hl.length - 1]; if (last && ctx.measureText(last + piece).width <= IW - 40) hl[hl.length - 1] = last + piece; else hl.push(piece); });
    hl.forEach((t, i) => ctx.fillText(t, M + 30, y + i * 64));
    ctx.fillStyle = "#a8231a"; ctx.fillRect(M, y - 30, 6, hl.length * 64 - 4);
    y += hl.length * 64 + 20;
    ctx.font = `400 33px ${KAI}`; ctx.fillStyle = "#3a2618";
    wrap(ctx, hlPlain, IW).forEach(t => { ctx.fillText(t, M, y); y += 54; });
    // 五格小籤
    y += 30;
    const gh = 176, gap = 16, gw = (IW - gap * 4) / 5;
    GRID_KEYS.forEach((k, i) => {
      const g = R.wuge[k], x = M + i * (gw + gap);
      shadow(ctx, () => tile(ctx, paper, x + 6, y + 6, gw - 12, gh - 12, 300));
      nine(ctx, slip, 118, x, y, gw, gh, 16);
      ctx.textAlign = "center";
      ctx.fillStyle = "#5a4232"; ctx.font = `700 26px ${SONG}`; ctx.fillText(GRID_INFO[k].label, x + gw / 2, y + 36);
      ctx.fillStyle = "#2a1a10"; ctx.font = `900 56px ${SONG}`; ctx.fillText(String(g.n), x + gw / 2, y + 88);
      ctx.font = `900 27px ${SONG}`; ctx.fillStyle = EL_COLOR[g.el][0]; ctx.fillText(g.el, x + gw / 2 - 30, y + 140);
      ctx.font = `700 25px ${SONG}`; ctx.fillStyle = g.lv >= 1 ? "#2f6b3a" : g.lv <= -1 ? "#a8231a" : "#5a4232"; ctx.fillText(LV(g.level), x + gw / 2 + 18, y + 140);
      ctx.textAlign = "left";
    });
    y += gh + 70;
    // 先生逐段講
    for (const it of items) {
      if (!it.text) continue;
      ctx.drawImage(strokeRed, M, y - 34, IW, 6);
      ctx.font = `900 38px ${SONG}`; ctx.fillStyle = "#a8231a"; ctx.fillText(it.label, M, y + 18);
      const lw = ctx.measureText(it.label).width;
      if (it.sub) { ctx.font = `700 25px ${SONG}`; ctx.fillStyle = "#6b5443"; ctx.fillText(it.sub, M + lw + 22, y + 22); }
      y += 78;
      if (it.verse) {
        ctx.font = `400 34px ${KAI}`; ctx.fillStyle = "#8a2a1e";
        const vl = wrap(ctx, it.verse, IW - 34);
        ctx.fillStyle = "rgba(168,35,26,.55)"; ctx.fillRect(M, y - 24, 4, vl.length * 52 - 4);
        ctx.fillStyle = "#8a2a1e"; vl.forEach(t => { ctx.fillText(t, M + 24, y); y += 52; });
        y += 14;
      }
      ctx.font = `400 32px ${KAI}`; ctx.fillStyle = "#24160c";
      wrap(ctx, it.text, IW).forEach(t => { ctx.fillText(t, M, y); y += 54; });
      y += 46;
    }
    // 先生總說：紅紙
    ctx.font = `400 34px ${KAI}`;
    const sl = wrap(ctx, sum, IW - 110), rh = 130 + sl.length * 56;
    shadow(ctx, () => tile(ctx, red, M + 10, y + 10, IW - 20, rh - 20, 300));
    nine(ctx, frame, 56, M, y, IW, rh, 22);
    ctx.textAlign = "center"; ctx.font = `900 36px ${SONG}`; ctx.fillStyle = "#ffe3a3";
    drawSpaced(ctx, "先生總說", W / 2, y + 62, 10);
    ctx.font = `400 34px ${KAI}`; ctx.fillStyle = "#fff3dc";
    sl.forEach((t, i) => ctx.fillText(t, W / 2, y + 122 + i * 56));
    ctx.textAlign = "left";
    y += rh + 70;
    // 頁尾：QR code 與網址
    const qs = 190, qx = W - M - qs;
    const ok = await drawQR(ctx, link, qx, y, qs, "#2a1408").catch(() => false);
    ctx.font = `900 42px ${SONG}`; ctx.fillStyle = "#a8231a"; ctx.fillText(ok ? "掃一下，看你的名字" : "換你，名字拿去給先生看看", M, y + 50);
    ctx.font = `400 30px ${KAI}`; ctx.fillStyle = "#3a2618"; ctx.fillText("夜裡的廟口，把名字交給算命先生。", M, y + 110);
    ctx.font = `500 24px ${SANS}`; ctx.fillStyle = "#87622c"; ctx.fillText(urlText, M, y + 160);
    return y + qs + 86;
  }
  const probe = document.createElement("canvas"); probe.width = W; probe.height = 1;
  const H = Math.ceil(await render(probe.getContext("2d"), 12000));
  probe.width = 0;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  await render(cv.getContext("2d"), H);
  return cv;
}

/** 連結預覽卡（1200×630，LINE、臉書、Threads 的標準比例）：朋友收到連結時看到的就是這張 */
export async function drawOgCard(R) {
  const W = 1200, H = 630;
  const pose = R.renameAdvised ? "stern" : "approve";
  const [bg, master, paper, slip, frame, seal] = await Promise.all([
    "assets/scene/bg.webp", `assets/master/${pose}.webp`, "assets/ui/paper.webp", "assets/ui/slip-frame.webp", "assets/ui/red-frame.webp", "assets/props/seal.webp",
  ].map(img));
  const plain = (R.aiParts && R.aiParts.headline) || R.headlinePlain;
  const txt = R.name + R.grade + R.headline + plain + "問名堂乾坤造批天人地外總格木火土金水大吉凶半夜裡的廟口把名字交給算命先生";
  await Promise.all([document.fonts.load(`900 100px ${SONG}`, txt), document.fonts.load(`400 40px ${KAI}`, txt)]).catch(() => {});
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"); ctx.textBaseline = "middle"; ctx.textAlign = "left";
  tile(ctx, paper, 0, 0, W, H, 360);
  nine(ctx, slip, 118, 0, 0, W, H, 36);
  // 左：廟埕與先生
  const px = 48, py = 48, pw = 380, ph = H - 96;
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  const s = Math.max(pw / bg.naturalWidth, ph / bg.naturalHeight);
  ctx.drawImage(bg, px + (pw - bg.naturalWidth * s) / 2, py - 20, bg.naturalWidth * s, bg.naturalHeight * s);
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, "rgba(10,12,20,0)"); g.addColorStop(.6, "rgba(10,12,20,.1)"); g.addColorStop(1, "rgba(10,12,20,.8)");
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  const mw = pw * 1.25, mh = mw * master.naturalHeight / master.naturalWidth;
  ctx.drawImage(master, px + (pw - mw) / 2, py + ph * .2, mw, mh);
  ctx.restore();
  nine(ctx, frame, 56, px - 8, py - 8, pw + 16, ph + 16, 16, true);
  ctx.shadowColor = "rgba(0,0,0,.85)"; ctx.shadowBlur = 10;
  ctx.font = `900 56px ${SONG}`; ctx.fillStyle = "#f3d48c"; ctx.fillText("問名堂", px + 28, py + ph - 74);
  ctx.font = `400 22px ${KAI}`; ctx.fillStyle = "#f6ead4"; ctx.fillText("夜裡的廟口，把名字交給算命先生", px + 30, py + ph - 30);
  ctx.shadowColor = "transparent";
  // 右：名字、評等朱印
  const rx = 470, rr = W - 56, rw = rr - rx;
  ctx.save(); ctx.translate(rr - 84, 132); ctx.rotate(-0.1);
  ctx.drawImage(seal, -84, -84, 168, 168);
  ctx.textAlign = "center"; ctx.fillStyle = "#a8231a"; ctx.font = `900 ${R.grade.length > 1 ? 56 : 80}px ${SONG}`;
  if (R.grade.length > 1) { ctx.fillText(R.grade[0], 0, -27); ctx.fillText(R.grade.slice(1), 0, 34); } else ctx.fillText(R.grade, 0, 4);
  ctx.restore();
  const nameStr = [...R.name].join(" ");
  let fs = 100; ctx.font = `900 ${fs}px ${SONG}`;
  while (ctx.measureText(nameStr).width > rw - 200 && fs > 56) { fs -= 4; ctx.font = `900 ${fs}px ${SONG}`; }
  ctx.fillStyle = "#1c0f08"; ctx.fillText(nameStr, rx, 118);
  ctx.font = `400 26px ${KAI}`; ctx.fillStyle = "#6b5443"; ctx.fillText(`${R.gender === "f" ? "坤造" : "乾造"}・問名堂批`, rx + 4, 190);
  // 批語與先生一句
  ctx.font = `400 36px ${KAI}`; ctx.fillStyle = "#2a1a10";
  const hl = []; R.headline.split("，").forEach((c, i, a) => { const piece = c + (i < a.length - 1 ? "，" : "。"), last = hl[hl.length - 1]; if (last && ctx.measureText(last + piece).width <= rw - 30) hl[hl.length - 1] = last + piece; else hl.push(piece); });
  hl.slice(0, 2).forEach((t, i) => ctx.fillText(t, rx + 22, 254 + i * 50));
  ctx.fillStyle = "#a8231a"; ctx.fillRect(rx, 230, 5, Math.min(2, hl.length) * 50 - 4);
  let y = 254 + Math.min(2, hl.length) * 50 + 14;
  ctx.font = `400 25px ${KAI}`; ctx.fillStyle = "#3a2618";
  let pl = wrap(ctx, plain, rw), pt = plain;
  while (pl.length > 2) { const i = pt.slice(0, -1).lastIndexOf("。"); if (i < 0) { pl = pl.slice(0, 2); pl[1] = pl[1].slice(0, -1) + "……"; break; } pt = pt.slice(0, i + 1); pl = wrap(ctx, pt, rw); }
  pl.forEach(t => { ctx.fillText(t, rx, y); y += 38; });
  // 先生總說：空間夠才放，一兩句，在句號斷
  const gy = H - 48 - 128, gap = 12, gw = (rw - gap * 4) / 5, gh = 128;
  ctx.font = `400 25px ${KAI}`;
  let st = summaryLine(R), sl = wrap(ctx, "先生說：" + st, rw);
  const room = Math.floor((gy - 22 - (y + 8)) / 38);
  while (sl.length > room && st.slice(0, -1).lastIndexOf("。") > 0) { st = st.slice(0, st.slice(0, -1).lastIndexOf("。") + 1); sl = wrap(ctx, "先生說：" + st, rw); }
  if (room > 0 && sl.length <= room) { y += 8; ctx.fillStyle = "#8a2a1e"; sl.forEach(t => { ctx.fillText(t, rx, y); y += 38; }); }
  // 五格小籤
  GRID_KEYS.forEach((k, i) => {
    const gg = R.wuge[k], x = rx + i * (gw + gap);
    nine(ctx, slip, 118, x, gy, gw, gh, 12);
    ctx.textAlign = "center";
    ctx.fillStyle = "#5a4232"; ctx.font = `700 21px ${SONG}`; ctx.fillText(GRID_INFO[k].label, x + gw / 2, gy + 28);
    ctx.fillStyle = "#1c0f08"; ctx.font = `900 42px ${SONG}`; ctx.fillText(String(gg.n), x + gw / 2, gy + 66);
    ctx.font = `900 21px ${SONG}`; ctx.fillStyle = EL_COLOR[gg.el][0]; ctx.fillText(gg.el, x + gw / 2 - 22, gy + 103);
    ctx.font = `700 20px ${SONG}`; ctx.fillStyle = gg.lv >= 1 ? "#2f6b3a" : gg.lv <= -1 ? "#a8231a" : "#5a4232";
    ctx.fillText(({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[gg.level] || gg.level, x + gw / 2 + 14, gy + 103);
    ctx.textAlign = "left";
  });
  return cv;
}

/** 把預覽卡存到 Worker，換一個帶著這張圖的專屬連結；失敗就回 null（改用一般連結）。同一張只傳一次。 */
const cardLinks = new Map();
export function uploadCard(R, cv) {
  const key = [R.name, R.surname.length, R.gender, R.topic, R.grade, R.bazi ? 1 : 0, (R.aiParts && R.aiParts.headline) || ""].join("|");
  if (!cardLinks.has(key)) {
    const p = (async () => {
      if (!CONFIG.AI_ENDPOINT || framed) return null;
      let q = .86, blob = await new Promise(r => cv.toBlob(r, "image/jpeg", q));
      while (blob && blob.size > 420 * 1024 && q > .5) { q -= .1; blob = await new Promise(r => cv.toBlob(r, "image/jpeg", q)); }
      if (!blob) return null;
      const qs = new URLSearchParams({ t: `${R.name}的名字，先生批【${R.grade}】｜問名堂`, d: `「${R.headline}」換你，名字拿去給先生看看。`, u: shareLink(R).replace(/r\/\d\.html#/, "#") });
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
      try {
        const res = await fetch(CONFIG.AI_ENDPOINT.replace(/\/$/, "") + "/card?" + qs, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob, signal: ctl.signal });
        if (!res.ok) return null;
        const j = await res.json();
        return j && j.url ? j.url : null;
      } catch (_) { return null; } finally { clearTimeout(timer); }
    })();
    cardLinks.set(key, p);
    p.then(u => { if (!u) cardLinks.delete(key); });
  }
  return cardLinks.get(key);
}
