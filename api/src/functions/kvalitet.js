const crypto = require('crypto');
const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { json, feil, vakt } = require('../lib/http');

// Kvalitetsdelen: anonyme hendelser fra simuleringsverktøyene på seiknes-ui.github.io.
// Verktøyene sender hendelser uten innlogging. Bare en innlogget lærer kan lese oversikten.
// Det lagres ingen navn, ingen IP-adresse og bare dato, ikke klokkeslett.
//
// En hendelse er { v: verktøy, h: hendelse, k: nøkkel, t: tekst, a: svar/verdi, m: ekstra }.
// Eksempel fra teoriprøven: { v: 'teori', h: 'feil', k: 'q1x2y3', t: 'Hva er friløft?', a: 'Hvor høyt ...', m: 'm2.2' }.

const VERKTOY = ['teori', 'adr', 'ysk', 'hms', 'truck', 'fraktvekt', 'trekk', 'aksel', 'kkvm', 'takt', 'kundeservice', 'speditoren'];
const MAKS_PER_KALL = 20;
const GRENSE = { antall: 400, ms: 10 * 60 * 1000 };

const kall = new Map();
function forMange(req, n) {
  const ip = (req.headers.get('x-forwarded-for') || 'ukjent').split(',')[0].trim();
  const nå = Date.now();
  const l = (kall.get(ip) || []).filter(t => t > nå - GRENSE.ms);
  for (let i = 0; i < n; i++) l.push(nå);
  kall.set(ip, l);
  if (kall.size > 5000) kall.clear();
  return l.length > GRENSE.antall;
}

// Fjerner kontrolltegn og kutter lengden.
const tekst = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, n);

// Hver hendelse kontrolleres felt for felt. Ukjente verktøy og felt tas ikke med.
function lesHendelse(e, dato) {
  if (!e || typeof e !== 'object' || !VERKTOY.includes(e.v) || typeof e.h !== 'string' || !/^[a-z]{1,20}$/i.test(e.h)) return null;
  return {
    id: crypto.randomUUID(),
    v: e.v,
    h: e.h,
    k: tekst(e.k, 60),
    t: tekst(e.t, 160),
    a: tekst(e.a, 120),
    m: tekst(e.m, 40),
    dato,
  };
}

// Tar imot hendelser. Verktøyene sender med sendBeacon / fetch uten CORS-forhåndssjekk (text/plain),
// så svaret leses ikke av nettleseren. Derfor svarer vi kort og ignorerer ugyldige hendelser stille.
app.http('kvalitetInn', {
  route: 'kvalitet',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const txt = await req.text();
    if (!txt || txt.length > 16 * 1024) return json(400, { ok: false });
    let data;
    try { data = JSON.parse(txt); } catch { return json(400, { ok: false }); }
    const liste = (Array.isArray(data) ? data : [data]).slice(0, MAKS_PER_KALL);
    if (forMange(req, liste.length)) return json(429, { ok: false });
    const dato = new Date().toISOString().slice(0, 10);
    const gyldige = liste.map(e => lesHendelse(e, dato)).filter(Boolean);
    if (!gyldige.length) return json(200, { ok: true, lagret: 0 });
    const { kvalitet } = await containers();
    await Promise.all(gyldige.map(d => kvalitet.items.create(d)));
    return json(200, { ok: true, lagret: gyldige.length });
  }),
});

// Oversikt for innlogget lærer: tellinger gruppert per verktøy, hendelse, nøkkel og svar.
app.http('kvalitetOversikt', {
  route: 'kvalitet/oversikt',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (!laererFra(req)) return feil(401, 'Logg inn på nytt');
    const dager = Math.max(1, Math.min(400, Number(new URL(req.url).searchParams.get('dager')) || 90));
    const fra = new Date(Date.now() - dager * 864e5).toISOString().slice(0, 10);
    const { kvalitet } = await containers();
    const params = [{ name: '@fra', value: fra }];
    const [grupper, perDag] = await Promise.all([
      kvalitet.items.query({
        query: 'SELECT c.v, c.h, c.k, c.t, c.a, c.m, COUNT(1) AS n FROM c WHERE c.dato >= @fra GROUP BY c.v, c.h, c.k, c.t, c.a, c.m',
        parameters: params,
      }).fetchAll(),
      kvalitet.items.query({
        query: 'SELECT c.v, c.dato, COUNT(1) AS n FROM c WHERE c.dato >= @fra GROUP BY c.v, c.dato',
        parameters: params,
      }).fetchAll(),
    ]);
    return json(200, { fra, dager, grupper: grupper.resources, perDag: perDag.resources });
  }),
});
