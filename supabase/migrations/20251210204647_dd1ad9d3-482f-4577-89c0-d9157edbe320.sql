CREATE OR REPLACE FUNCTION public.claim_reward(p_wallet_address text, p_score integer, p_market_cap numeric, p_price_usd numeric DEFAULT 0.00001, p_game_session_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config reward_config%ROWTYPE;
  v_last_claim timestamp with time zone;
  v_tokens_earned numeric;
  v_reward_id uuid;
  v_usd_value numeric;
BEGIN
  -- Get config
  SELECT * INTO v_config FROM reward_config WHERE id = 'global';
  
  -- Anti-cheat: Reject impossibly high scores
  IF p_score > 50000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'score_invalid'
    );
  END IF;
  
  -- Check cooldown - ONLY count completed claims
  SELECT claimed_at INTO v_last_claim
  FROM token_rewards
  WHERE wallet_address = p_wallet_address
    AND status = 'completed'
  ORDER BY claimed_at DESC
  LIMIT 1;
  
  IF v_last_claim IS NOT NULL AND 
     v_last_claim > now() - (v_config.claim_cooldown_hours || ' hours')::interval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cooldown_active',
      'next_claim_at', v_last_claim + (v_config.claim_cooldown_hours || ' hours')::interval
    );
  END IF;
  
  -- Calculate tokens with price for USD cap
  v_tokens_earned := calculate_token_reward(p_score, p_market_cap, p_price_usd);
  v_usd_value := v_tokens_earned * p_price_usd;
  
  -- Insert reward record
  INSERT INTO token_rewards (wallet_address, score, market_cap_at_claim, tokens_earned, game_session_id)
  VALUES (p_wallet_address, p_score, p_market_cap, v_tokens_earned, p_game_session_id)
  RETURNING id INTO v_reward_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_id', v_reward_id,
    'tokens_earned', v_tokens_earned,
    'usd_value', ROUND(v_usd_value, 4),
    'market_cap', p_market_cap
  );
END;
$function$