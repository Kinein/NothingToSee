//@ them/awareness — THEIR awareness of you, settled at 06:00
//@ Defines: bookPhoto, bookNight, bookRemoval, bookAware, applyAwareness
//@ Uses:    sim/core, town/cast, core/util, ui/interface, town/echoes, data/tuning
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR awareness. Each member books what they noticed today; it all lands at 06:00.
// Suspicion of you crossing 60 (+10, once), photographed mid-tell (+8), peak danger above 50 (half the excess),
// spotting you near THEIR night business (+15). Catching, killing or unmasking a member books +15 for the survivors.
const book = (n) => G.awareBook[n.id] || (G.awareBook[n.id] = { sus: 0, photo: 0, night: 0 });
function bookPhoto(n) {
  if (n.isThem && !n.slain) book(n).photo++;
}
function bookNight(n) {
  if (n.isThem && !n.slain) book(n).night++;
}
function bookRemoval() {
  G.awareRemoved = (G.awareRemoved || 0) + 1;
}
// a flat booking for something you did in front of THEM: a confrontation gone wrong, a kill nobody saw, a fight lost
function bookAware(v) {
  G.awareExtra = (G.awareExtra || 0) + v;
}
// the night that's coming (or the one you're in): the day it started on
const tonightId = () => (hourF() < 6 ? dayNo(G.t - 12 * 60) : dayNo());
function applyAwareness() {
  let add = 0;
  for (const n of them()) {
    const b = G.awareBook[n.id];
    if (!n.slain) {
      // bookings of the dead are dropped
      if (b) add += (b.sus ? 10 : 0) + 8 * b.photo + 15 * b.night + 5 * (b.peep || 0);
      add += Math.max(0, (n.dangerPeak || 0) - 50) / 2;
    }
    n.dangerPeak = n.danger;
  }
  add += 15 * (G.awareRemoved || 0) + (G.awareExtra || 0);
  if (G.playerChip && G.faction === 'aliens') add += 5;
  G.awareBook = {};
  G.awareRemoved = 0;
  G.awareExtra = 0;
  const before = G.aware;
  G.aware = add > 0 ? clamp(G.aware + Math.round(add), 0, 100) : Math.max(0, G.aware - 1);
  if (G.aware > before) {
    UI.heatPulse = 1.2;
    const m = pick(alive()),
      w = pick(suspects().filter((n) => !n.isThem && !n.exposed && !n.gone));
    if (m && add >= 8) echo('aware', { who: m.id, x: m.x || 20, z: m.z || 15, seen: w ? [w.id] : [], quiet: true });
    const step = AWARE_STEPS.filter(([v]) => before < v && G.aware >= v).pop();
    if (step) setTimeout(() => ui.note(step[1], step[2], 'bad'), 2400);
  }
}
const awareWord = (a) =>
  a < 10
    ? 'Unnoticed'
    : a < 40
      ? 'Noticed'
      : a < 55
        ? 'Watched'
        : a < 70
          ? 'Followed'
          : a < 100
            ? 'Hunted'
            : 'Ready for you';
const temper = (n) => (G.traits[n.id] || {}).temper;
const watchedNow = (n) => !!(G.watchedUntil && G.watchedUntil[n.id] > G.t); // after a partial fail: no business in public
const alive = () => them().filter((n) => !n.slain); // still breathing, unmasked or not
const covert = () => alive().filter((n) => !n.exposed); // still hiding
