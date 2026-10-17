/* Logik-Tests ohne Browser: simuliert zwei komplette Blöcke für jedes Modell und jeden Split */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const code = fs.readFileSync(path.join(__dirname, '../src/logic.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '../src/plans.js'), 'utf8') +
  ';globalThis.T={EX,EXLIST,TPL,SPLITS,MODELS,MAIN_LIFTS,GRIP_ROT,defaultProfile,buildWorkout,PROG_TPL,programFromTemplate,ensurePrograms,nextPlan,activeProgram,blockSessions,applyProgress,closeBlock,startNextBlock,estimateFromBW,EPLEY,plateCalc,warmups};';
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
      const w = T.buildWorkout(p, sessions, i); assert(w, 'kein Training ' + model + split + d + ' #' + i);
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
