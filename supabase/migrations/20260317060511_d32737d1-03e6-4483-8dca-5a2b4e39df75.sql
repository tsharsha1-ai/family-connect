
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
  _activity_type := TG_TABLE_NAME;
  
  IF TG_TABLE_NAME = 'style_posts' THEN
    _family_id := NEW.family_id; _user_id := NEW.user_id;
    _detail := COALESCE(NEW.caption, 'a photo');
  ELSIF TG_TABLE_NAME = 'blessings' THEN
    _family_id := NEW.family_id; _user_id := NEW.user_id;
    _detail := LEFT(NEW.content, 60);
  ELSIF TG_TABLE_NAME = 'game_scores' THEN
    _family_id := NEW.family_id; _user_id := NEW.user_id;
    _detail := NEW.game || ': ' || NEW.score::text;
  ELSIF TG_TABLE_NAME = 'family_polls' THEN
    _family_id := NEW.family_id; _user_id := NEW.created_by;
    _detail := NEW.question;
  ELSIF TG_TABLE_NAME = 'predictions' THEN
    _family_id := NEW.family_id; _user_id := NEW.user_id;
    _detail := NEW.predicted_winner;
  ELSIF TG_TABLE_NAME = 'family_events' THEN
    _family_id := NEW.family_id; _user_id := NULL;
    _detail := NEW.title;
  ELSE
    RETURN NEW;
  END IF;

  IF _family_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO _supabase_url
  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Use net.http_post (pg_net) instead of extensions.http_post
  PERFORM net.http_post(
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
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if notification fails
  RAISE LOG 'notify_family_activity error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
