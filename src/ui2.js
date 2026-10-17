'use strict';
/* ===== Eisenbuch: Ansichten ===== */
const ICONS = {
  today:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  plan:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  ex:'<path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11"/>',
  run:'<circle cx="15" cy="4.5" r="1.8"/><path d="M7 21l3.5-6 3 2.5.5 3.5M5.5 11.5l3.5-3.5 4 .5 2 3 3 1.5M10.5 15l2.5-6.5"/>',
  hist:'<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  grip:'<path d="M4 13h16"/><path d="M6 13a6 6 0 0 0 12 0"/><path d="M12 13V3"/><path d="M9 6l3-3 3 3"/>'
};
const TABS = [['today','Heute'],['plan','Plan'],['grip','Griff'],['run','Laufen'],['hist','Verlauf']];
const FEEL = [['easy','Leicht'],['ok','Passend'],['hard','Schwer']];
const RUNTYPES = ['Locker','Tempo','Intervalle','Langer Lauf','Wettkampf'];

function sp() { return SPLITS[resolveSplit(S.p)]; }
function planLine(it) {
  const e = EX[it.exId];
  if (it.mode === 'time') return it.sets + ' × ' + it.reps + ' s';
  if (it.mode === 'bw') return it.sets + ' × ' + it.rng[0] + '–' + it.rng[1] + (it.kg > 0 ? ' · +' + fkg(it.kg) : '');
  if (it.mode === 'pct') return it.sets + ' × ' + it.reps + ' · ' + fkg(it.kg);
  return it.sets + ' × ' + it.rng[0] + '–' + it.rng[1] + ' · ' + (it.kg ? fkg(it.kg) : 'Gewicht wählen');
}
function phaseText(pr) {
  const M = MODELS[S.p.model];
  return 'Woche ' + pr.week + ' von ' + M.weeks + ' · ' + (S.p.model === 'dup' && !pr.deload ? pr.label + '-Tag' : pr.label) + ' · ' + fmt(Math.round(pr.pct * 1000) / 10) + ' %';
}
function nextTrainDate() {
  const t = todayStr();
  for (let i = 0; i < 8; i++) {
    const d = addDays(t, i), wd = (parseD(d).getDay() + 6) % 7;
    if (S.p.days.includes(wd)) { if (i === 0 && S.sessions.some(s => s.date === t)) continue; return d; }
  }
  return t;
}

/* ----- Onboarding ----- */
function vOnboard() {
  const ob = S.ui.ob || (S.ui.ob = {step:0, d:defaultProfile(), kg:{}, reps:{}});
  const d = ob.d, st = ob.step;
  const dots = '<p class="eyebrow">Einrichtung · Schritt ' + (st + 1) + ' von 4</p>';
  if (st === 0) return '<div class="top"><div><p class="eyebrow">Krafttraining · Periodisierung · Laufen</p><h1>Eisenbuch</h1></div></div>' +
    '<div class="card"><h3>Was die App für dich macht</h3><div class="stack" style="margin-top:10px">' +
    '<p><b>Plant deine Einheiten.</b> Ganzkörper, Oberkörper/Unterkörper oder Push/Pull/Beine, passend zu deinen Trainingstagen und deiner Zeit.</p>' +
    '<p><b>Periodisiert automatisch.</b> Ein Block dauert 5–6 Wochen: Die Last startet bei ca. 70 % deines Maximums, steigt Woche für Woche, danach folgt eine leichte Entlastungswoche.</p>' +
    '<p><b>Schlägt Gewichte vor.</b> Aus deinen Einträgen schätzt die App dein Maximalgewicht (1RM) und rechnet jede Einheit neu.</p>' +
    '<p><b>Protokolliert alles.</b> Sätze, Wiederholungen, Gewicht, Pausen-Timer, Bestleistungen, Verlauf. Dazu ein Lauftagebuch mit Pace und Wochenkilometern.</p>' +
    '<p class="hint">' + EXLIST.length + ' Übungen sind hinterlegt. Alle Zahlen kannst du jederzeit überschreiben.</p></div></div>' +
    '<button class="btn wide" data-act="ob-next">Einrichten (ca. 1 Minute)</button>';
  if (st === 1) {
    const auto = resolveSplit(d);
    return dots + '<h1>Training</h1><p class="lead">Wann und wie trainierst du?</p>' +
      '<div class="card"><h2>Trainingstage</h2><div class="chips">' + DAYS.map((n, i) => '<button class="chip" data-act="ob-day" data-v="' + i + '" aria-pressed="' + d.days.includes(i) + '">' + n + '</button>').join('') + '</div>' +
      '<p class="hint" style="margin-top:8px">' + d.days.length + ' Tage pro Woche. Mindestens 2, höchstens 6. Lass zwischen zwei Einheiten möglichst einen Tag Pause.</p>' +
      '<div class="pair"><div><label class="lab" for="ob-time">Uhrzeit</label><input type="time" id="ob-time" data-in="ob" data-f="time" value="' + esc(d.time) + '"></div>' +
      '<div><label class="lab" for="ob-min">Dauer pro Einheit</label><select id="ob-min" data-in="ob" data-f="minutes">' + [30,45,60,75,90].map(m => '<option value="' + m + '"' + (d.minutes === m ? ' selected' : '') + '>' + m + ' min</option>').join('') + '</select></div></div></div>' +
      '<div class="card"><h2>Aufteilung (Split)</h2>' + Object.entries(SPLITS).map(([k, s]) => '<button class="opt' + (d.split === k ? ' sel' : '') + '" data-act="ob-split" data-v="' + k + '"><b>' + s.name + '</b><span>' + s.desc + '</span>' + (s.rec.includes(d.days.length) ? '<em>Passt zu ' + d.days.length + ' Tagen</em>' : '') + '</button>').join('') + '</div>' +
      '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-next">Weiter</button></div>';
  }
  if (st === 2) return dots + '<h1>Periodisierung</h1><p class="lead">Periodisierung heißt: Das Training ist in Blöcke von einigen Wochen geteilt, in denen Last und Wiederholungen gezielt wechseln. So steigerst du dich stetig und erholst dich planmäßig.</p>' +
    '<div class="card">' + Object.entries(MODELS).map(([k, m]) => '<button class="opt' + (d.model === k ? ' sel' : '') + '" data-act="ob-model" data-v="' + k + '"><b>' + m.name + '</b><span>' + m.desc + '</span><em>' + m.tag + '</em></button>').join('') + '</div>' +
    '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-next">Weiter</button></div>';
  return dots + '<h1>Startwerte</h1><p class="lead">Die App braucht für die Grundübungen ein geschätztes Maximalgewicht (1RM). Kennst du ein Gewicht, das du sauber mehrmals schaffst, trag es als kg × Wdh. ein. Ohne Angabe schätzt die App vorsichtig aus deinem Körpergewicht, oder du ermittelst den Wert in der ersten Einheit.</p>' +
    '<div class="card"><label class="lab" for="ob-bw">Körpergewicht (kg, optional)</label><input type="text" inputmode="decimal" id="ob-bw" data-in="ob" data-f="bw" value="' + (d.bw || '') + '" placeholder="z. B. 80"></div>' +
    '<div class="card"><h2>Grundübungen</h2>' + MAIN_LIFTS.map(id => '<div style="padding:8px 0;border-top:1px solid var(--line)"><div class="row"><b>' + esc(EX[id].name) + '</b><span class="sub num" id="obe-' + id + '">' + obEst(id) + '</span></div>' +
      '<div class="pair" style="margin-top:6px"><div class="fld"><input type="text" inputmode="decimal" data-in="ob" data-f="kg:' + id + '" aria-label="Gewicht ' + esc(EX[id].name) + '" value="' + (ob.kg[id] || '') + '" placeholder="Gewicht"><span>kg</span></div>' +
      '<div class="fld"><input type="text" inputmode="numeric" data-in="ob" data-f="reps:' + id + '" aria-label="Wiederholungen ' + esc(EX[id].name) + '" value="' + (ob.reps[id] || '') + '" placeholder="Wdh."><span>Wdh.</span></div></div></div>').join('') + '</div>' +
    '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-finish">Plan erstellen</button></div>';
}
function obE1(id) {
  const ob = S.ui.ob, kg = parseNum(ob.kg[id]), r = parseNum(ob.reps[id]);
  if (kg > 0 && r >= 1 && r <= 15) return {v:roundHalf(EPLEY(kg, r)), src:'test'};
  if (kg > 0 && !(r > 0)) return {v:kg, src:'test'};
  if (ob.d.bw > 0) return {v:estimateFromBW(ob.d.bw)[id], src:'bw'};
  return null;
}
function obEst(id) {
  const x = obE1(id);
  if (!x) return 'wird im 1. Training ermittelt';
  return '1RM ≈ ' + fkg(x.v) + (x.src === 'bw' ? ' (geschätzt)' : '');
}

/* ----- Heute ----- */
function vToday() {
  const p = S.p, M = MODELS[p.model], total = blockSessions(p), n = p.block.n, d = p.days.length;
  let h = '<div class="top"><div><p class="eyebrow">' + esc(dlong(todayStr())) + '</p><h1>Heute</h1></div><div style="text-align:right"><span class="tag">Block ' + p.block.no + '</span>' + (seasonWeeks() > 0 ? '<br><small>Saisonstart in ' + seasonWeeks() + ' Wochen</small>' : '') + '</div></div>';
  if (S.active) h += '<div class="card"><div class="row"><div><h3>Training läuft</h3><p class="sub">' + esc(S.active.name) + ' · <span class="num" data-clock="wo">' + fmtDur(Date.now() - S.active.start) + '</span></p></div><button class="btn" data-act="wo-open">Fortsetzen</button></div></div>';
  let segs = '<div class="segs">';
  for (let w = 0; w < M.weeks; w++) {
    segs += '<div>'; for (let i = 0; i < d; i++) { const k = w * d + i; segs += '<span class="seg' + (k < n ? ' done' : k === n ? ' next' : '') + '"></span>'; } segs += '</div>';
  }
  segs += '</div>';
  if (n >= total) {
    h += '<div class="card"><p class="eyebrow">Block ' + p.block.no + ' · ' + M.name + '</p><h3>Block geschafft</h3>' + segs +
      '<p style="margin-top:8px">Alle ' + total + ' Einheiten sind erledigt. Die App wertet aus, welche Übungen du steigern kannst, und startet den nächsten Block mit neuen Werten.</p>' +
      '<button class="btn wide" data-act="block-close">Auswertung und nächster Block</button></div>';
  } else {
    const w = buildWorkout(p, S.sessions, n), nd = nextTrainDate(), isToday = nd === todayStr();
    h += '<div class="card"><p class="eyebrow">Nächste Einheit · ' + (isToday ? 'heute' : esc(dweek(nd))) + ' · ' + esc(p.time) + ' Uhr</p>' +
      '<div class="row"><h3>' + esc(w.name) + '</h3><span class="tag' + (w.pr.deload ? ' deload' : '') + '">' + esc(phaseText(w.pr)) + '</span></div>' + segs +
      '<p class="sub">Einheit ' + (n + 1) + ' von ' + total + ' im Block · ca. ' + w.est + ' min' + (w.pr.deload ? ' · Entlastung: leichter, weniger Sätze' : '') + '</p>' +
      '<div style="margin:6px 0 12px">' + w.items.map(it => '<div class="exrow"><b>' + esc(EX[it.exId].name) + '</b><span class="r">' + esc(planLine(it)) + '</span></div>').join('') + '</div>' +
      (S.active ? '' : '<button class="btn wide" data-act="wo-start">Training starten</button><div class="row" style="justify-content:center;margin-top:6px"><button class="link" data-act="wo-free">Freies Training ohne Plan</button></div>') + '</div>';
  }
  const lb = latestBody();
  h += '<div class="card"><div class="row"><span><small class="sub">Körpergewicht</small><br><b class="num" style="font:600 22px var(--fd)">' + (lb ? fkg(lb.avg) : '–') + '</b>' + (lb ? ' <small class="sub">7-Tage-Schnitt</small>' : '') + '</span><button class="btn sm ghost" data-act="b-quick">' + (lb && lb.date === todayStr() ? 'Heute eingetragen' : 'Gewicht eintragen') + '</button></div></div>';
  const gd = gripDue();
  if (gd.due) h += '<div class="card"><div class="row"><div style="flex:1;min-width:0"><p class="eyebrow">Griffkraft</p><h3>' + (gd.first ? 'Ersten Griff-Test machen' : 'Griff-Test fällig') + '</h3><p class="sub">' + (gd.first ? 'Dein Ausgangswert für die Wakeboard-Vorbereitung.' : 'Letzter Test am ' + esc(dshort(gd.last)) + '. Am besten ausgeruht, vor dem Training.') + '</p></div><button class="btn sm" data-act="g-start">Testen</button></div></div>';
  // Woche
  const mon = mondayOf(todayStr());
  h += '<div class="card"><div class="row"><h2 style="margin:0">Diese Woche</h2><span class="sub">' + weekCount(mon) + ' Kraft · ' + weekRuns(mon) + ' Lauf</span></div><div class="week">';
  for (let i = 0; i < 7; i++) {
    const ds = addDays(mon, i), done = S.sessions.some(s => s.date === ds), run = S.runs.some(r => r.date === ds), plan = p.days.includes(i);
    h += '<div class="day' + (done ? ' done' : plan ? ' plan' : '') + (ds === todayStr() ? ' today' : '') + '"><small>' + DAYS[i] + '</small><b>' + parseD(ds).getDate() + '</b><small>' + (done ? 'Kraft' : plan ? 'Plan' : '&nbsp;') + (run ? ' · Lauf' : '') + '</small></div>';
  }
  h += '</div><p class="hint">Gestrichelt: geplanter Trainingstag. Grün: erledigt.</p></div>';
  // Kraftwerte
  h += '<div class="card"><h2>Maximalkraft (geschätztes 1RM)</h2><p class="hint">Veränderung seit Beginn von Block ' + p.block.no + '.</p>' + MAIN_LIFTS.map(id => {
    const v = p.e1[id], s0 = p.block.e1Start[id];
    return '<button class="lift" style="width:100%;background:none;border-left:0;border-right:0;border-bottom:0;border-top:1px solid var(--line)" data-act="ex-open" data-v="' + id + '"><span>' + esc(EX[id].name) + '</span><span><b class="num">' + (v ? fkg(v) : '–') + '</b> ' + (v && s0 && v !== s0 ? deltaHTML(pctDelta(v, s0)) : '') + '</span></button>';
  }).join('') + '</div>';
  const rec = S.sessions.slice(-3).reverse();
  if (rec.length) h += '<div class="card"><h2>Zuletzt</h2>' + rec.map(sessBtn).join('') + '</div>';
  return h;
}
function weekCount(mon) { const e = addDays(mon, 7); return S.sessions.filter(s => s.date >= mon && s.date < e).length; }
function weekRuns(mon) { const e = addDays(mon, 7); return S.runs.filter(s => s.date >= mon && s.date < e).length; }
function sessBtn(s) {
  return '<button class="sess" data-act="sess-open" data-v="' + s.id + '"><span><b>' + esc(s.name) + '</b><br><small>' + esc(dweek(s.date)) + ' · ' + fmtDur(s.dur || 0) + ' · ' + s.exercises.length + ' Übungen</small></span><span class="num">' + volT(sessionVolume(s)) + '</span></button>';
}

/* ----- Plan ----- */
function vPlan() {
  const p = S.p, M = MODELS[p.model], d = p.days.length, curW = Math.floor(p.block.n / d), key = MAIN_LIFTS.find(id => p.e1[id]) || 'kniebeuge', ke1 = p.e1[key];
  let h = '<div class="top"><div><p class="eyebrow">Block ' + p.block.no + ' · seit ' + esc(dshort(p.block.started)) + '</p><h1>Plan</h1></div></div>';
  h += '<div class="card"><h2>' + esc(M.name) + '</h2><p>' + M.desc + '</p>' +
    '<details><summary>Wie die Gewichte berechnet werden</summary><div class="stack" style="padding:6px 0">' +
    '<p>Jede Grundübung hat ein geschätztes Maximalgewicht (1RM). Das Trainingsgewicht ist ein Prozentsatz davon, gerundet auf die kleinste sinnvolle Steigerung (Langhantel 2,5 kg, Kurzhantel 2 kg).</p>' +
    '<p>Nach jeder Übung gibst du an, wie es lief. <b>Leicht</b> und alle Wiederholungen geschafft: nächstes Mal eine Stufe mehr. <b>Schwer</b> oder deutlich zu wenige Wiederholungen: eine Stufe weniger.</p>' +
    '<p>Schaffst du mehr als erwartet, rechnet die App mit der Epley-Formel (Gewicht × (1 + Wdh./30)) ein neues 1RM aus.</p>' +
    '<p>Am Blockende gilt: Hast du bei mindestens 75 % der Einheiten alle Wiederholungen geschafft, steigt das 1RM um 2,5 kg (Oberkörper) bzw. 5 kg (Beine, Kreuzheben).</p>' +
    '<p>Isolationsübungen laufen über doppelte Progression: Erst die Wiederholungen bis zum oberen Ende steigern, dann das Gewicht erhöhen.</p></div></details></div>';
  h += '<div class="card"><h2>Wochen im Block</h2><div class="scrollx"><table class="tbl"><thead><tr><th>Wo.</th><th>Phase</th><th>Last</th><th>Sätze</th><th>' + esc(EX[key].name.split(' (')[0]) + '</th></tr></thead><tbody>';
  for (let w = 0; w < M.weeks; w++) {
    const seen = {}, rows = [];
    for (let i = 0; i < d; i++) { const pr = prescribe(p, w * d + i), k = pr.label; if (!seen[k]) { seen[k] = 1; rows.push(pr); } }
    rows.forEach((pr, j) => {
      h += '<tr class="' + (w === curW ? 'cur' : '') + '"><td>' + (j === 0 ? w + 1 : '') + '</td><td>' + esc(pr.label) + '</td><td>' + fmt(Math.round(pr.pct * 1000) / 10) + ' %</td><td>' + pr.sets + ' × ' + pr.reps + '</td><td>' + (ke1 ? fkg(Math.max(20, roundTo(ke1 * pr.pct, 2.5))) : '–') + '</td></tr>';
    });
  }
  h += '</tbody></table></div><p class="hint" style="margin-top:8px">Hervorgehoben: aktuelle Woche. Die Beispielspalte nutzt dein aktuelles 1RM' + (ke1 ? ' von ' + fkg(ke1) : '') + '. Hauptübungen bekommen die volle Satzzahl, Nebenübungen höchstens 3 Sätze.</p></div>';
  // Einstellungen
  h += '<div class="card"><h2>Einstellungen</h2><label class="lab">Trainingstage</label><div class="chips">' + DAYS.map((n, i) => '<button class="chip" data-act="p-day" data-v="' + i + '" aria-pressed="' + p.days.includes(i) + '">' + n + '</button>').join('') + '</div>' +
    '<div class="pair"><div><label class="lab" for="p-time">Uhrzeit</label><input type="time" id="p-time" data-chg="time" value="' + esc(p.time) + '"></div><div><label class="lab" for="p-min">Dauer</label><select id="p-min" data-chg="minutes">' + [30,45,60,75,90].map(m => '<option value="' + m + '"' + (p.minutes === m ? ' selected' : '') + '>' + m + ' min</option>').join('') + '</select></div></div>' +
    '<label class="lab">Split</label><div class="chips">' + Object.entries(SPLITS).map(([k, s]) => '<button class="chip" data-act="p-split" data-v="' + k + '" aria-pressed="' + (resolveSplit(p) === k) + '">' + s.name + '</button>').join('') + '</div>' +
    '<label class="lab">Periodisierung</label><div class="chips">' + Object.entries(MODELS).map(([k, m]) => '<button class="chip" data-act="p-model" data-v="' + k + '" aria-pressed="' + (p.model === k) + '">' + m.name + '</button>').join('') + '</div>' +
    '<div class="row" style="margin-top:12px"><span><b>Wakeboard-Fokus</b><br><small>Griff-Finisher am Ende jeder Einheit</small></span><button class="chip" data-act="g-wake" aria-pressed="' + !!p.wake + '">' + (p.wake ? 'An' : 'Aus') + '</button></div>' +
    (NATIVE ? '<div class="row" style="margin-top:12px"><span><b>Erinnerung</b><br><small>Benachrichtigung an Trainingstagen</small></span><button class="chip" data-act="remind" aria-pressed="' + !!p.remind.on + '">' + (p.remind.on ? 'An' : 'Aus') + '</button></div>' +
      (p.remind.on ? '<label class="lab" for="p-lead">Vorlauf</label><select id="p-lead" data-chg="lead">' + [[0,'Zur Trainingszeit'],[15,'15 min vorher'],[30,'30 min vorher'],[60,'1 h vorher'],[120,'2 h vorher']].map(a => '<option value="' + a[0] + '"' + (p.remind.lead === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select>' : '') : '') +
    '<p class="hint" style="margin-top:8px">Änderungen gelten ab der nächsten Einheit. Die aktuelle Blockwoche bleibt erhalten.</p></div>';
  // Übungen je Tag
  const s = sp(), N = exCount(p.minutes);
  h += '<div class="card"><h2>Übungen je Trainingstag</h2><p class="hint">Bei ' + p.minutes + ' min trainierst du die ersten ' + N + ' Übungen. Tippe zum Tauschen.</p>' +
    s.cycle.map(tid => '<details><summary>' + esc(TPL[tid].name) + '</summary>' + templateIds(p, tid).map((id, i) => '<button class="pl' + (i >= N ? ' off' : '') + '" data-act="p-swap" data-v="' + tid + ':' + i + '"><span>' + (i + 1) + '. ' + esc(EX[id].name) + '</span><small>' + esc(EX[id].m) + ' · tauschen</small></button>').join('') + '</details>').join('') + '</div>';
  // 1RM
  const comp = Object.keys(p.e1).filter(id => EX[id] && !EX[id].main);
  h += '<div class="card"><h2>Maximalgewichte (1RM)</h2>' + MAIN_LIFTS.concat(comp).map(id => '<button class="pl" data-act="e1-edit" data-v="' + id + '"><span>' + esc(EX[id].name) + '</span><b class="num">' + (p.e1[id] ? fkg(p.e1[id]) : 'offen') + '</b></button>').join('') +
    '<p class="hint" style="margin-top:6px">Andere Grundübungen leiten ihren Wert aus der passenden Hauptübung ab (z. B. Frontkniebeuge ≈ 80 % der Kniebeuge), bis du eigene Einträge hast.</p></div>';
  h += '<div class="card flat"><div class="row"><span class="sub">Block von vorn beginnen (Werte bleiben)</span><button class="btn sm ghost" data-act="block-restart">Neu starten</button></div></div>';
  return h;
}

/* ----- Übungen ----- */
function exListHTML(q, mf, act) {
  q = (q || '').toLowerCase().trim();
  const list = EXLIST.filter(e => (!mf || e.m === mf) && (!q || e.name.toLowerCase().includes(q) || EQUIP[e.eq].toLowerCase().includes(q)));
  if (!list.length) return '<div class="empty">Keine Übung gefunden.</div>';
  return list.map(e => {
    const hs = act === 'ex-open' ? history(S.sessions, e.id) : [];
    const right = act === 'ex-open' ? (S.p.e1[e.id] ? '1RM ' + fkg(S.p.e1[e.id]) : hs.length ? hs.length + '× trainiert' : '') : '';
    return '<button class="list-btn" data-act="' + act + '" data-v="' + e.id + '"><span><b>' + esc(e.name) + '</b><br><small>' + esc(e.m) + ' · ' + esc(EQUIP[e.eq]) + (e.c ? ' · Grundübung' : '') + '</small></span><small class="num">' + right + '</small></button>';
  }).join('');
}
function vEx() {
  const mf = S.ui.mf || '';
  return '<button class="btn sm ghost" style="margin-bottom:10px" data-act="cx-new">+ Eigene Übung</button><input type="search" id="q" data-in="q" placeholder="Suchen, z. B. Rudern oder Kabel" value="' + esc(S.ui.q || '') + '" aria-label="Übung suchen">' +
    '<div class="chips" style="margin:10px 0">' + ['', ...MUSCLES].map(m => '<button class="chip" data-act="mf" data-v="' + m + '" aria-pressed="' + (mf === m) + '">' + (m || 'Alle') + '</button>').join('') + '</div>' +
    '<div class="card" id="exlist">' + exListHTML(S.ui.q, mf, 'ex-open') + '</div>';
}

/* ----- Laufen ----- */
function runElapsed() { return S.runT.acc + (S.runT.run ? Date.now() - S.runT.start : 0); }
function vRun() {
  const f = S.ui.rf || (S.ui.rf = {date:todayStr(), km:'', dur:'', type:'Locker', feel:'ok', note:''});
  const el = runElapsed();
  let h = '<div class="top"><div><p class="eyebrow">Lauftagebuch</p><h1>Laufen</h1></div></div>';
  h += '<div class="card"><h2>Stoppuhr</h2><div class="big" data-clock="run">' + fmtDur(el) + '</div><div class="row" style="justify-content:flex-start;margin-top:10px">' +
    (S.runT.run ? '<button class="btn" data-act="rt-pause">Pause</button>' : '<button class="btn" data-act="rt-start">' + (el ? 'Weiter' : 'Start') + '</button>') +
    (el ? '<button class="btn ghost" data-act="rt-stop">Beenden und eintragen</button>' : '') + '</div>' +
    '<p class="hint" style="margin-top:8px">Die Stoppuhr läuft weiter, auch wenn du die App schließt. GPS-Aufzeichnung ist in dieser Web-App nicht möglich. Die Distanz trägst du nach dem Lauf ein, z. B. von deiner Uhr.</p></div>';
  h += '<div class="card"><h2>Lauf eintragen</h2><div class="pair"><div><label class="lab" for="rf-date">Datum</label><input type="date" id="rf-date" data-in="rf" data-f="date" value="' + esc(f.date) + '"></div>' +
    '<div><label class="lab" for="rf-type">Art</label><select id="rf-type" data-in="rf" data-f="type">' + RUNTYPES.map(t => '<option' + (f.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="rf-km">Distanz (km)</label><input type="text" inputmode="decimal" id="rf-km" data-in="rf" data-f="km" value="' + esc(f.km) + '" placeholder="z. B. 5,2"></div>' +
    '<div><label class="lab" for="rf-dur">Dauer (mm:ss oder h:mm:ss)</label><input type="text" inputmode="numeric" id="rf-dur" data-in="rf" data-f="dur" value="' + esc(f.dur) + '" placeholder="z. B. 28:30"></div></div>' +
    '<p class="readout" id="rf-pace" style="margin-top:10px">' + runPreview() + '</p>' +
    '<label class="lab">Gefühl</label><div class="chips">' + FEEL.map(x => '<button class="chip" data-act="rf-feel" data-v="' + x[0] + '" aria-pressed="' + (f.feel === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
    '<label class="lab" for="rf-note">Notiz</label><input type="text" id="rf-note" data-in="rf" data-f="note" value="' + esc(f.note) + '" placeholder="Strecke, Wetter, Schuhe">' +
    '<button class="btn wide" style="margin-top:12px" data-act="run-save">Lauf speichern</button></div>';
  const wk = weeklyKm(S.runs, 8), cur = wk[wk.length - 1].v, prev = wk[wk.length - 2].v;
  const tgt = prev > 0 ? Math.round(prev * 1.1 * 2) / 2 : null;
  h += '<div class="card"><h2>Wochenkilometer</h2><p class="readout" data-ro>Diese Woche: ' + fmt(Math.round(cur * 10) / 10) + ' km</p>' + barChart(wk, 'km', 'Wochenkilometer der letzten 8 Wochen', v => fmt(Math.round(v * 10) / 10) + ' km') +
    '<p class="hint" style="margin-top:6px">' + (tgt ? 'Richtwert für diese Woche: bis ' + fmt(tgt) + ' km. Faustregel: den Wochenumfang um höchstens etwa 10 % steigern.' : 'Steigere den Wochenumfang langsam, als Faustregel um höchstens etwa 10 % pro Woche.') + '</p></div>';
  if (!S.runs.length) return h + '<div class="empty">Noch keine Läufe. Starte die Stoppuhr oder trag einen Lauf direkt ein.</div>';
  const tot = S.runs.reduce((a, r) => a + r.km, 0), longest = Math.max(...S.runs.map(r => r.km)), fast = S.runs.filter(r => r.km >= 3).map(r => r.sec / r.km);
  h += '<div class="card"><h2>Läufe</h2><div class="stats"><div><small>Gesamt</small><b>' + fmt(Math.round(tot * 10) / 10) + ' km</b></div><div><small>Längster Lauf</small><b>' + fmt(longest) + ' km</b></div><div><small>Schnellste Pace (ab 3 km)</small><b>' + (fast.length ? fmtPace(Math.min(...fast)).replace(' min/km', '') : '–') + '</b><small>min/km</small></div></div>' +
    '<div style="margin-top:10px">' + S.runs.slice().reverse().slice(0, 40).map(r => '<button class="sess" data-act="run-open" data-v="' + r.id + '"><span><b>' + esc(r.type) + ' · ' + fmt(r.km) + ' km</b><br><small>' + esc(dweek(r.date)) + ' · ' + fmtDur(r.sec * 1000) + (r.note ? ' · ' + esc(r.note) : '') + '</small></span><span class="num">' + fmtPace(r.sec / r.km) + '</span></button>').join('') + '</div></div>';
  return h;
}
function runPreview() {
  const f = S.ui.rf, km = parseNum(f.km), sec = parseDur(f.dur);
  if (km > 0 && sec > 0) return 'Pace ' + fmtPace(sec / km) + ' · ' + fmt(Math.round(km / (sec / 3600) * 10) / 10) + ' km/h';
  return 'Pace erscheint, sobald Distanz und Dauer eingetragen sind.';
}

/* ----- Verlauf ----- */
function vHist() {
  const mon = mondayOf(todayStr()), wv = weeklyVolume(S.sessions, 10), v4 = wv.slice(-4).reduce((a, b) => a + b.v, 0);
  let h = '<div class="top"><div><p class="eyebrow">Fortschritt</p><h1>Verlauf</h1></div></div><div class="segc" role="group" aria-label="Ansicht"><button data-act="hseg" data-v="" aria-pressed="' + (!S.ui.hseg) + '">Einheiten</button><button data-act="hseg" data-v="body" aria-pressed="' + (S.ui.hseg === 'body') + '">Körper</button><button data-act="hseg" data-v="ex" aria-pressed="' + (S.ui.hseg === 'ex') + '">Übungen</button></div>';
  if (S.ui.hseg === 'ex') return h + vEx();
  if (S.ui.hseg === 'body') return h + vBody();
  h += '<div class="card"><div class="stats" style="margin:0"><div><small>Krafteinheiten</small><b>' + S.sessions.length + '</b></div><div><small>Diese Woche</small><b>' + weekCount(mon) + ' + ' + weekRuns(mon) + '</b><small>Kraft + Lauf</small></div><div><small>Serie</small><b>' + weekStreak() + ' Wo.</b><small>mit Training</small></div></div><p class="hint" style="margin-top:8px">Volumen der letzten 4 Wochen: ' + volT(v4) + '</p></div>' + muscleCard();
  h += '<div class="card"><h2>Trainingsvolumen pro Woche</h2><p class="readout" data-ro>Diese Woche: ' + volT(wv[wv.length - 1].v) + '</p>' + barChart(wv, 't', 'Trainingsvolumen pro Woche', volT) +
    '<p class="hint" style="margin-top:6px">Volumen = Gewicht × Wiederholungen aller Arbeitssätze, ohne Aufwärmsätze. Tippe auf einen Balken.</p></div>';
  h += '<div class="card"><h2>Einheiten</h2>' + (S.sessions.length ? S.sessions.slice().reverse().slice(0, 60).map(sessBtn).join('') : '<div class="empty">Noch keine Einheit gespeichert.</div>') + '</div>';
  h += '<div class="card"><h2>Daten</h2><p class="sub" id="cloudstate">' + cloudText() + '</p><div class="chips" style="margin-top:10px">' +
    '<button class="btn sm ghost" data-act="exp-json">Sicherung (JSON)</button><button class="btn sm ghost" data-act="exp-csv">Sätze als CSV</button>' +
    '<label class="btn sm ghost" for="imp">Sicherung laden</label><input type="file" id="imp" accept=".json,application/json" hidden></div>' +
    '<div class="row" style="margin-top:14px"><span class="sub">Alles löschen und neu einrichten</span>' + (S.ui.wipe ? '<button class="btn sm danger" data-act="wipe2">Wirklich löschen</button>' : '<button class="btn sm ghost" data-act="wipe1">Zurücksetzen</button>') + '</div></div>';
  return h;
}
