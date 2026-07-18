/**
 * Closed PRECLAIM builder for one UI-attested Instagram welcome-audio canary.
 *
 * This module is data-only. It never opens a browser, publishes authority,
 * creates a claim, opens a chooser, uploads a file, or invokes Send. The only
 * opaque inputs it accepts are a previously validated audio capability and a
 * one-use, zero-action Safari observation produced by the live host.
 */

import { createHash } from 'node:crypto';
import { isAbsolute, resolve, sep } from 'node:path';
import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_BUSINESS_ELIGIBILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
  WELCOME_AUDIO_CONTEXT_MAX_AGE_MS,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_CLASS,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
  buildWelcomeAudioCanonicalOperationDigest,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
} from './crm-vnext-instagram-welcome-audio-live-preflight.mjs';
import {
  computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256,
  computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256,
} from './crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs';
import {
  validateWelcomeAudioUiAttestedCanaryPacketDraft,
} from './crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs';
import * as welcomeAudioSafariLiveHost
  from './crm-vnext-instagram-welcome-audio-safari-live-host.mjs';

const WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_preclaim_builder_v1';
const WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_preclaim_builder_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORIZATION_SEED_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_authorization_seed_v1';

const WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION = Object.freeze({
  BUILT: 'preclaim_bundle_built_no_effect',
  BLOCKED: 'blocked_preclaim_bundle_no_effect',
});

const WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_preclaim_builder_input_invalid',
  DRAFT_INVALID: 'blocked_preclaim_builder_draft_invalid',
  AUTHORIZATION_SEED_INVALID: 'blocked_preclaim_builder_authorization_seed_invalid',
  AUTHORIZATION_SEED_REPLAYED: 'blocked_preclaim_builder_authorization_seed_replayed',
  AUDIO_CAPABILITY_INVALID: 'blocked_preclaim_builder_audio_capability_invalid',
  OBSERVATION_INVALID: 'blocked_preclaim_builder_observation_invalid_or_replayed',
  BINDING_INVALID: 'blocked_preclaim_builder_exact_binding_invalid',
  DIGEST_INVALID: 'blocked_preclaim_builder_canonical_digest_invalid',
  GUARD_INVALID: 'blocked_preclaim_builder_guard_not_preclaim',
  RECEIPT_INVALID: 'blocked_preclaim_builder_receipt_invalid',
});

const LIVE_ROOT_FIELDS = Object.freeze([
  'private_draft',
  'private_authorization_seed',
  'private_audio_asset_capability',
  'private_preclaim_observation_capability',
]);

const TEST_ROOT_FIELDS = Object.freeze([
  ...LIVE_ROOT_FIELDS,
  'now_ms',
]);

const AUTHORIZATION_SEED_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_contract_sha256',
  'active_next_action_id',
  'active_next_action_sha256',
  'approval_packet_id',
  'approved_audio_asset_path',
  'approved_at',
  'expires_at',
  'expected_central_repo_head',
  'expected_draft_sha256',
  'expected_projection_sha256',
  'expected_operation_id',
  'expected_authorization_id',
  'expected_source_evidence_sha256',
  'expected_candidate_anchor_sha256',
  'expected_thread_anchor_sha256',
  'expected_owner_anchor_sha256',
  'expected_dedupe_anchor_sha256',
  'expected_audio_sha256',
  'seed_nonce_sha256',
]);

const OBSERVATION_FIELDS = Object.freeze([
  'observed_at',
  'audio_validated_at',
  'central_context_checked_at',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'builder_contract_version',
  'redaction_status',
  'decision',
  'draft_validated',
  'authorization_seed_validated',
  'audio_asset_validated',
  'preclaim_observation_consumed',
  'exact_bindings_preserved',
  'canonical_digest_bound',
  'guard_preclaim_eligible',
  'publisher_authorization_issued',
  'browser_action_invoked',
  'authority_published',
  'claim_issued',
  'send_attempted',
  'external_effect_invoked',
  'blocker_codes',
]);

const BLOCKERS = new Set(Object.values(WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER));
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/u;
const CONSUMED_AUTHORIZATION_SEED_NONCES = new Set();
const CONSUMED_AUTHORIZATION_SEED_DIGESTS = new Set();
const AUTHORIZATION_SEED_ADMISSIONS = new WeakMap();

const AUTHORIZATION_SEED_ADMISSION_FIELDS = Object.freeze([
  'private_authorization_seed',
  'private_draft',
]);

const AUTHORIZATION_SEED_ADMISSION_TEST_FIELDS = Object.freeze([
  ...AUTHORIZATION_SEED_ADMISSION_FIELDS,
  'now_ms',
]);

const isExactIso = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const isValidNowMs = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const isPlainObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeUtilTypes.isProxy(value)
  && (Object.getPrototypeOf(value) === Object.prototype
    || Object.getPrototypeOf(value) === null);

const snapshotPlainData = (value, seen = new WeakSet(), budget = { count: 0 }) => {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object' || nodeUtilTypes.isProxy(value)) {
    throw new TypeError('unsafe_plain_data');
  }
  if (seen.has(value) || budget.count > 4096) throw new TypeError('unsafe_plain_data');
  seen.add(value);
  budget.count += 1;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError('unsafe_plain_data');
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descriptors);
      if (keys.some((key) => key !== 'length' && (
        typeof key !== 'string'
        || !/^(?:0|[1-9][0-9]*)$/u.test(key)
        || Number(key) >= value.length
      ))) throw new TypeError('unsafe_plain_data');
      const output = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
          throw new TypeError('unsafe_plain_data');
        }
        output.push(snapshotPlainData(descriptor.value, seen, budget));
      }
      return Object.freeze(output);
    }
    if (!isPlainObject(value)) throw new TypeError('unsafe_plain_data');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) throw new TypeError('unsafe_plain_data');
    const output = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
        throw new TypeError('unsafe_plain_data');
      }
      output[key] = snapshotPlainData(descriptor.value, seen, budget);
    }
    return Object.freeze(output);
  } finally {
    seen.delete(value);
  }
};

const exactObject = (value, fields) => {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== fields.length
    || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
    || fields.some((field) => !Object.hasOwn(descriptors, field))
    || keys.some((key) => !Object.hasOwn(descriptors[key], 'value'))
  ) return null;
  return Object.freeze(Object.fromEntries(fields.map((field) => [
    field,
    descriptors[field].value,
  ])));
};

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

const buildReceipt = ({
  built = false,
  draftValidated = built,
  authorizationSeedValidated = built,
  audioAssetValidated = built,
  preclaimObservationConsumed = built,
  exactBindingsPreserved = built,
  canonicalDigestBound = built,
  guardPreclaimEligible = built,
  publisherAuthorizationIssued = built,
  blockerCodes = [],
} = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_RECEIPT_SCHEMA_VERSION,
  builder_contract_version: WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_CONTRACT_VERSION,
  redaction_status:
    'aggregate_allowlist_only_no_private_values_paths_ids_anchors_digests_or_timestamps',
  decision: built
    ? WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION.BUILT
    : WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION.BLOCKED,
  draft_validated: draftValidated,
  authorization_seed_validated: authorizationSeedValidated,
  audio_asset_validated: audioAssetValidated,
  preclaim_observation_consumed: preclaimObservationConsumed,
  exact_bindings_preserved: exactBindingsPreserved,
  canonical_digest_bound: canonicalDigestBound,
  guard_preclaim_eligible: guardPreclaimEligible,
  publisher_authorization_issued: publisherAuthorizationIssued,
  browser_action_invoked: false,
  authority_published: false,
  claim_issued: false,
  send_attempted: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...new Set(blockerCodes)]),
});

const blocked = (blocker, flags = {}) => Object.freeze({
  private_operation_snapshot: null,
  private_publisher_authorization: null,
  redacted_receipt: buildReceipt({ ...flags, blockerCodes: [blocker] }),
});

const validateWelcomeAudioUiAttestedPreclaimBuilderReceipt = (receipt) => {
  try {
    const value = exactObject(receipt, RECEIPT_FIELDS);
    if (!value || !Array.isArray(value.blocker_codes)) return Object.freeze({ ok: false });
    const built = value.decision === WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION.BUILT;
    const truthFields = [
      'draft_validated',
      'authorization_seed_validated',
      'audio_asset_validated',
      'preclaim_observation_consumed',
      'exact_bindings_preserved',
      'canonical_digest_bound',
      'guard_preclaim_eligible',
      'publisher_authorization_issued',
    ];
    const progress = truthFields.map((field) => value[field]);
    const monotonicProgress = progress.every((entry, index) => (
      typeof entry === 'boolean'
      && (index === 0 || entry === false || progress[index - 1] === true)
    ));
    const valid = value.receipt_schema_version
        === WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_RECEIPT_SCHEMA_VERSION
      && value.builder_contract_version
        === WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_CONTRACT_VERSION
      && value.redaction_status
        === 'aggregate_allowlist_only_no_private_values_paths_ids_anchors_digests_or_timestamps'
      && Object.values(WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION)
        .includes(value.decision)
      && monotonicProgress
      && (!built || truthFields.every((field) => value[field] === true))
      && [
        'browser_action_invoked',
        'authority_published',
        'claim_issued',
        'send_attempted',
        'external_effect_invoked',
      ].every((field) => value[field] === false)
      && value.blocker_codes.length === (built ? 0 : 1)
      && value.blocker_codes.every((code) => BLOCKERS.has(code));
    return Object.freeze({ ok: valid });
  } catch {
    return Object.freeze({ ok: false });
  }
};

const validateAuthorizationSeedStructure = (seed, nowMs) => {
  const value = exactObject(seed, AUTHORIZATION_SEED_FIELDS);
  if (!value) return null;
  const approvedAtMs = Date.parse(value.approved_at ?? '');
  const expiresAtMs = Date.parse(value.expires_at ?? '');
  const pathSegments = typeof value.approved_audio_asset_path === 'string'
    ? value.approved_audio_asset_path.split(sep)
    : [];
  if (
    !isValidNowMs(nowMs)
    || value.schema_version !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORIZATION_SEED_SCHEMA_VERSION
    || value.status !== 'approved_exact_single_send_seed'
    || !SHA256.test(value.mission_contract_sha256)
    || !OPAQUE_ID.test(value.active_next_action_id)
    || !SHA256.test(value.active_next_action_sha256)
    || !OPAQUE_ID.test(value.approval_packet_id)
    || typeof value.approved_audio_asset_path !== 'string'
    || !isAbsolute(value.approved_audio_asset_path)
    || resolve(value.approved_audio_asset_path) !== value.approved_audio_asset_path
    || pathSegments.some((segment) => segment === '.' || segment === '..')
    || !isExactIso(value.approved_at)
    || !isExactIso(value.expires_at)
    || approvedAtMs > nowMs
    || expiresAtMs <= nowMs
    || expiresAtMs <= approvedAtMs
    || expiresAtMs - approvedAtMs > WELCOME_AUDIO_CONTEXT_MAX_AGE_MS
    || !GIT_SHA.test(value.expected_central_repo_head)
    || !SHA256.test(value.expected_draft_sha256)
    || !SHA256.test(value.expected_projection_sha256)
    || !OPAQUE_ID.test(value.expected_operation_id)
    || !OPAQUE_ID.test(value.expected_authorization_id)
    || !SHA256.test(value.expected_source_evidence_sha256)
    || !SHA256.test(value.expected_candidate_anchor_sha256)
    || !SHA256.test(value.expected_thread_anchor_sha256)
    || !SHA256.test(value.expected_owner_anchor_sha256)
    || !SHA256.test(value.expected_dedupe_anchor_sha256)
    || !SHA256.test(value.expected_audio_sha256)
    || !SHA256.test(value.seed_nonce_sha256)
  ) return null;
  return value;
};

const authorizationSeedDigest = (seed) => createHash('sha256')
  .update(Buffer.from(JSON.stringify(seed), 'utf8'))
  .digest('hex');

const authorizationSeedIsConsumed = (seed) => (
  CONSUMED_AUTHORIZATION_SEED_NONCES.has(seed.seed_nonce_sha256)
  || CONSUMED_AUTHORIZATION_SEED_DIGESTS.has(authorizationSeedDigest(seed))
);

const validateAuthorizationSeed = (
  seed,
  draft,
  nowMs,
  { allowConsumed = false } = {},
) => {
  try {
    const value = validateAuthorizationSeedStructure(seed, nowMs);
    if (
      !value
      || (!allowConsumed && authorizationSeedIsConsumed(value))
      || validateWelcomeAudioUiAttestedCanaryPacketDraft(
        draft,
        { now_ms: nowMs },
      ).ok !== true
    ) return null;
    const projection = draft.source_projection;
    const anchors = projection.anchors;
    if (
      value.expected_central_repo_head !== draft.central_repo_head
      || value.expected_draft_sha256
        !== computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft)
      || value.expected_projection_sha256
        !== computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(projection)
      || value.expected_operation_id !== draft.operation_id
      || value.expected_authorization_id !== draft.authorization_id
      || value.expected_source_evidence_sha256 !== projection.source_evidence_sha256
      || value.expected_candidate_anchor_sha256 !== anchors.candidate_anchor_sha256
      || value.expected_thread_anchor_sha256 !== anchors.thread_anchor_sha256
      || value.expected_owner_anchor_sha256 !== anchors.owner_anchor_sha256
      || value.expected_dedupe_anchor_sha256 !== anchors.dedupe_anchor_sha256
      || value.expected_audio_sha256 !== draft.approved_audio_sha256
    ) return null;
    return value;
  } catch {
    return null;
  }
};

const consumeAuthorizationSeedOnce = (seed) => {
  const digest = authorizationSeedDigest(seed);
  if (
    CONSUMED_AUTHORIZATION_SEED_NONCES.has(seed.seed_nonce_sha256)
    || CONSUMED_AUTHORIZATION_SEED_DIGESTS.has(digest)
  ) return false;
  CONSUMED_AUTHORIZATION_SEED_NONCES.add(seed.seed_nonce_sha256);
  CONSUMED_AUTHORIZATION_SEED_DIGESTS.add(digest);
  return true;
};

const admitAuthorizationSeedOnceInternal = ({ seed, draft, nowMs }) => {
  let seedSnapshot;
  let draftSnapshot;
  try {
    seedSnapshot = snapshotPlainData(seed);
    draftSnapshot = snapshotPlainData(draft);
  } catch {
    return null;
  }
  const structuredSeed = validateAuthorizationSeedStructure(seedSnapshot, nowMs);
  if (!structuredSeed || !consumeAuthorizationSeedOnce(structuredSeed)) return null;
  const validatedSeed = validateAuthorizationSeed(
    structuredSeed,
    draftSnapshot,
    nowMs,
    { allowConsumed: true },
  );
  if (!validatedSeed) return null;
  const capability = Object.freeze({});
  AUTHORIZATION_SEED_ADMISSIONS.set(capability, validatedSeed);
  return capability;
};

const consumeAuthorizationSeedAdmissionOnce = (capability) => {
  if (
    capability === null
    || typeof capability !== 'object'
    || nodeUtilTypes.isProxy(capability)
  ) return null;
  const seed = AUTHORIZATION_SEED_ADMISSIONS.get(capability) ?? null;
  if (seed) AUTHORIZATION_SEED_ADMISSIONS.delete(capability);
  return seed;
};

const admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnce = (parameters = {}) => {
  const root = exactObject(parameters, AUTHORIZATION_SEED_ADMISSION_FIELDS);
  if (!root) return null;
  return admitAuthorizationSeedOnceInternal({
    seed: root.private_authorization_seed,
    draft: root.private_draft,
    nowMs: Date.now(),
  });
};

const admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnceForTest = (
  parameters = {},
) => {
  const root = exactObject(parameters, AUTHORIZATION_SEED_ADMISSION_TEST_FIELDS);
  if (!root || !isValidNowMs(root.now_ms)) return null;
  return admitAuthorizationSeedOnceInternal({
    seed: root.private_authorization_seed,
    draft: root.private_draft,
    nowMs: root.now_ms,
  });
};

const observationIsExact = ({ observation, seed, nowMs }) => {
  const value = exactObject(observation, OBSERVATION_FIELDS);
  const observedAtMs = Date.parse(value?.observed_at ?? '');
  const audioValidatedAtMs = Date.parse(value?.audio_validated_at ?? '');
  const centralContextCheckedAtMs = Date.parse(value?.central_context_checked_at ?? '');
  const approvedAtMs = Date.parse(seed?.approved_at ?? '');
  return value
    && isExactIso(value.observed_at)
    && isExactIso(value.audio_validated_at)
    && isExactIso(value.central_context_checked_at)
    && observedAtMs <= nowMs
    && audioValidatedAtMs <= observedAtMs
    && centralContextCheckedAtMs <= observedAtMs
    && audioValidatedAtMs >= approvedAtMs
    && centralContextCheckedAtMs >= approvedAtMs
    && nowMs - audioValidatedAtMs < WELCOME_AUDIO_CONTEXT_MAX_AGE_MS
    && nowMs - centralContextCheckedAtMs < WELCOME_AUDIO_CONTEXT_MAX_AGE_MS
    && nowMs - observedAtMs < WELCOME_AUDIO_CONTEXT_MAX_AGE_MS
    ? value
    : null;
};

const buildWelcomeAudioUiAttestedPreclaimBundleInternal = async ({
  root,
  nowMs,
  synthetic,
}) => {
  let draft;
  let seed;
  let seedAlreadyAdmitted = false;
  try {
    draft = snapshotPlainData(root.private_draft);
    seed = consumeAuthorizationSeedAdmissionOnce(root.private_authorization_seed);
    if (seed) seedAlreadyAdmitted = true;
    else seed = snapshotPlainData(root.private_authorization_seed);
  } catch {
    return blocked(WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.INPUT_INVALID);
  }
  if (validateWelcomeAudioUiAttestedCanaryPacketDraft(
    draft,
    { now_ms: nowMs },
  ).ok !== true) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.DRAFT_INVALID,
  );
  if (!seedAlreadyAdmitted) {
    seed = validateAuthorizationSeedStructure(seed, nowMs);
    if (!seed) return blocked(
      WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.AUTHORIZATION_SEED_INVALID,
      { draftValidated: true },
    );
    if (!consumeAuthorizationSeedOnce(seed)) return blocked(
      WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.AUTHORIZATION_SEED_REPLAYED,
      { draftValidated: true },
    );
  }
  seed = validateAuthorizationSeed(seed, draft, nowMs, { allowConsumed: true });
  if (!seed) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.BINDING_INVALID,
    { draftValidated: true },
  );
  if (await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
    private_audio_asset_capability: root.private_audio_asset_capability,
    asset_path: seed.approved_audio_asset_path,
    expected_audio_sha256: draft.approved_audio_sha256,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.AUDIO_CAPABILITY_INVALID,
    { draftValidated: true, authorizationSeedValidated: true },
  );
  const projection = draft.source_projection;
  let observation;
  try {
    const sharedInput = {
      private_preclaim_observation_capability: root.private_preclaim_observation_capability,
      expected_exact_target: projection.notification_row.exact_target_utf8,
      expected_exact_bound_thread_reference: projection.thread.bound_thread_reference_utf8,
      expected_exact_owner_account_reference: projection.owner.owner_account_reference_utf8,
      expected_approved_audio_asset_path: seed.approved_audio_asset_path,
      expected_audio_sha256: seed.expected_audio_sha256,
      expected_central_repo_head: seed.expected_central_repo_head,
      expected_mission_contract_sha256: seed.mission_contract_sha256,
      expected_active_next_action_id: seed.active_next_action_id,
      expected_active_next_action_sha256: seed.active_next_action_sha256,
    };
    if (synthetic) {
      const consumeForTest =
        welcomeAudioSafariLiveHost
          .consumeWelcomeAudioSafariUiAttestedPreclaimObservationCapabilityOnceForTest
        ?? welcomeAudioSafariLiveHost
          .consumeWelcomeAudioSafariUiAttestedPreclaimObservationCapabilityOnce;
      observation = consumeForTest({ ...sharedInput, now_ms: nowMs });
    } else {
      observation = welcomeAudioSafariLiveHost
        .consumeWelcomeAudioSafariUiAttestedPreclaimObservationCapabilityOnce(sharedInput);
    }
  } catch {
    observation = null;
  }
  const observationConsumed = observation !== null;
  observation = observationIsExact({ observation, seed, nowMs });
  if (!observation) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.OBSERVATION_INVALID,
    {
      draftValidated: true,
      authorizationSeedValidated: true,
      audioAssetValidated: true,
      preclaimObservationConsumed: observationConsumed,
    },
  );

  const anchors = projection.anchors;
  const observedAt = observation.observed_at;
  const audioValidatedAt = observation.audio_validated_at;
  const centralContextCheckedAt = observation.central_context_checked_at;
  const zeroDigest = '0'.repeat(64);
  const operationId = draft.operation_id;
  const missionId = draft.mission_id;
  const approvalPacketId = seed.approval_packet_id;
  const assetId = draft.approved_audio_asset_id;
  const assetSha256 = draft.approved_audio_sha256;
  let operationSnapshot = {
    adapter_version: WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
    contract_version: WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
    canonical_operation_sha256: zeroDigest,
    operation: {
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
      profile_anchor_sha256: anchors.profile_anchor_sha256,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      owner_anchor_sha256: anchors.owner_anchor_sha256,
      approved_audio_asset_id: assetId,
      approved_audio_asset_sha256: assetSha256,
      expected_send_count: 1,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: zeroDigest,
    },
    approval: {
      status: 'approved_exact_single_send',
      checked_at: seed.approved_at,
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
      profile_anchor_sha256: anchors.profile_anchor_sha256,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      owner_anchor_sha256: anchors.owner_anchor_sha256,
      approved_audio_asset_id: assetId,
      approved_audio_asset_sha256: assetSha256,
      source_evidence_freshness_max_age_ms: WELCOME_AUDIO_CONTEXT_MAX_AGE_MS,
      expected_send_count: 1,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: zeroDigest,
    },
    execution_surface: {
      surface: WELCOME_AUDIO_SURFACE.STATUS,
      surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
      browser: WELCOME_AUDIO_SURFACE.BROWSER,
      browser_mode: WELCOME_AUDIO_SURFACE.MODE,
      isolation: WELCOME_AUDIO_SURFACE.ISOLATION,
      upload_route: WELCOME_AUDIO_SURFACE.UPLOAD_ROUTE,
      private_browsing: false,
      chrome_upload_attempted: false,
      in_app_browser_upload_attempted: false,
      observed_at: observedAt,
    },
    follower_evidence: {
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
      evidence_observed_at: projection.dedupe.checked_at,
      time_bucket_attestation: 'explicit_visible_not_exact_timestamp',
      source_evidence_freshness_max_age_ms: WELCOME_AUDIO_CONTEXT_MAX_AGE_MS,
      source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
    },
    source_provenance: {
      source_class: WELCOME_AUDIO_SOURCE_CLASS.UI_ATTESTED_FOLLOWER_SOURCE_V1,
      source_evidence_schema_version: projection.schema_version,
      source_evidence_sha256: projection.source_evidence_sha256,
      source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
      source_record_ordinal: projection.notification_row.row_ordinal,
      source_record_cap: 8,
      time_bucket_attestation: 'explicit_visible_not_exact_timestamp',
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
    },
    binding: {
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
      source_to_profile: 'exact',
      profile_to_thread: 'exact',
      follows_owner: projection.profile.follows_owner,
      ambiguity: 'clear',
      source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
      profile_anchor_sha256: anchors.profile_anchor_sha256,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      owner_anchor_sha256: anchors.owner_anchor_sha256,
      observed_at: observedAt,
    },
    eligibility: {
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER,
      audio_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      composer_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      attachment_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      text_fallback: 'forbidden',
      observed_at: observedAt,
    },
    asset: {
      approved_audio_asset_id: assetId,
      approved_audio_asset_sha256: assetSha256,
      asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE,
      preview_status: 'approved_file_validated_before_upload',
      preview_audio_asset_id: assetId,
      preview_audio_asset_sha256: assetSha256,
      preview_thread_anchor_sha256: anchors.thread_anchor_sha256,
      preview_observed_at: audioValidatedAt,
    },
    context: {
      status: 'fresh_exact_central_mission_context',
      checked_at: centralContextCheckedAt,
      central_repo_head: draft.central_repo_head,
      expected_central_repo_head: draft.central_repo_head,
      mission_id: missionId,
      expected_mission_id: missionId,
      mission_status: 'active',
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: zeroDigest,
    },
    dedupe: {
      status: projection.dedupe.status,
      already_welcomed_status: projection.dedupe.already_welcomed_status,
      send_history_status: projection.dedupe.send_history_status,
      checked_at: projection.dedupe.checked_at,
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      owner_anchor_sha256: anchors.owner_anchor_sha256,
      approved_audio_asset_sha256: assetSha256,
    },
    effect_claim: {
      status: WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED,
      claim_result: WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED,
      claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED,
      atomic: false,
      permanent: false,
      claimed_at: null,
      claim_owner_id: null,
      claim_token_id: null,
      registry_revision: null,
      attempt_id: null,
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      owner_anchor_sha256: anchors.owner_anchor_sha256,
      approved_audio_asset_id: assetId,
      approved_audio_asset_sha256: assetSha256,
      canonical_operation_sha256: zeroDigest,
    },
    execution: {
      attempt_budget: 1,
      send_attempt_count: 0,
      attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED,
      send_claim: WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
      retry_requested: false,
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      canonical_operation_sha256: zeroDigest,
      claim_owner_id: null,
      claim_token_id: null,
      claim_registry_revision: null,
      attempt_id: null,
      claim_token_consumed_at: null,
      attempted_at: null,
    },
    confirmation: {
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      operation_id: operationId,
      approval_packet_id: approvalPacketId,
      mission_id: missionId,
      canonical_operation_sha256: zeroDigest,
      candidate_anchor_sha256: anchors.candidate_anchor_sha256,
      thread_anchor_sha256: anchors.thread_anchor_sha256,
      approved_audio_asset_sha256: assetSha256,
      claim_owner_id: null,
      claim_token_id: null,
      claim_registry_revision: null,
      attempt_id: null,
      bound_to_current_operation: false,
      checked_at: null,
    },
  };

  const digest = buildWelcomeAudioCanonicalOperationDigest(operationSnapshot);
  if (!SHA256.test(digest ?? '')) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.DIGEST_INVALID,
    {
      draftValidated: true,
      authorizationSeedValidated: true,
      audioAssetValidated: true,
      preclaimObservationConsumed: true,
      exactBindingsPreserved: true,
    },
  );
  operationSnapshot.canonical_operation_sha256 = digest;
  for (const section of [
    'operation',
    'approval',
    'context',
    'effect_claim',
    'execution',
    'confirmation',
  ]) operationSnapshot[section].canonical_operation_sha256 = digest;
  if (buildWelcomeAudioCanonicalOperationDigest(operationSnapshot) !== digest) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.DIGEST_INVALID,
    {
      draftValidated: true,
      authorizationSeedValidated: true,
      audioAssetValidated: true,
      preclaimObservationConsumed: true,
      exactBindingsPreserved: true,
    },
  );
  operationSnapshot = deepFreeze(operationSnapshot);
  const guard = validateWelcomeAudioOperation(operationSnapshot, {
    expectedCanonicalOperationSha256: digest,
    nowMs,
  });
  if (
    guard?.ok !== true
    || guard?.state_valid !== true
    || guard?.phase !== WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
    || guard?.decision !== WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    || guard?.claim_allowed !== true
    || guard?.send_ready !== false
    || guard?.send_allowed !== false
    || guard?.terminal !== false
    || !Array.isArray(guard?.blockers)
    || guard.blockers.length !== 0
  ) return blocked(WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.GUARD_INVALID, {
    draftValidated: true,
    authorizationSeedValidated: true,
    audioAssetValidated: true,
    preclaimObservationConsumed: true,
    exactBindingsPreserved: true,
    canonicalDigestBound: true,
  });

  const publisherAuthorization = deepFreeze({
    schema_version: 'crm_core_instagram_welcome_audio_ui_attested_live_authorization_input_v1',
    status: 'approved_for_exact_ui_attested_draft_and_audio',
    mission_contract_sha256: seed.mission_contract_sha256,
    active_next_action_id: seed.active_next_action_id,
    active_next_action_sha256: seed.active_next_action_sha256,
    approval_packet_id: seed.approval_packet_id,
    approved_audio_asset_path: seed.approved_audio_asset_path,
    approved_at: seed.approved_at,
    expires_at: seed.expires_at,
    candidate_cap: 1,
    claim_cap: 1,
    pending_cap: 1,
    upload_cap: 1,
    send_cap: 1,
    action_time_confirmation_required: true,
    execution_browser: 'safari',
    text_fallback: 'forbidden',
    campaign_effect_allowed: false,
    mailerlite_effect_allowed: false,
    expected_draft_sha256: seed.expected_draft_sha256,
    expected_projection_sha256: seed.expected_projection_sha256,
    expected_operation_id: seed.expected_operation_id,
    expected_canonical_operation_sha256: digest,
    expected_authorization_id: seed.expected_authorization_id,
    expected_source_evidence_sha256: seed.expected_source_evidence_sha256,
    expected_source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
    expected_profile_anchor_sha256: anchors.profile_anchor_sha256,
    expected_candidate_anchor_sha256: seed.expected_candidate_anchor_sha256,
    expected_thread_anchor_sha256: seed.expected_thread_anchor_sha256,
    expected_owner_anchor_sha256: seed.expected_owner_anchor_sha256,
    expected_dedupe_anchor_sha256: seed.expected_dedupe_anchor_sha256,
    expected_audio_sha256: seed.expected_audio_sha256,
  });
  const receipt = buildReceipt({ built: true });
  if (validateWelcomeAudioUiAttestedPreclaimBuilderReceipt(receipt).ok !== true) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.RECEIPT_INVALID,
    {
      draftValidated: true,
      authorizationSeedValidated: true,
      audioAssetValidated: true,
      preclaimObservationConsumed: true,
      exactBindingsPreserved: true,
      canonicalDigestBound: true,
      guardPreclaimEligible: true,
      publisherAuthorizationIssued: true,
    },
  );
  return Object.freeze({
    private_operation_snapshot: operationSnapshot,
    private_publisher_authorization: publisherAuthorization,
    redacted_receipt: receipt,
  });
};

const buildWelcomeAudioUiAttestedPreclaimBundle = async (parameters = {}) => {
  const root = exactObject(parameters, LIVE_ROOT_FIELDS);
  if (!root) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.INPUT_INVALID,
  );
  return buildWelcomeAudioUiAttestedPreclaimBundleInternal({
    root,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const buildWelcomeAudioUiAttestedPreclaimBundleForTest = async (parameters = {}) => {
  const root = exactObject(parameters, TEST_ROOT_FIELDS);
  if (!root || !isValidNowMs(root.now_ms)) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER.INPUT_INVALID,
  );
  return buildWelcomeAudioUiAttestedPreclaimBundleInternal({
    root,
    nowMs: root.now_ms,
    synthetic: true,
  });
};

export {
  AUTHORIZATION_SEED_FIELDS as WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORIZATION_SEED_FIELDS,
  RECEIPT_FIELDS as WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORIZATION_SEED_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_PRECLAIM_BUILDER_RECEIPT_SCHEMA_VERSION,
  admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnce,
  admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnceForTest,
  buildWelcomeAudioUiAttestedPreclaimBundle,
  buildWelcomeAudioUiAttestedPreclaimBundleForTest,
  validateAuthorizationSeed as validateWelcomeAudioUiAttestedLiveAuthorizationSeed,
  validateWelcomeAudioUiAttestedPreclaimBuilderReceipt,
};
