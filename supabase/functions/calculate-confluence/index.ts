import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SESSIONS = {
  tokyo: { start: 1, end: 9, label: 'Tokyo' },
  london: { start: 7, end: 16, label: 'London' },
  newyork: { start: 12, end: 21, label: 'New York' },
};

function getActiveSessions(): { names: string[]; isOverlap: boolean } {
  const utcHour = new Date().getUTCHours();
  const active: string[] = [];
  for (const [, s] of Object.entries(SESSIONS)) {
    if (s.start <= s.end) {
      if (utcHour >= s.start && utcHour < s.end) active.push(s.label);
    } else {
      if (utcHour >= s.start || utcHour < s.end) active.push(s.label);
    }
  }
  return { names: active, isOverlap: active.length >= 2 };
}

function calculateGrade(strengthDiff: number, emaScore: number, sessionActive: boolean): string {
  if (strengthDiff >= 5 && emaScore >= 8 && sessionActive) return 'A+';
  if (strengthDiff >= 4 && emaScore >= 7 && sessionActive) return 'A';
  if (strengthDiff >= 3 && emaScore >= 6) return 'B';
  if (strengthDiff >= 2 && emaScore >= 4) return 'C';
  return 'D';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get latest currency strength
    const { data: strengthData } = await sb
      .from('currency_strength')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (!strengthData || strengthData.length === 0) {
      return new Response(JSON.stringify({ error: 'No strength data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get latest strength per currency
    const latestTime = strengthData[0].recorded_at;
    const latestStrength = strengthData.filter(d => d.recorded_at === latestTime);
    const strengthMap = new Map<string, number>();
    for (const s of latestStrength) {
      strengthMap.set(s.currency, s.strength);
    }

    // Get latest EMA alignments
    const { data: emaData } = await sb
      .from('ema_alignments')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(200);

    if (!emaData || emaData.length === 0) {
      return new Response(JSON.stringify({ error: 'No EMA data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const latestBatch = emaData[0].scan_batch_id;
    const batchAlignments = emaData.filter(d => d.scan_batch_id === latestBatch);

    // Build EMA scores per pair
    const emaScoreMap = new Map<string, { score: number; direction: string }>();
    const pairRows = new Map<string, typeof batchAlignments>();
    for (const a of batchAlignments) {
      const existing = pairRows.get(a.pair) || [];
      existing.push(a);
      pairRows.set(a.pair, existing);
    }

    for (const [pair, rows] of pairRows) {
      const mainDir = rows.find(r => r.direction !== 'NONE')?.direction || 'NONE';
      const isBuy = mainDir === 'BUY';
      let score = 0;
      for (const row of rows) {
        const p = Number(row.current_price);
        const e9 = Number(row.ema_9);
        const e15 = Number(row.ema_15);
        const e200 = Number(row.ema_200);
        if (isBuy) {
          if (p > e9) score++;
          if (e9 > e15) score++;
          if (e15 > e200) score++;
        } else {
          if (p < e9) score++;
          if (e9 < e15) score++;
          if (e15 < e200) score++;
        }
      }
      emaScoreMap.set(pair, { score, direction: mainDir });
    }

    const sessions = getActiveSessions();
    const sessionActive = sessions.names.length > 0;

    // Delete old scores
    await sb.from('confluence_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Calculate and insert
    const scores = [];
    for (const [pair, emaInfo] of emaScoreMap) {
      const parts = pair.split('/');
      const baseCur = parts[0];
      const quoteCur = parts[1];
      const baseStr = strengthMap.get(baseCur) || 0;
      const quoteStr = strengthMap.get(quoteCur) || 0;
      const diff = Math.abs(baseStr - quoteStr);

      const grade = calculateGrade(diff, emaInfo.score, sessionActive);

      scores.push({
        pair,
        grade,
        strength_diff: diff,
        ema_score: emaInfo.score,
        session_active: sessionActive,
        active_session: sessions.names.join(', ') || null,
        direction: emaInfo.direction,
        base_currency: baseCur,
        quote_currency: quoteCur,
      });
    }

    if (scores.length > 0) {
      await sb.from('confluence_scores').insert(scores);
    }

    return new Response(JSON.stringify({ success: true, scores_count: scores.length, sessions: sessions.names }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
