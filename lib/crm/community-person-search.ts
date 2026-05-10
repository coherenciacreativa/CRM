import type {
  CommunityLifecycleStage,
  CommunityNextBestAction,
  ProductFitKey,
} from './community-scoring';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityPersonChannelFilter =
  | 'email'
  | 'instagram'
  | 'whatsapp'
  | 'telegram'
  | 'omnichannel'
  | 'missing_email_with_instagram'
  | 'missing_instagram_with_email';

export type CommunityPersonSearchFilters = {
  query?: string | null;
  stage?: CommunityLifecycleStage | null;
  nextAction?: CommunityNextBestAction | null;
  channel?: CommunityPersonChannelFilter | null;
  productFit?: ProductFitKey | null;
  minProductFit?: number | null;
  minPriority?: number | null;
  requiresHumanReview?: boolean | null;
  limit?: number | null;
};

export type CommunityPersonSearchRow = {
  personId: string;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    city: string | null;
    country: string | null;
  };
  channels: {
    email: boolean;
    instagram: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  stage: CommunityLifecycleStage;
  priorityScore: number;
  commercialWarmth: number;
  communityDepth: number;
  dataConfidence: number;
  nextAction: CommunityNextBestAction;
  primaryProductFit: {
    key: ProductFitKey;
    score: number;
  };
  requiresHumanReview: boolean;
};

export type CommunityPersonSearchResult = {
  total: number;
  matched: number;
  returned: number;
  filters: Required<CommunityPersonSearchFilters>;
  people: CommunityPersonSearchRow[];
};

const PRODUCT_KEYS: ProductFitKey[] = ['yoga', 'mentorship', 'therapy', 'digitalProducts', 'retreats'];

const cleanString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const cleanNumber = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

const clampLimit = (value: number | null | undefined): number => {
  const cleaned = cleanNumber(value, 50);
  if (cleaned < 1) return 1;
  return Math.min(cleaned, 200);
};

const primaryProductFit = (card: PersonCardVNext): CommunityPersonSearchRow['primaryProductFit'] =>
  PRODUCT_KEYS.map((key) => ({ key, score: card.scoring.productFit[key] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))[0];

const cardSearchText = (card: PersonCardVNext): string =>
  normalize(
    [
      card.personId,
      card.displayName,
      card.identities.email,
      card.identities.instagramHandle,
      card.identities.phone,
      card.identities.city,
      card.identities.country,
    ]
      .filter(Boolean)
      .join(' '),
  );

const matchesQuery = (card: PersonCardVNext, query: string | null): boolean => {
  if (!query) return true;
  const haystack = cardSearchText(card);
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

const matchesChannel = (card: PersonCardVNext, channel: CommunityPersonChannelFilter | null): boolean => {
  if (!channel) return true;
  const hasEmail = card.channels.email.present;
  const hasInstagram = card.channels.instagram.present;
  switch (channel) {
    case 'email':
      return hasEmail;
    case 'instagram':
      return hasInstagram;
    case 'whatsapp':
      return card.channels.whatsapp.present;
    case 'telegram':
      return card.channels.telegram.present;
    case 'omnichannel':
      return hasEmail && hasInstagram;
    case 'missing_email_with_instagram':
      return hasInstagram && !hasEmail;
    case 'missing_instagram_with_email':
      return hasEmail && !hasInstagram;
    default:
      return true;
  }
};

const toRow = (card: PersonCardVNext): CommunityPersonSearchRow => ({
  personId: card.personId,
  displayName: card.displayName,
  identities: {
    email: card.identities.email,
    instagramHandle: card.identities.instagramHandle,
    city: card.identities.city,
    country: card.identities.country,
  },
  channels: {
    email: card.channels.email.present,
    instagram: card.channels.instagram.present,
    whatsapp: card.channels.whatsapp.present,
    telegram: card.channels.telegram.present,
  },
  stage: card.scoring.stage,
  priorityScore: card.scoring.priorityScore,
  commercialWarmth: card.scoring.commercialWarmth,
  communityDepth: card.scoring.communityDepth,
  dataConfidence: card.scoring.dataConfidence,
  nextAction: card.nextAction.code,
  primaryProductFit: primaryProductFit(card),
  requiresHumanReview: card.nextAction.requiresHumanReview,
});

export const searchCommunityPersonCards = (
  cards: PersonCardVNext[],
  filters: CommunityPersonSearchFilters = {},
): CommunityPersonSearchResult => {
  const normalizedFilters: Required<CommunityPersonSearchFilters> = {
    query: cleanString(filters.query),
    stage: filters.stage ?? null,
    nextAction: filters.nextAction ?? null,
    channel: filters.channel ?? null,
    productFit: filters.productFit ?? null,
    minProductFit: cleanNumber(filters.minProductFit, 50),
    minPriority: cleanNumber(filters.minPriority, 0),
    requiresHumanReview: filters.requiresHumanReview ?? null,
    limit: clampLimit(filters.limit),
  };

  const people = cards
    .filter((card) => matchesQuery(card, normalizedFilters.query))
    .filter((card) => (normalizedFilters.stage ? card.scoring.stage === normalizedFilters.stage : true))
    .filter((card) => (normalizedFilters.nextAction ? card.nextAction.code === normalizedFilters.nextAction : true))
    .filter((card) => matchesChannel(card, normalizedFilters.channel))
    .filter((card) =>
      normalizedFilters.productFit
        ? (card.scoring.productFit[normalizedFilters.productFit] ?? 0) >= normalizedFilters.minProductFit
        : true,
    )
    .filter((card) => card.scoring.priorityScore >= normalizedFilters.minPriority)
    .filter((card) =>
      normalizedFilters.requiresHumanReview === null
        ? true
        : card.nextAction.requiresHumanReview === normalizedFilters.requiresHumanReview,
    )
    .sort(
      (a, b) =>
        b.scoring.priorityScore - a.scoring.priorityScore
        || b.scoring.commercialWarmth - a.scoring.commercialWarmth
        || b.scoring.communityDepth - a.scoring.communityDepth
        || a.personId.localeCompare(b.personId),
    )
    .map(toRow);

  return {
    total: cards.length,
    matched: people.length,
    returned: Math.min(people.length, normalizedFilters.limit),
    filters: normalizedFilters,
    people: people.slice(0, normalizedFilters.limit),
  };
};
