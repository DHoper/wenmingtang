"""一次性：main.js 加上分享面板與朋友連結落地頁。"""
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub('import { particles, crossfade, typeHTML, riseOnChange, pulse, reduced } from "./fx.js";',
    'import { particles, crossfade, typeHTML, riseOnChange, pulse, reduced } from "./fx.js";\nimport { drawCard, cardBlob, shareLink, shareText } from "./share.js";')
sub('      <button type="button" class="btn ghost" id="copyR">抄一份</button>',
    '      <button type="button" class="btn ghost share-btn" id="shareR">分享</button>')
start = s.index('  $("#copyR").onclick = async () => {')
end = s.index('  };\n', start) + len('  };\n')
s = s[:start] + '  $("#shareR").onclick = () => openShare(R);\n' + s[end:]

sub('// ───────── 上回的批命 ─────────', r'''// ───────── 分享 ─────────
async function copy(txt, ok) {
  try { await navigator.clipboard.writeText(txt); toast(ok); }
  catch (_) { toast("這裡不給抄，長按文字複製"); }
}
function fullText(R) {
  return [`問名堂批命：${R.name}（${R.gender === "f" ? "坤造" : "乾造"}）`, `評等：${R.grade}（${R.score}分）　${R.headline}`, R.headlinePlain,
    ...R.sections.map(s => `【${s.title}】\n批：${s.pi.join("")}\n白話：${s.bai}`), "", "也去給先生看看你的名字：" + shareLink(R)].join("\n");
}
async function openShare(R) {
  sfx("paper");
  const link = shareLink(R), text = shareText(R), enc = encodeURIComponent;
  const box = document.createElement("div");
  box.className = "share";
  box.innerHTML = `<div class="share-in f-slip" role="dialog" aria-modal="true" aria-labelledby="shH">
      <p class="share-h" id="shH">這張紅紙，拿去給朋友看</p>
      <div class="share-pic" id="shPic"><span>紅紙寫好中……</span></div>
      <button type="button" class="btn main wide" id="shNative" hidden>分享這張紅紙</button>
      <div class="share-grid">
        <a class="btn ghost" id="shLine" href="https://social-plugins.line.me/lineit/share?url=${enc(link)}" target="_blank" rel="noopener">LINE</a>
        <a class="btn ghost" id="shFb" href="https://www.facebook.com/sharer/sharer.php?u=${enc(link)}" target="_blank" rel="noopener">臉書</a>
        <a class="btn ghost" id="shTh" href="https://www.threads.net/intent/post?text=${enc(text + "\n" + link)}" target="_blank" rel="noopener">Threads</a>
        <button type="button" class="btn ghost" id="shSave">存圖片</button>
        <button type="button" class="btn ghost" id="shLink">複製連結</button>
        <button type="button" class="btn ghost" id="shText">抄全文</button>
      </div>
      <p class="share-note">圖片跟連結都不會帶你的生日。存下圖片，就能貼到 IG 限動。</p>
      <button type="button" class="btn ghost wide" id="shClose">收起來</button>
    </div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add("on"));
  const onKey = e => { if (e.key === "Escape") close(); };
  const close = () => { box.classList.remove("on"); setTimeout(() => box.remove(), 300); removeEventListener("keydown", onKey); };
  addEventListener("keydown", onKey);
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector("#shClose").onclick = close;
  box.querySelector("#shLink").onclick = () => copy(link, "連結抄好了，貼給朋友就好");
  box.querySelector("#shText").onclick = () => copy(fullText(R), "整張批命抄好了");
  let file = null, url = null;
  const fname = `問名堂_${R.name}.png`;
  try {
    const blob = await cardBlob(await drawCard(R));
    file = new File([blob], fname, { type: "image/png" });
    url = URL.createObjectURL(blob);
    box.querySelector("#shPic").innerHTML = `<img src="${url}" alt="${esc(R.name)}的批命紅紙：${R.grade}，${esc(R.headline)}">`;
  } catch (_) { box.querySelector("#shPic").innerHTML = `<span>紅紙沒寫成，用下面的連結分享也一樣。</span>`; }
  box.querySelector("#shSave").onclick = () => {
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = fname; document.body.append(a); a.click(); a.remove();
    toast("圖片存好了");
  };
  const nb = box.querySelector("#shNative");
  const data = file && navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], text: text + "\n" + link } : { title: "問名堂", text, url: link };
  if (navigator.share) {
    nb.hidden = false;
    nb.onclick = async () => { try { await navigator.share(data); } catch (_) {} };
  }
}

// 朋友傳來的連結：?n=名字&g=m|f&s=姓氏字數&gr=評等&sc=分數&t=所問&b=1（原批有配八字）
function incoming() {
  const q = new URLSearchParams(location.search);
  const n = [...(q.get("n") || "")].filter(c => /\p{Script=Han}/u.test(c));
  if (n.length < 2 || n.length > 5) return null;
  const g = q.get("g") === "f" ? "f" : "m";
  const gr = ["上上", "上", "中", "中下", "下"].includes(q.get("gr")) ? q.get("gr") : null;
  const sc = Math.max(0, Math.min(100, parseInt(q.get("sc"), 10) || 0)) || null;
  const t = TOPICS.some(x => x[0] === q.get("t")) ? q.get("t") : "all";
  const sl = q.get("s") === "2" ? 2 : 1;
  return { chars: n, name: n.join(""), g, gr, sc, t, sl, bazi: q.get("b") === "1" };
}
const friend = incoming();
function showFriend(x) {
  setPhase("seat"); pose("speak");
  S.chars = [...x.chars]; S.surnameLen = x.sl; renderPaper(); $("#seal").classList.add("on");
  speak(`剛剛有人拿「${esc(x.name)}」來給我看。<span class="q">換你了，坐。</span>`);
  act.innerHTML = `<div class="hero friend">
      <div class="score">${esc(x.name)}・${x.g === "f" ? "坤造" : "乾造"}</div>
      ${x.gr ? `<div class="grade">${x.gr}</div>` : ""}${x.sc ? `<div class="score">${han(x.sc)}分</div>` : ""}
      <div class="hlp">朋友給先生看過的名字。你的名字，會批出什麼？</div>
    </div>
    <div class="props">
      <button type="button" class="prop red" data-m="read"><span class="in"><span class="t">換我看名字</span><span class="s">寫下你的名字</span></span></button>
      <button type="button" class="prop f-wood" data-m="name"><span class="in"><span class="t">幫小孩取名</span><span class="s">給姓和生日</span></span></button>
    </div>
    <div class="row"><button type="button" class="btn ghost" id="seeFriend">看${esc(x.name)}的筆畫</button></div>`;
  act.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { S.mode = b.dataset.m; S.chars = []; S.surnameLen = null; askName(); });
  $("#seeFriend").onclick = async () => {
    await ready;
    S.mode = "read"; S.gender = x.g; S.topic = x.t; S.birth = null; S.bazi = null;
    const sp = currentSplit();
    showReading(reading({ surname: sp.surname, given: sp.given, gender: x.g, topic: x.t, bazi: null }));
    if (x.bazi) speak(`他那張有配八字，<span class="q">我這裡只看名字，</span>評等會不太一樣。`);
  };
  history.replaceState(null, "", location.pathname);
}

// ───────── 上回的批命 ─────────''')
sub('''  setTimeout(() => $("#intro").remove(), 900);
  seat();''', '''  setTimeout(() => $("#intro").remove(), 900);
  friend ? showFriend(friend) : seat();''')
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
