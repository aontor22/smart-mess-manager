# Deployment, Rollback, and Recovery

## Release flow

Recommended release workflow:

```text
feature/hardening branch
      ↓
pull request
      ↓
required GitHub Actions checks
      ↓
merge to protected main
      ↓
Vercel production deployment
      ↓
post-deploy smoke test
```

Do not bypass failing required checks for routine releases.

## Pre-deployment checklist

Run locally or rely on the equivalent required CI checks:

```bash
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Confirm:

- required CI check is green;
- no unexpected `.env` or credential file is tracked;
- database migration has been reviewed;
- rollback path is known before applying irreversible data changes.

## Database migration order

### Fresh database

Run `database/supabase-schema.sql`.

### Existing production database

Never rerun the complete schema just because the file changed in Git.

Apply only the incremental migration required for that release. For the current RLS hardening release:

1. `database/security-rls-hardening.sql`
2. `database/security-rls-verify.sql` (read-only verification)

Keep migration execution notes with the release/PR so the production state can be reconstructed later.

## Post-deploy smoke test

Use one manager and one normal member account.

Verify:

1. Login/session restoration
2. Dashboard loads
3. Manager can save a meal entry
4. Manager can add a deposit
5. Manager can add market cost/expense
6. Settlement/report still reconciles
7. Member can read permitted data
8. Member cannot perform manager-only mutations
9. Self-service profile update still works
10. Notice/warning behavior still works
11. Mobile layout remains usable
12. Update prompt/service worker does not loop

## Rollback: frontend

If the new frontend deployment is broken but no incompatible database migration was applied:

- use Vercel's previous successful deployment/rollback capability;
- verify environment variables match the target deployment;
- run the smoke test after rollback.

Avoid deleting production data as a frontend rollback technique.

## Rollback: database

Database rollback depends on the migration. Before applying a destructive migration:

- capture/verify a backup;
- identify affected tables/functions/policies;
- prepare explicit rollback SQL where practical;
- test both forward and rollback paths in a non-production Supabase project.

Security-policy migrations should be rolled back carefully: restoring an older permissive policy can reintroduce the vulnerability that the migration fixed.

## Backup and restore

Use Supabase's available backup/export facilities appropriate to the project plan. The important operational requirement is not merely "a backup exists" but that restore is periodically tested.

Recommended recovery exercise:

1. Create or select a non-production Supabase project.
2. Restore/import the selected backup or schema/data export.
3. Configure a non-production frontend against it.
4. Run authentication and settlement smoke tests.
5. Confirm RLS policies/functions are present.
6. Record recovery time and any manual steps.

Never test destructive restore procedures against the active production database.

## Environment recovery

Record the required variable names, but not secret values:

```text
VITE_APP_NAME
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Privileged credentials, if any are introduced later for server-side jobs, must stay server-side and be managed through the deployment/provider secret store.

## Incident checklist

If suspicious access or credential exposure is detected:

1. Preserve logs/evidence.
2. Determine whether the exposed value is public/publishable or privileged.
3. Rotate/revoke privileged credentials immediately.
4. Review Supabase Auth/database logs and recent deployments.
5. Verify RLS/policies were not weakened.
6. Temporarily disable the affected feature if necessary.
7. Patch through a reviewed PR and required CI.
8. Document the incident and prevention action.
