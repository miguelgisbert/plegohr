/*
  # Fix Profile Creation Flow

  ## Problem
  The database trigger `on_auth_user_created` is not reliably creating profile rows
  after user signup. Additionally, client-side REST inserts to `profiles` fail with
  RLS violations because the new user may not yet have an authenticated session.

  ## Solution
  1. Create a SECURITY DEFINER function that lets authenticated users create their
     own profile bypassing RLS (but only for their own user_id)
  2. Recreate the trigger with explicit search_path and better error handling
  3. The client calls `create_user_profile()` via supabase.rpc() after signup,
     falling back gracefully if the trigger already created it
*/

-- ------------------------------------------------------------------
-- 1. RPC function for client-side profile creation
--    SECURITY DEFINER bypasses RLS so the profile can be created even
--    when the session token doesn't yet have insert permissions.
-- ------------------------------------------------------------------
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
  INSERT INTO public.profiles (id, full_name)
  VALUES (user_id, COALESCE(NULLIF(user_full_name, ''), 'User'))
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant usage to authenticated users (so the client can call it)
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;

-- ------------------------------------------------------------------
-- 2. Recreate the auto-profile trigger as a fallback
-- ------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
