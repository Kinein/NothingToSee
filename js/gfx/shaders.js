//@ gfx/shaders — The main world shader (vertex + fragment): surfaces, lamps, fog of war, the horror layer
//@ Defines: VS, FS
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── main world shader
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in vec4 aExt;
uniform mat4 uVP, uView, uModel;
uniform int uCut; uniform vec3 uFocus; uniform vec3 uFocus2; uniform float uCutR; uniform float uWallsDown; uniform vec3 uCenter;
out vec3 vW; out vec3 vN; out vec3 vC; out vec2 vE; out float vDith;
float cutAt(vec3 c, vec3 fp, float rad){
  vec3 a = (uView*vec4(c,1.0)).xyz; vec3 f = (uView*vec4(fp,1.0)).xyz;
  float closer = smoothstep(-0.15, 0.55, a.z - f.z);
  float d = length(a.xy - f.xy);
  return closer * (1.0 - smoothstep(rad*0.6, rad, d));
}
float cutK(vec3 c){ return max(cutAt(c, uFocus, uCutR), cutAt(c, uFocus2, 3.2)); }
void main(){
  vec4 w = uModel*vec4(aPos,1.0);
  vN = normalize(mat3(uModel)*aNor); vC = aCol; vE = aExt.xy; vDith = 0.0;
  if(uCut==1){
    bool sink = aExt.z > 500.0;   // a door, or the lintel over a doorway: gone once the wall is cut, so the gap reads as a way through
    vec3 c = aExt.z > -0.5 ? vec3(aExt.z - (sink ? 1000.0 : 0.0), 1.0, aExt.w) : uCenter;
    float k = smoothstep(0.3, 0.75, max(cutK(c), uWallsDown));
    w.y = sink && k > 0.25 ? -0.6 : min(w.y, mix(2.8, 0.42, k));
  } else if(uCut==2){ vDith = cutK(uCenter); }
  vW = w.xyz; gl_Position = uVP*w;
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vW; in vec3 vN; in vec3 vC; in vec2 vE; in float vDith;
uniform sampler2D uLight; uniform sampler2D uVis; uniform vec2 uMap; uniform float uTime;
uniform vec3 uTint; uniform vec3 uEmit; uniform float uEmitMul; uniform float uHi; uniform float uDyn; uniform vec3 uFog;
uniform int uMode; uniform vec3 uMaskCol; uniform float uWet; uniform vec2 uFwd; uniform vec3 uSky; uniform float uEmitK;
// the horror layer: render-only lights and pools of dark (never touch the light map the game reads), dread, wet gloss, apparitions
uniform vec4 uXP[8]; uniform vec4 uXC[8]; uniform int uXN; uniform float uDread; uniform float uSpec; uniform vec3 uViewDir; uniform float uVisMin; uniform float uBlood;
// the lamps themselves, for what the light map can't do: a hot heart under each head, and their reflections in the wet
uniform vec4 uLP[12]; uniform vec4 uLC[12]; uniform int uLN; uniform float uRain; uniform float uHaze; uniform float uStK;
uniform float uChar; uniform vec3 uRimC;
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
// rain landing in standing water: rings that spread and fade, as a tilt of the surface
vec2 ripples(vec2 p, float t){
  vec2 acc = vec2(0.0);
  for(int l=0;l<2;l++){
    float fl = float(l);
    vec2 q = p*(2.6 + fl*1.3) + fl*17.3;
    vec2 i = floor(q), f = fract(q) - 0.5;
    float h = h21(i + fl*9.1);
    vec2 o = vec2(h21(i + 3.7), h21(i + 8.3)) - 0.5;
    vec2 dv = f - o*0.45;
    float ph = fract(t*(0.75 + h*0.5) + h);
    float r = length(dv), w = r - ph*0.48;
    float a = (1.0 - ph)*(1.0 - ph)*smoothstep(0.09, 0.0, abs(w));
    acc += dv/(r + 1e-3)*sin(w*80.0)*a;
  }
  return acc;
}
float bayer4(vec2 p){ ivec2 q = ivec2(mod(p, 4.0)); int i = q.x + q.y*4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[i]+0.5)/16.0; }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
vec3 lightAt(vec2 p){ vec3 L = texture(uLight, p/uMap).rgb*2.0; return L/(1.0+max(L-1.05,vec3(0.0))*0.85); }
// ── surfaces: every wall, floor and some furniture carries a material id (ext.y = 2 + id). The pattern is drawn here, in
// world space, so a wall can have paper and a skirting board and a tide mark without a single extra vertex.
// a soft line on every integer of x, w wide; it fades instead of shimmering once it gets thinner than a pixel
float gridL(float x, float w){ float d = abs(fract(x - 0.5) - 0.5), fw = fwidth(x); return (1.0 - smoothstep(w - fw, w + fw, d))*clamp(1.6 - fw*2.2, 0.0, 1.0); }
float band(float x, float a, float b){ float fw = fwidth(x)*0.75 + 1e-4; return smoothstep(a - fw, a + fw, x)*(1.0 - smoothstep(b - fw, b + fw, x)); }
float fadeF(float x){ return clamp(1.4 - fwidth(x)*1.6, 0.0, 1.0); }   // detail finer than ~a pixel just goes away
vec3 wallFinish(vec3 c, float s, float y, float skirt){
  // a skirting board, darker than the wall and lit along its top edge; grime gathered low; tide marks where water got in
  float sk = 1.0 - smoothstep(0.105, 0.115, y);
  c = mix(c, c*vec3(0.5,0.47,0.44)*skirt + vec3(0.03,0.025,0.02)*(1.0 - skirt), sk);
  c *= 1.0 + 0.22*band(y, 0.105, 0.125);
  c *= mix(0.8, 1.0, smoothstep(0.08, 0.75, y));
  float st = vn(vec2(s*0.7 + 7.0, y*0.45)) + 0.3*vn(vec2(s*3.1, y*2.4 + 3.0));
  float tide = smoothstep(0.98, 1.06, st)*(0.4 + 0.6*smoothstep(1.3, 2.4, y));
  c *= mix(1.0, 0.88, tide)*mix(1.0, 0.93, band(st, 1.055, 1.075)*step(1.0, y));
  c *= 1.0 - 0.06*(vn(vec2(s*6.0, y*5.0)) - 0.5);
  return c*mix(vec3(1.0), vec3(1.04, 0.98, 0.9), tide*0.5);
}
vec3 matApply(float id, vec3 b, vec3 P, vec3 n){
  bool vert = abs(n.y) < 0.5;
  float s = abs(n.x) > abs(n.z) ? P.z : P.x, y = P.y;
  if(id < 9.5){
    if(!vert) return b;
    vec3 c = b;
    if(id < 1.5){            // striped paper, the stripes gone soft with age
      float q = fract(s*5.2);
      c *= 1.0 + 0.07*smoothstep(0.42, 0.5, abs(q - 0.5)) - 0.05*band(q, 0.46, 0.54)*fadeF(s*5.2);
      c *= 1.0 + 0.04*band(fract(s*5.2 + 0.25), 0.47, 0.53)*fadeF(s*5.2);
      return wallFinish(c, s, y, 1.0);
    }
    if(id < 2.5){            // a damask: a lattice of lozenges, the motif a shade off the ground
      vec2 q = vec2(s*3.4, y*2.6); q.y += 0.5*mod(floor(q.x), 2.0);
      vec2 f = abs(fract(q) - 0.5);
      float d = f.x*1.2 + f.y;
      float m = band(d, 0.2, 0.3) + 0.6*(1.0 - smoothstep(0.08, 0.12, d));
      c *= 1.0 + 0.1*m*fadeF(s*3.4) - 0.04;
      return wallFinish(c, s, y, 1.0);
    }
    if(id < 3.5){            // wainscot: tongue-and-groove to the dado rail, flat paint above
      float lo = 1.0 - smoothstep(0.9, 0.91, y);
      vec3 pan = c*vec3(0.74, 0.76, 0.72);
      pan *= 1.0 - 0.28*gridL(s*7.5, 0.05)*lo;
      c = mix(c*(1.0 + 0.03*(vn(vec2(s*2.0, y*3.0)) - 0.5)), pan, lo);
      c *= 1.0 + 0.25*band(y, 0.9, 0.93) - 0.3*band(y, 0.93, 0.95) - 0.12*band(y, 0.88, 0.9);
      return wallFinish(c, s, y, 0.9);
    }
    if(id < 4.5 || (id > 7.5 && id < 8.5)){   // tiles to shoulder height (bathrooms), or the shop's white tiles
      float top = id < 4.5 ? 1.5 : 1.2, sz = id < 4.5 ? 6.6 : 8.0;
      float lo = 1.0 - smoothstep(top - 0.005, top + 0.005, y);
      vec2 ti = floor(vec2(s, y)*sz);
      vec3 tc = mix(c*1.35, vec3(0.72, 0.74, 0.7), id < 4.5 ? 0.35 : 0.7)*(0.94 + 0.08*h21(ti));
      float gr = max(gridL(s*sz, 0.06), gridL(y*sz, 0.06));
      tc = mix(tc, tc*0.62, gr);
      tc *= 1.0 - 0.25*band(y, top - 0.06, top - 0.01);
      c = mix(c, tc, lo);
      c *= mix(0.84, 1.0, smoothstep(0.0, 0.5, y));
      float st = vn(vec2(s*1.1, y*0.8));
      return c*mix(1.0, 0.85, smoothstep(0.8, 0.9, st)*(1.0 - lo));
    }
    if(id < 5.5){            // brick: running bond, mortar, every brick its own colour, soot gathered at the foot
      float bh = 0.14, bl = 0.3;
      float row = floor(y/bh), u = s/bl + 0.5*mod(row, 2.0);
      vec2 bi = vec2(floor(u), row);
      float hv = h21(bi);
      vec3 bc = c*(0.82 + 0.3*hv)*mix(vec3(1.0), vec3(1.08, 0.94, 0.86), step(0.7, h21(bi + 3.1)));
      float mo = max(gridL(y/bh, 0.07), gridL(u, 0.03));
      bc = mix(bc, c*vec3(0.62, 0.62, 0.6) + 0.04, mo*0.85);
      float pl = 1.0 - smoothstep(0.34, 0.35, y);
      bc = mix(bc, c*0.55 + vec3(0.03), pl);
      bc *= 1.0 - 0.18*band(y, 0.35, 0.38);
      float streak = vn(vec2(s*7.0, y*0.4))*vn(vec2(s*2.3, 1.0));
      return bc*(1.0 - 0.25*smoothstep(0.35, 0.6, streak)*smoothstep(2.6, 0.6, y));
    }
    if(id < 6.5){            // clapboard: each board throws a thin shadow on the one below
      float bh = 0.17, q = fract((y - 0.36)/bh);
      vec3 bc = c*(0.86 + 0.24*q)*(0.95 + 0.08*h21(vec2(floor((y - 0.36)/bh), floor(s*0.6))));
      bc *= 1.0 - 0.35*(1.0 - smoothstep(0.0, 0.12, q))*fadeF(y/bh);
      bc *= 1.0 - 0.3*gridL(s*0.62 + 0.3, 0.008);
      float pl = 1.0 - smoothstep(0.35, 0.36, y);
      bc = mix(bc, c*vec3(0.5, 0.5, 0.52), pl);
      return bc*(1.0 - 0.2*smoothstep(0.55, 0.75, vn(vec2(s*3.0, y*0.5))));
    }
    if(id < 7.5){            // painted plaster: roller marks, patches of newer paint
      c *= 1.0 + 0.05*(vn(vec2(s*1.6, y*1.6)) - 0.5) + 0.04*step(0.78, vn(vec2(s*0.7 + 11.0, y*0.9)));
      return wallFinish(c, s, y, 0.8);
    }
    {                         // little sprigs on a pale ground, in rows half a step apart
      vec2 q = vec2(s*7.0, y*6.0); q.x += 0.5*mod(floor(q.y), 2.0);
      vec2 f = fract(q) - 0.5;
      float d = length(f*vec2(1.0, 1.25));
      float m = (1.0 - smoothstep(0.1, 0.16, d)) + 0.5*band(abs(f.x + f.y), 0.0, 0.05)*step(d, 0.3);
      c *= 1.0 + (0.1*m - 0.03)*fadeF(s*7.0);
      return wallFinish(c, s, y, 1.0);
    }
  }
  if(id < 19.5){
    if(vert) return b;
    vec2 p = P.xz; vec3 c = b;
    if(id < 10.5){           // boards: staggered butt joints, a grain, every board a shade apart, scuffed down the middle
      float w = 0.145, row = floor(p.y/w), off = h21(vec2(row, 7.0))*1.7;
      float bi = floor((p.x + off)/1.25);
      float hv = h21(vec2(bi, row));
      c *= 0.84 + 0.3*hv;
      float gr = vn(vec2((p.x + off)*1.6, p.y*42.0))*0.6 + vn(vec2((p.x + off)*0.5, p.y*90.0))*0.4;
      c *= 1.0 + (gr - 0.5)*0.22*fadeF(p.y*42.0);
      c *= 1.0 - 0.45*gridL(p.y/w, 0.05) - 0.4*gridL((p.x + off)/1.25, 0.004);
      return c*(1.0 - 0.1*smoothstep(0.55, 0.85, vn(p*0.9)));
    }
    if(id < 11.5){           // carpet tiles laid against the grain of their neighbours; worn paths, coffee
      vec2 ti = floor(p*2.0);
      float dir = mod(ti.x + ti.y, 2.0);
      float pile = vn(dir > 0.5 ? vec2(p.x*60.0, p.y*8.0) : vec2(p.x*8.0, p.y*60.0));
      c *= 0.97 + 0.07*dir + (pile - 0.5)*0.16*fadeF(p.x*60.0);
      c *= 1.0 - 0.12*max(gridL(p.x*2.0, 0.02), gridL(p.y*2.0, 0.02));
      float spill = smoothstep(0.82, 0.86, vn(p*1.7 + 4.0));
      return c*(1.0 - 0.25*spill);
    }
    if(id < 12.5 || id > 18.5){   // floor tiles: grout, chipped corners, a grey bloom of old mop water
      float sz = id < 12.5 ? 1.0 : 2.0;
      vec2 ti = floor(p*sz);
      c *= 0.95 + 0.1*h21(ti + 1.7);
      c = mix(c, c*0.55 + vec3(0.02), max(gridL(p.x*sz, 0.03), gridL(p.y*sz, 0.03)));
      float mop = vn(p*0.8 + 2.0);
      return c*(1.0 - 0.18*smoothstep(0.6, 0.9, mop))*(1.0 + 0.05*(vn(p*7.0) - 0.5));
    }
    if(id < 13.5){           // concrete: blotches, hairline cracks, oil
      float m = vn(p*1.3)*0.6 + vn(p*5.0)*0.4;
      c *= 0.88 + 0.24*m;
      vec2 jq = p*0.9 + 9.0 + 0.22*vec2(vn(p*7.0), vn(p*7.0 + 3.3));
      float cr = abs(vn(jq) - 0.5);
      c *= 1.0 - 0.3*(1.0 - smoothstep(0.002, 0.006, cr))*smoothstep(0.45, 0.6, vn(p*0.31 + 2.0))*fadeF(p.x*0.9);
      return c*(1.0 - 0.3*smoothstep(0.78, 0.84, vn(p*0.6 + 3.0)));
    }
    if(id < 14.5){           // asphalt: aggregate, patched squares, tar-sealed cracks
      c *= 0.92 + 0.16*vn(p*13.0)*fadeF(p.x*13.0) + 0.06*vn(p*2.0);
      vec2 pt = floor(p/vec2(2.3, 1.7) + 0.3);
      float pa = step(0.86, h21(pt));
      c *= 1.0 - 0.14*pa;
      vec2 jq = p*0.55 + 1.0 + 0.18*vec2(vn(p*6.0), vn(p*6.0 + 5.1));
      float cr = abs(vn(jq) - 0.5);
      return c*(1.0 - 0.32*(1.0 - smoothstep(0.0015, 0.0045, cr))*smoothstep(0.5, 0.66, vn(p*0.27 + 4.0))*fadeF(p.x*0.55));
    }
    if(id < 15.5){           // grass: clumps, bare earth, blades
      float cl = vn(p*1.2)*0.6 + vn(p*4.5)*0.4;
      c *= 0.78 + 0.42*cl;
      c = mix(c, c*vec3(1.25, 1.05, 0.8)*0.85, smoothstep(0.7, 0.85, vn(p*0.7 + 5.0)));
      return c*(1.0 + 0.18*(vn(p*24.0) - 0.5)*fadeF(p.x*24.0));
    }
    if(id < 16.5){           // gravel
      float sp = vn(p*22.0), sp2 = h21(floor(p*30.0));
      return c*(0.85 + 0.25*sp*fadeF(p.x*22.0) + 0.12*(sp2 - 0.5)*fadeF(p.x*30.0));
    }
    if(id < 17.5){           // paving slabs: speckle, chewing gum, a slab that's sunk
      vec2 sl = floor(vec2(p.x, p.y*2.0));
      c *= 0.94 + 0.1*h21(sl + 5.0);
      c *= 1.0 + 0.08*(vn(p*16.0) - 0.5)*fadeF(p.x*16.0);
      float gum = step(0.995, h21(floor(p*9.0)));
      return c*(1.0 - 0.35*gum);
    }
    {                         // a runner: a border and a lozenge down the middle, the pile flattened where people walk
      vec2 f = abs(fract(p*vec2(1.5, 1.5)) - 0.5);
      float lz = band(f.x + f.y, 0.3, 0.36);
      c *= 1.0 + 0.16*lz*fadeF(p.x*1.5) - 0.03;
      return c*(1.0 + 0.1*(vn(vec2(p.x*40.0, p.y*40.0)) - 0.5)*fadeF(p.x*40.0));
    }
  }
  // furniture and things on walls
  if(id < 20.5){             // wood: grain along the length, darker in the figure
    vec2 g = vert ? vec2(y*28.0, s*1.3) : vec2(P.z*28.0, P.x*1.3);
    float gr = vn(g)*0.6 + vn(g*vec2(2.1, 3.0))*0.4;
    return b*(0.88 + 0.24*gr*fadeF(g.x));
  }
  if(id < 21.5){             // fabric: a weave, pilling
    vec2 g = vert ? vec2(s, y) : P.xz;
    float wv = 0.5 + 0.25*(sin(g.x*180.0) + sin(g.y*180.0));
    return b*(0.94 + 0.1*wv*fadeF(g.x*30.0) + 0.08*(vn(g*14.0) - 0.5));
  }
  if(id < 22.5){             // brushed metal
    vec2 g = vert ? vec2(s, y*60.0) : vec2(P.x, P.z*60.0);
    return b*(0.9 + 0.18*vn(g)*fadeF(g.y));
  }
  if(id < 23.5){             // small square tiles on any face
    vec2 g = vert ? vec2(s, y)*10.0 : P.xz*10.0;
    vec3 c = b*(0.93 + 0.12*h21(floor(g)));
    return mix(c, b*0.6, max(gridL(g.x, 0.06), gridL(g.y, 0.06)));
  }
  if(id < 24.5){             // print: rows of type that stop short, paragraph by paragraph
    float r = (vert ? y : P.z)*48.0, row = floor(r), sa = vert ? s : P.x;
    float on = band(fract(r), 0.25, 0.75)*step(0.35, vn(vec2(sa*26.0, row*3.7)))*step(0.12, h21(vec2(row, 1.0)));
    return mix(b, b*0.35, on*fadeF(r));
  }
  if(id < 25.5){             // cork
    vec2 g = vert ? vec2(s, y) : P.xz;
    return b*(0.8 + 0.4*vn(g*40.0)*fadeF(g.x*40.0) + 0.1*(h21(floor(g*70.0)) - 0.5));
  }
  if(id < 26.5){              // a screen: scanlines and a few rows of glowing text
    float r = y*90.0;
    float sl = 1.0 - 0.22*band(fract(r), 0.5, 1.0)*fadeF(r);
    float tx = band(fract(y*22.0), 0.3, 0.7)*step(0.45, vn(vec2(s*30.0, floor(y*22.0)*2.3)))*fadeF(y*22.0);
    return b*sl*(0.8 + 0.5*tx);
  }
  if(id < 27.5){              // the craft's hull: pale panels a metre wide, seams in shadow, a rivet at each corner, dark at the foot
    if(!vert) return b;
    vec3 c = b;
    float u = s/1.05, v = (y - 0.12)/0.86;
    vec2 pi2 = floor(vec2(u, v));
    c *= 0.9 + 0.14*h21(pi2 + 3.0);
    float seam = max(gridL(u, 0.018), gridL(v, 0.024)*step(0.12, y));
    c = mix(c, c*0.38, seam);
    vec2 f = fract(vec2(u, v));
    float rv = 0.0;
    rv = max(rv, 1.0 - smoothstep(0.012, 0.024, length((f - vec2(0.07, 0.1))*vec2(1.05, 0.86))));
    rv = max(rv, 1.0 - smoothstep(0.012, 0.024, length((f - vec2(0.93, 0.1))*vec2(1.05, 0.86))));
    rv = max(rv, 1.0 - smoothstep(0.012, 0.024, length((f - vec2(0.07, 0.9))*vec2(1.05, 0.86))));
    rv = max(rv, 1.0 - smoothstep(0.012, 0.024, length((f - vec2(0.93, 0.9))*vec2(1.05, 0.86))));
    c = mix(c, c*1.35, rv*fadeF(u*20.0));
    c *= 1.0 - 0.35*(1.0 - smoothstep(0.1, 0.14, y));
    return c*(1.0 - 0.08*(vn(vec2(s*2.0, y*3.0)) - 0.5));
  }
  if(id < 28.5){              // the craft's deck: plates, a raised tread, scuffed where things are dragged
    if(vert) return b;
    vec2 p = P.xz; vec3 c = b;
    c *= 0.9 + 0.12*h21(floor(p) + 9.0);
    c = mix(c, c*0.4, max(gridL(p.x, 0.015), gridL(p.y, 0.015)));
    vec2 tq = fract(p*5.0) - 0.5;
    float dg = mod(floor(p.x*5.0) + floor(p.y*5.0), 2.0)*2.0 - 1.0;
    float tread = band(abs(tq.x + tq.y*dg), 0.0, 0.1);
    c *= 1.0 + 0.07*tread*fadeF(p.x*5.0);
    return c*(1.0 - 0.14*smoothstep(0.62, 0.85, vn(p*1.3)));
  }
  if(id < 29.5){              // the drains: old brick black with wet, slime down every joint, a green tide line
    if(!vert) return b;
    float bh = 0.12, bl = 0.26;
    float row = floor(y/bh), u = s/bl + 0.5*mod(row, 2.0);
    vec2 bi = vec2(floor(u), row);
    vec3 bc = b*(0.72 + 0.38*h21(bi));
    float mo = max(gridL(y/bh, 0.08), gridL(u, 0.04));
    bc = mix(bc, b*vec3(0.42, 0.45, 0.38), mo*0.9);
    float streak = vn(vec2(s*9.0, y*0.6))*vn(vec2(s*3.0, 2.0));
    bc = mix(bc, bc*vec3(0.55, 0.72, 0.42), smoothstep(0.3, 0.55, streak)*(1.0 - smoothstep(0.3, 2.4, y)));
    float tide = 1.0 - smoothstep(0.32, 0.42, y + 0.06*vn(vec2(s*4.0, 1.0)));
    bc = mix(bc, bc*vec3(0.36, 0.46, 0.26), tide*0.85);
    return bc*(0.82 + 0.18*smoothstep(0.0, 2.6, y));
  }
  if(id < 30.5){              // the walkway: worn flags of stone, the low places wet
    if(vert) return b*0.7;
    vec2 p = P.xz; vec3 c = b;
    vec2 q = p*vec2(1.6, 1.25); q.x += 0.5*mod(floor(q.y), 2.0);
    vec2 fi = floor(q);
    c *= 0.8 + 0.32*h21(fi + 4.0);
    c = mix(c, c*0.35, max(gridL(q.x, 0.05), gridL(q.y, 0.05)));
    c = mix(c, c*vec3(0.62, 0.74, 0.46), smoothstep(0.6, 0.85, vn(p*1.7 + 3.0))*0.6);
    return c;
  }
  if(id < 31.5){              // the channel: brown-green water sliding by, a crust of scum, things turning in it
    if(vert) return b*0.55;
    vec2 p = P.xz; vec3 c = b;
    float fl = vn(p*1.3 + vec2(uTime*0.11, uTime*0.07));
    float fl2 = vn(p*3.7 - vec2(uTime*0.05, uTime*0.13));
    c *= 0.7 + 0.5*fl*fl2;
    float scum = smoothstep(0.6, 0.78, vn(p*2.2 + vec2(uTime*0.06, uTime*0.04)));
    c = mix(c, vec3(0.3, 0.31, 0.19), scum*0.55);
    float bits = step(0.985, h21(floor(p*7.0 + vec2(uTime*0.4, uTime*0.25))));
    return mix(c, vec3(0.42, 0.36, 0.26), bits*0.7);
  }
  if(id < 32.5){              // the nest's walls: packed mud and roots, something wet and veined underneath
    if(!vert) return b;
    vec3 c = b*(0.72 + 0.48*vn(vec2(s*2.2, y*1.6)));
    float root = 1.0 - smoothstep(0.0, 0.035, abs(vn(vec2(s*1.8, y*0.5)) - 0.5));
    c = mix(c, vec3(0.12, 0.085, 0.055), root*0.85);
    float vein = 1.0 - smoothstep(0.0, 0.022, abs(vn(vec2(s*4.0 + 5.0, y*2.0)) - 0.5));
    c = mix(c, vec3(0.34, 0.05, 0.05), vein*0.4*(1.0 - smoothstep(0.4, 1.8, y)));
    float wet = smoothstep(0.55, 0.8, vn(vec2(s*1.3, y*0.4 + 3.0)));
    return c*(1.0 - 0.28*wet)*(0.75 + 0.25*smoothstep(0.0, 1.0, y));
  }
  if(id < 33.5){              // the nest's floor: twigs, dead leaves, rags, and slime between
    if(vert) return b;
    vec2 p = P.xz; vec3 c = b;
    float lf = vn(p*9.0), lf2 = vn(p*23.0 + 2.0);
    c *= 0.65 + 0.55*lf*fadeF(p.x*9.0) + 0.2*(lf2 - 0.5)*fadeF(p.x*23.0);
    vec3 leaf = mix(vec3(0.38, 0.22, 0.09), vec3(0.24, 0.17, 0.08), h21(floor(p*5.0)));
    c = mix(c, leaf, smoothstep(0.55, 0.7, vn(p*5.0 + 9.0))*0.6);
    vec2 cell = floor(p*2.0); vec2 f = fract(p*2.0) - 0.5;
    float a = h21(cell)*3.1416; vec2 d = vec2(cos(a), sin(a));
    float tw = (1.0 - smoothstep(0.0, 0.028, abs(dot(f, vec2(-d.y, d.x)))))*step(abs(dot(f, d)), 0.42);
    c = mix(c, vec3(0.07, 0.055, 0.04), tw*0.75*fadeF(p.x*2.0));
    float sl = smoothstep(0.66, 0.74, vn(p*1.4 + 13.0));
    return mix(c, vec3(0.22, 0.27, 0.12), sl*0.7);
  }
  if(id < 34.5){              // gold: a crust of coins, every edge catching the light
    vec2 g = vert ? vec2(s, y) : P.xz;
    vec2 q = g*13.0; vec2 ci = floor(q); vec2 f = fract(q) - 0.5;
    float d = length(f + (vec2(h21(ci), h21(ci + 3.0)) - 0.5)*0.4);
    float coin = 1.0 - smoothstep(0.36, 0.46, d), rim = band(d, 0.3, 0.4);
    vec3 c = b*(0.68 + 0.42*h21(ci + 1.0))*(0.72 + 0.38*coin) + b*0.35*rim;
    return mix(b*0.95, c, fadeF(q.x));
  }
  {                           // slime: wet, mottled, threaded with darker veins
    vec2 g = vert ? vec2(s, y) : P.xz;
    float m = vn(g*6.0);
    return b*(0.75 + 0.5*m)*(1.0 - 0.3*(1.0 - smoothstep(0.0, 0.04, abs(vn(g*3.0 + 5.0) - 0.5))));
  }

}
void main(){
  if(uMode==3){ frag = vec4(uMaskCol, 1.0); return; }
  vec3 n = normalize(vN);
  vec3 base = vC*uTint;
  if(vE.y > 1.5) base = matApply(floor(vE.y - 1.5), base, vW, n);
  if(uMode==1 || uMode==2){
    vec3 col;
    if(uMode==1){
      float key = max(dot(n, normalize(vec3(-0.5,0.55,0.75))),0.0);
      float fill = max(dot(n, normalize(vec3(0.45,0.12,0.88))),0.0);
      float rim = pow(max(1.0-max(dot(n, normalize(vec3(0.2,0.2,1.0))),0.0), 0.0), 3.0);
      col = base*(vec3(1.0,0.9,0.78)*key*1.08 + vec3(0.3,0.38,0.52)*fill*0.55 + vec3(0.08,0.085,0.1)) + vec3(0.5,0.58,0.78)*rim*0.32*smoothstep(-0.3,0.5,n.y+0.3);
    } else {
      float f = max(dot(n, normalize(vec3(0.12,0.3,1.0))),0.0);
      col = base*(vec3(1.0,0.97,0.9)*pow(f,0.75)*1.3 + 0.03);
    }
    col += base*vE.x*uEmitMul*2.0 + uEmit*1.8;
    frag = vec4(col, 1.0); return;
  }
  if(vDith > 0.02 && vW.y > 0.7){ if(bayer4(gl_FragCoord.xy) < vDith*0.7) discard; }
  vec2 sp = vW.xz + n.xz*0.3;
  vec2 uv = sp/uMap;
  bool outside = uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0;
  vec3 L = lightAt(sp);
  vec3 V = outside ? vec3(0.0) : texture(uVis, uv).rgb;
  // pools: the bright heart of a pool a little brighter, its rim sinking sooner into the dark
  float Lk = dot(max(L - uSky, vec3(0.0)), vec3(0.3,0.59,0.11));
  { vec3 Lx = max(L - uSky, vec3(0.0)); L += Lx*(mix(0.66, 1.08, smoothstep(0.1, 0.9, Lk)) - 1.0); }
  float shade = 0.80 + 0.20*n.y + 0.10*dot(n.xz, vec2(0.55,-0.83));
  float ao = mix(0.78, 1.0, smoothstep(0.0, 0.45, vW.y));
  vec3 col = base*(L*shade*ao + vec3(0.02,0.026,0.04));
  if(uChar > 0.5){
    // people are lit as things standing in the light, not as floor: the light comes from somewhere (the slope of the
    // light map, and the nearest lamps by hand), and a figure in the dark still has an edge
    vec2 pc = vW.xz; vec3 lw = vec3(0.3,0.59,0.11);
    vec3 Lc = lightAt(pc);
    float gx = dot(lightAt(pc + vec2(0.6,0.0)) - lightAt(pc - vec2(0.6,0.0)), lw);
    float gz = dot(lightAt(pc + vec2(0.0,0.6)) - lightAt(pc - vec2(0.0,0.6)), lw);
    vec2 gd = vec2(gx, gz); float gm = length(gd);
    vec3 ld = normalize(vec3(gd/(gm + 1e-4)*clamp(gm*6.0, 0.0, 1.4), 0.7));
    float ndl = dot(n, ld);
    float k = (0.3 + 0.3*(0.5 + 0.5*ndl) + 0.55*max(ndl, 0.0))*(0.86 + 0.14*n.y);
    vec3 lam = vec3(0.0);
    for(int q=0;q<12;q++){
      if(q>=uLN) break;
      vec3 dv = uLP[q].xyz - vW; float dl = max(length(dv), 0.1); float lr = uLP[q].w*1.15;
      lam += uLC[q].rgb*max(dot(n, dv/dl), 0.0)*(lr*lr/(lr*lr + dl*dl*1.4))*smoothstep(lr*1.6, lr*0.4, dl);
    }
    float lit = clamp(dot(Lc, lw)*3.0, 0.0, 1.0);
    col = base*(Lc*k*ao + lam*0.55*lit + vec3(0.022,0.028,0.042));
  }
  if(vE.y > 0.5 && vE.y < 1.5){
    vec3 L2 = lightAt(vW.xz - n.xz*0.3);
    col = base*0.30*L*shade + L2*vec3(0.62,0.56,0.45)*0.55 + base*0.06;
  }
  // wet ground: puddles that hold a mirror, rough asphalt that smears the lamps into streaks, rain rings in both
  float mid = vE.y > 1.5 ? floor(vE.y - 1.5) : -1.0;
  float lw = abs(mid - 31.0) < 0.5 ? 1.0 : abs(mid - 30.0) < 0.5 ? 0.6 : 0.0;   // THEIR drains: the channel a black mirror, the walkway wet
  bool flo = n.y > 0.9 && vW.y < 0.05 && (V.b > 0.5 || lw > 0.0);
  float wetA = lw > 0.0 ? lw : uWet;
  bool wetFlo = flo && wetA > 0.01;
  float pud = 0.0; vec3 nP = n;
  if(wetFlo){
    float pn = vn(vW.xz*0.36)*0.62 + vn(vW.xz*1.45 + 3.1)*0.38;
    pud = lw > 0.9 ? 1.0 : smoothstep(0.57, 0.67, pn)*wetA;
    vec2 tilt = (vec2(vn(vW.xz*7.0), vn(vW.xz*7.0 + 5.3)) - 0.5)*0.24*(1.0 - pud*0.85);
    if(uRain > 0.02 && V.b > 0.5) tilt += ripples(vW.xz, uTime)*0.32*uRain*(0.35 + 0.65*pud);
    if(lw > 0.9) tilt += (vec2(vn(vW.xz*2.6 + vec2(uTime*0.3, 0.0)), vn(vW.xz*2.6 + vec2(0.0, uTime*0.3) + 7.0)) - 0.5)*0.2 + ripples(vW.xz*0.8, uTime*0.35)*0.1;
    nP = normalize(vec3(tilt.x, 1.0, tilt.y));
  }
  vec3 pool = vec3(0.0), spec = vec3(0.0);
  if(V.b > 0.5 || lw > 0.0){
    for(int k=0;k<12;k++){
      if(k>=uLN) break;
      vec3 lp = uLP[k].xyz; float lr = uLP[k].w; vec4 lc = uLC[k];
      vec3 dv = lp - vW; float dl = max(length(dv), 0.05); vec3 ld = dv/dl;
      if(lc.a > 0.5){
        vec2 dxz = vW.xz - lp.xz;
        pool += lc.rgb*exp(-dot(dxz,dxz)/(lr*lr*0.16))*(0.25 + 0.75*max(dot(n, ld), 0.0));
      }
      if(wetFlo){
        // reflections are taken from a lamp brought down to a third of its height: the mirror image lands
        // on the street just in front of the pole instead of five metres off it, where a picture would put it
        vec3 dr = vec3(lp.x, lp.y*0.36, lp.z) - vW; float dl2 = max(length(dr), 0.05);
        float nh = max(dot(nP, normalize(dr/dl2 + uViewDir)), 0.0);
        float s = pow(nh, mix(60.0, 650.0, pud))*mix(0.8, 5.5, pud) + pow(nh, 9.0)*0.045;
        spec += lc.rgb*s*(lr*lr/(lr*lr + dl2*dl2*0.9));
      }
    }
    col += base*pool*smoothstep(0.02, 0.2, Lk)*1.1;
  }
  if(wetFlo){
    vec3 r = vec3(0.0);
    for(int k=1;k<=5;k++){ r += max(lightAt(vW.xz + uFwd*(float(k)*0.5)) - uSky, vec3(0.0)); }
    float rip = 0.7 + 0.3*vn(vW.xz*vec2(5.0,9.0) + vec2(0.0, uTime*4.0));
    col = col*(1.0 - 0.3*wetA - 0.4*pud) + r*(0.055 + 0.02*pud)*wetA*rip + spec*wetA + uSky*0.1*pud*V.b;
  }
  // the horror layer's own lights (a beam, a craft's belly, a slit eye) and its pools of dark (a lamp that died)
  vec3 xl = vec3(0.0), xs = vec3(0.0); float dk = 0.0;
  for(int k=0;k<8;k++){
    if(k>=uXN) break;
    vec3 dv = uXP[k].xyz - vW; float dl = length(dv); float f = clamp(1.0 - dl/uXP[k].w, 0.0, 1.0); f *= f;
    if(uXC[k].a > 0.5) dk = max(dk, f*uXC[k].r);
    else {
      xl += uXC[k].rgb*f*(0.35 + 0.65*max(dot(n, normalize(dv + vec3(0.0,0.001,0.0))), 0.0));
      if(wetFlo){ float nh = max(dot(nP, normalize(dv/max(dl,0.05) + uViewDir)), 0.0); float lr = uXP[k].w*1.6;
        xs += uXC[k].rgb*(pow(nh, mix(60.0, 650.0, pud))*mix(0.8, 5.5, pud) + pow(nh, 9.0)*0.05)*(lr*lr/(lr*lr + dl*dl*0.9)); }
    }
  }
  col = col*(1.0 - dk) + base*xl*1.7 + xl*0.03 + xs*wetA*(1.0 - dk);
  // haze: wet air holding the lamplight, thickest round the brightest pools
  vec3 Lb = max(textureLod(uLight, uv, 2.4).rgb*2.0 - uSky, vec3(0.0));
  float hz = vn(vW.xz*0.55 + vec2(uTime*0.07, -uTime*0.05));
  col += Lb*uHaze*(0.5 + 0.9*hz)*(outside ? 0.0 : 1.0);
  // wet things shine: eyes, tongues, slime
  if(uSpec > 0.0){
    vec3 Hh = normalize(uViewDir + normalize(vec3(0.3,1.0,0.25)));
    float s = pow(max(dot(n, Hh), 0.0), 26.0);
    col += (L*0.55 + xl*1.4 + vec3(0.07,0.07,0.08))*s*uSpec;
  }
  col += base*vE.x*uEmitMul*uEmitK + uEmit*uEmitK*0.8;
  col += uHi*(vec3(0.07,0.065,0.05) + base*0.3);
  if(uChar > 0.5){ float fr = pow(1.0 - clamp(dot(n, uViewDir), 0.0, 1.0), 2.2); col += uRimC*fr*(0.35 + 0.65*clamp(n.y + 0.55, 0.0, 1.0)); }
  float vis = max(V.r, uVisMin); float mem = V.g*(1.0-uDyn);
  // the dark is not empty: slow crawling fog, faster and redder when the night turns bad
  float tsp = 1.0 + uDread*1.8;
  float nz = vn(vW.xz*0.45 + vec2(uTime*0.05, -uTime*0.035)*tsp);
  float nz2 = vn(vW.xz*1.4 - vec2(uTime*0.02, uTime*0.045)*tsp);
  float nz3 = vn(vW.xz*0.16 + vec2(-uTime*0.011, uTime*0.019));
  vec3 fogc = uFog*(0.48 + 0.66*nz + 0.28*nz2)*(0.62 + 0.7*nz3);
  fogc = mix(fogc, fogc*vec3(2.3,0.62,0.55) + vec3(0.012,0.0,0.0)*nz2, max(uDread*0.75, uBlood*0.55));
  float lum = dot(base, vec3(0.3,0.59,0.11));
  vec3 memc = (vec3(lum)*0.75 + base*0.25)*vec3(0.13,0.16,0.23) + fogc*0.45;
  vec3 hid = mix(fogc, memc, mem);
  hid = hid*(1.0 - dk*0.6) + xl*0.2;
  col = mix(hid, col, vis);
  frag = vec4(col, 1.0);
}`;
