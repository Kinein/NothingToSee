//@ taken/down-there — Down there, half awake
//@ Defines: lairCast, capDown, capShot, CAP_DOWN, capBought, flyGlints, lairGoldFx
//@ Uses:    taken/taken, core/util, horror/layer, audio/sound, gfx/renderer, world/grid, sim/core, world/objects, taken/coming, world/light-map, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── down there: half awake, between the hours
// the people and things that live in each place while you're there (drawn only then): who floats in the tanks, who lies in the nest
function lairCast(k) {
  const L = LAIRS[k], out = { k };
  if (k === 'ship') {
    const v = capVictim('taken');
    out.tanks = L.at('k').map(([x, z], i) => ({ x: x + 0.5, z: z + 0.5, what: ['deer', 'dog', 'person', 'person', 'empty', 'mass'][i] || 'empty', look: i === 2 ? v.look : i === 3 ? hxLook() : null, name: i === 2 ? v.name : null, n: i === 2 ? v.n : null, ph: i * 1.7 }));
  } else if (k === 'den') {
    const vs = (G.victims || []).filter((id) => NPC[id] && NPC[id].gone === 'killed').map((id) => NPC[id]);
    out.bodies = L.at('B').map(([x, z], i) => { const n = vs[i]; return { x: x + 0.5, z: z + 0.5, look: n ? n.look : hxLook(), name: n ? n.short : null, n: n || null, dir: hash2(x, z, 3) * TAU }; });
  }
  return out;
}
// the down-there part when you don't get away: three glimpses, and the hours between them
function capDown(short) {
  const fac = CAP.fac, k = CAP.lair, total = (CAP.how === 'beaten' ? irand(380, 520) : irand(270, 400)) + (short ? 60 : 0);
  const G1 = Math.round(total * 0.35), G2 = Math.round(total * 0.3), G3 = total - G1 - G2;
  const shots = CAP_DOWN[fac];
  CAP.lost = total;
  if (short) return [capBlack(0.5, () => capEnterLair(k)), shots.a(true), capHours(total * 0.6, 2.2), shots.c(), capHours(total * 0.4, 1.8)];
  return [capBlack(0.9, () => capEnterLair(k)), shots.a(), capHours(G1, 2.4), shots.b(), capHours(G2, 2.2), shots.c(), capHours(G3, 2.0)];
}
function capShot(name, secs, o) {
  return Object.assign({ name, done: {}, skip() { this.t = Math.max(this.t, secs - 0.6); capFx({ fade: 1 }, { fade: 4 }); },
    end() { if (o.cleanup !== false) { for (const a of CAP.actors.slice()) capKill(a); CAP.decals.length = 0; } },
  }, o, { start() { capFxNow({ washK: 0 }); if (o.start) o.start.call(this); }, step(dt, t) { const r = o.step.call(this, dt, t); if (t > secs - 0.7) capFx({ fade: 1 }, { fade: 2.6 }); if (t > secs || r === false) return false; } });
}
const CAP_DOWN = {
  aliens: {
    // the table: the lamp, three of them, the needle coming down toward your temple
    a: (short) => capShot('table', short ? 6 : 7.5, {
      start() {
        CAP.cast = lairCast('ship');
        const T = OBJ_BY_ID.lxTable, tx = T.cx, tz = T.cz;
        this.temple = [tx + 0.09, 0.99, tz - 0.68];
        this.you = capYou(tx, tz + 0.85, { dir: 0, pose: 'lie', y: 0.38 });
        this.you.poseFn = (T2, a) => {
          T2.uaL = T2.uaR = 0.05; T2.aoL = T2.aoR = 0.12;
          const c = capSeg(this.t, 3.75, 3.9) * (1 - capSeg(this.t, 4.9, 5.6));
          T2.roll = Math.sin(a.animT * 41) * 0.06 * c; T2.hp = -0.1 + Math.sin(a.animT * 33) * 0.2 * c; T2.hy = 0.35 * (1 - c);
          T2.faL = T2.faR = -0.1 - c * (0.6 + Math.sin(a.animT * 29) * 0.3); a.fx.gape = c; a.fx.eye = c > 0.1 ? [0.95, 0.95, 0.92] : null;
        };
        // three of them: the one with the needle at your head, one with a hand on your arm, one at your feet, watching
        this.gs = [[tx + 1.3, tz - 0.42, -Math.PI / 2], [tx - 0.95, tz - 0.1, Math.PI / 2], [tx + 0.05, tz + 1.7, Math.PI]].map(([x, z, d]) => capActor('grey', x, z, { dir: d }));
        // it lifts the needle over your face, holds it there, and brings it down
        this.gs[0].poseFn = (T2) => { const up = capSeg(this.t, 1.2, 2.2), dn = capSeg(this.t, 2.8, 3.8); T2.float = 0.08; T2.torso += 0.2; T2.uaR = -1.5 * up + 0.5 * dn; T2.faR = -0.6 * up - 0.2 * dn; T2.aoR = 0.12; T2.hp = 0.5; T2.hr = 0.15; };
        this.gs[1].poseFn = (T2) => { T2.torso += 0.3; T2.hp = 0.5; T2.uaL = -0.95; T2.faL = -0.7; T2.aoL = 0.1; };
        this.gs[2].poseFn = (T2, a) => { T2.hp = 0.3; T2.hy = Math.sin(a.animT * 0.7) * 0.35; };
        capEye(tx, tz, 6); capCut(tx - 0.3, tz - 0.2, 2.35, 0.45);
        capFxNow({ fade: 1, lid: 1, daze: 0.7, washK: 0 }); capFx({ fade: 0, lid: 0.3, daze: 0.45, letter: 1 }, { fade: 1.2, lid: 0.8, daze: 1 });
      },
      step(dt, t) {
        const T = OBJ_BY_ID.lxTable;
        if (t > 0.8) capOnce(this, 'click', () => audio.hx('click', 0, 0.8));
        if (t > 2.8) capOnce(this, 'probe', () => audio.hx('probe', 0, 1));
        if (t > 3.8) capOnce(this, 'hit', () => { R.flash = Math.max(R.flash, 0.4); HX.jolt = 0.9; HX.shake = 0.5; audio.hx('sting', 0, 0.7); capFx({ lid: 0.62, daze: 0.75 }, { lid: 4 }); });
        if (t > 4.6) capFx({ lid: 0.3, daze: 0.45 }, { lid: 1 });
        const k = capSeg(t, 0, 7.5);
        capCam(T.cx - 0.3 + k * 0.1, T.cz - 0.2 - k * 0.3, 2.35 - k * 0.4, 0.45 + k * 0.12, 1);
      },
      fx(dtR, t) {
        // the needle: a thread of light from its fingers that grows until it reaches your head
        const p = greyPts(this.gs[0]), up = capSeg(t, 1.2, 2.2), dn = capSeg(t, 2.8, 3.8), h = p.tipR, tp = this.temple;
        const dx = tp[0] - h[0], dy = tp[1] - h[1], dz = tp[2] - h[2], d = Math.hypot(dx, dy, dz) || 1, L = lerp(0.12, Math.max(0.12, d - 0.01), dn);
        const tip = [h[0] + (dx / d) * L, h[1] + (dy / d) * L, h[2] + (dz / d) * L];
        this.needle = { a: h, b: tip, k: up };
        CAP.glow.push({ x: tip[0], y: tip[1], z: tip[2], size: 0.1 + dn * 0.1, col: [0.6, 1, 0.9], a: up * (0.6 + 0.4 * dn) });
        for (let i = 1; i < 4; i++) { const f = i / 4; CAP.glow.push({ x: lerp(h[0], tip[0], f), y: lerp(h[1], tip[1], f), z: lerp(h[2], tip[2], f), size: 0.06, col: [0.5, 1, 0.85], a: up * 0.35 }); }
        if (dn > 0.95) hxLight(tp[0], tp[1] + 0.25, tp[2], 1.1, [0.22, 0.45, 0.36]);
        for (const g of this.gs) greyEyes(g, 0.3);
      },
    }),
    // the tanks: what they keep, and somebody you know in one of them
    b: () => capShot('tanks', 6, {
      start() {
        const tk = (CAP.cast.tanks || []).find((x) => x.what === 'person' && x.name) || CAP.cast.tanks[2];
        this.tk = tk;
        capEye(tk.x, tk.z + 2, 7); capCut(tk.x - 2.4, tk.z + 1.5, 2.7, -0.35);
        const g = capActor('grey', tk.x - 3.0, tk.z + 2.4, { dir: Math.PI / 2 }); this.g = g;
        capFxNow({ fade: 1, lid: 0.6, daze: 0.5 }); capFx({ fade: 0, lid: 0.28, daze: 0.3, letter: 1 }, { fade: 1.4, lid: 0.7 });
      },
      step(dt, t) {
        const tk = this.tk;
        capWalk(this.g, tk.x + 3.0, tk.z + 2.4, 0.9, dt);
        if (t > 1.6 && tk.n) capOnce(this, 'name', () => capPortrait(tk.n));
        const k = capSeg(t, 0, 6);
        capCam(tk.x - 2.4 + k * 2.6, tk.z + 1.3, 2.7 - k * 0.5, -0.35 + k * 0.4, 0.9);
      },
      fx() { greyEyes(this.g, 0.35); },
    }),
    // its eyes, close: it bends over you and looks up, straight at you. Something small goes in behind your ear.
    c: () => capShot('eyes', 5.5, {
      start() {
        const T = OBJ_BY_ID.lxTable, tx = T.cx, tz = T.cz, yaw = 0.9;
        this.you = capYou(tx, tz + 0.85, { dir: 0, pose: 'lie', y: 0.38 });
        this.you.poseFn = (T2) => { T2.hy = 0.55; T2.uaL = T2.uaR = 0.05; };
        const hx = tx - 0.05, hz = tz - 0.68, gx = hx - Math.sin(yaw) * 0.72, gz = hz - Math.cos(yaw) * 0.6;
        this.ear = [hx + 0.1, 0.98, hz - 0.08];
        this.g = capActor('grey', gx, gz, { dir: Math.atan2(hx - gx, hz - gz) });
        this.g.poseFn = (T2, a) => { const r = capSeg(this.t, 2.3, 3.0) * (1 - capSeg(this.t, 3.9, 4.5)); T2.rootY = -0.18; T2.thL = T2.thR = -0.45; T2.shL = T2.shR = 0.8; T2.torso += 0.75; T2.hp = -1.15 + Math.sin(a.animT * 0.8) * 0.06; T2.hr = 0.32 + Math.sin(a.animT * 0.9) * 0.12; T2.uaR = -0.9; T2.faR = -0.4; T2.aoR = 0.1; T2.uaL = -0.4 - 0.55 * r; T2.faL = -0.3 - 0.35 * r; T2.aoL = 0.1 - 0.25 * r; };
        this.cx = hx - 0.25 - Math.sin(yaw) * 0.55; this.cz = hz - 0.2 - Math.cos(yaw) * 0.55;
        capEye(tx, tz, 5); capCut(this.cx, this.cz, 1.6, yaw);
        capFxNow({ fade: 1, lid: 0.8, daze: 0.6 }); capFx({ fade: 0, lid: 0.3, daze: 0.3, letter: 1 }, { fade: 1.6, lid: 0.6 });
      },
      step(dt, t) {
        if (t > 3.1) capOnce(this, 'pinch', () => { audio.hx('click', 0, 1); R.pulse = 0.6; CAP.chip = true; HX.jolt = 0.4; const p = greyPts(this.g).tipL; this.ear = [lerp(p[0], this.ear[0], 0.5), Math.max(p[1], this.ear[1]) + 0.04, lerp(p[2], this.ear[2], 0.5)]; });
        if (t > 4.0) capFx({ washK: 0.9, wash: [0.85, 1, 0.93] }, { washK: 1.5 });
        capCam(this.cx, this.cz, 1.6 - capSeg(t, 0, 5.5) * 0.25, 0.9, 1);
      },
      fx(dtR, t) {
        greyEyes(this.g, 0.6);
        if (t > 3.1) { const k = 0.6 + 0.4 * Math.sin(R.time * 9); hxGlint(this.ear[0], this.ear[1], this.ear[2], 0.1, [1, 0.15, 0.1], k); hxLight(this.ear[0], this.ear[1] + 0.2, this.ear[2], 0.7, [0.5 * k, 0.04, 0.03]); }
      },
    }),
  },
  lizards: {
    // the offer: a man in a good suit across the counting table, an envelope, gold to the ceiling, and somebody you know by the wall
    a: (short) => capShot('offer', short ? 6.5 : 9, {
      start() {
        const tb = OBJ.find((o) => o.type === 'lx_ctable' && o.z < LAIR_Z0 + 8), tx = tb.cx, tz = tb.cz;
        this.tx = tx; this.tz = tz;
        this.you = capYou(tx, tz + 1.15, { dir: Math.PI, pose: 'sit', seatY: 0.47 }); this.you.poseFn = (T2, a) => CPOSE.bound(T2, a);
        this.chair = { x: tx, z: tz + 1.15, rot: Math.PI };
        this.boss = capActor('man', tx, tz - 1.05, { dir: 0, look: hxLook(SUIT) });
        this.boss.poseFn = (T2, a) => {
          const fx = a.fx; fx.half = { fac: 'lizards', parts: ['eye', 'snout'], k: 0.7 + 0.3 * Math.sin(a.animT * 0.8), side: 1 }; fx.eye = null;
          const push = capSeg(this.t, 2.2, 3.2) * (1 - capSeg(this.t, 4.4, 5.0));
          T2.torso = 0.25 * push; T2.uaR = -1.1 * push; T2.faR = -0.4 * push; if (push > 0.1) fx.prop = 'envelope';
          if (this.t > 5.2) { fx.tongue = Math.pow(Math.max(0, Math.sin(a.animT * 4)), 6) * 0.7; fx.tongueLen = 0.4; }
        };
        const b = capBought();
        this.bought = capActor('man', tx - 1.6, tz + 1.9, { dir: Math.PI * 0.8, look: b.look }); this.boughtName = b.name; this.boughtN = b.n;
        this.bought.poseFn = (T2) => { T2.hp = 0.45; T2.hy = 0.6; T2.uaL = T2.uaR = -0.15; };
        this.lz = [capActor('lizard', tx + 1.7, tz + 0.2, { dir: -Math.PI / 2 }), capActor('lizard', tx - 1.6, tz - 0.4, { dir: Math.PI / 2 })];
        capEye(tx, tz + 0.5, 6); capCut(tx + 0.3, tz + 0.9, 2.9, -0.3);
        capFxNow({ fade: 1, lid: 1, daze: 0.8 }); capFx({ fade: 0, lid: 0.35, daze: 0.55, letter: 1 }, { fade: 1.2, lid: 0.8 });
      },
      step(dt, t) {
        if (t > 1.4) capOnce(this, 'say', () => capSayAt(this.boss, 'Everyone has a price.', 2.8));
        if (t > 2.4) capOnce(this, 'coins', () => audio.hx('coins', 0, 0.8));
        if (t > 4.6 && this.boughtN) capOnce(this, 'bt', () => capPortrait(this.boughtN));
        capCam(this.tx + 0.3 - capSeg(t, 0, 9) * 0.6, this.tz + 0.9 - capSeg(t, 0, 9) * 0.3, 2.9 - capSeg(t, 0, 9) * 0.3, -0.3 + capSeg(t, 0, 9) * 0.25, 1);
      },
      fx(dtR) { lairGoldFx(this.tx, this.tz, 3); },
    }),
    // laughter: they find you very funny. One of them tastes you.
    b: () => capShot('laugh', 7, {
      start() {
        const tb = OBJ.find((o) => o.type === 'lx_ctable' && o.z < LAIR_Z0 + 8), tx = tb.cx, tz = tb.cz;
        this.tx = tx; this.tz = tz; this.chair = { x: tx, z: tz + 1.15, rot: Math.PI };
        this.you = capYou(tx, tz + 1.15, { dir: Math.PI, pose: 'sit', seatY: 0.47 });
        this.you.poseFn = (T2, a) => { CPOSE.bound(T2, a); T2.hp = 0.2 + Math.sin(a.animT * 1.3) * 0.15; a.fx.slime = capSeg(this.t, 3.6, 4.2); };
        this.lz = [capActor('lizard', tx + 0.9, tz + 1.5, { dir: -2.2 }), capActor('lizard', tx - 1.1, tz + 1.8, { dir: 2.0 }), capActor('lizard', tx + 0.2, tz - 0.6, { dir: 0 })];
        this.lz[0].poseFn = (T2, a) => { const k = capSeg(this.t, 2.6, 3.4) * (1 - capSeg(this.t, 4.6, 5.0)); T2.torso += 0.5 * k; T2.hp = 0.4 * k; a.fx.tongue = k; a.fx.tongueLen = 1.1; a.fx.tongueAim = 0.15; };
        for (const l of this.lz.slice(1)) l.poseFn = (T2, a) => { a.fx.frill = 0.5 + 0.5 * Math.sin(a.animT * 6); T2.hp = -0.2 + Math.sin(a.animT * 9) * 0.15; T2.torso = 0.3 + Math.sin(a.animT * 7) * 0.08; };
        capEye(tx, tz + 1, 6); capCut(tx - 0.2, tz + 1.4, 2.4, 0.35);
        capFxNow({ fade: 1, lid: 0.8, daze: 0.8 }); capFx({ fade: 0, lid: 0.4, daze: 0.6, letter: 1 }, { fade: 1.4, lid: 0.8 });
      },
      step(dt, t) {
        if (t > 0.9) capOnce(this, 'laugh1', () => audio.hx('laugh', -0.3, 1));
        if (t > 2.0) capOnce(this, 'laugh2', () => audio.hx('laugh', 0.4, 0.9));
        if (t > 1.6) capOnce(this, 'say', () => capSayAt(this.lz[1], 'Look at it. So brave.', 2.6));
        if (t > 3.4) capOnce(this, 'slurp', () => { audio.hx('slurp', 0, 1); HX.jolt = 0.6; });
        if (t > 4.8) capOnce(this, 'laugh3', () => audio.hx('laugh', 0, 1));
        capCam(this.tx - 0.2 + Math.sin(t * 0.7) * 0.15, this.tz + 1.4, 2.4 + Math.sin(t * 0.5) * 0.1, 0.35 + Math.sin(t * 0.6) * 0.1, 1);
      },
      fx(dtR) { lairGoldFx(this.tx, this.tz, 3); },
    }),
    // they carry you out along the channel, your heels in the water
    c: () => capShot('carry', 5.5, {
      start() {
        const [x0, z0] = LZ('sewer', 2, 12), [x1] = LZ('sewer', 9, 12);
        this.x0 = x0 + 0.5; this.x1 = x1 + 0.5; this.z = z0 + 0.45;
        this.you = capYou(this.x0, this.z, { dir: Math.PI / 2 }); this.you.poseFn = (T2) => { T2.pitch = -0.9; T2.rootY = 0.35; T2.hp = 0.6; T2.uaL = T2.uaR = -2.0; T2.thL = T2.thR = 0.4; };
        this.a1 = capActor('lizard', this.x0 + 0.6, this.z - 0.45, { dir: Math.PI / 2 }); this.a2 = capActor('lizard', this.x0 + 0.6, this.z + 0.45, { dir: Math.PI / 2 });
        capEye(this.x0 + 3, this.z, 8); capCut(this.x0 + 1, this.z + 0.6, 3.2, 0.2);
        capFxNow({ fade: 1, lid: 0.8, daze: 0.8 }); capFx({ fade: 0, lid: 0.45, daze: 0.65, letter: 1 }, { fade: 1.4, lid: 0.8 });
      },
      step(dt, t) {
        const x = this.x0 + t * 1.1;
        this.you.x = x; this.a1.x = x + 0.65; this.a2.x = x + 0.65;
        for (const a of [this.a1, this.a2]) { a.moving = true; a.walkPh += dt * 3.8; }
        if (t > 0.6) capOnce(this, 'drag', () => audio.hx('drag', 0, 0.8));
        if (t > 1.8) capOnce(this, 'splash', () => audio.hx('splash', 0, 0.7));
        capCam(x + 1, this.z + 0.6, 3.2, 0.2, 1.4);
      },
      fx(dtR, t) { const x = this.x0 + t * 1.1 + 1.2; DYN.push({ x: Math.floor(x), z: Math.floor(this.z), col: [1, 0.66, 0.3], int: 0.8, r: 4 }); hxLight(x, 1.3, this.z - 0.3, 3.2, [1, 0.6, 0.22]); },
    }),
  },
  zombies: {
    // the nest: they're eating, and it's you
    a: (short) => capShot('feed', short ? 6.5 : 8.5, {
      start() {
        CAP.cast = lairCast('den');
        const [nx, nz] = LAIRS.den.at('@')[0], x = nx + 0.5, z = nz + 0.5;
        this.x = x; this.z = z;
        this.you = capYou(x, z, { dir: Math.PI * 0.6 }); this.you.poseFn = (T2, a) => { CPOSE.limp(T2); T2.uaR = -1.2 + Math.sin(a.animT * 13) * 0.2 * capSeg(this.t, 2, 3); a.fx.gape = 0.4; };
        this.zs = [[x - 0.85, z - 0.2, Math.PI / 2], [x + 0.95, z + 0.35, -Math.PI / 2], [x + 0.1, z + 1.05, Math.PI]].map(([zx, zz, d]) => { const a = capActor('dead', zx, zz, { dir: d }); a.tell.feed = true; return a; });
        const t0 = R.time; CAP.decals.push({ x: x + 0.3, z: z + 0.2, r: () => 0.45 + clamp((R.time - t0) / 6, 0, 1) * 0.6, col: [0.24, 0.012, 0.016, 0.82], shape: 0 });
        capEye(x, z, 5); capCut(x - 0.4, z + 0.7, 2.5, -0.55);
        capFxNow({ fade: 1, lid: 1, daze: 0.8 }); capFx({ fade: 0, lid: 0.35, daze: 0.6, letter: 1, washK: 0.18, wash: [0.32, 0.02, 0.02] }, { fade: 1.2, lid: 0.8 });
      },
      step(dt, t) {
        this.bt = (this.bt || 0.6) - dt; if (this.bt <= 0) { this.bt = rand(0.35, 0.75); audio.hx(chance(0.5) ? 'bite' : 'chew', rand(-0.4, 0.4), 0.8); }
        if (t > 4.2) capOnce(this, 'sc', () => { HX.jolt = 0.6; audio.hx('scream', 0, 0.45); });
        capCam(this.x - 0.4 + capSeg(t, 0, 8) * 0.3, this.z + 0.7, 2.5 - capSeg(t, 0, 8) * 0.25, -0.55 + capSeg(t, 0, 8) * 0.2, 1);
      },
      fx() { flyGlints(this.x, this.z, 12); hxLight(this.x, 0.6, this.z + 1.2, 3.2, [0.6, 0.18, 0.06]); },
    }),
    // the others they brought down here
    b: () => capShot('others', 6.5, {
      start() {
        const bs = ((CAP.cast && CAP.cast.bodies) || []).slice().sort((a, b) => a.z - b.z);
        const named = bs.find((b) => b.name); this.named = named;
        // the row of them along the west wall, from the far end to whoever you knew
        const row = bs.filter((b) => b.x < LAIRS.den.x0 + 8);
        this.b1 = row[row.length - 1] || bs[0] || { x: 46, z: 46 }; this.b0 = named && row.includes(named) ? named : row[0] || this.b1;
        const zz = capActor('dead', this.b0.x + 1.3, this.b0.z - 0.6, { dir: -2.2 }); zz.poseFn = (T2) => { T2.torso += 0.6; T2.hp = 0.5; T2.uaL = T2.uaR = -0.9; }; zz.tell.feed = true; this.z = zz;
        capEye(this.b1.x, this.b1.z, 5); capCut(this.b1.x + 0.6, this.b1.z + 0.6, 2.6, -0.2);
        capFxNow({ fade: 1, lid: 0.8, daze: 0.6 }); capFx({ fade: 0, lid: 0.35, daze: 0.35, letter: 1, washK: 0.1, wash: [0.3, 0.02, 0.02] }, { fade: 1.4, lid: 0.8 });
      },
      step(dt, t) {
        const k = capSeg(t, 0.4, 5.6), x = lerp(this.b1.x + 0.6, this.b0.x + 0.7, k), z = lerp(this.b1.z + 0.6, this.b0.z + 0.2, k);
        capCam(x, z, 2.6 - k * 0.3, -0.2 + k * 0.3, 1.2);
        if (Math.hypot(x - CAP.eye[0], z - CAP.eye[1]) > 0.7) capEye(x, z, 5);
        if (t > 2.4 && this.named && this.named.n) capOnce(this, 'name', () => capPortrait(this.named.n));
        if (t > 1.0) capOnce(this, 'groan', () => audio.hx('groan', 0, 0.7));
        this.bt = (this.bt || 1.2) - dt; if (this.bt <= 0) { this.bt = rand(0.5, 0.9); audio.hx('chew', rand(-0.3, 0.3), 0.5); }
      },
      fx() { flyGlints(this.b0.x, this.b0.z, 8); flyGlints(this.b1.x, this.b1.z, 6); hxLight(cam.tx, 1.6, cam.tz, 3.2, [0.16, 0.17, 0.22]); },
    }),
    // one of them puts its face to yours, and smells you, and leaves you be. Not yet.
    c: () => capShot('sniff', 5.5, {
      start() {
        const [nx, nz] = LAIRS.den.at('@')[0], x = nx + 0.5, z = nz + 0.5;
        this.x = x; this.z = z;
        this.you = capYou(x, z, { dir: Math.PI * 0.6 }); this.you.poseFn = (T2) => CPOSE.limp(T2);
        this.zz = capActor('dead', x - 0.7, z - 0.6, { dir: 2.2 });
        this.zz.poseFn = (T2, a) => { const k = capSeg(this.t, 0.4, 1.6) * (1 - capSeg(this.t, 3.4, 4.2)); T2.torso += 0.9 * k; T2.hp = 0.7 * k; T2.rootY -= 0.3 * k; T2.uaL = T2.uaR = -0.6 * k; if (this.t > 3.4) a.tdir = -1.0; };
        capEye(x, z, 5); capCut(x - 0.5, z - 0.1, 1.8, 0.6);
        capFxNow({ fade: 1, lid: 0.8, daze: 0.7 }); capFx({ fade: 0, lid: 0.45, daze: 0.5, letter: 1, washK: 0.12, wash: [0.3, 0.02, 0.02] }, { fade: 1.4, lid: 0.8 });
      },
      step(dt, t) {
        if (t > 1.4) capOnce(this, 'sniff', () => audio.hx('breath', 0, 0.7));
        if (t > 3.6) capWalk(this.zz, this.x - 2.4, this.z - 1.6, 0.6, dt);
        capCam(this.x - 0.5, this.z - 0.1, 1.8 + capSeg(t, 0, 5.5) * 0.3, 0.6, 1);
      },
      fx() { flyGlints(this.x, this.z, 8); },
    }),
  },
};
// who THEY pay: a bought face if there is one, or someone ordinary who looks like they could be
function capBought() {
  const ids = Object.keys(G.bought || {}).filter((id) => NPC[id] && !NPC[id].isThem && !NPC[id].gone);
  const n = ids.length ? NPC[pick(ids)] : pick(suspects().filter((s) => !s.isThem && !s.gone && s.id !== 'lenny')) || null;
  return n ? { look: n.look, name: n.short, n } : { look: hxLook(), name: null, n: null };
}
function flyGlints(x, z, n) { for (let i = 0; i < n; i++) { const a = R.time * (1.4 + i * 0.37) + i * 2.1, r = 0.3 + (i % 4) * 0.25; hxGlint(x + Math.sin(a) * r, 0.5 + Math.sin(a * 1.6 + i) * 0.35, z + Math.cos(a * 1.1) * r, 0.035, [0.3, 0.32, 0.22], 0.55); } }
function lairGoldFx(x, z, r) {
  for (let i = 0; i < 9; i++) { const ph = (R.time * 0.6 + i * 0.37) % 1, h = hash2(i, Math.floor(R.time * 0.6 + i * 0.37), 7); const gx = x + (h - 0.5) * r * 2, gz = z + (hash2(i, 3, Math.floor(R.time * 0.6 + i * 0.37)) - 0.5) * r * 2; if (tget(Math.floor(gx), Math.floor(gz)) !== 'e' || !blockAt[I(Math.floor(gx), Math.floor(gz))]) continue; hxGlint(gx, 0.5 + h * 0.4, gz, 0.12, [1, 0.85, 0.45], Math.sin(ph * Math.PI) * 0.9); }
}

