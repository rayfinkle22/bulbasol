import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, Keypair, PublicKey, Transaction } from 'https://esm.sh/@solana/web3.js@1.98.0'
import { 
  createTransferInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  getAccount,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from 'https://esm.sh/@solana/spl-token@0.4.9'
import base58 from 'https://esm.sh/bs58@5.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
}

interface ClaimRequest {
  wallet_address: string
  score: number
  game_session_id?: string
  captcha_token?: string
}

// Token configuration - This is a Token-2022 (pump.fun) token
const TOKEN_MINT = '5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump'
const TOKEN_DECIMALS = 6
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

// Transfer SPL Token-2022 tokens to recipient
async function transferTokens(
  recipientAddress: string,
  amount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const privateKeyStr = Deno.env.get('REWARD_WALLET_PRIVATE_KEY')
  if (!privateKeyStr) {
    console.error('REWARD_WALLET_PRIVATE_KEY not configured')
    return { success: false, error: 'Reward wallet not configured' }
  }

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed')
    
    // Decode private key (supports both base58 and array format)
    let secretKey: Uint8Array
    try {
      // Try base58 first
      secretKey = base58.decode(privateKeyStr)
    } catch {
      // Try JSON array format
      try {
        const keyArray = JSON.parse(privateKeyStr)
        secretKey = new Uint8Array(keyArray)
      } catch {
        return { success: false, error: 'Invalid private key format' }
      }
    }
    
    const senderKeypair = Keypair.fromSecretKey(secretKey)
    const senderPublicKey = senderKeypair.publicKey
    const recipientPublicKey = new PublicKey(recipientAddress)
    const mintPublicKey = new PublicKey(TOKEN_MINT)
    
    console.log('Sender wallet:', senderPublicKey.toBase58())
    console.log('Recipient wallet:', recipientAddress)
    console.log('Amount to transfer:', amount, 'tokens')
    console.log('Using Token-2022 program:', TOKEN_2022_PROGRAM_ID.toBase58())
    
    // Get associated token accounts for Token-2022
    const senderATA = await getAssociatedTokenAddress(
      mintPublicKey, 
      senderPublicKey,
      false, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID, // Token-2022 program
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    const recipientATA = await getAssociatedTokenAddress(
      mintPublicKey, 
      recipientPublicKey,
      false, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID, // Token-2022 program
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    
    console.log('Sender ATA:', senderATA.toBase58())
    console.log('Recipient ATA:', recipientATA.toBase58())
    
    // Check if recipient has an ATA, create if not
    const transaction = new Transaction()
    
    try {
      await getAccount(connection, recipientATA, 'confirmed', TOKEN_2022_PROGRAM_ID)
      console.log('Recipient ATA exists')
    } catch {
      console.log('Creating recipient ATA for Token-2022...')
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderPublicKey,    // payer
          recipientATA,       // ata
          recipientPublicKey, // owner
          mintPublicKey,      // mint
          TOKEN_2022_PROGRAM_ID, // Token-2022 program
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      )
    }
    
    // Convert amount to token units (with decimals)
    const tokenAmount = Math.floor(amount * Math.pow(10, TOKEN_DECIMALS))
    
    console.log('Token amount (raw):', tokenAmount)
    
    // Add transfer instruction for Token-2022
    transaction.add(
      createTransferInstruction(
        senderATA,           // source
        recipientATA,        // destination
        senderPublicKey,     // owner
        tokenAmount,         // amount in smallest units
        [],                  // multiSigners (empty for single signer)
        TOKEN_2022_PROGRAM_ID // Token-2022 program
      )
    )
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = senderPublicKey
    
    // Sign and send transaction
    transaction.sign(senderKeypair)
    
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })
    
    console.log('Transaction sent:', signature)
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed')
    
    if (confirmation.value.err) {
      console.error('Transaction failed:', confirmation.value.err)
      return { success: false, error: 'Transaction failed on-chain' }
    }
    
    console.log('Transaction confirmed!')
    return { success: true, signature }
    
  } catch (error) {
    console.error('Token transfer error:', error)
    return { success: false, error: (error as Error).message || 'Token transfer failed' }
  }
}

// Verify hCaptcha token - TEMPORARILY DISABLED
async function verifyCaptcha(token: string): Promise<boolean> {
  if (token === 'disabled') {
    console.log('Captcha verification disabled')
    return true
  }
  
  const secret = Deno.env.get('HCAPTCHA_SECRET_KEY')
  if (!secret) {
    console.log('HCAPTCHA_SECRET_KEY not configured, skipping verification')
    return true
  }

  try {
    const response = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`
    })
    
    const data = await response.json()
    console.log('hCaptcha verification result:', data.success)
    return data.success === true
  } catch (error) {
    console.error('hCaptcha verification error:', error)
    return true
  }
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }
  
  return 'unknown'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { wallet_address, score, game_session_id, captcha_token }: ClaimRequest = await req.json()
    const clientIP = getClientIP(req)

    console.log('Claim attempt from IP:', clientIP)

    // Verify captcha
    if (!captcha_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Captcha verification required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const captchaValid = await verifyCaptcha(captcha_token)
    if (!captchaValid) {
      console.log('Captcha verification failed')
      return new Response(
        JSON.stringify({ success: false, error: 'Captcha verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate inputs
    if (!wallet_address || typeof wallet_address !== 'string' || wallet_address.length < 32) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof score !== 'number' || score < 0 || score > 100000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid score' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check claim eligibility
    const { data: eligibility, error: eligibilityError } = await supabase.rpc('check_claim_eligibility', {
      p_wallet_address: wallet_address,
      p_ip_address: clientIP
    })

    if (eligibilityError) {
      console.error('Eligibility check error:', eligibilityError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check eligibility' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!eligibility.eligible) {
      console.log('Claim rejected:', eligibility)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: eligibility.message,
          reason: eligibility.reason,
          hours_remaining: eligibility.hours_remaining
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify game session if provided
    if (game_session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('leaderboard_3d')
        .select('id, score, bugs_killed, game_duration_seconds')
        .eq('id', game_session_id)
        .maybeSingle()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid game session' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (session.score !== score) {
        return new Response(
          JSON.stringify({ success: false, error: 'Score verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existingClaim } = await supabase
        .from('token_rewards')
        .select('id')
        .eq('game_session_id', game_session_id)
        .maybeSingle()

      if (existingClaim) {
        return new Response(
          JSON.stringify({ success: false, error: 'Game session already claimed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch market data
    const TOKEN_ADDRESS = '5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump'
    let marketCap = 50000
    let priceUsd = 0.00001

    try {
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`)
      const dexData = await dexResponse.json()
      
      if (dexData.pairs && dexData.pairs.length > 0) {
        const pair = dexData.pairs.find((p: any) => p.dexId === 'pumpswap') || dexData.pairs[0]
        marketCap = pair.marketCap || pair.fdv || 50000
        priceUsd = parseFloat(pair.priceUsd) || 0.00001
      }
    } catch (dexError) {
      console.error('Failed to fetch market data:', dexError)
    }

    console.log('Recording claim:', { wallet_address, score, marketCap, priceUsd })

    // Record claim in database first
    const { data, error } = await supabase.rpc('claim_reward', {
      p_wallet_address: wallet_address,
      p_score: score,
      p_market_cap: marketCap,
      p_price_usd: priceUsd,
      p_game_session_id: game_session_id || null
    })

    if (error) {
      console.error('Claim reward error:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data.success) {
      // Return 200 for cooldown errors so client can properly parse the response
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokensEarned = data.tokens_earned
    const rewardId = data.reward_id

    console.log('Claim recorded, tokens to transfer:', tokensEarned)

    // Now transfer the actual tokens
    const transferResult = await transferTokens(wallet_address, tokensEarned)

    if (transferResult.success && transferResult.signature) {
      // Update record with transaction signature and completed status
      await supabase
        .from('token_rewards')
        .update({ 
          ip_address: clientIP,
          tx_signature: transferResult.signature,
          status: 'completed'
        })
        .eq('id', rewardId)

      console.log('Tokens transferred successfully:', transferResult.signature)

      return new Response(
        JSON.stringify({
          success: true,
          reward_id: rewardId,
          tokens_earned: tokensEarned,
          tx_signature: transferResult.signature,
          market_cap: marketCap
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Transfer failed - update status to failed
      await supabase
        .from('token_rewards')
        .update({ 
          ip_address: clientIP,
          status: 'failed'
        })
        .eq('id', rewardId)

      console.error('Token transfer failed:', transferResult.error)

      return new Response(
        JSON.stringify({
          success: false,
          error: `Token transfer failed: ${transferResult.error}`,
          reward_id: rewardId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
