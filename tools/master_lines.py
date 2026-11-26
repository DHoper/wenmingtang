"""一次性：先生問話改成老先生口吻（不要客服腔）。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
sub(r'''`<span class="q">男孩還是女孩？</span>還不知道就先選一個。` : `<span class="q">男生還是女生？</span>`''',
    r'''`<span class="q">生男生女？</span>還不曉得，先挑一個。` : `<span class="q">男命還是女命？</span>`''')
sub(r'''`小孩<span class="q">幾月幾號生的？</span>還沒生，預產期也可以。` : `<span class="q">生日方便給嗎？</span>有的話算得比較準。`''',
    r'''`囝仔<span class="q">哪一天生的？</span>還沒出世，預產期也行。` : `<span class="q">生辰八字帶來沒有？</span>有，就連八字一起看。`''')
sub(r'''`國曆農曆都可以。<span class="q">幾點生的知道嗎？</span>不知道也沒關係。`''',
    r'''`國曆農曆都行。<span class="q">時辰記得嗎？</span>記不得就空著。`''')
sub(r'''`<span class="q">特別想問哪方面？</span>沒有的話我就整個看。`''',
    r'''`<span class="q">要問哪一項？</span>不講，我就整個看。`''')
sub(r'''`<span class="q">我來算一下。</span>`''', r'''`等一下，<span class="q">我把筆畫排出來。</span>`''')
sub(r'''`再對一下八字。`''', r'''`再合一下八字。`''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
