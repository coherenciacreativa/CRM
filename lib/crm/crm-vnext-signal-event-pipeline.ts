import { basename } from 'node:path';
import { appendCrmEngagementSnapshotLedger } from './crm-vnext-engagement-snapshot-ledger.js';
import { buildCrmVNextGmailReplyEngagementSignals } from './crm-vnext-gmail-reply-engagement-signals.js';
import { buildCrmVNextMailerLiteEngagementSignals } from './crm-vnext-mailerlite-engagement-signals.js';
import {
  appendCrmSignalEventLedger,
  buildCrmSignalEventLedgerInput,
} from './crm-vnext-signal-event-ledger.js';
import {
  buildCrmSignalEventProjection,
  buildCrmSignalEventProjectionFromLedger,
} from './crm-vnext-signal-event-projection.js';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from './community-insights-source';
import {
  buildCrmVNextEngagementSignalPreview,
  type CrmEngagementSignalInput,
  type CrmEngagementSignalPreviewReport,
} from './crm-vnext-engagement-signal-preview';

export const CRM_VNEXT_SIGNAL_EVENT_PIPELINE_SCHEMA_VERSION =
  'crm-vnext-signal-event-pipeline-2026-05-21' as const;

export type CrmVNextSignalEventPipelineSourceKind =
  | 'mailerlite_snapshot'
  | 'gmail_reply_discovery'
  | 'engagement_signals'
  | 'signal_events';

export type CrmVNextSignalEventPipelineSource = {
  kind: CrmVNextSignalEventPipelineSourceKind;
  payload: unknown;
  path?: string | null;
  label?: string | null;
};

export type CrmVNextSignalEventPipelineInput = {
  sources?: CrmVNextSignalEventPipelineSource[] | null;
  now?: string | Date | null;
  windowDays?: number | null;
  sourceLabel?: string | null;
  collector?: string | null;
  approvedBy?: string | null;
  writeEvents?: boolean | null;
  writeSnapshot?: boolean | null;
  projectFromLedger?: boolean | null;
  includeRestricted?: boolean | null;
  ledgerPath?: string | null;
  snapshotLedgerPath?: string | null;
  cardStorePath?: string | null;
  legacyPath?: string | null;
  preferStore?: boolean | null;
};

export type CrmVNextSignalEventPipelineReport = {
  schemaVersion: typeof CRM_VNEXT_SIGNAL_EVENT_PIPELINE_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_signal_event_pipeline' | 'local_signal_event_pipeline_write';
  source: {
    personCards: PublicPersonCardsVNextSource;
    projectFromLedger: boolean;
    includeRestricted: boolean;
  };
  summary: {
    sourcesRead: number;
    sourceSignals: number;
    sourceEvents: number;
    normalizedEvents: number;
    skippedSourceRecords: number;
    eventsCommitted: boolean;
    eventsAdded: number;
    duplicateEventsSkipped: number;
    projectedSignals: number;
    skippedProjectedEvents: number;
    cardsPreviewed: number;
    warmedCards: number;
    unmatchedSignals: number;
    snapshotCommitted: boolean;
    snapshotsAdded: number;
    duplicateSnapshotsSkipped: number;
    operationsExecuted: 0;
    cardMutationReady: false;
  };
  sourceReports: Array<{
    kind: CrmVNextSignalEventPipelineSourceKind;
    label: string | null;
    pathLabel: string | null;
    signalsGenerated: number;
    eventsProvided: number;
    skippedRecords: number;
    adapterMode: string;
  }>;
  signalEventLedger: {
    committed: boolean;
    incoming: number;
    normalized: number;
    added: number;
    duplicatesSkipped: number;
    skippedRecords: unknown[];
    summaryAfter: unknown | null;
  };
  projection: {
    summary: unknown;
    skippedEvents: unknown[];
  };
  engagementPreview: CrmEngagementSignalPreviewReport;
  engagementSnapshotLedger: {
    committed: boolean;
    added: number;
    duplicatesSkipped: number;
    summaryAfter: unknown | null;
  } | null;
  safety: {
    localOnly: true;
    readOnlyByDefault: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    externalMutationProhibited: true;
    scoreMutationProhibited: true;
    allowedLocalWrites: string[];
    prohibitedActions: string[];
  };
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

const sourceLabelFor = (
  source: CrmVNextSignalEventPipelineSource,
  fallback: string | null,
): string | null =>
  cleanString(source.label)
  ?? (source.path ? basename(source.path) : null)
  ?? fallback;

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const extractSignals = (payload: unknown): CrmEngagementSignalInput[] => {
  if (Array.isArray(payload)) return payload as CrmEngagementSignalInput[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { signals?: unknown }).signals)) {
    return (payload as { signals: CrmEngagementSignalInput[] }).signals;
  }
  return [];
};

const extractEvents = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { events?: unknown }).events)) {
    return (payload as { events: unknown[] }).events;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { signalEvents?: unknown }).signalEvents)) {
    return (payload as { signalEvents: unknown[] }).signalEvents;
  }
  return [];
};

const sourceAdapter = (
  source: CrmVNextSignalEventPipelineSource,
  options: { now: string; windowDays: number; sourceLabel: string | null },
) => {
  if (source.kind === 'mailerlite_snapshot') {
    const report = buildCrmVNextMailerLiteEngagementSignals({
      snapshot: source.payload,
      now: options.now,
      windowDays: options.windowDays,
    });
    return {
      signals: report.signals as CrmEngagementSignalInput[],
      events: [],
      skippedRecords: report.skippedRecords ?? [],
      adapterMode: report.mode,
    };
  }

  if (source.kind === 'gmail_reply_discovery') {
    const report = buildCrmVNextGmailReplyEngagementSignals({
      snapshot: source.payload,
      now: options.now,
      windowDays: options.windowDays,
    });
    return {
      signals: report.signals as CrmEngagementSignalInput[],
      events: [],
      skippedRecords: report.skippedRecords ?? [],
      adapterMode: report.mode,
    };
  }

  if (source.kind === 'engagement_signals') {
    return {
      signals: extractSignals(source.payload),
      events: [],
      skippedRecords: [],
      adapterMode: 'supplied_engagement_signals',
    };
  }

  return {
    signals: [],
    events: extractEvents(source.payload),
    skippedRecords: [],
    adapterMode: 'supplied_signal_events',
  };
};

const safety = (): CrmVNextSignalEventPipelineReport['safety'] => ({
  localOnly: true,
  readOnlyByDefault: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  externalMutationProhibited: true,
  scoreMutationProhibited: true,
  allowedLocalWrites: [
    'Append normalized signal events to .crm-vnext/signal-events/ledger.jsonl when --write-events and approvedBy are provided.',
    'Append read-only engagement preview history to .crm-vnext/engagement-snapshots/ledger.jsonl when --write-snapshot and approvedBy are provided.',
    'Write a compact local report when the CLI --out flag is used.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from this pipeline.',
    'Do not write Fact Store from this pipeline.',
    'Do not send email, Instagram DM, WhatsApp, Telegram, ManyChat, or any outbound message.',
    'Do not call live MailerLite, Gmail, Instagram, Shopify, WhatsApp, Google, or payment APIs.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not treat a warmed score as permission to contact someone.',
  ],
});

export const buildCrmVNextSignalEventPipeline = async (
  input: CrmVNextSignalEventPipelineInput = {},
): Promise<CrmVNextSignalEventPipelineReport> => {
  const generatedAt = isoNow(input.now);
  const sources = asArray(input.sources).filter(
    (source): source is CrmVNextSignalEventPipelineSource =>
      Boolean(source && typeof source === 'object' && (source as { kind?: unknown }).kind),
  );
  const windowDays = Number.isFinite(Number(input.windowDays)) && Number(input.windowDays) > 0
    ? Number(input.windowDays)
    : 30;
  const sourceLabel = cleanString(input.sourceLabel) ?? 'CRM vNext signal event pipeline';
  const collector = cleanString(input.collector) ?? null;
  const approvedBy = cleanString(input.approvedBy);
  const writeEvents = input.writeEvents === true;
  const writeSnapshot = input.writeSnapshot === true;

  if ((writeEvents || writeSnapshot) && !approvedBy) {
    throw new Error('signal_event_pipeline_approved_by_required_for_writes');
  }

  const sourceReports: CrmVNextSignalEventPipelineReport['sourceReports'] = [];
  const allSignals: CrmEngagementSignalInput[] = [];
  const allEvents: unknown[] = [];

  for (const source of sources) {
    const adapted = sourceAdapter(source, {
      now: generatedAt,
      windowDays,
      sourceLabel,
    });
    allSignals.push(...adapted.signals);
    allEvents.push(...adapted.events);
    sourceReports.push({
      kind: source.kind,
      label: sourceLabelFor(source, sourceLabel),
      pathLabel: source.path ? basename(source.path) : null,
      signalsGenerated: adapted.signals.length,
      eventsProvided: adapted.events.length,
      skippedRecords: adapted.skippedRecords.length,
      adapterMode: adapted.adapterMode,
    });
  }

  const eventPayload = [...allSignals, ...allEvents];
  const normalized = buildCrmSignalEventLedgerInput(eventPayload, {
    now: generatedAt,
    sourceLabel,
    collector,
  });
  const ledgerResult = await appendCrmSignalEventLedger({
    payload: eventPayload,
    approvedBy,
    commit: writeEvents,
    ledgerPath: input.ledgerPath,
    sourceLabel,
    collector,
    now: generatedAt,
  });

  const projection = input.projectFromLedger === true
    ? await buildCrmSignalEventProjectionFromLedger({
      ledgerPath: input.ledgerPath,
      includeRestricted: input.includeRestricted === true,
      now: generatedAt,
    })
    : buildCrmSignalEventProjection({
      events: normalized.events,
      includeRestricted: input.includeRestricted === true,
      now: generatedAt,
    });

  const cards = await loadPersonCardsVNext({
    cardStorePath: input.cardStorePath,
    legacyPath: input.legacyPath,
    preferStore: input.preferStore,
    now: generatedAt,
  });
  const preview = buildCrmVNextEngagementSignalPreview({
    cards: cards.cards,
    signals: projection.signals,
    now: generatedAt,
  });

  const snapshotResult = writeSnapshot || preview.summary.signalsRead > 0
    ? await appendCrmEngagementSnapshotLedger({
      preview,
      approvedBy,
      commit: writeSnapshot,
      ledgerPath: input.snapshotLedgerPath,
      sourceKind: 'signal_event_pipeline',
      sourceLabel,
      now: generatedAt,
    })
    : null;

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_EVENT_PIPELINE_SCHEMA_VERSION,
    generatedAt,
    mode: writeEvents || writeSnapshot
      ? 'local_signal_event_pipeline_write'
      : 'read_only_signal_event_pipeline',
    source: {
      personCards: publicPersonCardsVNextSource(cards.source),
      projectFromLedger: input.projectFromLedger === true,
      includeRestricted: input.includeRestricted === true,
    },
    summary: {
      sourcesRead: sources.length,
      sourceSignals: allSignals.length,
      sourceEvents: allEvents.length,
      normalizedEvents: normalized.summary.eventsGenerated,
      skippedSourceRecords: sourceReports.reduce((sum, report) => sum + report.skippedRecords, 0)
        + normalized.summary.skippedRecords,
      eventsCommitted: ledgerResult.committed,
      eventsAdded: ledgerResult.added.length,
      duplicateEventsSkipped: ledgerResult.duplicatesSkipped.length,
      projectedSignals: projection.summary.signalsGenerated,
      skippedProjectedEvents: projection.summary.skippedEvents,
      cardsPreviewed: preview.summary.cardsPreviewed,
      warmedCards: preview.summary.warmedCards,
      unmatchedSignals: preview.summary.unmatchedSignals,
      snapshotCommitted: snapshotResult?.committed ?? false,
      snapshotsAdded: snapshotResult?.added.length ?? 0,
      duplicateSnapshotsSkipped: snapshotResult?.duplicatesSkipped.length ?? 0,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    sourceReports,
    signalEventLedger: {
      committed: ledgerResult.committed,
      incoming: ledgerResult.incoming,
      normalized: ledgerResult.normalized,
      added: ledgerResult.added.length,
      duplicatesSkipped: ledgerResult.duplicatesSkipped.length,
      skippedRecords: ledgerResult.skippedRecords,
      summaryAfter: ledgerResult.summaryAfter ?? null,
    },
    projection: {
      summary: projection.summary,
      skippedEvents: projection.skippedEvents,
    },
    engagementPreview: preview,
    engagementSnapshotLedger: snapshotResult
      ? {
        committed: snapshotResult.committed,
        added: snapshotResult.added.length,
        duplicatesSkipped: snapshotResult.duplicatesSkipped.length,
        summaryAfter: snapshotResult.summaryAfter ?? null,
      }
      : null,
    safety: safety(),
  };
};
