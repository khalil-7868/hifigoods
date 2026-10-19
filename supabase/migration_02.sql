-- =============================================================================
-- HiFiGoods — Migration 02
-- 1) expenses.category: enum -> free text (allow custom labels like "Lunch")
-- 2) avatars storage bucket (public) + owner-scoped write policies
-- 3) delete_current_user(): let a signed-in user delete their own account
-- Run AFTER schema.sql. Safe to re-run.
-- =============================================================================

-- ---- 1) Free-text expense category -----------------------------------------
alter table public.expenses alter column category drop default;

-- Convert enum column to text (existing values are preserved as their labels).
alter table public.expenses
  alter column category type text using category::text;

alter table public.expenses alter column category set default 'Misc';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_category_len'
  ) then
    alter table public.expenses
      add constraint expenses_category_len
      check (char_length(btrim(category)) between 1 and 40);
  end if;
end$$;

-- (The public.expense_category enum type is now unused but left in place.)

-- ---- 2) Avatars bucket (public read, owner write) --------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- 3) Self-service account deletion --------------------------------------
-- Deleting the auth.users row cascades to profiles, vehicles, routes, expenses
-- via the ON DELETE CASCADE foreign keys defined in schema.sql.
create or replace function public.delete_current_user()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;

-- =============================================================================
-- Done.
-- =============================================================================
