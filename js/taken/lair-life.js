//@ taken/lair-life — THEIR places, alive while you are there
//@ Defines: lairLive, lairFolded, CAP_FIGS, lairFigs, capDraw, capChairMesh, drawTankThing, TANK_FS, tankTube, drawTankGlass, capDrawAdd, capDecals
//@ Uses:    gfx/renderer, gfx/gl, core/util, taken/taken, world/grid, world/vision, horror/layer, gfx/post, world/objects, taken/coming, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR places, alive while you're there: what floats in the tanks, who lies in the nest, the map of Wexley
function lairLive() {
  const k = CAP.lit;
  if (!k) return;
  if (k === 'ship') {
    for (const tk of (CAP.cast && CAP.cast.tanks) || []) {
      if (visAt(tk.x, tk.z) < 0.2) continue;
      const pul = 0.75 + 0.25 * Math.sin(R.time * 1.3 + tk.ph);
      for (let i = 0; i < 3; i++)
        CAP.glow.push({
          x: tk.x,
          y: 0.6 + i * 0.62,
          z: tk.z,
          size: 0.8,
          col: [0.25, 1, 0.6],
          a: (tk.what === 'empty' ? 0.035 : 0.07) * pul,
        });
      for (let i = 0; i < 5; i++) {
        const ph = (R.time * 0.22 + i / 5 + tk.ph) % 1;
        hxGlint(
          tk.x + Math.sin(i * 2.3 + tk.ph) * 0.22,
          0.35 + ph * 1.8,
          tk.z + Math.cos(i * 1.7) * 0.2,
          0.05,
          [0.7, 1, 0.85],
          (1 - ph) * 0.7,
        );
      }
    }
    const h = OBJ_BY_ID.lxHolo;
    if (h && visAt(h.cx, h.cz) > 0.2) hxLight(h.cx, 1.6, h.cz, 3.8, [0.1, 0.45, 0.38]);
    const T = OBJ_BY_ID.lxTable;
    if (T && visAt(T.cx, T.cz) > 0.2) hxLight(T.cx, 1.6, T.cz + 0.05, 2.2, [0.16, 0.2, 0.19]);
  } else if (k === 'sewer') {
    for (const o of OBJ) if (o.type === 'lx_ctable' && visAt(o.cx, o.cz) > 0.3) lairGoldFx(o.cx, o.cz, 2.6);
    for (let i = 0; i < 4; i++) {
      const ph = (R.time * 0.7 + i * 0.29) % 1,
        x = LAIRS.sewer.x0 + 10.5,
        z = LAIR_Z0 + 2 + i * 3.1;
      if (visAt(x, z) > 0.3)
        hxGlint(x + Math.sin(i * 7) * 0.2, 2.7 - ph * 2.9, z, 0.04, [0.6, 0.7, 0.6], 0.5 * Math.sin(ph * Math.PI));
    }
  } else if (k === 'den') {
    for (const lp of LAIR_LAMPS)
      if (lp.k === 'den' && lp.fungus && visAt(lp.x, lp.z) > 0.2)
        for (let i = 0; i < 3; i++) {
          const ph = (R.time * 0.15 + i * 0.33 + lp.x) % 1;
          hxGlint(
            lp.x + Math.sin(i * 3 + lp.z) * 0.3,
            0.2 + ph * 1.2,
            lp.z + Math.cos(i * 2) * 0.3,
            0.05,
            [0.4, 1, 0.8],
            Math.sin(ph * Math.PI) * 0.6,
          );
        }
  }
}
// the folded clothes in the nest
function lairFolded(f) {
  CAP.folded = f;
}
let CAP_FIGS = null; // who lies dead in the nest: drawn as people, made once each time you come down
function lairFigs() {
  if (CAP.lit !== 'den' || !CAP.cast || !CAP.cast.bodies) return [];
  if (CAP_FIGS && CAP_FIGS.cast === CAP.cast) return CAP_FIGS.list;
  const dead = CREATURE_LOOK.zombies.skin;
  const list = CAP.cast.bodies.map((b) => {
    const c = {
      x: b.x,
      z: b.z,
      y: 0,
      dir: b.dir,
      tdir: b.dir,
      look: b.look,
      J: defaultJ(),
      fx: {},
      pose: 'floorlie',
      anim: 'idle',
      animT: hash2(b.x, b.z, 1) * 10,
      moving: false,
      queue: [],
      onMap: true,
      shown: 1,
      hover: false,
    };
    const T = animTargets(c, 0);
    T.roll = 0.6 + hash2(b.x, 1, 2) * 0.5;
    T.uaL = -0.6;
    T.uaR = 0.9;
    T.hy = 0.9;
    T.thL = 0.3;
    T.shL = 0.7;
    c.J = T;
    c.fx.skin = mix3(b.look.skinC, dead, 0.55);
    c.fx.eye = [0.6, 0.62, 0.55];
    c.fx.gape = 0.5;
    return c;
  });
  CAP_FIGS = { cast: CAP.cast, list };
  return list;
}
// drawn with the town, in the main pass
function capDraw() {
  const k = CAP.lit;
  // the manhole in the alley, every night and day: a lid that never quite sits flat
  {
    const o = CAP.cover || 0;
    gl.uniform1f(U.uEmitMul, 0);
    gl.uniform1f(U.uDyn, 1);
    gl.uniform1i(U.uCut, 0);
    drawHi = 0;
    const M = M4.trans(MANHOLE[0] + o * 0.45, 0, MANHOLE[1] + o * 0.12);
    part(M, 0, 0.012, 0, 0.78, 0.025, 0.78, 'cyl', [0.1, 0.1, 0.095]);
    for (let i = -2; i <= 2; i++)
      part(M, i * 0.12, 0.026, 0, 0.04, 0.006, 0.6 - Math.abs(i) * 0.08, 'box', [0.16, 0.155, 0.15]);
    if (o > 0.02) part(M4.trans(MANHOLE[0], 0, MANHOLE[1]), 0, 0.002, 0, 0.7, 0.004, 0.7, 'cyl', [0.005, 0.004, 0.003]);
    quirkDraw();
  }
  if (!CAP.on) return;
  for (const a of CAP.actors) {
    if (a.hide) continue;
    gl.uniform1f(U.uVisMin, a.ghost || 0);
    drawChar(a);
  }
  gl.uniform1f(U.uVisMin, 0);
  const act = CAP.act;
  if (act && act.needle && act.needle.k > 0.02) {
    gl.uniform1f(U.uEmitMul, 0);
    gl.uniform1i(U.uCut, 0);
    drawHi = 0;
    const n = act.needle;
    capRod(n.a, n.b, 0.03, [0.7, 0.8, 0.78], mul3([0.5, 1, 0.85], 2.2 * n.k));
  }
  if (act && act.chair) {
    const ch = capChairMesh();
    ch.model = M4.mul(M4.trans(act.chair.x, 0, act.chair.z), M4.rotY(act.chair.rot));
    drawMesh(ch);
  }
  if (k === 'ship') for (const tk of (CAP.cast && CAP.cast.tanks) || []) drawTankThing(tk);
  if (k === 'den') {
    for (const c of lairFigs()) drawChar(c);
    const f = CAP.folded;
    if (f) {
      gl.uniform1f(U.uEmitMul, 0);
      gl.uniform1i(U.uCut, 0);
      const M = M4.mul(M4.trans(f.x, 0, f.z), M4.rotY(0.4));
      part(M, 0, 0.18, 0, 0.5, 0.36, 0.4, 'box', [0.22, 0.17, 0.12]);
      part(M, 0, 0.38, 0, 0.38, 0.06, 0.3, 'box', f.look.topC);
      part(M, 0, 0.44, 0, 0.34, 0.05, 0.28, 'box', f.look.botC);
      part(M, 0.06, 0.48, 0.02, 0.22, 0.03, 0.12, 'box', f.look.accC || f.look.topC);
      part(M, -0.1, 0.5, -0.08, 0.1, 0.02, 0.06, 'box', [0.85, 0.82, 0.74]);
    }
  }
}
function capChairMesh() {
  if (!R.capChair) {
    const g = new Geo();
    MODELS.lx_chair(g, { x: 0, z: 0 });
    R.capChair = makeMesh(g);
  }
  return R.capChair;
}
// what floats in a tank: an animal, somebody, a thing with no shape
function drawTankThing(tk) {
  if (visAt(tk.x, tk.z) < 0.15 || tk.what === 'empty') return;
  const bob = Math.sin(R.time * 0.6 + tk.ph) * 0.06,
    y = 0.55 + bob,
    tw = Math.sin(R.time * 0.25 + tk.ph) * 0.25;
  gl.uniform1f(U.uEmitMul, 0);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  drawHi = 0;
  const M = M4.mul(M4.trans(tk.x, y, tk.z), M4.rotY(tw + tk.ph));
  if (tk.what === 'person' && tk.look) {
    if (!tk.c) {
      tk.c = {
        x: tk.x,
        z: tk.z,
        y: 0,
        dir: 0,
        tdir: 0,
        look: tk.look,
        J: defaultJ(),
        fx: {},
        pose: 'stand',
        anim: 'idle',
        animT: tk.ph,
        moving: false,
        queue: [],
        onMap: true,
        shown: 1,
      };
    }
    const c = tk.c;
    c.x = tk.x;
    c.z = tk.z;
    c.y = 0.32 + bob;
    c.dir = tw + tk.ph;
    c.animT = R.time;
    const J = c.J;
    J.uaL = J.uaR = 0.25 + Math.sin(R.time * 0.7) * 0.08;
    J.aoL = J.aoR = 0.55;
    J.faL = J.faR = -0.3;
    J.hp = 0.45;
    J.hr = 0.2;
    J.thL = 0.15;
    J.thR = -0.1;
    J.shL = J.shR = 0.35;
    J.rootY = 0;
    c.fx.skin = mix3(tk.look.skinC, [0.5, 0.75, 0.62], 0.35);
    c.fx.glaze = true;
    drawChar(c);
    return;
  }
  const sk = tk.what === 'dog' ? [0.36, 0.27, 0.2] : tk.what === 'deer' ? [0.45, 0.33, 0.22] : [0.55, 0.32, 0.3];
  if (tk.what === 'mass') {
    drawSpec = 1.6;
    for (let i = 0; i < 7; i++)
      part(
        M,
        Math.sin(i * 2.3) * 0.14,
        0.5 + Math.cos(i * 1.7) * 0.25,
        Math.cos(i * 3.1) * 0.12,
        0.22 + (i % 3) * 0.06,
        0.2 + (i % 2) * 0.08,
        0.2,
        'sph',
        mix3(sk, [0.6, 0.55, 0.45], (i % 3) / 3),
      );
    part(M, 0.05, 0.62, 0.15, 0.05, 0.05, 0.04, 'sph', [0.02, 0.02, 0.02]);
    drawSpec = 0;
    return;
  }
  const big = tk.what === 'deer' ? 1.25 : 0.9;
  const B = M4.mul(M, M4.mul(M4.rotZ(0.25), M4.scale(big, big, big)));
  part(B, 0, 0.55, 0, 0.32, 0.26, 0.6, 'sph', sk);
  part(B, 0, 0.72, 0.36, 0.13, 0.22, 0.13, 'limb2', sk);
  part(B, 0, 0.86, 0.46, 0.15, 0.14, 0.2, 'sph', sk);
  part(B, 0, 0.84, 0.58, 0.07, 0.07, 0.12, 'box', mul3(sk, 0.7));
  for (const s of [-1, 1])
    for (const zz of [-0.22, 0.22]) part(B, s * 0.11, 0.3, zz, 0.06, 0.42, 0.06, 'limb2', mul3(sk, 0.85));
  if (tk.what === 'deer')
    for (const s of [-1, 1]) {
      partR(B, s * 0.06, 1.0, 0.44, -0.5, 0, s * 0.4, 0.02, 0.3, 0.02, 'box', [0.55, 0.48, 0.38]);
      partR(B, s * 0.12, 1.12, 0.42, -0.2, 0, s * 0.9, 0.015, 0.16, 0.015, 'box', [0.55, 0.48, 0.38]);
    }
  else partR(B, 0, 0.62, -0.32, -0.6, 0, 0, 0.04, 0.24, 0.04, 'limb2', sk);
}
// the tanks' glass and what fills it: a tube of light laid over whatever floats inside
const TANK_FS = `#version 300 es
precision highp float;
in float vT; in vec3 vN; in vec3 vW; uniform vec3 uColor; uniform float uAlpha; uniform vec3 uCamDir; uniform sampler2D uVis; uniform vec2 uMap; uniform float uTime;
out vec4 frag;
void main(){
  vec3 n = normalize(vN);
  float f = clamp(abs(dot(n, uCamDir)), 0.0, 1.0), rim = pow(1.0 - f, 2.0);
  float lane = floor(atan(n.z, n.x)*3.0);
  float bub = smoothstep(0.93, 1.0, sin(vW.y*19.0 - uTime*(1.6 + fract(lane*0.37)*1.4) + lane*2.3))*smoothstep(0.35, 0.9, f);
  float shine = smoothstep(0.78, 0.96, dot(n, normalize(vec3(0.6, 0.0, 0.8))))*0.3;
  float a = (0.05 + rim*0.55 + bub*0.3 + shine)*(0.6 + 0.4*smoothstep(0.0, 0.2, vT))*(1.0 - 0.5*smoothstep(0.9, 1.0, vT));
  float v = texture(uVis, vW.xz/uMap).r;
  frag = vec4(uColor*a*uAlpha*v, 1.0);
}`;
function tankTube() {
  if (R.tankTube) return R.tankTube;
  const g = new Geo(),
    seg = 24,
    wh = [1, 1, 1];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU,
      a1 = ((i + 1) / seg) * TAU,
      c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1),
      k = g.vc;
    g.vert(c0, 0, s0, c0, 0, s0, wh);
    g.vert(c1, 0, s1, c1, 0, s1, wh);
    g.vert(c1, -1, s1, c1, 0, s1, wh);
    g.vert(c0, -1, s0, c0, 0, s0, wh);
    g.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  R.tankTube = uploadGeo(g);
  R.tankProg = compileProgram(CVS, TANK_FS);
  return R.tankTube;
}
function drawTankGlass() {
  const tanks = CAP.lit === 'ship' && CAP.cast && CAP.cast.tanks;
  if (!tanks) return;
  const tube = tankTube(),
    TP = R.tankProg;
  gl.useProgram(TP.p);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(false);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.uniformMatrix4fv(TP.U.uVP, false, cam.VP);
  gl.uniform2f(TP.U.uMap, W, H);
  gl.uniform1f(TP.U.uTime, R.time);
  gl.uniform3fv(TP.U.uCamDir, [-cam.fwd[0], -cam.fwd[1], -cam.fwd[2]]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, R.tVis);
  gl.uniform1i(TP.U.uVis, 1);
  gl.bindVertexArray(tube.vao);
  for (const tk of tanks) {
    if (visAt(tk.x, tk.z) < 0.1) continue;
    gl.uniformMatrix4fv(TP.U.uModel, false, M4.mul(M4.trans(tk.x, 2.16, tk.z), M4.scale(0.41, 1.9, 0.41)));
    const empty = tk.what === 'empty';
    gl.uniform3fv(TP.U.uColor, empty ? [0.22, 0.5, 0.46] : [0.3, 1, 0.62]);
    gl.uniform1f(TP.U.uAlpha, (empty ? 0.55 : 1) * (0.85 + 0.15 * Math.sin(R.time * 1.3 + tk.ph)));
    gl.drawElements(gl.TRIANGLES, tube.count, gl.UNSIGNED_INT, 0);
  }
}
// additive: the tanks' light, the needle, the map of Wexley made of light
function capDrawAdd() {
  if (!CAP.on) return;
  try {
    drawTankGlass();
  } catch (e) {
    console.error(e);
  }
  if (CAP.glow.length) {
    const GL = R.glow;
    gl.useProgram(GL.p);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniformMatrix4fv(GL.U.uVP, false, cam.VP);
    gl.uniform3fv(GL.U.uRight, cam.right);
    gl.uniform3fv(GL.U.uUp, cam.up);
    for (const g of CAP.glow) {
      if (g.a < 0.01) continue;
      gl.uniform3fv(GL.U.uCenter, [g.x, g.y, g.z]);
      gl.uniform1f(GL.U.uSize, g.size);
      gl.uniform3fv(GL.U.uColor, g.col);
      gl.uniform1f(GL.U.uAlpha, g.a);
      gl.bindVertexArray(PRIM.quad.vao);
      gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
    }
  }
  const h = OBJ_BY_ID.lxHolo;
  if (CAP.lit === 'ship' && h && visAt(h.cx, h.cz) > 0.2) {
    useMain(0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.uniform1i(U.uCut, 0);
    gl.uniform1f(U.uDyn, 1);
    gl.uniform1f(U.uEmitMul, 0);
    drawHi = 0;
    gl.uniform1f(U.uVisMin, 1);
    const s = 1 / 17,
      ox = h.cx - (W * s) / 2,
      oz = h.cz - (TOWN_H * s) / 2,
      y0 = 1.02,
      M = M4.ident(),
      K = [0, 0, 0];
    const flick = 0.85 + 0.15 * Math.sin(R.time * 23) * Math.sin(R.time * 7);
    for (const b of BUILDINGS)
      part(
        M,
        ox + ((b.x0 + b.x1 + 1) / 2) * s,
        y0 + 0.06,
        oz + ((b.z0 + b.z1 + 1) / 2) * s,
        (b.x1 - b.x0 + 1) * s,
        0.12,
        (b.z1 - b.z0 + 1) * s,
        'box',
        K,
        mul3([0.15, 0.75, 0.6], 0.16 * flick),
      );
    part(
      M,
      ox + (W * s) / 2,
      y0 + 0.004,
      oz + 16 * s,
      W * s,
      0.004,
      4 * s,
      'box',
      K,
      mul3([0.15, 0.75, 0.6], 0.08 * flick),
    );
    part(M, ox + 34 * s, y0 + 0.004, oz + 26 * s, 20 * s, 0.004, 13 * s, 'box', K, mul3([0.1, 0.6, 0.3], 0.07 * flick));
    const pul = 0.5 + 0.5 * Math.sin(R.time * 4);
    part(M, ox + 8.5 * s, y0 + 0.18 + pul * 0.04, oz + 22.5 * s, 0.06, 0.06, 0.06, 'sph', K, [
      1.6 * pul + 0.4,
      0.12,
      0.08,
    ]); // you
    for (const id of G.victims || []) {
      const n = NPC[id],
        hh = n && HOUSE_OF[id];
      const p = hh ? hh.spot : id === 'agnes' ? [18, 22] : null;
      if (p)
        part(
          M,
          ox + (p[0] + 0.5) * s,
          y0 + 0.14,
          oz + (p[1] + 0.5) * s,
          0.035,
          0.035,
          0.035,
          'sph',
          K,
          [0.9, 0.1, 0.06],
        );
    }
    part(
      M,
      ox + 37.5 * s,
      y0 + 0.35 + Math.sin(R.time) * 0.03,
      oz + 26.5 * s,
      0.12,
      0.03,
      0.12,
      'sph',
      K,
      mul3([0.3, 1, 0.7], 0.5 * flick),
    ); // the landing place
    gl.uniform1f(U.uVisMin, 0);
  }
}
function capDecals() {
  if (!CAP.on) return;
  for (const d of CAP.decals) {
    const r = typeof d.r === 'function' ? d.r() : d.r;
    drawDecal(d.x, d.z, r, d.col, d.shape || 0, 0.016);
  }
  for (const a of CAP.actors)
    if (!a.hide && a.shadow > 0 && (a.y || 0) > -0.5)
      drawDecal(
        a.x,
        a.z,
        0.44 / (1 + Math.max(0, a.y || 0) * 0.4),
        [0, 0, 0, a.shadow / (1 + Math.max(0, a.y || 0))],
        0,
        0.013,
      );
}
