import { createHash } from 'node:crypto';

export const CRM_VNEXT_WHATSAPP_GROUP_ROSTER_EVIDENCE_SCHEMA_VERSION =
  'crm-vnext-whatsapp-group-roster-evidence-v0-2026-05-27';

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

const stripDiacritics = (value) =>
  (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value) =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

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
  return `+${digits}`;
};

export const phoneKey = (value) => {
  const digits = phoneDigits(value);
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined ? [] : [value];
};

const asCards = (cardStore) => {
  if (Array.isArray(cardStore)) return cardStore;
  return Array.isArray(cardStore?.cards) ? cardStore.cards : [];
};

const asStringArray = (value) => {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  const cleaned = cleanString(value);
  if (!cleaned) return [];
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.map(cleanString).filter(Boolean);
    } catch {
      // Fall through.
    }
  }
  return cleaned.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
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

const buildCardIndexes = (cards) => {
  const byEmail = new Map();
  const byPhone = new Map();
  const byName = new Map();
  for (const card of cards) {
    const email = cleanEmail(card?.identities?.email);
    const phone = phoneKey(card?.identities?.phone);
    const name = normalizeText(card?.displayName);
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), card]);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), card]);
    if (name && name.length >= 5) byName.set(name, [...(byName.get(name) ?? []), card]);
  }
  return { byEmail, byPhone, byName };
};

const cleanRosterDisplayName = (value) => {
  const raw = cleanString(value) ?? '';
  const withoutMaybe = raw.replace(/^Maybe\s*/i, '').replace(/^‎?Maybe ?/i, '');
  const withoutPhone = withoutMaybe.replace(/\+[\d\s().‑-]{7,}$/u, '').trim();
  const withoutTrailingStatus = withoutPhone
    .replace(/,\s*Admin$/i, '')
    .replace(/,\s*Disponible$/i, '')
    .replace(/,\s*Status$/i, '')
    .trim();
  const firstCommaPart = withoutTrailingStatus.includes(',')
    ? withoutTrailingStatus.split(',')[0].trim()
    : withoutTrailingStatus;
  return cleanString(firstCommaPart) ?? cleanString(withoutTrailingStatus) ?? null;
};

const cleanRosterEntry = (entry, index) => {
  const raw = cleanString(entry?.displayNameRaw ?? entry?.displayName ?? entry?.name ?? entry);
  const phone = normalizePhone(entry?.phone ?? raw);
  const displayName = cleanRosterDisplayName(raw);
  const sourceNote = cleanString(entry?.sourceNote);
  const isMaybe = /^‎?Maybe|^Maybe/i.test(raw ?? '');
  const phoneOnly = Boolean(phone && (!displayName || normalizeText(displayName) === phoneDigits(displayName)));
  return {
    rowId: cleanString(entry?.rowId) ?? `whatsapp-member-${index + 1}`,
    raw,
    displayName,
    phone,
    phoneKey: phoneKey(phone),
    sourceNote,
    isMaybe,
    phoneOnly,
  };
};

const contactName = (contact) =>
  cleanString(contact?.fullName)
  ?? cleanString(contact?.name)
  ?? cleanString([
    contact?.firstName,
    contact?.middleName,
    contact?.lastName,
  ].map(cleanString).filter(Boolean).join(' '));

const contactEmails = (contact) => unique([
  ...asStringArray(contact?.email),
  ...asStringArray(contact?.emails),
].map(cleanEmail));

const contactPhones = (contact) => unique([
  ...asStringArray(contact?.phone),
  ...asStringArray(contact?.phones),
].map(normalizePhone));

const contactSocials = (contact) => unique([
  ...asStringArray(contact?.instagramHandle),
  ...asStringArray(contact?.socials),
]);

const cleanContact = (contact) => ({
  sourceId: cleanString(contact?.sourceId) ?? (contact?.id === null || contact?.id === undefined ? null : `contacts:record:${contact.id}`),
  fullName: contactName(contact),
  emails: contactEmails(contact),
  phones: contactPhones(contact),
  socials: contactSocials(contact),
  organization: cleanString(contact?.organization),
  notes: cleanString(contact?.notes),
});

const contactMatchesEntry = (contact, entry) => {
  const phones = contact.phones.map(phoneKey).filter(Boolean);
  if (entry.phoneKey && phones.includes(entry.phoneKey)) return { score: 1000, kind: 'contacts_phone_exact_last10' };
  const entryName = normalizeText(entry.displayName);
  const contactNameText = normalizeText(contact.fullName);
  if (!entryName || !contactNameText) return { score: 0, kind: 'no_match' };
  if (entryName === contactNameText) return { score: 650, kind: 'contacts_name_exact' };
  const entryTokens = entryName.split(/\s+/).filter((token) => token.length >= 4);
  const contactTokens = contactNameText.split(/\s+/).filter((token) => token.length >= 4);
  const overlap = entryTokens.filter((token) => contactTokens.includes(token));
  if (entryTokens.length >= 2 && overlap.length >= 2) return { score: 420, kind: 'contacts_name_token_overlap' };
  return { score: 0, kind: 'no_match' };
};

const contactCandidatesForEntry = (entry, contacts) => {
  const candidates = contacts
    .map((contact) => ({ contact, match: contactMatchesEntry(contact, entry) }))
    .filter((item) => item.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score);
  const bestScore = candidates[0]?.match.score ?? 0;
  const strong = candidates.filter((item) => item.match.score === bestScore && item.match.score >= 650);
  return {
    all: candidates.slice(0, 5).map((item) => ({
      matchKind: item.match.kind,
      score: item.match.score,
      contact: item.contact,
    })),
    selected: strong.length === 1 ? strong[0] : null,
  };
};

const mergeIdentity = (entry, selectedContact) => {
  const contact = selectedContact?.contact ?? null;
  return {
    displayName: entry.displayName ?? contact?.fullName ?? null,
    email: contact?.emails?.[0] ?? null,
    phone: entry.phone ?? contact?.phones?.[0] ?? null,
    phoneKey: phoneKey(entry.phone ?? contact?.phones?.[0]),
    contactBridgeKind: selectedContact?.match.kind ?? null,
  };
};

const matchIdentityToCard = (identity, indexes) => {
  const emailMatches = identity.email ? indexes.byEmail.get(identity.email) ?? [] : [];
  const phoneMatches = identity.phoneKey ? indexes.byPhone.get(identity.phoneKey) ?? [] : [];
  const nameMatches = identity.displayName
    ? indexes.byName.get(normalizeText(identity.displayName)) ?? []
    : [];

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
    return { status: 'matched', confidence: 'strong', matchKind: 'email_exact', primaryCard: card, alternateCards: [] };
  }
  if (emailMatches.length > 1) {
    return { status: 'review_only', confidence: 'review_only', matchKind: 'multiple_email_matches', primaryCard: null, alternateCards: emailMatches };
  }
  if (phoneMatches.length === 1) {
    return { status: 'matched', confidence: 'strong', matchKind: 'phone_exact_last10', primaryCard: phoneMatches[0], alternateCards: [] };
  }
  if (phoneMatches.length > 1) {
    return { status: 'review_only', confidence: 'review_only', matchKind: 'multiple_phone_matches', primaryCard: null, alternateCards: phoneMatches };
  }
  if (nameMatches.length === 1) {
    return { status: 'review_only', confidence: 'review_only', matchKind: 'name_only_existing_card_candidate', primaryCard: nameMatches[0], alternateCards: [] };
  }
  if (nameMatches.length > 1) {
    return { status: 'review_only', confidence: 'review_only', matchKind: 'multiple_name_only_candidates', primaryCard: null, alternateCards: nameMatches };
  }
  if (identity.phone && identity.displayName) {
    return { status: 'new_card_candidate', confidence: identity.email ? 'strong' : 'medium', matchKind: identity.email ? 'contacts_email_phone_no_existing_match' : 'whatsapp_group_phone_no_existing_match', primaryCard: null, alternateCards: [] };
  }
  return { status: 'insufficient_identity', confidence: 'weak', matchKind: 'name_only_or_no_identity', primaryCard: null, alternateCards: [] };
};

const evidenceSummary = (group, entry, identity, contactBridge) => {
  const parts = [
    `${group.name}: member visible in WhatsApp group roster.`,
    entry.raw && entry.raw !== entry.displayName ? `WhatsApp label: ${entry.raw}.` : null,
    identity.phone ? `Phone: ${identity.phone}.` : null,
    identity.email ? `Contacts email bridge: ${identity.email}.` : null,
    contactBridge ? `Contacts bridge: ${contactBridge.matchKind}.` : null,
  ];
  return parts.filter(Boolean).join(' ');
};

const readyPreview = ({ group, entry, identity, match, contactBridge, generatedAt }) => {
  if (match.status === 'matched' && match.primaryCard) {
    const card = match.primaryCard;
    const existingPhone = normalizePhone(card.identities?.phone);
    const existingEmail = cleanEmail(card.identities?.email);
    const operations = [];
    if (identity.phone && !existingPhone) {
      operations.push({
        operation: 'set_identity_phone_if_absent',
        field: 'identities.phone',
        value: identity.phone,
        source: 'whatsapp_group_roster_or_contacts_bridge',
      });
    }
    if (identity.email && !existingEmail) {
      operations.push({
        operation: 'set_identity_email_if_absent',
        field: 'identities.email',
        value: identity.email,
        source: 'macos_contacts_bridge_from_whatsapp_group_roster',
      });
    }
    if (!card.channels?.whatsapp?.present && identity.phone) {
      operations.push({
        operation: 'mark_whatsapp_channel_present',
        field: 'channels.whatsapp',
        value: { present: true, status: 'known' },
        source: 'whatsapp_group_roster',
      });
    }
    operations.push({
      operation: 'add_evidence',
      source: 'whatsapp_group_roster',
      observedAt: group.observedAt ?? generatedAt,
      summary: evidenceSummary(group, entry, identity, contactBridge),
    });
    const hasIdentityWrite = operations.some((operation) => operation.operation.startsWith('set_') || operation.operation === 'mark_whatsapp_channel_present');
    return {
      status: hasIdentityWrite ? 'ready_for_write_review' : 'already_covered_evidence_optional',
      executed: false,
      wouldMutate: hasIdentityWrite,
      recommendedAction: hasIdentityWrite ? 'enrich_existing_card' : 'append_membership_evidence_optional',
      target: { personId: card.personId, matchKind: match.matchKind, confidence: match.confidence },
      operations,
      safeguards: [
        'local CRM write only after explicit Alejandro approval',
        'never infer attendance from group membership alone',
        'never overwrite existing phone/email from WhatsApp roster',
        'no outbound, no WhatsApp message, no group mutation',
      ],
    };
  }

  if (match.status === 'new_card_candidate') {
    const personId = identity.email ? `email:${identity.email}` : `phone:${phoneDigits(identity.phone)}`;
    return {
      status: 'review_create_card_candidate',
      executed: false,
      wouldMutate: false,
      recommendedAction: 'ask_before_create_phone_based_review_card',
      target: { personId, matchKind: match.matchKind, confidence: match.confidence },
      operations: [
        {
          operation: 'stage_create_review_card_after_human_approval',
          card: {
            schemaVersion: CARD_SCHEMA_VERSION,
            personId,
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
              email: { present: Boolean(identity.email), status: identity.email ? 'known' : null },
              instagram: { present: false, status: null },
              whatsapp: { present: Boolean(identity.phone), status: identity.phone ? 'known' : null },
              telegram: { present: false, status: null },
            },
            evidence: [
              {
                source: 'whatsapp_group_roster',
                observedAt: group.observedAt ?? generatedAt,
                note: evidenceSummary(group, entry, identity, contactBridge),
              },
            ],
            updatedAt: generatedAt,
          },
        },
      ],
      safeguards: [
        'phone-only group members require explicit approval before card creation',
        'group membership does not equal attended Encuentro Feliz',
        'dedupe must be rechecked immediately before any write',
      ],
    };
  }

  return {
    status: 'review_only_or_unresolved',
    executed: false,
    wouldMutate: false,
    recommendedAction: match.matchKind === 'name_only_existing_card_candidate'
      ? 'ask_or_find_phone_email_before_write'
      : 'keep_as_roster_clue',
    reason: match.matchKind,
    target: match.primaryCard ? { personId: match.primaryCard.personId, matchKind: match.matchKind, confidence: match.confidence } : null,
    operations: [],
  };
};

const signalEventsFor = ({ group, entry, identity, match, generatedAt }) => {
  if (!identity.phone && !match.primaryCard?.personId) return [];
  return [{
    sourceKind: 'whatsapp_group_roster',
    sourceId: `${group.id ?? 'encuentro-feliz'}:${entry.rowId}`,
    eventKind: 'group_membership_observed',
    channel: 'whatsapp',
    direction: 'observed',
    strength: 'weak',
    quantity: 1,
    observedAt: group.observedAt ?? generatedAt,
    capturedAt: generatedAt,
    subject: {
      personId: match.primaryCard?.personId ?? null,
      email: identity.email,
      phone: identity.phone,
      instagramHandle: match.primaryCard?.identities?.instagramHandle ?? null,
    },
    metrics: {
      groupName: group.name,
      memberDisplayName: identity.displayName,
      sourceConfidence: match.confidence,
      matchKind: match.matchKind,
    },
    tags: unique([
      'source:whatsapp_group_roster',
      'community:encuentro_feliz',
      match.status ? `match:${match.status}` : null,
      identity.email ? 'identity:email' : null,
      identity.phone ? 'identity:phone' : null,
    ]),
    evidence: {
      summary: `${identity.displayName ?? identity.phone} was visible in ${group.name} WhatsApp group roster.`,
      sourceIds: [`whatsapp_group:${group.id ?? group.name}`, `whatsapp_member:${entry.rowId}`],
    },
  }];
};

export const buildWhatsAppGroupRosterEvidencePacket = ({
  rosterEntries,
  contacts = [],
  cardStore,
  group = {},
  now = new Date(),
} = {}) => {
  const generatedAt = isoNow(now);
  const groupInfo = {
    id: cleanString(group.id) ?? 'encuentro-feliz',
    name: cleanString(group.name) ?? 'Encuentro Feliz',
    observedAt: isoNow(group.observedAt ?? generatedAt),
    source: cleanString(group.source) ?? 'WhatsApp macOS UI group member roster',
  };
  const cards = asCards(cardStore);
  const indexes = buildCardIndexes(cards);
  const cleanedContacts = asArray(contacts).map(cleanContact);
  const roster = asArray(rosterEntries).map(cleanRosterEntry).filter((entry) => entry.raw || entry.displayName || entry.phone);
  const items = [];
  const signalEvents = [];

  for (const [index, entry] of roster.entries()) {
    const candidates = contactCandidatesForEntry(entry, cleanedContacts);
    const selectedContact = candidates.selected;
    const identity = mergeIdentity(entry, selectedContact);
    const match = matchIdentityToCard(identity, indexes);
    const contactBridge = selectedContact ? {
      matchKind: selectedContact.match.kind,
      score: selectedContact.match.score,
      sourceId: selectedContact.contact.sourceId,
      fullName: selectedContact.contact.fullName,
      emailCount: selectedContact.contact.emails.length,
      phoneCount: selectedContact.contact.phones.length,
    } : null;
    const preview = readyPreview({ group: groupInfo, entry, identity, match, contactBridge, generatedAt });
    const events = signalEventsFor({ group: groupInfo, entry, identity, match, generatedAt });
    signalEvents.push(...events);
    items.push({
      contactKey: identity.email ? `email:${identity.email}` : identity.phone ? `phone:${phoneDigits(identity.phone)}` : `whatsapp_roster:${hashId([entry.raw, String(index)])}`,
      roster: {
        rowId: entry.rowId,
        raw: entry.raw,
        displayName: entry.displayName,
        phone: entry.phone,
        phoneLast4: phoneDigits(entry.phone).slice(-4) || null,
        isMaybe: entry.isMaybe,
        phoneOnly: entry.phoneOnly,
      },
      contactsBridge: contactBridge,
      contactsCandidates: candidates.all.map((candidate) => ({
        matchKind: candidate.matchKind,
        score: candidate.score,
        sourceId: candidate.contact.sourceId,
        fullName: candidate.contact.fullName,
        emails: candidate.contact.emails,
        phones: candidate.contact.phones,
      })),
      identity: {
        displayName: identity.displayName,
        email: identity.email,
        phone: identity.phone,
        phoneLast4: phoneDigits(identity.phone).slice(-4) || null,
        contactBridgeKind: identity.contactBridgeKind,
      },
      match: {
        status: match.status,
        confidence: match.confidence,
        matchKind: match.matchKind,
        primaryCard: publicCard(match.primaryCard),
        alternateCards: match.alternateCards.map(publicCard),
      },
      signalEventsPrepared: events.length,
      readyWritePreview: preview,
    });
  }

  const readyExisting = items.filter((item) => item.readyWritePreview.status === 'ready_for_write_review');
  const reviewCreate = items.filter((item) => item.readyWritePreview.status === 'review_create_card_candidate');
  const alreadyCovered = items.filter((item) => item.readyWritePreview.status === 'already_covered_evidence_optional');
  const reviewOnly = items.filter((item) => item.readyWritePreview.status === 'review_only_or_unresolved');
  const phoneVisible = items.filter((item) => item.identity.phone).length;
  const emailBridged = items.filter((item) => item.identity.email).length;

  return {
    schemaVersion: CRM_VNEXT_WHATSAPP_GROUP_ROSTER_EVIDENCE_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_whatsapp_group_roster_evidence_v0',
    group: groupInfo,
    source: {
      whatsapp: {
        kind: 'local_ui_read_only',
        app: 'WhatsApp macOS',
        groupMembersVisibleCount: roster.length,
        chatMessagesReadForRoster: false,
      },
      contacts: {
        kind: 'macos_contacts_sqlite_read_only_or_supplied_export',
        recordsRead: cleanedContacts.length,
      },
      cardStore: {
        cardsRead: cards.length,
      },
    },
    summary: {
      rosterEntries: roster.length,
      phoneVisibleOrBridged: phoneVisible,
      emailBridgedFromContacts: emailBridged,
      readyExistingEnrichments: readyExisting.length,
      reviewCreateCandidates: reviewCreate.length,
      alreadyCoveredEvidenceOptional: alreadyCovered.length,
      reviewOnlyOrUnresolved: reviewOnly.length,
      signalEventsPrepared: signalEvents.length,
    },
    safety: {
      readOnly: true,
      whatsappMessagesSent: false,
      whatsappGroupMutations: false,
      contactsMutations: false,
      crmCardWrites: false,
      factStoreWrites: false,
      outbound: false,
      notes: [
        'WhatsApp group membership is evidence of community channel membership, not proof of attendance.',
        'Name-only matches are never ready for write.',
        'Phone-only review cards require explicit human approval before local CRM creation.',
      ],
    },
    items,
    signalEvents,
  };
};

const lineForItem = (item) => {
  const name = item.identity.displayName ?? item.roster.displayName ?? item.roster.raw ?? item.identity.phone ?? item.contactKey;
  const bits = [
    `- ${name}`,
    item.identity.email ? `email=${item.identity.email}` : null,
    item.identity.phone ? `phone=${item.identity.phone}` : null,
    `match=${item.match.matchKind}`,
    `preview=${item.readyWritePreview.status}`,
    item.match.primaryCard?.displayName ? `card=${item.match.primaryCard.displayName}` : null,
  ];
  return bits.filter(Boolean).join(' | ');
};

export const markdownForWhatsAppGroupRosterEvidencePacket = (packet) => {
  const ready = packet.items.filter((item) => item.readyWritePreview.status === 'ready_for_write_review');
  const create = packet.items.filter((item) => item.readyWritePreview.status === 'review_create_card_candidate');
  const review = packet.items.filter((item) => item.readyWritePreview.status === 'review_only_or_unresolved');
  const covered = packet.items.filter((item) => item.readyWritePreview.status === 'already_covered_evidence_optional');
  return [
    `# CRM vNext WhatsApp Group Roster Evidence v0`,
    '',
    `Generated: ${packet.generatedAt}`,
    `Group: ${packet.group.name}`,
    '',
    '## Summary',
    '',
    `- Roster entries read: ${packet.summary.rosterEntries}`,
    `- Phone visible or bridged: ${packet.summary.phoneVisibleOrBridged}`,
    `- Emails bridged from Contacts: ${packet.summary.emailBridgedFromContacts}`,
    `- Existing-card enrichments ready for review: ${packet.summary.readyExistingEnrichments}`,
    `- New review-card candidates: ${packet.summary.reviewCreateCandidates}`,
    `- Already covered / evidence optional: ${packet.summary.alreadyCoveredEvidenceOptional}`,
    `- Review-only or unresolved: ${packet.summary.reviewOnlyOrUnresolved}`,
    `- Signal events prepared: ${packet.summary.signalEventsPrepared}`,
    '',
    '## Ready Existing Enrichments',
    '',
    ...(ready.length ? ready.map(lineForItem) : ['- None']),
    '',
    '## New Review-Card Candidates',
    '',
    ...(create.length ? create.map(lineForItem) : ['- None']),
    '',
    '## Already Covered / Evidence Optional',
    '',
    ...(covered.length ? covered.map(lineForItem) : ['- None']),
    '',
    '## Review-Only Or Unresolved',
    '',
    ...(review.length ? review.map(lineForItem) : ['- None']),
    '',
    '## Safety Receipt',
    '',
    `- Read-only: ${packet.safety.readOnly}`,
    `- WhatsApp messages sent: ${packet.safety.whatsappMessagesSent}`,
    `- WhatsApp group mutations: ${packet.safety.whatsappGroupMutations}`,
    `- Contacts mutations: ${packet.safety.contactsMutations}`,
    `- CRM card writes: ${packet.safety.crmCardWrites}`,
    `- Fact Store writes: ${packet.safety.factStoreWrites}`,
    `- Outbound: ${packet.safety.outbound}`,
    '',
    '## Notes',
    '',
    '- Group membership should become a low-strength community signal after review, not a direct attendance fact.',
    '- Phone/email exact evidence can enrich cards; name-only rows stay as clues.',
  ].join('\n');
};
