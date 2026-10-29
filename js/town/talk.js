//@ town/talk — Talk: what people say, and the talking action itself
//@ Defines: sneakLine, Q_BLOCKS, quirkNext, soonK, gossipLine, gossip, sawTalk, paidTalk, lostTalk, fishTalk, sayTalk, quirkTalk, talkOfQ, trueTalk, lieTalk, mundaneTalk, …
//@ Uses:    sim/core, core/util, data/lines, town/quirks, world/grid, ui/interface, town/npc-update, town/cast, town/echoes, world/objects, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── talk: what people say. Short, human, and never the whole story.
// a part of the day, the way people say it: never a clock time
const partDay = (m) =>
  m < 600
    ? 'first thing in the morning'
    : m < 690
      ? 'mid-morning'
      : m < 780
        ? 'around midday'
        : m < 900
          ? 'after lunch'
          : m < 1020
            ? 'late in the afternoon'
            : m < 1230
              ? 'in the evening'
              : 'late at night';
const quirkLine = (s, q) => pick(QUIRKS[q].about).replace(/\{s\}/g, s.short);
function sneakLine(s, spot, at, tmr) {
  const t = partDay(at);
  if (spot === 'agnes')
    return s.short + ' sits at that front window ' + t + (tmr ? ' tomorrow' : '') + '. Every day. Watching.';
  const p = HABIT_SPOTS[spot].place.replace(/^his office$/, s.def.fem ? 'her office' : 'his office');
  return pick(tmr ? SNEAK_TMR : SNEAK_ABOUT)
    .replace('{s}', s.short)
    .replace('{p}', p)
    .replace('{t}', t);
}
// when a habit comes round next, in minutes from now: by the parts of their day it lives in
const Q_BLOCKS = {
  loo: ['work'],
  gadgets: ['work', 'clerk', 'courier', 'house'],
  hungry: ['work', 'clerk', 'home'],
  mirror: ['work', 'house'],
  cold: ['work', 'house', 'home'],
  window: ['house', 'home'],
  lamps: ['house', 'stroll'],
  stink: '*',
  night: 'night',
  awake: 'night',
};
function quirkNext(s, q) {
  if (q === 'sneak') {
    const h = habitNextAt(s);
    return h ? h.dt : null;
  }
  const W = Q_BLOCKS[q],
    m = tod();
  if (!W || W === '*') return 0;
  if (W === 'night') return m < 300 ? 0 : 1440 + 60 - m;
  for (const b of s.plan || []) if (b.e > m && W.includes(b.a)) return Math.max(0, b.s - m);
  const b = (s.plan || []).find((x) => W.includes(x.a));
  return b ? 1440 - m + b.s : null;
}
const pairCount = (a, b) =>
  (G.qlog || []).filter((e) => e.q === 'pair' && e.id === a && e.other === b && G.t - e.t < 4 * 1440).length;
// soon counts most: the next few hours, then later today; tomorrow only once it's evening
function soonK(dt) {
  if (dt == null) return 0.4;
  if (dt <= 180) return 3;
  if (dt <= 360) return 1.6;
  if (dt <= 1440 - tod() + 90) return 1;
  return hourF() >= 18 ? 0.9 : 0.25;
}
// a night THEY have something on: decided in the morning, so a man on a bench can feel it coming
const tonightBusy = () =>
  theyStir() &&
  ((G.nightPlan === dayNo() && G.nightYes && hourF() < 23) ||
    (G.attack && G.attack.phase === 'wait') ||
    (G.horror || []).some(
      (e) => !e.done && e.at > G.t && ['alley', 'handle', 'window', 'still', 'lure'].includes(e.k),
    ));
const gatherEve = () => (dayNo() === G.gatherDay - 1 && hourF() >= 10) || (dayNo() === G.gatherDay && hourF() < 1.5);
const fairGame = (s, n) =>
  s && s !== n && !s.gone && !s.slain && !s.exposed && s.def && !s.def.stranger && s.id !== 'lenny';
// ── gossip: what people pass on. A clue, never evidence: it goes on the board as a note under whoever it's about, and
// it often points the wrong way, because people talk about whoever looks odd and the ones THEY got to lie for THEM.
// Each thing is told you once (the small talk and the loud blame once a day): nothing new, and they say so.
const toldYou = (n, key) => {
  const t = n.toldYou && n.toldYou[key];
  return t != null && (key[0] !== '~' || t === dayNo());
};
function gossipLine(n) {
  const fresh = (r) => r && r.text && !toldYou(n, r.key || r.text);
  if (n.wrongTalk > G.t) {
    const r = { text: pick(WRONG_TALK), key: '~wrong', self: true };
    if (fresh(r)) return r;
  }
  for (const f of [sawTalk, paidTalk, lostTalk, fishTalk]) {
    const r = f(n);
    if (fresh(r)) return r;
  }
  const rum = tellRumour(n); // what's going round
  if (rum) return Object.assign(rum, { key: 'rumour:' + rum.subj.id + ':' + rum.text });
  const liar = n.isThem || misled(n) || (bought(n) && chance(bought(n) > 1 ? 1 : 0.7));
  for (let k = 0; k < 6; k++) {
    const r = (liar ? lieTalk(n) : trueTalk(n)) || mundaneTalk(n);
    if (fresh(r)) return r;
  }
  return null;
}
function gossip(n) {
  const r = gossipLine(n);
  if (!r) {
    ui.say(n, pick(TOLD_ALL), 3.5);
    return false;
  }
  (n.toldYou = n.toldYou || {})[r.key || r.text] = r.key && r.key[0] === '~' ? dayNo() : G.t;
  if (r.self) {
    ui.say(n, r.text, 5);
    addNote(n, '“' + r.text + '”', { by: n.id, quote: true });
  } else sayTalk(n, r);
  return true;
}
// what Press used to dig out, said of its own accord. Someone who saw one of THEM change says so, while it's fresh;
// someone bought speaks well of whoever paid; someone THEY got to doesn't remember last night.
function sawTalk(n) {
  const m = backs(n) && them().find((x) => !x.slain && !x.exposed && sawRecently(n, x));
  return m ? { text: pick(GOSSIP_SAW).replace(/\{s\}/g, m.short), subj: m, key: 'saw:' + m.id } : null;
}
function paidTalk(n) {
  const payer = !n.isThem && bought(n) && G.boughtBy && NPC[G.boughtBy[n.id]];
  return payer && !payer.slain
    ? { text: pick(GOSSIP_BOUGHT).replace(/\{s\}/g, payer.short), subj: payer, key: 'paid:' + payer.id }
    : null;
}
function lostTalk(n) {
  const v = G.victimOf && G.victimOf[n.id];
  return v && !n.isThem && G.t - v.at < 3 * 1440
    ? { text: pick(GOSSIP_LOST), subj: n, key: 'lost:' + v.at, self: true }
    : null;
}
// Vic at Pell's knows who buys fish (with the lizards in town): the buyers, and one ordinary customer
function fishTalk(n) {
  if (n.id !== 'vic' || n.isThem || G.faction !== 'lizards' || bought(n) || toldYou(n, '~fish') || chance(0.5))
    return null;
  const buyers = shuffle(
    alive().concat(shuffle(suspects().filter((s) => !s.isThem && s.id !== 'vic' && !s.gone)).slice(0, 1)),
  ).slice(0, 3);
  for (const b of buyers) addNote(b, 'Buys fish at Pell’s.', { by: 'vic' });
  return {
    text: 'Fish? ' + buyers.map((b) => b.short).join(', ') + '. Every week. Raw, some of ’em.',
    key: '~fish',
    loud: true,
  };
}
function sayTalk(n, r) {
  ui.say(n, r.text, 5);
  if (r.subj) {
    noteOnce(r.subj, '“' + r.text + '”', { by: n.id });
    r.subj.clues.rumor++;
    r.subj.rumors++;
  }
  if (r.place || r.loud) hear(null, r.text, n.id);
}
// what this person could pass on: things they saw done, or heard about from somebody who did
function quirkTalk(n) {
  const best = {};
  for (const e of G.qlog || []) {
    const s = NPC[e.id];
    if (!fairGame(s, n) || G.t - e.t > 4 * 1440 || (G.cleared[s.id] && e.q === 'sneak')) continue;
    const mine = e.by.includes(n.id);
    if (!mine && !e.by.length) continue;
    if (e.q === 'pair' && (!fairGame(NPC[e.other], n) || pairCount(e.id, e.other) < 2)) continue;
    const key = n.id + '>' + e.id + ':' + e.q + (e.other || ''),
      told = G.told && G.told[key];
    if (told && G.t - told < 2 * 1440) continue;
    const w = (mine ? 3 : 0.8) * (G.t - e.t < 1440 ? 1.4 : 1) * (e.q === 'pair' ? 0.7 : soonK(quirkNext(s, e.q)));
    if (!best[key] || best[key].w < w) best[key] = { w, e, key };
  }
  return Object.values(best);
}
function talkOfQ(n, c) {
  const s = NPC[c.e.id],
    q = c.e.q;
  (G.told = G.told || {})[c.key] = G.t;
  if (q === 'sneak') {
    const hb = G.habits[s.id],
      nx = habitNextAt(s);
    return hb && nx ? { text: sneakLine(s, hb.spot, nx.at, nx.tmr), subj: s, key: 'q:' + c.key + ':' + dayNo() } : null;
  }
  if (q === 'pair') {
    const o = NPC[c.e.other];
    if (!o) return null;
    const text = pick(PAIR_ABOUT).replace('{a}', s.short).replace('{b}', o.short);
    noteOnce(o, '“' + text + '”', { by: n.id });
    return { text, subj: s, key: 'q:' + c.key + ':' + dayNo() };
  }
  return { text: quirkLine(s, q), subj: s, place: !!QUIRKS[q].place, key: 'q:' + c.key + ':' + dayNo() };
}
function trueTalk(n) {
  const T = G.traits[n.id] || {},
    opts = [];
  const e = echoFor(n, true);
  if (e)
    opts.push([
      2.5,
      () => {
        const l = echoLine(e, true),
          s = e.who && NPC[e.who] && !NPC[e.who].def.stranger ? NPC[e.who] : null;
        return l ? { text: hear(e, l, n.id), subj: s, key: 'echo:' + e.k + ':' + e.t } : null;
      },
    ]);
  const qs = quirkTalk(n);
  if (qs.length) opts.push([4, () => talkOfQ(n, wpick(qs.map((c) => [c.w, c])))]);
  if (chance(T.odd ? 0.25 : 0.05))
    opts.push([
      1,
      () => {
        const s = oddLooking(n);
        return s ? { text: pick(BLAME).replace(/\{s\}/g, s.short), subj: s, loud: true, key: '~blame:' + s.id } : null;
      },
    ]); // the odd ones see things, and what they see is whoever looks odd
  opts.push([0.5, () => mundaneTalk(n)]);
  const f = wpick(opts);
  return (f && f()) || null;
}
// THEM, and anybody THEY've got to: always about an ordinary person, and the loud stuff comes from here
function lieTalk(n) {
  const marks = suspects().filter((x) => fairGame(x, n) && !x.isThem);
  const s = pick(marks);
  if (!s) return null;
  const r = Math.random(),
    key = '~lie:' + s.id;
  if (r < (n.isThem ? 0.45 : 0.25)) return { text: pick(BLAME).replace(/\{s\}/g, s.short), subj: s, loud: true, key };
  if (r < 0.82) {
    // the same sort of thing anyone says: one of the mark's own habits, or one of THEIRS pinned on the mark
    const own = (G.quirks[s.id] || []).filter((q) => QUIRKS[q].who(s)),
      theirs = (G.quirks[n.id] || [])
        .concat(...them().map((m) => G.quirks[m.id] || []))
        .filter((q) => QUIRKS[q].who(s));
    const q =
      own.length && chance(0.45)
        ? pick(own)
        : theirs.length
          ? pick(theirs)
          : pick(Object.keys(QUIRKS).filter((k) => QUIRKS[k].who(s)));
    if (q) return { text: quirkLine(s, q), subj: s, place: !!QUIRKS[q].place, key };
  }
  const hb = G.habits[s.id],
    nx = chance(0.4) && habitNextAt(s); // sometimes the real time, sometimes one that leads nowhere
  const at = nx ? nx.at : Math.round(clamp(tod() + rand(40, 240), 8.5 * 60, 21 * 60) / 5) * 5;
  return {
    text: sneakLine(s, hb && chance(0.5) ? hb.spot : pick(HABIT_SPOTS_FOR(s)), at, nx ? nx.tmr : tod() > 19 * 60),
    subj: s,
    key,
  };
}
// nothing in it at all: who owes who, who microwaves fish
function mundaneTalk(n) {
  const s = pick(suspects().filter((x) => fairGame(x, n)));
  if (!s) return null;
  return { text: pick(RUMORS.mundane).replace('{s}', s.short), subj: s, key: '~small' };
}
// who people talk about: whoever looks odd. Someone with a secret of their own, or habits people notice, more often.
function oddLooking(n) {
  const opts = suspects()
    .filter((x) => fairGame(x, n))
    .map((x) => [1 + (G.odd && G.odd[x.id] ? 1.5 : 0) + 0.5 * (G.quirks[x.id] || []).length, x]);
  return opts.length ? wpick(opts) : null;
}

// ── chat: about themselves. A third of it is nothing at all; the rest says something, never quite what.
// THEY let THEIR own habits slip, and THEIR plans, lazily hidden; ordinary people explain theirs, or don't.
function selfLine(n, q) {
  const S = QUIRKS[q].self;
  return pick((n.isThem && S[G.faction]) || S.man);
}
function slipLine(n) {
  const ph = G.phase || 1,
    k = ph <= 2 ? 0 : ph <= 3 ? 1 : 2;
  return pick(SLIPS[G.faction][k]);
}
function chatLine(n) {
  n.recent = n.recent || [];
  let l = null;
  for (let k = 0; k < 5; k++) {
    l = chatPick(n);
    if (!n.recent.includes(l)) break;
  }
  n.recent.push(l);
  if (n.recent.length > 4) n.recent.shift();
  return l;
}
// a note under a polaroid, unless that same person already has it from the same mouth
function noteOnce(n, text, o) {
  if (!n.notes.slice(-8).some((x) => x.text === text && x.by === (o && o.by))) addNote(n, text, o);
}
function chatPick(n) {
  const T = G.traits[n.id] || {};
  if (n.wrongTalk > G.t) {
    const l = pick(WRONG_TALK);
    noteOnce(n, '“' + l + '”', { by: n.id, quote: true });
    return l;
  }
  if (chance(0.33)) return chance(0.5) ? pick(SMALL) : viewLine(n);
  const opts = [];
  const e = echoFor(n, false);
  if (e)
    opts.push([
      1,
      () => {
        const l = echoLine(e, false);
        return l ? { text: hear(e, l, n.id), keep: false } : null;
      },
    ]);
  for (const q of G.quirks[n.id] || []) opts.push([n.isThem ? 2.2 : 2, () => ({ text: selfLine(n, q) })]);
  if (n.isThem) {
    if (theyStir()) opts.push([1.3, () => ({ text: slipLine(n) })]);
    if (tonightBusy()) opts.push([1.5, () => ({ text: pick(TONIGHT.attack) })]);
    if (gatherEve()) opts.push([1.5, () => ({ text: pick(TONIGHT.gather) })]);
    opts.push([0.4, () => ({ text: pick(WEIRD_THEM) })]);
  } else if (T.odd) opts.push([1.2, () => ({ text: pick(WEIRD) })]);
  const hb = G.habits[n.id];
  if (hb && !G.cleared[n.id]) {
    const sp = (n.isThem && G.cover[n.id] ? G.cover[n.id] : hb).spot;
    if (PLACE_SELF[sp])
      opts.push([
        0.8,
        () => ({
          text:
            n.id === 'hale' && sp === 'closet'
              ? 'The supply closet’s the one place nobody comes looking for me.'
              : PLACE_SELF[sp],
        }),
      ]);
  } // THEY give the cover story
  const f = wpick(opts),
    r = f && f();
  if (!r) return pick(SMALL);
  if (r.keep !== false) noteOnce(n, '“' + r.text + '”', { by: n.id, quote: true });
  return r.text;
}

// ── Lenny: the first few times, how it all works. After that a third of it is warning, a third how it works, and a
function lennyTip() {
  let line;
  if (G.lennyHint < LENNY_HINTS.length) line = LENNY_HINTS[G.lennyHint++];
  else line = pick(LENNY_HINTS.filter((l) => l !== '#PLACE' || covert().length));
  if (line === '#FACTION') line = LENNY_FACTION[clueFaction()]; // Lenny is right more often than not
  if (line === '#PLACE') {
    const c = pick(covert()) || NPC.hale;
    line =
      c.id === 'vic'
        ? 'One of ’em sells you milk.'
        : c.id === 'agnes'
          ? 'One of ’em lives next door to you.'
          : c.id === 'ray'
            ? 'One of ’em brings everybody’s post.'
            : 'One of ’em sits near you at work.';
  }
  G.leads.push(line);
  if (G.leads.length > 6) G.leads.shift();
  return line;
}
function lennyWarn() {
  const ph = G.phase || 1,
    opts = [];
  if (tonightBusy()) opts.push([3, 'tonight']);
  if (G.aware >= 50) opts.push([2.5, 'known']);
  else if (G.aware >= 25) opts.push([1.5, 'noticed']);
  if (ph >= 4) opts.push([2, 'late']);
  else if (ph >= 3) opts.push([1.2, 'mid']);
  else opts.push([1, 'early']);
  const lost = (G.victims || []).length;
  if (lost) opts.push([1, 'gone']);
  const k = wpick(opts);
  if (k === 'gone')
    return 'That’s ' + (lost === 1 ? 'one' : lost === 2 ? 'two' : String(lost)) + ' gone now. Who’s next?';
  return pick(LENNY_WARN[k]);
}
// what he's seen: people in the park of an evening, people about at night, a light that stays on, a window with
// somebody in it, and the things THEY did out of doors
function lennySaw() {
  const said = G.lennySaid || (G.lennySaid = {}),
    out = [];
  const add = (key, w, line) => {
    if (!said[key] || G.t - said[key] > 2 * 1440) out.push([w, { key, line }]);
  };
  const groups = {};
  for (const e of G.lsaw || [])
    if (G.t - e.t < 4 * 1440) (groups[e.id + '|' + e.k] = groups[e.id + '|' + e.k] || []).push(e);
  for (const g in groups) {
    const es = groups[g],
      e = es[es.length - 1],
      s = NPC[e.id];
    if (!s || s.gone || s.slain) continue;
    const many = new Set(es.map((x) => x.day)).size >= 2,
      nm = s.short,
      wh = e.where === 'Outside' ? 'round town' : placeIn(e.where);
    if (e.k === 'eve')
      add(
        g + many,
        many ? 1.4 : 0.8,
        e.where === 'The park'
          ? many
            ? 'I see ' + nm + ' every evening here in the park. Same time, same bench.'
            : nm + ' sat in the park last evening. An hour. Just sat there.'
          : many
            ? nm + ' goes up and down ' + wh + ' every evening. Up and down.'
            : 'Saw ' + nm + ' on ' + wh + ' last evening. In a hurry.',
      );
    else if (e.k === 'night')
      add(
        g + many,
        many ? 2 : 1.4,
        many
          ? nm + ' walks past here at night. Round and round. Every night.'
          : 'Saw ' + nm + ' out at night. Two, three in the morning. Like a lunatic.',
      );
    else if (e.k === 'alley')
      add(
        'alley' + many,
        many ? 2.2 : 1.6,
        many
          ? 'Someone’s snooping behind Pell’s quite often in the night. Didn’t see the face.'
          : 'Somebody was creeping about behind Pell’s last night. Couldn’t see who.',
      );
    else if (e.k === 'lamp') add(g, 1.6, nm + ' stood under that lamp half the night. Looking straight up into it.');
    else if (e.k === 'thing')
      add('thing' + e.day, 2.4, 'Something walked through ' + wh + ' in the night. Like a man. It wasn’t one.');
  }
  // the long view from the bench: lit windows across the park, a face in one
  const LQ = {
    night: '{s} walks past here at night. Round and round.',
    lamps: '{s} stood under a lamp half the night. Looking straight up.',
    window: '{s} stands at that window for hours. I see the shape from here.',
    awake: '{s}’s light’s on all night. Every night. I can see it from my bench.',
  };
  for (const e of G.qlog || [])
    if (LQ[e.q] && e.by.includes('lenny') && G.t - e.t < 4 * 1440 && fairGame(NPC[e.id], NPC.lenny))
      add('q' + e.id + e.q, 1.3, LQ[e.q].replace('{s}', NPC[e.id].short));
  for (const id of G.victims || []) {
    const s = NPC[id];
    if (s)
      add(
        'v' + id,
        2.5,
        s.gone === 'taken'
          ? 'THEY took ' + s.short + '. I saw the light come down.'
          : 'THEY got ' + s.short + '. Nobody listens to me. Nobody.',
      );
  }
  for (const e of G.events || []) {
    if (G.t - e.t > 2 * 1440) continue;
    if (e.k === 'watch')
      add(
        'w' + Math.floor(e.t / 1440),
        2.6,
        'Somebody stood looking at your window the whole night. Didn’t move once.',
      );
    else if (e.k === 'stalk' && NPC[e.who])
      add(
        's' + e.who + Math.floor(e.t / 1440),
        2.4,
        'I saw one of THEM follow ' + NPC[e.who].short + ' home. Right up to the door.',
      );
  }
  const c = out.length ? wpick(out) : null;
  if (!c) return null;
  said[c.key] = G.t;
  G.leads.push(c.line);
  if (G.leads.length > 6) G.leads.shift();
  return c.line;
}
function lennyHint() {
  if (gatherEve() && G.gatherTip !== G.gatherDay && G.lennyHint >= 2 && chance(0.75)) {
    G.gatherTip = G.gatherDay;
    G.leads.push('THEY meet tonight · 1:00 · behind Pell’s');
    if (G.leads.length > 6) G.leads.shift();
    return ui.say(NPC.lenny, 'Tonight. 1 a.m. Behind Pell’s. Don’t let ’em see you.', 5);
  }
  // no limit on asking: once everything he has today is said, he says so
  const said = G.lennyLines || (G.lennyLines = {});
  let line = null;
  for (let k = 0; k < 6 && !line; k++) {
    const r = Math.random(),
      l = G.lennyHint < 3 || r < 0.34 ? lennyTip() : r < 0.67 ? lennyWarn() : lennySaw() || lennyWarn();
    if (l && said[l] !== dayNo()) line = l;
  }
  if (!line) return ui.say(NPC.lenny, pick(LENNY_TOLD), 4);
  said[line] = dayNo();
  ui.say(NPC.lenny, line, 5.5);
}
// what Lenny keeps an eye on, every few minutes, from his bench: whoever's out of doors after five, and after dark
function lennyLook() {
  const L = NPC.lenny;
  if (!L || !L.onMap) return;
  G.lsaw = G.lsaw || [];
  const h = hourF(),
    k0 = h >= 23 || h < 5.5 ? 'night' : h >= 17 ? 'eve' : null,
    day = dayNo(G.t - 6 * 60);
  for (const s of suspects()) {
    if (!s.onMap || s.gone || s.slain || roomAt(s.x, s.z) || Math.hypot(s.x - L.x, s.z - L.z) > 21) continue;
    let k = s.trueForm ? 'thing' : k0;
    if (!s.trueForm && s.queue[0] && s.queue[0].quirk === 'lamps') k = 'lamp';
    if (!k) continue;
    if (k === 'night' && s.x >= 25 && s.x <= 30 && s.z <= 12) k = 'alley';
    if (k === 'eve' && placeName(s.x, s.z) !== 'The park') continue; // walking home down Main street is nothing
    if (G.lsaw.some((e) => e.id === s.id && e.k === k && e.day === day)) continue;
    G.lsaw.push({ id: s.id, k, day, t: G.t, where: placeName(s.x, s.z) });
    if (G.lsaw.length > 60) G.lsaw.shift();
  }
}
const INV_SMELL = {
  lizards: 'Wet in here. A smell like a fish market.',
  aliens: 'The air in here smells of hot wire.',
  zombies: 'Something sweet and rotten, under the floor.',
};
// every game minute: smells at doors (you, and whoever walks past), and Lenny, every ten
function talkTick() {
  if (!G.started || G.over || !G.quirks) return;
  const P = PLAYER;
  for (const h of HOUSE_DEFS) {
    const sm = smellOf(h.id);
    if (!sm) continue;
    const inside = P.onMap && (roomAt(P.x, P.z) || {}).house === h.id,
      near = P.onMap && Math.hypot(P.x - h.out[0] - 0.5, P.z - h.out[1] - 0.5) < 2.4;
    G.smelt = G.smelt || {};
    const k = h.id + (inside ? 'i' : 'o'),
      owner = NPC[h.id];
    if ((inside || near) && G.smelt[k] !== dayNo() && !G.sleeping && !G.away) {
      G.smelt[k] = dayNo();
      const what = inside
        ? sm.k === 'socks'
          ? 'Socks drying on the radiator. Dozens of them.'
          : sm.inv
            ? INV_SMELL[clueFaction()]
            : sm.k === 'zombies'
              ? 'Flies. Something sweet and rotten, and no bin to blame.'
              : 'Fish bones under the radiator. Picked clean.'
        : 'A bad smell from ' + (owner ? owner.short + '’s' : 'the') + ' front door.';
      ui.note('smell', what, 'onto');
      if (owner) {
        addNote(owner, what, { by: 'you' });
        (G.qyou = G.qyou || {})[owner.id + ':stink'] = G.qyou[owner.id + ':stink'] || G.t;
      }
    }
  }
  if (Math.floor(G.t) % 10) return;
  for (const h of HOUSE_DEFS) {
    if (!smellOf(h.id)) continue;
    const by = suspects()
      .filter(
        (w) =>
          w.id !== h.id &&
          w.onMap &&
          !asleep(w) &&
          !w.trueForm &&
          (Math.hypot(w.x - h.out[0] - 0.5, w.z - h.out[1] - 0.5) < 3.5 || (roomAt(w.x, w.z) || {}).house === h.id),
      )
      .map((w) => w.id);
    if (by.length) logQ(h.id, 'stink', by);
  }
  lennyLook();
}
// what you can see of it: socks on a rack by the door and on the radiator, THEIR flies, THEIR fish bones
function sockRackAt(h) {
  if (h.rack !== undefined) return h.rack;
  const N = h.row === 'N',
    z = N ? h.out[1] + 0.2 : h.out[1] + 0.8;
  for (const dx of [1, -1]) {
    const x = h.out[0] + dx;
    if (!OBJ.some((o) => o.x <= x && x < o.x + (o.w || 1) && o.z <= Math.floor(z) && Math.floor(z) < o.z + (o.h || 1)))
      return (h.rack = [x + 0.5, z]);
  }
  return (h.rack = null);
}
function quirkDraw() {
  if (!G || !G.quirks) return;
  const sock = [
    [0.92, 0.9, 0.84],
    [0.78, 0.2, 0.17],
    [0.88, 0.72, 0.26],
  ];
  for (const h of HOUSE_DEFS) {
    const sm = smellOf(h.id),
      own = NPC[h.id];
    if (own && !own.isThem && !own.gone && hasQ(own, 'stink')) {
      const r = OBJ_BY_ID['rad_' + h.id];
      if (r && visAt(r.cx, r.cz) > 0.1) {
        const M = M4.mul(M4.trans(r.cx, 0, r.cz), M4.rotY(FACE_ANG[r.face]));
        for (let i = 0; i < 3; i++) {
          part(M, -0.28 + i * 0.28, 0.58, -0.27, 0.13, 0.22, 0.045, 'box', sock[i]);
          part(M, -0.28 + i * 0.28 + 0.045, 0.47, -0.27, 0.2, 0.07, 0.045, 'box', sock[i]);
        }
      }
      const at = sockRackAt(h);
      if (at && visAt(at[0], at[1]) > 0.1) {
        const M = M4.trans(at[0], 0, at[1]);
        for (const s of [-1, 1]) part(M, s * 0.36, 0.45, 0, 0.035, 0.9, 0.035, 'box', [0.42, 0.4, 0.36]);
        part(M, 0, 0.88, 0, 0.78, 0.03, 0.03, 'box', [0.5, 0.48, 0.42]);
        for (let i = 0; i < 3; i++) {
          part(M, -0.22 + i * 0.22, 0.76, 0, 0.12, 0.22, 0.04, 'box', sock[(i + 1) % 3]);
          part(M, -0.22 + i * 0.22 + 0.04, 0.65, 0, 0.19, 0.07, 0.04, 'box', sock[(i + 1) % 3]);
        }
      }
    }
    if (sm && sm.k === 'lizards') {
      // fish bones: on the step where one of THEM came in, under the radiator where one of THEM lives
      const r = OBJ_BY_ID['rad_' + h.id];
      const at = sm.inv
        ? [h.out[0] + 0.5, h.row === 'N' ? h.out[1] + 0.25 : h.out[1] + 0.75]
        : r
          ? [r.cx + (h.row === 'N' ? 0.2 : -0.2), r.cz + 0.55]
          : null;
      if (at && visAt(at[0], at[1]) > 0.1) {
        const M = M4.mul(M4.trans(at[0], 0, at[1]), M4.rotY(hash2(h.x0, 3, 1) * TAU));
        part(M, 0, 0.012, 0, 0.3, 0.018, 0.022, 'box', [0.86, 0.84, 0.76]);
        for (let i = -2; i <= 2; i++) part(M, i * 0.05, 0.012, 0, 0.012, 0.012, 0.13, 'box', [0.82, 0.8, 0.72]);
        part(M, 0.17, 0.014, 0, 0.07, 0.03, 0.06, 'box', [0.7, 0.68, 0.6]);
      }
    }
  }
}
// THEIR flies, every frame: indoors where one of THEM lives, on the step where one of THEM came in
function quirkFx() {
  if (!G || !G.quirks || !G.started) return;
  for (const h of HOUSE_DEFS) {
    const sm = smellOf(h.id);
    if (!sm || sm.k !== 'zombies') continue;
    const x = h.out[0] + 0.5,
      z = h.out[1] + 0.5;
    if (sm.inv && visAt(x, z) > 0.25) flyGlints(x, z, 5); // out on the step only where THEY came in
    const r = OBJ_BY_ID['rad_' + h.id];
    if (r && visAt(r.cx, r.cz) > 0.25) flyGlints(r.cx, r.cz, 6);
  }
}
function hourlyEvents(h) {
  const home = inRoomSet(PLAYER, (r) => r.home);
  if (h >= 0 && h <= 4 && G.aware >= 40 && home && !G.phoneRing && chance(0.3)) {
    G.phoneRing = { until: G.t + 12 };
    ui.note('phone', 'Phone ringing', 'warn');
  }
  if (h >= 1 && h <= 3 && G.aware >= 55 && home && !G.watcher && chance(0.4)) {
    const c = pick(them().filter((x) => !x.exposed && atHome(x) && !x.hideUntil && !x.trueForm));
    if (c) {
      G.watcher = c.id;
      overlay(c.plan, tod(), tod() + 100, 'watch');
      c.thinkCd = 0;
      echo('watch', { who: c.id, x: WATCH_SPOT[0], z: WATCH_SPOT[1], quiet: true });
    }
  }
  if (h >= 7 && h <= 20) {
    spawnStranger();
    if (chance(0.5)) spawnStranger();
  } else if (h >= 21 || h < 2) {
    if (chance(0.6)) spawnStranger();
  } else if (chance(0.15)) spawnStranger('walker');
}
function spawnStranger(kind) {
  const s = CHARS.find((c) => c.def.stranger && !c.def.officer && !c.onMap);
  if (!s) return null;
  const h = hourF();
  kind =
    kind ||
    (h >= 21 || h < 3
      ? pick(['drunk', 'drunk', 'walker'])
      : chance((h >= 6 && h < 9) || (h >= 17 && h < 20) ? 0.1 : 0.03)
        ? 'jogger'
        : pick(['walker', 'walker', 'payphone', 'delivery'])); // a jogger now and then, mostly early or after work
  const fromW = chance(0.5),
    row = chance(0.5) ? 0 : 1;
  const [x, z] = EDGES[fromW ? 'W' : 'E'][row],
    [tx, tz] = EDGES[fromW ? 'E' : 'W'][row];
  placeChar(s, x, z);
  s.onMap = true;
  s.queue = [];
  s.shown = 0;
  s.spd = rand(0.85, 1.1);
  s.kind = kind;
  s.drunk = kind === 'drunk';
  s.tell = null;
  s.fleeing = null;
  if (kind === 'jogger') {
    s.spd = 0.85;
    enqueue(s, goAct([tx, tz], { label: 'Jogging', run: true }));
  } else if (kind === 'drunk') {
    s.spd = 0.5;
    enqueue(s, [
      goAct(streetSpot(), { label: 'Walking' }),
      waitAct({ dur: rand(2, 6), anim: 'idle' }),
      goAct([tx, tz], { label: 'Walking' }),
    ]);
  } else if (kind === 'payphone')
    enqueue(s, [
      useAct(s, objOfType('payphone'), { label: 'Phone', anim: 'phone', dur: rand(5, 15), maxWait: 6 }),
      goAct([tx, tz], { label: 'Walking' }),
    ]);
  else if (kind === 'delivery')
    enqueue(s, [
      goAct([35, 13], { label: 'Delivery' }),
      waitAct({ dur: rand(2, 4), anim: 'use', onStart: (c) => (c.tdir = Math.PI) }),
      goAct([x, z], { label: 'Walking' }),
    ]);
  else enqueue(s, goAct([tx, tz], { label: 'Walking' }));
  return s;
}
// in daylight there should be people about: when the street empties, someone passes through
function streetTick() {
  if (Math.floor(G.t) % 10) return;
  const h = hourF();
  if (h < 7.5 || h > 20.5) return;
  const out = CHARS.filter((c) => !c.isPlayer && c.onMap && !roomAt(c.x, c.z)).length;
  if (out < 4) spawnStranger();
}
function talkAct(n, kind) {
  const K = SOC[kind];
  return mkAct({
    kind: 'talk',
    soc: kind,
    target: n,
    label: K.label,
    icon: K.icon,
    dur: K.dur,
    anim: 'talk',
    fx: K.fx,
    maxWait: 4,
    onStart: (c, a) => {
      a.win = chance(socialChance(n));
      if (G.inv.foilOn && chance(0.5)) ui.bubble(n, 'question', 'speech', 2);
    },
    onTick: (c, a, dt) => {
      // halfway along the bar they come out with it, and the line stays up, with no faces over it, while you're still there
      if (K.mid && !a.said && a.t >= K.dur / 2) {
        a.said = true;
        ui.unbubble(c);
        ui.unbubble(n);
        K.res(n, a.win, a);
      }
      if (a.said) return ui.holdSay(n);
      a.bt = (a.bt || 0) + dt;
      if (a.bt > 1.7) {
        a.bt = 0;
        a.flip = !a.flip;
        ui.bubble(
          a.flip ? c : n,
          kind === 'confront' ? (a.flip ? 'exclaim' : 'question') : pick(TOPICS),
          'speech',
          1.5,
        );
      }
    },
    onEnd: (c, a, ok) => {
      if (ok && !a.said) K.res(n, a.win, a);
    },
  });
}
