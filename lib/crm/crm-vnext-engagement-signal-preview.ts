import { createHash } from 'node:crypto';
import type {
  CommunityNextBestAction,
  CommunityScoreCard,
  CommunityScoringInput,
} from './community-scoring';
import {
  buildPersonCardVNext,
  type PersonCardVNext,
} from './person-card-vnext';

export const CRM_VNEXT_ENGAGEMENT_SIGNAL_PREVIEW_SCHEMA_VERSION =
  'crm-vnext-engagement-signal-preview-2026-05-11' as const;

export type CrmEngagementSignalSourceKind =
  | 'mailerlite_campaign_activity'
  | 'mailerlite_subscriber_activity'
  | 'gmail_reply_activity'
  | 'instagram_activity'
  | 'manual_engagement_snapshot'
  | 'unknown';

export type CrmEngagementSignalInput = {
  sourceKind?: CrmEngagementSignalSourceKind | string | null;
  sourceId?: string | null;
  personId?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
  phone?: string | null;
  observedAt?: string | Date | null;
  tags?: string[] | string | null;
  emailActivity?: CommunityScoringInput['email'] | null;
  instagramActivity?: CommunityScoringInput['instagram'] | null;
  opens30d?: number | string | null;
  clicks30d?: number | string | null;
  replies30d?: number | string | null;
  opens90d?: number | string | null;
  clicks90d?: number | string | null;
  lifetimeOpens?: number | string | null;
  lifetimeClicks?: number | string | null;
  lifetimeSent?: number | string | null;
  openRate?: number | string | null;
  clickRate?: number | string | null;
  lastOpenAt?: string | Date | null;
  lastClickAt?: string | Date | null;
  lastReplyAt?: string | Date | null;
  subscribedAt?: string | Date | null;
  subscriberStatus?: string | null;
  inboundDm30d?: number | string | null;
  comments30d?: number | string | null;
  likes30d?: number | string | null;
  storyViews30d?: number | string | null;
  follows?: boolean | string | number | null;
  lastInteractionAt?: string | Date | null;
};

export type CrmEngagementSignalMatchMode =
  | 'personId'
  | 'email'
  | 'instagramHandle'
  | 'phone';

export type CrmEngagementSignalNormalized = {
  signalId: string;
  sourceKind: CrmEngagementSignalSourceKind;
  sourceId: string;
  personId: string | null;
  email: string | null;
  instagramHandle: string | null;
  phone: string | null;
  observedAt: string;
  emailActivity: NonNullable<CommunityScoringInput['email']>;
  instagramActivity: NonNullable<CommunityScoringInput['instagram']>;
  tags: string[];
};

export type CrmEngagementScoreSummary = {
  stage: CommunityScoreCard['stage'];
  priorityScore: number;
  commercialWarmth: number;
  communityDepth: number;
  relationshipEngagement: number;
  dataConfidence: number;
  nextBestAction: CommunityNextBestAction;
};

export type CrmEngagementSignalPreviewItem = {
  previewItemId: string;
  personId: string;
  displayName: string | null;
  match: {
    matchedBy: CrmEngagementSignalMatchMode;
    signalCount: number;
    sourceKinds: CrmEngagementSignalSourceKind[];
    sourceIds: string[];
  };
  before: CrmEngagementScoreSummary;
  after: CrmEngagementScoreSummary;
  delta: {
    priorityScore: number;
    commercialWarmth: number;
    communityDepth: number;
    relationshipEngagement: number;
    dataConfidence: number;
  };
  movement: 'warmer' | 'cooler' | 'unchanged';
  newReasonCodes: string[];
  newRiskCodes: string[];
  recommendedQueue:
    | 'human_follow_up_review'
    | 'email_nurture_candidate'
    | 'suppression_review'
    | 'keep_observing';
  aggregatedSignals: {
    email: NonNullable<CommunityScoringInput['email']>;
    instagram: NonNullable<CommunityScoringInput['instagram']>;
    tags: string[];
  };
  operationsExecuted: 0;
  safeNextStep: string;
};

export type CrmEngagementSignalUnmatchedItem = {
  unmatchedItemId: string;
  sourceKind: CrmEngagementSignalSourceKind;
  sourceId: string;
  personId: string | null;
  email: string | null;
  instagramHandle: string | null;
  phone: string | null;
  observedAt: string;
  reason: 'no_matching_card';
  safeNextStep: string;
};

export type CrmEngagementSignalPreviewReport = {
  schemaVersion: typeof CRM_VNEXT_ENGAGEMENT_SIGNAL_PREVIEW_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_engagement_signal_preview';
  summary: {
    cardsAvailable: number;
    signalsRead: number;
    matchedSignals: number;
    unmatchedSignals: number;
    cardsPreviewed: number;
    warmedCards: number;
    cooledCards: number;
    humanFollowUpReview: number;
    emailNurtureCandidates: number;
    suppressionReviews: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  previewItems: CrmEngagementSignalPreviewItem[];
  unmatchedSignals: CrmEngagementSignalUnmatchedItem[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    engagementPreviewOnly: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmEngagementSignalPreviewInput = {
  cards: PersonCardVNext[];
  signals?: CrmEngagementSignalInput[] | null;
  now?: string | Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = cleanPublicText(value);
  return trimmed || null;
};

const cleanNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
};

const cleanBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
    if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  }
  return undefined;
};

const cleanEmail = (value: unknown): string | null =>
  cleanString(value)?.toLowerCase() ?? null;

const cleanHandle = (value: unknown): string | null =>
  cleanString(value)?.replace(/^@+/, '').toLowerCase() ?? null;

const cleanPhoneKey = (value: unknown): string | null => {
  const cleaned = cleanString(value)?.replace(/\D/g, '') ?? null;
  return cleaned && cleaned.length >= 7 ? cleaned : null;
};

const cleanSourceKind = (value: unknown): CrmEngagementSignalSourceKind => {
  const raw = cleanString(value);
  const valid = new Set<CrmEngagementSignalSourceKind>([
    'mailerlite_campaign_activity',
    'mailerlite_subscriber_activity',
    'gmail_reply_activity',
    'instagram_activity',
    'manual_engagement_snapshot',
    'unknown',
  ]);
  return raw && valid.has(raw as CrmEngagementSignalSourceKind)
    ? raw as CrmEngagementSignalSourceKind
    : 'unknown';
};

const cleanTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(cleanString).filter((item): item is string => Boolean(item));
  }
  const raw = cleanString(value);
  if (!raw) return [];
  return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const sourceIdFor = (signal: CrmEngagementSignalInput, sourceKind: CrmEngagementSignalSourceKind): string =>
  cleanString(signal.sourceId)
  ?? `${sourceKind}:${hashId([
    cleanString(signal.personId),
    cleanString(signal.email),
    cleanString(signal.instagramHandle),
    isoNow(signal.observedAt),
  ])}`;

const normalizeSignal = (
  signal: CrmEngagementSignalInput,
  generatedAt: string,
): CrmEngagementSignalNormalized => {
  const sourceKind = cleanSourceKind(signal.sourceKind);
  const sourceId = sourceIdFor(signal, sourceKind);
  const emailActivity = signal.emailActivity ?? {};
  const instagramActivity = signal.instagramActivity ?? {};
  const observedAt = isoNow(signal.observedAt ?? generatedAt);
  const follows = cleanBoolean(signal.follows ?? instagramActivity.follows);

  return {
    signalId: `engagement_signal_${hashId([sourceKind, sourceId, observedAt])}`,
    sourceKind,
    sourceId,
    personId: cleanString(signal.personId),
    email: cleanEmail(signal.email),
    instagramHandle: cleanHandle(signal.instagramHandle),
    phone: cleanPhoneKey(signal.phone),
    observedAt,
    emailActivity: {
      opens30d: cleanNumber(emailActivity.opens30d ?? signal.opens30d),
      clicks30d: cleanNumber(emailActivity.clicks30d ?? signal.clicks30d),
      replies30d: cleanNumber(emailActivity.replies30d ?? signal.replies30d),
      opens90d: cleanNumber(emailActivity.opens90d ?? signal.opens90d),
      clicks90d: cleanNumber(emailActivity.clicks90d ?? signal.clicks90d),
      lifetimeOpens: cleanNumber(emailActivity.lifetimeOpens ?? signal.lifetimeOpens),
      lifetimeClicks: cleanNumber(emailActivity.lifetimeClicks ?? signal.lifetimeClicks),
      lifetimeSent: cleanNumber(emailActivity.lifetimeSent ?? signal.lifetimeSent),
      openRate: cleanNumber(emailActivity.openRate ?? signal.openRate),
      clickRate: cleanNumber(emailActivity.clickRate ?? signal.clickRate),
      lastOpenAt: emailActivity.lastOpenAt ?? signal.lastOpenAt ?? null,
      lastClickAt: emailActivity.lastClickAt ?? signal.lastClickAt ?? null,
      lastReplyAt: emailActivity.lastReplyAt ?? signal.lastReplyAt ?? null,
      subscribedAt: emailActivity.subscribedAt ?? signal.subscribedAt ?? null,
      subscriberStatus: cleanString(emailActivity.subscriberStatus ?? signal.subscriberStatus),
    },
    instagramActivity: {
      inboundDm30d: cleanNumber(instagramActivity.inboundDm30d ?? signal.inboundDm30d),
      comments30d: cleanNumber(instagramActivity.comments30d ?? signal.comments30d),
      likes30d: cleanNumber(instagramActivity.likes30d ?? signal.likes30d),
      storyViews30d: cleanNumber(instagramActivity.storyViews30d ?? signal.storyViews30d),
      follows,
      lastInteractionAt: instagramActivity.lastInteractionAt ?? signal.lastInteractionAt ?? null,
    },
    tags: cleanTags(signal.tags),
  };
};

const daysSince = (value: string | Date | null | undefined, now: Date): number | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / DAY_MS);
};

const latestDate = (
  left: string | Date | null | undefined,
  right: string | Date | null | undefined,
): string | Date | null => {
  if (!left) return right ?? null;
  if (!right) return left;
  const leftDate = left instanceof Date ? left : new Date(left);
  const rightDate = right instanceof Date ? right : new Date(right);
  if (Number.isNaN(leftDate.getTime())) return right;
  if (Number.isNaN(rightDate.getTime())) return left;
  return rightDate.getTime() > leftDate.getTime() ? right : left;
};

const mergeSubscriberStatus = (values: Array<string | null | undefined>): string | null => {
  const cleaned = values.map((value) => cleanString(value)?.toLowerCase()).filter((value): value is string => Boolean(value));
  if (cleaned.some((value) => ['unsubscribed', 'bounced', 'complained'].includes(value))) {
    return cleaned.find((value) => ['complained', 'bounced', 'unsubscribed'].includes(value)) ?? 'unsubscribed';
  }
  if (cleaned.includes('active')) return 'active';
  return cleaned[0] ?? null;
};

const aggregateSignals = (
  signals: CrmEngagementSignalNormalized[],
  now: Date,
): CrmEngagementSignalPreviewItem['aggregatedSignals'] => {
  const recentSignals = signals.filter((signal) => daysSince(signal.observedAt, now) == null || (daysSince(signal.observedAt, now) as number) <= 45);
  const usable = recentSignals.length ? recentSignals : signals;
  return {
    email: {
      opens30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.opens30d), 0),
      clicks30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.clicks30d), 0),
      replies30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.replies30d), 0),
      opens90d: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.opens90d), 0),
      clicks90d: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.clicks90d), 0),
      lifetimeOpens: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.lifetimeOpens), 0),
      lifetimeClicks: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.lifetimeClicks), 0),
      lifetimeSent: usable.reduce((sum, signal) => sum + cleanNumber(signal.emailActivity.lifetimeSent), 0),
      openRate: usable.reduce((max, signal) => Math.max(max, cleanNumber(signal.emailActivity.openRate)), 0),
      clickRate: usable.reduce((max, signal) => Math.max(max, cleanNumber(signal.emailActivity.clickRate)), 0),
      lastOpenAt: usable.reduce<string | Date | null>((current, signal) => latestDate(current, signal.emailActivity.lastOpenAt), null),
      lastClickAt: usable.reduce<string | Date | null>((current, signal) => latestDate(current, signal.emailActivity.lastClickAt), null),
      lastReplyAt: usable.reduce<string | Date | null>((current, signal) => latestDate(current, signal.emailActivity.lastReplyAt), null),
      subscribedAt: usable.reduce<string | Date | null>((current, signal) => current ?? signal.emailActivity.subscribedAt ?? null, null),
      subscriberStatus: mergeSubscriberStatus(usable.map((signal) => signal.emailActivity.subscriberStatus)),
    },
    instagram: {
      inboundDm30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.instagramActivity.inboundDm30d), 0),
      comments30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.instagramActivity.comments30d), 0),
      likes30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.instagramActivity.likes30d), 0),
      storyViews30d: usable.reduce((sum, signal) => sum + cleanNumber(signal.instagramActivity.storyViews30d), 0),
      follows: usable.some((signal) => signal.instagramActivity.follows === true) || undefined,
      lastInteractionAt: usable.reduce<string | Date | null>((current, signal) => latestDate(current, signal.instagramActivity.lastInteractionAt), null),
    },
    tags: Array.from(new Set(usable.flatMap((signal) => signal.tags))),
  };
};

const scoreSummary = (score: CommunityScoreCard): CrmEngagementScoreSummary => ({
  stage: score.stage,
  priorityScore: score.priorityScore,
  commercialWarmth: score.commercialWarmth,
  communityDepth: score.communityDepth,
  relationshipEngagement: score.relationshipEngagement,
  dataConfidence: score.dataConfidence,
  nextBestAction: score.nextBestAction,
});

const cardIndexes = (cards: PersonCardVNext[]) => {
  const byPersonId = new Map<string, PersonCardVNext>();
  const byEmail = new Map<string, PersonCardVNext>();
  const byHandle = new Map<string, PersonCardVNext>();
  const byPhone = new Map<string, PersonCardVNext>();

  for (const card of cards) {
    byPersonId.set(card.personId, card);
    if (card.identities.email) byEmail.set(card.identities.email.toLowerCase(), card);
    if (card.identities.instagramHandle) byHandle.set(card.identities.instagramHandle.toLowerCase(), card);
    const phone = cleanPhoneKey(card.identities.phone);
    if (phone) byPhone.set(phone, card);
  }

  return { byPersonId, byEmail, byHandle, byPhone };
};

const matchSignal = (
  signal: CrmEngagementSignalNormalized,
  indexes: ReturnType<typeof cardIndexes>,
): { card: PersonCardVNext; matchedBy: CrmEngagementSignalMatchMode } | null => {
  if (signal.personId && indexes.byPersonId.has(signal.personId)) {
    return { card: indexes.byPersonId.get(signal.personId) as PersonCardVNext, matchedBy: 'personId' };
  }
  if (signal.email && indexes.byEmail.has(signal.email)) {
    return { card: indexes.byEmail.get(signal.email) as PersonCardVNext, matchedBy: 'email' };
  }
  if (signal.instagramHandle && indexes.byHandle.has(signal.instagramHandle)) {
    return { card: indexes.byHandle.get(signal.instagramHandle) as PersonCardVNext, matchedBy: 'instagramHandle' };
  }
  if (signal.phone && indexes.byPhone.has(signal.phone)) {
    return { card: indexes.byPhone.get(signal.phone) as PersonCardVNext, matchedBy: 'phone' };
  }
  return null;
};

const mergedPreviewCard = (
  card: PersonCardVNext,
  signals: CrmEngagementSignalNormalized[],
  now: string,
): { card: PersonCardVNext; aggregatedSignals: CrmEngagementSignalPreviewItem['aggregatedSignals'] } => {
  const aggregatedSignals = aggregateSignals(signals, new Date(now));
  return {
    card: buildPersonCardVNext({
      personId: card.personId,
      displayName: card.displayName,
      now,
      identities: card.identities,
      channels: {
        emailStatus: aggregatedSignals.email.subscriberStatus ?? card.channels.email.status,
        instagramStatus: card.channels.instagram.status,
        whatsappPresent: card.channels.whatsapp.present,
        whatsappStatus: card.channels.whatsapp.status,
        telegramPresent: card.channels.telegram.present,
        telegramStatus: card.channels.telegram.status,
      },
      scoring: {
        existingStage: card.scoring.stage,
        email: aggregatedSignals.email,
        instagram: aggregatedSignals.instagram,
        participation: {
          yogaClasses90d: card.products.yogaClasses90d,
          happyCircle90d: card.products.happyCircle90d,
          retreatsAttended: card.products.retreatsAttended,
        },
        purchases: {
          totalSpend: card.products.totalSpend,
          purchaseCount: card.products.purchaseCount,
          activeClient: card.products.activeClient,
        },
        tags: aggregatedSignals.tags,
      },
      evidence: [
        ...card.evidence,
        ...signals.map((signal) => ({
          source: signal.sourceId,
          observedAt: signal.observedAt,
          note: `Engagement signal preview: ${signal.sourceKind}.`,
        })),
      ],
    }),
    aggregatedSignals,
  };
};

const queueFor = (
  after: CrmEngagementScoreSummary,
): CrmEngagementSignalPreviewItem['recommendedQueue'] => {
  if (after.nextBestAction === 'respect_suppression') return 'suppression_review';
  if (after.nextBestAction === 'human_follow_up') return 'human_follow_up_review';
  if (after.nextBestAction === 'nurture_by_email') return 'email_nurture_candidate';
  return 'keep_observing';
};

const safeNextStepFor = (
  queue: CrmEngagementSignalPreviewItem['recommendedQueue'],
): string => {
  switch (queue) {
    case 'human_follow_up_review':
      return 'Review this warmed contact before any outbound follow-up or offer.';
    case 'email_nurture_candidate':
      return 'Eligible for internal nurture planning; do not send or change segments from this preview alone.';
    case 'suppression_review':
      return 'Respect suppression before any email-related action.';
    default:
      return 'Keep observing engagement until a stronger pattern emerges.';
  }
};

const safety = (): CrmEngagementSignalPreviewReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  engagementPreviewOnly: true,
  allowedUse: [
    'Preview how MailerLite, Gmail reply, Instagram, or manual engagement signals would affect CRM scores.',
    'Prioritize review queues before any human follow-up or nurture action.',
    'Test scoring policy with supplied read-only engagement exports.',
  ],
  prohibitedActions: [
    'Do not write person cards from this preview.',
    'Do not write Fact Store.',
    'Do not send emails, DMs, WhatsApp, Telegram, or public messages.',
    'Do not call live MailerLite, Gmail, Instagram, ManyChat, Drive, or Contacts APIs.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not change MailerLite groups, segments, subscribers, campaigns, automations, or tags.',
  ],
});

export const normalizeCrmEngagementSignals = (
  value: unknown,
  generatedAt: string,
): CrmEngagementSignalNormalized[] => {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { signals?: unknown }).signals)
      ? (value as { signals: unknown[] }).signals
      : [];
  return raw
    .filter((item): item is CrmEngagementSignalInput => Boolean(item && typeof item === 'object'))
    .map((signal) => normalizeSignal(signal, generatedAt));
};

export const buildCrmVNextEngagementSignalPreview = (
  input: CrmEngagementSignalPreviewInput,
): CrmEngagementSignalPreviewReport => {
  const generatedAt = isoNow(input.now);
  const signals = normalizeCrmEngagementSignals(input.signals ?? [], generatedAt);
  const indexes = cardIndexes(input.cards);
  const byCard = new Map<string, { card: PersonCardVNext; matchedBy: CrmEngagementSignalMatchMode; signals: CrmEngagementSignalNormalized[] }>();
  const unmatchedSignals: CrmEngagementSignalUnmatchedItem[] = [];

  for (const signal of signals) {
    const match = matchSignal(signal, indexes);
    if (!match) {
      unmatchedSignals.push({
        unmatchedItemId: `engagement_unmatched_${hashId([signal.signalId, signal.sourceId])}`,
        sourceKind: signal.sourceKind,
        sourceId: signal.sourceId,
        personId: signal.personId,
        email: signal.email,
        instagramHandle: signal.instagramHandle,
        phone: signal.phone,
        observedAt: signal.observedAt,
        reason: 'no_matching_card',
        safeNextStep: 'Run identity stitching or batch operating loop before using this engagement signal.',
      });
      continue;
    }
    const existing = byCard.get(match.card.personId);
    if (existing) {
      existing.signals.push(signal);
      if (existing.matchedBy !== 'personId') existing.matchedBy = match.matchedBy;
    } else {
      byCard.set(match.card.personId, {
        card: match.card,
        matchedBy: match.matchedBy,
        signals: [signal],
      });
    }
  }

  const previewItems = Array.from(byCard.values()).map(({ card, matchedBy, signals: cardSignals }) => {
    const preview = mergedPreviewCard(card, cardSignals, generatedAt);
    const before = scoreSummary(card.scoring);
    const after = scoreSummary(preview.card.scoring);
    const delta = {
      priorityScore: after.priorityScore - before.priorityScore,
      commercialWarmth: after.commercialWarmth - before.commercialWarmth,
      communityDepth: after.communityDepth - before.communityDepth,
      relationshipEngagement: after.relationshipEngagement - before.relationshipEngagement,
      dataConfidence: after.dataConfidence - before.dataConfidence,
    };
    const newReasonCodes = preview.card.scoring.reasons
      .map((reason) => reason.code)
      .filter((code) => !card.scoring.reasons.some((reason) => reason.code === code));
    const newRiskCodes = preview.card.scoring.risks
      .map((risk) => risk.code)
      .filter((code) => !card.scoring.risks.some((risk) => risk.code === code));
    const recommendedQueue = queueFor(after);
    return {
      previewItemId: `engagement_preview_${hashId([card.personId, ...cardSignals.map((signal) => signal.signalId)])}`,
      personId: card.personId,
      displayName: card.displayName,
      match: {
        matchedBy,
        signalCount: cardSignals.length,
        sourceKinds: Array.from(new Set(cardSignals.map((signal) => signal.sourceKind))),
        sourceIds: Array.from(new Set(cardSignals.map((signal) => signal.sourceId))),
      },
      before,
      after,
      delta,
      movement: delta.priorityScore > 0 ? 'warmer' : delta.priorityScore < 0 ? 'cooler' : 'unchanged',
      newReasonCodes,
      newRiskCodes,
      recommendedQueue,
      aggregatedSignals: preview.aggregatedSignals,
      operationsExecuted: 0,
      safeNextStep: safeNextStepFor(recommendedQueue),
    } satisfies CrmEngagementSignalPreviewItem;
  }).sort((left, right) =>
    right.delta.priorityScore - left.delta.priorityScore
    || right.after.priorityScore - left.after.priorityScore
    || left.personId.localeCompare(right.personId));

  return {
    schemaVersion: CRM_VNEXT_ENGAGEMENT_SIGNAL_PREVIEW_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_engagement_signal_preview',
    summary: {
      cardsAvailable: input.cards.length,
      signalsRead: signals.length,
      matchedSignals: signals.length - unmatchedSignals.length,
      unmatchedSignals: unmatchedSignals.length,
      cardsPreviewed: previewItems.length,
      warmedCards: previewItems.filter((item) => item.movement === 'warmer').length,
      cooledCards: previewItems.filter((item) => item.movement === 'cooler').length,
      humanFollowUpReview: previewItems.filter((item) => item.recommendedQueue === 'human_follow_up_review').length,
      emailNurtureCandidates: previewItems.filter((item) => item.recommendedQueue === 'email_nurture_candidate').length,
      suppressionReviews: previewItems.filter((item) => item.recommendedQueue === 'suppression_review').length,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    previewItems,
    unmatchedSignals,
    safety: safety(),
  };
};
