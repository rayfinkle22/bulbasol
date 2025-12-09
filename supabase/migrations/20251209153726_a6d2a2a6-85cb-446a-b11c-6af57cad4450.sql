-- Create separate leaderboard for the 3D shooter game
CREATE TABLE public.leaderboard_3d (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  bugs_killed INTEGER,
  game_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboard_3d ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view the leaderboard
CREATE POLICY "Anyone can view 3D leaderboard" 
ON public.leaderboard_3d 
FOR SELECT 
USING (true);

-- Create function to submit score for 3D game
CREATE OR REPLACE FUNCTION public.submit_score_3d(
  p_name TEXT,
  p_score INTEGER,
  p_bugs_killed INTEGER,
  p_game_duration INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_possible_score INTEGER;
  v_min_duration INTEGER := 5;
BEGIN
  -- Basic validation
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RETURN FALSE;
  END IF;
  
  IF p_score < 0 OR p_bugs_killed < 0 OR p_game_duration < v_min_duration THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate max possible score (similar to original but more lenient for 3D game)
  v_max_possible_score := (p_bugs_killed * 200) + (p_game_duration * 10);
  
  IF p_score > v_max_possible_score THEN
    RETURN FALSE;
  END IF;
  
  -- Insert the score
  INSERT INTO public.leaderboard_3d (name, score, bugs_killed, game_duration_seconds)
  VALUES (TRIM(p_name), p_score, p_bugs_killed, p_game_duration);
  
  RETURN TRUE;
END;
$$;