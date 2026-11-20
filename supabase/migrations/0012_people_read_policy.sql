-- 1.5.1 — Fix "new row violates row-level security policy for table people"
-- when adding a person.
--
-- Adding a person inserts the row and reads it back (INSERT … RETURNING).
-- Postgres checks the returned row against the SELECT policy. In 0011 that
-- policy called can_view_person(id), which looks the person up in the same
-- table; that lookup cannot see a row the statement is still inserting, so
-- every new person was refused. The SELECT policy now decides from the row's
-- own columns, which works for brand-new rows and is the same rule:
--   - your own self Person, or
--   - anyone in a Family you belong to (owner or manager for now; 1.6.0 adds viewers).
--
-- Run once in the Supabase SQL Editor, after 0011. Safe to run again.

begin;

drop policy if exists "Editors read people" on public.people;
create policy "Editors read people"
  on public.people for select
  using (
    (kind = 'self' and account_user_id = auth.uid())
    or (kind = 'managed' and public.is_family_manager(family_id))
  );

commit;
