//@ gfx/vf-sky — Over your head in a photo: ceilings, the sky, the city past the edge of town
//@ Defines: VF_SKY_FS, vfRoof, VF_SUN, VF_MOON, vfOrb, vfBackdrop
//@ Uses:    gfx/gl, world/grid, gfx/viewfinder, gfx/renderer, world/light-map, sim/core, gfx/frame, gfx/look, gfx/post, gfx/world-geometry, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what's over your head in a photo. The town is built for the camera up above it: no ceilings, no sky,
// nothing past the edge of the map. The square sees it from your own eyes, so it fills in every pixel nothing else drew,
// traced from the lens: over a room, its ceiling at the top of the walls (plaster at home, tiles and light panels in
// the office and the shop, bare concrete anywhere else), lit by the room's own light, darker along the walls, the
// flash on it in the still; out of doors, the sky for the hour (the sun, clouds, rain's grey lid, stars and the moon at
// night, the moon red once the night has turned, the town's glow under it all) and a city past the edge of town, two
// rows of blocks, hazy by day, windows lit by night, a red light blinking on the masts. Render only, only in the square.
const VF_SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLight; uniform sampler2D uVis; uniform sampler2D uRoof;
uniform vec2 uMap; uniform float uTownH; uniform float uCeil;
uniform vec3 uEye; uniform vec3 uRt; uniform vec3 uUp; uniform vec3 uFw; uniform float uTan; uniform mat4 uVP;
uniform vec3 uSky; uniform vec3 uFog; uniform vec3 uFill; uniform vec4 uLook;
uniform float uDay; uniform float uRain; uniform float uTime;
uniform vec3 uSun; uniform vec3 uMoon;
uniform vec4 uFlP; uniform vec3 uFlC;   // the flash in the still: where, how far, its colour
out vec4 frag;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*vn(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
// the ceiling over a room, seen from below. st: 1 plaster, 2 tiles, 3 concrete
vec3 ceilingAt(vec3 p, float st){
  vec2 q = p.xz;
  float n = vn(q*3.1)*0.6 + vn(q*11.0)*0.4, panel = 0.0;
  vec3 base;
  if(st < 1.5) base = vec3(0.82, 0.78, 0.71)*(0.95 + 0.06*n);
  else if(st < 2.5){
    vec2 g = q/0.6, f = abs(fract(g) - 0.5); float fw = fwidth(g.x) + fwidth(g.y);
    float seam = smoothstep(0.49, 0.47 - fw, max(f.x, f.y));
    base = vec3(0.8, 0.8, 0.76)*(0.93 + 0.08*vn(q*23.0))*mix(0.72, 1.0, seam);
    vec2 lp = q - (floor(q/2.4) + 0.5)*2.4;   // a light panel in the middle of every 2.4 m
    panel = smoothstep(0.02 + fw*0.3, 0.0, max(abs(lp.x) - 0.6, abs(lp.y) - 0.3));
    base = mix(base, vec3(0.9, 0.9, 0.86), panel);
  } else base = vec3(0.5, 0.5, 0.48)*(0.85 + 0.25*n);
  vec2 uv = q/uMap;
  vec3 L = texture(uLight, uv).rgb*2.0; L /= 1.0 + max(L - 1.05, vec3(0.0))*0.85;
  L *= mix(vec3(1.0), vec3(1.1, 1.0, 0.86), uLook.x*0.8);
  // darker into the corners: the walls' quarter-tiles, blurred
  vec2 rs = vec2(textureSize(uRoof, 0)), r2 = q*2.0;
  float w = texture(uRoof, (r2 + vec2(0.6, 0.0))/rs).g + texture(uRoof, (r2 - vec2(0.6, 0.0))/rs).g
          + texture(uRoof, (r2 + vec2(0.0, 0.6))/rs).g + texture(uRoof, (r2 - vec2(0.0, 0.6))/rs).g;
  float ao = 1.0 - 0.4*smoothstep(0.05, 0.75, w*0.25);
  vec3 col = base*(L*0.55 + uFill*0.5 + vec3(0.02, 0.024, 0.034))*ao;
  col += panel*vec3(1.0, 0.98, 0.92)*1.5*smoothstep(0.22, 0.7, lum(L));   // the panels burn when the room's lit
  if(uFlP.w > 0.0){
    vec3 dv = uFlP.xyz - p; float dl = max(length(dv), 0.1), lr = uFlP.w;
    col += base*uFlC*0.6*max(-dv.y/dl, 0.0)*(lr*lr/(lr*lr + dl*dl*1.4))*smoothstep(lr*1.6, lr*0.4, dl);   // the flash is aimed ahead, not up
  }
  // what you can't see from here is the same fog the floor has
  vec3 V = texture(uVis, uv).rgb;
  vec3 hid = mix(uFog, base*(uFill*0.62 + vec3(0.05, 0.06, 0.1))*0.4 + uFog*0.4, V.g);
  return mix(hid, col, V.r);
}
vec3 skyAt(vec3 d){
  float sl = lum(uSky), night = 1.0 - uDay, e = clamp(d.y, 0.0, 1.0);
  vec3 hor = uSky*1.12 + vec3(0.012, 0.014, 0.03);
  vec3 zen = mix(vec3(0.006, 0.01, 0.03), vec3(0.2, 0.36, 0.72)*(0.5 + sl), uDay);
  zen = mix(zen, uSky*vec3(0.42, 0.5, 0.95), 0.3);
  vec3 col = mix(hor, zen, pow(e, 0.5));
  float clear = 1.0 - uRain;
  // the sun, and its glare warming the sky round it
  float sd = dot(d, uSun), up = smoothstep(-0.1, 0.1, uSun.y);
  col += vec3(1.0, 0.75, 0.5)*pow(max(sd, 0.0), 8.0)*0.35*up*clear;
  col += vec3(1.4, 1.25, 1.0)*smoothstep(0.9993, 0.9997, sd)*up*clear*2.0;
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
  // clouds drifting over, more of them and lower and greyer in the rain; the town's light under them at night
  if(e > 0.0){
    vec2 cp = d.xz/(e + 0.12)*1.3 + vec2(uTime*0.012, uTime*0.004);
    float cov = mix(0.58, 0.32, uRain);
    float c = smoothstep(cov, cov + 0.28, fbm(cp*0.6))*smoothstep(0.0, 0.12, e);
    vec3 cc = mix(vec3(0.03, 0.032, 0.05), uSky*1.25 + vec3(0.04), uDay);
    cc += vec3(0.07, 0.045, 0.025)*night*(1.0 - e);
    cc = mix(cc, vec3(lum(cc))*0.75, uRain*0.6);
    col = mix(col, cc, c*0.9);
  }
  col = mix(col, vec3(lum(col))*0.8 + uSky*0.1, uRain*0.7);
  col += vec3(0.06, 0.035, 0.018)*night*pow(1.0 - e, 6.0);
  return col;
}
// the city past the edge of town, round the horizon: a far row of blocks, a near row over it
vec3 cityAt(vec3 d, vec3 col){
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0));
  float fe = fwidth(el)*1.2 + 1e-5, night = 1.0 - uDay, sl = lum(uSky);
  vec3 hor = uSky*1.12 + vec3(0.012, 0.014, 0.03);
  for(int r=0;r<2;r++){
    float near = float(r), N = near > 0.5 ? 72.0 : 150.0;
    float a = az/6.2831853*N + near*17.3, id = floor(a), fa = fract(a), fw = fwidth(a) + 1e-4;
    float hs = h21(vec2(id, near*13.1 + 1.0)), tower = step(0.93, hs);
    float top = (near > 0.5 ? 0.02 + 0.05*hs : 0.035 + 0.08*hs*hs) + tower*0.06;
    float hw = 0.3 + 0.2*h21(vec2(id, 5.3 + near));   // gaps between the blocks
    float inX = smoothstep(hw + fw, hw - fw, abs(fa - 0.5));
    float m = inX*smoothstep(top + fe, top - fe, el);
    if(near < 0.5) m = max(m, smoothstep(0.012 + fe, 0.012 - fe, el));   // never an empty horizon
    // a mast on the towers, its red light blinking at night
    float mast = tower*near*smoothstep(fw*2.0, 0.0, abs(fa - 0.5) - 0.01)*step(top, el)*smoothstep(top + 0.035 + fe, top + 0.035 - fe, el);
    vec3 dayC = mix(hor, vec3(0.42, 0.46, 0.55)*(0.4 + sl), near > 0.5 ? 0.7 : 0.45);
    vec3 bc = mix(near > 0.5 ? vec3(0.012, 0.013, 0.025) : vec3(0.02, 0.022, 0.04), dayC, uDay);
    bc = mix(bc, hor, uRain*(near > 0.5 ? 0.3 : 0.55));
    // windows: a grid on every block, some lit at night, warm or the blue of a television
    vec2 wg = vec2(fa*(near > 0.5 ? 6.0 : 4.0), el/(near > 0.5 ? 0.0045 : 0.0035));
    vec2 wi = floor(wg), wf = abs(fract(wg) - 0.5);
    float on = step(h21(wi + vec2(id*7.1, near*3.3)), 0.03 + 0.3*night);
    float shape = step(wf.x, 0.3)*step(wf.y, 0.28);
    float aa = clamp(fwidth(wg.y)*1.5, 0.0, 1.0);
    vec3 wc = mix(vec3(1.0, 0.78, 0.45), vec3(0.55, 0.7, 1.0), step(0.8, h21(wi + id)));
    vec3 lit = wc*on*mix(shape, 0.17, aa)*mix(0.15, 0.9, night)*step(0.003, top - el)*(near > 0.5 ? 1.0 : 0.6);
    col = mix(col, bc + lit, m);
    float blink = step(0.0, sin(uTime*2.4 + id));
    col = mix(col, bc, mast*0.8);
    col += vec3(1.2, 0.05, 0.03)*mast*blink*night*smoothstep(top + 0.026, top + 0.034, el);
  }
  return col;
}
void main(){
  vec2 sp = vUv*2.0 - 1.0;
  vec3 d = normalize(uFw + (sp.x*uRt + sp.y*uUp)*uTan);
  if(d.y > 1e-3){
    float t = (uCeil - uEye.y)/d.y;
    vec3 p = uEye + d*t;
    if(t < 60.0 && p.x > 0.0 && p.z > 0.0 && p.x < uMap.x && p.z < uMap.y && (p.z < uTownH) == (uEye.z < uTownH)){
      float st = floor(texelFetch(uRoof, ivec2(floor(p.xz*2.0)), 0).r*255.0/80.0 + 0.5);
      if(st > 0.5){
        vec4 c = uVP*vec4(p, 1.0);
        gl_FragDepth = clamp(c.z/c.w*0.5 + 0.5, 0.0, 1.0);
        frag = vec4(ceilingAt(p, st), 1.0);
        return;
      }
    }
  }
  gl_FragDepth = 1.0;
  frag = vec4(cityAt(d, skyAt(d)), 1.0);
}`;
// the ceilings, once: a quarter-tile map, r the kind of ceiling (style*80), g the walls (for the dark along them). A
// wall's quarter belongs to the side it faces, so a room's ceiling runs right up to its wall and stops at the street.
function vfRoof() {
  if (VF.roof) return VF.roof;
  const kind = (x, z) => {
    if (!inb(x, z)) return 0;
    const c = tiles[I(x, z)];
    if (OUTDOOR.has(c) || VOIDISH.has(c) || WALLISH.has(c)) return 0;
    const b = (roomAt(x, z) || {}).bld;
    return b === 'office' || b === 'shop' ? 2 : b === 'lair' || b === 'station' ? 3 : 1;
  };
  const px = new Uint8Array(W * 2 * H * 2 * 2);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const wall = WALLISH.has(tiles[I(x, z)]);
      for (let qz = 0; qz < 2; qz++)
        for (let qx = 0; qx < 2; qx++) {
          let k = kind(x, z);
          if (wall) {
            const dx = qx ? 1 : -1,
              dz = qz ? 1 : -1;
            k = Math.max(kind(x + dx, z), kind(x, z + dz), kind(x + dx, z + dz));
          }
          const o = ((z * 2 + qz) * W * 2 + (x * 2 + qx)) * 2;
          px[o] = k * 80;
          px[o + 1] = wall ? 255 : 0;
        }
    }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, W * 2, H * 2, 0, gl.RG, gl.UNSIGNED_BYTE, px);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
// in drawScene, from the square's eyes, after everything solid: into every pixel still empty (gfx/frame)
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
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.depthFunc(gl.LESS);
  gl.activeTexture(gl.TEXTURE0);
}
