"""一次性：ai-prompt.js 加上「整張批命由 AI 寫」的格式與新的次數設定。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\ai-prompt.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub(r'''export const LIMITS = {
  QUESTION_MAX: 50,   // 叩問最多幾個字
  USER_PER_DAY: 3,    // 每個人每天幾次（臺灣時間零點重算）
  SITE_PER_DAY: 200,  // 整個網站每天幾次
  ANSWER_MAX_Q: 240,  // 有叩問時，回答最多幾個字（超過在句號處截斷）
  ANSWER_MAX_ALL: 420, // 細說最多幾個字
};''', r'''export const LIMITS = {
  QUESTION_MAX: 50,      // 追問最多幾個字
  USER_READINGS: 3,      // 每個人每天幾張 AI 批命（臺灣時間零點重算）
  FOLLOWUPS: 3,          // 每張批命可以追問幾次
  USER_ASKS: 9,          // 每個人每天追問總數（3 張 × 3 次）
  SITE_CALLS: 400,       // 整個網站每天呼叫 AI 的總次數（Cloudflare 免費方案 KV 每天寫入上限 1000，每次呼叫寫 2 筆）
  ANSWER_MAX_Q: 240,     // 追問回答最多幾個字（超過在句號處截斷）
  SECTION_MAX: 220,      // 批命每一段最多幾個字
};
// 批命的段落：AI 用【標籤】分段輸出，網頁一段一段接
export const READING_TAGS = [["總評", "headline"], ["天格", "tian"], ["人格", "ren"], ["地格", "di"], ["外格", "wai"], ["總格", "zong"], ["三才", "sancai"], ["出外與晚運", "outer"], ["八字", "bazi"], ["生肖", "zodiac"], ["所問", "topic"], ["改名", "rename"], ["總結", "summary"]];''')

sub(r'''export const SYSTEM = [PERSONA, RULES, BOUNDS, FORMAT].join("\n\n");''', r'''export const FORMAT_READING = `這一回是替客人整張批命，全部的評語都由你親口講。依據裡的「各段白話」是給你參考的底稿，意思、吉凶、畫數都要照它，但要用你自己的話重新講，不要照抄。

照下面的格式輸出，每段開頭一行是【標籤】，標籤後面直接寫這段的話，不要寫標題、不要有其他說明：
【總評】一兩句，講這個名字給人的整體感覺和最要緊的一點，四十字內。
【天格】講是哪個字幾畫加起來、屬什麼、吉凶，再講這格看什麼。天格是祖上給的，順帶看看。
【人格】同上，人格看這個人本身，要講得最仔細。
【地格】同上，看前半生、家裡、囝仔。
【外格】同上，看出外、朋友、貴人。
【總格】同上，看後半輩子。
【三才】天、人、地三格的五行配起來順不順，講生剋對這個人的影響。
【出外與晚運】把人格和外格、人格和總格的生剋串起來講。
【八字】只有給了生辰才寫：日主、強弱、用神喜神忌神，名字的格和用字有沒有補到。沒給生辰就整段不要寫，連標籤都不要。
【生肖】只有給了生辰才寫：用字合到或犯到生肖。沒給生辰就整段不要寫。
【所問】回應客人在招牌上問的方向（事業、感情、財運、健康或綜合）。
【改名】照依據講要不要改，要改就講往哪個五行、什麼筆畫去找。
【總結】三句以內，先講好在哪、怕在哪，再給一句做得到的話。

每段六十到一百二十字（人格可以到一百五十字），講到格一定講出是哪幾個字、幾畫。整張不要超過一千五百字。`;

export const SYSTEM = [PERSONA, RULES, BOUNDS, FORMAT].join("\n\n");
export const SYSTEM_READING = [PERSONA, RULES, BOUNDS, FORMAT_READING].join("\n\n");''')

sub(r'''export function messagesFor(basis, question = "") {
  const q = cleanQuestion(question);''', r'''export function messagesFor(basis, question = "", mode = "ask") {
  if (mode === "reading") return [{ role: "system", content: SYSTEM_READING }, { role: "user", content: "批命依據：\n" + JSON.stringify(basis, null, 1) + "\n\n請照格式替他整張批命。" }];
  const q = cleanQuestion(question);''')

sub(r'''- 有【客人問】時：第一句先接住他的問題，用他的話。''', r'''- 有【客人問】時（這是整張批命講完之後客人的追問）：第一句先接住他的問題，用他的話。''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
