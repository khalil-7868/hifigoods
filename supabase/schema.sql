-- =============================================================================
-- HiFiGoods — Goods Transport Management
-- Phase 1: Database Architecture (Supabase / PostgreSQL)
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor.
-- It is idempotent-friendly: safe to re-run during development.
-- Order: extensions -> tables -> indexes -> trigger (profiles) -> updated_at
--        -> RLS enable -> policies -> storage bucket + policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_status') then
    create type public.vehicle_status as enum ('active', 'idle', 'maintenance', 'retired');
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type public.expense_category as enum ('Fuel', 'Toll', 'Maintenance', 'Driver', 'Misc');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 2. Shared trigger function: keep updated_at fresh
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 3. PROFILES  (1:1 with auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  company     text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Public profile per authenticated user.';

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 4. VEHICLES
-- =============================================================================
create table if not exists public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  plate_number  text not null,
  make_model    text,
  status        public.vehicle_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- A user cannot register the same plate twice.
  constraint vehicles_user_plate_unique unique (user_id, plate_number)
);

comment on table public.vehicles is 'Fleet vehicles owned by a user.';

create index if not exists idx_vehicles_user_id    on public.vehicles (user_id);
create index if not exists idx_vehicles_status     on public.vehicles (status);
create index if not exists idx_vehicles_created_at on public.vehicles (created_at desc);

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 5. ROUTES / TRIPS
-- =============================================================================
create table if not exists public.routes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  origin       text not null,
  destination  text not null,
  start_date   date not null default current_date,
  end_date     date,
  revenue      numeric(12, 2) not null default 0 check (revenue >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint routes_date_order check (end_date is null or end_date >= start_date)
);

comment on table public.routes is 'A trip run by a vehicle; revenue is trip income.';
comment on column public.routes.user_id is 'Denormalized owner for fast RLS without joins.';

create index if not exists idx_routes_user_id     on public.routes (user_id);
create index if not exists idx_routes_vehicle_id  on public.routes (vehicle_id);
create index if not exists idx_routes_start_date  on public.routes (start_date desc);
create index if not exists idx_routes_end_date    on public.routes (end_date desc);
-- Composite index for the common "this vehicle, in this period" dashboard query.
create index if not exists idx_routes_vehicle_start on public.routes (vehicle_id, start_date desc);

drop trigger if exists set_routes_updated_at on public.routes;
create trigger set_routes_updated_at
  before update on public.routes
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 6. EXPENSES
-- =============================================================================
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  route_id     uuid not null references public.routes (id) on delete cascade,
  category     public.expense_category not null default 'Misc',
  amount       numeric(12, 2) not null default 0 check (amount >= 0),
  receipt_url  text,
  notes        text,
  date         date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.expenses is 'Individual expenses attached to a route (cascade deletes with route).';
comment on column public.expenses.receipt_url is 'Path/URL to an image or PDF receipt in Supabase Storage; nullable.';

create index if not exists idx_expenses_user_id   on public.expenses (user_id);
create index if not exists idx_expenses_route_id  on public.expenses (route_id);
create index if not exists idx_expenses_category  on public.expenses (category);
create index if not exists idx_expenses_date      on public.expenses (date desc);
-- Composite index for period-scoped reporting by category.
create index if not exists idx_expenses_route_date on public.expenses (route_id, date desc);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes   enable row level security;
alter table public.expenses enable row level security;

-- ---- PROFILES ---------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is normally handled by the trigger; allow self-insert as a fallback.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---- VEHICLES ---------------------------------------------------------------
drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own"
  on public.vehicles for select
  using (auth.uid() = user_id);

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own"
  on public.vehicles for insert
  with check (auth.uid() = user_id);

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own"
  on public.vehicles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "vehicles_delete_own" on public.vehicles;
create policy "vehicles_delete_own"
  on public.vehicles for delete
  using (auth.uid() = user_id);

-- ---- ROUTES -----------------------------------------------------------------
drop policy if exists "routes_select_own" on public.routes;
create policy "routes_select_own"
  on public.routes for select
  using (auth.uid() = user_id);

drop policy if exists "routes_insert_own" on public.routes;
create policy "routes_insert_own"
  on public.routes for insert
  with check (
    auth.uid() = user_id
    -- Ensure the referenced vehicle also belongs to the user.
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.user_id = auth.uid()
    )
  );

drop policy if exists "routes_update_own" on public.routes;
create policy "routes_update_own"
  on public.routes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "routes_delete_own" on public.routes;
create policy "routes_delete_own"
  on public.routes for delete
  using (auth.uid() = user_id);

-- ---- EXPENSES ---------------------------------------------------------------
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
  on public.expenses for select
  using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
  on public.expenses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.routes r
      where r.id = route_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- 8. STORAGE — receipts bucket (private) + owner-scoped policies
-- =============================================================================
-- Files are stored under a per-user prefix: <auth.uid()>/<route_id>/<file>
-- The first path segment must equal the user's id for any access.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
create policy "receipts_select_own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_update_own" on storage.objects;
create policy "receipts_update_own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- Done. Schema is ready for the application layer (Phase 2).
-- =============================================================================
