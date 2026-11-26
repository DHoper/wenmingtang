"""掃描所有使用者看得到的文字，列出 AI 腔禁用詞（清單見 docs/voice.md）。python tools/ai_words_check.py [--all]
預設只看白話與介面；文言批語裡的古字（如「穩」在四字句）另外標示，不算錯。"""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["site/js/main.js", "site/js/share.js", "site/js/ai-prompt.js", "site/js/engine/reading.js", "site/js/engine/analyze.js",
         "site/js/engine/bazi.js", "site/js/engine/rename.js", "site/js/data/num81.js", "site/js/data/misc.js", "site/index.html", "tools/build_share_pages.py"]
WORDS = r"""撐 懂 穩穩 站得穩 值得注意 值得一提 整體而言 總的來說 總而言之 綜上所述 此外 首先 其次 換句話說 也就是說 某種程度 說到底 另一個角度 更有意思 最妙的
本質 關鍵在於 核心 真正的 底層 底氣 韌性 節奏 意義 價值 接住 陪伴 溫暖 守護 療癒 並不孤單 想太多 敏銳 很直接 先給你 如果你願意 希望對你 讓我們
老實說 說真的 坦白講 我老實講 進行 做出 加以 予以 賦能 助力 深耕 至關重要 全方位 深度 洞察 打造 旨在 致力 能量 平衡 提升 保持 發展 成長 挑戰 機會 資源 溝通 人際
代表 意味著 象徵 體現 有助於 靜靜 悄悄 默默 彷彿 宛如 一份 溫柔 不僅 不只是 與其說 —— — ！""".split()
PAT = [re.compile(r"不是[^。，；]{1,14}[，,]?而是"), re.compile(r"[一-鿿] [0-9A-Za-z]|[0-9A-Za-z] [一-鿿]")]
# 提示詞檔案裡「不要用這些詞」本身會列出禁用詞，略過那幾行
SKIP_LINE = re.compile(r"不用這些詞|不用客服腔|不說「|不用「|不可以說|不要講分數|AI 腔|禁用")
hits = 0
for f in FILES:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p): continue
    for i, line in enumerate(open(p, encoding="utf-8"), 1):
        code = re.sub(r"(^|\s)//.*$", "", line) if f.endswith(".js") else line
        if f.endswith(".py"): code = re.sub(r"#.*$", "", code)
        if SKIP_LINE.search(code): continue
        found = [w for w in WORDS if w in code] + [m.group(0) for r in PAT for m in r.finditer(code)]
        if found:
            hits += 1
            print(f"{f}:{i}: {' '.join(sorted(set(found)))} | {code.strip()[:110]}")
print(f"\n共 {hits} 行命中")
