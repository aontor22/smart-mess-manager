import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("workspace RLS makes full shared-state writes manager-only", () => {
  const schema = read("database/supabase-schema.sql");
  assert.match(schema, /create policy "Managers can update own mess workspace"/i);
  assert.match(schema, /membership\.role = 'manager'/i);
  assert.match(schema, /drop policy if exists "Members can update own mess workspace"/i);
});

test("authenticated clients can update only manager-safe workspace columns", () => {
  const schema = read("database/security-rls-hardening.sql");
  assert.match(schema, /revoke update on table public\.mess_workspaces from authenticated;/i);
  assert.match(schema, /grant update \(name, state\) on table public\.mess_workspaces to authenticated;/i);
  assert.doesNotMatch(schema, /grant update \([^)]*join_code/i);
  assert.doesNotMatch(schema, /grant update \([^)]*manager_user_id/i);
});

test("join RPC links the authenticated account without granting manager role", () => {
  const schema = read("database/security-rls-hardening.sql");
  assert.match(schema, /create or replace function public\.join_mess_by_code/i);
  assert.match(schema, /values \(v_mess_id, v_user_id, 'member', 'active'\)/i);
  assert.match(schema, /'userId', v_user_id::text/i);
  assert.match(schema, /'role', 'member'/i);
});

test("client sync never uploads the whole workspace from a regular member", () => {
  const source = read("src/utils/cloudSync.js");
  assert.match(source, /membership\.role !== "manager"/);
  assert.match(source, /readOnly: true/);
  assert.match(source, /rpc\("manager_update_mess_workspace"/);
  assert.doesNotMatch(source, /\.from\("mess_workspaces"\)[\s\S]{0,140}?\.update\(/);
});

test("shared mutation helpers enforce manager-only actions in the client", () => {
  const source = read("src/context/DataContext.jsx");
  assert.match(source, /const assertManagerMutation = \(\) =>/);
  assert.match(source, /Only the current manager can modify shared mess data/);
  assert.match(source, /if \(collection === "members"\)/);
  assert.match(source, /delete safePatch\.role/);
  assert.match(source, /delete safePatch\.userId/);
});
