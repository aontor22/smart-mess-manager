# Notice notification + Reports print update

This update is additive and keeps the existing meal, deposit, expense, member, authentication, sync, and settlement logic unchanged.

## Notice notification

- A newly pinned notice creates a small green unread dot on the top notification bell.
- Existing automatic payment/meal warning count remains unchanged.
- A short two-note alert tone is played when a new pin is detected after the browser has allowed audio through normal user interaction.
- Opening the Notice board (including clicking the bell) marks currently pinned notices as read for that signed-in user/browser.
- Re-pinning a notice creates a new notification revision using `pinnedAt`.
- No extra Supabase SQL or database table is required. `pinnedAt` lives inside the existing shared workspace JSON.

## Reports / Print

- Reports now use a table-first settlement sheet.
- Added Room column to the visible report.
- Added a compact summary table above the member settlement table.
- Print output is isolated from the sidebar/header/mobile navigation.
- Print uses A4 landscape, repeated table headers, compact borders and spacing, and print-friendly balance/status formatting.
- CSV and PDF actions are unchanged.

## Deployment

No new SQL is required for this update.

```bash
npm test
npm run build
git add -A
git commit -m "Add pinned notice alerts and improve report printing"
git push
```
