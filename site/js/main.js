// 問名堂：介面流程（手機優先；插畫舞台＋底部木桌操作區）
import { initChars, initNames, initGivenNames, kangxi, tradOptions } from "./engine/chars.js";
import { splitName } from "./engine/wuge.js";
import { computeBazi, ZHI } from "./engine/bazi.js";
import { reading, han } from "./engine/reading.js";
import { evaluate, GRID_INFO, GRID_KEYS } from "./engine/analyze.js";
import { suggestNames } from "./engine/rename.js";
import { PLACES, TOPICS, COMPOUND, AMBIGUOUS } from "./data/misc.js";
import { slot, preload } from "./assets.js";
import { aiAvailable, aiReading } from "./ai.js";
import { sfx, soundOn, setSound } from "./sfx.js";
import { particles, crossfade, typeHTML, riseOnChange, pulse, reduced } from "./fx.js";
{
const $ = s => document.querySelector(s);
const app = $("#app"), say = $("#say"), act = $("#act"), sheet = $("#sheet"), paper = $("#paper"), paperText = $("#paperText"), canvas = $("#canvas"), viewport = $("#viewport");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let fast = false;
const sleep = ms => new Promise(r => setTimeout(r, fast ? Math.min(ms, 30) : ms));
const load = f => fetch("js/data/" + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("wenming:" + k)) ?? d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("wenming:" + k, JSON.stringify(v)); } catch (_) {} },
};
const S = { mode: "read", chars: [], surnameLen: null, gender: null, birth: null, bazi: null, topic: "all", R: null, view: store.get("view", "both") };
const ready = initChars(load);
let L = null;

// ───────── 舞台：素材插槽與縮放 ─────────
$("#slotBrush").innerHTML = slot("props/brush");
$("#slotToken").innerHTML = slot("props/token");
$("#slotTable").innerHTML = slot("props/table");
preload(["master/speak", "master/count", "master/approve", "master/frown"]);
function pose(p) {
  const holder = $("#slotMaster .slot"), src = `assets/master/${p === "write" ? "count" : p}.webp`;
  if (holder) crossfade(holder, src);
  else $("#slotMaster").innerHTML = slot("master/" + p);
}
pose("idle");

function layout() {
  const land = innerWidth >= 900 && innerWidth / innerHeight > 1.05;
  app.dataset.orient = land ? "land" : "port";
  const key = land ? "scene/bg-wide" : "scene/bg";
  if ($("#slotBg").dataset.k !== key) { $("#slotBg").innerHTML = slot(key); $("#slotBg").dataset.k = key; }
  const W = viewport.clientWidth, H = viewport.clientHeight;
  const cw = land ? 512 : 384, ch = land ? 512 : 688;
  const s = Math.max(W / cw, H / ch);
  const x = (W - cw * s) / 2;
  let y;
  if (land) y = (H - ch * s) / 2;
  else {
    // 直式：把錨點對齊操作區上緣。平常錨在桌布上緣（y=488），露出桌面與老師傅；
    // 批命等長頁只留一條窄縫，錨在老師傅下巴（y=258），讓臉露出來。
    const sheetTop = sheet.getBoundingClientRect().top;
    // 生辰帖這類高操作區：錨在老師傅胸口（y=300），整張臉留在縫裡
    // 舞台露出不到 330px（小螢幕或操作區很高）時，對話改寫進操作區，錨點移到老師傅胸口
    const tall = sheetTop - (app.querySelector(".top").offsetHeight) < 330 || sheetTop < innerHeight * 0.48;
    const anchor = /^(reading|rename|compare)$/.test(app.dataset.phase) ? 288 : tall ? 300 : 488;
    y = Math.max(sheetTop - ch * s, Math.min(0, sheetTop - anchor * s));
  }
  const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
  if (canvas.style.transform !== tf) canvas.style.transform = tf;
  // 畫面看得到的畫布左右邊界（畫布座標）：瘦長手機會裁掉畫布兩側，紅紙、毛筆據此往內收
  canvas.style.setProperty("--vl", Math.max(0, -x / s).toFixed(1) + "px");
  canvas.style.setProperty("--vr", Math.min(cw, (W - x) / s).toFixed(1) + "px");
  app.classList.toggle("tall", !land && (sheet.getBoundingClientRect().top - app.querySelector(".top").offsetHeight < 330 || sheet.getBoundingClientRect().top < innerHeight * 0.48));
}
let raf = 0;
const relayout = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };
new ResizeObserver(relayout).observe(sheet);
addEventListener("resize", relayout);
new ResizeObserver(relayout).observe(viewport);
layout();

function setPhase(p) {
  app.dataset.phase = p;
  sheet.scrollTop = 0;
  relayout();
}
function speak(html) {
  if (say.dataset.last === html) return;
  say.dataset.last = html;
  typeHTML(say, html); typeHTML($("#sayIn"), html);
  $("#sayLive").textContent = html.replace(/<[^>]+>/g, "");
  pulse(say, "pop", 400);
}
function toast(msg) { const t = document.createElement("div"); t.className = "toast f-slip"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }

// ───────── 紅紙 ─────────
function currentSplit() {
  if (S.mode === "name") return { surname: S.chars, given: [] };
  if (S.chars.length < 2) return { surname: S.chars, given: [] };
  return splitName(S.chars, S.surnameLen);
}
function renderPaper(opts = {}) {
  const { surname, given } = opts.split || currentSplit();
  paper.classList.toggle("empty", !surname.length);
  const cell = (ch, i) => `<span class="c${opts.newIndex === i ? " new" : ""}">${esc(ch)}<span class="n"></span><span class="rs"></span></span>`;
  let html = surname.map(cell).join("");
  if (given.length) html += `<span class="split" aria-hidden="true"></span>` + given.map((c, i) => cell(c, surname.length + i)).join("");
  paperText.innerHTML = html;
  const n = surname.length + given.length;
  paperText.style.fontSize = n >= 5 ? "36px" : n === 4 ? "42px" : "48px";
  $("#seal").classList.remove("on");
}

// ───────── 入座 ─────────
function seat() {
  setPhase("seat"); pose("idle");
  S.chars = []; S.surnameLen = null; S.R = null; renderPaper(); $("#slotToken").classList.remove("on");
  speak(store.get("visited", false) ? `又來啦，坐。<span class="q">今天看誰的名字？</span>` : `來，坐。<span class="q">要看名字，還是幫小孩取名？</span>`);
  store.set("visited", true);
  act.innerHTML = `<div class="props">
      <button type="button" class="prop f-wood" data-m="read"><span class="in"><span class="t">看名字</span><span class="s">現在的名字</span></span></button>
      <button type="button" class="prop red" data-m="name"><span class="in"><span class="t">幫小孩取名</span><span class="s">給姓和生日</span></span></button>
    </div>`;
  act.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { S.mode = b.dataset.m; askName(); });
  refreshHistory();
}

// ───────── 報名 ─────────
function askName() {
  setPhase("name"); pose("speak");
  speak(S.mode === "name" ? `小孩<span class="q">姓什麼？</span>寫在紅紙上。` : `名字寫給我看，<span class="q">寫全名。</span>`);
  act.innerHTML = `<form class="pen" id="penForm" autocomplete="off">
      <label class="h" for="nameIn">${S.mode === "name" ? "姓氏" : "全名"}</label>
      <input id="nameIn" maxlength="${S.mode === "name" ? 2 : 5}" enterkeyhint="done" placeholder="${S.mode === "name" ? "例如：林" : "例如：林家豪"}" value="${esc(S.chars.join(""))}">
      <div id="nameNote"></div>
      <div class="row"><button type="button" class="btn ghost" id="backSeat">先不了</button><button type="submit" class="btn main" id="nameOk" disabled>就這個名字</button></div>
    </form>`;
  const inp = $("#nameIn");
  inp.oninput = () => onNameInput(inp.value);
  $("#penForm").onsubmit = e => { e.preventDefault(); if (!$("#nameOk").disabled) askGender(); };
  $("#backSeat").onclick = seat;
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
  S.chars = chars;
  if (chars.length !== prev) S.surnameLen = null;
  renderPaper({ newIndex: chars.length > prev ? chars.length - 1 : -1 });
  if (chars.length > prev) sfx("brush");
  let html = "";
  if (conv.length) html += `<p class="fine">姓名學以康熙繁體為準，紅紙上已寫成正體。</p>`;
  for (const m of multi) html += `<p class="fine">是哪一個字？</p><div class="opts">${m.opts.map(o => `<button type="button" class="opt" data-i="${m.i}" data-c="${esc(o)}" aria-pressed="${S.chars[m.i] === o}">${esc(o)}</button>`).join("")}</div>`;
  if (unknown.length) html += `<p class="fine">「${esc(unknown.join("、"))}」字典查不到，筆畫不敢亂算，換個寫法試試。</p>`;
  const sp = currentSplit();
  if (S.mode === "read" && chars.length >= 3) {
    const two = chars.slice(0, 2).join("");
    if (COMPOUND.includes(two) || S.surnameLen) html += `<p class="fine">${AMBIGUOUS.has(two) && !S.surnameLen ? `「${esc(two)}」是複姓嗎？` : "姓氏是："}</p><div class="opts">
      <button type="button" class="opt" data-sl="1" aria-pressed="${sp.surname.length === 1}">${esc(chars[0])}</button>
      <button type="button" class="opt" data-sl="2" aria-pressed="${sp.surname.length === 2}">${esc(two)}</button></div>`;
  }
  const note = $("#nameNote"); note.innerHTML = html;
  note.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { S.chars[+b.dataset.i] = b.dataset.c; onNameInput(S.chars.join("")); });
  note.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { S.surnameLen = +b.dataset.sl; onNameInput(S.chars.join("")); });
  $("#nameOk").disabled = !(!unknown.length && (S.mode === "name" ? chars.length >= 1 && chars.length <= 2 : chars.length >= 2 && chars.length <= 5));
}

// ───────── 乾坤 ─────────
function askGender() {
  setPhase("qiankun"); pose("speak");
  speak(S.mode === "name" ? `<span class="q">男孩還是女孩？</span>還不知道就先選一個。` : `<span class="q">男命還女命？</span>男女算法不一樣。`);
  act.innerHTML = `<div class="tokens" role="group" aria-label="乾坤">
      <button type="button" class="tk" data-g="m" aria-pressed="${S.gender === "m"}"><span class="face"><span class="vt">乾造</span></span><span class="s">男命</span></button>
      <button type="button" class="tk" data-g="f" aria-pressed="${S.gender === "f"}"><span class="face"><span class="vt">坤造</span></span><span class="s">女命</span></button>
    </div><div class="row"><button type="button" class="btn ghost" id="backName">改名字</button></div>`;
  act.querySelectorAll("[data-g]").forEach(b => b.onclick = async () => {
    if (act.dataset.busy) return; act.dataset.busy = 1;
    S.gender = b.dataset.g; b.setAttribute("aria-pressed", "true"); b.classList.add("pick"); sfx("wood");
    $("#slotToken").classList.add("on"); pulse($("#slotToken"), "drop", 600);
    await sleep(520); delete act.dataset.busy; askBirth();
  });
  $("#backName").onclick = askName;
}

// ───────── 生辰 ─────────
async function loadLunar() {
  if (L) return L;
  await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/lunar.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
  L = { Solar: window.Solar, Lunar: window.Lunar, LunarMonth: window.LunarMonth, LunarYear: window.LunarYear };
  return L;
}
function askBirth() {
  setPhase("birth"); pose("speak");
  speak(S.mode === "name" ? `小孩<span class="q">幾月幾號生的？</span>還沒生，預產期也可以。` : `<span class="q">生日給我，</span>配八字看較準。不給也可以看。`);
  act.innerHTML = `<div class="props">
      <button type="button" class="prop red" id="giveCard"><span class="in"><span class="t">給生日</span><span class="s">加看八字、生肖</span></span></button>
      <button type="button" class="prop f-wood" id="noCard"><span class="in"><span class="t">先不用</span><span class="s">只看名字筆畫</span></span></button>
    </div>`;
  loadLunar().catch(() => {});
  $("#giveCard").onclick = openBirthCard;
  $("#noCard").onclick = () => { S.birth = null; S.bazi = null; S.mode === "name" ? doNaming() : askTopic(); };
}
const lunarDay = d => d === 10 ? "初十" : d === 20 ? "二十" : d === 30 ? "三十" : ["初", "十", "廿"][Math.floor((d - 1) / 10)] + "一二三四五六七八九"[(d - 1) % 10];
function openBirthCard() {
  speak(`國曆農曆都可以。<span class="q">幾點生的知道嗎？</span>不知道就排三柱。`);
  act.innerHTML = `<form class="birth" id="birthForm" autocomplete="off">
      <div class="seg" role="group" aria-label="曆法"><button type="button" data-cal="solar">國曆</button><button type="button" data-cal="lunar">農曆</button></div>
      <div class="wheels">
        <label>年<select id="bY"></select></label><label>月<select id="bM"></select></label><label>日<select id="bD"></select></label>
      </div>
      <label class="leap" hidden><input type="checkbox" id="bLeap"> 閏月</label>
      <div class="wheels"><label class="w2">時辰<select id="bH"></select></label><label>分<select id="bMi"></select></label></div>
      <label>出生地<select id="bP"></select></label>
      <details><summary>夜裡 11 點後出生？</summary>
        <div class="seg" role="group" aria-label="子時換日"><button type="button" data-zi="early">23 點起算隔天</button><button type="button" data-zi="split">0 點才換日</button></div>
        <p class="fine" style="color:#ffe2c4;margin-top:6px">兩派算法不同。預設 23 點起算隔天的子時。</p>
      </details>
      <p class="preview" id="bPreview"></p>
      <div class="row"><button type="button" class="btn ghost" id="bCancel">先不用</button><button type="submit" class="btn main">好，就這天</button></div>
    </form>`;
  sfx("paper");
  const f = $("#birthForm"), Y = $("#bY"), M = $("#bM"), D = $("#bD"), H = $("#bH"), Mi = $("#bMi"), P = $("#bP"), leap = f.querySelector(".leap");
  const prev = S.birth || store.get("birth", null);
  let cal = prev?.calendar || "solar", zi = prev?.ziRule || "early";
  const nowY = new Date().getFullYear();
  Y.innerHTML = Array.from({ length: nowY + 2 - 1920 + 1 }, (_, i) => nowY + 2 - i).map(y => `<option value="${y}">${y}・${y > 1911 ? "民" + (y - 1911) : "民前" + (1912 - y)}</option>`).join("");
  M.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  H.innerHTML = `<option value="">不知時辰</option>` + Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")} 點（${ZHI[Math.floor((h + 1) / 2) % 12]}時）</option>`).join("");
  Mi.innerHTML = Array.from({ length: 60 }, (_, m) => `<option value="${m}">${String(m).padStart(2, "0")}</option>`).join("");
  P.innerHTML = `<optgroup label="臺灣">${PLACES.filter(p => p[2] === "Asia/Taipei").map(p => `<option>${p[0]}</option>`).join("")}</optgroup><optgroup label="海外">${PLACES.filter(p => p[2] !== "Asia/Taipei").map(p => `<option>${p[0]}</option>`).join("")}</optgroup>`;
  Y.value = prev?.y || (S.mode === "name" ? nowY : 1990); M.value = prev?.m || 1; P.value = prev?.place || "臺北市";
  H.value = prev && prev.h !== null && prev.h !== undefined ? prev.h : ""; Mi.value = prev?.mi || 0;
  const fillDays = () => {
    const y = +Y.value, m = +M.value; let n = 31;
    if (cal === "solar") n = new Date(y, m, 0).getDate();
    else if (L) {
      const lm = L.LunarYear.fromYear(y).getLeapMonth();
      leap.hidden = lm !== m; if (lm !== m) $("#bLeap").checked = false;
      try { n = L.LunarMonth.fromYm(y, $("#bLeap").checked ? -m : m).getDayCount(); } catch (_) { n = 30; }
    } else n = 30;
    const keep = +D.value || prev?.d || 1;
    D.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${cal === "lunar" ? lunarDay(i + 1) : i + 1}</option>`).join("");
    D.value = Math.min(keep, n);
  };
  const input = () => ({ calendar: cal, y: +Y.value, m: +M.value, d: +D.value, leap: cal === "lunar" && $("#bLeap").checked, h: H.value === "" ? null : +H.value, mi: +Mi.value, place: P.value, ziRule: zi });
  const placeOf = n => PLACES.find(p => p[0] === n);
  const update = async () => {
    Mi.disabled = H.value === "";
    const pv = $("#bPreview");
    try {
      await loadLunar();
      const inp = input(), b = computeBazi({ ...inp, place: placeOf(inp.place) }, L), ts = b.trueSolar;
      const dst = ts && placeOf(inp.place)[2] === "Asia/Taipei" && ts.offsetHours === 9;
      pv.innerHTML = `${b.pillars.map(p => p.gz).join("　")}<small>${b.lunarText.replace("腊", "臘")}${ts ? `・真太陽時 ${String(ts.h).padStart(2, "0")}:${String(ts.mi).padStart(2, "0")}（${ts.shiftMin >= 0 ? "+" : ""}${ts.shiftMin} 分${dst ? "，當年實施日光節約時間" : ""}）` : "・不知時辰，排三柱"}</small>`;
    } catch (_) { pv.textContent = "萬年曆翻不到這一天，換一天看看。"; }
  };
  const setCal = async c => { cal = c; f.querySelectorAll("[data-cal]").forEach(b => b.setAttribute("aria-pressed", b.dataset.cal === c)); leap.hidden = true; if (c === "lunar") await loadLunar().catch(() => {}); fillDays(); update(); };
  const setZi = z => { zi = z; f.querySelectorAll("[data-zi]").forEach(b => b.setAttribute("aria-pressed", b.dataset.zi === z)); update(); };
  f.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => setCal(b.dataset.cal));
  f.querySelectorAll("[data-zi]").forEach(b => b.onclick = () => setZi(b.dataset.zi));
  [Y, M].forEach(el => el.onchange = () => { fillDays(); update(); });
  $("#bLeap").onchange = () => { fillDays(); update(); };
  [D, H, Mi, P].forEach(el => el.onchange = update);
  $("#bCancel").onclick = () => { S.birth = null; S.bazi = null; S.mode === "name" ? doNaming() : askTopic(); };
  f.onsubmit = async e => {
    e.preventDefault();
    try {
      await loadLunar();
      S.birth = input(); store.set("birth", S.birth); sfx("paper");
      S.bazi = computeBazi({ ...S.birth, place: placeOf(S.birth.place) }, L);
      S.mode === "name" ? doNaming() : askTopic();
    } catch (_) { toast("萬年曆查不到這天，換一天試試"); }
  };
  setCal(cal); setZi(zi);
}

// ───────── 問事（招牌） ─────────
function askTopic() {
  setPhase("topic"); pose("speak");
  speak(`<span class="q">要問哪方面？</span>都不選，我就整體看。`);
  act.innerHTML = `<div class="signs" role="group" aria-label="招牌">${TOPICS.map(([k, t]) => `<button type="button" class="sign" data-t="${k}" aria-pressed="${S.topic === k}"><span class="t vt">${t}</span></button>`).join("")}</div>
    <button type="button" class="btn main wide" id="goCount">請先生算</button>`;
  act.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.topic = b.dataset.t; act.querySelectorAll(".sign").forEach(x => x.setAttribute("aria-pressed", x === b)); sfx("chime"); pulse(b, "swing", 1200); });
  $("#goCount").onclick = count;
}

// ───────── 數筆畫 ─────────
async function count() {
  setPhase("count"); pose("count"); fast = false;
  const sp = currentSplit();
  const R = reading({ surname: sp.surname, given: sp.given, gender: S.gender, topic: S.topic, bazi: S.bazi });
  S.R = R;
  const skip = document.createElement("button"); skip.className = "btn ghost skip"; skip.textContent = "快些"; skip.onclick = () => { fast = true; skip.remove(); };
  document.body.append(skip);
  speak(`我算給你看，<span class="q">筆畫照康熙字典。</span>`);
  act.innerHTML = `<div class="grid5" id="grid5">${gridTiles(R, true)}</div><p class="sancai pending" id="scLine" style="opacity:0">三才 ${R.sancai.key.split("").join("・")}　${R.sancai.level}</p><div id="countBazi"></div>`;
  renderPaper();
  const cells = [...paperText.querySelectorAll(".c")];
  for (const [i, el] of cells.entries()) {
    const c = R.chars[i];
    el.classList.add("lit"); sfx("tick", 0.92 + i * 0.07);
    if (c.restore) { el.querySelector(".rs").textContent = `${c.restore.from}→${c.restore.to}`; el.classList.add("restoring"); sfx("brush"); await sleep(650); }
    el.querySelector(".n").textContent = c.strokes;
    el.classList.add("shown");
    await sleep(380);
  }
  if (sp.surname.length === 1) paperText.insertAdjacentHTML("afterbegin", `<span class="v" title="虛筆一畫">虛一</span>`);
  if (sp.given.length === 1) paperText.insertAdjacentHTML("beforeend", `<span class="v" title="虛筆一畫">虛一</span>`);
  await sleep(250);
  for (const [j, k] of GRID_KEYS.entries()) { act.querySelector(`.g[data-k=${k}]`).classList.remove("pending"); sfx("tick", 1.2 + j * 0.05); await sleep(330); }
  $("#scLine").style.opacity = 1;
  await sleep(500);
  if (R.bazi) {
    speak(`再對一下八字。`);
    $("#countBazi").innerHTML = baziBlock(R.bazi);
    await sleep(60);
    $("#countBazi").querySelectorAll(".bar b").forEach(b => b.style.width = b.dataset.w);
    await sleep(1300);
  }
  $("#seal").classList.add("on"); sfx("stamp"); pulse(viewport, "shake", 380);
  await sleep(600);
  skip.remove();
  S.justCounted = true;
  const hist = store.get("history", []).filter(h => h.name !== R.name);
  hist.unshift({ name: R.name, surnameLen: R.surname.length, gender: S.gender, birth: S.birth, topic: S.topic, grade: R.grade, t: Date.now() });
  store.set("history", hist.slice(0, 8));
  showReading(R);
}

function gridTiles(R, pending, asButtons = false) {
  return GRID_KEYS.map(k => {
    const g = R.wuge[k], cls = g.lv >= 1 ? "good" : g.lv <= -1 ? "bad" : "";
    const tag = asButtons ? "button" : "div";
    return `<${tag} ${asButtons ? 'type="button"' : ""} class="g${pending ? " pending" : ""}" data-k="${k}" aria-label="${GRID_INFO[k].label} ${g.n} 畫，${g.el}，${g.level}"><span class="k">${GRID_INFO[k].label}</span><span class="num">${g.n}</span><span class="el e-${g.el}">${g.el}</span><span class="lv ${cls}">${g.level}</span></${tag}>`;
  }).join("");
}
function baziBlock(b) {
  const max = Math.max(...Object.values(b.share));
  const colors = { 木: "#4f8a5b", 火: "#c4432f", 土: "#a5803e", 金: "#c4b8a2", 水: "#3d6f9a" };
  return `<div class="pillars">${b.pillars.map(p => `<div class="pillar"><span>${p.name}柱</span><b>${p.gz}</b><span>${p.ganGod}</span></div>`).join("")}</div>
    <div class="bars">${"木火土金水".split("").map(e => `<div class="bar${e === b.yong ? " yong" : ""}"><span>${e}</span><i><b style="background:${colors[e]}" data-w="${Math.round(b.share[e] / max * 100)}%"></b></i><em>${Math.round(b.share[e] * 100)}%</em></div>`).join("")}</div>`;
}

// ───────── 批命 ─────────
function showReading(R, opts = {}) {
  setPhase("reading");
  pose(R.renameAdvised ? "frown" : "approve");
  renderPaper({ split: { surname: [...R.surname], given: [...R.given] } });
  paperText.querySelectorAll(".c").forEach((el, i) => { el.classList.add("shown"); el.querySelector(".n").textContent = R.chars[i].strokes; });
  $("#seal").classList.add("on");
  speak(R.renameAdvised ? `這個名字喔……<span class="q">我老實講。</span>` : R.grade === "上上" || R.grade === "上" ? `<span class="q">這名字不錯。</span>你看看。` : `<span class="q">還可以，</span>有幾個所在要注意。`);
  const view = S.view;
  if (S.justCounted) { S.justCounted = false; setTimeout(() => sfx("bell"), 120); }
  setTimeout(() => sfx("paper"), 260);
  act.innerHTML = `
    <div class="rhead"><span class="who">${esc(R.name)}<small>${R.gender === "f" ? "坤造" : "乾造"}</small></span>
      <span class="mode" role="group" aria-label="解讀顯示"><button type="button" data-v="both">對照</button><button type="button" data-v="pi">批語</button><button type="button" data-v="bai">白話</button></span></div>
    ${opts.back ? `<div class="row" style="justify-content:flex-start"><button type="button" class="btn ghost" id="backCmp">回到候選名</button></div>` : ""}
    <div class="hero">
      <div class="grade">${R.grade}</div>
      <div class="score">${han(R.score)}分</div>
      <div class="hl">${esc(R.headline)}</div>
      <div class="hlp">${esc(R.headlinePlain)}</div>
    </div>
    <div class="grid5" id="grid5">${gridTiles(R, false, true)}</div>
    <p class="sancai">三才 ${R.sancai.key.split("").join("・")}　${R.sancai.level}</p>
    <article class="reading" id="readingBody" data-mode="${view}">
      ${R.sections.map(s => `<section class="sec" id="sec-${s.key}" data-k="${s.key}"><h3>${esc(s.title)}</h3>${s.key === "bazi" ? baziBlock(R.bazi) : ""}<p class="pi">${s.pi.map(l => `<span>${esc(l)}</span>`).join("")}</p><p class="bai">${esc(s.bai)}</p>${s.reasons ? `<ul class="reasons">${s.reasons.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}</section>`).join("")}
      <section class="sec" id="sec-ai" hidden><h3>先生細說</h3><p class="bai ai-out" id="aiOut"></p></section>
    </article>
    <div class="after">
      <button type="button" class="btn ghost" id="askAI" hidden>請先生細說</button>
      <button type="button" class="btn ghost" id="copyR">抄一份</button>
      <button type="button" class="btn ghost" id="again">再看一個</button>
    </div>
    <div class="actions">
      <button type="button" class="btn main" id="toRename">${R.renameAdvised ? "請先生挑幾個新名字" : "看看別的名字"}</button>
    </div>`;
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
  $("#copyR").onclick = async () => {
    const txt = [`問名堂批命：${R.name}（${R.gender === "f" ? "坤造" : "乾造"}）`, `評等：${R.grade}（${R.score}分）　${R.headline}`, R.headlinePlain,
      ...R.sections.map(s => `【${s.title}】\n批：${s.pi.join("")}\n白話：${s.bai}`)].join("\n");
    try { await navigator.clipboard.writeText(txt); toast("抄好了，可以貼給別人看"); } catch (_) { toast("這裡不給抄，長按文字複製"); }
  };
  if (opts.back) $("#backCmp").onclick = opts.back;
  aiAvailable().then(ok => {
    const b = $("#askAI"); if (!b) return;
    if (!ok) return;
    b.hidden = false; b.closest(".after").classList.add("has-ai");
    b.onclick = async () => {
      b.disabled = true; $("#sec-ai").hidden = false; const out = $("#aiOut"); out.textContent = "先點一炷香……";
      $("#sec-ai").scrollIntoView({ behavior: "smooth", block: "start" });
      try { await aiReading(R, t => { out.textContent = t; }); }
      catch (e) { out.textContent = e.code === "rate_limited" ? "今晚問的人多，稍後再來。" : "香斷了，這回說不下去，稍後再試。"; b.disabled = false; }
    };
  });
}

// ───────── 改名／取名 ─────────
let lastCands = [];
async function showRename(R) {
  setPhase("rename"); pose("write");
  const surname = R ? [...R.surname] : currentSplit().surname;
  const cfg = Object.assign({ length: R && R.given.length === 1 ? 1 : 2, keepPos: "", keepCh: "", exclude: "", leanFree: false }, store.get("renameCfg", {}));
  if (!R) renderPaper({ split: { surname, given: [] } });
  speak(R ? `我幫你挑幾個，<span class="q">姓不動，照筆畫跟八字配。</span>` : `姓${esc(surname.join(""))}的喔，<span class="q">我挑幾個給你參考。</span>`);
  act.innerHTML = `
    <div class="rhead"><span class="who">${R ? `替${esc(R.name)}擬名` : `替${esc(surname.join(""))}家孩子取名`}</span></div>
    <div class="asks">
      <div class="ask-row">名字要<span class="opts"><button type="button" class="opt" data-len="2">兩個字</button><button type="button" class="opt" data-len="1">一個字</button></span></div>
      <div class="ask-row">保留<input id="rKeepCh" maxlength="1" placeholder="字">放在<span class="opts"><button type="button" class="opt" data-kp="0">第一字</button><button type="button" class="opt" data-kp="1">第二字</button></span></div>
      <div class="ask-row">不要的字<input id="rEx" class="long" placeholder="例如：美 玲"></div>
      <div class="ask-row"><span class="opts"><button type="button" class="opt" id="rFree">用字不拘男女</button></span></div>
      <button type="button" class="btn main wide" id="rGo">請先生挑名</button>
    </div>
    <div id="slips" class="slips"></div>
    <div class="asks"><label class="ask-row" for="ownIn">自己有屬意的名字？</label>
      <div class="ask-row"><input id="ownIn" class="long" placeholder="例如：宥廷 承恩" style="flex:1"><button type="button" class="btn ghost" id="ownGo">一起批</button></div></div>
    <div class="row"><button type="button" class="btn ghost" id="rBack">${R ? "回到批命" : "從頭來"}</button></div>`;
  const st = { ...cfg };
  const sync = () => {
    act.querySelectorAll("[data-len]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.len === st.length));
    act.querySelectorAll("[data-kp]").forEach(b => { b.setAttribute("aria-pressed", b.dataset.kp === String(st.keepPos)); b.disabled = st.length === 1 && b.dataset.kp === "1"; });
    $("#rFree").setAttribute("aria-pressed", st.leanFree);
  };
  act.querySelectorAll("[data-len]").forEach(b => b.onclick = () => { st.length = +b.dataset.len; if (st.length === 1 && st.keepPos === "1") st.keepPos = ""; sync(); });
  act.querySelectorAll("[data-kp]").forEach(b => b.onclick = () => { st.keepPos = st.keepPos === b.dataset.kp ? "" : b.dataset.kp; sync(); });
  $("#rFree").onclick = () => { st.leanFree = !st.leanFree; sync(); };
  $("#rKeepCh").value = st.keepCh; $("#rEx").value = st.exclude; sync();
  $("#rBack").onclick = () => R ? showReading(R) : seat();
  const run = async () => {
    const box = $("#slips");
    box.innerHTML = `<p class="fine">翻字典中……</p>`;
    await Promise.all([initNames(load), initGivenNames(load)]);
    st.keepCh = [...$("#rKeepCh").value.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0])[0] || "";
    st.exclude = $("#rEx").value;
    store.set("renameCfg", st);
    if (st.keepCh && st.keepPos === "") st.keepPos = "0";
    if (st.keepPos !== "" && !st.keepCh) { box.innerHTML = `<p class="fine">要保留哪個字，先寫在「保留」那格。</p>`; return; }
    const ex = new Set([...st.exclude.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0]));
    if (R) [...R.given].forEach(ch => { if (ch !== st.keepCh) ex.add(ch); });
    lastCands = suggestNames({ surname, gender: S.gender, bazi: S.bazi, length: st.length, keep: st.keepPos !== "" ? { pos: +st.keepPos, ch: st.keepCh } : null, exclude: ex, leanFree: st.leanFree, count: 6 });
    renderSlips(R, surname);
    sync();
  };
  $("#rGo").onclick = run;
  $("#ownGo").onclick = async () => {
    await ready; await initNames(load);
    const names = $("#ownIn").value.split(/[\s,，、]+/).map(n => [...n.replace(/[^\p{Script=Han}]/gu, "")].map(x => tradOptions(x)[0])).filter(a => a.length >= 1 && a.length <= 3 && a.every(ch => kangxi(ch) !== null));
    if (!names.length) { toast("寫名字的部分就好，例如：宥廷"); return; }
    const own = names.map(g => { const ev = evaluate({ surname, given: g, gender: S.gender, bazi: S.bazi }); return { name: surname.join("") + g.join(""), given: g.join(""), score: ev.score, grade: ev.grade, own: true, short: `人格${ev.wuge.ren.n}・總格${ev.wuge.zong.n}・三才${ev.sancai.level}`, reason: `人格 ${ev.wuge.ren.n} ${ev.wuge.ren.level}；總格 ${ev.wuge.zong.n} ${ev.wuge.zong.level}；三才${ev.sancai.level}` }; });
    lastCands = [...own, ...lastCands.filter(x => !x.own)];
    renderSlips(R, surname);
  };
  run();
}
function renderSlips(R, surname) {
  const box = $("#slips");
  if (!lastCands.length) { box.innerHTML = `<p class="fine">這些條件下找不到筆畫、五行都合的名字。放寬保留字或不要的字再試。</p>`; return; }
  box.innerHTML = lastCands.map((c, i) => `<button type="button" class="slip" data-i="${i}" style="--i:${i}"><b>${esc(c.name)}</b><span class="g2">${c.grade}・${han(c.score)}分${c.own ? "・你帶來的" : ""}</span><small>${esc(c.meaning || "")}</small><small class="k2">${esc(c.short || c.reason)}</small></button>`).join("");
  box.querySelectorAll(".slip").forEach(b => b.onclick = () => { sfx("paper"); showCompare(R, surname, lastCands[+b.dataset.i]); });
  if (!reduced) lastCands.forEach((_, i) => setTimeout(() => sfx("deal"), 120 + i * 90));
}
function showCompare(R, surname, cand) {
  const N = reading({ surname, given: [...cand.given], gender: S.gender, topic: S.topic, bazi: S.bazi });
  const back = () => showRename(R);
  if (!R) { showReading(N, { back }); return; }
  setPhase("compare"); pose("speak");
  renderPaper({ split: { surname, given: [...cand.given] } });
  speak(`<span class="q">${esc(R.name)}</span>跟<span class="q">${esc(N.name)}</span>擺做伙看，差在哪一目了然。`);
  const rows = [["評等", R.grade, N.grade], ["分數", R.score, N.score], ...["ren", "di", "zong", "wai"].map(k => [GRID_INFO[k].label, `${R.wuge[k].n}・${R.wuge[k].el}・${R.wuge[k].level}`, `${N.wuge[k].n}・${N.wuge[k].el}・${N.wuge[k].level}`]), ["三才", `${R.sancai.key} ${R.sancai.level}`, `${N.sancai.key} ${N.sancai.level}`]];
  if (R.match) rows.push(["人格與喜用", R.match.grids[0].tag, N.match.grids[0].tag]);
  act.innerHTML = `<div class="rhead"><span class="who">兩名對照</span></div>
    <div class="reading cmp-paper"><table class="cmp"><thead><tr><th></th><th>${esc(R.name)}</th><th>${esc(N.name)}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table>
    <section class="sec"><p class="pi"><span>${esc(N.headline)}。</span></p><p class="bai">${esc(N.headlinePlain)}${esc(cand.reason)}</p></section></div>
    <div class="row"><button type="button" class="btn ghost" id="cBack">回到候選名</button><button type="button" class="btn main" id="cFull">看${esc(N.name)}的完整批命</button></div>`;
  $("#cBack").onclick = back;
  $("#cFull").onclick = () => showReading(N, { back });
}
function doNaming() { S.topic = "all"; showRename(null); }

// ───────── 上回的批命 ─────────
function refreshHistory() {
  const h = store.get("history", []), btn = $("#historyBtn");
  btn.hidden = !h.length;
  btn.onclick = () => {
    setPhase("seat");
    speak(`之前看過的，都在這。`);
    act.innerHTML = `<div class="opts">${h.map((x, i) => `<button type="button" class="opt" data-i="${i}">${esc(x.name)}・${x.grade}</button>`).join("")}</div><div class="row"><button type="button" class="btn ghost" id="hBack">回去</button></div>`;
    $("#hBack").onclick = seat;
    act.querySelectorAll("[data-i]").forEach(b => b.onclick = async () => {
      const x = h[+b.dataset.i];
      await ready;
      S.mode = "read"; S.chars = [...x.name]; S.surnameLen = x.surnameLen; S.gender = x.gender; S.topic = x.topic || "all"; S.birth = x.birth; S.bazi = null;
      if (x.birth) { await loadLunar(); S.bazi = computeBazi({ ...x.birth, place: PLACES.find(p => p[0] === x.birth.place) }, L); }
      const sp = currentSplit();
      showReading(reading({ surname: sp.surname, given: sp.given, gender: S.gender, topic: S.topic, bazi: S.bazi }));
    });
  };
}

// ───────── 聲音、特效 ─────────
const soundBtn = $("#soundBtn");
const syncSound = () => { const v = soundOn(); soundBtn.setAttribute("aria-pressed", v); soundBtn.textContent = v ? "有聲" : "靜音"; };
soundBtn.onclick = () => { setSound(!soundOn()); syncSound(); if (soundOn()) setTimeout(() => sfx("tap"), 60); };
syncSound();
// 一般按鈕都有木頭輕叩聲；木牌、招牌、紅紙另有專屬聲音
document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || b.disabled || b.matches(".tk, .sign, .slip, #soundBtn")) return;
  sfx("tap");
}, true);
particles($("#fx"), () => app.dataset.orient);
riseOnChange(act);

// ───────── 開場：等字典、廟埕、老師傅都載好，按「入座」才進場（同時解鎖聲音） ─────────
const introBar = $("#introBar"), enterBtn = $("#enter");
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; });
const jobs = [ready, loadImg(innerWidth >= 900 && innerWidth / innerHeight > 1.05 ? "assets/scene/bg-wide.webp" : "assets/scene/bg.webp"), loadImg("assets/master/idle.webp"), loadImg("assets/props/table.webp"), loadImg("assets/ui/wood.webp"), document.fonts?.load("700 20px 'WM Kai'", "問名堂入座") || 0];
let doneN = 0;
jobs.forEach(j => Promise.resolve(j).then(() => { doneN++; introBar.style.width = Math.round(doneN / jobs.length * 100) + "%"; }, () => {}));
Promise.all(jobs).then(() => { enterBtn.disabled = false; $("#introLoad").classList.add("done"); }).catch(() => { $(".intro-line").textContent = "字典沒翻開，請重新整理再試。"; });
enterBtn.onclick = () => {
  $("#intro").classList.add("out"); sfx("bell");
  setTimeout(() => $("#intro").remove(), 900);
  seat();
};
}
