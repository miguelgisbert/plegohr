/*
  # Create storage bucket for documents

  1. Storage
    - Create 'documents' bucket for employee document files
    - Enable public access set to false (documents are private)
    - Set file size limit and allowed MIME types

  2. Security
    - RLS policies for bucket access
    - Company admins can upload/view/delete documents for their employees
    - Employees can only view/download their own documents
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company admins can upload documents for their employees"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND (storage.foldername(name))[1] = profiles.company_id::text
  )
);

CREATE POLICY "Company admins can view documents for their employees"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND (storage.foldername(name))[1] = profiles.company_id::text
  )
);

CREATE POLICY "Company admins can delete documents for their employees"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND (storage.foldername(name))[1] = profiles.company_id::text
  )
);

CREATE POLICY "Employees can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.user_id = auth.uid()
    AND (storage.foldername(name))[2] = employees.id::text
  )
);
