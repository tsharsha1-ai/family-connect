
-- Create style-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('style-images', 'style-images', true);

-- Upload policy: authenticated users can upload to their own folder
CREATE POLICY "Users upload style images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'style-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Delete policy
CREATE POLICY "Users delete own style images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'style-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read
CREATE POLICY "Public read style images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'style-images');
