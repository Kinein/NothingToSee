#!/usr/bin/env node
// Review checks: the half of a review a script can do, on what CHANGED (the added lines), so an old offender
// never blocks a new edit and there is no baseline to keep. The judgement half is the nts-review skill's checklist.
//
//   node tools/review-checks.js              uncommitted + untracked changes
//   node tools/review-checks.js --base REF   everything since REF (a branch: --base $(git merge-base HEAD origin/main))
//   node tools/review-checks.js --all        every line of js/ (expect old noise)
//
// Prints `file:line  [error|warn]  id  message` and exits 1 on an error. It does not build or run anything:
// python3 tools/check.py is still the gate after every change.
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');

const git = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    return '';
  }
};
const read = (f) => {
  try {
    return fs.readFileSync(path.join(ROOT, f), 'utf8');
  } catch (e) {
    return '';
  }
};
const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;

const isCode = (f) => /^js\/.+\.js$/.test(f) && !f.startsWith('js/dev/');

// Blank out comments (keep strings and the line count), so a rule only ever sees code.
function stripComments(text) {
  let out = '',
    i = 0,
    state = 'code',
    quote = '';
  while (i < text.length) {
    const c = text[i],
      d = text[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        i += 2;
        out += '  ';
        continue;
      }
      if (c === '/' && d === '*') {
        state = 'block';
        i += 2;
        out += '  ';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        state = 'str';
        quote = c;
      }
      out += c;
      i++;
    } else if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      } else out += ' ';
      i++;
    } else if (state === 'block') {
      if (c === '*' && d === '/') {
        state = 'code';
        i += 2;
        out += '  ';
        continue;
      }
      out += c === '\n' ? '\n' : ' ';
      i++;
    } else {
      if (c === '\\') {
        out += c + (d || '');
        i += 2;
        continue;
      }
      if (c === quote || (c === '\n' && quote !== '`')) state = 'code';
      out += c;
      i++;
    }
  }
  return out;
}
const codeCache = new Map();
const codeLine = (file, n) => {
  if (!codeCache.has(file)) codeCache.set(file, stripComments(read(file)).split('\n'));
  return codeCache.get(file)[n - 1] || '';
};

// ── what changed
function addedLines() {
  const added = new Map(); // file -> [line numbers]
  const push = (f, n) => {
    if (!added.has(f)) added.set(f, []);
    added.get(f).push(n);
  };
  if (ALL) {
    for (const f of git(['ls-files', '--', 'js']).split('\n').filter(isCode))
      read(f)
        .split('\n')
        .forEach((t, i) => push(f, i + 1));
    return added;
  }
  const diff = git(['diff', '-U0', '--no-color', BASE || 'HEAD', '--', 'js', 'shell', 'tools', 'build.py', '*.md']);
  let file = null,
    n = 0;
  for (const l of diff.split('\n')) {
    const h = /^\+\+\+ b\/(.*)$/.exec(l);
    if (h) {
      file = h[1];
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (hunk) {
      n = +hunk[1];
      continue;
    }
    if (file && l.startsWith('+') && !l.startsWith('+++')) push(file, n++);
  }
  for (const f of untracked())
    read(f)
      .split('\n')
      .forEach((t, i) => push(f, i + 1));
  return added;
}
const untracked = () =>
  git(['ls-files', '--others', '--exclude-standard', '--', 'js', 'shell', 'tools', 'build.py', '*.md'])
    .split('\n')
    .filter(Boolean);

// ── G fields that freshG declares (docs/STATE.md, generated from freshG by tools/state.js)
function freshFields() {
  const text = read('docs/STATE.md');
  const start = text.indexOf('## `G` fields\n');
  const end = text.indexOf('\n## ', start + 1);
  const names = new Set();
  for (const m of text.slice(start, end < 0 ? undefined : end).matchAll(/^\| `([A-Za-z_$][\w$]*)` \|/gm))
    names.add(m[1]);
  return names;
}
const FRESH = freshFields();

// ── line rules (on code with comments blanked out)
const PRESENTATION = (f) => /^js\/(gfx|ui)\//.test(f);
const PER_FRAME = (f) =>
  /^js\/(gfx|sim)\//.test(f) ||
  /^js\/(game\/loop|world\/light-map|world\/vision|combat\/blood|audio\/foley)\.js$/.test(f);
const RULES = [
  {
    id: 'sound-random',
    sev: 'error',
    files: (f) => /^js\/audio\//.test(f),
    re: /Math\.random\s*\(/,
    msg: 'sound has its own randomness (audio.rnd), never Math.random: the seeded determinism check shares that stream (CLAUDE.md, Sound)',
  },
  {
    id: 'presentation-random',
    sev: 'warn',
    files: PRESENTATION,
    re: /Math\.random\s*\(/,
    msg: "randomness that isn't part of the simulation (film grain, a wobble) must not use Math.random, or the seeded determinism check breaks: use a hash of time or position",
  },
  {
    id: 'gpu-readback',
    sev: 'warn',
    files: (f) => isCode(f) && f !== 'js/gfx/portraits.js',
    re: /\b(readPixels|toDataURL|getImageData|toBlob)\s*\(/,
    msg: 'GPU read-backs go through warmLater (gfx/portraits.js), never mid-frame: check this runs inside one',
  },
  {
    id: 'frame-alloc',
    sev: 'warn',
    files: PER_FRAME,
    re: /\bnew\s+(Float32Array|Float64Array|Uint8Array|Uint16Array|Uint32Array|Int32Array|Array|Map|Set)\b/,
    also: (l) => /^\s/.test(l), // a top-level line runs once at load
    msg: 'per-frame code must not allocate: if this runs every frame, hoist the buffer and reuse it (M4.*Into, docs/PERFORMANCE.md)',
  },
  {
    id: 'saved-state',
    sev: 'warn',
    files: (f) => isCode(f) && f !== 'js/game/state.js',
    re: /\b(localStorage|sessionStorage|indexedDB)\b/,
    msg: 'only game/state.js saves anything (saveGame, loadGame); G is what gets saved',
  },
  {
    id: 'g-field-not-in-freshG',
    sev: 'warn',
    files: (f) => isCode(f) && f !== 'js/game/state.js',
    re: /\bG\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\+=|-=|\|\|=|\?\?=|&&=|\+\+|--)/,
    also: (l, m) => FRESH.size > 0 && !FRESH.has(m[1]),
    msg: 'a new field on G belongs in freshG (game/state.js) with its "unset" value (CLAUDE.md, Shared globals); docs/STATE.md lists the ones added on the fly',
  },
];

// ── file rules
function orderRules(changed) {
  const out = [];
  const order = read('js/ORDER.txt')
    .split('\n')
    .map((l) => l.split('#')[0].trim().split(/\s+/).pop())
    .filter(Boolean);
  const listed = new Set(order.map((f) => 'js/' + f));
  const present = git(['ls-files', '--cached', '--others', '--exclude-standard', '--', 'js'])
    .split('\n')
    .filter((f) => /\.js$/.test(f) && fs.existsSync(path.join(ROOT, f)));
  for (const f of present)
    if (!listed.has(f))
      out.push({
        file: f,
        n: 1,
        sev: 'error',
        id: 'not-in-order',
        msg: 'not in js/ORDER.txt, so the build leaves it out: add it with a # purpose comment where its code should run',
      });
  for (const f of listed)
    if (!fs.existsSync(path.join(ROOT, f)))
      out.push({
        file: 'js/ORDER.txt',
        n: 1,
        sev: 'error',
        id: 'order-gone',
        msg: `${f} is listed but does not exist`,
      });
  return out;
}

// The version on the title screen: bumped once per pull request or push to main when dist/ changes (CLAUDE.md).
function versionRule() {
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).trim();
  const against = BASE || git(['merge-base', 'HEAD', upstream || 'origin/main']).trim() || 'HEAD';
  const changed = git(['diff', '--name-only', against, '--', 'js', 'shell', 'build.py'])
    .split('\n')
    .concat(untracked())
    .filter((f) => /^(js\/|shell\/|build\.py$)/.test(f) && !/^js\/dev\//.test(f));
  if (!changed.length) return [];
  const versionOf = (text) => (/<p id="version">([^<]*)<\/p>/.exec(text) || [])[1] || '';
  const now = versionOf(read('shell/page.html'));
  const before = versionOf(git(['show', `${against}:shell/page.html`]));
  const out = [];
  if (now === before)
    out.push({
      file: 'shell/page.html',
      n: 1,
      sev: 'warn',
      id: 'version-bump',
      msg: `${changed.length} file(s) that reach dist/ changed since ${against.slice(0, 9)} but the version is still "${now}": raise the last number by one and set today's date`,
    });
  else if (now !== versionOf(git(['show', 'HEAD:shell/page.html']))) {
    // a bump made in this working tree carries today's date; one already committed keeps the day it was made
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!now.includes(today))
      out.push({
        file: 'shell/page.html',
        n: 1,
        sev: 'warn',
        id: 'version-date',
        msg: `the version says "${now}"; today is ${today}`,
      });
  }
  return out;
}

// ── run
const added = addedLines();
const findings = [];
for (const [file, lines] of added) {
  for (const rule of RULES) {
    if (!rule.files(file)) continue;
    for (const n of lines) {
      const code = codeLine(file, n);
      if (code.startsWith('//@')) continue;
      const m = rule.re.exec(code);
      if (m && (!rule.also || rule.also(code, m)))
        findings.push({ file, n, sev: rule.sev, id: rule.id, msg: rule.msg });
    }
  }
}
findings.push(...orderRules(added), ...(ALL ? [] : versionRule()));
const changedDocs = [...added.keys()].filter((f) => /\.md$/.test(f));
if (changedDocs.length) {
  const dc = spawnSync('node', ['.claude/tools/docs-check.js', '--fail'], { cwd: ROOT, encoding: 'utf8' });
  if (dc.status !== 0)
    findings.push({
      file: changedDocs.join(', '),
      n: 0,
      sev: 'error',
      id: 'docs-check',
      msg: 'node .claude/tools/docs-check.js reports dead references: fix the ones in the files you touched',
    });
}

findings.sort(
  (a, b) => (a.sev === b.sev ? 0 : a.sev === 'error' ? -1 : 1) || a.file.localeCompare(b.file) || a.n - b.n,
);
for (const f of findings) console.log(`${f.file}:${f.n}  [${f.sev}]  ${f.id}  ${f.msg}`);
const errs = findings.filter((f) => f.sev === 'error').length;
console.log(
  `\nreview-checks: base ${ALL ? '(all)' : BASE || 'HEAD'}, ${added.size} changed file(s), ${errs} error(s), ${findings.length - errs} warning(s)`,
);
process.exit(errs ? 1 : 0);
