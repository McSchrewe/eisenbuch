'use strict';
/* ===== Eisenbuch: Rekorde =====
   Je Übung: höchstes Gewicht, bester Satz (Gewicht × Wiederholungen = Satz-Volumen), geschätztes 1RM.
   Körpergewicht: meiste Wiederholungen und höchstes Zusatzgewicht. Zeitübungen: längste Zeit.
   Rekorde zählen erst ab dem zweiten Training einer Übung, sonst wäre jeder erste Satz ein Rekord. */
const REC_T = {kg:'Höchstes Gewicht', vol:'Bester Satz', e1:'Geschätztes 1RM', reps:'Meiste Wiederholungen', sec:'Längste Zeit'};
const REC_EPS = {kg:0.01, vol:0.5, e1:0.4, reps:0, sec:0};
function recKinds(e) { return e.t ? ['sec'] : e.eq === 'KG' ? ['reps', 'kg'] : ['kg', 'vol', 'e1']; }
function setVals(e, q) {
  const o = {};
  if (e.t) { if (q.reps > 0) o.sec = q.reps; }
  else if (e.eq === 'KG') { if (q.reps > 0) o.reps = q.reps; if (q.kg > 0) o.kg = q.kg; }
  else if (q.kg > 0 && q.reps > 0) { o.kg = q.kg; o.vol = Math.round(q.kg * q.reps * 10) / 10; if (q.reps <= 12) o.e1 = roundHalf(EPLEY(q.kg, q.reps)); }
  return o;
}
function recUnit(k, v) { return k === 'reps' ? v + ' Wdh.' : k === 'sec' ? v + ' s' : fkg(v); }
function recFmt(k, r) {
  if (k === 'kg') return fkg(r.v) + (r.reps ? ' × ' + r.reps : '');
  if (k === 'vol') return fmt(r.kg) + ' kg × ' + r.reps + ' = ' + fkg(r.v);
  if (k === 'e1') return '≈ ' + fkg(r.v);
  return recUnit(k, r.v);
}
/* Bestwerte einer Übung über eine Liste von Einheiten */
function recordsOf(sessions, id) {
  const e = EX[id]; if (!e) return null; const best = {};
  sessions.forEach(s => (s.exercises || []).forEach(x => {
    if (x.exId !== id) return;
    workSets(x).forEach(q => { const v = setVals(e, q); Object.keys(v).forEach(k => { if (!best[k] || v[k] > best[k].v) best[k] = {v:v[k], kg:q.kg, reps:q.reps, date:s.date}; }); });
  }));
  return Object.keys(best).length ? best : null;
}
/* Neue Rekorde eines Satzes gegenüber den bisherigen Bestwerten */
function newRecords(e, prev, q) {
  if (!prev) return [];
  const v = setVals(e, q), out = [];
  recKinds(e).forEach(k => { if (v[k] === undefined) return; const p = prev[k]; if (p && v[k] > p.v + REC_EPS[k]) out.push({k, v:v[k], kg:q.kg, reps:q.reps, prev:p.v}); });
  return out;
}
/* Rekorde einer ganzen Einheit (für die Zusammenfassung) */
function sessRecords(prevSessions, sess) {
  const out = [];
  sess.exercises.forEach(x => {
    const e = EX[x.exId]; if (!e) return;
    const prev = recordsOf(prevSessions, x.exId); if (!prev) return;
    const top = recordsOf([{date:sess.date, exercises:[x]}], x.exId); if (!top) return;
    recKinds(e).forEach(k => { const t = top[k], p = prev[k]; if (t && p && t.v > p.v + REC_EPS[k]) out.push({id:x.exId, k, v:t.v, kg:t.kg, reps:t.reps, prev:p.v}); });
  });
  return out;
}
/* Chronologische Rekord-Historie */
function recordEvents(sessions) {
  const best = {}, ev = [];
  sessions.slice().sort((a, b) => (a.start || 0) - (b.start || 0)).forEach(s => (s.exercises || []).forEach(x => {
    const e = EX[x.exId]; if (!e) return;
    const b = best[x.exId] = best[x.exId] || {}, had = Object.keys(b).length > 0, top = {};
    workSets(x).forEach(q => { const v = setVals(e, q); Object.keys(v).forEach(k => { if (!top[k] || v[k] > top[k].v) top[k] = {v:v[k], kg:q.kg, reps:q.reps}; }); });
    Object.keys(top).forEach(k => {
      if (had && b[k] && top[k].v > b[k].v + REC_EPS[k] && recKinds(e).includes(k)) ev.push({date:s.date, id:x.exId, k, v:top[k].v, kg:top[k].kg, reps:top[k].reps, prev:b[k].v});
      if (!b[k] || top[k].v > b[k].v) b[k] = {...top[k], date:s.date};
    });
  }));
  return ev.reverse();
}

/* ----- Trophäe ----- */
const TROPHY_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset=".55" stop-color="#F2B92E"/><stop offset="1" stop-color="#C98A12"/></linearGradient></defs>' +
  '<path d="M20 8h24v14c0 7-5.4 13-12 13s-12-6-12-13z" fill="url(#tg)"/><path d="M20 12H11c0 8 4 12 10 13M44 12h9c0 8-4 12-10 13" fill="none" stroke="#F2B92E" stroke-width="3.5" stroke-linecap="round"/>' +
  '<path d="M28 35h8v8h-8z" fill="#E0A21F"/><path d="M21 43h22l2 7H19z" fill="url(#tg)"/><rect x="16" y="50" width="32" height="6" rx="2" fill="#C98A12"/><path d="M26 12c-1 6 0 11 3 15" stroke="#FFF6CF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/></svg>';
function trophyMini() { return '<span class="trom">' + TROPHY_SVG + '</span>'; }
function showTrophy(e, recs) {
  const el = $('#trophy'); if (!el) return;
  el.innerHTML = '<div class="tro-card" role="alert"><div class="tro-ic">' + TROPHY_SVG + '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="tro-h">Neuer Rekord!</b><p class="tro-n">' + esc(e.name) + '</p>' +
    recs.map(r => '<div class="tro-row"><small>' + REC_T[r.k] + '</small><span>' + esc(recFmt(r.k, r)) + '</span><em>vorher ' + esc(recUnit(r.k, r.prev)) + '</em></div>').join('') + '<small class="tro-x">Antippen zum Schließen</small></div>';
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); $('#toast').classList.remove('on');
  clearTimeout(showTrophy.t); showTrophy.t = setTimeout(hideTrophy, 4500);
}
function hideTrophy() { const el = $('#trophy'); if (el) { el.hidden = true; el.classList.remove('go'); el.innerHTML = ''; } }
/* Live-Prüfung beim Abhaken eines Satzes: gegen alle früheren Einheiten und die schon erledigten Sätze dieses Trainings */
function liveRecordCheck(it, j) {
  const e = EX[it.exId], s = it.sets[j]; if (!e || s.warm) return [];
  if (!recordsOf(S.sessions, it.exId)) return []; /* erstes Training dieser Übung: noch keine Rekorde */
  const cur = {date:todayStr(), exercises:[{exId:it.exId, sets:it.sets.filter((q, k) => k !== j && q.done && !q.warm)}]};
  return newRecords(e, recordsOf(S.sessions.concat([cur]), it.exId), s);
}

/* ----- Rekord-Reiter in der Statistik ----- */
function vRecords() {
  const ids = [...new Set(S.sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => EX[id]);
  if (!ids.length) return badgesHTML() + '<div class="empty" style="margin-top:12px">Noch keine Einträge. Rekorde entstehen automatisch, sobald du eine Übung zum zweiten Mal trainierst und dich verbesserst.</div>';
  const ev = recordEvents(S.sessions), last = {};
  ev.forEach(r => { if (!last[r.id]) last[r.id] = r.date; });
  const recent = d => d && (parseD(todayStr()) - parseD(d)) / 864e5 <= 14;
  const mon = todayStr().slice(0, 7), thisM = ev.filter(r => r.date.startsWith(mon)).length;
  let h = badgesHTML() + '<div class="stats tiles" style="margin-top:14px"><div><small>Rekorde gesamt</small><b>' + ev.length + '</b></div><div><small>Diesen Monat</small><b>' + thisM + '</b></div><div><small>Übungen</small><b>' + ids.length + '</b></div></div>';
  h += '<h2 class="sec">Neueste Rekorde</h2>' + (ev.length ? '<div class="list">' + ev.slice(0, 8).map(r => '<button class="exitem" data-act="ex-open" data-v="' + r.id + '">' + trophyMini() + '<span class="exm"><b>' + esc(EX[r.id].name) + '</b><small>' + REC_T[r.k] + ': ' + esc(recFmt(r.k, r)) + ' · vorher ' + esc(recUnit(r.k, r.prev)) + '</small></span><small class="num exr">' + esc(dshort(r.date)) + '</small></button>').join('') + '</div>' : '<div class="empty">Noch kein Rekord gebrochen. Ab dem zweiten Training einer Übung wird jede Verbesserung hier gefeiert.</div>');
  h += '<h2 class="sec">Bestwerte je Übung</h2><div class="list">' + ids.map(id => ({id, r:recordsOf(S.sessions, id)})).filter(x => x.r)
    .sort((a, b) => (last[b.id] || '').localeCompare(last[a.id] || '') || EX[a.id].name.localeCompare(EX[b.id].name))
    .map(({id, r}) => { const e = EX[id]; return '<button class="exitem" data-act="ex-open" data-v="' + id + '">' + avatar(e) + '<span class="exm"><b>' + esc(e.name) + '</b><small>' + recKinds(e).filter(k => r[k]).map(k => REC_T[k] + ': ' + esc(recFmt(k, r[k]))).join('<br>') + '</small></span>' + (recent(last[id]) ? trophyMini() : '') + '</button>'; }).join('') + '</div>' +
    '<p class="hint" style="margin-top:10px">Bester Satz = Gewicht × Wiederholungen eines einzelnen Satzes. Das geschätzte 1RM nutzt die Epley-Formel (bis 12 Wiederholungen). Die Trophäe markiert Rekorde der letzten 14 Tage.</p>';
  return h;
}

/* ===== Abzeichen ===== */
const MEDAL_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 4h8l4 14h-8zM42 4h-8l-4 14h8z" fill="#5B9BE5"/><circle cx="32" cy="38" r="18" fill="url(#tg2)"/><circle cx="32" cy="38" r="13" fill="none" stroke="#FFF6CF" stroke-width="2" opacity=".7"/><path d="M32 29l2.8 5.8 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2-4.5-4.4 6.2-.9z" fill="#FFF6CF"/><defs><linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#C98A12"/></linearGradient></defs></svg>';
function bwNow() { const b = S.body.filter(x => x.kg > 0).sort((a, c) => a.date < c.date ? -1 : 1).pop(); return (b && b.kg) || S.p.bw || null; }
function e1x(id, f) { const bw = bwNow(), v = S.p.e1 && S.p.e1[id]; return !!(bw && v && v >= bw * f); }
function gripBest(type) { const h = S.grip.filter(g => g.type === type); return h.length ? Math.max(...h.map(gripVal)) : 0; }
const BADGES = [
  ['first', 'Kraft', 'Erstes Training', 'Die erste Einheit gespeichert', () => S.sessions.length >= 1],
  ['s10', 'Kraft', 'Dranbleiber', '10 Einheiten', () => S.sessions.length >= 10],
  ['s50', 'Kraft', 'Stammgast', '50 Einheiten', () => S.sessions.length >= 50],
  ['s100', 'Kraft', 'Eisenbuch-Veteran', '100 Einheiten', () => S.sessions.length >= 100],
  ['streak4', 'Kraft', 'Vier Wochen am Stück', '4 Wochen in Folge trainiert', () => weekStreak() >= 4],
  ['streak12', 'Kraft', 'Ein Quartal Disziplin', '12 Wochen in Folge trainiert', () => weekStreak() >= 12],
  ['rec1', 'Kraft', 'Erster Rekord', 'Einen Bestwert gebrochen', () => recordEvents(S.sessions).length >= 1],
  ['rec25', 'Kraft', 'Rekordjäger', '25 Rekorde', () => recordEvents(S.sessions).length >= 25],
  ['prep', 'Kraft', 'Sauber eingestiegen', 'Eine Einstiegsphase abgeschlossen', () => !!(S.p.prep && S.p.prep.doneBlock)],
  ['block1', 'Kraft', 'Block geschafft', 'Den ersten Trainingsblock ausgewertet', () => S.p.block.no >= 2],
  ['block4', 'Kraft', 'Vier Blöcke', 'Vier Trainingsblöcke ausgewertet', () => S.p.block.no >= 5],
  ['sq1', 'Kraft', 'Kniebeuge = Körpergewicht', 'Geschätztes 1RM Kniebeuge ≥ 1,0 × Körpergewicht', () => e1x('kniebeuge', 1)],
  ['sq15', 'Kraft', 'Kniebeuge 1,5 ×', 'Geschätztes 1RM Kniebeuge ≥ 1,5 × Körpergewicht', () => e1x('kniebeuge', 1.5)],
  ['dl2', 'Kraft', 'Kreuzheben 2 ×', 'Geschätztes 1RM Kreuzheben ≥ 2,0 × Körpergewicht', () => e1x('kreuzheben', 2)],
  ['bp1', 'Kraft', 'Bankdrücken = Körpergewicht', 'Geschätztes 1RM Bankdrücken ≥ 1,0 × Körpergewicht', () => e1x('bankdruecken', 1)],
  ['vol100', 'Kraft', '100 Tonnen', '100 t Gesamtvolumen bewegt', () => S.sessions.reduce((a, s) => a + sessionVolume(s), 0) >= 100000],
  ['g1', 'Griff', 'Erster Griff-Test', 'Ausgangswert für die Saison', () => S.grip.length >= 1],
  ['hang60', 'Griff', 'Eine Minute hängen', 'Dead Hang ≥ 60 s', () => gripBest('hang') >= 60],
  ['hang90', 'Griff', 'Klammergriff', 'Dead Hang ≥ 90 s', () => gripBest('hang') >= 90],
  ['w1', 'Wake', 'Erste Session', 'Die erste Wake-Session eingetragen', () => S.wake.length >= 1],
  ['w10', 'Wake', 'Saison-Stammgast', '10 Sessions in einem Jahr', () => { const c = {}; S.wake.forEach(w => { const y = w.date.slice(0, 4); c[y] = (c[y] || 0) + 1; }); return Object.values(c).some(n => n >= 10); }],
  ['inv', 'Wake', 'Kopfüber', 'Den ersten Invert gestanden', () => Object.keys(T_INV).some(id => tSt(id, 's') >= 2 || tSt(id, 'w') >= 2)],
  ['sw1', 'Wake', 'Andere Seite', 'Den ersten Trick in Switch gestanden', () => TRICKS.some(t => tSt(t.id, 'w') >= 2)],
  ['both10', 'Wake', 'Beidseitig', '10 Tricks in beiden Stances gestanden', () => riderStats().both >= 10],
  ['lvl3c', 'Wake', 'Level 3 komplett', 'Level 3 mit Switch abgeschlossen', () => riderStats().closed >= 3],
  ['lvl5', 'Wake', 'Rider-Level 5', 'Level 5 geöffnet', () => riderStats().lvl >= 5],
  ['lvl7', 'Wake', 'Showtime', 'Rider-Level 7: Inverts und Spins', () => riderStats().lvl >= 7],
  ['q80', 'Wake', 'Sitzt wirklich', 'Ein Trick mit ≥ 80 % über ≥ 10 Versuche', () => TRICKS.some(t => sitztReady(t.id, 's') || sitztReady(t.id, 'w'))],
  ['perfect', 'Wake', 'Fehlerlos', 'Eine Session mit ≥ 10 Versuchen und 100 % gelandet', () => S.wake.some(w => { const a = (w.tricks || []).reduce((b, x) => b + entA(x), 0), l = (w.tricks || []).reduce((b, x) => b + entL(x), 0); return a >= 10 && l === a; })],
  ['goals', 'Wake', 'Plan erfüllt', 'Alle Ziele einer Session gelandet', () => S.wake.some(w => w.goalN && w.goalHit === w.goalN)]
].map(b => ({id:b[0], cat:b[1], name:b[2], desc:b[3], test:b[4]}));
function badgeTest(b) { try { return !!b.test(); } catch (e) { return false; } }
/* Prüft alle Abzeichen. Beim allerersten Lauf still vergeben, damit bestehende Erfolge kein Popup-Gewitter auslösen. */
function checkBadges(silent) {
  if (!S.p) return [];
  const first = !S.p.badges; S.p.badges = S.p.badges || {};
  const got = BADGES.filter(b => !S.p.badges[b.id] && badgeTest(b));
  if (!got.length) { if (first) saveProfile(); return []; }
  got.forEach(b => { S.p.badges[b.id] = todayStr(); });
  saveProfile();
  if (!first && !silent) setTimeout(() => showBadges(got), S.ui.sheet ? 600 : 0);
  return got;
}
function showBadges(list) {
  const el = $('#trophy'); if (!el) return;
  el.innerHTML = '<div class="tro-card" role="alert"><div class="tro-ic">' + MEDAL_SVG + '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="tro-h">Abzeichen' + (list.length > 1 ? ' × ' + list.length : '') + '</b>' +
    list.map(b => '<div class="tro-row"><span style="text-align:left">' + esc(b.name) + '</span><small style="text-align:right">' + esc(b.cat) + '</small><em style="text-align:left">' + esc(b.desc) + '</em></div>').join('') + '<small class="tro-x">Antippen zum Schließen</small></div>';
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); $('#toast').classList.remove('on');
  clearTimeout(showTrophy.t); showTrophy.t = setTimeout(hideTrophy, 5000);
  beep(1047, 160); setTimeout(() => beep(1319, 160), 180); setTimeout(() => beep(1568, 300), 360); Nat.vib(120);
}
function badgesHTML(cat) {
  const list = BADGES.filter(b => !cat || b.cat === cat), have = S.p.badges || {}, n = list.filter(b => have[b.id]).length;
  return '<h2 class="sec">Abzeichen · ' + n + ' von ' + list.length + '</h2><div class="bgrid">' + list.map(b => '<div class="bdg' + (have[b.id] ? ' on' : '') + '"><span class="bm">' + MEDAL_SVG + '</span><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + (have[b.id] ? ' · ' + esc(dshort(have[b.id])) : '') + '</small></div>').join('') + '</div>';
}
