// Lenkene på lærersiden (laerer.html). De ligger her, bak lærerinnloggingen,
// i stedet for i siden, så de ikke står i kildekoden til en åpen side.
// Lenker til Taktlinja-appen er relative. Andre apper har full adresse.
// login: hvilken kode verktøyet selv krever. Kodene står aldri her.

const TRUCK = 'https://purple-stone-0b7157e1e.7.azurestaticapps.net/';
const SPEDITOREN = 'https://agreeable-stone-0e1eff91e.2.azurestaticapps.net/';
const SIMULATOR = 'https://seiknes-ui.github.io/simmulator/';

const TRUCK_PIN = 'PIN Daglig kontroll';
const TAKT_KODE = 'Lærerkode Taktlinja';
const INGEN = 'Ingen innlogging';

const SEKSJONER = [
  {
    tittel: 'Truck: daglig kontroll og oppkjøring',
    kort: [
      {
        merke: 'PP', tittel: 'Praktisk prøve', for: 'Oppkjøring, skjema V6.14/01',
        tekst: 'Kryss av feil og kompetansepunkter mens eleven kjører opp. Begge signerer på skjermen. Skjemaet og en oversikt over godkjente oppkjøringer kan lastes ned som PDF.',
        login: TRUCK_PIN, merk: ['Nettbrett'],
        lenker: [{ tekst: 'Alle prøver', url: TRUCK + 'admin/eksamen' }, { tekst: 'Ny prøve', url: TRUCK + 'admin/eksamen/ny', hoved: true }],
      },
      {
        merke: 'DK', tittel: 'Daglige kontroller', for: 'Kontroller og avvik per truck',
        tekst: 'Se kontrollene elevene har gjort, med avvik, kommentarer og bilder. Filtrer på truck og dato.',
        login: TRUCK_PIN,
        lenker: [{ tekst: 'Åpne', url: TRUCK + 'admin', hoved: true }],
      },
      {
        merke: 'RP', tittel: 'Kontrollrapport', for: 'PDF til HMS-systemet',
        tekst: 'Oppsummering av alle daglige kontroller i en periode, med dieselfyllinger hvis du vil.',
        login: TRUCK_PIN,
        lenker: [{ tekst: 'Dieselfyllinger', url: TRUCK + 'admin/diesel' }, { tekst: 'Åpne', url: TRUCK + 'admin/rapport', hoved: true }],
      },
      {
        merke: 'QR', tittel: 'Trucker og kontrollpunkter', for: 'Oppsett og QR-koder',
        tekst: 'Legg til trucker, rediger kontrollpunktene per truckkategori og skriv ut QR-kodene som henger på truckene.',
        login: TRUCK_PIN,
        lenker: [{ tekst: 'Åpne', url: TRUCK + 'admin/qr', hoved: true }],
      },
      {
        merke: 'TS', tittel: 'Truckstatus', for: 'Visning for Teams eller skjerm',
        tekst: 'Hvilke trucker som er kontrollert i dag, og hvilke som har avvik.',
        login: INGEN,
        lenker: [{ tekst: 'Åpne', url: TRUCK + 'status', hoved: true }],
      },
    ],
  },
  {
    tittel: 'Logistikk-trening',
    kort: [
      {
        merke: 'LS', tittel: 'Lærerstasjon', for: 'PC-en med etikettskriveren',
        tekst: 'Lag ordre til plukkerne, følg ordrene live, skriv ut etiketter og se de siste leveransene.',
        login: TRUCK_PIN, merk: ['PC'],
        lenker: [{ tekst: 'Åpne', url: TRUCK + 'logistikk/stasjon', hoved: true }],
      },
      {
        merke: 'LG', tittel: 'Lageroppsett', for: 'Varer, paller og reolplasser',
        tekst: 'Vedlikehold varekatalogen, lim inn lageret fra et regneark og nullstill beholdningen mellom timene.',
        login: TRUCK_PIN,
        lenker: [{ tekst: 'Åpne', url: TRUCK + 'logistikk/lager', hoved: true }],
      },
    ],
  },
  {
    tittel: 'Klassespill og tavle',
    kort: [
      {
        merke: 'KS', tittel: 'Kursstien', for: 'Truckførerkurset på tavla',
        tekst: 'Velg leksjon og vis den på tavla. Elevene svarer på telefonen. Lærernotater med fasit og prøvespørsmål vises på tavla eller på din egen telefon.',
        login: TAKT_KODE,
        lenker: [{ tekst: 'Åpne', url: 'kurs.html', hoved: true }],
      },
      {
        merke: 'TL', tittel: 'Taktlinja', for: 'Tavla for live-runder',
        tekst: 'Lag en lagkode, fordel stasjonene og start runder. Stasjoner som mangler, simuleres av tavla.',
        login: TAKT_KODE,
        lenker: [{ tekst: 'Manual', url: SIMULATOR + 'manualer/taktlinja.pdf' }, { tekst: 'Åpne', url: './#tavle', hoved: true }],
      },
      {
        merke: 'SP', tittel: 'Speditøren', for: 'Lærerpanel',
        tekst: 'Opprett spill, skriv ut kodelapper til elevene og styr fasene. Se hva alle har budt, og sett elever som er borte på automatisk drift.',
        login: 'Lærerkode Speditøren',
        lenker: [{ tekst: 'Spilleguide', url: SIMULATOR + 'manualer/speditoren.pdf' }, { tekst: 'Åpne', url: SPEDITOREN + 'laerer', hoved: true }],
      },
    ],
  },
  {
    tittel: 'Rapporter og oppfølging',
    kort: [
      {
        merke: 'KR', tittel: 'Kundeservice-rapporter', for: 'Elevenes samtaler',
        tekst: 'Lag klassekoder, se resultatene per elev og åpne hver samtale. Tabellen kan lastes ned som CSV.',
        login: TAKT_KODE,
        lenker: [{ tekst: 'Manual', url: SIMULATOR + 'manualer/kundeservice.pdf' }, { tekst: 'Åpne', url: 'kundeservice.html#laerer', hoved: true }],
      },
      {
        merke: 'KV', tittel: 'Kvalitetsoversikt', for: 'Anonyme data fra verktøyene',
        tekst: 'Hvilke spørsmål elevene svarer feil på, og hvordan verktøyene brukes. Data fra blant annet teoriprøve truck, ADR grunnkurs, Truckstabilitet og Fraktvekt-labben.',
        login: TAKT_KODE,
        lenker: [{ tekst: 'Åpne', url: 'kvalitet.html', hoved: true }],
      },
      {
        merke: 'FV', tittel: 'Fraktvekt-labben', for: 'Innstillinger og innleverte rapporter',
        tekst: 'Endre faktorene for volumvekt og lastemeter, og kontroller en rapport eleven har levert. Innstillingene lagres bare i nettleseren du bruker.',
        login: INGEN,
        lenker: [{ tekst: 'Åpne', url: 'https://seiknes-ui.github.io/opplaring/fraktvekt-labben/#regler', hoved: true }],
      },
    ],
  },
  {
    tittel: 'Lærerveiledning i verktøyene',
    kort: [
      {
        merke: 'TP', tittel: 'Teoriprøve truck', for: '«Til læreren» på startsiden',
        tekst: 'Hva prøven dekker, kildene bak spørsmålene og hvilke data som sendes anonymt.',
        login: INGEN,
        lenker: [{ tekst: 'Åpne', url: SIMULATOR + 'teori/index.html', hoved: true }],
      },
      {
        merke: 'ADR', tittel: 'ADR grunnkurs', for: '«Til læreren» på startsiden',
        tekst: 'Hvilke emner stasjonene dekker, hvordan prøven er bygget opp, og ekstra stoff fra NDLA til tavla.',
        login: INGEN,
        lenker: [{ tekst: 'Åpne', url: SIMULATOR + 'adr-kurs/index.html', hoved: true }],
      },
    ],
  },
];

module.exports = { SEKSJONER };
