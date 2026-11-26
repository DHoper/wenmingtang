"""一次性：分享主按鈕一律「圖片＋連結」一起出去。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\main.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
sub(r'main.textContent = canShareNative ? "分享這張批命" : noDownload ? "複製連結" : "存下這張長圖";',
    r'main.textContent = canShareNative ? "分享圖片＋連結" : noDownload ? "複製連結" : "存圖片＋複製連結";')
sub(r'''main.onclick = noDownload && !canShareNative ? () => copy(link, "連結抄好了，貼給朋友就好") : () => {};''',
    r'''main.onclick = noDownload && !canShareNative ? () => copy(text + "\n" + link, "連結抄好了；圖片長按就能存") : () => {};''')
sub(r'''{ files: [file], text: text + "\n" + link }''', r'''{ files: [file], title: "問名堂", text: text + "\n" + link }''')
sub(r'''} else if (!noDownload) main.onclick = () => { if (url) save(url, fname); };''',
    r'''} else if (!noDownload) main.onclick = async () => {
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = fname; document.body.append(a); a.click(); a.remove();
    try { await navigator.clipboard.writeText(text + "\n" + link); toast("圖存好了，連結也抄好了：先貼圖，再貼連結"); } catch (_) { copy(link, "圖存好了，連結也抄好了"); }
  };''')
sub(r'''"這裡不能直接下載，<b>長按上面的圖</b>就能存起來，再拿去 IG 限動。" : "圖片跟連結都不會帶你的生日。"''',
    r'''"這裡不能直接下載，<b>長按上面的圖</b>存起來，再按上面的按鈕複製連結，一起貼給朋友。" : "圖片和連結一起給朋友，朋友點連結就能看自己的名字。都不會帶你的生日。"''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
