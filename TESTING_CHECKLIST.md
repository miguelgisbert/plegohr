# Testing Checklist - PlegoHR Authentication

## Pre-Testing Setup

- [ ] Clonar repo / pull canvis més recents
- [ ] `npm install` per assegurar dependències
- [ ] `.env.local` amb SUPABASE_URL i ANON_KEY
- [ ] `npm run dev` - executa servidor local
- [ ] Obrir http://localhost:5173 al navegador

## Landing Page (/)

- [ ] Pàgina carrega sense errors
- [ ] Botó "Prova Gratuïta" funciona
- [ ] Botó "Més Informació" funciona
- [ ] Preview de totes les pàgines visibles
- [ ] Language switcher funciona
- [ ] Theme toggle funciona
- [ ] Botons funcionals
  - [ ] Company Dashboard
  - [ ] Company Documents
  - [ ] Company Leave
  - [ ] Employee Dashboard
  - [ ] Employee Documents
  - [ ] Employee Leave
- [ ] Navigation links
  - [ ] "Iniciar sessió" redirigeix a /login
  - [ ] "Registrar-se" redirigeix a /signup

## Login Page (/login)

### Comportament General
- [ ] Pàgina carrega correctament
- [ ] Camps de formulari visibles
  - [ ] Email input
  - [ ] Password input
  - [ ] Sign in button
- [ ] Botons socials visibles
  - [ ] Google sign in
  - [ ] LinkedIn sign in
- [ ] Link a signup funciona

### Testing Company Admin Login
1. [ ] Usar credencials d'admin creat anteriorment:
   - Email: `admin@test.com`
   - Password: `password123`

2. [ ] Login success
   - [ ] No errors
   - [ ] Redirigeix a `/dashboard` (admin)
   - [ ] Esperà és acceptat (500ms)

3. [ ] Dashboard admin carrega correctament
   - [ ] Veu empresa
   - [ ] Veu empleats
   - [ ] Botons funcionals

### Testing Employee Login
1. [ ] Login amb empleat (si ja existeix):
   - Email: `employee@test.com`
   - Password: (la que varen crear)

2. [ ] Login success
   - [ ] No errors
   - [ ] Redirigeix a `/employee-dashboard` (employee)

3. [ ] Employee dashboard carrega correctament
   - [ ] Cronòmetre visible
   - [ ] Botons de control funcionan

### Error Cases
- [ ] Email invalid → error message
- [ ] Password incorrect → error message
- [ ] Email no registrat → error message
- [ ] Camp buit → error message

## Signup Page (/signup)

### Comportament General
- [ ] Pàgina carrega correctament
- [ ] Camps visibles
  - [ ] Company Name
  - [ ] Full Name
  - [ ] Email
  - [ ] Password
  - [ ] Confirm Password
- [ ] Botons socials visibles
- [ ] Link a login funciona

### Testing New Company Registration
1. [ ] Ingressar dades noves:
   ```
   Company Name: Test Company 2
   Full Name: Admin Two
   Email: admin2@test.com (email nou)
   Password: password123
   Confirm Password: password123
   ```

2. [ ] Click "Register" button

3. [ ] Validació
   - [ ] Passwords mismatch → error
   - [ ] Password < 6 chars → error
   - [ ] Email ja existeix → Supabase error
   - [ ] Success message appears

4. [ ] Redireccio
   - [ ] Espera 500ms
   - [ ] Redirigeix a `/dashboard` (admin)
   - [ ] Nova empresa visible

### Testing Password Validation
- [ ] Password i confirm password iguals → accept
- [ ] Password != confirm → "Passwords do not match"
- [ ] Password < 6 chars → error message
- [ ] Password >= 6 chars → accept

## Accept Invitation Page (/accept-invitation)

### Setup
1. [ ] Login com admin
2. [ ] A DashboardPage, afegir un nou empleat:
   ```
   Email: newemp@test.com
   Full Name: New Employee
   Position: Developer
   Department: Engineering
   ```
3. [ ] Click "Send Invitation"
4. [ ] Obtenir link de invitació (veure logs o Supabase)
   - Format: `http://localhost:5173/accept-invitation?token=xxxxx`

### Testing Invitation Flow
1. [ ] Accedir al link sense estar loguejar

2. [ ] Pàgina carrega
   - [ ] Email visible (read-only)
   - [ ] Password input
   - [ ] Confirm password input
   - [ ] Botó "Create Account & Accept"

3. [ ] Crear contrasenya
   ```
   Password: employee123
   Confirm Password: employee123
   ```

4. [ ] Click "Create Account & Accept"
   - [ ] Validació de passwords
   - [ ] Loading state visible
   - [ ] Success message

5. [ ] Redireccio
   - [ ] Navigate a `/login`
   - [ ] Nou usuari pot fer login
   - [ ] Credentials: `newemp@test.com` / `employee123`

### Testing Expired/Invalid Invitations
- [ ] Token invalid → "Invitation not found or has expired"
- [ ] Token expirat (7 dies) → error message
- [ ] Sin token query param → error

## Role-Based Access Control (ProtectedRoute)

### Admin Can Access:
- [ ] `/dashboard` → loads (admin dashboard)
- [ ] `/documents` → loads (company documents)
- [ ] `/leave` → loads (company leave)

### Admin Cannot Access (should redirect):
- [ ] `/employee-dashboard` → redirects to `/dashboard`
- [ ] `/employee-documents` → redirects to `/dashboard`
- [ ] `/employee-leave` → redirects to `/dashboard`

### Employee Can Access:
- [ ] `/employee-dashboard` → loads (employee dashboard)
- [ ] `/employee-documents` → loads (employee documents)
- [ ] `/employee-leave` → loads (employee leave)

### Employee Cannot Access (should redirect):
- [ ] `/dashboard` → redirects to `/employee-dashboard`
- [ ] `/documents` → redirects to `/employee-dashboard`
- [ ] `/leave` → redirects to `/employee-dashboard`

### Unauthenticated Access:
- [ ] Any protected route → redirects to `/login`
- [ ] Loading state shows during redirect

## Logout Flow

### From Admin Dashboard
1. [ ] Click logout button (top right)
2. [ ] Session ends
3. [ ] Redirects to landing page
4. [ ] Try accessing `/dashboard` → redirects to `/login`
5. [ ] Can login again

### From Employee Dashboard
1. [ ] Click logout button
2. [ ] Session ends
3. [ ] Can login again with employee credentials

## Database Verification

### Check profiles table
```sql
SELECT id, full_name, role, company_id FROM profiles 
WHERE email = 'admin@test.com';
-- Should show: role = 'admin', company_id = company_id

SELECT id, full_name, role, company_id FROM profiles 
WHERE email = 'employee@test.com';
-- Should show: role = 'employee', company_id = company_id
```

### Check companies table
```sql
SELECT * FROM companies WHERE name = 'Test Company';
-- owner_id should match admin's user_id
```

### Check employees table
```sql
SELECT * FROM employees 
WHERE company_id = (SELECT id FROM companies WHERE name = 'Test Company');
-- user_id should match employee's user_id for invited employees
```

### Check employee_invitations table
```sql
SELECT * FROM employee_invitations 
WHERE status = 'accepted';
-- Should show accepted invitations with accepted_at timestamp
```

## Performance Tests

- [ ] App loads in < 2 seconds
- [ ] Login/Signup response < 1 second
- [ ] Dashboard loads < 2 seconds
- [ ] Navigation between pages smooth
- [ ] No console errors
- [ ] No console warnings

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

## Localization Tests

- [ ] Switch language to Catalan (CA)
  - [ ] All UI updates
  - [ ] Login form updates
  - [ ] Dashboard updates
- [ ] Switch language to English (EN)
  - [ ] All UI updates
- [ ] Switch language to Spanish (ES)
  - [ ] All UI updates

## Theme Tests

- [ ] Toggle dark mode from light mode
  - [ ] All colors update
  - [ ] Text readable
  - [ ] No flickering
- [ ] Toggle light mode from dark mode
  - [ ] All colors update
  - [ ] Proper contrast
- [ ] Persists on page reload

## Edge Cases & Error Handling

- [ ] Network timeout during signup
  - [ ] Error message
  - [ ] Can retry
- [ ] Network timeout during login
  - [ ] Error message
  - [ ] Can retry
- [ ] Invalid token for invitation
  - [ ] Shows error
  - [ ] Can go back
- [ ] User manually deletes from database
  - [ ] Next login fails gracefully
- [ ] Multiple tabs login simultaneously
  - [ ] Works without conflicts

## Final Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] No TypeScript errors (npm run build)
- [ ] Code ready for deployment
- [ ] Documentation updated
- [ ] Commits made with descriptive messages

## Known Issues / Workarounds

### Issue 1: Email delay
- **Status**: None currently
- **Description**: N/A
- **Workaround**: N/A

### Issue 2: Bundle size warning
- **Status**: Known (in build output)
- **Description**: Chunk > 500KB after minification
- **Workaround**: Will be addressed in next optimization phase

## Testing Notes

- Dates: _______________
- Tester: _______________
- Device: _______________
- Browser: _______________
- OS: _______________

## Feedback

```
[Space for testing notes and observations]
```
