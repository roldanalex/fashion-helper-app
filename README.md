# 🧵 Aether Wardrobe

**Your personal AI stylist.** Photograph your wardrobe once, tell it your plans
each morning, and it lays out the outfit — matched to your style, the occasion,
and the weather at your destination.

![Version](https://img.shields.io/badge/version-1.0.0-c9a45c)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_·_Auth_·_Storage-3FCF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)
![React Three Fiber](https://img.shields.io/badge/React_Three_Fiber-3D-000000?logo=threedotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

> Created by **Alexis Roldan** · 2026

---

## ✨ What it does

| Feature | How it works |
| --- | --- |
| 📸 **Wardrobe cataloguing** | Upload one photo per piece. GPT-4o vision reads the cut, color, pattern and material — and your own notes ("pique", "merino") always win over what it sees. |
| 🧩 **Combination table** | A deterministic engine pairs each confirmed piece against your whole wardrobe (formality, season and color-clash filters), then gpt-4o-mini scores candidates in batches. Only outfits scoring ≥ 7.0 are kept. |
| 🌦️ **Daily recommendations** | Pick the occasion (work, mall, park, dinner…), optionally a destination and notes. The app pulls the forecast there, filters the table, and one AI call ranks the top picks with a "why this outfit" explanation. |
| 🗂️ **Outfits browser** | Filter by occasion, season or score. Boost favorites, hide misses, see which looks are "resting". |
| 🛍️ **Shopping gap analysis** | Tick the categories you're shopping for. The app counts how many new outfits one good piece would unlock — against your actual wardrobe — and suggests specific items to buy. |

💡 **Design principle:** the combination table is the single source of truth.
The AI never invents outfits at recommendation time — it only ranks and
explains what the table already vetted. That keeps results consistent and API
costs low (**~$0.01–0.03 per uploaded item**; fractions of a cent per daily
request).

## 🛠️ Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui ·
Supabase (Postgres, Google Auth, Storage) · Vercel AI SDK + OpenAI ·
OpenWeatherMap · React Three Fiber · TanStack Query · Zustand · Zod

## 🚀 Getting started

### 🔑 Prerequisites

You'll need free-tier accounts for four services:

| Service | Used for | Where |
| --- | --- | --- |
| 🗄️ Supabase | Database, Google sign-in, image storage | [supabase.com](https://supabase.com) |
| 🔐 Google Cloud | OAuth credentials for sign-in | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| 🤖 OpenAI | Vision tagging and outfit scoring | [platform.openai.com](https://platform.openai.com) |
| 🌤️ OpenWeatherMap | Destination weather | [openweathermap.org/api](https://openweathermap.org/api) |

### 1️⃣ Set up Supabase

1. Create a project, then run every file in `supabase/migrations/` **in order**
   in the SQL Editor (or `supabase link && supabase db push` with the CLI).
2. The private `wardrobe` storage bucket is created by migration `0006`.

### 2️⃣ Enable Google sign-in

1. In Google Cloud Console, create an **OAuth client ID** (Web application).
2. Set the authorized redirect URI to
   `https://<your-project>.supabase.co/auth/v1/callback`.
3. Paste the client ID and secret into **Supabase → Auth → Providers → Google**.

### 3️⃣ Configure and run

```bash
cp .env.example .env.local   # fill in your keys
pnpm install
pnpm dev
```

> 💸 **Tip:** set a monthly budget cap on your OpenAI key. The app is designed
> to stay cheap, but a cap costs nothing and removes all surprise.

### 4️⃣ Deploy to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables from `.env.example`, with
   `NEXT_PUBLIC_SITE_URL` set to your Vercel domain.
3. In **Supabase → Auth → URL Configuration**, set the Site URL to your Vercel
   domain and add `https://<your-domain>/auth/callback` to the redirect list.

## 🏛️ Architecture

```text
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

📁 Key paths:

- `src/lib/combinations/candidates.ts` — deterministic outfit candidate engine
  (also powers the shopping gap analysis)
- `src/lib/ai/` — the four AI call sites: tagging, scoring, re-ranking, shopping
- `src/lib/gap-analysis.ts` — counts outfits a hypothetical purchase would unlock
- `supabase/migrations/` — schema with row-level security on every table

## 🔒 Security & privacy

- 🚫 **No secrets in this repo.** All credentials live in environment
  variables; `.env*` files are git-ignored (only the placeholder
  `.env.example` is tracked).
- 🎟️ **Invitation-only usage.** Anyone can sign in with Google, but only
  emails on the `access_grants` allowlist can use the app — every AI endpoint
  verifies approval **server-side** before spending API credits. Admins grant
  or revoke access from the in-app `/admin` page or the Supabase dashboard.
- 🛡️ Every database table enforces Supabase **row-level security** — users can
  only ever read or write their own rows.
- 🖼️ Wardrobe photos live in a **private** storage bucket, served through
  short-lived signed URLs. Storage policies scope every operation to the
  owner's folder.
- 🔑 Weather and OpenAI calls run **server-side only**; API keys never reach
  the browser.

---

🧵 **Aether Wardrobe v1.0.0** · Created by **Alexis Roldan** · 2026
