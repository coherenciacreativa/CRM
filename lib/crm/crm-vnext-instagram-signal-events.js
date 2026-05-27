import { createHash } from 'node:crypto';

export const CRM_VNEXT_INSTAGRAM_SIGNAL_EVENTS_SCHEMA_VERSION =
  'crm-vnext-instagram-signal-events-2026-05-21';

const EVENT_KIND_ALIASES = new Map([
  ['dm', 'instagram_dm'],
  ['message', 'instagram_dm'],
  ['direct_message', 'instagram_dm'],
  ['story_reply', 'instagram_dm'],
  ['instagram_story_reply', 'instagram_dm'],
  ['reply_to_story', 'instagram_dm'],
  ['message_reaction', 'instagram_dm'],
  ['dm_reaction', 'instagram_dm'],
  ['reaction', 'instagram_dm'],
  ['instagram_dm', 'instagram_dm'],
  ['comment', 'instagram_comment'],
  ['comments', 'instagram_comment'],
  ['live_comment', 'instagram_comment'],
  ['live_comments', 'instagram_comment'],
  ['mention', 'instagram_comment'],
  ['mentions', 'instagram_comment'],
  ['instagram_mention', 'instagram_comment'],
  ['instagram_comment', 'instagram_comment'],
  ['like', 'instagram_like'],
  ['likes', 'instagram_like'],
  ['instagram_like', 'instagram_like'],
  ['story_view', 'instagram_story_view'],
  ['story_views', 'instagram_story_view'],
  ['instagram_story_view', 'instagram_story_view'],
  ['follow', 'instagram_follow'],
  ['new_follow', 'instagram_follow'],
  ['instagram_follow', 'instagram_follow'],
  ['snapshot', 'instagram_engagement_snapshot'],
  ['engagement_snapshot', 'instagram_engagement_snapshot'],
  ['media_insight', 'instagram_engagement_snapshot'],
  ['media_insights', 'instagram_engagement_snapshot'],
  ['account_insight', 'instagram_engagement_snapshot'],
  ['account_insights', 'instagram_engagement_snapshot'],
  ['story_insight', 'instagram_engagement_snapshot'],
  ['story_insights', 'instagram_engagement_snapshot'],
  ['profile_visit', 'instagram_engagement_snapshot'],
  ['profile_visits', 'instagram_engagement_snapshot'],
  ['save', 'instagram_engagement_snapshot'],
  ['saved', 'instagram_engagement_snapshot'],
  ['share', 'instagram_engagement_snapshot'],
  ['shares', 'instagram_engagement_snapshot'],
  ['instagram_engagement_snapshot', 'instagram_engagement_snapshot'],
]);

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

const cleanNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const cleanBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return true;
    if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  }
  return null;
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
  const raw = cleanString(value)?.replace(/\D/g, '') ?? null;
  return raw && raw.length >= 7 ? raw : null;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of [
    'observations',
    'instagramObservations',
    'instagramSignalObservations',
    'instagramSignals',
    'results',
    'rows',
    'items',
    'data',
  ]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
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

const normalizedRawEventKind = (record) => {
  const raw = cleanString(pick(record, [
    'eventKind',
    'event_kind',
    'kind',
    'activityKind',
    'activity',
    'type',
  ]))?.toLowerCase().replace(/[\s-]+/g, '_') ?? null;
  return raw;
};

const normalizeEventKind = (record) => {
  const raw = normalizedRawEventKind(record);
  return raw ? EVENT_KIND_ALIASES.get(raw) ?? null : null;
};

const sourceKindFor = (record) => {
  const raw = cleanString(pick(record, ['sourceKind', 'source_kind', 'source.kind', 'source']))?.toLowerCase();
  if (!raw) return 'instagram_manual_observation';
  if (raw.includes('api')) return 'instagram_api';
  if (raw.includes('messages') || raw.includes('dm_ui') || raw.includes('ui')) return 'instagram_messages_ui';
  if (raw.includes('manychat')) return 'instagram_manychat_export';
  if (raw.includes('lead') || raw.includes('proxy') || raw.includes('vercel')) return 'instagram_lead_capture';
  return raw.includes('instagram') ? raw : `instagram_${raw}`;
};

const tagsFor = (record) => {
  const tags = [];
  for (const value of [
    pick(record, ['tag', 'sourceTag']),
    ...(Array.isArray(record?.tags) ? record.tags : []),
    ...(Array.isArray(record?.sourceTags) ? record.sourceTags : []),
  ]) {
    const tag = cleanString(value);
    if (tag) tags.push(tag);
  }
  return Array.from(new Set(tags)).slice(0, 24);
};

const surfaceTagsFor = (record, eventKind) => {
  const raw = normalizedRawEventKind(record);
  if (!raw) return [];
  const tags = [];
  const canonicalWithoutPrefix = eventKind.replace(/^instagram_/, '');
  if (raw !== eventKind && raw !== canonicalWithoutPrefix) {
    tags.push(`instagram_original_kind:${raw}`);
  }
  if (['story_reply', 'instagram_story_reply', 'reply_to_story'].includes(raw)) {
    tags.push('instagram_surface:story_reply');
  }
  if (['message_reaction', 'dm_reaction', 'reaction'].includes(raw)) {
    tags.push('instagram_surface:message_reaction');
  }
  if (['mention', 'mentions', 'instagram_mention'].includes(raw)) {
    tags.push('instagram_surface:mention');
  }
  if (raw.includes('insight') || raw.includes('profile_visit') || ['save', 'saved', 'share', 'shares'].includes(raw)) {
    tags.push('instagram_surface:aggregate_insight');
  }
  return tags;
};

const compactMetrics = (record, eventKind, observedAt) => {
  const rawMetrics = record?.metrics && typeof record.metrics === 'object' && !Array.isArray(record.metrics)
    ? record.metrics
    : {};
  const metrics = {};
  for (const [key, value] of Object.entries(rawMetrics)) {
    const numeric = cleanNumber(value);
    const bool = cleanBoolean(value);
    const string = cleanString(value);
    if (numeric !== null) metrics[key] = numeric;
    else if (bool !== null) metrics[key] = bool;
    else if (string) metrics[key] = string;
  }

  const scalarKeys = [
    'inboundDm30d',
    'storyReplies30d',
    'messageReactions30d',
    'comments30d',
    'mentions30d',
    'likes30d',
    'saves30d',
    'shares30d',
    'storyViews30d',
    'profileVisits30d',
    'reach30d',
    'impressions30d',
    'lastInteractionAt',
  ];
  for (const key of scalarKeys) {
    const value = pick(record, [key, `instagramActivity.${key}`, `instagram_activity.${key}`]);
    if (value === null || value === undefined || value === '') continue;
    if (key.endsWith('At')) metrics[key] = cleanString(value) ?? value;
    else metrics[key] = cleanNumber(value) ?? cleanString(value) ?? value;
  }

  const follows = pick(record, ['follows', 'followed', 'instagramActivity.follows']);
  const cleanFollows = cleanBoolean(follows);
  if (cleanFollows !== null) metrics.follows = cleanFollows;

  if (eventKind === 'instagram_engagement_snapshot' && !metrics.lastInteractionAt) {
    metrics.lastInteractionAt = observedAt;
  }
  return metrics;
};

const summaryFor = (record, eventKind) =>
  cleanString(pick(record, [
    'summary',
    'safeSummary',
    'evidence.summary',
    'snippet',
    'messageSnippet',
    'threadContext',
    'contextSummary',
    'note',
  ])) ?? `Read-only Instagram ${eventKind.replace(/^instagram_/, '').replace(/_/g, ' ')} observation.`;

const sourceIdFor = (record, sourceKind, subjectKey, observedAt, eventKind, summary) =>
  cleanString(pick(record, ['sourceId', 'source_id', 'source.sourceId', 'id']))
  ?? `${sourceKind}:${hashId([subjectKey, observedAt, eventKind, summary])}`;

const signalEventFor = (record, index, generatedAt) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {
      event: null,
      skipped: { index, reason: 'invalid_observation_record' },
    };
  }

  const eventKind = normalizeEventKind(record);
  if (!eventKind) {
    return {
      event: null,
      skipped: {
        index,
        reason: 'unsupported_or_missing_instagram_event_kind',
        rawKind: cleanString(pick(record, ['eventKind', 'kind', 'activity', 'type'])),
      },
    };
  }

  const personId = cleanString(pick(record, ['personId', 'person_id', 'subject.personId']));
  const email = cleanEmail(pick(record, ['email', 'subjectEmail', 'subject.email']));
  const instagramHandle = cleanHandle(pick(record, [
    'instagramHandle',
    'instagram_handle',
    'handle',
    'matchedInstagramHandle',
    'username',
    'subject.instagramHandle',
  ]));
  const phone = cleanPhone(pick(record, ['phone', 'subjectPhone', 'subject.phone']));
  const subjectKey =
    personId
    || (email ? `email:${email}` : null)
    || (instagramHandle ? `ig:${instagramHandle}` : null)
    || (phone ? `phone:${phone}` : null);

  if (!subjectKey) {
    return {
      event: null,
      skipped: {
        index,
        reason: 'missing_identity_anchor',
        eventKind,
      },
    };
  }

  const observedAt = isoNow(pick(record, ['observedAt', 'observed_at', 'timestamp', 'createdAt', 'created_at']) ?? generatedAt);
  const sourceKind = sourceKindFor(record);
  const summary = summaryFor(record, eventKind);
  const metrics = compactMetrics(record, eventKind, observedAt);
  const quantity = cleanNumber(pick(record, ['quantity', 'count', 'event.quantity'])) ?? 1;
  const sourceId = sourceIdFor(record, sourceKind, subjectKey, observedAt, eventKind, summary);
  const confidence = cleanString(pick(record, ['confidence', 'strength'])) ?? 'medium';

  return {
    event: {
      sourceKind,
      sourceId,
      eventKind,
      channel: 'instagram',
      direction: eventKind === 'instagram_engagement_snapshot' ? 'unknown' : 'inbound',
      personId,
      email,
      instagramHandle,
      phone,
      observedAt,
      quantity,
      metrics,
      confidence,
      tags: Array.from(new Set([...tagsFor(record), ...surfaceTagsFor(record, eventKind)])).slice(0, 24),
      summary,
      sourceIds: [sourceId],
    },
    skipped: null,
  };
};

const summarize = (events, skippedRecords) => {
  const byKind = {};
  const bySourceKind = {};
  for (const event of events) {
    byKind[event.eventKind] = (byKind[event.eventKind] ?? 0) + 1;
    bySourceKind[event.sourceKind] = (bySourceKind[event.sourceKind] ?? 0) + 1;
  }
  return {
    observationsRead: events.length + skippedRecords.length,
    eventsGenerated: events.length,
    skippedRecords: skippedRecords.length,
    byKind,
    bySourceKind,
  };
};

export const buildCrmVNextInstagramSignalEvents = (payload = {}, options = {}) => {
  const generatedAt = isoNow(options.now);
  const observations = asArray(payload);
  const mapped = observations.map((record, index) => signalEventFor(record, index, generatedAt));
  const signalEvents = mapped.map((item) => item.event).filter(Boolean);
  const skippedRecords = mapped.map((item) => item.skipped).filter(Boolean);

  return {
    schemaVersion: CRM_VNEXT_INSTAGRAM_SIGNAL_EVENTS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_instagram_signal_events',
    summary: {
      ...summarize(signalEvents, skippedRecords),
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    signalEvents,
    events: signalEvents,
    skippedRecords,
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
      instagramPermissionMutationProhibited: true,
      manyChatLiveMutationProhibited: true,
      scoreMutationProhibited: true,
      allowedUse: [
        'Convert supplied read-only Instagram observations into canonical Signal Event Ledger records.',
        'Feed Instagram DMs, story replies, comments, mentions, likes, story views, follows, and snapshots into the same scoring preview lane as MailerLite and Gmail.',
        'Preserve aggregate Instagram insight observations as event records even when they are not yet person-level scoring signals.',
      ],
      prohibitedActions: [
        'Do not open Instagram or call Instagram APIs from this adapter.',
        'Do not send, like, react, follow, unfollow, or modify Instagram content.',
        'Do not mutate CRM cards, Fact Store, scores, ManyChat LIVE, or external systems.',
        'Do not read, print, rotate, or mutate credentials.',
        'Do not treat an Instagram signal as permission to contact someone.',
      ],
    },
  };
};
