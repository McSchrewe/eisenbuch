'use strict';
/* ===== Eisenbuch: laufendes Training – kompakte Übersicht und Detailansicht je Übung ===== */
function woProg(it) { const w = it.sets.filter(s => !s.warm); return {done:w.filter(s => s.done).length, all:w.length}; }
function woTotals(a) { let d = 0, n = 0, vol = 0; a.items.forEach(it => it.sets.forEach(s => { if (s.warm) return; n++; if (s.done) { d++; vol += (s.kg || 0) * (s.reps || 0); } })); return {d, n, vol}; }
function targetShort(it) {
  const pl = it.plan;
  if (pl.mode === 'time') return pl.sets + ' × ' + pl.reps + ' s';
  if (pl.mode === 'bw') return pl.sets + ' × ' + pl.rng[0] + '–' + pl.rng[1] + ' ' + (pl.unit || 'Wdh.');
  if (pl.mode === 'pct') return pl.sets + ' × ' + pl.reps + ' · ' + fkg(pl.kg);
  return pl.sets + ' × ' + pl.rng[0] + '–' + pl.rng[1] + (pl.kg ? ' · ' + fkg(pl.kg) : '');
}
function targetLong(it) {
  const pl = it.plan;
  if (pl.mode === 'pct' && pl.top) { const b = it.sets.find(q => !q.top && !q.warm); return '<b>Topsatz ' + fkg(pl.kg) + ' × ' + pl.reps + '</b>' + (b ? ' · dann ' + it.sets.filter(q => !q.top && !q.warm).length + ' × ' + b.reps + ' @ ' + fkg(b.kg) : '') + ' · 1RM ' + fkg(pl.e1); }
  if (pl.mode === 'pct') return '<b>' + fkg(pl.kg) + '</b> · ' + pl.sets + ' × ' + pl.reps + ' Wdh. · ' + fmt(Math.round(pl.pct * 1000) / 10) + ' % von ' + fkg(pl.e1);
  if (pl.mode === 'dp') return (pl.kg ? '<b>' + fkg(pl.kg) + '</b> · ' : '') + pl.sets + ' × ' + pl.rng[0] + '–' + pl.rng[1] + ' Wdh.' + (pl.first ? ' · Gewicht mit ca. 2 Wdh. Reserve wählen' : '');
  if (pl.mode === 'bw') return '<b>' + pl.sets + ' × ' + pl.rng[0] + '–' + pl.rng[1] + ' ' + (pl.unit || 'Wdh.') + '</b>' + (pl.kg > 0 ? ' · +' + fkg(pl.kg) : '') + (pl.unit === 'Zyklen' ? ' · je Zyklus 7 s hängen, 3 s Pause' : '');
  return '<b>' + pl.sets + ' × ' + pl.reps + ' s</b> halten' + (pl.kg > 0 ? ' · ' + (EX[it.exId].eq === 'KG' ? '+' : '') + fkg(pl.kg) : '') + (pl.rest ? ' · ' + fmtDur(pl.rest * 1000) + ' Pause' : '');
}
function firstOpenSet(it) { const k = it.sets.findIndex(s => !s.done); return k >= 0 ? k : it.sets.length - 1; }

function woRow(it, i) {
  const e = EX[it.exId], pg = woProg(it), full = pg.all && pg.done === pg.all, pct = pg.all ? pg.done / pg.all * 100 : 0;
  const ssIn = i > 0 && S.active.items[i - 1].ss;
  return '<button class="worow' + (full ? ' full' : '') + (it.ss ? ' ssA' : '') + (ssIn ? ' ssB' : '') + '" data-act="wf-open" data-v="' + i + '">' + avatar(e) +
    '<span class="exm"><b>' + esc(e.name) + '</b><small>' + (it.ss ? 'Supersatz · ' : '') + esc(targetShort(it)) + (it.plan.slot === 99 ? ' · Griff-Finisher' : '') + '</small></span>' +
    '<span class="wprog"><b class="num">' + (full ? I(ICONS.check, 'i s') : pg.done + '/' + pg.all) + '</b><i><em style="width:' + pct.toFixed(0) + '%"></em></i></span></button>';
}
function vWorkoutList() {
  const a = S.active, t = woTotals(a), pct = t.n ? t.d / t.n * 100 : 0;
  return '<div class="wosum"><div class="row"><span><b class="num">' + t.d + ' / ' + t.n + '</b> Sätze</span><span class="sub num">' + volT(t.vol) + ' bewegt</span></div><div class="meter"><span style="width:' + pct.toFixed(0) + '%"></span></div>' +
    '<small>' + esc(a.n === null ? 'Ohne Plan' : phaseText(a.pr)) + '</small></div>' +
    '<div class="list">' + a.items.map(woRow).join('') + '<button class="worow add" data-act="w-add"><span class="av" style="--c:var(--acc)">' + I(ICONS.plus, 'i s') + '</span><span class="exm"><b>Übung hinzufügen</b><small>Aus der Liste oder neu anlegen</small></span></button></div>' +
    '<button class="btn wide" style="margin-top:16px" data-act="wo-end">Training beenden</button><div style="height:120px"></div>';
}
function stepper(i, j, f, label, val, unit, ph) {
  return '<div class="stp"><span class="stl">' + label + '</span><button class="stb" data-act="st" data-i="' + i + '" data-s="' + j + '" data-f="' + f + '" data-d="-1" aria-label="' + label + ' verringern">−</button>' +
    '<label class="stv"><input inputmode="' + (f === 'kg' ? 'decimal' : 'numeric') + '" data-in="' + f + '" data-i="' + i + '" data-s="' + j + '" value="' + (val == null ? '' : (f === 'kg' ? fmt(val) : val)) + '" placeholder="' + ph + '" aria-label="' + label + '"><small>' + unit + '</small></label>' +
    '<button class="stb" data-act="st" data-i="' + i + '" data-s="' + j + '" data-f="' + f + '" data-d="1" aria-label="' + label + ' erhöhen">+</button></div>';
}
function vFocus(i) {
  const a = S.active, it = a.items[i]; if (!it) { S.ui.wf = null; return vWorkoutList(); }
  const e = EX[it.exId], pl = it.plan, mode = pl.mode, pg = woProg(it);
  let si = S.ui.ws; if (si == null || !it.sets[si]) si = firstOpenSet(it);
  const s = it.sets[si], noKg = mode === 'time' && e.eq === 'KG' && !pl.wkg;
  const wn = it.sets.slice(0, si + 1).filter(q => !q.warm).length;
  const pa = ssPartner(a, i);
  /* Fotos und Anleitung nur auf Antippen der Figur, damit alles Wichtige ohne Scrollen auf den Bildschirm passt */
  const pics = S.ui.fpics ? exPics(it.exId) + exHowTo(it.exId) : '';
  let h = '<div class="fhead"><button class="figbtn" data-act="fpics" aria-expanded="' + !!S.ui.fpics + '" aria-label="Ausführung ' + (S.ui.fpics ? 'ausblenden' : 'zeigen') + '">' + avatar(e) + '<span class="figi">' + (S.ui.fpics ? '×' : 'i') + '</span></button><div class="exm"><b>' + esc(e.name) + '</b><small>Übung ' + (i + 1) + ' von ' + a.items.length + ' · ' + esc(e.m) + '</small></div></div>' + pics + (pa !== null ? '<p class="tag" style="display:inline-block;margin:0 0 6px">Supersatz mit ' + esc(EX[a.items[pa].exId].name) + '</p>' : '') +
    '<p class="ftgt">' + targetLong(it) + '</p>' + (s.top ? '<p class="tag" style="display:inline-block;margin:0 0 6px">Topsatz: 3 saubere Wdh., ca. 1 Wdh. Reserve. Allein nur mit Ablage oder Safety-Pins.</p>' : '') + (it.lastTxt ? '<p class="last">Letztes Mal: ' + esc(it.lastTxt) + '</p>' : '') + (S.p.exNotes[it.exId] ? '<p class="last">Notiz: ' + esc(S.p.exNotes[it.exId]) + '</p>' : '');
  /* Sätze als Leiste, aktueller Satz hervorgehoben */
  let n = 0;
  h += '<div class="spills">' + it.sets.map((q, j) => { const lab = q.warm ? 'A' : q.top ? (++n, 'Top') : ++n; return '<button class="spill' + (j === si ? ' cur' : '') + (q.done ? ' done' : '') + (q.warm ? ' warm' : '') + '" data-act="ws-sel" data-v="' + j + '"><b>' + lab + '</b><small class="num">' + (noKg ? '' : (q.kg != null ? fmt(q.kg) : '–') + '×') + (q.reps != null ? q.reps : '–') + '</small></button>'; }).join('') + '</div>';
  h += '<div class="fbig"><div class="fset"><small>Satz</small><b class="num">' + (s.warm ? 'A' : wn) + '</b><small>/ ' + pg.all + '</small></div><div class="fsteps">' +
    (noKg ? '' : stepper(i, si, 'kg', mode === 'bw' || (mode === 'time' && e.eq === 'KG') ? 'Zusatz' : 'Gewicht', s.kg, 'kg', mode === 'bw' ? '0' : 'kg')) +
    stepper(i, si, 'reps', mode === 'time' ? 'Dauer' : (pl.unit || 'Wdh.'), s.reps, mode === 'time' ? 's' : '×', '0') + '</div></div>';
  h += '<button class="bigchk' + (s.done ? ' done' : '') + '" data-act="set-done" data-i="' + i + '" data-s="' + si + '" aria-label="' + (s.done ? 'Satz zurücksetzen' : 'Satz erledigt') + '">' + I(ICONS.check) + '</button>' +
    '<p class="hint" style="text-align:center;margin:6px 0 0">' + (s.done ? 'Erledigt. Antippen setzt den Satz zurück.' : 'Satz erledigt? Haken antippen. Pause ' + fmtDur(restFor(it) * 1000) + '.') + '</p>';
  if (pg.done === pg.all && pg.all) h += '<div class="card" style="margin-top:14px"><h3>Übung fertig</h3><p class="sub" style="margin-top:4px">Wie viele Wiederholungen wären im letzten Satz noch gegangen? Steuert die Gewichte der nächsten Wochen.</p><div class="chips">' + RIR_FEEL.map(f => '<button class="chip" data-act="feel" data-i="' + i + '" data-v="' + f[0] + '" aria-pressed="' + (it.feel === f[0]) + '">' + f[1] + '</button>').join('') + '</div></div>';
  else h += '<div class="chips" style="margin-top:14px;justify-content:center">' + RIR_FEEL.map(f => '<button class="chip sm" data-act="feel" data-i="' + i + '" data-v="' + f[0] + '" aria-pressed="' + (it.feel === f[0]) + '">' + f[1] + '</button>').join('') + '</div>';
  h += '<div class="fnav"><button class="btn ghost" data-act="wf-go" data-v="' + (i - 1) + '"' + (i ? '' : ' disabled') + '>‹ Vorherige</button><button class="btn' + (pg.done === pg.all ? '' : ' ghost') + '" data-act="wf-go" data-v="' + (i + 1 < a.items.length ? i + 1 : 'list') + '">' + (i + 1 < a.items.length ? 'Nächste ›' : 'Zur Übersicht') + '</button></div>';
  /* Werkzeuge */
  const tools = [];
  if ((mode === 'pct' || (mode === 'dp' && pl.kg)) && ['LH','KH','MA','KB'].includes(e.eq) && !it.sets.some(q => q.warm)) tools.push('<button class="link" data-act="warm" data-i="' + i + '">Aufwärmsätze</button>');
  if (e.eq === 'LH') tools.push('<button class="link" data-act="plates" data-i="' + i + '">Scheiben</button>');
  if (pl.unit === 'Zyklen') tools.push('<button class="link" data-act="rp-timer" data-v="' + i + '">' + (S.rpT ? 'Timer stoppen' : '7/3-Timer starten') + '</button>');
  tools.push('<button class="link" data-act="set-add" data-i="' + i + '">+ Satz</button>');
  if (it.sets.length > 1) tools.push('<button class="link" data-act="set-rm" data-i="' + i + '">− Satz</button>');
  tools.push('<button class="link" data-act="w-swap" data-i="' + i + '">Tauschen</button>', '<button class="link" data-act="w-rm" data-i="' + i + '"' + (S.ui.rmI === i ? ' style="color:var(--heavy)">Wirklich entfernen?' : '>Entfernen') + '</button>');
  h += '<div class="tools" style="justify-content:center;margin-top:10px">' + tools.join('') + '</div>' +
    '<div class="row restrow"><span class="sub">Pause bei dieser Übung</span><span><button class="ic s" data-act="rest-adj" data-i="' + i + '" data-v="-15" aria-label="Pause kürzer">−</button><b class="num">' + fmtDur(restFor(it) * 1000) + '</b><button class="ic s" data-act="rest-adj" data-i="' + i + '" data-v="15" aria-label="Pause länger">+</button></span></div>';
  /* Verlauf dieser Übung */
  const hs = history(S.sessions, it.exId);
  if (hs.length >= 2) h += '<div class="card" style="margin-top:12px"><h2>Fortschritt</h2><p class="readout" data-lro>' + esc(dshort(hs[hs.length - 1].date) + ': ' + fmt(hs[hs.length - 1].v) + ' ' + hs[0].unit) + '</p>' + lineChart(hs.slice(-16), hs[0].unit, 'Verlauf ' + e.name) + '<p class="hint">' + (hs[0].unit === 'kg' ? 'Geschätztes 1RM je Einheit' : hs[0].unit === 's' ? 'Längste Haltezeit je Einheit' : 'Meiste Wiederholungen je Einheit') + '. Bestwert: ' + fmt(Math.max(...hs.map(x => x.v))) + ' ' + hs[0].unit + '.</p></div>';
  else if (hs.length === 1) h += '<p class="hint" style="margin-top:12px;text-align:center">Ein früherer Eintrag. Die Verlaufskurve erscheint ab der zweiten Einheit.</p>';
  h += '<div style="height:120px"></div>';
  return h;
}
function vWorkout() {
  const a = S.active, f = S.ui.wf != null && a.items[S.ui.wf];
  return '<div class="bar"><button class="ghost-ic" data-act="' + (f ? 'wf-close' : 'wo-min') + '" aria-label="' + (f ? 'Zur Übersicht' : 'Training minimieren') + '">' + I(ICONS.back) + '</button><div class="ttl"><small>' + (f ? 'Zurück zur Übersicht' : esc(a.n === null ? 'Ohne Plan' : 'Läuft')) + '</small><b>' + esc(a.name) + '</b></div>' +
    '<time data-clock="wo">' + fmtDur(Date.now() - a.start) + '</time><button class="btn sm" data-act="wo-end">Beenden</button></div>' +
    '<div class="scroll" id="woscroll"><div class="wrap">' + (f ? vFocus(S.ui.wf) : vWorkoutList()) + '</div></div>';
}
