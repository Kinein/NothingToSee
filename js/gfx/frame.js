//@ gfx/frame — renderFrame: the world pass, decals, additive atmosphere, mask, bloom, composite
//@ Defines: renderFrame, drawMask, pass, bindTex, bloomPasses, composite
//@ Uses:    gfx/gl, gfx/renderer, gfx/draw-helpers, sim/core, horror/layer, world/vision, world/grid, ui/interface, taken/taken, gfx/post, …
//@ (header made by tools/map.js; stripped by build.py)
function renderFrame() {
  resizeCanvas();
  ensureTargets();
  const w = R.tw,
    h = R.th;
  const upload = MAPS.upload;
  MAPS.upload = false; // the light and sight maps only go to the GPU when they changed
  if (upload) {
    gl.bindTexture(gl.TEXTURE_2D, R.tLight);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, TH, gl.RGBA, gl.UNSIGNED_BYTE, texLight);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  gatherLamps();
  {
    const nightK = clamp(1 - (SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11) / 0.35, 0, 1);
    R.haze = nightK * (0.03 + 0.035 * (G ? G.rainK || 0 : 0) + HX.dread * 0.03);
  }
  if (upload) {
    gl.bindTexture(gl.TEXTURE_2D, R.tVis);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, TH, gl.RGBA, gl.UNSIGNED_BYTE, texVis);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.msFb);
  gl.viewport(0, 0, w, h);
  const fog = FOG_COL;
  gl.clearColor(fog[0] * 0.5, fog[1] * 0.5, fog[2] * 0.5, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.depthMask(true);

  useMain(0);
  updateFrustum(cam.VP);
  drawMesh(R.floor);
  drawMesh(R.walls);
  drawMesh(R.marks);
  for (const m of R.doorMeshes) {
    m.model = doorMatrix(m.door);
    if (meshInView(m)) drawMesh(m);
  }
  for (const m of R.objMeshes) {
    if (m.lair && m.lair.key !== CAP.lit) continue;
    if (!meshInView(m)) continue;
    m.emitMul = emitFor(m);
    if (m.light) m.tint = lampTint(m.light);
    drawMesh(m);
  }
  for (const m of R.decor) {
    if (m.litGrp) {
      const on = lightGroupOn(m.litGrp);
      m.emitMul = on ? 1 : 0.04;
      if (m.litGrp === 'shopSign') m.tint = on ? NO_TINT : NEON_OFF;
    }
    drawMesh(m);
  }
  for (const m of R.lairDecor || []) {
    if (m.lairKey !== CAP.lit) continue;
    if (m.litGrp) m.emitMul = 1;
    drawMesh(m);
  }
  for (const m of R.itemMeshes.values()) if (meshInView(m)) drawMesh(m);
  const night = carNight();
  for (const c of CARS) {
    const m = c.mesh;
    m.model = c.model;
    m.emitMul = night ? 1 : 0.1;
    m.center = [c.x, 1, c.z];
    drawMesh(m);
  }
  for (const c of CHARS) if (c.onMap && c.shown > 0.02 && !c.capHide && charInView(c)) drawChar(c);
  if (SHADE.on) drawChar(SHADE.c);
  try {
    combatDraw();
  } catch (e) {
    console.error(e);
  }
  try {
    hxDrawWorld();
  } catch (e) {
    console.error(e);
  }
  try {
    capDraw();
  } catch (e) {
    console.error(e);
  }
  try {
    cellDraw();
  } catch (e) {
    console.error(e);
  }
  try {
    huntDraw();
  } catch (e) {
    console.error(e);
  }

  // floor decals
  const D = R.decal;
  gl.useProgram(D.p);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.uniformMatrix4fv(D.U.uVP, false, cam.VP);
  gl.uniform2f(D.U.uMap, W, H);
  gl.uniform1f(D.U.uTime, R.time);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, R.tVis);
  gl.uniform1i(D.U.uVis, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, R.tLight);
  gl.uniform1i(D.U.uLight, 0);
  gl.uniform1f(D.U.uSeed, 0);
  gl.uniform1f(D.U.uWetD, G ? G.wet || 0 : 0);
  for (const c of CHARS)
    if (c.onMap && c.shown > 0.02 && !c.capHide) {
      drawDecal(drawX(c), drawZ(c), 0.44, [0, 0, 0, 0.55 * c.shown], 0, (c.y || 0) + 0.012);
      longShadow(c);
    }
  for (const c of CARS) {
    drawDecal(c.x, c.z, 1.25, [0, 0, 0, 0.5], 0, 0.01);
  }
  try {
    hxDrawDecals();
  } catch (e) {
    console.error(e);
  }
  try {
    capDecals();
  } catch (e) {
    console.error(e);
  }
  try {
    huntDecals();
  } catch (e) {
    console.error(e);
  }
  try {
    combatDecals();
  } catch (e) {
    console.error(e);
  }
  const P = PLAYER;
  if (P && P.onMap && G.started) {
    if (P.path && P.moving) {
      let px = P.x,
        pz = P.z,
        carry = 0.35;
      for (let k = P.pi; k < P.path.length; k++) {
        const qx = P.path[k][0] + 0.5,
          qz = P.path[k][1] + 0.5,
          d = Math.hypot(qx - px, qz - pz);
        let s = carry;
        while (s < d) {
          const f = s / d;
          drawDecal(px + (qx - px) * f, pz + (qz - pz) * f, 0.08, [0.98, 0.88, 0.62, 0.55], 0, 0.015);
          s += 0.45;
        }
        carry = s - d;
        px = qx;
        pz = qz;
      }
    }
    const hidden = lumAt(P.x, P.z) < 0.12;
    const mc = moodColor();
    drawDecal(
      P.x,
      P.z,
      0.56,
      hidden ? [0.5, 0.6, 0.9, 0.55] : [mc[0], mc[1], mc[2], 0.9],
      hidden ? 3 : 1,
      (P.y || 0) + 0.02,
    );
  }
  if (UI.walkMark)
    drawDecal(
      UI.walkMark.x,
      UI.walkMark.z,
      0.35 * (1 + UI.walkMark.t),
      [0.98, 0.88, 0.62, 0.65 * (1 - UI.walkMark.t)],
      1,
    );
  if (R.hoverChar && R.hoverChar !== P) drawDecal(R.hoverChar.x, R.hoverChar.z, 0.52, [1, 0.84, 0.52, 0.75], 1, 0.02);
  if (R.focusChar && R.focusChar !== R.hoverChar && R.focusChar.onMap)
    drawDecal(R.focusChar.x, R.focusChar.z, 0.52, [1, 0.84, 0.52, 0.75], 1, 0.02);
  else if (UI.focus && UI.focus.item) drawDecal(UI.focus.item.x, UI.focus.item.z, 0.5, [1, 0.84, 0.52, 0.7], 1, 0.02);

  // additive atmosphere: light shafts, dust, rain, halos
  gl.blendFunc(gl.ONE, gl.ONE);
  const CN = R.cone;
  gl.useProgram(CN.p);
  gl.uniformMatrix4fv(CN.U.uVP, false, cam.VP);
  gl.uniform2f(CN.U.uMap, W, H);
  gl.uniform1f(CN.U.uTime, R.time);
  gl.uniform3fv(CN.U.uCamDir, [-cam.fwd[0], -cam.fwd[1], -cam.fwd[2]]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, R.tVis);
  gl.uniform1i(CN.U.uVis, 1);
  const rainK = G ? G.rainK || 0 : 0;
  for (const c of R.cones) {
    if (!lightGroupOn(c.grp)) continue;
    if (visAt(c.p[0], c.p[2]) < 0.05) continue;
    gl.uniformMatrix4fv(CN.U.uModel, false, M4.mul(M4.trans(c.p[0], c.p[1], c.p[2]), M4.scale(c.r, c.h, c.r)));
    gl.uniform3fv(CN.U.uColor, glowCol(c, c.col));
    gl.uniform1f(CN.U.uAlpha, c.a * (c.light ? c.light.cur : 1) * glowK(c) * (1 + rainK * 1.2) * hxLamp(c.o));
    gl.bindVertexArray(PRIM.cone.vao);
    gl.drawElements(gl.TRIANGLES, PRIM.cone.count, gl.UNSIGNED_INT, 0);
  }
  const DU = R.dust;
  gl.useProgram(DU.p);
  gl.uniformMatrix4fv(DU.U.uVP, false, cam.VP);
  gl.uniform2f(DU.U.uMap, W, H);
  gl.uniform1f(DU.U.uTime, R.time);
  gl.uniform1f(DU.U.uSize, Math.max(1.5, 2.6 * (R.canvas.height / 900) * (8.5 / cam.zoom)));
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, R.tLight);
  gl.uniform1i(DU.U.uLight, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, R.tVis);
  gl.uniform1i(DU.U.uVis, 1);
  gl.bindVertexArray(R.dustVao);
  gl.drawArrays(gl.POINTS, 0, R.dustN);
  if (rainK > 0.02) {
    const RA = R.rain;
    gl.useProgram(RA.p);
    gl.uniformMatrix4fv(RA.U.uVP, false, cam.VP);
    gl.uniform2f(RA.U.uMap, W, H);
    gl.uniform1f(RA.U.uTime, R.time);
    gl.uniform2f(RA.U.uCenter, cam.tx, cam.tz);
    gl.uniform1f(RA.U.uRange, Math.max(26, cam.zoom * 3.4));
    gl.uniform1f(RA.U.uAmt, rainK);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, R.tLight);
    gl.uniform1i(RA.U.uLight, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, R.tVis);
    gl.uniform1i(RA.U.uVis, 1);
    gl.bindVertexArray(R.rainVao);
    gl.drawArrays(gl.LINES, 0, Math.floor(R.rainN * rainK) * 2);
  }
  const GL = R.glow;
  gl.useProgram(GL.p);
  gl.disable(gl.DEPTH_TEST);
  gl.uniformMatrix4fv(GL.U.uVP, false, cam.VP);
  gl.uniform3fv(GL.U.uRight, cam.right);
  gl.uniform3fv(GL.U.uUp, cam.up);
  for (const gw of R.glows) {
    if (!lightGroupOn(gw.grp)) continue;
    const v = visAt(gw.p[0], gw.p[2]);
    if (v < 0.05) continue;
    gl.uniform3fv(GL.U.uCenter, gw.p);
    gl.uniform1f(GL.U.uSize, gw.size * (1 + rainK * 0.5));
    gl.uniform3fv(GL.U.uColor, glowCol(gw, gw.col));
    gl.uniform1f(GL.U.uAlpha, 0.38 * v * (gw.light ? gw.light.cur : 1) * glowK(gw) * (1 + rainK * 0.6) * hxLamp(gw.o));
    gl.bindVertexArray(PRIM.quad.vao);
    gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
  }
  for (const b of BOLTS) {
    // a hot core and a short tail, so you can read which way it's going
    for (let k = 0; k < 5; k++) {
      const back = k * 0.22,
        x = b.x - b.dx * back,
        z = b.z - b.dz * back;
      if (b.d - back < 0) break;
      gl.uniform3fv(GL.U.uCenter, [x, 1.2, z]);
      gl.uniform1f(GL.U.uSize, (k ? 0.5 : 0.75) * (1 - k * 0.15));
      gl.uniform3fv(GL.U.uColor, k ? [1, 0.18, 0.1] : [1, 0.75, 0.6]);
      gl.uniform1f(GL.U.uAlpha, (k ? 0.7 : 1) * (1 - k * 0.17));
      gl.bindVertexArray(PRIM.quad.vao);
      gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
    }
  }
  try {
    hxDrawAdditive();
  } catch (e) {
    console.error(e);
  }
  try {
    capDrawAdd();
  } catch (e) {
    console.error(e);
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  // resolve, outlines, bloom, composite
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, R.msFb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, R.scene.fb);
  gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  drawMask();
  bloomPasses();
  composite();
  gl.bindVertexArray(null);
}
function drawMask() {
  const t = R.mask;
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
  gl.viewport(0, 0, t.w, t.h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  useMain(3);
  const gm =
    R.goalObj && R.goalObj.mesh && explored[I(Math.floor(R.goalObj.cx), Math.floor(R.goalObj.cz))]
      ? R.goalObj.mesh
      : null;
  if (gm) {
    gl.uniform3f(U.uMaskCol, 0, 1, 0);
    drawMesh(gm);
  }
  if (R.goalChar && R.goalChar.onMap) {
    gl.uniform3f(U.uMaskCol, 0, 1, 0);
    drawChar(R.goalChar);
  }
  if (R.hoverMesh) {
    gl.uniform3f(U.uMaskCol, 1, 0, 0);
    drawMesh(R.hoverMesh);
  }
  if (R.hoverChar && R.hoverChar.onMap) {
    gl.uniform3f(U.uMaskCol, 1, 0, 0);
    drawChar(R.hoverChar);
  }
  if (R.focusMesh && R.focusMesh !== R.hoverMesh) {
    gl.uniform3f(U.uMaskCol, 1, 0, 0);
    drawMesh(R.focusMesh);
  }
  if (R.focusChar && R.focusChar.onMap && R.focusChar !== R.hoverChar) {
    gl.uniform3f(U.uMaskCol, 1, 0, 0);
    drawChar(R.focusChar);
  }
  gl.uniform1i(U.uMode, 0);
  gl.enable(gl.DEPTH_TEST);
}
function pass(prog, target, fn) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
  gl.viewport(0, 0, target ? target.w : R.canvas.width, target ? target.h : R.canvas.height);
  gl.useProgram(prog.p);
  gl.bindVertexArray(R.emptyVao);
  fn(prog.U);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function bindTex(unit, t, loc) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.uniform1i(loc, unit);
}
function bloomPasses() {
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  const B = R.blm;
  pass(R.bright, B[0], (u) => {
    bindTex(0, R.scene.tex, u.uSrc);
    gl.uniform2f(u.uTexel, 1 / R.scene.w, 1 / R.scene.h);
    gl.uniform1f(u.uTh, R.hdr ? 0.8 : 0.66);
    gl.uniform1f(u.uKnee, 0.3);
  });
  for (let k = 1; k < B.length; k++)
    pass(R.down, B[k], (u) => {
      bindTex(0, B[k - 1].tex, u.uSrc);
      gl.uniform2f(u.uTexel, 1 / B[k - 1].w, 1 / B[k - 1].h);
    });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  for (let k = B.length - 2; k >= 0; k--)
    pass(R.up, B[k], (u) => {
      bindTex(0, B[k + 1].tex, u.uSrc);
      gl.uniform2f(u.uTexel, 1 / B[k + 1].w, 1 / B[k + 1].h);
    });
  gl.disable(gl.BLEND);
}
function composite() {
  const stress = G && G.started && PLAYER ? PLAYER.needs.stress : 20;
  const bad = clamp((stress - 58) / 42, 0, 1);
  const sleep = G && G.sleeping ? 1 : 0;
  R.sleepK = (R.sleepK || 0) + (sleep - (R.sleepK || 0)) * 0.08;
  pass(R.comp, null, (u) => {
    bindTex(0, R.scene.tex, u.uScene);
    bindTex(1, R.blm[0].tex, u.uBloom);
    bindTex(2, R.mask.tex, u.uMask);
    gl.uniform2f(u.uRes, R.canvas.width, R.canvas.height);
    gl.uniform1f(u.uTime, R.time);
    gl.uniform1f(u.uBloomK, R.hdr ? 0.3 : 0.38);
    gl.uniform1f(u.uBad, bad);
    gl.uniform1f(u.uFlash, R.flash);
    gl.uniform1f(u.uPulse, R.pulse);
    gl.uniform1f(u.uSleep, R.sleepK * 0.75);
    gl.uniform1f(u.uSat, 0.8);
    gl.uniform1f(u.uStK, STY.k);
    gl.uniform1f(u.uSBeat, STY.beat);
    if (u.uFade) gl.uniform1f(u.uFade, Math.max(CAP.fx.fade, CELL.fade));
    if (u.uDaze) gl.uniform1f(u.uDaze, CAP.fx.daze);
    if (u.uLid) gl.uniform1f(u.uLid, CAP.fx.lid);
    if (u.uWash) gl.uniform3fv(u.uWash, CAP.wash);
    if (u.uWashK) gl.uniform1f(u.uWashK, CAP.fx.washK);
    gl.uniform1f(u.uNight, HX.night);
    gl.uniform1f(u.uDread, HX.dread);
    gl.uniform1f(u.uDanger, HX.danger);
    gl.uniform1f(u.uSel, HX.sel);
    gl.uniform1f(u.uLetter, HX.letter);
    gl.uniform1f(u.uJolt, HX.jolt);
    gl.uniform1f(u.uBlood, HX.blood);
    gl.uniform1f(u.uBeat, HX.beat);
    gl.uniform1i(
      u.uHasMask,
      R.goalObj || R.goalChar || R.hoverMesh || R.hoverChar || R.focusMesh || R.focusChar ? 1 : 0,
    );
  });
}
