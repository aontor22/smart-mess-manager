# Production Readiness Checklist

## Repository and CI

- [ ] Working tree clean before release
- [ ] No `.env` / `.env.local` tracked
- [ ] `.env.example` contains variable names only
- [ ] Protected `main`
- [ ] Required CI check enabled
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Production dependency audit passes
- [ ] Dependabot PRs reviewed instead of blindly merged

## Database and authorization

- [ ] Current migration applied to production
- [ ] RLS verification script passes
- [ ] Manager can perform intended writes
- [ ] Member cannot overwrite shared workspace state
- [ ] Member self-profile update works only for allowed fields
- [ ] Cross-mess read/write attempts are rejected
- [ ] Manager transfer works
- [ ] Mess ID rotation works

## Business transactions

- [ ] Meal batch save works
- [ ] Invalid/negative financial amounts are rejected
- [ ] Cross-mess member references are rejected
- [ ] Deposit settlement totals reconcile
- [ ] Shared/assigned expense totals reconcile
- [ ] Warning lifecycle works
- [ ] Automatic meal suspension/restoration works
- [ ] Duplicate/retry behavior tested for critical workflows

## Offline / PWA

- [ ] App loads after normal service-worker update
- [ ] Update prompt successfully loads the latest deployment
- [ ] Temporary offline use works
- [ ] Reconnection synchronizes without obvious data loss
- [ ] Multi-device/offline conflict scenarios have been exercised

## Deployment

- [ ] Vercel production deployment is green
- [ ] Correct production environment variables present
- [ ] Post-deploy smoke test completed
- [ ] Previous good deployment identifiable for rollback

## Recovery

- [ ] Backup/export mechanism understood
- [ ] Restore tested in non-production environment
- [ ] Database rollback approach documented for current migration
- [ ] Required environment variable names documented

## Portfolio evidence

- [ ] README explains problem, architecture, setup, security, and limitations
- [ ] Live demo link added to GitHub repository metadata/README
- [ ] Screenshots use demo data only
- [ ] Architecture diagram available
- [ ] CI status badge added after workflow name is finalized
- [ ] Known limitations stated honestly
