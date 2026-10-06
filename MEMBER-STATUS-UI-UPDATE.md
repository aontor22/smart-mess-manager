# Member status + mobile settlement UI update

This update is based on the latest mobile-dashboard-fixed build and preserves the existing warning automation, meal-off logic, notification sounds, reports, profile, Supabase sync, and financial calculations.

## Dashboard mobile settlement
- Replaced the tall separated mobile settlement cards with a compact two-row list.
- Member name and balance stay on one line where possible.
- Meals, payable, and deposit remain visible in three aligned columns.
- The shorter layout brings Recent activity closer on phones while keeping all settlement fields readable.
- Tablet/desktop settlement table is unchanged.

## Members status indicators
Two narrow columns are added immediately after Member name:

- **Warning**
  - Gray bell: no warning yet.
  - Yellow bell: first/payment warning is active (`paymentWarningSentAt`).
  - Red bell: final/meal-off stage has been reached (meal suspended / meal suspension state).
- **Meal**
  - Green food icon: meal access active.
  - Red crossed food icon: meal access suspended/off.
  - Gray food icon: member is inactive.

The existing Due since and Meal access columns are retained, so the icons are a quick visual status rather than a replacement for existing data.

## Members table positioning
- Warning and Meal columns are kept narrow and centered beside Name.
- Contact, room, account and status cells have better spacing/wrapping.
- Edit/Delete actions stay together instead of breaking onto separate lines.
- A small legend below the table explains the icon colors.

## QA
- Existing regression tests plus new member-status tests: 28/28 passed.
- `git diff --check`: clean.
- No new Supabase SQL is required for this UI update.
