import type {
  CommunityLifecycleStage,
  CommunityNextBestAction,
  ProductFitKey,
} from './community-scoring';
import {
  buildPersonCardsVNextFromLegacyV1Payload,
  type LegacyPersonCardsV1Payload,
} from './legacy-person-card-v1-adapter';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityInsightsOptions = {
  now?: string | Date | null;
  topLimit?: number;
};

export type CommunityPriorityPerson = {
  personId: string;
  displayName: string | null;
  stage: CommunityLifecycleStage;
  priorityScore: number;
  commercialWarmth: number;
  communityDepth: number;
  dataConfidence: number;
  nextAction: CommunityNextBestAction;
  channels: {
    email: boolean;
    instagram: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  primaryProductFit: {
    key: ProductFitKey;
    score: number;
  };
  reasonCodes: string[];
  requiresHumanReview: boolean;
};

export type CommunityInsightsSummary = {
  generatedAt: string;
  totals: {
    cards: number;
    emailPresent: number;
    instagramPresent: number;
    omnichannel: number;
    noTrustedIdentity: number;
  };
  lifecycle: Record<CommunityLifecycleStage, number>;
  nextActions: Record<CommunityNextBestAction, number>;
  priorityBands: {
    high: number;
    medium: number;
    low: number;
  };
  identityGaps: {
    missingEmailWithInstagram: number;
    missingInstagramWithEmail: number;
    lowDataConfidence: number;
  };
  averages: {
    priorityScore: number;
    commercialWarmth: number;
    communityDepth: number;
    relationshipEngagement: number;
    dataConfidence: number;
  };
  productFitCounts: Record<ProductFitKey, number>;
  topPriority: CommunityPriorityPerson[];
};

const STAGES: CommunityLifecycleStage[] = ['SEMILLA', 'GERMINADA', 'FLORECIDA', 'COSECHA'];
const NEXT_ACTIONS: CommunityNextBestAction[] = [
  'complete_profile',
  'ask_for_email',
  'human_follow_up',
  'nurture_by_email',
  'invite_to_community_space',
  'respect_suppression',
  'keep_warming',
];
const PRODUCT_KEYS: ProductFitKey[] = ['yoga', 'mentorship', 'therapy', 'digitalProducts', 'retreats'];

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const emptyRecord = <T extends string>(keys: T[]): Record<T, number> =>
  keys.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<T, number>,
  );

const average = (values: number[]): number => {
  if (!values.length) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round(sum / values.length);
};

const primaryProductFit = (card: PersonCardVNext): CommunityPriorityPerson['primaryProductFit'] => {
  return PRODUCT_KEYS.map((key) => ({ key, score: card.scoring.productFit[key] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))[0];
};

const toPriorityPerson = (card: PersonCardVNext): CommunityPriorityPerson => ({
  personId: card.personId,
  displayName: card.displayName,
  stage: card.scoring.stage,
  priorityScore: card.scoring.priorityScore,
  commercialWarmth: card.scoring.commercialWarmth,
  communityDepth: card.scoring.communityDepth,
  dataConfidence: card.scoring.dataConfidence,
  nextAction: card.nextAction.code,
  channels: {
    email: card.channels.email.present,
    instagram: card.channels.instagram.present,
    whatsapp: card.channels.whatsapp.present,
    telegram: card.channels.telegram.present,
  },
  primaryProductFit: primaryProductFit(card),
  reasonCodes: card.scoring.reasons.map((reason) => reason.code),
  requiresHumanReview: card.nextAction.requiresHumanReview,
});

export const summarizeCommunityInsights = (
  cards: PersonCardVNext[],
  options: CommunityInsightsOptions = {},
): CommunityInsightsSummary => {
  const lifecycle = emptyRecord(STAGES);
  const nextActions = emptyRecord(NEXT_ACTIONS);
  const productFitCounts = emptyRecord(PRODUCT_KEYS);
  const topLimit = options.topLimit ?? 10;

  let emailPresent = 0;
  let instagramPresent = 0;
  let omnichannel = 0;
  let noTrustedIdentity = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let missingEmailWithInstagram = 0;
  let missingInstagramWithEmail = 0;
  let lowDataConfidence = 0;

  for (const card of cards) {
    const hasEmail = card.channels.email.present;
    const hasInstagram = card.channels.instagram.present;
    if (hasEmail) emailPresent += 1;
    if (hasInstagram) instagramPresent += 1;
    if (hasEmail && hasInstagram) omnichannel += 1;
    if (!hasEmail && !hasInstagram && !card.identities.phone) noTrustedIdentity += 1;
    if (hasInstagram && !hasEmail) missingEmailWithInstagram += 1;
    if (hasEmail && !hasInstagram) missingInstagramWithEmail += 1;
    if (card.scoring.dataConfidence < 35) lowDataConfidence += 1;

    lifecycle[card.scoring.stage] += 1;
    nextActions[card.nextAction.code] += 1;

    if (card.scoring.priorityScore >= 70) high += 1;
    else if (card.scoring.priorityScore >= 45) medium += 1;
    else low += 1;

    for (const key of PRODUCT_KEYS) {
      if ((card.scoring.productFit[key] ?? 0) >= 50) productFitCounts[key] += 1;
    }
  }

  const topPriority = [...cards]
    .sort(
      (a, b) =>
        b.scoring.priorityScore - a.scoring.priorityScore
        || b.scoring.commercialWarmth - a.scoring.commercialWarmth
        || b.scoring.communityDepth - a.scoring.communityDepth
        || a.personId.localeCompare(b.personId),
    )
    .slice(0, Math.max(0, topLimit))
    .map(toPriorityPerson);

  return {
    generatedAt: isoNow(options.now),
    totals: {
      cards: cards.length,
      emailPresent,
      instagramPresent,
      omnichannel,
      noTrustedIdentity,
    },
    lifecycle,
    nextActions,
    priorityBands: { high, medium, low },
    identityGaps: {
      missingEmailWithInstagram,
      missingInstagramWithEmail,
      lowDataConfidence,
    },
    averages: {
      priorityScore: average(cards.map((card) => card.scoring.priorityScore)),
      commercialWarmth: average(cards.map((card) => card.scoring.commercialWarmth)),
      communityDepth: average(cards.map((card) => card.scoring.communityDepth)),
      relationshipEngagement: average(cards.map((card) => card.scoring.relationshipEngagement)),
      dataConfidence: average(cards.map((card) => card.scoring.dataConfidence)),
    },
    productFitCounts,
    topPriority,
  };
};

export const summarizeLegacyPersonCardsV1AsCommunityInsights = (
  payload: LegacyPersonCardsV1Payload,
  options: CommunityInsightsOptions = {},
): CommunityInsightsSummary => {
  const cards = buildPersonCardsVNextFromLegacyV1Payload(payload, { now: options.now });
  return summarizeCommunityInsights(cards, options);
};
