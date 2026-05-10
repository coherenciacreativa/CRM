import {
  scoreCommunityContact,
  type CommunityNextBestAction,
  type CommunityScoreCard,
  type CommunityScoringInput,
} from './community-scoring';

export const PERSON_CARD_VNEXT_SCHEMA_VERSION = 'person-card-vnext-2026-05-08' as const;

export type PersonCardEvidence = {
  source: string;
  observedAt?: string | null;
  note?: string;
};

export type PersonCardVNextInput = {
  personId: string;
  displayName?: string | null;
  now?: string | Date | null;
  identities?: {
    email?: string | null;
    instagramHandle?: string | null;
    instagramUserId?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
  };
  channels?: {
    emailStatus?: string | null;
    instagramStatus?: string | null;
    whatsappPresent?: boolean;
    whatsappStatus?: string | null;
    telegramPresent?: boolean;
    telegramStatus?: string | null;
  };
  scoring?: Omit<CommunityScoringInput, 'now' | 'identity'> & {
    identity?: CommunityScoringInput['identity'];
  };
  evidence?: PersonCardEvidence[];
};

export type PersonCardVNext = {
  schemaVersion: typeof PERSON_CARD_VNEXT_SCHEMA_VERSION;
  personId: string;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    instagramUserId: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  };
  channels: {
    email: { present: boolean; status: string | null };
    instagram: { present: boolean; status: string | null };
    whatsapp: { present: boolean; status: string | null };
    telegram: { present: boolean; status: string | null };
  };
  products: {
    yogaClasses90d: number;
    happyCircle90d: number;
    retreatsAttended: number;
    totalSpend: number;
    purchaseCount: number;
    activeClient: boolean;
  };
  scoring: CommunityScoreCard;
  evidence: PersonCardEvidence[];
  nextAction: {
    code: CommunityNextBestAction;
    requiresHumanReview: boolean;
    reason: string;
  };
  updatedAt: string;
};

const cleanString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const count = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hasTrustedIdentity = (identities: PersonCardVNext['identities']): boolean =>
  Boolean(
    identities.email
      || identities.phone
      || identities.instagramUserId
      || identities.instagramHandle,
  );

const humanReviewReason = (action: CommunityNextBestAction): string => {
  switch (action) {
    case 'human_follow_up':
      return 'Direct follow-up should be reviewed before any external send.';
    case 'ask_for_email':
      return 'IG identity is present but email is missing.';
    case 'respect_suppression':
      return 'Contact has a suppression status that changes allowed outreach.';
    case 'complete_profile':
      return 'Profile needs more trusted identity or evidence.';
    case 'nurture_by_email':
      return 'Relationship is active enough for email nurture.';
    case 'invite_to_community_space':
      return 'Community depth suggests a low-pressure invitation.';
    case 'keep_warming':
      return 'Keep collecting signal before recommending a stronger action.';
    default:
      return 'Action selected by scoring policy.';
  }
};

export const buildPersonCardVNext = (input: PersonCardVNextInput): PersonCardVNext => {
  const personId = cleanString(input.personId);
  if (!personId) {
    throw new Error('PersonCardVNext requires a stable personId');
  }

  const identities = {
    email: cleanString(input.identities?.email),
    instagramHandle: cleanString(input.identities?.instagramHandle)?.replace(/^@+/, '').toLowerCase() ?? null,
    instagramUserId: cleanString(input.identities?.instagramUserId),
    phone: cleanString(input.identities?.phone),
    city: cleanString(input.identities?.city),
    country: cleanString(input.identities?.country),
  };

  const scoringInput: CommunityScoringInput = {
    ...input.scoring,
    now: input.now,
    identity: {
      hasEmail: Boolean(identities.email),
      hasInstagram: Boolean(identities.instagramHandle || identities.instagramUserId),
      hasPhone: Boolean(identities.phone),
      hasCity: Boolean(identities.city),
      hasCountry: Boolean(identities.country),
      trustedMatchCount: hasTrustedIdentity(identities) ? 1 : 0,
      sourceCount: input.evidence?.length ?? 0,
      ...input.scoring?.identity,
    },
    email: {
      ...input.scoring?.email,
      subscriberStatus: input.scoring?.email?.subscriberStatus ?? input.channels?.emailStatus ?? null,
    },
  };

  const scoring = scoreCommunityContact(scoringInput);
  const action = scoring.nextBestAction;

  return {
    schemaVersion: PERSON_CARD_VNEXT_SCHEMA_VERSION,
    personId,
    displayName: cleanString(input.displayName),
    identities,
    channels: {
      email: { present: Boolean(identities.email), status: cleanString(input.channels?.emailStatus) },
      instagram: {
        present: Boolean(identities.instagramHandle || identities.instagramUserId),
        status: cleanString(input.channels?.instagramStatus),
      },
      whatsapp: {
        present: Boolean(input.channels?.whatsappPresent),
        status: cleanString(input.channels?.whatsappStatus),
      },
      telegram: {
        present: Boolean(input.channels?.telegramPresent),
        status: cleanString(input.channels?.telegramStatus),
      },
    },
    products: {
      yogaClasses90d: count(input.scoring?.participation?.yogaClasses90d),
      happyCircle90d: count(input.scoring?.participation?.happyCircle90d),
      retreatsAttended: count(input.scoring?.participation?.retreatsAttended),
      totalSpend: count(input.scoring?.purchases?.totalSpend),
      purchaseCount: count(input.scoring?.purchases?.purchaseCount),
      activeClient: Boolean(input.scoring?.purchases?.activeClient),
    },
    scoring,
    evidence: input.evidence ?? [],
    nextAction: {
      code: action,
      requiresHumanReview: action === 'human_follow_up' || action === 'respect_suppression',
      reason: humanReviewReason(action),
    },
    updatedAt: isoNow(input.now),
  };
};
