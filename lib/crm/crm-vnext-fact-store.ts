import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { CrmFactEvent, CrmFactIntakeDraft, CrmFactSourceKind, CrmFactType } from './crm-vnext-fact-intake';

export const CRM_VNEXT_FACT_STORE_SCHEMA_VERSION = 'crm-vnext-fact-store-2026-05-09' as const;
export const CRM_VNEXT_STORED_FACT_SCHEMA_VERSION = 'crm-vnext-stored-fact-2026-05-09' as const;

export const DEFAULT_CRM_VNEXT_FACT_STORE_PATH = join(
  process.cwd(),
  '.crm-vnext',
  'fact-store',
  'facts.jsonl',
);

export type CrmStoredFactCardApplyStatus = 'ready' | 'needs_review';

export type CrmStoredFact = {
  schemaVersion: typeof CRM_VNEXT_STORED_FACT_SCHEMA_VERSION;
  storedFactId: string;
  factId: string;
  batchId: string;
  storedAt: string;
  storeApprovedBy: string;
  storeApprovedAt: string;
  sourceDraftGeneratedAt: string | null;
  fact: CrmFactEvent;
  cardApply: {
    status: CrmStoredFactCardApplyStatus;
    reason: string | null;
  };
};

export type CrmFactStoreSummary = {
  facts: number;
  readyForCardApply: number;
  needsReview: number;
  stableIdentity: number;
  missingStableIdentity: number;
  latestStoredAt: string | null;
  factTypes: Record<CrmFactType, number>;
  sourceKinds: Record<CrmFactSourceKind, number>;
};

export type CrmFactStoreReadResult = {
  schemaVersion: typeof CRM_VNEXT_FACT_STORE_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_fact_store';
  summary: CrmFactStoreSummary;
  facts: CrmStoredFact[];
  invalidRows: number;
  safety: CrmFactStoreSafety;
};

export type CrmFactStoreAppendResult = {
  schemaVersion: typeof CRM_VNEXT_FACT_STORE_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'dry_run_fact_store_append' | 'local_fact_store_append';
  committed: boolean;
  batchId: string;
  incoming: number;
  added: CrmStoredFact[];
  duplicatesSkipped: CrmFactEvent[];
  summaryAfter: CrmFactStoreSummary;
  safety: CrmFactStoreSafety;
};

export type CrmFactStoreSafety = {
  outboundProhibited: true;
  cardMutationProhibited: true;
  credentialReadProhibited: true;
  localOnly: true;
  allowedUse: string[];
  prohibitedActions: string[];
};

export type CrmFactStoreAppendInput = {
  facts: CrmFactEvent[];
  draft?: Pick<CrmFactIntakeDraft, 'generatedAt'> | null;
  approvedBy: string;
  commit?: boolean;
  now?: string | Date | null;
  storePath?: string | null;
};

const FACT_TYPES: CrmFactType[] = [
  'program_participation',
  'retreat_attendance',
  'community_event_attendance',
  'expressed_interest',
  'client_status',
  'purchase',
  'identity_update',
  'note',
];

const SOURCE_KINDS: CrmFactSourceKind[] = [
  'alejandro_conversation',
  'telegram_human_report',
  'mailerlite_tag_snapshot',
  'instagram_signal',
  'manual_import',
  'unknown',
];

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

const resolveStorePath = (storePath?: string | null): string =>
  resolve(storePath || process.env.CRM_VNEXT_FACT_STORE_PATH || DEFAULT_CRM_VNEXT_FACT_STORE_PATH);

const hasStableIdentity = (fact: CrmFactEvent): boolean =>
  Boolean(fact.person.personIdHint || fact.person.email || fact.person.instagramHandle || fact.person.phone);

const cardApplyStatus = (fact: CrmFactEvent): CrmStoredFact['cardApply'] => {
  if (fact.requiresHumanReview) {
    return {
      status: 'needs_review',
      reason: hasStableIdentity(fact)
        ? 'Fact requires human review before card application.'
        : 'No stable identity is present yet.',
    };
  }
  return {
    status: 'ready',
    reason: null,
  };
};

const makeBatchId = (now: string): string =>
  `fact_batch_${now.replace(/[^0-9]/g, '').slice(0, 14)}`;

const makeStoredFactId = (factId: string): string => `stored_${factId}`;

const safety = (): CrmFactStoreSafety => ({
  outboundProhibited: true,
  cardMutationProhibited: true,
  credentialReadProhibited: true,
  localOnly: true,
  allowedUse: [
    'Persist approved CRM facts locally.',
    'Review which facts are ready for future card rebuild.',
    'Audit source, reporter, evidence text, and approval metadata.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from fact-store writes.',
    'Do not send outbound messages.',
    'Do not read or change credentials.',
    'Do not treat needs_review facts as card-ready.',
  ],
});

const emptyTypeCounts = (): Record<CrmFactType, number> =>
  FACT_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<CrmFactType, number>);

const emptySourceCounts = (): Record<CrmFactSourceKind, number> =>
  SOURCE_KINDS.reduce((acc, kind) => {
    acc[kind] = 0;
    return acc;
  }, {} as Record<CrmFactSourceKind, number>);

export const summarizeCrmFactStore = (facts: CrmStoredFact[]): CrmFactStoreSummary => {
  const factTypes = emptyTypeCounts();
  const sourceKinds = emptySourceCounts();
  let latestStoredAt: string | null = null;

  for (const stored of facts) {
    factTypes[stored.fact.type] = (factTypes[stored.fact.type] ?? 0) + 1;
    sourceKinds[stored.fact.source.kind] = (sourceKinds[stored.fact.source.kind] ?? 0) + 1;
    if (!latestStoredAt || stored.storedAt > latestStoredAt) latestStoredAt = stored.storedAt;
  }

  return {
    facts: facts.length,
    readyForCardApply: facts.filter((fact) => fact.cardApply.status === 'ready').length,
    needsReview: facts.filter((fact) => fact.cardApply.status === 'needs_review').length,
    stableIdentity: facts.filter((fact) => hasStableIdentity(fact.fact)).length,
    missingStableIdentity: facts.filter((fact) => !hasStableIdentity(fact.fact)).length,
    latestStoredAt,
    factTypes,
    sourceKinds,
  };
};

const parseJsonl = (text: string): { facts: CrmStoredFact[]; invalidRows: number } => {
  const facts: CrmStoredFact[] = [];
  let invalidRows = 0;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as CrmStoredFact;
      if (parsed?.schemaVersion === CRM_VNEXT_STORED_FACT_SCHEMA_VERSION && parsed.factId && parsed.fact) {
        facts.push(parsed);
      } else {
        invalidRows += 1;
      }
    } catch {
      invalidRows += 1;
    }
  }

  return { facts, invalidRows };
};

export const readCrmFactStore = async (
  storePath = resolveStorePath(),
  options: { now?: string | Date | null; limit?: number | null } = {},
): Promise<CrmFactStoreReadResult> => {
  const generatedAt = isoNow(options.now);
  let parsed: { facts: CrmStoredFact[]; invalidRows: number } = { facts: [], invalidRows: 0 };

  try {
    parsed = parseJsonl(await readFile(storePath, 'utf8'));
  } catch {
    parsed = { facts: [], invalidRows: 0 };
  }

  const sorted = parsed.facts.sort((a, b) => b.storedAt.localeCompare(a.storedAt));
  const limit = typeof options.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : sorted.length;

  return {
    schemaVersion: CRM_VNEXT_FACT_STORE_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_fact_store',
    summary: summarizeCrmFactStore(parsed.facts),
    facts: sorted.slice(0, limit),
    invalidRows: parsed.invalidRows,
    safety: safety(),
  };
};

const validateFacts = (facts: CrmFactEvent[]): CrmFactEvent[] =>
  facts.filter((fact) => cleanString(fact.factId) && cleanString(fact.type) && fact.person && fact.source);

export const appendCrmFactsToStore = async (
  input: CrmFactStoreAppendInput,
): Promise<CrmFactStoreAppendResult> => {
  const approvedBy = cleanString(input.approvedBy);
  if (!approvedBy) throw new Error('fact_store_approved_by_required');

  const generatedAt = isoNow(input.now);
  const storePath = resolveStorePath(input.storePath);
  const current = await readCrmFactStore(storePath, { now: generatedAt });
  const existingIds = new Set(current.facts.map((stored) => stored.factId));
  const validFacts = validateFacts(input.facts);
  const batchId = makeBatchId(generatedAt);
  const added: CrmStoredFact[] = [];
  const duplicatesSkipped: CrmFactEvent[] = [];

  for (const fact of validFacts) {
    if (existingIds.has(fact.factId) || added.some((stored) => stored.factId === fact.factId)) {
      duplicatesSkipped.push(fact);
      continue;
    }

    added.push({
      schemaVersion: CRM_VNEXT_STORED_FACT_SCHEMA_VERSION,
      storedFactId: makeStoredFactId(fact.factId),
      factId: fact.factId,
      batchId,
      storedAt: generatedAt,
      storeApprovedBy: approvedBy,
      storeApprovedAt: generatedAt,
      sourceDraftGeneratedAt: input.draft?.generatedAt ?? null,
      fact,
      cardApply: cardApplyStatus(fact),
    });
  }

  if (input.commit && added.length) {
    await mkdir(dirname(storePath), { recursive: true });
    await appendFile(
      storePath,
      added.map((fact) => JSON.stringify(fact)).join('\n') + '\n',
      'utf8',
    );
  }

  const summaryAfter = summarizeCrmFactStore(
    input.commit ? [...current.facts, ...added] : current.facts,
  );

  return {
    schemaVersion: CRM_VNEXT_FACT_STORE_SCHEMA_VERSION,
    generatedAt,
    mode: input.commit ? 'local_fact_store_append' : 'dry_run_fact_store_append',
    committed: Boolean(input.commit),
    batchId,
    incoming: input.facts.length,
    added,
    duplicatesSkipped,
    summaryAfter,
    safety: safety(),
  };
};
