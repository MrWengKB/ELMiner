// Sound effects, synthesized with the Web Audio API (no audio files needed)
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('mining-muted') === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function env(g, t, vol, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, to = null } = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, vol, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function noise(dur, { vol = 0.3, at = 0, filter = 'lowpass', freq = 1000 } = {}) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = ctx.createGain();
    env(g, t, vol, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  const notes = (list, gap, opts) => list.forEach((f, i) => tone(f, opts.dur || 0.12, { ...opts, at: i * gap }));

  const SFX = {
    step:  () => tone(190, 0.05, { type: 'triangle', vol: 0.12, to: 150 }),
    bump:  () => tone(110, 0.12, { vol: 0.3, to: 70 }),
    dig:   () => { noise(0.09, { vol: 0.35, filter: 'bandpass', freq: 900 }); tone(170, 0.08, { vol: 0.25, to: 90 }); },
    crack: () => { noise(0.06, { vol: 0.25, filter: 'highpass', freq: 2500 }); tone(620, 0.06, { type: 'square', vol: 0.06, to: 300 }); },
    coin:  () => { tone(988, 0.06, { type: 'square', vol: 0.08 }); tone(1319, 0.14, { type: 'square', vol: 0.08, at: 0.06 }); },
    coin3: () => notes([784, 988, 1319], 0.06, { type: 'square', vol: 0.08, dur: 0.12 }),
    gem:   () => { notes([1047, 1319, 1568, 2093], 0.07, { type: 'triangle', vol: 0.18, dur: 0.25 }); noise(0.4, { vol: 0.05, filter: 'highpass', freq: 6000, at: 0.1 }); },
    boom:  () => { noise(0.7, { vol: 0.8, freq: 500 }); tone(120, 0.5, { vol: 0.5, to: 35 }); },
    fall:  () => tone(520, 0.16, { vol: 0.1, to: 200 }),
    empty: () => { tone(440, 0.12, { type: 'square', vol: 0.08 }); tone(330, 0.2, { type: 'square', vol: 0.08, at: 0.13 }); },
    correct: () => notes([523, 659, 784, 1047], 0.08, { type: 'triangle', vol: 0.2, dur: 0.2 }),
    wrong: () => { tone(200, 0.15, { type: 'sawtooth', vol: 0.12 }); tone(150, 0.3, { type: 'sawtooth', vol: 0.12, at: 0.16 }); },
    buy:   () => { tone(1319, 0.08, { type: 'square', vol: 0.08 }); tone(1760, 0.2, { type: 'square', vol: 0.08, at: 0.08 }); },
    lose:  () => notes([392, 330, 262, 196], 0.18, { type: 'triangle', vol: 0.2, dur: 0.3 }),
  };

  function play(name) {
    if (muted || !SFX[name] || !ensure()) return;
    try { SFX[name](); } catch (e) {}
  }

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('mining-muted', muted ? '1' : '0'); } catch (e) {}
    if (!muted) { ensure(); SFX.coin(); }
    return muted;
  }

  // Browsers only allow audio after a user gesture
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { if (!muted) ensure(); }, { once: true }));

  return { play, toggle, get muted() { return muted; } };
})();
