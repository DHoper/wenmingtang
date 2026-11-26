// 批命文字：把 evaluate() 的結果組成兩層文字，輸出 R
//   pi  ＝ 批語（文言，老師傅批在紅紙上的話）
//   bai ＝ 白話（現代口語，解釋批語在說什麼、該怎麼做）
import { evaluate, shouldRename, GRID_INFO, GRID_KEYS, pick } from "./analyze.js";
import { ORGAN } from "./bazi.js";
import { TOPICS } from "../data/misc.js";

const HAN = "〇一二三四五六七八九";
export function han(n) {
  if (n < 10) return HAN[n];
  if (n < 20) return "十" + (n % 10 ? HAN[n % 10] : "");
  if (n < 100) return HAN[Math.floor(n / 10)] + "十" + (n % 10 ? HAN[n % 10] : "");
  return "一百";
}
const INDUSTRY = {
  木: "教育、文化出版、設計、園藝、醫藥", 火: "餐飲、電子科技、傳播、美業、能源",
  土: "不動產、建築、農業、顧問、行政管理", 金: "金融、法律、機械、五金、科技硬體",
  水: "貿易、物流、旅遊、水產、資訊流通",
};

// 生剋文字。鍵為 relation(天格, 人格) 或 relation(人格, X)：生＝前者生後者、被生＝後者生前者、剋、被剋同理
const TIAN_REN = {
  生: ["天生人格，上承蔭庇", "天格生人格：長輩、上司願意拉你一把，起步有人推。"],
  被生: ["人生天格，孝親勞己", "人格生天格：你對長輩、上頭付出得多，孝順顧家，只是自己比較辛苦。"],
  比和: ["天人同氣，上下相投", "天格與人格同屬一種五行：和長輩、上司處得來，家風一脈相承。"],
  剋: ["天剋人格，上壓難伸", "天格剋人格：上頭的壓力重，常覺得被長輩或主管管著，要學會為自己爭取空間。"],
  被剋: ["人剋天格，自立違上", "人格剋天格：個性不服管，和長輩意見常不同；能自立，但要留意溝通方式。"],
};
const REN_DI = {
  生: ["人生地格，勞心顧家", "人格生地格：你照顧家人、部屬，願意付出，家裡和樂，但自己容易累。"],
  被生: ["地生人格，根基有靠", "地格生人格：家庭和基礎穩，背後有人支持你，做事有後盾。"],
  比和: ["人地同氣，內外安和", "人格與地格同屬一種五行：內外一致，根基安定。"],
  剋: ["人剋地格，治下過嚴", "人格剋地格：對家人、部屬要求高，容易管太多，多些體諒會更好。"],
  被剋: ["地剋人格，根基動搖", "地格剋人格：家中或底下的人常帶來煩惱，根基較不穩，凡事先顧好家。"],
};
const REN_WAI = {
  被生: ["外生人格，貴人扶持", "外格生人格：貴人緣好，出門在外常有人幫忙。"],
  生: ["人生外格，施多得少", "人格生外格：熱心助人、人緣好，只是付出多、回收少。"],
  比和: ["人外同氣，友若兄弟", "人格與外格同屬一種五行：朋友如兄弟，人際平順。"],
  被剋: ["外剋人格，慎防小人", "外格剋人格：人際上容易受壓，遇事要多提防小人。"],
  剋: ["人剋外格，威而少親", "人格剋外格：主導性強，外人敬你也怕你，記得給人留面子。"],
};
const REN_ZONG = {
  被生: ["總生人格，晚運得助", "總格生人格：中晚年有助力，越老越順。"],
  生: ["人生總格，前勤後豐", "人格生總格：前半生的努力，會累積成後半生的成果。"],
  比和: ["人總同氣，一生平穩", "人格與總格同屬一種五行：一生走勢穩定，少大起大落。"],
  被剋: ["總剋人格，晚歲多勞", "總格剋人格：中晚年壓力較重，宜及早準備。"],
  剋: ["人剋總格，事業自創", "人格剋總格：靠自己打天下，成就要親手掙來。"],
};
const SANCAI_LV = {
  大吉: "三才通順，福壽可期", 吉: "配置得宜，平順可成", 吉凶參半: "吉凶互見，成敗在人",
  凶多於吉: "氣有阻滯，宜慎宜守", 凶: "三才相戾，宜早調和",
};

function gridSection(k, g, female) {
  const info = GRID_INFO[k];
  const head = `${info.label}${han(g.n)}，屬${g.yang ? "陽" : "陰"}${g.el}，「${g.name}」之數，${g.level}。`;
  const pi = [head, g.pi + "。"];
  let bai = `${info.label}（也叫${info.alias}）看的是${info.role}。你的${info.label}是 ${g.n} 畫，${g.n81 !== g.n ? `超過 81 畫，以 ${g.n81} 來論，` : ""}五行屬${g.el}，在 81 數理裡屬於「${g.level}」。${g.text}`;
  if (female && g.female) { pi.push("坤造逢之，剛氣稍過。"); bai += g.female; }
  if (g.disputed) bai += "這個數在不同派別的表裡吉凶不一，判斷時要多看其他格。";
  if (k === "tian") bai += "天格由姓氏決定，改名改不到，所以只看不計分。";
  return { key: k, title: `${info.label}・${info.alias}`, pi, bai };
}

function headline(ev, seed) {
  const r = ev.wuge.ren, z = ev.wuge.zong, sc = ev.sancai;
  const p = [];
  if (ev.match) {
    const tag = ev.match.grids[0].tag;
    if (tag === "用神") p.push(r.lv > 0 ? "名合用神，數氣兩得" : "氣合用神，數上稍欠");
    else if (tag === "忌神") p.push(r.lv > 0 ? "數雖可取，氣不相投" : "數氣皆不合");
  }
  if (!p.length) {
    if (r.lv >= 1 && sc.v >= 0.35) p.push(pick(seed, ["主運得位，三才相生", "人格當令，三才通順"]));
    else if (r.lv >= 1) p.push(pick(seed, ["主運可取，配置稍滯", "人格得數，三才未順"]));
    else if (r.lv <= -1) p.push(pick(seed, ["主運欠安，宜早調理", "人格失數，根本須補"]));
    else p.push("主運平平，吉中帶動");
  }
  if (z.lv >= 1) p.push(pick(seed + "z", ["後運漸開", "晚景可期"]));
  else if (z.lv <= -1) p.push(pick(seed + "z", ["晚運宜守", "後運須防"]));
  else p.push("前勞後穩");
  return p.slice(0, 2).join("，");
}
function headlinePlain(ev) {
  const r = ev.wuge.ren, z = ev.wuge.zong;
  const a = r.lv >= 1 ? "名字的核心（人格）是好數" : r.lv <= -1 ? "名字的核心（人格）不理想" : "名字的核心（人格）中規中矩";
  const b = ev.match ? (ev.match.grids[0].tag === "用神" ? "，而且正好補到你八字最需要的五行" : ev.match.grids[0].tag === "忌神" ? "，但五行和你的八字不合" : "") : "";
  const c = z.lv >= 1 ? "；中晚年運勢看好。" : z.lv <= -1 ? "；中晚年要多留意。" : "；整體平穩。";
  return a + b + c;
}

function topicSection(topic, ev, female) {
  const w = ev.wuge, has = t => ["ren", "di", "wai", "zong"].some(k => w[k].tags.includes(t));
  const pi = [], bai = [];
  if (topic === "career") {
    pi.push(w.ren.lv > 0 ? "主運得數，事業可成" : "主運欠數，基業須固", REN_WAI[ev.rel.renWai][0]);
    bai.push(`看事業主要看人格和外格。人格「${w.ren.name}」${w.ren.lv > 0 ? "有成事的格局" : "代表根基還要多下功夫"}。${REN_WAI[ev.rel.renWai][1]}`);
    if (has("首領")) { pi.push("帶首領之數，宜任要職"); bai.push("名字裡有首領之數，適合帶人、獨當一面。"); }
    if (has("藝能")) { pi.push("帶藝能之數，技藝可顯"); bai.push("名字裡有藝能之數，走技術、創作或專業路線容易出頭。"); }
    if (has("剛強")) bai.push("數理偏剛，做事果斷，與同事相處要多留餘地。");
    if (ev.bazi) { pi.push(`用神在${ev.bazi.yong}，宜就${ev.bazi.yong}業`); bai.push(`八字用神是${ev.bazi.yong}，${INDUSTRY[ev.bazi.yong]}這類屬${ev.bazi.yong}的行業比較得力。`); }
  } else if (topic === "love") {
    pi.push(REN_DI[ev.rel.renDi][0]);
    bai.push(`看感情主要看人格和地格的關係。${REN_DI[ev.rel.renDi][1]}`);
    if (female && ["ren", "di", "wai", "zong"].some(k => w[k].female && w[k].lv > 0)) { pi.push("坤造帶剛數，宜以柔濟"); bai.push("名字裡有傳統上女性忌用的數，代表個性偏強，感情裡要懂得退一步。"); }
    if (has("溫和")) { pi.push("數帶溫和，情緣綿長"); bai.push("數理溫和，待人體貼，感情多是細水長流。"); }
    if (w.di.lv <= -1) { pi.push("地格失數，早歲情波"); bai.push("地格不理想，年輕時感情波折較多，晚一點定下來反而穩。"); }
  } else if (topic === "money") {
    pi.push(`總格${w.zong.level}，${REN_ZONG[ev.rel.renZong][0]}`);
    bai.push(`看財運主要看總格和外格。總格「${w.zong.name}」屬${w.zong.level}。${REN_ZONG[ev.rel.renZong][1]}`);
    if (has("財富")) { pi.push("帶財富之數，聚財有基"); bai.push("名字裡有財富之數，有聚財的底子。"); }
    if (["ren", "di", "wai", "zong"].some(k => w[k].name === "散財")) { pi.push("逢散財之數，宜節宜守"); bai.push("名字裡有散財之數，錢來得快去得也快，記得存下來。"); }
    if (ev.bazi) {
      const cai = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" }[ev.bazi.dm];
      const strong = ["身強", "偏強", "極旺"].includes(ev.bazi.strength);
      pi.push(strong ? "身旺任財，可攻可取" : "身弱財重，宜穩宜聚");
      bai.push(`以八字來看，你的財星是${cai}；${strong ? "身強擔得起財，敢衝就有機會" : "身弱擔不起大財，適合穩健理財、借助團隊"}。`);
    }
  } else if (topic === "health") {
    const weak = ev.rel.tianRen === "剋" || ev.rel.renDi === "被剋" ? w.ren.el : null;
    pi.push(weak ? `人格屬${weak}而受剋，宜養${ORGAN[weak].split("、")[0]}` : "三才不剋人格，底子尚穩");
    bai.push(`傳統上看健康，是看三才五行之間有沒有剋到人格。${weak ? `你的人格屬${weak}而受剋，平日多留意${ORGAN[weak]}的保養。` : "三才之間沒有直接剋到人格，底子算穩。"}`);
    if (ev.bazi) {
      const low = Object.entries(ev.bazi.share).sort((a, b) => a[1] - b[1])[0][0];
      pi.push(`八字${low}弱，宜顧${ORGAN[low].split("、")[0]}`);
      bai.push(`八字裡${low}最弱，傳統上對應${ORGAN[low]}，作息上多照顧。`);
    }
    bai.push("這些是傳統說法，身體不舒服還是要看醫生。");
  } else {
    pi.push(TIAN_REN[ev.rel.tianRen][0], REN_DI[ev.rel.renDi][0]);
    bai.push(TIAN_REN[ev.rel.tianRen][1], REN_DI[ev.rel.renDi][1]);
  }
  return { pi: [pi.join("；") + "。"], bai: bai.join("") };
}

/** 產生完整批命 R。p: { surname, given, gender, topic, bazi? } */
export function reading(p) {
  const ev = evaluate(p);
  ev.bazi = p.bazi || null;
  const female = p.gender === "f";
  const name = [...p.surname, ...p.given].join("");
  const renameWhy = shouldRename(ev);
  const sc = ev.sancai;
  const sections = GRID_KEYS.map(k => gridSection(k, ev.wuge[k], female));

  sections.push({
    key: "sancai", title: "三才配置",
    pi: [`天${sc.key[0]}、人${sc.key[1]}、地${sc.key[2]}，${sc.level}。`, `${TIAN_REN[ev.rel.tianRen][0]}；${REN_DI[ev.rel.renDi][0]}；${SANCAI_LV[sc.level]}。`],
    bai: `三才是天格、人格、地格三者的五行關係，看一生運勢順不順。你的三才是天${sc.key[0]}、人${sc.key[1]}、地${sc.key[2]}，屬「${sc.level}」${sc.disputed ? "（這個組合各派看法分歧）" : ""}。${TIAN_REN[ev.rel.tianRen][1]}${REN_DI[ev.rel.renDi][1]}`,
  });
  sections.push({
    key: "outer", title: "人際與後運",
    pi: [`${REN_WAI[ev.rel.renWai][0]}；${REN_ZONG[ev.rel.renZong][0]}。`],
    bai: REN_WAI[ev.rel.renWai][1] + REN_ZONG[ev.rel.renZong][1],
  });

  if (ev.bazi && ev.match) {
    const b = ev.bazi, m = ev.match;
    const gl = m.grids.map(g => `${({ ren: "人格", di: "地格", zong: "總格" })[g.key]}屬${g.el}（${g.tag}）`).join("、");
    const cl = m.chars.map(c => c.el ? `「${c.ch}」屬${c.el}（${c.tag}）` : `「${c.ch}」字五行未列`).join("、");
    const renTag = m.grids[0].tag;
    sections.push({
      key: "bazi", title: "八字配合",
      pi: [
        `${female ? "坤" : "乾"}造　${b.pillars.map(x => x.gz).join("　")}。`,
        `日主${b.dmGan}${b.dm}，生於${b.pillars[1].gz[1]}月，${b.deLing ? "得令" : "失令"}，${b.strength}。`,
        `取${b.yong}為用${b.xi.length ? `，${b.xi.join("、")}為喜` : ""}${b.ji.length ? `，忌${b.ji.join("、")}` : ""}。`,
        renTag === "用神" ? "名之人格正合用神，數氣相投。" : renTag === "喜神" ? "名之人格得喜神之氣，可。" : renTag === "忌神" ? "名之人格反犯忌神，宜易之。" : "名之人格為閒神，無大礙。",
      ],
      bai: `日主是你出生那天的天干，代表你自己：${b.dmGan}屬${b.dm}。整個八字裡幫你的力量約佔 ${Math.round(b.support * 100)}%，屬於「${b.strength}」。` +
        `所以你最需要的五行（用神）是${b.yong}${b.xi.length ? `，其次是${b.xi.join("、")}（喜神）` : ""}；${b.ji.length ? `${b.ji.join("、")}則是要避開的忌神` : ""}。` +
        `名字的落點：${gl}；用字：${cl}。` +
        (renTag === "忌神" ? "人格的五行正好是忌神，等於每天被叫著不合的五行，這是名字最該調整的地方。" :
          renTag === "用神" ? "人格的五行正好是用神，名字天天在替你補氣，這是好名字的根本。" : ""),
      reasons: b.reasons,
    });
    const z = ev.zodiac;
    sections.push({
      key: "zodiac", title: "生肖字根",
      pi: [z.hits.length ? `肖${z.animal}，${z.hits.map(h => `「${h.ch}」${h.good ? "得" : "犯"}${h.why.replace(/（.*）/, "")}`).join("，")}。` : `肖${z.animal}，名無喜忌字根，不增不減。`],
      bai: z.hits.length
        ? `你屬${z.animal}（以立春換年）。${z.hits.map(h => `「${h.ch}」帶有${h.root}，${h.good ? "符合" : "觸犯"}${h.why}`).join("；")}。生肖姓名學是另一派說法，熊崎派不採用，這裡只當參考，權重最低。`
        : `你屬${z.animal}，名字用字沒有明顯的生肖喜忌字根，不加分也不扣分。`,
    });
  }

  const topic = p.topic || "all";
  sections.push({ key: "topic", title: `所問之事：${(TOPICS.find(t => t[0] === topic) || TOPICS[4])[1]}`, ...topicSection(topic, ev, female) });
  sections.push({
    key: "rename", title: "改名與否",
    pi: [renameWhy.length ? "名有所損，宜擇吉更易。" : ev.grade === "上上" || ev.grade === "上" ? "名格俱佳，毋庸更易。" : "名可堪用，更易隨緣。"],
    bai: renameWhy.length
      ? `原因：${renameWhy.join("、")}。建議認真考慮改名，或至少取一個常用名來用。`
      : ev.grade === "上上" || ev.grade === "上" ? "這個名字好好用著就好，不必改。" : "名字可以用，沒有非改不可的毛病；想更好，可以看看擬好的幾個名字。",
  });

  return {
    system: "姓名學",
    name, surname: p.surname.join(""), given: p.given.join(""), gender: p.gender, topic,
    chars: [...ev.sInfo, ...ev.gInfo].map((c, i) => ({ ...c, part: i < p.surname.length ? "姓" : "名" })),
    wuge: ev.wuge, sancai: ev.sancai, rel: ev.rel,
    score: ev.score, grade: ev.grade, parts: ev.parts,
    headline: headline(ev, name), headlinePlain: headlinePlain(ev),
    renameAdvised: renameWhy.length > 0, renameWhy,
    bazi: ev.bazi, match: ev.match, zodiac: ev.zodiac,
    sections,
  };
}
