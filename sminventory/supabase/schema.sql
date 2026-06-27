-- ============================================================
-- SCHEMA — SMInventory
-- Run this in Supabase SQL Editor
-- ============================================================

-- Households (each family group)
create table households (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  invite_code         text unique not null default substring(gen_random_uuid()::text, 1, 8),
  invite_expires_at   timestamptz default (now() + interval '7 days'),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  custom_categories   text[] default null,
  custom_locations    text[] default null,
  alert_window_days   integer default 3 check (alert_window_days between 1 and 30),
  email_alerts_enabled boolean default true
);

-- Household members (links users to households)
create table household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text default 'member' check (role in ('owner', 'member')),
  display_name text,
  email_alerts_opted_in boolean default true,
  joined_at    timestamptz default now(),
  unique(household_id, user_id),
  unique(user_id)
);

-- Inventory items
create table items (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid references households(id) on delete cascade not null,
  name                text not null,
  category            text not null,
  quantity            numeric not null default 1,
  unit                text not null default 'pieces',
  expiration_date     date not null,
  location            text not null default 'Fridge',
  brand               text,
  store_bought_at     text,
  notes               text,
  added_by            uuid references auth.users(id) on delete set null,
  added_by_name       text,
  low_stock           boolean default false,
  low_stock_threshold numeric default null,
  shelf_life_days     integer default null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- ============================================================
-- ITEM HISTORY — tracks added/edited/removed events for items
-- Populated entirely by trigger below, never written to directly
-- by clients, so the log is accurate regardless of which code
-- path mutates `items`.
-- ============================================================
create table item_history (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid references households(id) on delete cascade not null,
  item_id         uuid references items(id) on delete set null,
  item_name       text not null,
  action          text not null check (action in ('added', 'edited', 'removed')),
  changes         jsonb,
  changed_by      uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at      timestamptz default now()
);

create index item_history_household_idx on item_history (household_id, created_at desc);

create or replace function log_item_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id    uuid;
  v_item_name       text;
  v_changed_by_name text;
  v_changes         jsonb := '{}'::jsonb;
begin
  v_household_id := coalesce(NEW.household_id, OLD.household_id);
  v_item_name    := coalesce(NEW.name, OLD.name);

  select display_name into v_changed_by_name
  from household_members
  where user_id = auth.uid() and household_id = v_household_id
  limit 1;

  if TG_OP = 'INSERT' then
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, NEW.id, v_item_name, 'added', auth.uid(), v_changed_by_name);
    return NEW;

  elsif TG_OP = 'UPDATE' then
    if NEW.name             is distinct from OLD.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
    end if;
    if NEW.quantity          is distinct from OLD.quantity then
      v_changes := v_changes || jsonb_build_object('quantity', jsonb_build_object('from', OLD.quantity, 'to', NEW.quantity));
    end if;
    if NEW.unit              is distinct from OLD.unit then
      v_changes := v_changes || jsonb_build_object('unit', jsonb_build_object('from', OLD.unit, 'to', NEW.unit));
    end if;
    if NEW.category          is distinct from OLD.category then
      v_changes := v_changes || jsonb_build_object('category', jsonb_build_object('from', OLD.category, 'to', NEW.category));
    end if;
    if NEW.location          is distinct from OLD.location then
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('from', OLD.location, 'to', NEW.location));
    end if;
    if NEW.expiration_date   is distinct from OLD.expiration_date then
      v_changes := v_changes || jsonb_build_object('expiration_date', jsonb_build_object('from', OLD.expiration_date, 'to', NEW.expiration_date));
    end if;
    if NEW.brand             is distinct from OLD.brand then
      v_changes := v_changes || jsonb_build_object('brand', jsonb_build_object('from', OLD.brand, 'to', NEW.brand));
    end if;
    if NEW.store_bought_at   is distinct from OLD.store_bought_at then
      v_changes := v_changes || jsonb_build_object('store_bought_at', jsonb_build_object('from', OLD.store_bought_at, 'to', NEW.store_bought_at));
    end if;
    if NEW.notes             is distinct from OLD.notes then
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('from', OLD.notes, 'to', NEW.notes));
    end if;
    if NEW.low_stock_threshold is distinct from OLD.low_stock_threshold then
      v_changes := v_changes || jsonb_build_object('low_stock_threshold', jsonb_build_object('from', OLD.low_stock_threshold, 'to', NEW.low_stock_threshold));
    end if;

    -- Skip logging no-op updates (e.g. a save with no actual field changes)
    if v_changes = '{}'::jsonb then
      return NEW;
    end if;

    insert into item_history (household_id, item_id, item_name, action, changes, changed_by, changed_by_name)
    values (v_household_id, NEW.id, v_item_name, 'edited', v_changes, auth.uid(), v_changed_by_name);
    return NEW;

  elsif TG_OP = 'DELETE' then
    -- item_id is intentionally NULL here, not OLD.id: by the time this
    -- AFTER DELETE trigger fires, the row no longer exists in `items`,
    -- so a foreign key pointing at OLD.id would always fail (23503).
    -- The item's name/identity is preserved in item_name instead.
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, null, v_item_name, 'removed', auth.uid(), v_changed_by_name);
    return OLD;
  end if;

  return null;
end;
$$;

create trigger items_log_history
  after insert or update or delete on items
  for each row execute function log_item_history();

-- ============================================================
-- Fix 2: Trigger to block changes to role/household_id on household_members
-- RLS alone cannot enforce column-level update restrictions
-- ============================================================
create or replace function prevent_membership_tampering()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- transfer_ownership() below sets this flag (transaction-local, via
  -- set_config(..., true) so it can never leak across a pooled
  -- connection's other transactions) as the one legitimate, server-
  -- checked path for a role to change. Anything else hitting this
  -- trigger with a role change is unauthorized self-promotion.
  if new.role is distinct from old.role
     and coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' then
    raise exception 'You cannot change your own role.';
  end if;
  if new.household_id is distinct from old.household_id then
    raise exception 'You cannot change your household membership directly.';
  end if;
  if new.user_id      is distinct from old.user_id      then
    raise exception 'You cannot change the user_id on a membership row.';
  end if;
  return new;
end;
$$;

create trigger enforce_membership_immutability
  before update on household_members
  for each row execute function prevent_membership_tampering();

-- ============================================================
-- SECURITY DEFINER HELPERS
-- Fix 3: Explicit search_path to prevent search_path hijacking
-- ============================================================

-- Returns the current user's household_id without triggering RLS recursion
create or replace function get_my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select household_id from household_members where user_id = auth.uid() limit 1;
$$;

-- Returns the current user's role ('owner' | 'member'). This is the single
-- source of truth for "is this person the owner" — used below instead of
-- households.created_by, so ownership checks always agree with the role
-- column the rest of the app (and the UI) already treats as authoritative.
create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select role from household_members where user_id = auth.uid() limit 1;
$$;

-- RPC to join a household by invite code — server-controlled, validates secret
-- Fix 4: Explicit checks for already-a-member and already-in-a-household
create or replace function join_household(p_invite_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household households%rowtype;
  v_count     int;
begin
  -- Check caller is not already in a household
  if exists (
    select 1 from household_members where user_id = auth.uid()
  ) then
    raise exception 'You are already a member of a household.';
  end if;

  -- Find household by invite code
  select * into v_household
  from households
  where invite_code = lower(trim(p_invite_code));

  if not found then
    raise exception 'Invalid invite code.';
  end if;

  -- Check invite hasn't expired
  if v_household.invite_expires_at < now() then
    raise exception 'This invite code has expired. Ask the household owner for a new one.';
  end if;

  -- Check member limit
  select count(*) into v_count
  from household_members
  where household_id = v_household.id;

  if v_count >= 10 then
    raise exception 'This household has reached the maximum of 10 members.';
  end if;

  -- Insert membership
  insert into household_members (household_id, user_id, role, display_name)
  values (v_household.id, auth.uid(), 'member', p_display_name);

  return v_household.id;
end;
$$;

-- RPC to create a household — server-controlled so we can enforce limits
create or replace function create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
begin
  -- Check caller is not already in a household
  if exists (
    select 1 from household_members where user_id = auth.uid()
  ) then
    raise exception 'You are already a member of a household.';
  end if;

  -- Create the household
  insert into households (name, created_by)
  values (p_name, auth.uid())
  returning id into v_household_id;

  -- Add creator as owner
  insert into household_members (household_id, user_id, role, display_name)
  values (v_household_id, auth.uid(), 'owner', p_display_name);

  return v_household_id;
end;
$$;

-- RPC to regenerate a household's invite code — owner-only. Useful any
-- time the owner wants to invalidate the current code (it leaked, or
-- after removing a member who might still remember it). remove_member()
-- below also calls this automatically.
create or replace function regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
  v_new_code     text;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can regenerate the invite code.';
  end if;

  v_new_code := substring(gen_random_uuid()::text, 1, 8);

  update households
  set invite_code = v_new_code,
      invite_expires_at = now() + interval '7 days'
  where id = v_household_id;

  return v_new_code;
end;
$$;

-- RPC to remove another member from the caller's household — owner-only,
-- and an owner cannot remove themselves this way (they'd orphan the
-- household; "leave household" already exists for that, separately, and
-- isn't changed here). Regenerates the invite code as part of removal so
-- the removed person can't immediately rejoin with a code they still have.
create or replace function remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can remove members.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself this way — leave the household instead.';
  end if;

  delete from household_members
  where user_id = p_user_id and household_id = v_household_id;

  if not found then
    raise exception 'That person is not a member of your household.';
  end if;

  perform regenerate_invite_code();
end;
$$;

-- RPC to transfer ownership to another member — only the current owner
-- can call this, and only onto someone who's actually in the household.
-- Demotes the caller to 'member' and promotes the target to 'owner' in
-- the same transaction, via the bypass flag the immutability trigger
-- checks for. There's no UI/RLS path to set this flag except from here.
create or replace function transfer_ownership(p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can transfer ownership.';
  end if;

  if p_new_owner_id = auth.uid() then
    raise exception 'You are already the owner.';
  end if;

  if not exists (
    select 1 from household_members
    where user_id = p_new_owner_id and household_id = v_household_id
  ) then
    raise exception 'That person is not a member of your household.';
  end if;

  perform set_config('app.allow_role_change', 'true', true);

  update household_members set role = 'member' where user_id = auth.uid()      and household_id = v_household_id;
  update household_members set role = 'owner'  where user_id = p_new_owner_id  and household_id = v_household_id;
end;
$$;

-- RPC to leave a household. A regular member can always leave. The owner
-- can only leave if they're the sole member (in which case the household
-- is fully cleaned up — there's no one left for it to belong to); with
-- other members present, the owner has to transfer ownership first, so
-- a household is never left without one.
create or replace function leave_household()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
  v_my_role      text;
  v_other_count  int;
begin
  select household_id, role into v_household_id, v_my_role
  from household_members
  where user_id = auth.uid()
  limit 1;

  if v_household_id is null then
    raise exception 'You are not currently in a household.';
  end if;

  if v_my_role = 'owner' then
    select count(*) into v_other_count
    from household_members
    where household_id = v_household_id and user_id <> auth.uid();

    if v_other_count > 0 then
      raise exception 'Transfer ownership to another member before leaving — a household needs an owner.';
    end if;

    -- Sole owner leaving: nothing left behind, so disband entirely.
    delete from household_members where household_id = v_household_id;
    delete from households        where id = v_household_id;
    return;
  end if;

  delete from household_members
  where user_id = auth.uid() and household_id = v_household_id;
end;
$$;

-- ============================================================
-- GRANTS
-- ============================================================

grant insert, select, update, delete on households        to authenticated;
grant insert, select, update, delete on household_members to authenticated;
grant insert, select, update, delete on items             to authenticated;
grant select on item_history                               to authenticated;
grant execute on function join_household(text, text)      to authenticated;
grant execute on function create_household(text, text)    to authenticated;
grant execute on function get_my_household_id()           to authenticated;
grant execute on function get_my_role()                   to authenticated;
grant execute on function regenerate_invite_code()         to authenticated;
grant execute on function remove_member(uuid)              to authenticated;
grant execute on function transfer_ownership(uuid)         to authenticated;
grant execute on function leave_household()                to authenticated;

-- Fix 2: Column-level grant — authenticated users can only update display_name
-- and their own email alert opt-in; role/household_id/user_id stay locked
-- down (enforced below by the immutability trigger as a second layer).
revoke update on household_members from authenticated;
grant update (display_name, email_alerts_opted_in) on household_members to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY — households
-- ============================================================

alter table households enable row level security;

create policy "household members can view"
  on households for select
  using (id = get_my_household_id());

create policy "authenticated users can create household"
  on households for insert
  with check (created_by = auth.uid());

create policy "owner can update household"
  on households for update
  using    (id = get_my_household_id() and get_my_role() = 'owner')
  with check (id = get_my_household_id() and get_my_role() = 'owner');

create policy "owner can delete household"
  on households for delete
  using (id = get_my_household_id() and get_my_role() = 'owner');

-- ============================================================
-- ROW LEVEL SECURITY — household_members
-- Fix 1: No direct INSERT allowed — all joins go through RPCs
-- ============================================================

alter table household_members enable row level security;

create policy "members can view household members"
  on household_members for select
  using (household_id = get_my_household_id());

-- Direct INSERT is blocked for regular users — RPCs use security definer
-- so they bypass RLS entirely. This policy is intentionally restrictive.
create policy "no direct insert allowed"
  on household_members for insert
  with check (false);

create policy "members can update their own profile fields"
  on household_members for update
  using    (user_id = auth.uid())
  with check (user_id = auth.uid() and household_id = get_my_household_id());

create policy "members can leave household"
  on household_members for delete
  using (user_id = auth.uid());

-- ============================================================
-- ROW LEVEL SECURITY — items
-- ============================================================

alter table items enable row level security;

create policy "household members can view items"
  on items for select
  using (household_id = get_my_household_id());

create policy "household members can insert items"
  on items for insert
  with check (household_id = get_my_household_id());

create policy "household members can update items"
  on items for update
  using     (household_id = get_my_household_id())
  with check (household_id = get_my_household_id());

create policy "household members can delete items"
  on items for delete
  using (household_id = get_my_household_id());

-- ============================================================
-- ROW LEVEL SECURITY — item_history
-- Read-only for clients — all rows are written by the
-- log_item_history() trigger (security definer), which bypasses
-- this insert policy entirely, same pattern as household_members.
-- ============================================================

alter table item_history enable row level security;

create policy "household members can view item history"
  on item_history for select
  using (household_id = get_my_household_id());

create policy "no direct insert into item history"
  on item_history for insert
  with check (false);

-- ============================================================
-- MIGRATIONS (apply these if running against an existing DB)
-- ============================================================

-- "Owner" should mean one thing: household_members.role = 'owner'. The
-- original owner-update/delete policies on households instead checked
-- created_by, which happens to always match today but isn't the same
-- field the UI uses to decide who sees Household Settings. Repointing
-- these at role removes that mismatch entirely.
create or replace function get_my_role()
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select role from household_members where user_id = auth.uid() limit 1;
$$;

drop policy if exists "owner can update household" on households;
create policy "owner can update household"
  on households for update
  using    (id = get_my_household_id() and get_my_role() = 'owner')
  with check (id = get_my_household_id() and get_my_role() = 'owner');

drop policy if exists "owner can delete household" on households;
create policy "owner can delete household"
  on households for delete
  using (id = get_my_household_id() and get_my_role() = 'owner');

grant execute on function get_my_role() to authenticated;

-- Owner-only: regenerate the household's invite code, and remove a member
-- (which also regenerates the code, so a removed member can't rejoin
-- with one they still remember).
create or replace function regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
  v_new_code     text;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can regenerate the invite code.';
  end if;

  v_new_code := substring(gen_random_uuid()::text, 1, 8);

  update households
  set invite_code = v_new_code,
      invite_expires_at = now() + interval '7 days'
  where id = v_household_id;

  return v_new_code;
end;
$$;

create or replace function remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can remove members.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself this way — leave the household instead.';
  end if;

  delete from household_members
  where user_id = p_user_id and household_id = v_household_id;

  if not found then
    raise exception 'That person is not a member of your household.';
  end if;

  perform regenerate_invite_code();
end;
$$;

grant execute on function regenerate_invite_code() to authenticated;
grant execute on function remove_member(uuid)      to authenticated;

-- Let role changes through for exactly one legitimate path: transfer_ownership()
-- below, via a transaction-local flag this trigger checks for. Replaces the
-- whole function body — same other checks (household_id/user_id immutable),
-- it does not touch existing data.
create or replace function prevent_membership_tampering()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.role is distinct from old.role
     and coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' then
    raise exception 'You cannot change your own role.';
  end if;
  if new.household_id is distinct from old.household_id then
    raise exception 'You cannot change your household membership directly.';
  end if;
  if new.user_id      is distinct from old.user_id      then
    raise exception 'You cannot change the user_id on a membership row.';
  end if;
  return new;
end;
$$;

create or replace function transfer_ownership(p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from household_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the household owner can transfer ownership.';
  end if;

  if p_new_owner_id = auth.uid() then
    raise exception 'You are already the owner.';
  end if;

  if not exists (
    select 1 from household_members
    where user_id = p_new_owner_id and household_id = v_household_id
  ) then
    raise exception 'That person is not a member of your household.';
  end if;

  perform set_config('app.allow_role_change', 'true', true);

  update household_members set role = 'member' where user_id = auth.uid()      and household_id = v_household_id;
  update household_members set role = 'owner'  where user_id = p_new_owner_id  and household_id = v_household_id;
end;
$$;

create or replace function leave_household()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id uuid;
  v_my_role      text;
  v_other_count  int;
begin
  select household_id, role into v_household_id, v_my_role
  from household_members
  where user_id = auth.uid()
  limit 1;

  if v_household_id is null then
    raise exception 'You are not currently in a household.';
  end if;

  if v_my_role = 'owner' then
    select count(*) into v_other_count
    from household_members
    where household_id = v_household_id and user_id <> auth.uid();

    if v_other_count > 0 then
      raise exception 'Transfer ownership to another member before leaving — a household needs an owner.';
    end if;

    delete from household_members where household_id = v_household_id;
    delete from households        where id = v_household_id;
    return;
  end if;

  delete from household_members
  where user_id = auth.uid() and household_id = v_household_id;
end;
$$;

grant execute on function transfer_ownership(uuid) to authenticated;
grant execute on function leave_household()        to authenticated;

-- Add custom categories/locations support to households
alter table households
  add column if not exists custom_categories text[] default null,
  add column if not exists custom_locations  text[] default null;

-- Track which store an item was bought at
alter table items
  add column if not exists store_bought_at text;

-- Add alert preferences to households (expiring-soon window + email digest toggle)
alter table households
  add column if not exists alert_window_days    integer default 3,
  add column if not exists email_alerts_enabled boolean default true;

-- Per-user opt-in/out of email alerts, layered on top of the household-wide
-- email_alerts_enabled toggle above. A member can only receive alert emails
-- when BOTH are true: the household has them on, and they haven't opted out.
alter table household_members
  add column if not exists email_alerts_opted_in boolean default true;

-- Let members self-service this column too, alongside display_name.
revoke update on household_members from authenticated;
grant update (display_name, email_alerts_opted_in) on household_members to authenticated;

-- Enforce the same 1-30 day range the UI expects, so a direct API/SQL write
-- can't set an out-of-range value and cause confusing alert/email behavior.
-- Clamp any existing bad values first so the constraint can be added cleanly.
update households
  set alert_window_days = 3
  where alert_window_days is null or alert_window_days < 1 or alert_window_days > 30;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'households_alert_window_days_check'
  ) then
    alter table households
      add constraint households_alert_window_days_check
      check (alert_window_days between 1 and 30);
  end if;
end $$;

-- ============================================================
-- Add item history tracking (added/edited/removed log)
-- Safe to run standalone against an existing database — this is
-- a brand-new table + trigger, not an alter on an existing one.
-- ============================================================

create table if not exists item_history (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid references households(id) on delete cascade not null,
  item_id         uuid references items(id) on delete set null,
  item_name       text not null,
  action          text not null check (action in ('added', 'edited', 'removed')),
  changes         jsonb,
  changed_by      uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at      timestamptz default now()
);

create index if not exists item_history_household_idx on item_history (household_id, created_at desc);

create or replace function log_item_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_household_id    uuid;
  v_item_name       text;
  v_changed_by_name text;
  v_changes         jsonb := '{}'::jsonb;
begin
  v_household_id := coalesce(NEW.household_id, OLD.household_id);
  v_item_name    := coalesce(NEW.name, OLD.name);

  select display_name into v_changed_by_name
  from household_members
  where user_id = auth.uid() and household_id = v_household_id
  limit 1;

  if TG_OP = 'INSERT' then
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, NEW.id, v_item_name, 'added', auth.uid(), v_changed_by_name);
    return NEW;

  elsif TG_OP = 'UPDATE' then
    if NEW.name               is distinct from OLD.name then
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
    end if;
    if NEW.quantity            is distinct from OLD.quantity then
      v_changes := v_changes || jsonb_build_object('quantity', jsonb_build_object('from', OLD.quantity, 'to', NEW.quantity));
    end if;
    if NEW.unit                is distinct from OLD.unit then
      v_changes := v_changes || jsonb_build_object('unit', jsonb_build_object('from', OLD.unit, 'to', NEW.unit));
    end if;
    if NEW.category            is distinct from OLD.category then
      v_changes := v_changes || jsonb_build_object('category', jsonb_build_object('from', OLD.category, 'to', NEW.category));
    end if;
    if NEW.location            is distinct from OLD.location then
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('from', OLD.location, 'to', NEW.location));
    end if;
    if NEW.expiration_date     is distinct from OLD.expiration_date then
      v_changes := v_changes || jsonb_build_object('expiration_date', jsonb_build_object('from', OLD.expiration_date, 'to', NEW.expiration_date));
    end if;
    if NEW.brand               is distinct from OLD.brand then
      v_changes := v_changes || jsonb_build_object('brand', jsonb_build_object('from', OLD.brand, 'to', NEW.brand));
    end if;
    if NEW.store_bought_at     is distinct from OLD.store_bought_at then
      v_changes := v_changes || jsonb_build_object('store_bought_at', jsonb_build_object('from', OLD.store_bought_at, 'to', NEW.store_bought_at));
    end if;
    if NEW.notes               is distinct from OLD.notes then
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('from', OLD.notes, 'to', NEW.notes));
    end if;
    if NEW.low_stock_threshold is distinct from OLD.low_stock_threshold then
      v_changes := v_changes || jsonb_build_object('low_stock_threshold', jsonb_build_object('from', OLD.low_stock_threshold, 'to', NEW.low_stock_threshold));
    end if;

    if v_changes = '{}'::jsonb then
      return NEW;
    end if;

    insert into item_history (household_id, item_id, item_name, action, changes, changed_by, changed_by_name)
    values (v_household_id, NEW.id, v_item_name, 'edited', v_changes, auth.uid(), v_changed_by_name);
    return NEW;

  elsif TG_OP = 'DELETE' then
    -- item_id is intentionally NULL here, not OLD.id: by the time this
    -- AFTER DELETE trigger fires, the row no longer exists in `items`,
    -- so a foreign key pointing at OLD.id would always fail (23503).
    -- The item's name/identity is preserved in item_name instead.
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, null, v_item_name, 'removed', auth.uid(), v_changed_by_name);
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists items_log_history on items;
create trigger items_log_history
  after insert or update or delete on items
  for each row execute function log_item_history();

grant select on item_history to authenticated;

alter table item_history enable row level security;

drop policy if exists "household members can view item history" on item_history;
create policy "household members can view item history"
  on item_history for select
  using (household_id = get_my_household_id());

drop policy if exists "no direct insert into item history" on item_history;
create policy "no direct insert into item history"
  on item_history for insert
  with check (false);

-- Backfill: items that already existed before this trigger was created
-- never got an "added" entry logged. This adds one retroactively, using
-- the item's real created_at so it doesn't look like everything was
-- just added today. Safe to re-run — skips items that already have one.
insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name, created_at)
select household_id, id, name, 'added', added_by, added_by_name, created_at
from items
where not exists (
  select 1 from item_history
  where item_history.item_id = items.id and item_history.action = 'added'
);