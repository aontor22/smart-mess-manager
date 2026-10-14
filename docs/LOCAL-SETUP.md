# Local Setup and Reproducibility

This guide describes a clean installation from a fresh clone.

## Prerequisites

- Git
- Node.js 20+ recommended
- npm
- A modern browser
- Optional: a Supabase project for cloud/auth/database testing

Check versions:

```bash
node --version
npm --version
git --version
```

## 1. Clone and install

```bash
git clone https://github.com/aontor22/smart-mess-manager.git
cd smart-mess-manager
npm ci
```

Use `npm ci` for reproducible installs when `package-lock.json` is present.

## 2. Environment configuration

Copy the safe template:

```bash
cp .env.example .env
```

Set:

```env
VITE_APP_NAME=Smart Mess Manager
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Do not place privileged keys in a Vite `VITE_*` variable because those values are included in the browser bundle.

Never use a Supabase service-role key in frontend code.

## 3. Supabase database

### Fresh project

Open Supabase SQL Editor and run:

```text
database/supabase-schema.sql
```

Then confirm authentication settings and the expected database objects exist.

### Existing project

Do not rerun the full schema. Apply only the release migration(s) that have not already been applied. For the current authorization hardening release:

```text
database/security-rls-hardening.sql
```

Then run:

```text
database/security-rls-verify.sql
```

The verification script is read-only and should confirm the expected policies/functions/constraints.

## 4. Start development server

```bash
npm run dev
```

Open the local URL printed by Vite.

## 5. Verify before development

```bash
npm test
npm run build
```

Expected result: regression tests pass and Vite creates a production bundle in `dist/`.

## 6. Test roles

For authorization work, use at least three identities:

1. Manager of Mess A
2. Member of Mess A
3. Member/manager of Mess B

Minimum manual checks:

- Mess A member can read Mess A but not Mess B.
- Regular member cannot write shared financial/workspace state.
- Manager can perform intended business mutations.
- Member can update only allowed self-service profile fields.
- Manager transfer and Mess ID rotation still work.

## 7. Reset local browser state

When testing a fresh local session, remove site storage through browser DevTools rather than deleting production cloud data.

Clear only local/dev data you intentionally want to reset:

- IndexedDB
- Cache Storage
- Service Worker
- local/session storage

Do not use this procedure as a production data-reset mechanism.

## Troubleshooting

### App starts but cloud sync does not work

Check:

- `.env` values
- Supabase project URL
- publishable/anon key
- browser network errors
- authentication state
- RLS/RPC errors in Supabase logs

### Production build fails after dependency update

Run:

```bash
npm ci
npm test
npm run build
```

Do not merge a major build-tool migration solely because Dependabot opened it. Tailwind major upgrades, for example, require planned config changes.

### Service worker shows stale UI

Use the app's update prompt first. For development only, unregister the local service worker and clear Cache Storage, then reload.
