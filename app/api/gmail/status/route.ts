export async function GET(request: Request) {
  const connected = (request.headers.get('cookie') || '').includes('gmail_access_token=');
  return Response.json({ connected, configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) });
}
