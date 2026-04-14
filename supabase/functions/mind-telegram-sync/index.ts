import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  console.log('LOVABLE_API_KEY set:', !!LOVABLE_API_KEY);
  console.log('TELEGRAM_API_KEY set:', !!TELEGRAM_API_KEY);
  console.log('TELEGRAM_API_KEY length:', TELEGRAM_API_KEY?.length);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API keys' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'poll';

    // === ACTION: POST (Web → Telegram) ===
    if (action === 'post') {
      // Get mind_journal_chat_id from alert_settings
      const { data: settings } = await supabase
        .from('alert_settings')
        .select('mind_journal_chat_id')
        .limit(1)
        .single();

      const chatId = (settings as any)?.mind_journal_chat_id;
      if (!chatId) {
        return new Response(JSON.stringify({ skipped: true, reason: 'no mind_journal_chat_id' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const text = `📝 Mind Journal — ${today}\n\n${body.content || '(image)'}\n\n#MindJournal #TradingThoughts`;

      if (body.image_url) {
        // Send photo with caption
        await fetch(`${GATEWAY_URL}/sendPhoto`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            photo: body.image_url,
            caption: text,
            parse_mode: 'HTML',
          }),
        });
      } else {
        await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TELEGRAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true, action: 'posted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === ACTION: POLL (Telegram → DB) ===
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('mind_journal_chat_id')
      .limit(1)
      .single();

    const targetChatId = (settings as any)?.mind_journal_chat_id;
    if (!targetChatId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no mind_journal_chat_id configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get offset from telegram_bot_state (reuse existing row)
    // We'll use a separate key approach — store offset in mind_thoughts context
    // For simplicity, use getUpdates with the existing bot state offset
    const { data: state } = await supabase
      .from('telegram_bot_state')
      .select('update_offset')
      .eq('id', 1)
      .single();

    const offset = state?.update_offset || 0;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        offset,
        timeout: 5,
        allowed_updates: ['message'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates = data.result || [];
    let processed = 0;
    let newOffset = offset;

    for (const update of updates) {
      newOffset = Math.max(newOffset, update.update_id + 1);

      const msg = update.message;
      if (!msg) continue;

      // Only process messages from the target chat
      if (String(msg.chat.id) !== String(targetChatId)) continue;

      // Check for duplicate
      const { data: existing } = await supabase
        .from('mind_thoughts')
        .select('id')
        .eq('telegram_message_id', msg.message_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      let imageUrl: string | null = null;
      const caption = msg.caption || msg.text || '';

      // Handle photo
      if (msg.photo && msg.photo.length > 0) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        try {
          // Get file path
          const fileResp = await fetch(`${GATEWAY_URL}/getFile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': TELEGRAM_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: largestPhoto.file_id }),
          });

          const fileData = await fileResp.json();
          if (fileResp.ok && fileData.result?.file_path) {
            // Download file
            const downloadResp = await fetch(`${GATEWAY_URL}/file/${fileData.result.file_path}`, {
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': TELEGRAM_API_KEY,
              },
            });

            if (downloadResp.ok) {
              const fileBytes = await downloadResp.arrayBuffer();
              const fileName = `tg_${msg.message_id}_${Date.now()}.jpg`;

              const { error: uploadError } = await supabase.storage
                .from('mind-images')
                .upload(fileName, fileBytes, { contentType: 'image/jpeg' });

              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('mind-images').getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
              }
            }
          }
        } catch (err) {
          console.error('Failed to download telegram photo:', err);
        }
      }

      // Skip messages without content or photo
      if (!caption && !imageUrl) continue;

      const msgDate = new Date(msg.date * 1000);
      const dateStr = msgDate.toISOString().split('T')[0];

      // We need a user_id — get the first user from alert_settings or use a default
      // For single-user app, get the user who set up mind_journal_chat_id
      const { data: allSettings } = await supabase
        .from('account_settings')
        .select('user_id')
        .limit(1)
        .single();

      const userId = allSettings?.user_id;
      if (!userId) continue;

      await supabase.from('mind_thoughts').insert({
        user_id: userId,
        content: caption,
        image_url: imageUrl,
        source: 'telegram',
        telegram_message_id: msg.message_id,
        tags: [],
        date: dateStr,
      });

      processed++;
    }

    // Update offset
    if (newOffset > offset) {
      await supabase
        .from('telegram_bot_state')
        .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
        .eq('id', 1);
    }

    return new Response(JSON.stringify({ ok: true, processed, newOffset }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
