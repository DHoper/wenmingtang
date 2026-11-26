"""一次性：HANDOFF 更新 AI 全評語、追問、長圖、台詞。"""
for p in [r"C:\Users\dhope\repos\wenmingtang\HANDOFF.md", r"C:\Users\dhope\repos\wenmingtang\site\HANDOFF.md"]:
    try:
        s = open(p, encoding="utf-8").read()
    except FileNotFoundError:
        continue
    lines = s.split("\n")
    for i, l in enumerate(lines):
        if l.startswith("- **叩問先生（AI）**"):
            j = i + 1
            while j < len(lines) and lines[j].startswith("  "):
                j += 1
            lines[i:j] = [
                "- **先生親口批（AI）**（11-26 業主決定）：批命頁的**所有評語都由 AI 寫**，引擎算出來的五格、白話只當 AI 的依據與備援。數字（評等、五格、三才、八字）照引擎馬上顯示，評語位置先寫「先生正在寫……」，AI 依【總評】【天格】…【總結】一段一段串流寫進去（`site/js/ai.js` 的 `aiReadingFull`、`main.js` 的 `runAIReading`）。AI 失敗或次數用完，換回引擎的句子。",
                "  - 批完是「追問先生」：每張批命追問 3 次（標題右邊三支籤，問一次淡一支），每次 50 字內、回答 240 字內。",
                "  - 次數（`js/ai-prompt.js` 的 LIMITS，Worker 的 wrangler.toml vars 要同步）：每人每天 3 張 AI 批命、追問 9 次；全站每天 400 次。用完跳「神力耗盡」（批命用完／追問用完／全站用完／這張問完了，四種文案）。",
                "  - 看過的 AI 批命存在瀏覽器（`wenming:aiCache`，留 20 張），重看不扣次數。",
                "  - Worker：`worker/src/index.js`，mode = reading | ask，已部署。`node worker/try_reading.mjs` 本機試一整張（會花 DeepSeek）。",
                "  - **測試一律用假 Worker**（`tests/fake_worker.py`），不然會吃掉本機 IP 的線上次數；吃到了用 `npx wrangler kv key list/delete --namespace-id b4181e77e0c44e28adeeeeca175e77a2 --remote` 清掉今天 `u:` 開頭的鍵。",
            ]
            break
    s = "\n".join(lines)
    s = s.replace("11. 台詞：業主點名「生辰帶了嗎」突兀、「男命還女命？男女算法不一樣」超 AI。句子短、口語、不解釋原理，不用「老夫」武俠腔（11-26 已換）。",
                  "11. 台詞：業主點名「生辰帶了嗎」突兀、「男命還女命？男女算法不一樣」超 AI、「生日方便給嗎」不像老先生（客服腔）。句子短、台灣老一輩口語（例：「幾年次的？」），不解釋原理，不用「老夫」武俠腔。")
    if "15. 分享" not in s:
        s = s.replace("14. 業主之後用桌面 VS Code 的 Claude 接手修改（就是這個本機專案），雲端那邊不再改。",
                      "14. 業主之後用桌面 VS Code 的 Claude 接手修改（就是這個本機專案），雲端那邊不再改。\n15. 分享＝**圖片＋連結**一起出去；分享圖是**直式長圖**（`share.js` 的 `drawLongCard`），要放大部分完整評語（各格文言批語＋先生白話、先生總說、QR）。不放八字、生肖（會透露生辰）。\n16. 五格數字用粗宋體（跟匾額、名字一致），不要楷書數字。")
    open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
