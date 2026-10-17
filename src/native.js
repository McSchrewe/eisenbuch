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
    this.P = {LN:R('LocalNotifications'), FS:R('Filesystem'), SH:R('Share'), HA:R('Haptics'), APP:R('App')};
    const LN = this.P.LN;
    LN.createChannel({id:'rest', name:'Pausen-Timer', description:'Signal am Ende der Satzpause', importance:5, visibility:1, vibration:true}).catch(() => {});
    LN.createChannel({id:'remind', name:'Trainings-Erinnerungen', description:'Erinnerung an geplante Einheiten und Griff-Tests', importance:4, visibility:1, vibration:true}).catch(() => {});
    LN.addListener('localNotificationActionPerformed', a => {
      const go = a && a.notification && a.notification.extra && a.notification.extra.go;
      if (go && S.p && S.p.done) { S.tab = go; if (go === 'body') S.ui.bseg = 'grip'; if (S.active) S.ui.woMin = false; render(); }
    });
    this.P.APP.addListener('backButton', () => onBack());
    this.P.APP.addListener('appStateChange', st => { if (st.isActive) this.fg(); else this.bg(); });
  },
  async perm() {
    if (!NATIVE || !this.P) return false;
    try { let s = await this.P.LN.checkPermissions(); if (s.display !== 'granted') s = await this.P.LN.requestPermissions(); return s.display === 'granted'; } catch (e) { return false; }
  },
  /* App geht in den Hintergrund oder Bildschirm wird gesperrt: Pausen-Ende als Benachrichtigung planen */
  bg() {
    this.flush();
    if (S.rest && S.active && S.rest.end > Date.now() + 1500) {
      const it = S.active.items.find(x => x.sets.some(s => !s.done)), nm = it ? EX[it.exId].name : 'nächste Übung';
      this.P.LN.schedule({notifications:[{id:9001, title:'Pause vorbei', body:'Weiter mit: ' + nm, channelId:'rest', schedule:{at:new Date(S.rest.end), allowWhileIdle:true}, extra:{go:'train'}}]}).catch(() => {});
    }
  },
  fg() {
    this.P.LN.cancel({notifications:[{id:9001}]}).catch(() => {});
    if (S.rest && Date.now() >= S.rest.end) S.rest = null; /* Signal kam schon als Benachrichtigung */
    renderRest(); this.reschedule();
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
    const list = [], total = blockSessions(S.p), hm = (S.p.time || '18:00').split(':').map(Number);
    let n = S.p.block.n;
    for (let i = 0; i < 28 && list.length < 20; i++) {
      const d = addDays(todayStr(), i), pl = planForDate(S.p, d); if (!pl) continue;
      if (i === 0 && S.sessions.some(s => s.date === d)) continue;
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
      list.push({id:1100, title:'Griff-Test fällig', body:'Dead Hang, Handtuch-Hang & Co.: ausgeruht testen, ca. 15 min.', channelId:'remind', schedule:{at, allowWhileIdle:true}, extra:{go:'body'}});
    }
    if (list.length) LN.schedule({notifications:list}).catch(() => {});
  }
};
let reschedT = null;
function reschedSoon() { clearTimeout(reschedT); reschedT = setTimeout(() => Nat.reschedule(), 2000); }
/* Android-Zurück-Taste: erst Dialog schließen, dann Training minimieren, dann zu „Heute“ */
function onBack() {
  if (S.ui.sheet) { if (S.ui.sheet.t === 'gtest' && S.gt && (S.gt.st === 'run' || S.gt.st === 'cd')) return; ACT.close(); return; }
  if (S.active && !S.ui.woMin) { S.ui.woMin = true; render(); return; }
  if (S.ui.pv) { ACT['pl-back'](); return; }
  if (S.ui.more) { ACT['more-back'](); return; }
  if (S.tab !== 'train') { ACT.tab('train'); return; }
  if (Nat.P) Nat.P.APP.minimizeApp().catch(() => {});
}
