-- Smart Mess Manager - Supabase schema v3
-- Run this whole file in Supabase Dashboard > SQL Editor.
-- Safe to re-run: tables/policies/functions are created or replaced idempotently.
--
-- v3 adds:
--   1) shared mess workspaces
--   2) one active mess membership per authenticated account
--   3) unique join codes (Mess IDs)
--   4) secure RPCs for create/join/rotate/manager transfer
--   5) legacy app_states retained only so existing v2 users can auto-migrate

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Legacy v2 table. New shared-mess sync uses mess_workspaces instead.
create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.mess_workspaces (
  id uuid primary key,
  join_code text not null unique,
  name text not null default 'My Mess',
  manager_user_id uuid not null references auth.users(id) on delete restrict,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mess_workspaces_join_code_format
    check (join_code ~ '^SMM-[A-Z2-9]{8}$')
);

create table if not exists public.mess_memberships (
  mess_id uuid not null references public.mess_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at timestamptz not null default now(),
  primary key (mess_id, user_id),
  constraint one_mess_per_account unique (user_id)
);

create index if not exists mess_memberships_mess_id_idx
  on public.mess_memberships(mess_id);

create index if not exists mess_workspaces_manager_idx
  on public.mess_workspaces(manager_user_id);

alter table public.profiles enable row level security;
alter table public.app_states enable row level security;
alter table public.mess_workspaces enable row level security;
alter table public.mess_memberships enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.app_states from anon;
revoke all on table public.mess_workspaces from anon;
revoke all on table public.mess_memberships from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.app_states to authenticated;
grant select, update on table public.mess_workspaces to authenticated;
grant select on table public.mess_memberships to authenticated;

-- Profiles -------------------------------------------------------------------
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Legacy app state ------------------------------------------------------------
drop policy if exists "Users can view own app state" on public.app_states;
drop policy if exists "Users can insert own app state" on public.app_states;
drop policy if exists "Users can update own app state" on public.app_states;

create policy "Users can view own app state"
on public.app_states for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own app state"
on public.app_states for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own app state"
on public.app_states for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Shared workspace access -----------------------------------------------------
-- A user can read/update only the workspace for which they have an active
-- membership. The join code itself is never exposed by an unrestricted lookup;
-- joining happens through the RPC below.
drop policy if exists "Members can view own mess workspace" on public.mess_workspaces;
drop policy if exists "Members can update own mess workspace" on public.mess_workspaces;

create policy "Members can view own mess workspace"
on public.mess_workspaces for select
to authenticated
using (
  exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = mess_workspaces.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

create policy "Members can update own mess workspace"
on public.mess_workspaces for update
to authenticated
using (
  exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = mess_workspaces.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = mess_workspaces.id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  )
);

-- Accounts can read only their own membership row. Create/join/role changes
-- are performed only through security-definer RPCs below.
drop policy if exists "Users can view own mess membership" on public.mess_memberships;

create policy "Users can view own mess membership"
on public.mess_memberships for select
to authenticated
using (user_id = auth.uid());

-- Timestamp helper ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_app_states_updated_at on public.app_states;
create trigger set_app_states_updated_at
before update on public.app_states
for each row execute function public.set_updated_at();

drop trigger if exists set_mess_workspaces_updated_at on public.mess_workspaces;
create trigger set_mess_workspaces_updated_at
before update on public.mess_workspaces
for each row execute function public.set_updated_at();

-- Members can update the shared JSON snapshot (needed for member notices and
-- client-side automation), but they cannot change workspace identity, join code,
-- or manager ownership directly. Those fields are manager-only RPC operations.
create or replace function public.guard_mess_workspace_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.manager_user_id then
    if new.join_code is distinct from old.join_code
      or new.manager_user_id is distinct from old.manager_user_id
      or new.name is distinct from old.name then
      raise exception 'Only the manager can change protected mess settings';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_mess_workspace_identity on public.mess_workspaces;
create trigger guard_mess_workspace_identity
before update on public.mess_workspaces
for each row execute function public.guard_mess_workspace_identity();

-- Create mess -----------------------------------------------------------------
create or replace function public.create_mess_workspace(
  p_mess_id uuid,
  p_join_code text,
  p_name text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(p_join_code));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.mess_memberships where user_id = v_user_id) then
    raise exception 'This account is already linked to a mess';
  end if;

  if v_code !~ '^SMM-[A-Z2-9]{8}$' then
    raise exception 'Invalid Mess ID format';
  end if;

  insert into public.mess_workspaces (
    id,
    join_code,
    name,
    manager_user_id,
    state
  ) values (
    p_mess_id,
    v_code,
    coalesce(nullif(trim(p_name), ''), 'My Mess'),
    v_user_id,
    coalesce(p_state, '{}'::jsonb)
  );

  insert into public.mess_memberships (mess_id, user_id, role, status)
  values (p_mess_id, v_user_id, 'manager', 'active');

  return jsonb_build_object(
    'mess_id', p_mess_id,
    'join_code', v_code,
    'role', 'manager'
  );
exception
  when unique_violation then
    raise exception 'Mess ID collision. Please try again';
end;
$$;

-- Join mess -------------------------------------------------------------------
create or replace function public.join_mess_by_code(p_join_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mess_id uuid;
  v_code text := upper(trim(p_join_code));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.mess_memberships where user_id = v_user_id) then
    raise exception 'This account is already linked to a mess';
  end if;

  select id
  into v_mess_id
  from public.mess_workspaces
  where join_code = v_code;

  if v_mess_id is null then
    raise exception 'Invalid Mess ID';
  end if;

  insert into public.mess_memberships (mess_id, user_id, role, status)
  values (v_mess_id, v_user_id, 'member', 'active');

  return jsonb_build_object(
    'mess_id', v_mess_id,
    'join_code', v_code,
    'role', 'member'
  );
end;
$$;

-- Rotate join code ------------------------------------------------------------
create or replace function public.rotate_mess_join_code(
  p_mess_id uuid,
  p_join_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(p_join_code));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.mess_workspaces
    where id = p_mess_id and manager_user_id = v_user_id
  ) then
    raise exception 'Only the manager can change the Mess ID';
  end if;

  if v_code !~ '^SMM-[A-Z2-9]{8}$' then
    raise exception 'Invalid Mess ID format';
  end if;

  update public.mess_workspaces
  set join_code = v_code
  where id = p_mess_id;

  return jsonb_build_object('mess_id', p_mess_id, 'join_code', v_code);
exception
  when unique_violation then
    raise exception 'Mess ID collision. Please try again';
end;
$$;

-- Transfer manager ------------------------------------------------------------
create or replace function public.transfer_mess_manager(
  p_mess_id uuid,
  p_new_manager_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.mess_workspaces
    where id = p_mess_id and manager_user_id = v_user_id
  ) then
    raise exception 'Only the current manager can transfer manager access';
  end if;

  if not exists (
    select 1 from public.mess_memberships
    where mess_id = p_mess_id
      and user_id = p_new_manager_user_id
      and status = 'active'
  ) then
    raise exception 'The selected member has not joined this mess with an active account';
  end if;

  update public.mess_memberships
  set role = case
    when user_id = p_new_manager_user_id then 'manager'
    else 'member'
  end
  where mess_id = p_mess_id;

  update public.mess_workspaces
  set manager_user_id = p_new_manager_user_id
  where id = p_mess_id;

  return jsonb_build_object(
    'mess_id', p_mess_id,
    'manager_user_id', p_new_manager_user_id
  );
end;
$$;

revoke all on function public.create_mess_workspace(uuid, text, text, jsonb) from public;
revoke all on function public.join_mess_by_code(text) from public;
revoke all on function public.rotate_mess_join_code(uuid, text) from public;
revoke all on function public.transfer_mess_manager(uuid, uuid) from public;

grant execute on function public.create_mess_workspace(uuid, text, text, jsonb) to authenticated;
grant execute on function public.join_mess_by_code(text) to authenticated;
grant execute on function public.rotate_mess_join_code(uuid, text) to authenticated;
grant execute on function public.transfer_mess_manager(uuid, uuid) to authenticated;
