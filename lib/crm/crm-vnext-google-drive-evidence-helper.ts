import { createHash } from 'node:crypto';
import type { CrmConnectedEvidenceSourceInput, CrmDeepLocalSourceKind } from './crm-vnext-deep-local-stitching';
import type { CrmFactIntakeInput, CrmFactPersonHint } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_GOOGLE_DRIVE_EVIDENCE_HELPER_SCHEMA_VERSION =
  'crm-vnext-google-drive-evidence-helper-2026-05-10' as const;

export type CrmGoogleDriveEvidenceResult = {
  id?: string | number | null;
  fileId?: string | null;
  url?: string | null;
  sourceId?: string | null;
  title?: string | null;
  documentTitle?: string | null;
  spreadsheetTitle?: string | null;
  sheetName?: string | null;
  rowNumber?: number | string | null;
  mimeType?: string | null;
  sourceKind?: CrmDeepLocalSourceKind | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  relationshipContext?: string | null;
  emailOwnership?: 'subject' | 'family_or_companion' | 'unknown' | null;
  row?: Record<string, unknown> | null;
  values?: unknown[] | null;
  content?: string | null;
  snippet?: string | null;
  text?: string | null;
};

export type CrmGoogleDriveEvidenceQueryPlan = {
  clueId: string;
  person: CrmFactPersonHint;
  searchTerms: string[];
  suggestedDriveQueries: string[];
  reason: string;
};

export type CrmGoogleDriveEvidenceHelperReport = {
  schemaVersion: typeof CRM_VNEXT_GOOGLE_DRIVE_EVIDENCE_HELPER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_google_drive_evidence_helper';
  research: CrmIdentityStitchingResearchReport;
  queryPlans: CrmGoogleDriveEvidenceQueryPlan[];
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  reviewSignals: Array<{
    sourceId: string;
    code: 'family_or_companion_email_review';
    message: string;
    email: string | null;
  }>;
  summary: {
    clues: number;
    queryPlans: number;
    driveResultsRead: number;
    driveResultsMatched: number;
    evidenceSources: number;
    familyOrCompanionEmailReview: number;
    authBlocked: boolean;
  };
  auth: {
    liveGoogleDriveCalledByHelper: false;
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
    googleDriveMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmGoogleDriveEvidenceHelperInput = CrmFactIntakeInput & {
  cards?: PersonCardVNext[] | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  research?: CrmIdentityStitchingResearchReport | null;
  googleDriveSearchResults?: unknown;
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

const rowText = (row: Record<string, unknown> | null | undefined): string =>
  row && typeof row === 'object'
    ? Object.entries(row)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value ?? '')}`)
      .join(' ')
    : '';

const valuesText = (values: unknown[] | null | undefined): string =>
  Array.isArray(values) ? values.map((value) => String(value ?? '')).join(' ') : '';

const resultTitle = (result: CrmGoogleDriveEvidenceResult): string | null =>
  cleanString(result.title)
  ?? cleanString(result.spreadsheetTitle)
  ?? cleanString(result.documentTitle);

const resultEmail = (result: CrmGoogleDriveEvidenceResult): string | null => {
  const explicit = cleanString(result.email);
  if (explicit) return explicit.toLowerCase();
  const match = resultText(result).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0].toLowerCase() ?? null;
};

const resultPhone = (result: CrmGoogleDriveEvidenceResult): string | null => {
  const explicit = cleanString(result.phone);
  if (explicit) return explicit;
  const match = resultText(result).match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match?.[0] ?? null;
};

const resultText = (result: CrmGoogleDriveEvidenceResult): string =>
  [
    resultTitle(result),
    result.sheetName,
    result.rowNumber === null || result.rowNumber === undefined ? null : `row ${result.rowNumber}`,
    result.name,
    result.email,
    result.phone,
    result.city,
    result.country,
    result.relationshipContext,
    rowText(result.row),
    valuesText(result.values),
    result.snippet,
    result.text,
    result.content,
  ].filter(Boolean).join(' ');

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

const buildQueryPlan = (clue: CrmIdentityStitchingClue): CrmGoogleDriveEvidenceQueryPlan => {
  const searchTerms = personSearchTerms(clue.person);
  const label = personLabel(clue.person) ?? clue.clueId;
  return {
    clueId: clue.clueId,
    person: clue.person,
    searchTerms,
    suggestedDriveQueries: unique([
      ...searchTerms.slice(0, 4),
      `${label} retiro`,
      `${label} asistentes`,
      `${label} yoga`,
    ].map((query) => query.trim()).filter(Boolean)),
    reason: searchTerms.length
      ? `Search Google Drive/Docs/Sheets read-only for retreat, class, and identity evidence related to ${label}.`
      : 'Not enough identity terms to search Google Drive safely.',
  };
};

const normalizeResults = (value: unknown): CrmGoogleDriveEvidenceResult[] => {
  if (Array.isArray(value)) return value.filter((item): item is CrmGoogleDriveEvidenceResult => Boolean(item && typeof item === 'object'));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  for (const key of ['googleDriveSearchResults', 'driveResults', 'googleDriveResults', 'files', 'rows', 'data', 'items', 'results']) {
    const maybeResults = record[key];
    if (Array.isArray(maybeResults)) return normalizeResults(maybeResults);
  }
  return [];
};

const resultMatchesPlan = (
  result: CrmGoogleDriveEvidenceResult,
  plan: CrmGoogleDriveEvidenceQueryPlan,
): boolean => {
  const normalized = normalize(resultText(result));
  if (!normalized) return false;
  return plan.searchTerms.some((term) => normalized.includes(normalize(term)));
};

const resultSourceId = (result: CrmGoogleDriveEvidenceResult): string => {
  const supplied = cleanString(result.sourceId);
  if (supplied) return supplied.startsWith('google-drive:') ? supplied : `google-drive:${supplied}`;
  const id = result.fileId ?? result.id;
  const title = resultTitle(result);
  if (id !== null && id !== undefined) {
    const suffix = [result.sheetName, result.rowNumber === null || result.rowNumber === undefined ? null : `row-${result.rowNumber}`]
      .filter(Boolean)
      .join(':');
    return `google-drive:${id}${suffix ? `:${suffix}` : ''}`;
  }
  return `google-drive:result:${hashId([title, resultText(result)])}`;
};

const inferSourceKind = (result: CrmGoogleDriveEvidenceResult): CrmDeepLocalSourceKind => {
  if (result.sourceKind) return result.sourceKind;
  const normalized = normalize([resultTitle(result), result.sheetName, resultText(result)].filter(Boolean).join(' '));
  if (/\b(retiro|retiros|asistente|asistencia|inscripcion|inscripción|alojamiento|pago)\b/.test(normalized)) {
    return 'retreat_table';
  }
  return 'google_drive_export';
};

const emailOwnershipReview = (
  result: CrmGoogleDriveEvidenceResult,
  plan: CrmGoogleDriveEvidenceQueryPlan,
): boolean => {
  if (result.emailOwnership === 'family_or_companion') return true;
  if (result.emailOwnership === 'subject') return false;
  const email = resultEmail(result);
  if (!email) return false;
  const localPart = normalize(email.split('@')[0]);
  const personTerms = personSearchTerms(plan.person).map(normalize).filter((term) => term.length >= 5);
  const localMatchesPerson = personTerms.some((term) => localPart.includes(term) || term.includes(localPart));
  if (localMatchesPerson) return false;
  const normalizedText = normalize(resultText(result));
  return /\b(familia|familiar|hija|hijo|esposo|esposa|acompanante|acompañante|companero|compañero|ariana|fidel)\b/.test(normalizedText);
};

const evidenceSourceForResult = (
  result: CrmGoogleDriveEvidenceResult,
  plan: CrmGoogleDriveEvidenceQueryPlan,
): { evidenceSource: CrmConnectedEvidenceSourceInput; reviewSignal: CrmGoogleDriveEvidenceHelperReport['reviewSignals'][number] | null } => {
  const email = resultEmail(result);
  const phone = resultPhone(result);
  const reviewEmail = emailOwnershipReview(result, plan);
  const sourceId = resultSourceId(result);
  const title = resultTitle(result);
  const reviewLine = reviewEmail
    ? 'Email ownership review required: email may belong to a family member or companion, not necessarily the named CRM subject.'
    : null;
  const snippet = cleanPublicText([
    title ? `File: ${title}` : null,
    result.sheetName ? `Sheet: ${result.sheetName}` : null,
    result.rowNumber === null || result.rowNumber === undefined ? null : `Row: ${result.rowNumber}`,
    result.name ? `Name: ${result.name}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    result.city ? `City: ${result.city}` : null,
    result.country ? `Country: ${result.country}` : null,
    result.relationshipContext ? `Context: ${result.relationshipContext}` : null,
    rowText(result.row),
    valuesText(result.values),
    result.snippet,
    reviewLine,
  ].filter(Boolean).join('\n'));

  return {
    evidenceSource: {
      sourceKind: inferSourceKind(result),
      sourceId,
      title,
      email: reviewEmail ? null : email,
      snippet,
      text: cleanPublicText([
        `Matched clue: ${personLabel(plan.person) ?? plan.clueId}`,
        result.text,
        result.content,
      ].filter(Boolean).join('\n')),
    },
    reviewSignal: reviewEmail
      ? {
        sourceId,
        code: 'family_or_companion_email_review',
        message: 'Email candidate should be reviewed before assigning it as the subject primary email.',
        email,
      }
      : null,
  };
};

const evidenceSourcesForResults = (
  results: CrmGoogleDriveEvidenceResult[],
  queryPlans: CrmGoogleDriveEvidenceQueryPlan[],
  maxEvidenceSources: number,
): {
  evidenceSources: CrmConnectedEvidenceSourceInput[];
  reviewSignals: CrmGoogleDriveEvidenceHelperReport['reviewSignals'];
  matchedResults: number;
} => {
  const evidenceSources: CrmConnectedEvidenceSourceInput[] = [];
  const reviewSignals: CrmGoogleDriveEvidenceHelperReport['reviewSignals'] = [];
  const seen = new Set<string>();
  let matchedResults = 0;
  for (const result of results) {
    const matchingPlan = queryPlans.find((plan) => resultMatchesPlan(result, plan));
    if (!matchingPlan) continue;
    matchedResults += 1;
    const { evidenceSource, reviewSignal } = evidenceSourceForResult(result, matchingPlan);
    const key = evidenceSource.sourceId ?? JSON.stringify(evidenceSource);
    if (seen.has(key)) continue;
    seen.add(key);
    evidenceSources.push(evidenceSource);
    if (reviewSignal) reviewSignals.push(reviewSignal);
    if (evidenceSources.length >= maxEvidenceSources) break;
  }
  return { evidenceSources, reviewSignals, matchedResults };
};

const safety = (): CrmGoogleDriveEvidenceHelperReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  googleDriveMutationProhibited: true,
  allowedUse: [
    'Build Google Drive/Docs/Sheets search terms for CRM identity and retreat evidence.',
    'Convert supplied Drive/Sheets read-only results into evidenceSources packets.',
    'Preserve family or companion email ambiguity for human review.',
  ],
  prohibitedActions: [
    'Do not create, update, move, share, or delete Google Drive files.',
    'Do not mutate CRM person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not read or print credentials.',
  ],
});

export const buildCrmVNextGoogleDriveEvidenceHelper = (
  input: CrmGoogleDriveEvidenceHelperInput,
): CrmGoogleDriveEvidenceHelperReport => {
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
  const results = normalizeResults(input.googleDriveSearchResults);
  const maxEvidenceSources = Math.max(1, Math.min(100, Math.floor(input.maxEvidenceSources ?? MAX_EVIDENCE_SOURCES)));
  const evidence = evidenceSourcesForResults(results, queryPlans, maxEvidenceSources);
  const authBlocker = cleanString(input.authBlocker);

  return {
    schemaVersion: CRM_VNEXT_GOOGLE_DRIVE_EVIDENCE_HELPER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_google_drive_evidence_helper',
    research,
    queryPlans,
    evidenceSources: evidence.evidenceSources,
    reviewSignals: evidence.reviewSignals,
    summary: {
      clues: research.clues.length,
      queryPlans: queryPlans.filter((plan) => plan.searchTerms.length).length,
      driveResultsRead: results.length,
      driveResultsMatched: evidence.matchedResults,
      evidenceSources: evidence.evidenceSources.length,
      familyOrCompanionEmailReview: evidence.reviewSignals.length,
      authBlocked: Boolean(authBlocker),
    },
    auth: {
      liveGoogleDriveCalledByHelper: false,
      externalSearchStatus: authBlocker ? 'blocked' : results.length ? 'results_supplied' : 'not_requested',
      blocker: authBlocker,
      suggestedUnblockAction: authBlocker
        ? 'Run the read-only Google Drive connector outside CRM, then supply selected rows as evidenceSources.'
        : null,
    },
    safety: safety(),
  };
};
