-- ==============================================================================
-- Player wallets: individual money, personal codes, per-player transactions
-- ==============================================================================
-- Every student starts with settings.starting_capital and earns/loses money
-- individually. Additive only: teams, score_events and existing policies are
-- left untouched.

-- 1. Starting capital (same for every player)
alter table public.settings
  add column if not exists starting_capital numeric not null default 10000;

-- 2. New participant fields
--    category: ENSIA student, student from another school, or non-student guest
--    school: name of the school, only for other_school
--    study_year: 1-5; required for ensia, optional for other_school, null for guest
--    student_number: students give either a school email (.edu.dz) or this
--    code: short personal code bankers use to find a player (e.g. WS-4821)
alter table public.participants
  add column if not exists category text not null default 'ensia'
    check (category in ('ensia', 'other_school', 'guest')),
  add column if not exists school text,
  add column if not exists study_year smallint check (study_year between 1 and 5),
  add column if not exists student_number text,
  add column if not exists phone text,
  add column if not exists code text unique;

-- Generate a unique code on every insert (any supplied value is ignored)
create or replace function public.set_participant_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := 'WS-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (
      select 1 from public.participants where code = v_code
    );
  end loop;
  new.code := v_code;
  return new;
end;
$$;

drop trigger if exists participants_set_code on public.participants;
create trigger participants_set_code
  before insert on public.participants
  for each row execute function public.set_participant_code();

-- Backfill codes for participants registered before this migration
do $$
declare
  r record;
  v_code text;
begin
  for r in select id from public.participants where code is null loop
    loop
      v_code := 'WS-' || lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (
        select 1 from public.participants where code = v_code
      );
    end loop;
    update public.participants set code = v_code where id = r.id;
  end loop;
end $$;

alter table public.participants alter column code set not null;

-- 3. Transactions: one row per money movement for one player.
--    amount is signed (+ earned, - lost). batch_id groups rows created together
--    (a room-wide event, a group result) so they can be undone as one.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  amount numeric not null check (amount <> 0),
  note text,
  batch_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists transactions_participant_id_idx
  on public.transactions (participant_id);
create index if not exists transactions_batch_id_idx
  on public.transactions (batch_id);

alter table public.transactions enable row level security;

drop policy if exists "Allow public read on transactions" on public.transactions;
create policy "Allow public read on transactions"
  on public.transactions for select
  using (true);

drop policy if exists "Allow admins insert on transactions" on public.transactions;
create policy "Allow admins insert on transactions"
  on public.transactions for insert
  with check (public.is_admin());

drop policy if exists "Allow admins update on transactions" on public.transactions;
create policy "Allow admins update on transactions"
  on public.transactions for update
  using (public.is_admin());

drop policy if exists "Allow admins delete on transactions" on public.transactions;
create policy "Allow admins delete on transactions"
  on public.transactions for delete
  using (public.is_admin());

-- 4. Public views (hide email and phone from non-admins)

-- New columns must be appended to keep "create or replace" valid
create or replace view public.public_participants as
  select id, full_name, team_id, created_at, study_year, code, category, school
  from public.participants;

-- Balance per player; rank is computed by the client
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
    p.school
  from public.participants p
  cross join (select starting_capital from public.settings where id = 1) s
  left join public.transactions t on t.participant_id = p.id
  group by p.id, p.code, p.full_name, p.study_year, p.category, p.school,
    s.starting_capital;

grant select on public.public_participants to anon, authenticated, service_role;
grant select on public.player_balances to anon, authenticated, service_role;

-- 5. Registration function: the only way a phone gets its own id and code back
--    (anonymous users cannot read the participants table).
create or replace function public.register_participant(
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_category text default 'ensia',
  p_study_year int default null,
  p_school text default null,
  p_student_number text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_category text := coalesce(p_category, 'ensia');
  v_year int := p_study_year;
  v_school text := nullif(trim(coalesce(p_school, '')), '');
  v_student_number text := nullif(trim(coalesce(p_student_number, '')), '');
  v_id uuid;
  v_code text;
begin
  if not public.is_admin() and not exists (
    select 1 from public.settings
    where id = 1
      and game_status = 'setup'
      and now() >= registration_opens_at
  ) then
    raise exception 'Registration is not open.';
  end if;

  if v_name = '' then
    raise exception 'Full name is required.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required.';
  end if;
  if v_category not in ('ensia', 'other_school', 'guest') then
    raise exception 'Unknown participant category.';
  end if;
  if v_year is not null and v_year not between 1 and 5 then
    raise exception 'Study year must be between 1 and 5.';
  end if;
  if v_category = 'ensia' then
    if v_year is null then
      raise exception 'Study year is required.';
    end if;
    v_school := null;
  elsif v_category = 'other_school' then
    if v_school is null then
      raise exception 'School name is required.';
    end if;
  else
    v_year := null;
    v_school := null;
    v_student_number := null;
  end if;

  -- Students identify themselves with a school email or a student number
  if v_student_number is null then
    if v_category = 'ensia' and v_email not like '%@ensia.edu.dz' then
      raise exception 'Use your ENSIA email or enter your student number.';
    elsif v_category = 'other_school' and v_email not like '%.edu.dz' then
      raise exception 'Use your school email or enter your student number.';
    end if;
  end if;
  if exists (select 1 from public.participants where email = v_email) then
    raise exception 'This email is already registered.';
  end if;

  insert into public.participants
    (full_name, email, phone, category, study_year, school, student_number)
  values (
    v_name, v_email, v_phone, v_category, v_year, v_school, v_student_number
  )
  returning id, code into v_id, v_code;

  return json_build_object('id', v_id, 'code', v_code);
end;
$$;

grant execute on function
  public.register_participant(text, text, text, text, int, text, text)
  to anon, authenticated;

-- 6. Realtime for live balances
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

alter table public.transactions replica identity full;
