#!/usr/bin/env python3
"""Boot test: open dist/nothing-to-see-here.html headless, start a game, let it run, report JS errors.

    pip install playwright && playwright install chromium   (once)
    python3 tools/smoke.py [seconds]

Exit code 0 = booted, started and ran with no JavaScript errors.
Headless WebGL is software-rendered and very slow (a minute or so is normal); it proves the
code runs, not how it looks or plays. Always also open the page in a real browser.
"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'nothing-to-see-here.html')
SECS = float(sys.argv[1]) if len(sys.argv) > 1 else 10

errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 400})
    pg.set_default_timeout(90000)
    pg.route(re.compile(r'^https?://'), lambda r: r.abort())   # offline: the web fonts fall back, that's fine here
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('console: ' + m.text))
    pg.goto(PAGE, wait_until='domcontentloaded')
    pg.wait_for_timeout(1000)
    if pg.evaluate("!document.getElementById('fatal').hidden"):
        errs.append('fatal overlay: ' + pg.inner_text('#fatal'))
    started = pg.evaluate("""() => {
        const n = document.getElementById('pname-in'); if (n) n.value = 'Tester';
        const b = document.getElementById('begin'); if (!b) return false; b.click(); return true; }""")
    pg.wait_for_timeout(SECS * 1000)
    clock = pg.evaluate("(document.getElementById('clock') || {}).textContent || ''")
    b.close()

print(('started a game, clock ' + clock) if started else 'no start button found')
print('\n'.join(errs) if errs else 'no errors')
sys.exit(1 if errs or not started else 0)
