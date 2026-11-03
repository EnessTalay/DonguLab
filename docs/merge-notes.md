# Integrated team snapshot

> Tarihsel teslim/inceleme kaydıdır. Güncel kod yapısı için [mimari](architecture.md),
> mevcut sözleşme için [servis belgesi](service-contract.md), değişiklikler için
> [Paket 2](package-2-structure.md) esas alınmalıdır. Aşağıdaki test sonuçları kendi dönemine aittir.

- Base: DonguLab-codex-enes-altyapi.zip; identical to the workspace before integration.
- Student routes, form and matching: DonguLab-Fatmanur.zip.
- Business listing, incoming request and delivery UI: DonguLab-Canan.zip (archive root is DonguLab-Emine).
- Kept the base auth provider, role guards, service contract, database migrations and environment configuration.
- Replaced the independent student mock store with the shared demo/Supabase adapter. Owner IDs are resolved by the authenticated service.
- Matching eligibility follows the shared transaction guard, including rotation, normalized region, stock, thickness and dates.
- Added SDK-compatible datetimepicker through Expo install. Existing native development builds need rebuilding for this dependency.

## Verification

Use Node 22 (>=22.13, <23) and npm 10/11 as required by package.json.
Run `npm run check`, `npm test`, and `npm run export:web`.
Smoke test on a device: sign in as student, create a need, send a request; sign in as the listing business, approve it; return to student and generate a delivery code; confirm the code as business and verify stock.
Live Supabase and physical device interactions are not verified by the automated checks.
