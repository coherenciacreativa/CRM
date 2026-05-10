import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import {
  buildCrmVNextEvidenceReviewPacket,
  type CrmEvidenceReviewDecisionOptionId,
  type CrmEvidenceReviewPacketInput,
  type CrmEvidenceReviewQuestion,
  type CrmEvidenceReviewItem,
  type CrmEvidenceReviewPacketReport,
} from './crm-vnext-evidence-review-packet';

export const CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_SCHEMA_VERSION =
  'crm-vnext-evidence-review-decisions-2026-05-10' as const;
export const CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION =
  'crm-vnext-stored-evidence-review-decision-2026-05-10' as const;

export const DEFAULT_CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH = join(
  process.cwd(),
  '.crm-vnext',
  'evidence-review-decisions',
  'decisions.jsonl',
);

export type CrmEvidenceReviewDecisionInput = {
  questionId?: string | null;
  candidateEmail?: string | null;
  selectedOptionId: CrmEvidenceReviewDecisionOptionId;
  notes?: string | null;
  relatedPersonName?: string | null;
};

export type CrmEvidenceReviewDecisionEffect = {
  primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: boolean;
  keepEmailUnassigned: boolean;
  createsRelatedPersonCandidate: boolean;
  needsMoreEvidence: boolean;
  ignoredCandidate: boolean;
  cardWriteStillRequiresApproval: true;
};

export type CrmStoredEvidenceReviewDecision = {
  schemaVersion: typeof CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION;
  decisionRecordId: string;
  decisionBatchId: string;
  decidedAt: string;
  approvedBy: string;
  sourcePacketGeneratedAt: string | null;
  itemId: string;
  questionId: string;
  questionType: CrmEvidenceReviewQuestion['type'];
  targetPersonId: string | null;
  subject: CrmEvidenceReviewItem['subject'];
  candidateEmail: string;
  selectedOptionId: CrmEvidenceReviewDecisionOptionId;
  selectedOptionLabel: string;
  notes: string | null;
  relatedPersonName: string | null;
  evidenceSourceIds: string[];
  effect: CrmEvidenceReviewDecisionEffect;
  safety: {
    cardMutationExecuted: false;
    factStoreWriteExecuted: false;
    outboundExecuted: false;
  };
};

export type CrmEvidenceReviewDecisionLedgerSummary = {
  decisions: number;
  emailOwnershipDecisions: number;
  primaryEmailConfirmed: number;
  keptFamilyOrCompanion: number;
  relatedPersonCandidates: number;
  needsMoreEvidence: number;
  ignoredCandidates: number;
  latestDecidedAt: string | null;
};

export type CrmEvidenceReviewDecisionLedgerReadResult = {
  schemaVersion: typeof CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_evidence_review_decision_ledger';
  summary: CrmEvidenceReviewDecisionLedgerSummary;
  decisions: CrmStoredEvidenceReviewDecision[];
  invalidRows: number;
  safety: CrmEvidenceReviewDecisionLedgerSafety;
};

export type CrmEvidenceReviewDecisionLedgerAppendResult = {
  schemaVersion: typeof CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_evidence_review_decision_append' | 'local_evidence_review_decision_append';
  committed: boolean;
  decisionBatchId: string;
  incoming: number;
  added: CrmStoredEvidenceReviewDecision[];
  duplicatesSkipped: CrmStoredEvidenceReviewDecision[];
  invalidSelections: Array<{
    candidateEmail: string | null;
    questionId: string | null;
    selectedOptionId: string | null;
    reason: string;
  }>;
  summaryAfter: CrmEvidenceReviewDecisionLedgerSummary;
  safety: CrmEvidenceReviewDecisionLedgerSafety;
};

export type CrmEvidenceReviewDecisionLedgerSafety = {
  localOnly: true;
  outboundProhibited: true;
  cardMutationProhibited: true;
  factStoreWriteProhibited: true;
  credentialReadProhibited: true;
  approvalLedgerOnly: true;
  allowedUse: string[];
  prohibitedActions: string[];
};

export type CrmEvidenceReviewDecisionPacketForLedger = {
  generatedAt: string | null;
  reviewItems: CrmEvidenceReviewPacketReport['reviewItems'];
};

export type CrmEvidenceReviewDecisionAppendInput = CrmEvidenceReviewPacketInput & {
  packet?: CrmEvidenceReviewDecisionPacketForLedger | null;
  decisions: CrmEvidenceReviewDecisionInput[];
  approvedBy: string;
  commit?: boolean;
  ledgerPath?: string | null;
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
  const trimmed = cleanPublicText(value);
  return trimmed || null;
};

const resolveLedgerPath = (ledgerPath?: string | null): string =>
  resolve(ledgerPath || process.env.CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH || DEFAULT_CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH);

const makeDecisionBatchId = (now: string): string =>
  `evidence_decision_batch_${now.replace(/[^0-9]/g, '').slice(0, 14)}`;

const makeDecisionRecordId = (
  questionId: string,
  selectedOptionId: string,
  candidateEmail: string,
): string => `evidence_decision_${hashId([questionId, selectedOptionId, candidateEmail.toLowerCase()])}`;

const safety = (): CrmEvidenceReviewDecisionLedgerSafety => ({
  localOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  approvalLedgerOnly: true,
  allowedUse: [
    'Persist reviewed identity/evidence decisions locally.',
    'Provide provenance for a future card-write approval path.',
    'Separate approved evidence ownership from actual card mutation.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from this ledger.',
    'Do not write Fact Store from this ledger.',
    'Do not send outbound messages.',
    'Do not read or change credentials.',
    'Do not treat a stored decision as automatic permission to contact someone.',
  ],
});

const effectForOption = (optionId: CrmEvidenceReviewDecisionOptionId): CrmEvidenceReviewDecisionEffect => ({
  primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval: optionId === 'confirm_email_for_subject',
  keepEmailUnassigned: optionId === 'keep_email_unassigned_family_or_companion',
  createsRelatedPersonCandidate: optionId === 'create_related_person_candidate',
  needsMoreEvidence: optionId === 'ask_for_more_evidence',
  ignoredCandidate: optionId === 'ignore_candidate',
  cardWriteStillRequiresApproval: true,
});

const parseJsonl = (text: string): { decisions: CrmStoredEvidenceReviewDecision[]; invalidRows: number } => {
  const decisions: CrmStoredEvidenceReviewDecision[] = [];
  let invalidRows = 0;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as CrmStoredEvidenceReviewDecision;
      if (
        parsed?.schemaVersion === CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION
        && parsed.decisionRecordId
        && parsed.questionId
        && parsed.candidateEmail
      ) {
        decisions.push(parsed);
      } else {
        invalidRows += 1;
      }
    } catch {
      invalidRows += 1;
    }
  }

  return { decisions, invalidRows };
};

export const summarizeCrmEvidenceReviewDecisionLedger = (
  decisions: CrmStoredEvidenceReviewDecision[],
): CrmEvidenceReviewDecisionLedgerSummary => {
  let latestDecidedAt: string | null = null;
  for (const decision of decisions) {
    if (!latestDecidedAt || decision.decidedAt > latestDecidedAt) latestDecidedAt = decision.decidedAt;
  }
  return {
    decisions: decisions.length,
    emailOwnershipDecisions: decisions.filter((decision) => decision.questionType === 'email_ownership').length,
    primaryEmailConfirmed: decisions.filter((decision) => decision.effect.primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval).length,
    keptFamilyOrCompanion: decisions.filter((decision) => decision.effect.keepEmailUnassigned).length,
    relatedPersonCandidates: decisions.filter((decision) => decision.effect.createsRelatedPersonCandidate).length,
    needsMoreEvidence: decisions.filter((decision) => decision.effect.needsMoreEvidence).length,
    ignoredCandidates: decisions.filter((decision) => decision.effect.ignoredCandidate).length,
    latestDecidedAt,
  };
};

export const readCrmEvidenceReviewDecisionLedger = async (
  ledgerPath = resolveLedgerPath(),
  options: { now?: string | Date | null; limit?: number | null } = {},
): Promise<CrmEvidenceReviewDecisionLedgerReadResult> => {
  const generatedAt = isoNow(options.now);
  let parsed: { decisions: CrmStoredEvidenceReviewDecision[]; invalidRows: number } = { decisions: [], invalidRows: 0 };

  try {
    parsed = parseJsonl(await readFile(ledgerPath, 'utf8'));
  } catch {
    parsed = { decisions: [], invalidRows: 0 };
  }

  const sorted = parsed.decisions.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  const limit = typeof options.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : sorted.length;

  return {
    schemaVersion: CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_evidence_review_decision_ledger',
    summary: summarizeCrmEvidenceReviewDecisionLedger(parsed.decisions),
    decisions: sorted.slice(0, limit),
    invalidRows: parsed.invalidRows,
    safety: safety(),
  };
};

const findQuestion = (
  packet: CrmEvidenceReviewDecisionPacketForLedger,
  input: CrmEvidenceReviewDecisionInput,
): { item: CrmEvidenceReviewItem; question: CrmEvidenceReviewQuestion } | null => {
  const inputQuestionId = cleanString(input.questionId);
  const inputEmail = cleanString(input.candidateEmail)?.toLowerCase() ?? null;
  for (const item of packet.reviewItems) {
    for (const question of item.decisionQuestions) {
      if (inputQuestionId && question.questionId === inputQuestionId) return { item, question };
      if (inputEmail && question.candidateEmail.toLowerCase() === inputEmail) return { item, question };
    }
  }
  return null;
};

const evidenceSourceIdsFor = (
  item: CrmEvidenceReviewItem,
  candidateEmail: string,
): string[] =>
  item.ambiguousEmailCandidates
    .filter((candidate) => candidate.email.toLowerCase() === candidateEmail.toLowerCase())
    .flatMap((candidate) => candidate.sourceIds)
    .slice(0, 12);

const decisionRecordFor = (
  packet: CrmEvidenceReviewDecisionPacketForLedger,
  item: CrmEvidenceReviewItem,
  question: CrmEvidenceReviewQuestion,
  input: CrmEvidenceReviewDecisionInput,
  approvedBy: string,
  decisionBatchId: string,
  decidedAt: string,
): CrmStoredEvidenceReviewDecision | null => {
  const selectedOption = question.options.find((option) => option.optionId === input.selectedOptionId);
  if (!selectedOption) return null;
  const notes = cleanString(input.notes);
  const relatedPersonName = cleanString(input.relatedPersonName);
  return {
    schemaVersion: CRM_VNEXT_STORED_EVIDENCE_REVIEW_DECISION_SCHEMA_VERSION,
    decisionRecordId: makeDecisionRecordId(question.questionId, selectedOption.optionId, question.candidateEmail),
    decisionBatchId,
    decidedAt,
    approvedBy,
    sourcePacketGeneratedAt: cleanString(packet.generatedAt),
    itemId: item.itemId,
    questionId: question.questionId,
    questionType: question.type,
    targetPersonId: cleanString(item.targetPersonId),
    subject: item.subject,
    candidateEmail: question.candidateEmail.toLowerCase(),
    selectedOptionId: selectedOption.optionId,
    selectedOptionLabel: selectedOption.label,
    notes,
    relatedPersonName,
    evidenceSourceIds: evidenceSourceIdsFor(item, question.candidateEmail),
    effect: effectForOption(selectedOption.optionId),
    safety: {
      cardMutationExecuted: false,
      factStoreWriteExecuted: false,
      outboundExecuted: false,
    },
  };
};

export const appendCrmEvidenceReviewDecisions = async (
  input: CrmEvidenceReviewDecisionAppendInput,
): Promise<CrmEvidenceReviewDecisionLedgerAppendResult> => {
  const approvedBy = cleanString(input.approvedBy);
  if (!approvedBy) throw new Error('evidence_review_decisions_approved_by_required');
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const ledgerPath = resolveLedgerPath(input.ledgerPath);
  const packet = input.packet ?? buildCrmVNextEvidenceReviewPacket({
    ...input,
    now: generatedAt,
  });
  const current = await readCrmEvidenceReviewDecisionLedger(ledgerPath, { now: generatedAt });
  const existingIds = new Set(current.decisions.map((decision) => decision.decisionRecordId));
  const decisionBatchId = makeDecisionBatchId(generatedAt);
  const added: CrmStoredEvidenceReviewDecision[] = [];
  const duplicatesSkipped: CrmStoredEvidenceReviewDecision[] = [];
  const invalidSelections: CrmEvidenceReviewDecisionLedgerAppendResult['invalidSelections'] = [];

  for (const selection of input.decisions ?? []) {
    const found = findQuestion(packet, selection);
    if (!found) {
      invalidSelections.push({
        candidateEmail: cleanString(selection.candidateEmail),
        questionId: cleanString(selection.questionId),
        selectedOptionId: cleanString(selection.selectedOptionId),
        reason: 'matching_review_question_not_found',
      });
      continue;
    }
    const record = decisionRecordFor(packet, found.item, found.question, selection, approvedBy, decisionBatchId, generatedAt);
    if (!record) {
      invalidSelections.push({
        candidateEmail: found.question.candidateEmail,
        questionId: found.question.questionId,
        selectedOptionId: cleanString(selection.selectedOptionId),
        reason: 'selected_option_not_valid_for_question',
      });
      continue;
    }
    if (existingIds.has(record.decisionRecordId) || added.some((decision) => decision.decisionRecordId === record.decisionRecordId)) {
      duplicatesSkipped.push(record);
      continue;
    }
    added.push(record);
  }

  if (input.commit && added.length) {
    await mkdir(dirname(ledgerPath), { recursive: true });
    await appendFile(
      ledgerPath,
      added.map((decision) => JSON.stringify(decision)).join('\n') + '\n',
      'utf8',
    );
  }

  const summaryAfter = summarizeCrmEvidenceReviewDecisionLedger(
    input.commit ? [...current.decisions, ...added] : current.decisions,
  );

  return {
    schemaVersion: CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_SCHEMA_VERSION,
    generatedAt,
    mode: input.commit ? 'local_evidence_review_decision_append' : 'dry_run_evidence_review_decision_append',
    committed: Boolean(input.commit),
    decisionBatchId,
    incoming: input.decisions?.length ?? 0,
    added,
    duplicatesSkipped,
    invalidSelections,
    summaryAfter,
    safety: safety(),
  };
};
