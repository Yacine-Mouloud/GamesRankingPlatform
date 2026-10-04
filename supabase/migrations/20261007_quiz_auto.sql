-- ==============================================================================
-- Automatic quiz results from the Google Form
-- ==============================================================================
-- Run after 20261006_finalists.sql. Safe to re-run.
-- A script attached to the form calls submit_quiz_score() on every answer.

-- 1. Quiz settings, readable by admins only. The secret proves that a call
--    comes from the form's script; copy it from here into the script.
create table if not exists public.quiz_config (
  id int primary key default 1 check (id = 1),
  secret text not null
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  dollars_per_point numeric not null default 200 check (dollars_per_point >= 0)
);

insert into public.quiz_config (id) values (1) on conflict (id) do nothing;

-- 2. One row per player who answered: only the first answer counts
create table if not exists public.quiz_submissions (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  score numeric not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.quiz_config enable row level security;
alter table public.quiz_submissions enable row level security;

drop policy if exists "Allow admins to manage quiz_config" on public.quiz_config;
create policy "Allow admins to manage quiz_config"
  on public.quiz_config for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Allow admins to manage quiz_submissions" on public.quiz_submissions;
create policy "Allow admins to manage quiz_submissions"
  on public.quiz_submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Credit one quiz answer. Called by the form's script (with the secret) or
--    by an admin pasting results (no secret needed). Returns a status:
--    credited, duplicate (already answered) or unknown_code.
create or replace function public.submit_quiz_score(
  p_code text,
  p_score numeric,
  p_secret text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_participant_id uuid;
  v_per_point numeric;
  v_amount numeric;
  v_inserted int;
begin
  if not public.is_admin() and not exists (
    select 1 from public.quiz_config
    where id = 1 and p_secret is not null and secret = p_secret
  ) then
    raise exception 'Unauthorized.';
  end if;

  if not exists (
    select 1 from public.settings where id = 1 and game_status = 'live'
  ) then
    raise exception 'The game is not live.';
  end if;

  if p_score is null or p_score < 0 then
    raise exception 'Invalid score.';
  end if;

  -- Accept "4821", "ws4821" and "WS-4821"
  v_code := 'WS-' || substring(lower(trim(coalesce(p_code, ''))) from '^(?:ws[- ]?)?(\d{4})$');
  select id into v_participant_id from public.participants where code = v_code;
  if v_participant_id is null then
    return json_build_object('status', 'unknown_code');
  end if;

  select dollars_per_point into v_per_point from public.quiz_config where id = 1;
  v_amount := round(p_score * coalesce(v_per_point, 0));

  insert into public.quiz_submissions (participant_id, score, amount)
  values (v_participant_id, p_score, v_amount)
  on conflict (participant_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return json_build_object('status', 'duplicate');
  end if;

  if v_amount > 0 then
    insert into public.transactions (participant_id, game_id, amount, note)
    values (
      v_participant_id,
      (select id from public.games
       where name ~* 'quiz|insider' order by created_at limit 1),
      v_amount,
      'Quiz: ' || p_score || ' pts'
    );
  end if;

  return json_build_object('status', 'credited', 'amount', v_amount);
end;
$$;

grant execute on function public.submit_quiz_score(text, numeric, text)
  to anon, authenticated;
