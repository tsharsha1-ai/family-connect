
-- Fix ALL restrictive policies to be permissive

-- profiles
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users see family members" ON public.profiles;
CREATE POLICY "Users see family members" ON public.profiles FOR SELECT TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- families
DROP POLICY IF EXISTS "Anyone can create families" ON public.families;
CREATE POLICY "Anyone can create families" ON public.families FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read families by access_code" ON public.families;
CREATE POLICY "Anyone can read families by access_code" ON public.families FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Family admin can update family" ON public.families;
CREATE POLICY "Family admin can update family" ON public.families FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- family_events
DROP POLICY IF EXISTS "Family can see events" ON public.family_events;
CREATE POLICY "Family can see events" ON public.family_events FOR SELECT TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Family can create events" ON public.family_events;
CREATE POLICY "Family can create events" ON public.family_events FOR INSERT TO authenticated WITH CHECK (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Family can update events" ON public.family_events;
CREATE POLICY "Family can update events" ON public.family_events FOR UPDATE TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Family can delete events" ON public.family_events;
CREATE POLICY "Family can delete events" ON public.family_events FOR DELETE TO authenticated USING (family_id = get_user_family_id());

-- blessings
DROP POLICY IF EXISTS "Family can see blessings" ON public.blessings;
CREATE POLICY "Family can see blessings" ON public.blessings FOR SELECT TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Users can create blessings" ON public.blessings;
CREATE POLICY "Users can create blessings" ON public.blessings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

-- game_scores
DROP POLICY IF EXISTS "Family can see scores" ON public.game_scores;
CREATE POLICY "Family can see scores" ON public.game_scores FOR SELECT TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Users can create scores" ON public.game_scores;
CREATE POLICY "Users can create scores" ON public.game_scores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

-- predictions
DROP POLICY IF EXISTS "Users can create own predictions" ON public.predictions;
CREATE POLICY "Users can create own predictions" ON public.predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users see family predictions" ON public.predictions;
CREATE POLICY "Users see family predictions" ON public.predictions FOR SELECT TO authenticated USING (user_id IN (SELECT profiles.id FROM profiles WHERE profiles.family_id = get_user_family_id()));

-- style_posts
DROP POLICY IF EXISTS "Family can see style posts" ON public.style_posts;
CREATE POLICY "Family can see style posts" ON public.style_posts FOR SELECT TO authenticated USING (family_id = get_user_family_id());

DROP POLICY IF EXISTS "Users can create style posts" ON public.style_posts;
CREATE POLICY "Users can create style posts" ON public.style_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

DROP POLICY IF EXISTS "Users can delete own posts" ON public.style_posts;
CREATE POLICY "Users can delete own posts" ON public.style_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- style_likes
DROP POLICY IF EXISTS "Family can see likes" ON public.style_likes;
CREATE POLICY "Family can see likes" ON public.style_likes FOR SELECT TO authenticated USING (post_id IN (SELECT style_posts.id FROM style_posts WHERE style_posts.family_id = get_user_family_id()));

DROP POLICY IF EXISTS "Users can like posts" ON public.style_likes;
CREATE POLICY "Users can like posts" ON public.style_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unlike posts" ON public.style_likes;
CREATE POLICY "Users can unlike posts" ON public.style_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- style_comments
DROP POLICY IF EXISTS "Family can see comments" ON public.style_comments;
CREATE POLICY "Family can see comments" ON public.style_comments FOR SELECT TO authenticated USING (post_id IN (SELECT style_posts.id FROM style_posts WHERE style_posts.family_id = get_user_family_id()));

DROP POLICY IF EXISTS "Users can comment" ON public.style_comments;
CREATE POLICY "Users can comment" ON public.style_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
