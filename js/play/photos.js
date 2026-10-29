//@ play/photos — Photos: reading what is in frame
//@ Defines: OBJ_ICON, placeName, shotTarget, photoAct, inPhotoCone, photoCone, playerPhoto, addPrint, takePhoto, itemHome, itemSeenWith, photoItem, PHOTO_FACE, photoSeen, toggleCam
//@ Uses:    sim/core, ui/interface, them/proofs, town/suspicion, ui/menus, them/tells, sim/actions, data/tuning, world/vision, core/util, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── photos: anything in sight within 11 tiles. The game reads every print.
const OBJ_ICON = {
  toilet: 'toilet',
  shower: 'shower',
  sink: 'mirror',
  fridge: 'fridge',
  fridge_office: 'fridge',
  stove: 'cook',
  phone: 'phone',
  payphone: 'phone',
  tv: 'tv',
  oldtv: 'tv',
  chair: 'chair',
  armchair: 'chair',
  sofa: 'chair',
  bench: 'chair',
  chair_office: 'chair',
  radiator: 'warm',
  desk: 'work',
  bossdesk: 'work',
  pcdesk: 'pc',
  coffee: 'coffee',
  watercooler: 'water',
  printer: 'print',
  vending: 'snack',
  serverrack: 'glyph',
  metalshelf: 'box',
  crates: 'box',
  boxes: 'box',
  shelf_groc: 'cart',
  shelf_house: 'cart',
  shelf_snack: 'snack',
  cooler: 'can',
  newsrack: 'paper',
  mailbox: 'mail',
  trashcan: 'trash',
  dumpster: 'trash',
  trashbags: 'trash',
  bed: 'bed',
  parkedcar: 'car',
  birdcage: 'heart',
  doorknock: 'knock',
  bucket: 'mop',
  tree: 'weather',
  streetlamp: 'spark',
  parklamp: 'spark',
  alleylamp: 'spark',
  cart: 'cart',
  wardrobe: 'box',
  bookshelf: 'box',
  plant: 'weather',
};
function placeName(x, z) {
  const r = roomAt(x, z);
  if (r) return r.name;
  if (z >= 13 && z <= 18) return 'Main street';
  if (x >= 26 && x <= 29 && z <= 12) return 'The alley';
  if (z >= 19 && x >= 24) return 'The park';
  return 'Outside';
}
// what the lens points at, from a click
function shotTarget(p) {
  if (!p) return null;
  if (p.char)
    return p.char.isPlayer ? null : { char: p.char, label: hidesName(p.char) ? '???' : p.char.short, icon: 'people' };
  if (p.item) return { item: p.item, x: p.item.x, z: p.item.z, label: itemName(p.item), icon: 'bag' };
  if (p.obj) return { obj: p.obj, x: p.obj.cx, z: p.obj.cz, label: p.obj.name, icon: OBJ_ICON[p.obj.type] || 'dots' };
  if (p.tile) return { x: p.gx, z: p.gz, label: 'Nothing much', icon: null };
  return null;
}
function photoAct(tg) {
  const pos = () => (tg.char ? [tg.char.x, tg.char.z] : [tg.x, tg.z]);
  return mkAct({
    kind: 'wait',
    label: 'Photo',
    icon: 'camera',
    dur: 1.5,
    anim: 'photo',
    check: () => {
      const [x, z] = pos();
      if (Math.hypot(x - PLAYER.x, z - PLAYER.z) > PHOTO_RANGE) return 'Too far';
      if (tg.char ? !(tg.char.onMap && tg.char.shown > 0.5) : visAt(x, z) < 0.35) return 'No clear shot';
      return null;
    },
    onStart: (c) => {
      const [x, z] = pos();
      c.tdir = Math.atan2(x - c.x, z - c.z);
      takePhoto(tg);
    },
  });
}
// F: the photo, straight away. The camera takes in a wide wedge in front of you, as far as you can see clearly; no aiming.
function inPhotoCone(x, z) {
  const P = PLAYER,
    dx = x - P.x,
    dz = z - P.z,
    d = Math.hypot(dx, dz);
  if (d > CTRL.photoRange || visAt(x, z) <= 0.35) return false;
  if (d < 0.6) return true;
  return (
    Math.abs(angDiff(P.tdir, Math.atan2(dx, dz))) <= (CTRL.photoHalf * Math.PI) / 180 &&
    losClear(Math.floor(P.x), Math.floor(P.z), Math.floor(x), Math.floor(z))
  );
}
function photoCone() {
  const P = PLAYER;
  // the subject that names the print: whoever's nearest the middle of the frame
  let best = null,
    bs = 1e9;
  for (const n of CHARS) {
    if (n.isPlayer || !n.onMap || n.shown < 0.5 || !inPhotoCone(n.x, n.z)) continue;
    const sc = Math.hypot(n.x - P.x, n.z - P.z) * 0.3 + Math.abs(angDiff(P.tdir, Math.atan2(n.x - P.x, n.z - P.z)));
    if (sc < bs) {
      bs = sc;
      best = n;
    }
  }
  const ax = P.x + Math.sin(P.tdir) * 3,
    az = P.z + Math.cos(P.tdir) * 3;
  return { char: best, x: ax, z: az, label: placeName(ax, az), icon: null, inFrame: inPhotoCone };
}
function playerPhoto() {
  const P = PLAYER;
  if (!G || !G.started || G.over || !P.onMap || UI.caseOpen || UI.scene || ARREST.on) return;
  const cur = P.queue[0];
  if (cur && (cur.interruptible === false || cur.photo)) return;
  if (shaky()) return shakenNote('Your hands shake too much for a photo'); // under 40: you can still take things
  cancelAll(P);
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: 'Photo',
      icon: 'camera',
      dur: 1.5,
      anim: 'photo',
      photo: true,
      interruptible: false,
      onStart: () => closeMenu(),
      onTick: (c, a) => {
        if (!a.shot && a.t >= 0.3) {
          a.shot = true;
          takePhoto(photoCone());
        }
      },
    }),
  ); // up to the eye, then the shutter
}
function addPrint(o) {
  const pr = Object.assign({ id: ++G.printId, at: G.t, pin: null }, o);
  G.prints.push(pr);
  while (G.prints.length > 30) {
    const i = G.prints.findIndex((p) => !p.pin);
    if (i < 0) break;
    G.prints.splice(i, 1);
  }
  return pr;
}
// the frame check: everything visible within a couple of tiles of the aim point is in the picture
function takePhoto(tg) {
  ui.flash();
  audio.blip('shutter'); // the film never runs out
  const ax = tg.char ? tg.char.x : tg.x,
    az = tg.char ? tg.char.z : tg.z;
  if (G.t < (G.shakenUntil || 0) && G.t >= (G.shakenFrom || 0) && chance(0.35)) {
    // shaken hands
    const pr = addPrint({ kind: 'blur', what: 'Blurred', where: placeName(ax, az) });
    ui.card({ title: 'Blurred', img: printImage(pr), stamp: 'BLURRED' });
    return photoSeen(tg.char);
  }
  const inFrame = tg.inFrame || ((x, z) => Math.hypot(x - ax, z - az) < 2.4 && visAt(x, z) > 0.35);
  const chars = CHARS.filter((n) => !n.isPlayer && n.onMap && (n === tg.char || (n.shown > 0.5 && inFrame(n.x, n.z))));
  const items = G.items.filter((it) => it.kind !== 'puddle' && (it === tg.item || inFrame(it.x, it.z)));
  let filed = false;
  const got = new Set(); // who already has a proof out of this frame
  // THEM in a tell: a weak proof, or a slipping face (medium). Mid-change it's a medium with no name on it.
  for (const n of chars) {
    const tl = n.tell;
    if (!n.isThem || n.surrendered || !tl || tl.ritual || tl.unmask || tl.type === 'glare' || tl.photo) continue;
    tl.photo = true;
    filed = true;
    got.add(n);
    if (tl.type === 'true' && tl.t >= TF_CHANGE + 0.2) {
      // a true form after the change: a fuzzy Body card with no face to it. Whose it was is yours to say.
      if (!G.factionKnown) revealFaction();
      const known = n.exposed,
        where = placeName(n.x, n.z);
      setTimeout(() => {
        if (tl) tl.photo = false;
      }, 4000);
      if (known || (n.trueForm && n.trueForm.proofShot)) {
        ui.note('camera', 'Another shot of it · nothing new', '');
        continue;
      }
      if (n.trueForm) n.trueForm.proofShot = true;
      const p = addProof({
        frame: 'body',
        q: 'fuzzy',
        true: n.id,
        what: 'A true form',
        where,
        rec: { type: 'true', how: 'photo', at: G.t, t: n.animT, pose: 'stand' },
        recWho: n.id,
      });
      proofCard(p);
      continue;
    }
    n.pinnedDay = dayNo();
    n.shotAt = G.t;
    awardTell(n);
    bookPhoto(n);
    addDanger(n, 30);
  }
  // the tenth part, close up: odd, never more than odd
  for (const n of chars)
    if (!got.has(n) && n.trace && photoTrace(n)) {
      filed = true;
      got.add(n);
    }
  // one of THEM in the middle of THEIR business (strong) or of something odd (weak)
  for (const n of chars)
    if (n.odd && !n.odd.photo && G.t <= n.odd.until) {
      photoOdd(n);
      filed = true;
      got.add(n);
    }
  // the gathering at night: strong, every face in the ring
  const ring = chars.filter((n) => n.isThem && n.tell && n.tell.ritual && !n.tell.ringShot);
  if (ring.length) {
    const rec = {
      type: FACTIONS[G.faction].ritual,
      ritual: true,
      how: 'photo',
      at: G.t,
      t: ring[0].animT,
      pose: 'stand',
    };
    if (!G.factionKnown) revealFaction();
    G.ritualBroke = dayNo();
    ring.forEach((x, i) => {
      x.tell.ringShot = true;
      got.add(x);
      const p = addProof({
        frame: 'habit',
        q: 'clear',
        true: x.id,
        auto: true,
        what: x.short + ' at THEIR gathering',
        where: placeName(x.x, x.z),
        rec: Object.assign({}, rec, { at: G.t + i * 0.001 }),
        recWho: x.id,
      });
      addNote(x, 'Photographed at the gathering, at night.', { by: 'you' });
      if (i < 2) proofCard(p);
      bookNight(x);
      addDanger(x, 15);
    });
    audio.sting('onto');
    filed = true;
  }
  // a stash you opened up; something THEY left behind
  for (const it of items) {
    if (it.kind === 'stash') {
      if (photoStash(it)) filed = true;
      continue;
    }
    if (it.kind === 'opened' || it.kind === 'trap') continue;
    if (it.by && !it.photo) {
      it.photo = true;
      photoItem(it);
      filed = true;
    }
  }
  // anyone else in the frame, standing by one of THEIR marks
  const nm = got.size;
  photoMarks(chars, got);
  if (got.size > nm) filed = true;
  // a normal person's private secret: the print shows exactly what they were up to. That frame is clean.
  for (const n of chars)
    if (n.secret && !n.secret.done && !n.isThem) {
      n.secret.done = true;
      secretSeen(n, n.secret.spot);
      filed = true;
    }
  // somebody slipping off at their hour, and nothing odd on the film: Habit is searched. It tells you nothing.
  for (const n of chars) {
    const cur = n.queue[0];
    if (!got.has(n) && cur && cur.habit && !n.secret && !n.def.never && dashFrame(n, 'habit')) {
      ui.note('clock', n.short + ' · nothing at their hour', '');
      got.add(n);
      filed = true;
    }
  }
  // a face up close and nothing in it: that frame is searched. It tells you nothing.
  const subj = tg.char;
  if (
    subj &&
    !got.has(subj) &&
    !subj.def.never &&
    !subj.def.stranger &&
    Math.hypot(subj.x - PLAYER.x, subj.z - PLAYER.z) <= PHOTO_FACE &&
    dashFrame(subj, 'body')
  ) {
    ui.note('face', subj.short + ' · nothing in the face', '');
    filed = true;
  }
  if (!filed) {
    // the camera never lies: a vision comes out empty
    const vision = (SHADE.on && SHADE.c && inFrame(SHADE.c.x, SHADE.c.z)) || chars.some((n) => n.vis && !n.tell);
    if (vision) {
      const pr = addPrint({ kind: 'nothing', what: 'Nothing', where: placeName(ax, az) });
      ui.card({ title: 'Nothing', img: printImage(pr), stamp: 'NOTHING' });
    } else {
      const who = tg.char || chars[0] || null;
      const pr = addPrint({
        kind: 'plain',
        who: who ? who.id : null,
        what: who ? who.short : tg.label,
        icon: who ? 'people' : tg.icon,
        where: placeName(ax, az),
        t: who ? who.animT : 0,
      });
      ui.note('camera', pr.what + ' · ' + pr.where, '');
    }
  }
  photoSeen(tg.char);
}
// something THEY left lying about: in their own home it's a clear Home card. Anywhere else it's fuzzy, and it's
// whoever was seen in that room lately, or nobody's yet.
function itemHome(it) {
  const r = roomAt(it.x, it.z);
  return !!(r && it.by && (r.house === it.by || (it.by === 'agnes' && r.agnes)));
}
function itemSeenWith(it) {
  const n = NPC[it.by];
  return !!(n && it.room && n.seenRoom[it.room] && G.t - n.seenRoom[it.room] < 180);
}
function photoItem(it) {
  const n = NPC[it.by],
    home = itemHome(it),
    saw = itemSeenWith(it);
  if (!G.factionKnown) revealFaction();
  const where = placeName(it.x, it.z);
  const p = addProof({
    frame: 'home',
    q: home ? 'clear' : 'fuzzy',
    true: it.by,
    auto: home || saw,
    what: ITEM_NAMES[it.kind] + (home ? ', in their own home' : ''),
    where,
    pr: { kind: 'item', what: ITEM_NAMES[it.kind], icon: FACTIONS[G.faction].icon },
  });
  if (p.pin && n)
    addNote(n, 'Photo: ' + ITEM_NAMES[it.kind].toLowerCase() + ', ' + where.toLowerCase() + '.', { by: 'you' });
  else {
    G.leads.push(ITEM_NAMES[it.kind] + ' — whose?');
    if (G.leads.length > 6) G.leads.shift();
  }
  proofCard(p);
  audio.sting('onto');
}
// being seen with the camera. The film is free; the looks aren't. Pictures of things and places are nobody's business.
// A lens in someone's face is: the one you shot minds (a lot up close, a little from across the room, not at all if they
// never saw you do it), and anyone watching minds that you're pointing it at a person. At night the flash turns every head.
const PHOTO_FACE = 4.5;
function photoSeen(subj) {
  const P = PLAYER,
    h = hourF(),
    night = h >= 19.5 || h < 6.5;
  const face = !!subj && Math.hypot(subj.x - P.x, subj.z - P.z) <= PHOTO_FACE;
  for (const n of CHARS) {
    if (n.isPlayer || !n.onMap || n.def.stranger || n.exposed || asleep(n)) continue;
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    const flash = night && d <= 12 && losClear(Math.floor(n.x), Math.floor(n.z), Math.floor(P.x), Math.floor(P.z));
    const sees = npcSeesPlayer(n, PHOTO_RANGE) || flash;
    if (!sees) continue;
    if (n === subj) {
      if (face) n.faceShot = G.t; // a lens in their face: they'll bring it up if you ever call them out
      addSus(n, face ? 10 : 4);
      ui.bubble(n, face ? 'exclaim' : 'question', 'speech', 2);
      if (
        n.isThem &&
        !n.trueForm &&
        G.aware >= 70 &&
        (G.traits[n.id] || {}).temper === 'careful' &&
        bystanders(PLAYER, 8).length > 1
      ) {
        n.reactAt = G.t;
        ridicule(n);
      } else if (n.shotAt !== G.t) addDanger(n, face ? 15 : 8);
    } else if (subj || flash) {
      addSus(n, subj ? (face ? 5 : 2) : 2);
      if (d < 7) ui.bubble(n, 'question', 'speech', 1.8);
    }
  }
}
function toggleCam(force) {
  const on = force != null ? force : !UI.camMode;
  UI.camMode = on;
  if (on) ui.note('camera', 'Next click · photo', '');
}
