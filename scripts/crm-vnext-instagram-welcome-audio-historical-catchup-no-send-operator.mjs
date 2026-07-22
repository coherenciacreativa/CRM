import { tmpdir } from 'node:os';
import { isAbsolute, relative, resolve } from 'node:path';
import { types as nodeUtilTypes } from 'node:util';

import * as sourceHost from './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';
import * as sourceArtifact from './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs';
import * as packetMaterializer from './crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs';

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID =
  'crm_core_historical_catchup_pilot_no_live_v1_20260722';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_receipt_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES = 1;

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND = Object.freeze({
  STAGE_2_QUALIFICATION: 'stage_2_qualification_only',
  STAGE_3_PREPARATION: 'stage_3_same_process_no_send_preparation',
});

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION = Object.freeze({
  QUALIFIED: 'historical_notification_profile_pairs_qualified_no_send',
  PREPARED: 'historical_single_candidate_packet_prepared_no_send',
  BLOCKED: 'historical_catchup_operator_blocked_no_send',
});

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_historical_catchup_operator_input_invalid',
  TEST_RUNTIME_INSTALL_FAILED:
    'blocked_historical_catchup_operator_test_runtime_install_failed',
  TEST_RUNTIME_RESET_FAILED:
    'blocked_historical_catchup_operator_test_runtime_reset_failed',
  STAGE_SEQUENCE_REQUIRED:
    'blocked_historical_catchup_operator_stage_2_handoff_required',
  STAGE_HANDOFF_ALREADY_PENDING:
    'blocked_historical_catchup_operator_stage_2_handoff_already_pending',
  STAGE_HANDOFF_ISSUE_FAILED:
    'blocked_historical_catchup_operator_stage_2_handoff_issue_failed',
  ENVIRONMENT_BINDING_UNAVAILABLE:
    'blocked_historical_catchup_operator_environment_owned_packet_binding_unavailable',
  SOURCE_QUALIFICATION_BLOCKED:
    'blocked_historical_catchup_operator_source_qualification',
  SOURCE_OBSERVATION_BLOCKED:
    'blocked_historical_catchup_operator_source_observation',
  SOURCE_ARTIFACT_BLOCKED:
    'blocked_historical_catchup_operator_source_artifact',
  PACKET_ADMISSION_BLOCKED:
    'blocked_historical_catchup_operator_packet_admission',
});

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'operator_contract_version',
  'mission_id',
  'selection_policy',
  'redaction_status',
  'source_mode',
  'command',
  'stage',
  'decision',
  'max_candidates',
  'rows_scanned',
  'notification_profile_pairs_qualified',
  'candidates_qualified',
  'source_qualification_green',
  'source_observation_green',
  'source_artifact_green',
  'packet_admission_green',
  'source_read_only_action_attempted',
  'source_read_only_action_performed',
  'source_usage_attestation_green',
  'browser_usage_attested',
  'network_usage_attested',
  'capability_exposed_to_caller',
  'capability_persisted',
  'capability_serialized',
  'private_material_returned',
  'execution_approval_published',
  'internal_opaque_registry_used',
  'internal_opaque_registry_active_at_return',
  'internal_capabilities_issued',
  'internal_capabilities_consumed',
  'internal_capabilities_conditionally_held',
  'stage_handoff_consumed',
  'final_draft_admission_capability_consumed',
  'external_operation_registry_written',
  'claim_issued',
  'preclaim_issued',
  'pending_effect_recorded',
  'send_authorized',
  'send_allowed',
  'send_invoked',
  'live_access_authorized',
  'live_authority',
  'live_effect_invoked',
  'browser_used',
  'browser_runtime_created',
  'new_browser_backend_selected',
  'browser_fallback_invoked',
  'network_used',
  'network_mutation_invoked',
  'claim_invoked',
  'preclaim_invoked',
  'upload_invoked',
  'external_effect_invoked',
  'blocker_codes',
]);

const FIXED_FALSE_FLAGS = Object.freeze({
  capability_exposed_to_caller: false,
  capability_persisted: false,
  capability_serialized: false,
  private_material_returned: false,
  execution_approval_published: false,
  external_operation_registry_written: false,
  claim_issued: false,
  preclaim_issued: false,
  pending_effect_recorded: false,
  send_authorized: false,
  send_allowed: false,
  send_invoked: false,
  live_access_authorized: false,
  live_authority: false,
  live_effect_invoked: false,
  browser_runtime_created: false,
  new_browser_backend_selected: false,
  browser_fallback_invoked: false,
  network_mutation_invoked: false,
  claim_invoked: false,
  preclaim_invoked: false,
  upload_invoked: false,
  external_effect_invoked: false,
});

const exactDataObject = (value, fields) => {
  try {
    if (
      value === null
      || typeof value !== 'object'
      || Array.isArray(value)
      || nodeUtilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== fields.length
      || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
      || fields.some((field) => {
        const descriptor = descriptors[field];
        return !descriptor
          || !Object.hasOwn(descriptor, 'value')
          || descriptor.get !== undefined
          || descriptor.set !== undefined;
      })
    ) return null;
    return Object.freeze(Object.fromEntries(fields.map((field) => [
      field,
      descriptors[field].value,
    ])));
  } catch {
    return null;
  }
};

const exactArray = (value, maxLength) => {
  try {
    if (
      !Array.isArray(value)
      || nodeUtilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (
      !Number.isSafeInteger(length)
      || length < 0
      || length > maxLength
      || Reflect.ownKeys(descriptors).length !== length + 1
    ) return null;
    const copy = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      copy.push(descriptor.value);
    }
    return Object.freeze(copy);
  } catch {
    return null;
  }
};

const validNowMs = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const SOURCE_MODE = Object.freeze({
  PRODUCTION: 'production_environment_facade',
  SYNTHETIC: 'synthetic_test_proof',
});

const STAGE_HANDOFF_TTL_MS = 5 * 60 * 1000;
const STAGE_HANDOFF_STATES = new WeakMap();
let pendingStageHandoff = null;

const opaqueStageHandoff = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_historical_catchup_stage_2_to_stage_3_handoff')]: {
      enumerable: false,
      value: true,
    },
    toJSON: {
      enumerable: false,
      value: () => {
        throw new TypeError('historical_catchup_stage_handoff_not_serializable');
      },
    },
    kind: {
      enumerable: false,
      value: Symbol('opaque_historical_catchup_stage_handoff'),
    },
  });
  return Object.freeze(capability);
};

const burnPendingStageHandoff = () => {
  const capability = pendingStageHandoff;
  pendingStageHandoff = null;
  const state = capability && STAGE_HANDOFF_STATES.get(capability);
  if (!state || state.consumed) return false;
  state.consumed = true;
  return true;
};

const issueStageHandoff = ({ sourceMode, nowMs }) => {
  if (
    pendingStageHandoff !== null
    || !Object.values(SOURCE_MODE).includes(sourceMode)
    || !validNowMs(nowMs)
  ) return false;
  const capability = opaqueStageHandoff();
  STAGE_HANDOFF_STATES.set(capability, {
    consumed: false,
    issued_at_ms: nowMs,
    expires_at_ms: nowMs + STAGE_HANDOFF_TTL_MS,
    source_mode: sourceMode,
  });
  pendingStageHandoff = capability;
  return true;
};

const hasPendingStageHandoff = () => {
  const state = pendingStageHandoff && STAGE_HANDOFF_STATES.get(pendingStageHandoff);
  return Boolean(state && !state.consumed);
};

const consumeStageHandoff = ({ sourceMode, nowMs }) => {
  const capability = pendingStageHandoff;
  pendingStageHandoff = null;
  const state = capability && STAGE_HANDOFF_STATES.get(capability);
  if (!state || state.consumed) return Object.freeze({
    accepted: false,
    terminally_consumed: false,
  });
  state.consumed = true;
  return Object.freeze({
    accepted: state.source_mode === sourceMode
      && validNowMs(nowMs)
      && nowMs >= state.issued_at_ms
      && state.expires_at_ms > nowMs,
    terminally_consumed: true,
  });
};

const sourceUsageTruth = ({ receipt, synthetic }) => {
  const sourceMode = synthetic ? SOURCE_MODE.SYNTHETIC : SOURCE_MODE.PRODUCTION;
  const attempted = receipt?.read_only_source_action_attempted === true;
  const performed = receipt?.read_only_source_action_performed === true;
  if (synthetic) return Object.freeze({
    sourceMode,
    attempted,
    performed,
    attestationGreen: true,
    browserUsageAttested: true,
    networkUsageAttested: true,
    browserUsed: false,
    networkUsed: false,
  });
  const browserUsageAttested = receipt?.source_backend
    === sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND;
  const boundedReadOnlyTruth = browserUsageAttested
    && receipt?.external_effect_invoked === false
    && receipt?.external_effect_possible_or_unknown === false;
  return Object.freeze({
    sourceMode,
    attempted,
    performed,
    // Unknown network usage remains explicit null. The green bit means every
    // fact asserted here is attested and bounded read-only; it never promotes
    // unknown network usage to false.
    attestationGreen: boundedReadOnlyTruth,
    browserUsageAttested,
    networkUsageAttested: false,
    browserUsed: browserUsageAttested ? attempted : null,
    networkUsed: null,
  });
};

const stageForCommand = (command) => command
  === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
  ? 'stage_2'
  : command
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION
    ? 'stage_3'
    : null;

const buildReceipt = ({
  command,
  decision,
  blocker = null,
  sourceMode = SOURCE_MODE.SYNTHETIC,
  rowsScanned = 0,
  pairsQualified = 0,
  candidatesQualified = 0,
  sourceQualificationGreen = false,
  sourceObservationGreen = false,
  sourceArtifactGreen = false,
  packetAdmissionGreen = false,
  sourceReadOnlyActionAttempted = false,
  sourceReadOnlyActionPerformed = false,
  sourceUsageAttestationGreen = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  networkUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  networkUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  internalOpaqueRegistryUsed = false,
  internalOpaqueRegistryActiveAtReturn = false,
  internalCapabilitiesIssued = 0,
  internalCapabilitiesConsumed = 0,
  internalCapabilitiesConditionallyHeld = 0,
  stageHandoffConsumed = false,
  finalDraftAdmissionCapabilityConsumed = false,
}) => Object.freeze({
  receipt_schema_version:
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION,
  operator_contract_version:
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION,
  mission_id: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID,
  selection_policy:
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_SELECTION_POLICY
      .HISTORICAL_CATCHUP_PILOT_V1,
  redaction_status: 'aggregate_only_no_private_source_material',
  source_mode: sourceMode,
  command,
  stage: stageForCommand(command),
  decision,
  max_candidates: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES,
  rows_scanned: rowsScanned,
  notification_profile_pairs_qualified: pairsQualified,
  candidates_qualified: candidatesQualified,
  source_qualification_green: sourceQualificationGreen,
  source_observation_green: sourceObservationGreen,
  source_artifact_green: sourceArtifactGreen,
  packet_admission_green: packetAdmissionGreen,
  source_read_only_action_attempted: sourceReadOnlyActionAttempted,
  source_read_only_action_performed: sourceReadOnlyActionPerformed,
  source_usage_attestation_green: sourceUsageAttestationGreen,
  browser_usage_attested: browserUsageAttested,
  network_usage_attested: networkUsageAttested,
  internal_opaque_registry_used: internalOpaqueRegistryUsed,
  internal_opaque_registry_active_at_return: internalOpaqueRegistryActiveAtReturn,
  internal_capabilities_issued: internalCapabilitiesIssued,
  internal_capabilities_consumed: internalCapabilitiesConsumed,
  internal_capabilities_conditionally_held: internalCapabilitiesConditionallyHeld,
  stage_handoff_consumed: stageHandoffConsumed,
  final_draft_admission_capability_consumed:
    finalDraftAdmissionCapabilityConsumed,
  ...FIXED_FALSE_FLAGS,
  browser_used: browserUsed,
  network_used: networkUsed,
  blocker_codes: Object.freeze(blocker === null ? [] : [blocker]),
});

const resultFromReceipt = (redactedReceipt) => Object.freeze({
  redacted_receipt: redactedReceipt,
});

const blockedResult = ({
  command,
  blocker,
  sourceMode = SOURCE_MODE.SYNTHETIC,
  rowsScanned = 0,
  pairsQualified = 0,
  candidatesQualified = 0,
  sourceQualificationGreen = false,
  sourceObservationGreen = false,
  sourceArtifactGreen = false,
  packetAdmissionGreen = false,
  sourceReadOnlyActionAttempted = false,
  sourceReadOnlyActionPerformed = false,
  sourceUsageAttestationGreen = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  networkUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  networkUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  internalOpaqueRegistryUsed = false,
  internalOpaqueRegistryActiveAtReturn = false,
  internalCapabilitiesIssued = 0,
  internalCapabilitiesConsumed = 0,
  internalCapabilitiesConditionallyHeld = 0,
  stageHandoffConsumed = false,
  finalDraftAdmissionCapabilityConsumed = false,
}) => resultFromReceipt(buildReceipt({
  command,
  decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
  blocker,
  sourceMode,
  rowsScanned,
  pairsQualified,
  candidatesQualified,
  sourceQualificationGreen,
  sourceObservationGreen,
  sourceArtifactGreen,
  packetAdmissionGreen,
  sourceReadOnlyActionAttempted,
  sourceReadOnlyActionPerformed,
  sourceUsageAttestationGreen,
  browserUsageAttested,
  networkUsageAttested,
  browserUsed,
  networkUsed,
  internalOpaqueRegistryUsed,
  internalOpaqueRegistryActiveAtReturn,
  internalCapabilitiesIssued,
  internalCapabilitiesConsumed,
  internalCapabilitiesConditionallyHeld,
  stageHandoffConsumed,
  finalDraftAdmissionCapabilityConsumed,
}));

const INTERNAL_STATE = Object.freeze({
  NONE: Object.freeze([false, false, 0, 0, 0, false, false]),
  REGISTRY_ONLY: Object.freeze([true, false, 0, 0, 0, false, false]),
  PRIOR_HANDOFF_HELD: Object.freeze([true, true, 0, 0, 1, false, false]),
  PRIOR_HANDOFF_BURNED: Object.freeze([true, false, 0, 1, 0, true, false]),
  STAGE_2_HANDOFF_HELD: Object.freeze([true, true, 1, 0, 1, false, false]),
  STAGE_2_HANDOFF_BURNED: Object.freeze([true, false, 1, 1, 0, true, false]),
  STAGE_3_SOURCE_BURNED: Object.freeze([true, false, 1, 2, 0, true, false]),
  STAGE_3_ARTIFACT_BURNED: Object.freeze([true, false, 2, 3, 0, true, false]),
  STAGE_3_DRAFT_BURNED: Object.freeze([true, false, 3, 4, 0, true, true]),
});

const exactInternalState = (receipt, expected) => [
  receipt.internal_opaque_registry_used,
  receipt.internal_opaque_registry_active_at_return,
  receipt.internal_capabilities_issued,
  receipt.internal_capabilities_consumed,
  receipt.internal_capabilities_conditionally_held,
  receipt.stage_handoff_consumed,
  receipt.final_draft_admission_capability_consumed,
].every((value, index) => value === expected[index]);

const anyInternalState = (receipt, states) => states.some(
  (state) => exactInternalState(receipt, state),
);

const noSourcePhase = (receipt) => receipt.rows_scanned === 0
  && receipt.notification_profile_pairs_qualified === 0
  && receipt.candidates_qualified === 0
  && !receipt.source_qualification_green
  && !receipt.source_observation_green
  && !receipt.source_artifact_green
  && !receipt.packet_admission_green
  && !receipt.source_read_only_action_attempted
  && !receipt.source_read_only_action_performed;

const stage2SemanticGreenPhase = (receipt) => receipt.rows_scanned >= 1
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
  && receipt.notification_profile_pairs_qualified === 2
  && receipt.candidates_qualified === 0
  && receipt.source_qualification_green
  && !receipt.source_observation_green
  && !receipt.source_artifact_green
  && !receipt.packet_admission_green
  && receipt.source_read_only_action_attempted
  && receipt.source_read_only_action_performed;

const stage2BlockedSourcePhase = (receipt) => receipt.rows_scanned >= 0
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS + 1
  && receipt.notification_profile_pairs_qualified >= 0
  && receipt.notification_profile_pairs_qualified <= 2
  && receipt.candidates_qualified === 0
  && !receipt.source_qualification_green
  && !receipt.source_observation_green
  && !receipt.source_artifact_green
  && !receipt.packet_admission_green
  && (receipt.rows_scanned === 0
    && receipt.notification_profile_pairs_qualified === 0
    || receipt.source_read_only_action_attempted
      && receipt.source_read_only_action_performed);

const stage3ObservationBlockedPhase = (receipt) => receipt.rows_scanned >= 0
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS + 1
  && receipt.notification_profile_pairs_qualified === 0
  && receipt.candidates_qualified === 0
  && !receipt.source_qualification_green
  && !receipt.source_observation_green
  && !receipt.source_artifact_green
  && !receipt.packet_admission_green
  && (receipt.rows_scanned === 0
    || receipt.source_read_only_action_attempted
      && receipt.source_read_only_action_performed);

const stage3CandidatePhase = (receipt, { artifactGreen, packetGreen }) => (
  receipt.rows_scanned >= 1
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
  && receipt.notification_profile_pairs_qualified === 0
  && receipt.candidates_qualified === 1
  && !receipt.source_qualification_green
  && receipt.source_observation_green
  && receipt.source_artifact_green === artifactGreen
  && receipt.packet_admission_green === packetGreen
  && receipt.source_read_only_action_attempted
  && receipt.source_read_only_action_performed
);

const resetFailureReachable = (receipt, stage) => {
  if (stage === 'stage_2') return (
    (stage2SemanticGreenPhase(receipt) && anyInternalState(receipt, [
      INTERNAL_STATE.STAGE_2_HANDOFF_BURNED,
      INTERNAL_STATE.PRIOR_HANDOFF_BURNED,
    ]))
    || (stage2BlockedSourcePhase(receipt)
      && exactInternalState(receipt, INTERNAL_STATE.NONE))
    || (noSourcePhase(receipt)
      && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_BURNED))
  );
  if (stage !== 'stage_3') return false;
  return (
    (noSourcePhase(receipt) && anyInternalState(receipt, [
      INTERNAL_STATE.REGISTRY_ONLY,
      INTERNAL_STATE.PRIOR_HANDOFF_BURNED,
    ]))
    || (stage3ObservationBlockedPhase(receipt)
      && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_BURNED))
    || (stage3CandidatePhase(receipt, { artifactGreen: false, packetGreen: false })
      && exactInternalState(receipt, INTERNAL_STATE.STAGE_3_SOURCE_BURNED))
    || (stage3CandidatePhase(receipt, { artifactGreen: true, packetGreen: false })
      && anyInternalState(receipt, [
        INTERNAL_STATE.STAGE_3_ARTIFACT_BURNED,
        INTERNAL_STATE.STAGE_3_DRAFT_BURNED,
      ]))
    || (stage3CandidatePhase(receipt, { artifactGreen: true, packetGreen: true })
      && exactInternalState(receipt, INTERNAL_STATE.STAGE_3_DRAFT_BURNED))
  );
};

const blockedReceiptReachable = (receipt, blocker, stage) => {
  const sourceModeAllowsBlocker = receipt.source_mode === SOURCE_MODE.SYNTHETIC
    ? blocker !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .ENVIRONMENT_BINDING_UNAVAILABLE
    : ![
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_INSTALL_FAILED,
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED,
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_OBSERVATION_BLOCKED,
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_ARTIFACT_BLOCKED,
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .PACKET_ADMISSION_BLOCKED,
      ].includes(blocker);
  if (!sourceModeAllowsBlocker) return false;
  switch (blocker) {
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID:
      return noSourcePhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.NONE);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .TEST_RUNTIME_INSTALL_FAILED:
      return noSourcePhase(receipt) && anyInternalState(receipt, [
        INTERNAL_STATE.NONE,
        INTERNAL_STATE.PRIOR_HANDOFF_BURNED,
      ]);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .TEST_RUNTIME_RESET_FAILED:
      return resetFailureReachable(receipt, stage);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .STAGE_HANDOFF_ALREADY_PENDING:
      return stage === 'stage_2'
        && noSourcePhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_HELD);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .STAGE_SEQUENCE_REQUIRED:
      return stage === 'stage_3'
        && noSourcePhase(receipt)
        && anyInternalState(receipt, [
          INTERNAL_STATE.REGISTRY_ONLY,
          INTERNAL_STATE.PRIOR_HANDOFF_BURNED,
        ]);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .ENVIRONMENT_BINDING_UNAVAILABLE:
      return stage === 'stage_3'
        && noSourcePhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_BURNED);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .STAGE_HANDOFF_ISSUE_FAILED:
      return stage === 'stage_2'
        && stage2SemanticGreenPhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_HELD);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .SOURCE_QUALIFICATION_BLOCKED:
      return stage === 'stage_2'
        && stage2BlockedSourcePhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.NONE);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .SOURCE_OBSERVATION_BLOCKED:
      return stage === 'stage_3'
        && stage3ObservationBlockedPhase(receipt)
        && exactInternalState(receipt, INTERNAL_STATE.PRIOR_HANDOFF_BURNED);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .SOURCE_ARTIFACT_BLOCKED:
      return stage === 'stage_3'
        && stage3CandidatePhase(receipt, { artifactGreen: false, packetGreen: false })
        && exactInternalState(receipt, INTERNAL_STATE.STAGE_3_SOURCE_BURNED);
    case WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .PACKET_ADMISSION_BLOCKED:
      return stage === 'stage_3'
        && stage3CandidatePhase(receipt, { artifactGreen: true, packetGreen: false })
        && anyInternalState(receipt, [
          INTERNAL_STATE.STAGE_3_ARTIFACT_BURNED,
          INTERNAL_STATE.STAGE_3_DRAFT_BURNED,
        ]);
    default:
      return false;
  }
};

const validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt = (value) => {
  const receipt = exactDataObject(value, RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes, 1);
  const falseFlags = Object.keys(FIXED_FALSE_FLAGS);
  const stage = stageForCommand(receipt.command);
  const boundedNumbers = [
    receipt.max_candidates,
    receipt.rows_scanned,
    receipt.notification_profile_pairs_qualified,
    receipt.candidates_qualified,
    receipt.internal_capabilities_issued,
    receipt.internal_capabilities_consumed,
    receipt.internal_capabilities_conditionally_held,
  ].every(Number.isSafeInteger);
  const booleanFields = [
    receipt.source_qualification_green,
    receipt.source_observation_green,
    receipt.source_artifact_green,
    receipt.packet_admission_green,
    receipt.source_read_only_action_attempted,
    receipt.source_read_only_action_performed,
    receipt.source_usage_attestation_green,
    receipt.browser_usage_attested,
    receipt.network_usage_attested,
    receipt.internal_opaque_registry_used,
    receipt.internal_opaque_registry_active_at_return,
    receipt.stage_handoff_consumed,
    receipt.final_draft_admission_capability_consumed,
  ];
  if (
    !blockers
    || stage === null
    || receipt.stage !== stage
    || receipt.receipt_schema_version
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION
    || receipt.operator_contract_version
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION
    || receipt.mission_id !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID
    || receipt.selection_policy
      !== sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_SELECTION_POLICY
        .HISTORICAL_CATCHUP_PILOT_V1
    || receipt.redaction_status !== 'aggregate_only_no_private_source_material'
    || !Object.values(SOURCE_MODE).includes(receipt.source_mode)
    || !boundedNumbers
    || receipt.max_candidates
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES
    || receipt.rows_scanned < 0
    || receipt.rows_scanned > sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS + 1
    || receipt.notification_profile_pairs_qualified < 0
    || receipt.notification_profile_pairs_qualified > 2
    || receipt.notification_profile_pairs_qualified > receipt.rows_scanned
    || receipt.candidates_qualified < 0
    || receipt.candidates_qualified > 1
    || receipt.internal_capabilities_issued < 0
    || receipt.internal_capabilities_issued > 3
    || receipt.internal_capabilities_consumed < 0
    || receipt.internal_capabilities_consumed > 4
    || receipt.internal_capabilities_conditionally_held < 0
    || receipt.internal_capabilities_conditionally_held > 1
    || booleanFields.some((flag) => typeof flag !== 'boolean')
    || ![true, false, null].includes(receipt.browser_used)
    || ![true, false, null].includes(receipt.network_used)
    || falseFlags.some((field) => receipt[field] !== false)
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });

  const syntheticUsage = receipt.source_mode === SOURCE_MODE.SYNTHETIC
    && receipt.source_usage_attestation_green
    && receipt.browser_usage_attested
    && receipt.network_usage_attested
    && receipt.browser_used === false
    && receipt.network_used === false;
  const productionBrowserTruth = receipt.browser_usage_attested
    ? typeof receipt.browser_used === 'boolean'
      && receipt.browser_used === receipt.source_read_only_action_attempted
    : receipt.browser_used === null
      && !receipt.source_read_only_action_attempted
      && !receipt.source_read_only_action_performed
      && !receipt.source_usage_attestation_green;
  const productionUsage = receipt.source_mode === SOURCE_MODE.PRODUCTION
    && !receipt.network_usage_attested
    && receipt.network_used === null
    && productionBrowserTruth
    && (!receipt.source_usage_attestation_green || receipt.browser_usage_attested);
  const registryTruthValid = receipt.internal_opaque_registry_active_at_return
    === (receipt.internal_capabilities_conditionally_held === 1)
    && (!receipt.internal_opaque_registry_active_at_return
      || receipt.internal_opaque_registry_used)
    && (!receipt.stage_handoff_consumed || receipt.internal_opaque_registry_used)
    && (!receipt.final_draft_admission_capability_consumed
      || receipt.internal_opaque_registry_used)
    && receipt.internal_capabilities_consumed
      <= receipt.internal_capabilities_issued + Number(receipt.stage_handoff_consumed);
  if (
    (!syntheticUsage && !productionUsage)
    || !registryTruthValid
    || (receipt.rows_scanned > 0
      && (!receipt.source_read_only_action_attempted
        || !receipt.source_read_only_action_performed))
    || (receipt.source_read_only_action_performed
      && !receipt.source_read_only_action_attempted)
  ) return Object.freeze({ ok: false, reason: 'receipt_truth_invalid' });

  const qualified = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED;
  const prepared = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.PREPARED;
  const blocked = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED;
  if (
    Number(qualified) + Number(prepared) + Number(blocked) !== 1
    || (blocked && (
      blockers.length !== 1
      || !Object.values(
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER,
      ).includes(blockers[0])
      || (receipt.packet_admission_green && blockers[0]
        !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED)
    ))
    || (!blocked && blockers.length !== 0)
    || (qualified && (
      stage !== 'stage_2'
      || receipt.rows_scanned < 1
      || receipt.rows_scanned > sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      || receipt.notification_profile_pairs_qualified !== 2
      || receipt.candidates_qualified !== 0
      || !receipt.source_qualification_green
      || receipt.source_observation_green
      || receipt.source_artifact_green
      || receipt.packet_admission_green
      || !receipt.source_usage_attestation_green
      || !receipt.internal_opaque_registry_used
      || !receipt.internal_opaque_registry_active_at_return
      || receipt.internal_capabilities_issued !== 1
      || receipt.internal_capabilities_consumed !== 0
      || receipt.internal_capabilities_conditionally_held !== 1
      || receipt.stage_handoff_consumed
      || receipt.final_draft_admission_capability_consumed
    ))
    || (prepared && (
      stage !== 'stage_3'
      || receipt.rows_scanned < 1
      || receipt.rows_scanned > sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      || receipt.notification_profile_pairs_qualified !== 0
      || receipt.candidates_qualified !== 1
      || receipt.source_qualification_green
      || !receipt.source_observation_green
      || !receipt.source_artifact_green
      || !receipt.packet_admission_green
      || !syntheticUsage
      || !receipt.internal_opaque_registry_used
      || receipt.internal_opaque_registry_active_at_return
      || receipt.internal_capabilities_issued !== 3
      || receipt.internal_capabilities_consumed !== 4
      || receipt.internal_capabilities_conditionally_held !== 0
      || !receipt.stage_handoff_consumed
      || !receipt.final_draft_admission_capability_consumed
    ))
    || (stage === 'stage_2' && (
      receipt.candidates_qualified !== 0
      || receipt.source_observation_green
      || receipt.source_artifact_green
      || receipt.packet_admission_green
    ))
    || (stage === 'stage_3' && (
      receipt.notification_profile_pairs_qualified !== 0
      || receipt.source_qualification_green
      || (receipt.source_artifact_green && !receipt.source_observation_green)
      || (receipt.packet_admission_green && !receipt.source_artifact_green)
      || (receipt.source_observation_green && receipt.candidates_qualified !== 1)
    ))
    || (prepared && receipt.source_mode !== SOURCE_MODE.SYNTHETIC)
    || (blocked && ![
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .STAGE_HANDOFF_ALREADY_PENDING,
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .STAGE_HANDOFF_ISSUE_FAILED,
    ].includes(blockers[0])
      && receipt.internal_opaque_registry_active_at_return)
    || (blocked && !blockedReceiptReachable(receipt, blockers[0], stage))
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  return Object.freeze({ ok: true, reason: null });
};

const safeSourceReceipt = (result, kind) => {
  const captured = exactDataObject(result, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  if (!captured) return null;
  const validation = kind === 'qualification'
    ? sourceHost.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      captured.redacted_receipt,
    )
    : sourceHost.validateWelcomeAudioIabSemanticFollowerCandidateReceipt(
      captured.redacted_receipt,
    );
  if (validation?.ok !== true) return null;
  return captured;
};

const burnHistoricalCompleteSourceCapability = ({ capability, synthetic }) => {
  if (capability === null || typeof capability !== 'object') return false;
  try {
    const consumeSource = synthetic
      ? sourceHost
        .consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest
      : sourceHost
        .consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnce;
    consumeSource(capability);
  } catch {
    // One presentation is terminal even when the consumer reports invalid.
  }
  return true;
};

const runStage2 = async ({ synthetic, nowMs }) => {
  const command =
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION;
  const operationNowMs = synthetic ? nowMs : Date.now();
  if (hasPendingStageHandoff()) {
    const usage = sourceUsageTruth({ receipt: null, synthetic });
    return blockedResult({
      command,
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_HANDOFF_ALREADY_PENDING,
      sourceMode: usage.sourceMode,
      sourceUsageAttestationGreen: usage.attestationGreen,
      browserUsageAttested: usage.browserUsageAttested,
      networkUsageAttested: usage.networkUsageAttested,
      browserUsed: usage.browserUsed,
      networkUsed: usage.networkUsed,
      internalOpaqueRegistryUsed: true,
      internalOpaqueRegistryActiveAtReturn: true,
      internalCapabilitiesConditionallyHeld: 1,
    });
  }
  let sourceResult;
  try {
    sourceResult = synthetic
      ? await sourceHost
        .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnceForTest({
          now_ms: nowMs,
        })
      : await sourceHost
        .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnce();
  } catch {
    sourceResult = null;
  }
  const rawCapturedSource = exactDataObject(sourceResult, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  const captured = safeSourceReceipt(sourceResult, 'qualification');
  const receipt = captured?.redacted_receipt;
  const usage = sourceUsageTruth({ receipt, synthetic });
  const semanticSourceGreen = captured !== null
    && captured.private_complete_source_capability === null
    && receipt.decision === sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED
    && receipt.notification_profile_pairs_qualified === 2
    && receipt.capability_issued === false
    && receipt.external_effect_invoked === false
    && receipt.external_effect_possible_or_unknown === false
    && receipt.blocker_codes.length === 0;
  const usageArgs = {
    sourceMode: usage.sourceMode,
    sourceReadOnlyActionAttempted: usage.attempted,
    sourceReadOnlyActionPerformed: usage.performed,
    sourceUsageAttestationGreen: usage.attestationGreen,
    browserUsageAttested: usage.browserUsageAttested,
    networkUsageAttested: usage.networkUsageAttested,
    browserUsed: usage.browserUsed,
    networkUsed: usage.networkUsed,
  };
  if (!semanticSourceGreen) {
    const unknownCapabilityBurned = burnHistoricalCompleteSourceCapability({
      capability: rawCapturedSource?.private_complete_source_capability,
      synthetic,
    });
    return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .SOURCE_QUALIFICATION_BLOCKED,
    rowsScanned: Number.isSafeInteger(receipt?.rows_scanned) ? receipt.rows_scanned : 0,
    pairsQualified: Number.isSafeInteger(receipt?.notification_profile_pairs_qualified)
      ? receipt.notification_profile_pairs_qualified
      : 0,
    internalOpaqueRegistryUsed: unknownCapabilityBurned,
    ...usageArgs,
    });
  }
  const handoffIssued = issueStageHandoff({
    sourceMode: usage.sourceMode,
    nowMs: operationNowMs,
  });
  if (!handoffIssued) return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .STAGE_HANDOFF_ISSUE_FAILED,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    sourceQualificationGreen: true,
    internalOpaqueRegistryUsed: true,
    internalOpaqueRegistryActiveAtReturn: true,
    internalCapabilitiesConditionallyHeld: 1,
    ...usageArgs,
  });
  return resultFromReceipt(buildReceipt({
    command,
    decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    sourceQualificationGreen: true,
    internalOpaqueRegistryUsed: true,
    internalOpaqueRegistryActiveAtReturn: true,
    internalCapabilitiesIssued: 1,
    internalCapabilitiesConditionallyHeld: 1,
    ...usageArgs,
  }));
};

const historicalArtifactFunctions = () => Object.freeze({
  publishFixed:
    sourceArtifact.publishFixedWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4,
  publishForTest:
    sourceArtifact.publishSyntheticWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactV4ForTest,
  validateReceipt:
    sourceArtifact.validateWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactReceiptV4,
});

const historicalPacketFunctions = () => Object.freeze({
  materialize:
    packetMaterializer.materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnce,
  materializeForTest:
    packetMaterializer.materializeWelcomeAudioIabSemanticHistoricalCanaryPacketDraftOnceForTest,
  validateReceipt:
    packetMaterializer.validateWelcomeAudioIabSemanticHistoricalCanaryPacketReceiptV3,
  consume:
    packetMaterializer.consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnce,
  consumeForTest:
    packetMaterializer
      .consumeWelcomeAudioIabSemanticHistoricalCanaryDraftAdmissionCapabilityOnceForTest,
});

const runStage3 = async ({ synthetic, nowMs, artifactRoot, packetRequest }) => {
  const command =
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION;
  const operationNowMs = synthetic ? nowMs : Date.now();
  const sourceMode = synthetic ? SOURCE_MODE.SYNTHETIC : SOURCE_MODE.PRODUCTION;
  const handoff = consumeStageHandoff({ sourceMode, nowMs: operationNowMs });
  const emptyUsage = sourceUsageTruth({ receipt: null, synthetic });
  const baseInternal = {
    internalOpaqueRegistryUsed: true,
    internalCapabilitiesConsumed: handoff.terminally_consumed ? 1 : 0,
    stageHandoffConsumed: handoff.terminally_consumed,
  };
  const emptyUsageArgs = {
    sourceMode,
    sourceUsageAttestationGreen: emptyUsage.attestationGreen,
    browserUsageAttested: emptyUsage.browserUsageAttested,
    networkUsageAttested: emptyUsage.networkUsageAttested,
    browserUsed: emptyUsage.browserUsed,
    networkUsed: emptyUsage.networkUsed,
  };
  if (!handoff.accepted) return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.STAGE_SEQUENCE_REQUIRED,
    ...emptyUsageArgs,
    ...baseInternal,
  });
  if (!synthetic || packetRequest === null) return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .ENVIRONMENT_BINDING_UNAVAILABLE,
    ...emptyUsageArgs,
    ...baseInternal,
  });
  let sourceResult;
  try {
    sourceResult = synthetic
      ? await sourceHost
        .observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnceForTest({
          now_ms: nowMs,
        })
      : await sourceHost.observeWelcomeAudioIabSemanticHistoricalCatchupFollowerCandidateOnce();
  } catch {
    sourceResult = null;
  }
  const rawCapturedSource = exactDataObject(sourceResult, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  const capturedSource = safeSourceReceipt(sourceResult, 'observation');
  const sourceReceipt = capturedSource?.redacted_receipt;
  const usage = sourceUsageTruth({ receipt: sourceReceipt, synthetic });
  const usageArgs = {
    sourceMode: usage.sourceMode,
    sourceReadOnlyActionAttempted: usage.attempted,
    sourceReadOnlyActionPerformed: usage.performed,
    sourceUsageAttestationGreen: usage.attestationGreen,
    browserUsageAttested: usage.browserUsageAttested,
    networkUsageAttested: usage.networkUsageAttested,
    browserUsed: usage.browserUsed,
    networkUsed: usage.networkUsed,
  };
  const semanticSourceGreen = capturedSource !== null
    && capturedSource.private_complete_source_capability !== null
    && typeof capturedSource.private_complete_source_capability === 'object'
    && sourceReceipt.decision === sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY
    && sourceReceipt.candidates_qualified === 1
    && sourceReceipt.capability_issued === true
    && sourceReceipt.external_effect_invoked === false
    && sourceReceipt.external_effect_possible_or_unknown === false
    && sourceReceipt.blocker_codes.length === 0;
  if (!semanticSourceGreen) {
    burnHistoricalCompleteSourceCapability({
      capability: rawCapturedSource?.private_complete_source_capability,
      synthetic,
    });
    return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.SOURCE_OBSERVATION_BLOCKED,
    rowsScanned: Number.isSafeInteger(sourceReceipt?.rows_scanned)
      ? sourceReceipt.rows_scanned
      : 0,
    ...usageArgs,
    ...baseInternal,
    });
  }

  let internalCapabilitiesIssued = 1;
  let internalCapabilitiesConsumed = 1;
  const artifactFunctions = historicalArtifactFunctions();
  if (
    typeof artifactFunctions.publishFixed !== 'function'
    || typeof artifactFunctions.publishForTest !== 'function'
    || typeof artifactFunctions.validateReceipt !== 'function'
  ) {
    burnHistoricalCompleteSourceCapability({
      capability: capturedSource.private_complete_source_capability,
      synthetic,
    });
    internalCapabilitiesConsumed += 1;
    return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.SOURCE_ARTIFACT_BLOCKED,
    rowsScanned: sourceReceipt.rows_scanned,
      candidatesQualified: 1,
      sourceObservationGreen: true,
      ...baseInternal,
      internalCapabilitiesIssued,
      internalCapabilitiesConsumed,
      ...usageArgs,
    });
  }

  let artifactResult;
  try {
    artifactResult = synthetic
      ? await artifactFunctions.publishForTest({
        artifact_root: artifactRoot,
        private_complete_source_capability:
          capturedSource.private_complete_source_capability,
        now_ms: nowMs,
      })
      : await artifactFunctions.publishFixed({
        private_complete_source_capability:
          capturedSource.private_complete_source_capability,
      });
  } catch {
    artifactResult = null;
  }
  internalCapabilitiesConsumed += 1;
  const capturedArtifact = exactDataObject(artifactResult, [
    'private_artifact',
    'private_source_artifact_capability',
    'artifact_path',
    'redacted_receipt',
  ]);
  const artifactGreen = capturedArtifact !== null
    && capturedArtifact.private_source_artifact_capability !== null
    && typeof capturedArtifact.private_source_artifact_capability === 'object'
    && artifactFunctions.validateReceipt(capturedArtifact.redacted_receipt)?.ok === true
    && capturedArtifact.redacted_receipt.private_artifact_capability_issued === true
    && capturedArtifact.redacted_receipt.external_effect_invoked === false
    && capturedArtifact.redacted_receipt.blocker_codes.length === 0;
  if (capturedArtifact?.private_source_artifact_capability !== null
    && typeof capturedArtifact?.private_source_artifact_capability === 'object') {
    internalCapabilitiesIssued += 1;
  }
  if (!artifactGreen) {
    if (internalCapabilitiesIssued === 2) {
      try {
        const consumeArtifact = synthetic
          ? sourceArtifact
            .consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest
          : sourceArtifact
            .consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce;
        consumeArtifact({
          private_source_artifact_capability:
            capturedArtifact.private_source_artifact_capability,
        });
      } catch {
        // A known-issued artifact capability is burned on this presentation.
      }
      internalCapabilitiesConsumed += 1;
    }
    return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.SOURCE_ARTIFACT_BLOCKED,
    rowsScanned: sourceReceipt.rows_scanned,
    candidatesQualified: 1,
    sourceObservationGreen: true,
      ...baseInternal,
      internalCapabilitiesIssued,
      internalCapabilitiesConsumed,
      ...usageArgs,
    });
  }

  const packetFunctions = historicalPacketFunctions();
  if (
    typeof packetFunctions.materialize !== 'function'
    || typeof packetFunctions.materializeForTest !== 'function'
    || typeof packetFunctions.validateReceipt !== 'function'
    || typeof packetFunctions.consume !== 'function'
    || typeof packetFunctions.consumeForTest !== 'function'
  ) {
    try {
      const consumeArtifact = synthetic
        ? sourceArtifact
          .consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnceForTest
        : sourceArtifact
          .consumeWelcomeAudioIabSemanticHistoricalFollowerSourceArtifactCapabilityOnce;
      consumeArtifact({
        private_source_artifact_capability:
          capturedArtifact.private_source_artifact_capability,
      });
    } catch {
      // A known-issued artifact capability is burned on this presentation.
    }
    internalCapabilitiesConsumed += 1;
    return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.PACKET_ADMISSION_BLOCKED,
    rowsScanned: sourceReceipt.rows_scanned,
    candidatesQualified: 1,
    sourceObservationGreen: true,
    sourceArtifactGreen: true,
      ...baseInternal,
      internalCapabilitiesIssued,
      internalCapabilitiesConsumed,
      ...usageArgs,
    });
  }

  let packetResult;
  try {
    packetResult = synthetic
      ? packetFunctions.materializeForTest({
        private_source_artifact_capability:
          capturedArtifact.private_source_artifact_capability,
        packet_request: packetRequest,
        now_ms: nowMs,
      })
      : packetFunctions.materialize({
        private_source_artifact_capability:
          capturedArtifact.private_source_artifact_capability,
        packet_request: packetRequest,
      });
    packetResult = await packetResult;
  } catch {
    packetResult = null;
  }
  internalCapabilitiesConsumed += 1;
  const capturedPacket = exactDataObject(packetResult, [
    'private_draft',
    'private_draft_admission_capability',
    'redacted_receipt',
  ]);
  const draftCapabilityIssued = capturedPacket !== null
    && capturedPacket.private_draft_admission_capability !== null
    && typeof capturedPacket.private_draft_admission_capability === 'object';
  if (draftCapabilityIssued) internalCapabilitiesIssued += 1;
  const packetReceiptGreen = capturedPacket !== null
    && capturedPacket.private_draft !== null
    && capturedPacket.private_draft_admission_capability !== null
    && typeof capturedPacket.private_draft_admission_capability === 'object'
    && packetFunctions.validateReceipt(capturedPacket.redacted_receipt)?.ok === true
    && capturedPacket.redacted_receipt.candidate_count === 1
    && capturedPacket.redacted_receipt.candidate_cap === 1
    && capturedPacket.redacted_receipt.draft_admission_capability_issued === true
    && capturedPacket.redacted_receipt.send_allowed === false
    && capturedPacket.redacted_receipt.live_authority === false
    && capturedPacket.redacted_receipt.browser_used === false
    && capturedPacket.redacted_receipt.network_used === false
    && capturedPacket.redacted_receipt.external_effect_invoked === false
    && capturedPacket.redacted_receipt.blocker_codes.length === 0;
  let finalDraftAdmissionCapabilityConsumed = false;
  let consumedDraft = null;
  if (draftCapabilityIssued) {
    try {
      const consumeDraft = synthetic
        ? packetFunctions.consumeForTest
        : packetFunctions.consume;
      consumedDraft = consumeDraft({
        private_draft_admission_capability:
          capturedPacket.private_draft_admission_capability,
      });
    } catch {
      consumedDraft = null;
    }
    finalDraftAdmissionCapabilityConsumed = true;
    internalCapabilitiesConsumed += 1;
  }
  const packetGreen = packetReceiptGreen
    && finalDraftAdmissionCapabilityConsumed
    && consumedDraft?.private_draft === capturedPacket.private_draft;
  if (!packetGreen) return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.PACKET_ADMISSION_BLOCKED,
    rowsScanned: sourceReceipt.rows_scanned,
    candidatesQualified: 1,
    sourceObservationGreen: true,
    sourceArtifactGreen: true,
    ...baseInternal,
    internalCapabilitiesIssued,
    internalCapabilitiesConsumed,
    finalDraftAdmissionCapabilityConsumed,
    ...usageArgs,
  });

  return resultFromReceipt(buildReceipt({
    command,
    decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.PREPARED,
    rowsScanned: sourceReceipt.rows_scanned,
    candidatesQualified: 1,
    sourceObservationGreen: true,
    sourceArtifactGreen: true,
    packetAdmissionGreen: true,
    internalOpaqueRegistryUsed: true,
    internalCapabilitiesIssued,
    internalCapabilitiesConsumed,
    stageHandoffConsumed: true,
    finalDraftAdmissionCapabilityConsumed: true,
    ...usageArgs,
  }));
};

const isSyntheticTempArtifactRoot = (value) => {
  if (typeof value !== 'string' || value.length < 1 || !isAbsolute(value)) return false;
  const normalized = resolve(value);
  const base = resolve(tmpdir());
  const child = relative(base, normalized);
  const prefix =
    sourceArtifact.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V4;
  return normalized === value
    && child.length > 0
    && child !== '..'
    && !child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    && !isAbsolute(child)
    && typeof prefix === 'string'
    && child.split(/[\\/]/u).at(-1).startsWith(prefix);
};

const captureScenarioControls = (value) => exactDataObject(value, [
  'open_scenario',
  'qualification_scenario',
  'observation_scenario',
  'finalize_scenario',
]);

const buildSyntheticPacketRequest = () => Object.freeze({
  schema_version:
    packetMaterializer
      .WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_REQUEST_SCHEMA_VERSION_V3,
  status: 'approved_for_no_live_materialization_only',
  mission_id: 'synthetic_historical_catchup_packet_mission_001',
  contract_version: 'synthetic_historical_catchup_packet_contract_v3',
  central_repo_head: '0'.repeat(40),
  authorization_id: 'synthetic_historical_catchup_no_live_authorization_001',
  expected_source_mission_id:
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_MISSION_ID,
  candidate_cap: 1,
  future_attempt_cap: 1,
  approved_audio_asset_id: 'synthetic_approved_audio_asset_001',
  approved_audio_sha256: '0'.repeat(64),
  approved_audio_binding_evidence: 'exact_approved_audio_binding_revalidated',
  execution_approval_authorized: false,
  external_effect_authorized: false,
});

const blockedResetResultPreservingProgress = ({ command, result }) => {
  const receipt = exactDataObject(result?.redacted_receipt, RECEIPT_FIELDS);
  if (!receipt) return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
  });
  const burnedHeldHandoff = receipt.internal_opaque_registry_active_at_return
    && burnPendingStageHandoff();
  return blockedResult({
    command,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
    sourceMode: receipt.source_mode,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    candidatesQualified: receipt.candidates_qualified,
    sourceQualificationGreen: receipt.source_qualification_green,
    sourceObservationGreen: receipt.source_observation_green,
    sourceArtifactGreen: receipt.source_artifact_green,
    packetAdmissionGreen: receipt.packet_admission_green,
    sourceReadOnlyActionAttempted: receipt.source_read_only_action_attempted,
    sourceReadOnlyActionPerformed: receipt.source_read_only_action_performed,
    sourceUsageAttestationGreen: receipt.source_usage_attestation_green,
    browserUsageAttested: receipt.browser_usage_attested,
    networkUsageAttested: receipt.network_usage_attested,
    browserUsed: receipt.browser_used,
    networkUsed: receipt.network_used,
    internalOpaqueRegistryUsed: receipt.internal_opaque_registry_used,
    internalOpaqueRegistryActiveAtReturn: false,
    internalCapabilitiesIssued: receipt.internal_capabilities_issued,
    internalCapabilitiesConsumed: receipt.internal_capabilities_consumed
      + Number(burnedHeldHandoff),
    internalCapabilitiesConditionallyHeld: 0,
    stageHandoffConsumed: receipt.stage_handoff_consumed || burnedHeldHandoff,
    finalDraftAdmissionCapabilityConsumed:
      receipt.final_draft_admission_capability_consumed,
  });
};

const runWelcomeAudioHistoricalCatchupNoSendOperatorOnce = async (
  parameters = {},
) => {
  const commandCandidate = exactDataObject(parameters, ['command'])?.command ?? null;
  const command = stageForCommand(commandCandidate) === null
    ? WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
    : commandCandidate;
  if (commandCandidate
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION) {
    if (!exactDataObject(parameters, ['command'])) return blockedResult({
      command,
      blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      sourceMode: SOURCE_MODE.PRODUCTION,
      sourceUsageAttestationGreen: false,
      browserUsageAttested: false,
      networkUsageAttested: false,
      browserUsed: null,
      networkUsed: null,
    });
    return runStage2({ synthetic: false, nowMs: null });
  }
  if (commandCandidate
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION) {
    const input = exactDataObject(parameters, ['command']);
    if (!input) return blockedResult({
      command,
      blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      sourceMode: SOURCE_MODE.PRODUCTION,
      sourceUsageAttestationGreen: false,
      browserUsageAttested: false,
      networkUsageAttested: false,
      browserUsed: null,
      networkUsed: null,
    });
    return runStage3({
      synthetic: false,
      nowMs: null,
      artifactRoot: null,
      packetRequest: null,
    });
  }
  return blockedResult({
    command,
    blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
    sourceMode: SOURCE_MODE.PRODUCTION,
    sourceUsageAttestationGreen: false,
    browserUsageAttested: false,
    networkUsageAttested: false,
    browserUsed: null,
    networkUsed: null,
  });
};

const runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest = async (
  parameters = {},
) => {
  const possible = exactDataObject(parameters, [
    'command',
    'now_ms',
    'scenario_controls',
  ]) ?? exactDataObject(parameters, [
    'command',
    'now_ms',
    'artifact_root',
    'scenario_controls',
  ]) ?? exactDataObject(parameters, [
    'command',
    'now_ms',
    'scenario_controls',
    'test_cleanup_scenario',
  ]) ?? exactDataObject(parameters, [
    'command',
    'now_ms',
    'artifact_root',
    'scenario_controls',
    'test_cleanup_scenario',
  ]);
  const command = stageForCommand(possible?.command) === null
    ? WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
    : possible.command;
  const controls = possible ? captureScenarioControls(possible.scenario_controls) : null;
  const stage = possible ? stageForCommand(possible.command) : null;
  const cleanupScenario = possible?.test_cleanup_scenario ?? 'exact';
  const shapeValid = possible !== null
    && controls !== null
    && validNowMs(possible.now_ms)
    && (
      (stage === 'stage_2' && exactDataObject(parameters, [
        'command',
        'now_ms',
        'scenario_controls',
      ]) !== null || (stage === 'stage_2' && exactDataObject(parameters, [
        'command',
        'now_ms',
        'scenario_controls',
        'test_cleanup_scenario',
      ]) !== null))
      || (stage === 'stage_3'
        && (
          exactDataObject(parameters, [
            'command',
            'now_ms',
            'artifact_root',
            'scenario_controls',
          ]) !== null
          || exactDataObject(parameters, [
            'command',
            'now_ms',
            'artifact_root',
            'scenario_controls',
            'test_cleanup_scenario',
          ]) !== null
        )
        && isSyntheticTempArtifactRoot(possible.artifact_root))
    );
  const cleanupScenarioValid = ['exact', 'runtime_already_reset'].includes(
    cleanupScenario,
  );
  if (!shapeValid || !cleanupScenarioValid) return blockedResult({
    command,
    blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
  });
  let installed = false;
  try {
    installed = sourceHost.installWelcomeAudioIabSemanticRuntimeFacadeForTest(controls) === true;
  } catch {
    installed = false;
  }
  if (!installed) {
    const burnedHeldHandoff = burnPendingStageHandoff();
    return blockedResult({
      command,
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_INSTALL_FAILED,
      internalOpaqueRegistryUsed: burnedHeldHandoff,
      internalCapabilitiesConsumed: Number(burnedHeldHandoff),
      stageHandoffConsumed: burnedHeldHandoff,
    });
  }
  let result;
  let reset = false;
  try {
    result = stage === 'stage_2'
      ? await runStage2({ synthetic: true, nowMs: possible.now_ms })
      : await runStage3({
        synthetic: true,
        nowMs: possible.now_ms,
        artifactRoot: possible.artifact_root,
        packetRequest: buildSyntheticPacketRequest(),
      });
  } finally {
    try {
      if (cleanupScenario === 'runtime_already_reset') {
        sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
      }
      reset = sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest() === true;
    } catch {
      reset = false;
    }
  }
  if (!reset) return blockedResetResultPreservingProgress({ command, result });
  return result;
};

const resetWelcomeAudioHistoricalCatchupNoSendOperatorStateForTest = () => {
  burnPendingStageHandoff();
  return true;
};

export {
  RECEIPT_FIELDS as WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_FIELDS,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION,
  runWelcomeAudioHistoricalCatchupNoSendOperatorOnce,
  runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest,
  resetWelcomeAudioHistoricalCatchupNoSendOperatorStateForTest,
  validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt,
};
