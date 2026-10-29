const crypto = require('crypto');
const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { finnKlasse, nyKode, glem, norm } = require('../lib/klasser');
const { KUNDER } = require('../lib/kunder');
const { json, feil, lesJson, vakt } = require('../lib/http');

// Rapporter fra kundeservice-simulatoren til læreren.
// Læreren lager klassekoder. Eleven leverer med klassekode og navn, og rapporten lagres hos læreren som eier koden.
const MAKS_KLASSER = 30;
const MAKS_RAPPORTER = 2000;   // per lærer i én henting
const GRENSE = { antall: 300, ms: 10 * 60 * 1000 };
const UTFALL = ['lost', 'delvis', 'ulost', 'videre', 'brudd', 'lagpa', 'avbrutt'];

const kall = new Map();
function forMange(req) {
  const ip = (req.headers.get('x-forwarded-for') || 'ukjent').split(',')[0].trim();
  const nå = Date.now();
  const l = (kall.get(ip) || []).filter(t => t > nå - GRENSE.ms);
  l.push(nå);
  kall.set(ip, l);
  if (kall.size > 5000) kall.clear();
  return l.length > GRENSE.antall;
}

// Fjerner kontrolltegn og usynlige tegn og kutter lengden.
const tekst = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, n);
const tall = (x, a, b) => { const v = Math.round(Number(x)); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : a; };

// Rapporten kommer fra eleven og kontrolleres felt for felt. Ukjente felt tas ikke med.
function lesRapport(r) {
  if (!r || typeof r !== 'object' || !KUNDER[r.kunde] || !UTFALL.includes(r.utfall)) return null;
  const rader = Array.isArray(r.rader) ? r.rader.slice(0, 40) : [];
  return {
    kunde: r.kunde,
    ai: !!r.ai,
    utfall: r.utfall,
    humor: tall(r.humor, 0, 100),
    prof: tall(r.prof, 0, 100),
    svar: tall(r.svar, 0, 40),
    brudd: tall(r.brudd, 0, 40),
    oppsummering: tekst(r.oppsummering, 600),
    tips: tekst(r.tips, 400),
    rader: rader.map(v => ({
      sitat: tekst(v && v.sitat, 600),
      t: tekst(v && v.t, 600),
      p: tall(v && v.p, 0, 2),
      h: tall(v && v.h, -100, 100),
      hvorfor: tekst(v && v.hvorfor, 400),
      brudd: tekst(v && v.brudd, 300),
      bedre: tekst(v && v.bedre, 500),
    })),
  };
}

// Eleven sjekker klassekoden. Svaret sier om koden gir rapporter til læreren og om AI-kundene er satt opp.
app.http('klasseSjekk', {
  route: 'klasse',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (forMange(req)) return feil(429, 'For mange forsøk. Vent litt og prøv igjen.');
    const { kode } = await lesJson(req, 1024);
    const k = await finnKlasse(kode);
    if (!k) return feil(404, 'Fant ikke klassekoden');
    return json(200, { klasse: k.navn, ai: !!process.env.ANTHROPIC_API_KEY });
  }),
});

// Eleven leverer en rapport etter en samtale.
app.http('rapport', {
  route: 'rapport',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (forMange(req)) return feil(429, 'For mange rapporter akkurat nå. Vent litt og prøv igjen.');
    const body = await lesJson(req, 64 * 1024);
    const k = await finnKlasse(body.kode);
    if (!k) return feil(404, 'Fant ikke klassekoden');
    const elev = tekst(body.elev, 40);
    if (!elev) return feil(400, 'Skriv navnet ditt');
    const r = lesRapport(body.rapport);
    if (!r) return feil(400, 'Ugyldig rapport');
    const { rapporter } = await containers();
    await rapporter.items.create({ id: crypto.randomUUID(), laererId: k.laererId, klasse: k.kode, klassenavn: k.navn, elev, ts: Date.now(), ...r });
    return json(201, { ok: true });
  }),
});

// Læreren lister, lager og sletter klassekoder.
app.http('klasser', {
  route: 'klasser/{kode?}',
  methods: ['GET', 'POST', 'DELETE'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    const { klasser } = await containers();
    const mine = async () => (await klasser.items
      .query({ query: 'SELECT c.kode, c.navn, c.ts FROM c WHERE c.laererId = @l ORDER BY c.ts', parameters: [{ name: '@l', value: l.laererId }] })
      .fetchAll()).resources;
    if (req.method === 'GET') return json(200, { klasser: await mine() });
    if (req.method === 'DELETE') {
      const kode = norm(req.params.kode);
      const k = await finnKlasse(kode);
      if (!k || k.laererId !== l.laererId) return feil(404, 'Fant ikke klassekoden');
      await klasser.item(kode, kode).delete();
      glem(kode);
      return { status: 204 };
    }
    const navn = tekst((await lesJson(req, 1024)).navn, 40);
    if (!navn) return feil(400, 'Gi klassen et navn');
    if ((await mine()).length >= MAKS_KLASSER) return feil(400, `Du kan ha høyst ${MAKS_KLASSER} klassekoder`);
    for (let i = 0; i < 8; i++) {
      const kode = nyKode();
      try {
        await klasser.items.create({ id: kode, kode, laererId: l.laererId, navn, ts: Date.now() });
        glem(kode);
        return json(201, { kode, navn });
      } catch (e) {
        if (e.code !== 409) throw e;
      }
    }
    return feil(503, 'Fant ingen ledig kode. Prøv igjen.');
  }),
});

// Læreren henter og sletter rapporter.
app.http('rapporter', {
  route: 'rapporter',
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    const { rapporter } = await containers();
    const pk = { partitionKey: l.laererId };
    if (req.method === 'GET') {
      const { resources } = await rapporter.items
        .query({ query: `SELECT TOP ${MAKS_RAPPORTER} c.id, c.klasse, c.klassenavn, c.elev, c.ts, c.kunde, c.ai, c.utfall, c.humor, c.prof, c.svar, c.brudd, c.oppsummering, c.tips, c.rader FROM c WHERE c.laererId = @l ORDER BY c.ts DESC`, parameters: [{ name: '@l', value: l.laererId }] }, pk)
        .fetchAll();
      return json(200, { rapporter: resources });
    }
    // DELETE med ?id= sletter én rapport, ?klasse= alle for en klasse, uten parametre alle.
    const id = req.query.get('id'), klasse = req.query.get('klasse');
    if (id) {
      try { await rapporter.item(id, l.laererId).delete(); } catch (e) { if (e.code !== 404) throw e; }
      return { status: 204 };
    }
    const q = klasse
      ? { query: 'SELECT c.id FROM c WHERE c.laererId = @l AND c.klasse = @k', parameters: [{ name: '@l', value: l.laererId }, { name: '@k', value: norm(klasse) }] }
      : { query: 'SELECT c.id FROM c WHERE c.laererId = @l', parameters: [{ name: '@l', value: l.laererId }] };
    const { resources } = await rapporter.items.query(q, pk).fetchAll();
    for (const r of resources) await rapporter.item(r.id, l.laererId).delete();
    return { status: 204 };
  }),
});
