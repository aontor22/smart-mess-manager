-- Smart Mess Manager - Phase 2 authorization verification
-- Read-only checks. Safe to run after database/security-rls-hardening.sql.

-- 1) Authenticated should have table SELECT. Broad table UPDATE is revoked.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'mess_workspaces'
  and grantee = 'authenticated'
order by privilege_type;

-- Only name/state receive column-level UPDATE for the manager-only RLS path.
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'mess_workspaces'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;

-- 2) Workspace policies. Expect member SELECT + manager-only UPDATE; no broad member UPDATE policy.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'mess_workspaces'
order by policyname;

-- 3) Security RPCs must exist.
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'manager_update_mess_workspace',
    'join_mess_by_code',
    'transfer_mess_manager',
    'update_own_mess_profile'
  )
order by routine_name;

-- 4) Membership uniqueness: one mess per account remains enforced.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.mess_memberships'::regclass
  and conname = 'one_mess_per_account';
