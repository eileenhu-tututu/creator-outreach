type GeminiPart =
  | { text: string }
  | {
      file_data: { file_uri: string; mime_type?: string };
      video_metadata?: { fps?: number };
    };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
};

const apiRoot = 'https://generativelanguage.googleapis.com/v1beta';

export const geminiApiKey = () => process.env.GEMINI_API_KEY?.trim() || '';

const geminiModel = () =>
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

const responseText = (data: GeminiResponse) =>
  data.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim() || '';

export async function generateGeminiJson<T>({
  parts,
  schema,
}: {
  parts: GeminiPart[];
  schema: Record<string, unknown>;
}): Promise<T> {
  const key = geminiApiKey();
  if (!key) throw new Error('Add GEMINI_API_KEY to enable video analysis.');

  const response = await fetch(
    `${apiRoot}/models/${encodeURIComponent(geminiModel())}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1,
        },
      }),
    },
  );
  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gemini video analysis failed.');
  }

  const text = responseText(data);
  if (!text) {
    throw new Error(
      data.promptFeedback?.blockReason
        ? `Gemini blocked this video: ${data.promptFeedback.blockReason}.`
        : 'Gemini returned no analysis for this video.',
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Gemini returned an unreadable analysis result.');
  }
}

type GeminiFileResponse = {
  file?: {
    name?: string;
    uri?: string;
    mimeType?: string;
    state?: string;
    error?: { message?: string };
  };
  error?: { message?: string };
};

export async function uploadGeminiVideo(file: File) {
  const key = geminiApiKey();
  if (!key) throw new Error('Add GEMINI_API_KEY to enable video analysis.');

  const mimeType = file.type || 'video/mp4';
  const start = await fetch(
    'https://generativelanguage.googleapis.com/upload/v1beta/files',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(file.size),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: file.name || 'video' } }),
    },
  );
  if (!start.ok) {
    const data = (await start.json().catch(() => ({}))) as GeminiFileResponse;
    throw new Error(data.error?.message || 'Could not start the video upload.');
  }

  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini did not return a video upload URL.');

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(file.size),
      'Content-Type': mimeType,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: file,
  });
  let data = (await upload.json().catch(() => ({}))) as GeminiFileResponse;
  if (!upload.ok || !data.file?.name) {
    throw new Error(
      data.error?.message || 'Gemini could not upload this video.',
    );
  }
  const fileName = data.file.name;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (data.file?.state === 'ACTIVE' && data.file.name && data.file.uri) {
      return {
        name: data.file.name,
        uri: data.file.uri,
        mimeType: data.file.mimeType || mimeType,
      };
    }
    if (data.file?.state === 'FAILED') {
      throw new Error(
        data.file.error?.message || 'Gemini could not process this video.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const status = await fetch(`${apiRoot}/${fileName}`, {
      headers: { 'x-goog-api-key': key },
    });
    data = (await status.json().catch(() => ({}))) as GeminiFileResponse;
    if (!status.ok) {
      throw new Error(
        data.error?.message || 'Could not check the video upload.',
      );
    }
  }

  throw new Error('Gemini is still processing this video. Try again shortly.');
}

export async function deleteGeminiFile(name: string) {
  const key = geminiApiKey();
  if (!key || !name) return;
  await fetch(`${apiRoot}/${name}`, {
    method: 'DELETE',
    headers: { 'x-goog-api-key': key },
  }).catch(() => undefined);
}
