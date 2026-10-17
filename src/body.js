'use strict';
/* ===== Eisenbuch: Körpermaße, Statistiken, eigene Übungen ===== */

/* ----- Körpergewicht ----- */
function bodySorted() { return S.body.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0); }
/* 7-Tage-Schnitt: Mittel aller Messungen der letzten 7 Kalendertage bis einschließlich dieses Tages */
function bodyTrend() {
  const b = bodySorted();
  return b.map(e => {
    const from = addDays(e.date, -6), win = b.filter(x => x.date >= from && x.date <= e.date);
    return {...e, avg:Math.round(win.reduce((a, x) => a + x.kg, 0) / win.length * 10) / 10};
  });
}
function saveBody(e) { lsSave(); Cloud.put('body', e.id, e); }
function latestBody() { const t = bodyTrend(); return t.length ? t[t.length - 1] : null; }
function vBody() {
  const tr = bodyTrend(), last = tr[tr.length - 1], f = S.ui.bf || (S.ui.bf = {date:todayStr()});
  const today = S.body.find(x => x.date === f.date);
  let h = '<div class="card"><h2>Messung eintragen</h2><div class="pair"><div><label class="lab" for="bf-date">Datum</label><input type="date" id="bf-date" value="' + esc(f.date) + '" data-chg="bfdate"></div>' +
    '<div><label class="lab" for="bf-kg">Gewicht (kg)</label><input type="text" inputmode="decimal" id="bf-kg" value="' + (today ? fmt(today.kg) : '') + '" placeholder="z. B. 82,4"></div>' +
    '<div><label class="lab" for="bf-bf">Körperfett (%, optional)</label><input type="text" inputmode="decimal" id="bf-bf" value="' + (today && today.bf ? fmt(today.bf) : '') + '"></div>' +
    '<div><label class="lab" for="bf-w">Taille (cm, optional)</label><input type="text" inputmode="decimal" id="bf-w" value="' + (today && today.waist ? fmt(today.waist) : '') + '"></div></div>' +
    '<p class="hint" style="margin-top:8px">Am besten morgens nach dem Aufstehen wiegen, immer unter denselben Bedingungen. Ein Eintrag pro Tag, ein zweiter überschreibt den ersten.</p>' +
    '<button class="btn wide" style="margin-top:8px" data-act="b-save">' + (today ? 'Eintrag aktualisieren' : 'Speichern') + '</button></div>';
  if (!tr.length) return h + '<div class="empty">Noch keine Messung. Die Kurve zeigt später den 7-Tage-Schnitt, weil das Tagesgewicht durch Wasser und Essen um 1–2 kg schwankt.</div>';
  const ago = tr.filter(x => x.date <= addDays(last.date, -28)), ref = ago.length ? ago[ago.length - 1] : tr[0], goal = S.p.bwGoal;
  const d30 = Math.round((last.avg - ref.avg) * 10) / 10;
  h += '<div class="card"><h2>Körpergewicht</h2><div class="stats" style="margin:0"><div><small>7-Tage-Schnitt</small><b>' + fkg(last.avg) + '</b></div><div><small>Letzte Messung</small><b>' + fkg(last.kg) + '</b><small>' + esc(dshort(last.date)) + '</small></div><div><small>Seit ' + esc(dshort(ref.date)) + '</small><b>' + (d30 > 0 ? '+' : '') + fmt(d30) + ' kg</b></div></div>';
  if (goal) h += '<p style="margin-top:10px">Ziel ' + fkg(goal) + ': noch ' + fmt(Math.abs(Math.round((last.avg - goal) * 10) / 10)) + ' kg ' + (last.avg > goal ? 'abnehmen' : last.avg < goal ? 'zunehmen' : '') + '.</p>';
  if (tr.length > 1) h += '<p class="readout" data-lro style="margin-top:10px">' + esc(dshort(last.date) + ': Schnitt ' + fkg(last.avg) + ' · gewogen ' + fkg(last.kg)) + '</p>' +
    lineChart(tr.map(x => ({t:parseD(x.date).getTime(), date:x.date, v:x.avg, top:'gewogen ' + fkg(x.kg)})), 'kg', 'Körpergewicht, 7-Tage-Schnitt') + '<p class="hint">Linie: 7-Tage-Schnitt. Tippe auf die Kurve für einzelne Tage.</p>';
  h += '<div class="row" style="justify-content:flex-start;gap:14px;margin-top:6px"><button class="link" data-act="b-goal">' + (goal ? 'Zielgewicht ändern' : 'Zielgewicht setzen') + '</button></div></div>';
  const withW = tr.filter(x => x.waist || x.bf);
  if (withW.length) { const lw = withW[withW.length - 1]; h += '<div class="card"><h2>Körperfett und Taille</h2><div class="stats" style="margin:0"><div><small>Körperfett</small><b>' + (lw.bf ? fmt(lw.bf) + ' %' : '–') + '</b></div><div><small>Taille</small><b>' + (lw.waist ? fmt(lw.waist) + ' cm' : '–') + '</b></div><div><small>Stand</small><b>' + esc(dshort(lw.date)) + '</b></div></div></div>'; }
  h += '<div class="card"><h2>Messungen</h2>' + tr.slice().reverse().slice(0, 30).map(x => '<div class="exrow"><span>' + esc(dweek(x.date)) + (x.bf || x.waist ? '<br><small>' + [x.bf ? fmt(x.bf) + ' % KF' : '', x.waist ? fmt(x.waist) + ' cm Taille' : ''].filter(Boolean).join(' · ') + '</small>' : '') + '</span><span class="r">' + fkg(x.kg) + ' <button class="link" data-act="b-del" data-v="' + x.id + '">Löschen</button></span></div>').join('') + '</div>';
  return h;
}
function bodySaveAct() {
  const date = $('#bf-date').value || todayStr(), kg = parseNum($('#bf-kg').value), bf = parseNum($('#bf-bf').value), w = parseNum($('#bf-w').value);
  if (!(kg > 30 && kg < 300)) { toast('Gewicht in kg eintragen, z. B. 82,4.'); return; }
  const old = S.body.find(x => x.date === date);
  const e = {id:old ? old.id : uid('b'), date, kg, bf:bf > 0 ? bf : null, waist:w > 0 ? w : null};
  S.body = S.body.filter(x => x.date !== date); S.body.push(e); saveBody(e);
  if (date >= (S.p.bwDate || '')) { S.p.bw = kg; S.p.bwDate = date; saveProfile(); }
  render(); toast('Gespeichert: ' + fkg(kg) + '.');
}

/* ----- Statistik: Sätze je Muskel, Serie ----- */
function muscleSets(fromDate, toDate) {
  const c = {};
  S.sessions.forEach(s => { if (s.date < fromDate || s.date >= toDate) return; s.exercises.forEach(x => { const e = EX[x.exId]; if (!e) return; const n = workSets(x).length; if (n) c[e.m] = (c[e.m] || 0) + n; }); });
  return c;
}
function muscleCard() {
  const mon = mondayOf(todayStr()), cur = muscleSets(mon, addDays(mon, 7)), prev = muscleSets(addDays(mon, -7), mon);
  const ms = MUSCLES.filter(m => m !== 'Ganzkörper' && (cur[m] || prev[m]));
  if (!ms.length) return '';
  const max = Math.max(20, ...ms.map(m => Math.max(cur[m] || 0, prev[m] || 0)));
  return '<div class="card"><h2>Sätze pro Muskelgruppe</h2><p class="hint">Diese Woche, in Klammern die Vorwoche. Häufig genannter Richtwert für Muskelaufbau: ca. 10–20 Arbeitssätze pro Muskel und Woche (Markierung).</p><div class="mbars">' +
    ms.map(m => { const v = cur[m] || 0; return '<div class="mrow"><span>' + m + '</span><div class="mtrack"><i class="band" style="left:' + (10 / max * 100) + '%;width:' + (10 / max * 100) + '%"></i><b style="width:' + (v / max * 100).toFixed(1) + '%"></b></div><span class="num">' + v + ' <small>(' + (prev[m] || 0) + ')</small></span></div>'; }).join('') + '</div></div>';
}
function weekStreak() {
  let mon = mondayOf(todayStr()), n = 0;
  const has = m => S.sessions.some(s => s.date >= m && s.date < addDays(m, 7)) || S.runs.some(r => r.date >= m && r.date < addDays(m, 7));
  if (!has(mon)) mon = addDays(mon, -7);
  while (has(mon) && n < 520) { n++; mon = addDays(mon, -7); }
  return n;
}

/* ----- Übungs-Details: Rekorde, Prozent-Tabelle, Notiz ----- */
function repRecords(id) {
  const e = EX[id], best = {};
  if (e.t || e.eq === 'KG') return null;
  S.sessions.forEach(s => s.exercises.forEach(x => { if (x.exId !== id) return; workSets(x).forEach(q => { [1,3,5,8,10,12].forEach(r => { if (q.reps >= r && q.kg > 0 && (!best[r] || q.kg > best[r].kg)) best[r] = {kg:q.kg, date:s.date}; }); }); }));
  return Object.keys(best).length ? best : null;
}
function exExtras(id) {
  const e = EX[id], p = S.p, e1 = e.c && !e.t && e.eq !== 'KG' ? e1Of(p, id) : null, rec = repRecords(id);
  let h = '';
  if (rec) h += '<h3 style="margin-top:14px">Rekorde je Wiederholungszahl</h3><div class="scrollx"><table class="tbl"><thead><tr><th>Wdh.</th><th>Bestes Gewicht</th><th>Datum</th></tr></thead><tbody>' +
    [1,3,5,8,10,12].filter(r => rec[r]).map(r => '<tr><td>' + r + (r > 1 ? '+' : '') + '</td><td>' + fkg(rec[r].kg) + '</td><td>' + esc(dshort(rec[r].date)) + '</td></tr>').join('') + '</tbody></table></div>';
  if (e1) h += '<h3 style="margin-top:14px">Prozent vom 1RM (' + fkg(e1) + ')</h3><div class="scrollx"><table class="tbl"><thead><tr><th>%</th><th>Gewicht</th><th>ca. Wdh.</th></tr></thead><tbody>' +
    [[95,2],[90,4],[85,6],[80,8],[75,10],[70,12],[65,15],[60,'15+']].map(a => '<tr><td>' + a[0] + ' %</td><td>' + fkg(Math.max(minKg(e), roundTo(e1 * a[0] / 100, e.inc))) + '</td><td>' + a[1] + '</td></tr>').join('') + '</tbody></table></div><p class="hint">Wiederholungen bis zum Muskelversagen, grob nach Epley. Für das Training mit 1–3 Wdh. Reserve rechnen.</p>';
  const note = (p.exNotes && p.exNotes[id]) || '';
  h += '<h3 style="margin-top:14px">Notiz</h3><textarea id="exnote" data-v="' + id + '" placeholder="z. B. Griffbreite, Sitzposition an der Maschine, Schmerzen vermeiden">' + esc(note) + '</textarea><button class="btn sm ghost" style="margin-top:6px" data-act="exnote-save" data-v="' + id + '">Notiz speichern</button>';
  if (e.custom) h += '<button class="btn sm danger" style="margin-top:10px;margin-left:8px" data-act="cx-del" data-v="' + id + '">Eigene Übung löschen</button>';
  return h;
}

/* ----- Eigene Übungen ----- */
function registerCustom(p) {
  (p.custom || []).forEach(c => {
    if (EX[c.id]) return;
    const e = {id:c.id, name:c.name, m:c.m, eq:c.eq, c:!!c.c, l:!!c.l, t:!!c.t, main:false, inc:INC[c.eq] || 2.5, custom:true};
    EX[e.id] = e; if (!c.hidden) EXLIST.push(e); /* gelöschte bleiben in EX, damit alte Einheiten lesbar bleiben */
  });
}
function customHTML() {
  return '<h2>Eigene Übung</h2><label class="lab" for="cx-name">Name</label><input type="text" id="cx-name" placeholder="z. B. Rudern am Wakeboard-Handle">' +
    '<div class="pair"><div><label class="lab" for="cx-m">Muskelgruppe</label><select id="cx-m">' + MUSCLES.map(m => '<option>' + m + '</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="cx-eq">Gerät</label><select id="cx-eq">' + Object.entries(EQUIP).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></div></div>' +
    '<label class="lab" for="cx-type">Art</label><select id="cx-type"><option value="w">Gewicht × Wiederholungen</option><option value="c">Grundübung (mit 1RM und Prozent-Vorgaben)</option><option value="t">Halten auf Zeit</option></select>' +
    '<button class="btn wide" style="margin-top:12px" data-act="cx-save">Übung anlegen</button><button class="btn ghost wide" style="margin-top:8px" data-act="close">Abbrechen</button>';
}
function customSave() {
  const name = $('#cx-name').value.trim(); if (name.length < 2) { toast('Namen eintragen.'); return; }
  const type = $('#cx-type').value, m = $('#cx-m').value;
  const c = {id:'c-' + Date.now().toString(36), name, m, eq:$('#cx-eq').value, c:type === 'c', t:type === 't', l:['Quadrizeps','Beinbeuger','Gesäß','Waden'].includes(m)};
  S.p.custom = (S.p.custom || []).concat([c]); registerCustom(S.p); saveProfile(); S.ui.sheet = null; render(); toast('Übung angelegt: ' + name);
}
