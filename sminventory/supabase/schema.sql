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
  alert_window_days   integer default 3,
  email_alerts_enabled boolean default true
);

-- Household members (links users to households)
create table household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text default 'member' check (role in ('owner', 'member')),
  display_name text,
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
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, OLD.id, v_item_name, 'removed', auth.uid(), v_changed_by_name);
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
  if new.role         is distinct from old.role         then
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

-- Fix 2: Column-level grant — authenticated users can only update display_name
revoke update on household_members from authenticated;
grant update (display_name) on household_members to authenticated;

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
  using    (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "owner can delete household"
  on households for delete
  using (created_by = auth.uid());

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

create policy "members can update display name only"
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

-- Add custom categories/locations support to households
alter table households
  add column if not exists custom_categories text[] default null,
  add column if not exists custom_locations  text[] default null;

-- Add alert preferences to households (expiring-soon window + email digest toggle)
alter table households
  add column if not exists alert_window_days    integer default 3,
  add column if not exists email_alerts_enabled boolean default true;

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
    insert into item_history (household_id, item_id, item_name, action, changed_by, changed_by_name)
    values (v_household_id, OLD.id, v_item_name, 'removed', auth.uid(), v_changed_by_name);
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