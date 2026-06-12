create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'New item',
  category text not null check (category in ('top', 'bottom', 'outerwear', 'shoes', 'accessory')),
  subcategory text,
  color_name text,
  color_hex text,
  pattern text,
  material text,
  description text,
  season text[] not null default '{}',
  formality_level int check (formality_level between 1 and 10),
  old_money_score int check (old_money_score between 1 and 10),
  image_url text not null,
  ai_status text not null default 'pending' check (ai_status in ('pending', 'tagged', 'confirmed', 'failed')),
  combo_status text not null default 'none' check (combo_status in ('none', 'queued', 'generating', 'done', 'failed')),
  last_worn date,
  wear_count int not null default 0,
  purchase_price numeric,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index clothing_items_user_category_idx
  on public.clothing_items (user_id, category)
  where not archived;

alter table public.clothing_items enable row level security;

create policy "Users manage own items"
  on public.clothing_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
