'use strict';
/* ===== Eisenbuch: Wakeboard-Progression =====
   Aufbau nach Bereichen und 10 Leveln (angelehnt an die Wakebook-Struktur von wakeboard-progress.com),
   Voraussetzungen, Status und Punkte sind eigene Ergänzungen.
   Jeder Trick wird in zwei Stances geführt: Regular ('s') und Switch ('w').
   Status: 0 offen, 1 übe ich, 2 gestanden, 3 sitzt. */
const T_AREAS = {S:['Starts','#E5675B'], F:['Surface','#6DB37A'], K:['Kicker','#F2C744'], R:['Box & Rail','#5B9BE5'], A:['Air','#8B7CF6']};
const T_STAT = [['Offen','var(--soft)'], ['Übe ich','var(--warn)'], ['Gestanden','var(--acc)'], ['Sitzt','var(--play)']];
const T_SHORT = ['–', 'Übe', 'Steht', 'Sitzt'];
const STANCE = {s:'Regular', w:'Switch'};
/* id | Name | Bereich | Level | Voraussetzungen (Komma) | Tipp
   Die früheren eigenständigen Switch-Tricks (Switch Dock Start, Switch Kurve, Switch Runde) sind entfallen –
   sie sind jetzt die Switch-Spur des jeweiligen Grundtricks. */
const T_RAW = `
dock-sit|Dock Start sitzend|S|1||Sitzend auf dem Steg, Knie an die Brust, Board quer. Zug kommen lassen, nicht aufstehen wollen: der Zug stellt dich hin.
first-corner|Erste Kurve|F|1|dock-sit|Vor der Kurve leicht auf die Fersen, Blick in die Kurve, Handle tief an der Hüfte. Im Bogen Zug halten.
full-round|Ganze Runde|F|1|first-corner|Ruhig fahren, Knie gebeugt, Arme fast gestreckt. Vor jeder Ecke Druck aufbauen, danach locker lassen.
dock-stand|Dock Start stehend|S|2|dock-sit|Vorne am Steg stehen, Handle an der Hüfte, beim Zug einen kleinen Schritt aufs Wasser, nicht springen.
fakie|Fakie fahren|F|2|full-round|Ohne Drehung rückwärts fahren, also mit dem hinteren Fuß voraus. Gewicht mittig, Schultern bleiben in Fahrtrichtung.
side-slide|Side Slide|F|2|full-round|Board kurz quer stellen und flach rutschen lassen, Kante leicht anheben, Handle nah am Körper.
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
ollie-shifty|Ollie Shifty|F|7|loaded-ollie,k-fs-shifty|Im Loaded Ollie das Board kurz quer drehen und vor der Landung zurück.
ollie-bs180|Ollie BS180|F|7|ollie-fs180,surf-bs180|Backside Drehung in der Luft mit Handlepass.
k-backroll|Backroll (Kicker)|K|7|k-straight-l|Erste Rolle: Heelside anfahren, Schulter fallen lassen, Blick über die Schulter. Erst mit Coach oder Video.
k-tantrum|Tantrum (Kicker)|K|7|k-straight-l|Rückwärtssalto von der Heelside-Kante: Schultern gerade lassen, Kante bis zur Lippe halten, Kopf führt nach hinten.
k-tsbackroll|Toeside Backroll (Kicker)|K|7|k-backroll,toeside|Backroll aus der Toeside-Anfahrt, Schulter in Richtung Wasser fallen lassen.
k-mexroll|Mexican Roll (Kicker)|K|7|k-straight-l|Heelside anfahren, Kopf und Körper beim Absprung nach vorn werfen. Wird oft mit dem Frontroll verwechselt.
k-frontroll|Frontroll (Kicker)|K|7|k-backroll,toeside|Toeside anfahren, Kinn zur Brust, Kopf und Körper nach vorn werfen, Handle nah am Körper.
k-rtr|Roll to Revert (Kicker)|K|7|k-backroll,surf-fs180|Backroll mit Frontside-180, Landung switch.
k-scarecrow|Scarecrow (Kicker)|K|7|k-frontroll,surf-fs180|Toeside Frontroll mit Frontside-180.
k-frontflip|Front Flip (Kicker)|K|7|k-frontroll|Salto nach vorn, Tail kommt über den Kopf.
r-press|Press auf dem Rail (Nose, Tail)|R|7|r-5050,wheelie|Gewicht auf Nose oder Tail drücken und halten.
r-ollie-on|Ollie on (50-50)|R|7|r-5050,loaded-ollie|Mit Ollie aufs Rail springen statt auffahren.
r-switchup|SwitchUp 90|R|7|r-forward|Auf dem Rail von 50-50 in einen Slide wechseln.
r-bs180out|BS180 raus (Rail)|R|7|b-bs180,r-backward|Am Railende backside mit Handlepass rausdrehen.
k-bs180|Kicker BS180|K|7|k-fs180-l,surf-bs180|Backside vom Kicker, Handle hinter dem Rücken übergeben.
air-backroll|Air Backroll|A|7|loaded-ollie,k-backroll|Backroll aus der eigenen Kante, ohne Kicker. Zug laden, Kante bis zum Schluss halten.
air-rtr|Air Roll to Revert|A|7|air-backroll,surf-fs180|Air Backroll mit Frontside-180, Landung switch.
ollie-360|Ollie BS360 (Handlepass)|F|8|ollie-bs180,surf-360|Volle Backside-Drehung im Ollie mit Handlepass.
ollie-fs360|Ollie FS360 (Handlepass)|F|8|ollie-fs180,surf-360|Volle Frontside-Drehung im Ollie, Handlepass am Ende der Drehung.
ollie-fs540|Ollie FS540|F|8|ollie-fs360|Eineinhalb Drehungen frontside im Ollie, Landung switch.
k-bs360|Kicker BS360|K|8|k-bs180|360 backside vom Kicker mit Handlepass.
k-raley|Kicker Raley|K|8|k-straight-l|Beine nach hinten oben strecken, Körper waagerecht, Board über Kopfhöhe. Kraftvoll, nur mit guter Technik.
k-krypt|Kicker Krypt|K|8|k-raley,k-fs180-l|Raley mit Frontside-180, Landung switch.
k-911|Kicker 911|K|8|k-raley,k-fs-shifty|Raley mit Shifty: Board im gestreckten Raley kurz querdrehen.
k-halfcab|Half Cab Roll (Kicker)|K|8|k-rtr|Aus Switch: Heelside Backroll mit Frontside-180, Landung wieder regular.
k-elephant|Elephant (Kicker)|K|8|k-scarecrow|Scarecrow to Fakie: Frontroll mit Frontside-180 und Rewind.
r-transfer|Transfer zwischen Obstacles|R|8|r-ollie-on|Von einem Obstacle aufs nächste springen.
air-raley|Air Raley|A|8|loaded-ollie|Raley aus der Kante: Beine nach hinten oben strecken, Board hinten hoch, Handle fest an der Hüfte.
air-krypt|Air Krypt|A|8|air-raley,surf-fs180|Raley mit Frontside-180, Landung switch.
raley-start|Raley Start|S|8|jump-start,air-raley|Vom Steg direkt in einen Raley starten.
r-fs540out|FS540 raus|R|9|r-fs270out,surf-360|1,5 Drehungen frontside vom Rail.
k-sbend|Kicker S-Bend|K|9|k-raley,k-bs180|Raley mit Backside-360 als Ole: Handle über den Kopf heben statt übergeben.
k-blindjudge|Kicker Blind Judge|K|9|k-raley,k-bs180|Raley mit Backside-180, Landung blind.
k-313|Kicker 313|K|9|k-raley,k-bs360|Raley mit Handlepass und Frontside-360.
k-whirly|Whirlybird (Kicker)|K|9|k-tantrum,k-bs180|Tantrum mit Backside-360 als Ole, Handle mit der vorderen Hand über den Kopf führen.
k-glide|Hoochie Glide (Kicker)|K|9|k-raley,k-adv-grab|Raley mit Method-Grab der vorderen Hand.
k-mobe|Back Mobe (Kicker)|K|9|k-backroll,k-bs360|Heelside Backroll mit Handlepass und Frontside-360.
air-frontroll|Air Frontroll|A|9|air-backroll,k-frontroll|Frontroll aus der Toeside-Kante ohne Kicker.
air-frontflip|Air Front Flip|A|9|air-frontroll,k-frontflip|Salto nach vorn aus der Kante, Tail über den Kopf.
air-911|Air 911|A|9|air-raley|Air Raley mit Shifty: Board im gestreckten Raley querdrehen und zurück.
air-blindjudge|Air Blind Judge|A|9|air-raley,blind-ride|Air Raley mit Backside-180, Landung blind (Handle hinter dem Rücken).
air-sbend|Air S-Bend|A|9|air-raley,surf-bs180|Air Raley mit Backside-360 als Ole: Handle über den Kopf statt übergeben.
air-vulcan|Air Vulcan (S-Bend to Fakie)|A|9|air-sbend,surf-fs180|S-Bend mit zusätzlichem Frontside-180, Landung fakie.
air-kgb|Air KGB|A|9|air-backroll,surf-bs180|Heelside Air Backroll mit Backside-360 als Ole.
air-313|Air 313|A|9|air-raley,surf-360|Air Raley mit Handlepass und Frontside-360 (Raley-Mobe).
air-backmobe|Air Back Mobe|A|9|air-backroll,surf-360|Heelside Air Backroll mit Handlepass und Frontside-360.
air-belair|Bel Air (Air Tantrum)|A|9|air-backroll,k-tantrum|Whip-Trick: Rückwärtssalto aus der Heelside-Kante ohne Kicker. Zug voll laden, Schultern nicht aufdrehen.
air-belair180|Bel Air FS180|A|9|air-belair,surf-fs180|Bel Air mit Frontside-180, Landung switch.
air-benair|Ben Air|A|9|air-belair|Whip-Variante neben dem Bel Air (Wakebook Level 9). Technik vorab mit Coach oder Video klären.
air-belairmobe|Bel Air Mobe (Air Moby Dick)|A|10|air-belair,air-backmobe|Air Tantrum mit Handlepass und Backside-360.
air-tsraley|Toeside Raley|A|10|air-raley,toeside|Raley aus der Toeside-Kante.
air-tsmobe|Toeside Mobe (z. B. Crow Mobe)|A|10|air-frontroll,surf-360|Toeside Frontroll mit Frontside-360.
air-sbendblind|S-Bend to Blind|A|10|air-sbend,air-blindjudge|S-Bend mit zusätzlichem Backside-180, Landung blind.
air-540mobe|540 Raley Mobe|A|10|air-313|Raley-Mobe mit 1,5 Umdrehungen.
air-doubleroll|Double Roll|A|10|air-backroll,air-kgb|Zwei Backrolls in einem Sprung. Nur mit sehr viel Pop und Coaching.
`;
const TRICKS = T_RAW.trim().split('\n').map(l => { const f = l.split('|'); return {id:f[0], name:f[1], a:f[2], lvl:+f[3], pre:f[4] ? f[4].split(',') : [], tip:f[5]}; });
const TR = {}; TRICKS.forEach(t => { TR[t.id] = t; });
/* Switch nach Wakebook-Logik: Switch-Grundlagen (Starts, Kurve, Runde) gehören zu Level 3, jeder Switch-Trick
   liegt sonst im Level des Grundtricks. Ein Level ist mit der starken Seite geöffnet und mit Switch abgeschlossen. */
function swl(t) { return Math.max(t.lvl, 3); }
/* Switch-Voraussetzung: Trick regular gestanden und alle Voraussetzungen auch in Switch gestanden */
function preOkW(t) { return tSt(t.id, 's') >= 2 && t.pre.every(id => tSt(id, 'w') >= 2); }

/* Alte Trick-IDs übernehmen: frühere eigene Switch-Tricks werden zur Switch-Spur, der allgemeine „Mobe“ zum Air Back Mobe */
function migrateTricks(p) {
  const t = p.tricks; if (!t) return;
  const mv = (from, to, k) => { const o = t[from]; if (!o) return; const st = o.s || 0; t[to] = t[to] || {}; if (st > (t[to][k] || 0)) { t[to][k] = st; if (st >= 2) t[to][k === 's' ? 'first' : 'fw'] = t[to][k === 's' ? 'first' : 'fw'] || o.first || o.ts || null; } delete t[from]; };
  mv('sw-dock-sit', 'dock-sit', 'w'); mv('sw-dock-stand', 'dock-stand', 'w'); mv('sw-corner', 'first-corner', 'w'); mv('sw-round', 'full-round', 'w'); mv('air-mobe', 'air-backmobe', 's');
}
/* Status einer Stance (k = 's' Regular, 'w' Switch) */
function tSt(id, k) { const o = S.p.tricks && S.p.tricks[id]; return (o && o[k || 's']) || 0; }
function tStat(id) { return tSt(id, 's'); } /* Regular, für bestehende Aufrufe */
function tPoints(t, s) { return s >= 3 ? t.lvl * 10 : s === 2 ? t.lvl * 5 : 0; }
/* höchstes Level L, bei dem mindestens 70 % aller Tricks bis L in dieser Stance gestanden sind */
function levelOf(k) {
  const lv = k === 'w' ? swl : (t => t.lvl);
  let lvl = 0;
  for (let L = 1; L <= 10; L++) { const up = TRICKS.filter(t => lv(t) <= L); if (!up.length || up.filter(t => tSt(t.id, k) >= 2).length / up.length >= 0.7) lvl = L; else break; }
  return lvl;
}
function riderStats() {
  let xp = 0, landed = 0, solid = 0, swLanded = 0, both = 0;
  TRICKS.forEach(t => {
    const s = tSt(t.id, 's'), w = tSt(t.id, 'w');
    xp += tPoints(t, s) + tPoints(t, w);
    if (s >= 2) landed++; if (s >= 3) solid++; if (w >= 2) swLanded++;
    if (s >= 2 && w >= 2) both++;
  });
  const lvl = levelOf('s'), swlvl = levelOf('w'), closed = Math.min(lvl, swlvl);
  const nx = TRICKS.filter(t => t.lvl <= lvl + 1), need = lvl < 10 ? Math.max(0, Math.ceil(nx.length * 0.7) - nx.filter(t => tSt(t.id, 's') >= 2).length) : 0;
  return {xp, landed, solid, swLanded, both, lvl, swlvl, closed, need};
}
/* Voraussetzungen gelten über die Regular-Spur */
function preOk(t) { return t.pre.every(id => tSt(id, 's') >= 2); }
/* Als Nächstes: Items {t, k}. Regular-Tricks in Reichweite, dazu Switch für bereits regular gestandene Tricks. */
function nextTricks(n) {
  const r = riderStats();
  const reg = TRICKS.filter(t => tSt(t.id, 's') < 3 && preOk(t) && t.lvl <= r.lvl + 2)
    .filter(t => tSt(t.id, 's') !== 2 || t.lvl <= r.lvl).map(t => ({t, k:'s'}));
  /* Switch: Voraussetzungen erfüllt, höchstens ein Level über dem geöffneten, zuerst was offene Level abschließt */
  const sw = TRICKS.filter(t => tSt(t.id, 'w') < 3 && preOkW(t) && swl(t) <= r.lvl + 1)
    .filter(t => tSt(t.id, 'w') !== 2 || swl(t) <= r.lvl).map(t => ({t, k:'w'}));
  const ord = it => { const s = tSt(it.t.id, it.k); return s === 1 ? 0 : s === 0 ? 1 : 2; };
  const by = (a, b) => ord(a) - ord(b) || (a.k === 'w' ? swl(a.t) - swl(b.t) : a.t.lvl - b.t.lvl);
  reg.sort(by); sw.sort(by);
  /* bis zu 2 Plätze für Switch reservieren, damit beidseitiges Fahren nicht untergeht */
  n = n || 6; const ns = Math.min(sw.length, 2), out = reg.slice(0, n - ns).concat(sw.slice(0, ns));
  return out.concat(reg.slice(n - ns), sw.slice(ns)).slice(0, n);
}
function stPill(id, k) { const s = tSt(id, k), lk = k === 'w' && !s && !preOkW(TR[id]); return '<button class="tst2 s' + s + (lk ? ' lk' : '') + '" data-act="tr-cycle" data-v="' + id + ':' + k + '" aria-label="' + STANCE[k] + ' ' + T_STAT[s][0] + '"><em>' + (k === 's' ? 'Reg' : 'Sw') + '</em>' + T_SHORT[s] + '</button>'; }
function trickRow(t) {
  const ar = T_AREAS[t.a], ok = preOk(t), s = tSt(t.id, 's');
  return '<div class="trow"><span class="av" style="--c:' + ar[1] + '">' + t.lvl + '</span><button class="exm" data-act="tr-open" data-v="' + t.id + '"><b>' + esc(t.name) + '</b><small>' + ar[0] + ' · Level ' + t.lvl + (ok || s ? '' : ' · Voraussetzung fehlt') + '</small></button>' +
    '<span class="tstp">' + stPill(t.id, 's') + stPill(t.id, 'w') + '</span></div>';
}
/* Zeile in „Als Nächstes“: genau die empfohlene Stance */
function nextRow(it) {
  const t = it.t, k = it.k, s = tSt(t.id, k), ar = T_AREAS[t.a];
  return '<div class="trow"><span class="av" style="--c:' + ar[1] + '">' + t.lvl + '</span><button class="exm" data-act="tr-open" data-v="' + t.id + '"><b>' + esc(t.name) + (k === 'w' ? ' <span class="swtag">Switch</span>' : '') + '</b><small>' + ar[0] + ' · Level ' + (k === 'w' ? swl(t) : t.lvl) + (k === 'w' && swl(t) <= riderStats().lvl ? ' · schließt Level ab' : '') + '</small></button>' +
    '<button class="tst s' + s + '" data-act="tr-cycle" data-v="' + t.id + ':' + k + '">' + T_STAT[s][0] + '</button></div>';
}
function vWake() {
  const seg = S.ui.wseg || '';
  let h = head('Wake', seasonWeeks() > 0 ? 'Saisonstart in ' + seasonWeeks() + ' Wochen' : 'Wakeboard') + segc('wseg', seg, [['', 'Tricks'], ['ses', 'Sessions'], ['grip', 'Griffkraft']]);
  if (seg === 'grip') return h + vGrip();
  if (seg === 'ses') return h + vWakeSessions();
  const r = riderStats(), pct = r.lvl >= 10 ? 100 : Math.round((1 - r.need / Math.max(1, Math.ceil(TRICKS.filter(t => t.lvl <= r.lvl + 1).length * 0.7))) * 100);
  h += '<div class="card rider"><div class="row"><div><small class="sub">Rider-Level</small><div class="rl"><b>' + r.lvl + '</b><small>/ 10</small></div><small class="sub" style="display:block;margin-top:-2px">Abgeschlossen: ' + (r.closed ? 'Level ' + r.closed : '–') + '</small></div>' +
    '<div class="stats" style="margin:0;flex:1;max-width:260px"><div><small>Punkte</small><b>' + r.xp + '</b></div><div><small>Beide</small><b>' + r.both + '</b></div><div><small>Switch</small><b>' + r.swLanded + '</b></div></div></div>' +
    (r.lvl < 10 ? '<div class="meter" style="margin-top:12px"><span style="width:' + pct + '%"></span></div><p class="hint" style="margin-top:6px">Noch ' + r.need + ' Trick' + (r.need === 1 ? '' : 's') + ' bis Level ' + (r.lvl + 1) + ' (70 % aller Tricks bis Level ' + (r.lvl + 1) + ' gestanden). Geöffnet ist ein Level mit der starken Seite, abgeschlossen erst, wenn auch Switch steht (wie im Wakebook). Jede Stance zählt eigene Punkte: Gestanden Level × 5, Sitzt Level × 10.</p>' : '') + '</div>';
  const nx = nextTricks(6);
  h += '<h2 class="sec">Als Nächstes</h2><div class="list">' + (nx.length ? nx.map(nextRow).join('') : '<div class="empty">Alles erledigt, was gerade freigeschaltet ist.</div>') + '</div>';
  /* Level-Übersicht (Regular) */
  h += '<h2 class="sec">Fortschritt je Level</h2><div class="lvls">' + Array.from({length:10}, (_, i) => { const L = i + 1, ts = TRICKS.filter(t => t.lvl === L), d = ts.filter(t => tSt(t.id, 's') >= 2).length, tw = TRICKS.filter(t => swl(t) === L), dw = tw.filter(t => tSt(t.id, 'w') >= 2).length;
    return '<button class="lvl' + (S.ui.tl === L ? ' on' : '') + (r.closed >= L ? ' done' : '') + '" data-act="tr-lvl" data-v="' + L + '" aria-label="Level ' + L + ': Regular ' + d + ' von ' + ts.length + ', Switch ' + dw + ' von ' + tw.length + '"><small>L' + L + '</small><span class="bars"><i><em style="height:' + Math.round(d / ts.length * 100) + '%"></em></i><i class="w"><em style="height:' + (tw.length ? Math.round(dw / tw.length * 100) : 0) + '%"></em></i></span><small class="num">' + d + '/' + ts.length + '</small></button>'; }).join('') + '</div><p class="hint" style="margin-top:6px">Linker Balken Regular, rechter Switch. Abgeschlossene Level sind markiert.</p>';
  if (S.ui.tl === undefined) S.ui.tl = Math.min(10, r.lvl + 1);
  const af = S.ui.ta || '', lf = S.ui.tl || 0;
  h += '<div class="row" style="margin-top:10px"><span class="sub">' + (lf ? 'Level ' + lf + ' (anderes Level oben antippen)' : 'Alle Level') + '</span>' + (lf ? '<button class="link" data-act="tr-lvl" data-v="0">Alle Level zeigen</button>' : '') + '</div>';
  h += '<div class="chips scrollchips">' + [['', 'Alle']].concat(Object.entries(T_AREAS).map(([k, v]) => [k, v[0]])).map(x => '<button class="chip" data-act="tr-area" data-v="' + x[0] + '" aria-pressed="' + (af === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';
  const list = TRICKS.filter(t => (!af || t.a === af) && (!lf || t.lvl === lf));
  let cur = 0, out = '';
  list.forEach(t => { if (t.lvl !== cur) { if (cur) out += '</div>'; out += '<h2 class="sec">Level ' + t.lvl + '</h2><div class="list">'; cur = t.lvl; } out += trickRow(t); });
  h += (out ? out + '</div>' : '<div class="empty">Keine Tricks in dieser Auswahl.</div>') + '<p class="hint" style="margin-top:14px">Jeder Trick hat zwei Spuren: <b>Reg</b> (Regular) und <b>Sw</b> (Switch). Tippen schaltet weiter (Offen → Übe → Steht → Sitzt). Ein blasser Sw-Knopf heißt: erst den Trick regular stehen und die Voraussetzungen auch in Switch. Tippe den Namen für Tipp, Voraussetzungen und Videos. Trick-Struktur angelehnt an das Wakebook von wakeboard-progress.com.</p>';
  return h;
}
function trickSheet(id) {
  const t = TR[id], ar = T_AREAS[t.a], st = (S.p.tricks && S.p.tricks[id]) || {};
  const ses = S.wake.filter(w => (w.tricks || []).some(x => x.id === id));
  const okCount = k => S.wake.reduce((a, w) => a + (w.tricks || []).filter(x => x.id === id && x.ok && (x.k || 's') === k).length, 0);
  const statusRow = k => '<p class="lab" style="margin-top:10px">' + STANCE[k] + '</p><div class="chips">' + T_STAT.map((x, i) => '<button class="chip" data-act="tr-set" data-v="' + id + ':' + i + ':' + k + '" aria-pressed="' + (tSt(id, k) === i) + '">' + x[0] + '</button>').join('') + '</div>';
  return '<p class="eyebrow">' + ar[0] + ' · Level ' + t.lvl + '</p><h2>' + esc(t.name) + '</h2><p>' + esc(t.tip) + '</p>' +
    (t.pre.length ? '<h3 style="margin-top:12px">Voraussetzungen (Regular)</h3><div class="list">' + t.pre.map(p => { const q = TR[p], qs = tSt(p, 's'); return '<button class="exitem" data-act="tr-open" data-v="' + p + '"><span class="av" style="--c:' + T_AREAS[q.a][1] + '">' + q.lvl + '</span><span class="exm"><b>' + esc(q.name) + '</b><small>' + T_STAT[qs][0] + '</small></span>' + (qs >= 2 ? I(ICONS.check, 'i s') : '') + '</button>'; }).join('') + '</div>' : '') +
    '<h3 style="margin-top:12px">Status</h3>' + statusRow('s') + statusRow('w') +
    (st.first || st.fw ? '<p class="hint" style="margin-top:8px">' + (st.first ? 'Regular erstmals gestanden: ' + esc(dshort(st.first)) : '') + (st.first && st.fw ? ' · ' : '') + (st.fw ? 'Switch erstmals gestanden: ' + esc(dshort(st.fw)) : '') + '</p>' : '') +
    (ses.length ? '<p class="sub" style="margin-top:8px">In ' + ses.length + ' Session' + (ses.length === 1 ? '' : 's') + ' geübt · Regular ' + okCount('s') + '× gelandet, Switch ' + okCount('w') + '×.</p>' : '') +
    '<label class="lab" for="tr-note">Notiz</label><textarea id="tr-note" placeholder="z. B. Kante länger halten, Handle tiefer">' + esc(st.note || '') + '</textarea><button class="btn sm ghost" style="margin-top:6px" data-act="tr-note" data-v="' + id + '">Notiz speichern</button>' +
    '<p style="margin-top:14px"><a class="link" href="https://www.youtube.com/results?search_query=' + encodeURIComponent('wakeboard ' + t.name.replace(/\(.*\)/, '') + ' tutorial') + '" target="_blank" rel="noopener">Tutorial-Videos auf YouTube suchen</a></p>';
}
function setTrick(id, s, k) {
  k = k || 's';
  S.p.tricks = S.p.tricks || {};
  const cur = S.p.tricks[id] || {};
  const upd = {...cur}; upd[k] = s;
  const fk = k === 's' ? 'first' : 'fw';
  if (s >= 2 && !upd[fk]) upd[fk] = todayStr();
  upd.ts = todayStr();
  S.p.tricks[id] = upd;
  saveProfile();
}

/* ----- Wake-Sessions ----- */
const W_SPOTS = ['Cable (Lift)', '2-Mast-Anlage', 'Boot', 'Winch', 'Sonstiges'];
function saveWake(w) { lsSave(); Cloud.put('wake', w.id, w); }
function selOf(f, id) { return f.sel[id] || (f.sel[id] = {}); }
function vWakeSessions() {
  const f = S.ui.wf2 || (S.ui.wf2 = {date:todayStr(), spot:W_SPOTS[0], min:'', laps:'', sel:{}, note:'', st:'s'});
  if (!f.st) f.st = 's';
  const k = f.st;
  const nx = nextTricks(30);
  const cand = TRICKS.filter(t => tSt(t.id, k) === 1 || nx.some(x => x.t === t && x.k === k) || (f.sel[t.id] && f.sel[t.id][k] !== undefined)).slice(0, 16);
  let h = '<div class="card"><h2>Session eintragen</h2><div class="pair"><div><label class="lab" for="ws-date">Datum</label><input type="date" id="ws-date" data-in="ws" data-f="date" value="' + esc(f.date) + '"></div>' +
    '<div><label class="lab" for="ws-spot">Ort</label><select id="ws-spot" data-in="ws" data-f="spot">' + W_SPOTS.map(x => '<option' + (x === f.spot ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div><label class="lab" for="ws-min">Fahrzeit (min)</label><input type="text" inputmode="numeric" id="ws-min" data-in="ws" data-f="min" value="' + esc(f.min) + '" placeholder="z. B. 60"></div>' +
    '<div><label class="lab" for="ws-laps">Runden (optional)</label><input type="text" inputmode="numeric" id="ws-laps" data-in="ws" data-f="laps" value="' + esc(f.laps) + '"></div></div>' +
    '<label class="lab">Stance</label><div class="segc" role="group">' + Object.entries(STANCE).map(([kk, nm]) => '<button data-act="ws-st" data-v="' + kk + '" aria-pressed="' + (k === kk) + '">' + nm + '</button>').join('') + '</div>' +
    '<label class="lab" style="margin-top:10px">Geübte Tricks in ' + STANCE[k] + ' (einmal tippen: geübt, zweimal: gelandet)</label><div class="chips">' + cand.map(t => { const v = selOf(f, t.id)[k]; return '<button class="chip' + (v === 'ok' ? ' ok' : '') + '" data-act="ws-trick" data-v="' + t.id + '" aria-pressed="' + (v !== undefined) + '">' + (v === 'ok' ? '✓ ' : '') + esc(t.name) + '</button>'; }).join('') +
    '<button class="chip" data-act="ws-more">+ weiterer Trick</button></div>' +
    '<label class="lab" for="ws-note">Notiz</label><input type="text" id="ws-note" data-in="ws" data-f="note" value="' + esc(f.note) + '" placeholder="Wind, Wasser, Gefühl, Stürze">' +
    '<button class="btn wide" style="margin-top:12px" data-act="ws-save">Session speichern</button><p class="hint" style="margin-top:6px">Gelandete Tricks werden automatisch auf „Gestanden“ gesetzt (in der jeweiligen Stance). Nach Landungen an 3 verschiedenen Tagen schlägt die App „Sitzt“ vor.</p></div>';
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
  const f = S.ui.wf2;
  const entries = [];
  Object.keys(f.sel).forEach(id => { ['s', 'w'].forEach(k => { const v = f.sel[id][k]; if (v !== undefined) entries.push({id, k, ok:v === 'ok'}); }); });
  if (!(parseNum(f.min) > 0) && !entries.length) { toast('Fahrzeit oder mindestens einen Trick eintragen.'); return; }
  const w = {id:uid('w'), date:f.date || todayStr(), spot:f.spot, min:Math.round(parseNum(f.min) || 0), laps:Math.round(parseNum(f.laps) || 0) || null, tricks:entries, note:(f.note || '').trim()};
  S.wake.push(w); saveWake(w);
  const sug = [];
  entries.forEach(x => {
    if (x.ok && tSt(x.id, x.k) < 2) setTrick(x.id, 2, x.k);
    else if (!x.ok && tSt(x.id, x.k) === 0) setTrick(x.id, 1, x.k);
    const days = new Set(S.wake.filter(q => (q.tricks || []).some(y => y.id === x.id && y.ok && (y.k || 's') === x.k)).map(q => q.date));
    if (x.ok && days.size >= 3 && tSt(x.id, x.k) === 2) sug.push({id:x.id, k:x.k});
  });
  S.ui.wf2 = null;
  if (sug.length) { S.ui.sheet = {t:'trsug', sug}; }
  render(); toast('Session gespeichert.');
}
