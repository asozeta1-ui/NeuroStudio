const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

const used = new Set();
for (const m of js.matchAll(/\$\(\s*'([^']+)'\s*\)/g)) used.add(m[1]);
for (const m of js.matchAll(/getElementById\('([^']+)'\)/g)) used.add(m[1]);

const defined = new Set();
for (const m of html.matchAll(/id="([^"]+)"/g)) defined.add(m[1]);

let fail = 0;
for (const id of [...used].sort()) {
  if (!defined.has(id)) { console.log(`FALTA  #${id}`); fail++; }
  else console.log(`OK     #${id}`);
}

for (const cls of ['.toast', '.suggestion', '.nav-btn', '.tab']) {
  const inHtml = html.includes(cls.slice(1));
  const inCss = css.includes(cls);
  console.log(inHtml || inCss ? `OK     clase ${cls}` : `FALTA  clase ${cls}`);
  if (!inHtml && !inCss) fail++;
}

for (const asset of ['/style.css', '/app.js']) {
  console.log(html.includes(asset) ? `OK     asset ${asset}` : `FALTA  asset ${asset}`);
  if (!html.includes(asset)) fail++;
}

for (const cls of ['msg', 'user-bubble', 'assistant-bubble', 'studio-bubble', 'chat-code', 'action-chip', 'msg-avatar', 'code-block', 'copy-btn', 'msg-time', 'inline-code', 'thinking-box', 'think-note']) {
  console.log(css.includes('.' + cls) ? `OK     css .${cls}` : `FALTA  css .${cls}`);
  if (!css.includes('.' + cls)) fail++;
}

console.log(fail ? `\n${fail} PROBLEMAS` : '\nTODO OK');
process.exit(fail ? 1 : 0);
