import {
  buildPersonCardVNext,
  type PersonCardEvidence,
  type PersonCardVNext,
} from './person-card-vnext';
import type { CommunityLifecycleStage, CommunityScoringInput } from './community-scoring';

export type LegacyPersonCardV1 = {
  personId?: unknown;
  identities?: {
    igHandle?: unknown;
    email?: unknown;
  };
  channels?: {
    instagram?: unknown;
    email?: unknown;
  };
  engagement?: {
    ig?: {
      stage?: unknown;
      lastLeadAt?: unknown;
      lastOutboundAt?: unknown;
      gateDecision?: unknown;
      frozen?: unknown;
      leadStateConfidence?: unknown;
      fromIgApi?: unknown;
      fromUiSignals?: unknown;
    };
    email?: {
      opens30d?: unknown;
      clicks30d?: unknown;
      lastOpenAt?: unknown;
      lastClickAt?: unknown;
    };
  };
  lifecycleStageGuess?: unknown;
  confidence?: unknown;
  updatedAt?: unknown;
  evidence?: unknown;
};

export type LegacyPersonCardsV1Payload = {
  generatedAt?: unknown;
  cards?: unknown;
};

export type LegacyPersonCardAdapterOptions = {
  now?: string | Date | null;
};

const VALID_STAGES = new Set<CommunityLifecycleStage>(['SEMILLA', 'GERMINADA', 'FLORECIDA', 'COSECHA']);

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanStage = (value: unknown): CommunityLifecycleStage | 'UNKNOWN' | null => {
  const raw = cleanString(value)?.toUpperCase();
  if (!raw) return null;
  if (raw === 'UNKNOWN') return 'UNKNOWN';
  return VALID_STAGES.has(raw as CommunityLifecycleStage) ? (raw as CommunityLifecycleStage) : null;
};

const cleanNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const cleanDateLike = (value: unknown): string | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return cleanString(value);
};

const evidenceFromLegacy = (legacy: LegacyPersonCardV1, observedAt: string | null): PersonCardEvidence[] => {
  const raw = Array.isArray(legacy.evidence) ? legacy.evidence : [];
  return raw
    .map((item) => cleanString(item))
    .filter((source): source is string => Boolean(source))
    .map((source) => ({ source, observedAt }));
};

const stageToIgSignals = (stage: CommunityLifecycleStage | 'UNKNOWN' | null): Pick<
  NonNullable<CommunityScoringInput['instagram']>,
  'inboundDm30d' | 'comments30d' | 'likes30d'
> => {
  switch (stage) {
    case 'COSECHA':
      return { inboundDm30d: 3, comments30d: 2, likes30d: 3 };
    case 'FLORECIDA':
      return { inboundDm30d: 2, comments30d: 2, likes30d: 2 };
    case 'GERMINADA':
      return { inboundDm30d: 1, comments30d: 1, likes30d: 1 };
    case 'SEMILLA':
      return { inboundDm30d: 0, comments30d: 0, likes30d: 1 };
    default:
      return { inboundDm30d: 0, comments30d: 0, likes30d: 0 };
  }
};

const sourceCountFromLegacy = (legacy: LegacyPersonCardV1): number => {
  const evidenceCount = Array.isArray(legacy.evidence) ? legacy.evidence.length : 0;
  const ig = legacy.engagement?.ig ?? {};
  const sourceFlags = [ig.fromIgApi, ig.fromUiSignals].filter(Boolean).length;
  const emailSignal = cleanNumber(legacy.engagement?.email?.opens30d) + cleanNumber(legacy.engagement?.email?.clicks30d) > 0 ? 1 : 0;
  return evidenceCount + sourceFlags + emailSignal;
};

export const buildPersonCardVNextFromLegacyV1 = (
  legacy: LegacyPersonCardV1,
  options: LegacyPersonCardAdapterOptions = {},
): PersonCardVNext => {
  const personId = cleanString(legacy.personId);
  if (!personId) {
    throw new Error('Legacy Person Card V1 requires personId to build vNext card');
  }

  const ig = legacy.engagement?.ig ?? {};
  const email = legacy.engagement?.email ?? {};
  const stage = cleanStage(legacy.lifecycleStageGuess) ?? cleanStage(ig.stage);
  const observedAt = cleanDateLike(legacy.updatedAt) ?? (typeof options.now === 'string' ? options.now : null);
  const confidence = cleanNumber(legacy.confidence);
  const igSignals = stageToIgSignals(stage);

  return buildPersonCardVNext({
    personId,
    now: options.now ?? observedAt,
    identities: {
      email: cleanString(legacy.identities?.email),
      instagramHandle: cleanString(legacy.identities?.igHandle),
    },
    channels: {
      instagramStatus: legacy.channels?.instagram ? 'known' : null,
      emailStatus: legacy.channels?.email ? 'known' : null,
    },
    scoring: {
      existingStage: stage ?? 'UNKNOWN',
      identity: {
        trustedMatchCount: confidence >= 0.75 ? 2 : confidence > 0 ? 1 : undefined,
        sourceCount: sourceCountFromLegacy(legacy),
      },
      email: {
        opens30d: cleanNumber(email.opens30d),
        clicks30d: cleanNumber(email.clicks30d),
        lastOpenAt: cleanDateLike(email.lastOpenAt),
        lastClickAt: cleanDateLike(email.lastClickAt),
      },
      instagram: {
        ...igSignals,
        follows: Boolean(legacy.channels?.instagram || legacy.identities?.igHandle),
        lastInteractionAt: cleanDateLike(ig.lastLeadAt),
      },
    },
    evidence: evidenceFromLegacy(legacy, observedAt),
  });
};

export const buildPersonCardsVNextFromLegacyV1Payload = (
  payload: LegacyPersonCardsV1Payload,
  options: LegacyPersonCardAdapterOptions = {},
): PersonCardVNext[] => {
  if (!Array.isArray(payload.cards)) return [];
  const now = options.now ?? cleanDateLike(payload.generatedAt);
  return payload.cards.map((card) => buildPersonCardVNextFromLegacyV1(card as LegacyPersonCardV1, { now }));
};
