const { app } = require('@azure/functions');
const { laererFra } = require('../lib/auth');
const { json, feil, vakt } = require('../lib/http');
const { SEKSJONER } = require('../lib/lenker');

// Lenkene til lærersiden (laerer.html). Bare for innlogget lærer.
app.http('lenker', {
  route: 'lenker',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: vakt(async req => {
    const l = laererFra(req);
    if (!l) return feil(401, 'Logg inn på nytt');
    return json(200, { navn: l.navn, seksjoner: SEKSJONER });
  }),
});
