import type { CommunityNextBestAction } from './community-scoring';
import {
  findCommunitySignalImpactPolicy,
  type CommunityScoreDimensionKey,
} from './community-scoring-policy';

export const CRM_VNEXT_NEXT_BEST_ACTION_POLICY_SCHEMA_VERSION =
  'crm-vnext-next-best-action-policy-2026-05-21' as const;

export type CommunityOperatorActionCode =
  | 'stitch_identity'
  | 'complete_profile'
  | 'respect_suppression'
  | 'restricted_human_review'
  | 'review_reply_context'
  | 'care_or_retention'
  | 'review_social_context'
  | 'review_warm_contact'
  | 'invite_to_community_space'
  | 'keep_observing_email'
  | 'inspect_cooling'
  | 'keep_observing';

export type CommunityOperatorActionCategory =
  | 'identity'
  | 'risk'
  | 'context_review'
  | 'care'
  | 'commercial_review'
  | 'community'
  | 'observation';

export type CommunityOperatorActionDecision = {
  code: CommunityOperatorActionCode;
  label: string;
  category: CommunityOperatorActionCategory;
  reviewRequired: boolean;
  outboundApprovalRequired: true;
  reason: string;
  signalPolicyIds: string[];
  allowedWithoutApproval: string[];
  blockedUntilApproval: string[];
};

export type CommunityNextBestActionPolicyInput = {
  cardPresent?: boolean | null;
  needsIdentityStitching?: boolean | null;
  currentNextBestAction?: CommunityNextBestAction | string | null;
  recommendedQueue?: string | null;
  sourceFamilies?: Array<string | null | undefined> | null;
  reasonCodes?: Array<string | null | undefined> | null;
  riskCodes?: Array<string | null | undefined> | null;
  movement?: string | null;
  safeNextStep?: string | null;
  restrictedContext?: boolean | null;
  score?: Partial<Record<CommunityScoreDimensionKey | 'priorityScore', number | string | null>> | null;
  delta?: Partial<Record<CommunityScoreDimensionKey | 'priorityScore', number | string | null>> | null;
  signals?: {
    email?: {
      opens30d?: number | string | null;
      opens90d?: number | string | null;
      clicks30d?: number | string | null;
      replies30d?: number | string | null;
      lifetimeOpens?: number | string | null;
      subscriberStatus?: string | null;
    } | null;
    instagram?: {
      inboundDm30d?: number | string | null;
      comments30d?: number | string | null;
      likes30d?: number | string | null;
      storyViews30d?: number | string | null;
    } | null;
    participation?: {
      yogaClasses90d?: number | string | null;
      happyCircle90d?: number | string | null;
      retreatsAttended?: number | string | null;
    } | null;
    purchases?: {
      purchaseCount?: number | string | null;
      totalSpend?: number | string | null;
      activeClient?: boolean | string | number | null;
    } | null;
  } | null;
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanList = (values: Array<unknown> | null | undefined): string[] =>
  (Array.isArray(values) ? values : [])
    .map((value) => cleanString(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value));

const cleanNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const cleanBoolean = (value: unknown): boolean =>
  value === true || value === 'true' || value === '1';

const includesAny = (values: string[], needles: string[]): boolean =>
  needles.some((needle) => values.some((value) => value.includes(needle)));

export const inferCommunitySignalPolicyIds = (
  input: Pick<CommunityNextBestActionPolicyInput, 'sourceFamilies' | 'reasonCodes' | 'signals'>,
): string[] => {
  const sourceFamilies = cleanList(input.sourceFamilies);
  const reasonCodes = cleanList(input.reasonCodes);
  const ids = new Set<string>();

  for (const source of sourceFamilies) {
    const policy = findCommunitySignalImpactPolicy(source);
    if (policy) ids.add(policy.id);
  }

  if (includesAny(sourceFamilies, ['gmail', 'reply']) || reasonCodes.includes('email_replies')) {
    ids.add('newsletter_reply_activity');
  }
  if (includesAny(sourceFamilies, ['mailerlite']) || includesAny(reasonCodes, ['email_reads', 'email_clicks'])) {
    ids.add('mailerlite_engagement_activity');
  }
  if (includesAny(sourceFamilies, ['instagram']) || includesAny(reasonCodes, ['ig_dm', 'ig_comments'])) {
    ids.add('instagram_activity');
  }
  if (includesAny(sourceFamilies, ['classbot']) || cleanNumber(input.signals?.participation?.yogaClasses90d) > 0) {
    ids.add('classbot_yoga_activity');
  }
  if (includesAny(sourceFamilies, ['commerce', 'shopify', 'payment']) || cleanNumber(input.signals?.purchases?.purchaseCount) > 0) {
    ids.add('commerce_purchase_activity');
  }

  return [...ids].sort();
};

const labels: Record<CommunityOperatorActionCode, string> = {
  stitch_identity: 'Stitch identity',
  complete_profile: 'Complete profile',
  respect_suppression: 'Respect suppression',
  restricted_human_review: 'Restricted human review',
  review_reply_context: 'Review reply context',
  care_or_retention: 'Care or retention',
  review_social_context: 'Review social context',
  review_warm_contact: 'Review warm contact',
  invite_to_community_space: 'Invite to community space',
  keep_observing_email: 'Keep observing email',
  inspect_cooling: 'Inspect cooling',
  keep_observing: 'Keep observing',
};

const categories: Record<CommunityOperatorActionCode, CommunityOperatorActionCategory> = {
  stitch_identity: 'identity',
  complete_profile: 'identity',
  respect_suppression: 'risk',
  restricted_human_review: 'risk',
  review_reply_context: 'context_review',
  care_or_retention: 'care',
  review_social_context: 'context_review',
  review_warm_contact: 'commercial_review',
  invite_to_community_space: 'community',
  keep_observing_email: 'observation',
  inspect_cooling: 'observation',
  keep_observing: 'observation',
};

const reviewRequiredFor = (code: CommunityOperatorActionCode): boolean =>
  ['stitch_identity', 'complete_profile', 'respect_suppression', 'restricted_human_review', 'review_warm_contact'].includes(code);

const decision = (
  code: CommunityOperatorActionCode,
  reason: string,
  signalPolicyIds: string[],
): CommunityOperatorActionDecision => ({
  code,
  label: labels[code],
  category: categories[code],
  reviewRequired: reviewRequiredFor(code),
  outboundApprovalRequired: true,
  reason,
  signalPolicyIds,
  allowedWithoutApproval: [
    'Inspect local evidence and the current person card.',
    'Ask Alejandro for context or missing memory.',
    'Prepare no-send notes, evidence packets, or future approval proposals.',
  ],
  blockedUntilApproval: [
    'Outbound messages through Instagram, email, WhatsApp, Telegram, ManyChat, or any other channel.',
    'CRM card writes, Fact Store writes, score mutation, or merge operations.',
    'Live source-system mutations, credential changes, or permission changes.',
  ],
});

export const evaluateCommunityNextBestActionPolicy = (
  input: CommunityNextBestActionPolicyInput,
): CommunityOperatorActionDecision => {
  const sourceFamilies = cleanList(input.sourceFamilies);
  const reasonCodes = cleanList(input.reasonCodes);
  const riskCodes = cleanList(input.riskCodes);
  const signalPolicyIds = inferCommunitySignalPolicyIds(input);
  const email = input.signals?.email ?? {};
  const instagram = input.signals?.instagram ?? {};
  const participation = input.signals?.participation ?? {};
  const purchases = input.signals?.purchases ?? {};
  const currentAction = cleanString(input.currentNextBestAction)?.toLowerCase() ?? null;
  const recommendedQueue = cleanString(input.recommendedQueue)?.toLowerCase() ?? null;
  const movement = cleanString(input.movement)?.toLowerCase() ?? null;

  const replies30d = cleanNumber(email.replies30d);
  const clicks30d = cleanNumber(email.clicks30d);
  const opens30d = cleanNumber(email.opens30d);
  const opens90d = cleanNumber(email.opens90d);
  const subscriberStatus = cleanString(email.subscriberStatus)?.toLowerCase() ?? null;
  const inboundDm30d = cleanNumber(instagram.inboundDm30d);
  const comments30d = cleanNumber(instagram.comments30d);
  const likes30d = cleanNumber(instagram.likes30d);
  const storyViews30d = cleanNumber(instagram.storyViews30d);
  const yogaClasses90d = cleanNumber(participation.yogaClasses90d);
  const happyCircle90d = cleanNumber(participation.happyCircle90d);
  const retreatsAttended = cleanNumber(participation.retreatsAttended);
  const purchaseCount = cleanNumber(purchases.purchaseCount);
  const activeClient = cleanBoolean(purchases.activeClient);
  const commercialWarmth = cleanNumber(input.score?.commercialWarmth);
  const communityDepth = cleanNumber(input.score?.communityDepth);
  const deltaPriority = cleanNumber(input.delta?.priorityScore);
  const deltaCommunityDepth = cleanNumber(input.delta?.communityDepth);
  const mailerLiteOnly = signalPolicyIds.length === 1 && signalPolicyIds[0] === 'mailerlite_engagement_activity';
  const communityInvitationSignal = !mailerLiteOnly && (
    signalPolicyIds.includes('instagram_activity')
    || signalPolicyIds.includes('manual_context_activity')
    || happyCircle90d > 0
    || retreatsAttended > 0
  );

  const suppressed = ['unsubscribed', 'bounced', 'complained'].includes(subscriberStatus)
    || riskCodes.length > 0
    || recommendedQueue === 'suppression_review'
    || currentAction === 'respect_suppression';

  if (input.cardPresent === false || input.needsIdentityStitching) {
    return decision(
      'stitch_identity',
      'Signal exists but identity is not stable enough for card, score, or follow-up decisions.',
      signalPolicyIds,
    );
  }

  if (suppressed) {
    return decision(
      'respect_suppression',
      'A risk or suppression signal is present; this can only be used for internal review.',
      signalPolicyIds,
    );
  }

  if (input.restrictedContext) {
    return decision(
      'restricted_human_review',
      'Restricted service or sensitive context is present; keep this in human-review territory only.',
      signalPolicyIds,
    );
  }

  if (currentAction === 'complete_profile') {
    return decision(
      'complete_profile',
      'The current card lacks enough trusted identity or evidence for stronger action.',
      signalPolicyIds,
    );
  }

  if (replies30d > 0 || reasonCodes.includes('email_replies')) {
    return decision(
      'review_reply_context',
      'A human email reply is a richer relationship signal than passive opens or attendance.',
      signalPolicyIds,
    );
  }

  if (yogaClasses90d > 0 || happyCircle90d > 0 || retreatsAttended > 0 || signalPolicyIds.includes('classbot_yoga_activity')) {
    const hasExplicitCommercialSignal = replies30d > 0 || clicks30d > 0 || purchaseCount > 0 || activeClient || commercialWarmth >= 70;
    if (!hasExplicitCommercialSignal) {
      return decision(
        'care_or_retention',
        'Participation signal points first to care, continuity, retention, or gratitude, not automatic sales heat.',
        signalPolicyIds,
      );
    }
  }

  if (inboundDm30d > 0 || comments30d > 0) {
    return decision(
      'review_social_context',
      'Instagram DMs or comments deserve context review before any future human follow-up plan.',
      signalPolicyIds,
    );
  }

  if (purchaseCount > 0 || activeClient || currentAction === 'human_follow_up' || recommendedQueue === 'human_follow_up_review' || commercialWarmth >= 70) {
    return decision(
      'review_warm_contact',
      'Commercial warmth or purchase/client history is high enough to prepare an internal human review.',
      signalPolicyIds,
    );
  }

  if (currentAction === 'ask_for_email') {
    return decision(
      'stitch_identity',
      'The person is known socially but email/contact identity is still incomplete.',
      signalPolicyIds,
    );
  }

  if (currentAction === 'invite_to_community_space' || (communityInvitationSignal && (communityDepth >= 45 || deltaCommunityDepth >= 12))) {
    return decision(
      'invite_to_community_space',
      'Community depth is visible; prefer low-pressure community invitation planning over sales framing.',
      signalPolicyIds,
    );
  }

  if (movement === 'cooled') {
    return decision(
      'inspect_cooling',
      'Score moved down; inspect whether this is real cooling, stale data, or partial source coverage.',
      signalPolicyIds,
    );
  }

  if (sourceFamilies.includes('mailerlite_engagement') || opens30d > 0 || opens90d > 0 || likes30d > 0 || storyViews30d > 0) {
    return decision(
      'keep_observing_email',
      'Passive reading or light social attention exists, but it is not yet strong enough for a human decision.',
      signalPolicyIds,
    );
  }

  if (deltaPriority >= 10) {
    return decision(
      'review_warm_contact',
      'Priority moved meaningfully, so Mantis should review the card before deciding whether anything matters.',
      signalPolicyIds,
    );
  }

  return decision(
    'keep_observing',
    cleanString(input.safeNextStep) || 'Keep collecting signals until a stronger pattern emerges.',
    signalPolicyIds,
  );
};
