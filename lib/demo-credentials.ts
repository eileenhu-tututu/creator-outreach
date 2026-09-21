export type DemoCredentials = {
  youtubeApiKey: string;
  supadataApiKey: string;
  geminiApiKey: string;
};

export const emptyDemoCredentials: DemoCredentials = {
  youtubeApiKey: '',
  supadataApiKey: '',
  geminiApiKey: '',
};

const storageKey = 'creator-outreach-demo-credentials';

export const readDemoCredentials = (): DemoCredentials => {
  if (typeof window === 'undefined') return emptyDemoCredentials;
  try {
    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) return emptyDemoCredentials;
    const value = JSON.parse(saved) as Partial<DemoCredentials>;
    return {
      youtubeApiKey: value.youtubeApiKey?.trim() || '',
      supadataApiKey: value.supadataApiKey?.trim() || '',
      geminiApiKey: value.geminiApiKey?.trim() || '',
    };
  } catch {
    return emptyDemoCredentials;
  }
};

export const saveDemoCredentials = (credentials: DemoCredentials) => {
  const normalized = {
    youtubeApiKey: credentials.youtubeApiKey.trim(),
    supadataApiKey: credentials.supadataApiKey.trim(),
    geminiApiKey: credentials.geminiApiKey.trim(),
  };
  window.sessionStorage.setItem(storageKey, JSON.stringify(normalized));
  window.dispatchEvent(new Event('demo-credentials-changed'));
  return normalized;
};

export const clearDemoCredentials = () => {
  window.sessionStorage.removeItem(storageKey);
  window.dispatchEvent(new Event('demo-credentials-changed'));
};

export const demoCredentialHeaders = (): Record<string, string> => {
  const credentials = readDemoCredentials();
  return {
    ...(credentials.youtubeApiKey
      ? { 'x-demo-youtube-api-key': credentials.youtubeApiKey }
      : {}),
    ...(credentials.supadataApiKey
      ? { 'x-demo-supadata-api-key': credentials.supadataApiKey }
      : {}),
    ...(credentials.geminiApiKey
      ? { 'x-demo-gemini-api-key': credentials.geminiApiKey }
      : {}),
  };
};

export const configuredCredentialCount = (credentials: DemoCredentials) =>
  Object.values(credentials).filter((value) => value.trim()).length;
