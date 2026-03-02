-- ============================================================
-- SCHEMA — SMInventory
-- Run this in Supabase SQL Editor
-- ============================================================

-- Households (each family group)
create table households (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  invite_code       text unique not null default substring(gen_random_uuid()::text, 1, 8),
  invite_expires_at timestamptz default (now() + interval '7 days'),
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz default now()
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
  with check (auth.uid() is not null);

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