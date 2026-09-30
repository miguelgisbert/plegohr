/*
  # Security hardening + data integrity

  ## P0 fixes
  1. Drop the two ANON policies on employee_invitations that let any
     unauthenticated client read/accept EVERY tenant's pending invitation tokens.
     Replaced by SECURITY DEFINER RPCs that take the token as an argument.
  2. create_user_profile() was executable by anon with no ownership check,
     allowing anyone to pre-plant a `users` row and hijack a signup.
  3. INSERT policies never cross-checked company_id against the referenced
     employee_id (cross-tenant rows), and employees could self-approve
     leave requests / corrections (status/reviewed_by columns were writable).

  ## P1 integrity
  4. time_entries: server-side computation of total_seconds/break_seconds
     (single source of truth), employees cannot mutate date/clock_in/tenant
     columns nor reopen a closed day — corrections are the supported path.
  5. Unique partial index: at most one ACTIVE time entry per employee per day.
  6. Unique partial index: an auth user can only be linked to one employee row.
  7. Missing DELETE policies (admin cleanup + employee withdrawal of pending
     requests) and admin UPDATE/DELETE on invitations (resend/regenerate).
  8. companies: members (not just the owner) can read their company name
     (needed for employee-facing headers/reports).
  9. updated_at maintained on documents/leave/time tables.
*/

-- ============================================================================
-- 1. Helper functions: harden search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_company_role()
RETURNS TABLE (company_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id,
    CASE WHEN type = 'company' THEN 'admin' ELSE 'employee' END AS role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. create_user_profile(): only self (or service role) may create a row
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
  -- authenticated callers may only create their own record
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id THEN
    RAISE EXCEPTION 'cannot_create_profile_for_other_user';
  END IF;
  -- no session => only the service role may call this
  IF auth.uid() IS NULL AND COALESCE(auth.role(), 'anon') <> 'service_role' THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  INSERT INTO public.users (id, full_name)
  VALUES (user_id, COALESCE(NULLIF(user_full_name, ''), 'User'))
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text) TO service_role;

-- ============================================================================
-- 3. employee_invitations: kill anon access, restrict reads to admins
-- ============================================================================

-- P0: these two policies exposed every tenant's pending tokens to the internet
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON employee_invitations;
DROP POLICY IF EXISTS "Anyone can accept valid invitation" ON employee_invitations;

-- Denormalised tenant column (needed by the policies below and by the edge
-- function so invitations can be checked without joins)
ALTER TABLE employee_invitations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_employee_invitations_company_id
  ON employee_invitations(company_id);

UPDATE employee_invitations i
SET company_id = e.company_id
FROM employees e
WHERE e.id = i.employee_id AND i.company_id IS NULL;

-- Admin-only reads (the previous policy let ANY company member read the tokens)
DROP POLICY IF EXISTS "Users can view invitations in their company" ON employee_invitations;
CREATE POLICY "Company admins can view invitations for their company"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
        AND u.id = auth.uid()
        AND u.type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company owners and managers can create invitations" ON employee_invitations;
CREATE POLICY "Company admins can create invitations for their company"
  ON employee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
        AND u.id = auth.uid()
        AND u.type = 'company'
        AND employee_invitations.company_id = e.company_id
    )
  );

CREATE POLICY "Company admins can update invitations for their company"
  ON employee_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
        AND u.id = auth.uid()
        AND u.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
        AND u.id = auth.uid()
        AND u.type = 'company'
    )
  );

CREATE POLICY "Company admins can delete invitations for their company"
  ON employee_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN users u ON u.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
        AND u.id = auth.uid()
        AND u.type = 'company'
    )
  );

-- ============================================================================
-- 4. Invitation RPCs (the ONLY anonymous surface left)
-- ============================================================================

-- Read-only preview of an invitation by token (used by /accept-invitation).
-- Returns nothing for unknown tokens so the page can show "invalid link".
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  email text,
  employee_name text,
  company_name text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.email,
         e.full_name,
         c.name,
         i.status,
         i.expires_at
  FROM employee_invitations i
  JOIN employees e ON e.id = i.employee_id
  JOIN companies c ON c.id = e.company_id
  WHERE i.token = p_token
    AND i.company_id = e.company_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon;

-- Accept an invitation: link the authenticated user to the employee row and
-- attach them to the tenant. SECURITY DEFINER because at that moment the
-- caller's users.company_id is still NULL (RLS would block every direct write).
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_inv RECORD;
  v_employee RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT lower(a.email) INTO v_email
  FROM auth.users a WHERE a.id = v_uid;

  SELECT * INTO v_inv
  FROM employee_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_already_used';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;
  IF v_email IS NULL OR v_email <> lower(v_inv.email) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  SELECT * INTO v_employee
  FROM employees WHERE id = v_inv.employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee_not_found';
  END IF;

  IF v_employee.user_id IS NOT NULL AND v_employee.user_id <> v_uid THEN
    RAISE EXCEPTION 'employee_already_linked';
  END IF;

  UPDATE employees
  SET user_id = v_uid
  WHERE id = v_employee.id;

  UPDATE users
  SET company_id = v_employee.company_id,
      type = 'employee',
      email = COALESCE(email, lower(v_inv.email)),
      full_name = COALESCE(NULLIF(full_name, ''), NULLIF(v_employee.full_name, ''), full_name)
  WHERE id = v_uid;

  UPDATE employee_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_inv.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- ============================================================================
-- 5. Cross-tenant INSERT hardening + privileged columns
-- ============================================================================

-- 5a. time_entries: employee inserts must belong to their own tenant
DROP POLICY IF EXISTS "Employees can insert their own time entries" ON time_entries;
CREATE POLICY "Employees can insert their own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = time_entries.employee_id
        AND e.user_id = auth.uid()
        AND e.company_id = time_entries.company_id
    )
    AND status = 'active'
  );

-- 5b. time_corrections: tenant match + must stay pending + own entry
DROP POLICY IF EXISTS "Employees can insert their own time corrections" ON time_corrections;
CREATE POLICY "Employees can insert their own time corrections"
  ON time_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = time_corrections.employee_id
        AND e.user_id = auth.uid()
        AND e.company_id = time_corrections.company_id
    )
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM time_entries te
      WHERE te.id = time_corrections.time_entry_id
        AND te.employee_id = time_corrections.employee_id
        AND te.company_id = time_corrections.company_id
    )
    AND (new_clock_in IS NULL OR new_clock_out IS NULL OR new_clock_out > new_clock_in)
    AND (new_break_start IS NULL OR new_break_end IS NULL OR new_break_end > new_break_start)
  );

-- 5c. leave_requests: tenant match + must stay pending + sane dates
DROP POLICY IF EXISTS "Employees can insert their own leave requests" ON leave_requests;
CREATE POLICY "Employees can insert their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.user_id = auth.uid()
        AND e.company_id = leave_requests.company_id
    )
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND leave_type_id IN (
      SELECT lt.id FROM leave_types lt WHERE lt.company_id = leave_requests.company_id
    )
    AND start_date <= end_date
  );

-- 5d. documents: the referenced employee must belong to the same tenant
DROP POLICY IF EXISTS "Company admins can insert documents for their employees" ON documents;
CREATE POLICY "Company admins can insert documents for their employees"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = documents.company_id
        AND u.type = 'company'
    )
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = documents.employee_id
        AND e.company_id = documents.company_id
    )
  );

-- ============================================================================
-- 6. DELETE policies (cleanup + withdrawal of pending requests)
-- ============================================================================

CREATE POLICY "Company admins can delete time entries"
  ON time_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = time_entries.company_id
        AND u.type = 'company'
    )
  );

CREATE POLICY "Company admins can delete time corrections"
  ON time_corrections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = time_corrections.company_id
        AND u.type = 'company'
    )
  );

CREATE POLICY "Employees can withdraw their own pending time corrections"
  ON time_corrections FOR DELETE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = time_corrections.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can delete leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = leave_requests.company_id
        AND u.type = 'company'
    )
  );

CREATE POLICY "Employees can withdraw their own pending leave requests"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = leave_requests.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6b. employees: an employee can ALWAYS read their own record
--     (needed to resolve company_id for clock-in etc. even if the tenant
--      linkage on `users` is still missing; every other employee-scoped
--      policy nests this table, so this removes a hidden dependency)
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their own employee record" ON employees;
CREATE POLICY "Employees can view their own employee record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. companies: any member can read their own company (name, etc.)
-- ============================================================================

DROP POLICY IF EXISTS "Company members can view their company" ON companies;
CREATE POLICY "Company members can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.company_id = companies.id
    )
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.company_id = companies.id
    )
  );

-- ============================================================================
-- 8. storage: tighten the employee read policy to their own tenant folder
-- ============================================================================

DROP POLICY IF EXISTS "Employees can view their own documents" ON storage.objects;
CREATE POLICY "Employees can view their own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND (storage.foldername(name))[1] = e.company_id::text
        AND (storage.foldername(name))[2] = e.id::text
    )
  );

-- ============================================================================
-- 9. time_entries: server-computed totals + employee immutability
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_time_entries_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_is_employee boolean;
  v_break int;
  v_work int;
BEGIN
  SELECT u.type INTO v_type FROM public.users u WHERE u.id = auth.uid();
  v_is_employee := COALESCE(v_type = 'employee', false);

  -- break accounting -------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    NEW.break_seconds := 0;
    IF v_is_employee THEN
      NEW.status := 'active';
    END IF;
  ELSIF v_is_employee THEN
    -- Employee session: a break window that just closed is ACCUMULATED, so a
    -- day with several breaks keeps every one of them.
    IF NEW.break_start IS NOT NULL
       AND NEW.break_end IS NOT NULL
       AND OLD.break_end IS NULL THEN
      NEW.break_seconds := COALESCE(OLD.break_seconds, 0)
        + GREATEST(0, EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start))::int);
    END IF;

    -- Employees cannot rewrite history: corrections are the supported path.
    NEW.date := OLD.date;
    NEW.clock_in := OLD.clock_in;
    NEW.company_id := OLD.company_id;
    NEW.employee_id := OLD.employee_id;

    IF OLD.clock_out IS NOT NULL THEN
      NEW.clock_out := OLD.clock_out; -- a closed day stays closed
      NEW.status := 'completed';
    END IF;

    IF NEW.clock_out IS NOT NULL AND NEW.clock_out > now() + interval '5 minutes' THEN
      NEW.clock_out := now();
    END IF;

    IF NEW.status NOT IN ('active', 'completed') THEN
      NEW.status := OLD.status;
    END IF;
  ELSE
    -- Admin / service role: when the (single) break window is edited the
    -- stored value is recomputed from it. Untouched columns keep their value.
    IF NEW.break_start IS DISTINCT FROM OLD.break_start
       OR NEW.break_end IS DISTINCT FROM OLD.break_end THEN
      IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
        NEW.break_seconds := GREATEST(
          0,
          EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start))::int
        );
      END IF;
    END IF;
  END IF;

  -- totals -----------------------------------------------------------------
  v_break := COALESCE(NEW.break_seconds, 0);

  IF NEW.clock_out IS NOT NULL THEN
    v_work := GREATEST(0, EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in))::int - v_break);
  ELSIF NEW.break_start IS NOT NULL AND NEW.break_end IS NULL THEN
    -- on break: work time is frozen at break start
    v_work := GREATEST(0, EXTRACT(EPOCH FROM (NEW.break_start - NEW.clock_in))::int - v_break);
  ELSE
    v_work := GREATEST(0, EXTRACT(EPOCH FROM (now() - NEW.clock_in))::int - v_break);
  END IF;

  NEW.break_seconds := v_break;
  NEW.total_seconds := v_work;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_entries_integrity ON time_entries;
CREATE TRIGGER time_entries_integrity
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_time_entries_integrity();

-- ============================================================================
-- 10. updated_at maintenance on the remaining tables
-- ============================================================================
-- These tables predate the convention and had no updated_at column: add it
-- before wiring the trigger (otherwise every UPDATE would fail).

ALTER TABLE documents        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE leave_types      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE leave_requests   ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE time_corrections ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documents', 'leave_types', 'leave_requests', 'time_corrections']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
       CREATE TRIGGER update_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION public.update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 11. Uniqueness: one active entry per employee/day, one employee per user
-- ============================================================================

-- Close any duplicated active rows (keep the most recent one)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY employee_id, date
           ORDER BY created_at DESC
         ) AS rn
  FROM time_entries
  WHERE status = 'active'
)
UPDATE time_entries te
SET status = 'completed',
    clock_out = GREATEST(te.clock_in, LEAST(now(), te.clock_in + interval '1 day'))
FROM ranked r
WHERE te.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entries_one_active_per_day
  ON time_entries(employee_id, date)
  WHERE status = 'active';

-- Unlink duplicate employee rows (keep the oldest link) before enforcing UNIQUE
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY created_at ASC
         ) AS rn
  FROM employees
  WHERE user_id IS NOT NULL
)
UPDATE employees e
SET user_id = NULL
FROM ranked r
WHERE e.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_user_id
  ON employees(user_id)
  WHERE user_id IS NOT NULL;
