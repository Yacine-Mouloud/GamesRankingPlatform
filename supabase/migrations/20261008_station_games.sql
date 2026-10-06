-- ==============================================================================
-- Games of the updated schedule: department stations added, Fail Fest removed
-- ==============================================================================
-- Run after 20261007_quiz_auto.sql. Safe to re-run.

-- Startup Fail Fest is no longer played (kept if money was recorded against it)
delete from public.games g
where g.name = 'Startup Fail Fest'
  and not exists (select 1 from public.transactions t where t.game_id = g.id);

-- One game per department station (the IT station is the quiz, "The IT Insider")
insert into public.games (name, status)
select v.name, 'upcoming'
from (
  values
    ('Events: Event in 10 Minutes'),
    ('Design: Draw & Deal'),
    ('Relex: The ER Challenge'),
    ('HR: Hire or Buy?'),
    ('Media: Color Hunting Game')
) as v(name)
where not exists (select 1 from public.games g where g.name = v.name);

-- The list is shown by created_at: put the games in the order of the day.
-- Games not named here (added by hand) keep their place after these.
update public.games g
set created_at = base.first_created + v.ord * interval '1 millisecond'
from (
  values
    (1, 'Sell Me This Pen'),
    (2, 'Market Crash Musical Chairs'),
    (3, 'Events: Event in 10 Minutes'),
    (4, 'Design: Draw & Deal'),
    (5, 'Relex: The ER Challenge'),
    (6, 'HR: Hire or Buy?'),
    (7, 'The IT Insider'),
    (8, 'Media: Color Hunting Game'),
    (9, 'The Market Crash'),
    (10, 'Final: The Mystery Pitch'),
    (11, 'Final: The Negotiation Duel'),
    (12, 'Final: All In or Fold')
) as v(ord, name),
  (select min(created_at) as first_created from public.games) as base
where g.name = v.name;
