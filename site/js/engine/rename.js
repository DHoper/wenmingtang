// 改名／取名引擎
// 1. 名字各字 1–30 畫窮舉，留下人、地、總、外格皆吉且三才不凶的筆畫組合
// 2. 到取名字庫挑符合筆畫的字：避忌神五行、避生肖忌字根、合乾坤用字傾向
// 3. 整名檢查：聲調、同部首、諧音；依總分排序並讓前幾名字義方向不同
import { computeWuge } from "./wuge.js";
import { SANCAI } from "../data/sancai.js";
import { evaluate, rootsOf } from "./analyze.js";
import { zodiacRules } from "../data/zodiac.js";
import { kangxi, nameLib, toneOf, givenNames, twChars } from "./chars.js";

// 常見不雅諧音（拼音不分聲調）
const BAD_SOUNDS = ["si wang", "shi wang", "wu chi", "bai chi", "fei wu", "sha zi", "sha bi", "ben dan", "lan ren", "du zi", "pi gu", "da bian", "xiao bian", "gui zi", "ji ba", "wu gui", "zao gao", "shi bai", "bing du", "qin shou", "mei qian", "fan tong", "pin qiong", "si shi", "si yi", "wu yu", "you gui", "ku si", "lao ji"];

function comboOK(s, g, gender) {
  const w = computeWuge(s, g);
  const keys = g.length === 1 && s.length === 1 ? ["ren", "di", "zong"] : ["ren", "di", "zong", "wai"];
  for (const k of keys) {
    if (w[k].lv < 0.5) return null;
    if (gender === "f" && w[k].female) return null;
  }
  const sc = SANCAI[w.tian.el + w.ren.el + w.di.el];
  if (sc.v < 0.2) return null;
  return { w, sc };
}

/**
 * opts: { surname:[ch], gender, bazi?, length: 1|2, keep: {pos, ch}?, exclude: Set<ch>, count, leanFree }
 */
export function suggestNames(opts) {
  const lib = nameLib();
  const sStrokes = opts.surname.map(kangxi);
  const len = opts.length || 2;
  const exclude = opts.exclude || new Set();
  const bazi = opts.bazi;
  const zr = bazi ? zodiacRules(bazi.zodiacBranch) : null;
  const avoidRoots = zr ? new Set(zr.avoid.map(a => a[0])) : new Set();
  const leanOK = c => opts.leanFree || c.lean === "n" || c.lean === opts.gender;
  const charOK = c => !exclude.has(c.ch) && !opts.surname.includes(c.ch) && leanOK(c)
    && !(bazi && c.wuxing && bazi.ji.includes(c.wuxing))
    && !rootsOf(c.ch, c.radical).some(r => avoidRoots.has(r));
  const byStroke = new Map();
  for (const c of lib) if (charOK(c)) { if (!byStroke.has(c.strokes)) byStroke.set(c.strokes, []); byStroke.get(c.strokes).push(c); }

  const keep = opts.keep && opts.keep.ch ? { pos: opts.keep.pos, c: lib.find(x => x.ch === opts.keep.ch) || { ch: opts.keep.ch, strokes: kangxi(opts.keep.ch), lean: "n", gloss: "", radical: null, pinyin: null, tone: toneOf(opts.keep.ch) } } : null;

  // 筆畫組合
  const combos = [];
  const range = [...Array(30)].map((_, i) => i + 1);
  const pools1 = keep && keep.pos === 0 ? [keep.c.strokes] : range;
  const pools2 = len === 2 ? (keep && keep.pos === 1 ? [keep.c.strokes] : range) : [null];
  for (const a of pools1) for (const b of pools2) {
    const g = b === null ? [a] : [a, b];
    const ok = comboOK(sStrokes, g, opts.gender);
    if (!ok) continue;
    let pre = ok.sc.v * 20 + ["ren", "di", "zong"].reduce((t, k) => t + ok.w[k].lv * 5, 0);
    if (bazi) {
      if (ok.w.ren.el === bazi.yong) pre += 25; else if (bazi.xi.includes(ok.w.ren.el)) pre += 15; else if (bazi.ji.includes(ok.w.ren.el)) pre -= 30;
    }
    combos.push({ g, pre });
  }
  combos.sort((x, y) => y.pre - x.pre);

  // 組名：先用真實人名（語料中多個姓氏用過的雙字名），不足再由字庫自由組合
  const comboSet = new Map(combos.slice(0, 120).map(c => [c.g.join(","), c.pre]));
  const libMap = new Map(lib.map(c => [c.ch, c]));
  const allowed = c => c && !exclude.has(c.ch) && !opts.surname.includes(c.ch)
    && !(bazi && c.wuxing && bazi.ji.includes(c.wuxing)) && !rootsOf(c.ch, c.radical).some(r => avoidRoots.has(r));
  const sTone = toneOf(opts.surname[opts.surname.length - 1]);
  const pairOK = (a, b) => {
    if (b && a.ch === b.ch) return false;
    const tones = [sTone, a.tone, b?.tone].filter(Boolean);
    if (tones.length === 3 && new Set(tones).size === 1) return false;
    if (b && a.pinyin && b.pinyin && BAD_SOUNDS.includes(`${a.pinyin} ${b.pinyin}`)) return false;
    return true;
  };
  const cands = [], seen = new Set();
  const G = givenNames();
  if (len === 2 && G) {
    const base = opts.leanFree ? ["m", "f", "n"] : [opts.gender, "n"];
    const leans = [...base.map(l => "tw_" + l), ...base];
    for (const L of leans) for (const nm of G[L]) {
      if (seen.has(nm)) continue;
      const [x, y] = [...nm];
      if (keep && [x, y][keep.pos] !== keep.c.ch) continue;
      const a = libMap.get(x) || (keep && keep.c.ch === x ? keep.c : null), b = libMap.get(y) || (keep && keep.c.ch === y ? keep.c : null);
      if (!a || !b || !comboSet.has(`${a.strokes},${b.strokes}`)) continue;
      if ((!keep || keep.pos !== 0) && !allowed(a)) continue;
      if ((!keep || keep.pos !== 1) && !allowed(b)) continue;
      if (!pairOK(a, b)) continue;
      cands.push({ arr: [a, b], real: true, tw: L.startsWith("tw_") }); seen.add(nm);
    }
  }
  if (cands.length < 40) {
    for (const { g } of combos.slice(0, 60)) {
      const A = keep && keep.pos === 0 ? [keep.c] : (byStroke.get(g[0]) || []);
      const B = len === 2 ? (keep && keep.pos === 1 ? [keep.c] : (byStroke.get(g[1]) || [])) : [null];
      for (const a of A) for (const b of B) {
        if (b && seen.has(a.ch + b.ch)) continue;
        if (b && a.radical && a.radical === b.radical) continue;
        if (!pairOK(a, b)) continue;
        cands.push({ arr: b ? [a, b] : [a], real: false });
      }
    }
  }
  // 粗排（字頻高、字五行合喜用者先），再做完整評分
  const freqScore = arr => arr.reduce((t, c) => t + Math.log10((c.freq || 0) + 10), 0);
  const elScore = arr => bazi ? arr.reduce((t, c) => t + (c.wuxing === bazi.yong ? 2 : bazi.xi.includes(c.wuxing) ? 1 : 0), 0) : 0;
  const TW = twChars();
  const twScore = arr => arr.filter(c => TW.has(c.ch)).length;
  const pri = c => freqScore(c.arr) * 0.6 + elScore(c.arr) * 1.5 + (c.real ? 3 : 0) + (c.tw ? 8 : 0) + twScore(c.arr) * 2.5;
  cands.sort((x, y) => pri(y) - pri(x));
  const scored = cands.slice(0, 800).map(({ arr, real, tw }) => {
    const ev = evaluate({ surname: opts.surname, given: arr.map(c => c.ch), gender: opts.gender, bazi });
    return { given: arr.map(c => c.ch).join(""), chars: arr, ev, real, score: ev.score + freqScore(arr) * 0.4 + (real ? 2 : 0) + (tw ? 6 : 0) + twScore(arr) * 2 };
  });
  scored.sort((x, y) => y.score - x.score);
  // 多樣性：同一個字最多出現兩次
  const used = new Map(), out = [];
  for (const s of scored) {
    if (s.chars.some(c => (used.get(c.ch) || 0) >= 2)) continue;
    out.push(s);
    s.chars.forEach(c => used.set(c.ch, (used.get(c.ch) || 0) + 1));
    if (out.length >= (opts.count || 6)) break;
  }
  return out.map(s => ({ name: opts.surname.join("") + s.given, given: s.given, chars: s.chars, score: s.ev.score, grade: s.ev.grade, real: s.real, reason: reasonOf(s, bazi), meaning: s.chars.map(c => `${c.ch}・${c.gloss}`).join("　"), short: shortOf(s, bazi) }));
}

function reasonOf(s, bazi) {
  const w = s.ev.wuge;
  const bits = [`人格${w.ren.n}畫是${w.ren.level}`, `總格${w.zong.n}畫是${w.zong.level}`];
  if (bazi) {
    if (w.ren.el === bazi.yong) bits.push(`人格屬${w.ren.el}，正好是你要的用神`);
    else if (bazi.xi.includes(w.ren.el)) bits.push(`人格屬${w.ren.el}，是幫得到你的喜神`);
    const helpers = s.chars.filter(c => c.wuxing && (c.wuxing === bazi.yong || bazi.xi.includes(c.wuxing))).map(c => `「${c.ch}」屬${c.wuxing}`);
    if (helpers.length) bits.push(helpers.join("、") + "，補到你要的五行");
  }
  bits.push(s.chars.map(c => `${c.ch}・${c.gloss}`).join("，"));
  return bits.join("；");
}

function shortOf(s, bazi) {
  const w = s.ev.wuge;
  const bits = [`人格${w.ren.n}${w.ren.level}`, `總格${w.zong.n}${w.zong.level}`];
  if (bazi) {
    if (w.ren.el === bazi.yong) bits.push("合用神");
    else if (bazi.xi.includes(w.ren.el)) bits.push("得喜神");
  }
  return bits.join("・");
}
