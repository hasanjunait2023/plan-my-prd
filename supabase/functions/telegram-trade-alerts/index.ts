import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if this is a test message request
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    
    if (body.test === true) {
      return await sendTestMessage(body.chat_id, BOT_TOKEN);
    }

    // Get alert settings
    const { data: settings, error: settingsErr } = await supabase
      .from('alert_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsErr || !settings?.telegram_chat_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'No chat_id configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chatId = settings.telegram_chat_id;
    const alerts: string[] = [];

    // Alert Type 1: Confluence Alerts
    if (settings.confluence_alert) {
      const minGrades = settings.min_confluence_grade === 'A+' ? ['A+'] 
        : settings.min_confluence_grade === 'A' ? ['A+', 'A'] 
        : ['A+', 'A', 'B'];

      const { data: confluenceData } = await supabase
        .from('confluence_scores')
        .select('*')
        .in('grade', minGrades)
        .order('calculated_at', { ascending: false })
        .limit(10);

      if (confluenceData?.length) {
        for (const c of confluenceData) {
          // Check if already alerted in last 30 min
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from('alert_log')
            .select('id')
            .eq('alert_type', 'confluence')
            .eq('pair', c.pair)
            .gte('sent_at', thirtyMinAgo)
            .limit(1);

          if (!existing?.length) {
            // Get ADR data for this pair
            const { data: adrData } = await supabase
              .from('adr_data')
              .select('adr_percent_used')
              .eq('pair', c.pair)
              .order('fetched_at', { ascending: false })
              .limit(1);

            const adrUsed = adrData?.[0]?.adr_percent_used ?? 0;
            const emoji = c.direction === 'BUY' ? '🟢' : '🔴';
            const msg = `${emoji} <b>${c.grade} SETUP: ${c.pair} — ${c.direction}</b>\nStrength Diff: ${c.strength_diff} | EMA: ${c.ema_score}/3 ${c.ema_score >= 2 ? '✓' : ''} | Session: ${c.active_session || 'None'}\nADR Used: ${Math.round(adrUsed)}%`;
            alerts.push(msg);

            await supabase.from('alert_log').insert({
              alert_type: 'confluence', pair: c.pair, message: msg,
              metadata: { grade: c.grade, direction: c.direction }
            });
          }
        }
      }
    }

    // Alert Type 2: EMA Alignment Shift
    if (settings.ema_shift_alert) {
      const { data: emaData } = await supabase
        .from('ema_alignments')
        .select('*')
        .eq('is_aligned', true)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (emaData?.length) {
        // Group by pair
        const pairMap = new Map<string, typeof emaData>();
        for (const e of emaData) {
          if (!pairMap.has(e.pair)) pairMap.set(e.pair, []);
          pairMap.get(e.pair)!.push(e);
        }

        for (const [pair, alignments] of pairMap) {
          if (alignments.length >= 2) {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: existing } = await supabase
              .from('alert_log')
              .select('id')
              .eq('alert_type', 'ema_shift')
              .eq('pair', pair)
              .gte('sent_at', fiveMinAgo)
              .limit(1);

            if (!existing?.length) {
              const tfDetails = alignments.map(a => `${a.timeframe}: ${a.direction} ✓`).join(' | ');
              const msg = `⚡ <b>EMA SHIFT: ${pair}</b>\n${tfDetails}\nMulti-TF alignment detected!`;
              alerts.push(msg);

              await supabase.from('alert_log').insert({
                alert_type: 'ema_shift', pair, message: msg,
                metadata: { timeframes: alignments.map(a => a.timeframe) }
              });
            }
          }
        }
      }
    }

    // Alert Type 3: Risk Breach Warning
    if (settings.risk_breach_alert) {
      const { data: mt5Trades } = await supabase
        .from('mt5_trades')
        .select('pnl, open_time')
        .gte('open_time', new Date().toISOString().split('T')[0])
        .order('open_time', { ascending: false });

      if (mt5Trades?.length) {
        const dailyPnl = mt5Trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const tradeCount = mt5Trades.length;

        // Check if daily loss is concerning (we use 500 as default, would come from settings)
        if (dailyPnl < -300) {
          const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from('alert_log')
            .select('id')
            .eq('alert_type', 'risk_breach')
            .gte('sent_at', tenMinAgo)
            .limit(1);

          if (!existing?.length) {
            const msg = `🔴 <b>RISK ALERT</b>\nDaily P/L: $${dailyPnl.toFixed(0)}\nTrades today: ${tradeCount}\n⛔ Consider stopping for the day.`;
            alerts.push(msg);

            await supabase.from('alert_log').insert({
              alert_type: 'risk_breach', pair: null, message: msg,
              metadata: { daily_pnl: dailyPnl, trade_count: tradeCount }
            });
          }
        }
      }
    }

    // Alert Type 4: Session Reminder
    if (settings.session_reminder_alert) {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();

      // London: 08:00 UTC, NY: 13:30 UTC — alert 5 min before
      const sessions = [
        { name: 'London', hour: 7, min: 55 },
        { name: 'New York', hour: 13, min: 25 },
      ];

      for (const session of sessions) {
        if (utcHour === session.hour && utcMin >= session.min && utcMin <= session.min + 2) {
          const today = now.toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('alert_log')
            .select('id')
            .eq('alert_type', 'session_reminder')
            .gte('sent_at', today)
            .eq('metadata->>session', session.name)
            .limit(1);

          if (!existing?.length) {
            // Get top setups
            const { data: topSetups } = await supabase
              .from('confluence_scores')
              .select('pair, grade')
              .in('grade', ['A+', 'A'])
              .limit(3);

            const setupList = topSetups?.map(s => `${s.pair} (${s.grade})`).join(', ') || 'None';
            const msg = `🕐 <b>${session.name} Session opens in 5 min</b>\nTop setups: ${setupList}\nCheck your charts!`;
            alerts.push(msg);

            await supabase.from('alert_log').insert({
              alert_type: 'session_reminder', pair: null, message: msg,
              metadata: { session: session.name }
            });
          }
        }
      }
    }

    // Alert Type 5: MT5 Trade Updates
    if (settings.mt5_trade_alert) {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recentTrades } = await supabase
        .from('mt5_trades')
        .select('*')
        .or(`open_time.gte.${twoMinAgo},close_time.gte.${twoMinAgo}`)
        .limit(5);

      if (recentTrades?.length) {
        for (const t of recentTrades) {
          const { data: existing } = await supabase
            .from('alert_log')
            .select('id')
            .eq('alert_type', 'mt5_trade')
            .eq('metadata->>ticket', t.ticket)
            .gte('sent_at', twoMinAgo)
            .limit(1);

          if (!existing?.length) {
            const isClose = !t.is_open && t.close_time && t.close_time >= twoMinAgo;
            const emoji = isClose ? (t.pnl && t.pnl >= 0 ? '✅' : '❌') : '📊';
            const action = isClose ? 'Closed' : 'Opened';
            const pnlStr = t.pnl ? `\nP/L: $${t.pnl.toFixed(0)} (${t.pips?.toFixed(0) || 0} pips)` : '';
            const msg = `${emoji} <b>Trade ${action}: ${t.pair} ${t.direction}</b>${pnlStr}\nLot: ${t.lot_size}`;
            alerts.push(msg);

            await supabase.from('alert_log').insert({
              alert_type: 'mt5_trade', pair: t.pair, message: msg,
              metadata: { ticket: t.ticket, action }
            });
          }
        }
      }
    }

    // Send all alerts
    for (const msg of alerts) {
      await sendTelegram(chatId, msg, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    }

    return new Response(JSON.stringify({ ok: true, alerts_sent: alerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Alert error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendTelegram(chatId: string, text: string, lovableKey: string, telegramKey: string) {
  const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Telegram API failed [${response.status}]: ${JSON.stringify(data)}`);
  }
  return response.json();
}

async function sendTestMessage(chatId: string, lovableKey: string, telegramKey: string) {
  if (!chatId) {
    return new Response(JSON.stringify({ error: 'No chat_id provided' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    await sendTelegram(
      chatId,
      '✅ <b>TradeVault Pro Connected!</b>\n\nTelegram alerts are working. You will now receive:\n• 🟢 High-grade confluence alerts\n• ⚡ EMA alignment shifts\n• 🔴 Risk breach warnings\n• 🕐 Session reminders\n• 📊 MT5 trade updates',
      lovableKey,
      telegramKey
    );

    return new Response(JSON.stringify({ ok: true, message: 'Test message sent!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
