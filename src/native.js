'use strict';
/* ===== Eisenbuch: Android-Funktionen (Capacitor). Im Browser bleibt alles inaktiv. ===== */
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const Nat = {
  P:null, saveT:null,
  init() {
    if (!NATIVE) return;
    try { this._init(); } catch (e) { console.error('EB_NATIVE_INIT ' + (e && e.message)); this.P = null; }
  },
  _init() {
    /* registerPlugin stammt aus @capacitor/core (capacitor.js), nicht aus der Android-Brücke */
    const reg = (window.capacitorExports && window.capacitorExports.registerPlugin) || (window.Capacitor && window.Capacitor.registerPlugin);
    if (!reg) throw new Error('registerPlugin fehlt');
    const R = n => reg(n);
    this.P = {LN:R('LocalNotifications'), FS:R('Filesystem'), SH:R('Share'), HA:R('Haptics'), APP:R('App'), W:R('Watch'), H:R('Health'), G:R('Garmin')};
    /* Eisenbuch-App auf der Garmin-Uhr: Nachrichten (hi, done) */
    try { this.P.G.addListener('msg', e => this.garminMsg(e)); } catch (e) { this.P.G = null; }
    /* „✓ Geschafft“ auf Uhr oder Handy, während die App offen ist: sofort übernehmen */
    try { this.P.W.addListener('done', () => this.watchSync()); } catch (e) { this.P.W = null; }
    /* Starttest-Zeilen für den Emulator-Test in GitHub Actions */
    if (this.P.W) this.P.W.sync().then(() => console.log('EB_WATCH_OK')).catch(e => console.error('EB_WATCH_ERR ' + (e && e.message)));
    this.P.H.status().then(r => console.log('EB_HEALTH ' + JSON.stringify(r))).catch(e => console.error('EB_HEALTH_ERR ' + (e && e.message)));
    const LN = this.P.LN;
    LN.createChannel({id:'rest', name:'Pausen-Timer', description:'Signal am Ende der Satzpause', importance:5, visibility:1, vibration:true}).catch(() => {});
    LN.createChannel({id:'remind', name:'Trainings-Erinnerungen', description:'Erinnerung an geplante Einheiten und Griff-Tests', importance:4, visibility:1, vibration:true}).catch(() => {});
    LN.registerActionTypes({types:[{id:'set', actions:[{id:'done', title:'✓ Geschafft'}]}]}).catch(() => {});
    LN.addListener('localNotificationActionPerformed', a => {
      const ex = (a && a.notification && a.notification.extra) || {};
      /* „✓ Geschafft“ auf Handy oder Uhr: den angekündigten Satz abhaken */
      if (a && a.actionId === 'done' && S.active && ex.i != null) { const it = S.active.items[ex.i], st = it && it.sets[ex.s]; if (st && !st.done) { ACT['set-done'](null, {dataset:{i:String(ex.i), s:String(ex.s)}}); toast('Satz abgehakt: ' + EX[it.exId].name); return; } }
      const go = ex.go;
      if (go && S.p && S.p.done) { S.tab = go; if (go === 'wake') S.ui.wseg = 'grip'; if (S.active) S.ui.woMin = false; render(); }
    });
    this.P.APP.addListener('backButton', () => onBack());
    this.P.APP.addListener('appStateChange', st => { if (st.isActive) this.fg(); else this.bg(); });
  },
  /* Benachrichtigungs-Status (Android 13+: ohne Erlaubnis kommt gar nichts, auch nicht auf der Uhr) */
  async notifStatus() {
    if (!NATIVE || !this.P) return null;
    let st = {enabled:false, app:false, channel:true, exact:true};
    try { if (this.P.W) st = await this.P.W.status(); else { const r = await this.P.LN.checkPermissions(); st.enabled = st.app = r.display === 'granted'; } } catch (e) {}
    const ch = !S.nstat || S.nstat.enabled !== st.enabled || S.nstat.exact !== st.exact; S.nstat = st;
    if (ch && S.tab === 'more' && S.ui.more === 'set') render();
    return st;
  },
  async ensureNotif() { const ok = await this.perm(); await this.notifStatus(); return ok && S.nstat && S.nstat.enabled; },
  openNotifSettings() { if (this.P && this.P.W) this.P.W.openSettings().catch(() => {}); },
  /* Test: in 5 s eine Satz-Benachrichtigung wie im Training, mit „✓ Geschafft“ */
  async watchTest() {
    if (!NATIVE || !this.P || !this.P.W) return false;
    if (!(await this.ensureNotif())) return false;
    await this.P.W.arm({queue:[{i:-1, s:-1, title:'Eisenbuch-Test · Satz 1/3', body:'60 kg × 8 Wdh. · auf der Uhr nach oben wischen: ✓ Geschafft', rest:0}], at:Date.now() + 5000});
    return true;
  },
  async perm() {
    if (!NATIVE || !this.P) return false;
    try { let s = await this.P.LN.checkPermissions(); if (s.display !== 'granted') s = await this.P.LN.requestPermissions(); return s.display === 'granted'; } catch (e) { return false; }
  },
  /* Pausen-Ende als Benachrichtigung mit dem nächsten Satz. Smartwatches (z. B. Garmin) spiegeln sie und vibrieren.
     Mit Uhr-Modus immer, sonst nur wenn die App im Hintergrund ist. */
  restSchedule(force) {
    if (!NATIVE || !this.P) return;
    this.garminSoon();
    this.lockTimer();
    /* Uhr-App läuft: sie zeigt Pause und Satz selbst, keine zusätzlichen Benachrichtigungen */
    if (this.garminLive() && this.P.W) { this.P.W.disarm().catch(() => {}); return; }
    if (!this.P.W) return this.restScheduleLN(force);
    const watchOn = !S.p || S.p.watch !== false, restOn = !!(S.rest && S.active && S.rest.end > Date.now() + 1500);
    /* Vordergrund ohne Pause: nichts auf der Uhr. Ohne Uhr-Modus nur im Hintergrund. */
    if (!S.active || (!force && (!watchOn || !restOn)) || (force && !restOn && !watchOn)) { this.P.W.disarm().catch(() => {}); return; }
    const q = watchQueue(S.active, S.ui.wf);
    if (!q.length) { this.P.W.disarm().catch(() => {}); return; }
    this.P.W.arm({queue:q, at:restOn ? S.rest.end : 0}).catch(() => {});
  },
  /* Stiller Pausen-Countdown auf dem Sperrbildschirm, wenn die Uhr-App nicht läuft */
  lockTimer() {
    if (!this.P || !this.P.W) return;
    const on = S.active && S.rest && S.rest.end > Date.now() + 2000 && S.p && S.p.lockTimer !== false && !this.garminLive();
    if (!on) { this.P.W.restLiveCancel().catch(() => {}); return; }
    const q = watchQueue(S.active, S.ui.wf)[0];
    this.P.W.restLive({end:S.rest.end, title:'Pause', body:q ? 'Als Nächstes: ' + q.n + ' · ' + q.l + ' · ' + q.w : 'Gleich weiter'}).catch(() => {});
  },
  /* Rückfall ohne Uhr-Plugin: einfache Benachrichtigung am Pausenende */
  restScheduleLN(force) {
    this.P.LN.cancel({notifications:[{id:9001}]}).catch(() => {});
    if (!S.rest || !S.active || S.rest.end <= Date.now() + 1500) return;
    if (!force && S.p.watch === false) return;
    const q = watchQueue(S.active, S.ui.wf); if (!q.length) return;
    this.P.LN.schedule({notifications:[{id:9001, title:'Pause vorbei · ' + q[0].title, body:q[0].body, channelId:'rest', actionTypeId:'set', schedule:{at:new Date(S.rest.end), allowWhileIdle:true}, extra:{go:'train', i:q[0].i, s:q[0].s}}]}).catch(() => {});
  },
  /* ----- Garmin Connect IQ: Eisenbuch-App auf der Uhr ----- */
  gT:null, gLastW:null,
  garminLive() { return !!(S.giq && Date.now() - S.giq.t < 15 * 60000); },
  garminMsg(e) {
    const d = e && e.data; if (!d || typeof d !== 'object') return;
    S.giq = {t:Date.now(), dev:e.device || 'Uhr'};
    if (d.t === 'hi') {
      if (d.bb != null) bioStore(d);
      this.garminPush(); this.garminWakeList();
      if (S.ui.more === 'set' || (S.ui.sheet && S.ui.sheet.t === 'ready')) { if (S.ui.sheet && S.ui.sheet.t === 'ready') { hcPrefill(S.ui.sheet.a); renderSheet(); } else render(); }
      return;
    }
    if (d.t === 'done' && S.active && (!d.w || d.w === S.active.id) && Array.isArray(d.d)) {
      const evs = d.d.filter(x => Array.isArray(x) && x.length >= 3).map(x => ({i:+x[0], s:+x[1], t:+x[2] * 1000, kg:x.length > 3 && x[3] !== null && x[3] !== '' ? +x[3] : null, reps:x.length > 4 && x[4] ? +x[4] : null, hr:x.length > 5 && x[5] ? +x[5] : null}));
      const n = watchApply(evs, true); if (n && this.P.W) this.P.W.disarm().catch(() => {});
      this.garminPush(); return;
    }
    if (d.t === 'feel' && S.active && (!d.w || d.w === S.active.id)) {
      const it = S.active.items[+d.i]; if (it && RIR[d.f] !== undefined) { it.feel = d.f; saveActive(); renderWorkout(); }
      return;
    }
    if (d.t === 'wk?') { this.garminWakeList(); return; }
    if (d.t === 'wake' || d.t === 'wend') { wakeFromWatch(d); return; }
  },
  /* Neuer Rekord: Pokal auf der Uhr */
  garminPr(e, recs) {
    if (!NATIVE || !this.P || !this.P.G || !this.garminLive() || !recs || !recs.length) return;
    const r = recs[0];
    this.P.G.send({data:{t:'pr', n:e.name.split(' (')[0], d:REC_T[r.k] + ': ' + recFmt(r.k, r)}}).catch(() => {});
  },
  /* Tagesform-Check: Body Battery von der Uhr holen (läuft die Uhr-App nicht, fragt die Uhr nach dem Öffnen) */
  garminBio() {
    if (!NATIVE || !this.P || !this.P.G) return;
    if (this.garminLive()) this.P.G.send({data:{t:'bio?'}}).catch(() => {});
    else if (S.gstat && S.gstat.installed) this.P.G.open().catch(() => {});
  },
  garminWakeList() {
    if (!NATIVE || !this.P || !this.P.G) return;
    this.P.G.send({data:{t:'wl', l:wakeWatchList()}}).catch(() => {});
  },
  garminSoon() { if (!NATIVE || !this.P || !this.P.G) return; clearTimeout(this.gT); this.gT = setTimeout(() => this.garminPush(), 400); },
  garminPush() {
    if (!NATIVE || !this.P || !this.P.G) return;
    let data;
    if (!S.active) { data = this.gLastW ? {t:'end', nx:nextWorkoutText(), se:S.p.season || ''} : {t:'info', nx:nextWorkoutText(), se:S.p.season || ''}; this.gLastW = null; }
    else {
      const q = watchQueue(S.active, S.ui.wf).slice(0, 24).map(x => {
        const it = S.active.items[x.i], st = it.sets[x.s], e = EX[it.exId], kg = setKgCarry(it, x.s), m = it.plan.mode;
        return {i:x.i, s:x.s, n:x.n, l:x.l, w:x.w, r:Math.round(x.rest / 1000), kg:kg == null ? -1 : kg, rp:st.reps || it.plan.reps || 0,
          st:incOf(S.p, e), u:it.plan.unit || (m === 'time' ? 's' : 'Wdh.'), kgp:(m === 'bw' || (m === 'time' && e.eq === 'KG')) ? 1 : 0,
          x:it.sets.findIndex((q2, k) => k > x.s && !q2.done) < 0 ? 1 : 0};
      });
      const re = S.rest && S.rest.end > Date.now() + 1000 ? Math.round(S.rest.end / 1000) : 0;
      data = {t:'q', w:S.active.id, n:S.active.name || 'Training', q, re, rt:re ? (S.rest.tot || Math.round((S.rest.end - Date.now()) / 1000)) : 0, hr:S.p.hrRest || 0, nx:nextWorkoutText(), se:S.p.season || ''};
      this.gLastW = S.active.id;
    }
    this.P.G.send({data}).then(r => { if (r && r.status && r.status.includes('SUCCESS') && S.active) { if (!S.giq) S.giq = {t:Date.now(), dev:'Uhr'}; } }).catch(() => {});
  },
  garminOpen() { if (!NATIVE || !this.P || !this.P.G) return; setTimeout(() => this.P.G.open().then(r => { if (r && r.status === 'APP_IS_ALREADY_RUNNING') this.garminPush(); }).catch(() => {}), 800); },
  async garminStatus() {
    if (!NATIVE || !this.P || !this.P.G) return null;
    try { const st = await this.P.G.status(), ins = st.devices && st.devices.length ? await this.P.G.installed() : {installed:false, device:false}; S.gstat = {...st, ...ins}; } catch (e) { S.gstat = {ready:false, error:String(e && e.message)}; }
    return S.gstat;
  },
  /* Auf der Uhr bestätigte Sätze abholen und eintragen */
  async watchSync() {
    if (!NATIVE || !this.P || !this.P.W) return 0;
    let r; try { r = await this.P.W.sync(); } catch (e) { return 0; }
    const evs = (r && r.done) || [];
    if (evs.some(e => e.i < 0)) { toast('Test angekommen: „✓ Geschafft“ hat funktioniert.'); Nat.vib(120); }
    const n = watchApply(evs.filter(e => e.i >= 0));
    if (n) this.restSchedule(document.hidden);
    return n;
  },
  /* App geht in den Hintergrund oder Bildschirm wird gesperrt */
  bg() { this.flush(); this.restSchedule(true); },
  async fg() {
    await this.watchSync();
    if (S.rest && Date.now() >= S.rest.end) S.rest = null; /* Signal kam schon als Benachrichtigung */
    renderRest(); this.restSchedule(false); this.reschedule(); this.healthRefresh(); this.notifStatus(); this.garminStatus(); this.garminSoon();
  },
  /* ----- Health Connect: Schlaf und Nachtpuls (z. B. Garmin über Garmin Connect) ----- */
  async healthStatus() { if (!NATIVE || !this.P || !this.P.H) return {available:false}; try { return await this.P.H.status(); } catch (e) { return {available:false}; } },
  async healthConnect() {
    if (!NATIVE || !this.P || !this.P.H) return {available:false, granted:false};
    try { const r = await this.P.H.request(); if (r.granted) await this.healthRefresh(true); return r; } catch (e) { return {available:true, granted:false}; }
  },
  async healthRefresh(force) {
    if (!NATIVE || !this.P || !this.P.H || !S.p || !S.p.hc) return null;
    if (!force && S.hc && Date.now() - S.hc.t < 30 * 60000) return S.hc;
    try { const r = await this.P.H.nights({days:15}); S.hc = {t:Date.now(), nights:r.nights || [], resting:r.resting || []}; if (S.ui.sheet && S.ui.sheet.t === 'ready') renderSheet(); return S.hc; } catch (e) { return null; }
  },
  /* Sofort-Benachrichtigung (z. B. Wake-Ziele); Smartwatches spiegeln sie */
  notifyNow(id, title, text) {
    if (!NATIVE || !this.P) return false;
    const first = text.split('\n')[0];
    this.P.LN.schedule({notifications:[{id, title, body:first, largeBody:text, channelId:'remind', extra:{go:'wake'}}]}).catch(() => {});
    return true;
  },
  vib(ms) { if (NATIVE && this.P) this.P.HA.vibrate({duration:ms || 200}).catch(() => {}); },
  async share(name, text) {
    if (!this.P) throw new Error('Teilen nicht verfügbar');
    const r = await this.P.FS.writeFile({path:name, data:text, directory:'CACHE', encoding:'utf8'});
    await this.P.SH.share({title:name, url:r.uri, dialogTitle:'Datei speichern oder teilen'});
  },
  /* Zusätzliche Sicherung als Datei im App-Speicher (wird von Androids Auto-Backup mitgesichert) */
  autosave(json) { if (!NATIVE || !this.P) return; clearTimeout(this.saveT); this._json = json; this.saveT = setTimeout(() => this.flush(), 1500); },
  flush() { if (!NATIVE || !this.P || !this._json) return; const j = this._json; this._json = null; this.P.FS.writeFile({path:'eisenbuch-autosave.json', data:j, directory:'DATA', encoding:'utf8'}).catch(() => {}); },
  async loadBackup() {
    if (!NATIVE || !this.P) return null;
    try { const r = await this.P.FS.readFile({path:'eisenbuch-autosave.json', directory:'DATA', encoding:'utf8'}); return JSON.parse(r.data); } catch (e) { return null; }
  },
  /* Erinnerungen für die nächsten 4 Wochen mit dem jeweils geplanten Training neu planen */
  async reschedule() {
    if (!NATIVE || !this.P || !S.p || !S.p.done) return;
    const LN = this.P.LN;
    try {
      const pend = await LN.getPending();
      const old = (pend.notifications || []).filter(n => n.id >= 1000 && n.id < 1200).map(n => ({id:n.id}));
      if (old.length) await LN.cancel({notifications:old});
    } catch (e) {}
    const r = S.p.remind; if (!r || !r.on) return;
    const paused = typeof inSeasonPause === 'function' && inSeasonPause();
    const list = [], total = blockSessions(S.p), hm = (S.p.time || '18:00').split(':').map(Number);
    let n = S.p.block.n;
    const np0 = nextPlan(S.p, S.sessions), pls = activeProgram(S.p).plans; let k = np0 ? pls.indexOf(np0.plan) : 0;
    for (let i = 0; i < 28 && list.length < 20; i++) {
      const d = addDays(todayStr(), i); if (!planForDate(S.p, d)) continue;
      if (paused || (typeof inSeasonPause === 'function' && inSeasonPause(d))) continue; /* Wake-Saison: keine Gym-Erinnerungen */
      if (i === 0 && S.sessions.some(s => s.date === d)) continue;
      const pl = pls[(k++) % pls.length]; /* Reihenfolge nach tatsächlich trainierten Plänen */
      const at = parseD(d); at.setHours(hm[0], hm[1], 0, 0); at.setMinutes(at.getMinutes() - (r.lead || 0));
      if (at.getTime() < Date.now() + 60000) continue;
      let body = 'Block geschafft: Auswertung und nächster Block warten.';
      if (n < total) { const w = buildWorkout(S.p, S.sessions, n, pl.id); body = w.name + ' · ' + phaseText(w.pr) + ' · ca. ' + w.est + ' min'; }
      list.push({id:1000 + list.length, title:r.lead ? 'Training um ' + S.p.time + ' Uhr' : 'Zeit fürs Training', body, channelId:'remind', schedule:{at, allowWhileIdle:true}, extra:{go:'train'}});
      n++;
    }
    const gd = gripDue();
    if (!gd.first) {
      const day = gd.due ? addDays(todayStr(), 1) : addDays(gd.last, S.p.gripEvery), at = parseD(day); at.setHours(9, 0, 0, 0);
      list.push({id:1100, title:'Griff-Test fällig', body:'Dead Hang, Handtuch-Hang & Co.: ausgeruht testen, ca. 15 min.', channelId:'remind', schedule:{at, allowWhileIdle:true}, extra:{go:'wake'}});
    }
    if (list.length) LN.schedule({notifications:list}).catch(() => {});
  }
};
/* ----- Uhr-Satzschleife: Reihenfolge der nächsten Sätze (Supersätze abwechselnd) ----- */
function setKgCarry(it, j) { for (let k = j; k >= 0; k--) if (it.sets[k].kg != null && !it.sets[k].warm) return it.sets[k].kg; return it.sets[j].kg; }
function restAfterSet(a, i, j) {
  const it = a.items[i], st = it.sets[j]; if (st.warm) return 60000;
  const pa = ssPartner(a, i);
  if (it.ss && pa !== null && a.items[pa].sets.some(q => !q.done && !q.warm)) return 0; /* Supersatz: direkt weiter */
  return restFor(it) * 1000;
}
function watchEntry(a, i, j) {
  const it = a.items[i], e = EX[it.exId], st = it.sets[j], works = it.sets.filter(q => !q.warm), idx = it.sets.slice(0, j + 1).filter(q => !q.warm).length;
  const kg = setKgCarry(it, j), unit = it.plan.unit || (it.plan.mode === 'time' ? 's' : 'Wdh.'), m = it.plan.mode;
  const kgTxt = kg > 0 ? (m === 'bw' || m === 'time' && e.eq === 'KG' ? '+' : '') + fmt(kg) + ' kg × ' : (m === 'pct' || m === 'dp') ? 'Gewicht? × ' : '';
  const n = e.name.split(' (')[0], l = st.warm ? 'Aufwärmen' : (st.top ? 'Topsatz ' : 'Satz ') + idx + '/' + works.length, w = kgTxt + (st.reps || it.plan.reps || '') + ' ' + unit;
  return {i, s:j, n, l, w, title:n + ' · ' + l, body:w, rest:restAfterSet(a, i, j)};
}
function watchQueue(a, focus) {
  const out = []; if (!a) return out;
  const open = k => a.items[k] && a.items[k].sets.some(q => !q.done);
  const first = focus != null && open(focus) ? focus : a.items.findIndex((x, k) => open(k));
  if (first < 0) return out;
  const order = [first]; for (let k = first + 1; k < a.items.length; k++) order.push(k); for (let k = 0; k < first; k++) order.push(k);
  const used = new Set();
  for (const k of order) {
    if (used.has(k) || !open(k)) continue; used.add(k);
    const pa = ssPartner(a, k), sk = a.items[k].sets.map((q, j) => j).filter(j => !a.items[k].sets[j].done);
    if (pa !== null && !used.has(pa) && open(pa)) {
      used.add(pa); const sp = a.items[pa].sets.map((q, j) => j).filter(j => !a.items[pa].sets[j].done);
      const [A, B, sa, sb] = k < pa ? [k, pa, sk, sp] : [pa, k, sp, sk];
      for (let n = 0; n < Math.max(sa.length, sb.length); n++) { if (n < sa.length) out.push(watchEntry(a, A, sa[n])); if (n < sb.length) out.push(watchEntry(a, B, sb[n])); }
    } else sk.forEach(j => out.push(watchEntry(a, k, j)));
    if (out.length >= 40) break;
  }
  return out;
}
/* Von der Uhr bestätigte Sätze eintragen: geplantes Gewicht × Wdh., Pause ab Bestätigungszeit */
function watchApply(evs, fromGarmin) {
  const a = S.active; if (!a || !evs.length) return 0;
  let n = 0, last = null; const recs = [];
  evs.sort((x, y) => x.t - y.t).forEach(ev => {
    const it = a.items[ev.i], st = it && it.sets[ev.s]; if (!st || st.done) return;
    if (ev.kg != null && ev.kg >= 0) st.kg = ev.kg; else if (st.kg == null) st.kg = setKgCarry(it, ev.s);
    if (ev.reps > 0) st.reps = ev.reps; else if (!(st.reps > 0)) st.reps = it.plan.reps || 1;
    if (ev.hr > 0) st.hr = ev.hr;
    st.done = true; st.watch = true; n++; last = ev;
    for (let k = ev.s + 1; k < it.sets.length; k++) if (!it.sets[k].warm && it.sets[k].kg == null) it.sets[k].kg = st.kg;
    const nr = liveRecordCheck(it, ev.s); if (nr.length) recs.push([EX[it.exId], nr]);
  });
  if (!n) return 0;
  const end = last.t + restAfterSet(a, last.i, last.s);
  S.rest = end > Date.now() + 1000 ? {end, tot:Math.round(restAfterSet(a, last.i, last.s) / 1000)} : null;
  if (S.ui.wf != null) { const it = a.items[S.ui.wf], nx = it ? it.sets.findIndex(q => !q.done) : -1; S.ui.ws = nx >= 0 ? nx : null; } /* Übung fertig: Gefühl abfragen, dann weiter */
  saveActive(); renderWorkout(); renderRest();
  if (recs.length) { showTrophy(recs[0][0], recs[0][1]); if (fromGarmin) Nat.garminPr(recs[0][0], recs[0][1]); }
  toast(n === 1 ? 'Satz von der Uhr übernommen.' : n + ' Sätze von der Uhr übernommen.');
  return n;
}
/* Nächstes Training als kurzer Text für die Uhr (Glance) */
function nextWorkoutText() {
  if (!S.p || !S.p.done) return '';
  if (S.active) return 'Training läuft';
  const np = nextPlan(S.p, S.sessions), name = np && np.plan ? np.plan.name : 'Training';
  for (let i = 0; i < 15; i++) {
    const d = addDays(todayStr(), i); if (!planForDate(S.p, d)) continue;
    if (typeof inSeasonPause === 'function' && inSeasonPause(d)) continue;
    if (i === 0 && S.sessions.some(x => x.date === d)) continue;
    const dt = parseD(d), lab = i === 0 ? 'Heute' : i === 1 ? 'Morgen' : DAYS[wdOf(d)] + ' ' + dt.getDate() + '.' + (dt.getMonth() + 1) + '.';
    return lab + ' · ' + name;
  }
  return '';
}
/* Body Battery und Stress von der Uhr (beim Öffnen der Uhr-App) */
function bioStore(d) {
  S.bio = {t:Date.now(), bb:+d.bb, bbx:d.bbx != null ? +d.bbx : +d.bb, st:d.st != null ? +d.st : null};
  const log = S.p.bbLog = S.p.bbLog || {}; log[todayStr()] = Math.max(log[todayStr()] || 0, S.bio.bbx);
  Object.keys(log).sort().slice(0, -30).forEach(k => delete log[k]);
  saveProfile();
}
function bioSummary() {
  if (!S.bio || Date.now() - S.bio.t > 12 * 3600e3) return null;
  const log = S.p.bbLog || {}, prev = Object.keys(log).filter(k => k < todayStr()).sort().slice(-14).map(k => log[k]);
  const med = prev.length >= 5 ? prev.slice().sort((a, b) => a - b)[prev.length >> 1] : null;
  const low = S.bio.bbx <= 35 || (med !== null && S.bio.bbx <= med - 20);
  return {...S.bio, base:med, low};
}
/* Trickliste für den Wake-Modus der Uhr: Ziele, angefangene Tricks, nächste Schritte */
function wakeWatchList() {
  const out = [], seen = {}, add = (id, k) => { const t = TRICKS.find(x => x.id === id); if (!t || seen[id + k] || out.length >= 16) return; seen[id + k] = 1; out.push({id, k, n:t.name + (k === 'w' ? ' (Sw)' : '')}); };
  (S.p.wakeGoals || []).forEach(g => add(g.id, g.k));
  TRICKS.forEach(t => ['s', 'w'].forEach(k => { if (tSt(t.id, k) === 1) add(t.id, k); }));
  nextTricks(30).forEach(x => add(x.t.id, x.k));
  return out;
}
/* Wake-Session von der Uhr: Versuche in den Entwurf übernehmen, am Ende speichern */
function wakeFromWatch(d) {
  if (!d.w || (S.p.wkSaved || []).includes(d.w)) return; /* schon gespeichert */
  S.wkw = S.wkw || {};
  let f = S.ui.wf2; if (!f || f.hist === undefined) f = S.ui.wf2 = newWf();
  const old = S.wkw[d.w] || [], log = (Array.isArray(d.d) ? d.d : []).filter(x => Array.isArray(x) && x.length >= 3 && TRICKS.some(t => t.id === String(x[0])));
  /* frühere Einträge dieser Uhr-Session herausrechnen, dann die aktuelle Liste neu zählen (Zurücknehmen auf der Uhr wirkt so auch hier) */
  const apply = (x, sign) => { const id = String(x[0]), kk = x[1] === 'w' ? 'w' : 's', l = +x[2] ? 1 : 0, c = selOf(f, id)[kk] = selOf(f, id)[kk] || {a:0, l:0}; c.a = Math.max(0, c.a + sign); c.l = Math.max(0, c.l + sign * l); };
  old.forEach(x => apply(x, -1)); log.forEach(x => apply(x, 1));
  S.wkw[d.w] = log;
  if (d.t === 'wend') {
    S.p.wkSaved = S.p.wkSaved || [];
    if (S.p.wkSaved.includes(d.w)) return;
    if (d.min > 0 && !(parseNum(f.min) > 0)) f.min = String(d.min);
    if (d.laps > 0 && !(parseNum(f.laps) > 0)) f.laps = String(d.laps);
    S.p.wkSaved.push(d.w); S.p.wkSaved = S.p.wkSaved.slice(-20);
    wakeSave();
    return;
  }
  if (S.tab === 'wake') render();
}
let reschedT = null;
function reschedSoon() { clearTimeout(reschedT); reschedT = setTimeout(() => Nat.reschedule(), 2000); }
/* Android-Zurück-Taste: erst Dialog schließen, dann Training minimieren, dann zu „Heute“ */
function onBack() {
  if (S.ui.sheet) { if (S.ui.sheet.t === 'gtest' && S.gt && (S.gt.st === 'run' || S.gt.st === 'cd')) return; ACT.close(); return; }
  if (S.active && !S.ui.woMin) { if (S.ui.wf != null) { ACT['wf-close'](); return; } S.ui.woMin = true; render(); return; }
  if (S.ui.pv) { ACT['pl-back'](); return; }
  if (S.ui.more) { ACT['more-back'](); return; }
  if (S.tab !== 'train') { ACT.tab('train'); return; }
  if (Nat.P) Nat.P.APP.minimizeApp().catch(() => {});
}
