# Aether Wardrobe

Your personal AI stylist. Photograph your wardrobe, plan your day, and dress
impeccably — whatever the weather.

- **Wardrobe cataloguing** — upload a photo per piece; GPT-4o vision reads the
  cut, color, pattern and material (your notes like "pique" or "merino" win).
- **Combination table** — every confirmed piece is paired against your whole
  wardrobe by a deterministic candidate engine, then scored in batches by
  gpt-4o-mini. Only outfits scoring ≥ 7.0 are kept.
- **Today** — pick the occasion (work, mall, park, dinner…), optionally a
  destination and notes. The app pulls the weather there, filters the table,
  and one AI call ranks the top picks with a "why this outfit" explanation.
- **Outfits browser** — filter by occasion/season/score, boost favorites,
  hide misses.
- **Shop** — gap analysis counts how many new outfits one good piece per
  category would unlock, and a personal-shopper AI suggests specific items.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui ·
Supabase (Postgres, Google Auth, Storage) · Vercel AI SDK + OpenAI ·
OpenWeatherMap · React Three Fiber · TanStack Query · Zustand · Zod

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run every file in `supabase/migrations/` (in order) in the SQL Editor —
   or `supabase link && supabase db push` with the CLI.
3. **Auth → Providers → Google**: enable it (see step 2 below for credentials).
4. Storage: the `wardrobe` bucket is created by migration `0006`.

### 2. Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth client ID (Web application).
2. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. Paste the client ID and secret into Supabase → Auth → Providers → Google.

### 3. API keys

- **OpenAI**: create a key at [platform.openai.com](https://platform.openai.com)
  — set a monthly budget cap. Typical cost: ~$0.01–0.03 per uploaded item,
  fractions of a cent per daily recommendation.
- **OpenWeatherMap**: free key at [openweathermap.org/api](https://openweathermap.org/api).

### 4. Environment

```bash
cp .env.example .env.local   # then fill in the values
pnpm install
pnpm dev
```

### 5. Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add the env vars from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to your
   Vercel domain).
3. In Supabase → Auth → URL Configuration, set the Site URL to your Vercel
   domain and add `https://<your-domain>/auth/callback` to the redirect list.

## How it works

```
photo upload ──► gpt-4o vision tags ──► you confirm ──► candidate engine (pure TS)
                                                            │  formality / season / color filters
                                                            ▼
                                          gpt-4o-mini batch scoring (12 per call)
                                                            │  keep ≥ 7.0 only
                                                            ▼
                                                  combinations table
                                                            ▲
        occasion + destination + notes ──► weather ──► SQL filter ──► gpt-4o-mini
                                                       re-rank + "why this outfit"
```

The combination table is the single source of truth — the AI never invents
outfits at recommendation time, it only ranks and explains what the table
already vetted.
