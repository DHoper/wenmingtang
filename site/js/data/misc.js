// 複姓：台灣戶籍常見與古籍常見複姓。AMBIGUOUS 是可能被誤判為「單姓＋名」的台灣複姓，需向使用者確認。
export const COMPOUND = "歐陽 司馬 諸葛 上官 司徒 東方 夏侯 皇甫 尉遲 公孫 慕容 長孫 宇文 令狐 軒轅 端木 西門 南宮 獨孤 聞人 澹臺 公冶 宗政 濮陽 太叔 申屠 鍾離 呼延 赫連 拓跋 万俟 左丘 第五 段干 百里 東郭 南門 羊舌 微生 公羊 梁丘 公良 樂正 漆雕 壤駟 夾谷 宰父 穀梁 范姜 張簡 張廖".split(" ");
export const AMBIGUOUS = new Set(["范姜", "張簡", "張廖"]);

// 出生地：[名稱, 經度, 時區]。名稱是存檔的鍵。臺灣照各縣市經度算真太陽時；
// 「海外」不知道確切位置，照出生地當地的鐘點直接排（不做經度校正）。以前存過的海外城市名一律當「海外」。
export const PLACES = [
  ["基隆市", 121.74, "Asia/Taipei"], ["臺北市", 121.56, "Asia/Taipei"], ["新北市", 121.46, "Asia/Taipei"],
  ["桃園市", 121.30, "Asia/Taipei"], ["新竹市", 120.97, "Asia/Taipei"], ["新竹縣", 121.02, "Asia/Taipei"],
  ["苗栗縣", 120.82, "Asia/Taipei"], ["臺中市", 120.68, "Asia/Taipei"], ["彰化縣", 120.54, "Asia/Taipei"],
  ["南投縣", 120.69, "Asia/Taipei"], ["雲林縣", 120.53, "Asia/Taipei"], ["嘉義市", 120.45, "Asia/Taipei"],
  ["嘉義縣", 120.57, "Asia/Taipei"], ["臺南市", 120.21, "Asia/Taipei"], ["高雄市", 120.31, "Asia/Taipei"],
  ["屏東縣", 120.49, "Asia/Taipei"], ["宜蘭縣", 121.75, "Asia/Taipei"], ["花蓮縣", 121.60, "Asia/Taipei"],
  ["臺東縣", 121.15, "Asia/Taipei"], ["澎湖縣", 119.57, "Asia/Taipei"], ["金門縣", 118.32, "Asia/Taipei"],
  ["連江縣", 119.95, "Asia/Taipei"],
  ["海外", null, null],
];
export const PLACE_GROUPS = [["臺灣", PLACES.filter(p => p[2]).map(p => p[0])], ["其他", ["海外"]]];
export const placeOf = n => PLACES.find(p => p[0] === n) || PLACES[PLACES.length - 1];

export const TOPICS = [
  ["all", "綜合"], ["career", "事業"], ["love", "感情"], ["money", "財運"], ["health", "健康"],
];
