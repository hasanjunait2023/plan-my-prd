import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tgBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'poll';

    // === ACTION: DEBUG — raw getUpdates ===
    if (action === 'debug') {
      const offset = body.offset || 0;
      const response = await fetch(`${tgBase}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, timeout: 2, allowed_updates: ['message'] }),
      });
      const data = await response.json();
      const resultCount = data.result?.length || 0;
      const chatIds = (data.result || [])
        .filter((u: any) => u.message)
        .map((u: any) => ({ update_id: u.update_id, chat_id: u.message.chat.id, chat_type: u.message.chat.type, has_photo: !!u.message.photo, text: u.message.text?.substring(0, 50) || u.message.caption?.substring(0, 50) || '' }));
      return new Response(JSON.stringify({ ok: data.ok, resultCount, updates: chatIds, offset }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === ACTION: POST (Web → Telegram) ===
    if (action === 'post') {
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
        year: 'numeric', month: 'long', day: 'numeric',
      });

      const text = `📝 Mind Journal — ${today}\n\n${body.content || '(image)'}\n\n#MindJournal #TradingThoughts`;

      if (body.image_url) {
        await fetch(`${tgBase}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: body.image_url,
            caption: text,
            parse_mode: 'HTML',
          }),
        });
      } else {
        await fetch(`${tgBase}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    const { data: state } = await supabase
      .from('telegram_bot_state')
      .select('update_offset')
      .eq('id', 1)
      .single();

    const offset = state?.update_offset || 0;

    const response = await fetch(`${tgBase}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

      if (String(msg.chat.id) !== String(targetChatId)) continue;

      const { data: existing } = await supabase
        .from('mind_thoughts')
        .select('id')
        .eq('telegram_message_id', msg.message_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      let imageUrl: string | null = null;
      const caption = msg.caption || msg.text || '';

      if (msg.photo && msg.photo.length > 0) {
        const largestPhoto = msg.photo[msg.photo.length - 1];
        try {
          const fileResp = await fetch(`${tgBase}/getFile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: largestPhoto.file_id }),
          });
          const fileData = await fileResp.json();
          if (fileResp.ok && fileData.result?.file_path) {
            const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
            const downloadResp = await fetch(downloadUrl);
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

      if (!caption && !imageUrl) continue;

      const msgDate = new Date(msg.date * 1000);
      const dateStr = msgDate.toISOString().split('T')[0];

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
