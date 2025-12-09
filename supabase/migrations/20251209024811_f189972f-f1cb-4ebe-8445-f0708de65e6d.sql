-- Update the submit_score function to include profanity filtering
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
  max_points_per_second INTEGER := 50;
  clean_name TEXT;
  bad_words TEXT[] := ARRAY[
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'cunt', 'dick', 'cock', 'pussy', 
    'bastard', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard', 'kike',
    'chink', 'spic', 'wetback', 'cracker', 'honky', 'twat', 'wanker', 'prick',
    'douche', 'jackass', 'motherfuck', 'bullshit', 'asshole', 'arsehole',
    'bollocks', 'bugger', 'bloody', 'crap', 'piss', 'tits', 'boob', 'penis',
    'vagina', 'anus', 'dildo', 'porn', 'sex', 'nude', 'naked', 'xxx',
    'f u c k', 'sh1t', 'a55', 'b1tch', 'd1ck', 'c0ck', 'pu55y', 'p0rn',
    'fuk', 'fck', 'sht', 'btch', 'dck', 'psy', 'azz', 'phuck', 'phuk'
  ];
  word TEXT;
BEGIN
  -- Validate name length
  IF LENGTH(p_name) > 50 OR LENGTH(p_name) < 1 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for profanity (case-insensitive)
  clean_name := LOWER(p_name);
  FOREACH word IN ARRAY bad_words LOOP
    IF clean_name LIKE '%' || word || '%' THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  -- Calculate maximum reasonable score based on game duration
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
  IF p_bugs_killed > 0 AND (p_score / p_bugs_killed > 100 OR p_score / p_bugs_killed < 5) THEN
    RETURN FALSE;
  END IF;
  
  -- Insert the validated score
  INSERT INTO public.leaderboard (name, score, game_duration_seconds, bugs_killed)
  VALUES (p_name, p_score, p_game_duration, p_bugs_killed);
  
  RETURN TRUE;
END;
$$;