//@ audio/sound — Sound, all synthesised (Web Audio)
//@ Defines: —
//@ Uses:    core/util
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── sound (all synthesised) ─────────────────────────
const audio = (() => {
  let ctx = null,
    master = null,
    on = true,
    nodes = null,
    noiseBuf = null,
    ringT = 0;
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
      return;
    }
    master = ctx.createGain();
    master.gain.value = on ? 0.8 : 0;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const osc = (type, f, g, dest) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg);
      gg.connect(dest);
      o.start();
      return { o, g: gg };
    };
    const loop = (freq, q, type) => {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      s.connect(f);
      f.connect(g);
      g.connect(master);
      s.start();
      return { f, g };
    };
    // the drone
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.Q.value = 2;
    lp.connect(master);
    const dg = ctx.createGain();
    dg.gain.value = 0.05;
    dg.connect(lp);
    osc('triangle', 49, 1, dg);
    osc('sine', 73.6, 0.55, dg);
    const dis = osc('sawtooth', 69.4, 0, dg);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg);
    lg.connect(lp.frequency);
    lfo.start();
    // fluorescent hum
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 120;
    bp.Q.value = 9;
    bp.connect(master);
    const hum = osc('sawtooth', 60, 0, bp);
    // wind, rain, traffic
    const wind = loop(420, 0.7);
    const wl = ctx.createOscillator();
    wl.frequency.value = 0.11;
    const wlg = ctx.createGain();
    wlg.gain.value = 180;
    wl.connect(wlg);
    wlg.connect(wind.f.frequency);
    wl.start();
    const rain = loop(2600, 0.4);
    const rain2 = loop(700, 0.6);
    const car = loop(140, 1.2);
    nodes = { dis, hum, wind, rain, rain2, car, dg };
  }
  const now = () => ctx.currentTime;
  function out(pan) {
    if (!ctx.createStereoPanner || !pan) return master;
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    p.connect(master);
    return p;
  }
  function env(g, a, peak, d) {
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now() + a);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + a + d);
  }
  function tone(type, f, a, peak, d, f2, pan) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, now());
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now() + a + d);
    const g = ctx.createGain();
    env(g, a, peak, d);
    o.connect(g);
    g.connect(out(pan));
    o.start();
    o.stop(now() + a + d + 0.05);
  }
  function noise(a, peak, d, freq, q, pan) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, a, peak, d);
    s.connect(f);
    f.connect(g);
    g.connect(out(pan));
    s.start();
    s.stop(now() + a + d + 0.1);
  }
  return {
    init,
    setOn(v) {
      on = v;
      if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, now(), 0.05);
    },
    update(s) {
      if (!ctx || !nodes) return;
      const t = now();
      nodes.hum.g.gain.setTargetAtTime(s.hum ? 0.006 : 0, t, 0.3);
      nodes.wind.g.gain.setTargetAtTime(s.outside ? (s.night ? 0.03 : 0.012) : 0.002, t, 0.6);
      nodes.rain.g.gain.setTargetAtTime(s.rain * (s.outside ? 0.05 : 0.016), t, 0.8);
      nodes.rain2.g.gain.setTargetAtTime(s.rain * (s.outside ? 0.03 : 0.02), t, 0.8);
      nodes.car.g.gain.setTargetAtTime(s.car * 0.09, t, 0.15);
      nodes.car.f.frequency.setTargetAtTime(110 + s.car * 90, t, 0.2);
      nodes.dis.g.gain.setTargetAtTime(Math.max(clamp((s.stress - 60) / 40, 0, 1) * 0.5, (s.dread || 0) * 0.42), t, 1);
      nodes.dg.gain.setTargetAtTime((s.night ? 0.06 : 0.035) + (s.dread || 0) * 0.05, t, 1);
    },
    sting(kind) {
      if (!ctx) return;
      if (kind === 'onto') {
        for (const f of [233, 246.9, 311]) tone('sawtooth', f, 0.02, 0.05, 1.8, f * 0.94);
        noise(0.05, 0.08, 1.4, 900, 0.8);
        tone('sine', 55, 0.01, 0.25, 1.2, 40);
      } else if (kind === 'caught') {
        tone('square', 92, 0.005, 0.18, 0.6, 60);
        noise(0.01, 0.12, 0.5, 2400, 3);
        tone('sawtooth', 880, 0.3, 0.03, 1.4, 1320);
      } else if (kind === 'awkward') {
        tone('triangle', 330, 0.01, 0.12, 0.18, 300);
        setTimeout(() => ctx && tone('triangle', 247, 0.01, 0.12, 0.35, 220), 190);
      } else if (kind === 'clear') {
        tone('sine', 523, 0.01, 0.07, 0.5);
        setTimeout(() => ctx && tone('sine', 659, 0.01, 0.07, 0.7), 140);
      } else if (kind === 'siren') {
        for (let k = 0; k < 4; k++)
          setTimeout(() => ctx && tone('sine', k % 2 ? 620 : 840, 0.04, 0.05, 0.42, k % 2 ? 840 : 620), k * 430);
      } else if (kind === 'whisper') {
        for (let k = 0; k < 3; k++)
          setTimeout(() => ctx && noise(0.15, 0.06, 0.5, rand(1800, 3200), 6, rand(-0.9, 0.9)), k * 260);
      } else if (kind === 'murmur') {
        // the crowd: low voices all round, nobody saying anything you can catch
        for (let k = 0; k < 6; k++)
          setTimeout(() => ctx && noise(0.18, 0.035, 0.7, rand(320, 720), 3, rand(-0.9, 0.9)), k * 110);
      } else if (kind === 'gasp') {
        for (let k = 0; k < 4; k++)
          setTimeout(() => ctx && noise(0.02, 0.07, 0.4, rand(1300, 2100), 1.6, rand(-0.8, 0.8)), k * 45);
      } else if (kind === 'crowdlaugh') {
        for (let k = 0; k < 5; k++)
          setTimeout(() => ctx && tone('triangle', rand(240, 330), 0.01, 0.045, 0.14, rand(200, 260)), k * 130);
      } else if (kind === 'whistle') {
        // a police whistle: a short blast and a long one, the pea rattling inside
        for (const [at, len] of [
          [0, 0.3],
          [0.4, 0.8],
        ]) {
          const t = now() + at,
            o = ctx.createOscillator(),
            lfo = ctx.createOscillator(),
            dep = ctx.createGain(),
            g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = 2850;
          lfo.frequency.value = 27;
          dep.gain.value = 160;
          lfo.connect(dep);
          dep.connect(o.frequency);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
          g.gain.setValueAtTime(0.06, t + len - 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          o.connect(g);
          g.connect(out(0));
          o.start(t);
          lfo.start(t);
          o.stop(t + len + 0.05);
          lfo.stop(t + len + 0.05);
        }
      } else if (kind === 'slip') {
        // a wet click: the mask, slipping
        tone('sine', 1500, 0.002, 0.08, 0.07, 260);
        noise(0.002, 0.06, 0.09, 3200, 4);
      }
    },
    // the horror layer's sounds: all synthesised, all for the ears only
    hx(kind, pan = 0, vol = 1) {
      if (!ctx || vol <= 0.01) return;
      const T0 = now(),
        o = out(pan);
      const g = (peak, a, d, dest) => {
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, T0);
        gg.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), T0 + a);
        gg.gain.exponentialRampToValueAtTime(0.0001, T0 + a + d);
        gg.connect(dest || o);
        return gg;
      };
      const osc = (type, f, dest, t1, f1) => {
        const x = ctx.createOscillator();
        x.type = type;
        x.frequency.setValueAtTime(f, T0);
        if (f1) x.frequency.exponentialRampToValueAtTime(f1, T0 + t1);
        x.connect(dest);
        x.start(T0);
        x.stop(T0 + (t1 || 3) + 0.2);
        return x;
      };
      const filt = (type, f, q, dest) => {
        const b = ctx.createBiquadFilter();
        b.type = type;
        b.frequency.setValueAtTime(f, T0);
        b.Q.value = q;
        b.connect(dest);
        return b;
      };
      const nz = (dest, dur) => {
        const s = ctx.createBufferSource();
        s.buffer = noiseBuf;
        s.connect(dest);
        s.start(T0, Math.random());
        s.stop(T0 + dur + 0.1);
        return s;
      };
      const vib = (x, rate, depth) => {
        const l = ctx.createOscillator();
        l.frequency.value = rate;
        const lg = ctx.createGain();
        lg.gain.value = depth;
        l.connect(lg);
        lg.connect(x.frequency);
        l.start(T0);
        l.stop(T0 + 6);
      };
      const blip = (d, mk) => mk(T0 + d);
      switch (kind) {
        case 'thrum': {
          // the craft: two saws beating far below hearing, a whine climbing over them
          const lp = filt('lowpass', 170, 3, g(0.34, 0.8, 2.6));
          osc('sawtooth', 41, lp, 3.2);
          osc('sawtooth', 43.5, lp, 3.2);
          osc('sine', 700, g(0.025, 1.2, 2.0), 3.2, 1500);
          break;
        }
        case 'beam': {
          // glassy, cold, too even
          for (const f of [1180, 1770, 2360]) {
            const x = osc('sine', f, g(0.03, 0.05, 2.2), 2.3, f * 1.04);
            vib(x, 9 + Math.random() * 4, f * 0.01);
          }
          nz(filt('highpass', 6000, 0.5, g(0.05, 0.02, 1.8)), 2);
          osc('sine', 62, g(0.26, 0.01, 1.2), 1.3, 30);
          break;
        }
        case 'zip':
          osc('sine', 260, g(0.08, 0.05, 0.9), 1, 2600);
          nz(filt('bandpass', 1800, 1.2, g(0.08, 0.1, 0.9)), 1.1);
          break;
        case 'hiss':
          nz(filt('bandpass', 3800, 1.4, g(0.24, 0.25, 0.9)), 1.3);
          break;
        case 'slurp': {
          // wet: noise dragged through a narrow throat, a gurgle under it
          const b = filt('bandpass', 380, 4, g(0.42, 0.06, 1.1));
          b.frequency.exponentialRampToValueAtTime(1300, T0 + 0.45);
          b.frequency.exponentialRampToValueAtTime(320, T0 + 1.1);
          nz(b, 1.3);
          const gu = osc('sine', 95, g(0.13, 0.05, 0.9), 1.1, 70);
          vib(gu, 17, 30);
          break;
        }
        case 'scream': {
          // a voice, a street away, through glass
          const x = osc('sawtooth', 560, filt('bandpass', 1050, 2.6, g(0.17, 0.08, 1.6)), 1.8);
          x.frequency.cancelScheduledValues(T0);
          x.frequency.setValueAtTime(560, T0);
          x.frequency.linearRampToValueAtTime(880, T0 + 0.25);
          x.frequency.exponentialRampToValueAtTime(380, T0 + 1.7);
          vib(x, 6.5, 22);
          nz(filt('bandpass', 2400, 3, g(0.04, 0.05, 1.3)), 1.5);
          break;
        }
        case 'groan': {
          const x = osc('sawtooth', 82, filt('lowpass', 420, 4, g(0.24, 0.3, 1.5)), 2, 62);
          vib(x, 3.2, 6);
          nz(filt('bandpass', 300, 2, g(0.05, 0.2, 1.2)), 1.6);
          break;
        }
        case 'bite':
          nz(filt('bandpass', 900, 0.9, g(0.3, 0.005, 0.14)), 0.2);
          nz(filt('lowpass', 500, 1, g(0.24, 0.02, 0.35)), 0.45);
          osc('sine', 120, g(0.16, 0.005, 0.12), 0.15, 60);
          break;
        case 'crack':
          nz(filt('bandpass', 2400, 1.2, g(0.18, 0.002, 0.08)), 0.12);
          osc('sine', 90, g(0.1, 0.002, 0.15), 0.2, 50);
          break;
        case 'sting': {
          // strings scraped hard: a cluster that never resolves, and the floor dropping out
          const hp = filt('highpass', 500, 0.7, g(0.075, 0.02, 1.5));
          for (const f of [988, 1047, 1109, 1480]) {
            const x = osc('sawtooth', f, hp, 1.6, f * 0.97);
            vib(x, 11 + Math.random() * 3, f * 0.012);
          }
          osc('sine', 48, g(0.32, 0.01, 1.4), 1.5, 34);
          break;
        }
        case 'whisper':
          for (let k = 0; k < 4; k++)
            blip(k * 0.18, (t) => {
              const s = ctx.createBufferSource();
              s.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'bandpass';
              b.frequency.value = rand(1800, 3400);
              b.Q.value = 7;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.055 * vol, t + 0.12);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
              s.connect(b);
              b.connect(gg);
              gg.connect(out(clamp(pan + rand(-0.4, 0.4), -1, 1)));
              s.start(t, Math.random());
              s.stop(t + 0.6);
            });
          break;
        case 'skitter':
          for (let k = 0, d = 0; k < 14; k++, d += rand(0.035, 0.07))
            blip(d, (t) => {
              const s = ctx.createBufferSource();
              s.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'bandpass';
              b.frequency.value = rand(3000, 5200);
              b.Q.value = 5;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.003);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
              s.connect(b);
              b.connect(gg);
              gg.connect(o);
              s.start(t, Math.random());
              s.stop(t + 0.05);
            });
          break;
        case 'drag': {
          // cloth and skin on wet tarmac, and somebody too tired to scream
          const b = filt('bandpass', 520, 3, g(0.17, 0.3, 2.6));
          nz(b, 3);
          const l = ctx.createOscillator();
          l.frequency.value = 7;
          const lg = ctx.createGain();
          lg.gain.value = 260;
          l.connect(lg);
          lg.connect(b.frequency);
          l.start(T0);
          l.stop(T0 + 3);
          const x = osc('sawtooth', 140, filt('lowpass', 500, 2, g(0.05, 0.6, 1.8)), 2.6, 110);
          vib(x, 4, 8);
          break;
        }
        case 'choir':
          for (const f of [110, 131, 165, 196]) {
            const x = osc('triangle', f, filt('lowpass', 700, 1, g(0.035, 1.8, 3.6)), 5.5, f * 0.985);
            vib(x, 4.5 + Math.random(), 1.6);
          }
          break;
        case 'tap':
          for (let k = 0; k < 2; k++)
            blip(k * 0.22, (t) => {
              const x = ctx.createOscillator();
              x.type = 'sine';
              x.frequency.setValueAtTime(1900, t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
              x.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.12);
            });
          break;
        case 'knock':
          osc('sine', 110, g(0.36, 0.003, 0.18), 0.22, 70);
          nz(filt('lowpass', 700, 1, g(0.2, 0.002, 0.08)), 0.12);
          break;
        case 'whoosh': {
          const b = filt('bandpass', 380, 0.8, g(0.16, 0.4, 1.5));
          b.frequency.exponentialRampToValueAtTime(2200, T0 + 1.2);
          nz(b, 2.0);
          osc('sine', 88, g(0.1, 0.3, 1.3), 1.7, 44);
          break;
        }
        case 'probe': {
          // a drill made of glass
          const x = osc('sawtooth', 1650, filt('bandpass', 2600, 6, g(0.06, 0.15, 1.8)), 2.0, 2300);
          vib(x, 31, 60);
          osc('sine', 3300, g(0.02, 0.2, 1.6), 1.9, 3800);
          nz(filt('highpass', 5000, 0.7, g(0.03, 0.1, 1.6)), 1.8);
          break;
        }
        case 'click':
          for (let k = 0; k < 9; k++)
            blip(k * rand(0.06, 0.12), (t) => {
              const x = ctx.createOscillator();
              x.type = 'square';
              x.frequency.setValueAtTime(rand(1800, 3800), t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.05 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
              x.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.04);
            });
          break;
        case 'door':
          nz(filt('bandpass', 900, 0.7, g(0.16, 0.03, 0.5)), 0.6);
          osc('sine', 180, g(0.05, 0.02, 0.35), 0.4, 120);
          break;
        case 'alarm':
          for (let k = 0; k < 6; k++)
            blip(k * 0.32, (t) => {
              const x = ctx.createOscillator();
              x.type = 'square';
              x.frequency.setValueAtTime(k % 2 ? 660 : 990, t);
              const f = ctx.createBiquadFilter();
              f.type = 'lowpass';
              f.frequency.value = 2200;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.045 * vol, t + 0.01);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
              x.connect(f);
              f.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.3);
            });
          break;
        case 'pod': {
          osc('sine', 70, g(0.45, 0.01, 1.2), 1.4, 30);
          nz(filt('lowpass', 900, 0.8, g(0.35, 0.02, 1.6)), 1.8);
          const x = osc('sawtooth', 120, filt('lowpass', 1400, 2, g(0.08, 0.5, 1.5)), 2, 900);
          vib(x, 12, 20);
          break;
        }
        case 'thud':
          osc('sine', 70, g(0.5, 0.005, 0.5), 0.6, 35);
          nz(filt('lowpass', 400, 1, g(0.3, 0.005, 0.25)), 0.35);
          break;
        case 'grab':
          nz(filt('bandpass', 700, 1.2, g(0.3, 0.005, 0.22)), 0.3);
          osc('sine', 110, g(0.22, 0.005, 0.2), 0.25, 60);
          break;
        case 'lock':
          for (let k = 0; k < 2; k++)
            blip(k * 0.12, (t) => {
              const s2 = ctx.createBufferSource();
              s2.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'bandpass';
              b.frequency.value = 3200;
              b.Q.value = 4;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.25 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
              s2.connect(b);
              b.connect(gg);
              gg.connect(o);
              s2.start(t, Math.random());
              s2.stop(t + 0.08);
            });
          break;
        case 'creak': {
          const x = osc('sawtooth', 190, filt('bandpass', 700, 8, g(0.06, 0.2, 1.1)), 1.4, 260);
          vib(x, 23, 30);
          break;
        }
        case 'glass':
          for (let k = 0; k < 10; k++)
            blip(k * rand(0.01, 0.05), (t) => {
              const x = ctx.createOscillator();
              x.type = 'sine';
              x.frequency.setValueAtTime(rand(2400, 6800), t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.06 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.1, 0.5));
              x.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.6);
            });
          nz(filt('highpass', 2500, 0.7, g(0.3, 0.003, 0.4)), 0.5);
          break;
        case 'breath': {
          nz(filt('bandpass', 1100, 1.4, g(0.1, 0.25, 0.6)), 0.9);
          blip(0.9, (t) => {
            const s2 = ctx.createBufferSource();
            s2.buffer = noiseBuf;
            const b2 = ctx.createBiquadFilter();
            b2.type = 'bandpass';
            b2.frequency.value = 800;
            b2.Q.value = 1.2;
            const gg = ctx.createGain();
            gg.gain.setValueAtTime(0.0001, t);
            gg.gain.exponentialRampToValueAtTime(0.07 * vol, t + 0.3);
            gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
            s2.connect(b2);
            b2.connect(gg);
            gg.connect(o);
            s2.start(t, Math.random());
            s2.stop(t + 1);
          });
          break;
        }
        case 'laugh': // breath forced out through teeth, in bursts, and something low in a throat that isn't a throat
          for (let k = 0; k < 7; k++)
            blip(k * 0.13 + (k > 3 ? 0.1 : 0), (t) => {
              const s2 = ctx.createBufferSource();
              s2.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'bandpass';
              b.frequency.value = 2600 - k * 120;
              b.Q.value = 3;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.015);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
              s2.connect(b);
              b.connect(gg);
              gg.connect(o);
              s2.start(t, Math.random());
              s2.stop(t + 0.12);
              const x = ctx.createOscillator();
              x.type = 'sawtooth';
              x.frequency.setValueAtTime(140 - k * 6, t);
              const lp2 = ctx.createBiquadFilter();
              lp2.type = 'lowpass';
              lp2.frequency.value = 600;
              const g2 = ctx.createGain();
              g2.gain.setValueAtTime(0.0001, t);
              g2.gain.exponentialRampToValueAtTime(0.035 * vol, t + 0.01);
              g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
              x.connect(lp2);
              lp2.connect(g2);
              g2.connect(o);
              x.start(t);
              x.stop(t + 0.1);
            });
          break;
        case 'chew':
          for (let k = 0; k < 3; k++)
            blip(k * 0.16, (t) => {
              const s2 = ctx.createBufferSource();
              s2.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'lowpass';
              b.frequency.value = 700;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.2 * vol, t + 0.02);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
              s2.connect(b);
              b.connect(gg);
              gg.connect(o);
              s2.start(t, Math.random());
              s2.stop(t + 0.15);
            });
          break;
        case 'coins':
          for (let k = 0; k < 12; k++)
            blip(k * rand(0.025, 0.07), (t) => {
              const x = ctx.createOscillator();
              x.type = 'triangle';
              x.frequency.setValueAtTime(rand(3200, 5600), t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.045 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.12, 0.35));
              x.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.4);
            });
          break;
        case 'drip':
          osc('sine', rand(900, 1400), g(0.06, 0.002, 0.18), 0.2, 2200);
          break;
        case 'splash':
          nz(filt('bandpass', 1200, 0.7, g(0.18, 0.01, 0.5)), 0.6);
          nz(filt('lowpass', 500, 1, g(0.12, 0.02, 0.4)), 0.5);
          break;
        case 'rope':
          nz(filt('bandpass', 1500, 2.5, g(0.12, 0.03, 0.25)), 0.35);
          break;
        case 'strap':
          nz(filt('bandpass', 2200, 3, g(0.1, 0.02, 0.18)), 0.25);
          osc('square', 140, filt('lowpass', 600, 1, g(0.04, 0.005, 0.1)), 0.12);
          break;
        case 'buzz': {
          const b = filt('bandpass', 340, 6, g(0.06, 0.4, 1.8));
          nz(b, 2.3);
          const l = ctx.createOscillator();
          l.frequency.value = 23;
          const lg = ctx.createGain();
          lg.gain.value = 120;
          l.connect(lg);
          lg.connect(b.frequency);
          l.start(T0);
          l.stop(T0 + 2.4);
          break;
        }
        case 'heart':
          for (const [d, pk] of [
            [0, 0.5],
            [0.17, 0.32],
          ])
            blip(d, (t) => {
              const x = ctx.createOscillator();
              x.type = 'sine';
              x.frequency.setValueAtTime(62, t);
              x.frequency.exponentialRampToValueAtTime(38, t + 0.16);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(pk * vol, t + 0.012);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
              x.connect(gg);
              gg.connect(master);
              x.start(t);
              x.stop(t + 0.25);
            });
          break;
      }
    },
    // THEIR places' own air: a drone in the craft, running water in the drains, flies and something breathing in the nest
    amb(kind, level = 1) {
      if (!ctx) return;
      const A = this._amb || (this._amb = {});
      const mk = (k) => {
        const g0 = ctx.createGain();
        g0.gain.value = 0;
        g0.connect(master);
        const loopN = (type, f, q, v, dest) => {
          const s2 = ctx.createBufferSource();
          s2.buffer = noiseBuf;
          s2.loop = true;
          const b = ctx.createBiquadFilter();
          b.type = type;
          b.frequency.value = f;
          b.Q.value = q;
          const gg = ctx.createGain();
          gg.gain.value = v;
          s2.connect(b);
          b.connect(gg);
          gg.connect(dest || g0);
          s2.start();
          return b;
        };
        if (k === 'ship') {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 220;
          lp.Q.value = 3;
          lp.connect(g0);
          for (const [f, v] of [
            [41, 0.5],
            [43.6, 0.45],
            [82, 0.2],
          ]) {
            const o2 = ctx.createOscillator();
            o2.type = 'sawtooth';
            o2.frequency.value = f;
            const gg = ctx.createGain();
            gg.gain.value = v * 0.12;
            o2.connect(gg);
            gg.connect(lp);
            o2.start();
          }
          const w = ctx.createOscillator();
          w.frequency.value = 3150;
          const wg = ctx.createGain();
          wg.gain.value = 0.0035;
          w.connect(wg);
          wg.connect(g0);
          w.start();
        } else if (k === 'sewer') {
          loopN('lowpass', 600, 0.7, 0.05);
          loopN('bandpass', 2400, 0.8, 0.008);
        } else if (k === 'den') {
          const b = loopN('bandpass', 300, 5, 0.02);
          const l = ctx.createOscillator();
          l.frequency.value = 17;
          const lg = ctx.createGain();
          lg.gain.value = 60;
          l.connect(lg);
          lg.connect(b.frequency);
          l.start();
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 160;
          lp.connect(g0);
          const o2 = ctx.createOscillator();
          o2.type = 'triangle';
          o2.frequency.value = 38;
          const g4 = ctx.createGain();
          g4.gain.value = 0.08;
          o2.connect(g4);
          g4.connect(lp);
          o2.start();
          const br = ctx.createOscillator();
          br.frequency.value = 0.21;
          const brg = ctx.createGain();
          brg.gain.value = 0.06;
          br.connect(brg);
          brg.connect(g4.gain);
          br.start();
        }
        return { g: g0 };
      };
      for (const k of ['ship', 'sewer', 'den']) {
        const want = k === kind ? level : 0;
        if (!A[k]) {
          if (!want) continue;
          A[k] = mk(k);
        }
        A[k].g.gain.setTargetAtTime(want, now(), 0.6);
      }
      if (kind === 'sewer' && level > 0.2 && Math.random() < 0.012) this.hx('drip', rand(-0.8, 0.8), 0.7);
    },
    ping(pan, vol) {
      if (!ctx) return;
      tone('sine', 68, 0.005, 0.22 * vol, 0.7, 44, pan);
      setTimeout(() => ctx && tone('sine', 64, 0.005, 0.16 * vol, 0.6, 42, pan), 330);
      noise(0.08, 0.05 * vol, 1.1, 1400, 5, pan);
    },
    horn(pan) {
      if (!ctx) return;
      tone('square', 370, 0.01, 0.035, 0.32, null, pan);
      tone('square', 440, 0.01, 0.03, 0.32, null, pan);
    },
    blip(kind) {
      if (!ctx) return;
      if (kind === 'click') tone('sine', 1250, 0.002, 0.03, 0.05);
      else if (kind === 'cash') {
        tone('square', 1320, 0.003, 0.025, 0.06);
        setTimeout(() => ctx && tone('square', 1760, 0.003, 0.025, 0.09), 70);
      } else if (kind === 'shutter') noise(0.001, 0.3, 0.12, 3000, 1);
      else if (kind === 'ring') {
        for (let k = 0; k < 2; k++)
          setTimeout(() => {
            if (!ctx) return;
            tone('sine', 440, 0.01, 0.05, 0.38);
            tone('sine', 480, 0.01, 0.05, 0.38);
          }, k * 520);
      }
    },
    ringTick(dt, active) {
      if (!ctx || !active) {
        ringT = 0;
        return;
      }
      ringT -= dt;
      if (ringT <= 0) {
        ringT = 3.2;
        this.blip('ring');
      }
    },
  };
})();
