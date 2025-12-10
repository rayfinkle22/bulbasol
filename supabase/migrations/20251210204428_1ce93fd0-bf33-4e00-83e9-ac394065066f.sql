CREATE OR REPLACE FUNCTION public.check_claim_eligibility(p_wallet_address text, p_ip_address text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  wallet_last_claim TIMESTAMP WITH TIME ZONE;
  cooldown_hours INTEGER;
  hours_remaining NUMERIC;
BEGIN
  -- Get cooldown from config
  SELECT claim_cooldown_hours INTO cooldown_hours FROM public.reward_config LIMIT 1;
  IF cooldown_hours IS NULL THEN
    cooldown_hours := 24;
  END IF;

  -- Check wallet cooldown only (IP limit disabled for testing)
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

  -- IP limit check DISABLED for testing
  -- Can re-enable later by uncommenting

  RETURN json_build_object(
    'eligible', true,
    'wallet_claims_available', 1,
    'ip_claims_remaining', 999
  );
END;
$function$