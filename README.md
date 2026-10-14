# Smart Mess Manager

Smart Mess Manager is an offline-first, multi-user web application for managing shared mess, hostel, and apartment operations: members, meals, deposits, bazar/market costs, shared and assigned expenses, notices, warnings, monthly settlement, and printable reports.

## Highlights

- Supabase Auth and PostgreSQL-backed cloud workspace
- Manager/member authorization with database-level RLS/RPC enforcement
- Multi-mess isolation
- IndexedDB offline persistence with cloud synchronization
- Daily meal entry and automatic monthly meal-rate calculation
- Deposits, bazar costs, shared expenses, assigned expenses, and member balances
- Payment-warning and automatic meal-suspension workflow
- Member warning/meal-status indicators and alert sounds
- Notice board with pinned-notice notifications
- Monthly historical reporting and professional print/export views
- Responsive desktop, tablet, and mobile UI
- PWA/service worker and in-app update prompt
- Automated regression tests and GitHub Actions CI
- Dependabot dependency updates and production dependency audit

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| Styling | Tailwind CSS 3 |
| Backend / Auth / DB | Supabase Auth, PostgreSQL, RLS, RPC functions |
| Offline storage | IndexedDB |
| Reporting | jsPDF, html2canvas, CSV export |
| Charts | Recharts |
| Deployment | Vercel |
| CI | GitHub Actions |

## Architecture

The application uses an offline-first client with Supabase as the authenticated cloud source. The browser keeps a local IndexedDB snapshot so the app remains usable during temporary connectivity loss. Manager-only business mutations are enforced both in the application and at the database authorization boundary.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data flow, trust boundaries, and synchronization model.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Configure the Supabase values in `.env` before testing cloud functionality:

```env
VITE_APP_NAME=Smart Mess Manager
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Never commit `.env`, service-role keys, database passwords, JWT secrets, or other privileged credentials.

Detailed setup: [`docs/LOCAL-SETUP.md`](docs/LOCAL-SETUP.md).

## Database setup

### New Supabase project

For a completely new database, run:

```text
database/supabase-schema.sql
```

The current schema file is the source of truth for a fresh installation and includes the current authorization model.

### Existing production database

Do **not** rerun the full schema on an existing deployment. Apply only the required incremental migration for the release you are deploying. For the current security hardening release this includes:

```text
database/security-rls-hardening.sql
```

Then run the read-only verification script:

```text
database/security-rls-verify.sql
```

Historical/import scripts such as the September 2026 import are optional data migrations and should only be run for the intended workspace.

## Verification

Run the local regression suite and production build before opening or merging a pull request:

```bash
npm test
npm run build
```

Or:

```bash
npm run verify
```

The repository CI performs clean dependency installation, regression tests, a production build, and a production dependency security audit.

## Authorization model

### Manager

- Manage members and room assignments
- Add/update/delete meals, deposits, market costs, and expenses
- Update mess settings and payment-warning rules
- Rotate the Mess ID
- Transfer manager ownership
- Run manager-owned workspace mutations

### Member

- Read data for the mess they belong to
- View own balance/history and shared reports permitted by the UI
- Update only allowed self-service profile fields through the secured profile RPC
- Cannot overwrite shared financial/workspace state
- Cannot change role, room, manager identity, or another member's data

### Other mess / outsider

- Cannot read or write another workspace's protected data

See [`SECURITY.md`](SECURITY.md) and the security/RLS documentation in `docs/` for implementation notes.

## Offline synchronization

1. The client writes the latest local state to IndexedDB.
2. When online and authenticated, permitted changes are synchronized with Supabase.
3. Offline changes stay local until connectivity returns.
4. Cloud/local timestamps are used to decide synchronization direction.
5. Authorization remains a database concern: local role checks are not treated as the security boundary.

Offline conflict handling is a known area that should continue to be tested for multi-device concurrent edits.

## Deployment

The recommended production deployment is Vercel + Supabase.

Before releasing:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

Then verify the GitHub Actions required check is green and confirm the Vercel production deployment completed successfully.

Deployment, rollback, and recovery procedures are documented in [`docs/DEPLOYMENT-RECOVERY.md`](docs/DEPLOYMENT-RECOVERY.md).

## Demo/local mode

When Supabase environment variables are absent, the application can run with local demo behavior for UI development. Do not treat demo authentication or cached local state as production authentication.

## Repository workflow

- `main` is protected.
- Use short-lived branches for code changes.
- Open a pull request.
- Required CI must pass before merge.
- Dependabot handles supported dependency updates; major build-tool migrations such as Tailwind major upgrades should be reviewed separately.

## Documentation

- [`docs/LOCAL-SETUP.md`](docs/LOCAL-SETUP.md) — reproducible local/cloud setup
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application architecture and trust boundaries
- [`docs/DEPLOYMENT-RECOVERY.md`](docs/DEPLOYMENT-RECOVERY.md) — deployment, rollback, backup/recovery guidance
- [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md) — release readiness checklist
- [`SECURITY.md`](SECURITY.md) — security policy and reporting guidance

## Known limitations / continued hardening

- Multi-device offline-write conflict handling should continue to receive integration testing.
- Backup/restore should be tested periodically against a non-production environment.
- Browser-level E2E coverage can be expanded for critical manager/member workflows.
- Production monitoring can be extended with centralized error/observability tooling.

## License

Use the repository's LICENSE file if present. If this project is intended to be open source, choose and commit an explicit license before accepting external contributions.
