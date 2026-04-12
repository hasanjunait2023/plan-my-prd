import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---- Base64url helpers ----
function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
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

// ---- VAPID JWT ----
async function createVapidAuthHeader(
  audience: string,
  subject: string,
  publicKey: string,
  privateKeyBase64url: string,
): Promise<{ authorization: string }> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const encodedHeader = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKeyRaw = base64urlToUint8Array(privateKeyBase64url);
  const publicKeyRaw = base64urlToUint8Array(publicKey);

  // Build PKCS8 wrapper
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);

  const pkcs8 = new Uint8Array(pkcs8Header.length + privateKeyRaw.length + pkcs8Footer.length + publicKeyRaw.length);
  pkcs8.set(pkcs8Header, 0);
  pkcs8.set(privateKeyRaw, pkcs8Header.length);
  pkcs8.set(pkcs8Footer, pkcs8Header.length + privateKeyRaw.length);
  pkcs8.set(publicKeyRaw, pkcs8Header.length + privateKeyRaw.length + pkcs8Footer.length);

  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsignedToken)));

  return { authorization: `vapid t=${unsignedToken}.${uint8ArrayToBase64url(signature)}, k=${publicKey}` };
}

// ---- RFC 8291 Web Push Encryption (aes128gcm) ----

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

async function hkdfExpand(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  // Extract
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));

  // Expand
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));

  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);

  // "Content-Encoding: <type>\0" + "P-256\0" + len(client) + client + len(server) + server
  const header = encoder.encode('Content-Encoding: ');
  const nul = new Uint8Array([0]);
  const p256 = encoder.encode('P-256');

  const clientLen = new Uint8Array(2);
  new DataView(clientLen.buffer).setUint16(0, clientPublicKey.length);
  const serverLen = new Uint8Array(2);
  new DataView(serverLen.buffer).setUint16(0, serverPublicKey.length);

  return concat(header, typeBytes, nul, p256, nul, clientLen, clientPublicKey, serverLen, serverPublicKey);
}

async function encryptPayload(
  plaintext: Uint8Array,
  subscriptionPublicKey: Uint8Array,
  authSecret: Uint8Array,
): Promise<{ ciphertext: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  // Import subscriber's public key
  const clientKey = await crypto.subtle.importKey('raw', subscriptionPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeys.privateKey, 256));

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM using auth secret (RFC 8291 section 3.3)
  const authInfo = concat(new TextEncoder().encode('WebPush: info\0'), subscriptionPublicKey, serverPublicKeyRaw);
  const ikm = await hkdfExpand(sharedSecret, authSecret, authInfo, 32);

  // Derive content encryption key and nonce
  const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aes128gcm\0'));
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'));

  const cek = await hkdfExpand(ikm, salt, cekInfo, 16);
  const nonce = await hkdfExpand(ikm, salt, nonceInfo, 12);

  // Pad plaintext: add delimiter byte 0x02 (last record)
  const paddedPlaintext = concat(plaintext, new Uint8Array([2]));

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext));

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([65]); // uncompressed P-256 key length

  const header = concat(salt, rs, idlen, serverPublicKeyRaw);
  const body = concat(header, encrypted);

  return { ciphertext: body, serverPublicKey: serverPublicKeyRaw, salt };
}

// ---- Main handler ----
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { title, body, tag, url } = await req.json();
    console.log(`Push request: title="${title}", body="${body?.substring(0, 50)}...", tag="${tag}", url="${url}"`);

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

    const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('*');

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

        // Prepare payload
        const pushPayload = JSON.stringify({
          title: title || '🔔 TradeVault Pro',
          body: body || 'New notification',
          tag: tag || 'general',
          url: url || '/',
        });
        const plaintextBytes = new TextEncoder().encode(pushPayload);

        // Encrypt payload using subscriber's p256dh and auth keys
        const clientPublicKey = base64urlToUint8Array(sub.p256dh);
        const authSecret = base64urlToUint8Array(sub.auth);

        const { ciphertext } = await encryptPayload(plaintextBytes, clientPublicKey, authSecret);

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': vapidHeaders.authorization,
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(ciphertext.length),
            'TTL': '86400',
            'Urgency': 'high',
          },
          body: ciphertext,
        });

        if (res.status === 201 || res.status === 200) {
          sent++;
          console.log(`Push sent to sub ${sub.id}`);
        } else if (res.status === 404 || res.status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          console.log(`Removed expired subscription: ${sub.id}`);
          failed++;
        } else {
          const errText = await res.text();
          console.log(`Push failed for ${sub.id}: ${res.status} ${errText}`);
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
