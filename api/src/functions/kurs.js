const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { json, feil, lesJson, vakt } = require('../lib/http');

// Eksamensnotater til Kursstien: spørsmål fra den avsluttende teoriprøven med fasit, koblet til steg i leksjonene.
// Prøvene er beskyttet (MA-system) og fasiten skal ikke nå elevene, så alt her krever lærertoken.
// Notatene er felles for alle lærere på skolen, ett dokument per modul.
const MODULER = ['1.1', '2.2'];
const STATUS = ['pdf', 'rettet', 'sjekk'];
const FELLES = 'felles';

const tekst = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

// Fila kommer fra læreren, men kontrolleres likevel felt for felt. Ukjente felt tas ikke med.
function lesEksamen(e) {
  if (!e || typeof e !== 'object' || !MODULER.includes(e.modul) || !Array.isArray(e.spm)) return null;
  const spm = e.spm.slice(0, 120).map(q => {
    const v = Array.isArray(q && q.v) ? q.v.slice(0, 6).map(x => tekst(x, 300)) : [];
    const r = Number(q && q.r);
    return {
      nr: Math.max(0, Math.min(999, Math.round(Number(q && q.nr)) || 0)),
      s: tekst(q && q.s, 500),
      v,
      r: Number.isInteger(r) && r >= 0 && r < v.length ? r : null,
      status: STATUS.includes(q && q.status) ? q.status : 'pdf',
      merknad: tekst(q && q.merknad, 600),
      steg: Array.isArray(q && q.steg) ? q.steg.slice(0, 6).map(x => tekst(x, 40)).filter(x => /^m\d\d-\d+:[a-z0-9]+$/.test(x)) : [],
    };
  }).filter(q => q.s && q.v.length);
  return { modul: e.modul, tittel: tekst(e.tittel, 200), fasit: tekst(e.fasit, 600), skilt: tekst(e.skilt, 800), spm };
}

app.http('kursEksamen', {
  route: 'kurs/eksamen',
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const laerer = laererFra(req);
    if (!laerer) return feil(401, 'Krever lærerinnlogging');
    const { kurs } = await containers();

    if (req.method === 'GET') {
      const { resources } = await kurs.items
        .query({ query: 'SELECT * FROM c WHERE c.laererId = @l AND c.type = "eksamen"', parameters: [{ name: '@l', value: FELLES }] })
        .fetchAll();
      const moduler = {};
      for (const d of resources) moduler[d.modul] = { tittel: d.tittel, fasit: d.fasit, skilt: d.skilt, spm: d.spm, oppdatert: d.oppdatert, av: d.av };
      return json(200, { moduler });
    }

    const e = lesEksamen(await lesJson(req, 256 * 1024));
    if (!e) return feil(400, 'Fila må ha modul (1.1 eller 2.2) og en liste med spørsmål');
    await kurs.items.upsert({ id: 'eksamen-' + e.modul, laererId: FELLES, type: 'eksamen', ...e, oppdatert: Date.now(), av: laerer.navn });
    return json(200, { modul: e.modul, antall: e.spm.length });
  }),
});
