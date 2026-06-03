-- =============================================================================
-- SCRIPT PER APLICAR MANUALMENT AL DASHBOARD DE SUPABASE
-- =============================================================================
-- Aquest script elimina totes les polítiques RLS amb recursió i crea noves
-- polítiques que no causen errors de "infinite recursion"
-- =============================================================================

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

-- Drop all existing companies policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can create their own company" ON companies;
DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
DROP POLICY IF EXISTS "Company owners can delete their company" ON companies;
DROP POLICY IF EXISTS "Company owners can view their company" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Company owners can update company" ON companies;
DROP POLICY IF EXISTS "Company owners can delete company" ON companies;

-- Recreate companies policies without recursion
CREATE POLICY "Company owners can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company owners can update company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company owners can delete company"
  ON companies FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Drop all existing profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Recreate profiles policies without recursion
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================

-- Drop all existing employees policies
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Company owners and managers can insert employees" ON employees;
DROP POLICY IF EXISTS "Company owners and managers can update employees" ON employees;
DROP POLICY IF EXISTS "Company owners and managers can delete employees" ON employees;
DROP POLICY IF EXISTS "Users view company employees" ON employees;
DROP POLICY IF EXISTS "Admins and managers insert employees" ON employees;
DROP POLICY IF EXISTS "Admins and managers update employees" ON employees;
DROP POLICY IF EXISTS "Admins and managers delete employees" ON employees;

-- Create helper function to avoid recursion (in public schema)
CREATE OR REPLACE FUNCTION public.get_user_company_role()
RETURNS TABLE (company_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id, role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Recreate employees policies using helper function
CREATE POLICY "Users view company employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT (public.get_user_company_role()).company_id
    )
  );

CREATE POLICY "Admins and managers insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT (public.get_user_company_role()).company_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.get_user_company_role() ucr
      WHERE ucr.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT (public.get_user_company_role()).company_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.get_user_company_role() ucr
      WHERE ucr.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT (public.get_user_company_role()).company_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.get_user_company_role() ucr
      WHERE ucr.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT (public.get_user_company_role()).company_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.get_user_company_role() ucr
      WHERE ucr.role IN ('admin', 'manager')
    )
  );

-- =============================================================================
-- FI DE L'SCRIPT
-- =============================================================================
