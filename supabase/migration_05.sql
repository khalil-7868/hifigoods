-- =============================================================================
-- HiFiGoods — Migration 05: Pakistan goods-transport business features
--
--  1) parties            — clients/consignors you bill (udhaar / khata)
--  2) party_payments     — cash received against a party's balance
--  3) brokers            — adda / commission agents
--  4) drivers            — drivers you employ
--  5) driver_advances    — peshgi given per trip, returned, settled
--  6) tyres              — tyre lifecycle per vehicle
--  7) vehicle_owners     — shared/partner ownership with share %
--  + route columns: party_id, driver_id, broker + commission
--  + vehicle column: odometer (for tyre km life)
--
-- Run AFTER migration_04.sql. Safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared: updated_at trigger fn already exists as public.handle_updated_at()
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 1) PARTIES  (clients / consignors)
-- =============================================================================
create table if not exists public.parties (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  phone       text,
  city        text,
  opening_balance numeric(12, 2) not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint parties_user_name_unique unique (user_id, name)
);

comment on table public.parties is 'Clients billed for freight; balance = opening + billed - received.';

create index if not exists idx_parties_user_id on public.parties (user_id);

drop trigger if exists set_parties_updated_at on public.parties;
create trigger set_parties_updated_at
  before update on public.parties
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 2) PARTY PAYMENTS  (cash received)
-- =============================================================================
create table if not exists public.party_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  party_id    uuid not null references public.parties (id) on delete cascade,
  amount      numeric(12, 2) not null default 0 check (amount >= 0),
  date        date not null default current_date,
  method      text not null default 'Cash',
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_party_payments_user_id  on public.party_payments (user_id);
create index if not exists idx_party_payments_party_id on public.party_payments (party_id);
create index if not exists idx_party_payments_date     on public.party_payments (date desc);

-- =============================================================================
-- 3) BROKERS  (adda / commission agents)
-- =============================================================================
create table if not exists public.brokers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  phone       text,
  city        text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint brokers_user_name_unique unique (user_id, name)
);

create index if not exists idx_brokers_user_id on public.brokers (user_id);

drop trigger if exists set_brokers_updated_at on public.brokers;
create trigger set_brokers_updated_at
  before update on public.brokers
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 4) DRIVERS
-- =============================================================================
create table if not exists public.drivers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  phone       text,
  cnic        text,
  license_no  text,
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_drivers_user_id on public.drivers (user_id);

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at
  before update on public.drivers
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 5) DRIVER ADVANCES  (peshgi)
--    outstanding = amount_given - amount_returned - (expenses on linked route)
-- =============================================================================
create table if not exists public.driver_advances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  driver_id       uuid not null references public.drivers (id) on delete cascade,
  route_id        uuid references public.routes (id) on delete set null,
  amount_given    numeric(12, 2) not null default 0 check (amount_given >= 0),
  amount_returned numeric(12, 2) not null default 0 check (amount_returned >= 0),
  date            date not null default current_date,
  settled         boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_driver_advances_user_id   on public.driver_advances (user_id);
create index if not exists idx_driver_advances_driver_id on public.driver_advances (driver_id);
create index if not exists idx_driver_advances_route_id  on public.driver_advances (route_id);
create index if not exists idx_driver_advances_date      on public.driver_advances (date desc);

drop trigger if exists set_driver_advances_updated_at on public.driver_advances;
create trigger set_driver_advances_updated_at
  before update on public.driver_advances
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 6) TYRES
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tyre_status') then
    create type public.tyre_status as enum ('in_use', 'spare', 'retreaded', 'scrapped');
  end if;
end$$;

create table if not exists public.tyres (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  vehicle_id        uuid not null references public.vehicles (id) on delete cascade,
  brand             text,
  size              text,
  serial_no         text,
  position          text,
  status            public.tyre_status not null default 'in_use',
  purchase_cost     numeric(12, 2) not null default 0 check (purchase_cost >= 0),
  purchase_date     date not null default current_date,
  odometer_fitted   integer not null default 0 check (odometer_fitted >= 0),
  odometer_removed  integer check (odometer_removed >= 0),
  retread_count     integer not null default 0 check (retread_count >= 0),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tyres_odometer_order
    check (odometer_removed is null or odometer_removed >= odometer_fitted)
);

create index if not exists idx_tyres_user_id    on public.tyres (user_id);
create index if not exists idx_tyres_vehicle_id on public.tyres (vehicle_id);
create index if not exists idx_tyres_status     on public.tyres (status);

drop trigger if exists set_tyres_updated_at on public.tyres;
create trigger set_tyres_updated_at
  before update on public.tyres
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 7) VEHICLE OWNERS  (shared / partner ownership)
--    Net profit of a vehicle is split by share_percent.
-- =============================================================================
create table if not exists public.vehicle_owners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  name          text not null,
  share_percent numeric(5, 2) not null default 0
                check (share_percent >= 0 and share_percent <= 100),
  is_self       boolean not null default false,
  phone         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.vehicle_owners is
  'Partners in a vehicle. Shares should total 100%; the app validates this.';

create index if not exists idx_vehicle_owners_user_id    on public.vehicle_owners (user_id);
create index if not exists idx_vehicle_owners_vehicle_id on public.vehicle_owners (vehicle_id);

drop trigger if exists set_vehicle_owners_updated_at on public.vehicle_owners;
create trigger set_vehicle_owners_updated_at
  before update on public.vehicle_owners
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 8) ROUTE + VEHICLE COLUMNS
-- =============================================================================
alter table public.routes
  add column if not exists party_id uuid references public.parties (id) on delete set null;

alter table public.routes
  add column if not exists driver_id uuid references public.drivers (id) on delete set null;

alter table public.routes
  add column if not exists broker_id uuid references public.brokers (id) on delete set null;

-- 'fixed' = flat rupees, 'percent' = % of this route's rent.
alter table public.routes
  add column if not exists broker_commission_type text;

alter table public.routes
  add column if not exists broker_commission_value numeric(12, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'routes_broker_commission_type_check'
  ) then
    alter table public.routes
      add constraint routes_broker_commission_type_check
      check (broker_commission_type is null
             or broker_commission_type in ('fixed', 'percent'));
  end if;
end$$;

create index if not exists idx_routes_party_id  on public.routes (party_id);
create index if not exists idx_routes_driver_id on public.routes (driver_id);
create index if not exists idx_routes_broker_id on public.routes (broker_id);

-- Current odometer, used to compute tyre km life while still fitted.
alter table public.vehicles
  add column if not exists odometer integer not null default 0;

-- =============================================================================
-- 9) ROW LEVEL SECURITY — owner-only on every new table
-- =============================================================================
alter table public.parties         enable row level security;
alter table public.party_payments  enable row level security;
alter table public.brokers         enable row level security;
alter table public.drivers         enable row level security;
alter table public.driver_advances enable row level security;
alter table public.tyres           enable row level security;
alter table public.vehicle_owners  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'parties', 'party_payments', 'brokers', 'drivers',
    'driver_advances', 'tyres', 'vehicle_owners'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end$$;

-- =============================================================================
-- Done.
-- =============================================================================
