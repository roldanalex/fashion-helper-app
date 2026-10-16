-- Watches become their own wardrobe category with their own outfit slot.
--
-- 1. Allow 'watch' as a category.
-- 2. Add combinations.watch_id, a nullable slot like outerwear.
-- 3. Move existing watches out of the accessory category: the old
--    watch_style detail becomes the watch's type (subcategory).
-- 4. Move watch ids out of combinations.accessory_ids into watch_id.
-- 5. Rebuild the uniqueness rule to include the watch slot.
--
-- The SQL Editor flags the DROP statements below. They remove a check
-- constraint and an index that are recreated in the same script; no rows
-- are deleted.

alter table public.clothing_items
  drop constraint if exists clothing_items_category_check;
alter table public.clothing_items
  add constraint clothing_items_category_check
  check (category in ('top', 'bottom', 'outerwear', 'shoes', 'watch', 'accessory'));

alter table public.combinations
  add column if not exists watch_id uuid
  references public.clothing_items (id) on delete cascade;

update public.clothing_items
set category = 'watch',
    subcategory = coalesce(nullif(attributes ->> 'watch_style', ''), 'sports'),
    attributes = attributes - 'watch_style'
where category = 'accessory' and subcategory = 'watch';

-- Drop the unique index before rewriting rows so intermediate states can't
-- collide; the rewrite itself is one-to-one.
drop index if exists public.combinations_unique_tuple_idx;

update public.combinations c
set watch_id = w.id,
    accessory_ids = array_remove(c.accessory_ids, w.id)
from public.clothing_items w
where w.category = 'watch'
  and w.id = any (c.accessory_ids);

create unique index combinations_unique_tuple_idx
  on public.combinations (
    user_id, top_id, bottom_id, shoes_id,
    coalesce(outerwear_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(watch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    accessory_ids
  );

create index if not exists combinations_watch_id_idx
  on public.combinations (watch_id);
