// 八字排盤與喜用神
// 排盤：lunar-javascript（MIT，6tail），以節氣換月、立春換年。
// 真太陽時：以出生地 IANA 時區還原當年實際的 UTC 偏移（含台灣 1945–1979 的日光節約時間），
//   再加經度差（每度 4 分鐘）與均時差。
// 喜用神：扶抑為主，冬夏生人加調候，極旺極弱論專旺／從格。權重為本站設定，推論過程完整輸出。
export const GAN = "甲乙丙丁戊己庚辛壬癸";
export const ZHI = "子丑寅卯辰巳午未申酉戌亥";
export const ELEMENTS = "木火土金水";
const GAN_EL = "木木火火土土金金水水";
const ZHI_EL = "水土木木土火火土金金土水";
// 藏干：本氣、中氣、餘氣
const HIDDEN = {
  子: "癸", 丑: "己癸辛", 寅: "甲丙戊", 卯: "乙", 辰: "戊乙癸", 巳: "丙戊庚",
  午: "丁己", 未: "己丁乙", 申: "庚壬戊", 酉: "辛", 戌: "戊辛丁", 亥: "壬甲",
};
const HIDDEN_W = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };
const GEN = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const genBy = e => Object.keys(GEN).find(k => GEN[k] === e); // 生我者
const keBy = e => Object.keys(KE).find(k => KE[k] === e);    // 剋我者
export const ORGAN = { 木: "肝膽、筋骨", 火: "心血、眼目", 土: "脾胃、消化", 金: "肺、氣管、皮膚", 水: "腎、膀胱、耳朵" };

/** 十神（以五行論，不分陰陽正偏時用） */
export function godOf(dm, e) {
  if (e === dm) return "比劫";
  if (e === genBy(dm)) return "印";
  if (e === GEN[dm]) return "食傷";
  if (e === KE[dm]) return "財";
  return "官殺";
}
/** 十神（分陰陽） */
export function tenGod(dmGan, gan) {
  const d = GAN.indexOf(dmGan), g = GAN.indexOf(gan);
  const same = d % 2 === g % 2;
  const rel = godOf(GAN_EL[d], GAN_EL[g]);
  return { 比劫: same ? "比肩" : "劫財", 印: same ? "偏印" : "正印", 食傷: same ? "食神" : "傷官", 財: same ? "偏財" : "正財", 官殺: same ? "七殺" : "正官" }[rel];
}

/** 指定時區下，當地時間對應的 UTC 偏移（小時） */
export function tzOffset(y, mo, d, h, mi, tz) {
  let guess = Date.UTC(y, mo - 1, d, h, mi) - 8 * 3600e3;
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
    const g = t => +p.find(q => q.type === t).value;
    const local = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
    const off = local - guess;
    guess = Date.UTC(y, mo - 1, d, h, mi) - off;
  }
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
  const g = t => +p.find(q => q.type === t).value;
  return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - guess) / 3600e3;
}

/** 均時差（分鐘），Spencer 近似 */
export function equationOfTime(y, mo, d) {
  const n = Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
  const B = 2 * Math.PI * (n - 1) / 365;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(B) - 0.032077 * Math.sin(B) - 0.014615 * Math.cos(2 * B) - 0.040849 * Math.sin(2 * B));
}

/** 鐘錶時間 → 真太陽時 */
export function trueSolar({ y, m, d, h, mi }, place) {
  const [, lng, tz] = place;
  const off = tzOffset(y, m, d, h, mi, tz);
  const utc = Date.UTC(y, m - 1, d, h, mi) - off * 3600e3;
  const eot = equationOfTime(y, m, d);
  const t = new Date(utc + (lng * 4 + eot) * 60e3);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), offsetHours: off, eot, shiftMin: Math.round(lng * 4 + eot - off * 60) };
}

/**
 * input: { calendar: 'solar'|'lunar', y, m, d, leap, h, mi (null = 不知時辰), place, ziRule: 'early'|'split' }
 * L: lunar-javascript 匯出物件（{Solar, Lunar}）
 */
export function computeBazi(input, L) {
  let { y, m, d } = input;
  if (input.calendar === "lunar") {
    const s = L.Lunar.fromYmd(y, input.leap ? -m : m, d).getSolar();
    y = s.getYear(); m = s.getMonth(); d = s.getDay();
  }
  const known = input.h !== null && input.h !== undefined;
  let ts = null;
  if (known) ts = trueSolar({ y, m, d, h: input.h, mi: input.mi || 0 }, input.place);
  const solar = known ? L.Solar.fromYmdHms(ts.y, ts.m, ts.d, ts.h, ts.mi, 0) : L.Solar.fromYmdHms(y, m, d, 12, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(input.ziRule === "split" ? 2 : 1);
  const pillars = [
    { name: "年", gz: ec.getYear() },
    { name: "月", gz: ec.getMonth() },
    { name: "日", gz: ec.getDay() },
  ];
  if (known) pillars.push({ name: "時", gz: ec.getTime() });
  const dmGan = pillars[2].gz[0];
  const dm = GAN_EL[GAN.indexOf(dmGan)];

  // 五行力量
  const power = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const items = [];
  pillars.forEach((p, i) => {
    const g = p.gz[0], z = p.gz[1];
    if (i !== 2) { power[GAN_EL[GAN.indexOf(g)]] += 1; items.push([g, 1, "干"]); }
    const hs = HIDDEN[z], ws = HIDDEN_W[hs.length];
    const zw = i === 1 ? 3 : 1.2; // 月令最重
    [...hs].forEach((h, k) => { power[GAN_EL[GAN.indexOf(h)]] += zw * ws[k]; });
    p.hidden = [...hs];
    p.ganGod = i === 2 ? "日主" : tenGod(dmGan, g);
    p.hiddenGods = [...hs].map(h => tenGod(dmGan, h));
    p.nayin = null;
  });
  const total = Object.values(power).reduce((a, b) => a + b, 0);
  const share = Object.fromEntries(ELEMENTS.split("").map(e => [e, power[e] / total]));
  const byGod = { 比劫: 0, 印: 0, 食傷: 0, 財: 0, 官殺: 0 };
  for (const e of ELEMENTS) byGod[godOf(dm, e)] += share[e];
  const support = byGod.比劫 + byGod.印;

  const monthZhi = pillars[1].gz[1];
  const monthMain = ZHI_EL[ZHI.indexOf(monthZhi)];
  const deLing = ["比劫", "印"].includes(godOf(dm, monthMain));
  const deDi = pillars.some((p, i) => i !== 1 && ["比劫", "印"].includes(godOf(dm, GAN_EL[GAN.indexOf(HIDDEN[p.gz[1]][0])])));
  const deShi = pillars.filter((p, i) => i !== 2 && ["比劫", "印"].includes(godOf(dm, GAN_EL[GAN.indexOf(p.gz[0])]))).length >= 2;

  const reasons = [];
  reasons.push(`你是${dmGan}${dm}，生在${monthZhi}月，${deLing ? "正當令，氣旺" : "不當令，氣較弱"}；${deDi ? "地支有根" : "地支沒根"}；${deShi ? "天干有人幫" : "天干較少人幫"}。`);
  reasons.push(`生你、幫你的印跟比劫，算起來大概佔 ${Math.round(support * 100)}%。`);

  let strength, yong, xi = [], ji = [], pattern = "扶抑";
  const opp = ["食傷", "財", "官殺"].sort((a, b) => byGod[b] - byGod[a]);
  const el = god => ELEMENTS.split("").find(e => godOf(dm, e) === god);
  if (support >= 0.8 && deLing && byGod.官殺 < 0.08) {
    strength = "極旺"; pattern = "專旺";
    yong = el("比劫"); xi = [el("印"), el("食傷")]; ji = [el("官殺"), el("財")];
    reasons.push("你的氣幾乎佔滿整盤，又沒什麼來剋，這叫專旺。順著它走，比劫、印都好，官殺、財反而不好。");
  } else if (support <= 0.15 && !deLing && !deDi) {
    strength = "極弱"; pattern = "從格";
    const top = opp[0];
    yong = el(top); xi = [el(top === "官殺" ? "財" : top === "財" ? "食傷" : "財")]; ji = [el("印"), el("比劫")];
    reasons.push(`你本身極弱又沒根，這叫從格，乾脆跟著最旺的${top}走，印、比劫再來幫你，反而壞事。`);
  } else if (support >= 0.5) {
    strength = support >= 0.62 ? "身強" : "偏強";
    if (byGod.印 > byGod.比劫) { yong = el("財"); xi = [el("食傷"), el("官殺")]; reasons.push("身強，印又重，我取財來破印；食傷能生財，也好。"); }
    else if (byGod.官殺 >= 0.08) { yong = el("官殺"); xi = [el("財"), el("食傷")]; reasons.push("身強，比劫又多，取官殺來管；財能生官殺，也好。"); }
    else { yong = el("食傷"); xi = [el("財"), el("官殺")]; reasons.push("身強，比劫多，官殺又沒力，就取食傷把氣放出去；財也好。"); }
    ji = [el("印"), el("比劫")];
  } else {
    strength = support < 0.38 ? "身弱" : "偏弱";
    if (opp[0] === "財") { yong = el("比劫"); xi = [el("印")]; reasons.push("身弱，財又多，擔不住，取比劫來分；印能生身，也好。"); }
    else { yong = el("印"); xi = [el("比劫")]; reasons.push(`身弱，${opp[0]}又重，取印來${opp[0] === "官殺" ? "化殺" : "制食傷"}、生身；比劫幫身，也好。`); }
    ji = [el(opp[0]), el(opp[1])];
  }

  // 調候：冬生寒、夏生燥
  const season = "亥子丑".includes(monthZhi) ? "冬" : "巳午未".includes(monthZhi) ? "夏" : null;
  let tiaohou = null;
  if (pattern === "扶抑" && season) {
    const need = season === "冬" ? "火" : "水";
    if (share[need] < 0.12) {
      tiaohou = need;
      reasons.push(`你生在${season}天，${season === "冬" ? "天寒地凍" : "又熱又燥"}，${need}卻只有 ${Math.round(share[need] * 100)}%，先要${season === "冬" ? "暖一暖" : "潤一潤"}，所以${need}也算你要的。`);
      if (yong !== need) { xi = [need, ...xi.filter(e => e !== need)]; ji = ji.filter(e => e !== need); }
    }
  }
  xi = [...new Set(xi.filter(e => e && e !== yong))];
  ji = [...new Set(ji.filter(e => e && e !== yong && !xi.includes(e)))];
  const missing = ELEMENTS.split("").filter(e => power[e] === 0);
  if (missing.length) {
    const lack = missing.map(e => `沒有${e}${[yong, ...xi].includes(e) ? "，這剛好是你要的" : ji.includes(e) ? "，這是忌神，不用補" : ""}`).join("；");
    reasons.push(`你八字${lack}。缺什麼不一定要補什麼，取名看喜用，不是看缺。`);
  }

  return {
    input: { y, m, d, calendar: input.calendar, origin: { y: input.y, m: input.m, d: input.d, leap: !!input.leap }, h: input.h, mi: input.mi, place: input.place?.[0], ziRule: input.ziRule || "early" },
    trueSolar: ts, timeKnown: known,
    pillars, dmGan, dm, share, byGod, support, deLing, deDi, deShi,
    strength, pattern, yong, xi, ji, tiaohou, season, missing, reasons,
    zodiacBranch: ec.getYear()[1], // 以立春換年的年支
    lunarText: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
  };
}
