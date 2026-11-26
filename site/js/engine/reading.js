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
  土: "不動產、建築、農業、仲介、顧問", 金: "金融、法律、機械、五金、科技硬體",
  水: "貿易、物流、旅遊、水產、冷飲",
};

// 生剋文字。鍵為 relation(天格, 人格) 或 relation(人格, X)：生＝前者生後者、被生＝後者生前者、剋、被剋同理
const TIAN_REN = {
  生: ["天生人格，上承蔭庇", "長輩緣好，上頭有人肯拉你一把，起步比別人輕鬆。"],
  被生: ["人生天格，孝親勞己", "你孝順，長輩、老闆交代的都肯做，只是累的都是自己。"],
  比和: ["天人同氣，上下相投", "跟長輩、跟主管合得來，家裡傳下來的規矩，你也做得來。"],
  剋: ["天剋人格，上壓難伸", "上面壓得重，常覺得被長輩或老闆管得死死的。該講的話要講，不要都吞下去。"],
  被剋: ["人剋天格，自立違上", "你不太給人管，跟長輩常意見不合。自己出來闖是沒問題，回家講話軟一點就好。"],
};
const REN_DI = {
  生: ["人生地格，勞心顧家", "你很顧家，也顧底下的人，什麼都往身上扛。家裡是和樂，就是你自己較累。"],
  被生: ["地生人格，根基有靠", "家裡牢靠，背後有人挺你，出去打拚免煩惱後面。"],
  比和: ["人地同氣，內外安和", "裡外一個樣，家裡平平安安，沒什麼好操心的。"],
  剋: ["人剋地格，治下過嚴", "你對家人、對底下的人要求較嚴，管得多。有些事放手給他們做做看。"],
  被剋: ["地剋人格，根基動搖", "家裡或底下的人常給你出難題，後頭常有事拖著。先把家顧好，再往外衝。"],
};
const REN_WAI = {
  被生: ["外生人格，貴人扶持", "出外有貴人，遇到卡關的事，常常有人伸手。"],
  生: ["人生外格，施多得少", "你熱心，朋友有事你都去幫，只是幫得多、回來的少。看清楚人再出手。"],
  比和: ["人外同氣，友若兄弟", "朋友跟兄弟一樣，在外面走得順。"],
  被剋: ["外剋人格，慎防小人", "外面的人容易壓你、佔你便宜。借錢、作保、簽名這種事，多想一下。"],
  剋: ["人剋外格，威而少親", "你在外面有威嚴，人家敬你也怕你。記得給人留面子，路才會寬。"],
};
const REN_ZONG = {
  被生: ["總生人格，晚運得助", "中晚年有人幫，愈老愈順。"],
  生: ["人生總格，前勤後豐", "年輕時打拚的，老了會一點一點收回來。"],
  比和: ["人總同氣，一生平穩", "一世人平平順順，沒什麼大起大落。"],
  被剋: ["總剋人格，晚歲多勞", "中晚年擔子較重，四十歲以後的事，要早一點準備。"],
  剋: ["人剋總格，事業自創", "你是自己打天下的命，要什麼，自己伸手去拿。"],
};
const LV_SAY = { 2: "大吉的數", 1: "吉數", 0.5: "好的多、壞的少", "-0.5": "壞的多、好的少", "-1": "凶數", "-2": "大凶的數" };
const SANCAI_SAY = { 大吉: "大順", 吉: "算順", 吉凶參半: "一半好一半卡", 凶多於吉: "卡卡的", 凶: "不順" };
const ROLE_SAY = {
  tian: "天格跟著姓走，祖上給的，我順帶看看。",
  ren: "人格最要緊，看的就是你這個人。",
  di: "地格看前半生，也看家裡、看囝仔。",
  wai: "外格看出外，朋友、貴人都看這格。",
  zong: "總格看後半輩子。",
};
// 這一格是哪幾個字加起來的，講給客人聽得懂
function compose(k, ev) {
  const S = ev.sInfo, G = ev.gInfo, c = x => `「${x.ch}」${han(x.strokes)}畫`;
  const sLast = S[S.length - 1], g1 = G[0], gLast = G[G.length - 1];
  const one = S.length === 1, single = G.length === 1;
  const n = han(ev.wuge[k].n);
  if (k === "tian") return one ? `你姓${c(S[0])}，單姓再加一，天格${n}畫` : `複姓${c(S[0])}加${c(S[1])}，天格${n}畫`;
  if (k === "ren") return `姓${c(sLast)}，加上名字頭一個字${c(g1)}，人格${n}畫`;
  if (k === "di") return single ? `名字只有一個${c(g1)}，單名再加一，地格${n}畫` : `名字${c(g1)}加${c(gLast)}，地格${n}畫`;
  if (k === "wai") {
    if (one && single) return `單姓單名，外格照規矩算${n}畫`;
    if (one) return `外格看名字最後一個字，${c(gLast)}再加一，${n}畫`;
    if (single) return `外格是複姓頭一個字${c(S[0])}再加一，${n}畫`;
    return `外格是複姓頭一個字${c(S[0])}，加名字最後一個${c(gLast)}，${n}畫`;
  }
  return `整個名字${[...S, ...G].map(c).join("、")}，全部加起來，總格${n}畫`;
}
const SANCAI_LV = {
  大吉: "三才通順，福壽可期", 吉: "五行相宜，平順可成", 吉凶參半: "吉凶互見，成敗在人",
  凶多於吉: "氣有阻滯，宜慎宜守", 凶: "三才相戾，宜早調和",
};

function gridSection(k, g, female, ev) {
  const info = GRID_INFO[k];
  const head = `${info.label}${han(g.n)}，屬${g.yang ? "陽" : "陰"}${g.el}，「${g.name}」之數，${g.level}。`;
  const pi = [head, g.pi + "。"];
  let bai = `${ROLE_SAY[k]}${compose(k, ev)}，${g.n81 !== g.n ? `數大過八十一，照${han(g.n81)}看，` : ""}屬${g.el}，叫「${g.name}」，${LV_SAY[g.lv]}。${g.text}`;
  if (female && g.female) { pi.push("坤造逢之，剛氣稍過。"); bai += g.female; }
  if (g.disputed) bai += "這個數，有的師父說好，有的說不好，我會配別格一起看。";
  return { key: k, title: `${info.label}・${info.alias}`, pi, bai };
}

function headline(ev, seed) {
  const r = ev.wuge.ren, z = ev.wuge.zong, sc = ev.sancai;
  const p = [];
  if (ev.match) {
    const tag = ev.match.grids[0].tag;
    if (tag === "用神") p.push(r.lv > 0 ? "名合用神，數氣兩得" : "氣合用神，數則稍欠");
    else if (tag === "忌神") p.push(r.lv > 0 ? "數雖可取，氣不相投" : "數氣俱乖");
  }
  if (!p.length) {
    if (r.lv >= 1 && sc.v >= 0.35) p.push(pick(seed, ["主運得位，三才相生", "人格當令，三才通順"]));
    else if (r.lv >= 1) p.push(pick(seed, ["主運可取，五行稍滯", "人格得數，三才未順"]));
    else if (r.lv <= -1) p.push(pick(seed, ["主運欠安，宜早調理", "人格失數，根本須補"]));
    else p.push("主運中平，守之可安");
  }
  if (z.lv >= 1) p.push(pick(seed + "z", ["後運漸開", "晚景可期"]));
  else if (z.lv <= -1) p.push(pick(seed + "z", ["晚運宜守", "後運須防"]));
  else p.push("前勞後穩");
  return p.slice(0, 2).join("，");
}
function headlinePlain(ev) {
  const r = ev.wuge.ren, z = ev.wuge.zong;
  const a = r.lv >= 1 ? "人格是好數，名字的底子好" : r.lv <= -1 ? "人格的數不好，名字的底子就差一截" : "人格不好不壞，中規中矩";
  const b = ev.match ? (ev.match.grids[0].tag === "用神" ? "，又剛好補到你八字最欠的" : ev.match.grids[0].tag === "忌神" ? "，可惜跟你的八字不對盤" : "") : "";
  const c = z.lv >= 1 ? "。老運不錯。" : z.lv <= -1 ? "。後半輩子要多顧一點。" : "。整個看起來算平順。";
  return a + b + c;
}

function topicSection(topic, ev, female) {
  const w = ev.wuge, has = t => ["ren", "di", "wai", "zong"].some(k => w[k].tags.includes(t));
  const pi = [], bai = [];
  if (topic === "career") {
    pi.push(w.ren.lv > 0 ? "主運得數，事業可成" : "主運欠數，基業須固", REN_WAI[ev.rel.renWai][0]);
    bai.push(`問事業，我看人格跟外格。你人格「${w.ren.name}」，${w.ren.lv > 0 ? "有做得起來的底子" : "根基還要再磨一磨"}。${REN_WAI[ev.rel.renWai][1]}`);
    if (has("首領")) { pi.push("帶首領之數，宜任要職"); bai.push("名字裡帶首領的數，你適合帶人，一直聽人家的反而做不久。"); }
    if (has("藝能")) { pi.push("帶藝能之數，技藝可顯"); bai.push("帶藝能的數，靠一技之長吃飯最實在，學一門手藝或技術，這條路好走。"); }
    if (has("剛強")) bai.push("數偏硬，做事果斷，跟同事講話留一點餘地。");
    if (ev.bazi) { pi.push(`用神在${ev.bazi.yong}，宜就${ev.bazi.yong}業`); bai.push(`你八字要${ev.bazi.yong}，${INDUSTRY[ev.bazi.yong]}這類屬${ev.bazi.yong}的頭路，做起來較得力。`); }
  } else if (topic === "love") {
    pi.push(REN_DI[ev.rel.renDi][0]);
    bai.push(`問感情，我看人格跟地格。${REN_DI[ev.rel.renDi][1]}`);
    if (female && ["ren", "di", "wai", "zong"].some(k => w[k].female && w[k].lv > 0)) { pi.push("坤造帶剛數，宜以柔濟"); bai.push("名字裡有幾個數，對女生來講較剛。你個性強，感情裡退一步，對方反而更疼你。"); }
    if (has("溫和")) { pi.push("數主溫良，情緣綿長"); bai.push("數溫和，待人體貼，感情是細水長流那款。"); }
    if (w.di.lv <= -1) { pi.push("地格失數，早歲情波"); bai.push("地格不好，年輕時感情較多波折，晚一點定下來反而好。"); }
  } else if (topic === "money") {
    pi.push(`總格${w.zong.level}，${REN_ZONG[ev.rel.renZong][0]}`);
    bai.push(`問錢，我看總格跟外格。你總格「${w.zong.name}」，${LV_SAY[w.zong.lv]}。${REN_ZONG[ev.rel.renZong][1]}`);
    if (has("財富")) { pi.push("帶財富之數，聚財有基"); bai.push("名字裡帶財的數，錢留得住。"); }
    if (["ren", "di", "wai", "zong"].some(k => w[k].name === "散財")) { pi.push("逢散財之數，宜節宜守"); bai.push("有散財的數，錢來得快去得也快，領到錢先存一些起來再花。"); }
    if (ev.bazi) {
      const cai = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" }[ev.bazi.dm];
      const strong = ["身強", "偏強", "極旺"].includes(ev.bazi.strength);
      pi.push(strong ? "身旺任財，可攻可取" : "身弱財重，宜穩宜聚");
      bai.push(`照八字看，屬${cai}的就是你的財。${strong ? "你命底夠旺，擔得起財，敢衝就有。" : "只是你命底較弱，大錢扛不住，慢慢存，或是找人合夥較好。"}`);
    }
  } else if (topic === "health") {
    const weak = ev.rel.tianRen === "剋" || ev.rel.renDi === "被剋" ? w.ren.el : null;
    pi.push(weak ? `人格屬${weak}而受剋，宜養${ORGAN[weak].split("、")[0]}` : "三才不剋人格，根基尚穩");
    bai.push(`問身體，我看三才有沒有剋到人格。${weak ? `你人格屬${weak}，被剋到了，${ORGAN[weak]}平常要多顧。` : "三才沒剋到人格，底子算好。"}`);
    if (ev.bazi) {
      const low = Object.entries(ev.bazi.share).sort((a, b) => a[1] - b[1])[0][0];
      pi.push(`八字${low}弱，宜養${ORGAN[low].split("、")[0]}`);
      bai.push(`八字裡${low}最弱，${ORGAN[low]}這些所在，平常要顧一下。`);
    }
    bai.push("身體真不舒服，去給醫生看，不要拖。");
  } else {
    pi.push(TIAN_REN[ev.rel.tianRen][0], REN_DI[ev.rel.renDi][0]);
    bai.push(TIAN_REN[ev.rel.tianRen][1], REN_DI[ev.rel.renDi][1]);
  }
  return { pi: [pi.join("；") + "。"], bai: bai.join("") };
}

// 總結：挑出最大的長處與最要顧的地方，依所問補一句，最後給改名結論
const SUM = {
  ren: ["人格", "你本人這格是好數，做人做事有底", "你本人這格不好，個性上容易吃虧"],
  zong: ["總格", "晚運好，愈老愈好過", "晚運較弱，老本要早一點存"],
  di: ["地格", "前半生有根基，家裡安定", "前半生較辛苦，家裡的事多"],
  wai: ["外格", "出外人緣好，有貴人", "出外容易碰到小人"],
  sancai: ["三才", "三才配得順，做事順手", "三才卡住，做事常常這裡順、那裡卡"],
  match: ["八字", "名字剛好補到你八字要的", "名字的五行跟你八字不合"],
  zodiac: ["生肖", "用字合你的生肖", "用字犯到你的生肖"],
};
function summarySection(ev, topic, renameWhy) {
  const W = ev.match ? { ren: .2, di: .12, zong: .12, wai: .06, sancai: .1, match: .3, zodiac: .1 } : { ren: .3, di: .2, zong: .2, wai: .1, sancai: .2 };
  const items = Object.keys(W).filter(k => ev.parts[k] !== undefined).map(k => ({ k, v: ev.parts[k], w: W[k] }));
  const best = items.filter(x => x.v >= 78).sort((a, b) => (b.v - 70) * b.w - (a.v - 70) * a.w)[0];
  const worst = items.filter(x => x.v < 56).sort((a, b) => (a.v - 70) * a.w - (b.v - 70) * b.w)[0];
  const w = ev.wuge, good = ["生", "被生", "比和"];
  const topicLine = {
    career: w.ren.lv > 0 ? "問事業，靠自己做得起來。" : "問事業，根基還要再磨。",
    love: good.includes(ev.rel.renDi) ? "問感情，家裡跟感情都算安定。" : "問感情，家裡跟另一半要多花點心。",
    money: w.zong.lv > 0 ? "問錢，錢是留得住的。" : "問錢，錢要會存，不要只會賺。",
    health: "身體照前面講的去顧就好。",
  }[topic] || "";
  let end;
  if (renameWhy.length) {
    const dir = ev.bazi ? `新名字要挑屬${ev.bazi.yong}${ev.bazi.xi.length ? "、" + ev.bazi.xi[0] : ""}的，人格屬${ev.bazi.yong}最好。` : "新名字要讓人格、總格都是好數，三才也要順。";
    end = `我的意思是要改。${dir}`;
  } else end = ev.grade === "上上" || ev.grade === "上" ? "這名字好好用就好。" : "名字可以用，不一定要改。";
  const pi = [];
  if (best) pi.push(`長在${SUM[best.k][0]}`);
  if (worst) pi.push(`短在${SUM[worst.k][0]}`);
  pi.push(renameWhy.length ? "宜擇吉更易" : ev.grade === "上上" || ev.grade === "上" ? "守之可也" : "可用隨緣");
  const bai = `${best ? `這個名字好在${SUM[best.k][1]}` : "這個名字沒有哪一格特別出色"}；${worst ? `怕的是${SUM[worst.k][2]}` : "也沒有特別要擔心的"}。${topicLine}${end}`;
  return { key: "summary", title: "總結", pi: [pi.join("，") + "。"], bai };
}

/** 產生完整批命R。p: { surname, given, gender, topic, bazi? } */
export function reading(p) {
  const ev = evaluate(p);
  ev.bazi = p.bazi || null;
  const female = p.gender === "f";
  const name = [...p.surname, ...p.given].join("");
  const renameWhy = shouldRename(ev);
  const sc = ev.sancai;
  const sections = GRID_KEYS.map(k => gridSection(k, ev.wuge[k], female, ev));

  sections.push({
    key: "sancai", title: "三才配置",
    pi: [`天${sc.key[0]}、人${sc.key[1]}、地${sc.key[2]}，${sc.level}。`, `${TIAN_REN[ev.rel.tianRen][0]}；${REN_DI[ev.rel.renDi][0]}；${SANCAI_LV[sc.level]}。`],
    bai: `你是天${sc.key[0]}、人${sc.key[1]}、地${sc.key[2]}，${SANCAI_SAY[sc.level]}。${sc.disputed ? "這個配法，師父們講的不一樣，我照我看的講。" : ""}${TIAN_REN[ev.rel.tianRen][1]}${REN_DI[ev.rel.renDi][1]}`,
  });
  sections.push({
    key: "outer", title: "出外與晚運",
    pi: [`${REN_WAI[ev.rel.renWai][0]}；${REN_ZONG[ev.rel.renZong][0]}。`],
    bai: REN_WAI[ev.rel.renWai][1] + REN_ZONG[ev.rel.renZong][1],
  });

  if (ev.bazi && ev.match) {
    const b = ev.bazi, m = ev.match;
    const gl = m.grids.map(g => `${({ ren: "人格", di: "地格", zong: "總格" })[g.key]}屬${g.el}是${g.tag}`).join("、");
    const cl = m.chars.map(c => c.el ? `「${c.ch}」屬${c.el}是${c.tag}` : `「${c.ch}」五行我不敢亂斷`).join("、");
    const renTag = m.grids[0].tag;
    sections.push({
      key: "bazi", title: "八字配合",
      pi: [
        `${female ? "坤" : "乾"}造　${b.pillars.map(x => x.gz).join("　")}。`,
        `日主${b.dmGan}${b.dm}，生於${b.pillars[1].gz[1]}月，${b.deLing ? "得令" : "失令"}，${b.strength}。`,
        `取${b.yong}為用${b.xi.length ? `，${b.xi.join("、")}為喜` : ""}${b.ji.length ? `，忌${b.ji.join("、")}` : ""}。`,
        renTag === "用神" ? "名之人格正合用神，數氣相投。" : renTag === "喜神" ? "名之人格得喜神之氣，可。" : renTag === "忌神" ? "名之人格反犯忌神，宜易之。" : "名之人格為閒神，無大礙。",
      ],
      bai: `你是${b.dmGan}${b.dm}的命，八字裡幫你的力量大概${(n => n === 2 ? "兩" : han(n))(Math.max(1, Math.round(b.support * 10)))}成，算${b.strength}。` +
        `你最要的是${b.yong}${b.xi.length ? `；${b.xi.join("、")}也幫得到你` : ""}${b.ji.length ? `；${b.ji.join("、")}跟你不合，要避開` : ""}。` +
        `再看名字：${gl}；用的字，${cl}。` +
        (renTag === "忌神" ? "人格偏偏落在忌神，等於每天被人叫著跟你不合的五行。名字最該改的，就是這裡。" :
          renTag === "用神" ? "人格剛好落在用神，名字天天在替你補。這是好名字。" : ""),
      reasons: b.reasons,
    });
    const z = ev.zodiac;
    sections.push({
      key: "zodiac", title: "生肖字根",
      pi: [z.hits.length ? `肖${z.animal}，${z.hits.map(h => `「${h.ch}」${h.good ? "得" : "犯"}${h.why.replace(/（.*）/, "")}`).join("，")}。` : `肖${z.animal}，名無喜忌字根，不增不減。`],
      bai: z.hits.length
        ? `你屬${z.animal}，生肖照立春換年算。${z.hits.map(h => `「${h.ch}」有${h.root}，${h.good ? "合到" : "犯到"}${h.why}`).join("；")}。生肖這個，有的師父看得很重，我是順便看看，不會為了這個說你名字好壞。`
        : `你屬${z.animal}，名字的字沒合到也沒犯到，生肖這邊沒好也沒壞。`,
    });
  }

  const topic = p.topic || "all";
  sections.push({ key: "topic", title: `所問之事：${(TOPICS.find(t => t[0] === topic) || TOPICS.find(t => t[0] === "all"))[1]}`, ...topicSection(topic, ev, female) });
  sections.push({
    key: "rename", title: "改名與否",
    pi: [renameWhy.length ? "名有所損，宜擇吉更易。" : ev.grade === "上上" || ev.grade === "上" ? "名格俱佳，毋庸更易。" : "名可堪用，更易隨緣。"],
    bai: renameWhy.length
      ? `我直接講，${renameWhy.join("，")}。這要認真想一下。不想動戶口名簿，取個常用名，天天給人叫，也有效。`
      : ev.grade === "上上" || ev.grade === "上" ? "這名字好好用就好，不用改。" : "名字可以用，沒有非改不可的毛病。要更好，我再挑幾個給你看。",
  });

  sections.push(summarySection(ev, topic, renameWhy));

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
