# Vondr Swiper

Vondr Swiper — een PWA waar Vondr-founders FAQ-kandidaten beoordelen die
door **MegaVondr** zijn voorgesteld. Eén-gebaar-per-kandidaat: ja, nee, of
pas (= bespreken met de andere founder).

```
┌─────────────┐  insert candidates    ┌──────────────┐  read candidates  ┌─────────────┐
│  MegaVondr        │ ────────────────────► │  Supabase    │ ◄──────────────── │  Swiper     │
│ (lokaal)    │                       │  (postgres)  │                   │  (Vercel)   │
│             │ ◄──────────────────── │              │ ──── insert ────► │             │
└─────────────┘  pull votes (poll)    └──────────────┘      vote         └─────────────┘
```

MegaVondr en swiper kennen elkaar niet. Supabase is de gedeelde postbus.

## Wat de swiper doet

- **Sleep rechts** (`yes`) → goedkeuren — MegaVondr voegt FAQ toe (mits
  consensus met de andere founder)
- **Sleep links** (`no`) → afwijzen
- **Sleep omhoog** (`maybe` / "Pas") → bespreken met de andere founder →
  belandt in afstem-batch
- **Tap** op de kaart → bottom-sheet om de voorgestelde **vraag + antwoord**
  te bewerken vóór goedkeuren

Beide founders (Dirk + Milan) swipen onafhankelijk dezelfde batch. Pas als
ze beide hebben verzonden, vergelijkt MegaVondr de oordelen per kaart:
identiek + decisive (`ja+ja` of `nee+nee`) → doorvoeren; anders →
afstem-batch met andermans-mening op de kaart.

Email + wachtwoord login via Supabase Auth, whitelist `@vondr.ai`. Hosting op Vercel.

## Opzetten — eerste keer

### 1. Supabase project

1. Ga naar [supabase.com](https://supabase.com), maak een project.
2. Open **SQL Editor** → plak de inhoud van
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) →
   Run.
3. **Authentication → Sign In / Providers → Email**:
   - Email auth aan (default).
   - **"Confirm email"** UIT (anders kan niemand inloggen zonder werkende SMTP).
   - Wachtwoord-auth aan.
4. **Authentication → URL Configuration**: voeg je Vercel-URL toe (en
   `http://localhost:3000` voor dev) als **Redirect URL** (alleen nodig als je
   later magic-links/OAuth wil; voor wachtwoord-auth niet kritiek):
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
gestuurd. **Eerste keer**: klik onderaan "Eerste keer? Account aanmaken →",
vul je @vondr.ai-mail + wachtwoord in (minstens 6 tekens). Je bent direct
ingelogd (mits "Confirm email" uit staat in Supabase, zie hierboven).

Daarna: gewoon inloggen met dezelfde combinatie.

### 3b. Users beheren

In Supabase Studio: **Authentication → Users**. Hier kun je users handmatig
aanmaken (Add User), wachtwoorden resetten, of accounts verwijderen.

### 4. MegaVondr koppelen

Geef de MegaVondr drie env-vars:

```
SUPABASE_URL=<zelfde URL>
SUPABASE_SERVICE_KEY=<service_role_key — settings/api in Supabase Studio>
```

De **service-role key** mag nooit in deze swiper-app komen — alleen op de
MegaVondr-side.

## Wat je leest / schrijft

| Tabel | Wie schrijft | Wie leest |
|---|---|---|
| `swipe_candidates` | MegaVondr (service-role) | swiper (RLS: authenticated) |
| `swipe_votes` | swiper (RLS: `auth.email() = voted_by`) | MegaVondr + swiper |

Status van een kandidaat muteren = uitsluitend MegaVondr. Swiper raakt
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

1. Push naar GitHub (deze repo: `dirkteur-git/vondr_swiper`).
2. [vercel.com/new](https://vercel.com/new) → importeer.
3. Zet env-vars (zie hierboven).
4. **Settings → Deployment Protection**: zet Vercel Authentication uit, anders
   krijgen Dirk + Milan een 403 voordat ze bij `/login` zijn.
5. Voeg de production-URL toe aan Supabase **Auth → URL Configuration** als
   Redirect URL.

## Sleutelbeslissingen

- **Geen FAQ-tabel hier.** MegaVondr blijft eigenaar van de kennisbank. Swiper
  verzamelt menselijke beslissingen.
- **Geen direct schrijven naar `swipe_candidates` vanuit browser.** Alleen
  service-role (MegaVondr). RLS bevestigt dit.
- **Status muteren = MegaVondr, niet swiper.** Swiper schrijft votes en wacht
  passief.
- **Eén row per swipe.** Niet batchen. Dubbele stemmen door dezelfde user op
  dezelfde kaart filtert de UI client-side weg; MegaVondr neemt de laatste.
- **Undo deletet de vote-row** (extra DELETE-policy in migratie). Anders zou
  een per-ongeluk-no een spook-stem achterlaten.
- **Geen AI-assist in de swiper.** AI-werk hoort in de MegaVondr. Dit is mens-werk.

## Buiten v1-scope

- Realtime updates (refresh werkt prima voor 2 users)
- Push-notificaties
- Double approval (`requires_double` is wel in schema, logica bij MegaVondr)
- Patroon-detectie / Bespreken-tab
- Geavanceerde analytics

## Mechaniek-details

| Gebaar | Decision | Betekenis |
|---|---|---|
| Sleep rechts (≥110px of velocity > 500 px/s) | `yes` | Toevoegen aan het geheugen |
| Sleep links | `no` | Afwijzen |
| Sleep omhoog | `maybe` | **Pas** — bespreek met de andere founder |
| Tap (movement < 8px én duur < 350ms) | — | Open EditSheet |
| Knoppen ✕ ↻ ↑ ✓ | idem |

Stempels "JA"/"NEE"/"PAS" faden in op basis van drag-distance.
Multi-laagse haptic feedback (Android: Vibration API; iOS: Web Audio sub-bas
fallback).

## Test-loop met MegaVondr (v3, multi-user)

```
1. MegaVondr: push een batch met 3 FAQ-kandidaten
   → 1 rij in swipe_batches, 3 rijen in swipe_candidates (status='open')

2. Dirk:  log in, swipe alle 3 → klik 'Verzenden'
   Milan: log in, swipe alle 3 → klik 'Verzenden'
   → 6 rijen in swipe_votes (3 per user, is_draft=false)

3. MegaVondr: `npx tsx scripts/swiper/cli.ts compare --commit`
   → matches (ja+ja / nee+nee) → candidate.status='resolved' + lokale verwerking
   → conflicts (verschillend / pas) → nieuwe afstem-batch (is_followup=true)

4. Beide users zien de afstem-batch op /home met "Afstemming"-badge.
   Op de kaart: andermans-mening + voorstel-tekst, EditSheet vooringevuld.
   Swipe opnieuw → verzenden → MegaVondr compare opnieuw → consensus.
```

Volledige spec staat in [`SWIPER_CONTRACT.md`](SWIPER_CONTRACT.md).
