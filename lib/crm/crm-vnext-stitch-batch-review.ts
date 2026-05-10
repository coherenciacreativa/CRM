import { createHash } from 'node:crypto';
import {
  buildCrmVNextEvidenceReviewPacket,
  type CrmEvidenceReviewItem,
  type CrmEvidenceReviewPacketInput,
  type CrmEvidenceReviewPacketReport,
} from './crm-vnext-evidence-review-packet';
import type {
  CrmCardApplyPreviewItem,
  CrmCardApplyPreviewOperation,
} from './crm-vnext-card-apply-preview';
import type { CrmCardWriteMergeDecision } from './crm-vnext-card-write-merge-policy';

export const CRM_VNEXT_STITCH_BATCH_REVIEW_SCHEMA_VERSION =
  'crm-vnext-stitch-batch-review-2026-05-10' as const;

export type CrmStitchBatchReviewAction =
  | 'enrich_existing_card'
  | 'create_card_candidate'
  | 'review_merge_or_create'
  | 'review_deferred_write'
  | 'ask_more_identity';

export type CrmStitchBatchReviewStage =
  | 'approval_ready'
  | 'review_needed'
  | 'identity_needed'
  | 'deferred';

export type CrmStitchBatchReviewQuestion = {
  questionId: string;
  type: 'email_ownership';
  priority: 'high' | 'medium' | 'low';
  candidateEmail: string;
  recommendedOptionId: string;
};

export type CrmStitchBatchReviewItem = {
  batchItemId: string;
  previewId: string;
  decisionId: string;
  clueId: string;
  stage: CrmStitchBatchReviewStage;
  recommendedAction: CrmStitchBatchReviewAction;
  targetPersonId: string | null;
  subject: {
    label: string;
    proposedDisplayName: string | null;
    rawName: string | null;
    instagramHandle: string | null;
  };
  identity: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
    instagramHandle: string | null;
    missingContactFields: CrmCardApplyPreviewItem['identityResolution']['missingContactFields'];
    fullNameCandidates: string[];
    emailCandidates: string[];
    phoneCandidates: string[];
    evidenceDecisionSummary: CrmCardApplyPreviewItem['identityResolution']['evidenceDecisionSummary'];
  };
  evidenceGrade: CrmCardWriteMergeDecision['evidenceAssessment']['grade'];
  evidenceScore: number;
  sourceSignals: string[];
  currentCard: CrmCardApplyPreviewItem['currentCard'];
  proposedServices: unknown[];
  relationshipContexts: unknown[];
  restrictedServiceOperations: number;
  openQuestions: CrmStitchBatchReviewQuestion[];
  blockers: string[];
  nextEvidenceActions: string[];
  operationsPreviewed: number;
  operationsExecuted: 0;
  safeNextStep: string;
};

export type CrmStitchBatchReviewReport = {
  schemaVersion: typeof CRM_VNEXT_STITCH_BATCH_REVIEW_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_stitch_batch_review';
  summary: {
    items: number;
    approvalReady: number;
    reviewNeeded: number;
    identityNeeded: number;
    deferred: number;
    openEvidenceQuestions: number;
    appliedEvidenceDecisions: number;
    operationsPreviewed: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  packetSummary: CrmEvidenceReviewPacketReport['summary'];
  previewSummary: CrmEvidenceReviewPacketReport['preview']['summary'];
  items: CrmStitchBatchReviewItem[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    batchReviewOnly: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmStitchBatchReviewInput = CrmEvidenceReviewPacketInput & {
  packet?: CrmEvidenceReviewPacketReport | null;
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

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicText(value);
  return cleaned || null;
};

const operationValues = (
  preview: CrmCardApplyPreviewItem,
  type: CrmCardApplyPreviewOperation['type'],
): unknown[] =>
  preview.operations
    .filter((operation) => operation.type === type)
    .map((operation) => operation.value);

const actionFor = (preview: CrmCardApplyPreviewItem): CrmStitchBatchReviewAction => {
  const operationTypes = new Set(preview.operations.map((operation) => operation.type));
  if (operationTypes.has('enrich_existing_card')) return 'enrich_existing_card';
  if (operationTypes.has('create_card_candidate')) return 'create_card_candidate';
  if (operationTypes.has('stage_merge_review')) return 'review_merge_or_create';
  if (operationTypes.has('stage_identity_request')) return 'ask_more_identity';
  return 'review_deferred_write';
};

const stageFor = (
  preview: CrmCardApplyPreviewItem,
  openQuestions: CrmStitchBatchReviewQuestion[],
): CrmStitchBatchReviewStage => {
  if (preview.status === 'needs_more_identity') return 'identity_needed';
  if (openQuestions.length || preview.blockedBy.length) return 'review_needed';
  if (preview.status === 'ready_for_human_approved_apply') return 'approval_ready';
  return 'deferred';
};

const subjectFor = (
  preview: CrmCardApplyPreviewItem,
  decision: CrmCardWriteMergeDecision,
  reviewItem: CrmEvidenceReviewItem | null,
): CrmStitchBatchReviewItem['subject'] => ({
  label: reviewItem?.subject.label
    ?? cleanString(decision.personHint.rawName)
    ?? cleanString(decision.personHint.instagramHandle)
    ?? cleanString(preview.proposedCardDraft?.displayName)
    ?? cleanString(preview.currentCard.displayName)
    ?? cleanString(preview.targetPersonId)
    ?? preview.clueId,
  proposedDisplayName: cleanString(preview.proposedCardDraft?.displayName),
  rawName: cleanString(reviewItem?.subject.rawName ?? decision.personHint.rawName),
  instagramHandle: cleanString(
    reviewItem?.subject.instagramHandle
    ?? decision.personHint.instagramHandle
    ?? preview.proposedCardDraft?.identities.instagramHandle,
  ),
});

const questionsFor = (reviewItem: CrmEvidenceReviewItem | null): CrmStitchBatchReviewQuestion[] =>
  (reviewItem?.decisionQuestions ?? []).map((question) => ({
    questionId: question.questionId,
    type: question.type,
    priority: question.priority,
    candidateEmail: question.candidateEmail,
    recommendedOptionId: question.recommendedOptionId,
  }));

const safeNextStepFor = (
  itemStage: CrmStitchBatchReviewStage,
  action: CrmStitchBatchReviewAction,
  openQuestions: CrmStitchBatchReviewQuestion[],
): string => {
  if (openQuestions.length) return 'Resolve the open evidence questions before any card write approval.';
  if (itemStage === 'identity_needed') return 'Gather stronger identity evidence before staging card work.';
  if (action === 'review_merge_or_create') return 'Review merge-vs-create evidence before any write.';
  if (itemStage === 'approval_ready') return 'Ready for a separate human card-write approval, still not auto-applied.';
  return 'Keep in deferred review until identity and merge policy are clear.';
};

const itemFor = (
  preview: CrmCardApplyPreviewItem,
  decision: CrmCardWriteMergeDecision,
  reviewItem: CrmEvidenceReviewItem | null,
): CrmStitchBatchReviewItem => {
  const openQuestions = questionsFor(reviewItem);
  const recommendedAction = actionFor(preview);
  const stage = stageFor(preview, openQuestions);
  const proposedCard = preview.proposedCardDraft;

  return {
    batchItemId: `stitch_batch_${hashId([preview.previewId, preview.targetPersonId, recommendedAction])}`,
    previewId: preview.previewId,
    decisionId: preview.decisionId,
    clueId: preview.clueId,
    stage,
    recommendedAction,
    targetPersonId: preview.targetPersonId,
    subject: subjectFor(preview, decision, reviewItem),
    identity: {
      displayName: cleanString(proposedCard?.displayName ?? preview.currentCard.displayName),
      email: cleanString(proposedCard?.identities.email),
      phone: cleanString(proposedCard?.identities.phone),
      instagramHandle: cleanString(proposedCard?.identities.instagramHandle),
      missingContactFields: preview.identityResolution.missingContactFields,
      fullNameCandidates: preview.identityResolution.fullNameCandidates,
      emailCandidates: preview.identityResolution.emailCandidates,
      phoneCandidates: preview.identityResolution.phoneCandidates,
      evidenceDecisionSummary: preview.identityResolution.evidenceDecisionSummary,
    },
    evidenceGrade: decision.evidenceAssessment.grade,
    evidenceScore: decision.evidenceAssessment.identityEvidenceScore,
    sourceSignals: decision.evidenceAssessment.sourceSignals,
    currentCard: preview.currentCard,
    proposedServices: operationValues(preview, 'add_service_relationship'),
    relationshipContexts: operationValues(preview, 'add_relationship_context'),
    restrictedServiceOperations: preview.operations.filter((operation) => operation.type === 'mark_restricted_service').length,
    openQuestions,
    blockers: preview.blockedBy,
    nextEvidenceActions: decision.recommendedWrite.nextEvidenceActions,
    operationsPreviewed: preview.operations.length,
    operationsExecuted: 0,
    safeNextStep: safeNextStepFor(stage, recommendedAction, openQuestions),
  };
};

const safety = (): CrmStitchBatchReviewReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  batchReviewOnly: true,
  allowedUse: [
    'Review multiple CRM stitching candidates in one operator-friendly batch.',
    'Prioritize create, enrich, merge, defer, and identity-needed work without writing cards.',
    'Combine preview operations, open evidence questions, and stored evidence decisions.',
  ],
  prohibitedActions: [
    'Do not write person cards.',
    'Do not merge records.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
    'Do not treat this batch as approval to apply operations.',
  ],
});

export const buildCrmVNextStitchBatchReview = (
  input: CrmStitchBatchReviewInput,
): CrmStitchBatchReviewReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const packet = input.packet ?? buildCrmVNextEvidenceReviewPacket({
    ...input,
    now: generatedAt,
  });
  const decisionsById = new Map(packet.preview.policy.decisions.map((decision) => [decision.decisionId, decision]));
  const reviewByPreviewId = new Map(packet.reviewItems.map((item) => [item.previewId, item]));
  const items = packet.preview.previews.map((preview) => itemFor(
    preview,
    decisionsById.get(preview.decisionId) as CrmCardWriteMergeDecision,
    reviewByPreviewId.get(preview.previewId) ?? null,
  ));
  const operationsPreviewed = items.reduce((sum, item) => sum + item.operationsPreviewed, 0);
  const openEvidenceQuestions = items.reduce((sum, item) => sum + item.openQuestions.length, 0);
  const appliedEvidenceDecisions = items.reduce(
    (sum, item) => sum + item.identity.evidenceDecisionSummary.appliedDecisionRecordIds.length,
    0,
  );

  return {
    schemaVersion: CRM_VNEXT_STITCH_BATCH_REVIEW_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_stitch_batch_review',
    summary: {
      items: items.length,
      approvalReady: items.filter((item) => item.stage === 'approval_ready').length,
      reviewNeeded: items.filter((item) => item.stage === 'review_needed').length,
      identityNeeded: items.filter((item) => item.stage === 'identity_needed').length,
      deferred: items.filter((item) => item.stage === 'deferred').length,
      openEvidenceQuestions,
      appliedEvidenceDecisions,
      operationsPreviewed,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    packetSummary: packet.summary,
    previewSummary: packet.preview.summary,
    items,
    safety: safety(),
  };
};
