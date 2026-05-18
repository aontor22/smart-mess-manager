# Project Notes

This project is an original mess management web app inspired by the general category of mess and shared-living management apps. It does not copy any brand identity, logo, code, or private interface.

## Current implementation level

Fully implemented with LocalStorage:
- Authentication demo
- Signup workspace creation
- Dashboard
- Member management
- Meal management
- Market costs
- Deposits
- Expenses
- Monthly calculations
- Reports
- PDF and CSV export
- Activity log
- Notice board
- To-let board
- Settings
- Dark mode
- Responsive layout

## Recommended next step

Connect Supabase:
1. Create Supabase project
2. Run `database/supabase-schema.sql`
3. Add keys to `.env`
4. Replace LocalStorage functions in `src/utils/storage.js` with Supabase CRUD calls
5. Add Row Level Security policies per mess membership
