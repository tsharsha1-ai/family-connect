
-- Create IPL matches table
CREATE TABLE public.ipl_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a text NOT NULL,
  team_b text NOT NULL,
  match_date date NOT NULL,
  match_time time NOT NULL DEFAULT '19:30',
  venue text NOT NULL DEFAULT '',
  winner text, -- NULL = not played yet, team name = result
  status text NOT NULL DEFAULT 'upcoming', -- upcoming | completed
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ipl_matches ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read matches
CREATE POLICY "Anyone can read matches" ON public.ipl_matches
  FOR SELECT TO authenticated USING (true);

-- Only admins (family_members.is_admin) can update match results
CREATE POLICY "Admins can update matches" ON public.ipl_matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Admins can insert matches
CREATE POLICY "Admins can insert matches" ON public.ipl_matches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Rework predictions: add family_id if not exists, add match FK
-- Current predictions table has: id, user_id, match_id (text), predicted_winner, points_earned, created_at
-- We'll keep it but add family_id and a unique constraint
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id);

-- Drop old policies and create new ones
DROP POLICY IF EXISTS "Users can create own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users see family predictions" ON public.predictions;

CREATE POLICY "Users can create predictions" ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND user_is_family_member(family_id));

CREATE POLICY "Family can see predictions" ON public.predictions
  FOR SELECT TO authenticated
  USING (user_is_family_member(family_id));

-- Allow updating points_earned (for admin scoring)
CREATE POLICY "Admins can update prediction points" ON public.predictions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid() AND is_admin = true AND family_id = predictions.family_id)
  );
