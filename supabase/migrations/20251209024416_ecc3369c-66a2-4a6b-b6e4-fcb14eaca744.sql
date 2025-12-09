-- Create a table to track total games played
CREATE TABLE public.game_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  games_played BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read the stats
CREATE POLICY "Anyone can view game stats"
ON public.game_stats
FOR SELECT
USING (true);

-- Insert the initial row
INSERT INTO public.game_stats (id, games_played) VALUES ('global', 0);

-- Create a function to increment games played (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.increment_games_played()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE public.game_stats 
  SET games_played = games_played + 1, updated_at = now()
  WHERE id = 'global'
  RETURNING games_played INTO new_count;
  RETURN new_count;
END;
$$;

-- Add a max_score constraint and game_duration for anti-cheat validation
-- First, add columns to leaderboard for validation
ALTER TABLE public.leaderboard 
ADD COLUMN IF NOT EXISTS game_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS bugs_killed INTEGER;

-- Create a function to validate and submit scores (prevents direct inserts with fake scores)
CREATE OR REPLACE FUNCTION public.submit_score(
  p_name TEXT,
  p_score INTEGER,
  p_game_duration INTEGER,
  p_bugs_killed INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_reasonable_score INTEGER;
  max_points_per_second INTEGER := 50; -- Max ~50 points per second is generous
BEGIN
  -- Validate name length
  IF LENGTH(p_name) > 50 OR LENGTH(p_name) < 1 THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate maximum reasonable score based on game duration
  -- Even pro players can't kill more than ~50 bugs per second
  max_reasonable_score := p_game_duration * max_points_per_second;
  
  -- Reject obviously fake scores
  IF p_score > max_reasonable_score OR p_score < 0 OR p_score > 100000 THEN
    RETURN FALSE;
  END IF;
  
  -- Reject if game was too short (less than 5 seconds) with high score
  IF p_game_duration < 5 AND p_score > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Reject if bugs killed doesn't roughly match score
  -- Assuming avg 10-50 points per bug
  IF p_bugs_killed > 0 AND (p_score / p_bugs_killed > 100 OR p_score / p_bugs_killed < 5) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert the validated score
  INSERT INTO public.leaderboard (name, score, game_duration_seconds, bugs_killed)
  VALUES (p_name, p_score, p_game_duration, p_bugs_killed);
  
  RETURN TRUE;
END;
$$;