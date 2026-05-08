# Swiper ↔ MegaVondr contract — v3 (multi-user afstem-flow)

> Levend document. Wijzigingen vereisen overeenstemming aan beide kanten.
> v3 voegt multi-reviewer compare + afstem-batch toe bovenop v2 (batch-flow).
> v2-secties hieronder gelden onverkort; v3-extra staat onderaan in §V3.

## Architectuur

```
┌─────────────┐  insert batches + candidates    ┌──────────────┐  read open batches  ┌─────────────┐
│  MegaVondr        │ ──────────────────────────────► │  Supabase    │ ◄────────────────── │  Swiper     │
│ (lokaal)    │                                 │  (postgres)  │                     │  (Vercel)   │
│             │ ◄────── poll committed votes ── │              │ ─── insert vote ──► │             │
└─────────────┘  (where is_draft = false)        └──────────────┘                     └─────────────┘
```

MegaVondr schrijft **batches** en **kandidaten**. Swiper laat de gebruiker een batch
swipen, eindigt met een samenvatting, en stuurt de batch in zijn geheel naar
het geheugen ("verzenden"). Pas dan zijn votes voor de MegaVondr zichtbaar
(`is_draft = false`).

## Tabellen

### swipe_batches (MegaVondr schrijft)

| Kolom | Type | Verplicht | Voorbeeld |
|---|---|---|---|
| `external_id` | text UNIQUE | ✅ | `"poc-batch-7"` |
| `source` | text | default `'newmegavondr'` | — |
| `title` | text | ✅ | `"Update FAQ op basis van gesprek BAM"` |
| `klant_naam` | text | nee | `"BAM Infra B.V."` |
| `meeting_datum` | date | nee | `"2026-04-12"` |

### swipe_candidates (MegaVondr schrijft)

Onveranderd t.o.v. v1 + één extra:

| Kolom | Type | Toelichting |
|---|---|---|
| `batch_id` | uuid FK → swipe_batches.id | **Vul in** zodat de kaart in de batch-flow valt. NULL = losse kaart. |

Alle andere velden (`external_id`, `type`, `suggestion`, `proposed_answer`,
`klant_naam`, `klant_quote`, `meeting_datum`, `reason_long`, `bron`,
`facts_json`, `requires_double`, `status`) blijven hetzelfde.

### swipe_votes (swiper schrijft)

Onveranderd + één extra:

| Kolom | Type | Toelichting |
|---|---|---|
| `is_draft` | bool, default `false` | Swiper zet `true` voor batched flow. **MegaVondr moet `false` filteren** want drafts zijn nog niet verzonden. |

## Wat MegaVondr doet — schrijven

```sql
-- 1) batch
insert into public.swipe_batches (external_id, title, klant_naam, meeting_datum)
values ('poc-batch-7', 'Update FAQ op basis van gesprek BAM', 'BAM Infra B.V.', '2026-04-12')
returning id;

-- 2) candidates met batch_id
insert into public.swipe_candidates (
  external_id, batch_id, type, suggestion, proposed_answer, ...
) values
  ('poc-actie-12', '<batch-id>', 'Nieuwe FAQ', 'Hoe weten we dat antwoorden kloppen?', '...', ...),
  ('poc-actie-13', '<batch-id>', 'Antwoord-update', '...', '...', ...),
  ...;
```

Eén batch kan kandidaten van **meerdere types** bevatten — `type` blijft per
kandidaat. Zo kan "Update FAQ op basis van gesprek BAM" 2× Nieuwe FAQ + 1×
Antwoord-update + 1× Doctrine-toevoeging tegelijk bevatten.

Losse kaarten (zonder batch) blijven werken — die landen in een aparte
"Losse kaarten"-flow op de home en gebruiken nog de oude flat-stack waarbij
elke swipe direct committed is (`is_draft = false`).

## Wat MegaVondr doet — lezen

```sql
-- Pull alleen verzonden votes
select * from public.swipe_votes
where is_draft = false
  and voted_at > $cursor
order by voted_at asc;
```

**Belangrijk:** filter op `is_draft = false`. Drafts zijn nog niet
"verzonden" — de gebruiker is nog aan het bewerken op de samenvattings-
pagina.

Voor batch-completeness-detectie kan MegaVondr optioneel pollen per batch:

```sql
select b.id, b.title,
       count(c.id)                          as total,
       count(v.id) filter (where v.is_draft = false) as committed
from public.swipe_batches b
left join public.swipe_candidates c on c.batch_id = b.id
left join public.swipe_votes v on v.candidate_id = c.id
group by b.id, b.title;
```

Of gewoon doorgaan met candidate-niveau verwerking; de batch is
informatief, geen lock.

## Levenscyclus van een vote

```
[user swipe in batch]
    │
    └─► insert swipe_votes (is_draft = true)
            │
            ├─ undo binnen batch ─► delete swipe_votes
            │
            └─ user klikt 'verzenden' op samenvatting
                   │
                   └─► update swipe_votes set is_draft = false
                          │
                          └─► MegaVondr ziet vote bij volgende pull
                                 │
                                 └─► MegaVondr verwerkt + zet candidate.status = 'resolved'
```

## RLS — wat de swiper mag

- `swipe_batches`: SELECT voor authenticated. Geen INSERT (alleen service-role).
- `swipe_candidates`: SELECT voor authenticated. Geen INSERT/UPDATE/DELETE.
- `swipe_votes`:
  - INSERT eigen rijen (is_draft default `true` voor batched, `false` voor losse)
  - SELECT voor authenticated
  - UPDATE eigen rijen (voor commit van drafts)
  - DELETE eigen rijen (voor undo)

## Migraties

Run beide in Supabase SQL Editor:
1. `supabase/migrations/0001_init.sql` — basistabellen + initiële RLS
2. `supabase/migrations/0002_batches.sql` — batches + draft-flag

Beide zijn idempotent (`if not exists` / `drop policy if exists`).

## Edge cases

- **Dubbele swipe**: gebruiker stemt twee keer op dezelfde kaart binnen één
  batch → twee rijen in `swipe_votes`. MegaVondr neemt de laatste (hoogste
  `voted_at`) per (candidate_id, voted_by).
- **Half afgemaakte batch**: gebruiker swiped 2 van de 3 kaarten en sluit
  de app. Drafts staan in DB. Bij terugkomst ziet hij de batch met
  "1 te gaan" — laatste kaart afmaken → samenvatting → verzenden.
- **Undo na verzenden**: niet ondersteund. Voor verzenden = drafts deletable.
  Na verzenden = vote staat vast (MegaVondr moet 'm corrigeren als 'm wilt
  herroepen).
- **Lege batch**: batch zonder kandidaten verschijnt niet op de home (we
  filteren op `totalCandidates > 0` impliciet). MegaVondr kan ze veilig laten
  staan; ze schaden niet.

## Test-loop

```
1. MegaVondr: insert batch + 3 candidates met batch_id
   → swiper home toont 1 batch-tile

2. Swiper: tap batch → /batch/[id] → swipe 3 kaarten
   → 3 rijen in swipe_votes met is_draft = true
   → auto-redirect naar /batch/[id]/summary

3. Swiper: 'Verzenden naar het geheugen' klikken
   → 3 rijen geupdate naar is_draft = false
   → swiper redirect naar /
   → batch verdwijnt van home (volledig verzonden)

4. MegaVondr pullt → ziet 3 nieuwe committed votes
   → maakt FAQ-rijen + zet candidate.status = 'resolved'
```

## §V3 — Multi-user afstem-flow

### Het idee

Beide founders (Dirk + Milan) swipen onafhankelijk dezelfde batch. Pas als ze
beide hebben verzonden vergelijkt de MegaVondr de oordelen per kaart:

|              | Milan JA | Milan NEE | Milan PAS↑ |
|--------------|----------|-----------|------------|
| **Dirk JA**  | ✅ MATCH → JA | ❌ CONFLICT | ❌ CONFLICT |
| **Dirk NEE** | ❌ CONFLICT | ✅ MATCH → NEE | ❌ CONFLICT |
| **Dirk PAS↑**| ❌ CONFLICT | ❌ CONFLICT | ❌ CONFLICT |

Alleen `JA+JA` of `NEE+NEE` is consensus. Alles andere (verschillend, of
één-of-meer `PAS`) gaat naar een **afstem-batch** voor ronde 2.

`PAS` = "geen oordeel, bespreek met de ander" (omhoog-swipe). Vroegere
`maybe`/later-semantiek is vervallen — het signal blijft `decision='maybe'`
in de DB om migratiekosten te vermijden, maar de UI noemt het "Pas".

### Schema-uitbreiding (migration `0003_followup.sql`)

```sql
alter table swipe_batches
  add column parent_batch_id uuid references swipe_batches(id),
  add column is_followup     boolean not null default false,
  add column reviewers       text[]  not null default array['dirk@vondr.ai','milan@vondr.ai'],
  add column compared_at     timestamptz;

alter table swipe_candidates
  add column origin_candidate_id uuid references swipe_candidates(id);
```

- `swipe_batches.reviewers` — wie er moet stemmen voordat compare loopt.
- `swipe_batches.compared_at` — `null` = nog niet vergeleken; gezet door
  MegaVondr zodra compare-stap heeft gedraaid.
- `swipe_batches.is_followup` — true voor afstem-batches (UI toont oranje
  "Afstemming"-badge + andermans-mening op de kaarten).
- `swipe_batches.parent_batch_id` — verwijst naar de oorspronkelijke batch.
- `swipe_candidates.origin_candidate_id` — bij afstem-kandidaten verwijst
  naar de oorspronkelijke candidate uit ronde 1, zodat de Swiper-UI de
  vorige peer-vote kan ophalen.

### Lifecycle

```
Ronde 1                                     Compare-stap (MegaVondr)
─────────────                                ──────────────────────────────
MegaVondr pusht batch B1                           Pak batches met compared_at IS NULL
Dirk zwiept + verzendt                       Voor elke: alle reviewers gestemd?
Milan zwiept + verzendt                        ja → vergelijk per candidate:
                                                 ja+ja / nee+nee → MATCH
                                                 anders          → CONFLICT
                                              MATCHES: status='resolved',
                                                       MegaVondr verwerkt lokaal
                                                       (FAQ create / archief)
                                              CONFLICTS: maak afstem-batch
                                                       (is_followup=true,
                                                        parent_batch_id=B1.id),
                                                       kopieer candidates met
                                                       origin_candidate_id ref.
                                                       Originelen → 'resolved'.
                                              compared_at = now()

Ronde 2                                     Compare-stap (idem, recursief)
─────────────                                ──────────────────────────────
Beide users zien B1-r2 op home                ... totdat consensus
met "Afstemming"-badge.
SwipeCard toont andermans                    
mening + voorstel-tekst.                     
EditSheet vooringevuld met                   
peer's edit als die er was.                  
```

### Wat de MegaVondr moet doen

Naast wat in v2 stond:

1. **Niet meer per individuele vote verwerken**. Hou batch-level. Een
   committed Dirk-`yes` betekent niet dat de actie definitief is — wacht
   op Milan en vergelijk.
2. **Compare-trigger**: cronjob, hand-getriggerd, of na elke pull. Pak
   `swipe_batches WHERE compared_at IS NULL`. Per batch: check of álle
   reviewers committed votes hebben voor álle open candidates. Zo ja:
   vergelijk per candidate, splits in matches + conflicts.
3. **Match-actie**: pas lokaal toe (FAQ-rij aanmaken voor `yes`,
   archiveren voor `no`). Tekst-bron: meest recente edit (winnaar zoals
   gekozen door MegaVondr; bij gelijke edits wint de meest-recente in tijd).
4. **Conflict-actie**: maak afstem-batch (zelfde `klant_naam`,
   `meeting_datum`, `reviewers`; `parent_batch_id` = oude batch.id;
   `is_followup` = true). Kopieer conflict-candidates met
   `origin_candidate_id` = oorsprong. Markeer originelen `resolved` zodat
   de Swiper de oude batch leeg ziet.
5. **External-id-conventie**: voor afstem-batches `<parent>-r<n>` met `n`
   ophogend per ronde (bv `mv-faq-screen-2026q2-r2`,
   `...-r3`). Idempotent op `external_id`, dus repeated compare-runs
   maken niet steeds nieuwe batches aan.
6. **`compared_at` zetten** als laatste stap, zodat een gefaalde compare
   bij retry opnieuw vanaf nul kan beginnen.

### Wat de Swiper doet (al gebouwd)

- Detecteert `batch.is_followup` op de home en toont oranje
  "Afstemming"-badge.
- Op een afstem-kaart: peer-vote-blokje met decision + naam +
  voorstel-tekst.
- EditSheet: vooringevuld met peer's `edited_suggestion` /
  `edited_answer` als die er zijn — gebruiker kan akkoord gaan
  (laten staan), aanpassen, of verwerpen.
- Stemmen werkt verder identiek (drafts → verzenden → committed).

### Implementatie MegaVondr

Zie `MegaVondr/scripts/swiper/commands/compare.ts`. CLI:

```bash
npx tsx scripts/swiper/cli.ts compare --dry-run    # toon wat er zou gebeuren
npx tsx scripts/swiper/cli.ts compare --commit     # apply: matches + followups
```

`--commit` returnt JSON met `matches`-array per batch — daarop laat de
caller-skill (of een handmatige nabewerking) de FAQ-rijen aanmaken,
acties op `accepted`/`rejected` zetten, etc.

### Edge cases

- **Eén reviewer tijdelijk afwezig**: batch blijft in `compared_at IS NULL`
  totdat beide hebben gestemd. Geen tijdelijke output.
- **Iemand swipt op een afstem-kaart maar verandert van mening op het
  origineel**: kan niet — origineel is `resolved`, niet meer in zicht.
- **Ronde 5+**: theoretisch oneindig recursief. In de praktijk gaan
  founders na 2-3 rondes wel praten; het schema legt geen plafond op.
- **Mismatch tussen `reviewers` en wie écht stemde**: een vote van
  iemand die niet in `batch.reviewers` staat wordt genegeerd voor compare
  maar blijft staan in DB (audit trail).
- **Tekst-conflict bij decision-match**: beide JA maar verschillende
  `edited_suggestion`. Geen extra UI; de MegaVondr kiest de laatste edit als
  bron-of-truth. Als dat ongewenst blijkt, schalen we naar tekst-merge
  in een latere versie.

## Toekomst (niet nu)

- **Tekst-conflict-detectie**: bij `JA+JA` met afwijkende edits ook een
  afstem-batch openen voor de tekst (niet alleen voor decision).
- **Batch-status veld**: handig om MegaVondr `'open' | 'sent' | 'archived'` te
  laten muteren op batch-niveau. Niet nodig nu — MegaVondr zet candidate.status,
  swiper filtert op open candidates.
- **N reviewers**: schema ondersteunt `reviewers text[]` al; UI is
  hardcoded op twee. Voor N>2 moet de "andermans-mening"-strip multi-rij
  worden.
