import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert forex/trading chart analyzer. Given a trading chart screenshot, extract as much trade data as possible.

Return a JSON object using the tool provided. Extract these fields from the chart:
- pair: The currency pair or instrument (e.g. "USD/JPY", "EUR/USD", "XAU/USD")
- timeframe: Chart timeframe (e.g. "1M", "5M", "15M", "1H", "4H", "D", "W")
- direction: "LONG" or "SHORT" based on the trade direction visible
- entryPrice: The entry price of the trade
- exitPrice: The exit price (if visible)
- stopLoss: The stop loss level (if visible)
- takeProfit: The take profit level (if visible)
- lotSize: The lot/position size (if visible)
- riskAmount: The risk amount in dollars (if visible)
- profitAmount: The profit/loss amount (if visible)
- session: Estimate the trading session based on time axis ("Asian", "London", "New York", "London Close")
- pips: Number of pips gained/lost (if calculable)

Only include fields you can confidently extract. Use null for fields you cannot determine.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this trading chart screenshot and extract all trade data you can find.",
                },
                {
                  type: "image_url",
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_trade_data",
                description:
                  "Extract structured trade data from a chart screenshot",
                parameters: {
                  type: "object",
                  properties: {
                    pair: { type: "string", description: "Currency pair e.g. USD/JPY" },
                    timeframe: { type: "string", enum: ["1M", "5M", "15M", "1H", "4H", "D", "W"] },
                    direction: { type: "string", enum: ["LONG", "SHORT"] },
                    entryPrice: { type: "number" },
                    exitPrice: { type: "number" },
                    stopLoss: { type: "number" },
                    takeProfit: { type: "number" },
                    lotSize: { type: "number" },
                    riskAmount: { type: "number" },
                    profitAmount: { type: "number" },
                    session: { type: "string", enum: ["Asian", "London", "New York", "London Close"] },
                    pips: { type: "number" },
                  },
                  required: ["pair"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_trade_data" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-trade-screenshot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
