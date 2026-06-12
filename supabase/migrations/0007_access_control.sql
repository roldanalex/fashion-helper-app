-- Access control: sign-in is open (Google OAuth can't be restricted for
-- personal accounts), but the app is allowlist-gated. A user may enter —
-- and AI endpoints may spend money — only if their email has a row here.
--
-- BOOTSTRAP (run once, with your own email, after this migration):
--   insert into public.access_grants (email, role) values ('you@example.com', 'admin');

create table public.access_grants (
  email text primary key,
  role text not null default 'member' check (role in ('member', 'admin')),
  granted_by text,
  created_at timestamptz not null default now()
);

alter table public.access_grants enable row level security;

-- Security definer so policies can consult this table without RLS recursion.
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.access_grants
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.access_grants
    where email = lower(auth.jwt() ->> 'email') and role = 'admin'
  );
$$;

-- Everyone may check their OWN approval status.
create policy "Users read own grant"
  on public.access_grants for select
  using (email = lower(auth.jwt() ->> 'email'));

-- Admins manage all grants.
create policy "Admins manage grants"
  on public.access_grants for all
  using (public.is_admin())
  with check (public.is_admin());

-- The admin page needs to see who signed in: store email on profiles.
alter table public.profiles add column email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email));
  return new;
end;
$$;

-- Admins may list all profiles (read-only) to review pending requests.
create policy "Admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Harden writes: unapproved users cannot create items or upload photos.
drop policy "Users manage own items" on public.clothing_items;
create policy "Users read own items"
  on public.clothing_items for select
  using (auth.uid() = user_id);
create policy "Approved users insert own items"
  on public.clothing_items for insert
  with check (auth.uid() = user_id and public.is_approved());
create policy "Users update own items"
  on public.clothing_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users delete own items"
  on public.clothing_items for delete
  using (auth.uid() = user_id);

drop policy "Users upload own wardrobe images" on storage.objects;
create policy "Approved users upload own wardrobe images"
  on storage.objects for insert
  with check (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved()
  );
