import { randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
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
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  adaptWelcomeAudioUiAttestedFollowerSource,
  validateWelcomeAudioUiAttestedFollowerSourceProjection,
  validateWelcomeAudioUiAttestedFollowerSourceReceipt,
} from './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs';
import {
  consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce,
  inspectWelcomeAudioNativeNotificationProfileBindingCapability,
} from './crm-vnext-instagram-welcome-audio-native-notification-profile-binder.mjs';
import {
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_COMPLETE_SOURCE_PAYLOAD_FIELDS_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_CONTRACT_VERSION_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_MISSION_ID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_SELECTION_POLICY,
  consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce,
  consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest,
  consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnce,
  consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest,
} from './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_materializer_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_receipt_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FILE_NAME_V3 =
  'iab-semantic-follower-source-v3.json';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3 = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-iab-semantic-follower-source-artifact-v3',
);
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_PARENT_V3 = dirname(
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3,
);
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3 =
  'crm-core-welcome-audio-iab-semantic-source-artifact-v3-test-';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_iab_semantic_follower_source_host_v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND =
  'codex_in_app_browser_semantic_read_only_v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MISSION_ID =
  'crm_core_iab_semantic_source_to_safari_handoff_proof_v1_20260719';
const V3_TEMPORARY_FILE_PATTERN = /^\.iab-semantic-source-[1-9][0-9]*-[a-f0-9]{32}\.tmp$/u;

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3 = Object.freeze({
  FIXED_OWNER_ONLY: 'fixed_owner_only_v3',
  SYNTHETIC_TEMP_TEST_ONLY: 'synthetic_temp_test_only_v3',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3 = Object.freeze({
  PUBLISHED: 'published_owner_only_iab_semantic_source_artifact_v3',
  REUSED: 'reused_exact_owner_only_iab_semantic_source_artifact_v3',
  OPENED: 'opened_exact_owner_only_iab_semantic_source_artifact_v3',
  BLOCKED: 'blocked_owner_only_iab_semantic_source_artifact_v3',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3 = Object.freeze({
  MATERIALIZE: 'materialize',
  OPEN: 'open',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3 = Object.freeze({
  INPUT_INVALID: 'blocked_iab_source_artifact_v3_input_invalid',
  COMPLETE_SOURCE_CAPABILITY_INVALID:
    'blocked_iab_source_artifact_v3_complete_source_capability_invalid_or_replayed',
  COMPLETE_SOURCE_INVALID: 'blocked_iab_source_artifact_v3_complete_source_invalid',
  ARTIFACT_INVALID: 'blocked_iab_source_artifact_v3_contract_invalid',
  ARTIFACT_CAPABILITY_INVALID:
    'blocked_iab_source_artifact_v3_capability_invalid_stale_or_replayed',
  ROOT_INVALID: 'blocked_iab_source_artifact_v3_root_invalid',
  TARGET_CONFLICT: 'blocked_iab_source_artifact_v3_target_conflict',
  PUBLICATION_FAILED: 'blocked_iab_source_artifact_v3_publication_failed',
});

const IAB_COMPLETE_SOURCE_FIELDS = Object.freeze([
  'source_contract_version',
  'source_backend',
  'source_mission_id',
  'source_observed_at',
  'source_expires_at',
  'source_row_ordinal',
  'exact_target_utf8',
  'exact_notification_reference',
  'exact_profile_reference',
  'exact_thread_reference',
  'exact_owner_account_reference',
  'visible_time_bucket_utf8',
  'notification_profile_binding',
  'profile_thread_binding',
  'owner_account_binding',
  'relationship_binding',
  'preopen_unread_inbound',
  'seen_transition',
  'prior_welcome_audio',
  'prior_welcome_attempt',
  'dedupe_status',
  'composer_status',
  'attachment_control_status',
  'challenge_or_error_status',
  'isolated_tab_finalized',
]);

const IAB_SOURCE_ARTIFACT_FIELDS_V3 = Object.freeze([
  'schema_version',
  'materializer_contract_version',
  'status',
  'source_expires_at',
  'complete_source',
  'ui_attested_input',
  'source_evidence_sha256',
]);

const IAB_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3 = Object.freeze([
  'receipt_schema_version',
  'materializer_contract_version',
  'redaction_status',
  'decision',
  'operation',
  'complete_source_capability_consumed',
  'complete_source_validated',
  'source_expiry_inherited',
  'owner_only_root_verified',
  'artifact_published',
  'existing_artifact_reused',
  'artifact_opened',
  'artifact_stability_verified',
  'private_artifact_capability_issued',
  'artifact_count',
  'artifact_cap',
  'live_authority',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'browser_used',
  'network_used',
  'external_effect_invoked',
  'blocker_codes',
]);

const IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3 = new WeakMap();
const IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST = new WeakMap();
const IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4 = new WeakMap();
const IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST = new WeakMap();

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_follower_source_artifact_materializer_v4';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_follower_source_artifact_v4';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V4 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_follower_source_artifact_receipt_v4';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FILE_NAME_V4 =
  'iab-semantic-historical-follower-source-v4.json';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_ROOT_V4 = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-iab-semantic-historical-follower-source-artifact-v4',
);
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_PARENT_V4 = dirname(
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_ROOT_V4,
);
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V4 =
  'crm-core-welcome-audio-iab-semantic-historical-source-artifact-v4-test-';
const V4_TEMPORARY_FILE_PATTERN =
  /^\.iab-semantic-historical-source-[1-9][0-9]*-[a-f0-9]{32}\.tmp$/u;

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4 = Object.freeze({
  FIXED_OWNER_ONLY: 'fixed_owner_only_historical_v4',
  SYNTHETIC_TEMP_TEST_ONLY: 'synthetic_temp_test_only_historical_v4',
});

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4 = Object.freeze({
  PUBLISHED: 'published_owner_only_iab_semantic_historical_source_artifact_v4',
  REUSED: 'reused_exact_owner_only_iab_semantic_historical_source_artifact_v4',
  BLOCKED: 'blocked_owner_only_iab_semantic_historical_source_artifact_v4',
});

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_OPERATION_V4 =
  Object.freeze({
    MATERIALIZE: 'materialize',
  });

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4 = Object.freeze({
  INPUT_INVALID: 'blocked_iab_historical_source_artifact_v4_input_invalid',
  COMPLETE_SOURCE_CAPABILITY_INVALID:
    'blocked_iab_historical_source_artifact_v4_complete_source_capability_invalid_or_replayed',
  COMPLETE_SOURCE_INVALID:
    'blocked_iab_historical_source_artifact_v4_complete_source_invalid',
  ARTIFACT_INVALID: 'blocked_iab_historical_source_artifact_v4_contract_invalid',
  ARTIFACT_CAPABILITY_INVALID:
    'blocked_iab_historical_source_artifact_v4_capability_invalid_stale_or_replayed',
  ROOT_INVALID: 'blocked_iab_historical_source_artifact_v4_root_invalid',
  TARGET_CONFLICT: 'blocked_iab_historical_source_artifact_v4_target_conflict',
  PUBLICATION_FAILED: 'blocked_iab_historical_source_artifact_v4_publication_failed',
});

const IAB_HISTORICAL_SOURCE_ARTIFACT_FIELDS_V4 = Object.freeze([
  'schema_version',
  'materializer_contract_version',
  'status',
  'source_expires_at',
  'selection_policy',
  'age_evidence_raw',
  'age_evidence_kind',
  'age_bucket',
  'actual_elapsed_age_claimed',
  'complete_source',
  'ui_attested_input',
  'source_evidence_sha256',
]);

const IAB_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_FIELDS_V4 = Object.freeze([
  ...IAB_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3,
]);

const opaqueIabSemanticHistoricalSourceArtifactCapabilityV4 = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_iab_semantic_historical_source_artifact_capability_v4')]: {
      value: true,
      enumerable: false,
    },
    toJSON: {
      value: () => {
        throw new TypeError('historical_source_artifact_capability_not_serializable');
      },
      enumerable: false,
    },
    clone_guard: {
      value: Symbol('opaque_historical_source_artifact_capability_v4'),
      enumerable: true,
    },
  });
  return Object.freeze(capability);
};

const IAB_SOURCE_ARTIFACT_IO_CONFIG_V3 = Object.freeze({
  blockers: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3,
  fixedMode: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3.FIXED_OWNER_ONLY,
  syntheticMode:
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3.SYNTHETIC_TEMP_TEST_ONLY,
  fixedRoot: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3,
  fixedParent: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_PARENT_V3,
  syntheticPrefix: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3,
  fileName: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FILE_NAME_V3,
  temporaryPattern: V3_TEMPORARY_FILE_PATTERN,
  temporaryPrefix: '.iab-semantic-source-',
});

const IAB_SOURCE_ARTIFACT_IO_CONFIG_V4 = Object.freeze({
  blockers: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4,
  fixedMode:
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4.FIXED_OWNER_ONLY,
  syntheticMode:
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4
      .SYNTHETIC_TEMP_TEST_ONLY,
  fixedRoot: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_ROOT_V4,
  fixedParent: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_PARENT_V4,
  syntheticPrefix:
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V4,
  fileName: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FILE_NAME_V4,
  temporaryPattern: V4_TEMPORARY_FILE_PATTERN,
  temporaryPrefix: '.iab-semantic-historical-source-',
});

const opaqueIabSemanticSourceArtifactCapabilityV3 = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_iab_semantic_source_artifact_capability_v3')]: {
      value: true,
      enumerable: false,
    },
    toJSON: {
      value: () => {
        throw new TypeError('source_artifact_capability_not_serializable');
      },
      enumerable: false,
    },
    clone_guard: {
      value: Symbol('opaque_source_artifact_capability_v3'),
      enumerable: true,
    },
  });
  return Object.freeze(capability);
};

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_materializer_v2';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_private_observation_v2';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_v2';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_receipt_v2';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME =
  'ui-attested-follower-source-v2.json';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-ui-attested-follower-source-artifact-v2',
);
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_PARENT = dirname(
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT,
);
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX =
  'crm-core-welcome-audio-ui-attested-source-artifact-v2-test-';
const MAX_ARTIFACT_BYTES = 256 * 1024;
const CONCURRENT_WINNER_SETTLE_ATTEMPTS = 50;
const CONCURRENT_WINNER_SETTLE_INTERVAL_MS = 10;
const MAX_CONCURRENT_MODULE_TEMPORARIES = 8;
const MODULE_TEMPORARY_FILE_PATTERN = /^\.ui-attested-source-[1-9][0-9]*-[a-f0-9]{32}\.tmp$/;

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE = Object.freeze({
  FIXED_OWNER_ONLY: 'fixed_owner_only',
  SYNTHETIC_TEMP_TEST_ONLY: 'synthetic_temp_test_only',
});

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE = Object.freeze({
  CURRENT_VISIBLE_FOLLOWS_OWNER: 'current_visible_follows_owner',
  RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION_3_TO_7_DAY_BUCKET:
    'recent_follow_event_no_explicit_contradiction_3_to_7_day_bucket',
});

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION = Object.freeze({
  PUBLISHED: 'published_owner_only_source_artifact',
  REUSED: 'reused_exact_owner_only_source_artifact',
  BLOCKED: 'blocked_owner_only_source_artifact',
});

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_source_artifact_input_invalid',
  OBSERVATION_INVALID: 'blocked_source_artifact_observation_invalid',
  BINDING_CAPABILITY_INVALID: 'blocked_source_artifact_binding_capability_invalid_or_replayed',
  ADAPTER_BLOCKED: 'blocked_source_artifact_adapter_blocked',
  ARTIFACT_INVALID: 'blocked_source_artifact_contract_invalid',
  ROOT_INVALID: 'blocked_source_artifact_root_invalid',
  TARGET_CONFLICT: 'blocked_source_artifact_target_conflict',
  PUBLICATION_FAILED: 'blocked_source_artifact_publication_failed',
});

const OBSERVATION_FIELDS = Object.freeze([
  'schema_version',
  'mission_id',
  'row_ordinal',
  'exact_target_utf8',
  'visible_time_bucket_utf8',
  'notification_attested_at',
  'profile_attested_at',
  'thread_attested_at',
  'owner_attested_at',
  'dedupe_checked_at',
  'relationship_mode',
  'bound_thread_reference_utf8',
  'owner_account_reference_utf8',
  'notification_row_observed',
  'private_notification_profile_binding_capability',
  'profile_identity_observed_exact',
  'relationship_evidence_observed_exact',
  'profile_to_thread_binding_exact',
  'owner_binding_observed_exact',
  'no_explicit_relationship_contradiction_observed',
  'no_prior_welcome_observed',
  'no_prior_send_attempt_observed',
]);

const OBSERVATION_BOOLEAN_FIELDS = Object.freeze([
  'notification_row_observed',
  'profile_identity_observed_exact',
  'relationship_evidence_observed_exact',
  'profile_to_thread_binding_exact',
  'owner_binding_observed_exact',
  'no_explicit_relationship_contradiction_observed',
  'no_prior_welcome_observed',
  'no_prior_send_attempt_observed',
]);

const ARTIFACT_FIELDS = Object.freeze([
  'schema_version',
  'materializer_contract_version',
  'status',
  'ui_attested_input',
  'source_evidence_sha256',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'materializer_contract_version',
  'redaction_status',
  'decision',
  'observation_validated',
  'ui_attested_input_built',
  'adapter_ready',
  'source_evidence_bound',
  'owner_only_root_verified',
  'artifact_published',
  'existing_artifact_reused',
  'artifact_stability_verified',
  'artifact_count',
  'artifact_cap',
  'live_authority',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'browser_used',
  'network_used',
  'external_effect_invoked',
  'blocker_codes',
]);

const BLOCKERS = new Set(Object.values(
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER,
));

const BLOCKED_PROGRESS_KEYS_BY_BLOCKER = Object.freeze({
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID]:
    Object.freeze(['00000']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID]:
    Object.freeze(['00000']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.BINDING_CAPABILITY_INVALID]:
    Object.freeze(['11110']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ADAPTER_BLOCKED]:
    Object.freeze(['11000']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID]:
    Object.freeze(['11110', '11111']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID]:
    Object.freeze(['11110']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.TARGET_CONFLICT]:
    Object.freeze(['11111']),
  [WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED]:
    Object.freeze(['00000', '11110', '11111']),
});

const isPlainDataObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeUtilTypes.isProxy(value)
  && (Object.getPrototypeOf(value) === Object.prototype
    || Object.getPrototypeOf(value) === null);

const exactDataObject = (value, fields) => {
  if (!isPlainDataObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== fields.length
    || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
    || fields.some((field) => !Object.hasOwn(descriptors, field))
    || keys.some((key) => descriptors[key].get || descriptors[key].set)
  ) return null;
  return Object.freeze(Object.fromEntries(fields.map((field) => [
    field,
    descriptors[field].value,
  ])));
};

const isCleanString = (value) => typeof value === 'string'
  && value.length > 0
  && value === value.trim()
  && !/[\u0000-\u001f\u007f]/u.test(value);

const parseExactIsoTimestamp = (value) => {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) return null;
  return parsed;
};

const isAbsoluteCleanPath = (value) => typeof value === 'string'
  && isAbsolute(value)
  && value === resolve(value)
  && !value.split(sep).some((segment) => segment === '.' || segment === '..');

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainDataObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
};

const canonicalBytes = (value) => Buffer.from(
  `${JSON.stringify(canonicalize(value))}\n`,
  'utf8',
);

const sameFile = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs
  && actual.ctimeMs === expected.ctimeMs;

const buildReceipt = ({
  decision,
  blockerCodes = [],
  observationValidated = false,
  uiAttestedInputBuilt = false,
  adapterReady = false,
  sourceEvidenceBound = false,
  ownerOnlyRootVerified = false,
  artifactStabilityVerified = false,
}) => {
  const ready = decision === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED
    || decision === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED;
  const published = decision
    === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED;
  const reused = decision
    === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED;
  return Object.freeze({
    receipt_schema_version:
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION,
    materializer_contract_version:
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION,
    redaction_status:
      'aggregate_allowlist_only_no_private_values_buckets_times_paths_anchors_digests_ocr_or_screenshots',
    decision,
    observation_validated: ready || observationValidated,
    ui_attested_input_built: ready || uiAttestedInputBuilt,
    adapter_ready: ready || adapterReady,
    source_evidence_bound: ready || sourceEvidenceBound,
    owner_only_root_verified: ready || ownerOnlyRootVerified,
    artifact_published: published,
    existing_artifact_reused: reused,
    artifact_stability_verified: ready || artifactStabilityVerified,
    artifact_count: ready ? 1 : 0,
    artifact_cap: 1,
    live_authority: false,
    claim_issued: false,
    pending_effect_recorded: false,
    send_allowed: false,
    browser_used: false,
    network_used: false,
    external_effect_invoked: false,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const blockedResult = (blocker, progress = {}) => Object.freeze({
  private_artifact: null,
  artifact_path: null,
  redacted_receipt: buildReceipt({
    decision: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.BLOCKED,
    blockerCodes: [blocker],
    ...progress,
  }),
});

const nativeBindingMatchesObservation = (binding, observation) => Boolean(
  binding
  && binding.row_ordinal === observation.row_ordinal
  && binding.exact_target_utf8 === observation.exact_target_utf8
  && binding.visible_time_bucket_utf8 === observation.visible_time_bucket_utf8
  && binding.notification_attested_at === observation.notification_attested_at
  && binding.profile_attested_at === observation.profile_attested_at
);

const validateObservation = (observation, nowMs) => {
  const value = exactDataObject(observation, OBSERVATION_FIELDS);
  const nativeBinding = value
    ? inspectWelcomeAudioNativeNotificationProfileBindingCapability(
      value.private_notification_profile_binding_capability,
    )
    : null;
  if (
    !value
    || value.schema_version
      !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_SCHEMA_VERSION
    || !isCleanString(value.mission_id)
    || !Number.isInteger(value.row_ordinal)
    || value.row_ordinal < 1
    || value.row_ordinal > 8
    || !isCleanString(value.exact_target_utf8)
    || !isCleanString(value.visible_time_bucket_utf8)
    || !isCleanString(value.bound_thread_reference_utf8)
    || !isCleanString(value.owner_account_reference_utf8)
    || !Object.values(
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE,
    ).includes(value.relationship_mode)
    || OBSERVATION_BOOLEAN_FIELDS.some((field) => value[field] !== true)
    || !nativeBindingMatchesObservation(nativeBinding, value)
  ) return null;
  const times = [
    value.notification_attested_at,
    value.profile_attested_at,
    value.thread_attested_at,
    value.owner_attested_at,
    value.dedupe_checked_at,
  ].map(parseExactIsoTimestamp);
  if (
    !Number.isFinite(nowMs)
    || nowMs < 0
    || times.some((time) => time === null)
    || times.some((time) => time > nowMs || nowMs - time > WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS)
    || times.some((time, index) => index > 0 && time < times[index - 1])
  ) return null;
  return value;
};

const buildWelcomeAudioUiAttestedFollowerSourceInputFromObservation = (
  privateObservation,
  options = {},
) => {
  const optionValues = exactDataObject(options, ['now_ms']);
  const observation = optionValues
    ? validateObservation(privateObservation, optionValues.now_ms)
    : null;
  if (!observation) return null;
  const currentMode = observation.relationship_mode
    === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE
      .CURRENT_VISIBLE_FOLLOWS_OWNER;
  return Object.freeze({
    schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
    source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
    mission_id: observation.mission_id,
    notification_row: Object.freeze({
      row_ordinal: observation.row_ordinal,
      exact_target_utf8: observation.exact_target_utf8,
      notification_evidence: 'explicit_recent_follower_notification_row',
      follower_signal: 'started_following_owner',
      time_bucket_utf8: observation.visible_time_bucket_utf8,
      time_bucket_evidence: 'explicit_visible_relative_time_label',
      attested_at: observation.notification_attested_at,
      inference_status: 'explicit_not_inferred',
    }),
    profile: Object.freeze({
      exact_target_utf8: observation.exact_target_utf8,
      notification_to_profile_binding: 'exact',
      profile_identity_evidence: 'exact_private_visual_profile_identity',
      follows_owner: currentMode
        ? WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE.CURRENT_FOLLOWS_OWNER_CONFIRMED
        : WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
          .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION,
      follows_owner_evidence: currentMode
        ? WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
          .CURRENT_VISIBLE_FOLLOWS_OWNER
        : WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
          .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET,
      attested_at: observation.profile_attested_at,
      inference_status: 'explicit_not_inferred',
    }),
    thread: Object.freeze({
      bound_thread_reference_utf8: observation.bound_thread_reference_utf8,
      profile_to_thread_binding: 'exact',
      thread_binding_evidence: 'exact_bound_thread_observed',
      attested_at: observation.thread_attested_at,
      inference_status: 'explicit_not_inferred',
    }),
    owner: Object.freeze({
      owner_account_reference_utf8: observation.owner_account_reference_utf8,
      owner_binding_evidence: 'exact_owner_account_observed',
      attested_at: observation.owner_attested_at,
      inference_status: 'explicit_not_inferred',
    }),
    dedupe: Object.freeze({
      status: 'clear_no_prior_welcome_or_attempt',
      already_welcomed_status: 'not_found',
      send_history_status: 'no_prior_attempt',
      exact_target_utf8: observation.exact_target_utf8,
      bound_thread_reference_utf8: observation.bound_thread_reference_utf8,
      owner_account_reference_utf8: observation.owner_account_reference_utf8,
      checked_at: observation.dedupe_checked_at,
      dedupe_evidence: 'exact_bound_thread_history_observed',
      inference_status: 'explicit_not_inferred',
    }),
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  });
};

const buildArtifact = ({ privateObservation, nowMs }) => {
  const uiAttestedInput = buildWelcomeAudioUiAttestedFollowerSourceInputFromObservation(
    privateObservation,
    { now_ms: nowMs },
  );
  if (!uiAttestedInput) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.OBSERVATION_INVALID);
  }
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
    uiAttestedInput,
    { nowMs },
  );
  if (
    adapted.private_projection === null
    || adapted.redacted_receipt.decision !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY
    || validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      adapted.redacted_receipt,
    ).ok !== true
    || validateWelcomeAudioUiAttestedFollowerSourceProjection(
      adapted.private_projection,
      { nowMs },
    ).ok !== true
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ADAPTER_BLOCKED);
  return Object.freeze({
    schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SCHEMA_VERSION,
    materializer_contract_version:
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION,
    status: 'validated_owner_only_ui_attested_input',
    ui_attested_input: uiAttestedInput,
    source_evidence_sha256: adapted.private_projection.source_evidence_sha256,
  });
};

const validateWelcomeAudioUiAttestedFollowerSourceArtifact = (
  artifact,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID,
  });
  try {
    const value = exactDataObject(artifact, ARTIFACT_FIELDS);
    const optionValues = exactDataObject(options, ['now_ms']);
    if (
      !value
      || !optionValues
      || !Number.isFinite(optionValues.now_ms)
      || value.schema_version !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SCHEMA_VERSION
      || value.materializer_contract_version
        !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION
      || value.status !== 'validated_owner_only_ui_attested_input'
      || typeof value.source_evidence_sha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(value.source_evidence_sha256)
    ) return invalid();
    const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
      value.ui_attested_input,
      { nowMs: optionValues.now_ms },
    );
    if (
      adapted.private_projection === null
      || adapted.redacted_receipt.decision !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY
      || validateWelcomeAudioUiAttestedFollowerSourceReceipt(
        adapted.redacted_receipt,
      ).ok !== true
      || validateWelcomeAudioUiAttestedFollowerSourceProjection(
        adapted.private_projection,
        { nowMs: optionValues.now_ms },
      ).ok !== true
      || adapted.private_projection.source_evidence_sha256 !== value.source_evidence_sha256
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID,
  });
  try {
    const value = exactDataObject(receipt, RECEIPT_FIELDS);
    if (!value || !Array.isArray(value.blocker_codes)) return invalid();
    const ready = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED
      || value.decision === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED;
    const receiptBooleans = RECEIPT_FIELDS.filter((field) => ![
      'receipt_schema_version',
      'materializer_contract_version',
      'redaction_status',
      'decision',
      'artifact_count',
      'artifact_cap',
      'blocker_codes',
    ].includes(field));
    const progressMonotonic = !value.ui_attested_input_built || value.observation_validated
      ? (!value.adapter_ready || value.ui_attested_input_built)
        && (!value.source_evidence_bound || value.adapter_ready)
        && (!value.owner_only_root_verified || value.source_evidence_bound)
      : false;
    const blockedProgressKey = [
      value.observation_validated,
      value.ui_attested_input_built,
      value.adapter_ready,
      value.source_evidence_bound,
      value.owner_only_root_verified,
    ].map((flag) => flag === true ? '1' : flag === false ? '0' : 'x').join('');
    const blockedProgressSemantics = ready || (
      value.blocker_codes.length === 1
      && BLOCKED_PROGRESS_KEYS_BY_BLOCKER[value.blocker_codes[0]]
        ?.includes(blockedProgressKey) === true
    );
    const completedSemantics = value.observation_validated === true
        && value.ui_attested_input_built === true
        && value.adapter_ready === true
        && value.source_evidence_bound === true
        && value.owner_only_root_verified === true
        && value.artifact_stability_verified === true
        && value.artifact_count === 1;
    const decisionSemantics = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED
      ? completedSemantics
        && value.artifact_published === true
        && value.existing_artifact_reused === false
      : value.decision === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED
        ? completedSemantics
          && value.artifact_published === false
          && value.existing_artifact_reused === true
        : value.artifact_count === 0
        && value.artifact_published === false
        && value.existing_artifact_reused === false
        && value.artifact_stability_verified === false;
    if (
      !Object.values(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION)
        .includes(value.decision)
      || value.receipt_schema_version
        !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION
      || value.materializer_contract_version
        !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION
      || value.redaction_status
        !== 'aggregate_allowlist_only_no_private_values_buckets_times_paths_anchors_digests_ocr_or_screenshots'
      || receiptBooleans.some((field) => typeof value[field] !== 'boolean')
      || !progressMonotonic
      || !blockedProgressSemantics
      || !decisionSemantics
      || value.artifact_cap !== 1
      || value.live_authority !== false
      || value.claim_issued !== false
      || value.pending_effect_recorded !== false
      || value.send_allowed !== false
      || value.browser_used !== false
      || value.network_used !== false
      || value.external_effect_invoked !== false
      || value.blocker_codes.length !== (ready ? 0 : 1)
      || value.blocker_codes.some((code) => !BLOCKERS.has(code))
      || new Set(value.blocker_codes).size !== value.blocker_codes.length
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const ensureFixedRoot = async () => {
  const parentUnresolved = await lstat(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_PARENT);
  const parentCanonical = await realpath(
    WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_PARENT,
  );
  if (
    parentCanonical !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_PARENT
    || !parentUnresolved.isDirectory()
    || parentUnresolved.isSymbolicLink()
    || (typeof process.getuid === 'function' && parentUnresolved.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  try {
    await mkdir(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT, { mode: 0o700 });
    let parentHandle;
    try {
      parentHandle = await open(parentCanonical, FS_CONSTANTS.O_RDONLY);
      await parentHandle.sync();
    } finally {
      await parentHandle?.close();
    }
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
};

const waitForPublicationRootSettle = async ({ rootPath, rootMetadata }) => {
  for (let attempt = 0; attempt < CONCURRENT_WINNER_SETTLE_ATTEMPTS; attempt += 1) {
    let transientRace = false;
    try {
      const rootBefore = await lstat(rootPath);
      const entries = await readdir(rootPath);
      const rootAfter = await lstat(rootPath);
      if (
        !rootBefore.isDirectory()
        || rootBefore.dev !== rootMetadata.dev
        || rootBefore.ino !== rootMetadata.ino
        || rootBefore.uid !== rootMetadata.uid
        || rootBefore.mode !== rootMetadata.mode
        || rootAfter.dev !== rootBefore.dev
        || rootAfter.ino !== rootBefore.ino
        || rootAfter.uid !== rootBefore.uid
        || rootAfter.mode !== rootBefore.mode
      ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
      const temporaryEntries = entries.filter((entry) => (
        MODULE_TEMPORARY_FILE_PATTERN.test(entry)
      ));
      if (
        temporaryEntries.length > MAX_CONCURRENT_MODULE_TEMPORARIES
        || entries.some((entry) => (
          entry !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME
          && !MODULE_TEMPORARY_FILE_PATTERN.test(entry)
        ))
      ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
      let targetMetadata = null;
      if (entries.includes(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME)) {
        try {
          targetMetadata = await lstat(join(
            rootPath,
            WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
          ));
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
          transientRace = true;
        }
      }
      for (const entry of temporaryEntries) {
        let metadata;
        try {
          metadata = await lstat(join(rootPath, entry));
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
          transientRace = true;
          continue;
        }
        const linkedToTarget = metadata.nlink === 2
          && targetMetadata !== null
          && sameFile(metadata, targetMetadata);
        if (
          !metadata.isFile()
          || (metadata.nlink !== 1 && !linkedToTarget)
          || (metadata.mode & 0o7777) !== 0o600
          || metadata.dev !== rootMetadata.dev
          || metadata.size > MAX_ARTIFACT_BYTES
          || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
        ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
      }
      if (
        !transientRace
        && temporaryEntries.length === 0
        && (entries.length === 0 || (
          entries.length === 1
          && entries[0] === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME
        ))
      ) return;
    } catch (error) {
      if (error?.message === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID) {
        throw error;
      }
      transientRace = true;
    }
    if (attempt + 1 < CONCURRENT_WINNER_SETTLE_ATTEMPTS) {
      await new Promise((resolvePromise) => setTimeout(
        resolvePromise,
        CONCURRENT_WINNER_SETTLE_INTERVAL_MS,
      ));
    }
  }
  throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
};

const assertOwnerOnlyRoot = async ({ artifactRoot, mode }) => {
  if (!isAbsoluteCleanPath(artifactRoot)) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  }
  let syntheticCanonicalTemp = null;
  if (mode === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE.FIXED_OWNER_ONLY) {
    if (artifactRoot !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
    }
    await ensureFixedRoot();
  } else if (
    mode === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE.SYNTHETIC_TEMP_TEST_ONLY
  ) {
    const unresolvedTemp = resolve(tmpdir());
    syntheticCanonicalTemp = await realpath(tmpdir());
    if (
      ![unresolvedTemp, syntheticCanonicalTemp].includes(dirname(artifactRoot))
      || !basename(artifactRoot).startsWith(
        WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX,
      )
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  } else throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  const unresolved = await lstat(artifactRoot);
  const canonical = await realpath(artifactRoot);
  if (
    (mode === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE.FIXED_OWNER_ONLY
      ? canonical !== artifactRoot
      : canonical !== join(syntheticCanonicalTemp, basename(artifactRoot)))
    || !unresolved.isDirectory()
    || unresolved.isSymbolicLink()
    || (unresolved.mode & 0o7777) !== 0o700
    || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  const stable = await lstat(canonical);
  if (
    stable.dev !== unresolved.dev
    || stable.ino !== unresolved.ino
    || stable.uid !== unresolved.uid
    || stable.mode !== unresolved.mode
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ROOT_INVALID);
  await waitForPublicationRootSettle({ rootPath: canonical, rootMetadata: stable });
  return Object.freeze({ path: canonical, metadata: stable });
};

const readStableArtifactBytes = async ({ targetPath, rootIdentity }) => {
  let handle;
  try {
    const pathBeforeOpen = await lstat(targetPath);
    if (!pathBeforeOpen.isFile()) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
    }
    handle = await open(
      targetPath,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW | FS_CONSTANTS.O_NONBLOCK,
    );
    const before = await handle.stat();
    if (
      !before.isFile()
      || !sameFile(pathBeforeOpen, before)
      || before.nlink !== 1
      || (before.mode & 0o7777) !== 0o600
      || before.dev !== rootIdentity.metadata.dev
      || before.size < 2
      || before.size > MAX_ARTIFACT_BYTES
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(targetPath);
    if (
      bytes.length !== after.size
      || !sameFile(after, before)
      || !sameFile(pathAfter, before)
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
    return bytes;
  } catch (error) {
    if (error?.message === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID) {
      throw error;
    }
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
  } finally {
    await handle?.close();
  }
};

const syncAndAssertRootIdentity = async (rootIdentity) => {
  let directoryHandle;
  try {
    directoryHandle = await open(
      rootIdentity.path,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW | FS_CONSTANTS.O_NONBLOCK,
    );
    const openedRoot = await directoryHandle.stat();
    if (
      !openedRoot.isDirectory()
      || openedRoot.dev !== rootIdentity.metadata.dev
      || openedRoot.ino !== rootIdentity.metadata.ino
      || openedRoot.uid !== rootIdentity.metadata.uid
      || openedRoot.mode !== rootIdentity.metadata.mode
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED);
    await directoryHandle.sync();
  } finally {
    await directoryHandle?.close();
  }
  const rootAfter = await lstat(rootIdentity.path);
  if (
    rootAfter.dev !== rootIdentity.metadata.dev
    || rootAfter.ino !== rootIdentity.metadata.ino
    || rootAfter.uid !== rootIdentity.metadata.uid
    || rootAfter.mode !== rootIdentity.metadata.mode
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED);
};

const waitForConcurrentWinnerSettle = async ({ targetPath, rootIdentity }) => {
  for (let attempt = 0; attempt < CONCURRENT_WINNER_SETTLE_ATTEMPTS; attempt += 1) {
    try {
      const rootBefore = await lstat(rootIdentity.path);
      const target = await lstat(targetPath);
      const entries = await readdir(rootIdentity.path);
      const rootAfter = await lstat(rootIdentity.path);
      if (
        rootBefore.isDirectory()
        && rootBefore.dev === rootIdentity.metadata.dev
        && rootBefore.ino === rootIdentity.metadata.ino
        && rootBefore.uid === rootIdentity.metadata.uid
        && rootBefore.mode === rootIdentity.metadata.mode
        && rootAfter.dev === rootBefore.dev
        && rootAfter.ino === rootBefore.ino
        && rootAfter.uid === rootBefore.uid
        && rootAfter.mode === rootBefore.mode
        && target.isFile()
        && target.nlink === 1
        && (target.mode & 0o7777) === 0o600
        && target.dev === rootIdentity.metadata.dev
        && target.size >= 2
        && target.size <= MAX_ARTIFACT_BYTES
        && (typeof process.getuid !== 'function' || target.uid === process.getuid())
        && entries.length === 1
        && entries[0] === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME
      ) return;
    } catch {
      // A concurrent winner may still be completing its exclusive publication.
    }
    if (attempt + 1 < CONCURRENT_WINNER_SETTLE_ATTEMPTS) {
      await new Promise((resolvePromise) => setTimeout(
        resolvePromise,
        CONCURRENT_WINNER_SETTLE_INTERVAL_MS,
      ));
    }
  }
  throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
};

const reuseExactArtifact = async ({ targetPath, rootIdentity, bytes }) => {
  const existingBytes = await readStableArtifactBytes({ targetPath, rootIdentity });
  if (!existingBytes.equals(bytes)) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.TARGET_CONFLICT);
  }
  await syncAndAssertRootIdentity(rootIdentity);
  return Object.freeze({ targetPath, reused: true });
};

const publishArtifactBytesExclusive = async ({ rootIdentity, bytes }) => {
  const targetPath = join(
    rootIdentity.path,
    WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
  );
  let targetExists = false;
  try {
    await lstat(targetPath);
    targetExists = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (targetExists) {
    return reuseExactArtifact({ targetPath, rootIdentity, bytes });
  }
  let temporaryPath;
  let temporaryHandle;
  try {
    temporaryPath = join(
      rootIdentity.path,
      `.ui-attested-source-${process.pid}-${randomBytes(16).toString('hex')}.tmp`,
    );
    temporaryHandle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await temporaryHandle.writeFile(bytes);
    await temporaryHandle.sync();
    const temporaryMetadata = await temporaryHandle.stat();
    if (
      !temporaryMetadata.isFile()
      || temporaryMetadata.nlink !== 1
      || (temporaryMetadata.mode & 0o7777) !== 0o600
      || temporaryMetadata.size !== bytes.length
      || temporaryMetadata.size < 2
      || temporaryMetadata.size > MAX_ARTIFACT_BYTES
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED);
    await temporaryHandle.close();
    temporaryHandle = null;
    try {
      await link(temporaryPath, targetPath);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      await unlink(temporaryPath);
      temporaryPath = null;
      await waitForConcurrentWinnerSettle({ targetPath, rootIdentity });
      return await reuseExactArtifact({
        targetPath,
        rootIdentity,
        bytes,
      });
    }
    await unlink(temporaryPath);
    temporaryPath = null;
    await syncAndAssertRootIdentity(rootIdentity);
    const publishedBytes = await readStableArtifactBytes({ targetPath, rootIdentity });
    if (!publishedBytes.equals(bytes)) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED);
    }
    return Object.freeze({ targetPath, reused: false });
  } catch (error) {
    throw error;
  } finally {
    await temporaryHandle?.close();
    if (temporaryPath) await unlink(temporaryPath).catch(() => {});
  }
};

const publishInternal = async ({ artifactRoot, mode, privateObservation, nowMs }) => {
  let rootIdentity;
  const progress = {
    observationValidated: false,
    uiAttestedInputBuilt: false,
    adapterReady: false,
    sourceEvidenceBound: false,
    ownerOnlyRootVerified: false,
    artifactStabilityVerified: false,
  };
  try {
    if (!Number.isFinite(nowMs) || nowMs < 0) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID);
    }
    const artifact = buildArtifact({ privateObservation, nowMs });
    progress.observationValidated = true;
    progress.uiAttestedInputBuilt = true;
    progress.adapterReady = true;
    progress.sourceEvidenceBound = true;
    if (validateWelcomeAudioUiAttestedFollowerSourceArtifact(
      artifact,
      { now_ms: nowMs },
    ).ok !== true) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ARTIFACT_INVALID);
    }
    const consumedBinding =
      consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(
        privateObservation.private_notification_profile_binding_capability,
      );
    if (!nativeBindingMatchesObservation(consumedBinding, privateObservation)) {
      return blockedResult(
        WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.BINDING_CAPABILITY_INVALID,
        progress,
      );
    }
    rootIdentity = await assertOwnerOnlyRoot({ artifactRoot, mode });
    progress.ownerOnlyRootVerified = true;
    const publication = await publishArtifactBytesExclusive({
      rootIdentity,
      bytes: canonicalBytes(artifact),
    });
    progress.artifactStabilityVerified = true;
    return Object.freeze({
      private_artifact: artifact,
      artifact_path: publication.targetPath,
      redacted_receipt: buildReceipt({
        decision: publication.reused
          ? WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.REUSED
          : WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION.PUBLISHED,
      }),
    });
  } catch (error) {
    const blocker = BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.PUBLICATION_FAILED;
    if (blocker === WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.ADAPTER_BLOCKED) {
      progress.observationValidated = true;
      progress.uiAttestedInputBuilt = true;
    }
    return blockedResult(blocker, progress);
  }
};

const publishFixedWelcomeAudioUiAttestedFollowerSourceArtifact = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['private_observation']);
  if (!input) {
    return blockedResult(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID);
  }
  return publishInternal({
    artifactRoot: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT,
    mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE.FIXED_OWNER_ONLY,
    privateObservation: input.private_observation,
    nowMs: Date.now(),
  });
};

const publishSyntheticWelcomeAudioUiAttestedFollowerSourceArtifactForTest = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, [
    'artifact_root',
    'private_observation',
    'now_ms',
  ]);
  if (!input) {
    return blockedResult(WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER.INPUT_INVALID);
  }
  return publishInternal({
    artifactRoot: input.artifact_root,
    mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    privateObservation: input.private_observation,
    nowMs: input.now_ms,
  });
};

const isValidV3NowMs = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const isExactIabTargetV3 = (value) => typeof value === 'string'
  && /^[A-Za-z0-9._]{1,30}$/u.test(value);

const isExactIabPrivateReferenceV3 = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= 2_048
  && !/[\u0000-\u001f\u007f]/u.test(value);

const isExactIabVisibleTimeBucketV3 = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= 80
  && !/[\u0000-\u001f\u007f]/u.test(value)
  && /^(?:3|4|5|6|7)\s*(?:d|day|days|d[ií]a|d[ií]as)$/iu.test(value);

const IAB_HISTORICAL_DAY_LABEL_V4 =
  /^(?:[89]|[12][0-9]|30)\s*(?:d|day|days|día|días)$/iu;
const IAB_HISTORICAL_WEEK_LABEL_V4 =
  /^[1-4]\s*(?:w|week|weeks|sem|semana|semanas)$/iu;

const classifyIabHistoricalAgeEvidenceV4 = (value) => {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > 80
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) return null;
  let ageEvidenceKind;
  if (IAB_HISTORICAL_DAY_LABEL_V4.test(value)) {
    ageEvidenceKind = 'displayed_day';
  } else if (IAB_HISTORICAL_WEEK_LABEL_V4.test(value)) {
    ageEvidenceKind = 'coarse_week';
  } else return null;
  const ageBucket = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(ageBucket)) return null;
  return Object.freeze({
    age_evidence_raw: value,
    age_evidence_kind: ageEvidenceKind,
    age_bucket: ageBucket,
  });
};

const snapshotV3PlainData = (value, seen = new WeakSet(), budget = { count: 0 }) => {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object' || nodeUtilTypes.isProxy(value)) {
    throw new TypeError('unsafe_iab_source_artifact_v3_data');
  }
  if (seen.has(value) || budget.count >= 4096) {
    throw new TypeError('unsafe_iab_source_artifact_v3_data');
  }
  seen.add(value);
  budget.count += 1;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new TypeError('unsafe_iab_source_artifact_v3_data');
      }
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descriptors);
      if (
        descriptors.length?.get
        || descriptors.length?.set
        || !Number.isSafeInteger(descriptors.length?.value)
        || descriptors.length.value < 0
        || keys.length !== descriptors.length.value + 1
      ) throw new TypeError('unsafe_iab_source_artifact_v3_data');
      return Object.freeze(Array.from(
        { length: descriptors.length.value },
        (_, index) => {
          const descriptor = descriptors[String(index)];
          if (
            !descriptor
            || descriptor.get
            || descriptor.set
            || descriptor.enumerable !== true
          ) throw new TypeError('unsafe_iab_source_artifact_v3_data');
          return snapshotV3PlainData(descriptor.value, seen, budget);
        },
      ));
    }
    if (!isPlainDataObject(value)) {
      throw new TypeError('unsafe_iab_source_artifact_v3_data');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.some((key) => typeof key !== 'string')
      || keys.some((key) => descriptors[key].get || descriptors[key].set)
    ) throw new TypeError('unsafe_iab_source_artifact_v3_data');
    return Object.freeze(Object.fromEntries(keys.map((key) => [
      key,
      snapshotV3PlainData(descriptors[key].value, seen, budget),
    ])));
  } finally {
    seen.delete(value);
  }
};

const deepFreezeV3 = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreezeV3);
    Object.freeze(value);
  }
  return value;
};

const validateIabCompleteSourceV3 = (input, nowMs) => {
  let source;
  try {
    source = exactDataObject(snapshotV3PlainData(input), IAB_COMPLETE_SOURCE_FIELDS);
  } catch {
    return null;
  }
  const observedAtMs = parseExactIsoTimestamp(source?.source_observed_at);
  const expiresAtMs = parseExactIsoTimestamp(source?.source_expires_at);
  const exactReferences = source ? [
    source.exact_notification_reference,
    source.exact_profile_reference,
    source.exact_thread_reference,
    source.exact_owner_account_reference,
  ] : [];
  if (
    !source
    || !isValidV3NowMs(nowMs)
    || source.source_contract_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION
    || source.source_backend !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND
    || source.source_mission_id !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MISSION_ID
    || observedAtMs === null
    || expiresAtMs === null
    || observedAtMs > nowMs
    || expiresAtMs <= nowMs
    || expiresAtMs - observedAtMs !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS
    || !Number.isInteger(source.source_row_ordinal)
    || source.source_row_ordinal < 1
    || source.source_row_ordinal > 8
    || !isExactIabTargetV3(source.exact_target_utf8)
    || !isExactIabVisibleTimeBucketV3(source.visible_time_bucket_utf8)
    || exactReferences.some((value) => !isExactIabPrivateReferenceV3(value))
    || new Set(exactReferences).size !== 4
    || source.notification_profile_binding !== 'exact'
    || source.profile_thread_binding !== 'exact'
    || source.owner_account_binding !== 'exact'
    || source.relationship_binding !== 'follows_owner'
    || source.preopen_unread_inbound !== 'explicit_none'
    || source.seen_transition !== 'absent'
    || source.prior_welcome_audio !== 'explicit_none'
    || source.prior_welcome_attempt !== 'explicit_none'
    || source.dedupe_status !== 'clear'
    || source.composer_status !== 'visible'
    || source.attachment_control_status !== 'visible_and_usable'
    || source.challenge_or_error_status !== 'absent'
    || source.isolated_tab_finalized !== 'exactly_once'
  ) return null;
  return deepFreezeV3(source);
};

const buildUiAttestedInputFromIabCompleteSourceV3 = (source) => deepFreezeV3({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: source.source_mission_id,
  notification_row: {
    row_ordinal: source.source_row_ordinal,
    exact_target_utf8: source.exact_target_utf8,
    notification_evidence: 'explicit_recent_follower_notification_row',
    follower_signal: 'started_following_owner',
    time_bucket_utf8: source.visible_time_bucket_utf8,
    time_bucket_evidence: 'explicit_visible_relative_time_label',
    attested_at: source.source_observed_at,
    inference_status: 'explicit_not_inferred',
  },
  profile: {
    exact_target_utf8: source.exact_target_utf8,
    notification_to_profile_binding: 'exact',
    profile_identity_evidence: 'exact_private_visual_profile_identity',
    follows_owner: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
      .CURRENT_FOLLOWS_OWNER_CONFIRMED,
    follows_owner_evidence: WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
      .CURRENT_VISIBLE_FOLLOWS_OWNER,
    attested_at: source.source_observed_at,
    inference_status: 'explicit_not_inferred',
  },
  thread: {
    bound_thread_reference_utf8: source.exact_thread_reference,
    profile_to_thread_binding: 'exact',
    thread_binding_evidence: 'exact_bound_thread_observed',
    attested_at: source.source_observed_at,
    inference_status: 'explicit_not_inferred',
  },
  owner: {
    owner_account_reference_utf8: source.exact_owner_account_reference,
    owner_binding_evidence: 'exact_owner_account_observed',
    attested_at: source.source_observed_at,
    inference_status: 'explicit_not_inferred',
  },
  dedupe: {
    status: 'clear_no_prior_welcome_or_attempt',
    already_welcomed_status: 'not_found',
    send_history_status: 'no_prior_attempt',
    exact_target_utf8: source.exact_target_utf8,
    bound_thread_reference_utf8: source.exact_thread_reference,
    owner_account_reference_utf8: source.exact_owner_account_reference,
    checked_at: source.source_observed_at,
    dedupe_evidence: 'exact_bound_thread_history_observed',
    inference_status: 'explicit_not_inferred',
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const buildIabSemanticSourceArtifactV3 = (completeSource, nowMs) => {
  const source = validateIabCompleteSourceV3(completeSource, nowMs);
  if (!source) {
    throw new Error(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.COMPLETE_SOURCE_INVALID,
    );
  }
  const uiAttestedInput = buildUiAttestedInputFromIabCompleteSourceV3(source);
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(uiAttestedInput, { nowMs });
  if (
    adapted.private_projection === null
    || adapted.redacted_receipt.decision !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY
    || validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      adapted.redacted_receipt,
    ).ok !== true
    || validateWelcomeAudioUiAttestedFollowerSourceProjection(
      adapted.private_projection,
      { nowMs },
    ).ok !== true
  ) throw new Error(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.COMPLETE_SOURCE_INVALID,
  );
  return deepFreezeV3({
    schema_version: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3,
    status: 'validated_owner_only_iab_semantic_complete_source_v3',
    source_expires_at: source.source_expires_at,
    complete_source: source,
    ui_attested_input: uiAttestedInput,
    source_evidence_sha256: adapted.private_projection.source_evidence_sha256,
  });
};

const validateWelcomeAudioIabSemanticFollowerSourceArtifactV3 = (
  artifact,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_INVALID,
  });
  try {
    const safeArtifact = snapshotV3PlainData(artifact);
    const root = exactDataObject(safeArtifact, IAB_SOURCE_ARTIFACT_FIELDS_V3);
    const safeOptions = exactDataObject(options, ['now_ms']);
    if (!root || !safeOptions || !isValidV3NowMs(safeOptions.now_ms)) return invalid();
    const source = validateIabCompleteSourceV3(root.complete_source, safeOptions.now_ms);
    if (
      !source
      || root.schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3
      || root.status !== 'validated_owner_only_iab_semantic_complete_source_v3'
      || root.source_expires_at !== source.source_expires_at
      || !/^[a-f0-9]{64}$/u.test(root.source_evidence_sha256)
    ) return invalid();
    const expectedInput = buildUiAttestedInputFromIabCompleteSourceV3(source);
    if (!canonicalBytes(root.ui_attested_input).equals(canonicalBytes(expectedInput))) {
      return invalid();
    }
    const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
      root.ui_attested_input,
      { nowMs: safeOptions.now_ms },
    );
    if (
      adapted.private_projection === null
      || validateWelcomeAudioUiAttestedFollowerSourceProjection(
        adapted.private_projection,
        { nowMs: safeOptions.now_ms },
      ).ok !== true
      || adapted.private_projection.source_evidence_sha256
        !== root.source_evidence_sha256
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const validateIabHistoricalCompleteSourceV4 = (input, nowMs) => {
  let source;
  try {
    source = exactDataObject(
      snapshotV3PlainData(input),
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_COMPLETE_SOURCE_PAYLOAD_FIELDS_V2,
    );
  } catch {
    return null;
  }
  const observedAtMs = parseExactIsoTimestamp(source?.source_observed_at);
  const expiresAtMs = parseExactIsoTimestamp(source?.source_expires_at);
  const exactReferences = source ? [
    source.exact_notification_reference,
    source.exact_profile_reference,
    source.exact_thread_reference,
    source.exact_owner_account_reference,
  ] : [];
  const ageEvidence = classifyIabHistoricalAgeEvidenceV4(
    source?.age_evidence_raw,
  );
  if (
    !source
    || !ageEvidence
    || !isValidV3NowMs(nowMs)
    || source.source_contract_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_CONTRACT_VERSION_V2
    || source.source_backend !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND
    || source.source_mission_id
      !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_MISSION_ID
    || source.selection_policy
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_SELECTION_POLICY.HISTORICAL_CATCHUP_PILOT_V1
    || source.age_evidence_raw !== source.visible_time_bucket_utf8
    || source.age_evidence_kind !== ageEvidence.age_evidence_kind
    || source.age_bucket !== ageEvidence.age_bucket
    || source.actual_elapsed_age_claimed !== false
    || source.campaign_membership_claimed !== false
    || observedAtMs === null
    || expiresAtMs === null
    || observedAtMs > nowMs
    || expiresAtMs <= nowMs
    || expiresAtMs - observedAtMs !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_FRESHNESS_MS
    || !Number.isInteger(source.source_row_ordinal)
    || source.source_row_ordinal < 1
    || source.source_row_ordinal > 8
    || !isExactIabTargetV3(source.exact_target_utf8)
    || exactReferences.some((value) => !isExactIabPrivateReferenceV3(value))
    || new Set(exactReferences).size !== 4
    || source.notification_profile_binding !== 'exact'
    || source.profile_thread_binding !== 'exact'
    || source.owner_account_binding !== 'exact'
    || source.relationship_binding !== 'follows_owner'
    || source.preopen_unread_inbound !== 'explicit_none'
    || source.seen_transition !== 'absent'
    || source.prior_welcome_audio !== 'explicit_none'
    || source.prior_welcome_attempt !== 'explicit_none'
    || source.dedupe_status !== 'clear'
    || source.composer_status !== 'visible'
    || source.attachment_control_status !== 'visible_and_usable'
    || source.challenge_or_error_status !== 'absent'
    || source.isolated_tab_finalized !== 'exactly_once'
  ) return null;
  return Object.freeze({
    source: deepFreezeV3(source),
    ageEvidence,
  });
};

const buildIabSemanticHistoricalSourceArtifactV4 = (completeSource, nowMs) => {
  const validated = validateIabHistoricalCompleteSourceV4(completeSource, nowMs);
  if (!validated) throw new Error(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
      .COMPLETE_SOURCE_INVALID,
  );
  const { source, ageEvidence } = validated;
  const uiAttestedInput = buildUiAttestedInputFromIabCompleteSourceV3(source);
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(uiAttestedInput, { nowMs });
  if (
    adapted.private_projection === null
    || adapted.redacted_receipt.decision !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_DECISION.READY
    || validateWelcomeAudioUiAttestedFollowerSourceReceipt(
      adapted.redacted_receipt,
    ).ok !== true
    || validateWelcomeAudioUiAttestedFollowerSourceProjection(
      adapted.private_projection,
      { nowMs },
    ).ok !== true
    || adapted.private_projection.profile?.follows_owner_evidence
      !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE.CURRENT_VISIBLE_FOLLOWS_OWNER
    || adapted.private_projection.campaign_membership_claimed !== false
  ) throw new Error(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
      .COMPLETE_SOURCE_INVALID,
  );
  return deepFreezeV3({
    schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4,
    status: 'validated_owner_only_iab_semantic_historical_complete_source_v4',
    source_expires_at: source.source_expires_at,
    selection_policy: source.selection_policy,
    ...ageEvidence,
    actual_elapsed_age_claimed: false,
    complete_source: source,
    ui_attested_input: uiAttestedInput,
    source_evidence_sha256: adapted.private_projection.source_evidence_sha256,
  });
};

const validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4 = (
  artifact,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.ARTIFACT_INVALID,
  });
  try {
    const root = exactDataObject(
      snapshotV3PlainData(artifact),
      IAB_HISTORICAL_SOURCE_ARTIFACT_FIELDS_V4,
    );
    const safeOptions = exactDataObject(options, ['now_ms']);
    if (!root || !safeOptions || !isValidV3NowMs(safeOptions.now_ms)) return invalid();
    const validated = validateIabHistoricalCompleteSourceV4(
      root.complete_source,
      safeOptions.now_ms,
    );
    if (!validated) return invalid();
    const { source, ageEvidence } = validated;
    if (
      root.schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4
      || root.status !== 'validated_owner_only_iab_semantic_historical_complete_source_v4'
      || root.source_expires_at !== source.source_expires_at
      || root.selection_policy !== source.selection_policy
      || root.age_evidence_raw !== ageEvidence.age_evidence_raw
      || root.age_evidence_kind !== ageEvidence.age_evidence_kind
      || root.age_bucket !== ageEvidence.age_bucket
      || root.actual_elapsed_age_claimed !== false
      || !/^[a-f0-9]{64}$/u.test(root.source_evidence_sha256)
    ) return invalid();
    const expectedInput = buildUiAttestedInputFromIabCompleteSourceV3(source);
    if (!canonicalBytes(root.ui_attested_input).equals(canonicalBytes(expectedInput))) {
      return invalid();
    }
    const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
      root.ui_attested_input,
      { nowMs: safeOptions.now_ms },
    );
    if (
      adapted.private_projection === null
      || validateWelcomeAudioUiAttestedFollowerSourceProjection(
        adapted.private_projection,
        { nowMs: safeOptions.now_ms },
      ).ok !== true
      || adapted.private_projection.profile?.follows_owner_evidence
        !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE.CURRENT_VISIBLE_FOLLOWS_OWNER
      || adapted.private_projection.campaign_membership_claimed !== false
      || adapted.private_projection.source_evidence_sha256
        !== root.source_evidence_sha256
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const IAB_SOURCE_ARTIFACT_PROGRESS_FIELDS_V3 = Object.freeze([
  'complete_source_capability_consumed',
  'complete_source_validated',
  'source_expiry_inherited',
  'owner_only_root_verified',
  'artifact_stability_verified',
]);

const IAB_SOURCE_ARTIFACT_BLOCKED_MATERIALIZE_PROGRESS_V3 = Object.freeze({
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID]:
    Object.freeze(['00000']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
    .COMPLETE_SOURCE_CAPABILITY_INVALID]: Object.freeze(['00000']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.COMPLETE_SOURCE_INVALID]:
    Object.freeze(['10000']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ROOT_INVALID]:
    Object.freeze(['11100', '11110']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_INVALID]:
    Object.freeze(['11110']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.TARGET_CONFLICT]:
    Object.freeze(['11110']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.PUBLICATION_FAILED]:
    Object.freeze(['11110']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_CAPABILITY_INVALID]:
    Object.freeze(['11111']),
});

const IAB_SOURCE_ARTIFACT_BLOCKED_OPEN_PROGRESS_V3 = Object.freeze({
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID]:
    Object.freeze(['00000']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ROOT_INVALID]:
    Object.freeze(['00000', '00010']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_INVALID]:
    Object.freeze(['00010', '00011']),
  [WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_CAPABILITY_INVALID]:
    Object.freeze(['01111']),
});

const iabSourceArtifactProgressSignatureV3 = (receipt) => (
  IAB_SOURCE_ARTIFACT_PROGRESS_FIELDS_V3
    .map((field) => (receipt[field] ? '1' : '0'))
    .join('')
);

const buildIabSemanticSourceArtifactReceiptV3 = ({
  decision,
  operation,
  blockerCodes = [],
  completeSourceCapabilityConsumed = false,
  completeSourceValidated = false,
  sourceExpiryInherited = false,
  ownerOnlyRootVerified = false,
  artifactStabilityVerified = false,
} = {}) => {
  const published = decision
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED;
  const reused = decision
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED;
  const opened = decision
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED;
  const ready = published || reused || opened;
  return Object.freeze({
    receipt_schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V3,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3,
    redaction_status:
      'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads',
    decision,
    operation,
    complete_source_capability_consumed:
      ready ? !opened : completeSourceCapabilityConsumed,
    complete_source_validated: ready || completeSourceValidated,
    source_expiry_inherited: ready || sourceExpiryInherited,
    owner_only_root_verified: ready || ownerOnlyRootVerified,
    artifact_published: published,
    existing_artifact_reused: reused,
    artifact_opened: opened,
    artifact_stability_verified: ready || artifactStabilityVerified,
    private_artifact_capability_issued: ready,
    artifact_count: ready ? 1 : 0,
    artifact_cap: 1,
    live_authority: false,
    claim_issued: false,
    pending_effect_recorded: false,
    send_allowed: false,
    browser_used: false,
    network_used: false,
    external_effect_invoked: false,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3 = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  });
  try {
    const root = exactDataObject(
      snapshotV3PlainData(receipt),
      IAB_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3,
    );
    if (!root || !Array.isArray(root.blocker_codes)) return invalid();
    const ready = [
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED,
    ].includes(root.decision);
    const booleans = IAB_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3.filter((field) => ![
      'receipt_schema_version',
      'materializer_contract_version',
      'redaction_status',
      'decision',
      'operation',
      'artifact_count',
      'artifact_cap',
      'blocker_codes',
    ].includes(field));
    const decisionSemantics = root.artifact_published === (
      root.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED
    ) && root.existing_artifact_reused === (
      root.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED
    ) && root.artifact_opened === (
      root.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED
    );
    const expectedReadyOperation = [
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED,
    ].includes(root.decision)
      ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE
      : root.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED
        ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN
        : null;
    const blockerSet = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3,
    ));
    const progressSignature = iabSourceArtifactProgressSignatureV3(root);
    const expectedReadyProgress = root.operation
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE
      ? '11111'
      : '01111';
    const blockedProgressMatrix = root.operation
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE
      ? IAB_SOURCE_ARTIFACT_BLOCKED_MATERIALIZE_PROGRESS_V3
      : IAB_SOURCE_ARTIFACT_BLOCKED_OPEN_PROGRESS_V3;
    const blocker = root.blocker_codes[0];
    if (
      root.receipt_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V3
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3
      || root.redaction_status
        !== 'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads'
      || !Object.values(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3)
        .includes(root.decision)
      || !Object.values(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3)
        .includes(root.operation)
      || booleans.some((field) => typeof root[field] !== 'boolean')
      || root.artifact_cap !== 1
      || root.artifact_count !== (ready ? 1 : 0)
      || !decisionSemantics
      || (ready && root.operation !== expectedReadyOperation)
      || root.private_artifact_capability_issued !== ready
      || root.live_authority !== false
      || root.claim_issued !== false
      || root.pending_effect_recorded !== false
      || root.send_allowed !== false
      || root.browser_used !== false
      || root.network_used !== false
      || root.external_effect_invoked !== false
      || root.blocker_codes.length !== (ready ? 0 : 1)
      || root.blocker_codes.some((code) => !blockerSet.has(code))
      || new Set(root.blocker_codes).size !== root.blocker_codes.length
      || (ready && progressSignature !== expectedReadyProgress)
      || (!ready && !blockedProgressMatrix[blocker]?.includes(progressSignature))
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const blockedIabSemanticSourceArtifactV3 = (
  operation,
  blocker,
  progress = {},
) => Object.freeze({
  private_artifact: null,
  private_source_artifact_capability: null,
  artifact_path: null,
  redacted_receipt: buildIabSemanticSourceArtifactReceiptV3({
    decision: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.BLOCKED,
    operation,
    blockerCodes: [blocker],
    ...progress,
  }),
});

const assertIabSemanticSourceArtifactRootV3 = async ({
  artifactRoot,
  mode,
  ioConfig = IAB_SOURCE_ARTIFACT_IO_CONFIG_V3,
}) => {
  if (!isAbsoluteCleanPath(artifactRoot)) {
    throw new Error(ioConfig.blockers.ROOT_INVALID);
  }
  let expectedCanonical;
  if (mode === ioConfig.fixedMode) {
    if (artifactRoot !== ioConfig.fixedRoot) {
      throw new Error(ioConfig.blockers.ROOT_INVALID);
    }
    const parentMetadata = await lstat(ioConfig.fixedParent);
    const parentCanonical = await realpath(ioConfig.fixedParent);
    if (
      parentCanonical !== ioConfig.fixedParent
      || !parentMetadata.isDirectory()
      || parentMetadata.isSymbolicLink()
      || (typeof process.getuid === 'function'
        && parentMetadata.uid !== process.getuid())
    ) throw new Error(ioConfig.blockers.ROOT_INVALID);
    try {
      await mkdir(artifactRoot, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
    expectedCanonical = artifactRoot;
  } else if (
    mode === ioConfig.syntheticMode
  ) {
    const unresolvedTemp = resolve(tmpdir());
    const canonicalTemp = await realpath(tmpdir());
    if (
      ![unresolvedTemp, canonicalTemp].includes(dirname(artifactRoot))
      || !basename(artifactRoot).startsWith(ioConfig.syntheticPrefix)
    ) throw new Error(ioConfig.blockers.ROOT_INVALID);
    expectedCanonical = join(canonicalTemp, basename(artifactRoot));
  } else throw new Error(ioConfig.blockers.ROOT_INVALID);
  const unresolved = await lstat(artifactRoot);
  const canonical = await realpath(artifactRoot);
  if (
    canonical !== expectedCanonical
    || !unresolved.isDirectory()
    || unresolved.isSymbolicLink()
    || (unresolved.mode & 0o7777) !== 0o700
    || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
  ) throw new Error(ioConfig.blockers.ROOT_INVALID);
  const entries = await readdir(canonical);
  if (
    entries.length > MAX_CONCURRENT_MODULE_TEMPORARIES + 1
    || entries.some((entry) => entry !== ioConfig.fileName
      && !ioConfig.temporaryPattern.test(entry))
  ) throw new Error(ioConfig.blockers.ROOT_INVALID);
  for (const entry of entries.filter((name) => ioConfig.temporaryPattern.test(name))) {
    const metadata = await lstat(join(canonical, entry));
    if (
      !metadata.isFile()
      || (metadata.mode & 0o7777) !== 0o600
      || metadata.size > MAX_ARTIFACT_BYTES
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) throw new Error(ioConfig.blockers.ROOT_INVALID);
  }
  return Object.freeze({ path: canonical, metadata: unresolved });
};

const syncIabSemanticSourceArtifactRootV3 = async (
  rootIdentity,
  ioConfig = IAB_SOURCE_ARTIFACT_IO_CONFIG_V3,
) => {
  let handle;
  try {
    handle = await open(
      rootIdentity.path,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW | FS_CONSTANTS.O_NONBLOCK,
    );
    const opened = await handle.stat();
    if (
      !opened.isDirectory()
      || opened.dev !== rootIdentity.metadata.dev
      || opened.ino !== rootIdentity.metadata.ino
      || opened.uid !== rootIdentity.metadata.uid
      || opened.mode !== rootIdentity.metadata.mode
    ) throw new Error(ioConfig.blockers.PUBLICATION_FAILED);
    await handle.sync();
    const rootAfter = await lstat(rootIdentity.path);
    if (
      !rootAfter.isDirectory()
      || rootAfter.dev !== rootIdentity.metadata.dev
      || rootAfter.ino !== rootIdentity.metadata.ino
      || rootAfter.uid !== rootIdentity.metadata.uid
      || rootAfter.mode !== rootIdentity.metadata.mode
    ) throw new Error(ioConfig.blockers.PUBLICATION_FAILED);
  } finally {
    await handle?.close();
  }
};

const readStableIabSemanticSourceArtifactBytesV3 = async ({
  targetPath,
  rootIdentity,
  ioConfig = IAB_SOURCE_ARTIFACT_IO_CONFIG_V3,
}) => {
  for (let attempt = 0; attempt < CONCURRENT_WINNER_SETTLE_ATTEMPTS; attempt += 1) {
    let handle;
    try {
      const beforePath = await lstat(targetPath);
      if (
        !beforePath.isFile()
        || (beforePath.mode & 0o7777) !== 0o600
        || beforePath.dev !== rootIdentity.metadata.dev
        || beforePath.size < 2
        || beforePath.size > MAX_ARTIFACT_BYTES
        || (typeof process.getuid === 'function' && beforePath.uid !== process.getuid())
      ) throw new Error(ioConfig.blockers.ARTIFACT_INVALID);
      if (beforePath.nlink !== 1) throw new Error('transient_iab_artifact_link_settle');
      handle = await open(
        targetPath,
        FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW | FS_CONSTANTS.O_NONBLOCK,
      );
      const before = await handle.stat();
      const bytes = await handle.readFile();
      const after = await handle.stat();
      const afterPath = await lstat(targetPath);
      if (
        bytes.length !== before.size
        || !sameFile(beforePath, before)
        || !sameFile(before, after)
        || !sameFile(after, afterPath)
      ) throw new Error(ioConfig.blockers.ARTIFACT_INVALID);
      return bytes;
    } catch (error) {
      if (
        error?.message !== 'transient_iab_artifact_link_settle'
        || attempt + 1 >= CONCURRENT_WINNER_SETTLE_ATTEMPTS
      ) throw error;
    } finally {
      await handle?.close();
    }
    await new Promise((resolvePromise) => setTimeout(
      resolvePromise,
      CONCURRENT_WINNER_SETTLE_INTERVAL_MS,
    ));
  }
  throw new Error(ioConfig.blockers.ARTIFACT_INVALID);
};

const settleIabSemanticSourceArtifactRootV3 = async (
  rootIdentity,
  ioConfig = IAB_SOURCE_ARTIFACT_IO_CONFIG_V3,
) => {
  for (let attempt = 0; attempt < CONCURRENT_WINNER_SETTLE_ATTEMPTS; attempt += 1) {
    const entries = await readdir(rootIdentity.path);
    if (
      entries.length === 1
      && entries[0] === ioConfig.fileName
    ) return;
    if (
      entries.some((entry) => entry !== ioConfig.fileName
        && !ioConfig.temporaryPattern.test(entry))
      || entries.length > MAX_CONCURRENT_MODULE_TEMPORARIES + 1
    ) throw new Error(ioConfig.blockers.ROOT_INVALID);
    if (attempt + 1 < CONCURRENT_WINNER_SETTLE_ATTEMPTS) {
      await new Promise((resolvePromise) => setTimeout(
        resolvePromise,
        CONCURRENT_WINNER_SETTLE_INTERVAL_MS,
      ));
    }
  }
  throw new Error(ioConfig.blockers.ROOT_INVALID);
};

const publishIabSemanticSourceArtifactBytesExclusiveV3 = async ({
  rootIdentity,
  bytes,
  ioConfig = IAB_SOURCE_ARTIFACT_IO_CONFIG_V3,
}) => {
  const targetPath = join(rootIdentity.path, ioConfig.fileName);
  try {
    const existing = await readStableIabSemanticSourceArtifactBytesV3({
      targetPath,
      rootIdentity,
      ioConfig,
    });
    if (!existing.equals(bytes)) throw new Error(ioConfig.blockers.TARGET_CONFLICT);
    await syncIabSemanticSourceArtifactRootV3(rootIdentity, ioConfig);
    return Object.freeze({ targetPath, reused: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  let temporaryPath = join(
    rootIdentity.path,
    `${ioConfig.temporaryPrefix}${process.pid}-${randomBytes(16).toString('hex')}.tmp`,
  );
  let handle;
  try {
    handle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(bytes);
    await handle.sync();
    const metadata = await handle.stat();
    if (
      !metadata.isFile()
      || metadata.nlink !== 1
      || (metadata.mode & 0o7777) !== 0o600
      || metadata.size !== bytes.length
      || metadata.size > MAX_ARTIFACT_BYTES
    ) throw new Error(ioConfig.blockers.PUBLICATION_FAILED);
    await handle.close();
    handle = null;
    try {
      await link(temporaryPath, targetPath);
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      await unlink(temporaryPath);
      temporaryPath = null;
      const winner = await readStableIabSemanticSourceArtifactBytesV3({
        targetPath,
        rootIdentity,
        ioConfig,
      });
      if (!winner.equals(bytes)) throw new Error(ioConfig.blockers.TARGET_CONFLICT);
      await settleIabSemanticSourceArtifactRootV3(rootIdentity, ioConfig);
      await syncIabSemanticSourceArtifactRootV3(rootIdentity, ioConfig);
      return Object.freeze({ targetPath, reused: true });
    }
    await unlink(temporaryPath);
    temporaryPath = null;
    await settleIabSemanticSourceArtifactRootV3(rootIdentity, ioConfig);
    await syncIabSemanticSourceArtifactRootV3(rootIdentity, ioConfig);
    const published = await readStableIabSemanticSourceArtifactBytesV3({
      targetPath,
      rootIdentity,
      ioConfig,
    });
    if (!published.equals(bytes)) throw new Error(ioConfig.blockers.PUBLICATION_FAILED);
    return Object.freeze({ targetPath, reused: false });
  } finally {
    await handle?.close();
    if (temporaryPath) await unlink(temporaryPath).catch(() => {});
  }
};

const issueIabSemanticSourceArtifactCapabilityV3 = ({
  artifact,
  nowMs,
  synthetic,
}) => {
  const expiresAtMs = parseExactIsoTimestamp(artifact.source_expires_at);
  if (expiresAtMs === null || expiresAtMs <= nowMs) return null;
  const capability = opaqueIabSemanticSourceArtifactCapabilityV3();
  const registry = synthetic
    ? IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST
    : IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3;
  registry.set(capability, {
    artifact,
    consumed: false,
    expiresAtMs,
  });
  return capability;
};

const consumeIabSemanticFollowerSourceArtifactCapabilityOnceV3Internal = (
  parameters,
  requiredSyntheticMode,
) => {
  const root = exactDataObject(parameters, ['private_source_artifact_capability']);
  if (!root) return null;
  const registry = requiredSyntheticMode
    ? IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST
    : IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3;
  const crossModeRegistry = requiredSyntheticMode
    ? IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3
    : IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST;
  const capability = root.private_source_artifact_capability;
  const state = registry.get(capability);
  const crossModeState = crossModeRegistry.get(capability);
  const historicalState = (requiredSyntheticMode
    ? IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST
    : IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4).get(capability);
  const historicalCrossModeState = (requiredSyntheticMode
    ? IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4
    : IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST).get(capability);
  if (!state && (historicalState || historicalCrossModeState)) {
    if (historicalState && !historicalState.consumed) historicalState.consumed = true;
    if (historicalCrossModeState && !historicalCrossModeState.consumed) {
      historicalCrossModeState.consumed = true;
    }
    return null;
  }
  if (!state && crossModeState && !crossModeState.consumed) {
    crossModeState.consumed = true;
    return null;
  }
  if (!state || state.consumed) return null;
  state.consumed = true;
  const nowMs = Date.now();
  if (
    state.expiresAtMs <= nowMs
    || validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
      state.artifact,
      { now_ms: nowMs },
    ).ok !== true
  ) return null;
  return Object.freeze({ private_artifact: state.artifact });
};

const consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce = (
  parameters = {},
) => consumeIabSemanticFollowerSourceArtifactCapabilityOnceV3Internal(
  parameters,
  false,
);

const consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest = (
  parameters = {},
) => consumeIabSemanticFollowerSourceArtifactCapabilityOnceV3Internal(
  parameters,
  true,
);

const parseAndValidateIabSemanticSourceArtifactV3 = (bytes, nowMs) => {
  let artifact;
  try {
    artifact = deepFreezeV3(JSON.parse(bytes.toString('utf8')));
  } catch {
    return null;
  }
  return validateWelcomeAudioIabSemanticFollowerSourceArtifactV3(
    artifact,
    { now_ms: nowMs },
  ).ok === true ? artifact : null;
};

const publishIabSemanticSourceArtifactV3Internal = async ({
  artifactRoot,
  mode,
  privateCompleteSourceCapability,
  nowMs,
  synthetic,
}) => {
  const progress = {
    completeSourceCapabilityConsumed: false,
    completeSourceValidated: false,
    sourceExpiryInherited: false,
    ownerOnlyRootVerified: false,
    artifactStabilityVerified: false,
  };
  if (!isValidV3NowMs(nowMs)) {
    return blockedIabSemanticSourceArtifactV3(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
    );
  }
  let completeSource;
  try {
    completeSource = synthetic
      ? consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest(
        privateCompleteSourceCapability,
      )
      : consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce(
        privateCompleteSourceCapability,
      );
  } catch {
    completeSource = null;
  }
  if (!completeSource) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
      .COMPLETE_SOURCE_CAPABILITY_INVALID,
  );
  progress.completeSourceCapabilityConsumed = true;
  try {
    const artifact = buildIabSemanticSourceArtifactV3(completeSource, nowMs);
    progress.completeSourceValidated = true;
    progress.sourceExpiryInherited = true;
    const rootIdentity = await assertIabSemanticSourceArtifactRootV3({
      artifactRoot,
      mode,
    });
    progress.ownerOnlyRootVerified = true;
    const publication = await publishIabSemanticSourceArtifactBytesExclusiveV3({
      rootIdentity,
      bytes: canonicalBytes(artifact),
    });
    progress.artifactStabilityVerified = true;
    const capability = issueIabSemanticSourceArtifactCapabilityV3({
      artifact,
      nowMs,
      synthetic,
    });
    if (!capability) throw new Error(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
        .ARTIFACT_CAPABILITY_INVALID,
    );
    return Object.freeze({
      private_artifact: artifact,
      private_source_artifact_capability: capability,
      artifact_path: publication.targetPath,
      redacted_receipt: buildIabSemanticSourceArtifactReceiptV3({
        decision: publication.reused
          ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.REUSED
          : WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.PUBLISHED,
        operation: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
      }),
    });
  } catch (error) {
    const blockers = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3,
    ));
    const blocker = blockers.has(error?.message)
      ? error.message
      : !progress.completeSourceValidated
        ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.COMPLETE_SOURCE_INVALID
        : !progress.ownerOnlyRootVerified
          ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ROOT_INVALID
          : progress.artifactStabilityVerified
            ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
              .ARTIFACT_CAPABILITY_INVALID
            : WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.PUBLICATION_FAILED;
    return blockedIabSemanticSourceArtifactV3(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
      blocker,
      progress,
    );
  }
};

const openIabSemanticSourceArtifactV3Internal = async ({
  artifactRoot,
  mode,
  nowMs,
  synthetic,
}) => {
  if (!isValidV3NowMs(nowMs)) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  );
  const progress = {
    completeSourceCapabilityConsumed: false,
    completeSourceValidated: false,
    sourceExpiryInherited: false,
    ownerOnlyRootVerified: false,
    artifactStabilityVerified: false,
  };
  try {
    const rootIdentity = await assertIabSemanticSourceArtifactRootV3({
      artifactRoot,
      mode,
    });
    progress.ownerOnlyRootVerified = true;
    await settleIabSemanticSourceArtifactRootV3(rootIdentity);
    const targetPath = join(
      rootIdentity.path,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FILE_NAME_V3,
    );
    const bytes = await readStableIabSemanticSourceArtifactBytesV3({
      targetPath,
      rootIdentity,
    });
    progress.artifactStabilityVerified = true;
    const artifact = parseAndValidateIabSemanticSourceArtifactV3(bytes, nowMs);
    if (!artifact) throw new Error(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_INVALID,
    );
    progress.completeSourceValidated = true;
    progress.sourceExpiryInherited = true;
    const capability = issueIabSemanticSourceArtifactCapabilityV3({
      artifact,
      nowMs,
      synthetic,
    });
    if (!capability) throw new Error(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
        .ARTIFACT_CAPABILITY_INVALID,
    );
    return Object.freeze({
      private_artifact: artifact,
      private_source_artifact_capability: capability,
      artifact_path: targetPath,
      redacted_receipt: buildIabSemanticSourceArtifactReceiptV3({
        decision: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3.OPENED,
        operation: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN,
      }),
    });
  } catch (error) {
    const blockers = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3,
    ));
    const blocker = blockers.has(error?.message)
      ? error.message
      : !progress.ownerOnlyRootVerified
        ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ROOT_INVALID
        : progress.completeSourceValidated
          ? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3
            .ARTIFACT_CAPABILITY_INVALID
          : WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.ARTIFACT_INVALID;
    return blockedIabSemanticSourceArtifactV3(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN,
      blocker,
      progress,
    );
  }
};

const publishFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3 = async (
  parameters = {},
) => {
  const root = exactDataObject(parameters, ['private_complete_source_capability']);
  if (!root) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  );
  return publishIabSemanticSourceArtifactV3Internal({
    artifactRoot: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3,
    mode: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3.FIXED_OWNER_ONLY,
    privateCompleteSourceCapability: root.private_complete_source_capability,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest = async (
  parameters = {},
) => {
  const root = exactDataObject(parameters, [
    'artifact_root',
    'private_complete_source_capability',
    'now_ms',
  ]);
  if (!root) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.MATERIALIZE,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  );
  return publishIabSemanticSourceArtifactV3Internal({
    artifactRoot: root.artifact_root,
    mode: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3
      .SYNTHETIC_TEMP_TEST_ONLY,
    privateCompleteSourceCapability: root.private_complete_source_capability,
    nowMs: root.now_ms,
    synthetic: true,
  });
};

const openFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3 = async (...args) => {
  if (args.length !== 0) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  );
  return openIabSemanticSourceArtifactV3Internal({
    artifactRoot: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3,
    mode: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3.FIXED_OWNER_ONLY,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const openSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest = async (
  parameters = {},
) => {
  const root = exactDataObject(parameters, ['artifact_root', 'now_ms']);
  if (!root) return blockedIabSemanticSourceArtifactV3(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_OPERATION_V3.OPEN,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3.INPUT_INVALID,
  );
  return openIabSemanticSourceArtifactV3Internal({
    artifactRoot: root.artifact_root,
    mode: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3
      .SYNTHETIC_TEMP_TEST_ONLY,
    nowMs: root.now_ms,
    synthetic: true,
  });
};

const buildIabSemanticHistoricalSourceArtifactReceiptV4 = ({
  decision,
  blockerCodes = [],
  completeSourceCapabilityConsumed = false,
  completeSourceValidated = false,
  sourceExpiryInherited = false,
  ownerOnlyRootVerified = false,
  artifactStabilityVerified = false,
} = {}) => {
  const published = decision
    === WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.PUBLISHED;
  const reused = decision
    === WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.REUSED;
  const ready = published || reused;
  return Object.freeze({
    receipt_schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V4,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4,
    redaction_status:
      'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads',
    decision,
    operation:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_OPERATION_V4.MATERIALIZE,
    complete_source_capability_consumed:
      ready || completeSourceCapabilityConsumed,
    complete_source_validated: ready || completeSourceValidated,
    source_expiry_inherited: ready || sourceExpiryInherited,
    owner_only_root_verified: ready || ownerOnlyRootVerified,
    artifact_published: published,
    existing_artifact_reused: reused,
    artifact_opened: false,
    artifact_stability_verified: ready || artifactStabilityVerified,
    private_artifact_capability_issued: ready,
    artifact_count: ready ? 1 : 0,
    artifact_cap: 1,
    live_authority: false,
    claim_issued: false,
    pending_effect_recorded: false,
    send_allowed: false,
    browser_used: false,
    network_used: false,
    external_effect_invoked: false,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactReceiptV4 = (
  receipt,
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
      .INPUT_INVALID,
  });
  try {
    const root = exactDataObject(
      snapshotV3PlainData(receipt),
      IAB_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_FIELDS_V4,
    );
    if (!root || !Array.isArray(root.blocker_codes)) return invalid();
    const ready = [
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.PUBLISHED,
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.REUSED,
    ].includes(root.decision);
    const booleanFields = IAB_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_FIELDS_V4.filter(
      (field) => ![
        'receipt_schema_version',
        'materializer_contract_version',
        'redaction_status',
        'decision',
        'operation',
        'artifact_count',
        'artifact_cap',
        'blocker_codes',
      ].includes(field),
    );
    const blockerSet = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4,
    ));
    const blocker = root.blocker_codes[0];
    const progress = iabSourceArtifactProgressSignatureV3(root);
    const progressMatrix = Object.freeze({
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.INPUT_INVALID]:
        Object.freeze(['00000']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .COMPLETE_SOURCE_CAPABILITY_INVALID]: Object.freeze(['00000']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .COMPLETE_SOURCE_INVALID]: Object.freeze(['10000']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.ROOT_INVALID]:
        Object.freeze(['11100', '11110']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .ARTIFACT_INVALID]: Object.freeze(['11110']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .TARGET_CONFLICT]: Object.freeze(['11110']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .PUBLICATION_FAILED]: Object.freeze(['11110']),
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .ARTIFACT_CAPABILITY_INVALID]: Object.freeze(['11111']),
    });
    if (
      root.receipt_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V4
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4
      || root.redaction_status
        !== 'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads'
      || !Object.values(
        WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4,
      ).includes(root.decision)
      || root.operation
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_OPERATION_V4.MATERIALIZE
      || booleanFields.some((field) => typeof root[field] !== 'boolean')
      || root.artifact_cap !== 1
      || root.artifact_count !== (ready ? 1 : 0)
      || root.artifact_published !== (
        root.decision
          === WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.PUBLISHED
      )
      || root.existing_artifact_reused !== (
        root.decision
          === WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.REUSED
      )
      || root.artifact_opened !== false
      || root.private_artifact_capability_issued !== ready
      || root.live_authority !== false
      || root.claim_issued !== false
      || root.pending_effect_recorded !== false
      || root.send_allowed !== false
      || root.browser_used !== false
      || root.network_used !== false
      || root.external_effect_invoked !== false
      || root.blocker_codes.length !== (ready ? 0 : 1)
      || root.blocker_codes.some((code) => !blockerSet.has(code))
      || new Set(root.blocker_codes).size !== root.blocker_codes.length
      || (ready && progress !== '11111')
      || (!ready && !progressMatrix[blocker]?.includes(progress))
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const blockedIabSemanticHistoricalSourceArtifactV4 = (
  blocker,
  progress = {},
) => Object.freeze({
  private_artifact: null,
  private_source_artifact_capability: null,
  artifact_path: null,
  redacted_receipt: buildIabSemanticHistoricalSourceArtifactReceiptV4({
    decision:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.BLOCKED,
    blockerCodes: [blocker],
    ...progress,
  }),
});

const issueIabSemanticHistoricalSourceArtifactCapabilityV4 = ({
  artifact,
  nowMs,
  synthetic,
}) => {
  const expiresAtMs = parseExactIsoTimestamp(artifact.source_expires_at);
  if (expiresAtMs === null || expiresAtMs <= nowMs) return null;
  const capability = opaqueIabSemanticHistoricalSourceArtifactCapabilityV4();
  const registry = synthetic
    ? IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST
    : IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4;
  registry.set(capability, {
    artifact,
    consumed: false,
    expiresAtMs,
  });
  return capability;
};

const consumeIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceV4Internal = (
  parameters,
  requiredSyntheticMode,
) => {
  const root = exactDataObject(parameters, ['private_source_artifact_capability']);
  if (!root) return null;
  const registry = requiredSyntheticMode
    ? IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST
    : IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4;
  const crossModeRegistry = requiredSyntheticMode
    ? IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4
    : IAB_HISTORICAL_SOURCE_ARTIFACT_CAPABILITY_STATES_V4_FOR_TEST;
  const capability = root.private_source_artifact_capability;
  const state = registry.get(capability);
  const crossModeState = crossModeRegistry.get(capability);
  const ordinaryState = (requiredSyntheticMode
    ? IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST
    : IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3).get(capability);
  const ordinaryCrossModeState = (requiredSyntheticMode
    ? IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3
    : IAB_SOURCE_ARTIFACT_CAPABILITY_STATES_V3_FOR_TEST).get(capability);
  if (!state && (ordinaryState || ordinaryCrossModeState)) {
    if (ordinaryState && !ordinaryState.consumed) ordinaryState.consumed = true;
    if (ordinaryCrossModeState && !ordinaryCrossModeState.consumed) {
      ordinaryCrossModeState.consumed = true;
    }
    return null;
  }
  if (!state && crossModeState && !crossModeState.consumed) {
    crossModeState.consumed = true;
    return null;
  }
  if (!state || state.consumed) return null;
  state.consumed = true;
  const nowMs = Date.now();
  if (
    state.expiresAtMs <= nowMs
    || validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4(
      state.artifact,
      { now_ms: nowMs },
    ).ok !== true
  ) return null;
  return Object.freeze({ private_artifact: state.artifact });
};

const consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce = (
  parameters = {},
) => consumeIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceV4Internal(
  parameters,
  false,
);

const consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest = (
  parameters = {},
) => consumeIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceV4Internal(
  parameters,
  true,
);

const publishIabSemanticHistoricalSourceArtifactV4Internal = async ({
  artifactRoot,
  mode,
  privateCompleteSourceCapability,
  nowMs,
  synthetic,
}) => {
  const progress = {
    completeSourceCapabilityConsumed: false,
    completeSourceValidated: false,
    sourceExpiryInherited: false,
    ownerOnlyRootVerified: false,
    artifactStabilityVerified: false,
  };
  if (!isValidV3NowMs(nowMs)) return blockedIabSemanticHistoricalSourceArtifactV4(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.INPUT_INVALID,
  );
  let completeSource;
  try {
    completeSource = synthetic
      ? consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
        privateCompleteSourceCapability,
      )
      : consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnce(
        privateCompleteSourceCapability,
      );
  } catch {
    completeSource = null;
  }
  if (!completeSource) return blockedIabSemanticHistoricalSourceArtifactV4(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
      .COMPLETE_SOURCE_CAPABILITY_INVALID,
  );
  progress.completeSourceCapabilityConsumed = true;
  try {
    const artifact = buildIabSemanticHistoricalSourceArtifactV4(completeSource, nowMs);
    progress.completeSourceValidated = true;
    progress.sourceExpiryInherited = true;
    const rootIdentity = await assertIabSemanticSourceArtifactRootV3({
      artifactRoot,
      mode,
      ioConfig: IAB_SOURCE_ARTIFACT_IO_CONFIG_V4,
    });
    progress.ownerOnlyRootVerified = true;
    const publication = await publishIabSemanticSourceArtifactBytesExclusiveV3({
      rootIdentity,
      bytes: canonicalBytes(artifact),
      ioConfig: IAB_SOURCE_ARTIFACT_IO_CONFIG_V4,
    });
    progress.artifactStabilityVerified = true;
    const capability = issueIabSemanticHistoricalSourceArtifactCapabilityV4({
      artifact,
      nowMs,
      synthetic,
    });
    if (!capability) throw new Error(
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
        .ARTIFACT_CAPABILITY_INVALID,
    );
    return Object.freeze({
      private_artifact: artifact,
      private_source_artifact_capability: capability,
      artifact_path: publication.targetPath,
      redacted_receipt: buildIabSemanticHistoricalSourceArtifactReceiptV4({
        decision: publication.reused
          ? WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.REUSED
          : WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4.PUBLISHED,
      }),
    });
  } catch (error) {
    const blockerSet = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4,
    ));
    const blocker = blockerSet.has(error?.message)
      ? error.message
      : !progress.completeSourceValidated
        ? WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
          .COMPLETE_SOURCE_INVALID
        : !progress.ownerOnlyRootVerified
          ? WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.ROOT_INVALID
          : progress.artifactStabilityVerified
            ? WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
              .ARTIFACT_CAPABILITY_INVALID
            : WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4
              .PUBLICATION_FAILED;
    return blockedIabSemanticHistoricalSourceArtifactV4(blocker, progress);
  }
};

const publishFixedWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4 = async (
  parameters = {},
) => {
  const root = exactDataObject(parameters, ['private_complete_source_capability']);
  if (!root) return blockedIabSemanticHistoricalSourceArtifactV4(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.INPUT_INVALID,
  );
  return publishIabSemanticHistoricalSourceArtifactV4Internal({
    artifactRoot: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_ROOT_V4,
    mode:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4.FIXED_OWNER_ONLY,
    privateCompleteSourceCapability: root.private_complete_source_capability,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const publishSyntheticWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4ForTest =
  async (parameters = {}) => {
    const root = exactDataObject(parameters, [
      'artifact_root',
      'private_complete_source_capability',
      'now_ms',
    ]);
    if (!root) return blockedIabSemanticHistoricalSourceArtifactV4(
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4.INPUT_INVALID,
    );
    return publishIabSemanticHistoricalSourceArtifactV4Internal({
      artifactRoot: root.artifact_root,
      mode: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4
        .SYNTHETIC_TEMP_TEST_ONLY,
      privateCompleteSourceCapability: root.private_complete_source_capability,
      nowMs: root.now_ms,
      synthetic: true,
    });
  };

export {
  ARTIFACT_FIELDS as WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIELDS,
  OBSERVATION_FIELDS as WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_FIELDS,
  RECEIPT_FIELDS as WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MODE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RELATIONSHIP_MODE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_SCHEMA_VERSION,
  buildWelcomeAudioUiAttestedFollowerSourceInputFromObservation,
  publishFixedWelcomeAudioUiAttestedFollowerSourceArtifact,
  publishSyntheticWelcomeAudioUiAttestedFollowerSourceArtifactForTest,
  validateWelcomeAudioUiAttestedFollowerSourceArtifact,
  validateWelcomeAudioUiAttestedFollowerSourceArtifactReceipt,
  IAB_COMPLETE_SOURCE_FIELDS as WELCOME_AUDIO_IAB_SEMANTIC_COMPLETE_SOURCE_FIELDS,
  IAB_SOURCE_ARTIFACT_FIELDS_V3 as WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIELDS_V3,
  IAB_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3 as WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_RECEIPT_FIELDS_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_BLOCKER_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_DECISION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FILE_NAME_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_FIXED_ROOT_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_MODE_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3,
  consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce,
  consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest,
  openFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3,
  openSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest,
  publishFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3,
  publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest,
  validateWelcomeAudioIabSemanticFollowerSourceArtifactReceiptV3,
  validateWelcomeAudioIabSemanticFollowerSourceArtifactV3,
  IAB_HISTORICAL_SOURCE_ARTIFACT_FIELDS_V4 as WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIELDS_V4,
  IAB_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_FIELDS_V4 as WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_FIELDS_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_BLOCKER_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_DECISION_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FILE_NAME_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_FIXED_ROOT_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_MODE_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V4,
  consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce,
  consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest,
  publishFixedWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4,
  publishSyntheticWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4ForTest,
  validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactReceiptV4,
  validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4,
};
