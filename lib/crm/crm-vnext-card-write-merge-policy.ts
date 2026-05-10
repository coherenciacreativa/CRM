import { createHash } from 'node:crypto';
import type { CrmFactIntakeInput } from './crm-vnext-fact-intake';
import {
  buildCrmVNextDeepLocalStitching,
  type CrmDeepLocalSource,
  type CrmDeepLocalSourceKind,
  type CrmDeepLocalStitchingClue,
  type CrmDeepLocalStitchingInput,
  type CrmDeepLocalStitchingReport,
} from './crm-vnext-deep-local-stitching';
import {
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
} from './crm-vnext-identity-stitching-research';
import {
  buildCrmVNextMultiServiceCardProposal,
  type CrmMultiServiceCardProposal,
  type CrmMultiServiceCardProposalReport,
  type CrmMultiServiceCardTarget,
} from './crm-vnext-multi-service-card-proposal';
import { crmVNextNameCompatible } from './crm-vnext-name-matching';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_CARD_WRITE_MERGE_POLICY_SCHEMA_VERSION =
  'crm-vnext-card-write-merge-policy-2026-05-10' as const;

export type CrmCardWriteMergePolicyRouteStatus =
  | 'implemented'
  | 'viable_alternate'
  | 'recommended_before_final_write'
  | 'future_backlog';

export type CrmCardWriteMergeSourceRoute = {
  id: string;
  status: CrmCardWriteMergePolicyRouteStatus;
  allowedNow: boolean;
  requiresApprovalWhen: string[];
  outputContract: string;
  notes: string[];
};

export type CrmCardWriteMergeSourceConsultationPolicy = {
  gmail: {
    liveApiCalledByPolicy: false;
    routes: CrmCardWriteMergeSourceRoute[];
  };
  mailerLite: {
    liveApiCalledByPolicy: false;
    routes: CrmCardWriteMergeSourceRoute[];
  };
};

export type CrmCardWriteMergePolicyAction =
  | 'enrich_existing_card_after_review'
  | 'create_new_card_after_review'
  | 'merge_or_create_from_mailer_candidate_after_review'
  | 'defer_write_prepare_review_packet'
  | 'ask_for_more_identity';

export type CrmCardWriteMergeEligibility =
  | 'ready_for_human_approved_write'
  | 'needs_identity_review'
  | 'needs_privacy_review'
  | 'needs_identity_and_privacy_review'
  | 'needs_more_evidence'
  | 'blocked_by_policy';

export type CrmCardWriteMergeRequiredApproval =
  | 'card_write_policy'
  | 'identity_match'
  | 'merge_policy'
  | 'privacy_restricted_service'
  | 'live_source_consultation';

export type CrmCardWriteMergeEvidenceGrade =
  | 'high'
  | 'medium'
  | 'low'
  | 'insufficient';

export type CrmCardWriteMergeDecision = {
  decisionId: string;
  clueId: string;
  personHint: CrmIdentityStitchingClue['person'];
  target: CrmMultiServiceCardTarget;
  serviceKeys: string[];
  privacyWarnings: string[];
  evidenceAssessment: {
    identityEvidenceScore: number;
    grade: CrmCardWriteMergeEvidenceGrade;
    sourceSignals: string[];
    blockers: string[];
    deepLocalHits: {
      total: number;
      strong: number;
      medium: number;
      weak: number;
      sourceKinds: Partial<Record<CrmDeepLocalSourceKind, number>>;
    };
  };
  recommendedWrite: {
    action: CrmCardWriteMergePolicyAction;
    eligibility: CrmCardWriteMergeEligibility;
    automaticWriteAllowed: false;
    automaticMergeAllowed: false;
    reason: string;
    requiredApprovals: CrmCardWriteMergeRequiredApproval[];
    applyPreconditions: string[];
    nextEvidenceActions: string[];
  };
  mergePolicy: {
    mayMergeWhen: string[];
    mustNotMergeWhen: string[];
    mailerLiteRole: string;
    gmailBrowserRole: string;
  };
};

export type CrmCardWriteMergePolicyReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_WRITE_MERGE_POLICY_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_card_write_merge_policy';
  proposal: CrmMultiServiceCardProposalReport;
  stitching: CrmDeepLocalStitchingReport;
  sourceConsultationPolicy: CrmCardWriteMergeSourceConsultationPolicy;
  policyRules: {
    automaticWritesAllowed: false;
    automaticMergesAllowed: false;
    mailerLiteConsultationRecommended: true;
    mantisChromeGmailRouteAccepted: true;
    restrictedServiceWriteRequiresHumanReview: true;
    rules: string[];
  };
  summary: {
    decisions: number;
    readyForHumanApprovedWrite: number;
    needsIdentityReview: number;
    needsPrivacyReview: number;
    needsMoreEvidence: number;
    blockedByPolicy: number;
    createNewCardCandidates: number;
    enrichExistingCardCandidates: number;
    mergeOrMailerReviewCandidates: number;
    deferredWrites: number;
  };
  decisions: CrmCardWriteMergeDecision[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmCardWriteMergePolicyInput = CrmFactIntakeInput & {
  cards: PersonCardVNext[];
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  proposal?: CrmMultiServiceCardProposalReport | null;
  stitching?: CrmDeepLocalStitchingReport | null;
  localSources?: CrmDeepLocalSource[] | null;
  sourceCoverage?: CrmDeepLocalStitchingInput['sourceCoverage'];
  now?: string | Date | null;
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

const sourceConsultationPolicy = (): CrmCardWriteMergeSourceConsultationPolicy => ({
  gmail: {
    liveApiCalledByPolicy: false,
    routes: [
      {
        id: 'gmail_evidence_helper',
        status: 'implemented',
        allowedNow: true,
        requiresApprovalWhen: [
          'A credential refresh, OAuth prompt, or permission change is needed.',
          'The operator wants to export bulk mailbox data instead of selected snippets.',
        ],
        outputContract: 'redacted gmail_export evidenceSources',
        notes: [
          'Use the helper to plan queries and convert supplied read-only results.',
          'The CRM API itself does not call live Gmail.',
        ],
      },
      {
        id: 'mantis_chrome_gmail_browser',
        status: 'viable_alternate',
        allowedNow: true,
        requiresApprovalWhen: [
          'Chrome/Gmail asks for login, MFA, Keychain, or a new permission.',
          'The operator would need to send, label, archive, delete, or modify email.',
        ],
        outputContract: 'selected redacted snippets converted into gmail_export evidenceSources',
        notes: [
          'This is a valid fallback when Mantis already has an authenticated Chrome session.',
          'Browser evidence must be copied into CRM as selected evidence, not as a credential dependency.',
        ],
      },
    ],
  },
  mailerLite: {
    liveApiCalledByPolicy: false,
    routes: [
      {
        id: 'local_mailer_bridge',
        status: 'implemented',
        allowedNow: true,
        requiresApprovalWhen: [
          'The local export/bridge is missing and a fresh credentialed sync is needed.',
        ],
        outputContract: 'mailer_bridge candidate rows used as identity and tag evidence',
        notes: [
          'Use local MailerLite bridge rows as first-line evidence for email, tags, and subscriber identity.',
        ],
      },
      {
        id: 'mailerlite_read_only_ui_or_export',
        status: 'recommended_before_final_write',
        allowedNow: true,
        requiresApprovalWhen: [
          'MailerLite asks for authentication, API tokens, or permissions.',
          'The operator would change tags, groups, automations, subscribers, or campaign state.',
        ],
        outputContract: 'selected tag/segment/campaign evidence converted into evidence packets or refreshed local bridge rows',
        notes: [
          'Consult MailerLite before final card creation or merge when email/tags may settle identity.',
          'Read-only UI review or explicit export is acceptable; credential or subscriber mutation is not.',
        ],
      },
    ],
  },
});

const safety = (): CrmCardWriteMergePolicyReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  allowedUse: [
    'Decide whether a proposed card action is ready for human-approved write, merge review, or more evidence.',
    'Encode MailerLite and Gmail evidence consultation rules for Mantis.',
    'Keep restricted service context separate from outbound or public use.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not merge records automatically.',
    'Do not write to Fact Store.',
    'Do not send outbound messages.',
    'Do not change MailerLite, Gmail, Instagram, ManyChat, WhatsApp, Telegram, or browser state.',
    'Do not refresh or read credentials.',
  ],
});

const countHitSourceKinds = (
  hits: CrmDeepLocalStitchingClue['hits'],
): Partial<Record<CrmDeepLocalSourceKind, number>> => {
  const counts: Partial<Record<CrmDeepLocalSourceKind, number>> = {};
  for (const hit of hits) {
    counts[hit.sourceKind] = (counts[hit.sourceKind] ?? 0) + 1;
  }
  return counts;
};

const gradeForScore = (score: number): CrmCardWriteMergeEvidenceGrade => {
  if (score >= 85) return 'high';
  if (score >= 65) return 'medium';
  if (score >= 45) return 'low';
  return 'insufficient';
};

const hasSourceKind = (
  sourceKinds: Partial<Record<CrmDeepLocalSourceKind, number>>,
  kinds: CrmDeepLocalSourceKind[],
): boolean => kinds.some((kind) => (sourceKinds[kind] ?? 0) > 0);

const baseScoreForTarget = (target: CrmMultiServiceCardTarget): number => {
  if (target.type === 'existing_card') return 88;
  if (target.type === 'new_card_from_mailer_candidate') return 72;
  if (target.type === 'new_card_from_stable_identity') return 62;
  if (target.type === 'review_possible_candidates') return 40;
  return 22;
};

const evidenceAssessmentFor = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): CrmCardWriteMergeDecision['evidenceAssessment'] => {
  const hits = stitchingClue?.hits ?? [];
  const sourceKinds = countHitSourceKinds(hits);
  const strong = hits.filter((hit) => hit.confidence === 'strong').length;
  const medium = hits.filter((hit) => hit.confidence === 'medium').length;
  const weak = hits.filter((hit) => hit.confidence === 'weak').length;
  const sourceSignals: string[] = [];
  const blockers: string[] = [];

  let score = baseScoreForTarget(proposal.target);
  if (proposal.target.source === 'person_cards_v1') sourceSignals.push('existing_person_card_candidate');
  if (proposal.target.source === 'mailer_bridge_candidates_enriched') {
    sourceSignals.push('mailer_lite_bridge_candidate');
    score += 8;
  }
  const hintStableIdentity = Boolean(proposal.personHint.email || proposal.personHint.instagramHandle || proposal.personHint.phone);
  const targetStableIdentity = Boolean(
    proposal.target.identities.email
    || proposal.target.identities.instagramHandle
    || proposal.target.identities.phone,
  );

  if (hintStableIdentity) {
    sourceSignals.push('stable_identity_hint_present');
    score += 6;
  }
  if (
    !hintStableIdentity
    && targetStableIdentity
    && proposal.target.source === 'fact_hint'
    && (
      proposal.target.reason.includes('single compatible stable identifier')
      || proposal.target.reason.includes('replaces a weak identity candidate')
    )
  ) {
    sourceSignals.push('evidence_derived_identity_candidate');
    score += 8;
  }
  if (proposal.target.reason.includes('replaces a weak identity candidate')) {
    sourceSignals.push('evidence_replaces_weak_identity_candidate');
    score += 6;
  }
  if (strong) {
    sourceSignals.push('strong_deep_local_evidence');
    score += Math.min(12, strong * 6);
  }
  if (medium) {
    sourceSignals.push('medium_deep_local_evidence');
    score += Math.min(8, medium * 4);
  }
  if (hasSourceKind(sourceKinds, ['gmail_export'])) {
    sourceSignals.push('gmail_evidence_present');
    score += 8;
  }
  if (hasSourceKind(sourceKinds, ['contacts_app_export', 'contacts_export'])) {
    sourceSignals.push('contacts_evidence_present');
    score += 8;
  }
  if (hasSourceKind(sourceKinds, ['mailerlite_export'])) {
    sourceSignals.push('mailer_lite_export_evidence_present');
    score += 8;
  }
  if (hasSourceKind(sourceKinds, ['google_drive_export'])) {
    sourceSignals.push('google_drive_evidence_present');
    score += 6;
  }
  if (hasSourceKind(sourceKinds, ['retreat_table'])) {
    sourceSignals.push('retreat_table_evidence_present');
    score += 6;
  }
  if (hasSourceKind(sourceKinds, ['local_csv'])) {
    sourceSignals.push('local_csv_evidence_present');
    score += 4;
  }
  if (stitchingClue?.recommendation.action === 'defer_new_card_creation') {
    sourceSignals.push('deep_local_defers_new_card_creation');
  }
  if (proposal.privacyApprovalRequired) {
    blockers.push('restricted_service_context_requires_privacy_review');
  }
  if (proposal.identityApprovalRequired) {
    blockers.push('identity_review_required_before_write');
  }
  if (!hintStableIdentity && !targetStableIdentity) {
    blockers.push('missing_stable_identifier');
    score -= 18;
  }

  const identityEvidenceScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    identityEvidenceScore,
    grade: gradeForScore(identityEvidenceScore),
    sourceSignals: unique(sourceSignals),
    blockers: unique(blockers),
    deepLocalHits: {
      total: hits.length,
      strong,
      medium,
      weak,
      sourceKinds,
    },
  };
};

const evidenceHasFamilyReviewSignal = (
  stitchingClue: CrmDeepLocalStitchingClue | null,
  email: string,
): boolean =>
  (stitchingClue?.hits ?? []).some((hit) =>
    hit.identitySignals.emails.some((candidate) => candidate.toLowerCase() === email.toLowerCase())
    && hit.contextSignals.includes('family_email_review_required'),
  );

const compatibleEvidenceName = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): string | null => {
  const rawName = proposal.personHint.rawName ?? proposal.target.displayName;
  const candidates = stitchingClue?.identitySummary.fullNameCandidates ?? [];
  return candidates.find((candidate) => crmVNextNameCompatible(rawName, candidate)) ?? null;
};

const hitHasCompatibleName = (
  hit: CrmDeepLocalStitchingClue['hits'][number],
  rawName: string | null | undefined,
): boolean =>
  hit.identitySignals.fullNameCandidates.some((candidate) => crmVNextNameCompatible(rawName, candidate))
  || crmVNextNameCompatible(rawName, hit.snippet);

const emailEvidenceScore = (
  hit: CrmDeepLocalStitchingClue['hits'][number],
): number => {
  const sourceBonus: Partial<Record<CrmDeepLocalSourceKind, number>> = {
    contacts_app_export: 34,
    contacts_export: 34,
    mailerlite_export: 30,
    gmail_export: 26,
    google_drive_export: 22,
    retreat_table: 20,
    local_csv: 16,
    downloaded_file: 14,
  };
  const confidenceBonus = hit.confidence === 'strong' ? 18 : hit.confidence === 'medium' ? 10 : 3;
  const identityBonus = hit.identitySignals.fullNameCandidates.length ? 14 : 0;
  return hit.score + confidenceBonus + identityBonus + (sourceBonus[hit.sourceKind] ?? 0);
};

const rankedEvidenceEmails = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): Array<{ email: string; score: number }> => {
  if (!stitchingClue) return [];
  const rawName = proposal.personHint.rawName ?? proposal.target.displayName;
  const byEmail = new Map<string, { email: string; score: number }>();

  for (const hit of stitchingClue.hits) {
    if (!hitHasCompatibleName(hit, rawName)) continue;
    for (const email of hit.identitySignals.emails) {
      if (evidenceHasFamilyReviewSignal(stitchingClue, email)) continue;
      const normalizedEmail = email.toLowerCase();
      const current = byEmail.get(normalizedEmail);
      const score = emailEvidenceScore(hit);
      if (!current || score > current.score) {
        byEmail.set(normalizedEmail, { email, score });
      }
    }
  }

  return Array.from(byEmail.values())
    .sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
};

const targetLooksWeakAgainstEvidence = (
  proposal: CrmMultiServiceCardProposal,
  evidenceName: string | null,
): boolean => {
  if (proposal.target.type !== 'review_possible_candidates') return false;
  if (proposal.target.confidence === 'weak') return true;
  if (typeof proposal.target.score === 'number' && proposal.target.score < 65) return true;
  if (evidenceName && proposal.target.displayName && !crmVNextNameCompatible(evidenceName, proposal.target.displayName)) {
    return true;
  }
  return false;
};

const evidenceDerivedTargetFor = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): CrmMultiServiceCardTarget | null => {
  if (!stitchingClue || proposal.target.type !== 'needs_more_identity') return null;
  if (proposal.personHint.email || proposal.personHint.instagramHandle || proposal.personHint.phone) return null;

  const displayName = compatibleEvidenceName(proposal, stitchingClue);
  if (!displayName) return null;

  const emails = unique(stitchingClue.identitySummary.emails)
    .filter((email) => !evidenceHasFamilyReviewSignal(stitchingClue, email));
  const phones = unique(stitchingClue.identitySummary.phones);
  const handles = unique(stitchingClue.identitySummary.instagramHandles);

  const email = emails.length === 1 ? emails[0] : null;
  const handle = handles.length === 1 ? handles[0] : null;
  const phone = phones.length === 1 ? phones[0] : null;
  const personId = email
    ? `email:${email.toLowerCase()}`
    : handle
      ? `ig:${handle.replace(/^@+/, '').toLowerCase()}`
      : phone
        ? `phone:${phone.replace(/\D/g, '')}`
        : null;
  if (!personId) return null;

  return {
    type: 'review_possible_candidates',
    personId,
    displayName,
    identities: {
      email,
      instagramHandle: handle ? handle.replace(/^@+/, '').toLowerCase() : null,
      phone,
      city: proposal.target.identities.city,
      country: proposal.target.identities.country,
    },
    source: 'fact_hint',
    confidence: 'medium',
    score: 68,
    reason: 'A single compatible stable identifier was found in read-only connected/local evidence; this is a review target, not a write approval.',
  };
};

const evidenceReplacementTargetFor = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): CrmMultiServiceCardTarget | null => {
  if (!stitchingClue || proposal.target.type !== 'review_possible_candidates') return null;
  const displayName = compatibleEvidenceName(proposal, stitchingClue);
  if (!targetLooksWeakAgainstEvidence(proposal, displayName)) return null;

  const rankedEmails = rankedEvidenceEmails(proposal, stitchingClue);
  const email = rankedEmails[0]?.email ?? null;
  if (!email) return null;

  return {
    type: 'review_possible_candidates',
    personId: `email:${email.toLowerCase()}`,
    displayName: displayName ?? proposal.personHint.rawName ?? proposal.target.displayName,
    identities: {
      email,
      instagramHandle: null,
      phone: unique(stitchingClue.identitySummary.phones)[0] ?? null,
      city: proposal.target.identities.city,
      country: proposal.target.identities.country,
    },
    source: 'fact_hint',
    confidence: 'medium',
    score: Math.min(88, Math.max(68, Math.round(rankedEmails[0].score / 2))),
    reason: 'Read-only connected/local evidence replaces a weak identity candidate for review; this is not a write approval.',
  };
};

const requiredApprovalsFor = (
  proposal: CrmMultiServiceCardProposal,
  action: CrmCardWriteMergePolicyAction,
): CrmCardWriteMergeRequiredApproval[] => {
  const approvals: CrmCardWriteMergeRequiredApproval[] = ['card_write_policy'];
  if (proposal.identityApprovalRequired || action !== 'enrich_existing_card_after_review') {
    approvals.push('identity_match');
  }
  if (action === 'merge_or_create_from_mailer_candidate_after_review' || action === 'defer_write_prepare_review_packet') {
    approvals.push('merge_policy');
  }
  if (proposal.privacyApprovalRequired) approvals.push('privacy_restricted_service');
  return unique(approvals);
};

const eligibilityFor = (
  proposal: CrmMultiServiceCardProposal,
  action: CrmCardWriteMergePolicyAction,
  assessment: CrmCardWriteMergeDecision['evidenceAssessment'],
): CrmCardWriteMergeEligibility => {
  if (action === 'ask_for_more_identity') return 'needs_more_evidence';
  if (action === 'defer_write_prepare_review_packet') return 'needs_identity_review';
  if (proposal.identityApprovalRequired && proposal.privacyApprovalRequired) return 'needs_identity_and_privacy_review';
  if (proposal.identityApprovalRequired) return 'needs_identity_review';
  if (proposal.privacyApprovalRequired) return 'needs_privacy_review';
  if (assessment.grade === 'insufficient') return 'needs_more_evidence';
  return 'ready_for_human_approved_write';
};

const actionFor = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  assessment: CrmCardWriteMergeDecision['evidenceAssessment'],
): CrmCardWriteMergePolicyAction => {
  if (proposal.target.type === 'existing_card') return 'enrich_existing_card_after_review';
  if (proposal.target.type === 'new_card_from_mailer_candidate') return 'merge_or_create_from_mailer_candidate_after_review';
  if (proposal.target.type === 'new_card_from_stable_identity') {
    if (stitchingClue?.recommendation.action === 'defer_new_card_creation') {
      return 'defer_write_prepare_review_packet';
    }
    return assessment.grade === 'medium' || assessment.grade === 'high'
      ? 'create_new_card_after_review'
      : 'defer_write_prepare_review_packet';
  }
  if (proposal.target.type === 'review_possible_candidates') return 'defer_write_prepare_review_packet';
  return 'ask_for_more_identity';
};

const reasonFor = (
  action: CrmCardWriteMergePolicyAction,
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): string => {
  if (action === 'enrich_existing_card_after_review') {
    return proposal.privacyApprovalRequired
      ? 'The identity target is an existing card, but restricted service context must be reviewed before applying any patch.'
      : 'The identity target is an existing card; this can become a human-approved enrichment patch once the write policy exists.';
  }
  if (action === 'merge_or_create_from_mailer_candidate_after_review') {
    return 'MailerLite bridge evidence can seed the identity, but Mantis should review whether this is a new card or a merge before writing.';
  }
  if (action === 'create_new_card_after_review') {
    return 'The clue has a stable identity and enough evidence to prepare a new-card write proposal for human approval.';
  }
  if (action === 'defer_write_prepare_review_packet') {
    if (proposal.target.reason.includes('replaces a weak identity candidate')) {
      return 'Read-only evidence is stronger than the weak current candidate, so Mantis can review the evidence-derived target before any card write.';
    }
    if (proposal.target.reason.includes('single compatible stable identifier')) {
      return 'Read-only evidence found a single compatible stable identifier, so Mantis can review it as a stitch target before any card write.';
    }
    return stitchingClue?.recommendation.action === 'defer_new_card_creation'
      ? 'Connected or local evidence exists, so creation should be deferred until the review packet decides whether to merge or enrich.'
      : 'The identity is not settled enough for a card write; prepare a review packet with next evidence actions.';
  }
  return 'The clue needs a stable identifier or human-confirmed match before any card write or merge proposal.';
};

const nextEvidenceActionsFor = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  assessment: CrmCardWriteMergeDecision['evidenceAssessment'],
): string[] => {
  const actions: string[] = [];
  const sourceKinds = assessment.deepLocalHits.sourceKinds;
  const missingContactFields = stitchingClue?.identitySummary.missingContactFields ?? [];
  if (!hasSourceKind(sourceKinds, ['gmail_export'])) {
    actions.push('Use Gmail Evidence Helper or Mantis Chrome/Gmail read-only route to gather selected gmail_export evidence.');
  }
  if (missingContactFields.includes('email') || missingContactFields.includes('phone')) {
    actions.push('Run a contact-field hunt for missing email/phone across MailerLite read-only export, Google Drive/Sheets retreat tables, macOS Contacts, Zoom registration/participant reports, and downloaded CSV/XLSX files.');
  }
  if (proposal.target.source !== 'mailer_bridge_candidates_enriched') {
    actions.push('Consult MailerLite local bridge/tags before final creation or merge, especially to settle email and subscriber history.');
  }
  if (!hasSourceKind(sourceKinds, ['contacts_app_export', 'contacts_export'])) {
    actions.push('Search contacts exports or the contact list read-only if identity is still sparse.');
  }
  if (stitchingClue?.recommendation.action === 'defer_new_card_creation') {
    actions.push('Review deep-local hits before deciding create vs merge vs enrich.');
  }
  if (proposal.privacyApprovalRequired) {
    actions.push('Review restricted service visibility before any card field is written or shown to team members.');
  }
  if (!proposal.personHint.email && !proposal.personHint.instagramHandle && !proposal.personHint.phone) {
    actions.push('Ask Alejandro/Juana for email, Instagram handle, phone, or direct confirmation.');
  }
  return unique(actions);
};

const applyPreconditionsFor = (
  proposal: CrmMultiServiceCardProposal,
  action: CrmCardWriteMergePolicyAction,
): string[] => {
  const preconditions = [
    'A card-write implementation exists and has been explicitly approved.',
    'The exact target card or new-card id is reviewed.',
    'All evidence snippets are provenance-rich and non-secret.',
  ];
  if (action === 'merge_or_create_from_mailer_candidate_after_review' || action === 'defer_write_prepare_review_packet') {
    preconditions.push('Merge decision is explicit: create, enrich existing, or merge duplicate identities.');
  }
  if (proposal.privacyApprovalRequired) {
    preconditions.push('Restricted service fields are reviewed for internal visibility and outbound prohibition.');
  }
  return preconditions;
};

const mergePolicyFor = (): CrmCardWriteMergeDecision['mergePolicy'] => ({
  mayMergeWhen: [
    'An exact stable identifier matches: same email, same normalized Instagram handle, same phone, or Alejandro explicitly confirms.',
    'MailerLite tags, Gmail snippets, contacts, and retreat tables agree with the same person and do not conflict.',
    'The merge preserves multiple service relationships instead of replacing one with another.',
  ],
  mustNotMergeWhen: [
    'Only a first name or weak name token matches.',
    'Emails, phone numbers, or Instagram handles conflict without human resolution.',
    'Restricted service context would become visible or actionable beyond approved internal use.',
    'The next move would trigger outbound communication without explicit approval.',
  ],
  mailerLiteRole: 'MailerLite is first-class identity and engagement evidence, especially for email, tags, groups, opens/clicks, and subscriber history; it is not by itself permission to merge when stable identifiers conflict.',
  gmailBrowserRole: 'Mantis Chrome/Gmail browser search is a viable read-only evidence route when already authenticated; selected snippets must be redacted and converted to gmail_export packets before CRM use.',
});

const decisionForProposal = (
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): CrmCardWriteMergeDecision => {
  const effectiveProposal = {
    ...proposal,
    target: evidenceReplacementTargetFor(proposal, stitchingClue)
      ?? evidenceDerivedTargetFor(proposal, stitchingClue)
      ?? proposal.target,
  };
  const assessment = evidenceAssessmentFor(effectiveProposal, stitchingClue);
  const action = actionFor(effectiveProposal, stitchingClue, assessment);
  const eligibility = eligibilityFor(effectiveProposal, action, assessment);
  return {
    decisionId: `card_policy_${hashId([proposal.proposalId, proposal.clueId, effectiveProposal.target.personId, action])}`,
    clueId: effectiveProposal.clueId,
    personHint: effectiveProposal.personHint,
    target: effectiveProposal.target,
    serviceKeys: effectiveProposal.serviceRelationships.map((service) => service.serviceKey),
    privacyWarnings: effectiveProposal.privacyWarnings,
    evidenceAssessment: assessment,
    recommendedWrite: {
      action,
      eligibility,
      automaticWriteAllowed: false,
      automaticMergeAllowed: false,
      reason: reasonFor(action, effectiveProposal, stitchingClue),
      requiredApprovals: requiredApprovalsFor(effectiveProposal, action),
      applyPreconditions: applyPreconditionsFor(effectiveProposal, action),
      nextEvidenceActions: nextEvidenceActionsFor(effectiveProposal, stitchingClue, assessment),
    },
    mergePolicy: mergePolicyFor(),
  };
};

export const buildCrmVNextCardWriteMergePolicy = (
  input: CrmCardWriteMergePolicyInput,
): CrmCardWriteMergePolicyReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const proposal = input.proposal ?? buildCrmVNextMultiServiceCardProposal({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards,
    mailerBridgeRows: input.mailerBridgeRows,
  });
  const stitching = input.stitching ?? buildCrmVNextDeepLocalStitching({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards,
    mailerBridgeRows: input.mailerBridgeRows,
    research: proposal.research,
    localSources: input.localSources ?? [],
    sourceCoverage: input.sourceCoverage,
  });
  const stitchingByClueId = new Map(stitching.clues.map((clue) => [clue.clueId, clue]));
  const decisions = proposal.proposals.map((item) => decisionForProposal(
    item,
    stitchingByClueId.get(item.clueId) ?? null,
  ));

  return {
    schemaVersion: CRM_VNEXT_CARD_WRITE_MERGE_POLICY_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_card_write_merge_policy',
    proposal,
    stitching,
    sourceConsultationPolicy: sourceConsultationPolicy(),
    policyRules: {
      automaticWritesAllowed: false,
      automaticMergesAllowed: false,
      mailerLiteConsultationRecommended: true,
      mantisChromeGmailRouteAccepted: true,
      restrictedServiceWriteRequiresHumanReview: true,
      rules: [
        'No card is written by this policy.',
        'No merge is automatic.',
        'Existing cards can receive enrichment proposals after human-approved write policy.',
        'New cards require stable identity plus evidence review.',
        'MailerLite should be consulted before final creation or merge when email/tags may settle identity.',
        'Mantis Chrome/Gmail browser evidence is acceptable only as read-only selected snippets converted into evidenceSources.',
        'Therapy/psychology can be stored as a restricted service relationship when Alejandro reports it, but clinical details stay out of cards.',
      ],
    },
    summary: {
      decisions: decisions.length,
      readyForHumanApprovedWrite: decisions.filter((decision) => decision.recommendedWrite.eligibility === 'ready_for_human_approved_write').length,
      needsIdentityReview: decisions.filter((decision) => ['needs_identity_review', 'needs_identity_and_privacy_review'].includes(decision.recommendedWrite.eligibility)).length,
      needsPrivacyReview: decisions.filter((decision) => ['needs_privacy_review', 'needs_identity_and_privacy_review'].includes(decision.recommendedWrite.eligibility)).length,
      needsMoreEvidence: decisions.filter((decision) => decision.recommendedWrite.eligibility === 'needs_more_evidence').length,
      blockedByPolicy: decisions.filter((decision) => decision.recommendedWrite.eligibility === 'blocked_by_policy').length,
      createNewCardCandidates: decisions.filter((decision) => decision.recommendedWrite.action === 'create_new_card_after_review').length,
      enrichExistingCardCandidates: decisions.filter((decision) => decision.recommendedWrite.action === 'enrich_existing_card_after_review').length,
      mergeOrMailerReviewCandidates: decisions.filter((decision) => decision.recommendedWrite.action === 'merge_or_create_from_mailer_candidate_after_review').length,
      deferredWrites: decisions.filter((decision) => decision.recommendedWrite.action === 'defer_write_prepare_review_packet').length,
    },
    decisions,
    safety: safety(),
  };
};
