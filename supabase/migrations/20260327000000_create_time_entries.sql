/*
  # Create time entries table

  1. New Tables
    - `time_entries`
      - `id` (uuid, primary key) - Unique time entry identifier
      - `company_id` (uuid, foreign key) - References companies table
      - `employee_id` (uuid, foreign key) - References employees table
      - `date` (date) - The work date
      - `clock_in` (timestamptz) - Work start time
      - `clock_out` (timestamptz, nullable) - Work end time
      - `break_start` (timestamptz, nullable) - Break start time
      - `break_end` (timestamptz, nullable) - Break end time
      - `total_seconds` (integer) - Total work seconds (clock_out - clock_in - break)
      - `break_seconds` (integer) - Total break seconds
      - `status` (text) - active, completed, corrected
      - `notes` (text, nullable)
      - `correction_id` (uuid, nullable) - References time_corrections (added later)

  2. Security
    - Enable RLS
    - Company admins can view/update all time entries in their company
    - Employees can view/insert/update their own time entries
*/

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_seconds integer DEFAULT 0,
  break_seconds integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'corrected')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view all time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_entries.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can update time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_entries.company_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = time_entries.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view their own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_entries.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert their own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_entries.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_entries.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = time_entries.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
