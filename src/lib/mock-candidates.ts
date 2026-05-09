/**
 * Mock-data voor /dev route — geen Supabase, geen login.
 * Variatie aan types zodat alle kaart-renderers (tekst + media) zichtbaar zijn.
 */

import type { Candidate } from "./types";

const ZERO_TS = "2026-04-12T10:00:00Z";

function mock(c: Partial<Candidate>): Candidate {
  return {
    id: c.id ?? "mock-" + Math.random().toString(36).slice(2, 8),
    externalId: c.externalId ?? "mock-ext",
    source: "mock",
    type: c.type ?? "Nieuwe FAQ",
    suggestion: c.suggestion ?? "—",
    proposedAnswer: c.proposedAnswer ?? null,
    klantNaam: c.klantNaam ?? null,
    klantQuote: c.klantQuote ?? null,
    meetingDatum: c.meetingDatum ?? "2026-04-12",
    reasonLong: c.reasonLong ?? null,
    bron: c.bron ?? null,
    facts: c.facts ?? [],
    requiresDouble: false,
    status: "open",
    createdAt: ZERO_TS,
    batchId: "mock-batch",
    originCandidateId: null,
    payload: c.payload ?? {},
    media: c.media ?? []
  };
}

export const MOCK_CANDIDATES: Candidate[] = [
  mock({
    id: "m1",
    externalId: "mock-1",
    type: "Nieuwe FAQ",
    suggestion: "Hoe weten we dat antwoorden kloppen?",
    proposedAnswer:
      "Bij elk antwoord staat een klikbare bron met document, pagina en alinea. Tegenstrijdige bronnen tonen we expliciet — gebruiker kiest welke geldt.",
    klantNaam: "BAM Infra B.V.",
    klantQuote:
      "Wij werken met aansprakelijkheidscontracten — bronvermelding is geen detail.",
    bron: "transcript poc/demo",
    facts: [
      { label: "Door", value: "Robin Janssen (IT-lead)" },
      { label: "Type", value: "Compliance" }
    ]
  }),
  mock({
    id: "m2",
    externalId: "mock-2",
    type: "Antwoord-update",
    suggestion: "Mag ik historische input terughalen?",
    proposedAnswer:
      "Ja. Elke aanpassing is versie-gecontroleerd. Open 'Geschiedenis' op een FAQ-rij om eerdere antwoorden te zien — inclusief wie het heeft aangepast en wanneer.",
    klantNaam: "Strukton Civiel",
    bron: "transcript poc/demo",
    facts: [{ label: "Door", value: "Sander de Vries" }]
  }),
  mock({
    id: "m3",
    externalId: "mock-3",
    type: "Doctrine",
    suggestion: "Geen klantnamen in publieke demos.",
    reasonLong:
      "Privacy-default. Eerst toestemming, anders generieke voorbeelden. Tijdens een sales-demo aan een prospect noemden we per ongeluk twee bestaande klanten — opdrachtgever was not amused. Gebeurt niet meer.",
    bron: "doctrine/privacy",
    facts: [{ label: "Categorie", value: "Privacy" }]
  }),
  mock({
    id: "m4",
    externalId: "mock-4",
    type: "Risico",
    suggestion: "Onderaannemer 2× te laat — risico voor planning Q3.",
    klantNaam: "Heijmans Infra",
    klantQuote:
      "Als VoltPro nog één keer niet komt opdagen op de afgesproken dag stappen we eruit.",
    reasonLong:
      "VoltPro heeft in mei en juni telkens een dag te laat geleverd op De Horizon. Geen excuus, geen vooraankondiging. Naast de schade aan onze planning gaat dit klantvertrouwen kosten.",
    bron: "transcript poc/heijmans-juni",
    facts: [
      { label: "Onderaannemer", value: "VoltPro" },
      { label: "Project", value: "Renovatie De Horizon" }
    ]
  }),
  mock({
    id: "m5",
    externalId: "mock-5",
    type: "Brand-asset",
    suggestion: "Nieuw logo-voorstel — meer gewicht in de glyph",
    klantNaam: null,
    payload: { asset_type: "logo" },
    media: [
      {
        kind: "image",
        url: "https://placehold.co/600x600/13102D/F2F5F2?text=Vondr+v3",
        label: "voorstel",
        alt: "Vondr-logo voorstel v3"
      },
      {
        kind: "image",
        url: "https://placehold.co/600x600/F2F5F2/13102D?text=Vondr+huidig",
        label: "huidig",
        alt: "Huidig logo"
      }
    ]
  }),
  mock({
    id: "m6",
    externalId: "mock-6",
    type: "Copy-keuze",
    suggestion: "Hero-tekst homepage — welke landing zegt het beter?",
    proposedAnswer:
      'Optie A: "Jij beslist, AI voert uit."\n\nOptie B: "Het collectieve geheugen van jouw bedrijf — gemaakt door mensen, niet door modellen."',
    payload: {
      optie_a: "Jij beslist, AI voert uit.",
      optie_b:
        "Het collectieve geheugen van jouw bedrijf — gemaakt door mensen, niet door modellen."
    },
    facts: [{ label: "Pagina", value: "homepage hero" }]
  })
];
