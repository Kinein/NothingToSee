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

// ── Evidence, confronting, being hunted (them/proofs, play/oddities, play/arena, ui/case-board, combat/timing-bar)
// Every suspect has four frames: Home, Habit, Body, Contact. Each holds one card, clear or fuzzy. All four is a case.
// A clear card pushes a fuzzy one out of its frame. Enough grey (explained) frames and they're CLEARED.
const EVIDENCE = {
  frames: ['home', 'habit', 'body', 'contact'],
  oddRate: 0.7,                 // ordinary people who carry one innocent oddity: one fuzzy card, in one frame
  frameAt: [40, 70],            // awareness at which THEY frame one human, then a second
  cleanAt: 50,                  // from here THEY move THEIR things and tidy up after THEMSELVES
  clearedGrey: 2,               // grey frames that stamp a suspect CLEARED (an ordinary person has two to find: their secret, their oddity)
  witnessDays: 2,               // someone who saw it change remembers it this long
  halfFrom: 4,                  // THEIR day from which a slipping face is clear on film by daylight too (before: at night only)
  // the arena: the crowd's lean runs −5 (with THEM) … +5 (with you), and starts from the room, held to −3 … +3
  lean: { min: -5, max: 5, startMin: -3, startMax: 3 },
  start: { friend: 1, friendRel: 40, close: -1, closeRel: 40, closePairs: 8, witness: 2, bought: -1, psy40: -1, psy20: -2, mad: -1, trapped: 2, grudge: -1 },
  rant: { stress: 80, p: 0.4 }, // Psychic 20 or less: this chance you rant before it starts. Instant Fail
  statements: 5,                // the testimony: one lie per frame, and one true line
  statementSecs: 6,             // real seconds each statement waits for a card
  move: { clear: 2, fuzzyBacked: 1, fuzzyAlone: -1, wrongLie: -1, pass: -1, onTruth: -2 },
  rebuttalSecs: 6,
  idleSecs: 1.8,                // ...but with nothing left to play, only this long: no standing there waiting
  know: { claims: [1, 2], right: 1, wrong: -1, secs: 8 },
  counter: { psy: 50, lose: -1, stress: 5, faced: -1, facedMins: 1440 },
  escapeAt: 3, escapeBlock: 1,  // the first time the lean reaches +3, THEY try to walk out; block it for +1
  bands: { total: 4, partial: 1, pfail: -1 },   // final lean: +4 up total success · +1…+3 partial · −1…0 partial fail · below: fail
  wrong: { innocent: -2, planted: -1, other: -1, aware: 20, rel: -30 },
  fail: { sus: 15, rel: -10, madDays: 2 },
  pfail: { watchMins: 1440, sus: 5 },
  success: { rel: 10, fearMins: 1440 },
  aware: { pfail: 15, fail: 25, wrong: 20, success: 15, privateKill: 30, hitNoChange: 10, lostFight: 10 },
  huntedNights: 2,              // nights THEY hunt you after you kill one of THEM where nobody saw
  fbiDelay: 25,                 // game minutes from giving up to the grey cars
  come: { rel: 20, mins: 60 },  // "Come with me": anyone who likes you this much follows you for this long
  saved: 25,                    // liking from a witness you stood guard for
  tail: { every: 90, mins: 60, aware: 5 }, // hunted, by day: one of THEIR people tails you this long, then reports
  // the private way: hitting one of THEM
  hit: { day: 3, sus: 15, aware: 10 },
  // fights by situation (multipliers on FIGHT_DIFF and HURT): alone with it, it's far worse
  fight: {
    privateHp: { lizards: 4, aliens: 3, zombies: 4 }, privateBlow: 1.25, privateWindow: 0.85,
    trapHp: -1, trapWindow: 1.5, trapSpeed: 0.8,
    crowdSaw: 3, crowdSave: 0.3,  // three who saw it change land a free blow; then each miss, this chance someone pulls it off you
    loseSight: 6,                 // seconds out of its sight, at night, to lose it
  },
};

// ── Doors left ajar (town/doors)
// Someone stepping into a room can forget to pull the door to. It stays half open and you can see in through the gap.
// Rarely at midday, more in the morning and evening, most at night; twice as likely when they're up to something.
// Locked doors never: a house door, the shop after hours.
const AJAR = { open: 0.55, mid: 0.035, edge: 0.12, night: 0.2, guilty: 2, min: 60, max: 240 };
