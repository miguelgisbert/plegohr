-- Company settings: logo on companies, per-company email templates, and the
-- public company-logos storage bucket (logos are non-sensitive, public read;
-- writes restricted to the company admin).
-- Applies on top of 20260930000001_documents_signing.sql.

-- ============================================================================
-- 1. companies.logo_path
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_path text;

COMMENT ON COLUMN public.companies.logo_path IS
  'Storage path inside the company-logos bucket (e.g. <company_id>/logo.png)';

-- ============================================================================
-- 2. email_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('invitation', 'payslip', 'contract')),
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, template_type)
);

COMMENT ON TABLE public.email_templates IS
  'Per-company email templates. Placeholders: {{employee_name}}, {{company_name}}, {{invite_url}}, {{month}}, {{login_url}} depending on template_type.';

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company admins can view email templates" ON public.email_templates;
CREATE POLICY "Company admins can view email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.company_id = email_templates.company_id
        AND users.type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company admins can create email templates" ON public.email_templates;
CREATE POLICY "Company admins can create email templates"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.company_id = email_templates.company_id
        AND users.type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company admins can update email templates" ON public.email_templates;
CREATE POLICY "Company admins can update email templates"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.company_id = email_templates.company_id
        AND users.type = 'company'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.company_id = email_templates.company_id
        AND users.type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company admins can delete email templates" ON public.email_templates;
CREATE POLICY "Company admins can delete email templates"
  ON public.email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.company_id = email_templates.company_id
        AND users.type = 'company'
    )
  );

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. company-logos storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: logos are displayed in the app nav (and potentially in emails).
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
CREATE POLICY "Public can view company logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- Only the company admin may write inside their own <company_id>/ folder.
DROP POLICY IF EXISTS "Company admins can upload logos" ON storage.objects;
CREATE POLICY "Company admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users
      WHERE id = auth.uid() AND type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company admins can update logos" ON storage.objects;
CREATE POLICY "Company admins can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users
      WHERE id = auth.uid() AND type = 'company'
    )
  );

DROP POLICY IF EXISTS "Company admins can delete logos" ON storage.objects;
CREATE POLICY "Company admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users
      WHERE id = auth.uid() AND type = 'company'
    )
  );
