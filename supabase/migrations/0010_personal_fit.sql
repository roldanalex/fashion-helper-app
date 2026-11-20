-- 1.4.0 — Personal fit.
-- Body and colouring were collected at onboarding (0001) but never used. They
-- now shape Today's ranking, the Stylist chat and Shop. This migration adds the
-- two new preferences and makes every characteristic explicitly optional.
-- Run once in the Supabase SQL Editor (or `supabase db push`). Safe to re-run.

alter table public.profiles
  add column if not exists fit_preference text,
  add column if not exists style_notes text;

alter table public.profiles
  drop constraint if exists profiles_fit_preference_check;
alter table public.profiles
  add constraint profiles_fit_preference_check
  check (fit_preference is null or fit_preference in ('slim', 'regular', 'relaxed'));

alter table public.profiles
  drop constraint if exists profiles_style_notes_length;
alter table public.profiles
  add constraint profiles_style_notes_length
  check (style_notes is null or char_length(style_notes) <= 300);

-- color_season is now written by the app from the client's colouring.
alter table public.profiles
  drop constraint if exists profiles_color_season_check;
alter table public.profiles
  add constraint profiles_color_season_check
  check (color_season is null or color_season in ('spring', 'summer', 'autumn', 'winter'));

comment on column public.profiles.fit_preference is 'slim | regular | relaxed; optional';
comment on column public.profiles.style_notes is 'Free-text notes for the stylist (<= 300 chars); optional';
comment on column public.profiles.color_season is 'Derived from skin, undertone, hair and eyes by the app; optional';
