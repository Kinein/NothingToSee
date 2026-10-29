//@ game/loop — Per-frame simulation, main loop, boot
//@ Defines: hurrying, simStep, worldStep, styleStep, frame, showTitle, startPlaying, boot
//@ Uses:    sim/core, ui/interface, world/light-map, gfx/renderer, game/state, taken/taken, core/util, horror/layer, world/grid, world/vision, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── per-frame simulation
let lightT = 0,
  lastPlayerCell = -1,
  carLoud = 0;
// no speed buttons: the clock runs at one pace, sleep runs it fast, and a long quiet stretch (the desk, the TV, waiting)
// hurries it along by itself until something happens
function hurrying() {
  const a = PLAYER.queue[0];
  return !!(
    a &&
    a.long &&
    a.stage === 'run' &&
    !a.sleep &&
    !hunted() &&
    !HUNT.on &&
    !G.enc &&
    HX.danger < 0.15 &&
    !moveInput()
  );
}
function simStep(dtReal, spdOver) {
  const spd =
    spdOver != null ? spdOver : G.speed === 0 ? 0 : G.sleeping || G.away ? awaySpeed() : SPEEDS[hurrying() ? 2 : 1];
  if (spd > 0) SIM_SPD = spd;
  const dtg = dtReal * spd;
  if (dtg > 0) {
    const steps = Math.max(1, Math.ceil(dtg / 0.5)),
      sub = dtg / steps;
    for (let k = 0; k < steps; k++) {
      const t0 = G.t;
      G.t += sub;
      onTimeCross(t0, G.t);
      if (Math.floor(t0 / 60) !== Math.floor(G.t / 60)) {
        hourlyEvents(Math.floor(tod() / 60));
        if (Math.floor(tod() / 60) === 6) G.watcher = null;
      }
      if (G.over) return;
      if (G.away && G.t >= G.away.until) comeBack();
      if (PLAYER.onMap) {
        stepChar(PLAYER, sub);
        driveTick(sub);
      }
      if (ARREST.on) arrestTick(sub);
      for (const n of CHARS) if (!n.isPlayer) npcUpdate(n, sub);
      try {
        looseTick(sub);
      } catch (e) {
        console.error(e);
      }
      if (G.over) return;
      for (const n of CHARS) if (n.trace) traceStep(n, sub);
      if (G.enc)
        try {
          encStep(sub);
        } catch (e) {
          console.error(e);
          G.enc = null;
        }
      needsTick(sub);
      workTick(sub);
      weatherTick(sub);
      perceptionTick(sub);
      trapTick();
      boltTick(sub);
      combatTick(sub);
      if (Math.floor(t0) !== Math.floor(G.t)) {
        destroyTick();
        policeTick();
        if (!G.loose) {
          ambushTick();
          streetTick();
          horrorTick();
          nightTick();
          sleepTakeCheck();
        }
        noticeTick();
        stashTick();
        try {
          talkTick();
        } catch (e) {
          console.error(e);
        }
        try {
          hxTick();
        } catch (e) {
          console.error(e);
        }
      }
      G.awkCd -= sub;
      if (G.phoneRing && G.t > G.phoneRing.until) G.phoneRing = null;
    }
  }
  for (const c of CHARS)
    if (c.onMap) {
      if (spd > 0) animate(c, dtReal, dtg);
      updateShown(c, dtReal);
    }
  for (const d of DOORS) {
    let want = 0;
    for (const c of HUNT.actors.length ? CHARS.concat(HUNT.actors) : CHARS) {
      if (!c.onMap) continue;
      const ax = Math.abs(c.x - d.x - 0.5),
        az = Math.abs(c.z - d.z - 0.5),
        far = c.run ? 1.45 : 1.05; // a runner hits it sooner
      if (d.horiz ? ax < 0.6 && az < far : az < 0.6 && ax < far) {
        if (
          d.locked &&
          c.id !== d.key &&
          !c.breakIn &&
          !c.trueForm &&
          !insideOf(c, d.key) &&
          !(c.isPlayer && G.broken[d.key] > G.t)
        )
          continue;
        if (d.shop && !shopOpen() && c.id !== 'vic' && !((roomAt(c.x, c.z) || {}).bld === 'shop')) continue;
        want = 1;
        break;
      }
    }
    d.want = want;
  }
  for (const d of DOORS) {
    const want = d.want || (d.pairL && d.pairL.want) || (d.pairR && d.pairR.want);
    // it swings open at the pace of a hand pushing it (about a third of a second at normal speed), and falls to faster
    d.open = clamp(
      d.open + (want ? Math.max(dtReal * 3.4, dtg * 1.7) : -Math.max(dtReal * 5, dtg * 3)),
      d.ajar || d.slack > G.t ? AJAR.open : 0,
      1,
    );
  }
  for (const c of CHARS)
    if (c.onMap) {
      doorPass(c);
      roomWatch(c);
    }
  for (const n of suspects())
    if (n.onMap && !n.trueForm && n.shown > 0.5 && visAt(n.x, n.z) > 0.5 && !(n.tell && n.tell.type === 'true'))
      n.seenAt = G.t;
  for (const n of CHARS)
    if (!n.isPlayer && n.onMap && n.shown > 0.5) {
      const r = roomAt(n.x, n.z);
      if (r) n.seenRoom[r.key] = G.t;
    }
  const pr = roomAt(PLAYER.x, PLAYER.z);
  G.homeLights = !!(pr && pr.home) && !G.sleeping;
  encDyn();
  officeDyn();
  for (const b of BOLTS) DYN.push({ x: b.x, z: b.z, col: [1, 0.15, 0.08], int: 1.1, r: 3.2 });
  for (const n of CHARS)
    if (n.surrendered && n.onMap && G.t > n.surrendered.takeAt - 10)
      DYN.push({
        x: n.x + 1.4,
        z: n.z + 0.6,
        col: Math.sin(R.time * 10) > 0 ? [1, 0.12, 0.1] : [0.15, 0.32, 1],
        int: 1.4,
        r: 7,
      });
  if (
    G.faction === 'aliens' &&
    ((G.stage >= 3 && (hourF() >= 23 || hourF() < 4) && Math.sin(G.t * 0.05) > 0.6) || G.landing)
  )
    DYN.push({
      x: 37,
      z: 26,
      col: [0.6, 1, 0.82],
      int: G.landing ? 2.2 : 0.8 + 0.3 * Math.sin(R.time * 3),
      r: G.landing ? 22 : 9,
    });
  const ag = NPC.agnes,
    ar = ag.onMap && roomAt(ag.x, ag.z);
  G.agnesLights = !!(ar && ar.agnes) && !(ag.queue[0] && ag.queue[0].anim === 'sleep') && !(G.agnesDark > G.t);
  G.houseLit = G.houseLit || {};
  const dusk = hourF() >= 16.5 || hourF() < 7.5;
  for (const h of HOUSE_DEFS) {
    const n = NPC[h.id],
      r = n && n.onMap && roomAt(n.x, n.z);
    G.houseLit[h.id] = !!(r && r.house === h.id && !asleep(n) && dusk && !((G.houseDark || {})[h.id] > G.t));
  }
  personal.beam = !!G.inv.flashOn;
  personal.dx = Math.sin(PLAYER.dir);
  personal.dz = Math.cos(PLAYER.dir);
  personal.r = G.inv.flashOn ? 2.4 : 3.2;
  personal.int = G.inv.flashOn ? 0.3 : 0.24;
  hallucinate(dtReal);
  audio.ringTick(dtReal, !!G.phoneRing && pr && pr.home);
  audio.update({
    hum: pr && (pr.bld === 'office' ? officeLit() : pr.bld === 'shop' ? shopOpen() : false),
    outside: !pr,
    night: hourF() > 20 || hourF() < 6,
    stress: PLAYER.needs.stress,
    rain: G.rainK,
    car: carLoud,
    dread: HX.dread,
  });
  if (cam.follow) {
    const k = Math.min(1, dtReal * (3 + (G.sleeping ? 0 : G.speed) * 2.5));
    cam.tx += (PLAYER.x - cam.tx) * k;
    cam.tz += (PLAYER.z - cam.tz) * k;
  }
}
function worldStep(dtReal, preview) {
  SKY = skyAt(hourF());
  const sl = SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11;
  FOG_COL = mix3([0.011, 0.013, 0.026], [0.038, 0.042, 0.054], clamp(sl / 0.6, 0, 1));
  lightT -= dtReal;
  const eye = CAP.on && CAP.eye ? CAP.eye : CELL.on ? CELL.eye : null,
    ex = eye ? eye[0] : PLAYER.x,
    ez = eye ? eye[1] : PLAYER.z; // a scene sees from where its camera is
  const cell = I(Math.floor(ex), Math.floor(ez));
  if (lightT <= 0 || cell !== lastPlayerCell || DYN.length) {
    lightT = 0.08;
    lastPlayerCell = cell;
    computeLight(PLAYER.onMap ? Math.floor(PLAYER.x) : null, Math.floor(PLAYER.z));
    if (!preview) computeVision(Math.floor(ex), Math.floor(ez));
    MAPS.dirty = true;
  }
  if (!preview && smoothVision(dtReal)) MAPS.dirty = true;
  expandMaps();
}

// how far the town's lights have turned: stress first; a bad hour or a blood night pushes it too.
// From breaking (80) your pulse is in the red lamps, and past 88 you can hear it.
function styleStep(dtReal) {
  const live = G && G.started && PLAYER;
  const st = live ? PLAYER.needs.stress : 0;
  const tgt = live ? Math.max(sstep(100 - PSY.shaky, 98, st), HX.dread * 0.55, HX.blood * 0.85) : 0.3;
  STY.k += (tgt - STY.k) * Math.min(1, dtReal * 0.5);
  if (live && st >= 80 && G.speed && !G.sleeping && !G.away && !G.over) {
    STY.beatT -= dtReal;
    if (STY.beatT <= 0) {
      STY.beatT = lerp(1.05, 0.55, clamp((st - 80) / 20, 0, 1));
      STY.beat = 1;
      if (st >= 88 && HX.danger < 0.28) audio.hx('heart', 0, 0.16 + (st - 88) * 0.012);
    }
  }
  STY.beat = Math.max(0, STY.beat - dtReal * 2.6);
}
let lastT = performance.now();
function frame(now) {
  qualityTick(now - lastT);
  const dtReal = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  R.time += dtReal;
  R.flash = Math.max(0, R.flash - dtReal * 2.2);
  R.pulse = Math.max(0, R.pulse - dtReal * 0.9);
  try {
    const preview = !G.started;
    if (preview) {
      SIM_SPD = 1.2;
      G.t += dtReal * 1.2;
      for (const n of CHARS) if (!n.isPlayer) npcUpdate(n, dtReal * 1.2);
      for (const c of CHARS)
        if (c.onMap) {
          animate(c, dtReal, dtReal);
          updateShown(c, dtReal);
        }
      for (const d of DOORS)
        d.open = clamp(
          d.open +
            (CHARS.some((c) => c.onMap && Math.abs(c.x - d.x - 0.5) < 1 && Math.abs(c.z - d.z - 0.5) < 1) ? 1 : -1) *
              dtReal *
              4,
          d.ajar ? 0.55 : 0,
          1,
        );
      cam.yaw += dtReal * 0.03;
      cam.yawT = cam.yaw;
      cam.tx = 22 + Math.sin(R.time * 0.05) * 6;
      cam.tz = 15;
      updateCars(dtReal, true);
    } else if (CAP.on) {
      if (G.over) capFinish();
      else if (!UI.caseOpen) capUpdate(dtReal);
    } else if (!G.over && !UI.caseOpen && !UI.scene) {
      carLoud = updateCars(dtReal * (G.speed ? 1 : 0), G.speed > 0);
      simStep(dtReal);
    }
    if (UI.cf) cfTick(dtReal);
    cfLight(dtReal);
    styleStep(dtReal);
    worldStep(dtReal, preview);
    try {
      hxUpdate(dtReal);
    } catch (e) {
      console.error(e);
    }
    try {
      if (CAP.on) {
        capLate(dtReal);
        huntUI();
      } else if (!preview) {
        groundTick(dtReal);
        huntFrame(dtReal);
        quirkFx();
      }
    } catch (e) {
      console.error(e);
    }
    try {
      cellFrame(dtReal); // the cells, while you're held: after the horror layer has cleared its lights for the frame
    } catch (e) {
      console.error(e);
    }
    if (!preview)
      try {
        looseFrame(dtReal);
      } catch (e) {
        console.error(e);
      }
    updateCamera(dtReal);
    renderFrame();
    if (!preview) {
      if (!CAP.on) updateFocus(dtReal);
      updateFx(dtReal);
      if (!CAP.on) updateHud(dtReal);
      photoHintTick(dtReal);
    }
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

function showTitle() {
  $('#title').hidden = false;
  $('#hud').hidden = true;
  const s = readSave();
  $('#continue').hidden = !s || s.v !== 10;
  if (s && s.v === 10)
    $('#continue-sub').textContent = s.player.name + ' · ' + DOW_LONG[dow(dayNo(s.G.t))] + ' · ' + fmtTime(s.G.t);
}
function startPlaying() {
  $('#title').hidden = true;
  $('#hud').hidden = false;
  $('#over').hidden = true;
  lastPlayerCell = -1;
  lightT = 0;
  UI.lastNeeds = null;
  UI.trend = {};
  UI.hinted = false;
  UI.eyeS = null;
  $('#week').dataset.k = '';
  if (UI.bars)
    for (const k in UI.bars) {
      const B = UI.bars[k];
      B.v = B.w = B.tip = null;
    }
  const h = $('#hints');
  h.classList.remove('out');
  setTimeout(dismissHints, 12000);
  audio.init();
}
function boot() {
  initRender($('#view'));
  tankTube(); // the lair tanks' shader: compile it now, not mid-scene (a first compile can stall for a while)
  if (isTouch()) document.querySelectorAll('.tapword').forEach((e) => (e.textContent = 'Tap'));
  buildHud();
  initInput();
  newGame('Sam', true);
  showTitle();
  $('#begin').onclick = () => {
    const name = ($('#pname-in').value || '').trim().slice(0, 18) || 'Sam';
    newGame(name, false);
    startPlaying();
    setTimeout(() => ui.dayCard(), 250);
  };
  $('#continue').onclick = () => {
    if (loadGame(readSave())) {
      startPlaying();
      setTimeout(() => ui.dayCard(), 250);
    }
  };
  $('#over-load').onclick = () => {
    if (loadGame(readSave())) startPlaying();
  };
  $('#over-new').onclick = () => {
    $('#over').hidden = true;
    newGame('Sam', true);
    showTitle();
  };
  $('#bd-close').onclick = closeBoard;
  $('#board').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'board') closeBoard();
  });
  $('#help-close').onclick = toggleHelp;
  $('#help').addEventListener('pointerdown', (e) => {
    if (e.target.id === 'help') toggleHelp();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
  });
  window.addEventListener('pagehide', saveGame);
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    try {
      window.claude.hot.snapshot(() => {
        saveGame();
        return {};
      });
    } catch (e) {
      /* not in a viewer */
    }
  }
  requestAnimationFrame(frame);
}
window.addEventListener('DOMContentLoaded', () => {
  try {
    boot();
  } catch (err) {
    console.error(err);
    const f = document.getElementById('fatal');
    if (f) {
      f.hidden = false;
      f.querySelector('p').textContent = 'This game needs WebGL2. (' + err.message + ')';
    }
  }
});
