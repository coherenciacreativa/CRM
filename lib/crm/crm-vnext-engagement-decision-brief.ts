import {
  buildCrmVNextEngagementMovementQueue,
  labelCrmVNextEngagementMovementCode,
} from './crm-vnext-engagement-movement-queue';

export const CRM_VNEXT_ENGAGEMENT_DECISION_BRIEF_SCHEMA_VERSION =
  'crm-vnext-engagement-decision-brief-2026-05-21';

type LooseRecord = Record<string, any>;

export type CrmVNextEngagementDecisionBriefCandidate = {
  rowId: string;
  personId: string | null;
  displayName: string;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    city: string | null;
    country: string | null;
  };
  movement: string;
  sourceFamily: string;
  priority: {
    before: number;
    after: number;
    delta: number;
  };
  operatorAction: {
    code: string;
    label: string;
    reviewRequired: boolean;
    reason: string;
  };
  decisionNeed: string;
  primarySignals: string[];
  reasonCodes: string[];
  riskCodes: string[];
  suggestedQuestion: string;
  suggestedInternalNextStep: string;
  allowedWithoutApproval: string[];
  blockedUntilApproval: string[];
};

export type CrmVNextEngagementDecisionBrief = {
  ok: true;
  schemaVersion: typeof CRM_VNEXT_ENGAGEMENT_DECISION_BRIEF_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_engagement_decision_brief';
  source: {
    movementRows: number;
    unmatchedRows: number;
    warmedRows: number;
    cooledRows: number;
    sourceSnapshots: number;
    latestCapturedAt: string | null;
    includeObservationOnly: boolean;
  };
  summary: {
    urgency: 'planning' | 'watch' | 'notify';
    totalCandidates: number;
    returnedCandidates: number;
    requiresAlejandroDecision: boolean;
    recommendedQuestion: string;
    approvalBoundary: string;
  };
  decisionOptions: Array<{
    id: string;
    title: string;
    approvalRequired: boolean;
    description: string;
    allowedWithoutApproval: string[];
    blockedUntilApproval: string[];
  }>;
  candidates: CrmVNextEngagementDecisionBriefCandidate[];
  safety: {
    localOnly: true;
    readOnly: true;
    outboundProhibited: true;
    recordMutationProhibited: true;
    scoreMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

type BriefOptions = Record<string, any>;

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const cleanBoolean = (value: unknown): boolean => value === true || value === 'true' || value === '1';

const cleanLimit = (value: unknown): number => {
  const parsed = cleanNumber(value, 5);
  return Math.max(1, Math.min(Math.round(parsed), 10));
};

const identityFor = (row: LooseRecord): string =>
  cleanString(row.displayName)
  || cleanString(row.card?.displayName)
  || cleanString(row.card?.identities?.email)
  || cleanString(row.card?.identities?.instagramHandle)
  || cleanString(row.email)
  || cleanString(row.instagramHandle)
  || cleanString(row.personId)
  || 'Unknown contact';

const signalLines = (row: LooseRecord): string[] => {
  const lines = [
    cleanString(row.signals?.email?.label),
    cleanString(row.signals?.instagram?.label),
  ].filter(Boolean) as string[];
  const tags = Array.isArray(row.signals?.tags)
    ? row.signals.tags.map(cleanString).filter(Boolean).slice(0, 3)
    : [];
  return [...lines, ...tags];
};

const decisionNeedFor = (row: LooseRecord): string => {
  switch (row.operatorAction?.code) {
    case 'stitch_identity':
      return 'identity_stitching_required';
    case 'respect_suppression':
    case 'restricted_human_review':
      return 'restricted_or_risk_review';
    case 'complete_profile':
      return 'profile_completion_required';
    case 'review_reply_context':
      return 'email_reply_context_review';
    case 'care_or_retention':
      return 'care_or_retention_review';
    case 'review_social_context':
      return 'social_context_review';
    case 'review_warm_contact':
      return 'warm_contact_review';
    case 'inspect_cooling':
      return 'cooling_pattern_review';
    case 'keep_observing_email':
      return 'email_watchlist';
    default:
      return 'observation_only';
  }
};

const questionFor = (row: LooseRecord): string => {
  const name = identityFor(row);
  switch (row.operatorAction?.code) {
    case 'stitch_identity':
      return `What trusted evidence should Mantis use next to stitch ${name} before any card write?`;
    case 'respect_suppression':
    case 'restricted_human_review':
      return `What human review is needed for ${name} before this signal can influence CRM action?`;
    case 'complete_profile':
      return `What identity or profile field should Mantis complete for ${name} before interpreting this signal further?`;
    case 'review_reply_context':
      return `What should we understand from ${name}'s email reply before enriching the card or planning follow-up?`;
    case 'care_or_retention':
      return `Does ${name}'s participation signal suggest care, continuity, gratitude, or simply observation?`;
    case 'review_social_context':
      return `What should Mantis understand from ${name}'s Instagram/DM context before planning anything else?`;
    case 'review_warm_contact':
      return `Does ${name}'s new warmth deserve context review, more evidence gathering, or a future approved follow-up plan?`;
    case 'inspect_cooling':
      return `Is ${name} genuinely cooling, or is this stale/partial signal that should only be observed?`;
    case 'keep_observing_email':
      return `Should ${name} stay in email watch mode, or is there known context that changes the interpretation?`;
    default:
      return `Should Mantis simply keep observing ${name}, or is there missing human context worth storing?`;
  }
};

const internalNextStepFor = (row: LooseRecord): string => {
  switch (row.operatorAction?.code) {
    case 'stitch_identity':
      return 'Run identity stitching before using this signal in any card or follow-up decision.';
    case 'complete_profile':
      return 'Complete missing identity/profile fields before treating this as a useful engagement decision.';
    case 'review_reply_context':
      return 'Inspect the reply context and ask Alejandro for relationship/program context if needed.';
    case 'care_or_retention':
      return 'Review continuity, attendance, delivery, or gratitude needs; do not frame this as an offer by default.';
    case 'review_social_context':
      return 'Inspect compact Instagram context such as DM intent, comments, location, or product interest without taking social action.';
    case 'review_warm_contact':
      return 'Review the person card and source context; prepare only an internal rationale if follow-up might matter.';
    case 'keep_observing_email':
      return 'Keep in the email watchlist and wait for stronger reply/click/participation evidence.';
    case 'inspect_cooling':
      return 'Check whether the cooling signal is real or caused by stale/partial source coverage.';
    default:
      return cleanString(row.safeNextStep) || 'Keep observing engagement until a stronger pattern emerges.';
  }
};

const shouldIncludeRow = (row: LooseRecord, includeObservationOnly: boolean): boolean => {
  if (includeObservationOnly) return true;
  return [
    'stitch_identity',
    'complete_profile',
    'respect_suppression',
    'restricted_human_review',
    'review_reply_context',
    'care_or_retention',
    'review_social_context',
    'review_warm_contact',
    'inspect_cooling',
  ].includes(row.operatorAction?.code);
};

const candidateFromRow = (row: LooseRecord): CrmVNextEngagementDecisionBriefCandidate => ({
  rowId: cleanString(row.rowId) || `${cleanString(row.personId) || 'unknown'}:movement`,
  personId: cleanString(row.personId),
  displayName: identityFor(row),
  identities: {
    email: cleanString(row.card?.identities?.email),
    instagramHandle: cleanString(row.card?.identities?.instagramHandle),
    city: cleanString(row.card?.identities?.city),
    country: cleanString(row.card?.identities?.country),
  },
  movement: cleanString(row.movement) || 'unknown',
  sourceFamily: cleanString(row.sourceFamily) || 'other',
  priority: {
    before: cleanNumber(row.before?.priorityScore),
    after: cleanNumber(row.after?.priorityScore),
    delta: cleanNumber(row.delta?.priorityScore),
  },
  operatorAction: {
    code: cleanString(row.operatorAction?.code) || 'keep_observing',
    label: cleanString(row.operatorAction?.label) || labelCrmVNextEngagementMovementCode(row.operatorAction?.code),
    reviewRequired: cleanBoolean(row.operatorAction?.reviewRequired),
    reason: cleanString(row.operatorAction?.reason) || 'No reason returned.',
  },
  decisionNeed: decisionNeedFor(row),
  primarySignals: signalLines(row).slice(0, 5),
  reasonCodes: Array.isArray(row.reasonCodes) ? row.reasonCodes.map(cleanString).filter(Boolean) as string[] : [],
  riskCodes: Array.isArray(row.riskCodes) ? row.riskCodes.map(cleanString).filter(Boolean) as string[] : [],
  suggestedQuestion: questionFor(row),
  suggestedInternalNextStep: internalNextStepFor(row),
  allowedWithoutApproval: [
    'Inspect local evidence and the current person card.',
    'Ask Alejandro for memory/context about this person.',
    'Prepare internal notes or future card-write proposals.',
  ],
  blockedUntilApproval: [
    'Outbound messages through Instagram, email, WhatsApp, Telegram, ManyChat, or any other channel.',
    'CRM card writes, Fact Store writes, score mutation, or merge operations.',
    'Live API calls or credential changes.',
  ],
});

const candidateFromUnmatched = (row: LooseRecord): CrmVNextEngagementDecisionBriefCandidate =>
  candidateFromRow({
    rowId: row.rowId,
    personId: row.email ? `email:${row.email}` : row.instagramHandle ? `ig:${row.instagramHandle}` : row.phone ? `phone:${row.phone}` : null,
    displayName: row.email || row.instagramHandle || row.phone || row.sourceKind,
    movement: 'unmatched',
    sourceFamily: row.sourceFamily,
    before: { priorityScore: 0 },
    after: { priorityScore: 0 },
    delta: { priorityScore: 0 },
    operatorAction: row.operatorAction,
    reasonCodes: [row.reason].filter(Boolean),
    riskCodes: [],
    signals: {
      email: { label: row.email ? `email ${row.email}` : null },
      instagram: { label: row.instagramHandle ? `IG ${row.instagramHandle}` : null },
      tags: [row.sourceKind].filter(Boolean),
    },
    safeNextStep: row.safeNextStep,
  });

export const buildCrmVNextEngagementDecisionBriefFromQueue = (
  queue: LooseRecord,
  options: BriefOptions = {},
): CrmVNextEngagementDecisionBrief => {
  const generatedAt = isoNow(options.now);
  const limit = cleanLimit(options.limit);
  const includeObservationOnly = cleanBoolean(options.includeObservationOnly);
  const rows = Array.isArray(queue?.rows) ? queue.rows : [];
  const unmatchedRows = Array.isArray(queue?.unmatchedRows) ? queue.unmatchedRows : [];

  const movementCandidates = rows
    .filter((row) => shouldIncludeRow(row, includeObservationOnly))
    .map(candidateFromRow);
  const unmatchedCandidates = unmatchedRows.map(candidateFromUnmatched);
  const candidates = [...unmatchedCandidates, ...movementCandidates]
    .sort((left, right) => {
      const leftReview = left.operatorAction.reviewRequired ? 1 : 0;
      const rightReview = right.operatorAction.reviewRequired ? 1 : 0;
      return (
        rightReview - leftReview
        || Math.abs(right.priority.delta) - Math.abs(left.priority.delta)
        || right.priority.after - left.priority.after
        || left.displayName.localeCompare(right.displayName)
      );
    })
    .slice(0, limit);

  const requiresAlejandroDecision = candidates.some((candidate) =>
    !['observation_only', 'email_watchlist'].includes(candidate.decisionNeed),
  );
  const urgency =
    candidates.some((candidate) => candidate.operatorAction.reviewRequired)
      ? 'notify'
      : candidates.length
        ? 'watch'
        : 'planning';

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_ENGAGEMENT_DECISION_BRIEF_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_engagement_decision_brief',
    source: {
      movementRows: cleanNumber(queue?.summary?.rows),
      unmatchedRows: cleanNumber(queue?.summary?.unmatchedRows),
      warmedRows: cleanNumber(queue?.summary?.warmedRows),
      cooledRows: cleanNumber(queue?.summary?.cooledRows),
      sourceSnapshots: cleanNumber(queue?.source?.snapshots),
      latestCapturedAt: cleanString(queue?.source?.latestCapturedAt),
      includeObservationOnly,
    },
    summary: {
      urgency,
      totalCandidates: unmatchedCandidates.length + movementCandidates.length,
      returnedCandidates: candidates.length,
      requiresAlejandroDecision,
      recommendedQuestion:
        'Which warmed contacts deserve context review, enrichment, or a future explicitly approved follow-up plan?',
      approvalBoundary:
        'Mantis may inspect and summarize local evidence. Any outbound message, CRM write, score mutation, or live-source mutation still requires explicit approval.',
    },
    decisionOptions: [
      {
        id: 'review_context_internally',
        title: 'Review context internally',
        approvalRequired: false,
        description:
          'Mantis inspects the card, source signals, and prior evidence before asking Alejandro for missing relationship context.',
        allowedWithoutApproval: ['Read local CRM artifacts.', 'Prepare internal summaries.', 'Ask Alejandro for context.'],
        blockedUntilApproval: ['Outbound messages.', 'Card writes.', 'Live source mutations.'],
      },
      {
        id: 'prepare_future_follow_up_plan',
        title: 'Prepare future follow-up plan',
        approvalRequired: true,
        description:
          'If a person looks meaningfully warm, Mantis may draft an internal rationale, but Alejandro must approve message, channel, and scope before any contact.',
        allowedWithoutApproval: ['Draft internal rationale.', 'Rank candidates by warmth and relationship fit.'],
        blockedUntilApproval: ['Instagram DM.', 'Email.', 'WhatsApp.', 'Telegram.', 'ManyChat LIVE.', 'Any automated follow-up.'],
      },
      {
        id: 'keep_observing',
        title: 'Keep observing',
        approvalRequired: false,
        description:
          'Leave the person in watch mode until stronger replies, clicks, participation, purchases, or Instagram signals arrive.',
        allowedWithoutApproval: ['Monitor local snapshots.', 'Compare future movement.'],
        blockedUntilApproval: ['Outbound messages.', 'Score or card mutation.'],
      },
    ],
    candidates,
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      recordMutationProhibited: true,
      scoreMutationProhibited: true,
      allowedUse: [
        'Prepare internal operator notes for Mantis.',
        'Ask Alejandro concise context questions.',
        'Prioritize identity stitching or card enrichment research.',
      ],
      prohibitedActions: [
        'Do not send Instagram, WhatsApp, Telegram, email, ManyChat, or other messages from this brief.',
        'Do not mutate CRM cards, Fact Store, score fields, MailerLite, Gmail, Instagram, ManyChat, Google, Shopify, WhatsApp, or credentials.',
        'Do not treat engagement warmth as permission to contact anyone.',
      ],
    },
  };
};

export const buildCrmVNextEngagementDecisionBrief = async (
  options: BriefOptions = {},
): Promise<CrmVNextEngagementDecisionBrief> => {
  const queue = await buildCrmVNextEngagementMovementQueue({
    ...options,
    limit: options.queueLimit ?? options.movementLimit ?? 40,
    snapshotLimit: options.snapshotLimit ?? 5,
    movementLimit: options.movementLimit ?? 100,
    includeUnchanged: options.includeUnchanged,
  });
  return buildCrmVNextEngagementDecisionBriefFromQueue(queue, options);
};
