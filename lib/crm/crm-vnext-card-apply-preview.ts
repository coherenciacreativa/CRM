import { createHash } from 'node:crypto';
import {
  buildCrmVNextCardWriteMergePolicy,
  type CrmCardWriteMergeDecision,
  type CrmCardWriteMergePolicyInput,
  type CrmCardWriteMergePolicyReport,
} from './crm-vnext-card-write-merge-policy';
import type { CrmDeepLocalStitchingClue } from './crm-vnext-deep-local-stitching';
import type { CrmStoredEvidenceReviewDecision } from './crm-vnext-evidence-review-decisions';
import type { CrmMultiServiceCardProposal } from './crm-vnext-multi-service-card-proposal';
import { crmVNextNameCompatible } from './crm-vnext-name-matching';
import {
  buildPersonCardVNext,
  type PersonCardEvidence,
  type PersonCardVNext,
} from './person-card-vnext';

export const CRM_VNEXT_CARD_APPLY_PREVIEW_SCHEMA_VERSION =
  'crm-vnext-card-apply-preview-2026-05-10' as const;

export type CrmCardApplyPreviewStatus =
  | 'ready_for_human_approved_apply'
  | 'blocked_requires_review'
  | 'deferred_review_packet'
  | 'needs_more_identity';

export type CrmCardApplyPreviewOperationType =
  | 'create_card_candidate'
  | 'enrich_existing_card'
  | 'stage_merge_review'
  | 'stage_deferred_write_review'
  | 'stage_identity_request'
  | 'add_evidence'
  | 'add_service_relationship'
  | 'mark_restricted_service'
  | 'add_relationship_context';

export type CrmCardApplyPreviewOperation = {
  operationId: string;
  type: CrmCardApplyPreviewOperationType;
  path: string;
  value: unknown;
  wouldMutate: true;
  executed: false;
  approvalRequired: string[];
  reason: string;
};

export type CrmCardApplyPreviewItem = {
  previewId: string;
  decisionId: string;
  clueId: string;
  status: CrmCardApplyPreviewStatus;
  targetPersonId: string | null;
  identityResolution: {
    fullNameCandidates: string[];
    emailCandidates: string[];
    phoneCandidates: string[];
    instagramHandles: string[];
    cityCandidates: string[];
    countryCandidates: string[];
    missingContactFields: Array<'email' | 'phone' | 'instagramHandle'>;
    evidenceSourceKinds: CrmDeepLocalStitchingClue['identitySummary']['sourceKindsWithIdentitySignals'];
    evidenceDecisionSummary: {
      confirmedSubjectEmails: string[];
      keptUnassignedEmails: string[];
      relatedPersonCandidateEmails: string[];
      needsMoreEvidenceEmails: string[];
      ignoredEmails: string[];
      appliedDecisionRecordIds: string[];
    };
  };
  currentCard: {
    exists: boolean;
    personId: string | null;
    displayName: string | null;
    identities: {
      email: string | null;
      phone: string | null;
      instagramHandle: string | null;
    };
    evidenceCount: number | null;
  };
  proposedCardDraft: PersonCardVNext | null;
  blockedBy: string[];
  operations: CrmCardApplyPreviewOperation[];
  safetyNote: string;
};

export type CrmCardApplyPreviewReport = {
  schemaVersion: typeof CRM_VNEXT_CARD_APPLY_PREVIEW_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_card_apply_preview';
  policy: CrmCardWriteMergePolicyReport;
  summary: {
    previews: number;
    readyForHumanApprovedApply: number;
    blockedRequiresReview: number;
    deferredReviewPackets: number;
    needsMoreIdentity: number;
    operations: number;
    createCardCandidates: number;
    enrichExistingCardCandidates: number;
    mergeReviewPackets: number;
    restrictedServiceOperations: number;
  };
  previews: CrmCardApplyPreviewItem[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    writeImplementationAbsent: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmCardApplyPreviewInput = CrmCardWriteMergePolicyInput & {
  policy?: CrmCardWriteMergePolicyReport | null;
  evidenceReviewDecisions?: CrmStoredEvidenceReviewDecision[] | null;
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

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeEmail = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

const wordCount = (value: string | null | undefined): number =>
  cleanPublicText(value ?? '').split(/\s+/).filter(Boolean).length;

const normalizedHandle = (value: string | null | undefined): string =>
  normalize(value?.replace(/^@+/, '') ?? null);

const nameCompatibleWithRawHint = (
  candidate: string,
  rawNameTerm: string,
): boolean => crmVNextNameCompatible(rawNameTerm, candidate);

const structuredOwnerNameCandidates = (snippet: string): string[] => {
  const patterns = [
    /\bName\s*:\s*([^|<\n\r]+?)(?=\s*\||\s+(?:Thread display name|Instagram|Handle|Email|Phone|City|Country|Context|Profile URL|Observed)\s*:|<|$)/gi,
    /\bFrom\s*:\s*([^<\n\r]+?)(?=<|\s+Subject\s*:|$)/gi,
    /\b(?:Contact|Subscriber)\s*:\s*([^|<\n\r]+?)(?=\s*\||\s+(?:Thread display name|Instagram|Handle|Email|Phone|City|Country|Context|Profile URL|Observed)\s*:|<|$)/gi,
  ];
  const candidates: string[] = [];
  for (const pattern of patterns) {
    for (const match of snippet.matchAll(pattern)) {
      const cleaned = cleanPublicText(match[1] ?? '')
        .replace(/\b(?:Email|Phone|City|Country|Context|Subject)\b.*$/i, '')
        .replace(/[<>"'()[\]{}]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (wordCount(cleaned) >= 2 && wordCount(cleaned) <= 6) candidates.push(cleaned);
    }
  }
  return unique(candidates);
};

const structuredFieldCandidates = (snippet: string, labels: string[]): string[] => {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const boundaryLabels = [
    'Source',
    'Flow',
    'Flow ID',
    'Contact ID',
    'Name',
    'Instagram',
    'Handle',
    'Email',
    'Phone',
    'City',
    'Ciudad',
    'Country',
    'País',
    'Pais',
    'Tags/groups',
    'Tags',
    'Groups',
    'Context',
    'Preferences',
    'Tone',
    'Thread context',
    'Confidence',
    'Finding',
    'Observed at',
  ].map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`\\b(?:${labelPattern})\\s*:\\s*([^|;\\n\\r]+?)(?=\\s+(?:${boundaryLabels})\\s*:|\\s*(?:\\||;|$))`, 'gi');
  const candidates: string[] = [];
  for (const match of snippet.matchAll(pattern)) {
    const cleaned = cleanPublicText(match[1] ?? '')
      .replace(/\b(?:Email|Phone|City|Country|Context|Confidence|Finding|Groups|Tags|Source)\b.*$/i, '')
      .replace(/[<>"'()[\]{}]+/g, ' ')
      .replace(/[.,]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned && cleaned.length <= 80) candidates.push(cleaned);
  }
  return unique(candidates);
};

const structuredCitiesFromHits = (hits: CrmDeepLocalStitchingClue['hits']): string[] =>
  unique(hits.flatMap((hit) => structuredFieldCandidates(hit.snippet, ['City', 'Ciudad'])));

const structuredCountriesFromHits = (hits: CrmDeepLocalStitchingClue['hits']): string[] =>
  unique(hits.flatMap((hit) => structuredFieldCandidates(hit.snippet, ['Country', 'País', 'Pais'])));

const fullNameCandidatesFromRelevantHits = (
  hits: CrmDeepLocalStitchingClue['hits'],
  rawNameTerm: string,
): string[] =>
  unique(hits
    .flatMap((hit) => [
      ...hit.identitySignals.fullNameCandidates,
      ...structuredOwnerNameCandidates(hit.snippet),
    ])
    .filter((candidate) => wordCount(candidate) >= 2)
    .filter((candidate) => !rawNameTerm || nameCompatibleWithRawHint(candidate, rawNameTerm)))
    .sort((a, b) => wordCount(b) - wordCount(a) || b.length - a.length);

const structuredIdentityHitNamesDifferentPerson = (
  hit: CrmDeepLocalStitchingClue['hits'][number],
  rawNameTerm: string,
): boolean => {
  if (!rawNameTerm) return false;
  if (!hit.identitySignals.emails.length && !hit.identitySignals.phones.length && !hit.identitySignals.instagramHandles.length) {
    return false;
  }
  if (!/\b(?:Name|From|Contact|Subscriber)\s*:/i.test(hit.snippet)) return false;
  const namedPeople = unique([
    ...structuredOwnerNameCandidates(hit.snippet),
    ...hit.identitySignals.fullNameCandidates.filter((candidate) => wordCount(candidate) >= 2),
  ]);
  if (!namedPeople.length) return false;
  return !namedPeople.some((candidate) => nameCompatibleWithRawHint(candidate, rawNameTerm));
};

const relevantHitsForDecision = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): CrmDeepLocalStitchingClue['hits'] => {
  const hits = stitchingClue?.hits ?? [];
  const rawNameTerm = normalize(decision.personHint.rawName ?? decision.target.displayName);
  const emailHints = new Set([
    decision.personHint.email,
    decision.target.identities.email,
  ].map(normalizeEmail).filter(Boolean));
  const handleHints = new Set([
    decision.personHint.instagramHandle,
    decision.target.identities.instagramHandle,
  ].map(normalizedHandle).filter(Boolean));
  const phoneHints = new Set([
    decision.personHint.phone,
    decision.target.identities.phone,
  ].map((phone) => (phone ?? '').replace(/\D/g, '')).filter(Boolean));

  return hits.filter((hit) => {
    if (hit.identitySignals.emails.some((email) => emailHints.has(normalizeEmail(email)))) return true;
    if (hit.identitySignals.instagramHandles.some((handle) => handleHints.has(normalizedHandle(handle)))) return true;
    if (hit.identitySignals.phones.some((phone) => phoneHints.has(phone.replace(/\D/g, '')))) return true;
    if (rawNameTerm && hit.identitySignals.fullNameCandidates.some((candidate) => nameCompatibleWithRawHint(candidate, rawNameTerm))) return true;
    if (structuredIdentityHitNamesDifferentPerson(hit, rawNameTerm)) return false;
    if (rawNameTerm && crmVNextNameCompatible(rawNameTerm, hit.snippet)) return true;
    return false;
  });
};

const evidenceReviewDecisionAppliesToDecision = (
  storedDecision: CrmStoredEvidenceReviewDecision,
  decision: CrmCardWriteMergeDecision,
): boolean => {
  if (storedDecision.targetPersonId && decision.target.personId) {
    return storedDecision.targetPersonId === decision.target.personId;
  }
  return storedDecisionSubjectMatches(storedDecision, decision);
};

const evidenceDecisionSourceIdsForDecision = (
  decision: CrmCardWriteMergeDecision,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[],
): Set<string> =>
  new Set(evidenceReviewDecisions
    .filter((storedDecision) => evidenceReviewDecisionAppliesToDecision(storedDecision, decision))
    .flatMap((storedDecision) => storedDecision.evidenceSourceIds)
    .filter((sourceId): sourceId is string => Boolean(cleanPublicText(sourceId ?? ''))));

const relevantHitsWithEvidenceDecisions = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [],
): CrmDeepLocalStitchingClue['hits'] => {
  const directHits = relevantHitsForDecision(decision, stitchingClue);
  const evidenceSourceIds = evidenceDecisionSourceIdsForDecision(decision, evidenceReviewDecisions);
  if (!evidenceSourceIds.size) return directHits;
  const byId = new Map(directHits.map((hit) => [hit.hitId, hit]));
  for (const hit of stitchingClue?.hits ?? []) {
    if (evidenceSourceIds.has(hit.sourceId)) byId.set(hit.hitId, hit);
  }
  return Array.from(byId.values());
};

const sourceKindsForHits = (
  hits: CrmDeepLocalStitchingClue['hits'],
): CrmDeepLocalStitchingClue['identitySummary']['sourceKindsWithIdentitySignals'] => {
  const counts: CrmDeepLocalStitchingClue['identitySummary']['sourceKindsWithIdentitySignals'] = {};
  for (const hit of hits) {
    counts[hit.sourceKind] = (counts[hit.sourceKind] ?? 0) + 1;
  }
  return counts;
};

const handleHintsForDecision = (decision: CrmCardWriteMergeDecision): Set<string> =>
  new Set([
    decision.personHint.instagramHandle,
    decision.target.identities.instagramHandle,
  ].map(normalizedHandle).filter(Boolean));

const instagramHandlesFromRelevantHits = (
  decision: CrmCardWriteMergeDecision,
  hits: CrmDeepLocalStitchingClue['hits'],
): string[] => {
  const handleHints = handleHintsForDecision(decision);
  const handles = unique(hits.flatMap((hit) => hit.identitySignals.instagramHandles));
  if (!handleHints.size) return handles.length === 1 ? handles : [];
  return handles.filter((handle) => handleHints.has(normalizedHandle(handle)));
};

const evidenceFromProposal = (
  proposal: CrmMultiServiceCardProposal,
  generatedAt: string,
): PersonCardEvidence[] => {
  const evidenceTexts = unique([
    ...proposal.serviceRelationships.flatMap((service) => service.evidenceTexts),
    ...proposal.relationshipContexts.map((context) => context.evidenceText),
  ]).slice(0, 8);

  return evidenceTexts.map((text) => ({
    source: 'crm-vnext-card-apply-preview',
    observedAt: generatedAt,
    note: cleanPublicText(text),
  }));
};

const evidenceFromStitching = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  generatedAt: string,
): PersonCardEvidence[] => {
  const candidateHits = relevantHitsForDecision(decision, stitchingClue)
    .filter((hit) => hit.confidence === 'strong' || hit.confidence === 'medium');
  const selectedHits = unique([
    ...candidateHits.filter((hit) => hit.identitySignals.fullNameCandidates.length > 0),
    ...candidateHits.filter((hit) => hit.identitySignals.emails.length > 0 || hit.identitySignals.phones.length > 0),
    ...candidateHits,
  ].map((hit) => JSON.stringify(hit)))
    .map((item) => JSON.parse(item) as CrmDeepLocalStitchingClue['hits'][number])
    .slice(0, 5);

  return selectedHits.map((hit) => ({
    source: `crm-vnext-deep-local-stitching:${hit.sourceKind}`,
    observedAt: generatedAt,
    note: cleanPublicText(hit.snippet),
  }));
};

const evidenceForDraft = (
  decision: CrmCardWriteMergeDecision,
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  generatedAt: string,
): PersonCardEvidence[] => unique([
  ...evidenceFromProposal(proposal, generatedAt),
  ...evidenceFromStitching(decision, stitchingClue, generatedAt),
].map((evidence) => JSON.stringify(evidence)))
  .map((item) => JSON.parse(item) as PersonCardEvidence)
  .slice(0, 12);

const emptyEvidenceDecisionSummary = (): CrmCardApplyPreviewItem['identityResolution']['evidenceDecisionSummary'] => ({
  confirmedSubjectEmails: [],
  keptUnassignedEmails: [],
  relatedPersonCandidateEmails: [],
  needsMoreEvidenceEmails: [],
  ignoredEmails: [],
  appliedDecisionRecordIds: [],
});

const evidenceDecisionMatches = (
  storedDecision: CrmStoredEvidenceReviewDecision,
  decision: CrmCardWriteMergeDecision,
  email: string,
): boolean => {
  if (normalizeEmail(storedDecision.candidateEmail) !== normalizeEmail(email)) return false;
  if (storedDecision.targetPersonId && decision.target.personId) {
    return storedDecision.targetPersonId === decision.target.personId;
  }
  return !storedDecision.targetPersonId && storedDecisionSubjectMatches(storedDecision, decision);
};

const storedDecisionSubjectMatches = (
  storedDecision: CrmStoredEvidenceReviewDecision,
  decision: CrmCardWriteMergeDecision,
): boolean => {
  const storedHandle = normalizedHandle(storedDecision.subject.instagramHandle);
  const decisionHandle = normalizedHandle(decision.personHint.instagramHandle ?? decision.target.identities.instagramHandle);
  if (storedHandle && decisionHandle && storedHandle === decisionHandle) return true;

  const decisionName = cleanPublicText(decision.personHint.rawName ?? decision.target.displayName ?? '');
  const storedNames = [
    storedDecision.subject.rawName,
    storedDecision.subject.proposedDisplayName,
    storedDecision.subject.label,
  ].filter((value): value is string => Boolean(cleanPublicText(value ?? '')));
  if (!decisionName || !storedNames.length) return false;
  return storedNames.some((name) => crmVNextNameCompatible(decisionName, name));
};

const latestEvidenceDecisionForEmail = (
  decision: CrmCardWriteMergeDecision,
  email: string,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[],
): CrmStoredEvidenceReviewDecision | null =>
  evidenceReviewDecisions
    .filter((storedDecision) => evidenceDecisionMatches(storedDecision, decision, email))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0] ?? null;

const latestAnyEvidenceDecisionForEmail = (
  email: string,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[],
): CrmStoredEvidenceReviewDecision | null =>
  evidenceReviewDecisions
    .filter((storedDecision) => normalizeEmail(storedDecision.candidateEmail) === normalizeEmail(email))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0] ?? null;

const evidenceDecisionSummaryFor = (
  decision: CrmCardWriteMergeDecision,
  emailCandidates: string[],
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[],
): CrmCardApplyPreviewItem['identityResolution']['evidenceDecisionSummary'] => {
  const summary = emptyEvidenceDecisionSummary();
  for (const email of unique(emailCandidates.map(normalizeEmail).filter(Boolean))) {
    const storedDecision = latestEvidenceDecisionForEmail(decision, email, evidenceReviewDecisions);
    const anyDecision = storedDecision ?? latestAnyEvidenceDecisionForEmail(email, evidenceReviewDecisions);
    if (!anyDecision) continue;
    summary.appliedDecisionRecordIds.push(anyDecision.decisionRecordId);
    if (!storedDecision) {
      summary.relatedPersonCandidateEmails.push(email);
    } else if (storedDecision.effect.primaryEmailAssignmentAllowedAfterSeparateCardWriteApproval) {
      summary.confirmedSubjectEmails.push(email);
    } else if (storedDecision.effect.keepEmailUnassigned) {
      summary.keptUnassignedEmails.push(email);
    } else if (storedDecision.effect.createsRelatedPersonCandidate) {
      summary.relatedPersonCandidateEmails.push(email);
    } else if (storedDecision.effect.needsMoreEvidence) {
      summary.needsMoreEvidenceEmails.push(email);
    } else if (storedDecision.effect.ignoredCandidate) {
      summary.ignoredEmails.push(email);
    }
  }
  return {
    confirmedSubjectEmails: unique(summary.confirmedSubjectEmails),
    keptUnassignedEmails: unique(summary.keptUnassignedEmails),
    relatedPersonCandidateEmails: unique(summary.relatedPersonCandidateEmails),
    needsMoreEvidenceEmails: unique(summary.needsMoreEvidenceEmails),
    ignoredEmails: unique(summary.ignoredEmails),
    appliedDecisionRecordIds: unique(summary.appliedDecisionRecordIds),
  };
};

const identityHintsFromStitching = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [],
): {
  displayName: string | null;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  city: string | null;
  country: string | null;
} => {
  const rawNameTerm = normalize(decision.personHint.rawName);
  const relevantHits = relevantHitsWithEvidenceDecisions(decision, stitchingClue, evidenceReviewDecisions);
  const fullNameCandidates = fullNameCandidatesFromRelevantHits(relevantHits, rawNameTerm);
  const emailHits = relevantHits.filter((hit) => hit.identitySignals.emails.length);
  const emails = unique(emailHits.flatMap((hit) => hit.identitySignals.emails));
  const evidenceDecisionSummary = evidenceDecisionSummaryFor(decision, emails, evidenceReviewDecisions);
  const blockedEmails = new Set([
    ...evidenceDecisionSummary.keptUnassignedEmails,
    ...evidenceDecisionSummary.relatedPersonCandidateEmails,
    ...evidenceDecisionSummary.needsMoreEvidenceEmails,
    ...evidenceDecisionSummary.ignoredEmails,
  ].map(normalizeEmail));
  const familyReviewRequiredWithoutDecision = emailHits.some((hit) =>
    hit.contextSignals.includes('family_email_review_required')
    && hit.identitySignals.emails.some((email) => !latestEvidenceDecisionForEmail(decision, email, evidenceReviewDecisions)),
  );
  const identityBridgeRequiredWithoutDecision = emailHits.some((hit) =>
    hit.contextSignals.includes('identity_bridge_review_required')
    && hit.identitySignals.emails.some((email) => !latestEvidenceDecisionForEmail(decision, email, evidenceReviewDecisions)),
  );
  const assignableEmails = emails.filter((email) => !blockedEmails.has(normalizeEmail(email)));
  const phones = unique(relevantHits.flatMap((hit) => hit.identitySignals.phones));
  const handles = unique(instagramHandlesFromRelevantHits(decision, relevantHits));
  const cities = structuredCitiesFromHits(relevantHits);
  const countries = structuredCountriesFromHits(relevantHits);
  const confirmedSubjectEmails = evidenceDecisionSummary.confirmedSubjectEmails;

  return {
    displayName: fullNameCandidates[0] ?? null,
    email: confirmedSubjectEmails.length === 1
      ? confirmedSubjectEmails[0]
      : assignableEmails.length === 1 && !familyReviewRequiredWithoutDecision && !identityBridgeRequiredWithoutDecision
        ? assignableEmails[0]
        : null,
    phone: phones[0] ?? null,
    instagramHandle: handles[0] ?? null,
    city: cities.length === 1 ? cities[0] : null,
    country: countries.length === 1 ? countries[0] : null,
  };
};

const displayNameForDraft = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
): string | null => {
  const hintedName = identityHintsFromStitching(decision, stitchingClue).displayName;
  const targetName = decision.target.displayName;
  if (!hintedName) return targetName;
  if (!targetName || wordCount(targetName) < wordCount(hintedName)) return hintedName;
  return targetName;
};

const identityResolutionFor = (
  decision: CrmCardWriteMergeDecision,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [],
): CrmCardApplyPreviewItem['identityResolution'] => {
  const hints = identityHintsFromStitching(decision, stitchingClue, evidenceReviewDecisions);
  const relevantHits = relevantHitsWithEvidenceDecisions(decision, stitchingClue, evidenceReviewDecisions);
  const emailCandidates = unique([
    decision.target.identities.email,
    hints.email,
    ...relevantHits.flatMap((hit) => hit.identitySignals.emails),
  ].filter((value): value is string => Boolean(cleanPublicText(value ?? ''))));
  const phoneCandidates = unique([
    decision.target.identities.phone,
    hints.phone,
    ...relevantHits.flatMap((hit) => hit.identitySignals.phones),
  ].filter((value): value is string => Boolean(cleanPublicText(value ?? ''))));
  const instagramHandles = unique([
    decision.target.identities.instagramHandle,
    hints.instagramHandle,
    ...instagramHandlesFromRelevantHits(decision, relevantHits),
  ]
    .filter((value): value is string => Boolean(cleanPublicText(value ?? '')))
    .map((handle) => handle.replace(/^@+/, '').toLowerCase()));
  const cityCandidates = unique([
    decision.target.identities.city,
    hints.city,
    ...structuredCitiesFromHits(relevantHits),
  ].filter((value): value is string => Boolean(cleanPublicText(value ?? ''))));
  const countryCandidates = unique([
    decision.target.identities.country,
    hints.country,
    ...structuredCountriesFromHits(relevantHits),
  ].filter((value): value is string => Boolean(cleanPublicText(value ?? ''))));
  const fullNameCandidates = unique([
    hints.displayName,
    ...fullNameCandidatesFromRelevantHits(relevantHits, normalize(decision.personHint.rawName ?? decision.target.displayName)),
    ...(stitchingClue?.identitySummary.fullNameCandidates ?? []),
    decision.target.displayName,
  ].filter((value): value is string =>
    Boolean(cleanPublicText(value ?? ''))
    && wordCount(value) >= 2
    && (
      !normalize(decision.personHint.rawName ?? decision.target.displayName)
      || nameCompatibleWithRawHint(value, normalize(decision.personHint.rawName ?? decision.target.displayName))
    ),
  ));
  const hasAssignableEmail = Boolean(decision.target.identities.email || hints.email);
  const evidenceDecisionSummary = evidenceDecisionSummaryFor(decision, emailCandidates, evidenceReviewDecisions);

  return {
    fullNameCandidates,
    emailCandidates,
    phoneCandidates,
    instagramHandles,
    cityCandidates,
    countryCandidates,
    missingContactFields: ([
      hasAssignableEmail ? null : 'email',
      phoneCandidates.length ? null : 'phone',
      instagramHandles.length ? null : 'instagramHandle',
    ].filter(Boolean) as Array<'email' | 'phone' | 'instagramHandle'>),
    evidenceSourceKinds: sourceKindsForHits(relevantHits),
    evidenceDecisionSummary,
  };
};

const scoringForServices = (
  proposal: CrmMultiServiceCardProposal,
): Parameters<typeof buildPersonCardVNext>[0]['scoring'] => {
  const serviceKeys = new Set(proposal.serviceRelationships.map((service) => service.serviceKey));
  return {
    participation: {
      yogaClasses90d: serviceKeys.has('yoga_classes') ? 1 : 0,
      happyCircle90d: serviceKeys.has('happy_circle') ? 1 : 0,
      retreatsAttended: serviceKeys.has('retreats') ? 1 : 0,
    },
    purchases: {
      activeClient: serviceKeys.has('therapy_consultations') || serviceKeys.has('mentorship'),
      purchaseCount: serviceKeys.has('therapy_consultations') || serviceKeys.has('mentorship') || serviceKeys.has('digital_products') ? 1 : 0,
    },
  };
};

const draftCardFor = (
  decision: CrmCardWriteMergeDecision,
  proposal: CrmMultiServiceCardProposal,
  stitchingClue: CrmDeepLocalStitchingClue | null,
  generatedAt: string,
  evidenceReviewDecisions: CrmStoredEvidenceReviewDecision[] = [],
): PersonCardVNext | null => {
  if (!decision.target.personId) return null;
  if (
    decision.recommendedWrite.action !== 'create_new_card_after_review'
    && decision.recommendedWrite.action !== 'merge_or_create_from_mailer_candidate_after_review'
    && decision.recommendedWrite.action !== 'defer_write_prepare_review_packet'
  ) {
    return null;
  }
  const identityHints = identityHintsFromStitching(decision, stitchingClue, evidenceReviewDecisions);

  return buildPersonCardVNext({
    personId: decision.target.personId,
    displayName: displayNameForDraft(decision, stitchingClue),
    now: generatedAt,
    identities: {
      email: decision.target.identities.email ?? identityHints.email,
      instagramHandle: decision.target.identities.instagramHandle ?? identityHints.instagramHandle,
      phone: decision.target.identities.phone ?? identityHints.phone,
      city: decision.target.identities.city ?? identityHints.city,
      country: decision.target.identities.country ?? identityHints.country,
    },
    scoring: scoringForServices(proposal),
    evidence: evidenceForDraft(decision, proposal, stitchingClue, generatedAt),
  });
};

const statusForDecision = (
  decision: CrmCardWriteMergeDecision,
): CrmCardApplyPreviewStatus => {
  if (decision.recommendedWrite.action === 'ask_for_more_identity') return 'needs_more_identity';
  if (decision.recommendedWrite.action === 'defer_write_prepare_review_packet') return 'deferred_review_packet';
  if (decision.recommendedWrite.eligibility === 'ready_for_human_approved_write') return 'ready_for_human_approved_apply';
  return 'blocked_requires_review';
};

const op = (
  previewId: string,
  type: CrmCardApplyPreviewOperationType,
  path: string,
  value: unknown,
  index: number,
  approvalRequired: string[],
  reason: string,
): CrmCardApplyPreviewOperation => ({
  operationId: `apply_op_${hashId([previewId, type, path, String(index)])}`,
  type,
  path,
  value,
  wouldMutate: true,
  executed: false,
  approvalRequired,
  reason,
});

const serviceValue = (service: CrmMultiServiceCardProposal['serviceRelationships'][number]) => ({
  serviceKey: service.serviceKey,
  label: service.label,
  role: service.role,
  status: service.status,
  privacy: service.privacy,
  confidence: service.confidence,
  factIds: service.factIds,
  notes: service.notes,
});

const operationsFor = (
  previewId: string,
  decision: CrmCardWriteMergeDecision,
  proposal: CrmMultiServiceCardProposal,
  currentCard: PersonCardVNext | null,
  proposedCardDraft: PersonCardVNext | null,
): CrmCardApplyPreviewOperation[] => {
  const approvals = decision.recommendedWrite.requiredApprovals;
  const operations: CrmCardApplyPreviewOperation[] = [];
  const targetPath = decision.target.personId ? `/cards/${encodeURIComponent(decision.target.personId)}` : '/review/unresolved-identity';

  if (decision.recommendedWrite.action === 'enrich_existing_card_after_review') {
    operations.push(op(
      previewId,
      'enrich_existing_card',
      targetPath,
      {
        personId: decision.target.personId,
        displayName: currentCard?.displayName ?? decision.target.displayName,
        services: proposal.serviceRelationships.map(serviceValue),
      },
      operations.length,
      approvals,
      'Enrich the existing card after approval.',
    ));
  } else if (decision.recommendedWrite.action === 'create_new_card_after_review' && proposedCardDraft) {
    operations.push(op(
      previewId,
      'create_card_candidate',
      '/cards/-',
      proposedCardDraft,
      operations.length,
      approvals,
      'Create a new person-card candidate after approval.',
    ));
  } else if (decision.recommendedWrite.action === 'merge_or_create_from_mailer_candidate_after_review') {
    operations.push(op(
      previewId,
      'stage_merge_review',
      '/review/merge-candidates/-',
      {
        target: decision.target,
        proposedCardDraft,
        mergePolicy: decision.mergePolicy,
        evidenceAssessment: decision.evidenceAssessment,
      },
      operations.length,
      approvals,
      'Stage a create-vs-merge review packet before any card write.',
    ));
  } else if (decision.recommendedWrite.action === 'defer_write_prepare_review_packet') {
    operations.push(op(
      previewId,
      'stage_deferred_write_review',
      '/review/deferred-writes/-',
      {
        target: decision.target,
        proposedCardDraft,
        evidenceAssessment: decision.evidenceAssessment,
        nextEvidenceActions: decision.recommendedWrite.nextEvidenceActions,
      },
      operations.length,
      approvals,
      'Stage evidence for review before deciding create, enrich, or merge.',
    ));
  } else if (decision.recommendedWrite.action === 'ask_for_more_identity') {
    operations.push(op(
      previewId,
      'stage_identity_request',
      '/review/identity-requests/-',
      {
        personHint: decision.personHint,
        nextEvidenceActions: decision.recommendedWrite.nextEvidenceActions,
      },
      operations.length,
      approvals,
      'Ask for more identity before any card work.',
    ));
  }

  for (const evidence of evidenceFromProposal(proposal, proposedCardDraft?.updatedAt ?? currentCard?.updatedAt ?? '')) {
    operations.push(op(
      previewId,
      'add_evidence',
      `${targetPath}/evidence/-`,
      evidence,
      operations.length,
      approvals,
      'Attach provenance-rich evidence to the card proposal.',
    ));
  }

  for (const service of proposal.serviceRelationships) {
    operations.push(op(
      previewId,
      'add_service_relationship',
      `${targetPath}/future/serviceRelationships/-`,
      serviceValue(service),
      operations.length,
      approvals,
      'Add a service relationship while preserving multi-service context.',
    ));
    if (service.privacy === 'restricted') {
      operations.push(op(
        previewId,
        'mark_restricted_service',
        `${targetPath}/future/restrictedServices/-`,
        {
          serviceKey: service.serviceKey,
          label: service.label,
          prohibitedUse: 'No outbound, public, or broad team visibility without explicit review.',
        },
        operations.length,
        unique([...approvals, 'privacy_restricted_service']),
        'Mark restricted service context before any storage or display expansion.',
      ));
    }
  }

  for (const context of proposal.relationshipContexts) {
    operations.push(op(
      previewId,
      'add_relationship_context',
      `${targetPath}/future/relationshipContexts/-`,
      {
        code: context.code,
        detail: context.detail,
        privacy: context.privacy,
      },
      operations.length,
      approvals,
      'Preserve relationship context as review-only nuance.',
    ));
  }

  return operations;
};

const safety = (): CrmCardApplyPreviewReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  writeImplementationAbsent: true,
  allowedUse: [
    'Preview exact card operations before implementing a write path.',
    'Review create, enrich, merge, deferred, and identity-request packets.',
    'Confirm approvals required before any future apply command can exist.',
  ],
  prohibitedActions: [
    'Do not write person cards.',
    'Do not merge person records.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, MailerLite, Instagram, ManyChat, WhatsApp, or Telegram APIs.',
    'Do not treat this preview as approval to apply operations.',
  ],
});

export const buildCrmVNextCardApplyPreview = (
  input: CrmCardApplyPreviewInput,
): CrmCardApplyPreviewReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const policy = input.policy ?? buildCrmVNextCardWriteMergePolicy({
    ...input,
    observedAt: generatedAt,
  });
  const proposalsByClueId = new Map(policy.proposal.proposals.map((proposal) => [proposal.clueId, proposal]));
  const stitchingByClueId = new Map(policy.stitching.clues.map((clue) => [clue.clueId, clue]));
  const cardsById = new Map(input.cards.map((card) => [card.personId, card]));
  const evidenceReviewDecisions = input.evidenceReviewDecisions ?? [];
  const previews = policy.decisions.map((decision): CrmCardApplyPreviewItem => {
    const proposal = proposalsByClueId.get(decision.clueId);
    if (!proposal) {
      const previewId = `apply_preview_${hashId([decision.decisionId, 'missing-proposal'])}`;
      return {
        previewId,
        decisionId: decision.decisionId,
        clueId: decision.clueId,
        status: 'needs_more_identity',
        targetPersonId: decision.target.personId,
        identityResolution: identityResolutionFor(decision, null, evidenceReviewDecisions),
        currentCard: {
          exists: false,
          personId: null,
          displayName: null,
          identities: {
            email: null,
            phone: null,
            instagramHandle: null,
          },
          evidenceCount: null,
        },
        proposedCardDraft: null,
        blockedBy: ['missing_card_proposal'],
        operations: [
          op(
            previewId,
            'stage_identity_request',
            '/review/identity-requests/-',
            { personHint: decision.personHint },
            0,
            decision.recommendedWrite.requiredApprovals,
            'No matching proposal was available for this decision.',
          ),
        ],
        safetyNote: 'Preview only. No operation was executed.',
      };
    }

    const currentCard = decision.target.personId ? cardsById.get(decision.target.personId) ?? null : null;
    const stitchingClue = stitchingByClueId.get(decision.clueId) ?? null;
    const proposedCardDraft = draftCardFor(decision, proposal, stitchingClue, generatedAt, evidenceReviewDecisions);
    const previewId = `apply_preview_${hashId([decision.decisionId, decision.target.personId, decision.recommendedWrite.action])}`;
    const status = statusForDecision(decision);
    return {
      previewId,
      decisionId: decision.decisionId,
      clueId: decision.clueId,
      status,
      targetPersonId: decision.target.personId,
      identityResolution: identityResolutionFor(decision, stitchingClue, evidenceReviewDecisions),
      currentCard: {
        exists: Boolean(currentCard),
        personId: currentCard?.personId ?? null,
        displayName: currentCard?.displayName ?? null,
        identities: {
          email: currentCard?.identities.email ?? null,
          phone: currentCard?.identities.phone ?? null,
          instagramHandle: currentCard?.identities.instagramHandle ?? null,
        },
        evidenceCount: currentCard?.evidence.length ?? null,
      },
      proposedCardDraft,
      blockedBy: decision.recommendedWrite.eligibility === 'ready_for_human_approved_write'
        ? []
        : decision.recommendedWrite.requiredApprovals,
      operations: operationsFor(previewId, decision, proposal, currentCard, proposedCardDraft),
      safetyNote: 'Preview only. No card, merge, Fact Store, or outbound operation was executed.',
    };
  });
  const operations = previews.flatMap((preview) => preview.operations);

  return {
    schemaVersion: CRM_VNEXT_CARD_APPLY_PREVIEW_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_card_apply_preview',
    policy,
    summary: {
      previews: previews.length,
      readyForHumanApprovedApply: previews.filter((preview) => preview.status === 'ready_for_human_approved_apply').length,
      blockedRequiresReview: previews.filter((preview) => preview.status === 'blocked_requires_review').length,
      deferredReviewPackets: previews.filter((preview) => preview.status === 'deferred_review_packet').length,
      needsMoreIdentity: previews.filter((preview) => preview.status === 'needs_more_identity').length,
      operations: operations.length,
      createCardCandidates: operations.filter((operation) => operation.type === 'create_card_candidate').length,
      enrichExistingCardCandidates: operations.filter((operation) => operation.type === 'enrich_existing_card').length,
      mergeReviewPackets: operations.filter((operation) => operation.type === 'stage_merge_review').length,
      restrictedServiceOperations: operations.filter((operation) => operation.type === 'mark_restricted_service').length,
    },
    previews,
    safety: safety(),
  };
};
