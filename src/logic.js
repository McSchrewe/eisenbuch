'use strict';
/* ===== Eisenbuch: Logik (ohne DOM) ===== */

const MUSCLES = ['Brust','Rücken','Schultern','Bizeps','Trizeps','Quadrizeps','Beinbeuger','Gesäß','Waden','Core','Unterarme','Ganzkörper'];
const EQUIP = {LH:'Langhantel',KH:'Kurzhantel',MA:'Maschine',KB:'Kabel',KG:'Körpergewicht',KT:'Kettlebell',SO:'Sonstiges'};
const INC = {LH:2.5,KH:2,MA:2.5,KB:2.5,KG:2.5,KT:4,SO:2.5};
const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

/* id|Name|Muskel|Gerät|Flags (c=Grundübung, l=Unterkörper, t=Zeit, m=Hauptlift)|Basis:Faktor|Schrittweite */
const RAW = `
bankdruecken|Bankdrücken (Langhantel)|Brust|LH|cm
schraegbank-lh|Schrägbankdrücken (Langhantel)|Brust|LH|c|bankdruecken:0.8
negativ-lh|Negativbankdrücken|Brust|LH|c|bankdruecken:0.9
floor-press|Floor Press (Langhantel)|Brust|LH|c|bankdruecken:0.8
enges-bd|Enges Bankdrücken|Brust|LH|c|bankdruecken:0.85
bd-kh|Bankdrücken (Kurzhantel)|Brust|KH|c|bankdruecken:0.37|2
schraegbank-kh|Schrägbankdrücken (Kurzhantel)|Brust|KH|c|bankdruecken:0.33|2
smith-bd|Bankdrücken (Multipresse)|Brust|MA|c|bankdruecken:0.9
brustpresse|Brustpresse (Maschine)|Brust|MA|c
fliegende-kh|Fliegende (Kurzhantel)|Brust|KH
fliegende-schraeg|Schrägbank-Fliegende|Brust|KH
butterfly|Butterfly (Maschine)|Brust|MA
kabel-fly|Kabelzug-Fliegende (Crossover)|Brust|KB
kabel-fly-low|Kabelzug-Fliegende von unten|Brust|KB
pullover-kh|Pullover (Kurzhantel)|Brust|KH
svend|Svend Press|Brust|KH
dips|Dips (Brust)|Brust|KG|c
liegestuetz|Liegestütze|Brust|KG|c
liegestuetz-erh|Liegestütze (Füße erhöht)|Brust|KG|c
ohp|Schulterdrücken stehend (Langhantel)|Schultern|LH|cm
ohp-sitz|Schulterdrücken sitzend (Langhantel)|Schultern|LH|c|ohp:0.9
push-press|Push Press|Schultern|LH|c|ohp:1.2
landmine|Landmine Press|Schultern|LH|c|ohp:0.5
sd-kh|Schulterdrücken (Kurzhantel)|Schultern|KH|c|ohp:0.37|2
arnold|Arnold Press|Schultern|KH|c|ohp:0.3|2
sd-ma|Schulterpresse (Maschine)|Schultern|MA|c
seitheben-kh|Seitheben (Kurzhantel)|Schultern|KH
seitheben-kabel|Seitheben am Kabel|Schultern|KB
seitheben-ma|Seitheben (Maschine)|Schultern|MA
frontheben|Frontheben (Kurzhantel)|Schultern|KH
reverse-fly-kh|Reverse Fly (Kurzhantel)|Schultern|KH
reverse-fly-ma|Reverse Butterfly (Maschine)|Schultern|MA
face-pull|Face Pulls|Schultern|KB
aufrechtes-rudern|Aufrechtes Rudern|Schultern|LH
kreuzheben|Kreuzheben|Rücken|LH|cml
sumo|Sumo-Kreuzheben|Rücken|LH|cl|kreuzheben:0.95
trap-bar|Trap-Bar-Kreuzheben|Rücken|LH|cl|kreuzheben:1.05
rack-pull|Rack Pull|Rücken|LH|cl|kreuzheben:1.1
lh-rudern|Langhantelrudern (vorgebeugt)|Rücken|LH|cm
pendlay|Pendlay Row|Rücken|LH|c|lh-rudern:0.95
t-bar|T-Bar-Rudern|Rücken|LH|c|lh-rudern:0.9
seal-row|Seal Row|Rücken|LH|c|lh-rudern:0.85
kh-rudern|Einarmiges Kurzhantelrudern|Rücken|KH|c|lh-rudern:0.4|2
kb-rudern|Rudern am Kabel (eng)|Rücken|KB|c
kb-rudern-ein|Einarmiges Kabelrudern|Rücken|KB|c
rudern-ma|Rudermaschine (Brust gestützt)|Rücken|MA|c
latzug|Latziehen (breit)|Rücken|KB|c
latzug-eng|Latziehen (eng, neutral)|Rücken|KB|c
klimmzuege|Klimmzüge (Obergriff)|Rücken|KG|c
klimmzug-unter|Chin-ups (Untergriff)|Rücken|KG|c
klimmzug-neutral|Klimmzüge (neutraler Griff)|Rücken|KG|c
australian|Körperrudern (Australian Pull-up)|Rücken|KG|c
gerader-armzug|Gerader Armzug am Kabel|Rücken|KB
shrugs-lh|Shrugs (Langhantel)|Rücken|LH
shrugs-kh|Shrugs (Kurzhantel)|Rücken|KH
hyperext|Rückenstrecker (Hyperextension)|Rücken|KG
superman|Superman|Rücken|KG|t
good-morning|Good Mornings|Rücken|LH|l
curl-lh|Langhantelcurls|Bizeps|LH
curl-sz|SZ-Stangen-Curls|Bizeps|LH
curl-kh|Kurzhantelcurls|Bizeps|KH
hammer|Hammercurls|Bizeps|KH
cross-hammer|Cross-Body Hammercurls|Bizeps|KH
incline-curl|Schrägbank-Curls|Bizeps|KH
preacher|Preacher Curls (Maschine)|Bizeps|MA
curl-kabel|Kabelcurls|Bizeps|KB
hammer-seil|Hammercurls am Kabel (Seil)|Bizeps|KB
konzentration|Konzentrationscurls|Bizeps|KH
spider|Spider Curls|Bizeps|KH
zottman|Zottman Curls|Bizeps|KH
pushdown|Trizepsdrücken am Kabel (Seil)|Trizeps|KB
pushdown-stange|Trizepsdrücken (Stange)|Trizeps|KB
pushdown-ein|Einarmiges Trizepsdrücken|Trizeps|KB
skull|Skullcrusher (SZ-Stange)|Trizeps|LH
jm-press|JM Press|Trizeps|LH
french-kh|Überkopf-Trizepsstrecken (Kurzhantel)|Trizeps|KH
oh-ext-kabel|Überkopf-Trizepsstrecken (Kabel)|Trizeps|KB
dips-trizeps|Dips (Trizeps, aufrecht)|Trizeps|KG|c
bankdips|Bankdips|Trizeps|KG
diamond|Diamond-Liegestütze|Trizeps|KG|c
kickback|Kickbacks (Kurzhantel)|Trizeps|KH
dip-ma|Dip-Maschine|Trizeps|MA
kniebeuge|Kniebeuge (Langhantel)|Quadrizeps|LH|cml
frontkniebeuge|Frontkniebeuge|Quadrizeps|LH|cl|kniebeuge:0.8
pause-squat|Pause Squat|Quadrizeps|LH|cl|kniebeuge:0.8
box-squat|Box Squat|Quadrizeps|LH|cl|kniebeuge:0.9
zercher|Zercher Squat|Quadrizeps|LH|cl|kniebeuge:0.7
smith-squat|Kniebeuge (Multipresse)|Quadrizeps|MA|cl|kniebeuge:0.85
goblet|Goblet Squat|Quadrizeps|KH|cl|kniebeuge:0.25|2
split-squat|Bulgarian Split Squat|Quadrizeps|KH|cl|kniebeuge:0.2|2
ausfall-kh|Ausfallschritte (Kurzhantel)|Quadrizeps|KH|cl|kniebeuge:0.2|2
ausfall-lh|Ausfallschritte (Langhantel)|Quadrizeps|LH|cl|kniebeuge:0.5
rueckwaerts|Rückwärts-Ausfallschritte|Quadrizeps|KH|cl|kniebeuge:0.2|2
ausfall-geh|Gehende Ausfallschritte|Quadrizeps|KH|cl|kniebeuge:0.18|2
stepups|Step-ups|Quadrizeps|KH|cl|kniebeuge:0.18|2
beinpresse|Beinpresse|Quadrizeps|MA|cl||5
hack|Hackenschmidt-Kniebeuge|Quadrizeps|MA|cl||5
beinpresse-ein|Einbeinige Beinpresse|Quadrizeps|MA|cl||5
beinstrecker|Beinstrecker|Quadrizeps|MA
adduktoren|Adduktorenmaschine|Quadrizeps|MA
wandsitzen|Wandsitzen|Quadrizeps|KG|t
rdl|Rumänisches Kreuzheben|Beinbeuger|LH|cl|kreuzheben:0.75
rdl-kh|Rumänisches Kreuzheben (Kurzhantel)|Beinbeuger|KH|cl|kreuzheben:0.3|2
stiff|Gestrecktes Kreuzheben|Beinbeuger|LH|cl|kreuzheben:0.7
beinbeuger-liegend|Beinbeuger liegend|Beinbeuger|MA
beinbeuger-sitzend|Beinbeuger sitzend|Beinbeuger|MA
nordic|Nordic Curls|Beinbeuger|KG
glute-ham|Glute-Ham-Raise|Beinbeuger|KG
hip-thrust|Hip Thrust (Langhantel)|Gesäß|LH|cl|kniebeuge:1
hip-thrust-ma|Hip Thrust (Maschine)|Gesäß|MA|l||5
glute-bridge|Glute Bridge|Gesäß|KG
kb-swing|Kettlebell Swing|Gesäß|KT
kickback-kabel|Gesäß-Kickback am Kabel|Gesäß|KB
abduktoren|Abduktorenmaschine|Gesäß|MA
pull-through|Cable Pull-Through|Gesäß|KB
waden-steh|Wadenheben stehend|Waden|MA
waden-sitz|Wadenheben sitzend|Waden|MA
waden-kh|Einbeiniges Wadenheben|Waden|KH
waden-presse|Wadenheben an der Beinpresse|Waden|MA
tibialis|Tibialis Raise|Waden|KG
plank|Plank|Core|KG|t
side-plank|Seitstütz|Core|KG|t
hollow|Hollow Hold|Core|KG|t
l-sit|L-Sit|Core|KG|t
hanging-leg|Hängendes Beinheben|Core|KG
hanging-knee|Hängendes Knieheben|Core|KG
toes-bar|Toes-to-Bar|Core|KG
crunch|Crunches|Core|KG
sit-up|Sit-ups|Core|KG
v-up|V-Ups|Core|KG
bicycle|Bicycle Crunches|Core|KG
cable-crunch|Cable Crunch|Core|KB
ab-wheel|Ab-Wheel Rollout|Core|SO
russian|Russian Twist|Core|KH
dead-bug|Dead Bug|Core|KG
pallof|Pallof Press|Core|KB
woodchop|Woodchopper (Kabel)|Core|KB
handgelenk|Handgelenkcurls|Unterarme|KH
reverse-curl|Reverse Curls|Unterarme|LH
dead-hang|Dead Hang|Unterarme|KG|t
farmers|Farmer's Walk / Hold (Zeit)|Unterarme|KH|t
towel-hang|Handtuch-Hang|Unterarme|KG|t
einarm-hang|Einarmiges Hängen|Unterarme|KG|t
plate-pinch|Scheiben-Pinch halten|Unterarme|SO|t
wrist-roller|Wrist Roller (Auf- und Abrollen)|Unterarme|SO
gripper|Handtrainer (Gripper)|Unterarme|SO
fat-grip|Dicker-Griff-Halten (Fat Grip)|Unterarme|LH|t
hock-iso|Isometrische Hocke (Wakeboard-Stance)|Quadrizeps|KG|t
box-jump|Box Jumps (weiche Landung)|Quadrizeps|KG|p
skater|Skater-Sprünge (einbeinige Landung)|Quadrizeps|KG|p
handle-hold|Handle-Hold zweihändig (Kabel, Hüfthöhe)|Rücken|KB|t
repeaters|Repeaters 7/3 s (Hang-Zyklen)|Unterarme|KG|
seil-rudern|Rudern am Seilgriff (Kabel)|Rücken|KB|c
power-clean|Power Clean|Ganzkörper|LH|cl
thruster|Thrusters|Ganzkörper|LH|c
kb-clean-press|Kettlebell Clean & Press|Ganzkörper|KT|c
turkish|Turkish Get-up|Ganzkörper|KT
burpees|Burpees|Ganzkörper|KG
mountain|Mountain Climbers|Ganzkörper|KG|t
sled|Schlittenschieben|Ganzkörper|SO
`;

const EX = {};
const EXLIST = [];
RAW.trim().split('\n').forEach(line => {
  const f = line.split('|');
  const fl = f[4] || '';
  const e = {id:f[0], name:f[1], m:f[2], eq:f[3], c:fl.includes('c'), l:fl.includes('l'), t:fl.includes('t'), main:fl.includes('m'), plyo:fl.includes('p'), inc: f[6] ? parseFloat(f[6]) : INC[f[3]]};
  if (f[5]) { const b = f[5].split(':'); e.base = b[0]; e.ratio = parseFloat(b[1]); }
  EX[e.id] = e; EXLIST.push(e);
});
const GRIP_ROT = ['dead-hang','farmers','reverse-curl']; /* Haltekraft an der Stange (≈ Handle-Dicke), unter Last, plus Ausgleich der Strecker */
const GRIP_HANG = ['dead-hang','towel-hang','einarm-hang'];
/* Griff je Saisonphase: Maximalkraft schwer und kurz, Power-Phase Kraftausdauer */
const GRIP_BY_PHASE = {max:['dead-hang','farmers'], power:['repeaters','handle-hold']};
const MAIN_LIFTS = EXLIST.filter(e => e.main).map(e => e.id);   // Kniebeuge, Bankdrücken, Kreuzheben, Schulterdrücken, Rudern
const BW_RATIO = {kniebeuge:0.75, bankdruecken:0.55, kreuzheben:1.0, ohp:0.35, 'lh-rudern':0.5};

/* ===== Trainingstage / Splits ===== */
const TPL = {
  FA:{name:'Ganzkörper A', ex:['kniebeuge','bankdruecken','lh-rudern','rdl','sd-kh','curl-kh','plank','waden-steh']},
  FB:{name:'Ganzkörper B', ex:['kreuzheben','ohp','latzug','split-squat','schraegbank-kh','face-pull','pushdown','hanging-knee']},
  FC:{name:'Ganzkörper C', ex:['frontkniebeuge','schraegbank-lh','klimmzuege','hip-thrust','seitheben-kh','hammer','cable-crunch','waden-sitz']},
  UA:{name:'Oberkörper A', ex:['bankdruecken','lh-rudern','ohp','latzug','curl-kh','pushdown','face-pull','seitheben-kh']},
  LA:{name:'Unterkörper A', ex:['kniebeuge','rdl','beinpresse','beinbeuger-liegend','waden-steh','plank','hip-thrust','abduktoren']},
  UB:{name:'Oberkörper B', ex:['schraegbank-kh','klimmzuege','sd-kh','kb-rudern','seitheben-kabel','hammer','oh-ext-kabel','reverse-fly-kh']},
  LB:{name:'Unterkörper B', ex:['kreuzheben','frontkniebeuge','hip-thrust','beinbeuger-sitzend','beinstrecker','waden-sitz','cable-crunch','hanging-knee']},
  PA:{name:'Push A', ex:['bankdruecken','ohp','schraegbank-kh','seitheben-kh','pushdown','oh-ext-kabel','kabel-fly','frontheben']},
  PuA:{name:'Pull A', ex:['lh-rudern','klimmzuege','kb-rudern','face-pull','curl-lh','hammer','reverse-fly-ma','shrugs-kh']},
  LgA:{name:'Beine A', ex:['kniebeuge','rdl','beinpresse','beinbeuger-liegend','waden-steh','hanging-leg','hip-thrust','adduktoren']},
  PB:{name:'Push B', ex:['schraegbank-lh','sd-kh','bd-kh','seitheben-kabel','skull','pushdown-stange','butterfly','dips-trizeps']},
  PuB:{name:'Pull B', ex:['kreuzheben','latzug','kh-rudern','gerader-armzug','curl-kabel','incline-curl','reverse-fly-kh','shrugs-lh']},
  LgB:{name:'Beine B', ex:['frontkniebeuge','split-squat','hip-thrust','beinbeuger-sitzend','beinstrecker','waden-sitz','cable-crunch','hanging-knee']}
};
const SPLITS = {
  fullbody:{name:'Ganzkörper', cycle:['FA','FB','FC'], desc:'Jede Einheit trainiert den ganzen Körper. Ideal für 2–3 Tage pro Woche und für den Einstieg.', rec:[2,3]},
  upperlower:{name:'Oberkörper / Unterkörper', cycle:['UA','LA','UB','LB'], desc:'Abwechselnd Oberkörper und Unterkörper. Passt gut zu 4 Tagen pro Woche.', rec:[4]},
  ppl:{name:'Push / Pull / Beine', cycle:['PA','PuA','LgA','PB','PuB','LgB'], desc:'Drücken, Ziehen und Beine getrennt. Sinnvoll ab 5 Tagen, mit 3 Tagen als Rotation über zwei Wochen.', rec:[5,6]}
};
function resolveSplit(p) {
  if (p.split && p.split !== 'auto') return p.split;
  const d = p.days.length;
  return d <= 3 ? 'fullbody' : d === 4 ? 'upperlower' : 'ppl';
}
function exCount(min) { return Math.max(3, Math.min(8, Math.round(min / 12.5))); }

/* ===== Periodisierung ===== */
const MODELS = {
  linear:{
    name:'Linear (Einsteiger)', weeks:6, tag:'Empfohlen für den Start',
    desc:'Die Last steigt von Woche zu Woche, die Wiederholungen sinken. Einfach zu verstehen und gut für Einsteiger. Die letzte Woche ist eine Entlastungswoche: halbes Volumen bei 70 % statt Pause, so bleibt die Kraft erhalten.',
    wk:[
      {l:'Aufbau',pct:0.70,reps:10,sets:4},
      {l:'Aufbau',pct:0.75,reps:8,sets:4},
      {l:'Kraft',pct:0.80,reps:6,sets:3},
      {l:'Kraft',pct:0.825,reps:5,sets:3},
      {l:'Peak',pct:0.85,reps:4,sets:3,top:{pct:0.90,reps:3},back:{pct:0.80,reps:5}}, /* Hauptübungen: Topsatz × 3, dann Back-off */
      {l:'Deload',pct:0.70,reps:5,sets:2,deload:true}
    ]
  },
  dup:{
    name:'Wellenförmig (täglich variierend)', weeks:5, tag:'Für später, wenn Linear stockt',
    desc:'Jede Einheit der Woche hat einen anderen Schwerpunkt: schwer, Volumen oder mittel. Von Woche zu Woche steigt alles leicht an. Die letzte Woche ist ein Deload mit halbem Volumen bei 70 %.',
    wk:[
      {heavy:{pct:0.80,reps:5,sets:4}, vol:{pct:0.675,reps:10,sets:3}, mid:{pct:0.725,reps:8,sets:3}},
      {heavy:{pct:0.825,reps:5,sets:4}, vol:{pct:0.70,reps:10,sets:3}, mid:{pct:0.75,reps:8,sets:3}},
      {heavy:{pct:0.85,reps:4,sets:4}, vol:{pct:0.725,reps:10,sets:3}, mid:{pct:0.775,reps:7,sets:3}},
      {heavy:{pct:0.875,reps:3,sets:4}, vol:{pct:0.75,reps:9,sets:3}, mid:{pct:0.80,reps:6,sets:3}},
      {deload:true,l:'Deload',pct:0.70,reps:5,sets:2}
    ]
  }
};
MODELS.season = {name:'Saisonplan Wakeboard', weeks:6, tag:'Kraft & Power zum Saisonstart', season:true,
  desc:'Blöcke rückwärts vom Saisonstart: Grundlage, Maximalkraft mit Topsatz, dann Power & Kraftausdauer und eine Woche Tapering. Gezählt werden deine tatsächlich gemachten Einheiten: Fällt ein Training aus, verschiebt sich der Block. Liegst du 2 Wochen oder mehr zurück, überspringt die App eine Arbeitswoche, und spätere Blöcke werden kürzer geplant, damit du rechtzeitig zum Saisonstart in Form bist.', wk:[]};
const PHASES = {prep:'Einstieg', base:'Grundlage', max:'Maximalkraft', power:'Power & Kraftausdauer', taper:'Tapering'};
const rp = x => Math.round(x * 80) / 80; /* auf 1,25 % runden */
function modelOf(p) { if (p.model !== 'season') return MODELS[p.model] || MODELS.linear; const wk = (p.block && p.block.wk) || []; return {...MODELS.season, wk, weeks:wk.length || 6}; }
function daysTo(from, to) { return Math.round((parseD(to) - parseD(from)) / 864e5); } /* ganze Tage, unabhängig von der Zeitumstellung */
function weeksTo(from, to) { return Math.floor(daysTo(from, to) / 7); }
/* Phasenfenster rückwärts vom Saisonstart: Tapering 1 Wo., davor Power & Kraftausdauer 7 Wo., davor Maximalkraft 9 Wo., davor Grundlage.
   Verspätet sich ein Block (ausgefallene Einheiten), startet der nächste später und seine Phase wird entsprechend kürzer. */
const SEASON_WIN = {taper:1, power:7, max:9};
function phaseWeeks(ph, L) {
  const out = [], dl = (ph === 'base' || ph === 'max') && L >= 4, work = L - (dl ? 1 : 0);
  for (let i = 0; i < work; i++) {
    const t = work > 1 ? i / (work - 1) : 0;
    if (ph === 'base') out.push({l:'Grundlage', phase:ph, pct:rp(0.70 + 0.075 * t), reps:Math.round(10 - 2 * t), sets:4});
    else if (ph === 'max') { const w = {l:'Maximalkraft', phase:ph, pct:rp(0.80 + 0.075 * t), reps:Math.round(5 - 2 * t), sets:t < 0.5 ? 5 : 4}; if (i === work - 1 && work >= 2) { w.top = {pct:0.90, reps:3}; w.back = {pct:0.80, reps:4}; } out.push(w); }
    else if (ph === 'power') out.push({l:'Power', phase:ph, pct:rp(0.85 + 0.025 * t), reps:Math.round(4 - t), sets:3});
    else out.push({l:'Tapering', phase:ph, pct:0.85, reps:3, sets:2, deload:true});
  }
  if (dl) out.push({l:'Deload', phase:ph, pct:0.70, reps:5, sets:2, deload:true});
  return out;
}
/* Nächster Block ab Datum: Phase nach verbleibender Zeit, lange Phasen in Blöcke à 6 Wochen geteilt (kein Rest unter 3 Wochen) */
function nextSeasonBlock(p, from) {
  const W = p.season ? weeksTo(from, p.season) : 0, P = SEASON_WIN.taper + SEASON_WIN.power, M = P + SEASON_WIN.max;
  let phase = 'base', len = 6;
  if (W >= M + 3) { phase = 'base'; len = W - M; }
  else if (W >= P + 3) { phase = 'max'; len = W - P; }
  else if (W >= 2) { phase = 'power'; len = W - SEASON_WIN.taper; }
  else if (W >= 1) { phase = 'taper'; len = 1; }
  if (len > 8) len = len - 6 < 3 ? len : 6; /* lange Phasen in Blöcke à 6 Wochen, kein Rest unter 3 Wochen */
  const until = phase === 'taper' && p.season ? p.season : addDays(from, len * 7); /* Tapering reicht bis zum Saisonstart */
  return {phase, len, wk:phaseWeeks(phase, len), from, until};
}
function seasonStartBlock(p, from) {
  if (p.model !== 'season') return;
  const b = nextSeasonBlock(p, from || todayStr());
  Object.assign(p.block, {wk:b.wk, phase:b.phase, until:b.until, planStart:b.from});
}
function ensureSeason(p) { if (p.model === 'season' && (!p.block.wk || !p.block.wk.length)) seasonStartBlock(p, todayStr()); }
/* Ausblick: aktueller Block, dann die geplanten Blöcke bis zum Saisonstart */
function seasonOutlook(p) {
  ensureSeason(p);
  const out = []; let from;
  if (p.prep && p.prep.on) { /* Einstieg läuft: Blöcke ab dem voraussichtlichen Einstiegsende planen */
    const left = Math.max(0, p.prep.weeks * p.days.length - (p.prep.n || 0)), wl = Math.ceil(left / Math.max(1, p.days.length));
    const pe = addDays(todayStr(), wl * 7); out.push({phase:'prep', from:todayStr(), until:pe, weeks:wl, cur:true}); from = pe;
  } else { out.push({phase:p.block.phase, from:p.block.planStart, until:p.block.until, weeks:p.block.wk.length, cur:true}); from = p.block.until > todayStr() ? p.block.until : todayStr(); }
  for (let i = 0; i < 12 && p.season && from < p.season; i++) { const b = nextSeasonBlock(p, from); out.push({phase:b.phase, from, until:b.until, weeks:b.len}); from = b.until; if (b.phase === 'taper') break; }
  return out;
}
/* Hinter dem Plan? Mehr als 1 Woche Rückstand gegenüber dem Blockende: eine Arbeitswoche überspringen (nie Topsatz- oder Deload-Woche) */
function seasonBehind(p) {
  if (p.model !== 'season' || !p.block.wk || !p.block.until) return 0;
  const d = p.days.length, L = p.block.wk.length, curW = Math.floor(p.block.n / d), cal = Math.max(0, Math.ceil(daysTo(todayStr(), p.block.until) / 7));
  return Math.max(0, (L - curW) - cal);
}
function seasonCatchUp(p) {
  if (p.prep && p.prep.on) return null;
  const behind = seasonBehind(p); if (behind < 2) return null;
  const d = p.days.length, wk = p.block.wk, curW = Math.floor(p.block.n / d), dl = wk.findIndex(w => w.deload), lastWork = (dl < 0 ? wk.length : dl) - 1;
  if (curW >= lastWork) return null;
  p.block.n = (curW + 1) * d;
  return {skipped:curW + 1, behind};
}
const DUP_NAMES = {heavy:'Schwer', vol:'Volumen', mid:'Mittel'};
const DUP_DAYS = {2:['heavy','vol'], 3:['heavy','vol','mid'], 4:['heavy','vol','mid','vol'], 5:['heavy','vol','mid','vol','mid'], 6:['heavy','vol','mid','heavy','vol','mid']};

/* Einstiegsphase vor dem Block (nach Pause oder Neustart): Arbeitssätze 1 → 3, Last 60 → 70 % des 1RM,
   Isolationsübungen 80 → 90 % des letzten Arbeitsgewichts. Zählt nicht zum Block. */
const PREP = {1:[{pct:0.65, reps:8, sets:2, dp:0.85}], 2:[{pct:0.60, reps:8, sets:1, dp:0.8}, {pct:0.675, reps:8, sets:2, dp:0.875}],
  3:[{pct:0.60, reps:8, sets:1, dp:0.8}, {pct:0.65, reps:8, sets:2, dp:0.85}, {pct:0.70, reps:8, sets:3, dp:0.9}]};
function prepWeek(p) { const pp = p.prep; return pp && pp.on ? Math.min(pp.weeks - 1, Math.floor((pp.n || 0) / Math.max(1, p.days.length))) : -1; }
function prepPr(p, one) {
  const pp = p.prep, wk = prepWeek(p);
  if (wk >= 0) return {week:0, dayIdx:0, label:'Einstieg ' + (wk + 1) + '/' + pp.weeks, ...PREP[pp.weeks][wk], prep:true, deload:false};
  if (one) return {week:0, dayIdx:0, label:'Vorbereitung', ...PREP[1][0], prep:true, deload:false};
  return null;
}
function blockSessions(p) { return p.days.length * modelOf(p).weeks; }
function prescribe(p, n) {
  const d = p.days.length, M = modelOf(p), wi = Math.floor(n / d), di = n % d;
  if (wi >= M.weeks) return null;
  const w = M.wk[wi];
  if (p.model !== 'dup') return {week:wi+1, dayIdx:di, label:w.l, pct:w.pct, reps:w.reps, sets:w.sets, deload:!!w.deload, top:w.top || null, back:w.back || null, phase:w.phase || null};
  if (w.deload) return {week:wi+1, dayIdx:di, label:'Deload', pct:w.pct, reps:w.reps, sets:w.sets, deload:true};
  const t = DUP_DAYS[d][di], x = w[t];
  return {week:wi+1, dayIdx:di, label:DUP_NAMES[t], pct:x.pct, reps:x.reps, sets:x.sets, deload:false};
}

/* ===== Mathe / Format ===== */
const EPLEY = (w, r) => r <= 1 ? w : w * (1 + r / 30);
const roundTo = (x, inc) => Math.round(x / inc) * inc;
const roundHalf = x => Math.round(x * 2) / 2;
const nfmt = new Intl.NumberFormat('de-DE', {maximumFractionDigits:2, useGrouping:false});
const fmt = n => nfmt.format(n);
const fkg = n => fmt(n) + ' kg';
function parseNum(v) { if (v === null || v === undefined) return null; const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; }
function pad2(n) { return String(n).padStart(2, '0'); }
function dstr(d) { return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
function todayStr() { return dstr(new Date()); }
function parseD(s) { const a = s.split('-').map(Number); return new Date(a[0], a[1]-1, a[2]); }
function mondayOf(s) { const d = parseD(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dstr(d); }
function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
function fmtDur(ms) { const s = Math.max(0, Math.floor(ms/1000)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x); }
function parseDur(t) {
  t = String(t || '').trim(); if (!t) return null;
  if (!t.includes(':')) { const m = parseNum(t); return m === null ? null : Math.round(m * 60); }
  const a = t.split(':').map(x => parseNum(x)); if (a.some(x => x === null)) return null;
  return a.length === 3 ? a[0]*3600 + a[1]*60 + a[2] : a[0]*60 + a[1];
}
function fmtPace(secPerKm) { if (!isFinite(secPerKm) || secPerKm <= 0) return '–'; const s = Math.round(secPerKm); return Math.floor(s/60) + ':' + pad2(s%60) + ' min/km'; }

/* ===== Profil ===== */
function defaultProfile() {
  return {v:2, done:false, split:'fullbody', days:[0,2,4], time:'18:00', minutes:60, model:'linear', bw:null,
    e1:{}, src:{}, adj:{}, swaps:{}, block:{n:0, no:1, e1Start:{}, started:todayStr()}, upd:0,
    wake:false, season:'2027-05-01', gripEvery:14, gripSet:['hang','hhold'], gripGoal:{}, height:null, tomb:[],
    remind:{on:false, lead:30}, prep:{on:false, weeks:3, n:0}, bwGoal:null, bwDate:null, custom:[], exNotes:{}};
}
function minKg(e) { return e.eq === 'LH' ? 20 : e.inc; }
function e1Of(p, id) {
  const e = EX[id];
  if (p.e1 && p.e1[id]) return p.e1[id];
  if (e.base && p.e1 && p.e1[e.base]) return roundHalf(p.e1[e.base] * e.ratio);
  return null;
}
function estimateFromBW(bw) { const o = {}; MAIN_LIFTS.forEach(id => { o[id] = roundHalf(bw * BW_RATIO[id]); }); return o; }

/* ===== Verlauf-Hilfen ===== */
function workSets(x) { return x.sets.filter(s => s.done && !s.warm); }
function lastSession(sessions, id) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const x = sessions[i].exercises.find(q => q.exId === id);
    if (x && workSets(x).length) return {s:sessions[i], x};
  }
  return null;
}
function fmtSet(e, s) {
  if (e.t) return s.reps + ' s';
  if (e.eq === 'KG') return (s.kg > 0 ? '+' + fmt(s.kg) + ' kg × ' : '') + s.reps + ' Wdh.';
  return fmt(s.kg || 0) + ' kg × ' + s.reps + ' Wdh.';
}
/* RIR-basierte Autoregulation: geschätzte Wiederholungen in Reserve je Gefühl.
   Leicht ≈ 3, Passend ≈ 1,5, Schwer/Limit = 0. Die Plan-Sätze liegen bei ca. 2 RIR, ein „passender“
   Satz mit Plangewicht bestätigt also das 1RM (Schätzung ≤ +1 %), erst echte Mehrleistung hebt es an. */
const RIR = {easy:3, ok:1.5, hard:0};
function bonusOf(feel) { return RIR[feel] !== undefined ? RIR[feel] : 1.5; }
function sessionE1(e, x) {
  const b = bonusOf(x.feel); let best = 0;
  for (const s of workSets(x)) {
    if (!(s.kg > 0) || !(s.reps > 0) || s.reps > 12) continue;
    best = Math.max(best, EPLEY(s.kg, s.reps + b));
  }
  return best;
}
/* Kennzahl pro Übung und Einheit: {v, unit} */
function metricOf(e, x) {
  const ws = workSets(x); if (!ws.length) return null;
  if (e.t) return {v:Math.max(...ws.map(s => s.reps)), unit:'s'};
  if (e.eq === 'KG') {
    const loaded = ws.filter(s => s.kg > 0);
    if (loaded.length) return {v:roundHalf(Math.max(...loaded.map(s => EPLEY(s.kg, s.reps)))), unit:'kg'};
    return {v:Math.max(...ws.map(s => s.reps)), unit:'Wdh.'};
  }
  let best = 0;
  for (const s of ws) if (s.kg > 0 && s.reps > 0) best = Math.max(best, EPLEY(s.kg, Math.min(s.reps, 12)));
  return best ? {v:roundHalf(best), unit:'kg'} : null;
}
function history(sessions, id) {
  const e = EX[id], out = [];
  sessions.forEach(s => {
    const x = s.exercises.find(q => q.exId === id); if (!x) return;
    const m = metricOf(e, x); if (!m) return;
    const ws = workSets(x);
    const top = ws.reduce((a, b) => ((b.kg || 0) > (a.kg || 0) || ((b.kg || 0) === (a.kg || 0) && b.reps > a.reps)) ? b : a, ws[0]);
    out.push({t:s.start, date:s.date, v:m.v, unit:m.unit, top:fmtSet(e, top), vol:ws.reduce((a, b) => a + (b.kg || 0) * b.reps, 0)});
  });
  /* nur Punkte derselben Einheit wie der letzte Eintrag (z. B. Klimmzüge erst Wdh., später mit Zusatzgewicht) */
  if (!out.length) return out;
  const u = out[out.length - 1].unit;
  return out.filter(o => o.unit === u);
}
function sessionVolume(s) {
  let v = 0; s.exercises.forEach(x => workSets(x).forEach(q => { v += (q.kg || 0) * q.reps; })); return v;
}
function weeklyVolume(sessions, weeks) {
  const mon = mondayOf(todayStr()), out = [];
  for (let i = weeks - 1; i >= 0; i--) { const m = addDays(mon, -7 * i); out.push({k:m, v:0}); }
  const idx = {}; out.forEach((o, i) => { idx[o.k] = i; });
  sessions.forEach(s => { const k = mondayOf(s.date); if (k in idx) out[idx[k]].v += sessionVolume(s); });
  return out;
}
function weeklyKm(runs, weeks) {
  const mon = mondayOf(todayStr()), out = [];
  for (let i = weeks - 1; i >= 0; i--) { out.push({k:addDays(mon, -7 * i), v:0}); }
  const idx = {}; out.forEach((o, i) => { idx[o.k] = i; });
  runs.forEach(r => { const k = mondayOf(r.date); if (k in idx) out[idx[k]].v += r.km; });
  return out;
}

/* ===== Plan fuer eine Einheit ===== */
function bwRange(e) { if (e.plyo) return [4,6]; /* Sprünge: wenige, saubere Wiederholungen */ return e.m === 'Core' ? [12,20] : e.m === 'Brust' ? [10,20] : [6,12]; }
function dpSuggest(last, lo, hi, inc) {
  if (!last) return {kg:null, reps:lo};
  const ws = workSets(last.x), top = Math.max(...ws.map(s => s.kg || 0));
  const at = ws.filter(s => (s.kg || 0) === top), minR = Math.min(...at.map(s => s.reps));
  if (minR >= hi) return {kg:top + inc, reps:lo};
  if (minR < lo && last.x.feel === 'hard') return {kg:Math.max(0, top - inc), reps:lo};
  return {kg:top, reps:Math.min(hi, Math.max(lo, minR + 1))};
}
/* Studio-Profil: kleinster verfügbarer Gewichtsschritt je Gerätetyp, sonst Standard */
function incOf(p, e) { const g = p.gym && p.gym[e.eq]; return g > 0 ? g : e.inc; }
function exPlan(p, id, slot, pr, sessions) {
  const e = EX[id], inc = incOf(p, e), last = lastSession(sessions, id);
  const lastTxt = last ? workSets(last.x).map(s => fmtSet(e, s)).join(' · ') : '';
  const base = {exId:id, slot, inc, lastTxt};
  const sets = pr.prep ? Math.max(1, pr.sets) : pr.deload ? 2 : 3;
  if (e.t) {
    const ws = last ? workSets(last.x) : [], lkg = ws.length ? Math.max(...ws.map(s => s.kg || 0)) : 0;
    /* Maximalkraft: schwere kurze Hangs bzw. isometrischer Handle-Zug, Steigerung über Zusatzgewicht */
    if (pr.phase === 'max' && (GRIP_HANG.includes(id) || id === 'handle-hold')) {
      const tgt = id === 'handle-hold' ? 8 : 10, step = e.eq === 'KG' ? 2.5 : inc, short = ws.length && ws.every(s => s.reps <= 20);
      const kg = !ws.length ? (e.eq === 'KG' ? 0 : null) : short && ws.every(s => s.reps >= tgt) ? lkg + step : lkg;
      return {...base, mode:'time', sets:5, reps:tgt, kg, rest:120, wkg:true, desc:'5 × ' + tgt + ' s schwer' + (e.eq === 'KG' ? ', Zusatzgewicht steigern' : ', Handle an der Hüfte, Ellbogen ca. 90°')};
    }
    /* Power-Phase: Runden-Simulation, 6 × 25 s Handle-Hold bei ca. 60 % der Maximal-Last */
    if (pr.phase === 'power' && id === 'handle-hold') {
      const lap = ws.length >= 6 && ws.every(s => s.reps >= 20), kg = !ws.length ? null : lap ? (ws.every(s => s.reps >= 25) ? lkg + inc : lkg) : roundTo(lkg * 0.6, inc);
      return {...base, mode:'time', sets:6, reps:25, kg:kg || null, rest:40, desc:'Runden-Simulation: 6 × 25 s halten, 40 s Pause'};
    }
    const prev = last ? Math.max(...workSets(last.x).map(s => s.reps)) : 0;
    const tgt = pr.deload || pr.prep ? Math.max(15, Math.round(prev * 0.7) || 20) : Math.min(180, prev ? prev + 5 : 30);
    const lk2 = e.eq !== 'KG' ? lkg : 0;
    return {...base, mode:'time', sets, reps:tgt, kg:lk2 || (e.eq === 'KG' ? 0 : null), desc:sets + ' Sätze × ' + tgt + ' s'};
  }
  if (e.eq === 'KG') {
    if (id === 'repeaters') { const r = [4, 6], s = pr.prep ? {kg:0, reps:4} : dpSuggest(last, r[0], r[1], 2.5), n = pr.phase === 'power' ? 4 : sets;
      return {...base, mode:'bw', sets:n, reps:s.reps, kg:s.kg || 0, rng:r, unit:'Zyklen', rest:180, desc:n + ' Serien × 4–6 Zyklen (7 s hängen, 3 s Pause)'}; }
    const r = pr.phase === 'max' && e.c ? [3, 6] : bwRange(e), s = pr.prep ? {kg:0, reps:r[0]} : dpSuggest(last, r[0], r[1], 2.5);
    return {...base, mode:'bw', sets:pr.phase === 'max' && e.c ? 4 : sets, reps:s.reps, kg:s.kg || 0, rng:r, desc:(pr.phase === 'max' && e.c ? 4 : sets) + ' Sätze × ' + r[0] + '–' + r[1] + ' Wdh.' + (pr.phase === 'max' && e.c ? ' mit Zusatzgewicht' : '')};
  }
  const e1 = e.c ? e1Of(p, id) : null;
  if (e1) {
    const adj = (p.adj && p.adj[id]) || 0;
    const kg = Math.max(minKg(e), roundTo(e1 * pr.pct, inc) + adj);
    const n = slot < 2 ? pr.sets : Math.min(pr.sets, 3);
    /* Topsatz: allein trainierbar statt 1RM-Test. 3 schwere Wiederholungen kalibrieren das 1RM, danach Back-off-Sätze */
    if (pr.top && e.main && n >= 2) {
      const tk = Math.max(minKg(e), roundTo(e1 * pr.top.pct, inc) + adj), bk = Math.max(minKg(e), roundTo(e1 * pr.back.pct, inc) + adj);
      const spec = [{kg:tk, reps:pr.top.reps, top:true}].concat(Array.from({length:n - 1}, () => ({kg:bk, reps:pr.back.reps})));
      return {...base, mode:'pct', sets:n, reps:pr.top.reps, pct:pr.top.pct, kg:tk, e1, adj, spec,
        desc:'Topsatz ' + pr.top.reps + ' Wdh. @ ' + fmt(pr.top.pct * 100) + ' %, dann ' + (n - 1) + ' × ' + pr.back.reps + ' @ ' + fmt(pr.back.pct * 100) + ' %'};
    }
    return {...base, mode:'pct', sets:n, reps:pr.reps, pct:pr.pct, kg, e1, adj,
      desc:n + ' Sätze × ' + pr.reps + ' Wdh. @ ' + fmt(Math.round(pr.pct * 1000) / 10) + ' %'};
  }
  const rng = e.main ? [8,10] : e.c ? [8,12] : [10,15];
  let s = dpSuggest(last, rng[0], rng[1], inc);
  if (pr.prep && last) { const top = Math.max(...workSets(last.x).map(q => q.kg || 0)); s = {kg:Math.max(0, roundTo(top * pr.dp, inc)), reps:rng[0]}; } /* Einstieg: unter dem letzten Arbeitsgewicht */
  else if (pr.deload && last) { const top = Math.max(...workSets(last.x).map(q => q.kg || 0)); s = {kg:Math.max(0, roundTo(top * 0.8, inc)), reps:rng[0]}; } /* Deload: keine Steigerung, ca. 80 % */
  return {...base, mode:'dp', sets, reps:s.reps, kg:s.kg, rng, first:!last,
    desc:sets + ' Sätze × ' + rng[0] + '–' + rng[1] + ' Wdh.'};
}
function templateIds(p, tid) { return TPL[tid].ex.map((id, i) => (p.swaps && p.swaps[tid + ':' + i]) || id); }
/* Ein Training aus einem Plan bauen. Ohne planId wählt die App automatisch (siehe nextPlan). */
function buildWorkout(p, sessions, n, planId, opt) {
  ensureSeason(p);
  let pr = prepPr(p, opt && opt.prep) || prescribe(p, n); if (!pr) return null;
  /* Wiedereinstieg: nach mindestens 14 Tagen Pause einmalig 10 % leichter */
  const lastS = sessions.length ? sessions[sessions.length - 1] : null;
  if (lastS && !pr.deload && !pr.prep && (parseD(todayStr()) - parseD(lastS.date)) / 864e5 >= 14) pr = {...pr, pct:Math.round(pr.pct * 0.9 * 1000) / 1000, label:pr.label + ' · Wiedereinstieg', re:true};
  ensurePrograms(p);
  const plan = (planId && findPlan(p, planId)) || (nextPlan(p, sessions) || {}).plan;
  if (!plan) return {planId:null, tplId:null, name:'Freies Training', pr, items:[], est:5};
  let lst = plan.items.map(it => ({id:it.exId, ss:!!it.ss}));
  if (pr.deload && lst.length > 3) lst = lst.slice(0, Math.max(3, Math.ceil(lst.length * 0.7)));
  if (pr.phase === 'max' && lst.length > 6) lst = lst.slice(0, 6); /* Maximalkraft: weniger Übungen, dafür schwerer */
  if (pr.phase === 'power') { /* Kontrast: Sprung direkt nach der schweren Grundübung, ohne Pause dazwischen */
    lst = lst.filter((x, i) => i < 7 || x.id === 'handle-hold'); /* weniger Volumen, Handle-Hold bleibt */
    for (let i = 0; i < lst.length - 1; i++) if (EX[lst[i].id].plyo && (EX[lst[i + 1].id].main || (EX[lst[i + 1].id].c && EX[lst[i + 1].id].l))) { const t = lst[i]; lst[i] = {...lst[i + 1], ss:true}; lst[i + 1] = {...t, ss:false}; i++; }
  }
  let ids = lst.map(x => x.id);
  const items = ids.map((id, i) => exPlan(p, id, i, pr, sessions));
  items.forEach((it, i) => { it.ss = lst[i].ss && i < items.length - 1; }); /* Supersatz mit der nächsten Übung */
  if (typeof applyVol === 'function') applyVol(p, items, pr); /* Volumensteuerung je Muskel */
  /* Wakeboard-Fokus: Griff-Finisher, außer der Plan fordert den Griff schon (Unterarm-, Hang- oder Halteübung) */
  const GRIP_HEAVY = ['hanging-leg','hanging-knee','handle-hold','toes-bar','klimmzuege','klimmzug-unter','klimmzug-neutral'];
  const rot = GRIP_BY_PHASE[pr.phase] || GRIP_ROT;
  if (p.wake && pr.phase !== 'taper' && !ids.some(id => EX[id].m === 'Unterarme' || (GRIP_HEAVY.includes(id) && pr.phase !== 'power'))) items.push(exPlan(p, rot[n % rot.length], 99, pr, sessions));
  const est = 5 + items.reduce((a, it) => a + it.sets * (it.mode === 'pct' ? 3.5 : 2.3), 0);
  return {planId:plan.id, tplId:plan.id, name:plan.name, color:plan.color, pr, items, est:Math.round(est / 5) * 5};
}

/* ===== Fortschritt nach einer Einheit ===== */
function entryHit(x) {
  const pl = x.plan; if (!pl || pl.mode !== 'pct') return null;
  const ws = workSets(x);
  return ws.length >= pl.sets && ws.every(s => s.reps >= pl.reps);
}
function entryMiss(x) {
  const pl = x.plan; if (!pl || pl.mode !== 'pct') return false;
  const ws = workSets(x), low = ws.filter(s => s.reps < pl.reps - 1).length;
  return ws.length < pl.sets - 1 || low >= Math.ceil(ws.length / 2);
}
function applyProgress(p, sess) {
  const changes = []; p.low = p.low || {};
  sess.exercises.forEach(x => {
    const e = EX[x.exId], id = x.exId; if (!e || !e.c || e.eq === 'KG') return;
    if (!workSets(x).length) return;
    const cur = e1Of(p, id), raw = sessionE1(e, x); let s1 = raw, changed = false;
    /* Relativ zum Plan bewerten: genau Plan bei „passend“ = 1RM bestätigt (Rundung der Scheiben zählt nicht als Mehrleistung).
       Einstiegseinheiten sind absichtlich leicht: dort zählt nur die tatsächliche Leistung. */
    const pl = x.plan;
    if (s1 && cur && !sess.prep && pl && pl.mode === 'pct' && pl.kg > 0 && pl.reps > 0) s1 = cur * s1 / EPLEY(pl.kg, pl.reps + RIR.ok);
    if (s1) {
      const hasOwn = p.e1 && p.e1[id];
      if (e.main && !hasOwn) { p.e1[id] = roundHalf(s1); changed = true; changes.push({id, from:null, to:p.e1[id]}); }
      else if (cur && raw > cur * 1.3) changes.push({id, from:cur, to:cur, odd:true, est:roundHalf(raw)}); /* Tippfehler-Verdacht: nicht übernehmen */
      else if (cur && s1 > cur * 1.01) { const to = roundHalf(Math.min(s1, cur * 1.1)); p.e1[id] = to; changed = true; p.low[id] = 0; changes.push({id, from:cur, to}); } /* max. +10 % pro Einheit */
      else if (cur && x.plan && x.plan.mode === 'pct' && s1 < cur * 0.93 && (x.feel === 'hard' || entryMiss(x))) {
        p.low[id] = (p.low[id] || 0) + 1;
        if (p.low[id] >= 2) { const to = roundHalf(Math.max(cur * 0.9, (cur + s1) / 2)); p.e1[id] = to; changed = true; p.low[id] = 0; changes.push({id, from:cur, to, down:true}); } /* erst nach 2 schwachen Einheiten in Folge senken */
      } else if (cur) p.low[id] = 0;
    }
    if (x.plan && x.plan.mode === 'pct') {
      let a = (p.adj && p.adj[id]) || 0; const inc = incOf(p, e);
      if (x.feel === 'hard' || entryMiss(x)) a -= inc;
      else if (!changed && x.feel === 'easy' && entryHit(x)) a += inc;
      a = Math.max(-4 * inc, Math.min(4 * inc, a));
      if (changed) a = 0;
      p.adj[id] = a;
    }
  });
  return changes;
}
function closeBlock(p, sessions) {
  const no = p.block.no, mine = sessions.filter(s => s.block === no && !s.prep), res = [];
  Object.keys(p.e1).forEach(id => {
    const e = EX[id]; if (!e) return;
    const ent = [];
    mine.forEach(s => s.exercises.forEach(x => { if (x.exId === id && x.plan && x.plan.mode === 'pct' && !(s.deload)) ent.push(x); }));
    if (!ent.length) return;
    const hits = ent.filter(x => entryHit(x)).length, ok = hits / ent.length >= 0.75;
    const from = p.e1[id], to = ok ? roundHalf(from + (e.l ? 5 : 2.5)) : from;
    res.push({id, from, to, ok, start:p.block.e1Start[id] || from});
  });
  return res;
}
function startNextBlock(p, res) {
  res.forEach(r => { p.e1[r.id] = r.to; p.adj[r.id] = 0; });
  p.block = {n:0, no:p.block.no + 1, e1Start:{...p.e1}, started:todayStr()};
  if (p.nextModel) { p.model = p.nextModel; p.nextModel = null; }
  seasonStartBlock(p, todayStr());
}

/* ===== Rechner ===== */
const PLATES = [25,20,15,10,5,2.5,1.25];
function plateCalc(total, bar) {
  bar = bar || 20; let side = (total - bar) / 2; if (side < 0) return null;
  const out = [];
  for (const pl of PLATES) { const n = Math.floor(side / pl + 1e-9); if (n) { out.push([pl, n]); side -= n * pl; } }
  return {out, rest:Math.round(side * 100) / 100};
}
function warmups(work, e) {
  const min = minKg(e), out = [];
  [[0.4,8],[0.6,5],[0.8,3]].forEach(a => {
    const kg = Math.max(min, roundTo(work * a[0], e.inc));
    if (kg < work && !out.some(o => o.kg === kg)) out.push({kg, reps:a[1], warm:true, done:false});
  });
  return out;
}
function prCheck(sessions, sess) {
  const prs = [];
  sess.exercises.forEach(x => {
    const e = EX[x.exId]; const m = metricOf(e, x); if (!m) return;
    const prev = history(sessions, x.exId); if (!prev.length) return;
    const best = Math.max(...prev.map(h => h.v));
    if (m.v > best + (m.unit === 'kg' ? 0.4 : 0)) prs.push({id:x.exId, v:m.v, unit:m.unit, prev:best});
  });
  return prs;
}
