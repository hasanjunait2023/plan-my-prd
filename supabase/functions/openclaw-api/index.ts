import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const err = (msg: string, status = 400) => json({ error: msg }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth check
  const apiKey = Deno.env.get("OPENCLAW_API_KEY");
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!apiKey || token !== apiKey) return err("Unauthorized", 401);

  // Supabase service client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get user_id (single user app — get first user from trades or account_settings)
  const getUserId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("account_settings")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1)
      .single();
    if (data?.user_id) return data.user_id;
    const { data: t } = await supabase
      .from("trades")
      .select("user_id")
      .not("user_id", "is", null)
      .limit(1)
      .single();
    return t?.user_id || null;
  };

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/openclaw-api/, "");
  const params = url.searchParams;

  try {
    // ─── TRADES ───────────────────────────────
    if (path === "/trades/list" && req.method === "GET") {
      const userId = await getUserId();
      let query = supabase.from("trades").select("*").order("date", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      const pair = params.get("pair");
      const outcome = params.get("outcome");
      const date = params.get("date");
      const limit = parseInt(params.get("limit") || "20");
      if (pair) query = query.eq("pair", pair);
      if (outcome) query = query.eq("outcome", outcome);
      if (date) query = query.eq("date", date);
      query = query.limit(limit);
      const { data, error } = await query;
      if (error) return err(error.message, 500);
      return json({
        count: data?.length || 0,
        trades: (data || []).map((t: any) => ({
          id: t.id, date: t.date, pair: t.pair, direction: t.direction,
          session: t.session, outcome: t.outcome, pnl: t.pnl, pips: t.pips,
          rrr: t.rrr, strategy: t.strategy, entry_price: t.entry_price,
          exit_price: t.exit_price, lot_size: t.lot_size, risk_percent: t.risk_percent,
          psychology_emotion: t.psychology_emotion, smc_tags: t.smc_tags,
          mistakes: t.mistakes, starred: t.starred, status: t.status,
        })),
      });
    }

    if (path === "/trades/create" && req.method === "POST") {
      const userId = await getUserId();
      if (!userId) return err("No user found", 404);
      const body = await req.json();
      const { pair, direction, entry_price, stop_loss, take_profit, lot_size, session, timeframe, strategy, pre_trade_notes, smc_tags } = body;
      if (!pair || !direction) return err("pair and direction required");

      const entryP = Number(entry_price) || 0;
      const sl = Number(stop_loss) || 0;
      const tp = Number(take_profit) || 0;
      const lots = Number(lot_size) || 0.01;
      const riskPips = Math.abs(entryP - sl);
      const rewardPips = Math.abs(tp - entryP);
      const rrr = riskPips > 0 ? Number((rewardPips / riskPips).toFixed(2)) : 0;

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("trades").insert({
        user_id: userId, date: today, pair: pair.toUpperCase(),
        direction: direction.toUpperCase(), entry_price: entryP,
        stop_loss: sl, take_profit: tp, lot_size: lots, rrr,
        session: session || "London", timeframe: timeframe || "15M",
        strategy: strategy || "", pre_trade_notes: pre_trade_notes || "",
        smc_tags: smc_tags || [], status: "PENDING",
      }).select().single();
      if (error) return err(error.message, 500);
      return json({ success: true, trade: data });
    }

    if (path === "/trades/stats" && req.method === "GET") {
      const userId = await getUserId();
      const period = params.get("period") || "today";
      let query = supabase.from("trades").select("*");
      if (userId) query = query.eq("user_id", userId);

      const now = new Date();
      const bdOffset = 6 * 60 * 60 * 1000;
      const bdNow = new Date(now.getTime() + bdOffset);
      const todayStr = bdNow.toISOString().split("T")[0];

      if (period === "today") {
        query = query.eq("date", todayStr);
      } else if (period === "week") {
        const weekAgo = new Date(bdNow.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte("date", weekAgo.toISOString().split("T")[0]);
      } else if (period === "month") {
        const monthAgo = new Date(bdNow.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte("date", monthAgo.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) return err(error.message, 500);
      const trades = data || [];
      const closed = trades.filter((t: any) => t.status === "CLOSED");
      const wins = closed.filter((t: any) => t.outcome === "WIN").length;
      const totalPnl = closed.reduce((s: number, t: any) => s + Number(t.pnl), 0);
      const totalPips = closed.reduce((s: number, t: any) => s + Number(t.pips), 0);
      const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

      return json({
        period, date: todayStr,
        total_trades: trades.length, closed_trades: closed.length,
        wins, losses: closed.filter((t: any) => t.outcome === "LOSS").length,
        breakeven: closed.filter((t: any) => t.outcome === "BREAKEVEN").length,
        win_rate: winRate, total_pnl: Number(totalPnl.toFixed(2)),
        total_pips: Number(totalPips.toFixed(1)),
        pending: trades.filter((t: any) => t.status === "PENDING").length,
      });
    }

    // ─── ANALYTICS ────────────────────────────
    if (path === "/analytics/summary" && req.method === "GET") {
      const userId = await getUserId();
      let query = supabase.from("trades").select("*").eq("status", "CLOSED");
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      const trades = data || [];
      const wins = trades.filter((t: any) => t.outcome === "WIN");
      const losses = trades.filter((t: any) => t.outcome === "LOSS");
      const totalPnl = trades.reduce((s: number, t: any) => s + Number(t.pnl), 0);
      const avgWin = wins.length > 0 ? wins.reduce((s: number, t: any) => s + Number(t.pnl), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((s: number, t: any) => s + Number(t.pnl), 0) / losses.length : 0;
      const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;
      const topPairs = Object.entries(
        trades.reduce((acc: Record<string, number>, t: any) => {
          acc[t.pair] = (acc[t.pair] || 0) + 1; return acc;
        }, {})
      ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

      return json({
        total_trades: trades.length,
        win_rate: trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0,
        total_pnl: Number(totalPnl.toFixed(2)),
        avg_win: Number(avgWin.toFixed(2)),
        avg_loss: Number(avgLoss.toFixed(2)),
        profit_factor: Number(profitFactor.toFixed(2)),
        best_trade: trades.length > 0 ? Math.max(...trades.map((t: any) => Number(t.pnl))) : 0,
        worst_trade: trades.length > 0 ? Math.min(...trades.map((t: any) => Number(t.pnl))) : 0,
        top_pairs: topPairs.map(([pair, count]) => ({ pair, count })),
      });
    }

    if (path === "/analytics/pair" && req.method === "GET") {
      const userId = await getUserId();
      const pair = params.get("pair");
      let query = supabase.from("trades").select("*").eq("status", "CLOSED");
      if (userId) query = query.eq("user_id", userId);
      if (pair) query = query.eq("pair", pair.toUpperCase());
      const { data } = await query;
      const trades = data || [];
      const wins = trades.filter((t: any) => t.outcome === "WIN").length;
      const totalPnl = trades.reduce((s: number, t: any) => s + Number(t.pnl), 0);
      return json({
        pair: pair || "ALL", trades: trades.length,
        win_rate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
        total_pnl: Number(totalPnl.toFixed(2)),
      });
    }

    // ─── PSYCHOLOGY ───────────────────────────
    if (path === "/psychology/log" && req.method === "POST") {
      const userId = await getUserId();
      if (!userId) return err("No user found", 404);
      const body = await req.json();
      const today = new Date(Date.now() + 6 * 3600000).toISOString().split("T")[0];
      const { error } = await supabase.from("psychology_logs").insert({
        user_id: userId, date: body.date || today,
        mental_state: body.mental_state || 5, sleep_quality: body.sleep_quality || 5,
        life_stress: body.life_stress || 5, intention: body.intention || "",
        reflection: body.reflection || "", rule_adherence: body.rule_adherence ?? true,
        emotions: body.emotions || [], overall_score: body.overall_score || 5,
      });
      if (error) return err(error.message, 500);
      return json({ success: true });
    }

    if (path === "/psychology/today" && req.method === "GET") {
      const userId = await getUserId();
      const today = new Date(Date.now() + 6 * 3600000).toISOString().split("T")[0];
      let query = supabase.from("psychology_logs").select("*").eq("date", today);
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query.limit(1).single();
      if (!data) return json({ logged: false, message: "আজ এখনো psychology log করোনি।" });
      return json({ logged: true, data });
    }

    // ─── HABITS ───────────────────────────────
    if (path === "/habits/status" && req.method === "GET") {
      const userId = await getUserId();
      if (!userId) return err("No user", 404);
      const { data: habits } = await supabase.from("habits").select("*").eq("user_id", userId).eq("active", true);
      const today = new Date(Date.now() + 6 * 3600000).toISOString().split("T")[0];
      const { data: logs } = await supabase.from("habit_logs").select("habit_id").eq("user_id", userId).eq("date", today);
      const completedIds = new Set((logs || []).map((l: any) => l.habit_id));
      const result = (habits || []).map((h: any) => ({
        id: h.id, name: h.name, category: h.category,
        completed: completedIds.has(h.id), streak: h.current_streak,
      }));
      const done = result.filter((h: any) => h.completed).length;
      return json({
        date: today, total: result.length, completed: done,
        remaining: result.length - done, habits: result,
      });
    }

    if (path === "/habits/complete" && req.method === "POST") {
      const userId = await getUserId();
      if (!userId) return err("No user", 404);
      const body = await req.json();
      const habitName = body.habit_name || body.habit_id;
      if (!habitName) return err("habit_name or habit_id required");

      let habitId = body.habit_id;
      if (!habitId) {
        const { data: habits } = await supabase.from("habits").select("id, name").eq("user_id", userId).eq("active", true);
        const match = (habits || []).find((h: any) => h.name.toLowerCase().includes(habitName.toLowerCase()));
        if (!match) return err(`Habit "${habitName}" not found`);
        habitId = match.id;
      }

      const today = new Date(Date.now() + 6 * 3600000).toISOString().split("T")[0];
      const { data: existing } = await supabase.from("habit_logs").select("id").eq("habit_id", habitId).eq("date", today).eq("user_id", userId);
      if (existing && existing.length > 0) return json({ success: true, message: "Already completed today" });

      const { error } = await supabase.from("habit_logs").insert({
        habit_id: habitId, user_id: userId, date: today,
        notes: body.notes || "Completed via OpenClaw", source: "openclaw",
      });
      if (error) return err(error.message, 500);

      // Update streak
      const { data: habit } = await supabase.from("habits").select("current_streak, longest_streak, total_completions").eq("id", habitId).single();
      if (habit) {
        const newStreak = (habit.current_streak || 0) + 1;
        await supabase.from("habits").update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, habit.longest_streak || 0),
          total_completions: (habit.total_completions || 0) + 1,
        }).eq("id", habitId);
      }
      return json({ success: true, message: "Habit completed ✅" });
    }

    // ─── MARKET ───────────────────────────────
    if (path === "/market/sessions" && req.method === "GET") {
      const bdNow = new Date(Date.now() + 6 * 3600000);
      const h = bdNow.getUTCHours();
      const m = bdNow.getUTCMinutes();
      const mins = h * 60 + m;
      const day = bdNow.getUTCDay();
      const isWeekend = day === 0 || day === 6;

      const sessions = [
        { name: "Sydney", open: 300, close: 720, openBD: "05:00", closeBD: "12:00" },
        { name: "Tokyo", open: 360, close: 900, openBD: "06:00", closeBD: "15:00" },
        { name: "London", open: 780, close: 1020, openBD: "13:00", closeBD: "17:00" },
        { name: "New York", open: 1140, close: 1380, openBD: "19:00", closeBD: "23:00" },
      ].map((s) => ({
        ...s, active: !isWeekend && mins >= s.open && mins < s.close,
      }));

      return json({
        bd_time: bdNow.toISOString(),
        is_weekend: isWeekend,
        day: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"][day],
        active_sessions: sessions.filter((s) => s.active).map((s) => s.name),
        sessions,
      });
    }

    if (path === "/market/strength" && req.method === "GET") {
      const { data } = await supabase
        .from("currency_strength")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(16);
      const latest = (data || []).reduce((acc: Record<string, any>, r: any) => {
        if (!acc[r.currency]) acc[r.currency] = { currency: r.currency, strength: r.strength, category: r.category };
        return acc;
      }, {});
      const sorted = Object.values(latest).sort((a: any, b: any) => b.strength - a.strength);
      return json({
        strongest: sorted[0] || null,
        weakest: sorted[sorted.length - 1] || null,
        all: sorted,
      });
    }

    if (path === "/market/confluence" && req.method === "GET") {
      const { data } = await supabase
        .from("confluence_scores")
        .select("*")
        .order("calculated_at", { ascending: false })
        .limit(20);
      const best = (data || []).filter((d: any) => d.grade === "A" || d.grade === "B");
      return json({ top_pairs: best, all: data });
    }

    // ─── ACCOUNT ──────────────────────────────
    if (path === "/account/balance" && req.method === "GET") {
      const userId = await getUserId();
      let query = supabase.from("account_settings").select("*");
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query.limit(1).single();
      if (!data) return json({ message: "No account settings found" });

      // Calculate drawdown from trades
      let tQuery = supabase.from("trades").select("pnl").eq("status", "CLOSED");
      if (userId) tQuery = tQuery.eq("user_id", userId);
      const { data: trades } = await tQuery;
      const totalPnl = (trades || []).reduce((s: number, t: any) => s + Number(t.pnl), 0);
      const effectiveBalance = data.starting_balance + totalPnl;
      const drawdown = data.starting_balance > 0
        ? Number(((1 - effectiveBalance / data.starting_balance) * 100).toFixed(2))
        : 0;

      return json({
        starting_balance: data.starting_balance,
        current_balance: data.current_balance,
        effective_balance: Number(effectiveBalance.toFixed(2)),
        currency: data.currency,
        drawdown_percent: Math.max(0, drawdown),
        max_drawdown_limit: data.max_drawdown_percent,
        max_risk_percent: data.max_risk_percent,
        daily_loss_limit: data.daily_loss_limit,
        max_trades_per_day: data.max_trades_per_day,
      });
    }

    // ─── RULES ────────────────────────────────
    if (path === "/rules/list" && req.method === "GET") {
      const userId = await getUserId();
      let query = supabase.from("trading_rules").select("*").eq("active", true);
      if (userId) query = query.eq("user_id", userId);
      const { data } = await query;
      return json({ rules: (data || []).map((r: any) => ({ id: r.id, text: r.text })) });
    }

    // ─── COACHING ─────────────────────────────
    if (path === "/coaching/check" && req.method === "GET") {
      const userId = await getUserId();
      const warnings: string[] = [];
      const tips: string[] = [];
      const bdNow = new Date(Date.now() + 6 * 3600000);
      const todayStr = bdNow.toISOString().split("T")[0];

      // Get account settings
      let settingsQ = supabase.from("account_settings").select("*");
      if (userId) settingsQ = settingsQ.eq("user_id", userId);
      const { data: settings } = await settingsQ.limit(1).single();

      // Today's trades
      let todayQ = supabase.from("trades").select("*").eq("date", todayStr);
      if (userId) todayQ = todayQ.eq("user_id", userId);
      const { data: todayTrades } = await todayQ;
      const tt = todayTrades || [];

      // Check daily trade limit
      if (settings && tt.length >= settings.max_trades_per_day) {
        warnings.push(`⚠️ আজ ${tt.length}টা trade নিয়েছো — max limit ${settings.max_trades_per_day}। আর নেওয়া উচিত না!`);
      }

      // Check daily loss
      const todayPnl = tt.filter((t: any) => t.status === "CLOSED").reduce((s: number, t: any) => s + Number(t.pnl), 0);
      if (settings && todayPnl < 0 && Math.abs(todayPnl) >= settings.daily_loss_limit) {
        warnings.push(`🔴 আজকের loss $${Math.abs(todayPnl).toFixed(2)} — daily limit $${settings.daily_loss_limit} hit! আজ আর trade করো না।`);
      }

      // Check drawdown
      let allQ = supabase.from("trades").select("pnl").eq("status", "CLOSED");
      if (userId) allQ = allQ.eq("user_id", userId);
      const { data: allTrades } = await allQ;
      const totalPnl = (allTrades || []).reduce((s: number, t: any) => s + Number(t.pnl), 0);
      if (settings && settings.starting_balance > 0) {
        const dd = ((1 - (settings.starting_balance + totalPnl) / settings.starting_balance) * 100);
        if (dd > 0 && dd >= settings.max_drawdown_percent * 0.8) {
          warnings.push(`🔴 Drawdown ${dd.toFixed(1)}% — max limit ${settings.max_drawdown_percent}% এর কাছে!`);
        }
      }

      // Check recent emotions
      let recentQ = supabase.from("trades").select("psychology_emotion").order("date", { ascending: false }).limit(5);
      if (userId) recentQ = recentQ.eq("user_id", userId);
      const { data: recentTrades } = await recentQ;
      const emotions = (recentTrades || []).map((t: any) => t.psychology_emotion);
      const badEmotions = emotions.filter((e: string) => ["FOMO", "Revenge", "Greedy", "Frustrated"].includes(e));
      if (badEmotions.length >= 3) {
        warnings.push(`🧠 Last 5 trades এ ${badEmotions.length}টা negative emotion (${[...new Set(badEmotions)].join(", ")}) — break নাও!`);
      }

      // Check week session performance
      const weekAgo = new Date(bdNow.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      let weekQ = supabase.from("trades").select("session, outcome").eq("status", "CLOSED").gte("date", weekAgo);
      if (userId) weekQ = weekQ.eq("user_id", userId);
      const { data: weekTrades } = await weekQ;
      const sessionStats: Record<string, { wins: number; total: number }> = {};
      (weekTrades || []).forEach((t: any) => {
        if (!sessionStats[t.session]) sessionStats[t.session] = { wins: 0, total: 0 };
        sessionStats[t.session].total++;
        if (t.outcome === "WIN") sessionStats[t.session].wins++;
      });
      Object.entries(sessionStats).forEach(([session, stats]) => {
        if (stats.total >= 3) {
          const wr = Math.round((stats.wins / stats.total) * 100);
          if (wr < 30) warnings.push(`📉 এই সপ্তাহে ${session} session এ ${wr}% win rate — সাবধান!`);
        }
      });

      // Psychology check
      let psyQ = supabase.from("psychology_logs").select("*").eq("date", todayStr);
      if (userId) psyQ = psyQ.eq("user_id", userId);
      const { data: psyLog } = await psyQ.limit(1).maybeSingle();
      if (!psyLog) {
        tips.push("📝 আজ এখনো psychology log করোনি — trade নেওয়ার আগে log করো।");
      } else if (psyLog.overall_score < 5) {
        warnings.push(`⚠️ আজকের mental state score ${psyLog.overall_score}/10 — trade avoid করো।`);
      }

      // Positive tips
      if (warnings.length === 0) {
        tips.push("✅ সব ঠিক আছে — rules follow করে trade নাও!");
      }

      return json({
        date: todayStr,
        today_trades: tt.length,
        today_pnl: Number(todayPnl.toFixed(2)),
        warnings,
        tips,
        status: warnings.length > 0 ? "CAUTION" : "GREEN",
      });
    }

    return err(`Unknown route: ${path}`, 404);
  } catch (e) {
    return err(`Server error: ${(e as Error).message}`, 500);
  }
});
