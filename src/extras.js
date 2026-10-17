'use strict';
/* ===== Eisenbuch: Übungsbilder, Supersätze, Fortschrittsfotos, Monatsrückblick, CSV-Import ===== */

/* ----- Übungsbilder (free-exercise-db, gemeinfrei). EXIMG wird beim Bauen eingefügt. ----- */
function exImg(id, k) { const d = typeof EXIMG !== 'undefined' && EXIMG[id]; return d ? 'img/ex/' + d + '-' + (k || 0) + '.jpg' : null; }
let EXINFO = null;
function loadExInfo() { if (EXINFO || typeof EXIMG === 'undefined' || !Object.keys(EXIMG).length) return Promise.resolve(EXINFO); return fetch('img/ex/instructions.json').then(r => r.json()).then(j => { EXINFO = j; return j; }).catch(() => null); }
function exPics(id, cls) {
  const a = exImg(id, 0); if (!a) return '';
  return '<div class="' + (cls || 'fimgs') + '"><img src="' + a + '" alt="Startposition" loading="lazy" onerror="this.parentNode.remove()"><img src="' + exImg(id, 1) + '" alt="Endposition" loading="lazy" onerror="this.remove()"></div>';
}
function exHowTo(id) {
  const d = typeof EXIMG !== 'undefined' && EXIMG[id]; if (!d) return '';
  if (!EXINFO) { loadExInfo().then(() => { if (S.ui.sheet && S.ui.sheet.t === 'ex' && S.ui.sheet.id === id) renderSheet(); }); return ''; }
  const st = EXINFO[d]; if (!st || !st.length) return '';
  return '<details style="margin-top:10px"><summary>Ausführung (englisch)</summary><ol class="howto">' + st.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></details>';
}

/* ----- Supersätze: Plan-Item {exId, ss:true} = mit der nächsten Übung im Wechsel ----- */
function ssPartner(a, i) { const it = a.items[i]; if (it && it.ss && a.items[i + 1]) return i + 1; if (i > 0 && a.items[i - 1].ss) return i - 1; return null; }

/* ----- Fortschrittsfotos (IndexedDB, nur auf diesem Gerät) ----- */
const PhotoDB = {
  db:null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => { try { const r = indexedDB.open('eisenbuch-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'}); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  },
  tx(mode, fn) { return this.open().then(db => new Promise((res, rej) => { const t = db.transaction('p', mode), st = t.objectStore('p'), q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); })); },
  all() { return this.tx('readonly', st => st.getAll()).catch(() => []); },
  put(o) { return this.tx('readwrite', st => st.put(o)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); }
};
function loadPhotos() { return PhotoDB.all().then(list => { S.photos = (list || []).sort((a, b) => a.date < b.date ? 1 : -1); S.photosLoaded = true; }); }
function resizeImage(file, max, q) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q)); }; img.onerror = rej; img.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
async function addPhoto(file) {
  try {
    const full = await resizeImage(file, 1280, 0.82), thumb = await resizeImage(file, 300, 0.7);
    const o = {id:uid('ph'), date:S.ui.phDate || todayStr(), pose:S.ui.phPose || 'Vorne', full, thumb};
    await PhotoDB.put(o); await loadPhotos(); render(); toast('Foto gespeichert (nur auf diesem Gerät).');
  } catch (e) { toast('Foto konnte nicht gespeichert werden.'); }
}
function bodyKgAt(ds) { const b = S.body.slice().sort((x, y) => Math.abs(parseD(x.date) - parseD(ds)) - Math.abs(parseD(y.date) - parseD(ds)))[0]; return b && Math.abs(daysBetween(b.date, ds)) <= 7 ? b.kg : null; }
function vPhotos() {
  if (!S.photosLoaded) { loadPhotos().then(render); return '<div class="empty">Fotos werden geladen …</div>'; }
  const sel = S.ui.phSel || [];
  let h = '<div class="card"><h2>Fortschrittsfoto</h2><div class="pair"><div><label class="lab" for="ph-date">Datum</label><input type="date" id="ph-date" data-chg="phdate" value="' + esc(S.ui.phDate || todayStr()) + '"></div>' +
    '<div><label class="lab" for="ph-pose">Ansicht</label><select id="ph-pose" data-chg="phpose">' + ['Vorne', 'Seite', 'Hinten'].map(x => '<option' + ((S.ui.phPose || 'Vorne') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
    '<label class="btn wide" for="ph-in" style="margin-top:12px">' + I(ICONS.plus, 'i s') + ' Foto aufnehmen oder auswählen</label><input type="file" id="ph-in" accept="image/*" hidden>' +
    '<p class="hint" style="margin-top:8px">Tipp: gleiches Licht, gleiche Stelle, gleiche Uhrzeit, z. B. alle 4 Wochen morgens. Fotos bleiben nur auf diesem Gerät und sind nicht in der Sicherung enthalten.</p></div>';
  if (!S.photos.length) return h + '<div class="empty">Noch keine Fotos.</div>';
  h += '<div class="row" style="margin:6px 0 8px"><span class="sub">' + (sel.length ? sel.length + ' ausgewählt' : 'Zwei Fotos antippen zum Vergleichen') + '</span>' + (sel.length === 2 ? '<button class="btn sm" data-act="ph-cmp">Vergleichen</button>' : '') + '</div><div class="phgrid">' +
    S.photos.map(p => '<button class="ph' + (sel.includes(p.id) ? ' sel' : '') + '" data-act="ph-sel" data-v="' + p.id + '"><img src="' + p.thumb + '" alt="Foto ' + esc(p.pose) + ' vom ' + esc(dshort(p.date)) + '"><small>' + esc(dshort(p.date)) + ' · ' + esc(p.pose) + '</small></button>').join('') + '</div>';
  return h;
}
function photoCmpHTML(ids) {
  const ps = ids.map(id => S.photos.find(p => p.id === id)).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
  return '<h2>Vergleich</h2><div class="phcmp">' + ps.map(p => { const kg = bodyKgAt(p.date); return '<figure><img src="' + p.full + '" alt="Foto vom ' + esc(dshort(p.date)) + '"><figcaption>' + esc(dlong(p.date)) + (kg ? ' · ' + fkg(kg) : '') + '</figcaption></figure>'; }).join('') + '</div>' +
    (ps.length === 2 ? '<p class="sub" style="text-align:center">' + daysBetween(ps[0].date, ps[1].date) + ' Tage dazwischen</p>' : '') +
    '<div class="row" style="margin-top:12px">' + ps.map(p => '<button class="btn sm danger" data-act="ph-del" data-v="' + p.id + '">' + esc(dshort(p.date)) + ' löschen</button>').join('') + '</div><button class="btn ghost wide" style="margin-top:12px" data-act="close">Schließen</button>';
}

/* ----- Monatsrückblick ----- */
function monthStats(ym) {
  const inM = d => d.startsWith(ym), ss = S.sessions.filter(s => inM(s.date)), before = S.sessions.filter(s => s.date < ym + '-01');
  const prs = [];
  const ids = new Set(); ss.forEach(s => s.exercises.forEach(x => ids.add(x.exId)));
  ids.forEach(id => {
    const e = EX[id]; if (!e) return;
    const h = history(S.sessions, id), m = h.filter(x => inM(x.date)), b = h.filter(x => x.date < ym + '-01');
    if (!m.length || !b.length || m[0].unit !== b[0].unit) return;
    const mx = Math.max(...m.map(x => x.v)), bx = Math.max(...b.map(x => x.v));
    if (mx > bx + 0.4) prs.push({id, v:mx, prev:bx, unit:m[0].unit});
  });
  const bd = S.body.filter(b => inM(b.date)).sort((a, b) => a.date < b.date ? -1 : 1);
  const tricks = Object.entries(S.p.tricks || {}).filter(([id, t]) => t.first && inM(t.first) && TR[id]).map(([id]) => id);
  return {n:ss.length, dur:ss.reduce((a, s) => a + (s.dur || 0), 0), vol:ss.reduce((a, s) => a + sessionVolume(s), 0), sets:ss.reduce((a, s) => a + s.exercises.reduce((b, x) => b + workSets(x).length, 0), 0),
    km:S.runs.filter(r => inM(r.date)).reduce((a, r) => a + r.km, 0), wake:S.wake.filter(w => inM(w.date)).length, prs:prs.sort((a, b) => b.v / b.prev - a.v / a.prev),
    kg:bd.length > 1 ? Math.round((bd[bd.length - 1].kg - bd[0].kg) * 10) / 10 : null, tricks, before:before.length};
}
function reviewCard(ym) {
  const m = monthStats(ym), y = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1, prevYm = dstr(new Date(y, mo - 1, 1)).slice(0, 7), pm = monthStats(prevYm);
  const name = new Date(y, mo, 1).toLocaleDateString('de-DE', {month:'long'});
  const dlt = (a, b, f) => b ? '<small class="' + (a >= b ? 'up' : 'dn') + '">' + (a >= b ? '+' : '−') + f(Math.abs(a - b)) + ' zum Vormonat</small>' : '<small>&nbsp;</small>';
  if (!m.n && !m.km && !m.wake && m.kg === null) return '<div class="card"><h2>Rückblick ' + name + '</h2><p class="sub">In diesem Monat ist noch nichts eingetragen.</p></div>';
  let h = '<div class="card review"><h2>Rückblick ' + name + '</h2><div class="stats" style="margin:0">' +
    '<div><small>Krafteinheiten</small><b>' + m.n + '</b>' + dlt(m.n, pm.n, x => x) + '</div>' +
    '<div><small>Trainingszeit</small><b>' + fmt(Math.round(m.dur / 3600000 * 10) / 10) + ' h</b>' + dlt(m.dur, pm.dur, x => fmt(Math.round(x / 360000) / 10) + ' h') + '</div>' +
    '<div><small>Volumen</small><b>' + volT(m.vol) + '</b>' + dlt(m.vol, pm.vol, volT) + '</div></div>' +
    '<div class="stats"><div><small>Arbeitssätze</small><b>' + m.sets + '</b></div><div><small>Gelaufen</small><b>' + fmt(Math.round(m.km * 10) / 10) + ' km</b></div><div><small>Wake-Sessions</small><b>' + m.wake + '</b></div></div>';
  if (m.kg !== null) h += '<p style="margin-top:10px">Körpergewicht im Monat: <b>' + (m.kg > 0 ? '+' : '') + fmt(m.kg) + ' kg</b></p>';
  if (m.prs.length) h += '<h3 style="margin-top:12px">Neue Bestwerte</h3>' + m.prs.slice(0, 6).map(x => '<div class="exrow"><span>' + esc(EX[x.id].name) + '</span><span class="r">' + fmt(x.v) + ' ' + x.unit + ' ' + deltaHTML(pctDelta(x.v, x.prev)) + '</span></div>').join('');
  if (m.tricks.length) h += '<h3 style="margin-top:12px">Neue Tricks gestanden</h3><p>' + m.tricks.map(id => esc(TR[id].name)).join(', ') + '</p>';
  return h + '</div>';
}

/* ----- CSV-Import (Strong, Hevy, FitNotes und ähnliche Formate) ----- */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0], cnt = c => first.split(c).length, delim = [',', ';', '\t'].sort((a, b) => cnt(b) - cnt(a))[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function normName(s) { return String(s || '').toLowerCase().replace(/ß/g, 'ss').replace(/[äöü]/g, c => ({ä:'a', ö:'o', ü:'u'}[c])).replace(/[^a-z0-9]+/g, ' ').trim(); }
/* Englische Namen gängiger Übungen, wie andere Apps sie exportieren */
const EN_ALIAS = {bankdruecken:['bench press','barbell bench press'], 'schraegbank-lh':['incline bench press','barbell incline bench press'], 'negativ-lh':['decline bench press'],
  'bd-kh':['dumbbell bench press'], 'schraegbank-kh':['incline dumbbell press','incline dumbbell bench press'], kniebeuge:['squat','barbell squat','back squat'], frontkniebeuge:['front squat'],
  kreuzheben:['deadlift','barbell deadlift','conventional deadlift'], rdl:['romanian deadlift'], stiff:['stiff leg deadlift','straight leg deadlift'], ohp:['overhead press','military press','shoulder press barbell'],
  'sd-kh':['dumbbell shoulder press','seated dumbbell press'], 'lh-rudern':['barbell row','bent over row'], 'kh-rudern':['single arm row','one arm dumbbell row','dumbbell row'], 'kb-rudern':['cable row','seated row','seated cable row'],
  latzug:['lat pulldown','pulldown','wide grip pulldown','cable machine pulldown behind the neck wide grip'], klimmzuege:['pull up','pullup'], 'klimmzug-unter':['chin up','chinup'], 'split-squat':['bulgarian split squat','single leg squat','split squat'],
  beinpresse:['leg press','machine leg press','incline leg press'], beinstrecker:['leg extension'], 'beinbeuger-sitzend':['seated leg curl','leg curl'], 'beinbeuger-liegend':['lying leg curl'], 'waden-steh':['calf raise','standing calf raise'],
  'hip-thrust':['hip thrust'], 'curl-kabel':['cable curl','biceps curl cable'], 'curl-kh':['dumbbell curl','biceps curl'], hammer:['hammer curl'], pushdown:['triceps pushdown','tricep pushdown rope'],
  'seitheben-kh':['lateral raise','side lateral raise'], 'seitheben-ma':['machine lateral raise'], 'face-pull':['face pull'], 'cable-crunch':['cable crunch','crunch cable','cable machine crunch'], 'hanging-leg':['hanging leg raise','leg raise'],
  plank:['plank'], farmers:['farmers walk','farmer walk','farmers carry'], dips:['dips','chest dip'], 'dead-hang':['dead hang']};
const TOK_STOP = new Set(['flat','standing','the','with','a','of','on','to','medium','grip','version','attachment','and']);
const TOK_SYN = {crunches:'crunch', presses:'press', pulley:'cable', db:'dumbbell', bb:'barbell', tricep:'triceps', bicep:'biceps', pullup:'pull', chinup:'chin', squats:'squat'};
function toks(s) {
  return new Set(normName(s).split(' ').map(w => TOK_SYN[w] || w).map(w => w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w).map(w => TOK_SYN[w] || w).filter(w => w.length > 1 && !TOK_STOP.has(w)));
}
function matchExercise(name) {
  const n = normName(name); if (!n) return null;
  const al = S.p.exAlias && S.p.exAlias[n]; if (al && EX[al]) return al;
  const exact = EXLIST.find(e => normName(e.name) === n); if (exact) return exact.id;
  const a = toks(name); if (!a.size) return null;
  const score = b => { let i = 0; a.forEach(w => { if (b.has(w)) i++; }); return i / (a.size + b.size - i || 1); };
  let best = null, bs = 0;
  const cand = (id, txt, bonus) => { if (!EX[id]) return; const s = score(toks(txt)) + (bonus || 0); if (s > bs) { bs = s; best = id; } };
  Object.entries(EN_ALIAS).forEach(([id, list]) => list.forEach(x => cand(id, x, 0.05)));
  Object.entries(typeof EXIMG !== 'undefined' ? EXIMG : {}).forEach(([id, db]) => cand(id, db.replace(/_/g, ' ')));
  EXLIST.forEach(e => cand(e.id, e.name));
  return bs >= 0.5 ? best : null;
}
function csvAnalyze(text) {
  const rows = parseCSV(text); if (rows.length < 2) return {err:'Die Datei enthält keine Datenzeilen.'};
  const hd = rows[0].map(normName), find = re => hd.findIndex(h => re.test(h));
  const c = {date:find(/^(date|datum|start time|start_time|workout date|tag)$|date|datum/), ex:find(/exercise|ubung|uebung/), kg:find(/^(weight|weight kg|gewicht|kg|weight kgs?)$|weight|gewicht/), lbs:find(/lbs|pounds/),
    reps:find(/^(reps|wdh|wiederholungen|repetitions)$|reps|wdh/), name:find(/workout name|^title$|routine|^workout$|training/), dur:find(/duration|dauer/), sec:find(/^(seconds|duration seconds|zeit s)$/)};
  if (c.date < 0 || c.ex < 0) return {err:'Spalten für Datum und Übung nicht gefunden. Erwartet z. B. „Date“ und „Exercise Name“.'};
  const lbs = c.kg < 0 && c.lbs >= 0, sess = {}, names = {};
  rows.slice(1).forEach(r => {
    const dRaw = (r[c.date] || '').trim(), ex = (r[c.ex] || '').trim(); if (!dRaw || !ex) return;
    let ds = null; const m1 = dRaw.match(/(\d{4})-(\d{2})-(\d{2})/), m2 = dRaw.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/), m3 = dRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m1) ds = m1[1] + '-' + m1[2] + '-' + m1[3]; else if (m2) ds = (m2[3].length === 2 ? '20' + m2[3] : m2[3]) + '-' + pad2(m2[2]) + '-' + pad2(m2[1]); else if (m3) ds = m3[3] + '-' + pad2(m3[1]) + '-' + pad2(m3[2]);
    if (!ds) { const t = Date.parse(dRaw); if (!isNaN(t)) ds = dstr(new Date(t)); }
    if (!ds) return;
    let kg = parseNum(lbs ? r[c.lbs] : r[c.kg]) || 0; if (lbs) kg = Math.round(kg * 0.4536 * 4) / 4;
    const reps = Math.round(parseNum(r[c.reps]) || parseNum(r[c.sec]) || 0); if (!reps) return;
    const wn = (c.name >= 0 && r[c.name] || 'Import').trim(), key = ds + '|' + wn;
    (sess[key] = sess[key] || {date:ds, name:wn, ex:{}, dur:c.dur >= 0 ? r[c.dur] : null});
    (sess[key].ex[ex] = sess[key].ex[ex] || []).push({kg, reps, done:true});
    names[ex] = (names[ex] || 0) + 1;
  });
  const map = {}; Object.keys(names).forEach(n => { map[n] = matchExercise(n); });
  const list = Object.values(sess).sort((a, b) => a.date < b.date ? -1 : 1);
  return {sess:list, names, map, sets:Object.values(names).reduce((a, b) => a + b, 0), lbs};
}
function csvPreviewHTML(an) {
  if (an.err) return '<h2>Import nicht möglich</h2><p>' + esc(an.err) + '</p><button class="btn ghost wide" data-act="close">Schließen</button>';
  const known = Object.entries(an.map).filter(([, v]) => v), unknown = Object.entries(an.map).filter(([, v]) => !v);
  return '<h2>Training importieren</h2><p>' + an.sess.length + ' Einheiten mit ' + an.sets + ' Sätzen, ' + esc(dshort(an.sess[0].date)) + ' bis ' + esc(dshort(an.sess[an.sess.length - 1].date)) + (an.lbs ? ', Gewichte von lbs in kg umgerechnet' : '') + '.</p>' +
    '<h3 style="margin-top:10px">Zugeordnet (' + known.length + ')</h3><div class="maplist">' + known.map(([n, id]) => '<div><span>' + esc(n) + '</span><b>' + esc(EX[id].name) + '</b></div>').join('') + '</div>' +
    (unknown.length ? '<h3 style="margin-top:10px">Werden als eigene Übung angelegt (' + unknown.length + ')</h3><p class="sub">' + unknown.map(([n]) => esc(n)).join(', ') + '</p>' : '') +
    '<p class="hint" style="margin-top:8px">Bereits importierte Einheiten werden übersprungen. Plan und Blockstand bleiben unverändert, die Einheiten erscheinen in Verlauf und Statistik.</p>' +
    '<button class="btn wide" style="margin-top:12px" data-act="csv-go">Importieren</button><button class="btn ghost wide" style="margin-top:8px" data-act="close">Abbrechen</button>';
}
function csvImport(an) {
  const map = {...an.map};
  Object.keys(map).forEach(n => {
    if (map[n]) return;
    const c = {id:'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name:n, m:'Ganzkörper', eq:'SO', c:false, t:false, l:false};
    S.p.custom = (S.p.custom || []).concat([c]); map[n] = c.id;
  });
  registerCustom(S.p);
  S.p.exAlias = S.p.exAlias || {}; Object.entries(map).forEach(([n, id]) => { S.p.exAlias[normName(n)] = id; });
  const have = new Set(S.sessions.map(s => s.importKey).filter(Boolean)); let added = 0;
  an.sess.forEach(s => {
    const key = s.date + '|' + s.name + '|' + Object.keys(s.ex).join(','); if (have.has(key)) return;
    const dur = s.dur ? (parseDur(String(s.dur).replace(/[hms]/g, ':').replace(/:+$/, '')) || 0) * 1000 : 0;
    const sess = {id:uid('s'), date:s.date, start:parseD(s.date).getTime() + 43200000, end:0, dur, planId:null, tplId:null, name:s.name, block:0, week:0, label:'Import', deload:false, n:null, imported:true, importKey:key,
      exercises:Object.entries(s.ex).map(([n, sets]) => ({exId:map[n], plan:{mode:'dp'}, feel:'ok', sets}))};
    S.sessions.push(sess); Cloud.put('sessions', sess.id, sess); added++;
  });
  S.sessions.sort((a, b) => a.start - b.start); saveProfile(); lsSave();
  return added;
}
