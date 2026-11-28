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
    return json(200, { navn: l.navn, seksjoner: medPamelding(SEKSJONER) });
  }),
});

// ADR-påmeldingen er bare for lokal bruk på skolen og ligger ikke i repoet. Adressen til filen der skolen har den
// (for eksempel i SharePoint) settes i innstillingen ADR_PAMELDING_URL, så den bare vises for innlogget lærer.
function medPamelding(seksjoner) {
  const url = (process.env.ADR_PAMELDING_URL || '').trim();
  const kort = {
    merke: 'PM', tittel: 'ADR-påmelding (lokal PC)', for: 'Oppmelding til ADR-prøven og blankett NA-0200',
    tekst: 'Åpne filen i Edge eller Chrome på en PC på kurset. Elevene legger seg inn med «+ Ny deltaker», og listen er skjult bak en PIN-kode du velger. Opplysningene lagres bare kryptert på den PC-en. Du får listen til DSB, blankett NA-0200 utfylt for hver deltaker og en samlet PDF til arkivet. Filen ligger internt på skolen og skal ikke deles utenfor.'
      + (/^https:\/\//.test(url) ? '' : ' Lenken er ikke satt opp ennå: legg adressen til filen i innstillingen ADR_PAMELDING_URL i Azure.'),
    login: 'PIN-kode du velger selv',
    lenker: /^https:\/\//.test(url) ? [{ tekst: 'Åpne påmeldingen', url, hoved: true }] : [],
  };
  return seksjoner.map(s => (s.tittel === 'ADR grunnkurs' ? { ...s, kort: [...s.kort, kort] } : s));
}
