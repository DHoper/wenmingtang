"""一次性：入座頁改成「看名字」一個大主選項，「幫小孩取名」縮成小木牌。"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

SEAT = '''`<button type="button" class="prop red seat-main" data-m="read"><span class="in"><span class="t">看名字</span><span class="s">筆畫、五格、三才一起看<br>給生日，再配八字</span></span></button>
    <div class="seat-sub"><button type="button" class="opt" data-m="name">幫小孩取名</button></div>`'''

sub('''`來，坐。<span class="q">要看名字，還是幫小孩取名？</span>`''', '''`來，坐。<span class="q">名字寫給我看。</span>`''')
sub('''  act.innerHTML = `<div class="props">
      <button type="button" class="prop f-wood" data-m="read"><span class="in"><span class="t">看名字</span><span class="s">現在的名字</span></span></button>
      <button type="button" class="prop red" data-m="name"><span class="in"><span class="t">幫小孩取名</span><span class="s">給姓和生日</span></span></button>
    </div>`;''', '  act.innerHTML = ' + SEAT + ';')
sub('''    <div class="props">
      <button type="button" class="prop red" data-m="read"><span class="in"><span class="t">換我看名字</span><span class="s">寫下你的名字</span></span></button>
      <button type="button" class="prop f-wood" data-m="name"><span class="in"><span class="t">幫小孩取名</span><span class="s">給姓和生日</span></span></button>
    </div>
    <div class="row"><button type="button" class="btn ghost" id="seeFriend">看${esc(x.name)}的筆畫</button></div>`;''',
'''    <button type="button" class="prop red seat-main" data-m="read"><span class="in"><span class="t">換我看名字</span><span class="s">寫下你的名字，先生算給你看</span></span></button>
    <div class="seat-sub"><button type="button" class="opt" id="seeFriend">看${esc(x.name)}的筆畫</button><button type="button" class="opt" data-m="name">幫小孩取名</button></div>`;''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
