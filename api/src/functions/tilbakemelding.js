const crypto = require('crypto');
const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { json, feil, lesJson, vakt } = require('../lib/http');

// Kurstilbakemelding: «Hvordan var kurset?» med surt, nøytralt eller smilende fjes og
// en valgfri kommentar. Elevene svarer uten innlogging, bare en innlogget lærer kan lese.
// Det lagres ingen navn, ingen IP-adresse og bare dato, ikke klokkeslett.
//
// Et svar er { id, kurs, svar: 'sur' | 'noytral' | 'glad', kommentar, dato }.

const SVAR = ['sur', 'noytral', 'glad'];
// Et nettbrett ved døra sender mange svar fra samme IP, og hele skolen deler ofte én
// IP utad, så grensen er romslig. Den stopper bare skripting.
const GRENSE = { antall: 300, ms: 10 * 60 * 1000 };

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

// Fjerner usynlige tegn, gjør kontrolltegn og linjeskift om til mellomrom og kutter lengden.
const tekst = (s, n) => String(s == null ? '' : s).replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '').replace(/[\u0000-\u001F\u007F\s]+/g, ' ').trim().slice(0, n);

app.http('tilbakemeldingInn', {
  route: 'tilbakemelding',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (forMange(req)) return feil(429, 'For mange svar. Vent litt og prøv igjen.');
    const b = await lesJson(req, 4 * 1024);
    if (!SVAR.includes(b.svar)) return feil(400, 'Velg et fjes');
    const doc = {
      id: crypto.randomUUID(),
      kurs: tekst(b.kurs, 60) || 'Kurset',
      svar: b.svar,
      kommentar: tekst(b.kommentar, 500),
      dato: new Date().toISOString().slice(0, 10),
    };
    const { tilbakemelding } = await containers();
    await tilbakemelding.items.create(doc);
    return json(201, { ok: true });
  }),
});

app.http('tilbakemeldingOversikt', {
  route: 'tilbakemelding/oversikt',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (!laererFra(req)) return feil(401, 'Logg inn på nytt');
    const dager = Math.max(1, Math.min(400, Number(new URL(req.url).searchParams.get('dager')) || 90));
    const fra = new Date(Date.now() - dager * 864e5).toISOString().slice(0, 10);
    const { tilbakemelding } = await containers();
    const { resources } = await tilbakemelding.items.query({
      query: 'SELECT c.id, c.kurs, c.svar, c.kommentar, c.dato FROM c WHERE c.dato >= @fra ORDER BY c.dato DESC',
      parameters: [{ name: '@fra', value: fra }],
    }).fetchAll();
    return json(200, { fra, dager, svar: resources });
  }),
});

// Læreren kan slette et enkelt svar, for eksempel en upassende kommentar.
app.http('tilbakemeldingSlett', {
  route: 'tilbakemelding/{kurs}/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    if (!laererFra(req)) return feil(401, 'Logg inn på nytt');
    const { tilbakemelding } = await containers();
    try {
      await tilbakemelding.item(req.params.id, req.params.kurs).delete();
    } catch (e) {
      if (e.code !== 404) throw e;
    }
    return { status: 204 };
  }),
});
