# Automatic warning sound update

This update adds dedicated alert tunes to the existing notification system without changing meal, deposit, expense, report, member, profile, authentication, or Supabase data logic.

## Sounds

- Normal newly pinned notice: existing two-note notification tone.
- Payment warning (`payment_warning`): dedicated three-note warning tone.
- Automatic meal suspension (`meal_suspended`): more urgent four-note meal-off tone.

## Playback behavior

- Each automatic warning event plays once per signed-in browser and mess.
- Automatic warning sounds are tracked separately from normal pinned-notice sounds, preventing double playback for the same event.
- If the browser has not yet permitted Web Audio autoplay, the warning remains pending and is played after the user's first click, tap, or key interaction.
- If several unsounded automatic alerts arrive together, one sound is played; meal suspension has priority over a payment warning.
- No audio file is bundled: the tones are generated with the browser Web Audio API.

## Database

No new Supabase SQL, table, column, or RPC is required for this update.

## Validation

`npm test` passes all 24 current regression tests, including notification token tests for payment warnings and meal suspension.
