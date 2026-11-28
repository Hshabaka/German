// Static regression checks for the A2/B1 level-awareness change set.
// Run: node tests/site-static-checks.js  (from staging-site/, with ../staging present)
const fs = require('fs'), path = require('path');
const SITE = __dirname + '/..', STAGING = SITE + '/../staging';
let fails = 0;
function ok(cond, name) { if (!cond) { fails++; console.log('FAIL', name); } else console.log('ok  ', name); }

// 1. app.js patch markers + A1 fallback intact
const app = fs.readFileSync(SITE + '/js/app.js', 'utf8');
ok(app.includes("var LV = (document.body && document.body.getAttribute('data-level')) || 'a1';"), 'app.js: level attr with a1 default');
ok(app.includes("sessionUrl: LV === 'a1' ? 'data/session-' + SN + '.json'"), 'app.js: A1 sessionUrl byte-compatible');
ok(app.includes("'german-site.progress.' + LV + 's' + SID + '.v1'"), 'app.js: level-scoped progress key');
ok(app.includes("SN === 1 ? 'german-site.progress.v1' : 'german-site.progress.s' + SN + '.v1'"), 'app.js: A1 progress keys unchanged');
ok(app.includes('function sessionVideos()'), 'app.js: multi-video helper present');
ok(app.includes('vids.slice(1).forEach'), 'app.js: extra videos rendered');
ok(app.includes("g[LV] || (LV === 'a1' ? g.a1 : null)"), 'app.js: level-aware audio.json read');
ok(app.includes("LV === 'a1' ? 'session-' + SN : LV + '-session-' + SID"), 'app.js: level-aware expiring-video key');

// 2. sitenav session lists match staged session dirs exactly
const nav = fs.readFileSync(SITE + '/js/sitenav.js', 'utf8');
for (const lv of ['a2', 'b1']) {
  const m = nav.match(new RegExp(lv + ": \\{ code: '[A-Z0-9]+', sessions: \\[([^\\]]*)\\]"));
  const listed = m[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  const dirs = fs.readdirSync(STAGING + '/' + lv).filter(d => d.startsWith('s'))
    .map(d => d.slice(1)).map(s => /^\d+$/.test(s) ? String(parseInt(s, 10)) : s);
  ok(JSON.stringify([...listed].sort()) === JSON.stringify([...dirs].sort()), 'sitenav ' + lv + ' session list == staged dirs (' + listed.length + ')');
}
ok(nav.includes("sid === 'rev' ? 'Review'"), 'sitenav: review label');
ok(!nav.includes("t.soon, false, 1, 'A2', true"), 'sitenav: A2 no longer disabled');

// 3. session JSONs: schema keys + video(s) valid, b1 rev has exactly 2 videos
let nSess = 0;
for (const lvl of ['a2', 'b1']) {
  for (const f of fs.readdirSync(STAGING + '/data/' + lvl)) {
    const d = JSON.parse(fs.readFileSync(STAGING + '/data/' + lvl + '/' + f, 'utf8'));
    nSess++;
    for (const k of ['title', 'vocab', 'sentences', 'quiz', 'practice', 'grammar'])
      if (!(k in d)) { fails++; console.log('FAIL', f, 'missing', k); }
    const vids = d.videos || (d.video ? [d.video] : []);
    if (!vids.length) { fails++; console.log('FAIL', f, 'no video'); }
    for (const v of vids)
      if (!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{6,}$/.test(v.open_url || '')) { fails++; console.log('FAIL', f, 'bad video url'); }
    if (lvl === 'b1' && f === 'session-rev.json')
      ok(Array.isArray(d.videos) && d.videos.length === 2 && d.videos[0].open_url.includes('m_4BqV0xBiA') && d.videos[1].open_url.includes('qAB1dWpJiqk'), 'b1 rev: both review videos, primary first');
  }
}
ok(nSess === 36, '35 session JSONs checked, got ' + nSess);

// 4. shells: data-level/data-session attrs match data files
let nShell = 0;
for (const lvl of ['a2', 'b1']) {
  for (const dir of fs.readdirSync(STAGING + '/' + lvl)) {
    const h = fs.readFileSync(STAGING + '/' + lvl + '/' + dir + '/index.html', 'utf8');
    const lv = (h.match(/data-level="(\w+)"/) || [])[1];
    const sid = (h.match(/data-session="([\w]+)"/) || [])[1];
    nShell++;
    if (lv !== lvl) { fails++; console.log('FAIL', dir, 'level attr', lv); }
    if (!fs.existsSync(STAGING + '/data/' + lvl + '/session-' + sid + '.json')) { fails++; console.log('FAIL', dir, 'no data file for sid', sid); }
  }
}
ok(nShell === 36, '35 page shells checked, got ' + nShell);

// 5. index files + registry consistency
for (const lvl of ['a2', 'b1']) {
  const idx = JSON.parse(fs.readFileSync(SITE + '/data/' + lvl + '-index.json', 'utf8'));
  const reg = JSON.parse(fs.readFileSync(SITE + '/data/registry.json', 'utf8'));
  const rl = reg.levels[lvl].lessons;
  ok(idx.sessions.length === rl.length, lvl + ': index count == registry count (' + rl.length + ')');
  ok(rl.every(e => e.notion_row_id && e.youtube), lvl + ': every registry lesson has row id + youtube');
  ok(reg.levels.a1.lessons.length === 28, 'registry: A1 untouched (28 lessons)');
}

// 6. routes unique
const rm = JSON.parse(fs.readFileSync(STAGING + '/row-route-map.json', 'utf8'));
const routes = [];
for (const lvl of ['a2', 'b1']) for (const k in rm.levels[lvl]) if (!k.startsWith('_')) routes.push(rm.levels[lvl][k].route);
ok(new Set(routes).size === routes.length, 'routes unique (' + routes.length + ')');


// 7. URL sid classification (production blocker: zero-padded captures must normalize)
ok(nav.includes("if (/^\\d+$/.test(sid)) sid = String(parseInt(sid, 10));"), 'sitenav: numeric sid normalization present');
function classify(url) {
  let m;
  if (/\/a1\/s28\/exam\/?(index\.html)?$/.test(url)) return { kind: 'exam', level: 'a1' };
  if ((m = url.match(/\/(a1|a2|b1)\/(files|playlist)\/?(index\.html)?$/))) return { kind: m[2], level: m[1] };
  if ((m = url.match(/\/(a1|a2|b1)\/s([0-9a-z]+)\/?(index\.html)?$/))) { let sid = m[2]; if (/^\d+$/.test(sid)) sid = String(parseInt(sid, 10)); return { kind: 'lesson', level: m[1], sid: sid }; }
  if ((m = url.match(/\/(a1|a2|b1)\/(index\.html)?$/))) return { kind: 'list', level: m[1] };
  return { kind: 'home' };
}
const navLists = {};
for (const lv of ['a1', 'a2', 'b1']) {
  const m = nav.match(new RegExp(lv + ": \\{ code: '[A-Z0-9]+', sessions: \\[([^\\]]*)\\]"));
  navLists[lv] = (m[1].match(/'[^']+'/g) || []).map(s => s.slice(1, -1));
}
if (navLists.a1.length === 0 && nav.includes('for (var i = 1; i <= 28; i++) LEVELS.a1.sessions.push(String(i));'))
  for (let i = 1; i <= 28; i++) navLists.a1.push(String(i));
const urlCases = [
  ['/a1/s01/', 'a1', '1'], ['/a1/s07/', 'a1', '7'], ['/a1/s28/', 'a1', '28'],
  ['/a2/s01/', 'a2', '1'], ['/a2/s07/', 'a2', null], ['/a2/s12/', 'a2', '12'], ['/a2/s15/', 'a2', '15'], ['/a2/srev/', 'a2', 'rev'],
  ['/b1/s03/', 'b1', '3'], ['/b1/s15a/', 'b1', '15a'], ['/b1/s15c/', 'b1', '15c'], ['/b1/srev/', 'b1', 'rev'],
];
for (const [url, lv, want] of urlCases) {
  const c = classify(url);
  if (want === null) { ok(c.kind === 'lesson' && !(navLists[lv] || []).includes(c.sid), url + ' -> not in ' + lv + ' list (known gap s07)'); continue; }
  ok(c.kind === 'lesson' && c.level === lv && c.sid === want, url + ' -> ' + lv + '/' + want);
  const pos = (navLists[lv] || []).indexOf(c.sid);
  ok(pos >= 0, url + ' sid in LEVELS list (prev/next reachable, pos ' + pos + ')');
  if (c.sid === '1') ok(pos === 0, url + ' reset button condition sid===\'1\' met');
}
ok(classify('/a1/s28/exam/').kind === 'exam', '/a1/s28/exam/ -> exam');
ok(navLists.a2.length === 14 && navLists.a2.includes('13') && navLists.a2.includes('14'), 'sitenav a2 list includes 12+13+14 (14 sessions)');
// prev/next neighbors sanity: s12 neighbors s11 and s13, rev is last, s15a neighbors s14/s15b
ok(navLists.a2.indexOf('12') === navLists.a2.indexOf('11') + 1 && navLists.a2.indexOf('13') === navLists.a2.indexOf('12') + 1, 'a2 prev/next chain 11-12-13');
ok(navLists.a2[navLists.a2.length - 1] === 'rev' && navLists.b1[navLists.b1.length - 1] === 'rev', 'rev last in both levels');
ok(navLists.b1.indexOf('15a') === navLists.b1.indexOf('14') + 1 && navLists.b1.indexOf('15b') === navLists.b1.indexOf('15a') + 1, 'b1 chain 14-15a-15b');

// 8. provider-none rebase (production diff adopted)
ok(app.includes("provider === \x27none\x27) return;"), 'app.js: startVideo provider-none guard (top of startVideo)');
ok(app.includes("vid.provider === 'none'") && app.includes("PDF-based; there is no video"), 'app.js: renderLesson provider-none branch');
// 9. b1 s07: three videos on one row + every session JSON audio prefix matches its dir
{
  const d7 = JSON.parse(fs.readFileSync(path.join(STAGING, 'data/b1/session-7.json'), 'utf8'));
  ok(Array.isArray(d7.videos) && d7.videos.length === 3 && d7.video && d7.video.url === d7.videos[0].url, 'b1 s07: three videos, primary first, legacy video kept');
  let badPrefix = [];
  for (const lvl of ['a2', 'b1']) {
    const dir = path.join(STAGING, 'data', lvl);
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith('session-')) continue;
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const keys = [];
      (function walk(o) {
        if (Array.isArray(o)) o.forEach(walk);
        else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => k === 'audio' && typeof v === 'string' ? keys.push(v) : walk(v));
      })(d);
      const sid = f.replace('session-', '').replace('.json', '');
      const pad = lvl === 'b1' && /^\d+$/.test(sid) && sid.length === 1 ? '0' + sid : sid;
      const exp = lvl === 'a2' ? 'audio/a2/s' + String(parseInt(sid) || sid) + '/' : 'audio/b1/s' + pad + '/';
      const expA2rev = 'audio/a2/s' + sid + '/';
      if (!(keys.every(k => k.startsWith(exp)) || (lvl === 'a2' && keys.every(k => k.startsWith(expA2rev))))) badPrefix.push(lvl + '/' + f);
    }
  }
  ok(badPrefix.length === 0, 'audio key prefixes match session dirs: ' + (badPrefix.join(',') || 'all ok'));
}
const guardPos = app.indexOf("provider === 'none') return;");
const svPos = app.indexOf('function startVideo(retry) {');
ok(guardPos > svPos && guardPos - svPos < 200, 'app.js: guard scoped inside startVideo head');

// 10. honest missing-audio UI (pre-click unavailable state, A2/B1 chunk-only)
ok(app.includes("function chunkOnlyAudioNow() { return LV !== 'a1' || sessionNo() >= 9; }"), 'app.js: chunk-only gate scoped to A2/B1 + A1 s9+ (A1 s1-8 legacy preserved)');
ok(app.includes('function clipReady(src)') && app.includes("hasOwnProperty.call(window.AUDIO_DATA, src)"), 'app.js: clipReady checks AUDIO_DATA key presence');
ok(app.includes('function clipPlayable(src) { return !!src && (!chunkOnlyAudioNow() || clipReady(src)); }'), 'app.js: clipPlayable falls back to old behavior when gate off');
ok(app.includes("function noAudioChip()") && app.includes("'aria-label': 'Audio not available yet'") && app.includes("role: 'status'"), 'app.js: noAudioChip accessible (role=status + aria-label)');
ok(app.includes("if (clipPlayable(w.audio)) return tapRow(li, w.audio"), 'app.js: vocab row gated');
ok(app.includes("if (clipPlayable(sent.audio)) return tapRow(li, sent.audio"), 'app.js: sentence row gated');
ok(app.includes("clipPlayable(card.audio) ? audioButton(card.audio"), 'app.js: flashcard button gated');
ok(app.includes('clipPlayable(trSrc)') && app.includes("var trSrc = it.audio || ('audio/tr' + (i + 1) + '.mp3');"), 'app.js: translate reveal gated, A1 raw-path fallback string intact');
ok(!app.includes('speechSynthesis'), 'app.js: no browser TTS fallback presented as recorded audio');
// functional check of the helper logic, extracted and evaluated with stubs
{
  const start = app.indexOf('function chunkOnlyAudioNow');
  const end = app.indexOf('function noAudioChip()');
  const body = app.slice(start, end);
  function run(LV, sno, AUDIO_DATA) {
    const window = AUDIO_DATA === undefined ? {} : { AUDIO_DATA };
    const fn = new Function('window', 'LV', 'sessionNo', body + '; return { clipPlayable: clipPlayable, clipReady: clipReady };');
    return fn(window, LV, function () { return sno; });
  }
  ok(run('a1', 5, undefined).clipPlayable('audio/a1/s5/v1.mp3') === true, 'logic: A1 s1-8 playable without AUDIO_DATA (legacy fallback preserved)');
  ok(run('a1', 9, undefined).clipPlayable('audio/a1/s9/v1.mp3') === false, 'logic: A1 s9+ unplayable when key not loaded (production gate)');
  ok(run('a1', 9, { 'audio/a1/s9/v1.mp3': 'data:audio/mpeg;base64,x' }).clipPlayable('audio/a1/s9/v1.mp3') === true, 'logic: A1 s9+ playable when key loaded');
  ok(run('a2', 3, undefined).clipPlayable('audio/a2/s3/v1.mp3') === false, 'logic: A2 clip unplayable when no chunks loaded');
  const h = run('b1', 1, { 'audio/b1/s01/v1.mp3': 'data:audio/mpeg;base64,x' });
  ok(h.clipPlayable('audio/b1/s01/v1.mp3') === true, 'logic: B1 clip playable when key loaded');
  ok(h.clipPlayable('audio/b1/s01/v2.mp3') === false, 'logic: B1 clip unplayable when key missing from chunks');
  ok(run('a2', 3, {}).clipPlayable(null) === false, 'logic: null src never playable');
}
// 11. D1 hotfix preserved in adopted app (build-checker punctuation tolerance)
{
  ok(app.includes('function normBuildTokens(t) {'), 'D1: normBuildTokens present in adopted app.js');
  ok(app.includes('normBuildTokens(built).join'), 'D1: build check call site uses normBuildTokens');
  ok(!app.includes("built === it.answer.replace"), 'D1: old raw build comparison absent');
  ok(app.includes('var g = normBuildTokens(guess), t = normBuildTokens(it.answer);'), 'D1: buildHint uses normBuildTokens');
}

console.log(fails ? '\n' + fails + ' FAILURES' : '\nALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
