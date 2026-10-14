import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("RLS hardening removes broad member workspace updates", async () => {
  const sql = await read("database/security-rls-hardening.sql");
  assert.match(sql, /revoke update on table public\.mess_workspaces from authenticated/i);
  assert.match(sql, /drop policy if exists "Members can update own mess workspace"/i);
});

test("manager full-state writes use a narrow security-definer RPC", async () => {
  const sql = await read("database/security-rls-hardening.sql");
  assert.match(sql, /create or replace function public\.manager_update_mess_workspace/i);
  assert.match(sql, /membership\.role = 'manager'/i);
  assert.match(sql, /manager_user_id <> v_user_id/i);
});

test("join RPC attaches only the authenticated member to shared JSON", async () => {
  const sql = await read("database/security-rls-hardening.sql");
  assert.match(sql, /create or replace function public\.join_mess_by_code/i);
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /insert into public\.mess_memberships/i);
  assert.match(sql, /'role', 'member'/i);
});

test("frontend no longer directly updates mess_workspaces", async () => {
  const source = await read("src/utils/cloudSync.js");
  assert.doesNotMatch(source, /\.from\(["']mess_workspaces["']\)[\s\S]{0,120}?\.update\(/);
  assert.match(source, /rpc\(["']manager_update_mess_workspace["']/);
  assert.match(source, /membership\.role !== ["']manager["']/);
});

test("warning automation is manager-authoritative", async () => {
  const source = await read("src/context/DataContext.jsx");
  assert.match(source, /if \(!isManager \|\| workspaceStatus !== "ready"/);
});
