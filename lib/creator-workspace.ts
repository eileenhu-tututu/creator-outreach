import type { ConversationAngle } from '@/lib/conversation-angles';
import type { CreatorProfile } from '@/lib/creator-profile';
import type { ProductMatch } from '@/lib/products';

export type CollectionSource = 'youtube-shorts' | 'tiktok';

export type CollectedVideo = {
  id: string;
  platform: CollectionSource;
  title: string;
  publishedAt?: string;
  thumbnail?: string;
  url: string;
  transcript?: string;
  status: 'ready' | 'processing' | 'failed';
  jobId?: string;
  description?: string;
  qualityScore: number;
  qualityLabel: 'strong' | 'review' | 'skip';
  qualityReason: string;
  visualText?: string[];
  creatorSignals?: string[];
  contentType?: string;
  structuredProfile?: CreatorProfile;
  visualStatus?: 'idle' | 'processing' | 'ready' | 'failed';
  visualJobId?: string;
  visualError?: string;
  structureStatus?: 'idle' | 'processing' | 'ready' | 'failed';
  structureJobId?: string;
};

export type OutreachResult = {
  score: number;
  hook: string;
  source: string;
  evidence: string;
  reason: string;
  dm: string;
  subject: string;
  email: string;
  persona: string[];
};

export type CreatorWorkspaceSnapshot = {
  version: 1;
  savedAt: string;
  username: string;
  bio: string;
  collectionSource: CollectionSource;
  collectionInput: string;
  collectedVideos: CollectedVideo[];
  selectedVideoIds: string[];
  transcripts: string[];
  conversationAngles: ConversationAngle[];
  selectedAngleId: string;
  angleSignature: string;
  productMatches: ProductMatch[];
  selectedProductId: string | null;
  matchSignature: string;
  product: string;
  description: string;
  features: string[];
  commission: string;
  freeSample: boolean;
  result: OutreachResult | null;
  activeHistoryId: string | null;
  activeSentAt: string | null;
};

type ArchivedWorkspace = {
  id: string;
  snapshot: CreatorWorkspaceSnapshot;
};

const currentWorkspaceKey = 'creator-outreach-current-workspace';
const archivedWorkspacesKey = 'creator-outreach-workspaces';
const maximumArchivedWorkspaces = 8;

const validSnapshot = (value: unknown): value is CreatorWorkspaceSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<CreatorWorkspaceSnapshot>;
  return (
    snapshot.version === 1 &&
    typeof snapshot.username === 'string' &&
    Array.isArray(snapshot.collectedVideos) &&
    Array.isArray(snapshot.selectedVideoIds) &&
    Array.isArray(snapshot.transcripts)
  );
};

export const readCurrentWorkspace = () => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(currentWorkspaceKey) || 'null',
    ) as unknown;
    return validSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeCurrentWorkspace = (snapshot: CreatorWorkspaceSnapshot) => {
  try {
    window.localStorage.setItem(currentWorkspaceKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
};

const readArchivedWorkspaces = (): ArchivedWorkspace[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(archivedWorkspacesKey) || '[]',
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ArchivedWorkspace =>
      Boolean(
        item &&
        typeof item === 'object' &&
        typeof (item as ArchivedWorkspace).id === 'string' &&
        validSnapshot((item as ArchivedWorkspace).snapshot),
      ),
    );
  } catch {
    return [];
  }
};

export const archiveCreatorWorkspace = (
  snapshot: CreatorWorkspaceSnapshot,
  id = crypto.randomUUID(),
) => {
  const next = [
    { id, snapshot },
    ...readArchivedWorkspaces().filter((item) => item.id !== id),
  ].slice(0, maximumArchivedWorkspaces);
  try {
    window.localStorage.setItem(archivedWorkspacesKey, JSON.stringify(next));
    return id;
  } catch {
    return null;
  }
};

export const readArchivedWorkspace = (id?: string) => {
  if (!id) return null;
  return (
    readArchivedWorkspaces().find((item) => item.id === id)?.snapshot || null
  );
};
