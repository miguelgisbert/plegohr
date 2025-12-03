/*
  # Create leave requests table

  1. New Tables
    - `leave_types`
      - `id` (uuid, primary key) - Unique leave type identifier
      - `company_id` (uuid, foreign key) - References companies table
      - `name` (text) - Leave type name (Holiday, Sick Day, Special Leave, etc.)
      - `created_at` (timestamptz) - Creation timestamp
      
    - `leave_requests`
      - `id` (uuid, primary key) - Unique leave request identifier
      - `company_id` (uuid, foreign key) - References companies table
      - `employee_id` (uuid, foreign key) - References employees table
      - `leave_type_id` (uuid, foreign key) - References leave_types table
      - `start_date` (date) - Leave start date
      - `end_date` (date) - Leave end date
      - `reason` (text) - Reason for leave
      - `status` (text) - pending, approved, rejected
      - `requested_at` (timestamptz) - Request timestamp
      - `reviewed_at` (timestamptz, nullable) - Review timestamp
      - `reviewed_by` (uuid, nullable) - References auth.users (reviewer)
      - `review_notes` (text, nullable) - Optional review notes

  2. Security
    - Enable RLS on both tables
    - Company admins can manage leave types and review requests
    - Employees can create and view their own requests
*/

CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id uuid REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view leave types for their company"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_types.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can insert leave types for their company"
  ON leave_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_types.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can update leave types for their company"
  ON leave_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_types.company_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_types.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can delete leave types for their company"
  ON leave_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_types.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view leave types for their company"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.company_id = leave_types.company_id
    )
  );

CREATE POLICY "Company admins can view all leave requests for their company"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_requests.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can update leave requests for their company"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_requests.company_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = leave_requests.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can insert their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_leave_types_company_id ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
