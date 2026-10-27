#!/usr/bin/env python3
"""Everything to run after a change, in one go.

    python3 tools/check.py            # map + headers, state doc, both builds with syntax check
    python3 tools/check.py --full     # …plus the boot test and the determinism check against the baseline

Stops at the first failure. For a change that is meant to alter behaviour, the determinism check will fail:
play it, then record a new baseline with  python3 tools/regress.py --save tools/regress-baseline.json
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FULL = '--full' in sys.argv


def run(*cmd):
    print('$ ' + ' '.join(cmd), flush=True)
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode:
        sys.exit('FAILED: ' + ' '.join(cmd))


run('node', 'tools/map.js', '--headers')
with open(os.path.join(ROOT, 'MAP.md'), encoding='utf-8') as f:
    if 'Names defined twice' in f.read():
        sys.exit('FAILED: MAP.md lists names defined twice')
run('node', 'tools/state.js')
run('python3', 'build.py', '--check')
run('python3', 'build.py', '--dev')
if FULL:
    run('python3', 'tools/smoke.py')
    base = os.path.join(ROOT, 'tools', 'regress-baseline.json')
    if os.path.exists(base):
        run('python3', 'tools/regress.py', '--check', base)
    else:
        print('no tools/regress-baseline.json yet: skipping the determinism check')
print('all good')
