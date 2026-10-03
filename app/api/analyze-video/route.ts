import {
  deleteGeminiFile,
  generateGeminiJson,
  uploadGeminiVideo,
} from '@/lib/gemini';
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

const schema = {
  type: 'object',
  properties: {
    spokenTranscript: {
      type: 'string',
      description:
        'A faithful transcript of meaningful spoken words in natural order. Return an empty string when there is no speech.',
    },
    onScreenText: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Unique meaningful text visibly shown in the video. Preserve wording and reading order. Include captions, overlays, product names, labels, and text cards.',
    },
    contentType: {
      type: 'string',
      description:
        'A concise category such as review, routine, tutorial, outfit, storytime, dance-only, or trend.',
    },
    outreachValueScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Usefulness for creator-to-product matching from 0 to 100.',
    },
    isDanceOnly: { type: 'boolean' },
    creatorSignals: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Concrete preferences, problems, style traits, or recent events supported by the video.',
    },
    reason: {
      type: 'string',
      description: 'One short evidence-based explanation of the score.',
    },
  },
  required: [
    'spokenTranscript',
    'onScreenText',
    'contentType',
    'outreachValueScore',
    'isDanceOnly',
    'creatorSignals',
    'reason',
  ],
};

const prompt = `Read this short-form video carefully, including its spoken audio, fast text cards, and small overlay captions.

Transcribe meaningful spoken wording faithfully in spokenTranscript. Do not summarize it and do not invent words when the audio is unclear.

Return visible wording rather than a summary in onScreenText. Deduplicate text that persists across frames, but keep distinct sentences in their natural order. Do not copy interface chrome such as platform buttons, usernames, engagement counts, or generic TikTok/YouTube controls. Do not invent text that is not legible.

Also classify the content and judge whether it contains useful evidence for matching this creator to a product. Generic dance-only or trend-only content should score low.`;

const isYouTubeUrl = (value: string) => {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be';
  } catch {
    return false;
  }
};

const isDirectVideoUrl = (value: string) => {
  try {
    return /\.(mp4|mov|webm|m4v)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

type SupadataTranscript = {
  content?: string | Array<{ text?: string }>;
  jobId?: string;
  status?: 'queued' | 'active' | 'completed' | 'failed';
};

const supadataTranscriptText = (data: SupadataTranscript) =>
  typeof data.content === 'string'
    ? data.content.trim()
    : Array.isArray(data.content)
      ? data.content
          .map((part) => part.text || '')
          .join(' ')
          .trim()
      : '';

async function requestSupadataTranscript(url: string, apiKey: string) {
  const transcriptUrl = new URL('https://api.supadata.ai/v1/transcript');
  transcriptUrl.search = new URLSearchParams({
    url,
    lang: 'en',
    text: 'true',
    mode: 'auto',
  }).toString();
  const response = await fetch(transcriptUrl, {
    headers: { 'x-api-key': apiKey },
  });
  if (!response.ok && response.status !== 202) {
    return { transcript: '', status: 'failed' as const };
  }
  const data = (await response.json().catch(() => ({}))) as SupadataTranscript;
  const transcript = supadataTranscriptText(data);
  if (transcript) {
    return { transcript, status: 'ready' as const };
  }
  if (data.jobId) {
    return {
      transcript: '',
      status: 'processing' as const,
      jobId: data.jobId,
    };
  }
  return { transcript: '', status: 'not_found' as const };
}

const normalize = (data: VisualAnalysis) => ({
  status: 'ready' as const,
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
  provider: 'gemini',
});

export async function POST(request: Request) {
  const geminiKey = requestCredential(
    request,
    'x-demo-gemini-api-key',
    'GEMINI_API_KEY',
  );
  if (!geminiKey) {
    return Response.json(
      { error: 'Add GEMINI_API_KEY to read on-screen video text.' },
      { status: 503 },
    );
  }
  const supadataKey = requestCredential(
    request,
    'x-demo-supadata-api-key',
    'SUPADATA_API_KEY',
  );

  let uploadedName = '';
  let sourceUrl = '';
  try {
    const contentType = request.headers.get('content-type') || '';
    let videoPart:
      | {
          file_data: { file_uri: string; mime_type?: string };
          video_metadata?: { fps?: number };
        }
      | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('video');
      if (!(file instanceof File) || !file.size) {
        return Response.json(
          { error: 'Choose a video file first.' },
          { status: 400 },
        );
      }
      if (!file.type.startsWith('video/')) {
        return Response.json(
          { error: 'The selected file is not a video.' },
          { status: 400 },
        );
      }
      if (file.size > 80 * 1024 * 1024) {
        return Response.json(
          { error: 'Keep uploaded videos under 80 MB.' },
          { status: 413 },
        );
      }
      const uploaded = await uploadGeminiVideo(file, geminiKey);
      uploadedName = uploaded.name;
      videoPart = {
        file_data: {
          file_uri: uploaded.uri,
          mime_type: uploaded.mimeType,
        },
        video_metadata: { fps: 3 },
      };
    } else {
      const body = (await request.json().catch(() => ({}))) as { url?: string };
      const url = body.url?.trim() || '';
      if (!url) {
        return Response.json({ error: 'Missing video URL.' }, { status: 400 });
      }
      sourceUrl = url;
      if (!isYouTubeUrl(url) && !isDirectVideoUrl(url)) {
        return Response.json(
          {
            error:
              'TikTok page links do not expose the video file to Gemini. Upload the saved TikTok video below to read its screen text.',
            code: 'video_upload_required',
          },
          { status: 422 },
        );
      }
      videoPart = {
        file_data: {
          file_uri: url,
          ...(isDirectVideoUrl(url) ? { mime_type: 'video/mp4' } : {}),
        },
        video_metadata: { fps: 3 },
      };
    }

    let geminiResult: VisualAnalysis | null = null;
    let geminiError = '';
    try {
      geminiResult = await generateGeminiJson<VisualAnalysis>({
        parts: [videoPart, { text: prompt }],
        schema,
        apiKey: geminiKey,
      });
    } catch (error) {
      geminiError =
        error instanceof Error
          ? error.message
          : 'Gemini video analysis failed.';
    }

    const gemini = geminiResult
      ? normalize(geminiResult)
      : {
          status: 'ready' as const,
          spokenTranscript: '',
          visualText: [] as string[],
          contentType: '',
          qualityScore: 0,
          isDanceOnly: false,
          creatorSignals: [] as string[],
          qualityReason: '',
          provider: 'gemini',
        };
    let spokenTranscript = gemini.spokenTranscript;
    let spokenTranscriptProvider: 'gemini' | 'supadata' | 'none' =
      spokenTranscript ? 'gemini' : 'none';
    let spokenTranscriptStatus:
      | 'ready'
      | 'processing'
      | 'not_found'
      | 'failed' = spokenTranscript ? 'ready' : 'not_found';
    let transcriptJobId: string | undefined;

    if (
      !spokenTranscript &&
      sourceUrl &&
      isYouTubeUrl(sourceUrl) &&
      supadataKey
    ) {
      const fallback = await requestSupadataTranscript(sourceUrl, supadataKey);
      spokenTranscript = fallback.transcript;
      spokenTranscriptProvider =
        fallback.status === 'ready' || fallback.status === 'processing'
          ? 'supadata'
          : 'none';
      spokenTranscriptStatus = fallback.status;
      transcriptJobId = fallback.jobId;
    }

    if (!geminiResult && !spokenTranscript && !transcriptJobId) {
      throw new Error(geminiError || 'Video analysis failed.');
    }

    return Response.json({
      ...gemini,
      spokenTranscript,
      spokenTranscriptProvider,
      spokenTranscriptStatus,
      transcriptJobId,
      geminiStatus: geminiResult
        ? gemini.spokenTranscript
          ? 'ready'
          : 'ready_no_speech'
        : 'failed',
      geminiError: geminiError || undefined,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gemini video analysis failed.',
      },
      { status: 502 },
    );
  } finally {
    if (uploadedName) await deleteGeminiFile(uploadedName, geminiKey);
  }
}
