"""一次性：share.js 依程式審查修正。"""
p = r"C:\Users\dhope\repos\wenmingtang\site\js\share.js"
s = open(p, encoding="utf-8").read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)

a = s.index("/** 把預覽卡存到 Worker，換一個帶著這張圖的專屬連結")
s = s[:a] + r'''/** 把預覽卡存到 Worker，換一個帶著這張圖的專屬連結；失敗就回 null（改用一般連結）。同一張只傳一次。 */
const cardLinks = new Map();
export function uploadCard(R, cv) {
  const key = [R.name, R.surname.length, R.gender, R.topic, R.grade, R.bazi ? 1 : 0, (R.aiParts && R.aiParts.headline) || ""].join("|");
  if (!cardLinks.has(key)) {
    const p = (async () => {
      if (!CONFIG.AI_ENDPOINT || framed) return null;
      let q = .86, blob = await new Promise(r => cv.toBlob(r, "image/jpeg", q));
      while (blob && blob.size > 420 * 1024 && q > .5) { q -= .1; blob = await new Promise(r => cv.toBlob(r, "image/jpeg", q)); }
      if (!blob) return null;
      const qs = new URLSearchParams({ t: `${R.name}的名字，先生批【${R.grade}】｜問名堂`, d: `「${R.headline}」換你，名字拿去給先生看看。`, u: shareLink(R).replace(/r\/\d\.html#/, "#") });
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
      try {
        const res = await fetch(CONFIG.AI_ENDPOINT.replace(/\/$/, "") + "/card?" + qs, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob, signal: ctl.signal });
        if (!res.ok) return null;
        const j = await res.json();
        return j && j.url ? j.url : null;
      } catch (_) { return null; } finally { clearTimeout(timer); }
    })();
    cardLinks.set(key, p);
    p.then(u => { if (!u) cardLinks.delete(key); });
  }
  return cardLinks.get(key);
}
'''
# 長圖量高度用的畫布不用真的開那麼大（量字跟畫布大小無關）
sub(r'''const probe = document.createElement("canvas"); probe.width = W; probe.height = 12000;
  const H = Math.ceil(await render(probe.getContext("2d"), 12000));''', r'''const probe = document.createElement("canvas"); probe.width = W; probe.height = 1;
  const H = Math.ceil(await render(probe.getContext("2d"), 12000));
  probe.width = 0;''')
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ok")
