
CREATE TABLE public.devotional_songs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id),
  user_id uuid NOT NULL,
  youtube_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.devotional_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can see songs" ON public.devotional_songs
  FOR SELECT TO authenticated
  USING (user_is_family_member(family_id));

CREATE POLICY "Users can share songs" ON public.devotional_songs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND user_is_family_member(family_id));
