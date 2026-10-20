'use strict';
/* ===== Eisenbuch: Griffkraft & Wakeboard ===== */
const GTESTS = {
  hang:{name:'Dead Hang', unit:'s', kind:'time',
    how:'Schulterbreit an die Klimmzugstange, Arme gestreckt, Schultern leicht aktiv. Halten bis zum Loslassen.',
    why:'Grundwert für die Griffausdauer mit dem eigenen Körpergewicht.'},
  towel:{name:'Handtuch-Hang', unit:'s', kind:'time',
    how:'Zwei Handtücher über die Stange hängen, je eine Hand fest um ein Handtuch. Halten bis zum Loslassen.',
    why:'Dicker, nachgebender Griff. Kommt dem Handle am Seil am nächsten.'},
  rep:{name:'Repeaters 7/3', unit:'Hänge', kind:'rep',
    how:'7 s hängen, 3 s Pause, im Wechsel. Der Timer gibt die Signale. Gezählt werden volle 7-s-Hänge, bis du nicht mehr hältst.',
    why:'Ausdauer bei wiederholter Belastung, wie viele Starts, Kurven und Sprünge hintereinander.'},
  dyn:{name:'Handdynamometer', unit:'kg', kind:'lr',
    how:'Stehend, Arm locker neben dem Körper, Ellbogen leicht gebeugt. Je Hand 2 Versuche, der bessere zählt.',
    why:'Maximale Greifkraft je Hand. Zeigt auch Unterschiede zwischen links und rechts.'},
  carry:{name:"Farmer's Hold", unit:'s', kind:'time', load:true,
    how:'Zwei Kurzhanteln mit festem Gewicht stehend halten, bis du absetzen musst. Bei jedem Test dasselbe Gewicht nehmen.',
    why:'Griffausdauer unter Last, ohne Klimmzugstange.'},
  hhold:{name:'Handle-Hold 50 % KG', unit:'s', kind:'time', load:true,
    how:'Kabelzug mit Seilgriff oder Handle auf Hüfthöhe, Gewicht ca. 50 % deines Körpergewichts, immer dasselbe. Handle an die Hüfte ziehen, Ellbogen ca. 90°, leicht in Fahrposition zurücklehnen und halten bis zum Loslassen.',
    why:'Misst genau die Zugkraft-Ausdauer, die beim Ranziehen des Handles für Backroll und Air-Tricks fehlt.'}
};
const GORDER = ['hang','towel','rep','hhold','dyn','carry'];
/* Referenz: Steiber 2016 (PLoS ONE), deutsche Männer, höchster Wert beider Hände */
const DYN_REF = [[25,29,52],[30,34,54],[35,39,54],[40,44,53],[45,49,52]];

function gripVal(g) { return GTESTS[g.type].kind === 'lr' ? Math.max(g.l || 0, g.r || 0) : g.v; }
function gripHist(type) { return S.grip.filter(g => g.type === type).sort((a, b) => a.t - b.t); }
function lastGripDate() { return S.grip.length ? S.grip.reduce((a, g) => g.date > a ? g.date : a, '') : null; }
function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 864e5); }
function gripDue() {
  const l = lastGripDate(); if (!l) return {due:true, first:true, days:0};
  const d = S.p.gripEvery - daysBetween(l, todayStr());
  return {due:d <= 0, days:d, last:l};
}
function seasonWeeks() { const s = S.p.season; if (!s) return null; return Math.ceil(daysBetween(todayStr(), s) / 7); }
/* Wake-Saison: vom Saisonstart bis Saisonende (Standard 30.09.). Mit Saison-Pause ruht das Krafttraining. */
function seasonEnd() { const st = S.p && S.p.season; if (S.p && S.p.seasonEnd) return S.p.seasonEnd; if (!st) return null; const e = st.slice(0, 4) + '-09-30'; return e >= st ? e : (+st.slice(0, 4) + 1) + '-09-30'; }
function inSeason(d) { const st = S.p && S.p.season, en = seasonEnd(); d = d || todayStr(); return !!(st && en && d >= st && d <= en); }
function inSeasonPause(d) { return inSeason(d) && S.p.seasonPause !== false; }
function seasonPhase() {
  const w = seasonWeeks(); if (w === null) return null;
  if (w <= 0) return {n:'Saison', t:'Kraft erhalten, 1–2 Einheiten pro Woche, Griff frisch halten für das Wasser.'};
  if (w <= 6) return {n:'Spezifisch', t:'Griffausdauer (Repeaters, Handtuch-Hang), Rumpf und Beine in der Hocke, weniger schwere Maximalsätze.'};
  if (w <= 16) return {n:'Kraft', t:'Schwere Grundübungen, Rudern und Klimmzüge, Griff-Finisher mit Last.'};
  return {n:'Grundlage', t:'Saubere Technik, Muskelaufbau, Griff zweimal pro Woche, Laufen für die Ausdauer.'};
}
function saveGrip(g) { lsSave(); Cloud.put('grip', g.id, g); }

function gripCard(type) {
  const T = GTESTS[type], hs = gripHist(type);
  let h = '<div class="card"><div class="row"><h3>' + T.name + '</h3>' + (hs.length ? '<span class="sub">' + hs.length + '× getestet</span>' : '') + '</div><p class="sub" style="margin-top:4px">' + T.why + '</p>';
  if (!hs.length) return h + '<p class="hint" style="margin-top:8px">Noch kein Test.</p></div>';
  const pts = hs.map(g => ({t:g.t, date:g.date, v:gripVal(g), top:T.kind === 'lr' ? 'L ' + fmt(g.l) + ' · R ' + fmt(g.r) + ' kg' : (g.kg ? 'mit 2 × ' + fmt(g.kg) + ' kg' : '')}));
  const last = hs[hs.length - 1], lv = gripVal(last), best = Math.max(...pts.map(p => p.v)), first = pts[0].v, goal = S.p.gripGoal[type];
  h += '<div class="stats"><div><small>Letzter Test</small><b>' + fmt(lv) + ' ' + T.unit + '</b><small>' + esc(dshort(last.date)) + '</small></div><div><small>Bestwert</small><b>' + fmt(best) + ' ' + T.unit + '</b></div><div><small>Seit dem ersten Test</small><b>' + (hs.length > 1 ? (deltaHTML(pctDelta(lv, first)) || '±0 %') : '–') + '</b></div></div>';
  if (T.kind === 'lr') {
    const asym = Math.abs(last.l - last.r) / Math.max(last.l, last.r) * 100;
    h += '<p style="margin-top:10px">Links ' + fkg(last.l) + ' · Rechts ' + fkg(last.r) + ' · Unterschied ' + fmt(Math.round(asym)) + ' %' + (asym > 10 ? ' <span class="tag deload">über 10 %: schwächere Seite einzeln trainieren</span>' : '') + '</p>' +
      '<p class="hint">Vergleich, Mittelwerte Männer in Deutschland bei 175–184 cm: ' + DYN_REF.map(x => x[0] + '–' + x[1] + ' J. ca. ' + x[2] + ' kg').join(' · ') + ' (bester Wert beider Hände).</p>';
  }
  if (goal) { const pr = Math.max(0, Math.min(1, lv / goal)); h += '<div style="margin-top:10px"><div class="row"><small>Ziel ' + fmt(goal) + ' ' + T.unit + '</small><small class="num">' + Math.round(pr * 100) + ' %</small></div><div class="meter"><span style="width:' + (pr * 100).toFixed(1) + '%"></span></div></div>'; }
  if (hs.length > 1) h += '<p class="readout" data-lro style="margin-top:10px">' + esc(dshort(last.date) + ': ' + fmt(lv) + ' ' + T.unit) + '</p>' + lineChart(pts, T.unit, 'Verlauf ' + T.name);
  h += '<div class="row" style="justify-content:flex-start;gap:14px;margin-top:6px"><button class="link" data-act="g-goal" data-v="' + type + '">' + (goal ? 'Ziel ändern' : 'Ziel setzen') + '</button><button class="link" data-act="g-list" data-v="' + type + '">Alle Einträge</button></div>';
  return h + '</div>';
}
function vGrip() {
  const p = S.p, due = gripDue(), w = seasonWeeks(), ph = seasonPhase();
  let h = '<div class="row" style="margin:0 0 10px"><span class="sub">' + (w !== null && w > 0 ? 'Wakeboard-Saison · noch ' + w + ' Wochen' : 'Wakeboard-Saison') + '</span>' + (ph ? '<span class="tag">Phase ' + ph.n + '</span>' : '') + '</div>';
  h += '<div class="card"><p class="eyebrow">' + (due.first ? 'Erster Test' : due.due ? 'Test fällig' : 'Nächster Test in ' + due.days + ' Tag' + (due.days === 1 ? '' : 'en')) + '</p><h3>Test-Paket: ' + p.gripSet.map(t => GTESTS[t].name).join(', ') + '</h3>' +
    '<p class="sub" style="margin-top:6px">Ausgeruht testen: an einem Ruhetag oder vor dem Training, nie nach Kreuzheben oder Klimmzügen. Vorher 5 min aufwärmen, zwischen den Tests mindestens 3 min Pause. Dauer ca. ' + (p.gripSet.length * 4 + 5) + ' min.</p>' +
    '<button class="btn wide" style="margin-top:10px" data-act="g-start">Geführten Test starten</button>' +
    '<div class="row" style="justify-content:center;margin-top:6px"><button class="link" data-act="g-manual">Wert von Hand eintragen</button></div></div>';
  if (ph) h += '<div class="card flat"><p><b>Phase ' + ph.n + ':</b> ' + ph.t + '</p>' + (!p.wake ? '<button class="btn sm" style="margin-top:6px" data-act="g-wake">Griff-Finisher in jede Einheit einbauen</button>' : '<p class="hint">Wakeboard-Fokus ist an: Jede Einheit endet mit einer Griffübung im Wechsel (Dead Hang, Farmer\'s Hold, Handtuch-Hang, Scheiben-Pinch, Wrist Roller, Reverse Curls).</p>') + '</div>';
  const shown = GORDER.filter(t => p.gripSet.includes(t) || gripHist(t).length);
  h += shown.map(gripCard).join('');
  h += '<div class="card"><h2>Einstellungen</h2><label class="lab">Test-Paket (was beim geführten Test drankommt)</label><div class="chips">' + GORDER.map(t => '<button class="chip" data-act="g-set" data-v="' + t + '" aria-pressed="' + p.gripSet.includes(t) + '">' + GTESTS[t].name + '</button>').join('') + '</div>' +
    '<p class="hint" style="margin-top:6px">Dynamometer nur auswählen, wenn du eins hast (ab ca. 25 €). Ohne Gerät reichen Dead Hang, Handtuch-Hang und Repeaters.</p>' +
    '<div class="pair"><div><label class="lab" for="g-every">Testen alle</label><select id="g-every" data-chg="gripEvery">' + [7,14,21,28].map(d => '<option value="' + d + '"' + (p.gripEvery === d ? ' selected' : '') + '>' + d + ' Tage</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="g-season">Saisonstart</label><input type="date" id="g-season" data-chg="season" value="' + esc(p.season || '') + '"></div></div>' +
    '<div class="row" style="margin-top:12px"><span>Wakeboard-Fokus im Plan</span><button class="chip" data-act="g-wake" aria-pressed="' + !!p.wake + '">' + (p.wake ? 'An' : 'Aus') + '</button></div></div>';
  return h;
}

/* ----- Geführter Test ----- */
const GT = {timer:null};
let AC = null;
function audioUnlock() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }
function beep(f, ms) {
  try {
    if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.frequency.value = f || 880; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + (ms || 160) / 1000); o.start(t); o.stop(t + (ms || 160) / 1000);
  } catch (e) {}
}
function buzz(p) { if (NATIVE) { Nat.vib(Array.isArray(p) ? 300 : p); return; } try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
function gtStart() {
  S.gt = {types:S.p.gripSet.slice().sort((a, b) => GORDER.indexOf(a) - GORDER.indexOf(b)), i:0, st:'idle', res:[], kg:S.ui.lastCarryKg || ''};
  S.ui.sheet = {t:'gtest'}; renderSheet();
}
function gtCur() { return S.gt.types[S.gt.i]; }
function gtGo() {
  const g = S.gt; g.st = 'cd'; g.t0 = Date.now() + 3000; g.lastSec = 4; g.lastIdx = -1; g.val = null;
  clearInterval(GT.timer); GT.timer = setInterval(gtTick, 100); renderSheet();
}
function gtTick() {
  const g = S.gt; if (!g || (g.st !== 'cd' && g.st !== 'run' && g.st !== 'pause')) { clearInterval(GT.timer); return; }
  const now = Date.now();
  if (g.st === 'pause') { const left = Math.ceil((g.pend - now) / 1000); const el = $('[data-gclock]'); if (el) el.textContent = fmtDur(Math.max(0, left) * 1000); if (left <= 0) { beep(660, 300); buzz(200); g.st = 'idle'; clearInterval(GT.timer); renderSheet(); } return; }
  if (g.st === 'cd') {
    const s = Math.ceil((g.t0 - now) / 1000);
    if (s !== g.lastSec) { g.lastSec = s; if (s > 0) beep(520, 120); }
    if (now >= g.t0) { g.st = 'run'; beep(1040, 350); buzz(150); renderSheet(); return; }
    const el = $('[data-gclock]'); if (el) el.textContent = String(Math.max(1, s)); return;
  }
  const el = now - g.t0, T = GTESTS[gtCur()];
  if (T.kind === 'rep') {
    const cyc = Math.floor(el / 10000), inHang = el % 10000 < 7000, idx = cyc * 2 + (inHang ? 0 : 1);
    if (idx !== g.lastIdx) { if (g.lastIdx >= 0) { if (inHang) { beep(1040, 220); buzz(120); } else { beep(440, 220); buzz([60, 60, 60]); } } g.lastIdx = idx; }
    const done = cyc + (inHang ? 0 : 1), left = inHang ? 7 - Math.floor(el % 10000 / 1000) : 10 - Math.floor(el % 10000 / 1000);
    const c = $('[data-gclock]'), ph = $('[data-gphase]'), n = $('[data-gcount]');
    if (c) c.textContent = left + ' s'; if (ph) ph.textContent = inHang ? 'Halten' : 'Pause'; if (n) n.textContent = done + ' volle Hänge';
    g.done = done;
  } else { const c = $('[data-gclock]'); if (c) c.textContent = fmtDur(el); }
}
function gtStop() {
  const g = S.gt, T = GTESTS[gtCur()]; clearInterval(GT.timer); beep(330, 300);
  g.val = T.kind === 'rep' ? (g.done || 0) : Math.round((Date.now() - g.t0) / 1000);
  g.st = 'done'; renderSheet();
}
function gtSave() {
  const g = S.gt, type = gtCur(), T = GTESTS[type];
  const e = {id:uid('g'), type, date:todayStr(), t:Date.now()};
  if (T.kind === 'lr') {
    const l = parseNum($('#gt-l').value), r = parseNum($('#gt-r').value);
    if (!(l > 0) || !(r > 0)) { toast('Beide Hände eintragen, in kg.'); return; }
    e.l = l; e.r = r;
  } else {
    const v = parseNum($('#gt-v').value);
    if (!(v > 0)) { toast(T.kind === 'rep' ? 'Anzahl voller Hänge eintragen.' : 'Zeit in Sekunden eintragen.'); return; }
    e.v = Math.round(v);
    if (T.load) { const kg = parseNum($('#gt-kg').value); if (!(kg > 0)) { toast('Gewicht pro Hand eintragen.'); return; } e.kg = kg; S.ui.lastCarryKg = kg; }
  }
  const prev = gripHist(type); const pv = prev.length ? gripVal(prev[prev.length - 1]) : null;
  S.grip.push(e); saveGrip(e); setTimeout(() => checkBadges(), 400); g.res.push({type, v:gripVal(e), prev:pv, best:prev.length ? Math.max(...prev.map(gripVal)) : null});
  g.i++;
  if (g.i >= g.types.length) { g.st = 'end'; }
  else { g.st = 'pause'; g.pend = Date.now() + 180000; clearInterval(GT.timer); GT.timer = setInterval(gtTick, 250); }
  renderSheet();
}
function gtHTML() {
  const g = S.gt;
  if (g.st === 'end') {
    return '<p class="eyebrow">Test abgeschlossen</p><h2>Griffkraft ' + esc(dshort(todayStr())) + '</h2>' + g.res.map(r => {
      const T = GTESTS[r.type], pr = r.best !== null && r.v > r.best;
      return '<div class="exrow"><span>' + T.name + (pr ? ' <span class="tag ok">Bestwert</span>' : '') + '</span><span class="r">' + fmt(r.v) + ' ' + T.unit + ' ' + (r.prev ? deltaHTML(pctDelta(r.v, r.prev)) : '') + '</span></div>';
    }).join('') + '<p class="hint" style="margin-top:8px">Prozentangaben im Vergleich zum letzten Test. Nächster Test in ' + S.p.gripEvery + ' Tagen.</p><button class="btn wide" style="margin-top:12px" data-act="g-close">Fertig</button>';
  }
  const type = gtCur(), T = GTESTS[type];
  let h = '<p class="eyebrow">Test ' + (g.i + 1) + ' von ' + g.types.length + '</p><h2>' + T.name + '</h2>';
  if (g.st === 'pause') return h + '<p>Pause vor dem nächsten Test. Unterarme locker ausschütteln.</p><div class="big" data-gclock>3:00</div><div class="stack" style="margin-top:12px"><button class="btn wide" data-act="g-skip-pause">Pause beenden</button></div>' + gtAbort();
  h += '<p>' + T.how + '</p>';
  if (T.kind === 'lr') return h + '<div class="pair" style="margin-top:10px"><div><label class="lab" for="gt-l">Links (kg)</label><div class="fld"><input id="gt-l" inputmode="decimal" placeholder="kg"><span>kg</span></div></div><div><label class="lab" for="gt-r">Rechts (kg)</label><div class="fld"><input id="gt-r" inputmode="decimal" placeholder="kg"><span>kg</span></div></div></div><button class="btn wide" style="margin-top:12px" data-act="g-save">Speichern und weiter</button>' + gtAbort();
  const load = T.load ? '<label class="lab" for="gt-kg">Gewicht pro Hand</label><div class="fld"><input id="gt-kg" inputmode="decimal" value="' + esc(g.kg) + '" data-in="gkg" placeholder="z. B. 24"><span>kg</span></div>' : '';
  if (g.st === 'idle') return h + load + '<button class="btn wide" style="margin-top:12px" data-act="g-go">Start (3 s Countdown)</button><p class="hint" style="margin-top:6px">Ton an: Der Timer piept beim Start' + (T.kind === 'rep' ? ' und bei jedem Wechsel zwischen Halten und Pause' : '') + '. Am Handy zusätzlich Vibration, wo verfügbar.</p>' + gtAbort();
  if (g.st === 'cd') return h + '<div class="big" data-gclock>3</div><p class="sub">Greifen und bereit machen</p>';
  if (g.st === 'run') return h + (T.kind === 'rep' ? '<p class="readout" data-gphase>Halten</p><div class="big" data-gclock>7 s</div><p class="readout" data-gcount>0 volle Hänge</p>' : '<div class="big" data-gclock>0:00</div>') +
    '<button class="btn wide" style="margin-top:12px;min-height:64px;font-size:20px" data-act="g-stop">' + (T.kind === 'rep' ? 'Kann nicht mehr halten' : 'Losgelassen') + '</button>';
  return h + load + '<label class="lab" for="gt-v">Ergebnis (' + T.unit + ')</label><div class="fld"><input id="gt-v" inputmode="numeric" value="' + (g.val || '') + '"><span>' + T.unit + '</span></div><p class="hint">Du kannst den Wert korrigieren, falls du zu spät gestoppt hast.</p>' +
    '<div class="row" style="margin-top:12px"><button class="btn ghost" data-act="g-go">Nochmal</button><button class="btn" data-act="g-save">Speichern und weiter</button></div>';
}
function gtAbort() { return '<button class="btn ghost wide" style="margin-top:8px" data-act="g-close">Test beenden</button>'; }
function gManualHTML() {
  const f = S.ui.gm || (S.ui.gm = {type:S.p.gripSet[0] || 'hang'}), T = GTESTS[f.type];
  return '<h2>Griffwert eintragen</h2><label class="lab" for="gm-type">Test</label><select id="gm-type" data-chg="gmtype">' + GORDER.map(t => '<option value="' + t + '"' + (t === f.type ? ' selected' : '') + '>' + GTESTS[t].name + '</option>').join('') + '</select>' +
    '<label class="lab" for="gm-date">Datum</label><input type="date" id="gm-date" value="' + todayStr() + '">' +
    (T.kind === 'lr' ? '<div class="pair"><div><label class="lab" for="gt-l">Links (kg)</label><input type="text" id="gt-l" inputmode="decimal"></div><div><label class="lab" for="gt-r">Rechts (kg)</label><input type="text" id="gt-r" inputmode="decimal"></div></div>' :
      (T.load ? '<label class="lab" for="gt-kg">Gewicht pro Hand (kg)</label><input type="text" id="gt-kg" inputmode="decimal" value="' + esc(S.ui.lastCarryKg || '') + '">' : '') + '<label class="lab" for="gt-v">Ergebnis (' + T.unit + ')</label><input type="text" id="gt-v" inputmode="numeric">') +
    '<button class="btn wide" style="margin-top:12px" data-act="gm-save">Speichern</button><button class="btn ghost wide" style="margin-top:8px" data-act="close">Abbrechen</button>';
}
function gmSave() {
  const type = S.ui.gm.type, T = GTESTS[type], date = $('#gm-date').value || todayStr();
  const e = {id:uid('g'), type, date, t:parseD(date).getTime() + 43200000};
  if (T.kind === 'lr') { e.l = parseNum($('#gt-l').value); e.r = parseNum($('#gt-r').value); if (!(e.l > 0 && e.r > 0)) { toast('Beide Hände eintragen, in kg.'); return; } }
  else { e.v = parseNum($('#gt-v').value); if (!(e.v > 0)) { toast('Ergebnis eintragen.'); return; } if (T.load) { e.kg = parseNum($('#gt-kg').value); if (!(e.kg > 0)) { toast('Gewicht pro Hand eintragen.'); return; } } }
  S.grip.push(e); saveGrip(e); S.ui.sheet = null; render(); toast(T.name + ' gespeichert.');
}
function gListHTML(type) {
  const T = GTESTS[type], hs = gripHist(type).reverse();
  return '<h2>' + T.name + '</h2>' + (hs.length ? hs.map(g => '<div class="exrow"><span>' + esc(dweek(g.date)) + (g.kg ? '<br><small>2 × ' + fmt(g.kg) + ' kg</small>' : '') + '</span><span class="r">' + (T.kind === 'lr' ? 'L ' + fmt(g.l) + ' · R ' + fmt(g.r) + ' kg' : fmt(g.v) + ' ' + T.unit) + ' <button class="link" data-act="g-del" data-v="' + g.id + '" aria-label="Eintrag löschen">Löschen</button></span></div>').join('') : '<div class="empty">Keine Einträge.</div>') +
    '<button class="btn ghost wide" style="margin-top:12px" data-act="close">Schließen</button>';
}
