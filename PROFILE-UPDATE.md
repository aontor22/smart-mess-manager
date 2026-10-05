# Profile update deployment

This update keeps the existing Smart Mess Manager flows intact and extends only the profile/self-service experience plus responsive layout behavior.

## What changed

- Profile can show balance, deposits, meals, meal rate, payable and the meal/shared/assigned expense breakdown.
- A month selector recalculates the profile with the same `calculateMonthly()` logic used by Reports.
- Recent personal meal and deposit entries are shown for the selected month.
- Users can edit only their own name and phone. Email, room, role, membership status, meal access and financial records are read-only from Profile.
- Account-profile and mess-profile saves are reported independently, so a partial failure can be retried safely.
- Profile is accessible from the sidebar and header on mobile. The original five mobile bottom-navigation items remain unchanged.
- Profile cards, modal, page header, sidebar and app header now adapt to small phones, tablets and desktop widths.

## Supabase: one-time SQL for existing deployments

If the current Supabase project was created before this update, run:

`database/profile-update.sql`

in **Supabase Dashboard > SQL Editor** once. It creates the `update_own_mess_profile` RPC used by the Profile page. The RPC accepts only `name` and `phone`, checks the authenticated user's active mess membership, and updates only that user's member/account objects inside the shared workspace JSON.

For a brand-new Supabase setup, `database/supabase-schema.sql` already contains the same RPC, so running the full schema is enough.

## Local verification

```bash
npm install
npm test
npm run build
npm run dev
```

The included test suite contains the original 10 meal-batch regression tests plus 10 profile regression tests.
