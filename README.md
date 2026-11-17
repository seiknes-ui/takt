# Taktlinja

Et lean-spill for undervisning i takt, linjebalansering og sløsing. Små hus bygges enten på en produksjonslinje eller i grupper, og kunden henter dem i takt med bestillingene.

## Moduser

- **Simulering**: datamaskinen bygger husene. Flytt oppgaver i Yamazumi-diagrammet, fjern sløsing, endre partistørrelse, skyv/trekk og variasjon, og sammenlign rundene i rundeloggen.
- **Tavle**: læreren logger inn med lærerkoden, får en lagkode på fire sifre, fordeler oppgaver og starter live-runder. Stasjoner eller elever som mangler, simuleres av tavla.
- **Stasjon**: eleven skriver inn lagkoden og et kallenavn og bygger selv på sin egen enhet. Lenken `#stasjon` åpner denne visningen direkte.

Arbeidsformer: **Linje** (stasjon for stasjon, parti 1–6, skyv eller kanban) og **Gruppe** (2–6 elever bygger det samme huset, flere grupper deler kundens takt). Hver gruppe har sitt eget antall elever og sin egen fordeling av oppgavene. Velg gruppe over linjebalansen for å endre den, eller bruk én gruppes fordeling for alle.

## Kundeservice

`kundeservice.html` er en egen side der eleven svarer kunder i chatten til Taktlinja Hus AS. Sju skriptede kunder har hver sin sak og sitt temperament: snill og grei, urimelig, misforstår det meste, sint med god grunn, pratsom, har det travelt, og en som vil ha opplysninger om andre. Eleven velger blant svaralternativer, med firmaets retningslinjer ved siden av. Hvert svar endrer kundens humør og gir poeng for profesjonalitet. Noen svar bryter retningslinjene.

Etter samtalen får eleven en vurdering (utfall, tilfredshet, profesjonalitet, antall svar og brudd) og en gjennomgang av hvert svar, med bedre alternativ der det fantes. Resultatene lagres bare på enheten. `kundeservice.html#rolf` (eller `#hanne`, `#bjorg`, `#sara`, `#kaare`, `#mina`, `#tom`) åpner en kunde direkte.

### AI-kunder (fritekst)

På Azure kan eleven velge **Skriv selv (AI-kunde)**. Da skriver eleven svarene fritt, og Claude (modellen Claude Haiku 5.5) spiller kunden ut fra en rollebeskrivelse. Etter samtalen vurderer Claude hvert svar og gir et bedre forslag der det trengs. Samme visning brukes for vurderingen som i knappemodus.

- Eleven trenger en **klassekode** fra læreren (se Rapporter til læreren under). En lærer som er logget inn på Taktlinja, trenger ingen kode.
- Kallene går via `POST /api/kunde`. API-nøkkelen blir på serveren, og eleven kan bare velge blant de sju kundene, ikke sende egne instruksjoner.
- En samtale kan ha høyst 12 svar fra eleven, og hver melding høyst 500 tegn.
- Rollene ligger i `api/src/lib/kunder.js`. Åpningsreplikkene, ordreinformasjonen og retningslinjene i `kundeservice.html` må stemme med dem.
- Svarer ikke API-et, får eleven en feilmelding med «Prøv igjen». Knappemodusen virker alltid, også uten nett til AI-tjenesten.
- På claude.ai vises ikke AI-valget.

Kostnad: en samtale med vurdering bruker rundt 30 000 tokens inn og 3 000 ut, altså noen øre per samtale. Sett likevel en utgiftsgrense i Claude Console.

### Rapporter til læreren

På Azure kan læreren følge elevenes samtaler på `kundeservice.html#laerer` (lenken «Kundeservice-rapporter» på forsiden). Innloggingen er den samme som på Taktlinja.

- Læreren lager en **klassekode** per klasse, for eksempel `fjord-4821`. Koden gir også tilgang til AI-kundene.
- Eleven skriver inn klassekoden og navnet sitt. Etter hver samtale sendes resultatet og gjennomgangen av hvert svar til læreren, både med svaralternativer og med AI-kunder. Vurderingssiden viser om rapporten er sendt.
- Læreren ser en tabell per elev (antall samtaler, kunder prøvd, løst, tilfredshet, profesjonalitet og brudd) og kan åpne hver samtale. Tabellen kan lastes ned som CSV.
- Rapportene ligger i containeren `rapporter` i Cosmos DB og slettes automatisk etter et halvt år. Læreren kan slette én rapport, alle for en klasse eller alt. Å slette en klassekode stopper nye rapporter, men beholder de som er levert.
- Rapportene inneholder elevens navn og svarene i chatten. Be elevene bruke fornavn og ikke skrive ekte personopplysninger i samtalene.

Kundene ligger som dialogtrær i `KUNDER` i siden. En ny kunde er et nytt objekt med noder (`k` = kundens meldinger, `valg` = svar med humørendring `h`, profesjonalitet `p` 0–2, neste node `til`, forklaring `hvorfor` og eventuelt `brudd`).

## Struktur

| Sti | Innhold |
|---|---|
| `index.html` | Hele appen. Skrevet som sideinnhold, slik at den også kan publiseres som Artifact på claude.ai. |
| `kundeservice.html` | Kundeservice-simulatoren. Samme format som `index.html`. |
| `kurs.html` | Kursstien for truckførerkurset. Samme format som `index.html`. |
| `scripts/bygg.mjs` | Lager sidene i `dist/` med fullt dokumentskall for Azure (`npm run build`). |
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

## Kursstien

`kurs.html` er truckførerkurset som en sti med én stasjon per leksjon i Arbeidstilsynets opplæringsplaner (modul 1, august 2023, og modul 2.2, juni 2022). Leksjonene er nummerert som i skolens kvalitetshåndbok, og eksamen tas i Dugga. Læreren viser på tavla, og elevene svarer på telefonen.

- **Tavla**: læreren logger inn med samme kode som på Taktlinja, velger en leksjon og får en kode på fire sifre og en QR-kode. Piltastene blar, V viser svaret, N viser lærernotatet og F gir fullskjerm.
- **Lærernotater**: hvert steg har notater med hva læreren gjør, fagstoff å bygge på, spørsmål til klassen, vanlige misforståelser, fasit og kilder (`NOTATER` i siden). De vises i et panel på tavla (N), eller på lærerens egen telefon: logg inn, skriv koden fra tavla og velg «Notater til tavla». Telefonen følger tavla og kan bla og vise svar. Den er også `leder` i rommet og krever lærertoken, så elever kan ikke styre tavla.
- **Eleven**: går til `kurs.html#elev`, skriver inn koden og fornavnet og følger tavla. Oppgavene låses når læreren viser svaret. «Øv på egen hånd» går gjennom leksjonen uten lærer og viser fasit etter hvert svar.
- **Steg**: `tavle` (figur og stikkord), `valg` (flervalg, eller avstemning uten fasit), `tall` (utregning med toleranse), `trykk` (eleven trykker i en figur), `quiz` (flere spørsmål, eventuelt med et emballasjesymbol) og `rekkefolge` (eleven setter steg i riktig rekkefølge, stokket ulikt for hver elev). Tavla viser antall svar og, når svaret vises, fordelingen.
- **Film**: filmstegene spiller Noorsi-filmene fra lærerens PC. Læreren trykker «Velg filmmappen på PC-en» og velger mappen med filmene; nettleseren spiller dem lokalt, og ingenting lastes opp. Filmene skal ikke legges i repoet.
- **Live**: bruker `POST /api/rom/{kode}` som Taktlinja. Tavla er `leder`. Hver elev sender fornavn og svar, og tavla regner ut resultatene. Ingenting lagres etter timen, og rommet slettes av TTL-en.
- **Innhold**: leksjonene ligger som data i siden (`STI` og leksjonsobjektene `STAB` og `GODS`). Hver leksjon oppgir hvilke emner fra planen den dekker. Bare leksjoner med `steg` kan startes, de andre vises som «Kommer».

Ferdige leksjoner i modul 2.2:

- Leksjon 1, Innledning og krav til truckfører (45 min): krav til fører og alder, ansvar etter arbeidsmiljøloven, truckens deler og standarder.
- Leksjon 2, Trucktyper og tilleggsutstyr (2 × 45 min): motvekts- og støttebensprinsippet, klassene T1–T5, bruksområder, tilleggsutstyr og en runde ved skolens trucker.
- Leksjon 3, Truckulykker (45 min): årsaker, et ulykkescase, konsekvenser, forsikring, forebygging og rapportering.
- Leksjon 4, Truckens konstruksjon og virkemåte (2 × 45 min): hoveddeler, motor og kraftoverføring, batteri, hydraulikk, løftesystem, styring, bremser og instrumenter.
- Leksjon 5, Kontroll og rapportering (2 × 45 min): daglig kontroll med praktisk øvelse, feil og rapportering, periodisk og sakkyndig kontroll (forskrift om utførelse av arbeid kap. 12–13).
- Leksjon 8, Bruks- og sikkerhetsbestemmelser (45 min): offentlig vei, kjøring, personløft, parkering, brann og Ex, drivstoff, gass og lading.

Modul 1.1 (felles teori for kran, truck og masseforflytningsmaskiner): leksjon 1–4 og 6 på 45 min og leksjon 5 på 2 × 45 min. Farlig gods er en grunnleggende innføring; ADR i dybden tas i eget kurs.

Modul 2.2, i tillegg, på 2 × 45 min:

- Leksjon 6, Truckens stabilitet. Bruker truckstabilitet-simulatoren på seiknes-ui.github.io i en iframe.
- Leksjon 7, Godshåndtering: lastbærere, emballasjesymboler, stabling og nedtaking, ruller og langgods, lasting av bil og jernbanevogn, signalgiving og sleping.

## Kvalitetsdelen

`kvalitet.html` er en felles kvalitetsoversikt for simuleringsverktøyene på seiknes-ui.github.io. Den bruker samme database og lærerinnlogging som Taktlinja.

- **Innsamling**: verktøyene laster `https://seiknes-ui.github.io/simmulator/kvalitet/kvalitet.js` og kaller `Kvalitet.logg(verktøy, hendelse, { k, t, a, m })`. Hendelsene sendes samlet med `sendBeacon` som `text/plain` til `POST /api/kvalitet`, så det trengs ingen CORS-oppsett. Feiler sendingen, virker verktøyet som før.
- **Personvern**: det lagres ingen navn, ingen IP-adresse og bare dato, ikke klokkeslett. Bare kjente verktøy (`VERKTOY` i `api/src/functions/kvalitet.js`) og felt godtas, tekst kuttes, og hver IP kan sende høyst 400 hendelser per 10 minutter. Dataene slettes automatisk etter 400 dager.
- **Lagring**: containeren `kvalitet` (partisjonsnøkkel `/v`) i databasen `takt`, innenfor den delte gratisgjennomstrømningen.
- **Oversikt**: `GET /api/kvalitet/oversikt?dager=30` krever lærertoken og gir tellinger gruppert per verktøy, hendelse, nøkkel og svar. Siden viser vanskeligste spørsmål med vanligste feilsvar, prøveresultater, maskinskilt-oppgaver, velting og bruk av simulatorene, og kan laste ned CSV.
- **Nytt verktøy**: legg navnet i `VERKTOY`, last `kvalitet.js` i verktøyet og kall `Kvalitet.logg`. Hendelsene vises under «Andre verktøy» til det får egen visning.

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
   | `KUNDESERVICE_KODER` | Valgfri. Faste klassekoder til AI-kundene i tillegg til dem læreren lager i appen (disse gir ikke rapporter), for eksempel `rød-kunde-42;blå-kunde-17` (minst 4 tegn per kode, flere skilles med `;`) |

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
