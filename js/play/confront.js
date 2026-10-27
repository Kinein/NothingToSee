//@ play/confront — Confronting with proof
//@ Defines: FBI_DELAY, confrontRoom, openConfront, closeConfront, resolveConfront, GIVE_UP, surrender, fbiTake, SOC, observeAct
//@ Uses:    sim/core, ui/interface, core/util, town/suspicion, them/proofs, town/echoes, player/needs, town/cast, sim/actions, gfx/portraits, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── confronting: "You're one of THEM." You lay down the best four proofs you hold on them, and they're gone.
// One STRONG proof, or four medium ones, in front of people who'd believe you: it drops the act and gives up.
// Less than that: it might still crack, and then it fights or runs. Nobody listening, or only THEIRS: it costs THEM
// nothing to change right there and come for you.
const FBI_DELAY = 25; // game minutes from giving up to the grey cars
const heedsYou = (w) => !w.isThem && !bought(w) && w.id !== 'lenny' && !w.trueForm && !w.fleeing; // someone whose word counts
function confrontRoom(n) {
  const ear = earshot(n).filter((w) => w !== n);
  return { ear, aud: ear.filter(heedsYou), saw: sawItChange(n, ear) };
}
function openConfront(n) {
  if (!n || !n.onMap || UI.cf || G.over) return;
  if (tooShaken()) return shakenNote();
  closeMenu();
  const ps = topProofs(n),
    room = confrontRoom(n),
    el = $('#confront');
  UI.cf = { n, ids: ps.map((p) => p.id), prev: G.speed };
  G.speed = 0;
  el.querySelector('.cf-who img').src = getPortrait(n);
  el.querySelector('.cf-who b').textContent = n.name;
  el.querySelector('.cf-who span').textContent = ps.length
    ? 'You lay down your best ' + (ps.length === 1 ? 'proof' : ps.length + ' proofs') + ' on ' + n.short + '.'
    : 'You have nothing on ' + n.short + '. Just words.';
  const box = el.querySelector('.cf-proofs');
  box.innerHTML = '';
  const card = (img, stamp, cap, strong, cls) => {
    const c = document.createElement('figure');
    c.className = 'cfp' + (strong ? ' strong' : '') + (cls ? ' ' + cls : '');
    c.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(1) + 'deg');
    c.innerHTML = '<div><img alt=""><span class="stamp"></span></div><figcaption></figcaption>';
    c.querySelector('img').src = img;
    c.querySelector('.stamp').textContent = stamp;
    c.querySelector('figcaption').textContent = cap;
    box.appendChild(c);
  };
  for (const w of room.saw.slice(0, 1)) card(getPortrait(w), 'STRONG', w.short + ' saw it change', true, 'wit');
  for (const p of ps) card(proofImage(p), proofLabel(p), p.what, proofShownStrong(p));
  for (let k = ps.length; k < 4; k++) {
    const c = document.createElement('figure');
    c.className = 'cfp empty';
    c.innerHTML = '<div></div><figcaption>—</figcaption>';
    box.appendChild(c);
  }
  const names = room.ear
    .filter((w) => !w.def.stranger || w.def.officer)
    .map((w) => w.short)
    .concat(room.ear.some((w) => w.def.stranger && !w.def.officer) ? ['a stranger'] : []);
  el.querySelector('.cf-room').innerHTML = svgIcon(room.ear.length ? 'people' : 'eye') + '<span></span>';
  el.querySelector('.cf-room span').textContent = room.ear.length
    ? 'Listening: ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) : '')
    : 'Nobody else here. Alone, THEY don’t need to pretend.';
  el.querySelector('.cf-room').classList.toggle('alone', !room.ear.length);
  el.querySelector('.cf-warn').textContent = ps.length
    ? 'Whatever happens, these go to them. You won’t get them back.'
    : 'Without proof it only makes you look mad.';
  el.hidden = false;
  audio.blip('click');
}
function closeConfront(go) {
  const cf = UI.cf;
  if (!cf) return;
  UI.cf = null;
  $('#confront').hidden = true;
  $('#tip').hidden = true;
  G.speed = cf.prev || 1;
  if (!go || G.over) return;
  const a = talkAct(cf.n, 'confront');
  a.proofIds = cf.ids;
  cancelAll(PLAYER);
  enqueue(PLAYER, a);
}
function resolveConfront(n, ids) {
  n.confronted = true;
  addStress(3);
  const room = confrontRoom(n),
    ear = room.ear;
  if (PLAYER.needs.stress >= 80 && chance(0.4)) {
    // a rant: you never get as far as the photos
    for (const b of ear) addSus(b, 15);
    ui.say(PLAYER, pick(['Look at them! LOOK!', 'Why won’t anyone LISTEN?', 'It’s not a person!']), 3.5);
    for (const b of ear) ui.bubble(b, 'question', 'speech', 2.5);
    return;
  }
  const ps = (ids || []).map((id) => G.proofs.find((p) => p.id === id)).filter(Boolean);
  for (const p of ps) G.proofs.splice(G.proofs.indexOf(p), 1); // laid down, and gone
  refreshEvidence();
  let S = room.saw.length ? 1 : 0,
    M = 0,
    Wk = 0;
  for (const p of ps) {
    const c = proofCat(p, n);
    if (c === 'strong') S++;
    else if (c === 'medium') M++;
    else if (c === 'weak') Wk++;
  }
  if (room.saw.length) {
    const w = room.saw[0];
    ui.say(
      w,
      pick([
        'I saw it. I SAW its face come off.',
        'It’s true. I watched it change.',
        'I didn’t want to believe it either.',
      ]),
      3.5,
    );
  }
  if (!n.isThem) {
    // nothing to find: it only makes you look mad
    addSus(n, 25);
    for (const b of ear) addSus(b, 8);
    ui.say(
      n,
      pick(
        ps.length
          ? [
              'That’s… me buying fish. What is this?',
              'These prove nothing. Are you all right?',
              'You’ve been following me?',
            ]
          : ['You’re crazy.', 'Ha. Good one.', 'Are you feeling all right?', 'Get some sleep, will you?'],
      ),
      3.5,
    );
    ui.bubble(n, ps.length ? 'frown' : 'laugh', 'speech', 2);
    n.rel -= ps.length ? 10 : 4;
    addStress(ps.length ? 5 : 3);
    return;
  }
  const enough = S > 0 || M >= 4;
  n.cfOk = enough ? G.t : 0; // called out with enough proof: the one thing that can make it change by daylight
  if (!room.aud.length) {
    // no social weight: alone, or only THEIRS listening. It meant nothing, and now THEY know.
    setTimeout(
      () =>
        ui.note(
          'confront',
          ear.length ? 'Nobody who’d believe you heard it. It meant nothing.' : 'Nobody heard it. It meant nothing.',
          'bad',
        ),
      600,
    );
    book(n).night++;
    if (chance(enough ? 1 : clamp(0.35 + 0.18 * M + 0.08 * Wk + n.danger / 300, 0.2, 0.95)) && mayShed(n, 'confront')) {
      ui.say(n, pick(['Nobody here but us.', 'You should have brought friends.', 'Shh. Nobody’s coming.']), 2.6);
      trueForm(n, 'confront', 'attack');
      if (n.trueForm) {
        n.trueForm.cornered = true;
        n.trueForm.long = 25;
      }
    } else {
      ui.say(
        n,
        pick(['Say that again when we’re alone. Oh. We are.', 'And who would you tell?', 'Sleep well tonight.']),
        3.2,
      );
      addDanger(n, 20);
      addStress(4);
    }
    return;
  }
  if (enough) return surrender(n, 'confront');
  // not enough, but people are watching: it may still crack. Then it fights you or runs, and you'd better be quicker.
  const p = clamp(0.12 + 0.2 * M + 0.08 * Wk + (pinned(n) ? 0.1 : 0) + n.danger / 400, 0.05, 0.9);
  if (chance(p) && mayShed(n, 'confront')) {
    // not enough proof: it only cracks in the dark, or late in THEIR week
    const fight = temper(n) === 'aggressive' || G.aware >= 50 || chance(0.45);
    ui.say(n, pick(['FINE.', 'You want to SEE?', 'Enough of this face.']), 2.4);
    trueForm(n, 'confront', fight ? 'attack' : 'flee');
    if (n.trueForm) {
      n.trueForm.public = true;
      n.trueForm.cornered = fight;
      n.trueForm.long = 30;
    }
    for (const w of room.aud) ui.bubble(w, 'exclaim', 'speech', 3);
    echo('unmask', { x: n.x, z: n.z, who: n.id, seen: room.aud.map((w) => w.id) });
    return;
  }
  addSus(n, 25);
  protectAfter(n);
  ridicule(n);
}
// it drops the act for good: true form, on its knees, and the FBI on the way
const GIVE_UP = {
  lizards: ['Fine. FINE. Call your men.', 'We were so CLOSE.', 'You have no idea what’s under this town.'],
  aliens: ['Take me, then. Take me to your… whoever you have.', 'The signal is already sent.', 'We were so close.'],
  zombies: ['…hhhh. Fine.', 'It was so warm in there.', 'Not so loud. We give up.'],
};
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
  if (UI.fight && UI.fight.n === n) {
    UI.fight = null;
    $('#fight').hidden = true;
  }
  for (let i = BOLTS.length - 1; i >= 0; i--) if (BOLTS[i].by === n) BOLTS.splice(i, 1);
  n.fleeing = null;
  n.trapped = false;
  n.path = null;
  n.moving = false;
  n.hideUntil = 0;
  n.engaged = null;
  if (n.tell && n.tell.t >= TF_CHANGE) hardReset(n);
  n.surrendered = { at: G.t, takeAt: G.t + FBI_DELAY + (n.tell && n.tell.t < TF_CHANGE ? TF_CHANGE : 0), why };
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
  refreshEvidence();
  addStress(why === 'beaten' ? 3 : 2);
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
  G.proofs = G.proofs.filter((p) => p.true !== n.id || p.src === 'item');
  for (const o of them()) if (!o.slain) o.danger = Math.max(o.danger, dangerFloor(o));
  makePlan(n);
  bookRemoval();
  refreshEvidence();
  const rec = { type: 'true', how: 'witness', at: G.t, t: 3, pose: 'stand' };
  n.snaps.push(rec);
  if (n.snaps.length > 4) n.snaps.shift();
  addNote(n, 'Taken away by the FBI. It was ' + n.short + ' all along.', { by: 'you' });
  if (!seen) cardSoon({ char: n, stamp: 'TAKEN', before: 100, after: 100 }, () => snapImage(n, rec)); // watched it go: no card needed
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
const SOC = {
  chat: { label: 'Chat', icon: 'chat', dur: 10, fx: {}, res: (n, w) => resolveChat(n, w) },
  gossip: { label: 'Gossip', icon: 'ear', dur: 9, fx: {}, res: (n) => resolveGossip(n) },
  confront: { label: 'Confront', icon: 'confront', dur: 5, fx: {}, res: (n, w, a) => resolveConfront(n, a.proofIds) },
  lenny: {
    label: 'Theories',
    icon: 'ear',
    dur: 15,
    fx: { stress: 10 },
    res: (n) => {
      G.lennyToday++;
      n.rel += 3;
      lennyHint();
    },
  },
  feed: {
    label: 'Give meal',
    icon: 'gift',
    dur: 4,
    fx: { stress: -8 },
    res: (n) => {
      G.inv.meal--;
      relFx(n, 15);
      lennyHint();
    },
  },
  hello: {
    label: 'Hello',
    icon: 'wave',
    dur: 2,
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
    fx: { stress: 4 },
    check: () => (n.onMap && n.shown > 0.5 && Math.hypot(n.x - PLAYER.x, n.z - PLAYER.z) < 9 ? null : 'Can’t see them'),
    onTick: (c, a, dt) => {
      c.tdir = Math.atan2(n.x - c.x, n.z - c.z);
      if (!a.noticed && npcSeesPlayer(n, 7) && a.t > 2) {
        a.noticed = true;
        n.rel -= 3;
        addSus(n, 6);
        ui.bubble(n, 'question', 'speech', 2);
      }
      if (a.noticed) addDanger(n, 5 * dt);
      if (!n.onMap || n.shown < 0.3) a.cancel = true;
    },
    onEnd: (c, a, ok) => {
      if (!ok) return;
      n.watchDay = dayNo();
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
