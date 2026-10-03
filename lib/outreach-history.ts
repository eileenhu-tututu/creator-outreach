export const outreachHistoryStorageKey = 'creator-outreach-history';
export const noReplyWaitDays = 7;

export type OutreachChannel =
  | 'TikTok DM'
  | 'Instagram DM'
  | 'WhatsApp'
  | 'Email'
  | 'Other';

export type ReplyStatus =
  | 'pending'
  | 'no_reply'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'collaboration_started';

export type OutreachHistoryItem = {
  id: string;
  createdAt: string;
  username: string;
  product: string;
  score: number;
  hook: string;
  dm: string;
  subject: string;
  email: string;
  sentAt?: string;
  sentChannel?: OutreachChannel;
  replyStatus?: ReplyStatus;
  replyRecordedAt?: string;
};

export const replyStatusLabels: Record<ReplyStatus, string> = {
  pending: 'Pending',
  no_reply: 'No reply',
  positive: 'Replied — Positive',
  neutral: 'Replied — Neutral',
  negative: 'Replied — Negative',
  collaboration_started: 'Collaboration started',
};

export const readOutreachHistory = (): OutreachHistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(
      window.localStorage.getItem(outreachHistoryStorageKey) || '[]',
    ) as OutreachHistoryItem[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const writeOutreachHistory = (items: OutreachHistoryItem[]) => {
  window.localStorage.setItem(
    outreachHistoryStorageKey,
    JSON.stringify(items.slice(0, 50)),
  );
};

export const updateOutreachHistoryItem = (
  id: string,
  patch: Partial<OutreachHistoryItem>,
) => {
  const next = readOutreachHistory().map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
  writeOutreachHistory(next);
  return next;
};

export const noReplyAvailability = (sentAt?: string, now = Date.now()) => {
  if (!sentAt) return { eligible: false, daysRemaining: noReplyWaitDays };
  const sentTime = new Date(sentAt).getTime();
  if (!Number.isFinite(sentTime)) {
    return { eligible: false, daysRemaining: noReplyWaitDays };
  }
  const remaining = sentTime + noReplyWaitDays * 86_400_000 - now;
  return {
    eligible: remaining <= 0,
    daysRemaining: Math.max(0, Math.ceil(remaining / 86_400_000)),
  };
};
