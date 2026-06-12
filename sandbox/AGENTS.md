<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aether Wardrobe — agent guide

AI personal stylist (v1.0.0). Users photograph their wardrobe, GPT-4o tags each
piece, a deterministic engine + gpt-4o-mini build a scored combination table,
and daily recommendations filter that table by occasion and destination weather.

## Commands

```bash
pnpm dev      # dev server (needs .env.local — see .env.example)
pnpm build    # production build + type check; run before committing
```

There is no test suite; `pnpm build` is the verification gate.

## Architecture (the one rule that matters)

The `combinations` table is the **single source of truth**. The AI never
invents outfits at recommendation time — it only tags items, scores candidate
combinations in batches, and re-ranks/explains rows that already exist. Keep
new features on this pattern: deterministic logic first, one cheap LLM call at
the end.

Data flow:

1. Upload → `src/components/wardrobe/upload-sheet.tsx` compresses to webp,
   stores in the private `wardrobe` bucket, inserts `clothing_items` row.
2. `/api/items/analyze` → `src/lib/ai/tagging.ts` (gpt-4o vision; the user's
   free-text description overrides what the model sees).
3. User confirms tags → `/api/combinations/generate` →
   `src/lib/combinations/candidates.ts` (pure-TS pruning: formality delta ≤ 3,
   season overlap, color-clash heuristic, cap 120) →
   `src/lib/ai/scoring.ts` (gpt-4o-mini, 12 candidates/call) → insert only
   `overall_score ≥ 7.0` (DB check enforces this).
4. `/api/recommendations` → weather (`src/lib/weather.ts`) → SQL/JS filter via
   `OCCASION_WEIGHTS` in `src/lib/constants.ts` → `src/lib/ai/reranking.ts`
   (one gpt-4o-mini call) → persisted in `daily_plans` so reloads are free.
5. Shop page → `src/lib/gap-analysis.ts` re-uses the candidate engine with a
   probe item to count outfit unlocks; `src/lib/ai/shopping.ts` suggests items.

## Conventions & gotchas

- **Request middleware lives in `src/proxy.ts`** (Next 16 convention), not
  `middleware.ts`. It refreshes the Supabase session and guards routes.
- **DB types are hand-maintained** in `src/types/database.ts` — the Supabase
  CLI is not installed. If you change `supabase/migrations/`, update the types
  to match. Migrations run in numeric order; never edit an applied migration,
  add a new one.
- All AI calls use Vercel AI SDK `generateObject` with Zod schemas from
  `src/lib/schemas.ts`. gpt-4o is ONLY for vision tagging; everything else is
  gpt-4o-mini. Prompts after tagging are text-only (compact descriptors from
  `src/lib/ai/describe.ts`) — never send images to scoring/re-ranking.
- Every table has owner-only RLS; queries run with the user's session — never
  use a service-role key.
- **Access is allowlist-gated** (`access_grants` table, migration 0007).
  `requireApproved()` from `src/lib/access.ts` must guard EVERY API route that
  costs money — if you add a new AI route, add the guard first. UI gating
  happens in `src/app/(app)/layout.tsx` (→ `/pending`); admins manage grants
  at `/admin`.
- Wardrobe images are private; display them via `signImageUrls()`
  (`src/lib/supabase/storage.ts`), never public URLs.
- Theme is dark-only "old money": tokens live in `src/app/globals.css`
  (`.dark` block, oklch), fonts are Cormorant Garamond (serif headings) + Jost.
  shadcn/ui components in `src/components/ui/` (radix-nova preset).
- Tunables (occasion weights, batch size, score thresholds, version/credit
  strings) are centralized in `src/lib/constants.ts`.
- `.env*` is git-ignored except `.env.example`. Never commit real keys; the
  repo is public.

## Out of scope for v1 (don't build unless asked)

Trip planner / packing lists, conversational stylist chat, analytics
dashboard, pgvector/embeddings.
