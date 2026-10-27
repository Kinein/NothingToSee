//@ town/daily-plans — Daily plans per role
//@ Defines: overlay, makePlan, curBlock
//@ Uses:    core/util, sim/core, world/grid, town/quirks
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── daily plans
function overlay(P, s, e, a) {
  const out = [];
  for (const b of P) {
    if (b.e <= s || b.s >= e) {
      out.push(b);
      continue;
    }
    if (b.s < s) out.push(Object.assign({}, b, { e: s }));
    if (b.e > e) out.push(Object.assign({}, b, { s: e }));
  }
  out.push({ s, e, a });
  out.sort((x, y) => x.s - y.s);
  P.length = 0;
  P.push(...out);
}
function makePlan(n) {
  const d = dayNo(),
    wd = isWorkday(d),
    P = [];
  const add = (s, e, a) => P.push({ s: Math.round(s * 60), e: Math.round(e * 60), a });
  const k = n.def.plan;
  if (n.slain || n.gone) {
    add(0, 24, 'gone');
    n.plan = P;
    return;
  }
  const off = HOUSE_OF[n.id] ? 'house' : n.id === 'agnes' ? 'home' : 'off';
  if (n.exposed) {
    // unmasked: a recluse who still goes out, at odd hours, day or night
    const wk = rand(5.5, 9.5);
    add(0, 24, off);
    if (chance(0.7)) {
      const s = pick([rand(6.8, 7.6), rand(20.6, 22.2)]);
      overlay(P, Math.round(s * 60), Math.round((s + rand(0.4, 0.7)) * 60), 'shop');
    }
    if (chance(0.45)) {
      const s = rand(wk + 1, 18);
      overlay(P, Math.round(s * 60), Math.round((s + rand(0.6, 1.2)) * 60), pick(['stroll', 'park']));
    }
    if (chance(0.75)) {
      const s = rand(0.3, 3.2);
      overlay(P, Math.round(s * 60), Math.round((s + rand(0.8, 1.6)) * 60), 'prowl');
    }
    if (n.isThem && d === G.gatherDay) overlay(P, 90, 180, 'gather');
    n.plan = P;
    return;
  }
  // restless people step out during the working day: a shop run, a walk, the park. Not only THEM go missing from their desks.
  const errands = (spans, count) => {
    const hb = G.habits && G.habits[n.id];
    for (let j = 0; j < count; j++) {
      const [a0, a1] = pick(spans);
      if (a1 - a0 < 0.6) continue;
      const s = rand(a0, a1 - 0.5),
        len = rand(0.25, 0.5);
      if (hb && (hb.ms || [hb.m]).some((t) => Math.abs(s * 60 - t) < 60)) continue;
      overlay(P, Math.round(s * 60), Math.round((s + len) * 60), pick(['shop', 'shop', 'stroll', 'park']));
    }
  };
  const restless = (G.traits && G.traits[n.id] && G.traits[n.id].restless) || 0;
  const outings = (from, to, max) => {
    let t = from;
    for (let j = 0; j < max; j++) {
      t += rand(0.2, 1.4);
      if (t > to - 0.4) break;
      const a = pick(['stroll', 'stroll', 'park', 'shop']),
        len = a === 'shop' ? rand(0.35, 0.6) : a === 'park' ? rand(0.7, 1.3) : rand(0.5, 1.1);
      const e = Math.min(to, t + len);
      overlay(P, Math.round(t * 60), Math.round(e * 60), a);
      t = e;
    }
  };
  if (k === 'office' || k === 'boss') {
    if (wd) {
      const wk = rand(6.3, 7.3),
        arr = rand(8.2, 8.95),
        lun = rand(11.85, 12.35),
        lv = rand(17.02, 17.6),
        bed = rand(22.2, 23.7);
      add(0, wk, 'sleep');
      add(wk, arr, off);
      add(arr, lun, 'work');
      add(lun, lun + 0.75, chance(0.3) ? 'shop' : 'lunch');
      add(lun + 0.75, lv, 'work');
      add(lv, bed, off);
      add(bed, 24, 'sleep');
      outings(lv, Math.min(bed - 0.3, 21.5), irand(0, 2));
      if (restless)
        errands(
          [
            [arr + 0.5, lun - 0.2],
            [lun + 1, lv - 0.3],
          ],
          restless === 2 ? irand(1, 2) : chance(0.6) ? 1 : 0,
        );
    } else {
      const wk = rand(7.5, 9.8),
        bed = rand(22.6, 23.9);
      add(0, wk, 'sleep');
      add(wk, bed, off);
      add(bed, 24, 'sleep');
      outings(wk + 0.3, Math.min(bed - 0.3, 21.5), irand(1, 3));
    }
  } else if (k === 'courier') {
    // Ray: parcels out of the office, round the town, back for more
    if (wd) {
      const wk = rand(6.2, 7),
        arr = rand(8.1, 8.45),
        lun = rand(12, 12.4),
        lv = rand(17.1, 17.5),
        bed = rand(22.4, 23.7);
      add(0, wk, 'sleep');
      add(wk, arr, off);
      add(arr, lun, 'courier');
      add(lun, lun + 0.6, pick(['shop', 'park']));
      add(lun + 0.6, lv, 'courier');
      add(lv, bed, off);
      add(bed, 24, 'sleep');
      outings(lv, Math.min(bed - 0.3, 21.5), irand(1, 2));
    } else {
      const wk = rand(7.5, 9.5),
        bed = rand(22.6, 23.9);
      add(0, wk, 'sleep');
      add(wk, bed, off);
      add(bed, 24, 'sleep');
      outings(wk + 0.3, Math.min(bed - 0.3, 21.5), irand(2, 3));
    }
  } else if (k === 'clerk') {
    add(0, 6.4, 'sleep');
    add(6.4, 6.75, off);
    add(6.75, 23.1, 'clerk');
    add(23.1, 23.6, off);
    add(23.6, 24, 'sleep');
  } else if (k === 'agnes') {
    add(0, 7, 'sleep');
    add(7, 10, 'home');
    add(10, 10.7, 'shop');
    add(10.7, 14.5, 'home');
    add(14.5, 16.5, chance(0.7) ? 'park' : 'home');
    add(16.5, 22.3, 'home');
    add(22.3, 24, 'sleep');
  } else if (k === 'lenny') add(0, 24, 'lenny');
  quirkPlan(n, P);
  if (n.isThem && d === G.gatherDay) overlay(P, 90, 180, 'gather');
  n.plan = P;
}
function curBlock(n) {
  const m = tod();
  for (const b of n.plan || []) if (m >= b.s && m < b.e) return b;
  return { a: 'off', s: 0, e: 1440 };
}
const blockOver = (b) => (c) => curBlock(c) !== b;
