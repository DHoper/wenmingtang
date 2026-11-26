// 生肖字根（生肖姓名學）
// 依據：地支三合、六合為喜，六沖、六害為忌，這是各家共通的骨架；再加上各家常見的食性與棲所說法。
// 參考：知乎〈十二生肖取名用字宜忌〉https://zhuanlan.zhihu.com/p/605064019
//       66cn〈生肖起名法…喜用字根〉https://www.66cn.com/zhouyi/357.html（六沖六害表）
//       江紘均姓名學〈生肖牛 忌用字根〉https://fatename.com/content-224.html
// 各家細目差異很大，本站只收多數來源共有的說法，且生肖層權重最低。

export const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
export const ANIMALS = "鼠牛虎兔龍蛇馬羊猴雞狗豬";

// 字根：部首號（康熙）＋ 額外含此部件的常用字
export const ROOTS = {
  子: { label: "子（鼠）", rad: [39], chars: "李好字享郭淳厚孔孫遊游仔" },
  丑: { label: "丑・牛", rad: [93], chars: "丑紐鈕牛" },
  寅: { label: "寅・虎", rad: [141], chars: "寅演彪" },
  卯: { label: "卯・兔", rad: [], chars: "卯柳卿勉逸晚兔昴" },
  辰: { label: "辰・龍", rad: [161, 212], chars: "振震宸晨農濃瓏龐" },
  巳: { label: "巳・蛇", rad: [142, 54], chars: "巳巴起祀" },
  午: { label: "午・馬", rad: [187], chars: "午許" },
  未: { label: "未・羊", rad: [123], chars: "未妹味昧祥洋翔姜詳善義羲儀養達" },
  申: { label: "申・猴", rad: [], chars: "申紳伸坤神暢袁遠猴" },
  酉: { label: "酉・雞", rad: [164, 196], chars: "西" },
  戌: { label: "戌・狗", rad: [94], chars: "戌成城誠盛晟威茂獻" },
  亥: { label: "亥・豬", rad: [152], chars: "亥該核孩刻家" },
  艸: { label: "草（艹）", rad: [140] },
  穀: { label: "五穀（禾米豆麥）", rad: [115, 119, 151, 199], chars: "秀科秋穎稻" },
  肉: { label: "肉食（心、忄、月）", rad: [61, 130] },
  宀: { label: "洞穴屋宇（宀、口）", rad: [40, 30] },
  山: { label: "山", rad: [46] },
  木: { label: "林木", rad: [75] },
  水: { label: "水（氵、雨）", rad: [85, 173] },
  田: { label: "田地", rad: [102] },
  人: { label: "人（亻）", rad: [9] },
  日: { label: "日", rad: [72] },
};

// 地支關係
const SANHE = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];
const LIUHE = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const CHONG = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
const HAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
const partner = (list, b) => list.filter(p => p.includes(b)).map(p => p.replace(b, "")).join("").split("").filter(x => x && x !== b);

// 食性、棲所（多數來源共有的說法）
const HABIT = {
  子: { like: [["穀", "鼠愛五穀，有糧可食"], ["宀", "鼠居洞穴，有屋可藏"]], avoid: [["人", "鼠怕人"], ["日", "鼠晝伏夜出"]] },
  丑: { like: [["艸", "牛食草"], ["穀", "牛得五穀"], ["田", "牛耕田，有地可展"], ["水", "水牛得水自在"]], avoid: [["肉", "牛不食肉，見肉吃不到"], ["山", "牛上山步履艱難"]] },
  寅: { like: [["山", "虎歸山林"], ["木", "虎居林中"], ["肉", "虎為肉食"]], avoid: [["穀", "虎不食五穀"], ["人", "虎入人間受困"]] },
  卯: { like: [["艸", "兔食草"], ["宀", "兔居洞穴"], ["木", "兔得林木遮蔽"]], avoid: [["肉", "兔不食肉"], ["山", "兔在山野多猛獸"]] },
  辰: { like: [["水", "龍得水而行"], ["日", "龍騰於天，近日月"]], avoid: [["山", "龍困山中"], ["肉", "龍不屑凡食"]] },
  巳: { like: [["肉", "蛇為肉食"], ["宀", "蛇居洞穴"], ["艸", "蛇藏草叢"]], avoid: [["穀", "蛇不食五穀"], ["人", "蛇怕人"]] },
  午: { like: [["艸", "馬食草"], ["穀", "馬得五穀"], ["木", "馬得林蔭"]], avoid: [["肉", "馬不食肉"], ["田", "馬入田受困"], ["水", "馬怕陷水"]] },
  未: { like: [["艸", "羊食草"], ["穀", "羊得五穀"], ["木", "羊得林蔭"]], avoid: [["肉", "羊不食肉"], ["水", "羊怕水"]] },
  申: { like: [["木", "猴居林木"], ["宀", "猴得洞穴"]], avoid: [["山", "猴困山野"], ["日", "猴怕烈日"]] },
  酉: { like: [["穀", "雞啄五穀"], ["山", "雞上山為鳳"], ["宀", "雞得棲所"]], avoid: [["肉", "雞不食肉"], ["水", "雞怕水"]] },
  戌: { like: [["人", "狗親人、忠於主"], ["宀", "狗有家可守"], ["肉", "狗食肉"]], avoid: [["日", "狗怕烈日"], ["山", "狗離家入山"]] },
  亥: { like: [["穀", "豬食五穀"], ["水", "豬得水自在"], ["宀", "豬有圈可居"], ["田", "豬得田地"]], avoid: [["肉", "豬不食肉"], ["山", "豬上山受困"]] },
};

export function zodiacRules(branch) {
  const like = [], avoid = [];
  for (const b of partner(SANHE, branch)) like.push([b, `三合（${ANIMALS[BRANCHES.indexOf(b)]}）`]);
  for (const b of partner(LIUHE, branch)) like.push([b, `六合（${ANIMALS[BRANCHES.indexOf(b)]}）`]);
  for (const b of partner(CHONG, branch)) avoid.push([b, `六沖（${ANIMALS[BRANCHES.indexOf(b)]}）`]);
  for (const b of partner(HAI, branch)) avoid.push([b, `六害（${ANIMALS[BRANCHES.indexOf(b)]}）`]);
  like.push(...HABIT[branch].like);
  avoid.push(...HABIT[branch].avoid);
  return { branch, animal: ANIMALS[BRANCHES.indexOf(branch)], like, avoid };
}
