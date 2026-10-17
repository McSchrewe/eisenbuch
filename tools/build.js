/* Baut aus src/ zwei Ausgaben:
   www/index.html     – Android-App (Schriften lokal, läuft offline)
   dist/artifact.html – Web-Version für Claude */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const ORDER = ['logic.js', 'ui1.js', 'grip.js', 'body.js', 'native.js', 'ui2.js', 'ui3.js'];
const js = ORDER.map(src).join('\n').replace(/^'use strict';$/gm, '');
const css = src('style.css');
const markup = '<main class="wrap" id="view"></main><nav id="tabs" aria-label="Bereiche" hidden></nav><section class="screen" id="screen" hidden></section><div class="rest" id="rest" hidden></div><div class="sheetwrap" id="sheetwrap" hidden></div><div id="toast" role="status" aria-live="polite"></div>';
const script = '<script>\n\'use strict\';\n' + js + '\n</script>';

// Android
fs.mkdirSync(path.join(root, 'www/fonts'), {recursive: true});
const faces = [['Barlow', 'barlow', [400, 500, 600]], ['Barlow Condensed', 'barlow-condensed', [500, 600]]];
let fontCss = '';
for (const [fam, pkg, ws] of faces) for (const w of ws) {
  const f = `${pkg}-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', f), path.join(root, 'www/fonts', f));
  fontCss += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format('woff2')}\n`;
}
const reset = ':root{color-scheme:light}html,body{margin:0}body{font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
fs.writeFileSync(path.join(root, 'www/index.html'),
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="theme-color" content="#1F55C4"><title>Eisenbuch</title><style>' + reset + '\n' + fontCss + css + '</style></head><body>' + markup + script + '</body></html>');

// Claude-Artefakt
fs.mkdirSync(path.join(root, 'dist'), {recursive: true});
fs.writeFileSync(path.join(root, 'dist/artifact.html'),
  '<title>Eisenbuch</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Barlow:wght@400;500;600&display=swap">\n' +
  '<style>' + css + '</style>\n' + markup + '\n' + script);
console.log('www/index.html und dist/artifact.html gebaut');
