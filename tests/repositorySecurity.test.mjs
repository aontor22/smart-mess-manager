import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("local environment files are ignored while .env.example stays trackable", () => {
  const ignore = read(".gitignore");
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.ok(existsSync(new URL("../.env.example", import.meta.url)));
});

test("environment template contains no populated Supabase credential", () => {
  const example = read(".env.example");
  for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    const line = example.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
    assert.ok(line, `${key} must be documented in .env.example`);
    assert.equal(line, `${key}=`, `${key} must not contain a real value in .env.example`);
  }
});

test("Supabase schema enables RLS on shared workspace tables", () => {
  const schema = read("database/supabase-schema.sql");
  assert.match(schema, /alter table public\.mess_workspaces enable row level security;/i);
  assert.match(schema, /alter table public\.mess_memberships enable row level security;/i);
  assert.match(schema, /revoke all on table public\.mess_workspaces from anon;/i);
  assert.match(schema, /revoke all on table public\.mess_memberships from anon;/i);
});
