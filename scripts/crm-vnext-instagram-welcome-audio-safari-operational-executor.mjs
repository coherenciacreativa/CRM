import {
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SURFACE,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS,
  WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS,
  issueWelcomeAudioClaim,
  consumeWelcomeAudioPrivateClaimCapability,
  verifyWelcomeAudioPrivateClaimCapabilityBinding,
  verifyWelcomeAudioPrivateClaimReadyBinding,
} from './crm-vnext-instagram-welcome-audio-claim-writer.mjs';
import {
  WELCOME_AUDIO_ONE_SHOT_STORE_ERROR,
  WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE,
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
  acquireWelcomeAudioOneShotStoreMutex,
  assertSameWelcomeAudioOneShotRecord,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  inspectWelcomeAudioOneShotStoreEvidence,
  promoteWelcomeAudioOneShotPendingToTerminal,
  publishWelcomeAudioOneShotTerminalFromPending,
  readWelcomeAudioOneShotRecordStable,
  releaseWelcomeAudioOneShotStoreMutex,
  writeWelcomeAudioOneShotExclusiveDurable,
} from './crm-vnext-instagram-welcome-audio-one-shot-store.mjs';

const WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTOR_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_safari_operational_executor_v1';
const WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_safari_operational_executor_receipt_v1';
const WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_safari_actuator_result_v1';
const WELCOME_AUDIO_SAFARI_OPERATIONAL_TERMINAL_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_safari_operational_terminal_record_v1';
const WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE = 'deterministic_no_effect_test';

const WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO = Object.freeze({
  STRONG_CONFIRMED: 'strong_exact_confirmation',
  NONE: 'none_or_ambiguous_confirmation',
  LATE: 'late_confirmation',
  MISMATCHED: 'mismatched_confirmation',
  ZERO_ACTUATION: 'zero_send_control_actuations',
  THROW_AFTER_BOUNDARY: 'throw_after_effect_boundary',
  MULTIPLE_ACTUATIONS: 'multiple_send_control_actuations',
});

const WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION = Object.freeze({
  CONFIRMED: 'confirmed_terminal_no_retry',
  UNKNOWN: 'unknown_terminal_no_retry',
  BLOCKED: 'blocked_before_attempt',
  BUSY: 'serialization_busy_terminal_no_retry',
  REPLAYED: 'preexisting_or_replayed_terminal_no_retry',
});

const WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_operational_executor_input_invalid',
  CAPABILITY_INVALID: 'blocked_private_claim_capability_invalid_or_consumed',
  ACTUATOR_INVALID: 'blocked_safari_actuator_port_invalid',
  REGISTRY_INVALID: 'blocked_operational_registry_invalid',
  READY_INVALID: 'blocked_operational_ready_not_authoritative',
  READY_CHANGED: 'blocked_operational_ready_changed',
  SERIALIZATION_BUSY: 'blocked_operational_mutex_held',
  TERMINAL_PREEXISTING: 'blocked_operational_terminal_preexisting',
  TERMINAL_AMBIGUOUS: 'blocked_operational_pending_or_partial_evidence',
  ACTUATOR_FAILED: 'blocked_actuator_failed_after_pending',
  ACTUATION_COUNT: 'blocked_send_control_actuation_count_invalid',
  CONFIRMATION_INVALID: 'blocked_confirmation_unknown_late_or_mismatched',
  TERMINAL_INVALID: 'blocked_operational_terminal_guard_invalid',
});

const WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS = Object.freeze([
  'result_schema_version',
  'bound_to_current_operation',
  'effect_boundary_entered',
  'send_control_actuation_count',
  'attempted_at',
  'confirmation_marker',
  'confirmation_checked_at',
]);

const WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'operational_executor_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'ready_guard_decision',
  'terminal_guard_decision',
  'claim_consumed_by_current_invocation',
  'pending_record_present',
  'terminal_record_present',
  'effect_boundary_entered',
  'send_control_actuation_count',
  'confirmation_marker',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'retry_disposition',
  'production_ready',
  'blocker_codes',
]);

const ACTUATOR_PORT_STATE = new WeakMap();
const SCENARIOS = new Set(Object.values(WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO));
const STRONG_MARKERS = new Set([
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.SENT_MARKER_WITHOUT_NEW_AUDIO_BUBBLE,
]);

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length
    && actual.every((key, index) => key === sorted[index]);
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const createWelcomeAudioSafariActuatorPort = ({
  execution_mode,
  deterministic_scenario = WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.NONE,
} = {}) => {
  if (
    execution_mode !== WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE
    || !SCENARIOS.has(deterministic_scenario)
  ) throw new TypeError(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID);
  const port = Object.freeze({
    surface: WELCOME_AUDIO_SURFACE.STATUS,
    surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
    execution_mode,
  });
  ACTUATOR_PORT_STATE.set(port, {
    deterministic_scenario,
    invocation_count: 0,
  });
  return port;
};

const invokeBrandedSafariActuator = ({ port, attemptedAtMs }) => {
  const state = ACTUATOR_PORT_STATE.get(port);
  if (!state) throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID);
  state.invocation_count += 1;
  if (state.invocation_count > 1) {
    return Object.freeze({
      result_schema_version: WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
      bound_to_current_operation: false,
      effect_boundary_entered: true,
      send_control_actuation_count: state.invocation_count,
      attempted_at: new Date(attemptedAtMs).toISOString(),
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      confirmation_checked_at: new Date(attemptedAtMs).toISOString(),
    });
  }
  const scenario = state.deterministic_scenario;
  if (scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY) {
    const error = new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_FAILED);
    error.code = 'CRM_CORE_DETERMINISTIC_ACTUATOR_FAILURE';
    throw error;
  }
  if (scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.ZERO_ACTUATION) {
    return Object.freeze({
      result_schema_version: WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
      bound_to_current_operation: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      attempted_at: new Date(attemptedAtMs).toISOString(),
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      confirmation_checked_at: new Date(attemptedAtMs).toISOString(),
    });
  }
  const count = scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS
    ? 2
    : 1;
  const strong = scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED
    || scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.LATE
    || scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MISMATCHED;
  const confirmationDelay = scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.LATE
    ? 300001
    : 1000;
  return Object.freeze({
    result_schema_version: WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
    bound_to_current_operation:
      scenario !== WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MISMATCHED,
    effect_boundary_entered: true,
    send_control_actuation_count: count,
    attempted_at: new Date(attemptedAtMs).toISOString(),
    confirmation_marker: strong
      ? WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER
      : WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
    confirmation_checked_at: new Date(attemptedAtMs + confirmationDelay).toISOString(),
  });
};

const isValidActuatorResult = (result) => exactObjectKeys(
  result,
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS,
) && result.result_schema_version === WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION
  && typeof result.bound_to_current_operation === 'boolean'
  && typeof result.effect_boundary_entered === 'boolean'
  && Number.isInteger(result.send_control_actuation_count)
  && result.send_control_actuation_count >= 0
  && (
    (
      result.effect_boundary_entered === false
      && result.send_control_actuation_count === 0
    )
    || (
      result.effect_boundary_entered === true
      && result.send_control_actuation_count >= 1
    )
  )
  && typeof result.attempted_at === 'string'
  && typeof result.confirmation_checked_at === 'string'
  && Object.values(WELCOME_AUDIO_CONFIRMATION_MARKER).includes(result.confirmation_marker);

const deriveAttemptedTerminalSnapshot = ({ ready, attemptedAtMs }) => {
  const terminal = structuredClone(ready);
  const attemptedAt = new Date(attemptedAtMs).toISOString();
  terminal.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
  terminal.execution.send_attempt_count = 1;
  terminal.execution.attempt_state = WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL;
  terminal.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
  terminal.execution.retry_disposition = WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT;
  terminal.execution.retry_requested = false;
  terminal.execution.claim_token_consumed_at = attemptedAt;
  terminal.execution.attempted_at = attemptedAt;
  terminal.confirmation.confirmation_marker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;
  terminal.confirmation.bound_to_current_operation = false;
  terminal.confirmation.checked_at = attemptedAt;
  return terminal;
};

const applyActuatorResult = ({ attemptedTerminal, actuatorResult }) => {
  const terminal = structuredClone(attemptedTerminal);
  const attemptedAtMs = Date.parse(actuatorResult.attempted_at);
  const checkedAtMs = Date.parse(actuatorResult.confirmation_checked_at);
  const strongCurrent = actuatorResult.send_control_actuation_count === 1
    && actuatorResult.effect_boundary_entered === true
    && actuatorResult.bound_to_current_operation === true
    && STRONG_MARKERS.has(actuatorResult.confirmation_marker)
    && Number.isFinite(attemptedAtMs)
    && Number.isFinite(checkedAtMs)
    && checkedAtMs >= attemptedAtMs
    && checkedAtMs - attemptedAtMs <= 300000;
  terminal.confirmation.confirmation_marker = strongCurrent
    ? actuatorResult.confirmation_marker
    : WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;
  terminal.confirmation.bound_to_current_operation = strongCurrent;
  terminal.confirmation.checked_at = strongCurrent
    ? actuatorResult.confirmation_checked_at
    : terminal.execution.attempted_at;
  terminal.execution.send_claim = strongCurrent
    ? WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT
    : WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
  return terminal;
};

const validateReady = ({ ready, expectedDigest, nowMs }) => {
  const guard = validateWelcomeAudioOperation(ready, {
    expectedCanonicalOperationSha256: expectedDigest,
    nowMs,
  });
  if (
    guard.ok !== true
    || guard.state_valid !== true
    || guard.phase !== WELCOME_AUDIO_GUARD_PHASE.SEND_READY
    || guard.decision !== WELCOME_AUDIO_GUARD_DECISION.READY
    || guard.send_ready !== true
    || guard.send_allowed !== false
    || guard.one_shot_consumer_required !== true
    || guard.blockers.length !== 0
    || ready?.canonical_operation_sha256 !== expectedDigest
  ) throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID);
  return guard;
};

const validateTerminal = ({ terminal, expectedDigest, nowMs }) => {
  const guard = validateWelcomeAudioOperation(terminal, {
    expectedCanonicalOperationSha256: expectedDigest,
    nowMs,
  });
  if (
    guard.state_valid !== true
    || guard.phase !== WELCOME_AUDIO_GUARD_PHASE.TERMINAL
    || ![
      WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL,
      WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    ].includes(guard.decision)
    || guard.terminal !== true
    || guard.send_ready !== false
    || guard.send_allowed !== false
  ) throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_INVALID);
  return guard;
};

const terminalRecord = ({ terminal, guardDecision, actuatorResult }) => ({
  record_schema_version: WELCOME_AUDIO_SAFARI_OPERATIONAL_TERMINAL_RECORD_SCHEMA_VERSION,
  operational_executor_contract_version:
    WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTOR_CONTRACT_VERSION,
  execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  canonical_operation_sha256: terminal.canonical_operation_sha256,
  claim_lineage: {
    claim_owner_id: terminal.effect_claim.claim_owner_id,
    claim_token_id: terminal.effect_claim.claim_token_id,
    registry_revision: terminal.effect_claim.registry_revision,
    attempt_id: terminal.effect_claim.attempt_id,
  },
  terminal_guard_decision: guardDecision,
  terminal_snapshot: terminal,
  actuator_result: actuatorResult,
});

const receipt = ({
  decision,
  readyGuardDecision = null,
  terminalGuardDecision = null,
  claimConsumed = false,
  pendingPresent = false,
  terminalPresent = false,
  actuatorResult = null,
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_SCHEMA_VERSION,
  operational_executor_contract_version:
    WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTOR_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_fields',
  execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  decision,
  ready_guard_decision: readyGuardDecision,
  terminal_guard_decision: terminalGuardDecision,
  claim_consumed_by_current_invocation: claimConsumed,
  pending_record_present: pendingPresent,
  terminal_record_present: terminalPresent,
  effect_boundary_entered: actuatorResult?.effect_boundary_entered === true,
  send_control_actuation_count: Number.isInteger(actuatorResult?.send_control_actuation_count)
    ? actuatorResult.send_control_actuation_count
    : 0,
  confirmation_marker: decision === WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED
      && STRONG_MARKERS.has(actuatorResult?.confirmation_marker)
    ? actuatorResult.confirmation_marker
    : WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
  external_effect_invoked: false,
  browser_used: false,
  network_used: false,
  retry_disposition: decision === WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED
    ? WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    : WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
  production_ready: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const validateWelcomeAudioSafariOperationalReceipt = (value) => {
  if (!exactObjectKeys(value, WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID };
  }
  const fixed = value.receipt_schema_version
      === WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_SCHEMA_VERSION
    && value.operational_executor_contract_version
      === WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTOR_CONTRACT_VERSION
    && value.redaction_status === 'allowlist_only_no_private_fields'
    && value.execution_mode === WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE
    && value.external_effect_invoked === false
    && value.browser_used === false
    && value.network_used === false
    && value.production_ready === false
    && Object.values(WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION).includes(value.decision)
    && (value.ready_guard_decision === null
      || value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY)
    && (value.terminal_guard_decision === null
      || value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL
      || value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL)
    && [
      value.claim_consumed_by_current_invocation,
      value.pending_record_present,
      value.terminal_record_present,
      value.effect_boundary_entered,
    ].every((item) => typeof item === 'boolean')
    && Number.isInteger(value.send_control_actuation_count)
    && value.send_control_actuation_count >= 0
    && value.send_control_actuation_count <= 1
    && Object.values(WELCOME_AUDIO_CONFIRMATION_MARKER).includes(value.confirmation_marker)
    && Array.isArray(value.blocker_codes)
    && value.blocker_codes.every((code) => Object.values(
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER,
    ).includes(code));
  const noEvidence = value.pending_record_present === false
    && value.terminal_record_present === false;
  const exactlyOneEvidence = value.pending_record_present
    !== value.terminal_record_present;
  const noActuation = value.effect_boundary_entered === false
    && value.send_control_actuation_count === 0;
  const oneActuation = value.effect_boundary_entered === true
    && value.send_control_actuation_count === 1;
  const blocker = value.blocker_codes.length === 1 ? value.blocker_codes[0] : null;
  const unknownSemantics = value.ready_guard_decision !== WELCOME_AUDIO_GUARD_DECISION.READY
      && value.ready_guard_decision !== null
    ? false
    : {
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID]:
        value.terminal_guard_decision === null
        && noActuation
        && (noEvidence || exactlyOneEvidence)
        && (noEvidence || value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY),
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID]:
        value.claim_consumed_by_current_invocation === true
        && value.terminal_guard_decision === null
        && (
          (noEvidence && noActuation && value.ready_guard_decision === null)
          || (
            exactlyOneEvidence
            && value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
            && (noActuation || oneActuation)
          )
        ),
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.REGISTRY_INVALID]:
        value.ready_guard_decision === null
        && value.terminal_guard_decision === null
        && noEvidence
        && noActuation,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID]:
        value.ready_guard_decision === null
        && value.terminal_guard_decision === null
        && noEvidence
        && noActuation,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_CHANGED]:
        value.terminal_guard_decision === null
        && noEvidence
        && noActuation,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_AMBIGUOUS]:
        value.ready_guard_decision === null
        && value.terminal_guard_decision === null
        && value.pending_record_present === true
        && value.terminal_record_present === false
        && noActuation,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_FAILED]:
        value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
        && value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
        && value.claim_consumed_by_current_invocation === true
        && value.pending_record_present === false
        && value.terminal_record_present === true
        && value.effect_boundary_entered === true
        && value.send_control_actuation_count === 1,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID]:
        value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
        && value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
        && value.claim_consumed_by_current_invocation === true
        && value.pending_record_present === false
        && value.terminal_record_present === true
        && value.effect_boundary_entered === true
        && value.send_control_actuation_count === 1,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT]:
        value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
        && value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
        && value.claim_consumed_by_current_invocation === true
        && value.pending_record_present === false
        && value.terminal_record_present === true
        && value.effect_boundary_entered === false
        && value.send_control_actuation_count === 0,
      [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_INVALID]:
        value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
        && value.terminal_guard_decision === null
        && (!oneActuation || value.claim_consumed_by_current_invocation === true)
        && !(
          value.pending_record_present === true
          && value.terminal_record_present === true
        )
        && (
          (noActuation && noEvidence)
          || (
            exactlyOneEvidence
            && (
              noActuation
              || (
                value.effect_boundary_entered === true
                && value.send_control_actuation_count === 1
              )
            )
          )
        ),
    }[blocker] === true;
  const semantics = {
    [WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED]:
      value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
      && value.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL
      && value.claim_consumed_by_current_invocation === true
      && value.pending_record_present === false
      && value.terminal_record_present === true
      && value.effect_boundary_entered === true
      && value.send_control_actuation_count === 1
      && STRONG_MARKERS.has(value.confirmation_marker)
      && value.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && value.blocker_codes.length === 0,
    [WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED]:
      value.ready_guard_decision === null
      && value.terminal_guard_decision === null
      && value.claim_consumed_by_current_invocation === false
      && value.pending_record_present === false
      && value.terminal_record_present === false
      && value.effect_boundary_entered === false
      && value.send_control_actuation_count === 0
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
      && value.blocker_codes.length === 1
      && value.blocker_codes[0] === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID,
    [WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BUSY]:
      value.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY
      && value.terminal_guard_decision === null
      && value.claim_consumed_by_current_invocation === true
      && value.pending_record_present === false
      && value.terminal_record_present === false
      && value.effect_boundary_entered === false
      && value.send_control_actuation_count === 0
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && value.blocker_codes.length === 1
      && value.blocker_codes[0] === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.SERIALIZATION_BUSY,
    [WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED]:
      value.ready_guard_decision === null
      && value.terminal_guard_decision === null
      && value.pending_record_present === false
      && value.terminal_record_present === true
      && value.effect_boundary_entered === false
      && value.send_control_actuation_count === 0
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && value.blocker_codes.length === 1
      && value.blocker_codes[0] === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_PREEXISTING,
    [WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN]:
      value.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.blocker_codes.length === 1
      && unknownSemantics,
  }[value.decision] === true;
  return fixed && semantics
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID };
};

const executeWelcomeAudioSafariAttempt = async ({
  registry_root,
  private_claim_capability,
  expected_canonical_operation_sha256,
  branded_safari_actuator_port,
  now_ms,
}) => {
  let claimConsumedByCurrentInvocation = false;
  const consumeCapability = () => {
    const status = consumeWelcomeAudioPrivateClaimCapability(private_claim_capability);
    if (status === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW) {
      claimConsumedByCurrentInvocation = true;
    }
    return status;
  };
  if (
    !isSha256(expected_canonical_operation_sha256)
    || typeof registry_root !== 'string'
    || !Number.isFinite(now_ms)
    || now_ms < 0
  ) {
    const consumeStatus = consumeCapability();
    return receipt({
      decision: consumeStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.INVALID
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claimConsumed: claimConsumedByCurrentInvocation,
      blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
    });
  }

  let registryIdentity;
  let paths;
  try {
    registryIdentity = await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: registry_root,
      policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
    });
    paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: registryIdentity.path,
      expectedCanonicalOperationSha256: expected_canonical_operation_sha256,
      namespace: WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
    });
  } catch {
    const consumeStatus = consumeCapability();
    return receipt({
      decision: consumeStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.INVALID
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claimConsumed: claimConsumedByCurrentInvocation,
      blockerCodes: [consumeStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.INVALID
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.REGISTRY_INVALID],
    });
  }
  const capabilityStatus = verifyWelcomeAudioPrivateClaimCapabilityBinding({
    private_claim_capability,
    registry_root: registryIdentity.path,
    registry_identity: registryIdentity,
    expected_canonical_operation_sha256,
  });
  if (capabilityStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.INVALID) {
    const consumeStatus = consumeCapability();
    return receipt({
      decision: consumeStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.INVALID
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BLOCKED
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claimConsumed: claimConsumedByCurrentInvocation,
      blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
    });
  }
  if (capabilityStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.CONSUMED) {
    try {
      const evidence = await inspectWelcomeAudioOneShotStoreEvidence({
        paths,
        registryIdentity,
      });
      const terminal = evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL;
      const ambiguous = evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN;
      const readyPartial = evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY_PARTIAL;
      return receipt({
        decision: terminal
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED
          : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claimConsumed: false,
        pendingPresent: ambiguous,
        terminalPresent: terminal,
        blockerCodes: [terminal
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_PREEXISTING
          : ambiguous
            ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_AMBIGUOUS
            : readyPartial
              ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID
            : WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
      });
    } catch {
      return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claimConsumed: false,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.REGISTRY_INVALID],
      });
    }
  }
  if (!ACTUATOR_PORT_STATE.has(branded_safari_actuator_port)) {
    const consumeStatus = consumeCapability();
    return receipt({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claimConsumed: claimConsumedByCurrentInvocation,
      blockerCodes: [consumeStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
    });
  }

  let initialReady;
  let initialGuard;
  try {
    const evidence = await inspectWelcomeAudioOneShotStoreEvidence({ paths, registryIdentity });
    if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL) {
      consumeCapability();
      return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED,
        claimConsumed: claimConsumedByCurrentInvocation,
        terminalPresent: true,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_PREEXISTING],
      });
    }
    if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN) {
      consumeCapability();
      return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claimConsumed: claimConsumedByCurrentInvocation,
        pendingPresent: true,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_AMBIGUOUS],
      });
    }
    if (evidence !== WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY) {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID);
    }
    initialReady = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.ready,
      registryIdentity,
    });
    const readyBindingStatus = verifyWelcomeAudioPrivateClaimReadyBinding({
      private_claim_capability,
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256,
      ready_record_digest: initialReady.digest,
      ready_record_metadata: initialReady.metadata,
    });
    if (readyBindingStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.INVALID) {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_CHANGED);
    }
    if (readyBindingStatus === WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.CONSUMED) {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID);
    }
    initialGuard = validateReady({
      ready: initialReady.snapshot,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: now_ms,
    });
  } catch (error) {
    consumeCapability();
    return receipt({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claimConsumed: claimConsumedByCurrentInvocation,
      blockerCodes: [
        error?.message === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID
          : error?.message === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_CHANGED
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_CHANGED
          : error?.message === WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID
            ? WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_INVALID
          : WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.REGISTRY_INVALID,
      ],
    });
  }

  let mutexIdentity = null;
  let pendingPublished = false;
  let terminalPublished = false;
  let actuatorResult = null;
  try {
    mutexIdentity = await acquireWelcomeAudioOneShotStoreMutex({ paths, registryIdentity });
    if (!mutexIdentity) {
      const consumeStatus = consumeCapability();
      if (consumeStatus !== WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW) {
        return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        readyGuardDecision: initialGuard.decision,
        claimConsumed: false,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
        });
      }
      return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BUSY,
        readyGuardDecision: initialGuard.decision,
        claimConsumed: claimConsumedByCurrentInvocation,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.SERIALIZATION_BUSY],
      });
    }
    const lockedReady = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.ready,
      registryIdentity,
    });
    try {
      assertSameWelcomeAudioOneShotRecord(initialReady, lockedReady);
    } catch {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.READY_CHANGED);
    }
    const readyGuard = validateReady({
      ready: lockedReady.snapshot,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: now_ms,
    });
    const attemptedTerminal = deriveAttemptedTerminalSnapshot({
      ready: lockedReady.snapshot,
      attemptedAtMs: now_ms,
    });
    const attemptedGuard = validateTerminal({
      terminal: attemptedTerminal,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: now_ms,
    });
    const pendingRecord = terminalRecord({
      terminal: attemptedTerminal,
      guardDecision: attemptedGuard.decision,
      actuatorResult: null,
    });
    await writeWelcomeAudioOneShotExclusiveDurable({
      filePath: paths.pending,
      value: pendingRecord,
      registryIdentity,
      existsReason: WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING,
    });
    pendingPublished = true;
    const consumeStatus = consumeCapability();
    if (consumeStatus !== WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW) {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID);
    }

    try {
      actuatorResult = invokeBrandedSafariActuator({
        port: branded_safari_actuator_port,
        attemptedAtMs: now_ms,
      });
    } catch {
      actuatorResult = Object.freeze({
        result_schema_version: WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
        bound_to_current_operation: false,
        effect_boundary_entered: true,
        send_control_actuation_count: 1,
        attempted_at: new Date(now_ms).toISOString(),
        confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
        confirmation_checked_at: new Date(now_ms).toISOString(),
      });
      await promoteWelcomeAudioOneShotPendingToTerminal({ paths, registryIdentity });
      terminalPublished = true;
      pendingPublished = false;
      return receipt({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        readyGuardDecision: readyGuard.decision,
        terminalGuardDecision: attemptedGuard.decision,
        claimConsumed: claimConsumedByCurrentInvocation,
        terminalPresent: true,
        actuatorResult,
        blockerCodes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_FAILED],
      });
    }

    if (!isValidActuatorResult(actuatorResult)) {
      throw new Error(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID);
    }
    const finalTerminal = applyActuatorResult({ attemptedTerminal, actuatorResult });
    const finalGuard = validateTerminal({
      terminal: finalTerminal,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: Math.max(now_ms, Date.parse(actuatorResult.confirmation_checked_at)),
    });
    const finalRecord = terminalRecord({
      terminal: finalTerminal,
      guardDecision: finalGuard.decision,
      actuatorResult,
    });
    await publishWelcomeAudioOneShotTerminalFromPending({
      paths,
      terminalValue: finalRecord,
      registryIdentity,
    });
    terminalPublished = true;
    pendingPublished = false;
    const confirmed = finalGuard.decision === WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL
      && actuatorResult.send_control_actuation_count === 1;
    const blockers = [];
    if (actuatorResult.send_control_actuation_count !== 1) {
      blockers.push(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT);
    } else if (!confirmed) {
      blockers.push(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID);
    }
    return receipt({
      decision: confirmed
        ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED
        : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      readyGuardDecision: readyGuard.decision,
      terminalGuardDecision: finalGuard.decision,
      claimConsumed: claimConsumedByCurrentInvocation,
      terminalPresent: true,
      actuatorResult,
      blockerCodes: blockers,
    });
  } catch (error) {
    consumeCapability();
    if (pendingPublished && !terminalPublished) {
      await promoteWelcomeAudioOneShotPendingToTerminal({
        paths,
        registryIdentity,
      }).then(() => {
        terminalPublished = true;
        pendingPublished = false;
      }).catch(() => {});
    }
    const durableEvidence = await inspectWelcomeAudioOneShotStoreEvidence({
      paths,
      registryIdentity,
    }).catch(() => null);
    if (durableEvidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL) {
      terminalPublished = true;
      pendingPublished = false;
    } else if (
      durableEvidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN
      || durableEvidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY_PARTIAL
    ) {
      terminalPublished = false;
      pendingPublished = true;
    }
    return receipt({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      readyGuardDecision: initialGuard?.decision ?? null,
      claimConsumed: claimConsumedByCurrentInvocation,
      pendingPresent: pendingPublished,
      terminalPresent: terminalPublished,
      actuatorResult,
      blockerCodes: [
        Object.values(WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER).includes(error?.message)
          ? error.message
          : WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_INVALID,
      ],
    });
  } finally {
    if (mutexIdentity) {
      await releaseWelcomeAudioOneShotStoreMutex({
        paths,
        registryIdentity,
        mutexIdentity,
      }).catch(() => {});
    }
  }
};

const runWelcomeAudioOperationalRailOnce = async ({
  registry_root,
  authoritative_preclaim_record_path,
  expected_canonical_operation_sha256,
  registry_policy,
  branded_safari_actuator_port,
  now_ms,
}) => {
  const claim = await issueWelcomeAudioClaim({
    registry_root,
    authoritative_preclaim_record_path,
    expected_canonical_operation_sha256,
    registry_policy,
    now_ms,
  });
  if (!claim.private_claim_capability) {
    return Object.freeze({
      claim_receipt: claim.redacted_receipt,
      operational_receipt: null,
    });
  }
  const operational = await executeWelcomeAudioSafariAttempt({
    registry_root,
    private_claim_capability: claim.private_claim_capability,
    expected_canonical_operation_sha256,
    branded_safari_actuator_port,
    now_ms,
  });
  return Object.freeze({
    claim_receipt: claim.redacted_receipt,
    operational_receipt: operational,
  });
};

export {
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS,
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTOR_CONTRACT_VERSION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_TERMINAL_RECORD_SCHEMA_VERSION,
  createWelcomeAudioSafariActuatorPort,
  executeWelcomeAudioSafariAttempt,
  runWelcomeAudioOperationalRailOnce,
  validateWelcomeAudioSafariOperationalReceipt,
};
