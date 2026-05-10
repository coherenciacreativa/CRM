import { createHash } from 'node:crypto';
import type { CrmCardApplyPreviewOperation } from './crm-vnext-card-apply-preview';
import type { CrmConnectedEvidenceSourceInput } from './crm-vnext-deep-local-stitching';
import type { CrmVNextPersonCardStore } from './crm-vnext-card-write-apply';
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
} from './crm-vnext-card-write-apply';
import {
  buildPersonCardVNext,
  type PersonCardEvidence,
  type PersonCardVNext,
} from './person-card-vnext';

export const CRM_VNEXT_CARD_MERGE_REVIEW_RESOLVER_SCHEMA_VERSION =
  'crm-vnext-card-merge-review-resolver-2026-05-10' as const;
export const CRM_VNEXT_CARD_MERGE_REVIEW_LEDGER_ENTRY_SCHEMA_VERSION =
  'crm-vnext-card-merge-review-ledger-entry-2026-05-10' as const;

export type CrmCardMergeReviewResolverStatus =
  | 'ready_for_human_approved_merge'
  | 'blocked_missing_target_card'
  | 'blocked_missing_merge_payload'
  | 'blocked_target_identity_conflict'
  | 'blocked_unsupported_operations';

export type CrmCardMergeReviewResolverInput = {
  store: CrmVNextPersonCardStore;
  evidenceSources?: CrmCardMergeReviewSupplementalEvidenceInput[] | CrmConnectedEvidenceSourceInput[] | null;
  reviewIds?: string[] | null;
  resolveAllReady?: boolean | null;
  approvedBy?: string | null;
  commit?: boolean | null;
  ackRestrictedService?: boolean | null;
  now?: string | Date | null;
};

export type CrmCardMergeReviewSupplementalEvidenceInput = CrmConnectedEvidenceSourceInput & {
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string | null;
  groups?: string[] | string | null;
};

export type CrmCardMergeReviewSupplementalEvidenceMatch = {
  sourceId: string;
  sourceKind: string | null;
  matchedBy: string[];
  fieldsApplied: Array<'email' | 'instagramHandle' | 'phone' | 'city' | 'country' | 'emailStatus'>;
  evidence: PersonCardEvidence;
};

export type CrmCardMergeReviewResolverItem = {
  resolverItemId: string;
  reviewId: string;
  status: CrmCardMergeReviewResolverStatus;
  targetPersonId: string | null;
  subjectLabel: string;
  targetCard: {
    exists: boolean;
    personId: string | null;
    displayName: string | null;
    evidenceCount: number | null;
  };
  proposedCardDraft: PersonCardVNext | null;
  proposedResolvedCard: PersonCardVNext | null;
  supplementalEvidence: {
    matchedSources: number;
    sourceIds: string[];
    fieldsApplied: Array<'email' | 'instagramHandle' | 'phone' | 'city' | 'country' | 'emailStatus'>;
    matches: CrmCardMergeReviewSupplementalEvidenceMatch[];
  };
  operations: CrmCardApplyPreviewOperation[];
  operationIds: string[];
  approvalScopes: string[];
  restrictedService: {
    present: boolean;
    serviceKeys: string[];
    acknowledgementRequired: boolean;
  };
  blockers: string[];
  commitBlockers: string[];
  safetyNote: string;
};

export type CrmCardMergeReviewResolverReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_MERGE_REVIEW_RESOLVER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_merge_review_resolver' | 'local_merge_review_resolver';
  summary: {
    mergeReviews: number;
    selectedReviews: number;
    readyForHumanApprovedMerge: number;
    blockedReviews: number;
    restrictedServiceReviews: number;
    operationsPlanned: number;
    operationsExecuted: number;
    supplementalEvidenceSources: number;
    supplementalEvidenceMatched: number;
    supplementalFieldsApplied: number;
    committed: boolean;
    commitBlocked: boolean;
    commitBlockers: string[];
    requestedReviewIdsNotFound: string[];
  };
  reviewItems: CrmCardMergeReviewResolverItem[];
  safety: {
    localOnly: true;
    outboundProhibited: true;
    factStoreWriteProhibited: true;
    liveApiCallsProhibited: true;
    credentialReadProhibited: true;
    automaticMergeProhibited: true;
    requiresApprovedByForCommit: true;
    requiresExplicitSelectionForCommit: true;
    requiresRestrictedServiceAckForRestrictedMerge: true;
    backupRequiredForCommit: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmCardMergeReviewLedgerEntry = {
  schemaVersion: typeof CRM_VNEXT_CARD_MERGE_REVIEW_LEDGER_ENTRY_SCHEMA_VERSION;
  ledgerEntryId: string;
  committedAt: string;
  committedBy: string;
  resolverItemId: string;
  reviewId: string;
  targetPersonId: string | null;
  subjectLabel: string;
  operationIds: string[];
  restrictedServiceAcknowledged: boolean;
  safety: {
    outboundExecuted: false;
    factStoreWriteExecuted: false;
    liveApiCallsExecuted: false;
    credentialReadExecuted: false;
  };
};

export type CrmCardMergeReviewResolverStoreResult = {
  store: CrmVNextPersonCardStore;
  ledgerEntries: CrmCardMergeReviewLedgerEntry[];
};

const SUPPORTED_OPERATION_TYPES = new Set([
  'stage_merge_review',
  'add_evidence',
  'add_service_relationship',
  'mark_restricted_service',
  'add_relationship_context',
]);

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

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const cleanIdList = (values: string[] | null | undefined): string[] =>
  unique((values ?? []).map((value) => cleanString(value)).filter((value): value is string => Boolean(value)));

const safety = (): CrmCardMergeReviewResolverReport['safety'] => ({
  localOnly: true,
  outboundProhibited: true,
  factStoreWriteProhibited: true,
  liveApiCallsProhibited: true,
  credentialReadProhibited: true,
  automaticMergeProhibited: true,
  requiresApprovedByForCommit: true,
  requiresExplicitSelectionForCommit: true,
  requiresRestrictedServiceAckForRestrictedMerge: true,
  backupRequiredForCommit: true,
  allowedUse: [
    'Inspect staged merge-review items from the local vNext card store.',
    'Preview exactly how a staged merge would enrich the existing target card.',
    'Optionally include supplied read-only evidence packets, such as MailerLite subscriber rows, before resolving.',
    'Resolve reviewed merge items only after explicit local approval and backup.',
  ],
  prohibitedActions: [
    'Do not send outbound messages.',
    'Do not write Fact Store.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
    'Do not read or change credentials.',
    'Do not merge without approvedBy and an explicit review id/all-ready selection.',
    'Do not merge restricted service context without explicit restricted-service acknowledgement.',
  ],
});

const mergeEvidence = (left: PersonCardEvidence[], right: PersonCardEvidence[]): PersonCardEvidence[] =>
  unique([...left, ...right].map((item) => JSON.stringify(item)))
    .map((item) => JSON.parse(item) as PersonCardEvidence)
    .slice(0, 100);

const chooseDisplayName = (existing: PersonCardVNext, incoming: PersonCardVNext): string | null =>
  existing.displayName ?? incoming.displayName;

const RESTRICTIVE_CHANNEL_STATUSES = new Set([
  'unsubscribed',
  'suppressed',
  'bounced',
  'complained',
  'spam',
]);

const chooseChannelStatus = (existing: string | null, incoming: string | null): string | null => {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const normalizedExisting = existing.toLowerCase();
  const normalizedIncoming = incoming.toLowerCase();
  if (RESTRICTIVE_CHANNEL_STATUSES.has(normalizedIncoming)) return incoming;
  if (RESTRICTIVE_CHANNEL_STATUSES.has(normalizedExisting)) return existing;
  if (normalizedExisting === 'known') return incoming;
  return existing;
};

const mergeCards = (
  existing: PersonCardVNext,
  incoming: PersonCardVNext,
  generatedAt: string,
): PersonCardVNext =>
  buildPersonCardVNext({
    personId: existing.personId,
    displayName: chooseDisplayName(existing, incoming),
    now: generatedAt,
    identities: {
      email: existing.identities.email ?? incoming.identities.email,
      instagramHandle: existing.identities.instagramHandle ?? incoming.identities.instagramHandle,
      instagramUserId: existing.identities.instagramUserId ?? incoming.identities.instagramUserId,
      phone: existing.identities.phone ?? incoming.identities.phone,
      city: existing.identities.city ?? incoming.identities.city,
      country: existing.identities.country ?? incoming.identities.country,
    },
    channels: {
      emailStatus: chooseChannelStatus(existing.channels.email.status, incoming.channels.email.status),
      instagramStatus: chooseChannelStatus(existing.channels.instagram.status, incoming.channels.instagram.status),
      whatsappPresent: existing.channels.whatsapp.present || incoming.channels.whatsapp.present,
      whatsappStatus: chooseChannelStatus(existing.channels.whatsapp.status, incoming.channels.whatsapp.status),
      telegramPresent: existing.channels.telegram.present || incoming.channels.telegram.present,
      telegramStatus: chooseChannelStatus(existing.channels.telegram.status, incoming.channels.telegram.status),
    },
    scoring: {
      participation: {
        yogaClasses90d: Math.max(existing.products.yogaClasses90d, incoming.products.yogaClasses90d),
        happyCircle90d: Math.max(existing.products.happyCircle90d, incoming.products.happyCircle90d),
        retreatsAttended: Math.max(existing.products.retreatsAttended, incoming.products.retreatsAttended),
      },
      purchases: {
        totalSpend: Math.max(existing.products.totalSpend, incoming.products.totalSpend),
        purchaseCount: Math.max(existing.products.purchaseCount, incoming.products.purchaseCount),
        activeClient: existing.products.activeClient || incoming.products.activeClient,
      },
    },
    evidence: mergeEvidence(existing.evidence, incoming.evidence),
  });

const isPersonCard = (value: unknown): value is PersonCardVNext =>
  Boolean(
    value
    && typeof value === 'object'
    && (value as PersonCardVNext).schemaVersion === 'person-card-vnext-2026-05-08'
    && typeof (value as PersonCardVNext).personId === 'string',
  );

const stagedMergeOperation = (
  operations: CrmCardApplyPreviewOperation[],
): CrmCardApplyPreviewOperation | null =>
  operations.find((operation) => operation.type === 'stage_merge_review') ?? null;

const proposedCardDraftFrom = (
  operations: CrmCardApplyPreviewOperation[],
): PersonCardVNext | null => {
  const stage = stagedMergeOperation(operations);
  const value = stage?.value as { proposedCardDraft?: unknown } | null;
  return isPersonCard(value?.proposedCardDraft) ? value.proposedCardDraft : null;
};

const normalizeIdentity = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const evidenceGroupsText = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null => {
  const groups = (source as CrmCardMergeReviewSupplementalEvidenceInput).groups;
  if (Array.isArray(groups)) return groups.join(' ');
  return cleanString(groups);
};

const textForEvidence = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string =>
  [
    source.title,
    source.subject,
    source.email,
    source.handle,
    (source as CrmCardMergeReviewSupplementalEvidenceInput).phone,
    (source as CrmCardMergeReviewSupplementalEvidenceInput).city,
    (source as CrmCardMergeReviewSupplementalEvidenceInput).country,
    (source as CrmCardMergeReviewSupplementalEvidenceInput).status,
    evidenceGroupsText(source),
    source.snippet,
    source.text,
  ].filter(Boolean).join('\n');

const labeledValue = (text: string, labels: string[]): string | null => {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[:=-]\\s*([^\\n;,]+)`, 'i'));
  return cleanString(match?.[1]);
};

const evidencePhone = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null =>
  cleanString((source as CrmCardMergeReviewSupplementalEvidenceInput).phone)
  ?? labeledValue(textForEvidence(source), ['Phone', 'Teléfono', 'Telefono', 'WhatsApp']);

const evidenceCity = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null =>
  cleanString((source as CrmCardMergeReviewSupplementalEvidenceInput).city)
  ?? labeledValue(textForEvidence(source), ['City', 'Ciudad']);

const evidenceCountry = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null =>
  cleanString((source as CrmCardMergeReviewSupplementalEvidenceInput).country)
  ?? labeledValue(textForEvidence(source), ['Country', 'País', 'Pais']);

const evidenceStatus = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null =>
  cleanString((source as CrmCardMergeReviewSupplementalEvidenceInput).status)
  ?? labeledValue(textForEvidence(source), ['Status', 'Subscriber status', 'Email status']);

const evidenceHandle = (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput): string | null =>
  cleanString(source.handle)?.replace(/^@+/, '').toLowerCase()
  ?? labeledValue(textForEvidence(source), ['IG username', 'Instagram', 'Instagram handle'])?.replace(/^@+/, '').toLowerCase()
  ?? null;

const sourceIdForEvidence = (
  source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput,
  index: number,
): string =>
  cleanString(source.sourceId)
  ?? `supplemental-evidence:${hashId([source.sourceKind ?? null, source.email ?? null, source.title ?? null, source.snippet ?? null, String(index)])}`;

const sourceKindForEvidence = (
  source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput,
): string | null =>
  cleanString(source.sourceKind);

const matchSupplementalEvidence = (
  source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput,
  review: CrmVNextPersonCardStore['mergeReviewQueue'][number],
  proposedCardDraft: PersonCardVNext | null,
): string[] => {
  const matches: string[] = [];
  const sourceEmail = normalizeIdentity(cleanString(source.email));
  const draftEmail = normalizeIdentity(proposedCardDraft?.identities.email);
  const targetEmail = review.targetPersonId?.startsWith('email:')
    ? normalizeIdentity(review.targetPersonId.replace(/^email:/, ''))
    : '';
  if (sourceEmail && draftEmail && sourceEmail === draftEmail) matches.push('draft_email');
  if (sourceEmail && targetEmail && sourceEmail === targetEmail) matches.push('target_email');

  const sourceHandle = normalizeIdentity(evidenceHandle(source));
  const draftHandle = normalizeIdentity(proposedCardDraft?.identities.instagramHandle);
  if (sourceHandle && draftHandle && sourceHandle === draftHandle) matches.push('draft_instagram_handle');

  const evidenceText = normalizeIdentity(textForEvidence(source));
  if (draftEmail && evidenceText.includes(draftEmail)) matches.push('evidence_text_contains_draft_email');
  if (targetEmail && evidenceText.includes(targetEmail)) matches.push('evidence_text_contains_target_email');

  return unique(matches);
};

const supplementalMatchesForReview = (
  review: CrmVNextPersonCardStore['mergeReviewQueue'][number],
  proposedCardDraft: PersonCardVNext | null,
  evidenceSources: Array<CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput>,
  generatedAt: string,
): CrmCardMergeReviewSupplementalEvidenceMatch[] => {
  const result: CrmCardMergeReviewSupplementalEvidenceMatch[] = [];
  evidenceSources.forEach((source, index) => {
    const matchedBy = matchSupplementalEvidence(source, review, proposedCardDraft);
    if (!matchedBy.length) return;
    const fieldsApplied = [
      cleanString(source.email) ? 'email' : null,
      evidenceHandle(source) ? 'instagramHandle' : null,
      evidencePhone(source) ? 'phone' : null,
      evidenceCity(source) ? 'city' : null,
      evidenceCountry(source) ? 'country' : null,
      evidenceStatus(source) ? 'emailStatus' : null,
    ].filter((field): field is CrmCardMergeReviewSupplementalEvidenceMatch['fieldsApplied'][number] => Boolean(field));
    const sourceId = sourceIdForEvidence(source, index);
    result.push({
      sourceId,
      sourceKind: sourceKindForEvidence(source),
      matchedBy,
      fieldsApplied,
      evidence: {
        source: `crm-vnext-card-merge-review-resolver:${sourceId}`,
        observedAt: cleanString(source.observedAt) ?? generatedAt,
        note: [
          source.title ? `Title: ${cleanString(source.title)}` : null,
          source.email ? `Email: ${cleanString(source.email)}` : null,
          evidencePhone(source) ? `Phone: ${evidencePhone(source)}` : null,
          evidenceCity(source) ? `City: ${evidenceCity(source)}` : null,
          evidenceCountry(source) ? `Country: ${evidenceCountry(source)}` : null,
          evidenceStatus(source) ? `Status: ${evidenceStatus(source)}` : null,
          source.snippet ? `Snippet: ${cleanString(source.snippet)}` : null,
        ].filter(Boolean).join(' | ').slice(0, 500) || 'Supplemental evidence supplied for merge-review resolution.',
      },
    });
  });
  return result;
};

const supplementalCardForMatches = (
  targetPersonId: string,
  matches: CrmCardMergeReviewSupplementalEvidenceMatch[],
  sourcesById: Map<string, CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput>,
  generatedAt: string,
): PersonCardVNext | null => {
  if (!matches.length) return null;
  const matchedSources = matches.map((match) => sourcesById.get(match.sourceId)).filter(Boolean);
  if (!matchedSources.length) return null;
  const firstWith = (selector: (source: CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput) => string | null): string | null => {
    for (const source of matchedSources) {
      const value = selector(source);
      if (value) return value;
    }
    return null;
  };
  return buildPersonCardVNext({
    personId: targetPersonId,
    displayName: firstWith((source) => cleanString(source.title)),
    now: generatedAt,
    identities: {
      email: firstWith((source) => cleanString(source.email)),
      instagramHandle: firstWith(evidenceHandle),
      phone: firstWith(evidencePhone),
      city: firstWith(evidenceCity),
      country: firstWith(evidenceCountry),
    },
    channels: {
      emailStatus: firstWith(evidenceStatus),
    },
    evidence: matches.map((match) => match.evidence),
  });
};

const operationApprovalScopes = (operations: CrmCardApplyPreviewOperation[]): string[] =>
  unique(operations.flatMap((operation) => operation.approvalRequired));

const restrictedServiceKeys = (operations: CrmCardApplyPreviewOperation[]): string[] =>
  unique(operations.flatMap((operation) => {
    if (operation.type === 'mark_restricted_service') {
      const value = operation.value as { serviceKey?: unknown };
      return cleanString(value?.serviceKey) ?? 'restricted_service';
    }
    if (operation.type === 'add_service_relationship') {
      const value = operation.value as { privacy?: unknown; serviceKey?: unknown };
      return cleanString(value?.privacy) === 'restricted'
        ? cleanString(value?.serviceKey) ?? 'restricted_service'
        : [];
    }
    return [];
  }).filter((value): value is string => Boolean(value)));

const unsupportedOperationTypes = (operations: CrmCardApplyPreviewOperation[]): string[] =>
  unique(operations
    .map((operation) => operation.type)
    .filter((type) => !SUPPORTED_OPERATION_TYPES.has(type)));

const statusFor = (
  targetCard: PersonCardVNext | null,
  targetPersonId: string | null,
  proposedCard: PersonCardVNext | null,
  operations: CrmCardApplyPreviewOperation[],
): CrmCardMergeReviewResolverStatus => {
  if (!targetPersonId || !targetCard) return 'blocked_missing_target_card';
  if (!proposedCard || !stagedMergeOperation(operations)) return 'blocked_missing_merge_payload';
  if (proposedCard.personId !== targetPersonId) return 'blocked_target_identity_conflict';
  if (unsupportedOperationTypes(operations).length) return 'blocked_unsupported_operations';
  return 'ready_for_human_approved_merge';
};

const itemForReview = (
  review: CrmVNextPersonCardStore['mergeReviewQueue'][number],
  cardsById: Map<string, PersonCardVNext>,
  generatedAt: string,
  ackRestrictedService: boolean,
  evidenceSources: Array<CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput>,
  evidenceSourcesById: Map<string, CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput>,
): CrmCardMergeReviewResolverItem => {
  const targetCard = review.targetPersonId ? cardsById.get(review.targetPersonId) ?? null : null;
  const proposedCardDraft = proposedCardDraftFrom(review.operations);
  const status = statusFor(targetCard, review.targetPersonId, proposedCardDraft, review.operations);
  const supplementalMatches = supplementalMatchesForReview(review, proposedCardDraft, evidenceSources, generatedAt);
  const supplementalCard = review.targetPersonId
    ? supplementalCardForMatches(review.targetPersonId, supplementalMatches, evidenceSourcesById, generatedAt)
    : null;
  const resolvedWithoutSupplement = targetCard && proposedCardDraft && status !== 'blocked_target_identity_conflict'
    ? mergeCards(targetCard, proposedCardDraft, generatedAt)
    : null;
  const proposedResolvedCard = resolvedWithoutSupplement && supplementalCard
    ? mergeCards(resolvedWithoutSupplement, supplementalCard, generatedAt)
    : resolvedWithoutSupplement;
  const restrictedKeys = restrictedServiceKeys(review.operations);
  const unsupportedTypes = unsupportedOperationTypes(review.operations);
  const blockers = [
    status !== 'ready_for_human_approved_merge' ? status : null,
    ...unsupportedTypes.map((type) => `unsupported_operation:${type}`),
  ].filter((value): value is string => Boolean(value));
  const commitBlockers = [
    ...blockers,
    restrictedKeys.length && !ackRestrictedService ? 'restricted_service_ack_required' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    resolverItemId: `card_merge_review_resolver_${hashId([review.reviewId, review.targetPersonId, review.createdAt])}`,
    reviewId: review.reviewId,
    status,
    targetPersonId: review.targetPersonId,
    subjectLabel: review.subjectLabel,
    targetCard: {
      exists: Boolean(targetCard),
      personId: targetCard?.personId ?? null,
      displayName: targetCard?.displayName ?? null,
      evidenceCount: targetCard?.evidence.length ?? null,
    },
    proposedCardDraft,
    proposedResolvedCard,
    supplementalEvidence: {
      matchedSources: supplementalMatches.length,
      sourceIds: supplementalMatches.map((match) => match.sourceId),
      fieldsApplied: unique(supplementalMatches.flatMap((match) => match.fieldsApplied)),
      matches: supplementalMatches,
    },
    operations: review.operations,
    operationIds: review.operations.map((operation) => operation.operationId),
    approvalScopes: unique([
      ...operationApprovalScopes(review.operations),
      ...review.provenance.approvalScopes,
    ]),
    restrictedService: {
      present: restrictedKeys.length > 0,
      serviceKeys: restrictedKeys,
      acknowledgementRequired: restrictedKeys.length > 0,
    },
    blockers,
    commitBlockers,
    safetyNote: 'This is an internal merge preview. It does not send, sync, call live APIs, or touch credentials.',
  };
};

export const buildCrmVNextCardMergeReviewResolver = (
  input: CrmCardMergeReviewResolverInput,
): CrmCardMergeReviewResolverReport => {
  if (input.store.schemaVersion !== CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION) {
    throw new Error('invalid_vnext_card_store');
  }
  const generatedAt = isoNow(input.now);
  const reviewIds = cleanIdList(input.reviewIds);
  const reviewIdsSet = new Set(reviewIds);
  const selectedReviews = reviewIds.length
    ? input.store.mergeReviewQueue.filter((review) => reviewIdsSet.has(review.reviewId))
    : input.store.mergeReviewQueue;
  const requestedReviewIdsNotFound = reviewIds.filter((reviewId) =>
    !input.store.mergeReviewQueue.some((review) => review.reviewId === reviewId));
  const cardsById = new Map(input.store.cards.map((card) => [card.personId, card]));
  const ackRestrictedService = Boolean(input.ackRestrictedService);
  const approvedBy = cleanString(input.approvedBy);
  const evidenceSources = (input.evidenceSources ?? [])
    .filter((source): source is CrmCardMergeReviewSupplementalEvidenceInput | CrmConnectedEvidenceSourceInput =>
      Boolean(source && typeof source === 'object'));
  const evidenceSourcesById = new Map(evidenceSources.map((source, index) =>
    [sourceIdForEvidence(source, index), source] as const));
  const reviewItems = selectedReviews.map((review) =>
    itemForReview(review, cardsById, generatedAt, ackRestrictedService, evidenceSources, evidenceSourcesById));
  const commitBlockers = unique([
    input.commit && !approvedBy ? 'approved_by_required_for_commit' : null,
    input.commit && !input.resolveAllReady && reviewIds.length === 0
      ? 'explicit_review_id_or_resolve_all_ready_required_for_commit'
      : null,
    input.commit && selectedReviews.length === 0 ? 'no_selected_merge_reviews' : null,
    ...requestedReviewIdsNotFound.map((reviewId) => `requested_review_id_not_found:${reviewId}`),
    ...reviewItems.flatMap((item) => item.commitBlockers),
  ].filter((value): value is string => Boolean(value)));
  const readyItems = reviewItems.filter((item) => item.status === 'ready_for_human_approved_merge');
  const committed = Boolean(input.commit && !commitBlockers.length);
  const operationsPlanned = reviewItems.reduce((sum, item) => sum + item.operations.length, 0);

  return {
    schemaVersion: CRM_VNEXT_CARD_MERGE_REVIEW_RESOLVER_SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_merge_review_resolver' : 'dry_run_merge_review_resolver',
    summary: {
      mergeReviews: input.store.mergeReviewQueue.length,
      selectedReviews: reviewItems.length,
      readyForHumanApprovedMerge: readyItems.length,
      blockedReviews: reviewItems.filter((item) => item.status !== 'ready_for_human_approved_merge').length,
      restrictedServiceReviews: reviewItems.filter((item) => item.restrictedService.present).length,
      operationsPlanned,
      operationsExecuted: committed ? operationsPlanned : 0,
      supplementalEvidenceSources: evidenceSources.length,
      supplementalEvidenceMatched: reviewItems.reduce((sum, item) => sum + item.supplementalEvidence.matchedSources, 0),
      supplementalFieldsApplied: reviewItems.reduce((sum, item) => sum + item.supplementalEvidence.fieldsApplied.length, 0),
      committed,
      commitBlocked: Boolean(input.commit && commitBlockers.length),
      commitBlockers,
      requestedReviewIdsNotFound,
    },
    reviewItems,
    safety: safety(),
  };
};

export const applyCrmVNextCardMergeReviewResolutionToStore = (
  input: {
    store: CrmVNextPersonCardStore;
    report: CrmCardMergeReviewResolverReport;
    approvedBy: string;
    committedAt?: string | Date | null;
  },
): CrmCardMergeReviewResolverStoreResult => {
  const committedAt = isoNow(input.committedAt ?? input.report.generatedAt);
  const cardsById = new Map(input.store.cards.map((card) => [card.personId, card]));
  const resolvedReviewIds = new Set<string>();
  const ledgerEntries: CrmCardMergeReviewLedgerEntry[] = [];

  for (const item of input.report.reviewItems.filter((reviewItem) =>
    reviewItem.status === 'ready_for_human_approved_merge'
    && !reviewItem.commitBlockers.length
    && reviewItem.proposedResolvedCard)) {
    cardsById.set(item.proposedResolvedCard.personId, item.proposedResolvedCard);
    resolvedReviewIds.add(item.reviewId);
    ledgerEntries.push({
      schemaVersion: CRM_VNEXT_CARD_MERGE_REVIEW_LEDGER_ENTRY_SCHEMA_VERSION,
      ledgerEntryId: `card_merge_review_ledger_${hashId([item.resolverItemId, committedAt])}`,
      committedAt,
      committedBy: input.approvedBy,
      resolverItemId: item.resolverItemId,
      reviewId: item.reviewId,
      targetPersonId: item.targetPersonId,
      subjectLabel: item.subjectLabel,
      operationIds: item.operationIds,
      restrictedServiceAcknowledged: item.restrictedService.present,
      safety: {
        outboundExecuted: false,
        factStoreWriteExecuted: false,
        liveApiCallsExecuted: false,
        credentialReadExecuted: false,
      },
    });
  }

  return {
    store: {
      schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
      generatedAt: committedAt,
      base: {
        kind: 'vnext-card-store',
        sourceKind: 'previous-vnext-card-store',
        cardsBeforeApply: input.store.cards.length,
      },
      cards: Array.from(cardsById.values()).sort((a, b) => a.personId.localeCompare(b.personId)),
      mergeReviewQueue: input.store.mergeReviewQueue.filter((review) => !resolvedReviewIds.has(review.reviewId)),
      provenance: input.store.provenance,
    },
    ledgerEntries,
  };
};
