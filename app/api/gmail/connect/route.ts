const siteOrigin = process.env.SITE_URL || 'https://creator-outreach-bd.whole-sloth-5122.chatgpt.site';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Gmail OAuth is not configured yet.' }, { status: 503 });
  const state = crypto.randomUUID();
  const redirectUri = `${siteOrigin}/api/gmail/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'https://www.googleapis.com/auth/gmail.send', access_type: 'online', include_granted_scopes: 'true', state }).toString();
  return new Response(null, { status: 302, headers: { Location: authUrl.toString(), 'Set-Cookie': `gmail_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` } });
}
