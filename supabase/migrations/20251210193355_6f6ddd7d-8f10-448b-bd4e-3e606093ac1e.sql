-- Add IP tracking to token_rewards table
ALTER TABLE public.token_rewards 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_token_rewards_ip_address ON public.token_rewards(ip_address);

-- Create a function to check claim eligibility (2 per IP per day, 24hr wallet cooldown)
CREATE OR REPLACE FUNCTION public.check_claim_eligibility(
  p_wallet_address TEXT,
  p_ip_address TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_last_claim TIMESTAMP WITH TIME ZONE;
  ip_claims_today INTEGER;
  cooldown_hours INTEGER;
  hours_remaining NUMERIC;
BEGIN
  -- Get cooldown from config
  SELECT claim_cooldown_hours INTO cooldown_hours FROM public.reward_config LIMIT 1;
  IF cooldown_hours IS NULL THEN
    cooldown_hours := 24;
  END IF;

  -- Check wallet cooldown (24 hours)
  SELECT MAX(claimed_at) INTO wallet_last_claim
  FROM public.token_rewards
  WHERE wallet_address = p_wallet_address
    AND status = 'completed';

  IF wallet_last_claim IS NOT NULL AND 
     wallet_last_claim > NOW() - INTERVAL '1 hour' * cooldown_hours THEN
    hours_remaining := EXTRACT(EPOCH FROM (wallet_last_claim + INTERVAL '1 hour' * cooldown_hours - NOW())) / 3600;
    RETURN json_build_object(
      'eligible', false,
      'reason', 'wallet_cooldown',
      'hours_remaining', ROUND(hours_remaining::numeric, 1),
      'message', 'Wallet cooldown active. Try again in ' || ROUND(hours_remaining::numeric, 1) || ' hours.'
    );
  END IF;

  -- Check IP limit (2 claims per day)
  SELECT COUNT(*) INTO ip_claims_today
  FROM public.token_rewards
  WHERE ip_address = p_ip_address
    AND claimed_at > NOW() - INTERVAL '24 hours'
    AND status = 'completed';

  IF ip_claims_today >= 2 THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'ip_limit',
      'claims_used', ip_claims_today,
      'message', 'Daily limit reached (2 claims per day). Try again tomorrow.'
    );
  END IF;

  RETURN json_build_object(
    'eligible', true,
    'wallet_claims_available', 1,
    'ip_claims_remaining', 2 - ip_claims_today
  );
END;
$$;

-- Update reward_config to have 24hr cooldown
UPDATE public.reward_config SET claim_cooldown_hours = 24 WHERE id IS NOT NULL;