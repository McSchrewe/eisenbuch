'use strict';
/* ===== Eisenbuch: Auswertungen (Zeiträume, Mini-Kurven, Kalender, Kennzahlen) ===== */
const PERIODS = [['1M', 'Monat', 31], ['3M', '3 Mon.', 92], ['1J', 'Jahr', 366], ['all', 'Alle', 1e5]];
function perFrom(key) { const p = PERIODS.find(x => x[0] === key) || PERIODS[1]; return addDays(todayStr(), -p[2]); }
function perChips(act, cur) { return '<div class="perc">' + PERIODS.map(p => '<button data-act="' + act + '" data-v="' + p[0] + '" aria-pressed="' + (cur === p[0]) + '">' + p[1] + '</button>').join('') + '</div>'; }
/* Mini-Kurve ohne Achsen für Listenzeilen */
function spark(vals) {
  if (vals.length < 2) return '<svg class="spark" viewBox="0 0 96 30" aria-hidden="true"></svg>';
  const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const pts = vals.map((v, i) => (i / (vals.length - 1) * 92 + 2).toFixed(1) + ',' + (27 - (v - lo) / r * 24).toFixed(1));
  const last = pts[pts.length - 1].split(',');
  return '<svg class="spark" viewBox="0 0 96 30" aria-hidden="true"><polyline points="' + pts.join(' ') + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6"/></svg>';
}
/* Trend: Steigung einer linearen Regression über die Zeit, in Einheiten pro 30 Tage */
function trend(pts) {
  if (pts.length < 3) return null;
  const xs = pts.map(p => p.t / 864e5), ys = pts.map(p => p.v), mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let nu = 0, de = 0; xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de += (x - mx) * (x - mx); });
  return de ? nu / de * 30 : null;
}
function trendIcon(slope, unit, good) {
  if (slope === null) return '<span class="tr flat">–</span>';
  const flat = Math.abs(slope) < (unit === 'kg' ? 0.3 : 0.2), up = slope > 0;
  const cls = flat ? 'flat' : (good === 'down' ? (up ? 'bad' : 'good') : good === 'up' ? (up ? 'good' : 'bad') : 'flat');
  return '<span class="tr ' + cls + '" title="' + (slope > 0 ? '+' : '') + fmt(Math.round(slope * 10) / 10) + ' ' + unit + ' pro 30 Tage">' + (flat ? '→' : up ? '↗' : '↘') + '</span>';
}
/* Kennzahlen-Tabelle wie bei Body-Data-Apps */
function statTable(rows) {
  return '<div class="scrollx"><table class="tbl stt"><thead><tr><th></th><th>Max</th><th>Min</th><th>Schnitt</th><th>Trend</th></tr></thead><tbody>' +
    rows.filter(r => r.pts.length).map(r => { const v = r.pts.map(p => p.v), d = r.dec == null ? 1 : r.dec, rd = x => fmt(Math.round(x * Math.pow(10, d)) / Math.pow(10, d));
      return '<tr><td>' + r.name + '</td><td>' + rd(Math.max(...v)) + '</td><td>' + rd(Math.min(...v)) + '</td><td>' + rd(v.reduce((a, b) => a + b) / v.length) + '</td><td>' + trendIcon(trend(r.pts), r.unit, r.good) + '</td></tr>'; }).join('') + '</tbody></table></div>';
}

/* ----- Statistik: Kraftentwicklung je Übung ----- */
function liftRows(per) {
  const from = perFrom(per), ids = new Set(MAIN_LIFTS);
  S.sessions.forEach(s => s.exercises.forEach(x => { const e = EX[x.exId]; if (e && !e.t && e.eq !== 'KG') ids.add(x.exId); }));
  const rows = [...ids].map(id => {
    const hs = history(S.sessions, id).filter(h => h.date >= from && h.unit === 'kg');
    return {id, hs, n:history(S.sessions, id).length};
  }).filter(r => MAIN_LIFTS.includes(r.id) || r.hs.length);
  rows.sort((a, b) => (MAIN_LIFTS.includes(b.id) - MAIN_LIFTS.includes(a.id)) || b.hs.length - a.hs.length);
  return rows.slice(0, 14);
}
function liftCard(per) {
  const rows = liftRows(per);
  return '<div class="card"><div class="row"><h2 style="margin:0">Kraftentwicklung</h2></div>' + perChips('sper', per) +
    '<p class="hint">Geschätztes 1RM je Einheit (bester Satz, Epley). Tippe für Verlauf, Rekorde und %-Tabelle.</p><div class="list flatlist">' +
    rows.map(r => {
      const e = EX[r.id], v = r.hs.map(h => h.v), first = v[0], last = v[v.length - 1], cur = S.p.e1[r.id] || last;
      return '<button class="lift" data-act="ex-open" data-v="' + r.id + '">' + avatar(e) + '<span><b style="font-weight:500">' + esc(e.name) + '</b><br><small>' + (r.hs.length ? r.hs.length + ' Einheiten im Zeitraum' : 'noch keine Einträge') + '</small></span>' +
        spark(v) + '<span class="lv"><b class="num">' + (cur ? fkg(roundHalf(cur)) : '–') + '</b>' + (v.length > 1 ? deltaHTML(pctDelta(last, first)) : '') + '</span></button>';
    }).join('') + '</div></div>';
}
/* Trainings pro Woche und Dauer */
function sessionsWeekly(weeks) {
  const mon = mondayOf(todayStr()), out = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({k:addDays(mon, -7 * i), v:0, dur:0});
  const idx = {}; out.forEach((o, i) => { idx[o.k] = i; });
  S.sessions.forEach(s => { const k = mondayOf(s.date); if (k in idx) { out[idx[k]].v++; out[idx[k]].dur += s.dur || 0; } });
  return out;
}
function workoutCard() {
  const wk = sessionsWeekly(12), done = S.sessions.filter(s => s.date >= addDays(todayStr(), -84)), avgDur = done.length ? done.reduce((a, s) => a + (s.dur || 0), 0) / done.length : 0;
  const plan = S.p.days.length, last4 = wk.slice(-4).reduce((a, w) => a + w.v, 0), quote = Math.round(last4 / (plan * 4) * 100);
  return '<div class="card"><h2>Trainings pro Woche</h2><div class="stats" style="margin:0 0 10px"><div><small>Letzte 4 Wochen</small><b>' + last4 + '</b><small>von ' + plan * 4 + ' geplant</small></div><div><small>Planerfüllung</small><b>' + Math.min(999, quote) + ' %</b></div><div><small>Ø Dauer</small><b>' + (avgDur ? Math.round(avgDur / 60000) + ' min' : '–') + '</b></div></div>' +
    '<p class="readout" data-ro>Diese Woche: ' + wk[wk.length - 1].v + ' von ' + plan + '</p>' + barChart(wk, '', 'Trainings pro Woche', v => v + (v === 1 ? ' Training' : ' Trainings')) + '</div>';
}

/* ----- Verlauf: Monatskalender ----- */
function calendarCard() {
  const base = S.ui.calM || todayStr().slice(0, 7), y = +base.slice(0, 4), m = +base.slice(5, 7) - 1;
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), off = (first.getDay() + 6) % 7, t = todayStr();
  const prev = dstr(new Date(y, m - 1, 1)).slice(0, 7), next = dstr(new Date(y, m + 1, 1)).slice(0, 7);
  const byDay = {};
  S.sessions.forEach(s => { (byDay[s.date] = byDay[s.date] || []).push({c:((s.planId && findPlan(S.p, s.planId)) || {}).color || 'var(--acc)', id:s.id, k:'s'}); });
  S.runs.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push({c:'#7FB8C9', id:r.id, k:'r'}); });
  S.grip.forEach(g => { if (!(byDay[g.date] || []).some(x => x.k === 'g')) (byDay[g.date] = byDay[g.date] || []).push({c:'#B5A27A', k:'g'}); });
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span></span>';
  let cnt = 0;
  for (let d = 1; d <= days; d++) {
    const ds = dstr(new Date(y, m, d)), ev = byDay[ds] || [], s = ev.find(x => x.k === 's'); if (s) cnt++;
    const plan = !ev.length && ds > t && planForDate(S.p, ds);
    cells += '<button class="cd' + (ds === t ? ' today' : '') + (s ? ' on' : '') + (plan ? ' plan' : '') + '"' + (s ? ' style="--c:' + s.c + '" data-act="sess-open" data-v="' + s.id + '"' : ev.find(x => x.k === 'r') ? ' data-act="run-open" data-v="' + ev.find(x => x.k === 'r').id + '"' : ' tabindex="-1"') + '>' + d +
      '<i>' + ev.filter(x => x.k !== 's').map(x => '<em style="background:' + x.c + '"></em>').join('') + '</i></button>';
  }
  const label = first.toLocaleDateString('de-DE', {month:'long', year:'numeric'});
  return '<div class="card cal"><div class="row"><button class="ic s" data-act="cal" data-v="' + prev + '" aria-label="Voriger Monat">' + I('<path d="M15 6l-6 6 6 6"/>') + '</button><b>' + label + '</b><button class="ic s" data-act="cal" data-v="' + next + '" aria-label="Nächster Monat">' + I(ICONS.chev) + '</button></div>' +
    '<div class="cgrid">' + DAYS.map(d => '<small>' + d + '</small>').join('') + cells + '</div>' +
    '<p class="hint" style="margin-top:8px">' + cnt + ' Krafteinheiten. Gefüllt: Training (Farbe des Plans). Punkte: Lauf (blau), Griff-Test (braun). Umrandet: geplant.</p></div>';
}
