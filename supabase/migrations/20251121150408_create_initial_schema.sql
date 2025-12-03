/*
  # Initial HR Management Schema

  ## Overview
  This migration sets up the core database structure for the PlegoHR application,
  including user profiles, companies, and employees management.

  ## New Tables

  ### 1. `profiles`
  User profile information linked to Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `company_id` (uuid, nullable, references companies)
  - `role` (text) - 'admin', 'manager', 'employee'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `companies`
  Company/organization information
  - `id` (uuid, primary key)
  - `name` (text, unique)
  - `owner_id` (uuid, references auth.users)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `employees`
  Employee records within companies
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies)
  - `user_id` (uuid, nullable, references auth.users)
  - `full_name` (text)
  - `email` (text)
  - `position` (text)
  - `department` (text, nullable)
  - `hire_date` (date)
  - `status` (text) - 'active', 'inactive', 'terminated'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies restrict access based on user authentication and company membership
  - Users can only access data from their own company
  - Company owners have full access to their company data

  ## Important Notes
  1. When a user signs up, a profile should be created via trigger
  2. Company owners can manage all employees in their company
  3. Regular employees can only view their own data
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  role text DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  position text NOT NULL,
  department text,
  hire_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- RLS Policies for companies table

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies.id
    )
  );

CREATE POLICY "Users can create their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company owners can delete their company"
  ON companies FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for profiles table

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = profiles.company_id
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for employees table

CREATE POLICY "Users can view employees in their company"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = employees.company_id
    )
  );

CREATE POLICY "Company owners and managers can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = auth.uid()
      AND p.company_id = employees.company_id
      AND (c.owner_id = auth.uid() OR p.role IN ('admin', 'manager'))
    )
  );

CREATE POLICY "Company owners and managers can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = auth.uid()
      AND p.company_id = employees.company_id
      AND (c.owner_id = auth.uid() OR p.role IN ('admin', 'manager'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = auth.uid()
      AND p.company_id = employees.company_id
      AND (c.owner_id = auth.uid() OR p.role IN ('admin', 'manager'))
    )
  );

CREATE POLICY "Company owners and managers can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.id = auth.uid()
      AND p.company_id = employees.company_id
      AND (c.owner_id = auth.uid() OR p.role IN ('admin', 'manager'))
    )
  );

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employees_updated_at') THEN
    CREATE TRIGGER update_employees_updated_at
      BEFORE UPDATE ON employees
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;