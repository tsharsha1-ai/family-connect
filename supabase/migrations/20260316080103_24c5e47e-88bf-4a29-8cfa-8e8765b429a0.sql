
-- 1. Create family_members junction table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role public.persona_role NOT NULL DEFAULT 'man',
  is_admin boolean NOT NULL DEFAULT false,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- 2. Migrate existing profiles data
INSERT INTO public.family_members (user_id, family_id, display_name, role, is_admin, avatar_url, created_at)
SELECT id, family_id, display_name, role, is_admin, avatar_url, created_at FROM public.profiles;

-- 3. Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- 4. Create membership check function
CREATE OR REPLACE FUNCTION public.user_is_family_member(fid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND family_id = fid)
$$;

-- 5. RLS policies for family_members
CREATE POLICY "Users see family co-members"
  ON public.family_members FOR SELECT TO authenticated
  USING (user_is_family_member(family_id));

CREATE POLICY "Users can join families"
  ON public.family_members FOR INSERT TO anon, authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own membership"
  ON public.family_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 6. Update blessings policies
DROP POLICY "Family can see blessings" ON public.blessings;
CREATE POLICY "Family can see blessings" ON public.blessings
  FOR SELECT TO authenticated USING (user_is_family_member(family_id));

DROP POLICY "Users can create blessings" ON public.blessings;
CREATE POLICY "Users can create blessings" ON public.blessings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND user_is_family_member(family_id));

-- 7. Update family_events policies
DROP POLICY "Family can see events" ON public.family_events;
CREATE POLICY "Family can see events" ON public.family_events
  FOR SELECT TO authenticated USING (user_is_family_member(family_id));

DROP POLICY "Family can create events" ON public.family_events;
CREATE POLICY "Family can create events" ON public.family_events
  FOR INSERT TO authenticated WITH CHECK (user_is_family_member(family_id));

DROP POLICY "Family can update events" ON public.family_events;
CREATE POLICY "Family can update events" ON public.family_events
  FOR UPDATE TO authenticated USING (user_is_family_member(family_id));

DROP POLICY "Family can delete events" ON public.family_events;
CREATE POLICY "Family can delete events" ON public.family_events
  FOR DELETE TO authenticated USING (user_is_family_member(family_id));

-- 8. Update game_scores policies
DROP POLICY "Family can see scores" ON public.game_scores;
CREATE POLICY "Family can see scores" ON public.game_scores
  FOR SELECT TO authenticated USING (user_is_family_member(family_id));

DROP POLICY "Users can create scores" ON public.game_scores;
CREATE POLICY "Users can create scores" ON public.game_scores
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND user_is_family_member(family_id));

-- 9. Update predictions policies
DROP POLICY "Users see family predictions" ON public.predictions;
CREATE POLICY "Users see family predictions" ON public.predictions
  FOR SELECT TO authenticated USING (
    user_id IN (
      SELECT fm.user_id FROM public.family_members fm
      WHERE fm.family_id IN (
        SELECT fm2.family_id FROM public.family_members fm2 WHERE fm2.user_id = auth.uid()
      )
    )
  );

-- 10. Update style_posts policies
DROP POLICY "Family can see style posts" ON public.style_posts;
CREATE POLICY "Family can see style posts" ON public.style_posts
  FOR SELECT TO authenticated USING (user_is_family_member(family_id));

DROP POLICY "Users can create style posts" ON public.style_posts;
CREATE POLICY "Users can create style posts" ON public.style_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND user_is_family_member(family_id));

-- 11. Update style_comments policies
DROP POLICY "Family can see comments" ON public.style_comments;
CREATE POLICY "Family can see comments" ON public.style_comments
  FOR SELECT TO authenticated USING (
    post_id IN (SELECT id FROM public.style_posts WHERE user_is_family_member(family_id))
  );

-- 12. Update style_likes policies
DROP POLICY "Family can see likes" ON public.style_likes;
CREATE POLICY "Family can see likes" ON public.style_likes
  FOR SELECT TO authenticated USING (
    post_id IN (SELECT id FROM public.style_posts WHERE user_is_family_member(family_id))
  );

-- 13. Update push_subscriptions policies
DROP POLICY "Select family subscriptions" ON public.push_subscriptions;
CREATE POLICY "Select family subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_is_family_member(family_id));

-- 14. Update profiles SELECT policy to just own profile
DROP POLICY "Users see family members" ON public.profiles;
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
