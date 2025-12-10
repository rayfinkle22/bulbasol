-- Fix pre-existing RLS issue on game_increment_log
CREATE POLICY "Allow insert for rate limiting" ON public.game_increment_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for rate limiting" ON public.game_increment_log
  FOR SELECT USING (true);

CREATE POLICY "Allow delete for cleanup" ON public.game_increment_log
  FOR DELETE USING (true);