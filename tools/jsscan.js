// Shared by the tools: a small JavaScript tokenizer (enough to know bracket depth and skip strings, comments,
// regexes and templates) and a finder for top-level declarations. No dependencies.
'use strict';
const KW = new Set('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield await async of null true false undefined static get set arguments'.split(' '));
const REGEX_AFTER = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);

// ── a small tokenizer: enough to know depth, skip strings/comments/regex/templates, and see identifiers
function scan(src) {
  const toks = [];   // { t: 'id'|'p', v, d (depth before), line, dot (preceded by '.') }
  const stack = [];
  let i = 0, line = 1, last = null;   // last significant token
  const n = src.length;
  const push = (t, v) => { toks.push({ t, v, d: stack.length, line, dot: !!(last && last.t === 'p' && last.v === '.') }); last = toks[toks.length - 1]; };
  const regexOk = () => !last || (last.t === 'p' && !')]}'.includes(last.v)) || (last.t === 'id' && REGEX_AFTER.has(last.v));
  function template() {   // after the opening backtick (or a closing } of ${…})
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') line++;
      if (c === '`') { i++; last = { t: 'id', v: '`' }; return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; stack.push('${'); last = { t: 'p', v: '{' }; return; }
      i++;
    }
  }
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); for (let k = i; k < (e < 0 ? n : e); k++) if (src[k] === '\n') line++; i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") { i++; while (i < n && src[i] !== c) { if (src[i] === '\\') i++; else if (src[i] === '\n') line++; i++; } i++; last = { t: 'id', v: 'str' }; continue; }
    if (c === '`') { i++; template(); continue; }
    if (c === '/' && regexOk()) {   // regex literal
      i++; let cls = false;
      while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; i++; }
      i++; while (i < n && /[a-z]/i.test(src[i])) i++;
      last = { t: 'id', v: 're' }; continue;
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i + 1; while (j < n && /[\w$]/.test(src[j])) j++; push('id', src.slice(i, j)); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /[\w.]/.test(src[j])) j++; i = j; last = { t: 'id', v: 'num' }; continue; }
    if (c === '{' || c === '(' || c === '[') { push('p', c); stack.push(c); i++; continue; }
    if (c === '}' || c === ')' || c === ']') {
      const top = stack.pop();
      if (top === '${') { i++; template(); continue; }
      push('p', c); i++; continue;
    }
    if (c === '.' && src[i + 1] === '.' && src[i + 2] === '.') { push('p', '...'); i += 3; continue; }
    if (c === '=' && src[i + 1] === '>') { push('p', '=>'); i += 2; continue; }
    if (c === '?' && src[i + 1] === '.') { push('p', '.'); i += 2; continue; }
    push('p', c); i++;
  }
  toks.open = stack.length;   // anything left open means the tokenizer lost its way
  // object keys and method definitions are not uses: `{ name: …`, `, name: …`, `name(…) {`
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k], nx = toks[k + 1], pv = toks[k - 1];
    if (t.t !== 'id' || !nx) continue;
    if (nx.v === ':' && pv && (pv.v === '{' || pv.v === ',')) t.key = true;
    else if (nx.v === '(' && !KW.has(t.v)) {
      let m = k + 2; while (m < toks.length && !(toks[m].v === ')' && toks[m].d === nx.d)) m++;
      if (toks[m + 1] && toks[m + 1].v === '{') t.key = true;
    }
  }
  return toks;
}

// ── top-level declarations: function/class names, and every declarator of const/let/var at depth 0
function topLevel(toks) {
  const defs = [];
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.d !== 0 || t.t !== 'id') continue;
    if ((t.v === 'function' || t.v === 'class') && !(k > 0 && toks[k - 1].d === 0 && toks[k - 1].v === '=')) {
      let j = k + 1; if (toks[j] && toks[j].v === '*') j++;
      if (toks[j] && toks[j].t === 'id') defs.push({ name: toks[j].v, line: toks[j].line, kind: t.v });
      continue;
    }
    if (t.v === 'const' || t.v === 'let' || t.v === 'var') {
      let j = k + 1, expect = true;
      for (; j < toks.length; j++) {
        const u = toks[j];
        if (u.d === 0 && u.v === ';') break;
        if (expect && u.d === 0) {
          if (u.t === 'id') { defs.push({ name: u.v, line: u.line, kind: t.v }); expect = false; continue; }
          if (u.v === '{' || u.v === '[') {   // destructuring: names inside the pattern
            let m = j + 1;
            for (; m < toks.length && toks[m].d > 0; m++) {
              const w = toks[m];
              if (w.d === 1 && w.t === 'id' && !KW.has(w.v) && toks[m + 1] && toks[m + 1].v !== ':') defs.push({ name: w.v, line: w.line, kind: t.v });
            }
            j = m - 1; expect = false; continue;
          }
        }
        if (u.d === 0 && u.v === ',') expect = true;
        else if (u.d === 0 && u.t === 'id' && (u.v === 'const' || u.v === 'let' || u.v === 'var' || u.v === 'function')) { j--; break; }   // a missing ';'
      }
      k = j;
    }
  }
  return defs;
}


// where each top-level statement starts and ends: token index ranges and 1-based line numbers.
// A function or class declaration ends with its body's closing brace; everything else at the first `;` at depth 0.
// (A bare top-level block or loop without a `;` runs on into the next statement: fine for finding declarations.)
function statements(toks) {
  const out = [];
  let start = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.d !== 0) continue;
    const first = toks[start];
    const isDecl = first && (first.v === 'function' || first.v === 'class' || (first.v === 'async' && toks[start + 1] && toks[start + 1].v === 'function'));
    if ((isDecl && t.v === '}') || (!isDecl && t.v === ';')) { out.push({ from: start, to: k, line0: first.line, line1: t.line }); start = k + 1; }
  }
  return out;
}
module.exports = { KW, scan, topLevel, statements };
