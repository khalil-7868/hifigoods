-- =============================================================================
-- HiFiGoods — Migration 07: Broker rent settlement + Khatabook side ledger
--
--  1) broker_payments — money the broker actually pays you against leg rents.
--     A broker collects freight from the party and settles with you later, so
--     the broker carries the outstanding balance:
--         owed    = SUM(leg rent) - SUM(commission)
--         balance = owed - SUM(payments received)
--     Payments are allocated to legs oldest-first in the app to show each
--     leg as paid / part-paid / unpaid.
--
--  2) khata_contacts + khata_entries — a Khatabook-style side ledger for money
--     lent and received, kept separate from transport route profit.
--       'gave' = you gave money out  -> they owe you  (increases balance)
--       'got'  = you received money  -> reduces what they owe
--
-- Run AFTER migration_06.sql. Safe to re-run.
-- =============================================================================

-- =============================================================================
-- 1) BROKER PAYMENTS
-- =============================================================================
create table if not exists public.broker_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  broker_id   uuid not null references public.brokers (id) on delete cascade,
  amount      numeric(12, 2) not null default 0 check (amount >= 0),
  date        date not null default current_date,
  method      text not null default 'Cash',
  notes       text,
  created_at  timestamptz not null default now()
);

comment on table public.broker_payments is
  'Rent settled by a broker against the legs they arranged.';

create index if not exists idx_broker_payments_user_id   on public.broker_payments (user_id);
create index if not exists idx_broker_payments_broker_id on public.broker_payments (broker_id);
create index if not exists idx_broker_payments_date      on public.broker_payments (date desc);

-- =============================================================================
-- 2) KHATABOOK — contacts
-- =============================================================================
create table if not exists public.khata_contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  phone           text,
  opening_balance numeric(12, 2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint khata_contacts_user_name_unique unique (user_id, name)
);

create index if not exists idx_khata_contacts_user_id on public.khata_contacts (user_id);

drop trigger if exists set_khata_contacts_updated_at on public.khata_contacts;
create trigger set_khata_contacts_updated_at
  before update on public.khata_contacts
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- 3) KHATABOOK — entries
-- =============================================================================
create table if not exists public.khata_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  contact_id  uuid not null references public.khata_contacts (id) on delete cascade,
  direction   text not null check (direction in ('gave', 'got')),
  amount      numeric(12, 2) not null default 0 check (amount >= 0),
  date        date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

comment on column public.khata_entries.direction is
  '''gave'' = money out (they owe you); ''got'' = money received back.';

create index if not exists idx_khata_entries_user_id    on public.khata_entries (user_id);
create index if not exists idx_khata_entries_contact_id on public.khata_entries (contact_id);
create index if not exists idx_khata_entries_date       on public.khata_entries (date desc);

-- =============================================================================
-- 4) ROW LEVEL SECURITY
-- =============================================================================
alter table public.broker_payments enable row level security;
alter table public.khata_contacts  enable row level security;
alter table public.khata_entries   enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['broker_payments', 'khata_contacts', 'khata_entries']
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
