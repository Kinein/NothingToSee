//@ audio/sound — Sound, all synthesised (Web Audio)
//@ Defines: —
//@ Uses:    core/util, gfx/reach-rig, world/grid
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── sound (all synthesised) ─────────────────────────
// Sound has its own randomness: Math.random belongs to the simulation (and to its seeded determinism check), and
// whether the speakers are on must never change what happens in Wexley.
const audio = (() => {
  let ctx = null,
    master = null,
    bus = null, // the world: everything out there, through the muffle and the room
    head = null, // inside your head: the heart, the ringing. Never muffled, never in a room
    mix = null, // one-shots: dry into the bus, and a send into each of the two rooms
    muff = null,
    sendS = null,
    sendL = null,
    on = true,
    nodes = null,
    noiseBuf = null,
    ringT = 0,
    seed = 0x2545f491;
  const ar = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const rr = (a, b) => a + ar() * (b - a);
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
    // a soft limiter at the end, so a shot or a scream on top of the beds never clips
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.3;
    comp.connect(master);
    head = ctx.createGain();
    head.connect(comp);
    // the muffle: a hit, a passing-out, sleep, a held breath; the whole world goes under water
    muff = ctx.createBiquadFilter();
    muff.type = 'lowpass';
    muff.frequency.value = 18000;
    muff.Q.value = 0.6;
    muff.connect(comp);
    bus = ctx.createGain();
    bus.connect(muff);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = ar() * 2 - 1;
    // two rooms: a small one (a flat, an office) and a big one (the street at night, the drains, the craft).
    // Where you are mixes them (update: space)
    const ir = (sec, decay, dark) => {
      const n = Math.floor(ctx.sampleRate * sec),
        b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const o = b.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const t = i / n;
          lp += (ar() * 2 - 1 - lp) * (dark + (1 - dark) * (1 - t) * (1 - t));
          o[i] = lp * Math.pow(1 - t, decay) * Math.min(1, i / 60);
        }
      }
      return b;
    };
    const verbS = ctx.createConvolver(),
      verbL = ctx.createConvolver();
    verbS.buffer = ir(0.75, 3.4, 0.45);
    verbL.buffer = ir(3.8, 2.3, 0.07);
    verbS.connect(muff);
    verbL.connect(muff);
    sendS = ctx.createGain();
    sendS.gain.value = 0.15;
    sendS.connect(verbS);
    sendL = ctx.createGain();
    sendL.gain.value = 0.08;
    sendL.connect(verbL);
    mix = ctx.createGain();
    mix.connect(bus);
    mix.connect(sendS);
    mix.connect(sendL);
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
    const loop = (freq, q, type, dest) => {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      s.loopStart = ar();
      const f = ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      s.connect(f);
      f.connect(g);
      g.connect(dest || bus);
      s.start(0, ar() * 1.5);
      return { f, g };
    };
    const gain = (v, dest) => {
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(dest);
      return g;
    };
    // a slow wobble on any knob
    const lfo = (param, rate, depth, type) => {
      const l = ctx.createOscillator();
      l.type = type || 'sine';
      l.frequency.value = rate;
      const lg = gain(depth, param);
      l.connect(lg);
      l.start();
      return l;
    };
    // a pulse train on a gain: a sine, cut off below thr and squared, so each beat is a short swell (crickets, throbs)
    const pulses = (param, rate, thr, depth) => {
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const sh = ctx.createWaveShaper(),
        c = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * 2 - 1;
        c[i] = x > thr ? Math.pow((x - thr) / (1 - thr), 1.6) : 0;
      }
      sh.curve = c;
      l.connect(sh);
      sh.connect(gain(depth, param));
      l.start();
      return l;
    };
    // the drone
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.Q.value = 2;
    lp.connect(bus);
    const dg = gain(0.05, lp);
    osc('triangle', 49, 1, dg);
    osc('sine', 73.6, 0.55, dg);
    const dis = osc('sawtooth', 69.4, 0, dg);
    lfo(lp.frequency, 0.06, 140);
    // fluorescent hum
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 120;
    bp.Q.value = 9;
    bp.connect(bus);
    const hum = osc('sawtooth', 60, 0, bp);
    // wind, rain, traffic
    const wind = loop(420, 0.7);
    lfo(wind.f.frequency, 0.11, 180);
    const gust = ctx.createGain();
    gust.gain.value = 0.75;
    wind.f.disconnect();
    wind.f.connect(gust);
    gust.connect(wind.g);
    lfo(gust.gain, 0.037, 0.35); // gusts: the wind leans on the houses and lets go
    const rain = loop(2600, 0.4);
    const rain2 = loop(700, 0.6);
    const car = loop(140, 1.2);
    // indoors: the air of a closed room, and the fridge and wiring humming in a flat
    const room = loop(170, 0.8, 'lowpass');
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = 150;
    fl.connect(bus);
    const fridge = gain(0, fl);
    osc('sawtooth', 50, 0.7, fridge);
    osc('sine', 100, 0.4, fridge);
    // crickets: three of them in the dark, each its own pitch and rhythm. They stop when something is close
    const crick = gain(0, mix);
    for (const [f, rate, chirp, pan] of [
      [4350, 31, 2.3, -0.55],
      [4720, 26, 1.7, 0.6],
      [3980, 35, 0.9, 0.1],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const am = gain(0, crick),
        gate = gain(0, am);
      o.connect(gate);
      pulses(gate.gain, rate, 0, 1);
      pulses(am.gain, chirp, 0.35, 0.5);
      if (ctx.createStereoPanner) {
        am.disconnect();
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        am.connect(p);
        p.connect(crick);
      }
      o.start();
    }
    // the warning, before anything happens: two thin notes beating high up, the way ears ring before a faint
    const tin = gain(0, head);
    osc('sine', 6150, 0.5, tin);
    osc('sine', 6189, 0.5, tin);
    // something very big breathing under the town
    const sub = gain(0, bus),
      subA = gain(0.55, sub);
    pulses(subA.gain, 0.13, -0.4, 0.45);
    osc('sine', 33, 1, subA);
    osc('sine', 49.5, 0.3, subA);
    // danger: low strings trembling a semitone apart, close
    const clG = gain(0, mix),
      trem = gain(0.6, clG),
      clF = ctx.createBiquadFilter();
    clF.type = 'bandpass';
    clF.frequency.value = 520;
    clF.Q.value = 1.1;
    clF.connect(trem);
    lfo(trem.gain, 6.3, 0.35);
    lfo(clF.frequency, 0.09, 260);
    for (const f of [98, 103.8, 138.6, 146.8]) {
      const x = osc('sawtooth', f, 0.25, clF);
      lfo(x.o.frequency, 0.2 + ar() * 0.3, f * 0.004);
    }
    // what THEY are, under a bad hour: a glassy whine, a dry hiss breathing in and out, flies
    const fac = {
      aliens: gain(0, mix),
      lizards: gain(0, mix),
      zombies: gain(0, mix),
    };
    for (const f of [2930, 2961]) lfo(osc('sine', f, 0.5, fac.aliens).o.frequency, 0.23, 55);
    const lz = loop(4800, 1.6, 'bandpass', fac.lizards);
    lz.g.gain.value = 0;
    pulses(lz.g.gain, 0.17, -0.2, 1);
    const fz = loop(240, 7, 'bandpass', fac.zombies);
    fz.g.gain.value = 1;
    lfo(fz.f.frequency, 19, 70);
    lfo(fz.f.frequency, 0.4, 60);
    // THEIR gear in the walls: a whine on the edge of hearing, and a throb you feel more than hear
    const psy = gain(0, bus);
    osc('sine', 3150, 0.35, psy);
    osc('sine', 3157, 0.35, psy);
    const thr = gain(0, psy);
    osc('sine', 58, 1.2, thr);
    pulses(thr.gain, 1.1, 0, 1);
    nodes = { dis, hum, wind, rain, rain2, car, dg, room, fridge, crick, tin, sub, clG, fac, psy };
    T.last = ctx.currentTime;
  }
  const now = () => ctx.currentTime;
  function out(pan) {
    if (!ctx.createStereoPanner || !pan) return mix;
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    p.connect(mix);
    return p;
  }
  // the ambience's timers, in real seconds: a timer that runs out fires if its moment is right, and starts again
  const T = { last: 0, crick: 0, dg: 0 };
  const side = (w) => rr(-w, w);
  function tick(k, dt, ok, a, b) {
    if (T[k] == null) T[k] = rr(a, b) * 0.5;
    T[k] -= dt;
    if (T[k] > 0) return false;
    T[k] = rr(a, b);
    return ok;
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
    rnd: ar, // the sound's own randomness, for audio/foley
    setOn(v) {
      on = v;
      if (master) master.gain.setTargetAtTime(v ? 0.8 : 0, now(), 0.05);
    },
    // s: hum, outside, night, stress, rain, car, dread (every caller); the town's own tick adds space, day, hour,
    // warn, danger, look, muffle, psy, faction, home and town (see soundTick in audio/foley)
    update(s) {
      if (!ctx || !nodes) return;
      const t = now(),
        dt = clamp(t - T.last, 0, 0.25),
        N = nodes,
        out_ = !!s.outside,
        space = s.space || (out_ ? 'out' : 'room'),
        dread = s.dread || 0,
        danger = s.danger || 0,
        warn = Math.max(s.warn || 0, dread),
        night = s.day != null ? 1 - s.day : s.night ? 1 : 0,
        day = 1 - night,
        rain = s.rain || 0,
        stress = s.stress || 0,
        // the town holds its breath: birds, crickets and dogs go quiet in a bad hour, and at once when IT is close
        hush = clamp(1 - danger * 2.4 - warn * 0.85, 0, 1);
      T.last = t;
      N.hum.g.gain.setTargetAtTime(s.hum ? 0.006 : 0, t, 0.3);
      N.wind.g.gain.setTargetAtTime(out_ ? (s.night ? 0.03 : 0.012) + warn * 0.012 : 0.002, t, 0.6);
      N.rain.g.gain.setTargetAtTime(rain * (out_ ? 0.05 : 0.016), t, 0.8);
      N.rain2.g.gain.setTargetAtTime(rain * (out_ ? 0.03 : 0.02), t, 0.8);
      N.car.g.gain.setTargetAtTime((s.car || 0) * 0.09, t, 0.15);
      N.car.f.frequency.setTargetAtTime(110 + (s.car || 0) * 90, t, 0.2);
      N.dis.g.gain.setTargetAtTime(Math.max(clamp((stress - 60) / 40, 0, 1) * 0.5, dread * 0.42), t, 1);
      N.dg.gain.setTargetAtTime((s.night ? 0.06 : 0.035) + dread * 0.05, t, 1);
      N.room.g.gain.setTargetAtTime(out_ ? 0 : space === 'lair' ? 0.02 : 0.06, t, 0.5);
      N.fridge.gain.setTargetAtTime(s.home ? 0.012 : 0, t, 0.8);
      // crickets drop out fast and come back slowly, one at a time
      const cr = (out_ ? 0.02 : 0.003) * clamp((night - 0.45) * 2.2, 0, 1) * hush * (1 - rain * 0.7);
      N.crick.gain.setTargetAtTime(cr, t, cr < T.crick ? 0.12 : 2.5);
      T.crick = cr;
      N.tin.gain.setTargetAtTime(
        0.003 * clamp(warn * 1.4 - 0.15, 0, 1) + 0.004 * clamp((stress - 90) / 10, 0, 1),
        t,
        1.5,
      );
      N.sub.gain.setTargetAtTime(0.11 * clamp(warn * 1.2, 0, 1) + 0.05 * danger, t, 2);
      N.clG.gain.setTargetAtTime(0.1 * Math.pow(danger, 1.3), t, danger > T.dg ? 0.25 : 1.4);
      T.dg = danger;
      const fk = clamp(dread * 1.3 - 0.2, 0, 1);
      N.fac.aliens.gain.setTargetAtTime(s.faction === 'aliens' ? fk * 0.008 : 0, t, 1.5);
      N.fac.lizards.gain.setTargetAtTime(s.faction === 'lizards' ? fk * 0.022 : 0, t, 1.5);
      N.fac.zombies.gain.setTargetAtTime(s.faction === 'zombies' ? fk * 0.22 : 0, t, 1.5);
      N.psy.gain.setTargetAtTime((s.psy || 0) * 0.005, t, 0.8);
      // the rooms: a flat is small and dry, the street at night throws your steps back, the drains go on for ever
      const out0 = space === 'out',
        vs = out0 ? 0.04 : space === 'home' ? 0.2 : space === 'cell' ? 0.24 : space === 'lair' ? 0.1 : 0.16,
        vl = out0
          ? 0.05 + night * 0.12
          : space === 'home'
            ? 0.015
            : space === 'cell'
              ? 0.18
              : space === 'lair'
                ? 0.42
                : 0.05;
      sendS.gain.setTargetAtTime(vs, t, 0.4);
      sendL.gain.setTargetAtTime(vl + warn * 0.06, t, 0.4);
      muff.frequency.setTargetAtTime(18000 * Math.pow(600 / 18000, clamp(s.muffle || 0, 0, 1)), t, 0.08);
      if (!s.town || s.still) return;
      // now and then: the town going about its day and night, and what a bad hour sounds like coming
      const h = s.hour || 0,
        dawn = h >= 5.5 && h < 8.5 ? 3 : 1;
      if (tick('bird', dt, day > 0.55 && hush > 0.55 && rain < 0.5, 5 / dawn, 16 / dawn))
        this.hx('bird', side(0.95), (out_ ? 0.55 : 0.1) * hush * rr(0.35, 1));
      if (tick('chime', dt, out_ && hush > 0.25 && night < 0.8, 10, 28)) this.chimes(s.look || 0, side(0.95));
      if (tick('dog', dt, night > 0.4, 35, 90)) {
        if (warn > 0.35) this.hx('howl', side(0.95), out_ ? 0.4 : 0.15);
        else if (hush > 0.6) this.hx('dog', side(0.95), (out_ ? 0.3 : 0.1) * rr(0.5, 1));
      }
      if (tick('owl', dt, out_ && night > 0.7 && hush > 0.5, 45, 120)) this.hx('owl', side(0.95), rr(0.2, 0.4));
      if (tick('thunder', dt, rain > 0.6, 25, 70)) this.hx('thunder', side(0.95) * 0.6, (out_ ? 1 : 0.55) * rain);
      if (tick('settle', dt * (1 + warn * 2), !out_ && space !== 'lair' && (night > 0.6 || warn > 0.3), 25, 70))
        this.hx('settle', side(0.95), rr(0.25, 0.6));
      if (tick('dread', dt * (0.5 + warn), warn > 0.25, 14, 34)) {
        const k = ar();
        if (k < 0.35) this.hx('metal', side(0.95), 0.5 + warn * 0.4);
        else if (k < 0.6) this.hx('swell', side(0.95) * 0.5, 0.5 + warn * 0.4);
        else if (k < 0.8) this.hx('knock', side(0.95), 0.12 + warn * 0.12);
        else if (warn > 0.6) this.hx('whisper', side(0.95), 0.15);
        else this.hx('settle', side(0.95), 0.5);
      }
      if (tick('pant', dt, stress > 90 && !s.muffle, 3.2, 4.6)) this.hx('breath', 0, 0.16);
    },
    // wind chimes on a porch somewhere: a cosy town's sound. When it turns, the notes go wrong and come slower
    chimes(look, pan) {
      if (!ctx) return;
      const ok = [523.3, 587.3, 659.3, 784, 880, 1046.5],
        bad = [523.3, 554.4, 740, 784, 830.6, 1108.7],
        n = 2 + Math.floor(ar() * 3);
      for (let k = 0, d = 0; k < n; k++, d += rr(0.25, 0.8) * (1 + look)) {
        const f = (ar() < look ? bad : ok)[Math.floor(ar() * 6)] * Math.pow(2, (rr(-1, 1) * look * 60) / 1200);
        this.note(f, clamp(pan + rr(-0.2, 0.2), -1, 1), 0.035 * rr(0.5, 1), 2.6 + look * 2, d);
      }
    },
    // one struck note: a bell's partials, the higher ones dying first
    note(f, pan = 0, vol = 0.05, len = 2.5, delay = 0) {
      if (!ctx) return;
      const t = now() + delay,
        o = out(pan);
      for (const [m, v, l] of [
        [1, 1, 1],
        [2.76, 0.35, 0.45],
        [5.4, 0.12, 0.2],
      ]) {
        const x = ctx.createOscillator(),
          g = ctx.createGain();
        x.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * v, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len * l);
        x.connect(g);
        g.connect(o);
        x.start(t);
        x.stop(t + len * l + 0.05);
      }
    },
    // a line said out loud: no words, only the shape of them, a cartoon murmur in the speaker's own voice.
    // pitch: their voice (Hz); odd: one of THEM, where the voice sits wrong in the throat
    voice(text, pan = 0, vol = 1, pitch = 160, odd = 0) {
      if (!ctx || vol < 0.03 || !text) return;
      const T0 = now() + 0.02,
        o = out(pan),
        shout = /!|[A-Z]{4}/.test(text),
        ask = /\?\W*$/.test(text),
        n = clamp(Math.round(text.length / 6), 1, 9),
        p0 = pitch * (shout ? 1.25 : 1) * (1 - odd * 0.25),
        src = ctx.createOscillator(),
        f1 = ctx.createBiquadFilter(),
        f2 = ctx.createBiquadFilter(),
        gv = ctx.createGain(),
        g2 = ctx.createGain();
      src.type = 'sawtooth';
      f1.type = f2.type = 'bandpass';
      f1.Q.value = 6;
      f2.Q.value = 9;
      g2.gain.value = 0.5;
      src.connect(f1);
      src.connect(f2);
      f1.connect(gv);
      f2.connect(g2);
      g2.connect(gv);
      gv.connect(o);
      gv.gain.setValueAtTime(0.0001, T0);
      const V = [
        [730, 1090],
        [270, 2290],
        [530, 1840],
        [570, 840],
        [300, 870],
        [660, 1700],
      ];
      const peak = 0.11 * vol * (shout ? 1.7 : 1);
      let t = T0;
      for (let k = 0; k < n; k++) {
        const len = rr(0.08, 0.15) * (shout ? 1.2 : 1),
          w = V[Math.floor(ar() * V.length)],
          last = k === n - 1,
          f = p0 * (last ? (ask ? 1.25 : 0.85) : rr(0.92, 1.1));
        src.frequency.setTargetAtTime(f, t, 0.02);
        f1.frequency.setTargetAtTime(w[0], t, 0.015);
        f2.frequency.setTargetAtTime(w[1], t, 0.015);
        gv.gain.setValueAtTime(0.0001, t);
        gv.gain.linearRampToValueAtTime(peak, t + 0.02);
        gv.gain.linearRampToValueAtTime(peak * 0.6, t + len * 0.7);
        gv.gain.linearRampToValueAtTime(0.0001, t + len);
        t += len + rr(0.015, 0.06) + (ar() < 0.15 ? 0.12 : 0);
      }
      if (odd) {
        // the voice wobbles where no voice does, and something under it says the same thing an octave down
        vib(src, 23, p0 * 0.06 * odd);
        const lo = ctx.createOscillator(),
          lg = ctx.createGain();
        lo.type = 'sine';
        lo.frequency.value = p0 / 2;
        lg.gain.value = 0.25 * odd;
        lo.connect(lg);
        lg.connect(gv);
        lo.start(T0);
        lo.stop(t + 0.1);
      }
      src.start(T0);
      src.stop(t + 0.1);
      function vib(x, rate, depth) {
        const l = ctx.createOscillator(),
          lg = ctx.createGain();
        l.frequency.value = rate;
        lg.gain.value = depth;
        l.connect(lg);
        lg.connect(x.frequency);
        l.start(T0);
        l.stop(t + 0.1);
      }
    },
    // the steady sounds of doing something: water running, a pan on the stove, the television. level 0 lets it go
    loop(kind, level, pan = 0) {
      if (!ctx) return;
      const L = this._loops || (this._loops = {});
      let l = L[kind];
      if (!l) {
        if (!(level > 0)) return;
        const g0 = ctx.createGain(),
          p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        g0.gain.value = 0;
        if (p) {
          g0.connect(p);
          p.connect(mix);
        } else g0.connect(mix);
        const src = (type, f, q, v) => {
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
          gg.connect(g0);
          s2.start(0, ar() * 1.5);
          return gg;
        };
        const wob = (param, rate, depth) => {
          const x = ctx.createOscillator(),
            xg = ctx.createGain();
          x.frequency.value = rate;
          xg.gain.value = depth;
          x.connect(xg);
          xg.connect(param);
          x.start();
        };
        if (kind === 'water') {
          src('bandpass', 1700, 0.5, 0.5);
          src('lowpass', 500, 0.8, 0.4);
        } else if (kind === 'shower') {
          src('highpass', 2500, 0.5, 0.35);
          src('bandpass', 900, 0.6, 0.4);
        } else if (kind === 'sizzle') {
          const c = src('highpass', 3800, 0.6, 0.35);
          wob(c.gain, 13, 0.2);
          wob(c.gain, 3.1, 0.12);
        } else if (kind === 'tv') {
          // voices in a box: a murmur that rises and falls, the tinny edge of a speaker
          const v1 = src('bandpass', 750, 2.2, 0.6),
            v2 = src('bandpass', 1600, 3, 0.25);
          wob(v1.gain, 4.3, 0.45);
          wob(v2.gain, 2.9, 0.2);
          src('highpass', 6000, 0.5, 0.02);
        }
        l = L[kind] = { g: g0, p };
      }
      const t = now();
      l.g.gain.setTargetAtTime(Math.max(0, level || 0) * 0.08, t, 0.15);
      if (l.p) l.p.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.1);
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
          setTimeout(() => ctx && noise(0.15, 0.06, 0.5, rr(1800, 3200), 6, rr(-0.9, 0.9)), k * 260);
      } else if (kind === 'murmur') {
        // the crowd: low voices all round, nobody saying anything you can catch
        for (let k = 0; k < 6; k++)
          setTimeout(() => ctx && noise(0.18, 0.035, 0.7, rr(320, 720), 3, rr(-0.9, 0.9)), k * 110);
      } else if (kind === 'gasp') {
        for (let k = 0; k < 4; k++)
          setTimeout(() => ctx && noise(0.02, 0.07, 0.4, rr(1300, 2100), 1.6, rr(-0.8, 0.8)), k * 45);
      } else if (kind === 'crowdlaugh') {
        for (let k = 0; k < 5; k++)
          setTimeout(() => ctx && tone('triangle', rr(240, 330), 0.01, 0.045, 0.14, rr(200, 260)), k * 130);
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
      } else if (kind === 'click') {
        // the next card turned over
        tone('triangle', 1900, 0.002, 0.04, 0.05, 1500);
        noise(0.002, 0.05, 0.08, 2600, 2);
      } else if (kind === 'slip') {
        // a wet click: the mask, slipping
        tone('sine', 1500, 0.002, 0.08, 0.07, 260);
        noise(0.002, 0.06, 0.09, 3200, 4);
      } else if (kind === 'riser') {
        // a staged photo lining up (gfx/vf-stage): a low drone climbing, a breath of air, the heart going faster
        tone('sawtooth', 49, 1.3, 0.045, 0.45, 98);
        tone('sawtooth', 49.6, 1.3, 0.035, 0.45, 104);
        tone('sine', 98, 1.2, 0.05, 0.5, 196);
        noise(1.1, 0.05, 0.5, 520, 0.9);
        for (const at of [0, 0.5, 0.88, 1.17, 1.38]) {
          setTimeout(() => ctx && tone('sine', 62, 0.004, 0.32, 0.16, 36), at * 1000);
          setTimeout(() => ctx && tone('sine', 54, 0.004, 0.2, 0.14, 34), at * 1000 + 130);
        }
      } else if (kind === 'scream') {
        // the screamer: it turns on the lens. A shriek tearing upward, a burst of hiss, a hit you feel in the chest
        tone('sawtooth', 1150, 0.004, 0.13, 0.75, 2500);
        tone('sawtooth', 1190, 0.004, 0.1, 0.7, 2330);
        tone('square', 760, 0.004, 0.07, 0.6, 1680);
        noise(0.002, 0.42, 0.85, 2300, 0.6);
        noise(0.002, 0.3, 0.5, 700, 0.8);
        tone('sine', 52, 0.002, 0.65, 0.7, 28);
        setTimeout(() => ctx && noise(0.01, 0.12, 1.4, 3800, 5), 420); // and the ringing after
      }
    },
    // the horror layer's sounds: all synthesised, all for the ears only
    hx(kind, pan = 0, vol = 1, v = 0) {
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
        s.start(T0, ar());
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
      // a short burst at T0 + d, of filtered noise (nb) or of a tone (ob): what most of the foley is made of
      const nb = (d, ft, f, q, peak, a, dec, f1) => {
        const t = T0 + d,
          s2 = ctx.createBufferSource(),
          b = ctx.createBiquadFilter(),
          gg = ctx.createGain();
        s2.buffer = noiseBuf;
        s2.loop = true;
        b.type = ft;
        b.frequency.setValueAtTime(f, t);
        if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + a + dec);
        b.Q.value = q;
        gg.gain.setValueAtTime(0.0001, t);
        gg.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + a);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
        s2.connect(b);
        b.connect(gg);
        gg.connect(o);
        s2.start(t, ar() * 1.5);
        s2.stop(t + a + dec + 0.05);
      };
      const ob = (d, type, f, f1, peak, a, dec, dest) => {
        const t = T0 + d,
          x = ctx.createOscillator(),
          gg = ctx.createGain();
        x.type = type;
        x.frequency.setValueAtTime(f, t);
        if (f1) x.frequency.exponentialRampToValueAtTime(f1, t + a + dec);
        gg.gain.setValueAtTime(0.0001, t);
        gg.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + a);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
        x.connect(gg);
        gg.connect(dest || o);
        x.start(t);
        x.stop(t + a + dec + 0.05);
        return x;
      };
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
            vib(x, 9 + ar() * 4, f * 0.01);
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
            vib(x, 11 + ar() * 3, f * 0.012);
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
              b.frequency.value = rr(1800, 3400);
              b.Q.value = 7;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.055 * vol, t + 0.12);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
              s.connect(b);
              b.connect(gg);
              gg.connect(out(clamp(pan + rr(-0.4, 0.4), -1, 1)));
              s.start(t, ar());
              s.stop(t + 0.6);
            });
          break;
        case 'skitter':
          for (let k = 0, d = 0; k < 14; k++, d += rr(0.035, 0.07))
            blip(d, (t) => {
              const s = ctx.createBufferSource();
              s.buffer = noiseBuf;
              const b = ctx.createBiquadFilter();
              b.type = 'bandpass';
              b.frequency.value = rr(3000, 5200);
              b.Q.value = 5;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.003);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
              s.connect(b);
              b.connect(gg);
              gg.connect(o);
              s.start(t, ar());
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
            vib(x, 4.5 + ar(), 1.6);
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
            blip(k * rr(0.06, 0.12), (t) => {
              const x = ctx.createOscillator();
              x.type = 'square';
              x.frequency.setValueAtTime(rr(1800, 3800), t);
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
              s2.start(t, ar());
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
            blip(k * rr(0.01, 0.05), (t) => {
              const x = ctx.createOscillator();
              x.type = 'sine';
              x.frequency.setValueAtTime(rr(2400, 6800), t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.06 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + rr(0.1, 0.5));
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
            s2.start(t, ar());
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
              s2.start(t, ar());
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
              s2.start(t, ar());
              s2.stop(t + 0.15);
            });
          break;
        case 'coins':
          for (let k = 0; k < 12; k++)
            blip(k * rr(0.025, 0.07), (t) => {
              const x = ctx.createOscillator();
              x.type = 'triangle';
              x.frequency.setValueAtTime(rr(3200, 5600), t);
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(0.045 * vol, t + 0.002);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + rr(0.12, 0.35));
              x.connect(gg);
              gg.connect(o);
              x.start(t);
              x.stop(t + 0.4);
            });
          break;
        case 'drip':
          osc('sine', rr(900, 1400), g(0.06, 0.002, 0.18), 0.2, 2200);
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
              gg.connect(head);
              x.start(t);
              x.stop(t + 0.25);
            });
          break;
        case 'shot': {
          // a pistol in the street: the crack, the thump under it, and the houses throwing it back
          nz(filt('highpass', 1800, 0.7, g(0.7, 0.001, 0.07)), 0.1);
          nz(filt('lowpass', 900, 0.8, g(0.55, 0.002, 0.22)), 0.3);
          osc('sine', 120, g(0.5, 0.002, 0.18), 0.2, 42);
          for (const [d, k] of [
            [0.16, 0.22],
            [0.34, 0.1],
          ])
            blip(d, (t) => {
              const s2 = ctx.createBufferSource();
              s2.buffer = noiseBuf;
              const f = ctx.createBiquadFilter();
              f.type = 'bandpass';
              f.frequency.value = 700;
              f.Q.value = 0.6;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(0.0001, t);
              gg.gain.exponentialRampToValueAtTime(k * vol, t + 0.01);
              gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
              s2.connect(f);
              f.connect(gg);
              gg.connect(o);
              s2.start(t, ar());
              s2.stop(t + 0.35);
            });
          break;
        }
        case 'ringing':
          // the ears after it: one high note, going away
          osc('sine', 4100, g(0.05, 0.05, 3.6, head), 3.8, 3900);
          osc('sine', 4170, g(0.025, 0.05, 3.2, head), 3.4, 3990);
          break;
        // ── foley: the body and the things it touches (audio/foley picks them). v: the variant
        case 'step': {
          // a footfall; v is what it lands on
          const f = rr(0.88, 1.14);
          if (v === 'wood') {
            nb(0, 'lowpass', 520 * f, 1, 0.5, 0.003, 0.07);
            ob(0, 'sine', 110 * f, 60, 0.3, 0.003, 0.07);
            if (ar() < 0.07) nb(0.02, 'bandpass', 900 * f, 10, 0.1, 0.04, 0.2, 1250); // a board gives
          } else if (v === 'tile') {
            nb(0, 'bandpass', 2300 * f, 1.4, 0.3, 0.001, 0.035);
            nb(0, 'lowpass', 420, 1, 0.32, 0.003, 0.05);
          } else if (v === 'wet') {
            nb(0, 'bandpass', 1500 * f, 0.9, 0.32, 0.004, 0.12, 2600);
            nb(0, 'lowpass', 450, 1, 0.3, 0.003, 0.06);
          } else if (v === 'metal') {
            nb(0, 'bandpass', 2700 * f, 9, 0.3, 0.001, 0.22);
            ob(0, 'sine', 140 * f, 80, 0.28, 0.002, 0.08);
          } else if (v === 'mud') {
            nb(0, 'lowpass', 380 * f, 2, 0.5, 0.01, 0.13);
            nb(0.03, 'bandpass', 900, 3, 0.12, 0.02, 0.1);
          } else if (v === 'heavy') {
            // something too heavy for the shape it has on
            ob(0, 'sine', 68 * f, 32, 0.7, 0.004, 0.22);
            nb(0, 'lowpass', 300, 1, 0.5, 0.004, 0.16);
          } else if (v === 'claw') {
            ob(0, 'sine', 90 * f, 50, 0.4, 0.003, 0.1);
            nb(0.015, 'bandpass', 3600, 5, 0.3, 0.001, 0.02);
            nb(0.045, 'bandpass', 3300, 5, 0.22, 0.001, 0.02);
          } else if (v === 'drag') {
            nb(0, 'bandpass', 700 * f, 1.5, 0.32, 0.06, 0.38, 430);
            ob(0, 'sine', 80, 45, 0.25, 0.004, 0.1);
          } else {
            nb(0, 'bandpass', 1250 * f, 0.8, 0.3, 0.002, 0.05);
            nb(0, 'lowpass', 380, 1, 0.3, 0.003, 0.05);
          }
          break;
        }
        case 'door1': {
          // a door opening: the latch, the air, and (the later it is, the worse) the hinge
          nb(0, 'bandpass', 2600, 4, 0.16, 0.001, 0.03);
          nb(0.03, 'bandpass', 650, 0.8, 0.07, 0.06, 0.25);
          if (ar() < 0.35 + v * 0.6) {
            const len = 0.25 + v * 0.9 + ar() * 0.3,
              x = ob(
                0.05,
                'sawtooth',
                rr(150, 210),
                rr(230, 330),
                0.05 + v * 0.05,
                len * 0.4,
                len * 0.6,
                filt('bandpass', 1100, 7, o),
              );
            vib(x, rr(14, 26), 25);
          }
          break;
        }
        case 'door0':
          // shut: the slab, the frame, the latch
          ob(0, 'sine', 95, 55, 0.3, 0.003, 0.16);
          nb(0, 'lowpass', 800, 1, 0.3, 0.002, 0.08);
          nb(0.03, 'bandpass', 2800, 5, 0.14, 0.001, 0.03);
          break;
        case 'seat':
          // sitting down or getting up: v 0 a wooden chair, 1 springs and cushions
          nb(0, 'lowpass', 500, 1, 0.22, 0.01, 0.12);
          if (v) {
            nb(0, 'bandpass', 1500, 1, 0.12, 0.05, 0.25);
            for (let k = 0; k < 3; k++) ob(k * 0.06, 'sine', rr(700, 950), rr(480, 650), 0.02, 0.004, 0.16);
          } else {
            const x = ob(0.02, 'sawtooth', rr(170, 240), rr(130, 190), 0.05, 0.05, 0.22, filt('bandpass', 800, 8, o));
            vib(x, rr(18, 30), 18);
          }
          break;
        case 'key':
          nb(0, 'bandpass', rr(2500, 4200), 3, 0.3, 0.001, 0.02);
          nb(0.008, 'lowpass', 900, 1, 0.15, 0.001, 0.03);
          break;
        case 'gulp':
          ob(0, 'sine', rr(220, 300), rr(500, 650), 0.13, 0.01, 0.09);
          nb(0, 'lowpass', 600, 2, 0.09, 0.01, 0.1);
          ob(0.18, 'sine', rr(180, 240), rr(380, 460), 0.07, 0.01, 0.08);
          break;
        case 'flush':
          nb(0, 'bandpass', 1500, 3, 0.18, 0.001, 0.05); // the handle
          nb(0.08, 'bandpass', 1800, 0.6, 0.22, 0.25, 2.2, 600);
          nb(0.1, 'lowpass', 500, 1, 0.3, 0.4, 2.4);
          for (let k = 0; k < 6; k++)
            ob(1.2 + k * rr(0.15, 0.3), 'sine', rr(300, 500), rr(700, 1100), 0.04, 0.01, 0.06);
          break;
        case 'page':
          nb(0, 'highpass', 2500, 0.7, 0.12, 0.02, 0.15);
          nb(0.07, 'bandpass', 4000, 1, 0.08, 0.01, 0.1);
          break;
        case 'rustle':
          // hands going through things: cloth, card, a tin knocked
          for (let k = 0, d = 0; k < 5; k++, d += rr(0.05, 0.14))
            nb(d, 'bandpass', rr(1600, 3600), rr(1, 2.5), rr(0.08, 0.18), 0.01, rr(0.04, 0.12));
          if (ar() < 0.3) ob(rr(0.1, 0.4), 'sine', rr(1800, 2600), null, 0.03, 0.001, 0.25);
          break;
        case 'clank':
          // a fridge door, a vending machine, a mailbox lid, a radiator: something metal and hollow
          nb(0, 'bandpass', rr(900, 1400), 6, 0.22, 0.001, 0.25);
          ob(0, 'sine', rr(300, 420), null, 0.1, 0.001, 0.35);
          ob(0, 'sine', 90, 50, 0.25, 0.003, 0.15);
          break;
        case 'pour':
          // the note goes up as the cup fills
          nb(0, 'bandpass', rr(900, 1100), 3, 0.14, 0.1, 1.6, 2300);
          nb(0, 'lowpass', 700, 1, 0.08, 0.1, 1.4);
          break;
        case 'flick':
          nb(0, 'bandpass', 3500, 4, 0.28, 0.001, 0.015);
          nb(0.05, 'bandpass', 2800, 4, 0.18, 0.001, 0.015);
          break;
        case 'paper':
          // into the book: pencil on paper, the card slid in
          for (let k = 0; k < 3; k++) nb(k * 0.11, 'bandpass', rr(4200, 5600), 2, 0.07, 0.01, 0.07, rr(3600, 6400));
          nb(0.36, 'highpass', 2200, 0.7, 0.1, 0.03, 0.2);
          break;
        case 'whir':
          osc('sawtooth', 180, filt('bandpass', 900, 3, g(0.035, 0.2, 2.2)), 2.4, 260);
          for (let k = 0; k < 4; k++) nb(0.3 + k * 0.5, 'bandpass', 2400, 4, 0.1, 0.001, 0.03);
          break;
        case 'dial':
          for (let k = 0, d = 0; k < 7; k++, d += rr(0.12, 0.3)) {
            ob(d, 'sine', 941, null, 0.04, 0.003, 0.09);
            ob(d, 'sine', rr(1200, 1480), null, 0.04, 0.003, 0.09);
          }
          break;
        case 'scrape':
          nb(0, 'bandpass', rr(700, 1100), 2, 0.28, 0.04, 0.3, rr(1500, 2000));
          ob(0, 'sine', 85, 50, 0.2, 0.004, 0.1);
          break;
        case 'swing':
          nb(0, 'bandpass', 600, 1.2, 0.22, 0.07, 0.12, 1800);
          break;
        case 'punch':
          // knuckles on a body: the slap, the thump in the chest
          ob(0, 'sine', rr(90, 120), 45, 0.55, 0.002, 0.12);
          nb(0, 'bandpass', rr(1200, 1800), 1, 0.4, 0.001, 0.05);
          nb(0.004, 'lowpass', 500, 1, 0.32, 0.002, 0.1);
          break;
        case 'hurt':
          // it's you that got hit: from the inside, a dull blow and the blood in your ears
          ob(0, 'sine', 80, 38, 0.6, 0.003, 0.32, head);
          nb(0, 'lowpass', 420, 1, 0.45, 0.002, 0.2);
          break;
        // ── the town's air (sound.update fires these)
        case 'bird':
          for (let k = 0, d = 0, f = rr(2400, 3800), n = 2 + Math.floor(ar() * 4); k < n; k++, d += rr(0.06, 0.15)) {
            const x = ob(d, 'sine', f * rr(0.9, 1.1), f * rr(1.15, 1.6), 0.06, 0.005, rr(0.04, 0.1));
            vib(x, rr(30, 60), f * 0.03);
          }
          break;
        case 'dog':
          for (let k = 0, n = 2 + Math.floor(ar() * 2); k < n; k++) {
            const d = k * rr(0.28, 0.4);
            ob(
              d,
              'sawtooth',
              rr(420, 520),
              rr(250, 300),
              0.1,
              0.008,
              0.13,
              filt('bandpass', 1000, 1.5, filt('lowpass', 1800, 0.7, o)),
            );
            nb(d, 'bandpass', 1500, 1, 0.06, 0.005, 0.08);
          }
          break;
        case 'howl': {
          // a dog that knows before you do
          const x = osc('sawtooth', 380, filt('bandpass', 900, 3, g(0.09, 0.6, 2.8)), 3.4);
          x.frequency.cancelScheduledValues(T0);
          x.frequency.setValueAtTime(380, T0);
          x.frequency.linearRampToValueAtTime(620, T0 + 0.8);
          x.frequency.linearRampToValueAtTime(560, T0 + 2.0);
          x.frequency.exponentialRampToValueAtTime(400, T0 + 3.3);
          vib(x, 5, 8);
          break;
        }
        case 'owl':
          ob(0, 'sine', 390, 360, 0.06, 0.04, 0.3);
          ob(0.45, 'sine', 400, 350, 0.04, 0.03, 0.2);
          ob(0.72, 'sine', 395, 345, 0.06, 0.05, 0.5);
          break;
        case 'thunder':
          if (ar() < 0.4) nb(0, 'bandpass', 1600, 0.5, 0.3, 0.01, 0.7);
          nb(0, 'lowpass', rr(220, 420), 0.7, 0.55, rr(0.05, 0.6), rr(3, 5.5), 70);
          nb(rr(0.6, 1.6), 'lowpass', 150, 1, 0.4, 0.5, 2.6);
          break;
        case 'bell':
          // the town clock: v strokes, each one hanging in the air
          for (let k = 0; k < (v || 1); k++)
            for (const [m, a, dec] of [
              [0.5, 0.1, 5],
              [1, 0.13, 4],
              [2, 0.055, 2.6],
              [2.4, 0.05, 2.2],
              [3, 0.03, 1.6],
              [4.2, 0.02, 1],
            ])
              ob(k * 2.6, 'sine', 196 * m * (m === 0.5 ? 1.003 : 1), null, a, 0.004, dec);
          break;
        case 'metal': {
          // far off, a long piece of metal scraped slowly: you never find out what
          const f = rr(280, 360),
            x = ob(0, 'sawtooth', f, f * rr(0.93, 1.07), 0.08, 1.2, 1.7, filt('bandpass', rr(900, 1400), 14, o));
          vib(x, 0.7, 6);
          ob(0.3, 'sine', f * 2.71, f * 2.6, 0.012, 1, 1.5);
          break;
        }
        case 'swell': {
          // a breath drawn backwards: rising out of nothing and cut off dead
          const s2 = ctx.createBufferSource(),
            b = filt('highpass', 1400, 0.7, o),
            gg = ctx.createGain();
          s2.buffer = noiseBuf;
          s2.loop = true;
          gg.gain.setValueAtTime(0.0001, T0);
          gg.gain.exponentialRampToValueAtTime(0.16 * vol, T0 + 2.4);
          gg.gain.linearRampToValueAtTime(0.0001, T0 + 2.45);
          b.frequency.exponentialRampToValueAtTime(4200, T0 + 2.4);
          s2.connect(gg);
          gg.connect(b);
          s2.start(T0, ar());
          s2.stop(T0 + 2.6);
          ob(0, 'sine', 180, 420, 0.03, 2.3, 0.05);
          break;
        }
        case 'settle': {
          // the house settling, a board in the next room taking someone's weight
          const x = ob(
            0,
            'sawtooth',
            rr(90, 140),
            rr(110, 170),
            0.014,
            0.15,
            rr(0.3, 0.8),
            filt('bandpass', rr(500, 800), 10, o),
          );
          vib(x, rr(8, 20), 12);
          if (ar() < 0.5) nb(rr(0.3, 0.9), 'lowpass', 600, 1, 0.12, 0.003, 0.06);
          break;
        }
      }
    },
    // THEIR places' own air: a drone in the craft, running water in the drains, flies and something breathing in the nest
    amb(kind, level = 1) {
      if (!ctx) return;
      const A = this._amb || (this._amb = {});
      const mk = (k) => {
        const g0 = ctx.createGain();
        g0.gain.value = 0;
        g0.connect(mix);
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
      if (kind === 'sewer' && level > 0.2 && ar() < 0.012) this.hx('drip', rr(-0.8, 0.8), 0.7);
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
      else if (kind === 'shutterGlass') {
        noise(0.001, 0.13, 0.06, 2200, 1.4); // the lens against the glass: a hushed click, and the pane's faint tick
        tone('sine', 2900, 0.002, 0.01, 0.16);
      }
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
