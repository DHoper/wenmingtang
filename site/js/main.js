// 問名堂：介面流程（手機優先；插畫舞台＋底部木桌操作區）
// 手機版原則：一個畫面只有一個朱漆主按鈕；回上一步一律用頂列的「返」牌；
// 舞台固定構圖（桌布上緣對齊操作區，頭頂一定露出）；批命、擬名、對照改成頂部頭像窗框，不再裁切舞台。
import { initChars, initNames, initGivenNames, kangxi, tradOptions, toTrad } from "./engine/chars.js";
import { splitName } from "./engine/wuge.js";
import { computeBazi, ZHI } from "./engine/bazi.js";
import { reading, han } from "./engine/reading.js";
import { evaluate, GRID_INFO, GRID_KEYS } from "./engine/analyze.js";
import { suggestNames } from "./engine/rename.js";
import { PLACES, TOPICS, COMPOUND, AMBIGUOUS } from "./data/misc.js";
import { slot, preload } from "./assets.js";
import { aiAvailable, aiAsk, askLeft, LIMITS, aiReadingFull, readingsLeft, readingKey, cachedReading, readingPending } from "./ai.js";
import { READING_TAGS } from "./ai-prompt.js";
import { sfx, soundOn, setSound } from "./sfx.js";
import { particles, crossfade, typeHTML, riseOnChange, pulse, reduced } from "./fx.js";
import { drawCard, drawLongCard, drawOgCard, uploadCard, cardBlob, shareLink, shareText, noDownload, framed, keyLines, summaryLine, GRADES } from "./share.js";
{
const $ = s => document.querySelector(s);
const app = $("#app"), say = $("#say"), act = $("#act"), sheet = $("#sheet"), paper = $("#paper"), paperText = $("#paperText"), canvas = $("#canvas"), viewport = $("#viewport");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// 斷句：一個子句不拆開（批語、標題用）；白話裡的「象名」不拆開
const clauses = t => esc(t).split(/(?<=[，；。、\uFF01？　])/).filter(Boolean).map(c => `<span class="cl">${c}</span>`).join("");
const prose = t => esc(t).replace(/「[^」]{1,8}」/g, m => `<span class="nw">${m}</span>`);
const gtxt = g => g === "f" ? "坤造" : "乾造";
// 一百以上的中文數字（民國年用）
const num = n => n === 0 ? "零" : n < 100 ? han(n) : "一百" + (n % 100 === 0 ? "" : n % 100 < 10 ? "零" + han(n % 100) : han(n % 100).replace(/^十/, "一十"));
let fast = false;
const sleep = ms => new Promise(r => setTimeout(r, fast ? Math.min(ms, 30) : ms));
const load = f => fetch("js/data/" + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("wenming:" + k)) ?? d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("wenming:" + k, JSON.stringify(v)); } catch (_) {} },
};
const S = { mode: "read", chars: [], surnameLen: null, gender: null, birth: null, bazi: null, topic: "all", R: null, view: store.get("view", "both"), pose: "speak", back: null };
const ready = initChars(load);
let L = null;

// ───────── 舞台：素材插槽與縮放 ─────────
$("#slotBrush").innerHTML = slot("props/brush");
$("#slotToken").innerHTML = slot("props/token");
$("#slotTable").innerHTML = slot("props/table");
preload(["master/count", "master/approve", "master/stern"]);
function pose(p) {
  S.pose = p === "write" ? "count" : p;
  const holder = $("#slotMaster .slot"), src = `assets/master/${S.pose}.webp`;
  if (holder) crossfade(holder, src);
  else $("#slotMaster").innerHTML = slot("master/" + S.pose);
}
pose("speak");

function sheetTopNow() { return viewport.clientHeight - (parseFloat(app.style.getPropertyValue("--kb")) || 0) - sheet.offsetHeight; }
const isRead = () => /^(reading|rename|compare)$/.test(app.dataset.phase);
let paperH = 262;
function layout() {
  const land = innerWidth >= 900 && innerWidth / innerHeight > 1.05;
  app.dataset.orient = land ? "land" : "port";
  const key = land ? "scene/bg-wide" : "scene/bg";
  if ($("#slotBg").dataset.k !== key) { $("#slotBg").innerHTML = slot(key); $("#slotBg").dataset.k = key; }
  const W = viewport.clientWidth, H = viewport.clientHeight;
  const cw = land ? 512 : 384, ch = land ? 512 : 688;
  let s, x, y;
  if (land) {
    s = Math.max(W / cw, H / ch); x = (W - cw * s) / 2; y = (H - ch * s) / 2;
    canvas.style.removeProperty("--pt"); canvas.style.removeProperty("--ph"); paperH = 282;
  } else {
    // 直式：寬度剛好填滿，桌布上緣（y=488）對齊操作區上緣；老先生頭頂（y≈160）一定在頂列下方
    const topH = app.querySelector(".top").offsetHeight;
    const sheetTop = sheetTopNow();
    s = Math.max(W / cw, sheetTop / ch);  // 寬度填滿就好；只有畫布蓋不到操作區上緣時才放大
    x = (W - cw * s) / 2;
    y = Math.min(0, sheetTop - 488 * s);
    const headTop = y + 160 * s;
    if (headTop < topH + 2) y = Math.min(0, y + topH + 2 - headTop);
    // 紅紙：上緣不碰頂列、下緣站在桌上、不超出看得到的舞台
    const vTop = (topH + 8 - y) / s, vBot = (sheetTop - 8 - y) / s;
    const pt = Math.max(132, vTop), pb = Math.min(394, vBot);
    paperH = Math.max(0, pb - pt);
    canvas.style.setProperty("--pt", pt.toFixed(1) + "px");
    canvas.style.setProperty("--ph", paperH.toFixed(1) + "px");
    app.classList.toggle("paper-off", paperH < 150);
  }
  const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
  if (canvas.style.transform !== tf) canvas.style.transform = tf;
  canvas.style.setProperty("--vl", Math.max(0, -x / s).toFixed(1) + "px");
  canvas.style.setProperty("--vr", Math.min(cw, (W - x) / s).toFixed(1) + "px");
  fitPaper();
}
let raf = 0;
const relayout = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };
// 操作區長高時，跟舞台用同一條曲線、同樣時間一起滑上去（FLIP），不再是操作區瞬間變高、舞台慢半拍
let lastTop = null;
new ResizeObserver(() => {
  const t = sheetTopNow();
  if (lastTop !== null && !reduced && app.dataset.orient === "port" && t < lastTop - 4) {
    sheet.style.transition = "none"; sheet.style.transform = `translateY(${(lastTop - t).toFixed(1)}px)`;
    sheet.getBoundingClientRect();
    sheet.style.transition = "transform .55s var(--ease)"; sheet.style.transform = "";
  }
  lastTop = t; relayout();
}).observe(sheet);
addEventListener("resize", relayout);
new ResizeObserver(relayout).observe(viewport);
// 手機鍵盤彈出時，操作區貼在鍵盤上面
if (window.visualViewport) {
  const vv = window.visualViewport;
  const onVV = () => { const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); app.style.setProperty("--kb", (kb > 80 ? kb : 0) + "px"); app.classList.toggle("kb", kb > 80); relayout(); };
  vv.addEventListener("resize", onVV); vv.addEventListener("scroll", onVV);
}
layout();

function setPhase(p) {
  app.dataset.phase = p;
  sheet.scrollTop = 0;
  relayout();
}
// 頂列「返」牌
const backBtn = $("#backBtn");
function setBack(fn) { S.back = fn; backBtn.style.visibility = fn ? "" : "hidden"; backBtn.hidden = false; backBtn.setAttribute("aria-hidden", fn ? "false" : "true"); backBtn.tabIndex = fn ? 0 : -1; }
backBtn.onclick = () => { if (S.back) S.back(); };
function speak(html) {
  S.said = html;
  if (say.dataset.last === html) return;
  say.dataset.last = html;
  typeHTML(say, html); typeHTML($("#sayIn"), html);
  $("#sayLive").textContent = html.replace(/<[^>]+>/g, "");
  pulse(say, "pop", 400);
}
function toast(msg) { const t = document.createElement("div"); t.className = "toast f-slip"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }
// 批命、擬名、對照頁頂端：老先生在窗框裡，旁邊是他說的話
function rtop(title, sub, html, extra = "") {
  return `<div class="rtop"><span class="medal" aria-hidden="true"><i style="background-image:url(assets/master/${S.pose === "count" ? "idle" : S.pose}.webp)"></i></span>
    <div class="rtop-r"><p class="who">${title}${sub ? `<small>${sub}</small>` : ""}</p><p class="rsay">${html}</p></div>${extra}</div>`;
}

// ───────── 紅紙 ─────────
function currentSplit() {
  if (S.mode === "name") return { surname: S.chars, given: [] };
  if (S.chars.length < 2) return { surname: S.chars, given: [] };
  return splitName(S.chars, S.surnameLen);
}
function fitPaper() {
  const n = paperText.querySelectorAll(".c").length || 1;
  const room = paperH - 44;
  const fs = Math.max(24, Math.min(48, Math.floor(room / (n * 1.1 + 0.4))));
  paperText.style.fontSize = fs + "px";
}
function renderPaper(opts = {}) {
  const { surname, given } = opts.split || currentSplit();
  paper.classList.toggle("empty", !surname.length);
  const cell = (ch, i, cls = "") => `<span class="c${cls}${opts.newIndex === i ? " new" : ""}">${esc(ch)}<span class="n"></span><span class="rs"></span></span>`;
  paperText.innerHTML = surname.map((c, i) => cell(c, i)).join("") + given.map((c, i) => cell(c, surname.length + i, i === 0 ? " g1" : "")).join("");
  fitPaper();
  $("#seal").classList.remove("on");
}

// ───────── 入座 ─────────
function seat() {
  setPhase("seat"); pose("speak"); setBack(null);
  S.chars = []; S.surnameLen = null; S.R = null; renderPaper(); $("#slotToken").classList.remove("on");
  speak(store.get("visited", false) ? `又來啦，坐。<span class="q">今天看誰的名字？</span>` : `來，坐。<span class="q">名字寫給我看。</span>`);
  store.set("visited", true);
  act.innerHTML = `<button type="button" class="prop red seat-main" data-m="read"><span class="in"><span class="t">看名字</span><span class="s">筆畫、五格、三才一起看<br>有生日，連八字也看</span></span></button>
    <div class="seat-sub"><button type="button" class="opt small" data-m="name">幫小孩取名</button></div>`;
  act.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { S.mode = b.dataset.m; askName(); });
  refreshHistory();
}

// ───────── 報名 ─────────
function askName() {
  setPhase("name"); pose("speak"); setBack(seat);
  const kid = S.mode === "name";
  speak(kid ? `小孩<span class="q">姓什麼？</span>寫在紅紙上。` : `<span class="q">寫全名。</span>`);
  act.innerHTML = `<form class="pen" id="penForm" autocomplete="off">
      <label class="sr" for="nameIn">${kid ? "小孩的姓" : "全名"}</label>
      ${kid ? `<p class="pen-tip">幫小孩取名：<b>只寫姓</b>，名字我來挑</p>` : ""}
      <input id="nameIn" enterkeyhint="done" placeholder="${kid ? "只寫姓，例如：林" : "例如：林家豪"}" value="${esc(S.chars.join(""))}">
      <div id="nameNote"></div>
      <button type="submit" class="btn main wide" id="nameOk" disabled>${kid ? "就這個姓" : "就這個名字"}</button>
    </form>`;
  const inp = $("#nameIn");
  inp.oninput = () => onNameInput(inp.value);
  $("#penForm").onsubmit = e => { e.preventDefault(); if (!$("#nameOk").disabled) { inp.blur(); askGender(); } };
  paper.onclick = () => inp.focus();
  onNameInput(inp.value);
  setTimeout(() => inp.focus({ preventScroll: true }), 80);
}
async function onNameInput(raw) {
  await ready;
  const prev = S.chars.length;
  const chars = [...raw.replace(/[^\p{Script=Han}]/gu, "")];
  const conv = [], multi = [], unknown = [];
  chars.forEach((c, i) => {
    const opts = tradOptions(c), t = opts[0];
    if (opts.length > 1 && t !== c) multi.push({ i, opts });
    if (t !== c) conv.push(c);
    chars[i] = S.chars[i] && opts.includes(S.chars[i]) ? S.chars[i] : t;
    if (kangxi(chars[i]) === null) unknown.push(chars[i]);
  });
  const tok = (onNameInput.tok = (onNameInput.tok || 0) + 1);
  if (chars.length && document.fonts) await Promise.race([document.fonts.load(`900 48px "Noto Serif TC"`, chars.join("")), sleep(900)]).catch(() => {});
  if (tok !== onNameInput.tok) return;
  S.chars = chars;
  if (chars.length !== prev) S.surnameLen = null;
  renderPaper({ newIndex: chars.length > prev ? chars.length - 1 : -1 });
  if (chars.length > prev) sfx("brush");
  let html = "";
  if (conv.length) html += `<p class="fine">我寫成正字，筆畫照康熙算。</p>`;
  for (const m of multi) html += `<p class="fine">是哪一個字？</p><div class="opts">${m.opts.map(o => `<button type="button" class="opt" data-i="${m.i}" data-c="${esc(o)}" aria-pressed="${S.chars[m.i] === o}">${esc(o)}</button>`).join("")}</div>`;
  if (unknown.length) html += `<p class="fine">「${esc(unknown.join("、"))}」這字我字典翻不到，筆畫不敢亂算，換個寫法看看。</p>`;
  if (S.mode === "name" && chars.length > 2) html += `<p class="fine warn">幫小孩取名只要寫姓就好，名字我來挑。要看自己的名字，按左上角「返」，選「看名字」。</p>`;
  if (S.mode === "read" && chars.length > 5) html += `<p class="fine warn">名字最多五個字，複姓加三個字也夠了。</p>`;
  const sp = currentSplit();
  if (S.mode === "read" && chars.length >= 3) {
    const two = chars.slice(0, 2).join("");
    if (COMPOUND.includes(two) || S.surnameLen) html += `<p class="fine">${AMBIGUOUS.has(two) && !S.surnameLen ? `「${esc(two)}」是複姓嗎？` : "你姓哪個？"}</p><div class="opts">
      <button type="button" class="opt" data-sl="1" aria-pressed="${sp.surname.length === 1}">${esc(chars[0])}</button>
      <button type="button" class="opt" data-sl="2" aria-pressed="${sp.surname.length === 2}">${esc(two)}</button></div>`;
  }
  const note = $("#nameNote"); if (!note) return;
  note.innerHTML = html;
  note.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { S.chars[+b.dataset.i] = b.dataset.c; onNameInput(S.chars.join("")); });
  note.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { S.surnameLen = +b.dataset.sl; onNameInput(S.chars.join("")); });
  $("#nameOk").disabled = !(!unknown.length && (S.mode === "name" ? chars.length >= 1 && chars.length <= 2 : chars.length >= 2 && chars.length <= 5));
}

// ───────── 乾坤 ─────────
function askGender() {
  setPhase("qiankun"); pose("speak"); setBack(askName);
  speak(S.mode === "name" ? `<span class="q">男孩還是女孩？</span>還不知道，先挑一個。` : `<span class="q">男生還是女生？</span>`);
  act.innerHTML = `<div class="tokens" role="group" aria-label="乾坤">
      <button type="button" class="tk" data-g="m" aria-pressed="${S.gender === "m"}" aria-label="乾造，男命"><span class="face"><span class="vt">乾造</span></span><span class="s">男命</span></button>
      <button type="button" class="tk" data-g="f" aria-pressed="${S.gender === "f"}" aria-label="坤造，女命"><span class="face"><span class="vt">坤造</span></span><span class="s">女命</span></button>
    </div>`;
  act.querySelectorAll("[data-g]").forEach(b => b.onclick = async () => {
    if (act.dataset.busy) return; act.dataset.busy = 1;
    S.gender = b.dataset.g; b.setAttribute("aria-pressed", "true"); b.classList.add("pick"); sfx("wood");
    $("#slotToken").classList.add("on"); pulse($("#slotToken"), "drop", 600);
    await sleep(520); delete act.dataset.busy; askBirth();
  });
}

// ───────── 生辰 ─────────
async function loadLunar() {
  if (L) return L;
  await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/lunar.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
  L = { Solar: window.Solar, Lunar: window.Lunar, LunarMonth: window.LunarMonth, LunarYear: window.LunarYear };
  return L;
}
const afterBirth = () => S.mode === "name" ? doNaming() : askTopic();
function askBirth() {
  setPhase("birth"); pose("speak"); setBack(askGender);
  speak(S.mode === "name" ? `小孩<span class="q">哪一天生的？</span>還沒出世，預產期也行。` : `<span class="q">幾年次的？</span>生日給我，八字一起看。`);
  act.innerHTML = `<div class="props">
      <button type="button" class="prop red" id="giveCard"><span class="in"><span class="t">給生日</span><span class="s">八字、生肖一起看</span></span></button>
      <button type="button" class="prop f-wood" id="noCard"><span class="in"><span class="t">先不用</span><span class="s">只看名字筆畫</span></span></button>
    </div>`;
  loadLunar().catch(() => {});
  $("#giveCard").onclick = openBirthCard;
  $("#noCard").onclick = () => { S.birth = null; S.bazi = null; afterBirth(); };
}
const lunarDay = d => d === 10 ? "初十" : d === 20 ? "二十" : d === 30 ? "三十" : ["初", "十", "廿"][Math.floor((d - 1) / 10)] + "一二三四五六七八九"[(d - 1) % 10];
const LMON = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "臘"];
// 生辰帖的選單：不用瀏覽器原生的白色下拉，改成從下方升起的宣紙籤，選項用毛筆字、選中的畫朱線
function openPicker(sel, title, kind = "") {
  const groups = [...sel.querySelectorAll("optgroup")];
  // 每個選項拆成大字＋小字，一行排完
  const parts = o => {
    const t = o.textContent;
    if (kind === "year") { const [w, roc] = t.split(/\s+/); return [roc || w, roc ? w : ""]; }  // 民國年為主，西元小字輔助
    if (kind === "hour") { const m = t.match(/^(.+?點)（(.)時）$/); return m ? [m[1], `${m[2]}時`] : [t, ""]; }
    return [t, ""];
  };
  const row = o => { const [a, b] = parts(o); return `<button type="button" class="pk-o" data-v="${esc(o.value)}" aria-pressed="${o.value === sel.value}"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ""}</button>`; };
  const body = groups.length ? groups.map(g => `<p class="pk-g">${esc(g.label)}</p>${[...g.children].map(row).join("")}`).join("") : [...sel.options].map(row).join("");
  const box = document.createElement("div");
  box.className = "picker";
  box.innerHTML = `<div class="pk-in f-slip" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <button type="button" class="share-x" aria-label="收起來">收</button>
      <p class="pk-h">${esc(title)}</p>
      <div class="pk-list pk-${kind || "short"}">${body}</div>
    </div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add("on"));
  const cur = box.querySelector('.pk-o[aria-pressed="true"]');
  if (cur) cur.scrollIntoView({ block: "center" });
  (cur || box.querySelector(".pk-o"))?.focus({ preventScroll: true });
  const onKey = e => { if (e.key === "Escape") close(); };
  const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 260); removeEventListener("keydown", onKey); };
  addEventListener("keydown", onKey);
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector(".share-x").onclick = close;
  box.querySelectorAll(".pk-o").forEach(b => b.onclick = () => { sel.value = b.dataset.v; sel.dispatchEvent(new Event("change")); sfx("brush"); close(); });
}
// 生辰帖：一張宣紙帖，用毛筆字寫出生日；每一段點了跳出手機自己的滾輪選單
function openBirthCard() {
  setBack(askBirth);
  speak(`國曆農曆都行。<span class="q">幾點生的？</span>記不得就空著。`);
  act.innerHTML = `<form class="tie f-slip" id="birthForm" autocomplete="off">
      <div class="tie-head"><span class="tie-t">生辰帖</span><button type="button" class="opt cal" id="calBtn" aria-label="國曆或農曆，點了切換"></button></div>
      <p class="tie-body">
        <label class="w"><span id="tY"></span><select id="bY" aria-label="出生年"></select></label><label class="w"><span id="tM"></span><select id="bM" aria-label="出生月"></select></label><label class="w"><span id="tD"></span><select id="bD" aria-label="出生日"></select></label>
        <button type="button" class="opt leap" id="leapBtn" hidden aria-pressed="false">閏月</button>
        <br><label class="w"><span id="tH"></span><select id="bH" aria-label="出生時辰"></select></label><label class="w" id="wMi"><span id="tMi"></span><select id="bMi" aria-label="出生分鐘"></select></label>
        <br><span class="tie-txt">生在</span><label class="w"><span id="tP"></span><select id="bP" aria-label="出生地"></select></label>
      </p>
      <button type="button" class="tie-zi" id="ziBtn" aria-pressed="true"></button>
      <p class="tie-pv" id="bPreview"></p>
    </form>
    <div class="row"><button type="button" class="btn ghost" id="bCancel">先不用</button><button type="button" class="btn main" id="bOk">就這樣算</button></div>`;
  sfx("paper");
  const Y = $("#bY"), M = $("#bM"), D = $("#bD"), H = $("#bH"), Mi = $("#bMi"), P = $("#bP"), leapBtn = $("#leapBtn");
  // 每一段字都是按鈕：點了開宣紙選單（原生下拉只留著存值，不顯示）
  act.querySelectorAll(".w").forEach(w => {
    const sel = w.querySelector("select");
    sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    w.tabIndex = 0; w.setAttribute("role", "button"); w.setAttribute("aria-label", sel.getAttribute("aria-label") + "，點了可以改");
    const kind = { bY: "year", bH: "hour", bP: "place", bMi: "min", bD: "day", bM: "month" }[sel.id] || "";
    const open = e => { e.preventDefault(); openPicker(sel, sel.getAttribute("aria-label"), kind); };
    w.addEventListener("click", open);
    w.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") open(e); });
  });
  const prev = S.birth || store.get("birth", null);
  let cal = prev?.calendar || "solar", zi = prev?.ziRule || "early", leap = !!prev?.leap;
  const nowY = new Date().getFullYear();
  const yName = y => y > 1911 ? `民國${num(y - 1911)}年` : `民前${num(1912 - y)}年`;
  Y.innerHTML = Array.from({ length: nowY + 2 - 1920 + 1 }, (_, i) => nowY + 2 - i).map(y => `<option value="${y}">${y}　${yName(y)}</option>`).join("");
  H.innerHTML = `<option value="">不知道幾點</option>` + Array.from({ length: 24 }, (_, h) => `<option value="${h}">${num(h)}點（${ZHI[Math.floor((h + 1) / 2) % 12]}時）</option>`).join("");
  Mi.innerHTML = Array.from({ length: 60 }, (_, m) => `<option value="${m}">${m ? num(m) + "分" : "整點"}</option>`).join("");
  P.innerHTML = `<optgroup label="臺灣">${PLACES.filter(p => p[2] === "Asia/Taipei").map(p => `<option>${p[0]}</option>`).join("")}</optgroup><optgroup label="海外">${PLACES.filter(p => p[2] !== "Asia/Taipei").map(p => `<option>${p[0]}</option>`).join("")}</optgroup>`;
  Y.value = prev?.y || (S.mode === "name" ? nowY : 1990); P.value = prev?.place || "臺北市";
  H.value = prev && prev.h !== null && prev.h !== undefined ? prev.h : ""; Mi.value = prev?.mi || 0;
  const fillMonths = () => { const keep = +M.value || prev?.m || 1; M.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${cal === "lunar" ? LMON[i + 1] + "月" : num(i + 1) + "月"}</option>`).join(""); M.value = keep; };
  const fillDays = () => {
    const y = +Y.value, m = +M.value; let n = 31;
    if (cal === "solar") n = new Date(y, m, 0).getDate();
    else if (L) {
      const lm = L.LunarYear.fromYear(y).getLeapMonth();
      leapBtn.hidden = lm !== m; if (lm !== m) leap = false;
      try { n = L.LunarMonth.fromYm(y, leap ? -m : m).getDayCount(); } catch (_) { n = 30; }
    } else n = 30;
    if (cal === "solar") leapBtn.hidden = true;
    const keep = +D.value || prev?.d || 1;
    D.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${cal === "lunar" ? lunarDay(i + 1) : num(i + 1) + "日"}</option>`).join("");
    D.value = Math.min(keep, n);
    leapBtn.setAttribute("aria-pressed", leap);
  };
  const write = () => {
    const y = +Y.value, m = +M.value, d = +D.value, h = H.value;
    $("#calBtn").textContent = cal === "lunar" ? "農曆" : "國曆";
    $("#tY").textContent = yName(y);
    $("#tM").textContent = cal === "lunar" ? `${leap ? "閏" : ""}${LMON[m]}月` : `${num(m)}月`;
    $("#tD").textContent = cal === "lunar" ? lunarDay(d) : `${num(d)}日`;
    $("#tH").textContent = h === "" ? "時辰不知" : `${ZHI[Math.floor((+h + 1) / 2) % 12]}時`;
    $("#wMi").hidden = h === "";
    $("#tMi").textContent = h === "" ? "" : `${num(+h)}點${+Mi.value ? num(+Mi.value) + "分" : "整"}`;
    $("#tP").textContent = P.value;
    $("#ziBtn").innerHTML = zi === "early" ? `夜裡十一點以後出生，<b>算隔天</b>` : `夜裡十一點以後出生，<b>過十二點才算隔天</b>`;
  };
  const input = () => ({ calendar: cal, y: +Y.value, m: +M.value, d: +D.value, leap: cal === "lunar" && leap, h: H.value === "" ? null : +H.value, mi: +Mi.value, place: P.value, ziRule: zi });
  const placeOf = n => PLACES.find(p => p[0] === n);
  const update = async () => {
    write();
    const pv = $("#bPreview");
    try {
      await loadLunar();
      const inp = input(), b = computeBazi({ ...inp, place: placeOf(inp.place) }, L), ts = b.trueSolar;
      pv.innerHTML = `八字　<b>${b.pillars.map(p => p.gz).join("　")}</b><br>${b.lunarText.replace("腊", "臘")}${ts ? `・照當地日頭算是${num(ts.h)}點${ts.mi ? num(ts.mi) + "分" : "整"}` : "・沒時辰，只排三柱"}`;
    } catch (_) { pv.textContent = "萬年曆翻不到這一天，換一天看看。"; }
  };
  const setCal = async c => { cal = c; leap = false; if (c === "lunar") await loadLunar().catch(() => {}); fillMonths(); fillDays(); update(); };
  $("#calBtn").onclick = () => { sfx("wood"); pulse($("#calBtn"), "flipx", 500); setCal(cal === "solar" ? "lunar" : "solar"); };
  $("#ziBtn").onclick = () => { zi = zi === "early" ? "split" : "early"; $("#ziBtn").setAttribute("aria-pressed", zi === "early"); update(); };
  leapBtn.onclick = () => { leap = !leap; fillDays(); update(); };
  [Y, M].forEach(el => el.onchange = () => { fillDays(); update(); });
  [D, H, Mi, P].forEach(el => el.onchange = update);
  $("#bCancel").onclick = () => { S.birth = null; S.bazi = null; afterBirth(); };
  $("#bOk").onclick = async () => {
    try {
      await loadLunar();
      S.birth = input(); store.set("birth", S.birth); sfx("paper");
      S.bazi = computeBazi({ ...S.birth, place: placeOf(S.birth.place) }, L);
      afterBirth();
    } catch (_) { toast("萬年曆翻不到這天，換一天看看"); }
  };
  if (prev?.m) { fillMonths(); M.value = prev.m; }
  setCal(cal).then(() => { if (prev?.m) { M.value = prev.m; leap = !!prev.leap && cal === "lunar"; fillDays(); if (prev.d) D.value = prev.d; update(); } });
}

// ───────── 問事（招牌） ─────────
function askTopic() {
  setPhase("topic"); pose("speak"); setBack(() => S.birth ? openBirthCard() : askBirth());
  speak(`<span class="q">要問哪一項？</span>不講，我就整個看。`);
  act.innerHTML = `<div class="signs" role="group" aria-label="想問的事">${TOPICS.map(([k, t]) => `<button type="button" class="sign" data-t="${k}" aria-pressed="${S.topic === k}"><span class="t vt">${t}</span></button>`).join("")}</div>
    <button type="button" class="btn main wide" id="goCount">請先生算</button>`;
  act.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.topic = b.dataset.t; act.querySelectorAll(".sign").forEach(x => x.setAttribute("aria-pressed", x === b)); sfx("chime"); pulse(b, "swing", 1200); });
  $("#goCount").onclick = count;
}

// ───────── 數筆畫 ─────────
async function count() {
  setPhase("count"); pose("count"); setBack(null); fast = false;
  const sp = currentSplit();
  const R = reading({ surname: sp.surname, given: sp.given, gender: S.gender, topic: S.topic, bazi: S.bazi });
  S.R = R;
  const skip = document.createElement("button"); skip.className = "btn ghost skip"; skip.textContent = "不用等，直接看"; skip.onclick = () => { fast = true; skip.remove(); };
  document.body.append(skip);
  speak(`等一下，<span class="q">我把筆畫排出來。</span>`);
  act.innerHTML = `<div class="grid5" id="grid5">${gridTiles(R, true)}</div><p class="sancai pending" id="scLine" style="opacity:0">三才　${R.sancai.key.split("").join("・")}　${R.sancai.level}</p><div id="countBazi"></div>`;
  renderPaper();
  const cells = [...paperText.querySelectorAll(".c")];
  for (const [i, el] of cells.entries()) {
    const c = R.chars[i];
    el.classList.add("lit"); sfx("tick", 0.92 + i * 0.07);
    if (c.restore) { el.querySelector(".rs").textContent = `${c.restore.from}→${c.restore.to}`; el.classList.add("restoring"); sfx("brush"); await sleep(650); }
    el.querySelector(".n").textContent = han(c.strokes);
    el.classList.add("shown");
    await sleep(380);
  }
  await sleep(250);
  for (const [j, k] of GRID_KEYS.entries()) { act.querySelector(`.g[data-k=${k}]`).classList.remove("pending"); sfx("tick", 1.2 + j * 0.05); await sleep(330); }
  $("#scLine").style.opacity = 1;
  await sleep(500);
  if (R.bazi) {
    speak(`再合一下八字。`);
    $("#countBazi").innerHTML = baziBlock(R.bazi);
    await sleep(60);
    $("#countBazi").querySelectorAll(".bar b").forEach(b => b.style.width = b.dataset.w);
    await sleep(1300);
  }
  $("#seal").classList.add("on"); sfx("stamp"); pulse(viewport, "shake", 380);
  await sleep(600);
  skip.remove();
  S.justCounted = true;
  const hk = h => [h.name, h.gender, h.birth ? JSON.stringify(h.birth) : "", h.topic].join("|");
  const me = { name: R.name, surnameLen: R.surname.length, gender: S.gender, birth: S.birth, topic: S.topic, grade: R.grade, t: Date.now() };
  const hist = store.get("history", []).filter(h => hk(h) !== hk(me));
  hist.unshift(me);
  store.set("history", hist.slice(0, 8));
  showReading(R);
}

const LV_SHORT = { 吉多於凶: "半吉", 凶多於吉: "半凶" };
const cellOf = g => `${g.n}畫<br>${g.el}・${LV_SHORT[g.level] || g.level}`;
function gridTiles(R, pending, asButtons = false) {
  return GRID_KEYS.map(k => {
    const g = R.wuge[k], cls = g.lv >= 1 ? "good" : g.lv <= -1 ? "bad" : "";
    const tag = asButtons ? "button" : "div";
    return `<${tag} ${asButtons ? 'type="button"' : ""} class="g${pending ? " pending" : ""}" data-k="${k}" aria-label="${GRID_INFO[k].label}${han(g.n)}畫，${g.el}，${g.level}"><span class="k">${GRID_INFO[k].label}</span><span class="num">${g.n}</span><span class="el e-${g.el}">${g.el}</span><span class="lv ${cls}">${LV_SHORT[g.level] || g.level}</span></${tag}>`;
  }).join("");
}
const cheng = v => { const t = Math.round(v * 10); return v < 0.05 ? "幾乎沒有" : t < 1 ? "不到一成" : `約${t === 2 ? "兩" : han(t)}成`; };
function baziBlock(b) {
  const max = Math.max(...Object.values(b.share));
  const colors = { 木: "#3f7a4b", 火: "#b8392a", 土: "#9a7434", 金: "#c9a13b", 水: "#2f5f8c" };
  return `<div class="pillars">${b.pillars.map(p => `<div class="pillar"><span>${p.name}柱</span><b>${p.gz}</b><span>${p.ganGod}</span></div>`).join("")}</div>
    <div class="bars">${"木火土金水".split("").map(e => `<div class="bar${e === b.yong ? " yong" : ""}"><span>${e}</span><i><b style="background:${colors[e]}" data-w="${Math.round(b.share[e] / max * 100)}%"></b></i><em>${cheng(b.share[e])}</em></div>`).join("")}</div>`;
}

// ───────── 批命 ─────────
let curReading = null;
function showReading(R, opts = {}) {
  curReading = R;
  setPhase("reading");
  pose(R.renameAdvised ? "stern" : "approve");
  setBack(opts.back || seat);
  renderPaper({ split: { surname: [...R.surname], given: [...R.given] } });
  paperText.querySelectorAll(".c").forEach((el, i) => { el.classList.add("shown"); el.querySelector(".n").textContent = han(R.chars[i].strokes); });
  $("#seal").classList.add("on");
  const line = opts.say || (R.renameAdvised ? `這名字，<span class="q">我直說。</span>` : R.grade === "上上" || R.grade === "上" ? `<span class="q">這名字不錯。</span>你看看。` : `<span class="q">還可以，</span>有幾個地方要注意。`);
  speak(line);
  const view = S.view;
  if (S.justCounted) { S.justCounted = false; setTimeout(() => sfx("bell"), 120); }
  setTimeout(() => sfx("paper"), 260);
  act.innerHTML = `
    ${rtop(esc(R.name), gtxt(R.gender), line, `<button type="button" class="opt small rshare" id="shareTop">分享</button>`)}
    <div class="rhead"><div class="mode" role="group" aria-label="怎麼看"><button type="button" data-v="both">都看</button><button type="button" data-v="pi">只看批語</button><button type="button" data-v="bai">只看白話</button></div></div>
    <div class="hero">
      <div class="grade">${R.grade}</div>
      <div class="hl">${clauses(R.headline + "。")}</div>
      <div class="hlp">${prose(R.headlinePlain)}</div>
    </div>
    <div class="grid5" id="grid5">${gridTiles(R, false, true)}</div>
    <p class="sancai">三才　${R.sancai.key.split("").join("・")}　${R.sancai.level}</p>
    <p class="ai-note" id="aiNote" hidden></p>
    <article class="reading" id="readingBody" data-mode="${view}">
      ${R.sections.map(s => `<section class="sec" id="sec-${s.key}" data-k="${s.key}"><h3>${esc(s.title)}</h3>${s.key === "bazi" ? baziBlock(R.bazi) : ""}<p class="pi">${s.pi.map(l => `<span>${clauses(l)}</span>`).join("")}</p><p class="bai">${prose(s.bai)}</p></section>`).join("")}
    </article>
    <div class="ask f-slip" id="askBox" hidden>
      <div class="ask-top"><p class="ask-h">追問先生</p><div class="ask-left" id="askLeft" role="img"></div></div>
      <p class="ask-sub">批完了，還有想問的，一句一句問。</p>
      <div class="ask-log" id="askLog"></div>
      <div class="ask-in"><textarea id="askQ" rows="2" placeholder="例如：適合做生意嗎？" aria-label="想問先生的事"></textarea><span class="ask-count" id="askMeta" aria-live="polite"></span></div>
      <button type="button" class="btn main ask-go" id="askGo">追問</button>
    </div>
    <div class="after">
      <button type="button" class="btn ghost" id="shareR">分享</button>
      <button type="button" class="btn ghost" id="again">再看一個</button>
    </div>
    <button type="button" class="btn main wide" id="toRename">${R.renameAdvised ? "幫我挑新名字" : "看看別的名字"}</button>`;
  const setView = v => { S.view = v; store.set("view", v); $("#readingBody").dataset.mode = v; act.querySelectorAll("[data-v]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); };
  act.querySelectorAll("[data-v]").forEach(b => b.onclick = () => setView(b.dataset.v));
  setView(view);
  act.querySelectorAll(".bar b").forEach(b => b.style.width = b.dataset.w);
  act.querySelectorAll("#grid5 .g").forEach(t => t.onclick = () => $(`#sec-${t.dataset.k}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    act.querySelectorAll("#grid5 .g").forEach(t => t.classList.toggle("on", t.dataset.k === e.target.dataset.k));
  }), { root: sheet, rootMargin: "-25% 0px -60% 0px" });
  act.querySelectorAll(".sec").forEach(s => io.observe(s));
  $("#toRename").onclick = () => showRename(R);
  $("#again").onclick = () => { S.mode = "read"; S.chars = []; askName(); };
  $("#shareR").onclick = $("#shareTop").onclick = () => openShare(R);
  aiAvailable().then(ok => {
    if (!$("#readingBody") || curReading !== R || !ok) return;
    if (opts.friend && !cachedReading(R) && !readingPending(R)) {
      const note = $("#aiNote");
      note.hidden = false;
      note.innerHTML = `下面是照筆畫排的。<button type="button" class="opt small" id="askFull">請先生親口批</button>`;
      $("#askFull").onclick = () => { note.hidden = true; runAIReading(R); setupAsk(R); };
      return;
    }
    runAIReading(R);
    setupAsk(R);
  });
}

// ───────── 先生親口批（AI 寫全部評語；引擎文字是依據，也是備援） ─────────
function runAIReading(R) {
  const slots = READING_TAGS.map(([, k]) => [k, k === "headline" ? act.querySelector(".hero .hlp") : act.querySelector(`#sec-${k} .bai`)]).filter(([, el]) => el);
  const engine = Object.fromEntries(slots.map(([k, el]) => [k, el.innerHTML]));
  const cap = (k, t) => { const max = k === "ren" ? LIMITS.SECTION_MAX + 60 : LIMITS.SECTION_MAX; const a = [...t]; if (a.length <= max) return t; const c = a.slice(0, max).join(""); const i = c.lastIndexOf("。"); return i > max * .5 ? c.slice(0, i + 1) : c + "……"; };
  slots.forEach(([, el]) => { el.classList.add("wait"); el.innerHTML = `<span class="ink-wait">先生正在寫……</span>`; });
  const fill = (parts, done) => {
    if (done) R.aiParts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, cap(k, toTrad(v))]));
    if (!$("#readingBody") || curReading !== R) return;
    for (const [k, el] of slots) {
      const t = parts[k];
      if (t) { el.classList.remove("wait"); el.textContent = cap(k, toTrad(t)); }
      else if (done) { el.classList.remove("wait"); el.innerHTML = engine[k]; }
    }
  };
  aiReadingFull(R, fill).catch(e => {
    fill(e.parts || {}, true);
    if (curReading !== R) return;
    const note = $("#aiNote");
    if (e.code === "reading_limit" || e.code === "site_limit") {
      if (note) { note.hidden = false; note.textContent = e.code === "site_limit" ? "今晚來問的人太多，先生歇了。下面先照筆畫排給你看。" : "先生一時沒接上話，下面先照筆畫排給你看。"; }
      if (!S.limitShown) { S.limitShown = true; limitModal(e.code); }
    } else if (e.code !== "unavailable" && note) { note.hidden = false; note.textContent = "香斷了，先生這回講不下去。下面先照筆畫排給你看。"; }
  });
}

// ───────── 追問先生（AI） ─────────
function setupAsk(R) {
  const box = $("#askBox"), q = $("#askQ"), go = $("#askGo"), meta = $("#askMeta"), log = $("#askLog");
  box.hidden = false;
  const key = readingKey(R);
  const twDay = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const fuAll = () => { const v = store.get("followups", null); return v && v.d === twDay ? v.m : {}; };
  const fuLeft = () => Math.max(0, LIMITS.FOLLOWUPS - (fuAll()[key] || 0));
  const sync = () => {
    const n = [...q.value.trim()].length, left = Math.min(askLeft(), fuLeft());
    go.textContent = "追問";
    const over = n > LIMITS.QUESTION_MAX;
    meta.hidden = !n;
    meta.classList.toggle("over", over);
    meta.textContent = over ? `多了${num(n - LIMITS.QUESTION_MAX)}個字，講重點就好` : `${num(n)}／${num(LIMITS.QUESTION_MAX)}`;
    const lb = $("#askLeft");
    lb.innerHTML = `<span>${left ? "還能問" + (left === 2 ? "兩" : num(left)) + "次" : "這張問完了"}</span>` + Array.from({ length: LIMITS.FOLLOWUPS }, (_, i) => `<i class="${i < left ? "" : "used"}"></i>`).join("");
    lb.setAttribute("aria-label", `這張還能問${num(left)}次`);
    go.disabled = over || n === 0 || !left;
    q.placeholder = left ? "例如：適合做生意嗎？" : "這張問完了，想再問就換一個名字請先生看。";
    q.readOnly = !left;
  };
  q.oninput = sync; sync();
  go.onclick = async () => {
    if (fuLeft() <= 0) { limitModal("followup_limit"); return; }
    const text = q.value.trim();
    if (!text) return;
    const item = document.createElement("div"); item.className = "qa";
    item.innerHTML = `<p class="qa-q">你問：${esc(text)}</p><p class="qa-a">先點一炷香……</p>`;
    log.append(item); const out = item.querySelector(".qa-a");
    go.disabled = true; q.disabled = true; pose("speak"); sfx("bell");
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    try {
      await aiAsk(R, text, t => { out.innerHTML = toTrad(t).split(/\n+/).filter(x => x.trim()).map(x => `<span class="para">${esc(x)}</span>`).join(""); });
      { const m = fuAll(); m[key] = (m[key] || 0) + 1; store.set("followups", { d: twDay, m }); }
      q.value = "";
    } catch (e) {
      if (e.code === "user_limit" || e.code === "site_limit") { item.remove(); limitModal(e.code); }
      else if (e.code === "too_long") { item.remove(); toast(`最多${num(LIMITS.QUESTION_MAX)}個字，講重點就好`); }
      else if (e.code === "too_fast") out.textContent = "慢慢來，一次問一件。等一下再問。";
      else out.textContent = "香斷了，這回講不下去。你等一下再叫我。";
    }
    pose(R.renameAdvised ? "stern" : "approve");
    q.disabled = false; sync();
  };
}
// 次數用完：神力耗盡
function limitModal(kind) {
  const site = kind === "site_limit";
  const MSG = {
    followup_limit: [`這張問過${num(LIMITS.FOLLOWUPS)}句了，該講的都講了。`, `一張紙只問${num(LIMITS.FOLLOWUPS)}句`],
    site_limit: ["今晚來問的人太多，廟裡的香都燒完了，先生也要歇了。", `今晚的香只夠點${num(LIMITS.SITE_CALLS)}回`],
  }[kind] || ["先生要歇一下。", "次數有限"];
  const box = document.createElement("div");
  box.className = "share";
  box.innerHTML = `<div class="share-in f-slip limit" role="alertdialog" aria-modal="true" aria-labelledby="lmH" aria-describedby="lmT">
      <div class="limit-seal" aria-hidden="true">${site ? "香盡" : kind === "followup_limit" ? "話盡" : "神倦"}</div>
      <p class="share-h" id="lmH">${kind === "followup_limit" ? "這張問完了" : "神力耗盡"}</p>
      <p class="limit-t" id="lmT">${MSG[0]}</p>
      <p class="limit-n">這是免費的網站，為了節省成本，${MSG[1]}。${kind === "followup_limit" ? "想再問，換一個名字請先生看。" : "批命、擬名照樣可以看，明天再來請先生親口講。"}</p>
      <button type="button" class="btn main wide" id="lmOk">知道了</button>
    </div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add("on"));
  const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 300); };
  box.querySelector("#lmOk").onclick = close;
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector("#lmOk").focus();
}

// ───────── 改名／取名 ─────────
let lastCands = [];
async function showRename(R) {
  setPhase("rename"); pose("write");
  setBack(R ? () => showReading(R) : seat);
  const surname = R ? [...R.surname] : currentSplit().surname;
  const st = Object.assign({ length: R && R.given.length === 1 ? 1 : 2, keepPos: "", keepCh: "", exclude: "", leanFree: false }, store.get("renameCfg", {}));
  if (!R) renderPaper({ split: { surname, given: [] } });
  const line = R ? `名字換一個看看。<span class="q">我挑幾個給你。</span>` : `姓${esc(surname.join(""))}的喔，<span class="q">我挑幾個給你看看。</span>`;
  speak(line);
  act.innerHTML = `
    ${rtop(R ? `替${esc(R.name)}擬名` : `替${esc(surname.join(""))}家的孩子取名`, "", line)}
    <div class="cond f-slip"><p class="cond-sum" id="condSum"></p><button type="button" class="opt small" id="condBtn" aria-expanded="false">換個挑法</button></div>
    <div class="cond-body f-slip" id="condBody" hidden>
      <p class="cond-row">名字取<span class="opts"><button type="button" class="opt" data-len="2">兩個字</button><button type="button" class="opt" data-len="1">一個字</button></span></p>
      <p class="cond-row">要留的字<input id="rKeepCh" placeholder="沒有" aria-label="要留的字，寫一個字"><span class="kp-grp">放在<span class="opts"><button type="button" class="opt" data-kp="0">頭一個</button><button type="button" class="opt" data-kp="1">後一個</button></span></span></p>
      <p class="cond-row">不要用的字<input id="rEx" class="long" placeholder="例如：美、玲" aria-label="不要用的字"></p>
      <p class="cond-row"><span class="opts"><button type="button" class="opt" id="rFree">男女的字都可以用</button></span></p>
      <button type="button" class="btn main wide" id="rGo">照這樣再挑</button>
    </div>
    <div id="slips" class="sticks"></div>
    <div class="own f-slip"><label for="ownIn">自己想好的名字也寫來，我一起看</label>
      <div class="own-row"><input id="ownIn" class="long" placeholder="只寫名，像「宥廷」"><button type="button" class="opt" id="ownGo">一起看</button></div></div>`;
  const sync = () => {
    act.querySelectorAll("[data-len]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.len === st.length));
    act.querySelectorAll("[data-kp]").forEach(b => { b.setAttribute("aria-pressed", b.dataset.kp === String(st.keepPos)); b.disabled = st.length === 1 && b.dataset.kp === "1"; });
    $("#rFree").setAttribute("aria-pressed", st.leanFree);
    const g = S.gender === "f" ? "女" : "男";
    $("#condSum").innerHTML = [st.length === 1 ? "取一個字" : "取兩個字", st.leanFree ? "男女都可以" : `照${g}生的字`, st.keepCh ? `留「${st.keepCh}」` : "不留字", st.exclude.trim() ? `不用「${st.exclude.replace(/[^\p{Script=Han}]/gu, "")}」` : ""].filter(Boolean).map(x => `<span class="seg">${esc(x)}</span>`).join("・");
  };
  act.querySelectorAll("[data-len]").forEach(b => b.onclick = () => { st.length = +b.dataset.len; if (st.length === 1 && st.keepPos === "1") st.keepPos = ""; sync(); });
  act.querySelectorAll("[data-kp]").forEach(b => b.onclick = () => { st.keepPos = st.keepPos === b.dataset.kp ? "" : b.dataset.kp; sync(); });
  $("#rFree").onclick = () => { st.leanFree = !st.leanFree; sync(); };
  $("#condBtn").onclick = () => { const body = $("#condBody"); body.hidden = !body.hidden; $("#condBtn").setAttribute("aria-expanded", !body.hidden); $("#condBtn").textContent = body.hidden ? "換個挑法" : "收起來"; if (!body.hidden) body.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  $("#rKeepCh").value = st.keepCh; $("#rEx").value = st.exclude; sync();
  const run = async () => {
    const box = $("#slips");
    box.innerHTML = `<p class="fine ink">我翻一下字典……</p>`;
    await Promise.all([initNames(load), initGivenNames(load)]);
    st.keepCh = [...$("#rKeepCh").value.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0])[0] || "";
    st.exclude = $("#rEx").value;
    store.set("renameCfg", st);
    if (st.keepCh && st.keepPos === "") st.keepPos = "0";
    sync();
    if (st.keepPos !== "" && !st.keepCh) { box.innerHTML = `<p class="fine ink">你要留哪個字，先寫在「要留的字」那格。</p>`; return; }
    const ex = new Set([...st.exclude.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0]));
    if (R) [...R.given].forEach(ch => { if (ch !== st.keepCh) ex.add(ch); });
    lastCands = [...lastCands.filter(x => x.own), ...suggestNames({ surname, gender: S.gender, bazi: S.bazi, length: st.length, keep: st.keepPos !== "" ? { pos: +st.keepPos, ch: st.keepCh } : null, exclude: ex, leanFree: st.leanFree, count: 8 })];
    renderSticks(R, surname);
  };
  $("#rGo").onclick = () => { $("#condBody").hidden = true; $("#condBtn").textContent = "換個挑法"; run(); };
  $("#ownGo").onclick = async () => {
    await ready; await initNames(load);
    const names = $("#ownIn").value.split(/[\s,，、]+/).map(n => [...n.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0])).filter(a => a.length >= 1 && a.length <= 3 && a.every(ch => kangxi(ch) !== null));
    if (!names.length) { toast("姓不用寫，只寫名就好，像「宥廷」"); return; }
    const own = names.map(g => { const ev = evaluate({ surname, given: g, gender: S.gender, bazi: S.bazi }); return { name: surname.join("") + g.join(""), given: g.join(""), score: ev.score, grade: ev.grade, own: true, reason: `「${ev.sInfo.at(-1).ch}」${num(ev.sInfo.at(-1).strokes)}畫加「${ev.gInfo[0].ch}」${num(ev.gInfo[0].strokes)}畫，人格${num(ev.wuge.ren.n)}，${LVS(ev.wuge.ren.level)}；總格${num(ev.wuge.zong.n)}，${LVS(ev.wuge.zong.level)}；三才${ev.sancai.level === "吉" || ev.sancai.level === "大吉" ? "算順" : ev.sancai.level === "凶" || ev.sancai.level === "大凶" ? "卡卡的" : "普通"}。` }; });
    lastCands = [...own, ...lastCands.filter(x => !x.own)];
    $("#ownIn").value = "";
    renderSticks(R, surname);
    $("#slips").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  lastCands = [];
  run();
}
// 候選名：一支支竹籤，籤頭寫評等，籤身直寫名字，籤腳寫分數；自己帶來的名字用宣紙條
function renderSticks(R, surname) {
  const box = $("#slips");
  if (!lastCands.length) { box.innerHTML = `<p class="fine ink">你這樣限，我翻不到筆畫、五行都合的。要留的字換一個，不要的字少寫幾個，再叫我挑。</p>`; return; }
  const best = lastCands.filter(c => !c.own).reduce((a, c) => (!a || c.score > a.score ? c : a), null);
  box.innerHTML = lastCands.map((c, i) => `<button type="button" class="stick${c.own ? " own" : ""}${c === best ? " best" : ""}" data-i="${i}" style="--i:${i}" aria-label="${esc(c.name)}，${c.grade}${c === best ? "，這支最好" : ""}${c.own ? "，你帶來的" : ""}">
      <span class="sk-g">${c.grade}</span><span class="sk-n vt">${esc(c.given)}</span><span class="sk-s">${c.own ? "你的" : ""}</span></button>`).join("")
    + `<p class="sticks-tip">點一支籤，跟${R ? "原來的名字比比看" : "看整張批命"}</p>`;
  box.querySelectorAll(".stick").forEach(b => b.onclick = () => { sfx("paper"); showCompare(R, surname, lastCands[+b.dataset.i]); });
  if (!reduced) lastCands.forEach((_, i) => setTimeout(() => sfx("deal"), 120 + i * 90));
}
function showCompare(R, surname, cand) {
  const N = reading({ surname, given: [...cand.given], gender: S.gender, topic: S.topic, bazi: S.bazi });
  const back = () => showRename(R);
  if (!R) { showReading(N, { back }); return; }
  setPhase("compare"); pose("speak"); setBack(back);
  renderPaper({ split: { surname, given: [...cand.given] } });
  const better = N.score >= R.score;
  const line = better ? `<span class="q">${esc(N.name)}</span>比原來的好，差在哪裡，你看。` : `<span class="q">${esc(N.name)}</span>沒有比較好，你看就知道。`;
  speak(line);
  const TAG = { 用神: 3, 喜神: 2, 閒神: 1, 忌神: 0 };
  const rows = [
    ...["ren", "di", "zong", "wai"].map(k => [GRID_INFO[k].label, cellOf(R.wuge[k]), cellOf(N.wuge[k]), R.wuge[k].lv, N.wuge[k].lv]),
    ["三才", `${esc(R.sancai.key)}<br>${R.sancai.level}`, `${esc(N.sancai.key)}<br>${N.sancai.level}`, R.sancai.v, N.sancai.v],
  ];
  if (R.match) rows.push(["配八字", R.match.grids[0].tag, N.match.grids[0].tag, TAG[R.match.grids[0].tag], TAG[N.match.grids[0].tag]]);
  const win = (a, b) => a > b ? "win" : "";
  act.innerHTML = `${rtop("兩個名字比一比", "", line)}
    <div class="vs">
      <div class="vs-card${win(R.score, N.score) ? " win" : ""}"><span class="vs-tag">原名</span><p class="vs-n">${esc(R.name)}</p><p class="vs-g">${R.grade}</p></div>
      <div class="vs-card${win(N.score, R.score) ? " win" : ""}"><span class="vs-tag">新名</span><p class="vs-n">${esc(N.name)}</p><p class="vs-g">${N.grade}</p></div>
    </div>
    <div class="reading cmp-paper"><table class="cmp"><tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th><td class="${win(r[3], r[4])}">${r[1]}</td><td class="${win(r[4], r[3])}">${r[2]}</td></tr>`).join("")}</tbody></table>
    <section class="sec"><p class="pi"><span>${clauses(N.headline + "。")}</span></p><p class="bai">${prose(N.headlinePlain)}${prose(cand.reason || "")}</p></section></div>
    <button type="button" class="btn main wide" id="cFull">看${esc(N.name)}的整張批命</button>`;
  $("#cFull").onclick = () => showReading(N, { back: () => showCompare(R, surname, cand) });
}
const LVS = l => ({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[l] || l;
function doNaming() { S.topic = "all"; showRename(null); }

// ───────── 分享 ─────────
async function copy(txt, ok) {
  try { await navigator.clipboard.writeText(txt); toast(ok); }
  catch (_) { toast("這裡不給抄，長按文字複製"); }
}
function fullText(R) {
  return [`問名堂批命：${R.name}・${gtxt(R.gender)}`, `先生批：${R.grade}　${R.headline}`, (R.aiParts && R.aiParts.headline) || R.headlinePlain,
    ...R.sections.filter(s => s.key !== "bazi" && s.key !== "zodiac").map(s => `【${s.title}】\n批：${s.pi.join("")}\n白話：${(R.aiParts && R.aiParts[s.key]) || s.bai}`), "", "也去給先生看看你的名字：" + shareLink(R)].join("\n");
}
const ICON = {
  line: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.1-6C21.4 14.4 22 12.8 22 11c0-4.4-4.5-8-10-8Zm-3.6 10.4H6.4a.5.5 0 0 1-.5-.5V8.9a.5.5 0 0 1 1 0v3.5h1.5a.5.5 0 0 1 0 1Zm2 -.5a.5.5 0 0 1-1 0V8.9a.5.5 0 0 1 1 0v4Zm4.6 0a.5.5 0 0 1-.9.3l-2-2.8v2.5a.5.5 0 0 1-1 0V8.9a.5.5 0 0 1 .9-.3l2 2.8V8.9a.5.5 0 0 1 1 0v4Zm3.2-2.5a.5.5 0 0 1 0 1h-1.5v1h1.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5V8.9c0-.3.2-.5.5-.5h2a.5.5 0 0 1 0 1h-1.5v1h1.5Z"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.98-8.94a1.12 1.12 0 1 1 0 2.24 1.12 1.12 0 0 1 0-2.24ZM12 3.6c-2.28 0-2.57.01-3.46.05-.9.04-1.5.18-2.04.39a4.12 4.12 0 0 0-1.49.97 4.12 4.12 0 0 0-.97 1.49c-.21.54-.35 1.15-.39 2.04C3.61 9.43 3.6 9.72 3.6 12s.01 2.57.05 3.46c.04.9.18 1.5.39 2.04.21.55.5 1.02.97 1.49.47.47.94.76 1.49.97.54.21 1.15.35 2.04.39.89.04 1.18.05 3.46.05s2.57-.01 3.46-.05c.9-.04 1.5-.18 2.04-.39a4.12 4.12 0 0 0 1.49-.97c.47-.47.76-.94.97-1.49.21-.54.35-1.15.39-2.04.04-.89.05-1.18.05-3.46s-.01-2.57-.05-3.46c-.04-.9-.18-1.5-.39-2.04a4.12 4.12 0 0 0-.97-1.49 4.12 4.12 0 0 0-1.49-.97c-.54-.21-1.15-.35-2.04-.39C14.57 3.61 14.28 3.6 12 3.6Zm0 1.62c2.24 0 2.5.01 3.39.05.82.04 1.26.17 1.56.29.39.15.67.33.96.62.29.29.47.57.62.96.12.3.25.74.29 1.56.04.89.05 1.15.05 3.39s-.01 2.5-.05 3.39c-.04.82-.17 1.26-.29 1.56-.15.39-.33.67-.62.96-.29.29-.57.47-.96.62-.3.12-.74.25-1.56.29-.89.04-1.15.05-3.39.05s-2.5-.01-3.39-.05c-.82-.04-1.26-.17-1.56-.29a2.6 2.6 0 0 1-.96-.62 2.6 2.6 0 0 1-.62-.96c-.12-.3-.25-.74-.29-1.56-.04-.89-.05-1.15-.05-3.39s.01-2.5.05-3.39c.04-.82.17-1.26.29-1.56.15-.39.33-.67.62-.96.29-.29.57-.47.96-.62.3-.12.74-.25 1.56-.29.89-.04 1.15-.05 3.39-.05Z"/></svg>`,
  th: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.7 11.2c-.1 0-.2-.1-.3-.1-.2-3.2-2-5-4.9-5-1.8 0-3.2.8-4.1 2.1l1.6 1.1c.7-1 1.7-1.2 2.5-1.2 1 0 1.8.3 2.2.9.4.4.6 1 .7 1.7-.8-.1-1.7-.2-2.6-.1-2.6.1-4.3 1.7-4.2 3.8.1 1.1.6 2 1.5 2.6.8.5 1.8.8 2.8.7 1.4-.1 2.5-.6 3.2-1.6.6-.7.9-1.7 1-2.9.7.4 1.2.9 1.5 1.5.5 1.1.5 2.8-.9 4.2-1.2 1.2-2.7 1.8-4.9 1.8-2.5 0-4.4-.8-5.6-2.4-1.1-1.5-1.7-3.6-1.8-6.3.1-2.7.7-4.8 1.8-6.3C7.4 4.4 9.3 3.6 11.8 3.6c2.5 0 4.4.8 5.7 2.4.6.8 1.1 1.8 1.4 2.9l1.9-.5c-.4-1.4-1-2.6-1.8-3.6C17.4 2.7 15 1.7 11.8 1.7S6.2 2.7 4.6 4.7C3.2 6.5 2.5 9 2.4 12c.1 3 .8 5.5 2.2 7.3 1.6 2 4 3 7.2 3 2.8 0 4.8-.7 6.4-2.3 2.1-2.1 2-4.7 1.3-6.3-.5-1.1-1.4-2-2.8-2.5Zm-4.9 4.6c-1.1.1-2.3-.4-2.3-1.5-.1-.8.6-1.7 2.4-1.8h.6c.7 0 1.3.1 1.9.2-.2 2.4-1.4 3-2.6 3.1Z"/></svg>`,
};
async function openShare(R) {
  sfx("paper");
  const text = shareText(R), enc = encodeURIComponent;
  let link = shareLink(R), ready = false;
  const box = document.createElement("div");
  box.className = "share";
  box.innerHTML = `<div class="share-in f-slip" role="dialog" aria-modal="true" aria-labelledby="shH">
      <button type="button" class="share-x" id="shClose" aria-label="收起來">收</button>
      <p class="share-h" id="shH">這張批命，傳給朋友</p>
      <div class="share-pic og" id="shPic"><span>紅紙正在寫……</span></div>
      <p class="pic-tip" id="shTip">傳出去的連結會帶著這張批命卡</p>
      <button type="button" class="btn main wide" id="shMain" disabled>紅紙還在寫……</button>
      <div class="share-icons">
        <a class="sicon" id="toLine" target="_blank" rel="noopener">${ICON.line}<span>LINE</span></a>
        <a class="sicon" id="toFb" target="_blank" rel="noopener">${ICON.fb}<span>臉書</span></a>
        <a class="sicon" id="toTh" target="_blank" rel="noopener">${ICON.th}<span>Threads</span></a>
        <button type="button" class="sicon" id="toIg">${ICON.ig}<span>IG限動</span></button>
        <button type="button" class="sicon" id="shLink"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0Zm-2.8 5.3a4 4 0 0 1-2.8-6.8l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a2 2 0 0 0 2.8 2.8l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a4 4 0 0 1-2.8 1.2Zm8.5-5.7a1 1 0 0 1-.7-1.7l2.1-2.1a2 2 0 0 0-2.8-2.8l-2.1 2.1a1 1 0 1 1-1.4-1.4l2.1-2.1a4 4 0 0 1 5.6 5.6l-2.1 2.1a1 1 0 0 1-.7.3Z"/></svg><span>複製連結</span></button>
      </div>
      <p class="share-note">朋友在LINE、臉書看到的，就是上面這張卡，點進來就能寫自己的名字。你的生日不會傳出去。批命卡在問名堂放三十天。</p>
      <div class="share-more"><button type="button" class="opt small" id="shLong">${noDownload ? "看整張長圖" : "存整張長圖"}</button><button type="button" class="opt small" id="shText">抄整張批命</button></div>
    </div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add("on"));
  const onKey = e => { if (e.key === "Escape") close(); };
  const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 300); removeEventListener("keydown", onKey); };
  addEventListener("keydown", onKey);
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector("#shClose").onclick = close;
  const msg = () => text + "\n" + link;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  const setLinks = () => {
    // 手機：LINE 官方的「分享文字」，網址寫在文字裡一定跟著過去，LINE 照網址抓預覽卡
    // 電腦：line.me/R 要開 App，改用網頁版分享，只給網址（文字參數會讓網址被吃掉）
    box.querySelector("#toLine").href = mobile ? `https://line.me/R/share?text=${enc(msg())}` : `https://social-plugins.line.me/lineit/share?url=${enc(link)}`;
    box.querySelector("#toFb").href = `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`;
    box.querySelector("#toTh").href = `https://www.threads.com/intent/post?text=${enc(text)}&url=${enc(link)}`;
  };
  setLinks();
  // 批命卡還沒存好之前，按 LINE、臉書先擋一下，免得傳出去的是沒有圖的連結
  box.querySelectorAll(".share-icons a").forEach(a => a.addEventListener("click", e => { if (!ready) { e.preventDefault(); toast("紅紙還沒乾，等一下"); } }));
  box.querySelector("#shLink").onclick = () => ready ? copy(msg(), "連結抄好了，貼到LINE會帶著批命卡") : toast("紅紙還沒乾，等一下");
  box.querySelector("#shText").onclick = () => copy(fullText(R), "整張批命抄好了");
  const main = box.querySelector("#shMain");
  const canShareNative = navigator.share && !framed;
  const save = (u, name) => { const a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); toast("圖片存好了"); };
  const zoom = (u, long) => {
    const z = document.createElement("div"); z.className = "zoom" + (long ? " long" : "");
    z.innerHTML = long ? `<p>${noDownload ? "長按圖片可以存起來・點旁邊關起來" : "往下捲看整張・點旁邊關起來"}</p><img src="${u}" alt="">` : `<img src="${u}" alt=""><p>點一下關起來</p>`;
    z.onclick = e => { if (!long || e.target === z || e.target.tagName === "P") z.remove(); }; document.body.append(z);
  };
  // 1. 先生還在寫就等一下；畫預覽卡、存到 Worker，換成帶圖的連結
  const pend = readingPending(R);
  if (pend) {
    box.querySelector("#shPic").innerHTML = `<span>先生還在寫，寫好就貼上紅紙……</span>`;
    await Promise.race([pend.catch(() => {}), sleep(30000)]);
    if (!box.isConnected) return;
  }
  try {
    const og = await drawOgCard(R);
    const ogUrl = URL.createObjectURL(await cardBlob(og));
    box.querySelector("#shPic").innerHTML = `<button type="button" class="pic-zoom" aria-label="放大看批命卡"><img src="${ogUrl}" alt="${esc(R.name)}的批命卡：${R.grade}，${esc(R.headline)}"></button>`;
    box.querySelector(".pic-zoom").onclick = () => zoom(ogUrl, false);
    const u = await uploadCard(R, og);
    if (u) link = u;
    else box.querySelector("#shTip").textContent = "紅紙沒貼上去，連結照樣能傳；圖用下面「存整張長圖」另外傳。";
  } catch (_) { box.querySelector("#shPic").innerHTML = `<span>紅紙沒寫成，用下面的連結分享也一樣。</span>`; }
  if (!box.isConnected) return;
  ready = true; setLinks();
  main.disabled = false;
  main.textContent = canShareNative ? "傳給朋友" : "複製連結";
  // 文字和網址分開給，LINE 等 App 常只收文字、網址被丟掉；網址直接寫進文字裡
  main.onclick = canShareNative ? async () => { try { await navigator.share({ title: "問名堂", text: msg() }); } catch (_) {} } : () => copy(msg(), "連結抄好了，貼到LINE會帶著批命卡");
  // 2. 整張長圖：另外存、另外傳（IG、相簿）
  let longP = null;
  const getLong = () => longP || (longP = drawLongCard(R).then(cardBlob));
  box.querySelector("#shLong").onclick = async () => {
    try {
      const blob = await getLong(), u = URL.createObjectURL(blob), fname = `問名堂_${R.name}.png`;
      if (noDownload) return zoom(u, true);
      const file = new File([blob], fname, { type: "image/png" });
      if (canShareNative && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (_) {} return; }
      save(u, fname);
    } catch (_) { toast("長圖沒畫成，再按一次"); }
  };
  // 3. IG 限動：IG 沒有網頁分享連結。先抄好連結（給限動的「連結」貼紙），再把 9:16 限動圖交給系統分享選 IG；
  //    不能分享檔案就存下來；在 App 內建瀏覽器裡不能存，就放大讓人長按存圖
  let storyP = null;
  const getStory = () => storyP || (storyP = drawCard(R, true).then(cardBlob));
  getStory().catch(() => {});
  box.querySelector("#toIg").onclick = async () => {
    if (!ready) return toast("紅紙還沒乾，等一下");
    try { await navigator.clipboard.writeText(link); } catch (_) {}
    try {
      const blob = await getStory(), fname = `問名堂_${R.name}_限動.png`, u = URL.createObjectURL(blob);
      if (noDownload) { zoom(u, true); return toast("長按存圖，到IG發限動；連結已抄好，可貼在連結貼紙"); }
      const file = new File([blob], fname, { type: "image/png" });
      if (canShareNative && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); toast("選IG發限動；連結已抄好，可貼在連結貼紙"); } catch (_) {}
        return;
      }
      save(u, fname); toast("限動圖存好了，連結也抄好了");
    } catch (_) { toast("限動圖沒畫成，再按一次"); }
  };
}

// 朋友傳來的連結：#n=名字&g=m|f&s=姓氏字數&t=所問&b=1（原批有配八字）
// 朋友這邊沒有生日，細項照名字筆畫重算；評等與判詞用連結帶來的（gr、h），跟分享卡上的一致
function incoming() {
  const q = new URLSearchParams(location.hash.length > 1 ? location.hash.slice(1) : location.search);
  const n = [...(q.get("n") || "")].filter(c => /\p{Script=Han}/u.test(c));
  if (n.length < 2 || n.length > 5) return null;
  const g = q.get("g") === "f" ? "f" : "m";
  const t = TOPICS.some(x => x[0] === q.get("t")) ? q.get("t") : "all";
  const sl = q.get("s") === "2" ? 2 : 1;
  const gr = GRADES.includes(q.get("gr")) ? q.get("gr") : null;
  const h = /^[\p{Script=Han}，]{4,24}$/u.test(q.get("h") || "") ? q.get("h") : null;
  return { chars: n, name: n.join(""), g, t, sl, bazi: q.get("b") === "1", gr, h };
}
const friend = incoming();
async function showFriend(x) {
  await ready;
  setPhase("seat"); pose("speak"); setBack(null);
  S.mode = "read"; S.chars = [...x.chars]; S.surnameLen = x.sl; S.gender = x.g; S.topic = x.t; S.birth = null; S.bazi = null;
  const sp = currentSplit();
  const R0 = reading({ surname: sp.surname, given: sp.given, gender: x.g, topic: x.t, bazi: null });
  renderPaper(); $("#seal").classList.add("on");
  speak(`剛剛有人拿「${esc(x.name)}」來給我看。<span class="q">換你了，坐。</span>`);
  const keys = keyLines(R0);
  // 評等、判詞跟分享卡一致：用連結帶來的；舊連結沒帶就用重算的
  const G = x.gr || R0.grade, H = x.h || (G === R0.grade ? R0.headline : null), same = G === R0.grade;
  const diff = x.bazi && !same ? `他那張有配八字，批到${G}。生日沒有傳過來，底下只照名字筆畫看，是${R0.grade}。` : "";
  act.innerHTML = `<div class="hero friend">
      <div class="score">${esc(x.name)}・${gtxt(x.g)}</div>
      <div class="grade">${G}</div>
      ${H ? `<div class="hl">${clauses(H + "。")}</div>` : ""}
      ${same && !x.bazi ? `<div class="hlp">${prose(R0.headlinePlain)}</div>` : ""}
    </div>
    <div class="grid5">${gridTiles(R0, false)}</div>
    <div class="keys f-slip">
      ${keys.map(k => `<div class="key"><p class="key-l">${k.label}<small>${k.grid}${han(k.n)}・${k.lvName}</small></p><p class="key-t">${prose(k.text)}</p></div>`).join("")}
      <div class="key"><p class="key-l">先生總說</p><p class="key-t">${prose(summaryLine(R0))}</p></div>
      ${x.bazi ? `<p class="key-note">${diff || "他那張有配八字，這裡只照名字筆畫看。"}</p>` : ""}
    </div>
    <button type="button" class="prop red seat-main" data-m="read"><span class="in"><span class="t">換我看名字</span><span class="s">寫下你的名字，先生算給你看</span></span></button>
    <div class="seat-sub"><button type="button" class="opt small" id="seeFriend">看${esc(x.name)}的整張批命</button></div>`;
  act.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { S.mode = b.dataset.m; S.chars = []; S.surnameLen = null; askName(); });
  $("#seeFriend").onclick = () => showReading(R0, { friend: true, back: () => showFriend(x), say: x.bazi ? (same ? `他那張有配八字，<span class="q">我這裡只看名字。</span>` : `他那張配了八字，批到${G}。<span class="q">我這裡只看名字，是${R0.grade}。</span>`) : null });
  history.replaceState(null, "", location.pathname);
}

// ───────── 上回的批命 ─────────
function refreshHistory() {
  const h = store.get("history", []), btn = $("#historyBtn");
  btn.hidden = !h.length;
  btn.onclick = () => {
    setPhase("seat"); pose("speak"); setBack(seat);
    S.chars = []; renderPaper();
    speak(`之前看過的，都在這。`);
    const day = t => { const d = new Date(t); return `${num(d.getMonth() + 1)}月${num(d.getDate())}日`; };
    act.innerHTML = `<div class="hist">${h.map((x, i) => `<button type="button" class="hist-row f-slip" data-i="${i}" style="--i:${i}"><b>${esc(x.name)}</b><span class="hg">${x.grade}</span><small>${gtxt(x.gender)}${x.birth ? "・有配八字" : ""}${x.t ? "・" + day(x.t) : ""}</small></button>`).join("")}</div>`;
    act.querySelectorAll("[data-i]").forEach(b => b.onclick = async () => {
      const x = h[+b.dataset.i];
      await ready;
      S.mode = "read"; S.chars = [...x.name]; S.surnameLen = x.surnameLen; S.gender = x.gender; S.topic = x.topic || "all"; S.birth = x.birth; S.bazi = null;
      if (x.birth) { await loadLunar(); S.bazi = computeBazi({ ...x.birth, place: PLACES.find(p => p[0] === x.birth.place) }, L); }
      const sp = currentSplit();
      showReading(reading({ surname: sp.surname, given: sp.given, gender: S.gender, topic: S.topic, bazi: S.bazi }), { back: () => btn.onclick() });
    });
  };
}

// ───────── 聲音、特效 ─────────
const soundBtn = $("#soundBtn");
const syncSound = () => { const v = soundOn(); soundBtn.setAttribute("aria-pressed", v); soundBtn.textContent = v ? "聲音・開" : "聲音・關"; };
soundBtn.onclick = () => { setSound(!soundOn()); syncSound(); if (soundOn()) setTimeout(() => sfx("tap"), 60); };
syncSound();
// 一般按鈕都有木頭輕叩聲；木牌、招牌、紅紙另有專屬聲音
document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || b.disabled || b.matches(".tk, .sign, .stick, #soundBtn")) return;
  sfx("tap");
}, true);
particles($("#fx"), () => app.dataset.orient);
riseOnChange(act);

// ───────── 開場：等字典、廟埕、老師傅都載好，按「入座」才進場（同時解鎖聲音） ─────────
const introBar = $("#introBar"), enterBtn = $("#enter");
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; });
const jobs = [ready, loadImg(innerWidth >= 900 && innerWidth / innerHeight > 1.05 ? "assets/scene/bg-wide.webp" : "assets/scene/bg.webp"), loadImg("assets/master/speak.webp"), loadImg("assets/props/table.webp"), loadImg("assets/ui/wood.webp"), document.fonts?.load("700 20px 'WM Kai'", "問名堂入座") || 0];
let doneN = 0;
jobs.forEach(j => Promise.resolve(j).then(() => { doneN++; introBar.style.width = Math.round(doneN / jobs.length * 100) + "%"; }, () => {}));
Promise.all(jobs).then(() => { enterBtn.disabled = false; $("#introLoad").classList.add("done"); }).catch(() => { $(".intro-line").textContent = "字典沒翻開，重新整理一下再來。"; });
enterBtn.onclick = () => {
  $("#intro").classList.add("out"); sfx("bell");
  setTimeout(() => $("#intro").remove(), 900);
  friend ? showFriend(friend) : seat();
};
}
