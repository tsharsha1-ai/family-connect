
-- Create family_polls table
CREATE TABLE public.family_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  duration_hours integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.family_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  selected_option integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.family_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS for family_polls
CREATE POLICY "Family members can view polls"
  ON public.family_polls FOR SELECT TO authenticated
  USING (user_is_family_member(family_id));

CREATE POLICY "Family members can create polls"
  ON public.family_polls FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND user_is_family_member(family_id));

CREATE POLICY "Creator or admin can update polls"
  ON public.family_polls FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.user_id = auth.uid()
        AND family_members.family_id = family_polls.family_id
        AND family_members.is_admin = true
    )
  );

-- RLS for poll_votes
CREATE POLICY "Family members can view votes"
  ON public.poll_votes FOR SELECT TO authenticated
  USING (
    poll_id IN (
      SELECT fp.id FROM public.family_polls fp
      WHERE user_is_family_member(fp.family_id)
    )
  );

CREATE POLICY "Users can cast their vote"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    poll_id IN (
      SELECT fp.id FROM public.family_polls fp
      WHERE user_is_family_member(fp.family_id)
        AND fp.is_active = true
        AND fp.expires_at > now()
    )
  );

-- Validation trigger to reject votes on expired polls
CREATE OR REPLACE FUNCTION public.validate_poll_vote()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.family_polls
    WHERE id = NEW.poll_id
      AND is_active = true
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Poll is no longer active or has expired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_poll_vote_validity
  BEFORE INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_poll_vote();
