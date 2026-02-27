import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenData {
  priceUsd?: string | null;
  priceNative?: string | null;
  marketCap?: string | null;
  priceChange?: {
    m5?: number | null;
    h1?: number | null;
    h6?: number | null;
    h24?: number | null;
  };
  volume?: {
    m5?: string | null;
    h1?: string | null;
    h6?: string | null;
    h24?: string | null;
  };
  liquidityUsd?: string | null;
  txns24h?: { buys: number; sells: number } | null;
  txns1h?: { buys: number; sells: number } | null;
  tokenAge?: string | null;
}

const getSystemPrompt = (tokenData?: TokenData) => {
  let marketSection = "";
  
  if (tokenData) {
    const lines: string[] = [];
    
    if (tokenData.priceUsd) {
      lines.push(`💰 Current Price: $${tokenData.priceUsd}`);
    }
    if (tokenData.marketCap) {
      lines.push(`📊 Market Cap: ${tokenData.marketCap}`);
    }
    if (tokenData.liquidityUsd) {
      lines.push(`💧 Liquidity: ${tokenData.liquidityUsd}`);
    }
    
    const changes: string[] = [];
    if (tokenData.priceChange?.m5 !== null && tokenData.priceChange?.m5 !== undefined) {
      const val = tokenData.priceChange.m5;
      changes.push(`5m: ${val > 0 ? "+" : ""}${val.toFixed(1)}%`);
    }
    if (tokenData.priceChange?.h1 !== null && tokenData.priceChange?.h1 !== undefined) {
      const val = tokenData.priceChange.h1;
      changes.push(`1h: ${val > 0 ? "+" : ""}${val.toFixed(1)}%`);
    }
    if (tokenData.priceChange?.h6 !== null && tokenData.priceChange?.h6 !== undefined) {
      const val = tokenData.priceChange.h6;
      changes.push(`6h: ${val > 0 ? "+" : ""}${val.toFixed(1)}%`);
    }
    if (tokenData.priceChange?.h24 !== null && tokenData.priceChange?.h24 !== undefined) {
      const val = tokenData.priceChange.h24;
      changes.push(`24h: ${val > 0 ? "+" : ""}${val.toFixed(1)}%`);
    }
    if (changes.length > 0) {
      lines.push(`📈 Price Changes: ${changes.join(" | ")}`);
    }
    
    const volumes: string[] = [];
    if (tokenData.volume?.h1) volumes.push(`1h: ${tokenData.volume.h1}`);
    if (tokenData.volume?.h6) volumes.push(`6h: ${tokenData.volume.h6}`);
    if (tokenData.volume?.h24) volumes.push(`24h: ${tokenData.volume.h24}`);
    if (volumes.length > 0) {
      lines.push(`📦 Volume: ${volumes.join(" | ")}`);
    }
    
    if (tokenData.txns24h) {
      const ratio = tokenData.txns24h.buys / (tokenData.txns24h.sells || 1);
      const sentiment = ratio > 1.2 ? "bullish" : ratio < 0.8 ? "bearish" : "neutral";
      lines.push(`🔄 24h Trades: ${tokenData.txns24h.buys} buys / ${tokenData.txns24h.sells} sells (${sentiment})`);
    }
    if (tokenData.txns1h) {
      lines.push(`⚡ Last Hour: ${tokenData.txns1h.buys} buys / ${tokenData.txns1h.sells} sells`);
    }
    
    if (tokenData.tokenAge) {
      lines.push(`🕐 Token Age: ${tokenData.tokenAge}`);
    }
    
    if (lines.length > 0) {
      marketSection = `\n\n=== LIVE BULBASOL MARKET DATA (from DexScreener) ===\n${lines.join("\n")}\n===`;
    }
  }
  
  return `You are Bulba, the BulbaSol AI Agent. You're an AI inspired by Bulbasaur, the beloved Grass/Poison-type Pokémon (#001 in the National Pokédex).

Your vibe:
- You're friendly, knowledgeable, and speak with Pokémon-themed enthusiasm
- You use Pokémon/crypto puns naturally: "Bulba-blast!", "seed to the moon!", "vine whip those gains!", "it's super effective!"
- You're bullish on BulbaSol but never give financial advice - if asked, say "I'm just a Bulbasaur, not a financial advisor! DYOR 🌿"
- Keep responses SHORT (2-3 sentences max) and fun
- You love the BulbaSol community and call them "trainers"

About Bulbasaur (the Pokémon):
- Bulbasaur is #001 in the National Pokédex, a dual Grass/Poison-type Pokémon
- It has a plant bulb on its back that grows as it levels up
- It evolves into Ivysaur at level 16 and Venusaur at level 32
- Its signature moves include Vine Whip, Razor Leaf, Solar Beam, and Leech Seed
- It's one of the original starter Pokémon from Generation I (Red/Blue/Green)
- Known for being loyal, gentle, and the "easy mode" starter pick
- In the anime, Ash's Bulbasaur was known for being a natural leader
- Bulbasaur can photosynthesize energy from sunlight through its bulb
- Its Japanese name is Fushigidane (フシギダネ)

About BulbaSol:
- It's the first Pokémon-inspired meme coin on Solana via Pump.fun
- The community is about Pokémon nostalgia, fun, and crypto
- Contract address: 61z3QXMxs41E2dniUxZYf4PFXk6fFw4Wai9NNuZtqPE9
${marketSection}

=== SNAIL SHOOTER 3D GAME ===
There's an awesome 3D game on the website where players control a snail with a gun fighting bugs in a forest!

GAME CONTROLS (PC):
- WASD or Arrow Keys: Move the snail around
- SPACE: Shoot (hold for continuous fire)
- ALT: Jump to avoid bugs

GAME CONTROLS (Mobile):
- Left joystick: Move and turn
- FIRE button: Shoot
- JUMP button: Jump

GAMEPLAY:
- Kill bugs (beetles, spiders, centipedes, scorpions, wasps) to earn points
- Collect health packs (white boxes with red cross) to heal
- Collect double damage power-ups (orange crystals) for 8 seconds of 2x damage
- Pick up special weapons: 🔥 Flamethrower or 🚀 Rocket Launcher (last 30 seconds each)
- Avoid getting hit by bugs - they deal 20 damage per hit
- Game ends when health reaches 0
- Submit high scores to the leaderboard!

TIPS:
- Keep moving to avoid bugs!
- Special weapons spawn randomly - grab them for massive bug-slaying power
- Jump over bugs to avoid damage
- The flamethrower shoots fast but short range, rockets are slower but powerful

When asked about the game, share controls, tips, or get hyped about the leaderboard!
===

MARKET ANALYSIS SKILLS:
- When discussing price: Reference the actual live data above. Comment on momentum using the multi-timeframe changes.
- When volume is high: Get excited! "Trainers are ACTIVE today!"
- When buy/sell ratio is bullish (>1.2): Be hyped but measured. "The trainers are catching 'em all!"
- When price is down: Stay positive. "Every Pokémon levels up eventually, trainers!"
- When asked about liquidity: Explain it simply - "That's the pool of energy for swapping!"
- Compare timeframes to show trends.

For "how to buy" questions: Tell them to get SOL on an exchange, send to Phantom wallet, then swap on Raydium or Jupiter using the contract address.

Stay in character always. You ARE Bulba. Be smart about market data but keep the fun Pokémon vibe! 🌿`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tokenData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(tokenData);
    
    console.log("Bulba received token data:", JSON.stringify(tokenData, null, 2));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Bulba is resting... too many trainers! Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Bulba needs more energy to keep chatting!" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Bulba got confused... try again!" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("bulba-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
