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
      "Het BIM-model heeft 12 objecten met afwijkende naamgeving. Bekijk per object of de voorgestelde naam klopt en accepteer of wijs af.",
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
        suggestion: "Object 'WND-3F-021' hernoemen naar 'WND-03-021'",
        reason:
          "Andere ramen op dezelfde verdieping volgen het patroon WND-{verdieping}-{nummer}. Dit object wijkt af.",
        reasonLong:
          "Op verdieping 3 staan 18 ramen. 17 daarvan volgen het patroon WND-03-XXX (bv. WND-03-018, WND-03-019). Dit object heeft als enige WND-3F-021. Vermoedelijk een typfout bij import vanuit Revit. Hernoemen naar WND-03-021 maakt de naamgeving consistent en voorkomt fouten in de hoeveelheidsstaat.",
        bron: "Westflank.ifc → IfcWindow #4821",
        deeplink: "https://nextbim.example/object/WND-3F-021"
      },
      {
        id: "q-002",
        jobId: "job-bim-001",
        externalId: "DR-G-007",
        position: 2,
        suggestion: "Deur 'DR-G-007' classificeren als 'binnendeur' i.p.v. 'buitendeur'",
        reason:
          "De deur grenst aan twee verwarmde ruimtes — niet aan buitenklimaat. Classificatie buitendeur past niet.",
        reasonLong:
          "DR-G-007 verbindt ruimte 1.04 (kantine, verwarmd) met ruimte 1.05 (gang, verwarmd). De huidige classificatie 'buitendeur' triggert een onnodig hogere isolatie-eis in de NEN-check. Op basis van ruimte-classificatie hoort deze deur onder 'binnendeur — niveau 2'.",
        bron: "Westflank.ifc → IfcDoor #1207",
        deeplink: "https://nextbim.example/object/DR-G-007"
      },
      {
        id: "q-003",
        jobId: "job-bim-001",
        externalId: "WL-2-014",
        position: 3,
        suggestion: "Wandtype 'WL-2-014' aanpassen van 'gipsplaat' naar 'kalkzandsteen'",
        reason:
          "Naastliggende wanden zijn allemaal kalkzandsteen 100mm. Materiaal-eigenschappen suggereren dat hier ook kalkzandsteen hoort.",
        reasonLong:
          "Wand WL-2-014 heeft als enige op verdieping 2 een gipsplaat-aanduiding. Dikte (102mm) en akoestische waardes (Rw 49) komen overeen met de omliggende kalkzandsteen-wanden. Vermoedelijk per ongeluk verkeerde laag gekoppeld in Revit. Classificatie aanpassen voorkomt fouten in materiaalstaat.",
        bron: "Westflank.ifc → IfcWall #3014",
        deeplink: "https://nextbim.example/object/WL-2-014"
      },
      {
        id: "q-004",
        jobId: "job-bim-001",
        externalId: "RAD-1-003",
        position: 4,
        suggestion: "Radiator 'RAD-1-003' verplaatsen naar IfcSpace 1.07",
        reason:
          "Radiator staat nu in IfcSpace 1.06 (gang) maar de coördinaten liggen 0,8m binnen ruimte 1.07.",
        reasonLong:
          "Coördinaten: X=12.4, Y=8.2 — dat is binnen de polygon van ruimte 1.07 (vergaderruimte). Vermoedelijk fout in spatial-relations bij MEP-import. Hercategoriseren naar 1.07 is nodig voor correcte verwarmingsberekening.",
        bron: "Westflank.ifc → IfcSpace 1.06"
      },
      {
        id: "q-005",
        jobId: "job-bim-001",
        externalId: "BM-G-019",
        position: 5,
        suggestion: "Balk 'BM-G-019' verwijderen — duplicaat van BM-G-018",
        reason:
          "Twee balken op exact dezelfde positie (delta < 1mm). Eén is door dubbele import ontstaan.",
        reasonLong:
          "BM-G-018 en BM-G-019 hebben identieke coördinaten (afwijking < 1mm), zelfde profiel (HEA 200), zelfde lengte (4.2m). De maker-tag toont dat BM-G-019 toegevoegd is na een tweede IFC-import. Verwijderen voorkomt dubbele hoeveelheid in de constructiestaat.",
        bron: "Westflank.ifc → IfcBeam #5019"
      },
      {
        id: "q-006",
        jobId: "job-bim-001",
        externalId: "FL-2-004",
        position: 6,
        suggestion: "Vloer 'FL-2-004' classificeren als verdiepingsvloer i.p.v. dakvloer",
        reason:
          "Boven deze vloer ligt nog verdieping 3. Classificatie dakvloer onmogelijk.",
        reasonLong:
          "FL-2-004 heeft Z-coördinaat 7.0m. Boven deze hoogte zijn 14 elementen op verdieping 3. Dakvloer-classificatie is dus per definitie fout — moet verdiepingsvloer zijn. Heeft impact op constructieve berekening en isolatie-eisen.",
        bron: "Westflank.ifc → IfcSlab #2104"
      },
      {
        id: "q-007",
        jobId: "job-bim-001",
        externalId: "CL-3-AREA",
        position: 7,
        suggestion: "Plafondhoogte verdieping 3 corrigeren van 2.40m naar 2.70m",
        reason:
          "Plafond-objecten staan op 2.70m, maar IfcZone-property zegt 2.40m. Property is verouderd.",
        reasonLong:
          "Alle 8 plafond-elementen op verdieping 3 staan geometrisch op Z=9.7m (= 2.7m boven vloer-Z=7.0m). De IfcZone-property 'CeilingHeight' toont echter nog de oude waarde 2.40m uit een eerdere ontwerpversie. Inconsistentie zorgt voor verkeerde ruimtelijke check.",
        bron: "Westflank.ifc → IfcZone V3"
      },
      {
        id: "q-008",
        jobId: "job-bim-001",
        externalId: "DR-G-012",
        position: 8,
        suggestion: "Deur 'DR-G-012' verwijderen — staat in een muur die niet meer bestaat",
        reason:
          "De host-muur is in revisie 4 verwijderd. De deur is daar niet bij meegenomen — orphan.",
        reasonLong:
          "DR-G-012 was gekoppeld aan WL-G-021. Die wand is in revisie 4 (2026-04-15) verwijderd vanwege gewijzigd ontwerp. De deur staat nu los in de ruimte — orphan element. Verwijderen voorkomt geest-element in de tellingen.",
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
        suggestion:
          "FAQ toevoegen: 'Wat als wij geen IT-team hebben dat dit kan onderhouden?'",
        reason:
          "Strukton-CTO stelde deze vraag op 14:23. Antwoord van Dirk landde, maar staat nog niet in het brein.",
        reasonLong:
          "Quote uit transcript (14:23:11): 'Maar wij hebben geen team dat dit gaat onderhouden, hoe zien jullie dat?' — Dirk's antwoord (14:23:45) was sterk en compact. Het paraat hebben in toekomstige pitches voorkomt opnieuw improviseren.",
        bron: "Meeting 2026-04-02 14:23"
      },
      {
        id: "q-102",
        jobId: "job-mc-002",
        position: 2,
        suggestion:
          "Brand-script-check: term 'platform' vermeden in deze pitch — keep it that way",
        reason:
          "Brand-doctrine zegt: liever 'systeem' of 'brein'. Pitch volgde dit goed — mag als positieve confirmatie in het brein.",
        reasonLong:
          "Vondr-brandscript heeft een verboden-term-lijst waarop 'platform' staat (te generiek, klinkt als concurrent). In deze pitch is de term 0x gevallen — Milan gebruikte consistent 'brein' en 'systeem'. Bevestigen als positief signaal voor het language-model.",
        bron: "Meeting 2026-04-02 — full transcript"
      },
      {
        id: "q-103",
        jobId: "job-mc-002",
        position: 3,
        suggestion: "Objection toevoegen: 'is dit niet gewoon ChatGPT met een sausje?'",
        reason:
          "Niet gevraagd in deze meeting, maar gerelateerde objection ('hoe is dit anders dan een copilot?') wel. Tijd voor een paraat antwoord.",
        reasonLong:
          "De ChatGPT-vergelijking komt niet expliciet, maar de implicatie zat in een vraag van Strukton's IT-lead om 14:51. We hebben geen scherp paraat antwoord. Voorgesteld antwoord: 'ChatGPT is een mes; Vondr is een keuken.' — verschil tussen tool en samenhangend systeem.",
        bron: "Meeting 2026-04-02 14:51 (afgeleid)"
      },
      {
        id: "q-104",
        jobId: "job-mc-002",
        position: 4,
        suggestion: "Quote van Strukton-CFO toevoegen aan pitch-deck als case",
        reason:
          "CFO zei 'dit voelt als de eerste keer dat AI eens iets zegt dat ik kan controleren'. Sterke quote, mag (met permissie) in het deck.",
        reasonLong:
          "Quote (15:08:22): 'Eigenlijk is dit de eerste keer dat ik bij een AI-demo niet het gevoel heb dat ik op blind vertrouwen moet rekenen — dit voelt als iets wat ik kan controleren.' Eerst toestemming vragen voor naam/quote, daarna in deck plaatsen onder 'wat klanten zeggen'.",
        bron: "Meeting 2026-04-02 15:08"
      },
      {
        id: "q-105",
        jobId: "job-mc-002",
        position: 5,
        suggestion:
          "Demo-script verkorten: weglaten 'wat is een brein-document'-uitleg",
        reason:
          "Die 4 minuten landden niet — het concept werd duidelijk uit de demo zelf, dus het uitleg-stuk is overbodig.",
        reasonLong:
          "Bij minuut 7-11 was de uitleg over brein-documenten merkbaar te abstract — twee mensen keken weg, één opende een laptop. Toen we daarna de live-demo gingen doen, werd het concept direct duidelijk uit context. Conclusie: skip de uitleg, ga direct naar de demo. Bespaart 4 min.",
        bron: "Meeting 2026-04-02 07:00-11:00"
      },
      {
        id: "q-106",
        jobId: "job-mc-002",
        position: 6,
        suggestion:
          "Voeg 'compliance / audit-trail' toe aan top-3 voordelen voor infra-sector",
        reason:
          "CFO + IT-lead haakten beiden aan op de auditbaar-heid. Voor de bouw/infra-sector is dit blijkbaar belangrijker dan we dachten.",
        reasonLong:
          "We pitchen normaal 'snelheid, kwaliteit, schaalbaarheid' als top-3. Maar in deze meeting (en eerder bij TenneT) was 'auditbaar / wie-besliste-wanneer' duidelijk een doorslag-argument. Voor infra/bouw mogelijk de top-3 herzien naar 'auditbaar, kwaliteit, snelheid'.",
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
