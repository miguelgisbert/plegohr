# QA checklist — production readiness plan

Run after `npm run lint && npm run typecheck && npm run build` and
`./supabase/tests/run_local_tests.sh` (must end `== ALL GREEN ==`).

## Security / multi-tenancy (WS1)

- [ ] Employee A cannot see company B data on any page (documents, leave, time, corrections).
- [ ] Employee cannot edit another employee's time entry or change `date`/`clock_in` directly.
- [ ] Clock-out in the future is clamped to "now" by the DB.
- [ ] Closing a day again does not rewrite a completed entry (stale tab -> friendly error).

## Invitations & auth (WS2–WS3)

- [ ] Admin invites employee -> Resend email sent (or toast says "share link manually" if `RESEND_API_KEY` unset).
- [ ] Employee opens `/accept-invitation?token=...` -> preview (name/company), sets password (min 6), lands on employee dashboard with `company_id` assigned.
- [ ] Expired/used/foreign token -> translated error, no crash.
- [ ] Login lands on the correct dashboard for the role (admin/employee), no flash of wrong dashboard.
- [ ] Password reset email link opens the reset page and allows setting a new password.

## Time tracking (WS4–WS5)

- [ ] Clock in / start break / end break / clock out update the summary (net worked, break total, gross).
- [ ] Leaving the page open does not double-count breaks (auto-save only touches active rows).
- [ ] Two tabs: second tab's clock-in shows "already clocked in" and recovers the entry.
- [ ] Employee submits a correction -> shows under "My correction requests".
- [ ] Admin approves -> values applied to the time entry (`corrected`), buttons disable while saving.
- [ ] Admin rejects -> status updates, both sides see the change after reload.

## Reports (WS6)

- [ ] `/time-tracking`: day/week/month + prev/next navigation recalculates stats and chart.
- [ ] PDF export downloads a translated report for the selected employee.

## Documents & signature (WS7)

- [ ] Upload rejects >10 MB and non pdf/png/jpg with a translated message.
- [ ] "Require employee signature" checkbox set at upload; can be toggled later (until signed).
- [ ] Employee sees Pending/Signed/Not required badge, previews the file in-app, signs it.
- [ ] Signed documents cannot be re-signed or unsigned (DB enforces, not just UI).
- [ ] Employee cannot modify the file row (RLS: SELECT only).

## PWA (WS8)

- [ ] `dist/manifest.webmanifest` has real 192/512/maskable icons; favicon renders.
- [ ] Chrome/Edge install prompt works; app opens standalone with correct theme color.
- [ ] Reload on a deep route (e.g. `/time-tracking`) works online and serves the shell offline.

## i18n & navigation (WS9)

- [ ] `<html lang>` matches the selected language (en/es/ca) after switching.
- [ ] Admin nav shows Dashboard / Time Tracking / Time Corrections / Documents / Leave on every admin page.
- [ ] Employee nav shows Dashboard / Documents / Leave on every employee page.
- [ ] No raw error objects in toasts/alerts; no hardcoded UI text.

## After restoring the Supabase project

1. `npx supabase db push`
2. `npx supabase functions deploy send-employee-invitation`
3. `npx supabase secrets set RESEND_API_KEY=... EMAIL_FROM=... APP_URL=...`
4. Configure Auth Site/Redirect URLs (see `EXTERNAL_SERVICES.md`).
5. Re-run this checklist against production.
