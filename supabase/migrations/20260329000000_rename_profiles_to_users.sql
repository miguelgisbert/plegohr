/*
  # Rename profiles → users with proper type system

  ## Why
  - `profiles` was confusing: it stored user data for *all* users (admins + employees)
  - `role` column (admin/employee/manager) duplicated what `type` + company ownership expressed
  - FKs on other tables pointed to `auth.users` instead of the application's user table
  - `employees.full_name` and `employees.email` duplicated data from `profiles`

  ## Changes
  1. Drop RLS policies on other tables that reference `profiles`
  2. Rename `profiles` → `users`
  3. Add `email` (populated from `auth.users`) and `type` (company/employee) columns
  4. Migrate data: `role = 'admin'` → `type = 'company'`, others → `type = 'employee'`
  5. Drop old `role` column
  6. Update `user_company_role()` function to query `users` + map `type` → role
  7. Update `handle_new_user()` trigger function to insert into `users`
  8. Update `create_user_profile()` RPC to insert into `users`
  9. Point all FKs from `auth.users` to `users.id`
  10. Recreate all dropped policies referencing `users.type` instead of `profiles.role`
*/

-- ============================================================================
-- 1. Drop RLS policies on OTHER tables that reference `profiles`
--    (must happen BEFORE renaming the table)
-- ============================================================================

-- documents
DROP POLICY IF EXISTS "Company admins can view all documents for their employees" ON documents;
DROP POLICY IF EXISTS "Company admins can insert documents for their employees" ON documents;
DROP POLICY IF EXISTS "Company admins can update documents for their employees" ON documents;
DROP POLICY IF EXISTS "Company admins can delete documents for their employees" ON documents;

-- leave_types
DROP POLICY IF EXISTS "Company admins can view leave types for their company" ON leave_types;
DROP POLICY IF EXISTS "Company admins can insert leave types for their company" ON leave_types;
DROP POLICY IF EXISTS "Company admins can update leave types for their company" ON leave_types;
DROP POLICY IF EXISTS "Company admins can delete leave types for their company" ON leave_types;

-- leave_requests
DROP POLICY IF EXISTS "Company admins can view all leave requests for their company" ON leave_requests;
DROP POLICY IF EXISTS "Company admins can update leave requests for their company" ON leave_requests;

-- employee_invitations
DROP POLICY IF EXISTS "Users can view invitations in their company" ON employee_invitations;
DROP POLICY IF EXISTS "Company owners and managers can create invitations" ON employee_invitations;

-- time_entries
DROP POLICY IF EXISTS "Company admins can view all time entries" ON time_entries;
DROP POLICY IF EXISTS "Company admins can update time entries" ON time_entries;

-- time_corrections
DROP POLICY IF EXISTS "Company admins can view all time corrections" ON time_corrections;
DROP POLICY IF EXISTS "Company admins can update time corrections" ON time_corrections;

-- storage.objects (documents bucket)
DROP POLICY IF EXISTS "Company admins can upload documents for their employees" ON storage.objects;
DROP POLICY IF EXISTS "Company admins can view documents for their employees" ON storage.objects;
DROP POLICY IF EXISTS "Company admins can delete documents for their employees" ON storage.objects;

-- ============================================================================
-- 2. Rename profiles → users
-- ============================================================================
ALTER TABLE IF EXISTS profiles RENAME TO users;

-- ============================================================================
-- 3. Rename indexes and triggers
-- ============================================================================
ALTER INDEX IF EXISTS idx_profiles_company_id RENAME TO idx_users_company_id;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
      AND tgrelid = 'users'::regclass
  ) THEN
    ALTER TRIGGER update_profiles_updated_at ON users RENAME TO update_users_updated_at;
  END IF;
END $$;

-- ============================================================================
-- 4. Add new columns
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'employee' CHECK (type IN ('company', 'employee'));

-- ============================================================================
-- 5. Migrate data
-- ============================================================================
-- Map role → type: admins are 'company', everyone else is 'employee'
UPDATE users SET type = 'company' WHERE role = 'admin';
UPDATE users SET type = 'employee' WHERE role IS NULL OR role IN ('employee', 'manager');

-- Populate email from auth.users
UPDATE users u SET email = a.email FROM auth.users a WHERE u.id = a.id AND u.email IS NULL;

-- ============================================================================
-- 6. Drop old role column
-- ============================================================================
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- ============================================================================
-- 7. Update user_company_role() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_company_role()
RETURNS TABLE (company_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id,
    CASE WHEN type = 'company' THEN 'admin' ELSE 'employee' END as role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- 8. Update handle_new_user() trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'type', ''), 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. Update create_user_profile() RPC (backward compatibility)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_full_name text DEFAULT 'User'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name)
  VALUES (user_id, COALESCE(NULLIF(user_full_name, ''), 'User'))
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;

-- ============================================================================
-- 10. Update FKs from auth.users → users
-- ============================================================================

-- companies.owner_id
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_owner_id_fkey,
  ADD CONSTRAINT companies_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- employees.user_id
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_user_id_fkey,
  ADD CONSTRAINT employees_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- employee_invitations.invited_by
ALTER TABLE employee_invitations
  DROP CONSTRAINT IF EXISTS employee_invitations_invited_by_fkey,
  ADD CONSTRAINT employee_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- documents.uploaded_by
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey,
  ADD CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- leave_requests.reviewed_by
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_reviewed_by_fkey,
  ADD CONSTRAINT leave_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- time_corrections.reviewed_by
ALTER TABLE time_corrections
  DROP CONSTRAINT IF EXISTS time_corrections_reviewed_by_fkey,
  ADD CONSTRAINT time_corrections_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 11. Recreate RLS policies on users table
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;

CREATE POLICY "Users can view own user record"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own user record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own user record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own user record"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- 12. Recreate policies on documents table
-- ============================================================================
CREATE POLICY "Company admins can view all documents for their employees"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = documents.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can insert documents for their employees"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = documents.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can update documents for their employees"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = documents.company_id
      AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = documents.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can delete documents for their employees"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = documents.company_id
      AND users.type = 'company'
    )
  );

-- ============================================================================
-- 13. Recreate policies on leave_types table
-- ============================================================================
CREATE POLICY "Company admins can view leave types for their company"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_types.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can insert leave types for their company"
  ON leave_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_types.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can update leave types for their company"
  ON leave_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_types.company_id
      AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_types.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can delete leave types for their company"
  ON leave_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_types.company_id
      AND users.type = 'company'
    )
  );

-- ============================================================================
-- 14. Recreate policies on leave_requests table
-- ============================================================================
CREATE POLICY "Company admins can view all leave requests for their company"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_requests.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can update leave requests for their company"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_requests.company_id
      AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = leave_requests.company_id
      AND users.type = 'company'
    )
  );

-- ============================================================================
-- 15. Recreate policies on employee_invitations table
-- ============================================================================
CREATE POLICY "Users can view invitations in their company"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Company owners and managers can create invitations"
  ON employee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      JOIN companies c ON c.id = e.company_id
      WHERE e.id = employee_invitations.employee_id
      AND u.id = auth.uid()
      AND (c.owner_id = auth.uid() OR u.type = 'company')
    )
  );

-- ============================================================================
-- 16. Recreate policies on time_entries table
-- ============================================================================
CREATE POLICY "Company admins can view all time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_entries.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can update time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_entries.company_id
      AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_entries.company_id
      AND users.type = 'company'
    )
  );

-- ============================================================================
-- 17. Recreate policies on time_corrections table
-- ============================================================================
CREATE POLICY "Company admins can view all time corrections"
  ON time_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_corrections.company_id
      AND users.type = 'company'
    )
  );

CREATE POLICY "Company admins can update time corrections"
  ON time_corrections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_corrections.company_id
      AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = time_corrections.company_id
      AND users.type = 'company'
    )
  );

-- ============================================================================
-- 18. Recreate policies on storage.objects for documents bucket
-- ============================================================================
CREATE POLICY "Company admins can upload documents for their employees"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.type = 'company'
    AND (storage.foldername(name))[1] = users.company_id::text
  )
);

CREATE POLICY "Company admins can view documents for their employees"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.type = 'company'
    AND (storage.foldername(name))[1] = users.company_id::text
  )
);

CREATE POLICY "Company admins can delete documents for their employees"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.type = 'company'
    AND (storage.foldername(name))[1] = users.company_id::text
  )
);
