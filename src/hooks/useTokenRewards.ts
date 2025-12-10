import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMarketData } from './useMarketData';

interface RewardConfig {
  base_reward_amount: number;
  base_market_cap: number;
  min_reward_amount: number;
  max_reward_amount: number;
  claim_cooldown_hours: number;
  points_per_token: number;
  max_reward_usd: number;
  max_score_cap: number;
}

interface TokenReward {
  id: string;
  wallet_address: string;
  score: number;
  market_cap_at_claim: number;
  tokens_earned: number;
  claimed_at: string;
  status: string;
}

interface ClaimResult {
  success: boolean;
  error?: string;
  reward_id?: string;
  tokens_earned?: number;
  next_claim_at?: string;
}

interface RewardWalletStatus {
  rewards_enabled: boolean;
  sol_balance?: number;
  token_balance?: number;
  reason?: string | null;
}

export const useTokenRewards = (walletAddress: string | null) => {
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [rewards, setRewards] = useState<TokenReward[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [rewardWalletStatus, setRewardWalletStatus] = useState<RewardWalletStatus | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const { marketCap, priceUsd } = useMarketData();

  // Check reward wallet balance
  const checkRewardWallet = useCallback(async () => {
    setIsCheckingWallet(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-reward-wallet');
      
      if (error) {
        console.error('Error checking reward wallet:', error);
        setRewardsEnabled(false);
        setRewardWalletStatus({ rewards_enabled: false, reason: 'Failed to check wallet' });
        return;
      }

      setRewardsEnabled(data.rewards_enabled);
      setRewardWalletStatus(data);
      console.log('Reward wallet status:', data);
    } catch (err) {
      console.error('Failed to check reward wallet:', err);
      setRewardsEnabled(false);
    } finally {
      setIsCheckingWallet(false);
    }
  }, []);

  // Check reward wallet when user connects
  useEffect(() => {
    if (walletAddress) {
      checkRewardWallet();
    }
  }, [walletAddress, checkRewardWallet]);

  // Calculate estimated reward for a given score (with $5 USD cap and 6000 score cap)
  const calculateEstimatedReward = useCallback((score: number): { tokens: number; usdValue: number } => {
    if (!config || !marketCap) return { tokens: 0, usdValue: 0 };
    
    // Cap score at 6000
    const cappedScore = Math.min(score, config.max_score_cap);
    
    const mcMultiplier = config.base_market_cap / Math.max(marketCap, config.base_market_cap);
    let reward = (cappedScore / config.points_per_token) * config.base_reward_amount * mcMultiplier;
    
    // Apply USD cap ($5 max)
    const currentPrice = priceUsd ? parseFloat(priceUsd) : 0.00001;
    const maxTokensFromUsd = config.max_reward_usd / currentPrice;
    reward = Math.min(reward, maxTokensFromUsd);
    
    // Clamp to min/max
    reward = Math.max(config.min_reward_amount, Math.min(reward, config.max_reward_amount));
    
    return { 
      tokens: Math.round(reward * 100) / 100,
      usdValue: Math.round(reward * currentPrice * 10000) / 10000
    };
  }, [config, marketCap, priceUsd]);

  // Fetch reward config
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('reward_config')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      
      if (!error && data) {
        setConfig(data as RewardConfig);
      }
    };

    fetchConfig();
  }, []);

  // Fetch user's rewards history
  useEffect(() => {
    if (!walletAddress) {
      setRewards([]);
      setTotalEarned(0);
      setIsLoading(false);
      return;
    }

    const fetchRewards = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('token_rewards')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('claimed_at', { ascending: false });

      if (!error && data) {
        setRewards(data as TokenReward[]);
        setTotalEarned(data.reduce((sum, r) => sum + Number(r.tokens_earned), 0));
      }
      setIsLoading(false);
    };

    fetchRewards();
  }, [walletAddress]);

  // Claim reward
  const claimReward = async (score: number, gameSessionId?: string): Promise<ClaimResult> => {
    if (!walletAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!rewardsEnabled) {
      return { success: false, error: 'Rewards are currently disabled' };
    }

    setIsClaiming(true);

    try {
      const { data, error } = await supabase.functions.invoke('claim-reward', {
        body: {
          wallet_address: walletAddress,
          score,
          game_session_id: gameSessionId
        }
      });

      if (error) {
        console.error('Claim error:', error);
        return { success: false, error: error.message };
      }

      if (data.success) {
        // Refresh rewards list
        const { data: newRewards } = await supabase
          .from('token_rewards')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('claimed_at', { ascending: false });

        if (newRewards) {
          setRewards(newRewards as TokenReward[]);
          setTotalEarned(newRewards.reduce((sum, r) => sum + Number(r.tokens_earned), 0));
        }

        // Recheck wallet balance after claim
        checkRewardWallet();
      }

      return data as ClaimResult;
    } catch (err) {
      console.error('Claim error:', err);
      return { success: false, error: 'Failed to claim reward' };
    } finally {
      setIsClaiming(false);
    }
  };

  // Check if user can claim (cooldown)
  const canClaim = useCallback((): { canClaim: boolean; nextClaimAt?: Date } => {
    if (!config || rewards.length === 0) {
      return { canClaim: true };
    }

    const lastClaim = new Date(rewards[0].claimed_at);
    const cooldownMs = config.claim_cooldown_hours * 60 * 60 * 1000;
    const nextClaimAt = new Date(lastClaim.getTime() + cooldownMs);

    if (nextClaimAt > new Date()) {
      return { canClaim: false, nextClaimAt };
    }

    return { canClaim: true };
  }, [config, rewards]);

  return {
    config,
    rewards,
    totalEarned,
    isLoading,
    isClaiming,
    rewardsEnabled,
    rewardWalletStatus,
    isCheckingWallet,
    calculateEstimatedReward,
    claimReward,
    canClaim,
    checkRewardWallet
  };
};
