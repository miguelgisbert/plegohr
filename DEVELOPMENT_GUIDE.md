# Instruccions per Continuar el Desenvolupament - PlegoHR

## Status Actual ✅

L'autenticació i control d'accés estan completament funcionals:

- ✅ Login/Signup amb validació de rol
- ✅ Rutes protegides per rol de l'usuari
- ✅ Sistema d'invitacions d'empleats
- ✅ Redireccio automàtica segons rol (admin → dashboard, employee → employee-dashboard)

## Estructura del Projecte

```
plegohr/
├── src/
│   ├── contexts/
│   │   ├── AuthContext.tsx          (🆕 amb role i companyId)
│   │   └── ThemeContext.tsx
│   ├── components/
│   │   └── common/
│   │       ├── ProtectedRoute.tsx   (🆕 amb validació de rol)
│   │       └── ...
│   ├── pages/
│   │   ├── LoginPage.tsx            (🆕 redirecciona per rol)
│   │   ├── SignupPage.tsx           (🆕 redirecciona per rol)
│   │   ├── DashboardPage.tsx        (🆕 protegida com admin)
│   │   ├── EmployeeDashboardPage.tsx (🆕 protegida com employee)
│   │   ├── AcceptInvitationPage.tsx (🆕 assigna rol employee)
│   │   ├── CompanyDocumentsPage.tsx
│   │   ├── EmployeeDocumentsPage.tsx
│   │   ├── CompanyLeavePage.tsx
│   │   └── EmployeeLeavePage.tsx
│   └── App.tsx                      (🆕 rutes amb ProtectedRoute)
├── supabase/
│   ├── functions/
│   │   └── send-employee-invitation/
│   └── migrations/
│       ├── 20251121150408_create_initial_schema.sql
│       ├── 20251201130342_fix_infinite_recursion_rls_policies.sql
│       ├── 20251201221513_add_employee_invitations.sql
│       ├── 20251202170826_create_documents_table.sql
│       ├── 20251202171135_create_documents_storage_bucket.sql
│       └── 20251202172056_create_leave_requests_table.sql
└── ...
```

## Pròximes Característiques a Desenvolupar

### 1. Cronòmetre d'Hores de Treball (Principal Feature)
**Ubicació**: `src/pages/EmployeeDashboardPage.tsx` (ja té estructura)

Ja té botons per iniciar/pausar, però necessita:
- ✅ Interfície visual (ja implementada)
- ⏳ Persistència de dades a BD (taula `time_entries` o similar)
- ⏳ Visualització d'historial diari/setmanal/mensual
- ⏳ Exportació de dades (PDF/CSV)

**Passos**:
1. Crear taula `time_entries` a migrations
2. Guardar el start/end de cada sessió a BD
3. Mostrar historial a empleat i admin

### 2. Gestió de Documents
**Ubicació**: `src/pages/CompanyDocumentsPage.tsx` i `src/pages/EmployeeDocumentsPage.tsx`

Ja existeixen les taules (`documents` i storage bucket).

**Passos**:
1. Implementar upload de documents
2. Llistar documents (admin veu tota l'empresa, employee veu només els seus)
3. Descàrrega de documents
4. Eliminació (sol admin)

### 3. Sistema de Permisos/Leave Requests
**Ubicació**: `src/pages/CompanyLeavePage.tsx` i `src/pages/EmployeeLeavePage.tsx`

Ja existeix la taula `leave_requests`.

**Passos**:
1. Formulari per sol·licitar permís (employee)
2. Llistar sol·licituds (admin aprova/rebutja)
3. Visualització de permisos sol·licitats i aprovats
4. Càlcul de dies restants

### 4. Funcionalitats Addicionals
- Sistema de notificacions/invitacions
- Reportes de productivitat
- Gestió de múltiples empleats
- Historial d'activitats

## Com Executar Localment

### Prerequisites
- Node.js 18+
- npm o pnpm
- Compte Supabase (ja configurat)

### Setup
```bash
cd /home/miguel/dev/plegohr

# Instalar dependencies (si no estan)
npm install

# Crear fitxer .env.local
# (copiar VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY)

# Executar en mode development
npm run dev

# Build per producció
npm run build

# Preview de build
npm run preview
```

## Variables d'Entorn

Crear `.env.local`:
```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

## Testing Local

### Test 1: Company Admin Registration
```
1. Anar a http://localhost:5173/signup
2. Registrar-se com:
   - Company Name: Test Company
   - Full Name: John Admin
   - Email: admin@test.com
   - Password: password123

3. Hauria de redirigir a /dashboard (admin dashboard)
4. Veure la llistra d'empleats (buida al principi)
```

### Test 2: Employee Invitation
```
1. Desde /dashboard admin, afegir empleat:
   - Email: employee@test.com
   - Full Name: Jane Employee
   - Position: Developer
   - Department: Engineering

2. Sistema enviaria email (o veure en logs)
3. Employee rep link: /accept-invitation?token=xxx

4. Accepta invitació i crea contrasenya
5. Login amb credentials
6. Hauria de redirigir a /employee-dashboard
7. Veure cronòmetre funcionant
```

### Test 3: Role-Based Access Control
```
1. Loguejar com employee

2. Intentar accedir a:
   - /dashboard → redirigeix a /employee-dashboard ✓
   - /documents → redirigeix a /employee-dashboard ✓
   - /leave → redirigeix a /employee-dashboard ✓

3. Accedir a:
   - /employee-dashboard → carrega ✓
   - /employee-documents → carrega ✓
   - /employee-leave → carrega ✓

4. Logout i login com admin

5. Intentar accedir a:
   - /employee-dashboard → redirigeix a /dashboard ✓
   - /employee-documents → redirigeix a /dashboard ✓
   - /employee-leave → redirigeix a /dashboard ✓
```

## Estructura de Dades

### User Roles
- **admin**: Propietari/gestió de l'empresa. Accés a dashboard de company, empleats, documents, permisos
- **employee**: Empleat. Accés a dashboard personal, cronòmetre, els seus documents, sol·licitar permisos

### Company-Based Access
- Cada usuari pertany a una empresa (excepte admins sense empresa al crear)
- RLS policies asseguren que sol es pot veure dades de la propria empresa

## API Endpoints (Supabase Functions)

### Enviament de Invitacions
- Path: `supabase/functions/send-employee-invitation/`
- Aquesta funció ja està implementada i envia l'email d'invitació

## Convencions de Codi

- TypeScript per tot
- Componets funcionals amb hooks
- `useAuth()` per accedir al context
- `ProtectedRoute` per protegir routes
- Tailwind CSS per estilos
- i18n per traduccions (ca, en, es)

## Problemes Comuns i Solucions

### "Profile not found" al login
- **Causa**: La trigger no ha creat el profile prou ràpid
- **Solució**: Els delays de 500ms estan implementats, però si persisteix, revisar BD

### RLS Policy Error
- **Causa**: Policies no permeten la operació
- **Solució**: Revisar RLS policies a migrations

### Email no es rep
- **Causa**: Supabase email no configurat o funció no deployada
- **Solució**: Verificar config a Supabase dashboard

## Commits Git

Tot està a branca `main`. Fer commits regularment:

```bash
git add .
git commit -m "feat: description of changes"
git push origin main
```

## Recursos Útils

- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [i18next](https://www.i18next.com/)
