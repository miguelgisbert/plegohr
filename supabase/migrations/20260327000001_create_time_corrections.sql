/*
  # Create time corrections table

  1. New Tables
    - `time_corrections`
      - `id` (uuid, primary key) - Unique correction identifier
      - `time_entry_id` (uuid, foreign key) - References time_entries
      - `employee_id` (uuid, foreign key) - References employees
      - `company_id` (uuid, foreign key) - References companies
      - `reason` (text) - Employee's reason for correction
      - `new_clock_in` (timestamptz, nullable) - Corrected clock-in time
      - `new_clock_out` (timestamptz, nullable) - Corrected clock-out time
      - `new_break_start` (timestamptz, nullable) - Corrected break start time
      - `new_break_end` (timestamptz, nullable) - Corrected break end time
      - `status` (text) - pending, approved, rejected
      - `reviewed_by` (uuid, nullable) - References auth.users
      - `reviewed_at` (timestamptz, nullable)
      - `review_notes` (text, nullable)

  2. Security
    - Enable RLS
    - Company admins can view/update all corrections in their company
    - Employees can view/insert their own corrections
*/

CREATE TABLE IF NOT EXISTS time_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  new_clock_in timestamptz,
  new_clock_out timestamptz,
  new_break_start timestamptz,
  new_break_end timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  requested_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE time_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view all time corrections"
  ON time_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_corrections.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can update time corrections"
  ON time_corrections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_corrections.company_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_corrections.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view their own time corrections"
  ON time_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_corrections.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert their own time corrections"
  ON time_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_corrections.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_time_corrections_time_entry_id ON time_corrections(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_time_corrections_company_id ON time_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_time_corrections_employee_id ON time_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_corrections_status ON time_corrections(status);
