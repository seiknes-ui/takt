// ADR/RID 2025 fra DSB som tekst, én side per PDF-side (sideskift \f), så sidetallene er de samme som i boka.
// Fila api/data/adr.txt lages ved utrulling (se .github/workflows) og ligger ikke i repoet.
const fs = require('fs');
const path = require('path');

const FIL = process.env.ADR_BOK_FIL || path.join(__dirname, '..', '..', 'data', 'adr.txt');
let sider = null;

function last() {
  if (sider) return sider;
  if (!fs.existsSync(FIL)) return null;
  sider = fs.readFileSync(FIL, 'utf8').split('\f').map(s => s.split('\n'));
  return sider;
}

const HODE = /^(\d\.\d+(?:\.\d+)*)\s+\S/;
const FOTNOTE = /^([1-9]|[a-e][.)])\s+[A-ZÆØÅ«]/;

// Fotnotene nederst på en side (små tall i teksten viser hit).
function fotnoter(s) {
  const ls = sider[s].filter(l => l.trim());
  return ls.slice(-12).filter(l => FOTNOTE.test(l));
}

// Hele avsnittet, fra overskriften til neste avsnitt som ikke er et underavsnitt, med fotnotene på sidene.
function avsnitt(sec, maksLinjer = 150) {
  const pat = new RegExp('^' + sec.replace(/\./g, '\\.') + '\\s+(ADR|RID|[A-ZÆØÅ«(])');
  const ut = [];
  for (let s = 0; s < sider.length && ut.length < 2; s++) {
    sider[s].forEach((l, i) => {
      if (ut.length >= 2 || !pat.test(l) || l.includes('.....')) return;
      const linjer = [`[${sec}, side ${s + 1}]`];
      let ss = s, ii = i, n = 0;
      while (n < maksLinjer && ss < sider.length) {
        if (ii >= sider[ss].length) {
          const fn = fotnoter(ss);
          if (fn.length) linjer.push(`[fotnoter nederst på side ${ss + 1}: ${fn.join(' | ')}]`);
          ss++; ii = 0;
          if (ss < sider.length) linjer.push(`[side ${ss + 1}]`);
          continue;
        }
        const l2 = sider[ss][ii];
        const m = HODE.exec(l2);
        if (n > 0 && m && !m[1].startsWith(sec) && !l2.includes('.....')) break;
        linjer.push(l2); ii++; n++;
      }
      if (ss < sider.length) { const fn = fotnoter(ss); if (fn.length && !linjer[linjer.length - 1].startsWith('[fotnoter')) linjer.push(`[fotnoter nederst på side ${ss + 1}: ${fn.join(' | ')}]`); }
      ut.push(linjer.join('\n'));
    });
  }
  return ut;
}

// Radene for et UN-nummer i Tabell A og Tabell B (raden er delt på to sider i boka).
function unRader(un) {
  const ut = [];
  const start = new RegExp('^' + un + '\\s+[A-ZÆØÅ]');
  const slutt = new RegExp('\\s' + un + '$');
  sider.forEach((ls, s) => ls.forEach((l, i) => {
    if (ut.length < 6 && (start.test(l) || slutt.test(l))) ut.push(`[UN ${un}, side ${s + 1}]\n` + ls.slice(Math.max(0, i - 6), i + 8).join('\n'));
  }));
  return ut;
}

// Linjer der alle ordene står (på linjen og den neste), med litt sammenheng rundt.
function sok(ord, maks = 12) {
  const o = ord.map(x => String(x).toLowerCase()).filter(x => x.length >= 2);
  if (!o.length) return [];
  const ut = [];
  for (let s = 0; s < sider.length && ut.length < maks; s++) {
    const ls = sider[s];
    for (let i = 0; i < ls.length && ut.length < maks; i++) {
      const blokk = (ls[i] + ' ' + (ls[i + 1] || '')).toLowerCase();
      if (!blokk.includes(o[0]) || !o.every(x => blokk.includes(x))) continue;
      ut.push(`[søk «${ord.join(' ')}», side ${s + 1}]\n` + ls.slice(Math.max(0, i - 3), i + 6).join('\n'));
      i += 6;
    }
  }
  return ut;
}

// Samler utdrag fra boka etter planen fra første kall. Holder seg under omtrent maksTegn.
function utdrag(plan, maksTegn = 60000) {
  if (!last()) return null;
  const deler = [];
  const legg = arr => { for (const d of arr) if (!deler.includes(d)) deler.push(d); };
  for (const a of (plan.avsnitt || []).slice(0, 8)) if (/^\d\.\d+(\.\d+)*$/.test(a)) legg(avsnitt(a));
  for (const p of (plan.paragrafer || []).slice(0, 4)) { const n = String(p).replace(/[§.]/g, '').trim().toLowerCase(); if (/^\d+( ?[a-z])?$/.test(n)) legg(sok(['§ ' + n + '.'], 2)); }
  for (const u of (plan.un || []).slice(0, 4)) if (/^\d{4}$/.test(u)) legg(unRader(u));
  for (const ord of (plan.sokeord || []).slice(0, 6)) legg(sok(String(ord).split(/\s+/).slice(0, 4), 4));
  let ut = '', n = 0;
  for (const d of deler) { if (ut.length + d.length > maksTegn) break; ut += (ut ? '\n\n' : '') + d; n++; }
  return { tekst: ut, antall: n };
}

module.exports = { last, utdrag, avsnitt, unRader, sok };
