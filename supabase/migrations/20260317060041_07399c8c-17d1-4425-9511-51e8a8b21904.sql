
-- Add notify_on_activity column to push_subscriptions (default true)
ALTER TABLE public.push_subscriptions
ADD COLUMN notify_on_activity boolean NOT NULL DEFAULT true;

-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a generic trigger function that sends activity notifications
CREATE OR REPLACE FUNCTION public.notify_family_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _family_id uuid;
  _user_id uuid;
  _activity_type text;
  _detail text;
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Determine family_id and user_id based on table
  _activity_type := TG_TABLE_NAME;
  
  IF TG_TABLE_NAME = 'style_posts' THEN
    _family_id := NEW.family_id;
    _user_id := NEW.user_id;
    _detail := COALESCE(NEW.caption, 'a photo');
  ELSIF TG_TABLE_NAME = 'blessings' THEN
    _family_id := NEW.family_id;
    _user_id := NEW.user_id;
    _detail := LEFT(NEW.content, 60);
  ELSIF TG_TABLE_NAME = 'game_scores' THEN
    _family_id := NEW.family_id;
    _user_id := NEW.user_id;
    _detail := NEW.game || ': ' || NEW.score::text;
  ELSIF TG_TABLE_NAME = 'family_polls' THEN
    _family_id := NEW.family_id;
    _user_id := NEW.created_by;
    _detail := NEW.question;
  ELSIF TG_TABLE_NAME = 'predictions' THEN
    _family_id := NEW.family_id;
    _user_id := NEW.user_id;
    _detail := NEW.predicted_winner;
  ELSIF TG_TABLE_NAME = 'family_events' THEN
    _family_id := NEW.family_id;
    _user_id := NULL;
    _detail := NEW.title;
  ELSE
    RETURN NEW;
  END IF;

  IF _family_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from vault or env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fall back: use direct secrets if app.settings not available
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  END IF;
  IF _service_role_key IS NULL OR _service_role_key = '' THEN
    SELECT decrypted_secret INTO _service_role_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  END IF;

  -- Call the edge function via pg_net
  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/send-activity-notification',
    body := jsonb_build_object(
      'family_id', _family_id,
      'actor_user_id', _user_id,
      'activity_type', _activity_type,
      'detail', _detail
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )
  );

  RETURN NEW;
END;
$$;

-- Create triggers on all activity tables
CREATE TRIGGER trg_notify_style_post
AFTER INSERT ON public.style_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();

CREATE TRIGGER trg_notify_blessing
AFTER INSERT ON public.blessings
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();

CREATE TRIGGER trg_notify_game_score
AFTER INSERT ON public.game_scores
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();

CREATE TRIGGER trg_notify_poll
AFTER INSERT ON public.family_polls
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();

CREATE TRIGGER trg_notify_prediction
AFTER INSERT ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();

CREATE TRIGGER trg_notify_event
AFTER INSERT ON public.family_events
FOR EACH ROW EXECUTE FUNCTION public.notify_family_activity();
