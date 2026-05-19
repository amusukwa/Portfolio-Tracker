-- Run this in your Supabase project → SQL Editor

-- Stores one row per month per user
create table portfolio_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  month        text not null,                  -- e.g. "31-May-26"
  fixed_deposit  numeric(14,2) default 0,
  listed_shares  numeric(14,2) default 0,
  unit_trust     numeric(14,2) default 0,
  village_bank   numeric(14,2) default 0,
  property       numeric(14,2) default 0,
  liabilities    numeric(14,2) default 0,
  notes          text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(user_id, month)
);

-- Row-level security: users only see their own data
alter table portfolio_entries enable row level security;

create policy "Users can read own entries"
  on portfolio_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on portfolio_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on portfolio_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on portfolio_entries for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on portfolio_entries
  for each row execute function update_updated_at();
