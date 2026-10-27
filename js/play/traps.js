//@ play/traps — Traps
//@ Defines: setTrapAct, liftTrap, trapItem, springTrap, trapTick, baitPull, caution
//@ Uses:    sim/core, ui/interface, sim/actions, play/items, core/util, town/suspicion, audio/sound, town/echoes, them/tells, them/proofs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── traps: steel jaws from Pell's. Whatever steps in stays put, for a while.
// Bait it with something THEY lost and its owner comes looking. Unbaited, it takes whoever walks by.
function setTrapAct() {
  return mkAct({
    kind: 'wait',
    label: 'Set trap',
    icon: 'trap',
    dur: 4,
    anim: 'dig',
    check: () => {
      const x = Math.floor(PLAYER.x),
        z = Math.floor(PLAYER.z);
      if (G.inv.trap <= 0) return 'No trap';
      if (G.traps.some((t) => t.x === x && t.z === z)) return 'Already one here';
      if (doorAt[I(x, z)] >= 0) return 'Not in a doorway';
      if (!walkable(x, z)) return 'Not here';
      return null;
    },
    onTick: (c, a) => {
      for (const n of CHARS)
        if (
          !n.isPlayer &&
          n.onMap &&
          !asleep(n) &&
          !n.def.stranger &&
          npcSeesPlayer(n, 8) &&
          !(a.seen || (a.seen = {}))[n.id]
        ) {
          a.seen[n.id] = 1;
          addSus(n, 8);
          ui.bubble(n, 'question', 'speech', 2);
        }
    },
    onEnd: (c, a, ok) => {
      if (!ok) return;
      G.inv.trap--;
      const x = Math.floor(c.x),
        z = Math.floor(c.z),
        bait = takeBait();
      const tr = {
        id: (G.trapId = (G.trapId || 0) + 1),
        x,
        z,
        bait: bait ? bait.true : null,
        baitWhat: bait ? bait.what : null,
        baitProof: bait,
        seen: !!(a.seen && Object.keys(a.seen).length),
        at: G.t,
      };
      G.traps.push(tr);
      addItem({ kind: 'trap', trap: tr.id, x: x + 0.5, z: z + 0.5, rot: rand(0, TAU), bait: !!bait });
      ui.note('trap', bait ? 'Trap set · baited with ' + bait.what.toLowerCase() : 'Trap set', '');
      audio.blip('click');
    },
  });
}
function liftTrap(it) {
  const tr = !it.shut && G.traps.find((t) => t.id === it.trap);
  if (it.shut && CHARS.some((c) => c.trapped && Math.hypot(c.x - it.x, c.z - it.z) < 0.6))
    return ui.note('trap', 'Not with that still in it', 'bad');
  removeItem(it);
  if (tr) {
    G.traps.splice(G.traps.indexOf(tr), 1);
    if (tr.baitProof) {
      G.proofs.push(tr.baitProof);
      refreshEvidence();
    }
  }
  G.inv.trap++;
}
function trapItem(tr) {
  return G.items.find((it) => it.kind === 'trap' && it.trap === tr.id);
}
function springTrap(tr, c) {
  const it = trapItem(tr);
  if (it) removeItem(it);
  G.traps.splice(G.traps.indexOf(tr), 1);
  addItem({ kind: 'trap', shut: true, x: tr.x + 0.5, z: tr.z + 0.5, rot: it ? it.rot : 0 }); // jaws shut; pick it up and set it again
  const P = PLAYER,
    d = Math.hypot(P.x - c.x, P.z - c.z),
    where = placeName(c.x, c.z);
  if (P.onMap && d < 24) {
    notifyPing(c.x, c.z);
    ui.note('trap', 'A trap snapped shut · ' + placeIn(where), 'onto');
  }
  audio.sting('caught');
  if (c.isThem && !c.slain && (c.trueForm || mayShed(c, 'trap'))) {
    // it changes in the jaws, and it can't go anywhere
    hardReset(c);
    c.fleeing = null;
    c.hideUntil = 0;
    c.engaged = null;
    if (!c.trueForm) trueForm(c, 'trap');
    if (c.trueForm) {
      const tf = c.trueForm;
      tf.mode = 'trapped';
      tf.until = G.t + 45;
      tf.trap = true;
      c.trapped = true;
      c.path = null;
      c.moving = false;
    }
    echo('trap', { x: c.x, z: c.z, who: null });
    return;
  }
  // too early, too light or out in the street: one of THEM takes it like anybody would, and gives nothing away
  // somebody's leg: not THEM
  hardReset(c);
  c.fleeing = null;
  ui.say(c, pick(['AAAH! My LEG!', 'Who PUTS these here?!', 'Help! Somebody!']), 3.5);
  ui.bubble(c, 'exclaim', 'speech', 3);
  if (!c.def.stranger) {
    c.limpDay = dayNo(G.t + 60);
    c.rel -= 15;
    addSus(c, 10);
  }
  enqueue(
    c,
    waitAct({
      label: '…',
      dur: 6,
      anim: 'shake',
      interruptible: false,
      onStart: (cc) => (cc.pose = 'floor'),
      onEnd: (cc) => {
        cc.pose = 'stand';
        if (cc.def.stranger) leaveMap(cc);
      },
    }),
  );
  echo('trap', { x: c.x, z: c.z, who: c.def.stranger ? null : c.id, victim: true });
  if (tr.seen || c.def.officer) caution(c, 'trap');
}
function trapTick() {
  if (!G.traps.length) return;
  for (const c of CHARS) {
    if (c.isPlayer || !c.onMap || c.trapped || c.under || c.pose === 'lie') {
      c.lx = c.x;
      c.lz = c.z;
      continue;
    }
    const lx = c.lx != null ? c.lx : c.x,
      lz = c.lz != null ? c.lz : c.z;
    for (const tr of G.traps) {
      const tx = tr.x + 0.5,
        tz = tr.z + 0.5,
        vx = c.x - lx,
        vz = c.z - lz,
        L = vx * vx + vz * vz;
      const k = L > 1e-6 ? clamp(((tx - lx) * vx + (tz - lz) * vz) / L, 0, 1) : 1;
      if (Math.hypot(lx + vx * k - tx, lz + vz * k - tz) < 0.42) {
        c.x = tx;
        c.z = tz;
        springTrap(tr, c);
        break;
      }
    }
    c.lx = c.x;
    c.lz = c.z;
  }
}
// THEY come for what you took, after dark (or any time, once everyone knows)
function baitPull(n) {
  if (!n.isThem || n.slain || n.baitDay === dayNo() || !G.traps.length) return false;
  const tr = G.traps.find((t) => t.bait === n.id);
  if (!tr) return false;
  const h = hourF();
  if (!n.exposed && !(h >= 19.5 || h < 1)) return false;
  n.baitDay = dayNo();
  enqueue(n, [goAct([tr.x, tr.z], { label: '…' })]);
  return true;
}
// three police cautions and you're inside: a beating, a trap someone saw you set, a door you kicked in
function caution(n, why) {
  const id = (n && n.id) || why;
  if (!G.assaulted.includes(id)) G.assaulted.push(id);
  const k = G.assaulted.length;
  setTimeout(() => {
    ui.note('badge', 'Police caution · ' + k + '/3', 'bad');
    audio.blip('ring');
  }, 900);
  if (k >= 3)
    setTimeout(() => {
      if (!G.over) gameOver('prison');
    }, 2800);
}
