import {
  searchCommunityPersonCards,
  type CommunityPersonSearchFilters,
  type CommunityPersonSearchResult,
} from './community-person-search';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityQueueId =
  | 'ig_without_email'
  | 'email_engaged'
  | 'human_review_required'
  | 'identity_stitching'
  | 'commercial_follow_up';

export type CommunityQueueDefinition = {
  id: CommunityQueueId;
  title: string;
  purpose: string;
  operatorNote: string;
  filters: CommunityPersonSearchFilters;
};

export type CommunityQueueResult = CommunityQueueDefinition & {
  result: CommunityPersonSearchResult;
};

export type CommunityQueueSummary = CommunityQueueDefinition & {
  counts: {
    total: number;
    matched: number;
    returned: number;
  };
};

export const COMMUNITY_QUEUE_DEFINITIONS: CommunityQueueDefinition[] = [
  {
    id: 'ig_without_email',
    title: 'IG without email',
    purpose: 'Capture email for Instagram-known people before deeper nurture.',
    operatorNote: 'Safe local queue for future email-capture follow-up. No message is sent from this view.',
    filters: {
      channel: 'missing_email_with_instagram',
      nextAction: 'ask_for_email',
      limit: 12,
    },
  },
  {
    id: 'email_engaged',
    title: 'Email engaged',
    purpose: 'Find people ready for continued email nurture.',
    operatorNote: 'Useful for Mantis to inspect newsletter/community readers before any campaign decision.',
    filters: {
      channel: 'email',
      nextAction: 'nurture_by_email',
      limit: 12,
    },
  },
  {
    id: 'human_review_required',
    title: 'Human review required',
    purpose: 'Keep sensitive follow-up and suppression cases out of automation.',
    operatorNote: 'These rows require Alejandro or an approved human operator before external outreach.',
    filters: {
      requiresHumanReview: true,
      limit: 12,
    },
  },
  {
    id: 'identity_stitching',
    title: 'Identity stitching',
    purpose: 'Find email-known people missing Instagram identity.',
    operatorNote: 'Good queue for future enrichment, matching, or human assistant reporting.',
    filters: {
      channel: 'missing_instagram_with_email',
      limit: 12,
    },
  },
  {
    id: 'commercial_follow_up',
    title: 'Commercial follow-up',
    purpose: 'Surface warm contacts that should never be auto-contacted without review.',
    operatorNote: 'A decision queue, not an outbound queue.',
    filters: {
      nextAction: 'human_follow_up',
      requiresHumanReview: true,
      limit: 12,
    },
  },
];

export const buildCommunityQueues = (
  cards: PersonCardVNext[],
  definitions: CommunityQueueDefinition[] = COMMUNITY_QUEUE_DEFINITIONS,
): CommunityQueueResult[] =>
  definitions.map((definition) => ({
    ...definition,
    result: searchCommunityPersonCards(cards, definition.filters),
  }));

export const summarizeCommunityQueues = (
  queues: CommunityQueueResult[],
): CommunityQueueSummary[] =>
  queues.map((queue) => ({
    id: queue.id,
    title: queue.title,
    purpose: queue.purpose,
    operatorNote: queue.operatorNote,
    filters: queue.filters,
    counts: {
      total: queue.result.total,
      matched: queue.result.matched,
      returned: queue.result.returned,
    },
  }));
