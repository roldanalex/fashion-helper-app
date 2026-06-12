-- One plan per user/date/occasion; stores the weather snapshot and the
-- AI-ranked recommendations so page reloads never re-call the AI.
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  occasion text not null,
  destination text,
  dest_lat double precision,
  dest_lon double precision,
  notes text,
  weather jsonb,
  recommendations jsonb,
  worn_combination_id uuid references public.combinations (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, plan_date, occasion)
);

alter table public.daily_plans enable row level security;

create policy "Users manage own plans"
  on public.daily_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
