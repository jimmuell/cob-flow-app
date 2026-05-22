-- =============================================================================
-- Create content-assets Supabase Storage bucket with platform/customer RLS.
-- Applied manually via psql after the Drizzle-generated DDL migration.
-- Path scheme:
--   platform/{course_slug}/{module_slug}/{lesson_slug}/{uuid}.{ext}
--   customer/{tenant_id}/{course_slug}/{module_slug}/{lesson_slug}/{uuid}.{ext}
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-assets',
  'content-assets',
  false,
  52428800,  -- 50 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS policies
-- Platform path — any signed-in user may read.
-- Customer path — only same-tenant users may read.
-- Writes — Admin for platform; Manager or Supervisor for their tenant.
-- ---------------------------------------------------------------------------

CREATE POLICY "content_assets_platform_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'platform'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "content_assets_customer_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = current_setting('app.current_tenant_id', true)
  );

CREATE POLICY "content_assets_platform_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'platform'
    AND is_admin()
  );

CREATE POLICY "content_assets_customer_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = current_setting('app.current_tenant_id', true)
    AND (is_manager() OR is_supervisor())
  );

CREATE POLICY "content_assets_platform_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'platform'
    AND is_admin()
  );

CREATE POLICY "content_assets_customer_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = current_setting('app.current_tenant_id', true)
    AND (is_manager() OR is_supervisor())
  );

CREATE POLICY "content_assets_platform_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'platform'
    AND is_admin()
  );

CREATE POLICY "content_assets_customer_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'content-assets'
    AND (storage.foldername(name))[1] = 'customer'
    AND (storage.foldername(name))[2] = current_setting('app.current_tenant_id', true)
    AND (is_manager() OR is_supervisor())
  );
