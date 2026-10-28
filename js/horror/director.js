//@ horror/director — Horror director: daily events by THEIR phase
//@ Defines: SMELL, MOVED, planDay, sentAfter, openTick, lureTick, lureEnd
//@ Uses:    sim/core, core/util, sim/actions, them/plan, data/tuning, town/echoes, them/true-form, ui/interface, gfx/renderer, town/cast, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the horror director: a few events a day from four kinds, more as THEIR plan grows
// stray signs point the right way more often than not, never always: the town is strange in more than one way
const clueFaction = () =>
  chance(0.6) ? G.faction : pick(['aliens', 'lizards', 'zombies'].filter((f) => f !== G.faction));
const SMELL = {
  lizards: 'A smell like a fish market. In the stairwell.',
  aliens: 'The air smells of hot wire.',
  zombies: 'Something sweet and rotten, under the floor.',
};
const MOVED = [
  'Your chair has moved.',
  'The kettle is warm. You didn’t use it.',
  'Your bed is made. You never make it.',
  'A window you closed is open.',
];
function planDay() {
  G.horror = [];
  G.nightPlan = dayNo();
  G.nightYes = chance(ATTACK_ODDS[G.stage] || 0);
  if (!theyStir()) return;
  const s = G.stage,
    count = s <= 1 ? 1 : s === 2 ? irand(1, 2) : s === 3 ? 2 : s === 4 ? irand(2, 3) : 3;
  const day0 = (dayNo() - 1) * 1440,
    mine = G.aware / 100;
  const street = theyOut() || mayHuntYou(); // before day 5 THEY keep off the street, unless it's you THEY're after
  for (let k = 0; k < count; k++) {
    const mix = HORROR_MIX[s];
    let r = Math.random(),
      kind = 0;
    while (kind < 3 && r > mix[kind]) {
      r -= mix[kind];
      kind++;
    }
    let ev;
    if (kind === 0)
      ev = pick(['leftover', 'smell', 'sound', 'moved', ...(G.gatherDay === dayNo() + 1 ? ['chalk', 'chalk'] : [])]);
    else if (kind === 1) ev = pick(['murmur', 'call']);
    else if (kind === 2)
      ev = pick(
        [
          'window',
          'still',
          'followed',
          'device',
          ...(G.faction === 'aliens' && s >= 4 ? ['flock', 'flock'] : []),
        ].filter((e) => (e !== 'window' || G.aware >= 25) && (street || e === 'device')),
      );
    else
      ev =
        pick(
          [
            'alley',
            'alley',
            ...(chance(mine) ? ['handle'] : []),
            ...(G.faction === 'aliens' && s >= 4 ? ['lure', 'lure', 'lure'] : []),
          ].filter((e) => (e !== 'alley' || (s >= 3 && theyOut())) && (e !== 'lure' || theyOut())),
        ) || 'handle';
    const at =
      day0 +
      Math.round(
        60 *
          {
            leftover: rand(8, 20),
            smell: rand(8, 21),
            sound: rand(18, 23),
            moved: rand(10, 16),
            chalk: rand(10, 17),
            murmur: rand(10, 16),
            call: rand(19, 23),
            window: rand(25, 26.5),
            still: rand(21, 23),
            followed: rand(18, 21),
            device: rand(10, 16),
            lure: rand(21, 23.5),
            flock: rand(11, 16),
            alley: rand(22.5, 26),
            handle: rand(26, 28),
          }[ev],
      );
    G.horror.push({ k: ev, at, done: false });
  }
}
function sentAfter() {
  const P = PLAYER;
  if (!P.onMap || G.away || inRoomSet(P, (r) => r.home)) return false;
  const b = pick(
    suspects().filter(
      (s) =>
        bought(s) &&
        !s.isThem &&
        s.onMap &&
        !s.gone &&
        !s.engaged &&
        !s.fleeing &&
        !s.trueForm &&
        !asleep(s) &&
        Math.hypot(s.x - P.x, s.z - P.z) < 30,
    ),
  );
  if (!b) return false;
  hardReset(b);
  ui.say(b, pick(['THEY want a word.', 'Come here.', 'You should’ve minded your business.']), 3);
  brawl(b, HURT.thug, { label: 'After you', giveUp: 6 });
  echo('fight', { x: b.x, z: b.z, who: b.id });
  return true;
}
function openTick() {
  if (G.faction !== 'lizards' || G.stage < 5 || G.openCd > G.t) return;
  G.openCd = G.t + rand(60, 180);
  if (chance(0.4) && sentAfter()) return;
  const c = pick(alive().filter((x) => x.onMap && !x.trueForm && !x.raiding && !x.hideUntil && !roomAt(x.x, x.z)));
  if (!c) return;
  trueForm(c, 'open');
  if (c.trueForm) {
    c.trueForm.mode = 'prowl';
    c.trueForm.long = 30;
    c.trueForm.route = [
      [20, 13],
      [30, 18],
      [40, 13],
      [50, 18],
      [27, 6],
      [35, 25],
    ];
  }
}
function lureTick() {
  const L = G.lure;
  if (!L) return;
  const c = NPC[L.by],
    st = CHARS.find((x) => x.id === L.s);
  if (!c || !st || !st.onMap || c.slain || c.trueForm || G.t - L.t0 > 150) return lureEnd(L, true, true);
  if (L.go && PLAYER.onMap && st.z < 12.5 && visAt(st.x, st.z) > 0.5) lureEnd(L, true);
}
function lureEnd(L, broken, quiet) {
  if (G.lure !== L) return;
  G.lure = null;
  const c = NPC[L.by],
    st = CHARS.find((x) => x.id === L.s);
  if (c) c.breakIn = false;
  if (broken) {
    if (st && st.onMap) {
      hardReset(st);
      enqueue(st, goAct(EDGES.W[0], { label: 'Walking', run: true }));
    }
    if (c && c.queue[0] && c.queue[0].label === '…') hardReset(c);
    if (quiet || !st) return;
    ui.say(st, pick(['Where am I?', 'What was I doing?']), 3);
    addStress(6);
    if (c && c.onMap) {
      R.flash = Math.max(R.flash, 0.4);
      hardReset(c);
      hideAway(c, true);
    }
    echo('attack', { x: st.x, z: st.z, who: null, broken: true });
    return;
  }
  if (c) hardReset(c);
  if (!st) return;
  addItem({ kind: 'scorch', x: st.x, z: st.z, rot: rand(0, TAU), by: L.by, room: null, at: G.t });
  hardReset(st);
  st.onMap = false;
  st.queue = [];
  opDone('take');
  echo('victim', { x: st.x, z: st.z, stranger: true });
}
