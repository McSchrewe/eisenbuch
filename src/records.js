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
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
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
  if (!ids.length) return '<div class="empty">Noch keine Einträge. Rekorde entstehen automatisch, sobald du eine Übung zum zweiten Mal trainierst und dich verbesserst.</div>';
  const ev = recordEvents(S.sessions), last = {};
  ev.forEach(r => { if (!last[r.id]) last[r.id] = r.date; });
  const recent = d => d && (parseD(todayStr()) - parseD(d)) / 864e5 <= 14;
  const mon = todayStr().slice(0, 7), thisM = ev.filter(r => r.date.startsWith(mon)).length;
  let h = '<div class="stats tiles"><div><small>Rekorde gesamt</small><b>' + ev.length + '</b></div><div><small>Diesen Monat</small><b>' + thisM + '</b></div><div><small>Übungen</small><b>' + ids.length + '</b></div></div>';
  h += '<h2 class="sec">Neueste Rekorde</h2>' + (ev.length ? '<div class="list">' + ev.slice(0, 8).map(r => '<button class="exitem" data-act="ex-open" data-v="' + r.id + '">' + trophyMini() + '<span class="exm"><b>' + esc(EX[r.id].name) + '</b><small>' + REC_T[r.k] + ': ' + esc(recFmt(r.k, r)) + ' · vorher ' + esc(recUnit(r.k, r.prev)) + '</small></span><small class="num exr">' + esc(dshort(r.date)) + '</small></button>').join('') + '</div>' : '<div class="empty">Noch kein Rekord gebrochen. Ab dem zweiten Training einer Übung wird jede Verbesserung hier gefeiert.</div>');
  h += '<h2 class="sec">Bestwerte je Übung</h2><div class="list">' + ids.map(id => ({id, r:recordsOf(S.sessions, id)})).filter(x => x.r)
    .sort((a, b) => (last[b.id] || '').localeCompare(last[a.id] || '') || EX[a.id].name.localeCompare(EX[b.id].name))
    .map(({id, r}) => { const e = EX[id]; return '<button class="exitem" data-act="ex-open" data-v="' + id + '">' + avatar(e) + '<span class="exm"><b>' + esc(e.name) + '</b><small>' + recKinds(e).filter(k => r[k]).map(k => REC_T[k] + ': ' + esc(recFmt(k, r[k]))).join('<br>') + '</small></span>' + (recent(last[id]) ? trophyMini() : '') + '</button>'; }).join('') + '</div>' +
    '<p class="hint" style="margin-top:10px">Bester Satz = Gewicht × Wiederholungen eines einzelnen Satzes. Das geschätzte 1RM nutzt die Epley-Formel (bis 12 Wiederholungen). Die Trophäe markiert Rekorde der letzten 14 Tage.</p>';
  return h;
}
