import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  buildCrmFactIntakeDraft,
  type CrmFactEvent,
  type CrmFactIntakeDraft,
  type CrmFactIntakeInput,
  type CrmFactPersonHint,
  type CrmFactType,
} from './crm-vnext-fact-intake';
import { crmVNextMatchedNameTokens, crmVNextNameTokens } from './crm-vnext-name-matching';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_IDENTITY_STITCHING_RESEARCH_SCHEMA_VERSION =
  'crm-vnext-identity-stitching-research-2026-05-10' as const;

export const DEFAULT_MAILER_BRIDGE_ENRICHED_PATH = join(
  homedir(),
  '.openclaw-lakshmi',
  'workspace',
  'memory',
  'projects',
  'crm-memory-fabric',
  'ops',
  'mailer-ig-bridge.candidates.enriched.csv',
);

export type CrmMailerBridgeCandidateRow = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  labels: string | null;
  source: string | null;
  language: string | null;
  notes: string | null;
  instagramHandle: string | null;
  confidence: number | null;
  updatedAt: string | null;
  status: string | null;
};

export type CrmIdentityStitchingCandidateSource =
  | 'person_cards_v1'
  | 'mailer_bridge_candidates_enriched';

export type CrmIdentityStitchingCandidate = {
  source: CrmIdentityStitchingCandidateSource;
  sourceRecordId: string;
  personId: string | null;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  };
  score: number;
  confidence: 'strong' | 'medium' | 'weak';
  matchReasons: string[];
  evidence: string[];
  sourceStatus: string | null;
};

export type CrmIdentityStitchingSignal = {
  code: string;
  detail: string;
  evidenceText: string;
  allowedUse: string[];
  prohibitedUse: string[];
};

export type CrmIdentityStitchingRecommendation =
  | 'stitch_to_existing_card'
  | 'review_mailer_candidate'
  | 'review_possible_candidates'
  | 'create_new_card_candidate'
  | 'needs_more_identity';

export type CrmIdentityStitchingClue = {
  clueId: string;
  person: CrmFactPersonHint;
  factIds: string[];
  factTypes: CrmFactType[];
  evidenceTexts: string[];
  stableIdentityPresent: boolean;
  privacySignals: CrmIdentityStitchingSignal[];
  relationshipSignals: CrmIdentityStitchingSignal[];
  candidates: CrmIdentityStitchingCandidate[];
  recommendation: {
    action: CrmIdentityStitchingRecommendation;
    requiresHumanDecision: boolean;
    reason: string;
    suggestedNextSteps: string[];
  };
};

export type CrmIdentityStitchingResearchReport = {
  schemaVersion: typeof CRM_VNEXT_IDENTITY_STITCHING_RESEARCH_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_identity_stitching_research';
  draft: CrmFactIntakeDraft;
  sourceCoverage: {
    personCards: {
      searched: true;
      cards: number;
    };
    mailerBridge: {
      searched: boolean;
      rows: number;
      liveApiCalled: false;
    };
  };
  summary: {
    clues: number;
    candidates: number;
    strongCandidates: number;
    mediumCandidates: number;
    weakCandidates: number;
    existingCardRecommendations: number;
    mailerReviewRecommendations: number;
    createCardRecommendations: number;
    needsMoreIdentity: number;
    privacyRestrictedSignals: number;
    relationshipSignals: number;
  };
  clues: CrmIdentityStitchingClue[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    credentialReadProhibited: true;
    mailerLiteLiveApiProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmIdentityStitchingResearchInput = CrmFactIntakeInput & {
  cards: PersonCardVNext[];
  mailerBridgeRows?: CrmMailerBridgeCandidateRow[] | null;
  draft?: CrmFactIntakeDraft | null;
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

const normalizeHandle = (value: string | null | undefined): string | null => {
  const normalized = normalize(cleanString(value)?.replace(/^@+/, '') ?? null);
  return normalized || null;
};

const normalizeEmail = (value: string | null | undefined): string | null => {
  const normalized = normalize(value);
  return normalized.includes('@') ? normalized : normalized || null;
};

const normalizePhone = (value: string | null | undefined): string | null => {
  const raw = cleanString(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
};

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const confidenceForScore = (score: number): CrmIdentityStitchingCandidate['confidence'] => {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'medium';
  return 'weak';
};

const personKey = (person: CrmFactPersonHint): string =>
  person.personIdHint
  || (person.email ? `email:${normalizeEmail(person.email)}` : null)
  || (person.instagramHandle ? `ig:${normalizeHandle(person.instagramHandle)}` : null)
  || (person.phone ? `phone:${normalizePhone(person.phone)}` : null)
  || `name:${normalize(person.rawName)}`;

const hasStableIdentity = (person: CrmFactPersonHint): boolean =>
  Boolean(person.personIdHint || person.email || person.instagramHandle || person.phone);

const scoreTokenOverlap = (
  tokens: string[],
  haystack: string,
): { score: number; reasons: string[] } => {
  if (!tokens.length || !haystack) return { score: 0, reasons: [] };
  const matched = crmVNextMatchedNameTokens(tokens, haystack);
  if (!matched.length) return { score: 0, reasons: [] };
  if (matched.length === tokens.length && tokens.length >= 2) {
    return {
      score: 68,
      reasons: [`all_name_tokens:${matched.join('+')}`],
    };
  }
  if (matched.length >= 2) {
    return {
      score: 52,
      reasons: [`multiple_name_tokens:${matched.join('+')}`],
    };
  }
  return {
    score: 24,
    reasons: [`single_name_token:${matched[0]}`],
  };
};

const evidenceForFactTypes = (
  factTypes: CrmFactType[],
  text: string,
): { bonus: number; evidence: string[] } => {
  const normalized = normalize(text);
  let bonus = 0;
  const evidence: string[] = [];
  if (factTypes.includes('program_participation') && /estudiant|alumn|yoga/.test(normalized)) {
    bonus += 4;
    evidence.push('source_labels_support_student_or_yoga');
  }
  if (factTypes.includes('retreat_attendance') && /retiro|asistent/.test(normalized)) {
    bonus += 4;
    evidence.push('source_labels_support_retreat_attendance');
  }
  if (/aliad|consejer|consultor|amig/.test(normalized)) {
    bonus += 3;
    evidence.push('source_labels_support_relationship_context');
  }
  return { bonus, evidence };
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
};

export const parseMailerBridgeCandidatesCsv = (text: string): CrmMailerBridgeCandidateRow[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line): CrmMailerBridgeCandidateRow => {
    const values = parseCsvLine(line);
    const row = headers.reduce((acc, header, index) => {
      acc[header] = cleanString(values[index]);
      return acc;
    }, {} as Record<string, string | null>);
    const confidence = row.confidence ? Number(row.confidence) : null;
    return {
      email: normalizeEmail(row.email),
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      labels: row.labels,
      source: row.source,
      language: row.language,
      notes: row.notes,
      instagramHandle: normalizeHandle(row.igHandle),
      confidence: Number.isFinite(confidence) ? confidence : null,
      updatedAt: row.updatedAt,
      status: row.status,
    };
  });
};

export const loadMailerBridgeCandidates = async (
  filePath = DEFAULT_MAILER_BRIDGE_ENRICHED_PATH,
): Promise<CrmMailerBridgeCandidateRow[]> => {
  try {
    return parseMailerBridgeCandidatesCsv(await readFile(filePath, 'utf8'));
  } catch {
    return [];
  }
};

const cardCandidate = (
  card: PersonCardVNext,
  score: number,
  reasons: string[],
  evidence: string[],
): CrmIdentityStitchingCandidate => ({
  source: 'person_cards_v1',
  sourceRecordId: card.personId,
  personId: card.personId,
  displayName: card.displayName,
  identities: {
    email: card.identities.email,
    instagramHandle: card.identities.instagramHandle,
    phone: card.identities.phone,
    city: card.identities.city,
    country: card.identities.country,
  },
  score: Math.min(100, Math.round(score)),
  confidence: confidenceForScore(score),
  matchReasons: unique(reasons),
  evidence: unique(evidence),
  sourceStatus: null,
});

const matchPersonCards = (
  person: CrmFactPersonHint,
  factTypes: CrmFactType[],
  cards: PersonCardVNext[],
): CrmIdentityStitchingCandidate[] => {
  const factPersonId = cleanString(person.personIdHint);
  const factEmail = normalizeEmail(person.email);
  const factHandle = normalizeHandle(person.instagramHandle);
  const factPhone = normalizePhone(person.phone);
  const factName = normalize(person.rawName);
  const tokens = crmVNextNameTokens(person.rawName);
  const candidates: CrmIdentityStitchingCandidate[] = [];

  for (const card of cards) {
    let score = 0;
    const reasons: string[] = [];
    const evidence: string[] = [];
    const cardEmail = normalizeEmail(card.identities.email);
    const cardHandle = normalizeHandle(card.identities.instagramHandle);
    const cardPhone = normalizePhone(card.identities.phone);
    const searchText = normalize([
      card.personId,
      card.displayName,
      card.identities.email,
      card.identities.instagramHandle,
      card.identities.phone,
      card.identities.city,
      card.identities.country,
    ].filter(Boolean).join(' '));

    if (factPersonId && factPersonId === card.personId) {
      score = Math.max(score, 100);
      reasons.push('person_id_exact');
    }
    if (factPersonId?.startsWith('email:') && cardEmail && normalize(factPersonId.slice(6)) === cardEmail) {
      score = Math.max(score, 100);
      reasons.push('person_id_email_exact');
    }
    if (factPersonId?.startsWith('ig:') && cardHandle && normalizeHandle(factPersonId.slice(3)) === cardHandle) {
      score = Math.max(score, 100);
      reasons.push('person_id_instagram_exact');
    }
    if (factEmail && cardEmail && factEmail === cardEmail) {
      score = Math.max(score, 98);
      reasons.push('email_exact');
    }
    if (factHandle && cardHandle && factHandle === cardHandle) {
      score = Math.max(score, 95);
      reasons.push('instagram_handle_exact');
    }
    if (factPhone && cardPhone && factPhone === cardPhone) {
      score = Math.max(score, 93);
      reasons.push('phone_exact');
    }
    if (factName && normalize(card.displayName) === factName) {
      score = Math.max(score, 65);
      reasons.push('display_name_exact');
    }

    const tokenOverlap = scoreTokenOverlap(tokens, searchText);
    if (tokenOverlap.score > score) {
      score = tokenOverlap.score;
      reasons.push(...tokenOverlap.reasons);
    }

    const factBonus = evidenceForFactTypes(factTypes, searchText);
    if (score > 0 && factBonus.bonus) {
      score += factBonus.bonus;
      evidence.push(...factBonus.evidence);
    }
    if (score <= 0) continue;
    evidence.push('local_person_cards_v1');
    candidates.push(cardCandidate(card, score, reasons, evidence));
  }

  return candidates;
};

const rowDisplayName = (row: CrmMailerBridgeCandidateRow): string | null =>
  cleanString([row.firstName, row.lastName].filter(Boolean).join(' '));

const rowSearchText = (row: CrmMailerBridgeCandidateRow): string =>
  normalize([
    row.email,
    row.firstName,
    row.lastName,
    row.company,
    row.labels,
    row.source,
    row.notes,
    row.instagramHandle,
  ].filter(Boolean).join(' '));

const mailerCandidate = (
  row: CrmMailerBridgeCandidateRow,
  score: number,
  reasons: string[],
  evidence: string[],
): CrmIdentityStitchingCandidate => ({
  source: 'mailer_bridge_candidates_enriched',
  sourceRecordId: `mailer:${row.email ?? row.instagramHandle ?? hashId([row.firstName, row.lastName, row.labels])}`,
  personId: row.email ? `email:${row.email}` : row.instagramHandle ? `ig:${row.instagramHandle}` : null,
  displayName: rowDisplayName(row),
  identities: {
    email: row.email,
    instagramHandle: row.instagramHandle,
    phone: null,
    city: null,
    country: null,
  },
  score: Math.min(100, Math.round(score)),
  confidence: confidenceForScore(score),
  matchReasons: unique(reasons),
  evidence: unique(evidence),
  sourceStatus: row.status,
});

const matchMailerRows = (
  person: CrmFactPersonHint,
  factTypes: CrmFactType[],
  rows: CrmMailerBridgeCandidateRow[],
): CrmIdentityStitchingCandidate[] => {
  const factEmail = normalizeEmail(person.email);
  const factHandle = normalizeHandle(person.instagramHandle);
  const factName = normalize(person.rawName);
  const tokens = crmVNextNameTokens(person.rawName);
  const candidates: CrmIdentityStitchingCandidate[] = [];

  for (const row of rows) {
    let score = 0;
    const reasons: string[] = [];
    const evidence: string[] = [];
    const rowEmail = normalizeEmail(row.email);
    const rowHandle = normalizeHandle(row.instagramHandle);
    const fullName = normalize(rowDisplayName(row));
    const searchText = rowSearchText(row);

    if (factEmail && rowEmail && factEmail === rowEmail) {
      score = Math.max(score, 98);
      reasons.push('mailer_email_exact');
    }
    if (factHandle && rowHandle && factHandle === rowHandle) {
      score = Math.max(score, 95);
      reasons.push('mailer_instagram_exact');
    }
    if (factName && fullName && factName === fullName) {
      score = Math.max(score, 88);
      reasons.push('mailer_full_name_exact');
    }

    const tokenOverlap = scoreTokenOverlap(tokens, searchText);
    if (tokenOverlap.score > score) {
      score = tokenOverlap.score;
      reasons.push(...tokenOverlap.reasons.map((reason) => `mailer_${reason}`));
    }

    const factBonus = evidenceForFactTypes(factTypes, searchText);
    if (score > 0 && factBonus.bonus) {
      score += factBonus.bonus;
      evidence.push(...factBonus.evidence);
    }

    if (score <= 0) continue;
    if (row.labels) evidence.push(`labels:${row.labels}`);
    if (row.source) evidence.push(`source:${row.source}`);
    candidates.push(mailerCandidate(row, score, reasons, evidence));
  }

  return candidates;
};

const dedupeCandidates = (
  candidates: CrmIdentityStitchingCandidate[],
  limit: number,
): CrmIdentityStitchingCandidate[] => {
  const byKey = new Map<string, CrmIdentityStitchingCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.source}:${candidate.personId ?? candidate.sourceRecordId}`;
    const existing = byKey.get(key);
    if (!existing || candidate.score > existing.score) byKey.set(key, candidate);
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source) || a.sourceRecordId.localeCompare(b.sourceRecordId))
    .slice(0, limit);
};

const signalForRestrictedService = (text: string): CrmIdentityStitchingSignal | null => {
  const normalized = normalize(text);
  if (!/\b(paciente|psicolog|psicologia|terapeutic|consulta terapeutica)\b/i.test(normalized)) return null;
  return {
    code: 'restricted_therapy_service_context',
    detail: 'Psychology/therapy service relationship should be treated as customer/service context with restricted privacy.',
    evidenceText: text,
    allowedUse: ['Internal profile enrichment', 'care continuity', 'private service/product fit'],
    prohibitedUse: ['Outbound copy without human review', 'public segmentation', 'clinical-detail storage'],
  };
};

const signalForRelationship = (text: string): CrmIdentityStitchingSignal | null => {
  const normalized = normalize(text);
  if (!/\b(amig|aliad|consultor|consultora|familia|familiar|consejer)\b/i.test(normalized)) return null;
  return {
    code: 'relationship_context',
    detail: 'Relationship context can help identity stitching and profile nuance, but should be reviewed before becoming structured fields.',
    evidenceText: text,
    allowedUse: ['Internal relationship context', 'candidate matching evidence'],
    prohibitedUse: ['Automatic outreach personalization without review'],
  };
};

const recommendationFor = (
  person: CrmFactPersonHint,
  candidates: CrmIdentityStitchingCandidate[],
  privacySignals: CrmIdentityStitchingSignal[],
): CrmIdentityStitchingClue['recommendation'] => {
  const top = candidates[0];
  const restricted = privacySignals.length > 0;
  const exactCard = top?.source === 'person_cards_v1' && top.score >= 90;
  const strongMailer = top?.source === 'mailer_bridge_candidates_enriched' && top.score >= 80;

  if (exactCard) {
    return {
      action: 'stitch_to_existing_card',
      requiresHumanDecision: restricted,
      reason: restricted
        ? 'A strong existing card match exists, but restricted service context should be reviewed before storage.'
        : 'A strong existing person-card match exists.',
      suggestedNextSteps: restricted
        ? ['Review restricted service context before committing facts.', 'Then route ready facts to Card Rebuild Diff.']
        : ['Use the matched person card for preview only; do not mutate until write policy is approved.'],
    };
  }

  if (strongMailer) {
    return {
      action: 'review_mailer_candidate',
      requiresHumanDecision: true,
      reason: 'A strong local MailerLite/bridge candidate exists, but it is not yet stitched to a person card.',
      suggestedNextSteps: [
        'Review the MailerLite candidate evidence.',
        'If correct, approve creating or merging a person card with the candidate email/identity.',
      ],
    };
  }

  if (candidates.length) {
    return {
      action: 'review_possible_candidates',
      requiresHumanDecision: true,
      reason: 'Only weak or medium candidates were found; identity is not safe to stitch automatically.',
      suggestedNextSteps: ['Ask for an email, Instagram handle, phone, or human confirmation.'],
    };
  }

  if (hasStableIdentity(person)) {
    return {
      action: 'create_new_card_candidate',
      requiresHumanDecision: true,
      reason: 'The report includes a stable identity, but no existing local candidate was found.',
      suggestedNextSteps: ['Prepare a new-card proposal after Alejandro approves the creation policy.'],
    };
  }

  return {
    action: 'needs_more_identity',
    requiresHumanDecision: true,
    reason: 'No stable identity and no useful candidate were found.',
    suggestedNextSteps: ['Ask for email, Instagram handle, phone, or another stable identifier.'],
  };
};

const clueFromFacts = (
  person: CrmFactPersonHint,
  facts: CrmFactEvent[],
  candidates: CrmIdentityStitchingCandidate[],
): CrmIdentityStitchingClue => {
  const evidenceTexts = unique(facts.map((fact) => fact.evidenceText));
  const factTypes = unique(facts.map((fact) => fact.type));
  const privacySignals = evidenceTexts
    .map(signalForRestrictedService)
    .filter((signal): signal is CrmIdentityStitchingSignal => Boolean(signal));
  const relationshipSignals = evidenceTexts
    .map(signalForRelationship)
    .filter((signal): signal is CrmIdentityStitchingSignal => Boolean(signal));

  return {
    clueId: `stitch_clue_${hashId([personKey(person), ...facts.map((fact) => fact.factId)])}`,
    person,
    factIds: facts.map((fact) => fact.factId),
    factTypes,
    evidenceTexts,
    stableIdentityPresent: hasStableIdentity(person),
    privacySignals,
    relationshipSignals,
    candidates,
    recommendation: recommendationFor(person, candidates, privacySignals),
  };
};

const groupedFacts = (facts: CrmFactEvent[]): Array<{ person: CrmFactPersonHint; facts: CrmFactEvent[] }> => {
  const groups = new Map<string, { person: CrmFactPersonHint; facts: CrmFactEvent[] }>();
  for (const fact of facts) {
    const key = personKey(fact.person);
    const existing = groups.get(key);
    if (existing) existing.facts.push(fact);
    else groups.set(key, { person: fact.person, facts: [fact] });
  }
  return Array.from(groups.values());
};

const safety = (): CrmIdentityStitchingResearchReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  credentialReadProhibited: true,
  mailerLiteLiveApiProhibited: true,
  allowedUse: [
    'Research identity candidates from local person cards and local MailerLite bridge exports.',
    'Prepare a human-review recommendation for stitching, merge, or new-card creation.',
    'Separate restricted service context from generic engagement facts.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not send outbound messages.',
    'Do not call MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or email APIs.',
    'Do not treat weak name-only matches as approved identity stitching.',
  ],
});

export const buildCrmVNextIdentityStitchingResearch = (
  input: CrmIdentityStitchingResearchInput,
): CrmIdentityStitchingResearchReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const draft = input.draft ?? buildCrmFactIntakeDraft({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
  });
  const maxCandidates = Math.max(1, Math.min(10, Math.floor(input.maxCandidatesPerClue ?? 5)));
  const rows = input.mailerBridgeRows ?? [];

  const clues = groupedFacts(draft.facts).map(({ person, facts }) => {
    const factTypes = unique(facts.map((fact) => fact.type));
    const candidates = dedupeCandidates([
      ...matchPersonCards(person, factTypes, input.cards),
      ...matchMailerRows(person, factTypes, rows),
    ], maxCandidates);
    return clueFromFacts(person, facts, candidates);
  });

  const allCandidates = clues.flatMap((clue) => clue.candidates);

  return {
    schemaVersion: CRM_VNEXT_IDENTITY_STITCHING_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_identity_stitching_research',
    draft,
    sourceCoverage: {
      personCards: {
        searched: true,
        cards: input.cards.length,
      },
      mailerBridge: {
        searched: Boolean(input.mailerBridgeRows),
        rows: rows.length,
        liveApiCalled: false,
      },
    },
    summary: {
      clues: clues.length,
      candidates: allCandidates.length,
      strongCandidates: allCandidates.filter((candidate) => candidate.confidence === 'strong').length,
      mediumCandidates: allCandidates.filter((candidate) => candidate.confidence === 'medium').length,
      weakCandidates: allCandidates.filter((candidate) => candidate.confidence === 'weak').length,
      existingCardRecommendations: clues.filter((clue) => clue.recommendation.action === 'stitch_to_existing_card').length,
      mailerReviewRecommendations: clues.filter((clue) => clue.recommendation.action === 'review_mailer_candidate').length,
      createCardRecommendations: clues.filter((clue) => clue.recommendation.action === 'create_new_card_candidate').length,
      needsMoreIdentity: clues.filter((clue) => clue.recommendation.action === 'needs_more_identity').length,
      privacyRestrictedSignals: clues.reduce((sum, clue) => sum + clue.privacySignals.length, 0),
      relationshipSignals: clues.reduce((sum, clue) => sum + clue.relationshipSignals.length, 0),
    },
    clues,
    safety: safety(),
  };
};
