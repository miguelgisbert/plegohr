/*
  # Align companies constraints with owner-centric model

  ## Why
  - Company names should not need to be globally unique across all tenants.
  - Each owner account should manage exactly one company.

  ## Changes
  1. Drop global unique constraint on companies.name (if present).
  2. Enforce one company per owner with a unique constraint on owner_id.
*/

-- Allow repeated company names across different owners/tenants
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_name_key;

-- Enforce one company per owner account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_owner_id_key'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_owner_id_key UNIQUE (owner_id);
  END IF;
END $$;
