'use strict';
/* ===== Eisenbuch: Ansichten (Training, Statistik, Verlauf, Körper, Mehr) ===== */
const I = (d, cls) => '<svg class="' + (cls || 'i') + '" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const ICONS = {
  train:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/>',
  stats:'<path d="M4 4v16h16"/><path d="M7 15l4-5 3 3 5-6"/>',
  hist:'<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/>',
  body:'<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
  more:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  play:'<path d="M8 5.5v13l11-6.5z"/>', back:'<path d="M19 12H5M11 6l-6 6 6 6"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus:'<path d="M12 5v14M5 12h14"/>', swap:'<path d="M7 4L4 7l3 3"/><path d="M4 7h12a4 4 0 0 1 4 4"/><path d="M17 20l3-3-3-3"/><path d="M20 17H8a4 4 0 0 1-4-4"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>', down:'<path d="M12 5v14M6 13l6 6 6-6"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>', chev:'<path d="M9 6l6 6-6 6"/>',
  run:'<circle cx="15" cy="4.5" r="1.8"/><path d="M7 21l3.5-6 3 2.5.5 3.5M5.5 11.5l3.5-3.5 4 .5 2 3 3 1.5M10.5 15l2.5-6.5"/>',
  grip:'<path d="M4 12h16"/><path d="M6 12a6 6 0 0 0 12 0"/><path d="M12 12V3"/>', cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  data:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  wave:'<path d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/><path d="M3 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>'
};
const TABS = [['train','Training'],['stats','Statistik'],['hist','Verlauf'],['body','Körper'],['more','Mehr']];
const FEEL = [['easy','Leicht'],['ok','Passend'],['hard','Schwer']];
const RUNTYPES = ['Locker','Tempo','Intervalle','Langer Lauf','Wettkampf'];
const MUSCLE_TAG = {Brust:['Br','#E5675B'], 'Rücken':['Rü','#5B9BE5'], Schultern:['Sc','#F2C744'], Bizeps:['Bi','#8B7CF6'], Trizeps:['Tr','#EC6FA8'], Quadrizeps:['Qu','#6DB37A'],
  Beinbeuger:['Bb','#14B8A6'], 'Gesäß':['Gs','#F59E0B'], Waden:['Wa','#7FB8C9'], Core:['Co','#E58F5B'], Unterarme:['Ua','#B5A27A'], 'Ganzkörper':['GK','#9AA59F']};
function avatar(e) { const t = MUSCLE_TAG[e.m] || ['?', '#9AA59F']; return '<span class="av" style="--c:' + t[1] + '">' + t[0] + '</span>'; }

function planLine(it) {
  if (it.mode === 'time') return it.sets + ' Sätze · ' + it.reps + ' s' + (it.kg > 0 ? ' · ' + fkg(it.kg) : '');
  if (it.mode === 'bw') return it.sets + ' Sätze · ' + it.rng[0] + '–' + it.rng[1] + ' Wdh.' + (it.kg > 0 ? ' · +' + fkg(it.kg) : '');
  if (it.mode === 'pct') return it.sets + ' Sätze · ' + it.reps + ' Wdh. · ' + fkg(it.kg);
  return it.sets + ' Sätze · ' + it.rng[0] + '–' + it.rng[1] + ' Wdh. · ' + (it.kg ? fkg(it.kg) : 'Gewicht wählen');
}
function phaseText(pr) {
  const M = MODELS[S.p.model];
  return 'Woche ' + pr.week + '/' + M.weeks + ' · ' + (S.p.model === 'dup' && !pr.deload ? pr.label + '-Tag' : pr.label) + ' · ' + fmt(Math.round(pr.pct * 1000) / 10) + ' %';
}
function head(title, eyebrow, right) { return '<header class="apphead"><div>' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') + '<h1>' + title + '</h1></div>' + (right || '') + '</header>'; }
function subhead(title, backAct, right) { return '<header class="subhead"><button class="ic" data-act="' + backAct + '" aria-label="Zurück">' + I(ICONS.back) + '</button><h1>' + esc(title) + '</h1>' + (right || '') + '</header>'; }
function segc(act, cur, opts) { return '<div class="segc" role="group">' + opts.map(o => '<button data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>').join('') + '</div>'; }
function blockSegs() {
  const p = S.p, M = MODELS[p.model], d = p.days.length, n = p.block.n;
  let h = '<div class="segs" aria-label="Fortschritt im Block">';
  for (let w = 0; w < M.weeks; w++) { h += '<div>'; for (let i = 0; i < d; i++) { const k = w * d + i; h += '<span class="seg' + (k < n ? ' done' : k === n ? ' next' : '') + '"></span>'; } h += '</div>'; }
  return h + '</div>';
}

/* ----- Onboarding ----- */
function vOnboard() {
  const ob = S.ui.ob || (S.ui.ob = {step:0, d:defaultProfile(), kg:{}, reps:{}});
  const d = ob.d, st = ob.step;
  const dots = '<p class="eyebrow">Einrichtung · Schritt ' + (st + 1) + ' von 4</p>';
  if (st === 0) return head('Eisenbuch', 'Krafttraining · Periodisierung · Griffkraft') +
    '<div class="card"><h3>Was die App für dich macht</h3><div class="stack" style="margin-top:10px">' +
    '<p><b>Trainingspläne mit Wochentagen.</b> Die App wählt jeden Tag automatisch den passenden Plan.</p>' +
    '<p><b>Periodisiert automatisch.</b> Ein Block dauert 5–6 Wochen: Start bei ca. 70 % deines Maximums, Woche für Woche schwerer, danach eine leichte Entlastungswoche.</p>' +
    '<p><b>Schlägt Gewichte vor.</b> Aus deinen Einträgen schätzt die App dein Maximalgewicht (1RM) und rechnet jede Einheit neu.</p>' +
    '<p><b>Protokolliert alles.</b> Sätze, Pausen-Timer, Bestwerte, Körpergewicht, Griffkraft-Tests und Läufe.</p>' +
    '<p class="hint">' + EXLIST.length + ' Übungen sind hinterlegt, eigene kannst du jederzeit anlegen.</p></div></div>' +
    '<button class="btn wide" data-act="ob-next">Einrichten (ca. 1 Minute)</button>';
  if (st === 1) {
    const opts = Object.entries(SPLITS).map(([k, s]) => ['split:' + k, s.name, s.desc, s.rec.includes(d.days.length)]).concat([['tpl:wake3', PROG_TPL.wake3.name, PROG_TPL.wake3.desc, false], ['tpl:old', PROG_TPL.old.name, PROG_TPL.old.desc + ' Trainingstage werden übernommen.', false]]);
    const sel = ob.tpl ? 'tpl:' + ob.tpl : 'split:' + d.split;
    return dots + '<h1>Training</h1><p class="lead">Wann und wie trainierst du?</p>' +
      '<div class="card"><h2>Trainingstage</h2><div class="chips">' + DAYS.map((n, i) => '<button class="chip" data-act="ob-day" data-v="' + i + '" aria-pressed="' + d.days.includes(i) + '">' + n + '</button>').join('') + '</div>' +
      '<p class="hint" style="margin-top:8px">' + d.days.length + ' Tage pro Woche. Lass zwischen zwei Einheiten möglichst einen Tag Pause.</p>' +
      '<label class="lab" for="ob-time">Uhrzeit</label><input type="time" id="ob-time" data-in="ob" data-f="time" value="' + esc(d.time) + '"></div>' +
      '<div class="card"><h2>Startprogramm</h2>' + opts.map(o => '<button class="opt' + (sel === o[0] ? ' sel' : '') + '" data-act="ob-split" data-v="' + o[0] + '"><b>' + o[1] + '</b><span>' + o[2] + '</span>' + (o[3] ? '<em>Passt zu ' + d.days.length + ' Tagen</em>' : '') + '</button>').join('') +
      '<p class="hint">Pläne, Wochentage und Übungen kannst du danach frei ändern.</p></div>' +
      '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-next">Weiter</button></div>';
  }
  if (st === 2) return dots + '<h1>Periodisierung</h1><p class="lead">Das Training ist in Blöcke von einigen Wochen geteilt, in denen Last und Wiederholungen gezielt wechseln. So steigerst du dich stetig und erholst dich planmäßig.</p>' +
    '<div class="card">' + Object.entries(MODELS).map(([k, m]) => '<button class="opt' + (d.model === k ? ' sel' : '') + '" data-act="ob-model" data-v="' + k + '"><b>' + m.name + '</b><span>' + m.desc + '</span><em>' + m.tag + '</em></button>').join('') + '</div>' +
    '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-next">Weiter</button></div>';
  return dots + '<h1>Startwerte</h1><p class="lead">Für die Grundübungen braucht die App ein geschätztes Maximalgewicht (1RM). Trag ein Gewicht ein, das du sauber mehrmals schaffst (kg × Wdh.). Ohne Angabe schätzt die App vorsichtig aus deinem Körpergewicht.</p>' +
    '<div class="card"><label class="lab" for="ob-bw">Körpergewicht (kg, optional)</label><input type="text" inputmode="decimal" id="ob-bw" data-in="ob" data-f="bw" value="' + (d.bw || '') + '" placeholder="z. B. 80"></div>' +
    '<div class="card"><h2>Grundübungen</h2>' + MAIN_LIFTS.map(id => '<div class="obl"><div class="row"><b>' + esc(EX[id].name) + '</b><span class="sub num" id="obe-' + id + '">' + obEst(id) + '</span></div>' +
      '<div class="pair" style="margin-top:6px"><div class="fld"><input type="text" inputmode="decimal" data-in="ob" data-f="kg:' + id + '" aria-label="Gewicht ' + esc(EX[id].name) + '" value="' + (ob.kg[id] || '') + '" placeholder="Gewicht"><span>kg</span></div>' +
      '<div class="fld"><input type="text" inputmode="numeric" data-in="ob" data-f="reps:' + id + '" aria-label="Wiederholungen ' + esc(EX[id].name) + '" value="' + (ob.reps[id] || '') + '" placeholder="Wdh."><span>Wdh.</span></div></div></div>').join('') + '</div>' +
    '<div class="row"><button class="btn ghost" data-act="ob-back">Zurück</button><button class="btn" data-act="ob-finish">Fertig</button></div>';
}
function obE1(id) {
  const ob = S.ui.ob, kg = parseNum(ob.kg[id]), r = parseNum(ob.reps[id]);
  if (kg > 0 && r >= 1 && r <= 15) return {v:roundHalf(EPLEY(kg, r)), src:'test'};
  if (kg > 0 && !(r > 0)) return {v:kg, src:'test'};
  if (ob.d.bw > 0) return {v:estimateFromBW(ob.d.bw)[id], src:'bw'};
  return null;
}
function obEst(id) { const x = obE1(id); if (!x) return 'wird im 1. Training ermittelt'; return '1RM ≈ ' + fkg(x.v) + (x.src === 'bw' ? ' (geschätzt)' : ''); }

/* ----- Training ----- */
function planRow(pl) {
  const w = buildWorkout(S.p, S.sessions, Math.min(S.p.block.n, blockSessions(S.p) - 1), pl.id), last = lastDoneOfPlan(S.sessions, pl.id);
  const dl = pl.days.length ? pl.days.map(x => DAYS[x]).join(' ') : '–';
  return '<button class="prow" data-act="pl-open" data-v="' + pl.id + '"><span class="dayc' + (pl.days.length > 1 ? ' multi' : '') + '" style="--c:' + pl.color + '">' + dl + '</span>' +
    '<span class="pt"><b>' + esc(pl.name) + '</b><small>' + pl.items.length + ' Übungen · ca. ' + w.est + ' min</small></span><small class="ago">' + (agoText(last) || 'neu') + '</small></button>';
}
function heroCard(w, label) {
  return '<div class="hero"><button class="play" data-act="pl-start" data-v="' + (w.planId || '') + '" aria-label="' + esc(w.name) + ' starten">' + I(ICONS.play) + '</button>' +
    '<div class="hero-t"><small>' + label + '</small><b>' + esc(w.name) + '</b><span>' + esc(phaseText(w.pr)) + ' · ca. ' + w.est + ' min</span></div></div>';
}
function vTrain() {
  const p = S.p, pg = activeProgram(p), M = MODELS[p.model], total = blockSessions(p), n = p.block.n;
  let h = head('Training', esc(dlong(todayStr()))) + '<button class="pill" data-act="prog-open"><small>Programm</small><span>' + esc(pg.name) + '</span>' + I(ICONS.chev, 'i s') + '</button>';
  if (S.active) h += '<button class="banner" data-act="wo-open"><span><b>Training läuft</b><small>' + esc(S.active.name) + ' · <span class="num" data-clock="wo">' + fmtDur(Date.now() - S.active.start) + '</span></small></span><span class="btn sm">Fortsetzen</span></button>';
  if (n >= total) {
    h += '<div class="card"><p class="eyebrow">Block ' + p.block.no + ' · ' + M.name + '</p><h3>Block geschafft</h3>' + blockSegs() +
      '<p>Alle ' + total + ' Einheiten sind erledigt. Die App wertet aus, welche Übungen du steigern kannst, und startet den nächsten Block.</p><button class="btn wide" data-act="block-close">Auswertung und nächster Block</button></div>';
  } else if (!S.active) {
    const np = nextPlan(p, S.sessions);
    if (np) {
      const w = buildWorkout(p, S.sessions, n, np.plan.id);
      h += heroCard(w, (np.today ? 'Heute' : esc(dweek(np.date))) + ' · ' + esc(p.time) + ' Uhr') + '<div class="blockline">' + blockSegs() + '<small>Block ' + p.block.no + ' · Einheit ' + (n + 1) + ' von ' + total + '</small></div>';
      if (!np.today) h += '<p class="hint" style="margin:-4px 0 12px">Heute ist kein Training geplant. Du kannst trotzdem jeden Plan starten.</p>';
    } else h += '<div class="empty">Noch kein Plan in diesem Programm. Leg unten einen an.</div>';
  }
  const gd = gripDue();
  if (gd.due) h += '<button class="banner soft" data-act="g-start"><span><b>' + (gd.first ? 'Ersten Griff-Test machen' : 'Griff-Test fällig') + '</b><small>' + (gd.first ? 'Ausgangswert für die Wakeboard-Saison' : 'Letzter Test ' + esc(dshort(gd.last))) + '</small></span>' + I(ICONS.chev) + '</button>';
  h += '<h2 class="sec">Trainingspläne</h2><div class="list">' + (pg.plans.length ? pg.plans.map(planRow).join('') : '') + '<button class="prow add" data-act="pl-new"><span class="dayc" style="--c:var(--soft)">' + I(ICONS.plus) + '</span><span class="pt"><b>Neuer Plan</b><small>Name, Wochentage und Übungen festlegen</small></span></button></div>';
  h += '<div class="quick"><button data-act="wo-free">' + I(ICONS.plus) + 'Freies Training</button><button data-act="more-go" data-v="run">' + I(ICONS.run) + 'Lauf eintragen</button><button data-act="b-quick">' + I(ICONS.body) + 'Gewicht</button></div>';
  return h;
}
function vPlanDetail(id) {
  const p = S.p, pl = findPlan(p, id); if (!pl) { S.ui.pv = null; return vTrain(); }
  const ed = !!S.ui.pedit, n = Math.min(p.block.n, blockSessions(p) - 1), w = buildWorkout(p, S.sessions, n, pl.id);
  let h = subhead(pl.name, 'pl-back', '<button class="ic' + (ed ? ' on' : '') + '" data-act="pl-edit" aria-label="' + (ed ? 'Bearbeiten beenden' : 'Plan bearbeiten') + '">' + I(ed ? ICONS.check : ICONS.edit) + '</button>');
  if (!S.active) h += heroCard(w, 'Training starten');
  if (ed) {
    h += '<div class="card"><label class="lab" for="pl-name">Name</label><input type="text" id="pl-name" data-chg="plname" data-v="' + pl.id + '" value="' + esc(pl.name) + '">' +
      '<label class="lab">Wochentage</label><div class="chips">' + DAYS.map((d, i) => '<button class="chip" data-act="pl-day" data-v="' + i + '" aria-pressed="' + pl.days.includes(i) + '">' + d + '</button>').join('') + '</div>' +
      '<p class="hint" style="margin-top:8px">An diesen Tagen wählt die App den Plan automatisch. Ohne Wochentag läuft er in der Rotation mit.</p></div>';
  } else h += '<p class="daysline">' + I(ICONS.cal, 'i s') + (pl.days.length ? pl.days.map(d => DAYS[d]).join(', ') : 'Kein fester Wochentag') + ' · ' + esc(activeProgram(p).name) + '</p>';
  h += '<div class="list exlist">' + (pl.items.length ? pl.items.map((it, i) => {
    const e = EX[it.exId], x = exPlan(p, it.exId, i, w.pr, S.sessions), ls = lastSession(S.sessions, it.exId);
    return '<div class="exitem">' + avatar(e) + '<button class="exm" data-act="ex-open" data-v="' + e.id + '"><b>' + esc(e.name) + '</b><small>' + esc(planLine(x)) + '</small></button>' +
      (ed ? '<span class="exctl"><button class="ic s" data-act="pl-up" data-v="' + i + '" aria-label="Nach oben"' + (i ? '' : ' disabled') + '>' + I(ICONS.up) + '</button><button class="ic s" data-act="pl-down" data-v="' + i + '" aria-label="Nach unten"' + (i < pl.items.length - 1 ? '' : ' disabled') + '>' + I(ICONS.down) + '</button><button class="ic s" data-act="pl-swap" data-v="' + i + '" aria-label="Tauschen">' + I(ICONS.swap) + '</button><button class="ic s warn" data-act="pl-rm" data-v="' + i + '" aria-label="Entfernen">' + I(ICONS.x) + '</button></span>'
        : '<span class="exr"><small>' + (ls ? agoText(ls.s.date) : 'neu') + '</small><button class="ic s" data-act="pl-swap" data-v="' + i + '" aria-label="Übung tauschen">' + I(ICONS.swap) + '</button></span>') + '</div>';
  }).join('') : '<div class="empty">Noch keine Übungen. Tippe auf +.</div>') + '</div>';
  if (ed) h += '<div class="row" style="margin-top:16px"><span class="sub">Plan löschen</span>' + (S.ui.pdel ? '<button class="btn sm danger" data-act="pl-del2">Wirklich löschen</button>' : '<button class="btn sm ghost" data-act="pl-del1">Löschen</button>') + '</div>';
  h += '<div style="height:84px"></div><button class="fab" data-act="pl-add" aria-label="Übung hinzufügen">' + I(ICONS.plus) + '</button>';
  return h;
}

/* ----- Statistik ----- */
function vStats() {
  const seg = S.ui.sseg || '', p = S.p;
  let h = head('Statistik', 'Fortschritt') + segc('sseg', seg, [['', 'Kraft'], ['ex', 'Übungen (' + EXLIST.length + ')']]);
  if (seg === 'ex') return h + vEx();
  const mon = mondayOf(todayStr()), wv = weeklyVolume(S.sessions, 10), v4 = wv.slice(-4).reduce((a, b) => a + b.v, 0);
  h += '<div class="stats tiles"><div><small>Einheiten</small><b>' + S.sessions.length + '</b></div><div><small>Diese Woche</small><b>' + weekCount(mon) + '</b><small>+ ' + weekRuns(mon) + ' Lauf</small></div><div><small>Serie</small><b>' + weekStreak() + ' Wo.</b></div></div>';
  h += liftCard(S.ui.sper || '3M') + workoutCard() + muscleCard();
  h += '<div class="card"><h2>Volumen pro Woche</h2><p class="readout" data-ro>Diese Woche: ' + volT(wv[wv.length - 1].v) + '</p>' + barChart(wv, 't', 'Trainingsvolumen pro Woche', volT) +
    '<p class="hint" style="margin-top:6px">Gewicht × Wiederholungen aller Arbeitssätze. Letzte 4 Wochen: ' + volT(v4) + '.</p></div>';
  return h;
}
function exListHTML(q, mf, act) {
  q = (q || '').toLowerCase().trim();
  const list = EXLIST.filter(e => (!mf || e.m === mf) && (!q || e.name.toLowerCase().includes(q) || EQUIP[e.eq].toLowerCase().includes(q)));
  let h = act === 'pick' ? '<button class="exitem newex" data-act="cx-new" data-v="pick">' + '<span class="av" style="--c:var(--acc)">' + I(ICONS.plus, 'i s') + '</span><span class="exm"><b>Neue Übung anlegen' + (q ? ': „' + esc(q) + '“' : '') + '</b><small>Eigene Übung, wird gleich übernommen</small></span></button>' : '';
  if (!list.length) return h + '<div class="empty">Keine Übung gefunden.</div>';
  return h + list.map(e => {
    const hs = act === 'ex-open' ? history(S.sessions, e.id) : [];
    const right = act === 'ex-open' ? (S.p.e1[e.id] ? '1RM ' + fkg(S.p.e1[e.id]) : hs.length ? hs.length + '×' : '') : '';
    return '<button class="exitem" data-act="' + act + '" data-v="' + e.id + '">' + avatar(e) + '<span class="exm"><b>' + esc(e.name) + '</b><small>' + esc(e.m) + ' · ' + esc(EQUIP[e.eq]) + (e.custom ? ' · eigene' : '') + '</small></span><small class="num exr">' + right + '</small></button>';
  }).join('');
}
function vEx() {
  const mf = S.ui.mf || '';
  return '<input type="search" id="q" data-in="q" placeholder="Übung suchen, z. B. Rudern oder Kabel" value="' + esc(S.ui.q || '') + '" aria-label="Übung suchen">' +
    '<div class="chips scrollchips">' + ['', ...MUSCLES].map(m => '<button class="chip" data-act="mf" data-v="' + m + '" aria-pressed="' + (mf === m) + '">' + (m || 'Alle') + '</button>').join('') + '</div>' +
    '<button class="btn sm ghost" style="margin-bottom:10px" data-act="cx-new">' + I(ICONS.plus, 'i s') + ' Eigene Übung</button>' +
    '<div class="list exlist" id="exlist">' + exListHTML(S.ui.q, mf, 'ex-open') + '</div>';
}

/* ----- Verlauf ----- */
function weekCount(mon) { const e = addDays(mon, 7); return S.sessions.filter(s => s.date >= mon && s.date < e).length; }
function weekRuns(mon) { const e = addDays(mon, 7); return S.runs.filter(s => s.date >= mon && s.date < e).length; }
function sessBtn(s) {
  const pl = s.planId && findPlan(S.p, s.planId), c = (pl && pl.color) || 'var(--acc)';
  return '<button class="prow" data-act="sess-open" data-v="' + s.id + '"><span class="dayc date" style="--c:' + c + '"><b>' + parseD(s.date).getDate() + '</b><small>' + DAYS[wdOf(s.date)] + '</small></span><span class="pt"><b>' + esc(s.name) + '</b><small>' + fmtDur(s.dur || 0) + ' · ' + s.exercises.length + ' Übungen' + (s.week ? ' · Woche ' + s.week : '') + '</small></span><small class="ago num">' + volT(sessionVolume(s)) + '</small></button>';
}
function runBtn(r) {
  return '<button class="prow" data-act="run-open" data-v="' + r.id + '"><span class="dayc date" style="--c:#7FB8C9"><b>' + parseD(r.date).getDate() + '</b><small>' + DAYS[wdOf(r.date)] + '</small></span><span class="pt"><b>' + esc(r.type) + ' · ' + fmt(r.km) + ' km</b><small>' + fmtDur(r.sec * 1000) + ' · ' + fmtPace(r.sec / r.km) + '</small></span>' + I(ICONS.run, 'i s ago') + '</button>';
}
function vHist() {
  const items = S.sessions.map(s => ({d:s.date, t:s.start || 0, h:sessBtn(s)})).concat(S.runs.map(r => ({d:r.date, t:r.t || 0, h:runBtn(r)}))).sort((a, b) => b.d < a.d ? -1 : b.d > a.d ? 1 : b.t - a.t);
  let h = head('Verlauf', S.sessions.length + ' Krafteinheiten · ' + S.runs.length + ' Läufe');
  h += calendarCard();
  if (!items.length) return h + '<div class="empty">Noch nichts gespeichert. Starte ein Training unter „Training“.</div>';
  let cur = '';
  items.slice(0, 150).forEach(x => {
    const m = parseD(x.d).toLocaleDateString('de-DE', {month:'long', year:'numeric'});
    if (m !== cur) { if (cur) h += '</div>'; h += '<h2 class="sec">' + m + '</h2><div class="list">'; cur = m; }
    h += x.h;
  });
  return h + '</div>';
}

/* ----- Körper ----- */
function vBodyTab() {
  const seg = S.ui.bseg || '';
  return head('Körper', seg === 'grip' ? 'Wakeboard-Vorbereitung' : 'Gewicht und Maße') + segc('bseg', seg, [['', 'Gewicht'], ['grip', 'Griffkraft']]) + (seg === 'grip' ? vGrip() : vBody());
}

/* ----- Mehr ----- */
function moreRow(k, icon, t, s) { return '<button class="prow" data-act="more-go" data-v="' + k + '"><span class="dayc" style="--c:var(--soft)">' + I(icon) + '</span><span class="pt"><b>' + t + '</b><small>' + s + '</small></span>' + I(ICONS.chev, 'i s ago') + '</button>'; }
function vMore() {
  const m = S.ui.more, p = S.p;
  if (m === 'peri') return subhead('Periodisierung', 'more-back') + vPeri();
  if (m === 'run') return subhead('Laufen', 'more-back') + vRun();
  if (m === 'set') return subhead('Einstellungen', 'more-back') + vSettings();
  if (m === 'data') return subhead('Daten und Sicherung', 'more-back') + vData();
  return head('Mehr') + '<div class="list">' +
    moreRow('peri', ICONS.wave, 'Periodisierung und 1RM', MODELS[p.model].name + ' · Block ' + p.block.no + ', Einheit ' + Math.min(p.block.n + 1, blockSessions(p)) + '/' + blockSessions(p)) +
    moreRow('run', ICONS.run, 'Laufen', S.runs.length + ' Läufe · Stoppuhr und Wochenkilometer') +
    moreRow('set', ICONS.gear, 'Einstellungen', 'Trainingszeit' + (NATIVE ? ', Erinnerungen' : '') + ', Wakeboard-Fokus') +
    moreRow('data', ICONS.data, 'Daten und Sicherung', 'Export, Import, Zurücksetzen') + '</div>' +
    '<p class="hint" style="text-align:center;margin-top:18px">Eisenbuch · ' + EXLIST.length + ' Übungen</p>';
}
function vPeri() {
  const p = S.p, M = MODELS[p.model], d = p.days.length, curW = Math.floor(p.block.n / d), key = MAIN_LIFTS.find(id => p.e1[id]) || 'kniebeuge', ke1 = p.e1[key];
  let h = '<div class="card"><p class="eyebrow">Block ' + p.block.no + ' · seit ' + esc(dshort(p.block.started)) + '</p><h2>' + esc(M.name) + '</h2>' + blockSegs() + '<p>' + M.desc + '</p>' +
    '<label class="lab">Modell</label><div class="chips">' + Object.entries(MODELS).map(([k, m]) => '<button class="chip" data-act="p-model" data-v="' + k + '" aria-pressed="' + (p.model === k) + '">' + m.name + '</button>').join('') + '</div>' +
    '<details><summary>Wie die Gewichte berechnet werden</summary><div class="stack" style="padding:6px 0">' +
    '<p>Jede Grundübung hat ein geschätztes Maximalgewicht (1RM). Das Trainingsgewicht ist ein Prozentsatz davon, gerundet auf die kleinste Steigerung (Langhantel 2,5 kg, Kurzhantel 2 kg).</p>' +
    '<p>Nach jeder Übung gibst du an, wie es lief. <b>Leicht</b> und alle Wiederholungen geschafft: nächstes Mal eine Stufe mehr. <b>Schwer</b> oder deutlich zu wenige: eine Stufe weniger.</p>' +
    '<p>Am Blockende steigt das 1RM um 2,5 kg (Oberkörper) bzw. 5 kg (Beine, Kreuzheben), wenn du in mindestens 75 % der Einheiten alle Wiederholungen geschafft hast.</p>' +
    '<p>Isolationsübungen: erst die Wiederholungen bis zum oberen Ende steigern, dann das Gewicht. Nach mindestens 14 Tagen Pause startet die nächste Einheit 10 % leichter.</p></div></details></div>';
  h += '<div class="card"><h2>Wochen im Block</h2><div class="scrollx"><table class="tbl"><thead><tr><th>Wo.</th><th>Phase</th><th>Last</th><th>Sätze</th><th>' + esc(EX[key].name.split(' (')[0]) + '</th></tr></thead><tbody>';
  for (let w = 0; w < M.weeks; w++) {
    const seen = {}, rows = [];
    for (let i = 0; i < d; i++) { const pr = prescribe(p, w * d + i), k = pr.label; if (!seen[k]) { seen[k] = 1; rows.push(pr); } }
    rows.forEach((pr, j) => { h += '<tr class="' + (w === curW ? 'cur' : '') + '"><td>' + (j === 0 ? w + 1 : '') + '</td><td>' + esc(pr.label) + '</td><td>' + fmt(Math.round(pr.pct * 1000) / 10) + ' %</td><td>' + pr.sets + ' × ' + pr.reps + '</td><td>' + (ke1 ? fkg(Math.max(20, roundTo(ke1 * pr.pct, 2.5))) : '–') + '</td></tr>'; });
  }
  h += '</tbody></table></div><p class="hint" style="margin-top:8px">' + d + ' Einheiten pro Woche (aus den Wochentagen deiner Pläne). Hauptübungen bekommen die volle Satzzahl, Nebenübungen höchstens 3 Sätze.</p></div>';
  const comp = Object.keys(p.e1).filter(id => EX[id] && !EX[id].main);
  h += '<div class="card"><h2>Maximalgewichte (1RM)</h2><div class="list flatlist">' + MAIN_LIFTS.concat(comp).map(id => '<button class="lift" data-act="e1-edit" data-v="' + id + '">' + avatar(EX[id]) + '<span>' + esc(EX[id].name) + '</span><b class="num">' + (p.e1[id] ? fkg(p.e1[id]) : 'offen') + '</b></button>').join('') + '</div>' +
    '<p class="hint" style="margin-top:6px">Andere Grundübungen leiten ihren Wert ab (z. B. Frontkniebeuge ≈ 80 % der Kniebeuge), bis du eigene Einträge hast.</p></div>';
  h += '<div class="row"><span class="sub">Block von vorn beginnen (Werte bleiben)</span><button class="btn sm ghost" data-act="block-restart">Neu starten</button></div>';
  return h;
}
function vSettings() {
  const p = S.p;
  return '<div class="card"><label class="lab" for="p-time">Übliche Trainingszeit</label><input type="time" id="p-time" data-chg="time" value="' + esc(p.time) + '">' +
    (NATIVE ? '<div class="row" style="margin-top:14px"><span><b>Erinnerung</b><br><small>Benachrichtigung an Tagen mit Plan</small></span><button class="chip" data-act="remind" aria-pressed="' + !!p.remind.on + '">' + (p.remind.on ? 'An' : 'Aus') + '</button></div>' +
      (p.remind.on ? '<label class="lab" for="p-lead">Vorlauf</label><select id="p-lead" data-chg="lead">' + [[0,'Zur Trainingszeit'],[15,'15 min vorher'],[30,'30 min vorher'],[60,'1 h vorher'],[120,'2 h vorher']].map(a => '<option value="' + a[0] + '"' + (p.remind.lead === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select>' : '') : '') +
    '<div class="row" style="margin-top:14px"><span><b>Wakeboard-Fokus</b><br><small>Griff-Finisher am Ende jeder Einheit</small></span><button class="chip" data-act="g-wake" aria-pressed="' + !!p.wake + '">' + (p.wake ? 'An' : 'Aus') + '</button></div></div>' +
    '<p class="hint">Saisonstart und Griff-Test-Intervall stellst du unter Körper → Griffkraft ein.</p>';
}
function vData() {
  return '<div class="card"><p class="sub" id="cloudstate">' + cloudText() + '</p><div class="stack" style="margin-top:12px">' +
    '<button class="btn ghost" data-act="exp-json">Sicherung exportieren (JSON)</button><button class="btn ghost" data-act="exp-csv">Alle Sätze als CSV</button>' +
    '<label class="btn ghost" for="imp">Sicherung laden</label><input type="file" id="imp" accept=".json,application/json" hidden></div></div>' +
    '<div class="row"><span class="sub">Alles löschen und neu einrichten</span>' + (S.ui.wipe ? '<button class="btn sm danger" data-act="wipe2">Wirklich löschen</button>' : '<button class="btn sm ghost" data-act="wipe1">Zurücksetzen</button>') + '</div>';
}

/* ----- Laufen ----- */
function runElapsed() { return S.runT.acc + (S.runT.run ? Date.now() - S.runT.start : 0); }
function vRun() {
  const f = S.ui.rf || (S.ui.rf = {date:todayStr(), km:'', dur:'', type:'Locker', feel:'ok', note:''});
  const el = runElapsed();
  let h = '<div class="card"><h2>Stoppuhr</h2><div class="big" data-clock="run">' + fmtDur(el) + '</div><div class="row" style="justify-content:flex-start;margin-top:10px">' +
    (S.runT.run ? '<button class="btn" data-act="rt-pause">Pause</button>' : '<button class="btn" data-act="rt-start">' + (el ? 'Weiter' : 'Start') + '</button>') +
    (el ? '<button class="btn ghost" data-act="rt-stop">Beenden und eintragen</button>' : '') + '</div>' +
    '<p class="hint" style="margin-top:8px">Läuft weiter, auch wenn du die App schließt. Die Distanz trägst du nach dem Lauf ein, z. B. von deiner Uhr.</p></div>';
  h += '<div class="card"><h2>Lauf eintragen</h2><div class="pair"><div><label class="lab" for="rf-date">Datum</label><input type="date" id="rf-date" data-in="rf" data-f="date" value="' + esc(f.date) + '"></div>' +
    '<div><label class="lab" for="rf-type">Art</label><select id="rf-type" data-in="rf" data-f="type">' + RUNTYPES.map(t => '<option' + (f.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="rf-km">Distanz (km)</label><input type="text" inputmode="decimal" id="rf-km" data-in="rf" data-f="km" value="' + esc(f.km) + '" placeholder="z. B. 5,2"></div>' +
    '<div><label class="lab" for="rf-dur">Dauer (mm:ss)</label><input type="text" inputmode="numeric" id="rf-dur" data-in="rf" data-f="dur" value="' + esc(f.dur) + '" placeholder="z. B. 28:30"></div></div>' +
    '<p class="readout" id="rf-pace" style="margin-top:10px">' + runPreview() + '</p>' +
    '<label class="lab">Gefühl</label><div class="chips">' + FEEL.map(x => '<button class="chip" data-act="rf-feel" data-v="' + x[0] + '" aria-pressed="' + (f.feel === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
    '<label class="lab" for="rf-note">Notiz</label><input type="text" id="rf-note" data-in="rf" data-f="note" value="' + esc(f.note) + '" placeholder="Strecke, Wetter, Schuhe">' +
    '<button class="btn wide" style="margin-top:12px" data-act="run-save">Lauf speichern</button></div>';
  const wk = weeklyKm(S.runs, 8), cur = wk[wk.length - 1].v, prev = wk[wk.length - 2].v, tgt = prev > 0 ? Math.round(prev * 1.1 * 2) / 2 : null;
  h += '<div class="card"><h2>Wochenkilometer</h2><p class="readout" data-ro>Diese Woche: ' + fmt(Math.round(cur * 10) / 10) + ' km</p>' + barChart(wk, 'km', 'Wochenkilometer der letzten 8 Wochen', v => fmt(Math.round(v * 10) / 10) + ' km') +
    '<p class="hint" style="margin-top:6px">' + (tgt ? 'Richtwert diese Woche: bis ' + fmt(tgt) + ' km (höchstens ca. 10 % mehr als letzte Woche).' : 'Steigere den Wochenumfang um höchstens ca. 10 % pro Woche.') + '</p></div>';
  if (!S.runs.length) return h;
  const tot = S.runs.reduce((a, r) => a + r.km, 0), longest = Math.max(...S.runs.map(r => r.km)), fast = S.runs.filter(r => r.km >= 3).map(r => r.sec / r.km);
  return h + '<div class="stats tiles"><div><small>Gesamt</small><b>' + fmt(Math.round(tot * 10) / 10) + ' km</b></div><div><small>Längster</small><b>' + fmt(longest) + ' km</b></div><div><small>Beste Pace ab 3 km</small><b>' + (fast.length ? fmtPace(Math.min(...fast)).replace(' min/km', '') : '–') + '</b></div></div>' +
    '<div class="list">' + S.runs.slice().reverse().slice(0, 30).map(runBtn).join('') + '</div>';
}
function runPreview() {
  const f = S.ui.rf, km = parseNum(f.km), sec = parseDur(f.dur);
  if (km > 0 && sec > 0) return 'Pace ' + fmtPace(sec / km) + ' · ' + fmt(Math.round(km / (sec / 3600) * 10) / 10) + ' km/h';
  return 'Pace erscheint, sobald Distanz und Dauer eingetragen sind.';
}
