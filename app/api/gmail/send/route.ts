function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get('cookie') || '';
  const value = cookies.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : undefined;
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(request: Request) {
  const token = cookieValue(request, 'gmail_access_token');
  if (!token) return Response.json({ error: 'Connect Gmail before sending.' }, { status: 401 });
  const { to, subject, html, text } = (await request.json()) as { to?: string; subject?: string; html?: string; text?: string };
  if (!to || !subject || !html) return Response.json({ error: 'Recipient, subject and HTML content are required.' }, { status: 400 });
  const boundary = `outreach_${crypto.randomUUID()}`;
  const mime = [`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', '', text || '', `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', '', html, `--${boundary}--`].join('\r\n');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: base64Url(mime) }) });
  if (!response.ok) return Response.json({ error: 'Gmail send failed. Reconnect the account and try again.' }, { status: response.status });
  const data = (await response.json()) as { id?: string; threadId?: string };
  return Response.json({ sent: true, id: data.id, threadId: data.threadId });
}
