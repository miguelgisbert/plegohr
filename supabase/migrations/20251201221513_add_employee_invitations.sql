/*
  # Add Employee Invitations System

  ## Overview
  This migration adds functionality to track employee invitations and their status.

  ## New Tables

  ### `employee_invitations`
  Tracks invitation status for employees
  - `id` (uuid, primary key)
  - `employee_id` (uuid, references employees)
  - `email` (text)
  - `token` (text, unique) - unique invitation token
  - `status` (text) - 'pending', 'accepted', 'expired'
  - `invited_by` (uuid, references auth.users)
  - `invited_at` (timestamptz)
  - `accepted_at` (timestamptz, nullable)
  - `expires_at` (timestamptz)

  ## Security
  - RLS enabled on employee_invitations table
  - Only company members can view invitations for their company
  - System can insert invitations via service role
*/

-- Create employee_invitations table
CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invitations_employee_id ON employee_invitations(employee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON employee_invitations(status);

-- RLS Policies for employee_invitations

CREATE POLICY "Users can view invitations in their company"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN profiles p ON p.company_id = e.company_id
      WHERE e.id = employee_invitations.employee_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Company owners and managers can create invitations"
  ON employee_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      JOIN profiles p ON p.company_id = e.company_id
      JOIN companies c ON c.id = e.company_id
      WHERE e.id = employee_invitations.employee_id
      AND p.id = auth.uid()
      AND (c.owner_id = auth.uid() OR p.role IN ('admin', 'manager'))
    )
  );

-- Allow public access to view invitation by token (for accepting invitations)
CREATE POLICY "Anyone can view invitation by token"
  ON employee_invitations FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- Allow public to update invitation status when accepting
CREATE POLICY "Anyone can accept valid invitation"
  ON employee_invitations FOR UPDATE
  TO anon
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status IN ('accepted', 'pending'));