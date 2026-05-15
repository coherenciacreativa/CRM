import { createHash } from 'node:crypto';

export const CRM_VNEXT_GMAIL_REPLY_ENGAGEMENT_SIGNALS_SCHEMA_VERSION =
  'crm-vnext-gmail-reply-engagement-signals-2026-05-15';

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

const normalizeEmail = (value) => {
  const raw = cleanString(value);
  const match = raw?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const email = match?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
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

const pickString = (record, keys) => cleanString(pick(record, keys));

const firstIsoDate = (record, keys) => {
  for (const key of keys) {
    const value = pick(record, [key]);
    const date = value instanceof Date ? value : value ? new Date(value) : null;
    if (date && !Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
};

const asStringList = (value) => {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  const raw = cleanString(value);
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return asStringList(parsed);
    } catch {
      // Keep parsing as a delimited string below.
    }
  }
  return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const containersFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of [
    'gmailReplyActivities',
    'replyActivities',
    'representativeExamples',
    'examples',
    'records',
    'rows',
    'items',
    'results',
    'data',
  ]) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const key of ['snapshot', 'discovery', 'payload', 'report']) {
    const nested = containersFrom(value[key]);
    if (nested.length) return nested;
  }
  return [];
};

const looksLikeReplyRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Boolean(
    pick(value, ['messageId', 'gmailMessageId', 'id', 'sourceId'])
      || pick(value, ['from.email', 'fromEmail', 'email'])
      || pick(value, ['candidateType', 'candidate_type', 'replyConfidence', 'reply_confidence'])
      || pick(value, ['subject', 'matchedNewsletterOrCampaign']),
  );
};

const flattenRecords = (value, depth = 0) => {
  const container = containersFrom(value);
  const records = [];
  for (const item of container) {
    if (!item || typeof item !== 'object') continue;
    if (looksLikeReplyRecord(item)) {
      records.push(item);
      continue;
    }
    if (depth < 2) records.push(...flattenRecords(item, depth + 1));
  }
  return records;
};

const normalizeConfidence = (value) => {
  const raw = cleanString(value)?.toLowerCase() ?? null;
  if (raw === 'strong' || raw === 'medium' || raw === 'weak') return raw;
  return 'weak';
};

const normalizeCandidateType = (value) => cleanString(value)?.toLowerCase() ?? null;

const lowerCodes = (record) =>
  asStringList(pick(record, ['reasonCodes', 'reason_codes', 'reasons', 'reason_codes_v0']))
    .map((code) => code.toLowerCase());

const isFalsePositive = (record, candidateType, codes) => {
  if (candidateType?.includes('false_positive')) return true;
  if (candidateType?.includes('auto_or_bounce')) return true;
  return codes.some((code) =>
    code.includes('auto')
    || code.includes('bounce')
    || code.includes('bulk')
    || code.includes('feedback')
    || code.includes('list_unsubscribe')
    || code.includes('from_newsletter_sender')
    || code.includes('mailer_lite_sender')
    || code.includes('no_reply'),
  );
};

const isHumanReplyCandidate = (candidateType, codes) => {
  if (candidateType === 'human_reply_candidate') return true;
  return codes.some((code) =>
    code === 'human_sender'
    || code === 'reply_subject_prefix'
    || code === 'in_reply_to_or_references_mlsend'
    || code === 'delivered_to_discovered_reply_address'
    || code === 'to_discovered_reply_address',
  );
};

const daysSince = (dateValue, now) => {
  if (!dateValue) return null;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
};

const inWindow = (dateValue, now, windowDays) => {
  const age = daysSince(dateValue, now);
  return age !== null && age <= windowDays;
};

const fromEmailFor = (record) =>
  normalizeEmail(pick(record, [
    'from.email',
    'fromEmail',
    'from_email',
    'sender.email',
    'email',
    'probableCrmIdentityKey',
    'probable_crm_identity_key',
    'from',
  ]));

const cleanObject = (value) => {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === 'string' ? cleanPublicText(item) : cleanObject(item)]),
  );
};

const tagsFor = (record, confidence) => unique([
  'newsletter_reply',
  `gmail_reply_confidence:${confidence}`,
  pickString(record, ['matchedNewsletterOrCampaign', 'matched_newsletter_or_campaign', 'campaign', 'campaignTitle'])
    ? `campaign:${pickString(record, ['matchedNewsletterOrCampaign', 'matched_newsletter_or_campaign', 'campaign', 'campaignTitle'])}`
    : null,
]);

const skippedFor = (record, index, reason) => ({
  index,
  reason,
  sourceId: pickString(record, ['sourceId', 'source_id', 'messageId', 'gmailMessageId', 'id']) ?? null,
  email: fromEmailFor(record),
  replyConfidence: normalizeConfidence(pick(record, ['replyConfidence', 'reply_confidence', 'confidence'])),
  candidateType: normalizeCandidateType(pick(record, ['candidateType', 'candidate_type'])),
});

const signalForRecord = (record, index, generatedAt, options) => {
  const confidence = normalizeConfidence(pick(record, ['replyConfidence', 'reply_confidence', 'confidence']));
  const candidateType = normalizeCandidateType(pick(record, ['candidateType', 'candidate_type']));
  const codes = lowerCodes(record);
  const falsePositive = isFalsePositive(record, candidateType, codes);
  const humanReply = isHumanReplyCandidate(candidateType, codes);

  if (falsePositive) return { signal: null, replyActivity: null, skipped: skippedFor(record, index, 'false_positive_auto_or_bounce') };
  if (!humanReply) return { signal: null, replyActivity: null, skipped: skippedFor(record, index, 'not_human_reply_candidate') };
  if (confidence === 'weak') return { signal: null, replyActivity: null, skipped: skippedFor(record, index, 'weak_or_review_only') };

  const email = fromEmailFor(record);
  if (!email) return { signal: null, replyActivity: null, skipped: skippedFor(record, index, 'missing_match_identity') };

  const observedAt = firstIsoDate(record, ['observedAt', 'observed_at', 'date', 'internalDate', 'timestamp', 'createdAt']);
  if (!observedAt) return { signal: null, replyActivity: null, skipped: skippedFor(record, index, 'missing_observed_at') };

  const messageId = pickString(record, ['messageId', 'gmailMessageId', 'id', 'sourceId'])
    ?? `record_${index}_${hashId([email, observedAt])}`;
  const sourceId = pickString(record, ['sourceId', 'source_id'])
    ?? `gmail_reply_activity:${hashId([messageId, email, observedAt])}`;
  const now = new Date(generatedAt);

  const signal = {
    sourceKind: 'gmail_reply_activity',
    sourceId,
    email,
    observedAt,
    replies30d: inWindow(observedAt, now, options.windowDays) ? 1 : 0,
    lastReplyAt: observedAt,
    tags: tagsFor(record, confidence),
  };

  const replyActivity = {
    activityId: `gmail_reply_activity_${hashId([messageId, email, observedAt])}`,
    signalSourceId: sourceId,
    gmailMessageId: messageId,
    gmailThreadId: pickString(record, ['threadId', 'gmailThreadId', 'thread_id']),
    email,
    fromName: pickString(record, ['from.name', 'fromName', 'from_name', 'sender.name']),
    subject: pickString(record, ['subject']),
    matchedNewsletterOrCampaign: pickString(record, [
      'matchedNewsletterOrCampaign',
      'matched_newsletter_or_campaign',
      'campaign',
      'campaignTitle',
    ]),
    observedAt,
    replyConfidence: confidence,
    candidateType,
    reasonCodes: asStringList(pick(record, ['reasonCodes', 'reason_codes', 'reasons', 'reason_codes_v0'])),
    forwarding: cleanObject(pick(record, ['forwarding'])),
    selectedHeaders: cleanObject(pick(record, ['selectedHeaders', 'selected_headers'])),
    redactedSnippet: pickString(record, ['redactedSnippet', 'redacted_snippet', 'snippet']),
    rawBodyExported: false,
    mutationsPerformed: false,
  };

  return { signal, replyActivity, skipped: null };
};

const safety = () => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  gmailMutationProhibited: true,
  rawBodyExportProhibited: true,
  allowedUse: [
    'Convert supplied Gmail newsletter reply metadata into CRM engagement signals.',
    'Feed the resulting signals into crm:vnext:engagement-signal-preview.',
    'Use reply metadata as a relationship signal only after identity matching.',
  ],
  prohibitedActions: [
    'Do not call Gmail APIs from this adapter.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not export full email bodies.',
    'Do not archive, move, label, delete, or send Gmail messages.',
    'Do not mutate CRM cards or Fact Store.',
    'Do not send email, Instagram DM, WhatsApp, Telegram, or any outbound message.',
  ],
});

export const buildCrmVNextGmailReplyEngagementSignals = (input = {}) => {
  const snapshot = input.snapshot ?? input.discovery ?? input.records ?? input;
  const generatedAt = isoNow(input.now ?? pick(snapshot, ['generatedAt', 'generated_at', 'scan.generatedAt']));
  const options = {
    windowDays: Number.isFinite(Number(input.windowDays)) && Number(input.windowDays) > 0
      ? Number(input.windowDays)
      : 30,
  };
  const records = flattenRecords(snapshot);
  const signals = [];
  const replyActivities = [];
  const skippedRecords = [];

  records.forEach((record, index) => {
    const result = signalForRecord(record, index, generatedAt, options);
    if (result.signal) signals.push(result.signal);
    if (result.replyActivity) replyActivities.push(result.replyActivity);
    if (result.skipped) skippedRecords.push(result.skipped);
  });

  return {
    schemaVersion: CRM_VNEXT_GMAIL_REPLY_ENGAGEMENT_SIGNALS_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_gmail_reply_engagement_signal_adapter',
    windowDays: options.windowDays,
    summary: {
      recordsRead: records.length,
      signalsGenerated: signals.length,
      replyActivities: replyActivities.length,
      skippedRecords: skippedRecords.length,
      strongSignals: signals.filter((signal) => signal.tags.includes('gmail_reply_confidence:strong')).length,
      mediumSignals: signals.filter((signal) => signal.tags.includes('gmail_reply_confidence:medium')).length,
      falsePositiveSkipped: skippedRecords.filter((record) => record.reason === 'false_positive_auto_or_bounce').length,
      weakReviewOnly: skippedRecords.filter((record) => record.reason === 'weak_or_review_only').length,
      missingMatchIdentity: skippedRecords.filter((record) => record.reason === 'missing_match_identity').length,
      missingObservedAt: skippedRecords.filter((record) => record.reason === 'missing_observed_at').length,
      liveApiCallsPerformed: false,
      credentialsRead: false,
      rawBodiesExported: false,
      operationsExecuted: 0,
    },
    signals,
    replyActivities,
    skippedRecords,
    safety: safety(),
  };
};
