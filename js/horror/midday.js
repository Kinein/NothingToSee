//@ horror/midday — Midday scenes
//@ Defines: hxNoonScene, hxAbduction, hxLick, hxFeeding
//@ Uses:    horror/layer, core/util, sim/core, gfx/renderer, town/cast, world/grid, them/plan
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── midday
function hxNoonScene() {
  const fac = hxFac();
  const u = Math.sign(Math.sin(cam.yaw)) || 1;
  const st = fac === 'aliens' ? hxStage(4.5, 12, true, 4.5, 2.5) : fac === 'lizards' ? hxStage(4, 11, true, 4.2, -0.9, u, true) || hxStage(4, 11, true, 4.2, -0.9, -u, true) : hxStage(4, 11, true, 4.6, -0.9, u) || hxStage(4, 11, true, 4.6, -0.9, -u);
  if (!st) {   // nowhere you can see: keep trying until a quarter to three, then it happens somewhere else and you only hear it
    if (tod() < 14.75 * 60) return false;
    const far = { x: rand(4, W - 4), z: chance(0.5) ? 13.5 : 18.5 };
    if (heardIt('far', far.x, far.z)) hxSound(fac === 'aliens' ? 'thrum' : 'scream', far.x, far.z, 0.5);
    return true;
  }
  HX.scene = fac === 'aliens' ? hxAbduction(st) : fac === 'lizards' ? hxLick(st) : hxFeeding(st);
  return true;
}

// the craft comes down over Main street and takes somebody. Nobody looks up.
function hxAbduction(st) {
  const S = [st.x, st.z], A = [st.x + st.side * 4.5, st.z];
  const v = hxActor(hxLook(), A[0], A[1], { menace: 0 });
  const cr = { x: S[0], y: 16, z: S[1], spin: 0, glow: 0, tilt: 0 };
  HX.crafts.push(cr);
  const T = { thrum: false, beam: false, scream: false, zip: false, drop: false, shadow: false };
  let t = 0, beamA = 0, lift = 0;
  return {
    step(dt) {
      t += dt;
      const seen = hxCinema(this, S[0], S[1], 0, t > 1.5 && t < 11 ? 3.2 : 0);
      cr.spin += dt * (0.6 + cr.glow * 1.8);
      if (t > 1.0 && !T.thrum) { T.thrum = true; hxSound('thrum', S[0], S[1], 1); }
      if (t > 1.1 && !T.shadow) { T.shadow = true; const t0 = R.time; hxDecal(S[0], S[1], () => clamp((R.time - t0) / 2.6, 0, 1) * 3.1, () => [0, 0, 0, 0.55 * clamp((16 - cr.y) / 8, 0, 1)], 0, 9999, { tag: 'ufo' }); }
      // the walk, the stop, the look up
      if (t < 2.7) hxWalk(v, S[0], S[1], 1.75, dt); else { v.moving = false; hxFace(v, S[0] - st.side, S[1] + 0.3); }
      if (t > 1.6) cr.y = t < 4.3 ? lerp(16, 4.4, sstep(1.6, 4.3, t)) : t < 10.3 ? 4.4 + Math.sin(t * 1.7) * 0.06 : lerp(4.4, 22, sstep(10.3, 12.8, t));
      if (t > 10.3) { cr.x = S[0] + sstep(10.3, 12.8, t) * 16 * st.side; cr.tilt = -0.25 * st.side * sstep(10.3, 11, t); }
      cr.glow = t < 4.2 ? sstep(3.0, 4.2, t) * 0.4 : t < 9.6 ? 1 : 1 - sstep(9.6, 10.4, t);
      // the beam
      beamA = t < 4.2 ? 0 : t < 4.5 ? sstep(4.2, 4.5, t) : t < 9.6 ? 1 : 1 - sstep(9.6, 10.2, t);
      if (t > 4.2 && !T.beam) { T.beam = true; hxSound('beam', S[0], S[1], 1); if (seen) { HX.jolt = 0.6; R.flash = Math.max(R.flash, 0.22); HX.shake = 0.6; } }
      if (beamA > 0.01) {
        const r = 1.35 * (t > 9.6 ? 1 - sstep(9.6, 10.2, t) * 0.8 : 1);
        HX.beams.push({ x: cr.x, y: cr.y - 0.3, z: cr.z, r, h: cr.y - 0.3, col: [0.42, 1, 0.74], a: beamA * 0.85 });
        hxLight(S[0], 1.2, S[1], 5.5, mul3([0.3, 1, 0.65], 1.5 * beamA));
        for (let i = 0; i < 18; i++) { const ph = (R.time * 0.32 + i / 18) % 1, a = i * 2.4; hxGlint(S[0] + Math.sin(a) * 0.9 * (1 - ph * 0.5), ph * (cr.y - 0.5), S[1] + Math.cos(a) * 0.9 * (1 - ph * 0.5), 0.14, [0.5, 1, 0.8], beamA * (1 - ph) * 0.6); }
        if (!T.ring) { T.ring = true; hxDecal(S[0], S[1], 1.4, () => [0.5, 1, 0.75, 0.6 * beamA], 3, 9999, { tag: 'ufo' }); }
      }
      if (cr.glow > 0.05) hxLight(cr.x, cr.y - 0.8, cr.z, 4, mul3([0.3, 1, 0.65], 0.6 * cr.glow));
      // the taking
      if (t > 4.5 && !T.drop) { T.drop = true; HX.props.push({ kind: 'bag', x: S[0] + 0.35, z: S[1] + 0.2, rot: rand(0, TAU), until: G.t + 180, col: pick([[0.24, 0.16, 0.1], [0.12, 0.13, 0.16], [0.4, 0.12, 0.1]]) }); }
      lift = t < 4.5 ? 0 : t < 6 ? sstep(4.5, 6, t) * 0.5 : t < 8.6 ? 0.5 + sstep(6, 8.6, t) * 1.8 : 2.3 + sstep(8.6, 9.6, t) * 1.7;
      v.y = lift;
      if (t > 9.6) v.hide = true;
      v.shadow = t > 4.5 ? 0.5 * (1 - sstep(4.5, 7, t)) : 0.5;
      if (t > 6.1 && !T.scream) { T.scream = true; hxSound('scream', S[0], S[1], 0.9); }
      if (t > 10.3 && !T.zip) { T.zip = true; hxSound('zip', S[0], S[1], 0.9); }
      if (t > 4.5) v.tdir += dt * (t < 8 ? 0.9 : 2.6);
      v.poseFn = (Tg, a) => {
        a.fx.big = t > 8.6 ? 1 - sstep(8.6, 9.6, t) * 0.75 : 0;
        if (t < 2.7) return;
        if (t < 4.5) { Tg.hp = -0.8; Tg.uaL = Tg.uaR = 0.08; a.fx.gape = sstep(3.6, 4.3, t) * 0.6; return; }
        const w = a.animT;
        if (t < 6.4) { Tg.uaL = -2.6 + Math.sin(w * 11) * 0.6; Tg.uaR = -2.4 + Math.sin(w * 13 + 1) * 0.7; Tg.faL = -0.4 + Math.sin(w * 9) * 0.4; Tg.faR = -0.5 + Math.sin(w * 8) * 0.4; Tg.thL = Math.sin(w * 10) * 0.5; Tg.thR = -Math.sin(w * 10) * 0.5; Tg.shL = 0.6 + Math.sin(w * 12) * 0.4; Tg.shR = 0.6 - Math.sin(w * 12) * 0.4; Tg.hp = -0.4 + Math.sin(w * 7) * 0.2; a.fx.gape = 1; return; }
        // rigid now: arms out, head thrown back, toes pointing down
        Tg.aoL = Tg.aoR = 1.35; Tg.uaL = Tg.uaR = -0.1; Tg.faL = Tg.faR = 0; Tg.hp = -0.95; Tg.thL = Tg.thR = 0.05; Tg.shL = Tg.shR = 0.1; Tg.roll = Math.sin(w * 31) * 0.03; a.fx.gape = 1;
      };
      if (t > 13.5) return false;
    },
    end() { hxKill(v); const i = HX.crafts.indexOf(cr); if (i >= 0) HX.crafts.splice(i, 1); HX.decals = HX.decals.filter((d) => d.tag !== 'ufo');
      hxDecal(S[0], S[1], 1.15, [0.02, 0.025, 0.02, 0.62], 0, 200); hxDecal(S[0], S[1], 1.5, [0.08, 0.2, 0.12, 0.35], 1, 200);
      HX.props.push({ kind: 'shoe', x: S[0] - 0.25, z: S[1] + 0.15, rot: rand(0, TAU), until: G.t + 240 }); },
  };
}

// a man in a good suit pays somebody off. Then he licks them, and they belong to THEM.
function hxLick(st) {
  const S = [st.x, st.z], sd = st.side;
  const suit = hxActor(hxLook({ skin: 0xdcc6b2, hair: 'side', hairCol: 0x0e0d0c, top: 0x1b1d22, bottom: 0x121317, outfit: 'tie', acc: 0x5e1414, h: 1.07, w: 1.08, shoes: 0x0a0a0a }), S[0] - sd * 4.2, S[1], { menace: 0 });
  const vic = hxActor(hxLook(), S[0] + sd * 3.8, S[1]);
  const meetS = [S[0] - sd * 0.8, S[1]], meetV = [S[0] + sd * 0.8, S[1]];
  const T = {};
  let t = 0;
  const lizSkin = CREATURE_LOOK.lizards.skin, amber = [1, 0.68, 0.1];
  suit.poseFn = (Tg, a) => {
    const fx = a.fx;
    if (t > 2.6 && t < 3.9) { Tg.hp = Math.sin(a.animT * 5) * 0.05; Tg.uaR = -0.3 - Math.max(0, Math.sin(a.animT * 2.3)) * 0.3; Tg.faR = -0.9; }
    if (t >= 3.9 && t < 5.1) { Tg.uaR = -1.15; Tg.faR = -0.35; fx.prop = 'envelope'; }
    // the face goes: skin first, then the eyes, then the jaw
    const ch = t < 5.5 ? 0 : t < 6.2 ? sstep(5.5, 6.2, t) : t < 9.2 ? 1 : t < 9.5 ? 1 - sstep(9.2, 9.5, t) * 0.6 : t < 10.4 ? 0.4 + 0.6 * (Math.sin(a.animT * 30) > 0 ? 1 : 0) : 1 - sstep(10.4, 10.8, t);
    if (ch > 0) {
      fx.skin = mix3(a.look.skinC, lizSkin, ch * 0.85); fx.eye = amber; fx.slit = true; fx.cloak = 0.28 * ch; fx.cfac = 'lizards';
      Tg.hr = 0.35 * ch; Tg.hp = -0.1;
    }
    const tg = t < 6.3 ? 0 : t < 6.75 ? sstep(6.3, 6.75, t) : t < 8.5 ? 1 : 1 - sstep(8.5, 8.95, t);
    fx.tongue = tg; fx.tongueLen = 1.5; fx.tongueThick = 0.15; fx.gape = tg > 0.02 ? 1 : 0;
    // the lick: up the chin, over the face, twice
    const lk = t < 6.75 ? 0 : (t - 6.75) / 0.85;
    const up = 0.5 - 0.5 * Math.cos(Math.min(lk, 2) * Math.PI);
    fx.tongueCurl = 0.3 - 0.75 * up;
    fx.tongueAim = 0.08 - 0.1 * up;
    if (tg > 0) { Tg.torso = 0.12; Tg.hr = 0.2; }
  };
  vic.poseFn = (Tg, a) => {
    const fx = a.fx;
    if (t >= 4.3 && t < 9.7) { if (t < 5.1) { Tg.uaR = -0.95; Tg.faR = -0.5; } fx.prop = 'envelope'; if (t >= 5.1) { Tg.uaR = -0.55; Tg.faR = -1.2; Tg.hp = t < 6.2 ? 0.45 : Tg.hp; } }
    if (t >= 6.3 && t < 9.0) {   // held there by it
      Tg.hp = -0.45; Tg.uaL = Tg.uaR = 0.2; Tg.aoL = Tg.aoR = 0.45; Tg.faL = Tg.faR = 0; Tg.roll = Math.sin(a.animT * 37) * 0.025; Tg.torso = -0.08;
      fx.eye = [0.85, 0.82, 0.7]; fx.gape = 0.35;
    }
    if (t >= 8.5) fx.slime = Math.max(fx.slime || 0, sstep(8.5, 9, t));
    if (t >= 9.0) { fx.grin = true; fx.gape = 0; fx.eye = t < 12 ? mul3(amber, 0.7) : null; fx.slit = t < 12; }
  };
  return {
    step(dt) {
      t += dt;
      const seen = hxCinema(this, S[0], S[1], t > 5.4 && t < 9.6 ? 0.92 : 0);
      if (t < 2.6) { hxWalk(suit, meetS[0], meetS[1], 1.55, dt); hxWalk(vic, meetV[0], meetV[1], 1.45, dt); }
      else if (t < 10.6) { suit.moving = vic.moving = false; hxFace(vic, suit.x, suit.z); if (t > 9.5 && PLAYER.onMap) hxFace(suit, PLAYER.x, PLAYER.z); else hxFace(suit, vic.x, vic.z); }
      if (t > 9.5 && !T.look) { T.look = true; if (seen) { suit.menace = 0.85; hxSound('hiss', S[0], S[1], 0.5); } }   // it saw you see
      if (t > 5.5 && !T.hiss) { T.hiss = true; hxSound('hiss', S[0], S[1], 0.9); suit.menace = 0.7; }
      if (t > 6.3 && !T.slurp) { T.slurp = true; hxSound('slurp', S[0], S[1], 1); if (seen) { HX.jolt = 0.55; HX.shake = 0.35; } }
      if (t > 7.6 && !T.slurp2) { T.slurp2 = true; hxSound('slurp', S[0], S[1], 0.85); }
      if (t > 9.0 && !T.puddle) { T.puddle = true; hxDecal(meetV[0], meetV[1], 0.55, [0.3, 0.36, 0.16, 0.5], 0, 120); suit.menace = 0; }
      if (t > 5.6 && t < 9.2) hxLight(suit.x, 1.6, suit.z, 2.2, mul3(amber, 0.5));   // the eyes light the face from inside
      if (t > 10.6) { suit.menace = 0; hxWalk(suit, S[0] - sd * 14, S[1], 1.3, dt); hxWalk(vic, S[0] + sd * 14, S[1], 1.2, dt); }
      if (t > 17) return false;
    },
    end() { hxKill(suit); hxKill(vic); },
  };
}

// a body on the pavement. Somebody kneels to help.
function hxFeeding(st) {
  const S = [st.x, st.z], sd = st.side;
  const dead = hxActor(hxLook(), S[0], S[1], { tell: { type: 'true', t: 9, w: 0, fac: 'zombies', down: true }, menace: 0, dir: sd > 0 ? Math.PI / 2 : -Math.PI / 2 });
  dead.tdir = dead.dir;
  const vic = hxActor(hxLook(), S[0] + sd * 4.4, S[1]);
  const kneel = [S[0] + sd * 0.95, S[1]];
  const T = {};
  let t = 0;
  const deadSkin = CREATURE_LOOK.zombies.skin;
  dead.poseFn = (Tg, a) => {
    if (t < 4.0) { a.tell.down = true; return; }
    a.tell.down = false;
    a.tell.lunge = t < 4.6;
    a.tell.feed = t >= 4.6 && t < 8.6;
  };
  vic.poseFn = (Tg, a) => {
    const fx = a.fx;
    if (t >= 2.6 && t < 4.0) { Tg.rootY = -0.36; Tg.thL = Tg.thR = -1.3; Tg.shL = Tg.shR = 1.95; Tg.torso = 0.45; Tg.uaR = -1.1; Tg.faR = -0.3; Tg.uaL = -0.6; Tg.hp = 0.35; }
    if (t >= 4.0 && t < 4.9) { Tg.uaL = -2.4 + Math.sin(a.animT * 14) * 0.5; Tg.uaR = -2.2 + Math.sin(a.animT * 12) * 0.5; Tg.hp = -0.6; Tg.hr = 0.5; fx.gape = 1; Tg.torso = -0.2; }
    if (t >= 4.9 && t < 9.4) { Tg.pitch = -Math.PI / 2; Tg.rootY = 0.14; Tg.roll = 0.15 + Math.sin(a.animT * 23) * 0.04 * (t < 7 ? 1 : 0.3); Tg.uaL = -0.2 + Math.sin(a.animT * 6) * 0.4; Tg.uaR = 0.3; Tg.hp = -0.2; Tg.hy = 0.5; fx.gape = t < 6.5 ? 1 : 0.3; }
    if (t >= 9.4) {   // it gets up. It is not them any more.
      const r = sstep(9.4, 11, t);
      if (t < 11) { Tg.pitch = -Math.PI / 2 * (1 - r); Tg.rootY = 0.14 * (1 - r); }
      fx.skin = mix3(a.look.skinC, deadSkin, 0.75); fx.eye = [0.86, 0.92, 0.8]; Tg.hr = 0.55; Tg.hp = 0.25;
      if (t > 11) { Tg.uaL = -1.35; Tg.uaR = -1.45; Tg.faL = Tg.faR = -0.1; Tg.torso = 0.3; }
      fx.gape = 0.6;
    }
  };
  return {
    step(dt) {
      t += dt;
      const seen = hxCinema(this, S[0], S[1], t > 3.9 && t < 9.5 ? 0.9 : 0);
      if (t < 2.6) hxWalk(vic, kneel[0], kneel[1], 1.6, dt);
      else if (t < 11.2) { vic.moving = false; hxFace(vic, S[0], S[1]); }
      if (t > 4.0 && !T.grab) { T.grab = true; hxSound('groan', S[0], S[1], 1); hxSound('sting', S[0], S[1], 0.7); if (seen) { HX.jolt = 0.9; HX.shake = 0.7; } dead.menace = 0.9; }
      if (t > 4.0 && t < 4.6) { hxWalk(dead, lerp(S[0], kneel[0], 0.4), S[1], 3.2, dt); hxFace(dead, vic.x, vic.z); }
      if (t > 4.9 && t < 5.6) { hxWalk(dead, kneel[0] + sd * 0.75, S[1], 2.2, dt); dead.moving = false; dead.tdir = Math.atan2(sd, 0); }   // onto them
      if (t > 4.3 && !T.scream) { T.scream = true; hxSound('scream', S[0], S[1], 1); }
      if (t > 4.9 && t < 8.4) { T.bt = (T.bt || 0) - dt; if (T.bt <= 0) { T.bt = rand(0.5, 0.9); hxSound('bite', S[0], S[1], 0.85); } }
      if (t > 4.9 && !T.blood) { T.blood = true; const t0 = G.t; hxDecal(kneel[0], kneel[1], () => 0.25 + clamp((G.t - t0) / 10, 0, 1) * 0.85, [0.2, 0.01, 0.015, 0.75], 0, 260); }
      if (t > 8.6 && !T.look) { T.look = true; hxFace(dead, PLAYER.x, PLAYER.z); hxSound('groan', S[0], S[1], 0.8); }
      if (t > 8.6 && t < 11) hxFace(dead, PLAYER.x, PLAYER.z);
      if (t > 11.2) {   // and away, slowly, together
        dead.menace = 0.4;
        const gx = S[0] - sd * 16;
        hxWalk(dead, gx, S[1] + 0.5, 0.75, dt); hxWalk(vic, gx, S[1] - 0.4, 0.7, dt);
      }
      if (t > 22) return false;
    },
    end() { hxKill(dead); hxKill(vic); hxDecal(S[0] - sd * 1.5, S[1], 0.5, [0.16, 0.01, 0.01, 0.5], 0, 200); },
  };
}

