#!/usr/bin/env python3
"""Where the time goes: runs the --dev build headless and reports.

    python3 build.py --dev && python3 tools/profile.py [game-hours] [--cpu]

1. Starts a game, then runs the simulation forward `game-hours` (default 26: Monday morning to Tuesday)
   without drawing, and prints the cost per game hour and the slowest single steps with their breakdown.
   Sleep runs at 45 game minutes per real second, so a step that costs N ms costs about N ms of a frame
   while sleeping: anything over ~8 ms is a visible hitch.
2. With --cpu, also records a V8 CPU profile of that run and prints the top functions by self time.

Rendering is software in headless Chrome, so frame timings here say little; the simulation numbers are real.
"""
import json, os, re, sys
from collections import defaultdict
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'nothing-to-see-here.dev.html')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
HOURS = float(args[0]) if args else 26
CPU = '--cpu' in sys.argv


def top_self(profile, n=30):
    nodes = {nd['id']: nd for nd in profile['nodes']}
    self_us = defaultdict(float)
    deltas = profile['timeDeltas']
    for sid, dt in zip(profile['samples'][1:], deltas[1:]):
        cf = nodes[sid]['callFrame']
        self_us[(cf['functionName'] or '(anon)', cf['lineNumber'] + 1)] += dt
    total = sum(self_us.values()) or 1
    return [(k[0], k[1], v / 1000, 100 * v / total) for k, v in sorted(self_us.items(), key=lambda kv: -kv[1])[:n]]


with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 320, 'height': 200})
    pg.set_default_timeout(600000)
    pg.route(re.compile(r'^https?://'), lambda r: r.abort())
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(PAGE, wait_until='domcontentloaded')
    pg.wait_for_timeout(1000)
    pg.evaluate("() => { document.getElementById('pname-in').value = 'Prof'; document.getElementById('begin').click(); }")
    pg.wait_for_timeout(1500)
    cdp = pg.context.new_cdp_session(pg) if CPU else None
    if cdp:
        cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200}); cdp.send('Profiler.start')
    res = pg.evaluate('(m) => __dev.skip(m)', HOURS * 60)
    prof = cdp.send('Profiler.stop')['profile'] if cdp else None
    b.close()

print('simulated to %s%s: %.1f ms of script per game hour' % (res['now'], ' (game over: %s)' % res['over'] if res['over'] else '', res['msPerGameHour']))
print('slowest steps (each is 0.6 game minutes):')
for s in res['slowest']:
    print('  %6.1f ms  day %s %s  %s' % (s['ms'], s['day'], s['at'], json.dumps(s['parts'])))
if prof:
    print('\ntop functions by self time:')
    for name, line, ms, pct in top_self(prof):
        print('  %7.0f ms %5.1f%%  %s  (line %d of the page)' % (ms, pct, name, line))
if errs:
    print('\nERRORS:\n  ' + '\n  '.join(errs[:10]))
