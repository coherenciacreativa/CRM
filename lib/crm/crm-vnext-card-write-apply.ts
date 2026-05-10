import { createHash } from 'node:crypto';
import {
  buildCrmVNextEvidenceReviewPacket,
} from './crm-vnext-evidence-review-packet';
import {
  buildCrmVNextStitchBatchReview,
  type CrmStitchBatchReviewAction,
  type CrmStitchBatchReviewInput,
  type CrmStitchBatchReviewReport,
} from './crm-vnext-stitch-batch-review';
import {
  buildCrmVNextCardWriteApprovalPacket,
  type CrmCardWriteApprovalPacketItem,
  type CrmCardWriteApprovalPacketReport,
} from './crm-vnext-card-write-approval-packet';
import type {
  CrmCardApplyPreviewItem,
  CrmCardApplyPreviewOperation,
} from './crm-vnext-card-apply-preview';
import type { PersonCardEvidence, PersonCardVNext } from './person-card-vnext';
import { buildPersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_CARD_WRITE_APPLY_SCHEMA_VERSION =
  'crm-vnext-card-write-apply-2026-05-10' as const;
export const CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION =
  'crm-vnext-person-card-store-2026-05-10' as const;
export const CRM_VNEXT_CARD_WRITE_LEDGER_ENTRY_SCHEMA_VERSION =
  'crm-vnext-card-write-ledger-entry-2026-05-10' as const;

export type CrmCardWriteApplyMutationKind =
  | 'upsert_vnext_card'
  | 'stage_merge_review';

export type CrmCardWriteApplyPlanItemStatus =
  | 'ready_to_commit'
  | 'blocked_not_ready_for_approval'
  | 'blocked_missing_card_draft'
  | 'blocked_unsupported_action';

export type CrmCardWriteApplyInput = CrmStitchBatchReviewInput & {
  packet?: CrmCardWriteApprovalPacketReport | null;
  batch?: CrmStitchBatchReviewReport | null;
  approvalItemIds?: string[] | null;
  applyAllReady?: boolean | null;
  approvedBy?: string | null;
  commit?: boolean | null;
};

export type CrmCardWriteApplyProvenance = {
  provenanceId: string;
  approvalItemId: string;
  batchItemId: string;
  previewId: string;
  targetPersonId: string | null;
  approvedBy: string | null;
  approvedAt: string;
  recommendedAction: CrmStitchBatchReviewAction;
  mutationKind: CrmCardWriteApplyMutationKind;
  approvalScopes: string[];
  operationIds: string[];
  evidenceDecisionRecordIds: string[];
  safety: {
    outboundExecuted: false;
    factStoreWriteExecuted: false;
    liveApiCallsExecuted: false;
    credentialReadExecuted: false;
  };
};

export type CrmCardWriteApplyPlanItem = {
  applyItemId: string;
  status: CrmCardWriteApplyPlanItemStatus;
  approvalItemId: string;
  batchItemId: string;
  previewId: string;
  targetPersonId: string | null;
  subject: CrmCardWriteApprovalPacketItem['subject'];
  recommendedAction: CrmStitchBatchReviewAction;
  mutationKind: CrmCardWriteApplyMutationKind | null;
  proposedCard: PersonCardVNext | null;
  operations: CrmCardApplyPreviewOperation[];
  approvalScopes: string[];
  blockers: string[];
  commitBlockers: string[];
  provenance: CrmCardWriteApplyProvenance | null;
};

export type CrmCardWriteLedgerEntry = {
  schemaVersion: typeof CRM_VNEXT_CARD_WRITE_LEDGER_ENTRY_SCHEMA_VERSION;
  ledgerEntryId: string;
  committedAt: string;
  committedBy: string;
  applyItemId: string;
  approvalItemId: string;
  targetPersonId: string | null;
  mutationKind: CrmCardWriteApplyMutationKind;
  subjectLabel: string;
  operationIds: string[];
  cardPersonId: string | null;
  safety: {
    outboundExecuted: false;
    factStoreWriteExecuted: false;
    liveApiCallsExecuted: false;
    credentialReadExecuted: false;
  };
};

export type CrmVNextPersonCardStore = {
  schemaVersion: typeof CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION;
  generatedAt: string;
  base: {
    kind: 'vnext-card-store';
    sourceKind: 'legacy-person-cards-v1-derived' | 'previous-vnext-card-store';
    cardsBeforeApply: number;
  };
  cards: PersonCardVNext[];
  mergeReviewQueue: Array<{
    reviewId: string;
    createdAt: string;
    approvalItemId: string;
    targetPersonId: string | null;
    subjectLabel: string;
    operations: CrmCardApplyPreviewOperation[];
    provenance: CrmCardWriteApplyProvenance;
  }>;
  provenance: CrmCardWriteApplyProvenance[];
};

export type CrmCardWriteApplyReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_WRITE_APPLY_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_card_write_apply' | 'local_card_write_apply';
  summary: {
    approvalItems: number;
    readyApprovalItems: number;
    selectedItems: number;
    commitEligibleItems: number;
    blockedItems: number;
    cardsToUpsert: number;
    mergeReviewsToStage: number;
    operationsPlanned: number;
    operationsExecuted: number;
    committed: boolean;
    commitBlocked: boolean;
    commitBlockers: string[];
  };
  packetSummary: CrmCardWriteApprovalPacketReport['summary'];
  batchSummary: CrmStitchBatchReviewReport['summary'];
  planItems: CrmCardWriteApplyPlanItem[];
  safety: {
    localOnly: true;
    outboundProhibited: true;
    factStoreWriteProhibited: true;
    liveApiCallsProhibited: true;
    credentialReadProhibited: true;
    requiresApprovedByForCommit: true;
    requiresExplicitSelectionForCommit: true;
    backupRequiredForCommit: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmCardWriteApplyStoreResult = {
  store: CrmVNextPersonCardStore;
  ledgerEntries: CrmCardWriteLedgerEntry[];
};

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

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const cleanIdList = (values: string[] | null | undefined): string[] =>
  unique((values ?? []).map((value) => cleanString(value)).filter((value): value is string => Boolean(value)));

const safety = (): CrmCardWriteApplyReport['safety'] => ({
  localOnly: true,
  outboundProhibited: true,
  factStoreWriteProhibited: true,
  liveApiCallsProhibited: true,
  credentialReadProhibited: true,
  requiresApprovedByForCommit: true,
  requiresExplicitSelectionForCommit: true,
  backupRequiredForCommit: true,
  allowedUse: [
    'Apply only approval-ready CRM vNext card items to a local vNext card store.',
    'Create a backup and provenance ledger before committed local writes.',
    'Stage merge-review items without merging records automatically.',
  ],
  prohibitedActions: [
    'Do not send outbound messages.',
    'Do not write Fact Store.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
    'Do not read or change credentials.',
    'Do not merge records automatically.',
    'Do not commit without approvedBy and an explicit selection/all-ready flag.',
  ],
});

const evidenceDecisionRecordIdsFor = (preview: CrmCardApplyPreviewItem): string[] =>
  preview.identityResolution.evidenceDecisionSummary.appliedDecisionRecordIds;

const mutationKindFor = (
  approvalItem: CrmCardWriteApprovalPacketItem,
  preview: CrmCardApplyPreviewItem | null,
): CrmCardWriteApplyMutationKind | null => {
  if (!preview) return null;
  if (approvalItem.recommendedAction === 'review_merge_or_create') return 'stage_merge_review';
  if (
    approvalItem.recommendedAction === 'create_card_candidate'
    || approvalItem.recommendedAction === 'review_deferred_write'
    || approvalItem.recommendedAction === 'enrich_existing_card'
  ) {
    return 'upsert_vnext_card';
  }
  return null;
};

const evidenceFromOperations = (
  operations: CrmCardApplyPreviewOperation[],
  generatedAt: string,
): PersonCardEvidence[] => {
  const evidenceFromAddOps = operations
    .filter((operation) => operation.type === 'add_evidence')
    .map((operation) => operation.value)
    .filter((value): value is PersonCardEvidence => Boolean(value && typeof value === 'object'));
  const serviceEvidence = operations
    .filter((operation) => operation.type === 'add_service_relationship')
    .map((operation) => ({
      source: 'crm-vnext-card-write-apply:service_relationship',
      observedAt: generatedAt,
      note: cleanString((operation.value as { label?: unknown; role?: unknown; status?: unknown })?.label)
        ?? cleanString(operation.reason)
        ?? 'Approved CRM vNext service relationship.',
    }));
  const contextEvidence = operations
    .filter((operation) => operation.type === 'add_relationship_context')
    .map((operation) => ({
      source: 'crm-vnext-card-write-apply:relationship_context',
      observedAt: generatedAt,
      note: cleanString((operation.value as { detail?: unknown; code?: unknown })?.detail)
        ?? cleanString(operation.reason)
        ?? 'Approved CRM vNext relationship context.',
    }));

  return unique([...evidenceFromAddOps, ...serviceEvidence, ...contextEvidence].map((item) => JSON.stringify(item)))
    .map((item) => JSON.parse(item) as PersonCardEvidence);
};

const scoringFromOperations = (
  operations: CrmCardApplyPreviewOperation[],
  currentCard: PersonCardVNext | null,
): Parameters<typeof buildPersonCardVNext>[0]['scoring'] => {
  const services = operations
    .filter((operation) => operation.type === 'add_service_relationship')
    .map((operation) => operation.value as { serviceKey?: unknown });
  const serviceKeys = new Set(services.map((service) => cleanString(service.serviceKey)).filter(Boolean));

  return {
    participation: {
      yogaClasses90d: Math.max(currentCard?.products.yogaClasses90d ?? 0, serviceKeys.has('yoga_classes') ? 1 : 0),
      happyCircle90d: Math.max(currentCard?.products.happyCircle90d ?? 0, serviceKeys.has('happy_circle') ? 1 : 0),
      retreatsAttended: Math.max(currentCard?.products.retreatsAttended ?? 0, serviceKeys.has('retreats') ? 1 : 0),
    },
    purchases: {
      activeClient: Boolean(
        currentCard?.products.activeClient
          || serviceKeys.has('therapy_consultations')
          || serviceKeys.has('mentorship'),
      ),
      purchaseCount: Math.max(
        currentCard?.products.purchaseCount ?? 0,
        serviceKeys.has('therapy_consultations') || serviceKeys.has('mentorship') || serviceKeys.has('digital_products') ? 1 : 0,
      ),
      totalSpend: currentCard?.products.totalSpend ?? 0,
    },
  };
};

const onlyIdentityCandidate = (values: string[]): string | null => {
  const cleaned = unique(values.map((value) => cleanString(value)).filter((value): value is string => Boolean(value)));
  return cleaned.length === 1 ? cleaned[0] : null;
};

const mergedCardForPreview = (
  preview: CrmCardApplyPreviewItem,
  generatedAt: string,
  currentFullCard: PersonCardVNext | null,
): PersonCardVNext | null => {
  if (preview.proposedCardDraft) return preview.proposedCardDraft;
  if (!preview.currentCard.exists || !preview.targetPersonId || !currentFullCard) return null;

  const existingEvidence = currentFullCard.evidence;
  const operationEvidence = evidenceFromOperations(preview.operations, generatedAt);
  const confirmedEmail = onlyIdentityCandidate(preview.identityResolution.evidenceDecisionSummary.confirmedSubjectEmails);
  const phoneCandidate = onlyIdentityCandidate(preview.identityResolution.phoneCandidates);
  const instagramCandidate = onlyIdentityCandidate(preview.identityResolution.instagramHandles);
  const displayNameCandidate = preview.identityResolution.fullNameCandidates[0] ?? null;

  return buildPersonCardVNext({
    personId: preview.targetPersonId,
    displayName: currentFullCard.displayName ?? displayNameCandidate,
    now: generatedAt,
    identities: {
      email: currentFullCard.identities.email ?? confirmedEmail,
      instagramHandle: currentFullCard.identities.instagramHandle ?? instagramCandidate,
      instagramUserId: currentFullCard.identities.instagramUserId,
      phone: currentFullCard.identities.phone ?? phoneCandidate,
      city: currentFullCard.identities.city,
      country: currentFullCard.identities.country,
    },
    channels: {
      emailStatus: currentFullCard.channels.email.status,
      instagramStatus: currentFullCard.channels.instagram.status,
      whatsappPresent: currentFullCard.channels.whatsapp.present,
      whatsappStatus: currentFullCard.channels.whatsapp.status,
      telegramPresent: currentFullCard.channels.telegram.present,
      telegramStatus: currentFullCard.channels.telegram.status,
    },
    scoring: scoringFromOperations(preview.operations, currentFullCard),
    evidence: unique([...existingEvidence, ...operationEvidence].map((item) => JSON.stringify(item)))
      .map((item) => JSON.parse(item) as PersonCardEvidence),
  });
};

const statusForPlanItem = (
  approvalItem: CrmCardWriteApprovalPacketItem,
  preview: CrmCardApplyPreviewItem | null,
  mutationKind: CrmCardWriteApplyMutationKind | null,
  proposedCard: PersonCardVNext | null,
): CrmCardWriteApplyPlanItemStatus => {
  if (approvalItem.status !== 'ready_for_human_approval') return 'blocked_not_ready_for_approval';
  if (!mutationKind) return 'blocked_unsupported_action';
  if (mutationKind === 'upsert_vnext_card' && !proposedCard) return 'blocked_missing_card_draft';
  return 'ready_to_commit';
};

const provenanceFor = (
  approvalItem: CrmCardWriteApprovalPacketItem,
  preview: CrmCardApplyPreviewItem,
  mutationKind: CrmCardWriteApplyMutationKind,
  generatedAt: string,
  approvedBy: string | null,
): CrmCardWriteApplyProvenance => ({
  provenanceId: `card_write_provenance_${hashId([approvalItem.approvalItemId, preview.previewId, mutationKind])}`,
  approvalItemId: approvalItem.approvalItemId,
  batchItemId: approvalItem.batchItemId,
  previewId: preview.previewId,
  targetPersonId: approvalItem.targetPersonId,
  approvedBy,
  approvedAt: generatedAt,
  recommendedAction: approvalItem.recommendedAction,
  mutationKind,
  approvalScopes: approvalItem.approvalScopes,
  operationIds: preview.operations.map((operation) => operation.operationId),
  evidenceDecisionRecordIds: evidenceDecisionRecordIdsFor(preview),
  safety: {
    outboundExecuted: false,
    factStoreWriteExecuted: false,
    liveApiCallsExecuted: false,
    credentialReadExecuted: false,
  },
});

const planItemFor = (
  approvalItem: CrmCardWriteApprovalPacketItem,
  preview: CrmCardApplyPreviewItem | null,
  generatedAt: string,
  approvedBy: string | null,
  currentFullCard: PersonCardVNext | null,
): CrmCardWriteApplyPlanItem => {
  const mutationKind = mutationKindFor(approvalItem, preview);
  const proposedCard = preview && mutationKind === 'upsert_vnext_card'
    ? mergedCardForPreview(preview, generatedAt, currentFullCard)
    : null;
  const status = statusForPlanItem(approvalItem, preview, mutationKind, proposedCard);
  const commitBlockers = [
    status !== 'ready_to_commit' ? status : null,
    ...(approvalItem.openQuestions.length ? ['open_evidence_questions'] : []),
  ].filter((value): value is string => Boolean(value));

  return {
    applyItemId: `card_write_apply_${hashId([approvalItem.approvalItemId, preview?.previewId, mutationKind])}`,
    status,
    approvalItemId: approvalItem.approvalItemId,
    batchItemId: approvalItem.batchItemId,
    previewId: preview?.previewId ?? approvalItem.batchItemId,
    targetPersonId: approvalItem.targetPersonId,
    subject: approvalItem.subject,
    recommendedAction: approvalItem.recommendedAction,
    mutationKind,
    proposedCard,
    operations: preview?.operations ?? [],
    approvalScopes: approvalItem.approvalScopes,
    blockers: approvalItem.blockers,
    commitBlockers,
    provenance: preview && mutationKind
      ? provenanceFor(approvalItem, preview, mutationKind, generatedAt, approvedBy)
      : null,
  };
};

export const buildCrmVNextCardWriteApply = (
  input: CrmCardWriteApplyInput,
): CrmCardWriteApplyReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const approvedBy = cleanString(input.approvedBy);
  const evidencePacket = buildCrmVNextEvidenceReviewPacket({
    ...input,
    now: generatedAt,
  });
  const batch = input.batch ?? buildCrmVNextStitchBatchReview({
    ...input,
    packet: evidencePacket,
    now: generatedAt,
  });
  const packet = input.packet ?? buildCrmVNextCardWriteApprovalPacket({
    ...input,
    batch,
    now: generatedAt,
  });
  const approvalItemIds = cleanIdList(input.approvalItemIds);
  const readyApprovalItems = packet.approvalItems.filter((item) => item.status === 'ready_for_human_approval');
  const selectedApprovalItems = approvalItemIds.length
    ? packet.approvalItems.filter((item) => approvalItemIds.includes(item.approvalItemId))
    : readyApprovalItems;
  const previewById = new Map(evidencePacket.preview.previews.map((preview) => [preview.previewId, preview]));
  const cardsById = new Map(input.cards.map((card) => [card.personId, card]));
  const batchByApprovalItemId = new Map(batch.items.map((item) => [
    packet.approvalItems.find((approval) => approval.batchItemId === item.batchItemId)?.approvalItemId,
    item,
  ]));
  const planItems = selectedApprovalItems.map((approvalItem) => {
    const batchItem = batchByApprovalItemId.get(approvalItem.approvalItemId);
    return planItemFor(
      approvalItem,
      batchItem ? previewById.get(batchItem.previewId) ?? null : null,
      generatedAt,
      approvedBy,
      approvalItem.targetPersonId ? cardsById.get(approvalItem.targetPersonId) ?? null : null,
    );
  });
  const operationsPlanned = planItems.reduce((sum, item) => sum + item.operations.length, 0);
  const commitBlockers = [
    input.commit && !approvedBy ? 'approved_by_required_for_commit' : null,
    input.commit && !input.applyAllReady && approvalItemIds.length === 0
      ? 'explicit_approval_item_selection_or_apply_all_ready_required_for_commit'
      : null,
    input.commit && planItems.length === 0 ? 'no_selected_approval_items' : null,
    ...planItems.flatMap((item) => item.commitBlockers),
  ].filter((value): value is string => Boolean(value));
  const commitEligibleItems = planItems.filter((item) => item.status === 'ready_to_commit');
  const committed = Boolean(input.commit && !commitBlockers.length);

  return {
    schemaVersion: CRM_VNEXT_CARD_WRITE_APPLY_SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_card_write_apply' : 'dry_run_card_write_apply',
    summary: {
      approvalItems: packet.approvalItems.length,
      readyApprovalItems: readyApprovalItems.length,
      selectedItems: planItems.length,
      commitEligibleItems: commitEligibleItems.length,
      blockedItems: planItems.filter((item) => item.status !== 'ready_to_commit').length,
      cardsToUpsert: planItems.filter((item) => item.status === 'ready_to_commit' && item.mutationKind === 'upsert_vnext_card').length,
      mergeReviewsToStage: planItems.filter((item) => item.status === 'ready_to_commit' && item.mutationKind === 'stage_merge_review').length,
      operationsPlanned,
      operationsExecuted: committed ? operationsPlanned : 0,
      committed,
      commitBlocked: Boolean(input.commit && commitBlockers.length),
      commitBlockers: unique(commitBlockers),
    },
    packetSummary: packet.summary,
    batchSummary: batch.summary,
    planItems,
    safety: safety(),
  };
};

const mergeEvidence = (left: PersonCardEvidence[], right: PersonCardEvidence[]): PersonCardEvidence[] =>
  unique([...left, ...right].map((item) => JSON.stringify(item)))
    .map((item) => JSON.parse(item) as PersonCardEvidence)
    .slice(0, 80);

const mergeCard = (existing: PersonCardVNext | null, incoming: PersonCardVNext): PersonCardVNext => {
  if (!existing) return incoming;
  return buildPersonCardVNext({
    personId: existing.personId,
    displayName: incoming.displayName ?? existing.displayName,
    now: incoming.updatedAt,
    identities: {
      email: incoming.identities.email ?? existing.identities.email,
      instagramHandle: incoming.identities.instagramHandle ?? existing.identities.instagramHandle,
      instagramUserId: incoming.identities.instagramUserId ?? existing.identities.instagramUserId,
      phone: incoming.identities.phone ?? existing.identities.phone,
      city: incoming.identities.city ?? existing.identities.city,
      country: incoming.identities.country ?? existing.identities.country,
    },
    channels: {
      emailStatus: incoming.channels.email.status ?? existing.channels.email.status,
      instagramStatus: incoming.channels.instagram.status ?? existing.channels.instagram.status,
      whatsappPresent: incoming.channels.whatsapp.present || existing.channels.whatsapp.present,
      whatsappStatus: incoming.channels.whatsapp.status ?? existing.channels.whatsapp.status,
      telegramPresent: incoming.channels.telegram.present || existing.channels.telegram.present,
      telegramStatus: incoming.channels.telegram.status ?? existing.channels.telegram.status,
    },
    scoring: {
      existingStage: incoming.scoring.stage,
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
};

export const applyCrmVNextCardWritePlanToStore = (
  input: {
    report: CrmCardWriteApplyReport;
    baseCards: PersonCardVNext[];
    previousStore?: CrmVNextPersonCardStore | null;
    approvedBy: string;
    committedAt?: string | Date | null;
  },
): CrmCardWriteApplyStoreResult => {
  const committedAt = isoNow(input.committedAt ?? input.report.generatedAt);
  const previousCards = input.previousStore?.cards ?? input.baseCards;
  const cardsById = new Map(previousCards.map((card) => [card.personId, card]));
  const provenance = [...(input.previousStore?.provenance ?? [])];
  const mergeReviewQueue = [...(input.previousStore?.mergeReviewQueue ?? [])];
  const ledgerEntries: CrmCardWriteLedgerEntry[] = [];

  for (const item of input.report.planItems.filter((planItem) => planItem.status === 'ready_to_commit')) {
    if (!item.provenance || !item.mutationKind) continue;
    if (item.mutationKind === 'upsert_vnext_card' && item.proposedCard) {
      const current = cardsById.get(item.proposedCard.personId) ?? null;
      cardsById.set(item.proposedCard.personId, mergeCard(current, item.proposedCard));
    }
    if (item.mutationKind === 'stage_merge_review') {
      mergeReviewQueue.push({
        reviewId: `merge_review_${hashId([item.applyItemId, committedAt])}`,
        createdAt: committedAt,
        approvalItemId: item.approvalItemId,
        targetPersonId: item.targetPersonId,
        subjectLabel: item.subject.label,
        operations: item.operations,
        provenance: item.provenance,
      });
    }
    provenance.push(item.provenance);
    ledgerEntries.push({
      schemaVersion: CRM_VNEXT_CARD_WRITE_LEDGER_ENTRY_SCHEMA_VERSION,
      ledgerEntryId: `card_write_ledger_${hashId([item.applyItemId, committedAt])}`,
      committedAt,
      committedBy: input.approvedBy,
      applyItemId: item.applyItemId,
      approvalItemId: item.approvalItemId,
      targetPersonId: item.targetPersonId,
      mutationKind: item.mutationKind,
      subjectLabel: item.subject.label,
      operationIds: item.operations.map((operation) => operation.operationId),
      cardPersonId: item.proposedCard?.personId ?? null,
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
        sourceKind: input.previousStore ? 'previous-vnext-card-store' : 'legacy-person-cards-v1-derived',
        cardsBeforeApply: previousCards.length,
      },
      cards: Array.from(cardsById.values()).sort((a, b) => a.personId.localeCompare(b.personId)),
      mergeReviewQueue,
      provenance,
    },
    ledgerEntries,
  };
};
