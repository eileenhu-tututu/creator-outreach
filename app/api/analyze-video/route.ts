import {
  normalizeCreatorProfile,
  type CreatorProfile,
} from '@/lib/creator-profile';

type ExtractResult = {
  status?: 'queued' | 'active' | 'completed' | 'failed';
  jobId?: string;
  data?: {
    on_screen_text?: string[];
    persona?: string[];
    content_style?: string[];
    recent_events?: string[];
    preferences?: string[];
    pain_points?: string[];
    negative_constraints?: string[];
    conversation_angles?: string[];
  } & Partial<CreatorProfile>;
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
  visualText: Array.isArray(data.data?.on_screen_text)
    ? data.data.on_screen_text
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [],
  profile: normalizeCreatorProfile(data.data),
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
        'First transcribe every meaningful, clearly visible text overlay, caption, label, and product phrase into on_screen_text. Preserve the visible wording and do not summarize it. Then analyze what is visibly shown and audibly said in this creator video. Extract only claims supported by this video. Use concise paraphrases for the profile fields, never copy long transcript passages. Distinguish stable creator traits from one-off events. Put explicit dislikes, safety boundaries, brand conflicts, audience sensitivities, and things outreach should avoid in negative_constraints. conversation_angles must be natural topics a brand could mention without sounding invasive or quoting the creator. Return an empty array when evidence is missing; never guess.',
      schema: {
        type: 'object',
        properties: {
          on_screen_text: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Verbatim meaningful text visibly shown in the video, in reading order. Do not paraphrase.',
          },
          persona: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Evidence-backed creator identity, expertise, or recurring role signals.',
          },
          content_style: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Tone, format, pacing, presentation, and audience interaction style.',
          },
          recent_events: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Specific recent situations, changes, projects, trips, or life events mentioned.',
          },
          preferences: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Explicitly expressed tastes, favored products, aesthetics, routines, or formats.',
          },
          pain_points: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Problems, frustrations, unmet needs, or recurring practical difficulties.',
          },
          negative_constraints: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Explicit dislikes, boundaries, conflicts, risks, or claims outreach must avoid.',
          },
          conversation_angles: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Natural, respectful outreach topics paraphrased from supported video context.',
          },
        },
        required: [
          'on_screen_text',
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
