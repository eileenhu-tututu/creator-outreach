import {
  normalizeCreatorProfile,
  type CreatorProfile,
} from '@/lib/creator-profile';

type ExtractResult = {
  status?: 'queued' | 'active' | 'completed' | 'failed';
  jobId?: string;
  data?: Partial<CreatorProfile>;
  error?: string | { message?: string };
};

const baseUrl = 'https://api.supadata.ai/v1/extract';

const errorMessage = (error: ExtractResult['error']) =>
  typeof error === 'string' ? error : error?.message || '';

const normalizedResult = (data: ExtractResult) => ({
  status:
    data.status === 'completed'
      ? 'ready'
      : data.status === 'failed'
        ? 'failed'
        : 'processing',
  jobId: data.jobId,
  profile: normalizeCreatorProfile(data.data),
  error: errorMessage(data.error),
});

export async function POST(request: Request) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Add SUPADATA_API_KEY to build a structured creator profile.' },
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
        {
          error:
            errorMessage(data.error) ||
            'Could not check the structured analysis job.',
        },
        { status: response.status },
      );
    }
    return Response.json(normalizedResult({ ...data, jobId: body.jobId }));
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: 'Missing video URL.' }, { status: 400 });
  }

  const arrayProperty = (description: string) => ({
    type: 'array',
    items: { type: 'string' },
    description,
  });
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url,
      prompt:
        'This is the second analysis stage. Build a concise creator profile from evidence in the video without changing or replacing any transcript or on-screen text. Distinguish stable traits from one-off events. Use paraphrases, return empty arrays when evidence is missing, and never guess. conversation_angles must be respectful topics a brand can naturally mention. negative_constraints must capture explicit dislikes, boundaries, conflicts, risks, and claims outreach should avoid.',
      schema: {
        type: 'object',
        properties: {
          persona: arrayProperty(
            'Evidence-backed identity, expertise, or recurring role signals.',
          ),
          content_style: arrayProperty(
            'Tone, format, pacing, presentation, and audience interaction style.',
          ),
          recent_events: arrayProperty(
            'Specific recent situations, projects, trips, or life events.',
          ),
          preferences: arrayProperty(
            'Explicit tastes, favored products, aesthetics, routines, or formats.',
          ),
          pain_points: arrayProperty(
            'Problems, frustrations, unmet needs, or practical difficulties.',
          ),
          negative_constraints: arrayProperty(
            'Explicit dislikes, boundaries, conflicts, risks, or claims to avoid.',
          ),
          conversation_angles: arrayProperty(
            'Natural, respectful, evidence-backed outreach topics.',
          ),
        },
        required: [
          'persona',
          'content_style',
          'recent_events',
          'preferences',
          'pain_points',
          'negative_constraints',
          'conversation_angles',
        ],
      },
    }),
  });
  const data = (await response.json().catch(() => ({}))) as ExtractResult;
  if (!response.ok) {
    const providerMessage = errorMessage(data.error);
    return Response.json(
      { error: providerMessage || 'Could not start structured analysis.' },
      { status: response.status },
    );
  }

  return Response.json({ status: 'processing', jobId: data.jobId });
}
