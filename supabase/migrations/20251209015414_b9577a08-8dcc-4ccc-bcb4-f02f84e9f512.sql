-- Create leaderboard table for global high scores
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leaderboard entries
CREATE POLICY "Anyone can view leaderboard"
ON public.leaderboard
FOR SELECT
USING (true);

-- Allow anyone to insert leaderboard entries (no auth required for public game)
CREATE POLICY "Anyone can submit scores"
ON public.leaderboard
FOR INSERT
WITH CHECK (true);

-- Create index for faster sorting by score
CREATE INDEX idx_leaderboard_score ON public.leaderboard(score DESC);