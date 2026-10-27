const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { json, feil, lesJson, vakt } = require('../lib/http');

// Live-runder: hver enhet sender sin status og får tilbake statusen til alle i samme lag.
// Kallet gjøres omtrent hvert sekund. Status eldre enn AKTIV_MS regnes som borte.
const AKTIV_MS = 15000;
const MAKS_DELTAKERE = 40;

app.http('rom', {
  route: 'rom/{kode}',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const kode = req.params.kode;
    if (!/^\d{4}$/.test(kode || '')) return feil(400, 'Lagkoden har fire sifre');
    const body = await lesJson(req, 6 * 1024);
    const peer = body.peer;
    if (typeof peer !== 'string' || !/^[a-z0-9]{8,32}$/.test(peer)) return feil(400, 'Ugyldig deltaker');
    const { rom } = await containers();

    if (body.leave) {
      try { await rom.item(peer, kode).delete(); } catch (e) { if (e.code !== 404) throw e; }
      return json(200, { now: Date.now(), peers: [] });
    }

    const now = Date.now();
    const { resources } = await rom.items
      .query({ query: 'SELECT c.id, c.presence, c.ts, c.leder, c.laererId FROM c WHERE c.ts > @t', parameters: [{ name: '@t', value: now - AKTIV_MS }] }, { partitionKey: kode })
      .fetchAll();

    const p = body.presence;
    if (p !== null && p !== undefined) {
      if (typeof p !== 'object' || Array.isArray(p) || JSON.stringify(p).length > 4096) return feil(400, 'Ugyldig status');
      const leder = p.role === 'leder';
      let laererId = null;
      if (leder) {
        // Bare en innlogget lærer kan være tavle, og bare én lærer per lagkode om gangen.
        const l = laererFra(req);
        if (!l) return feil(401, 'Tavla krever lærerinnlogging');
        laererId = l.laererId;
        if (resources.some(r => r.leder && r.id !== peer && r.laererId !== laererId)) return feil(409, 'Lagkoden er i bruk');
      }
      if (!resources.some(r => r.id === peer) && resources.length >= MAKS_DELTAKERE) return feil(429, 'Laget er fullt');
      const doc = { id: peer, kode, presence: p, ts: now, leder, laererId, ttl: 60 };
      await rom.items.upsert(doc);
      const i = resources.findIndex(r => r.id === peer);
      if (i >= 0) resources[i] = doc; else resources.push(doc);
    }

    return json(200, { now, peers: resources.map(r => ({ peer: r.id, presence: r.presence, ts: r.ts })) });
  }),
});
