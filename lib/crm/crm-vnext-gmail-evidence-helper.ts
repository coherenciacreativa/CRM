import { createHash } from 'node:crypto';
import type { CrmConnectedEvidenceSourceInput } from './crm-vnext-deep-local-stitching';
import type { CrmFactIntakeInput, CrmFactPersonHint, CrmFactType } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_GMAIL_EVIDENCE_HELPER_SCHEMA_VERSION =
  'crm-vnext-gmail-evidence-helper-2026-05-10' as const;

export type CrmGmailEvidenceSearchResult = {
  id?: string | null;
  messageId?: string | null;
  threadId?: string | null;
  thread_id?: string | null;
  from?: string | null;
  from_?: string | null;
  to?: string[] | string | null;
  subject?: string | null;
  snippet?: string | null;
  labels?: string[] | null;
  email_ts?: string | null;
  internalDate?: string | null;
  display_title?: string | null;
  display_url?: string | null;
  has_attachment?: boolean | null;
};

export type CrmGmailEvidenceQueryPlan = {
  clueId: string;
  person: CrmFactPersonHint;
  searchTerms: string[];
  primaryQuery: string | null;
  contextualQueries: string[];
  reason: string;
};

export type CrmGmailEvidenceHelperReport = {
  schemaVersion: typeof CRM_VNEXT_GMAIL_EVIDENCE_HELPER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_gmail_evidence_helper';
  research: CrmIdentityStitchingResearchReport;
  queryPlans: CrmGmailEvidenceQueryPlan[];
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  summary: {
    clues: number;
    queryPlans: number;
    gmailResultsRead: number;
    gmailResultsMatched: number;
    evidenceSources: number;
    authBlocked: boolean;
  };
  auth: {
    liveGmailCalledByHelper: false;
    externalSearchStatus: 'not_requested' | 'results_supplied' | 'blocked';
    blocker: string | null;
    suggestedUnblockAction: string | null;
  };
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmGmailEvidenceHelperInput = CrmFactIntakeInput & {
  cards?: PersonCardVNext[] | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  research?: CrmIdentityStitchingResearchReport | null;
  gmailSearchResults?: unknown;
  authBlocker?: string | null;
  now?: string | Date | null;
  maxEvidenceSources?: number | null;
};

type SearchTerm = {
  value: string;
  weight: number;
};

const MAX_EVIDENCE_SOURCES = 25;

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

const quoteGmailTerm = (value: string): string => {
  const cleaned = value.trim().replace(/"/g, '');
  if (!cleaned) return '';
  return /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
};

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\$ ?[\d.,]+/g, '[amount-redacted]')
    .replace(/\b(?:COP|USD|EUR)\s*[\d.,]+/gi, '[amount-redacted]')
    .replace(/\b(?:AHORROS|SAVINGS|CUENTA)\s+\d[\d* -]{3,}\b/gi, '[account-redacted]')
    .replace(/\s+/g, ' ')
    .trim();

const personLabel = (person: CrmFactPersonHint): string | null =>
  cleanString(person.rawName)
  ?? cleanString(person.email)
  ?? cleanString(person.instagramHandle ? `@${person.instagramHandle}` : null)
  ?? cleanString(person.phone);

const personSearchTerms = (person: CrmFactPersonHint): SearchTerm[] => {
  const terms: SearchTerm[] = [];
  const add = (value: string | null | undefined, weight: number) => {
    const cleaned = cleanString(value?.replace(/^@+/, '') ?? null);
    if (cleaned && normalize(cleaned).length >= 3) terms.push({ value: cleaned, weight });
  };

  add(person.email, 100);
  add(person.instagramHandle, 92);
  add(person.phone?.replace(/\D/g, ''), 88);
  add(person.rawName, 74);

  for (const token of normalize(person.rawName).split(/\s+/).filter((item) => item.length >= 4)) {
    add(token, 40);
  }

  return unique(terms.map((term) => JSON.stringify(term))).map((term) => JSON.parse(term) as SearchTerm);
};

const primaryQueryForTerms = (terms: SearchTerm[]): string | null => {
  const queryTerms = unique(
    terms
      .sort((a, b) => b.weight - a.weight)
      .map((term) => quoteGmailTerm(term.value))
      .filter(Boolean),
  ).slice(0, 6);
  if (!queryTerms.length) return null;
  return queryTerms.join(' OR ');
};

const contextualQueriesFor = (
  primaryQuery: string | null,
  factTypes: CrmFactType[],
): string[] => {
  if (!primaryQuery) return [];
  const queries: string[] = [];
  if (factTypes.includes('program_participation')) {
    queries.push(`(${primaryQuery}) (yoga OR "Yoga Colombia" OR clase OR Zoom)`);
  }
  if (factTypes.includes('retreat_attendance')) {
    queries.push(`(${primaryQuery}) (retiro OR retreat OR inscripcion OR asistencia)`);
  }
  if (factTypes.includes('purchase') || factTypes.includes('client_status')) {
    queries.push(`(${primaryQuery}) (pago OR payment OR transferencia OR Bancolombia)`);
  }
  return unique(queries);
};

const buildQueryPlan = (clue: CrmIdentityStitchingClue): CrmGmailEvidenceQueryPlan => {
  const terms = personSearchTerms(clue.person);
  const primaryQuery = primaryQueryForTerms(terms);
  return {
    clueId: clue.clueId,
    person: clue.person,
    searchTerms: terms.map((term) => term.value),
    primaryQuery,
    contextualQueries: contextualQueriesFor(primaryQuery, clue.factTypes),
    reason: primaryQuery
      ? `Search Gmail for identity evidence related to ${personLabel(clue.person) ?? clue.clueId}.`
      : 'Not enough identity terms to search Gmail safely.',
  };
};

const normalizeGmailResults = (value: unknown): CrmGmailEvidenceSearchResult[] => {
  if (Array.isArray(value)) return value.filter((item): item is CrmGmailEvidenceSearchResult => Boolean(item && typeof item === 'object'));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['emails', 'messages', 'threads', 'results']) {
    const maybeResults = record[key];
    if (Array.isArray(maybeResults)) return normalizeGmailResults(maybeResults);
  }
  return [];
};

const resultText = (result: CrmGmailEvidenceSearchResult): string =>
  [
    result.subject,
    result.display_title,
    result.from_,
    result.from,
    Array.isArray(result.to) ? result.to.join(' ') : result.to,
    result.snippet,
    result.labels?.join(' '),
  ].filter(Boolean).join(' ');

const resultMatchesPlan = (
  result: CrmGmailEvidenceSearchResult,
  plan: CrmGmailEvidenceQueryPlan,
): boolean => {
  const normalized = normalize(resultText(result));
  if (!normalized) return false;
  return personSearchTerms(plan.person).some((term) => normalized.includes(normalize(term.value)));
};

const resultSourceId = (result: CrmGmailEvidenceSearchResult): string => {
  const messageId = cleanString(result.id) ?? cleanString(result.messageId);
  const threadId = cleanString(result.threadId) ?? cleanString(result.thread_id);
  if (messageId) return `gmail:message:${messageId}`;
  if (threadId) return `gmail:thread:${threadId}`;
  return `gmail:result:${hashId([result.subject ?? null, result.snippet ?? null, result.email_ts ?? null])}`;
};

const resultRecipient = (result: CrmGmailEvidenceSearchResult): string | null => {
  if (Array.isArray(result.to)) return result.to.filter(Boolean).join(', ') || null;
  return cleanString(result.to);
};

const evidenceSourceForResult = (
  result: CrmGmailEvidenceSearchResult,
  plan: CrmGmailEvidenceQueryPlan,
): CrmConnectedEvidenceSourceInput => ({
  sourceKind: 'gmail_export',
  sourceId: resultSourceId(result),
  title: cleanString(result.display_title),
  subject: cleanString(result.subject),
  sender: cleanString(result.from_) ?? cleanString(result.from),
  recipient: resultRecipient(result),
  observedAt: cleanString(result.email_ts) ?? cleanString(result.internalDate),
  snippet: cleanPublicText(cleanString(result.snippet) ?? cleanString(result.display_title) ?? ''),
  text: cleanPublicText([
    `Matched clue: ${personLabel(plan.person) ?? plan.clueId}`,
    result.has_attachment ? 'Has attachment: true' : null,
    result.labels?.length ? `Labels: ${result.labels.join(', ')}` : null,
  ].filter(Boolean).join('\n')),
});

const evidenceSourcesForResults = (
  results: CrmGmailEvidenceSearchResult[],
  queryPlans: CrmGmailEvidenceQueryPlan[],
  maxEvidenceSources: number,
): { evidenceSources: CrmConnectedEvidenceSourceInput[]; matchedResults: number } => {
  const evidenceSources: CrmConnectedEvidenceSourceInput[] = [];
  const seen = new Set<string>();
  let matchedResults = 0;

  for (const result of results) {
    const matchingPlan = queryPlans.find((plan) => resultMatchesPlan(result, plan));
    if (!matchingPlan) continue;
    matchedResults += 1;
    const evidence = evidenceSourceForResult(result, matchingPlan);
    const key = evidence.sourceId ?? JSON.stringify(evidence);
    if (seen.has(key)) continue;
    seen.add(key);
    evidenceSources.push(evidence);
    if (evidenceSources.length >= maxEvidenceSources) break;
  }

  return { evidenceSources, matchedResults };
};

const safety = (): CrmGmailEvidenceHelperReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  allowedUse: [
    'Build Gmail search queries for CRM identity evidence.',
    'Convert supplied Gmail search results into redacted evidenceSources packets.',
    'Feed Deep Local Stitching without giving CRM live Gmail credentials.',
  ],
  prohibitedActions: [
    'Do not send email.',
    'Do not archive, label, delete, or modify Gmail messages.',
    'Do not mutate CRM person cards.',
    'Do not write Fact Store.',
    'Do not read, export, or print OAuth tokens.',
  ],
});

export const buildCrmVNextGmailEvidenceHelper = (
  input: CrmGmailEvidenceHelperInput,
): CrmGmailEvidenceHelperReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const research = input.research ?? buildCrmVNextIdentityStitchingResearch({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards ?? [],
    mailerBridgeRows: input.mailerBridgeRows,
  });
  const queryPlans = research.clues.map(buildQueryPlan);
  const gmailResults = normalizeGmailResults(input.gmailSearchResults);
  const maxEvidenceSources = Math.max(1, Math.min(100, Math.floor(input.maxEvidenceSources ?? MAX_EVIDENCE_SOURCES)));
  const evidence = evidenceSourcesForResults(gmailResults, queryPlans, maxEvidenceSources);
  const authBlocker = cleanString(input.authBlocker);

  return {
    schemaVersion: CRM_VNEXT_GMAIL_EVIDENCE_HELPER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_gmail_evidence_helper',
    research,
    queryPlans,
    evidenceSources: evidence.evidenceSources,
    summary: {
      clues: research.clues.length,
      queryPlans: queryPlans.filter((plan) => plan.primaryQuery).length,
      gmailResultsRead: gmailResults.length,
      gmailResultsMatched: evidence.matchedResults,
      evidenceSources: evidence.evidenceSources.length,
      authBlocked: Boolean(authBlocker),
    },
    auth: {
      liveGmailCalledByHelper: false,
      externalSearchStatus: authBlocker ? 'blocked' : gmailResults.length ? 'results_supplied' : 'not_requested',
      blocker: authBlocker,
      suggestedUnblockAction: authBlocker
        ? 'Refresh the read-only Gmail/Contacts connector outside CRM, or use another healthy read-only connector to supply evidenceSources.'
        : null,
    },
    safety: safety(),
  };
};
