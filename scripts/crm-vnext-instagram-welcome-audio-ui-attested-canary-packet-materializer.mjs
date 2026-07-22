/**
 * Pure no-live materializer for one UI-attested welcome-audio canary draft.
 *
 * This module consumes data only. It does not read files, inspect a browser,
 * publish live authority, write a registry, issue a claim, or perform an
 * external effect.
 */

import { createHash } from 'node:crypto';
import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  adaptWelcomeAudioUiAttestedFollowerSource,
  validateWelcomeAudioUiAttestedFollowerSourceProjection,
} from './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs';
import {
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3,
  consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce,
  consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest,
  consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce,
  consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest,
  validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4,
} from './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs';

const WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_canary_packet_materializer_v1';
const WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_canary_packet_request_v1';
const WELCOME_AUDIO_UI_ATTESTED_CANARY_DRAFT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_canary_packet_draft_v1';
const WELCOME_AUDIO_UI_ATTESTED_CANARY_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_canary_packet_materializer_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP = 1;

const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2 =
  'crm_core_instagram_welcome_audio_iab_semantic_canary_packet_materializer_v2';
const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_REQUEST_SCHEMA_VERSION_V2 =
  'crm_core_instagram_welcome_audio_iab_semantic_canary_packet_request_v2';
const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DRAFT_SCHEMA_VERSION_V2 =
  'crm_core_instagram_welcome_audio_iab_semantic_canary_packet_draft_v2';
const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_RECEIPT_SCHEMA_VERSION_V2 =
  'crm_core_instagram_welcome_audio_iab_semantic_canary_packet_materializer_receipt_v2';

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_canary_packet_materializer_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_REQUEST_SCHEMA_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_canary_packet_request_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DRAFT_SCHEMA_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_canary_packet_draft_v3';
const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_RECEIPT_SCHEMA_VERSION_V3 =
  'crm_core_instagram_welcome_audio_iab_semantic_historical_canary_packet_materializer_receipt_v3';

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3 = Object.freeze({
  PREPARED: 'prepared_iab_semantic_historical_no_live_unapproved_v3',
  BLOCKED: 'blocked_iab_semantic_historical_no_live_unapproved_v3',
});

const WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3 = Object.freeze({
  INPUT_SCHEMA: 'blocked_iab_historical_canary_v3_input_schema',
  SOURCE_ARTIFACT_CAPABILITY:
    'blocked_iab_historical_canary_v3_source_artifact_capability_invalid_stale_or_replayed',
  CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION:
    'blocked_iab_historical_canary_v3_clock_invalid_after_source_artifact_consumption',
  SOURCE_ARTIFACT: 'blocked_iab_historical_canary_v3_source_artifact_invalid',
  REQUEST_SCHEMA: 'blocked_iab_historical_canary_v3_request_schema',
  SOURCE_PROJECTION: 'blocked_iab_historical_canary_v3_source_projection',
  SOURCE_BINDING: 'blocked_iab_historical_canary_v3_source_binding',
  NONCLAIMS_BINDING: 'blocked_iab_historical_canary_v3_nonclaims_binding',
  POLICY_BINDING: 'blocked_iab_historical_canary_v3_policy_binding',
  AGE_EVIDENCE_BINDING: 'blocked_iab_historical_canary_v3_age_evidence_binding',
  DRAFT_CONTRACT: 'blocked_iab_historical_canary_v3_draft_contract',
  DRAFT_ADMISSION_CAPABILITY:
    'blocked_iab_historical_canary_v3_draft_admission_capability_invalid_stale_or_replayed',
  RECEIPT_CONTRACT: 'blocked_iab_historical_canary_v3_receipt_contract',
});

const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2 = Object.freeze({
  PREPARED: 'prepared_iab_semantic_no_live_unapproved_v2',
  BLOCKED: 'blocked_iab_semantic_no_live_unapproved_v2',
});

const WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2 = Object.freeze({
  INPUT_SCHEMA: 'blocked_iab_canary_v2_input_schema',
  SOURCE_ARTIFACT_CAPABILITY:
    'blocked_iab_canary_v2_source_artifact_capability_invalid_stale_or_replayed',
  CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION:
    'blocked_iab_canary_v2_clock_invalid_after_source_artifact_consumption',
  SOURCE_ARTIFACT: 'blocked_iab_canary_v2_source_artifact_invalid',
  REQUEST_SCHEMA: 'blocked_iab_canary_v2_request_schema',
  SOURCE_PROJECTION: 'blocked_iab_canary_v2_source_projection',
  SOURCE_BINDING: 'blocked_iab_canary_v2_source_binding',
  DRAFT_CONTRACT: 'blocked_iab_canary_v2_draft_contract',
  DRAFT_ADMISSION_CAPABILITY:
    'blocked_iab_canary_v2_draft_admission_capability_invalid_stale_or_replayed',
  RECEIPT_CONTRACT: 'blocked_iab_canary_v2_receipt_contract',
});

const IAB_CANARY_DRAFT_ADMISSION_STATES_V2 = new WeakMap();
const IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST = new WeakMap();
const IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3 = new WeakMap();
const IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST = new WeakMap();

const opaqueIabSemanticCanaryDraftAdmissionCapabilityV2 = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_iab_semantic_canary_draft_admission_capability_v2')]: {
      value: true,
      enumerable: false,
    },
    toJSON: {
      value: () => {
        throw new TypeError('canary_draft_admission_capability_not_serializable');
      },
      enumerable: false,
    },
    clone_guard: {
      value: Symbol('opaque_canary_draft_admission_capability_v2'),
      enumerable: true,
    },
  });
  return Object.freeze(capability);
};

const opaqueIabSemanticHistoricalCanaryDraftAdmissionCapabilityV3 = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_iab_semantic_historical_canary_draft_admission_capability_v3')]: {
      value: true,
      enumerable: false,
    },
    toJSON: {
      value: () => {
        throw new TypeError('historical_canary_draft_admission_capability_not_serializable');
      },
      enumerable: false,
    },
    clone_guard: {
      value: Symbol('opaque_historical_canary_draft_admission_capability_v3'),
      enumerable: true,
    },
  });
  return Object.freeze(capability);
};

const WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION = Object.freeze({
  PREPARED: 'prepared_no_live_unapproved',
  BLOCKED: 'blocked_no_live_unapproved',
});

const WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER = Object.freeze({
  INPUT_SCHEMA: 'blocked_materializer_input_schema',
  REQUEST_SCHEMA: 'blocked_materializer_request_schema',
  SOURCE_PROJECTION: 'blocked_materializer_source_projection',
  SOURCE_BINDING: 'blocked_materializer_source_binding',
  AUDIO_BINDING: 'blocked_materializer_audio_binding',
  LIVE_AUTHORITY_REQUESTED: 'blocked_materializer_live_authority_requested',
  DRAFT_CONTRACT: 'blocked_materializer_draft_contract',
  RECEIPT_CONTRACT: 'blocked_materializer_receipt_contract',
});

const ROOT_FIELDS = Object.freeze([
  'ui_attested_input',
  'packet_request',
  'now_ms',
]);

const REQUEST_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_id',
  'contract_version',
  'central_repo_head',
  'authorization_id',
  'expected_source_mission_id',
  'candidate_cap',
  'future_attempt_cap',
  'approved_audio_asset_id',
  'approved_audio_sha256',
  'approved_audio_binding_evidence',
  'execution_approval_authorized',
  'external_effect_authorized',
]);

const DRAFT_FIELDS = Object.freeze([
  'schema_version',
  'materializer_contract_version',
  'status',
  'mission_id',
  'contract_version',
  'central_repo_head',
  'authorization_id',
  'source_mission_id',
  'candidate_cap',
  'future_attempt_cap',
  'operation_id',
  'source_projection',
  'approved_audio_asset_id',
  'approved_audio_sha256',
  'approved_audio_binding_evidence',
  'registry_precondition',
  'source_execution',
  'canary_ready',
  'production_ready',
  'execution_approval_published',
  'registry_written',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'live_authority',
  'browser_used',
  'network_used',
  'external_effect_invoked',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'materializer_contract_version',
  'redaction_status',
  'decision',
  'candidate_count',
  'candidate_cap',
  'projection_validated',
  'exact_binding_preserved',
  'nonclaims_preserved',
  'draft_issued',
  'source_execution',
  'canary_ready',
  'production_ready',
  'execution_approval_published',
  'registry_written',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'live_authority',
  'browser_used',
  'network_used',
  'external_effect_invoked',
  'blocker_codes',
]);

const RECEIPT_BOOLEAN_FIELDS = Object.freeze([
  'projection_validated',
  'exact_binding_preserved',
  'nonclaims_preserved',
  'draft_issued',
  'source_execution',
  'canary_ready',
  'production_ready',
  'execution_approval_published',
  'registry_written',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'live_authority',
  'browser_used',
  'network_used',
  'external_effect_invoked',
]);

const BLOCKER_CODES = new Set(Object.values(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER));
const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/;

const isPlainDataObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeUtilTypes.isProxy(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
);

const exactObject = (value, fields) => {
  if (!isPlainDataObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== fields.length
    || keys.some((key) => typeof key !== 'string')
    || fields.some((field) => !Object.hasOwn(descriptors, field))
    || keys.some((key) => !fields.includes(key))
    || keys.some((key) => descriptors[key].get || descriptors[key].set)
  ) return null;
  return Object.freeze(Object.fromEntries(fields.map((field) => [field, descriptors[field].value])));
};

const snapshotStringArray = (value) => {
  if (!Array.isArray(value) || nodeUtilTypes.isProxy(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (!Number.isInteger(length) || length < 0) return null;
  const expectedKeys = Array.from({ length }, (_, index) => String(index));
  const descriptorKeys = Reflect.ownKeys(descriptors);
  if (descriptorKeys.some((key) => typeof key !== 'string')) return null;
  const dataKeys = descriptorKeys.filter((key) => key !== 'length');
  if (
    dataKeys.length !== expectedKeys.length
    || dataKeys.some((key, index) => key !== expectedKeys[index])
    || expectedKeys.some((key) => descriptors[key].get || descriptors[key].set)
    || expectedKeys.some((key) => typeof descriptors[key].value !== 'string')
  ) return null;
  return Object.freeze(expectedKeys.map((key) => descriptors[key].value));
};

const snapshotPlainData = (value) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    if (nodeUtilTypes.isProxy(value)) throw new TypeError('unsafe_array');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    const keys = Reflect.ownKeys(descriptors);
    const expected = [...Array.from({ length }, (_, index) => String(index)), 'length'];
    if (
      !Number.isInteger(length)
      || length < 0
      || keys.length !== expected.length
      || keys.some((key, index) => key !== expected[index])
      || keys.some((key) => key !== 'length' && (descriptors[key].get || descriptors[key].set))
    ) throw new TypeError('unsafe_array');
    return Object.freeze(Array.from({ length }, (_, index) => (
      snapshotPlainData(descriptors[String(index)].value)
    )));
  }
  if (!isPlainDataObject(value)) throw new TypeError('unsafe_object');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== 'string')
    || keys.some((key) => descriptors[key].get || descriptors[key].set)
  ) throw new TypeError('unsafe_object');
  return Object.freeze(Object.fromEntries(keys.map((key) => [
    key,
    snapshotPlainData(descriptors[key].value),
  ])));
};

const isCleanString = (value) => (
  typeof value === 'string'
  && value.length > 0
  && value === value.trim()
  && !/[\u0000-\u001f\u007f]/u.test(value)
);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainDataObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};

const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const fixedFalseFlags = Object.freeze({
  source_execution: false,
  canary_ready: false,
  production_ready: false,
  execution_approval_published: false,
  registry_written: false,
  claim_issued: false,
  pending_effect_recorded: false,
  send_allowed: false,
  live_authority: false,
  browser_used: false,
  network_used: false,
  external_effect_invoked: false,
});

const buildReceipt = ({ prepared = false, blockerCodes = [] } = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_CANARY_RECEIPT_SCHEMA_VERSION,
  materializer_contract_version: WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION,
  redaction_status: 'aggregate_allowlist_only_no_private_values_times_buckets_paths_anchors_or_digests',
  decision: prepared
    ? WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED
    : WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.BLOCKED,
  candidate_count: prepared ? 1 : 0,
  candidate_cap: WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP,
  projection_validated: prepared,
  exact_binding_preserved: prepared,
  nonclaims_preserved: prepared,
  draft_issued: prepared,
  ...fixedFalseFlags,
  blocker_codes: Object.freeze([...new Set(blockerCodes)]),
});

const blocked = (...blockerCodes) => Object.freeze({
  private_draft: null,
  redacted_receipt: buildReceipt({ blockerCodes }),
});

const validateRequest = (value) => {
  const request = exactObject(value, REQUEST_FIELDS);
  if (!request) return null;
  const stringsValid = [
    request.mission_id,
    request.contract_version,
    request.authorization_id,
    request.expected_source_mission_id,
    request.approved_audio_asset_id,
    request.approved_audio_binding_evidence,
  ].every(isCleanString);
  if (
    request.schema_version !== WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION
    || request.status !== 'approved_for_no_live_materialization_only'
    || !stringsValid
    || typeof request.central_repo_head !== 'string'
    || !GIT_SHA.test(request.central_repo_head)
    || !OPAQUE_ID.test(request.authorization_id)
    || request.candidate_cap !== WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP
    || request.future_attempt_cap !== 1
    || typeof request.approved_audio_sha256 !== 'string'
    || !SHA256.test(request.approved_audio_sha256)
    || request.approved_audio_binding_evidence !== 'exact_approved_audio_binding_revalidated'
    || request.execution_approval_authorized !== false
    || request.external_effect_authorized !== false
  ) return null;
  return request;
};

const operationIdFor = (draftWithoutOperationId) => (
  `ui_attested_canary_draft_${sha256(canonicalJson(draftWithoutOperationId))}`
);

const validateWelcomeAudioUiAttestedCanaryPacketDraft = (draft, options = {}) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.DRAFT_CONTRACT,
  });
  try {
    const v2Result = validateWelcomeAudioIabSemanticCanaryPacketDraftV2(
      draft,
      options,
    );
    if (v2Result.ok === true) return v2Result;
    const root = exactObject(draft, DRAFT_FIELDS);
    const safeOptions = exactObject(options, ['now_ms']);
    const nowMs = safeOptions?.now_ms;
    if (!root || !safeOptions || !Number.isFinite(nowMs) || nowMs < 0) return invalid();
    if (validateWelcomeAudioUiAttestedFollowerSourceProjection(
      root.source_projection,
      { nowMs },
    ).ok !== true) return invalid();
    const projection = snapshotPlainData(root.source_projection);
    if (
      root.schema_version !== WELCOME_AUDIO_UI_ATTESTED_CANARY_DRAFT_SCHEMA_VERSION
      || root.materializer_contract_version
        !== WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION
      || root.status !== WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED
      || !isCleanString(root.mission_id)
      || !isCleanString(root.contract_version)
      || typeof root.central_repo_head !== 'string'
      || !GIT_SHA.test(root.central_repo_head)
      || typeof root.authorization_id !== 'string'
      || !OPAQUE_ID.test(root.authorization_id)
      || root.candidate_cap !== 1
      || root.future_attempt_cap !== 1
      || !isCleanString(root.approved_audio_asset_id)
      || typeof root.approved_audio_sha256 !== 'string'
      || !SHA256.test(root.approved_audio_sha256)
      || root.approved_audio_binding_evidence !== 'exact_approved_audio_binding_revalidated'
      || root.registry_precondition !== 'empty_or_valid_revalidate_in_later_live_mission'
      || Object.entries(fixedFalseFlags).some(([key, value]) => root[key] !== value)
      || !isCleanString(root.source_mission_id)
      || projection.mission_id !== root.source_mission_id
      || projection.exact_follow_timestamp_claimed !== false
      || projection.provider_event_id_claimed !== false
      || projection.campaign_membership_claimed !== false
    ) return invalid();
    const { operation_id: operationId, ...withoutOperationIdRaw } = root;
    if (typeof operationId !== 'string') return invalid();
    const withoutOperationId = {
      ...withoutOperationIdRaw,
      source_projection: projection,
    };
    if (operationId !== operationIdFor(withoutOperationId)) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const validateWelcomeAudioUiAttestedCanaryPacketReceipt = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.RECEIPT_CONTRACT,
  });
  try {
    const root = exactObject(receipt, RECEIPT_FIELDS);
    const blockerCodes = root ? snapshotStringArray(root.blocker_codes) : null;
    if (!root || !blockerCodes) return invalid();
    const prepared = root.decision === WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED;
    const fixedValid = root.receipt_schema_version
        === WELCOME_AUDIO_UI_ATTESTED_CANARY_RECEIPT_SCHEMA_VERSION
      && root.materializer_contract_version
        === WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION
      && root.redaction_status
        === 'aggregate_allowlist_only_no_private_values_times_buckets_paths_anchors_or_digests'
      && Object.values(WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION).includes(root.decision)
      && root.candidate_count === (prepared ? 1 : 0)
      && root.candidate_cap === 1
      && RECEIPT_BOOLEAN_FIELDS.every((field) => typeof root[field] === 'boolean')
      && Object.entries(fixedFalseFlags).every(([key, value]) => root[key] === value)
      && blockerCodes.every((code) => BLOCKER_CODES.has(code))
      && new Set(blockerCodes).size === blockerCodes.length;
    if (!fixedValid) return invalid();
    const preparedFlags = [
      root.projection_validated,
      root.exact_binding_preserved,
      root.nonclaims_preserved,
      root.draft_issued,
    ];
    const semanticsValid = prepared
      ? preparedFlags.every(Boolean) && blockerCodes.length === 0
      : preparedFlags.every((value) => value === false) && blockerCodes.length >= 1;
    return semanticsValid ? Object.freeze({ ok: true, reason: null }) : invalid();
  } catch {
    return invalid();
  }
};

const materializeWelcomeAudioUiAttestedCanaryPacketDraft = (input) => {
  try {
    const root = exactObject(input, ROOT_FIELDS);
    if (!root || !Number.isFinite(root.now_ms) || root.now_ms < 0) {
      return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.INPUT_SCHEMA);
    }
    const request = validateRequest(root.packet_request);
    if (!request) return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.REQUEST_SCHEMA);
    let safeSourceInput;
    try {
      safeSourceInput = snapshotPlainData(root.ui_attested_input);
    } catch {
      return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.SOURCE_PROJECTION);
    }
    const source = adaptWelcomeAudioUiAttestedFollowerSource(
      safeSourceInput,
      { nowMs: root.now_ms },
    );
    if (!source.private_projection) {
      return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.SOURCE_PROJECTION);
    }
    const projection = source.private_projection;
    if (
      projection.mission_id !== request.expected_source_mission_id
    ) return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.SOURCE_BINDING);
    const draftWithoutOperationId = {
      schema_version: WELCOME_AUDIO_UI_ATTESTED_CANARY_DRAFT_SCHEMA_VERSION,
      materializer_contract_version:
        WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION,
      status: WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION.PREPARED,
      mission_id: request.mission_id,
      contract_version: request.contract_version,
      central_repo_head: request.central_repo_head,
      authorization_id: request.authorization_id,
      source_mission_id: request.expected_source_mission_id,
      candidate_cap: request.candidate_cap,
      future_attempt_cap: request.future_attempt_cap,
      source_projection: projection,
      approved_audio_asset_id: request.approved_audio_asset_id,
      approved_audio_sha256: request.approved_audio_sha256,
      approved_audio_binding_evidence: request.approved_audio_binding_evidence,
      registry_precondition: 'empty_or_valid_revalidate_in_later_live_mission',
      ...fixedFalseFlags,
    };
    const draft = deepFreeze({
      ...draftWithoutOperationId,
      operation_id: operationIdFor(draftWithoutOperationId),
    });
    if (validateWelcomeAudioUiAttestedCanaryPacketDraft(
      draft,
      { now_ms: root.now_ms },
    ).ok !== true) return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.DRAFT_CONTRACT);
    const receipt = buildReceipt({ prepared: true });
    if (validateWelcomeAudioUiAttestedCanaryPacketReceipt(receipt).ok !== true) {
      return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.RECEIPT_CONTRACT);
    }
    return Object.freeze({ private_draft: draft, redacted_receipt: receipt });
  } catch {
    return blocked(WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER.INPUT_SCHEMA);
  }
};

const IAB_CANARY_DRAFT_FIELDS_V2 = Object.freeze([
  ...DRAFT_FIELDS,
  'source_artifact_schema_version',
  'source_expires_at',
]);

const IAB_CANARY_RECEIPT_FIELDS_V2 = Object.freeze([
  'receipt_schema_version',
  'materializer_contract_version',
  'redaction_status',
  'decision',
  'candidate_count',
  'candidate_cap',
  'source_artifact_capability_consumed',
  'source_artifact_validated',
  'source_expiry_inherited',
  'projection_validated',
  'exact_binding_preserved',
  'nonclaims_preserved',
  'draft_issued',
  'draft_admission_capability_issued',
  'source_execution',
  'canary_ready',
  'production_ready',
  'execution_approval_published',
  'registry_written',
  'claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'live_authority',
  'browser_used',
  'network_used',
  'external_effect_invoked',
  'blocker_codes',
]);

const isExactIsoV2 = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const isValidNowMsV2 = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const validateIabSemanticCanaryRequestV2 = (value) => {
  const request = exactObject(value, REQUEST_FIELDS);
  if (!request) return null;
  const stringsValid = [
    request.mission_id,
    request.contract_version,
    request.authorization_id,
    request.expected_source_mission_id,
    request.approved_audio_asset_id,
    request.approved_audio_binding_evidence,
  ].every(isCleanString);
  if (
    request.schema_version !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_REQUEST_SCHEMA_VERSION_V2
    || request.status !== 'approved_for_no_live_materialization_only'
    || !stringsValid
    || typeof request.central_repo_head !== 'string'
    || !GIT_SHA.test(request.central_repo_head)
    || !OPAQUE_ID.test(request.authorization_id)
    || request.candidate_cap !== WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP
    || request.future_attempt_cap !== 1
    || typeof request.approved_audio_sha256 !== 'string'
    || !SHA256.test(request.approved_audio_sha256)
    || request.approved_audio_binding_evidence
      !== 'exact_approved_audio_binding_revalidated'
    || request.execution_approval_authorized !== false
    || request.external_effect_authorized !== false
  ) return null;
  return request;
};

const operationIdForIabSemanticDraftV2 = (draftWithoutOperationId) => (
  `iab_semantic_canary_draft_v2_${sha256(canonicalJson(draftWithoutOperationId))}`
);

const validateWelcomeAudioIabSemanticCanaryPacketDraftV2 = (
  draft,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.DRAFT_CONTRACT,
  });
  try {
    const safeDraft = snapshotPlainData(draft);
    const root = exactObject(safeDraft, IAB_CANARY_DRAFT_FIELDS_V2);
    const safeOptions = exactObject(options, ['now_ms']);
    const nowMs = safeOptions?.now_ms;
    const expiresAtMs = Date.parse(root?.source_expires_at ?? '');
    if (
      !root
      || !safeOptions
      || !Number.isSafeInteger(nowMs)
      || nowMs < 0
      || !isExactIsoV2(root.source_expires_at)
      || expiresAtMs <= nowMs
      || root.schema_version !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DRAFT_SCHEMA_VERSION_V2
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2
      || root.status !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2.PREPARED
      || root.source_artifact_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3
      || !isCleanString(root.mission_id)
      || !isCleanString(root.contract_version)
      || typeof root.central_repo_head !== 'string'
      || !GIT_SHA.test(root.central_repo_head)
      || typeof root.authorization_id !== 'string'
      || !OPAQUE_ID.test(root.authorization_id)
      || root.candidate_cap !== 1
      || root.future_attempt_cap !== 1
      || !isCleanString(root.approved_audio_asset_id)
      || typeof root.approved_audio_sha256 !== 'string'
      || !SHA256.test(root.approved_audio_sha256)
      || root.approved_audio_binding_evidence
        !== 'exact_approved_audio_binding_revalidated'
      || root.registry_precondition
        !== 'empty_or_valid_revalidate_in_later_live_mission'
      || Object.entries(fixedFalseFlags).some(([key, value]) => root[key] !== value)
      || !isCleanString(root.source_mission_id)
      || validateWelcomeAudioUiAttestedFollowerSourceProjection(
        root.source_projection,
        { nowMs },
      ).ok !== true
    ) return invalid();
    const projection = snapshotPlainData(root.source_projection);
    if (
      projection.mission_id !== root.source_mission_id
      || projection.exact_follow_timestamp_claimed !== false
      || projection.provider_event_id_claimed !== false
      || projection.campaign_membership_claimed !== false
    ) return invalid();
    const { operation_id: operationId, ...withoutOperationIdRaw } = root;
    if (typeof operationId !== 'string') return invalid();
    const withoutOperationId = {
      ...withoutOperationIdRaw,
      source_projection: projection,
    };
    if (operationId !== operationIdForIabSemanticDraftV2(withoutOperationId)) {
      return invalid();
    }
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const buildIabSemanticCanaryReceiptV2 = ({
  prepared = false,
  sourceArtifactCapabilityConsumed = false,
  blockerCodes = [],
} = {}) => (
  Object.freeze({
    receipt_schema_version: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_RECEIPT_SCHEMA_VERSION_V2,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2,
    redaction_status:
      'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads',
    decision: prepared
      ? WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2.PREPARED
      : WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2.BLOCKED,
    candidate_count: prepared ? 1 : 0,
    candidate_cap: 1,
    source_artifact_capability_consumed:
      prepared || sourceArtifactCapabilityConsumed === true,
    source_artifact_validated: prepared,
    source_expiry_inherited: prepared,
    projection_validated: prepared,
    exact_binding_preserved: prepared,
    nonclaims_preserved: prepared,
    draft_issued: prepared,
    draft_admission_capability_issued: prepared,
    ...fixedFalseFlags,
    blocker_codes: Object.freeze([...new Set(blockerCodes)]),
  })
);

const validateWelcomeAudioIabSemanticCanaryPacketReceiptV2 = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.RECEIPT_CONTRACT,
  });
  try {
    const root = exactObject(
      snapshotPlainData(receipt),
      IAB_CANARY_RECEIPT_FIELDS_V2,
    );
    if (!root || !Array.isArray(root.blocker_codes)) return invalid();
    const prepared = root.decision
      === WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2.PREPARED;
    const blockerSet = new Set(Object.values(WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2));
    const booleans = IAB_CANARY_RECEIPT_FIELDS_V2.filter((field) => ![
      'receipt_schema_version',
      'materializer_contract_version',
      'redaction_status',
      'decision',
      'candidate_count',
      'candidate_cap',
      'blocker_codes',
    ].includes(field));
    const completedMilestoneBooleans = [
      'source_artifact_validated',
      'source_expiry_inherited',
      'projection_validated',
      'exact_binding_preserved',
      'nonclaims_preserved',
      'draft_issued',
      'draft_admission_capability_issued',
    ];
    const blocker = root.blocker_codes[0];
    const preConsumptionBlocker = blocker
      === WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.INPUT_SCHEMA
      || blocker === WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2
        .SOURCE_ARTIFACT_CAPABILITY;
    const consumptionProgressValid = root.source_artifact_capability_consumed
      === (prepared || !preConsumptionBlocker);
    if (
      root.receipt_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_RECEIPT_SCHEMA_VERSION_V2
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2
      || root.redaction_status
        !== 'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads'
      || !Object.values(WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2)
        .includes(root.decision)
      || root.candidate_count !== (prepared ? 1 : 0)
      || root.candidate_cap !== 1
      || booleans.some((field) => typeof root[field] !== 'boolean')
      || !consumptionProgressValid
      || completedMilestoneBooleans.some((field) => root[field] !== prepared)
      || Object.entries(fixedFalseFlags).some(([key, value]) => root[key] !== value)
      || root.blocker_codes.length !== (prepared ? 0 : 1)
      || root.blocker_codes.some((code) => !blockerSet.has(code))
      || new Set(root.blocker_codes).size !== root.blocker_codes.length
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const blockedIabSemanticCanaryV2 = (
  blocker,
  { sourceArtifactCapabilityConsumed = false } = {},
) => Object.freeze({
  private_draft: null,
  private_draft_admission_capability: null,
  redacted_receipt: buildIabSemanticCanaryReceiptV2({
    sourceArtifactCapabilityConsumed,
    blockerCodes: [blocker],
  }),
});

const issueIabSemanticCanaryDraftAdmissionCapabilityV2 = ({
  privateDraft,
  expiresAtMs,
  nowMs,
  synthetic,
}) => {
  if (expiresAtMs <= nowMs) return null;
  const capability = opaqueIabSemanticCanaryDraftAdmissionCapabilityV2();
  const registry = synthetic
    ? IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST
    : IAB_CANARY_DRAFT_ADMISSION_STATES_V2;
  registry.set(capability, {
    consumed: false,
    privateDraft,
    expiresAtMs,
  });
  return capability;
};

const materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceInternal = ({
  privateSourceArtifactCapability,
  packetRequest,
  nowMs,
  synthetic,
}) => {
  let consumed;
  try {
    const consumeArtifactCapability = synthetic
      ? consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest
      : consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce;
    consumed = consumeArtifactCapability({
      private_source_artifact_capability: privateSourceArtifactCapability,
    });
  } catch {
    consumed = null;
  }
  if (!consumed?.private_artifact) return blockedIabSemanticCanaryV2(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.SOURCE_ARTIFACT_CAPABILITY,
  );
  const blockedAfterSourceArtifactConsumption = (blocker) => (
    blockedIabSemanticCanaryV2(blocker, {
      sourceArtifactCapabilityConsumed: true,
    })
  );
  if (!isValidNowMsV2(nowMs)) {
    return blockedAfterSourceArtifactConsumption(
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2
        .CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION,
    );
  }
  let artifact;
  try {
    artifact = snapshotPlainData(consumed.private_artifact);
  } catch {
    return blockedAfterSourceArtifactConsumption(
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.SOURCE_ARTIFACT,
    );
  }
  if (
    artifact?.schema_version !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3
    || !isExactIsoV2(artifact?.source_expires_at)
    || Date.parse(artifact.source_expires_at) <= nowMs
  ) return blockedAfterSourceArtifactConsumption(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.SOURCE_ARTIFACT,
  );
  const request = validateIabSemanticCanaryRequestV2(packetRequest);
  if (!request) return blockedAfterSourceArtifactConsumption(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.REQUEST_SCHEMA,
  );
  let source;
  try {
    source = adaptWelcomeAudioUiAttestedFollowerSource(
      snapshotPlainData(artifact.ui_attested_input),
      { nowMs },
    );
  } catch {
    source = null;
  }
  if (
    !source?.private_projection
    || validateWelcomeAudioUiAttestedFollowerSourceProjection(
      source.private_projection,
      { nowMs },
    ).ok !== true
  ) return blockedAfterSourceArtifactConsumption(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.SOURCE_PROJECTION,
  );
  const projection = source.private_projection;
  if (projection.mission_id !== request.expected_source_mission_id) {
    return blockedAfterSourceArtifactConsumption(
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.SOURCE_BINDING,
    );
  }
  const draftWithoutOperationId = {
    schema_version: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DRAFT_SCHEMA_VERSION_V2,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2,
    status: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2.PREPARED,
    mission_id: request.mission_id,
    contract_version: request.contract_version,
    central_repo_head: request.central_repo_head,
    authorization_id: request.authorization_id,
    source_mission_id: request.expected_source_mission_id,
    candidate_cap: request.candidate_cap,
    future_attempt_cap: request.future_attempt_cap,
    source_projection: projection,
    approved_audio_asset_id: request.approved_audio_asset_id,
    approved_audio_sha256: request.approved_audio_sha256,
    approved_audio_binding_evidence: request.approved_audio_binding_evidence,
    registry_precondition: 'empty_or_valid_revalidate_in_later_live_mission',
    ...fixedFalseFlags,
    source_artifact_schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SCHEMA_VERSION_V3,
    source_expires_at: artifact.source_expires_at,
  };
  const draft = deepFreeze({
    ...draftWithoutOperationId,
    operation_id: operationIdForIabSemanticDraftV2(draftWithoutOperationId),
  });
  if (validateWelcomeAudioIabSemanticCanaryPacketDraftV2(
    draft,
    { now_ms: nowMs },
  ).ok !== true) return blockedAfterSourceArtifactConsumption(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.DRAFT_CONTRACT,
  );
  const capability = issueIabSemanticCanaryDraftAdmissionCapabilityV2({
    privateDraft: draft,
    expiresAtMs: Date.parse(artifact.source_expires_at),
    nowMs,
    synthetic,
  });
  if (!capability) return blockedAfterSourceArtifactConsumption(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.DRAFT_ADMISSION_CAPABILITY,
  );
  const receipt = buildIabSemanticCanaryReceiptV2({ prepared: true });
  if (validateWelcomeAudioIabSemanticCanaryPacketReceiptV2(receipt).ok !== true) {
    return blockedAfterSourceArtifactConsumption(
      WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.RECEIPT_CONTRACT,
    );
  }
  return Object.freeze({
    private_draft: draft,
    private_draft_admission_capability: capability,
    redacted_receipt: receipt,
  });
};

const materializeWelcomeAudioIabSemanticCanaryPacketDraftOnce = (
  parameters = {},
) => {
  const root = exactObject(parameters, [
    'private_source_artifact_capability',
    'packet_request',
  ]);
  if (!root) return blockedIabSemanticCanaryV2(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.INPUT_SCHEMA,
  );
  return materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceInternal({
    privateSourceArtifactCapability: root.private_source_artifact_capability,
    packetRequest: root.packet_request,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceForTest = (
  parameters = {},
) => {
  const root = exactObject(parameters, [
    'private_source_artifact_capability',
    'packet_request',
    'now_ms',
  ]);
  if (!root) return blockedIabSemanticCanaryV2(
    WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2.INPUT_SCHEMA,
  );
  return materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceInternal({
    privateSourceArtifactCapability: root.private_source_artifact_capability,
    packetRequest: root.packet_request,
    nowMs: root.now_ms,
    synthetic: true,
  });
};

const consumeIabSemanticCanaryDraftAdmissionCapabilityOnceInternal = (
  parameters,
  requiredSyntheticMode,
) => {
  const root = exactObject(parameters, ['private_draft_admission_capability']);
  if (!root) return null;
  const registry = requiredSyntheticMode
    ? IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST
    : IAB_CANARY_DRAFT_ADMISSION_STATES_V2;
  const crossModeRegistry = requiredSyntheticMode
    ? IAB_CANARY_DRAFT_ADMISSION_STATES_V2
    : IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST;
  const historicalRegistry = requiredSyntheticMode
    ? IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST
    : IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3;
  const historicalCrossModeRegistry = requiredSyntheticMode
    ? IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3
    : IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST;
  const capability = root.private_draft_admission_capability;
  const state = registry.get(capability);
  const crossModeState = crossModeRegistry.get(capability);
  const historicalState = historicalRegistry.get(capability);
  const historicalCrossModeState = historicalCrossModeRegistry.get(capability);
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
    || validateWelcomeAudioIabSemanticCanaryPacketDraftV2(
      state.privateDraft,
      { now_ms: nowMs },
    ).ok !== true
  ) return null;
  return Object.freeze({ private_draft: state.privateDraft });
};

const consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnce = (
  parameters = {},
) => consumeIabSemanticCanaryDraftAdmissionCapabilityOnceInternal(
  parameters,
  false,
);

const consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnceForTest = (
  parameters = {},
) => consumeIabSemanticCanaryDraftAdmissionCapabilityOnceInternal(
  parameters,
  true,
);

const IAB_HISTORICAL_CANARY_DRAFT_FIELDS_V3 = Object.freeze([
  ...IAB_CANARY_DRAFT_FIELDS_V2,
  'selection_policy',
  'age_evidence_raw',
  'age_evidence_kind',
  'age_bucket',
  'actual_elapsed_age_claimed',
  'preclaim_issued',
]);

const IAB_HISTORICAL_CANARY_RECEIPT_FIELDS_V3 = Object.freeze([
  ...IAB_CANARY_RECEIPT_FIELDS_V2,
  'source_artifact_capability_retirement_attested',
  'historical_policy_bound',
  'age_evidence_bound',
  'preclaim_issued',
]);

const IAB_HISTORICAL_CANARY_PROGRESS_FIELDS_V3 = Object.freeze([
  'source_artifact_capability_consumed',
  'source_artifact_validated',
  'source_expiry_inherited',
  'projection_validated',
  'exact_binding_preserved',
  'nonclaims_preserved',
  'historical_policy_bound',
  'age_evidence_bound',
  'draft_issued',
  'draft_admission_capability_issued',
]);

const IAB_HISTORICAL_DAY_LABEL_V3 =
  /^(?:[89]|[12][0-9]|30)\s*(?:d|day|days|día|días)$/iu;
const IAB_HISTORICAL_WEEK_LABEL_V3 =
  /^[1-4]\s*(?:w|week|weeks|sem|semana|semanas)$/iu;

const classifyIabHistoricalAgeEvidenceV3 = (value) => {
  if (
    typeof value !== 'string'
    || value.length < 1
    || value.length > 80
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) return null;
  const ageEvidenceKind = IAB_HISTORICAL_DAY_LABEL_V3.test(value)
    ? 'displayed_day'
    : IAB_HISTORICAL_WEEK_LABEL_V3.test(value)
      ? 'coarse_week'
      : null;
  if (ageEvidenceKind === null) return null;
  const ageBucket = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(ageBucket)) return null;
  return Object.freeze({
    age_evidence_raw: value,
    age_evidence_kind: ageEvidenceKind,
    age_bucket: ageBucket,
  });
};

const historicalFixedFalseFlagsV3 = Object.freeze({
  ...fixedFalseFlags,
  preclaim_issued: false,
});

const validateIabSemanticHistoricalCanaryRequestV3 = (value) => {
  const request = exactObject(value, REQUEST_FIELDS);
  if (!request) return null;
  const stringsValid = [
    request.mission_id,
    request.contract_version,
    request.authorization_id,
    request.expected_source_mission_id,
    request.approved_audio_asset_id,
    request.approved_audio_binding_evidence,
  ].every(isCleanString);
  if (
    request.schema_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_REQUEST_SCHEMA_VERSION_V3
    || request.status !== 'approved_for_no_live_materialization_only'
    || !stringsValid
    || typeof request.central_repo_head !== 'string'
    || !GIT_SHA.test(request.central_repo_head)
    || !OPAQUE_ID.test(request.authorization_id)
    || request.candidate_cap !== WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP
    || request.future_attempt_cap !== 1
    || typeof request.approved_audio_sha256 !== 'string'
    || !SHA256.test(request.approved_audio_sha256)
    || request.approved_audio_binding_evidence
      !== 'exact_approved_audio_binding_revalidated'
    || request.execution_approval_authorized !== false
    || request.external_effect_authorized !== false
  ) return null;
  return request;
};

const operationIdForIabSemanticHistoricalDraftV3 = (draftWithoutOperationId) => (
  `iab_semantic_historical_canary_draft_v3_${sha256(canonicalJson(draftWithoutOperationId))}`
);

const validateWelcomeAudioIabSemanticHistoricalCanaryPacketDraftV3 = (
  draft,
  options = {},
) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.DRAFT_CONTRACT,
  });
  try {
    const root = exactObject(
      snapshotPlainData(draft),
      IAB_HISTORICAL_CANARY_DRAFT_FIELDS_V3,
    );
    const safeOptions = exactObject(options, ['now_ms']);
    const nowMs = safeOptions?.now_ms;
    const expiresAtMs = Date.parse(root?.source_expires_at ?? '');
    const ageEvidence = classifyIabHistoricalAgeEvidenceV3(root?.age_evidence_raw);
    if (
      !root
      || !safeOptions
      || !Number.isSafeInteger(nowMs)
      || nowMs < 0
      || !isExactIsoV2(root.source_expires_at)
      || expiresAtMs <= nowMs
      || root.schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DRAFT_SCHEMA_VERSION_V3
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3
      || root.status !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3.PREPARED
      || root.source_artifact_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4
      || !isCleanString(root.mission_id)
      || !isCleanString(root.contract_version)
      || typeof root.central_repo_head !== 'string'
      || !GIT_SHA.test(root.central_repo_head)
      || typeof root.authorization_id !== 'string'
      || !OPAQUE_ID.test(root.authorization_id)
      || root.candidate_cap !== 1
      || root.future_attempt_cap !== 1
      || !isCleanString(root.approved_audio_asset_id)
      || typeof root.approved_audio_sha256 !== 'string'
      || !SHA256.test(root.approved_audio_sha256)
      || root.approved_audio_binding_evidence
        !== 'exact_approved_audio_binding_revalidated'
      || root.registry_precondition
        !== 'empty_or_valid_revalidate_in_later_live_mission'
      || Object.entries(historicalFixedFalseFlagsV3)
        .some(([key, value]) => root[key] !== value)
      || !isCleanString(root.source_mission_id)
      || root.selection_policy !== 'historical_catchup_pilot_v1'
      || ageEvidence === null
      || root.age_evidence_kind !== ageEvidence.age_evidence_kind
      || root.age_bucket !== ageEvidence.age_bucket
      || root.actual_elapsed_age_claimed !== false
      || validateWelcomeAudioUiAttestedFollowerSourceProjection(
        root.source_projection,
        { nowMs },
      ).ok !== true
    ) return invalid();
    const projection = snapshotPlainData(root.source_projection);
    if (
      projection.mission_id !== root.source_mission_id
      || projection.notification_row?.time_bucket_utf8 !== root.age_evidence_raw
      || projection.profile?.follows_owner
        !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE.CURRENT_FOLLOWS_OWNER_CONFIRMED
      || projection.profile?.follows_owner_evidence
        !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE.CURRENT_VISIBLE_FOLLOWS_OWNER
      || projection.exact_follow_timestamp_claimed !== false
      || projection.provider_event_id_claimed !== false
      || projection.campaign_membership_claimed !== false
    ) return invalid();
    const { operation_id: operationId, ...withoutOperationIdRaw } = root;
    if (typeof operationId !== 'string') return invalid();
    const withoutOperationId = {
      ...withoutOperationIdRaw,
      source_projection: projection,
    };
    if (operationId !== operationIdForIabSemanticHistoricalDraftV3(withoutOperationId)) {
      return invalid();
    }
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const historicalCanaryProgressSignatureV3 = (value) => (
  IAB_HISTORICAL_CANARY_PROGRESS_FIELDS_V3
    .map((field) => value[field] === true ? '1' : '0')
    .join('')
);

const buildIabSemanticHistoricalCanaryReceiptV3 = ({
  prepared = false,
  progress = {},
  blockerCodes = [],
} = {}) => {
  const milestone = Object.fromEntries(
    IAB_HISTORICAL_CANARY_PROGRESS_FIELDS_V3.map((field) => [
      field,
      prepared || progress[field] === true,
    ]),
  );
  return Object.freeze({
    receipt_schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_RECEIPT_SCHEMA_VERSION_V3,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3,
    redaction_status:
      'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads',
    decision: prepared
      ? WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3.PREPARED
      : WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3.BLOCKED,
    candidate_count: prepared ? 1 : 0,
    candidate_cap: 1,
    ...milestone,
    source_artifact_capability_retirement_attested:
      prepared || progress.source_artifact_capability_retirement_attested === true,
    ...fixedFalseFlags,
    blocker_codes: Object.freeze([...new Set(blockerCodes)]),
    historical_policy_bound: milestone.historical_policy_bound,
    age_evidence_bound: milestone.age_evidence_bound,
    preclaim_issued: false,
  });
};

const validateWelcomeAudioIabSemanticHistoricalCanaryPacketReceiptV3 = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.RECEIPT_CONTRACT,
  });
  try {
    const root = exactObject(
      snapshotPlainData(receipt),
      IAB_HISTORICAL_CANARY_RECEIPT_FIELDS_V3,
    );
    if (!root || !Array.isArray(root.blocker_codes)) return invalid();
    const prepared = root.decision
      === WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3.PREPARED;
    const blockerSet = new Set(Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3,
    ));
    const booleanFields = IAB_HISTORICAL_CANARY_RECEIPT_FIELDS_V3.filter((field) => ![
      'receipt_schema_version',
      'materializer_contract_version',
      'redaction_status',
      'decision',
      'candidate_count',
      'candidate_cap',
      'blocker_codes',
    ].includes(field));
    const blocker = root.blocker_codes[0];
    const progress = historicalCanaryProgressSignatureV3(root);
    const retirementAttestationValid = root.source_artifact_capability_retirement_attested
      === root.source_artifact_capability_consumed;
    const progressMatrix = Object.freeze({
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.INPUT_SCHEMA]: '0000000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .SOURCE_ARTIFACT_CAPABILITY]: '0000000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION]: '1000000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .SOURCE_ARTIFACT]: '1000000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.REQUEST_SCHEMA]: '1110000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .SOURCE_PROJECTION]: '1110000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_BINDING]: '1111000000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .NONCLAIMS_BINDING]: '1111100000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.POLICY_BINDING]: '1111110000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .AGE_EVIDENCE_BINDING]: '1111111000',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.DRAFT_CONTRACT]: '1111111100',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
        .DRAFT_ADMISSION_CAPABILITY]: '1111111110',
      [WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.RECEIPT_CONTRACT]: '1111111111',
    });
    if (
      root.receipt_schema_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_RECEIPT_SCHEMA_VERSION_V3
      || root.materializer_contract_version
        !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3
      || root.redaction_status
        !== 'aggregate_allowlist_only_no_private_values_times_buckets_paths_references_digests_or_payloads'
      || !Object.values(WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3)
        .includes(root.decision)
      || root.candidate_count !== (prepared ? 1 : 0)
      || root.candidate_cap !== 1
      || booleanFields.some((field) => typeof root[field] !== 'boolean')
      || !retirementAttestationValid
      || Object.entries(historicalFixedFalseFlagsV3)
        .some(([key, value]) => root[key] !== value)
      || root.blocker_codes.length !== (prepared ? 0 : 1)
      || root.blocker_codes.some((code) => !blockerSet.has(code))
      || new Set(root.blocker_codes).size !== root.blocker_codes.length
      || (prepared && progress !== '1111111111')
      || (!prepared && progressMatrix[blocker] !== progress)
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const blockedIabSemanticHistoricalCanaryV3 = (blocker, progress = {}) => Object.freeze({
  private_draft: null,
  private_draft_admission_capability: null,
  redacted_receipt: buildIabSemanticHistoricalCanaryReceiptV3({
    progress,
    blockerCodes: [blocker],
  }),
});

const issueIabSemanticHistoricalCanaryDraftAdmissionCapabilityV3 = ({
  privateDraft,
  expiresAtMs,
  nowMs,
  synthetic,
}) => {
  if (expiresAtMs <= nowMs) return null;
  const capability = opaqueIabSemanticHistoricalCanaryDraftAdmissionCapabilityV3();
  const registry = synthetic
    ? IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST
    : IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3;
  registry.set(capability, {
    consumed: false,
    privateDraft,
    expiresAtMs,
  });
  return capability;
};

const materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceInternal = ({
  privateSourceArtifactCapability,
  packetRequest,
  nowMs,
  synthetic,
}) => {
  const progress = Object.fromEntries(
    IAB_HISTORICAL_CANARY_PROGRESS_FIELDS_V3.map((field) => [field, false]),
  );
  const blocked = (blocker) => blockedIabSemanticHistoricalCanaryV3(blocker, progress);
  let consumed;
  try {
    const consumeArtifactCapability = synthetic
      ? consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest
      : consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce;
    consumed = consumeArtifactCapability({
      private_source_artifact_capability: privateSourceArtifactCapability,
    });
  } catch {
    consumed = null;
  }
  if (!consumed?.private_artifact) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_ARTIFACT_CAPABILITY,
  );
  progress.source_artifact_capability_consumed = true;
  progress.source_artifact_capability_retirement_attested = true;
  if (!isValidNowMsV2(nowMs)) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3
      .CLOCK_INVALID_AFTER_SOURCE_ARTIFACT_CONSUMPTION,
  );
  let artifact;
  try {
    artifact = snapshotPlainData(consumed.private_artifact);
  } catch {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_ARTIFACT);
  }
  if (
    artifact?.schema_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4
    || !isExactIsoV2(artifact?.source_expires_at)
    || Date.parse(artifact.source_expires_at) <= nowMs
    || validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4(
      artifact,
      { now_ms: nowMs },
    ).ok !== true
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_ARTIFACT,
  );
  progress.source_artifact_validated = true;
  progress.source_expiry_inherited = true;
  const request = validateIabSemanticHistoricalCanaryRequestV3(packetRequest);
  if (!request) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.REQUEST_SCHEMA,
  );
  let source;
  try {
    source = adaptWelcomeAudioUiAttestedFollowerSource(
      snapshotPlainData(artifact.ui_attested_input),
      { nowMs },
    );
  } catch {
    source = null;
  }
  if (
    !source?.private_projection
    || validateWelcomeAudioUiAttestedFollowerSourceProjection(
      source.private_projection,
      { nowMs },
    ).ok !== true
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_PROJECTION,
  );
  progress.projection_validated = true;
  const projection = source.private_projection;
  const completeSource = artifact.complete_source;
  if (
    projection.mission_id !== request.expected_source_mission_id
    || completeSource?.source_mission_id !== request.expected_source_mission_id
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.SOURCE_BINDING,
  );
  progress.exact_binding_preserved = true;
  if (
    projection.exact_follow_timestamp_claimed !== false
    || projection.provider_event_id_claimed !== false
    || projection.campaign_membership_claimed !== false
    || artifact.actual_elapsed_age_claimed !== false
    || completeSource.actual_elapsed_age_claimed !== false
    || completeSource.campaign_membership_claimed !== false
    || completeSource.relationship_binding !== 'follows_owner'
    || projection.profile?.follows_owner
      !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE.CURRENT_FOLLOWS_OWNER_CONFIRMED
    || projection.profile?.follows_owner_evidence
      !== WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE.CURRENT_VISIBLE_FOLLOWS_OWNER
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.NONCLAIMS_BINDING,
  );
  progress.nonclaims_preserved = true;
  if (
    artifact.selection_policy !== 'historical_catchup_pilot_v1'
    || completeSource.selection_policy !== 'historical_catchup_pilot_v1'
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.POLICY_BINDING,
  );
  progress.historical_policy_bound = true;
  const ageEvidence = classifyIabHistoricalAgeEvidenceV3(artifact.age_evidence_raw);
  if (
    ageEvidence === null
    || artifact.age_evidence_raw !== completeSource.age_evidence_raw
    || artifact.age_evidence_raw !== completeSource.visible_time_bucket_utf8
    || artifact.age_evidence_raw !== projection.notification_row?.time_bucket_utf8
    || artifact.age_evidence_kind !== ageEvidence.age_evidence_kind
    || completeSource.age_evidence_kind !== ageEvidence.age_evidence_kind
    || artifact.age_bucket !== ageEvidence.age_bucket
    || completeSource.age_bucket !== ageEvidence.age_bucket
  ) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.AGE_EVIDENCE_BINDING,
  );
  progress.age_evidence_bound = true;
  const draftWithoutOperationId = {
    schema_version: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DRAFT_SCHEMA_VERSION_V3,
    materializer_contract_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3,
    status: WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3.PREPARED,
    mission_id: request.mission_id,
    contract_version: request.contract_version,
    central_repo_head: request.central_repo_head,
    authorization_id: request.authorization_id,
    source_mission_id: request.expected_source_mission_id,
    candidate_cap: request.candidate_cap,
    future_attempt_cap: request.future_attempt_cap,
    source_projection: projection,
    approved_audio_asset_id: request.approved_audio_asset_id,
    approved_audio_sha256: request.approved_audio_sha256,
    approved_audio_binding_evidence: request.approved_audio_binding_evidence,
    registry_precondition: 'empty_or_valid_revalidate_in_later_live_mission',
    ...fixedFalseFlags,
    source_artifact_schema_version:
      WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SCHEMA_VERSION_V4,
    source_expires_at: artifact.source_expires_at,
    selection_policy: artifact.selection_policy,
    age_evidence_raw: artifact.age_evidence_raw,
    age_evidence_kind: artifact.age_evidence_kind,
    age_bucket: artifact.age_bucket,
    actual_elapsed_age_claimed: false,
    preclaim_issued: false,
  };
  const draft = deepFreeze({
    ...draftWithoutOperationId,
    operation_id: operationIdForIabSemanticHistoricalDraftV3(draftWithoutOperationId),
  });
  if (validateWelcomeAudioIabSemanticHistoricalCanaryPacketDraftV3(
    draft,
    { now_ms: nowMs },
  ).ok !== true) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.DRAFT_CONTRACT,
  );
  progress.draft_issued = true;
  const capability = issueIabSemanticHistoricalCanaryDraftAdmissionCapabilityV3({
    privateDraft: draft,
    expiresAtMs: Date.parse(artifact.source_expires_at),
    nowMs,
    synthetic,
  });
  if (!capability) return blocked(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.DRAFT_ADMISSION_CAPABILITY,
  );
  progress.draft_admission_capability_issued = true;
  const receipt = buildIabSemanticHistoricalCanaryReceiptV3({
    prepared: true,
    progress,
  });
  if (validateWelcomeAudioIabSemanticHistoricalCanaryPacketReceiptV3(receipt).ok !== true) {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.RECEIPT_CONTRACT);
  }
  return Object.freeze({
    private_draft: draft,
    private_draft_admission_capability: capability,
    redacted_receipt: receipt,
  });
};

const materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnce = (
  parameters = {},
) => {
  const root = exactObject(parameters, [
    'private_source_artifact_capability',
    'packet_request',
  ]);
  if (!root) return blockedIabSemanticHistoricalCanaryV3(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.INPUT_SCHEMA,
  );
  return materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceInternal({
    privateSourceArtifactCapability: root.private_source_artifact_capability,
    packetRequest: root.packet_request,
    nowMs: Date.now(),
    synthetic: false,
  });
};

const materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceForTest = (
  parameters = {},
) => {
  const root = exactObject(parameters, [
    'private_source_artifact_capability',
    'packet_request',
    'now_ms',
  ]);
  if (!root) return blockedIabSemanticHistoricalCanaryV3(
    WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3.INPUT_SCHEMA,
  );
  return materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceInternal({
    privateSourceArtifactCapability: root.private_source_artifact_capability,
    packetRequest: root.packet_request,
    nowMs: root.now_ms,
    synthetic: true,
  });
};

const consumeIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceInternal = (
  parameters,
  requiredSyntheticMode,
) => {
  const root = exactObject(parameters, ['private_draft_admission_capability']);
  if (!root) return null;
  const registry = requiredSyntheticMode
    ? IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST
    : IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3;
  const crossModeRegistry = requiredSyntheticMode
    ? IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3
    : IAB_HISTORICAL_CANARY_DRAFT_ADMISSION_STATES_V3_FOR_TEST;
  const ordinaryRegistry = requiredSyntheticMode
    ? IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST
    : IAB_CANARY_DRAFT_ADMISSION_STATES_V2;
  const ordinaryCrossModeRegistry = requiredSyntheticMode
    ? IAB_CANARY_DRAFT_ADMISSION_STATES_V2
    : IAB_CANARY_DRAFT_ADMISSION_STATES_V2_FOR_TEST;
  const capability = root.private_draft_admission_capability;
  const state = registry.get(capability);
  const crossModeState = crossModeRegistry.get(capability);
  const ordinaryState = ordinaryRegistry.get(capability);
  const ordinaryCrossModeState = ordinaryCrossModeRegistry.get(capability);
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
    || validateWelcomeAudioIabSemanticHistoricalCanaryPacketDraftV3(
      state.privateDraft,
      { now_ms: nowMs },
    ).ok !== true
  ) return null;
  return Object.freeze({ private_draft: state.privateDraft });
};

const consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnce = (
  parameters = {},
) => consumeIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceInternal(
  parameters,
  false,
);

const consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceForTest = (
  parameters = {},
) => consumeIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceInternal(
  parameters,
  true,
);

export {
  WELCOME_AUDIO_UI_ATTESTED_CANARY_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_CANDIDATE_CAP,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_DRAFT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_MATERIALIZER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
  materializeWelcomeAudioUiAttestedCanaryPacketDraft,
  validateWelcomeAudioUiAttestedCanaryPacketDraft,
  validateWelcomeAudioUiAttestedCanaryPacketReceipt,
  IAB_CANARY_DRAFT_FIELDS_V2 as WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DRAFT_FIELDS_V2,
  IAB_CANARY_RECEIPT_FIELDS_V2 as WELCOME_AUDIO_IAB_SEMANTIC_CANARY_RECEIPT_FIELDS_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_BLOCKER_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DECISION_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_DRAFT_SCHEMA_VERSION_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_MATERIALIZER_CONTRACT_VERSION_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_RECEIPT_SCHEMA_VERSION_V2,
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_REQUEST_SCHEMA_VERSION_V2,
  consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnce,
  consumeWelcomeAudioIabSemanticCanaryDraftAdmissionCapabilityOnceForTest,
  materializeWelcomeAudioIabSemanticCanaryPacketDraftOnce,
  materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceForTest,
  validateWelcomeAudioIabSemanticCanaryPacketDraftV2,
  validateWelcomeAudioIabSemanticCanaryPacketReceiptV2,
  IAB_HISTORICAL_CANARY_DRAFT_FIELDS_V3 as WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DRAFT_FIELDS_V3,
  IAB_HISTORICAL_CANARY_RECEIPT_FIELDS_V3 as WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_RECEIPT_FIELDS_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_BLOCKER_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DECISION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_DRAFT_SCHEMA_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_MATERIALIZER_CONTRACT_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_RECEIPT_SCHEMA_VERSION_V3,
  WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_REQUEST_SCHEMA_VERSION_V3,
  consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnce,
  consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceForTest,
  materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnce,
  materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceForTest,
  validateWelcomeAudioIabSemanticHistoricalCanaryPacketDraftV3,
  validateWelcomeAudioIabSemanticHistoricalCanaryPacketReceiptV3,
};
