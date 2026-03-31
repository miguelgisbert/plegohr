# Supabase Backend Workflow (PlegoHR)

This project stores backend changes in the repository:

- SQL migrations in `supabase/migrations`
- Edge Functions in `supabase/functions`

## 1) Install Supabase CLI on Windows

Option A (recommended): Scoop

1. Open PowerShell (normal user)
2. Install Scoop if needed:
   - `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
   - `irm get.scoop.sh | iex`
3. Install Supabase CLI:
   - `scoop install supabase`

Option B: npm global install

1. Open PowerShell
2. Run:
   - `npm install -g supabase`

Verify:

- `supabase --version`

## 2) Authenticate CLI

- `supabase login`

This opens a browser and stores your access token locally.

## 3) Link local repo to your Supabase project

Project ref for this workspace:

- `czxkbihwjqkcrjsobujv`

Run:

- `npm run supabase:link`

## 4) Apply database migrations from repo to Supabase

Run:

- `npm run supabase:db:push`

This applies every pending migration from `supabase/migrations`.

## 5) Deploy Edge Function for invitations

Run:

- `npm run supabase:functions:deploy:invitation`

This deploys `send-employee-invitation` with JWT verification disabled to avoid browser preflight/CORS failures in the current setup.

## 6) Suggested daily backend workflow

1. Create migration file in `supabase/migrations`
2. Test SQL in Supabase SQL Editor if needed
3. Run `npm run supabase:db:push`
4. Edit Edge Function code in `supabase/functions/...`
5. Deploy function with `npm run supabase:functions:deploy:invitation`
6. Commit code + migration files to git

## 7) Frontend deploy vs backend deploy

- Push to main -> Vercel deploys frontend.
- Supabase backend changes are NOT deployed by Vercel automatically.
- Backend needs explicit deploy steps (CLI or Supabase dashboard).

## 8) If CLI is still not found in PowerShell

1. Close and reopen PowerShell.
2. Run `where supabase`.
3. If still missing, use npm scripts based on npx after installing Node/npm:
   - `npm run supabase:version`
