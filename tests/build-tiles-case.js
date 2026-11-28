/* Regression: every practice.build item must be solvable with the exact tile case.
   Tiles joined and split into words must equal the answer words (punctuation stripped), same case. */
const fs = require('fs'), path = require('path');
const P = /[.,;:!?"\u201c\u201d\u00ab\u00bb\u201e]/g;
const words = (s) => String(s).replace(P, '').split(/\s+/).filter(Boolean).sort();
function walk(d, out) {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/^session-.*\.json$/.test(f)) out.push(p);
  }
  return out;
}
const root = process.argv[2] || 'data';
let bad = 0, items = 0;
for (const f of walk(root, [])) {
  const b = ((JSON.parse(fs.readFileSync(f, 'utf8')).practice || {}).build) || [];
  b.forEach((it, i) => {
    items++;
    const t = words(it.tiles.join(' ')).join('|'), a = words(it.answer).join('|');
    if (t !== a) { bad++; console.log('MISMATCH', f, 'b' + i, JSON.stringify(it.tiles), '=>', it.answer); }
  });
}
console.log('build items checked:', items, 'mismatches:', bad);
process.exit(bad ? 1 : 0);
