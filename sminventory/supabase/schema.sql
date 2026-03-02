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

-- No RLS on households — a household with no members is invisible
-- and useless anyway. All real security lives on household_members and items.
alter table households disable row level security;

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
-- GRANTS
-- ============================================================

grant insert, select, update, delete on households        to authenticated;
grant insert, select, update, delete on household_members to authenticated;
grant insert, select, update, delete on items             to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY — household_members
-- ============================================================

alter table household_members enable row level security;

-- Non-recursive: users can only see their own membership rows
create policy "members can view their own membership"
  on household_members for select
  using (user_id = auth.uid());

-- Max 10 members per household, invite code must not be expired
create policy "authenticated users can join household"
  on household_members for insert
  with check (
    user_id = auth.uid() and
    (
      select count(*) from household_members
      where household_id = household_members.household_id
    ) < 10 and
    (
      select invite_expires_at from households
      where id = household_members.household_id
    ) > now()
  );

create policy "members can update their own record"
  on household_members for update
  using (user_id = auth.uid());

create policy "members can leave household"
  on household_members for delete
  using (user_id = auth.uid());

-- ============================================================
-- ROW LEVEL SECURITY — items
-- ============================================================

alter table items enable row level security;

create policy "household members can view items"
  on items for select
  using (
    household_id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );

create policy "household members can insert items"
  on items for insert
  with check (
    household_id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );

create policy "household members can update items"
  on items for update
  using (
    household_id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );

create policy "household members can delete items"
  on items for delete
  using (
    household_id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );