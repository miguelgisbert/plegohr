# 🚀 Guia Pas a Pas: Setup Supabase per PlegoHR

## Situació Actual
- ✅ Variables `.env` configurades
- ❌ No hi ha taules a la base de dades
- ❌ Cal executar 6 migrations SQL

---

## 📋 Passos per Crear les Taules

### **Pas 1: Obre el SQL Editor**

1. Al dashboard de Supabase (on ets ara)
2. Barra lateral esquerra → Click **"SQL Editor"** (icona `</>`)
3. Click botó verd **"+ New query"** (a dalt a la dreta)

---

### **Pas 2: Executar Migration 1 (Core Schema)**

1. **Obre el fitxer** al teu VS Code:
   ```
   supabase/migrations/20251121150408_create_initial_schema.sql
   ```

2. **Selecciona TOT el contingut** (Ctrl+A)

3. **Copia** (Ctrl+C)

4. **Enganxa** al SQL Editor de Supabase

5. **Click "RUN"** (o Ctrl+Enter)

6. **Verifica**: Hauries de veure missatge verd "Success. No rows returned"

7. **Comprova les taules**:
   - Sidebar → Database → Tables
   - Hauries de veure: `companies`, `profiles`, `employees`

---

### **Pas 3: Executar Migration 2 (Fix RLS)**

1. SQL Editor → **"+ New query"**

2. **Obre el fitxer**:
   ```
   supabase/migrations/20251201130342_fix_infinite_recursion_rls_policies.sql
   ```

3. Copia tot → Enganxa → Run

4. Verifica "Success"

---

### **Pas 4: Executar Migration 3 (Invitations)**

1. SQL Editor → **"+ New query"**

2. **Obre el fitxer**:
   ```
   supabase/migrations/20251201221513_add_employee_invitations.sql
   ```

3. Copia tot → Enganxa → Run

4. **Comprova**: Database → Tables → Hauries de veure `employee_invitations`

---

### **Pas 5: Executar Migration 4 (Documents)**

1. SQL Editor → **"+ New query"**

2. **Obre el fitxer**:
   ```
   supabase/migrations/20251202170826_create_documents_table.sql
   ```

3. Copia tot → Enganxa → Run

4. **Comprova**: Tables → Hauries de veure `documents`

---

### **Pas 6: Executar Migration 5 (Storage Bucket)**

1. SQL Editor → **"+ New query"**

2. **Obre el fitxer**:
   ```
   supabase/migrations/20251202171135_create_documents_storage_bucket.sql
   ```

3. Copia tot → Enganxa → Run

4. **Comprova**: 
   - Sidebar → Storage
   - Hauries de veure bucket `documents`

---

### **Pas 7: Executar Migration 6 (Leave Requests)**

1. SQL Editor → **"+ New query"**

2. **Obre el fitxer**:
   ```
   supabase/migrations/20251202172056_create_leave_requests_table.sql
   ```

3. Copia tot → Enganxa → Run

4. **Comprova**: Tables → Hauries de veure `leave_requests`

---

## ✅ Verificació Final

### **Comprova que tens TOTES les taules:**

Al sidebar → Database → Tables:

- ✓ `companies`
- ✓ `profiles`
- ✓ `employees`
- ✓ `employee_invitations`
- ✓ `documents`
- ✓ `leave_requests`

### **Comprova Storage:**

Al sidebar → Storage:

- ✓ `documents` (bucket)

---

## 🧪 Test Ràpid

Executa aquest SQL per verificar que tot funciona:

```sql
SELECT 
    'companies' as table_name, 
    COUNT(*) as count 
FROM companies
UNION ALL
SELECT 
    'profiles' as table_name, 
    COUNT(*) as count 
FROM profiles
UNION ALL
SELECT 
    'employees' as table_name, 
    COUNT(*) as count 
FROM employees
UNION ALL
SELECT 
    'employee_invitations' as table_name, 
    COUNT(*) as count 
FROM employee_invitations
UNION ALL
SELECT 
    'documents' as table_name, 
    COUNT(*) as count 
FROM documents
UNION ALL
SELECT 
    'leave_requests' as table_name, 
    COUNT(*) as count 
FROM leave_requests;
```

**Si s'executa sense errors → Tot està bé! ✅**

---

## 🎯 Després del Setup

### **Configurar Authentication URLs**

1. Settings → Authentication → URL Configuration

2. **Afegir Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/reset-password
   http://localhost:5173/accept-invitation
   ```

3. **Per producció** (quan facis deploy):
   ```
   https://plegohr.com
   https://plegohr.com/reset-password
   https://plegohr.com/accept-invitation
   ```

---

## 🚀 Provar l'App

```bash
cd /home/miguel/dev/plegohr
npm run dev
```

Anar a: http://localhost:5173

### **Test 1: Registrar Company Admin**
1. Click "Registrar-se"
2. Emplenar formulari:
   - Company Name: Test Company
   - Full Name: Admin Test
   - Email: admin@test.com
   - Password: password123
3. Hauria de redirigir a `/dashboard`

### **Test 2: Verificar BD**
1. Tornar a Supabase Dashboard
2. Database → Table Editor → `companies`
3. Hauries de veure la teva empresa creada
4. Table Editor → `profiles`
5. Hauries de veure el perfil amb `role = 'admin'`

---

## ❓ Problemes Comuns

### "relation does not exist"
- **Causa**: Migration no executada
- **Solució**: Executar la migration corresponent

### "RLS policy error"
- **Causa**: RLS policies no aplicades
- **Solució**: Executar migration 2 (fix RLS)

### "Email not sent"
- **Causa**: Email config no completada
- **Solució**: Settings → Authentication (Supabase gestiona emails automàticament)

---

## 📞 Següents Passos

Després del setup:
1. ✅ Test de registre (admin)
2. ✅ Test de login
3. ✅ Test d'invitació d'empleat
4. ✅ Test de password reset
5. 🚀 Començar a usar l'app!

---

**Status Actual**: ⏳ Pendent d'executar migrations
**Temps estimat**: 5-10 minuts
**Dificultat**: Fàcil (només copy/paste)
