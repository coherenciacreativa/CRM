import { readCrmSignalEventLedger } from './crm-vnext-signal-event-ledger.js';

export const CRM_VNEXT_SIGNAL_EVENT_PROJECTION_SCHEMA_VERSION =
  'crm-vnext-signal-event-projection-2026-05-21';

const DAY_MS = 24 * 60 * 60 * 1000;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
};

const cleanBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
    if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  }
  return undefined;
};

const asArray = (value) => Array.isArray(value) ? value : [];

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const daysSince = (value, now) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
};

const inWindow = (value, now, days) => {
  const age = daysSince(value, now);
  return age !== null && age <= days;
};

const sourceKindFor = (event) => {
  const sourceKind = cleanString(event.source?.kind)?.toLowerCase() ?? 'unknown';
  const channel = cleanString(event.event?.channel)?.toLowerCase() ?? 'unknown';
  const kind = cleanString(event.event?.kind)?.toLowerCase() ?? 'unknown';

  if (sourceKind.includes('shopify')) return 'shopify_activity';
  if (sourceKind.includes('payment') || sourceKind.includes('mercado') || sourceKind.includes('paypal')) return 'payment_activity';
  if (kind === 'purchase' || channel === 'commerce') return 'commerce_activity';
  if (sourceKind.includes('bhakti')) return 'bhakti_whatsapp_activity';
  if (channel === 'whatsapp') return 'whatsapp_activity';
  if (sourceKind.includes('classbot') || channel === 'classbot') return 'classbot_activity';
  if (kind.startsWith('instagram_') || channel === 'instagram') return 'instagram_activity';
  if (sourceKind.includes('gmail') || kind === 'email_reply') return 'gmail_reply_activity';
  if (sourceKind.includes('mailerlite')) return 'mailerlite_subscriber_activity';
  if (kind.startsWith('email_') || channel === 'email') return 'email_activity';
  if (sourceKind.includes('manual') || sourceKind.includes('alejandro') || kind === 'human_report') {
    return 'manual_engagement_snapshot';
  }
  return 'unknown';
};

const productKindFor = (event) => {
  const raw = [
    event.event?.metrics?.productKind,
    event.event?.metrics?.product_kind,
    event.event?.metrics?.product,
    event.event?.metrics?.sku,
    ...asArray(event.event?.tags),
  ]
    .map((value) => cleanString(value)?.toLowerCase())
    .filter(Boolean)
    .join(' ');

  if (!raw) return null;
  if (raw.includes('mentoria') || raw.includes('mentor') || raw.includes('coaching')) return 'mentorship';
  if (raw.includes('terapia') || raw.includes('therapy') || raw.includes('psicoterapia') || raw.includes('consulta')) return 'therapy';
  if (raw.includes('retiro') || raw.includes('retreat')) return 'retreat';
  if (raw.includes('yoga')) return 'yoga';
  if (raw.includes('curso') || raw.includes('digital') || raw.includes('meditacion') || raw.includes('meditación')) return 'digital';
  return null;
};

const amountFor = (metrics = {}) =>
  cleanNumber(metrics.totalSpend ?? metrics.amount ?? metrics.value ?? metrics.price ?? metrics.total ?? metrics.revenue);

const baseSignal = (event) => ({
  sourceKind: sourceKindFor(event),
  sourceId: event.eventId,
  personId: cleanString(event.subject?.personId),
  email: cleanString(event.subject?.email),
  instagramHandle: cleanString(event.subject?.instagramHandle),
  phone: cleanString(event.subject?.phone),
  observedAt: event.observedAt,
  tags: [
    ...asArray(event.event?.tags),
    event.event?.kind ? `event:${event.event.kind}` : null,
    event.source?.kind ? `source:${event.source.kind}` : null,
  ].filter(Boolean),
});

const emailProjection = (event, signal, now) => {
  const kind = event.event.kind;
  const metrics = event.event.metrics ?? {};
  const quantity = cleanNumber(event.event.quantity) || 1;
  const recent30 = inWindow(event.observedAt, now, 30);
  const recent90 = inWindow(event.observedAt, now, 90);

  if (kind === 'email_engagement_snapshot') {
    return {
      ...signal,
      emailActivity: {
        opens30d: cleanNumber(metrics.opens30d),
        clicks30d: cleanNumber(metrics.clicks30d),
        replies30d: cleanNumber(metrics.replies30d),
        opens90d: cleanNumber(metrics.opens90d),
        clicks90d: cleanNumber(metrics.clicks90d),
        lifetimeOpens: cleanNumber(metrics.lifetimeOpens),
        lifetimeClicks: cleanNumber(metrics.lifetimeClicks),
        lifetimeSent: cleanNumber(metrics.lifetimeSent),
        openRate: cleanNumber(metrics.openRate),
        clickRate: cleanNumber(metrics.clickRate),
        lastOpenAt: cleanString(metrics.lastOpenAt),
        lastClickAt: cleanString(metrics.lastClickAt),
        lastReplyAt: cleanString(metrics.lastReplyAt),
        subscribedAt: cleanString(metrics.subscribedAt),
        subscriberStatus: cleanString(metrics.subscriberStatus),
      },
    };
  }

  if (kind === 'email_open') {
    return {
      ...signal,
      opens30d: recent30 ? quantity : 0,
      opens90d: recent90 ? quantity : 0,
      lifetimeOpens: quantity,
      lastOpenAt: event.observedAt,
    };
  }

  if (kind === 'email_click') {
    return {
      ...signal,
      clicks30d: recent30 ? quantity : 0,
      clicks90d: recent90 ? quantity : 0,
      lifetimeClicks: quantity,
      lastClickAt: event.observedAt,
    };
  }

  if (kind === 'email_reply') {
    return {
      ...signal,
      replies30d: recent30 ? quantity : 0,
      lastReplyAt: event.observedAt,
    };
  }

  if (kind === 'email_sent') {
    return {
      ...signal,
      lifetimeSent: quantity,
    };
  }

  if (kind === 'email_suppression') {
    return {
      ...signal,
      subscriberStatus: cleanString(metrics.subscriberStatus) ?? 'unsubscribed',
    };
  }

  return null;
};

const instagramProjection = (event, signal, now) => {
  const kind = event.event.kind;
  const metrics = event.event.metrics ?? {};
  const quantity = cleanNumber(event.event.quantity) || 1;
  const recent30 = inWindow(event.observedAt, now, 30);

  if (kind === 'instagram_engagement_snapshot') {
    return {
      ...signal,
      instagramActivity: {
        inboundDm30d: cleanNumber(metrics.inboundDm30d),
        comments30d: cleanNumber(metrics.comments30d),
        likes30d: cleanNumber(metrics.likes30d),
        storyViews30d: cleanNumber(metrics.storyViews30d),
        follows: cleanBoolean(metrics.follows),
        lastInteractionAt: cleanString(metrics.lastInteractionAt) ?? event.observedAt,
      },
    };
  }

  if (kind === 'instagram_dm') return { ...signal, inboundDm30d: recent30 ? quantity : 0, lastInteractionAt: event.observedAt };
  if (kind === 'instagram_comment') return { ...signal, comments30d: recent30 ? quantity : 0, lastInteractionAt: event.observedAt };
  if (kind === 'instagram_like') return { ...signal, likes30d: recent30 ? quantity : 0, lastInteractionAt: event.observedAt };
  if (kind === 'instagram_story_view') return { ...signal, storyViews30d: recent30 ? quantity : 0, lastInteractionAt: event.observedAt };
  if (kind === 'instagram_follow') return { ...signal, follows: true, lastInteractionAt: event.observedAt };

  return null;
};

const whatsappProjection = (event, signal, now) => {
  const kind = event.event.kind;
  const quantity = cleanNumber(event.event.quantity) || 1;
  const recent30 = inWindow(event.observedAt, now, 30);

  if (kind === 'recording_delivery') {
    return {
      ...signal,
      whatsappAutomationDeliveries30d: recent30 ? quantity : 0,
      lastWhatsappInteractionAt: event.observedAt,
    };
  }

  if (kind === 'manual_observation' || kind === 'human_report' || kind === 'identity_observation') {
    return null;
  }

  return {
    ...signal,
    whatsappInboundMessages30d: recent30 ? quantity : 0,
    whatsappReplies30d: event.event.direction === 'inbound' && recent30 ? quantity : 0,
    lastWhatsappInteractionAt: event.observedAt,
  };
};

const participationProjection = (event, signal, now) => {
  const kind = event.event.kind;
  const quantity = cleanNumber(event.event.quantity) || 1;
  const recent90 = inWindow(event.observedAt, now, 90);

  if (kind === 'class_attendance') {
    return {
      ...signal,
      sourceKind: signal.sourceKind === 'unknown' ? 'classbot_activity' : signal.sourceKind,
      participationActivity: {
        yogaClasses90d: recent90 ? quantity : 0,
        lastAttendanceAt: event.observedAt,
      },
    };
  }

  if (kind === 'community_event_attendance') {
    return {
      ...signal,
      participationActivity: {
        happyCircle90d: recent90 ? quantity : 0,
        lastAttendanceAt: event.observedAt,
      },
    };
  }

  if (kind === 'retreat_attendance') {
    return {
      ...signal,
      participationActivity: {
        retreatsAttended: quantity,
        lastAttendanceAt: event.observedAt,
      },
    };
  }

  return null;
};

const purchaseProjection = (event, signal) => {
  if (event.event.kind !== 'purchase') return null;

  const metrics = event.event.metrics ?? {};
  const amount = amountFor(metrics);
  const quantity = cleanNumber(event.event.quantity) || 1;
  const productKind = productKindFor(event);
  const purchaseActivity = {
    totalSpend: amount,
    purchaseCount: quantity,
    activeClient: true,
    lastPurchaseAt: event.observedAt,
  };

  if (productKind === 'mentorship') purchaseActivity.mentorshipSessions = quantity;
  if (productKind === 'therapy') purchaseActivity.therapySessions = quantity;
  if (productKind === 'digital') purchaseActivity.digitalProductsPurchased = quantity;
  if (productKind === 'retreat') purchaseActivity.retreatsPurchased = quantity;

  return {
    ...signal,
    purchaseActivity,
    tags: productKind ? [...signal.tags, `product:${productKind}`] : signal.tags,
  };
};

export const projectSignalEventToEngagementSignal = (event, options = {}) => {
  const now = new Date(isoNow(options.now));
  if (event?.sensitivity?.restricted === true && options.includeRestricted !== true) {
    return {
      signal: null,
      skipped: {
        eventId: event.eventId,
        reason: 'restricted_review_only',
        eventKind: cleanString(event.event?.kind) ?? 'unknown',
      },
    };
  }

  const signal = baseSignal(event);
  const kind = cleanString(event.event?.kind) ?? 'unknown';
  const channel = cleanString(event.event?.channel) ?? 'unknown';

  const projected =
    emailProjection(event, signal, now)
    ?? instagramProjection(event, signal, now)
    ?? participationProjection(event, signal, now)
    ?? purchaseProjection(event, signal)
    ?? whatsappProjection(event, signal, now);

  if (!projected) {
    return {
      signal: null,
      skipped: {
        eventId: event.eventId,
        reason: 'unsupported_event_kind',
        eventKind: kind,
        channel,
      },
    };
  }

  return { signal: projected, skipped: null };
};

const summarize = (signals, skipped) => {
  const bySourceKind = {};
  const bySkipReason = {};
  for (const signal of signals) {
    bySourceKind[signal.sourceKind] = (bySourceKind[signal.sourceKind] ?? 0) + 1;
  }
  for (const item of skipped) {
    bySkipReason[item.reason] = (bySkipReason[item.reason] ?? 0) + 1;
  }
  return {
    signalsGenerated: signals.length,
    skippedEvents: skipped.length,
    bySourceKind,
    bySkipReason,
  };
};

const safety = () => ({
  localOnly: true,
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  scoreMutationProhibited: true,
  projectionOnly: true,
  allowedUse: [
    'Project canonical signal events into engagement preview inputs.',
    'Let future sources such as Shopify, Bhakti WhatsApp, payments, and ClassBot feed the same scoring preview lane.',
    'Skip restricted events by default until a reviewed policy allows them.',
  ],
  prohibitedActions: [
    'Do not mutate cards, Fact Store, source systems, or scores from this projection.',
    'Do not send outbound messages.',
    'Do not call live APIs or read credentials.',
    'Do not treat projected warmth as outreach permission.',
  ],
});

export const buildCrmSignalEventProjection = (input = {}) => {
  const generatedAt = isoNow(input.now);
  const events = asArray(input.events);
  const projected = events.map((event) => projectSignalEventToEngagementSignal(event, {
    now: generatedAt,
    includeRestricted: input.includeRestricted === true,
  }));
  const signals = projected.map((item) => item.signal).filter(Boolean);
  const skippedEvents = projected.map((item) => item.skipped).filter(Boolean);

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_EVENT_PROJECTION_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_signal_event_projection',
    source: {
      eventsRead: events.length,
      includeRestricted: input.includeRestricted === true,
    },
    summary: summarize(signals, skippedEvents),
    signals,
    skippedEvents,
    safety: safety(),
  };
};

export const buildCrmSignalEventProjectionFromLedger = async (options = {}) => {
  const ledger = await readCrmSignalEventLedger(options.ledgerPath, {
    now: options.now,
    limit: options.limit ?? 5000,
  });
  return buildCrmSignalEventProjection({
    events: ledger.events,
    now: options.now ?? ledger.generatedAt,
    includeRestricted: options.includeRestricted,
  });
};
