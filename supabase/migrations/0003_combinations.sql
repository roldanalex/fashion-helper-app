-- The Combination Table: single source of truth for outfit recommendations.
-- Only combinations scoring >= 7.0 overall are ever stored.
create table public.combinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  top_id uuid not null references public.clothing_items (id) on delete cascade,
  bottom_id uuid not null references public.clothing_items (id) on delete cascade,
  outerwear_id uuid references public.clothing_items (id) on delete cascade,
  shoes_id uuid not null references public.clothing_items (id) on delete cascade,
  accessory_ids uuid[] not null default '{}',
  color_harmony_score numeric(3, 1),
  old_money_score numeric(3, 1),
  formality_score numeric(3, 1),
  weather_suitability_score numeric(3, 1),
  work_score numeric(3, 1),
  daily_score numeric(3, 1),
  overall_score numeric(3, 1) not null check (overall_score >= 7.0),
  season_suitability text[] not null default '{}',
  notes text,
  boosted boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  last_recommended timestamptz
);

-- Dedupe: one row per unique item tuple (coalesce because outerwear is nullable).
create unique index combinations_unique_tuple_idx
  on public.combinations (
    user_id, top_id, bottom_id, shoes_id,
    coalesce(outerwear_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index combinations_user_overall_idx
  on public.combinations (user_id, overall_score desc)
  where not hidden;
create index combinations_user_work_idx
  on public.combinations (user_id, work_score desc)
  where not hidden;
create index combinations_user_daily_idx
  on public.combinations (user_id, daily_score desc)
  where not hidden;

alter table public.combinations enable row level security;

create policy "Users manage own combinations"
  on public.combinations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
