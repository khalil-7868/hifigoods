-- =============================================================================
-- HiFiGoods — Migration 03: Sub-routes (multi-leg trips)
--
-- A route may now have child "sub-routes" (legs). Example:
--   Main:  Rahim Yar Khan -> Rahim Yar Khan
--     Leg: Rahim Yar Khan -> Karachi     (rent 60,000)
--     Leg: Karachi        -> Lahore      (rent 80,000)
--     Leg: Lahore         -> Rahim Yar Khan (rent 55,000)
-- The main route's rent is the SUM of its legs' rent (computed in the app).
-- Run AFTER migration_02.sql. Safe to re-run.
-- =============================================================================

alter table public.routes
  add column if not exists parent_route_id uuid
  references public.routes (id) on delete cascade;

comment on column public.routes.parent_route_id is
  'NULL = main route. Otherwise this row is a leg of the referenced main route.';

create index if not exists idx_routes_parent_route_id
  on public.routes (parent_route_id);

-- A route can never be its own parent.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routes_no_self_parent'
  ) then
    alter table public.routes
      add constraint routes_no_self_parent
      check (parent_route_id is null or parent_route_id <> id);
  end if;
end$$;

-- =============================================================================
-- Note: expenses.date already defaults to current_date, so the app can omit it.
-- =============================================================================
