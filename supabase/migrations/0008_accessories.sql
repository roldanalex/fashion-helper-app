-- Accessory-aware combinations.
--
-- 1. Type-specific details for accessories (watch style, band, hardware tone)
--    live in a jsonb column so new accessory kinds never need a schema change.
-- 2. The combination uniqueness rule now includes the accessory set. Before
--    this, a second watch could never enter any outfit: its candidates shared
--    top/bottom/shoes/outerwear with existing rows and the whole insert batch
--    was rejected.

alter table public.clothing_items
  add column if not exists attributes jsonb not null default '{}'::jsonb;

drop index if exists public.combinations_unique_tuple_idx;

create unique index combinations_unique_tuple_idx
  on public.combinations (
    user_id, top_id, bottom_id, shoes_id,
    coalesce(outerwear_id, '00000000-0000-0000-0000-000000000000'::uuid),
    accessory_ids
  );

-- Speeds up "build around this accessory" filtering on the Outfits page.
create index if not exists combinations_accessory_ids_idx
  on public.combinations using gin (accessory_ids);
