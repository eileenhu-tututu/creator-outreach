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
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
  };
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
};

const supadataBase = 'https://api.supadata.ai/v1';
const sevenDays = 7 * 24 * 60 * 60 * 1000;

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

async function collectYouTubeShorts(
  input: string,
  maxVideos: number,
  youtubeKey: string,
  supadataKey: string,
) {
  const yt = 'https://www.googleapis.com/youtube/v3';
  const searchUrl = new URL(`${yt}/search`);
  searchUrl.search = new URLSearchParams({
    part: 'snippet',
    q: input,
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
  const channelId = match?.id.channelId;
  if (!channelId) {
    return Response.json(
      {
        error: 'channel_not_found',
        message: 'No matching YouTube channel was found.',
      },
      { status: 404 },
    );
  }

  const listUrl = new URL(`${supadataBase}/youtube/channel/videos`);
  listUrl.search = new URLSearchParams({
    id: channelId,
    type: 'short',
    limit: '12',
  }).toString();
  const listResponse = await fetch(listUrl, {
    headers: { 'x-api-key': supadataKey },
  });
  if (!listResponse.ok) return providerError(listResponse, 'Supadata');
  const listData = (await listResponse.json()) as { shortIds?: string[] };
  const shortIds = (listData.shortIds || []).slice(0, 12);

  if (!shortIds.length) {
    return Response.json({
      source: 'youtube-shorts',
      channel: {
        id: channelId,
        title: match.snippet.title,
        avatar:
          match.snippet.thumbnails?.medium?.url ||
          match.snippet.thumbnails?.default?.url,
      },
      rangeDays: 7,
      videos: [],
      message: 'No Shorts were found on this YouTube channel.',
    });
  }

  const detailsUrl = new URL(`${yt}/videos`);
  detailsUrl.search = new URLSearchParams({
    part: 'snippet',
    id: shortIds.join(','),
    key: youtubeKey,
  }).toString();
  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) return providerError(detailsResponse, 'YouTube');
  const detailsData = (await detailsResponse.json()) as {
    items?: YouTubeVideoItem[];
  };
  const since = Date.now() - sevenDays;
  const recent = (detailsData.items || [])
    .filter((video) => new Date(video.snippet.publishedAt).getTime() >= since)
    .sort(
      (left, right) =>
        new Date(right.snippet.publishedAt).getTime() -
        new Date(left.snippet.publishedAt).getTime(),
    )
    .slice(0, maxVideos);

  const videos: CollectedVideo[] = await Promise.all(
    recent.map(async (video) => {
      const url = `https://www.youtube.com/shorts/${video.id}`;
      const transcript = await fetchTranscript(url, supadataKey);
      const quality = assessContentQuality(
        transcript.transcript,
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
        url,
        ...transcript,
        ...quality,
      };
    }),
  );

  return Response.json({
    source: 'youtube-shorts',
    channel: {
      id: channelId,
      title: match.snippet.title,
      avatar:
        match.snippet.thumbnails?.medium?.url ||
        match.snippet.thumbnails?.default?.url,
    },
    rangeDays: 7,
    videos,
    message: recent.length
      ? undefined
      : 'No YouTube Shorts were published in the last 7 days.',
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
  const supadataKey = process.env.SUPADATA_API_KEY;
  if (!supadataKey) {
    return Response.json(
      {
        error: 'integration_not_configured',
        message: 'Add SUPADATA_API_KEY to enable live video transcription.',
      },
      { status: 503 },
    );
  }

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
    if (!youtubeKey) {
      return Response.json(
        {
          error: 'integration_not_configured',
          message: 'Add YOUTUBE_API_KEY to collect YouTube Shorts.',
        },
        { status: 503 },
      );
    }
    return collectYouTubeShorts(input, maxVideos, youtubeKey, supadataKey);
  }

  if (source === 'tiktok') {
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
