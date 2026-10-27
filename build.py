#!/usr/bin/env python3
"""Build Nothing to See Here into one self-contained HTML page.

    python3 build.py                    -> dist/nothing-to-see-here.html
    python3 build.py --check            -> also syntax-check every module (needs node)
    python3 build.py --same-as FILE     -> fail unless the output is byte-identical to FILE
    python3 build.py --dev              -> dist/nothing-to-see-here.dev.html, with js/dev/ tools (window.__dev)

The page is shell/page.html with {{STYLES}} replaced by shell/styles.css and {{SCRIPT}}
replaced by every file listed in js/ORDER.txt, concatenated in that order.

All modules run inside ONE function scope (the IIFE in shell/page.html), so they share
top-level names without import/export. Order matters for top-level code that runs at
load time; function declarations are hoisted across all modules.

Lines at the very top of a module that start with `//@` are the module's header for
humans and tools. The build strips them, so they never reach the page.
"""
import hashlib, os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def order(dev=False):
    """Files from js/ORDER.txt. Lines starting with `dev ` are only in --dev builds."""
    out = []
    for raw in read('js/ORDER.txt').split('\n'):
        line = raw.split('#', 1)[0].strip()
        if line.startswith('dev '):
            if not dev:
                continue
            line = line[4:].strip()
        if line:
            out.append('js/' + line)
    return out


def strip_header(text):
    lines = text.split('\n')
    i = 0
    while i < len(lines) and lines[i].startswith('//@'):
        i += 1
    return '\n'.join(lines[i:])


def build(dev=False):
    mods = order(dev)
    on_disk = set()
    for d, _, files in os.walk(os.path.join(ROOT, 'js')):
        for f in files:
            if f.endswith('.js'):
                on_disk.add(os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/'))
    missing = [m for m in mods if m not in on_disk]
    unlisted = sorted(on_disk - set(order(True)))
    if missing:
        sys.exit('ORDER.txt lists files that do not exist: ' + ', '.join(missing))
    if unlisted:
        print('warning: not in ORDER.txt, left out of the build: ' + ', '.join(unlisted))
    js = ''.join(strip_header(read(m)) for m in mods)
    if js.endswith('\n'):
        js = js[:-1]
    css = read('shell/styles.css')
    if css.endswith('\n'):
        css = css[:-1]
    page = read('shell/page.html').replace('{{STYLES}}', css, 1).replace('{{SCRIPT}}', js, 1)
    return mods, page


def syntax_check(mods):
    """Each module must parse on its own inside a function: a broken brace shows up in the right file."""
    script = r"""
const fs = require('fs'), vm = require('vm'); let bad = 0;
for (const f of process.argv.slice(1)) {
  const s = fs.readFileSync(f, 'utf8').split('\n').filter((l, i, a) => !(l.startsWith('//@') && a.slice(0, i).every((x) => x.startsWith('//@')))).join('\n');
  try { new vm.Script("(function(){'use strict';\n" + s + "\n})", { filename: f }); }
  catch (e) { bad++; console.log('SYNTAX ' + f + ': ' + e.message); }
}
process.exit(bad ? 1 : 0);
"""
    r = subprocess.run(['node', '-e', script] + [os.path.join(ROOT, m) for m in mods])
    if r.returncode:
        sys.exit('syntax check failed')
    print('syntax ok: %d modules' % len(mods))


def main():
    args = sys.argv[1:]
    dev = '--dev' in args
    mods, page = build(dev)
    out = os.path.join(ROOT, 'dist', 'nothing-to-see-here' + ('.dev' if dev else '') + '.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    data = page.encode('utf-8')
    print('built %s  (%d modules, %d bytes, sha256 %s)' % (os.path.relpath(out, ROOT), len(mods), len(data), hashlib.sha256(data).hexdigest()[:16]))
    if '--check' in args:
        syntax_check(mods)
    if '--same-as' in args:
        ref = args[args.index('--same-as') + 1]
        with open(ref, 'rb') as f:
            same = f.read() == data
        print('identical to ' + ref if same else 'DIFFERENT from ' + ref)
        if not same:
            sys.exit(1)


if __name__ == '__main__':
    main()
