# Configuració d'Autenticació - PlegoHR

## Canvis Realitzats ✅

### 1. AuthContext (`src/contexts/AuthContext.tsx`)
- ✅ Afegit `role` ('admin' | 'employee' | null) a l'interface AuthContextType
- ✅ Afegit `companyId` al context
- ✅ Afegida funció `loadUserProfile()` que obté el rol i company_id del perfil de l'usuari
- ✅ Carregat el perfil quan l'usuari fes login/signup
- ✅ Carregat el perfil quan l'autenticació canvia (onAuthStateChange)

### 2. ProtectedRoute (`src/components/common/ProtectedRoute.tsx`)
- ✅ Afegit paràmetre `requiredRole` per validar accés per rol
- ✅ Si l'usuari no té el rol requerit, es redirigeix al seu dashboard corresponent
- ✅ Si l'usuari no té rol, es redirigeix al login

### 3. App.tsx
- ✅ Afegit import de `ProtectedRoute`
- ✅ Protegides totes les rutes amb `ProtectedRoute` i `requiredRole`
- ✅ Rutes de company (admin): `/dashboard`, `/documents`, `/leave`
- ✅ Rutes d'employee: `/employee-dashboard`, `/employee-documents`, `/employee-leave`

### 4. LoginPage (`src/pages/LoginPage.tsx`)
- ✅ Afegit delay de 500ms després del login per deixar que es carregue el rol
- ✅ Redirecciona a `/dashboard` si role = 'admin'
- ✅ Redirecciona a `/employee-dashboard` si role = 'employee'

### 5. SignupPage (`src/pages/SignupPage.tsx`)
- ✅ Afegit delay de 500ms després del signup per deixar que es carregue el rol
- ✅ Redirecciona a `/dashboard` si role = 'admin'
- ✅ Redirecciona a `/employee-dashboard` si role = 'employee'

### 6. AcceptInvitationPage (`src/pages/AcceptInvitationPage.tsx`)
- ✅ Quan es crea el compte d'un empleat via invitació:
  - Actualitza el profile amb `role: 'employee'`
  - Actualitza el profile amb `company_id` de l'empleat

## Flujo d'Autenticació

### Company Admin (registre via SignupPage)
1. L'admin registra empresa + dades personals a `/signup`
2. `AuthContext.signUp()` crea:
   - Compte a `auth.users`
   - Perfil a `profiles` (automàticament via trigger)
   - Empresa a `companies`
   - Actualitza el perfil amb `role: 'admin'` i `company_id`
3. SignupPage espera 500ms per carregat el rol
4. Redirigeix a `/dashboard` (protegit amb `requiredRole="admin"`)
5. El dashboard de company es mostra

### Employee (via invitació)
1. L'admin convida l'empleat a través de `/dashboard`
2. L'empleat rep email amb link a `/accept-invitation?token=xxx`
3. L'empleat accedeix al link i crea contrasenya
4. `AcceptInvitationPage.handleAcceptInvitation()`:
   - Crea compte a `auth.users`
   - Perfil creat automàticament via trigger
   - Actualitza el perfil amb `role: 'employee'` i `company_id`
   - Actualitza l'invitació a `status: 'accepted'`
   - Linka l'empleat amb el nou user_id
5. Redirigeix a `/login`
6. L'empleat fes login amb les seues credencials
7. LoginPage espera 500ms per carregat el rol
8. Redirigeix a `/employee-dashboard` (protegit amb `requiredRole="employee"`)
9. El dashboard d'empleat es mostra

## Control d'Accés

### ProtectedRoute
- **requiredRole="admin"**: Sol empleats amb `role = 'admin'` poden accedir
  - Si intenten accedir un employee, es redirigeix a `/employee-dashboard`
  - Si no ha iniciat sessió, es redirigeix a `/login`

- **requiredRole="employee"**: Sol empleats amb `role = 'employee'` poden accedir
  - Si intenten accedir un admin, es redirigeix a `/dashboard`
  - Si no ha iniciat sessió, es redirigeix a `/login`

- **requiredRole="any"**: Qualsevol usuari autenticat pot accedir

### Rutes Públiques
- `/` (LandingPage) - pública
- `/login` - pública
- `/signup` - pública
- `/accept-invitation` - pública (protegida per token d'invitació)

## Base de Dades

### Taula `profiles`
- `id` (uuid, PK)
- `full_name` (text)
- `company_id` (uuid, FK a companies)
- `role` (text) - 'admin' o 'employee'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Taula `companies`
- `id` (uuid, PK)
- `name` (text, unique)
- `owner_id` (uuid, FK a auth.users)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Taula `employees`
- `id` (uuid, PK)
- `company_id` (uuid, FK a companies)
- `user_id` (uuid, FK a auth.users, nullable)
- `full_name` (text)
- `email` (text)
- `position` (text)
- `department` (text, nullable)
- `hire_date` (date)
- `status` (text) - 'active', 'inactive', 'terminated'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Taula `employee_invitations`
- `id` (uuid, PK)
- `employee_id` (uuid, FK a employees)
- `email` (text)
- `token` (text, unique)
- `status` (text) - 'pending', 'accepted', 'expired'
- `invited_by` (uuid, FK a auth.users)
- `invited_at` (timestamptz)
- `accepted_at` (timestamptz, nullable)
- `expires_at` (timestamptz)

## Pròxims Passos

1. ✅ Login funcional amb validació de rol
2. ✅ Registre de company amb rol 'admin'
3. ✅ Registre d'empleats via invitació amb rol 'employee'
4. ✅ Control d'accés per ruta
5. ⏳ Implementar cronòmetre d'hores de treball
6. ⏳ Gestió de documents per empleats
7. ⏳ Sistema de sol·licitud de permisos (leave requests)

## Testing

### Test Company Admin Flow
```
1. Registrar-se a /signup amb:
   - Company Name: Test Corp
   - Full Name: John Admin
   - Email: admin@testcorp.com
   - Password: password123

2. Hauria de redirigir a /dashboard (company dashboard)

3. Logout i login de nou amb les mateixes credencials

4. Hauria de redirigir a /dashboard novament
```

### Test Employee Flow
```
1. Login com admin a /dashboard

2. Convida empleat (funcionalitat a DashboardPage)
   - Email: employee@testcorp.com
   - Full Name: Jane Employee
   - Position: Developer

3. Employee rep email amb link a /accept-invitation?token=xxx

4. Employee accepta invitació i crea contrasenya

5. Employee login amb credentials

6. Hauria de redirigir a /employee-dashboard

7. Si intenta accedir a /dashboard, hauria de redirigir a /employee-dashboard

8. Si intenta accedir a /employee-documents, hauria de carregar correctament
```
