import type { CrmStoredFact } from './crm-vnext-fact-store';
import type { PersonCardEvidence, PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_IDENTITY_REVIEW_SCHEMA_VERSION =
  'crm-vnext-identity-review-2026-05-09' as const;

export type CrmIdentityReviewStatus =
  | 'ready_for_preview'
  | 'needs_identity_review'
  | 'unmatched'
  | 'needs_business_review';

export type CrmIdentityMatchReason =
  | 'person_id_exact'
  | 'email_exact'
  | 'instagram_handle_exact'
  | 'phone_exact'
  | 'display_name_exact';

export type CrmIdentityReviewCandidate = {
  personId: string;
  displayName: string | null;
  identities: PersonCardVNext['identities'];
  confidence: number;
  matchReasons: CrmIdentityMatchReason[];
};

export type CrmIdentityReviewPreview = {
  personId: string;
  currentCard: {
    displayName: string | null;
    stage: PersonCardVNext['scoring']['stage'];
    priorityScore: number;
    nextAction: PersonCardVNext['nextAction']['code'];
  };
  proposedEvidence: PersonCardEvidence;
  proposedTags: string[];
  scoringHints: CrmStoredFact['fact']['suggestedCardPatch']['scoringHints'];
  safetyNote: string;
};

export type CrmIdentityReviewItem = {
  storedFactId: string;
  factId: string;
  status: CrmIdentityReviewStatus;
  reason: string;
  fact: CrmStoredFact['fact'];
  cardApply: CrmStoredFact['cardApply'];
  candidates: CrmIdentityReviewCandidate[];
  preview: CrmIdentityReviewPreview | null;
};

export type CrmIdentityReviewSummary = {
  facts: number;
  readyForPreview: number;
  needsIdentityReview: number;
  unmatched: number;
  needsBusinessReview: number;
  candidates: number;
  exactIdentityMatches: number;
};

export type CrmIdentityReviewSafety = {
  readOnly: true;
  outboundProhibited: true;
  cardMutationProhibited: true;
  credentialReadProhibited: true;
  allowedUse: string[];
  prohibitedActions: string[];
};

export type CrmIdentityReviewReport = {
  schemaVersion: typeof CRM_VNEXT_IDENTITY_REVIEW_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_identity_review';
  summary: CrmIdentityReviewSummary;
  items: CrmIdentityReviewItem[];
  safety: CrmIdentityReviewSafety;
};

export type CrmIdentityReviewInput = {
  facts: CrmStoredFact[];
  cards: PersonCardVNext[];
  now?: string | Date | null;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const clean = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeText = (value: string | null | undefined): string | null => {
  const raw = clean(value);
  if (!raw) return null;
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const normalizeHandle = (value: string | null | undefined): string | null =>
  normalizeText(clean(value)?.replace(/^@+/, '') ?? null);

const normalizeEmail = (value: string | null | undefined): string | null =>
  normalizeText(value);

const normalizePhone = (value: string | null | undefined): string | null => {
  const raw = clean(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
};

const hasStableIdentity = (stored: CrmStoredFact): boolean =>
  Boolean(
    stored.fact.person.personIdHint
      || stored.fact.person.email
      || stored.fact.person.instagramHandle
      || stored.fact.person.phone,
  );

const addReason = (
  reasons: CrmIdentityMatchReason[],
  reason: CrmIdentityMatchReason,
) => {
  if (!reasons.includes(reason)) reasons.push(reason);
};

const confidenceFor = (reasons: CrmIdentityMatchReason[]): number => {
  const base = reasons.reduce((max, reason) => {
    switch (reason) {
      case 'person_id_exact':
        return Math.max(max, 100);
      case 'email_exact':
        return Math.max(max, 98);
      case 'instagram_handle_exact':
        return Math.max(max, 95);
      case 'phone_exact':
        return Math.max(max, 93);
      case 'display_name_exact':
        return Math.max(max, 60);
      default:
        return max;
    }
  }, 0);
  return Math.min(100, base + Math.max(0, reasons.length - 1) * 2);
};

const exactIdentityReasons = new Set<CrmIdentityMatchReason>([
  'person_id_exact',
  'email_exact',
  'instagram_handle_exact',
  'phone_exact',
]);

const findCandidates = (
  stored: CrmStoredFact,
  cards: PersonCardVNext[],
): CrmIdentityReviewCandidate[] => {
  const factPersonId = clean(stored.fact.person.personIdHint);
  const factEmail = normalizeEmail(stored.fact.person.email);
  const factHandle = normalizeHandle(stored.fact.person.instagramHandle);
  const factPhone = normalizePhone(stored.fact.person.phone);
  const factName = normalizeText(stored.fact.person.rawName);
  const candidates: CrmIdentityReviewCandidate[] = [];

  for (const card of cards) {
    const reasons: CrmIdentityMatchReason[] = [];
    const cardEmail = normalizeEmail(card.identities.email);
    const cardHandle = normalizeHandle(card.identities.instagramHandle);
    const cardPhone = normalizePhone(card.identities.phone);

    if (factPersonId && factPersonId === card.personId) {
      addReason(reasons, 'person_id_exact');
    }
    if (factPersonId?.startsWith('email:') && cardEmail && factPersonId.slice(6).toLowerCase() === cardEmail) {
      addReason(reasons, 'person_id_exact');
    }
    if (factPersonId?.startsWith('ig:') && cardHandle && normalizeHandle(factPersonId.slice(3)) === cardHandle) {
      addReason(reasons, 'person_id_exact');
    }
    if (factEmail && cardEmail && factEmail === cardEmail) {
      addReason(reasons, 'email_exact');
    }
    if (factHandle && cardHandle && factHandle === cardHandle) {
      addReason(reasons, 'instagram_handle_exact');
    }
    if (factPhone && cardPhone && factPhone === cardPhone) {
      addReason(reasons, 'phone_exact');
    }
    if (factName && normalizeText(card.displayName) === factName) {
      addReason(reasons, 'display_name_exact');
    }

    if (!reasons.length) continue;
    candidates.push({
      personId: card.personId,
      displayName: card.displayName,
      identities: card.identities,
      confidence: confidenceFor(reasons),
      matchReasons: reasons,
    });
  }

  const deduped = new Map<string, CrmIdentityReviewCandidate>();
  for (const candidate of candidates) {
    const existing = deduped.get(candidate.personId);
    if (!existing || candidate.confidence > existing.confidence) {
      deduped.set(candidate.personId, candidate);
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => b.confidence - a.confidence || a.personId.localeCompare(b.personId),
  );
};

const statusFor = (
  stored: CrmStoredFact,
  candidates: CrmIdentityReviewCandidate[],
): { status: CrmIdentityReviewStatus; reason: string } => {
  const stable = hasStableIdentity(stored);

  if (!stable) {
    return {
      status: 'needs_identity_review',
      reason: candidates.length
        ? 'Only a weak name match exists; a stable identity is required before card rebuild.'
        : 'No stable identity is present yet.',
    };
  }

  if (!candidates.length) {
    return {
      status: 'unmatched',
      reason: 'The fact has a stable identity, but no local person card matched it.',
    };
  }

  if (candidates.length > 1) {
    return {
      status: 'needs_identity_review',
      reason: 'More than one local card matched; Mantis should ask for identity disambiguation.',
    };
  }

  if (stored.cardApply.status === 'needs_review') {
    return {
      status: 'needs_business_review',
      reason: stored.cardApply.reason ?? 'The fact is identity-matched but requires business review before card rebuild.',
    };
  }

  return {
    status: 'ready_for_preview',
    reason: 'One stable local card matched and the fact is ready for card-rebuild preview.',
  };
};

const buildPreview = (
  stored: CrmStoredFact,
  cards: PersonCardVNext[],
  status: CrmIdentityReviewStatus,
  candidates: CrmIdentityReviewCandidate[],
): CrmIdentityReviewPreview | null => {
  if (status !== 'ready_for_preview' || candidates.length !== 1) return null;
  const card = cards.find((item) => item.personId === candidates[0].personId);
  if (!card) return null;

  return {
    personId: card.personId,
    currentCard: {
      displayName: card.displayName,
      stage: card.scoring.stage,
      priorityScore: card.scoring.priorityScore,
      nextAction: card.nextAction.code,
    },
    proposedEvidence: stored.fact.suggestedCardPatch.evidence,
    proposedTags: stored.fact.suggestedCardPatch.tags,
    scoringHints: stored.fact.suggestedCardPatch.scoringHints,
    safetyNote: 'Preview only. No person card mutation has been performed.',
  };
};

const safety = (): CrmIdentityReviewSafety => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  credentialReadProhibited: true,
  allowedUse: [
    'Review stored facts against local person cards.',
    'Preview how a stored fact could enrich one card.',
    'Separate identity questions from business-review questions.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from this report.',
    'Do not send outbound messages.',
    'Do not read, refresh, or change credentials.',
    'Do not auto-apply facts that require identity or business review.',
  ],
});

export const buildCrmVNextIdentityReview = (
  input: CrmIdentityReviewInput,
): CrmIdentityReviewReport => {
  const generatedAt = isoNow(input.now);
  const cards = input.cards;
  const items = input.facts.map((stored): CrmIdentityReviewItem => {
    const candidates = findCandidates(stored, cards);
    const { status, reason } = statusFor(stored, candidates);
    return {
      storedFactId: stored.storedFactId,
      factId: stored.factId,
      status,
      reason,
      fact: stored.fact,
      cardApply: stored.cardApply,
      candidates,
      preview: buildPreview(stored, cards, status, candidates),
    };
  });

  return {
    schemaVersion: CRM_VNEXT_IDENTITY_REVIEW_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_identity_review',
    summary: {
      facts: items.length,
      readyForPreview: items.filter((item) => item.status === 'ready_for_preview').length,
      needsIdentityReview: items.filter((item) => item.status === 'needs_identity_review').length,
      unmatched: items.filter((item) => item.status === 'unmatched').length,
      needsBusinessReview: items.filter((item) => item.status === 'needs_business_review').length,
      candidates: items.reduce((sum, item) => sum + item.candidates.length, 0),
      exactIdentityMatches: items.filter((item) =>
        item.candidates.some((candidate) =>
          candidate.matchReasons.some((reason) => exactIdentityReasons.has(reason)),
        ),
      ).length,
    },
    items,
    safety: safety(),
  };
};
