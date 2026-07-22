import { types as nodeUtilTypes } from 'node:util';

import * as sourceHost from './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';
import * as stage2AuthorityGate from './crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs';

const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_v2';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MISSION_ID =
  'crm_core_historical_catchup_productive_stage2_authority_gate_repo_only_v1_20260722';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_receipt_v2';
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
  STAGE_2_AUTHORITY_REJECTED:
    'blocked_historical_catchup_operator_stage_2_authority_rejected',
  TEST_AUTHORITY_RUNTIME_INSTALL_FAILED:
    'blocked_historical_catchup_operator_test_authority_runtime_install_failed',
  TEST_AUTHORITY_RUNTIME_RESET_FAILED:
    'blocked_historical_catchup_operator_test_authority_runtime_reset_failed',
  TEST_RUNTIME_INSTALL_FAILED:
    'blocked_historical_catchup_operator_test_runtime_install_failed',
  TEST_RUNTIME_RESET_FAILED:
    'blocked_historical_catchup_operator_test_runtime_reset_failed',
  SOURCE_RESULT_INVALID:
    'blocked_historical_catchup_operator_source_result_invalid',
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
  'authority_recognized',
  'authority_consumed',
  'authority_valid',
  'source_host_invoked',
  'max_candidates',
  'rows_scanned',
  'notification_profile_pairs_qualified',
  'distinct_pairs_proven',
  'threads_opened',
  'seen_transitions',
  'challenge_or_error_absent',
  'candidates_qualified',
  'source_qualification_green',
  'source_observation_green',
  'source_artifact_green',
  'packet_admission_green',
  'source_read_only_action_attempted',
  'source_read_only_action_performed',
  'isolated_tab_opened',
  'isolated_tab_finalized',
  'isolated_tab_finalize_attempts',
  'external_effect_possible_or_unknown',
  'primary_source_blocker',
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

const buildReceipt = ({
  decision,
  blocker = null,
  sourceMode = SOURCE_MODE.SYNTHETIC,
  authorityRecognized = false,
  authorityConsumed = false,
  authorityValid = false,
  sourceHostInvoked = false,
  rowsScanned = 0,
  pairsQualified = 0,
  distinctPairsProven = false,
  threadsOpened = 0,
  seenTransitions = 0,
  challengeOrErrorAbsent = false,
  sourceQualificationGreen = false,
  sourceReadOnlyActionAttempted = false,
  sourceReadOnlyActionPerformed = false,
  isolatedTabOpened = false,
  isolatedTabFinalized = false,
  isolatedTabFinalizeAttempts = 0,
  externalEffectInvoked = false,
  externalEffectPossibleOrUnknown = false,
  primarySourceBlocker = null,
  sourceUsageAttestationGreen = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested = true,
  networkUsageAttested = sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed = false,
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
  authority_recognized: authorityRecognized,
  authority_consumed: authorityConsumed,
  authority_valid: authorityValid,
  source_host_invoked: sourceHostInvoked,
  max_candidates: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_MAX_CANDIDATES,
  rows_scanned: rowsScanned,
  notification_profile_pairs_qualified: pairsQualified,
  distinct_pairs_proven: distinctPairsProven,
  threads_opened: threadsOpened,
  seen_transitions: seenTransitions,
  challenge_or_error_absent: challengeOrErrorAbsent,
  candidates_qualified: 0,
  source_qualification_green: sourceQualificationGreen,
  source_observation_green: false,
  source_artifact_green: false,
  packet_admission_green: false,
  source_read_only_action_attempted: sourceReadOnlyActionAttempted,
  source_read_only_action_performed: sourceReadOnlyActionPerformed,
  isolated_tab_opened: isolatedTabOpened,
  isolated_tab_finalized: isolatedTabFinalized,
  isolated_tab_finalize_attempts: isolatedTabFinalizeAttempts,
  external_effect_invoked: externalEffectInvoked,
  external_effect_possible_or_unknown: externalEffectPossibleOrUnknown,
  primary_source_blocker: primarySourceBlocker,
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

const blockedResult = (parameters) => resultFromReceipt(buildReceipt({
  ...parameters,
  decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
}));

const safeAuthorityResult = (value) => {
  const captured = exactDataObject(
    value,
    stage2AuthorityGate.WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RESULT_FIELDS,
  );
  if (
    !captured
    || stage2AuthorityGate.validateWelcomeAudioHistoricalCatchupStage2AuthorityResult(
      captured,
    )?.ok !== true
  ) return null;
  return captured;
};

const safeQualificationResult = (value) => {
  const captured = exactDataObject(value, [
    'private_complete_source_capability',
    'redacted_receipt',
  ]);
  if (
    !captured
    || captured.private_complete_source_capability !== null
    || sourceHost.validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(
      captured.redacted_receipt,
    )?.ok !== true
  ) return null;
  return captured;
};

const sourceArgsFromValidatedReceipt = ({ receipt, sourceMode }) => {
  const synthetic = sourceMode === SOURCE_MODE.SYNTHETIC;
  const sourceBlockers = exactArray(receipt.blocker_codes, 1);
  const sourceBlocker = sourceBlockers?.length === 1 ? sourceBlockers[0] : null;
  const attempted = receipt.read_only_source_action_attempted;
  const performed = receipt.read_only_source_action_performed;
  const opened = receipt.isolated_tab_opened;
  const browserUsed = synthetic ? false : opened ? true : attempted ? null : false;
  return Object.freeze({
    sourceMode,
    sourceHostInvoked: true,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    distinctPairsProven: receipt.distinct_pairs_proven,
    threadsOpened: receipt.threads_opened,
    seenTransitions: receipt.seen_transitions,
    challengeOrErrorAbsent: receipt.challenge_or_error_absent,
    sourceQualificationGreen:
      receipt.decision === sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
    sourceReadOnlyActionAttempted: attempted,
    sourceReadOnlyActionPerformed: performed,
    isolatedTabOpened: opened,
    isolatedTabFinalized: receipt.isolated_tab_finalized,
    isolatedTabFinalizeAttempts: attempted ? 1 : 0,
    externalEffectInvoked: receipt.external_effect_invoked,
    externalEffectPossibleOrUnknown: receipt.external_effect_possible_or_unknown,
    primarySourceBlocker: sourceBlocker,
    sourceUsageAttestationGreen: synthetic,
    browserUsageAttested: synthetic || browserUsed !== null,
    networkUsageAttested: synthetic,
    browserUsed,
    networkUsed: synthetic ? false : null,
  });
};

const malformedSourceArgs = (sourceMode) => Object.freeze({
  sourceMode,
  sourceHostInvoked: true,
  sourceReadOnlyActionAttempted: true,
  sourceReadOnlyActionPerformed: false,
  isolatedTabOpened: null,
  isolatedTabFinalized: null,
  isolatedTabFinalizeAttempts: null,
  externalEffectInvoked: null,
  externalEffectPossibleOrUnknown: true,
  primarySourceBlocker: null,
  sourceUsageAttestationGreen: sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsageAttested: sourceMode === SOURCE_MODE.SYNTHETIC,
  networkUsageAttested: sourceMode === SOURCE_MODE.SYNTHETIC,
  browserUsed: sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  networkUsed: sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
});

const runAuthorizedStage2 = async ({ consumeAuthority, runSource, sourceMode }) => {
  let rawAuthorityResult = null;
  try {
    rawAuthorityResult = await consumeAuthority();
  } catch {
    rawAuthorityResult = null;
  }
  const authorityResult = safeAuthorityResult(rawAuthorityResult);
  if (!authorityResult?.authority_valid) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .STAGE_2_AUTHORITY_REJECTED,
    sourceMode,
    authorityRecognized: authorityResult?.authority_recognized === true,
    authorityConsumed: authorityResult?.authority_consumed === true,
    authorityValid: false,
    sourceUsageAttestationGreen: sourceMode === SOURCE_MODE.SYNTHETIC,
    browserUsageAttested: true,
    networkUsageAttested: sourceMode === SOURCE_MODE.SYNTHETIC,
    browserUsed: false,
    networkUsed: sourceMode === SOURCE_MODE.SYNTHETIC ? false : null,
  });

  const authorityArgs = Object.freeze({
    authorityRecognized: true,
    authorityConsumed: true,
    authorityValid: true,
  });
  let rawSourceResult = null;
  try {
    rawSourceResult = await runSource();
  } catch {
    rawSourceResult = null;
  }
  const sourceResult = safeQualificationResult(rawSourceResult);
  if (!sourceResult) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.SOURCE_RESULT_INVALID,
    ...authorityArgs,
    ...malformedSourceArgs(sourceMode),
  });

  const receipt = sourceResult.redacted_receipt;
  const sourceArgs = sourceArgsFromValidatedReceipt({ receipt, sourceMode });
  const sourceGreen = sourceArgs.sourceQualificationGreen
    && receipt.notification_profile_pairs_qualified === 2
    && receipt.distinct_pairs_proven === true
    && receipt.threads_opened === 0
    && receipt.seen_transitions === 0
    && receipt.capability_issued === false
    && receipt.external_effect_invoked === false
    && receipt.external_effect_possible_or_unknown === false
    && receipt.isolated_tab_opened === true
    && receipt.isolated_tab_finalized === true
    && receipt.blocker_codes.length === 0;
  if (!sourceGreen) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .SOURCE_QUALIFICATION_BLOCKED,
    ...authorityArgs,
    ...sourceArgs,
  });
  return resultFromReceipt(buildReceipt({
    decision: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    ...authorityArgs,
    ...sourceArgs,
  }));
};

const noSourcePhase = (receipt) => receipt.source_host_invoked === false
  && receipt.rows_scanned === 0
  && receipt.notification_profile_pairs_qualified === 0
  && receipt.distinct_pairs_proven === false
  && receipt.threads_opened === 0
  && receipt.seen_transitions === 0
  && receipt.challenge_or_error_absent === false
  && receipt.source_qualification_green === false
  && receipt.source_read_only_action_attempted === false
  && receipt.source_read_only_action_performed === false
  && receipt.isolated_tab_opened === false
  && receipt.isolated_tab_finalized === false
  && receipt.isolated_tab_finalize_attempts === 0
  && receipt.external_effect_invoked === false
  && receipt.external_effect_possible_or_unknown === false
  && receipt.primary_source_blocker === null;

const projectedValidatedSourceReceiptIsGreen = (receipt) => {
  if (
    receipt.source_host_invoked !== true
    || typeof receipt.isolated_tab_opened !== 'boolean'
    || typeof receipt.isolated_tab_finalized !== 'boolean'
    || typeof receipt.external_effect_invoked !== 'boolean'
    || ![0, 1].includes(receipt.isolated_tab_finalize_attempts)
  ) return false;
  const projected = Object.freeze({
    receipt_schema_version:
      sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_RECEIPT_SCHEMA_VERSION,
    source_contract_version: sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
    source_backend: sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
    redaction_status:
      'aggregate_allowlist_only_no_identity_handle_url_reference_thread_owner_dom_selector_screenshot_coordinate_or_private_text',
    stage: sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE
      .QUALIFY_NOTIFICATION_PROFILE_PAIR,
    decision: receipt.source_qualification_green
      ? sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED
      : sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
    rows_scanned: receipt.rows_scanned,
    notification_profile_pairs_qualified: receipt.notification_profile_pairs_qualified,
    distinct_pairs_proven: receipt.distinct_pairs_proven,
    threads_opened: receipt.threads_opened,
    seen_transitions: receipt.seen_transitions,
    challenge_or_error_absent: receipt.challenge_or_error_absent,
    isolated_tab_opened: receipt.isolated_tab_opened,
    isolated_tab_finalized: receipt.isolated_tab_finalized,
    capability_issued: false,
    read_only_source_action_attempted: receipt.source_read_only_action_attempted,
    read_only_source_action_performed: receipt.source_read_only_action_performed,
    external_effect_invoked: receipt.external_effect_invoked,
    external_effect_possible_or_unknown: receipt.external_effect_possible_or_unknown,
    blocker_codes: Object.freeze(
      receipt.primary_source_blocker === null ? [] : [receipt.primary_source_blocker],
    ),
  });
  return sourceHost
    .validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt(projected)
    ?.ok === true;
};

const malformedSourcePhase = (receipt) => receipt.source_host_invoked === true
  && receipt.rows_scanned === 0
  && receipt.notification_profile_pairs_qualified === 0
  && receipt.distinct_pairs_proven === false
  && receipt.threads_opened === 0
  && receipt.seen_transitions === 0
  && receipt.challenge_or_error_absent === false
  && receipt.source_qualification_green === false
  && receipt.source_read_only_action_attempted === true
  && receipt.source_read_only_action_performed === false
  && receipt.isolated_tab_opened === null
  && receipt.isolated_tab_finalized === null
  && receipt.isolated_tab_finalize_attempts === null
  && receipt.external_effect_invoked === null
  && receipt.external_effect_possible_or_unknown === true
  && receipt.primary_source_blocker === null;

const validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt = (value) => {
  const receipt = exactDataObject(value, RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes, 1);
  const boundedNumbers = [
    receipt.max_candidates,
    receipt.rows_scanned,
    receipt.notification_profile_pairs_qualified,
    receipt.threads_opened,
    receipt.seen_transitions,
    receipt.candidates_qualified,
    receipt.internal_capabilities_issued,
    receipt.internal_capabilities_consumed,
    receipt.internal_capabilities_conditionally_held,
  ].every(Number.isSafeInteger);
  const booleanFields = [
    receipt.authority_recognized,
    receipt.authority_consumed,
    receipt.authority_valid,
    receipt.source_host_invoked,
    receipt.distinct_pairs_proven,
    receipt.challenge_or_error_absent,
    receipt.source_qualification_green,
    receipt.source_observation_green,
    receipt.source_artifact_green,
    receipt.packet_admission_green,
    receipt.source_read_only_action_attempted,
    receipt.source_read_only_action_performed,
    receipt.external_effect_possible_or_unknown,
    receipt.source_usage_attestation_green,
    receipt.browser_usage_attested,
    receipt.network_usage_attested,
    receipt.internal_opaque_registry_used,
    receipt.internal_opaque_registry_active_at_return,
    receipt.stage_handoff_consumed,
    receipt.final_draft_admission_capability_consumed,
  ];
  const primarySourceBlockerValid = receipt.primary_source_blocker === null
    || Object.values(sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER)
      .includes(receipt.primary_source_blocker);
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
    || receipt.notification_profile_pairs_qualified < 0
    || receipt.notification_profile_pairs_qualified > receipt.rows_scanned
    || receipt.threads_opened < 0
    || receipt.seen_transitions < 0
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
    || ![true, false, null].includes(receipt.isolated_tab_opened)
    || ![true, false, null].includes(receipt.isolated_tab_finalized)
    || ![0, 1, null].includes(receipt.isolated_tab_finalize_attempts)
    || ![true, false, null].includes(receipt.external_effect_invoked)
    || ![true, false, null].includes(receipt.browser_used)
    || ![true, false, null].includes(receipt.network_used)
    || !primarySourceBlockerValid
    || Object.keys(FIXED_FALSE_FLAGS).some((field) => receipt[field] !== false)
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });

  const syntheticUsage = receipt.source_mode === SOURCE_MODE.SYNTHETIC
    && receipt.source_usage_attestation_green
    && receipt.browser_usage_attested
    && receipt.network_usage_attested
    && receipt.browser_used === false
    && receipt.network_used === false;
  const validatedSource = projectedValidatedSourceReceiptIsGreen(receipt);
  const malformedSource = malformedSourcePhase(receipt);
  const productionBrowserTruth = receipt.source_mode === SOURCE_MODE.PRODUCTION
    && (
      (!receipt.source_host_invoked
        && receipt.browser_used === false
        && receipt.browser_usage_attested === true)
      || (validatedSource
        && receipt.source_read_only_action_attempted === false
        && receipt.isolated_tab_opened === false
        && receipt.browser_used === false
        && receipt.browser_usage_attested === true)
      || (validatedSource
        && receipt.isolated_tab_opened === true
        && receipt.source_read_only_action_performed === true
        && receipt.browser_used === true
        && receipt.browser_usage_attested === true)
      || (validatedSource
        && receipt.source_read_only_action_attempted === true
        && receipt.isolated_tab_opened === false
        && receipt.source_read_only_action_performed === false
        && receipt.browser_used === null
        && receipt.browser_usage_attested === false)
      || (malformedSource
        && receipt.browser_used === null
        && receipt.browser_usage_attested === false)
    );
  const productionUsage = receipt.source_mode === SOURCE_MODE.PRODUCTION
    && receipt.source_usage_attestation_green === false
    && receipt.network_usage_attested === false
    && receipt.network_used === null
    && productionBrowserTruth;
  if (
    (!syntheticUsage && !productionUsage)
    || (receipt.authority_consumed && !receipt.authority_recognized)
    || (receipt.authority_valid
      && (!receipt.authority_recognized || !receipt.authority_consumed))
    || (receipt.source_host_invoked && !receipt.authority_valid)
    || (!receipt.source_host_invoked && !noSourcePhase(receipt))
    || (receipt.source_host_invoked && !validatedSource && !malformedSource)
    || (validatedSource
      && receipt.isolated_tab_finalize_attempts
        !== (receipt.source_read_only_action_attempted ? 1 : 0))
  ) return Object.freeze({ ok: false, reason: 'receipt_truth_invalid' });

  const qualified = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED;
  const blocked = receipt.decision
    === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED;
  if (Number(qualified) + Number(blocked) !== 1) {
    return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  }
  const exactQualified = receipt.authority_recognized
    && receipt.authority_consumed
    && receipt.authority_valid
    && receipt.source_host_invoked
    && receipt.rows_scanned >= 2
    && receipt.rows_scanned <= sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
    && receipt.notification_profile_pairs_qualified === 2
    && receipt.distinct_pairs_proven
    && receipt.threads_opened === 0
    && receipt.seen_transitions === 0
    && receipt.challenge_or_error_absent
    && receipt.source_qualification_green
    && receipt.source_read_only_action_attempted
    && receipt.source_read_only_action_performed
    && receipt.isolated_tab_opened === true
    && receipt.isolated_tab_finalized === true
    && receipt.isolated_tab_finalize_attempts === 1
    && receipt.external_effect_invoked === false
    && receipt.external_effect_possible_or_unknown === false
    && receipt.primary_source_blocker === null;
  if (qualified) {
    if (blockers.length !== 0 || !exactQualified) {
      return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
    }
    return Object.freeze({ ok: true, reason: null });
  }
  if (
    blockers.length !== 1
    || !Object.values(WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER)
      .includes(blockers[0])
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });

  const blocker = blockers[0];
  let reachable = false;
  if (blocker === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID) {
    reachable = !receipt.authority_recognized
      && !receipt.authority_consumed
      && !receipt.authority_valid
      && noSourcePhase(receipt);
  } else if (
    blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .STAGE_2_AUTHORITY_REJECTED
  ) {
    reachable = !receipt.authority_valid
      && noSourcePhase(receipt)
      && ((!receipt.authority_recognized && !receipt.authority_consumed)
        || (receipt.authority_recognized && receipt.authority_consumed));
  } else if ([
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .TEST_AUTHORITY_RUNTIME_INSTALL_FAILED,
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_INSTALL_FAILED,
  ].includes(blocker)) {
    reachable = receipt.source_mode === SOURCE_MODE.SYNTHETIC
      && receipt.authority_recognized === false
      && receipt.authority_consumed === false
      && receipt.authority_valid === false
      && noSourcePhase(receipt);
  } else if (
    blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.SOURCE_RESULT_INVALID
  ) {
    reachable = receipt.authority_valid
      && malformedSource;
  } else if (
    blocker
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .SOURCE_QUALIFICATION_BLOCKED
  ) {
    reachable = receipt.authority_valid
      && receipt.source_host_invoked
      && validatedSource
      && !receipt.source_qualification_green
      && receipt.primary_source_blocker !== null;
  } else if ([
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
      .TEST_AUTHORITY_RUNTIME_RESET_FAILED,
    WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_RESET_FAILED,
  ].includes(blocker)) {
    reachable = receipt.source_mode === SOURCE_MODE.SYNTHETIC
      && receipt.authority_recognized === true
      && receipt.authority_consumed === true
      && (
        (receipt.authority_valid === false && noSourcePhase(receipt))
        || (receipt.authority_valid === true && (validatedSource || malformedSource))
      );
  }
  if (!reachable) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  return Object.freeze({ ok: true, reason: null });
};

const captureScenarioControls = (value) => exactDataObject(value, [
  'open_scenario',
  'qualification_scenario',
  'observation_scenario',
  'finalize_scenario',
]);

const blockedCleanupResultPreservingProgress = ({ result, blocker }) => {
  const captured = exactDataObject(result, ['redacted_receipt']);
  const receipt = captured?.redacted_receipt;
  if (
    !receipt
    || validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(receipt).ok !== true
  ) return blockedResult({ blocker });
  return blockedResult({
    blocker,
    sourceMode: receipt.source_mode,
    authorityRecognized: receipt.authority_recognized,
    authorityConsumed: receipt.authority_consumed,
    authorityValid: receipt.authority_valid,
    sourceHostInvoked: receipt.source_host_invoked,
    rowsScanned: receipt.rows_scanned,
    pairsQualified: receipt.notification_profile_pairs_qualified,
    distinctPairsProven: receipt.distinct_pairs_proven,
    threadsOpened: receipt.threads_opened,
    seenTransitions: receipt.seen_transitions,
    challengeOrErrorAbsent: receipt.challenge_or_error_absent,
    sourceQualificationGreen: receipt.source_qualification_green,
    sourceReadOnlyActionAttempted: receipt.source_read_only_action_attempted,
    sourceReadOnlyActionPerformed: receipt.source_read_only_action_performed,
    isolatedTabOpened: receipt.isolated_tab_opened,
    isolatedTabFinalized: receipt.isolated_tab_finalized,
    isolatedTabFinalizeAttempts: receipt.isolated_tab_finalize_attempts,
    externalEffectInvoked: receipt.external_effect_invoked,
    externalEffectPossibleOrUnknown: receipt.external_effect_possible_or_unknown,
    primarySourceBlocker: receipt.primary_source_blocker,
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
    browserUsageAttested: true,
    networkUsageAttested: false,
    browserUsed: false,
    networkUsed: null,
  });
  return runAuthorizedStage2({
    consumeAuthority: () => stage2AuthorityGate
      .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce(),
    runSource: () => sourceHost
      .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnce(),
    sourceMode: SOURCE_MODE.PRODUCTION,
  });
};

const captureTestInput = (parameters) => {
  const variants = [
    ['command', 'now_ms', 'scenario_controls'],
    ['command', 'now_ms', 'scenario_controls', 'test_cleanup_scenario'],
    ['command', 'now_ms', 'scenario_controls', 'authority_consume_scenario'],
    [
      'command',
      'now_ms',
      'scenario_controls',
      'authority_consume_scenario',
      'test_cleanup_scenario',
    ],
  ];
  for (const fields of variants) {
    const captured = exactDataObject(parameters, fields);
    if (captured) return captured;
  }
  return null;
};

const runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest = async (
  parameters = {},
) => {
  const possible = captureTestInput(parameters);
  const controls = possible ? captureScenarioControls(possible.scenario_controls) : null;
  const cleanupScenario = possible?.test_cleanup_scenario ?? 'exact';
  const authorityConsumeScenario = possible?.authority_consume_scenario
    ?? stage2AuthorityGate
      .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST.EXACT;
  const shapeValid = possible !== null
    && possible.command
      === WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_2_QUALIFICATION
    && controls !== null
    && validNowMs(possible.now_ms)
    && Object.values(
      stage2AuthorityGate
        .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST,
    ).includes(authorityConsumeScenario)
    && ['exact', 'runtime_already_reset', 'authority_already_reset'].includes(
      cleanupScenario,
    );
  if (!shapeValid) return blockedResult({
    blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
  });

  let sourceRuntimeInstalled = false;
  try {
    sourceRuntimeInstalled = sourceHost
      .installWelcomeAudioIabSemanticRuntimeFacadeForTest(controls) === true;
  } catch {
    sourceRuntimeInstalled = false;
  }
  if (!sourceRuntimeInstalled) return blockedResult({
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_INSTALL_FAILED,
  });

  const privateAuthority = stage2AuthorityGate
    .buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
      {},
      { now_ms: possible.now_ms },
    );
  let authorityRuntimeInstalled = false;
  try {
    authorityRuntimeInstalled = stage2AuthorityGate
      .installWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest({
        private_authority: privateAuthority,
        consume_scenario: authorityConsumeScenario,
      }) === true;
  } catch {
    authorityRuntimeInstalled = false;
  }
  if (!authorityRuntimeInstalled) {
    try {
      sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
    } catch {
      // Test-only cleanup failure remains zero-source and zero-effect.
    }
    return blockedResult({
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_AUTHORITY_RUNTIME_INSTALL_FAILED,
    });
  }

  let result;
  let sourceReset = false;
  let authorityReset = false;
  try {
    result = await runAuthorizedStage2({
      consumeAuthority: () => stage2AuthorityGate
        .consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest({
          now_ms: possible.now_ms,
        }),
      runSource: () => sourceHost
        .qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnceForTest({
          now_ms: possible.now_ms,
        }),
      sourceMode: SOURCE_MODE.SYNTHETIC,
    });
  } finally {
    try {
      if (cleanupScenario === 'runtime_already_reset') {
        sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
      }
      sourceReset = sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest() === true;
    } catch {
      sourceReset = false;
    }
    try {
      if (cleanupScenario === 'authority_already_reset') {
        stage2AuthorityGate
          .resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest();
      }
      authorityReset = stage2AuthorityGate
        .resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest() === true;
    } catch {
      authorityReset = false;
    }
  }
  if (!sourceReset) return blockedCleanupResultPreservingProgress({
    result,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.TEST_RUNTIME_RESET_FAILED,
  });
  if (!authorityReset) return blockedCleanupResultPreservingProgress({
    result,
    blocker:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_AUTHORITY_RUNTIME_RESET_FAILED,
  });
  return result;
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
