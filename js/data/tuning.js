//@ data/tuning — Tuning numbers: speeds, controls, needs, work, damage, odds. Change the game's feel here
//@ Defines: WALK, SPEEDS, SLEEP_SPEED, PHOTO_RANGE, CTRL, WORK, HURT, POLICE, NEEDS, PSY, BLADDER, TIP, ATTACK_ODDS, HORROR_MIX, AWARE_STEPS, FOE_HP, …
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ── Tuning: the numbers that set how the game feels. Every one is plain data, read by the systems named beside it.

// ── Time and movement (sim/core)
const WALK = 1.15;                 // tiles per game minute
const SPEEDS = [0, 2, 5, 12];      // game minutes per real second
const SLEEP_SPEED = 45;
const PHOTO_RANGE = 11;
// direct control: every number the keyboard play depends on, in one place (distances in tiles, angles in degrees, times in game minutes unless marked)
const CTRL = {
  walk: 1.45,        // you jog everywhere: half again a townsperson's stroll, so you can keep up with anyone and still look about
  sprint: 1.5,       // Shift: on top of the jog
  // Shift into a bench, a fence, a chair: over it without stopping. look: how far ahead it sees the thing coming;
  // reach: the longest hop, take-off to landing; pace: share of your sprint kept in the air; hop: how high, × its height
  vault: { look: 0.3, reach: 2.2, pace: 0.92, hop: 0.42 },
  npcPace: 0.9,      // an ordinary walk, a touch unhurried
  npcRun: 1.46,      // anybody running (a fright, or something not human): two thirds of your sprint
  body: 0.22,        // your radius against walls and furniture: a round body, about shoulder-wide
  reachObj: 1.6,     // E reaches a thing when its nearest edge is this close
  reachChar: 2.0,    // …a person, centre to centre
  reachItem: 1.5,    // …something on the floor
  close: 0.9,        // this close, facing doesn't matter
  facing: 70,        // half-angle you must roughly face to pick something new (a 140° wedge)
  holdDist: 0.6,     // once picked, a target stays picked out to reach + this…
  holdFacing: 110,   // …and to this half-angle, so a small step or a turn doesn't drop it
  melee: 1.7,        // a swing connects with anyone this close, in front of you, when it lands
  meleeArc: 75,      // …within this half-angle of where you face (closer than `close`, any side)
  windup: 0.5,       // the swing lands this long after the key (about a quarter second at normal speed): a moving enemy can slip it
  swingCd: 0.7,      // real seconds between your swings
  crowbar: 0.35,     // a crowbar in your hand: this much more reach
  shakeHold: 120,    // a shake stays fresh this long; after that, shake it again before you open it
  photoHalf: 60,     // the camera takes in a 120° wedge in front of you…
  photoRange: 8,     // …out to this far, and only what you can actually see
  boltSpeed: 3.5,    // enemy projectiles: tiles per game minute (7 tiles a second at normal speed)
  boltHit: 0.42,     // how close a bolt must pass to you to land
  boltRange: 14,
  knockout: 1440,    // beaten: you sleep for a day
};

// ── Work and damage (sim/core, player/work, combat/hits)
// the work bar: +30 on sitting down (once an hour), +25/h working, −9/h away. Empty, and you're let go: no second chances,
// but it takes most of a shift away from the desk to get there.
const WORK = { sit: 20, fill: 25, drain: 16, low: 30 };
const HURT = { punch: 10, thug: 15, lizards: 20, aliens: 25, laser: 30, zombies: 18, thrown: 18, sting: 3 };   // what a blow costs your health
// the officer (them/moves policeTick): the first time he comes it's only a telling-off; after that he runs you down.
// He starts at `start` × a townsperson's run (you outsprint him) and gets to `top` (he outsprints you) over `ramp` game
// minutes. Up close he reaches for you: `grab` game minutes of warning, and his hands close on anyone within `hold`.
// Step out of it and you slip him; he stumbles for `stumble`. Slip him `slips` times and he gives up, winded.
// Out of reach for `giveUp` minutes (a locked door), he takes you anyway.
const POLICE = { start: 1.1, top: 1.6, ramp: 40, giveUp: 120, whistle: 14, talk: 5, grab: 0.8, hold: 1.0, lunge: 0.5, stumble: 2.2, slips: 3 };

// ── Needs and the Psychic bar (player/needs)
const NEEDS = [
  { k: 'hunger', n: 'Hunger', icon: 'food', rate: -5.6 },
  { k: 'energy', n: 'Energy', icon: 'bolt', rate: -4.0 },
  { k: 'bladder', n: 'Bladder', icon: 'toilet', rate: -10.0 },
  { k: 'stress', n: 'Psychic', icon: 'nerve', rate: -1.0, inv: true },
];
// Psychic (100 − stress) falls in a few big steps, never in small ones, and the steps never take it all the way down
// (player/needs psyDrop): to `sign` when you see THEIR thing or a slight sign, to `form` at a true form, to `fight` when
// you trade blows with one. Near IT it drains, per game hour: `fast` by a true form or something wrong going on within
// `near` tiles, `slow` within `things` tiles of THEIR things; the dark at night drifts it down by `dark`.
// What it does: under `visions` rare visions · under `shaky` more of them, red at the edges and your hands shake (no
// photos) · under `mute` no gossip and no confronting (you can still fight) · at 0 a panic attack, out of it at `after`.
const PSY = { sign: 70, form: 50, fight: 30, fast: 30, slow: 6, dark: 2, near: 9, things: 3.5, visions: 60, shaky: 40, mute: 20, after: 40 };
// the bladder: −10 an hour awake, `asleep` an hour asleep, `coffee` a cup (about three trips a day). An accident in
// public and you smell until you shower: people notice you `smell` × further off. A pee in a hedge or the alley takes
// `pee` game minutes; anyone who sees it finds you `peeSus` weirder, and while you're at it you're noticed `peeSeen` × as far.
const BLADDER = { asleep: -2, coffee: 15, smell: 1.5, pee: 1.5, peeSus: 12, peeSeen: 1.8 };

// ── THEIR week: tips, attacks, horror, awareness (them/plan, them/night-attacks, horror/director, them/awareness)
// what you happen to hear. The first few go by unnoticed; after that only now and then, only from close by,
// and after each one you catch, a few more slip past again. Noise gets the ear; a scream gets the "!" marker.
const TIP = { noise: { r: 8, p: 0.4, first: [3, 4], gap: [2, 4] }, scream: { r: 11, p: 0.45, first: [2, 3], gap: [1, 3] }, far: { r: 18, p: 0.4, first: [2, 3], gap: [1, 3] } };
const ATTACK_ODDS = [0, 0.33, 0.45, 0.6, 0.8, 0.95];
const HORROR_MIX = [null, [0.5, 0.35, 0.15, 0], [0.35, 0.3, 0.25, 0.1], [0.25, 0.2, 0.3, 0.25], [0.15, 0.15, 0.3, 0.4], [0.1, 0.1, 0.3, 0.5]];
const AWARE_STEPS = [[40, 'phone', 'THEY know your number'], [50, 'eye', 'THEY are cleaning up after THEMSELVES'], [55, 'eye', 'Someone watches your window'], [70, 'eye', 'THEY are coming for you'], [100, 'eye', 'THEY are ready for you']];

// ── Fights (combat/melee, combat/throws)
// all out in the street, no panel. Space swings. A true form takes several hits to put down. Every blow it throws is
// shown first, as a red patch on the ground where it will land: step out of it. Hit it while it stands there open
// after hitting air, and it goes down. Times in game minutes (half that in seconds at normal speed).
const FOE_HP = { aliens: 2, lizards: 3, zombies: 3 };
const MELEE = {
  engage: 1.5,                  // it starts winding up when you're this close
  wind: { lizards: 0.75, aliens: 1.0, zombies: 1.25 }, // the warning: red patch to blow
  creep: 0.35,                  // while winding up it edges after you at this share of a walk
  lunge: 0.7,                   // then throws itself this far forward…
  reach: 1.05,                  // …and hits anything this close to the spot in front of it: that's the red patch
  rec: 1.1,                     // stands after a blow that landed
  open: 2.2,                    // stands after one that hit air: its guard is down, and a hit now knocks it flat
  down: 3.2,                    // flat on the ground after that
  stagger: 0.9,                 // knocked back by your hit: this long before it can wind up again
  punch: 0.85,                  // a person's punch (someone you hit, a thug): warning to landing
  punchReach: 0.8,              // …its patch, centred three quarters of a tile in front of them
  punchTries: 3,                // a missed punch, they come again, this many times in all
};
// hitting people (combat/brawl). Anyone can be hit. The count is per person, per fight: a fight is over once nobody's
// hit them for `forget` game minutes. A scuffle most people let go (each onlooker calls the police `callSoft` of the
// time); `hard` blows landed and someone calls them (the victim, unless they're brave or one of THEM; else an
// onlooker). `ko` blows and they're out cold for `koMins`. One of THEM keeps its face unless you're alone with it or
// it knows you've got it pinned, and even then only `shed` of the time (`shedBoth` when it's both).
const BRAWL = {
  hard: 3, ko: 6, forget: 30, koMins: [90, 160],
  callSoft: 0.1, copIn: [8, 18],
  strangerFight: 0.3,           // a stranger you hit swings back this often (townspeople: by temper)
  shed: 0.3, shedBoth: 0.6,
};
// THEIR mark (them/servants): from day `from` on, THEY and everyone THEY own wear it. A gold pin (lizards), a feeler
// out of one ear (aliens), `flies` flies and the dead walk (zombies). It narrows the search; it doesn't say who's THEM.
const MARK = { from: 4, flies: 7 };
// what THEY do from further off. Lizards tear up the furniture and throw it; the dead let out a swarm; aliens have the
// laser (in them/true-form). A throw lands where you stood when it left the hands.
const RANGED = {
  from: 2.6, to: 9,             // the distances it bothers to throw or loose a swarm at
  grab: 1.9,                    // a lizard picks up something no further than this from it
  lift: 0.9,                    // overhead, in plain sight, this long before it lets go
  fly: 0.55, flyPer: 0.06,      // flight time: this, plus this much per tile
  hit: 0.85,                    // lands on you if you're this close to where it comes down
  throwCd: 7,
  wake: 0.9,                    // the dead: mouth open this long before the swarm comes out
  swarmCd: 16,
  swarmLife: 24,                // a swarm gives up after this long
  swarmSpd: 1.75,               // × a walk: faster than your jog, slower than your sprint. Run.
  swarmHit: 0.6, swarmEvery: 1.4, // stings anyone this close, this often
};

// ── Evidence, confronting, being hunted (them/proofs, play/oddities, play/confrontation, ui/case-board)
// Every suspect has four frames: Home, Habit, Body, Contact. Each holds one card, the newest. Whether a card holds up is
// decided only in a confrontation: ✓ or ✗.
const EVIDENCE = {
  frames: ['home', 'habit', 'body', 'contact'],
  oddRate: 0.7,                 // ordinary people who carry one innocent oddity: one card, in one frame, and it holds up
  cleanAt: 50,                  // from here THEY move THEIR things and tidy up after THEMSELVES
  witnessDays: 2,               // someone who saw it change remembers it this long
  // the confrontation (play/confrontation): a fail makes everyone listening `failSus` warier of you; after IT changes in
  // public, people go home early for `fearMins`
  cf: { failSus: 15, fearMins: 1440 },
  aware: { privateKill: 30, hitNoChange: 10, lostFight: 10 },
  huntedNights: 2,              // nights THEY hunt you after you kill one of THEM where nobody saw
  fbiDelay: 25,                 // game minutes from giving up to the grey cars
  come: { sus: 25, mins: 60 },  // "Come with me": anyone who finds you less weird than this follows you for this long
  saved: 25,                    // suspicion off a witness you stood guard for
  tail: { every: 90, mins: 60, aware: 5 }, // hunted, by day: one of THEIR people tails you this long, then reports
  // the private way: hitting one of THEM
  hit: { sus: 15, aware: 10 },
  // fights by situation (multipliers on MELEE.wind and HURT): alone with it, it's far worse
  fight: {
    privateHp: { lizards: 4, aliens: 3, zombies: 4 }, privateBlow: 1.25, privateWind: 0.85,
    trapHp: -1, trapWind: 1.3,
    crowdSaw: 3, crowdSave: 0.3,  // three who saw it change land a free blow; then each blow it lands, this chance someone pulls it off you
    loseSight: 6,                 // seconds out of its sight, at night, to lose it
  },
};

// ── Doors left ajar (town/doors)
// Someone stepping into a room can forget to pull the door to. It stays half open and you can see in through the gap.
// Rarely at midday, more in the morning and evening, most at night; twice as likely when they're up to something.
// Locked doors never: a house door, the shop after hours.
const AJAR = { open: 0.55, mid: 0.035, edge: 0.12, night: 0.2, guilty: 2, min: 60, max: 240 };
