import { generateGeminiJson, geminiApiKey } from '@/lib/gemini';

type CollectionSource = 'youtube-shorts' | 'tiktok';

type GoogleApiError = {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
};

type YouTubeSearchItem = {
  id: { channelId?: string };
  snippet: {
    title: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string } };
  };
};

type YouTubeVideoItem = {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: { duration?: string };
};

type YouTubeChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string } };
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

type YouTubePlaylistItem = {
  contentDetails?: { videoId?: string };
};

type SupadataTranscript = {
  content?: string | Array<{ text?: string }>;
  jobId?: string;
  status?: 'queued' | 'active' | 'completed' | 'failed';
  error?: string;
};

type SupadataMetadata = {
  url?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  publishedAt?: string;
  author?: { name?: string; id?: string; url?: string };
};

type CollectedVideo = {
  id: string;
  platform: CollectionSource;
  title: string;
  publishedAt?: string;
  thumbnail?: string;
  url: string;
  transcript: string;
  status: 'ready' | 'processing' | 'failed';
  jobId?: string;
  description?: string;
  qualityScore: number;
  qualityLabel: 'strong' | 'review' | 'skip';
  qualityReason: string;
  visualText?: string[];
  creatorSignals?: string[];
  contentType?: string;
  visualStatus?: 'ready' | 'failed';
};

const supadataBase = 'https://api.supadata.ai/v1';

const youtubeVideoId = (value: string) => {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be')
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      id =
        url.pathname.match(/^\/shorts\/([^/?]+)/)?.[1] ||
        url.searchParams.get('v') ||
        '';
    }
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
};

const youtubeChannelReference = (value: string) => {
  const input = value.trim();
  if (/^@[\w.-]+$/.test(input)) {
    return { type: 'handle' as const, value: input.slice(1) };
  }
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0]?.startsWith('@')) {
      return { type: 'handle' as const, value: segments[0].slice(1) };
    }
    if (segments[0] === 'channel' && /^UC[\w-]+$/.test(segments[1] || '')) {
      return { type: 'id' as const, value: segments[1] };
    }
    if ((segments[0] === 'c' || segments[0] === 'user') && segments[1]) {
      return { type: 'search' as const, value: segments[1] };
    }
    return null;
  } catch {
    return null;
  }
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

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function providerError(
  response: Response,
  provider: 'YouTube' | 'Supadata',
) {
  const data = (await response.json().catch(() => ({}))) as GoogleApiError & {
    message?: string;
    error?: GoogleApiError['error'] | string;
  };
  const providerMessage =
    typeof data.error === 'string'
      ? data.error
      : data.error?.message || data.message;

  if (response.status === 401 || response.status === 403) {
    return Response.json(
      {
        error: `${provider.toLowerCase()}_credentials_rejected`,
        message:
          provider === 'YouTube'
            ? 'The saved YouTube API key was rejected. Check YouTube Data API v3 in Google Cloud.'
            : 'The saved Supadata API key was rejected. Replace SUPADATA_API_KEY with an active key.',
        providerMessage,
      },
      { status: response.status },
    );
  }

  if (response.status === 429) {
    return Response.json(
      {
        error: 'provider_quota_exhausted',
        message: `${provider} rate limit or credits are exhausted. Try again later.`,
        providerMessage,
      },
      { status: 429 },
    );
  }

  return Response.json(
    {
      error: `${provider.toLowerCase()}_request_failed`,
      message: `${provider} could not complete this collection request.`,
      providerMessage,
    },
    { status: 502 },
  );
}

async function fetchTranscript(url: string, apiKey: string) {
  const transcriptUrl = new URL(`${supadataBase}/transcript`);
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

  let data = (await response.json()) as SupadataTranscript;
  let text = transcriptText(data);
  if (text) return { transcript: text, status: 'ready' as const };

  if (!data.jobId) return { transcript: '', status: 'failed' as const };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await wait(1000);
    const jobResponse = await fetch(
      `${supadataBase}/transcript/${data.jobId}`,
      {
        headers: { 'x-api-key': apiKey },
      },
    );
    if (!jobResponse.ok) break;
    data = (await jobResponse.json()) as SupadataTranscript;
    text = transcriptText(data);
    if (text || data.status === 'completed') {
      return {
        transcript: text,
        status: text ? ('ready' as const) : ('failed' as const),
        jobId: data.jobId,
      };
    }
    if (data.status === 'failed') {
      return { transcript: '', status: 'failed' as const, jobId: data.jobId };
    }
  }

  return {
    transcript: '',
    status: 'processing' as const,
    jobId: data.jobId,
  };
}

function assessContentQuality(
  transcript: string,
  title = '',
  description = '',
) {
  const combined = `${title} ${description} ${transcript}`.toLowerCase();
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const usefulSignals = [
    'review',
    'routine',
    'tutorial',
    'tip',
    'haul',
    'outfit',
    'fashion',
    'beauty',
    'skincare',
    'makeup',
    'fitness',
    'recipe',
    'home',
    'travel',
    'problem',
    'favorite',
    'recommend',
    'trying',
    'tested',
  ];
  const lowSignal = [
    'dance',
    'dancing',
    'choreography',
    'lip sync',
    'transition',
    'trend sound',
  ];
  const usefulHits = usefulSignals.filter((term) => combined.includes(term));
  const looksDanceOnly =
    lowSignal.some((term) => combined.includes(term)) && words < 25;
  let score = 20;
  if (words >= 80) score += 35;
  else if (words >= 35) score += 25;
  else if (words >= 15) score += 12;
  score += Math.min(usefulHits.length * 7, 28);
  if (/\b(i|my|me|we|our)\b/.test(transcript.toLowerCase())) score += 8;
  if (description.length >= 80) score += 8;
  if (looksDanceOnly) score -= 28;
  score = Math.max(5, Math.min(100, score));

  const qualityLabel = score >= 65 ? 'strong' : score >= 38 ? 'review' : 'skip';
  const qualityReason = looksDanceOnly
    ? 'Likely dance/transition content with little spoken product context.'
    : words < 15
      ? 'Very little spoken context. Read on-screen text before deciding.'
      : usefulHits.length
        ? `Useful creator signals: ${usefulHits.slice(0, 3).join(', ')}.`
        : 'Usable transcript, but product intent should be reviewed manually.';

  return { qualityScore: score, qualityLabel, qualityReason } as const;
}

const youtubeDurationSeconds = (duration = '') => {
  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return Number.POSITIVE_INFINITY;
  return (
    Number(match[1] || 0) * 86400 +
    Number(match[2] || 0) * 3600 +
    Number(match[3] || 0) * 60 +
    Number(match[4] || 0)
  );
};

type GeminiYouTubeResult = {
  videos?: Array<{
    index?: number;
    spokenTranscript?: string;
    onScreenText?: string[];
    contentType?: string;
    outreachValueScore?: number;
    isDanceOnly?: boolean;
    creatorSignals?: string[];
    reason?: string;
  }>;
};

async function analyzeYouTubeBatch(videos: YouTubeVideoItem[]) {
  const schema = {
    type: 'object',
    properties: {
      videos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: {
              type: 'integer',
              description: 'The one-based video number supplied in the prompt.',
            },
            spokenTranscript: {
              type: 'string',
              description:
                'A faithful transcript of meaningful spoken words. Empty when there is no speech.',
            },
            onScreenText: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Meaningful visible captions, overlays, labels, and text cards in reading order. Exclude platform interface text.',
            },
            contentType: { type: 'string' },
            outreachValueScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
            },
            isDanceOnly: { type: 'boolean' },
            creatorSignals: {
              type: 'array',
              items: { type: 'string' },
            },
            reason: { type: 'string' },
          },
          required: [
            'index',
            'spokenTranscript',
            'onScreenText',
            'contentType',
            'outreachValueScore',
            'isDanceOnly',
            'creatorSignals',
            'reason',
          ],
        },
      },
    },
    required: ['videos'],
  };

  const parts = videos.flatMap((video, index) => [
    { text: `Video ${index + 1}: ${video.snippet.title}` },
    {
      file_data: {
        file_uri: `https://www.youtube.com/shorts/${video.id}`,
      },
      video_metadata: { fps: 2 },
    },
  ]);
  parts.push({
    text: 'Analyze every numbered Short above. Keep each result tied to its one-based index. Preserve spoken wording and visible wording rather than summarizing them. Do not invent missing speech or text. Score product-matching usefulness low for generic dance-only or trend-only clips.',
  });

  return generateGeminiJson<GeminiYouTubeResult>({ parts, schema });
}

async function buildYouTubeVideos(sourceVideos: YouTubeVideoItem[]) {
  let geminiResults: GeminiYouTubeResult['videos'] = [];
  let analysisMessage = '';
  if (sourceVideos.length) {
    try {
      geminiResults = (await analyzeYouTubeBatch(sourceVideos)).videos || [];
    } catch (error) {
      analysisMessage =
        error instanceof Error
          ? `Shorts were found, but Gemini could not read them: ${error.message}`
          : 'Shorts were found, but Gemini could not read them.';
    }
  }

  const videos: CollectedVideo[] = sourceVideos.map((video, index) => {
    const analysis = geminiResults?.find(
      (item) => Number(item.index) === index + 1,
    );
    const transcript = analysis?.spokenTranscript?.trim() || '';
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(analysis?.outreachValueScore) || 0)),
    );
    const fallbackQuality = assessContentQuality(
      transcript,
      video.snippet.title,
    );
    return {
      id: video.id,
      platform: 'youtube-shorts',
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      thumbnail:
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        video.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/shorts/${video.id}`,
      transcript,
      status: analysis ? 'ready' : 'failed',
      visualText: analysis?.onScreenText || [],
      creatorSignals: analysis?.creatorSignals || [],
      contentType: analysis?.contentType || '',
      visualStatus: analysis ? 'ready' : 'failed',
      qualityScore: analysis ? score : fallbackQuality.qualityScore,
      qualityLabel: analysis?.isDanceOnly
        ? 'skip'
        : analysis
          ? score >= 65
            ? 'strong'
            : score >= 38
              ? 'review'
              : 'skip'
          : fallbackQuality.qualityLabel,
      qualityReason:
        analysis?.reason || analysisMessage || fallbackQuality.qualityReason,
    };
  });

  return { videos, analysisMessage };
}

async function collectSingleYouTubeShort(videoId: string, youtubeKey: string) {
  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailsUrl.search = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: youtubeKey,
  }).toString();
  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) return providerError(detailsResponse, 'YouTube');
  const detailsData = (await detailsResponse.json()) as {
    items?: YouTubeVideoItem[];
  };
  const video = detailsData.items?.[0];
  if (!video) {
    return Response.json(
      {
        error: 'video_not_found',
        message: 'This YouTube Short is unavailable or private.',
      },
      { status: 404 },
    );
  }

  const { videos, analysisMessage } = await buildYouTubeVideos([video]);
  return Response.json({
    source: 'youtube-shorts',
    channel: {
      id: video.snippet.channelId || '',
      title: video.snippet.channelTitle || 'YouTube creator',
    },
    sampleLimit: 1,
    videos,
    message: analysisMessage || undefined,
  });
}

async function collectYouTubeShorts(
  input: string,
  maxVideos: number,
  youtubeKey: string,
) {
  const directVideoId = youtubeVideoId(input);
  if (directVideoId) {
    return collectSingleYouTubeShort(directVideoId, youtubeKey);
  }

  const yt = 'https://www.googleapis.com/youtube/v3';
  const channelReference = youtubeChannelReference(input);
  let channelId = '';
  let channelTitle = '';
  let channelAvatar = '';

  if (channelReference?.type === 'handle' || channelReference?.type === 'id') {
    const lookupUrl = new URL(`${yt}/channels`);
    lookupUrl.search = new URLSearchParams({
      part: 'snippet',
      ...(channelReference.type === 'handle'
        ? { forHandle: channelReference.value }
        : { id: channelReference.value }),
      key: youtubeKey,
    }).toString();
    const lookupResponse = await fetch(lookupUrl);
    if (!lookupResponse.ok) return providerError(lookupResponse, 'YouTube');
    const lookupData = (await lookupResponse.json()) as {
      items?: YouTubeChannelItem[];
    };
    const channel = lookupData.items?.[0];
    channelId = channel?.id || '';
    channelTitle = channel?.snippet?.title || '';
    channelAvatar =
      channel?.snippet?.thumbnails?.medium?.url ||
      channel?.snippet?.thumbnails?.default?.url ||
      '';
  } else {
    const searchUrl = new URL(`${yt}/search`);
    searchUrl.search = new URLSearchParams({
      part: 'snippet',
      q: channelReference?.value || input,
      type: 'channel',
      maxResults: '1',
      key: youtubeKey,
    }).toString();

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return providerError(searchResponse, 'YouTube');
    const searchData = (await searchResponse.json()) as {
      items?: YouTubeSearchItem[];
    };
    const match = searchData.items?.[0];
    channelId = match?.id.channelId || '';
    channelTitle = match?.snippet.title || '';
    channelAvatar =
      match?.snippet.thumbnails?.medium?.url ||
      match?.snippet.thumbnails?.default?.url ||
      '';
  }

  if (!channelId) {
    return Response.json(
      {
        error: 'channel_not_found',
        message: 'No matching YouTube channel was found.',
      },
      { status: 404 },
    );
  }

  const channelUrl = new URL(`${yt}/channels`);
  channelUrl.search = new URLSearchParams({
    part: 'contentDetails',
    id: channelId,
    key: youtubeKey,
  }).toString();
  const channelResponse = await fetch(channelUrl);
  if (!channelResponse.ok) return providerError(channelResponse, 'YouTube');
  const channelData = (await channelResponse.json()) as {
    items?: YouTubeChannelItem[];
  };
  const uploadsPlaylist =
    channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) {
    return Response.json(
      {
        error: 'channel_uploads_unavailable',
        message: 'This channel does not expose a public uploads playlist.',
      },
      { status: 404 },
    );
  }

  const listUrl = new URL(`${yt}/playlistItems`);
  listUrl.search = new URLSearchParams({
    part: 'contentDetails',
    playlistId: uploadsPlaylist,
    maxResults: '50',
    key: youtubeKey,
  }).toString();
  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) return providerError(listResponse, 'YouTube');
  const listData = (await listResponse.json()) as {
    items?: YouTubePlaylistItem[];
  };
  const uploadedVideoIds = (listData.items || [])
    .map((item) => item.contentDetails?.videoId || '')
    .filter(Boolean);

  if (!uploadedVideoIds.length) {
    return Response.json({
      source: 'youtube-shorts',
      channel: {
        id: channelId,
        title: channelTitle,
        avatar: channelAvatar,
      },
      videos: [],
      message: 'No Shorts were found on this YouTube channel.',
    });
  }

  const detailsUrl = new URL(`${yt}/videos`);
  detailsUrl.search = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: uploadedVideoIds.join(','),
    key: youtubeKey,
  }).toString();
  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) return providerError(detailsResponse, 'YouTube');
  const detailsData = (await detailsResponse.json()) as {
    items?: YouTubeVideoItem[];
  };
  const latest = (detailsData.items || [])
    .filter(
      (video) => youtubeDurationSeconds(video.contentDetails?.duration) <= 180,
    )
    .sort(
      (left, right) =>
        new Date(right.snippet.publishedAt).getTime() -
        new Date(left.snippet.publishedAt).getTime(),
    )
    .slice(0, maxVideos);

  const { videos, analysisMessage } = await buildYouTubeVideos(latest);

  return Response.json({
    source: 'youtube-shorts',
    channel: {
      id: channelId,
      title: channelTitle,
      avatar: channelAvatar,
    },
    sampleLimit: maxVideos,
    videos,
    message: latest.length
      ? analysisMessage || undefined
      : 'No YouTube Shorts were found on this channel.',
  });
}

const tiktokUrls = (input: string) =>
  Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

const isTikTokVideoUrl = (value: string) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      (host === 'tiktok.com' || host.endsWith('.tiktok.com')) &&
      (url.pathname.includes('/video/') || host === 'vm.tiktok.com')
    );
  } catch {
    return false;
  }
};

const tiktokHandle = (value: string) => {
  try {
    return new URL(value).pathname.match(/\/(@[^/]+)/)?.[1] || 'tiktok-creator';
  } catch {
    return 'tiktok-creator';
  }
};

async function collectTikToks(
  input: string,
  maxVideos: number,
  supadataKey: string,
) {
  const urls = tiktokUrls(input);
  if (
    !urls.length ||
    urls.length > 8 ||
    urls.some((url) => !isTikTokVideoUrl(url))
  ) {
    return Response.json(
      {
        error: 'invalid_tiktok_urls',
        message:
          'Paste 1–8 public TikTok video links, separated by spaces or new lines.',
      },
      { status: 400 },
    );
  }

  const videos = await Promise.all(
    urls
      .slice(0, maxVideos)
      .map(async (url, index): Promise<CollectedVideo> => {
        const metadataUrl = new URL(`${supadataBase}/metadata`);
        metadataUrl.search = new URLSearchParams({ url }).toString();
        const [metadataResponse, transcript] = await Promise.all([
          fetch(metadataUrl, { headers: { 'x-api-key': supadataKey } }),
          fetchTranscript(url, supadataKey),
        ]);
        const metadata = metadataResponse.ok
          ? ((await metadataResponse.json()) as SupadataMetadata)
          : {};
        const id = url.match(/\/video\/(\d+)/)?.[1] || `tiktok-${index + 1}`;
        const description = metadata.description || '';
        const quality = assessContentQuality(
          transcript.transcript,
          metadata.title,
          description,
        );
        return {
          id,
          platform: 'tiktok',
          title:
            metadata.title ||
            metadata.description ||
            `TikTok video ${index + 1}`,
          publishedAt: metadata.publishedAt,
          thumbnail: metadata.thumbnail,
          url: metadata.url || url,
          description,
          ...transcript,
          ...quality,
        };
      }),
  );

  const firstUrl = urls[0];
  const creator = tiktokHandle(firstUrl);
  return Response.json({
    source: 'tiktok',
    channel: { id: creator, title: creator.replace(/^@/, '') },
    videos,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    source?: CollectionSource;
    input?: string;
    maxVideos?: number;
  };
  const source = body.source;
  const input = body.input?.trim() || '';
  const maxVideos = Math.min(Math.max(body.maxVideos || 8, 1), 8);

  if (!source || !input) {
    return Response.json(
      {
        error: 'invalid_request',
        message: 'Choose a source and enter creator content.',
      },
      { status: 400 },
    );
  }

  if (source === 'youtube-shorts') {
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeKey || !geminiApiKey()) {
      return Response.json(
        {
          error: 'integration_not_configured',
          message:
            'Add YOUTUBE_API_KEY and GEMINI_API_KEY to collect and read YouTube Shorts.',
        },
        { status: 503 },
      );
    }
    return collectYouTubeShorts(input, maxVideos, youtubeKey);
  }

  if (source === 'tiktok') {
    const supadataKey = process.env.SUPADATA_API_KEY;
    if (!supadataKey) {
      return Response.json(
        {
          error: 'integration_not_configured',
          message:
            'Add SUPADATA_API_KEY to load TikTok metadata and spoken transcripts.',
        },
        { status: 503 },
      );
    }
    return collectTikToks(input, maxVideos, supadataKey);
  }

  return Response.json(
    {
      error: 'unsupported_source',
      message: 'This content source is not supported yet.',
    },
    { status: 400 },
  );
}
