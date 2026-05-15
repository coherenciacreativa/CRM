import { createHash } from 'node:crypto';

export const CRM_VNEXT_MAILERLITE_ENGAGEMENT_SIGNALS_SCHEMA_VERSION =
  'crm-vnext-mailerlite-engagement-signals-2026-05-15';

const DAY_MS = 24 * 60 * 60 * 1000;

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

const cleanNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
};

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
};

const normalizeHandle = (value) => {
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

const normalizePhone = (value) => {
  const cleaned = cleanString(value)?.replace(/\D/g, '') ?? null;
  return cleaned && cleaned.length >= 7 ? cleaned : null;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const normalizeStatus = (value) => {
  const raw = cleanString(value)?.toLowerCase() ?? null;
  if (!raw) return null;
  if (raw.includes('complain') || raw.includes('spam')) return 'complained';
  if (raw.includes('bounce')) return 'bounced';
  if (raw.includes('unsub')) return 'unsubscribed';
  if (raw.includes('active') || raw.includes('subscribed')) return 'active';
  return raw;
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

const fieldArrayValue = (fields, key) => {
  if (!Array.isArray(fields)) return null;
  const normalizedKey = key.toLowerCase();
  const match = fields.find((field) => {
    if (!field || typeof field !== 'object') return false;
    const fieldKey = cleanString(field.key ?? field.name ?? field.id)?.toLowerCase();
    return fieldKey === normalizedKey;
  });
  return match?.value ?? null;
};

const fieldObjectValue = (fields, key) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
  return fields[key] ?? null;
};

const pick = (record, keys) => {
  for (const key of keys) {
    const direct = getPath(record, key);
    if (direct !== null && direct !== undefined && direct !== '') return direct;
    const fields = record?.fields;
    const fromArray = fieldArrayValue(fields, key);
    if (fromArray !== null && fromArray !== undefined && fromArray !== '') return fromArray;
    const fromObject = fieldObjectValue(fields, key);
    if (fromObject !== null && fromObject !== undefined && fromObject !== '') return fromObject;
  }
  return null;
};

const pickString = (record, keys) => cleanString(pick(record, keys));
const pickNumber = (record, keys) => cleanNumber(pick(record, keys));

const firstIsoDate = (record, keys) => {
  for (const key of keys) {
    const value = pick(record, [key]);
    const date = value instanceof Date ? value : value ? new Date(value) : null;
    if (date && !Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
};

const asNameList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') return cleanString(item.name ?? item.title ?? item.label ?? item.id);
        return cleanString(item);
      })
      .filter(Boolean);
  }
  const raw = cleanString(value);
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return asNameList(parsed);
    } catch {
      // Keep parsing as a delimited string below.
    }
  }
  return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const tagsFor = (record) => unique([
  ...asNameList(pick(record, ['groups', 'group_names', 'groupNames'])),
  ...asNameList(pick(record, ['tags', 'tag_names', 'tagNames'])),
  ...asNameList(pick(record, ['segments', 'lists'])),
]);

const containersFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of [
    'signals',
    'records',
    'rows',
    'subscribers',
    'contacts',
    'people',
    'items',
    'results',
    'data',
    'engagementRecords',
    'mailerLiteRecords',
    'mailerLiteEngagement',
  ]) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const key of ['scan', 'snapshot', 'mailerlite', 'mailerLite', 'payload']) {
    const nested = containersFrom(value[key]);
    if (nested.length) return nested;
  }
  return Object.values(value).filter((item) => item && typeof item === 'object' && !Array.isArray(item));
};

const looksLikeRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Boolean(
    pick(value, ['email', 'subscriber.email', 'subscriber_email', 'subscriberEmail', 'contact.email'])
      || pick(value, ['campaignActivity', 'campaign_activity', 'campaigns', 'recentCampaigns', 'activity', 'events'])
      || pick(value, ['opens30d', 'opens_30d', 'clicks30d', 'clicks_30d', 'subscriberStatus', 'status']),
  );
};

const flattenRecords = (value, depth = 0) => {
  const container = containersFrom(value);
  const records = [];
  for (const item of container) {
    if (!item || typeof item !== 'object') continue;
    if (looksLikeRecord(item)) {
      records.push(item);
      continue;
    }
    if (depth < 2) records.push(...flattenRecords(item, depth + 1));
  }
  return records;
};

const activityRowsFrom = (record) => {
  const value = pick(record, [
    'campaignActivity',
    'campaign_activity',
    'campaigns',
    'recentCampaigns',
    'recent_campaigns',
    'activity',
    'events',
  ]);
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
};

const daysSince = (dateValue, now) => {
  if (!dateValue) return null;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
};

const inWindow = (dateValue, now, windowDays) => {
  const age = daysSince(dateValue, now);
  return age === null || age <= windowDays;
};

const latestIso = (left, right) => {
  if (!left) return right ?? null;
  if (!right) return left;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime())) return right;
  if (Number.isNaN(rightDate.getTime())) return left;
  return rightDate.getTime() > leftDate.getTime() ? right : left;
};

const truthyActivityFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  const raw = cleanString(value)?.toLowerCase();
  if (!raw) return false;
  return ['1', 'true', 'yes', 'y', 'opened', 'clicked'].includes(raw);
};

const aggregateActivityRows = (rows, now, windowDays) => {
  let opens = 0;
  let clicks = 0;
  let lastOpenAt = null;
  let lastClickAt = null;

  for (const row of rows) {
    const openAt = firstIsoDate(row, ['lastOpenAt', 'last_open_at', 'opened_at', 'open_at', 'openedAt']);
    const clickAt = firstIsoDate(row, ['lastClickAt', 'last_click_at', 'clicked_at', 'click_at', 'clickedAt']);
    const rowOpenCount = pickNumber(row, ['opens30d', 'opens_30d', 'opens', 'open_count', 'opened_count']);
    const rowClickCount = pickNumber(row, ['clicks30d', 'clicks_30d', 'clicks', 'click_count', 'clicked_count']);
    const opened = rowOpenCount ?? (truthyActivityFlag(pick(row, ['opened', 'has_opened'])) ? 1 : openAt ? 1 : 0);
    const clicked = rowClickCount ?? (truthyActivityFlag(pick(row, ['clicked', 'has_clicked'])) ? 1 : clickAt ? 1 : 0);

    if (opened > 0 && inWindow(openAt, now, windowDays)) {
      opens += opened;
      lastOpenAt = latestIso(lastOpenAt, openAt);
    }
    if (clicked > 0 && inWindow(clickAt, now, windowDays)) {
      clicks += clicked;
      lastClickAt = latestIso(lastClickAt, clickAt);
    }
  }

  return { opens, clicks, lastOpenAt, lastClickAt };
};

const sourceKindFor = (record) => {
  const explicit = cleanString(pick(record, ['sourceKind', 'source_kind']));
  if (explicit === 'mailerlite_campaign_activity' || explicit === 'mailerlite_subscriber_activity') return explicit;
  if (pick(record, ['campaignId', 'campaign_id', 'campaign.id', 'campaignName', 'campaign_name']) || activityRowsFrom(record).length) {
    return 'mailerlite_campaign_activity';
  }
  return 'mailerlite_subscriber_activity';
};

const signalForRecord = (record, index, generatedAt, options) => {
  const email = normalizeEmail(pick(record, [
    'email',
    'subscriber.email',
    'subscriber_email',
    'subscriberEmail',
    'contact.email',
    'fields.email',
  ]));
  const instagramHandle = normalizeHandle(pick(record, ['instagramHandle', 'instagram_handle', 'igHandle', 'ig_handle']));
  const phone = normalizePhone(pick(record, ['phone', 'fields.phone', 'subscriber.phone', 'telefono', 'teléfono']));
  const personId = cleanString(pick(record, ['personId', 'person_id', 'targetPersonId']));

  if (!email && !instagramHandle && !phone && !personId) {
    return {
      signal: null,
      skipped: {
        index,
        reason: 'missing_match_identity',
        sourceId: cleanString(pick(record, ['sourceId', 'source_id', 'id'])) ?? null,
      },
    };
  }

  const now = new Date(generatedAt);
  const activity = aggregateActivityRows(activityRowsFrom(record), now, options.windowDays);
  const opens30d = pickNumber(record, [
    'opens30d',
    'opens_30d',
    'open_count_30d',
    'campaign_opens_30d',
    'opens',
    'open_count',
    'total_opens',
  ]) ?? activity.opens;
  const clicks30d = pickNumber(record, [
    'clicks30d',
    'clicks_30d',
    'click_count_30d',
    'campaign_clicks_30d',
    'clicks',
    'click_count',
    'total_clicks',
  ]) ?? activity.clicks;
  const lastOpenAt = firstIsoDate(record, [
    'lastOpenAt',
    'last_open_at',
    'latest_open_at',
    'opened_at',
    'last_opened_at',
  ]) ?? activity.lastOpenAt;
  const lastClickAt = firstIsoDate(record, [
    'lastClickAt',
    'last_click_at',
    'latest_click_at',
    'clicked_at',
    'last_clicked_at',
  ]) ?? activity.lastClickAt;
  const observedAt = firstIsoDate(record, ['observedAt', 'observed_at', 'snapshotAt', 'snapshot_at', 'generatedAt'])
    ?? options.observedAt
    ?? generatedAt;
  const status = normalizeStatus(pick(record, [
    'subscriberStatus',
    'subscriber_status',
    'email_subscriber_status',
    'status',
    'state',
    'subscriber.status',
  ]));
  const sourceKind = sourceKindFor(record);
  const subscriberId = cleanString(pick(record, ['subscriberId', 'subscriber_id', 'id', 'subscriber.id']));
  const campaignId = cleanString(pick(record, ['campaignId', 'campaign_id', 'campaign.id']));
  const sourceId = cleanString(pick(record, ['sourceId', 'source_id']))
    ?? `mailerlite:${sourceKind}:${hashId([subscriberId, campaignId, email, personId, observedAt])}`;

  return {
    skipped: null,
    signal: {
      sourceKind,
      sourceId,
      personId,
      email,
      instagramHandle,
      phone,
      observedAt,
      tags: tagsFor(record),
      opens30d,
      clicks30d,
      lastOpenAt,
      lastClickAt,
      subscriberStatus: status,
    },
  };
};

const safety = () => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  mailerLiteMutationProhibited: true,
  allowedUse: [
    'Convert supplied MailerLite subscriber or campaign engagement snapshots into CRM engagement signals.',
    'Feed the resulting signals into crm:vnext:engagement-signal-preview.',
    'Preserve MailerLite status and group/tag context as scoring inputs only.',
  ],
  prohibitedActions: [
    'Do not call MailerLite APIs from this adapter.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not create, update, tag, group, suppress, delete, or segment MailerLite subscribers.',
    'Do not mutate CRM cards or Fact Store.',
    'Do not send email, Instagram DM, WhatsApp, Telegram, or any outbound message.',
  ],
});

export const buildCrmVNextMailerLiteEngagementSignals = (input = {}) => {
  const generatedAt = isoNow(input.now);
  const options = {
    windowDays: Number.isFinite(Number(input.windowDays)) && Number(input.windowDays) > 0
      ? Number(input.windowDays)
      : 30,
    observedAt: input.observedAt ? isoNow(input.observedAt) : null,
  };
  const records = flattenRecords(input.snapshot ?? input.records ?? input);
  const signals = [];
  const skippedRecords = [];

  records.forEach((record, index) => {
    const result = signalForRecord(record, index, generatedAt, options);
    if (result.signal) signals.push(result.signal);
    if (result.skipped) skippedRecords.push(result.skipped);
  });

  const suppressedStatuses = new Set(['unsubscribed', 'bounced', 'complained']);
  return {
    schemaVersion: CRM_VNEXT_MAILERLITE_ENGAGEMENT_SIGNALS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_mailerlite_engagement_signal_adapter',
    windowDays: options.windowDays,
    summary: {
      recordsRead: records.length,
      signalsGenerated: signals.length,
      skippedRecords: skippedRecords.length,
      subscriberSignals: signals.filter((signal) => signal.sourceKind === 'mailerlite_subscriber_activity').length,
      campaignSignals: signals.filter((signal) => signal.sourceKind === 'mailerlite_campaign_activity').length,
      suppressedSubscribers: signals.filter((signal) => suppressedStatuses.has(signal.subscriberStatus)).length,
      liveApiCallsPerformed: false,
      credentialsRead: false,
      operationsExecuted: 0,
    },
    signals,
    skippedRecords,
    safety: safety(),
  };
};
