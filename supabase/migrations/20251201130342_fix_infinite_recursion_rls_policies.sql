/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The "Users can view profiles in their company" policy creates infinite recursion
  by querying the profiles table from within a profiles policy.

  ## Solution
  Drop the problematic policy. Users can already view their own profile with the
  "Users can view their own profile" policy. For viewing other profiles in the
  company, we'll use a different approach that doesn't cause recursion.

  ## Changes
  1. Drop the recursive "Users can view profiles in their company" policy
  2. Simplify to just allow users to view their own profile
  3. Keep all other policies intact
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- The remaining policy "Users can view their own profile" is sufficient
-- for users to access their own data without recursion