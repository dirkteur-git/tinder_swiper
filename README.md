# Vondr — swipe-PWA

> Jij instrueert, AI voert uit, **jij beslist** — met één gebaar.

Een Tinder-stijl Progressive Web App voor governance-beslissingen. Andere
Vondr-systemen (NextBIM, Meeting Coach, Brein-curator) sturen *Jobs* hierheen
via een geauthenticeerde inbound-API. Elke beslissing in de Job wordt één
swipe-card. Gebruikers swipen rechts (ja), links (nee), of omhoog (niet ik).
Outbound webhooks melden elke beslissing terug aan het bron-systeem.

Het neveneffect is een ondertekende audit-trail van menselijke beslissingen —
voor de bouw/infra-sector (TenneT, Strukton, Heijmans) waar compliance telt is
dat het hoofdeffect.

## Status

Dit is een **PoC**. Werkt volledig client-side met mock data — geen Supabase
draait. De Supabase-migratiebestanden in [supabase/migrations](supabase/migrations/)
zijn klaar voor gebruik wanneer je naar productie gaat.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Je wordt direct doorgestuurd
naar `/inbox` en ziet twee voorbeeld-Jobs.

Best ervaren in **mobile-emulatie** (Chrome DevTools → toggle device toolbar →
iPhone 14 Pro). Op een echte telefoon: open het IP+poort van je dev-machine in
Safari/Chrome en gebruik *Add to Home Screen* om als PWA te installeren.

## De swipe-mechaniek

| Gebaar | Betekenis |
|---|---|
| Sleep naar rechts ▶ | Ja — accepteren |
| Sleep naar links ◀ | Nee — afwijzen |
| Sleep omhoog ▲ | Niet ik — door naar iemand anders |
| Tap op de kaart | Volledige onderbouwing |
| Tap ↶ knop | Laatste swipe ongedaan maken |

Snel flicken (snelheid > 500 px/s) telt ook als swipe — je hoeft niet ver te
slepen.

## Project-structuur

```
src/
├── app/
│   ├── layout.tsx          → PWA meta, viewport, font
│   ├── page.tsx            → redirect → /inbox
│   ├── inbox/page.tsx      → Job-overzicht (server) → InboxClient
│   ├── j/[id]/page.tsx     → Swipe-stack voor één Job
│   ├── docs/page.tsx       → API-documentatie
│   └── api/
│       ├── jobs/route.ts        → POST inbound (API-key auth)
│       ├── jobs/[id]/route.ts   → GET single job
│       └── votes/route.ts       → POST vote (PoC stub)
├── components/
│   ├── SwipeCard.tsx       → De magie: framer-motion drag, rotatie, stempels
│   ├── CardStack.tsx       → Stack-manager, undo, voortgangsbalk, counter
│   ├── MatchOverlay.tsx    → "Match!" 1.5s animatie
│   ├── ProfileSheet.tsx    → Tap-card → bottom-sheet met volle reden
│   ├── JobTile.tsx
│   ├── InboxClient.tsx
│   ├── BrandWordmark.tsx
│   └── PwaRegister.tsx
├── lib/
│   ├── types.ts
│   ├── mock-data.ts        → Twee voorbeeld-Jobs (BIM datakwaliteit + meeting feedback)
│   ├── store.ts            → localStorage-state voor stemmen
│   ├── schemas.ts          → zod inbound API
│   ├── webhook-sign.ts     → HMAC-SHA256 sign + verify
│   └── brand.ts
└── styles/globals.css

supabase/migrations/
├── 0001_init.sql           → Schema
├── 0002_rls.sql            → Row Level Security (verplicht aan, alle tabellen)
├── 0003_resolve_function.sql → Trigger + state machine voor stem-resolutie
└── 0004_seed.sql           → Eén voorbeeld-Job

public/
├── manifest.json
├── sw.js                   → Minimale service worker
└── icon.svg
```

## Tinder-feel — wat er onder de motorkap zit

Zie [src/components/SwipeCard.tsx](src/components/SwipeCard.tsx).

- **`useMotionValue`** voor x/y, geen state-updates per pixel.
- **`useTransform`** voor rotatie (1° per ~16px horizontale drag).
- **Stempels** ("JA"/"NEE"/"NIET IK") fade-in tied to drag-distance via `useTransform`.
- **Spring-snapback** als drag onder threshold blijft (`stiffness: 380, damping: 32`).
- **Velocity-trigger:** snelle flick → swipe (drempel 500 px/s) — geen volledige drag nodig.
- **Card-stack visueel:** top + 2 daaronder met `scale: 0.96, 0.92` en `translateY` voor diepte.
- **Haptische feedback** via `navigator.vibrate` bij confirmation (Android only).
- **Tap vs drag:** tap = pointermove < 8px én duur < 350ms → opent profile-view.

## Inbound API

Zie [/docs](http://localhost:3000/docs) voor het volledige formaat.

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer test" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "nextbim",
    "title": "Test job",
    "description": "Een testje",
    "approval_mode": "single",
    "assignees": ["dirk@vondr.ai"],
    "questions": [
      { "suggestion": "Doe iets", "reason": "Waarom we dit voorstellen" }
    ]
  }'
```

> **PoC-let op:** in deze build wordt de inbound-Job nog niet persistent
> opgeslagen — het endpoint valideert alleen het schema. De twee zichtbare Jobs
> in de Inbox komen uit `src/lib/mock-data.ts`. Voor productie: Supabase
> aansluiten en de TODO-comments in `src/app/api/jobs/route.ts` uitwerken.

## Outbound webhook

Zie [src/lib/webhook-sign.ts](src/lib/webhook-sign.ts) en [/docs](http://localhost:3000/docs).

Header: `X-Vondr-Signature: sha256=<hex>` over de raw body.

Verificatie in Node:
```js
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, secret, signatureHeader) {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

## Naar productie

1. **Supabase project aanmaken.** Run de 4 migraties uit `supabase/migrations/` in volgorde.
2. **Env-vars** vullen in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `WEBHOOK_SIGNING_SECRET_FALLBACK`
   - `APP_URL`
3. **Auth aanzetten** — magic-link via Supabase Auth (passwordless).
4. **Vercel deploy** (`vercel --prod`). Vercel doet HTTPS automatisch.
5. **Brand-assets uit vondr.ai trekken:**
   - Open `https://www.vondr.ai` in Chrome DevTools.
   - Kopieer logo-SVG uit DOM → `public/logo.svg`, vervang `BrandWordmark.tsx`.
   - Sample kleuren met Element-picker → `src/styles/globals.css` CSS-vars.
   - Font-family uit `getComputedStyle(document.body).fontFamily` → vervang in `layout.tsx`.

## Buiten PoC-scope

- `founders_unanimous` mode (datamodel klaar, logica buiten PoC)
- Calibration mode (kolom `is_calibration` bestaat)
- Patroon-detectie in Bespreken
- Push-notificaties
- SSO Microsoft/Outlook
- Expertise-routing op `↑ niet ik`
- Auditlog CSV/JSON-export
- Rate-limiting op inbound API
