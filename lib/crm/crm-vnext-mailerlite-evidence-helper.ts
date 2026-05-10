import { createHash } from 'node:crypto';
import type { CrmConnectedEvidenceSourceInput } from './crm-vnext-deep-local-stitching';
import type { CrmFactIntakeInput, CrmFactPersonHint } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import {
  crmVNextNameCompatible,
  crmVNextNameTokenInText,
  crmVNextNameTokens,
  normalizeCrmVNextIdentityText,
} from './crm-vnext-name-matching';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_MAILERLITE_EVIDENCE_HELPER_SCHEMA_VERSION =
  'crm-vnext-mailerlite-evidence-helper-2026-05-10' as const;

export type CrmMailerLiteEvidenceSearchResult = {
  id?: string | number | null;
  subscriber_id?: string | number | null;
  sourceId?: string | null;
  email?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string | null;
  groups?: Array<{ id?: string | number | null; name?: string | null }> | string[] | string | null;
  fields?: Record<string, unknown> | null;
};

export type CrmMailerLiteEvidenceQueryPlan = {
  clueId: string;
  person: CrmFactPersonHint;
  searchTerms: string[];
  primarySearch: string | null;
  reason: string;
};

export type CrmMailerLiteEvidenceHelperReport = {
  schemaVersion: typeof CRM_VNEXT_MAILERLITE_EVIDENCE_HELPER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_mailerlite_evidence_helper';
  research: CrmIdentityStitchingResearchReport;
  queryPlans: CrmMailerLiteEvidenceQueryPlan[];
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  summary: {
    clues: number;
    queryPlans: number;
    mailerLiteResultsRead: number;
    mailerLiteResultsMatched: number;
    evidenceSources: number;
    authBlocked: boolean;
  };
  auth: {
    liveMailerLiteCalledByHelper: false;
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
    mailerLiteMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmMailerLiteEvidenceHelperInput = CrmFactIntakeInput & {
  cards?: PersonCardVNext[] | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  research?: CrmIdentityStitchingResearchReport | null;
  mailerLiteSearchResults?: unknown;
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

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'object' && item ? cleanString((item as { name?: unknown }).name) : cleanString(item))
      .filter((item): item is string => Boolean(item));
  }
  const cleaned = cleanString(value);
  if (!cleaned) return [];
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return asStringArray(parsed);
    } catch {
      // Fall through.
    }
  }
  return cleaned.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const fieldValue = (result: CrmMailerLiteEvidenceSearchResult, key: string): string | null => {
  const fields = result.fields;
  if (Array.isArray(fields)) {
    const match = fields.find((field) =>
      Boolean(field && typeof field === 'object' && cleanString((field as { key?: unknown }).key) === key),
    );
    return cleanString((match as { value?: unknown } | undefined)?.value) ?? null;
  }
  const record = fields && typeof fields === 'object' ? fields as Record<string, unknown> : {};
  return cleanString(record[key]) ?? null;
};

const resultName = (result: CrmMailerLiteEvidenceSearchResult): string | null =>
  cleanString([
    cleanString(result.name) ?? cleanString(fieldValue(result, 'name')),
    cleanString(result.first_name) ?? fieldValue(result, 'first_name'),
    cleanString(result.last_name) ?? fieldValue(result, 'last_name'),
  ].filter(Boolean).join(' '));

const PLAN_NAME_PREFIXES = [
  /^tambien\s+(?:tenemos\s+a|esta)\s+/i,
  /^también\s+(?:tenemos\s+a|está)\s+/i,
  /^tenemos\s+(?:tambien\s+)?a\s+/i,
  /^tenemos\s+(?:también\s+)?a\s+/i,
] as const;

const RELATIONAL_OR_NOISE_NAME_PATTERNS = [
  /^que$/i,
  /^es\s+hij[ao]\s+de\s+/i,
  /^es\s+(?:mi\s+)?(?:mama|mamá|tia|tía|tio|tío|amig[ao]|aliad[ao])$/i,
] as const;

const cleanedPlanRawName = (value: string | null | undefined): string | null => {
  let cleaned = cleanString(value);
  if (!cleaned) return null;
  if (RELATIONAL_OR_NOISE_NAME_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  for (const pattern of PLAN_NAME_PREFIXES) cleaned = cleaned.replace(pattern, '').trim();
  if (!cleaned || RELATIONAL_OR_NOISE_NAME_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  return cleaned;
};

const resultIdentityText = (result: CrmMailerLiteEvidenceSearchResult): string =>
  [
    resultName(result),
    result.email,
    result.first_name,
    result.last_name,
    fieldValue(result, 'first_name'),
    fieldValue(result, 'last_name'),
  ].filter(Boolean).join(' ');

const rawNameMatchesResult = (
  rawName: string | null,
  result: CrmMailerLiteEvidenceSearchResult,
): boolean => {
  if (!rawName) return false;
  const tokens = crmVNextNameTokens(rawName);
  const identityText = resultIdentityText(result);
  if (!tokens.length || !identityText) return false;
  if (tokens.length >= 2) return crmVNextNameCompatible(rawName, identityText);
  return crmVNextNameTokenInText(tokens[0], identityText);
};

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

const personLabel = (person: CrmFactPersonHint): string | null =>
  cleanString(person.rawName)
  ?? cleanString(person.email)
  ?? cleanString(person.instagramHandle ? `@${person.instagramHandle}` : null)
  ?? cleanString(person.phone);

const buildQueryPlan = (clue: CrmIdentityStitchingClue): CrmMailerLiteEvidenceQueryPlan => {
  const searchTerms = personSearchTerms(clue.person);
  return {
    clueId: clue.clueId,
    person: clue.person,
    searchTerms,
    primarySearch: searchTerms[0] ?? null,
    reason: searchTerms.length
      ? `Search MailerLite subscribers read-only for identity fields related to ${personLabel(clue.person) ?? clue.clueId}.`
      : 'Not enough identity terms to search MailerLite safely.',
  };
};

const normalizeResults = (value: unknown): CrmMailerLiteEvidenceSearchResult[] => {
  if (Array.isArray(value)) return value.filter((item): item is CrmMailerLiteEvidenceSearchResult => Boolean(item && typeof item === 'object'));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['subscribers', 'data', 'items', 'results']) {
    const maybeResults = record[key];
    if (Array.isArray(maybeResults)) return normalizeResults(maybeResults);
  }
  return [];
};

const resultText = (result: CrmMailerLiteEvidenceSearchResult): string =>
  [
    result.email,
    resultName(result),
    result.first_name,
    result.last_name,
    result.phone,
    result.city,
    result.country,
    result.status,
    fieldValue(result, 'phone'),
    fieldValue(result, 'city'),
    fieldValue(result, 'country'),
    ...asStringArray(result.groups),
  ].filter(Boolean).join(' ');

const resultMatchesPlan = (
  result: CrmMailerLiteEvidenceSearchResult,
  plan: CrmMailerLiteEvidenceQueryPlan,
): boolean => {
  const normalized = normalize(resultText(result));
  if (!normalized) return false;
  const email = cleanString(plan.person.email);
  if (email && normalize(cleanString(result.email)) === normalize(email)) return true;

  const phone = cleanString(plan.person.phone)?.replace(/\D/g, '');
  const resultPhone = [cleanString(result.phone), fieldValue(result, 'phone')]
    .filter(Boolean)
    .join(' ')
    .replace(/\D/g, '');
  if (phone && resultPhone.includes(phone)) return true;

  const handle = cleanString(plan.person.instagramHandle)?.replace(/^@+/, '');
  if (handle && normalizeCrmVNextIdentityText(normalized).includes(normalizeCrmVNextIdentityText(handle))) return true;

  const suppliedRawName = cleanString(plan.person.rawName);
  const rawName = cleanedPlanRawName(suppliedRawName);
  if (suppliedRawName && !rawName) return false;
  if (rawName) return rawNameMatchesResult(rawName, result);

  return plan.searchTerms.some((term) => normalized.includes(normalize(term)));
};

const resultSourceId = (result: CrmMailerLiteEvidenceSearchResult): string => {
  const supplied = cleanString(result.sourceId);
  if (supplied) return supplied.startsWith('mailerlite:') ? supplied : `mailerlite:${supplied}`;
  const id = result.id ?? result.subscriber_id;
  if (id !== null && id !== undefined) return `mailerlite:subscriber:${id}`;
  return `mailerlite:result:${hashId([result.email, resultName(result), resultText(result)])}`;
};

const evidenceSourceForResult = (
  result: CrmMailerLiteEvidenceSearchResult,
  plan: CrmMailerLiteEvidenceQueryPlan,
): CrmConnectedEvidenceSourceInput => {
  const groups = asStringArray(result.groups);
  const phone = cleanString(result.phone) ?? fieldValue(result, 'phone');
  const city = cleanString(result.city) ?? fieldValue(result, 'city');
  const country = cleanString(result.country) ?? fieldValue(result, 'country');
  return {
    sourceKind: 'mailerlite_export',
    sourceId: resultSourceId(result),
    title: resultName(result),
    email: cleanString(result.email),
    snippet: cleanPublicText([
      resultName(result) ? `Name: ${resultName(result)}` : null,
      result.email ? `Email: ${result.email}` : null,
      phone ? `Phone: ${phone}` : null,
      city ? `City: ${city}` : null,
      country ? `Country: ${country}` : null,
      result.status ? `Status: ${result.status}` : null,
      groups.length ? `Groups: ${groups.join(', ')}` : null,
    ].filter(Boolean).join('\n')),
    text: cleanPublicText(`Matched clue: ${personLabel(plan.person) ?? plan.clueId}`),
  };
};

const evidenceSourcesForResults = (
  results: CrmMailerLiteEvidenceSearchResult[],
  queryPlans: CrmMailerLiteEvidenceQueryPlan[],
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

const safety = (): CrmMailerLiteEvidenceHelperReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  mailerLiteMutationProhibited: true,
  allowedUse: [
    'Build MailerLite subscriber search terms for CRM identity evidence.',
    'Convert supplied MailerLite read-only results into mailerlite_export evidenceSources packets.',
    'Feed Deep Local Stitching without giving CRM MailerLite credentials.',
  ],
  prohibitedActions: [
    'Do not create, update, tag, group, delete, or suppress MailerLite subscribers.',
    'Do not mutate CRM person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not read or print credentials.',
  ],
});

export const buildCrmVNextMailerLiteEvidenceHelper = (
  input: CrmMailerLiteEvidenceHelperInput,
): CrmMailerLiteEvidenceHelperReport => {
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
  const results = normalizeResults(input.mailerLiteSearchResults);
  const maxEvidenceSources = Math.max(1, Math.min(100, Math.floor(input.maxEvidenceSources ?? MAX_EVIDENCE_SOURCES)));
  const evidence = evidenceSourcesForResults(results, queryPlans, maxEvidenceSources);
  const authBlocker = cleanString(input.authBlocker);

  return {
    schemaVersion: CRM_VNEXT_MAILERLITE_EVIDENCE_HELPER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_mailerlite_evidence_helper',
    research,
    queryPlans,
    evidenceSources: evidence.evidenceSources,
    summary: {
      clues: research.clues.length,
      queryPlans: queryPlans.filter((plan) => plan.primarySearch).length,
      mailerLiteResultsRead: results.length,
      mailerLiteResultsMatched: evidence.matchedResults,
      evidenceSources: evidence.evidenceSources.length,
      authBlocked: Boolean(authBlocker),
    },
    auth: {
      liveMailerLiteCalledByHelper: false,
      externalSearchStatus: authBlocker ? 'blocked' : results.length ? 'results_supplied' : 'not_requested',
      blocker: authBlocker,
      suggestedUnblockAction: authBlocker
        ? 'Refresh or run the read-only MailerLite connector outside CRM, then supply selected results as evidenceSources.'
        : null,
    },
    safety: safety(),
  };
};
