"""把 full_check 的結果做成 PDF 測試報告。
用法：python tests/report_pdf.py <full_check 輸出資料夾> <輸出.pdf>
"""
import sys, os, json, html, datetime
from PIL import Image
from playwright.sync_api import sync_playwright

src, outpdf = sys.argv[1], sys.argv[2]
rep = json.load(open(os.path.join(src, "report.json"), encoding="utf-8"))
thumbs = os.path.join(src, "_thumbs"); os.makedirs(thumbs, exist_ok=True)
NAMES = {"390x844": "iPhone（390×844）", "360x740": "Android 小螢幕（360×740）", "768x1024": "平板直式（768×1024）", "1366x768": "筆電（1366×768）", "1920x1080": "桌機（1920×1080）"}

FIXES = [
    ("舞台構圖", "直式固定構圖：桌布上緣對齊操作區、老先生頭頂一定露出；紅紙依可見範圍伸縮，不再被頂列或操作區切到。批命、擬名、對照頁改成頂端窗框頭像，不再出現只剩一顆頭的畫面。"),
    ("紅色過多", "一個畫面只留一個朱漆主按鈕。結果卡、八字四柱改成宣紙；分享改成木牌；頁籤選中改成朱筆底線，不再整塊塗紅。"),
    ("生辰頁像表單", "改成「生辰帖」：生日用毛筆字寫出（民國五十年 九月 二十七日／巳時 十點整／生在臺北市），每段點了跳出手機自己的滾輪；國曆農曆是一塊可翻的木牌。"),
    ("擬名條件像表單", "條件收成一行宣紙小帖（取兩個字・照男生的字・不留字），按「改條件」才展開；「照這樣再挑」只在展開時出現。"),
    ("候選名", "改成一支支竹籤：籤頭寫評等、籤身直寫名字、籤腳寫分數；最好的蓋「最好」印；自己帶來的名字用宣紙條，排在最前面。"),
    ("斷行", "批語、標題一個子句不拆；「象名」不拆；干支一組不拆；白話用 text-wrap: pretty；對照表改兩行排。"),
    ("紅紙上的「一」", "拿掉姓與名之間的橫線，改成拉開距離。"),
    ("數筆畫", "名字維持墨黑，筆畫數用小楷寫在紅紙外側，不再壓到名字。"),
    ("朋友連結資料矛盾", "朋友那邊一律照名字筆畫重算，入口卡與點進去看到的評等、分數一定一致；原批有配八字時會註明。"),
    ("鍵盤", "手機鍵盤彈出時，操作區貼在鍵盤上方（visualViewport）；名字頁拿掉「先不了」，主按鈕滿寬。"),
    ("點擊範圍與字級", "頂列小牌可點範圍撐到 44px；頁籤獨立一列、三等分、44px；全站最小字 13px；男命女命、八字柱、五格標籤放大。"),
    ("回上一步", "全站統一用頂列左邊的「返」牌，頁面裡的返回按鈕都拿掉。"),
    ("程式畫的方塊", "筆畫數小方塊、五行色塊、八字長條、分隔線、載入條、紅紙與木桌上的漸層，全部改成筆墨素材或拿掉（新素材：筆墨一筆、窗框、竹籤，Recraft 生成）。"),
    ("表情", "皺眉換成正色；問話改成閉嘴；入座改用平靜的表情，不再咧嘴大笑。"),
    ("文字", "全站文字依口吻規範改寫，另派審查代理抓出 61 句 AI 腔重寫；五格白話講出是哪幾個字、幾畫加起來的。"),
    ("分享", "分享面板：大圖預覽、一個主按鈕（手機是系統分享，電腦是存圖）、LINE／臉書／Threads／複製連結四個印章圖示、右上角「收」印。"),
    ("動畫抽搐", "全站統一一條減速曲線、不彈跳；操作區跟舞台同時同速滑動；修正操作區變矮時舞台突然放大；燈光不再閃。用連拍逐格檢查。"),
    ("選單", "生辰帖點下去改成宣紙籤選單，不再出現瀏覽器原生的白色下拉。"),
    ("輸入吃字", "所有輸入框拿掉硬字數上限（注音、拼音不再被吃字），超過用提示；小孩取名寫明「只寫姓」。"),
    ("乾坤木牌歪", "原圖是斜側面，換成 Recraft 重畫的正面對稱木牌，字落在正中。"),
    ("系統字眼", "第二輪審查專抓「算分、權重、派別、系統」這類字，改 17 句；四份完整批命 5,589 字掃描 0 處。"),
    ("招牌順序", "「綜合」移到最左。"),
]
PENDING = [
    "實機手機（iPhone Safari、Android Chrome）還沒測：鍵盤彈出、滾輪選單、捲動流暢度、音效音量。",
    "LINE、IG、臉書的內建瀏覽器裡的分享與存圖，要實機測。",
    "叩問先生（DeepSeek）程式已完成並實測，等你審完規格（另一份 PDF）才打開；這份截圖裡叩問區是關著的。",
    "正式網站 https://dhoper.github.io/wenmingtang/ 已上線並實測：首頁、批命、分享連結、朋友連結轉址、預覽圖都正常，零錯誤。",
]

def thumb(size, f):
    p = os.path.join(src, size, f); im = Image.open(p).convert("RGB")
    w = 360 if int(size.split("x")[0]) < 900 else 760
    im.thumbnail((w, 4000), Image.LANCZOS)
    o = os.path.join(thumbs, f"{size}_{f[:-4]}.jpg"); im.save(o, quality=82)
    return "file:///" + o.replace("\\", "/")

today = datetime.date.today().isoformat()
rows, sections = [], []
total = bad = 0
for size, items in rep.items():
    shots = [x for x in items if "shot" in x]
    nb = [x for x in shots if x["issues"] or x["errors"]]
    total += len(shots); bad += len(nb)
    rows.append(f"<tr><td>{NAMES.get(size, size)}</td><td>{len(shots)}</td><td class='{'ok' if not nb else 'ng'}'>{'全部通過' if not nb else f'{len(nb)} 張有提示'}</td></tr>")
    phone = int(size.split("x")[0]) < 900
    cards = []
    for x in shots:
        note = "".join(f"<li>{html.escape(i)}</li>" for i in x["issues"] + x["errors"])
        cards.append(f"<figure class='{'p' if phone else 'd'}'><img src='{thumb(size, x['shot'])}'><figcaption><b>{html.escape(x['shot'][:2])}</b> {html.escape(x['step'])}{f'<ul>{note}</ul>' if note else ''}</figcaption></figure>")
    sections.append(f"<section class='shots'><h2>{NAMES.get(size, size)}</h2><div class='grid {'gp' if phone else 'gd'}'>{''.join(cards)}</div></section>")

doc = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 14mm 12mm; }}
body {{ font-family: "Microsoft JhengHei", "Noto Sans TC", sans-serif; color: #2a1a10; font-size: 10.5pt; line-height: 1.6; }}
h1 {{ font-size: 22pt; margin: 0 0 2mm; color: #8f1d14; }} h2 {{ font-size: 14pt; color: #8f1d14; border-bottom: 1.5pt solid #c9a04a; padding-bottom: 1mm; margin: 6mm 0 3mm; }}
.sub {{ color: #6b5443; margin: 0 0 4mm; }}
table {{ border-collapse: collapse; width: 100%; }} td, th {{ border-bottom: .5pt solid #d8c7a8; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }}
th {{ background: #f4ead7; }} .ok {{ color: #2f6b3a; font-weight: 700; }} .ng {{ color: #a8231a; font-weight: 700; }}
ul.plain {{ margin: 0; padding-left: 5mm; }}
.shots {{ break-before: page; }}
.grid {{ display: grid; gap: 4mm; }} .gp {{ grid-template-columns: repeat(4, 1fr); }} .gd {{ grid-template-columns: repeat(2, 1fr); }}
figure {{ margin: 0; break-inside: avoid; }} figure img {{ width: 100%; border: .5pt solid #bba98a; display: block; }}
figcaption {{ font-size: 8pt; line-height: 1.4; margin-top: 1mm; }} figcaption ul {{ margin: 1mm 0 0; padding-left: 4mm; color: #a8231a; }}
</style></head><body>
<h1>問名堂 測試報告</h1>
<p class="sub">{today}　本機完整流程自動截圖＋逐張人工檢查（手機版重新設計之後）</p>
<h2>結論</h2>
<p>五種尺寸、共 {total} 張截圖，自動檢查 {'全部通過' if not bad else f'{bad} 張有提示（見各張說明）'}。自動檢查項目：元件超出畫面、文字超出框、可點範圍小於 30px、兩個按鈕重疊、整頁可以橫向捲動、對話條蓋到老先生的臉、主控台錯誤。另外每一張都由人看過。</p>
<table><tr><th>尺寸</th><th>截圖</th><th>自動檢查</th></tr>{''.join(rows)}</table>
<h2>測了哪些流程</h2>
<ul class="plain">
<li>主流程：開場 → 入座 → 報名（簡體自動轉繁體、複姓「歐陽」選擇）→ 乾坤 → 生辰帖（國曆、切農曆）→ 問事（選「事業」）→ 數筆畫 → 批命（上、中、八字段、最後、只看批語）→ 分享面板 → 擬名（條件展開、竹籤、自己帶名字）→ 兩名對照 → 候選名整張批命</li>
<li>回訪：重新整理後入座（出現「上回批命」）→ 上回批命清單 → 返</li>
<li>幫小孩取名：寫姓「陳」→ 男孩女孩 → 不給生日 → 候選名</li>
<li>朋友連結：打開別人分享的連結 → 入口卡 → 看他這張怎麼批</li>
</ul>
<h2>這一輪改了什麼</h2>
<table><tr><th style="width:22%">問題</th><th>改法</th></tr>{''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in FIXES)}</table>
<h2>還沒驗證的</h2><ul class="plain">{''.join(f'<li>{p}</li>' for p in PENDING)}</ul>
{''.join(sections)}
</body></html>"""
hp = os.path.join(src, "report.html"); open(hp, "w", encoding="utf-8").write(doc)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto("file:///" + hp.replace("\\", "/")); pg.wait_for_timeout(1500)
    pg.pdf(path=outpdf, format="A4", print_background=True, margin={"top": "14mm", "bottom": "14mm", "left": "12mm", "right": "12mm"})
    b.close()
print("ok", outpdf, total, bad)
