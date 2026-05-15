import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

export const CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_SCHEMA_VERSION =
  'crm-vnext-engagement-snapshot-ledger-2026-05-15';
export const CRM_VNEXT_STORED_ENGAGEMENT_SNAPSHOT_SCHEMA_VERSION =
  'crm-vnext-stored-engagement-snapshot-2026-05-15';

export const DEFAULT_CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_PATH = join(
  process.cwd(),
  '.crm-vnext',
  'engagement-snapshots',
  'ledger.jsonl',
);

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

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
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return 0;
};

const cleanArray = (value) =>
  Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : [];

const resolveLedgerPath = (ledgerPath) =>
  resolve(
    ledgerPath
      || process.env.CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_PATH
      || DEFAULT_CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_PATH,
  );

const safety = () => ({
  localOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  previewOnly: true,
  allowedUse: [
    'Persist read-only engagement preview history for dashboard and operator review.',
    'Track score movement over time without changing person cards.',
    'Give Mantis a stable local ledger after MailerLite, Gmail, Instagram, or manual engagement snapshots.',
  ],
  prohibitedActions: [
    'Do not mutate person cards from this ledger.',
    'Do not write Fact Store from this ledger.',
    'Do not send email, Instagram, WhatsApp, Telegram, or ManyChat messages.',
    'Do not call live APIs or read credentials.',
    'Do not treat a warmed score as permission to contact someone.',
  ],
});

const extractPreview = (payload) => {
  if (payload?.preview?.mode === 'read_only_engagement_signal_preview') return payload.preview;
  if (payload?.mode === 'read_only_engagement_signal_preview') return payload;
  return null;
};

const normalizeSummary = (summary = {}) => ({
  cardsAvailable: cleanNumber(summary.cardsAvailable),
  signalsRead: cleanNumber(summary.signalsRead),
  matchedSignals: cleanNumber(summary.matchedSignals),
  unmatchedSignals: cleanNumber(summary.unmatchedSignals),
  cardsPreviewed: cleanNumber(summary.cardsPreviewed),
  warmedCards: cleanNumber(summary.warmedCards),
  cooledCards: cleanNumber(summary.cooledCards),
  humanFollowUpReview: cleanNumber(summary.humanFollowUpReview),
  emailNurtureCandidates: cleanNumber(summary.emailNurtureCandidates),
  suppressionReviews: cleanNumber(summary.suppressionReviews),
  operationsExecuted: cleanNumber(summary.operationsExecuted),
  cardMutationReady: summary.cardMutationReady === true,
});

const validatePreview = (preview) => {
  if (!preview) throw new Error('engagement_snapshot_preview_required');
  const summary = normalizeSummary(preview.summary);
  if (preview.mode !== 'read_only_engagement_signal_preview') {
    throw new Error('engagement_snapshot_preview_mode_required');
  }
  if (summary.operationsExecuted !== 0 || summary.cardMutationReady !== false) {
    throw new Error('engagement_snapshot_preview_must_be_non_mutating');
  }
  if (!Array.isArray(preview.previewItems) || !Array.isArray(preview.unmatchedSignals)) {
    throw new Error('engagement_snapshot_preview_items_required');
  }
  return summary;
};

const compactScore = (score = {}) => ({
  stage: cleanString(score.stage),
  priorityScore: cleanNumber(score.priorityScore),
  commercialWarmth: cleanNumber(score.commercialWarmth),
  communityDepth: cleanNumber(score.communityDepth),
  relationshipEngagement: cleanNumber(score.relationshipEngagement),
  dataConfidence: cleanNumber(score.dataConfidence),
  nextBestAction: cleanString(score.nextBestAction),
});

const compactDelta = (delta = {}) => ({
  priorityScore: cleanNumber(delta.priorityScore),
  commercialWarmth: cleanNumber(delta.commercialWarmth),
  communityDepth: cleanNumber(delta.communityDepth),
  relationshipEngagement: cleanNumber(delta.relationshipEngagement),
  dataConfidence: cleanNumber(delta.dataConfidence),
});

const compactEmailActivity = (email = {}) => ({
  opens30d: cleanNumber(email.opens30d),
  clicks30d: cleanNumber(email.clicks30d),
  replies30d: cleanNumber(email.replies30d),
  opens90d: cleanNumber(email.opens90d),
  clicks90d: cleanNumber(email.clicks90d),
  lifetimeOpens: cleanNumber(email.lifetimeOpens),
  lifetimeClicks: cleanNumber(email.lifetimeClicks),
  lifetimeSent: cleanNumber(email.lifetimeSent),
  openRate: cleanNumber(email.openRate),
  clickRate: cleanNumber(email.clickRate),
  lastOpenAt: cleanString(email.lastOpenAt),
  lastClickAt: cleanString(email.lastClickAt),
  lastReplyAt: cleanString(email.lastReplyAt),
  subscribedAt: cleanString(email.subscribedAt),
  subscriberStatus: cleanString(email.subscriberStatus),
});

const compactInstagramActivity = (instagram = {}) => ({
  inboundDm30d: cleanNumber(instagram.inboundDm30d),
  comments30d: cleanNumber(instagram.comments30d),
  likes30d: cleanNumber(instagram.likes30d),
  storyViews30d: cleanNumber(instagram.storyViews30d),
  follows: instagram.follows === true || undefined,
  lastInteractionAt: cleanString(instagram.lastInteractionAt),
});

const compactMovement = (item) => {
  const personId = cleanString(item.personId);
  const sourceIds = cleanArray(item.match?.sourceIds).slice(0, 24);
  const movementItemId =
    cleanString(item.previewItemId)
    || `engagement_movement_${hashId([personId, ...sourceIds])}`;
  return {
    movementItemId,
    personId,
    displayName: cleanString(item.displayName),
    movement: cleanString(item.movement) || 'unchanged',
    recommendedQueue: cleanString(item.recommendedQueue) || 'keep_observing',
    match: {
      matchedBy: cleanString(item.match?.matchedBy),
      signalCount: cleanNumber(item.match?.signalCount),
      sourceKinds: cleanArray(item.match?.sourceKinds).slice(0, 12),
      sourceIds,
    },
    before: compactScore(item.before),
    after: compactScore(item.after),
    delta: compactDelta(item.delta),
    newReasonCodes: cleanArray(item.newReasonCodes).slice(0, 20),
    newRiskCodes: cleanArray(item.newRiskCodes).slice(0, 20),
    aggregatedSignals: {
      email: compactEmailActivity(item.aggregatedSignals?.email),
      instagram: compactInstagramActivity(item.aggregatedSignals?.instagram),
      tags: cleanArray(item.aggregatedSignals?.tags).slice(0, 30),
    },
    safeNextStep: cleanString(item.safeNextStep),
  };
};

const compactUnmatchedSignal = (item) => ({
  unmatchedItemId:
    cleanString(item.unmatchedItemId)
    || `engagement_unmatched_${hashId([
      cleanString(item.sourceKind),
      cleanString(item.sourceId),
      cleanString(item.email),
      cleanString(item.instagramHandle),
      cleanString(item.phone),
    ])}`,
  sourceKind: cleanString(item.sourceKind),
  sourceId: cleanString(item.sourceId),
  personId: cleanString(item.personId),
  email: cleanString(item.email),
  instagramHandle: cleanString(item.instagramHandle),
  phone: cleanString(item.phone),
  observedAt: cleanString(item.observedAt),
  reason: cleanString(item.reason) || 'no_matching_card',
  safeNextStep: cleanString(item.safeNextStep),
});

const makeSnapshotRecordId = (preview, summary) => {
  const sourceParts = (preview.previewItems ?? []).flatMap((item) => [
    cleanString(item.previewItemId),
    cleanString(item.personId),
    ...cleanArray(item.match?.sourceIds),
  ]);
  const unmatchedParts = (preview.unmatchedSignals ?? []).flatMap((item) => [
    cleanString(item.unmatchedItemId),
    cleanString(item.sourceId),
  ]);
  return `engagement_snapshot_${hashId([
    cleanString(preview.generatedAt),
    JSON.stringify(summary),
    ...sourceParts,
    ...unmatchedParts,
  ])}`;
};

export const buildCrmEngagementSnapshotFromPreview = (
  previewPayload,
  options = {},
) => {
  const preview = extractPreview(previewPayload);
  const summary = validatePreview(preview);
  const sourcePreviewGeneratedAt = cleanString(preview.generatedAt);
  const capturedAt = isoNow(options.now);
  const snapshotRecordId =
    cleanString(options.snapshotRecordId)
    || makeSnapshotRecordId(preview, summary);
  const movements = preview.previewItems.map(compactMovement);
  const unmatchedSignals = preview.unmatchedSignals.map(compactUnmatchedSignal).slice(0, 50);

  return {
    schemaVersion: CRM_VNEXT_STORED_ENGAGEMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotRecordId,
    snapshotBatchId: `engagement_snapshot_batch_${capturedAt.replace(/[^0-9]/g, '').slice(0, 14)}`,
    capturedAt,
    approvedBy: cleanString(options.approvedBy),
    sourcePreviewGeneratedAt,
    sourceKind: cleanString(options.sourceKind) || 'engagement_signal_preview',
    sourceLabel: cleanString(options.sourceLabel),
    previewSummary: summary,
    movements,
    unmatchedSignals,
    signalSourceKinds: Array.from(new Set(movements.flatMap((movement) => movement.match.sourceKinds))).sort(),
    safety: {
      cardMutationExecuted: false,
      factStoreWriteExecuted: false,
      outboundExecuted: false,
      liveApiCallsExecuted: false,
      previewOnly: true,
    },
  };
};

const parseJsonl = (text) => {
  const snapshots = [];
  let invalidRows = 0;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed?.schemaVersion === CRM_VNEXT_STORED_ENGAGEMENT_SNAPSHOT_SCHEMA_VERSION
        && parsed.snapshotRecordId
        && parsed.capturedAt
        && parsed.previewSummary
      ) {
        snapshots.push(parsed);
      } else {
        invalidRows += 1;
      }
    } catch {
      invalidRows += 1;
    }
  }
  return { snapshots, invalidRows };
};

export const summarizeCrmEngagementSnapshotLedger = (snapshots) => {
  let latestCapturedAt = null;
  for (const snapshot of snapshots) {
    if (!latestCapturedAt || snapshot.capturedAt > latestCapturedAt) latestCapturedAt = snapshot.capturedAt;
  }

  return {
    snapshots: snapshots.length,
    latestCapturedAt,
    totalSignals: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.signalsRead), 0),
    totalMatchedSignals: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.matchedSignals), 0),
    totalUnmatchedSignals: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.unmatchedSignals), 0),
    totalCardsPreviewed: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.cardsPreviewed), 0),
    totalWarmedCards: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.warmedCards), 0),
    totalCooledCards: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.cooledCards), 0),
    totalHumanFollowUpReview: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.humanFollowUpReview), 0),
    totalEmailNurtureCandidates: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.emailNurtureCandidates), 0),
    totalSuppressionReviews: snapshots.reduce((sum, snapshot) => sum + cleanNumber(snapshot.previewSummary?.suppressionReviews), 0),
  };
};

const latestMovementsFor = (snapshots, limit = 12) =>
  snapshots
    .flatMap((snapshot) =>
      (snapshot.movements ?? []).map((movement) => ({
        snapshotRecordId: snapshot.snapshotRecordId,
        capturedAt: snapshot.capturedAt,
        sourcePreviewGeneratedAt: snapshot.sourcePreviewGeneratedAt,
        ...movement,
      })),
    )
    .sort((left, right) =>
      right.capturedAt.localeCompare(left.capturedAt)
      || Math.abs(right.delta.priorityScore) - Math.abs(left.delta.priorityScore)
      || (right.after.priorityScore ?? 0) - (left.after.priorityScore ?? 0),
    )
    .slice(0, limit);

export const readCrmEngagementSnapshotLedger = async (
  ledgerPath,
  options = {},
) => {
  const generatedAt = isoNow(options.now);
  const resolvedLedgerPath = resolveLedgerPath(ledgerPath);
  let parsed = { snapshots: [], invalidRows: 0 };

  try {
    parsed = parseJsonl(await readFile(resolvedLedgerPath, 'utf8'));
  } catch {
    parsed = { snapshots: [], invalidRows: 0 };
  }

  const sorted = parsed.snapshots.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
  const limit = typeof options.limit === 'number' && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : sorted.length;

  return {
    schemaVersion: CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_engagement_snapshot_ledger',
    summary: summarizeCrmEngagementSnapshotLedger(parsed.snapshots),
    snapshots: sorted.slice(0, limit),
    latestMovements: latestMovementsFor(sorted, options.movementLimit ?? 12),
    invalidRows: parsed.invalidRows,
    safety: safety(),
  };
};

export const appendCrmEngagementSnapshotLedger = async (input) => {
  const approvedBy = cleanString(input?.approvedBy);
  if (input?.commit && !approvedBy) throw new Error('engagement_snapshot_approved_by_required');
  const generatedAt = isoNow(input?.now);
  const ledgerPath = resolveLedgerPath(input?.ledgerPath);
  const current = await readCrmEngagementSnapshotLedger(ledgerPath, { now: generatedAt });
  const existingIds = new Set(current.snapshots.map((snapshot) => snapshot.snapshotRecordId));
  const snapshot = buildCrmEngagementSnapshotFromPreview(input?.preview, {
    now: generatedAt,
    approvedBy: approvedBy || 'dry-run',
    sourceKind: input?.sourceKind,
    sourceLabel: input?.sourceLabel,
  });
  const duplicatesSkipped = existingIds.has(snapshot.snapshotRecordId) ? [snapshot] : [];
  const added = duplicatesSkipped.length ? [] : [snapshot];

  if (input?.commit && added.length) {
    await mkdir(dirname(ledgerPath), { recursive: true });
    await appendFile(ledgerPath, `${JSON.stringify(snapshot)}\n`, 'utf8');
  }

  const summaryAfter = summarizeCrmEngagementSnapshotLedger(
    input?.commit ? [...current.snapshots, ...added] : current.snapshots,
  );

  return {
    schemaVersion: CRM_VNEXT_ENGAGEMENT_SNAPSHOT_LEDGER_SCHEMA_VERSION,
    generatedAt,
    mode: input?.commit
      ? 'local_engagement_snapshot_append'
      : 'dry_run_engagement_snapshot_append',
    committed: Boolean(input?.commit),
    incoming: input?.preview ? 1 : 0,
    added,
    duplicatesSkipped,
    summaryAfter,
    latestMovements: latestMovementsFor(input?.commit ? [...current.snapshots, ...added] : current.snapshots, 12),
    safety: safety(),
  };
};
