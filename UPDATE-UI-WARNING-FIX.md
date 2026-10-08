# Update UI + Warning/Meal-Off Final Fix

## What changed

### In-app update UI
- New responsive update modal matching the approved mockup.
- Desktop: centered modal over a dimmed app.
- Mobile: bottom-sheet style modal.
- Shows update icon, title, What's new section, Update now, and Later.
- Update now refreshes cached app files only; Supabase data, IndexedDB records, and login state are preserved.
- `version.json` now includes release-note bullets generated at build time.

### Payment warning / meal-off automation
- Due date is now counted as **Day 1** (inclusive day counting).
- Uses the user's **local calendar date**, avoiding UTC date drift around midnight.
- Warning day must be at least Day 1.
- Meal-off day must be later than warning day.
- Settings now have their own **Save automation** button and live Day preview.
- Settings validation prevents invalid warning/meal-off combinations.
- Warning/meal-off logic is rechecked while the app remains open, on focus, and when returning to the tab.
- If the app first opens after the meal-off threshold, it sends only the final meal-off notice instead of warning + meal-off alerts together.
- Clearing the due automatically resets the timer and restores only meals suspended by automation.
- Turning off auto suspension or moving the meal-off day later restores an automatic suspension when the member has not yet reached the new threshold.
- Disabling warning automation clears automation state and restores only auto-suspended meals.
- A second due cycle in the same month receives a fresh warning/meal-off event instead of being blocked by the previous cycle.

## Example
With:
- Warning day = 4
- Meal-off day = 7

If a member first becomes due on October 1:
- Oct 1 = Day 1
- Oct 4 = Day 4 -> first warning
- Oct 7 = Day 7 -> automatic meal-off (if enabled and still due)

## Supabase
No new SQL is required for this update. Existing Supabase data and schema are unchanged.

## Verification
Run:

```bash
npm test
npm run build
```

The included regression suite passes 39 tests in the supplied source package. A production Vite build still requires installed npm dependencies.
