//@ audio/foley — What you hear of the town: the air by place and hour, steps, doors, hands at work, voices
//@ Defines: SND, FOLEY, FOLEY_USE, FOLEY_ANIM, foleyGap, knockGap, soundTick, foleyPsy, stepSurf, foleyTick, foleyLoops, loopWant, voiceFor
//@ Uses:    sim/core, audio/sound, horror/layer, world/objects, core/util, ui/interface, player/needs, world/light-map, data/tuning, world/vision, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── what you hear of the town ─────────────────────────
// The air by place and hour, and the foley: footsteps on what they land on, doors, hands at work, voices.
// All of it only listens: it reads the game and never writes to it, and what it leaves to chance is the
// sound's own chance (audio.rnd), never Math.random, which belongs to the simulation.
const SND = {
  hum: false,
  outside: true,
  night: false,
  stress: 0,
  rain: 0,
  car: 0,
  dread: 0,
  space: 'out',
  day: 1,
  hour: 12,
  warn: 0,
  danger: 0,
  look: 0,
  muffle: 0,
  psy: 0,
  faction: null,
  home: false,
  town: true,
  still: false,
};
const FOLEY = {
  steps: new WeakMap(), // who → the step their feet last put down
  poses: new WeakMap(), // who → stand / sit / lie, last frame
  busy: new WeakMap(), // who → seconds to the next sound of what their hands are doing
  doors: null,
  act: 0,
  ot: null,
  next: 0,
  knock: 0,
  flash: null,
  proofs: null,
  health: null,
  hit: 0,
  hour: -1,
  loops: { water: 0, shower: 0, sizzle: 0, tv: 0 },
};
// what each thing sounds like when you put your hands to it: once at the start, over and over while you're at it,
// once at the end
const FOLEY_USE = {
  fridge: ['clank', null, 'door0'],
  fridge_office: ['clank', null, 'door0'],
  vending: ['clank', null, 'thud'],
  cooler: ['clank', 'rustle', 'door0'],
  mailbox: ['clank', null, null],
  radiator: ['clank', null, null],
  coffee: ['pour', null, null],
  watercooler: ['pour', null, 'gulp'],
  printer: ['whir', null, null],
  phone: ['dial', null, null],
  payphone: ['dial', null, null],
  newsrack: ['page', null, null],
  toilet: [null, null, 'flush'],
  drain: ['drip', null, null],
  birdcage: ['bird', null, null],
  shelf_groc: [null, 'rustle', null],
  shelf_house: [null, 'rustle', null],
  shelf_snack: [null, 'rustle', null],
  metalshelf: [null, 'rustle', null],
  crates: [null, 'rustle', null],
  trashcan: [null, 'rustle', null],
  dumpster: ['clank', 'rustle', null],
  wardrobe: [null, 'rustle', null],
  bookshelf: [null, 'page', null],
};
const FOLEY_ANIM = { type: 'key', eat: 'chew', drink: 'gulp', read: 'page', dig: 'scrape', knock: 'knock' };
// how long till the next one, in real seconds
function foleyGap(k) {
  const r = audio.rnd;
  if (k === 'key') return r() < 0.12 ? 0.4 + r() * 0.9 : 0.05 + r() * 0.13; // bursts of typing, a pause to think
  if (k === 'chew') return 0.9 + r() * 0.6;
  if (k === 'gulp') return 1.4 + r() * 0.8;
  if (k === 'page') return 4 + r() * 4;
  if (k === 'scrape') return 0.8 + r() * 0.4;
  if (k === 'rustle') return 0.6 + r() * 0.5;
  return 1;
}
// knuckles on a door: three, and a wait
function knockGap() {
  FOLEY.knock = (FOLEY.knock + 1) % 4;
  return FOLEY.knock === 3 ? 1.2 + audio.rnd() * 0.6 : 0.28;
}

// once a frame from simStep (game/loop): the air for where you are and what's coming, then the foley
function soundTick(dt, pr, car) {
  const P = PLAYER,
    h = hourF(),
    live = G.started && !G.over,
    still = G.speed === 0 || !!UI.caseOpen || !!UI.scene || !!G.over;
  // a blow you took: the world goes under for a moment
  FOLEY.hit = Math.max(0, FOLEY.hit - dt * 0.8);
  if (FOLEY.health != null && G.health < FOLEY.health - 0.5 && P.onMap) {
    const v = FOLEY.health - G.health;
    audio.hx(v >= 4 ? 'hurt' : 'punch', 0, clamp(0.5 + v / 20, 0.5, 1));
    FOLEY.hit = Math.min(1, FOLEY.hit + 0.35 + v / 30);
  }
  FOLEY.health = G.health;
  const S = SND,
    homey = !!(pr && (pr.home || pr.agnes || pr.house));
  S.hum = !!(pr && (pr.bld === 'office' ? officeLit() : pr.bld === 'shop' ? shopOpen() : false));
  S.outside = !pr;
  S.night = h > 20 || h < 6;
  S.stress = P.needs.stress;
  S.rain = G.rainK || 0;
  S.car = car || 0;
  S.dread = HX.dread;
  S.space = !pr ? 'out' : pr.bld === 'station' ? 'cell' : pr.bld === 'lair' ? 'lair' : homey ? 'home' : 'room';
  S.home = homey;
  S.day = 1 - HX.night;
  S.hour = h;
  // a bad hour coming: the warning starts well before it does (hxBadHour already ramps in over its last 15 minutes)
  S.warn = live ? hxBadHour(G.t + 40) * 0.85 : 0;
  S.danger = live ? Math.max(HX.danger, hunted() ? 0.6 : 0) : 0;
  S.look = STY.k;
  S.muffle = Math.max(
    G.sleeping ? 0.5 : 0,
    still && live ? 0.3 : 0,
    FOLEY.hit * 0.85,
    live ? clamp((35 - G.health) / 35, 0, 1) * 0.55 : 0,
  );
  S.psy = live && P.onMap ? foleyPsy(pr) : 0;
  S.faction = G.faction || null;
  S.town = true;
  S.still = still;
  audio.update(S);
  if (still || !P.onMap || G.away) foleyLoops(null, null);
  else foleyTick(dt, pr);
}
// THEIR gear humming in the walls of this room, or one of THEIR things where you can see it
function foleyPsy(pr) {
  let v = G.hotRooms && pr && G.hotRooms.includes(pr.key) ? 0.7 : 0;
  const R2 = PSY.things * 1.7;
  for (const it of G.items) {
    if (!it.by || it.innocent || it.kind === 'trap' || it.kind === 'opened') continue;
    const d = Math.hypot(it.x - PLAYER.x, it.z - PLAYER.z);
    if (d < R2 && visAt(it.x, it.z) > 0.45) v = Math.max(v, 1 - d / R2);
  }
  return v;
}
// what a foot lands on
function stepSurf(c) {
  if (c.trueForm || (c.tell && c.tell.type === 'true')) {
    const f = (c.tell && c.tell.fac) || G.faction;
    return f === 'lizards' ? 'claw' : f === 'zombies' ? 'drag' : 'heavy';
  }
  const r = roomAt(c.x, c.z);
  if (!r) return (G.rainK || 0) > 0.3 ? 'wet' : 'street';
  if (r.bld === 'lair') return r.lair === 'ship' ? 'metal' : 'mud';
  if (r.bld === 'office' || r.bld === 'shop' || r.bld === 'station') return 'tile';
  return 'wood';
}
function foleyTick(dt, pr) {
  const P = PLAYER,
    rnd = audio.rnd;
  // midnight: the town clock strikes twelve, and THEIR week moves on a day
  const hr = Math.floor(hourF());
  if (FOLEY.hour === 23 && hr === 0) audio.hx('bell', (rnd() - 0.5) * 0.6, pr ? 0.3 : 0.6, 12);
  FOLEY.hour = hr;
  // steps: everybody's feet, yours loudest; at night and in a bad hour you hear other people's from further off
  const far = 7 + HX.night * 2 + HX.dread * 2;
  let budget = 3;
  for (const c of CHARS) {
    if (!c.onMap) continue;
    const k = Math.floor((c.walkPh || 0) / Math.PI),
      was = FOLEY.steps.get(c);
    FOLEY.steps.set(c, k);
    if (was == null || was === k) continue;
    if (c.isPlayer) {
      if (!c.moving && !c.vault) continue;
      audio.hx('step', Math.sin(c.walkPh) > 0 ? 0.06 : -0.06, c.run ? 0.4 : 0.26, stepSurf(c));
      continue;
    }
    if (c.shown < 0.15 || budget <= 0) continue;
    const d = Math.hypot(c.x - P.x, c.z - P.z);
    if (d > far) continue;
    budget--;
    const sf = stepSurf(c),
      big = sf === 'heavy' || sf === 'claw' || sf === 'drag';
    audio.hx('step', hxPan(c.x, c.z), (big ? 0.7 : c.run ? 0.3 : 0.2) * Math.pow(1 - d / far, 1.5), sf);
  }
  for (const a of HX.actors) {
    if (a.hide || a.walkPh == null) continue;
    const k = Math.floor(a.walkPh / Math.PI),
      was = FOLEY.steps.get(a);
    FOLEY.steps.set(a, k);
    if (was == null || was === k) continue;
    const d = Math.hypot(a.x - P.x, a.z - P.z);
    if (d > far + 2) continue;
    audio.hx(
      'step',
      hxPan(a.x, a.z),
      (a.menace > 0.3 ? 0.55 : 0.22) * Math.pow(1 - d / (far + 2), 1.4),
      a.menace > 0.3 ? 'heavy' : stepSurf(a),
    );
  }
  // doors near you: the latch and the swing, the hinge more often the later it gets; the slam of one shutting
  if (!FOLEY.doors || FOLEY.doors.length !== DOORS.length) {
    FOLEY.doors = new Float32Array(DOORS.length);
    for (let i = 0; i < DOORS.length; i++) FOLEY.doors[i] = DOORS[i].open;
  }
  const eerie = clamp(HX.night * 0.45 + HX.dread * 0.6, 0, 1);
  for (let i = 0; i < DOORS.length; i++) {
    const d = DOORS[i],
      was = FOLEY.doors[i];
    FOLEY.doors[i] = d.open;
    if (d.pairL) continue; // a double door is one doorway
    const dd = Math.hypot(d.x + 0.5 - P.x, d.z + 0.5 - P.z);
    if (dd > 11) continue;
    const vol = clamp(1.1 - dd / 11, 0.1, 1);
    if (was <= 0.02 && d.open > 0.02) audio.hx('door1', hxPan(d.x + 0.5, d.z + 0.5), vol * 0.8, eerie);
    else if (was > 0.02 && d.open <= 0.02) audio.hx('door0', hxPan(d.x + 0.5, d.z + 0.5), vol * 0.45);
  }
  // sitting down and getting up: a chair, springs, the bed
  for (const c of CHARS) {
    if (!c.onMap) continue;
    const p = c.pose === 'sit' || c.pose === 'lie' ? c.pose : 'stand',
      was = FOLEY.poses.get(c);
    FOLEY.poses.set(c, p);
    if (!was || was === p) continue;
    const d = c.isPlayer ? 0 : Math.hypot(c.x - P.x, c.z - P.z);
    if (d > 5) continue;
    const a = c.queue[0],
      ot = a && a.obj ? a.obj.type : null,
      soft = p === 'lie' || was === 'lie' || ot === 'sofa' || ot === 'armchair' || ot === 'bed';
    audio.hx('seat', c.isPlayer ? 0 : hxPan(c.x, c.z), (p === 'stand' ? 0.5 : 0.8) * (1 - d / 6), soft ? 1 : 0);
  }
  // your hands: the thing you're using, once at the start, over and over, once at the end
  const a = P.queue[0],
    run = !!(a && a.stage === 'run'),
    ot = run && a.obj ? a.obj.type : null;
  if (FOLEY.act && (!run || a.id !== FOLEY.act)) {
    const u = FOLEY_USE[FOLEY.ot];
    if (u && u[2]) audio.hx(u[2], 0, 0.45);
    FOLEY.act = 0;
    FOLEY.ot = null;
  }
  if (run && a.id !== FOLEY.act) {
    FOLEY.act = a.id;
    FOLEY.ot = ot;
    FOLEY.next = 0.15;
    FOLEY.knock = 0;
    const u = FOLEY_USE[ot];
    if (u && u[0]) audio.hx(u[0], 0, 0.45);
  }
  if (run) {
    const u = FOLEY_USE[ot],
      k = FOLEY_ANIM[a.anim] || (u && u[1]);
    if (k && (FOLEY.next -= dt) <= 0) {
      FOLEY.next = k === 'knock' ? knockGap() : foleyGap(k);
      audio.hx(k, 0, k === 'knock' ? (a.long ? 0.9 : 0.55) : k === 'key' ? 0.35 : 0.45);
    }
  }
  foleyLoops(run ? ot : null, run ? a.anim : null);
  // the people round you at it too: keyboards across the office, someone eating, a knock down the hall
  for (const c of CHARS) {
    if (c.isPlayer || !c.onMap || c.shown < 0.5) continue;
    const q = c.queue[0],
      k = q && q.stage === 'run' ? FOLEY_ANIM[q.anim] : null;
    if (!k) continue;
    const d = Math.hypot(c.x - P.x, c.z - P.z);
    if (d > 7) continue;
    let t = FOLEY.busy.get(c);
    if (t == null) t = rnd() * 0.5;
    t -= dt;
    if (t <= 0) {
      t = k === 'knock' ? 0.3 + (rnd() < 0.33 ? 1.2 : 0) : foleyGap(k);
      audio.hx(k, hxPan(c.x, c.z), (k === 'knock' ? 0.6 : 0.3) * Math.pow(1 - d / 7, 1.3));
    }
    FOLEY.busy.set(c, t);
  }
  // the torch's switch; a card going into the book
  const fl = !!G.inv.flashOn;
  if (FOLEY.flash != null && fl !== FOLEY.flash) audio.hx('flick', 0, 0.5);
  FOLEY.flash = fl;
  const np = G.proofs ? G.proofs.length : 0;
  if (FOLEY.proofs != null && np > FOLEY.proofs) audio.hx('paper', 0, 0.6);
  FOLEY.proofs = np;
}
// the steady ones: running water, the pan, the television. Only told when they change
function foleyLoops(ot, anim) {
  loopWant('shower', ot === 'shower' ? 1 : 0);
  loopWant('water', ot === 'sink' || ot === 'sinkcounter' ? 0.7 : 0);
  loopWant('sizzle', ot === 'stove' || anim === 'cook' ? 0.8 : 0);
  loopWant('tv', ot === 'tv' ? 0.7 : 0);
}
function loopWant(k, v) {
  if (FOLEY.loops[k] === v) return;
  FOLEY.loops[k] = v;
  audio.loop(k, v);
}
// a line said out loud (ui.say): the shape of the words in the speaker's own voice, from where they stand
function voiceFor(c, text) {
  if (!c || !c.onMap || !PLAYER || typeof text !== 'string' || G.sleeping) return;
  const d = c.isPlayer ? 0 : Math.hypot(c.x - PLAYER.x, c.z - PLAYER.z);
  if (d > 14) return;
  let hs = 0;
  const id = c.id || '';
  for (let i = 0; i < id.length; i++) hs = (hs * 31 + id.charCodeAt(i)) | 0;
  const fem = c.def && c.def.fem,
    tall = (c.look && c.look.h) || 1,
    pitch = ((fem ? 215 : 120) * (1 + ((((hs % 97) + 97) % 97) / 97 - 0.5) * 0.3)) / tall,
    odd = c.trueForm ? 1 : c.isThem && (c.tell || HX.dread > 0.4) ? 0.5 : 0;
  audio.voice(text, c.isPlayer ? 0 : hxPan(c.x, c.z), c.isPlayer ? 0.7 : clamp(1.1 - d / 14, 0.05, 1), pitch, odd);
}
