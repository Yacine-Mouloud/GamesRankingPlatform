-- ==============================================================================
-- Finalists of "The Big Deal"
-- ==============================================================================
-- Run after 20261005_checkin_and_groups.sql.

-- The players locked in as finalists (richest first), or null before the final.
-- Stored so the list stays fixed while balances keep moving during the final.
alter table public.settings
  add column if not exists finalist_ids uuid[];
