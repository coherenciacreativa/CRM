import { createHash } from 'node:crypto';

export const CRM_VNEXT_BHAKTI_WHATSAPP_EVIDENCE_SCHEMA_VERSION =
  'crm-vnext-bhakti-whatsapp-evidence-adapter-v0-2026-05-27';

const CARD_STORE_SCHEMA_VERSION = 'crm-vnext-person-card-store-2026-05-10';
const CARD_SCHEMA_VERSION = 'person-card-vnext-2026-05-08';

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

export const cleanEmail = (value) => {
  const raw = cleanString(value)?.toLowerCase() ?? null;
  if (!raw) return null;
  const match = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  return match && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(match) ? match.toLowerCase() : null;
};

export const phoneDigits = (value) => cleanString(value)?.replace(/\D/g, '') ?? '';

export const normalizePhone = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  const digits = phoneDigits(raw);
  if (!digits || digits.length < 7) return null;
  return raw.trim().startsWith('+') || raw.trim().startsWith('whatsapp:+') ? `+${digits}` : `+${digits}`;
};

const phoneKey = (value) => {
  const digits = phoneDigits(value);
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const latestIso = (...values) => {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((date) => date && !Number.isNaN(date.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const asCards = (cardStore) => {
  if (Array.isArray(cardStore)) return cardStore;
  return Array.isArray(cardStore?.cards) ? cardStore.cards : [];
};

const publicCard = (card) => card ? {
  personId: card.personId ?? null,
  displayName: card.displayName ?? null,
  identities: {
    email: card.identities?.email ?? null,
    instagramHandle: card.identities?.instagramHandle ?? null,
    phone: card.identities?.phone ?? null,
    phoneLast4: phoneDigits(card.identities?.phone).slice(-4) || null,
    city: card.identities?.city ?? null,
    country: card.identities?.country ?? null,
  },
  channels: {
    email: Boolean(card.channels?.email?.present),
    whatsapp: Boolean(card.channels?.whatsapp?.present),
    instagram: Boolean(card.channels?.instagram?.present),
  },
} : null;

const buildIndexes = (cards) => {
  const byEmail = new Map();
  const byPhone = new Map();
  for (const card of cards) {
    const email = cleanEmail(card?.identities?.email);
    const phone = phoneKey(card?.identities?.phone);
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), card]);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), card]);
  }
  return { byEmail, byPhone };
};

const userIdentity = (user) => ({
  email: cleanEmail(user?.email),
  phone: normalizePhone(user?.phone_e164 ?? user?.phone ?? user?.whatsapp),
  phoneKey: phoneKey(user?.phone_e164 ?? user?.phone ?? user?.whatsapp),
  displayName: cleanString(user?.name),
});

const isInternalOrTestUser = (user, identity) => {
  const email = identity.email ?? '';
  const name = cleanString(user?.name)?.toLowerCase() ?? '';
  const phone = phoneDigits(identity.phone);
  if (email === 'test@example.com') return true;
  if (email.startsWith('saludoalsol+')) return true;
  if (name.includes('alejandro test')) return true;
  if (phone === '573102862163' && (name.includes('test') || email.startsWith('saludoalsol+'))) return true;
  return false;
};

const sameCardSet = (left, right) => {
  const a = new Set(left.map((card) => card.personId));
  const b = new Set(right.map((card) => card.personId));
  if (a.size !== b.size) return false;
  return [...a].every((item) => b.has(item));
};

const matchUser = (user, indexes) => {
  const identity = userIdentity(user);
  if (isInternalOrTestUser(user, identity)) {
    return {
      status: 'excluded_internal_test',
      confidence: 'blocked',
      matchKind: 'internal_or_test_user',
      primaryCard: null,
      alternateCards: [],
    };
  }
  const emailMatches = identity.email ? indexes.byEmail.get(identity.email) ?? [] : [];
  const phoneMatches = identity.phoneKey ? indexes.byPhone.get(identity.phoneKey) ?? [] : [];

  if (emailMatches.length === 1) {
    const card = emailMatches[0];
    const phoneConflict = phoneMatches.length > 0 && !phoneMatches.some((candidate) => candidate.personId === card.personId);
    if (phoneConflict) {
      return {
        status: 'review_only',
        confidence: 'review_only',
        matchKind: 'email_match_phone_points_elsewhere',
        primaryCard: card,
        alternateCards: phoneMatches.filter((candidate) => candidate.personId !== card.personId),
      };
    }
    return {
      status: 'matched',
      confidence: 'strong',
      matchKind: 'email_exact',
      primaryCard: card,
      alternateCards: [],
    };
  }

  if (emailMatches.length > 1) {
    return {
      status: 'review_only',
      confidence: 'review_only',
      matchKind: 'multiple_email_matches',
      primaryCard: null,
      alternateCards: emailMatches,
    };
  }

  if (phoneMatches.length === 1) {
    return {
      status: 'matched',
      confidence: 'medium',
      matchKind: 'phone_exact_last10',
      primaryCard: phoneMatches[0],
      alternateCards: [],
    };
  }

  if (phoneMatches.length > 1) {
    return {
      status: 'review_only',
      confidence: 'review_only',
      matchKind: 'multiple_phone_matches',
      primaryCard: null,
      alternateCards: phoneMatches,
    };
  }

  return {
    status: identity.email && identity.phone ? 'new_card_candidate' : 'insufficient_identity',
    confidence: identity.email && identity.phone ? 'strong' : 'weak',
    matchKind: 'no_existing_card_match',
    primaryCard: null,
    alternateCards: [],
  };
};

const latestUserActivityAt = (user, eventSample = []) =>
  latestIso(
    user?.last_inbound_at,
    user?.last_status_at,
    user?.links_sent_at,
    user?.qa_sent_at,
    user?.updated_at,
    user?.trial_started_at,
    user?.start_ts,
    user?.created_at,
    ...eventSample.map((event) => event.created_at),
  );

const deliveryObservedAt = (user) =>
  latestIso(user?.links_sent_at, user?.qa_sent_at, user?.updated_at, user?.trial_started_at, user?.created_at);

const inferredDeliveredDays = (user) => {
  const dayIndex = Number(user?.day_index);
  if (Number.isFinite(dayIndex) && dayIndex > 0) return Math.max(1, Math.min(28, Math.floor(dayIndex)));
  if (user?.links_sent_at || user?.qa_sent_at) return 1;
  return 0;
};

const compactEventSample = (events = []) => {
  const actions = {};
  let latestAt = null;
  let inboundLike = 0;
  let deliveryLike = 0;
  for (const event of events) {
    const action = cleanString(event?.action) ?? 'unknown';
    actions[action] = (actions[action] ?? 0) + 1;
    if (event?.created_at && (!latestAt || event.created_at > latestAt)) latestAt = event.created_at;
    const joined = `${action} ${cleanString(event?.source) ?? ''}`.toLowerCase();
    if (joined.includes('inbound') || joined.includes('preference') || joined.includes('menu')) inboundLike += 1;
    if (joined.includes('send') || joined.includes('status') || joined.includes('link') || joined.includes('qa')) deliveryLike += 1;
  }
  return {
    eventsRead: events.length,
    latestAt,
    actions,
    inboundLike,
    deliveryLike,
  };
};

const readyPreview = ({ user, identity, match, eventSummary, generatedAt }) => {
  const card = match.primaryCard;
  const cardPhone = normalizePhone(card?.identities?.phone);
  const cardEmail = cleanEmail(card?.identities?.email);
  const hasSamePhone = cardPhone && identity.phone && phoneKey(cardPhone) === phoneKey(identity.phone);
  const missingPhone = card && identity.phone && !cardPhone;
  const missingEmail = card && identity.email && !cardEmail;

  if (match.status === 'review_only') {
    return {
      status: 'review_only',
      executed: false,
      wouldMutate: false,
      recommendedAction: 'defer_identity_review',
      reason: match.matchKind,
      operations: [],
    };
  }

  if (match.status === 'matched' && card) {
    const operations = [];
    if (missingPhone) {
      operations.push({
        operation: 'set_identity_phone_if_absent',
        field: 'identities.phone',
        value: identity.phone,
        source: 'bhakti_whatsapp.users.phone_e164',
      });
      operations.push({
        operation: 'mark_whatsapp_channel_present',
        field: 'channels.whatsapp',
        value: { present: true, status: 'known' },
        source: 'bhakti_whatsapp.users.phone_e164',
      });
    }
    if (missingEmail) {
      operations.push({
        operation: 'set_identity_email_if_absent',
        field: 'identities.email',
        value: identity.email,
        source: 'bhakti_whatsapp.users.email',
      });
    }
    operations.push({
      operation: 'add_evidence',
      source: 'bhakti_whatsapp.users',
      observedAt: latestUserActivityAt(user),
      summary: `Bhakti WhatsApp user ${user.id}: status=${user.status ?? 'unknown'}, day_index=${user.day_index ?? 'n/a'}.`,
    });

    return {
      status: operations.some((operation) => operation.operation.startsWith('set_')) ? 'ready_for_write_review' : 'already_covered',
      executed: false,
      wouldMutate: operations.some((operation) => operation.operation.startsWith('set_') || operation.operation === 'add_evidence'),
      recommendedAction: operations.some((operation) => operation.operation.startsWith('set_'))
        ? 'enrich_existing_card'
        : 'append_evidence_only_optional',
      target: { personId: card.personId, matchKind: match.matchKind, confidence: match.confidence },
      operations,
      safeguards: [
        'local CRM write only after explicit Alejandro approval',
        'set identity fields only when absent',
        'never overwrite an existing phone/email from Bhakti automatically',
        'no outbound, no Twilio, no Supabase mutation',
      ],
    };
  }

  if (match.status === 'new_card_candidate') {
    return {
      status: 'ready_for_write_review',
      executed: false,
      wouldMutate: true,
      recommendedAction: 'stage_create_review_card',
      target: { personId: `email:${identity.email}`, matchKind: match.matchKind, confidence: match.confidence },
      operations: [
        {
          operation: 'stage_create_review_card',
          card: {
            schemaVersion: CARD_SCHEMA_VERSION,
            personId: `email:${identity.email}`,
            displayName: identity.displayName,
            identities: {
              email: identity.email,
              instagramHandle: null,
              instagramUserId: null,
              phone: identity.phone,
              city: null,
              country: null,
            },
            channels: {
              email: { present: true, status: 'known' },
              instagram: { present: false, status: null },
              whatsapp: { present: true, status: 'known' },
              telegram: { present: false, status: null },
            },
            evidence: [
              {
                source: 'bhakti_whatsapp.users',
                observedAt: latestUserActivityAt(user),
                note: `Bhakti WhatsApp user ${user.id}; status=${user.status ?? 'unknown'}; eventsRead=${eventSummary.eventsRead}.`,
              },
            ],
            updatedAt: generatedAt,
          },
        },
      ],
      safeguards: [
        'new card remains review-card until approved',
        'identity is email+phone from Bhakti users table, not name-only',
        'dedupe should be rechecked immediately before write',
      ],
    };
  }

  return {
    status: match.status === 'excluded_internal_test' ? 'excluded_internal_test' : 'discarded_or_blocked',
    executed: false,
    wouldMutate: false,
    recommendedAction: match.status === 'excluded_internal_test' ? 'exclude_internal_test_user' : 'keep_unresolved',
    reason: match.status,
    operations: [],
  };
};

const signalEventsFor = ({ user, identity, match, generatedAt, eventSummary }) => {
  const subject = {
    personId: match.primaryCard?.personId ?? (identity.email ? `email:${identity.email}` : null),
    email: identity.email,
    phone: identity.phone,
    instagramHandle: match.primaryCard?.identities?.instagramHandle ?? null,
  };
  const tags = unique([
    'source:bhakti_whatsapp',
    'product:digital',
    user?.status ? `bhakti_status:${user.status}` : null,
    user?.route_mode ? `route:${user.route_mode}` : null,
    user?.source ? `origin:${user.source}` : null,
    user?.day_index !== null && user?.day_index !== undefined && Number.isFinite(Number(user.day_index))
      ? `day_index:${Number(user.day_index)}`
      : null,
  ]);
  const events = [];
  const deliveredDays = inferredDeliveredDays(user);
  const observedAt = deliveryObservedAt(user);
  if (deliveredDays > 0 && observedAt) {
    events.push({
      sourceKind: 'bhakti_whatsapp',
      sourceId: `bhakti_user:${user.id}:recording_delivery_snapshot`,
      eventKind: 'recording_delivery',
      channel: 'whatsapp',
      direction: 'outbound',
      strength: 'medium',
      quantity: deliveredDays,
      observedAt,
      capturedAt: generatedAt,
      subject,
      metrics: {
        productKind: 'digital',
        dayIndex: Number(user?.day_index) || null,
        deliveredDays,
        status: user?.status ?? null,
        linksSentAt: user?.links_sent_at ?? null,
        qaSentAt: user?.qa_sent_at ?? null,
        eventLogDeliveryLike: eventSummary.deliveryLike,
      },
      tags,
      evidence: {
        summary: `Bhakti WhatsApp delivery/progress snapshot; deliveredDays=${deliveredDays}; status=${user.status ?? 'unknown'}.`,
        sourceIds: [`bhakti_user:${user.id}`],
      },
    });
  }

  const inboundAt = latestIso(user?.last_inbound_at);
  if (inboundAt) {
    events.push({
      sourceKind: 'bhakti_whatsapp',
      sourceId: `bhakti_user:${user.id}:last_inbound_snapshot`,
      eventKind: 'unknown',
      channel: 'whatsapp',
      direction: 'inbound',
      strength: 'medium',
      quantity: 1,
      observedAt: inboundAt,
      capturedAt: generatedAt,
      subject,
      metrics: {
        productKind: 'digital',
        lastInboundAt: inboundAt,
        status: user?.status ?? null,
        eventLogInboundLike: eventSummary.inboundLike,
      },
      tags: unique([...tags, 'event:last_inbound_at']),
      evidence: {
        summary: 'Bhakti WhatsApp user has last_inbound_at in Supabase users table.',
        sourceIds: [`bhakti_user:${user.id}`],
      },
    });
  }

  return events;
};

export const buildBhaktiWhatsappEvidencePacket = ({
  users,
  cardStore,
  eventSamplesByPhone = {},
  eventLogAudit = null,
  now = new Date(),
  source = {},
} = {}) => {
  const generatedAt = isoNow(now);
  const cards = asCards(cardStore);
  const indexes = buildIndexes(cards);
  const items = [];
  const signalEvents = [];

  for (const user of Array.isArray(users) ? users : []) {
    const identity = userIdentity(user);
    const samples = eventSamplesByPhone[identity.phone] ?? eventSamplesByPhone[user?.phone_e164] ?? [];
    const eventSummary = compactEventSample(samples);
    const match = matchUser(user, indexes);
    const preview = readyPreview({ user, identity, match, eventSummary, generatedAt });
    const userSignalEvents = match.status === 'excluded_internal_test'
      ? []
      : signalEventsFor({ user, identity, match, generatedAt, eventSummary });
    signalEvents.push(...userSignalEvents);
    items.push({
      contactKey: identity.email ? `email:${identity.email}` : `bhakti_user:${user?.id ?? hashId([identity.phone])}`,
      bhaktiUserId: user?.id ?? null,
      identity: {
        displayName: identity.displayName,
        email: identity.email,
        phone: identity.phone,
        phoneLast4: phoneDigits(identity.phone).slice(-4) || null,
      },
      bhaktiState: {
        status: user?.status ?? null,
        source: user?.source ?? null,
        dayIndex: user?.day_index !== null && user?.day_index !== undefined && Number.isFinite(Number(user.day_index))
          ? Number(user.day_index)
          : null,
        routeMode: user?.route_mode ?? null,
        timeCode: user?.time_code ?? null,
        timezone: user?.tz ?? null,
        trialStartedAt: user?.trial_started_at ?? null,
        startTs: user?.start_ts ?? null,
        createdAt: user?.created_at ?? null,
        updatedAt: user?.updated_at ?? null,
        lastInboundAt: user?.last_inbound_at ?? null,
        linksSentAt: user?.links_sent_at ?? null,
        qaSentAt: user?.qa_sent_at ?? null,
        latestActivityAt: latestUserActivityAt(user, samples),
      },
      match: {
        status: match.status,
        confidence: match.confidence,
        matchKind: match.matchKind,
        primaryCard: publicCard(match.primaryCard),
        alternateCards: match.alternateCards.map(publicCard),
      },
      eventLogSummary: eventSummary,
      signalEventsPrepared: userSignalEvents.length,
      readyWritePreview: preview,
    });
  }

  const matchedItems = items.filter((item) => item.match.status === 'matched');
  const readyItems = items.filter((item) => item.readyWritePreview.status === 'ready_for_write_review');
  const readyExisting = readyItems.filter((item) => item.readyWritePreview.recommendedAction === 'enrich_existing_card');
  const readyNew = readyItems.filter((item) => item.readyWritePreview.recommendedAction === 'stage_create_review_card');
  const reviewOnly = items.filter((item) => item.match.status === 'review_only');
  const alreadyCovered = items.filter((item) => item.readyWritePreview.status === 'already_covered');

  return {
    schemaVersion: CRM_VNEXT_BHAKTI_WHATSAPP_EVIDENCE_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_bhakti_whatsapp_evidence_adapter_v0',
    source: {
      bhakti: {
        kind: 'supabase_rest_read_only',
        rootLabel: source.bhaktiRootLabel ?? 'bhakti-whatsapp',
        usersTable: 'users',
        eventLog: eventLogAudit ?? { mode: 'not_requested' },
      },
      crm: {
        kind: 'vnext-person-card-store',
        schemaVersion: cardStore?.schemaVersion ?? CARD_STORE_SCHEMA_VERSION,
        cardStorePathLabel: source.cardStorePathLabel ?? '.crm-vnext/person-card-store/person-cards-vnext.json',
      },
    },
    summary: {
      usersRead: items.length,
      usersWithEmail: items.filter((item) => item.identity.email).length,
      usersWithPhone: items.filter((item) => item.identity.phone).length,
      usersActive: items.filter((item) => item.bhaktiState.status === 'active').length,
      usersPaused: items.filter((item) => item.bhaktiState.status === 'paused').length,
      crmCardsRead: cards.length,
      matchedExisting: matchedItems.length,
      matchedByEmail: matchedItems.filter((item) => item.match.matchKind === 'email_exact').length,
      matchedByPhoneOnly: matchedItems.filter((item) => item.match.matchKind === 'phone_exact_last10').length,
      readyForWriteReview: readyItems.length,
      readyExistingEnrichments: readyExisting.length,
      readyNewCardProposals: readyNew.length,
      alreadyCovered: alreadyCovered.length,
      reviewOnly: reviewOnly.length,
      insufficientIdentity: items.filter((item) => item.match.status === 'insufficient_identity').length,
      excludedInternalTestUsers: items.filter((item) => item.match.status === 'excluded_internal_test').length,
      signalEventsPrepared: signalEvents.length,
      signalSubjectsWithExistingCard: matchedItems.filter((item) => item.signalEventsPrepared > 0).length,
      eventLogUsersSampled: eventLogAudit?.usersSampled ?? 0,
      eventLogRowsRead: eventLogAudit?.rowsRead ?? 0,
      operationsExecuted: 0,
      cardMutationsExecuted: 0,
      externalMutationsExecuted: 0,
    },
    readyWriteItems: readyItems,
    reviewOnlyItems: reviewOnly,
    alreadyCoveredItems: alreadyCovered,
    items,
    signalEvents,
    finalAuthorizationPacket: {
      status: readyItems.length ? 'ready_for_single_human_approval' : 'nothing_to_apply',
      approvalScope: 'local_crm_card_store_only',
      candidateCounts: {
        readyExistingEnrichments: readyExisting.length,
        readyNewCardProposals: readyNew.length,
        reviewOnly: reviewOnly.length,
        alreadyCovered: alreadyCovered.length,
      },
      allowedAfterApproval: [
        'Add missing phone/email identities only when absent and supported by Bhakti email+phone evidence.',
        'Create review cards for no-match Bhakti users with email+phone only after a final dedupe preflight.',
        'Append Bhakti evidence notes to local CRM cards.',
      ],
      stillForbidden: [
        'Supabase mutations',
        'Twilio/WhatsApp sends',
        'MailerLite mutations',
        'Fact Store writes',
        'Outbound messages',
        'Overwriting existing CRM identity fields',
      ],
    },
    safety: {
      readOnlyExtraction: true,
      supabaseReadOnlyGetRequests: true,
      supabaseMutationsExecuted: false,
      twilioCallsExecuted: false,
      whatsappOutboundExecuted: false,
      mailerLiteMutationsExecuted: false,
      factStoreWritesExecuted: false,
      crmCardWritesExecuted: false,
      credentialsPrinted: false,
      bhaktiIsEvidenceSourceNotSourceOfTruth: true,
    },
  };
};

export const markdownForBhaktiWhatsappEvidencePacket = (packet) => {
  const lines = [
    '# CRM vNext Bhakti WhatsApp Evidence Adapter v0',
    '',
    `Generated: ${packet.generatedAt}`,
    '',
    '## Safety',
    '',
    '- Supabase: read-only GETs only',
    '- Twilio/WhatsApp outbound: no',
    '- MailerLite mutations: no',
    '- CRM card writes: no',
    '- Fact Store writes: no',
    '- Credentials printed: no',
    '',
    '## Summary',
    '',
    `- Bhakti users read: **${packet.summary.usersRead}**`,
    `- Users with email + phone: **${packet.summary.usersWithEmail}/${packet.summary.usersWithPhone}**`,
    `- CRM cards read: **${packet.summary.crmCardsRead}**`,
    `- Existing card matches: **${packet.summary.matchedExisting}**`,
    `- Ready for write review: **${packet.summary.readyForWriteReview}**`,
    `- Existing enrichments: **${packet.summary.readyExistingEnrichments}**`,
    `- New review-card proposals: **${packet.summary.readyNewCardProposals}**`,
    `- Already covered: **${packet.summary.alreadyCovered}**`,
    `- Review-only/conflicts: **${packet.summary.reviewOnly}**`,
    `- Signal events prepared: **${packet.summary.signalEventsPrepared}**`,
    `- Event log sampled users/rows: **${packet.summary.eventLogUsersSampled}/${packet.summary.eventLogRowsRead}**`,
    '',
    '## Ready For Approval',
    '',
    '| Contact | Action | Target | Evidence |',
    '|---|---|---|---|',
  ];

  for (const item of packet.readyWriteItems.slice(0, 80)) {
    lines.push(`| ${item.identity.displayName ?? item.identity.email ?? item.contactKey} | ${item.readyWritePreview.recommendedAction} | ${item.readyWritePreview.target?.personId ?? item.readyWritePreview.target?.matchKind ?? '-'} | status=${item.bhaktiState.status ?? '-'}, day=${item.bhaktiState.dayIndex ?? '-'}, phone=${item.identity.phoneLast4 ? `***${item.identity.phoneLast4}` : '-'} |`);
  }

  if (packet.readyWriteItems.length > 80) {
    lines.push(`| ... | ${packet.readyWriteItems.length - 80} more ready items in JSON | ... | ... |`);
  }

  lines.push('', '## Review Only', '');
  if (!packet.reviewOnlyItems.length) lines.push('- None.');
  for (const item of packet.reviewOnlyItems.slice(0, 40)) {
    lines.push(`- ${item.identity.displayName ?? item.identity.email ?? item.contactKey}: ${item.match.matchKind}`);
  }

  lines.push('', '## Final Authorization Gate', '');
  lines.push('This packet is ready for one consolidated local CRM-card approval. Approval must still be explicit and should only cover local card-store writes from this packet.');
  lines.push('');
  return `${lines.join('\n')}\n`;
};
