import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_BASE = 'https://mt-client-api-v1.new-york.agiliumtrade.ai';

// Use Node.js https module to bypass SSL cert verification for MetaApi
async function metaFetch(url: string, headers: Record<string, string>): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> {
  const { default: https } = await import('node:https');
  const { URL } = await import('node:url');
  
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      rejectUnauthorized: false, // Skip SSL verification
    };

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => data,
          json: async () => JSON.parse(data),
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const metaApiToken = Deno.env.get('METAAPI_TOKEN');
    const accountId = Deno.env.get('METAAPI_ACCOUNT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!metaApiToken || !accountId) {
      return new Response(JSON.stringify({ error: 'Missing MetaApi credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'full';

    const headers: Record<string, string> = {
      'auth-token': metaApiToken,
      'Content-Type': 'application/json',
    };

    const results: Record<string, any> = {};

    // Fetch account info
    if (action === 'full' || action === 'account') {
      const res = await metaFetch(
        `${META_API_BASE}/users/current/accounts/${accountId}/account-information`,
        headers
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error('MetaApi account info error:', res.status, errText);
        results.account_error = `${res.status}: ${errText}`;
      } else {
        const info = await res.json();
        const { error } = await supabase.from('mt5_account_info').upsert({
          account_id: accountId,
          balance: info.balance || 0,
          equity: info.equity || 0,
          margin: info.margin || 0,
          free_margin: info.freeMargin || 0,
          leverage: info.leverage || 0,
          server: info.server || null,
          broker: info.broker || null,
          currency: info.currency || 'USD',
          synced_at: new Date().toISOString(),
        }, { onConflict: 'account_id' });
        if (error) console.error('Upsert account error:', error);
        results.account = { balance: info.balance, equity: info.equity, server: info.server };
      }
    }

    // Fetch trade history (last 30 days)
    if (action === 'full' || action === 'history') {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await metaFetch(
        `${META_API_BASE}/users/current/accounts/${accountId}/history-deals/time/${startTime}/${endTime}`,
        headers
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error('MetaApi history error:', res.status, errText);
        results.history_error = `${res.status}: ${errText}`;
      } else {
        const deals = await res.json();
        const trades = Array.isArray(deals) ? deals : [];

        const positionMap = new Map<string, any[]>();
        for (const deal of trades) {
          if (!deal.positionId) continue;
          const arr = positionMap.get(deal.positionId) || [];
          arr.push(deal);
          positionMap.set(deal.positionId, arr);
        }

        let upsertCount = 0;
        for (const [posId, posDeals] of positionMap) {
          const entryDeal = posDeals.find((d: any) => d.entryType === 'DEAL_ENTRY_IN') || posDeals[0];
          const exitDeal = posDeals.find((d: any) => d.entryType === 'DEAL_ENTRY_OUT');

          if (!entryDeal) continue;

          const totalPnl = posDeals.reduce((sum: number, d: any) => sum + (d.profit || 0), 0);
          const totalCommission = posDeals.reduce((sum: number, d: any) => sum + (d.commission || 0), 0);
          const totalSwap = posDeals.reduce((sum: number, d: any) => sum + (d.swap || 0), 0);

          const tradeData = {
            ticket: posId,
            pair: entryDeal.symbol || 'UNKNOWN',
            direction: entryDeal.type === 'DEAL_TYPE_BUY' ? 'BUY' : 'SELL',
            entry_price: entryDeal.price || 0,
            exit_price: exitDeal?.price || null,
            lot_size: entryDeal.volume || 0,
            pnl: totalPnl,
            commission: totalCommission,
            swap: totalSwap,
            open_time: entryDeal.time ? new Date(entryDeal.time).toISOString() : null,
            close_time: exitDeal?.time ? new Date(exitDeal.time).toISOString() : null,
            is_open: !exitDeal,
          };

          const { error } = await supabase.from('mt5_trades').upsert(tradeData, { onConflict: 'ticket' });
          if (error) console.error('Upsert trade error:', error);
          else upsertCount++;
        }
        results.history = { total_deals: trades.length, upserted: upsertCount };
      }
    }

    // Fetch open positions
    if (action === 'full' || action === 'positions') {
      const res = await metaFetch(
        `${META_API_BASE}/users/current/accounts/${accountId}/positions`,
        headers
      );
      if (!res.ok) {
        const errText = await res.text();
        console.error('MetaApi positions error:', res.status, errText);
        results.positions_error = `${res.status}: ${errText}`;
      } else {
        const positions = await res.json();
        const posArr = Array.isArray(positions) ? positions : [];

        await supabase.from('mt5_trades').update({ is_open: false }).eq('is_open', true);

        let upsertCount = 0;
        for (const pos of posArr) {
          const tradeData = {
            ticket: pos.id || `pos-${pos.symbol}-${Date.now()}`,
            pair: pos.symbol || 'UNKNOWN',
            direction: pos.type === 'POSITION_TYPE_BUY' ? 'BUY' : 'SELL',
            entry_price: pos.openPrice || 0,
            exit_price: pos.currentPrice || null,
            sl: pos.stopLoss || null,
            tp: pos.takeProfit || null,
            lot_size: pos.volume || 0,
            pnl: pos.profit || 0,
            swap: pos.swap || 0,
            commission: pos.commission || 0,
            open_time: pos.time ? new Date(pos.time).toISOString() : null,
            is_open: true,
          };
          const { error } = await supabase.from('mt5_trades').upsert(tradeData, { onConflict: 'ticket' });
          if (error) console.error('Upsert position error:', error);
          else upsertCount++;
        }
        results.positions = { count: posArr.length, upserted: upsertCount };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('MT5 sync error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
