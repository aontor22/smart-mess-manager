-- Smart Mess Manager - Phase 2 security / RLS hardening
-- Existing deployments: run this file once in Supabase SQL Editor.
-- Safe to re-run.
--
-- Goals:
--   1) authenticated members can READ only their own mess workspace
--   2) direct UPDATE on mess_workspaces is blocked for authenticated clients
--   3) only the manager can replace the shared workspace snapshot
--   4) joining a mess safely links/adds only the caller's member record
--   5) self-service profile updates remain limited to own name + phone
--   6) manager transfer updates both membership rows and JSON state atomically

create extension if not exists pgcrypto;

alter table public.profiles enable row level security;
alter table public.app_states enable row level security;
alter table public.mess_workspaces enable row level security;
alter table public.mess_memberships enable row level security;

-- Remove broad table UPDATE, then grant only the columns an authorized manager
-- may save. This remains backward-compatible with the previous manager client
-- during rollout while preventing members from changing the shared snapshot.
revoke update on table public.mess_workspaces from authenticated;
grant update (name, state) on table public.mess_workspaces to authenticated;

drop policy if exists "Members can update own mess workspace" on public.mess_workspaces;
drop policy if exists "Managers can update own mess workspace" on public.mess_workspaces;

-- Active members can still read only their own mess workspace.
drop policy if exists "Members can view own mess workspace" on public.mess_workspaces;
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

-- Backward-compatible manager UPDATE boundary. Regular members fail this RLS
-- policy even if they manually call PostgREST. Protected identity columns are
-- also excluded by the column-level grant above.
create policy "Managers can update own mess workspace"
on public.mess_workspaces for update
to authenticated
using (
  manager_user_id = auth.uid()
  and exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = mess_workspaces.id
      and membership.user_id = auth.uid()
      and membership.role = 'manager'
      and membership.status = 'active'
  )
)
with check (
  manager_user_id = auth.uid()
  and exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = mess_workspaces.id
      and membership.user_id = auth.uid()
      and membership.role = 'manager'
      and membership.status = 'active'
  )
);

-- Manager-only full workspace save --------------------------------------------
create or replace function public.manager_update_mess_workspace(
  p_mess_id uuid,
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
  v_name text := coalesce(nullif(trim(p_name), ''), 'My Mess');
  v_join_code text;
  v_manager_user_id uuid;
  v_state jsonb := coalesce(p_state, '{}'::jsonb);
  v_next_state jsonb;
  v_updated_at timestamptz := now();
  v_updated_at_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace.join_code, workspace.manager_user_id
  into v_join_code, v_manager_user_id
  from public.mess_workspaces workspace
  where workspace.id = p_mess_id
  for update;

  if v_manager_user_id is null then
    raise exception 'Mess workspace not found';
  end if;

  if v_manager_user_id <> v_user_id or not exists (
    select 1
    from public.mess_memberships membership
    where membership.mess_id = p_mess_id
      and membership.user_id = v_user_id
      and membership.role = 'manager'
      and membership.status = 'active'
  ) then
    raise exception 'Only the active manager can update mess data';
  end if;

  -- Keep identity fields canonical even if a browser snapshot was tampered with.
  v_next_state := jsonb_set(v_state, '{activeMessId}', to_jsonb(p_mess_id::text), true);

  if jsonb_typeof(coalesce(v_next_state->'messes', '[]'::jsonb)) = 'array' then
    v_next_state := jsonb_set(
      v_next_state,
      '{messes}',
      coalesce(
        (
          select jsonb_agg(
            case
              when mess->>'id' = p_mess_id::text then
                mess || jsonb_build_object(
                  'name', v_name,
                  'joinCode', v_join_code,
                  'managerUserId', v_manager_user_id::text
                )
              else mess
            end
            order by ord
          )
          from jsonb_array_elements(coalesce(v_next_state->'messes', '[]'::jsonb))
            with ordinality as mess_row(mess, ord)
        ),
        '[]'::jsonb
      ),
      true
    );
  end if;

  v_updated_at_text := to_char(
    v_updated_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  v_next_state := jsonb_set(
    v_next_state,
    '{syncMeta}',
    coalesce(v_next_state->'syncMeta', '{}'::jsonb) || jsonb_build_object(
      'updatedAt', v_updated_at_text,
      'lastSyncedAt', v_updated_at_text,
      'lastSyncSource', 'supabase',
      'pendingSync', false
    ),
    true
  );

  update public.mess_workspaces
  set name = v_name,
      state = v_next_state,
      updated_at = v_updated_at
  where id = p_mess_id;

  return jsonb_build_object(
    'state', v_next_state,
    'updated_at', v_updated_at_text
  );
end;
$$;

revoke all on function public.manager_update_mess_workspace(uuid, text, jsonb) from public;
grant execute on function public.manager_update_mess_workspace(uuid, text, jsonb) to authenticated;

-- Safe join: membership + own JSON member attachment happen in one transaction.
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
  v_state jsonb;
  v_next_state jsonb;
  v_member_found boolean := false;
  v_user_found boolean := false;
  v_profile_name text;
  v_email text;
  v_phone text;
  v_member_name text;
  v_member_id text;
  v_updated_at timestamptz := now();
  v_updated_at_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.mess_memberships where user_id = v_user_id) then
    raise exception 'This account is already linked to a mess';
  end if;

  select id, state
  into v_mess_id, v_state
  from public.mess_workspaces
  where join_code = v_code
  for update;

  if v_mess_id is null then
    raise exception 'Invalid Mess ID';
  end if;

  select full_name, email, phone
  into v_profile_name, v_email, v_phone
  from public.profiles
  where id = v_user_id;

  v_email := coalesce(nullif(trim(v_email), ''), nullif(trim(auth.jwt()->>'email'), ''));
  v_member_name := coalesce(
    nullif(trim(v_profile_name), ''),
    nullif(split_part(coalesce(v_email, ''), '@', 1), ''),
    'Member'
  );
  v_phone := coalesce(trim(v_phone), '');
  v_state := coalesce(v_state, '{}'::jsonb);

  insert into public.mess_memberships (mess_id, user_id, role, status)
  values (v_mess_id, v_user_id, 'member', 'active');

  select exists (
    select 1
    from jsonb_array_elements(coalesce(v_state->'members', '[]'::jsonb)) as member
    where member->>'userId' = v_user_id::text
       or (
         v_email is not null
         and lower(coalesce(member->>'email', '')) = lower(v_email)
       )
  ) into v_member_found;

  if v_member_found then
    v_next_state := jsonb_set(
      v_state,
      '{members}',
      coalesce(
        (
          select jsonb_agg(
            case
              when member->>'userId' = v_user_id::text
                or (
                  v_email is not null
                  and lower(coalesce(member->>'email', '')) = lower(v_email)
                )
              then member || jsonb_build_object(
                'userId', v_user_id::text,
                'email', coalesce(v_email, member->>'email', ''),
                'phone', case
                  when coalesce(member->>'phone', '') = '' then v_phone
                  else member->>'phone'
                end,
                'status', 'active',
                'role', 'member'
              )
              else member
            end
            order by ord
          )
          from jsonb_array_elements(coalesce(v_state->'members', '[]'::jsonb))
            with ordinality as member_row(member, ord)
        ),
        '[]'::jsonb
      ),
      true
    );
  else
    v_member_id := gen_random_uuid()::text;
    v_next_state := jsonb_set(
      v_state,
      '{members}',
      coalesce(v_state->'members', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'id', v_member_id,
          'messId', v_mess_id::text,
          'userId', v_user_id::text,
          'name', v_member_name,
          'email', coalesce(v_email, ''),
          'phone', v_phone,
          'roomNo', '',
          'role', 'member',
          'joinDate', current_date::text,
          'status', 'active',
          'mealStatus', 'active',
          'autoMealSuspended', false,
          'dueSince', null,
          'paymentWarningSentAt', null,
          'mealSuspendedAt', null
        )
      ),
      true
    );
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(v_next_state->'users', '[]'::jsonb)) as app_user
    where app_user->>'id' = v_user_id::text
       or (
         v_email is not null
         and lower(coalesce(app_user->>'email', '')) = lower(v_email)
       )
  ) into v_user_found;

  if v_user_found then
    v_next_state := jsonb_set(
      v_next_state,
      '{users}',
      coalesce(
        (
          select jsonb_agg(
            case
              when app_user->>'id' = v_user_id::text
                or (
                  v_email is not null
                  and lower(coalesce(app_user->>'email', '')) = lower(v_email)
                )
              then app_user || jsonb_build_object(
                'id', v_user_id::text,
                'name', coalesce(nullif(app_user->>'name', ''), v_member_name),
                'email', coalesce(v_email, app_user->>'email', ''),
                'phone', case
                  when coalesce(app_user->>'phone', '') = '' then v_phone
                  else app_user->>'phone'
                end
              )
              else app_user
            end
            order by ord
          )
          from jsonb_array_elements(coalesce(v_next_state->'users', '[]'::jsonb))
            with ordinality as user_row(app_user, ord)
        ),
        '[]'::jsonb
      ),
      true
    );
  else
    v_next_state := jsonb_set(
      v_next_state,
      '{users}',
      coalesce(v_next_state->'users', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'id', v_user_id::text,
          'name', v_member_name,
          'email', coalesce(v_email, ''),
          'phone', v_phone,
          'authProvider', 'supabase'
        )
      ),
      true
    );
  end if;

  v_updated_at_text := to_char(
    v_updated_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  v_next_state := jsonb_set(
    v_next_state,
    '{syncMeta}',
    coalesce(v_next_state->'syncMeta', '{}'::jsonb) || jsonb_build_object(
      'updatedAt', v_updated_at_text,
      'lastSyncedAt', v_updated_at_text,
      'lastSyncSource', 'supabase',
      'pendingSync', false
    ),
    true
  );

  update public.mess_workspaces
  set state = v_next_state,
      updated_at = v_updated_at
  where id = v_mess_id;

  return jsonb_build_object(
    'mess_id', v_mess_id,
    'join_code', v_code,
    'role', 'member',
    'state', v_next_state,
    'updated_at', v_updated_at_text
  );
end;
$$;

revoke all on function public.join_mess_by_code(text) from public;
grant execute on function public.join_mess_by_code(text) to authenticated;

-- Manager transfer: relational authority and JSON presentation change together.
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
  v_state jsonb;
  v_next_state jsonb;
  v_actor_name text := 'Manager';
  v_next_manager_name text := 'member';
  v_updated_at timestamptz := now();
  v_updated_at_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select state
  into v_state
  from public.mess_workspaces
  where id = p_mess_id
    and manager_user_id = v_user_id
  for update;

  if v_state is null then
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

  v_next_state := coalesce(v_state, '{}'::jsonb);

  if jsonb_typeof(coalesce(v_next_state->'messes', '[]'::jsonb)) = 'array' then
    v_next_state := jsonb_set(
      v_next_state,
      '{messes}',
      coalesce(
        (
          select jsonb_agg(
            case
              when mess->>'id' = p_mess_id::text
              then mess || jsonb_build_object('managerUserId', p_new_manager_user_id::text)
              else mess
            end
            order by ord
          )
          from jsonb_array_elements(coalesce(v_next_state->'messes', '[]'::jsonb))
            with ordinality as mess_row(mess, ord)
        ),
        '[]'::jsonb
      ),
      true
    );
  end if;

  if jsonb_typeof(coalesce(v_next_state->'members', '[]'::jsonb)) = 'array' then
    v_next_state := jsonb_set(
      v_next_state,
      '{members}',
      coalesce(
        (
          select jsonb_agg(
            case
              when member->>'messId' = p_mess_id::text then
                member || jsonb_build_object(
                  'role', case
                    when member->>'userId' = p_new_manager_user_id::text then 'manager'
                    else 'member'
                  end
                )
              else member
            end
            order by ord
          )
          from jsonb_array_elements(coalesce(v_next_state->'members', '[]'::jsonb))
            with ordinality as member_row(member, ord)
        ),
        '[]'::jsonb
      ),
      true
    );
  end if;

  select coalesce(member->>'name', 'Manager')
  into v_actor_name
  from jsonb_array_elements(coalesce(v_next_state->'members', '[]'::jsonb)) as member
  where member->>'userId' = v_user_id::text
  limit 1;

  select coalesce(member->>'name', 'member')
  into v_next_manager_name
  from jsonb_array_elements(coalesce(v_next_state->'members', '[]'::jsonb)) as member
  where member->>'userId' = p_new_manager_user_id::text
  limit 1;

  v_updated_at_text := to_char(
    v_updated_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  v_next_state := jsonb_set(
    v_next_state,
    '{syncMeta}',

    coalesce(v_next_state->'syncMeta', '{}'::jsonb) || jsonb_build_object(
      'updatedAt', v_updated_at_text,
      'lastSyncedAt', v_updated_at_text,
      'lastSyncSource', 'supabase',
      'pendingSync', false
    ),
    true
  );

  v_next_state := jsonb_set(
    v_next_state,
    '{activityLogs}',
    coalesce(v_next_state->'activityLogs', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'messId', p_mess_id::text,
        'actorName', coalesce(v_actor_name, 'Manager'),
        'action', 'Transferred manager role to ' || coalesce(v_next_manager_name, 'member'),
        'createdAt', v_updated_at_text
      )
    ),
    true
  );

  update public.mess_workspaces
  set manager_user_id = p_new_manager_user_id,
      state = v_next_state,
      updated_at = v_updated_at
  where id = p_mess_id;

  return jsonb_build_object(
    'mess_id', p_mess_id,
    'manager_user_id', p_new_manager_user_id,
    'state', v_next_state,
    'updated_at', v_updated_at_text
  );
end;
$$;

revoke all on function public.transfer_mess_manager(uuid, uuid) from public;
grant execute on function public.transfer_mess_manager(uuid, uuid) to authenticated;
