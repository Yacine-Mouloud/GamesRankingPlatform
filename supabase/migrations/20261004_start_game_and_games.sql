-- ==============================================================================
-- Start game without teams + the real list of games
-- ==============================================================================
-- Run after 20261003_player_wallets.sql. 

-- 1. Start Game (setup -> live): closes registration and unlocks the leaderboard.
--    Replaces create_equal_teams() in the UI; players keep individual wallets.
create or replace function public.start_game()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin privileges required';
  end if;

  select game_status into v_current_status
  from public.settings
  where id = 1;

  if v_current_status is not null and v_current_status <> 'setup' then
    raise exception 'Game already started.';
  end if;

  insert into public.settings (id, is_leaderboard_accessible, game_status, updated_at)
  values (1, true, 'live', now())
  on conflict (id) do update
  set is_leaderboard_accessible = true, game_status = 'live', updated_at = now();

  return json_build_object('success', true, 'game_status', 'live');
end;
$$;

grant execute on function public.start_game() to authenticated;

-- 2. Games: drop the placeholder games and add the games from the challenge doc. Department
--    stations are added by admins from the Games tab.
delete from public.games g
where g.name in ('Market Mayhem', 'The Big Pitch', 'Capital Rush', 'Bonus Bell')
  and not exists (select 1 from public.transactions t where t.game_id = g.id);

-- created_at is staggered so the list keeps the order of the day
insert into public.games (name, status, created_at)
select v.name, 'upcoming', now() + v.ord * interval '1 millisecond'
from (
  values
    (1, 'Sell Me This Pen'),
    (2, 'Market Crash Musical Chairs'),
    (3, 'Startup Fail Fest'),
    (4, 'Quiz'),
    (5, 'The Market Crash'),
    (6, 'Final: The Mystery Pitch'),
    (7, 'Final: The Negotiation Duel'),
    (8, 'Final: All In or Fold')
) as v(ord, name)
where not exists (select 1 from public.games g where g.name = v.name);
