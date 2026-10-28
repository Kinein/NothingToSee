//@ game/state — Game state, new game, saving, endings
//@ Defines: SAVE_KEY, freshG, resetWorld, newGame, syncNPCs, saveGame, readSave, loadGame, gameOver
//@ Uses:    sim/core, ui/interface, gfx/renderer, town/cast, world/vision, core/util, world/grid, world/objects, town/quirks, game/last-day, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── game state, saving, the loop ─────────────────────────
const SAVE_KEY = 'nothing-to-see-here-v3'; // the five-day rework: older saves don't carry over
function freshG(start) {
  return {
    t: start,
    speed: 1,
    inv: {
      trap: 0,
      flashlight: false,
      flashOn: false,
      pills: 0,
      paper: 1,
      meal: 0,
      drink: 0,
      tinfoil: false,
      foilOn: false,
      crowbar: false,
      bait: [],
    },
    slain: [],
    stashes: [],
    stashId: 0,
    traps: [],
    broken: {},
    intruded: '',
    workBar: 75,
    workBonusAt: -999,
    awayT: 0,
    workWarned: false,
    sickDay: false,
    stressFloor: 0,
    hiStress: 0,
    sleepFrom: 0,
    visionOff: 0,
    whisperCd: 30,
    clinicDay: 0,
    lore: {},
    traits: {},
    cover: {},
    prints: [],
    printId: 0,
    aware: 0,
    awareBook: {},
    awareRemoved: 0,
    sus60: {},
    misled: {},
    destroyDay: -9,
    overtimeDay: 0,
    overtimeToday: false,
    filesAt: 0,
    policeAt: 0,
    policeWarned: false, // the officer has had his word with you once: next time he takes you in
    ambushNight: 0,
    health: 100,
    binFood: [],
    tvBugged: null,
    control: null,
    pickAt: -999,
    hotRooms: null,
    takenAt: -1e9,
    taken: 0,
    playerChip: false,
    landing: 0,
    pairs: {},
    bought: {},
    boughtBy: {},
    policeBought: false,
    skimAt: 0,
    skims: 0,
    complainAt: 0,
    shaveDay: 0,
    attackFoe: null,
    openCd: 0,
    underSeen: '',
    attack: null,
    horror: [],
    victims: [],
    found: null,
    chipped: {},
    bitten: {},
    confessed: {},
    movedNote: null,
    chalk: 0,
    murmur: null,
    tapeUntil: 0,
    agnesDark: 0,
    houseDark: {},
    sickNext: false,
    shakenUntil: 0,
    away: null,
    assaulted: [],
    fights: 0,
    events: [],
    heard: [],
    headline: null,
    faction: pick(['aliens', 'lizards', 'zombies']),
    them: [],
    exposed: [],
    factionKnown: false,
    items: [],
    leads: [],
    lennyHint: 0,
    lennyToday: 0,
    momToday: false,
    momWeek: false,
    mailToday: false,
    thoughtCd: 20,
    shadeCd: 30,
    awkCd: 0,
    ritualSeenDay: {},
    homeLights: false,
    tvOn: false,
    agnesLights: false,
    sleeping: false,
    phoneRing: null,
    watcher: null,
    over: null,
    started: false,
    slackCaught: false,
    haleSaw: false,
    habits: {},
    cleared: {},
    habitDone: {},
    quirks: null,
    qlog: [],
    qyou: {},
    qcnt: {},
    qwatch: {},
    told: {},
    lsaw: [],
    lennySaid: {},
    smell: {},
    smelt: {},
    nightPlan: 0,
    nightYes: false,
    plan: 0,
    stage: 1,
    stagePts: 0,
    phase: 1,
    weekStart: 1,
    stageNews: null,
    gatherDay: irand(3, 4),
    gatherTip: 0,
    proofs: [],
    proofId: 0,
    pinShots: {},
    dashed: {}, // suspect id → { frame: when you searched it and found nothing }
    mark: {}, // suspect id → 'them' | 'cleared': your own stamp on the board
    odd: {}, // human id → their innocent oddity: { frame, k, given, flipped }
    framed: [], // humans THEY have framed: { id, by, at, obj, done }
    rumours: [], // what's going round: { about, line, from, innocent | by, told }
    victimOf: {}, // person id → { by, at }: the last of THEM to do something to them
    recant: {}, // witnesses THEY got to: bribed, wiped or killed
    cfDay: {}, // suspect id → the day you last confronted them
    madUntil: 0, // the town called you mad: −1 lean until then
    grudge: {}, // suspect id → the accused you wronged: their friends lean against you
    watchedUntil: {}, // member id → doubted in public: no business in public places until then
    fearUntil: 0, // after a public change: people go home early
    huntNights: 0, // nights THEY still hunt you after a private kill
    huntNight: 0, // a night THEY come for you whatever the odds
    follower: null, // { id, until }: someone who came with you
    awareExtra: 0, // awareness booked for the next 06:00 by what you did (see EVIDENCE.aware)
    tearTonight: 0, // cards THEY tear from your flat tonight
    hintsUntil: 0, // after a total success people share more
    witVisit: null, // { w, m, at }: tonight one of THEM goes after a witness
    tail: null, // { id, until, saw }: one of THEIR people a few steps behind you, by day
    tailNext: 0,
    arenaTalk: [], // what the town says after a confrontation, still to be heard: { at, text, by }
    ritualBroke: 0,
    gatherKnown: false,
    enc: null,
    encNext: 0,
    encLast: -1e9,
    encNamed: 0,
    encNamedDay: 0,
    halfCd: 8,
    freeWill: true,
    idleT: 0,
    autoT: 0,
    rainDay: true,
    rainFrom: 19.5,
    rainTo: 3,
    rainAmt: 0.8,
    rainK: 0,
    wet: 0,
    dayShown: 0,
  };
}
function resetWorld() {
  capReset();
  huntClear();
  fbiReset();
  arrestReset();
  FRI.hold = null;
  FRI.scorched = false;
  FRI.grace = 0;
  UI.almostT = null;
  {
    const al = $('#almost');
    if (al) al.hidden = true;
  }
  UI.camMode = false;
  UI.pinSel = null;
  UI.aim = null;
  UI.scene = null;
  UI.swingCd = 0;
  UI.focus = null;
  BOLTS.length = 0;
  wreckReset();
  SWARMS.length = 0;
  const se = $('#scene');
  if (se) se.hidden = true;
  const sr = roomByKey('shop');
  if (sr) sr.name = 'Pell’s Market';
  const sg = R.glows && R.glows.find((g) => g.grp === 'shopSign');
  if (sg) sg.col = [1, 0.25, 0.45];
  const sl = LIGHTS.find((x) => x.grp === 'shopSign');
  if (sl) sl.col = hex(0xff4d86);
  CHARS.length = 0;
  for (const k in NPC) delete NPC[k];
  for (const o of OBJ) {
    o._slots = null;
    o.users = [];
    o.data = {};
  }
  R.itemMeshes.clear();
  R.portraits = {};
  R.snaps = {};
  for (const d of DOORS) {
    d.slack = 0;
    d.open = d.ajar ? AJAR.open : 0;
  }
  explored.fill(0);
  visCur.fill(0);
  visTarget.fill(0);
  UI.bubbles.forEach((b) => b.el.remove());
  UI.bubbles = [];
  UI.floats.forEach((f) => f.el.remove());
  UI.floats = [];
  UI.says.forEach((s) => s.el.remove());
  UI.says = [];
  UI.pings.forEach((p) => p.el.remove());
  UI.pings = [];
  UI.portraitKey = null;
  CARS.length = 0;
  SHADE.on = false;
  hxReset();
}
function newGame(name, preview) {
  resetWorld();
  G = freshG(preview ? 23 * 60 + 5 : 6 * 60 + 50);
  setupPlayer(name || 'Sam');
  setupCast();
  G.them = shuffle(CAST.filter((d) => !d.never).map((d) => d.id)).slice(0, 3);
  for (const id of G.them) NPC[id].isThem = true;
  makeHabits();
  rollTraits();
  makeCover();
  makeQuirks();
  makeStashes();
  makeOddities();
  for (const n of CHARS) if (n.def.plan) makePlan(n);
  placeChar(PLAYER, 9, 29);
  PLAYER.dir = PLAYER.tdir = Math.PI;
  syncNPCs();
  if (!preview) G.started = true;
  else {
    PLAYER.onMap = false;
    explored.fill(1);
    visTarget.fill(1);
    visCur.fill(1);
    G.rainK = 0.85;
    G.wet = 0.85;
  }
  cam.tx = preview ? 20 : PLAYER.x;
  cam.tz = preview ? 16 : PLAYER.z;
  cam.follow = !preview;
  cam.zoomT = cam.zoom = preview ? 9.5 : CAM_ZOOM;
  if (!preview) cam.yaw = cam.yawT = 0; // square to the town: W is north, up the screen and straight along the walls
  warmPortraits();
}
// put everyone where their day says they should be (start of game, after loading)
function syncNPCs() {
  for (const n of CHARS) {
    if (n.isPlayer) continue;
    hardReset(n);
    n.tell = null;
    if (n.def.stranger) {
      n.onMap = false;
      continue;
    }
    const b = curBlock(n);
    if (b.a === 'gone' || (b.a === 'off' && !HOUSE_OF[n.id])) {
      n.onMap = false;
      continue;
    }
    let spot = null;
    switch (b.a) {
      case 'work':
        spot = objSlots(OBJ_BY_ID[n.def.chair])[0].cands.find(([x, z]) => walkable(x, z));
        break;
      case 'lunch':
        spot = [19, 3];
        break;
      case 'clerk':
        spot = [33, 11];
        break;
      case 'shop':
        spot = [35, 9];
        break;
      case 'home':
      case 'sleep':
      case 'house':
      case 'off':
        spot = n.id === 'agnes' ? [18, 22] : HOUSE_OF[n.id] ? HOUSE_OF[n.id].spot : null;
        break;
      case 'watch':
        spot = HOUSE_OF[n.id] ? HOUSE_OF[n.id].spot : null;
        break;
      case 'park':
        spot = [38, 26];
        break;
      case 'lenny':
        spot = [34, 26];
        break;
      case 'gather':
        spot = RITUAL.spots[G.them.indexOf(n.id) % RITUAL.spots.length];
        break;
      case 'stroll':
      case 'prowl':
        spot = randomOutdoor();
        break;
      case 'courier':
        spot = [12, 13];
        break;
    }
    if (!spot) {
      n.onMap = false;
      continue;
    }
    placeChar(n, spot[0], spot[1]);
    n.onMap = true;
    n.shown = 0;
    n.thinkCd = 0;
    n.prevRoom = roomAt(n.x, n.z);
  }
}
function saveGame() {
  if (!G || !G.started || G.over || CAP.on) return;
  const data = {
    v: 9,
    G,
    explored: Array.from(explored),
    player: { name: PLAYER.name, x: PLAYER.x, z: PLAYER.z, needs: PLAYER.needs },
    npcs: Object.fromEntries(
      Object.values(NPC).map((n) => [
        n.id,
        {
          rel: n.rel,
          sus: n.sus,
          rumors: n.rumors,
          notes: n.notes,
          snaps: n.snaps,
          clues: n.clues,
          exposed: !!n.exposed,
          slain: n.slain || null,
          huntAt: n.huntAt || -1e9,
          baitDay: n.baitDay || 0,
          seenRoom: n.seenRoom,
          gossipDay: n.gossipDay,
          gossipN: n.gossipN || 0,
          watchDay: n.watchDay,
          microN: n.microN,
          remarkDay: n.remarkDay,
          confronted: !!n.confronted,
          danger: Math.round(n.danger || 0),
          dangerPeak: Math.round(n.dangerPeak || 0),
          pinnedDay: n.pinnedDay || 0,
          caught: !!n.caught,
          gone: n.gone || null,
          limpDay: n.limpDay || 0,
          lostDay: n.lostDay || 0,
          dawnStand: n.dawnStand || 0,
          frightUntil: n.frightUntil || 0,
          underDay: n.underDay || 0,
          bribeDay: n.bribeDay || 0,
          controlDay: n.controlDay || 0,
          wrongTalk: n.wrongTalk || 0,
          scatterDay: n.scatterDay || 0,
          sawChange: n.sawChange || null,
          surrendered: !!n.surrendered,
          smellAt: n.smellAt || 0,
        },
      ]),
    ),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage unavailable */
  }
}
function readSave() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}
function loadGame(data) {
  if (!data || data.v !== 9) return false; // older saves kept the evidence bar: they start over
  resetWorld();
  G = Object.assign(freshG(0), data.G, {
    started: true,
    over: null,
    sleeping: false,
    tvOn: false,
    phoneRing: null,
    speed: 1,
  });
  setupPlayer(data.player.name);
  setupCast();
  for (const d of NEEDS) if (data.player.needs && d.k in data.player.needs) PLAYER.needs[d.k] = data.player.needs[d.k];
  for (const id of G.them) NPC[id].isThem = true;
  if (!G.habits || !Object.keys(G.habits).length) makeHabits();
  if (!G.traits || !Object.keys(G.traits).length) rollTraits();
  if (!G.cover || !Object.keys(G.cover).length) makeCover();
  for (const d of CAST)
    if (!d.never && !G.habits[d.id]) {
      const keep = G.habits;
      makeHabits();
      G.habits = Object.assign(G.habits, keep);
      break;
    } // a newcomer to town (an older save)
  for (const d of CAST) {
    const hb = G.habits[d.id];
    if (hb && !hb.ms) {
      hb.ms = habitTimes(d);
      hb.m = hb.ms[0];
    }
  } // an older save: one break a day becomes a few
  for (const n of suspects())
    if (!G.traits[n.id])
      G.traits[n.id] = n.isThem
        ? { temper: pick(['careful', 'aggressive']), fightR: 3, catchR: 3, restless: 0 }
        : { temper: pick(['aggressive', 'mocker', 'timid']), odd: false, sig: [], restless: 0 };
  if (!G.quirks || !Object.keys(G.quirks).length) makeQuirks();
  for (const [id, s] of Object.entries(data.npcs || {})) if (NPC[id]) Object.assign(NPC[id], s);
  for (const n of suspects())
    if (n.surrendered) {
      n.surrendered = null;
      if (!n.slain) {
        n.slain = 'fbi';
        G.slain.push(n.id);
      }
    } // the grey cars came while you were away
  G.phase = phaseNow();
  for (const n of CHARS) if (n.def.plan) makePlan(n);
  for (let i = 0; i < explored.length; i++) explored[i] = data.explored[i] || 0;
  if (!G.stashes) makeStashes();
  for (const st of G.stashes) {
    st.trip = false;
    if (st.obj < 0) st.obj = (stashPool(NPC[st.by] || PLAYER)[0] || OBJ_BY_ID.homeTV).idx;
  }
  const items = G.items;
  G.items = [];
  for (const it of items) addItem(it);
  let [px, pz] = [Math.floor(data.player.x), Math.floor(data.player.z)];
  if (!walkable(px, pz, PLAYER)) [px, pz] = nearestWalkable(px, pz, PLAYER, 4) || [9, 29];
  placeChar(PLAYER, px, pz);
  PLAYER.fx.foil = G.inv.foilOn;
  syncNPCs();
  for (const n of CHARS) {
    n.hideUntil = 0;
    n.fleeing = null;
    n.trueForm = null;
    n.trapped = false;
    n.odd = null;
    n.spd = 1;
  }
  if (G.away) PLAYER.onMap = false;
  if (G.policeAt) G.policeAt = 0;
  G.attack = null;
  G.control = null;
  G.murmur = null;
  G.enc = null;
  G.on = null;
  for (const n of CHARS) {
    n.breakIn = false;
    n.raiding = null;
    n.hunting = false;
    n.under = false;
  }
  if (G.faction === 'lizards' && G.stage >= 3) holdings();
  G.lure = null;
  marks();
  cam.tx = PLAYER.x;
  cam.tz = PLAYER.z;
  cam.follow = true;
  cam.zoomT = cam.zoom = CAM_ZOOM;
  cam.yaw = cam.yawT = 0;
  warmPortraits();
  return true;
}
function gameOver(kind) {
  if (G.over) return;
  G.over = kind;
  G.speed = 0;
  const e = kind === 'taken' || kind === 'plan' || kind === 'killed' ? ENDINGS[kind][G.faction] : ENDINGS[kind];
  UI.aim = null;
  $('#over-title').textContent = e[0];
  $('#over-body').textContent = e[1];
  $('#over-kind').textContent =
    kind === 'won'
      ? 'Case closed'
      : kind === 'escaped'
        ? 'Got away · ' + fmtTime(G.t)
        : DOW_LONG[dow()] + ' · ' + fmtTime(G.t);
  $('#over-ic').innerHTML = svgIcon(
    kind === 'won'
      ? 'eye'
      : kind === 'escaped'
        ? 'out'
        : kind === 'fired'
          ? 'work'
          : kind === 'committed'
            ? 'sick'
            : kind === 'prison'
              ? 'lock'
              : FACTIONS[G.faction].icon,
  );
  $('#over').classList.toggle('won', kind === 'won' || kind === 'escaped');
  {
    const al = $('#almost');
    if (al) al.hidden = true;
    UI.almostT = null;
  }
  if (FRI.hold) looseRelease(false);
  $('#over-load').hidden = !readSave() || kind === 'won';
  $('#over').hidden = false;
  audio.sting(kind === 'won' || kind === 'escaped' ? 'onto' : 'caught');
}
