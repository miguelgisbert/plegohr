# External services — setup checklist

Everything below is something **you** create and configure; the code is already
wired to read these values. Secrets are set with the Supabase CLI, never in code.

## 1. Supabase (required)

Project: **PlegoHR** — ref `czxkbihwjqkcrjsobuji` (already linked in `supabase/config.toml`).

- [ ] **Restore the project**: it is currently `INACTIVE` (paused).
      Dashboard → https://supabase.com/dashboard → PlegoHR → Restore project.
      While paused, DNS/API/CLI deploys all fail.
- [ ] **Apply migrations**: `npx supabase db push`
      (pending: `supabase/migrations/20260930000000_security_hardening.sql` —
      RLS/Tenant hardening + invitation RPCs, and
      `supabase/migrations/20260930000001_documents_signing.sql` —
      internal document signature + `sign_document` RPC).
- [ ] **Deploy the invitation function**: `npx supabase functions deploy send-employee-invitation`
- [ ] **Auth → URL Configuration**
      - Site URL: production URL (e.g. `https://tu-dominio.com`), dev: `http://localhost:5173`
      - Redirect URLs: add `http://localhost:5173/**` and `https://tu-dominio.com/**`
        (needed for password reset and invitation email confirmation).
- [ ] **Auth → Email (optional but recommended)**: custom SMTP if you expect more
      than a few sign-ups/reset emails per hour (free tier Supabase SMTP is rate-limited).

## 2. Resend — invitation emails (required for real delivery)

Used by `supabase/functions/send-employee-invitation` to send the
"set your password" link.

- [ ] Create account → https://resend.com
- [ ] Verify your sending domain (Domain → Add domain → DNS records).
      For a quick test you can send from `onboarding@resend.dev` (Resend's
      sandbox domain, no DNS needed, delivers only to your own Resend account email).
- [ ] Create an API key → https://resend.com/api-keys
- [ ] Set the secrets:

```bash
npx supabase secrets set \
  RESEND_API_KEY=re_xxx_xxxxxxxxxxxx \
  "EMAIL_FROM=PlegoHR <onboarding@yourdomain.com>" \
  APP_URL=https://your-domain.com
```

- [ ] Verify: invite an employee from the dashboard. If `RESEND_API_KEY` is not
      set, the function still creates the invitation and returns the link so you
      can share it manually (`delivery: "unconfigured"`).

## 3. Client environment

Copy `.env.example` → `.env` and fill in:

| Var | Where to get it |
|-----|-----------------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `VITE_APP_URL` | Your public app URL (invitation links) |

## 4. Not needed yet (planned)

- **E-signature provider** (documents WS): internal signature first; the schema
  will carry `provider`/`provider_signature_id` so an external signer can be added later.
- **SMS/2FA**: not used.
