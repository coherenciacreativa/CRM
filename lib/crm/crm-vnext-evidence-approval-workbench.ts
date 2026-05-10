import { createHash } from 'node:crypto';
import {
  buildCrmVNextCardWriteApprovalPacket,
  type CrmCardWriteApprovalPacketInput,
  type CrmCardWriteApprovalPacketReport,
} from './crm-vnext-card-write-approval-packet';
import {
  buildCrmVNextEvidenceReviewPacket,
  type CrmEvidenceReviewDecisionOption,
  type CrmEvidenceReviewDecisionOptionId,
  type CrmEvidenceReviewEmailCandidate,
  type CrmEvidenceReviewItem,
  type CrmEvidenceReviewPacketReport,
  type CrmEvidenceReviewQuestion,
} from './crm-vnext-evidence-review-packet';

export const CRM_VNEXT_EVIDENCE_APPROVAL_WORKBENCH_SCHEMA_VERSION =
  'crm-vnext-evidence-approval-workbench-2026-05-10' as const;

export type CrmEvidenceApprovalWorkbenchQueueItem = {
  queueItemId: string;
  priority: CrmEvidenceReviewQuestion['priority'];
  questionId: string;
  questionType: CrmEvidenceReviewQuestion['type'];
  subject: CrmEvidenceReviewItem['subject'];
  targetPersonId: string | null;
  candidateEmail: string;
  recommendedOptionId: CrmEvidenceReviewDecisionOptionId;
  recommendedDecisionCli: string;
  options: CrmEvidenceReviewDecisionOption[];
  evidence: {
    evidenceCount: number;
    sourceIds: string[];
    sourceKinds: CrmEvidenceReviewEmailCandidate['sourceKinds'];
    snippets: string[];
    reviewReasons: CrmEvidenceReviewEmailCandidate['reviewReasons'];
  };
  blocks: {
    primaryEmailAssignment: true;
    cardWrite: true;
    mergeDecision: true;
  };
  safeNextStep: string;
};

export type CrmEvidenceApprovalWorkbenchReport = {
  schemaVersion: typeof CRM_VNEXT_EVIDENCE_APPROVAL_WORKBENCH_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_evidence_approval_workbench';
  summary: {
    reviewItems: number;
    queueItems: number;
    highPriority: number;
    recommendedConfirmEmailForSubject: number;
    recommendedKeepUnassigned: number;
    recommendedMoreEvidence: number;
    readyForHumanApproval: number;
    blockedOpenEvidenceQuestions: number;
    operationsPreviewed: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  queueItems: CrmEvidenceApprovalWorkbenchQueueItem[];
  readyApprovalItems: Array<{
    approvalItemId: string;
    targetPersonId: string | null;
    subjectLabel: string;
    recommendedAction: string;
    approvalScopes: string[];
  }>;
  packetSummary: CrmEvidenceReviewPacketReport['summary'];
  approvalSummary: CrmCardWriteApprovalPacketReport['summary'];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    workbenchOnly: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmEvidenceApprovalWorkbenchInput = CrmCardWriteApprovalPacketInput;

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

const normalizeEmail = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const candidateForQuestion = (
  item: CrmEvidenceReviewItem,
  question: CrmEvidenceReviewQuestion,
): CrmEvidenceReviewEmailCandidate | null =>
  item.ambiguousEmailCandidates.find((candidate) =>
    normalizeEmail(candidate.email) === normalizeEmail(question.candidateEmail),
  ) ?? null;

const safeNextStepFor = (question: CrmEvidenceReviewQuestion): string => {
  switch (question.recommendedOptionId) {
    case 'confirm_email_for_subject':
      return 'Ask Alejandro to confirm this email belongs to the subject before rerunning Evidence Approval Application.';
    case 'keep_email_unassigned_family_or_companion':
      return 'Ask Alejandro to confirm whether this email should stay unassigned as family or companion evidence.';
    case 'create_related_person_candidate':
      return 'Ask whether Mantis should prepare a separate related-person candidate.';
    case 'ignore_candidate':
      return 'Confirm this candidate should be ignored before excluding it from future proposals.';
    case 'ask_for_more_evidence':
    default:
      return 'Gather more evidence before assigning or ignoring this email candidate.';
  }
};

const queueItemFor = (
  item: CrmEvidenceReviewItem,
  question: CrmEvidenceReviewQuestion,
): CrmEvidenceApprovalWorkbenchQueueItem => {
  const candidate = candidateForQuestion(item, question);
  return {
    queueItemId: `evidence_approval_queue_${hashId([item.itemId, question.questionId, question.candidateEmail])}`,
    priority: question.priority,
    questionId: question.questionId,
    questionType: question.type,
    subject: item.subject,
    targetPersonId: item.targetPersonId,
    candidateEmail: question.candidateEmail,
    recommendedOptionId: question.recommendedOptionId,
    recommendedDecisionCli: `--select-email ${question.candidateEmail}=${question.recommendedOptionId}`,
    options: question.options,
    evidence: {
      evidenceCount: candidate?.evidenceCount ?? 0,
      sourceIds: candidate?.sourceIds ?? [],
      sourceKinds: candidate?.sourceKinds ?? {},
      snippets: candidate?.snippets ?? [],
      reviewReasons: candidate?.reviewReasons ?? [],
    },
    blocks: {
      primaryEmailAssignment: true,
      cardWrite: true,
      mergeDecision: true,
    },
    safeNextStep: safeNextStepFor(question),
  };
};

const queueSort = (
  left: CrmEvidenceApprovalWorkbenchQueueItem,
  right: CrmEvidenceApprovalWorkbenchQueueItem,
): number => {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  return priorityRank[left.priority] - priorityRank[right.priority]
    || left.subject.label.localeCompare(right.subject.label)
    || left.candidateEmail.localeCompare(right.candidateEmail);
};

const safety = (): CrmEvidenceApprovalWorkbenchReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  workbenchOnly: true,
  allowedUse: [
    'Give Mantis one compact queue of unresolved evidence ownership questions.',
    'Prepare Alejandro decision prompts before applying evidence decisions.',
    'Show which candidates are already ready for separate card-write approval.',
  ],
  prohibitedActions: [
    'Do not store evidence decisions from the workbench alone.',
    'Do not mutate person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
  ],
});

export const buildCrmVNextEvidenceApprovalWorkbench = (
  input: CrmEvidenceApprovalWorkbenchInput,
): CrmEvidenceApprovalWorkbenchReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const reviewPacket = buildCrmVNextEvidenceReviewPacket({
    ...input,
    now: generatedAt,
  });
  const approvalPacket = buildCrmVNextCardWriteApprovalPacket({
    ...input,
    now: generatedAt,
  });
  const queueItems = reviewPacket.reviewItems
    .flatMap((item) => item.decisionQuestions.map((question) => queueItemFor(item, question)))
    .sort(queueSort);
  const readyApprovalItems = approvalPacket.approvalItems
    .filter((item) => item.status === 'ready_for_human_approval')
    .map((item) => ({
      approvalItemId: item.approvalItemId,
      targetPersonId: item.targetPersonId,
      subjectLabel: item.subject.label,
      recommendedAction: item.recommendedAction,
      approvalScopes: item.approvalScopes,
    }));

  return {
    schemaVersion: CRM_VNEXT_EVIDENCE_APPROVAL_WORKBENCH_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_evidence_approval_workbench',
    summary: {
      reviewItems: reviewPacket.summary.reviewItems,
      queueItems: queueItems.length,
      highPriority: queueItems.filter((item) => item.priority === 'high').length,
      recommendedConfirmEmailForSubject: queueItems.filter((item) => item.recommendedOptionId === 'confirm_email_for_subject').length,
      recommendedKeepUnassigned: queueItems.filter((item) => item.recommendedOptionId === 'keep_email_unassigned_family_or_companion').length,
      recommendedMoreEvidence: queueItems.filter((item) => item.recommendedOptionId === 'ask_for_more_evidence').length,
      readyForHumanApproval: approvalPacket.summary.readyForHumanApproval,
      blockedOpenEvidenceQuestions: approvalPacket.summary.blockedOpenEvidenceQuestions,
      operationsPreviewed: approvalPacket.summary.operationsPreviewed,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    queueItems,
    readyApprovalItems,
    packetSummary: reviewPacket.summary,
    approvalSummary: approvalPacket.summary,
    safety: safety(),
  };
};
