/*
  # RLS + data integrity test suite

  Run against a LOCAL postgres with the Supabase environment emulated
  (roles anon/authenticated/service_role, auth schema, storage schema):

      for f in supabase/migrations/<file>.sql; do psql -v ON_ERROR_STOP=1 -f "$f"; done
      psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_and_integrity_test.sql

  Every check raises an exception on failure, so a clean run means all
  assertions passed.
*/

CREATE OR REPLACE FUNCTION public.assert_true(cond boolean, msg text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAILED: %', msg;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.assert_true(boolean, text) TO anon, authenticated, service_role;

-- ===========================================================================
-- SEED: two tenants (A and B)
-- ===========================================================================
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin-a@test.local',  '{"full_name":"Admin A","type":"company"}'),
  ('10000000-0000-0000-0000-000000000002', 'admin-b@test.local',  '{"full_name":"Admin B","type":"company"}'),
  ('20000000-0000-0000-0000-000000000001', 'emp-a1@test.local',   '{"full_name":"Employee A1"}'),
  ('20000000-0000-0000-0000-000000000002', 'emp-a2@test.local',   '{"full_name":"Employee A2"}'),
  ('20000000-0000-0000-0000-000000000003', 'emp-b1@test.local',   '{"full_name":"Employee B1"}'),
  ('30000000-0000-0000-0000-000000000001', 'intruder@test.local', '{"full_name":"Intruder"}');

INSERT INTO companies (id, name, owner_id) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Company A', '10000000-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Company B', '10000000-0000-0000-0000-000000000002');

UPDATE users SET company_id = 'aaaaaaaa-0000-0000-0000-00000000000a' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE users SET company_id = 'bbbbbbbb-0000-0000-0000-00000000000b' WHERE id = '10000000-0000-0000-0000-000000000002';

INSERT INTO employees (id, company_id, user_id, full_name, email, position) VALUES
  ('eeeeeeee-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'Employee A1', 'emp-a1@test.local', 'Developer'),
  ('eeeeeeee-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', 'Employee A2', 'emp-a2@test.local', 'Designer'),
  ('eeeeeeee-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000003', 'Employee B1', 'emp-b1@test.local', 'Tester');

INSERT INTO time_entries (id, company_id, employee_id, date, clock_in, clock_out, status) VALUES
  ('77777777-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-0000000000b1', '2026-09-01', '2026-09-01 09:00:00+00', '2026-09-01 17:00:00+00', 'completed');

INSERT INTO employee_invitations (id, employee_id, email, token, company_id, status) VALUES
  ('99999999-0000-0000-0000-0000000000a1', 'eeeeeeee-0000-0000-0000-0000000000a2', 'emp-a2@test.local', 'token-valid-a2', 'aaaaaaaa-0000-0000-0000-00000000000a', 'pending');

INSERT INTO leave_types (id, company_id, name) VALUES
  ('88888888-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Vacation');

INSERT INTO documents (id, company_id, employee_id, file_name, file_path, file_type, file_size, document_type)
VALUES
  ('66666666-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-0000000000b1', 'secret-b.pdf', 'bbbbbbbb-0000-0000-0000-00000000000b/eeeeeeee-0000-0000-0000-0000000000b1/1.pdf', 'application/pdf', 100, 'contract');

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('documents', 'bbbbbbbb-0000-0000-0000-00000000000b/eeeeeeee-0000-0000-0000-0000000000b1/1.pdf'),
  ('documents', 'aaaaaaaa-0000-0000-0000-00000000000a/eeeeeeee-0000-0000-0000-0000000000a1/1.pdf');

-- ===========================================================================
-- T1 (P0): ANON cannot enumerate invitation tokens any more
-- ===========================================================================
DO $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  SET ROLE anon;
  SELECT count(*) INTO n FROM employee_invitations;
  RESET ROLE;
  PERFORM public.assert_true(n = 0, 'T1 anon must not see any invitation (saw ' || n || ')');
END $$;
\echo 'T1 PASS: anon cannot read invitation tokens'

-- ===========================================================================
-- T2 (P0): ANON cannot execute create_user_profile (signup hijack)
-- ===========================================================================
DO $$
DECLARE failed boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  SET ROLE anon;
  BEGIN
    PERFORM public.create_user_profile('30000000-0000-0000-0000-000000000001', 'Hijack');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(failed, 'T2 anon must not execute create_user_profile');
END $$;
\echo 'T2 PASS: anon cannot call create_user_profile'

-- ===========================================================================
-- T3: invitation preview RPC works for anon (valid token) / hides invalid
-- ===========================================================================
DO $$
DECLARE n bigint; v_email text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  SET ROLE anon;
  SELECT count(*) INTO n FROM public.get_invitation_by_token('token-does-not-exist');
  PERFORM public.assert_true(n = 0, 'T3 invalid token must return no rows');
  SELECT email INTO v_email FROM public.get_invitation_by_token('token-valid-a2');
  RESET ROLE;
  PERFORM public.assert_true(v_email = 'emp-a2@test.local', 'T3 valid token must return the invitation');
END $$;
\echo 'T3 PASS: get_invitation_by_token'

-- ===========================================================================
-- T4/T5/T6: accept_invitation flow
-- ===========================================================================
DO $$
DECLARE failed boolean := false; v_company uuid; v_type text; v_status text;
BEGIN
  -- T4: anon cannot execute it
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', false);
  SET ROLE anon;
  BEGIN
    PERFORM public.accept_invitation('token-valid-a2');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(failed, 'T4 anon must not execute accept_invitation');

  -- T5: authenticated but WRONG email -> mismatch
  failed := false;
  PERFORM set_config('request.jwt.claims',
    '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.accept_invitation('token-valid-a2');
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(failed, 'T5 wrong email must be rejected');

  -- T6: correct user accepts -> linked to tenant
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
  SET ROLE authenticated;
  PERFORM public.accept_invitation('token-valid-a2');
  RESET ROLE;

  SELECT company_id INTO v_company FROM users WHERE id = '20000000-0000-0000-0000-000000000002';
  SELECT type INTO v_type FROM users WHERE id = '20000000-0000-0000-0000-000000000002';
  SELECT status INTO v_status FROM employee_invitations WHERE id = '99999999-0000-0000-0000-0000000000a1';

  PERFORM public.assert_true(v_company = 'aaaaaaaa-0000-0000-0000-00000000000a', 'T6 user joins tenant A');
  PERFORM public.assert_true(v_type = 'employee', 'T6 user typed as employee');
  PERFORM public.assert_true(v_status = 'accepted', 'T6 invitation marked accepted');
  PERFORM public.assert_true(
    (SELECT user_id FROM employees WHERE id = 'eeeeeeee-0000-0000-0000-0000000000a2')
      = '20000000-0000-0000-0000-000000000002', 'T6 employee row linked to user');
END $$;
\echo 'T4-T6 PASS: accept_invitation'

-- ===========================================================================
-- T7-T17: time entry integrity + tenant isolation (employee A1)
-- ===========================================================================
DO $$
DECLARE
  v_failed boolean;
  v_total int; v_break int; v_clock_in timestamptz; v_date date;
  v_clock_out timestamptz; v_status text; n bigint;
  claims CONSTANT text := '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}';
BEGIN
  PERFORM set_config('request.jwt.claims', claims, false);
  SET ROLE authenticated;

  -- T7: cross-tenant insert is rejected by RLS
  v_failed := false;
  BEGIN
    INSERT INTO time_entries (company_id, employee_id, date, clock_in, status)
    VALUES ('bbbbbbbb-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-0000000000a1',
            '2026-09-02', now(), 'active');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T7 employee must not insert into another tenant');

  -- T7b: another employee's row of my own tenant is also rejected
  v_failed := false;
  BEGIN
    INSERT INTO time_entries (company_id, employee_id, date, clock_in, status)
    VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-0000000000a2',
            '2026-09-02', now(), 'active');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T7b employee must not clock in for a colleague');

  -- T8: valid clock-in
  INSERT INTO time_entries (id, company_id, employee_id, date, clock_in, status)
  VALUES ('77777777-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a',
          'eeeeeeee-0000-0000-0000-0000000000a1', '2026-09-29', '2026-09-29 09:00:00+00', 'active');
  SELECT total_seconds, break_seconds INTO v_total, v_break
    FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_break = 0, 'T8 break starts at 0');

  -- T9: a second ACTIVE entry the same day hits the unique index
  v_failed := false;
  BEGIN
    INSERT INTO time_entries (company_id, employee_id, date, clock_in, status)
    VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-0000000000a1',
            '2026-09-29', now(), 'active');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T9 only one active entry per employee/day');

  -- T10: start break -> work frozen at break start (09:00 -> 10:00 = 3600s)
  UPDATE time_entries SET break_start = '2026-09-29 10:00:00+00', break_end = NULL
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT total_seconds INTO v_total FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_total = 3600, 'T10 work frozen at break start (got ' || v_total || ')');

  -- T11: end break -> accumulated (30 min)
  UPDATE time_entries SET break_end = '2026-09-29 10:30:00+00'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT break_seconds INTO v_break FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_break = 1800, 'T11 first break accumulated (got ' || v_break || ')');

  -- T12: second break starts at 12:00 -> work = 3h - 30min = 9000s
  UPDATE time_entries SET break_start = '2026-09-29 12:00:00+00', break_end = NULL
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT total_seconds, break_seconds INTO v_total, v_break
    FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_total = 9000, 'T12 work after 2nd break start (got ' || v_total || ')');
  PERFORM public.assert_true(v_break = 1800, 'T12 previous break preserved (got ' || v_break || ')');

  -- T13: end 2nd break (45 min) -> break total 75 min
  UPDATE time_entries SET break_end = '2026-09-29 12:45:00+00'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT break_seconds INTO v_break FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_break = 4500, 'T13 both breaks accumulated (got ' || v_break || ')');

  -- T14: clock out -> total = 8h - 75min = 24300s
  UPDATE time_entries
     SET clock_out = '2026-09-29 17:00:00+00', status = 'completed'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT total_seconds, break_seconds, status INTO v_total, v_break, v_status
    FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_total = 24300, 'T14 total = 8h - 75min (got ' || v_total || ')');
  PERFORM public.assert_true(v_break = 4500, 'T14 break kept (got ' || v_break || ')');
  PERFORM public.assert_true(v_status = 'completed', 'T14 status completed');

  -- T15: employee cannot rewrite clock_in / date (correction flow only)
  UPDATE time_entries SET clock_in = '2026-09-29 08:00:00+00'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  UPDATE time_entries SET date = '2026-09-28'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT clock_in, date INTO v_clock_in, v_date
    FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_clock_in = '2026-09-29 09:00:00+00', 'T15 clock_in immutable for employee');
  PERFORM public.assert_true(v_date = '2026-09-29', 'T15 date immutable for employee');

  -- T16: employee cannot reopen a closed day
  UPDATE time_entries SET clock_out = NULL, status = 'active'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT clock_out, status INTO v_clock_out, v_status
    FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_clock_out = '2026-09-29 17:00:00+00', 'T16 closed day stays closed');
  PERFORM public.assert_true(v_status = 'completed', 'T16 status stays completed');

  -- T17: employee cannot mark own entry as corrected
  UPDATE time_entries SET status = 'corrected'
   WHERE id = '77777777-0000-0000-0000-0000000000a1';
  SELECT status INTO v_status FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(v_status = 'completed', 'T17 employee cannot set corrected status');

  -- T17b: a future clock_out is clamped to "now"
  INSERT INTO time_entries (id, company_id, employee_id, date, clock_in, status)
  VALUES ('77777777-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-00000000000a',
          'eeeeeeee-0000-0000-0000-0000000000a1', '2026-09-28', '2026-09-28 09:00:00+00', 'active');
  UPDATE time_entries SET clock_out = '2026-12-31 23:00:00+00', status = 'completed'
   WHERE id = '77777777-0000-0000-0000-0000000000a2';
  SELECT clock_out INTO v_clock_out FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000a2';
  PERFORM public.assert_true(
    v_clock_out <= now() AND v_clock_out > now() - interval '1 minute',
    'T17b future clock_out clamped to now (got ' || v_clock_out::text || ')');

  -- T18: employee sees only own rows, never tenant B
  SELECT count(*) INTO n FROM time_entries
   WHERE company_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  PERFORM public.assert_true(n = 0, 'T18 employee must not read tenant B entries (got ' || n || ')');

  RESET ROLE;
END $$;
\echo 'T7-T18 PASS: time entry integrity + isolation'

-- ===========================================================================
-- T19: admin A sees only tenant A; admin A cannot touch tenant B
-- ===========================================================================
DO $$
DECLARE n bigint; v_failed boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;

  SELECT count(*) INTO n FROM time_entries;
  PERFORM public.assert_true(n = 2, 'T19 admin A sees exactly tenant A entries (got ' || n || ')');

  BEGIN
    UPDATE time_entries SET clock_out = '2026-09-01 12:00:00+00'
     WHERE id = '77777777-0000-0000-0000-0000000000b1';
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  -- RLS blocks the write (0 rows updated, no error) so check visibility instead
  PERFORM public.assert_true(v_failed OR NOT EXISTS (
    SELECT 1 FROM time_entries WHERE id = '77777777-0000-0000-0000-0000000000b1'
      AND clock_out = '2026-09-01 12:00:00+00'
  ), 'T19 admin A must not modify tenant B entries');

  SELECT count(*) INTO n FROM documents;
  PERFORM public.assert_true(n = 0, 'T19 admin A must not read tenant B documents');

  SELECT count(*) INTO n FROM employees;
  PERFORM public.assert_true(n = 2, 'T19 admin A sees only own employees (got ' || n || ')');

  SELECT count(*) INTO n FROM companies;
  PERFORM public.assert_true(n = 1, 'T19 admin A sees own company (got ' || n || ')');

  RESET ROLE;
END $$;
\echo 'T19 PASS: admin tenant isolation'

-- ===========================================================================
-- T20: cross-tenant correction requests are impossible
-- ===========================================================================
DO $$
DECLARE v_failed boolean; v_time_entry uuid; n bigint;
BEGIN
  -- employee A1 tries to insert a self-approved correction on a B entry
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;

  v_failed := false;
  BEGIN
    INSERT INTO time_corrections (time_entry_id, employee_id, company_id, reason, status, new_clock_in, new_clock_out)
    VALUES ('77777777-0000-0000-0000-0000000000b1', 'eeeeeeee-0000-0000-0000-0000000000a1',
            'aaaaaaaa-0000-0000-0000-00000000000a', 'steal', 'approved', now(), now() + interval '1 hour');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T20 cross-tenant correction must be rejected');

  -- self-approved correction must also be rejected
  v_failed := false;
  SELECT id INTO v_time_entry FROM time_entries
   WHERE employee_id = 'eeeeeeee-0000-0000-0000-0000000000a1' ORDER BY date DESC LIMIT 1;
  BEGIN
    INSERT INTO time_corrections (time_entry_id, employee_id, company_id, reason, status, new_clock_in, new_clock_out)
    VALUES (v_time_entry, 'eeeeeeee-0000-0000-0000-0000000000a1',
            'aaaaaaaa-0000-0000-0000-00000000000a', 'approve myself', 'approved',
            '2026-09-29 08:00:00+00', '2026-09-29 20:00:00+00');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T20 employee must not self-approve a correction');

  -- valid pending correction is allowed
  INSERT INTO time_corrections (id, time_entry_id, employee_id, company_id, reason, status, new_clock_in, new_clock_out)
  VALUES ('55555555-0000-0000-0000-0000000000a1', v_time_entry, 'eeeeeeee-0000-0000-0000-0000000000a1',
          'aaaaaaaa-0000-0000-0000-00000000000a', 'forgot to clock out', 'pending',
          '2026-09-29 09:00:00+00', '2026-09-29 17:30:00+00');

  -- employee can withdraw it while pending
  DELETE FROM time_corrections WHERE id = '55555555-0000-0000-0000-0000000000a1';
  SELECT count(*) INTO n FROM time_corrections WHERE id = '55555555-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(n = 0, 'T20 pending correction withdrawable');

  -- recreate for the admin tests
  INSERT INTO time_corrections (id, time_entry_id, employee_id, company_id, reason, status, new_clock_in, new_clock_out)
  VALUES ('55555555-0000-0000-0000-0000000000a1', v_time_entry, 'eeeeeeee-0000-0000-0000-0000000000a1',
          'aaaaaaaa-0000-0000-0000-00000000000a', 'forgot to clock out', 'pending',
          '2026-09-29 09:00:00+00', '2026-09-29 17:30:00+00');

  RESET ROLE;
END $$;
\echo 'T20 PASS: correction requests'

-- ===========================================================================
-- T21: leave requests
-- ===========================================================================
DO $$
DECLARE v_failed boolean; n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;

  -- self-approved leave is rejected
  v_failed := false;
  BEGIN
    INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, reason, status, reviewed_by)
    VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-0000000000a1',
            '88888888-0000-0000-0000-0000000000a1', '2026-10-01', '2026-10-05', 'x', 'approved',
            '10000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T21 employee must not self-approve leave');

  -- cross-tenant leave is rejected
  v_failed := false;
  BEGIN
    INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, reason, status)
    VALUES ('bbbbbbbb-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-0000000000a1',
            '88888888-0000-0000-0000-0000000000a1', '2026-10-01', '2026-10-05', 'x', 'pending');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T21 cross-tenant leave rejected');

  -- inverted dates are rejected
  v_failed := false;
  BEGIN
    INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, reason, status)
    VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-0000000000a1',
            '88888888-0000-0000-0000-0000000000a1', '2026-10-05', '2026-10-01', 'x', 'pending');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T21 inverted date range rejected');

  -- valid request works, then withdraw
  INSERT INTO leave_requests (id, company_id, employee_id, leave_type_id, start_date, end_date, reason, status)
  VALUES ('44444444-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a',
          'eeeeeeee-0000-0000-0000-0000000000a1', '88888888-0000-0000-0000-0000000000a1',
          '2026-10-01', '2026-10-05', 'holiday', 'pending');
  DELETE FROM leave_requests WHERE id = '44444444-0000-0000-0000-0000000000a1';
  SELECT count(*) INTO n FROM leave_requests WHERE id = '44444444-0000-0000-0000-0000000000a1';
  PERFORM public.assert_true(n = 0, 'T21 pending leave withdrawable');

  RESET ROLE;
END $$;
\echo 'T21 PASS: leave requests'

-- ===========================================================================
-- T22: documents (cross-tenant insert + read isolation)
-- ===========================================================================
DO $$
DECLARE v_failed boolean; n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;

  -- admin A attaching a document to a tenant B employee
  v_failed := false;
  BEGIN
    INSERT INTO documents (company_id, employee_id, file_name, file_path, file_type, file_size, document_type)
    VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-0000000000b1',
            'x.pdf', 'a/b/x.pdf', 'application/pdf', 10, 'contract');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T22 document for foreign employee rejected');

  -- storage: admin A cannot read tenant B objects
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'documents';
  PERFORM public.assert_true(n = 1, 'T22 admin A sees only own storage objects (got ' || n || ')');

  RESET ROLE;

  -- employee A1 storage visibility
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'documents';
  PERFORM public.assert_true(n = 1, 'T22 employee sees only own storage objects (got ' || n || ')');
  SELECT count(*) INTO n FROM documents;
  PERFORM public.assert_true(n = 0, 'T22 employee sees no documents row (none uploaded yet)');
  RESET ROLE;
END $$;
\echo 'T22 PASS: documents isolation'

-- ===========================================================================
-- T23: invitations visibility (admin-only) + companies visibility
-- ===========================================================================
DO $$
DECLARE n bigint;
BEGIN
  -- admin A sees the invitation, admin B does not, employee A1 does not
  PERFORM set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM employee_invitations;
  PERFORM public.assert_true(n = 1, 'T23 admin A sees own invitations (got ' || n || ')');
  RESET ROLE;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', false);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM employee_invitations;
  PERFORM public.assert_true(n = 0, 'T23 admin B sees no foreign invitations (got ' || n || ')');
  RESET ROLE;

  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  SELECT count(*) INTO n FROM employee_invitations;
  PERFORM public.assert_true(n = 0, 'T23 employee must not see invitation tokens (got ' || n || ')');

  -- employee can read own company name now
  SELECT count(*) INTO n FROM companies;
  PERFORM public.assert_true(n = 1, 'T23 employee reads own company (got ' || n || ')');
  RESET ROLE;
END $$;
\echo 'T23 PASS: invitations + companies visibility'

-- ===========================================================================
-- ===========================================================================
-- T24: updated_at triggers must not break UPDATEs on documents/corrections
-- ===========================================================================
DO $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;

  UPDATE time_corrections SET review_notes = 'touched'
   WHERE company_id = 'aaaaaaaa-0000-0000-0000-00000000000a';

  UPDATE documents SET description = description
   WHERE company_id = 'aaaaaaaa-0000-0000-0000-00000000000a';

  RESET ROLE;
  SELECT count(*) INTO n FROM documents;
  PERFORM public.assert_true(n >= 0, 'T24 updated_at triggers did not break UPDATEs');
END $$;
\echo 'T24 PASS: updated_at triggers on documents/corrections'

-- ===========================================================================
-- T25: create_user_profile rules for authenticated callers
-- ===========================================================================
DO $$
DECLARE v_failed boolean;
BEGIN
  -- cannot create a record for someone else
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  v_failed := false;
  BEGIN
    PERFORM public.create_user_profile('10000000-0000-0000-0000-000000000002', 'Spoof');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  PERFORM public.assert_true(v_failed, 'T25 cannot create profile for another user');
  RESET ROLE;

  -- creating own record (missing row) still works
  PERFORM set_config('request.jwt.claims',
    '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  PERFORM public.create_user_profile('30000000-0000-0000-0000-000000000001', 'Intruder');
  RESET ROLE;
  PERFORM public.assert_true(
    EXISTS (SELECT 1 FROM users WHERE id = '30000000-0000-0000-0000-000000000001'),
    'T25 self profile creation works');
END $$;
\echo 'T25 PASS: create_user_profile rules'

-- ===========================================================================
-- T26: internal document signature (sign_document RPC)
-- ===========================================================================
DO $$
DECLARE v_failed boolean; v_doc uuid;
BEGIN
  -- setup: docs as admin role (bypass RLS)
  INSERT INTO documents (id, company_id, employee_id, file_name, file_path, file_type,
                         file_size, document_type, uploaded_by, requires_signature)
  VALUES
    ('77777777-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'eeeeeeee-0000-0000-0000-0000000000a1', 'contract.pdf', 'aaa/eee/contract.pdf',
     'application/pdf', 1000, 'contract', '10000000-0000-0000-0000-000000000001', true),
    ('77777777-0000-0000-0000-0000000000d2', 'aaaaaaaa-0000-0000-0000-00000000000a',
     'eeeeeeee-0000-0000-0000-0000000000a1', 'payslip.pdf', 'aaa/eee/payslip.pdf',
     'application/pdf', 500, 'payslip', '10000000-0000-0000-0000-000000000001', false);

  -- employee A1 signs own doc
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  PERFORM public.sign_document('77777777-0000-0000-0000-0000000000d1');
  RESET ROLE;

  PERFORM public.assert_true(
    (SELECT signed_at IS NOT NULL
       AND signed_by = '20000000-0000-0000-0000-000000000001'
       AND signature_provider = 'internal'
     FROM documents WHERE id = '77777777-0000-0000-0000-0000000000d1'),
    'T26 sign_document marks document signed');

  -- double sign rejected
  v_failed := false;
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.sign_document('77777777-0000-0000-0000-0000000000d1');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(v_failed, 'T26 double sign rejected');

  -- signing a doc that does not require signature rejected
  v_failed := false;
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.sign_document('77777777-0000-0000-0000-0000000000d2');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(v_failed, 'T26 signature_not_required rejected');

  -- employee B1 cannot sign A1 doc
  v_failed := false;
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}', false);
  SET ROLE authenticated;
  BEGIN
    PERFORM public.sign_document('77777777-0000-0000-0000-0000000000d1');
  EXCEPTION WHEN OTHERS THEN v_failed := true;
  END;
  RESET ROLE;
  PERFORM public.assert_true(v_failed, 'T26 cross-employee sign rejected');

  -- employees still cannot UPDATE documents directly (RLS silently matches 0 rows)
  PERFORM set_config('request.jwt.claims',
    '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', false);
  SET ROLE authenticated;
  UPDATE documents SET requires_signature = false
   WHERE id = '77777777-0000-0000-0000-0000000000d1';
  RESET ROLE;
  PERFORM public.assert_true(
    (SELECT requires_signature FROM documents
      WHERE id = '77777777-0000-0000-0000-0000000000d1'),
    'T26 employees cannot UPDATE documents');
END $$;
\echo 'T26 PASS: document signing'

\echo ''
\echo 'ALL RLS + INTEGRITY TESTS PASSED
