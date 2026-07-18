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

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_MATERIALIZER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_materializer_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_OBSERVATION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_private_observation_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FILE_NAME =
  'ui-attested-follower-source-v1.json';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-ui-attested-follower-source-artifact-v1',
);
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_PARENT = dirname(
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_FIXED_ROOT,
);
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_ARTIFACT_SYNTHETIC_PREFIX =
  'crm-core-welcome-audio-ui-attested-source-artifact-test-';
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
  'notification_to_profile_binding_exact',
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

const validateObservation = (observation, nowMs) => {
  const value = exactDataObject(observation, OBSERVATION_FIELDS);
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
    || OBSERVATION_FIELDS.slice(13).some((field) => value[field] !== true)
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
};
