'use strict';
/* ===== Eisenbuch: Wakeboard-Progression =====
   Aufbau nach Bereichen und 10 Leveln (angelehnt an die Wakebook-Struktur von wakeboard-progress.com),
   Voraussetzungen, Status und Punkte sind eigene Ergänzungen. Status: 0 offen, 1 übe ich, 2 gestanden, 3 sitzt. */
const T_AREAS = {S:['Starts','#E5675B'], F:['Surface','#6DB37A'], K:['Kicker','#F2C744'], R:['Box & Rail','#5B9BE5'], A:['Air','#8B7CF6']};
const T_STAT = [['Offen','var(--soft)'], ['Übe ich','var(--warn)'], ['Gestanden','var(--acc)'], ['Sitzt','var(--play)']];
/* id | Name | Bereich | Level | Voraussetzungen (Komma) | Tipp */
const T_RAW = `
dock-sit|Dock Start sitzend|S|1||Sitzend auf dem Steg, Knie an die Brust, Board quer. Zug kommen lassen, nicht aufstehen wollen: der Zug stellt dich hin.
first-corner|Erste Kurve|F|1|dock-sit|Vor der Kurve leicht auf die Fersen, Blick in die Kurve, Handle tief an der Hüfte. Im Bogen Zug halten.
full-round|Ganze Runde|F|1|first-corner|Ruhig fahren, Knie gebeugt, Arme fast gestreckt. Vor jeder Ecke Druck aufbauen, danach locker lassen.
dock-stand|Dock Start stehend|S|2|dock-sit|Vorne am Steg stehen, Handle an der Hüfte, beim Zug einen kleinen Schritt aufs Wasser, nicht springen.
sw-dock-sit|Switch Dock Start sitzend|S|2|dock-sit|Wie der normale Sitzstart, nur mit dem anderen Fuß vorn. Danach direkt Switch weiterfahren.
fakie|Fakie fahren|F|2|full-round|Ohne Drehung rückwärts fahren, also mit dem hinteren Fuß voraus. Gewicht mittig, Schultern bleiben in Fahrtrichtung.
sw-corner|Switch erste Kurve|F|2|full-round,sw-dock-sit|Erste Kurve mit dem anderen Fuß vorn. Langsam und tief anfahren.
side-slide|Side Slide|F|2|full-round|Board kurz quer stellen und flach rutschen lassen, Kante leicht anheben, Handle nah am Körper.
sw-round|Switch ganze Runde|F|3|sw-corner|Komplette Runde Switch. Die Grundlage für alle Switch-Varianten.
sw-dock-stand|Switch Dock Start stehend|S|3|dock-stand,sw-dock-sit|Stehender Start mit dem anderen Fuß vorn.
surf-fs180|Surface FS180|F|3|fakie,side-slide|Aus dem Side Slide mit Blick über die vordere Schulter weiterdrehen, Handle an der Hüfte, nicht hochziehen.
toeside|Toeside fahren|F|3|full-round|Auf den Zehen kanten, Hüfte zum Lift, Brust raus. Fühlt sich zuerst wackelig an, Knie weich lassen.
k-straight-s|Straight Air (kleiner Kicker)|K|3|full-round|Gerade und ruhig anfahren, auf dem Kicker nicht kanten, Knie in der Luft anziehen, weich mit beiden Füßen landen.
b-5050|50-50 auf der Box|R|3|full-round|Board in Längsrichtung über die Box, Gewicht mittig, Blick ans Ende. Nicht auf der Box kanten.
edging|Kanten und kurze Turns|F|4|toeside|Bewusst von Heel- auf Toeside wechseln und zurück, kurze Bögen fahren, Zug gleichmäßig halten.
powerslide|Powerslide|F|4|edging|Board stark querstellen und mit Druck auf der Kante bremsen, Oberkörper aufrecht.
surf-bs180|Surface BS180|F|4|surf-fs180,toeside|Drehung über die hintere Schulter. Handle kurz hinter dem Rücken lassen, Blick führt die Drehung.
ollie|Ollie|F|4|edging|Hinteren Fuß kräftig belasten, dann abspringen und Knie anziehen. Erst auf flachem Wasser, dann über die Welle.
k-straight-l|Straight Air (großer Kicker)|K|4|k-straight-s|Wie auf dem kleinen Kicker, mehr Tempo, länger in der Luft. Landung früh suchen, Knie weich.
k-fs180-s|Kicker FS180 (klein)|K|4|k-straight-s,surf-fs180|Drehung erst einleiten, wenn das Board die Kante verlässt. Blick über die vordere Schulter.
b-forward|Forward Slide auf der Box|R|4|b-5050|Board quer auf die Box, vordere Schulter Richtung Boxende, Gewicht leicht auf dem vorderen Fuß.
b-backward|Backward Slide auf der Box|R|4|b-forward|Board quer, Brust zum Lift. Ruhig bleiben, nicht nach hinten lehnen.
jump-start|Jump Start|S|4|dock-stand|Vom Steg abspringen und mit dem Zug weich aufs Wasser setzen. Timing: springen, wenn das Seil gerade straff wird.
ollie-fs180|Ollie FS180|F|5|ollie,surf-fs180|Ollie und in der Luft frontside drehen. Handle an der Hüfte halten.
heel2heel|Short Turns Heel to Heel|F|5|edging|Schnelle kurze Bögen auf der Ferse, aktiver Kantenwechsel über die Hüfte.
wheelie|Surface Wheelie|F|5|ollie|Gewicht auf das hintere Ende, Nose aus dem Wasser halten, möglichst lange balancieren.
k-fs180-l|Kicker FS180 (groß)|K|5|k-fs180-s,k-straight-l|FS180 mit mehr Höhe. Erst die Höhe, dann die Drehung.
k-grab|Easy Grab (Indy, Mute)|K|5|k-straight-l|Knie zur Hand ziehen, nicht die Hand zum Board strecken. Grab kurz halten, vor der Landung loslassen.
b-fs180|FS180 auf der Box|R|5|b-forward,surf-fs180|Auf der Box von 50-50 in die Gegenrichtung drehen. Langsam anfahren.
b-fs180out|FS180 raus (Box)|R|5|b-forward,surf-fs180|Am Ende der Box mit einem kleinen Pop frontside rausdrehen.
b-bs180|BS180 Handlepass (Box)|R|5|b-fs180,surf-bs180|Backside über die Box drehen und den Handle hinter dem Rücken übergeben.
r-5050|50-50 auf dem Rail|R|5|b-5050|Wie auf der Box, nur schmaler. Gerade anfahren, Blick ans Railende.
nollie-start|Nollie Start|S|5|jump-start,ollie|Vom Steg mit Pop über die Nose starten.
butter|Surface Butter|F|6|wheelie,surf-fs180|Auf Nose oder Tail drehen, ohne das Board ganz aus dem Wasser zu heben.
blind-ride|Blind fahren|F|6|surf-bs180|Rückwärts mit dem Handle hinter dem Rücken fahren. Vorbereitung für Blinds und Handlepasses.
surf-360|Surface 360 (Handlepass)|F|6|surf-bs180,surf-fs180|Ganze Drehung auf dem Wasser, Handle im Rücken übergeben. Kopf führt.
loaded-ollie|Loaded Ollie|F|6|ollie|Ollie mit Anlauf über eine Kante: Zug laden, dann gegen die Kante abspringen. Grundlage für alle Air-Tricks.
k-adv-grab|Advanced Grab (Melon, Stalefish)|K|6|k-grab|Schwierigere Grabs hinter dem Körper oder zwischen den Beinen.
k-fs-shifty|Frontside Shifty (Kicker)|K|6|k-straight-l|Board in der Luft kurz frontside drehen und zurück, Oberkörper bleibt stabil.
r-forward|Forward Slide auf dem Rail|R|6|r-5050,b-forward|Board quer auf dem Rail, Schultern in Fahrtrichtung.
r-backward|Backward Slide auf dem Rail|R|6|r-forward,b-backward|Backward auf dem schmalen Rail, Gewicht genau über dem Rail.
r-fs270out|FS270 raus (Rail)|R|6|r-forward,b-fs180out|Aus dem Slide frontside 270 raus, kräftiger Pop am Ende.
grab-ollie|Ollie mit Grab|F|7|loaded-ollie,k-grab|Loaded Ollie mit kurzem Grab.
ollie-bs180|Ollie BS180|F|7|ollie-fs180,surf-bs180|Backside Drehung in der Luft mit Handlepass.
k-bs180|Kicker BS180|K|7|k-fs180-l,surf-bs180|Backside vom Kicker, Handle hinter dem Rücken übergeben.
k-backroll|Backroll (Kicker)|K|7|k-straight-l|Erste Rolle: Heelside anfahren, Schulter fallen lassen, Blick über die Schulter. Erst mit Coach oder Video.
k-frontroll|Frontroll (Kicker)|K|7|k-backroll|Rolle nach vorn. Kinn zur Brust, Handle nah am Körper.
r-press|Press auf dem Rail (Nose, Tail)|R|7|r-5050,wheelie|Gewicht auf Nose oder Tail drücken und halten.
r-ollie-on|Ollie on (50-50)|R|7|r-5050,loaded-ollie|Mit Ollie aufs Rail springen statt auffahren.
r-switchup|SwitchUp 90|R|7|r-forward|Auf dem Rail von 50-50 in einen Slide wechseln.
r-bs180out|BS180 raus (Rail)|R|7|b-bs180,r-backward|Am Railende backside mit Handlepass rausdrehen.
air-backroll|Air Backroll|A|7|loaded-ollie,k-backroll|Backroll aus der eigenen Kante, ohne Kicker. Zug laden, Kante bis zum Schluss halten.
ollie-360|Ollie 360|F|8|ollie-bs180,surf-360|Volle Drehung im Ollie mit Handlepass.
k-bs360|Kicker BS360|K|8|k-bs180|360 backside vom Kicker mit Handlepass.
k-raley|Kicker Raley|K|8|k-backroll|Gestreckter Körper in der Luft, Board über den Kopf. Kraftvoll, nur mit guter Technik.
k-frontflip|Front Flip (Kicker)|K|8|k-frontroll|Salto nach vorn vom Kicker.
r-transfer|Transfer zwischen Obstacles|R|8|r-ollie-on|Von einem Obstacle aufs nächste springen.
air-raley|Air Raley|A|8|loaded-ollie|Raley aus der Kante: Körper strecken, Board hinten hoch, Handle fest an der Hüfte.
raley-start|Raley Start|S|8|jump-start,air-raley|Vom Steg direkt in einen Raley starten.
air-krypt|Krypt|A|8|air-raley,surf-fs180|Raley mit frontside 180 zur Landung.
r-fs540out|FS540 raus|R|9|r-fs270out,surf-360|1,5 Drehungen frontside vom Rail.
air-frontroll|Air Front Roll|A|9|air-backroll,k-frontroll|Frontroll aus der Kante ohne Kicker.
air-911|911|A|9|air-krypt|Raley mit Handlepass hinter dem Rücken.
air-blindjudge|Blind Judge|A|9|air-frontroll|Frontroll mit Blind-Landung.
air-313|313|A|10|air-raley,ollie-bs180|Raley mit Handlepass-Drehung (Tantrum to blind).
air-mobe|Mobe|A|10|air-backroll,air-frontroll|Doppelter Flip mit Handlepass.
air-sbend|S-Bend|A|10|air-raley,air-backroll|Invertierter Raley mit Rolle.
air-kgb|KGB|A|10|air-911|Kombination aus Raley, Handlepass und Rotation.
k-mobe|Mobe (Kicker)|K|10|k-backroll,k-bs360|Mobe vom Kicker.
`;
const TRICKS = T_RAW.trim().split('\n').map(l => { const f = l.split('|'); return {id:f[0], name:f[1], a:f[2], lvl:+f[3], pre:f[4] ? f[4].split(',') : [], tip:f[5]}; });
const TR = {}; TRICKS.forEach(t => { TR[t.id] = t; });

function tStat(id) { return (S.p.tricks && S.p.tricks[id] && S.p.tricks[id].s) || 0; }
function tPoints(t, s) { return s >= 3 ? t.lvl * 10 : s === 2 ? t.lvl * 5 : 0; }
function riderStats() {
  let xp = 0, landed = 0, solid = 0;
  TRICKS.forEach(t => { const s = tStat(t.id); xp += tPoints(t, s); if (s >= 2) landed++; if (s >= 3) solid++; });
  /* Rider-Level: höchstes Level L, bei dem mindestens 70 % aller Tricks bis L gestanden sind */
  let lvl = 0;
  for (let L = 1; L <= 10; L++) { const up = TRICKS.filter(t => t.lvl <= L); if (up.filter(t => tStat(t.id) >= 2).length / up.length >= 0.7) lvl = L; else break; }
  const nx = TRICKS.filter(t => t.lvl <= lvl + 1), need = lvl < 10 ? Math.max(0, Math.ceil(nx.length * 0.7) - nx.filter(t => tStat(t.id) >= 2).length) : 0;
  return {xp, landed, solid, lvl, need};
}
function preOk(t) { return t.pre.every(id => tStat(id) >= 2); }
/* Als Nächstes: noch nicht sicher, Voraussetzungen gestanden, Level höchstens Rider-Level + 2; "Übe ich" zuerst */
function nextTricks(n) {
  const r = riderStats();
  return TRICKS.filter(t => tStat(t.id) < 3 && preOk(t) && t.lvl <= r.lvl + 2)
    .filter(t => tStat(t.id) !== 2 || t.lvl <= r.lvl)
    .sort((a, b) => { const o = s => s === 1 ? 0 : s === 0 ? 1 : 2; return o(tStat(a.id)) - o(tStat(b.id)) || a.lvl - b.lvl; }).slice(0, n || 6); /* Übe ich, dann neue, dann festigen */
}
function trickRow(t) {
  const s = tStat(t.id), ar = T_AREAS[t.a], ok = preOk(t);
  return '<div class="trow"><span class="av" style="--c:' + ar[1] + '">' + t.lvl + '</span><button class="exm" data-act="tr-open" data-v="' + t.id + '"><b>' + esc(t.name) + '</b><small>' + ar[0] + ' · Level ' + t.lvl + (ok || s ? '' : ' · Voraussetzung fehlt') + '</small></button>' +
    '<button class="tst s' + s + '" data-act="tr-cycle" data-v="' + t.id + '" aria-label="Status ändern: ' + T_STAT[s][0] + '">' + T_STAT[s][0] + '</button></div>';
}
function vWake() {
  const seg = S.ui.wseg || '';
  let h = head('Wake', seasonWeeks() > 0 ? 'Saisonstart in ' + seasonWeeks() + ' Wochen' : 'Wakeboard') + segc('wseg', seg, [['', 'Tricks'], ['ses', 'Sessions'], ['grip', 'Griffkraft']]);
  if (seg === 'grip') return h + vGrip();
  if (seg === 'ses') return h + vWakeSessions();
  const r = riderStats(), pct = r.lvl >= 10 ? 100 : Math.round((1 - r.need / Math.max(1, Math.ceil(TRICKS.filter(t => t.lvl <= r.lvl + 1).length * 0.7))) * 100);
  h += '<div class="card rider"><div class="row"><div><small class="sub">Rider-Level</small><div class="rl"><b>' + r.lvl + '</b><small>/ 10</small></div></div><div class="stats" style="margin:0;flex:1;max-width:240px"><div><small>Punkte</small><b>' + r.xp + '</b></div><div><small>Gestanden</small><b>' + r.landed + '</b></div><div><small>Sitzen</small><b>' + r.solid + '</b></div></div></div>' +
    (r.lvl < 10 ? '<div class="meter" style="margin-top:12px"><span style="width:' + pct + '%"></span></div><p class="hint" style="margin-top:6px">Noch ' + r.need + ' Trick' + (r.need === 1 ? '' : 's') + ' bis Level ' + (r.lvl + 1) + ' (70 % aller Tricks bis Level ' + (r.lvl + 1) + ' gestanden). Gestanden zählt Level × 5 Punkte, sitzt Level × 10.</p>' : '') + '</div>';
  const nx = nextTricks(6);
  h += '<h2 class="sec">Als Nächstes</h2><div class="list">' + (nx.length ? nx.map(trickRow).join('') : '<div class="empty">Alles erledigt, was gerade freigeschaltet ist.</div>') + '</div>';
  /* Level-Übersicht */
  h += '<h2 class="sec">Fortschritt je Level</h2><div class="lvls">' + Array.from({length:10}, (_, i) => { const L = i + 1, ts = TRICKS.filter(t => t.lvl === L), d = ts.filter(t => tStat(t.id) >= 2).length; return '<button class="lvl' + (S.ui.tl === L ? ' on' : '') + '" data-act="tr-lvl" data-v="' + L + '"><small>L' + L + '</small><i><em style="height:' + Math.round(d / ts.length * 100) + '%"></em></i><small class="num">' + d + '/' + ts.length + '</small></button>'; }).join('') + '</div>';
  if (S.ui.tl === undefined) S.ui.tl = Math.min(10, r.lvl + 1); /* Standard: das nächste Level */
  const af = S.ui.ta || '', lf = S.ui.tl || 0;
  h += '<div class="row" style="margin-top:10px"><span class="sub">' + (lf ? 'Level ' + lf + ' (anderes Level oben antippen)' : 'Alle Level') + '</span>' + (lf ? '<button class="link" data-act="tr-lvl" data-v="0">Alle Level zeigen</button>' : '') + '</div>';
  h += '<div class="chips scrollchips">' + [['', 'Alle']].concat(Object.entries(T_AREAS).map(([k, v]) => [k, v[0]])).map(x => '<button class="chip" data-act="tr-area" data-v="' + x[0] + '" aria-pressed="' + (af === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
  const list = TRICKS.filter(t => (!af || t.a === af) && (!lf || t.lvl === lf));
  let cur = 0, out = '';
  list.forEach(t => { if (t.lvl !== cur) { if (cur) out += '</div>'; out += '<h2 class="sec">Level ' + t.lvl + '</h2><div class="list">'; cur = t.lvl; } out += trickRow(t); });
  h += (out ? out + '</div>' : '<div class="empty">Keine Tricks in dieser Auswahl.</div>') + '<p class="hint" style="margin-top:14px">Tippe auf den Status, um ihn weiterzuschalten (Offen → Übe ich → Gestanden → Sitzt). Tippe auf den Namen für Tipp, Voraussetzungen und Videos. Trick-Struktur angelehnt an das Wakebook von wakeboard-progress.com.</p>';
  return h;
}
function trickSheet(id) {
  const t = TR[id], s = tStat(id), ar = T_AREAS[t.a], st = (S.p.tricks && S.p.tricks[id]) || {};
  const ses = S.wake.filter(w => (w.tricks || []).some(x => x.id === id));
  return '<p class="eyebrow">' + ar[0] + ' · Level ' + t.lvl + '</p><h2>' + esc(t.name) + '</h2><p>' + esc(t.tip) + '</p>' +
    (t.pre.length ? '<h3 style="margin-top:12px">Voraussetzungen</h3><div class="list">' + t.pre.map(p => { const q = TR[p], qs = tStat(p); return '<button class="exitem" data-act="tr-open" data-v="' + p + '"><span class="av" style="--c:' + T_AREAS[q.a][1] + '">' + q.lvl + '</span><span class="exm"><b>' + esc(q.name) + '</b><small>' + T_STAT[qs][0] + '</small></span>' + (qs >= 2 ? I(ICONS.check, 'i s') : '') + '</button>'; }).join('') + '</div>' : '') +
    '<h3 style="margin-top:12px">Status</h3><div class="chips">' + T_STAT.map((x, i) => '<button class="chip" data-act="tr-set" data-v="' + id + ':' + i + '" aria-pressed="' + (s === i) + '">' + x[0] + '</button>').join('') + '</div>' +
    (st.ts ? '<p class="hint" style="margin-top:6px">Zuletzt geändert: ' + esc(dshort(st.ts)) + (st.first ? ' · erstmals gestanden: ' + esc(dshort(st.first)) : '') + '</p>' : '') +
    (ses.length ? '<p class="sub" style="margin-top:8px">In ' + ses.length + ' Session' + (ses.length === 1 ? '' : 's') + ' geübt, ' + ses.filter(w => w.tricks.some(x => x.id === id && x.ok)).length + '× gelandet.</p>' : '') +
    '<label class="lab" for="tr-note">Notiz</label><textarea id="tr-note" placeholder="z. B. Kante länger halten, Handle tiefer">' + esc(st.note || '') + '</textarea><button class="btn sm ghost" style="margin-top:6px" data-act="tr-note" data-v="' + id + '">Notiz speichern</button>' +
    '<p style="margin-top:14px"><a class="link" href="https://www.youtube.com/results?search_query=' + encodeURIComponent('wakeboard ' + t.name.replace(/\(.*\)/, '') + ' tutorial') + '" target="_blank" rel="noopener">Tutorial-Videos auf YouTube suchen</a></p>';
}
function setTrick(id, s) {
  S.p.tricks = S.p.tricks || {};
  const cur = S.p.tricks[id] || {};
  S.p.tricks[id] = {...cur, s, ts:todayStr(), first:cur.first || (s >= 2 ? todayStr() : null)};
  saveProfile();
}

/* ----- Wake-Sessions ----- */
const W_SPOTS = ['Cable (Lift)', '2-Mast-Anlage', 'Boot', 'Winch', 'Sonstiges'];
function saveWake(w) { lsSave(); Cloud.put('wake', w.id, w); }
function vWakeSessions() {
  const f = S.ui.wf2 || (S.ui.wf2 = {date:todayStr(), spot:W_SPOTS[0], min:'', laps:'', sel:{}, note:''});
  const cand = TRICKS.filter(t => tStat(t.id) === 1 || nextTricks(10).includes(t) || f.sel[t.id] !== undefined);
  let h = '<div class="card"><h2>Session eintragen</h2><div class="pair"><div><label class="lab" for="ws-date">Datum</label><input type="date" id="ws-date" data-in="ws" data-f="date" value="' + esc(f.date) + '"></div>' +
    '<div><label class="lab" for="ws-spot">Ort</label><select id="ws-spot" data-in="ws" data-f="spot">' + W_SPOTS.map(x => '<option' + (x === f.spot ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="ws-min">Fahrzeit (min)</label><input type="text" inputmode="numeric" id="ws-min" data-in="ws" data-f="min" value="' + esc(f.min) + '" placeholder="z. B. 60"></div>' +
    '<div><label class="lab" for="ws-laps">Runden (optional)</label><input type="text" inputmode="numeric" id="ws-laps" data-in="ws" data-f="laps" value="' + esc(f.laps) + '"></div></div>' +
    '<label class="lab">Geübte Tricks (einmal tippen: geübt, zweimal: gelandet)</label><div class="chips">' + cand.map(t => { const v = f.sel[t.id]; return '<button class="chip' + (v === 'ok' ? ' ok' : '') + '" data-act="ws-trick" data-v="' + t.id + '" aria-pressed="' + (v !== undefined) + '">' + (v === 'ok' ? '✓ ' : '') + esc(t.name) + '</button>'; }).join('') +
    '<button class="chip" data-act="ws-more">+ weiterer Trick</button></div>' +
    '<label class="lab" for="ws-note">Notiz</label><input type="text" id="ws-note" data-in="ws" data-f="note" value="' + esc(f.note) + '" placeholder="Wind, Wasser, Gefühl, Stürze">' +
    '<button class="btn wide" style="margin-top:12px" data-act="ws-save">Session speichern</button><p class="hint" style="margin-top:6px">Gelandete Tricks werden automatisch auf „Gestanden“ gesetzt. Nach Landungen in 3 verschiedenen Sessions schlägt die App „Sitzt“ vor.</p></div>';
  if (!S.wake.length) return h + '<div class="empty">Noch keine Session. Nach dem ersten Tag am Wasser hier eintragen.</div>';
  const mins = S.wake.reduce((a, w) => a + (w.min || 0), 0), yr = todayStr().slice(0, 4), thisY = S.wake.filter(w => w.date.startsWith(yr));
  h += '<div class="stats tiles"><div><small>Sessions ' + yr + '</small><b>' + thisY.length + '</b></div><div><small>Fahrzeit gesamt</small><b>' + (mins >= 60 ? fmt(Math.round(mins / 6) / 10) + ' h' : mins + ' min') + '</b></div><div><small>Gelandet</small><b>' + S.wake.reduce((a, w) => a + (w.tricks || []).filter(x => x.ok).length, 0) + '</b></div></div>';
  return h + '<div class="list">' + S.wake.slice().sort((a, b) => a.date < b.date ? 1 : -1).map(wakeBtn).join('') + '</div>';
}
function wakeBtn(w) {
  const ok = (w.tricks || []).filter(x => x.ok).length;
  return '<button class="prow" data-act="wk-open" data-v="' + w.id + '"><span class="dayc date" style="--c:#14B8A6"><b>' + parseD(w.date).getDate() + '</b><small>' + DAYS[wdOf(w.date)] + '</small></span><span class="pt"><b>' + esc(w.spot) + (w.min ? ' · ' + w.min + ' min' : '') + '</b><small>' + (w.tricks || []).length + ' Tricks geübt · ' + ok + ' gelandet' + (w.note ? ' · ' + esc(w.note) : '') + '</small></span>' + I(ICONS.wave, 'i s ago') + '</button>';
}
function wakeSave() {
  const f = S.ui.wf2, ids = Object.keys(f.sel);
  if (!(parseNum(f.min) > 0) && !ids.length) { toast('Fahrzeit oder mindestens einen Trick eintragen.'); return; }
  const w = {id:uid('w'), date:f.date || todayStr(), spot:f.spot, min:Math.round(parseNum(f.min) || 0), laps:Math.round(parseNum(f.laps) || 0) || null, tricks:ids.map(id => ({id, ok:f.sel[id] === 'ok'})), note:(f.note || '').trim()};
  S.wake.push(w); saveWake(w);
  const sug = [];
  w.tricks.forEach(x => {
    if (x.ok && tStat(x.id) < 2) setTrick(x.id, 2);
    else if (!x.ok && tStat(x.id) === 0) setTrick(x.id, 1);
    const days = new Set(S.wake.filter(q => q.tricks.some(y => y.id === x.id && y.ok)).map(q => q.date));
    if (x.ok && days.size >= 3 && tStat(x.id) === 2) sug.push(x.id);
  });
  S.ui.wf2 = null;
  if (sug.length) { S.ui.sheet = {t:'trsug', ids:sug}; }
  render(); toast('Session gespeichert.');
}
