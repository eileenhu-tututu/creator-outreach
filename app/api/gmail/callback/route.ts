const siteOrigin = process.env.SITE_URL || 'https://creator-outreach-bd.whole-sloth-5122.chatgpt.site';

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get('cookie') || '';
  return cookies.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== cookieValue(request, 'gmail_oauth_state')) return Response.json({ error: 'Invalid OAuth response.' }, { status: 400 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return Response.json({ error: 'Gmail OAuth is not configured.' }, { status: 503 });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${siteOrigin}/api/gmail/callback`, grant_type: 'authorization_code' }) });
  if (!tokenResponse.ok) return Response.json({ error: 'Could not connect Gmail.' }, { status: 502 });
  const tokens = (await tokenResponse.json()) as { access_token: string; expires_in?: number };
  return new Response(null, { status: 302, headers: { Location: `${siteOrigin}/gmail-connected`, 'Set-Cookie': `gmail_access_token=${encodeURIComponent(tokens.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${tokens.expires_in || 3600}` } });
}
