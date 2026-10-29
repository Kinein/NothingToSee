//@ ui/menus — Interaction menus for objects, people, items
//@ Defines: opt, NO_SHAKE, menuForObject, fitMenu, objMenu, deskMenu, objStatus, menuForChar, askMenu, ITEM_NAMES, itemName, menuForItem, bagItem, ITEMS_INV
//@ Uses:    sim/core, play/verbs, ui/interface, sim/actions, core/util, gfx/portraits, play/stashes, player/needs, world/objects, town/cast, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── menus
function opt(label, icon, fn, dis) {
  return { label, icon, fn, dis };
}
const Q = (f) => () => enqueue(PLAYER, f());
// things you can't shake: the everyday ones stay one key press (your fridge, your desk)
const NO_SHAKE = new Set(['homeFridge', 'deskA2']);
const shakenFresh = (o) => o.data.shakenUntil > G.t;
function menuForObject(o) {
  let m = objMenu(o);
  if (shakeable(o) && !NO_SHAKE.has(o.id)) {
    // anything with insides: rummage first; something in there, and Open up takes the same slot
    if (!m) m = { title: o.name, icon: 'search', ops: [] };
    const owner = NPC[ownerOf(o)],
      here =
        owner &&
        owner.onMap &&
        owner.queue[0] &&
        owner.queue[0].stage === 'run' &&
        (owner.queue[0].obj === o || (o.id && DESK_OWNER[o.id] && owner.queue[0].obj === OBJ_BY_ID[owner.def.chair]));
    const busy = (o.users || []).some((u) => u && !u.isPlayer) ? 'In use' : here ? 'They’re here' : null;
    if (o.data.openUntil > G.t) m.ops.push(opt('Open', 'box', null, 'Already open'));
    else if (shakenFresh(o) && o.data.rattle > 0)
      m.ops.push(
        opt(
          'Open up',
          'box',
          Q(() => pryAct(o)),
          busy,
        ),
      );
    else
      m.ops.push(
        opt(
          'Rummage',
          'search',
          Q(() => rummageAct(o)),
          busy || (shakenFresh(o) ? 'Nothing in it' : null),
        ),
      );
    if (shakenFresh(o)) m.sub = o.data.rattle > 0 ? 'Something in there' : 'Nothing in it';
  }
  return fitMenu(m);
}
// a menu never holds more than the four directions
function fitMenu(m) {
  if (m && m.ops && m.ops.length > 4) {
    console.warn(
      'menu over 4:',
      m.title,
      m.ops.map((x) => x.label),
    );
    m.ops.length = 4;
  }
  return m;
}
function objMenu(o) {
  const t = o.type,
    ops = [];
  switch (t) {
    case 'bed':
      if (o.id !== 'homeBed') return null;
      ops.push(
        opt(
          'Sleep',
          'moon',
          Q(() => sleepAct(o)),
        ),
      ); // the alarm sets itself: work, or THEIR gathering if you know about it
      break;
    case 'toilet':
      ops.push(
        opt(
          'Use',
          'toilet',
          Q(() => toiletAct(o)),
        ),
      );
      break;
    case 'shower':
      ops.push(
        opt(
          'Shower',
          'shower',
          Q(() => showerAct(o)),
        ),
      );
      break;
    case 'sink':
      ops.push(
        opt(
          'Mirror',
          'mirror',
          Q(() =>
            useP(o, 'Mirror', 'mirror', {
              dur: 2,
              anim: 'stare',
              onEnd: (c, a, ok) => {
                if (!ok) return;
                if (c.needs.stress > 65) {
                  addStress(6);
                  ui.note('mirror', 'Your reflection lagged', 'bad');
                  audio.sting('whisper');
                } else ui.float(c, 'Tired', '');
              },
            }),
          ),
        ),
      );
      break;
    case 'fridge':
      if (o.id !== 'homeFridge') return null;
      ops.push(
        opt(
          'Eat',
          'food',
          Q(() => snackAct(o)),
        ),
      );
      break;
    case 'stove':
      if (o.x !== 5) return null;
      ops.push(opt('Cook', 'cook', () => enqueue(PLAYER, cookChain())));
      break;
    case 'fridge_office':
      ops.push(
        opt(
          'Steal lunch',
          'food',
          Q(() =>
            chain([
              useP(o, 'Steal lunch', 'food', {
                dur: 1,
                need: 'hunger',
                onStart: () => {
                  const w = suspects().filter(
                    (n) => n.onMap && (roomAt(n.x, n.z) === roomByKey('break') || npcSeesPlayer(n, 7)),
                  );
                  if (w.length) {
                    const n = pick(w);
                    addSus(n, 5);
                    ui.say(n, 'My soup!', 2.5);
                  }
                },
              }),
              seatedEat('Lunch', 'food', 6, { fx: { hunger: (35 * 60) / 6 } }),
            ]),
          ),
        ),
      );
      ops.push(
        opt(
          'Peek',
          'eye',
          Q(() =>
            useP(o, 'Peek', 'eye', {
              dur: 2,
              onEnd: (c, a, ok) => {
                if (!ok) return;
                const T = {
                  aliens: 'A jar of iron filings. “MINE”',
                  lizards: 'Live crickets. “SNACK”',
                  zombies: 'Raw liver. “MINE”',
                };
                ui.note('fridge', chance(0.5) ? T[clueFaction()] : 'Yogurts. Cake.', '');
              },
            }),
          ),
        ),
      );
      break;
    case 'phone':
      if (G.phoneRing)
        ops.push(
          opt(
            'Answer',
            'phone',
            Q(() =>
              useP(o, 'Answer', 'phone', {
                dur: 3,
                anim: 'phone',
                onEnd: (c, a, ok) => {
                  if (!ok) return;
                  const wrong = G.phoneRing && G.phoneRing.wrong;
                  G.phoneRing = null;
                  addStress(12);
                  ui.note(
                    'phone',
                    wrong
                      ? pick([
                          'Your own voice, asking for you.',
                          'Mom’s voice. Mom never calls this late.',
                          'Someone reading out your day.',
                        ])
                      : 'Breathing. Then your voice.',
                    'bad',
                  );
                  audio.sting('whisper');
                },
              }),
            ),
          ),
        );
      ops.push(
        opt(
          'Call Mom',
          'phone',
          Q(() => momAct(o)),
        ),
      );
      break;
    case 'tv':
      ops.push(
        opt(
          'Watch TV',
          'tv',
          Q(() => tvAct()),
        ),
      );
      break;
    case 'sofa':
      ops.push(
        opt(
          'Watch TV',
          'tv',
          Q(() => tvAct()),
        ),
      );
      ops.push(
        opt(
          'Nap',
          'bed',
          Q(() => useP(o, 'Nap', 'bed', { dur: 50, anim: 'sleep', need: 'energy', fx: { energy: 14, stress: -3 } })),
        ),
      );
      break;
    case 'chair':
    case 'armchair':
    case 'chair_office':
      if (o.id === 'chairA2') return deskMenu(o);
      if (o.id === 'pcChair') return objMenu(OBJ_BY_ID.pc);
      return null; // nobody sits down just to sit: seats come with working, eating, or company
    case 'bench':
      return null;
    case 'radiator':
      if (o.id === 'agnesRad') return null;
      ops.push(
        opt(
          'Warm up',
          'warm',
          Q(() => warmAct(o)),
        ),
      );
      break;
    case 'desk':
    case 'bossdesk': {
      if (o.id === 'deskA2') return deskMenu(o);
      const owner = NPC[DESK_OWNER[o.id]];
      return {
        title: owner ? owner.short + '’s desk' : 'Desk',
        img: owner ? getPortrait(owner) : null,
        icon: 'work',
        ops,
      };
    }
    case 'coffee':
      ops.push(
        opt(
          'Coffee',
          'coffee',
          Q(() => coffeeAct(o)),
        ),
      );
      break;
    case 'vending':
      ops.push(
        opt(
          'Snack',
          'snack',
          Q(() => vendAct(o)),
        ),
      );
      break;
    case 'watercooler':
      ops.push(
        opt(
          'Water',
          'water',
          Q(() => useP(o, 'Water', 'water', { dur: 3, anim: 'drink', fx: { bladder: -100, stress: -20 } })),
        ),
      );
      break;
    case 'printer':
      ops.push(
        opt(
          'Check',
          'print',
          Q(() =>
            useP(o, 'Printer', 'print', {
              dur: 2,
              onEnd: (c, a, ok) => {
                if (ok)
                  ui.note(
                    'print',
                    G.aware >= 40 && chance(0.5)
                      ? 'A photo of you, asleep'
                      : pick(['Pages of the letter M', 'Out of toner', 'A map with no names']),
                    G.aware >= 40 ? 'bad' : '',
                  );
              },
            }),
          ),
        ),
      );
      break;
    case 'serverrack':
      ops.push(
        opt(
          'Listen',
          'ear',
          Q(() =>
            useP(o, 'Listen', 'ear', {
              dur: 4,
              anim: 'stare',
              onEnd: (c, a, ok) => {
                if (!ok) return;
                if (chance(G.faction === 'aliens' ? 0.45 : 0.15)) {
                  addStress(6);
                  ui.note('ear', 'Clicks. Counting.', 'onto');
                  G.leads.push('Server rack clicks in patterns');
                } else ui.note('ear', 'Just fans', '');
              },
            }),
          ),
        ),
      );
      break;
    case 'newsrack': // the rack by the till: today's front page, read standing up
      ops.push(
        opt(
          'Read',
          'paper',
          Q(() =>
            useP(o, 'Read', 'paper', {
              dur: 10,
              anim: 'read',
              fx: { stress: -9 },
              onEnd: (c, a, ok) => {
                if (!ok) return;
                const hd = G.headline && G.headline.day === dayNo() ? G.headline : null;
                const t = hd ? hd.text : pick(NEWS.general);
                ui.note('paper', t, hd && hd.echo ? 'onto' : '');
                if (hd && hd.echo) hear(null, '“' + t + '”', 'paper');
              },
            }),
          ),
        ),
      );
      break;
    case 'shopcounter':
      return NPC.vic.onMap ? menuForChar(NPC.vic) : null;
    case 'mailbox':
      ops.push(
        opt(
          'Mail',
          'mail',
          Q(() =>
            useP(o, 'Mail', 'mail', {
              dur: 2,
              onEnd: (c, a, ok) => {
                if (!ok) return;
                if (G.mailToday) return ui.note('mail', 'Empty', '');
                G.mailToday = true;
                if (G.aware >= 40 && chance(0.5)) {
                  addStress(10);
                  ui.note('mail', 'A photo of your door. From inside.', 'bad');
                  audio.sting('whisper');
                } else ui.note('mail', pick(MAIL), '');
              },
            }),
          ),
        ),
      );
      break;
    case 'pcdesk': {
      const pc = OBJ_BY_ID.pcChair;
      ops.push(
        opt(
          'Browse',
          'pc',
          Q(() =>
            useP(pc, 'Browse', 'pc', {
              dur: 30,
              anim: 'type',
              fx: { stress: 10, energy: -2 },
              onEnd: (c, a, ok) => {
                if (!ok) return;
                if (chance(0.45)) {
                  const f = FORUM[clueFaction()];
                  G.leads.push(f);
                  ui.note('pc', f, 'onto');
                } else ui.note('pc', pick(['Birds are drones?', 'The moon is a hole?', 'Nothing useful']), '');
              },
            }),
          ),
        ),
      );
      break;
    }
    case 'drain':
      ops.push(
        opt(
          'Listen',
          'ear',
          Q(() =>
            useP(o, 'Listen', 'ear', {
              dur: 3,
              anim: 'dig',
              onEnd: (c, a, ok) => {
                if (!ok) return;
                const below = them().find((m) => m.under);
                if (below && G.faction === 'lizards') {
                  addStress(6);
                  ui.note('ear', 'Breathing down there. Slow. Warm.', 'onto');
                  G.leads.push('Someone goes down the drain behind Pell’s');
                } else ui.note('ear', 'Water. Rats.', '');
              },
            }),
          ),
        ),
      );
      break;
    case 'trashcan':
      if (o.id === 'breakBin') {
        ops.push(
          opt(
            'Dig',
            'trash',
            Q(() =>
              useP(o, 'Dig', 'trash', {
                dur: 4,
                anim: 'dig',
                onEnd: (c, a, ok) => {
                  if (ok) binDig();
                },
              }),
            ),
          ),
        );
        break;
      }
    // falls through
    case 'dumpster':
      ops.push(
        opt(
          'Dig',
          'trash',
          Q(() =>
            useP(o, 'Dig', 'trash', {
              dur: 6,
              anim: 'dig',
              fx: { stress: 2 },
              onEnd: (c, a, ok) => {
                if (ok) digResult(o);
              },
            }),
          ),
        ),
      );
      break;
    case 'payphone':
      ops.push(
        opt(
          'Call Mom',
          'phone',
          Q(() => momAct(o)),
        ),
      );
      break;
    case 'doorknock':
      if (o.id === 'homeLock') return null; // your own door: nothing to do with it but walk through
      {
        const hid = doorHouse(o),
          owner = NPC[hid],
          open = G.broken[hid] > G.t;
        ops.push(
          opt(
            'Knock',
            'knock',
            Q(() => knockAct(o, owner)),
          ),
        );
        ops.push(
          opt(
            'Break in',
            'fist',
            Q(() => breakInAct(o)),
            open ? 'It’s open' : null,
          ),
        );
        return {
          title: o.id === 'agnesDoor' ? 'Agnes’s door' : o.name,
          img: owner ? getPortrait(owner) : null,
          icon: 'knock',
          sub: open
            ? 'Kicked in'
            : owner && owner.slain
              ? 'Nobody lives here now'
              : owner && owner.exposed
                ? 'IT lives here'
                : '',
          ops,
        };
      }
    default:
      return null;
  }
  if (!ops.length) return null;
  return { title: o.name, sub: objStatus(o), icon: ops[0].icon, ops };
}
function deskMenu(o) {
  return {
    title: 'Your desk',
    icon: 'work',
    ops: [
      opt(
        'Work',
        'work',
        Q(() => deskWork(false)),
        isWorkday() ? null : 'No work today',
      ),
    ],
  };
}
function objStatus(o) {
  const used = (o.users || []).find((u) => u && !u.isPlayer);
  if (used && used.shown > 0.5) return used.short;
  if (o.type === 'toilet' && (o.users || []).some((u) => u)) return 'Occupied';
  return '';
}
function menuForChar(n) {
  const ops = [];
  if (n.isPlayer) {
    // what's in your pockets, until the inventory has a place on screen: slots stay put (A wait · D pills · W trap · S light)
    ops.push(
      opt('Wait 1h', 'clock', () =>
        enqueue(PLAYER, waitAct({ label: 'Wait', icon: 'clock', dur: 60, anim: 'idle', long: true })),
      ),
    );
    if (G.inv.pills > 0) ops.push(opt('Pills · ' + G.inv.pills, 'pill', () => enqueue(PLAYER, pillsAct())));
    if (G.inv.trap > 0) ops.push(opt('Set trap', 'trap', () => enqueue(PLAYER, setTrapAct())));
    if (G.inv.flashlight)
      ops.push(
        opt(G.inv.flashOn ? 'Light off' : 'Light on', 'torch', () => {
          G.inv.flashOn = !G.inv.flashOn;
        }),
      );
    return { title: n.name, sub: moodWord(), img: getPortrait(n), ops };
  }
  if (n.ko)
    return {
      title: n.def.stranger ? 'Stranger' : n.name,
      icon: 'sick',
      ops: [opt('Out cold', 'sick', null, 'Not now')],
    };
  // calling someone out: it needs ears. Alone with them, there's only the other way.
  const cfOpt = () =>
    earshot(n).length
      ? opt('Confront', 'confront', () => openConfront(n), n.sus >= 85 ? 'Not listening' : null)
      : opt('Attack', 'fist', () => playerMelee(n));
  if (tooShaken())
    return {
      title: n.trueForm ? '???' : n.def.stranger ? 'Stranger' : n.name,
      img: n.trueForm ? null : getPortrait(n),
      icon: 'nerve',
      sub: 'You can’t face anyone like this',
      // you can't talk calmly, but you can still shout it at them
      ops: [opt('Too shaken', 'nerve', null, 'Calm down')].concat(
        !n.trueForm && !n.def.stranger && !n.exposed && !n.surrendered && n.id !== 'lenny' && earshot(n).length
          ? [cfOpt()]
          : [],
      ),
    };
  const T = (k) => () => enqueue(PLAYER, talkAct(n, k));
  const hit = (label, icon) => opt(label, icon, () => playerMelee(n));
  // its true form: no menu, the key is the blow. On its knees, there's nothing left to do but wait.
  if (n.surrendered) return { title: '???', icon: 'flag', ops: [opt('Waiting', 'clock', null, 'The FBI is coming')] };
  if (n.trueForm)
    return {
      title: '???',
      icon: 'fist',
      ops: [hit('Attack', 'fist')]
        .map((o) => ((o.dis = n.tell.t < TF_CHANGE ? 'Changing' : null), o))
        // held in your trap: bring people to it, and call it out with the crowd already on your side
        .concat(n.trueForm.mode === 'trapped' && earshot(n).length ? [cfOpt()] : []),
    };
  if (n.riteBy && G.enc && G.enc.vic.includes(n.id))
    return {
      title: n.def.stranger ? 'Stranger' : n.name,
      img: getPortrait(n),
      sub: 'Not themselves',
      ops: [opt('Pull away', 'wave', () => enqueue(PLAYER, encPullAct(n)))],
    };
  if (n.def.stranger)
    return {
      title: n.def.officer ? n.short : 'Stranger',
      img: getPortrait(n),
      ops: [opt('Hello', 'wave', T('hello'))],
    };
  if (asleep(n) && n.id !== 'lenny')
    return {
      title: n.name,
      img: getPortrait(n),
      ops: [n.exposed && !n.slain ? hit('Fight', 'fist') : opt('Asleep', 'moon', null, 'Asleep')],
    };
  if (n.exposed && !n.slain) {
    // everyone knows what it is: there's nothing left to say
    ops.push(hit(n.fleeing ? 'Catch' : 'Fight', n.fleeing ? 'walk' : 'fist'));
    ops.push(opt('Watch', 'eye', () => enqueue(PLAYER, observeAct(n))));
    return {
      title: n.name,
      img: getPortrait(n),
      sub:
        'Unmasked · it lives at ' +
        (n.id === 'agnes'
          ? 'Larkspur Court'
          : HOUSE_OF[n.id]
            ? HOUSE_OF[n.id].name.replace(/’s (house|flat)/, '’s')
            : 'the edge of town'),
      ops,
    };
  }
  // slots stay put: A Chat · D Ask… (Gossip, Come with me) · W Confront (Attack when you're alone; Catch) · S Watch.
  // No daily limits: ask again and you're told there's nothing new.
  ops.push(opt('Chat', 'chat', T('chat')));
  if (n.id === 'lenny') {
    ops.push(opt('Theories', 'ear', T('lenny')));
    ops.push(opt('Give meal', 'gift', T('feed'), G.inv.meal > 0 ? null : 'No meal'));
  } else {
    ops.push(opt('Ask…', 'ear', () => openMenu(askMenu(n), UI.menuX, UI.menuY, { char: n })));
    if (n.fleeing) ops.push(hit('Catch', 'walk'));
    else ops.push(cfOpt());
    ops.push(opt('Watch', 'eye', () => enqueue(PLAYER, observeAct(n))));
  }
  // how weird they find you is in the evidence book, not over their head
  return {
    title: n.name,
    img: getPortrait(n),
    sub: G.cleared[n.id]
      ? 'Cleared'
      : knownQ(n)
          .slice(0, 2)
          .map((q) => QUIRKS[q].short)
          .join(' · '),
    ops,
  };
}
// the second ring: what you ask them. Gossip (what's going round: clues, never cards), Come with me.
function askMenu(n) {
  const T = (k) => () => enqueue(PLAYER, talkAct(n, k)),
    st = PLAYER.needs.stress;
  return {
    title: n.name,
    img: getPortrait(n),
    ops: [
      opt('Gossip', 'ear', T('gossip'), st >= 60 ? 'Too shaken' : n.sus >= 60 ? 'Won’t gossip with you' : null),
      opt(
        'Come with me',
        'walk',
        T('come'),
        G.follower && G.follower.id === n.id ? 'With you' : n.sus >= EVIDENCE.come.sus ? 'Finds you weird' : null,
      ),
    ],
  };
}
const ITEM_NAMES = {
  skin: 'Shed skin',
  finger: 'A finger',
  scorch: 'Scorch mark',
  puddle: 'Puddle',
  stain: 'A stain',
  tape: 'Police tape',
  device: 'A small device',
  opened: 'Taken apart',
  trap: 'Your trap',
};
function itemName(it) {
  if (it.kind === 'stash') {
    const st = G.stashes.find((s) => s.id === it.stash);
    return st ? stashDef(st).what : 'Something';
  }
  if (it.kind === 'opened') {
    const o = OBJ[it.obj];
    return o ? o.name + ' · opened up' : ITEM_NAMES.opened;
  }
  if (it.kind === 'trap') {
    if (it.shut) return 'A sprung trap';
    const tr = G.traps.find((t) => t.id === it.trap);
    return tr && tr.bait ? 'Your trap · baited' : 'Your trap';
  }
  return ITEM_NAMES[it.kind] || 'Something';
}
function menuForItem(it) {
  // off the floor: a step in to it if it's past arm's length, then down on one knee for it (or to wipe it up).
  // Out of a drawer or a hiding place: rummaging.
  const floor = it.kind !== 'stash' && it.kind !== 'opened',
    wipe = it.kind === 'puddle' || it.kind === 'stain';
  const go = (label, fn, mins, icon) => () => {
    enqueue(
      PLAYER,
      waitAct({
        label,
        icon: icon || (it.kind === 'puddle' ? 'mop' : 'bag'),
        dur: mins,
        anim: !floor ? 'dig' : wipe ? 'mop' : 'pickup',
        reach: floor ? [it.x, 0.05, it.z] : null,
        check: () => (inReach({ item: it }) ? null : 'Too far'),
        onStart: (c) => (c.tdir = Math.atan2(it.x - c.x, it.z - c.z)),
        onTick: (c, a, dt) => {
          if (floor) {
            const dx = it.x - c.x,
              dz = it.z - c.z,
              d = Math.hypot(dx, dz);
            if (d > 0.62 && (a.stepT || 0) < 1.2) {
              a.stepT = (a.stepT || 0) + dt;
              a.t = Math.max(0, a.t - dt);
              const m = tryMove(
                c,
                (dx / d) * Math.min(d - 0.55, WALK * CTRL.walk * dt),
                (dz / d) * Math.min(d - 0.55, WALK * CTRL.walk * dt),
              );
              c.moving = m > 1e-5;
              c.walkPh += m * 3.7;
              c.tdir = Math.atan2(dx, dz);
            } else c.moving = false;
          }
          if (it.kind === 'stash' || it.kind === 'opened') tamperSeen(OBJ[it.obj], a, 1);
        },
        onEnd: (c, a, ok) => {
          c.moving = false;
          if (ok && G.items.includes(it)) fn();
        },
      }),
    );
  };
  const ops = [],
    name = itemName(it);
  if (it.kind === 'puddle' || it.kind === 'stain')
    ops.push(
      opt(
        'Mop',
        'mop',
        go('Mop', () => removeItem(it), 6),
      ),
    );
  else if (it.kind === 'stash') {
    ops.push(
      opt(
        'Take it',
        'bag',
        go('Take it', () => takeStash(it), 1),
      ),
    );
    ops.push(
      opt(
        'Put it back',
        'box',
        go('Put it back', () => closeUp(OBJ[it.obj]), 3, 'box'),
      ),
    );
  } else if (it.kind === 'opened')
    ops.push(
      opt(
        'Put it back',
        'box',
        go('Put it back', () => closeUp(OBJ[it.obj]), 3, 'box'),
      ),
    );
  else if (it.kind === 'trap')
    ops.push(
      opt(
        'Pick it up',
        'bag',
        go('Pick it up', () => liftTrap(it), 2),
      ),
    );
  else if (it.kind !== 'tape' && it.kind !== 'scorch')
    ops.push(
      opt(
        'Bag it',
        'bag',
        go('Bag it', () => bagItem(it), 2),
      ),
    );
  if (!ops.length) return null;
  return { title: name, icon: it.kind === 'puddle' ? 'mop' : it.kind === 'trap' ? 'trap' : 'bag', ops };
}
// bagged, it's out of THEIR hands and in yours: a Home card, or bait for a trap. THEY hate seeing it on you.
function bagItem(it) {
  const home = itemHome(it),
    saw = itemSeenWith(it);
  removeItem(it);
  addStress(3);
  if (it.by) {
    if (!G.factionKnown) revealFaction();
    takeProofItem({
      frame: 'home',
      q: home ? 'clear' : 'fuzzy',
      true: it.by,
      auto: home || saw,
      what: ITEM_NAMES[it.kind],
      where: placeName(it.x, it.z),
      k: it.kind,
      icon: FACTIONS[G.faction].icon,
      pr: { kind: 'item', what: ITEM_NAMES[it.kind], icon: FACTIONS[G.faction].icon },
    });
  } else ui.note('bag', ITEM_NAMES[it.kind] + ' · in a bag, in your pocket', '');
}
// the inventory: what you carry. It has no place on screen yet; the self menu (E on yourself) reaches the three you find.
const ITEMS_INV = [
  {
    k: 'trap',
    label: 'Trap · set it where you stand',
    icon: 'trap',
    has: () => G.inv.trap > 0,
    count: () => G.inv.trap,
    use: () => enqueue(PLAYER, setTrapAct()),
  },
  {
    k: 'flash',
    label: 'Flashlight',
    icon: 'torch',
    has: () => G.inv.flashlight,
    on: () => G.inv.flashOn,
    use: () => {
      G.inv.flashOn = !G.inv.flashOn;
    },
  },
  {
    k: 'pills',
    label: 'Pills',
    icon: 'pill',
    has: () => G.inv.pills > 0,
    count: () => G.inv.pills,
    use: () => enqueue(PLAYER, pillsAct()),
  },
  {
    k: 'paper',
    label: 'Newspaper',
    icon: 'paper',
    has: () => G.inv.paper > 0,
    count: () => G.inv.paper,
    use: () => {
      G.inv.paper--;
      enqueue(
        PLAYER,
        mkAct({
          kind: 'wait',
          label: 'Read',
          icon: 'paper',
          dur: 12,
          anim: 'read',
          fx: { stress: -15 },
          onEnd: (c, a, ok) => {
            if (!ok) return;
            const hd = G.headline && G.headline.day === dayNo() ? G.headline : null;
            const t = hd ? hd.text : pick(NEWS.general);
            ui.note('paper', t, hd && hd.echo ? 'onto' : '');
            if (hd && hd.echo) hear(null, '“' + t + '”', 'paper');
          },
        }),
      );
    },
  },
  {
    k: 'bait',
    label: 'THEIR things · proof, or bait for your next trap',
    icon: 'bag',
    has: () => G.proofs.some((p) => p.src === 'item' && !p.grey),
    count: () => G.proofs.filter((p) => p.src === 'item' && !p.grey).length,
    use: () =>
      ui.note(
        'bag',
        G.proofs
          .filter((p) => p.src === 'item' && !p.grey)
          .map((p) => p.what)
          .join(' · '),
        '',
      ),
  },
  {
    k: 'meal',
    label: 'Ready meal',
    icon: 'food',
    has: () => G.inv.meal > 0,
    count: () => G.inv.meal,
    use: () => {
      G.inv.meal--;
      enqueue(PLAYER, eatHereAct('Ready meal', 10, 45));
    },
  },
  {
    k: 'drink',
    label: 'Energy drink',
    icon: 'can',
    has: () => G.inv.drink > 0,
    count: () => G.inv.drink,
    use: () => {
      G.inv.drink--;
      enqueue(
        PLAYER,
        mkAct({
          kind: 'wait',
          label: 'Energy drink',
          icon: 'can',
          dur: 2,
          anim: 'drink',
          prop: 'can',
          fx: { energy: 780, stress: 180, bladder: -300 },
        }),
      );
    },
  },
  {
    k: 'crowbar',
    label: 'Crowbar · opens things faster, hits harder',
    icon: 'crowbar',
    has: () => G.inv.crowbar,
    use: () => ui.note('crowbar', 'Opens things faster. Hits harder.', ''),
  },
  {
    k: 'foil',
    label: 'Tinfoil hat',
    icon: 'foil',
    has: () => G.inv.tinfoil,
    on: () => G.inv.foilOn,
    use: () => {
      G.inv.foilOn = !G.inv.foilOn;
      PLAYER.fx.foil = G.inv.foilOn;
    },
  },
];
