// 素材清單：舞台上的圖。介面元件（木桌面、木牌按鈕、紅紙、籤紙框）的圖寫在 css/main.css 的 border-image 與材質裡。
// 全部以 Recraft 生成（水粉插畫風，自訂風格「問名堂 廟埕水粉」），再裁切、調色、做無縫處理（art/tools/process.py）。
export const ASSETS = {
  "scene/bg":       { label: "廟埕夜景（直式）", ar: 768 / 1344, src: "assets/scene/bg.webp" },
  "scene/bg-wide":  { label: "廟埕夜景（方形）", ar: 1, src: "assets/scene/bg-wide.webp" },
  "master/idle":    { label: "老師傅・靜候", ar: 560 / 572, src: "assets/master/idle.webp" },
  "master/speak":   { label: "老師傅・問話", ar: 560 / 572, src: "assets/master/speak.webp" },
  "master/count":   { label: "老師傅・低頭數筆畫", ar: 560 / 572, src: "assets/master/count.webp" },
  "master/write":   { label: "老師傅・低頭擬名", ar: 560 / 572, src: "assets/master/count.webp" },
  "master/approve": { label: "老師傅・點頭", ar: 560 / 572, src: "assets/master/approve.webp" },
  "master/frown":   { label: "老師傅・皺眉", ar: 560 / 572, src: "assets/master/frown.webp" },
  "props/table":    { label: "紅布木桌", ar: 1100 / 540, src: "assets/props/table.webp" },
  "props/brush":    { label: "毛筆與硯台", ar: 360 / 246, src: "assets/props/brush.webp" },
  "props/token":    { label: "黃楊木牌", ar: 501 / 1179, src: "assets/props/token.webp" },
};

/** 產生素材插槽 HTML：有圖就放圖，沒圖就放佔位框 */
export function slot(key, cls = "", extra = "") {
  const a = ASSETS[key] || { label: key, ar: 1 };
  const inner = a.src ? `<img src="${a.src}" alt="" decoding="async">` : `<span class="ph-label">${a.label}</span>`;
  return `<div class="slot ${a.src ? "has-img" : "ph"} ${cls}" data-asset="${key}" style="--ar:${a.ar}" ${extra}>${inner}</div>`;
}

/** 先把老師傅各表情載入，換表情時不閃 */
export function preload(keys) { keys.forEach(k => { const s = ASSETS[k]?.src; if (s) { const i = new Image(); i.src = s; } }); }
