import { createHash } from 'node:crypto';
import { resolveContactIdentity } from './contact-identity-resolver.js';
import { buildCrmVNextInstagramSignalEvents } from './crm-vnext-instagram-signal-events.js';

export const CRM_VNEXT_COMMUNITY_INTAKE_REGISTER_SCHEMA_VERSION =
  'crm-vnext-community-intake-register-2026-07-31';
export const CRM_VNEXT_COMMUNITY_INTAKE_INPUT_SCHEMA_VERSION =
  'community-intake-register-v1';

const MAX_PERSONS = 10;
const SIGNAL_EVENT_KINDS = new Map([
  ['follow', 'follow'],
  ['reply', 'dm'],
]);
const EMAIL_PROVENANCE_EVENT_KINDS = new Set(['email_handoff', 'email_provided']);
const EMAIL_CONSENT_EVENT_KINDS = new Set(['email_consent']);

const cleanRequired = (value, code) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(code);
  return value.trim();
};

const optionalRaw = (value, code) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(code);
  return value;
};

const iso = (value, code) => {
  const raw = cleanRequired(value, code);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(code);
  return parsed.toISOString();
};

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const exactEmailEvidenceDigest = (value) => createHash('sha256').update(value).digest('hex');

const compareHandle = (value) => {
  if (!value) return null;
  const key = value.trim().replace(/^@+/, '').toLowerCase();
  return /^[a-z0-9._]{2,30}$/.test(key) ? key : null;
};

const compareEmail = (value) => {
  if (!value) return null;
  if (value !== value.trim()) return null;
  const key = value.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) ? key : null;
};

const comparePhone = (value) => {
  if (!value) return null;
  const key = value.replace(/\D/g, '');
  return key.length >= 7 && key.length <= 15 ? key : null;
};

const array = (value, code) => {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
};

const uniqueBy = (items, keyFor, code) => {
  const seen = new Set();
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) throw new Error(code);
    seen.add(key);
  }
};

const normalizeConsent = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      receiveNotes: 'unknown',
      basis: null,
      capturedAt: null,
      sourceEventId: null,
    };
  }
  const receiveNotes = ['granted', 'not_granted', 'unknown'].includes(value.receive_notes)
    ? value.receive_notes
    : 'unknown';
  return {
    receiveNotes,
    basis: value.basis === 'explicit' ? 'explicit' : null,
    capturedAt: value.captured_at ? iso(value.captured_at, 'invalid_consent_captured_at') : null,
    sourceEventId: optionalRaw(value.source_event_id, 'invalid_consent_source_event_id'),
  };
};

const normalizeEmailProvenance = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      status: 'unknown',
      observedAt: null,
      sourceEventId: null,
    };
  }
  return {
    status: value.status === 'voluntarily_provided' ? 'voluntarily_provided' : 'unknown',
    observedAt: value.observed_at ? iso(value.observed_at, 'invalid_email_provenance_observed_at') : null,
    sourceEventId: optionalRaw(value.source_event_id, 'invalid_email_provenance_source_event_id'),
  };
};

const normalizePerson = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_person_record');
  const revision = Number(value.revision);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('invalid_person_revision');
  const raw = {
    displayName: optionalRaw(value.display_name, 'invalid_display_name'),
    instagramHandle: optionalRaw(value.instagram_handle, 'invalid_instagram_handle'),
    email: optionalRaw(value.email, 'invalid_email'),
    phone: optionalRaw(value.phone, 'invalid_phone'),
  };
  const comparison = {
    instagramHandle: compareHandle(raw.instagramHandle),
    email: compareEmail(raw.email),
    phone: comparePhone(raw.phone),
  };
  if (raw.instagramHandle && !comparison.instagramHandle) throw new Error('invalid_instagram_handle');
  if (raw.email && !comparison.email) throw new Error('invalid_email');
  if (raw.phone && !comparison.phone) throw new Error('invalid_phone');
  if (!comparison.instagramHandle && !comparison.email && !comparison.phone) {
    throw new Error('person_identity_anchor_required');
  }
  return {
    personRecordId: cleanRequired(value.person_record_id, 'person_record_id_required'),
    revision,
    raw,
    comparison,
    emailProvenance: normalizeEmailProvenance(value.email_provenance),
    consent: normalizeConsent(value.consent),
  };
};

const normalizeEvent = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_event_record');
  const direction = value.direction;
  if (!['inbound', 'outbound'].includes(direction)) throw new Error('invalid_event_direction');
  const personRecordId = cleanRequired(value.person_record_id, 'event_person_record_id_required');
  const eventKind = cleanRequired(value.event_kind, 'event_kind_required');
  const assetVersion = optionalRaw(value.asset_version, 'invalid_event_asset_version');
  const exactEmailSha256 = optionalRaw(value.exact_email_sha256, 'invalid_event_exact_email_sha256');
  if (eventKind === 'welcome_audio_sent') {
    if (direction !== 'outbound' || !assetVersion || !/^[a-z0-9._-]{1,80}$/i.test(assetVersion)) {
      throw new Error('welcome_audio_outbound_asset_version_required');
    }
  } else if (assetVersion) {
    throw new Error('asset_version_only_allowed_for_welcome_audio');
  }
  if (EMAIL_PROVENANCE_EVENT_KINDS.has(eventKind)) {
    if (!exactEmailSha256 || !/^[a-f0-9]{64}$/.test(exactEmailSha256)) {
      throw new Error('email_provenance_exact_email_sha256_required');
    }
  } else if (exactEmailSha256) {
    throw new Error('exact_email_sha256_only_allowed_for_email_provenance');
  }
  const dedupeKey = eventKind === 'welcome_audio_sent'
    ? `${personRecordId}|welcome_audio_sent|${assetVersion.toLowerCase()}`
    : null;
  return {
    eventId: cleanRequired(value.event_id, 'event_id_required'),
    personRecordId,
    eventKind,
    observedAt: iso(value.observed_at, 'event_observed_at_required'),
    direction,
    assetVersion,
    exactEmailSha256,
    dedupeKey,
  };
};

const normalizeRegister = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}_register_required`);
  const persons = array(value.persons, `${label}_persons_required`).map(normalizePerson);
  const events = array(value.events, `${label}_events_required`).map(normalizeEvent);
  if (persons.length > MAX_PERSONS) throw new Error('person_cap_exceeded');
  uniqueBy(persons, (person) => person.personRecordId, 'duplicate_person_record_id');
  uniqueBy(events, (event) => event.eventId, 'duplicate_event_id');
  uniqueBy(
    events.filter((event) => event.eventKind === 'welcome_audio_sent'),
    (event) => event.dedupeKey,
    'duplicate_welcome_audio_dedupe_key',
  );
  const identityClaims = new Map();
  for (const person of persons) {
    for (const kind of ['instagramHandle', 'email', 'phone']) {
      const key = person.comparison[kind];
      if (!key) continue;
      const composite = `${kind}:${key}`;
      const prior = identityClaims.get(composite);
      if (prior && prior !== person.personRecordId) throw new Error('duplicate_person_identity_claim');
      identityClaims.set(composite, person.personRecordId);
    }
  }
  const personIds = new Set(persons.map((person) => person.personRecordId));
  if (events.some((event) => !personIds.has(event.personRecordId))) throw new Error('event_person_not_in_register');
  const schemaVersion = cleanRequired(value.schema_version, `${label}_schema_version_required`);
  if (schemaVersion !== CRM_VNEXT_COMMUNITY_INTAKE_INPUT_SCHEMA_VERSION) {
    throw new Error('unsupported_register_schema_version');
  }
  return {
    schemaVersion,
    batchId: cleanRequired(value.batch_id, `${label}_batch_id_required`),
    persons,
    events,
  };
};

const publicPersonDigest = (person) => digest({
  personRecordId: person.personRecordId,
  raw: person.raw,
  emailProvenance: person.emailProvenance,
  consent: person.consent,
});

const publicEventDigest = (event) => digest(event);

const deriveDelta = (current, previous) => {
  const previousPersons = new Map(previous?.persons.map((person) => [person.personRecordId, person]));
  const previousEvents = new Map(previous?.events.map((event) => [event.eventId, event]));
  const previousAudioKeys = new Set(
    previous?.events
      .filter((event) => event.eventKind === 'welcome_audio_sent')
      .map((event) => event.dedupeKey),
  );
  const changedPersons = [];
  const unchangedPersonIds = [];
  const newEvents = [];
  const duplicateEventIds = [];
  const duplicateAudioEventIds = [];

  if (previous) {
    const currentPersonIds = new Set(current.persons.map((person) => person.personRecordId));
    const currentEventIds = new Set(current.events.map((event) => event.eventId));
    if (previous.persons.some((person) => !currentPersonIds.has(person.personRecordId))) {
      throw new Error('previous_person_missing_from_current_register');
    }
    if (previous.events.some((event) => !currentEventIds.has(event.eventId))) {
      throw new Error('previous_event_missing_from_current_register');
    }
  }

  for (const person of current.persons) {
    const before = previousPersons.get(person.personRecordId);
    if (!before) {
      changedPersons.push({ changeKind: 'new', person });
      continue;
    }
    if (person.revision < before.revision) throw new Error('person_revision_regressed');
    const beforeComparable = publicPersonDigest(before);
    const afterComparable = publicPersonDigest(person);
    if (beforeComparable === afterComparable) {
      unchangedPersonIds.push(person.personRecordId);
      continue;
    }
    if (person.revision <= before.revision) throw new Error('person_revision_not_advanced');
    changedPersons.push({ changeKind: 'updated', person });
  }

  for (const event of current.events) {
    const before = previousEvents.get(event.eventId);
    if (!before) {
      if (event.eventKind === 'welcome_audio_sent' && previousAudioKeys.has(event.dedupeKey)) {
        duplicateAudioEventIds.push(event.eventId);
        continue;
      }
      newEvents.push(event);
      continue;
    }
    if (publicEventDigest(before) !== publicEventDigest(event)) throw new Error('event_id_conflict');
    duplicateEventIds.push(event.eventId);
  }

  return { changedPersons, unchangedPersonIds, newEvents, duplicateEventIds, duplicateAudioEventIds };
};

const existingCardIndex = (cards = []) => {
  if (!Array.isArray(cards)) throw new Error('existing_cards_must_be_array');
  const index = {
    instagramHandle: new Map(),
    email: new Map(),
    phone: new Map(),
  };
  const add = (kind, key, cardId) => {
    if (!key) return;
    const hits = index[kind].get(key) ?? [];
    hits.push(cardId);
    index[kind].set(key, hits);
  };
  for (const card of cards) {
    if (!card || typeof card !== 'object' || Array.isArray(card)) throw new Error('invalid_existing_card');
    const cardId = cleanRequired(card.card_id, 'existing_card_id_required');
    const rawHandle = optionalRaw(card.instagram_handle, 'invalid_existing_card_instagram_handle');
    const rawEmail = optionalRaw(card.email, 'invalid_existing_card_email');
    const rawPhone = optionalRaw(card.phone, 'invalid_existing_card_phone');
    const handle = compareHandle(rawHandle);
    const email = compareEmail(rawEmail);
    const phone = comparePhone(rawPhone);
    if (rawHandle && !handle) throw new Error('invalid_existing_card_instagram_handle');
    if (rawEmail && !email) throw new Error('invalid_existing_card_email');
    if (rawPhone && !phone) throw new Error('invalid_existing_card_phone');
    add('instagramHandle', handle, cardId);
    add('email', email, cardId);
    add('phone', phone, cardId);
  }
  return index;
};

const resolveIdentityWithExistingComponent = async (person, index) => {
  const reasonToKind = {
    email: 'email',
    phone: 'phone',
    instagram_username: 'instagramHandle',
  };
  const result = await resolveContactIdentity({
    email: person.raw.email,
    phone: person.raw.phone,
    instagram_username: person.raw.instagramHandle,
  }, {
    fetchMatches: async (reason, value) => {
      const kind = reasonToKind[reason];
      if (!kind) return [];
      const key = kind === 'phone'
        ? comparePhone(value)
        : kind === 'instagramHandle'
          ? compareHandle(value)
          : compareEmail(value);
      return (index[kind].get(key) ?? []).map((cardId) => ({ id: cardId }));
    },
  });
  return {
    status: result.status,
    cardId: result.contact?.id ?? null,
    reasons: result.lookedUp.filter((hit) => hit.hitCount > 0).map((hit) => hit.reason),
    resolver: 'contact_identity_resolver',
  };
};

const mailerLiteCandidate = (person, identity, eventById) => {
  if (!person.raw.email) return { state: 'not_applicable', candidate: null, blocker: 'email_absent' };
  if (identity.status === 'conflict' || identity.status === 'ambiguous') {
    return { state: 'blocked', candidate: null, blocker: `identity_${identity.status}` };
  }
  if (person.emailProvenance.status !== 'voluntarily_provided') {
    return { state: 'blocked', candidate: null, blocker: 'email_not_voluntarily_provided' };
  }
  const provenanceEvent = person.emailProvenance.sourceEventId
    ? eventById.get(person.emailProvenance.sourceEventId)
    : null;
  const consentEvent = person.consent.sourceEventId
    ? eventById.get(person.consent.sourceEventId)
    : null;
  if (
    !person.emailProvenance.observedAt
    || !provenanceEvent
    || provenanceEvent.personRecordId !== person.personRecordId
    || provenanceEvent.direction !== 'inbound'
    || !EMAIL_PROVENANCE_EVENT_KINDS.has(provenanceEvent.eventKind)
    || provenanceEvent.observedAt !== person.emailProvenance.observedAt
    || provenanceEvent.exactEmailSha256 !== exactEmailEvidenceDigest(person.raw.email)
  ) {
    return { state: 'blocked', candidate: null, blocker: 'email_provenance_event_missing_or_mismatched' };
  }
  if (
    person.consent.receiveNotes !== 'granted'
    || person.consent.basis !== 'explicit'
    || !person.consent.capturedAt
    || !person.consent.sourceEventId
    || !consentEvent
    || consentEvent.personRecordId !== person.personRecordId
    || consentEvent.direction !== 'inbound'
    || !EMAIL_CONSENT_EVENT_KINDS.has(consentEvent.eventKind)
  ) {
    return { state: 'blocked', candidate: null, blocker: 'explicit_receive_notes_consent_missing' };
  }
  return {
    state: 'candidate_requires_final_checks',
    blocker: null,
    candidate: {
      personRecordId: person.personRecordId,
      exactEmail: person.raw.email,
      purpose: 'receive_notes',
      suppressionState: 'not_checked',
      idempotencyState: 'not_checked',
      mutationAuthority: false,
    },
  };
};

export const buildCrmVNextCommunityIntakeRegister = async (input = {}, options = {}) => {
  const current = normalizeRegister(input.currentRegister, 'current');
  const previous = input.previousRegister ? normalizeRegister(input.previousRegister, 'previous') : null;
  if (previous && previous.batchId !== current.batchId) throw new Error('batch_id_mismatch');
  const delta = deriveDelta(current, previous);
  const cardIndex = existingCardIndex(input.existingCards ?? []);
  const currentPeople = new Map(current.persons.map((person) => [person.personRecordId, person]));
  const eventById = new Map(current.events.map((event) => [event.eventId, event]));
  const decisions = await Promise.all(delta.changedPersons.map(async ({ changeKind, person }) => {
    const identity = await resolveIdentityWithExistingComponent(person, cardIndex);
    return {
      changeKind,
      personRecordId: person.personRecordId,
      revision: person.revision,
      raw: person.raw,
      comparison: person.comparison,
      identity,
      cardProposal: identity.status === 'none' && person.raw.instagramHandle
        ? {
          kind: 'minimal_card_proposal',
          personRecordId: person.personRecordId,
          displayName: person.raw.displayName,
          exactInstagramHandle: person.raw.instagramHandle,
          writeAuthority: false,
        }
        : null,
      enrichmentProposal: identity.status === 'matched'
        ? {
          kind: 'existing_card_enrichment_proposal',
          cardId: identity.cardId,
          personRecordId: person.personRecordId,
          exactEmail: person.raw.email,
          exactPhone: person.raw.phone,
          writeAuthority: false,
        }
        : null,
      mailerLite: mailerLiteCandidate(person, identity, eventById),
    };
  }));

  const signalObservations = delta.newEvents.flatMap((event) => {
    const mappedKind = SIGNAL_EVENT_KINDS.get(event.eventKind);
    if (!mappedKind || event.direction === 'outbound') return [];
    const person = currentPeople.get(event.personRecordId);
    return [{
      sourceKind: 'manual_evidence',
      sourceId: event.eventId,
      eventKind: mappedKind,
      personId: person.personRecordId,
      instagramHandle: person.raw.instagramHandle,
      observedAt: event.observedAt,
      summary: 'Owner-only manual community intake evidence.',
    }];
  });

  const canonicalSignalEvents = buildCrmVNextInstagramSignalEvents(
    { observations: signalObservations },
    { now: options.now },
  );
  const generatedAt = options.now ? iso(options.now, 'invalid_generated_at') : new Date().toISOString();
  const blocked = decisions.filter((decision) => ['conflict', 'ambiguous'].includes(decision.identity.status));
  return {
    schemaVersion: CRM_VNEXT_COMMUNITY_INTAKE_REGISTER_SCHEMA_VERSION,
    generatedAt,
    mode: 'owner_only_dry_run_manual_intake',
    batchId: current.batchId,
    summary: {
      personsRead: current.persons.length,
      eventsRead: current.events.length,
      changedPersons: delta.changedPersons.length,
      unchangedPersons: delta.unchangedPersonIds.length,
      newEvents: delta.newEvents.length,
      duplicateEventsSkipped: delta.duplicateEventIds.length,
      duplicateAudioEventsSkipped: delta.duplicateAudioEventIds.length,
      signalObservationsPrepared: signalObservations.length,
      identityConflicts: blocked.length,
      minimalCardProposals: decisions.filter((decision) => decision.cardProposal).length,
      enrichmentProposals: decisions.filter((decision) => decision.enrichmentProposal).length,
      mailerLiteCandidates: decisions.filter((decision) => decision.mailerLite.candidate).length,
      operationsExecuted: 0,
    },
    decisions,
    signalObservations,
    canonicalSignalEvents,
    continuity: {
      registerDigest: digest(current),
      personDigests: current.persons.map((person) => ({
        personRecordId: person.personRecordId,
        revision: person.revision,
        digest: publicPersonDigest(person),
      })),
      eventDigests: current.events.map((event) => ({
        eventId: event.eventId,
        digest: publicEventDigest(event),
      })),
    },
    safety: {
      ownerOnly: true,
      dryRun: true,
      exactRawValuesPreserved: true,
      comparisonKeysAreDerivedOnly: true,
      sourceReadProhibited: true,
      browserProhibited: true,
      crmWriteProhibited: true,
      ledgerWriteProhibited: true,
      mailerLiteReadProhibited: true,
      mailerLiteMutationProhibited: true,
      outboundProhibited: true,
      authorityGranted: false,
      productionReady: false,
    },
  };
};
