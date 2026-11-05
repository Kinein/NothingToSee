//@ gfx/vf-sky — Over your head in a photo: ceilings, the sky, the city past the edge of town
//@ Defines: VF_SKY_FS, VF_UPPER, vfRoof, VF_SUN, VF_MOON, vfOrb, vfBackdrop
//@ Uses:    gfx/gl, world/grid, gfx/viewfinder, gfx/renderer, world/light-map, sim/core, gfx/frame, gfx/look, gfx/world-geometry, core/util, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what's over your head in a photo. The town is built for the camera up above it: no ceilings, no sky,
// nothing above the walls, nothing past the edge of the map. The square sees it from your own eyes, so it fills in
// every pixel nothing else drew, walking each ray from the lens across the map a quarter tile at a time:
// · the first room it rises into the top of: its ceiling (plaster at home; in the office and the shop a grid of tiles
//   with light panels that burn when the room is lit, glowing on the tiles round them, vents, the odd water stain and
//   more of them once it has turned, a panel or two flickering; bare concrete anywhere else), darker along the walls,
//   the flash on it in the still
// · the first building it meets above the walls: its upper floors, in its own colour and brick or boards, a cornice
//   on top, windows that hold the sky by day and are lit by night (some red, once the night has turned)
// · past all that, the sky for the hour (the sun, clouds lit from the sun's side, rain's grey lid, stars and the moon
//   at night, red once the night has turned, the town's glow under the clouds) and a city round the horizon: two rows
//   of blocks, lit on the sun's side and hazy by day, windows lit by night, a red light blinking on the masts.
// Render only, only in the square.
const VF_SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLight; uniform sampler2D uVis; uniform sampler2D uRoof;
uniform vec2 uMap; uniform float uTownH; uniform float uCeil;
uniform vec3 uEye; uniform vec3 uRt; uniform vec3 uUp; uniform vec3 uFw; uniform float uTan; uniform float uPx; uniform mat4 uVP;
uniform vec3 uSky; uniform vec3 uFog; uniform vec3 uFill; uniform vec4 uLook;
uniform float uDay; uniform float uRain; uniform float uTime;
uniform vec3 uSun; uniform vec3 uMoon;
uniform vec4 uFlP; uniform vec3 uFlC;   // the flash in the still: where, how far, its colour
uniform vec4 uBld[8]; uniform float uBSt[8];   // by building: rgb its outside, a how tall; its kind (1 flats, 2 office, 3 shop, 4 boards)
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*vn(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
// a line on every integer of x, w wide; f is a pixel in the same units: it softens, then fades once it can't be drawn
float lineAA(float x, float w, float f){ float d = abs(fract(x + 0.5) - 0.5); return (1.0 - smoothstep(w - f, w + f, d))*(1.0 - smoothstep(0.25, 0.6, f)); }
vec3 toon(vec3 b){ float bl = lum(b); return max(mix(vec3(bl), b, 1.0 + 0.32*uLook.x), 0.0)*(1.0 + 0.08*uLook.x); }
vec3 lightAt(vec2 q){ vec3 L = texture(uLight, q/uMap).rgb*2.0; L /= 1.0 + max(L - 1.05, vec3(0.0))*0.85;
  return L*mix(vec3(1.0), vec3(1.1, 1.0, 0.86), uLook.x*0.8); }
// what you can't see from here is the same fog the floor has
vec3 unseen(vec3 col, vec3 base, vec2 q){
  vec3 V = texture(uVis, q/uMap).rgb;
  vec3 hid = mix(uFog, base*(uFill*0.62 + vec3(0.05, 0.06, 0.1))*0.4 + uFog*0.4, V.g);
  return mix(hid, col, V.r);
}
float kindAt(vec2 q){ return floor(texelFetch(uRoof, ivec2(floor(q*2.0)), 0).r*255.0/80.0 + 0.5); }
// ── the sky
vec3 skyAt(vec3 d){
  float sl = lum(uSky), night = 1.0 - uDay, e = clamp(d.y, 0.0, 1.0), clear = 1.0 - uRain;
  vec3 hor = uSky*1.12 + vec3(0.012, 0.014, 0.03);
  vec3 zen = mix(vec3(0.006, 0.01, 0.03), vec3(0.2, 0.36, 0.72)*(0.5 + sl), uDay);
  zen = mix(zen, uSky*vec3(0.42, 0.5, 0.95), 0.3);
  vec3 col = mix(hor, zen, pow(e, 0.5));
  vec3 sunC = mix(vec3(1.0, 0.6, 0.38), vec3(1.0, 0.96, 0.9), smoothstep(0.05, 0.45, uSun.y));
  // the sun, and its glare warming the sky round it
  float sd = dot(d, uSun), up = smoothstep(-0.1, 0.1, uSun.y);
  col += sunC*pow(max(sd, 0.0), 8.0)*0.35*up*clear;
  col += sunC*1.4*smoothstep(0.9993, 0.9997, sd)*up*clear*2.0;
  // stars, twinkling
  if(night > 0.05 && e > 0.0){
    vec2 sp = d.xz/(d.y + 1.0)*180.0, id = floor(sp);
    float hs = h21(id);
    vec2 o = fract(sp) - 0.5 - (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5)*0.6;
    float st = step(0.965, hs)*smoothstep(0.12, 0.0, length(o))*(0.6 + 0.4*sin(uTime*(1.5 + hs*3.0) + hs*40.0));
    col += vec3(0.9, 0.92, 1.0)*st*night*smoothstep(0.02, 0.2, e)*0.9*clear;
  }
  // the moon; red when the night has turned
  float md = dot(d, uMoon);
  vec3 mc = mix(vec3(0.95, 0.93, 0.85), vec3(1.0, 0.12, 0.06), smoothstep(0.4, 0.9, uLook.y)*uLook.z);
  col += mc*(smoothstep(0.99955, 0.9997, md)*1.3 + pow(max(md, 0.0), 300.0)*0.12)*night*smoothstep(-0.05, 0.05, uMoon.y)*(1.0 - uRain*0.85);
  // rain's lid: grey by day, by night the town's own light on its underside
  vec3 lid = mix(vec3(0.045, 0.036, 0.034) + vec3(0.03, 0.018, 0.01)*(1.0 - e), vec3(lum(col))*0.8 + uSky*0.1, uDay);
  col = mix(col, lid, uRain*0.75);
  // clouds drifting over: lit on the sun's side, a bright rim toward it; at night the town's light under them
  if(e > 0.0){
    vec2 cp = d.xz/(e + 0.1)*0.8 + vec2(uTime*0.01, uTime*0.004);
    float cov = mix(mix(0.56, 0.5, uDay), 0.3, uRain);
    float n0 = fbm(cp), c = smoothstep(cov, cov + 0.22, n0)*smoothstep(0.0, 0.1, e);
    float n1 = fbm(cp + normalize(uSun.xz + vec2(1e-4))*0.09);
    float lit = clamp(0.55 + (n0 - n1)*5.0, 0.0, 1.0);
    vec3 hi = sunC*(0.72 + sl*0.55), lo = mix(hor, vec3(0.44, 0.48, 0.58)*(0.4 + sl), 0.6);
    vec3 cc = mix(lo, hi, lit) + sunC*pow(max(sd, 0.0), 12.0)*(1.0 - c)*0.8*up;
    cc = mix(vec3(0.05, 0.042, 0.042) + vec3(0.07, 0.04, 0.022)*(1.0 - e), cc, uDay);
    cc = mix(cc, vec3(lum(cc))*0.8, uRain*0.6);
    col = mix(col, cc, c*0.92);
  }
  col += vec3(0.06, 0.035, 0.018)*night*pow(1.0 - e, 6.0);
  return col;
}
// ── the city past the edge of town, round the horizon: a far row of blocks, a near row over it
vec3 cityAt(vec3 d, vec3 col){
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0));
  float fe = uPx*1.2, night = 1.0 - uDay, sl = lum(uSky), sunAz = atan(uSun.x, uSun.z);
  vec3 hor = uSky*1.12 + vec3(0.012, 0.014, 0.03);
  for(int r=0;r<2;r++){
    float near = float(r), N = near > 0.5 ? 72.0 : 150.0;
    float a = az/6.2831853*N + near*17.3, id = floor(a), fa = fract(a), fw = uPx*N/6.2831853 + 1e-4;
    float hs = h21(vec2(id, near*13.1 + 1.0)), tower = step(0.93, hs);
    float top = (near > 0.5 ? 0.02 + 0.05*hs : 0.035 + 0.08*hs*hs) + tower*0.06;
    float hw = 0.3 + 0.2*h21(vec2(id, 5.3 + near));   // gaps between the blocks
    float m = smoothstep(hw + fw, hw - fw, abs(fa - 0.5))*smoothstep(top + fe, top - fe, el);
    // a narrower crown on some of them
    float crown = step(0.55, hs)*smoothstep(hw*0.55 + fw, hw*0.55 - fw, abs(fa - 0.5))*smoothstep(top + 0.012*hs + 0.006 + fe, top + 0.012*hs + 0.006 - fe, el);
    m = max(m, crown);
    if(near < 0.5) m = max(m, smoothstep(0.012 + fe, 0.012 - fe, el));   // never an empty horizon
    float mast = tower*near*smoothstep(fw*2.0, 0.0, abs(fa - 0.5) - 0.01)*step(top, el)*smoothstep(top + 0.035 + fe, top + 0.035 - fe, el);
    vec3 dayC = mix(hor, vec3(0.42, 0.46, 0.55)*(0.4 + sl), near > 0.5 ? 0.7 : 0.45)*(0.88 + 0.24*h21(vec2(id, 9.1 + near)));
    // the side toward the sun lit, the other in its own shade
    float side = (sin(sunAz - (id + 0.5)/N*6.2831853) > 0.0) == (fa > 0.5 + (h21(vec2(id, 2.2)) - 0.5)*0.3) ? 1.0 : 0.0;
    dayC *= mix(0.84, 1.08, side*smoothstep(-0.05, 0.2, uSun.y)*(1.0 - uRain));
    vec3 bc = mix(near > 0.5 ? vec3(0.012, 0.013, 0.025) : vec3(0.02, 0.022, 0.04), dayC, uDay);
    bc = mix(bc, hor, uRain*(near > 0.5 ? 0.3 : 0.55));
    bc = mix(bc, hor, (1.0 - smoothstep(-0.01, top, el))*0.3*uDay);   // mist lies thickest at their feet
    // windows: a grid on every block, some lit at night, warm or the blue of a television; by day a darker grid
    vec2 cs = vec2(near > 0.5 ? 6.0 : 4.0, near > 0.5 ? 0.0045 : 0.0035);
    vec2 wg = vec2(fa*cs.x, el/cs.y), wi = floor(wg), wf = abs(fract(wg) - 0.5);
    float on = step(h21(wi + vec2(id*7.1, near*3.3)), 0.03 + 0.3*night);
    float shape = step(wf.x, 0.3)*step(wf.y, 0.28);
    float aa = clamp(uPx/cs.y*1.5, 0.0, 1.0);
    vec3 wc = mix(vec3(1.0, 0.78, 0.45), vec3(0.55, 0.7, 1.0), step(0.8, h21(wi + id)));
    float inside = step(0.003, top - el);
    vec3 lit = wc*on*mix(shape, 0.17, aa)*mix(0.15, 0.9, night)*inside*(near > 0.5 ? 1.0 : 0.6);
    bc *= 1.0 - mix(shape, 0.3, aa)*0.12*uDay*inside;
    col = mix(col, bc + lit, m);
    float blink = step(0.0, sin(uTime*2.4 + id));
    col = mix(col, bc, mast*0.8);
    col += vec3(1.2, 0.05, 0.03)*mast*blink*night*smoothstep(top + 0.026, top + 0.034, el);
  }
  return col;
}
// ── a ceiling over a room, seen from below. st: 1 plaster, 2 tiles, 3 concrete; fp a pixel there, in metres
vec3 ceilingAt(vec3 p, float st, float fp){
  vec2 q = p.xz;
  float n = vn(q*3.1)*0.6 + vn(q*11.0)*0.4;
  vec3 L = lightAt(q), base, glow = vec3(0.0);
  float on = smoothstep(0.22, 0.7, lum(L)), lk = 0.55, halo = 0.0;
  if(st < 1.5) base = vec3(0.82, 0.78, 0.71)*(0.95 + 0.06*n);
  else if(st < 2.5){
    // tiles on a T-bar grid, a speckle of holes in each, the odd stain
    vec2 g = q/0.6, ti = floor(g), f = fract(g);
    float fg = fp/0.6;
    base = vec3(0.79, 0.78, 0.74)*(0.95 + 0.06*h21(ti));
    base *= 1.0 - 0.1*step(0.8, h21(floor(q*42.0)))*(1.0 - smoothstep(0.004, 0.015, fp));
    if(h21(ti + 31.0) < 0.03 + 0.12*uLook.y){
      float r = length(f - 0.5 - (vec2(h21(ti + 2.0), h21(ti + 5.0)) - 0.5)*0.3) + vn(q*9.0)*0.08;
      base = mix(base, base*vec3(0.84, 0.74, 0.56), smoothstep(0.33, 0.25, r)*0.65);
      base *= 1.0 - 0.18*smoothstep(0.025, 0.0, abs(r - 0.3));
    }
    float bar = lineAA(g.x, 0.025, fg) + lineAA(g.y, 0.025, fg);
    base = mix(base, vec3(0.88, 0.88, 0.86), clamp(bar, 0.0, 1.0)*0.8);
    base *= 1.0 - 0.22*clamp(lineAA(g.x, 0.045, fg) + lineAA(g.y, 0.045, fg) - bar, 0.0, 1.0);   // the shadow along each bar
    // a light panel two tiles by one, every fourth tile along and third across, where it fits under this ceiling
    vec2 pc = vec2(floor(ti.x/4.0)*4.0 + 1.0, floor(ti.y/3.0)*3.0 + 1.0);
    vec2 pq = (g - pc)/vec2(2.0, 1.0);
    bool fits = kindAt((pc + vec2(0.2, 0.5))*0.6) > 1.5 && kindAt((pc + vec2(1.8, 0.5))*0.6) > 1.5;
    float pid = h21(pc), fl = step(pid, 0.15*smoothstep(0.3, 0.8, uLook.y));
    float pon = on*(1.0 - fl*step(0.55, vn(vec2(uTime*9.0, pid*50.0))));   // once it has turned, a few of them stutter
    if(fits){
      vec2 pd = abs(pq - 0.5)*vec2(1.2, 0.6);
      float edge = max(pd.x - 0.56, pd.y - 0.26);
      halo = exp(-max(edge, 0.0)*2.6)*pon;
      if(edge < 0.0){
        vec2 lv = abs(fract(pq*vec2(8.0, 4.0)) - 0.5);
        float louvre = mix(1.0, 0.86 + 0.14*smoothstep(0.5, 0.3, max(lv.x, lv.y)), 1.0 - smoothstep(0.02, 0.05, fp));
        float rim = smoothstep(-0.035, -0.02, edge);
        base = mix(vec3(0.9, 0.9, 0.87), vec3(0.6, 0.61, 0.6), rim);
        glow = vec3(1.0, 0.98, 0.93)*(1.6*louvre*(1.0 - rim))*pon;
      }
    }
    // and a square vent, now and then
    if(mod(ti.x, 4.0) == 3.0 && mod(ti.y, 6.0) == 4.0){
      float r = max(abs(f.x - 0.5), abs(f.y - 0.5));
      if(r < 0.42) base *= mix(1.0, 0.84 + 0.16*smoothstep(0.35, 0.65, fract(r*11.0)), 1.0 - smoothstep(0.02, 0.05, fp))*(r < 0.08 ? 0.65 : 1.0);
    }
    lk = 0.42;
  } else base = vec3(0.5, 0.5, 0.48)*(0.85 + 0.25*n);
  base = toon(base);
  // darker into the corners: the walls' quarter-tiles, blurred
  vec2 rs = vec2(textureSize(uRoof, 0)), r2 = q*2.0;
  float w = texture(uRoof, (r2 + vec2(0.6, 0.0))/rs).g + texture(uRoof, (r2 - vec2(0.6, 0.0))/rs).g
          + texture(uRoof, (r2 + vec2(0.0, 0.6))/rs).g + texture(uRoof, (r2 - vec2(0.0, 0.6))/rs).g;
  float ao = 1.0 - 0.4*smoothstep(0.05, 0.75, w*0.25);
  vec3 col = base*(L*lk + uFill*0.48 + vec3(1.0, 0.97, 0.9)*halo*0.32 + vec3(0.02, 0.024, 0.034))*ao + glow;
  if(uFlP.w > 0.0){
    vec3 dv = uFlP.xyz - p; float dl = max(length(dv), 0.1), lr = uFlP.w;
    col += base*uFlC*0.6*max(-dv.y/dl, 0.0)*(lr*lr/(lr*lr + dl*dl*1.4))*smoothstep(lr*1.6, lr*0.4, dl);   // the flash is aimed ahead, not up
  }
  return unseen(col, base, q);
}
// ── a building's upper floors, where the ray met it: n2 the face (outward, in x/z), bi which building, fp a pixel there
vec3 facadeAt(vec3 p, vec2 n2, int bi, vec3 d, float fp){
  vec3 base = uBld[bi].rgb;
  float bh = uBld[bi].a, sty = uBSt[bi], y = p.y, a = abs(n2.x) > 0.5 ? p.z : p.x;
  float night = 1.0 - uDay;
  // the finish: brick in courses, or boards
  if(sty > 3.5){ float g = fract(y/0.22); base *= mix(0.8, 1.0, mix(smoothstep(0.0, 0.2, g), 0.92, smoothstep(0.03, 0.1, fp))); }
  else {
    float row = y/0.15, off = mod(floor(row), 2.0)*0.5, bj = floor(a/0.3 + off);
    base *= 0.94 + 0.12*h21(vec2(bj, floor(row)))*(1.0 - smoothstep(0.03, 0.08, fp));
    base *= 1.0 - 0.18*max(lineAA(row, 0.08, fp/0.15), lineAA(a/0.3 + off, 0.05, fp/0.3));
  }
  float yy = y - uCeil, fl = floor(yy/2.9), ly = yy - fl*2.9;
  // a belt where the real wall stops, a band between floors on the brick ones, a cornice on top
  if(yy < 0.16) base *= 0.7;
  else if(sty < 3.5 && ly < 0.1) base = mix(base, vec3(0.62, 0.6, 0.56), 0.55);
  float corn = smoothstep(bh - 0.32, bh - 0.3, y);
  base = mix(base, mix(base*1.25, vec3(0.6, 0.58, 0.54), 0.4), corn);
  base *= 1.0 - 0.35*smoothstep(bh - 0.42, bh - 0.32, y)*(1.0 - corn);   // its shadow under it
  if(sty > 2.5 && sty < 3.5) base = mix(base, vec3(0.78, 0.72, 0.56), smoothstep(0.42, 0.44, ly)*smoothstep(1.02, 1.0, ly)*0.6);   // the shop's painted band
  base = toon(base);
  vec3 n3 = vec3(n2.x, 0.0, n2.y);
  // lit like the walls under it: the sky's light all the way up, the street lamps only near the bottom
  vec2 q = p.xz + n2*0.6;
  vec3 L = lightAt(q), Lsky = min(L, uSky);
  L = Lsky + (L - Lsky)*exp(-yy*0.5);
  float sh = dot(n2, vec2(0.55, -0.83));
  vec3 col = base*(L*(0.8 + 0.1*sh) + uFill*(0.7 + 0.12*sh) + vec3(0.02, 0.026, 0.04));
  col += base*mix(vec3(1.0, 0.6, 0.38), vec3(1.0, 0.96, 0.9), smoothstep(0.05, 0.45, uSun.y))*max(dot(n3, uSun), 0.0)*0.3*uDay*(1.0 - uRain);
  // windows, by kind: flats, the office's ribbons, none over the shop, wooden houses with white frames
  float sp = sty < 1.5 ? 1.6 : sty < 2.5 ? 0.9 : 2.2, hwid = sty < 1.5 ? 0.38 : sty < 2.5 ? 0.43 : 0.42;
  float y0 = sty < 2.5 ? 0.85 : 0.8, y1 = sty < 1.5 ? 2.15 : sty < 2.5 ? 2.3 : 2.05;
  float wx = (fract(a/sp) - 0.5)*sp;
  if(sty < 2.5 || sty > 3.5){
    if(abs(wx) < hwid && ly > y0 && ly < y1 && y < bh - 0.45){
      vec2 wid = vec2(floor(a/(sty > 1.5 && sty < 2.5 ? 3.6 : sp)), fl) + float(bi)*17.0;
      float fr = min(min(hwid - abs(wx), ly - y0), y1 - ly);
      float frame = 1.0 - smoothstep(0.05, 0.07 + fp, fr);
      vec3 fc = sty > 3.5 ? vec3(0.82, 0.8, 0.74) : sty > 1.5 ? vec3(0.22, 0.23, 0.25) : vec3(0.36, 0.3, 0.26);
      // the glass: the sky in it by day, dark by night unless somebody's home
      vec3 R = skyAt(normalize(reflect(d, n3) + vec3(0.0, 0.05, 0.0)));
      float hs = h21(wid);
      vec3 glass = vec3(0.012, 0.014, 0.02) + R*mix(0.35, 0.55, uDay);
      float lit = step(hs, (sty > 1.5 && sty < 2.5 ? 0.22 : 0.48)*night + 0.02);
      vec3 wc = mix(vec3(1.0, 0.74, 0.42), vec3(0.6, 0.72, 1.0), step(0.85, h21(wid + 4.0)));
      float drape = sty > 1.5 && sty < 2.5 ? 0.8 + 0.2*step(0.5, fract(ly*9.0)) : mix(0.55, 1.0, smoothstep(0.1, 0.0, abs(wx) - hwid*0.45));
      glass += wc*lit*drape*mix(0.25, 1.15, night);
      float rw = step(h21(wid + 7.7), 0.3)*smoothstep(0.4, 0.9, uLook.y)*(0.3 + 0.7*uLook.z);
      glass += vec3(1.0, 0.07, 0.04)*rw*(1.3 + 0.35*sin(uTime*1.3 + hs*9.0));
      col = mix(glass, fc*(L*0.8 + uFill*0.7 + 0.02), frame);
    } else if(abs(wx) < hwid + 0.05 && ly > y0 - 0.1 && ly < y0 && sty < 1.5) col *= 1.25;   // a sill under it
  }
  col = mix(col, uSky*1.12 + vec3(0.012, 0.014, 0.03), clamp(distance(p, uEye)/90.0, 0.0, 0.35)*uDay);
  return unseen(col, base, q);
}
// out along the ray through the quarter-tile map: the first room it rises into the top of (w 1: its ceiling), or the
// first building it meets above the walls (w 2: its upper floors). Rays going down meet only what's already drawn.
vec4 march(vec3 d, out vec2 nrm, out ivec2 cell){
  vec2 g0 = uEye.xz*2.0, gd = d.xz*2.0;
  ivec2 c = ivec2(floor(g0)), sz = textureSize(uRoof, 0);
  vec2 st = vec2(gd.x >= 0.0 ? 1.0 : -1.0, gd.y >= 0.0 ? 1.0 : -1.0);
  vec2 td = 1.0/max(abs(gd), vec2(1e-5));
  vec2 tm = (st*(vec2(c) - g0) + max(st, 0.0))*td;
  float t0 = 0.0;
  bool town = uEye.z < uTownH;
  nrm = vec2(0.0); cell = c;
  for(int i=0;i<240;i++){
    if(c.x < 0 || c.y < 0 || c.x >= sz.x || c.y >= sz.y || (float(c.y)*0.5 < uTownH) != town) break;
    vec4 rf = texelFetch(uRoof, c, 0);
    float t1 = min(tm.x, tm.y), y0 = uEye.y + d.y*t0, y1 = uEye.y + d.y*t1;
    if(rf.r > 0.1){
      if(y0 < uCeil && y1 >= uCeil){ cell = c; return vec4(uEye + d*((uCeil - uEye.y)/d.y), 1.0); }
      if(t0 > 0.0 && y0 >= uCeil && y0 < uBld[int(rf.b*255.0 + 0.5)].a){ cell = c; return vec4(uEye + d*t0, 2.0); }
    }
    if(y0 > 12.0 || t0 > 70.0) break;
    if(tm.x < tm.y){ t0 = tm.x; tm.x += td.x; c.x += int(st.x); nrm = vec2(-st.x, 0.0); }
    else { t0 = tm.y; tm.y += td.y; c.y += int(st.y); nrm = vec2(0.0, -st.y); }
  }
  return vec4(0.0);
}
void main(){
  vec2 sp = vUv*2.0 - 1.0;
  vec3 d = normalize(uFw + (sp.x*uRt + sp.y*uUp)*uTan);
  if(d.y > 1e-3){
    vec2 n2; ivec2 c;
    vec4 h = march(d, n2, c);
    if(h.w > 0.5){
      vec3 p = h.xyz;
      float t = distance(p, uEye);
      vec3 col = h.w < 1.5 ? ceilingAt(p, floor(texelFetch(uRoof, c, 0).r*255.0/80.0 + 0.5), t*uPx/max(d.y, 0.15))
                           : facadeAt(p, n2, int(texelFetch(uRoof, c, 0).b*255.0 + 0.5), d, t*uPx/max(abs(dot(d.xz, n2)), 0.15));
      vec4 cl = uVP*vec4(p, 1.0);
      gl_FragDepth = clamp(cl.z/cl.w*0.5 + 0.5, 0.0, 1.0);
      frag = vec4(col, 1.0);
      return;
    }
  }
  gl_FragDepth = 1.0;
  frag = vec4(cityAt(d, skyAt(d)), 1.0);
}`;
// how tall each building stands above its walls, and what its upper floors are like (1 flats, 2 office, 3 shop, 4 boards)
const VF_UPPER = {
  office: [8.5, 2],
  shop: [4.3, 3],
  apt: [8.5, 1],
  row: [5.6, 4],
  mill: [5.6, 4],
};
// the ceilings and buildings, once: a quarter-tile map, r the kind of ceiling (kind*80), g the walls (for the dark
// along them), b which building (its index + 1). A wall's quarter belongs to the side it faces, so a room's ceiling runs
// right up to its wall and stops at the street, and a building's upper floors stand on its outer walls.
function vfRoof() {
  if (VF.roof) return VF.roof;
  const kind = (x, z) => {
    if (!inb(x, z)) return 0;
    const c = tiles[I(x, z)];
    if (OUTDOOR.has(c) || VOIDISH.has(c) || WALLISH.has(c)) return 0;
    const b = (roomAt(x, z) || {}).bld;
    return b === 'office' || b === 'shop' ? 2 : b === 'lair' || b === 'station' ? 3 : 1;
  };
  const px = new Uint8Array(W * 2 * H * 2 * 4);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const wall = WALLISH.has(tiles[I(x, z)]),
        bi = BUILDINGS.indexOf(buildingAt(x, z)) + 1;
      for (let qz = 0; qz < 2; qz++)
        for (let qx = 0; qx < 2; qx++) {
          let k = kind(x, z);
          if (wall) {
            const dx = qx ? 1 : -1,
              dz = qz ? 1 : -1;
            k = Math.max(kind(x + dx, z), kind(x, z + dz), kind(x + dx, z + dz));
          }
          const o = ((z * 2 + qz) * W * 2 + (x * 2 + qx)) * 4;
          px[o] = k * 80;
          px[o + 1] = wall ? 255 : 0;
          px[o + 2] = bi;
          px[o + 3] = 255;
        }
    }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W * 2, H * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // by building: its outside colour and height, its kind; 0 is no building (no upper floors)
  VF.bld = new Float32Array(32);
  VF.bst = new Float32Array(8);
  BUILDINGS.forEach((b, i) => {
    const up = VF_UPPER[b.id] || [WALL_H, 1],
      c = hex(b.ext);
    VF.bld.set([c[0], c[1], c[2], up[0]], (i + 1) * 4);
    VF.bst[i + 1] = up[1];
  });
  VF.roof = t;
  return t;
}
const VF_SUN = [0, 0, 0],
  VF_MOON = [0, 0, 0];
// the sun across the day from one side of town to the other, the moon across the night
function vfOrb(out, h, z) {
  const a = (Math.PI * h) / 12,
    x = Math.cos(a),
    y = Math.sin(a),
    l = Math.hypot(x, y, z);
  out[0] = x / l;
  out[1] = y / l;
  out[2] = z / l;
  return out;
}
// in drawScene, from the square's eyes, after everything solid: into every pixel still empty, and in front of what a
// ceiling or an upper floor would hide (gfx/frame)
function vfBackdrop() {
  if (!VF.skyP) VF.skyP = compileProgram(QVS, VF_SKY_FS);
  const roof = vfRoof(),
    u = VF.skyP.U,
    e = cam.eye,
    v = cam.view,
    tn = Math.tan(VF.fov / 2),
    h = hourF(),
    sl = SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11,
    fl = VF.flash;
  gl.useProgram(VF.skyP.p);
  gl.bindVertexArray(R.emptyVao);
  gl.disable(gl.BLEND);
  gl.depthFunc(gl.LEQUAL);
  bindTex(0, R.tLight, u.uLight);
  bindTex(1, R.tVis, u.uVis);
  bindTex(2, roof, u.uRoof);
  gl.uniform2f(u.uMap, W, H);
  gl.uniform1f(u.uTownH, TOWN_H);
  gl.uniform1f(u.uCeil, WALL_H);
  gl.uniform3f(u.uEye, e[0], e[1], e[2]);
  gl.uniform3f(u.uRt, v[0], v[4], v[8]);
  gl.uniform3f(u.uUp, v[1], v[5], v[9]);
  gl.uniform3f(u.uFw, -v[2], -v[6], -v[10]);
  gl.uniform1f(u.uTan, tn);
  gl.uniform1f(u.uPx, (2 * tn) / VF.S);
  gl.uniformMatrix4fv(u.uVP, false, cam.VP);
  gl.uniform3fv(u.uSky, SKY);
  gl.uniform3fv(u.uFog, LOOK.fog);
  gl.uniform3fv(u.uFill, LOOK.fill);
  gl.uniform4fv(u.uLook, LOOK.vec);
  gl.uniform1f(u.uDay, clamp((sl - 0.04) / 0.5, 0, 1));
  gl.uniform1f(u.uRain, G ? G.rainK || 0 : 0);
  gl.uniform1f(u.uTime, R.time);
  gl.uniform3fv(u.uSun, vfOrb(VF_SUN, h - 6, 0.4));
  gl.uniform3fv(u.uMoon, vfOrb(VF_MOON, (h + 6) % 24, -0.3));
  gl.uniform4f(u.uFlP, fl ? fl.x : 0, fl ? fl.y : 0, fl ? fl.z : 0, fl ? fl.r : 0);
  gl.uniform3f(u.uFlC, fl ? fl.col[0] : 0, fl ? fl.col[1] : 0, fl ? fl.col[2] : 0);
  gl.uniform4fv(u.uBld, VF.bld);
  gl.uniform1fv(u.uBSt, VF.bst);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.depthFunc(gl.LESS);
  gl.activeTexture(gl.TEXTURE0);
}
