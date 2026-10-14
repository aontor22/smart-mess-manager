# Smart Mess Manager — Security Hardening Checklist

This document records the security work required before describing the app as
production-ready.

## Completed repository hygiene

- `.env` is ignored by Git.
- `.env.local` and other `*.local` files are ignored.
- `.env.example` contains names only, not credentials.
- CI runs clean install, regression tests, production build, and a high-severity production dependency audit.
- Dependabot is configured for weekly npm dependency updates.
- A private vulnerability-reporting policy is documented in `SECURITY.md`.

## Immediate GitHub cleanup

If `.env` was previously committed to the public repository, deleting the file
in the latest commit is not enough to remove it from old commits.

1. Review the exposed values.
2. Rotate/revoke any privileged credential (service-role key, database password,
   OAuth client secret, etc.).
3. For publishable browser keys, confirm provider restrictions and RLS/security
   rules are correct.
4. Remove the tracked file from the current branch:

```bash
git rm --cached .env 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git add .gitignore .env.example
git commit -m "chore: remove local environment files from source control"
```

5. If a real secret existed in history, rotate it first, then use an approved
   history-rewrite procedure such as `git filter-repo` and coordinate the
   force-push with collaborators.

## Critical authorization review

`mess_workspaces.state` is a shared JSON snapshot. A client-side role check is
not sufficient to protect deposits, meals, expenses, members, notices, or mess
settings.

Before production use, verify with separate manager and member accounts that:

- a member cannot change another member's profile, room, role, meal access, or financial data;
- a member cannot add/edit/delete deposits, expenses, market costs, or meal entries unless explicitly intended;
- a member cannot make themselves manager or rotate the join code;
- a user in Mess A cannot read or mutate Mess B;
- direct Supabase REST calls fail for operations that the UI hides;
- manager transfer and join-code rotation work only through the intended RPCs;
- `update_own_mess_profile` can modify only the authenticated member's allowed contact fields;
- storage/upload policies (if added later) validate ownership, file type, and size.

### Important schema observation

The current schema allows any active member to update the `mess_workspaces` row
and relies on a trigger to protect only workspace identity fields. Because the
shared JSON `state` contains operational/financial data, this policy deserves a
separate hardening migration before the app is considered production-grade.

Do **not** simply make the workspace manager-only without updating the join/profile
sync path first: a newly joined member currently needs a safe way to attach their
account to the corresponding member record. The safer direction is:

1. manager-only full-state writes;
2. narrowly scoped SECURITY DEFINER RPCs for member-owned changes;
3. server/database validation of every RPC;
4. integration tests using two users and two mess workspaces.

## Recommended Supabase integration tests

Create a disposable test project/database and verify these scenarios:

| Scenario | Expected result |
|---|---|
| Manager reads own mess | Allowed |
| Member reads own mess | Allowed |
| User reads another mess | Denied |
| Member edits own name/phone through RPC | Allowed |
| Member edits own room directly | Denied |
| Member edits another member | Denied |
| Member modifies deposits/meals/expenses directly | Denied unless explicitly designed |
| Member changes join code/manager | Denied |
| Manager rotates join code through RPC | Allowed |
| Manager transfers manager role through RPC | Allowed |

## CI expectations

Every pull request to `main` should pass:

```text
npm ci
→ npm test
→ npm run build
→ npm audit --omit=dev --audit-level=high
```

Do not merge a production release when a required CI check is failing.
