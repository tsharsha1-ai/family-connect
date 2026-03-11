
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Anyone can create families" ON public.families FOR INSERT TO public WITH CHECK (true);
