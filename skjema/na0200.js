// Fyller ut Statens vegvesens blankett NA-0200: side 1 «Søknad om prøve for ADR-kompetansebevis» (kandidaten)
// og side 2 «Attest for gjennomført ADR-opplæring» (kursarrangøren). Malen er den skannede blanketten (na0200.pdf).
// Koordinatene er i punkter fra øvre venstre hjørne av A4-siden. Krever pdf-lib (global PDFLib).
(function (root) {
  const H = 842.4;
  // Side 1: midten av avkrysningsboksene. Venstre kolonne er førstegangsopplæring, høyre er oppfriskning.
  const S1 = {
    tidligere: { ja: [232.5, 319], nei: [425, 319] },
    x: { forste: 232.5, oppfrisk: 425 },
    y: { hoved: 390, grunnkurs: 433, klasse1: 450, klasse7: 466.5, tank: 483, separat: 526, kombinert: 543 },
  };
  // Side 2: Ja og Nei for hver rad, venstre (førstegang) og høyre (oppfriskning) kolonne.
  const S2 = {
    x: { forste: { ja: 227, nei: 268 }, oppfrisk: { ja: 493, nei: 534.5 } },
    y: { hoved: 431.5, grunnkurs: 475.5, klasse1: 503.5, klasse7: 531, tank: 559, praktisk: 601.5, separat: 644, kombinert: 672.5 },
  };
  const KURS = ['grunnkurs', 'klasse1', 'klasse7', 'tank'];
  const norsk = iso => (iso ? iso.split('-').reverse().join('.') : '');
  const periode = k => (k.til && k.til !== k.fra ? `${norsk(k.fra)}–${norsk(k.til)}` : norsk(k.fra));

  // valg.forside: legg en forside med kursopplysningene og deltakerlisten først (samlet PDF til arkiv).
  async function lagPdf(malBytes, kurs, deltakere, valg = {}) {
    const { PDFDocument, StandardFonts, rgb } = root.PDFLib;
    const mal = await PDFDocument.load(malBytes);
    const ut = await PDFDocument.create();
    const font = await ut.embedFont(StandardFonts.Helvetica);
    const blekk = rgb(0.05, 0.1, 0.45);
    const side = kurs.opplaering === 'oppfrisk' ? 'oppfrisk' : 'forste';
    const annen = side === 'forste' ? 'oppfrisk' : 'forste';
    ut.setTitle('NA-0200 ' + (kurs.navn || 'ADR-kurs'));

    if (valg.forside) forside(ut, font, await ut.embedFont(StandardFonts.HelveticaBold), kurs, deltakere, rgb);
    for (const d of deltakere) {
      const [p1, p2] = await ut.copyPages(mal, [0, 1]);
      ut.addPage(p1); ut.addPage(p2);
      const t = (p, s, x, y, str = 11, maks = 0) => {
        s = String(s || ''); let w = str;
        if (maks) while (w > 6 && font.widthOfTextAtSize(s, w) > maks) w -= 0.5;
        p.drawText(s, { x, y: H - y, size: w, font, color: blekk });
      };
      const x = (p, cx, cy) => {
        const r = 3.6, o = { thickness: 1.4, color: blekk };
        p.drawLine({ start: { x: cx - r, y: H - cy - r }, end: { x: cx + r, y: H - cy + r }, ...o });
        p.drawLine({ start: { x: cx - r, y: H - cy + r }, end: { x: cx + r, y: H - cy - r }, ...o });
      };

      // ---- Side 1: søknad om prøve ----
      t(p1, d.etternavn, 62, 196, 11, 165);
      t(p1, d.fornavn, 238, 196, 11, 160);
      t(p1, d.fnr, 412, 196, 11, 150);
      t(p1, [d.adresse, [d.postnr, d.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', '), 62, 230, 11, 335);
      t(p1, d.telefon, 412, 230, 11, 150);
      if (d.tidligere) {
        x(p1, ...S1.tidligere.ja);
        t(p1, d.bevisnr, 312, 324, 10, 95);
        t(p1, norsk(d.gyldigTil), 316, 339, 10, 90);
      } else x(p1, ...S1.tidligere.nei);
      const sx = S1.x[side];
      x(p1, sx, S1.y.hoved);
      for (const k of KURS) if (kurs.kurs[k]) x(p1, sx, S1.y[k]);
      x(p1, sx, S1.y[kurs.prove === 'kombinert' ? 'kombinert' : 'separat']);
      t(p1, kurs.utgave || '2025', 360, 591, 11);
      t(p1, kurs.sted, 62, 709, 10, 180);
      t(p1, norsk(kurs.til || kurs.fra), 285, 709, 10);

      // ---- Side 2: attest for gjennomført opplæring ----
      t(p2, d.etternavn, 62, 225, 11, 165);
      t(p2, d.fornavn, 238, 225, 11, 160);
      t(p2, d.fodselsdato, 412, 225, 11);
      t(p2, periode(kurs), 62, 258, 11, 250);
      t(p2, kurs.sted, 335, 258, 11, 225);
      const ja = (rad, ok) => x(p2, S2.x[side][ok ? 'ja' : 'nei'], S2.y[rad]);
      ja('hoved', true);
      x(p2, S2.x[annen].nei, S2.y.hoved);
      for (const k of KURS) ja(k, !!kurs.kurs[k]);
      ja('praktisk', kurs.praktisk !== false);
      ja('separat', kurs.prove !== 'kombinert');
      ja('kombinert', kurs.prove === 'kombinert');
      t(p2, kurs.sted, 340, 782, 9, 75);
      t(p2, norsk(kurs.til || kurs.fra), 470, 782, 9);
    }
    return ut.save();
  }

  const KURSNAVN = { grunnkurs: 'Grunnkurs', klasse1: 'Spesialiseringskurs klasse 1', klasse7: 'Spesialiseringskurs klasse 7', tank: 'Spesialiseringskurs tank' };
  // Forside til arkivet: kurset og en tabell over deltakerne, flere sider ved behov.
  function forside(ut, font, fet, kurs, deltakere, rgb) {
    const svart = rgb(0, 0, 0), grå = rgb(0.4, 0.4, 0.4);
    const KOL = [['#', 40], ['Etternavn', 62], ['Fornavn', 170], ['Fødselsnr.', 268], ['Adresse', 345], ['Telefon', 488]];
    const kort = (s, w, str) => { s = String(s || ''); while (s && font.widthOfTextAtSize(s, str) > w) s = s.slice(0, -1); return s; };
    let p, y;
    const nySide = forst => {
      p = ut.addPage([595.28, 841.89]); y = 790;
      if (forst) {
        p.drawText('Påmeldte til ADR-kurs', { x: 40, y, size: 20, font: fet, color: svart }); y -= 26;
        const linjer = [
          kurs.navn || 'ADR-kurs',
          `${periode(kurs)} · ${kurs.sted || ''}`,
          `${kurs.opplaering === 'oppfrisk' ? 'Oppfriskning' : 'Førstegangsopplæring'}: ${Object.keys(KURSNAVN).filter(k => kurs.kurs && kurs.kurs[k]).map(k => KURSNAVN[k]).join(', ')}`,
          `${kurs.prove === 'kombinert' ? 'Kombinert' : 'Separat'} prøve · ADR-utgave ${kurs.utgave || '2025'} · ${deltakere.length} deltakere`,
          `Laget ${new Date().toLocaleDateString('nb-NO')}. Etter forsiden følger blankett NA-0200 (søknad og attest) for hver deltaker.`,
        ];
        for (const l of linjer) { p.drawText(kort(l, 515, 11), { x: 40, y, size: 11, font, color: svart }); y -= 16; }
        y -= 10;
      }
      for (const [t, x] of KOL) p.drawText(t, { x, y, size: 9, font: fet, color: grå });
      y -= 4; p.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: grå }); y -= 14;
    };
    nySide(true);
    deltakere.forEach((d, i) => {
      if (y < 50) nySide(false);
      const v = [String(i + 1), d.etternavn, d.fornavn, d.fnr, [d.adresse, [d.postnr, d.poststed].filter(Boolean).join(' ')].filter(Boolean).join(', '), d.telefon];
      KOL.forEach(([, x], j) => p.drawText(kort(v[j], (KOL[j + 1] ? KOL[j + 1][1] : 560) - x - 6, 9), { x, y, size: 9, font, color: svart }));
      y -= 16;
    });
  }

  root.NA0200 = { lagPdf, norsk, periode };
})(typeof window !== 'undefined' ? window : globalThis);
