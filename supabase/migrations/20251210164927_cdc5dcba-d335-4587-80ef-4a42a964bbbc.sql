-- Create reward config table
CREATE TABLE public.reward_config (
  id text PRIMARY KEY DEFAULT 'global',
  base_reward_amount numeric NOT NULL DEFAULT 1000,
  base_market_cap numeric NOT NULL DEFAULT 50000,
  min_reward_amount numeric NOT NULL DEFAULT 10,
  max_reward_amount numeric NOT NULL DEFAULT 10000,
  claim_cooldown_hours integer NOT NULL DEFAULT 1,
  points_per_token numeric NOT NULL DEFAULT 100,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default config
INSERT INTO public.reward_config (id) VALUES ('global');

-- Create token rewards tracking table
CREATE TABLE public.token_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  score integer NOT NULL,
  market_cap_at_claim numeric NOT NULL,
  tokens_earned numeric NOT NULL,
  game_session_id uuid REFERENCES public.leaderboard_3d(id),
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  tx_signature text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create index for wallet lookups and rate limiting
CREATE INDEX idx_token_rewards_wallet ON public.token_rewards(wallet_address, claimed_at DESC);
CREATE INDEX idx_token_rewards_status ON public.token_rewards(status);

-- Enable RLS
ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view reward config" ON public.reward_config
  FOR SELECT USING (true);

-- Users can view their own rewards
CREATE POLICY "Users can view their own rewards" ON public.token_rewards
  FOR SELECT USING (true);

-- Function to calculate reward based on market cap (inverse relationship)
CREATE OR REPLACE FUNCTION public.calculate_token_reward(
  p_score integer,
  p_market_cap numeric
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
BEGIN
  SELECT * INTO v_config FROM reward_config WHERE id = 'global';
  
  -- Calculate MC multiplier (inverse relationship)
  -- At base_market_cap, multiplier = 1
  -- As MC increases, multiplier decreases
  v_mc_multiplier := v_config.base_market_cap / GREATEST(p_market_cap, v_config.base_market_cap);
  
  -- Calculate reward: (score / points_per_token) * base_reward * mc_multiplier
  v_reward := (p_score::numeric / v_config.points_per_token) * v_config.base_reward_amount * v_mc_multiplier;
  
  -- Clamp to min/max
  v_reward := GREATEST(v_config.min_reward_amount, LEAST(v_reward, v_config.max_reward_amount));
  
  RETURN ROUND(v_reward, 2);
END;
$$;

-- Function to claim rewards with rate limiting
CREATE OR REPLACE FUNCTION public.claim_reward(
  p_wallet_address text,
  p_score integer,
  p_market_cap numeric,
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
BEGIN
  -- Get config
  SELECT * INTO v_config FROM reward_config WHERE id = 'global';
  
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
  
  -- Calculate tokens
  v_tokens_earned := calculate_token_reward(p_score, p_market_cap);
  
  -- Insert reward record
  INSERT INTO token_rewards (wallet_address, score, market_cap_at_claim, tokens_earned, game_session_id)
  VALUES (p_wallet_address, p_score, p_market_cap, v_tokens_earned, p_game_session_id)
  RETURNING id INTO v_reward_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reward_id', v_reward_id,
    'tokens_earned', v_tokens_earned,
    'market_cap', p_market_cap
  );
END;
$$;