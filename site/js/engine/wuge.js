// 五格剖象（熊崎式）。單姓上方、單名下方各加虛筆 1。
import { NUM81, numElement, norm81 } from "../data/num81.js";
import { COMPOUND, AMBIGUOUS } from "../data/misc.js";

/** 拆姓名。forceSurnameLen：使用者指定姓氏字數 */
export function splitName(chars, forceSurnameLen) {
  const s = chars.join("");
  let len = 1, ambiguous = false;
  if (forceSurnameLen) len = forceSurnameLen;
  else if (chars.length >= 3 && COMPOUND.includes(s.slice(0, 2))) {
    len = 2;
    ambiguous = AMBIGUOUS.has(s.slice(0, 2));
  }
  if (chars.length - len < 1) len = Math.max(1, chars.length - 1);
  return { surname: chars.slice(0, len), given: chars.slice(len), ambiguous };
}

export function grid(n) {
  const k = norm81(n);
  const el = numElement(n);
  return { n, n81: k, el, yang: n % 2 === 1, ...NUM81[k] };
}

/** s: 姓氏各字筆畫；g: 名字各字筆畫 */
export function computeWuge(s, g) {
  const S = s.reduce((a, b) => a + b, 0), G = g.reduce((a, b) => a + b, 0);
  const s1 = s[0], sLast = s[s.length - 1], g1 = g[0], gLast = g[g.length - 1];
  const singleS = s.length === 1, singleG = g.length === 1;
  const tian = singleS ? s1 + 1 : S;
  const ren = sLast + g1;
  const di = singleG ? g1 + 1 : G;
  // 外格：虛筆結構法（單姓用虛 1、單名用虛 1）
  const wai = (singleS ? 1 : s1) + (singleG ? 1 : gLast);
  const zong = S + G;
  return {
    tian: grid(tian), ren: grid(ren), di: grid(di), wai: grid(wai), zong: grid(zong),
    virtual: { top: singleS, bottom: singleG },
  };
}
