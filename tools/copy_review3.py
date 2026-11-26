"""一次性：套用文字審查（11-27）——畫面拿掉分數、台詞去客服腔、國字。業主指定的「這是免費的網站，為了節省成本」「神力耗盡」保留。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)

# 台詞
sub(r'''`名字寫給我看，<span class="q">寫全名。</span>`''', r'''`<span class="q">寫全名。</span>`''')
sub(r'''筆畫要照康熙字典算，我先幫你寫成繁體字。''', r'''我寫成正字，筆畫照康熙算。''')
sub(r'''`這個名字喔……<span class="q">我就直說了。</span>`''', r'''`這名字，<span class="q">我直說。</span>`''')
sub(r'''`來，我幫你想幾個。<span class="q">姓是祖先傳的，不換，只換名。</span>`''', r'''`名字換一個看看。<span class="q">我挑幾個給你。</span>`''')
sub(r'''`今天先生已經親口批了 ${LIMITS.USER_READINGS} 張，下面先照筆畫排給你看。`''', r'''`今天先生親口批過${num(LIMITS.USER_READINGS)}張了，下面先照筆畫排給你看。`''')
# 神力耗盡第二句：國字、去掉「整個網站」
sub(r'''`每個人一天只能請先生親口批 ${LIMITS.USER_READINGS} 張`''', r'''`先生一天只親口批${num(LIMITS.USER_READINGS)}張`''')
sub(r'''`每個人一天只能追問 ${LIMITS.USER_ASKS} 次`''', r'''`先生一天只回${num(LIMITS.USER_ASKS)}句`''')
sub(r'''`每張批命只能追問 ${LIMITS.FOLLOWUPS} 次`''', r'''`一張紙只問${num(LIMITS.FOLLOWUPS)}句`''')
sub(r'''`整個網站一天只能請先生講 ${LIMITS.SITE_CALLS} 回`''', r'''`今晚的香只夠點${num(LIMITS.SITE_CALLS)}回`''')
sub(r'''`先生今天已經親口替你批了 ${LIMITS.USER_READINGS} 張，神力耗盡，要歇一下。`''', r'''`今天已經親口替你批了${num(LIMITS.USER_READINGS)}張，神力耗盡，要歇一下。`''')
sub(r'''`先生今天已經回你 ${LIMITS.USER_ASKS} 個問題，神力耗盡，要歇一下。`''', r'''`今天已經回你${num(LIMITS.USER_ASKS)}句了，神力耗盡，要歇一下。`''')
sub(r'''`這張已經追問 ${LIMITS.FOLLOWUPS} 次了，先生講得差不多了。`''', r'''`這張問過${num(LIMITS.FOLLOWUPS)}句了，該講的都講了。`''')
# 分享面板狀態字
sub(r'''批命卡準備中……''', r'''紅紙還在寫……''')
sub(r'''toast("批命卡還在準備，等一下再按")''', r'''toast("紅紙還沒乾，等一下")''', 2)
sub(r'''批命卡沒存上去，連結先用一般的；圖片可以用下面「存整張長圖」另外傳。''', r'''紅紙沒貼上去，連結照樣能傳；圖用下面「存整張長圖」另外傳。''')
# 自己帶來的名字：講出字和畫數，國字，短名
sub(r'''reason: `人格${ev.wuge.ren.n}畫是${ev.wuge.ren.level}，總格${ev.wuge.zong.n}畫是${ev.wuge.zong.level}，三才${ev.sancai.level}。` }; });''',
    r'''reason: `「${ev.sInfo.at(-1).ch}」${num(ev.sInfo.at(-1).strokes)}畫加「${ev.gInfo[0].ch}」${num(ev.gInfo[0].strokes)}畫，人格${num(ev.wuge.ren.n)}，${LVS(ev.wuge.ren.level)}；總格${num(ev.wuge.zong.n)}，${LVS(ev.wuge.zong.level)}；三才${ev.sancai.level === "吉" || ev.sancai.level === "大吉" ? "算順" : ev.sancai.level === "凶" || ev.sancai.level === "大凶" ? "卡卡的" : "普通"}。` }; });''')
sub(r'''function doNaming() {''', r'''const LVS = l => ({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[l] || l;
function doNaming() {''')
# 拿掉畫面上的分數
sub(r'''      <div class="score">${han(R.score)}分</div>
''', "")
sub(r'''，${c.grade}，${c.score}分${c.own ? "，你帶來的" : ""}''', r'''，${c.grade}${c === best ? "，這支最好" : ""}${c.own ? "，你帶來的" : ""}''')
sub(r'''<span class="sk-s">${c.own ? "你的" : han(c.score) + "分"}</span>''', r'''<span class="sk-s">${c.own ? "你的" : c === best ? "這支好" : ""}</span>''')
sub(r'''<p class="vs-s">${han(R.score)}分</p>''', "")
sub(r'''<p class="vs-s">${han(N.score)}分</p>''', "")
sub(r'''<div class="grade">${R0.grade}</div><div class="score">${han(R0.score)}分</div>''', r'''<div class="grade">${R0.grade}</div>''')
sub(r'''`評等：${R.grade}（${R.score}分）　${R.headline}`''', r'''`先生批：${R.grade}　${R.headline}`''')
# 上回批命日期用國字
sub(r'''return `${d.getMonth() + 1}月${d.getDate()}日`;''', r'''return `${num(d.getMonth() + 1)}月${num(d.getDate())}日`;''')
open(p, "w", encoding="utf-8", newline="\n").write(s)

p = r"C:\Users\dhope\repos\wenmingtang\site\js\share.js"
t = open(p, encoding="utf-8").read()
a = r'''return `我的名字給廟口先生批到【${R.grade}】${R.score}分：「${R.headline}」。換你，名字拿去給先生看看。`;'''
assert t.count(a) == 1
t = t.replace(a, r'''return `我的名字給廟口先生批了「${R.grade}」：「${R.headline}」。換你，名字拿去給先生看看。`;''')
a = r'''  ctx.font = `700 40px ${SONG}`; ctx.fillStyle = "#ffe6d2";
  drawSpaced(ctx, han(R.score) + "分", rx + rw / 2, ry + 418, 10);
'''
assert t.count(a) == 1
t = t.replace(a, "")
open(p, "w", encoding="utf-8", newline="\n").write(t)
print("ok")
