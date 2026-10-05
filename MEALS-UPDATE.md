# Meal register and bulk entry update

Source: https://github.com/aontor22/smart-mess-manager
Prepared against main commit 4b37ba4 (persistent auth session fix).

## Apply

Extract this ZIP into the project root, preserving the src/ and tests/ paths.
It contains four application files, one regression test file and these instructions.
No database migration or new environment variable is required. Existing authentication
and Google provider settings use your current project configuration.

```bash
unzip -o smart-mess-manager-meal-table-bulk-update.zip -d .
npm ci
node --test tests/mealBatch.test.mjs
npm run build
git diff --check
git status --short
```

After reviewing the changes:

```bash
git add src/pages/Meals.jsx src/pages/Meals.css src/context/DataContext.jsx src/utils/mealBatch.js tests/mealBatch.test.mjs MEALS-UPDATE.md
git commit -m "Add member-column meal register and bulk daily meal entry"
git push origin main
```

## Use

- Meals now opens a register with Date and Meal on the left and members across the top.
- Breakfast, Lunch, Dinner and Daily total are separate rows under each date.
- Use Month and Find member to filter the register. Totals follow visible members.
- Enable Show every date in this month to see unrecorded days.
- A dash means no record; 0 means a recorded meal count of zero.
- Add meals for everyone opens today's entry. Alternatively choose Meal entry date
  and Open daily entry, or use Edit day in the register.
- Change all members on the same screen; Save all meals saves only changed members.
- Presets: All lunch + dinner, All 3 meals and All meal off. Presets apply only to
  members with active meal access. Individual numbers and notes remain editable.
- Whole and half meal counts (0, 0.5, 1, 1.5, etc.) are accepted.
- Existing duplicate records are summed for display. Editing that member/day replaces
  its records with one daily record, retaining the combined notes shown in the form.
  Unedited member/day records are untouched.
- Suspended/inactive members cannot receive bulk changes. Restore access first.
- Individual records retains the original transaction list and confirmed delete action.
  Edit day opens the batch editor for that record's date.
- The header's sync status indicates whether cloud upload completed. A local save
  is not presented as a successful cloud sync while offline or pending.

## Verification completed

- npm ci and Vite production build passed.
- 10 regression tests passed: halves, batch validation, duplicates, note preservation,
  local stale-edit checks, real dates, mess isolation and meal access restrictions.
- DOM integration using the actual Meals component and DataProvider passed: multi-member
  save, one batch activity log, presets, restored values, unchanged-save prevention,
  draft discard confirmation, disabled suspended inputs and member read-only controls.
- Cloud integration with mocked responses passed: serialized pushes, old response
  protection, pending status on failure and retained local edits.
- git diff --check passed.

Browser screenshot/visual checks could not run in this environment. Live Google OAuth
and your Supabase workspace were not exercised. After deployment, check both manager
and member accounts and verify the header reaches synced after a batch save.
The underlying project still syncs whole workspace snapshots; the local stale-edit
check does not implement database transactions across simultaneous devices.

## Deployment smoke check

1. Open Meals as manager; confirm member columns and meal rows match your sketch.
2. Choose a date, apply lunch + dinner, then set one person's dinner to 0.5.
3. Save all meals. Reopen that date and confirm the saved numbers and notes.
4. Save a correction; verify the member/date does not acquire an extra record.
5. Confirm suspended inputs cannot be changed and member accounts have no save/delete.
6. On a phone, scroll within the table; date/meal labels and the top header should remain visible.
7. Reload once the header shows synced and verify the same results.

React state updates use replacement arrays rather than mutating state:
https://react.dev/learn/updating-arrays-in-state
