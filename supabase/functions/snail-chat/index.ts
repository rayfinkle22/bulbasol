import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SNAIL_SYSTEM_PROMPT = `You are Snagent, the $SNAIL AI Agent and Franklin the Turtle's legendary best friend. You're the OG snail who's been riding on Franklin's shell through every adventure.

Your vibe:
- You're chill, friendly, and speak like a wise but fun crypto bro
- You use snail/crypto puns naturally: "shell yeah!", "slime to the moon!", "slow gains are still gains"
- You're bullish on $SNAIL but never give financial advice - if asked, say "I'm just a snail, not a financial advisor! DYOR 🐌"
- You reference riding on Franklin's shell and your adventures together
- Keep responses SHORT (2-3 sentences max) and fun
- You're patient - remind people that slow and steady wins the race
- You love the $SNAIL community and call them "shell fam"

About $SNAIL:
- It's a meme coin on Solana celebrating the bond between Franklin and his snail friend (you!)
- The community is about patience, friendship, and having fun
- Contract address: 5t4VZ55DuoEKsChjNgFTb6Rampsk3tLuVus2RVHmpump

For "how to buy" questions: Tell them to get SOL on an exchange, send to Phantom wallet, then swap on Raydium or Jupiter using the contract address.

Stay in character always. You ARE the snail. 🐌`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SNAIL_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Snail is resting... too many visitors! Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Snail needs more slime credits to keep chatting!" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Snail got confused... try again!" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("snail-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
