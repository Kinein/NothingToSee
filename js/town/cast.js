//@ town/cast — The people of Wexley and the three factions
//@ Defines: CAST, FACTIONS, CREATURE, TF_CHANGE, CREATURE_LOOK, TELL_NOTE, setupCast, setupOfficer, setupPlayer, objOfType
//@ Uses:    core/util, sim/core, sim/characters, chase/fbi, world/objects
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the people of Wexley ─────────────────────────
// prettier-ignore
const CAST = [
  { id: 'hale', name: 'Gordon Hale', short: 'Mr. Hale', role: 'Manager', plan: 'boss', edge: 'W', chair: 'chairBoss', look: { skin: 0xcfa58c, hair: 'side', hairCol: 0x8d8d8d, top: 0x2f394d, bottom: 0x22262f, h: 1.04, w: 1.14, sleeves: 1, outfit: 'tie', acc: 0x7a2a2a, watch: 1 } },
  { id: 'denise', fem: 1, name: 'Denise Park', role: 'Accounts', plan: 'office', edge: 'W', chair: 'chairA1', look: { skin: 0xe0bea3, hair: 'bun', hairCol: 0x4e2a1a, top: 0x74485a, bottom: 0x2a2a30, h: 0.97, w: 0.95, sleeves: 1, outfit: 'cardigan', acc: 0xd8cdb8, skirt: 1, earrings: 'gold', brooch: 1 } },
  { id: 'martin', name: 'Martin Kowalczyk', short: 'Martin', role: 'IT', plan: 'office', edge: 'E', chair: 'chairB1', look: { skin: 0xd6b59e, hair: 'short', hairCol: 0xa0844f, top: 0x5b6858, bottom: 0x3a3a3a, h: 1.0, w: 1.12, beard: 1, glasses: 1, lanyard: 1 } },
  { id: 'priya', fem: 1, name: 'Priya Raman', role: 'Analyst', plan: 'office', edge: 'E', chair: 'chairA3', look: { skin: 0x9a6a4e, hair: 'long', hairCol: 0x15100e, top: 0x3b6767, bottom: 0x26262b, h: 0.95, w: 0.92, sleeves: 1, outfit: 'scarf', acc: 0xb08a3a, earrings: 'gold', belt: 1 } },
  { id: 'earl', name: 'Earl Fitch', role: 'Clerk', plan: 'office', edge: 'W', chair: 'chairB2', look: { skin: 0xcaa48c, hair: 'bald', hairCol: 0x9a958c, top: 0xc9c2ae, bottom: 0x4a4236, h: 1.07, w: 0.9, sleeves: 1, outfit: 'vest', acc: 0x6b5a3e, glasses: 1, belt: 1, watch: 1 } },
  { id: 'joanne', fem: 1, name: 'Joanne Webb', role: 'Reception', plan: 'office', edge: 'E', chair: 'chairB3', look: { skin: 0xe6c7ae, hair: 'long', hairCol: 0xb39d64, top: 0x94473a, bottom: 0x2e2a28, h: 0.96, w: 0.94, skirt: 1, necklace: 'gold', earrings: 'gold' } },
  { id: 'vic', name: 'Vic Moreau', short: 'Vic', role: 'Shop', plan: 'clerk', edge: 'E', look: { skin: 0x7a523f, hair: 'short', hairCol: 0x0f0f0f, top: 0xb9b3a4, bottom: 0x2a2a2a, h: 1.02, w: 1.1, outfit: 'apron', acc: 0x2e4a33 } },
  { id: 'ray', name: 'Ray Kessler', short: 'Ray', role: 'Courier', plan: 'courier', edge: 'E', look: { skin: 0xc49274, hair: 'short', hairCol: 0x3a2a1a, top: 0x7a4a2c, bottom: 0x2e3440, h: 1.01, w: 1.0, sleeves: 1, outfit: 'jacket', acc: 0x4f3220, hat: 'beanie', hatCol: 0x2f4a6a, bag: 1, belt: 1 } },
  { id: 'agnes', fem: 1, name: 'Agnes Dorn', role: 'Neighbour', plan: 'agnes', look: { skin: 0xe4c9b9, hair: 'bun', hairCol: 0xd6d2cc, top: 0x7a6787, bottom: 0x4a4048, h: 0.9, w: 0.98, sleeves: 1, outfit: 'cardigan', acc: 0xcdbfae, glasses: 1, skirt: 1, necklace: 'pearl', earrings: 'pearl' } },
  { id: 'lenny', name: 'Lenny', short: 'Lenny', role: 'Park', plan: 'lenny', never: 1, look: { skin: 0xae896f, hair: 'messy', hairCol: 0x5f5040, top: 0x4c3d2c, bottom: 0x3a3328, h: 1.0, w: 1.06, sleeves: 1, beard: 1, outfit: 'coat', hat: 'beanie', hatCol: 0x6a2a24 } },
];
// prettier-ignore
const FACTIONS = {
  aliens: { name: 'aliens', label: 'Aliens', icon: 'alien', skin: [0.55, 0.63, 0.6], eye: [0.55, 1.0, 0.7], tells: ['hum', 'speak', 'flicker'], ritual: 'hum', item: 'scorch' },
  lizards: { name: 'lizards', label: 'Lizards', icon: 'lizard', skin: [0.42, 0.56, 0.32], eye: [1.0, 0.82, 0.2], slit: 1, tells: ['tongue', 'shed', 'bask'], ritual: 'bask', item: 'skin' },
  zombies: { name: 'the dead', label: 'The Dead', icon: 'skull', skin: [0.52, 0.56, 0.46], eye: [0.82, 0.86, 0.78], tells: ['feed', 'limb', 'stare'], ritual: 'stare', item: 'finger' },
};
const CREATURE = {
  aliens: { body: [0.27, 0.31, 0.33], skin: [0.6, 0.68, 0.66] },
  lizards: { body: [0.15, 0.22, 0.11], skin: [0.36, 0.5, 0.22] },
  zombies: { body: [0.19, 0.18, 0.15], skin: [0.5, 0.53, 0.42] },
};
const TF_CHANGE = 6; // game minutes for the change: three seconds at normal speed, enough to raise a camera
const CREATURE_LOOK = {
  aliens: {
    s: 1.0,
    skin: [0.6, 0.64, 0.63],
    dark: [0.27, 0.3, 0.32],
    eye: [0.008, 0.01, 0.014],
    glow: [0.35, 1.0, 0.68],
  },
  lizards: {
    s: 1.1,
    skin: [0.25, 0.34, 0.15],
    dark: [0.1, 0.14, 0.07],
    belly: [0.4, 0.4, 0.27],
    eye: [1.0, 0.7, 0.1],
    claw: [0.86, 0.8, 0.62],
    teeth: [0.88, 0.84, 0.7],
    frill: [0.5, 0.07, 0.06],
  },
  zombies: {
    s: 1.04,
    skin: [0.44, 0.47, 0.37],
    dark: [0.18, 0.17, 0.14],
    rag: [0.19, 0.17, 0.15],
    eye: [0.86, 0.92, 0.8],
    rib: [0.68, 0.64, 0.53],
    blood: [0.3, 0.025, 0.03],
    cavity: [0.09, 0.025, 0.025],
    rot: [0.3, 0.33, 0.2],
    teeth: [0.74, 0.69, 0.55],
  },
};
const TELL_NOTE = {
  hum: 'Floating. Eyes lit.',
  speak: 'Clicking at the wall.',
  flicker: 'Face slipped.',
  tongue: 'Tongue. Too long.',
  shed: 'Peeling off skin.',
  bask: 'Hugging the radiator.',
  feed: 'Eating raw meat.',
  limb: 'Arm fell off.',
  half: 'Half changed. For a second.',
  stare: 'Swaying in the corner.',
  true: 'Changed. Mid-change.',
};

function setupCast() {
  for (const def of CAST) {
    const n = makeChar(def);
    NPC[def.id] = n;
    n.onMap = false;
  }
  setupOfficer();
  setupAgents();
  for (let k = 0; k < 5; k++) {
    const n = makeChar({
      id: 'stranger' + k,
      name: 'Stranger',
      short: 'Stranger',
      role: 'Passing by',
      stranger: true,
      look: {
        skin: pick([0xd8b399, 0xa87a5c, 0x7a523f, 0xe8c9b0]),
        hair: pick(['short', 'long', 'bald', 'side']),
        hairCol: pick([0x1a1410, 0x5a3a20, 0x8a7a60]),
        top: pick([0x3a3e46, 0x5a4a3a, 0x2e3a2e, 0x4a2e2e, 0x6a6a62]),
        bottom: pick([0x22252a, 0x3a342c]),
        h: rand(0.95, 1.05),
        w: rand(0.95, 1.1),
        sleeves: 1,
        outfit: pick(['coat', 'coat', 'jacket', '']),
        acc: 0x2a2a2a,
        hat: chance(0.3) ? 'beanie' : '',
        hatCol: 0x2a2a30,
      },
    });
    n.onMap = false;
  }
}
function setupOfficer() {
  const o = makeChar({
    id: 'officer',
    name: 'Officer',
    short: 'Officer',
    role: 'Police',
    stranger: true,
    officer: true,
    look: {
      skin: 0xc79a80,
      hair: 'short',
      hairCol: 0x1a1410,
      top: 0x1f2a44,
      bottom: 0x1a2030,
      h: 1.04,
      w: 1.08,
      sleeves: 1,
      outfit: 'tie',
      acc: 0x0f1424,
      hat: 'beanie',
      hatCol: 0x141a2c,
      badge: 1,
      belt: 1,
    },
  });
  o.onMap = false;
  NPC.officer = o;
}
function setupPlayer(name) {
  PLAYER = makeChar({
    id: 'player',
    name,
    role: 'You',
    player: true,
    look: {
      skin: 0xd8b399,
      hair: 'short',
      hairCol: 0x2a1f17,
      top: 0x8a6e36,
      bottom: 0x2d3340,
      h: 1.0,
      w: 1.0,
      sleeves: 1,
      outfit: 'jacket',
      acc: 0x26282e,
      belt: 1,
      watch: 1,
    },
  });
  PLAYER.needs = { hunger: 42, energy: 82, bladder: 55, stress: 22 };
}
const suspects = () => CAST.filter((d) => !d.never).map((d) => NPC[d.id]);
const them = () => G.them.map((id) => NPC[id]);
function objOfType(t, filter) {
  return OBJ.find((o) => o.type === t && (!filter || filter(o)));
}
