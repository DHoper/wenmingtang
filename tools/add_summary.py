"""一次性：reading.js 加「總結」段；main.js 換掉業主點名太 AI 的台詞。"""
import sys
root = sys.argv[1]

p = root + '/js/engine/reading.js'
s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub('/** 產生完整批命 R。', r'''// 總結：挑出最大的長處與最要顧的地方，依所問補一句，最後給改名結論
const SUM = {
  ren: ["人格", "你本人這格是好數，做人做事有底", "你本人這格不好，個性上容易吃虧"],
  zong: ["總格", "晚運好，愈老愈好過", "晚運較弱，老本要早一點存"],
  di: ["地格", "前半生有根基，家裡穩", "前半生較辛苦，家裡的事多"],
  wai: ["外格", "出外人緣好，有貴人", "出外容易碰到小人"],
  sancai: ["三才", "三才配得順，一路走得順", "三才卡住，做事常常這裡順、那裡卡"],
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
    love: good.includes(ev.rel.renDi) ? "問感情，家裡跟感情算穩。" : "問感情，家裡跟另一半要多花點心。",
    money: w.zong.lv > 0 ? "問錢，錢是留得住的。" : "問錢，錢要會存，不要只會賺。",
    health: "身體照前面講的去顧就好。",
  }[topic] || "";
  let end;
  if (renameWhy.length) {
    const dir = ev.bazi ? `要找，往${ev.bazi.yong}${ev.bazi.xi.length ? "、" + ev.bazi.xi[0] : ""}去找，人格落在${ev.bazi.yong}最好。` : "要找，先讓人格、總格落在吉數，三才配順。";
    end = `我的意思是要改。${dir}`;
  } else end = ev.grade === "上上" || ev.grade === "上" ? "這名字好好用就好。" : "名字可以用，不一定要改。";
  const pi = [];
  if (best) pi.push(`長在${SUM[best.k][0]}`);
  if (worst) pi.push(`短在${SUM[worst.k][0]}`);
  pi.push(renameWhy.length ? "宜擇吉更易" : ev.grade === "上上" || ev.grade === "上" ? "守之可也" : "可用隨緣");
  const bai = `總的來講，${best ? `這個名字最好的是${SUM[best.k][1]}` : "這個名字沒有特別突出的地方"}；${worst ? `最要注意的是${SUM[worst.k][2]}` : "也沒有特別要擔心的"}。${topicLine}${end}`;
  return { key: "summary", title: "總結", pi: [pi.join("，") + "。"], bai };
}

/** 產生完整批命 R。''')
sub('''  return {
    system: "姓名學",''', '''  sections.push(summarySection(ev, topic, renameWhy));

  return {
    system: "姓名學",''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)

p = root + '/js/main.js'
s = open(p, encoding='utf-8').read()
for a, b in [
    ('`<span class="q">男命還女命？</span>男女算法不一樣。`', '`<span class="q">男生還是女生？</span>`'),
    ('`<span class="q">生日給我，</span>配八字看較準。不給也可以看。`', '`<span class="q">生日方便給嗎？</span>有的話算得比較準。`'),
    ('`<span class="q">要問哪方面？</span>都不選，我就整體看。`', '`<span class="q">特別想問哪方面？</span>沒有的話我就整個看。`'),
    ('`我算給你看，<span class="q">筆畫照康熙字典。</span>`', '`<span class="q">我來算一下。</span>`'),
    ('`國曆農曆都可以。<span class="q">幾點生的知道嗎？</span>不知道就排三柱。`', '`國曆農曆都可以。<span class="q">幾點生的知道嗎？</span>不知道也沒關係。`'),
    ('`這個名字喔……<span class="q">我老實講。</span>`', '`這個名字喔……<span class="q">我就直說了。</span>`'),
]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
