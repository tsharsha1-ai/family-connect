
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (id = auth.uid());
