# PlegoHR — Agent Guide

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint flat config (`eslint.config.js`) |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.app.json` (not root tsconfig) |
| `npm run preview` | Preview production build |

Always run `lint` then `typecheck` before committing. There is no test framework.

## Architecture

- **Entrypoint**: `src/main.tsx` → `src/App.tsx` (React Router routes)
- **Auth**: `src/contexts/AuthContext.tsx` wraps Supabase auth; profile role (`admin`/`employee`) + `company_id` loaded from `profiles` table
- **Protected routes**: `src/components/common/ProtectedRoute.tsx` checks `role`; mismatched roles redirect to the correct dashboard
- **Theme**: `src/contexts/ThemeContext.tsx` syncs Tailwind `class` dark mode + MUI theme (light/dark/system, persisted in localStorage)
- **i18n**: react-i18next with en/es/ca JSON files; detected from localStorage then navigator
- **Styling**: Tailwind v3 utility classes + MUI v7 with Emotion (`@emotion/react`, `@emotion/styled`)
- **Router**: react-router-dom v7 (v6-style `<Routes>/<Route>` still work)
- **Time tracking**: `EmployeeDashboardPage.tsx` — clock-in/out/break with DB persistence (auto-save every 30s)
- **Admin time views**: `AdminTimeTrackingPage.tsx` (`/time-tracking`) — employee filter, date filter, stats; `AdminCorrectionsPage.tsx` (`/time-corrections`) — approve/reject correction requests
- **PDF reports**: `src/components/reports/TimeReportPDF.tsx` + `src/utils/pdfGenerator.tsx` — client-side PDF via @react-pdf/renderer
- **PWA**: vite-plugin-pwa enabled with auto-update + Workbox service worker
- **404**: `NotFoundPage.tsx` — catch-all route

## Supabase

- Live project at `czxkbihwjqkcrjsobuji` — `.env` already has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- 10 timestamped migrations in `supabase/migrations/` — run in order via `supabase db push` or SQL Editor
  - New: `20260327000000_create_time_entries.sql` + `20260327000001_create_time_corrections.sql`
- 1 Deno edge function: `supabase/functions/send-employee-invitation/` (deploy: `supabase functions deploy send-employee-invitation`)
- RLS enabled on all tables; recursion-fix migration exists

## Conventions

- **Code language**: All code, comments, function names, variable names, and file names MUST be in English
- **UI text**: All user-facing strings MUST use `react-i18next` `t()` function — never hardcode UI text in any language
- **Error messages**: Always show user-friendly translated messages via `t()`, not raw error objects

## Quirks

- **`dist/` is committed** (not in `.gitignore` in practice) — do not delete it
- **`lucide-react` excluded** from Vite `optimizeDeps` in `vite.config.ts`
- **MUI v7** uses `@emotion/react` + `@emotion/styled` — install both when adding MUI components
- **Two date libs**: `date-fns` and `dayjs` both present — prefer whichever is already used in the file you're editing
- **No test framework** (no vitest, jest, etc.)
- No CI/CD pipeline configured
