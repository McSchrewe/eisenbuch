/* Baut aus src/ zwei Ausgaben:
   www/index.html     – Android-App (Schriften lokal, läuft offline)
   dist/artifact.html – Web-Version für Claude */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const ORDER = ['logic.js', 'plans.js', 'ui1.js', 'grip.js', 'body.js', 'native.js', 'tricks.js', 'extras.js', 'records.js', 'volume.js', 'views.js', 'charts.js', 'workout.js', 'ui3.js'];
const js = ORDER.map(src).join('\n').replace(/^'use strict';$/gm, '');
const css = src('style.css');
const markup = '<main class="wrap" id="view"></main><nav id="tabs" aria-label="Bereiche" hidden></nav><section class="screen" id="screen" hidden></section><div class="rest" id="rest" hidden></div><div class="sheetwrap" id="sheetwrap" hidden></div><div id="toast" role="status" aria-live="polite"></div><div class="trophy" id="trophy" data-act="tro-x" hidden></div>';
/* Übungsbilder: Zuordnung App-Übung -> Bild aus free-exercise-db (gemeinfrei) */
const imgmap = JSON.parse(fs.readFileSync(path.join(root, 'tools/imgmap.json'), 'utf8')), eximg = {};
Object.entries(imgmap).forEach(([k, v]) => { if (v && fs.existsSync(path.join(root, 'assets/exercises', v + '-0.jpg'))) eximg[k] = v; });
/* Übungsfiguren: einheitliche Linienzeichnungen (Everkinetic, CC BY-SA 4.0), siehe tools/makefigs.py */
const figmap = JSON.parse(fs.readFileSync(path.join(root, 'tools/figmap.json'), 'utf8')), exfig = {};
Object.entries(figmap).forEach(([k, v]) => { if (fs.existsSync(path.join(root, 'assets/figs', v + '.jpg'))) exfig[k] = v; });
const figdata = {}; [...new Set(Object.values(exfig))].forEach(n => { figdata[n] = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'assets/figs', n + '.jpg')).toString('base64'); });
const mk = (map, fd) => '<script>\n\'use strict\';\nconst EXIMG = ' + JSON.stringify(map) + ';\nconst EXFIG = ' + JSON.stringify(exfig) + ';\nconst FIGDATA = ' + JSON.stringify(fd || {}) + ';\n' + js + '\n</script>';
const script = mk(eximg);
/* Sichtbare Fehlermeldung statt leerem Bildschirm, falls beim Start etwas schiefgeht */
const guard = '<script>window.addEventListener("error",function(e){var v=document.getElementById("view");if(v&&!v.innerHTML.trim()){v.innerHTML="<div style=\\"padding:24px;font:15px/1.5 system-ui;color:#B8342B\\"><b>Eisenbuch konnte nicht starten.</b><br>"+String(e.message).replace(/</g,"&lt;")+"<br><small>"+(e.filename||"")+":"+(e.lineno||"")+"</small></div>";}console.error("EB_START_ERROR "+e.message+" @"+e.lineno);});</script>';

// Android
fs.mkdirSync(path.join(root, 'www'), {recursive: true});
const fontCss = ''; /* Systemschrift (Roboto auf Android) */
const reset = ':root{color-scheme:light}html,body{margin:0}body{font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
fs.writeFileSync(path.join(root, 'www/index.html'),
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="theme-color" content="#111514"><title>Eisenbuch</title><style>' + reset + '\n' + fontCss + css + '</style></head><body>' + markup + guard + '<script src="capacitor.js"></script>' + script + '</body></html>');
fs.copyFileSync(path.join(root, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(root, 'www/capacitor.js'));
fs.mkdirSync(path.join(root, 'www/img/ex'), {recursive: true});
fs.readdirSync(path.join(root, 'assets/exercises')).forEach(f => fs.copyFileSync(path.join(root, 'assets/exercises', f), path.join(root, 'www/img/ex', f)));
fs.mkdirSync(path.join(root, 'www/img/fig'), {recursive: true});
fs.readdirSync(path.join(root, 'assets/figs')).forEach(f => fs.copyFileSync(path.join(root, 'assets/figs', f), path.join(root, 'www/img/fig', f)));

// Claude-Artefakt
fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
fs.writeFileSync(path.join(root, 'dist/artifact.html'),
  '<title>Eisenbuch</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' +
  '<style>' + css + '</style>\n' + markup + '\n' + mk({}, figdata));
console.log('www/index.html und dist/artifact.html gebaut');
