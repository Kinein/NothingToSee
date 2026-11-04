//@ gfx/vf-glass — Through the glass: a photo taken through a window, the pane put back in the square
//@ Defines: VF_GLASS_FS, VF_PANE, vfLightAt, VF_FAR, vfPane, vfGlassPass
//@ Uses:    gfx/gl, gfx/viewfinder, world/grid, world/light-map, core/util, sim/core, gfx/post, gfx/look, gfx/renderer, gfx/frame
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── through the glass. A shot whose line meets a window first (a 'W' tile, before any wall or shut door)
// is taken through the pane, carefully, the lens up against it. The cut sinks the real glass out of the picture, so the
// square puts it back, traced pixel by pixel onto the window's own plane: the frame and the sill soft and dark in the
// foreground when you're close, a breath of blue-green in what's behind, the cartoon's two strokes of shine, whatever is
// on your side of it ghosting in the glass (more at a slant, more when your side is the bright one), mist creeping in
// from the corners and along the sill, rain running down it once the town has turned, and on the still the flash
// coming back off the glass, small and soft. It goes in before the grade, so the cartoon and the noir both have it
// their own way. Render only.
const VF_GLASS_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel;
uniform vec3 uEye; uniform vec3 uRt; uniform vec3 uUp; uniform vec3 uFw; uniform float uTan;
uniform vec4 uPl;     // the window: x which way it runs (0: the plane z = y, along x; 1: x = y, along z), z..w the run of panes
uniform float uShift; // the lens leant into a pane, not on a post
uniform float uSoft; uniform float uFrame; uniform float uRefl; uniform float uK; uniform float uWet; uniform float uTime; uniform float uStill;
uniform vec3 uNear;   // the light on your side of the glass
uniform vec3 uHot;    // the flash off the glass: where in the square, how much
uniform vec4 uLook;
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec3 soft9(vec2 uv, float r){ vec3 s = texture(uSrc, uv).rgb;
  for(int i=0;i<8;i++){ float a = float(i)*0.785398 + 0.39; s += texture(uSrc, uv + vec2(cos(a), sin(a))*uTexel*r).rgb; }
  return s/9.0; }
void main(){
  vec3 col = texture(uSrc, vUv).rgb;
  vec2 sp = vUv*2.0 - 1.0;
  vec3 dir = normalize(uFw + (sp.x*uRt + sp.y*uUp)*uTan);
  bool alongZ = uPl.x > 0.5;
  float dn = alongZ ? dir.x : dir.z;
  float t = (uPl.y - (alongZ ? uEye.x : uEye.z))/(abs(dn) < 1e-3 ? 1e-3 : dn);
  if(t <= 0.0 || uK < 0.002){ frag = vec4(col, 1.0); return; }
  vec3 p = uEye + dir*t;
  float a = (alongZ ? p.z : p.x) + uShift, y = p.y;
  float toon = uLook.x, hor = uLook.y, night = uLook.z;
  // the nearest pane: two to a window, between the posts, from the sill to the head
  float ac = clamp(a, uPl.z, uPl.w - 1e-3), ti = floor(ac);
  vec2 pc = vec2(ti + (ac - ti < 0.5 ? 0.27 : 0.73), 1.54), hb = vec2(0.19, 0.61);
  vec2 lp = vec2(a, y) - pc;
  float sd = box(lp, hb, 0.012);
  float gm = 1.0 - smoothstep(-uSoft, uSoft, sd);   // how much of this pixel is glass
  float fres = 0.05 + 0.95*pow(1.0 - abs(dn), 5.0);   // a slant shows more of your own side
  float nl = dot(uNear, vec3(0.3, 0.59, 0.11));
  vec3 nearC = mix(vec3(nl), uNear, 0.75);
  // through it: a breath of blue-green, a little light lost, a touch soft
  vec3 g = mix(col, soft9(vUv, 1.4), 0.25)*vec3(0.9, 0.955, 0.965);
  // your side of it, ghosting in the glass: a smudgy veil, stronger toward the top where the sky is
  float veil = uRefl*(0.3 + fres*1.6)*(0.65 + 0.35*vn(vec2(a, y)*2.3))*(0.75 + 0.35*(lp.y/hb.y));
  g += nearC*veil*mix(0.28, 0.5, toon);   // the noir keeps its blacks
  // mist where the cold glass meets the frame: in from the corners, along the sill, a cold night or a wet one most
  float pxw = (t*uTan)*(2.0*uTexel.x);   // how wide a pixel of the square is, there on the glass
  float n1 = vn(vec2(a, y)*13.0), n2 = vn(vec2(a, y)*37.0 + 3.7);
  float ed = -box(lp, hb, 0.16) - (n1*0.04 + n2*0.018) - smoothstep(0.3, 0.0, lp.y + hb.y)*0.05;
  float mistK = clamp(0.4 + night*0.3 + uWet*0.35, 0.0, 1.0);
  float mist = smoothstep(0.05, -0.03, ed)*mistK*gm;
  vec3 bl = soft9(vUv, 4.0 + mist*7.0);
  vec3 fog = mix(bl*0.72 + nearC*0.2 + vec3(0.018, 0.022, 0.028), bl*0.5 + nearC*0.08 + vec3(0.01), hor);
  g = mix(g, fog, mist*0.72);
  // droplets in the mist, where they're big enough to see
  vec2 q = vec2(a, y)/0.017, qi = floor(q), qf = fract(q) - (0.25 + 0.5*vec2(h21(qi + 3.1), h21(qi + 7.3)));
  float drop = step(0.78, h21(qi + 11.0))*smoothstep(0.3, 0.14, length(qf))*smoothstep(2.0, 5.0, 0.017/pxw)*mist;
  g = mix(g, g*0.72 + (nearC*0.55 + 0.05)*smoothstep(0.05, -0.12, qf.y), drop*0.85);
  // the cartoon's shine: two strokes slanting down from the top of each pane, crisp in the toy town, thin and cold after
  float depth = hb.y - lp.y, s = (lp.x + hb.x) + depth*0.42;
  float fw = fwidth(s) + 1e-4;
  float w1 = mix(0.03, 0.05, toon), w2 = mix(0.008, 0.016, toon);
  float e1 = w1*mix(0.6, 0.22, toon) + fw, e2 = w2*mix(0.6, 0.3, toon) + fw;
  float shine = (1.0 - smoothstep(w1 - e1, w1 + e1, abs(s - 0.3))) + 0.8*(1.0 - smoothstep(w2 - e2, w2 + e2, abs(s - 0.44)));
  shine *= smoothstep(1.15, 0.45, depth)*smoothstep(-0.01, 0.06, depth);
  float shineK = (0.06 + uRefl*1.1)*mix(0.55, 1.15, toon)*(1.0 - uStill*0.25);
  g += mix(nearC*1.1 + 0.07, vec3(nl*0.9 + 0.05)*vec3(0.92, 0.98, 1.06), hor)*shine*shineK*(1.0 - mist*0.7);
  // a hairline of light along the edge of the glass, where the bevel catches it
  float rim = exp(-pow((sd + uSoft*0.9)/(uSoft*0.45 + pxw), 2.0));
  g += (nearC*0.4 + 0.03)*rim*0.35;
  // once it has turned, or when it rains: water on the glass, bending what's behind it. Drops sitting all over it, and
  // a few running down, a thin wet trail behind each
  float rk = max(uWet*0.85, smoothstep(0.35, 0.85, hor))*gm;
  if(rk > 0.01){
    vec2 rq = vec2(a, y)/0.024, ri = floor(rq), rf = fract(rq) - (0.25 + 0.5*vec2(h21(ri + 1.7), h21(ri + 5.9)));
    float rr = 0.1 + 0.18*h21(ri + 8.3);
    float sp = step(0.74, h21(ri + 2.2))*(1.0 - smoothstep(rr*0.7, rr, length(rf)))*smoothstep(1.5, 4.0, 0.024/pxw);
    g = mix(g, texture(uSrc, vUv - rf*0.014).rgb*0.85 + nearC*0.1, sp*rk*0.85);   // a drop turns what's behind it over
    g += (nearC*0.5 + 0.04)*sp*rk*smoothstep(0.0, 0.5, (rf.y - rf.x)/rr)*0.45;     // and catches the light on one side
    float cw = 0.032, ci = floor(a/cw), r1 = h21(vec2(ci, 5.0)), r2 = h21(vec2(ci, 9.0));
    float x0 = (ci + 0.3 + 0.4*r2)*cw + sin(y*23.0 + r1*30.0)*0.0025;
    float head = 2.15 - fract(uTime*(0.03 + 0.05*r1) + r1*7.0)*1.4, len = 0.06 + 0.26*r2, up = y - head;
    float on = step(0.6, r1), dx = abs(a - x0);
    float lw = (0.0008 + pxw*0.35)*(1.0 - clamp(up/len, 0.0, 1.0)*0.7);
    float trail = on*(1.0 - smoothstep(lw, lw + pxw*1.5, dx))*step(0.0, up)*(1.0 - smoothstep(0.0, len, up));
    float br = 0.0035 + 0.002*r2;
    vec2 bv = vec2(a - x0, (y - head)*0.75);
    float bead = on*(1.0 - smoothstep(br, br + pxw*1.5, length(bv)));
    vec3 bent = texture(uSrc, vUv + vec2(sign(a - x0)*0.003*trail, 0.0) - bv/br*0.01*bead).rgb;
    g = mix(g, bent*0.85 + nearC*0.14, max(trail*0.6, bead)*rk*0.8);
    g += (nearC*0.6 + 0.05)*bead*rk*smoothstep(0.1, 0.7, (bv.y - bv.x)/br)*0.5;
  }
  // the flash, coming back off the glass: small and soft, the lens was close
  if(uHot.z > 0.001){
    vec2 hv = vUv - uHot.xy, gv = vUv - (1.0 - uHot.xy)*0.7 - 0.15;
    float r2 = dot(hv, hv);
    g += vec3(1.0, 0.97, 0.9)*uHot.z*(exp(-r2/0.0005)*1.3 + exp(-r2/0.01)*0.3);
    g += vec3(0.55, 0.75, 1.0)*uHot.z*exp(-dot(gv, gv)/0.0016)*0.12;   // its ghost in the lens
  }
  // the frame, the sill and the wall round them, near and out of focus: dark, soft, a little lit on the bevel
  float bev = exp(-pow((sd - uSoft*1.3)/(uSoft*0.9 + pxw), 2.0));
  vec3 fc = nearC*0.05 + vec3(0.007, 0.006, 0.01)*(1.0 + toon) + nearC*0.1*bev;
  float fa = (1.0 - gm)*uFrame*smoothstep(2.74, 2.64, y);
  vec3 o = mix(mix(col, g, gm), fc, fa);
  frag = vec4(mix(col, o, uK), 1.0);
}`;
// the pane the shot goes through: the window's plane, the run of panes along it, how near and how lit either side is.
// Written in place every frame; on is false for a shot that meets no glass.
const VF_PANE = {
  on: false,
  k: 0, // eased in and out as the lens swings past a window
  ax: 0, // 0: the glass is the plane z = c, running along x; 1: the plane x = c, along z
  c: 0,
  a0: 0,
  a1: 0,
  shift: 0, // the pattern slid so the line of the shot goes through the middle of a pane
  d: 0, // how far off the glass is, along the line of the shot on the ground
  sn: 1, // which way the line crosses it
  refl: 0,
  near: [0, 0, 0],
};
function vfLightAt(x, z, out, k) {
  x = Math.floor(x);
  z = Math.floor(z);
  if (!inb(x, z)) return 0;
  const i = I(x, z),
    f = LOOK.fill;
  out[0] = rLR[i] * 0.5 + f[0] * 0.6;
  out[1] = rLG[i] * 0.5 + f[1] * 0.6;
  out[2] = rLB[i] * 0.5 + f[2] * 0.6;
  return (out[0] * 0.3 + out[1] * 0.59 + out[2] * 0.11) * k;
}
const VF_FAR = [0, 0, 0];
// from the lens toward (tx, tz): the first window the line meets, if nothing solid comes first
function vfPane(eye, tx, tz) {
  const Pn = VF_PANE,
    dx = tx - eye[0],
    dz = tz - eye[2],
    d = Math.hypot(dx, dz);
  Pn.on = false;
  if (d < 0.4) return Pn;
  const ux = dx / d,
    uz = dz / d;
  for (let s = 0.04; s < d - 0.15; s += 0.05) {
    const x = Math.floor(eye[0] + ux * s),
      z = Math.floor(eye[2] + uz * s);
    if (!inb(x, z)) return Pn;
    const c = tiles[I(x, z)];
    if (c === '#' || c === 'X' || ((c === 'D' || c === 'L') && doorClosed(x, z))) return Pn;
    if (c !== 'W') continue;
    const along = isWallish(x - 1, z) || isWallish(x + 1, z),
      dn = along ? uz : ux;
    if (Math.abs(dn) < 0.2) return Pn; // along the glass, not through it
    Pn.ax = along ? 0 : 1;
    Pn.c = (along ? z : x) + 0.5;
    let a0 = along ? x : z,
      a1 = a0;
    while (along ? tget(a0 - 1, z) === 'W' : tget(x, a0 - 1) === 'W') a0--;
    while (along ? tget(a1 + 1, z) === 'W' : tget(x, a1 + 1) === 'W') a1++;
    Pn.a0 = a0;
    Pn.a1 = a1 + 1;
    Pn.d = (Pn.c - (along ? eye[2] : eye[0])) / dn;
    Pn.sn = dn > 0 ? 1 : -1;
    // careful: the lens goes into a pane, clear of the posts (the panes sit 0.08–0.46 and 0.54–0.92 of each tile)
    const cr = along ? eye[0] + ux * Pn.d : eye[2] + uz * Pn.d;
    const f = cr - Math.floor(cr),
      mid = f < 0.5 ? 0.27 : 0.73;
    Pn.shift = clamp(f, mid - 0.08, mid + 0.08) - f;
    // your side of it against the far side: a bright street outside a dim room fills the glass with the street
    const ln = vfLightAt(PLAYER.x, PLAYER.z, Pn.near, 1),
      lf = vfLightAt(eye[0] + ux * (Pn.d + 0.8), eye[2] + uz * (Pn.d + 0.8), VF_FAR, 1);
    Pn.refl = clamp(0.12 + (0.32 * (ln - lf)) / (ln + lf + 0.08), 0.04, 0.42);
    Pn.on = true;
    return Pn;
  }
  return Pn;
}
// the glass over the square's HDR image, before bloom and grade: VF.scene into VF.glass. Null when there's none to see.
function vfGlassPass(view, still) {
  const Pn = VF_PANE;
  Pn.k = still ? (Pn.on ? 1 : 0) : Pn.k + ((Pn.on ? 1 : 0) - Pn.k) * 0.2;
  if (Pn.k < 0.01) return null;
  if (!VF.glassP) VF.glassP = compileProgram(QVS, VF_GLASS_FS);
  if (!VF.glass) VF.glass = makeTarget(VF.S, VF.S, R.hdr);
  const e = VF.eye,
    tn = Math.tan(VF.fov / 2),
    fd = Math.abs(Pn.d),
    rx = view[0],
    ry = view[4],
    rz = view[8],
    ux = view[1],
    uy = view[5],
    uz = view[9],
    fx = -view[2],
    fy = -view[6],
    fz = -view[10];
  // the flash off the glass: straight back at you along the glass's normal, so it shows where that line meets the square
  let hx = 0,
    hy = 0,
    hk = 0;
  if (still && Pn.on) {
    const nx = Pn.ax ? Pn.sn : 0,
      nz = Pn.ax ? 0 : Pn.sn,
      nf = nx * fx + nz * fz;
    if (nf > 0.2) {
      hx = 0.5 + (0.5 * (nx * rx + nz * rz)) / (nf * tn);
      hy = 0.5 + (0.5 * (nx * ux + nz * uz)) / (nf * tn);
      hk = 0.55;
    }
  }
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  pass(VF.glassP, VF.glass, (u) => {
    bindTex(0, VF.scene.tex, u.uSrc);
    gl.uniform2f(u.uTexel, 1 / VF.S, 1 / VF.S);
    gl.uniform3f(u.uEye, e[0], e[1], e[2]);
    gl.uniform3f(u.uRt, rx, ry, rz);
    gl.uniform3f(u.uUp, ux, uy, uz);
    gl.uniform3f(u.uFw, fx, fy, fz);
    gl.uniform1f(u.uTan, tn);
    gl.uniform4f(u.uPl, Pn.ax, Pn.c, Pn.a0, Pn.a1);
    gl.uniform1f(u.uShift, Pn.shift);
    gl.uniform1f(u.uSoft, 0.05 * fd * tn + 0.004); // the near frame out of focus: about a twentieth of the square
    gl.uniform1f(u.uFrame, clamp((2.2 - fd) / 1.4, 0, 1) * 0.85); // further off, the cut keeps the wall out of shot
    gl.uniform1f(u.uRefl, Pn.refl);
    gl.uniform1f(u.uK, Pn.k * (1 - sstep(3, 9, fd) * 0.4));
    gl.uniform1f(u.uWet, G ? G.wet || 0 : 0);
    gl.uniform1f(u.uTime, R.time);
    gl.uniform1f(u.uStill, still ? 1 : 0);
    gl.uniform3f(u.uNear, Pn.near[0], Pn.near[1], Pn.near[2]);
    gl.uniform3f(u.uHot, hx, hy, hk);
    gl.uniform4fv(u.uLook, LOOK.vec);
  });
  return VF.glass;
}
