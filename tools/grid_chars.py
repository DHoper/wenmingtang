"""一次性：五格白話講出是哪幾個字、幾畫加起來的。"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

start = s.index('const ROLE_SAY = {'); end = s.index('};', start) + 3
s = s[:start] + r'''const ROLE_SAY = {
  tian: "天格是跟著姓來的，祖上給的，改名也改不到，我看看就好，不算分。",
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
''' + s[end:]

sub('function gridSection(k, g, female) {', 'function gridSection(k, g, female, ev) {')
sub('''  let bai = `${ROLE_SAY[k]}你${info.label}${han(g.n)}畫，${g.n81 !== g.n ? `過了八十一，扣掉八十照${han(g.n81)}來看，` : ""}屬${g.el}，叫「${g.name}」，${LV_SAY[g.lv]}。${g.text}`;''',
    '''  let bai = `${ROLE_SAY[k]}${compose(k, ev)}，${g.n81 !== g.n ? `過了八十一，扣掉八十照${han(g.n81)}來看，` : ""}屬${g.el}，叫「${g.name}」，${LV_SAY[g.lv]}。${g.text}`;''')
sub('GRID_KEYS.map(k => gridSection(k, ev.wuge[k], female))', 'GRID_KEYS.map(k => gridSection(k, ev.wuge[k], female, ev))')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
