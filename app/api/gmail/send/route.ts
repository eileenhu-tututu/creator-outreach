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

type InlineImage = {
  data?: string;
  mimeType?: string;
  filename?: string;
  cid?: string;
};

function cleanHeader(value: string) {
  return value.replace(/[\r\n"]/g, '_');
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join('\r\n') || '';
}

export async function POST(request: Request) {
  const token = cookieValue(request, 'gmail_access_token');
  if (!token) return Response.json({ error: 'Connect Gmail before sending.' }, { status: 401 });
  const { to, subject, html, text, inlineImage } = (await request.json()) as {
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
    inlineImage?: InlineImage;
  };
  if (!to || !subject || !html) return Response.json({ error: 'Recipient, subject and HTML content are required.' }, { status: 400 });

  const hasInlineImage = Boolean(inlineImage?.data && inlineImage.mimeType && inlineImage.filename && inlineImage.cid);
  if (hasInlineImage) {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(inlineImage!.mimeType!) || !/^[A-Za-z0-9+/=]+$/.test(inlineImage!.data!) || inlineImage!.data!.length > 4_300_000) {
      return Response.json({ error: 'The inline image must be a PNG, JPG, GIF or WebP under 3 MB.' }, { status: 400 });
    }
  }

  const alternativeBoundary = `outreach_alternative_${crypto.randomUUID()}`;
  const alternativeParts = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text || '',
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${alternativeBoundary}--`,
  ];

  let mime: string;
  if (hasInlineImage) {
    const relatedBoundary = `outreach_related_${crypto.randomUUID()}`;
    const filename = cleanHeader(inlineImage!.filename!);
    const cid = cleanHeader(inlineImage!.cid!);
    mime = [
      `To: ${cleanHeader(to)}`,
      `Subject: ${cleanHeader(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      '',
      `--${relatedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      ...alternativeParts,
      `--${relatedBoundary}`,
      `Content-Type: ${inlineImage!.mimeType}; name="${filename}"`,
      `Content-Disposition: inline; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${cid}>`,
      `Content-Location: ${filename}`,
      '',
      wrapBase64(inlineImage!.data!),
      `--${relatedBoundary}--`,
    ].join('\r\n');
  } else {
    mime = [
      `To: ${cleanHeader(to)}`,
      `Subject: ${cleanHeader(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      ...alternativeParts,
    ].join('\r\n');
  }
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: base64Url(mime) }) });
  if (!response.ok) return Response.json({ error: 'Gmail send failed. Reconnect the account and try again.' }, { status: response.status });
  const data = (await response.json()) as { id?: string; threadId?: string };
  return Response.json({ sent: true, id: data.id, threadId: data.threadId });
}
