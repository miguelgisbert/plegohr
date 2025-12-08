# 📋 Checklist Final - Setup Nou Projecte Supabase

## Status Actual ✅
- ✅ Codi complert (autenticació + password reset)
- ✅ Build success (sense errors)
- ✅ Variables `.env` actualitzades
- ⏳ **Supabase setup** (PENDENT)

---

## 🚀 TASQUES PENDENTS (CRÍTICAS)

### 1. Crear les Taules a Supabase (URGENT!)

**Opció A: Via Dashboard Supabase (Més fàcil)**

1. Anar a: https://supabase.co/dashboard
2. Entrar amb les teves credencials
3. Seleccionar projecte `plegohr` (czxkbihwjqkcrjsobuji)
4. SQL Editor → "New Query"
5. Copiar i executar els fitxers SQL en aquest ordre:

```
1. /supabase/migrations/20251121150408_create_initial_schema.sql
   └─ Crea: profiles, companies, employees tables
   └─ Crea: RLS policies, functions, triggers

2. /supabase/migrations/20251201130342_fix_infinite_recursion_rls_policies.sql
   └─ Fix per infinit recursion

3. /supabase/migrations/20251201221513_add_employee_invitations.sql
   └─ Crea: employee_invitations table

4. /supabase/migrations/20251202170826_create_documents_table.sql
   └─ Crea: documents table

5. /supabase/migrations/20251202171135_create_documents_storage_bucket.sql
   └─ Crea: documents storage bucket

6. /supabase/migrations/20251202172056_create_leave_requests_table.sql
   └─ Crea: leave_requests table
```

6. Doble-check: Database → Tables (haurien de veure 6 taules)

**Opció B: Via CLI (Més robust)**

```bash
cd /home/miguel/dev/plegohr
supabase login          # Login amb compte Supabase
supabase link --project-ref czxkbihwjqkcrjsobuji
supabase db push        # Pushes all migrations
```

### 2. Configurar Allowed Redirect URLs (CRÍTICO!)

Sense això, els links d'email NO FUNCIONARAN.

1. Anar a: https://supabase.co/dashboard
2. Entrar al projecte `plegohr`
3. Settings → Authentication → URL Configuration
4. "Redirect URLs" → Add URL:

```
http://localhost:5173
http://localhost:5173/login
http://localhost:5173/accept-invitation
http://localhost:5173/reset-password
```

(Per producció més tard, afegir les URLs reals de dominio)

### 3. Verificar Storage Bucket (Opcional)

1. Storage → Buckets
2. Hauria d'existir: `documents`
3. Si no, crear-lo: Name: `documents`, Public: NO

---

## 🧪 Testing Després de Setup

### Test 1: Registre Company Admin

```
1. Anar a: http://localhost:5173/signup
2. Omplir:
   - Company Name: Test Corp
   - Full Name: John Admin
   - Email: admin@test.com
   - Password: password123
   
3. Click "Register"
4. Hauria de redirigir a /dashboard (admin dashboard)
5. Veure empresa i lliesta (buida) d'empleats
```

### Test 2: Invitar Empleat

```
1. A /dashboard, click "+ Add Employee"
2. Omplir:
   - Email: emp@test.com
   - Full Name: Jane Emp
   - Position: Developer
   - Department: Eng
   
3. Click "Send Invitation"
4. Verificar a Supabase que invitació està creat
```

### Test 3: Password Reset Flow

```
1. Anar a: http://localhost:5173/login
2. Click "Forgot password?" link
3. Introduir email: admin@test.com
4. Click "Send Reset Link"
5. Mensage: "Check your email"

6. A Supabase Dashboard → Authentication → Users
7. Click usuari admin@test.com
8. Copiar URL de "Reset Password" link (si visible)
9. Pegar a navegador: http://localhost:5173/reset-password?token=...
10. Introduir nova contrasenya
11. Click "Reset Password"
12. Hauria de mostrar success i redirigir a login
13. Login amb nova contrasenya
```

---

## 📚 Documents Importants

Aquests documents contenen info detallada:

- **SETUP_NEW_SUPABASE.md** - Setup instruccions
- **PASSWORD_RESET_FEATURE.md** - Password reset details
- **AUTHENTICATION_SETUP.md** - Auth system overview
- **AUTHENTICATION_FLOW.md** - Flux diagrams
- **DEVELOPMENT_GUIDE.md** - Dev instructions
- **DEPLOYMENT_GUIDE.md** - Deploy instructions

---

## 🔑 Variables d'Entorn

Ja actualitzades al `.env`:

```env
VITE_SUPABASE_URL=https://czxkbihwjqkcrjsobuji.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
```

---

## 🎯 Ordre de Tasques Recomanat

1. ✅ **AHORA**: Crear taules (SQL migrations)
   - Tiempo: ~5-10 min
   - Criticitat: 🔴 CRÍTICA

2. ✅ **AHORA**: Configurar Redirect URLs
   - Tiempo: ~2 min
   - Criticitat: 🔴 CRÍTICA

3. ⏳ **Quan tingues 10 min**: Provar flows (signup, login, password reset)
   - Tiempo: ~10 min
   - Criticitat: 🟠 Alta

4. ⏳ **Opcional**: Actualitzar traduccions
   - Tempo: ~5 min
   - Criticitat: 🟡 Baixa

---

## ⚠️ Problemes Comuns & Solucions

### "Profile not found" al login
**Causa**: Taules no creades
**Solució**: Executar las migrations SQL

### "Invalid Recovery Token" email
**Causa**: Redirect URLs no configurades
**Solució**: Configurar Allowed Redirect URLs a Supabase

### Email no arriba
**Causa**: Supabase email provider no configurat
**Solució**: A Supabase → Settings → Email, verificar que està enabled

### RLS Policy Error
**Causa**: RLS policies no aplicades
**Solució**: Verificar que migrations s'han executat correctament

---

## 🚀 Pròxim Desarrollo

Una vegada el setup estigui fet, pots continuar amb:

1. ⏳ Implementar cronòmetre de hores (ja té interfície)
2. ⏳ Gestió de documents
3. ⏳ Sistema de permisos (leave requests)
4. ⏳ Reportes i estadístiques

---

## 📞 Suport Útil

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Password Reset**: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ Verificació Final

Quan acabis de fer els passos, pots verificar:

```bash
# Terminal
npm run dev

# Browser
http://localhost:5173

# Check:
- ✅ Landing page carrega
- ✅ Puc anar a /login
- ✅ Puc anar a /signup
- ✅ Puc anar a /forgot-password
- ✅ Build sense errors: npm run build
```

---

**Última actualització**: 8 de desembre 2025
**Status actual**: Pendent setup Supabase (5-10 min)
**Siguiente paso**: Crear taules! 🎉
