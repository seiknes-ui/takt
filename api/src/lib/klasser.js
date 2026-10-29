// Klassekoder som læreren lager selv. Eleven skriver inn koden for å levere rapporter til læreren
// og for å bruke AI-kundene. Koden er dokument-id og partisjonsnøkkel i containeren «klasser».
const crypto = require('crypto');
const { containers } = require('./cosmos');

const ORD = ['bjork', 'fjord', 'maake', 'elg', 'tind', 'bolge', 'gran', 'rev', 'orn', 'klover', 'lyng', 'skog', 'sild', 'hval', 'mose', 'stein', 'fure', 'bekk', 'lom', 'oter'];

const norm = s => String(s || '').trim().toLowerCase();
const gyldig = k => /^[a-z]{2,8}-\d{4}$/.test(k);

function nyKode() {
  return ORD[crypto.randomInt(ORD.length)] + '-' + String(crypto.randomInt(10000)).padStart(4, '0');
}

// Kort mellomlager, så hver melding til AI-kunden ikke koster et databasekall.
const cache = new Map();
const CACHE_MS = 60 * 1000;

async function finnKlasse(kode) {
  const k = norm(kode);
  if (!gyldig(k)) return null;
  const c = cache.get(k);
  if (c && c.t > Date.now() - CACHE_MS) return c.v;
  const { klasser } = await containers();
  let v = null;
  try {
    const { resource } = await klasser.item(k, k).read();
    if (resource) v = { kode: resource.kode, laererId: resource.laererId, navn: resource.navn };
  } catch (e) {
    if (e.code !== 404) throw e;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(k, { t: Date.now(), v });
  return v;
}

const glem = kode => cache.delete(norm(kode));

module.exports = { finnKlasse, nyKode, glem, norm };
