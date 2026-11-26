// 解讀引擎：輸入姓名（與選填生辰），輸出「解讀依據」R。網頁與 AI 細說共用同一份 R。
import { kangxi, restoreOf, wuxingOf, radicalOf, toneOf } from "./chars.js";
import { computeWuge } from "./wuge.js";
import { SANCAI, relation } from "../data/sancai.js";
import { zodiacRules, ROOTS, ANIMALS, BRANCHES } from "../data/zodiac.js";
import { ORGAN } from "./bazi.js";

export const GRID_INFO = {
  tian: { label: "天格", alias: "祖運", role: "祖上與長輩的庇蔭，由姓氏決定", scored: false },
  ren: { label: "人格", alias: "主運", role: "整個名字的核心，主性格、才能與一生的主調", scored: true },
  di: { label: "地格", alias: "前運", role: "前半生的基礎，也看配偶、子女與部屬", scored: true },
  wai: { label: "外格", alias: "副運", role: "人際、貴人與外在環境", scored: true },
  zong: { label: "總格", alias: "後運", role: "中晚年的走向與一生的總成果", scored: true },
};
export const GRID_KEYS = ["tian", "ren", "di", "wai", "zong"];
const LV_SCORE = { 2: 100, 1: 86, 0.5: 68, "-0.5": 44, "-1": 26, "-2": 10 };

export function gradeOf(score) {
  return score >= 90 ? "上上" : score >= 78 ? "上" : score >= 62 ? "中" : score >= 48 ? "中下" : "下";
}

// 依名字固定挑選文字變體
export function pick(seed, arr) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return arr[h % arr.length];
}

/** 一個字的分析：筆畫、還原、五行、部首、生肖字根 */
export function charInfo(ch) {
  return { ch, strokes: kangxi(ch), restore: restoreOf(ch), wuxing: wuxingOf(ch), radical: radicalOf(ch), tone: toneOf(ch) };
}

export function rootsOf(ch, radical) {
  const out = [];
  for (const [key, r] of Object.entries(ROOTS)) {
    if ((r.rad || []).includes(radical) || (r.chars || "").includes(ch)) out.push(key);
  }
  return out;
}

/** 生肖字根檢查（只看名字，不看姓氏） */
export function zodiacCheck(branch, givenInfos) {
  const rules = zodiacRules(branch);
  const hits = [];
  for (const g of givenInfos) {
    const roots = rootsOf(g.ch, g.radical);
    for (const [k, why] of rules.like) if (roots.includes(k)) hits.push({ ch: g.ch, root: ROOTS[k].label, good: true, why });
    for (const [k, why] of rules.avoid) if (roots.includes(k)) hits.push({ ch: g.ch, root: ROOTS[k].label, good: false, why });
  }
  const good = hits.filter(h => h.good).length, bad = hits.filter(h => !h.good).length;
  const score = Math.max(0, Math.min(100, 62 + 16 * good - 22 * bad));
  return { ...rules, hits, score };
}

/** 八字配名 */
export function baziMatch(bazi, wuge, givenInfos) {
  const rate = e => (e === bazi.yong ? 100 : bazi.xi.includes(e) ? 84 : bazi.ji.includes(e) ? 22 : 58);
  const tag = e => (e === bazi.yong ? "用神" : bazi.xi.includes(e) ? "喜神" : bazi.ji.includes(e) ? "忌神" : "閒神");
  const grids = ["ren", "di", "zong"].map(k => ({ key: k, el: wuge[k].el, tag: tag(wuge[k].el), score: rate(wuge[k].el) }));
  const chars = givenInfos.map(g => ({ ch: g.ch, el: g.wuxing, tag: g.wuxing ? tag(g.wuxing) : null, score: g.wuxing ? rate(g.wuxing) : 58 }));
  const charScore = chars.length ? chars.reduce((a, c) => a + c.score, 0) / chars.length : 58;
  const score = 0.4 * grids[0].score + 0.15 * grids[1].score + 0.15 * grids[2].score + 0.3 * charScore;
  return { grids, chars, score };
}

/**
 * 核心計算（不含文字），改名引擎也用這個。
 * p: { surname:[ch], given:[ch], gender:'m'|'f', bazi? }
 */
export function evaluate(p) {
  const sInfo = p.surname.map(charInfo), gInfo = p.given.map(charInfo);
  const wuge = computeWuge(sInfo.map(c => c.strokes), gInfo.map(c => c.strokes));
  const female = p.gender === "f";
  const gridScore = k => {
    let s = LV_SCORE[wuge[k].lv];
    if (female && wuge[k].female && wuge[k].lv > 0) s -= 18; // 傳統忌女之數
    return s;
  };
  const scKey = wuge.tian.el + wuge.ren.el + wuge.di.el;
  const sancai = SANCAI[scKey];
  const sancaiScore = 55 + 45 * sancai.v;
  const parts = { ren: gridScore("ren"), di: gridScore("di"), zong: gridScore("zong"), wai: gridScore("wai"), sancai: sancaiScore };
  let score;
  let match = null, zodiac = null;
  if (p.bazi) {
    match = baziMatch(p.bazi, wuge, gInfo);
    zodiac = zodiacCheck(p.bazi.zodiacBranch, gInfo);
    score = 0.2 * parts.ren + 0.12 * parts.di + 0.12 * parts.zong + 0.06 * parts.wai + 0.1 * parts.sancai + 0.3 * match.score + 0.1 * zodiac.score;
    parts.match = match.score; parts.zodiac = zodiac.score;
  } else {
    score = 0.3 * parts.ren + 0.2 * parts.di + 0.2 * parts.zong + 0.1 * parts.wai + 0.2 * parts.sancai;
  }
  score = Math.round(score);
  const rel = {
    tianRen: relation(wuge.tian.el, wuge.ren.el),
    renDi: relation(wuge.ren.el, wuge.di.el),
    renWai: relation(wuge.ren.el, wuge.wai.el),
    renZong: relation(wuge.ren.el, wuge.zong.el),
  };
  return { sInfo, gInfo, wuge, sancai, rel, parts, score, grade: gradeOf(score), match, zodiac };
}

/** 是否主動建議改名 */
export function shouldRename(ev) {
  const why = [];
  if (["中下", "下"].includes(ev.grade)) why.push("整體評等偏低");
  if (ev.wuge.ren.lv <= -1) why.push(`人格 ${ev.wuge.ren.n} 為${ev.wuge.ren.level}數`);
  if (ev.wuge.zong.lv <= -1) why.push(`總格 ${ev.wuge.zong.n} 為${ev.wuge.zong.level}數`);
  if (ev.sancai.v <= -0.6) why.push(`三才${ev.sancai.key}為凶配置`);
  if (ev.match) {
    const renJi = ev.match.grids[0].tag === "忌神";
    const charsHelp = ev.match.chars.some(c => c.tag === "用神" || c.tag === "喜神");
    if (renJi && !charsHelp) why.push("人格五行正犯忌神，用字也沒補到喜用");
  }
  return why;
}

export { ORGAN, ANIMALS, BRANCHES };
