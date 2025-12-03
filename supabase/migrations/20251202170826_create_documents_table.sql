/*
  # Create documents table for employee document management

  1. New Tables
    - `documents`
      - `id` (uuid, primary key) - Unique document identifier
      - `company_id` (uuid, foreign key) - References companies table
      - `employee_id` (uuid, foreign key) - References employees table
      - `file_name` (text) - Original file name
      - `file_path` (text) - Storage path in Supabase Storage
      - `file_type` (text) - MIME type of the file
      - `file_size` (bigint) - File size in bytes
      - `document_type` (text) - Type of document (contract, payslip, etc.)
      - `uploaded_by` (uuid, foreign key) - References auth.users (uploader)
      - `uploaded_at` (timestamptz) - Upload timestamp
      - `description` (text, nullable) - Optional description

  2. Security
    - Enable RLS on `documents` table
    - Policy for company admins to manage all documents for their employees
    - Policy for employees to view their own documents only
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view all documents for their employees"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = documents.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can insert documents for their employees"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = documents.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can update documents for their employees"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = documents.company_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = documents.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Company admins can delete documents for their employees"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = documents.company_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = documents.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
