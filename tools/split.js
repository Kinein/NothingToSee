#!/usr/bin/env node
// Split one module into several at given lines, keeping the build order.
//
//   node tools/split.js js/gfx/people.js 180 "people-face: Faces, hair and hats" 320 "people-creatures: True forms"
//
// Each `LINE "name: purpose"` pair starts a new file at that line (a line number of the file as it is now, header
// included). The new files go in the same folder and are listed in js/ORDER.txt right after the original, in
// order, so the code runs in exactly the same sequence. Every piece must parse on its own, so a cut can only
// fall between two top-level statements; the tool refuses otherwise and changes nothing.
// Afterwards: node tools/map.js --headers && python3 build.py --check
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const [file, ...rest] = process.argv.slice(2);
if (!file || rest.length < 2 || rest.length % 2) {
  console.error('usage: node tools/split.js js/<folder>/<module>.js LINE "name: purpose" [LINE "name: purpose" …]');
  process.exit(2);
}
const rel = file.replace(/^\.\//, '');
const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
const lines = src.split('\n');
const head = lines.findIndex((l) => !l.startsWith('//@'));
const cuts = [];
for (let k = 0; k < rest.length; k += 2) {
  const at = parseInt(rest[k], 10), m = /^([\w-]+)\s*:\s*(.+)$/.exec(rest[k + 1]);
  if (!(at > head + 1 && at <= lines.length) || !m) { console.error('bad cut: ' + rest[k] + ' ' + rest[k + 1]); process.exit(2); }
  cuts.push({ at, name: m[1], purpose: m[2].trim() });
}
cuts.sort((a, b) => a.at - b.at);
const dir = path.dirname(rel);
const pieces = [{ file: rel, from: head + 1, to: cuts[0].at - 1 }];
cuts.forEach((c, k) => pieces.push({ file: path.join(dir, c.name + '.js'), from: c.at, to: k + 1 < cuts.length ? cuts[k + 1].at - 1 : lines.length, purpose: c.purpose }));
for (const p of pieces.slice(1)) if (fs.existsSync(path.join(ROOT, p.file))) { console.error(p.file + ' already exists'); process.exit(2); }
// body text of each piece: the original's header stays on the first piece; new pieces get theirs from map.js
for (const p of pieces) {
  const body = lines.slice(p.from - 1, p.to).join('\n');
  p.body = p.to === lines.length ? body : body + '\n';   // together the pieces are byte-for-byte the original
  try { new vm.Script("(function(){'use strict';\n" + p.body + '\n})', { filename: p.file }); }
  catch (e) { console.error('cut would break the code: ' + p.file + ' (lines ' + p.from + '–' + p.to + ') does not parse alone: ' + e.message); process.exit(1); }
}
fs.writeFileSync(path.join(ROOT, rel), lines.slice(0, head).join('\n') + (head ? '\n' : '') + pieces[0].body);
for (const p of pieces.slice(1)) fs.writeFileSync(path.join(ROOT, p.file), p.body);
// ORDER.txt: the new files go straight after the original
const ordPath = path.join(ROOT, 'js/ORDER.txt');
const ord = fs.readFileSync(ordPath, 'utf8').split('\n');
const me = rel.replace(/^js\//, '');
const idx = ord.findIndex((l) => l.split('#')[0].trim() === me);
if (idx < 0) { console.error('warning: ' + me + ' is not in js/ORDER.txt; add the new files by hand'); process.exit(0); }
const pad = (s) => (s + ' '.repeat(33)).slice(0, Math.max(33, s.length + 1));
ord.splice(idx + 1, 0, ...pieces.slice(1).map((p) => pad(p.file.replace(/^js\//, '')) + '# ' + p.purpose));
fs.writeFileSync(ordPath, ord.join('\n'));
console.log('split ' + rel + ' into ' + pieces.map((p) => path.basename(p.file) + ' (' + (p.to - p.from + 1) + ' lines)').join(', '));
