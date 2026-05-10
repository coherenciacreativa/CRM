import {
  buildCommunityQueues,
  summarizeCommunityQueues,
  type CommunityQueueDefinition,
  type CommunityQueueId,
} from './community-queues';
import {
  COMMUNITY_STAGE_LABELS,
  type ProductFitKey,
  type ScoringReason,
} from './community-scoring';
import {
  evaluateCommunityQueueStatus,
  type CommunityQueuePreviousSnapshot,
  type CommunityQueueStatus,
} from './community-queue-status';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityQueueBriefPerson = {
  personId: string;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    city: string | null;
    country: string | null;
  };
  stage: {
    code: PersonCardVNext['scoring']['stage'];
    label: string;
  };
  scores: {
    priority: number;
    commercialWarmth: number;
    communityDepth: number;
    relationshipEngagement: number;
    dataConfidence: number;
  };
  nextAction: PersonCardVNext['nextAction'];
  topProductFit: Array<{
    key: ProductFitKey;
    score: number;
  }>;
  productHistory: {
    activeClient: boolean;
    purchaseCount: number;
    totalSpend: number;
    yogaClasses90d: number;
    happyCircle90d: number;
    retreatsAttended: number;
  };
  signals: ScoringReason[];
  risks: ScoringReason[];
  evidenceSources: string[];
};

export type CommunityQueueBrief = {
  generatedAt: string;
  queue: {
    id: CommunityQueueId;
    title: string;
    purpose: string;
    operatorNote: string;
    filters: CommunityQueueDefinition['filters'];
    counts: {
      total: number;
      matched: number;
      returned: number;
    };
    status: CommunityQueueStatus | null;
  };
  safety: {
    mode: 'read_only_local_brief';
    outboundProhibited: true;
    prohibitedActions: string[];
  };
  people: CommunityQueueBriefPerson[];
};

export type CommunityQueueBriefOptions = {
  now?: string | Date | null;
  limit?: number | null;
  previousMatched?: CommunityQueuePreviousSnapshot;
};

const PRODUCT_KEYS: ProductFitKey[] = ['yoga', 'mentorship', 'therapy', 'digitalProducts', 'retreats'];

const cleanLimit = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 8;
  return Math.max(1, Math.min(25, Math.round(value)));
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const topProductFit = (card: PersonCardVNext): CommunityQueueBriefPerson['topProductFit'] =>
  PRODUCT_KEYS
    .map((key) => ({ key, score: card.scoring.productFit[key] ?? 0 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, 3);

const toBriefPerson = (card: PersonCardVNext): CommunityQueueBriefPerson => ({
  personId: card.personId,
  displayName: card.displayName,
  identities: {
    email: card.identities.email,
    instagramHandle: card.identities.instagramHandle,
    city: card.identities.city,
    country: card.identities.country,
  },
  stage: {
    code: card.scoring.stage,
    label: COMMUNITY_STAGE_LABELS[card.scoring.stage],
  },
  scores: {
    priority: card.scoring.priorityScore,
    commercialWarmth: card.scoring.commercialWarmth,
    communityDepth: card.scoring.communityDepth,
    relationshipEngagement: card.scoring.relationshipEngagement,
    dataConfidence: card.scoring.dataConfidence,
  },
  nextAction: card.nextAction,
  topProductFit: topProductFit(card),
  productHistory: {
    activeClient: card.products.activeClient,
    purchaseCount: card.products.purchaseCount,
    totalSpend: card.products.totalSpend,
    yogaClasses90d: card.products.yogaClasses90d,
    happyCircle90d: card.products.happyCircle90d,
    retreatsAttended: card.products.retreatsAttended,
  },
  signals: card.scoring.reasons.slice(0, 5),
  risks: card.scoring.risks.slice(0, 5),
  evidenceSources: card.evidence.map((item) => item.source).filter(Boolean).slice(0, 5),
});

export const buildCommunityQueueBrief = (
  cards: PersonCardVNext[],
  queueId: CommunityQueueId,
  options: CommunityQueueBriefOptions = {},
): CommunityQueueBrief => {
  const limit = cleanLimit(options.limit);
  const allQueues = buildCommunityQueues(cards);
  const queueDefinition = allQueues.find((queue) => queue.id === queueId);
  if (!queueDefinition) {
    throw new Error(`unknown_community_queue:${queueId}`);
  }

  const queue = buildCommunityQueues(cards, [
    {
      id: queueDefinition.id,
      title: queueDefinition.title,
      purpose: queueDefinition.purpose,
      operatorNote: queueDefinition.operatorNote,
      filters: {
        ...queueDefinition.filters,
        limit,
      },
    },
  ])[0];
  const statusReport = evaluateCommunityQueueStatus(summarizeCommunityQueues(allQueues), {
    now: options.now,
    previousMatched: options.previousMatched,
  });
  const status = statusReport.statuses.find((item) => item.id === queueId) ?? null;
  const cardsById = new Map(cards.map((card) => [card.personId, card]));

  return {
    generatedAt: isoNow(options.now),
    queue: {
      id: queue.id,
      title: queue.title,
      purpose: queue.purpose,
      operatorNote: queue.operatorNote,
      filters: queue.result.filters,
      counts: {
        total: queue.result.total,
        matched: queue.result.matched,
        returned: queue.result.returned,
      },
      status,
    },
    safety: {
      mode: 'read_only_local_brief',
      outboundProhibited: true,
      prohibitedActions: [
        'Do not send Instagram messages.',
        'Do not send email or WhatsApp messages.',
        'Do not change ManyChat LIVE.',
        'Do not mutate CRM records from this brief.',
      ],
    },
    people: queue.result.people
      .map((row) => cardsById.get(row.personId))
      .filter((card): card is PersonCardVNext => Boolean(card))
      .map(toBriefPerson),
  };
};
