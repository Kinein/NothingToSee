//@ gfx/post — Post-processing: bloom chain and composite; primitive meshes
//@ Defines: QVS, BRIGHT_FS, DOWN_FS, UP_FS, COMP_FS, compileProgram, uploadGeo, makeMesh, makeTex, makeColorTex, makeTarget, freeTarget, PRIM, initPrims
//@ Uses:    gfx/gl, gfx/renderer, core/util, gfx/body-parts
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── post-processing
const QVS = `#version 300 es
out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv = p; gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;
const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uTh; uniform float uKnee; out vec4 frag;
void main(){
  vec3 c = texture(uSrc, vUv + uTexel*vec2(-0.5,-0.5)).rgb + texture(uSrc, vUv + uTexel*vec2(0.5,-0.5)).rgb
         + texture(uSrc, vUv + uTexel*vec2(-0.5,0.5)).rgb + texture(uSrc, vUv + uTexel*vec2(0.5,0.5)).rgb;
  c *= 0.25;
  if(any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c = clamp(c, vec3(0.0), vec3(60.0));
  float br = max(c.r, max(c.g, c.b));
  float s = clamp(br - uTh + uKnee, 0.0, 2.0*uKnee); s = s*s/(4.0*uKnee + 1e-4);
  float k = max(s, br - uTh)/max(br, 1e-4);
  frag = vec4(min(c*k, vec3(20.0)), 1.0);
}`;
const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 frag;
void main(){ vec2 o = uTexel; vec3 s = texture(uSrc, vUv).rgb*4.0;
  s += texture(uSrc, vUv - o).rgb; s += texture(uSrc, vUv + o).rgb;
  s += texture(uSrc, vUv + vec2(o.x,-o.y)).rgb; s += texture(uSrc, vUv - vec2(o.x,-o.y)).rgb;
  frag = vec4(s/8.0, 1.0); }`;
const UP_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; out vec4 frag;
void main(){ vec2 o = uTexel; vec3 s = vec3(0.0);
  s += texture(uSrc, vUv + vec2(-o.x*2.0, 0.0)).rgb; s += texture(uSrc, vUv + vec2(-o.x, o.y)).rgb*2.0;
  s += texture(uSrc, vUv + vec2(0.0, o.y*2.0)).rgb; s += texture(uSrc, vUv + vec2(o.x, o.y)).rgb*2.0;
  s += texture(uSrc, vUv + vec2(o.x*2.0, 0.0)).rgb; s += texture(uSrc, vUv + vec2(o.x, -o.y)).rgb*2.0;
  s += texture(uSrc, vUv + vec2(0.0, -o.y*2.0)).rgb; s += texture(uSrc, vUv + vec2(-o.x, -o.y)).rgb*2.0;
  frag = vec4(s/12.0, 1.0); }`;
const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uScene; uniform sampler2D uBloom; uniform sampler2D uMask;
uniform vec2 uRes; uniform float uTime; uniform float uBloomK; uniform float uBad; uniform float uFlash; uniform float uPulse; uniform float uSleep; uniform float uSat; uniform int uHasMask;
uniform float uNight; uniform float uDread; uniform float uDanger; uniform float uSel; uniform float uLetter; uniform float uJolt; uniform float uBlood; uniform float uBeat;
uniform float uStK; uniform float uSBeat;
uniform float uFade; uniform float uDaze; uniform float uLid; uniform vec3 uWash; uniform float uWashK;
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec3 shoulder(vec3 c){ vec3 t = max(c - 0.6, 0.0); return min(c, 0.6) + 0.4*(1.0 - exp(-t/0.4)); }
void main(){
  vec2 uv = vUv;
  float bad = uBad, jt = uJolt;
  uv += bad*0.0026*vec2(sin(uv.y*17.0 + uTime*1.3), cos(uv.x*13.0 + uTime*1.1));
  uv += uDread*0.0018*vec2(sin(uv.y*9.0 + uTime*0.7), cos(uv.x*7.0 + uTime*0.55));
  // a jolt tears the picture sideways in a few bands, like a tape catching
  if(jt > 0.002){ float fr = floor(uTime*24.0); float band = step(0.8, h21(vec2(floor(uv.y*28.0), fr))); uv.x += band*jt*0.035*(h21(vec2(fr, 3.1)) - 0.5); }
  vec2 d = uv - 0.5;
  float ca = 0.0019 + bad*0.006 + uDread*0.0035 + uDanger*0.004 + jt*0.012;
  vec3 col;
  col.r = texture(uScene, uv + d*ca).r;
  col.g = texture(uScene, uv).g;
  col.b = texture(uScene, uv - d*ca).b;
  col += texture(uBloom, uv).rgb*uBloomK;
  // half under: the picture swims, and doubles
  if(uDaze > 0.001){
    vec2 px = 1.0/uRes; float r = 1.2 + uDaze*5.5; vec3 acc = vec3(0.0);
    for(int i=0;i<10;i++){ float a = float(i)*0.6283 + uTime*0.35; float rr = r*(0.45 + 0.55*fract(float(i)*0.618)); acc += texture(uScene, uv + vec2(cos(a), sin(a))*px*rr).rgb; }
    acc /= 10.0;
    vec2 go = vec2(sin(uTime*0.63)*0.009 + 0.005, cos(uTime*0.47)*0.004)*uDaze;
    vec3 ghost = texture(uScene, uv + go).rgb*0.55 + texture(uScene, uv - go*0.7).rgb*0.45;
    col = mix(col, acc*0.5 + ghost*0.5 + texture(uBloom, uv).rgb*uBloomK, clamp(uDaze*0.95, 0.0, 0.85));
  }
  if(any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
  col = max(col, vec3(0.0));
  col = shoulder(col*1.2);
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, uSat - bad*0.12 - uDread*0.1);
  // grade: shadows sink toward a cold blue-teal, highlights go the colour of old sodium and nicotine
  col *= mix(vec3(0.68, 0.87, 1.0), vec3(1.08, 0.97, 0.8), smoothstep(0.015, 0.5, l));
  col = max(col - 0.003, 0.0)*1.01;
  { float lt = dot(col, vec3(0.299,0.587,0.114));
    col = mix(col, col*col*(3.0-2.0*col), 0.4*smoothstep(0.05, 0.32, lt));   // contrast in the mids, not by burying the shadows
    col = mix(pow(col, vec3(0.78)), col, smoothstep(0.0, 0.3, lt)); }        // a toe: the dark keeps its shape
  col *= mix(vec3(1.0), vec3(0.84, 0.92, 1.08), uNight*0.5);
  col = mix(col, col*vec3(1.25, 0.7, 0.66), uBlood*0.22);
  // stress: the town drains to ink and teal. What keeps its colour is the sodium and the blood.
  if(uStK > 0.002){
    float l3 = dot(col, vec3(0.299,0.587,0.114));
    float mx = max(col.r, max(col.g, col.b));
    float warm = clamp((col.r - col.b)/(mx + 1e-3)*1.6 - 0.25, 0.0, 1.0)*smoothstep(0.02, 0.1, mx);
    vec3 sc = mix(vec3(l3)*vec3(0.72, 0.98, 1.12), col*vec3(1.12, 0.9, 0.85), warm);
    sc = max((sc - 0.16)*1.14 + 0.16, sc*0.85);
    sc += vec3(0.0, 0.009, 0.013)*(1.0 - smoothstep(0.0, 0.12, l3))*smoothstep(0.0, 0.015, l3);
    col = mix(col, sc, clamp(uStK*1.15, 0.0, 1.0));
  }
  // the stylish bit: drain the world, keep the red
  float l2 = dot(col, vec3(0.299,0.587,0.114));
  float red = max(clamp((col.r - max(col.g, col.b))*5.0 - 0.05, 0.0, 1.0), smoothstep(0.55, 0.95, l2));
  col = mix(col, mix(vec3(l2)*vec3(0.92,0.97,1.04), col*vec3(1.25,0.85,0.85), red), uSel);
  // outlines from the mask: red = hover, green = goal
  if(uHasMask == 1){
    vec2 mt = 1.0/vec2(textureSize(uMask, 0));
    vec4 m0 = texture(uMask, vUv);
    vec2 mx = vec2(0.0);
    for(int i=0;i<8;i++){
      float a = float(i)*0.7853982; vec2 o = vec2(cos(a), sin(a));
      mx = max(mx, texture(uMask, vUv + o*mt*1.3).rg);
      mx = max(mx, texture(uMask, vUv + o*mt*2.6).rg*0.55);
    }
    vec2 edge = clamp(mx - m0.rg, 0.0, 1.0);
    col += vec3(0.06,0.045,0.02)*m0.r;
    col = mix(col, vec3(1.0,0.84,0.52), edge.r*0.95);
    float gp = 0.55 + 0.45*sin(uTime*3.4);
    col = mix(col, vec3(0.72,1.0,0.84), edge.g*gp*0.85);
  }
  // vignette, sleep, pulse, flash, grain
  float v = smoothstep(1.02, 0.2, length(d*vec2(1.0, 0.92))*(1.0 + bad*0.25 + uDread*0.25 + uDanger*0.3));
  col *= mix(0.56 - uNight*0.1, 1.0, v);
  col = mix(col, col*vec3(0.32,0.38,0.62), uSleep);
  col += vec3(0.55,0.06,0.03)*uPulse*(1.15 - v);
  // something close: the edges throb red with your heart
  col += vec3(0.42,0.015,0.01)*(1.0 - v)*uDanger*(0.25 + 0.75*uBeat);
  // breaking: your own pulse, in the red lamps and at the edges of things
  float redd = clamp((col.r - max(col.g, col.b))*4.0, 0.0, 1.0);
  col.r += col.r*uSBeat*0.25*redd*uStK;
  col += vec3(0.3,0.008,0.006)*(1.0 - v)*uSBeat*uStK*0.5;
  // a bad hour: black creeps in from the edges, the picture stutters, faint scanlines
  col *= 1.0 - uDread*0.16*(1.0 - v);
  col *= 1.0 - uDread*0.05*step(0.94, h21(vec2(floor(uTime*11.0), 7.0)));
  col *= 1.0 - (uDread*0.05 + jt*0.12)*step(0.5, fract(gl_FragCoord.y*0.5));
  col = mix(col, vec3(1.0,0.98,0.93), uFlash);
  float g = h21(vUv*uRes + vec2(fract(uTime*13.1)*97.0, fract(uTime*7.7)*61.0)) - 0.5;
  col += g*(0.03 + bad*0.05 + uDread*0.02)*(1.15 - min(l, 1.0)*0.4);
  // dust and the odd scratch on the film
  float sc = step(0.9985, h21(vec2(floor(vUv.x*uRes.x*0.5), floor(uTime*18.0))))*step(0.6, h21(vec2(floor(uTime*18.0), 2.0)));
  col += sc*0.05*(0.4 + uDread);
  // coming round and going under: the lids, a wash of light, the dark
  if(uLid > 0.001){
    float op = 1.0 - uLid, hh = op*(0.62 + 0.3*(1.0 - pow(abs(vUv.x - 0.5)*2.0, 2.0))), dy = abs(vUv.y - 0.5);
    float m = 1.0 - smoothstep(hh - 0.06, hh, dy);
    col = col*m + vec3(0.06, 0.006, 0.004)*(1.0 - m)*op*op;
  }
  col = mix(col, uWash, uWashK);
  col *= 1.0 - uFade;
  // cinema bars when something terrible is happening in front of you
  if(uLetter > 0.001){ float lb = uLetter*0.1; col *= smoothstep(lb - 0.002, lb + 0.002, vUv.y)*smoothstep(lb - 0.002, lb + 0.002, 1.0 - vUv.y); }
  frag = vec4(col, 1.0);
}`;

function compileProgram(vs, fs) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const U = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    U[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, U };
}
function uploadGeo(g) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = (loc, arr, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  buf(0, g.p, 3);
  buf(1, g.n, 3);
  buf(2, g.c, 3);
  buf(3, g.e, 4);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  // a bounding sphere in the mesh's own space, so the renderer can skip meshes that are off screen
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    z1 = -Infinity;
  for (let k = 0; k < g.p.length; k += 3) {
    const x = g.p[k],
      y = g.p[k + 1],
      z = g.p[k + 2];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  const bound = g.p.length
    ? [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2]
    : null;
  return { vao, count: g.i.length, bound };
}
function makeMesh(g, o) {
  return Object.assign(
    uploadGeo(g),
    {
      model: M4.ident(),
      tint: [1, 1, 1],
      emit: [0, 0, 0],
      emitMul: 1,
      hi: 0,
      dyn: 0,
      cut: 0,
      center: [0, 0, 0],
      show: true,
    },
    o || {},
  );
}
function makeTex(w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function makeColorTex(w, h, hdr) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  if (hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function makeTarget(w, h, hdr) {
  const tex = makeColorTex(w, h, hdr),
    fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex, w, h };
}
function freeTarget(t) {
  if (!t) return;
  gl.deleteFramebuffer(t.fb);
  gl.deleteTexture(t.tex);
}

const PRIM = {};
function initPrims() {
  const W1 = [1, 1, 1];
  let g = new Geo();
  g.box(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, W1);
  PRIM.box = uploadGeo(g);
  g = new Geo();
  g.cyl(0, -0.5, 0, 0.5, 0.5, 1, 10, W1);
  PRIM.cyl = uploadGeo(g);
  g = new Geo();
  g.cyl(0, -0.5, 0, 0.5, 0.42, 1, 10, W1);
  PRIM.limb = uploadGeo(g);
  g = new Geo();
  g.sphere(0, 0, 0, 0.5, 0.5, 0.5, 16, 12, W1);
  PRIM.sph = uploadGeo(g);
  g = new Geo();
  g.frustum(0, -0.5, 0, 0.8, 0.86, 1, 1, 1, W1);
  PRIM.chest = uploadGeo(g);
  g = new Geo();
  g.frustum(0, -0.5, 0, 1, 1, 0.84, 0.9, 1, W1);
  PRIM.skirt = uploadGeo(g);
  g = new Geo();
  g.quad([-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1], [0, 1, 0], W1);
  PRIM.quad = uploadGeo(g);
  // open cone, apex at origin, base radius 1 at y = -1
  g = new Geo();
  const seg = 22;
  for (let s = 0; s < seg; s++) {
    const a0 = (s / seg) * TAU,
      a1 = ((s + 1) / seg) * TAU;
    const n0 = [Math.cos(a0) / Math.SQRT2, 1 / Math.SQRT2, Math.sin(a0) / Math.SQRT2],
      n1 = [Math.cos(a1) / Math.SQRT2, 1 / Math.SQRT2, Math.sin(a1) / Math.SQRT2];
    const k = g.vc;
    g.vert(0, 0, 0, (n0[0] + n1[0]) / 2, n0[1], (n0[2] + n1[2]) / 2, W1);
    g.vert(Math.cos(a0), -1, Math.sin(a0), n0[0], n0[1], n0[2], W1);
    g.vert(Math.cos(a1), -1, Math.sin(a1), n1[0], n1[1], n1[2], W1);
    g.i.push(k, k + 1, k + 2);
  }
  PRIM.cone = uploadGeo(g);
  initBodyPrims();
}
