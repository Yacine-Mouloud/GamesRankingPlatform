-- ==============================================================================
-- Quiz payout: a fixed amount for answering + dollars per point
-- ==============================================================================
-- Run after 20261008_station_games.sql.
-- Payout = base_amount + score * dollars_per_point  ($200 + $120 per point)

alter table public.quiz_config
  add column if not exists base_amount numeric not null default 200
    check (base_amount >= 0);

alter table public.quiz_config alter column dollars_per_point set default 120;

-- Move from the first default ($200 per point) to the agreed rate. A rate
-- changed by hand in Admin > Events is left alone.
update public.quiz_config set dollars_per_point = 120 where dollars_per_point = 200;

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
  v_base numeric;
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

  select dollars_per_point, base_amount into v_per_point, v_base
  from public.quiz_config where id = 1;
  v_amount := round(coalesce(v_base, 0) + p_score * coalesce(v_per_point, 0));

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
