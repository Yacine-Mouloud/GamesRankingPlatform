-- Registration window: opens at settings.registration_opens_at and closes
-- when the game starts (game_status leaves 'setup').
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.settings
  add column if not exists registration_opens_at timestamptz not null
  default '2026-10-05 00:00:00+01';

-- Enforce the window server-side, and stop public sign-ups from picking a team.
-- Admins can still add participants at any time.
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
