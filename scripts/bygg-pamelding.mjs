// Lager skjema/adr-pamelding-lokal.html: én fil som virker uten nett på en lokal PC.
// pdf-lib, utfyllingen av NA-0200 og selve blanketten (som base64) bakes inn i filen.
// Kjør: node scripts/bygg-pamelding.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fil = p => new URL('../' + p, import.meta.url);
const skript = s => s.replace(/<\/script/gi, '<\\/script');
const src = readFileSync(fil('skjema/adr-pamelding-lokal.src.html'), 'utf8');
const html = src
  .replace('/*PDFLIB*/', () => skript(readFileSync(fil('skjema/pdf-lib.min.js'), 'utf8')))
  .replace('/*NA0200*/', () => skript(readFileSync(fil('skjema/na0200.js'), 'utf8')))
  .replace('__MAL_BASE64__', () => readFileSync(fil('skjema/na0200.pdf')).toString('base64'));
writeFileSync(fil('skjema/adr-pamelding-lokal.html'), html);
console.log(`skjema/adr-pamelding-lokal.html skrevet (${Math.round(html.length / 1024)} kB)`);
