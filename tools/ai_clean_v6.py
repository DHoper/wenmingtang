"""一次性：AI 文字顯示前的保險，把漏出來的禁用詞換成先生的講法（ai.js）。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\ai.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub(r'''// 把 AI 依【標籤】分段的文字切成 { key: 文字 }''', r'''// AI 偶爾漏出 AI 腔的字（模型沒辦法百分之百照規定），顯示前換成先生的講法。清單見 docs/voice.md
const FIX = [
  [/(老實說|說真的|坦白講|我老實講|老實講)[，,：:]?/g, ""], [/(值得注意的是|值得一提的是|總的來說|總而言之|整體而言|綜上所述)[，,]?/g, ""], [/此外[，,]?/g, "還有，"],
  [/撐得住/g, "扛得住"], [/撐不住/g, "扛不住"], [/硬撐/g, "硬扛"], [/撐起/g, "扛起"], [/撐/g, "扛"],
  [/穩穩地?/g, "慢慢"], [/站穩/g, "站好"], [/(安穩|穩定)/g, "安定"], [/穩當/g, "妥當"], [/穩重/g, "沉著"], [/穩健/g, "踏實"], [/穩/g, "牢"],
  [/(看|聽)懂/g, "$1明白"], [/不懂/g, "不曉得"], [/懂得/g, "曉得"], [/懂/g, "曉得"],
  [/做出/g, "做"], [/進行/g, ""], [/機會/g, "時機"], [/一份/g, ""], [/代表/g, "就是"], [/意味著/g, "就是"], [/象徵/g, "就像"],
  [/[—–]+/g, "，"], [/！/g, "。"],
];
export function cleanAI(t) { let o = String(t); for (const [a, b] of FIX) o = o.replace(a, b); return o.replace(/，{2,}/g, "，").replace(/^，/, ""); }

// 把 AI 依【標籤】分段的文字切成 { key: 文字 }''')
sub(r'''    if (k) out[k] = (parts[i + 1] || "").replace(/\*+/g, "").trim();''', r'''    if (k) out[k] = cleanAI((parts[i + 1] || "").replace(/\*+/g, "").trim());''')
sub(r'''  const onText = t => { if (capped) return; const c = capText(t, max); if (c !== t) capped = true; onText0(c); };''',
    r'''  const onText = t => { if (capped) return; t = cleanAI(toTrad(t)); const c = capText(t, max); if (c !== t) capped = true; onText0(c); };''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
