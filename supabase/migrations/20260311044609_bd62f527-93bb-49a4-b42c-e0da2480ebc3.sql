-- Drop ALL existing restrictive policies and recreate as PERMISSIVE

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users see family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can create own profile" ON public.profiles
  AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users see family members" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can update own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ===== FAMILIES =====
DROP POLICY IF EXISTS "Anyone can create families" ON public.families;
DROP POLICY IF EXISTS "Anyone can read families by access_code" ON public.families;
DROP POLICY IF EXISTS "Family admin can update family" ON public.families;

CREATE POLICY "Anyone can create families" ON public.families
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read families by access_code" ON public.families
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Family admin can update family" ON public.families
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ===== FAMILY_EVENTS =====
DROP POLICY IF EXISTS "Family can see events" ON public.family_events;
DROP POLICY IF EXISTS "Family can create events" ON public.family_events;
DROP POLICY IF EXISTS "Family can update events" ON public.family_events;
DROP POLICY IF EXISTS "Family can delete events" ON public.family_events;

CREATE POLICY "Family can see events" ON public.family_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Family can create events" ON public.family_events
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (family_id = get_user_family_id());

CREATE POLICY "Family can update events" ON public.family_events
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Family can delete events" ON public.family_events
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (family_id = get_user_family_id());

-- ===== BLESSINGS =====
DROP POLICY IF EXISTS "Family can see blessings" ON public.blessings;
DROP POLICY IF EXISTS "Users can create blessings" ON public.blessings;

CREATE POLICY "Family can see blessings" ON public.blessings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can create blessings" ON public.blessings
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

-- ===== GAME_SCORES =====
DROP POLICY IF EXISTS "Family can see scores" ON public.game_scores;
DROP POLICY IF EXISTS "Users can create scores" ON public.game_scores;

CREATE POLICY "Family can see scores" ON public.game_scores
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can create scores" ON public.game_scores
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

-- ===== PREDICTIONS =====
DROP POLICY IF EXISTS "Users can create own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users see family predictions" ON public.predictions;

CREATE POLICY "Users can create own predictions" ON public.predictions
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see family predictions" ON public.predictions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id IN (SELECT profiles.id FROM profiles WHERE profiles.family_id = get_user_family_id()));

-- ===== STYLE_POSTS =====
DROP POLICY IF EXISTS "Family can see style posts" ON public.style_posts;
DROP POLICY IF EXISTS "Users can create style posts" ON public.style_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.style_posts;

CREATE POLICY "Family can see style posts" ON public.style_posts
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can create style posts" ON public.style_posts
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND family_id = get_user_family_id());

CREATE POLICY "Users can delete own posts" ON public.style_posts
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===== STYLE_LIKES =====
DROP POLICY IF EXISTS "Users can like posts" ON public.style_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.style_likes;
DROP POLICY IF EXISTS "Family can see likes" ON public.style_likes;

CREATE POLICY "Users can like posts" ON public.style_likes
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts" ON public.style_likes
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Family can see likes" ON public.style_likes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (post_id IN (SELECT style_posts.id FROM style_posts WHERE style_posts.family_id = get_user_family_id()));

-- ===== STYLE_COMMENTS =====
DROP POLICY IF EXISTS "Family can see comments" ON public.style_comments;
DROP POLICY IF EXISTS "Users can comment" ON public.style_comments;

CREATE POLICY "Family can see comments" ON public.style_comments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (post_id IN (SELECT style_posts.id FROM style_posts WHERE style_posts.family_id = get_user_family_id()));

CREATE POLICY "Users can comment" ON public.style_comments
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());