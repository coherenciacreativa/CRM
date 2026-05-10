import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_CRM_VNEXT_FACT_STORE_PATH,
  readCrmFactStore,
} from './crm-vnext-fact-store';

export const CRM_VNEXT_SOURCE_LEDGER_SCHEMA_VERSION = 'crm-vnext-source-ledger-2026-05-09' as const;

export type CrmVNextSourceFreshness = 'fresh' | 'watch' | 'stale' | 'blocked' | 'missing' | 'unknown';
export type CrmVNextSourceTrust = 'high' | 'medium' | 'low' | 'blocked' | 'unknown';

export type CrmVNextSourceLedgerEntry = {
  id: string;
  title: string;
  kind:
    | 'person_cards'
    | 'mailerlite_snapshot'
    | 'mailerlite_bridge'
    | 'instagram_ui_snapshot'
    | 'instagram_api_snapshot'
    | 'instagram_web_probe'
    | 'fact_intake_protocol'
    | 'fact_store';
  mode: 'local_artifact' | 'local_protocol' | 'external_blocked';
  generatedAt: string | null;
  freshness: CrmVNextSourceFreshness;
  trust: CrmVNextSourceTrust;
  recordCount: number | null;
  metrics: Record<string, number | string | boolean | null>;
  canAutoIngest: boolean;
  canMutateRecords: boolean;
  operatorAction: string | null;
  note: string;
};

export type CrmVNextSourceLedger = {
  schemaVersion: typeof CRM_VNEXT_SOURCE_LEDGER_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_source_ledger';
  status: 'ready' | 'watch' | 'blocked';
  sources: CrmVNextSourceLedgerEntry[];
  gaps: Array<{
    id: string;
    level: 'watch' | 'blocked';
    title: string;
    detail: string;
    operatorAction: string;
  }>;
  safety: {
    outboundProhibited: true;
    credentialReadProhibited: true;
    recordMutationProhibited: true;
    localPathsRedacted: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmVNextSourceLedgerPaths = {
  personCards?: string;
  mailerSnapshot?: string;
  mailerBridge?: string;
  skippedMailerRows?: string;
  igUiSignals?: string;
  igApiInbox?: string;
  igWebProbe?: string;
  factStore?: string;
};

export type CrmVNextSourceLedgerOptions = {
  now?: string | Date | null;
  expectedMailerLiteContacts?: number | null;
  paths?: CrmVNextSourceLedgerPaths;
};

const OPS_DIR = join(
  homedir(),
  '.openclaw-lakshmi',
  'workspace',
  'memory',
  'projects',
  'crm-memory-fabric',
  'ops',
);

export const DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS = {
  personCards: join(OPS_DIR, 'person-cards-v1.json'),
  mailerSnapshot: join(OPS_DIR, 'mailer-engagement-snapshot.json'),
  mailerBridge: join(OPS_DIR, 'mailer-ig-bridge.csv'),
  skippedMailerRows: join(OPS_DIR, 'person-cards-v1-skipped-mailer-rows.json'),
  igUiSignals: join(OPS_DIR, 'ig-ui-signals-state.json'),
  igApiInbox: join(OPS_DIR, 'ig-api-inbox-snapshot.json'),
  igWebProbe: join(OPS_DIR, 'ig-web-probe-state.json'),
  factStore: DEFAULT_CRM_VNEXT_FACT_STORE_PATH,
} satisfies Required<CrmVNextSourceLedgerPaths>;

type JsonObject = Record<string, unknown>;

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

const cleanNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ageDays = (generatedAt: string | null, now: string): number | null => {
  const generated = parseDate(generatedAt);
  const current = parseDate(now);
  if (!generated || !current) return null;
  return Math.max(0, (current.getTime() - generated.getTime()) / (24 * 60 * 60 * 1000));
};

const freshnessFromAge = (
  generatedAt: string | null,
  now: string,
  thresholds: { freshDays: number; watchDays: number },
): CrmVNextSourceFreshness => {
  const age = ageDays(generatedAt, now);
  if (age == null) return 'unknown';
  if (age <= thresholds.freshDays) return 'fresh';
  if (age <= thresholds.watchDays) return 'watch';
  return 'stale';
};

const readJson = async (filePath: string): Promise<JsonObject | null> => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as JsonObject;
  } catch {
    return null;
  }
};

const readText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

const missingEntry = (
  id: CrmVNextSourceLedgerEntry['id'],
  title: string,
  kind: CrmVNextSourceLedgerEntry['kind'],
  note: string,
): CrmVNextSourceLedgerEntry => ({
  id,
  title,
  kind,
  mode: 'local_artifact',
  generatedAt: null,
  freshness: 'missing',
  trust: 'unknown',
  recordCount: null,
  metrics: {},
  canAutoIngest: false,
  canMutateRecords: false,
  operatorAction: 'Repair or regenerate the local artifact before relying on this source.',
  note,
});

const personCardsEntry = async (
  filePath: string,
  now: string,
): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('person_cards_v1', 'Person Cards V1', 'person_cards', 'Primary local card artifact is unavailable.');
  }

  const cards = Array.isArray(payload.cards) ? payload.cards.length : cleanNumber((payload.counts as JsonObject | undefined)?.cards);
  const generatedAt = cleanString(payload.generatedAt);
  const counts = (payload.counts && typeof payload.counts === 'object' ? payload.counts : {}) as JsonObject;
  return {
    id: 'person_cards_v1',
    title: 'Person Cards V1',
    kind: 'person_cards',
    mode: 'local_artifact',
    generatedAt,
    freshness: freshnessFromAge(generatedAt, now, { freshDays: 2, watchDays: 7 }),
    trust: cards > 0 ? 'medium' : 'low',
    recordCount: cards,
    metrics: {
      emailPresent: cleanNumber(counts.emailPresent ?? counts.withEmail),
      instagramPresent: cleanNumber(counts.instagramPresent ?? counts.withInstagram),
      omnichannel: cleanNumber(counts.omnichannel),
    },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction: cards > 0 ? null : 'Regenerate person cards before running operator briefs.',
    note: 'Current read model for CRM vNext dashboards, queues, and briefs.',
  };
};

const mailerSnapshotEntry = async (
  filePath: string,
  now: string,
  expectedMailerLiteContacts: number | null,
): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('mailerlite_engagement_snapshot', 'MailerLite engagement snapshot', 'mailerlite_snapshot', 'Local MailerLite snapshot is unavailable.');
  }

  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  const generatedAt = cleanString(payload.generatedAt);
  const expected = expectedMailerLiteContacts && expectedMailerLiteContacts > 0 ? expectedMailerLiteContacts : null;
  const missingFromExpected = expected ? Math.max(0, expected - profiles.length) : null;
  const baseFreshness = freshnessFromAge(generatedAt, now, { freshDays: 7, watchDays: 30 });
  const freshness = baseFreshness === 'stale'
    ? 'stale'
    : missingFromExpected && missingFromExpected > 0
      ? 'watch'
      : baseFreshness;

  return {
    id: 'mailerlite_engagement_snapshot',
    title: 'MailerLite engagement snapshot',
    kind: 'mailerlite_snapshot',
    mode: 'local_artifact',
    generatedAt,
    freshness,
    trust: profiles.length > 0 ? 'medium' : 'low',
    recordCount: profiles.length,
    metrics: {
      source: cleanString(payload.source),
      nonEmptyEmail: profiles.filter((profile) => cleanString((profile as JsonObject).email)).length,
      opensPositive: profiles.filter((profile) => cleanNumber((profile as JsonObject).opens30d) > 0).length,
      clicksPositive: profiles.filter((profile) => cleanNumber((profile as JsonObject).clicks30d) > 0).length,
      expectedContacts: expected,
      missingFromExpected,
    },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction:
      missingFromExpected && missingFromExpected > 0
        ? 'Refresh or compare MailerLite read-only data before trusting CRM coverage.'
        : baseFreshness === 'stale'
          ? 'Refresh MailerLite snapshot through a credential-safe read-only path.'
          : null,
    note: 'Local email engagement source. It does not prove current MailerLite total unless refreshed.',
  };
};

const csvRowCount = (text: string): number => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return Math.max(0, lines.length - 1);
};

const mailerBridgeEntry = async (filePath: string): Promise<CrmVNextSourceLedgerEntry> => {
  const text = await readText(filePath);
  if (!text) {
    return missingEntry('mailer_ig_bridge', 'MailerLite to Instagram bridge', 'mailerlite_bridge', 'Bridge CSV is unavailable.');
  }

  const rows = csvRowCount(text);
  return {
    id: 'mailer_ig_bridge',
    title: 'MailerLite to Instagram bridge',
    kind: 'mailerlite_bridge',
    mode: 'local_artifact',
    generatedAt: null,
    freshness: rows > 0 ? 'watch' : 'missing',
    trust: rows > 0 ? 'medium' : 'low',
    recordCount: rows,
    metrics: { mappings: rows },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction: rows < 20 ? 'Treat as a small curated bridge; grow carefully through reviewed matching.' : null,
    note: 'Manual/curated identity bridge used to stitch email and Instagram identities.',
  };
};

const skippedMailerRowsEntry = async (filePath: string): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('skipped_mailer_rows', 'Skipped MailerLite rows', 'mailerlite_snapshot', 'Skipped-row artifact is unavailable.');
  }
  const rows = Array.isArray(payload.rows) ? payload.rows.length : 0;
  const generatedAt = cleanString(payload.generatedAt);
  return {
    id: 'skipped_mailer_rows',
    title: 'Skipped MailerLite rows',
    kind: 'mailerlite_snapshot',
    mode: 'local_artifact',
    generatedAt,
    freshness: rows > 0 ? 'watch' : 'fresh',
    trust: 'medium',
    recordCount: rows,
    metrics: { rows },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction: rows > 0 ? 'Inspect skipped rows when reconciling MailerLite coverage.' : null,
    note: 'Rows that could not become person cards because identity was insufficient.',
  };
};

const igUiEntry = async (filePath: string, now: string): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('ig_ui_signals', 'Instagram UI signals', 'instagram_ui_snapshot', 'UI signal state is unavailable.');
  }
  const generatedAt = cleanString(payload.generatedAt ?? payload.updatedAt ?? payload.lastRunAt ?? payload.collectedAt);
  const parsedCounts = (payload.parsedCounts && typeof payload.parsedCounts === 'object' ? payload.parsedCounts : {}) as JsonObject;
  const notificationRows = (
    parsedCounts.notificationRows && typeof parsedCounts.notificationRows === 'object'
      ? parsedCounts.notificationRows
      : {}
  ) as JsonObject;
  const estimatedActors = (
    parsedCounts.estimatedActors && typeof parsedCounts.estimatedActors === 'object'
      ? parsedCounts.estimatedActors
      : {}
  ) as JsonObject;
  return {
    id: 'ig_ui_signals',
    title: 'Instagram UI signals',
    kind: 'instagram_ui_snapshot',
    mode: 'local_artifact',
    generatedAt,
    freshness: freshnessFromAge(generatedAt, now, { freshDays: 1, watchDays: 7 }),
    trust: 'medium',
    recordCount: null,
    metrics: {
      likedYourReelNotifications: cleanNumber(notificationRows.likedYourReel),
      likedYourStoryNotifications: cleanNumber(notificationRows.likedYourStory),
      startedFollowingNotifications: cleanNumber(notificationRows.startedFollowing),
      mentionedYouNotifications: cleanNumber(notificationRows.mentionedYou),
      taggedYouNotifications: cleanNumber(notificationRows.taggedYou),
      estimatedReelLikeActors: cleanNumber(estimatedActors.likedYourReel),
      parserConfidence: typeof payload.parserConfidence === 'number' ? payload.parserConfidence : null,
    },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction: null,
    note: 'Lightweight local signal source for likes, follows, mentions, and tags. It is not a full DM reader.',
  };
};

const igApiEntry = async (filePath: string): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('ig_api_inbox', 'Instagram API inbox', 'instagram_api_snapshot', 'API inbox snapshot is unavailable.');
  }
  const status = cleanString(payload.status);
  const health = cleanString(payload.health);
  const generatedAt = cleanString(payload.generatedAt ?? payload.updatedAt ?? payload.checkedAt);
  const blocked = status === 'blocked' || health === 'red';
  return {
    id: 'ig_api_inbox',
    title: 'Instagram API inbox',
    kind: 'instagram_api_snapshot',
    mode: blocked ? 'external_blocked' : 'local_artifact',
    generatedAt,
    freshness: blocked ? 'blocked' : 'watch',
    trust: blocked ? 'blocked' : 'medium',
    recordCount: cleanNumber(payload.conversation_count ?? payload.conversationCount),
    metrics: {
      status,
      health,
      readyRead: Boolean(payload.ready_read ?? payload.readyRead),
      readySend: Boolean(payload.ready_send ?? payload.readySend),
    },
    canAutoIngest: !blocked,
    canMutateRecords: false,
    operatorAction: blocked ? 'Keep IG API ingestion out of production until read access is repaired.' : null,
    note: 'Current IG API read surface. Sending remains prohibited by CRM vNext guardrails.',
  };
};

const igWebProbeEntry = async (filePath: string, now: string): Promise<CrmVNextSourceLedgerEntry> => {
  const payload = await readJson(filePath);
  if (!payload) {
    return missingEntry('ig_web_probe', 'Instagram web probe', 'instagram_web_probe', 'Web probe state is unavailable.');
  }
  const generatedAt = cleanString(payload.generatedAt ?? payload.updatedAt ?? payload.lastRunAt);
  return {
    id: 'ig_web_probe',
    title: 'Instagram web probe',
    kind: 'instagram_web_probe',
    mode: 'local_artifact',
    generatedAt,
    freshness: freshnessFromAge(generatedAt, now, { freshDays: 1, watchDays: 7 }),
    trust: 'low',
    recordCount: null,
    metrics: {
      status: cleanString(payload.status),
      health: cleanString(payload.health),
    },
    canAutoIngest: false,
    canMutateRecords: false,
    operatorAction: 'Do not rely on this probe until the legacy CLI drift is repaired.',
    note: 'Fallback probe is useful only after repair and fresh validation.',
  };
};

const factIntakeProtocolEntry = (): CrmVNextSourceLedgerEntry => ({
  id: 'fact_intake_protocol',
  title: 'Conversational fact intake',
  kind: 'fact_intake_protocol',
  mode: 'local_protocol',
  generatedAt: null,
  freshness: 'fresh',
  trust: 'medium',
  recordCount: null,
  metrics: {
    supportsTelegramReports: true,
    supportsAlejandroConversation: true,
    supportsMailerLiteTagMapping: true,
  },
  canAutoIngest: true,
  canMutateRecords: false,
  operatorAction: 'Use dry-run drafts first; persist facts only after a reviewed write path exists.',
  note: 'Protocol for turning human or system observations into auditable CRM facts.',
});

const factStoreEntry = async (filePath: string, now: string): Promise<CrmVNextSourceLedgerEntry> => {
  const store = await readCrmFactStore(filePath, { now, limit: 0 });
  const latestStoredAt = store.summary.latestStoredAt;
  return {
    id: 'fact_store',
    title: 'CRM fact store',
    kind: 'fact_store',
    mode: 'local_artifact',
    generatedAt: latestStoredAt,
    freshness: store.summary.facts > 0
      ? freshnessFromAge(latestStoredAt, now, { freshDays: 14, watchDays: 60 })
      : 'watch',
    trust: store.summary.facts > 0 ? 'medium' : 'unknown',
    recordCount: store.summary.facts,
    metrics: {
      readyForCardApply: store.summary.readyForCardApply,
      needsReview: store.summary.needsReview,
      stableIdentity: store.summary.stableIdentity,
      missingStableIdentity: store.summary.missingStableIdentity,
      invalidRows: store.invalidRows,
    },
    canAutoIngest: true,
    canMutateRecords: false,
    operatorAction: store.summary.facts > 0
      ? 'Use stored facts as evidence for a future reviewed card rebuild.'
      : 'Store approved fact-intake drafts here before building card mutation workflows.',
    note: 'Local append-only ledger for approved CRM facts. It does not mutate person cards.',
  };
};

const ledgerStatus = (sources: CrmVNextSourceLedgerEntry[]): CrmVNextSourceLedger['status'] => {
  if (sources.some((source) => source.freshness === 'blocked')) return 'watch';
  if (sources.some((source) => source.freshness === 'missing')) return 'watch';
  if (sources.some((source) => source.freshness === 'stale' || source.freshness === 'watch')) return 'watch';
  return 'ready';
};

const buildGaps = (
  sources: CrmVNextSourceLedgerEntry[],
): CrmVNextSourceLedger['gaps'] => {
  const gaps: CrmVNextSourceLedger['gaps'] = [];
  for (const source of sources) {
    if (source.id === 'mailerlite_engagement_snapshot') {
      const missingFromExpected = cleanNumber(source.metrics.missingFromExpected);
      if (missingFromExpected > 0) {
        gaps.push({
          id: 'mailerlite_expected_coverage_gap',
          level: 'watch',
          title: 'MailerLite coverage gap',
          detail: `${missingFromExpected} expected MailerLite contacts are not represented in the local snapshot.`,
          operatorAction: 'Run a read-only MailerLite reconciliation before treating CRM coverage as complete.',
        });
      }
      if (source.freshness === 'stale') {
        gaps.push({
          id: 'mailerlite_snapshot_stale',
          level: 'watch',
          title: 'MailerLite snapshot is stale',
          detail: 'The local MailerLite snapshot is too old to answer current coverage questions.',
          operatorAction: 'Refresh through a credential-safe read-only path.',
        });
      }
    }
    if (source.id === 'ig_api_inbox' && source.freshness === 'blocked') {
      gaps.push({
        id: 'instagram_api_read_blocked',
        level: 'blocked',
        title: 'Instagram API read path blocked',
        detail: 'The IG API inbox source cannot currently provide reliable conversation reads.',
        operatorAction: 'Keep IG ingestion in feasibility/dry-run until permissions or API errors are resolved.',
      });
    }
    if (source.id === 'ig_web_probe' && (source.freshness === 'stale' || source.freshness === 'missing')) {
      gaps.push({
        id: 'instagram_web_probe_unreliable',
        level: 'watch',
        title: 'Instagram web probe unreliable',
        detail: 'The fallback web probe is not a dependable source right now.',
        operatorAction: 'Repair and revalidate before using it as an ingestion source.',
      });
    }
  }
  return gaps;
};

const safety = (): CrmVNextSourceLedger['safety'] => ({
  outboundProhibited: true,
  credentialReadProhibited: true,
  recordMutationProhibited: true,
  localPathsRedacted: true,
  allowedUse: [
    'Inspect which CRM sources are usable.',
    'Plan read-only reconciliation work.',
    'Decide which source deserves the next ingestion sprint.',
  ],
  prohibitedActions: [
    'Do not read, print, rotate, or modify credentials.',
    'Do not call MailerLite, Instagram, Telegram, WhatsApp, ManyChat, or email from this ledger.',
    'Do not mutate person cards from source-ledger output.',
    'Do not send any outbound message.',
  ],
});

export const buildCrmVNextSourceLedger = async (
  options: CrmVNextSourceLedgerOptions = {},
): Promise<CrmVNextSourceLedger> => {
  const generatedAt = isoNow(options.now);
  const paths = {
    ...DEFAULT_CRM_VNEXT_SOURCE_LEDGER_PATHS,
    ...options.paths,
  };

  const sources = await Promise.all([
    personCardsEntry(paths.personCards, generatedAt),
    mailerSnapshotEntry(paths.mailerSnapshot, generatedAt, options.expectedMailerLiteContacts ?? null),
    mailerBridgeEntry(paths.mailerBridge),
    skippedMailerRowsEntry(paths.skippedMailerRows),
    igUiEntry(paths.igUiSignals, generatedAt),
    igApiEntry(paths.igApiInbox),
    igWebProbeEntry(paths.igWebProbe, generatedAt),
    factStoreEntry(paths.factStore, generatedAt),
  ]);
  sources.push(factIntakeProtocolEntry());

  return {
    schemaVersion: CRM_VNEXT_SOURCE_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_source_ledger',
    status: ledgerStatus(sources),
    sources,
    gaps: buildGaps(sources),
    safety: safety(),
  };
};
