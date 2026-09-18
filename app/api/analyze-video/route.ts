type ExtractResult = {
  status?: 'queued' | 'active' | 'completed' | 'failed';
  jobId?: string;
  data?: {
    onScreenText?: string[];
    contentType?: string;
    outreachValueScore?: number;
    isDanceOnly?: boolean;
    creatorSignals?: string[];
    reason?: string;
  };
  error?: string | { message?: string };
};

const baseUrl = 'https://api.supadata.ai/v1/extract';

const normalizedResult = (data: ExtractResult) => ({
  status:
    data.status === 'completed'
      ? 'ready'
      : data.status === 'failed'
        ? 'failed'
        : 'processing',
  jobId: data.jobId,
  visualText: data.data?.onScreenText || [],
  contentType: data.data?.contentType || '',
  qualityScore: Math.max(
    0,
    Math.min(100, Math.round(data.data?.outreachValueScore || 0)),
  ),
  isDanceOnly: Boolean(data.data?.isDanceOnly),
  creatorSignals: data.data?.creatorSignals || [],
  qualityReason: data.data?.reason || '',
});

export async function POST(request: Request) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Add SUPADATA_API_KEY to read on-screen video text.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    jobId?: string;
  };

  if (body.jobId?.trim()) {
    const response = await fetch(
      `${baseUrl}/${encodeURIComponent(body.jobId.trim())}`,
      { headers: { 'x-api-key': apiKey } },
    );
    const data = (await response.json().catch(() => ({}))) as ExtractResult;
    if (!response.ok) {
      return Response.json(
        { error: 'Could not check the visual analysis job.' },
        { status: response.status },
      );
    }
    return Response.json(normalizedResult({ ...data, jobId: body.jobId }));
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: 'Missing video URL.' }, { status: 400 });
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url,
      prompt:
        'Read meaningful on-screen captions, overlay text, product references, personal context, preferences, problems, and opinions. Judge whether this video is useful for matching a creator to a product. Do not invent text that is not clearly visible. Dance-only or generic trend videos should receive a low outreach value score.',
      schema: {
        type: 'object',
        properties: {
          onScreenText: {
            type: 'array',
            items: { type: 'string' },
            description: 'Unique, meaningful text visibly shown in the video.',
          },
          contentType: {
            type: 'string',
            description:
              'Concise content category such as review, routine, tutorial, outfit, storytime, dance-only, or trend.',
          },
          outreachValueScore: {
            type: 'number',
            description: '0-100 usefulness for creator-to-product matching.',
          },
          isDanceOnly: { type: 'boolean' },
          creatorSignals: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Concrete preferences, problems, style traits, or recent events evidenced in the video.',
          },
          reason: {
            type: 'string',
            description: 'One short explanation of the score.',
          },
        },
        required: [
          'onScreenText',
          'contentType',
          'outreachValueScore',
          'isDanceOnly',
          'creatorSignals',
          'reason',
        ],
      },
    }),
  });
  const data = (await response.json().catch(() => ({}))) as ExtractResult;
  if (!response.ok) {
    const providerMessage =
      typeof data.error === 'string' ? data.error : data.error?.message;
    return Response.json(
      {
        error: providerMessage || 'Supadata could not start visual analysis.',
      },
      { status: response.status },
    );
  }

  return Response.json({
    status: 'processing',
    jobId: data.jobId,
  });
}
