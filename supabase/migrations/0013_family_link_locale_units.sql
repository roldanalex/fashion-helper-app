-- 1.5.2 — Family link, language and separate units.
--
-- 1. Profiles: language (locale) and a unit per measurement (weight, height;
--    the existing `units` column stays the temperature unit).
-- 2. Family link: invite another approved Account into your Family as a
--    manager (edits the Managed people) or a viewer (sees them). Each member
--    chooses whether the Family may see their own wardrobe (share_self).
-- 3. Viewing widens: Family members can see the Family's Managed people and
--    the members who share themselves. Editing is unchanged. The app reads
--    every wardrobe through src/lib/wardrobe, scoped to one Person, so wider
--    viewing never leaks into anyone's own pages (docs/adr/0001).
-- 4. Storage: photos of a Person you may view are readable, including the
--    older {account}/{piece}.webp paths; a piece's photo must sit in its
--    creator's folder.
-- 5. Plans and shopping suggestions stay with the people who may edit.
-- 6. Family functions are callable by signed-in Accounts only.
--
-- Run in the Supabase SQL Editor after 0012. Safe to run more than once.

begin;

-- 1. Language and units -------------------------------------------------------

alter table public.profiles
  add column if not exists locale text not null default 'en',
  add column if not exists weight_unit text,
  add column if not exists height_unit text;

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
  add constraint profiles_locale_check check (locale in ('en', 'es', 'pt-BR', 'fr', 'it'));
alter table public.profiles drop constraint if exists profiles_weight_unit_check;
alter table public.profiles
  add constraint profiles_weight_unit_check check (weight_unit is null or weight_unit in ('kg', 'lb'));
alter table public.profiles drop constraint if exists profiles_height_unit_check;
alter table public.profiles
  add constraint profiles_height_unit_check check (height_unit is null or height_unit in ('cm', 'ftin'));

-- Existing accounts keep what they see today: weight and height followed `units`.
update public.profiles
set weight_unit = coalesce(weight_unit, case when units = 'imperial' then 'lb' else 'kg' end),
    height_unit = coalesce(height_unit, case when units = 'imperial' then 'ftin' else 'cm' end);

comment on column public.profiles.units is 'Temperature unit: metric = °C, imperial = °F';
comment on column public.profiles.locale is 'App and AI language: en | es | pt-BR | fr | it';

-- 2. Family link --------------------------------------------------------------

-- Added once. On that first run the owner's own wardrobe joins their Family;
-- re-running never re-shares an owner who has since gone private.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'family_members' and column_name = 'share_self'
  ) then
    alter table public.family_members add column share_self boolean not null default false;
    update public.family_members set share_self = true where role = 'owner';
  end if;
end;
$$;

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'manager' check (role in ('manager', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, email)
);

alter table public.family_invites enable row level security;

drop policy if exists "Managers and invitees read invites" on public.family_invites;
create policy "Managers and invitees read invites"
  on public.family_invites for select
  using (public.is_family_manager(family_id) or email = lower(auth.jwt() ->> 'email'));
-- Writes go through the functions below only.

/** Invite an approved Account by email into a Family the caller manages. */
create or replace function public.invite_to_family(fid uuid, invitee_email text, invite_role text default 'manager')
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  em text := lower(trim(invitee_email));
  new_id uuid;
begin
  if not public.is_family_manager(fid) then
    raise exception 'not_manager';
  end if;
  if invite_role not in ('manager', 'viewer') then
    raise exception 'bad_role';
  end if;
  if em = lower(auth.jwt() ->> 'email') then
    raise exception 'self_invite';
  end if;
  -- Approval is checked when the invite is accepted, not here, so inviting
  -- never reveals whether an email has access to the app.
  if exists (
    select 1 from public.family_members m
    join public.profiles pr on pr.id = m.user_id
    where m.family_id = fid and pr.email = em
  ) then
    raise exception 'already_member';
  end if;
  if (select count(*) from public.family_members where family_id = fid) >= 8 then
    raise exception 'family_full';
  end if;
  insert into public.family_invites (family_id, email, role, invited_by)
  values (fid, em, invite_role, auth.uid())
  on conflict (family_id, email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now()
  returning id into new_id;
  return new_id;
end;
$$;

/** Accept an invite addressed to the caller's email. */
create or replace function public.accept_family_invite(invite_id uuid, share boolean default false)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  inv public.family_invites;
begin
  select * into inv from public.family_invites where id = invite_id;
  if inv.id is null or inv.email <> lower(auth.jwt() ->> 'email') then
    raise exception 'invite_not_found';
  end if;
  if not public.is_approved() then
    raise exception 'not_approved';
  end if;
  if exists (select 1 from public.family_members where family_id = inv.family_id and user_id = auth.uid()) then
    delete from public.family_invites where id = invite_id;
    raise exception 'already_member';
  end if;
  if (select count(*) from public.family_members where family_id = inv.family_id) >= 8 then
    raise exception 'family_full';
  end if;
  insert into public.family_members (family_id, user_id, role, share_self)
  values (inv.family_id, auth.uid(), inv.role, coalesce(share, false));
  delete from public.family_invites where id = invite_id;
  return inv.family_id;
end;
$$;

/** Decline an invite addressed to the caller, or withdraw one as a manager. */
create or replace function public.delete_family_invite(invite_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.family_invites i
  where i.id = invite_id
    and (i.email = lower(auth.jwt() ->> 'email') or public.is_family_manager(i.family_id));
end;
$$;

/** Leave a Family you joined (an owner cannot leave their own). */
create or replace function public.leave_family(fid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid() and role = 'owner') then
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.family_members where family_id = fid and user_id = auth.uid();
end;
$$;

/** The owner removes a member (never themselves). */
create or replace function public.remove_family_member(fid uuid, member uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.family_members where family_id = fid and user_id = auth.uid() and role = 'owner') then
    raise exception 'not_owner';
  end if;
  if member = auth.uid() then
    raise exception 'owner_cannot_leave';
  end if;
  delete from public.family_members where family_id = fid and user_id = member;
end;
$$;

/** Change whether the Family may see your own wardrobe. */
create or replace function public.set_share_self(fid uuid, share boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.family_members set share_self = share where family_id = fid and user_id = auth.uid();
end;
$$;

/**
 * Families the caller belongs to, with every member's display name and role.
 * Names come from each member's self Person, which a member may not otherwise
 * be allowed to read; only the name, role and sharing flag are returned.
 */
create or replace function public.my_families()
returns table (
  family_id uuid,
  family_name text,
  my_role text,
  member_id uuid,
  member_name text,
  member_role text,
  member_shares boolean,
  member_person_id uuid,
  is_me boolean
)
language sql
stable
security definer set search_path = public
as $$
  select f.id, f.name, me.role, m.user_id, coalesce(p.display_name, 'Member'), m.role, m.share_self,
         case when m.share_self or m.user_id = auth.uid() then p.id end,
         m.user_id = auth.uid()
  from public.family_members me
  join public.families f on f.id = me.family_id
  join public.family_members m on m.family_id = f.id
  left join public.people p on p.account_user_id = m.user_id and p.kind = 'self'
  where me.user_id = auth.uid()
  order by f.created_at, (m.role = 'owner') desc, m.joined_at;
$$;

/** Invites addressed to the caller, with the inviting Family's name and owner. */
create or replace function public.my_family_invites()
returns table (invite_id uuid, family_id uuid, family_name text, owner_name text, role text, created_at timestamptz)
language sql
stable
security definer set search_path = public
as $$
  select i.id, i.family_id, f.name,
         coalesce((select p.display_name from public.family_members o
                   join public.people p on p.account_user_id = o.user_id and p.kind = 'self'
                   where o.family_id = f.id and o.role = 'owner' limit 1), 'Someone'),
         i.role, i.created_at
  from public.family_invites i
  join public.families f on f.id = i.family_id
  where i.email = lower(auth.jwt() ->> 'email');
$$;

-- 3. Wider viewing ------------------------------------------------------------

create or replace function public.can_view_person(pid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.can_edit_person(pid)
    or exists (
      select 1 from public.people p
      where p.id = pid and p.kind = 'managed' and public.is_family_member(p.family_id)
    )
    or exists (
      select 1 from public.people p
      join public.family_members fm on fm.user_id = p.account_user_id and fm.share_self
      where p.id = pid and p.kind = 'self' and public.is_family_member(fm.family_id)
    );
$$;

-- Row-based (no lookup of the row being inserted; see 0012).
drop policy if exists "Editors read people" on public.people;
create policy "Editors read people"
  on public.people for select
  using (
    (kind = 'self' and account_user_id = auth.uid())
    or (kind = 'managed' and public.is_family_member(family_id))
    or (
      kind = 'self'
      and exists (
        select 1 from public.family_members fm
        where fm.user_id = people.account_user_id and fm.share_self and public.is_family_member(fm.family_id)
      )
    )
  );

-- 4. Storage: older two-part photo paths of a Person you may view ----------------

-- A piece's photo must live in the folder of the Account that created it, so
-- nobody can point their own piece at someone else's photo to read it.
create or replace function public.clothing_items_own_photo_path()
returns trigger
language plpgsql
as $$
begin
  if new.image_url is null or split_part(new.image_url, '/', 1) <> new.user_id::text then
    raise exception 'A piece''s photo must be stored under its creator''s folder';
  end if;
  return new;
end;
$$;

drop trigger if exists clothing_items_own_photo_path on public.clothing_items;
create trigger clothing_items_own_photo_path
  before insert or update of image_url, user_id on public.clothing_items
  for each row execute function public.clothing_items_own_photo_path();

create index if not exists clothing_items_image_url_idx on public.clothing_items (image_url);

drop policy if exists "Viewers read shared photos" on storage.objects;
create policy "Viewers read shared photos"
  on storage.objects for select
  using (
    bucket_id = 'wardrobe'
    and exists (
      select 1 from public.clothing_items ci
      where ci.image_url = storage.objects.name
        and (storage.foldername(storage.objects.name))[1] = ci.user_id::text
        and public.can_view_person(ci.person_id)
    )
  );

-- 5. Privacy: sharing a wardrobe shares pieces and outfits, not plans or shopping ------
-- Day plans carry destinations; suggestions are personal. Only editors read them.

drop policy if exists "Editors read plans" on public.daily_plans;
create policy "Editors read plans"
  on public.daily_plans for select
  using (public.can_edit_person(person_id));

drop policy if exists "Editors read suggestions" on public.shopping_suggestions;
create policy "Editors read suggestions"
  on public.shopping_suggestions for select
  using (public.can_edit_person(person_id));

-- 6. Only signed-in Accounts may call the family functions -------------------------

revoke execute on function public.invite_to_family(uuid, text, text) from public, anon;
revoke execute on function public.accept_family_invite(uuid, boolean) from public, anon;
revoke execute on function public.delete_family_invite(uuid) from public, anon;
revoke execute on function public.leave_family(uuid) from public, anon;
revoke execute on function public.remove_family_member(uuid, uuid) from public, anon;
revoke execute on function public.set_share_self(uuid, boolean) from public, anon;
revoke execute on function public.my_families() from public, anon;
revoke execute on function public.my_family_invites() from public, anon;
grant execute on function public.invite_to_family(uuid, text, text) to authenticated;
grant execute on function public.accept_family_invite(uuid, boolean) to authenticated;
grant execute on function public.delete_family_invite(uuid) to authenticated;
grant execute on function public.leave_family(uuid) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
grant execute on function public.set_share_self(uuid, boolean) to authenticated;
grant execute on function public.my_families() to authenticated;
grant execute on function public.my_family_invites() to authenticated;

commit;
