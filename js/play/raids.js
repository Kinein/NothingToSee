//@ play/raids — Raids: kicking in a door
//@ Defines: breakInAct, knockAct, heardBreakIn, raidEnter
//@ Uses:    sim/core, ui/interface, core/util, town/suspicion, town/npc-update, play/traps, play/verbs, audio/sound, player/needs, them/tells, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── raids: kick in a door. Inside an unmasked one's home, it has nowhere left to run.
const doorHouse = (o) => o.doorOf || (o.id === 'agnesDoor' ? 'agnes' : null);
function breakInAct(o) {
  const hid = doorHouse(o),
    owner = NPC[hid],
    mins = G.inv.crowbar ? 6 : 11;
  return useP(o, 'Break in', 'fist', {
    dur: mins,
    anim: 'knock',
    long: true,
    check: () => (G.broken[hid] > G.t ? 'Already open' : null),
    onTick: (c, a, dt) => {
      a.st = (a.st || 0) + dt;
      if (a.st < 0.5) return;
      a.st = 0;
      if (!a.heard && owner && owner.onMap && atHome(owner)) {
        a.heard = true;
        heardBreakIn(owner);
      }
      for (const n of CHARS) {
        if (
          n.isPlayer ||
          !n.onMap ||
          asleep(n) ||
          n === owner ||
          (a.seen || (a.seen = {}))[n.id] ||
          !npcSeesPlayer(n, 10)
        )
          continue;
        a.seen[n.id] = 1;
        if (owner && owner.exposed) {
          if (!n.isThem && !n.def.stranger) {
            ui.say(n, pick(['Get it!', 'Burn it out!', 'Go on!']), 2.4);
            n.sus = Math.max(0, n.sus - 10);
          }
          continue;
        }
        ui.bubble(n, 'exclaim', 'speech', 2.5);
        if (n.def.officer) {
          ui.say(n, pick(COP_CHASE), 2.6);
          policeSaw(n);
        } else if (n.def.stranger) {
          ui.say(n, pick(['Hey!', 'Not my business.', 'Is that your house?']), 2.6); // passing through: they keep walking
          continue;
        } else ui.say(n, pick(['That’s not your house!', 'I’m calling the police!', 'Stop!']), 2.6);
        addSus(n, 20);
        // anyone who lives here calls it in, THEM included; never a passing stranger
        if (!a.reported) {
          a.reported = true;
          G.policeAt = G.policeAt || G.t + rand(10, 25);
          caution(owner, 'breakin');
        }
      }
    },
    onEnd: (c, a, ok) => {
      if (!ok) return;
      G.broken[hid] = G.t + (owner && owner.exposed ? 3 : 1) * 1440;
      ui.note('lock', 'The door gives', 'onto');
      audio.sting('awkward');
      if (owner && !owner.exposed && !owner.isThem && atHome(owner)) caution(owner, 'breakin');
      echo('breakin', { x: c.x, z: c.z, who: hid });
    },
  });
}
function knockAct(o, owner) {
  return useP(o, 'Knock', 'knock', {
    dur: 2,
    anim: 'knock',
    onEnd: (c, a, ok) => {
      if (!ok) return;
      const home = owner && owner.onMap && atHome(owner),
        sleeping = home && asleep(owner);
      if (!home || owner.slain) return ui.note('knock', 'No answer', '');
      if (sleeping) return ui.note('knock', 'Shuffling. Then nothing.', '');
      if (owner.exposed) {
        addStress(5);
        audio.sting('whisper');
        return ui.note('knock', 'Through the door: “Go away. While you still can.”', 'bad');
      }
      if (owner.id === 'agnes') {
        addStress(-4);
        owner.rel += 2;
        return ui.note(
          'knock',
          pick(['Agnes: “Busy, dear.”', 'Agnes: “Eat something.”', 'Agnes: “Did you hear that?”']),
          '',
        );
      }
      if (owner.isThem) addDanger(owner, 4);
      ui.note(
        'knock',
        owner.short + ': ' + pick(['“Not now.”', '“Who is it? …Oh. What do you want?”', '“I’m not buying anything.”']),
        '',
      );
    },
  });
}
// at home, behind a door that's being kicked in
function heardBreakIn(n) {
  if (n.isThem && !n.slain) {
    addDanger(n, 40);
    n.cornered = G.t;
    return;
  }
  ui.say(n, pick(['Who’s there?!', 'I’m calling the police!']), 3);
  G.policeAt = G.policeAt || G.t + rand(8, 18);
}
// you walk into its home: it turns, and it has nowhere to go
function raidEnter(n) {
  if (!n.isThem || n.slain || n.trueForm || !n.onMap || G.over) return;
  hardReset(n);
  if (!mayShed(n, 'cornered')) {
    // broad daylight, early in THEIR week: it plays the outraged neighbour, and calls the police
    const hid = n.id;
    if (G.intruded === hid + dayNo()) return;
    G.intruded = hid + dayNo();
    ui.bubble(n, 'exclaim', 'speech', 3);
    ui.say(n, pick(['GET OUT OF MY HOUSE!', 'I’m calling the police!', 'What do you think you’re doing?']), 3);
    addDanger(n, 15);
    G.policeAt = G.policeAt || G.t + rand(8, 18);
    caution(n, 'breakin');
    return;
  }
  ui.say(n, pick(['You shouldn’t have come here.', 'This is MY house.', 'Close the door behind you.']), 3);
  trueForm(n, 'cornered');
  if (n.trueForm) {
    const tf = n.trueForm;
    tf.mode = 'attack';
    tf.cornered = true;
    tf.raid = true;
    tf.long = 999;
  }
}
