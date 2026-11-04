//@ data/tuning — Tuning numbers: speeds, controls, needs, work, damage, odds. Change the game's feel here
//@ Defines: CLOCK, TALK, BODY_ACT, WALK, SPEEDS, AWAY_SPEED, SLEEP_SPEED, STIR_SLOW, PHOTO_RANGE, CTRL, WORK, MAD_SUS, SUS_SNAP, HURT, POLICE, RESIST, …
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ── Tuning: the numbers that set how the game feels. Every one is plain data, read by the systems named beside it.

// ── Time and movement (sim/core, game/loop)
// The clock runs CLOCK × as fast as bodies do. Walking, running and the short things people do (a coffee, a word, the
// toilet) are timed in body minutes, BODY of a game minute (sim/actions), so they take the real seconds they always
// took while the day goes by quicker. A fight holds the clock back to the body's pace (game/loop fightOn). Talk is
// TALK × quicker than that. Past BODY_ACT minutes an action's own time runs with the clock (a nap, the TV, a shift).
const CLOCK = 1.25;
const TALK = 1.15;
const BODY_ACT = 20;
const WALK = 1.15;                 // tiles per body minute
const SPEEDS = [0, 2 * CLOCK, 5 * CLOCK, 12 * CLOCK]; // game minutes per real second: normal, a quiet stretch hurried
const AWAY_SPEED = 45 * CLOCK;     // held in the cells: the hours fly
const SLEEP_SPEED = (AWAY_SPEED * 4) / 3; // asleep, passed out, knocked cold: a third quicker again
const STIR_SLOW = 0.5;             // asleep, and something wrong close by (in your flat, one of THEM near): this × as fast
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
  unstick: 1.5,      // body minutes (under a second) pushing against nothing while stuck inside a wall: you're put free
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
  flashNear: 3,      // the flash rule: this close, from any side, they notice the photo; further off, only facing you
  boltSpeed: 3.5,    // enemy projectiles: tiles per game minute (7 tiles a second at normal speed)
  boltHit: 0.42,     // how close a bolt must pass to you to land
  boltRange: 14,
  knockout: 1440,    // beaten: you sleep for a day
  mouseYaw: 30,      // mouse controls: the camera turned this many degrees off square to the town, a slant toward isometric
};

// ── Work and damage (sim/core, player/work, combat/hits)
// the work bar: +30 on sitting down (once an hour), +25/h working, −9/h away. Empty, and you're let go: no second chances,
// but it takes most of a shift away from the desk to get there.
// fresh: where the bar starts each shift (from 17:00 on, as if it were already morning). from/to: the hours your desk
// lets you sit down to work, in game minutes; outside them there's nobody in and no work
const WORK = { sit: 20, fill: 25, drain: 16, low: 30, fresh: 75, from: 8 * 60, to: 17 * 60 };
const MAD_SUS = 60; // suspicion of you at which someone thinks you're mad: the full meter on the board, the clinic's count
// an ordinary person's suspicion goes on past 100, up to this: then, the next time they see you, they snap by temper
// (town/suspicion snapAt: the aggressive swing at you, mockers jeer, the timid run) and it falls back to 100
const SUS_SNAP = 130;
const HURT = { punch: 10, thug: 15, lizards: 20, aliens: 25, laser: 30, zombies: 18, thrown: 18, sting: 3 };   // what a blow costs your health
// the officer (them/moves policeTick): the first time he comes it's only a telling-off; after that he runs you down.
// He starts at `start` × a townsperson's run (you outsprint him) and gets to `top` (he outsprints you) over `ramp` game
// minutes. Up close he reaches for you: `grab` game minutes of warning, and his hands close on anyone within `hold`.
// Step out of it and you slip him; he stumbles for `stumble`. Slip him `slips` times and he gives up, winded.
// Out of reach for `giveUp` minutes (a locked door), he takes you anyway.
const POLICE = { start: 1.1, top: 1.6, ramp: 40, giveUp: 120, whistle: 14, talk: 5, grab: 0.8, hold: 1.0, lunge: 0.5, stumble: 2.2, slips: 3 };
// running from an arrest (town/on-the-run): a fresh Shift while the cuffs go on or on the walk to the car, and you're off.
// He stands `stumble` game minutes where you shoved him, then runs at `run` (× anybody's run): quicker than you sprint in
// cuffs (`cuffed` × your sprint), a little slower than you sprint free. He holds fire for `first` minutes (the warning),
// then with you in sight `near`…`far` tiles off he stops and aims for `aim` (the ring closes on you: get off the line)
// and fires: a bullet `speed` × a bolt's pace, `hit` off your health, `cd` minutes to the next. Within `reach` he dives
// for you (the patch on the ground, as ever): in it, you're caught. He sees you out to `sight`. Out of it, he runs to
// where he saw you last and looks round there for `look`; unseen for `lose` all told, he's lost you. Then you're wanted:
// he comes looking once a day between the `daily` hours, and the moment he spots you (`spot` tiles).
const RESIST = { cuffed: 0.86, run: 1.38, stumble: 2, first: 2.2, near: 2.6, far: 12, aim: 2.4, speed: 2.6, hit: 40, cd: 4.5, reach: 1.15, sight: 13, look: 7, lose: 16, daily: [9, 17], spot: 9 };

// people coming to you (town/approach): a check every `every` game minutes for somebody within `near` tiles who can see
// you (fewer after dark). They call out, walk up (running when more than `runAt` off) and talk once within `reach`, a line
// every `gap` body minutes; `give` body minutes to reach you or they give up. Walk `walkOff` further off mid-sentence and
// it's rude: `rude` suspicion (Hale takes `bossCost` off the work bar for it). THEIR people, and drunks, follow you after,
// `follow` game minutes, `back` tiles behind. One of THEM only comes once THEIR awareness is `probeAware`. Hale comes to
// find you every `boss` game minutes while the work bar is under WORK.low and you're in the office away from your desk. Nobody comes over again within `again` game minutes.
const APPROACH = { every: [45, 95], near: 14, runAt: 7, reach: 1.6, gap: 4.4, give: 30, walkOff: 2.2, rude: 4, bossCost: 4, follow: [10, 20], back: 3.2, probeAware: 15, boss: 40, again: 300 };

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
// What a shaken head hears (horror/ears). Under `PSY.visions` the ear sharpens as Psychic falls, from nothing at 60 to
// full at 0: THEIR slips and noises carry up to `reach` × as far, the first few no longer go by unnoticed (them/plan
// heardIt), and a sound out of sight comes every `gap` real seconds from somewhere there's nobody: it looks and sounds
// like the real ones. Walk up to a fake (within `near`, within `wait` game minutes) and it costs you `fake` Psychic, and
// `shade` of the time a shadow too. See one of THEM slip with your own eyes and your head must hold, `save` (at 0 .. at
// `PSY.shaky`) the chance it does; if it does, nobody thinks you're mad any more (suspicion of the ordinary people who
// did is wiped, everyone else's falls by `ease`), once a day.
const EARS = { reach: 1.8, gap: [14, 30], near: 2.4, wait: 40, fake: 8, shade: 0.35, save: [0.35, 1], ease: 25 };
// the bladder: −10 an hour awake, `asleep` an hour asleep, `coffee` a cup (about three trips a day). An accident in
// public and you smell until you shower: people notice you `smell` × further off. A pee in a hedge or the alley takes
// `pee` game minutes; anyone who sees it finds you `peeSus` weirder, and while you're at it you're noticed `peeSeen` × as far.
// An accident (player/needs accident): `spray` body minutes (under two seconds) out of your control, a pool `pool` tiles
// across to mop; the nearest wall within `wallReach` tiles gets a splash that never comes off, any other `wallOdds` of the time.
// Under `hold` you're holding it: your idle and your walk show it, more and more toward empty.
const BLADDER = { asleep: -2, coffee: 15, smell: 1.5, pee: 1.5, peeSus: 12, peeSeen: 1.8, peeAt: 50, spray: 2.8, pool: 2, wallReach: 1.8, wallOdds: 0.75, hold: 20 };
// passed out (player/needs passOut): time goes by as fast as in your sleep, and the screen is black. You come round at
// `wake` energy; it rests you `rest` × as well as a night in bed. Every `blink` game minutes your eyes come open a crack.
const OUT = { wake: 50, rest: 0.67, blink: 170 };
const BED = { energy: 13.5, stress: -5 };   // a night in your own bed, per game hour (play/verbs sleepAct)

// ── THEIR week: tips, attacks, horror, awareness (them/plan, them/night-attacks, horror/director, them/awareness)
// what you happen to hear. Every slip (one of THEM changing for a moment, anyone at their secret) is heard from within
// `slip.r`, through a wall. Other noises: the first few go by unnoticed, after that only now and then, only from close
// by, and after each one you catch a few more slip past again. Noise gets the ear; a scream gets the "!" marker.
const TIP = { slip: { r: 6 }, noise: { r: 8, p: 0.4, first: [3, 4], gap: [2, 4] }, scream: { r: 11, p: 0.45, first: [2, 3], gap: [1, 3] }, far: { r: 18, p: 0.4, first: [2, 3], gap: [1, 3] } };
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
// Every suspect has four frames: Home, Habit, Body, Biography. Each holds one card, the newest. Whether a card holds up is
// decided only in a confrontation: ✓ or ✗.
const EVIDENCE = {
  frames: ['home', 'habit', 'body', 'biography'],
  oddRate: 0.7,                 // ordinary people who carry one innocent oddity: one card, in one frame, and it holds up
  cleanAt: 50,                  // from here THEY move THEIR things and tidy up after THEMSELVES
  witnessDays: 2,               // someone who saw it change remembers it this long
  scare: 2.4,                   // walk this close to someone at their habit (THEIRS, or a person's secret) and they break off
  // the confrontation (play/confrontation): a fail makes everyone listening `failSus` warier of you; after IT changes in
  // public, people go home early for `fearMins`
  cf: { failSus: 15, fearMins: 1440 },
  aware: { privateKill: 30, hitNoChange: 10, lostFight: 10 },
  huntedNights: 2,              // nights THEY hunt you after you kill one of THEM where nobody saw
  fbiDelay: 25,                 // game minutes from giving up to the grey cars
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
// a card destroyed in person (them/wipe): `after` game minutes from THEIR decision to the visit, `mins` at your computer,
// come within `scare` tiles and they bolt; no police for a fight with them in your flat, nor `grace` game minutes after
// blood (combat/blood): `drops` thrown by an ordinary blow, fanned `spread` radians either side of the line of the blow,
// at `speed` m/s; at most `max` stains kept (the oldest go). A blow you land or take stops everything for `hitStop` real
// seconds and shakes the camera `shake`. Under `trailAt` health you drip where you walk.
const BLOOD = { drops: 12, spread: 0.6, speed: [1.8, 4.2], max: 700, hitStop: 0.07, shake: 0.35, trailAt: 40 };
const WIPE = { after: [120, 480], mins: 30, scare: 4, grace: 10 };
// Biography facts (play/biography): a chat that has one to tell gives it this often; the day's first paper has `paper`
// lines about people; Mom tells one on each of the day's first `mom` calls; rummaging their things turns one up this often
const BIO_FIND = { chat: 0.6, paper: 3, mom: 3, home: 0.9 };

// ── Doors left ajar (town/doors)
// Someone stepping into a room can forget to pull the door to. It stays half open and you can see in through the gap.
// Rarely at midday, more in the morning and evening, most at night; twice as likely when they're up to something.
// Locked doors never: a house door, the shop after hours.
const AJAR = { open: 0.55, mid: 0.035, edge: 0.12, night: 0.2, guilty: 2, min: 60, max: 240 };
