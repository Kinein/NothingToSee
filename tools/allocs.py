#!/usr/bin/env python3
"""How much memory each frame allocates, and which functions allocate it (garbage → collector pauses).

    python3 build.py --dev && python3 tools/allocs.py [seconds]

Starts a game, lets it settle, then samples allocations for `seconds` (default 25) of real play with drawing
on. Prints KB per frame overall and the top allocating functions. Compare before and after a change.
"""
import os, re, sys
from collections import defaultdict
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'nothing-to-see-here.dev.html')
SECS = float(sys.argv[1]) if len(sys.argv) > 1 else 25

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 320, 'height': 200})
    pg.set_default_timeout(300000)
    pg.route(re.compile(r'^https?://'), lambda r: r.abort())
    pg.goto(PAGE, wait_until='domcontentloaded')
    pg.wait_for_timeout(800)
    pg.evaluate("() => { document.getElementById('pname-in').value = 'Alloc'; document.getElementById('begin').click(); }")
    pg.wait_for_timeout(8000)   # let the portraits warm and the first frames settle
    pg.evaluate('() => __dev.perfReset()')
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('HeapProfiler.enable')
    cdp.send('HeapProfiler.startSampling', {'samplingInterval': 4096, 'includeObjectsCollectedByMajorGC': True, 'includeObjectsCollectedByMinorGC': True})
    pg.wait_for_timeout(SECS * 1000)
    prof = cdp.send('HeapProfiler.stopSampling')['profile']
    frames = max(1, pg.evaluate('() => __dev.perf().frames'))
    b.close()

agg = defaultdict(float)
def walk(n):
    agg[n['callFrame']['functionName'] or '(anonymous)'] += n['selfSize']
    for c in n.get('children', []):
        walk(c)
walk(prof['head'])
tot = sum(agg.values())
print('%d frames, %.0f KB allocated, %.1f KB per frame' % (frames, tot / 1024, tot / 1024 / frames))
for k, v in sorted(agg.items(), key=lambda kv: -kv[1])[:20]:
    print('  %8.1f KB/frame  %s' % (v / 1024 / frames, k))
