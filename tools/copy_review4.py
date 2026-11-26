"""一次性：文字審查（11-27）reading.js 備援白話：去解釋原理、去客服腔、去免責。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\engine\reading.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
sub(r'''tian: "天格是跟著姓來的，祖上給的，改名也改不到，這格我看看就好，好壞都怪不到你。",''', r'''tian: "天格跟著姓走，祖上給的，我順帶看看。",''')
sub(r'''`過了八十一，扣掉八十照${han(g.n81)}來看，`''', r'''`數大過八十一，照${han(g.n81)}看，`''')
sub(r'''"你身子夠旺，擔得起財，敢衝就有。" : "只是你身子較弱，大錢擔不住，穩穩地存，或是找人合夥較好。"''', r'''"你命底夠旺，擔得起財，敢衝就有。" : "只是你命底較弱，大錢擔不住，穩穩地存，或是找人合夥較好。"''')
sub(r'''bai.push("這是老祖宗的講法，身體真的不舒服，還是要去給醫生看。");''', r'''bai.push("身體真不舒服，去給醫生看，不要拖。");''')
sub(r'''想要更好，我可以再幫你挑幾個看看。''', r'''要更好，我再挑幾個給你看。''')
sub(r'''bai: `天、人、地三格的五行，叫三才，看一世人走得順不順。你是天''', r'''bai: `你是天''')
sub(r'''`你生那天的天干是${b.dmGan}，屬${b.dm}，這就是你本人。八字裡幫你的力量大概''', r'''`你是${b.dmGan}${b.dm}的命，八字裡幫你的力量大概''')
sub(r'''`所以你最欠、最要的是${b.yong}，這叫用神${b.xi.length''', r'''`你最要的是${b.yong}${b.xi.length''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
