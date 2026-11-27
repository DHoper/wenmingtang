// 問名堂音效：全部用 WebAudio 即時合成（不載音檔、無授權問題）。
// 瀏覽器規定要等使用者第一次點擊才能出聲，所以 AudioContext 在第一次 pointerdown 時才建立。
const KEY = "wenming:sound";
let ctx = null, master = null, amb = null, noiseBuf = null;
let on = (() => { try { return localStorage.getItem(KEY) !== "0"; } catch (_) { return true; } })();

function boot() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ctx.destination);
  // 一秒白噪音，給紙聲、筆聲、木頭的打擊音共用
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (on) ambience(true);
}
// 切到別的 App、鎖螢幕或換分頁時整個靜音（暫停音訊），回來再接著響
function pause() { if (ctx && ctx.state === "running") ctx.suspend(); }
document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) pause(); else if (on) ctx.resume(); });
addEventListener("pagehide", pause);
addEventListener("blur", () => { if (document.hidden) pause(); });
addEventListener("pointerdown", boot, { capture: true });
addEventListener("keydown", boot, { capture: true });

const now = () => ctx.currentTime;
function env(g, t, a, peak, dur, end = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + dur);
}
function noise(t, dur, { type = "bandpass", f = 1000, q = 1, peak = 0.3, a = 0.004, sweep = null, rate = 1 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = rate;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = ctx.createGain(); env(g, t, a, peak, dur);
  src.connect(fl).connect(g).connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + a + dur + 0.05);
}
function tone(t, freq, dur, { peak = 0.3, a = 0.003, type = "sine", drop = 1, detune = 0 } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (drop !== 1) o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
  const g = ctx.createGain(); env(g, t, a, peak, dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + a + dur + 0.05);
}

const S = {
  // 按木牌按鈕：乾脆的木頭輕叩
  tap() { const t = now(); tone(t, 1250, 0.05, { peak: 0.12, drop: 0.8 }); noise(t, 0.035, { f: 2600, q: 6, peak: 0.12 }); },
  // 木魚（數筆畫時一畫一聲），pitch 讓連續敲擊有高低
  tick(pitch = 1) { const t = now(); tone(t, 640 * pitch, 0.11, { peak: 0.32, drop: 0.86 }); tone(t, 1490 * pitch, 0.05, { peak: 0.08 }); noise(t, 0.03, { f: 1800 * pitch, q: 4, peak: 0.12 }); },
  // 黃楊木牌落在桌上
  wood() { const t = now(); tone(t, 210, 0.16, { peak: 0.38, drop: 0.7 }); tone(t, 560, 0.08, { peak: 0.14, drop: 0.9 }); noise(t, 0.05, { type: "lowpass", f: 1400, peak: 0.25 }); tone(t + 0.09, 250, 0.08, { peak: 0.12, drop: 0.7 }); },
  // 招牌互碰：兩聲輕脆木響
  chime() { const t = now(); [0, 0.07, 0.15].forEach((d, i) => { tone(t + d, [880, 1040, 760][i], 0.12, { peak: 0.13 - i * 0.03, drop: 0.95 }); noise(t + d, 0.02, { f: 3000, q: 5, peak: 0.06 }); }); },
  // 毛筆落紙：沙沙一撇
  brush() { const t = now(); noise(t, 0.22, { f: 900, q: 0.9, peak: 0.16, a: 0.03, sweep: 2600 }); noise(t + 0.02, 0.16, { type: "highpass", f: 4000, peak: 0.05, a: 0.02 }); },
  // 翻紙、攤紙
  paper() { const t = now(); for (let i = 0; i < 5; i++) noise(t + i * 0.035 + Math.random() * 0.02, 0.06 + Math.random() * 0.05, { type: "highpass", f: 1800 + Math.random() * 1600, peak: 0.07 + Math.random() * 0.05, a: 0.006 }); noise(t, 0.3, { f: 700, q: 0.7, peak: 0.05, a: 0.05 }); },
  // 發一張小紅紙
  deal() { const t = now(); noise(t, 0.07, { type: "highpass", f: 3200, peak: 0.12, a: 0.004 }); noise(t + 0.02, 0.09, { f: 1200, q: 1.2, peak: 0.06 }); },
  // 蓋章：悶悶的一下
  stamp() { const t = now(); tone(t, 120, 0.22, { peak: 0.55, drop: 0.45 }); noise(t, 0.08, { type: "lowpass", f: 600, peak: 0.4, a: 0.002 }); noise(t + 0.005, 0.04, { f: 2200, q: 2, peak: 0.08 }); },
  // 廟裡的銅磬：不諧和泛音、長尾音，兩個音分稍微錯開產生拍音
  bell() {
    const t = now(), f = 392;
    [[1, 0.22, 4.2], [2.76, 0.1, 2.6], [5.4, 0.06, 1.6], [8.93, 0.035, 1.0], [1.003, 0.12, 4.2]].forEach(([r, p, d]) => tone(t, f * r, d, { peak: p, a: 0.004 }));
    noise(t, 0.05, { f: 3000, q: 3, peak: 0.08 });
  },
};

// 夜裡的環境音：遠處蟲鳴＋很淡的風聲
function ambience(start) {
  if (!ctx) return;
  if (!start) { if (amb) { amb.stop(); amb = null; } return; }
  if (amb) return;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
  g.gain.linearRampToValueAtTime(1, now() + 3);
  const wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true; wind.playbackRate.value = 0.25;
  const wf = ctx.createBiquadFilter(); wf.type = "lowpass"; wf.frequency.value = 380;
  const wg = ctx.createGain(); wg.gain.value = 0.035;
  wind.connect(wf).connect(wg).connect(g); wind.start();
  let alive = true;
  const chirp = () => {
    if (!alive) return;
    const t = now() + 0.05, base = 3900 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.frequency.value = base;
      const am = ctx.createGain(); const lfo = ctx.createOscillator(); lfo.frequency.value = 48; const lg = ctx.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg).connect(am.gain); am.gain.value = 0.5;
      const e = ctx.createGain(); env(e, t + i * 0.16, 0.01, 0.012, 0.09);
      o.connect(am).connect(e).connect(g); o.start(t + i * 0.16); lfo.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.12); lfo.stop(t + i * 0.16 + 0.12);
    }
    setTimeout(chirp, 900 + Math.random() * 2600);
  };
  chirp();
  amb = { stop() { alive = false; g.gain.linearRampToValueAtTime(0, now() + 0.6); setTimeout(() => { try { wind.stop(); } catch (_) {} }, 700); } };
}

export function sfx(name, ...args) {
  if (!on || !ctx || ctx.state !== "running") return;
  try { S[name]?.(...args); } catch (_) {}
}
export function soundOn() { return on; }
export function setSound(v) {
  on = v;
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (_) {}
  boot();
  if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, now(), 0.05);
  ambience(v);
}
