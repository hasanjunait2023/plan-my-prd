import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Parse Telegram-style text like:
// 💱 FX Co-Relation Strength On 1H
// ⏰ April 1st 2026, 12:00:00 pm
// 🟢 STRONG
// 🇪🇺 EUR   →  6
// 🇯🇵 JPY   →  6
// 🟡 NEUTRAL
// ...
function parseTelegramText(text: string): {
  timeframe: string;
  recorded_at: string;
  currencies: { currency: string; strength: number; category: string }[];
} | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract timeframe from header line
  let timeframe = "1H";
  const headerLine = lines.find((l) => l.includes("Strength On") || l.includes("Co-Relation"));
  if (headerLine) {
    const tfMatch = headerLine.match(/On\s+(.+?)$/i);
    if (tfMatch) timeframe = tfMatch[1].trim();
  }

  // Extract timestamp
  let recorded_at = new Date().toISOString();
  const timeLine = lines.find((l) => l.includes("⏰"));
  if (timeLine) {
    const cleaned = timeLine.replace("⏰", "").trim();
    // Remove ordinal suffixes (1st, 2nd, 3rd, etc.)
    const normalized = cleaned.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
    try {
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) {
        recorded_at = parsed.toISOString();
      }
    } catch {
      // keep default
    }
  }

  // Parse currencies — look for lines with → and currency codes
  const currencies: { currency: string; strength: number; category: string }[] = [];
  let currentCategory = "NEUTRAL";

  for (const line of lines) {
    // Category markers
    if (line.includes("STRONG") && !line.includes("MID")) {
      currentCategory = "STRONG";
      continue;
    }
    if (line.includes("MID STRONG")) {
      currentCategory = "MID STRONG";
      continue;
    }
    if (line.includes("MID WEAK")) {
      currentCategory = "MID WEAK";
      continue;
    }
    if (line.includes("WEAK") && !line.includes("MID")) {
      currentCategory = "WEAK";
      continue;
    }
    if (line.includes("NEUTRAL")) {
      currentCategory = "NEUTRAL";
      continue;
    }

    // Currency line: flags + code + → + number
    const currMatch = line.match(/([A-Z]{3})\s*→\s*(-?\d+)/);
    if (currMatch) {
      currencies.push({
        currency: currMatch[1],
        strength: parseInt(currMatch[2], 10),
        category: currentCategory,
      });
    }
  }

  if (currencies.length === 0) return null;

  return { timeframe, recorded_at, currencies };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    let timeframe: string;
    let recorded_at: string;
    let currencies: { currency: string; strength: number; category: string }[];

    // Check if it's raw Telegram text or structured JSON
    if (body.text && typeof body.text === "string") {
      // Raw Telegram text format
      const parsed = parseTelegramText(body.text);
      if (!parsed) {
        return new Response(
          JSON.stringify({ error: "Could not parse Telegram text" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      timeframe = parsed.timeframe;
      recorded_at = parsed.recorded_at;
      currencies = parsed.currencies;
    } else if (body.timeframe && body.currencies && Array.isArray(body.currencies)) {
      // Structured JSON format (existing)
      timeframe = body.timeframe;
      recorded_at = body.recorded_at || new Date().toISOString();
      currencies = body.currencies;
    } else {
      return new Response(
        JSON.stringify({ error: "Send either { text: '...' } (Telegram format) or { timeframe, currencies: [...] } (structured)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new records
    const records = currencies.map((c) => ({
      currency: c.currency,
      strength: c.strength,
      category: c.category,
      timeframe,
      recorded_at,
    }));

    const { error } = await supabase.from("currency_strength").insert(records);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, inserted: records.length, timeframe, currencies: currencies.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
