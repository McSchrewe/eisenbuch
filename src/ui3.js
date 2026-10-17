'use strict';
/* ===== Eisenbuch: Training, Sheets, Ereignisse ===== */
function uid(pre) { return pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function itemFromPlan(pl) {
  const sets = []; for (let i = 0; i < pl.sets; i++) sets.push({kg:pl.kg == null ? null : pl.kg, reps:pl.reps, done:false});
  return {exId:pl.exId, ss:!!pl.ss, plan:{mode:pl.mode, sets:pl.sets, reps:pl.reps, pct:pl.pct, kg:pl.kg, rng:pl.rng, desc:pl.desc, e1:pl.e1, first:pl.first, slot:pl.slot}, lastTxt:pl.lastTxt, feel:'ok', sets};
}
let wakeLock = null;
function wake() { try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {}); } catch (e) {} }
function unwake() { try { if (wakeLock) wakeLock.release(); } catch (e) {} wakeLock = null; }

function startWorkout(free, planId) {
  const p = S.p, total = blockSessions(p), over = p.block.n >= total;
  /* Nach Blockende ohne Auswertung: mit den Werten der letzten Woche, ohne den Blockzähler zu erhöhen */
  const w = free ? {planId:null, tplId:null, name:'Freies Training', pr:{week:0, label:'Frei', pct:0.75, reps:8, sets:3, deload:false}, items:[]} : buildWorkout(p, S.sessions, over ? total - 1 : p.block.n, planId);
  S.active = {id:uid('s'), start:Date.now(), date:todayStr(), planId:w.planId, tplId:w.tplId, name:w.name, n:free || over ? null : p.block.n, pr:w.pr, block:p.block.no, items:w.items.map(itemFromPlan)};
  S.ui.woMin = false; S.ui.wf = null; S.ui.ws = null; saveActive(); render(); wake();
  if (free) openPicker({mode:'wadd'});
}
function finishWorkout() {
  const a = S.active, p = S.p, end = Date.now();
  const ex = a.items.map(it => ({exId:it.exId, plan:it.plan, feel:it.feel, sets:it.sets.filter(s => s.done).map(s => ({kg:s.kg || 0, reps:s.reps || 0, done:true, warm:!!s.warm}))})).filter(x => x.sets.length);
  if (!ex.length) { toast('Noch kein Satz abgehakt. Hake erledigte Sätze mit ✓ ab oder verwirf das Training.'); return; }
  const sess = {id:a.id, date:a.date, start:a.start, end, dur:end - a.start, planId:a.planId || null, tplId:a.tplId, name:a.name, block:a.block, week:a.pr.week, label:a.pr.label, deload:!!a.pr.deload, n:a.n, exercises:ex, note:(a.note || '').trim()};
  sess.before = {e1:{...p.e1}, adj:{...p.adj}, n:p.block.n, no:p.block.no}; /* für sauberes Rückgängigmachen beim Löschen */
  const prs = prCheck(S.sessions, sess), ch = applyProgress(p, sess);
  S.sessions.push(sess);
  if (a.n !== null && a.n === p.block.n && a.block === p.block.no) p.block.n++;
  S.active = null; S.rest = null; saveActive(); saveProfile(); saveSession(sess); unwake();
  S.ui.sheet = {t:'summary', sess, prs, ch};
  render();
}

/* ----- Trainingsansicht ----- */
function restFor(it) { const e = EX[it.exId], ov = S.p.restOv && S.p.restOv[it.exId]; if (ov) return ov; if (it.plan.mode === 'pct') return it.plan.slot < 2 ? 150 : 120; if (e.m === 'Core' || it.plan.mode === 'time') return 60; return 90; }
function renderWorkout() {
  const el = $('#screen'), show = S.active && !S.ui.woMin && S.p && S.p.done;
  if (!show) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('lock'); return; }
  const old = $('#woscroll'), top = old ? old.scrollTop : 0;
  el.innerHTML = vWorkout(); el.hidden = false; document.body.classList.add('lock');
  const nw = $('#woscroll'); if (nw) nw.scrollTop = top;
}
function renderRest() {
  const el = $('#rest');
  if (!S.rest || !S.active || S.ui.woMin) { el.hidden = true; return; }
  const left = Math.max(0, Math.ceil((S.rest.end - Date.now()) / 1000));
  if (!left) { S.rest = null; el.hidden = true; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} beep(880, 250); setTimeout(() => beep(1175, 300), 300); toast('Pause vorbei. Nächster Satz.'); return; }
  if (el.hidden || !el.innerHTML) el.innerHTML = '<div><small>Pause</small><b data-rest></b></div><button class="btn sm" data-act="rest-15m">−15 s</button><button class="btn sm" data-act="rest-15p">+15 s</button><button class="btn sm" data-act="rest-skip">Weiter</button>';
  el.hidden = false; el.querySelector('[data-rest]').textContent = fmtDur(left * 1000);
}

/* ----- Sheets ----- */
function openPicker(o) { S.ui.sheet = {t:'pick', ...o}; S.ui.pq = ''; S.ui.pm = o.m || ''; renderSheet(); }
function sheetHTML() {
  const sh = S.ui.sheet, p = S.p; if (!sh) return '';
  const close = '<button class="btn ghost wide" style="margin-top:12px" data-act="close">Schließen</button>';
  if (sh.t === 'pick') {
    return '<h2>' + (sh.mode === 'wadd' || sh.mode === 'pladd' ? 'Übung hinzufügen' : 'Übung tauschen') + '</h2><input type="search" data-in="pq" placeholder="Suchen" aria-label="Übung suchen" value="' + esc(S.ui.pq) + '">' +
      '<div class="chips" style="margin:10px 0">' + ['', ...MUSCLES].map(m => '<button class="chip" data-act="pm" data-v="' + m + '" aria-pressed="' + (S.ui.pm === m) + '">' + (m || 'Alle') + '</button>').join('') + '</div>' +
      '<div id="picklist" class="list exlist">' + exListHTML(S.ui.pq, S.ui.pm, 'pick') + '</div>' + close;
  }
  if (sh.t === 'ex') {
    const e = EX[sh.id], hs = history(S.sessions, sh.id);
    let h = '<p class="eyebrow">' + esc(e.m) + ' · ' + esc(EQUIP[e.eq]) + (e.c ? ' · Grundübung' : '') + '</p><h2>' + esc(e.name) + '</h2>' + exPics(sh.id) + exHowTo(sh.id);
    if (e.c && e.eq !== 'KG' && !e.t) { const v = e1Of(p, sh.id); h += '<div class="row card" style="margin-top:8px"><span>Geschätztes 1RM<br><b class="num" style="font:600 24px var(--fd)">' + (v ? fkg(v) : 'offen') + '</b>' + (v && !p.e1[sh.id] ? '<br><small>abgeleitet aus ' + esc(EX[e.base].name) + '</small>' : '') + '</span><button class="btn sm ghost" data-act="e1-edit" data-v="' + sh.id + '">Bearbeiten</button></div>'; }
    if (!hs.length) return h + '<div class="empty">Noch keine Einträge für diese Übung.</div>' + exExtras(sh.id) + close;
    const unit = hs[0].unit, best = Math.max(...hs.map(x => x.v)), last = hs[hs.length - 1];
    h += '<p class="readout" id="lc-ro">' + esc(dshort(last.date) + ': ' + fmt(last.v) + ' ' + unit + ' · bester Satz ' + last.top) + '</p>' +
      lineChart(hs, unit, 'Verlauf ' + e.name) + '<p class="hint">' + (unit === 'kg' ? 'Kurve: geschätztes 1RM je Einheit (Epley), aus dem besten Satz.' : unit === 's' ? 'Kurve: längste Haltezeit je Einheit.' : 'Kurve: meiste Wiederholungen je Einheit.') + '</p>' +
      '<div class="stats"><div><small>Bestwert</small><b>' + fmt(best) + ' ' + unit + '</b></div><div><small>Seit dem ersten Mal</small><b>' + (hs.length > 1 ? (deltaHTML(pctDelta(last.v, hs[0].v)) || '0 %') : '–') + '</b></div><div><small>Einheiten</small><b>' + hs.length + '</b></div></div>' +
      '<div style="margin-top:10px">' + hs.slice().reverse().slice(0, 8).map(x => '<div class="exrow"><span>' + esc(dweek(x.date)) + '</span><span class="r">' + esc(x.top) + '</span></div>').join('') + '</div>';
    return h + exExtras(sh.id) + close;
  }
  if (sh.t === 'e1') {
    const e = EX[sh.id], v = p.e1[sh.id];
    return '<h2>1RM: ' + esc(e.name) + '</h2><p>Trag einen sauberen Satz ein (Gewicht und Wiederholungen bis 12). Die App berechnet das Maximalgewicht mit der Epley-Formel. Mit 1 Wiederholung gibst du das 1RM direkt an.</p>' +
      '<div class="pair"><div class="fld"><input inputmode="decimal" id="e1-kg" data-in="e1p" aria-label="Gewicht" placeholder="Gewicht" value="' + (v ? fmt(v) : '') + '"><span>kg</span></div><div class="fld"><input inputmode="numeric" id="e1-r" data-in="e1p" aria-label="Wiederholungen" value="1"><span>Wdh.</span></div></div>' +
      '<p class="readout" id="e1-pre" style="margin-top:10px">' + (v ? '1RM = ' + fkg(v) : '') + '</p><button class="btn wide" data-act="e1-save" data-v="' + sh.id + '">Übernehmen</button>' +
      (v && !e.main ? '<button class="btn ghost wide" style="margin-top:8px" data-act="e1-del" data-v="' + sh.id + '">Eigenen Wert entfernen</button>' : '') + close;
  }
  if (sh.t === 'sess') {
    const s = S.sessions.find(x => x.id === sh.id); if (!s) return close;
    return '<p class="eyebrow">' + esc(dlong(s.date)) + (s.n !== null && s.week ? ' · Woche ' + s.week + ' · ' + esc(s.label) : '') + '</p><h2>' + esc(s.name) + '</h2><p class="sub">' + fmtDur(s.dur) + ' · ' + volT(sessionVolume(s)) + ' Volumen</p>' + (s.note ? '<p>' + esc(s.note) + '</p>' : '') +
      s.exercises.map(x => { const e = EX[x.exId]; return '<div style="padding:8px 0;border-top:1px solid var(--line)"><b>' + esc(e ? e.name : x.exId) + '</b> <small>· ' + esc((FEEL.find(f => f[0] === x.feel) || ['', ''])[1]) + '</small><br><small class="num">' + x.sets.map(q => (q.warm ? 'A: ' : '') + fmtSet(e, q)).join(' · ') + '</small></div>'; }).join('') +
      (sh.del ? '<button class="btn danger wide" style="margin-top:12px" data-act="sess-del2" data-v="' + s.id + '">Endgültig löschen</button>' : '<button class="btn ghost wide" style="margin-top:12px" data-act="sess-del1">Einheit löschen</button>') + close;
  }
  if (sh.t === 'run') {
    const r = S.runs.find(x => x.id === sh.id); if (!r) return close;
    return '<p class="eyebrow">' + esc(dlong(r.date)) + '</p><h2>' + esc(r.type) + ' · ' + fmt(r.km) + ' km</h2><div class="stats"><div><small>Dauer</small><b>' + fmtDur(r.sec * 1000) + '</b></div><div><small>Pace</small><b>' + fmtPace(r.sec / r.km).replace(' min/km', '') + '</b><small>min/km</small></div><div><small>Gefühl</small><b>' + esc((FEEL.find(f => f[0] === r.feel) || ['', '–'])[1]) + '</b></div></div>' +
      (r.note ? '<p style="margin-top:10px">' + esc(r.note) + '</p>' : '') +
      (sh.del ? '<button class="btn danger wide" style="margin-top:12px" data-act="run-del2" data-v="' + r.id + '">Endgültig löschen</button>' : '<button class="btn ghost wide" style="margin-top:12px" data-act="run-del1">Lauf löschen</button>') + close;
  }
  if (sh.t === 'end') {
    const a = S.active, all = a.items.reduce((x, it) => x + it.sets.filter(s => !s.warm).length, 0), done = a.items.reduce((x, it) => x + it.sets.filter(s => s.done && !s.warm).length, 0);
    return '<h2>Training beenden?</h2><p>' + done + ' von ' + all + ' Arbeitssätzen abgehakt · ' + fmtDur(Date.now() - a.start) + '</p><p class="hint">Nur abgehakte Sätze werden gespeichert und für die Gewichtsvorschläge genutzt.</p>' +
      '<label class="lab" for="wo-note">Notiz zum Training (optional)</label><textarea id="wo-note" data-in="wonote" placeholder="z. B. schlecht geschlafen, Knie gut">' + esc(a.note || '') + '</textarea>' +
      '<div class="stack" style="margin-top:12px"><button class="btn wide" data-act="wo-save">Speichern</button><button class="btn ghost wide" data-act="close">Weiter trainieren</button>' +
      (sh.drop ? '<button class="btn danger wide" data-act="wo-drop2">Wirklich verwerfen</button>' : '<button class="btn ghost wide" data-act="wo-drop1">Training verwerfen</button>') + '</div>';
  }
  if (sh.t === 'summary') {
    const s = sh.sess, ws = s.exercises.reduce((a, x) => a + workSets(x).length, 0);
    let h = '<p class="eyebrow">Gespeichert</p><h2>' + esc(s.name) + '</h2><div class="stats"><div><small>Dauer</small><b>' + fmtDur(s.dur) + '</b></div><div><small>Arbeitssätze</small><b>' + ws + '</b></div><div><small>Volumen</small><b>' + volT(sessionVolume(s)) + '</b></div></div>';
    if (sh.prs.length) h += '<h3 style="margin-top:14px">Neue Bestwerte</h3><p class="hint">Bei Gewichtsübungen gemessen am geschätzten 1RM.</p>' + sh.prs.map(x => '<div class="exrow"><span>' + esc(EX[x.id].name) + '</span><span class="r">' + fmt(x.v) + ' ' + x.unit + ' <span class="delta">' + (x.prev ? '+' + fmt(Math.round((x.v - x.prev) * 10) / 10) : '') + '</span></span></div>').join('');
    if (sh.ch.length) h += '<h3 style="margin-top:14px">1RM angepasst</h3>' + sh.ch.map(c => '<div class="exrow"><span>' + esc(EX[c.id].name) + '</span><span class="r">' + (c.from ? fkg(c.from) + ' → ' : '') + fkg(c.to) + '</span></div>').join('');
    if (!sh.prs.length && !sh.ch.length) h += '<p style="margin-top:12px">Sauber durchgezogen. Die nächsten Gewichte sind schon berechnet.</p>';
    return h + '<button class="btn wide" style="margin-top:14px" data-act="close">Fertig</button>';
  }
  if (sh.t === 'block') {
    const res = sh.res;
    return '<h2>Block ' + p.block.no + ' ausgewertet</h2><p>Gesteigert wird, wenn du in mindestens 75 % der Einheiten alle Wiederholungen geschafft hast.</p>' +
      (res.length ? res.map(r => '<div class="exrow"><span>' + esc(EX[r.id].name) + (r.ok ? '' : '<br><small>Ziel nicht ganz erreicht, Wert bleibt</small>') + '</span><span class="r">' + fkg(r.start) + ' → ' + fkg(r.to) + ' ' + deltaHTML(pctDelta(r.to, r.start)) + '</span></div>').join('') : '<div class="empty">Keine Grundübungen mit Prozentvorgabe im Block.</div>') +
      '<button class="btn wide" style="margin-top:14px" data-act="block-next">Block ' + (p.block.no + 1) + ' starten</button>' + close;
  }
  if (sh.t === 'plates') {
    const it = S.active.items[sh.i], s = it.sets.find(x => !x.done && !x.warm) || it.sets[0], kg = s.kg || it.plan.kg || 20, pc = plateCalc(kg, 20);
    return '<h2>Scheiben für ' + fkg(kg) + '</h2><p class="sub">Langhantel 20 kg. Pro Seite:</p>' +
      (pc ? '<div class="plates">' + (pc.out.length ? pc.out.map(x => Array.from({length:x[1]}, () => '<span class="plate p' + String(x[0]).split('.')[0] + '">' + fmt(x[0]) + '</span>').join('')).join('') : 'Nur die Stange.') + '</div>' + (pc.rest ? '<p class="hint">Rest von ' + fmt(pc.rest) + ' kg pro Seite lässt sich nicht stecken.</p>' : '') : '<p>Weniger als die Stange (20 kg).</p>') + close;
  }
  if (sh.t === 'gtest') return gtHTML();
  if (sh.t === 'gman') return gManualHTML();
  if (sh.t === 'glist') return gListHTML(sh.type);
  if (sh.t === 'ggoal') { const T = GTESTS[sh.type], g = p.gripGoal[sh.type]; return '<h2>Ziel: ' + T.name + '</h2><p>Setz dir einen Wert bis zum Saisonstart. Die App zeigt den Fortschritt als Balken.</p><div class="fld"><input id="gg-v" inputmode="decimal" value="' + (g ? fmt(g) : '') + '" placeholder="Zielwert"><span>' + T.unit + '</span></div><button class="btn wide" style="margin-top:12px" data-act="g-goal-save" data-v="' + sh.type + '">Speichern</button>' + (g ? '<button class="btn ghost wide" style="margin-top:8px" data-act="g-goal-del" data-v="' + sh.type + '">Ziel entfernen</button>' : '') + close; }
  if (sh.t === 'bgoal') return '<h2>Zielgewicht</h2><div class="fld"><input id="bg-v" inputmode="decimal" value="' + (p.bwGoal ? fmt(p.bwGoal) : '') + '" placeholder="z. B. 80"><span>kg</span></div><p class="hint">Leer lassen und speichern entfernt das Ziel.</p><button class="btn wide" style="margin-top:12px" data-act="bgoal-save">Speichern</button>' + close;
  if (sh.t === 'tr') return trickSheet(sh.id) + close;
  if (sh.t === 'trsug') return '<h2>Sitzt der Trick?</h2><p>In mindestens 3 Sessions gelandet:</p>' + sh.ids.map(id => '<div class="exrow"><span>' + esc(TR[id].name) + '</span><button class="btn sm" data-act="tr-set" data-v="' + id + ':3">Auf „Sitzt“</button></div>').join('') + close;
  if (sh.t === 'trpick') return '<h2>Trick hinzufügen</h2><div class="list">' + TRICKS.filter(t => S.ui.wf2.sel[t.id] === undefined).map(t => '<button class="exitem" data-act="ws-add" data-v="' + t.id + '"><span class="av" style="--c:' + T_AREAS[t.a][1] + '">' + t.lvl + '</span><span class="exm"><b>' + esc(t.name) + '</b><small>' + T_AREAS[t.a][0] + ' · ' + T_STAT[tStat(t.id)][0] + '</small></span></button>').join('') + '</div>' + close;
  if (sh.t === 'wk') { const w = S.wake.find(x => x.id === sh.id); if (!w) return close; return '<p class="eyebrow">' + esc(dlong(w.date)) + '</p><h2>' + esc(w.spot) + (w.min ? ' · ' + w.min + ' min' : '') + '</h2>' + (w.laps ? '<p class="sub">' + w.laps + ' Runden</p>' : '') + (w.note ? '<p>' + esc(w.note) + '</p>' : '') + (w.tricks || []).map(x => '<div class="exrow"><span>' + esc((TR[x.id] || {name:x.id}).name) + '</span><span class="r">' + (x.ok ? 'gelandet' : 'geübt') + '</span></div>').join('') + (sh.del ? '<button class="btn danger wide" style="margin-top:12px" data-act="wk-del2" data-v="' + w.id + '">Endgültig löschen</button>' : '<button class="btn ghost wide" style="margin-top:12px" data-act="wk-del1">Session löschen</button>') + close; }
  if (sh.t === 'phcmp') return photoCmpHTML(sh.ids);
  if (sh.t === 'csv') return csvPreviewHTML(sh.an);
  if (sh.t === 'height') return '<h2>Körpergröße</h2><p class="hint">Für den BMI. Leer lassen entfernt die Angabe.</p><div class="fld"><input id="hg-v" inputmode="numeric" value="' + (p.height || '') + '" placeholder="z. B. 183"><span>cm</span></div><button class="btn wide" style="margin-top:12px" data-act="height-save">Speichern</button>' + close;
  if (sh.t === 'cx') return customHTML(sh.name || '');
  if (sh.t === 'prog') {
    const ap = activeProgram(p);
    return '<h2>Programme</h2><p class="hint">Das aktive Programm bestimmt, welche Pläne die App automatisch vorschlägt.</p><div class="list">' +
      p.programs.map(pg => '<button class="prow" data-act="prog-sel" data-v="' + pg.id + '"><span class="dayc" style="--c:' + (pg.id === ap.id ? 'var(--acc)' : 'var(--soft)') + '">' + (pg.id === ap.id ? I(ICONS.check) : pg.plans.length) + '</span><span class="pt"><b>' + esc(pg.name) + '</b><small>' + pg.plans.map(x => esc(x.name)).join(' · ') + '</small></span></button>').join('') + '</div>' +
      '<label class="lab" for="pg-name">Name des aktiven Programms</label><input type="text" id="pg-name" data-chg="progname" value="' + esc(ap.name) + '">' +
      '<h3 style="margin-top:16px">Neues Programm</h3><div class="list">' + Object.entries(PROG_TPL).map(([k, t]) => '<button class="prow" data-act="prog-tpl" data-v="' + k + '"><span class="dayc" style="--c:var(--soft)">' + I(ICONS.plus) + '</span><span class="pt"><b>' + esc(t.name) + '</b><small>' + esc(t.desc) + '</small></span></button>').join('') + '</div>' +
      (p.programs.length > 1 ? '<div class="row" style="margin-top:14px"><span class="sub">Aktives Programm löschen</span>' + (sh.del ? '<button class="btn sm danger" data-act="prog-del2">Wirklich löschen</button>' : '<button class="btn sm ghost" data-act="prog-del1">Löschen</button>') + '</div>' : '') + close;
  }
  if (sh.t === 'text') return '<h2>' + esc(sh.title) + '</h2><p class="hint">Download ist hier nicht verfügbar. Kopiere den Text und speichere ihn als Datei.</p><textarea id="exptext" readonly style="min-height:200px">' + esc(sh.text) + '</textarea><button class="btn wide" style="margin-top:8px" data-act="copy">Kopieren</button>' + close;
  return close;
}
function renderSheet() {
  const w = $('#sheetwrap');
  if (!S.ui.sheet) { w.hidden = true; w.innerHTML = ''; return; }
  const sc = w.querySelector('.sheet'), top = sc ? sc.scrollTop : 0;
  w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + sheetHTML() + '</div>'; w.hidden = false;
  w.querySelector('.sheet').scrollTop = top;
  bindChart();
}

/* ----- Diagramm-Interaktion ----- */
function bindChart() { document.querySelectorAll('svg.lc').forEach(bindOne); }
function bindOne(svg) {
  if (svg.dataset.b) return; svg.dataset.b = 1;
  const box = svg.closest('.card,.sheet'), pts = JSON.parse(svg.dataset.pts), ro = box && box.querySelector('[data-lro],#lc-ro'), dot = svg.querySelector('.lc-dot'), mk = svg.querySelector('.lc-mk');
  const mv = ev => {
    const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 340;
    let b = pts[0]; pts.forEach(p => { if (Math.abs(p[0] - x) < Math.abs(b[0] - x)) b = p; });
    dot.setAttribute('cx', b[0]); dot.setAttribute('cy', b[1]); mk.setAttribute('x1', b[0]); mk.setAttribute('x2', b[0]); mk.style.display = ''; if (ro) ro.textContent = b[2];
  };
  svg.addEventListener('pointermove', mv); svg.addEventListener('pointerdown', mv);
}

/* ----- Export / Import ----- */
async function offerFile(name, text, title) {
  if (NATIVE && Nat.P) { try { await Nat.share(name, text); } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Teilen nicht möglich: ' + ((e && e.message) || 'Fehler')); } return; }
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({filename:name, data:text}); toast('Datei gespeichert.'); return; }
  } catch (e) { if (e && e.code === 'declined') return; }
  S.ui.sheet = {t:'text', title, text}; renderSheet();
}
function exportJSON() { offerFile('eisenbuch-' + todayStr() + '.json', JSON.stringify({app:'eisenbuch', v:2, p:S.p, sessions:S.sessions, runs:S.runs, grip:S.grip, body:S.body, wake:S.wake}, null, 1), 'Sicherung'); }
function exportCSV() {
  const rows = ['Datum;Einheit;Übung;Satz;Gewicht (kg);Wiederholungen;Aufwärmen;Gefühl'];
  S.sessions.forEach(s => s.exercises.forEach(x => x.sets.forEach((q, i) => rows.push([s.date, s.name, (EX[x.exId] || {name:x.exId}).name, i + 1, fmt(q.kg || 0), q.reps, q.warm ? 'ja' : 'nein', x.feel].join(';')))));
  S.runs.forEach(r => rows.push([r.date, 'Lauf: ' + r.type, 'Laufen', '', '', '', '', r.feel + ' · ' + fmt(r.km) + ' km · ' + fmtDur(r.sec * 1000)].join(';')));
  S.body.forEach(b => rows.push([b.date, 'Körper', 'Körpergewicht', '', fmt(b.kg), '', '', [b.bf ? fmt(b.bf) + ' % KF' : '', b.waist ? fmt(b.waist) + ' cm Taille' : ''].filter(Boolean).join(' · ')].join(';')));
  S.grip.forEach(g => rows.push([g.date, 'Griff-Test', GTESTS[g.type].name, '', fmt(g.kg || (g.l != null ? Math.max(g.l, g.r) : 0)), g.v != null ? g.v : 'L ' + fmt(g.l) + ' / R ' + fmt(g.r), '', ''].join(';')));
  offerFile('eisenbuch-saetze-' + todayStr() + '.csv', '﻿' + rows.join('\n'), 'Sätze als CSV');
}
function importFile(f) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result);
      if (j.app !== 'eisenbuch' || !j.p) throw new Error('x');
      S.p = normProfile(j.p); S.p.upd = Date.now(); S.sessions = j.sessions || []; S.runs = j.runs || []; S.grip = j.grip || []; S.body = j.body || []; S.wake = j.wake || []; S.wake.forEach(w => Cloud.put('wake', w.id, w));
      lsSave(); S.grip.forEach(g => Cloud.put('grip', g.id, g)); S.body.forEach(b => Cloud.put('body', b.id, b)); Cloud.put('meta', 'profile', S.p); S.sessions.forEach(s => Cloud.put('sessions', s.id, s)); S.runs.forEach(r => Cloud.put('runs', r.id, r));
      toast('Sicherung geladen: ' + S.sessions.length + ' Einheiten, ' + S.runs.length + ' Läufe.'); render();
    } catch (e) { toast('Die Datei ist keine Eisenbuch-Sicherung (JSON).'); }
  };
  rd.readAsText(f);
}

/* ----- Planänderungen ----- */
/* Änderungen an Tagen/Programm/Modell: aktuelle Blockwoche beibehalten */
function remapBlock(fn) { changePlan(p => { fn(p); syncDays(p); }); }
function movePlanItem(i, d) { const pl = findPlan(S.p, S.ui.pv), j = i + d; if (j < 0 || j >= pl.items.length) return; const t = pl.items[i]; pl.items[i] = pl.items[j]; pl.items[j] = t; saveProfile(); render(); }
function changePlan(fn) {
  const p = S.p, oldD = p.days.length, wasEnd = p.block.n >= blockSessions(p), wi = Math.floor(p.block.n / oldD);
  fn(p);
  p.block.n = wasEnd ? blockSessions(p) : Math.min(wi, MODELS[p.model].weeks - 1) * p.days.length;
  saveProfile(); render();
}

/* ----- Ereignisse ----- */
const ACT = {
  'ob-next'() { S.ui.ob.step++; render(); window.scrollTo(0, 0); },
  'ob-back'() { S.ui.ob.step--; render(); window.scrollTo(0, 0); },
  'ob-day'(v) { const d = S.ui.ob.d, i = +v, k = d.days.indexOf(i); if (k >= 0) { if (d.days.length > 2) d.days.splice(k, 1); else toast('Mindestens 2 Trainingstage.'); } else if (d.days.length < 6) d.days.push(i); else toast('Höchstens 6 Trainingstage.'); d.days.sort(); if (!S.ui.ob.splitPicked) d.split = resolveSplit({...d, split:'auto'}); render(); },
  'ob-split'(v) { const ob = S.ui.ob, k = v.split(':'); ob.tpl = k[0] === 'tpl' ? k[1] : null; if (!ob.tpl) ob.d.split = k[1]; ob.splitPicked = true; render(); },
  'ob-model'(v) { S.ui.ob.d.model = v; render(); },
  'ob-finish'() {
    const ob = S.ui.ob, d = ob.d;
    MAIN_LIFTS.forEach(id => { const x = obE1(id); if (x) { d.e1[id] = x.v; d.src[id] = x.src; } });
    if (ob.tpl) { if (ob.tpl === 'wake3') d.wake = true; const pg = programFromTemplate(ob.tpl); pg.plans.forEach((pl, i) => { pl.days = d.days[i] !== undefined ? [d.days[i]] : []; }); d.programs = [pg]; d.prog = pg.id; }
    d.done = true; d.block = {n:0, no:1, e1Start:{...d.e1}, started:todayStr()};
    S.p = normProfile(d); S.ui.ob = null; S.tab = 'train'; saveProfile(); render(); window.scrollTo(0, 0);
    toast('Fertig. Dein Training für heute steht ganz oben.');
  },
  tab(v) { if (S.tab === v) { S.ui.pv = null; S.ui.more = null; } S.tab = v; S.ui.wipe = false; S.ui.pedit = false; tryLS(() => localStorage.setItem(LS + '.tab', v)); render(); window.scrollTo(0, 0); },
  'wo-start'() { startWorkout(false); },
  'pl-start'(v) { if (S.active) { S.ui.woMin = false; render(); return; } startWorkout(false, v || undefined); },
  'pl-open'(v) { S.ui.pv = v; S.ui.pedit = false; S.ui.pdel = false; render(); window.scrollTo(0, 0); },
  'pl-back'() { S.ui.pv = null; S.ui.pedit = false; render(); window.scrollTo(0, 0); },
  'pl-edit'() { S.ui.pedit = !S.ui.pedit; S.ui.pdel = false; render(); },
  'pl-new'() { const pg = activeProgram(S.p), pl = {id:pid('pl'), name:'Neuer Plan', days:[], color:PLAN_COLORS[pg.plans.length % PLAN_COLORS.length], items:[]}; pg.plans.push(pl); saveProfile(); S.ui.pv = pl.id; S.ui.pedit = true; render(); window.scrollTo(0, 0); },
  'pl-day'(v) { remapBlock(p => { const pl = findPlan(p, S.ui.pv), i = +v, k = pl.days.indexOf(i); if (k >= 0) pl.days.splice(k, 1); else pl.days.push(i); pl.days.sort(); }); },
  'pl-up'(v) { movePlanItem(+v, -1); },
  'pl-down'(v) { movePlanItem(+v, 1); },
  'pl-rm'(v) { const pl = findPlan(S.p, S.ui.pv); pl.items.splice(+v, 1); saveProfile(); render(); },
  'pl-swap'(v) { const pl = findPlan(S.p, S.ui.pv); openPicker({mode:'plswap', i:+v, m:EX[pl.items[+v].exId].m}); },
  'pl-add'() { openPicker({mode:'pladd'}); },
  'pl-del1'() { S.ui.pdel = true; render(); },
  'pl-del2'() { remapBlock(p => { const pg = activeProgram(p); pg.plans = pg.plans.filter(x => x.id !== S.ui.pv); }); S.ui.pv = null; S.ui.pedit = false; render(); toast('Plan gelöscht.'); },
  'prog-open'() { S.ui.sheet = {t:'prog'}; renderSheet(); },
  'prog-sel'(v) { remapBlock(p => { p.prog = v; }); S.ui.sheet = null; renderSheet(); toast('Aktiv: ' + activeProgram(S.p).name); },
  'prog-tpl'(v) { const pg = programFromTemplate(v); remapBlock(p => { p.programs.push(pg); p.prog = pg.id; }); S.ui.sheet = null; S.ui.pv = null; render(); toast('Programm angelegt: ' + pg.name + (v === 'empty' ? '. Leg jetzt deinen ersten Plan an.' : '')); },
  'prog-del1'() { S.ui.sheet.del = true; renderSheet(); },
  'prog-del2'() { remapBlock(p => { p.programs = p.programs.filter(x => x.id !== p.prog); p.prog = p.programs[0].id; }); S.ui.sheet = null; render(); },
  'more-go'(v) { S.tab = 'more'; S.ui.more = v; render(); window.scrollTo(0, 0); },
  'more-back'() { S.ui.more = null; render(); window.scrollTo(0, 0); },
  'more-close'() { S.ui.more = null; S.tab = 'train'; render(); window.scrollTo(0, 0); },
  sseg(v) { S.ui.sseg = v; render(); },
  bseg(v) { S.ui.bseg = v; render(); },
  'wo-free'() { startWorkout(true); },
  'wo-open'() { S.ui.woMin = false; render(); wake(); },
  'wo-min'() { S.ui.woMin = true; render(); },
  'wo-end'() { S.ui.sheet = {t:'end'}; renderSheet(); },
  'wo-save'() { S.ui.sheet = null; finishWorkout(); },
  'wo-drop1'() { S.ui.sheet.drop = true; renderSheet(); },
  'wo-drop2'() { S.active = null; S.rest = null; S.ui.sheet = null; saveActive(); unwake(); render(); toast('Training verworfen.'); },
  'set-done'(v, t) {
    const it = S.active.items[+t.dataset.i], j = +t.dataset.s, s = it.sets[j], mode = it.plan.mode;
    if (s.done) { s.done = false; S.ui.ws = j; saveActive(); renderWorkout(); return; }
    if (!(s.reps > 0)) { toast('Trag erst die Wiederholungen ein.'); return; }
    if ((mode === 'pct' || mode === 'dp') && !(s.kg > 0)) { toast('Trag erst das Gewicht ein.'); return; }
    s.done = true;
    /* Live-Bestwert wie bei Hevy: nur Gewichtsübungen, einmal pro Übung und Training */
    const ex = EX[it.exId];
    if (!s.warm && !it.prShown && s.kg > 0 && s.reps <= 12 && !ex.t && ex.eq !== 'KG') {
      const hs = history(S.sessions, it.exId), now = roundHalf(EPLEY(s.kg, s.reps));
      if (hs.length && hs[hs.length - 1].unit === 'kg' && now > Math.max(...hs.map(x => x.v)) + 0.4) { it.prShown = true; toast('Neuer Bestwert: ' + ex.name + ', 1RM ≈ ' + fkg(now)); beep(1320, 200); setTimeout(() => beep(1760, 260), 220); Nat.vib(120); }
    }
    for (let k = j + 1; k < it.sets.length; k++) if (!it.sets[k].warm && it.sets[k].kg == null) it.sets[k].kg = s.kg;
    const ii = +t.dataset.i, pa = ssPartner(S.active, ii);
    if (!s.warm) S.rest = {end:Date.now() + restFor(it) * 1000}; else S.rest = {end:Date.now() + 60000};
    /* Supersatz: nach der ersten Übung ohne Pause direkt zur zweiten, nach der zweiten Pause und zurück */
    if (pa !== null && !s.warm) {
      const other = S.active.items[pa], open = other.sets.findIndex(q => !q.done && !q.warm);
      if (it.ss) S.rest = null;
      if (open >= 0 && S.ui.wf != null) { setTimeout(() => { S.ui.wf = pa; S.ui.ws = open; renderWorkout(); const sc = $('#woscroll'); if (sc) sc.scrollTop = 0; }, 350); if (it.ss) toast('Supersatz: weiter mit ' + EX[other.exId].name); }
    }
    if (S.ui.wf != null) { const nx = it.sets.findIndex((q, k) => k > j && !q.done); S.ui.ws = nx >= 0 ? nx : j; if (nx < 0 && woProg(it).done === woProg(it).all) toast(EX[it.exId].name + ' geschafft. Wie lief es?'); }
    saveActive(); renderWorkout(); renderRest();
  },
  'set-add'(v, t) { const it = S.active.items[+t.dataset.i], l = it.sets.filter(s => !s.warm).pop() || it.sets[it.sets.length - 1]; it.sets.push({kg:l ? l.kg : null, reps:l ? l.reps : it.plan.reps, done:false}); saveActive(); renderWorkout(); },
  'set-rm'(v, t) { const it = S.active.items[+t.dataset.i]; it.sets.pop(); saveActive(); renderWorkout(); },
  feel(v, t) { S.active.items[+t.dataset.i].feel = v; saveActive(); renderWorkout(); },
  warm(v, t) { const it = S.active.items[+t.dataset.i], w = it.sets.find(s => !s.warm), kg = (w && w.kg) || it.plan.kg; if (!kg) { toast('Trag erst das Arbeitsgewicht ein.'); return; } it.sets = warmups(kg, EX[it.exId]).concat(it.sets); saveActive(); renderWorkout(); },
  plates(v, t) { S.ui.sheet = {t:'plates', i:+t.dataset.i}; renderSheet(); },
  'w-swap'(v, t) { openPicker({mode:'wswap', i:+t.dataset.i, m:EX[S.active.items[+t.dataset.i].exId].m}); },
  'w-rm'(v, t) { const i = +t.dataset.i; if (S.ui.rmI === i) S.ui.wf = null; if (S.ui.rmI !== i) { S.ui.rmI = i; renderWorkout(); setTimeout(() => { if (S.ui.rmI === i) { S.ui.rmI = null; renderWorkout(); } }, 4000); return; } S.ui.rmI = null; S.active.items.splice(i, 1); saveActive(); renderWorkout(); },
  'w-add'() { openPicker({mode:'wadd'}); },
  'wf-open'(v) { S.ui.wf = +v; S.ui.ws = null; renderWorkout(); const sc = $('#woscroll'); if (sc) sc.scrollTop = 0; },
  'wf-close'() { S.ui.wf = null; renderWorkout(); },
  'wf-go'(v) { if (v === 'list') { S.ui.wf = null; } else { S.ui.wf = +v; S.ui.ws = null; } renderWorkout(); const sc = $('#woscroll'); if (sc) sc.scrollTop = 0; },
  'ws-sel'(v) { S.ui.ws = +v; renderWorkout(); },
  st(v, t) {
    const it = S.active.items[+t.dataset.i], s = it.sets[+t.dataset.s], f = t.dataset.f, d = +t.dataset.d, e = EX[it.exId];
    if (f === 'kg') { const step = e.inc || 2.5, base = s.kg != null ? s.kg : (it.plan.kg || 0); s.kg = Math.max(0, Math.round((base + d * step) * 100) / 100); }
    else { const step = it.plan.mode === 'time' ? 5 : 1, base = s.reps != null ? s.reps : (it.plan.reps || 0); s.reps = Math.max(0, base + d * step); }
    saveActive(); renderWorkout();
  },
  'rest-adj'(v, t) { const it = S.active.items[+t.dataset.i]; S.p.restOv = S.p.restOv || {}; S.p.restOv[it.exId] = Math.max(15, Math.min(600, restFor(it) + (+v))); saveProfile(); renderWorkout(); },
  sper(v) { S.ui.sper = v; render(); },
  wseg(v) { S.ui.wseg = v; render(); },
  'tr-open'(v) { S.ui.sheet = {t:'tr', id:v}; renderSheet(); },
  'tr-cycle'(v) { const s = (tStat(v) + 1) % 4; setTrick(v, s); render(); toast(TR[v].name + ': ' + T_STAT[s][0]); },
  'tr-set'(v) { const [id, s] = v.split(':'); setTrick(id, +s); if (S.ui.sheet && S.ui.sheet.t === 'trsug') { S.ui.sheet.ids = S.ui.sheet.ids.filter(x => x !== id); if (!S.ui.sheet.ids.length) S.ui.sheet = null; } render(); },
  'tr-note'(v) { S.p.tricks = S.p.tricks || {}; S.p.tricks[v] = {...(S.p.tricks[v] || {s:0}), note:$('#tr-note').value.trim()}; saveProfile(); toast('Notiz gespeichert.'); },
  'tr-lvl'(v) { S.ui.tl = +v === 0 || S.ui.tl === +v ? 0 : +v; render(); },
  'tr-area'(v) { S.ui.ta = v; render(); },
  'ws-trick'(v) { const f = S.ui.wf2, c = f.sel[v]; if (c === undefined) f.sel[v] = 'try'; else if (c === 'try') f.sel[v] = 'ok'; else delete f.sel[v]; render(); },
  'ws-more'() { S.ui.sheet = {t:'trpick'}; renderSheet(); },
  'ws-add'(v) { S.ui.wf2.sel[v] = 'try'; S.ui.sheet = null; render(); },
  'ws-save'() { wakeSave(); },
  'wk-open'(v) { S.ui.sheet = {t:'wk', id:v}; renderSheet(); },
  'wk-del1'() { S.ui.sheet.del = true; renderSheet(); },
  'wk-del2'(v) { S.p.tomb.push(v); saveProfile(); S.wake = S.wake.filter(w => w.id !== v); lsSave(); Cloud.del('wake', v); S.ui.sheet = null; render(); toast('Session gelöscht.'); },
  'ph-sel'(v) { const s = S.ui.phSel = S.ui.phSel || [], k = s.indexOf(v); if (k >= 0) s.splice(k, 1); else { s.push(v); if (s.length > 2) s.shift(); } render(); },
  'ph-cmp'() { S.ui.sheet = {t:'phcmp', ids:S.ui.phSel.slice()}; renderSheet(); },
  'ph-del'(v, t) { if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Wirklich löschen?'; return; } PhotoDB.del(v).then(loadPhotos).then(() => { S.ui.phSel = []; S.ui.sheet = null; render(); toast('Foto gelöscht.'); }); },
  'csv-go'() { const n = csvImport(S.ui.sheet.an); S.ui.sheet = null; render(); toast(n + ' Einheiten importiert.'); },
  'pl-ss'(v) { const pl = findPlan(S.p, S.ui.pv), it = pl.items[+v]; it.ss = !it.ss; saveProfile(); render(); toast(it.ss ? 'Supersatz mit der nächsten Übung.' : 'Supersatz aufgehoben.'); },
  'b-all'() { S.ui.ball = true; render(); },
  bper(v) { S.ui.bper = v; render(); },
  cal(v) { S.ui.calM = v; render(); },
  'b-height'() { S.ui.sheet = {t:'height'}; renderSheet(); },
  'height-save'() { const x = parseNum($('#hg-v').value); S.p.height = x > 120 && x < 230 ? Math.round(x) : null; saveProfile(); S.ui.sheet = null; render(); },
  'p-swap'(v) { const tid = v.split(':')[0], i = +v.split(':')[1]; openPicker({mode:'pswap', key:v, m:EX[templateIds(S.p, tid)[i]].m}); },
  pick(v) {
    const sh = S.ui.sheet, a = S.active;
    if (sh.mode === 'pswap') { S.p.swaps[sh.key] = v; saveProfile(); toast('Getauscht: ' + EX[v].name); }
    else if (sh.mode === 'pladd') { findPlan(S.p, S.ui.pv).items.push({exId:v}); saveProfile(); toast(EX[v].name + ' hinzugefügt.'); }
    else if (sh.mode === 'plswap') { findPlan(S.p, S.ui.pv).items[sh.i].exId = v; saveProfile(); toast('Getauscht: ' + EX[v].name); }
    else if (sh.mode === 'wswap') { const old = a.items[sh.i]; a.items[sh.i] = itemFromPlan(exPlan(S.p, v, old.plan.slot, a.pr, S.sessions)); saveActive(); }
    else if (sh.mode === 'wadd') { a.items.push(itemFromPlan(exPlan(S.p, v, a.items.length, a.pr, S.sessions))); saveActive(); }
    S.ui.sheet = null; render();
    if (sh.mode === 'wadd') setTimeout(() => { const sc = $('#woscroll'); if (sc) sc.scrollTop = sc.scrollHeight; }, 30);
  },
  pm(v) { S.ui.pm = v; renderSheet(); },
  mf(v) { S.ui.mf = v; render(); },
  'ex-open'(v) { S.ui.sheet = {t:'ex', id:v}; renderSheet(); },
  'e1-edit'(v) { S.ui.sheet = {t:'e1', id:v}; renderSheet(); },
  'e1-save'(v) {
    const kg = parseNum($('#e1-kg').value), r = parseNum($('#e1-r').value) || 1;
    if (!(kg > 0) || r < 1 || r > 12) { toast('Gewicht eintragen, Wiederholungen zwischen 1 und 12.'); return; }
    S.p.e1[v] = roundHalf(EPLEY(kg, r)); S.p.src[v] = 'test'; S.p.adj[v] = 0; if (!S.p.block.e1Start[v]) S.p.block.e1Start[v] = S.p.e1[v];
    saveProfile(); S.ui.sheet = null; render(); toast('1RM ' + EX[v].name + ': ' + fkg(S.p.e1[v]));
  },
  'e1-del'(v) { delete S.p.e1[v]; delete S.p.adj[v]; saveProfile(); S.ui.sheet = null; render(); },
  'p-day'(v) { changePlan(p => { const i = +v, k = p.days.indexOf(i); if (k >= 0) { if (p.days.length > 2) p.days.splice(k, 1); else toast('Mindestens 2 Trainingstage.'); } else if (p.days.length < 6) p.days.push(i); p.days.sort(); }); },
  'p-split'(v) { changePlan(p => { p.split = v; }); },
  'p-model'(v) { changePlan(p => { p.model = v; }); },
  'block-close'() { S.ui.sheet = {t:'block', res:closeBlock(S.p, S.sessions)}; renderSheet(); },
  'block-next'() { startNextBlock(S.p, S.ui.sheet.res); saveProfile(); S.ui.sheet = null; render(); toast('Block ' + S.p.block.no + ' gestartet.'); },
  'block-restart'(v, t) {
    if (!S.ui.restart) { S.ui.restart = true; t.textContent = 'Wirklich neu starten'; t.classList.add('danger'); return; }
    S.ui.restart = false; S.p.block = {n:0, no:S.p.block.no + 1, e1Start:{...S.p.e1}, started:todayStr()}; saveProfile(); render(); toast('Block ' + S.p.block.no + ' beginnt mit Woche 1.');
  },
  'sess-open'(v) { S.ui.sheet = {t:'sess', id:v}; renderSheet(); },
  'sess-del1'() { S.ui.sheet.del = true; renderSheet(); },
  'sess-del2'(v) {
    const s = S.sessions.find(x => x.id === v), isLast = S.sessions[S.sessions.length - 1] === s, p = S.p;
    let msg = 'Einheit gelöscht.';
    if (s && isLast && s.before && s.before.no === p.block.no) { p.e1 = {...s.before.e1}; p.adj = {...s.before.adj}; p.block.n = s.before.n; msg = 'Einheit gelöscht. Gewichte und Blockstand sind zurückgesetzt.'; }
    else if (s && s.n !== null) msg = 'Einheit gelöscht. Ältere Einheit: 1RM und Blockstand bleiben unverändert.';
    p.tomb.push(v); S.sessions = S.sessions.filter(x => x.id !== v); saveProfile(); Cloud.del('sessions', v); S.ui.sheet = null; render(); toast(msg);
  },
  'run-open'(v) { S.ui.sheet = {t:'run', id:v}; renderSheet(); },
  'run-del1'() { S.ui.sheet.del = true; renderSheet(); },
  'run-del2'(v) { S.p.tomb.push(v); saveProfile(); S.runs = S.runs.filter(r => r.id !== v); lsSave(); Cloud.del('runs', v); S.ui.sheet = null; render(); toast('Lauf gelöscht.'); },
  'rt-start'() { S.runT.run = true; S.runT.start = Date.now(); saveRunT(); wake(); render(); },
  'rt-pause'() { S.runT.acc += Date.now() - S.runT.start; S.runT.run = false; saveRunT(); render(); },
  'rt-stop'() { const el = runElapsed(); S.runT = {run:false, start:0, acc:0}; saveRunT(); unwake(); S.ui.rf.dur = fmtDur(el); S.ui.rf.date = todayStr(); render(); const k = $('#rf-km'); if (k) k.focus(); },
  'rf-feel'(v) { S.ui.rf.feel = v; render(); },
  'run-save'() {
    const f = S.ui.rf, km = parseNum(f.km), sec = parseDur(f.dur);
    if (!(km > 0) || !(sec > 0)) { toast('Distanz in km und Dauer eintragen, z. B. 5,2 und 28:30.'); return; }
    const r = {id:uid('r'), date:f.date || todayStr(), t:parseD(f.date || todayStr()).getTime() + (Date.now() % 86400000), km:Math.round(km * 100) / 100, sec, type:f.type, feel:f.feel, note:f.note.trim()};
    S.runs.push(r); S.runs.sort((a, b) => a.t - b.t); saveRun(r); S.ui.rf = null; render(); toast('Lauf gespeichert: ' + fmt(r.km) + ' km in ' + fmtDur(sec * 1000) + '.');
  },
  'rest-15m'() { S.rest.end -= 15000; renderRest(); },
  'rest-15p'() { S.rest.end += 15000; renderRest(); },
  'rest-skip'() { S.rest = null; renderRest(); },
  bar(v, t) { const c = t.closest('.card'), ro = c && c.querySelector('[data-ro]'); if (ro) ro.textContent = t.dataset.tip; },
  'exp-json'() { exportJSON(); },
  hseg(v) { S.ui.hseg = v; render(); },
  'b-save'() { bodySaveAct(); },
  'b-quick'() { S.tab = 'body'; S.ui.bseg = ''; S.ui.bf = {date:todayStr()}; render(); window.scrollTo(0, 0); setTimeout(() => { const k = $('#bf-kg'); if (k) k.focus(); }, 50); },
  'b-del'(v, t) { if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Sicher?'; t.style.color = 'var(--heavy)'; return; } S.p.tomb.push(v); saveProfile(); S.body = S.body.filter(b => b.id !== v); lsSave(); Cloud.del('body', v); render(); },
  'b-goal'() { S.ui.sheet = {t:'bgoal'}; renderSheet(); },
  'bgoal-save'() { const x = parseNum($('#bg-v').value); S.p.bwGoal = x > 30 ? x : null; saveProfile(); S.ui.sheet = null; render(); },
  'exnote-save'(v) { const t = $('#exnote').value.trim(); if (t) S.p.exNotes[v] = t; else delete S.p.exNotes[v]; saveProfile(); toast('Notiz gespeichert. Sie erscheint im Training bei dieser Übung.'); },
  'cx-new'(v) { S.ui.cxAfter = v === 'pick' ? S.ui.sheet : null; S.ui.sheet = {t:'cx', name:v === 'pick' ? S.ui.pq : ''}; renderSheet(); },
  'cx-save'() {
    const id = customSave(); if (!id) return;
    const after = S.ui.cxAfter; S.ui.cxAfter = null;
    if (after) { S.ui.sheet = after; ACT.pick(id); toast('Übung angelegt und übernommen: ' + EX[id].name); }
    else { S.ui.sheet = null; render(); toast('Übung angelegt: ' + EX[id].name); }
  },
  'cx-del'(v, t) { if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Wirklich löschen?'; return; } const c = S.p.custom.find(x => x.id === v); if (c) c.hidden = true; const i = EXLIST.findIndex(e => e.id === v); if (i >= 0) EXLIST.splice(i, 1); saveProfile(); S.ui.sheet = null; render(); toast('Übung gelöscht. Alte Einträge bleiben erhalten.'); },
  async remind() {
    if (!S.p.remind.on) { const ok = await Nat.perm(); if (!ok) { toast('Benachrichtigungen sind für Eisenbuch blockiert. In den Android-Einstellungen erlauben.'); return; } }
    S.p.remind.on = !S.p.remind.on; saveProfile(); render(); Nat.reschedule(); toast(S.p.remind.on ? 'Erinnerungen an. Die nächsten 4 Wochen sind geplant.' : 'Erinnerungen aus.');
  },
  'g-start'() { gtStart(); },
  'g-go'() { const kg = $('#gt-kg'); if (kg) S.gt.kg = kg.value; gtGo(); },
  'g-stop'() { gtStop(); },
  'g-save'() { gtSave(); },
  'g-skip-pause'() { S.gt.st = 'idle'; clearInterval(GT.timer); renderSheet(); },
  'g-close'() { clearInterval(GT.timer); S.gt = null; S.ui.sheet = null; render(); },
  'g-manual'() { S.ui.gm = null; S.ui.sheet = {t:'gman'}; renderSheet(); },
  'gm-save'() { gmSave(); },
  'g-set'(v) { const s = S.p.gripSet, k = s.indexOf(v); if (k >= 0) { if (s.length > 1) s.splice(k, 1); else toast('Mindestens ein Test im Paket.'); } else s.push(v); saveProfile(); render(); },
  'g-wake'() { S.p.wake = !S.p.wake; saveProfile(); render(); toast(S.p.wake ? 'Wakeboard-Fokus an: Griff-Finisher ab der nächsten Einheit.' : 'Wakeboard-Fokus aus.'); },
  'g-goal'(v) { S.ui.sheet = {t:'ggoal', type:v}; renderSheet(); },
  'g-goal-save'(v) { const x = parseNum($('#gg-v').value); if (!(x > 0)) { toast('Zielwert eintragen.'); return; } S.p.gripGoal[v] = x; saveProfile(); S.ui.sheet = null; render(); },
  'g-goal-del'(v) { delete S.p.gripGoal[v]; saveProfile(); S.ui.sheet = null; render(); },
  'g-list'(v) { S.ui.sheet = {t:'glist', type:v}; renderSheet(); },
  'g-del'(v, t) { if (t.dataset.sure !== '1') { t.dataset.sure = '1'; t.textContent = 'Sicher?'; t.style.color = 'var(--heavy)'; return; } S.p.tomb.push(v); saveProfile(); S.grip = S.grip.filter(g => g.id !== v); lsSave(); Cloud.del('grip', v); renderSheet(); render(); },
  'exp-csv'() { exportCSV(); },
  wipe1() { S.ui.wipe = true; render(); },
  wipe2() {
    S.sessions.forEach(s => Cloud.del('sessions', s.id)); S.runs.forEach(r => Cloud.del('runs', r.id)); Cloud.del('meta', 'profile');
    S.grip.forEach(g => Cloud.del('grip', g.id));
    S.body.forEach(b => Cloud.del('body', b.id)); S.wake.forEach(w => Cloud.del('wake', w.id));
    S.p = null; S.sessions = []; S.runs = []; S.grip = []; S.body = []; S.wake = []; S.active = null; S.ui = {}; S.runT = {run:false, start:0, acc:0}; saveRunT(); S.tab = 'train'; tryLS(() => { localStorage.removeItem(LS); localStorage.removeItem(LS + '.active'); }); render();
  },
  copy() { const ta = $('#exptext'); try { navigator.clipboard.writeText(ta.value).then(() => toast('Kopiert.'), () => { ta.select(); }); } catch (e) { ta.select(); } },
  close() { if (S.gt) { clearInterval(GT.timer); S.gt = null; } S.ui.sheet = null; renderSheet(); }
};
document.addEventListener('click', ev => {
  audioUnlock();
  const w = $('#sheetwrap'); if (ev.target === w) { if (S.ui.sheet && S.ui.sheet.t === 'gtest') return; S.ui.sheet = null; renderSheet(); return; }
  const t = ev.target.closest('[data-act]'); if (!t) return;
  const f = ACT[t.dataset.act]; if (f) { ev.preventDefault(); f(t.dataset.v, t); }
});
document.addEventListener('pointerover', ev => { const t = ev.target.closest && ev.target.closest('[data-act=bar]'); if (t) ACT.bar(null, t); });
document.addEventListener('input', ev => {
  const t = ev.target, k = t.dataset.in; if (!k) return;
  if (k === 'kg' || k === 'reps') {
    const it = S.active.items[+t.dataset.i], s = it.sets[+t.dataset.s], v = parseNum(t.value);
    s[k] = v === null ? null : (k === 'reps' ? Math.round(v) : v); saveActive(); return;
  }
  if (k === 'ws') { S.ui.wf2[t.dataset.f] = t.value; return; }
  if (k === 'wonote') { S.active.note = t.value; saveActive(); return; }
  if (k === 'q') { S.ui.q = t.value; $('#exlist').innerHTML = exListHTML(S.ui.q, S.ui.mf, 'ex-open'); return; }
  if (k === 'pq') { S.ui.pq = t.value; $('#picklist').innerHTML = exListHTML(S.ui.pq, S.ui.pm, 'pick'); return; }
  if (k === 'rf') { S.ui.rf[t.dataset.f] = t.value; const pe = $('#rf-pace'); if (pe) pe.textContent = runPreview(); return; }
  if (k === 'e1p') { const kg = parseNum($('#e1-kg').value), r = parseNum($('#e1-r').value) || 1; $('#e1-pre').textContent = kg > 0 && r <= 12 ? '1RM = ' + fkg(roundHalf(EPLEY(kg, r))) : 'Gewicht eintragen, bis 12 Wiederholungen.'; return; }
  if (k === 'ob') {
    const f = t.dataset.f, ob = S.ui.ob;
    if (f === 'time') ob.d.time = t.value;
    else if (f === 'minutes') ob.d.minutes = +t.value;
    else if (f === 'bw') ob.d.bw = parseNum(t.value);
    else { const [a, id] = f.split(':'); ob[a][id] = t.value; }
    MAIN_LIFTS.forEach(id => { const el = $('#obe-' + id); if (el) el.textContent = obEst(id); });
  }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.id === 'imp' && t.files && t.files[0]) { importFile(t.files[0]); t.value = ''; return; }
  if (t.id === 'ph-in' && t.files && t.files[0]) { addPhoto(t.files[0]); t.value = ''; return; }
  if (t.id === 'csv-in' && t.files && t.files[0]) { const rd = new FileReader(); rd.onload = () => { S.ui.sheet = {t:'csv', an:csvAnalyze(String(rd.result))}; renderSheet(); }; rd.readAsText(t.files[0]); t.value = ''; return; }
  const c = t.dataset.chg; if (!c) return;
  if (c === 'time') { S.p.time = t.value; saveProfile(); }
  if (c === 'minutes') { S.p.minutes = +t.value; saveProfile(); render(); }
  if (c === 'lead') { S.p.remind.lead = +t.value; saveProfile(); Nat.reschedule(); }
  if (c === 'bfdate') { S.ui.bf.date = t.value; render(); }
  if (c === 'gripEvery') { S.p.gripEvery = +t.value; saveProfile(); render(); }
  if (c === 'season') { S.p.season = t.value; saveProfile(); render(); }
  if (c === 'plname') { const pl = findPlan(S.p, t.dataset.v); if (pl && t.value.trim()) { pl.name = t.value.trim(); saveProfile(); render(); } }
  if (c === 'progname') { if (t.value.trim()) { activeProgram(S.p).name = t.value.trim(); saveProfile(); render(); } }
  if (c === 'phdate') { S.ui.phDate = t.value; }
  if (c === 'phpose') { S.ui.phPose = t.value; }
  if (c === 'gmtype') { S.ui.gm.type = t.value; renderSheet(); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (S.active && !S.ui.woMin || S.runT.run)) wake(); });

/* ----- Rendern ----- */
function render() {
  const ob = !S.p || !S.p.done;
  $('#tabs').hidden = ob;
  const V = {train:() => S.ui.pv ? vPlanDetail(S.ui.pv) : vTrain(), stats:vStats, hist:vHist, body:vBodyTab, wake:vWake, more:vMore};
  $('#view').innerHTML = ob ? vOnboard() : (V[S.tab] || V.train)();
  $('#tabs').innerHTML = TABS.map(t => '<button data-act="tab" data-v="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '><span class="ti">' + I(ICONS[t[0]]) + '</span><span>' + t[1] + '</span></button>').join('');
  renderWorkout(); renderSheet(); renderRest(); bindChart();
  if (!render.ok) { render.ok = true; console.log('EB_READY'); }
}
setInterval(() => {
  if (S.active) document.querySelectorAll('[data-clock=wo]').forEach(e => { e.textContent = fmtDur(Date.now() - S.active.start); });
  if (S.runT.run) document.querySelectorAll('[data-clock=run]').forEach(e => { e.textContent = fmtDur(runElapsed()); });
  if (S.rest) renderRest();
}, 500);

/* Einheiten aus Version 1.x (nur tplId) dem passenden Plan zuordnen */
function linkOldSessions() {
  if (!S.p || !S.p.programs) return;
  S.sessions.forEach(s => { if (s.planId || !s.tplId || !TPL[s.tplId]) return; for (const pg of S.p.programs) { const pl = pg.plans.find(x => x.name === TPL[s.tplId].name); if (pl) { s.planId = pl.id; break; } } });
}
Nat.init();
lsLoad();
linkOldSessions();
/* Einmalig: Wakeboard-Programm hinzufügen und aktivieren (Wunsch aus Version 1.8) */
if (S.p && S.p.done && (S.p.v || 1) < 2) {
  const pg = programFromTemplate('wake3');
  S.p.v = 2; S.p.wake = true;
  remapBlock(p => { p.programs.push(pg); p.prog = pg.id; });
  setTimeout(() => toast('Neu: „' + pg.name + '“ ist aktiv. Wechseln über „Programm“.'), 600);
}
S.tab = tryLS(() => localStorage.getItem(LS + '.tab')) || 'today';
/* alte Bereichsnamen aus Version 1.x */
({today:() => { S.tab = 'train'; }, plan:() => { S.tab = 'more'; S.ui.more = 'peri'; }, grip:() => { S.tab = 'wake'; S.ui.wseg = 'grip'; }, run:() => { S.tab = 'more'; S.ui.more = 'run'; }, ex:() => { S.tab = 'stats'; S.ui.sseg = 'ex'; }}[S.tab] || (() => {}))();
render();
if (S.ui.bseg === 'grip') { S.ui.bseg = ''; }
if (NATIVE) {
  /* Falls der WebView-Speicher leer ist (z. B. nach Wiederherstellung), Sicherungsdatei laden */
  if (!S.p) Nat.loadBackup().then(j => { if (j && j.p) { S.p = normProfile(j.p); S.sessions = j.sessions || []; S.runs = j.runs || []; S.grip = j.grip || []; S.body = j.body || []; lsSave(); render(); toast('Daten aus der Sicherungsdatei wiederhergestellt.'); } Nat.reschedule(); });
  else Nat.reschedule();
} else Cloud.init().then(c => { if (c) mergeCloud(c); cloudBadge(); });
