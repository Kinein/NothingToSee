//@ data/tuning — Tuning numbers: speeds, controls, needs, work, damage, odds. Change the game's feel here
//@ Defines: WALK, SPEEDS, SLEEP_SPEED, PHOTO_RANGE, CTRL, WORK, HURT, NEEDS, STRESS_K, SHAKEN_LOCK, TIP, ATTACK_ODDS, HORROR_MIX, AWARE_STEPS, FIGHT_DIFF, FOE_HP, …
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
  melee: 2.0,        // a swing connects if they're still this close when it lands
  windup: 0.5,       // the swing lands this long after the key (about a quarter second at normal speed): a moving enemy can slip it
  swingCd: 0.7,      // real seconds between your swings
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
const HURT = { punch: 10, thug: 15, lizards: 20, aliens: 25, laser: 30, zombies: 18 };   // what a blow costs your health

// ── Needs and the Psychic bar (player/needs)
const NEEDS = [
  { k: 'hunger', n: 'Hunger', icon: 'food', rate: -5.6 },
  { k: 'energy', n: 'Energy', icon: 'bolt', rate: -4.0 },
  { k: 'bladder', n: 'Bladder', icon: 'toilet', rate: -8.0 },
  { k: 'stress', n: 'Psychic', icon: 'nerve', rate: -1.0, inv: true },
];
// Stress builds slowly, out of the town's small wrongness: the dark, a noise, a face that slips, Lenny's theories.
// Facing it head-on (a fight, a confrontation, being grabbed) shakes you less than you'd think.
const STRESS_K = { rate: 0.6, event: 0.75 };   // multipliers on every rise: per-hour drift, and one-off jolts
const SHAKEN_LOCK = 80;                        // from here (breaking) you can't face anyone: no talking, no fighting

// ── THEIR week: tips, attacks, horror, awareness (them/plan, them/night-attacks, horror/director, them/awareness)
// what you happen to hear. The first few go by unnoticed; after that only now and then, only from close by,
// and after each one you catch, a few more slip past again. Noise gets the ear; a scream gets the "!" marker.
const TIP = { noise: { r: 8, p: 0.4, first: [3, 4], gap: [2, 4] }, scream: { r: 11, p: 0.45, first: [2, 3], gap: [1, 3] }, far: { r: 18, p: 0.4, first: [2, 3], gap: [1, 3] } };
const ATTACK_ODDS = [0, 0.33, 0.45, 0.6, 0.8, 0.95];
const HORROR_MIX = [null, [0.5, 0.35, 0.15, 0], [0.35, 0.3, 0.25, 0.1], [0.25, 0.2, 0.3, 0.25], [0.15, 0.15, 0.3, 0.4], [0.1, 0.1, 0.3, 0.5]];
const AWARE_STEPS = [[40, 'phone', 'THEY know your number'], [50, 'eye', 'THEY are cleaning up after THEMSELVES'], [55, 'eye', 'Someone watches your window'], [70, 'eye', 'THEY are coming for you'], [100, 'eye', 'THEY are ready for you']];

// ── Fights (combat/timing-bar)
// a fight is rounds of the timing bar. A true form takes several hits to put down; every miss, it gets you.
const FIGHT_DIFF = { normal: [0.4, 0.55], them: [0.25, 0.85], aliens: [0.2, 0.9], lizards: [0.15, 1.15], zombies: [0.18, 1.0] };
const FOE_HP = { aliens: 2, lizards: 3, zombies: 3 };
// the timing bar itself (combat/timing-bar). grace: real seconds the tracker holds still as the panel opens, so a key
// already on its way for something else doesn't waste the swing. timeout: real seconds before freezing up counts as a
// miss. clean: the middle share of the green that lands a clean hit. down: game minutes a clean hit leaves it on the ground.
const FIGHT = { grace: 0.35, timeout: 6, clean: 0.34, down: 3.2 };

// ── Doors left ajar (town/doors)
// Someone stepping into a room can forget to pull the door to. It stays half open and you can see in through the gap.
// Rarely at midday, more in the morning and evening, most at night; twice as likely when they're up to something.
// Locked doors never: a house door, the shop after hours.
const AJAR = { open: 0.55, mid: 0.035, edge: 0.12, night: 0.2, guilty: 2, min: 60, max: 240 };
