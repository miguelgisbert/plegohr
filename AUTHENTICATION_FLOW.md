# Diagrama de Flux - PlegoHR Authentication

## Flux d'Autenticació General

```
Usuario sin autenticar
        ↓
    [Landing Page]
        ↓
    ┌───┴───┐
    ↓       ↓
[Login]  [Signup]
    ↓       ↓
    └───┬───┘
        ↓
   [AuthContext]
   - signIn/signUp
   - Obtenir rol de profile
   - Guardar role + companyId
        ↓
    [ProtectedRoute]
    - Verificar role
    - Verificar permisos
        ↓
   ┌──────┴──────┐
   ↓             ↓
[Admin    [Employee
 Dashboard] Dashboard]
```

## Company Admin Registration Flow

```
┌─────────────────────────────────────────┐
│  Signup Page (/signup)                  │
│  - Company Name                         │
│  - Full Name                            │
│  - Email                                │
│  - Password                             │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  AuthContext.signUp()                   │
├─────────────────────────────────────────┤
│ 1. supabase.auth.signUp({              │
│      email, password,                   │
│      data: { full_name, company_name }  │
│    })                                   │
│    → Crea auth.users                    │
│    → Trigger crea profiles (role=null)  │
│                                         │
│ 2. Crea companies                       │
│    → INSERT owner_id, name              │
│                                         │
│ 3. Actualitza profile                   │
│    → role = 'admin'                     │
│    → company_id = company.id            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  SignupPage - Espera 500ms              │
│  - Carrega role del AuthContext         │
│  - role === 'admin' ?                   │
└──────────────┬──────────────────────────┘
               ↓
         navigate('/dashboard')
               ↓
┌─────────────────────────────────────────┐
│  ProtectedRoute                         │
│  - requiredRole = 'admin'               │
│  - user?.role === 'admin' ?             │
│  - YES → ✓ Renderitza DashboardPage    │
│  - NO → navigate('/employee-dashboard') │
└──────────────┬──────────────────────────┘
               ↓
    ✅ Company Admin Dashboard Loaded
```

## Employee Registration (via Invitation) Flow

```
┌────────────────────────────────────────────────┐
│ Admin Dashboard (/dashboard)                   │
│ - Affegir nou empleat                          │
│   → Crea entrada a employees table             │
│   → Genera email + invitació                   │
└────────────────┬──────────────────────────────┘
                 ↓
    Employee rep email amb link:
    /accept-invitation?token=xxxxx
                 ↓
┌────────────────────────────────────────────────┐
│ AcceptInvitationPage                           │
│ - Verificar token és valid                     │
│ - Formulari per entrar contrasenya             │
└────────────────┬──────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ handleAcceptInvitation()                       │
├────────────────────────────────────────────────┤
│ 1. supabase.auth.signUp({                     │
│      email: invitation.email,                  │
│      password                                  │
│    })                                          │
│    → Crea auth.users                           │
│    → Trigger crea profiles (role='employee')   │
│                                                │
│ 2. Espera 500ms per a la trigger               │
│                                                │
│ 3. Actualitza employees                        │
│    → user_id = new_user.id                     │
│                                                │
│ 4. Obtenir employee.company_id                 │
│                                                │
│ 5. Actualitza profile                          │
│    → role = 'employee'                         │
│    → company_id = employee.company_id          │
│                                                │
│ 6. Actualitza employee_invitations             │
│    → status = 'accepted'                       │
│    → accepted_at = now()                       │
└────────────────┬──────────────────────────────┘
                 ↓
         navigate('/login')
                 ↓
┌────────────────────────────────────────────────┐
│ Employee fes login amb credentials             │
└────────────────┬──────────────────────────────┘
                 ↓
           LoginPage (/login)
                 ↓
┌────────────────────────────────────────────────┐
│ AuthContext.signIn()                           │
│ - supabase.auth.signInWithPassword()           │
│ - AuthContext carrega role del profile        │
│   → role = 'employee'                          │
│   → companyId = employee.company_id            │
└────────────────┬──────────────────────────────┘
                 ↓
         SignupPage espera 500ms
         (role ja carregat)
                 ↓
      navigate('/employee-dashboard')
                 ↓
┌────────────────────────────────────────────────┐
│ ProtectedRoute                                 │
│ - requiredRole = 'employee'                    │
│ - user?.role === 'employee' ?                  │
│ - YES → ✓ Renderitza EmployeeDashboardPage   │
│ - NO → navigate('/dashboard')                  │
└────────────────┬──────────────────────────────┘
                 ↓
   ✅ Employee Dashboard Loaded (Cronòmetre)
```

## Role-Based Access Control (ProtectedRoute)

```
┌──────────────────────────────────────────┐
│ User intenta accedir a ruta protegida    │
└────────────┬─────────────────────────────┘
             ↓
    ┌────────────────────────┐
    │ AuthContext.loading?   │
    └────────┬───────────────┘
             │
        YES  │  NO
            ↓  ↓
         [Spinner]  user === null?
                        ↓
                   YES  │  NO
                       ↓  ↓
            navigate('/login')  requiredRole?
                                    ↓
                            role === requiredRole?
                                    ↓
                            YES  │  NO
                               ↓  ↓
                         [Render]  role === 'admin'?
                                       ↓
                               YES  │  NO
                                  ↓  ↓
                      navigate('/dashboard')
                         role === 'employee'?
                                   ↓
                           YES  │  NO
                              ↓  ↓
                   navigate('/employee-dashboard')
                              navigate('/login')
```

## Database Schema Relationship

```
┌─────────────────────────┐
│  auth.users (Supabase)  │
│  - id (PK)              │
│  - email                │
│  - password (hashed)    │
└──────────────┬──────────┘
               │
               │ (ON DELETE CASCADE)
               ↓
        ┌────────────────────────┐
        │  profiles              │
        │  - id (FK auth.users)  │
        │  - full_name           │
        │  - role (admin/emp)    │
        │  - company_id (FK)     │
        └────────┬───────────────┘
                 │
      ┌──────────┴──────────┐
      ↓                     ↓
   ┌──────────────┐    ┌──────────────────┐
   │  companies   │    │  employees       │
   │  - id (PK)   │    │  - id (PK)       │
   │  - name      │    │  - company_id(FK)│
   │  - owner_id  │    │  - user_id (FK)  │
   │    (FK auth) │    │  - full_name     │
   └──────┬───────┘    │  - email         │
          │            │  - position      │
          │            │  - department    │
          │            │  - hire_date     │
          │            │  - status        │
          │            └────────┬─────────┘
          │                     │
          │            (ON DELETE CASCADE)
          │                     ↓
          │      ┌──────────────────────────┐
          │      │ employee_invitations     │
          │      │ - id (PK)                │
          │      │ - employee_id (FK)       │
          │      │ - email                  │
          │      │ - token                  │
          │      │ - status (pending/acc.)  │
          │      │ - invited_by (FK auth)   │
          │      │ - expires_at             │
          │      └──────────────────────────┘
          │
          │ (Owns)
          └─────> [Documentos, Leave Requests, Time Entries]
```

## State Management (AuthContext)

```
┌────────────────────────────────────────┐
│  AuthContext State                     │
├────────────────────────────────────────┤
│ - user: User | null                    │
│ - session: Session | null              │
│ - loading: boolean                     │
│ - role: 'admin' | 'employee' | null    │
│ - companyId: string | null             │
├────────────────────────────────────────┤
│  Methods                               │
│ - signIn(email, password)              │
│ - signUp(email, password, ...)         │
│ - signInWithGoogle()                   │
│ - signInWithLinkedIn()                 │
│ - signOut()                            │
│ - loadUserProfile(userId)              │
└────────────────────────────────────────┘
        ↓
  ┌─────────────────────────────────────┐
  │ useAuth() Hook                      │
  │ Utilitzat a totes les pages/comps   │
  └─────────────────────────────────────┘
```

## Route Structure

```
/                    [PUBLIC]  LandingPage
/login              [PUBLIC]  LoginPage
/signup             [PUBLIC]  SignupPage
/accept-invitation  [PUBLIC]  AcceptInvitationPage (protegida per token)

/dashboard          [ADMIN]   DashboardPage (requiredRole="admin")
/documents          [ADMIN]   CompanyDocumentsPage (requiredRole="admin")
/leave              [ADMIN]   CompanyLeavePage (requiredRole="admin")

/employee-dashboard [EMP]     EmployeeDashboardPage (requiredRole="employee")
/employee-documents [EMP]     EmployeeDocumentsPage (requiredRole="employee")
/employee-leave     [EMP]     EmployeeLeavePage (requiredRole="employee")
```

## Time Synchronization Points

```
Timeline:
1. User signup/login → Auth event
   ├─ 0ms:    Auth success, user state updated
   ├─ 0ms:    loadUserProfile() called
   ├─ ~50ms:  Supabase query returns role
   ├─ ~50ms:  role state updated
   ├─ ~500ms: LoginPage/SignupPage delay ends
   └─ ~500ms: navigate() based on role

2. Email invitation → User accepts
   ├─ 0ms:    supabase.auth.signUp()
   ├─ 100ms:  auth.users created
   ├─ 100ms:  Trigger fires, profile created
   ├─ 500ms:  Esperem a que el profile sigui disponible
   ├─ 500ms:  Update profile amb role + company_id
   └─ 600ms:  navigate('/login')

3. Employee login → Redirect
   ├─ 0ms:    Login success
   ├─ 50ms:   Role carregat
   ├─ 500ms:  Navigate a dashboard
   └─ 700ms:  Dashboard rendered
```

Esta estructura garantiza que:
- ✅ El rol sempre s'ha carregat abans de redirigir
- ✅ Les RLS policies funcionaran correctament (rol i company_id existents)
- ✅ No hi ha race conditions
- ✅ L'experiència d'usuari és suau
