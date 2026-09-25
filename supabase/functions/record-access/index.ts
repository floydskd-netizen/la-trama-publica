import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function firstHeader(req: Request, names: string[]) {
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) return value.split(',')[0].trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401, headers: cors });
  const body = await req.json().catch(() => ({}));
  const eventType = ['login','comment','report','session'].includes(body.event_type) ? body.event_type : 'session';
  const ip = firstHeader(req, ['cf-connecting-ip','x-forwarded-for','x-real-ip']);
  const country = firstHeader(req, ['cf-ipcountry','x-vercel-ip-country','x-nf-country']);
  const region = firstHeader(req, ['x-vercel-ip-country-region','x-nf-region']);
  const city = firstHeader(req, ['x-vercel-ip-city','x-nf-city']);
  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin.from('access_events').insert({
    user_id: user.id,
    event_type: eventType,
    ip,
    user_agent: req.headers.get('user-agent'),
    device_class: body.device_class || null,
    browser: body.browser || null,
    os: body.os || null,
    referrer: body.referrer || null,
    locale: body.locale || null,
    timezone: body.timezone || null,
    screen_width: Number.isFinite(body.screen_width) ? body.screen_width : null,
    screen_height: Number.isFinite(body.screen_height) ? body.screen_height : null,
    country, region, city,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});