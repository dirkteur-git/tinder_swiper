# Vondr Swiper

Tinder-stijl PWA waar Vondr-medewerkers FAQ-kandidaten beoordelen die door de
POC (`newMegaVondr`) zijn voorgesteld.

```
┌─────────────┐  insert candidates    ┌──────────────┐  read candidates  ┌─────────────┐
│  POC        │ ────────────────────► │  Supabase    │ ◄──────────────── │  Swiper     │
│ (lokaal)    │                       │  (postgres)  │                   │  (Vercel)   │
│             │ ◄──────────────────── │              │ ──── insert ────► │             │
└─────────────┘  pull votes (poll)    └──────────────┘      vote         └─────────────┘
```

POC en swiper kennen elkaar niet. Supabase is de gedeelde postbus.

## Wat de swiper doet

- **Sleep rechts** (`yes`) → POC voegt FAQ toe aan kennisbank
- **Sleep links** (`no`) → afwijzen, geen FAQ
- **Sleep omhoog** (`maybe`) → "later" — kaart blijft in pool
- **Tap** op de kaart → bottom-sheet om de voorgestelde **vraag + antwoord**
  te bewerken vóór goedkeuren

Magic-link login via Supabase Auth, whitelist `@vondr.ai`. Hosting op Vercel.

## Opzetten — eerste keer

### 1. Supabase project

1. Ga naar [supabase.com](https://supabase.com), maak een project.
2. Open **SQL Editor** → plak de inhoud van
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) →
   Run.
3. **Authentication → Providers**: zet Email aan, Magic Link aan, wachtwoorden
   uit.
4. **Authentication → URL Configuration**: voeg je Vercel-URL toe (en
   `http://localhost:3000` voor dev) als **Redirect URL**:
   - `https://<jouw-vercel>.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Kopieer **Project URL** + **publishable key** (Settings → API).

### 2. Env vars

Lokaal — maak `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAILS=dirk@vondr.ai,milan@vondr.ai
NEXT_PUBLIC_ALLOWED_DOMAINS=vondr.ai
```

Op Vercel — zet dezelfde vars onder **Settings → Environment Variables** voor
Production + Preview.

### 3. Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), je wordt naar `/login`
gestuurd, vraag magic-link aan, klik in de mail.

### 4. POC koppelen

Geef de POC drie env-vars:

```
SUPABASE_URL=<zelfde URL>
SUPABASE_SERVICE_KEY=<service_role_key — settings/api in Supabase Studio>
```

De **service-role key** mag nooit in deze swiper-app komen — alleen op de
POC-side.

## Wat je leest / schrijft

| Tabel | Wie schrijft | Wie leest |
|---|---|---|
| `swipe_candidates` | POC (service-role) | swiper (RLS: authenticated) |
| `swipe_votes` | swiper (RLS: `auth.email() = voted_by`) | POC + swiper |

Status van een kandidaat muteren = uitsluitend POC. Swiper raakt
`swipe_candidates.status` niet aan.

## Code-structuur

```
src/
├── app/
│   ├── layout.tsx              PWA-meta + font
│   ├── page.tsx                Stack — auth-gated, fetcht candidates server-side
│   ├── login/page.tsx          Magic-link form
│   ├── auth/callback/route.ts  Supabase OAuth-callback (whitelist-check)
│   ├── auth/signout/route.ts   POST-only signout
│   └── not-found.tsx
├── middleware.ts               Auth-gate alle non-public routes
├── components/
│   ├── SwipeCard.tsx           framer-motion drag, rotatie, stempels, haptic
│   ├── CardStack.tsx           Stack-manager, undo, voortgang, vote-flow
│   ├── EditSheet.tsx           Bottom-sheet voor edit-before-accept
│   ├── MatchOverlay.tsx        "Match!" 1.5s animatie bij 'yes'
│   ├── BrandWordmark.tsx
│   └── PwaRegister.tsx
└── lib/
    ├── types.ts                Candidate, Vote, Decision
    ├── candidates.ts           fetchOpenCandidates, castVote, deleteVote
    ├── supabase/browser.ts     getSupabase()  — voor client components
    ├── supabase/server.ts      getSupabaseServer()  — voor server components
    ├── auth-whitelist.ts       isAllowedEmail()
    └── haptic.ts               Vibration API + iOS Web Audio fallback

supabase/migrations/
└── 0001_init.sql               Schema + RLS

public/
├── manifest.json, sw.js, icon.svg
```

## Deploy naar Vercel

1. Push naar GitHub (deze repo: `dirkteur-git/tinder_swiper`).
2. [vercel.com/new](https://vercel.com/new) → importeer.
3. Zet env-vars (zie hierboven).
4. **Settings → Deployment Protection**: zet Vercel Authentication uit, anders
   krijgen Dirk + Milan een 403 voordat ze bij `/login` zijn.
5. Voeg de production-URL toe aan Supabase **Auth → URL Configuration** als
   Redirect URL.

## Sleutelbeslissingen

- **Geen FAQ-tabel hier.** POC blijft eigenaar van de kennisbank. Swiper
  verzamelt menselijke beslissingen.
- **Geen direct schrijven naar `swipe_candidates` vanuit browser.** Alleen
  service-role (POC). RLS bevestigt dit.
- **Status muteren = POC, niet swiper.** Swiper schrijft votes en wacht
  passief.
- **Eén row per swipe.** Niet batchen. Dubbele stemmen door dezelfde user op
  dezelfde kaart filtert de UI client-side weg; POC neemt de laatste.
- **Undo deletet de vote-row** (extra DELETE-policy in migratie). Anders zou
  een per-ongeluk-no een spook-stem achterlaten.
- **Geen AI-assist in de swiper.** AI-werk hoort in de POC. Dit is mens-werk.

## Buiten v1-scope

- Realtime updates (refresh werkt prima voor 2 users)
- Push-notificaties
- Double approval (`requires_double` is wel in schema, logica bij POC)
- Patroon-detectie / Bespreken-tab
- Geavanceerde analytics

## Mechaniek-details (van origineel Tinder_Swiper)

| Gebaar | Decision |
|---|---|
| Sleep rechts (≥110px of velocity > 500 px/s) | `yes` |
| Sleep links | `no` |
| Sleep omhoog | `maybe` |
| Tap (movement < 8px én duur < 350ms) | open EditSheet |
| Knoppen ✕ ↻ ↑ ✓ | idem |

Stempels "JA"/"NEE"/"LATER" faden in op basis van drag-distance.
Multi-laagse haptic feedback (Android: Vibration API; iOS: Web Audio sub-bas
fallback).

## Test-loop met POC

```
1. POC: vink 2 FAQ-kandidaten aan, klik "Stuur naar swiper"
   → 2 rijen in swipe_candidates (status='open')
2. Swiper: refresh, log in met magic-link, zie 2 kaarten
3. Swipe rechts op kaart 1, tap kaart 2 → edit antwoord → Goedkeuren
   → 2 rijen in swipe_votes
4. POC: klik "Sync swiper"
   → kaart 1 → FAQ-rij aangemaakt + status='resolved'
   → kaart 2 → FAQ-rij aangemaakt met edited_answer + status='resolved'
```
