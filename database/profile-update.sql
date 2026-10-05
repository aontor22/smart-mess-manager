-- Smart Mess Manager - secure self-service profile update
-- Run once in Supabase Dashboard > SQL Editor for existing deployments.
-- Safe to re-run.
--
-- This RPC allows an authenticated mess member to update ONLY their own
-- name and phone inside the shared workspace JSON. Room, role, membership
-- status, meal access and all financial collections remain unchanged.

create or replace function public.update_own_mess_profile(
  p_mess_id uuid,
  p_name text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_state jsonb;
  v_next_state jsonb;
  v_member_found boolean := false;
  v_updated_at timestamptz := now();
  v_updated_at_text text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_name = '' then
    raise exception 'Name is required';
  end if;

  if not exists (
    select 1
    from public.mess_memberships
    where mess_id = p_mess_id
      and user_id = v_user_id
      and status = 'active'
  ) then
    raise exception 'Active mess membership required';
  end if;

  select state
  into v_state
  from public.mess_workspaces
  where id = p_mess_id
  for update;

  if v_state is null then
    raise exception 'Mess workspace not found';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(v_state->'members', '[]'::jsonb)) as member
    where member->>'messId' = p_mess_id::text
      and member->>'userId' = v_user_id::text
  ) into v_member_found;

  if not v_member_found then
    raise exception 'Linked member profile not found';
  end if;

  v_next_state := jsonb_set(
    v_state,
    '{members}',
    coalesce(
      (
        select jsonb_agg(
          case
            when member->>'messId' = p_mess_id::text
              and member->>'userId' = v_user_id::text
            then member || jsonb_build_object('name', v_name, 'phone', v_phone)
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

  v_next_state := jsonb_set(
    v_next_state,
    '{users}',
    coalesce(
      (
        select jsonb_agg(
          case
            when app_user->>'id' = v_user_id::text
            then app_user || jsonb_build_object('name', v_name, 'phone', v_phone)
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
  set state = v_next_state
  where id = p_mess_id;

  return jsonb_build_object(
    'state', v_next_state,
    'updated_at', v_updated_at_text
  );
end;
$$;

revoke all on function public.update_own_mess_profile(uuid, text, text) from public;
grant execute on function public.update_own_mess_profile(uuid, text, text) to authenticated;
