-- Smart Mess Manager Supabase Schema
-- Run this in the Supabase SQL editor.

create table if not exists profiles (
  id uuid primary key,
  full_name text not null,
  email text unique not null,
  phone text,
  created_at timestamptz default now()
);

create table if not exists messes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  currency text default 'BDT',
  month text not null,
  monthly_rent numeric default 0,
  service_charge numeric default 0,
  manager_user_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists mess_members (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  user_id uuid references profiles(id),
  name text not null,
  email text,
  phone text,
  room_no text,
  role text default 'member',
  join_date date default current_date,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  member_id uuid references mess_members(id) on delete cascade,
  meal_date date not null,
  breakfast numeric default 0,
  lunch numeric default 0,
  dinner numeric default 0,
  note text,
  created_at timestamptz default now()
);

create table if not exists market_costs (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  buyer_member_id uuid references mess_members(id),
  cost_date date not null,
  amount numeric not null,
  items text,
  note text,
  created_at timestamptz default now()
);

create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  member_id uuid references mess_members(id) on delete cascade,
  deposit_date date not null,
  amount numeric not null,
  payment_method text default 'Cash',
  note text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  expense_date date not null,
  title text not null,
  category text not null,
  amount numeric not null,
  split_type text default 'shared',
  assigned_member_id uuid references mess_members(id),
  note text,
  created_at timestamptz default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  actor_name text,
  action text not null,
  created_at timestamptz default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete cascade,
  sender_name text not null,
  message text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists tolet_posts (
  id uuid primary key default gen_random_uuid(),
  mess_id uuid references messes(id) on delete set null,
  title text not null,
  location text not null,
  rent numeric not null,
  facilities text,
  contact text not null,
  available_from date,
  image_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table messes enable row level security;
alter table mess_members enable row level security;
alter table meals enable row level security;
alter table market_costs enable row level security;
alter table deposits enable row level security;
alter table expenses enable row level security;
alter table activity_logs enable row level security;
alter table notices enable row level security;
alter table tolet_posts enable row level security;
