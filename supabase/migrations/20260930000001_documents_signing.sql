-- ============================================================================
-- 20260930000001_documents_signing.sql
-- Internal document signature (provider-friendly schema)
-- ----------------------------------------------------------------------------
-- Employees sign documents from the app. Columns are shaped so an external
-- e-signature provider (DocuSign, etc.) can be plugged in later without
-- schema changes: `signature_provider` records who produced the signature and
-- `provider_reference` stores the external envelope id when that happens.
-- ============================================================================

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS requires_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_provider text
    CHECK (signature_provider IS NULL OR signature_provider IN ('internal', 'external')),
  ADD COLUMN IF NOT EXISTS provider_reference text;

COMMENT ON COLUMN documents.requires_signature is
  'Admin asked the employee to sign this document';
COMMENT ON COLUMN documents.signature_provider is
  '''internal'' (signed in app) or ''external'' (e-signature provider)';
COMMENT ON COLUMN documents.provider_reference is
  'External provider envelope id (future e-signature integration)';

-- ----------------------------------------------------------------------------
-- sign_document(): the employee acknowledges/signs their own document.
-- SECURITY DEFINER because employees have SELECT-only RLS on documents and
-- must not be able to touch any other column.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sign_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_doc documents;
  v_employee_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_doc FROM documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_found';
  END IF;

  -- The caller must be the employee this document belongs to.
  SELECT e.id INTO v_employee_id
  FROM employees e
  WHERE e.user_id = v_uid
    AND e.company_id = v_doc.company_id;

  IF v_employee_id IS NULL OR v_employee_id <> v_doc.employee_id THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF NOT v_doc.requires_signature THEN
    RAISE EXCEPTION 'signature_not_required';
  END IF;

  IF v_doc.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_signed';
  END IF;

  UPDATE documents
  SET signed_at = now(),
      signed_by = v_uid,
      signature_provider = 'internal',
      provider_reference = NULL
  WHERE id = p_document_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_document(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.sign_document(uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.sign_document(uuid) TO authenticated;
