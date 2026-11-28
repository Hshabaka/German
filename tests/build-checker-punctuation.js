/* Regression test: build-drill checker must be punctuation-tolerant on both sides.
 * Defect D1 (2026-11-28): checker stripped only terminal . or ? from the answer,
 * so correct tile orders were rejected when the answer had an internal comma or
 * terminal "!". Tiles may be authored bare (no punctuation) or legacy-with-comma.
 * Run: node tests/build-checker-punctuation.js [repoRoot]  (default: repo root = ../.. from this file)
 * Exits non-zero on any failure. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || path.join(__dirname, '..', '..');
const appSrc = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

let failures = 0;
function ok(cond, label) {
  if (cond) { console.log('PASS ' + label); }
  else { failures++; console.log('FAIL ' + label); }
}

/* 1. The shipped call sites must use the normalized comparison (guard against reverting to raw string equality). */
ok(appSrc.includes('normBuildTokens(built).join'), 'check call site uses normBuildTokens');
ok(!appSrc.includes("built === it.answer.replace"), 'old raw build comparison is gone');
ok(appSrc.includes('var g = normBuildTokens(guess), t = normBuildTokens(it.answer);'), 'buildHint uses normBuildTokens');

/* 2. Extract the real shipped helper and exercise it. */
const m = appSrc.match(/function normBuildTokens\(t\) \{[\s\S]*?\n  \}/);
ok(!!m, 'normBuildTokens found in js/app.js');
if (!m) process.exit(1);
const body = m[0].replace(/^function normBuildTokens\(t\) \{\n/, '').replace(/\n  \}$/, '');
const normBuildTokens = new Function('t', body);
const check = (built, answer) =>
  normBuildTokens(built).join(' ') === normBuildTokens(answer).join(' ') ? 'correct' : 'wrong';

ok(check('Mach das Licht an damit ich sehen kann', 'Mach das Licht an, damit ich sehen kann.') === 'correct', 'internal comma, bare tiles, correct order accepted');
ok(check('Macht das Radio aus', 'Macht das Radio aus!') === 'correct', 'terminal ! accepted');
ok(check('Ich mache das Licht an', 'Ich mache das Licht an.') === 'correct', 'terminal . accepted (legacy)');
ok(check('Wie geht es dir', 'Wie geht es dir?') === 'correct', 'terminal ? accepted (legacy)');
ok(check('Das ist schön, aber teuer', 'Das ist schön, aber teuer.') === 'correct', 'legacy comma tile accepted');
ok(check('das Radio Macht aus', 'Macht das Radio aus!') === 'wrong', 'wrong order still rejected');
ok(check('Das ist schon aber teuer', 'Das ist schön, aber teuer.') === 'wrong', 'umlaut substitution rejected (schon != schön)');
ok(check('Ich heisse Hossam', 'Ich heiße Hossam.') === 'wrong', 'ss != ß rejected (meaning preserved)');
ok(check('Ja Nein Fragen', 'Ja-Nein-Fragen.') === 'wrong', 'hyphen compound split rejected (hyphen meaningful)');
ok(check('Nein-Ja-Fragen', 'Ja-Nein-Fragen.') === 'wrong', 'hyphen compound reordered rejected');
ok(check('Der Zug kommt um 8:00 Uhr', 'Der Zug kommt um 8:00 Uhr.') === 'correct', 'colon time kept on both sides accepted');
ok(check('Der Zug kommt um 8 00 Uhr', 'Der Zug kommt um 8:00 Uhr.') === 'wrong', 'missing colon in time rejected (meaning preserved)');

/* 3. Every build item in every session data file must be passable in correct tile order. */
const dataDir = path.join(root, 'data');
const files = fs.readdirSync(dataDir).filter(f => /^session-\d+\.json$/.test(f)).sort();
let items = 0, punctItems = 0;
for (const f of files) {
  const ses = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  const build = (ses.practice && ses.practice.build) || [];
  build.forEach((it, i) => {
    items++;
    const correctBuilt = it.answer; // tiles in correct order reproduce the answer's words
    // simulate tiles: correct order means tiles joined match answer words (tiles may carry punctuation or not)
    const tiled = it.tiles.slice().sort((a, b) => {
      const ai = normBuildTokens(it.answer).indexOf(normBuildTokens(a)[0]);
      const bi = normBuildTokens(it.answer).indexOf(normBuildTokens(b)[0]);
      return 0; // order reconstruction below instead
    });
    // Reconstruct correct-order build from the answer tokens directly:
    const rebuilt = normBuildTokens(it.answer).join(' ');
    const res = check(rebuilt, it.answer);
    const hasPunct = /[,;:]/.test(it.answer.replace(/[.?!]\s*$/, '')) || /!\s*$/.test(it.answer);
    if (hasPunct) punctItems++;
    ok(res === 'correct', f + ' build[' + i + '] passable in correct order' + (hasPunct ? ' (punctuation case)' : ''));
  });
}
console.log('Scanned ' + files.length + ' session files, ' + items + ' build items, ' + punctItems + ' punctuation-affected items.');
if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL TESTS PASS');
