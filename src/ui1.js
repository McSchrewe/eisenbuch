'use strict';
/* ===== Eisenbuch: Zustand, Speicher, Diagramme ===== */
const LS = 'eisenbuch.v1';
const S = {p:null, sessions:[], runs:[], grip:[], body:[], wake:[], photos:[], photosLoaded:false, gt:null, active:null, tab:'train', ui:{}, rest:null, runT:{run:false, start:0, acc:0}, cloud:{mode:'local', err:null}};
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tryLS(fn) { try { return fn(); } catch (e) { return null; } }

function normProfile(p) {
  const d = defaultProfile();
  p = Object.assign(d, p || {});
  ['e1','src','adj','swaps','gripGoal','exNotes'].forEach(k => { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; });
  if (!Array.isArray(p.tomb)) p.tomb = [];
  if (!Array.isArray(p.custom)) p.custom = [];
  if (!p.remind || typeof p.remind !== 'object') p.remind = {on:false, lead:30};
  registerCustom(p);
  ensurePrograms(p);
  if (!Array.isArray(p.gripSet) || !p.gripSet.length) p.gripSet = ['hang','towel','rep'];
  if (!p.block || typeof p.block !== 'object') p.block = d.block;
  if (!p.block.e1Start) p.block.e1Start = {};
  if (!Array.isArray(p.days) || p.days.length < 2) p.days = [0,2,4];
  p.days = p.days.slice(0, 6).sort((a, b) => a - b);
  if (!MODELS[p.model]) p.model = 'linear';
  return p;
}
function lsSave() { const j = JSON.stringify({app:'eisenbuch', p:S.p, sessions:S.sessions, runs:S.runs, grip:S.grip, body:S.body, wake:S.wake}); tryLS(() => localStorage.setItem(LS, j)); Nat.autosave(j); }
function lsLoad() {
  const j = tryLS(() => JSON.parse(localStorage.getItem(LS) || 'null'));
  if (j) { S.p = j.p ? normProfile(j.p) : null; S.sessions = j.sessions || []; S.runs = j.runs || []; S.grip = j.grip || []; S.body = j.body || []; S.wake = j.wake || []; }
  const a = tryLS(() => JSON.parse(localStorage.getItem(LS + '.active') || 'null')); if (a && a.items) S.active = a;
  const r = tryLS(() => JSON.parse(localStorage.getItem(LS + '.run') || 'null')); if (r) S.runT = r;
}
function saveActive() { tryLS(() => { if (S.active) localStorage.setItem(LS + '.active', JSON.stringify(S.active)); else localStorage.removeItem(LS + '.active'); }); }
function saveRunT() { tryLS(() => localStorage.setItem(LS + '.run', JSON.stringify(S.runT))); }

/* Cloud-Speicher (privat pro Nutzer) mit lokalem Fallback */
const Cloud = {
  ok:false, base:null, q:Promise.resolve(),
  put(coll, id, data) {
    if (!this.ok) return;
    const body = JSON.parse(JSON.stringify(data));
    this.q = this.q.then(() => this.base.collection(coll).doc(id).set(body)).catch(e => { S.cloud.err = (e && e.code) || 'fehler'; cloudBadge(); });
  },
  del(coll, id) { if (!this.ok) return; this.q = this.q.then(() => this.base.collection(coll).doc(id).delete()).catch(() => {}); },
  async init() {
    try {
      if (!window.claude || !window.claude.use) return null;
      const [user, db] = await Promise.all([window.claude.use('user'), window.claude.use('db')]);
      if (!user || !db) return null;
      const uid = await user.id(); if (!uid) return null;
      this.base = db.doc('data/users/' + uid + '/app');
      const [pf, ss, rs, gs, bs, ws] = await Promise.all([
        this.base.collection('meta').doc('profile').get(),
        this.base.collection('sessions').limit(1000).get(),
        this.base.collection('runs').limit(1000).get(),
        this.base.collection('grip').limit(1000).get(),
        this.base.collection('body').limit(1000).get(),
        this.base.collection('wake').limit(1000).get()
      ]);
      this.ok = true;
      return {profile:pf.exists ? pf.data() : null, sessions:ss.docs.map(d => d.data()), runs:rs.docs.map(d => d.data()), grip:gs.docs.map(d => d.data()), body:bs.docs.map(d => d.data()), wake:ws.docs.map(d => d.data())};
    } catch (e) { S.cloud.err = (e && e.code) || 'fehler'; return null; }
  }
};
function cloudBadge() { const el = $('#cloudstate'); if (el) el.textContent = cloudText(); }
function cloudText() {
  if (NATIVE) return 'Gespeichert auf diesem Handy, zusätzlich als Sicherungsdatei im App-Speicher (Teil von Androids Geräte-Backup). Für einen Gerätewechsel: Sicherung exportieren und auf dem neuen Handy laden.';
  if (Cloud.ok && !S.cloud.err) return 'Gespeichert im privaten Claude-Speicher und auf diesem Gerät.';
  if (Cloud.ok) return 'Cloud-Speicher meldet einen Fehler (' + S.cloud.err + '). Die Daten liegen weiterhin auf diesem Gerät.';
  return 'Nur auf diesem Gerät gespeichert (Browser-Speicher). Im Claude-Viewer wird zusätzlich privat in der Cloud gesichert.';
}
function mergeCloud(c) {
  if (!c) return;
  const cp = c.profile ? normProfile(c.profile) : null;
  /* Gelöschte IDs (Tombstones) beider Seiten vereinen, sonst tauchen auf einem Gerät gelöschte Einträge wieder auf */
  const tomb = new Set([...(cp ? cp.tomb : []), ...(S.p ? S.p.tomb : [])]);
  if (cp && (!S.p || (cp.upd || 0) >= (S.p.upd || 0))) S.p = cp;
  else if (S.p) Cloud.put('meta', 'profile', S.p);
  if (S.p) S.p.tomb = [...tomb].slice(-800);
  const mix = (local, remote, coll) => {
    const m = new Map(), rid = new Set(remote.map(x => x.id));
    local.forEach(x => m.set(x.id, x)); remote.forEach(x => m.set(x.id, x));
    local.forEach(x => { if (!rid.has(x.id) && !tomb.has(x.id)) Cloud.put(coll, x.id, x); });
    remote.forEach(x => { if (tomb.has(x.id)) Cloud.del(coll, x.id); });
    return [...m.values()].filter(x => !tomb.has(x.id));
  };
  S.sessions = mix(S.sessions, c.sessions, 'sessions').sort((a, b) => a.start - b.start);
  S.runs = mix(S.runs, c.runs, 'runs').sort((a, b) => a.t - b.t);
  S.grip = mix(S.grip, c.grip || [], 'grip').sort((a, b) => a.t - b.t);
  S.body = mix(S.body, c.body || [], 'body');
  S.wake = mix(S.wake, c.wake || [], 'wake');
  lsSave(); render();
}
let pTimer = null;
function saveProfile() { S.p.upd = Date.now(); lsSave(); reschedSoon(); clearTimeout(pTimer); pTimer = setTimeout(() => Cloud.put('meta', 'profile', S.p), 600); }
function saveSession(s) { lsSave(); Cloud.put('sessions', s.id, s); }
function saveRun(r) { lsSave(); Cloud.put('runs', r.id, r); }

/* ===== kleine Helfer ===== */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
function dshort(s) { return parseD(s).toLocaleDateString('de-DE', {day:'numeric', month:'short'}); }
function dlong(s) { return parseD(s).toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'}); }
function dweek(s) { return parseD(s).toLocaleDateString('de-DE', {weekday:'short', day:'numeric', month:'short'}); }
function pctDelta(a, b) { if (!a || !b) return null; return (a - b) / b * 100; }
function deltaHTML(d) {
  if (d === null || d === undefined) return '';
  const r = Math.round(d * 10) / 10;
  return '<span class="delta' + (r === 0 ? ' zero' : '') + '">' + (r > 0 ? '+' : '') + fmt(r) + ' %</span>';
}
function volT(kg) { return fmt(Math.round(kg / 100) / 10) + ' t'; }

/* ===== Diagramme (SVG) ===== */
function niceRange(lo, hi) {
  let pad = (hi - lo) * 0.18; if (!pad) pad = Math.max(1, hi * 0.05);
  let a = lo - pad, b = hi + pad; if (lo >= 0 && a < 0) a = 0;
  return [a, b];
}
function lineChart(pts, unit, label) {
  const W = 340, H = 170, L = 40, R = 14, T = 12, B = 26;
  const vs = pts.map(p => p.v), r = niceRange(Math.min(...vs), Math.max(...vs)), y0 = r[0], y1 = r[1];
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const X = t => pts.length === 1 || t1 === t0 ? (L + (W - L - R) / 2) : L + (t - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  let g = '';
  [0, 0.5, 1].forEach(f => {
    const v = y0 + (y1 - y0) * f, y = Y(v);
    g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="tx" x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + fmt(y1 - y0 < 4 ? Math.round(v * 10) / 10 : Math.round(v * 2) / 2) + '</text>';
  });
  const xy = pts.map(p => [X(p.t), Y(p.v)]);
  const line = xy.map((a, i) => (i ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1)).join(' ');
  const area = line + ' L' + xy[xy.length - 1][0].toFixed(1) + ' ' + (H - B) + ' L' + xy[0][0].toFixed(1) + ' ' + (H - B) + ' Z';
  const last = xy[xy.length - 1];
  const data = pts.map((p, i) => [Math.round(xy[i][0]), Math.round(xy[i][1]), dshort(p.date) + ': ' + fmt(p.v) + ' ' + unit + (p.top ? ' · bester Satz ' + p.top : '')]);
  return '<svg class="ch lc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '" data-pts="' + esc(JSON.stringify(data)) + '">' + g +
    '<text class="tx" x="' + L + '" y="' + (H - 8) + '">' + dshort(pts[0].date) + '</text><text class="tx" x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end">' + dshort(pts[pts.length - 1].date) + '</text>' +
    (pts.length > 1 ? '<path class="ar" d="' + area + '"/><path class="ln" d="' + line + '"/>' : '') +
    '<line class="mk lc-mk" x1="' + last[0] + '" x2="' + last[0] + '" y1="' + T + '" y2="' + (H - B) + '" style="display:none"/>' +
    xy.map((a, i) => i === xy.length - 1 ? '' : '<circle class="pt" cx="' + a[0] + '" cy="' + a[1] + '" r="3"/>').join('') +
    '<circle class="pt lc-dot" cx="' + last[0] + '" cy="' + last[1] + '" r="5"/></svg>';
}
function barChart(items, unit, label, fmtV) {
  const W = 340, H = 150, L = 8, R = 8, T = 10, B = 22, n = items.length;
  const max = Math.max(1, ...items.map(i => i.v)), bw = (W - L - R) / n;
  const bars = items.map((it, i) => {
    const h = (H - T - B) * it.v / max, x = L + i * bw + bw * 0.16, w = bw * 0.68, y = H - B - h;
    const tip = 'Woche ab ' + dshort(it.k) + ': ' + fmtV(it.v);
    return '<rect class="bar' + (i === n - 1 ? ' last' : '') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h, it.v > 0 ? 2 : 0).toFixed(1) + '" rx="2" data-act="bar" data-tip="' + esc(tip) + '"/>' +
      '<rect x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + (H - T - B) + '" fill="transparent" data-act="bar" data-tip="' + esc(tip) + '"/>';
  }).join('');
  return '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '"><line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>' + bars +
    '<text class="tx" x="' + L + '" y="' + (H - 6) + '">' + dshort(items[0].k) + '</text><text class="tx" x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + dshort(items[n - 1].k) + '</text></svg>';
}
