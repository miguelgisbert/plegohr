-- ============================================
-- INSTRUCCIONS PER EXECUTAR LES MIGRATIONS
-- ============================================
-- 
-- Copia i enganxa cada secció al SQL Editor de Supabase
-- Executa-les EN ORDRE (1, 2, 3, 4, 5, 6)
-- Després de cada execució, verifica que no hi ha errors
--
-- ============================================

-- IMPORTANT: No executis totes a la vegada!
-- Executa-les UNA PER UNA en l'ordre indicat

-- ============================================
-- MIGRATION 1: CREATE INITIAL SCHEMA
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251121150408_create_initial_schema.sql

-- Passos:
-- 1. Obre el fitxer supabase/migrations/20251121150408_create_initial_schema.sql
-- 2. Copia TOT el contingut (277 línies)
-- 3. Enganxa al SQL Editor de Supabase
-- 4. Click "Run" (o Ctrl+Enter)
-- 5. Verifica que apareix: "Success. No rows returned"
-- 6. Ves a "Database" → "Tables" i verifica que veus:
--    - companies
--    - profiles
--    - employees


-- ============================================
-- MIGRATION 2: FIX INFINITE RECURSION RLS
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251201130342_fix_infinite_recursion_rls_policies.sql

-- Passos:
-- 1. New Query al SQL Editor
-- 2. Copia TOT el contingut del fitxer (77 línies)
-- 3. Enganxa i Run
-- 4. Verifica "Success"


-- ============================================
-- MIGRATION 3: ADD EMPLOYEE INVITATIONS
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251201221513_add_employee_invitations.sql

-- Passos:
-- 1. New Query al SQL Editor
-- 2. Copia TOT el contingut del fitxer (93 línies)
-- 3. Enganxa i Run
-- 4. Ves a Tables i verifica que veus:
--    - employee_invitations


-- ============================================
-- MIGRATION 4: CREATE DOCUMENTS TABLE
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251202170826_create_documents_table.sql

-- Passos:
-- 1. New Query al SQL Editor
-- 2. Copia TOT el contingut del fitxer
-- 3. Enganxa i Run
-- 4. Ves a Tables i verifica que veus:
--    - documents


-- ============================================
-- MIGRATION 5: CREATE DOCUMENTS STORAGE BUCKET
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251202171135_create_documents_storage_bucket.sql

-- Passos:
-- 1. New Query al SQL Editor
-- 2. Copia TOT el contingut del fitxer
-- 3. Enganxa i Run
-- 4. Ves a "Storage" i verifica que veus el bucket "documents"


-- ============================================
-- MIGRATION 6: CREATE LEAVE REQUESTS TABLE
-- ============================================
-- Copia tot el contingut del fitxer:
-- supabase/migrations/20251202172056_create_leave_requests_table.sql

-- Passos:
-- 1. New Query al SQL Editor
-- 2. Copia TOT el contingut del fitxer
-- 3. Enganxa i Run
-- 4. Ves a Tables i verifica que veus:
--    - leave_requests


-- ============================================
-- VERIFICACIÓ FINAL
-- ============================================
-- Després d'executar TOTES les migrations, verifica:
--
-- A "Database" → "Tables" hauries de veure:
--   ✓ companies
--   ✓ profiles
--   ✓ employees
--   ✓ employee_invitations
--   ✓ documents
--   ✓ leave_requests
--
-- A "Storage" hauries de veure:
--   ✓ documents (bucket)
--
-- Si veus totes aquestes taules, el setup està complet! ✅


-- ============================================
-- SCRIPT RÀPID DE VERIFICACIÓ
-- ============================================
-- Executa aquest script per verificar que tot està creat:

SELECT 
    'companies' as table_name, 
    COUNT(*) as count 
FROM companies
UNION ALL
SELECT 
    'profiles' as table_name, 
    COUNT(*) as count 
FROM profiles
UNION ALL
SELECT 
    'employees' as table_name, 
    COUNT(*) as count 
FROM employees
UNION ALL
SELECT 
    'employee_invitations' as table_name, 
    COUNT(*) as count 
FROM employee_invitations
UNION ALL
SELECT 
    'documents' as table_name, 
    COUNT(*) as count 
FROM documents
UNION ALL
SELECT 
    'leave_requests' as table_name, 
    COUNT(*) as count 
FROM leave_requests;

-- Si aquest script s'executa sense errors, totes les taules existeixen! ✅
