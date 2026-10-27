const { app } = require('@azure/functions');
const { finnLaerer, lagToken, laererFra } = require('../lib/auth');
const { containers } = require('../lib/cosmos');
const { json, feil, lesJson, vakt } = require('../lib/http');

// Enkel begrensning av innloggingsforsøk per IP (per instans av funksjonsappen).
const forsok = new Map();
function forMange(ip) {
  const now = Date.now();
  const f = forsok.get(ip) || { n: 0, t: now };
  if (now - f.t > 10 * 60 * 1000) { f.n = 0; f.t = now; }
  f.n++;
  forsok.set(ip, f);
  if (forsok.size > 5000) forsok.clear();
  return f.n > 10;
}

app.http('helse', {
  route: 'helse',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async () => json(200, { ok: true }),
});

app.http('laererLogin', {
  route: 'laerer/login',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const ip = (req.headers.get('x-forwarded-for') || 'ukjent').split(',')[0].trim();
    if (forMange(ip)) return feil(429, 'For mange forsøk');
    const { kode } = await lesJson(req, 1024);
    const l = finnLaerer(kode);
    if (!l) return feil(401, 'Feil lærerkode');
    const { token, exp } = lagToken(l);
    return json(200, { token, exp, navn: l.navn });
  }),
});

// Henter lærerens lagrede oppsett og rundelogg.
app.http('data', {
  route: 'data',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    const { oppsett, runder } = await containers();
    let cfg = null;
    try {
      const { resource } = await oppsett.item('aktiv', l.laererId).read();
      cfg = resource ? resource.cfg : null;
    } catch (e) {
      if (e.code !== 404) throw e;
    }
    const { resources } = await runder.items
      .query({ query: 'SELECT c.runde FROM c WHERE c.laererId = @l ORDER BY c.ts', parameters: [{ name: '@l', value: l.laererId }] }, { partitionKey: l.laererId })
      .fetchAll();
    return json(200, { oppsett: cfg, runder: resources.map(r => r.runde) });
  }),
});

app.http('oppsett', {
  route: 'oppsett',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    const { cfg } = await lesJson(req, 16 * 1024);
    if (!cfg || typeof cfg !== 'object' || !Array.isArray(cfg.stations)) return feil(400, 'Mangler oppsett');
    const { oppsett } = await containers();
    await oppsett.items.upsert({ id: 'aktiv', laererId: l.laererId, cfg, ts: Date.now() });
    return { status: 204 };
  }),
});

app.http('runder', {
  route: 'runder',
  methods: ['POST', 'DELETE'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    const { runder } = await containers();
    if (req.method === 'DELETE') {
      const { resources } = await runder.items
        .query({ query: 'SELECT c.id FROM c WHERE c.laererId = @l', parameters: [{ name: '@l', value: l.laererId }] }, { partitionKey: l.laererId })
        .fetchAll();
      for (const r of resources) await runder.item(r.id, l.laererId).delete();
      return { status: 204 };
    }
    const { runde } = await lesJson(req, 24 * 1024);
    if (!runde || typeof runde !== 'object' || !runde.cfg || !runde.res) return feil(400, 'Mangler runde');
    await runder.items.create({ id: require('crypto').randomUUID(), laererId: l.laererId, ts: Date.now(), runde });
    return { status: 204 };
  }),
});
