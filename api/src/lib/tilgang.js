// Felles tilgang til AI-funksjonene (AI-kunder og ADR-oppgavesjekk).
// Tilgang krever lærerinnlogging eller en klassekode (fra læreren i appen eller KUNDESERVICE_KODER).
const crypto = require('crypto');
const { laererFra } = require('./auth');
const { finnKlasse } = require('./klasser');

const sha = s => crypto.createHash('sha256').update(s).digest();
const norm = s => String(s).trim().toLowerCase();

function klassekoder() {
  return (process.env.KUNDESERVICE_KODER || '').split(/[;\n]/).map(norm).filter(k => k.length >= 4);
}

// Svarer hvem som har tilgang: { laerer } for innlogget lærer, { klasse } for en klassekode fra appen,
// { fast: true } for en kode fra innstillingene, eller null.
async function hvem(req, kode) {
  try { const l = laererFra(req); if (l) return { laerer: l }; } catch { /* TOKEN_SECRET mangler: bare klassekoder gjelder */ }
  if (typeof kode !== 'string' || !kode) return null;
  const h = sha('ks:' + norm(kode));
  let ok = false;
  for (const k of klassekoder()) if (crypto.timingSafeEqual(h, sha('ks:' + k))) ok = true;
  if (ok) return { fast: true };
  try { const k = await finnKlasse(kode); return k ? { klasse: k } : null; } catch { return null; }
}

const harTilgang = async (req, kode) => !!(await hvem(req, kode));

// Enkel sperre mot løpske skript. Den gjelder per instans, så den reelle grensen er utgiftsgrensen i Claude Console.
function sperre(grense) {
  const kall = new Map();
  return req => {
    const ip = (req.headers.get('x-forwarded-for') || 'ukjent').split(',')[0].trim();
    const nå = Date.now();
    const l = (kall.get(ip) || []).filter(t => t > nå - grense.ms);
    l.push(nå);
    kall.set(ip, l);
    if (kall.size > 5000) kall.clear();
    return l.length > grense.antall;
  };
}

module.exports = { hvem, harTilgang, klassekoder, sperre };
