-- ==============================================================================
-- Check-in at the event + temporary groups per round
-- ==============================================================================
-- Run after 20261004_start_game_and_games.sql. Safe to re-run.

-- 1. Check-in: from settings.checkin_opens_at, students confirm they are in
--    the room ("I'm here"). Only checked-in players are placed into groups.
alter table public.settings
  add column if not exists checkin_opens_at timestamptz not null
  default '2026-10-07 17:00:00+01';

alter table public.participants
  add column if not exists checked_in_at timestamptz;

-- Anyone who registers once check-in is open is in the room: mark them present
create or replace function public.set_participant_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.settings where id = 1 and now() >= checkin_opens_at
  ) then
    new.checked_in_at := now();
  else
    new.checked_in_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists participants_set_checkin on public.participants;
create trigger participants_set_checkin
  before insert on public.participants
  for each row execute function public.set_participant_checkin();

-- "I'm here". The phone that registered sends its participant id; any other
-- phone identifies the player by trader code or email. Returns the id and code
-- so that phone remembers the player from then on.
create or replace function public.check_in(
  p_participant_id uuid default null,
  p_identifier text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identifier text := lower(trim(coalesce(p_identifier, '')));
  v_code text;
  v_row public.participants%rowtype;
begin
  if not public.is_admin() and not exists (
    select 1 from public.settings
    where id = 1
      and game_status <> 'ended'
      and now() >= checkin_opens_at
  ) then
    raise exception 'Check-in is not open.';
  end if;

  if p_participant_id is not null then
    select * into v_row from public.participants where id = p_participant_id;
  elsif v_identifier <> '' then
    -- Accept "4821", "ws4821" and "WS-4821" as well as an email
    v_code := 'WS-' || substring(v_identifier from '^(?:ws[- ]?)?(\d{4})$');
    select * into v_row
    from public.participants
    where code = v_code or email = v_identifier
    limit 1;
  end if;

  if v_row.id is null then
    raise exception 'No registration found. Check your code or email, or register.';
  end if;

  update public.participants
  set checked_in_at = coalesce(checked_in_at, now())
  where id = v_row.id;

  return json_build_object(
    'id', v_row.id,
    'code', v_row.code,
    'name', v_row.full_name
  );
end;
$$;

grant execute on function public.check_in(uuid, text) to anon, authenticated;

-- Expose presence on the public balances view (new column appended last)
create or replace view public.player_balances as
  select
    p.id,
    p.code,
    p.full_name,
    p.study_year,
    s.starting_capital + coalesce(sum(t.amount), 0) as balance,
    count(t.id) as transaction_count,
    max(t.created_at) as last_transaction_at,
    p.category,
    p.school,
    p.checked_in_at
  from public.participants p
  cross join (select starting_capital from public.settings where id = 1) s
  left join public.transactions t on t.participant_id = p.id
  group by p.id, p.code, p.full_name, p.study_year, p.category, p.school,
    p.checked_in_at, s.starting_capital;

grant select on public.player_balances to anon, authenticated, service_role;

-- 2. Groups: a round is one grouping of the room (e.g. groups of 8 for one
--    game). Groups only say who plays together; money stays per player.
--    The current round is the most recent one.
create table if not exists public.group_rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- half is 'A' or 'B' when each group was split in two (teams 3A / 3B)
create table if not exists public.group_members (
  round_id uuid not null references public.group_rounds(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  group_number int not null check (group_number > 0),
  half text check (half in ('A', 'B')),
  primary key (round_id, participant_id)
);

alter table public.group_rounds enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "Allow public read on group_rounds" on public.group_rounds;
create policy "Allow public read on group_rounds"
  on public.group_rounds for select
  using (true);

drop policy if exists "Allow admins to manage group_rounds" on public.group_rounds;
create policy "Allow admins to manage group_rounds"
  on public.group_rounds for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Allow public read on group_members" on public.group_members;
create policy "Allow public read on group_members"
  on public.group_members for select
  using (true);

drop policy if exists "Allow admins to manage group_members" on public.group_members;
create policy "Allow admins to manage group_members"
  on public.group_members for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Realtime so phones learn their group as soon as it is published
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_rounds'
  ) then
    alter publication supabase_realtime add table public.group_rounds;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
end $$;

alter table public.group_rounds replica identity full;
alter table public.group_members replica identity full;
