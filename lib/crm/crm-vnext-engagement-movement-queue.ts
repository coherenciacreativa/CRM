import { readCrmEngagementSnapshotLedger } from './crm-vnext-engagement-snapshot-ledger.js';
import { loadPersonCardsVNext } from './community-insights-source';

export const CRM_VNEXT_ENGAGEMENT_MOVEMENT_QUEUE_SCHEMA_VERSION =
  'crm-vnext-engagement-movement-queue-2026-05-21';

const cleanString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const cleanBoolean = (value) => value === true || value === 'true' || value === '1';

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const labelFromCode = (value) =>
  String(value || 'unknown')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeHandle = (value) => cleanString(value)?.replace(/^@+/, '').toLowerCase() ?? null;

const identityKey = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  if (raw.startsWith('email:')) return `email:${raw.slice(6).toLowerCase()}`;
  if (raw.startsWith('ig:')) return `ig:${normalizeHandle(raw.slice(3))}`;
  if (raw.startsWith('phone:')) return `phone:${raw.slice(6).replace(/\D/g, '')}`;
  return raw;
};

const buildCardIndex = (cards) => {
  const index = new Map();
  for (const card of cards || []) {
    const keys = [
      identityKey(card.personId),
      card.identities?.email ? `email:${card.identities.email.toLowerCase()}` : null,
      card.identities?.instagramHandle ? `ig:${normalizeHandle(card.identities.instagramHandle)}` : null,
      card.identities?.phone ? `phone:${card.identities.phone.replace(/\D/g, '')}` : null,
    ].filter(Boolean);
    for (const key of keys) {
      if (!index.has(key)) index.set(key, card);
    }
  }
  return index;
};

const sourceFamily = (sourceKinds) => {
  const joined = (sourceKinds || []).join(' ').toLowerCase();
  if (joined.includes('gmail') || joined.includes('reply')) return 'gmail_replies';
  if (joined.includes('mailerlite')) return 'mailerlite_engagement';
  if (joined.includes('instagram')) return 'instagram_engagement';
  if (joined.includes('classbot')) return 'classbot_participation';
  if (joined.includes('whatsapp') || joined.includes('bhakti')) return 'whatsapp_engagement';
  if (joined.includes('shopify') || joined.includes('payment') || joined.includes('commerce')) return 'commerce';
  return 'other';
};

type LooseSignalRecord = Record<string, unknown>;
type QueueBuilderOptions = Record<string, any>;

const emailSignalSummary = (email: LooseSignalRecord = {}) => {
  const opens30d = cleanNumber(email.opens30d);
  const opens90d = cleanNumber(email.opens90d);
  const replies30d = cleanNumber(email.replies30d);
  const clicks30d = cleanNumber(email.clicks30d);
  const lifetimeOpens = cleanNumber(email.lifetimeOpens);
  const lastOpenAt = cleanString(email.lastOpenAt);
  const lastReplyAt = cleanString(email.lastReplyAt);
  const subscriberStatus = cleanString(email.subscriberStatus);
  const parts = [];
  if (replies30d) parts.push(`${replies30d} email repl${replies30d === 1 ? 'y' : 'ies'} in 30d`);
  if (opens30d) parts.push(`${opens30d} opens in 30d`);
  else if (opens90d) parts.push(`${opens90d} opens in 90d`);
  if (clicks30d) parts.push(`${clicks30d} clicks in 30d`);
  if (!parts.length && lifetimeOpens) parts.push(`${lifetimeOpens} lifetime opens`);
  if (subscriberStatus) parts.push(`status ${subscriberStatus}`);
  return {
    opens30d,
    opens90d,
    replies30d,
    clicks30d,
    lifetimeOpens,
    lastOpenAt,
    lastReplyAt,
    subscriberStatus,
    label: parts.join(' · ') || 'email signal present',
  };
};

const instagramSignalSummary = (instagram: LooseSignalRecord = {}) => {
  const inboundDm30d = cleanNumber(instagram.inboundDm30d);
  const comments30d = cleanNumber(instagram.comments30d);
  const likes30d = cleanNumber(instagram.likes30d);
  const storyViews30d = cleanNumber(instagram.storyViews30d);
  const lastInteractionAt = cleanString(instagram.lastInteractionAt);
  const parts = [];
  if (inboundDm30d) parts.push(`${inboundDm30d} DMs in 30d`);
  if (comments30d) parts.push(`${comments30d} comments in 30d`);
  if (likes30d) parts.push(`${likes30d} likes in 30d`);
  if (storyViews30d) parts.push(`${storyViews30d} story views in 30d`);
  return {
    inboundDm30d,
    comments30d,
    likes30d,
    storyViews30d,
    lastInteractionAt,
    label: parts.join(' · ') || null,
  };
};

const actionFor = ({ movement, card, sourceKinds, email, reasonCodes, riskCodes }) => {
  if (!card) {
    return {
      code: 'stitch_identity',
      label: 'Stitch identity',
      reviewRequired: true,
      reason: 'Movement exists but no current local card matched the movement identity.',
    };
  }

  if (riskCodes.length || movement.recommendedQueue === 'respect_suppression') {
    return {
      code: 'human_review',
      label: 'Human review',
      reviewRequired: true,
      reason: 'Risk or suppression signal is present; do not use for automatic outreach.',
    };
  }

  if (email.replies30d > 0 || reasonCodes.includes('email_replies')) {
    return {
      code: 'review_reply_context',
      label: 'Review reply context',
      reviewRequired: false,
      reason: 'A human email reply is a richer relationship signal than a passive open.',
    };
  }

  if (cleanNumber(movement.delta?.priorityScore) >= 10) {
    return {
      code: 'review_warm_contact',
      label: 'Review warm contact',
      reviewRequired: false,
      reason: 'Priority moved meaningfully in the latest engagement snapshot.',
    };
  }

  if (movement.movement === 'cooled') {
    return {
      code: 'inspect_cooling',
      label: 'Inspect cooling',
      reviewRequired: false,
      reason: 'The score moved down; check whether this reflects suppression, stale data, or a real cooling pattern.',
    };
  }

  if (sourceFamily(sourceKinds) === 'mailerlite_engagement') {
    return {
      code: 'keep_observing_email',
      label: 'Keep observing email',
      reviewRequired: false,
      reason: 'Email engagement exists, but it is not yet strong enough for a human decision.',
    };
  }

  return {
    code: 'keep_observing',
    label: 'Keep observing',
    reviewRequired: false,
    reason: cleanString(movement.safeNextStep) || 'Keep collecting signals until a stronger pattern emerges.',
  };
};

const compactCard = (card) => card
  ? {
      personId: card.personId,
      displayName: card.displayName,
      identities: {
        email: card.identities?.email ?? null,
        instagramHandle: card.identities?.instagramHandle ?? null,
        city: card.identities?.city ?? null,
        country: card.identities?.country ?? null,
      },
      currentCardScores: {
        stage: card.scoring?.stage ?? null,
        priorityScore: card.scoring?.priorityScore ?? null,
        commercialWarmth: card.scoring?.commercialWarmth ?? null,
        communityDepth: card.scoring?.communityDepth ?? null,
        relationshipEngagement: card.scoring?.relationshipEngagement ?? null,
        dataConfidence: card.scoring?.dataConfidence ?? null,
      },
      currentNextAction: card.nextAction ?? null,
    }
  : null;

const movementRow = (movement, cardIndex) => {
  const card = cardIndex.get(identityKey(movement.personId)) ?? null;
  const sourceKinds = Array.isArray(movement.match?.sourceKinds)
    ? movement.match.sourceKinds.map(cleanString).filter(Boolean)
    : [];
  const reasonCodes = Array.isArray(movement.newReasonCodes)
    ? movement.newReasonCodes.map(cleanString).filter(Boolean)
    : [];
  const riskCodes = Array.isArray(movement.newRiskCodes)
    ? movement.newRiskCodes.map(cleanString).filter(Boolean)
    : [];
  const email = emailSignalSummary(movement.aggregatedSignals?.email);
  const instagram = instagramSignalSummary(movement.aggregatedSignals?.instagram);
  const operatorAction = actionFor({ movement, card, sourceKinds, email, reasonCodes, riskCodes });
  const deltaPriority = cleanNumber(movement.delta?.priorityScore);

  return {
    rowId: `${cleanString(movement.snapshotRecordId) || 'snapshot'}:${cleanString(movement.movementItemId) || cleanString(movement.personId)}`,
    snapshotRecordId: cleanString(movement.snapshotRecordId),
    capturedAt: cleanString(movement.capturedAt),
    personId: cleanString(movement.personId),
    displayName: cleanString(movement.displayName) || card?.displayName || cleanString(movement.personId),
    movement: cleanString(movement.movement) || 'unknown',
    sourceKinds,
    sourceFamily: sourceFamily(sourceKinds),
    recommendedQueue: cleanString(movement.recommendedQueue),
    reasonCodes,
    riskCodes,
    before: {
      stage: cleanString(movement.before?.stage),
      priorityScore: cleanNumber(movement.before?.priorityScore),
    },
    after: {
      stage: cleanString(movement.after?.stage),
      priorityScore: cleanNumber(movement.after?.priorityScore),
    },
    delta: {
      priorityScore: deltaPriority,
      commercialWarmth: cleanNumber(movement.delta?.commercialWarmth),
      communityDepth: cleanNumber(movement.delta?.communityDepth),
      relationshipEngagement: cleanNumber(movement.delta?.relationshipEngagement),
      dataConfidence: cleanNumber(movement.delta?.dataConfidence),
    },
    signals: {
      email,
      instagram,
      tags: Array.isArray(movement.aggregatedSignals?.tags)
        ? movement.aggregatedSignals.tags.map(cleanString).filter(Boolean).slice(0, 12)
        : [],
    },
    card: compactCard(card),
    operatorAction,
    safeNextStep: cleanString(movement.safeNextStep) || operatorAction.reason,
  };
};

const unmatchedRow = (snapshot, signal, index) => ({
  rowId: `${snapshot.snapshotRecordId || 'snapshot'}:unmatched:${signal.unmatchedItemId || index}`,
  snapshotRecordId: cleanString(snapshot.snapshotRecordId),
  capturedAt: cleanString(snapshot.capturedAt),
  sourceKind: cleanString(signal.sourceKind),
  sourceFamily: sourceFamily([signal.sourceKind]),
  email: cleanString(signal.email),
  instagramHandle: normalizeHandle(signal.instagramHandle),
  phone: cleanString(signal.phone),
  reason: cleanString(signal.reason) || 'unmatched_signal',
  safeNextStep: cleanString(signal.safeNextStep) || 'Run identity stitching before using this engagement signal.',
  operatorAction: {
    code: 'stitch_identity',
    label: 'Stitch identity',
    reviewRequired: true,
    reason: 'Signal did not match a stable local person card.',
  },
});

const countBy = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = row[key] || 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

export const buildCrmVNextEngagementMovementQueueFromLedger = (
  ledger,
  cards = [],
  options: QueueBuilderOptions = {},
) => {
  const generatedAt = isoNow(options.now);
  const includeUnchanged = cleanBoolean(options.includeUnchanged);
  const limit = Math.max(1, Math.min(cleanNumber(options.limit, 25), 100));
  const cardIndex = buildCardIndex(cards);
  const latestMovements = Array.isArray(ledger?.latestMovements) ? ledger.latestMovements : [];
  const seenPeople = new Set();

  const rows = latestMovements
    .map((movement) => movementRow(movement, cardIndex))
    .filter((row) => {
      if (includeUnchanged) return true;
      return row.movement !== 'unchanged' || row.delta.priorityScore !== 0;
    })
    .filter((row) => {
      const key = identityKey(row.personId) || row.rowId;
      if (seenPeople.has(key)) return false;
      seenPeople.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftReview = left.operatorAction.reviewRequired ? 1 : 0;
      const rightReview = right.operatorAction.reviewRequired ? 1 : 0;
      return (
        rightReview - leftReview
        || Math.abs(right.delta.priorityScore) - Math.abs(left.delta.priorityScore)
        || right.after.priorityScore - left.after.priorityScore
        || String(left.displayName).localeCompare(String(right.displayName))
      );
    })
    .slice(0, limit);

  const latestSnapshots = Array.isArray(ledger?.snapshots) ? ledger.snapshots : [];
  const unmatchedRows = latestSnapshots
    .flatMap((snapshot) =>
      (snapshot.unmatchedSignals ?? []).map((signal, index) => unmatchedRow(snapshot, signal, index)),
    )
    .slice(0, Math.min(limit, 50));

  const reviewRows = rows.filter((row) => row.operatorAction.reviewRequired).length + unmatchedRows.length;
  const warmedRows = rows.filter((row) => row.movement === 'warmer').length;
  const cooledRows = rows.filter((row) => row.movement === 'cooled').length;

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_ENGAGEMENT_MOVEMENT_QUEUE_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_engagement_movement_queue',
    source: {
      snapshots: ledger?.summary?.snapshots ?? 0,
      latestCapturedAt: ledger?.summary?.latestCapturedAt ?? null,
      totalSignals: ledger?.summary?.totalSignals ?? 0,
      cardsAvailable: Array.isArray(cards) ? cards.length : 0,
      includeUnchanged,
    },
    summary: {
      rows: rows.length,
      unmatchedRows: unmatchedRows.length,
      warmedRows,
      cooledRows,
      reviewRows,
      bySourceFamily: countBy(rows, 'sourceFamily'),
      byOperatorAction: rows.reduce((acc, row) => {
        acc[row.operatorAction.code] = (acc[row.operatorAction.code] ?? 0) + 1;
        return acc;
      }, {}),
    },
    rows,
    unmatchedRows,
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
      scoreMutationProhibited: true,
      operatorNote: 'A movement row is internal prioritization evidence. It is not permission to contact anyone.',
      prohibitedActions: [
        'Do not send Instagram, WhatsApp, Telegram, or email messages from this queue.',
        'Do not mutate person cards or Fact Store from this queue.',
        'Do not call live MailerLite, Gmail, Instagram, ManyChat, Google, Shopify, WhatsApp, or payment APIs.',
        'Do not treat a warmed score as automatic outreach approval.',
      ],
    },
  };
};

export const buildCrmVNextEngagementMovementQueue = async (options: QueueBuilderOptions = {}) => {
  const [ledger, cardPayload] = await Promise.all([
    readCrmEngagementSnapshotLedger(options.ledgerPath ?? undefined, {
      limit: options.snapshotLimit ?? 5,
      movementLimit: options.movementLimit ?? 100,
      now: options.now,
    }),
    loadPersonCardsVNext({
      preferStore: options.preferStore,
      legacyPath: options.legacyPath,
      cardStorePath: options.cardStorePath,
      now: options.now,
    }),
  ]);

  return buildCrmVNextEngagementMovementQueueFromLedger(ledger, cardPayload.cards, {
    now: options.now,
    limit: options.limit,
    includeUnchanged: options.includeUnchanged,
  });
};

export const labelCrmVNextEngagementMovementCode = labelFromCode;
