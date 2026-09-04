type YouTubeSearchItem = {
  id: { channelId?: string };
  snippet: { title: string; thumbnails?: { default?: { url: string } } };
};

type PlaylistVideo = {
  snippet: {
    title: string;
    publishedAt: string;
    resourceId: { videoId: string };
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
};

export async function POST(request: Request) {
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  const transcriptKey = process.env.SUPADATA_API_KEY;
  if (!youtubeKey || !transcriptKey) {
    return Response.json(
      {
        error: 'integration_not_configured',
        message: 'Add YOUTUBE_API_KEY and SUPADATA_API_KEY to enable live collection.',
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { channel?: string; maxVideos?: number };
  const channel = body.channel?.trim();
  const maxVideos = Math.min(Math.max(body.maxVideos || 6, 1), 12);
  if (!channel) return Response.json({ error: 'Channel name is required.' }, { status: 400 });

  const yt = 'https://www.googleapis.com/youtube/v3';
  const searchUrl = new URL(`${yt}/search`);
  searchUrl.search = new URLSearchParams({ part: 'snippet', q: channel, type: 'channel', maxResults: '1', key: youtubeKey }).toString();
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) return Response.json({ error: 'YouTube channel lookup failed.' }, { status: 502 });
  const searchData = (await searchResponse.json()) as { items?: YouTubeSearchItem[] };
  const match = searchData.items?.[0];
  const channelId = match?.id.channelId;
  if (!channelId) return Response.json({ error: 'No matching YouTube channel found.' }, { status: 404 });

  const channelUrl = new URL(`${yt}/channels`);
  channelUrl.search = new URLSearchParams({ part: 'contentDetails', id: channelId, key: youtubeKey }).toString();
  const channelResponse = await fetch(channelUrl);
  const channelData = (await channelResponse.json()) as { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return Response.json({ error: 'The channel upload list is unavailable.' }, { status: 404 });

  const videosUrl = new URL(`${yt}/playlistItems`);
  videosUrl.search = new URLSearchParams({ part: 'snippet', playlistId: uploadsId, maxResults: '50', key: youtubeKey }).toString();
  const videosResponse = await fetch(videosUrl);
  if (!videosResponse.ok) return Response.json({ error: 'Could not load recent channel videos.' }, { status: 502 });
  const videosData = (await videosResponse.json()) as { items?: PlaylistVideo[] };
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (videosData.items || []).filter((item) => new Date(item.snippet.publishedAt).getTime() >= since).slice(0, maxVideos);

  const videos = await Promise.all(recent.map(async (item) => {
    const videoId = item.snippet.resourceId.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const transcriptUrl = new URL('https://api.supadata.ai/v1/transcript');
    transcriptUrl.search = new URLSearchParams({ url: videoUrl, lang: 'en', text: 'true', mode: 'auto' }).toString();
    const response = await fetch(transcriptUrl, { headers: { 'x-api-key': transcriptKey } });
    if (!response.ok) {
      return { videoId, title: item.snippet.title, publishedAt: item.snippet.publishedAt, thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url, url: videoUrl, transcript: '', status: 'failed' };
    }
    const data = (await response.json()) as { content?: string | Array<{ text?: string }>; jobId?: string };
    const transcript = typeof data.content === 'string' ? data.content : Array.isArray(data.content) ? data.content.map((part) => part.text || '').join(' ') : '';
    return { videoId, title: item.snippet.title, publishedAt: item.snippet.publishedAt, thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url, url: videoUrl, transcript, status: data.jobId ? 'processing' : transcript ? 'ready' : 'failed', jobId: data.jobId };
  }));

  return Response.json({ channel: { id: channelId, title: match.snippet.title, avatar: match.snippet.thumbnails?.default?.url }, rangeDays: 7, videos });
}
