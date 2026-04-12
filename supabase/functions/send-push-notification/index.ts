import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push: manually construct the request using VAPID
// Deno doesn't have web-push npm lib, so we use the Web Push protocol directly

async function importVapidKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlToUint8Array(base64url);
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const raw = atob(padded);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKeyBase64url: string,
): Promise<{ authorization: string; cryptoKey: string }> {
  // Build JWT
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const encodedHeader = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKeyRaw = base64urlToUint8Array(privateKeyBase64url);
  
  // Build PKCS8 wrapper for the raw 32-byte EC private key
  // PKCS8 header for P-256 EC key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  
  const publicKeyRaw = base64urlToUint8Array(publicKey);
  const pkcs8 = new Uint8Array(pkcs8Header.length + privateKeyRaw.length + pkcs8Footer.length + publicKeyRaw.length);
  pkcs8.set(pkcs8Header, 0);
  pkcs8.set(privateKeyRaw, pkcs8Header.length);
  pkcs8.set(pkcs8Footer, pkcs8Header.length + privateKeyRaw.length);
  pkcs8.set(publicKeyRaw, pkcs8Header.length + privateKeyRaw.length + pkcs8Footer.length);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(unsignedToken),
    ),
  );

  const token = `${unsignedToken}.${uint8ArrayToBase64url(signature)}`;

  return {
    authorization: `vapid t=${token}, k=${publicKey}`,
    cryptoKey: publicKey,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { title, body, tag, url } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured, skipping push');
      return new Response(JSON.stringify({ ok: false, error: 'VAPID keys not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all push subscriptions
    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subErr || !subs || subs.length === 0) {
      console.log('No push subscriptions found');
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const endpointUrl = new URL(sub.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const vapidHeaders = await createVapidAuthHeader(
          audience,
          'mailto:spike-alerts@fxjunait.lovable.app',
          vapidPublicKey,
          vapidPrivateKey,
        );

        const pushPayload = JSON.stringify({ title, body, tag: tag || 'spike-alert', url: url || '/' });

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidHeaders.authorization,
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
          },
          body: pushPayload,
        });

        if (res.status === 201 || res.status === 200) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          // Subscription expired, remove it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          console.log(`Removed expired subscription: ${sub.id}`);
          failed++;
        } else {
          console.log(`Push failed for ${sub.id}: ${res.status} ${await res.text()}`);
          failed++;
        }
      } catch (err) {
        console.error(`Push error for sub ${sub.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send push notification error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
