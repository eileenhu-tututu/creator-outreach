type SupadataTranscript = {
  content?: string | Array<{ text?: string }>;
  status?: 'queued' | 'active' | 'completed' | 'failed';
  error?: string | { message?: string };
};

const transcriptText = (data: SupadataTranscript) =>
  typeof data.content === 'string'
    ? data.content.trim()
    : Array.isArray(data.content)
      ? data.content
          .map((part) => part.text || '')
          .join(' ')
          .trim()
      : '';

export async function POST(request: Request) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Add SUPADATA_API_KEY to check transcript jobs.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  const jobId = body.jobId?.trim();
  if (!jobId) {
    return Response.json(
      { error: 'Missing transcript job ID.' },
      { status: 400 },
    );
  }

  const response = await fetch(
    `https://api.supadata.ai/v1/transcript/${encodeURIComponent(jobId)}`,
    { headers: { 'x-api-key': apiKey } },
  );
  const data = (await response.json().catch(() => ({}))) as SupadataTranscript;
  if (!response.ok) {
    return Response.json(
      { error: 'Could not check this transcript job.' },
      { status: response.status },
    );
  }

  const transcript = transcriptText(data);
  return Response.json({
    status: transcript
      ? 'ready'
      : data.status === 'failed' || data.status === 'completed'
        ? 'failed'
        : 'processing',
    transcript,
  });
}
