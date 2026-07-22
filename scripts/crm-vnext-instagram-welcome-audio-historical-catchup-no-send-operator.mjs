import { types as nodeUtilTypes } from 'node:util';

import * as sourceHost from './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID =
  'crm_core_historical_catchup_pilot_no_live_v1_20260722';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_receipt_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES = 1;

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND = Object.freeze({
  STAGE_2_QUALIFICATION: 'stage_2_qualification_only',
});

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION = Object.freeze({
  QUALIFIED: 'historical_notification_profile_pairs_qualified_no_send',
  BLOCKED: 'historical_catchup_operator_blocked_no_send',
});

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_historical_catchup_operator_input_invalid',
  REAL_STAGE_2_AUTHORIZATION_REQUIRED:
    'blocked_historical_catchup_operator_real_stage_2_authorization_required',
  TEST_RUNTIME_INSTALL_FAILED:
    'blocked_historical_catchup_operator_test_runtime_install_failed',
  TEST_RUNTIME_RESET_FAILED:
    'blocked_historical_catchup_operator_test_runtime_reset_failed',
  SOURCE_QUALIFICATION_BLOCKED:
    'blocked_historical_catchup_operator_source_qualification',
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

const SOURCE_MODE = Object.freeze({
  PRODUCTION: 'production_environment_facade',
  SYNTHETIC: 'synthetic_test_proof',
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

const syntheticSourceUsageTruth = (receipt) => {
  const attempted = receipt?.read_only_source_action_attempted === true;
  const performed = receipt?.read_only_source_action_performed === true;
  return Object.freeze({
    sourceMode: SOURCE_MODE.SYNTHETIC,
    attempted,
    performed,
    attestationGreen: true,
    browserUsageAttested: true,
    networkUsageAttested: true,
    browserUsed: false,
    networkUsed: false,
  });
};

const buildReceipt = ({
  decision,
  blocker = null,
  sourceMode = SOURCE_MODE.SYNTHETIC,
  rowsScanned = 0,
  pairsQualified = 0,
  sourceQualificationGreen = false,
  sourceReadOnlyActionAttempted = false,
  sourceReadOnlyActionPerformed = false,
  sourceUsageAttestationGreen = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  networkUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  networkUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
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
  command:
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION,
  stage: 'stage_2',
  decision,
  max_candidates: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES,
  rows_scanned: rowsScanned,
  notification_profile_pairs_qualified: pairsQualified,
  candidates_qualified: 0,
  source_qualification_green: sourceQualificationGreen,
  source_observation_green: false,
  source_artifact_green: false,
  packet_admission_green: false,
  source_read_only_action_attempted: sourceReadOnlyActionAttempted,
  source_read_only_action_performed: sourceReadOnlyActionPerformed,
  source_usage_attestation_green: sourceUsageAttestationGreen,
  browser_usage_attested: browserUsageAttested,
  network_usage_attested: networkUsageAttested,
  ...FIXED_FALSE_FLAGS,
  internal_opaque_registry_used: false,
  internal_opaque_registry_active_at_return: false,
  internal_capabilities_issued: 0,
  internal_capabilities_consumed: 0,
  internal_capabilities_conditionally_held: 0,
  stage_handoff_consumed: false,
  final_draft_admission_capability_consumed: false,
  browser_used: browserUsed,
  network_used: networkUsed,
  blocker_codes: Object.freeze(blocker === null ? [] : [blocker]),
});

const resultFromReceipt = (redactedReceipt) => Object.freeze({
  redacted_receipt: redactedReceipt,
});

const blockedResult = ({
  blocker,
  sourceMode = SOURCE_MODE.SYNTHETIC,
  rowsScanned = 0,
  pairsQualified = 0,
  sourceQualificationGreen = false,
  sourceReadOnlyActionAttempted = false,
  sourceReadOnlyActionPerformed = false,
  sourceUsageAttestationGreen = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  networkUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  networkUsed = sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
}) => resultFromReceipt(buildReceipt({
  decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
  blocker,
  sourceMode,
  rowsScanned,
  pairsQualified,
  sourceQualificationGreen,
  sourceReadOnlyActionAttempted,
  sourceReadOnlyActionPerformed,
  sourceUsageAttestationGreen,
  browserUsageAttested,
  networkUsageAttested,
  browserUsed,
  networkUsed,
}));

const noSourcePhase = (receipt) => receipt.rows_scanned === 0
  && receipt.notification_profile_pairs_qualified === 0
  && !receipt.source_qualification_green
  && !receipt.source_read_only_action_attempted
  && !receipt.source_read_only_action_performed;

const qualificationGreenPhase = (receipt) => receipt.rows_scanned >= 1
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
  && receipt.notification_profile_pairs_qualified === 2
  && receipt.source_qualification_green
  && receipt.source_read_only_action_attempted
  && receipt.source_read_only_action_performed;

const qualificationBlockedPhase = (receipt) => receipt.rows_scanned >= 0
  && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS + 1
  && receipt.notification_profile_pairs_qualified >= 0
  && receipt.notification_profile_pairs_qualified <= 2
  && receipt.notification_profile_pairs_qualified <= receipt.rows_scanned
  && !receipt.source_qualification_green
  && (receipt.rows_scanned === 0
    && receipt.notification_profile_pairs_qualified === 0
    || receipt.source_read_only_action_attempted
      && receipt.source_read_only_action_performed);

const validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt = (value) => {
  const receipt = exactDataObject(value, RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes, 1);
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
    || receipt.command
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
    || receipt.stage !== 'stage_2'
    || !boundedNumbers
    || receipt.max_candidates
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES
    || receipt.rows_scanned < 0
    || receipt.rows_scanned > sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS + 1
    || receipt.notification_profile_pairs_qualified < 0
    || receipt.notification_profile_pairs_qualified > 2
    || receipt.notification_profile_pairs_qualified > receipt.rows_scanned
    || receipt.candidates_qualified !== 0
    || receipt.source_observation_green
    || receipt.source_artifact_green
    || receipt.packet_admission_green
    || receipt.internal_opaque_registry_used
    || receipt.internal_opaque_registry_active_at_return
    || receipt.internal_capabilities_issued !== 0
    || receipt.internal_capabilities_consumed !== 0
    || receipt.internal_capabilities_conditionally_held !== 0
    || receipt.stage_handoff_consumed
    || receipt.final_draft_admission_capability_consumed
    || booleanFields.some((flag) => typeof flag !== 'boolean')
    || ![true, false, null].includes(receipt.browser_used)
    || ![true, false, null].includes(receipt.network_used)
    || Object.keys(FIXED_FALSE_FLAGS).some((field) => receipt[field] !== false)
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });

  const syntheticUsage = receipt.source_mode === SOURCE_MODE.SYNTHETIC
    && receipt.source_usage_attestation_green
    && receipt.browser_usage_attested
    && receipt.network_usage_attested
    && receipt.browser_used === false
    && receipt.network_used === false;
  const productionUsage = receipt.source_mode === SOURCE_MODE.PRODUCTION
    && !receipt.source_usage_attestation_green
    && !receipt.browser_usage_attested
    && !receipt.network_usage_attested
    && !receipt.source_read_only_action_attempted
    && !receipt.source_read_only_action_performed
    && receipt.browser_used === null
    && receipt.network_used === null
    && receipt.rows_scanned === 0
    && receipt.notification_profile_pairs_qualified === 0;
  if (
    (!syntheticUsage && !productionUsage)
    || (receipt.rows_scanned > 0
      && (!receipt.source_read_only_action_attempted
        || !receipt.source_read_only_action_performed))
    || (receipt.source_read_only_action_performed
      && !receipt.source_read_only_action_attempted)
  ) return Object.freeze({ ok: false, reason: 'receipt_truth_invalid' });

  const qualified = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED;
  const blocked = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED;
  if (Number(qualified) + Number(blocked) !== 1) {
    return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  }
  if (qualified) {
    if (
      blockers.length !== 0
      || !qualificationGreenPhase(receipt)
      || !syntheticUsage
      || receipt.internal_opaque_registry_used
    ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
    return Object.freeze({ ok: true, reason: null });
  }
  if (
    blockers.length !== 1
    || !Object.values(WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER)
      .includes(blockers[0])
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });

  const blocker = blockers[0];
  const sourceModeAllowsBlocker = [
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .TEST_RUNTIME_INSTALL_FAILED,
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_RESET_FAILED,
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .SOURCE_QUALIFICATION_BLOCKED,
  ].includes(blocker)
    ? receipt.source_mode === SOURCE_MODE.SYNTHETIC
    : blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .REAL_STAGE_2_AUTHORIZATION_REQUIRED
      ? receipt.source_mode === SOURCE_MODE.PRODUCTION
      : true;
  const reachable = blocker
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID
    ? noSourcePhase(receipt) && !receipt.internal_opaque_registry_used
    : blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .REAL_STAGE_2_AUTHORIZATION_REQUIRED
      ? receipt.source_mode === SOURCE_MODE.PRODUCTION && noSourcePhase(receipt)
      : blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_INSTALL_FAILED
      ? noSourcePhase(receipt) && !receipt.internal_opaque_registry_used
      : blocker
        === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED
        ? noSourcePhase(receipt)
          || qualificationGreenPhase(receipt)
          || qualificationBlockedPhase(receipt)
        : blocker
          === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
            .SOURCE_QUALIFICATION_BLOCKED
          && qualificationBlockedPhase(receipt);
  if (!sourceModeAllowsBlocker || !reachable) {
    return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  }
  return Object.freeze({ ok: true, reason: null });
};

const safeQualificationReceipt = (result) => {
  const captured = exactDataObject(result, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  if (!captured) return null;
  const validation =
    sourceHost.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      captured.redacted_receipt,
    );
  return validation?.ok === true ? captured : null;
};

const burnUnexpectedHistoricalCompleteSourceCapability = (capability) => {
  if (capability === null || typeof capability !== 'object') return false;
  try {
    sourceHost
      .consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnceForTest(
        capability,
      );
  } catch {
    // A capability that should never be emitted by qualification is terminally presented.
  }
  return true;
};

const runSyntheticStage2 = async ({ nowMs }) => {
  let sourceResult;
  try {
    sourceResult = await sourceHost
      .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnceForTest({
        now_ms: nowMs,
      });
  } catch {
    sourceResult = null;
  }
  const rawCapturedSource = exactDataObject(sourceResult, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  const captured = safeQualificationReceipt(sourceResult);
  const receipt = captured?.redacted_receipt;
  const usage = syntheticSourceUsageTruth(receipt);
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
  const sourceGreen = captured !== null
    && captured.private_complete_source_capability === null
    && receipt.decision === sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED
    && receipt.notification_profile_pairs_qualified === 2
    && receipt.capability_issued === false
    && receipt.external_effect_invoked === false
    && receipt.external_effect_possible_or_unknown === false
    && receipt.blocker_codes.length === 0;
  if (!sourceGreen) {
    burnUnexpectedHistoricalCompleteSourceCapability(
      rawCapturedSource?.private_complete_source_capability,
    );
    return blockedResult({
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      rowsScanned: Number.isSafeInteger(receipt?.rows_scanned) ? receipt.rows_scanned : 0,
      pairsQualified: Number.isSafeInteger(receipt?.notification_profile_pairs_qualified)
        ? receipt.notification_profile_pairs_qualified
        : 0,
      ...usageArgs,
    });
  }
  return resultFromReceipt(buildReceipt({
    decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    sourceQualificationGreen: true,
    ...usageArgs,
  }));
};

const captureScenarioControls = (value) => exactDataObject(value, [
  'open_scenario',
  'qualification_scenario',
  'observation_scenario',
  'finalize_scenario',
]);

const blockedResetResultPreservingProgress = (result) => {
  const captured = exactDataObject(result, ['redacted_receipt']);
  const receipt = captured?.redacted_receipt;
  if (
    !receipt
    || validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(receipt).ok !== true
  ) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
  });
  return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
    sourceMode: receipt.source_mode,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    sourceQualificationGreen: receipt.source_qualification_green,
    sourceReadOnlyActionAttempted: receipt.source_read_only_action_attempted,
    sourceReadOnlyActionPerformed: receipt.source_read_only_action_performed,
    sourceUsageAttestationGreen: receipt.source_usage_attestation_green,
    browserUsageAttested: receipt.browser_usage_attested,
    networkUsageAttested: receipt.network_usage_attested,
    browserUsed: receipt.browser_used,
    networkUsed: receipt.network_used,
  });
};

const runWelcomeAudioHistoricalCatchupNoSendOperatorOnce = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['command']);
  if (
    input?.command
    !== WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
  ) return blockedResult({
    blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
    sourceMode: SOURCE_MODE.PRODUCTION,
    sourceUsageAttestationGreen: false,
    browserUsageAttested: false,
    networkUsageAttested: false,
    browserUsed: null,
    networkUsed: null,
  });
  return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .REAL_STAGE_2_AUTHORIZATION_REQUIRED,
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
    'scenario_controls',
    'test_cleanup_scenario',
  ]);
  const controls = possible ? captureScenarioControls(possible.scenario_controls) : null;
  const cleanupScenario = possible?.test_cleanup_scenario ?? 'exact';
  const shapeValid = possible !== null
    && possible.command
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
    && controls !== null
    && validNowMs(possible.now_ms)
    && ['exact', 'runtime_already_reset'].includes(cleanupScenario);
  if (!shapeValid) return blockedResult({
    blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
  });
  let installed = false;
  try {
    installed = sourceHost.installWelcomeAudioIabSemanticRuntimeFacadeForTest(controls) === true;
  } catch {
    installed = false;
  }
  if (!installed) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_INSTALL_FAILED,
  });
  let result;
  let reset = false;
  try {
    result = await runSyntheticStage2({ nowMs: possible.now_ms });
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
  return reset ? result : blockedResetResultPreservingProgress(result);
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
  validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt,
};
