import mixpanel from 'mixpanel-browser';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

type ClientEnv = {
  VITE_MIXPANEL_TOKEN?: string;
  VITE_APP_VERSION?: string;
  PROD?: boolean;
  DEV?: boolean;
};

const clientEnv = (import.meta as ImportMeta & { env?: ClientEnv }).env;
let initialized = false;

const getSessionId = () => {
  const key = 'creator-outreach-analytics-session';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
};

export const initAnalytics = () => {
  if (initialized) return true;
  if (typeof window === 'undefined') return false;
  const token = clientEnv?.VITE_MIXPANEL_TOKEN?.trim();
  if (!token) return false;

  mixpanel.init(token, {
    autocapture: false,
    track_pageview: false,
    persistence: 'localStorage',
    debug: Boolean(clientEnv?.DEV),
  });
  mixpanel.register({
    session_id: getSessionId(),
    environment: clientEnv?.PROD ? 'production' : 'development',
    app_version: clientEnv?.VITE_APP_VERSION || 'mvp-mixpanel-1',
  });
  initialized = true;
  return true;
};

export const trackEvent = (
  eventName: string,
  properties: AnalyticsProperties = {},
) => {
  if (!initAnalytics()) return;
  mixpanel.track(eventName, properties);
};

export const trackAppOpened = () => {
  if (!initAnalytics()) return;
  const key = 'creator-outreach-app-opened';
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, 'true');
  mixpanel.track('app_opened');
};

export const creatorIdHash = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\/$/, '');
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `creator_${(hash >>> 0).toString(16).padStart(8, '0')}`;
};
