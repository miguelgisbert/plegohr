# Setup del Nou Projecte Supabase - PlegoHR

## ✅ Status Actual

- ✅ Variables d'entorn actualitzades a `.env`
- ⏳ Taules de BD no creades (nou projecte)
- ⏳ Funció de "Forgot Password" no implementada

## 📊 Crear les Taules

### **Opció A: Usar Supabase SQL Editor (Recomanat per rapidesa)**

1. **Anar a Supabase Dashboard**
   - URL: https://supabase.co/dashboard
   - Seleccionar projecte: `plegohr` (czxkbihwjqkcrjsobuji)

2. **SQL Editor → New Query**

3. **Copiar i executar cada migration en ordre**:
   1. `20251121150408_create_initial_schema.sql` (core tables)
   2. `20251201130342_fix_infinite_recursion_rls_policies.sql` (fix RLS)
   3. `20251201221513_add_employee_invitations.sql` (invitations)
   4. `20251202170826_create_documents_table.sql` (documents)
   5. `20251202171135_create_documents_storage_bucket.sql` (storage)
   6. `20251202172056_create_leave_requests_table.sql` (leave)

4. **Verificar**: Anar a `Database` → `Tables` i veure totes les taules creades

### **Opció B: Usar Supabase CLI (Més robust)**

```bash
# 1. Instalar CLI (si no tens)
npm install -g supabase

# 2. Login
supabase login

# 3. Link a projecte remot
cd /home/miguel/dev/plegohr
supabase link --project-ref czxkbihwjqkcrjsobuji

# 4. Push migrations (es copien automàticament)
supabase db push

# 5. Verificar
supabase db pull
```

## 🔐 Configurar Autenticació (Important!)

### **Email Confirmation (Opcional pero recomanat)**

1. **Anar a Settings → Authentication**
2. **Email Templates**:
   - Customize "Confirm signup" template
   - Customize "Password reset" template
3. **Email Settings**:
   - Seleccionar "Custom SMTP" (si tens) o "Supabase Auth"

### **Allowed Redirect URLs** (CRÍTICO)

1. **Settings → Authentication → URL Configuration**
2. **Afegir URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/login
   http://localhost:5173/accept-invitation
   http://localhost:5173/reset-password
   ```
3. **Per producció**, afegir:
   ```
   https://plegohr.com
   https://plegohr.com/login
   https://plegohr.com/accept-invitation
   https://plegohr.com/reset-password
   ```

## 🔑 Storage Bucket per Documents

Si la migration de storage no va bé:

1. **Storage → New Bucket**
2. **Name**: `documents`
3. **Public**: NO (deixar private)
4. **Create bucket**

## ✅ Checklist Setup

- [ ] Variables `.env` actualitzades
- [ ] Totes les migrations executades (6 en total)
- [ ] Taules creades correctament
- [ ] Auth configuration completada
- [ ] Storage bucket creat
- [ ] RLS policies habilitades
- [ ] Test de connexió

## 🧪 Test de Connexió

Executar a terminal:

```bash
cd /home/miguel/dev/plegohr
npm run dev
```

Anar a http://localhost:5173/signup i provar registre. Si funciona, todo correcte!

---

## Funció de "Forgot Password"

Després de completar el setup, implementarem:

1. ✅ Nova pàgina: `/forgot-password`
2. ✅ Nova pàgina: `/reset-password`
3. ✅ Email amb link de reset
4. ✅ Formulari per entrar nova contrasenya

Això ja està preparat per implementar!
