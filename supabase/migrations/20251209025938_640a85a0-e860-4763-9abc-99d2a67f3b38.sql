-- Create rate limiting table for games counter
CREATE TABLE public.game_increment_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_hash text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_increment_log ENABLE ROW LEVEL SECURITY;

-- No public access to this table - only accessible via SECURITY DEFINER function
-- (No RLS policies needed since we don't want direct access)

-- Create index for faster lookups
CREATE INDEX idx_game_increment_log_session_created ON public.game_increment_log(session_hash, created_at);

-- Auto-cleanup old records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_increment_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.game_increment_log WHERE created_at < now() - interval '1 hour';
END;
$$;

-- Replace the increment function with rate-limited version
CREATE OR REPLACE FUNCTION public.increment_games_played(p_session_hash text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count BIGINT;
  recent_increment_count INTEGER;
BEGIN
  -- Cleanup old logs first
  PERFORM public.cleanup_old_increment_logs();
  
  -- If session hash provided, check for rate limiting
  IF p_session_hash IS NOT NULL AND LENGTH(p_session_hash) > 10 THEN
    -- Check how many times this session has incremented in the last hour
    SELECT COUNT(*) INTO recent_increment_count
    FROM public.game_increment_log
    WHERE session_hash = p_session_hash
    AND created_at > now() - interval '1 hour';
    
    -- Allow max 10 game completions per hour per session
    IF recent_increment_count >= 10 THEN
      -- Return current count without incrementing
      SELECT games_played INTO new_count FROM public.game_stats WHERE id = 'global';
      RETURN new_count;
    END IF;
    
    -- Log this increment
    INSERT INTO public.game_increment_log (session_hash) VALUES (p_session_hash);
  END IF;
  
  -- Perform the increment
  UPDATE public.game_stats 
  SET games_played = games_played + 1, updated_at = now()
  WHERE id = 'global'
  RETURNING games_played INTO new_count;
  
  RETURN new_count;
END;
$$;