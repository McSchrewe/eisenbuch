'use strict';
/* ===== Eisenbuch: Volumensteuerung je Muskel =====
   Harte Sätze: Arbeitssätze nahe am Muskelversagen. „Passend“ (1–2 Wdh. übrig) und „Limit“ zählen voll, „Leicht“ (3+) halb.
   Leistung: geschätztes 1RM (bzw. Wdh./Zeit) einer Woche im Verhältnis zum Bestwert der 4 Wochen davor.
   Achtung: Kraftfortschritt ist ein Stellvertreter für Muskelwachstum, kein direktes Maß. Umfänge im Körper-Reiter ergänzen das. */
const HARD_W = {easy:0.5, ok:1, hard:1};
const VOL_MUSCLES = ['Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Quadrizeps', 'Beinbeuger', 'Gesäß', 'Waden', 'Core', 'Unterarme'];
const VOL_BUCKETS = [[0, 5], [6, 9], [10, 13], [14, 17], [18, 99]];
function volWeeks(n) { const mon = mondayOf(todayStr()), out = []; for (let i = n; i >= 1; i--) out.push(addDays(mon, -7 * i)); return out; }
function sessOf(sessions, mon) { const end = addDays(mon, 7); return sessions.filter(s => s.date >= mon && s.date < end); }
function weekSpecial(sessions, mon) { return sessOf(sessions, mon).some(s => s.deload || s.prep); }
function hardSets(sessions, mon) {
  const o = {};
  sessOf(sessions, mon).forEach(s => s.exercises.forEach(x => { const e = EX[x.exId]; if (!e) return; o[e.m] = (o[e.m] || 0) + workSets(x).length * (HARD_W[x.feel] !== undefined ? HARD_W[x.feel] : 1); }));
  return o;
}
/* Leistung je Muskel in einer Woche: Mittel über die Übungen (Wochenbest / Bestwert der 4 Wochen davor) − 1 */
function musclePerf(sessions, m, mon) {
  const before = sessions.filter(s => s.date >= addDays(mon, -28) && s.date < mon), now = sessOf(sessions, mon), r = [];
  const ids = [...new Set(now.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => EX[id] && EX[id].m === m);
  ids.forEach(id => {
    const best = arr => { let b = 0; arr.forEach(s => s.exercises.forEach(x => { if (x.exId !== id) return; const v = metricOf(EX[id], x); if (v && v.v > b) b = v.v; })); return b; };
    const a = best(now), p = best(before); if (a > 0 && p > 0) r.push(a / p - 1);
  });
  return r.length ? r.reduce((x, y) => x + y, 0) / r.length : null;
}
/* Datenpaare (Sätze in Woche w, Fortschritt in Woche w+1) für die Sweet-Spot-Analyse */
function sweetData(sessions, m, weeks) {
  const ws = volWeeks(weeks || 26), pts = [];
  for (let i = 0; i < ws.length - 1; i++) {
    if (weekSpecial(sessions, ws[i]) || weekSpecial(sessions, ws[i + 1])) continue;
    const sets = hardSets(sessions, ws[i])[m] || 0, perf = musclePerf(sessions, m, ws[i + 1]);
    if (sets > 0 && perf !== null) pts.push({sets, perf});
  }
  return pts;
}
function sweetSpot(sessions, m) {
  const pts = sweetData(sessions, m);
  const b = VOL_BUCKETS.map(([lo, hi]) => { const q = pts.filter(p => p.sets >= lo && p.sets <= hi); return {lo, hi, n:q.length, avg:q.length ? q.reduce((x, y) => x + y.perf, 0) / q.length : null}; });
  const ok = b.filter(x => x.n >= 3), best = ok.length >= 2 ? ok.slice().sort((x, y) => y.avg - x.avg)[0] : null;
  return {pts, b, best};
}
/* Wöchentliche Anpassung: einmal pro Kalenderwoche beim Trainingsstart */
function volEvaluate(p, sessions) {
  if (p.volAuto === false) return [];
  const mon = mondayOf(todayStr()); if (p.volEval === mon) return [];
  p.volEval = mon; p.vol = p.vol || {}; p.volLog = p.volLog || [];
  const ws = volWeeks(3).filter(w => !weekSpecial(sessions, w)), ch = [];
  VOL_MUSCLES.forEach(m => {
    const perf = ws.map(w => musclePerf(sessions, m, w)).filter(v => v !== null);
    if (perf.length < 2) return;
    const avgP = perf.reduce((a, b) => a + b, 0) / perf.length, avgS = ws.reduce((a, w) => a + (hardSets(sessions, w)[m] || 0), 0) / ws.length;
    const cur = p.vol[m] || 0, sp = sweetSpot(sessions, m).best; let to = cur, why = '';
    if (sp && avgS < sp.lo) { to = cur + 1; why = 'unter deinem Sweet Spot (' + sp.lo + '–' + (sp.hi > 50 ? sp.lo + '+' : sp.hi) + ' Sätze)'; }
    else if (sp && avgS > sp.hi) { to = cur - 1; why = 'über deinem Sweet Spot'; }
    else if (avgP >= 0.01) { why = 'Fortschritt ' + fmt(Math.round(avgP * 1000) / 10) + ' %, Volumen bleibt'; }
    else if (avgP <= -0.02) { to = cur - 1; why = 'Leistung sinkt (' + fmt(Math.round(avgP * 1000) / 10) + ' %), weniger Volumen zur Erholung'; }
    else if (avgS >= 20) { to = cur - 1; why = 'Plateau bei viel Volumen (' + fmt(Math.round(avgS)) + ' Sätze), weniger ist hier mehr'; }
    else { to = cur + 1; why = 'Plateau (' + fmt(Math.round(avgP * 1000) / 10) + ' %), etwas mehr Volumen'; }
    to = Math.max(-2, Math.min(3, to));
    if (to !== cur) { p.vol[m] = to; ch.push({m, from:cur, to, why}); p.volLog.push({d:todayStr(), m, from:cur, to, why}); }
    else if (why) p.volWhy = Object.assign(p.volWhy || {}, {[m]:why});
  });
  ch.forEach(c => { p.volWhy = Object.assign(p.volWhy || {}, {[c.m]:c.why}); });
  if (p.volLog.length > 60) p.volLog = p.volLog.slice(-60);
  return ch;
}
/* Anwendung: zusätzlicher oder weggelassener Satz bei der ersten Übung des Muskels in der Einheit */
function applyVol(p, items, pr) {
  if (p.volAuto === false || !p.vol || pr.deload || pr.prep || pr.phase === 'power' || pr.phase === 'taper') return; /* kurz vor der Saison kein Zusatzvolumen */
  const done = {};
  items.forEach(it => {
    const e = EX[it.exId]; if (!e || done[e.m] || !p.vol[e.m] || !['pct', 'dp', 'bw'].includes(it.mode)) return;
    done[e.m] = true;
    const n = Math.max(1, Math.min(6, it.sets + p.vol[e.m])); if (n === it.sets) return;
    if (it.spec) { while (it.spec.length < n) it.spec.push({...it.spec[it.spec.length - 1], top:false}); it.spec = it.spec.slice(0, n); }
    it.volAdj = n - it.sets; it.sets = n;
  });
}
/* Plateau je Übung: kein neuer Bestwert in den letzten 3 Wochen bei mindestens 3 Einheiten */
function plateaus(sessions) {
  const ids = [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => EX[id]), out = [];
  ids.forEach(id => {
    const h = history(sessions, id), cut = addDays(todayStr(), -21), last = h.filter(x => x.date >= cut), before = h.filter(x => x.date < cut);
    if (last.length < 3 || before.length < 2) return;
    const bestB = Math.max(...before.map(x => x.v)), bestL = Math.max(...last.map(x => x.v));
    if (bestL <= bestB * 1.005) out.push({id, best:bestB, since:before.find(x => x.v === bestB).date, unit:h[0].unit});
  });
  return out;
}
function plateauTip(id) {
  const e = EX[id], mon = mondayOf(todayStr()), ws = volWeeks(3), avgS = ws.reduce((a, w) => a + (hardSets(S.sessions, w)[e.m] || 0), 0) / 3;
  const alt = EXLIST.filter(x => x.m === e.m && x.id !== id && x.c === e.c && x.eq !== 'KG').slice(0, 2).map(x => x.name);
  return (avgS < 10 ? '+1 Satz pro Einheit (bisher ⌀ ' + fmt(Math.round(avgS)) + ' harte Sätze/Woche für ' + e.m + ')' : avgS > 18 ? '−1 Satz, Erholung fehlt vermutlich (⌀ ' + fmt(Math.round(avgS)) + ' Sätze/Woche)' : 'Volumen passt, eher Variante tauschen') + (alt.length ? '. Varianten: ' + alt.join(', ') : '') + '.';
}

/* ----- Ansichten ----- */
function volCard() {
  volEvaluate(S.p, S.sessions); /* einmal pro Woche, sonst ohne Wirkung */
  const p = S.p, ws = volWeeks(3), rows = VOL_MUSCLES.map(m => {
    const avgS = ws.reduce((a, w) => a + (hardSets(S.sessions, w)[m] || 0), 0) / 3, perf = ws.map(w => musclePerf(S.sessions, m, w)).filter(v => v !== null);
    const avgP = perf.length ? perf.reduce((a, b) => a + b, 0) / perf.length : null, off = (p.vol && p.vol[m]) || 0;
    return {m, avgS, avgP, off, why:(p.volWhy && p.volWhy[m]) || ''};
  }).filter(r => r.avgS > 0 || r.off);
  let h = '<div class="card"><div class="row"><h2>Volumensteuerung</h2><button class="chip" data-act="vol-tog" aria-pressed="' + (p.volAuto !== false) + '">' + (p.volAuto !== false ? 'Auto an' : 'Auto aus') + '</button></div>' +
    '<p class="hint">Einmal pro Woche: Fortschritt pro Muskel bewerten und ±1 Satz bei der ersten Übung dieses Muskels anpassen. Harte Sätze = Arbeitssätze mit „Passend“ oder „Limit“, „Leicht“ zählt halb.</p>';
  if (!rows.length) return h + '<div class="empty" style="margin-top:8px">Nach den ersten 2–3 Trainingswochen erscheinen hier Werte.</div></div>';
  h += '<div class="scrollx"><table class="tbl"><thead><tr><th>Muskel</th><th>Sätze/Wo.</th><th>Fortschritt</th><th>±</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + r.m + '</td><td>' + fmt(Math.round(r.avgS * 10) / 10) + '</td><td>' + (r.avgP === null ? '–' : (r.avgP > 0 ? '+' : '') + fmt(Math.round(r.avgP * 1000) / 10) + ' %') + '</td><td>' + (r.off ? (r.off > 0 ? '+' : '') + r.off + ' Satz' : '–') + '</td></tr>').join('') + '</tbody></table></div>';
  const why = rows.filter(r => r.why);
  if (why.length) h += '<details style="margin-top:6px"><summary>Begründung</summary><div class="stack" style="padding:6px 0">' + why.map(r => '<p class="sub"><b>' + r.m + ':</b> ' + esc(r.why) + '</p>').join('') + '</div></details>';
  return h + '<p class="hint" style="margin-top:6px">Fortschritt = Bestwert der Woche im Vergleich zu den 4 Wochen davor (letzte 3 Wochen ohne Deload und Einstieg).</p></div>';
}
function sweetCard() {
  const m = S.ui.swm || 'Rücken', sp = sweetSpot(S.sessions, m), max = Math.max(0.02, ...sp.b.filter(x => x.avg !== null).map(x => Math.abs(x.avg)));
  let h = '<div class="card"><h2>Dein Sweet Spot</h2><p class="hint">Welche Zahl harter Sätze pro Woche brachte bei dir den meisten Fortschritt in der Folgewoche? Je länger du trainierst, desto genauer.</p><div class="chips scrollchips">' +
    VOL_MUSCLES.map(x => '<button class="chip" data-act="sw-m" data-v="' + x + '" aria-pressed="' + (x === m) + '">' + x + '</button>').join('') + '</div>';
  h += '<div class="sweet">' + sp.b.map(x => '<div class="swr' + (sp.best === x ? ' best' : '') + '"><span>' + x.lo + (x.hi > 50 ? '+' : '–' + x.hi) + '</span><div class="swt"><b style="width:' + (x.avg === null ? 0 : Math.max(2, Math.abs(x.avg) / max * 100)) + '%" class="' + (x.avg !== null && x.avg < 0 ? 'neg' : '') + '"></b></div><small>' + (x.avg === null ? '–' : (x.avg > 0 ? '+' : '') + fmt(Math.round(x.avg * 1000) / 10) + ' %') + ' · ' + x.n + ' Wo.</small></div>').join('') + '</div>';
  h += sp.best ? '<p style="margin-top:8px"><b>' + m + ':</b> bisher am besten bei ' + sp.best.lo + (sp.best.hi > 50 ? '+' : '–' + sp.best.hi) + ' harten Sätzen pro Woche (⌀ ' + (sp.best.avg > 0 ? '+' : '') + fmt(Math.round(sp.best.avg * 1000) / 10) + ' % in der Folgewoche, ' + sp.best.n + ' Wochen). Die Volumensteuerung richtet sich danach.</p>'
    : '<p class="hint" style="margin-top:8px">Noch zu wenig Daten: ' + sp.pts.length + ' auswertbare Wochen. Nötig sind mindestens 2 Satzbereiche mit je 3 Wochen.</p>';
  return h + '<p class="hint">' + (S.p.model === 'season' ? 'Gemessen wird dein Kraftfortschritt, also genau das, was auf dem Wasser zählt.' : 'Kraftfortschritt ist ein Stellvertreter für Muskelwachstum. Ob tatsächlich Masse dazukommt, zeigen die Umfänge unter Körper.') + '</p></div>';
}
function plateauCard() {
  const pl = plateaus(S.sessions); if (!pl.length) return '';
  return '<div class="card"><h2>Plateaus</h2><p class="hint">Kein neuer Bestwert in den letzten 3 Wochen (mindestens 3 Einheiten).</p><div class="list">' + pl.slice(0, 6).map(x => '<button class="exitem" data-act="ex-open" data-v="' + x.id + '">' + avatar(EX[x.id]) + '<span class="exm"><b>' + esc(EX[x.id].name) + '</b><small>Bestwert ' + fmt(x.best) + ' ' + x.unit + ' seit ' + esc(dshort(x.since)) + '. ' + esc(plateauTip(x.id)) + '</small></span></button>').join('') + '</div></div>';
}
