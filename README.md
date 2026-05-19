# Smart Mess Manager

A Supabase-ready, offline-first React + Vite web app for managing mess, hostel, shared apartment, and roommate meal expenses.

## Included

- Supabase Auth login/signup
- Supabase cloud sync
- IndexedDB offline storage
- Automatic sync when internet returns
- Service Worker and PWA support
- Protected dashboard
- Member management
- Daily meal tracking
- Market/bazar cost tracking
- Deposit tracking
- Other expenses
- Automatic meal rate and monthly settlement
- PDF and CSV report export
- Activity log
- Notice board
- To-let board
- Dark mode
- Mobile responsive layout

## Offline sync logic

1. When the user changes data, the app saves it locally in IndexedDB.
2. If internet is available and Supabase is configured, the app pushes the latest app state to Supabase.
3. If the user is offline, changes stay in IndexedDB.
4. When the browser comes back online, the app automatically syncs the local state to Supabase.
5. If cloud data is newer than local data, the app pulls the cloud version.

Current sync strategy: local-first JSONB app-state snapshot per authenticated user.

## Install

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Supabase setup

1. Create a new Supabase project.
2. Open Supabase Dashboard > SQL Editor.
3. Run this file:

```txt
database/supabase-schema.sql
```

4. Go to Project Settings > API.
5. Copy Project URL and anon/public key.
6. Create `.env` in the root folder:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

7. On Vercel, add the same variables in Project > Settings > Environment Variables.

## Important Supabase Auth setting

For easiest testing, disable email confirmation:

Supabase Dashboard > Authentication > Providers > Email > Confirm email = OFF

If email confirmation stays ON, users may need to confirm email before cloud sync works.

## Never expose

Do not put these in GitHub or frontend code:

- service_role key
- database password
- JWT secret
- any private secret key

Only use the anon/public key in the frontend.

## Demo mode

If Supabase environment variables are not set, the app runs in local demo mode.

```txt
Email: manager@demo.com
Password: 123456
```
