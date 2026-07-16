/**
 * Pure adapter for one privately UI-attested Instagram follower source.
 *
 * The adapter accepts data only. It does not inspect a browser, read or write
 * files, use environment variables, invoke callbacks, access a provider, or
 * perform an external effect. Its private projection preserves exact UTF-8
 * values without normalization. It expressly does not claim an exact follow
 * timestamp, provider event id, or campaign membership.
 */

import { createHash } from 'node:crypto';
import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS = 'ui_attested_follower_source_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_adapter_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_input_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_projection_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS = 8;
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS = 5 * 60 * 1000;

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION = Object.freeze({
  READY: 'ui_attested_source_ready',
  BLOCKED: 'blocked_ui_attested_source',
});

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER = Object.freeze({
  INPUT_SCHEMA: 'blocked_ui_attested_input_schema',
  SOURCE_CLASS: 'blocked_ui_attested_source_class',
  MISSION_BINDING: 'blocked_ui_attested_mission_binding',
  NOTIFICATION: 'blocked_ui_attested_notification_not_exact',
  TIME_BUCKET: 'blocked_ui_attested_time_bucket_not_exact',
  TIME_EVIDENCE: 'blocked_ui_attested_time_evidence_invalid_or_stale',
  IDENTITY_BINDING: 'blocked_ui_attested_identity_binding_not_exact',
  FOLLOWS_OWNER: 'blocked_ui_attested_follows_owner_not_confirmed',
  THREAD_BINDING: 'blocked_ui_attested_thread_binding_not_exact',
  OWNER_BINDING: 'blocked_ui_attested_owner_binding_not_exact',
  DEDUPE: 'blocked_ui_attested_dedupe_not_clear',
  UNSUPPORTED_CLAIM: 'blocked_ui_attested_unsupported_source_claim',
  PRIVATE_UTF8: 'blocked_ui_attested_private_utf8_invalid',
  PROJECTION_CONTRACT: 'blocked_ui_attested_projection_contract_invalid',
  RECEIPT_CONTRACT: 'blocked_ui_attested_receipt_contract_invalid',
});

const INPUT_FIELDS = Object.freeze([
  'schema_version',
  'source_class',
  'mission_id',
  'notification_row',
  'profile',
  'thread',
  'owner',
  'dedupe',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
]);

const NOTIFICATION_ROW_FIELDS = Object.freeze([
  'row_ordinal',
  'exact_target_utf8',
  'notification_evidence',
  'follower_signal',
  'time_bucket_utf8',
  'time_bucket_evidence',
  'attested_at',
  'inference_status',
]);

const PROFILE_FIELDS = Object.freeze([
  'exact_target_utf8',
  'notification_to_profile_binding',
  'profile_identity_evidence',
  'follows_owner',
  'follows_owner_evidence',
  'attested_at',
  'inference_status',
]);

const THREAD_FIELDS = Object.freeze([
  'bound_thread_reference_utf8',
  'profile_to_thread_binding',
  'thread_binding_evidence',
  'attested_at',
  'inference_status',
]);

const OWNER_FIELDS = Object.freeze([
  'owner_account_reference_utf8',
  'owner_binding_evidence',
  'attested_at',
  'inference_status',
]);

const DEDUPE_FIELDS = Object.freeze([
  'status',
  'already_welcomed_status',
  'send_history_status',
  'exact_target_utf8',
  'bound_thread_reference_utf8',
  'owner_account_reference_utf8',
  'checked_at',
  'dedupe_evidence',
  'inference_status',
]);

const ANCHOR_FIELDS = Object.freeze([
  'source_evidence_anchor_sha256',
  'profile_anchor_sha256',
  'candidate_anchor_sha256',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'dedupe_anchor_sha256',
]);

const PROJECTION_FIELDS = Object.freeze([
  'schema_version',
  'adapter_contract_version',
  'source_class',
  'mission_id',
  'notification_row',
  'profile',
  'thread',
  'owner',
  'dedupe',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
  'anchors',
  'source_evidence_sha256',
]);

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'adapter_contract_version',
  'redaction_status',
  'source_class',
  'decision',
  'evidence_record_count',
  'record_cap',
  'ui_attested_source_ready',
  'notification_row_exact',
  'time_bucket_attested',
  'identity_binding_exact',
  'follows_owner_confirmed',
  'thread_binding_exact',
  'owner_binding_exact',
  'dedupe_clear',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
  'normalization_performed',
  'private_projection_issued',
  'source_execution',
  'canary_ready',
  'live_authority',
  'send_allowed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'blocker_codes',
]);

const RECEIPT_BOOLEAN_FIELDS = Object.freeze([
  'ui_attested_source_ready',
  'notification_row_exact',
  'time_bucket_attested',
  'identity_binding_exact',
  'follows_owner_confirmed',
  'thread_binding_exact',
  'owner_binding_exact',
  'dedupe_clear',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
  'normalization_performed',
  'private_projection_issued',
  'source_execution',
  'canary_ready',
  'live_authority',
  'send_allowed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
]);

const EXACT = Object.freeze({
  notificationEvidence: 'explicit_recent_follower_notification_row',
  followerSignal: 'started_following_owner',
  timeBucketEvidence: 'explicit_visible_relative_time_label',
  inferenceStatus: 'explicit_not_inferred',
  notificationToProfile: 'exact',
  profileIdentityEvidence: 'exact_private_visual_profile_identity',
  followsOwner: 'confirmed',
  followsOwnerEvidence: 'explicit_visible_follows_owner_signal',
  profileToThread: 'exact',
  threadBindingEvidence: 'exact_bound_thread_observed',
  ownerBindingEvidence: 'exact_owner_account_observed',
  dedupeStatus: 'clear_no_prior_welcome_or_attempt',
  alreadyWelcomedStatus: 'not_found',
  sendHistoryStatus: 'no_prior_attempt',
  dedupeEvidence: 'exact_bound_thread_history_observed',
});

const ANCHOR_DOMAINS = Object.freeze({
  exactTarget: 'crm-core:instagram:exact-target-utf8:v1\0',
  notification: 'crm-core:instagram:ui-attested-notification:v1\0',
  profile: 'crm-core:instagram:ui-attested-profile:v1\0',
  thread: 'crm-core:instagram:bound-thread-reference-utf8:v1\0',
  owner: 'crm-core:instagram:owner-account-reference-utf8:v1\0',
  dedupe: 'crm-core:instagram:ui-attested-dedupe:v1\0',
  sourceEvidence: 'crm-core:instagram:ui-attested-source-evidence:v1\0',
});

const RECEIPT_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER));
const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isOpaqueId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);

const comparePropertyKeys = (left, right) => {
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
};

const snapshotPlainDataObject = (value, expectedFields) => {
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || Array.isArray(value)
  ) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value).sort(comparePropertyKeys);
    const wanted = [...expectedFields].sort(comparePropertyKeys);
    if (
      ownKeys.length !== wanted.length
      || ownKeys.some((key, index) => typeof key !== 'string' || key !== wanted[index])
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot = Object.create(null);
    for (const key of wanted) {
      const descriptor = descriptors[key];
      if (
        !descriptor
        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true
      ) return null;
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
};

const snapshotDataArray = (value) => {
  if (
    nodeUtilTypes.isProxy(value)
    || !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => {
      if (key === 'length') return false;
      if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) return true;
      const index = Number(key);
      return !Number.isSafeInteger(index) || index < 0 || index >= value.length;
    })) return null;
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor
        || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true
      ) return null;
      output.push(descriptor.value);
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
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

const isExactPrivateUtf8 = (value, maximumBytes) => {
  if (
    typeof value !== 'string'
    || value.length === 0
    || !isWellFormedUnicode(value)
    || /[\0\r\n]/.test(value)
  ) return false;
  const byteLength = Buffer.byteLength(value, 'utf8');
  return byteLength >= 1 && byteLength <= maximumBytes;
};

const parseCanonicalTimestamp = (value) => {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : null;
};

const isFreshTimestamp = (value, nowMs) => {
  const timestampMs = parseCanonicalTimestamp(value);
  return timestampMs !== null
    && timestampMs <= nowMs
    && nowMs - timestampMs <= WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS;
};

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');

const lengthPrefixedUtf8 = (value) => {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([length, bytes]);
};

const deriveAnchorSha256 = (domain, values) => sha256Bytes(Buffer.concat([
  Buffer.from(domain, 'utf8'),
  ...values.map(lengthPrefixedUtf8),
]));

const deriveExactTargetAnchorSha256 = (exactTarget) => sha256Bytes(Buffer.concat([
  Buffer.from(ANCHOR_DOMAINS.exactTarget, 'utf8'),
  Buffer.from(exactTarget, 'utf8'),
]));

const addBlocker = (blockers, blocker) => {
  if (!blockers.includes(blocker)) blockers.push(blocker);
};

const snapshotEvidenceSections = (root) => {
  const notification = snapshotPlainDataObject(root?.notification_row, NOTIFICATION_ROW_FIELDS);
  const profile = snapshotPlainDataObject(root?.profile, PROFILE_FIELDS);
  const thread = snapshotPlainDataObject(root?.thread, THREAD_FIELDS);
  const owner = snapshotPlainDataObject(root?.owner, OWNER_FIELDS);
  const dedupe = snapshotPlainDataObject(root?.dedupe, DEDUPE_FIELDS);
  return notification && profile && thread && owner && dedupe
    ? Object.freeze({ notification, profile, thread, owner, dedupe })
    : null;
};

const evaluateEvidence = ({ root, sections, nowMs, inputSchemaExpected }) => {
  const blockers = [];
  if (root.schema_version !== inputSchemaExpected) {
    addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.INPUT_SCHEMA);
  }
  if (root.source_class !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS) {
    addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.SOURCE_CLASS);
  }
  if (!isOpaqueId(root.mission_id)) {
    addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.MISSION_BINDING);
  }
  if (
    root.exact_follow_timestamp_claimed !== false
    || root.provider_event_id_claimed !== false
    || root.campaign_membership_claimed !== false
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.UNSUPPORTED_CLAIM);

  const { notification, profile, thread, owner, dedupe } = sections;
  if (
    !Number.isInteger(notification.row_ordinal)
    || notification.row_ordinal < 1
    || notification.row_ordinal > WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS
    || notification.notification_evidence !== EXACT.notificationEvidence
    || notification.follower_signal !== EXACT.followerSignal
    || notification.inference_status !== EXACT.inferenceStatus
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.NOTIFICATION);

  const exactTargetValues = [
    notification.exact_target_utf8,
    profile.exact_target_utf8,
    dedupe.exact_target_utf8,
  ];
  const exactThreadValues = [
    thread.bound_thread_reference_utf8,
    dedupe.bound_thread_reference_utf8,
  ];
  const exactOwnerValues = [
    owner.owner_account_reference_utf8,
    dedupe.owner_account_reference_utf8,
  ];
  if (
    !exactTargetValues.every((value) => isExactPrivateUtf8(value, 512))
    || !exactThreadValues.every((value) => isExactPrivateUtf8(value, 2_048))
    || !exactOwnerValues.every((value) => isExactPrivateUtf8(value, 2_048))
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.PRIVATE_UTF8);

  if (
    !isExactPrivateUtf8(notification.time_bucket_utf8, 128)
    || notification.time_bucket_evidence !== EXACT.timeBucketEvidence
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_BUCKET);

  if (
    profile.notification_to_profile_binding !== EXACT.notificationToProfile
    || profile.profile_identity_evidence !== EXACT.profileIdentityEvidence
    || profile.inference_status !== EXACT.inferenceStatus
    || exactTargetValues.some((value) => value !== notification.exact_target_utf8)
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.IDENTITY_BINDING);

  if (
    profile.follows_owner !== EXACT.followsOwner
    || profile.follows_owner_evidence !== EXACT.followsOwnerEvidence
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.FOLLOWS_OWNER);

  if (
    thread.profile_to_thread_binding !== EXACT.profileToThread
    || thread.thread_binding_evidence !== EXACT.threadBindingEvidence
    || thread.inference_status !== EXACT.inferenceStatus
    || exactThreadValues.some((value) => value !== thread.bound_thread_reference_utf8)
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.THREAD_BINDING);

  if (
    owner.owner_binding_evidence !== EXACT.ownerBindingEvidence
    || owner.inference_status !== EXACT.inferenceStatus
    || exactOwnerValues.some((value) => value !== owner.owner_account_reference_utf8)
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.OWNER_BINDING);

  if (
    dedupe.status !== EXACT.dedupeStatus
    || dedupe.already_welcomed_status !== EXACT.alreadyWelcomedStatus
    || dedupe.send_history_status !== EXACT.sendHistoryStatus
    || dedupe.dedupe_evidence !== EXACT.dedupeEvidence
    || dedupe.inference_status !== EXACT.inferenceStatus
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.DEDUPE);

  const evidenceTimes = [
    notification.attested_at,
    profile.attested_at,
    thread.attested_at,
    owner.attested_at,
    dedupe.checked_at,
  ];
  const evidenceTimeMs = evidenceTimes.map(parseCanonicalTimestamp);
  if (
    !Number.isFinite(nowMs)
    || nowMs < 0
    || evidenceTimes.some((value) => !isFreshTimestamp(value, nowMs))
    || evidenceTimeMs.some((value) => value === null)
    || evidenceTimeMs.slice(0, 4).some((value) => value > evidenceTimeMs[4])
  ) addBlocker(blockers, WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.TIME_EVIDENCE);

  return Object.freeze({ blockers: Object.freeze(blockers) });
};

const buildAnchors = (sections) => {
  const exactTarget = sections.notification.exact_target_utf8;
  const threadReference = sections.thread.bound_thread_reference_utf8;
  const ownerReference = sections.owner.owner_account_reference_utf8;
  const candidateAnchor = deriveExactTargetAnchorSha256(exactTarget);
  const notificationAnchor = deriveAnchorSha256(ANCHOR_DOMAINS.notification, [
    String(sections.notification.row_ordinal),
    exactTarget,
    sections.notification.follower_signal,
  ]);
  const profileAnchor = deriveAnchorSha256(ANCHOR_DOMAINS.profile, [exactTarget]);
  const threadAnchor = deriveAnchorSha256(ANCHOR_DOMAINS.thread, [threadReference]);
  const ownerAnchor = deriveAnchorSha256(ANCHOR_DOMAINS.owner, [ownerReference]);
  const dedupeAnchor = deriveAnchorSha256(ANCHOR_DOMAINS.dedupe, [
    candidateAnchor,
    threadAnchor,
    ownerAnchor,
  ]);
  return Object.freeze({
    source_evidence_anchor_sha256: notificationAnchor,
    profile_anchor_sha256: profileAnchor,
    candidate_anchor_sha256: candidateAnchor,
    thread_anchor_sha256: threadAnchor,
    owner_anchor_sha256: ownerAnchor,
    dedupe_anchor_sha256: dedupeAnchor,
  });
};

const evidenceDigestPayload = ({ root, sections, anchors }) => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
  adapter_contract_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
  source_class: root.source_class,
  mission_id: root.mission_id,
  notification_row: sections.notification,
  profile: sections.profile,
  thread: sections.thread,
  owner: sections.owner,
  dedupe: sections.dedupe,
  exact_follow_timestamp_claimed: root.exact_follow_timestamp_claimed,
  provider_event_id_claimed: root.provider_event_id_claimed,
  campaign_membership_claimed: root.campaign_membership_claimed,
  anchors,
});

const deriveSourceEvidenceSha256 = ({ root, sections, anchors }) => deriveAnchorSha256(
  ANCHOR_DOMAINS.sourceEvidence,
  [JSON.stringify(evidenceDigestPayload({ root, sections, anchors }))],
);

const buildReceipt = ({ ready = false, blockerCodes = [] }) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION,
  adapter_contract_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
  redaction_status:
    'aggregate_allowlist_only_no_private_values_times_buckets_paths_anchors_or_digests',
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  decision: ready
    ? WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY
    : WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.BLOCKED,
  evidence_record_count: ready ? 1 : 0,
  record_cap: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS,
  ui_attested_source_ready: ready,
  notification_row_exact: ready,
  time_bucket_attested: ready,
  identity_binding_exact: ready,
  follows_owner_confirmed: ready,
  thread_binding_exact: ready,
  owner_binding_exact: ready,
  dedupe_clear: ready,
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
  normalization_performed: false,
  private_projection_issued: ready,
  source_execution: false,
  canary_ready: false,
  live_authority: false,
  send_allowed: false,
  external_effect_invoked: false,
  browser_used: false,
  network_used: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const blockedResult = (blockerCodes = [
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.INPUT_SCHEMA,
]) => Object.freeze({
  private_projection: null,
  redacted_receipt: buildReceipt({ blockerCodes }),
});

const snapshotOptionsNowMs = (options) => {
  const snapshot = snapshotPlainDataObject(options, ['nowMs']);
  return snapshot && Number.isFinite(snapshot.nowMs) && snapshot.nowMs >= 0
    ? snapshot.nowMs
    : null;
};

const adaptWelcomeAudioUiAttestedFollowerSource = (input, options = {}) => {
  try {
    const nowMs = snapshotOptionsNowMs(options);
    const root = snapshotPlainDataObject(input, INPUT_FIELDS);
    if (nowMs === null || !root) return blockedResult();
    const sections = snapshotEvidenceSections(root);
    if (!sections) return blockedResult();
    const evaluation = evaluateEvidence({
      root,
      sections,
      nowMs,
      inputSchemaExpected: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
    });
    if (evaluation.blockers.length > 0) return blockedResult(evaluation.blockers);
    const anchors = buildAnchors(sections);
    const projectionRoot = Object.freeze({
      schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
      adapter_contract_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
      source_class: root.source_class,
      mission_id: root.mission_id,
      notification_row: sections.notification,
      profile: sections.profile,
      thread: sections.thread,
      owner: sections.owner,
      dedupe: sections.dedupe,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
      anchors,
      source_evidence_sha256: deriveSourceEvidenceSha256({ root, sections, anchors }),
    });
    if (validateWelcomeAudioUiAttestedFollowerSourceProjection(
      projectionRoot,
      { nowMs },
    ).ok !== true) {
      return blockedResult([
        WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.PROJECTION_CONTRACT,
      ]);
    }
    return Object.freeze({
      private_projection: projectionRoot,
      redacted_receipt: buildReceipt({ ready: true }),
    });
  } catch {
    return blockedResult();
  }
};

const validateWelcomeAudioUiAttestedFollowerSourceProjection = (
  projection,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.PROJECTION_CONTRACT,
  });
  try {
    const nowMs = snapshotOptionsNowMs(options);
    const root = snapshotPlainDataObject(projection, PROJECTION_FIELDS);
    if (nowMs === null || !root) return invalid();
    if (
      root.schema_version !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION
      || root.adapter_contract_version
        !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION
      || !isSha256(root.source_evidence_sha256)
    ) return invalid();
    const sections = snapshotEvidenceSections(root);
    const anchors = snapshotPlainDataObject(root.anchors, ANCHOR_FIELDS);
    if (!sections || !anchors) return invalid();
    const evaluation = evaluateEvidence({
      root,
      sections,
      nowMs,
      inputSchemaExpected: WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
    });
    if (evaluation.blockers.length > 0) return invalid();
    const expectedAnchors = buildAnchors(sections);
    if (ANCHOR_FIELDS.some((field) => anchors[field] !== expectedAnchors[field])) {
      return invalid();
    }
    const expectedDigest = deriveSourceEvidenceSha256({
      root,
      sections,
      anchors: expectedAnchors,
    });
    return root.source_evidence_sha256 === expectedDigest
      ? Object.freeze({ ok: true, reason: null })
      : invalid();
  } catch {
    return invalid();
  }
};

const validateWelcomeAudioUiAttestedFollowerSourceReceipt = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER.RECEIPT_CONTRACT,
  });
  try {
    const root = snapshotPlainDataObject(
      receipt,
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS,
    );
    if (!root) return invalid();
    const blockerCodes = snapshotDataArray(root.blocker_codes);
    if (!blockerCodes) return invalid();
    const ready = root.decision === WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY;
    const fixedValid = root.receipt_schema_version
        === WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION
      && root.adapter_contract_version
        === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION
      && root.redaction_status
        === 'aggregate_allowlist_only_no_private_values_times_buckets_paths_anchors_or_digests'
      && root.source_class === WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS
      && Object.values(WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION).includes(root.decision)
      && Number.isInteger(root.evidence_record_count)
      && [0, 1].includes(root.evidence_record_count)
      && root.record_cap === WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS
      && RECEIPT_BOOLEAN_FIELDS.every((field) => typeof root[field] === 'boolean')
      && root.exact_follow_timestamp_claimed === false
      && root.provider_event_id_claimed === false
      && root.campaign_membership_claimed === false
      && root.normalization_performed === false
      && root.source_execution === false
      && root.canary_ready === false
      && root.live_authority === false
      && root.send_allowed === false
      && root.external_effect_invoked === false
      && root.browser_used === false
      && root.network_used === false
      && blockerCodes.every((code) => RECEIPT_BLOCKERS.has(code))
      && new Set(blockerCodes).size === blockerCodes.length;
    if (!fixedValid) return invalid();
    const evidenceFlags = [
      'ui_attested_source_ready',
      'notification_row_exact',
      'time_bucket_attested',
      'identity_binding_exact',
      'follows_owner_confirmed',
      'thread_binding_exact',
      'owner_binding_exact',
      'dedupe_clear',
      'private_projection_issued',
    ];
    const semanticsValid = ready
      ? root.evidence_record_count === 1
        && evidenceFlags.every((field) => root[field] === true)
        && blockerCodes.length === 0
      : root.evidence_record_count === 0
        && evidenceFlags.every((field) => root[field] === false)
        && blockerCodes.length >= 1;
    return semanticsValid ? Object.freeze({ ok: true, reason: null }) : invalid();
  } catch {
    return invalid();
  }
};

export {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ADAPTER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_MAX_RECORDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  adaptWelcomeAudioUiAttestedFollowerSource,
  validateWelcomeAudioUiAttestedFollowerSourceProjection,
  validateWelcomeAudioUiAttestedFollowerSourceReceipt,
};
