#!/usr/bin/env python3
"""Real-time soak test: plays the --dev build headless at high game speed and reports slow frames.

    python3 build.py --dev && python3 tools/playtest.py [real-seconds] [game-speed] [--draw]

Defaults: 240 real seconds at 45 game minutes per real second (about a game day per 32 real seconds
at full frame rate; headless software rendering is slower, so expect fewer days).
The player stands where the game starts; keepAlive stops work, needs and health ending the run, so the
town's events (nights, THEM coming for you, being taken, Friday) get their chance to happen.

Prints per-system milliseconds per frame and the slowest frames with what they spent their time on.
Drawing is skipped unless --draw: headless rendering is software, so its numbers mean little.
"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'nothing-to-see-here.dev.html')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SECS = float(args[0]) if len(args) > 0 else 240
SPEED = float(args[1]) if len(args) > 1 else 45
DRAW = '--draw' in sys.argv   # by default drawing is skipped: headless rendering is software and would swamp everything else

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 480, 'height': 300})
    pg.set_default_timeout(120000)
    pg.route(re.compile(r'^https?://'), lambda r: r.abort())
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('console: ' + m.text))
    pg.goto(PAGE, wait_until='domcontentloaded')
    pg.wait_for_timeout(1000)
    pg.evaluate("() => { document.getElementById('pname-in').value = 'Soak'; document.getElementById('begin').click(); }")
    pg.wait_for_timeout(1000)
    pg.evaluate('([s, d]) => { __dev.speed(s); __dev.keepAlive(true); __dev.render(d); __dev.perfReset(); }', [SPEED, DRAW])
    t0 = time.time()
    while time.time() - t0 < SECS:
        pg.wait_for_timeout(15000)
        st = pg.evaluate("() => ({ t: __dev.run('fmtTime(G.t) + \" day \" + dayNo()'), over: __dev.G.over || null, fps: __dev.perf().fps })")
        print('  %4.0fs  %s  fps %.1f%s' % (time.time() - t0, st['t'], st['fps'], '  OVER: ' + st['over'] if st['over'] else ''), flush=True)
        if st['over']:
            break
    res = pg.evaluate('() => __dev.perf()')
    b.close()

print('\n%d frames, %.1f fps' % (res['frames'], res['fps']))
print('ms per frame by system (nested: simStep includes npcUpdate, worldStep includes computeLight, …):')
for r in res['rows'][:24]:
    print('  %8.2f  %-16s %d calls' % (r['msPerFrame'], r['fn'], r['calls']))
print('slowest frames:')
for s in res['slowest']:
    print('  %7.1f ms  day %s %s  %s' % (s['ms'], s['day'], s['at'], json.dumps(s['parts'])))
if errs:
    print('\nERRORS:\n  ' + '\n  '.join(dict.fromkeys(errs[:20])))
