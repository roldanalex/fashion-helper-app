-- User profile, 1:1 with auth.users, created automatically on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gender text,
  age_range text,
  height_cm int,
  weight_kg int,
  body_shape text,
  skin_tone text,
  skin_undertone text,
  hair_color text,
  eye_color text,
  color_season text,
  preferred_formality int check (preferred_formality between 1 and 10),
  style_preferences text[] not null default '{}',
  lifestyle_tags text[] not null default '{}',
  home_location text,
  home_lat double precision,
  home_lon double precision,
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create an empty profile row for every new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
