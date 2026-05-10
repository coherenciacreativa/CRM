export type CommunityLifecycleStage = 'SEMILLA' | 'GERMINADA' | 'FLORECIDA' | 'COSECHA';

export type ProductFitKey = 'yoga' | 'mentorship' | 'therapy' | 'digitalProducts' | 'retreats';

export type CommunityScoringInput = {
  now?: string | Date | null;
  existingStage?: CommunityLifecycleStage | 'UNKNOWN' | null;
  identity?: {
    hasEmail?: boolean;
    hasInstagram?: boolean;
    hasPhone?: boolean;
    hasCity?: boolean;
    hasCountry?: boolean;
    trustedMatchCount?: number;
    sourceCount?: number;
  };
  email?: {
    opens30d?: number;
    clicks30d?: number;
    replies30d?: number;
    lastOpenAt?: string | Date | null;
    lastClickAt?: string | Date | null;
    lastReplyAt?: string | Date | null;
    subscriberStatus?: 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'unknown' | string | null;
  };
  instagram?: {
    inboundDm30d?: number;
    comments30d?: number;
    likes30d?: number;
    storyViews30d?: number;
    follows?: boolean;
    lastInteractionAt?: string | Date | null;
  };
  participation?: {
    yogaClasses90d?: number;
    happyCircle90d?: number;
    retreatsAttended?: number;
    lastAttendanceAt?: string | Date | null;
  };
  purchases?: {
    totalSpend?: number;
    purchaseCount?: number;
    activeClient?: boolean;
    mentorshipSessions?: number;
    therapySessions?: number;
    digitalProductsPurchased?: number;
    retreatsPurchased?: number;
    lastPurchaseAt?: string | Date | null;
  };
  tags?: string[];
};

export type ScoringReason = {
  code: string;
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
};

export type CommunityNextBestAction =
  | 'complete_profile'
  | 'ask_for_email'
  | 'human_follow_up'
  | 'nurture_by_email'
  | 'invite_to_community_space'
  | 'respect_suppression'
  | 'keep_warming';

export type CommunityScoreCard = {
  stage: CommunityLifecycleStage;
  priorityScore: number;
  commercialWarmth: number;
  communityDepth: number;
  relationshipEngagement: number;
  dataConfidence: number;
  productFit: Record<ProductFitKey, number>;
  nextBestAction: CommunityNextBestAction;
  reasons: ScoringReason[];
  risks: ScoringReason[];
};

export const COMMUNITY_STAGE_LABELS: Record<CommunityLifecycleStage, string> = {
  SEMILLA: 'Semilla',
  GERMINADA: 'Germinada',
  FLORECIDA: 'Florecida',
  COSECHA: 'Cosecha',
};

const STAGE_RANK: Record<CommunityLifecycleStage, number> = {
  SEMILLA: 1,
  GERMINADA: 2,
  FLORECIDA: 3,
  COSECHA: 4,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const count = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const parseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysSince = (value: string | Date | null | undefined, now: Date): number | null => {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / DAY_MS);
};

const recencyScore = (
  value: string | Date | null | undefined,
  now: Date,
  windows: Array<{ days: number; points: number }>,
): number => {
  const age = daysSince(value, now);
  if (age == null) return 0;
  const match = windows.find((item) => age <= item.days);
  return match?.points ?? 0;
};

const includesAny = (tags: string[], needles: string[]): boolean => {
  const normalized = tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  return needles.some((needle) => normalized.some((tag) => tag.includes(needle)));
};

const addReason = (reasons: ScoringReason[], code: string, label: string, impact: ScoringReason['impact']) => {
  if (!reasons.some((item) => item.code === code)) reasons.push({ code, label, impact });
};

const weightedAvailableScore = (
  sources: Array<{ score: number; weight: number; available: boolean }>,
): number => {
  const availableSources = sources.filter((source) => source.available);
  if (!availableSources.length) return 0;
  const totalWeight = availableSources.reduce((sum, source) => sum + source.weight, 0);
  if (totalWeight <= 0) return 0;
  return clampScore(
    availableSources.reduce((sum, source) => sum + source.score * source.weight, 0) / totalWeight,
  );
};

const stageFromScore = (score: number): CommunityLifecycleStage => {
  if (score >= 85) return 'COSECHA';
  if (score >= 65) return 'FLORECIDA';
  if (score >= 45) return 'GERMINADA';
  return 'SEMILLA';
};

const maxStage = (
  computed: CommunityLifecycleStage,
  existing: CommunityLifecycleStage | 'UNKNOWN' | null | undefined,
): CommunityLifecycleStage => {
  if (!existing || existing === 'UNKNOWN') return computed;
  return STAGE_RANK[existing] > STAGE_RANK[computed] ? existing : computed;
};

export const scoreCommunityContact = (input: CommunityScoringInput): CommunityScoreCard => {
  const now = parseDate(input.now) ?? new Date();
  const reasons: ScoringReason[] = [];
  const risks: ScoringReason[] = [];
  const tags = input.tags ?? [];

  const email = input.email ?? {};
  const instagram = input.instagram ?? {};
  const participation = input.participation ?? {};
  const purchases = input.purchases ?? {};
  const identity = input.identity ?? {};

  const opens = count(email.opens30d);
  const clicks = count(email.clicks30d);
  const replies = count(email.replies30d);
  const inboundDms = count(instagram.inboundDm30d);
  const comments = count(instagram.comments30d);
  const likes = count(instagram.likes30d);
  const storyViews = count(instagram.storyViews30d);
  const yogaClasses = count(participation.yogaClasses90d);
  const happyCircle = count(participation.happyCircle90d);
  const retreatsAttended = count(participation.retreatsAttended);
  const purchaseCount = count(purchases.purchaseCount);
  const totalSpend = count(purchases.totalSpend);

  const emailScore = clampScore(
    Math.min(opens * 4, 20)
      + Math.min(clicks * 12, 24)
      + Math.min(replies * 18, 30)
      + recencyScore(email.lastOpenAt, now, [
        { days: 7, points: 10 },
        { days: 30, points: 5 },
      ])
      + recencyScore(email.lastClickAt, now, [
        { days: 14, points: 10 },
        { days: 45, points: 5 },
      ])
      + recencyScore(email.lastReplyAt, now, [
        { days: 14, points: 16 },
        { days: 45, points: 8 },
      ]),
  );

  const instagramScore = clampScore(
    Math.min(inboundDms * 12, 36)
      + Math.min(comments * 8, 24)
      + Math.min(likes * 3, 15)
      + Math.min(storyViews * 2, 12)
      + (instagram.follows ? 8 : 0)
      + recencyScore(instagram.lastInteractionAt, now, [
        { days: 7, points: 12 },
        { days: 30, points: 6 },
      ]),
  );

  const participationScore = clampScore(
    Math.min(yogaClasses * 7, 28)
      + Math.min(happyCircle * 9, 27)
      + Math.min(retreatsAttended * 22, 44)
      + recencyScore(participation.lastAttendanceAt, now, [
        { days: 30, points: 16 },
        { days: 90, points: 8 },
      ]),
  );

  const purchaseScore = clampScore(
    Math.min(purchaseCount * 18, 36)
      + Math.min(totalSpend / 30, 30)
      + (purchases.activeClient ? 18 : 0)
      + Math.min(count(purchases.mentorshipSessions) * 18, 36)
      + Math.min(count(purchases.therapySessions) * 12, 30)
      + Math.min(count(purchases.digitalProductsPurchased) * 8, 20)
      + Math.min(count(purchases.retreatsPurchased) * 22, 44)
      + recencyScore(purchases.lastPurchaseAt, now, [
        { days: 45, points: 16 },
        { days: 180, points: 8 },
      ]),
  );

  if (opens >= 3) addReason(reasons, 'email_reads', 'Reads email repeatedly', 'positive');
  if (clicks > 0) addReason(reasons, 'email_clicks', 'Clicks email links', 'positive');
  if (replies > 0) addReason(reasons, 'email_replies', 'Replies by email', 'positive');
  if (inboundDms > 0) addReason(reasons, 'ig_dm', 'Has inbound Instagram DMs', 'positive');
  if (comments > 0) addReason(reasons, 'ig_comments', 'Comments on Instagram', 'positive');
  if (yogaClasses + happyCircle + retreatsAttended > 0) {
    addReason(reasons, 'community_participation', 'Participates in community spaces', 'positive');
  }
  if (purchaseCount > 0 || totalSpend > 0 || purchases.activeClient) {
    addReason(reasons, 'purchase_history', 'Has purchase or client history', 'positive');
  }
  if (identity.hasEmail && identity.hasInstagram) {
    addReason(reasons, 'omnichannel_identity', 'Known across email and Instagram', 'positive');
  }

  const suppressedStatuses = new Set(['unsubscribed', 'bounced', 'complained']);
  const subscriberStatus = String(email.subscriberStatus ?? '').toLowerCase();
  const isSuppressed = suppressedStatuses.has(subscriberStatus);
  if (isSuppressed) {
    addReason(risks, 'email_suppressed', 'Email status blocks normal email nurture', 'negative');
  }

  const dataConfidence = clampScore(
    (identity.hasEmail ? 18 : 0)
      + (identity.hasInstagram ? 18 : 0)
      + (identity.hasPhone ? 12 : 0)
      + (identity.hasCity ? 8 : 0)
      + (identity.hasCountry ? 8 : 0)
      + Math.min(count(identity.trustedMatchCount) * 12, 24)
      + Math.min(count(identity.sourceCount) * 7, 21)
      + (emailScore > 0 ? 8 : 0)
      + (instagramScore > 0 ? 8 : 0)
      + (participationScore > 0 ? 6 : 0)
      + (purchaseScore > 0 ? 8 : 0),
  );

  if (dataConfidence < 35) {
    addReason(risks, 'low_data_confidence', 'Profile needs more identity or evidence', 'negative');
  }

  const relationshipEngagement = weightedAvailableScore([
    { score: emailScore, weight: 0.35, available: Boolean(identity.hasEmail || emailScore > 0) },
    { score: instagramScore, weight: 0.35, available: Boolean(identity.hasInstagram || instagramScore > 0) },
    { score: participationScore, weight: 0.3, available: participationScore > 0 },
  ]);
  const communityDepth = weightedAvailableScore([
    { score: emailScore, weight: 0.2, available: Boolean(identity.hasEmail || emailScore > 0) },
    { score: instagramScore, weight: 0.18, available: Boolean(identity.hasInstagram || instagramScore > 0) },
    { score: participationScore, weight: 0.34, available: participationScore > 0 },
    { score: purchaseScore, weight: 0.28, available: purchaseScore > 0 },
  ]);

  const suppressionPenalty = isSuppressed ? 18 : 0;
  const commercialWarmth = clampScore(
    emailScore * 0.24
      + instagramScore * 0.25
      + participationScore * 0.18
      + purchaseScore * 0.33
      - suppressionPenalty,
  );

  const productFit: Record<ProductFitKey, number> = {
    yoga: clampScore(yogaClasses * 16 + happyCircle * 5 + (includesAny(tags, ['yoga']) ? 18 : 0)),
    mentorship: clampScore(
      count(purchases.mentorshipSessions) * 28
        + replies * 10
        + clicks * 6
        + (includesAny(tags, ['mentoria', 'mentorship', 'coaching']) ? 18 : 0),
    ),
    therapy: clampScore(
      count(purchases.therapySessions) * 25 + replies * 8 + (includesAny(tags, ['terapia', 'therapy']) ? 20 : 0),
    ),
    digitalProducts: clampScore(
      count(purchases.digitalProductsPurchased) * 24
        + clicks * 8
        + opens * 2
        + (includesAny(tags, ['curso', 'meditacion', 'digital']) ? 16 : 0),
    ),
    retreats: clampScore(
      retreatsAttended * 30
        + count(purchases.retreatsPurchased) * 30
        + comments * 6
        + inboundDms * 8
        + (includesAny(tags, ['retiro', 'retreat']) ? 20 : 0),
    ),
  };

  const priorityScore = clampScore(
    commercialWarmth * 0.42 + communityDepth * 0.3 + relationshipEngagement * 0.2 + dataConfidence * 0.08,
  );

  const stage = maxStage(stageFromScore(priorityScore), input.existingStage);

  let nextBestAction: CommunityNextBestAction = 'keep_warming';
  if (isSuppressed) {
    nextBestAction = 'respect_suppression';
  } else if (dataConfidence < 35) {
    nextBestAction = 'complete_profile';
  } else if (identity.hasInstagram && !identity.hasEmail) {
    nextBestAction = 'ask_for_email';
  } else if (commercialWarmth >= 70) {
    nextBestAction = 'human_follow_up';
  } else if (relationshipEngagement >= 40 && identity.hasEmail) {
    nextBestAction = 'nurture_by_email';
  } else if (communityDepth >= 45) {
    nextBestAction = 'invite_to_community_space';
  }

  return {
    stage,
    priorityScore,
    commercialWarmth,
    communityDepth,
    relationshipEngagement,
    dataConfidence,
    productFit,
    nextBestAction,
    reasons,
    risks,
  };
};
