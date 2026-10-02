-- ==============================================================================
-- Wall Street Night - Supabase Schema & Initial Data
-- ==============================================================================

-- 1. Create Tables

-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ticker text not null unique,
  starting_capital numeric not null default 100000,
  created_at timestamptz not null default now()
);

-- Games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight numeric not null default 1.0,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'done')),
  created_at timestamptz not null default now()
);

-- Participants table
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Score events table
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  type text not null check (type in ('bonus', 'penalty')),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Admins table (references Supabase auth.users)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Settings table (single-row configuration)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  is_leaderboard_accessible boolean not null default false,
  game_status text not null default 'setup' check (game_status in ('setup', 'live', 'ended')),
  registration_opens_at timestamptz not null default '2026-10-05 00:00:00+01',
  updated_at timestamptz not null default now()
);

-- 2. Public View for Participants (Hides emails from non-admins)
create or replace view public.public_participants as
  select id, full_name, team_id, created_at
  from public.participants;

-- 3. Helper Functions

-- Check if current authenticated user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- Create Equal Teams & reset score events (Moves setup -> live)
create or replace function public.create_equal_teams()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_count int;
  v_participant_count int;
  v_team_ids uuid[];
  v_participant_ids uuid[];
  v_current_status text;
  i int;
  v_assigned_team_id uuid;
begin
  -- Require admin privileges
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  -- Check current game status in settings
  select game_status into v_current_status
  from public.settings
  where id = 1;

  if v_current_status is not null and v_current_status <> 'setup' then
    raise exception 'Game already started. Teams cannot be recreated.';
  end if;

  -- Reset all score events
  delete from public.score_events where true;

  -- Get all teams ordered alphabetically by name
  select array_agg(id order by name asc)
  into v_team_ids
  from public.teams;

  v_team_count := coalesce(array_length(v_team_ids, 1), 0);
  if v_team_count = 0 then
    raise exception 'No teams found. Please add teams first.';
  end if;

  -- Get all participant IDs in random order
  select array_agg(id order by random())
  into v_participant_ids
  from public.participants;

  v_participant_count := coalesce(array_length(v_participant_ids, 1), 0);

  -- Distribute participants evenly in round-robin fashion across alphabetical teams
  if v_participant_count > 0 then
    for i in 1..v_participant_count loop
      v_assigned_team_id := v_team_ids[((i - 1) % v_team_count) + 1];
      update public.participants
      set team_id = v_assigned_team_id
      where id = v_participant_ids[i];
    end loop;
  end if;

  -- Move status from setup to live and unlock the leaderboard in settings
  insert into public.settings (id, is_leaderboard_accessible, game_status, updated_at)
  values (1, true, 'live', now())
  on conflict (id) do update
  set is_leaderboard_accessible = true, game_status = 'live', updated_at = now();

  return json_build_object(
    'success', true,
    'assigned_count', v_participant_count,
    'team_count', v_team_count
  );
end;
$$;

-- End Game function (Moves live -> ended)
create or replace function public.end_game()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
begin
  -- Require admin privileges
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  -- Check current game status
  select game_status into v_current_status
  from public.settings
  where id = 1;

  if v_current_status <> 'live' then
    raise exception 'Cannot end game: Game is not currently live.';
  end if;

  -- Move status to ended and keep leaderboard accessible
  update public.settings
  set game_status = 'ended', is_leaderboard_accessible = true, updated_at = now()
  where id = 1;

  return json_build_object(
    'success', true,
    'game_status', 'ended'
  );
end;
$$;

-- 4. Enable Row Level Security (RLS) on all tables

alter table public.teams enable row level security;
alter table public.games enable row level security;
alter table public.participants enable row level security;
alter table public.score_events enable row level security;
alter table public.admins enable row level security;
alter table public.settings enable row level security;

-- 5. Define RLS Policies

-- Teams policies
drop policy if exists "Allow public read on teams" on public.teams;
create policy "Allow public read on teams"
  on public.teams for select
  using (true);

drop policy if exists "Allow admins insert on teams" on public.teams;
create policy "Allow admins insert on teams"
  on public.teams for insert
  with check (public.is_admin());

drop policy if exists "Allow admins update on teams" on public.teams;
create policy "Allow admins update on teams"
  on public.teams for update
  using (public.is_admin());

drop policy if exists "Allow admins delete on teams" on public.teams;
create policy "Allow admins delete on teams"
  on public.teams for delete
  using (public.is_admin());

-- Games policies
drop policy if exists "Allow public read on games" on public.games;
create policy "Allow public read on games"
  on public.games for select
  using (true);

drop policy if exists "Allow admins insert on games" on public.games;
create policy "Allow admins insert on games"
  on public.games for insert
  with check (public.is_admin());

drop policy if exists "Allow admins update on games" on public.games;
create policy "Allow admins update on games"
  on public.games for update
  using (public.is_admin());

drop policy if exists "Allow admins delete on games" on public.games;
create policy "Allow admins delete on games"
  on public.games for delete
  using (public.is_admin());

-- Score Events policies
drop policy if exists "Allow public read on score_events" on public.score_events;
create policy "Allow public read on score_events"
  on public.score_events for select
  using (true);

drop policy if exists "Allow admins insert on score_events" on public.score_events;
create policy "Allow admins insert on score_events"
  on public.score_events for insert
  with check (public.is_admin());

drop policy if exists "Allow admins update on score_events" on public.score_events;
create policy "Allow admins update on score_events"
  on public.score_events for update
  using (public.is_admin());

drop policy if exists "Allow admins delete on score_events" on public.score_events;
create policy "Allow admins delete on score_events"
  on public.score_events for delete
  using (public.is_admin());

-- Participants policies
-- Registration is open from settings.registration_opens_at until the game starts.
-- Public sign-ups cannot choose a team; admins can add participants any time.
drop policy if exists "Allow anyone to register" on public.participants;
drop policy if exists "Allow registration while open" on public.participants;
create policy "Allow registration while open"
  on public.participants for insert
  with check (
    public.is_admin()
    or (
      team_id is null
      and exists (
        select 1 from public.settings
        where id = 1
          and game_status = 'setup'
          and now() >= registration_opens_at
      )
    )
  );

drop policy if exists "Allow admins to read all participants" on public.participants;
create policy "Allow admins to read all participants"
  on public.participants for select
  using (public.is_admin());

drop policy if exists "Allow admins to update participants" on public.participants;
create policy "Allow admins to update participants"
  on public.participants for update
  using (public.is_admin());

drop policy if exists "Allow admins to delete participants" on public.participants;
create policy "Allow admins to delete participants"
  on public.participants for delete
  using (public.is_admin());

-- Admins table policies
drop policy if exists "Allow users to read admin status" on public.admins;
create policy "Allow users to read admin status"
  on public.admins for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Allow admins to manage admins" on public.admins;
create policy "Allow admins to manage admins"
  on public.admins for all
  using (public.is_admin());

-- Settings policies
drop policy if exists "Allow public read on settings" on public.settings;
create policy "Allow public read on settings"
  on public.settings for select
  using (true);

drop policy if exists "Allow admins to insert settings" on public.settings;
create policy "Allow admins to insert settings"
  on public.settings for insert
  with check (public.is_admin());

drop policy if exists "Allow admins to update settings" on public.settings;
create policy "Allow admins to update settings"
  on public.settings for update
  using (public.is_admin());

-- Grant permissions to public view
grant select on public.public_participants to anon, authenticated, service_role;

-- 6. Enable Realtime Publications
-- Add tables to realtime publication if not already present
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'score_events'
  ) then
    alter publication supabase_realtime add table public.score_events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;

-- Set replica identity full to ensure realtime receives complete old/new payloads
alter table public.score_events replica identity full;
alter table public.teams replica identity full;
alter table public.games replica identity full;
alter table public.participants replica identity full;
alter table public.settings replica identity full;

-- 7. Seed Initial Data

-- Seed Settings
insert into public.settings (id, is_leaderboard_accessible, game_status)
values (1, false, 'setup')
on conflict (id) do update
set is_leaderboard_accessible = excluded.is_leaderboard_accessible,
    game_status = excluded.game_status;

-- Seed Preset Teams (8 teams)
insert into public.teams (name, ticker, starting_capital)
values
  ('Apex Capital', 'APEX', 100000),
  ('Blue Chip Syndicate', 'BLUE', 100000),
  ('Bull & Bear Co.', 'BBCO', 100000),
  ('Cash Flow Kings', 'CFKG', 100000),
  ('Golden Wolves', 'GWLF', 100000),
  ('Margin Callers', 'MRGN', 100000),
  ('The Rainmakers', 'RAIN', 100000),
  ('Venture Vultures', 'VVCO', 100000)
on conflict (name) do update
set ticker = excluded.ticker, starting_capital = excluded.starting_capital;

-- Seed Preset Games (4 games)
insert into public.games (name, weight, status)
values
  ('Market Mayhem', 1.0, 'done'),
  ('The Big Pitch', 1.5, 'live'),
  ('Capital Rush', 2.0, 'upcoming'),
  ('Bonus Bell', 2.5, 'upcoming')
on conflict do nothing;
