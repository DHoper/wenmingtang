// 複姓：台灣戶籍常見與古籍常見複姓。AMBIGUOUS 是可能被誤判為「單姓＋名」的台灣複姓，需向使用者確認。
export const COMPOUND = "歐陽 司馬 諸葛 上官 司徒 東方 夏侯 皇甫 尉遲 公孫 慕容 長孫 宇文 令狐 軒轅 端木 西門 南宮 獨孤 聞人 澹臺 公冶 宗政 濮陽 太叔 申屠 鍾離 呼延 赫連 拓跋 万俟 左丘 第五 段干 百里 東郭 南門 羊舌 微生 公羊 梁丘 公良 樂正 漆雕 壤駟 夾谷 宰父 穀梁 范姜 張簡 張廖".split(" ");
export const AMBIGUOUS = new Set(["范姜", "張簡", "張廖"]);

// 出生地：經度與 IANA 時區（時區用來還原當年的標準時與日光節約時間）
export const PLACES = [
  ["基隆市", 121.74, "Asia/Taipei"], ["臺北市", 121.56, "Asia/Taipei"], ["新北市", 121.46, "Asia/Taipei"],
  ["桃園市", 121.30, "Asia/Taipei"], ["新竹市", 120.97, "Asia/Taipei"], ["新竹縣", 121.02, "Asia/Taipei"],
  ["苗栗縣", 120.82, "Asia/Taipei"], ["臺中市", 120.68, "Asia/Taipei"], ["彰化縣", 120.54, "Asia/Taipei"],
  ["南投縣", 120.69, "Asia/Taipei"], ["雲林縣", 120.53, "Asia/Taipei"], ["嘉義市", 120.45, "Asia/Taipei"],
  ["嘉義縣", 120.57, "Asia/Taipei"], ["臺南市", 120.21, "Asia/Taipei"], ["高雄市", 120.31, "Asia/Taipei"],
  ["屏東縣", 120.49, "Asia/Taipei"], ["宜蘭縣", 121.75, "Asia/Taipei"], ["花蓮縣", 121.60, "Asia/Taipei"],
  ["臺東縣", 121.15, "Asia/Taipei"], ["澎湖縣", 119.57, "Asia/Taipei"], ["金門縣", 118.32, "Asia/Taipei"],
  ["連江縣", 119.95, "Asia/Taipei"],
  ["香港", 114.17, "Asia/Hong_Kong"], ["澳門", 113.54, "Asia/Macau"], ["北京", 116.40, "Asia/Shanghai"],
  ["上海", 121.47, "Asia/Shanghai"], ["廣州", 113.26, "Asia/Shanghai"], ["新加坡", 103.85, "Asia/Singapore"],
  ["吉隆坡", 101.69, "Asia/Kuala_Lumpur"], ["東京", 139.69, "Asia/Tokyo"], ["首爾", 126.98, "Asia/Seoul"],
  ["曼谷", 100.50, "Asia/Bangkok"], ["雪梨", 151.21, "Australia/Sydney"], ["倫敦", -0.13, "Europe/London"],
  ["溫哥華", -123.12, "America/Vancouver"], ["舊金山", -122.42, "America/Los_Angeles"],
  ["洛杉磯", -118.24, "America/Los_Angeles"], ["紐約", -74.01, "America/New_York"], ["多倫多", -79.38, "America/Toronto"],
];

export const TOPICS = [
  ["career", "事業"], ["love", "感情"], ["money", "財運"], ["health", "健康"], ["all", "綜合"],
];
