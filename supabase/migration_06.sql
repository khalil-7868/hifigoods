-- =============================================================================
-- HiFiGoods — Migration 06: Diesel entries + monthly maintenance fees
--
--  1) expenses.kind — 'road' or 'diesel'. Diesel rows carry slip/pump/rate/qty
--     so a long trip can record many fills from different pumps. `amount`
--     stays the total for BOTH kinds, so every existing rollup keeps working.
--  2) maintenance_fees — one amount per vehicle per month, counted as an
--     expense in dashboard and reports for that month.
--
-- Run AFTER migration_05.sql. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Diesel fields on expenses
-- -----------------------------------------------------------------------------
alter table public.expenses
  add column if not exists kind text not null default 'road';

alter table public.expenses add column if not exists slip_no   text;
alter table public.expenses add column if not exists pump_name text;
alter table public.expenses add column if not exists rate      numeric(10, 2);
alter table public.expenses add column if not exists quantity  numeric(10, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_kind_check'
  ) then
    alter table public.expenses
      add constraint expenses_kind_check check (kind in ('road', 'diesel'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'expenses_diesel_positive'
  ) then
    alter table public.expenses
      add constraint expenses_diesel_positive
      check (
        (rate is null or rate >= 0) and (quantity is null or quantity >= 0)
      );
  end if;
end$$;

comment on column public.expenses.kind is
  '''road'' = general trip expense; ''diesel'' = a fuel fill with rate/qty.';
comment on column public.expenses.quantity is 'Litres filled (diesel only).';
comment on column public.expenses.rate is 'Price per litre (diesel only).';

create index if not exists idx_expenses_kind on public.expenses (kind);

-- Existing rows are road expenses; make any old "Fuel" rows discoverable but
-- do NOT auto-convert them, since they have no rate/qty data.

-- =============================================================================
-- 2) MONTHLY MAINTENANCE FEES
--    One row per vehicle per month. `month` is stored as the first of the month.
-- =============================================================================
create table if not exists public.maintenance_fees (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  month       date not null,
  amount      numeric(12, 2) not null default 0 check (amount >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint maintenance_fees_month_start check (extract(day from month) = 1),
  constraint maintenance_fees_unique unique (vehicle_id, month)
);

comment on table public.maintenance_fees is
  'Monthly running/maintenance cost per vehicle; counted as an expense.';

create index if not exists idx_maintenance_fees_user_id    on public.maintenance_fees (user_id);
create index if not exists idx_maintenance_fees_vehicle_id on public.maintenance_fees (vehicle_id);
create index if not exists idx_maintenance_fees_month      on public.maintenance_fees (month desc);

drop trigger if exists set_maintenance_fees_updated_at on public.maintenance_fees;
create trigger set_maintenance_fees_updated_at
  before update on public.maintenance_fees
  for each row execute function public.handle_updated_at();

alter table public.maintenance_fees enable row level security;

drop policy if exists "maintenance_fees_select_own" on public.maintenance_fees;
create policy "maintenance_fees_select_own"
  on public.maintenance_fees for select using (auth.uid() = user_id);

drop policy if exists "maintenance_fees_insert_own" on public.maintenance_fees;
create policy "maintenance_fees_insert_own"
  on public.maintenance_fees for insert with check (auth.uid() = user_id);

drop policy if exists "maintenance_fees_update_own" on public.maintenance_fees;
create policy "maintenance_fees_update_own"
  on public.maintenance_fees for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "maintenance_fees_delete_own" on public.maintenance_fees;
create policy "maintenance_fees_delete_own"
  on public.maintenance_fees for delete using (auth.uid() = user_id);

-- =============================================================================
-- Done.
-- =============================================================================
