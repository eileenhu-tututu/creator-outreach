import {
  normalizeCreatorProfile,
  type CreatorProfile,
} from '@/lib/creator-profile';
import { generateGeminiJson, geminiApiKey } from '@/lib/gemini';

const arrayProperty = (description: string) => ({
  type: 'array',
  items: { type: 'string' },
  description,
});

const schema = {
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
};

export async function POST(request: Request) {
  if (!geminiApiKey()) {
    return Response.json(
      { error: 'Add GEMINI_API_KEY to build a structured creator profile.' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    transcript?: string;
    visualText?: string[];
  };
  const source = [
    body.title?.trim() ? `Video title: ${body.title.trim()}` : '',
    body.description?.trim()
      ? `Video description: ${body.description.trim()}`
      : '',
    body.transcript?.trim()
      ? `Spoken transcript:\n${body.transcript.trim()}`
      : '',
    body.visualText?.length
      ? `On-screen text:\n${body.visualText.filter(Boolean).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!source) {
    return Response.json(
      { error: 'Read or enter a script before building the creator profile.' },
      { status: 400 },
    );
  }

  try {
    const profile = await generateGeminiJson<Partial<CreatorProfile>>({
      parts: [
        {
          text: `This is the second analysis stage. Build a concise creator profile only from the evidence below. Never change, replace, or fabricate the original transcript or on-screen text. Distinguish stable traits from one-off events. Use paraphrases, return empty arrays when evidence is missing, and never guess. conversation_angles must be respectful topics a brand can naturally mention. negative_constraints must capture explicit dislikes, boundaries, conflicts, risks, and claims outreach should avoid.\n\n${source}`,
        },
      ],
      schema,
    });
    return Response.json({
      status: 'ready',
      profile: normalizeCreatorProfile(profile),
      provider: 'gemini',
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gemini structured analysis failed.',
      },
      { status: 502 },
    );
  }
}
