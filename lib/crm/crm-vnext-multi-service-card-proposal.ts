import { createHash } from 'node:crypto';
import type { CrmFactEvent, CrmFactIntakeInput } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingCandidate,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_MULTI_SERVICE_CARD_PROPOSAL_SCHEMA_VERSION =
  'crm-vnext-multi-service-card-proposal-2026-05-10' as const;

export type CrmMultiServiceCardTargetType =
  | 'existing_card'
  | 'new_card_from_mailer_candidate'
  | 'new_card_from_stable_identity'
  | 'review_possible_candidates'
  | 'needs_more_identity';

export type CrmMultiServiceCardServiceKey =
  | 'yoga_classes'
  | 'retreats'
  | 'therapy_consultations'
  | 'mentorship'
  | 'happy_circle'
  | 'digital_products'
  | 'unknown_service_context';

export type CrmMultiServiceCardServiceRelationship = {
  relationshipId: string;
  serviceKey: CrmMultiServiceCardServiceKey;
  label: string;
  role: string;
  status: string;
  privacy: 'standard' | 'restricted';
  confidence: 'high' | 'medium' | 'low';
  factIds: string[];
  evidenceTexts: string[];
  sourceKinds: string[];
  notes: string[];
};

export type CrmMultiServiceCardRelationshipContext = {
  contextId: string;
  code: string;
  detail: string;
  privacy: 'standard' | 'review_only';
  evidenceText: string;
  allowedUse: string[];
  prohibitedUse: string[];
};

export type CrmMultiServiceCardTarget = {
  type: CrmMultiServiceCardTargetType;
  personId: string | null;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  };
  source: CrmIdentityStitchingCandidate['source'] | 'fact_hint' | null;
  confidence: CrmIdentityStitchingCandidate['confidence'] | 'unknown';
  score: number | null;
  reason: string;
};

export type CrmMultiServiceCardOperationType =
  | 'use_existing_person_card'
  | 'create_person_card_candidate'
  | 'link_mailer_identity_candidate'
  | 'attach_fact_evidence'
  | 'add_service_relationship'
  | 'mark_restricted_service_context'
  | 'add_relationship_context'
  | 'request_more_identity'
  | 'require_human_approval';

export type CrmMultiServiceCardOperation = {
  operationId: string;
  type: CrmMultiServiceCardOperationType;
  targetPersonId: string | null;
  serviceKey: CrmMultiServiceCardServiceKey | null;
  factIds: string[];
  description: string;
  approvalLevel: 'operator_can_preview' | 'human_required_before_apply';
};

export type CrmMultiServiceCardProposal = {
  proposalId: string;
  clueId: string;
  personHint: CrmIdentityStitchingClue['person'];
  target: CrmMultiServiceCardTarget;
  serviceRelationships: CrmMultiServiceCardServiceRelationship[];
  relationshipContexts: CrmMultiServiceCardRelationshipContext[];
  privacyWarnings: string[];
  multiService: boolean;
  identityApprovalRequired: boolean;
  privacyApprovalRequired: boolean;
  cardWritePolicyRequired: true;
  proposedOperations: CrmMultiServiceCardOperation[];
  recommendation: {
    action:
      | 'approve_existing_card_enrichment'
      | 'review_and_create_mailer_based_card'
      | 'review_and_create_stable_identity_card'
      | 'review_candidates_before_card_proposal'
      | 'ask_for_more_identity';
    reason: string;
    suggestedNextSteps: string[];
  };
};

export type CrmMultiServiceCardProposalReport = {
  schemaVersion: typeof CRM_VNEXT_MULTI_SERVICE_CARD_PROPOSAL_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_multi_service_card_proposal';
  research: CrmIdentityStitchingResearchReport;
  summary: {
    proposals: number;
    existingCardTargets: number;
    mailerBasedNewCardTargets: number;
    stableIdentityNewCardTargets: number;
    needsMoreIdentity: number;
    serviceRelationships: number;
    restrictedServiceRelationships: number;
    relationshipContexts: number;
    multiServiceProposals: number;
    identityApprovalsRequired: number;
    privacyApprovalsRequired: number;
    cardWritePolicyRequired: number;
  };
  proposals: CrmMultiServiceCardProposal[];
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

export type CrmMultiServiceCardProposalInput = CrmFactIntakeInput & {
  cards: PersonCardVNext[];
  research?: CrmIdentityStitchingResearchReport | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  now?: string | Date | null;
  maxCandidatesPerClue?: number | null;
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const stablePersonIdFromHint = (clue: CrmIdentityStitchingClue): string | null =>
  cleanString(clue.person.personIdHint)
  || (clue.person.email ? `email:${normalize(clue.person.email)}` : null)
  || (clue.person.instagramHandle ? `ig:${normalize(clue.person.instagramHandle.replace(/^@+/, ''))}` : null)
  || (clue.person.phone ? `phone:${clue.person.phone.replace(/\D/g, '')}` : null);

const emptyIdentities = (): CrmMultiServiceCardTarget['identities'] => ({
  email: null,
  instagramHandle: null,
  phone: null,
  city: null,
  country: null,
});

const identitiesFromHint = (clue: CrmIdentityStitchingClue): CrmMultiServiceCardTarget['identities'] => ({
  email: cleanString(clue.person.email),
  instagramHandle: cleanString(clue.person.instagramHandle)?.replace(/^@+/, '').toLowerCase() ?? null,
  phone: cleanString(clue.person.phone),
  city: null,
  country: null,
});

const targetForClue = (clue: CrmIdentityStitchingClue): CrmMultiServiceCardTarget => {
  const top = clue.candidates[0];

  if (clue.recommendation.action === 'stitch_to_existing_card' && top) {
    return {
      type: 'existing_card',
      personId: top.personId,
      displayName: top.displayName,
      identities: top.identities,
      source: top.source,
      confidence: top.confidence,
      score: top.score,
      reason: 'Strong existing person-card match.',
    };
  }

  if (clue.recommendation.action === 'review_mailer_candidate' && top) {
    return {
      type: 'new_card_from_mailer_candidate',
      personId: top.personId,
      displayName: top.displayName ?? clue.person.rawName,
      identities: top.identities,
      source: top.source,
      confidence: top.confidence,
      score: top.score,
      reason: 'Strong local Mailer bridge candidate can seed a new or merged card after review.',
    };
  }

  if (clue.recommendation.action === 'create_new_card_candidate') {
    return {
      type: 'new_card_from_stable_identity',
      personId: stablePersonIdFromHint(clue),
      displayName: cleanString(clue.person.rawName) ?? cleanString(clue.person.instagramHandle),
      identities: identitiesFromHint(clue),
      source: 'fact_hint',
      confidence: 'unknown',
      score: null,
      reason: 'Stable identity was reported, but no local card or bridge candidate was found.',
    };
  }

  if (clue.recommendation.action === 'review_possible_candidates') {
    return {
      type: 'review_possible_candidates',
      personId: top?.personId ?? null,
      displayName: top?.displayName ?? cleanString(clue.person.rawName),
      identities: top?.identities ?? identitiesFromHint(clue),
      source: top?.source ?? 'fact_hint',
      confidence: top?.confidence ?? 'unknown',
      score: top?.score ?? null,
      reason: 'Only weak or medium candidates are available; identity needs review before proposing a card write.',
    };
  }

  return {
    type: 'needs_more_identity',
    personId: stablePersonIdFromHint(clue),
    displayName: cleanString(clue.person.rawName),
    identities: clue.person.email || clue.person.instagramHandle || clue.person.phone ? identitiesFromHint(clue) : emptyIdentities(),
    source: 'fact_hint',
    confidence: 'unknown',
    score: null,
    reason: 'The system needs an email, Instagram handle, phone, or human confirmation before a safe card proposal.',
  };
};

const serviceFromFact = (fact: CrmFactEvent): CrmMultiServiceCardServiceRelationship | null => {
  const program = normalize(fact.subject.program);
  const product = normalize(fact.subject.product);
  const evidence = normalize(fact.evidenceText);

  let serviceKey: CrmMultiServiceCardServiceKey | null = null;
  let label = '';
  let role = fact.subject.role ?? 'participant';
  let status = fact.subject.status ?? 'reported';
  let privacy: CrmMultiServiceCardServiceRelationship['privacy'] = 'standard';
  const notes: string[] = [];

  if (fact.type === 'client_status' && (program === 'terapia' || product === 'therapy')) {
    serviceKey = 'therapy_consultations';
    label = 'Therapy consultations';
    role = 'client_patient';
    status = 'active_or_reported_client';
    privacy = 'restricted';
    notes.push('Therapy/psychology is a legitimate service relationship, but details remain restricted.');
  } else if (fact.type === 'program_participation' && program === 'yoga') {
    serviceKey = 'yoga_classes';
    label = 'Yoga classes';
    role = 'student';
    status = 'active_or_reported_student';
  } else if (fact.type === 'retreat_attendance' || product === 'retreat' || (fact.type === 'purchase' && evidence.includes('retiro'))) {
    serviceKey = 'retreats';
    label = 'Retreats';
    role = 'attendee';
    status = 'historical_or_recurring_attendee';
  } else if (fact.type === 'community_event_attendance' || program === 'mi_encuentro_feliz') {
    serviceKey = 'happy_circle';
    label = 'Mi Encuentro Feliz';
    role = 'attendee';
    status = 'reported_attendee';
  } else if ((fact.type === 'program_participation' || fact.type === 'expressed_interest' || fact.type === 'purchase') && program === 'mentoria') {
    serviceKey = 'mentorship';
    label = 'Mentorship';
    role = fact.type === 'expressed_interest' ? 'prospect' : 'client';
    status = fact.type === 'expressed_interest' ? 'interested' : 'reported_client';
  } else if (
    program === 'curso_meditacion'
    || program === 'microintervenciones'
    || product === 'digital_product'
  ) {
    serviceKey = 'digital_products';
    label = 'Digital products';
    role = fact.type === 'expressed_interest' ? 'prospect' : 'buyer_or_user';
    status = fact.type === 'expressed_interest' ? 'interested' : 'reported';
  }

  if (!serviceKey) return null;

  return {
    relationshipId: `service_${hashId([fact.factId, serviceKey])}`,
    serviceKey,
    label,
    role,
    status,
    privacy,
    confidence: fact.confidence,
    factIds: [fact.factId],
    evidenceTexts: [fact.evidenceText],
    sourceKinds: [fact.source.kind],
    notes,
  };
};

const mergeServiceRelationships = (
  relationships: CrmMultiServiceCardServiceRelationship[],
): CrmMultiServiceCardServiceRelationship[] => {
  const byKey = new Map<string, CrmMultiServiceCardServiceRelationship>();
  for (const relationship of relationships) {
    const key = `${relationship.serviceKey}:${relationship.role}:${relationship.privacy}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, relationship);
      continue;
    }
    byKey.set(key, {
      ...existing,
      relationshipId: `service_${hashId([existing.relationshipId, relationship.relationshipId])}`,
      factIds: unique([...existing.factIds, ...relationship.factIds]),
      evidenceTexts: unique([...existing.evidenceTexts, ...relationship.evidenceTexts]),
      sourceKinds: unique([...existing.sourceKinds, ...relationship.sourceKinds]),
      notes: unique([...existing.notes, ...relationship.notes]),
      confidence: existing.confidence === 'high' || relationship.confidence === 'high'
        ? 'high'
        : existing.confidence === 'medium' || relationship.confidence === 'medium'
          ? 'medium'
          : 'low',
    });
  }
  return Array.from(byKey.values()).sort((a, b) => a.serviceKey.localeCompare(b.serviceKey));
};

const relationshipContextsForClue = (
  clue: CrmIdentityStitchingClue,
): CrmMultiServiceCardRelationshipContext[] =>
  clue.relationshipSignals.map((signal) => ({
    contextId: `rel_${hashId([clue.clueId, signal.code, signal.evidenceText])}`,
    code: signal.code,
    detail: signal.detail,
    privacy: 'review_only',
    evidenceText: signal.evidenceText,
    allowedUse: signal.allowedUse,
    prohibitedUse: signal.prohibitedUse,
  }));

const operation = (
  proposalId: string,
  type: CrmMultiServiceCardOperationType,
  index: number,
  targetPersonId: string | null,
  description: string,
  options: {
    serviceKey?: CrmMultiServiceCardServiceKey | null;
    factIds?: string[];
    approvalLevel?: CrmMultiServiceCardOperation['approvalLevel'];
  } = {},
): CrmMultiServiceCardOperation => ({
  operationId: `op_${hashId([proposalId, type, String(index), options.serviceKey ?? null, description])}`,
  type,
  targetPersonId,
  serviceKey: options.serviceKey ?? null,
  factIds: options.factIds ?? [],
  description,
  approvalLevel: options.approvalLevel ?? 'human_required_before_apply',
});

const operationsForProposal = (
  proposalId: string,
  target: CrmMultiServiceCardTarget,
  serviceRelationships: CrmMultiServiceCardServiceRelationship[],
  relationshipContexts: CrmMultiServiceCardRelationshipContext[],
  clue: CrmIdentityStitchingClue,
): CrmMultiServiceCardOperation[] => {
  const operations: CrmMultiServiceCardOperation[] = [];
  const personId = target.personId;

  if (target.type === 'existing_card') {
    operations.push(operation(
      proposalId,
      'use_existing_person_card',
      operations.length,
      personId,
      'Use the strong existing person card as the enrichment target.',
      { approvalLevel: 'operator_can_preview' },
    ));
  } else if (target.type === 'new_card_from_mailer_candidate') {
    operations.push(operation(
      proposalId,
      'create_person_card_candidate',
      operations.length,
      personId,
      'Create a new person-card candidate seeded by the reviewed Mailer bridge identity.',
    ));
    operations.push(operation(
      proposalId,
      'link_mailer_identity_candidate',
      operations.length,
      personId,
      'Link the local Mailer bridge candidate as identity evidence after review.',
    ));
  } else if (target.type === 'new_card_from_stable_identity') {
    operations.push(operation(
      proposalId,
      'create_person_card_candidate',
      operations.length,
      personId,
      'Create a new person-card candidate from the stable identity reported in the fact.',
    ));
  } else if (target.type === 'review_possible_candidates') {
    operations.push(operation(
      proposalId,
      'require_human_approval',
      operations.length,
      personId,
      'Review possible identity candidates before creating, merging, or enriching a card.',
    ));
  } else {
    operations.push(operation(
      proposalId,
      'request_more_identity',
      operations.length,
      personId,
      'Ask for email, Instagram handle, phone, or direct human confirmation before card work.',
    ));
  }

  if (clue.factIds.length) {
    operations.push(operation(
      proposalId,
      'attach_fact_evidence',
      operations.length,
      personId,
      'Attach the approved fact evidence to the target card proposal.',
      { factIds: clue.factIds },
    ));
  }

  for (const service of serviceRelationships) {
    operations.push(operation(
      proposalId,
      'add_service_relationship',
      operations.length,
      personId,
      `Add service relationship: ${service.label} as ${service.role}.`,
      { serviceKey: service.serviceKey, factIds: service.factIds },
    ));
    if (service.privacy === 'restricted') {
      operations.push(operation(
        proposalId,
        'mark_restricted_service_context',
        operations.length,
        personId,
        `Mark ${service.label} as restricted service context before any storage or display beyond internal CRM.`,
        { serviceKey: service.serviceKey, factIds: service.factIds },
      ));
    }
  }

  for (const context of relationshipContexts) {
    operations.push(operation(
      proposalId,
      'add_relationship_context',
      operations.length,
      personId,
      `Keep relationship context as review-only nuance: ${context.code}.`,
    ));
  }

  operations.push(operation(
    proposalId,
    'require_human_approval',
    operations.length,
    personId,
    'Applying this proposal to real cards requires an explicit card-write policy approval.',
  ));

  return operations;
};

const recommendationForProposal = (
  target: CrmMultiServiceCardTarget,
  clue: CrmIdentityStitchingClue,
): CrmMultiServiceCardProposal['recommendation'] => {
  if (target.type === 'existing_card') {
    return {
      action: 'approve_existing_card_enrichment',
      reason: clue.privacySignals.length
        ? 'Existing card is strong, but restricted service context needs review before storage.'
        : 'Existing card match is strong; enrichment can be reviewed as a normal card patch.',
      suggestedNextSteps: clue.privacySignals.length
        ? ['Review restricted service context.', 'Then approve or reject the card patch proposal.']
        : ['Review the proposed service relationships.', 'Approve only after a card-write policy exists.'],
    };
  }

  if (target.type === 'new_card_from_mailer_candidate') {
    return {
      action: 'review_and_create_mailer_based_card',
      reason: 'A strong local Mailer candidate can seed the card, but Alejandro should approve the stitch.',
      suggestedNextSteps: [
        'Confirm the Mailer candidate belongs to the reported person.',
        'Then create a card candidate with all service relationships preserved.',
      ],
    };
  }

  if (target.type === 'new_card_from_stable_identity') {
    return {
      action: 'review_and_create_stable_identity_card',
      reason: 'The report includes a stable identity that can seed a card after approval.',
      suggestedNextSteps: [
        'Confirm the stable identity is enough to create a card.',
        'Then create the card candidate with all service relationships preserved.',
      ],
    };
  }

  if (target.type === 'review_possible_candidates') {
    return {
      action: 'review_candidates_before_card_proposal',
      reason: 'The available candidates are not strong enough for a card proposal.',
      suggestedNextSteps: ['Review candidates or ask for a stable identifier.'],
    };
  }

  return {
    action: 'ask_for_more_identity',
    reason: 'There is not enough identity evidence for safe card creation or stitching.',
    suggestedNextSteps: ['Ask for email, Instagram handle, phone, or a human-confirmed match.'],
  };
};

const proposalForClue = (
  clue: CrmIdentityStitchingClue,
  facts: CrmFactEvent[],
): CrmMultiServiceCardProposal => {
  const target = targetForClue(clue);
  const services = mergeServiceRelationships(
    facts
      .filter((fact) => clue.factIds.includes(fact.factId))
      .map(serviceFromFact)
      .filter((service): service is CrmMultiServiceCardServiceRelationship => Boolean(service)),
  );
  const contexts = relationshipContextsForClue(clue);
  const proposalId = `card_proposal_${hashId([clue.clueId, target.personId, target.type])}`;
  const privacyWarnings = unique([
    ...services
      .filter((service) => service.privacy === 'restricted')
      .map((service) => `${service.label} must stay restricted and cannot drive outbound without review.`),
    ...clue.privacySignals.map((signal) => signal.detail),
  ]);

  return {
    proposalId,
    clueId: clue.clueId,
    personHint: clue.person,
    target,
    serviceRelationships: services,
    relationshipContexts: contexts,
    privacyWarnings,
    multiService: services.length > 1,
    identityApprovalRequired: clue.recommendation.requiresHumanDecision || target.type !== 'existing_card',
    privacyApprovalRequired: privacyWarnings.length > 0,
    cardWritePolicyRequired: true,
    proposedOperations: operationsForProposal(proposalId, target, services, contexts, clue),
    recommendation: recommendationForProposal(target, clue),
  };
};

const safety = (): CrmMultiServiceCardProposalReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  allowedUse: [
    'Translate identity research and approved-looking facts into a reviewable card proposal.',
    'Preserve multiple service relationships on the same person instead of forcing one category.',
    'Prepare Mantis/Alejandro review before any future card-write policy exists.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not write to the Fact Store.',
    'Do not send outbound messages.',
    'Do not call MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or email APIs.',
    'Do not store clinical details; only restricted service relationship context may be proposed.',
  ],
});

export const buildCrmVNextMultiServiceCardProposal = (
  input: CrmMultiServiceCardProposalInput,
): CrmMultiServiceCardProposalReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const research = input.research ?? buildCrmVNextIdentityStitchingResearch({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards,
    mailerBridgeRows: input.mailerBridgeRows,
    maxCandidatesPerClue: input.maxCandidatesPerClue,
  });
  const facts = research.draft.facts;
  const proposals = research.clues.map((clue) => proposalForClue(clue, facts));

  return {
    schemaVersion: CRM_VNEXT_MULTI_SERVICE_CARD_PROPOSAL_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_multi_service_card_proposal',
    research,
    summary: {
      proposals: proposals.length,
      existingCardTargets: proposals.filter((proposal) => proposal.target.type === 'existing_card').length,
      mailerBasedNewCardTargets: proposals.filter((proposal) => proposal.target.type === 'new_card_from_mailer_candidate').length,
      stableIdentityNewCardTargets: proposals.filter((proposal) => proposal.target.type === 'new_card_from_stable_identity').length,
      needsMoreIdentity: proposals.filter((proposal) => proposal.target.type === 'needs_more_identity').length,
      serviceRelationships: proposals.reduce((sum, proposal) => sum + proposal.serviceRelationships.length, 0),
      restrictedServiceRelationships: proposals.reduce(
        (sum, proposal) => sum + proposal.serviceRelationships.filter((service) => service.privacy === 'restricted').length,
        0,
      ),
      relationshipContexts: proposals.reduce((sum, proposal) => sum + proposal.relationshipContexts.length, 0),
      multiServiceProposals: proposals.filter((proposal) => proposal.multiService).length,
      identityApprovalsRequired: proposals.filter((proposal) => proposal.identityApprovalRequired).length,
      privacyApprovalsRequired: proposals.filter((proposal) => proposal.privacyApprovalRequired).length,
      cardWritePolicyRequired: proposals.filter((proposal) => proposal.cardWritePolicyRequired).length,
    },
    proposals,
    safety: safety(),
  };
};
