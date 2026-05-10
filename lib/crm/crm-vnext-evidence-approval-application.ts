import {
  buildCrmVNextCardWriteApprovalPacket,
  type CrmCardWriteApprovalPacketInput,
  type CrmCardWriteApprovalPacketItem,
  type CrmCardWriteApprovalPacketReport,
} from './crm-vnext-card-write-approval-packet';
import {
  appendCrmEvidenceReviewDecisions,
  readCrmEvidenceReviewDecisionLedger,
  type CrmEvidenceReviewDecisionInput,
  type CrmEvidenceReviewDecisionLedgerAppendResult,
  type CrmStoredEvidenceReviewDecision,
} from './crm-vnext-evidence-review-decisions';
import { buildCrmVNextEvidenceReviewPacket } from './crm-vnext-evidence-review-packet';

export const CRM_VNEXT_EVIDENCE_APPROVAL_APPLICATION_SCHEMA_VERSION =
  'crm-vnext-evidence-approval-application-2026-05-10' as const;

export type CrmEvidenceApprovalApplicationInput = CrmCardWriteApprovalPacketInput & {
  decisions: CrmEvidenceReviewDecisionInput[];
  approvedBy?: string | null;
  commit?: boolean;
  ledgerPath?: string | null;
};

export type CrmEvidenceApprovalApplicationQuestionDelta = {
  questionId: string;
  candidateEmail: string;
  subjectLabel: string;
  selectedOptionId: string | null;
  effect: {
    primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: boolean;
    keepEmailUnassigned: boolean;
    createsRelatedPersonCandidate: boolean;
    needsMoreEvidence: boolean;
    ignoredCandidate: boolean;
    cardWriteStillRequiresApproval: true;
  } | null;
};

export type CrmEvidenceApprovalApplicationStatusTransition = {
  batchItemId: string;
  subjectLabel: string;
  targetPersonId: string | null;
  beforeStatus: CrmCardWriteApprovalPacketItem['status'];
  afterStatus: CrmCardWriteApprovalPacketItem['status'];
  becameReadyForHumanApproval: boolean;
};

export type CrmEvidenceApprovalApplicationReport = {
  schemaVersion: typeof CRM_VNEXT_EVIDENCE_APPROVAL_APPLICATION_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_evidence_approval_application' | 'local_evidence_approval_application';
  committed: boolean;
  decisionAppend: CrmEvidenceReviewDecisionLedgerAppendResult;
  before: {
    summary: CrmCardWriteApprovalPacketReport['summary'];
    approvalItems: Array<{
      batchItemId: string;
      status: CrmCardWriteApprovalPacketItem['status'];
      targetPersonId: string | null;
      subjectLabel: string;
      openQuestions: CrmCardWriteApprovalPacketItem['openQuestions'];
    }>;
  };
  after: {
    summary: CrmCardWriteApprovalPacketReport['summary'];
    approvalItems: Array<{
      batchItemId: string;
      status: CrmCardWriteApprovalPacketItem['status'];
      targetPersonId: string | null;
      subjectLabel: string;
      openQuestions: CrmCardWriteApprovalPacketItem['openQuestions'];
      approvalScopes: CrmCardWriteApprovalPacketItem['approvalScopes'];
    }>;
  };
  delta: {
    readyForHumanApproval: number;
    blockedOpenEvidenceQuestions: number;
    blockedNeedsMoreIdentity: number;
    openEvidenceQuestions: number;
    resolvedEvidenceQuestions: number;
    newlyReadyForHumanApproval: number;
  };
  resolvedEvidenceQuestions: CrmEvidenceApprovalApplicationQuestionDelta[];
  statusTransitions: CrmEvidenceApprovalApplicationStatusTransition[];
  effectiveEvidenceReviewDecisions: {
    before: number;
    added: number;
    after: number;
  };
  safety: {
    localOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    decisionLedgerOnly: true;
    cardWriteStillRequiresSeparateApproval: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeEmail = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const uniqueDecisions = (
  decisions: CrmStoredEvidenceReviewDecision[],
): CrmStoredEvidenceReviewDecision[] => {
  const byId = new Map<string, CrmStoredEvidenceReviewDecision>();
  for (const decision of decisions) byId.set(decision.decisionRecordId, decision);
  return Array.from(byId.values()).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
};

const compactBeforeItem = (item: CrmCardWriteApprovalPacketItem) => ({
  batchItemId: item.batchItemId,
  status: item.status,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subject.label,
  openQuestions: item.openQuestions,
});

const compactAfterItem = (item: CrmCardWriteApprovalPacketItem) => ({
  ...compactBeforeItem(item),
  approvalScopes: item.approvalScopes,
});

const questionKey = (
  batchItemId: string,
  questionId: string,
  candidateEmail: string,
): string => `${batchItemId}:${questionId}:${normalizeEmail(candidateEmail)}`;

const selectedDecisionFor = (
  appended: CrmStoredEvidenceReviewDecision[],
  questionId: string,
  candidateEmail: string,
): CrmStoredEvidenceReviewDecision | null =>
  appended.find((decision) =>
    decision.questionId === questionId
    || normalizeEmail(decision.candidateEmail) === normalizeEmail(candidateEmail),
  ) ?? null;

const resolvedQuestionsFor = (
  before: CrmCardWriteApprovalPacketReport,
  after: CrmCardWriteApprovalPacketReport,
  appended: CrmStoredEvidenceReviewDecision[],
): CrmEvidenceApprovalApplicationQuestionDelta[] => {
  const afterKeys = new Set(
    after.approvalItems.flatMap((item) =>
      item.openQuestions.map((question) => questionKey(item.batchItemId, question.questionId, question.candidateEmail)),
    ),
  );

  return before.approvalItems.flatMap((item) =>
    item.openQuestions
      .filter((question) => !afterKeys.has(questionKey(item.batchItemId, question.questionId, question.candidateEmail)))
      .map((question) => {
        const selected = selectedDecisionFor(appended, question.questionId, question.candidateEmail);
        return {
          questionId: question.questionId,
          candidateEmail: question.candidateEmail,
          subjectLabel: item.subject.label,
          selectedOptionId: selected?.selectedOptionId ?? null,
          effect: selected?.effect ?? null,
        };
      }),
  );
};

const statusTransitionsFor = (
  before: CrmCardWriteApprovalPacketReport,
  after: CrmCardWriteApprovalPacketReport,
): CrmEvidenceApprovalApplicationStatusTransition[] => {
  const beforeByBatchItem = new Map(before.approvalItems.map((item) => [item.batchItemId, item]));
  return after.approvalItems
    .map((afterItem) => {
      const beforeItem = beforeByBatchItem.get(afterItem.batchItemId);
      if (!beforeItem || beforeItem.status === afterItem.status) return null;
      return {
        batchItemId: afterItem.batchItemId,
        subjectLabel: afterItem.subject.label,
        targetPersonId: afterItem.targetPersonId,
        beforeStatus: beforeItem.status,
        afterStatus: afterItem.status,
        becameReadyForHumanApproval: afterItem.status === 'ready_for_human_approval',
      };
    })
    .filter((transition): transition is CrmEvidenceApprovalApplicationStatusTransition => Boolean(transition));
};

const safety = (): CrmEvidenceApprovalApplicationReport['safety'] => ({
  localOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  decisionLedgerOnly: true,
  cardWriteStillRequiresSeparateApproval: true,
  allowedUse: [
    'Apply Alejandro-approved evidence decisions to the local decision ledger.',
    'Rerun card-write approval packets with those decisions applied.',
    'Show which evidence questions were resolved before any card write exists.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not merge records.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
    'Do not treat an evidence decision as final card-write approval.',
  ],
});

export const buildCrmVNextEvidenceApprovalApplication = async (
  input: CrmEvidenceApprovalApplicationInput,
): Promise<CrmEvidenceApprovalApplicationReport> => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const approvedBy = cleanString(input.approvedBy) ?? (input.commit ? null : 'dry-run');
  if (!approvedBy) throw new Error('evidence_approval_application_approved_by_required');

  const ledger = await readCrmEvidenceReviewDecisionLedger(input.ledgerPath ?? undefined, {
    now: generatedAt,
    limit: 1000,
  });
  const existingEvidenceReviewDecisions = input.evidenceReviewDecisions ?? ledger.decisions;
  const beforePacket = buildCrmVNextCardWriteApprovalPacket({
    ...input,
    evidenceReviewDecisions: existingEvidenceReviewDecisions,
    now: generatedAt,
  });
  const beforeEvidencePacket = buildCrmVNextEvidenceReviewPacket({
    ...input,
    evidenceReviewDecisions: existingEvidenceReviewDecisions,
    now: generatedAt,
  });
  const decisionAppend = await appendCrmEvidenceReviewDecisions({
    ...input,
    packet: beforeEvidencePacket,
    approvedBy,
    commit: Boolean(input.commit),
    ledgerPath: input.ledgerPath,
    evidenceReviewDecisions: existingEvidenceReviewDecisions,
    now: generatedAt,
  });
  const effectiveEvidenceReviewDecisions = uniqueDecisions([
    ...existingEvidenceReviewDecisions,
    ...decisionAppend.added,
  ]);
  const afterPacket = buildCrmVNextCardWriteApprovalPacket({
    ...input,
    evidenceReviewDecisions: effectiveEvidenceReviewDecisions,
    now: generatedAt,
  });
  const resolvedEvidenceQuestions = resolvedQuestionsFor(beforePacket, afterPacket, decisionAppend.added);
  const statusTransitions = statusTransitionsFor(beforePacket, afterPacket);

  return {
    schemaVersion: CRM_VNEXT_EVIDENCE_APPROVAL_APPLICATION_SCHEMA_VERSION,
    generatedAt,
    mode: input.commit ? 'local_evidence_approval_application' : 'dry_run_evidence_approval_application',
    committed: Boolean(input.commit),
    decisionAppend,
    before: {
      summary: beforePacket.summary,
      approvalItems: beforePacket.approvalItems.map(compactBeforeItem),
    },
    after: {
      summary: afterPacket.summary,
      approvalItems: afterPacket.approvalItems.map(compactAfterItem),
    },
    delta: {
      readyForHumanApproval: afterPacket.summary.readyForHumanApproval - beforePacket.summary.readyForHumanApproval,
      blockedOpenEvidenceQuestions: afterPacket.summary.blockedOpenEvidenceQuestions - beforePacket.summary.blockedOpenEvidenceQuestions,
      blockedNeedsMoreIdentity: afterPacket.summary.blockedNeedsMoreIdentity - beforePacket.summary.blockedNeedsMoreIdentity,
      openEvidenceQuestions: afterPacket.summary.openEvidenceQuestions - beforePacket.summary.openEvidenceQuestions,
      resolvedEvidenceQuestions: resolvedEvidenceQuestions.length,
      newlyReadyForHumanApproval: statusTransitions.filter((transition) => transition.becameReadyForHumanApproval).length,
    },
    resolvedEvidenceQuestions,
    statusTransitions,
    effectiveEvidenceReviewDecisions: {
      before: existingEvidenceReviewDecisions.length,
      added: decisionAppend.added.length,
      after: effectiveEvidenceReviewDecisions.length,
    },
    safety: safety(),
  };
};
