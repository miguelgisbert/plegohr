03# PlegoHR — Development Rules

## Language

- **All code** (variable names, function names, component names, comments, TypeScript types, file names) must be written in **English**.
- **All user-visible text** (labels, buttons, messages, placeholders, titles, toasts, error messages) must use the **i18next `t()` function** — never hardcode strings visible to the user.

## Internationalisation (i18n)

- Translation files are located at `src/locales/{en,es,ca}/translation.json`.
- Supported languages: **English (en)**, **Spanish (es)**, **Catalan (ca)**.
- Every new string visible to the user must be added to **all three** translation files simultaneously.
- The app displays the language selected by the user (persisted via localStorage). Do not assume a default language in component code.
- Key naming convention: use dot notation with a namespace prefix matching the feature area, e.g. `employees.add`, `leave.review.title`, `documents.types.contract`.
- Always add the key in EN first, then ES, then CA.

## Architecture

- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions).
- Frontend: React 18 + Vite SPA. No SSR.
- Styling: Tailwind CSS + MUI hybrid. Prefer Tailwind for layout and spacing, MUI only where already used in the file.
- Auth: Supabase Auth. All protected routes must be wrapped with `<ProtectedRoute>`.
- Demo/preview routes (`/preview/*`) are public — no auth required, use hardcoded mock data, no real Supabase calls.

## Supabase & VPS migration

- The app must remain compatible with self-hosted Supabase (Docker Compose). Do not use Supabase cloud-only features.
- All Supabase URLs and keys come from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never hardcode them.
- Switching from cloud to self-hosted VPS = only changing `.env` values, zero code changes.

## Code style

- No duplicate logic: extract shared behaviour into hooks or utilities.
- Keep components focused: data fetching, state management and UI in the same file is acceptable for page-level components.
- Error messages shown to the user must go through i18n. Console errors can be in English without `t()`.
