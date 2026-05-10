import { createHash } from 'node:crypto';
import type { CrmConnectedEvidenceSourceInput } from './crm-vnext-deep-local-stitching';
import type { CrmFactIntakeInput, CrmFactPersonHint } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_CONTACTS_EVIDENCE_HELPER_SCHEMA_VERSION =
  'crm-vnext-contacts-evidence-helper-2026-05-10' as const;

export type CrmContactsEvidenceSearchResult = {
  id?: string | number | null;
  sourceId?: string | null;
  fullName?: string | null;
  name?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  organization?: string | null;
  emails?: string[] | string | null;
  email?: string | null;
  phones?: string[] | string | null;
  phone?: string | null;
  instagramHandle?: string | null;
  socials?: string[] | string | null;
  notes?: string | null;
};

export type CrmContactsEvidenceQueryPlan = {
  clueId: string;
  person: CrmFactPersonHint;
  searchTerms: string[];
  reason: string;
};

export type CrmContactsEvidenceHelperReport = {
  schemaVersion: typeof CRM_VNEXT_CONTACTS_EVIDENCE_HELPER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_contacts_evidence_helper';
  research: CrmIdentityStitchingResearchReport;
  queryPlans: CrmContactsEvidenceQueryPlan[];
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  summary: {
    clues: number;
    queryPlans: number;
    contactsResultsRead: number;
    contactsResultsMatched: number;
    evidenceSources: number;
    authBlocked: boolean;
  };
  auth: {
    liveContactsCalledByHelper: false;
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

export type CrmContactsEvidenceHelperInput = CrmFactIntakeInput & {
  cards?: PersonCardVNext[] | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  research?: CrmIdentityStitchingResearchReport | null;
  contactsSearchResults?: unknown;
  authBlocker?: string | null;
  now?: string | Date | null;
  maxEvidenceSources?: number | null;
};

const MAX_EVIDENCE_SOURCES = 50;

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

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(cleanString).filter((item): item is string => Boolean(item));
  const cleaned = cleanString(value);
  if (!cleaned) return [];
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.map(cleanString).filter((item): item is string => Boolean(item));
    } catch {
      // Fall through to delimiter parsing.
    }
  }
  return cleaned.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const personLabel = (person: CrmFactPersonHint): string | null =>
  cleanString(person.rawName)
  ?? cleanString(person.email)
  ?? cleanString(person.instagramHandle ? `@${person.instagramHandle}` : null)
  ?? cleanString(person.phone);

const personSearchTerms = (person: CrmFactPersonHint): string[] => {
  const terms: string[] = [];
  const add = (value: string | null | undefined) => {
    const cleaned = cleanString(value?.replace(/^@+/, '') ?? null);
    if (cleaned && cleaned.includes(':')) return;
    if (cleaned && normalize(cleaned).length >= 3) terms.push(cleaned);
  };

  add(person.email);
  add(person.instagramHandle);
  add(person.phone?.replace(/\D/g, ''));
  add(person.rawName);
  for (const token of normalize(person.rawName).split(/\s+/).filter((item) => item.length >= 5)) add(token);
  return unique(terms);
};

const buildQueryPlan = (clue: CrmIdentityStitchingClue): CrmContactsEvidenceQueryPlan => {
  const searchTerms = personSearchTerms(clue.person);
  return {
    clueId: clue.clueId,
    person: clue.person,
    searchTerms,
    reason: searchTerms.length
      ? `Search macOS Contacts or contacts exports for identity fields related to ${personLabel(clue.person) ?? clue.clueId}.`
      : 'Not enough identity terms to search contacts safely.',
  };
};

const normalizeContactsResults = (value: unknown): CrmContactsEvidenceSearchResult[] => {
  if (Array.isArray(value)) return value.filter((item): item is CrmContactsEvidenceSearchResult => Boolean(item && typeof item === 'object'));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['contacts', 'people', 'results']) {
    const maybeResults = record[key];
    if (Array.isArray(maybeResults)) return normalizeContactsResults(maybeResults);
  }
  return [];
};

const resultName = (result: CrmContactsEvidenceSearchResult): string | null =>
  cleanString(result.fullName)
  ?? cleanString(result.name)
  ?? cleanString([
    result.firstName,
    result.middleName,
    result.lastName,
  ].map((part) => cleanString(part)).filter(Boolean).join(' '));

const resultText = (result: CrmContactsEvidenceSearchResult): string =>
  [
    resultName(result),
    result.nickname,
    result.organization,
    ...asStringArray(result.email),
    ...asStringArray(result.emails),
    ...asStringArray(result.phone),
    ...asStringArray(result.phones),
    result.instagramHandle,
    ...asStringArray(result.socials),
    result.notes,
  ].filter(Boolean).join(' ');

const identityText = (result: CrmContactsEvidenceSearchResult): string =>
  [
    resultName(result),
    result.nickname,
    ...asStringArray(result.email),
    ...asStringArray(result.emails),
    ...asStringArray(result.phone),
    ...asStringArray(result.phones),
    result.instagramHandle,
    ...asStringArray(result.socials),
  ].filter(Boolean).join(' ');

const COMMON_MIDDLE_NAME_TOKENS = new Set(['maria', 'jose']);

const personNameTokens = (value: string | null | undefined): string[] =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .filter((item) => !['del', 'las', 'los', 'una', 'uno', 'con', 'para'].includes(item));

const normalizedDigits = (value: string | null | undefined): string => (value ?? '').replace(/\D/g, '');

const isBloatedContactsResult = (result: CrmContactsEvidenceSearchResult): boolean => {
  const emails = unique([...asStringArray(result.email), ...asStringArray(result.emails)]);
  const phones = unique([...asStringArray(result.phone), ...asStringArray(result.phones)]);
  const socials = unique([...asStringArray(result.instagramHandle), ...asStringArray(result.socials)]);
  const fieldCount = emails.length + phones.length + socials.length;
  return fieldCount > 30 || (!resultName(result) && fieldCount > 8);
};

const identityMatchScore = (
  result: CrmContactsEvidenceSearchResult,
  plan: CrmContactsEvidenceQueryPlan,
): number => {
  if (isBloatedContactsResult(result)) return 0;

  const searchable = normalize(identityText(result));
  if (!searchable) return 0;

  const person = plan.person;
  const email = cleanString(person.email)?.toLowerCase();
  if (email && unique([...asStringArray(result.email), ...asStringArray(result.emails)]).some((item) => item.toLowerCase() === email)) {
    return 1000;
  }

  const phone = normalizedDigits(person.phone);
  if (phone.length >= 7) {
    const phones = unique([...asStringArray(result.phone), ...asStringArray(result.phones)]).map(normalizedDigits);
    if (phones.some((item) => item.includes(phone) || phone.includes(item))) return 900;
  }

  const handle = cleanString(person.instagramHandle)?.replace(/^@+/, '').toLowerCase();
  if (handle) {
    const handles = unique([...asStringArray(result.instagramHandle), ...asStringArray(result.socials)])
      .map((item) => item.replace(/^@+/, '').toLowerCase());
    if (handles.some((item) => item === handle || item.endsWith(`/${handle}`))) return 850;
  }

  const rawName = cleanString(person.rawName);
  const tokens = personNameTokens(rawName);
  if (!rawName || !tokens.length) return 0;

  const normalizedRawName = normalize(rawName);
  const normalizedResultName = normalize(resultName(result) ?? '');
  const exactName = Boolean(normalizedResultName && normalizedResultName.includes(normalizedRawName));
  const presentTokens = tokens.filter((token) => searchable.includes(token));
  const firstToken = tokens[0];
  const surnameTokens = tokens.slice(1).filter((token) => !COMMON_MIDDLE_NAME_TOKENS.has(token));
  const requiredSurnameTokens = surnameTokens.length ? surnameTokens : tokens.slice(1);
  const firstAndSurnamePresent = Boolean(
    firstToken
    && searchable.includes(firstToken)
    && requiredSurnameTokens.some((token) => searchable.includes(token)),
  );

  if (exactName) return 500 + presentTokens.length * 50;
  if (tokens.length >= 2 && firstAndSurnamePresent) {
    return 200 + presentTokens.length * 25;
  }
  if (tokens.length === 1 && presentTokens.length === 1) return 80;
  return 0;
};

const resultSourceId = (result: CrmContactsEvidenceSearchResult): string => {
  const supplied = cleanString(result.sourceId);
  if (supplied) return supplied.startsWith('contacts:') ? supplied : `contacts:${supplied}`;
  const id = result.id === null || result.id === undefined ? null : String(result.id);
  if (id) return `contacts:record:${id}`;
  return `contacts:result:${hashId([resultName(result), resultText(result)])}`;
};

const firstEmail = (result: CrmContactsEvidenceSearchResult): string | null =>
  asStringArray(result.email)[0] ?? asStringArray(result.emails)[0] ?? null;

const firstHandle = (result: CrmContactsEvidenceSearchResult): string | null => {
  const explicit = cleanString(result.instagramHandle);
  if (explicit) return explicit.replace(/^@+/, '').toLowerCase();
  const social = asStringArray(result.socials).find((item) => /instagram|@/.test(item.toLowerCase()));
  if (!social) return null;
  const handle = social.match(/@?([a-zA-Z0-9._]{2,30})$/)?.[1];
  return handle?.toLowerCase() ?? null;
};

const evidenceSourceForResult = (
  result: CrmContactsEvidenceSearchResult,
  plan: CrmContactsEvidenceQueryPlan,
): CrmConnectedEvidenceSourceInput => {
  const phones = unique([...asStringArray(result.phone), ...asStringArray(result.phones)]);
  const emails = unique([...asStringArray(result.email), ...asStringArray(result.emails)]);
  const socials = unique([...asStringArray(result.instagramHandle), ...asStringArray(result.socials)]);
  return {
    sourceKind: 'contacts_app_export',
    sourceId: resultSourceId(result),
    title: resultName(result),
    email: firstEmail(result),
    handle: firstHandle(result),
    snippet: cleanPublicText([
      resultName(result) ? `Name: ${resultName(result)}` : null,
      result.nickname ? `Nickname: ${result.nickname}` : null,
      result.organization ? `Organization: ${result.organization}` : null,
      emails.length ? `Email: ${emails.join(', ')}` : null,
      phones.length ? `Phone: ${phones.join(', ')}` : null,
      socials.length ? `Social: ${socials.join(', ')}` : null,
    ].filter(Boolean).join('\n')),
    text: cleanPublicText([
      `Matched clue: ${personLabel(plan.person) ?? plan.clueId}`,
      result.notes ? `Notes: ${result.notes}` : null,
    ].filter(Boolean).join('\n')),
  };
};

const evidenceSourcesForResults = (
  results: CrmContactsEvidenceSearchResult[],
  queryPlans: CrmContactsEvidenceQueryPlan[],
  maxEvidenceSources: number,
): { evidenceSources: CrmConnectedEvidenceSourceInput[]; matchedResults: number } => {
  const evidenceSources: CrmConnectedEvidenceSourceInput[] = [];
  const seen = new Set<string>();
  let matchedResults = 0;

  for (const result of results) {
    const rankedPlans = queryPlans
      .map((plan) => ({ plan, score: identityMatchScore(result, plan) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const matchingPlan = rankedPlans[0]?.score > (rankedPlans[1]?.score ?? 0) ? rankedPlans[0].plan : null;
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

const safety = (): CrmContactsEvidenceHelperReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  allowedUse: [
    'Build contacts search terms for CRM identity evidence.',
    'Convert supplied contacts results into contacts_app_export evidenceSources packets.',
    'Feed Deep Local Stitching without giving CRM live Contacts permissions or credentials.',
  ],
  prohibitedActions: [
    'Do not mutate contacts.',
    'Do not mutate CRM person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not read or print credentials.',
  ],
});

export const buildCrmVNextContactsEvidenceHelper = (
  input: CrmContactsEvidenceHelperInput,
): CrmContactsEvidenceHelperReport => {
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
  const contactsResults = normalizeContactsResults(input.contactsSearchResults);
  const maxEvidenceSources = Math.max(1, Math.min(100, Math.floor(input.maxEvidenceSources ?? MAX_EVIDENCE_SOURCES)));
  const evidence = evidenceSourcesForResults(contactsResults, queryPlans, maxEvidenceSources);
  const authBlocker = cleanString(input.authBlocker);

  return {
    schemaVersion: CRM_VNEXT_CONTACTS_EVIDENCE_HELPER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_contacts_evidence_helper',
    research,
    queryPlans,
    evidenceSources: evidence.evidenceSources,
    summary: {
      clues: research.clues.length,
      queryPlans: queryPlans.filter((plan) => plan.searchTerms.length).length,
      contactsResultsRead: contactsResults.length,
      contactsResultsMatched: evidence.matchedResults,
      evidenceSources: evidence.evidenceSources.length,
      authBlocked: Boolean(authBlocker),
    },
    auth: {
      liveContactsCalledByHelper: false,
      externalSearchStatus: authBlocker ? 'blocked' : contactsResults.length ? 'results_supplied' : 'not_requested',
      blocker: authBlocker,
      suggestedUnblockAction: authBlocker
        ? 'Grant Contacts read permission or supply a read-only contacts export; do not mutate contacts from CRM.'
        : null,
    },
    safety: safety(),
  };
};
