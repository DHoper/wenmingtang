// 字庫：康熙筆畫、偏旁還原、簡轉繁、字的五行、部首、聲調
// 資料由 tools/build_chars.py 從 Unihan 產生。init() 需在使用前呼叫一次。
const D = { k: new Map(), restore: new Map(), s2t: {}, wx: new Map(), rad: new Map(), tone: new Map(), common: new Set(), names: null, given: null };

export async function initChars(load) {
  const [kx, s2t, info, rads] = await Promise.all([load("kangxi.json"), load("s2t.json"), load("charinfo.json"), load("radicals.json")]);
  for (const [k, s] of Object.entries(kx.strokes)) for (const c of s) D.k.set(c, +k);
  for (const [pair, s] of Object.entries(kx.restore)) for (const c of s) D.restore.set(c, { from: pair[0], to: pair[1] });
  D.s2t = s2t;
  for (const [e, s] of Object.entries(info.wuxing)) for (const c of s) D.wx.set(c, e);
  for (const [t, s] of Object.entries(info.tones)) for (const c of s) D.tone.set(c, +t);
  for (const c of info.common) D.common.add(c);
  for (const [r, s] of Object.entries(rads)) for (const c of s) D.rad.set(c, +r);
}

export async function initNames(load) {
  if (D.names) return D.names;
  const j = await load("namechars.json");
  D.names = Object.entries(j.chars).map(([ch, [strokes, lean, gloss, wuxing, radical, pinyin, tone, freq]]) => ({ ch, strokes, lean, gloss, wuxing, radical, pinyin, tone, freq }));
  for (const n of D.names) { if (n.tone) D.tone.set(n.ch, n.tone); }
  return D.names;
}

export async function initGivenNames(load) {
  if (D.given) return D.given;
  const j = await load("givennames.json");
  const split = str => str.match(/.{2}/gu) || [];
  D.given = { m: split(j.m), f: split(j.f), n: split(j.n), tw_m: split(j.tw_m), tw_f: split(j.tw_f), tw_n: split(j.tw_n) };
  D.twChars = new Set((j.tw_m + j.tw_f + j.tw_n).split(""));
  return D.given;
}
export const givenNames = () => D.given;
export const twChars = () => D.twChars || new Set();

export const kangxi = ch => D.k.get(ch) ?? null;
export const restoreOf = ch => D.restore.get(ch) || null;
export const wuxingOf = ch => D.wx.get(ch) || null;
export const radicalOf = ch => D.rad.get(ch) ?? null;
export const toneOf = ch => D.tone.get(ch) ?? null;
export const isCommon = ch => D.common.has(ch);
export const nameLib = () => D.names;

/** 簡轉繁：回傳可能的繁體寫法（第一個為預設）；已是繁體或無對應時回傳 [ch] */
export function tradOptions(ch) {
  const t = D.s2t[ch];
  if (!t) return [ch];
  // 有些字本身就是正體（如「干」也是「乾、幹」的簡化），保留原字作為選項
  const opts = [...t];
  if (D.k.has(ch) && D.common.has(ch)) opts.push(ch);
  return [...new Set(opts)];
}

/** AI 回答偶爾漏出簡體字：只轉不是常用正體的字（个→個、这→這），台、只、面這類本身就是正體的不動 */
export function toTrad(t) {
  return [...String(t)].map(c => {
    if (c === "么") return "麼";
    const m = D.s2t[c];
    return m && !D.common.has(c) ? [...m][0] : c;
  }).join("");
}
