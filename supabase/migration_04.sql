-- =============================================================================
-- HiFiGoods — Migration 04: Repair missing profile rows
--
-- WHY: profiles rows are normally created by the on_auth_user_created trigger.
-- Any account created before that trigger existed (or if it failed) has no
-- profiles row, so saving the profile matched 0 rows and silently did nothing.
-- The app now upserts, but this backfills existing accounts so names and
-- avatars load correctly right away.
--
-- Run AFTER migration_03.sql. Safe to re-run.
-- =============================================================================

insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name'
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Re-assert the signup trigger in case it was dropped at some point.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Verify:  select count(*) from auth.users u
--            left join public.profiles p on p.id = u.id where p.id is null;
--          -- should return 0
-- =============================================================================
