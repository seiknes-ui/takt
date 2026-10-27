# Taktlinja

Et lean-spill for undervisning i takt, linjebalansering og sløsing. Små hus bygges enten på en produksjonslinje eller i grupper, og kunden henter dem i takt med bestillingene.

## Moduser

- **Simulering**: datamaskinen bygger husene. Flytt oppgaver i Yamazumi-diagrammet, fjern sløsing, endre partistørrelse, skyv/trekk og variasjon, og sammenlign rundene i rundeloggen.
- **Tavle**: læreren åpner en lagkode, fordeler oppgaver og starter live-runder. Stasjoner eller elever som mangler, simuleres av tavla.
- **Stasjon**: eleven bygger selv på sin egen enhet. Delene dras på plass, skruene skrus inn, og eleven leter etter klosser og går til lageret. Lenken `#stasjon` åpner denne visningen direkte.

## Arbeidsformer

- **Linje**: hver stasjon gjør sin del av huset og sender det videre (partistørrelse 1–6, skyv eller kanban).
- **Gruppe**: 2–6 elever bygger det samme huset sammen. Hver elev har sine oppgaver, og rekkefølgen avgjør hvem som må vente på hvem. Flere grupper deler på kundens takt.

## Teknisk

Appen består i dag av én fil, `index.html`, uten byggesteg. Den er laget for å kjøre som Artifact på claude.ai, der live-runder bruker claude.ai sin sanntidsfunksjon (`window.claude.use("room")`). Uten den virker simulering og øving, mens live-runder ikke er tilgjengelige.

Planen er å flytte appen til Azure:

| Del | Azure-tjeneste |
|---|---|
| Nettside | Azure Static Web Apps |
| API | Azure Functions |
| Lagring (rundelogg, oppsett, klasser) | Azure Cosmos DB for NoSQL |
| Live-runder | Azure Web PubSub |
