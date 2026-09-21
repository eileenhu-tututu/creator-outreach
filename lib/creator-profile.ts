import type { ConversationAngle } from '@/lib/conversation-angles';

export const creatorProfileKeys = [
  'persona',
  'content_style',
  'recent_events',
  'preferences',
  'pain_points',
  'negative_constraints',
  'conversation_angles',
] as const;

export type CreatorProfile = Record<
  (typeof creatorProfileKeys)[number],
  string[]
>;

export const emptyCreatorProfile = (): CreatorProfile => ({
  persona: [],
  content_style: [],
  recent_events: [],
  preferences: [],
  pain_points: [],
  negative_constraints: [],
  conversation_angles: [],
});

const cleanItems = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : [];

export function normalizeCreatorProfile(value: unknown): CreatorProfile {
  const input =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    creatorProfileKeys.map((key) => [key, cleanItems(input[key])]),
  ) as CreatorProfile;
}

export function mergeCreatorProfiles(
  profiles: CreatorProfile[],
): CreatorProfile {
  const merged = emptyCreatorProfile();
  for (const profile of profiles) {
    for (const key of creatorProfileKeys) {
      merged[key] = [...new Set([...merged[key], ...profile[key]])].slice(
        0,
        12,
      );
    }
  }
  return merged;
}

export const hasCreatorProfileData = (profile: CreatorProfile) =>
  creatorProfileKeys.some((key) => profile[key].length > 0);

export const creatorProfileText = (profile: CreatorProfile) =>
  creatorProfileKeys
    .filter((key) => key !== 'negative_constraints')
    .flatMap((key) =>
      profile[key].map((item) => `${key.replaceAll('_', ' ')}: ${item}`),
    )
    .join('\n');

export function profileConversationAngles(
  profile: CreatorProfile,
): ConversationAngle[] {
  return profile.conversation_angles.slice(0, 8).map((angle, index) => ({
    id: `structured-angle-${index}`,
    title: angle.length > 58 ? `${angle.slice(0, 55)}…` : angle,
    dmLead: angle.charAt(0).toLowerCase() + angle.slice(1),
    summary: angle,
    whyItWorks:
      'Extracted from the selected videos as an evidence-backed conversation opportunity.',
    sourceCount: 1,
  }));
}
