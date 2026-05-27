import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

export const CRM_VNEXT_SIGNAL_EVENT_LEDGER_SCHEMA_VERSION =
  'crm-vnext-signal-event-ledger-2026-05-21';
export const CRM_VNEXT_STORED_SIGNAL_EVENT_SCHEMA_VERSION =
  'crm-vnext-stored-signal-event-2026-05-21';

export const DEFAULT_CRM_VNEXT_SIGNAL_EVENT_LEDGER_PATH = join(
  process.cwd(),
  '.crm-vnext',
  'signal-events',
  'ledger.jsonl',
);

const EVENT_KINDS = [
  'email_engagement_snapshot',
  'email_sent',
  'email_open',
  'email_click',
  'email_reply',
  'email_suppression',
  'email_submitted',
  'instagram_engagement_snapshot',
  'instagram_dm',
  'instagram_comment',
  'instagram_like',
  'instagram_story_view',
  'instagram_follow',
  'mini_launch_intake_created',
  'brand_brief_approved',
  'landing_preview_ready',
  'source_assigned',
  'resource_delivered',
  'content_sent',
  'quiz_started',
  'quiz_or_game_completed',
  'market_signal_reviewed',
  'continue_or_archive_decision',
  'onboarding_handoff_recommended',
  'onboarding_eligibility_assigned',
  'onboarding_started',
  'onboarding_completed',
  'audience_eligibility_assigned',
  'class_attendance',
  'recording_delivery',
  'community_event_attendance',
  'retreat_attendance',
  'purchase',
  'human_report',
  'identity_observation',
  'manual_observation',
  'unknown',
];

const CHANNELS = [
  'email',
  'instagram',
  'whatsapp',
  'telegram',
  'classbot',
  'google_workspace',
  'web',
  'shopify',
  'quiz',
  'crm',
  'commerce',
  'mailerlite',
  'manual',
  'unknown',
];

const DIRECTIONS = ['inbound', 'outbound', 'internal', 'unknown'];
const STRENGTHS = ['strong', 'medium', 'weak', 'review_only', 'unknown'];

const EVENT_KIND_SET = new Set(EVENT_KINDS);
const CHANNEL_SET = new Set(CHANNELS);
const DIRECTION_SET = new Set(DIRECTIONS);
const STRENGTH_SET = new Set(STRENGTHS);

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const cleanPublicText = (value) =>
  String(value ?? '')
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicText(value);
  return cleaned || null;
};

const cleanSourceId = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes('/Users/') || raw.includes('.openclaw')) {
    return `[local-path]:${hashId([raw])}`;
  }
  return cleanString(raw);
};

const cleanNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const cleanArray = (value) => {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  const raw = cleanString(value);
  if (!raw) return [];
  return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const cleanEnum = (value, allowed, fallback) => {
  const raw = cleanString(value)?.toLowerCase() ?? null;
  return raw && allowed.has(raw) ? raw : fallback;
};

const cleanEmail = (value) => {
  const raw = cleanString(value)?.toLowerCase() ?? null;
  if (!raw) return null;
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  return match && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match) ? match.toLowerCase() : null;
};

const cleanHandle = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  const instagramUrl = raw.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i)?.[1];
  const handle = (instagramUrl ?? raw)
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+$/g, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle)) return null;
  if (/^\d+$/.test(handle)) return null;
  return handle;
};

const cleanPhone = (value) => {
  const cleaned = cleanString(value)?.replace(/\D/g, '') ?? null;
  return cleaned && cleaned.length >= 7 ? cleaned : null;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const getPath = (record, key) => {
  if (!record || typeof record !== 'object') return null;
  if (!key.includes('.')) return record[key] ?? null;
  let cursor = record;
  for (const part of key.split('.')) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return cursor ?? null;
};

const pick = (record, keys) => {
  for (const key of keys) {
    const value = getPath(record, key);
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const cleanObject = (value) => {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, typeof item === 'string' ? cleanPublicText(item) : cleanObject(item)])
      .filter(([, item]) => item !== null && item !== undefined && item !== ''),
  );
};

const compactMetrics = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || item === undefined || item === '') continue;
    if (typeof item === 'number' && Number.isFinite(item)) {
      result[key] = item;
      continue;
    }
    if (typeof item === 'boolean') {
      result[key] = item;
      continue;
    }
    if (typeof item === 'string') {
      const cleaned = cleanString(item);
      if (cleaned) result[key] = cleaned;
      continue;
    }
    if (typeof item === 'object') {
      const nested = compactMetrics(item);
      if (Object.keys(nested).length) result[key] = nested;
    }
  }
  return result;
};

const metricsFromSignal = (record) => {
  const direct = compactMetrics(pick(record, ['metrics', 'event.metrics']));
  const emailActivity = compactMetrics(pick(record, ['emailActivity', 'email_activity', 'event.emailActivity']));
  const instagramActivity = compactMetrics(pick(record, ['instagramActivity', 'instagram_activity', 'event.instagramActivity']));

  const scalarMetrics = {};
  const dateMetricKeys = new Set([
    'lastOpenAt',
    'lastClickAt',
    'lastReplyAt',
    'subscribedAt',
    'lastInteractionAt',
  ]);
  for (const key of [
    'opens30d',
    'clicks30d',
    'replies30d',
    'opens90d',
    'clicks90d',
    'lifetimeOpens',
    'lifetimeClicks',
    'lifetimeSent',
    'openRate',
    'clickRate',
    'lastOpenAt',
    'lastClickAt',
    'lastReplyAt',
    'subscribedAt',
    'subscriberStatus',
    'inboundDm30d',
    'comments30d',
    'likes30d',
    'storyViews30d',
    'follows',
    'lastInteractionAt',
    'quantity',
  ]) {
    const value = pick(record, [key, `event.${key}`]);
    if (value === null || value === undefined || value === '') continue;
    if (dateMetricKeys.has(key)) {
      scalarMetrics[key] = cleanString(value) ?? value;
      continue;
    }
    const numeric = cleanNumber(value);
    scalarMetrics[key] = numeric ?? cleanString(value) ?? value;
  }

  return {
    ...direct,
    ...emailActivity,
    ...instagramActivity,
    ...scalarMetrics,
  };
};

const containersFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of [
    'events',
    'signalEvents',
    'signal_events',
    'signals',
    'records',
    'rows',
    'items',
    'data',
  ]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ['payload', 'report', 'snapshot']) {
    const nested = containersFrom(payload[key]);
    if (nested.length) return nested;
  }
  return [];
};

const sourceKindFor = (record) =>
  cleanString(pick(record, ['source.kind', 'sourceKind', 'source_kind']))?.toLowerCase() ?? 'unknown';

const sourceIdFor = (record, sourceKind, identityKey, observedAt, eventKind, metrics) =>
  cleanSourceId(pick(record, ['source.sourceId', 'source.id', 'sourceId', 'source_id']))
  ?? `${sourceKind}:${hashId([identityKey, observedAt, eventKind, JSON.stringify(metrics)])}`;

const inferEventKind = (record, metrics, sourceKind) => {
  const explicit = cleanEnum(pick(record, ['event.kind', 'eventKind', 'event_kind', 'kind']), EVENT_KIND_SET, null);
  if (explicit) return explicit;
  if (sourceKind === 'gmail_reply_activity' || Number(metrics.replies30d) > 0 || metrics.lastReplyAt) return 'email_reply';
  if (sourceKind.startsWith('mailerlite') || metrics.opens30d || metrics.clicks30d || metrics.lifetimeOpens) {
    return 'email_engagement_snapshot';
  }
  if (sourceKind === 'instagram_activity' || metrics.inboundDm30d || metrics.comments30d || metrics.likes30d || metrics.storyViews30d) {
    return 'instagram_engagement_snapshot';
  }
  if (sourceKind.includes('classbot')) return 'recording_delivery';
  if (sourceKind.includes('telegram') || sourceKind.includes('alejandro') || sourceKind.includes('manual')) return 'manual_observation';
  return 'unknown';
};

const inferChannel = (record, eventKind, sourceKind) => {
  const explicit = cleanEnum(pick(record, ['event.channel', 'channel']), CHANNEL_SET, null);
  if (explicit) return explicit;
  if (eventKind.startsWith('email_') || sourceKind.includes('gmail')) return 'email';
  if (eventKind.startsWith('instagram_') || sourceKind.includes('instagram')) return 'instagram';
  if (eventKind === 'class_attendance' || eventKind === 'recording_delivery' || sourceKind.includes('classbot')) return 'classbot';
  if (sourceKind.includes('mailerlite')) return 'mailerlite';
  if (sourceKind.includes('telegram')) return 'telegram';
  if (sourceKind.includes('google')) return 'google_workspace';
  if (sourceKind.includes('manual') || sourceKind.includes('alejandro')) return 'manual';
  return 'unknown';
};

const inferDirection = (record, eventKind) => {
  const explicit = cleanEnum(pick(record, ['event.direction', 'direction']), DIRECTION_SET, null);
  if (explicit) return explicit;
  if (eventKind === 'email_sent') return 'outbound';
  if (eventKind === 'human_report' || eventKind === 'manual_observation' || eventKind === 'identity_observation') return 'internal';
  if (eventKind === 'unknown') return 'unknown';
  return 'inbound';
};

const subjectFor = (record) => {
  const personId = cleanString(pick(record, ['subject.personId', 'personId', 'person_id']));
  const email = cleanEmail(pick(record, ['subject.email', 'email']));
  const instagramHandle = cleanHandle(pick(record, [
    'subject.instagramHandle',
    'instagramHandle',
    'instagram_handle',
    'handle',
  ]));
  const phone = cleanPhone(pick(record, ['subject.phone', 'phone']));
  return {
    personId,
    email,
    instagramHandle,
    phone,
  };
};

const subjectIdentityKey = (subject) =>
  subject.personId
  || (subject.email ? `email:${subject.email}` : null)
  || (subject.instagramHandle ? `ig:${subject.instagramHandle}` : null)
  || (subject.phone ? `phone:${subject.phone}` : null);

const safety = () => ({
  localOnly: true,
  appendOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  scoreMutationProhibited: true,
  allowedUse: [
    'Persist normalized source events and engagement observations as local CRM history.',
    'Feed future scoring projections and dashboards through reviewed adapters.',
    'Give Mantis one canonical place to place read-only source observations before card mutation.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from this ledger.',
    'Do not write Fact Store from this ledger.',
    'Do not change heat scores directly from this ledger.',
    'Do not send email, Instagram, WhatsApp, Telegram, or ManyChat messages.',
    'Do not call live APIs or read credentials.',
    'Do not treat an event as permission to contact someone.',
  ],
});

export const normalizeCrmSignalEvent = (record, options = {}) => {
  const generatedAt = isoNow(options.now);
  const observedAt = isoNow(pick(record, [
    'observedAt',
    'observed_at',
    'event.observedAt',
    'timestamp',
    'createdAt',
    'created_at',
  ]) ?? options.observedAt ?? generatedAt);
  const capturedAt = isoNow(pick(record, ['capturedAt', 'captured_at']) ?? generatedAt);
  const sourceKind = sourceKindFor(record);
  const subject = subjectFor(record);
  const identityKey = subjectIdentityKey(subject);
  const metrics = metricsFromSignal(record);
  const eventKind = inferEventKind(record, metrics, sourceKind);
  const channel = inferChannel(record, eventKind, sourceKind);
  const direction = inferDirection(record, eventKind);
  const sourceId = sourceIdFor(record, sourceKind, identityKey, observedAt, eventKind, metrics);
  const eventId =
    cleanString(pick(record, ['eventId', 'event_id']))
    || `signal_event_${hashId([sourceKind, sourceId, identityKey, observedAt, eventKind])}`;
  const quantity = cleanNumber(pick(record, ['event.quantity', 'quantity'])) ?? 1;
  const tags = Array.from(new Set([
    ...cleanArray(pick(record, ['event.tags', 'tags'])),
    ...cleanArray(pick(record, ['source.tags', 'sourceTags', 'source_tags'])),
  ]));
  const restricted = Boolean(pick(record, ['sensitivity.restricted', 'restricted']) === true);
  const reasonCodes = cleanArray(pick(record, ['sensitivity.reasonCodes', 'reasonCodes', 'reason_codes']));

  if (!identityKey) {
    return {
      event: null,
      skipped: {
        reason: 'missing_identity_anchor',
        sourceKind,
        sourceId,
        eventKind,
        observedAt,
      },
    };
  }

  return {
    event: {
      schemaVersion: CRM_VNEXT_STORED_SIGNAL_EVENT_SCHEMA_VERSION,
      eventId,
      batchId: cleanString(options.batchId)
        || `signal_event_batch_${generatedAt.replace(/[^0-9]/g, '').slice(0, 14)}`,
      capturedAt,
      observedAt,
      source: {
        kind: sourceKind,
        sourceId,
        label: cleanString(pick(record, ['source.label', 'sourceLabel', 'source_label'])) || cleanString(options.sourceLabel),
        collector: cleanString(pick(record, ['source.collector', 'collector'])) || cleanString(options.collector),
      },
      subject,
      event: {
        kind: eventKind,
        channel,
        direction,
        strength: cleanEnum(pick(record, ['event.strength', 'strength', 'confidence']), STRENGTH_SET, 'unknown'),
        quantity,
        metrics,
        tags,
      },
      evidence: {
        summary: cleanString(pick(record, ['evidence.summary', 'summary', 'note', 'safeNextStep'])),
        sourceIds: cleanArray(pick(record, ['evidence.sourceIds', 'sourceIds', 'source_ids'])).slice(0, 24),
        rawBodyExported: false,
      },
      sensitivity: {
        restricted,
        reasonCodes,
      },
      safety: {
        cardMutationExecuted: false,
        factStoreWriteExecuted: false,
        outboundExecuted: false,
        liveApiCallsExecuted: false,
        credentialReadExecuted: false,
        scoreMutationExecuted: false,
      },
    },
    skipped: null,
  };
};

const summarizeEvents = (events) => {
  const byKind = {};
  const byChannel = {};
  const bySourceKind = {};
  let latestObservedAt = null;
  let latestCapturedAt = null;

  for (const event of events) {
    byKind[event.event.kind] = (byKind[event.event.kind] ?? 0) + 1;
    byChannel[event.event.channel] = (byChannel[event.event.channel] ?? 0) + 1;
    bySourceKind[event.source.kind] = (bySourceKind[event.source.kind] ?? 0) + 1;
    if (!latestObservedAt || event.observedAt > latestObservedAt) latestObservedAt = event.observedAt;
    if (!latestCapturedAt || event.capturedAt > latestCapturedAt) latestCapturedAt = event.capturedAt;
  }

  return {
    events: events.length,
    personAnchored: events.filter((event) => Boolean(event.subject.personId)).length,
    emailAnchored: events.filter((event) => Boolean(event.subject.email)).length,
    instagramAnchored: events.filter((event) => Boolean(event.subject.instagramHandle)).length,
    phoneAnchored: events.filter((event) => Boolean(event.subject.phone)).length,
    restrictedEvents: events.filter((event) => event.sensitivity.restricted).length,
    latestObservedAt,
    latestCapturedAt,
    byKind,
    byChannel,
    bySourceKind,
  };
};

export const buildCrmSignalEventLedgerInput = (payload, options = {}) => {
  const generatedAt = isoNow(options.now);
  const records = containersFrom(payload);
  const events = [];
  const skippedRecords = [];

  records.forEach((record, index) => {
    const { event, skipped } = normalizeCrmSignalEvent(record, {
      ...options,
      now: generatedAt,
    });
    if (event) events.push(event);
    if (skipped) skippedRecords.push({ index, ...skipped });
  });

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_EVENT_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_signal_event_normalization',
    summary: {
      recordsRead: records.length,
      eventsGenerated: events.length,
      skippedRecords: skippedRecords.length,
      ...summarizeEvents(events),
    },
    events,
    skippedRecords,
    safety: safety(),
  };
};

const parseJsonl = (text) => {
  const events = [];
  let invalidRows = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.schemaVersion === CRM_VNEXT_STORED_SIGNAL_EVENT_SCHEMA_VERSION && parsed.eventId) {
        events.push(parsed);
      } else {
        invalidRows += 1;
      }
    } catch {
      invalidRows += 1;
    }
  }
  return { events, invalidRows };
};

const resolveLedgerPath = (ledgerPath) =>
  resolve(
    ledgerPath
      || process.env.CRM_VNEXT_SIGNAL_EVENT_LEDGER_PATH
      || DEFAULT_CRM_VNEXT_SIGNAL_EVENT_LEDGER_PATH,
  );

export const readCrmSignalEventLedger = async (
  ledgerPath,
  options = {},
) => {
  const generatedAt = isoNow(options.now);
  const resolvedLedgerPath = resolveLedgerPath(ledgerPath);
  let parsed = { events: [], invalidRows: 0 };
  try {
    parsed = parseJsonl(await readFile(resolvedLedgerPath, 'utf8'));
  } catch {
    parsed = { events: [], invalidRows: 0 };
  }

  const sorted = parsed.events.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const limit = typeof options.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : sorted.length;

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_EVENT_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_signal_event_ledger',
    summary: summarizeEvents(parsed.events),
    events: sorted.slice(0, Math.min(limit, 5000)),
    invalidRows: parsed.invalidRows,
    safety: safety(),
  };
};

export const appendCrmSignalEventLedger = async (input) => {
  const generatedAt = isoNow(input.now);
  const commit = input.commit === true;
  const approvedBy = cleanString(input.approvedBy);
  if (commit && !approvedBy) throw new Error('signal_event_approved_by_required');

  const ledgerPath = resolveLedgerPath(input.ledgerPath);
  const current = await readCrmSignalEventLedger(ledgerPath, { now: generatedAt });
  const existingIds = new Set(current.events.map((event) => event.eventId));
  const built = buildCrmSignalEventLedgerInput(input.payload ?? { events: input.events ?? [] }, {
    now: generatedAt,
    sourceLabel: input.sourceLabel,
    collector: input.collector,
    batchId: input.batchId,
  });
  const added = built.events.filter((event) => !existingIds.has(event.eventId));
  const duplicatesSkipped = built.events.filter((event) => existingIds.has(event.eventId));

  if (commit && added.length) {
    await mkdir(dirname(ledgerPath), { recursive: true });
    await appendFile(ledgerPath, `${added.map((event) => JSON.stringify({
      ...event,
      storedAt: generatedAt,
      storeApprovedBy: approvedBy,
      storeApprovedAt: generatedAt,
    })).join('\n')}\n`, 'utf8');
  }

  const summaryAfter = commit
    ? summarizeEvents([...current.events, ...added])
    : current.summary;

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_EVENT_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: commit ? 'local_signal_event_ledger_append' : 'dry_run_signal_event_ledger_append',
    committed: commit,
    incoming: built.summary.recordsRead,
    normalized: built.summary.eventsGenerated,
    added,
    duplicatesSkipped,
    skippedRecords: built.skippedRecords,
    summaryAfter,
    safety: safety(),
  };
};
