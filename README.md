# Taktlinja

Et lean-spill for undervisning i takt, linjebalansering og sløsing. Små hus bygges enten på en produksjonslinje eller i grupper, og kunden henter dem i takt med bestillingene.

## Moduser

- **Simulering**: datamaskinen bygger husene. Flytt oppgaver i Yamazumi-diagrammet, fjern sløsing, endre partistørrelse, skyv/trekk og variasjon, og sammenlign rundene i rundeloggen.
- **Tavle**: læreren logger inn med lærerkoden, får en lagkode på fire sifre, fordeler oppgaver og starter live-runder. Stasjoner eller elever som mangler, simuleres av tavla.
- **Stasjon**: eleven skriver inn lagkoden og et kallenavn og bygger selv på sin egen enhet. Lenken `#stasjon` åpner denne visningen direkte.

Arbeidsformer: **Linje** (stasjon for stasjon, parti 1–6, skyv eller kanban) og **Gruppe** (2–6 elever bygger det samme huset, flere grupper deler kundens takt).

## Kundeservice

`kundeservice.html` er en egen side der eleven svarer kunder i chatten til Taktlinja Hus AS. Sju skriptede kunder har hver sin sak og sitt temperament: snill og grei, urimelig, misforstår det meste, sint med god grunn, pratsom, har det travelt, og en som vil ha opplysninger om andre. Eleven velger blant svaralternativer, med firmaets retningslinjer ved siden av. Hvert svar endrer kundens humør og gir poeng for profesjonalitet. Noen svar bryter retningslinjene.

Etter samtalen får eleven en vurdering (utfall, tilfredshet, profesjonalitet, antall svar og brudd) og en gjennomgang av hvert svar, med bedre alternativ der det fantes. Resultatene lagres bare på enheten. `kundeservice.html#rolf` (eller `#hanne`, `#bjorg`, `#sara`, `#kaare`, `#mina`, `#tom`) åpner en kunde direkte.

### AI-kunder (fritekst)

På Azure kan eleven velge **Skriv selv (AI-kunde)**. Da skriver eleven svarene fritt, og Claude (modellen Claude Haiku 5.5) spiller kunden ut fra en rollebeskrivelse. Etter samtalen vurderer Claude hvert svar og gir et bedre forslag der det trengs. Samme visning brukes for vurderingen som i knappemodus.

- Eleven trenger en **klassekode** fra læreren. En lærer som er logget inn på Taktlinja, trenger ingen kode.
- Kallene går via `POST /api/kunde`. API-nøkkelen blir på serveren, og eleven kan bare velge blant de sju kundene, ikke sende egne instruksjoner.
- En samtale kan ha høyst 12 svar fra eleven, og hver melding høyst 500 tegn.
- Rollene ligger i `api/src/lib/kunder.js`. Åpningsreplikkene, ordreinformasjonen og retningslinjene i `kundeservice.html` må stemme med dem.
- Svarer ikke API-et, får eleven en feilmelding med «Prøv igjen». Knappemodusen virker alltid, også uten nett til AI-tjenesten.
- På claude.ai vises ikke AI-valget.

Kostnad: en samtale med vurdering bruker rundt 30 000 tokens inn og 3 000 ut, altså noen øre per samtale. Sett likevel en utgiftsgrense i Claude Console.

Kundene ligger som dialogtrær i `KUNDER` i siden. En ny kunde er et nytt objekt med noder (`k` = kundens meldinger, `valg` = svar med humørendring `h`, profesjonalitet `p` 0–2, neste node `til`, forklaring `hvorfor` og eventuelt `brudd`).

## Struktur

| Sti | Innhold |
|---|---|
| `index.html` | Hele appen. Skrevet som sideinnhold, slik at den også kan publiseres som Artifact på claude.ai. |
| `kundeservice.html` | Kundeservice-simulatoren. Samme format som `index.html`. |
| `scripts/bygg.mjs` | Lager `dist/index.html` og `dist/kundeservice.html` med fullt dokumentskall for Azure (`npm run build`). |
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
   | `ANTHROPIC_API_KEY` | API-nøkkel fra [Claude Console](https://console.anthropic.com) (valgfri, trengs for AI-kundene) |
   | `KUNDESERVICE_KODER` | Klassekoder til AI-kundene, for eksempel `rød-kunde-42;blå-kunde-17` (minst 4 tegn per kode, flere skilles med `;`) |

3. **Claude Console** (bare for AI-kundene): lag en konto på console.anthropic.com, kjøp kreditt, sett en månedlig utgiftsgrense under **Limits**, og lag en API-nøkkel under **API keys**.
4. Push til `main`. GitHub Actions bygger `dist/` og publiserer både nettsiden og `api/`.

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
