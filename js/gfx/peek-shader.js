//@ gfx/peek-shader — The rummage close-up's light: its own shader, the lamp's shadow, the depth of field
//@ Defines: PK_VS, PK_FS, PK_SHADOW_VS, PK_SHADOW_FS, PK_DOF_FS
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the rummage close-up's light (gfx/peek). Not the town's shader: there is no light map in there, no fog
// of war, no cartoon fill. One lamp from above with a real shadow, a soft fill from the room, a rim from behind, and
// every surface painted by what it's made of (gfx/peek-geo PKM): the fibres in cardboard, the grain of a drawer, the
// print on a newspaper, a fingertip's skin. The town's grade still goes over it (gfx/frame composite), so when the
// town turns, so does what's in your hands.
const PK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in vec4 aExt;
uniform mat4 uVP, uModel, uLVP;
out vec3 vW; out vec3 vN; out vec3 vC; out vec4 vE; out vec3 vO; out vec4 vL; out float vD;
void main(){
  vec4 w = uModel*vec4(aPos, 1.0);
  vW = w.xyz; vN = mat3(uModel)*aNor; vC = aCol; vE = aExt; vO = aPos; vL = uLVP*w;
  gl_Position = uVP*w; vD = gl_Position.w;
}`;
const PK_FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec3 vC; in vec4 vE; in vec3 vO; in vec4 vL; in float vD;
uniform vec3 uEye; uniform float uTime; uniform float uFar;
uniform vec3 uKeyP; uniform vec3 uKeyD; uniform vec3 uKeyC; uniform vec2 uKeyCone;
uniform vec3 uSky; uniform vec3 uGnd; uniform vec3 uRimP; uniform vec3 uRimC;
uniform sampler2DShadow uShadow; uniform vec2 uShTexel;
uniform vec3 uBoxA; uniform vec3 uBoxB; uniform float uBoxK;
uniform vec4 uOcc[6]; uniform int uOccN;
uniform vec3 uTint; uniform float uEmitK; uniform float uGlass;
out vec4 frag;
const float PI = 3.14159265;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float h13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y)*p.z); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return vn(p)*0.5 + vn(p*2.03 + 7.1)*0.3 + vn(p*4.1 + 3.3)*0.2; }
// a few lines of print: rows of words, ragged at the end of a paragraph
float print(vec2 q, float rows, float words, float sd){
  float r = floor(q.y*rows), fy = fract(q.y*rows);
  float line = smoothstep(0.22, 0.3, fy)*smoothstep(0.74, 0.66, fy);
  float w = floor(q.x*words), fw = fract(q.x*words);
  float word = step(0.1, fw)*step(fw, 0.35 + 0.6*h12(vec2(w, r + sd)));
  float endl = step(q.x, h12(vec2(r, sd*3.1)) < 0.2 ? 0.3 + 0.5*h12(vec2(r, sd)) : 1.0);
  float ch = smoothstep(0.15, 0.35, fract(q.x*words*5.0 + h12(vec2(w, r))));
  return line*word*endl*(0.55 + 0.45*ch);
}
float inR(vec2 q, vec2 a, vec2 b){ return step(a.x, q.x)*step(q.x, b.x)*step(a.y, q.y)*step(q.y, b.y); }
float ell(vec2 q, vec2 c, vec2 r){ vec2 d = (q - c)/r; return 1.0 - smoothstep(0.85, 1.0, dot(d, d)); }
// halftone: a tone as the dots of a newspaper photo
float dots(vec2 q, float tone, float k){ vec2 g = fract(q*k) - 0.5; return 1.0 - smoothstep(0.0, 0.08, length(g) - sqrt(max(1.0 - tone, 0.0))*0.5); }
vec3 bumped(vec3 n, float hh){
  vec3 dpx = dFdx(vW), dpy = dFdy(vW);
  float dhx = dFdx(hh), dhy = dFdy(hh);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1)*(gl_FrontFacing ? 1.0 : -1.0);
  vec3 gr = sign(det)*(dhx*r1 + dhy*r2);
  return normalize(abs(det)*n - gr);
}
const vec2 PD[8] = vec2[8](vec2(-0.613,0.617), vec2(0.170,-0.040), vec2(-0.299,0.791), vec2(0.645,0.493),
  vec2(-0.651,-0.718), vec2(0.421,0.027), vec2(-0.817,-0.271), vec2(0.977,-0.108));
float shade(float ndl){
  vec3 p = vL.xyz/vL.w*0.5 + 0.5;
  if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float bias = 0.0006 + 0.0022*(1.0 - clamp(ndl, 0.0, 1.0)), s = 0.0;
  for(int i = 0; i < 8; i++) s += texture(uShadow, vec3(p.xy + PD[i]*uShTexel*2.2, p.z - bias));
  return s/8.0;
}
// the insides of the thing you have your hand in: dark in the corners and darker the further down
float boxAO(vec3 p, vec3 n){
  if(uBoxK <= 0.0) return 1.0;
  vec3 a = p - uBoxA, b = uBoxB - p;
  if(min(min(a.x, a.z), min(b.x, b.z)) < -0.01 || a.y < -0.01 || b.y < -0.06) return 1.0;
  float k = 1.0;
  k *= 1.0 - 0.45*exp(-max(a.x, 0.0)/0.03)*(1.0 - max(n.x, 0.0)*0.6);
  k *= 1.0 - 0.45*exp(-max(b.x, 0.0)/0.03)*(1.0 - max(-n.x, 0.0)*0.6);
  k *= 1.0 - 0.45*exp(-max(a.z, 0.0)/0.03)*(1.0 - max(n.z, 0.0)*0.6);
  k *= 1.0 - 0.45*exp(-max(b.z, 0.0)/0.03)*(1.0 - max(-n.z, 0.0)*0.6);
  k *= 1.0 - 0.4*exp(-max(a.y, 0.0)/0.02)*(1.0 - max(n.y, 0.0)*0.4);
  float depth = clamp(a.y/max(uBoxB.y - uBoxA.y, 0.01), 0.0, 1.0);
  return mix(1.0, k*mix(0.45, 1.0, depth), uBoxK);
}
// the things lying in there, and your hand: a soft dark under each
float occAO(vec3 p, vec3 n){
  float k = 1.0;
  for(int i = 0; i < 6; i++){
    if(i >= uOccN) break;
    vec3 d = uOcc[i].xyz - p; float l = length(d), r = uOcc[i].w;
    if(l < r*0.9) continue;
    k *= 1.0 - clamp(r*r/(l*l)*max(dot(n, d/l), 0.0)*0.9, 0.0, 0.8);
  }
  return k;
}
void main(){
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 V = normalize(uEye - vW);
  vec3 base = pow(max(vC, vec3(0.0)), vec3(2.2))*uTint, c = base, em = vec3(0.0);
  float r = 0.6, met = 0.0, f0 = 0.04, wrap = 0.0, sheen = 0.0, alpha = 1.0, h = 0.0, bk = 0.0, sss = 0.0;
  int m = int(vE.y + 0.5);
  float face = floor(vE.z); vec2 q = vec2(fract(vE.z), vE.w);
  vec3 o = vO;
  vec3 an = abs(n);
  vec2 tp = an.y > max(an.x, an.z) ? o.xz : (an.x > an.z ? o.zy : o.xy);   // a flat projection for cloth and grain
  if(m == 0){ c *= 0.96 + 0.08*vn(o*160.0); r = 0.55; h = vn(o*500.0); bk = 0.00008; }
  else if(m == 1){ float f = fbm(o*75.0); c *= 0.8 + 0.36*f; c *= 0.94 + 0.08*vn(vec3(tp*vec2(420.0, 50.0), 1.0));
    r = 0.92; f0 = 0.03; wrap = 0.15; h = f; bk = 0.0005; }
  else if(m == 2){ float g = fbm(vec3(o.x*3.0, o.y*55.0, o.z*55.0)); float ring = fract(g*7.0 + o.x*1.5);
    c *= 0.72 + 0.38*smoothstep(0.0, 0.7, ring); c *= 0.9 + 0.12*vn(o*vec3(30.0, 300.0, 300.0)); r = 0.42; h = ring; bk = 0.00025; }
  else if(m == 3){ c *= 0.95 + 0.07*vn(o*520.0); r = 0.85; wrap = 0.35; h = vn(o*300.0); bk = 0.00012; }
  else if(m == 4){ c *= 0.92 + 0.1*fbm(o*30.0);
    float cu = fract(q.x*3.0), ci = floor(q.x*3.0), inCol = step(0.05, cu)*step(cu, 0.95);
    float ink = print(vec2((cu - 0.05)/0.9, q.y), 64.0, 5.0, ci)*inCol*step(q.y, 0.8);
    ink = max(ink, step(0.84, q.y)*step(q.y, 0.95)*step(0.05, q.x)*step(q.x, 0.95)*print(vec2(q.x, (q.y - 0.84)/0.11), 1.0, 3.0, 7.0)*1.4);
    float pic = (ci == 1.0 ? 1.0 : 0.0)*inR(vec2(cu, q.y), vec2(0.08, 0.46), vec2(0.92, 0.74));
    ink = mix(ink, dots(q*vec2(1.0, 1.4), 0.35 + 0.4*fbm(vec3(q*6.0, 2.0)), 90.0), pic);
    c = mix(c, vec3(0.06, 0.055, 0.05), clamp(ink, 0.0, 1.0)*0.85); r = 0.9; wrap = 0.35; }
  else if(m == 5){ c *= 0.95 + 0.05*vn(o*400.0);
    float rule = smoothstep(0.03, 0.0, abs(fract(q.y*13.0) - 0.15))*0.35;
    float row = floor(q.y*13.0), fy = fract(q.y*13.0);
    float wave = abs(fy - 0.5 - 0.12*sin(q.x*150.0 + row*2.7) - 0.06*sin(q.x*47.0 + row));
    float pen = smoothstep(0.07, 0.03, wave)*step(0.08, q.x)*step(q.x, 0.62 + 0.3*h12(vec2(row, 3.0)))*step(0.18, h12(vec2(floor(q.x*7.0), row)))*step(q.y, 0.9)*step(0.1, q.y);
    c = mix(c, vec3(0.62, 0.72, 0.9), rule); c = mix(c, vec3(0.07, 0.1, 0.32), pen); r = 0.85; wrap = 0.35; }
  else if(m == 6){ float ink = print(vec2((q.x - 0.1)/0.8, q.y), 36.0, 4.0, 2.0)*inR(q, vec2(0.1, 0.1), vec2(0.9, 0.82));
    ink = max(ink, inR(q, vec2(0.3, 0.86), vec2(0.7, 0.92)));
    ink = max(ink, step(0.5, fract(q.x*26.0))*inR(q, vec2(0.1, 0.36), vec2(0.9, 0.37)));
    c = mix(c, vec3(0.28, 0.28, 0.3), ink*0.75); r = 0.7; wrap = 0.35; }
  else if(m == 7){ vec2 cell = floor(q*vec2(34.0, 44.0)); vec2 f = fract(q*vec2(34.0, 44.0)) - 0.5 - (vec2(h12(cell), h12(cell + 4.1)) - 0.5)*0.6;
    float st = step(0.82, h12(cell + 9.0))*(1.0 - smoothstep(0.02, 0.09 + 0.08*h12(cell + 2.0), length(f)));
    float grid = smoothstep(0.004, 0.0, abs(fract(length(q - 0.5)*8.0) - 0.5) - 0.497) + smoothstep(0.003, 0.0, abs(fract(q.x*6.0) - 0.5) - 0.497)*0.6;
    float ring = smoothstep(0.009, 0.0, abs(length((q - vec2(0.64, 0.4))*vec2(1.0, 1.3)) - 0.075));
    c = mix(c, vec3(0.75, 0.78, 0.82), st*0.9 + grid*0.12);
    em += vec3(0.2, 1.0, 0.55)*ring*(0.7 + 0.3*sin(uTime*2.2))*uEmitK + vec3(0.6, 0.7, 0.9)*st*0.15; r = 0.8; }
  else if(m == 8){ c *= 0.9 + 0.12*fbm(o*40.0); c *= 1.0 - 0.3*smoothstep(0.55, 0.8, fbm(o*55.0 + 3.0));
    float ink = print(vec2((q.x - 0.47)/0.47, q.y), 30.0, 4.0, 3.0)*inR(q, vec2(0.47, 0.42), vec2(0.94, 0.8));
    ink = max(ink, print(vec2((q.x - 0.06)/0.88, q.y), 30.0, 6.0, 5.0)*inR(q, vec2(0.06, 0.06), vec2(0.94, 0.38)));
    ink = max(ink, inR(q, vec2(0.08, 0.86), vec2(0.92, 0.94))*print(vec2(q.x, (q.y - 0.86)/0.08), 1.0, 2.5, 1.0)*1.3);
    float pf = inR(q, vec2(0.07, 0.42), vec2(0.42, 0.8));
    float tone = 0.45 + 0.1*q.y;
    tone = mix(tone, 0.12, ell(q, vec2(0.245, 0.48), vec2(0.15, 0.09)));
    tone = mix(tone, 0.72, ell(q, vec2(0.245, 0.63), vec2(0.07, 0.1)));
    tone = mix(tone, 0.2, ell(q, vec2(0.245, 0.71), vec2(0.075, 0.035)));
    tone -= 0.4*(ell(q, vec2(0.22, 0.64), vec2(0.012, 0.008)) + ell(q, vec2(0.27, 0.64), vec2(0.012, 0.008)));
    ink = mix(ink, dots(q*vec2(1.0, 1.25), tone, 120.0), pf);
    c = mix(c, vec3(0.09, 0.07, 0.05), clamp(ink, 0.0, 1.0)*0.8); r = 0.9; wrap = 0.3; }
  else if(m == 9){ float bd = inR(q, vec2(0.06, 0.06), vec2(0.94, 0.94));
    vec3 im = mix(vec3(0.42, 0.4, 0.28), vec3(0.62, 0.66, 0.72), smoothstep(0.35, 0.6, q.y));
    im = mix(im, vec3(0.32, 0.16, 0.13), ell(q, vec2(0.5, 0.3), vec2(0.17, 0.22)));
    im = mix(im, vec3(0.78, 0.6, 0.5), ell(q, vec2(0.5, 0.58), vec2(0.075, 0.09)));
    im = mix(im, vec3(0.2, 0.14, 0.1), ell(q, vec2(0.5, 0.64), vec2(0.08, 0.045)));
    im = mix(im*0.9 + 0.05, vec3(dot(im, vec3(0.33))), 0.25)*vec3(1.05, 0.97, 0.82);
    c = mix(vec3(0.9, 0.88, 0.82), pow(im, vec3(2.2)), bd); r = 0.18; f0 = 0.05; }
  else if(m == 10){ vec2 p = tp*vec2(230.0, 170.0); float kx = fract(p.x), ky = fract(p.y + abs(kx - 0.5)*0.9);
    float st = smoothstep(0.0, 0.35, ky)*smoothstep(1.0, 0.55, ky)*(1.0 - 0.6*smoothstep(0.3, 0.5, abs(kx - 0.5)));
    c *= 0.62 + 0.48*st; c *= 0.92 + 0.12*vn(o*90.0); r = 1.0; sheen = 0.55; wrap = 0.2; h = st; bk = 0.0007; }
  else if(m == 11){ vec2 p = tp*520.0; float w = 0.5 + 0.5*sin(p.x)*sin(p.y);
    c *= 0.9 + 0.12*w; c *= 0.95 + 0.08*vn(o*60.0); r = 0.95; sheen = 0.35; wrap = 0.15; h = w; bk = 0.00015; }
  else if(m == 12){ met = 1.0; r = 0.28 + 0.18*vn(o*vec3(700.0, 25.0, 25.0)); c *= 0.9 + 0.12*vn(o*vec3(900.0, 30.0, 30.0)); }
  else if(m == 13){ met = 1.0; r = 0.3; c *= 0.78 + 0.25*fbm(o*90.0); h = fbm(o*200.0); bk = 0.00006; }
  else if(m == 14){ r = 0.05; f0 = 0.05; }
  else if(m == 15){ c *= 0.92 + 0.12*vn(o*260.0); c = mix(c, c*vec3(1.08, 0.86, 0.84), vn(o*90.0)*0.4);
    r = 0.5; f0 = 0.028; wrap = 0.4; sss = 0.6; h = vn(o*1500.0)*0.7 + vn(o*vec3(80.0, 900.0, 80.0))*0.3; bk = 0.00007; }
  else if(m == 16){ c = mix(c, vec3(0.92, 0.82, 0.78), 0.4); r = 0.22; f0 = 0.04; wrap = 0.3; }
  else if(m == 17){ r = 0.32; f0 = 0.045; c *= 0.97 + 0.05*vn(o*300.0); }
  else if(m == 18){ float f = fbm(o*vec3(26.0, 70.0, 26.0)); float rg = 1.0 - abs(f*2.0 - 1.0);
    r = 0.24; f0 = 0.05; h = rg*rg; bk = 0.004; c *= 0.85 + 0.2*rg; }
  else if(m == 19){ float f = fbm(o*85.0); float fat = smoothstep(0.6, 0.68, f);
    c = mix(c*(0.8 + 0.3*fbm(o*30.0)), vec3(0.85, 0.78, 0.66), fat); r = 0.2 + fat*0.25; f0 = 0.03; wrap = 0.45; sss = 0.6; h = f; bk = 0.0006; }
  else if(m == 20){ vec2 p = tp*vec2(150.0, 170.0); p.x += floor(p.y)*0.5; vec2 f = fract(p) - 0.5;
    float e = smoothstep(0.32, 0.48, max(abs(f.x)*1.2, abs(f.y) + abs(f.x)*0.4));
    c *= 0.72 + 0.4*(1.0 - e); c *= 0.9 + 0.15*vn(o*40.0); r = 0.55; wrap = 0.7; sheen = 0.25; h = 1.0 - e; bk = 0.00035; }
  else if(m == 21){ float band = inR(q, vec2(0.04, 0.32), vec2(0.42, 0.74));
    float ink = print(vec2((q.x - 0.06)/0.34, (q.y - 0.35)/0.36), 7.0, 3.0, 4.0)*band;
    float emb = ell(q, vec2(0.7, 0.54), vec2(0.13, 0.2));
    float gold = smoothstep(0.012, 0.0, abs(q.y - 0.14)) + smoothstep(0.012, 0.0, abs(q.y - 0.88));
    c = mix(c, vec3(0.92, 0.88, 0.78), band); c = mix(c, vec3(0.12, 0.08, 0.06), ink*0.8);
    c = mix(c, vec3(0.75, 0.12, 0.08), emb*0.9); c = mix(c, vec3(0.8, 0.62, 0.25), clamp(gold, 0.0, 1.0));
    r = 0.38; f0 = 0.04; }
  else if(m == 22){
    if(face == 2.0 || face == 3.0 || face == 5.0){ float l = face == 3.0 ? q.x : q.y;
      c = vec3(0.86, 0.82, 0.7)*(0.88 + 0.12*sin(l*900.0)*0.5 + 0.06*vn(o*300.0)); r = 0.9; wrap = 0.2; }
    else { vec2 p = tp*420.0; c *= 0.85 + 0.12*sin(p.x)*sin(p.y) + 0.1*vn(o*50.0); r = 0.7; sheen = 0.2;
      if(face == 4.0){ float b = smoothstep(0.01, 0.0, abs(q.y - 0.12) - 0.012) + smoothstep(0.01, 0.0, abs(q.y - 0.88) - 0.012);
        float t = inR(q, vec2(0.3, 0.42), vec2(0.7, 0.7))*print(vec2((q.x - 0.3)/0.4, (q.y - 0.42)/0.28), 4.0, 1.5, 6.0);
        c = mix(c, vec3(0.75, 0.58, 0.25), clamp(b + t, 0.0, 1.0)); met = clamp(b + t, 0.0, 1.0)*0.8; } } }
  else if(m == 23){ c *= 0.9 + 0.14*vn(o*700.0); c = mix(c, c*vec3(0.8, 0.72, 0.55), smoothstep(0.5, 0.8, fbm(o*120.0))*0.6);
    r = 0.34; wrap = 0.35; sss = 0.3; h = vn(o*900.0); bk = 0.00005; }
  else if(m == 24){ c *= 0.75 + 0.4*fbm(o*500.0); r = 1.0; sheen = 0.9; wrap = 0.4; h = fbm(o*700.0); bk = 0.0008; }
  else if(m == 25){ c *= 0.95 + 0.06*vn(o*200.0); r = 0.42; f0 = 0.035; wrap = 0.35; sss = 0.4;
    float feat = ell(q, vec2(0.34, 0.6), vec2(0.07, 0.04)) + ell(q, vec2(0.66, 0.6), vec2(0.07, 0.04)) + ell(q, vec2(0.5, 0.28), vec2(0.13, 0.03));
    c = mix(c, vec3(0.03), clamp(feat, 0.0, 1.0)); c = mix(c, c*vec3(0.85, 0.55, 0.5), ell(q, vec2(0.5, 0.42), vec2(0.06, 0.08))*0.5); }
  else if(m == 26){ vec2 p = tp*150.0; vec2 ce = floor(p), f = fract(p) - 0.5;
    float tx = step(abs(f.y), 0.07)*step(0.45, h12(ce)), ty = step(abs(f.x), 0.07)*step(0.62, h12(ce + 3.0));
    float pad = 1.0 - smoothstep(0.16, 0.22, length(f)); pad *= step(0.7, h12(ce + 7.0));
    float tr = clamp(tx + ty, 0.0, 1.0);
    c = mix(c*(0.9 + 0.1*vn(o*300.0)), c*1.6, tr*0.6); c = mix(c, vec3(0.78, 0.76, 0.7), pad);
    met = pad*0.9; r = mix(0.4, 0.25, pad); h = max(tr*0.4, pad); bk = 0.00012; }
  else if(m == 27){ r = 0.08; f0 = 0.05; h = fbm(o*120.0); bk = 0.0004; }
  else if(m == 28){ float f = fbm(o*180.0); c *= 0.75 + 0.4*f; float pore = smoothstep(0.7, 0.78, vn(o*420.0));
    c *= 1.0 - pore*0.4; r = 0.85; wrap = 0.2; h = f - pore; bk = 0.0006; }
  else if(m == 29){ c *= 0.88 + 0.16*vn(o*700.0); r = 1.0; sheen = 0.4; h = vn(o*900.0); bk = 0.0001; }
  else if(m == 30){ float fr = 1.0 - inR(q, vec2(0.05, 0.08), vec2(0.95, 0.92)) + (1.0 - inR(q, vec2(0.07, 0.12), vec2(0.93, 0.88)))*0.5;
    float gu = smoothstep(0.35, 0.0, abs(sin(q.x*150.0 + sin(q.y*25.0)*3.0)))*0.35;
    float por = ell(q, vec2(0.32, 0.5), vec2(0.13, 0.3));
    float num = ell(q, vec2(0.86, 0.75), vec2(0.06, 0.12)) + ell(q, vec2(0.14, 0.25), vec2(0.05, 0.1));
    c = mix(c, c*0.55, clamp(fr*0.5 + gu + num*0.6, 0.0, 1.0)); c = mix(c, c*0.5 + 0.04, por*(0.5 + 0.5*vn(vec3(q*40.0, 1.0))));
    r = 0.8; wrap = 0.25; }
  else if(m == 31){ int fv = face < 0.5 ? 1 : face < 1.5 ? 6 : face < 2.5 ? 2 : face < 3.5 ? 5 : face < 4.5 ? 3 : 4;
    float pip = 0.0;
    vec2 P[7] = vec2[7](vec2(0.5), vec2(0.26, 0.26), vec2(0.74, 0.74), vec2(0.26, 0.74), vec2(0.74, 0.26), vec2(0.26, 0.5), vec2(0.74, 0.5));
    for(int i = 0; i < 7; i++){
      bool on = (i == 0 && (fv == 1 || fv == 3 || fv == 5)) || ((i == 1 || i == 2) && fv >= 2) || ((i == 3 || i == 4) && fv >= 4) || (i >= 5 && fv == 6);
      if(on) pip = max(pip, 1.0 - smoothstep(0.075, 0.095, length(q - P[i])));
    }
    c = mix(c, vec3(0.04, 0.03, 0.03), pip); r = 0.22; f0 = 0.045; h = -pip; bk = 0.0004; wrap = 0.2; }
  else if(m == 32){ float rho = q.y;
    float tick = step(0.78, rho)*step(rho, 0.92)*step(abs(fract(q.x*12.0 + 0.5) - 0.5), 0.035);
    float hh = smoothstep(0.035, 0.0, abs(fract(q.x - 0.83 + 0.5) - 0.5)*rho*6.0)*step(rho, 0.5);
    float mh = smoothstep(0.03, 0.0, abs(fract(q.x - 0.17 + 0.5) - 0.5)*rho*6.0)*step(rho, 0.78);
    c = mix(c, vec3(0.05), clamp(tick + hh + mh, 0.0, 1.0)); r = 0.4; }
  else if(m == 33){ r = 0.2; em += base*4.0*uEmitK; }
  else if(m == 34){ met = 1.0; r = 0.3; vec2 p = vec2(cos(q.x*6.2831853), sin(q.x*6.2831853))*q.y*5.0; p.y *= 1.6; p.x += floor(p.y)*0.5;
    float s = length(vec2(fract(p.x) - 0.5, fract(p.y)*0.9 - 0.2)); float sc = smoothstep(0.42, 0.5, s)*step(q.y, 0.8);
    float rim = smoothstep(0.86, 0.9, q.y); c *= 0.85 + 0.2*fbm(o*120.0); c *= 1.0 - sc*0.3; h = (1.0 - sc)*0.6 + rim; bk = 0.00018; }
  else if(m == 35){ vec2 p = vec2(o.x*260.0, o.y*300.0); p.y += floor(p.x)*0.5; vec2 f = fract(p);
    float sc = smoothstep(0.3, 0.5, length(vec2(f.x, f.y - 0.5)));
    c *= 0.82 + 0.3*(1.0 - sc); r = 0.16; f0 = 0.07; h = 1.0 - sc; bk = 0.00015;
    c += vec3(0.04, 0.06, 0.09)*pow(1.0 - max(dot(n, V), 0.0), 2.0); }
  else if(m == 36){ r = 0.28; f0 = 0.05; c *= 0.92 + 0.1*vn(o*vec3(40.0, 400.0, 40.0)); wrap = 0.3; }
  else if(m == 37){ r = 0.18; f0 = 0.04; c *= 0.97 + 0.04*vn(o*80.0); }
  else if(m == 38){ float f = fbm(o*90.0); float rg = 1.0 - abs(f*2.0 - 1.0); met = 0.85; r = 0.22 + 0.2*rg; h = rg; bk = 0.0012; }
  else if(m == 39){ r = 0.6; c *= 0.85 + 0.2*vn(o*600.0); h = vn(o*900.0); bk = 0.00012; sheen = 0.15; }
  if(bk > 0.0) n = bumped(n, h*bk);
  float ndv = max(dot(n, V), 1e-3);
  // the lamp: where its cone falls, and what stands in the way
  vec3 L = -uKeyD;   // a lamp far enough off to throw parallel light; uKeyP only says where its cone comes from
  float cone = smoothstep(uKeyCone.y, uKeyCone.x, dot(normalize(vW - uKeyP), uKeyD));
  float ndl = dot(n, L), dl = max(ndl, 0.0);
  float sh = shade(ndl)*cone;
  float dw = wrap > 0.0 ? max((ndl + wrap)/(1.0 + wrap), 0.0) : dl;
  vec3 H = normalize(L + V);
  float rr = max(r, 0.05), a2 = rr*rr*rr*rr, ndh = max(dot(n, H), 0.0), dd = ndh*ndh*(a2 - 1.0) + 1.0;
  float D = a2/(PI*dd*dd), kk = (rr + 1.0)*(rr + 1.0)/8.0;
  float G = dl/(dl*(1.0 - kk) + kk)*ndv/(ndv*(1.0 - kk) + kk);
  vec3 F0 = mix(vec3(f0), c, met);
  vec3 F = F0 + (1.0 - F0)*pow(1.0 - max(dot(V, H), 0.0), 5.0);
  vec3 spec = D*G*F/(4.0*dl*ndv + 1e-3)*dl;
  vec3 dif = c*(1.0 - met);
  vec3 col = (dif*dw + spec*PI*0.5)*uKeyC*sh;
  if(sss > 0.0) col += dif*vec3(1.0, 0.32, 0.22)*max(dw - dl, 0.0)*uKeyC*cone*sss*0.9;
  // the room: a soft light from all round, less of it the deeper in
  float ao = boxAO(vW, n)*occAO(vW, n);
  vec3 amb = mix(uGnd, uSky, n.y*0.5 + 0.5)*ao;
  vec3 R = reflect(-V, n);
  vec3 env = mix(uGnd, uSky*1.4, smoothstep(-0.3, 0.8, R.y)) + uKeyC*0.12*pow(max(dot(R, L), 0.0), mix(60.0, 3.0, r))*cone;
  vec3 Fe = F0 + (max(vec3(1.0 - r), F0) - F0)*pow(1.0 - ndv, 5.0);
  col += dif*amb + env*Fe*ao*mix(0.35, 1.0, met);
  col += c*sheen*pow(1.0 - ndv, 3.0)*(uKeyC*cone*0.25 + amb);
  vec3 Lr = normalize(uRimP - vW);
  col += uRimC*pow(1.0 - ndv, 3.0)*max(dot(n, Lr), 0.0)*(1.0 - met*0.5)*ao;
  col += em + base*vE.x*uEmitK*2.0;
  col = pow(max(col, vec3(0.0)), vec3(1.0/2.2));
  float depth = clamp(vD/uFar, 0.0, 1.0);
  if(uGlass > 0.5){
    float fr = pow(1.0 - ndv, 4.0);
    frag = vec4(col, clamp(mix(m == 27 ? 0.55 : 0.1, 0.85, fr) + length(spec)*0.3, 0.0, 0.95)); return;
  }
  frag = vec4(col, depth);
}`;
const PK_SHADOW_VS = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uLVP, uModel;
void main(){ gl_Position = uLVP*uModel*vec4(aPos, 1.0); }`;
const PK_SHADOW_FS = `#version 300 es
precision mediump float;
out vec4 frag;
void main(){ frag = vec4(1.0); }`;
// a macro lens: only a sliver of it is sharp. The depth rides in the alpha; each pixel gathers what blurs over it.
const PK_DOF_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uFocus; uniform float uAper; uniform float uFar;
out vec4 frag;
float coc(float a){ float d = max(a*uFar, 0.01); return clamp(abs(d - uFocus)/d*uAper, 0.0, 1.0); }
void main(){
  vec4 c0 = texture(uSrc, vUv);
  float d0 = c0.a, k0 = coc(d0), R = 8.0;
  if(d0 >= 0.999) k0 = 1.0;
  vec3 acc = c0.rgb; float w = 1.0;
  float sc = R*mix(0.45, 1.0, k0);
  for(int i = 1; i < 28; i++){
    float fi = float(i), r = sqrt(fi/28.0)*sc, a = fi*2.39996;
    vec4 s = texture(uSrc, vUv + vec2(cos(a), sin(a))*r*uTexel);
    float ks = s.a >= 0.999 ? 1.0 : coc(s.a);
    float cover = s.a < d0 ? ks : min(ks, k0);
    float wt = clamp(cover*R - r + 1.0, 0.0, 1.0);
    acc += s.rgb*wt; w += wt;
  }
  frag = vec4(acc/w, 1.0);
}`;
