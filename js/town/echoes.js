//@ town/echoes — Echoes: what happened, where, who saw
//@ Defines: ECHO, ECHO_ORDER, echo, placeIn, whenWord, echoLine, hear, echoFor, morningPaper
//@ Uses:    sim/core, gfx/renderer, core/util, data/lines, town/suspicion, play/photos
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── echoes: what happened, who did it, where, when, and who saw it
// news: a headline, never a name · heard: a place and a time · named: who, only from someone who saw it
const ECHO = {
  fight: { news: 'Scuffle reported near {area}', heard: 'There was a fight near {where}, {when}.', named: 'You and {who}, near {where}. Everyone heard.' },
  trueform: { news: { aliens: 'Tall figure “glowed,” says resident', lizards: '“It wasn’t a dog,” insists resident', zombies: 'Something “wrong” seen walking at night' }, heard: 'Something big moved near {where}, {when}. Not a person.', named: 'It was {who}. Changed, right there near {where}.' },
  exposed: { news: 'Residents describe “thing” in town', heard: 'People are screaming about {where}, {when}.', named: '{who} was one of THEM. Everyone saw.' },
  unmask: { news: 'Local “not human,” claim witnesses', heard: 'Screaming near {where}, {when}.', named: '{who}. It was {who} all along.' },
  caught: { news: 'Missing: one resident', heard: 'An awful noise near {where}, {when}. Then nothing.', named: '{who} is gone. Something happened near {where}.' },
  flee: { news: null, heard: 'Someone ran off from {where}, {when}. Like something was after them.', named: '{who} ran off from {where}, {when}. White as a sheet.' },
  ridicule: { news: null, heard: 'Somebody got laughed at near {where}, {when}.', named: '{who} made a fool of you. People liked it.' },
  cleanup: { news: 'Night cleaner praised', heard: 'Someone scrubbed {where} spotless, {when}.', named: '{who} was cleaning {where}, {when}. Never cleans.' },
  theft: { news: 'Door-to-door callers “very polite”', heard: 'Your stairwell door was open, {when}.', named: '{who} was on your stairs, {when}.' },
  files: { news: 'Meridian Records loses paperwork', heard: 'Files went missing at Meridian, {when}.', named: '{who} was at your desk, {when}.' },
  overtime: { news: null, heard: 'Hale’s been asked to keep an eye on you.', named: '{who} had a word with Hale about you.' },
  police: { news: 'Local held for questioning', heard: 'The police took someone near {where}, {when}.', named: null },
  hospital: { news: 'Local hurt in late attack', heard: 'An ambulance came near {where}, {when}.', named: null },
  ambush: { news: 'Prowler on Main street', heard: 'Something was following someone near {where}, {when}.', named: null },
  watch: { news: 'Figure stands in road all night', heard: 'Someone stood in the road outside Larkspur Court, {when}.', named: '{who} stood outside your window, {when}.' },
  gathering: { news: { aliens: 'Lights over the alley, say night workers', lizards: 'Dogs howled behind Pell’s all night', zombies: 'Humming heard behind Pell’s' }, heard: { aliens: 'Lights behind Pell’s, {when}. No sound.', lizards: 'The dogs howled behind Pell’s, {when}.', zombies: 'Humming behind Pell’s, {when}. Lots of voices.' }, named: null },
  scatter: { news: null, heard: null, named: '{who} had a long talk with {other}, {when}.' },
  aware: { news: null, heard: 'Somebody was asking about you, {when}.', named: '{who} was asking about you, {when}.' },
  attack: { news: { lizards: 'Resident beaten in own home', aliens: 'Sleepwalker found in Main street', zombies: 'Resident bitten by “animal”' }, heard: 'Something happened near {where}, {when}. A scream, then the lights went out.', named: 'Something got into {who}’s place, {when}. {who} won’t talk about it.' },
  victim: { news: { lizards: 'Local missing; police “not concerned”', aliens: 'Another resident missing', zombies: 'Body found; police blame dogs' }, heard: 'Police tape near {where}, {when}.', named: '{who} is gone. Just like that.' },
  rite: { news: { aliens: 'Residents report being “measured” at night', lizards: 'Men seen kneeling in the dark, say neighbours', zombies: 'Couple seen “dancing” with something' }, heard: { aliens: 'Somebody was floating in the air near {where}, {when}. Green light all round them.', lizards: 'People were kneeling to something near {where}, {when}.', zombies: 'Somebody was dancing with something dead near {where}, {when}.' }, named: '{who} was out there near {where}, {when}, with THAT. Doesn’t remember a thing.' },
  stalk: { news: null, heard: 'Something followed somebody home {when}. Right up to the door.', named: 'I saw one of THEM following {who} {when}! Right up to the door.' },
  saved: { news: null, heard: 'Somebody pulled someone away from something near {where}, {when}.', named: 'You pulled {who} away from it near {where}. {who} told everyone.' },
  hint: { news: null, heard: null, named: null },
  abduct: { news: 'Lights seen over Larkspur Court', heard: 'Lights over your building, {when}.', named: null },
  bribe: { news: null, heard: null, named: '{who} slipped {other} an envelope, {when}. Thick one.' },
  skim: { news: 'Bank “looking into” small withdrawals', heard: 'Someone was on your stairs, {when}.', named: '{who} was on your stairs, {when}.' },
  complaint: { news: null, heard: 'Hale’s had complaints about you.', named: '{who} complained to Hale about you.' },
  killed: { news: 'Carcass found; council says “some kind of animal”', heard: 'Something big was killed near {where}, {when}. Not a dog.', named: '{who} is dead. Whatever {who} really was.' },
  trap: { news: 'Resident hurt by illegal trap', heard: 'Somebody stepped in a trap near {where}, {when}.', named: '{who} put a foot in a trap near {where}. Someone set it on purpose.' },
  breakin: { news: 'Break-in reported on {area}', heard: 'Someone kicked a door in near {where}, {when}.', named: 'Someone kicked in {who}’s front door, {when}.' },
};
const ECHO_ORDER = ['victim', 'rite', 'killed', 'exposed', 'unmask', 'caught', 'attack', 'breakin', 'trap', 'trueform', 'hospital', 'police', 'fight', 'gathering', 'files', 'cleanup', 'theft', 'watch', 'ambush'];
function echo(k, o = {}) {
  if (!G || !G.started) return;
  const x = o.x != null ? o.x : PLAYER.x, z = o.z != null ? o.z : PLAYER.z;
  const seen = new Set(o.seen || []);
  if (!o.quiet) for (const w of CHARS) if (!w.isPlayer && !w.isThem && w.id !== o.who && w.onMap && seesSpot(w, x, z, 10)) seen.add(w.id);
  G.events.push({ k, t: G.t, who: o.who || null, other: o.other || null, where: placeName(x, z), seen: [...seen] });
  if (G.events.length > 60) G.events.shift();
}
// "the alley", "Main street", "your flat": a place you can drop into a sentence
function placeIn(name) {
  if (/^(Main|Pell|Mr\.|Agnes)/.test(name)) return name;
  if (/^(Your|The|Outside)/.test(name)) return name[0].toLowerCase() + name.slice(1);
  return 'the ' + name[0].toLowerCase() + name.slice(1);
}
function whenWord(t) {
  const h = hourF(t), d = dayNo(t), today = dayNo();
  const part = h < 5 || h >= 21 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  if (part === 'night' && h < 5 && d === today) return 'last night';
  if (d === today) return part === 'night' ? 'tonight' : 'this ' + part;
  if (d === today - 1) return part === 'night' ? (h >= 21 ? 'last night' : 'the night before') : 'yesterday ' + part;
  return DOW[dow(d)] + ' ' + part;
}
const flav = (v) => (v && typeof v === 'object' ? v[G.faction] : v);
function echoLine(e, named) {
  const E = ECHO[e.k]; if (!E) return null;
  const nm = (id) => (NPC[id] ? NPC[id].short : 'someone');
  const tpl = named && e.who && E.named ? E.named : flav(E.heard);
  if (!tpl) return null;
  return tpl.replace(/\{who\}/g, nm(e.who)).replace('{other}', nm(e.other)).replace('{where}', placeIn(e.where)).replace('{when}', whenWord(e.t));
}
// pin what you hear to the strip along the bottom of the board
function hear(e, text, by) {
  if (!text) return null;
  if (!G.heard.some((h) => h.text === text)) { G.heard.push({ t: e ? e.t : G.t, at: G.t, text, by }); if (G.heard.length > 16) G.heard.shift(); }
  if (e) { e.told = e.told || {}; e.told[by] = 1; }
  return text;
}
// something this person noticed lately and hasn't told you yet
function echoFor(n, named) {
  const recent = G.events.filter((e) => G.t - e.t < 2 * 1440 && e.seen.includes(n.id) && !(e.told && e.told[n.id]) && e.who !== n.id && ECHO[e.k] && (named ? (ECHO[e.k].named || flav(ECHO[e.k].heard)) : flav(ECHO[e.k].heard)));
  return recent.length ? recent[recent.length - 1] : null;
}
// the morning paper: one headline from yesterday's echoes, plus filler flavoured by the faction
function morningPaper() {
  const since = G.t - 24 * 60;
  let text = null;
  if (G.stageNews) { G.headline = { day: dayNo(), text: G.stageNews, echo: true }; G.stageNews = null; return; }
  for (const k of ECHO_ORDER) {
    const e = G.events.filter((x) => x.k === k && x.t >= since).pop();
    if (e && ECHO[k].news) { text = flav(ECHO[k].news).replace('{area}', /street/i.test(e.where) ? 'Main street' : placeIn(e.where)); break; }
  }
  G.headline = { day: dayNo(), text: text || pick(chance(0.5) ? NEWS[G.faction] : NEWS.general), echo: !!text };
}

