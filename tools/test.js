/* Logik-Tests ohne Browser: simuliert zwei komplette Blöcke für jedes Modell und jeden Split */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const code = fs.readFileSync(path.join(__dirname, '../src/logic.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '../src/plans.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '../src/records.js'), 'utf8').replace("'use strict';", '') + fs.readFileSync(path.join(__dirname, '../src/volume.js'), 'utf8').replace("'use strict';", '') +
  ';globalThis.T={EX,EXLIST,TPL,SPLITS,MODELS,MAIN_LIFTS,GRIP_ROT,defaultProfile,buildWorkout,PROG_TPL,programFromTemplate,ensurePrograms,nextPlan,activeProgram,blockSessions,applyProgress,closeBlock,startNextBlock,estimateFromBW,EPLEY,plateCalc,warmups,recordsOf,newRecords,sessRecords,recordEvents,prepPr,volEvaluate,applyVol,sweetSpot,plateaus,mondayOf,addDays,todayStr};';
const ctx = {console, Intl, Math, Date}; vm.createContext(ctx); vm.runInContext(code, ctx); const T = ctx.T;
for (const t of Object.values(T.TPL)) t.ex.forEach(id => assert(T.EX[id], 'Übung fehlt: ' + id));
T.GRIP_ROT.forEach(id => assert(T.EX[id], 'Griff-Übung fehlt: ' + id));
T.EXLIST.forEach(e => e.base && assert(T.EX[e.base], 'Basis fehlt: ' + e.id));
let n = 0;
for (const model of Object.keys(T.MODELS)) for (const split of Object.keys(T.SPLITS)) for (const d of [2, 3, 4, 5, 6]) {
  const p = T.defaultProfile(); Object.assign(p, {model, split, days: [0, 1, 2, 3, 4, 5].slice(0, d), wake: true, done: true});
  p.e1 = T.estimateFromBW(80); p.block.e1Start = {...p.e1};
  const sessions = [], start = p.e1.bankdruecken;
  for (let blk = 0; blk < 2; blk++) {
    for (let i = 0; i < T.blockSessions(p); i++) {
      T.ensurePrograms(p); const pls = T.activeProgram(p).plans; /* Pläne rotieren, unabhängig vom heutigen Wochentag */
      const w = T.buildWorkout(p, sessions, i, pls[i % pls.length].id); assert(w, 'kein Training ' + model + split + d + ' #' + i);
      w.items.forEach(it => { assert(isFinite(it.sets) && it.sets > 0); if (it.mode === 'pct') assert(it.kg >= 2 && it.kg < 400, 'Gewicht ' + it.kg); });
      const ex = w.items.map(it => ({exId: it.exId, plan: it, feel: 'ok', sets: Array.from({length: it.sets}, () => ({kg: it.kg || 0, reps: it.reps, done: true}))}));
      const s = {id: 's' + sessions.length, date: '2026-10-17', start: sessions.length, exercises: ex, block: p.block.no, deload: w.pr.deload};
      T.applyProgress(p, s); sessions.push(s); p.block.n++; n++;
    }
    T.startNextBlock(p, T.closeBlock(p, sessions));
  }
  const gain = p.e1.bankdruecken / start - 1;
  assert(gain > 0 && gain < 0.15, `Bankdrücken-Steigerung nach 2 Blöcken unplausibel (${model}/${split}/${d}): ${(gain * 100).toFixed(1)} %`);
}
for (const k of Object.keys(T.PROG_TPL)) { const pg = T.programFromTemplate(k); pg.plans.forEach(pl => assert(pl.items.length || k === 'empty', 'Vorlage leer: ' + k)); T.PROG_TPL[k].plans.forEach(x => Array.isArray(x[2]) && x[2].forEach(id => assert(T.EX[id], 'Vorlagen-Übung fehlt: ' + id))); }
{ const p = T.defaultProfile(); p.days = [0, 2, 4]; T.ensurePrograms(p); assert.strictEqual(T.activeProgram(p).plans.length, 3); assert(T.nextPlan(p, []).plan, 'keine Auto-Auswahl'); }
{ const p = T.defaultProfile(); p.programs = [T.programFromTemplate('old')]; p.prog = p.programs[0].id; T.ensurePrograms(p); assert.strictEqual(p.days.join(), '0,2,4'); const w = T.buildWorkout(p, [], 0, p.programs[0].plans[2].id); assert.strictEqual(w.name, 'Lower FB'); }
assert.strictEqual(Math.round(T.EPLEY(100, 5) * 10) / 10, 116.7);
assert.deepStrictEqual(JSON.parse(JSON.stringify(T.plateCalc(100))).out, [[25, 1], [15, 1]]);
console.log('OK:', T.EXLIST.length, 'Übungen,', n, 'simulierte Einheiten, alle Prüfungen bestanden');
/* Autoregulation: Plan 70 kg × 10, tatsächlich 80 kg × 10 bei „passend“ → 1RM steigt (max. +10 %), Folgewochen schwerer */
{
  const mk = () => { const p = T.defaultProfile(); Object.assign(p, {model:'linear', split:'fullbody', days:[0, 2, 4], done:true}); p.e1 = {bankdruecken:100}; p.block.e1Start = {...p.e1}; p.adj = {}; return p; };
  const run = (p, kg, reps, feel, plan) => T.applyProgress(p, {exercises:[{exId:'bankdruecken', feel, plan:plan || {mode:'pct', kg:70, reps:10, sets:4, pct:0.7}, sets:Array.from({length:4}, () => ({kg, reps, done:true}))}]});
  let p = mk(); run(p, 70, 10, 'ok'); assert.strictEqual(p.e1.bankdruecken, 100, 'Plan erfüllt darf 1RM nicht ändern');
  p = mk(); const ch = run(p, 80, 10, 'ok'); assert.strictEqual(p.e1.bankdruecken, 110, '80 statt 70 kg: 1RM +10 % erwartet, ist ' + p.e1.bankdruecken); assert(ch[0].to === 110);
  T.ensurePrograms(p); const pb = T.activeProgram(p).plans.find(pl => pl.items.some(it => it.exId === 'bankdruecken')); const w2 = T.buildWorkout(p, [], 3, pb.id); const b2 = w2.items.find(it => it.exId === 'bankdruecken'); assert(b2 && b2.kg === 82.5, 'Woche 2 sollte 82,5 kg (75 % von 110) vorgeben, ist ' + (b2 && b2.kg));
  p = mk(); run(p, 70, 10, 'easy'); assert(p.e1.bankdruecken > 100 && p.e1.bankdruecken < 105, 'Leicht bei Plan: kleine Steigerung, ist ' + p.e1.bankdruecken);
  p = mk(); const odd = run(p, 700, 10, 'ok'); assert.strictEqual(p.e1.bankdruecken, 100, 'Tippfehler darf 1RM nicht ändern'); assert(odd[0].odd);
  p = mk(); run(p, 70, 6, 'hard'); assert.strictEqual(p.e1.bankdruecken, 100, 'eine schwache Einheit senkt nicht'); run(p, 70, 6, 'hard'); assert(p.e1.bankdruecken < 100 && p.e1.bankdruecken >= 90, 'zwei schwache Einheiten senken moderat, ist ' + p.e1.bankdruecken);
}
console.log('OK: Autoregulation (Mehrleistung, Tippfehler, zwei schwache Einheiten)');

/* Einstiegsphase: 3 Wochen, 1 → 2 → 3 Sätze bei 60 → 70 %, zählt nicht zum Block */
{
  const p = T.defaultProfile(); Object.assign(p, {model:'linear', split:'fullbody', days:[0, 2, 4], done:true}); p.e1 = {kniebeuge:100, bankdruecken:100, kreuzheben:100, ohp:60, 'lh-rudern':80}; T.ensurePrograms(p);
  p.prep = {on:true, weeks:3, n:0};
  const exp = [[1, 0.60], [2, 0.65], [3, 0.70]];
  for (let wk = 0; wk < 3; wk++) for (let d = 0; d < 3; d++) {
    const w = T.buildWorkout(p, [], 0); const sq = w.items.find(it => it.mode === 'pct');
    assert(w.pr.prep, 'Einstieg erwartet'); assert.strictEqual(sq.sets, exp[wk][0], 'Woche ' + (wk + 1) + ': Sätze'); assert.strictEqual(w.pr.pct, exp[wk][1]);
    p.prep.n++;
  }
  assert.strictEqual(p.block.n, 0, 'Einstieg darf den Block nicht weiterzählen');
  p.prep.on = false; const w = T.buildWorkout(p, [], 0); assert(!w.pr.prep && w.pr.pct === 0.70 && w.pr.week === 1, 'danach Block-Woche 1');
  const one = T.buildWorkout(p, [], 0, null, {prep:true}); assert(one.pr.prep && one.items.find(it => it.mode === 'pct').sets === 2, 'einzelne Vorbereitung: 2 Sätze');
}
{ /* Einstieg: 80 kg × 8 statt Plan 60 kg × 8 → 1RM nach echter Leistung (≈ 105 kg), nicht nach Planverhältnis, kein Tippfehler */
  const p = T.defaultProfile(); p.e1 = {bankdruecken:100}; p.adj = {};
  const ch = T.applyProgress(p, {prep:true, exercises:[{exId:'bankdruecken', feel:'ok', plan:{mode:'pct', kg:60, reps:8, sets:1}, sets:[{kg:80, reps:8, done:true}]}]});
  assert(!ch.some(c => c.odd) && p.e1.bankdruecken >= 104 && p.e1.bankdruecken <= 106, 'Einstieg-Mehrleistung: ' + p.e1.bankdruecken);
}
console.log('OK: Einstiegsphase');
/* Rekorde: erstes Training kein Rekord; Gewicht und Satz-Volumen getrennt */
{
  const S1 = {date:'2026-10-01', start:1, exercises:[{exId:'bankdruecken', sets:[{kg:60, reps:8, done:true}, {kg:65, reps:5, done:true}]}]};
  const S2 = {date:'2026-10-08', start:2, exercises:[{exId:'bankdruecken', sets:[{kg:62.5, reps:8, done:true}]}]};
  assert.strictEqual(T.sessRecords([], S1).length, 0, 'erstes Training: keine Rekorde');
  const r = T.sessRecords([S1], S2), ks = r.map(x => x.k).sort().join();
  assert.strictEqual(ks, 'e1,vol', 'Satz 62,5×8: bester Satz und 1RM, aber nicht höchstes Gewicht (65 kg), ist ' + ks);
  const nr = T.newRecords(T.EX.bankdruecken, T.recordsOf([S1, S2], 'bankdruecken'), {kg:67.5, reps:3, done:true});
  assert(nr.some(x => x.k === 'kg' && x.v === 67.5) && !nr.some(x => x.k === 'vol'), '67,5×3: Gewichtsrekord, kein Volumenrekord');
  assert.strictEqual(T.recordEvents([S1, S2]).length, 2);
}
console.log('OK: Rekorde');

/* Volumensteuerung: Plateau → +1 Satz; Fortschritt → bleibt; Topsatz in der Peak-Woche */
{
  const mk = grow => { const ss = [], mon = T.mondayOf(T.todayStr()); for (let w = 8; w >= 1; w--) for (const d of [0, 3]) { const date = T.addDays(mon, -7 * w + d), kg = grow ? 60 + (8 - w) * 2.5 : 60; ss.push({date, start:ss.length, exercises:[{exId:'bankdruecken', feel:'ok', sets:[{kg, reps:8, done:true}, {kg, reps:8, done:true}, {kg, reps:8, done:true}]}]}); } return ss; };
  let p = T.defaultProfile(); let ch = T.volEvaluate(p, mk(false));
  assert(ch.some(c => c.m === 'Brust' && c.to === 1), 'Plateau sollte +1 Satz Brust geben: ' + JSON.stringify(ch));
  assert.strictEqual(T.volEvaluate(p, mk(false)).length, 0, 'nur einmal pro Woche');
  p = T.defaultProfile(); ch = T.volEvaluate(p, mk(true)); assert(!ch.some(c => c.m === 'Brust'), 'Fortschritt: Volumen bleibt');
  const it = [{exId:'bankdruecken', mode:'pct', sets:3}, {exId:'bd-kh', mode:'dp', sets:3}]; p.vol = {Brust:1}; T.applyVol(p, it, {deload:false});
  assert(it[0].sets === 4 && it[1].sets === 3, 'nur erste Brustübung +1');
  assert(T.plateaus(mk(false)).some(x => x.id === 'bankdruecken'), 'Plateau erkannt');
  const q = T.defaultProfile(); Object.assign(q, {model:'linear', days:[0, 2, 4], done:true}); q.e1 = {bankdruecken:100, kniebeuge:100, kreuzheben:100, ohp:60, 'lh-rudern':80}; T.ensurePrograms(q);
  const pb = T.activeProgram(q).plans.find(pl => pl.items.some(x => x.exId === 'bankdruecken')), w5 = T.buildWorkout(q, [], 12, pb.id), b = w5.items.find(x => x.exId === 'bankdruecken');
  assert(b.spec && b.spec[0].kg === 90 && b.spec[0].reps === 3 && b.spec[1].kg === 80 && b.spec[1].reps === 5, 'Topsatz 90 × 3, Back-off 80 × 5');
  q.adj = {}; T.applyProgress(q, {exercises:[{exId:'bankdruecken', feel:'ok', plan:{mode:'pct', kg:90, reps:3, sets:3, top:true}, sets:[{kg:90, reps:3, done:true}, {kg:80, reps:5, done:true}, {kg:80, reps:5, done:true}]}]});
  assert.strictEqual(q.e1.bankdruecken, 100, 'Topsatz nach Plan bestätigt das 1RM');
}
console.log('OK: Volumensteuerung, Plateau, Topsatz');
