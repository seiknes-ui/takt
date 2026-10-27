// Små hjelpere for JSON-svar og innlesing av forespørsler.
const json = (status, body) => ({ status, jsonBody: body, headers: { 'cache-control': 'no-store' } });
const feil = (status, melding) => json(status, { feil: melding });

// Leser JSON-kroppen og avviser for store forespørsler.
async function lesJson(req, maks = 32 * 1024) {
  const text = await req.text();
  if (text.length > maks) throw Object.assign(new Error('for stor'), { status: 413 });
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('ugyldig JSON'), { status: 400 });
  }
}

// Felles feilhåndtering: konfigurasjonsfeil logges, men detaljer sendes ikke til nettleseren.
function vakt(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err && err.status) return feil(err.status, err.message);
      if (err && err.code === 429) return feil(429, 'Databasen er opptatt, prøv igjen');
      ctx.error(err);
      return feil(500, 'Noe gikk galt på serveren');
    }
  };
}

module.exports = { json, feil, lesJson, vakt };
