# Taktlinja

Et lean-spill for undervisning i takt, linjebalansering og sløsing. Små hus bygges enten på en produksjonslinje eller i grupper, og kunden henter dem i takt med bestillingene.

## Moduser

- **Simulering**: datamaskinen bygger husene. Flytt oppgaver i Yamazumi-diagrammet, fjern sløsing, endre partistørrelse, skyv/trekk og variasjon, og sammenlign rundene i rundeloggen.
- **Tavle**: læreren logger inn med lærerkoden, får en lagkode på fire sifre, fordeler oppgaver og starter live-runder. Stasjoner eller elever som mangler, simuleres av tavla.
- **Stasjon**: eleven skriver inn lagkoden og et kallenavn og bygger selv på sin egen enhet. Lenken `#stasjon` åpner denne visningen direkte.

Arbeidsformer: **Linje** (stasjon for stasjon, parti 1–6, skyv eller kanban) og **Gruppe** (2–6 elever bygger det samme huset, flere grupper deler kundens takt).

## Struktur

| Sti | Innhold |
|---|---|
| `index.html` | Hele appen. Skrevet som sideinnhold, slik at den også kan publiseres som Artifact på claude.ai. |
| `scripts/bygg.mjs` | Lager `dist/index.html` med fullt dokumentskall for Azure (`npm run build`). |
| `api/` | Azure Functions (Node 20): lærerinnlogging, lagring i Cosmos DB og live-rom. |
| `staticwebapp.config.json` | Konfigurasjon for Azure Static Web Apps. |

Appen finner selv ut hvor den kjører. På claude.ai brukes plattformens sanntidsfunksjon. På Azure brukes `/api`.

## Slik virker det på Azure

- **Lærerinnlogging**: koden sjekkes mot innstillingen `LAERER_KODER`. Læreren får et signert token som varer i 12 timer. Selve koden lagres ikke i databasen.
- **Lagring** i Cosmos DB for NoSQL, database `takt` (opprettes automatisk med delt 1000 RU/s, som er gratisnivået):
  - `oppsett` (partisjonsnøkkel `/laererId`): lærerens aktive oppsett.
  - `runder` (`/laererId`): rundeloggen.
  - `rom` (`/kode`, TTL 60 s): live-status under runder.
- **Live-runder**: hver enhet sender sin status til `POST /api/rom/{lagkode}` omtrent hvert sekund og får tilbake statusen til alle i laget. Bare en innlogget lærer kan være tavle, og bare én lærer kan bruke samme lagkode om gangen.

## Oppsett i Azure

1. **Cosmos DB**: åpne kontoen i Azure-portalen, gå til **Keys** og kopier **Primary connection string**.
2. **Static Web App** → **Environment variables** (Production). Legg til:

   | Navn | Verdi |
   |---|---|
   | `COSMOS_CONNECTION_STRING` | Tilkoblingsstrengen fra steg 1 |
   | `COSMOS_DATABASE` | `takt` (valgfri, dette er standard) |
   | `LAERER_KODER` | For eksempel `blåhus-7342=Ola Nordmann;rødtak-1185=Kari` (minst 4 tegn per kode, flere skilles med `;`) |
   | `TOKEN_SECRET` | En lang, tilfeldig streng (minst 16 tegn), for eksempel fra `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

3. Push til `main`. GitHub Actions bygger `dist/` og publiserer både nettsiden og `api/`.

## Lokal utvikling

```sh
npm run build                 # lager dist/index.html
cd api && npm install
cp local.settings.example.json local.settings.json   # fyll inn verdiene
npx @azure/static-web-apps-cli start ../dist --api-location .
```

`local.settings.json` og `.env` er utelatt fra git.

## Kapasitet

En klasse på rundt 20 enheter gir omtrent 15–20 kall per sekund mot API-et under en runde. Det er godt innenfor gratisnivået til Cosmos DB (1000 RU/s) og Static Web Apps. Ønsker dere kortere forsinkelse enn ett sekund senere, kan live-delen flyttes til Azure Web PubSub (krever betalt nivå for en hel klasse).
