"""一次性：拿掉程式畫的方塊與漸層，改用素材；輸入框字型固定；其他小修。"""
import sys
root = sys.argv[1]

def patch(path, reps, append=None):
    s = open(path, encoding='utf-8').read()
    for a, b in reps:
        assert s.count(a) == 1, (path, a[:70])
        s = s.replace(a, b)
    if append: s += append
    open(path, 'w', encoding='utf-8', newline='\n').write(s)

# ── CSS ──
patch(root + '/css/main.css', [
    # 紅紙不再疊漸層光暈
    ('background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255, 190, 150, .22), transparent 75%), url(../assets/ui/redpaper-light.webp) 0 0 / 150px;',
     'background: url(../assets/ui/redpaper-light.webp) 0 0 / 150px;'),
    # 木桌面不疊漸層
    ('background: linear-gradient(rgba(0, 0, 0, .25), transparent 40px), var(--wood) 0 0 / 300px;', 'background: var(--wood) 0 0 / 300px;'),
    ('background: linear-gradient(rgba(0, 0, 0, .35), rgba(0, 0, 0, .1)), var(--wood) 0 0 / 300px;', 'background: var(--wood) 0 0 / 300px;'),
    ('background: linear-gradient(rgba(0, 0, 0, .1), rgba(0, 0, 0, .35)), var(--wood) 0 0 / 300px;', 'background: var(--wood) 0 0 / 300px;'),
], append='''

/* ───────── 不用程式畫的方塊：全部改成筆墨與素材 ───────── */
/* 筆畫數：老先生用小楷寫在紅紙右側，一字一行，不加框 */
.paper-text .n { inset-inline-end: 1px; inset-block-start: 50%; width: 1em; min-width: 0; padding: 0; background: none; border-radius: 0; box-shadow: none;
  font: 700 12px/1.05 var(--kai); color: #ffe7a8; text-align: center; text-shadow: 0 1px 0 rgba(40, 0, 0, .95), 0 0 3px rgba(40, 0, 0, .9); word-break: break-all; }
.paper-text .rs { padding: 0; background: none; box-shadow: none; font: 700 13px/1 var(--kai); color: #ffe7a8; text-shadow: 0 1px 0 #2a0000, 0 0 4px #2a0000, 0 0 8px rgba(42, 0, 0, .8); }
/* 姓與名之間：一筆淡墨 */
.paper-text .split { width: 26px; height: 5px; border: 0; background: url(../assets/ui/stroke.webp) center / 100% 100% no-repeat; opacity: .6; }
/* 五格的五行：用該行顏色的墨字，不放色塊 */
.g .el { background: none !important; padding: 0; margin: 1px 0; font: 900 15px/1.2 var(--song); }
.e-木 { color: #2f5d3a; } .e-火 { color: #a8231a; } .e-土 { color: #87622c; } .e-金 { color: #75674a; } .e-水 { color: #23415e; }
/* 八字五行力量：一筆墨，長短代表力量 */
.bar i { height: 14px; background: url(../assets/ui/stroke.webp) left center / 100% 100% no-repeat; opacity: 1; filter: none; position: relative; }
.bar i { background: none; }
.bar i::before { content: ""; position: absolute; inset: 0; background: url(../assets/ui/stroke.webp) left center / 100% 100% no-repeat; opacity: .14; }
.bar i b { position: relative; -webkit-mask: url(../assets/ui/stroke.webp) left center / var(--full, 100%) 100% no-repeat; mask: url(../assets/ui/stroke.webp) left center / var(--full, 100%) 100% no-repeat; }
#countBazi .bar i::before { filter: invert(1); opacity: .22; }
/* 段落分隔、對照表、批語前的線：朱筆一畫 */
.sec { border-bottom: 0; position: relative; }
.sec::after { content: ""; position: absolute; left: 6%; right: 6%; bottom: 0; height: 6px; background: url(../assets/ui/stroke-red.webp) center / 100% 100% no-repeat; }
.sec:last-child::after { display: none; }
.pi { border-left: 0; padding-left: 16px; position: relative; }
.pi::before { content: ""; position: absolute; left: 0; top: 4px; bottom: 4px; width: 5px; background: url(../assets/ui/stroke-red-v.webp) center / 100% 100% no-repeat; }
.cmp th, .cmp td { border-bottom: 0; background: url(../assets/ui/stroke-red.webp) center bottom / 92% 4px no-repeat; }
/* 開場載入條：一筆朱墨慢慢畫出來 */
.intro-load { height: 10px; background: url(../assets/ui/stroke.webp) left center / 100% 100% no-repeat; filter: invert(1) opacity(.18); overflow: visible; position: relative; }
.intro-load { filter: none; background: none; }
.intro-load::before { content: ""; position: absolute; inset: 0; background: url(../assets/ui/stroke.webp) left center / 100% 100% no-repeat; filter: invert(1); opacity: .18; }
.intro-load i { position: relative; background: #c8342a; -webkit-mask: url(../assets/ui/stroke.webp) left center / 180px 100% no-repeat; mask: url(../assets/ui/stroke.webp) left center / 180px 100% no-repeat; }

/* 輸入框：用系統字型，打字中與打完一樣，不會跳字型（紅紙上才寫成宋體） */
.pen input, .ask-row input { font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", system-ui, sans-serif; font-weight: 600; }

/* 分享面板：手機上四顆改兩排 */
@media (max-width: 520px) { .share-grid.g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .share-grid.g4 .btn { font-size: 16px; } }

/* 上回批命：一張張小紅紙 */
.slips.hist .slip { min-height: 96px; }
.slips.hist .slip b { font-size: 24px; }
''')

# ── main.js ──
patch(root + '/js/main.js', [
    ('id="backName">改名字</button>', 'id="backName">重寫名字</button>'),
    ('    el.querySelector(".n").textContent = c.strokes;', '    el.querySelector(".n").textContent = han(c.strokes);'),
    ('el.querySelector(".n").textContent = R.chars[i].strokes; });', 'el.querySelector(".n").textContent = han(R.chars[i].strokes); });'),
    ('<span class="el e-${g.el}">${g.el}</span><span class="lv ${cls}">${g.level}</span>',
     '<span class="el e-${g.el}">${g.el}</span><span class="lv ${cls}">${({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[g.level] || g.level}</span>'),
    ('''    act.innerHTML = `<div class="opts">${h.map((x, i) => `<button type="button" class="opt" data-i="${i}">${esc(x.name)}・${x.grade}</button>`).join("")}</div><div class="row"><button type="button" class="btn ghost" id="hBack">回去</button></div>`;''',
     '''    const day = t => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日看的`; };
    act.innerHTML = `<div class="slips hist">${h.map((x, i) => `<button type="button" class="slip" data-i="${i}" style="--i:${i}"><b>${esc(x.name)}</b><span class="g2">${x.grade}</span><small>${x.t ? day(x.t) : ""}</small></button>`).join("")}</div><div class="row"><button type="button" class="btn ghost" id="hBack">回去</button></div>`;'''),
    # 紅紙：等宋體把這幾個字載好再寫，免得先跳出別的字型
    ('''  S.chars = chars;
  if (chars.length !== prev) S.surnameLen = null;
  renderPaper(''', '''  const tok = (onNameInput.tok = (onNameInput.tok || 0) + 1);
  if (chars.length && document.fonts) await Promise.race([document.fonts.load(`900 48px "Noto Serif TC"`, chars.join("")), sleep(900)]).catch(() => {});
  if (tok !== onNameInput.tok) return;
  S.chars = chars;
  if (chars.length !== prev) S.surnameLen = null;
  renderPaper('''),
])

# ── share.js：分享圖上的五行也改成墨字 ──
patch(root + '/js/share.js', [
    ('''    ctx.fillStyle = bgc; ctx.fillRect(startX, gy + 118, tw, 32);
    ctx.font = `700 24px ${SANS}`; ctx.fillStyle = fgc; ctx.fillText(g.el, startX + tw / 2, gy + 135);''',
     '''    ctx.font = `900 28px ${SONG}`; ctx.fillStyle = bgc; ctx.fillText(g.el, startX + tw / 2, gy + 135);'''),
    ('''    const lvSize = g.level.length > 2 ? 21 : 26;''', '''    const lvText = ({ 吉多於凶: "半吉", 凶多於吉: "半凶" })[g.level] || g.level, lvSize = 26;'''),
    ('''    ctx.font = `700 ${lvSize}px ${SONG}`; const lw = ctx.measureText(g.level).width;''', '''    ctx.font = `700 ${lvSize}px ${SONG}`; const lw = ctx.measureText(lvText).width;'''),
    ('''    ctx.fillText(g.level, startX + tw + 8 + lw / 2, gy + 135);''', '''    ctx.fillText(lvText, startX + tw + 8 + lw / 2, gy + 135);'''),
])
print('ok')
