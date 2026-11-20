-- 1.5.0 — People and Families.
--
-- Wardrobe data now belongs to a Person, not an Account (docs/adr/0001).
-- Every Account gets a Family it owns and a "self" Person; a Family can also
-- hold Managed people (children, or adults without email) who never sign in.
--
-- 1. families, family_members, people (+ guards and limits)
-- 2. Backfill: one Family, owner membership and self Person per profile
-- 3. person_id on clothing_items, combinations, daily_plans,
--    shopping_suggestions, backfilled to each Account's self Person
-- 4. Outfits can never mix People: composite foreign keys + accessory trigger
-- 5. Access functions and row-level security by Person
-- 6. New sign-ups get their Family and self Person automatically
-- 7. Storage: photos under {uploader}/{person}/{piece} readable by the Person's editors
--
-- Run in the Supabase SQL Editor, after 0010. Safe to run more than once:
-- every step checks what already exists. The editor flags the DROP
-- statements: they replace policies, triggers, an index and a unique
-- constraint that are recreated in the same script; no rows are deleted.

begin;

-- 1. Tables ------------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Family' check (char_length(name) between 1 and 60),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('self', 'managed')),
  account_user_id uuid references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age_band text not null default 'adult'
    check (age_band in ('adult', 'teen', 'child', 'toddler')),
  is_minor boolean generated always as (age_band <> 'adult') stored,
  -- Managed people only; a self Person's style and traits live on profiles.
  style_preferences text[] not null default '{}',
  preferred_formality int check (preferred_formality between 1 and 10),
  gender text,
  skin_tone text,
  skin_undertone text,
  hair_color text,
  eye_color text,
  color_season text
    check (color_season is null or color_season in ('spring', 'summer', 'autumn', 'winter')),
  height_cm int check (height_cm is null or height_cm between 50 and 250),
  body_shape text,
  fit_preference text
    check (fit_preference is null or fit_preference in ('slim', 'regular', 'relaxed')),
  style_notes text check (style_notes is null or char_length(style_notes) <= 300),
  guardian_attested_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A self Person is an Account; a Managed person has none (until a hand-over).
  constraint people_kind_account check (
    (kind = 'self' and account_user_id is not null)
    or (kind = 'managed' and account_user_id is null)
  ),
  -- Minors: a parent or guardian vouched for them, and only the minimum is kept.
  constraint people_minor_minimum check (
    age_band = 'adult'
    or (
      kind = 'managed'
      and guardian_attested_at is not null
      and height_cm is null
      and body_shape is null
      and style_notes is null
    )
  )
);

create unique index if not exists people_one_self_per_account
  on public.people (account_user_id) where kind = 'self';
create index if not exists people_family_idx on public.people (family_id);

-- At most 8 People per Family (FAMILY_MAX_PEOPLE in src/lib/constants.ts).
create or replace function public.people_family_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.people where family_id = new.family_id) >= 8 then
    raise exception 'A family can have at most 8 people';
  end if;
  return new;
end;
$$;

drop trigger if exists people_family_limit on public.people;
create trigger people_family_limit
  before insert on public.people
  for each row execute function public.people_family_limit();

-- Identity columns never change from the app (a future hand-over will run as
-- a security-definer function that sets app.people_handover = 'on').
create or replace function public.people_guard_identity()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.people_handover', true), '') <> 'on'
     and (new.family_id is distinct from old.family_id
          or new.kind is distinct from old.kind
          or new.account_user_id is distinct from old.account_user_id) then
    raise exception 'A person''s family, kind and account cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists people_guard_identity on public.people;
create trigger people_guard_identity
  before update on public.people
  for each row execute function public.people_guard_identity();

-- 2. Backfill a Family and a self Person for every existing Account ----------

do $$
declare
  p record;
  fam uuid;
begin
  for p in
    select pr.id as user_id, pr.email, u.raw_user_meta_data as meta
    from public.profiles pr
    join auth.users u on u.id = pr.id
    where not exists (
      select 1 from public.people x where x.account_user_id = pr.id and x.kind = 'self'
    )
  loop
    insert into public.families (created_by) values (p.user_id) returning id into fam;
    insert into public.family_members (family_id, user_id, role) values (fam, p.user_id, 'owner');
    insert into public.people (family_id, kind, account_user_id, display_name, created_by)
    values (
      fam,
      'self',
      p.user_id,
      left(coalesce(
        nullif(p.meta ->> 'given_name', ''),
        nullif(split_part(p.meta ->> 'full_name', ' ', 1), ''),
        nullif(split_part(p.email, '@', 1), ''),
        'Me'
      ), 40),
      p.user_id
    );
  end loop;
end;
$$;

-- 3. person_id on the wardrobe tables ---------------------------------------

alter table public.clothing_items
  add column if not exists person_id uuid references public.people (id) on delete cascade;
alter table public.combinations
  add column if not exists person_id uuid references public.people (id) on delete cascade;
alter table public.daily_plans
  add column if not exists person_id uuid references public.people (id) on delete cascade;
alter table public.shopping_suggestions
  add column if not exists person_id uuid references public.people (id) on delete cascade;

update public.clothing_items t set person_id = s.id
from public.people s
where s.kind = 'self' and s.account_user_id = t.user_id and t.person_id is null;

update public.combinations t set person_id = s.id
from public.people s
where s.kind = 'self' and s.account_user_id = t.user_id and t.person_id is null;

update public.daily_plans t set person_id = s.id
from public.people s
where s.kind = 'self' and s.account_user_id = t.user_id and t.person_id is null;

update public.shopping_suggestions t set person_id = s.id
from public.people s
where s.kind = 'self' and s.account_user_id = t.user_id and t.person_id is null;

alter table public.clothing_items alter column person_id set not null;
alter table public.combinations alter column person_id set not null;
alter table public.daily_plans alter column person_id set not null;
alter table public.shopping_suggestions alter column person_id set not null;

-- 4. Outfits can never mix People (docs/adr/0001) ----------------------------

-- Added only once: the outfit foreign keys below depend on it, so it is never
-- dropped and re-created on a re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clothing_items_id_person_key'
      and conrelid = 'public.clothing_items'::regclass
  ) then
    alter table public.clothing_items
      add constraint clothing_items_id_person_key unique (id, person_id);
  end if;
end;
$$;

alter table public.combinations drop constraint if exists combinations_top_person_fk;
alter table public.combinations
  add constraint combinations_top_person_fk foreign key (top_id, person_id)
  references public.clothing_items (id, person_id) on delete cascade;
alter table public.combinations drop constraint if exists combinations_bottom_person_fk;
alter table public.combinations
  add constraint combinations_bottom_person_fk foreign key (bottom_id, person_id)
  references public.clothing_items (id, person_id) on delete cascade;
alter table public.combinations drop constraint if exists combinations_shoes_person_fk;
alter table public.combinations
  add constraint combinations_shoes_person_fk foreign key (shoes_id, person_id)
  references public.clothing_items (id, person_id) on delete cascade;
alter table public.combinations drop constraint if exists combinations_outerwear_person_fk;
alter table public.combinations
  add constraint combinations_outerwear_person_fk foreign key (outerwear_id, person_id)
  references public.clothing_items (id, person_id) on delete cascade;
alter table public.combinations drop constraint if exists combinations_watch_person_fk;
alter table public.combinations
  add constraint combinations_watch_person_fk foreign key (watch_id, person_id)
  references public.clothing_items (id, person_id) on delete cascade;

create or replace function public.combinations_same_person_accessories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (
    select 1
    from unnest(new.accessory_ids) as a(id)
    where not exists (
      select 1 from public.clothing_items ci
      where ci.id = a.id and ci.person_id = new.person_id
    )
  ) then
    raise exception 'An outfit''s accessories must belong to the same person';
  end if;
  return new;
end;
$$;

drop trigger if exists combinations_same_person_accessories on public.combinations;
create trigger combinations_same_person_accessories
  before insert or update of accessory_ids, person_id on public.combinations
  for each row execute function public.combinations_same_person_accessories();

drop index if exists public.combinations_unique_tuple_idx;
create unique index combinations_unique_tuple_idx
  on public.combinations (
    person_id, top_id, bottom_id, shoes_id,
    coalesce(outerwear_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(watch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    accessory_ids
  );

create index if not exists combinations_person_overall_idx
  on public.combinations (person_id, overall_score desc) where not hidden;
create index if not exists clothing_items_person_category_idx
  on public.clothing_items (person_id, category) where not archived;
create index if not exists shopping_suggestions_person_idx
  on public.shopping_suggestions (person_id, status);

alter table public.daily_plans
  drop constraint if exists daily_plans_user_id_plan_date_occasion_key;
alter table public.daily_plans
  drop constraint if exists daily_plans_person_date_occasion_key;
alter table public.daily_plans
  add constraint daily_plans_person_date_occasion_key unique (person_id, plan_date, occasion);

-- 5. Access by Person ---------------------------------------------------------

create or replace function public.can_edit_person(pid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.people p
    where p.id = pid
      and (
        (p.kind = 'self' and p.account_user_id = auth.uid())
        or (
          p.kind = 'managed'
          and exists (
            select 1 from public.family_members m
            where m.family_id = p.family_id
              and m.user_id = auth.uid()
              and m.role in ('owner', 'manager')
          )
        )
      )
  );
$$;

-- Same as editing for now; 1.6.0 lets linked Family members view shared People.
create or replace function public.can_view_person(pid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.can_edit_person(pid);
$$;

create or replace function public.is_family_manager(fid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid() and m.role in ('owner', 'manager')
  );
$$;

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members m
    where m.family_id = fid and m.user_id = auth.uid()
  );
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.people enable row level security;

drop policy if exists "Members read their family" on public.families;
create policy "Members read their family"
  on public.families for select
  using (public.is_family_member(id));

drop policy if exists "Managers rename their family" on public.families;
create policy "Managers rename their family"
  on public.families for update
  using (public.is_family_manager(id))
  with check (public.is_family_manager(id));

drop policy if exists "Members read memberships" on public.family_members;
create policy "Members read memberships"
  on public.family_members for select
  using (public.is_family_member(family_id));

drop policy if exists "Editors read people" on public.people;
create policy "Editors read people"
  on public.people for select
  using (public.can_view_person(id));

drop policy if exists "Managers add managed people" on public.people;
create policy "Managers add managed people"
  on public.people for insert
  with check (
    kind = 'managed'
    and account_user_id is null
    and created_by = auth.uid()
    and public.is_approved()
    and public.is_family_manager(family_id)
  );

drop policy if exists "Editors update people" on public.people;
create policy "Editors update people"
  on public.people for update
  using (public.can_edit_person(id))
  with check (public.can_edit_person(id));

drop policy if exists "Managers delete managed people" on public.people;
create policy "Managers delete managed people"
  on public.people for delete
  using (kind = 'managed' and public.can_edit_person(id));

-- Wardrobe tables: replace the per-Account policies with per-Person ones.
-- New rows need an approved Account writing as itself, for a Person it may edit.

drop policy if exists "Users read own items" on public.clothing_items;
drop policy if exists "Approved users insert own items" on public.clothing_items;
drop policy if exists "Users update own items" on public.clothing_items;
drop policy if exists "Users delete own items" on public.clothing_items;
drop policy if exists "Users manage own items" on public.clothing_items;
drop policy if exists "Read pieces of viewable people" on public.clothing_items;
drop policy if exists "Approved editors add pieces" on public.clothing_items;
drop policy if exists "Editors update pieces" on public.clothing_items;
drop policy if exists "Editors delete pieces" on public.clothing_items;

create policy "Read pieces of viewable people"
  on public.clothing_items for select
  using (public.can_view_person(person_id));
create policy "Approved editors add pieces"
  on public.clothing_items for insert
  with check (
    user_id = auth.uid() and public.is_approved() and public.can_edit_person(person_id)
  );
create policy "Editors update pieces"
  on public.clothing_items for update
  using (public.can_edit_person(person_id))
  with check (public.can_edit_person(person_id));
create policy "Editors delete pieces"
  on public.clothing_items for delete
  using (public.can_edit_person(person_id));

drop policy if exists "Users manage own combinations" on public.combinations;
drop policy if exists "Editors manage outfits" on public.combinations;
drop policy if exists "Editors read outfits" on public.combinations;
drop policy if exists "Approved editors add outfits" on public.combinations;
drop policy if exists "Editors update outfits" on public.combinations;
drop policy if exists "Editors delete outfits" on public.combinations;
create policy "Editors read outfits"
  on public.combinations for select
  using (public.can_view_person(person_id));
create policy "Approved editors add outfits"
  on public.combinations for insert
  with check (
    user_id = auth.uid() and public.is_approved() and public.can_edit_person(person_id)
  );
create policy "Editors update outfits"
  on public.combinations for update
  using (public.can_edit_person(person_id))
  with check (public.can_edit_person(person_id));
create policy "Editors delete outfits"
  on public.combinations for delete
  using (public.can_edit_person(person_id));

drop policy if exists "Users manage own plans" on public.daily_plans;
drop policy if exists "Editors manage plans" on public.daily_plans;
drop policy if exists "Editors read plans" on public.daily_plans;
drop policy if exists "Approved editors add plans" on public.daily_plans;
drop policy if exists "Editors update plans" on public.daily_plans;
drop policy if exists "Editors delete plans" on public.daily_plans;
create policy "Editors read plans"
  on public.daily_plans for select
  using (public.can_view_person(person_id));
create policy "Approved editors add plans"
  on public.daily_plans for insert
  with check (
    user_id = auth.uid() and public.is_approved() and public.can_edit_person(person_id)
  );
create policy "Editors update plans"
  on public.daily_plans for update
  using (public.can_edit_person(person_id))
  with check (public.can_edit_person(person_id));
create policy "Editors delete plans"
  on public.daily_plans for delete
  using (public.can_edit_person(person_id));

drop policy if exists "Users manage own suggestions" on public.shopping_suggestions;
drop policy if exists "Editors manage suggestions" on public.shopping_suggestions;
drop policy if exists "Editors read suggestions" on public.shopping_suggestions;
drop policy if exists "Approved editors add suggestions" on public.shopping_suggestions;
drop policy if exists "Editors update suggestions" on public.shopping_suggestions;
drop policy if exists "Editors delete suggestions" on public.shopping_suggestions;
create policy "Editors read suggestions"
  on public.shopping_suggestions for select
  using (public.can_view_person(person_id));
create policy "Approved editors add suggestions"
  on public.shopping_suggestions for insert
  with check (
    user_id = auth.uid() and public.is_approved() and public.can_edit_person(person_id)
  );
create policy "Editors update suggestions"
  on public.shopping_suggestions for update
  using (public.can_edit_person(person_id))
  with check (public.can_edit_person(person_id));
create policy "Editors delete suggestions"
  on public.shopping_suggestions for delete
  using (public.can_edit_person(person_id));

-- user_id records the Account that created a row; an update can never change it.
create or replace function public.keep_row_creator()
returns trigger
language plpgsql
as $$
begin
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists clothing_items_keep_creator on public.clothing_items;
create trigger clothing_items_keep_creator before update on public.clothing_items
  for each row execute function public.keep_row_creator();
drop trigger if exists combinations_keep_creator on public.combinations;
create trigger combinations_keep_creator before update on public.combinations
  for each row execute function public.keep_row_creator();
drop trigger if exists daily_plans_keep_creator on public.daily_plans;
create trigger daily_plans_keep_creator before update on public.daily_plans
  for each row execute function public.keep_row_creator();
drop trigger if exists shopping_suggestions_keep_creator on public.shopping_suggestions;
create trigger shopping_suggestions_keep_creator before update on public.shopping_suggestions
  for each row execute function public.keep_row_creator();

-- 6. New sign-ups: profile, Family and self Person ---------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  fam uuid;
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email));
  insert into public.families (created_by) values (new.id) returning id into fam;
  insert into public.family_members (family_id, user_id, role) values (fam, new.id, 'owner');
  insert into public.people (family_id, kind, account_user_id, display_name, created_by)
  values (
    fam,
    'self',
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'given_name', ''),
      nullif(split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Me'
    ), 40),
    new.id
  );
  return new;
end;
$$;

-- 7. Storage: {uploader}/{person}/{piece}.webp -------------------------------
-- The existing policies (0006/0007) still cover the uploader's own folder.
-- These add access by the Person in the second folder, so a Managed person's
-- photos stay reachable for every editor (and after a future hand-over).

drop policy if exists "Editors read person photos" on storage.objects;
create policy "Editors read person photos"
  on storage.objects for select
  using (
    bucket_id = 'wardrobe'
    and case
      when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_view_person(((storage.foldername(name))[2])::uuid)
      else false
    end
  );

drop policy if exists "Editors update person photos" on storage.objects;
create policy "Editors update person photos"
  on storage.objects for update
  using (
    bucket_id = 'wardrobe'
    and case
      when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_edit_person(((storage.foldername(name))[2])::uuid)
      else false
    end
  );

drop policy if exists "Editors delete person photos" on storage.objects;
create policy "Editors delete person photos"
  on storage.objects for delete
  using (
    bucket_id = 'wardrobe'
    and case
      when (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.can_edit_person(((storage.foldername(name))[2])::uuid)
      else false
    end
  );

commit;
