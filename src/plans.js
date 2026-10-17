'use strict';
/* ===== Eisenbuch: Programme und Trainingspläne (ohne DOM) =====
   p.programs = [{id, name, plans:[{id, name, days:[0..6], color, items:[{exId}]}]}], p.prog = aktives Programm.
   Die Periodisierung zählt Einheiten; Einheiten pro Woche = Anzahl belegter Wochentage im aktiven Programm. */

const PLAN_COLORS = ['#E5675B', '#6DB37A', '#F2C744', '#14B8A6', '#F59E0B', '#8B7CF6', '#EC6FA8', '#5B9BE5'];
function wdOf(ds) { return (parseD(ds).getDay() + 6) % 7; }
function pid(pre) { return pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* Vorlagen. Wochentage 0 = Montag. */
const PROG_TPL = {
  fb3:{name:'Ganzkörper 3×', desc:'Drei Ganzkörper-Einheiten, Mo/Mi/Fr. Ideal für den Einstieg.',
    plans:[['Ganzkörper A', [0], 'FA'], ['Ganzkörper B', [2], 'FB'], ['Ganzkörper C', [4], 'FC']]},
  ul4:{name:'Oberkörper/Unterkörper 4×', desc:'Vier Einheiten, Mo/Di/Do/Fr, abwechselnd Ober- und Unterkörper.',
    plans:[['Unterkörper A', [0], 'LA'], ['Oberkörper A', [1], 'UA'], ['Unterkörper B', [3], 'LB'], ['Oberkörper B', [4], 'UB']]},
  ppl6:{name:'Push/Pull/Beine 6×', desc:'Sechs Einheiten Mo–Sa, für Fortgeschrittene mit viel Zeit.',
    plans:[['Push A', [0], 'PA'], ['Pull A', [1], 'PuA'], ['Beine A', [2], 'LgA'], ['Push B', [3], 'PB'], ['Pull B', [4], 'PuB'], ['Beine B', [5], 'LgB']]},
  old:{name:'Ganzkörper (aus deiner alten App)', desc:'Full Body, Upper FB und Lower FB mit den Übungen aus deinen Screenshots, Mo/Mi/Fr.',
    plans:[
      ['Full Body', [0], ['kniebeuge','split-squat','farmers','bankdruecken','beinbeuger-sitzend','kb-rudern','kh-rudern','curl-kabel','seitheben-ma','hanging-leg']],
      ['Upper FB', [2], ['bankdruecken','latzug','sd-kh','kb-rudern','pushdown-ein','curl-kabel']],
      ['Lower FB', [4], ['stiff','beinpresse','beinstrecker','waden-steh','cable-crunch']]
    ]},
  empty:{name:'Eigenes Programm', desc:'Leer starten und Pläne selbst zusammenstellen.', plans:[]}
};
function planFrom(name, days, exs, i) {
  const ids = Array.isArray(exs) ? exs : TPL[exs].ex.slice(0, 6); /* Vorlagen: 6 Übungen ≈ 60 min */
  return {id:pid('pl'), name, days:days.slice(), color:PLAN_COLORS[i % PLAN_COLORS.length], items:ids.filter(id => EX[id]).map(id => ({exId:id}))};
}
function programFromTemplate(key) {
  const T = PROG_TPL[key];
  return {id:pid('pg'), name:T.name, plans:T.plans.map((x, i) => planFrom(x[0], x[1], x[2], i))};
}
/* Migration: aus Split, Trainingstagen, Tauschungen und Dauer der alten Version ein Programm bauen */
function programFromSplit(p) {
  const sp = SPLITS[resolveSplit(p)], N = exCount(p.minutes || 60), days = (p.days && p.days.length ? p.days : [0, 2, 4]).slice().sort();
  const plans = sp.cycle.map((tid, k) => {
    const pl = planFrom(TPL[tid].name, days.filter((d, i) => i % sp.cycle.length === k), templateIds(p, tid).slice(0, N), k);
    return pl;
  });
  return {id:pid('pg'), name:sp.name, plans};
}
function ensurePrograms(p) {
  if (!Array.isArray(p.programs) || !p.programs.length) { p.programs = [programFromSplit(p)]; p.prog = p.programs[0].id; }
  if (!p.programs.some(x => x.id === p.prog)) p.prog = p.programs[0].id;
  p.programs.forEach(pg => pg.plans.forEach((pl, i) => { if (!pl.color) pl.color = PLAN_COLORS[i % PLAN_COLORS.length]; if (!Array.isArray(pl.days)) pl.days = []; pl.items = (pl.items || []).filter(it => EX[it.exId]); }));
  syncDays(p);
  return p;
}
function activeProgram(p) { return p.programs.find(x => x.id === p.prog) || p.programs[0]; }
function findPlan(p, id) { for (const pg of p.programs) { const pl = pg.plans.find(x => x.id === id); if (pl) return pl; } return null; }
/* Einheiten pro Woche aus den Wochentagen des aktiven Programms ableiten */
function syncDays(p) {
  const pg = activeProgram(p), set = new Set();
  pg.plans.forEach(pl => pl.days.forEach(d => set.add(d)));
  if (set.size) p.days = [...set].sort((a, b) => a - b);
  else if (pg.plans.length) p.days = Array.from({length:Math.min(6, Math.max(2, pg.plans.length))}, (_, i) => i);
  if (!p.days || p.days.length < 1) p.days = [0, 2, 4];
}
function planForDate(p, ds) { const wd = wdOf(ds); return activeProgram(p).plans.find(pl => pl.days.includes(wd)) || null; }
/* Automatische Auswahl: heute geplant und noch nicht trainiert, sonst der nächste Wochentag mit Plan,
   sonst Rotation nach dem zuletzt trainierten Plan */
function nextPlan(p, sessions) {
  const pg = activeProgram(p), t = todayStr();
  if (!pg.plans.length) return null;
  const doneToday = sessions.some(s => s.date === t);
  if (!doneToday) { const pl = planForDate(p, t); if (pl) return {plan:pl, date:t, today:true}; }
  for (let i = 1; i < 8; i++) { const d = addDays(t, i), pl = planForDate(p, d); if (pl) return {plan:pl, date:d, today:false}; }
  const ids = pg.plans.map(x => x.id), last = sessions.slice().reverse().find(s => ids.includes(s.planId));
  return {plan:pg.plans[last ? (ids.indexOf(last.planId) + 1) % ids.length : 0], date:t, today:true, rot:true};
}
function lastDoneOfPlan(sessions, planId) { for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].planId === planId) return sessions[i].date; return null; }
function daysAgo(ds) { return ds ? Math.round((parseD(todayStr()) - parseD(ds)) / 864e5) : null; }
function agoText(ds) { const d = daysAgo(ds); return d === null ? '' : d === 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' T.'; }
