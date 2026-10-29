//@ them/plan — THEIR five-day plan: phases, stages, how it moves on each midnight
//@ Defines: WEEK, PHASES, STAGE_OF_PHASE, mayShed, heardIt, STAGES, STAGE_HOOKS, holdings, EMBLEM_AT, emblemMesh, marks, opDone, advanceWeek, finale, nextGatherT, gatherNow, …
//@ Uses:    sim/core, core/util, ui/interface, gfx/renderer, game/state, them/awareness, audio/sound, sim/actions, town/cast, world/grid, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR plan: five days, Monday to Friday. Every midnight it moves on a day, and nothing you do slows it down.
// The only way to stop it is to catch every one of THEM before Friday night runs out.
const WEEK = 5;
const PHASES = {
  lizards: ['Lodge', 'Payroll', 'Holdings', 'Mark', 'Below'],
  aliens: ['Survey', 'Taking', 'Experiments', 'Beacon', 'Landing'],
  zombies: ['Rot', 'Bite', 'Spread', 'Horde', 'Feast'],
};
const STAGE_OF_PHASE = [1, 2, 3, 4, 5]; // the older five-step escalation (attacks, marks) rides on the days
const phaseNow = () => clamp(dayNo() - (G.weekStart || 1) + 1, 1, WEEK + 1);
const phaseName = (ph = G.phase || 1) => PHASES[G.faction][clamp(ph, 1, WEEK) - 1];
// THEIR calendar as the town lives it: a night belongs to the day before it. Day 1 and its night: nothing at all.
// Days 2–3: only behind doors (somebody's home, the office's back rooms). The street from day 4 on, or when THEY come for you.
const theirDay = () => clamp(dayNo(G.t - 6 * 60) - (G.weekStart || 1) + 1, 0, WEEK + 1);
const theyStir = () => theirDay() >= 2;
const theyOut = () => theirDay() >= 4;
const darkNow = () => {
  const h = hourF();
  return h >= 20 || h < 6;
};
const forYou = (n, why) =>
  why === 'ambush' || why === 'hunt' || why === 'loose' || !!(n && n.raiding && n.raiding.target === 'player');
// when THEY may drop the skin. Called out with enough proof: any time. Otherwise only in the dark, or once THEIR week
// is at day 3 or later; never on day 1 or its night; and before day 4, out in the street only to come for you.
function mayShed(n, why) {
  if (G.over || G.landing || G.endAt || n.exposed || G.loose) return true;
  const called = why === 'confront' || why === 'surrender' || why === 'hit';
  if (called && n.cfOk && G.t - n.cfOk < 90) return true;
  if (!theyStir()) return false;
  if (!darkNow() && (G.phase || 1) < 3) return false;
  if (!theyOut() && !called && why !== 'trap' && !forYou(n, why) && !roomAt(n.x, n.z)) return false; // your trap catches it wherever it is
  return true;
}
// a slip is always heard from close by, through a wall: one of THEM changing for a moment, or anyone at their secret
const slipHeard = (x, z) =>
  !!(G.started && PLAYER.onMap && !G.sleeping && !G.away && Math.hypot(PLAYER.x - x, PLAYER.z - z) <= TIP.slip.r);
function heardIt(kind, x, z) {
  const T = TIP[kind],
    P = PLAYER;
  if (!T || !G.started || !P.onMap || G.sleeping || G.away) return false;
  const d = Math.hypot(P.x - x, P.z - z);
  if (d > T.r) return false;
  const left = G.tipLeft || (G.tipLeft = {});
  if (left[kind] == null) left[kind] = irand(T.first[0], T.first[1]);
  if (left[kind] > 0) {
    left[kind]--;
    return false;
  }
  if (!chance(T.p * (1.15 - d / T.r))) return false;
  left[kind] = irand(T.gap[0], T.gap[1]);
  return true;
}
const STAGES = {
  lizards: ['Lodge', 'Skim', 'Holdings', 'Mark', 'Open'],
  aliens: ['Survey', 'Taking', 'Experiments', 'Harvest', 'Landing'],
  zombies: ['Rot', 'Hunger', 'Spread', 'Horde', 'Feast'],
};
const STAGE_HOOKS = []; // the faction layers hook in here
STAGE_HOOKS.push((s) => {
  if (G.faction !== 'aliens') return;
  if (s === 3) {
    G.hotRooms = shuffle(['open', 'hall', 'shop', 'break', 'living']).slice(0, 2);
    setTimeout(() => ui.note('alien', 'Lights over the park at night', 'onto'), 4000);
  }
  if (s === 4)
    for (let k = 0; k < 2; k++) {
      const m = pick(alive());
      if (m)
        addItem({
          kind: 'device',
          x: pick([20.5, 30.5, 40.5, 52.5]),
          z: pick([13.5, 18.5]),
          rot: rand(0, TAU),
          by: m.id,
          room: null,
          at: G.t,
        });
    }
});
STAGE_HOOKS.push((s) => {
  if (G.faction !== 'lizards') return;
  if (s === 2) {
    // police on the payroll; Pell's shelves thin out; someone who opposed them disappears
    G.policeBought = true;
    const foe = suspects()
      .filter((n) => !n.isThem && !n.gone && !n.exposed && n.id !== 'lenny')
      .sort((a, b) => a.sus - b.sus)[0]; // whoever trusts you most
    if (foe && G.victims.length < 2) G.attackFoe = foe.id;
    setTimeout(() => ui.note('cart', 'Half of Pell’s shelves are empty', 'onto'), 4000);
  }
  if (s === 3) {
    holdings();
    setTimeout(() => ui.note('cart', 'Pell’s has new owners', 'onto'), 4000);
  }
  if (s === 4) marks();
  if (s === 5) setTimeout(() => ui.note('lizard', 'THEY don’t hide any more', 'bad'), 4000);
});
function holdings() {
  const sign = R.glows && R.glows.find((g) => g.grp === 'shopSign');
  if (sign) sign.col = [0.35, 1, 0.45];
  const l = LIGHTS.find((x) => x.grp === 'shopSign');
  if (l) l.col = [0.35, 1, 0.45];
  const r = roomByKey('shop');
  if (r) r.name = 'Pell’s · a Wexley Holdings store';
}
const EMBLEM_AT = {
  office: [13.5, 2.25],
  shop: [34.5, 1.7],
  vic: [47.5, 2.25],
  hale: [51.5, 2.25],
  denise: [55.5, 2.25],
  martin: [59.5, 2.25],
};
function emblemMesh(x, y0) {
  const g = new Geo(),
    plate = C(0x2c5a3a),
    gold = C(0xb8f0a0),
    z = 12.67 + 0.012,
    s = 0.42;
  g.bx(0, y0, 0, s, s, 0.02, plate);
  const L = (cx, y, w, h) => g.bx(cx, y0 + y * s, 0.014, w * s, h * s, 0.01, gold, EMIT(0.55));
  L(0, 0.16, 0.07, 0.62);
  L(0, 0.74, 0.8, 0.06); // post, beam
  for (const k of [-1, 1]) {
    L(k * 0.34, 0.38, 0.03, 0.38);
    L(k * 0.34, 0.32, 0.3, 0.06);
  } // strings, pans
  L(0, 0.12, 0.38, 0.06); // foot
  const m = makeMesh(g);
  m.model = M4.trans(x, 0, z);
  m.center = [x, 1, z];
  m.cut = 1;
  return m;
}
function marks() {
  if (!R.ready) return;
  for (const k of Array.from(R.itemMeshes.keys())) if (String(k).startsWith('em')) R.itemMeshes.delete(k);
  if (G.faction !== 'lizards' || G.stage < 4) return;
  for (const [k, [x, y0]] of Object.entries(EMBLEM_AT))
    if (k === 'office' || k === 'shop' || (G.bought && G.bought[k])) R.itemMeshes.set('em' + k, emblemMesh(x, y0));
}
const stageName = (s = G.stage) => STAGES[G.faction][s - 1];
// what THEY get done no longer moves the plan: the week does. Interrupting THEM still costs THEM a night, a bribe, a victim.
function opDone() {}
// at midnight: a day of THEIR week gone. Past Friday, it's over.
function advanceWeek() {
  if (G.over || !G.started || !alive().length) return;
  const ph = phaseNow();
  if (ph > WEEK) {
    G.phase = WEEK + 1;
    return finale();
  }
  if (ph === G.phase) return;
  G.phase = ph;
  UI.planBump = 1.6;
  const want = STAGE_OF_PHASE[ph - 1];
  while (G.stage < want) {
    G.stage++;
    for (const f of STAGE_HOOKS) f(G.stage);
  }
  G.stageNews = STAGE_NEWS[G.faction][G.stage - 1];
  setTimeout(() => {
    ui.note(
      G.factionKnown ? FACTIONS[G.faction].icon : 'moon',
      (ph === WEEK ? 'THEIR last day' : WEEK - ph + 1 + ' days left') + (G.factionKnown ? ' · ' + phaseName(ph) : ''),
      'bad',
    );
    audio.sting('whisper');
  }, 1500);
}
function finale() {
  const endK = G.faction === 'lizards' ? 'below' : 'plan',
    g0 = G;
  if (G.loose) return gameOver(endK); // midnight, and you're still in Wexley
  if (G.landing || G.faction === 'zombies') return gameOver(endK);
  if (G.faction === 'lizards') {
    G.landing = G.t;
    G.stagePts = 100;
    ui.note('lizard', 'THEY come for you', 'bad');
    audio.sting('caught');
    for (const c of CHARS) {
      if (c.isPlayer || !c.onMap || c.slain || c.def.stranger) continue;
      if (c.isThem) {
        trueForm(c, 'ambush');
        if (c.trueForm) {
          c.trueForm.long = 90;
          c.trueForm.raidYou = true;
          c.breakIn = true;
        }
        continue;
      }
      if (!bought(c)) continue;
      hardReset(c);
      c.breakIn = true;
      enqueue(c, chaseAct(PLAYER, { label: '…', giveUp: 60, reach: 1.3, onCatch: () => gameOver('below') }));
    }
    G.endAt = { k: 'below', t: G.t + 60 };
    setTimeout(() => {
      if (G === g0 && !G.over) gameOver('below');
    }, 45000);
    return;
  }
  // the Landing: a light over the park, everyone turns towards you, and that's it
  G.landing = G.t;
  G.stagePts = 100;
  ui.note('alien', 'Something over the park', 'bad');
  audio.sting('caught');
  for (const c of CHARS)
    if (!c.isPlayer && c.onMap && !c.slain) {
      hardReset(c);
      c.breakIn = true;
      enqueue(c, chaseAct(PLAYER, { label: '…', walk: true, giveUp: 60, reach: 1.3, onCatch: () => gameOver('plan') }));
    }
  G.endAt = { k: 'plan', t: G.t + 60 };
  setTimeout(() => {
    if (G === g0 && !G.over) gameOver('plan');
  }, 45000);
}
// gatherings: about weekly for lizards, rarer for aliens. Lenny knows the night.
const gatherGap = () => (G.faction === 'lizards' ? irand(1, 2) : G.faction === 'aliens' ? 2 : irand(1, 2)); // five days hold two or three nights of it
function nextGatherT() {
  if (G.gatherTip !== G.gatherDay) return null;
  const t = (G.gatherDay - 1) * 1440 + 90;
  return t + 90 > G.t ? t : null;
}
const gatherAware = () => G.gatherTip === G.gatherDay;
function gatherNow() {
  const m = tod();
  return (
    gatherAware() &&
    dayNo() === G.gatherDay &&
    m >= 45 &&
    m < 180 &&
    !G.ritualSeenDay[dayNo()] &&
    G.ritualBroke !== dayNo() &&
    alive().length > 0
  );
}
function gatheringOver() {
  if (!G.started || G.over) return;
  const d = dayNo();
  G.gatherDay = d + gatherGap();
  if (!alive().length) return;
  G.gatherKnown = true;
  if (G.ritualSeenDay[d] || G.ritualBroke === d) return; // you were there: whatever it was, it broke up
  opDone('gathering');
  echo('gathering', {
    x: RITUAL.x,
    z: RITUAL.z,
    seen: suspects()
      .filter((s) => !s.isThem && !s.exposed && chance(0.3))
      .map((s) => s.id),
    quiet: true,
  });
  audio.sting('whisper');
}
function stakeoutGoal() {
  const P = PLAYER;
  let tgt = null;
  if (gatherNow()) tgt = { at: RITUAL_STAKE, char: null, urgent: tod() >= 90 };
  if (!tgt) return null;
  if (P.queue.some((a) => a.stake) || Math.hypot(P.x - tgt.at[0] - 0.5, P.z - tgt.at[1] - 0.5) < 1.3)
    return { here: true };
  return { at: tgt.at, char: tgt.char, icon: 'eye', stake: true, urgent: tgt.urgent };
}
