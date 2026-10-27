#!/usr/bin/env python3
"""Determinism check for refactors: does the simulation still end up in exactly the same state?

    python3 build.py --dev && python3 tools/regress.py                 # prints a fingerprint per seed
    python3 tools/regress.py --save tools/regress-baseline.json        # remember them
    python3 tools/regress.py --check tools/regress-baseline.json       # compare: exit 1 if anything moved
    add --quick for one seed and 40 game hours (a minute or two instead of several)

Math.random is replaced by a seeded generator before the page runs; each seed starts a new game and runs
the simulation forward 100 game hours (keepAlive on, nothing drawn). The fingerprint hashes the whole game
state and every person's position, needs and memory (the light-map sum is printed too, for information).

A pure refactor (moving, renaming, splitting files, caching) must keep every fingerprint. A change that's
meant to alter behaviour will change them: then look at the game, and save a new baseline.
"""
import hashlib, json, os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'nothing-to-see-here.dev.html')
args = sys.argv[1:]
QUICK = '--quick' in args
SEEDS = [1] if QUICK else [1, 2, 3]
HOURS = 40 if QUICK else 100   # 100 game hours: Monday morning into Friday, when THEY are let loose

# Seeded randomness, and no real time: the page never runs a frame (no title-screen animation, nothing
# paced by the wall clock), so the only thing that moves the game is the simulation stepping we ask for.
SEEDED = """
(() => {
  let s = 1;
  Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  window.__seed = (n) => { s = (n * 2654435761) % 2147483647 || 1; };
  window.requestAnimationFrame = () => 0; window.requestIdleCallback = () => 0; performance.now = () => 0;
})();
"""

STATE = r"""
([seed, hours]) => {
  // the title screen has been animating for however long the page took to load: put back what it touched
  __dev.run('for (const l of LIGHTS) l.cur = 1; STY.k = 0; STY.beat = 0; STY.beatT = 0; R.time = 0;');
  __seed(seed);
  document.getElementById('pname-in').value = 'Reg';
  document.getElementById('begin').click();          // newGame runs right here, synchronously
  __dev.keepAlive(true);
  const r = __dev.run(`(() => {
    const end = G.t + ${hours} * 60;
    while (G.t < end && !G.over) { if (G.started) { G.workBar = 100; G.health = 100; for (const k of ['hunger', 'energy', 'bladder']) PLAYER.needs[k] = 100; PLAYER.needs.stress = Math.min(PLAYER.needs.stress, 40); }
      simStep(0.05, 12); worldStep(0.05, false); }
    const round = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
    const people = CHARS.map((c) => [c.id, round(c.x), round(c.z), c.onMap, c.isThem || false, round(c.sus || 0), round(c.rel || 0), (c.queue[0] || {}).kind || null,
      c.needs ? Object.values(c.needs).map(round) : null]);
    let light = 0; for (let i = 0; i < lightR.length; i++) light += lightR[i] * (i % 7 + 1) + rLB[i] * (i % 5 + 1);
    const g = JSON.stringify(G, (k, v) => (typeof v === 'number' ? round(v) : v));
    return { when: fmtTime(G.t) + ' day ' + dayNo(), over: G.over || null, them: G.them, faction: G.faction, people: JSON.stringify(people), g, light: round(light) };
  })()`);
  return r;
}
"""

out = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for seed in SEEDS:
        pg = b.new_page(viewport={'width': 320, 'height': 200})
        pg.set_default_timeout(600000)
        pg.add_init_script(SEEDED)
        pg.route(re.compile(r'^https?://'), lambda r: r.abort())
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(PAGE, wait_until='domcontentloaded')
        pg.wait_for_timeout(500)
        pg.evaluate('() => __dev.render(false)')
        r = pg.evaluate(STATE, [seed, HOURS])
        h = lambda s: hashlib.sha256(s.encode()).hexdigest()[:12]
        out[str(seed)] = {'when': r['when'], 'over': r['over'], 'faction': r['faction'], 'them': r['them'],
                          'people': h(r['people']), 'state': h(r['g']), 'light': r['light']}
        print('seed %d: %s %s, THEM %s, people %s, state %s, light %s%s' % (seed, r['faction'], r['when'], ','.join(r['them']),
              out[str(seed)]['people'], out[str(seed)]['state'], r['light'], ' (over: %s)' % r['over'] if r['over'] else ''), flush=True)
        if errs:
            print('  ERRORS: ' + '; '.join(errs[:5]))
        pg.close()
    b.close()

if '--save' in args:
    path = args[args.index('--save') + 1]
    json.dump(out, open(path, 'w'), indent=1)
    print('saved ' + path)
if '--check' in args:
    path = args[args.index('--check') + 1]
    base = json.load(open(path))
    # the light sum is shown but not compared: some lights pulse with real time and the cars drive in real
    # frames, so it can differ between runs of the very same code. The game state and people must match exactly.
    key = lambda r: {k: v for k, v in (r or {}).items() if k != 'light'}
    diff = [s for s in out if key(out[s]) != key(base.get(s))]
    if diff:
        for s in diff:
            print('seed %s CHANGED:\n  was %s\n  now %s' % (s, json.dumps(base.get(s)), json.dumps(out[s])))
        sys.exit(1)
    print('all %d seeds identical to %s' % (len(out), path))
