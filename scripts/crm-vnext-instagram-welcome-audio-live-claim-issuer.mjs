import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  link,
  lstat,
  open,
  readdir,
  realpath,
  rename,
  unlink,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
  sep,
} from 'node:path';
import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS,
  consumeWelcomeAudioLiveOperationContextCapabilityOnce,
  revalidateWelcomeAudioLiveAuthorityCapability,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
  verifySealedWelcomeAudioManifestCapability,
} from './crm-vnext-instagram-welcome-audio-live-preflight.mjs';
import {
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';

const WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_live_claim_issuer_v2';
const WELCOME_AUDIO_LIVE_CLAIM_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_claim_record_v2';
const WELCOME_AUDIO_LIVE_INSPECTION_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_inspection_record_v1';
const WELCOME_AUDIO_LIVE_INSPECTION_RESULT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_inspection_result_v1';
const WELCOME_AUDIO_LIVE_STATE_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_state_receipt_v1';
const WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_pending_attempt_v2';
const WELCOME_AUDIO_LIVE_TERMINAL_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_terminal_attempt_v2';
const WELCOME_AUDIO_LIVE_OBSERVATION_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_reply_observation_claim_v1';
const WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_reply_observation_receipt_v1';
const WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_attempt_receipt_v2';
const WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_claim_receipt_v1';
const WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE =
  'owner_only_live_claim_no_source_no_send';
const WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP = 3;
const WELCOME_AUDIO_LIVE_INSPECTION_CAP = 8;
const WELCOME_AUDIO_LIVE_RESERVATION_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_LIVE_INSPECTION_CAPABILITY_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_LIVE_OBSERVATION_WINDOW_MS = 72 * 60 * 60 * 1000;
const WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP = 3;
const WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP = 9;
const MAX_CLAIM_RECORD_BYTES = 32 * 1024;
const fatalUtf8Decoder = new TextDecoder('utf-8', { fatal: true });
const FIXED_LIVE_STORE_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-live-claim-store-v1',
);
const SYNTHETIC_STORE_PREFIX = 'crm-core-welcome-audio-live-claim-store-test-';
const WELCOME_AUDIO_LIVE_STORE_MODE = Object.freeze({
  FIXED_LIVE_OWNER_ONLY: 'fixed_live_owner_only',
  SYNTHETIC_TEMP_TEST_ONLY: 'synthetic_temp_test_only',
});

const WELCOME_AUDIO_LIVE_CLAIM_DECISION = Object.freeze({
  CREATED: 'pre_effect_reservation_created',
  CANCELLED: 'pre_effect_reservation_cancelled_zero_effect',
  DUPLICATE: 'duplicate_identity_claim_terminal_no_retry',
  CAP_REACHED: 'mission_claim_cap_reached',
  BLOCKED: 'blocked_before_claim',
  UNKNOWN_TERMINAL: 'claim_state_unknown_terminal_no_retry',
});

const WELCOME_AUDIO_LIVE_CLAIM_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_live_claim_input_invalid',
  PREFLIGHT_CAPABILITY_INVALID: 'blocked_live_claim_preflight_capability_invalid',
  STORE_INVALID: 'blocked_live_claim_store_invalid',
  SERIALIZATION_COLLISION: 'blocked_live_claim_serialization_collision_unknown',
  CLAIM_EVIDENCE_UNKNOWN: 'blocked_live_claim_evidence_unknown',
  DUPLICATE_IDENTITY: 'blocked_live_claim_duplicate_identity',
  MISSION_CAP_REACHED: 'blocked_live_claim_mission_cap_reached',
  CLAIM_PUBLICATION_UNKNOWN: 'blocked_live_claim_publication_unknown',
  INSPECTION_ORDER_INVALID: 'blocked_live_inspection_order_invalid',
  INSPECTION_CAP_REACHED: 'blocked_live_inspection_cap_reached',
  INSPECTION_RESULT_MISSING: 'blocked_live_inspection_result_missing',
  INSPECTION_NOT_ELIGIBLE: 'blocked_live_inspection_not_eligible',
  STORE_MODE_INVALID: 'blocked_live_store_mode_invalid',
  PENDING_PREEXISTING: 'blocked_live_pending_preexisting',
  TERMINAL_PREEXISTING: 'blocked_live_terminal_preexisting',
  ATTEMPT_BOUNDARY_INVALID: 'blocked_live_attempt_boundary_invalid',
  ATTEMPT_FINALIZATION_UNKNOWN: 'blocked_live_attempt_finalization_unknown',
  RESERVATION_ACTIVE: 'blocked_live_reservation_owner_active',
  RESERVATION_CANCEL_INVALID: 'blocked_live_reservation_cancel_invalid',
  RESERVATION_RECOVERY_INVALID: 'blocked_live_reservation_recovery_invalid',
  MISSION_SLOT_BLOCKED: 'blocked_live_mission_slot_not_sequentially_confirmed',
  OBSERVATION_INVALID: 'blocked_live_reply_observation_invalid',
  OBSERVATION_CAP_REACHED: 'blocked_live_reply_observation_cap_reached',
});

const WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME = Object.freeze({
  CONFIRMED: 'confirmed_exact_thread_new_audio_terminal_no_retry',
  UNKNOWN: 'attempted_or_unknown_terminal_no_retry',
});

const WELCOME_AUDIO_LIVE_ATTEMPT_DECISION = Object.freeze({
  ARMED: 'pending_durable_before_attachment_upload',
  FINALIZED_CONFIRMED: 'terminal_confirmed_durable_no_retry',
  FINALIZED_UNKNOWN: 'terminal_unknown_durable_no_retry',
  BLOCKED: 'attempt_boundary_blocked',
  UNKNOWN_TERMINAL: 'attempt_boundary_unknown_terminal',
});

const WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION = Object.freeze({
  ELIGIBLE: 'eligible_for_audio',
  ALREADY_WELCOMED: 'already_welcomed_no_effect',
  PRIOR_AUDIO: 'prior_audio_present_no_effect',
  PRIOR_CLAIM: 'prior_claim_present_no_effect',
  NO_LONGER_FOLLOWS: 'no_longer_follows_no_effect',
  NOT_MESSAGEABLE: 'not_messageable_no_effect',
  INELIGIBLE_CLEAR_BINDING: 'ineligible_clear_binding_no_effect',
});

const WELCOME_AUDIO_LIVE_STATE_DECISION = Object.freeze({
  INSPECTION_CLAIMED: 'ordered_inspection_claimed_no_source',
  INSPECTION_RECORDED: 'inspection_result_recorded',
  BLOCKED: 'state_transition_blocked',
  UNKNOWN_TERMINAL: 'state_transition_unknown_terminal',
});

const WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS = Object.freeze({
  FRESH: 'fresh',
  CONSUMED: 'consumed',
  INVALID: 'invalid',
});

const WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS = Object.freeze({
  VALID: 'valid_host_pending_capability_consumed',
  INVALID: 'invalid_host_pending_capability',
});

const WELCOME_AUDIO_LIVE_OBSERVATION_DECISION = Object.freeze({
  CLAIMED: 'reply_observation_claim_durable_before_thread_read',
  BLOCKED: 'reply_observation_claim_blocked',
});

const WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS = Object.freeze({
  VALID: 'valid_reply_observation_capability_consumed',
  INVALID: 'invalid_reply_observation_capability',
});

const WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST = Object.freeze({
  IMPORT_FAILURE: 'synthetic_dynamic_import_failure',
  MODULE_IDENTITY_FAILURE: 'synthetic_module_identity_failure',
  VERIFIER_FAILURE: 'synthetic_verifier_failure',
  CRASH_AFTER_TERMINAL_PUBLISH: 'synthetic_crash_after_terminal_publish',
  REPLACE_PENDING_AFTER_TERMINAL_PUBLISH:
    'synthetic_replace_pending_after_terminal_publish',
});

const WELCOME_AUDIO_LIVE_CANCELLATION_CLEANUP_SCENARIO_FOR_TEST = Object.freeze({
  REPLACE_CLAIM_AFTER_CANCELLATION_PUBLISH:
    'synthetic_replace_claim_after_cancellation_publish',
});

const WELCOME_AUDIO_LIVE_ATTEMPT_BOUNDARY_SCENARIO_FOR_TEST = Object.freeze({
  FORCE_PRE_PENDING_REVALIDATION_FAILURE:
    'synthetic_force_pre_pending_revalidation_failure',
});

const WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST = Object.freeze({
  REPLACE_FIXED_MUTEX_BEFORE_RELEASE:
    'synthetic_replace_fixed_mutex_before_release',
  REPLACE_FIXED_MUTEX_DURING_DEAD_OWNER_RECOVERY:
    'synthetic_replace_fixed_mutex_during_dead_owner_recovery',
  PUBLISH_NEW_FIXED_MUTEX_AFTER_RELEASE_RENAME:
    'synthetic_publish_new_fixed_mutex_after_release_rename',
  PUBLISH_NEW_FIXED_MUTEX_AFTER_DEAD_OWNER_RECOVERY_RENAME:
    'synthetic_publish_new_fixed_mutex_after_dead_owner_recovery_rename',
});

const WELCOME_AUDIO_LIVE_HOST_PENDING_EVIDENCE_FIELDS = Object.freeze([
  'store_identity',
  'pending_path',
  'pending_digest',
  'pending_metadata',
  'pending_snapshot',
]);

const WELCOME_AUDIO_LIVE_HOST_PENDING_STORE_IDENTITY_FIELDS = Object.freeze([
  'path',
  'dev',
  'ino',
  'uid',
  'mode',
]);

const WELCOME_AUDIO_LIVE_HOST_PENDING_METADATA_FIELDS = Object.freeze([
  'dev',
  'ino',
  'uid',
  'mode',
  'nlink',
  'size',
  'mtimeMs',
  'ctimeMs',
]);

const WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'claim_issuer_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'claim_created_by_current_invocation',
  'permanent_no_retry_claim_present',
  'mission_claim_count',
  'mission_claim_cap',
  'dedupe_clear_before_claim',
  'manifest_membership_bound',
  'campaign_interval_bound',
  'audio_asset_bound',
  'private_claim_capability_issued',
  'send_allowed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'retry_disposition',
  'blocker_codes',
]);

const WELCOME_AUDIO_LIVE_CLAIM_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'claim_issuer_contract_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'approval_packet_id',
  'operation_id',
  'central_repo_head',
  'canonical_operation_sha256',
  'approval_binding_sha256',
  'identity_anchor_sha256',
  'identity_anchor_schema_version',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'manifest_sha256',
  'campaign_interval_sha256',
  'audio_asset_sha256',
  'manifest_ordinal',
  'mission_slot',
  'claimed_at',
  'claim_status',
  'retry_disposition',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'reservation_expires_at',
]);

const WELCOME_AUDIO_LIVE_RESERVATION_CANCELLATION_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_reservation_cancellation_v2';
const WELCOME_AUDIO_LIVE_RESERVATION_CANCELLATION_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'identity_anchor_schema_version',
  'identity_anchor_sha256',
  'manifest_ordinal',
  'mission_slot',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'cancelled_at',
  'cancellation_reason',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'network_effect_entered',
  'retry_disposition',
]);

const WELCOME_AUDIO_LIVE_INSPECTION_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'manifest_sha256',
  'campaign_interval_sha256',
  'identity_anchor_sha256',
  'manifest_ordinal',
  'inspection_claimed_at',
  'claim_status',
  'claim_nonce',
]);

const WELCOME_AUDIO_LIVE_INSPECTION_RESULT_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'manifest_sha256',
  'campaign_interval_sha256',
  'identity_anchor_sha256',
  'manifest_ordinal',
  'inspection_claim_nonce',
  'classification',
  'recorded_at',
]);

const WELCOME_AUDIO_LIVE_STATE_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'claim_issuer_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'inspection_cursor_count',
  'inspection_cap',
  'manifest_order_enforced',
  'private_capability_issued',
  'source_read_allowed',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_LIVE_PENDING_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'approval_packet_id',
  'operation_id',
  'central_repo_head',
  'canonical_operation_sha256',
  'approval_binding_sha256',
  'identity_anchor_sha256',
  'identity_anchor_schema_version',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'manifest_sha256',
  'campaign_interval_sha256',
  'audio_asset_sha256',
  'manifest_ordinal',
  'mission_slot',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'entered_at',
  'boundary_status',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'attempt_nonce',
]);

const WELCOME_AUDIO_LIVE_TERMINAL_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'approval_packet_id',
  'operation_id',
  'central_repo_head',
  'canonical_operation_sha256',
  'approval_binding_sha256',
  'identity_anchor_sha256',
  'identity_anchor_schema_version',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'manifest_sha256',
  'campaign_interval_sha256',
  'audio_asset_sha256',
  'manifest_ordinal',
  'mission_slot',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'attempt_nonce',
  'entered_at',
  'attempted_at',
  'finalized_at',
  'outcome',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'confirmation_marker',
  'confirmation_observed_at',
  'new_outgoing_audio_bubble_delta',
  'observation_window_expires_at',
  'retry_disposition',
]);

const WELCOME_AUDIO_LIVE_OBSERVATION_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'claim_issuer_contract_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'operation_id',
  'identity_anchor_schema_version',
  'identity_anchor_sha256',
  'thread_anchor_sha256',
  'attempt_nonce',
  'manifest_ordinal',
  'mission_slot',
  'thread_observation_ordinal',
  'mission_observation_ordinal',
  'confirmed_terminal_sha256',
  'confirmed_terminal_finalized_at',
  'window_expires_at',
  'claimed_at',
  'claim_status',
  'claim_nonce',
]);

const WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'claim_issuer_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'thread_observation_count',
  'thread_observation_cap',
  'mission_observation_count',
  'mission_observation_cap',
  'private_capability_issued',
  'source_read_allowed',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'claim_issuer_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'pending_record_present',
  'terminal_record_present',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'private_actuation_capability_issued',
  'claim_capability_consumed',
  'zero_effect_reservation_cancelled',
  'send_allowed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'retry_disposition',
  'blocker_codes',
]);

const CLAIM_CAPABILITY_STATE = new WeakMap();
const INSPECTION_CAPABILITY_STATE = new WeakMap();
const STORE_CAPABILITY_STATE = new WeakMap();
const ACTUATION_CAPABILITY_STATE = new WeakMap();
const HOST_PENDING_CAPABILITY_STATE = new WeakMap();
const OBSERVATION_CAPABILITY_STATE = new WeakMap();
const CANCELLATION_CLEANUP_TEST_SCENARIO_BY_CLAIM_NONCE = new Map();
const MUTEX_TEST_SCENARIO_BY_STORE_PATH = new Map();
const RECEIPT_DECISIONS = new Set(Object.values(WELCOME_AUDIO_LIVE_CLAIM_DECISION));
const RECEIPT_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER));
const INSPECTION_CLASSIFICATIONS = new Set(Object.values(WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION));
const STATE_DECISIONS = new Set(Object.values(WELCOME_AUDIO_LIVE_STATE_DECISION));
const ATTEMPT_DECISIONS = new Set(Object.values(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION));
const STRONG_CONFIRMATION_MARKERS = new Set([
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
]);

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
};

const inspectExactDataEnvelope = (value, expectedFields) => {
  try {
    if (
      value === null
      || typeof value !== 'object'
      || nodeUtilTypes.isProxy(value)
    ) return Object.freeze({ valid: false, values: Object.freeze({}) });
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    const exact = Object.getPrototypeOf(value) === Object.prototype
      && ownKeys.length === expectedFields.length
      && ownKeys.every((key) => typeof key === 'string' && expectedFields.includes(key));
    const values = Object.create(null);
    let dataOnly = exact;
    for (const field of expectedFields) {
      const descriptor = descriptors[field];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) {
        dataOnly = false;
      } else {
        values[field] = descriptor.value;
      }
    }
    return Object.freeze({ valid: dataOnly, values: Object.freeze(values) });
  } catch {
    return Object.freeze({ valid: false, values: Object.freeze({}) });
  }
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isOpaqueId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const isExactIsoTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const canonicalSha256 = (value) => sha256(
  Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'),
);
const stableJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');
const exactMode = (metadata, expected) => (metadata.mode & 0o7777) === expected;
const sameMetadata = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs
  && actual.ctimeMs === expected.ctimeMs;

// A same-directory rename preserves the inode and file contents, but may legitimately
// advance ctime. Cleanup therefore compares only the stable identity/content metadata
// that must survive the quarantine rename; the quarantined path is still stable-read.
const sameMetadataAcrossRename = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs;

const assertAbsoluteCleanPath = (value) => {
  const segments = typeof value === 'string' ? value.split(sep) : [];
  if (
    typeof value !== 'string'
    || !isAbsolute(value)
    || value !== resolve(value)
    || segments.some((segment) => segment === '.' || segment === '..')
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
};

const assertWelcomeAudioLiveClaimStoreRoot = async ({
  store_root,
  expected_identity = null,
}) => {
  assertAbsoluteCleanPath(store_root);
  const unresolved = await lstat(store_root);
  if (
    !unresolved.isDirectory()
    || unresolved.isSymbolicLink()
    || !exactMode(unresolved, 0o700)
    || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  const canonical = await realpath(store_root);
  if (canonical !== store_root) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  }
  const metadata = await lstat(canonical);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !exactMode(metadata, 0o700)
    || metadata.dev !== unresolved.dev
    || metadata.ino !== unresolved.ino
    || metadata.uid !== unresolved.uid
    || metadata.mode !== unresolved.mode
    || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    || (expected_identity && (
      metadata.dev !== expected_identity.dev
      || metadata.ino !== expected_identity.ino
      || metadata.uid !== expected_identity.uid
      || metadata.mode !== expected_identity.mode
    ))
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  return Object.freeze({
    path: canonical,
    dev: metadata.dev,
    ino: metadata.ino,
    uid: metadata.uid,
    mode: metadata.mode,
  });
};

const createStoreCapability = (storeIdentity, mode) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: {
      value: Symbol('crm_core_welcome_audio_private_live_store_capability'),
      enumerable: true,
    },
    toJSON: {
      value: () => { throw new TypeError('private_live_store_capability_not_serializable'); },
    },
  });
  Object.freeze(capability);
  STORE_CAPABILITY_STATE.set(capability, Object.freeze({ storeIdentity, mode }));
  return capability;
};

const openFixedWelcomeAudioLiveClaimStore = async () => {
  const storeIdentity = await assertWelcomeAudioLiveClaimStoreRoot({
    store_root: FIXED_LIVE_STORE_ROOT,
  });
  return createStoreCapability(storeIdentity, WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY);
};

const createSyntheticWelcomeAudioLiveClaimStoreCapability = async ({ store_root }) => {
  const canonicalTemp = await realpath(tmpdir());
  if (
    typeof store_root !== 'string'
    || dirname(store_root) !== canonicalTemp
    || !basename(store_root).startsWith(SYNTHETIC_STORE_PREFIX)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  const storeIdentity = await assertWelcomeAudioLiveClaimStoreRoot({ store_root });
  return createStoreCapability(storeIdentity, WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY);
};

const verifySyntheticWelcomeAudioLiveClaimStoreRootBindingForTest = async (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_store_capability',
    'synthetic_store_root',
  ]);
  if (!envelope.valid || typeof envelope.values.synthetic_store_root !== 'string') {
    return false;
  }
  try {
    const resolved = await resolveWelcomeAudioLiveClaimStoreCapability(
      envelope.values.private_store_capability,
    );
    const canonicalRoot = await realpath(envelope.values.synthetic_store_root);
    return resolved.mode === WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
      && resolved.storeIdentity.path === canonicalRoot
      ? true
      : false;
  } catch {
    return false;
  }
};

const configureWelcomeAudioLiveCancellationCleanupScenarioForTest = (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_claim_capability',
    'scenario',
  ]);
  const state = CLAIM_CAPABILITY_STATE.get(envelope.values.private_claim_capability);
  if (
    !envelope.valid
    || !state
    || state.consumed
    || state.store_mode !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
    || !Object.values(WELCOME_AUDIO_LIVE_CANCELLATION_CLEANUP_SCENARIO_FOR_TEST).includes(
      envelope.values.scenario,
    )
  ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  CANCELLATION_CLEANUP_TEST_SCENARIO_BY_CLAIM_NONCE.set(
    state.claim_nonce,
    envelope.values.scenario,
  );
  return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH;
};

const configureWelcomeAudioLiveAttemptBoundaryScenarioForTest = (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_claim_capability',
    'scenario',
  ]);
  const state = CLAIM_CAPABILITY_STATE.get(envelope.values.private_claim_capability);
  if (
    !envelope.valid
    || !state
    || state.consumed
    || state.store_mode !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
    || !Object.values(WELCOME_AUDIO_LIVE_ATTEMPT_BOUNDARY_SCENARIO_FOR_TEST).includes(
      envelope.values.scenario,
    )
  ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  state.synthetic_attempt_boundary_scenario = envelope.values.scenario;
  return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH;
};

const configureWelcomeAudioLiveMutexScenarioForTest = (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_store_capability',
    'scenario',
  ]);
  const state = STORE_CAPABILITY_STATE.get(envelope.values.private_store_capability);
  if (
    !envelope.valid
    || !state
    || state.mode !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
    || !Object.values(WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST).includes(envelope.values.scenario)
  ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  MUTEX_TEST_SCENARIO_BY_STORE_PATH.set(state.storeIdentity.path, envelope.values.scenario);
  return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH;
};

const resolveWelcomeAudioLiveClaimStoreCapability = async (capability) => {
  const state = STORE_CAPABILITY_STATE.get(capability);
  if (!state) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  const storeIdentity = await assertWelcomeAudioLiveClaimStoreRoot({
    store_root: state.storeIdentity.path,
    expected_identity: state.storeIdentity,
  });
  return Object.freeze({ storeIdentity, mode: state.mode });
};

const syncStoreDirectory = async (storeIdentity) => {
  let handle;
  try {
    handle = await open(storeIdentity.path, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await handle.stat();
    if (
      !metadata.isDirectory()
      || !exactMode(metadata, 0o700)
      || metadata.dev !== storeIdentity.dev
      || metadata.ino !== storeIdentity.ino
      || metadata.uid !== storeIdentity.uid
      || metadata.mode !== storeIdentity.mode
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
    await handle.sync();
  } finally {
    await handle?.close();
  }
};

const missionFingerprint = (missionId) => sha256(`mission:${missionId}`);
const identityFingerprint = (identityAnchorSha256) => sha256(`identity:${identityAnchorSha256}`);
const threadFingerprint = (threadAnchorSha256) => sha256(`thread:${threadAnchorSha256}`);

const buildStorePaths = ({ storeIdentity, missionId, identityAnchorSha256 }) => {
  const mission = missionFingerprint(missionId);
  const identity = identityFingerprint(identityAnchorSha256);
  return Object.freeze({
    mission,
    identity,
    mutex: join(storeIdentity.path, 'mutex-global-ledger.lock'),
    mutexTemporaryPrefix: '.mutex-owner-',
    mutexRecoveryPrefix: '.mutex-recovery-',
    mutexQuarantinePrefix: '.mutex-quarantine-',
    claim: join(storeIdentity.path, `claim-${identity}.json`),
    claimPrefix: 'claim-',
    temporaryPrefix: '.claim-',
    pending: join(storeIdentity.path, `pending-${identity}.json`),
    pendingTemporaryPrefix: `.pending-${identity}-`,
    terminal: join(storeIdentity.path, `terminal-${identity}.json`),
    terminalTemporaryPrefix: `.terminal-${identity}-`,
    reservationCancellation: (claimNonce) => join(
      storeIdentity.path,
      `reservation-cancel-${identity}-${claimNonce}.json`,
    ),
    reservationCancellationPrefix: `reservation-cancel-${identity}-`,
    reservationCancellationTemporaryPrefix: `.reservation-cancel-${identity}-`,
    inspection: (ordinal) => join(
      storeIdentity.path,
      `inspection-${mission}-${String(ordinal).padStart(2, '0')}-${identity}.json`,
    ),
    inspectionPrefix: `inspection-${mission}-`,
    inspectionTemporaryPrefix: `.inspection-${mission}-`,
    inspectionResult: (ordinal) => join(
      storeIdentity.path,
      `inspection-result-${mission}-${String(ordinal).padStart(2, '0')}-${identity}.json`,
    ),
    inspectionResultPrefix: `inspection-result-${mission}-`,
    inspectionResultTemporaryPrefix: `.inspection-result-${mission}-`,
    observation: ({ threadAnchorSha256, threadOrdinal }) => join(
      storeIdentity.path,
      `observation-${mission}-${threadFingerprint(threadAnchorSha256)}-${String(threadOrdinal).padStart(2, '0')}.json`,
    ),
    observationPrefix: `observation-${mission}-`,
    observationTemporaryPrefix: `.observation-${mission}-`,
  });
};

const processOwnerIsDefinitelyDead = (pid) => {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error?.code === 'ESRCH';
  }
};

const readMutexOwner = async ({
  storeIdentity,
  filePath,
  expectedNlink = null,
}) => {
  assertAbsoluteCleanPath(filePath);
  if (dirname(filePath) !== storeIdentity.path) return null;
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || before.isSymbolicLink()
      || !exactMode(before, 0o600)
      || before.nlink < 1
      || (expectedNlink !== null && before.nlink !== expectedNlink)
      || before.dev !== storeIdentity.dev
      || before.size < 2
      || before.size > 4096
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) return null;
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(filePath);
    if (
      !sameMetadata(after, before)
      || !sameMetadata(pathAfter, before)
      || bytes.length !== after.size
    ) return null;
    const owner = JSON.parse(fatalUtf8Decoder.decode(bytes));
    if (
      !exactObjectKeys(owner, ['owner_pid', 'owner_nonce'])
      || !Number.isInteger(owner.owner_pid)
      || owner.owner_pid < 1
      || !/^[a-f0-9]{64}$/.test(owner.owner_nonce)
    ) return null;
    return Object.freeze({
      owner: Object.freeze(owner),
      digest: sha256(bytes),
      metadata: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        uid: after.uid,
        mode: after.mode,
        nlink: after.nlink,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
      }),
    });
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
};

const publishMissionMutex = async ({ storeIdentity, paths }) => {
  const owner = Object.freeze({
    owner_pid: process.pid,
    owner_nonce: randomBytes(32).toString('hex'),
  });
  const temporaryPath = join(
    storeIdentity.path,
    `${paths.mutexTemporaryPrefix}${process.pid}-${owner.owner_nonce}.json`,
  );
  const ownerBytes = stableJsonBytes(owner);
  let handle;
  let linked = false;
  let temporaryRemoved = false;
  try {
    await assertWelcomeAudioLiveClaimStoreRoot({
      store_root: storeIdentity.path,
      expected_identity: storeIdentity,
    });
    handle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(ownerBytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await link(temporaryPath, paths.mutex);
    linked = true;
    const [temporaryLinked, fixedLinked] = await Promise.all([
      readMutexOwner({
        storeIdentity,
        filePath: temporaryPath,
        expectedNlink: 2,
      }),
      readMutexOwner({
        storeIdentity,
        filePath: paths.mutex,
        expectedNlink: 2,
      }),
    ]);
    if (
      !temporaryLinked
      || !fixedLinked
      || temporaryLinked.digest !== fixedLinked.digest
      || temporaryLinked.metadata.dev !== fixedLinked.metadata.dev
      || temporaryLinked.metadata.ino !== fixedLinked.metadata.ino
      || fixedLinked.owner.owner_pid !== owner.owner_pid
      || fixedLinked.owner.owner_nonce !== owner.owner_nonce
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
    await unlink(temporaryPath);
    temporaryRemoved = true;
    await syncStoreDirectory(storeIdentity);
    const fixed = await readMutexOwner({
      storeIdentity,
      filePath: paths.mutex,
      expectedNlink: 1,
    });
    if (
      !fixed
      || fixed.digest !== fixedLinked.digest
      || fixed.metadata.dev !== fixedLinked.metadata.dev
      || fixed.metadata.ino !== fixedLinked.metadata.ino
      || fixed.owner.owner_pid !== owner.owner_pid
      || fixed.owner.owner_nonce !== owner.owner_nonce
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
    return Object.freeze({
      dev: fixed.metadata.dev,
      ino: fixed.metadata.ino,
      uid: fixed.metadata.uid,
      mode: fixed.metadata.mode,
      owner_pid: owner.owner_pid,
      owner_nonce: owner.owner_nonce,
      digest: fixed.digest,
    });
  } finally {
    await handle?.close();
    if (!linked && !temporaryRemoved) {
      try {
        await unlink(temporaryPath);
      } catch {
        // The fixed mutex was never published; a missing private temporary is clean.
      }
    }
  }
};

const publishSyntheticFixedMutexForTest = async ({ storeIdentity, paths }) => {
  let handle;
  try {
    handle = await open(
      paths.mutex,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(stableJsonBytes({
      owner_pid: process.pid,
      owner_nonce: randomBytes(32).toString('hex'),
    }));
    await handle.sync();
  } finally {
    await handle?.close();
  }
  await syncStoreDirectory(storeIdentity);
};

const replaceFixedMutexBeforeQuarantineForTest = async ({ storeIdentity, paths }) => {
  const displacedPath = join(
    storeIdentity.path,
    `${paths.mutexTemporaryPrefix}${process.pid}-displaced-${randomBytes(16).toString('hex')}.json`,
  );
  await rename(paths.mutex, displacedPath);
  await syncStoreDirectory(storeIdentity);
  await publishSyntheticFixedMutexForTest({ storeIdentity, paths });
};

const quarantineAndDeleteExactMutex = async ({
  storeIdentity,
  paths,
  expectedMutex,
  requireDefinitelyDead,
}) => {
  const quarantinePath = join(
    storeIdentity.path,
    `${paths.mutexQuarantinePrefix}${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  try {
    await rename(paths.mutex, quarantinePath);
    await syncStoreDirectory(storeIdentity);
    const afterRenameScenario = MUTEX_TEST_SCENARIO_BY_STORE_PATH.get(storeIdentity.path);
    if (
      (!requireDefinitelyDead && afterRenameScenario
        === WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST
          .PUBLISH_NEW_FIXED_MUTEX_AFTER_RELEASE_RENAME)
      || (requireDefinitelyDead && afterRenameScenario
        === WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST
          .PUBLISH_NEW_FIXED_MUTEX_AFTER_DEAD_OWNER_RECOVERY_RENAME)
    ) {
      MUTEX_TEST_SCENARIO_BY_STORE_PATH.delete(storeIdentity.path);
      await publishSyntheticFixedMutexForTest({ storeIdentity, paths });
    }
    const entries = await readdir(storeIdentity.path);
    if (
      entries.some((entry) => (
        entry.startsWith(paths.mutexQuarantinePrefix)
        && entry !== basename(quarantinePath)
      ))
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
    const quarantined = await readMutexOwner({
      storeIdentity,
      filePath: quarantinePath,
      expectedNlink: expectedMutex.metadata.nlink,
    });
    if (
      !quarantined
      || quarantined.digest !== expectedMutex.digest
      || !sameMetadataAcrossRename(quarantined.metadata, expectedMutex.metadata)
      || quarantined.owner.owner_pid !== expectedMutex.owner.owner_pid
      || quarantined.owner.owner_nonce !== expectedMutex.owner.owner_nonce
      || (requireDefinitelyDead
        && !processOwnerIsDefinitelyDead(quarantined.owner.owner_pid))
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
    await unlink(quarantinePath);
    await syncStoreDirectory(storeIdentity);
    return true;
  } catch {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  }
};

const recoverDefinitelyDeadMissionMutex = async ({ storeIdentity, paths }) => {
  const loadedBefore = await readMutexOwner({
    storeIdentity,
    filePath: paths.mutex,
  });
  if (!loadedBefore || !processOwnerIsDefinitelyDead(loadedBefore.owner.owner_pid)) {
    return false;
  }
  try {
    if (MUTEX_TEST_SCENARIO_BY_STORE_PATH.get(storeIdentity.path)
      === WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST
        .REPLACE_FIXED_MUTEX_DURING_DEAD_OWNER_RECOVERY) {
      MUTEX_TEST_SCENARIO_BY_STORE_PATH.delete(storeIdentity.path);
      await replaceFixedMutexBeforeQuarantineForTest({ storeIdentity, paths });
    }
    await quarantineAndDeleteExactMutex({
      storeIdentity,
      paths,
      expectedMutex: loadedBefore,
      requireDefinitelyDead: true,
    });
    return true;
  } catch {
    return false;
  }
};

const acquireMissionMutex = async ({ storeIdentity, paths }) => {
  const entries = await readdir(storeIdentity.path);
  if (entries.some((entry) => entry.startsWith(paths.mutexQuarantinePrefix))) return null;
  try {
    return await publishMissionMutex({ storeIdentity, paths });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  if (!await recoverDefinitelyDeadMissionMutex({ storeIdentity, paths })) return null;
  try {
    return await publishMissionMutex({ storeIdentity, paths });
  } catch (error) {
    if (error?.code === 'EEXIST') return null;
    throw error;
  }
};

const releaseMissionMutex = async ({ storeIdentity, paths, mutexIdentity }) => {
  await assertWelcomeAudioLiveClaimStoreRoot({
    store_root: storeIdentity.path,
    expected_identity: storeIdentity,
  });
  const loaded = await readMutexOwner({
    storeIdentity,
    filePath: paths.mutex,
    expectedNlink: 1,
  });
  if (
    !loaded
    || loaded.metadata.dev !== mutexIdentity.dev
    || loaded.metadata.ino !== mutexIdentity.ino
    || loaded.metadata.uid !== mutexIdentity.uid
    || loaded.metadata.mode !== mutexIdentity.mode
    || loaded.digest !== mutexIdentity.digest
    || loaded.owner.owner_pid !== mutexIdentity.owner_pid
    || loaded.owner.owner_nonce !== mutexIdentity.owner_nonce
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID);
  if (MUTEX_TEST_SCENARIO_BY_STORE_PATH.get(storeIdentity.path)
    === WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST.REPLACE_FIXED_MUTEX_BEFORE_RELEASE) {
    MUTEX_TEST_SCENARIO_BY_STORE_PATH.delete(storeIdentity.path);
    await replaceFixedMutexBeforeQuarantineForTest({ storeIdentity, paths });
  }
  await quarantineAndDeleteExactMutex({
    storeIdentity,
    paths,
    expectedMutex: loaded,
    requireDefinitelyDead: false,
  });
};

const readStableClaimRecord = async ({
  filePath,
  storeIdentity,
  expectedNlink = 1,
}) => {
  assertAbsoluteCleanPath(filePath);
  if (dirname(filePath) !== storeIdentity.path) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || !exactMode(before, 0o600)
      || before.nlink !== expectedNlink
      || before.dev !== storeIdentity.dev
      || before.size < 2
      || before.size > MAX_CLAIM_RECORD_BYTES
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(filePath);
    if (
      !sameMetadata(after, before)
      || !sameMetadata(pathAfter, before)
      || bytes.length !== after.size
    ) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    let snapshot;
    try {
      snapshot = JSON.parse(fatalUtf8Decoder.decode(bytes));
    } catch {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    return Object.freeze({
      snapshot,
      digest: sha256(bytes),
      metadata: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        uid: after.uid,
        mode: after.mode,
        nlink: after.nlink,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
      }),
    });
  } catch (error) {
    if (error?.code === 'ELOOP' || error?.code === 'ENOENT') {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const validateClaimRecord = ({ record, expectedMissionId = null }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_CLAIM_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_CLAIM_RECORD_SCHEMA_VERSION
    || record.claim_issuer_contract_version !== WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || !isOpaqueId(record.approval_packet_id)
    || !isOpaqueId(record.operation_id)
    || !/^[a-f0-9]{40}$/.test(record.central_repo_head)
    || !isSha256(record.canonical_operation_sha256)
    || !isSha256(record.approval_binding_sha256)
    || !isSha256(record.identity_anchor_sha256)
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || !isSha256(record.thread_anchor_sha256)
    || !isSha256(record.owner_anchor_sha256)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || !isSha256(record.audio_asset_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > 8
    || !Number.isInteger(record.mission_slot)
    || record.mission_slot < 1
    || record.mission_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !isExactIsoTimestamp(record.claimed_at)
    || !isExactIsoTimestamp(record.reservation_expires_at)
    || Date.parse(record.reservation_expires_at) - Date.parse(record.claimed_at)
      !== WELCOME_AUDIO_LIVE_RESERVATION_TTL_MS
    || record.claim_status !== 'pre_effect_reservation'
    || record.retry_disposition !== 'retry_only_after_explicit_zero_effect_cancel_or_dead_owner'
    || typeof record.claim_nonce !== 'string'
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
    || !Number.isInteger(record.owner_pid)
    || record.owner_pid < 1
    || !/^[a-f0-9]{64}$/.test(record.owner_nonce)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  return true;
};

const validateReservationCancellationRecord = ({ record }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_RESERVATION_CANCELLATION_RECORD_FIELDS)
    || record.record_schema_version
      !== WELCOME_AUDIO_LIVE_RESERVATION_CANCELLATION_RECORD_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || !isSha256(record.identity_anchor_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !Number.isInteger(record.mission_slot)
    || record.mission_slot < 1
    || record.mission_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
    || !Number.isInteger(record.owner_pid)
    || record.owner_pid < 1
    || !/^[a-f0-9]{64}$/.test(record.owner_nonce)
    || !isExactIsoTimestamp(record.cancelled_at)
    || ![
      'explicit_zero_effect_cancel',
      'dead_owner_reclaim',
      'pre_pending_revalidation_failed',
    ].includes(record.cancellation_reason)
    || record.attachment_upload_entered !== false
    || record.send_control_actuation_count !== 0
    || record.network_effect_entered !== false
    || record.retry_disposition !== 'eligible_for_fresh_reservation'
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID);
  return true;
};

const validateInspectionRecord = ({ record, expectedMissionId = null }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_INSPECTION_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_INSPECTION_RECORD_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || !isSha256(record.identity_anchor_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !isExactIsoTimestamp(record.inspection_claimed_at)
    || record.claim_status !== 'permanent_ordered_claim_before_source_read'
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  return true;
};

const validateInspectionResultRecord = ({ record, expectedMissionId = null }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_INSPECTION_RESULT_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_INSPECTION_RESULT_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || !isSha256(record.identity_anchor_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !/^[a-f0-9]{64}$/.test(record.inspection_claim_nonce)
    || !INSPECTION_CLASSIFICATIONS.has(record.classification)
    || !isExactIsoTimestamp(record.recorded_at)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  return true;
};

const validatePendingRecord = ({ record, expectedMissionId = null }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_PENDING_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || !isOpaqueId(record.approval_packet_id)
    || !isOpaqueId(record.operation_id)
    || !/^[a-f0-9]{40}$/.test(record.central_repo_head)
    || !isSha256(record.canonical_operation_sha256)
    || !isSha256(record.approval_binding_sha256)
    || !isSha256(record.identity_anchor_sha256)
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || !isSha256(record.thread_anchor_sha256)
    || !isSha256(record.owner_anchor_sha256)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || !isSha256(record.audio_asset_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !Number.isInteger(record.mission_slot)
    || record.mission_slot < 1
    || record.mission_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
    || !Number.isInteger(record.owner_pid)
    || record.owner_pid < 1
    || !/^[a-f0-9]{64}$/.test(record.owner_nonce)
    || !isExactIsoTimestamp(record.entered_at)
    || record.boundary_status !== 'pending_durable_before_attachment_upload'
    || record.attachment_upload_entered !== false
    || record.send_control_actuation_count !== 0
    || !/^[a-f0-9]{64}$/.test(record.attempt_nonce)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID);
  return true;
};

const attemptEvidenceIsCoherent = ({ uploadEntered, actuationCount }) => (
  (uploadEntered === false && actuationCount === 0)
  || (uploadEntered === true && [0, 1, null].includes(actuationCount))
  || (uploadEntered === null && actuationCount === null)
);

const validateTerminalRecord = ({ record, expectedMissionId = null }) => {
  const timestampsValid = isExactIsoTimestamp(record?.entered_at)
    && isExactIsoTimestamp(record?.attempted_at)
    && isExactIsoTimestamp(record?.finalized_at)
    && Date.parse(record.attempted_at) >= Date.parse(record.entered_at)
    && Date.parse(record.finalized_at) >= Date.parse(record.attempted_at);
  const confirmed = record?.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED;
  const unknown = record?.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN;
  const confirmedObservedAt = confirmed && isExactIsoTimestamp(record.confirmation_observed_at)
    ? Date.parse(record.confirmation_observed_at)
    : NaN;
  const confirmedWindowExpiresAt = confirmed
    && isExactIsoTimestamp(record.observation_window_expires_at)
    ? Date.parse(record.observation_window_expires_at)
    : NaN;
  const outcomeValid = (
    confirmed
    && record.attachment_upload_entered === true
    && record.send_control_actuation_count === 1
    && STRONG_CONFIRMATION_MARKERS.has(record.confirmation_marker)
    && record.new_outgoing_audio_bubble_delta === 1
    && Number.isFinite(confirmedObservedAt)
    && confirmedObservedAt >= Date.parse(record.attempted_at)
    && confirmedObservedAt - Date.parse(record.attempted_at)
      < WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    && Date.parse(record.finalized_at) >= confirmedObservedAt
    && Number.isFinite(confirmedWindowExpiresAt)
    && confirmedWindowExpiresAt - confirmedObservedAt
      === WELCOME_AUDIO_LIVE_OBSERVATION_WINDOW_MS
  ) || (
    unknown
    && attemptEvidenceIsCoherent({
      uploadEntered: record?.attachment_upload_entered,
      actuationCount: record?.send_control_actuation_count,
    })
    && record.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && record.confirmation_observed_at === null
    && record.new_outgoing_audio_bubble_delta === 0
    && record.observation_window_expires_at === null
  );
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_TERMINAL_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_TERMINAL_RECORD_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || !isOpaqueId(record.approval_packet_id)
    || !isOpaqueId(record.operation_id)
    || !/^[a-f0-9]{40}$/.test(record.central_repo_head)
    || !isSha256(record.canonical_operation_sha256)
    || !isSha256(record.approval_binding_sha256)
    || !isSha256(record.identity_anchor_sha256)
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || !isSha256(record.thread_anchor_sha256)
    || !isSha256(record.owner_anchor_sha256)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || !isSha256(record.audio_asset_sha256)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !Number.isInteger(record.mission_slot)
    || record.mission_slot < 1
    || record.mission_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
    || !Number.isInteger(record.owner_pid)
    || record.owner_pid < 1
    || !/^[a-f0-9]{64}$/.test(record.owner_nonce)
    || !/^[a-f0-9]{64}$/.test(record.attempt_nonce)
    || !timestampsValid
    || !outcomeValid
    || record.retry_disposition !== 'terminal_no_retry'
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN);
  return true;
};

const validateObservationRecord = ({ record, expectedMissionId = null }) => {
  if (
    !exactObjectKeys(record, WELCOME_AUDIO_LIVE_OBSERVATION_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_OBSERVATION_RECORD_SCHEMA_VERSION
    || record.claim_issuer_contract_version !== WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    || !isOpaqueId(record.mission_id)
    || (expectedMissionId !== null && record.mission_id !== expectedMissionId)
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || !isOpaqueId(record.operation_id)
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || !isSha256(record.identity_anchor_sha256)
    || !isSha256(record.thread_anchor_sha256)
    || !/^[a-f0-9]{64}$/.test(record.attempt_nonce)
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !Number.isInteger(record.mission_slot)
    || record.mission_slot < 1
    || record.mission_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !Number.isInteger(record.thread_observation_ordinal)
    || record.thread_observation_ordinal < 1
    || record.thread_observation_ordinal > WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP
    || !Number.isInteger(record.mission_observation_ordinal)
    || record.mission_observation_ordinal < 1
    || record.mission_observation_ordinal > WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP
    || !isSha256(record.confirmed_terminal_sha256)
    || !isExactIsoTimestamp(record.confirmed_terminal_finalized_at)
    || !isExactIsoTimestamp(record.window_expires_at)
    || !isExactIsoTimestamp(record.claimed_at)
    || Date.parse(record.claimed_at) < Date.parse(record.confirmed_terminal_finalized_at)
    || Date.parse(record.claimed_at) >= Date.parse(record.window_expires_at)
    || record.claim_status !== 'permanent_append_only_claim_before_reply_thread_read'
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
  return true;
};

const TERMINAL_PENDING_BINDING_FIELDS = Object.freeze([
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'approval_packet_id',
  'operation_id',
  'central_repo_head',
  'canonical_operation_sha256',
  'approval_binding_sha256',
  'identity_anchor_sha256',
  'identity_anchor_schema_version',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'manifest_sha256',
  'campaign_interval_sha256',
  'audio_asset_sha256',
  'manifest_ordinal',
  'mission_slot',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'attempt_nonce',
  'entered_at',
]);

const terminalMatchesPending = ({ terminal, pending }) => (
  TERMINAL_PENDING_BINDING_FIELDS.every(
    (field) => JSON.stringify(terminal[field]) === JSON.stringify(pending[field]),
  )
);

const terminalMatchesClaim = ({ terminal, claim }) => (
  [
    'mission_id',
    'contract_version',
    'mission_contract_sha256',
    'approval_packet_id',
    'operation_id',
    'central_repo_head',
    'canonical_operation_sha256',
    'approval_binding_sha256',
    'identity_anchor_sha256',
    'identity_anchor_schema_version',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'manifest_sha256',
    'campaign_interval_sha256',
    'audio_asset_sha256',
    'manifest_ordinal',
    'mission_slot',
    'claim_nonce',
    'owner_pid',
    'owner_nonce',
  ].every((field) => JSON.stringify(terminal[field]) === JSON.stringify(claim[field]))
);

const quarantineAndDeleteExactPendingAfterTerminal = async ({
  storeIdentity,
  paths,
  expectedPending,
  expectedTerminal,
  expectedMissionId,
  blocker,
}) => {
  const quarantinePath = join(
    storeIdentity.path,
    `${paths.pendingTemporaryPrefix}cleanup-${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  try {
    await rename(paths.pending, quarantinePath);
    await syncStoreDirectory(storeIdentity);
    const entries = await readdir(storeIdentity.path);
    if (
      entries.includes(basename(paths.pending))
      || entries.some((entry) => (
        entry.startsWith(paths.pendingTemporaryPrefix)
        && entry !== basename(quarantinePath)
      ))
      || entries.some((entry) => entry.startsWith(paths.terminalTemporaryPrefix))
    ) throw new Error(blocker);
    const [quarantined, currentTerminal] = await Promise.all([
      readStableClaimRecord({ filePath: quarantinePath, storeIdentity }),
      readStableClaimRecord({ filePath: paths.terminal, storeIdentity }),
    ]);
    validatePendingRecord({
      record: quarantined.snapshot,
      expectedMissionId,
    });
    validateTerminalRecord({
      record: currentTerminal.snapshot,
      expectedMissionId,
    });
    if (
      quarantined.digest !== expectedPending.digest
      || !sameMetadataAcrossRename(quarantined.metadata, expectedPending.metadata)
      || canonicalSha256(quarantined.snapshot) !== canonicalSha256(expectedPending.snapshot)
      || currentTerminal.digest !== expectedTerminal.digest
      || !sameMetadata(currentTerminal.metadata, expectedTerminal.metadata)
      || canonicalSha256(currentTerminal.snapshot) !== canonicalSha256(expectedTerminal.snapshot)
      || !terminalMatchesPending({
        terminal: currentTerminal.snapshot,
        pending: quarantined.snapshot,
      })
    ) throw new Error(blocker);
    await unlink(quarantinePath);
    await syncStoreDirectory(storeIdentity);
    return true;
  } catch {
    throw new Error(blocker);
  }
};

const replacePendingAfterTerminalPublishForTest = async ({
  storeIdentity,
  paths,
  pending,
}) => {
  const displacedPath = join(
    storeIdentity.path,
    `${paths.pendingTemporaryPrefix}displaced-${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  await rename(paths.pending, displacedPath);
  await syncStoreDirectory(storeIdentity);
  const replacement = Object.freeze({
    ...pending,
    owner_nonce: pending.owner_nonce === 'f'.repeat(64) ? 'e'.repeat(64) : 'f'.repeat(64),
  });
  validatePendingRecord({ record: replacement, expectedMissionId: pending.mission_id });
  await writeExclusiveDurable({
    filePath: paths.pending,
    value: replacement,
    storeIdentity,
    temporaryPrefix: paths.pendingTemporaryPrefix,
  });
  return true;
};

const reconcileTerminalPendingCleanupOnly = async ({
  storeIdentity,
  paths,
  missionId,
}) => {
  const entries = await readdir(storeIdentity.path);
  if (entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix)
    || entry.startsWith(paths.terminalTemporaryPrefix))) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  const terminalPresent = entries.includes(basename(paths.terminal));
  const pendingPresent = entries.includes(basename(paths.pending));
  if (!terminalPresent) return null;
  const terminalLoaded = await readStableClaimRecord({
    filePath: paths.terminal,
    storeIdentity,
  });
  validateTerminalRecord({ record: terminalLoaded.snapshot, expectedMissionId: missionId });
  if (pendingPresent) {
    const pendingLoaded = await readStableClaimRecord({
      filePath: paths.pending,
      storeIdentity,
    });
    validatePendingRecord({ record: pendingLoaded.snapshot, expectedMissionId: missionId });
    if (
      !terminalMatchesPending({
        terminal: terminalLoaded.snapshot,
        pending: pendingLoaded.snapshot,
      })
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    await quarantineAndDeleteExactPendingAfterTerminal({
      storeIdentity,
      paths,
      expectedPending: pendingLoaded,
      expectedTerminal: terminalLoaded,
      expectedMissionId: missionId,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
    });
  }
  return terminalLoaded;
};

const inspectSequentialMissionSlots = async ({ storeIdentity, missionId, claims }) => {
  const entries = await readdir(storeIdentity.path);
  if (entries.some((entry) => entry.startsWith('.pending-')
    || entry.startsWith('.terminal-'))) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  const ordered = [...claims].sort(
    (left, right) => left.snapshot.mission_slot - right.snapshot.mission_slot,
  );
  for (let index = 0; index < ordered.length; index += 1) {
    const claim = ordered[index].snapshot;
    if (claim.mission_slot !== index + 1) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const paths = buildStorePaths({
      storeIdentity,
      missionId,
      identityAnchorSha256: claim.identity_anchor_sha256,
    });
    const terminalLoaded = await reconcileTerminalPendingCleanupOnly({
      storeIdentity,
      paths,
      missionId,
    });
    if (
      !terminalLoaded
      || !terminalMatchesClaim({ terminal: terminalLoaded.snapshot, claim })
      || terminalLoaded.snapshot.outcome !== WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED
    ) return Object.freeze({ allowed: false, next_slot: null });
  }
  return Object.freeze({ allowed: true, next_slot: ordered.length + 1 });
};

const discoverIrreversibleAttemptEvidence = async ({
  storeIdentity,
  paths,
  missionId,
}) => {
  let entries;
  try {
    entries = await readdir(storeIdentity.path);
  } catch {
    return Object.freeze({
      pendingPresent: false,
      terminalPresent: false,
      temporaryPresent: false,
      evidenceUnknown: true,
      anyBoundaryEvidence: true,
    });
  }
  const pendingPresent = entries.includes(basename(paths.pending));
  const terminalPresent = entries.includes(basename(paths.terminal));
  const temporaryPresent = entries.some(
    (entry) => entry.startsWith(paths.pendingTemporaryPrefix)
      || entry.startsWith(paths.terminalTemporaryPrefix),
  );
  let evidenceUnknown = pendingPresent && terminalPresent;
  if (pendingPresent) {
    try {
      const loaded = await readStableClaimRecord({ filePath: paths.pending, storeIdentity });
      validatePendingRecord({ record: loaded.snapshot, expectedMissionId: missionId });
    } catch {
      evidenceUnknown = true;
    }
  }
  if (terminalPresent) {
    try {
      const loaded = await readStableClaimRecord({ filePath: paths.terminal, storeIdentity });
      validateTerminalRecord({ record: loaded.snapshot, expectedMissionId: missionId });
    } catch {
      evidenceUnknown = true;
    }
  }
  return Object.freeze({
    pendingPresent,
    terminalPresent,
    temporaryPresent,
    evidenceUnknown,
    anyBoundaryEvidence: pendingPresent
      || terminalPresent
      || temporaryPresent
      || evidenceUnknown,
  });
};

const recordFilenameIdentityMatches = ({ name, prefix, suffix = '.json' }) =>
  name.startsWith(prefix) && name.endsWith(suffix);

const inspectMissionState = async ({ storeIdentity, missionId }) => {
  const mission = missionFingerprint(missionId);
  const entries = await readdir(storeIdentity.path);
  const temporaryPrefixes = [
    `.inspection-${mission}-`,
    `.inspection-result-${mission}-`,
  ];
  if (entries.some((entry) => temporaryPrefixes.some((prefix) => entry.startsWith(prefix)))) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }

  const inspections = [];
  const inspectionResults = [];
  for (const name of entries) {
    let validator = null;
    let target = null;
    if (recordFilenameIdentityMatches({ name, prefix: `inspection-${mission}-` })) {
      validator = validateInspectionRecord;
      target = inspections;
    } else if (recordFilenameIdentityMatches({ name, prefix: `inspection-result-${mission}-` })) {
      validator = validateInspectionResultRecord;
      target = inspectionResults;
    }
    if (!validator) continue;
    const loaded = await readStableClaimRecord({
      filePath: join(storeIdentity.path, name),
      storeIdentity,
    });
    validator({ record: loaded.snapshot, expectedMissionId: missionId });
    target.push(loaded);
  }

  inspections.sort((a, b) => a.snapshot.manifest_ordinal - b.snapshot.manifest_ordinal);
  inspectionResults.sort((a, b) => a.snapshot.manifest_ordinal - b.snapshot.manifest_ordinal);
  const baselineInspection = inspections[0]?.snapshot ?? null;
  for (let index = 0; index < inspections.length; index += 1) {
    const inspection = inspections[index].snapshot;
    if (
      inspection.manifest_ordinal !== index + 1
      || (baselineInspection && (
        inspection.contract_version !== baselineInspection.contract_version
        || inspection.manifest_sha256 !== baselineInspection.manifest_sha256
        || inspection.campaign_interval_sha256 !== baselineInspection.campaign_interval_sha256
      ))
    ) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_ORDER_INVALID);
    }
    const expectedName = basename(buildStorePaths({
      storeIdentity,
      missionId,
      identityAnchorSha256: inspection.identity_anchor_sha256,
    }).inspection(inspection.manifest_ordinal));
    if (!entries.includes(expectedName)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
  }
  if (inspections.length > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || inspectionResults.length > inspections.length) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  const resultByOrdinal = new Map();
  for (const loaded of inspectionResults) {
    const result = loaded.snapshot;
    const inspection = inspections[result.manifest_ordinal - 1]?.snapshot;
    if (
      !inspection
      || resultByOrdinal.has(result.manifest_ordinal)
      || result.contract_version !== inspection.contract_version
      || result.manifest_sha256 !== inspection.manifest_sha256
      || result.campaign_interval_sha256 !== inspection.campaign_interval_sha256
      || result.identity_anchor_sha256 !== inspection.identity_anchor_sha256
      || result.inspection_claim_nonce !== inspection.claim_nonce
      || Date.parse(result.recorded_at) < Date.parse(inspection.inspection_claimed_at)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    const expectedName = basename(buildStorePaths({
      storeIdentity,
      missionId,
      identityAnchorSha256: result.identity_anchor_sha256,
    }).inspectionResult(result.manifest_ordinal));
    if (!entries.includes(expectedName)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    resultByOrdinal.set(result.manifest_ordinal, loaded);
  }
  return Object.freeze({
    inspections: Object.freeze(inspections),
    inspectionResults: Object.freeze(inspectionResults),
    resultByOrdinal,
  });
};

const inspectMissionClaims = async ({ storeIdentity, paths, missionId }) => {
  if (!await reconcileSingleGlobalReservationCancellationTemporary({ storeIdentity })) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  const entries = await readdir(storeIdentity.path);
  if (entries.some((entry) => entry.startsWith(paths.temporaryPrefix)
    || entry.startsWith('.reservation-cancel-'))) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  const cancellationNames = entries.filter((entry) => entry.startsWith('reservation-cancel-'));
  const cancellationByClaimNonce = new Map();
  for (const name of cancellationNames) {
    if (!/^reservation-cancel-[a-f0-9]{64}-[a-f0-9]{64}\.json$/.test(name)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const loaded = await readStableClaimRecord({
      filePath: join(storeIdentity.path, name),
      storeIdentity,
    });
    validateReservationCancellationRecord({ record: loaded.snapshot });
    const expectedIdentity = identityFingerprint(loaded.snapshot.identity_anchor_sha256);
    if (
      name !== `reservation-cancel-${expectedIdentity}-${loaded.snapshot.claim_nonce}.json`
      || cancellationByClaimNonce.has(loaded.snapshot.claim_nonce)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    cancellationByClaimNonce.set(loaded.snapshot.claim_nonce, loaded);
  }
  const names = entries.filter((entry) => entry.startsWith(paths.claimPrefix));
  const seenIdentitiesGlobal = new Set();
  const allRecords = [];
  for (const name of names) {
    if (!/^claim-[a-f0-9]{64}\.json$/.test(name)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const loaded = await readStableClaimRecord({
      filePath: join(storeIdentity.path, name),
      storeIdentity,
    });
    validateClaimRecord({ record: loaded.snapshot });
    const expectedName = basename(buildStorePaths({
      storeIdentity,
      missionId: loaded.snapshot.mission_id,
      identityAnchorSha256: loaded.snapshot.identity_anchor_sha256,
    }).claim);
    if (name !== expectedName || seenIdentitiesGlobal.has(loaded.snapshot.identity_anchor_sha256)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    seenIdentitiesGlobal.add(loaded.snapshot.identity_anchor_sha256);
    allRecords.push(loaded);
  }
  const records = allRecords.filter(({ snapshot }) => snapshot.mission_id === missionId);
  if (records.length > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  return Object.freeze({
    records: Object.freeze(records),
    allRecords: Object.freeze(allRecords),
    seenIdentitiesGlobal,
    cancellationByClaimNonce,
  });
};

const assertNoOrphanDurableAttemptBoundaries = async ({ storeIdentity, claims }) => {
  const entries = await readdir(storeIdentity.path);
  const boundaryNames = entries.filter((entry) => (
    entry.startsWith('pending-') || entry.startsWith('terminal-')
  ));
  const expected = new Map();
  for (const loaded of claims) {
    const claim = loaded.snapshot;
    const claimPaths = buildStorePaths({
      storeIdentity,
      missionId: claim.mission_id,
      identityAnchorSha256: claim.identity_anchor_sha256,
    });
    expected.set(basename(claimPaths.pending), { kind: 'pending', claim, path: claimPaths.pending });
    expected.set(basename(claimPaths.terminal), {
      kind: 'terminal',
      claim,
      path: claimPaths.terminal,
    });
  }
  const loadedByClaim = new Map();
  for (const name of boundaryNames) {
    if (!/^(?:pending|terminal)-[a-f0-9]{64}\.json$/u.test(name) || !expected.has(name)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const binding = expected.get(name);
    const loaded = await readStableClaimRecord({
      filePath: binding.path,
      storeIdentity,
    });
    if (binding.kind === 'pending') {
      validatePendingRecord({ record: loaded.snapshot, expectedMissionId: binding.claim.mission_id });
    } else {
      validateTerminalRecord({ record: loaded.snapshot, expectedMissionId: binding.claim.mission_id });
    }
    if (!terminalMatchesClaim({ terminal: loaded.snapshot, claim: binding.claim })) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const prior = loadedByClaim.get(binding.claim.claim_nonce) ?? {};
    prior[binding.kind] = loaded.snapshot;
    loadedByClaim.set(binding.claim.claim_nonce, prior);
  }
  for (const pair of loadedByClaim.values()) {
    if (pair.pending && pair.terminal && !terminalMatchesPending({
      terminal: pair.terminal,
      pending: pair.pending,
    })) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
  }
  return true;
};

const writeExclusiveDurable = async ({
  filePath,
  value,
  storeIdentity,
  temporaryPrefix,
}) => {
  const temporaryPath = join(
    storeIdentity.path,
    `${temporaryPrefix}${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  const publicationBytes = stableJsonBytes(value);
  const publicationDigest = sha256(publicationBytes);
  let handle;
  let publicationLinked = false;
  let temporaryRemoved = false;
  try {
    await assertWelcomeAudioLiveClaimStoreRoot({
      store_root: storeIdentity.path,
      expected_identity: storeIdentity,
    });
    handle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(publicationBytes);
    await handle.sync();
    const temporaryBefore = await handle.stat();
    await handle.close();
    handle = null;
    await link(temporaryPath, filePath);
    publicationLinked = true;
    const [temporaryLinked, finalLinked] = await Promise.all([
      lstat(temporaryPath),
      lstat(filePath),
    ]);
    if (
      temporaryLinked.dev !== temporaryBefore.dev
      || temporaryLinked.ino !== temporaryBefore.ino
      || finalLinked.dev !== temporaryBefore.dev
      || finalLinked.ino !== temporaryBefore.ino
      || temporaryLinked.nlink !== 2
      || finalLinked.nlink !== 2
      || temporaryLinked.size !== publicationBytes.length
      || finalLinked.size !== publicationBytes.length
      || !exactMode(finalLinked, 0o600)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN);
    await unlink(temporaryPath);
    temporaryRemoved = true;
    await syncStoreDirectory(storeIdentity);
    const metadata = await lstat(filePath);
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.nlink !== 1
      || !exactMode(metadata, 0o600)
      || metadata.dev !== storeIdentity.dev
      || metadata.uid !== storeIdentity.uid
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN);
    const published = await readStableClaimRecord({ filePath, storeIdentity });
    if (published.digest !== publicationDigest) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN);
    }
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN);
    }
    throw error;
  } finally {
    await handle?.close();
    if (!publicationLinked && !temporaryRemoved) {
      try {
        await unlink(temporaryPath);
      } catch {
        // No published hard link exists; a missing temporary is already clean.
      }
    }
  }
};

const reconcileLinkedPublicationTemporary = async ({
  storeIdentity,
  finalPath,
  temporaryPath,
  temporaryPrefix,
  validator,
  expectedMissionId = null,
}) => {
  const quarantinePath = join(
    storeIdentity.path,
    `${temporaryPrefix}reconcile-${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  try {
    const [temporary, final] = await Promise.all([
      readStableClaimRecord({
        filePath: temporaryPath,
        storeIdentity,
        expectedNlink: 2,
      }),
      readStableClaimRecord({
        filePath: finalPath,
        storeIdentity,
        expectedNlink: 2,
      }),
    ]);
    validator({ record: temporary.snapshot, expectedMissionId });
    validator({ record: final.snapshot, expectedMissionId });
    if (
      temporary.digest !== final.digest
      || temporary.metadata.dev !== final.metadata.dev
      || temporary.metadata.ino !== final.metadata.ino
      || temporary.metadata.nlink !== 2
      || final.metadata.nlink !== 2
    ) return false;
    await rename(temporaryPath, quarantinePath);
    await syncStoreDirectory(storeIdentity);
    const entries = await readdir(storeIdentity.path);
    if (
      entries.includes(basename(temporaryPath))
      || entries.some((entry) => (
        entry.startsWith(temporaryPrefix)
        && entry !== basename(quarantinePath)
      ))
    ) return false;
    const [quarantined, currentFinal] = await Promise.all([
      readStableClaimRecord({
        filePath: quarantinePath,
        storeIdentity,
        expectedNlink: 2,
      }),
      readStableClaimRecord({
        filePath: finalPath,
        storeIdentity,
        expectedNlink: 2,
      }),
    ]);
    validator({ record: quarantined.snapshot, expectedMissionId });
    validator({ record: currentFinal.snapshot, expectedMissionId });
    if (
      quarantined.digest !== temporary.digest
      || currentFinal.digest !== final.digest
      || !sameMetadataAcrossRename(quarantined.metadata, temporary.metadata)
      || !sameMetadataAcrossRename(currentFinal.metadata, final.metadata)
      || canonicalSha256(quarantined.snapshot) !== canonicalSha256(temporary.snapshot)
      || canonicalSha256(currentFinal.snapshot) !== canonicalSha256(final.snapshot)
      || quarantined.metadata.dev !== currentFinal.metadata.dev
      || quarantined.metadata.ino !== currentFinal.metadata.ino
    ) return false;
    await unlink(quarantinePath);
    await syncStoreDirectory(storeIdentity);
    const reconciled = await readStableClaimRecord({ filePath: finalPath, storeIdentity });
    validator({ record: reconciled.snapshot, expectedMissionId });
    return reconciled.digest === final.digest
      && reconciled.metadata.dev === final.metadata.dev
      && reconciled.metadata.ino === final.metadata.ino
      && reconciled.metadata.uid === final.metadata.uid
      && reconciled.metadata.mode === final.metadata.mode
      && reconciled.metadata.nlink === 1
      && reconciled.metadata.size === final.metadata.size
      && reconciled.metadata.mtimeMs === final.metadata.mtimeMs
      && canonicalSha256(reconciled.snapshot) === canonicalSha256(final.snapshot);
  } catch {
    return false;
  }
};

const reconcileSingleLinkedTemporaryByPrefix = async ({
  storeIdentity,
  finalPath,
  temporaryPrefix,
  validator,
  expectedMissionId = null,
}) => {
  const entries = await readdir(storeIdentity.path);
  const temporaryNames = entries.filter((entry) => entry.startsWith(temporaryPrefix));
  if (temporaryNames.length !== 1 || !entries.includes(basename(finalPath))) return false;
  return reconcileLinkedPublicationTemporary({
    storeIdentity,
    finalPath,
    temporaryPath: join(storeIdentity.path, temporaryNames[0]),
    temporaryPrefix,
    validator,
    expectedMissionId,
  });
};

const reconcileSingleGlobalClaimTemporary = async ({ storeIdentity }) => {
  const entries = await readdir(storeIdentity.path);
  const temporaryNames = entries.filter((entry) => entry.startsWith('.claim-'));
  if (temporaryNames.length !== 1) return false;
  const temporaryPath = join(storeIdentity.path, temporaryNames[0]);
  let temporary;
  try {
    temporary = await readStableClaimRecord({
      filePath: temporaryPath,
      storeIdentity,
      expectedNlink: 2,
    });
    validateClaimRecord({ record: temporary.snapshot });
  } catch {
    return false;
  }
  const claimPaths = buildStorePaths({
    storeIdentity,
    missionId: temporary.snapshot.mission_id,
    identityAnchorSha256: temporary.snapshot.identity_anchor_sha256,
  });
  if (!entries.includes(basename(claimPaths.claim))) return false;
  return reconcileLinkedPublicationTemporary({
    storeIdentity,
    finalPath: claimPaths.claim,
    temporaryPath,
    temporaryPrefix: claimPaths.temporaryPrefix,
    validator: validateClaimRecord,
    expectedMissionId: temporary.snapshot.mission_id,
  });
};

const reconcileSingleGlobalReservationCancellationTemporary = async ({ storeIdentity }) => {
  const entries = await readdir(storeIdentity.path);
  const temporaryNames = entries.filter((entry) => entry.startsWith('.reservation-cancel-'));
  if (temporaryNames.length === 0) return true;
  if (temporaryNames.length !== 1) return false;
  const temporaryPath = join(storeIdentity.path, temporaryNames[0]);
  let temporary;
  try {
    temporary = await readStableClaimRecord({
      filePath: temporaryPath,
      storeIdentity,
      expectedNlink: 2,
    });
    validateReservationCancellationRecord({ record: temporary.snapshot });
  } catch {
    return false;
  }
  const identity = identityFingerprint(temporary.snapshot.identity_anchor_sha256);
  const finalPath = join(
    storeIdentity.path,
    `reservation-cancel-${identity}-${temporary.snapshot.claim_nonce}.json`,
  );
  if (!entries.includes(basename(finalPath))) return false;
  return reconcileLinkedPublicationTemporary({
    storeIdentity,
    finalPath,
    temporaryPath,
    temporaryPrefix: `.reservation-cancel-${identity}-`,
    validator: validateReservationCancellationRecord,
  });
};

const effectiveNowForStore = ({ storeMode, nowMs }) => (
  storeMode === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    ? Date.now()
    : nowMs
);

const requiredAuthorityModeForStore = (storeMode) => (
  storeMode === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    ? WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    : WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY
);

const reservationCancellationMatchesClaim = ({ cancellation, claim }) =>
  cancellation.mission_id === claim.mission_id
    && cancellation.contract_version === claim.contract_version
    && cancellation.mission_contract_sha256 === claim.mission_contract_sha256
    && cancellation.identity_anchor_schema_version === claim.identity_anchor_schema_version
    && cancellation.identity_anchor_sha256 === claim.identity_anchor_sha256
    && cancellation.manifest_ordinal === claim.manifest_ordinal
    && cancellation.mission_slot === claim.mission_slot
    && cancellation.claim_nonce === claim.claim_nonce
    && cancellation.owner_pid === claim.owner_pid
    && cancellation.owner_nonce === claim.owner_nonce
    && cancellation.attachment_upload_entered === false
    && cancellation.send_control_actuation_count === 0
    && cancellation.network_effect_entered === false;

const quarantineAndDeleteExactClaimAfterCancellation = async ({
  storeIdentity,
  paths,
  expectedClaim,
  expectedCancellation,
  blocker,
}) => {
  const quarantinePath = join(
    storeIdentity.path,
    `${paths.temporaryPrefix}cleanup-${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  try {
    await rename(paths.claim, quarantinePath);
    await syncStoreDirectory(storeIdentity);
    const entries = await readdir(storeIdentity.path);
    if (
      entries.includes(basename(paths.claim))
      || entries.includes(basename(paths.pending))
      || entries.includes(basename(paths.terminal))
      || entries.some((entry) => (
        entry.startsWith(paths.temporaryPrefix)
        && entry !== basename(quarantinePath)
      ))
      || entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix))
      || entries.some((entry) => entry.startsWith(paths.terminalTemporaryPrefix))
    ) throw new Error(blocker);
    const [quarantinedClaim, currentCancellation] = await Promise.all([
      readStableClaimRecord({ filePath: quarantinePath, storeIdentity }),
      readStableClaimRecord({
        filePath: paths.reservationCancellation(expectedClaim.snapshot.claim_nonce),
        storeIdentity,
      }),
    ]);
    validateClaimRecord({
      record: quarantinedClaim.snapshot,
      expectedMissionId: expectedClaim.snapshot.mission_id,
    });
    validateReservationCancellationRecord({ record: currentCancellation.snapshot });
    if (
      quarantinedClaim.digest !== expectedClaim.digest
      || !sameMetadataAcrossRename(quarantinedClaim.metadata, expectedClaim.metadata)
      || canonicalSha256(quarantinedClaim.snapshot) !== canonicalSha256(expectedClaim.snapshot)
      || currentCancellation.digest !== expectedCancellation.digest
      || !sameMetadata(currentCancellation.metadata, expectedCancellation.metadata)
      || canonicalSha256(currentCancellation.snapshot)
        !== canonicalSha256(expectedCancellation.snapshot)
      || !reservationCancellationMatchesClaim({
        cancellation: currentCancellation.snapshot,
        claim: quarantinedClaim.snapshot,
      })
    ) throw new Error(blocker);
    await unlink(quarantinePath);
    await syncStoreDirectory(storeIdentity);
    return true;
  } catch {
    throw new Error(blocker);
  }
};

const replaceClaimBeforeCancellationCleanupForTest = async ({
  storeIdentity,
  paths,
  claim,
}) => {
  const displacedPath = join(
    storeIdentity.path,
    `${paths.temporaryPrefix}displaced-${process.pid}-${randomBytes(16).toString('hex')}.json`,
  );
  await rename(paths.claim, displacedPath);
  await syncStoreDirectory(storeIdentity);
  const replacement = Object.freeze({
    ...claim,
    owner_nonce: claim.owner_nonce === 'f'.repeat(64) ? 'e'.repeat(64) : 'f'.repeat(64),
  });
  validateClaimRecord({ record: replacement, expectedMissionId: claim.mission_id });
  await writeExclusiveDurable({
    filePath: paths.claim,
    value: replacement,
    storeIdentity,
    temporaryPrefix: paths.temporaryPrefix,
  });
};

const publishReservationCancellation = async ({
  storeIdentity,
  paths,
  claimLoaded,
  cancelledAtMs,
  reason,
}) => {
  const claim = claimLoaded.snapshot;
  const cancellation = Object.freeze({
    record_schema_version: WELCOME_AUDIO_LIVE_RESERVATION_CANCELLATION_RECORD_SCHEMA_VERSION,
    mission_id: claim.mission_id,
    contract_version: claim.contract_version,
    mission_contract_sha256: claim.mission_contract_sha256,
    identity_anchor_schema_version: claim.identity_anchor_schema_version,
    identity_anchor_sha256: claim.identity_anchor_sha256,
    manifest_ordinal: claim.manifest_ordinal,
    mission_slot: claim.mission_slot,
    claim_nonce: claim.claim_nonce,
    owner_pid: claim.owner_pid,
    owner_nonce: claim.owner_nonce,
    cancelled_at: new Date(cancelledAtMs).toISOString(),
    cancellation_reason: reason,
    attachment_upload_entered: false,
    send_control_actuation_count: 0,
    network_effect_entered: false,
    retry_disposition: 'eligible_for_fresh_reservation',
  });
  validateReservationCancellationRecord({ record: cancellation });
  const cancellationPath = paths.reservationCancellation(claim.claim_nonce);
  try {
    await writeExclusiveDurable({
      filePath: cancellationPath,
      value: cancellation,
      storeIdentity,
      temporaryPrefix: paths.reservationCancellationTemporaryPrefix,
    });
  } catch (error) {
    if (error?.message !== WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN) {
      throw error;
    }
    if (!await reconcileSingleGlobalReservationCancellationTemporary({ storeIdentity })) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID);
    }
    const existing = await readStableClaimRecord({ filePath: cancellationPath, storeIdentity });
    validateReservationCancellationRecord({ record: existing.snapshot });
    if (!reservationCancellationMatchesClaim({ cancellation: existing.snapshot, claim })
      || existing.snapshot.cancellation_reason !== reason) throw error;
  }
  const published = await readStableClaimRecord({ filePath: cancellationPath, storeIdentity });
  validateReservationCancellationRecord({ record: published.snapshot });
  if (!reservationCancellationMatchesClaim({ cancellation: published.snapshot, claim })) {
    throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID);
  }
  const cleanupScenario = CANCELLATION_CLEANUP_TEST_SCENARIO_BY_CLAIM_NONCE.get(
    claim.claim_nonce,
  );
  CANCELLATION_CLEANUP_TEST_SCENARIO_BY_CLAIM_NONCE.delete(claim.claim_nonce);
  if (cleanupScenario
    === WELCOME_AUDIO_LIVE_CANCELLATION_CLEANUP_SCENARIO_FOR_TEST
      .REPLACE_CLAIM_AFTER_CANCELLATION_PUBLISH) {
    await replaceClaimBeforeCancellationCleanupForTest({ storeIdentity, paths, claim });
  }
  await quarantineAndDeleteExactClaimAfterCancellation({
    storeIdentity,
    paths,
    expectedClaim: claimLoaded,
    expectedCancellation: published,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
  });
};

const buildReceipt = ({
  decision,
  missionClaimCount = null,
  blockerCodes = [],
}) => {
  const created = decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED;
  const cancelled = decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.CANCELLED;
  const duplicate = decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.DUPLICATE;
  const permanent = duplicate
    || decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL;
  const blocker = blockerCodes.length === 1 ? blockerCodes[0] : null;
  const durableClaimOrTerminalState = decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL
    ? 'unknown'
    : created
      || duplicate
      || decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.CAP_REACHED
      || blocker === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_ACTIVE
      || blocker === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_SLOT_BLOCKED
      || (Number.isInteger(missionClaimCount) && missionClaimCount > 0)
      ? 'present'
      : cancelled
        || missionClaimCount === 0
        ? 'absent'
        : 'unknown';
  const retryDisposition = permanent
    ? 'forbidden_after_claim_or_unknown'
    : created
      ? 'retry_only_after_explicit_zero_effect_cancel_or_dead_owner'
      : cancelled
        ? 'fresh_reservation_allowed'
        : decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.CAP_REACHED
          ? 'blocked_mission_cap_no_new_claim'
          : blocker === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_ACTIVE
            ? 'retry_only_after_existing_reservation_zero_effect_cancel_or_dead_owner'
            : blocker === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_SLOT_BLOCKED
              ? 'blocked_until_prior_slot_has_durable_confirmed_terminal'
              : durableClaimOrTerminalState === 'present'
                ? 'before_effect_no_current_claim_durable_ledger_present'
                : durableClaimOrTerminalState === 'absent'
                  ? 'before_effect_no_claim'
                  : 'before_effect_claim_state_not_proven';
  return Object.freeze({
    receipt_schema_version: WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_SCHEMA_VERSION,
    claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
    redaction_status: 'allowlist_only_no_paths_identities_digests_or_private_values',
    execution_mode: WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE,
    decision,
    claim_created_by_current_invocation: created,
    permanent_no_retry_claim_present: permanent,
    mission_claim_count: missionClaimCount,
    mission_claim_cap: WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP,
    dedupe_clear_before_claim: created,
    manifest_membership_bound: created,
    campaign_interval_bound: created,
    audio_asset_bound: created,
    private_claim_capability_issued: created,
    send_allowed: false,
    external_effect_invoked: false,
    browser_used: false,
    network_used: false,
    retry_disposition: retryDisposition,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const blockedResult = ({ decision, blocker, missionClaimCount = null }) => ({
  private_claim_capability: null,
  redacted_receipt: buildReceipt({
    decision,
    missionClaimCount,
    blockerCodes: [blocker],
  }),
});

const buildStateReceipt = ({
  decision,
  inspectionCursorCount = 0,
  privateCapabilityIssued = false,
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_LIVE_STATE_RECEIPT_SCHEMA_VERSION,
  claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_paths_identities_digests_threads_or_private_values',
  execution_mode: WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE,
  decision,
  inspection_cursor_count: inspectionCursorCount,
  inspection_cap: WELCOME_AUDIO_LIVE_INSPECTION_CAP,
  manifest_order_enforced: decision !== WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
  private_capability_issued: privateCapabilityIssued,
  source_read_allowed: false,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const blockedStateResult = ({
  decision = WELCOME_AUDIO_LIVE_STATE_DECISION.BLOCKED,
  blocker,
  inspectionCursorCount = 0,
}) => ({
  private_capability: null,
  redacted_receipt: buildStateReceipt({
    decision,
    inspectionCursorCount,
    blockerCodes: [blocker],
  }),
});

const buildAttemptReceipt = ({
  decision,
  uploadEntered = false,
  actuationCount = 0,
  pendingPresent = undefined,
  terminalPresent = undefined,
  claimConsumed = undefined,
  zeroEffectReservationCancelled = false,
  blockerCodes = [],
}) => {
  const armed = decision === WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.ARMED;
  const finalized = [
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED,
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
  ].includes(decision);
  return Object.freeze({
    receipt_schema_version: WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_SCHEMA_VERSION,
    claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
    redaction_status: 'allowlist_only_no_paths_identities_digests_or_private_values',
    execution_mode: WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE,
    decision,
    pending_record_present: pendingPresent ?? armed,
    terminal_record_present: terminalPresent ?? finalized,
    attachment_upload_entered: uploadEntered,
    send_control_actuation_count: actuationCount,
    private_actuation_capability_issued: armed,
    claim_capability_consumed: claimConsumed ?? (armed || finalized),
    zero_effect_reservation_cancelled: zeroEffectReservationCancelled,
    send_allowed: false,
    external_effect_invoked: false,
    browser_used: false,
    network_used: false,
    retry_disposition: zeroEffectReservationCancelled
      ? 'fresh_reservation_allowed_after_proven_zero_effect_cancel'
      : armed || finalized
      || decision === WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL
      ? 'terminal_no_retry'
      : 'before_attempt_no_boundary',
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const blockedAttemptResult = ({
  decision = WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
  blocker,
  pendingPresent = false,
  terminalPresent = false,
  claimConsumed = false,
  zeroEffectReservationCancelled = false,
  privateTerminalCapability = null,
}) => ({
  private_actuation_capability: null,
  private_host_pending_capability: null,
  private_terminal_capability: privateTerminalCapability,
  redacted_receipt: buildAttemptReceipt({
    decision,
    pendingPresent,
    terminalPresent,
    claimConsumed,
    zeroEffectReservationCancelled,
    blockerCodes: [blocker],
  }),
});

const createOneUseCapability = (stateMap, state, marker) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: { value: Symbol(marker), enumerable: true },
    toJSON: {
      value: () => { throw new TypeError('private_live_state_capability_not_serializable'); },
    },
  });
  Object.freeze(capability);
  stateMap.set(capability, { ...state, consumed: false });
  return capability;
};

const createClaimCapability = (state) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: {
      value: Symbol('crm_core_welcome_audio_private_live_claim_capability'),
      enumerable: true,
    },
    toJSON: {
      value: () => { throw new TypeError('private_live_claim_capability_not_serializable'); },
    },
  });
  Object.freeze(capability);
  CLAIM_CAPABILITY_STATE.set(capability, { ...state, consumed: false });
  return capability;
};

const claimNextWelcomeAudioLiveManifestInspection = async ({
  private_store_capability,
  mission_id,
  contract_version,
  identity_anchor_sha256,
  manifest_ordinal,
  expected_manifest_sha256,
  expected_campaign_interval_sha256,
  private_manifest_capability,
  now_ms,
}) => {
  if (
    !isOpaqueId(mission_id)
    || !isOpaqueId(contract_version)
    || !isSha256(identity_anchor_sha256)
    || !Number.isInteger(manifest_ordinal)
    || manifest_ordinal < 1
    || manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || !isSha256(expected_manifest_sha256)
    || !isSha256(expected_campaign_interval_sha256)
    || verifySealedWelcomeAudioManifestCapability({
      private_manifest_capability,
      mission_id,
      contract_version,
      manifest_sha256: expected_manifest_sha256,
      campaign_interval_sha256: expected_campaign_interval_sha256,
      identity_anchor_sha256,
      manifest_ordinal,
    }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
  ) return blockedStateResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID });

  let storeIdentity;
  let storeMode;
  try {
    ({ storeIdentity, mode: storeMode } = await resolveWelcomeAudioLiveClaimStoreCapability(
      private_store_capability,
    ));
  } catch {
    return blockedStateResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID });
  }
  const effectiveNow = effectiveNowForStore({ storeMode, nowMs: now_ms });
  if (!Number.isFinite(effectiveNow) || effectiveNow < 0) {
    return blockedStateResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID });
  }
  const paths = buildStorePaths({ storeIdentity, missionId: mission_id, identityAnchorSha256: identity_anchor_sha256 });
  let mutexIdentity = null;
  let result = null;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedStateResult({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    const state = await inspectMissionState({ storeIdentity, missionId: mission_id });
    if (state.inspections.length >= WELCOME_AUDIO_LIVE_INSPECTION_CAP) {
      result = blockedStateResult({
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_CAP_REACHED,
        inspectionCursorCount: state.inspections.length,
      });
    } else if (
      manifest_ordinal !== state.inspections.length + 1
      || (state.inspections.length > 0
        && !state.resultByOrdinal.has(state.inspections.length))
    ) {
      result = blockedStateResult({
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_ORDER_INVALID,
        inspectionCursorCount: state.inspections.length,
      });
    } else {
      const record = Object.freeze({
        record_schema_version: WELCOME_AUDIO_LIVE_INSPECTION_RECORD_SCHEMA_VERSION,
        mission_id,
        contract_version,
        manifest_sha256: expected_manifest_sha256,
        campaign_interval_sha256: expected_campaign_interval_sha256,
        identity_anchor_sha256,
        manifest_ordinal,
        inspection_claimed_at: new Date(effectiveNow).toISOString(),
        claim_status: 'permanent_ordered_claim_before_source_read',
        claim_nonce: randomBytes(32).toString('hex'),
      });
      validateInspectionRecord({ record, expectedMissionId: mission_id });
      const filePath = paths.inspection(manifest_ordinal);
      await writeExclusiveDurable({
        filePath,
        value: record,
        storeIdentity,
        temporaryPrefix: paths.inspectionTemporaryPrefix,
      });
      const published = await readStableClaimRecord({ filePath, storeIdentity });
      validateInspectionRecord({ record: published.snapshot, expectedMissionId: mission_id });
      const capabilityIssuedAt = effectiveNowForStore({
        storeMode,
        nowMs: now_ms,
      });
      if (!Number.isFinite(capabilityIssuedAt) || capabilityIssuedAt < effectiveNow) {
        throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
      }
      const capability = createOneUseCapability(
        INSPECTION_CAPABILITY_STATE,
        {
          store_identity: storeIdentity,
          file_path: filePath,
          record_digest: published.digest,
          record_metadata: published.metadata,
          record,
          store_mode: storeMode,
          issued_at_ms: capabilityIssuedAt,
          expires_at_ms: capabilityIssuedAt
            + WELCOME_AUDIO_LIVE_INSPECTION_CAPABILITY_TTL_MS,
        },
        'crm_core_welcome_audio_private_inspection_capability',
      );
      result = {
        private_capability: capability,
        redacted_receipt: buildStateReceipt({
          decision: WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_CLAIMED,
          inspectionCursorCount: manifest_ordinal,
          privateCapabilityIssued: true,
        }),
      };
    }
  } catch {
    result = blockedStateResult({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        result = blockedStateResult({
          decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN,
        });
      }
    }
  }
  return result;
};

const recordWelcomeAudioLiveInspectionResult = async ({
  private_inspection_capability,
  classification,
  now_ms,
}) => {
  const capabilityState = INSPECTION_CAPABILITY_STATE.get(private_inspection_capability);
  const effectiveNow = effectiveNowForStore({
    storeMode: capabilityState?.store_mode,
    nowMs: now_ms,
  });
  if (
    !capabilityState
    || capabilityState.consumed
    || !INSPECTION_CLASSIFICATIONS.has(classification)
    || !Number.isFinite(effectiveNow)
    || effectiveNow < capabilityState.issued_at_ms
    || effectiveNow >= capabilityState.expires_at_ms
    || capabilityState.expires_at_ms - capabilityState.issued_at_ms
      !== WELCOME_AUDIO_LIVE_INSPECTION_CAPABILITY_TTL_MS
  ) return blockedStateResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID });
  const inspection = capabilityState.record;
  const storeIdentity = capabilityState.store_identity;
  const paths = buildStorePaths({
    storeIdentity,
    missionId: inspection.mission_id,
    identityAnchorSha256: inspection.identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedStateResult({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    const loaded = await readStableClaimRecord({
      filePath: capabilityState.file_path,
      storeIdentity,
    });
    if (
      loaded.digest !== capabilityState.record_digest
      || !sameMetadata(loaded.metadata, capabilityState.record_metadata)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    const state = await inspectMissionState({ storeIdentity, missionId: inspection.mission_id });
    if (state.resultByOrdinal.has(inspection.manifest_ordinal)) {
      return blockedStateResult({
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
        inspectionCursorCount: state.inspections.length,
      });
    }
    const record = Object.freeze({
      record_schema_version: WELCOME_AUDIO_LIVE_INSPECTION_RESULT_SCHEMA_VERSION,
      mission_id: inspection.mission_id,
      contract_version: inspection.contract_version,
      manifest_sha256: inspection.manifest_sha256,
      campaign_interval_sha256: inspection.campaign_interval_sha256,
      identity_anchor_sha256: inspection.identity_anchor_sha256,
      manifest_ordinal: inspection.manifest_ordinal,
      inspection_claim_nonce: inspection.claim_nonce,
      classification,
      recorded_at: new Date(effectiveNow).toISOString(),
    });
    validateInspectionResultRecord({ record, expectedMissionId: inspection.mission_id });
    await writeExclusiveDurable({
      filePath: paths.inspectionResult(inspection.manifest_ordinal),
      value: record,
      storeIdentity,
      temporaryPrefix: paths.inspectionResultTemporaryPrefix,
    });
    capabilityState.consumed = true;
    result = {
      private_capability: null,
      redacted_receipt: buildStateReceipt({
        decision: WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_RECORDED,
        inspectionCursorCount: state.inspections.length,
      }),
    };
  } catch {
    result = blockedStateResult({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        result = blockedStateResult({
          decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN,
        });
      }
    }
  }
  return result;
};

const issueWelcomeAudioLiveClaim = async ({
  private_store_capability,
  private_operation_context_capability,
  private_authority_capability,
  mission_id,
  contract_version,
  expected_mission_contract_sha256,
  expected_approval_packet_id,
  expected_operation_id,
  expected_central_repo_head,
  expected_canonical_operation_sha256,
  identity_anchor_sha256,
  expected_thread_anchor_sha256,
  expected_owner_anchor_sha256,
  manifest_ordinal,
  expected_manifest_sha256,
  expected_campaign_interval_sha256,
  expected_audio_sha256,
  private_manifest_capability,
  private_audio_asset_capability,
  approved_audio_asset_path,
  now_ms,
}) => {
  if (
    !isOpaqueId(mission_id)
    || !isOpaqueId(contract_version)
    || !isSha256(expected_mission_contract_sha256)
    || !isOpaqueId(expected_approval_packet_id)
    || !isOpaqueId(expected_operation_id)
    || typeof expected_central_repo_head !== 'string'
    || !/^[a-f0-9]{40}$/.test(expected_central_repo_head)
    || !isSha256(expected_canonical_operation_sha256)
    || !isSha256(identity_anchor_sha256)
    || !isSha256(expected_thread_anchor_sha256)
    || !isSha256(expected_owner_anchor_sha256)
    || !Number.isInteger(manifest_ordinal)
    || manifest_ordinal < 1
    || manifest_ordinal > 8
    || !isSha256(expected_manifest_sha256)
    || !isSha256(expected_campaign_interval_sha256)
    || !isSha256(expected_audio_sha256)
    || typeof approved_audio_asset_path !== 'string'
  ) return blockedResult({
    decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID,
  });

  const manifestStatus = verifySealedWelcomeAudioManifestCapability({
    private_manifest_capability,
    mission_id,
    contract_version,
    manifest_sha256: expected_manifest_sha256,
    campaign_interval_sha256: expected_campaign_interval_sha256,
    identity_anchor_sha256,
    manifest_ordinal,
  });
  if (manifestStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) return blockedResult({
    decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.PREFLIGHT_CAPABILITY_INVALID,
  });

  let storeIdentity;
  let storeMode;
  try {
    ({ storeIdentity, mode: storeMode } = await resolveWelcomeAudioLiveClaimStoreCapability(
      private_store_capability,
    ));
  } catch {
    return blockedResult({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID,
    });
  }
  const effectiveNow = effectiveNowForStore({ storeMode, nowMs: now_ms });
  if (!Number.isFinite(effectiveNow) || effectiveNow < 0) return blockedResult({
    decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID,
  });
  const paths = buildStorePaths({
    storeIdentity,
    missionId: mission_id,
    identityAnchorSha256: identity_anchor_sha256,
  });
  const approvalBindingSha256 = canonicalSha256({
    mission_id,
    contract_version,
    mission_contract_sha256: expected_mission_contract_sha256,
    approval_packet_id: expected_approval_packet_id,
    operation_id: expected_operation_id,
    central_repo_head: expected_central_repo_head,
    canonical_operation_sha256: expected_canonical_operation_sha256,
    manifest_sha256: expected_manifest_sha256,
    campaign_interval_sha256: expected_campaign_interval_sha256,
    identity_anchor_sha256,
    identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
    thread_anchor_sha256: expected_thread_anchor_sha256,
    owner_anchor_sha256: expected_owner_anchor_sha256,
    audio_asset_sha256: expected_audio_sha256,
    manifest_ordinal,
  });

  let mutexIdentity = null;
  let pendingResult = null;
  let claimPublished = false;
  let claimPublicationAttempted = false;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedResult({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    await reconcileSingleGlobalClaimTemporary({ storeIdentity });
    let before = await inspectMissionClaims({ storeIdentity, paths, missionId: mission_id });
    await assertNoOrphanDurableAttemptBoundaries({
      storeIdentity,
      claims: before.allRecords,
    });
    for (const loadedClaim of before.allRecords) {
      const claim = loadedClaim.snapshot;
      const claimPaths = buildStorePaths({
        storeIdentity,
        missionId: claim.mission_id,
        identityAnchorSha256: claim.identity_anchor_sha256,
      });
      const entriesBefore = await readdir(storeIdentity.path);
      const irreversibleBoundaryPresent = entriesBefore.includes(basename(claimPaths.pending))
        || entriesBefore.includes(basename(claimPaths.terminal))
        || entriesBefore.some((entry) => entry.startsWith(claimPaths.pendingTemporaryPrefix))
        || entriesBefore.some((entry) => entry.startsWith(claimPaths.terminalTemporaryPrefix));
      const cancellationLoaded = before.cancellationByClaimNonce.get(claim.claim_nonce);
      const cancellation = cancellationLoaded?.snapshot;
      if (cancellation && !reservationCancellationMatchesClaim({ cancellation, claim })) {
        throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
      }
      if (cancellation && !irreversibleBoundaryPresent) {
        await quarantineAndDeleteExactClaimAfterCancellation({
          storeIdentity,
          paths: claimPaths,
          expectedClaim: loadedClaim,
          expectedCancellation: cancellationLoaded,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
        });
      } else if (
        !irreversibleBoundaryPresent
        && processOwnerIsDefinitelyDead(claim.owner_pid)
      ) {
        await publishReservationCancellation({
          storeIdentity,
          paths: claimPaths,
          claimLoaded: loadedClaim,
          cancelledAtMs: Math.max(effectiveNow, Date.parse(claim.claimed_at)),
          reason: 'dead_owner_reclaim',
        });
      }
    }
    before = await inspectMissionClaims({ storeIdentity, paths, missionId: mission_id });
    await assertNoOrphanDurableAttemptBoundaries({
      storeIdentity,
      claims: before.allRecords,
    });
    const missionSlots = await inspectSequentialMissionSlots({
      storeIdentity,
      missionId: mission_id,
      claims: before.records,
    });
    const missionState = await inspectMissionState({ storeIdentity, missionId: mission_id });
    const inspectionResult = missionState.resultByOrdinal.get(manifest_ordinal)?.snapshot;
    const earliestUnclaimedEligible = missionState.inspectionResults
      .map((loaded) => loaded.snapshot)
      .find((candidate) => candidate.classification
        === WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE
        && !before.seenIdentitiesGlobal.has(candidate.identity_anchor_sha256));
    if (before.seenIdentitiesGlobal.has(identity_anchor_sha256)) {
      const entries = await readdir(storeIdentity.path);
      const permanent = entries.includes(basename(paths.pending))
        || entries.includes(basename(paths.terminal));
      pendingResult = blockedResult({
        decision: permanent
          ? WELCOME_AUDIO_LIVE_CLAIM_DECISION.DUPLICATE
          : WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
        blocker: permanent
          ? WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.DUPLICATE_IDENTITY
          : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_ACTIVE,
        missionClaimCount: before.records.length,
      });
    } else if (before.records.length >= WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP) {
      pendingResult = blockedResult({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.CAP_REACHED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_CAP_REACHED,
        missionClaimCount: before.records.length,
      });
    } else if (!missionSlots.allowed || missionSlots.next_slot > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP) {
      pendingResult = blockedResult({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_SLOT_BLOCKED,
        missionClaimCount: before.records.length,
      });
    } else if (!inspectionResult) {
      pendingResult = blockedResult({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_RESULT_MISSING,
        missionClaimCount: before.records.length,
      });
    } else if (
      earliestUnclaimedEligible
      && earliestUnclaimedEligible.manifest_ordinal !== manifest_ordinal
    ) {
      pendingResult = blockedResult({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_ORDER_INVALID,
        missionClaimCount: before.records.length,
      });
    } else if (
      inspectionResult.classification !== WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE
      || inspectionResult.mission_id !== mission_id
      || inspectionResult.contract_version !== contract_version
      || inspectionResult.manifest_sha256 !== expected_manifest_sha256
      || inspectionResult.campaign_interval_sha256 !== expected_campaign_interval_sha256
      || inspectionResult.identity_anchor_sha256 !== identity_anchor_sha256
    ) {
      pendingResult = blockedResult({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_NOT_ELIGIBLE,
        missionClaimCount: before.records.length,
      });
    } else {
      const operationContextStatus = await consumeWelcomeAudioLiveOperationContextCapabilityOnce({
        private_operation_context_capability,
        private_authority_capability,
        private_audio_asset_capability,
        required_authority_mode: requiredAuthorityModeForStore(storeMode),
        mission_id,
        contract_version,
        mission_contract_sha256: expected_mission_contract_sha256,
        approval_packet_id: expected_approval_packet_id,
        operation_id: expected_operation_id,
        central_repo_head: expected_central_repo_head,
        canonical_operation_sha256: expected_canonical_operation_sha256,
        manifest_sha256: expected_manifest_sha256,
        campaign_interval_sha256: expected_campaign_interval_sha256,
        identity_anchor_sha256,
        thread_anchor_sha256: expected_thread_anchor_sha256,
        owner_anchor_sha256: expected_owner_anchor_sha256,
        audio_asset_sha256: expected_audio_sha256,
        manifest_ordinal,
        now_ms: effectiveNow,
      });
      if (operationContextStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
        pendingResult = blockedResult({
          decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.PREFLIGHT_CAPABILITY_INVALID,
          missionClaimCount: before.records.length,
        });
      } else {
      const claimRecord = Object.freeze({
      record_schema_version: WELCOME_AUDIO_LIVE_CLAIM_RECORD_SCHEMA_VERSION,
      claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
      mission_id,
      contract_version,
      mission_contract_sha256: expected_mission_contract_sha256,
      approval_packet_id: expected_approval_packet_id,
      operation_id: expected_operation_id,
      central_repo_head: expected_central_repo_head,
      canonical_operation_sha256: expected_canonical_operation_sha256,
      approval_binding_sha256: approvalBindingSha256,
      identity_anchor_sha256,
      identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
      thread_anchor_sha256: expected_thread_anchor_sha256,
      owner_anchor_sha256: expected_owner_anchor_sha256,
      manifest_sha256: expected_manifest_sha256,
      campaign_interval_sha256: expected_campaign_interval_sha256,
      audio_asset_sha256: expected_audio_sha256,
      manifest_ordinal,
      mission_slot: missionSlots.next_slot,
      claimed_at: new Date(effectiveNow).toISOString(),
      claim_status: 'pre_effect_reservation',
      retry_disposition: 'retry_only_after_explicit_zero_effect_cancel_or_dead_owner',
      claim_nonce: randomBytes(32).toString('hex'),
      owner_pid: process.pid,
      owner_nonce: randomBytes(32).toString('hex'),
      reservation_expires_at: new Date(
        effectiveNow + WELCOME_AUDIO_LIVE_RESERVATION_TTL_MS,
      ).toISOString(),
      });
      validateClaimRecord({ record: claimRecord, expectedMissionId: mission_id });
      claimPublicationAttempted = true;
      await writeExclusiveDurable({
      filePath: paths.claim,
      value: claimRecord,
      storeIdentity,
      temporaryPrefix: paths.temporaryPrefix,
    });
      claimPublished = true;
      const published = await readStableClaimRecord({
      filePath: paths.claim,
      storeIdentity,
    });
      validateClaimRecord({ record: published.snapshot, expectedMissionId: mission_id });
      const after = await inspectMissionClaims({ storeIdentity, paths, missionId: mission_id });
      if (
      after.records.length !== before.records.length + 1
      || !after.seenIdentitiesGlobal.has(identity_anchor_sha256)
      || after.records.length > WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
      ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN);
      const capability = createClaimCapability({
      store_identity: storeIdentity,
      claim_path: paths.claim,
      claim_digest: published.digest,
      claim_metadata: published.metadata,
      mission_id,
      contract_version,
      mission_contract_sha256: expected_mission_contract_sha256,
      approval_packet_id: expected_approval_packet_id,
      operation_id: expected_operation_id,
      central_repo_head: expected_central_repo_head,
      canonical_operation_sha256: expected_canonical_operation_sha256,
      approval_binding_sha256: approvalBindingSha256,
      identity_anchor_sha256,
      identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
      thread_anchor_sha256: expected_thread_anchor_sha256,
      owner_anchor_sha256: expected_owner_anchor_sha256,
      manifest_sha256: expected_manifest_sha256,
      campaign_interval_sha256: expected_campaign_interval_sha256,
      audio_asset_sha256: expected_audio_sha256,
      manifest_ordinal,
      mission_slot: published.snapshot.mission_slot,
      claim_nonce: published.snapshot.claim_nonce,
      owner_pid: published.snapshot.owner_pid,
      owner_nonce: published.snapshot.owner_nonce,
      reservation_expires_at: published.snapshot.reservation_expires_at,
      store_mode: storeMode,
      private_audio_asset_capability,
      private_authority_capability,
      approved_audio_asset_path,
    });
      pendingResult = {
      private_claim_capability: capability,
      redacted_receipt: buildReceipt({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED,
        missionClaimCount: after.records.length,
      }),
      };
      }
    }
  } catch (error) {
    let claimEvidencePresent = false;
    try {
      const entries = await readdir(storeIdentity.path);
      claimEvidencePresent = entries.includes(basename(paths.claim))
        || entries.some((entry) => entry.startsWith(paths.temporaryPrefix));
      if (entries.includes(basename(paths.claim))) {
        const loaded = await readStableClaimRecord({ filePath: paths.claim, storeIdentity });
        validateClaimRecord({ record: loaded.snapshot, expectedMissionId: mission_id });
      }
    } catch {
      claimEvidencePresent = true;
    }
    const publicationUnknown = claimPublicationAttempted
      || claimPublished
      || claimEvidencePresent;
    const blocker = error?.message === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN
      ? WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN
      : publicationUnknown
        ? WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID;
    pendingResult = blockedResult({
      decision: blocker === WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID
        ? WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED
        : WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
      blocker,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        pendingResult = blockedResult({
          decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_PUBLICATION_UNKNOWN,
        });
      }
    }
  }
  return pendingResult;
};

const sameCapabilityBinding = (state, expected) => state.mission_id === expected.mission_id
  && state.contract_version === expected.contract_version
  && state.mission_contract_sha256 === expected.mission_contract_sha256
  && state.identity_anchor_schema_version
    === WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
  && state.approval_packet_id === expected.approval_packet_id
  && state.operation_id === expected.operation_id
  && state.central_repo_head === expected.central_repo_head
  && state.canonical_operation_sha256 === expected.canonical_operation_sha256
  && state.identity_anchor_sha256 === expected.identity_anchor_sha256
  && state.thread_anchor_sha256 === expected.thread_anchor_sha256
  && state.owner_anchor_sha256 === expected.owner_anchor_sha256
  && state.manifest_sha256 === expected.manifest_sha256
  && state.campaign_interval_sha256 === expected.campaign_interval_sha256
  && state.audio_asset_sha256 === expected.audio_asset_sha256
  && state.manifest_ordinal === expected.manifest_ordinal;

const verifyWelcomeAudioLiveClaimCapabilityBinding = async ({
  private_claim_capability,
  mission_id,
  contract_version,
  mission_contract_sha256,
  approval_packet_id,
  operation_id,
  central_repo_head,
  canonical_operation_sha256,
  identity_anchor_sha256,
  thread_anchor_sha256,
  owner_anchor_sha256,
  manifest_sha256,
  campaign_interval_sha256,
  audio_asset_sha256,
  manifest_ordinal,
  required_store_mode,
}) => {
  const state = CLAIM_CAPABILITY_STATE.get(private_claim_capability);
  if (
    !state
    || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || state.store_mode !== required_store_mode
    || !sameCapabilityBinding(state, {
    mission_id,
    contract_version,
    mission_contract_sha256,
    approval_packet_id,
    operation_id,
    central_repo_head,
    canonical_operation_sha256,
    identity_anchor_sha256,
    thread_anchor_sha256,
    owner_anchor_sha256,
    manifest_sha256,
    campaign_interval_sha256,
    audio_asset_sha256,
    manifest_ordinal,
    })
  ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  try {
    await assertWelcomeAudioLiveClaimStoreRoot({
      store_root: state.store_identity.path,
      expected_identity: state.store_identity,
    });
    const loaded = await readStableClaimRecord({
      filePath: state.claim_path,
      storeIdentity: state.store_identity,
    });
    validateClaimRecord({ record: loaded.snapshot, expectedMissionId: state.mission_id });
    if (
      loaded.digest !== state.claim_digest
      || !sameMetadata(loaded.metadata, state.claim_metadata)
      || !sameCapabilityBinding(loaded.snapshot, {
        mission_id,
        contract_version,
        mission_contract_sha256,
        approval_packet_id,
        operation_id,
        central_repo_head,
        canonical_operation_sha256,
        identity_anchor_sha256,
        thread_anchor_sha256,
        owner_anchor_sha256,
        manifest_sha256,
        campaign_interval_sha256,
        audio_asset_sha256,
        manifest_ordinal,
      })
      || loaded.snapshot.approval_binding_sha256 !== state.approval_binding_sha256
      || loaded.snapshot.claim_nonce !== state.claim_nonce
    ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
    return state.consumed
      ? WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.CONSUMED
      : WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH;
  } catch {
    return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  }
};

const cancelWelcomeAudioLiveReservationZeroEffect = async ({
  ...binding
}) => {
  const {
    private_claim_capability,
    required_store_mode,
    cancelled_at_ms,
  } = binding;
  const claimState = CLAIM_CAPABILITY_STATE.get(private_claim_capability);
  if (
    !claimState
    || claimState.consumed
    || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || claimState.store_mode !== required_store_mode
    || await verifyWelcomeAudioLiveClaimCapabilityBinding(binding)
      !== WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH
  ) return blockedResult({
    decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
  });
  const effectiveNow = effectiveNowForStore({
    storeMode: claimState.store_mode,
    nowMs: cancelled_at_ms,
  });
  if (!Number.isFinite(effectiveNow) || effectiveNow < 0) return blockedResult({
    decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED,
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
  });
  const storeIdentity = claimState.store_identity;
  const paths = buildStorePaths({
    storeIdentity,
    missionId: claimState.mission_id,
    identityAnchorSha256: claimState.identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedResult({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    const entries = await readdir(storeIdentity.path);
    if (
      entries.includes(basename(paths.pending))
      || entries.includes(basename(paths.terminal))
      || entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix))
      || entries.some((entry) => entry.startsWith(paths.terminalTemporaryPrefix))
    ) return blockedResult({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.DUPLICATE,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.DUPLICATE_IDENTITY,
    });
    const loaded = await readStableClaimRecord({
      filePath: claimState.claim_path,
      storeIdentity,
    });
    if (
      loaded.digest !== claimState.claim_digest
      || !sameMetadata(loaded.metadata, claimState.claim_metadata)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID);
    await publishReservationCancellation({
      storeIdentity,
      paths,
      claimLoaded: loaded,
      cancelledAtMs: effectiveNow,
      reason: 'explicit_zero_effect_cancel',
    });
    claimState.consumed = true;
    const after = await inspectMissionClaims({
      storeIdentity,
      paths,
      missionId: claimState.mission_id,
    });
    result = {
      private_claim_capability: null,
      redacted_receipt: buildReceipt({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.CANCELLED,
        missionClaimCount: after.records.length,
      }),
    };
  } catch (error) {
    result = blockedResult({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
      blocker: RECEIPT_BLOCKERS.has(error?.message)
        ? error.message
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        result = blockedResult({
          decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
        });
      }
    }
  }
  return result;
};

const enterWelcomeAudioLiveAttemptBoundary = async ({
  ...binding
}) => {
  const {
    private_claim_capability,
    required_store_mode,
    private_audio_asset_capability,
    approved_audio_asset_path,
    entered_at_ms,
  } = binding;
  const claimState = CLAIM_CAPABILITY_STATE.get(private_claim_capability);
  if (
    !claimState
    || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || claimState.store_mode !== required_store_mode
    || private_audio_asset_capability !== claimState.private_audio_asset_capability
    || approved_audio_asset_path !== claimState.approved_audio_asset_path
    || await verifyWelcomeAudioLiveClaimCapabilityBinding(binding)
      !== WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH
  ) return blockedAttemptResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID });
  if (
    claimState.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
    && (!Number.isFinite(entered_at_ms) || entered_at_ms < 0)
  ) return blockedAttemptResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID });
  const storeIdentity = claimState.store_identity;
  const paths = buildStorePaths({
    storeIdentity,
    missionId: claimState.mission_id,
    identityAnchorSha256: claimState.identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  let pendingPublished = false;
  let pendingPublicationAttempted = false;
  let terminalCapability = null;
  const mintTerminalCapabilityFromStablePending = async () => {
    if (terminalCapability) return terminalCapability;
    const loaded = await readStableClaimRecord({ filePath: paths.pending, storeIdentity });
    validatePendingRecord({ record: loaded.snapshot, expectedMissionId: claimState.mission_id });
    if (!terminalMatchesClaim({ terminal: loaded.snapshot, claim: claimState })) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID);
    }
    terminalCapability = createOneUseCapability(
      ACTUATION_CAPABILITY_STATE,
      {
        store_identity: storeIdentity,
        store_mode: claimState.store_mode,
        pending_path: paths.pending,
        pending_digest: loaded.digest,
        pending_metadata: loaded.metadata,
        pending: loaded.snapshot,
        synthetic_terminal_verifier_scenario: null,
      },
      'crm_core_welcome_audio_private_terminal_capability',
    );
    return terminalCapability;
  };
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    await reconcileSingleLinkedTemporaryByPrefix({
      storeIdentity,
      finalPath: paths.pending,
      temporaryPrefix: paths.pendingTemporaryPrefix,
      validator: validatePendingRecord,
      expectedMissionId: claimState.mission_id,
    });
    await reconcileSingleLinkedTemporaryByPrefix({
      storeIdentity,
      finalPath: paths.terminal,
      temporaryPrefix: paths.terminalTemporaryPrefix,
      validator: validateTerminalRecord,
      expectedMissionId: claimState.mission_id,
    });
    if (!await reconcileSingleGlobalReservationCancellationTemporary({ storeIdentity })) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
    }
    const entries = await readdir(storeIdentity.path);
    if (entries.includes(basename(paths.terminal))) {
      claimState.consumed = true;
      result = blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.TERMINAL_PREEXISTING,
        terminalPresent: true,
        claimConsumed: true,
      });
    } else if (
      entries.includes(basename(paths.pending))
      || entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix))
      || entries.some((entry) => entry.startsWith(paths.terminalTemporaryPrefix))
    ) {
      const evidence = await discoverIrreversibleAttemptEvidence({
        storeIdentity,
        paths,
        missionId: claimState.mission_id,
      });
      if (evidence.pendingPresent && !evidence.terminalPresent) {
        try {
          await mintTerminalCapabilityFromStablePending();
        } catch {
          terminalCapability = null;
        }
      }
      claimState.consumed = true;
      result = blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.PENDING_PREEXISTING,
        pendingPresent: evidence.pendingPresent,
        terminalPresent: evidence.terminalPresent,
        claimConsumed: true,
        privateTerminalCapability: terminalCapability,
      });
    } else {
      const loadedClaim = await readStableClaimRecord({
        filePath: claimState.claim_path,
        storeIdentity,
      });
      if (
        loadedClaim.digest !== claimState.claim_digest
        || !sameMetadata(loadedClaim.metadata, claimState.claim_metadata)
      ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID);
      const cancellationPath = paths.reservationCancellation(claimState.claim_nonce);
      if ((await readdir(storeIdentity.path)).includes(basename(cancellationPath))) {
        const cancellationLoaded = await readStableClaimRecord({
          filePath: cancellationPath,
          storeIdentity,
        });
        validateReservationCancellationRecord({ record: cancellationLoaded.snapshot });
        if (!reservationCancellationMatchesClaim({
          cancellation: cancellationLoaded.snapshot,
          claim: loadedClaim.snapshot,
        })) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN);
        await quarantineAndDeleteExactClaimAfterCancellation({
          storeIdentity,
          paths,
          expectedClaim: loadedClaim,
          expectedCancellation: cancellationLoaded,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
        });
        claimState.consumed = true;
        result = blockedAttemptResult({
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
          claimConsumed: true,
          zeroEffectReservationCancelled: true,
        });
      } else {
      const assetStatus = await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
        private_audio_asset_capability,
        asset_path: approved_audio_asset_path,
        expected_audio_sha256: claimState.audio_asset_sha256,
      });
      const effectiveNow = effectiveNowForStore({
        storeMode: claimState.store_mode,
        nowMs: entered_at_ms,
      });
      const authorityStatus = await revalidateWelcomeAudioLiveAuthorityCapability({
        private_authority_capability: claimState.private_authority_capability,
        now_ms: effectiveNow,
      });
      const forcePrePendingRevalidationFailure = claimState.synthetic_attempt_boundary_scenario
        === WELCOME_AUDIO_LIVE_ATTEMPT_BOUNDARY_SCENARIO_FOR_TEST
          .FORCE_PRE_PENDING_REVALIDATION_FAILURE;
      claimState.synthetic_attempt_boundary_scenario = null;
      if (
        forcePrePendingRevalidationFailure
        || authorityStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
        || assetStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
        || !Number.isFinite(effectiveNow)
        || effectiveNow < 0
        || effectiveNow >= Date.parse(claimState.reservation_expires_at)
      ) {
        await publishReservationCancellation({
          storeIdentity,
          paths,
          claimLoaded: loadedClaim,
          cancelledAtMs: Number.isFinite(effectiveNow)
            ? Math.max(effectiveNow, Date.parse(loadedClaim.snapshot.claimed_at))
            : Date.parse(loadedClaim.snapshot.claimed_at),
          reason: 'pre_pending_revalidation_failed',
        });
        claimState.consumed = true;
        result = blockedAttemptResult({
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
          claimConsumed: true,
          zeroEffectReservationCancelled: true,
        });
      } else {
        const pending = Object.freeze({
        record_schema_version: WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION,
        mission_id: claimState.mission_id,
        contract_version: claimState.contract_version,
        mission_contract_sha256: claimState.mission_contract_sha256,
        approval_packet_id: claimState.approval_packet_id,
        operation_id: claimState.operation_id,
        central_repo_head: claimState.central_repo_head,
        canonical_operation_sha256: claimState.canonical_operation_sha256,
        approval_binding_sha256: claimState.approval_binding_sha256,
        identity_anchor_sha256: claimState.identity_anchor_sha256,
        identity_anchor_schema_version: claimState.identity_anchor_schema_version,
        thread_anchor_sha256: claimState.thread_anchor_sha256,
        owner_anchor_sha256: claimState.owner_anchor_sha256,
        manifest_sha256: claimState.manifest_sha256,
        campaign_interval_sha256: claimState.campaign_interval_sha256,
        audio_asset_sha256: claimState.audio_asset_sha256,
        manifest_ordinal: claimState.manifest_ordinal,
        mission_slot: claimState.mission_slot,
        claim_nonce: claimState.claim_nonce,
        owner_pid: claimState.owner_pid,
        owner_nonce: claimState.owner_nonce,
        entered_at: new Date(effectiveNow).toISOString(),
        boundary_status: 'pending_durable_before_attachment_upload',
        attachment_upload_entered: false,
        send_control_actuation_count: 0,
        attempt_nonce: randomBytes(32).toString('hex'),
      });
        validatePendingRecord({ record: pending, expectedMissionId: claimState.mission_id });
        pendingPublicationAttempted = true;
        await writeExclusiveDurable({
          filePath: paths.pending,
          value: pending,
          storeIdentity,
          temporaryPrefix: paths.pendingTemporaryPrefix,
        });
        pendingPublished = true;
        const published = await readStableClaimRecord({ filePath: paths.pending, storeIdentity });
        validatePendingRecord({
          record: published.snapshot,
          expectedMissionId: claimState.mission_id,
        });
        claimState.consumed = true;
        terminalCapability = await mintTerminalCapabilityFromStablePending();
        const hostPendingCapability = createOneUseCapability(
          HOST_PENDING_CAPABILITY_STATE,
          {
            store_identity: storeIdentity,
            store_mode: claimState.store_mode,
            pending_path: paths.pending,
            pending_digest: published.digest,
            pending_metadata: published.metadata,
            pending,
            attempt_nonce: pending.attempt_nonce,
          },
          'crm_core_welcome_audio_private_host_pending_capability',
        );
        result = {
          private_actuation_capability: terminalCapability,
          private_host_pending_capability: hostPendingCapability,
          private_terminal_capability: terminalCapability,
          redacted_receipt: buildAttemptReceipt({
            decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.ARMED,
          }),
        };
      }
      }
    }
  } catch (error) {
    const evidence = await discoverIrreversibleAttemptEvidence({
      storeIdentity,
      paths,
      missionId: claimState.mission_id,
    });
    const prePendingStateUnknown = [
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.CLAIM_EVIDENCE_UNKNOWN,
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_CANCEL_INVALID,
    ].includes(error?.message);
    const irreversible = pendingPublicationAttempted
      || evidence.anyBoundaryEvidence
      || prePendingStateUnknown;
    if (irreversible) claimState.consumed = true;
    if (evidence.pendingPresent && !evidence.terminalPresent && !terminalCapability) {
      try {
        await mintTerminalCapabilityFromStablePending();
      } catch {
        terminalCapability = null;
      }
    }
    result = blockedAttemptResult({
      decision: irreversible || pendingPublished
        ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL
        : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
      blocker: RECEIPT_BLOCKERS.has(error?.message)
        ? error.message
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
      pendingPresent: evidence.pendingPresent,
      terminalPresent: evidence.terminalPresent,
      claimConsumed: irreversible,
      privateTerminalCapability: terminalCapability,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        const evidence = await discoverIrreversibleAttemptEvidence({
          storeIdentity,
          paths,
          missionId: claimState.mission_id,
        });
        const irreversible = pendingPublicationAttempted || evidence.anyBoundaryEvidence;
        if (irreversible) claimState.consumed = true;
        if (evidence.pendingPresent && !evidence.terminalPresent && !terminalCapability) {
          try {
            await mintTerminalCapabilityFromStablePending();
          } catch {
            terminalCapability = null;
          }
        }
        result = blockedAttemptResult({
          decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
          pendingPresent: evidence.pendingPresent,
          terminalPresent: evidence.terminalPresent,
          claimConsumed: irreversible,
          privateTerminalCapability: terminalCapability,
        });
      }
    }
  }
  return result;
};

const consumeWelcomeAudioLiveHostPendingCapabilityOnce = async ({
  private_host_pending_capability,
  required_store_mode,
  independently_read_pending_evidence,
  expected_mission_id,
  expected_operation_id,
  expected_identity_anchor_sha256,
  expected_thread_anchor_sha256,
  expected_audio_sha256,
}) => {
  const state = HOST_PENDING_CAPABILITY_STATE.get(private_host_pending_capability);
  if (!state || state.consumed) {
    return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID;
  }
  state.consumed = true;
  try {
    const evidence = independently_read_pending_evidence;
    if (
      !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
      || state.store_mode !== required_store_mode
      || !exactObjectKeys(evidence, WELCOME_AUDIO_LIVE_HOST_PENDING_EVIDENCE_FIELDS)
      || !exactObjectKeys(
        evidence.store_identity,
        WELCOME_AUDIO_LIVE_HOST_PENDING_STORE_IDENTITY_FIELDS,
      )
      || !exactObjectKeys(
        evidence.pending_metadata,
        WELCOME_AUDIO_LIVE_HOST_PENDING_METADATA_FIELDS,
      )
      || !isOpaqueId(expected_mission_id)
      || !isOpaqueId(expected_operation_id)
      || !isSha256(expected_identity_anchor_sha256)
      || !isSha256(expected_thread_anchor_sha256)
      || !isSha256(expected_audio_sha256)
      || typeof evidence.pending_path !== 'string'
      || !isSha256(evidence.pending_digest)
    ) return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID;

    validatePendingRecord({
      record: evidence.pending_snapshot,
      expectedMissionId: expected_mission_id,
    });
    if (
      evidence.store_identity.path !== state.store_identity.path
      || evidence.store_identity.dev !== state.store_identity.dev
      || evidence.store_identity.ino !== state.store_identity.ino
      || evidence.store_identity.uid !== state.store_identity.uid
      || evidence.store_identity.mode !== state.store_identity.mode
      || evidence.pending_path !== state.pending_path
      || evidence.pending_digest !== state.pending_digest
      || !sameMetadata(evidence.pending_metadata, state.pending_metadata)
      || canonicalSha256(evidence.pending_snapshot) !== canonicalSha256(state.pending)
      || evidence.pending_snapshot.attempt_nonce !== state.attempt_nonce
      || evidence.pending_snapshot.mission_id !== expected_mission_id
      || evidence.pending_snapshot.operation_id !== expected_operation_id
      || evidence.pending_snapshot.identity_anchor_sha256 !== expected_identity_anchor_sha256
      || evidence.pending_snapshot.thread_anchor_sha256 !== expected_thread_anchor_sha256
      || evidence.pending_snapshot.audio_asset_sha256 !== expected_audio_sha256
    ) return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID;

    await assertWelcomeAudioLiveClaimStoreRoot({
      store_root: state.store_identity.path,
      expected_identity: state.store_identity,
    });
    const loaded = await readStableClaimRecord({
      filePath: state.pending_path,
      storeIdentity: state.store_identity,
    });
    validatePendingRecord({ record: loaded.snapshot, expectedMissionId: expected_mission_id });
    if (
      loaded.digest !== state.pending_digest
      || loaded.digest !== evidence.pending_digest
      || !sameMetadata(loaded.metadata, state.pending_metadata)
      || !sameMetadata(loaded.metadata, evidence.pending_metadata)
      || canonicalSha256(loaded.snapshot) !== canonicalSha256(state.pending)
      || canonicalSha256(loaded.snapshot) !== canonicalSha256(evidence.pending_snapshot)
      || loaded.snapshot.attempt_nonce !== state.attempt_nonce
    ) return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID;
    return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.VALID;
  } catch {
    return WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID;
  }
};

const TERMINAL_EVIDENCE_FIELDS = Object.freeze([
  'outcome',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'attempted_at_ms',
  'confirmation_marker',
  'confirmation_observed_at_ms',
  'new_outgoing_audio_bubble_delta',
]);

const unknownTerminalEvidence = ({ attemptedAtMs, uploadEntered = null, actuationCount = null }) => (
  Object.freeze({
    outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
    attachment_upload_entered: uploadEntered,
    send_control_actuation_count: actuationCount,
    attempted_at_ms: attemptedAtMs,
    confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
    confirmation_observed_at_ms: null,
    new_outgoing_audio_bubble_delta: 0,
  })
);

const terminalEvidenceShapeValid = (evidence) => {
  if (!exactObjectKeys(evidence, TERMINAL_EVIDENCE_FIELDS)) return false;
  if (!Number.isFinite(evidence.attempted_at_ms)) return false;
  if (evidence.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED) {
    return evidence.attachment_upload_entered === true
      && evidence.send_control_actuation_count === 1
      && STRONG_CONFIRMATION_MARKERS.has(evidence.confirmation_marker)
      && Number.isFinite(evidence.confirmation_observed_at_ms)
      && evidence.confirmation_observed_at_ms >= evidence.attempted_at_ms
      && evidence.confirmation_observed_at_ms - evidence.attempted_at_ms
        < WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
      && evidence.new_outgoing_audio_bubble_delta === 1;
  }
  return evidence.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN
    && attemptEvidenceIsCoherent({
      uploadEntered: evidence.attachment_upload_entered,
      actuationCount: evidence.send_control_actuation_count,
    })
    && evidence.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && evidence.confirmation_observed_at_ms === null
    && evidence.new_outgoing_audio_bubble_delta === 0;
};

const publishWelcomeAudioLiveTerminal = async ({ state, evidence, finalizedAtMs }) => {
  const pending = state.pending;
  const storeIdentity = state.store_identity;
  const paths = buildStorePaths({
    storeIdentity,
    missionId: pending.mission_id,
    identityAnchorSha256: pending.identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  let terminalPublished = false;
  let terminalPublicationAttempted = false;
  state.consumed = true;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
      pendingPresent: true,
      claimConsumed: true,
    });
    const entries = await readdir(storeIdentity.path);
    if (entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix)
      || entry.startsWith(paths.terminalTemporaryPrefix))) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN);
    }
    if (entries.includes(basename(paths.terminal))) {
      const reconciled = await reconcileTerminalPendingCleanupOnly({
        storeIdentity,
        paths,
        missionId: pending.mission_id,
      });
      if (reconciled && terminalMatchesPending({
        terminal: reconciled.snapshot,
        pending,
      })) {
        const confirmed = reconciled.snapshot.outcome
          === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED;
        return {
          private_actuation_capability: null,
          private_terminal_capability: null,
          redacted_receipt: buildAttemptReceipt({
            decision: confirmed
              ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED
              : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
            uploadEntered: reconciled.snapshot.attachment_upload_entered,
            actuationCount: reconciled.snapshot.send_control_actuation_count,
          }),
        };
      }
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.TERMINAL_PREEXISTING);
    }
    const loadedPending = await readStableClaimRecord({
      filePath: state.pending_path,
      storeIdentity,
    });
    validatePendingRecord({ record: loadedPending.snapshot, expectedMissionId: pending.mission_id });
    if (
      loadedPending.digest !== state.pending_digest
      || !sameMetadata(loadedPending.metadata, state.pending_metadata)
      || canonicalSha256(loadedPending.snapshot) !== canonicalSha256(pending)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN);
    const confirmed = evidence.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED;
    const observedAt = confirmed ? evidence.confirmation_observed_at_ms : null;
    const terminal = Object.freeze({
      record_schema_version: WELCOME_AUDIO_LIVE_TERMINAL_RECORD_SCHEMA_VERSION,
      mission_id: pending.mission_id,
      contract_version: pending.contract_version,
      mission_contract_sha256: pending.mission_contract_sha256,
      approval_packet_id: pending.approval_packet_id,
      operation_id: pending.operation_id,
      central_repo_head: pending.central_repo_head,
      canonical_operation_sha256: pending.canonical_operation_sha256,
      approval_binding_sha256: pending.approval_binding_sha256,
      identity_anchor_sha256: pending.identity_anchor_sha256,
      identity_anchor_schema_version: pending.identity_anchor_schema_version,
      thread_anchor_sha256: pending.thread_anchor_sha256,
      owner_anchor_sha256: pending.owner_anchor_sha256,
      manifest_sha256: pending.manifest_sha256,
      campaign_interval_sha256: pending.campaign_interval_sha256,
      audio_asset_sha256: pending.audio_asset_sha256,
      manifest_ordinal: pending.manifest_ordinal,
      mission_slot: pending.mission_slot,
      claim_nonce: pending.claim_nonce,
      owner_pid: pending.owner_pid,
      owner_nonce: pending.owner_nonce,
      attempt_nonce: pending.attempt_nonce,
      entered_at: pending.entered_at,
      attempted_at: new Date(evidence.attempted_at_ms).toISOString(),
      finalized_at: new Date(finalizedAtMs).toISOString(),
      outcome: evidence.outcome,
      attachment_upload_entered: evidence.attachment_upload_entered,
      send_control_actuation_count: evidence.send_control_actuation_count,
      confirmation_marker: evidence.confirmation_marker,
      confirmation_observed_at: confirmed ? new Date(observedAt).toISOString() : null,
      new_outgoing_audio_bubble_delta: evidence.new_outgoing_audio_bubble_delta,
      observation_window_expires_at: confirmed
        ? new Date(observedAt + WELCOME_AUDIO_LIVE_OBSERVATION_WINDOW_MS).toISOString()
        : null,
      retry_disposition: 'terminal_no_retry',
    });
    validateTerminalRecord({ record: terminal, expectedMissionId: pending.mission_id });
    terminalPublicationAttempted = true;
    await writeExclusiveDurable({
      filePath: paths.terminal,
      value: terminal,
      storeIdentity,
      temporaryPrefix: paths.terminalTemporaryPrefix,
    });
    terminalPublished = true;
    const published = await readStableClaimRecord({ filePath: paths.terminal, storeIdentity });
    validateTerminalRecord({ record: published.snapshot, expectedMissionId: pending.mission_id });
    if (
      canonicalSha256(published.snapshot) !== canonicalSha256(terminal)
      || published.digest !== sha256(stableJsonBytes(terminal))
    ) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN);
    }
    if (state.synthetic_terminal_verifier_scenario
      === WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST
        .REPLACE_PENDING_AFTER_TERMINAL_PUBLISH) {
      await replacePendingAfterTerminalPublishForTest({
        storeIdentity,
        paths,
        pending,
      });
    }
    if (state.synthetic_terminal_verifier_scenario
      === WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.CRASH_AFTER_TERMINAL_PUBLISH) {
      result = blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
        pendingPresent: true,
        terminalPresent: true,
        claimConsumed: true,
      });
    } else {
      await quarantineAndDeleteExactPendingAfterTerminal({
        storeIdentity,
        paths,
        expectedPending: loadedPending,
        expectedTerminal: published,
        expectedMissionId: pending.mission_id,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
      });
      result = {
        private_actuation_capability: null,
        private_terminal_capability: null,
        redacted_receipt: buildAttemptReceipt({
          decision: confirmed
            ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED
            : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
          uploadEntered: evidence.attachment_upload_entered,
          actuationCount: evidence.send_control_actuation_count,
        }),
      };
    }
  } catch (error) {
    const irreversible = await discoverIrreversibleAttemptEvidence({
      storeIdentity,
      paths,
      missionId: pending.mission_id,
    });
    result = blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: RECEIPT_BLOCKERS.has(error?.message)
        ? error.message
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
      pendingPresent: irreversible.pendingPresent,
      terminalPresent: irreversible.terminalPresent,
      claimConsumed: terminalPublicationAttempted
        || terminalPublished
        || irreversible.anyBoundaryEvidence,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        result = blockedAttemptResult({
          decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
          pendingPresent: true,
          terminalPresent: terminalPublished,
          claimConsumed: true,
        });
      }
    }
  }
  return result;
};

const configureWelcomeAudioLiveTerminalVerifierScenarioForTest = (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_terminal_capability',
    'scenario',
  ]);
  const input = envelope.values;
  const state = ACTUATION_CAPABILITY_STATE.get(input.private_terminal_capability);
  if (
    !envelope.valid
    || !state
    || state.consumed
    || state.terminal_bridge_consumed
    || state.store_mode !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
    || !Object.values(WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST).includes(input.scenario)
  ) return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.INVALID;
  state.synthetic_terminal_verifier_scenario = input.scenario;
  return WELCOME_AUDIO_LIVE_CLAIM_CAPABILITY_STATUS.FRESH;
};

const finalizeWelcomeAudioLiveAttempt = async (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    'private_terminal_capability',
    'required_store_mode',
    'private_attempt_evidence_capability',
    'private_visual_confirmation_capability',
    'synthetic_now_ms',
  ]);
  const input = envelope.values;
  const state = ACTUATION_CAPABILITY_STATE.get(input.private_terminal_capability);
  if (
    !state
    || state.consumed
    || state.terminal_bridge_consumed
  ) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
  });
  state.terminal_bridge_consumed = true;
  const enteredAtMs = Date.parse(state.pending.entered_at);
  const effectiveNow = state.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    ? Date.now()
    : input.synthetic_now_ms;
  const safeFinalizedAt = Number.isFinite(effectiveNow) && effectiveNow >= enteredAtMs
    ? effectiveNow
    : enteredAtMs;
  let evidence = unknownTerminalEvidence({ attemptedAtMs: safeFinalizedAt });
  try {
    const live = state.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY;
    const synthetic = state.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY;
    if (
      !envelope.valid
      || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(input.required_store_mode)
      || state.store_mode !== input.required_store_mode
      || (live && input.synthetic_now_ms !== null)
      || (synthetic && !Number.isFinite(input.synthetic_now_ms))
    ) throw new Error('terminal_envelope_invalid');
    if (state.synthetic_terminal_verifier_scenario
      === WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.IMPORT_FAILURE) {
      throw new Error('synthetic_import_failure');
    }
    const hostModule = await import(
      new URL('./crm-vnext-instagram-welcome-audio-safari-live-host.mjs', import.meta.url).href
    );
    if (
      state.synthetic_terminal_verifier_scenario
        === WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.MODULE_IDENTITY_FAILURE
      || hostModule.WELCOME_AUDIO_SAFARI_LIVE_HOST_CONTRACT_VERSION
        !== 'crm_core_instagram_welcome_audio_safari_live_host_v2'
      || typeof hostModule.verifyAndConsumeWelcomeAudioSafariTerminalEvidenceOnce !== 'function'
    ) throw new Error('host_module_identity_invalid');
    if (state.synthetic_terminal_verifier_scenario
      === WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.VERIFIER_FAILURE) {
      throw new Error('synthetic_verifier_failure');
    }
    const verified = await hostModule.verifyAndConsumeWelcomeAudioSafariTerminalEvidenceOnce({
      private_attempt_evidence_capability: input.private_attempt_evidence_capability,
      private_visual_confirmation_capability: input.private_visual_confirmation_capability,
      expected_operation_id: state.pending.operation_id,
      expected_thread_anchor_sha256: state.pending.thread_anchor_sha256,
      expected_attempt_nonce: state.pending.attempt_nonce,
      synthetic_now_ms: state.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
        ? safeFinalizedAt
        : null,
    });
    if (
      !terminalEvidenceShapeValid(verified)
      || verified.attempted_at_ms < enteredAtMs
      || (verified.confirmation_observed_at_ms !== null
        && verified.confirmation_observed_at_ms < enteredAtMs)
    ) throw new Error('host_terminal_evidence_invalid');
    evidence = verified;
  } catch {
    evidence = unknownTerminalEvidence({ attemptedAtMs: safeFinalizedAt });
  }
  const finalizedAtMs = Math.max(
    safeFinalizedAt,
    evidence.attempted_at_ms,
    evidence.confirmation_observed_at_ms ?? 0,
  );
  return publishWelcomeAudioLiveTerminal({ state, evidence, finalizedAtMs });
};

const finalizeWelcomeAudioLiveAttemptAsUnknown = async ({
  private_actuation_capability,
  required_store_mode,
  outcome,
  attachment_upload_entered,
  send_control_actuation_count,
  attempted_at_ms,
  finalized_at_ms,
}) => {
  const state = ACTUATION_CAPABILITY_STATE.get(private_actuation_capability);
  const effectiveFinalizedAt = state?.store_mode
    === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    ? Date.now()
    : finalized_at_ms;
  const effectiveAttemptedAt = state?.store_mode
    === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    ? effectiveFinalizedAt
    : attempted_at_ms;
  if (
    !state
    || state.consumed
    || state.terminal_bridge_consumed
    || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || state.store_mode !== required_store_mode
    || outcome !== WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN
    || !attemptEvidenceIsCoherent({
      uploadEntered: attachment_upload_entered,
      actuationCount: send_control_actuation_count,
    })
    || !Number.isFinite(effectiveAttemptedAt)
    || !Number.isFinite(effectiveFinalizedAt)
    || effectiveAttemptedAt < Date.parse(state?.pending?.entered_at ?? '')
    || effectiveFinalizedAt < effectiveAttemptedAt
  ) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
  });
  state.terminal_bridge_consumed = true;
  return publishWelcomeAudioLiveTerminal({
    state,
    evidence: unknownTerminalEvidence({
      attemptedAtMs: effectiveAttemptedAt,
      uploadEntered: attachment_upload_entered,
      actuationCount: send_control_actuation_count,
    }),
    finalizedAtMs: effectiveFinalizedAt,
  });
};

const recoverWelcomeAudioLivePendingAttemptAfterOwnerExitInternal = async ({
  private_store_capability,
  required_store_mode,
  mission_id,
  contract_version,
  mission_contract_sha256,
  identity_anchor_sha256,
  manifest_ordinal,
  now_ms,
}, syntheticReplacePendingAfterTerminalPublish = false) => {
  if (
    !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || !isOpaqueId(mission_id)
    || !isOpaqueId(contract_version)
    || !isSha256(mission_contract_sha256)
    || !isSha256(identity_anchor_sha256)
    || !Number.isInteger(manifest_ordinal)
    || manifest_ordinal < 1
    || manifest_ordinal > WELCOME_AUDIO_LIVE_INSPECTION_CAP
  ) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
  });
  let storeIdentity;
  let storeMode;
  try {
    ({ storeIdentity, mode: storeMode } = await resolveWelcomeAudioLiveClaimStoreCapability(
      private_store_capability,
    ));
  } catch {
    return blockedAttemptResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID });
  }
  if (storeMode !== required_store_mode) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
  });
  if (syntheticReplacePendingAfterTerminalPublish && storeMode
    !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY) {
    return blockedAttemptResult({
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
    });
  }
  const effectiveNow = effectiveNowForStore({ storeMode, nowMs: now_ms });
  if (!Number.isFinite(effectiveNow) || effectiveNow < 0) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
  });
  const paths = buildStorePaths({
    storeIdentity,
    missionId: mission_id,
    identityAnchorSha256: identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  let terminalPublished = false;
  let terminalPublicationAttempted = false;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    const entries = await readdir(storeIdentity.path);
    if (entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix)
      || entry.startsWith(paths.terminalTemporaryPrefix))) {
      return blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
        claimConsumed: true,
      });
    }
    if (entries.includes(basename(paths.terminal))) {
      const pendingPresentBefore = entries.includes(basename(paths.pending));
      const terminalBefore = await readStableClaimRecord({
        filePath: paths.terminal,
        storeIdentity,
      });
      validateTerminalRecord({ record: terminalBefore.snapshot, expectedMissionId: mission_id });
      if (
        terminalBefore.snapshot.contract_version !== contract_version
        || terminalBefore.snapshot.mission_contract_sha256 !== mission_contract_sha256
        || terminalBefore.snapshot.identity_anchor_sha256 !== identity_anchor_sha256
        || terminalBefore.snapshot.manifest_ordinal !== manifest_ordinal
      ) return blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
        pendingPresent: pendingPresentBefore,
        terminalPresent: true,
        claimConsumed: true,
      });
      if (pendingPresentBefore) {
        const pendingBefore = await readStableClaimRecord({
          filePath: paths.pending,
          storeIdentity,
        });
        validatePendingRecord({ record: pendingBefore.snapshot, expectedMissionId: mission_id });
        if (
          !terminalMatchesPending({
            terminal: terminalBefore.snapshot,
            pending: pendingBefore.snapshot,
          })
          || pendingBefore.snapshot.contract_version !== contract_version
          || pendingBefore.snapshot.mission_contract_sha256 !== mission_contract_sha256
          || pendingBefore.snapshot.identity_anchor_sha256 !== identity_anchor_sha256
          || pendingBefore.snapshot.manifest_ordinal !== manifest_ordinal
        ) return blockedAttemptResult({
          decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
          pendingPresent: true,
          terminalPresent: true,
          claimConsumed: true,
        });
      }
      const reconciled = await reconcileTerminalPendingCleanupOnly({
        storeIdentity,
        paths,
        missionId: mission_id,
      });
      if (pendingPresentBefore && reconciled) {
        const confirmed = reconciled.snapshot.outcome
          === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED;
        return {
          private_actuation_capability: null,
          private_host_pending_capability: null,
          private_terminal_capability: null,
          redacted_receipt: buildAttemptReceipt({
            decision: confirmed
              ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED
              : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
            uploadEntered: reconciled.snapshot.attachment_upload_entered,
            actuationCount: reconciled.snapshot.send_control_actuation_count,
          }),
        };
      }
      const evidence = await discoverIrreversibleAttemptEvidence({
        storeIdentity,
        paths,
        missionId: mission_id,
      });
      return blockedAttemptResult({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.TERMINAL_PREEXISTING,
        pendingPresent: evidence.pendingPresent,
        terminalPresent: evidence.terminalPresent,
        claimConsumed: true,
      });
    }
    if (!entries.includes(basename(paths.pending))) {
      const temporaryPresent = entries.some(
        (entry) => entry.startsWith(paths.pendingTemporaryPrefix)
          || entry.startsWith(paths.terminalTemporaryPrefix),
      );
      return blockedAttemptResult({
        decision: temporaryPresent
          ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL
          : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
        claimConsumed: temporaryPresent,
      });
    }
    const pendingLoaded = await readStableClaimRecord({
      filePath: paths.pending,
      storeIdentity,
    });
    const pending = pendingLoaded.snapshot;
    validatePendingRecord({ record: pending, expectedMissionId: mission_id });
    if (
      pending.contract_version !== contract_version
      || pending.mission_contract_sha256 !== mission_contract_sha256
      || pending.identity_anchor_sha256 !== identity_anchor_sha256
      || pending.manifest_ordinal !== manifest_ordinal
      || !processOwnerIsDefinitelyDead(pending.owner_pid)
    ) return blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
      pendingPresent: true,
      claimConsumed: true,
    });
    const terminalTime = Math.max(effectiveNow, Date.parse(pending.entered_at));
    const terminal = Object.freeze({
      record_schema_version: WELCOME_AUDIO_LIVE_TERMINAL_RECORD_SCHEMA_VERSION,
      mission_id: pending.mission_id,
      contract_version: pending.contract_version,
      mission_contract_sha256: pending.mission_contract_sha256,
      approval_packet_id: pending.approval_packet_id,
      operation_id: pending.operation_id,
      central_repo_head: pending.central_repo_head,
      canonical_operation_sha256: pending.canonical_operation_sha256,
      approval_binding_sha256: pending.approval_binding_sha256,
      identity_anchor_sha256: pending.identity_anchor_sha256,
      identity_anchor_schema_version: pending.identity_anchor_schema_version,
      thread_anchor_sha256: pending.thread_anchor_sha256,
      owner_anchor_sha256: pending.owner_anchor_sha256,
      manifest_sha256: pending.manifest_sha256,
      campaign_interval_sha256: pending.campaign_interval_sha256,
      audio_asset_sha256: pending.audio_asset_sha256,
      manifest_ordinal: pending.manifest_ordinal,
      mission_slot: pending.mission_slot,
      claim_nonce: pending.claim_nonce,
      owner_pid: pending.owner_pid,
      owner_nonce: pending.owner_nonce,
      attempt_nonce: pending.attempt_nonce,
      entered_at: pending.entered_at,
      attempted_at: new Date(terminalTime).toISOString(),
      finalized_at: new Date(terminalTime).toISOString(),
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: null,
      send_control_actuation_count: null,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      confirmation_observed_at: null,
      new_outgoing_audio_bubble_delta: 0,
      observation_window_expires_at: null,
      retry_disposition: 'terminal_no_retry',
    });
    validateTerminalRecord({ record: terminal, expectedMissionId: mission_id });
    terminalPublicationAttempted = true;
    await writeExclusiveDurable({
      filePath: paths.terminal,
      value: terminal,
      storeIdentity,
      temporaryPrefix: paths.terminalTemporaryPrefix,
    });
    terminalPublished = true;
    const published = await readStableClaimRecord({ filePath: paths.terminal, storeIdentity });
    validateTerminalRecord({ record: published.snapshot, expectedMissionId: mission_id });
    if (
      canonicalSha256(published.snapshot) !== canonicalSha256(terminal)
      || published.digest !== sha256(stableJsonBytes(terminal))
    ) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID);
    }
    if (syntheticReplacePendingAfterTerminalPublish) {
      await replacePendingAfterTerminalPublishForTest({
        storeIdentity,
        paths,
        pending,
      });
    }
    await quarantineAndDeleteExactPendingAfterTerminal({
      storeIdentity,
      paths,
      expectedPending: pendingLoaded,
      expectedTerminal: published,
      expectedMissionId: mission_id,
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
    });
    result = {
      private_actuation_capability: null,
      private_terminal_capability: null,
      redacted_receipt: buildAttemptReceipt({
        decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
        uploadEntered: null,
        actuationCount: null,
      }),
    };
  } catch (error) {
    const evidence = await discoverIrreversibleAttemptEvidence({
      storeIdentity,
      paths,
      missionId: mission_id,
    });
    result = blockedAttemptResult({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      blocker: RECEIPT_BLOCKERS.has(error?.message)
        ? error.message
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
      pendingPresent: evidence.pendingPresent,
      terminalPresent: evidence.terminalPresent,
      claimConsumed: terminalPublicationAttempted
        || terminalPublished
        || evidence.anyBoundaryEvidence,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        const evidence = await discoverIrreversibleAttemptEvidence({
          storeIdentity,
          paths,
          missionId: mission_id,
        });
        result = blockedAttemptResult({
          decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
          pendingPresent: evidence.pendingPresent,
          terminalPresent: evidence.terminalPresent,
          claimConsumed: true,
        });
      }
    }
  }
  return result;
};

const PENDING_RECOVERY_INPUT_FIELDS = Object.freeze([
  'private_store_capability',
  'required_store_mode',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'identity_anchor_sha256',
  'manifest_ordinal',
  'now_ms',
]);

const recoverWelcomeAudioLivePendingAttemptAfterOwnerExit = async (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, PENDING_RECOVERY_INPUT_FIELDS);
  if (!envelope.valid) return blockedAttemptResult({
    blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
  });
  return recoverWelcomeAudioLivePendingAttemptAfterOwnerExitInternal(envelope.values, false);
};

const recoverWelcomeAudioLivePendingAttemptAfterOwnerExitWithSyntheticPendingReplacementForTest =
  async (parameters = {}) => {
    const envelope = inspectExactDataEnvelope(parameters, [
      ...PENDING_RECOVERY_INPUT_FIELDS,
      'replace_pending_after_terminal_publish',
    ]);
    if (!envelope.valid || envelope.values.replace_pending_after_terminal_publish !== true) {
      return blockedAttemptResult({
        blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.RESERVATION_RECOVERY_INVALID,
      });
    }
    const binding = Object.fromEntries(
      PENDING_RECOVERY_INPUT_FIELDS.map((field) => [field, envelope.values[field]]),
    );
    return recoverWelcomeAudioLivePendingAttemptAfterOwnerExitInternal(binding, true);
  };

const buildObservationReceipt = ({
  decision,
  threadObservationCount = 0,
  missionObservationCount = 0,
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_SCHEMA_VERSION,
  claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
  redaction_status: 'aggregate_only_no_paths_identities_anchors_digests_times_or_private_values',
  execution_mode: WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE,
  decision,
  thread_observation_count: threadObservationCount,
  thread_observation_cap: WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP,
  mission_observation_count: missionObservationCount,
  mission_observation_cap: WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP,
  private_capability_issued: decision === WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
  source_read_allowed: false,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...new Set(blockerCodes)]),
});

const blockedObservationResult = ({
  blocker,
  threadObservationCount = 0,
  missionObservationCount = 0,
}) => Object.freeze({
  private_observation_capability: null,
  redacted_receipt: buildObservationReceipt({
    decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED,
    threadObservationCount,
    missionObservationCount,
    blockerCodes: [blocker],
  }),
});

const inspectObservationClaims = async ({ storeIdentity, missionId }) => {
  const paths = buildStorePaths({
    storeIdentity,
    missionId,
    identityAnchorSha256: '0'.repeat(64),
  });
  let entries = await readdir(storeIdentity.path);
  const temporaryNames = entries.filter(
    (entry) => entry.startsWith(paths.observationTemporaryPrefix),
  );
  if (temporaryNames.length > 0) {
    if (temporaryNames.length !== 1) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
    const temporaryName = temporaryNames[0];
    if (!new RegExp(
      `^\\.observation-${paths.mission}-[0-9]+-[a-f0-9]{32}\\.json$`,
      'u',
    ).test(temporaryName)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
    let temporary;
    try {
      temporary = await readStableClaimRecord({
        filePath: join(storeIdentity.path, temporaryName),
        storeIdentity,
        expectedNlink: 2,
      });
      validateObservationRecord({ record: temporary.snapshot, expectedMissionId: missionId });
    } catch {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
    const finalPath = paths.observation({
      threadAnchorSha256: temporary.snapshot.thread_anchor_sha256,
      threadOrdinal: temporary.snapshot.thread_observation_ordinal,
    });
    if (
      !entries.includes(basename(finalPath))
      || await reconcileLinkedPublicationTemporary({
        storeIdentity,
        finalPath,
        temporaryPath: join(storeIdentity.path, temporaryName),
        temporaryPrefix: paths.observationTemporaryPrefix,
        validator: validateObservationRecord,
        expectedMissionId: missionId,
      }) !== true
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    entries = await readdir(storeIdentity.path);
    if (entries.some((entry) => entry.startsWith(paths.observationTemporaryPrefix))) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
  }
  const names = entries.filter((entry) => entry.startsWith(paths.observationPrefix));
  const records = [];
  const missionOrdinals = new Set();
  const threadOrdinals = new Map();
  for (const name of names) {
    if (!/^observation-[a-f0-9]{64}-[a-f0-9]{64}-[0-9]{2}\.json$/.test(name)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
    const loaded = await readStableClaimRecord({
      filePath: join(storeIdentity.path, name),
      storeIdentity,
    });
    validateObservationRecord({ record: loaded.snapshot, expectedMissionId: missionId });
    const recordPaths = buildStorePaths({
      storeIdentity,
      missionId,
      identityAnchorSha256: loaded.snapshot.identity_anchor_sha256,
    });
    const [claimLoaded, terminalLoaded] = await Promise.all([
      readStableClaimRecord({ filePath: recordPaths.claim, storeIdentity }),
      readStableClaimRecord({ filePath: recordPaths.terminal, storeIdentity }),
    ]);
    validateClaimRecord({ record: claimLoaded.snapshot, expectedMissionId: missionId });
    validateTerminalRecord({ record: terminalLoaded.snapshot, expectedMissionId: missionId });
    if (
      terminalLoaded.snapshot.outcome !== WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED
      || !terminalMatchesClaim({ terminal: terminalLoaded.snapshot, claim: claimLoaded.snapshot })
      || terminalLoaded.digest !== loaded.snapshot.confirmed_terminal_sha256
      || terminalLoaded.snapshot.contract_version !== loaded.snapshot.contract_version
      || terminalLoaded.snapshot.mission_contract_sha256
        !== loaded.snapshot.mission_contract_sha256
      || terminalLoaded.snapshot.operation_id !== loaded.snapshot.operation_id
      || terminalLoaded.snapshot.identity_anchor_sha256
        !== loaded.snapshot.identity_anchor_sha256
      || terminalLoaded.snapshot.thread_anchor_sha256 !== loaded.snapshot.thread_anchor_sha256
      || terminalLoaded.snapshot.attempt_nonce !== loaded.snapshot.attempt_nonce
      || terminalLoaded.snapshot.manifest_ordinal !== loaded.snapshot.manifest_ordinal
      || terminalLoaded.snapshot.mission_slot !== loaded.snapshot.mission_slot
      || terminalLoaded.snapshot.finalized_at !== loaded.snapshot.confirmed_terminal_finalized_at
      || terminalLoaded.snapshot.observation_window_expires_at
        !== loaded.snapshot.window_expires_at
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    const expectedName = basename(paths.observation({
      threadAnchorSha256: loaded.snapshot.thread_anchor_sha256,
      threadOrdinal: loaded.snapshot.thread_observation_ordinal,
    }));
    const threadKey = loaded.snapshot.thread_anchor_sha256;
    const seenForThread = threadOrdinals.get(threadKey) ?? new Set();
    if (
      name !== expectedName
      || missionOrdinals.has(loaded.snapshot.mission_observation_ordinal)
      || seenForThread.has(loaded.snapshot.thread_observation_ordinal)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    missionOrdinals.add(loaded.snapshot.mission_observation_ordinal);
    seenForThread.add(loaded.snapshot.thread_observation_ordinal);
    threadOrdinals.set(threadKey, seenForThread);
    records.push(loaded);
  }
  records.sort(
    (left, right) => left.snapshot.mission_observation_ordinal
      - right.snapshot.mission_observation_ordinal,
  );
  if (
    records.length > WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP
    || records.some((loaded, index) => loaded.snapshot.mission_observation_ordinal !== index + 1)
    || [...threadOrdinals.values()].some((ordinals) => (
      ordinals.size > WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP
      || [...ordinals].sort((a, b) => a - b).some((ordinal, index) => ordinal !== index + 1)
    ))
  ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
  return Object.freeze({ records: Object.freeze(records), threadOrdinals });
};

const OBSERVATION_CLAIM_INPUT_FIELDS = Object.freeze([
  'private_store_capability',
  'required_store_mode',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'operation_id',
  'identity_anchor_sha256',
  'thread_anchor_sha256',
  'attempt_nonce',
  'now_ms',
]);

const claimWelcomeAudioLiveReplyObservationInternal = async (parameters, crashAfterPublish) => {
  const envelope = inspectExactDataEnvelope(parameters, OBSERVATION_CLAIM_INPUT_FIELDS);
  const {
    private_store_capability,
    required_store_mode,
    mission_id,
    contract_version,
    mission_contract_sha256,
    operation_id,
    identity_anchor_sha256,
    thread_anchor_sha256,
    attempt_nonce,
    now_ms,
  } = envelope.values;
  if (
    !envelope.valid
    || !Object.values(WELCOME_AUDIO_LIVE_STORE_MODE).includes(required_store_mode)
    || !isOpaqueId(mission_id)
    || !isOpaqueId(contract_version)
    || !isSha256(mission_contract_sha256)
    || !isOpaqueId(operation_id)
    || !isSha256(identity_anchor_sha256)
    || !isSha256(thread_anchor_sha256)
    || !/^[a-f0-9]{64}$/.test(attempt_nonce)
  ) return blockedObservationResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID });
  let storeIdentity;
  let storeMode;
  try {
    ({ storeIdentity, mode: storeMode } = await resolveWelcomeAudioLiveClaimStoreCapability(
      private_store_capability,
    ));
  } catch {
    return blockedObservationResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.STORE_INVALID });
  }
  if (storeMode !== required_store_mode || (crashAfterPublish && storeMode
    !== WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY)) {
    return blockedObservationResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID });
  }
  const effectiveNow = effectiveNowForStore({ storeMode, nowMs: now_ms });
  if (!Number.isFinite(effectiveNow) || effectiveNow < 0) {
    return blockedObservationResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID });
  }
  const paths = buildStorePaths({
    storeIdentity,
    missionId: mission_id,
    identityAnchorSha256: identity_anchor_sha256,
  });
  let mutexIdentity = null;
  let result = null;
  try {
    mutexIdentity = await acquireMissionMutex({ storeIdentity, paths });
    if (!mutexIdentity) return blockedObservationResult({
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION,
    });
    const observations = await inspectObservationClaims({ storeIdentity, missionId: mission_id });
    const threadCount = observations.threadOrdinals.get(thread_anchor_sha256)?.size ?? 0;
    const missionCount = observations.records.length;
    if (
      threadCount >= WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP
      || missionCount >= WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP
    ) return blockedObservationResult({
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_CAP_REACHED,
      threadObservationCount: threadCount,
      missionObservationCount: missionCount,
    });
    const entries = await readdir(storeIdentity.path);
    if (
      entries.includes(basename(paths.pending))
      || entries.some((entry) => entry.startsWith(paths.pendingTemporaryPrefix)
        || entry.startsWith(paths.terminalTemporaryPrefix))
      || !entries.includes(basename(paths.terminal))
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    const terminalLoaded = await readStableClaimRecord({
      filePath: paths.terminal,
      storeIdentity,
    });
    const claimLoaded = await readStableClaimRecord({
      filePath: paths.claim,
      storeIdentity,
    });
    const terminal = terminalLoaded.snapshot;
    validateClaimRecord({ record: claimLoaded.snapshot, expectedMissionId: mission_id });
    validateTerminalRecord({ record: terminal, expectedMissionId: mission_id });
    if (
      terminal.outcome !== WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED
      || !terminalMatchesClaim({ terminal, claim: claimLoaded.snapshot })
      || terminal.contract_version !== contract_version
      || terminal.mission_contract_sha256 !== mission_contract_sha256
      || terminal.operation_id !== operation_id
      || terminal.identity_anchor_sha256 !== identity_anchor_sha256
      || terminal.thread_anchor_sha256 !== thread_anchor_sha256
      || terminal.attempt_nonce !== attempt_nonce
      || effectiveNow < Date.parse(terminal.finalized_at)
      || effectiveNow >= Date.parse(terminal.observation_window_expires_at)
    ) throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    const observation = Object.freeze({
      record_schema_version: WELCOME_AUDIO_LIVE_OBSERVATION_RECORD_SCHEMA_VERSION,
      claim_issuer_contract_version: WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
      mission_id,
      contract_version,
      mission_contract_sha256,
      operation_id,
      identity_anchor_schema_version: terminal.identity_anchor_schema_version,
      identity_anchor_sha256,
      thread_anchor_sha256,
      attempt_nonce,
      manifest_ordinal: terminal.manifest_ordinal,
      mission_slot: terminal.mission_slot,
      thread_observation_ordinal: threadCount + 1,
      mission_observation_ordinal: missionCount + 1,
      confirmed_terminal_sha256: terminalLoaded.digest,
      confirmed_terminal_finalized_at: terminal.finalized_at,
      window_expires_at: terminal.observation_window_expires_at,
      claimed_at: new Date(effectiveNow).toISOString(),
      claim_status: 'permanent_append_only_claim_before_reply_thread_read',
      claim_nonce: randomBytes(32).toString('hex'),
    });
    validateObservationRecord({ record: observation, expectedMissionId: mission_id });
    const observationPath = paths.observation({
      threadAnchorSha256: thread_anchor_sha256,
      threadOrdinal: observation.thread_observation_ordinal,
    });
    await writeExclusiveDurable({
      filePath: observationPath,
      value: observation,
      storeIdentity,
      temporaryPrefix: paths.observationTemporaryPrefix,
    });
    const published = await readStableClaimRecord({ filePath: observationPath, storeIdentity });
    validateObservationRecord({ record: published.snapshot, expectedMissionId: mission_id });
    if (canonicalSha256(published.snapshot) !== canonicalSha256(observation)) {
      throw new Error(WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID);
    }
    if (crashAfterPublish) return blockedObservationResult({
      blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID,
      threadObservationCount: threadCount + 1,
      missionObservationCount: missionCount + 1,
    });
    const capability = createOneUseCapability(
      OBSERVATION_CAPABILITY_STATE,
      {
        store_identity: storeIdentity,
        store_mode: storeMode,
        observation_path: observationPath,
        observation_digest: published.digest,
        observation_metadata: published.metadata,
        observation,
      },
      'crm_core_welcome_audio_private_reply_observation_capability',
    );
    result = Object.freeze({
      private_observation_capability: capability,
      redacted_receipt: buildObservationReceipt({
        decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
        threadObservationCount: threadCount + 1,
        missionObservationCount: missionCount + 1,
      }),
    });
  } catch (error) {
    result = blockedObservationResult({
      blocker: RECEIPT_BLOCKERS.has(error?.message)
        ? error.message
        : WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID,
    });
  } finally {
    if (mutexIdentity) {
      try {
        await releaseMissionMutex({ storeIdentity, paths, mutexIdentity });
      } catch {
        result = blockedObservationResult({
          blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID,
        });
      }
    }
  }
  return result;
};

const claimWelcomeAudioLiveReplyObservation = async (parameters) => (
  claimWelcomeAudioLiveReplyObservationInternal(parameters, false)
);

const claimWelcomeAudioLiveReplyObservationForTest = async (parameters) => {
  const envelope = inspectExactDataEnvelope(parameters, [
    ...OBSERVATION_CLAIM_INPUT_FIELDS,
    'crash_after_publish',
  ]);
  if (!envelope.valid || envelope.values.crash_after_publish !== true) {
    return blockedObservationResult({ blocker: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID });
  }
  const binding = Object.fromEntries(
    OBSERVATION_CLAIM_INPUT_FIELDS.map((field) => [field, envelope.values[field]]),
  );
  return claimWelcomeAudioLiveReplyObservationInternal(binding, true);
};

const OBSERVATION_CONSUME_INPUT_FIELDS = Object.freeze([
  'private_observation_capability',
  'required_store_mode',
  'expected_mission_id',
  'expected_operation_id',
  'expected_identity_anchor_sha256',
  'expected_thread_anchor_sha256',
  'expected_attempt_nonce',
  'expected_mission_slot',
  'now_ms',
]);

const consumeWelcomeAudioLiveReplyObservationCapabilityOnce = async (parameters = {}) => {
  const envelope = inspectExactDataEnvelope(parameters, OBSERVATION_CONSUME_INPUT_FIELDS);
  const input = envelope.values;
  const state = OBSERVATION_CAPABILITY_STATE.get(input.private_observation_capability);
  if (!state || state.consumed) return WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID;
  state.consumed = true;
  try {
    const live = state.store_mode === WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY;
    const synthetic = state.store_mode
      === WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY;
    const effectiveNow = live ? Date.now() : input.now_ms;
    const claimedAt = Date.parse(state.observation.claimed_at);
    const windowExpiresAt = Date.parse(state.observation.window_expires_at);
    if (
      !envelope.valid
      || state.store_mode !== input.required_store_mode
      || state.observation.mission_id !== input.expected_mission_id
      || state.observation.operation_id !== input.expected_operation_id
      || state.observation.identity_anchor_sha256 !== input.expected_identity_anchor_sha256
      || state.observation.thread_anchor_sha256 !== input.expected_thread_anchor_sha256
      || state.observation.attempt_nonce !== input.expected_attempt_nonce
      || state.observation.mission_slot !== input.expected_mission_slot
      || !((live && input.now_ms === null) || (synthetic && Number.isFinite(input.now_ms)))
      || !Number.isFinite(effectiveNow)
      || effectiveNow < claimedAt
      || effectiveNow - claimedAt >= WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
      || effectiveNow >= windowExpiresAt
    ) return WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID;
    await assertWelcomeAudioLiveClaimStoreRoot({
      store_root: state.store_identity.path,
      expected_identity: state.store_identity,
    });
    const loaded = await readStableClaimRecord({
      filePath: state.observation_path,
      storeIdentity: state.store_identity,
    });
    validateObservationRecord({
      record: loaded.snapshot,
      expectedMissionId: input.expected_mission_id,
    });
    const terminalPaths = buildStorePaths({
      storeIdentity: state.store_identity,
      missionId: input.expected_mission_id,
      identityAnchorSha256: input.expected_identity_anchor_sha256,
    });
    const terminal = await readStableClaimRecord({
      filePath: terminalPaths.terminal,
      storeIdentity: state.store_identity,
    });
    validateTerminalRecord({
      record: terminal.snapshot,
      expectedMissionId: input.expected_mission_id,
    });
    return loaded.digest === state.observation_digest
      && sameMetadata(loaded.metadata, state.observation_metadata)
      && canonicalSha256(loaded.snapshot) === canonicalSha256(state.observation)
      && terminal.digest === state.observation.confirmed_terminal_sha256
      && terminal.snapshot.outcome === WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.CONFIRMED
      ? WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.VALID
      : WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID;
  } catch {
    return WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID;
  }
};

const validateWelcomeAudioLiveObservationReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID };
  }
  const claimed = receipt.decision === WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED;
  const valid = receipt.receipt_schema_version
      === WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_SCHEMA_VERSION
    && receipt.claim_issuer_contract_version === WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    && receipt.redaction_status
      === 'aggregate_only_no_paths_identities_anchors_digests_times_or_private_values'
    && receipt.execution_mode === WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE
    && Object.values(WELCOME_AUDIO_LIVE_OBSERVATION_DECISION).includes(receipt.decision)
    && Number.isInteger(receipt.thread_observation_count)
    && receipt.thread_observation_count >= 0
    && receipt.thread_observation_count <= WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP
    && receipt.thread_observation_cap === WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP
    && Number.isInteger(receipt.mission_observation_count)
    && receipt.mission_observation_count >= 0
    && receipt.mission_observation_count <= WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP
    && receipt.mission_observation_cap === WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP
    && receipt.private_capability_issued === claimed
    && receipt.source_read_allowed === false
    && receipt.send_allowed === false
    && receipt.external_effect_invoked === false
    && Array.isArray(receipt.blocker_codes)
    && receipt.blocker_codes.every((code) => RECEIPT_BLOCKERS.has(code))
    && receipt.blocker_codes.length === (claimed ? 0 : 1);
  return valid
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.OBSERVATION_INVALID };
};

const validateWelcomeAudioLiveClaimReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  }
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_SCHEMA_VERSION
    || receipt.claim_issuer_contract_version !== WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_paths_identities_digests_or_private_values'
    || receipt.execution_mode !== WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE
    || !RECEIPT_DECISIONS.has(receipt.decision)
    || receipt.mission_claim_cap !== WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    || !(receipt.mission_claim_count === null || (
      Number.isInteger(receipt.mission_claim_count)
      && receipt.mission_claim_count >= 0
      && receipt.mission_claim_count <= WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP
    ))
    || receipt.send_allowed !== false
    || receipt.external_effect_invoked !== false
    || receipt.browser_used !== false
    || receipt.network_used !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length
  ) return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  const expected = buildReceipt({
    decision: receipt.decision,
    missionClaimCount: receipt.mission_claim_count,
    blockerCodes: receipt.blocker_codes,
  });
  const exact = WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_FIELDS.every(
    (field) => JSON.stringify(receipt[field]) === JSON.stringify(expected[field]),
  );
  const expectedBlocker = [
    WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED,
    WELCOME_AUDIO_LIVE_CLAIM_DECISION.CANCELLED,
  ].includes(receipt.decision)
    ? null
    : {
      [WELCOME_AUDIO_LIVE_CLAIM_DECISION.DUPLICATE]: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.DUPLICATE_IDENTITY,
      [WELCOME_AUDIO_LIVE_CLAIM_DECISION.CAP_REACHED]: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_CAP_REACHED,
    }[receipt.decision] ?? receipt.blocker_codes[0];
  return exact
    && receipt.blocker_codes.length === (expectedBlocker === null ? 0 : 1)
    && (expectedBlocker === null || receipt.blocker_codes[0] === expectedBlocker)
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
};

const validateWelcomeAudioLiveStateReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_STATE_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  }
  const capabilityExpected = receipt.decision
    === WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_CLAIMED;
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_LIVE_STATE_RECEIPT_SCHEMA_VERSION
    || receipt.claim_issuer_contract_version !== WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_paths_identities_digests_threads_or_private_values'
    || receipt.execution_mode !== WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE
    || !STATE_DECISIONS.has(receipt.decision)
    || !Number.isInteger(receipt.inspection_cursor_count)
    || receipt.inspection_cursor_count < 0
    || receipt.inspection_cursor_count > WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || receipt.inspection_cap !== WELCOME_AUDIO_LIVE_INSPECTION_CAP
    || typeof receipt.manifest_order_enforced !== 'boolean'
    || receipt.private_capability_issued !== capabilityExpected
    || receipt.source_read_allowed !== false
    || receipt.send_allowed !== false
    || receipt.external_effect_invoked !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length
    || receipt.blocker_codes.length !== ([
      WELCOME_AUDIO_LIVE_STATE_DECISION.BLOCKED,
      WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
    ].includes(receipt.decision) ? 1 : 0)
  ) return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  return { ok: true, reason: null };
};

const validateWelcomeAudioLiveAttemptReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  }
  const finalized = [
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED,
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
  ].includes(receipt.decision);
  const finalizedConfirmed = receipt.decision
    === WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED;
  const blocked = [
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
    WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
  ].includes(receipt.decision);
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_SCHEMA_VERSION
    || receipt.claim_issuer_contract_version !== WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_paths_identities_digests_or_private_values'
    || receipt.execution_mode !== WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE
    || !ATTEMPT_DECISIONS.has(receipt.decision)
    || typeof receipt.pending_record_present !== 'boolean'
    || typeof receipt.terminal_record_present !== 'boolean'
    || ![true, false, null].includes(receipt.attachment_upload_entered)
    || ![0, 1, null].includes(receipt.send_control_actuation_count)
    || !attemptEvidenceIsCoherent({
      uploadEntered: receipt.attachment_upload_entered,
      actuationCount: receipt.send_control_actuation_count,
    })
    || typeof receipt.private_actuation_capability_issued !== 'boolean'
    || typeof receipt.claim_capability_consumed !== 'boolean'
    || typeof receipt.zero_effect_reservation_cancelled !== 'boolean'
    || receipt.send_allowed !== false
    || receipt.external_effect_invoked !== false
    || receipt.browser_used !== false
    || receipt.network_used !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length
    || receipt.blocker_codes.length !== (blocked ? 1 : 0)
    || (finalized && receipt.terminal_record_present !== true)
    || (finalizedConfirmed && (
      receipt.attachment_upload_entered !== true
      || receipt.send_control_actuation_count !== 1
    ))
    || (receipt.zero_effect_reservation_cancelled && (
      receipt.decision !== WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED
      || receipt.pending_record_present !== false
      || receipt.terminal_record_present !== false
      || receipt.attachment_upload_entered !== false
      || receipt.send_control_actuation_count !== 0
      || receipt.claim_capability_consumed !== true
      || receipt.blocker_codes.length !== 1
      || receipt.blocker_codes[0] !== WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID
    ))
  ) return { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
  const expected = buildAttemptReceipt({
    decision: receipt.decision,
    uploadEntered: receipt.attachment_upload_entered,
    actuationCount: receipt.send_control_actuation_count,
    pendingPresent: receipt.pending_record_present,
    terminalPresent: receipt.terminal_record_present,
    claimConsumed: receipt.claim_capability_consumed,
    zeroEffectReservationCancelled: receipt.zero_effect_reservation_cancelled,
    blockerCodes: receipt.blocker_codes,
  });
  return WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_FIELDS.every(
    (field) => JSON.stringify(receipt[field]) === JSON.stringify(expected[field]),
  )
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID };
};

const finalizeWelcomeAudioSyntheticAttemptAsUnknownForTest =
  finalizeWelcomeAudioLiveAttemptAsUnknown;

export {
  WELCOME_AUDIO_LIVE_ATTEMPT_DECISION,
  WELCOME_AUDIO_LIVE_ATTEMPT_BOUNDARY_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME,
  WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_ATTEMPT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_CANCELLATION_CLEANUP_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_LIVE_CLAIM_BLOCKER,
  WELCOME_AUDIO_LIVE_CLAIM_DECISION,
  WELCOME_AUDIO_LIVE_CLAIM_EXECUTION_MODE,
  WELCOME_AUDIO_LIVE_CLAIM_ISSUER_CONTRACT_VERSION,
  WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_CLAIM_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_CLAIM_RECORD_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_INSPECTION_CAP,
  WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION,
  WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP,
  WELCOME_AUDIO_LIVE_MUTEX_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_OBSERVATION_DECISION,
  WELCOME_AUDIO_LIVE_OBSERVATION_MISSION_CAP,
  WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_OBSERVATION_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_OBSERVATION_THREAD_CAP,
  WELCOME_AUDIO_LIVE_OBSERVATION_WINDOW_MS,
  WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_STATE_DECISION,
  WELCOME_AUDIO_LIVE_STATE_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_STORE_MODE,
  WELCOME_AUDIO_LIVE_TERMINAL_RECORD_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST,
  claimWelcomeAudioLiveReplyObservation,
  claimWelcomeAudioLiveReplyObservationForTest,
  claimNextWelcomeAudioLiveManifestInspection,
  configureWelcomeAudioLiveTerminalVerifierScenarioForTest,
  configureWelcomeAudioLiveAttemptBoundaryScenarioForTest,
  configureWelcomeAudioLiveCancellationCleanupScenarioForTest,
  configureWelcomeAudioLiveMutexScenarioForTest,
  createSyntheticWelcomeAudioLiveClaimStoreCapability,
  cancelWelcomeAudioLiveReservationZeroEffect,
  consumeWelcomeAudioLiveHostPendingCapabilityOnce,
  consumeWelcomeAudioLiveReplyObservationCapabilityOnce,
  enterWelcomeAudioLiveAttemptBoundary,
  finalizeWelcomeAudioLiveAttempt,
  finalizeWelcomeAudioSyntheticAttemptAsUnknownForTest,
  issueWelcomeAudioLiveClaim,
  openFixedWelcomeAudioLiveClaimStore,
  recoverWelcomeAudioLivePendingAttemptAfterOwnerExit,
  recoverWelcomeAudioLivePendingAttemptAfterOwnerExitWithSyntheticPendingReplacementForTest,
  recordWelcomeAudioLiveInspectionResult,
  validateWelcomeAudioLiveClaimReceipt,
  validateWelcomeAudioLiveAttemptReceipt,
  validateWelcomeAudioLiveObservationReceipt,
  validateWelcomeAudioLiveStateReceipt,
  verifySyntheticWelcomeAudioLiveClaimStoreRootBindingForTest,
};
