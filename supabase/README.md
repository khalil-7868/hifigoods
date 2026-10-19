# Database setup

Run these in the **Supabase SQL editor, in this order**. Every script is
idempotent, so re-running one is safe.

| # | File | What it adds |
|---|------|--------------|
| 1 | `schema.sql` | Core tables: `profiles`, `vehicles`, `routes`, `expenses`, RLS, indexes, receipts bucket |
| 2 | `migration_02.sql` | Free-text expense categories, public `avatars` bucket, `delete_current_user()` |
| 3 | `migration_03.sql` | `routes.parent_route_id` — sub-routes / trip legs |
| 4 | `migration_04.sql` | Backfills missing `profiles` rows, re-asserts the signup trigger |
| 5 | `migration_05.sql` | `parties`, `party_payments`, `brokers`, `drivers`, `driver_advances`, `tyres`, `vehicle_owners` + route/vehicle columns |

## How to tell which one you still need

The app translates schema errors into the migration that fixes them, e.g.:

> Your database is missing the sub-routes (route legs) schema.
> Run supabase/migration_03.sql in the Supabase SQL editor.

## Verify everything applied

```sql
-- should return: parent_route_id, party_id, driver_id, broker_id,
-- broker_commission_type, broker_commission_value
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'routes'
  and column_name in ('parent_route_id','party_id','driver_id','broker_id',
                      'broker_commission_type','broker_commission_value');

-- should return 7 rows
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('parties','party_payments','brokers','drivers',
                     'driver_advances','tyres','vehicle_owners');

-- should return 0 (every auth user has a profile)
select count(*) from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```
