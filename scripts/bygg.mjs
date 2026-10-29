// Lager dist/ for Azure Static Web Apps fra sidene i rota (index.html og kundeservice.html).
// Sidene er skrevet som innholdet i en side (slik claude.ai Artifacts vil ha det),
// så her legges dokumentskallet rundt: doctype, head med metadata og stil, og body.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SIDER = ['index.html', 'kundeservice.html'];

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });

for (const side of SIDER) {
  const src = readFileSync(new URL('../' + side, import.meta.url), 'utf8');
  const cut = src.indexOf('<div class="wrap">');
  if (cut < 0) throw new Error(`Fant ikke <div class="wrap"> i ${side}`);

  const head = src.slice(0, cut).trim();
  const body = src.slice(cut).trim();

  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font: 14px/1.5 system-ui, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;

  writeFileSync(new URL('../dist/' + side, import.meta.url), html);
  console.log(`dist/${side} skrevet (${Math.round(html.length / 1024)} kB)`);
}
