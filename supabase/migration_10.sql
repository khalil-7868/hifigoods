-- =============================================================================
-- HiFiGoods — Migration 10: RLS init-plan optimisation + security hardening
--
--  1) Wrap every bare auth.uid() in a scalar subquery. Postgres cannot hoist a
--     volatile-looking function call out of a row loop, so `auth.uid() = user_id`
--     re-executes once per row scanned. `(select auth.uid()) = user_id` is an
--     InitPlan: evaluated ONCE per query. Identical semantics, large win as
--     tables grow. Rewritten dynamically so no policy is missed.
--  2) Pin search_path on handle_updated_at (mutable search_path warning).
--  3) Revoke public EXECUTE on handle_new_user() — it is a trigger function and
--     was callable by anon over /rest/v1/rpc/.
--  4) Drop the broad SELECT policy on the public `avatars` bucket. Public
--     buckets serve object URLs without it; the policy only enabled listing
--     every file in the bucket.
--  5) Backfill any auth user missing a profiles row.
--
-- Run AFTER migration_09.sql. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) auth.uid() init-plan rewrite
-- -----------------------------------------------------------------------------
do $$
declare
  p        record;
  new_qual text;
  new_chk  text;
  clause   text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        (qual is not null and qual like '%auth.uid()%' and qual !~* 'select auth\.uid')
        or
        (with_check is not null and with_check like '%auth.uid()%' and with_check !~* 'select auth\.uid')
      )
  loop
    new_qual := replace(p.qual,       'auth.uid()', '(select auth.uid())');
    new_chk  := replace(p.with_check, 'auth.uid()', '(select auth.uid())');

    clause := '';
    if new_qual is not null then
      clause := clause || format(' using (%s)', new_qual);
    end if;
    if new_chk is not null then
      clause := clause || format(' with check (%s)', new_chk);
    end if;

    if clause <> '' then
      execute format(
        'alter policy %I on %I.%I%s',
        p.policyname, p.schemaname, p.tablename, clause
      );
    end if;
  end loop;
end$$;

-- -----------------------------------------------------------------------------
-- 2) Pin search_path on the shared trigger function
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) handle_new_user() is a trigger fn — not a public RPC
-- -----------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- delete_current_user() stays callable by `authenticated`: the Settings page
-- Danger Zone depends on it, and it only ever deletes auth.uid()'s own row.
revoke execute on function public.delete_current_user() from public;
revoke execute on function public.delete_current_user() from anon;

-- -----------------------------------------------------------------------------
-- 4) Stop clients listing every file in the public avatars bucket
-- -----------------------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;

-- -----------------------------------------------------------------------------
-- 5) Backfill orphan profiles
-- -----------------------------------------------------------------------------
insert into public.profiles (id, full_name)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- =============================================================================
-- Verify:
--   select count(*) from pg_policies
--   where schemaname in ('public','storage')
--     and ((qual like '%auth.uid()%' and qual !~* 'select auth\.uid')
--       or (with_check like '%auth.uid()%' and with_check !~* 'select auth\.uid'));
--   -- should return 0
--
-- Remaining manual step (dashboard only, no SQL equivalent):
--   Auth → Providers → Email → enable "Leaked password protection".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6) Covering index for the FK added in migration 09. Without it, deleting a
--    mechanic (on delete set null) sequentially scans the event log.
-- -----------------------------------------------------------------------------
create index if not exists idx_maintenance_events_mechanic_id
  on public.maintenance_events (mechanic_id);
