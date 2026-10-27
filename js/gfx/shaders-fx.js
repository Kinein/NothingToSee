//@ gfx/shaders-fx — Effect shaders: floor decals and blood, halos, light shafts, beams, rain, dust
//@ Defines: DVS, DFS, GVS, GFS, CVS, CFS, BFS, RVS, RFS, PVS, PFS
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// flat decals on the floor: blob shadows, rings, path dots
const DVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP, uModel; out vec2 vUv; out vec3 vW;
void main(){ vUv = aPos.xz; vec4 w = uModel*vec4(aPos,1.0); vW = w.xyz; gl_Position = uVP*w; }`;
const DFS = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vW; uniform vec4 uColor; uniform int uShape; uniform sampler2D uVis; uniform vec2 uMap; uniform float uTime;
uniform float uSeed; uniform sampler2D uLight; uniform float uWetD;
out vec4 frag;
float hd(float n){ return fract(sin(n*12.9898 + uSeed*78.233)*43758.5453); }
// blood that landed: a ragged body, spines where it hit hard, droplets thrown clear
float splat(vec2 p){
  float ang = atan(p.y, p.x), r = length(p);
  float e = 0.34 + 0.08*sin(ang*3.0 + uSeed*5.0) + 0.06*sin(ang*7.0 + uSeed*11.0) + 0.035*sin(ang*13.0 + uSeed*3.0);
  e += 0.24*pow(max(0.0, sin(ang*5.0 + uSeed*2.0)), 22.0) + 0.17*pow(max(0.0, sin(ang*8.0 - uSeed*4.0)), 30.0);
  float a = smoothstep(e + 0.025, e - 0.025, r);
  for(int i=0;i<9;i++){
    float fi = float(i), an = hd(fi)*6.2832, dd = 0.42 + 0.5*hd(fi + 7.0);
    float rr = 0.022 + 0.06*hd(fi + 13.0)*(1.0 - dd*0.6);
    a = max(a, smoothstep(rr + 0.018, rr - 0.018, length(p - vec2(cos(an), sin(an))*dd)));
  }
  return a;
}
// blood that was dragged: thick where it started, thinning into streaks along x
float smear(vec2 p){
  float t = p.x*0.5 + 0.5;
  float w = mix(0.5, 0.1, t)*(0.85 + 0.15*sin(p.x*9.0 + uSeed*3.0));
  float a = smoothstep(w, w - 0.1, abs(p.y + 0.07*sin(p.x*3.0 + uSeed)));
  float streak = 0.5 + 0.5*sin(p.y*40.0 + sin(p.x*2.0)*3.0 + uSeed*9.0);
  return a*mix(1.0, streak, smoothstep(0.15, 0.95, t))*smoothstep(1.0, 0.82, abs(p.x));
}
void main(){
  float r = length(vUv); float a;
  if(uShape==0) a = 1.0 - smoothstep(0.25, 1.0, r);
  else if(uShape==1) a = smoothstep(0.62,0.74,r)*(1.0-smoothstep(0.86,0.98,r));
  else if(uShape==3){ float ang = atan(vUv.y, vUv.x); a = smoothstep(0.66,0.74,r)*(1.0-smoothstep(0.86,0.94,r))*step(0.0, sin(ang*8.0 + uTime*1.5)); }
  else if(uShape==4) a = splat(vUv);
  else if(uShape==5) a = smear(vUv);
  else a = (1.0 - smoothstep(0.0, 1.0, r))*(0.6+0.4*sin(uTime*3.0 + r*9.0));
  float v = texture(uVis, vW.xz/uMap).r;
  vec3 c = uColor.rgb;
  if(uShape >= 4){   // lit like the street it lies on, with a wet sheen where a lamp is close
    vec3 L = texture(uLight, vW.xz/uMap).rgb*2.0;
    c = uColor.rgb*(0.3 + L*1.25) + L*L*0.035*uWetD;
  }
  frag = vec4(c, uColor.a*a*max(v, uShape==1||uShape==3 ? 0.5 : 0.0));
}`;
// additive halos around lamps
const GVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP; uniform vec3 uCenter; uniform vec3 uRight; uniform vec3 uUp; uniform float uSize; out vec2 vUv;
void main(){ vUv = aPos.xz; vec3 p = uCenter + (uRight*aPos.x + uUp*aPos.z)*uSize; gl_Position = uVP*vec4(p,1.0); }`;
const GFS = `#version 300 es
precision highp float;
in vec2 vUv; uniform vec3 uColor; uniform float uAlpha; out vec4 frag;
void main(){ float r = length(vUv); float a = pow(max(0.0, 1.0 - r), 2.4); frag = vec4(uColor*a*uAlpha, 1.0); }`;
// light shafts under lamps
const CVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
uniform mat4 uVP, uModel; out float vT; out vec3 vN; out vec3 vW;
void main(){ vec4 w = uModel*vec4(aPos,1.0); vW = w.xyz; vN = mat3(uModel)*aNor; vT = clamp(-aPos.y, 0.0, 1.0); gl_Position = uVP*w; }`;
const CFS = `#version 300 es
precision highp float;
in float vT; in vec3 vN; in vec3 vW; uniform vec3 uColor; uniform float uAlpha; uniform vec3 uCamDir; uniform sampler2D uVis; uniform vec2 uMap; uniform float uTime;
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  float f = abs(dot(normalize(vN), uCamDir));
  float a = pow(max(1.0-vT, 0.0), 1.3)*smoothstep(0.0, 0.1, vT)*pow(clamp(f, 0.0, 1.0), 1.6);
  float flick = 0.9 + 0.1*h21(vec2(floor(uTime*24.0), vW.x));
  float v = texture(uVis, vW.xz/uMap).r;
  frag = vec4(uColor*a*uAlpha*v*flick, 1.0);
}`;
// a tractor beam: bands of light crawling up it, brightest where it meets the ground. No fog gate: you can see one from across town.
const BFS = `#version 300 es
precision highp float;
in float vT; in vec3 vN; in vec3 vW; uniform vec3 uColor; uniform float uAlpha; uniform vec3 uCamDir; uniform float uTime;
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  float f = clamp(abs(dot(normalize(vN), uCamDir)), 0.0, 1.0);
  float bands = 0.5 + 0.5*sin(vW.y*7.0 - uTime*8.0)*sin(vW.y*2.1 - uTime*2.7);
  float a = (0.18 + 0.82*vT*vT)*pow(f, 0.8)*(0.45 + 0.55*bands)*smoothstep(0.0, 0.05, vT);
  float flick = 0.86 + 0.14*h21(vec2(floor(uTime*28.0), vW.x));
  frag = vec4(uColor*a*uAlpha*flick, 1.0);
}`;
// rain streaks (outdoors only)
const RVS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aSeed; layout(location=1) in float aEnd;
uniform mat4 uVP; uniform vec2 uCenter; uniform float uTime; uniform float uRange;
out vec3 vW; out float vEnd;
void main(){
  float Rg = uRange;
  vec2 lo = uCenter - Rg*0.5;
  vec2 p = lo + mod(aSeed.xy*Rg - lo, Rg);
  float fall = fract(aSeed.z - uTime*aSeed.w);
  float y = fall*7.5;
  vec3 w = vec3(p.x + y*0.1, y, p.y);
  w += aEnd*vec3(0.04, 0.42, 0.0);
  vW = w; vEnd = aEnd;
  gl_Position = uVP*vec4(w,1.0);
}`;
const RFS = `#version 300 es
precision highp float;
in vec3 vW; in float vEnd; uniform sampler2D uLight; uniform sampler2D uVis; uniform vec2 uMap; uniform float uAmt; out vec4 frag;
void main(){
  vec2 uv = vW.xz/uMap; vec3 v = texture(uVis, uv).rgb; if(v.b < 0.5) discard;
  vec3 L = texture(uLight, uv).rgb*2.0; float l = dot(L, vec3(0.3,0.59,0.11));
  float a = (0.05 + l*0.45)*v.r*uAmt*mix(0.2, 1.0, vEnd);
  frag = vec4(mix(vec3(0.7,0.78,0.95), L/(l+0.001)*0.6, 0.35)*a, 1.0);
}`;
// dust motes drifting through lit rooms
const PVS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uTime; uniform float uSize; out vec3 vW; out float vTw;
void main(){
  vec3 p = aP.xyz + vec3(sin(uTime*0.13+aP.w)*0.4, sin(uTime*0.21+aP.w*1.7)*0.25, cos(uTime*0.11+aP.w*0.7)*0.4);
  vW = p; vTw = 0.5+0.5*sin(uTime*1.3+aP.w*3.0); gl_Position = uVP*vec4(p,1.0); gl_PointSize = uSize;
}`;
const PFS = `#version 300 es
precision highp float;
in vec3 vW; in float vTw; uniform sampler2D uLight; uniform sampler2D uVis; uniform vec2 uMap; out vec4 frag;
void main(){
  vec2 d = gl_PointCoord-0.5; float r = length(d); if(r>0.5) discard;
  vec2 uv = vW.xz/uMap; vec3 v = texture(uVis, uv).rgb; vec3 L = texture(uLight, uv).rgb*2.0;
  float lum = dot(L, vec3(0.3,0.59,0.11));
  float k = smoothstep(0.3, 0.85, lum)*v.r*(1.0 - v.b)*(0.35+0.65*vTw);
  frag = vec4(L*(1.0-r*2.0)*k*0.5, 1.0);
}`;
