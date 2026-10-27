// Tilkobling til Cosmos DB for NoSQL. Database og containere opprettes ved første kall.
const { CosmosClient } = require('@azure/cosmos');

let ready = null;

async function init() {
  const conn = process.env.COSMOS_CONNECTION_STRING;
  if (!conn) throw new Error('COSMOS_CONNECTION_STRING mangler i innstillingene');
  const client = new CosmosClient(conn);
  // Delt gjennomstrømning på databasen holder hele appen innenfor gratisnivået (1000 RU/s).
  const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOS_DATABASE || 'takt', throughput: 1000 });
  const opprett = (id, key, extra = {}) => database.containers.createIfNotExists({ id, partitionKey: { paths: [key] }, ...extra }).then(r => r.container);
  const [oppsett, runder, rom] = await Promise.all([
    opprett('oppsett', '/laererId'),
    opprett('runder', '/laererId'),
    // Live-status er kortlivet: dokumentene slettes automatisk etter ett minutt uten oppdatering.
    opprett('rom', '/kode', {
      defaultTtl: 60,
      indexingPolicy: { indexingMode: 'consistent', includedPaths: [{ path: '/*' }], excludedPaths: [{ path: '/presence/*' }, { path: '/"_etag"/?' }] },
    }),
  ]);
  return { oppsett, runder, rom };
}

function containers() {
  if (!ready) ready = init().catch(err => { ready = null; throw err; });
  return ready;
}

module.exports = { containers };
