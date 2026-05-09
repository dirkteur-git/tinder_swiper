# Vondr Swiper — Ingest API v1

Externe schrijvers (MegaVondr, klant-portals, ander Vondr-tooling) sturen
suggesties naar de Vondr Swiper via dit endpoint. Geen directe Supabase-
toegang meer nodig — token-auth + validatie + één bron-of-waarheid.

> **Endpoint**: `POST https://swipe.vondr.ai/api/v1/candidates`

---

## 1. Auth

Bearer-token in de Authorization-header. Tokens worden gehasht (sha256)
in `swipe_ingest_tokens` opgeslagen — alleen de hash blijft staan, de
plain token zie je éénmalig bij het aanmaken. Verloren? Maak nieuwe.

```
Authorization: Bearer ssp_<32-byte-hex>
```

### Token aanmaken (Supabase SQL Editor)

```sql
-- 1. Genereer een random plain-token (deel deze met de schrijver)
--    Voorbeeld in shell:  openssl rand -hex 32
-- 2. Hash hem met sha256:  echo -n "<plain>" | sha256sum
-- 3. Insert in DB:
insert into public.swipe_ingest_tokens (name, token_hash, source, scopes)
values (
  'MegaVondr-prod',
  '<sha256-hex-van-plain-token>',
  'megavondr',
  array['candidates:write']
);
```

Token revoken: `update public.swipe_ingest_tokens set revoked_at = now() where id = '...';`

---

## 2. Request

```http
POST /api/v1/candidates HTTP/1.1
Authorization: Bearer ssp_xxxxxxxxxxxx
Content-Type: application/json

{
  "batch": {                                  // optioneel
    "external_id": "mv-batch-7",
    "title": "FAQ-acties uit gesprek met BAM",
    "klant_naam": "BAM Infra B.V.",
    "meeting_datum": "2026-04-12"
  },
  "candidates": [
    {
      "external_id": "mv-actie-12",
      "type": "Nieuwe FAQ",
      "suggestion": "Hoe weten we dat antwoorden kloppen?",
      "proposed_answer": "Bij elk antwoord staat een klikbare bron met document, pagina en alinea.",
      "klant_naam": "BAM Infra B.V.",
      "klant_quote": "Wij werken met aansprakelijkheidscontracten...",
      "meeting_datum": "2026-04-12",
      "reason_long": "Robin (BAM IT-lead) vroeg dit op 00:18.",
      "bron": "transcript poc/1",
      "facts": [
        { "label": "Door", "value": "Robin Janssen (IT-lead)" }
      ]
    }
  ]
}
```

### Velden

#### `batch` (optioneel)

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `external_id` | string ≤200 | ✓ | Idempotency-handle (`<source>-batch-<id>`) |
| `title` | string ≤200 | ✓ | "FAQ-acties uit gesprek met BAM" |
| `klant_naam` | string ≤200 | nee | |
| `meeting_datum` | YYYY-MM-DD | nee | |

Geen batch meegestuurd → candidates landen in de fallback-stack ("Losse
suggesties") zonder groepering.

#### `candidates[]` (verplicht, 1–100)

| Veld | Type | Verplicht | Toelichting |
|---|---|---|---|
| `external_id` | string ≤200 | ✓ | Unieke handle, idempotent |
| `type` | enum | ✓ | Zie [§3 Type-set](#3-type-set) |
| `suggestion` | string ≤280 | ✓ | Korte titel/vraag — past op de kaart |
| `proposed_answer` | string ≤4000 | type-afh | Verplicht voor `Nieuwe FAQ`, `Antwoord-update` |
| `klant_naam` | string | nee | |
| `klant_quote` | string ≤2000 | nee | Letterlijke citaat, niet parafraseren |
| `meeting_datum` | YYYY-MM-DD | nee | |
| `reason_long` | string ≤2000 | type-afh | Verplicht voor `Doctrine`, `Risico`, `Beslissing` |
| `bron` | string ≤500 | nee | Traceability ref |
| `facts` | array van `{label, value, variant?}` | nee | Tags/feiten op de kaart |
| `requires_double` | bool | nee | Default false (tweede review nodig?) |
| `payload` | object | type-afh | Type-specifieke data |
| `media` | array van [MediaItem](#mediaitem) | type-afh | Verplicht voor `Brand-asset`, `Visual-mockup` |

#### `MediaItem`

```ts
{
  kind: "image" | "pdf" | "video" | "url",
  url: string,        // moet valid URL zijn
  alt?: string,       // ≤200
  label?: string      // ≤40, bv "huidig", "voorstel A"
}
```

---

## 3. Type-set

Elke `type` heeft een eigen verplichte-velden-contract. De Swiper UI
rendert per type een passende kaart-layout.

| `type` | Wat | Verplicht extra | Media | Payload-velden |
|---|---|---|---|---|
| `Nieuwe FAQ` | Vraag + antwoord die nog niet bestond | `proposed_answer` | nee | — |
| `Antwoord-update` | Voorstel ander antwoord op bestaande FAQ | `proposed_answer`, `bron` | nee | `{ faq_id }` aanbevolen |
| `Doctrine` | Algemene regel/principe (geen Q&A) | `reason_long` | nee | — |
| `Klant-fact` | Feit over klant (DNA-laag) | `klant_naam` | nee | — |
| `Project-fact` | Feit over project | `klant_naam` | nee | `{ project_ref }` aanbevolen |
| `Risico` | Geïdentificeerd risico | `reason_long`, `klant_quote` | nee | — |
| `Beslissing` | Vastgelegd besluit | `reason_long`, `meeting_datum` | nee | — |
| `Brand-asset` | Logo / icoon / wordmark | — | ✓ ≥1 | `{ asset_type: "logo"\|"icon"\|"wordmark" }` |
| `Brand-regel` | Token-keuze (kleur, font, spacing) | — | optioneel | `{ token, current, voorstel }` |
| `Copy-keuze` | A/B-tekstkeuze | `payload.optie_a + .optie_b` (string) | optioneel | `{ optie_a, optie_b }` |
| `Visual-mockup` | Design-iteratie | — | ✓ ≥1 | `{ context }` aanbevolen |

### Voorbeeld: Brand-asset

```json
{
  "external_id": "brand-2026q3-logo-rev3",
  "type": "Brand-asset",
  "suggestion": "Nieuw logo-voorstel voor Q3 — meer gewicht in de glyph",
  "klant_naam": null,
  "payload": { "asset_type": "logo" },
  "media": [
    {
      "kind": "image",
      "url": "https://cdn.vondr.ai/brand/logo-rev3-primary.png",
      "label": "voorstel",
      "alt": "Vondr-logo rev3 in donkerblauw"
    },
    {
      "kind": "image",
      "url": "https://cdn.vondr.ai/brand/logo-current.png",
      "label": "huidig",
      "alt": "Huidig logo"
    }
  ]
}
```

### Voorbeeld: Copy-keuze

```json
{
  "external_id": "copy-website-hero-2026q3",
  "type": "Copy-keuze",
  "suggestion": "Welke hero-tekst voor de homepage?",
  "payload": {
    "optie_a": "Jij beslist, AI voert uit.",
    "optie_b": "Het collectieve geheugen van jouw bedrijf."
  }
}
```

---

## 4. Response

### Succes (200)

```json
{
  "ok": true,
  "source": "megavondr",
  "batch": { "id": "uuid-...", "external_id": "mv-batch-7" },
  "candidates": [
    { "id": "uuid-...", "external_id": "mv-actie-12" }
  ]
}
```

### Fout

| HTTP | `error` | Wanneer |
|---|---|---|
| 400 | `invalid_json` | Body is geen geldige JSON |
| 400 | `validation_error` | Zod-validatie faalde — `issues[]` toont per-veld |
| 401 | `missing_bearer` | Geen Authorization-header |
| 401 | `empty_token` | Bearer staat er, maar token is leeg |
| 403 | `invalid_token` | Token niet gevonden of revoked |
| 403 | `insufficient_scope` | Token heeft niet `candidates:write` |
| 405 | `method_not_allowed` | Anders dan POST |
| 500 | `db_error` / `batch_failed` / `candidates_failed` | Iets mis aan onze kant |

### Validatie-fout voorbeeld

```json
{
  "error": "validation_error",
  "issues": [
    { "path": "candidates.0.media", "message": "Brand-asset vereist minimaal 1 media-item (image/pdf/video/url)." }
  ]
}
```

---

## 5. Idempotency

Beide `batch.external_id` en `candidate.external_id` zijn UNIQUE in de
database. Repeated POSTs met dezelfde IDs **upserten** — geen duplicaten.
Ideaal voor cronjobs die na elke meeting "stuur alles voor transcript X
naar de swiper" doen.

---

## 6. Rate limiting

Niet expliciet ingebouwd. Houd het redelijk: max ~100 candidates per
request, max ~10 requests/min per token. Bij misbruik revoken we de
token.

---

## 7. Curl-voorbeeld (snel testen)

```bash
TOKEN="ssp_jouw_token_hier"

curl -X POST https://swipe.vondr.ai/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch": {
      "external_id": "test-batch-1",
      "title": "API-test",
      "klant_naam": "Demo BV",
      "meeting_datum": "2026-05-08"
    },
    "candidates": [
      {
        "external_id": "test-actie-1",
        "type": "Nieuwe FAQ",
        "suggestion": "Werkt de ingest-API?",
        "proposed_answer": "Ja, als je dit antwoord ziet werkt-ie."
      }
    ]
  }'
```

Reageert binnen ~500ms met `200 OK` + de aangemaakte IDs. Open
`https://swipe.vondr.ai/` in je browser, log in → de batch staat als
nieuwe categorie op je home.

---

## 8. Server-side env-vars

In Vercel **Project Settings → Environment Variables** moet staan:

```
NEXT_PUBLIC_SUPABASE_URL=https://tfhinpcqwdaqlomlwido.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_secret>     # NIET publiek!
```

`SUPABASE_SERVICE_ROLE_KEY` is alleen nodig voor het server-side
API-endpoint. Hij komt nooit in de browser-bundle.

---

## 9. Versioning

Pad-prefix `/api/v1/` is permanent. Breaking changes → `/api/v2/`. Niet-
breaking velden (extra optionals, nieuwe types) komen erbij in v1
zonder bump.
