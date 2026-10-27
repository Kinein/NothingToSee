#!/usr/bin/env node
// Move top-level declarations from wherever they live into another module, safely.
//
//   node tools/move.js js/data/lines.js RUMORS LENNY_HINTS BLAME
//   node tools/move.js js/town/talk.js talkAct
//   node tools/move.js js/data/lines.js --section "Lenny" LENNY_HINTS LENNY_RAMBLE   (adds a comment heading first)
//
// Each name's whole statement moves, with the comment lines directly above it. The destination is created if
// needed (and then you add it to js/ORDER.txt yourself; the tool tells you). Safety, because every module runs
// in one scope in ORDER.txt order:
//   • a function can go anywhere (declarations are hoisted);
//   • a const/let/var can move LATER only if nothing earlier uses it at load time — the tool can't prove that,
//     so it refuses to move one later; it can move EARLIER only if its value uses nothing that wouldn't exist
//     yet there. The tool checks that its initializer only names things defined before the destination.
//   • a statement declaring several names moves only if you list them all.
// Then: node tools/map.js --headers && python3 build.py --check   (and tools/regress.py if you can)
'use strict';
const fs = require('fs'),
  path = require('path');
const { KW, scan, topLevel, statements } = require('./jsscan');
const ROOT = path.resolve(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let args = process.argv.slice(2);
const dest = args.shift();
let section = null;
const si = args.indexOf('--section');
if (si >= 0) {
  section = args[si + 1];
  args.splice(si, 2);
}
if (!dest || !args.length) {
  console.error('usage: node tools/move.js <destination module> [--section "Heading"] NAME [NAME …]');
  process.exit(2);
}

const order = rd('js/ORDER.txt')
  .split('\n')
  .map((l) =>
    l
      .split('#')[0]
      .trim()
      .replace(/^dev\s+/, ''),
  )
  .filter(Boolean)
  .map((f) => 'js/' + f);
const destIdx = order.indexOf(dest);
const files = order.filter((f) => fs.existsSync(path.join(ROOT, f)));
const info = new Map(); // file → { src, lines, toks, defs, stmts }
for (const f of files) {
  const src = rd(f),
    toks = scan(src);
  info.set(f, { src, toks, defs: topLevel(toks), stmts: statements(toks) });
}
const owner = new Map();
for (const f of files) for (const d of info.get(f).defs) if (!owner.has(d.name)) owner.set(d.name, f);
if (destIdx < 0)
  console.warn('note: ' + dest + ' is not in js/ORDER.txt yet; treating it as going right after core/util.js');
const destPos = destIdx >= 0 ? destIdx : order.indexOf('js/core/util.js') + 0.5;

const want = new Set(args);
const plan = []; // { file, stmt, names, text, fromLine, toLine }
for (const name of args) {
  const f = owner.get(name);
  if (!f) {
    console.error(name + ': no top-level declaration found');
    process.exit(1);
  }
  if (f === dest) {
    console.error(name + ': already in ' + dest);
    process.exit(1);
  }
  const I = info.get(f),
    d = I.defs.find((x) => x.name === name);
  const st = I.stmts.find((s) => s.line0 <= d.line && d.line <= s.line1);
  if (!st) {
    console.error(name + ': could not find its statement');
    process.exit(1);
  }
  if (plan.some((p) => p.file === f && p.stmt === st)) continue;
  const names = I.defs.filter((x) => x.line >= st.line0 && x.line <= st.line1).map((x) => x.name);
  const missing = names.filter((n) => !want.has(n));
  if (missing.length) {
    console.error(name + ': its statement also declares ' + missing.join(', ') + ' — list those too');
    process.exit(1);
  }
  const kind = I.toks[st.from].v;
  const fromPos = order.indexOf(f);
  if (kind !== 'function' && kind !== 'class' && kind !== 'async') {
    if (destPos > fromPos) {
      console.error(
        name + ': moving a ' + kind + ' later in the build order is not checked safe; move it by hand if you are sure',
      );
      process.exit(1);
    }
    // everything its value names must exist before the destination (or be one of the names moving with it)
    const used = I.toks
      .slice(st.from, st.to + 1)
      .filter(
        (t, k, a) =>
          t.t === 'id' &&
          !t.dot &&
          !t.key &&
          !KW.has(t.v) &&
          !names.includes(t.v) &&
          !(a[k - 1] && (a[k - 1].v === 'const' || a[k - 1].v === 'let' || a[k - 1].v === 'var')),
      );
    const bad = [...new Set(used.map((t) => t.v))].filter((v) => {
      const o = owner.get(v);
      if (!o)
        return (
          !(v in globalThis) &&
          ![
            'window',
            'document',
            'performance',
            'navigator',
            'localStorage',
            'requestAnimationFrame',
            'setTimeout',
          ].includes(v) &&
          !isLocal(I.toks, st, v)
        );
      return order.indexOf(o) >= destPos && !want.has(v);
    });
    if (bad.length) {
      console.error(name + ': its value uses ' + bad.join(', ') + ', which would not exist yet at ' + dest);
      process.exit(1);
    }
  }
  // the statement's lines, plus the comment lines directly above it
  const lines = I.src.split('\n');
  let a = st.line0;
  // (a section heading, a comment line with a run of ──, belongs to the module, not to this statement: it stays)
  while (a > 1 && /^\s*\/\/(?!@)/.test(lines[a - 2]) && !/──/.test(lines[a - 2])) a--;
  const lineEnd = st.line1;
  if (
    lines
      .slice(st.line0 - 1, lineEnd)
      .join('\n')
      .trim() === ''
  ) {
    console.error(name + ': empty statement?');
    process.exit(1);
  }
  // refuse if another statement shares the first or last line
  const others = I.stmts.filter(
    (s) => s !== st && ((s.line0 <= st.line0 && s.line1 >= st.line0) || (s.line0 <= lineEnd && s.line1 >= lineEnd)),
  );
  if (others.length) {
    console.error(name + ': shares a line with another statement; split the line first');
    process.exit(1);
  }
  plan.push({ file: f, stmt: st, names, fromLine: a, toLine: lineEnd, text: lines.slice(a - 1, lineEnd).join('\n') });
}
// identifiers that are parameters or locals inside the statement (arrow functions in a value): not dependencies
function isLocal(toks, st, v) {
  for (let k = st.from; k <= st.to; k++) if (toks[k].v === v && toks[k].d > 0) return true;
  return false;
}

// apply: cut from the sources (bottom-up per file), append to the destination
const byFile = new Map();
for (const p of plan) (byFile.get(p.file) || byFile.set(p.file, []).get(p.file)).push(p);
for (const [f, ps] of byFile) {
  const lines = info.get(f).src.split('\n');
  for (const p of ps.sort((x, y) => y.fromLine - x.fromLine)) lines.splice(p.fromLine - 1, p.toLine - p.fromLine + 1);
  fs.writeFileSync(path.join(ROOT, f), lines.join('\n'));
}
const destPath = path.join(ROOT, dest);
let out = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : '';
if (out && !out.endsWith('\n')) out += '\n';
if (section) out += (out ? '\n' : '') + '// ── ' + section + '\n';
for (const p of plan) out += p.text + '\n';
fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, out);
console.log(
  'moved ' + plan.map((p) => p.names.join('+') + ' (' + path.basename(p.file) + ')').join(', ') + ' → ' + dest,
);
if (destIdx < 0)
  console.log('now add ' + dest.replace(/^js\//, '') + ' to js/ORDER.txt (right after core/util.js for data)');
