import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'https://esm.sh/@solana/web3.js@1.98.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOKEN_MINT = '5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump'
const REWARD_WALLET_ADDRESS = 'GzNt7XkAcyScDvqe5Dw1xwbJJWRG9KLMAmvHNHPRG2nM' // Replace with actual reward wallet public key
const MIN_SOL_BALANCE = 0.01 // Minimum SOL for transaction fees
const MIN_TOKEN_BALANCE = 100 // Minimum tokens to enable rewards

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    const rewardWalletPubkey = new PublicKey(REWARD_WALLET_ADDRESS)

    // Check SOL balance for gas fees
    const solBalance = await connection.getBalance(rewardWalletPubkey)
    const solBalanceInSol = solBalance / LAMPORTS_PER_SOL
    console.log('Reward wallet SOL balance:', solBalanceInSol)

    // Check token balance using getTokenAccountsByOwner
    let tokenBalance = 0
    try {
      const tokenMintPubkey = new PublicKey(TOKEN_MINT)
      const tokenAccounts = await connection.getTokenAccountsByOwner(rewardWalletPubkey, {
        mint: tokenMintPubkey
      })

      if (tokenAccounts.value.length > 0) {
        // Parse the account data to get balance
        const accountInfo = tokenAccounts.value[0].account
        const data = accountInfo.data
        // Token amount is at offset 64, 8 bytes (u64)
        const amountBytes = data.slice(64, 72)
        const amount = new DataView(amountBytes.buffer).getBigUint64(0, true)
        // $SNAIL has 6 decimals
        tokenBalance = Number(amount) / 1_000_000
      }
    } catch (tokenError) {
      console.error('Error fetching token balance:', tokenError)
    }

    console.log('Reward wallet token balance:', tokenBalance)

    const hasEnoughSol = solBalanceInSol >= MIN_SOL_BALANCE
    const hasEnoughTokens = tokenBalance >= MIN_TOKEN_BALANCE
    const rewardsEnabled = hasEnoughSol && hasEnoughTokens

    return new Response(
      JSON.stringify({
        rewards_enabled: rewardsEnabled,
        sol_balance: solBalanceInSol,
        token_balance: tokenBalance,
        reason: !hasEnoughSol 
          ? 'Insufficient SOL for transaction fees' 
          : !hasEnoughTokens 
            ? 'Insufficient $SNAIL tokens in reward wallet'
            : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking reward wallet:', error)
    return new Response(
      JSON.stringify({ 
        rewards_enabled: false, 
        error: 'Failed to check reward wallet',
        reason: 'Unable to verify reward wallet balance'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})