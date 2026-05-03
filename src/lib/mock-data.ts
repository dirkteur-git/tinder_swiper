import type { Job } from "./types";

export const CURRENT_USER = {
  id: "user-dirk",
  email: "dirk@vondr.ai",
  name: "Dirk"
};

export const mockJobs: Job[] = [
  {
    id: "job-bim-001",
    source: "nextbim",
    title: "Datakwaliteit — Project Westflank, fase ramen",
    description:
      "Het BIM-model heeft 8 objecten met afwijkende naamgeving, classificatie of plaatsing. Bekijk per object of het voorstel klopt en accepteer of wijs af.",
    approvalMode: "single",
    deadline: "2026-05-08T17:00:00Z",
    assignees: ["dirk@vondr.ai"],
    createdAt: "2026-05-02T09:14:00Z",
    questions: [
      {
        id: "q-001",
        jobId: "job-bim-001",
        externalId: "WND-3F-021",
        position: 1,
        type: "Hernoemen",
        suggestion: "Object hernoemen om naamgevingspatroon te volgen",
        reason:
          "Andere ramen op dezelfde verdieping volgen het patroon WND-{verdieping}-{nummer}. Dit object wijkt af.",
        reasonLong:
          "Op verdieping 3 staan 18 ramen. 17 daarvan volgen het patroon WND-03-XXX (bv. WND-03-018, WND-03-019). Dit object heeft als enige WND-3F-021. Vermoedelijk een typfout bij import vanuit Revit. Hernoemen naar WND-03-021 maakt de naamgeving consistent en voorkomt fouten in de hoeveelheidsstaat.",
        facts: [
          { label: "Object", value: "Raam (IfcWindow #4821)" },
          { label: "Huidige naam", value: "WND-3F-021", variant: "old" },
          { label: "Voorgesteld", value: "WND-03-021", variant: "new" }
        ],
        bron: "Westflank.ifc → IfcWindow #4821",
        deeplink: "https://nextbim.example/object/WND-3F-021"
      },
      {
        id: "q-002",
        jobId: "job-bim-001",
        externalId: "DR-G-007",
        position: 2,
        type: "Classificatie wijzigen",
        suggestion: "Deur classificeren als binnendeur i.p.v. buitendeur",
        reason:
          "De deur grenst aan twee verwarmde ruimtes — niet aan buitenklimaat. Classificatie buitendeur past niet.",
        reasonLong:
          "DR-G-007 verbindt ruimte 1.04 (kantine, verwarmd) met ruimte 1.05 (gang, verwarmd). De huidige classificatie 'buitendeur' triggert een onnodig hogere isolatie-eis in de NEN-check. Op basis van ruimte-classificatie hoort deze deur onder 'binnendeur — niveau 2'.",
        facts: [
          { label: "Object", value: "Deur DR-G-007" },
          { label: "Tussen", value: "1.04 Kantine ↔ 1.05 Gang (beide verwarmd)" },
          { label: "Huidige classificatie", value: "Buitendeur", variant: "old" },
          { label: "Voorgesteld", value: "Binnendeur — niveau 2", variant: "new" }
        ],
        bron: "Westflank.ifc → IfcDoor #1207",
        deeplink: "https://nextbim.example/object/DR-G-007"
      },
      {
        id: "q-003",
        jobId: "job-bim-001",
        externalId: "WL-2-014",
        position: 3,
        type: "Materiaal wijzigen",
        suggestion: "Wandtype aanpassen naar kalkzandsteen",
        reason:
          "Naastliggende wanden zijn allemaal kalkzandsteen 100mm. Materiaal-eigenschappen suggereren dat hier ook kalkzandsteen hoort.",
        reasonLong:
          "Wand WL-2-014 heeft als enige op verdieping 2 een gipsplaat-aanduiding. Dikte (102mm) en akoestische waardes (Rw 49) komen overeen met de omliggende kalkzandsteen-wanden. Vermoedelijk per ongeluk verkeerde laag gekoppeld in Revit. Classificatie aanpassen voorkomt fouten in materiaalstaat.",
        facts: [
          { label: "Object", value: "Wand WL-2-014" },
          { label: "Dikte / Rw", value: "102mm · Rw 49" },
          { label: "Huidig materiaal", value: "Gipsplaat", variant: "old" },
          { label: "Voorgesteld", value: "Kalkzandsteen 100mm", variant: "new" }
        ],
        bron: "Westflank.ifc → IfcWall #3014",
        deeplink: "https://nextbim.example/object/WL-2-014"
      },
      {
        id: "q-004",
        jobId: "job-bim-001",
        externalId: "RAD-1-003",
        position: 4,
        type: "Verplaatsen",
        suggestion: "Radiator naar correcte ruimte verplaatsen",
        reason:
          "Radiator staat nu in IfcSpace 1.06 (gang) maar de coördinaten liggen 0,8m binnen ruimte 1.07.",
        reasonLong:
          "Coördinaten: X=12.4, Y=8.2 — dat is binnen de polygon van ruimte 1.07 (vergaderruimte). Vermoedelijk fout in spatial-relations bij MEP-import. Hercategoriseren naar 1.07 is nodig voor correcte verwarmingsberekening.",
        facts: [
          { label: "Object", value: "Radiator RAD-1-003" },
          { label: "Coördinaten", value: "X=12.4 · Y=8.2" },
          { label: "Huidige ruimte", value: "1.06 — Gang", variant: "old" },
          { label: "Voorgesteld", value: "1.07 — Vergaderruimte", variant: "new" }
        ],
        bron: "Westflank.ifc → IfcSpace 1.06"
      },
      {
        id: "q-005",
        jobId: "job-bim-001",
        externalId: "BM-G-019",
        position: 5,
        type: "Verwijderen — duplicaat",
        suggestion: "Balk verwijderen — duplicaat",
        reason:
          "Twee balken op exact dezelfde positie (delta < 1mm). Eén is door dubbele import ontstaan.",
        reasonLong:
          "BM-G-018 en BM-G-019 hebben identieke coördinaten (afwijking < 1mm), zelfde profiel (HEA 200), zelfde lengte (4.2m). De maker-tag toont dat BM-G-019 toegevoegd is na een tweede IFC-import. Verwijderen voorkomt dubbele hoeveelheid in de constructiestaat.",
        facts: [
          { label: "Te verwijderen", value: "BM-G-019 (HEA 200, 4.2m)", variant: "old" },
          { label: "Duplicaat van", value: "BM-G-018" },
          { label: "Positieverschil", value: "< 1 mm" },
          { label: "Reden", value: "Dubbele IFC-import" }
        ],
        bron: "Westflank.ifc → IfcBeam #5019"
      },
      {
        id: "q-006",
        jobId: "job-bim-001",
        externalId: "FL-2-004",
        position: 6,
        type: "Classificatie wijzigen",
        suggestion: "Vloer classificeren als verdiepingsvloer",
        reason:
          "Boven deze vloer ligt nog verdieping 3. Classificatie dakvloer onmogelijk.",
        reasonLong:
          "FL-2-004 heeft Z-coördinaat 7.0m. Boven deze hoogte zijn 14 elementen op verdieping 3. Dakvloer-classificatie is dus per definitie fout — moet verdiepingsvloer zijn. Heeft impact op constructieve berekening en isolatie-eisen.",
        facts: [
          { label: "Object", value: "Vloer FL-2-004 (Z = 7.0m)" },
          { label: "Boven deze vloer", value: "14 elementen op verdieping 3" },
          { label: "Huidige classificatie", value: "Dakvloer", variant: "old" },
          { label: "Voorgesteld", value: "Verdiepingsvloer", variant: "new" }
        ],
        bron: "Westflank.ifc → IfcSlab #2104"
      },
      {
        id: "q-007",
        jobId: "job-bim-001",
        externalId: "CL-3-AREA",
        position: 7,
        type: "Waarde corrigeren",
        suggestion: "Plafondhoogte corrigeren",
        reason:
          "Plafond-objecten staan op 2.70m, maar IfcZone-property zegt 2.40m. Property is verouderd.",
        reasonLong:
          "Alle 8 plafond-elementen op verdieping 3 staan geometrisch op Z=9.7m (= 2.7m boven vloer-Z=7.0m). De IfcZone-property 'CeilingHeight' toont echter nog de oude waarde 2.40m uit een eerdere ontwerpversie. Inconsistentie zorgt voor verkeerde ruimtelijke check.",
        facts: [
          { label: "Object", value: "Verdieping 3 — IfcZone" },
          { label: "Veld", value: "CeilingHeight" },
          { label: "Huidige waarde", value: "2,40 m", variant: "old" },
          { label: "Voorgesteld", value: "2,70 m", variant: "new" },
          { label: "Bewijs", value: "8 plafond-elementen op Z=9.7m" }
        ],
        bron: "Westflank.ifc → IfcZone V3"
      },
      {
        id: "q-008",
        jobId: "job-bim-001",
        externalId: "DR-G-012",
        position: 8,
        type: "Verwijderen — orphan",
        suggestion: "Orphan-deur verwijderen",
        reason:
          "De host-muur is in revisie 4 verwijderd. De deur is daar niet bij meegenomen — orphan.",
        reasonLong:
          "DR-G-012 was gekoppeld aan WL-G-021. Die wand is in revisie 4 (2026-04-15) verwijderd vanwege gewijzigd ontwerp. De deur staat nu los in de ruimte — orphan element. Verwijderen voorkomt geest-element in de tellingen.",
        facts: [
          { label: "Te verwijderen", value: "DR-G-012 (deur)", variant: "old" },
          { label: "Voormalige host", value: "WL-G-021" },
          { label: "Verwijderd in", value: "Revisie 4 — 2026-04-15" },
          { label: "Reden", value: "Element zonder host-muur (orphan)" }
        ],
        bron: "Westflank.ifc → IfcDoor #1212 (orphan)"
      }
    ]
  },
  {
    id: "job-mc-002",
    source: "meeting-coach",
    title: "Meeting-feedback — Strukton-pitch 02-04",
    description:
      "Na de Strukton-pitch heeft de Meeting Coach 6 verbetersuggesties gegenereerd. Bekijk per stuk of we het meenemen in het brein.",
    approvalMode: "double",
    deadline: "2026-05-06T17:00:00Z",
    assignees: ["dirk@vondr.ai", "milan@vondr.ai"],
    createdAt: "2026-05-01T15:00:00Z",
    questions: [
      {
        id: "q-101",
        jobId: "job-mc-002",
        position: 1,
        type: "Nieuwe FAQ",
        suggestion: "FAQ toevoegen aan het brein",
        reason:
          "Strukton-CTO stelde deze vraag op 14:23. Antwoord van Dirk landde, maar staat nog niet in het brein.",
        reasonLong:
          "Quote uit transcript (14:23:11): 'Maar wij hebben geen team dat dit gaat onderhouden, hoe zien jullie dat?' — Dirk's antwoord (14:23:45) was sterk en compact. Het paraat hebben in toekomstige pitches voorkomt opnieuw improviseren.",
        facts: [
          {
            label: "Vraag",
            value:
              "Wat als wij geen IT-team hebben dat dit kan onderhouden?",
            variant: "highlight"
          },
          {
            label: "Voorgesteld antwoord",
            value:
              "Onderhoud is geen IT-werk maar curatie-werk. Jullie experts beslissen wekelijks wat het brein leert via dezelfde swipe-flow. Geen developers nodig — de mensen die nu de FAQ's schrijven worden de redacteurs.",
            variant: "new"
          },
          { label: "Door", value: "Strukton-CTO" },
          { label: "Sectie in brein", value: "FAQ → Implementatie" }
        ],
        bron: "Meeting 2026-04-02 14:23"
      },
      {
        id: "q-102",
        jobId: "job-mc-002",
        position: 2,
        type: "Brandscript-bevestiging",
        suggestion: "Positief signaal vastleggen voor language-model",
        reason:
          "Brand-doctrine zegt: liever 'systeem' of 'brein' dan 'platform'. Pitch volgde dit goed.",
        reasonLong:
          "Vondr-brandscript heeft een verboden-term-lijst waarop 'platform' staat (te generiek, klinkt als concurrent). In deze pitch is de term 0x gevallen — Milan gebruikte consistent 'brein' en 'systeem'. Bevestigen als positief signaal voor het language-model.",
        facts: [
          {
            label: "Wat we zagen",
            value:
              "Term 'platform' werd 0× gebruikt in deze pitch. Milan koos consistent voor 'brein' en 'systeem'.",
            variant: "highlight"
          },
          {
            label: "Vastleggen als",
            value: "Positief signaal — brandscript-discipline werkt",
            variant: "new"
          },
          { label: "Door", value: "Milan (hele pitch)" }
        ],
        bron: "Meeting 2026-04-02 — full transcript"
      },
      {
        id: "q-103",
        jobId: "job-mc-002",
        position: 3,
        type: "Nieuwe objection-response",
        suggestion: "Objection-antwoord toevoegen aan brein",
        reason:
          "Niet expliciet gevraagd in deze meeting, maar gerelateerde objection wel. Tijd voor een paraat antwoord.",
        reasonLong:
          "De ChatGPT-vergelijking komt niet expliciet, maar de implicatie zat in een vraag van Strukton's IT-lead om 14:51. We hebben geen scherp paraat antwoord. Voorgesteld antwoord: 'ChatGPT is een mes; Vondr is een keuken.' — verschil tussen tool en samenhangend systeem.",
        facts: [
          {
            label: "Objection",
            value: "Is dit niet gewoon ChatGPT met een sausje?",
            variant: "highlight"
          },
          {
            label: "Voorgesteld antwoord",
            value:
              "ChatGPT is een mes. Vondr is een keuken. Het verschil: een tool versus een samenhangend systeem dat jullie taal leert, jullie regels onthoudt, en bij elke beslissing jullie input vraagt.",
            variant: "new"
          },
          { label: "Aanleiding", value: "IT-lead Strukton — 14:51 (afgeleid)" }
        ],
        bron: "Meeting 2026-04-02 14:51 (afgeleid)"
      },
      {
        id: "q-104",
        jobId: "job-mc-002",
        position: 4,
        type: "Quote toevoegen aan deck",
        suggestion: "CFO-quote opnemen in pitch-deck",
        reason:
          "Sterke quote die het auditbaar-aspect raakt. Mag (met permissie) in het deck.",
        reasonLong:
          "Quote (15:08:22): 'Eigenlijk is dit de eerste keer dat ik bij een AI-demo niet het gevoel heb dat ik op blind vertrouwen moet rekenen — dit voelt als iets wat ik kan controleren.' Eerst toestemming vragen voor naam/quote, daarna in deck plaatsen onder 'wat klanten zeggen'.",
        facts: [
          {
            label: "Quote",
            value:
              "Eigenlijk is dit de eerste keer dat ik bij een AI-demo niet het gevoel heb dat ik op blind vertrouwen moet rekenen — dit voelt als iets wat ik kan controleren.",
            variant: "highlight"
          },
          { label: "Door", value: "CFO Strukton" },
          { label: "Plaatsing", value: "Pitch-deck · sectie 'wat klanten zeggen'" },
          { label: "Voorwaarde", value: "Toestemming naam/quote vragen" }
        ],
        bron: "Meeting 2026-04-02 15:08"
      },
      {
        id: "q-105",
        jobId: "job-mc-002",
        position: 5,
        type: "Demo-script wijziging",
        suggestion: "Demo-script verkorten",
        reason:
          "Die 4 minuten landden niet — het concept werd duidelijk uit de demo zelf, dus het uitleg-stuk is overbodig.",
        reasonLong:
          "Bij minuut 7-11 was de uitleg over brein-documenten merkbaar te abstract — twee mensen keken weg, één opende een laptop. Toen we daarna de live-demo gingen doen, werd het concept direct duidelijk uit context. Conclusie: skip de uitleg, ga direct naar de demo. Bespaart 4 min.",
        facts: [
          { label: "Onderdeel", value: "Uitleg-blok 'wat is een brein-document'" },
          { label: "Huidige plek", value: "Minuut 7 – 11 (4 min)", variant: "old" },
          { label: "Voorgesteld", value: "Skip — direct naar live-demo", variant: "new" },
          { label: "Tijdwinst", value: "+ 4 min" },
          { label: "Signaal", value: "2 mensen wegkijken, 1 laptop openend" }
        ],
        bron: "Meeting 2026-04-02 07:00 – 11:00"
      },
      {
        id: "q-106",
        jobId: "job-mc-002",
        position: 6,
        type: "Doctrine-update",
        suggestion: "Top-3 voordelen voor infra-sector herzien",
        reason:
          "CFO + IT-lead haakten beiden aan op de auditbaar-heid. Voor de bouw/infra-sector is dit blijkbaar belangrijker dan we dachten.",
        reasonLong:
          "We pitchen normaal 'snelheid, kwaliteit, schaalbaarheid' als top-3. Maar in deze meeting (en eerder bij TenneT) was 'auditbaar / wie-besliste-wanneer' duidelijk een doorslag-argument. Voor infra/bouw mogelijk de top-3 herzien naar 'auditbaar, kwaliteit, snelheid'.",
        facts: [
          { label: "Onderdeel", value: "Top-3 voordelen voor infra-sector" },
          {
            label: "Huidige top-3",
            value: "Snelheid · Kwaliteit · Schaalbaarheid",
            variant: "old"
          },
          {
            label: "Voorgesteld",
            value: "Auditbaar · Kwaliteit · Snelheid",
            variant: "new"
          },
          { label: "Bewijs", value: "Strukton + TenneT (2026-04-10) beiden geraakt" }
        ],
        bron: "Meeting 2026-04-02 — meta-observatie"
      }
    ]
  }
];

export function getJobById(id: string) {
  return mockJobs.find((j) => j.id === id);
}

export function getAllJobs() {
  return mockJobs;
}
