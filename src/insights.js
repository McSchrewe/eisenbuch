'use strict';
/* ===== Eisenbuch: Zug-Druck-Bilanz, Kraft pro kg Körpergewicht, Prognose zum Saisonstart ===== */

function bwNow() { const b = typeof latestBody === 'function' ? latestBody() : null; return (b && (b.avg || b.kg)) || (S.p && S.p.bw) || null; }

/* Bestes geschätztes 1RM der letzten `days` Tage aus den Einheiten (Epley bis 12 Wdh.). Körpergewichtsübungen: Körpergewicht + Zusatzlast. */
function bestE1(id, days, bw) {
  const e = EX[id]; if (!e) return null;
  const from = addDays(todayStr(), -(days || 84)); let best = 0;
  S.sessions.forEach(s => {
    if (s.date < from) return;
    (s.exercises || []).forEach(x => {
      if (x.exId !== id) return;
      workSets(x).forEach(q => {
        if (!(q.reps > 0) || q.reps > 12) return;
        const load = e.eq === 'KG' ? (bw ? bw + (q.kg || 0) : 0) : (q.kg || 0);
        if (load > 0) best = Math.max(best, EPLEY(load, q.reps));
      });
    });
  });
  return best ? roundHalf(best) : null;
}
function liftE1(id, bw) {
  const e = EX[id]; if (!e) return null;
  if (e.eq !== 'KG' && S.p.e1 && S.p.e1[id]) return S.p.e1[id];
  return bestE1(id, 84, bw);
}
function bestOf(ids, bw) { let b = null; ids.forEach(id => { const v = liftE1(id, bw); if (v && (!b || v > b.v)) b = {id, v}; }); return b; }

/* Richtwerte (Faustregeln aus dem Krafttraining, keine Normen): Rudern ≈ Bankdrücken, Klimmzug gesamt ≈ 1,4 × Schulterdrücken.
   Fürs Wakeboarden soll der Zug eher vorne liegen. */
const BAL_PAIRS = [
  {k:'h', t:'Horizontal', pull:['lh-rudern'], push:['bankdruecken'], good:0.9, ok:0.75, pullN:'Rudern', pushN:'Bankdrücken'},
  {k:'v', t:'Vertikal', pull:['klimmzuege', 'klimmzug-neutral', 'klimmzug-unter'], push:['ohp'], good:1.4, ok:1.1, pullN:'Klimmzug (KG + Zusatz)', pushN:'Schulterdrücken'}
];
function balanceData() {
  const bw = bwNow();
  return BAL_PAIRS.map(pr => {
    const pu = bestOf(pr.pull, bw), ps = bestOf(pr.push, bw);
    const r = pu && ps ? pu.v / ps.v : null;
    return {...pr, pu, ps, r, lvl:r === null ? null : r >= pr.good ? 'gut' : r >= pr.ok ? 'ok' : 'schwach'};
  });
}
const REL_IDS = [['kniebeuge', 'Kniebeuge'], ['kreuzheben', 'Kreuzheben'], ['bankdruecken', 'Bankdrücken'], ['ohp', 'Schulterdrücken'], ['lh-rudern', 'Rudern'], ['klimmzuege', 'Klimmzug gesamt']];
function balanceCard() {
  const bw = bwNow(), d = balanceData();
  if (!d.some(x => x.r !== null) && !bw) return '';
  const lv = {gut:['Gut fürs Wakeboarden', 'ok'], ok:['Ausgeglichen', 'mid'], schwach:['Zug holt auf', 'low']};
  let h = '<div class="card"><h2>Zug gegen Druck</h2><p class="sub">Fürs Handle zählt der Zug. Verhältnis der geschätzten Maximalgewichte (1RM).</p><div class="list flatlist" style="margin-top:8px">';
  d.forEach(x => {
    h += '<div class="balrow"><span><b>' + x.t + '</b><small>' + x.pullN + ' ÷ ' + x.pushN + (x.r !== null ? ': ' + fkg(x.pu.v) + ' ÷ ' + fkg(x.ps.v) : '') + '</small></span>' +
      (x.r !== null ? '<span class="balv ' + lv[x.lvl][1] + '"><b class="num">' + fmt(Math.round(x.r * 100) / 100) + '</b><small>' + lv[x.lvl][0] + '</small></span>' : '<span class="balv"><small>' + (!x.pu ? x.pullN : x.pushN) + ' fehlt noch</small></span>') + '</div>';
  });
  h += '</div><p class="hint" style="margin-top:6px">Richtwerte: horizontal ab 0,9, vertikal ab 1,4 gilt als zugstark. Unter 0,75 bzw. 1,1 hängt der Zug hinterher.</p>';
  if (bw) {
    const rows = REL_IDS.map(([id, n]) => ({n, v:liftE1(id, bw)})).filter(x => x.v);
    if (rows.length) h += '<h3 style="margin-top:12px">Pro kg Körpergewicht (' + fkg(bw) + ')</h3><div class="scrollx"><table class="tbl"><thead><tr><th>Übung</th><th>1RM</th><th>× KG</th></tr></thead><tbody>' +
      rows.map(x => '<tr><td>' + x.n + '</td><td>' + fkg(x.v) + '</td><td class="num">' + fmt(Math.round(x.v / bw * 100) / 100) + '</td></tr>').join('') + '</tbody></table></div>';
  } else h += '<p class="hint" style="margin-top:8px">Körpergewicht unter Körper eintragen, dann zeigt die Karte auch Kraft pro kg Körpergewicht.</p>';
  return h + '</div>';
}

/* ----- Prognose zum Saisonstart: linearer Trend der letzten 12 Wochen, gedämpft, als Spanne ----- */
function linFit(pts) {
  const n = pts.length; if (n < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0; pts.forEach(p => { num += (p.x - mx) * (p.y - my); den += (p.x - mx) * (p.x - mx); });
  return den ? {slope:num / den, my} : null;
}
function projectLift(id, days, bw) {
  const e = EX[id], from = addDays(todayStr(), -84), pts = [];
  S.sessions.forEach(s => {
    if (s.date < from) return;
    const x = (s.exercises || []).find(q => q.exId === id); if (!x) return;
    let best = 0; workSets(x).forEach(q => { if (q.reps > 0 && q.reps <= 12) { const load = e.eq === 'KG' ? (bw ? bw + (q.kg || 0) : 0) : (q.kg || 0); if (load > 0) best = Math.max(best, EPLEY(load, q.reps)); } });
    if (best) pts.push({x:daysTo(from, s.date), y:best});
  });
  const cur = liftE1(id, bw); if (!cur) return null;
  const f = linFit(pts);
  let perWeek = f ? f.slope * 7 : 0;
  perWeek = Math.max(0, Math.min(perWeek, cur * 0.0075)); /* höchstens +0,75 % pro Woche, kein Rückgang hochgerechnet */
  const w = days / 7, gain = perWeek * w;
  return {cur, lo:roundHalf(cur + gain * 0.35), hi:roundHalf(cur + gain * 0.8), n:pts.length, perWeek};
}
function projectGrip(days) {
  const h = typeof gripHist === 'function' ? gripHist('hang') : []; if (h.length < 2) return null;
  const first = h[0].t, pts = h.map(g => ({x:(g.t - first) / 864e5, y:gripVal(g)})), f = linFit(pts.length >= 3 ? pts : pts.concat([pts[pts.length - 1]]));
  const cur = gripVal(h[h.length - 1]); let perWeek = f ? Math.max(0, Math.min(f.slope * 7, cur * 0.05)) : 0;
  const gain = perWeek * days / 7;
  return {cur, lo:Math.round(cur + gain * 0.4), hi:Math.round(cur + gain)};
}
function prognoseCard() {
  const p = S.p; if (!p.season) return '';
  const days = daysTo(todayStr(), p.season); if (days <= 0) return '';
  const bw = bwNow();
  const rows = [['kniebeuge', 'Kniebeuge'], ['kreuzheben', 'Kreuzheben'], ['bankdruecken', 'Bankdrücken'], ['lh-rudern', 'Rudern'], ['klimmzuege', 'Klimmzug gesamt']]
    .map(([id, n]) => ({n, r:projectLift(id, days, bw)})).filter(x => x.r);
  const g = projectGrip(days);
  if (!rows.length && !g) return '';
  let h = '<div class="card"><h2>Prognose zum Saisonstart</h2><p class="sub">' + esc(dshort(p.season)) + ' · noch ' + days + ' Tage. Trend der letzten 12 Wochen, gedämpft, als Spanne.</p><div class="scrollx" style="margin-top:8px"><table class="tbl"><thead><tr><th>Übung</th><th>Jetzt</th><th>Saisonstart</th></tr></thead><tbody>' +
    rows.map(x => '<tr><td>' + x.n + '</td><td>' + fkg(x.r.cur) + '</td><td>' + (x.r.hi > x.r.cur ? fmt(x.r.lo) + '–' + fkg(x.r.hi) : fkg(x.r.cur) + ' <small class="sub">(stagniert)</small>') + '</td></tr>').join('') +
    (g ? '<tr><td>Dead Hang</td><td>' + g.cur + ' s</td><td>' + (g.hi > g.cur ? g.lo + '–' + g.hi + ' s' : g.cur + ' s <small class="sub">(stagniert)</small>') + '</td></tr>' : '') + '</tbody></table></div>' +
    '<p class="hint" style="margin-top:6px">Werte sind geschätzte Maximalgewichte (1RM). Mit weniger als 3 Einheiten in 12 Wochen fehlt ein Trend, dann steht der heutige Wert. Höchstens +0,75 % pro Woche werden hochgerechnet, nach oben gedämpft.</p></div>';
  return h;
}
