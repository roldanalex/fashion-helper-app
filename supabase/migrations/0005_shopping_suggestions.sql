create table public.shopping_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  subcategory text,
  item_name text not null,
  description text,
  reason text,
  color_name text,
  estimated_new_combinations int,
  status text not null default 'suggested'
    check (status in ('suggested', 'saved', 'dismissed', 'purchased')),
  created_at timestamptz not null default now()
);

create index shopping_suggestions_user_idx
  on public.shopping_suggestions (user_id, status);

alter table public.shopping_suggestions enable row level security;

create policy "Users manage own suggestions"
  on public.shopping_suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
