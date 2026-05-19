# Smart Mess Manager

A complete React + Vite starter web app for managing mess, hostel, shared apartment, and roommate meal expenses.

## Features

- Auth flow with demo login and signup
- Protected dashboard
- Mess profile and role-aware settings
- Member CRUD
- Daily meal tracking with 0.5 meal support
- Market or bazar cost tracking
- Deposit tracking
- Shared and assigned expenses
- Automatic monthly calculation
- Member-wise monthly settlement
- PDF export and CSV export
- Activity log
- Notice board
- To-let board
- Dark mode
- Mobile responsive layout
- LocalStorage mock database
- Supabase schema included

## Demo Login

Email: `manager@demo.com`  
Password: `123456`

## Install

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Backend

This version uses LocalStorage so it works instantly.  
For real backend integration, use `database/supabase-schema.sql` as the starting database schema.

## Main calculation

Meal rate = total market cost / total meals

Member payable = member meal count × meal rate + shared expense share + assigned expenses

Balance = deposit − payable

Positive balance means the member will get money back.  
Negative balance means the member needs to pay.


## Offline/PWA Support

This project now includes offline support.

Included files:
- `public/sw.js`
- `public/manifest.webmanifest`
- `public/offline.html`
- `public/pwa-icon.svg`
- `src/utils/registerServiceWorker.js`

How it works:
- The app shell is cached after the first successful visit.
- React/Vite build assets are cached automatically when loaded.
- LocalStorage keeps mess data available in the same browser.
- After one successful online load, the app can reopen offline.
- For real multi-device sync, connect Supabase or Firebase later.

Important:
Service workers work properly on HTTPS domains like Vercel production URLs. They usually do not fully work from local `file://` paths.

## Member Authentication Rule

Random emails cannot be added as members anymore.

Before adding a new member:
1. The member must sign up first.
2. The manager must add the member using the same registered email.
3. If the email is not registered, the app blocks the member creation.

This keeps member records linked with app authentication users in the LocalStorage demo system.

