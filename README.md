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
