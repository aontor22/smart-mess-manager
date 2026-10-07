# Smart Mess Manager — App Update Prompt + September 2026 Import

## 1. New-version update overlay

The app now checks `/version.json` for a newer deployed build.

- A Vercel/Git deployment gets a build version automatically.
- The running app checks shortly after load, every 2 minutes, and when the tab becomes active again.
- When a newer build is detected, a full-screen update overlay appears.
- **Update now** clears only Smart Mess Manager app caches, activates a waiting service worker when present, and reloads the latest Vite build.
- Supabase data, IndexedDB data, and the login session are not cleared.
- **Later** hides that exact version for the current browser tab/session.

Files involved:
- `vite.config.js`
- `public/version.json` (fallback; overwritten automatically during build)
- `public/sw.js`
- `src/components/AppUpdatePrompt.jsx`
- `src/App.jsx`

## 2. September 2026 historical data

Run `database/import-september-2026.sql` **once after deploying this code**.

The script targets the workspace named `Bachelor Next`. If the mess name changes, edit only:

```sql
v_target_mess_name text := 'Bachelor Next';
```

The import is idempotent: running it again replaces only this import batch and does not duplicate it.

### Verified values from the supplied sheet

| Member | Meals | Deposit (BDT) | Meal cost (BDT) | Balance (BDT) |
|---|---:|---:|---:|---:|
| Ashraful Islam | 37 | 2,150 | 2,135.33 | +14.67 |
| Shahajalal | 7 | 500 | 403.98 | +96.02 |
| Udoy | 30.5 | 2,114 | 1,760.20 | +353.80 |
| Rajib | 30.25 | 1,740 | 1,745.77 | -5.77 |
| Diganto | 21.5 | 1,280 | 1,240.80 | +39.20 |
| Redowan | 22.25 | 700 | 1,284.08 | -584.08 |
| Dibbo | 35.1 | 1,900 | 2,025.68 | -125.68 |
| Emon | 46.25 | 2,190 | 2,669.16 | -479.16 |

Totals:
- Total meals: **229.85**
- Total deposits: **12,574 BDT**
- Total bazar: **13,265 BDT**
- Meal rate: **57.71155... BDT**

The sheet provides 26 bazar amounts but does not show their transaction dates. To avoid inventing dates, the import stores one September aggregate bazar row of 13,265 BDT. This keeps the monthly settlement exact.

Shahajalal and Diganto are added as **archived historical members** because they are present in September data but not in the current Members list. Archived members stay hidden from the current Members page but appear correctly in September historical reports.

## 3. Viewing September in the app

After the SQL succeeds:

1. Open the app and let it sync, or use the manual sync action/reload.
2. Go to **Reports**.
3. Choose **September 2026** from the new Report month selector.
4. Meals already has month selection, and Profile will also include September in its month selector.

The active mess month can remain October, so current warning/meal-off automation is not switched back to September.

## 4. Expected SQL verification result

At the end of the import SQL, Supabase should show approximately:

```text
imported_total_meals    229.85
imported_total_deposits 12574
imported_total_bazar    13265
imported_meal_rate      57.7116
```

## 5. Tests

`npm test` passes **29/29** tests, including the new historical-settlement regression test.
