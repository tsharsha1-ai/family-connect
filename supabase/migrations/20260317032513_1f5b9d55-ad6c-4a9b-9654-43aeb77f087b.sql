
-- Add optional tagged member to blessings
ALTER TABLE public.blessings ADD COLUMN tagged_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL;

-- Create blessing_likes table
CREATE TABLE public.blessing_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blessing_id uuid NOT NULL REFERENCES public.blessings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blessing_id, user_id)
);

ALTER TABLE public.blessing_likes ENABLE ROW LEVEL SECURITY;

-- RLS: users can see likes on blessings in their family
CREATE POLICY "Family can see blessing likes"
  ON public.blessing_likes FOR SELECT TO authenticated
  USING (blessing_id IN (
    SELECT b.id FROM public.blessings b WHERE user_is_family_member(b.family_id)
  ));

-- RLS: users can like
CREATE POLICY "Users can like blessings"
  ON public.blessing_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: users can unlike their own
CREATE POLICY "Users can unlike blessings"
  ON public.blessing_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
