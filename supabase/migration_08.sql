-- =============================================================================
-- HiFiGoods — Migration 08: Mechanics (workshops) on monthly maintenance
--
-- Adds a `mechanics` directory (the workshop / ustaad who services a vehicle)
-- and links each monthly maintenance fee to one, so you can see who was paid
-- what per vehicle per month.
--
-- Run AFTER migration_07.sql. Safe to re-run.
-- =============================================================================

create table if not exists public.mechanics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  workshop    text,
  phone       text,
  city        text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint mechanics_user_name_unique unique (user_id, name)
);

comment on table public.mechanics is
  'Workshops / mechanics who service vehicles. Linked from maintenance_fees.';

create index if not exists idx_mechanics_user_id on public.mechanics (user_id);

drop trigger if exists set_mechanics_updated_at on public.mechanics;
create trigger set_mechanics_updated_at
  before update on public.mechanics
  for each row execute function public.handle_updated_at();

-- Link a monthly fee to the mechanic who did the work.
alter table public.maintenance_fees
  add column if not exists mechanic_id uuid
  references public.mechanics (id) on delete set null;

create index if not exists idx_maintenance_fees_mechanic_id
  on public.maintenance_fees (mechanic_id);

-- ---- RLS -------------------------------------------------------------------
alter table public.mechanics enable row level security;

drop policy if exists "mechanics_select_own" on public.mechanics;
create policy "mechanics_select_own"
  on public.mechanics for select using (auth.uid() = user_id);

drop policy if exists "mechanics_insert_own" on public.mechanics;
create policy "mechanics_insert_own"
  on public.mechanics for insert with check (auth.uid() = user_id);

drop policy if exists "mechanics_update_own" on public.mechanics;
create policy "mechanics_update_own"
  on public.mechanics for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mechanics_delete_own" on public.mechanics;
create policy "mechanics_delete_own"
  on public.mechanics for delete using (auth.uid() = user_id);

-- =============================================================================
-- Done.
-- =============================================================================
