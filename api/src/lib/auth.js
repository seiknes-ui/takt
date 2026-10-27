// Enkel lærerinnlogging: koder ligger i innstillingen LAERER_KODER som "kode=Navn;kode2=Navn2".
// Koden lagres aldri i databasen. Læreren identifiseres av en hash av koden, og får et signert token.
const crypto = require('crypto');

const TTL_MS = 12 * 60 * 60 * 1000;

function secret() {
  const s = process.env.TOKEN_SECRET;
  if (!s || s.length < 16) throw new Error('TOKEN_SECRET mangler eller er for kort (minst 16 tegn)');
  return s;
}

const sha = s => crypto.createHash('sha256').update(s).digest();

function laerere() {
  return (process.env.LAERER_KODER || '')
    .split(/[;\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const i = s.indexOf('=');
      const kode = (i < 0 ? s : s.slice(0, i)).trim();
      const navn = (i < 0 ? 'Lærer' : s.slice(i + 1).trim()) || 'Lærer';
      return { kode, navn };
    })
    .filter(l => l.kode.length >= 4);
}

// Sammenligner koden mot alle registrerte koder uten å lekke hvilken som nesten stemte.
function finnLaerer(kode) {
  if (typeof kode !== 'string' || !kode) return null;
  const h = sha('takt-kode:' + kode.trim());
  let funnet = null;
  for (const l of laerere()) if (crypto.timingSafeEqual(h, sha('takt-kode:' + l.kode))) funnet = l;
  if (!funnet) return null;
  return { laererId: sha('takt-laerer:' + funnet.kode).toString('hex').slice(0, 24), navn: funnet.navn };
}

const b64 = buf => Buffer.from(buf).toString('base64url');
const sign = data => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function lagToken({ laererId, navn }) {
  const exp = Date.now() + TTL_MS;
  const body = b64(JSON.stringify({ l: laererId, n: navn, e: exp }));
  return { token: body + '.' + sign(body), exp };
}

function lesToken(token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = sign(body);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p || typeof p.l !== 'string' || !(p.e > Date.now())) return null;
    return { laererId: p.l, navn: p.n };
  } catch {
    return null;
  }
}

const laererFra = req => lesToken(req.headers.get('x-laerer-token'));

module.exports = { finnLaerer, lagToken, lesToken, laererFra };
