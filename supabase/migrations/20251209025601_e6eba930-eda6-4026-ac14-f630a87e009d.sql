-- Remove the open INSERT policy on leaderboard table
-- This ensures all score submissions must go through the submit_score RPC function
-- which includes anti-cheat validation and profanity filtering
DROP POLICY IF EXISTS "Anyone can submit scores" ON public.leaderboard;