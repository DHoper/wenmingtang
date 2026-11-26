# 問名堂 交接文件

台灣廟口算命攤風格的姓名解讀網站。純靜態網站，所有計算都在瀏覽器裡完成；只有「請先生細說」經 Cloudflare Worker 轉 DeepSeek。

- 原始碼：`C:\Users\dhope\repos\wenmingtang`（本機 git，尚未推上 GitHub）。網站本體在 `site/`。
- 預覽：https://claude.ai/artifact/Y9MReDmNgs2oMY5J3Rxqvd（Claude artifact，私人）
- 設計文件：https://claude.ai/artifact/V2vQpJYr4PV2TCeCo7ZDad
- 文字口吻規範：`docs/voice.md`（業主嫌太 AI，所有文字照這份寫）

## 〇、11-26 晚上最新狀態（先看這段）
- **正式網址**：https://dhoper.github.io/wenmingtang/ （repo `DHoper/wenmingtang`，推 main 後 GitHub Actions 自動把 site/ 發布；設定在 `.github/workflows/pages.yml`）。
- **預覽**：claude.ai artifact 版本 12。**每改完一輪就要更新預覽**（業主看的是預覽，11-26 曾因沒更新被罵「講多久了還沒好」）。
- **手機版重新設計**（設計審查 28 項全做）：固定舞台構圖、窗框頭像、頂列「返」牌、生辰帖（毛筆字＋宣紙選單，不用原生下拉）、竹籤候選名、條件抽屜、宣紙結果卡、兩名對照、分享面板、上回批命。樣式在 `css/mobile.css`，動態在 `css/motion.css`（一條減速曲線、不彈跳；操作區用 FLIP 跟舞台同步滑動）。
- **先生親口批（AI）**（11-26 業主決定）：批命頁的**所有評語都由 AI 寫**，引擎算出來的五格、白話只當 AI 的依據與備援。數字（評等、五格、三才、八字）照引擎馬上顯示，評語位置先寫「先生正在寫……」，AI 依【總評】【天格】…【總結】一段一段串流寫進去（`site/js/ai.js` 的 `aiReadingFull`、`main.js` 的 `runAIReading`）。AI 失敗或次數用完，換回引擎的句子。
  - 批完是「追問先生」：每張批命追問 3 次（標題右邊三支籤，問一次淡一支），每次 50 字內、回答 240 字內。
  - 次數（`js/ai-prompt.js` 的 LIMITS，Worker 的 wrangler.toml vars 要同步）：每人每天 3 張 AI 批命、追問 9 次；全站每天 400 次。用完跳「神力耗盡」（批命用完／追問用完／全站用完／這張問完了，四種文案）。
  - 看過的 AI 批命存在瀏覽器（`wenming:aiCache`，留 20 張），重看不扣次數。
  - Worker：`worker/src/index.js`，mode = reading | ask，已部署。`node worker/try_reading.mjs` 本機試一整張（會花 DeepSeek）。
  - **測試一律用假 Worker**（`tests/fake_worker.py`），不然會吃掉本機 IP 的線上次數；吃到了用 `npx wrangler kv key list/delete --namespace-id b4181e77e0c44e28adeeeeca175e77a2 --remote` 清掉今天 `u:` 開頭的鍵。
- **文字**：審查代理抓 61 句 AI 腔已改；五格白話講出是哪幾個字幾畫。新寫任何字先對照 `docs/voice.md`。
- **素材**：Recraft 這次共用約 115 點（表情 2 張、筆墨一筆、窗框、竹籤）。
- **測試**：`python tests/full_check.py <資料夾> 390x844 360x740 768x1024 1366x768 1920x1080`（33 個步驟、自動檢查＋截圖），`python tests/report_pdf.py <資料夾> <pdf>` 產報告；`tests/jank.py`、`tests/filmstrip.py` 查動畫抖動；`tests/ask_ui.py` 查叩問區；`node worker/review.mjs` 產生 AI 實際問答（會花 DeepSeek 次數）。
- **金鑰**：只在 Worker 機密與 `worker/.dev.vars`（不進 git）。推 GitHub 前跑一次：`git log --all -p | grep -c sk-`，要是 0。

## 一、業主明確指示過的要點
1. 獨立網站，和塔羅站「德爾菲神諭」分開。GitHub Pages、規則式引擎，DeepSeek 細說選配。
2. 輸入姓名、乾坤，生辰選填；名字不佳給改名建議。取名字庫要夠大（現 1,785 字）。
3. 解讀兩層：白話＋文言批語。**口吻要像真的台灣算命先生，不能像 AI**（11-26 全面改寫）。
4. 台灣廟宇算命攤，水粉插畫，**不要像素風**；介面外觀用美術素材，禁止 CSS 色塊偷懶。
5. 字體依用途挑，要好讀；直排字要置中。
6. **老師傅的人設：沉穩、嚴肅、篤定。不要大表情、不要難過可憐的樣子**（11-26 業主退回「皺眉」圖，已換成「正色」stern）。
7. 手機為主，桌機也要 RWD；跑版要細修。
8. **「幫小孩取名」不是常用功能，要小、不能和「看名字」平起平坐**（11-26）。
9. **要有分享功能**，參考外面測驗網站的做法（11-26 已做，見下）。
10. 業主授權自行查證、做決定（「去做，不要問我」），但品質要專業。
11. 台詞：業主點名「生辰帶了嗎」突兀、「男命還女命？男女算法不一樣」超 AI、「生日方便給嗎」不像老先生（客服腔）。句子短、台灣老一輩口語（例：「幾年次的？」），不解釋原理，不用「老夫」武俠腔。
12. 批命最後要有**總結**（11-26 已做，規則式 `summarySection()`）。
13. 桌機招牌那列不可以有橫向捲軸（11-26 已改成依欄寬縮放）。
14. 業主之後用桌面 VS Code 的 Claude 接手修改（就是這個本機專案），雲端那邊不再改。
15. 分享＝**圖片＋連結**一起出去；分享圖是**直式長圖**（`share.js` 的 `drawLongCard`），要放大部分完整評語（各格文言批語＋先生白話、先生總說、QR）。不放八字、生肖（會透露生辰）。
16. 五格數字用粗宋體（跟匾額、名字一致），不要楷書數字。

## 二、現況
### 檔案（site/）
- `js/main.js` 流程：入座 → 報名 → 乾坤 → 生辰 → 問事 → 數筆畫 → 批命 → 改名／對照；分享面板、朋友連結落地頁也在這。
- `js/share.js` 分享圖（canvas 用網站素材畫，1080×1350 貼文、1080×1920 限動）、分享連結、App 內瀏覽器判斷。
- `js/engine/` 引擎；`reading.js` 白話文字、`bazi.js` 八字推論文字都已改成先生口吻。
- `js/data/num81.js` 81 數理：解讀、女性另說、判詞都已改寫。
- `js/ai-prompt.js` 細說提示詞（網頁與 Worker 共用）；`js/ai.js`；`js/config.js`（AI_ENDPOINT、SITE_URL 都還空著）。
- `r/1.html`～`r/5.html` 各評等的分享預覽頁（OG 寫死，人打開會帶 # 後面的資料轉回首頁）；`og/` 預覽圖 1200×630。
- 這兩個由 `tools/build_share_pages.py <正式網址>` 產生，**部署網址確定後要重跑一次**（目前先填 https://dhoper.github.io/wenmingtang/）。

### 字型
- 宋體 Noto Serif TC（Google Fonts）900：紅紙名字、招牌、木牌、匾額、評等大字、候選名；700：標題、按鈕。
- 楷書 霞鶩文楷 TC（自架切片）：老師傅的話、說明。明體 Cactus：文言批語。黑體 Noto Sans TC：白話。
- 直排一律用 `.vt`（一字一行堆疊），不用 writing-mode（字型度量不對稱會偏）。

### 老師傅表情（assets/master/）
idle 靜候、speak 問話、count 數筆畫、approve 點頭微笑、stern 正色。
- 11-26：speak（原本張嘴，業主嫌怪）與 stern（取代被退回的 frown）都用 Recraft image_edit（nano banana）從 idle 改臉，只把臉部羽化貼回 idle，輪廓與筆觸不變。原圖與候選在 `Downloads\wenming-workrt\`。Recraft 這次用了 66 點。

### 分享（依 11-26 研究：台灣 LINE 九成、FB、IG；姓名站幾乎不做分享，學心理測驗站 tali.kr）
- 批命頁評等卡下方與底部都有「分享」。面板：預覽圖、系統分享（手機）、LINE／臉書／Threads／複製連結、存圖片／存限動圖、抄全文。
- LINE、IG、FB 的 App 內瀏覽器擋下載 → 改提示長按圖片。
- 連結：`r/<評等>.html#n=名字&g=&s=&gr=&sc=&t=&b=`，不帶生日。朋友打開看到分享者的評等＋「換我看名字」。

### DeepSeek 細說
- `worker/`：Cloudflare Worker，只收批命依據，提示詞在 Worker 組；擋陌生網域、每 IP 十分鐘 12 次。
- 金鑰在 `worker/.dev.vars`（git 不追蹤，**絕對不能進網頁或 git**）。本機測試：`node worker/test.mjs`（11-26 通過）。
- **還沒部署**：需要業主登入 Cloudflare（`npx wrangler login`），然後 `npx wrangler secret put DEEPSEEK_API_KEY`、`npx wrangler deploy`，把網址填進 `js/config.js` 的 AI_ENDPOINT。

### 測試
- 本機伺服器：在 site/ 執行 `python -m http.server 8765 --bind 127.0.0.1`
- `python tests/ui_flow.py <輸出資料夾> 390x844 360x640 1366x800 1024x768`：全流程截圖＋溢出檢查。
- `python tests/share_flow.py <輸出資料夾>`：分享面板與朋友連結。
- `python tests/card.py out.png 名字 m|f`：單張分享圖。
- `node tests/print_reading.mjs 名字 m career`：印出整份批命文字。

## 三、未完成（依優先）
1. 部署：GitHub repo＋Pages（要業主同意 repo 名稱、公開），Cloudflare Worker（要業主登入）。部署後重跑 build_share_pages.py、填 SITE_URL／AI_ENDPOINT。
2. 實機測：手機流暢度、音效音量、LINE 內建瀏覽器的分享。
3. 「上回批命」清單、改名條件頁還是樸素的木牌選項。
4. 81 數理有幾條各派吉凶不一（40、50、53、27），以及象名重複（3/27、19/54），之後可再查證。
5. 雲端那邊的開發檔（tools/ 字庫與字型建置、raw/unihan.db、art/ 美術後製、handoff/pending-reference.patch）不在這台電腦，只有 site/ 成品；那份修補檔裡的項目（直排、宋體、台詞、總結、招牌捲軸）都已在本機另行做完。

15. **選單、下拉也要用美術素材**，不能出現瀏覽器原生的白色清單（11-26）。
16. **問事招牌「綜合」放最左邊**（11-26）。
17. 動畫、轉場不能抽搐（11-26 已整理）。
18. AI 要照引擎規則、結合使用者叩問來回答；叩問限字數、每人每日與全站每日次數，超過顯示「神力耗盡」並說明是免費網站為了節省成本（11-26）。
