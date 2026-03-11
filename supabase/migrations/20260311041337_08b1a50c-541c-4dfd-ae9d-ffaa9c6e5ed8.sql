
-- Create enum for persona roles
CREATE TYPE public.persona_role AS ENUM ('kid', 'man', 'woman', 'elder');

-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('birthday', 'anniversary', 'travel');

-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role persona_role NOT NULL DEFAULT 'man',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  predicted_winner TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create style_posts table
CREATE TABLE public.style_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create style_likes table
CREATE TABLE public.style_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.style_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create style_comments table
CREATE TABLE public.style_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.style_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_events table
CREATE TABLE public.family_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  type event_type NOT NULL DEFAULT 'birthday',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blessings table
CREATE TABLE public.blessings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_scores table
CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  game TEXT NOT NULL DEFAULT 'whack-a-mole',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blessings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's family_id
CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Families: allow anyone to read (for joining), authenticated can create
CREATE POLICY "Anyone can read families by access_code" ON public.families
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create families" ON public.families
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Family admin can update family" ON public.families
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Profiles: users see family members, can insert/update own
CREATE POLICY "Users see family members" ON public.profiles
  FOR SELECT TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Predictions
CREATE POLICY "Users see family predictions" ON public.predictions
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM public.profiles WHERE family_id = public.get_user_family_id())
  );
CREATE POLICY "Users can create own predictions" ON public.predictions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Style posts
CREATE POLICY "Family can see style posts" ON public.style_posts
  FOR SELECT TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Users can create style posts" ON public.style_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = public.get_user_family_id());
CREATE POLICY "Users can delete own posts" ON public.style_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Style likes
CREATE POLICY "Family can see likes" ON public.style_likes
  FOR SELECT TO authenticated USING (
    post_id IN (SELECT id FROM public.style_posts WHERE family_id = public.get_user_family_id())
  );
CREATE POLICY "Users can like posts" ON public.style_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike posts" ON public.style_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Style comments
CREATE POLICY "Family can see comments" ON public.style_comments
  FOR SELECT TO authenticated USING (
    post_id IN (SELECT id FROM public.style_posts WHERE family_id = public.get_user_family_id())
  );
CREATE POLICY "Users can comment" ON public.style_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Family events
CREATE POLICY "Family can see events" ON public.family_events
  FOR SELECT TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Family can create events" ON public.family_events
  FOR INSERT TO authenticated WITH CHECK (family_id = public.get_user_family_id());
CREATE POLICY "Family can update events" ON public.family_events
  FOR UPDATE TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Family can delete events" ON public.family_events
  FOR DELETE TO authenticated USING (family_id = public.get_user_family_id());

-- Blessings
CREATE POLICY "Family can see blessings" ON public.blessings
  FOR SELECT TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Users can create blessings" ON public.blessings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = public.get_user_family_id());

-- Game scores
CREATE POLICY "Family can see scores" ON public.game_scores
  FOR SELECT TO authenticated USING (family_id = public.get_user_family_id());
CREATE POLICY "Users can create scores" ON public.game_scores
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND family_id = public.get_user_family_id());
