import { createHash } from 'node:crypto';
import {
  buildCrmVNextCardApplyPreview,
  type CrmCardApplyPreviewInput,
  type CrmCardApplyPreviewItem,
  type CrmCardApplyPreviewReport,
} from './crm-vnext-card-apply-preview';
import type { CrmCardWriteMergeDecision } from './crm-vnext-card-write-merge-policy';
import type {
  CrmDeepLocalSourceKind,
  CrmDeepLocalStitchingClue,
  CrmDeepLocalStitchingHit,
} from './crm-vnext-deep-local-stitching';

export const CRM_VNEXT_EVIDENCE_REVIEW_PACKET_SCHEMA_VERSION =
  'crm-vnext-evidence-review-packet-2026-05-10' as const;

export type CrmEvidenceReviewDecisionOptionId =
  | 'confirm_email_for_subject'
  | 'keep_email_unassigned_family_or_companion'
  | 'create_related_person_candidate'
  | 'ask_for_more_evidence'
  | 'ignore_candidate';

export type CrmEvidenceReviewDecisionOption = {
  optionId: CrmEvidenceReviewDecisionOptionId;
  label: string;
  effect: string;
  stillRequiresApproval: string[];
};

export type CrmEvidenceReviewQuestion = {
  questionId: string;
  type: 'email_ownership';
  priority: 'high' | 'medium' | 'low';
  prompt: string;
  candidateEmail: string;
  recommendedOptionId: CrmEvidenceReviewDecisionOptionId;
  requiredBefore: string[];
  options: CrmEvidenceReviewDecisionOption[];
};

export type CrmEvidenceReviewEmailCandidate = {
  email: string;
  evidenceCount: number;
  sourceIds: string[];
  sourceKinds: Partial<Record<CrmDeepLocalSourceKind, number>>;
  snippets: string[];
  reviewReasons: Array<
    | 'family_or_companion_signal'
    | 'evidence_derived_identity_candidate'
    | 'weak_candidate_replacement'
    | 'multiple_email_candidates'
    | 'not_assigned_to_subject'
  >;
};

export type CrmEvidenceReviewRelatedPersonCandidate = {
  name: string;
  emailCandidate: string | null;
  sourceIds: string[];
  reason: string;
};

export type CrmEvidenceReviewItem = {
  itemId: string;
  clueId: string;
  previewId: string;
  targetPersonId: string | null;
  previewStatus: CrmCardApplyPreviewItem['status'];
  subject: {
    label: string;
    rawName: string | null;
    instagramHandle: string | null;
    proposedDisplayName: string | null;
  };
  candidateUpdates: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
    instagramHandle: string | null;
  };
  ambiguousEmailCandidates: CrmEvidenceReviewEmailCandidate[];
  possibleRelatedPeople: CrmEvidenceReviewRelatedPersonCandidate[];
  decisionQuestions: CrmEvidenceReviewQuestion[];
  recommendedOperatorAction: string;
  noWriteProof: {
    operationsExecuted: false;
    operationsPreviewed: number;
    cardMutationProhibited: true;
  };
};

export type CrmEvidenceReviewPacketReport = {
  schemaVersion: typeof CRM_VNEXT_EVIDENCE_REVIEW_PACKET_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_evidence_review_packet';
  preview: CrmCardApplyPreviewReport;
  summary: {
    reviewItems: number;
    emailOwnershipQuestions: number;
    ambiguousEmailCandidates: number;
    possibleRelatedPeople: number;
    operationsPreviewed: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  reviewItems: CrmEvidenceReviewItem[];
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

export type CrmEvidenceReviewPacketInput = CrmCardApplyPreviewInput & {
  preview?: CrmCardApplyPreviewReport | null;
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

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeEmail = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const countSourceKinds = (
  hits: CrmDeepLocalStitchingHit[],
): Partial<Record<CrmDeepLocalSourceKind, number>> => {
  const counts: Partial<Record<CrmDeepLocalSourceKind, number>> = {};
  for (const hit of hits) {
    counts[hit.sourceKind] = (counts[hit.sourceKind] ?? 0) + 1;
  }
  return counts;
};

const subjectLabelFor = (
  preview: CrmCardApplyPreviewItem,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): string => {
  const handle = stitchingClue?.person.instagramHandle;
  return cleanString(preview.proposedCardDraft?.displayName)
    ?? cleanString(stitchingClue?.person.rawName)
    ?? cleanString(handle ? `@${handle}` : null)
    ?? cleanString(preview.targetPersonId)
    ?? preview.clueId;
};

const hitsForEmail = (
  stitchingClue: CrmDeepLocalStitchingClue | null,
  email: string,
): CrmDeepLocalStitchingHit[] =>
  (stitchingClue?.hits ?? []).filter((hit) =>
    hit.identitySignals.emails.some((candidate) => candidate.toLowerCase() === email.toLowerCase()),
  );

const reviewReasonsForEmail = (
  preview: CrmCardApplyPreviewItem,
  email: string,
  hits: CrmDeepLocalStitchingHit[],
  decision: CrmCardWriteMergeDecision | null,
): CrmEvidenceReviewEmailCandidate['reviewReasons'] => {
  const reasons: CrmEvidenceReviewEmailCandidate['reviewReasons'] = [];
  if (hits.some((hit) => hit.contextSignals.includes('family_email_review_required'))) {
    reasons.push('family_or_companion_signal');
  }
  if (
    (
      decision?.evidenceAssessment.sourceSignals.includes('evidence_derived_identity_candidate')
      || decision?.evidenceAssessment.sourceSignals.includes('evidence_replaces_weak_identity_candidate')
    )
    && preview.identityResolution.emailCandidates.some((candidate) => normalizeEmail(candidate) === normalizeEmail(email))
  ) {
    reasons.push(
      decision?.evidenceAssessment.sourceSignals.includes('evidence_replaces_weak_identity_candidate')
        ? 'weak_candidate_replacement'
        : 'evidence_derived_identity_candidate',
    );
  }
  if (preview.identityResolution.emailCandidates.length > 1) {
    reasons.push('multiple_email_candidates');
  }
  if (preview.proposedCardDraft?.identities.email !== email) {
    reasons.push('not_assigned_to_subject');
  }
  return unique(reasons);
};

const emailAlreadyDecided = (
  preview: CrmCardApplyPreviewItem,
  email: string,
): boolean => {
  const summary = preview.identityResolution.evidenceDecisionSummary ?? {
    confirmedSubjectEmails: [],
    keptUnassignedEmails: [],
    relatedPersonCandidateEmails: [],
    needsMoreEvidenceEmails: [],
    ignoredEmails: [],
  };
  const decidedEmails = [
    ...summary.confirmedSubjectEmails,
    ...summary.keptUnassignedEmails,
    ...summary.relatedPersonCandidateEmails,
    ...summary.needsMoreEvidenceEmails,
    ...summary.ignoredEmails,
  ].map(normalizeEmail);
  return decidedEmails.includes(normalizeEmail(email));
};

const emailCandidatesFor = (
  preview: CrmCardApplyPreviewItem,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  decision: CrmCardWriteMergeDecision | null,
): CrmEvidenceReviewEmailCandidate[] =>
  preview.identityResolution.emailCandidates
    .filter((email) => !emailAlreadyDecided(preview, email))
    .map((email) => {
      const hits = hitsForEmail(stitchingClue, email);
      const reviewReasons = reviewReasonsForEmail(preview, email, hits, decision);
      return {
        email,
        evidenceCount: hits.length,
        sourceIds: unique(hits.map((hit) => hit.sourceId)).slice(0, 8),
        sourceKinds: countSourceKinds(hits),
        snippets: unique(hits.map((hit) => cleanPublicText(hit.snippet))).slice(0, 3),
        reviewReasons,
      };
    })
    .filter((candidate) => candidate.reviewReasons.length > 0);

const cleanNameCandidate = (value: string): string | null => {
  const cleaned = value
    .replace(/\b(?:File|Sheet|Row|Name|Email|Phone|City|Country|Context|Subject|Snippet|Title|From|To|Retiro|Retiros|Programas|Coherencia|Creativa|Ownership|Review|Required|Family|Companion)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:()[\]{}]+$/g, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return null;
  if (words.some((word) => !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(word))) return null;
  const normalized = normalize(cleaned);
  if (/\b(email|hotmail|gmail|yahoo|yoga|colombia|bogota|medellin|retiro|programa|evidence)\b/.test(normalized)) return null;
  return cleaned;
};

const genericNamesInSnippet = (snippet: string): string[] => {
  const namePart = String.raw`[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+`;
  const pattern = new RegExp(String.raw`\b(${namePart}(?:\s+${namePart}){1,4})\b`, 'gu');
  const candidates: string[] = [];
  for (const match of snippet.matchAll(pattern)) {
    const candidate = cleanNameCandidate(match[1] ?? '');
    if (candidate) candidates.push(candidate);
  }
  return unique(candidates);
};

const isSubjectName = (name: string, subjectLabel: string): boolean => {
  const normalizedName = normalize(name);
  const normalizedSubject = normalize(subjectLabel);
  if (!normalizedName || !normalizedSubject) return false;
  return normalizedName === normalizedSubject
    || normalizedName.includes(normalizedSubject)
    || normalizedSubject.includes(normalizedName);
};

const relatedPeopleFor = (
  subjectLabel: string,
  emailCandidates: CrmEvidenceReviewEmailCandidate[],
): CrmEvidenceReviewRelatedPersonCandidate[] => {
  const related = new Map<string, CrmEvidenceReviewRelatedPersonCandidate>();
  for (const candidate of emailCandidates) {
    const emailLocalPart = normalize(candidate.email.split('@')[0] ?? '');
    for (const snippet of candidate.snippets) {
      for (const name of genericNamesInSnippet(snippet)) {
        if (isSubjectName(name, subjectLabel)) continue;
        const normalizedName = normalize(name);
        const emailCandidate = normalizedName.split(/\s+/).some((token) => token.length >= 5 && emailLocalPart.includes(token))
          ? candidate.email
          : null;
        const existing = related.get(normalizedName);
        related.set(normalizedName, {
          name,
          emailCandidate: existing?.emailCandidate ?? emailCandidate,
          sourceIds: unique([...(existing?.sourceIds ?? []), ...candidate.sourceIds]).slice(0, 8),
          reason: emailCandidate
            ? 'Name appears near the ambiguous email and the email local-part hints at this person.'
            : 'Name appears in the same family/companion evidence snippet as an ambiguous email.',
        });
      }
    }
  }
  return Array.from(related.values()).slice(0, 6);
};

const option = (
  optionId: CrmEvidenceReviewDecisionOptionId,
  label: string,
  effect: string,
  stillRequiresApproval: string[] = ['card_write_policy'],
): CrmEvidenceReviewDecisionOption => ({
  optionId,
  label,
  effect,
  stillRequiresApproval,
});

const decisionQuestionForEmail = (
  itemId: string,
  subjectLabel: string,
  emailCandidate: CrmEvidenceReviewEmailCandidate,
  hasRelatedPeople: boolean,
): CrmEvidenceReviewQuestion => {
  const familySignal = emailCandidate.reviewReasons.includes('family_or_companion_signal');
  const evidenceDerivedSignal = emailCandidate.reviewReasons.includes('evidence_derived_identity_candidate')
    || emailCandidate.reviewReasons.includes('weak_candidate_replacement');
  const recommendedOptionId: CrmEvidenceReviewDecisionOptionId = familySignal
    ? 'keep_email_unassigned_family_or_companion'
    : evidenceDerivedSignal
      ? 'confirm_email_for_subject'
    : 'ask_for_more_evidence';
  const options = [
    option(
      'confirm_email_for_subject',
      `Confirm ${emailCandidate.email} as ${subjectLabel}'s email`,
      'A future approved write may set this as the subject primary email.',
      ['identity_owner_confirmation', 'card_write_policy'],
    ),
    option(
      'keep_email_unassigned_family_or_companion',
      'Keep email unassigned as family/companion evidence',
      'The email remains evidence but is not written as the subject primary email.',
      ['card_write_policy'],
    ),
    option(
      'ask_for_more_evidence',
      'Ask for more evidence',
      'Mantis should keep searching or ask Alejandro/Juana before any email assignment.',
      [],
    ),
    option(
      'ignore_candidate',
      'Ignore this email candidate',
      'The candidate is excluded from future write proposals unless new evidence appears.',
      ['identity_owner_confirmation'],
    ),
  ];
  if (hasRelatedPeople) {
    options.splice(2, 0, option(
      'create_related_person_candidate',
      'Prepare a related-person candidate',
      'A future review can create a separate family/companion card instead of assigning the email to the subject.',
      ['identity_owner_confirmation', 'card_write_policy'],
    ));
  }

  return {
    questionId: `evidence_question_${hashId([itemId, emailCandidate.email])}`,
    type: 'email_ownership',
    priority: familySignal || evidenceDerivedSignal ? 'high' : 'medium',
    prompt: `Does ${emailCandidate.email} belong to ${subjectLabel}, or should it stay as family/companion evidence?`,
    candidateEmail: emailCandidate.email,
    recommendedOptionId,
    requiredBefore: ['primary_email_assignment', 'card_write', 'merge_decision'],
    options,
  };
};

const reviewItemFor = (
  previewItem: CrmCardApplyPreviewItem,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  decision: CrmCardWriteMergeDecision | null,
): CrmEvidenceReviewItem | null => {
  const subjectLabel = subjectLabelFor(previewItem, stitchingClue);
  const ambiguousEmailCandidates = emailCandidatesFor(previewItem, stitchingClue, decision);
  if (!ambiguousEmailCandidates.length) return null;

  const possibleRelatedPeople = relatedPeopleFor(subjectLabel, ambiguousEmailCandidates);
  const itemId = `evidence_review_${hashId([previewItem.previewId, subjectLabel, ambiguousEmailCandidates.map((candidate) => candidate.email).join(',')])}`;
  const decisionQuestions = ambiguousEmailCandidates.map((candidate) =>
    decisionQuestionForEmail(itemId, subjectLabel, candidate, possibleRelatedPeople.length > 0),
  );
  return {
    itemId,
    clueId: previewItem.clueId,
    previewId: previewItem.previewId,
    targetPersonId: previewItem.targetPersonId,
    previewStatus: previewItem.status,
    subject: {
      label: subjectLabel,
      rawName: cleanString(stitchingClue?.person.rawName),
      instagramHandle: cleanString(stitchingClue?.person.instagramHandle),
      proposedDisplayName: cleanString(previewItem.proposedCardDraft?.displayName),
    },
    candidateUpdates: {
      displayName: cleanString(previewItem.proposedCardDraft?.displayName),
      email: cleanString(previewItem.proposedCardDraft?.identities.email),
      phone: cleanString(previewItem.proposedCardDraft?.identities.phone),
      instagramHandle: cleanString(previewItem.proposedCardDraft?.identities.instagramHandle),
    },
    ambiguousEmailCandidates,
    possibleRelatedPeople,
    decisionQuestions,
    recommendedOperatorAction: 'Keep the card write deferred. Ask/confirm email ownership before assigning a primary email; safe identity fields can stay as preview-only candidates.',
    noWriteProof: {
      operationsExecuted: false,
      operationsPreviewed: previewItem.operations.length,
      cardMutationProhibited: true,
    },
  };
};

const safety = (): CrmEvidenceReviewPacketReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  approvalPacketOnly: true,
  allowedUse: [
    'Turn Card Apply Preview output into human decision packets.',
    'Preserve ambiguous email ownership before any write path.',
    'Help Mantis ask Alejandro focused identity/ownership questions.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not change Google Drive, Gmail, MailerLite, Instagram, ManyChat, or WhatsApp.',
    'Do not treat a decision option as approval by itself.',
  ],
});

export const buildCrmVNextEvidenceReviewPacket = (
  input: CrmEvidenceReviewPacketInput,
): CrmEvidenceReviewPacketReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const preview = input.preview ?? buildCrmVNextCardApplyPreview({
    ...input,
    now: generatedAt,
  });
  const stitchingByClueId = new Map(preview.policy.stitching.clues.map((clue) => [clue.clueId, clue]));
  const decisionsByClueId = new Map(preview.policy.decisions.map((decision) => [decision.clueId, decision]));
  const reviewItems = preview.previews
    .map((previewItem) => reviewItemFor(
      previewItem,
      stitchingByClueId.get(previewItem.clueId) ?? null,
      decisionsByClueId.get(previewItem.clueId) ?? null,
    ))
    .filter((item): item is CrmEvidenceReviewItem => Boolean(item));
  const operationsPreviewed = preview.previews.reduce((sum, item) => sum + item.operations.length, 0);

  return {
    schemaVersion: CRM_VNEXT_EVIDENCE_REVIEW_PACKET_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_evidence_review_packet',
    preview,
    summary: {
      reviewItems: reviewItems.length,
      emailOwnershipQuestions: reviewItems.reduce((sum, item) => sum + item.decisionQuestions.length, 0),
      ambiguousEmailCandidates: reviewItems.reduce((sum, item) => sum + item.ambiguousEmailCandidates.length, 0),
      possibleRelatedPeople: reviewItems.reduce((sum, item) => sum + item.possibleRelatedPeople.length, 0),
      operationsPreviewed,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    reviewItems,
    safety: safety(),
  };
};
