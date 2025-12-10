-- Add USD cap to reward config
ALTER TABLE public.reward_config 
ADD COLUMN max_reward_usd numeric NOT NULL DEFAULT 5,
ADD COLUMN max_score_cap integer NOT NULL DEFAULT 6000;

-- Update the calculate function with score cap and better anti-cheat
CREATE OR REPLACE FUNCTION public.calculate_token_reward(
  p_score integer,
  p_market_cap numeric,
  p_price_usd numeric DEFAULT 0.00001
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config reward_config%ROWTYPE;
  v_reward numeric;
  v_mc_multiplier numeric;
  v_capped_score integer;
  v_max_tokens_from_usd numeric;
BEGIN
  SELECT * INTO v_config FROM reward_config WHERE id = 'global';
  
  -- Cap score at max_score_cap (6000)
  v_capped_score := LEAST(p_score, v_config.max_score_cap);
  
  -- Calculate MC multiplier (inverse relationship)
  v_mc_multiplier := v_config.base_market_cap / GREATEST(p_market_cap, v_config.base_market_cap);
  
  -- Calculate reward: (score / points_per_token) * base_reward * mc_multiplier
  v_reward := (v_capped_score::numeric / v_config.points_per_token) * v_config.base_reward_amount * v_mc_multiplier;
  
  -- Calculate max tokens allowed based on USD cap ($5) and current price
  IF p_price_usd > 0 THEN
    v_max_tokens_from_usd := v_config.max_reward_usd / p_price_usd;
    v_reward := LEAST(v_reward, v_max_tokens_from_usd);
  END IF;
  
  -- Clamp to min/max token limits
  v_reward := GREATEST(v_config.min_reward_amount, LEAST(v_reward, v_config.max_reward_amount));
  
  RETURN ROUND(v_reward, 2);
END;
$$;

-- Update claim function to include price
CREATE OR REPLACE FUNCTION public.claim_reward(
  p_wallet_address text,
  p_score integer,
  p_market_cap numeric,
  p_price_usd numeric DEFAULT 0.00001,
  p_game_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Check cooldown
  SELECT claimed_at INTO v_last_claim
  FROM token_rewards
  WHERE wallet_address = p_wallet_address
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
$$;