import { createHash } from 'node:crypto';
import {
  buildCrmVNextStitchBatchReview,
  type CrmStitchBatchReviewAction,
  type CrmStitchBatchReviewInput,
  type CrmStitchBatchReviewItem,
  type CrmStitchBatchReviewQuestion,
  type CrmStitchBatchReviewReport,
} from './crm-vnext-stitch-batch-review';
import { crmVNextNameCompatible } from './crm-vnext-name-matching';

export const CRM_VNEXT_CARD_WRITE_APPROVAL_PACKET_SCHEMA_VERSION =
  'crm-vnext-card-write-approval-packet-2026-05-10' as const;

export type CrmCardWriteApprovalPacketStatus =
  | 'ready_for_human_approval'
  | 'blocked_open_evidence_questions'
  | 'blocked_needs_more_identity';

export type CrmCardWriteApprovalScope =
  | 'card_write_policy'
  | 'identity_match'
  | 'merge_policy'
  | 'privacy_restricted_service'
  | 'no_outbound_confirmation';

export type CrmCardWriteApprovalPacketItem = {
  approvalItemId: string;
  batchItemId: string;
  status: CrmCardWriteApprovalPacketStatus;
  targetPersonId: string | null;
  subject: CrmStitchBatchReviewItem['subject'];
  recommendedAction: CrmStitchBatchReviewAction;
  requestedDecision: {
    prompt: string;
    approveOptionId: 'approve_for_future_card_write_path';
    holdOptionId: 'keep_in_review';
    rejectOptionId: 'reject_candidate';
  };
  identitySummary: CrmStitchBatchReviewItem['identity'];
  proposedServices: CrmStitchBatchReviewItem['proposedServices'];
  relationshipContexts: CrmStitchBatchReviewItem['relationshipContexts'];
  openQuestions: CrmStitchBatchReviewQuestion[];
  approvalScopes: CrmCardWriteApprovalScope[];
  approvalChecklist: string[];
  blockers: string[];
  nextEvidenceActions: string[];
  operationsPreviewed: number;
  operationsExecuted: 0;
  safeApprovalBoundary: string;
};

export type CrmCardWriteApprovalPacketReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_WRITE_APPROVAL_PACKET_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_card_write_approval_packet';
  summary: {
    items: number;
    readyForHumanApproval: number;
    blockedOpenEvidenceQuestions: number;
    blockedNeedsMoreIdentity: number;
    openEvidenceQuestions: number;
    approvalScopesRequested: number;
    restrictedServiceApprovalItems: number;
    operationsPreviewed: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  batchSummary: CrmStitchBatchReviewReport['summary'];
  approvalItems: CrmCardWriteApprovalPacketItem[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    approvalPacketOnly: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmCardWriteApprovalPacketInput = CrmStitchBatchReviewInput & {
  batch?: CrmStitchBatchReviewReport | null;
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

const actionLabel = (action: CrmStitchBatchReviewAction): string => {
  switch (action) {
    case 'enrich_existing_card':
      return 'enrich the existing card';
    case 'create_card_candidate':
      return 'create a new card candidate';
    case 'review_merge_or_create':
      return 'review merge-or-create';
    case 'review_deferred_write':
      return 'keep the candidate in deferred write review';
    case 'ask_more_identity':
      return 'ask for more identity';
    default:
      return 'review the candidate';
  }
};

const distinctIdentityValues = (values: string[], normalizeValue = (value: string): string => value.toLowerCase()): string[] =>
  unique(values.map((value) => normalizeValue(value.trim())).filter(Boolean));

const hasAmbiguousNonEmailIdentity = (item: CrmStitchBatchReviewItem): boolean => {
  if (item.identity.email) return false;
  const distinctNames = distinctIdentityValues(item.identity.fullNameCandidates);
  const distinctPhones = distinctIdentityValues(item.identity.phoneCandidates, (value) => value.replace(/\D/g, ''));
  return distinctNames.length > 1 || distinctPhones.length > 1;
};

const statusForItem = (item: CrmStitchBatchReviewItem): CrmCardWriteApprovalPacketStatus => {
  if (!crmVNextNameCompatible(item.subject.rawName, item.identity.displayName)) {
    return 'blocked_needs_more_identity';
  }
  if (item.openQuestions.length) return 'blocked_open_evidence_questions';
  if (hasAmbiguousNonEmailIdentity(item)) return 'blocked_needs_more_identity';
  if (item.recommendedAction === 'ask_more_identity' || item.stage === 'identity_needed') {
    return 'blocked_needs_more_identity';
  }
  if (
    (item.evidenceGrade === 'low' || item.evidenceGrade === 'insufficient')
    && item.recommendedAction !== 'review_merge_or_create'
    && item.recommendedAction !== 'enrich_existing_card'
  ) {
    return 'blocked_needs_more_identity';
  }
  return 'ready_for_human_approval';
};

const approvalScopesFor = (item: CrmStitchBatchReviewItem): CrmCardWriteApprovalScope[] => {
  const scopes: CrmCardWriteApprovalScope[] = ['card_write_policy'];
  if (item.blockers.includes('identity_match')) scopes.push('identity_match');
  if (item.blockers.includes('merge_policy') || item.recommendedAction === 'review_merge_or_create') scopes.push('merge_policy');
  if (item.blockers.includes('privacy_restricted_service') || item.restrictedServiceOperations > 0) {
    scopes.push('privacy_restricted_service');
  }
  scopes.push('no_outbound_confirmation');
  return unique(scopes);
};

const approvalChecklistFor = (
  item: CrmStitchBatchReviewItem,
  status: CrmCardWriteApprovalPacketStatus,
): string[] => {
  if (status === 'blocked_open_evidence_questions') {
    return [
      'Resolve open evidence questions before approving card writes.',
      'Do not assign ambiguous family/shared emails until a decision is stored.',
      'Rerun the approval packet after the evidence decision ledger is updated.',
    ];
  }
  if (status === 'blocked_needs_more_identity') {
    return [
      'Gather or confirm a stable email, Instagram handle, phone, or exact identity match before approval.',
      'Do not create or enrich a card from this item yet.',
    ];
  }

  const checklist = [
    `Confirm the target person is correct: ${item.targetPersonId ?? item.subject.label}.`,
    `Confirm the recommended action: ${actionLabel(item.recommendedAction)}.`,
    'Confirm the proposed service relationships are appropriate for the card.',
    'Confirm no outbound message, tag change, automation, or live connector action is authorized by this approval.',
  ];
  if (item.restrictedServiceOperations > 0 || item.blockers.includes('privacy_restricted_service')) {
    checklist.splice(3, 0, 'Confirm restricted service context may be stored internally and must not drive outbound without review.');
  }
  return checklist;
};

const promptFor = (item: CrmStitchBatchReviewItem, status: CrmCardWriteApprovalPacketStatus): string => {
  if (status === 'blocked_open_evidence_questions') {
    return `Hold ${item.subject.label}: resolve ${item.openQuestions.length} evidence question(s) before approval.`;
  }
  if (status === 'blocked_needs_more_identity') {
    return `Hold ${item.subject.label}: gather stronger identity before approval.`;
  }
  return `Approve ${item.subject.label} for the future card-write path as: ${actionLabel(item.recommendedAction)}.`;
};

const safeApprovalBoundaryFor = (status: CrmCardWriteApprovalPacketStatus): string => {
  if (status === 'ready_for_human_approval') {
    return 'Human approval here authorizes only the next reviewed card-write path; this packet still executes no mutation.';
  }
  return 'This item is not ready for card-write approval; resolve blockers and rerun the packet.';
};

const approvalItemFor = (item: CrmStitchBatchReviewItem): CrmCardWriteApprovalPacketItem => {
  const status = statusForItem(item);
  return {
    approvalItemId: `card_write_approval_${hashId([item.batchItemId, item.targetPersonId, status])}`,
    batchItemId: item.batchItemId,
    status,
    targetPersonId: item.targetPersonId,
    subject: item.subject,
    recommendedAction: item.recommendedAction,
    requestedDecision: {
      prompt: promptFor(item, status),
      approveOptionId: 'approve_for_future_card_write_path',
      holdOptionId: 'keep_in_review',
      rejectOptionId: 'reject_candidate',
    },
    identitySummary: item.identity,
    proposedServices: item.proposedServices,
    relationshipContexts: item.relationshipContexts,
    openQuestions: item.openQuestions,
    approvalScopes: status === 'ready_for_human_approval' ? approvalScopesFor(item) : [],
    approvalChecklist: approvalChecklistFor(item, status),
    blockers: item.blockers,
    nextEvidenceActions: item.nextEvidenceActions,
    operationsPreviewed: item.operationsPreviewed,
    operationsExecuted: 0,
    safeApprovalBoundary: safeApprovalBoundaryFor(status),
  };
};

const safety = (): CrmCardWriteApprovalPacketReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  approvalPacketOnly: true,
  allowedUse: [
    'Prepare explicit human approval packets before any future card write path.',
    'Separate ready-to-approve candidates from items still blocked by evidence or identity.',
    'Show the exact approval boundary without applying card changes.',
  ],
  prohibitedActions: [
    'Do not write person cards.',
    'Do not merge records.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not change MailerLite, Gmail, Drive, Instagram, ManyChat, WhatsApp, or Telegram.',
    'Do not treat this packet as execution of the write.',
  ],
});

export const buildCrmVNextCardWriteApprovalPacket = (
  input: CrmCardWriteApprovalPacketInput,
): CrmCardWriteApprovalPacketReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const batch = input.batch ?? buildCrmVNextStitchBatchReview({
    ...input,
    now: generatedAt,
  });
  const approvalItems = batch.items.map(approvalItemFor);
  const readyItems = approvalItems.filter((item) => item.status === 'ready_for_human_approval');
  const openEvidenceQuestions = approvalItems.reduce((sum, item) => sum + item.openQuestions.length, 0);
  const operationsPreviewed = approvalItems.reduce((sum, item) => sum + item.operationsPreviewed, 0);
  const approvalScopesRequested = readyItems.reduce((sum, item) => sum + item.approvalScopes.length, 0);

  return {
    schemaVersion: CRM_VNEXT_CARD_WRITE_APPROVAL_PACKET_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_card_write_approval_packet',
    summary: {
      items: approvalItems.length,
      readyForHumanApproval: readyItems.length,
      blockedOpenEvidenceQuestions: approvalItems.filter((item) => item.status === 'blocked_open_evidence_questions').length,
      blockedNeedsMoreIdentity: approvalItems.filter((item) => item.status === 'blocked_needs_more_identity').length,
      openEvidenceQuestions,
      approvalScopesRequested,
      restrictedServiceApprovalItems: readyItems.filter((item) => item.approvalScopes.includes('privacy_restricted_service')).length,
      operationsPreviewed,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    batchSummary: batch.summary,
    approvalItems,
    safety: safety(),
  };
};
