-- =============================================================================
-- HiFiGoods — Migration 09: Leg cargo details, per-leg broker settlement,
-- vehicle repair/maintenance events
--
--  1) routes.material / weight / notes — optional cargo details on a leg
--     (or a plain route), hidden behind a "more details" toggle in the UI.
--  2) broker_payments.route_id — tags a payment to one specific leg, so a
--     leg's paid/pending status can be toggled directly instead of only
--     being derived from pooled lump-sum settlements.
--  3) maintenance_events — a repair/event log per vehicle (tyre change,
--     engine repair, service, etc.), additive to maintenance_fees (the
--     existing one-fee-per-month sheet).
--
-- Run AFTER migration_08.sql. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Leg cargo details
-- -----------------------------------------------------------------------------
alter table public.routes add column if not exists material text;
alter table public.routes add column if not exists weight   numeric(10, 2);
alter table public.routes add column if not exists notes    text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routes_weight_positive'
  ) then
    alter table public.routes
      add constraint routes_weight_positive check (weight is null or weight >= 0);
  end if;
end$$;

comment on column public.routes.material is 'Optional cargo material carried on this leg.';
comment on column public.routes.weight is 'Optional cargo weight in kg for this leg.';
comment on column public.routes.notes is 'Optional free-text notes for this leg.';

-- -----------------------------------------------------------------------------
-- 2) Per-leg broker settlement tag
-- -----------------------------------------------------------------------------
alter table public.broker_payments
  add column if not exists route_id uuid references public.routes (id) on delete set null;

comment on column public.broker_payments.route_id is
  'When set, this payment fully settles one specific leg (paid/pending toggle). '
  'NULL = a generic lump-sum payment, pooled and allocated oldest-leg-first.';

create index if not exists idx_broker_payments_route_id on public.broker_payments (route_id);

-- =============================================================================
-- 3) VEHICLE REPAIR / MAINTENANCE EVENTS
--    A running log per vehicle: tyre changes, engine repair, service, etc.
--    Separate from maintenance_fees (one lump monthly fee per vehicle).
-- =============================================================================
create table if not exists public.maintenance_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  mechanic_id  uuid references public.mechanics (id) on delete set null,
  type         text not null,
  cost         numeric(12, 2) not null default 0 check (cost >= 0),
  date         date not null default current_date,
  odometer     numeric(10, 2),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint maintenance_events_type_len check (char_length(btrim(type)) between 1 and 60)
);

comment on table public.maintenance_events is
  'Repair/service event log per vehicle (tyre change, engine repair, etc.), additive to maintenance_fees.';

create index if not exists idx_maintenance_events_user_id    on public.maintenance_events (user_id);
create index if not exists idx_maintenance_events_vehicle_id on public.maintenance_events (vehicle_id);
create index if not exists idx_maintenance_events_date       on public.maintenance_events (date desc);

drop trigger if exists set_maintenance_events_updated_at on public.maintenance_events;
create trigger set_maintenance_events_updated_at
  before update on public.maintenance_events
  for each row execute function public.handle_updated_at();

alter table public.maintenance_events enable row level security;

drop policy if exists "maintenance_events_select_own" on public.maintenance_events;
create policy "maintenance_events_select_own"
  on public.maintenance_events for select using (auth.uid() = user_id);

drop policy if exists "maintenance_events_insert_own" on public.maintenance_events;
create policy "maintenance_events_insert_own"
  on public.maintenance_events for insert with check (auth.uid() = user_id);

drop policy if exists "maintenance_events_update_own" on public.maintenance_events;
create policy "maintenance_events_update_own"
  on public.maintenance_events for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "maintenance_events_delete_own" on public.maintenance_events;
create policy "maintenance_events_delete_own"
  on public.maintenance_events for delete using (auth.uid() = user_id);

-- =============================================================================
-- Done.
-- =============================================================================
