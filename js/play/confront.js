//@ play/confront — Giving up, the FBI, the talk options
//@ Defines: GIVE_UP, surrender, fbiTake, SOC, observeAct
//@ Uses:    sim/core, ui/interface, town/echoes, town/cast, core/util, combat/bolts, sim/actions, town/cell, town/suspicion, chase/fbi, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what follows a confrontation (play/arena): giving up, the FBI, and the talk options that go with it
// it drops the act for good: true form, on its knees, and the FBI on the way
const GIVE_UP = CONFESS.them;
function surrender(n, why) {
  if (!n || n.slain || n.surrendered || G.over) return;
  {
    const op = FBI.ops.find((o) => o.n === n && o.phase === 'chase');
    if (op && n.trueForm) return fbiRecatch(op);
  } // run down again, with the car waiting
  if (!n.trueForm) {
    trueForm(n, 'surrender', 'surrender');
    if (!n.trueForm) return;
  }
  const tf = n.trueForm;
  tf.mode = 'surrender';
  tf.cornered = false;
  tf.aim = 0;
  if (UI.aim && UI.aim.c === n) UI.aim = null;
  foeCalm(n);
  for (let i = BOLTS.length - 1; i >= 0; i--) if (BOLTS[i].by === n) BOLTS.splice(i, 1);
  n.fleeing = null;
  n.trapped = false;
  n.path = null;
  n.moving = false;
  n.hideUntil = 0;
  n.engaged = null;
  if (n.tell && n.tell.t >= TF_CHANGE) hardReset(n);
  n.surrendered = { at: G.t, takeAt: G.t + EVIDENCE.fbiDelay + (n.tell && n.tell.t < TF_CHANGE ? TF_CHANGE : 0), why };
  if (!n.exposed) {
    n.exposed = true;
    G.exposed.push(n.id);
  }
  if (!G.factionKnown) revealFaction();
  for (const o of suspects()) if (!o.isThem) o.sus = Math.max(0, o.sus - 25); // they believe you now
  const said = pick(GIVE_UP[G.faction] || GIVE_UP.lizards),
    wait = n.tell && n.tell.t < TF_CHANGE ? 3600 : 400;
  setTimeout(() => {
    if (n.surrendered && n.onMap) {
      ui.say(n, said, 4);
      ui.bubble(n, 'flag', 'speech', 3);
    }
  }, wait);
  setTimeout(() => {
    if (n.surrendered && !G.over) ui.note('badge', n.short + ' gave up · the FBI is on its way', 'good');
  }, wait + 1800);
  addNote(
    n,
    'Dropped the act ' + (why === 'beaten' ? 'after a beating' : 'in front of everyone') + '. On its knees, waiting.',
    { by: 'you' },
  );
  echo('exposed', { x: n.x, z: n.z, who: n.id });
  audio.sting('onto');
}
// grey cars, quiet men in grey suits, and it's gone
function fbiTake(n) {
  if (n.slain) return;
  const spot = [n.x, n.z],
    seen = PLAYER.onMap && Math.hypot(PLAYER.x - n.x, PLAYER.z - n.z) < 16;
  hardReset(n);
  n.trueForm = null;
  n.tell = null;
  n.surrendered = null;
  n.trapped = false;
  n.fleeing = null;
  n.raiding = null;
  n.breakIn = false;
  if (UI.aim && UI.aim.c === n) UI.aim = null;
  n.slain = 'fbi';
  G.slain.push(n.id);
  n.onMap = false;
  if (!n.exposed) {
    n.exposed = true;
    G.exposed.push(n.id);
  }
  if (G.faction === 'lizards') unbuyBy(n.id);
  G.stashes = (G.stashes || []).filter((st) => st.by !== n.id);
  dropCardsOn(n);
  for (const o of them()) if (!o.slain) o.danger = Math.max(o.danger, dangerFloor(o));
  makePlan(n);
  bookRemoval();
  const rec = { type: 'true', how: 'witness', at: G.t, t: 3, pose: 'stand' };
  n.snaps.push(rec);
  if (n.snaps.length > 4) n.snaps.shift();
  addNote(n, 'Taken away by the FBI. It was ' + n.short + ' all along.', { by: 'you' });
  if (!seen) cardSoon({ char: n, stamp: 'TAKEN' }, () => snapImage(n, rec)); // watched it go: no card needed
  ui.note('badge', n.short + ' · FBI', 'good');
  if (seen) {
    R.flash = Math.max(R.flash, 0.4);
    audio.sting('siren');
  }
  echo('exposed', { x: spot[0], z: spot[1], who: n.id });
  if (!alive().length) {
    const g0 = G;
    G.endAt = { k: 'won', t: G.t + 8 };
    setTimeout(() => {
      if (G === g0) gameOver('won');
    }, 4500);
  }
}
// mid: what they say comes halfway through the talk, not at the end (talkAct)
const SOC = {
  chat: { label: 'Chat', icon: 'chat', dur: 10, mid: true, fx: {}, res: (n, w) => resolveChat(n, w) },
  gossip: { label: 'Gossip', icon: 'ear', dur: 9, mid: true, fx: {}, res: (n) => resolveGossip(n) },
  come: { label: 'Come with me', icon: 'walk', dur: 2, fx: {}, res: (n) => resolveCome(n) },
  lenny: {
    label: 'Theories',
    icon: 'ear',
    dur: 15,
    mid: true,
    fx: {},
    res: () => lennyHint(),
  },
  feed: {
    label: 'Give meal',
    icon: 'gift',
    dur: 4,
    fx: { stress: -8 },
    res: (n) => {
      G.inv.meal--;
      ui.bubble(n, 'heart', 'speech', 1.8);
      lennyHint();
    },
  },
  hello: {
    label: 'Hello',
    icon: 'wave',
    dur: 2,
    mid: true,
    fx: {},
    res: (n) => {
      const ev = G.events.filter((e) => G.t - e.t < 1440 && ECHO[e.k] && flav(ECHO[e.k].heard));
      if (!n.def.officer && ev.length && chance(0.12)) {
        const e = pick(ev),
          l = echoLine(e, false);
        if (l) {
          ui.say(n, l, 4.5);
          hear(e, l, 'stranger');
          return;
        }
      }
      ui.bubble(n, 'dots', 'speech', 2);
    },
  },
};
function observeAct(n) {
  return mkAct({
    kind: 'wait',
    label: 'Watch',
    icon: 'eye',
    dur: 8,
    anim: 'stare',
    check: () => (n.onMap && n.shown > 0.5 && Math.hypot(n.x - PLAYER.x, n.z - PLAYER.z) < 9 ? null : 'Can’t see them'),
    onTick: (c, a, dt) => {
      c.tdir = Math.atan2(n.x - c.x, n.z - c.z);
      if (!a.noticed && npcSeesPlayer(n, 7) && a.t > 2) {
        a.noticed = true;
        addSus(n, 6);
        ui.bubble(n, 'question', 'speech', 2);
      }
      if (a.noticed) addDanger(n, 5 * dt);
      if (!n.onMap || n.shown < 0.3) a.cancel = true;
    },
    onEnd: (c, a, ok) => {
      if (!ok) return; // as often as you like: once you've seen all there is, there's nothing new
      if (!n.isThem) watchedHuman(n);
      G.qwatch = G.qwatch || {};
      const qs = ((G.quirks && G.quirks[n.id]) || []).filter((q) => !G.qwatch[n.id + ':' + q]);
      if (!qs.length) {
        ui.float(n, 'Nothing new', '');
        return;
      }
      const q = pick(qs);
      G.qwatch[n.id + ':' + q] = G.t;
      addNote(n, QUIRKS[q].watch, { by: 'you' });
      ui.note('eye', n.short + ' · ' + QUIRKS[q].watch, '');
    },
  });
}
