"""一次性：修正 master_lines.py——業主之前退過「生辰帶了嗎」「男命還女命」，改成台灣老一輩口語。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
sub(r'''`<span class="q">生男生女？</span>還不曉得，先挑一個。` : `<span class="q">男命還是女命？</span>`''',
    r'''`<span class="q">男孩還是女孩？</span>還不知道，先挑一個。` : `<span class="q">男生還是女生？</span>`''')
sub(r'''`囝仔<span class="q">哪一天生的？</span>還沒出世，預產期也行。` : `<span class="q">生辰八字帶來沒有？</span>有，就連八字一起看。`''',
    r'''`囝仔<span class="q">哪一天生的？</span>還沒出世，預產期也行。` : `<span class="q">幾年次的？</span>生日給我，八字一起看。`''')
sub(r'''`國曆農曆都行。<span class="q">時辰記得嗎？</span>記不得就空著。`''',
    r'''`國曆農曆都行。<span class="q">幾點生的？</span>記不得就空著。`''')
sub(r'''<span class="t">寫生辰</span><span class="s">八字、生肖一起看</span>''', r'''<span class="t">給生日</span><span class="s">八字、生肖一起看</span>''')
sub(r'''<span class="t">不寫</span>''', r'''<span class="t">先不用</span>''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
