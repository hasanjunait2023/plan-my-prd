import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const { data, error } = await sb
        .from("api_key_pool")
        .select("id, provider, label, is_active, calls_today, daily_limit, last_used_at, last_error_at, priority, created_at")
        .order("priority", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ keys: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add") {
      const body = await req.json();
      const { api_key, label, provider, daily_limit, priority } = body;
      if (!api_key) throw new Error("api_key is required");

      const { data, error } = await sb.from("api_key_pool").insert({
        api_key,
        label: label || "New Key",
        provider: provider || "twelvedata",
        daily_limit: daily_limit || 800,
        priority: priority ?? 0,
      }).select("id, label, provider, priority, daily_limit").single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, key: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const body = await req.json();
      const { id } = body;
      if (!id) throw new Error("id is required");
      const { error } = await sb.from("api_key_pool").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle") {
      const body = await req.json();
      const { id, is_active } = body;
      if (!id) throw new Error("id is required");
      const { error } = await sb.from("api_key_pool").update({ is_active }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
