import { requestCredential } from '@/lib/server-credentials';

type VisualAnalysis = {
  spokenTranscript?: string;
  onScreenText?: string[];
  contentType?: string;
  outreachValueScore?: number;
  isDanceOnly?: boolean;
  creatorSignals?: string[];
  reason?: string;
};

type ExtractResult = {
  status?: 'queued' | 'active' | 'completed' | 'failed';
  data?: VisualAnalysis;
  error?: string | { message?: string };
};

export async function POST(request: Request) {
  const apiKey = requestCredential(
    request,
    'x-demo-supadata-api-key',
    'SUPADATA_API_KEY',
  );
  if (!apiKey) {
    return Response.json(
      { error: 'Add SUPADATA_API_KEY to check visual analysis jobs.' },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  const jobId = body.jobId?.trim();
  if (!jobId) {
    return Response.json(
      { error: 'Missing visual analysis job ID.' },
      { status: 400 },
    );
  }
  const response = await fetch(
    `https://api.supadata.ai/v1/extract/${encodeURIComponent(jobId)}`,
    { headers: { 'x-api-key': apiKey } },
  );
  const result = (await response.json().catch(() => ({}))) as ExtractResult;
  if (!response.ok) {
    return Response.json(
      { error: 'Could not check this visual analysis job.' },
      { status: response.status },
    );
  }
  if (result.status === 'queued' || result.status === 'active') {
    return Response.json({ status: 'processing' });
  }
  if (result.status === 'failed' || !result.data) {
    const message =
      typeof result.error === 'string'
        ? result.error
        : result.error?.message || 'TikTok visual analysis failed.';
    return Response.json({ status: 'failed', error: message });
  }
  const data = result.data;
  return Response.json({
    status: 'ready',
    spokenTranscript: data.spokenTranscript?.trim() || '',
    visualText: Array.isArray(data.onScreenText)
      ? data.onScreenText.filter(
          (item) => typeof item === 'string' && item.trim(),
        )
      : [],
    contentType: data.contentType?.trim() || '',
    qualityScore: Math.max(
      0,
      Math.min(100, Math.round(Number(data.outreachValueScore) || 0)),
    ),
    isDanceOnly: Boolean(data.isDanceOnly),
    creatorSignals: Array.isArray(data.creatorSignals)
      ? data.creatorSignals.filter(
          (item) => typeof item === 'string' && item.trim(),
        )
      : [],
    qualityReason: data.reason?.trim() || '',
  });
}
