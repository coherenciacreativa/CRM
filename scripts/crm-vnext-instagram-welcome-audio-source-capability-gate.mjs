/**
 * Pure, repo-only proof gate for an exact Instagram follower source observation.
 *
 * The gate accepts data only. It does not read files, inspect a browser, use a
 * provider, consult environment variables, invoke callbacks, or perform an
 * external effect. A `source_capable` decision proves only that the supplied
 * closed-key observation is internally exact enough to serve as source
 * evidence. It never grants canary or live authority.
 */

import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_CONTRACT_VERSION =
  'crm_core_welcome_audio_source_capability_gate_v1';
const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION =
  'crm_core_welcome_audio_source_capability_gate_input_v1';
const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION =
  'crm_core_welcome_audio_source_capability_gate_receipt_v1';
const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID =
  'crm_core_welcome_audio_source_capability_gate_proof_v1_20260716';
const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS = 8;
const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS = 5 * 60 * 1000;

const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION = Object.freeze({
  SOURCE_CAPABLE: 'source_capable',
  NO_ACCESSIBLE_ROWS: 'blocked_no_accessible_rows',
  AMBIGUOUS_OR_INFERRED: 'blocked_ambiguous_or_inferred',
});

const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER = Object.freeze({
  INPUT_SCHEMA: 'blocked_input_schema_unknown_missing_or_extra',
  MISSION_BINDING: 'blocked_mission_binding_invalid',
  SURFACE: 'blocked_surface_not_loaded_authenticated_exact',
  ROW_ACCESS: 'blocked_row_access_status_unknown_or_inconsistent',
  NO_ACCESSIBLE_ROWS: 'blocked_no_accessible_rows',
  NO_ROWS_ENVELOPE: 'blocked_no_accessible_rows_envelope_not_minimal',
  RECORD_COUNT: 'blocked_record_count_outside_one_to_eight',
  RECORD_ORDER: 'blocked_record_order_not_exact_and_deterministic',
  ABSOLUTE_TIME: 'blocked_absolute_utc_time_invalid_relative_future_or_stale',
  CAMPAIGN_INTERVAL: 'blocked_campaign_interval_invalid_or_inferred',
  CAMPAIGN_MEMBERSHIP: 'blocked_campaign_membership_invalid_or_inferred',
  PRIVATE_UTF8: 'blocked_private_utf8_invalid',
  IDENTITY_EVIDENCE: 'blocked_identity_evidence_invalid_or_inferred',
  THREAD_EVIDENCE: 'blocked_thread_evidence_invalid_or_inferred',
  OWNER_EVIDENCE: 'blocked_owner_evidence_invalid_or_inferred',
  SOURCE_EVENT_EVIDENCE: 'blocked_source_event_evidence_invalid_or_inferred',
  DUPLICATE_IDENTITY: 'blocked_duplicate_exact_identity',
  DUPLICATE_THREAD: 'blocked_duplicate_exact_thread',
  DUPLICATE_SOURCE_EVENT: 'blocked_duplicate_exact_source_event',
  RECEIPT_CONTRACT: 'blocked_receipt_contract_invalid',
});

const INPUT_FIELDS = Object.freeze([
  'schema_version',
  'mission_id',
  'surface_observation',
  'campaign_interval',
  'record_order_evidence',
  'owner_account_reference_utf8',
  'owner_binding_evidence',
  'ordered_records',
]);

const SURFACE_OBSERVATION_FIELDS = Object.freeze([
  'surface_kind',
  'load_status',
  'authentication_status',
  'row_access_status',
  'observed_at',
  'timestamp_evidence',
  'inference_status',
]);

const CAMPAIGN_INTERVAL_FIELDS = Object.freeze([
  'start_at',
  'end_at',
  'interval_evidence',
  'campaign_membership_evidence',
  'inference_status',
]);

const SOURCE_RECORD_FIELDS = Object.freeze([
  'ordinal',
  'exact_target_utf8',
  'identity_binding_evidence',
  'followed_at',
  'source_observed_at',
  'follow_time_evidence',
  'campaign_membership_evidence',
  'bound_thread_reference_utf8',
  'thread_binding_evidence',
  'owner_account_reference_utf8',
  'owner_binding_evidence',
  'source_event_reference_utf8',
  'source_event_binding_evidence',
]);

const WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'decision',
  'records_seen_count',
  'records_valid_count',
  'record_cap',
  'surface_loaded',
  'surface_authenticated',
  'rows_accessible',
  'campaign_interval_exact',
  'absolute_time_evidence_exact',
  'deterministic_order_verified',
  'exact_utf8_preserved',
  'identity_evidence_exact',
  'thread_evidence_exact',
  'owner_evidence_exact',
  'source_event_evidence_exact',
  'duplicate_free',
  'normalization_performed',
  'source_capable',
  'source_execution',
  'canary_ready',
  'live_authority',
  'external_effect_invoked',
  'blocker_codes',
]);

const RECEIPT_BOOLEAN_FIELDS = Object.freeze([
  'surface_loaded',
  'surface_authenticated',
  'rows_accessible',
  'campaign_interval_exact',
  'absolute_time_evidence_exact',
  'deterministic_order_verified',
  'exact_utf8_preserved',
  'identity_evidence_exact',
  'thread_evidence_exact',
  'owner_evidence_exact',
  'source_event_evidence_exact',
  'duplicate_free',
  'normalization_performed',
  'source_capable',
  'source_execution',
  'canary_ready',
  'live_authority',
  'external_effect_invoked',
]);

const SOURCE_SURFACE_KIND = 'instagram_notifications_recent_followers';
const SOURCE_LOAD_STATUS = 'loaded';
const SOURCE_AUTHENTICATION_STATUS = 'authenticated_exact_owner';
const SOURCE_ROW_ACCESS_STATUS = Object.freeze({
  EXPOSED: 'exposed_exact',
  NOT_EXPOSED: 'not_exposed',
});
const ABSOLUTE_TIMESTAMP_EVIDENCE = 'absolute_timestamps_only_not_relative';
const EXPLICIT_NOT_INFERRED = 'explicit_not_inferred';
const RECORD_ORDER_EVIDENCE = 'exact_source_order_with_contiguous_ordinals';
const NO_ROWS_RECORD_ORDER_EVIDENCE = 'no_rows_available_for_ordering';
const CAMPAIGN_INTERVAL_EVIDENCE = 'exact_approved_campaign_interval';
const CAMPAIGN_MEMBERSHIP_EVIDENCE = 'explicit_source_event_membership';
const OWNER_BINDING_EVIDENCE = 'exact_owner_account_observed';
const NO_ROWS_OWNER_BINDING_EVIDENCE = 'not_observed_due_to_no_accessible_rows';
const IDENTITY_BINDING_EVIDENCE = 'exact_profile_identity_and_follow_signal_observed';
const FOLLOW_TIME_EVIDENCE = 'exact_absolute_source_timestamp';
const RECORD_CAMPAIGN_MEMBERSHIP_EVIDENCE =
  'exact_follow_timestamp_within_approved_campaign_interval';
const THREAD_BINDING_EVIDENCE = 'exact_bound_thread_observed';
const SOURCE_EVENT_BINDING_EVIDENCE = 'exact_source_event_observed';
const comparePropertyKeys = (left, right) => {
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
};

const snapshotPlainDataObject = (value, expected) => {
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || Array.isArray(value)
  ) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors).sort(comparePropertyKeys);
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => typeof key !== 'string' || key !== wanted[index])
  ) return null;
  const snapshot = Object.create(null);
  for (const key of wanted) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
      return null;
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
};

const snapshotDataArray = (value, maxLength) => {
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (
    !lengthDescriptor
    || !Object.hasOwn(lengthDescriptor, 'value')
    || !Number.isSafeInteger(lengthDescriptor.value)
    || lengthDescriptor.value < 0
    || lengthDescriptor.value > maxLength
  ) return null;
  const length = lengthDescriptor.value;
  const expectedKeys = ['length', ...Array.from({ length }, (_, index) => String(index))].sort();
  const actualKeys = Reflect.ownKeys(descriptors)
    .sort(comparePropertyKeys);
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => typeof key !== 'string' || key !== expectedKeys[index])
  ) return null;
  const snapshot = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
      return null;
    }
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
};

const isWellFormedUnicode = (value) => {
  if (typeof value !== 'string') return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
};

const isExactPrivateUtf8 = (value, maxBytes) => typeof value === 'string'
  && isWellFormedUnicode(value)
  && !/[\0\r\n]/.test(value)
  && Buffer.byteLength(value, 'utf8') >= 1
  && Buffer.byteLength(value, 'utf8') <= maxBytes;

const parseCanonicalUtcTimestamp = (value) => {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  try {
    return new Date(parsed).toISOString() === value ? parsed : null;
  } catch {
    return null;
  }
};

const addBlocker = (blockers, code) => {
  if (!blockers.includes(code)) blockers.push(code);
};

const baseEvidence = () => ({
  surface_loaded: false,
  surface_authenticated: false,
  rows_accessible: false,
  campaign_interval_exact: false,
  absolute_time_evidence_exact: false,
  deterministic_order_verified: false,
  exact_utf8_preserved: false,
  identity_evidence_exact: false,
  thread_evidence_exact: false,
  owner_evidence_exact: false,
  source_event_evidence_exact: false,
  duplicate_free: false,
});

const buildReceipt = ({
  decision = WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.AMBIGUOUS_OR_INFERRED,
  recordsSeenCount = 0,
  recordsValidCount = 0,
  evidence = baseEvidence(),
  blockers = [WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION,
  decision,
  records_seen_count: recordsSeenCount,
  records_valid_count: recordsValidCount,
  record_cap: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS,
  surface_loaded: evidence.surface_loaded === true,
  surface_authenticated: evidence.surface_authenticated === true,
  rows_accessible: evidence.rows_accessible === true,
  campaign_interval_exact: evidence.campaign_interval_exact === true,
  absolute_time_evidence_exact: evidence.absolute_time_evidence_exact === true,
  deterministic_order_verified: evidence.deterministic_order_verified === true,
  exact_utf8_preserved: evidence.exact_utf8_preserved === true,
  identity_evidence_exact: evidence.identity_evidence_exact === true,
  thread_evidence_exact: evidence.thread_evidence_exact === true,
  owner_evidence_exact: evidence.owner_evidence_exact === true,
  source_event_evidence_exact: evidence.source_event_evidence_exact === true,
  duplicate_free: evidence.duplicate_free === true,
  normalization_performed: false,
  source_capable: decision === WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE,
  source_execution: false,
  canary_ready: false,
  live_authority: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockers]),
});

const ambiguousReceipt = ({
  recordsSeenCount = 0,
  recordsValidCount = 0,
  evidence = baseEvidence(),
  blockers = [WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA],
} = {}) => buildReceipt({
  recordsSeenCount,
  recordsValidCount,
  evidence,
  blockers,
});

const evaluateUnsafe = (input, nowMs) => {
  const evidence = baseEvidence();
  const blockers = [];
  let recordsSeenCount = 0;
  let recordsValidCount = 0;

  if (!Number.isSafeInteger(nowMs)) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME);
  }
  const root = snapshotPlainDataObject(input, INPUT_FIELDS);
  if (!root) {
    return ambiguousReceipt({ blockers: [WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA] });
  }
  if (root.schema_version !== WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA);
  }
  if (root.mission_id !== WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.MISSION_BINDING);
  }

  const surface = snapshotPlainDataObject(root.surface_observation, SURFACE_OBSERVATION_FIELDS);
  if (!surface) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA);
    return ambiguousReceipt({ evidence, blockers });
  }
  evidence.surface_loaded = surface.surface_kind === SOURCE_SURFACE_KIND
    && surface.load_status === SOURCE_LOAD_STATUS;
  evidence.surface_authenticated =
    surface.authentication_status === SOURCE_AUTHENTICATION_STATUS;
  evidence.rows_accessible =
    surface.row_access_status === SOURCE_ROW_ACCESS_STATUS.EXPOSED;
  if (!evidence.surface_loaded || !evidence.surface_authenticated) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.SURFACE);
  }
  if (!Object.values(SOURCE_ROW_ACCESS_STATUS).includes(surface.row_access_status)) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ROW_ACCESS);
  }
  if (
    surface.timestamp_evidence !== ABSOLUTE_TIMESTAMP_EVIDENCE
    || surface.inference_status !== EXPLICIT_NOT_INFERRED
  ) addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME);
  const surfaceObservedAtMs = parseCanonicalUtcTimestamp(surface.observed_at);
  const surfaceTimeExact = surfaceObservedAtMs !== null
    && Number.isSafeInteger(nowMs)
    && surfaceObservedAtMs <= nowMs
    && nowMs - surfaceObservedAtMs <= WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS;
  if (!surfaceTimeExact) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME);
  }

  const records = snapshotDataArray(
    root.ordered_records,
    WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS + 1,
  );
  if (!records) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA);
    return ambiguousReceipt({ evidence, blockers });
  }
  recordsSeenCount = records.length;

  if (surface.row_access_status === SOURCE_ROW_ACCESS_STATUS.NOT_EXPOSED) {
    const minimalNoRowsEnvelope = recordsSeenCount === 0
      && root.campaign_interval === null
      && root.owner_account_reference_utf8 === null
      && root.owner_binding_evidence === NO_ROWS_OWNER_BINDING_EVIDENCE
      && root.record_order_evidence === NO_ROWS_RECORD_ORDER_EVIDENCE;
    evidence.deterministic_order_verified = recordsSeenCount === 0
      && root.record_order_evidence === NO_ROWS_RECORD_ORDER_EVIDENCE;
    evidence.duplicate_free = recordsSeenCount === 0;

    if (blockers.length === 0 && minimalNoRowsEnvelope) {
      return buildReceipt({
        decision: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.NO_ACCESSIBLE_ROWS,
        recordsSeenCount: 0,
        recordsValidCount: 0,
        evidence,
        blockers: [WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.NO_ACCESSIBLE_ROWS],
      });
    }
    if (!minimalNoRowsEnvelope) {
      addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.NO_ROWS_ENVELOPE);
    }
    if (recordsSeenCount > 0) {
      addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ROW_ACCESS);
    }
    return ambiguousReceipt({ recordsSeenCount, evidence, blockers });
  }

  const campaign = snapshotPlainDataObject(root.campaign_interval, CAMPAIGN_INTERVAL_FIELDS);
  if (!campaign) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA);
    return ambiguousReceipt({ evidence, blockers });
  }
  const campaignStartMs = parseCanonicalUtcTimestamp(campaign.start_at);
  const campaignEndMs = parseCanonicalUtcTimestamp(campaign.end_at);
  const campaignEvidenceExact = campaign.interval_evidence === CAMPAIGN_INTERVAL_EVIDENCE
    && campaign.campaign_membership_evidence === CAMPAIGN_MEMBERSHIP_EVIDENCE
    && campaign.inference_status === EXPLICIT_NOT_INFERRED;
  const campaignTimeExact = campaignStartMs !== null
    && campaignEndMs !== null
    && campaignStartMs < campaignEndMs
    && surfaceObservedAtMs !== null
    && campaignEndMs <= surfaceObservedAtMs;
  evidence.campaign_interval_exact = campaignEvidenceExact && campaignTimeExact;
  if (!evidence.campaign_interval_exact) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.CAMPAIGN_INTERVAL);
  }

  const ownerUtf8Exact = isExactPrivateUtf8(root.owner_account_reference_utf8, 2_048);
  evidence.owner_evidence_exact = ownerUtf8Exact
    && root.owner_binding_evidence === OWNER_BINDING_EVIDENCE;
  if (!ownerUtf8Exact) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.PRIVATE_UTF8);
  }
  if (!evidence.owner_evidence_exact) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.OWNER_EVIDENCE);
  }

  evidence.deterministic_order_verified =
    root.record_order_evidence === RECORD_ORDER_EVIDENCE;
  if (!evidence.deterministic_order_verified) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_ORDER);
  }

  evidence.absolute_time_evidence_exact = surfaceTimeExact
    && evidence.campaign_interval_exact;
  evidence.exact_utf8_preserved = ownerUtf8Exact;
  evidence.duplicate_free = true;

  if (
    recordsSeenCount < 1
    || recordsSeenCount > WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS
  ) addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_COUNT);

  const recordCountInRange = recordsSeenCount >= 1
    && recordsSeenCount <= WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS;
  evidence.identity_evidence_exact = recordCountInRange;
  evidence.thread_evidence_exact = recordCountInRange;
  evidence.source_event_evidence_exact = recordCountInRange;
  evidence.deterministic_order_verified =
    evidence.deterministic_order_verified && recordCountInRange;
  evidence.exact_utf8_preserved = evidence.exact_utf8_preserved && recordCountInRange;
  evidence.absolute_time_evidence_exact =
    evidence.absolute_time_evidence_exact && recordCountInRange;
  evidence.owner_evidence_exact = evidence.owner_evidence_exact && recordCountInRange;
  evidence.duplicate_free = evidence.duplicate_free && recordCountInRange;

  const seenIdentities = new Set();
  const seenThreads = new Set();
  const seenSourceEvents = new Set();

  if (recordCountInRange) {
    for (let index = 0; index < records.length; index += 1) {
      const record = snapshotPlainDataObject(records[index], SOURCE_RECORD_FIELDS);
      let recordValid = true;
      if (!record) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.INPUT_SCHEMA);
        evidence.identity_evidence_exact = false;
        evidence.thread_evidence_exact = false;
        evidence.owner_evidence_exact = false;
        evidence.source_event_evidence_exact = false;
        evidence.absolute_time_evidence_exact = false;
        evidence.exact_utf8_preserved = false;
        recordValid = false;
        continue;
      }
      if (record.ordinal !== index + 1) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECORD_ORDER);
        evidence.deterministic_order_verified = false;
        recordValid = false;
      }

      const identityUtf8Exact = isExactPrivateUtf8(record.exact_target_utf8, 512);
      const threadUtf8Exact = isExactPrivateUtf8(record.bound_thread_reference_utf8, 2_048);
      const recordOwnerUtf8Exact = isExactPrivateUtf8(record.owner_account_reference_utf8, 2_048);
      const sourceEventUtf8Exact = isExactPrivateUtf8(record.source_event_reference_utf8, 2_048);
      if (!identityUtf8Exact || !threadUtf8Exact || !recordOwnerUtf8Exact || !sourceEventUtf8Exact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.PRIVATE_UTF8);
        evidence.exact_utf8_preserved = false;
        recordValid = false;
      }

      const identityEvidenceExact = identityUtf8Exact
        && record.identity_binding_evidence === IDENTITY_BINDING_EVIDENCE;
      if (!identityEvidenceExact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.IDENTITY_EVIDENCE);
        evidence.identity_evidence_exact = false;
        recordValid = false;
      }
      const threadEvidenceExact = threadUtf8Exact
        && record.thread_binding_evidence === THREAD_BINDING_EVIDENCE;
      if (!threadEvidenceExact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.THREAD_EVIDENCE);
        evidence.thread_evidence_exact = false;
        recordValid = false;
      }
      const ownerEvidenceExact = recordOwnerUtf8Exact
        && record.owner_account_reference_utf8 === root.owner_account_reference_utf8
        && record.owner_binding_evidence === OWNER_BINDING_EVIDENCE;
      if (!ownerEvidenceExact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.OWNER_EVIDENCE);
        evidence.owner_evidence_exact = false;
        recordValid = false;
      }
      const sourceEventEvidenceExact = sourceEventUtf8Exact
        && record.source_event_binding_evidence === SOURCE_EVENT_BINDING_EVIDENCE;
      if (!sourceEventEvidenceExact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.SOURCE_EVENT_EVIDENCE);
        evidence.source_event_evidence_exact = false;
        recordValid = false;
      }

      const followedAtMs = parseCanonicalUtcTimestamp(record.followed_at);
      const sourceObservedAtMs = parseCanonicalUtcTimestamp(record.source_observed_at);
      const recordTimeExact = followedAtMs !== null
        && sourceObservedAtMs !== null
        && campaignStartMs !== null
        && campaignEndMs !== null
        && followedAtMs >= campaignStartMs
        && followedAtMs <= campaignEndMs
        && sourceObservedAtMs >= followedAtMs
        && surfaceObservedAtMs !== null
        && sourceObservedAtMs <= surfaceObservedAtMs
        && Number.isSafeInteger(nowMs)
        && sourceObservedAtMs <= nowMs
        && nowMs - sourceObservedAtMs <= WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS
        && record.follow_time_evidence === FOLLOW_TIME_EVIDENCE;
      if (!recordTimeExact) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ABSOLUTE_TIME);
        evidence.absolute_time_evidence_exact = false;
        recordValid = false;
      }
      if (record.campaign_membership_evidence !== RECORD_CAMPAIGN_MEMBERSHIP_EVIDENCE) {
        addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.CAMPAIGN_MEMBERSHIP);
        recordValid = false;
      }

      if (identityUtf8Exact) {
        if (seenIdentities.has(record.exact_target_utf8)) {
          addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_IDENTITY);
          evidence.duplicate_free = false;
          recordValid = false;
        } else seenIdentities.add(record.exact_target_utf8);
      }
      if (threadUtf8Exact) {
        if (seenThreads.has(record.bound_thread_reference_utf8)) {
          addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_THREAD);
          evidence.duplicate_free = false;
          recordValid = false;
        } else seenThreads.add(record.bound_thread_reference_utf8);
      }
      if (sourceEventUtf8Exact) {
        if (seenSourceEvents.has(record.source_event_reference_utf8)) {
          addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.DUPLICATE_SOURCE_EVENT);
          evidence.duplicate_free = false;
          recordValid = false;
        } else seenSourceEvents.add(record.source_event_reference_utf8);
      }

      if (recordValid) recordsValidCount += 1;
    }
  }

  const sourceCapable = blockers.length === 0
    && surface.row_access_status === SOURCE_ROW_ACCESS_STATUS.EXPOSED
    && recordsSeenCount === recordsValidCount
    && recordsValidCount >= 1
    && recordsValidCount <= WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS
    && evidence.surface_loaded
    && evidence.surface_authenticated
    && evidence.rows_accessible
    && evidence.campaign_interval_exact
    && evidence.absolute_time_evidence_exact
    && evidence.deterministic_order_verified
    && evidence.exact_utf8_preserved
    && evidence.identity_evidence_exact
    && evidence.thread_evidence_exact
    && evidence.owner_evidence_exact
    && evidence.source_event_evidence_exact
    && evidence.duplicate_free;

  if (sourceCapable) {
    return buildReceipt({
      decision: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE,
      recordsSeenCount,
      recordsValidCount,
      evidence,
      blockers: [],
    });
  }
  if (blockers.length === 0) {
    addBlocker(blockers, WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.ROW_ACCESS);
  }
  return ambiguousReceipt({ recordsSeenCount, recordsValidCount, evidence, blockers });
};

const evaluateWelcomeAudioSourceCapabilityGate = (input, nowMs) => {
  try {
    return evaluateUnsafe(input, nowMs);
  } catch {
    return ambiguousReceipt();
  }
};

const validateWelcomeAudioSourceCapabilityGateReceipt = (receipt) => {
  const invalid = () => ({
    ok: false,
    reason: WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.RECEIPT_CONTRACT,
  });
  try {
    const data = snapshotPlainDataObject(
      receipt,
      WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS,
    );
    if (!data) {
      return invalid();
    }
    const receiptBlockerCodes = snapshotDataArray(
      data.blocker_codes,
      Object.keys(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER).length,
    );
    if (!receiptBlockerCodes) return invalid();
    const decisions = new Set(Object.values(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION));
    const blockerCodes = new Set(Object.values(WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER));
    if (
      data.receipt_schema_version
        !== WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION
      || !decisions.has(data.decision)
      || !Number.isSafeInteger(data.records_seen_count)
      || data.records_seen_count < 0
      || !Number.isSafeInteger(data.records_valid_count)
      || data.records_valid_count < 0
      || data.records_valid_count > data.records_seen_count
      || data.records_valid_count > WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS
      || data.record_cap !== WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS
      || RECEIPT_BOOLEAN_FIELDS.some((field) => typeof data[field] !== 'boolean')
      || data.normalization_performed !== false
      || data.source_execution !== false
      || data.canary_ready !== false
      || data.live_authority !== false
      || data.external_effect_invoked !== false
      || receiptBlockerCodes.some((code) => !blockerCodes.has(code))
      || new Set(receiptBlockerCodes).size !== receiptBlockerCodes.length
      || data.source_capable
        !== (data.decision === WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE)
    ) return invalid();

    if (data.decision === WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.SOURCE_CAPABLE) {
      if (
        receiptBlockerCodes.length !== 0
        || data.records_seen_count < 1
        || data.records_seen_count > WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS
        || data.records_valid_count !== data.records_seen_count
        || ![
          'surface_loaded',
          'surface_authenticated',
          'rows_accessible',
          'campaign_interval_exact',
          'absolute_time_evidence_exact',
          'deterministic_order_verified',
          'exact_utf8_preserved',
          'identity_evidence_exact',
          'thread_evidence_exact',
          'owner_evidence_exact',
          'source_event_evidence_exact',
          'duplicate_free',
        ].every((field) => data[field] === true)
      ) return invalid();
    } else if (
      data.decision === WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION.NO_ACCESSIBLE_ROWS
    ) {
      if (
        data.records_seen_count !== 0
        || data.records_valid_count !== 0
        || data.surface_loaded !== true
        || data.surface_authenticated !== true
        || data.rows_accessible !== false
        || data.campaign_interval_exact !== false
        || data.absolute_time_evidence_exact !== false
        || data.deterministic_order_verified !== true
        || data.exact_utf8_preserved !== false
        || data.identity_evidence_exact !== false
        || data.thread_evidence_exact !== false
        || data.owner_evidence_exact !== false
        || data.source_event_evidence_exact !== false
        || data.duplicate_free !== true
        || receiptBlockerCodes.length !== 1
        || receiptBlockerCodes[0]
          !== WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER.NO_ACCESSIBLE_ROWS
      ) return invalid();
    } else if (receiptBlockerCodes.length < 1) return invalid();

    return { ok: true, reason: null };
  } catch {
    return invalid();
  }
};

export {
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_BLOCKER,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_CONTRACT_VERSION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_DECISION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_FRESHNESS_MS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_INPUT_SCHEMA_VERSION,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MAX_RECORDS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_MISSION_ID,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_FIELDS,
  WELCOME_AUDIO_SOURCE_CAPABILITY_GATE_RECEIPT_SCHEMA_VERSION,
  evaluateWelcomeAudioSourceCapabilityGate,
  validateWelcomeAudioSourceCapabilityGateReceipt,
};
