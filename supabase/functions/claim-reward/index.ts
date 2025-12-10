import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// Verify hCaptcha token
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get('HCAPTCHA_SECRET_KEY')
  if (!secret) {
    console.error('HCAPTCHA_SECRET_KEY not configured')
    return false
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
    return false
  }
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
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
  
  // Fallback - this won't be the real client IP but better than nothing
  return 'unknown'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Verify captcha first
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

    console.log('Captcha verified successfully')

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

    // Check claim eligibility (IP limits + wallet cooldown)
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

    // Verify game session exists if provided
    if (game_session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('leaderboard_3d')
        .select('id, score, bugs_killed, game_duration_seconds')
        .eq('id', game_session_id)
        .maybeSingle()

      if (sessionError || !session) {
        console.error('Game session verification failed:', sessionError)
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid game session' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify score matches
      if (session.score !== score) {
        console.error('Score mismatch:', { claimed: score, actual: session.score })
        return new Response(
          JSON.stringify({ success: false, error: 'Score verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Anti-cheat: Verify score is plausible based on game metrics
      const maxPointsPerBug = 100 // Max points per bug in game
      const maxPointsPerSecond = 50 // Max reasonable points per second
      const maxPossibleScore = Math.max(
        (session.bugs_killed || 0) * maxPointsPerBug * 2, // Allow some variance
        (session.game_duration_seconds || 0) * maxPointsPerSecond
      )

      if (score > maxPossibleScore && maxPossibleScore > 0) {
        console.error('Suspicious score detected:', { score, maxPossible: maxPossibleScore, session })
        return new Response(
          JSON.stringify({ success: false, error: 'Score validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if this session was already claimed
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

    // Fetch current market cap and price from DexScreener
    const TOKEN_ADDRESS = '5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump'
    let marketCap = 50000 // Default fallback
    let priceUsd = 0.00001 // Default fallback

    try {
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
      )
      const dexData = await dexResponse.json()
      
      if (dexData.pairs && dexData.pairs.length > 0) {
        const pair = dexData.pairs.find((p: any) => p.dexId === 'pumpswap') || dexData.pairs[0]
        marketCap = pair.marketCap || pair.fdv || 50000
        priceUsd = parseFloat(pair.priceUsd) || 0.00001
      }
    } catch (dexError) {
      console.error('Failed to fetch market data, using defaults:', dexError)
    }

    console.log('Claiming reward:', { wallet_address, score, marketCap, priceUsd, game_session_id, clientIP })

    // Call the claim_reward function with price for USD cap calculation
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

    // Update the reward record with IP address
    if (data && data.success && data.reward_id) {
      await supabase
        .from('token_rewards')
        .update({ ip_address: clientIP })
        .eq('id', data.reward_id)
    }

    console.log('Claim result:', data)

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
