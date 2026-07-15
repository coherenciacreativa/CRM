import {
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_CLAIM_DECISION,
  validateWelcomeAudioClaimReceipt,
} from './crm-vnext-instagram-welcome-audio-claim-writer.mjs';
import {
  WELCOME_AUDIO_ONE_SHOT_STORE_ERROR,
  WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE,
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  inspectWelcomeAudioOneShotStoreEvidence,
  readWelcomeAudioOneShotRecordStable,
  writeWelcomeAudioOneShotExclusiveDurable,
} from './crm-vnext-instagram-welcome-audio-one-shot-store.mjs';
import {
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  runWelcomeAudioOperationalRailOnce,
  validateWelcomeAudioSafariOperationalReceipt,
} from './crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs';
import {
  WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS,
  consumeWelcomeAudioSafariOperationAuthority,
  reserveWelcomeAudioSafariOperationAuthority,
  verifyReservedWelcomeAudioSafariOperationAuthority,
  wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation,
} from './crm-vnext-instagram-welcome-audio-safari-operation-port.mjs';

const WELCOME_AUDIO_OPERATION_SESSION_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_operation_session_v1';
const WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_operation_session_receipt_v1';

const WELCOME_AUDIO_OPERATION_SESSION_DECISION = Object.freeze({
  COMPLETED: 'deterministic_session_completed_terminal_no_live',
  BLOCKED: 'blocked_before_composite_no_live',
  FAILED_CLOSED: 'deterministic_session_failed_closed_no_live',
});

const WELCOME_AUDIO_OPERATION_SESSION_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_operation_session_input_invalid',
  AUTHORITY_INVALID: 'blocked_operation_session_authority_invalid',
  AUTHORITY_USED: 'blocked_operation_session_authority_already_used',
  BINDING_DRIFT: 'blocked_operation_session_binding_drift',
  OPERATION_INVALID: 'blocked_operation_session_preclaim_operation_invalid',
  REGISTRY_INVALID: 'blocked_operation_session_registry_invalid',
  PRECLAIM_COLLISION: 'blocked_operation_session_preclaim_collision',
  PRECLAIM_PUBLISH_FAILED: 'blocked_operation_session_preclaim_publish_failed',
  CLAIM_NOT_CREATED: 'blocked_operation_session_claim_not_created',
  CHILD_RECEIPT_INVALID: 'blocked_operation_session_child_receipt_invalid',
  COMPOSITE_FAILED: 'blocked_operation_session_composite_failed',
});

const WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'operation_session_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'authority_consumed_by_current_invocation',
  'preclaim_record_published',
  'claim_receipt_present',
  'operational_receipt_present',
  'effect_boundary_entered',
  'modeled_send_control_actuation_count',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'production_ready',
  'send_allowed',
  'live_authority',
  'retry_disposition',
  'blocker_codes',
]);

const SESSION_INPUT_FIELDS = Object.freeze([
  'registry_root',
  'registry_policy',
  'canonical_operation',
  'current_binding',
  'prepared_session_authority',
  'branded_safari_actuator_port',
  'now_ms',
]);

const SESSION_DECISIONS = new Set(Object.values(WELCOME_AUDIO_OPERATION_SESSION_DECISION));
const SESSION_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_OPERATION_SESSION_BLOCKER));

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length
    && actual.every((key, index) => key === sorted[index]);
};

const receipt = ({
  decision,
  authorityConsumed = false,
  preclaimPublished = false,
  claimReceipt = null,
  operationalReceipt = null,
  effectBoundaryEntered = operationalReceipt?.effect_boundary_entered === true,
  modeledActuationCount = operationalReceipt?.send_control_actuation_count ?? 0,
  retryDisposition = null,
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_SCHEMA_VERSION,
  operation_session_contract_version: WELCOME_AUDIO_OPERATION_SESSION_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_fields',
  execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  decision,
  authority_consumed_by_current_invocation: authorityConsumed,
  preclaim_record_published: preclaimPublished,
  claim_receipt_present: claimReceipt !== null,
  operational_receipt_present: operationalReceipt !== null,
  effect_boundary_entered: effectBoundaryEntered,
  modeled_send_control_actuation_count: modeledActuationCount,
  external_effect_invoked: false,
  browser_used: false,
  network_used: false,
  production_ready: false,
  send_allowed: false,
  live_authority: false,
  retry_disposition: retryDisposition ?? (
    authorityConsumed || claimReceipt !== null || operationalReceipt !== null
      ? WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      : WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
  ),
  blocker_codes: Object.freeze([...blockerCodes]),
});

const result = ({ sessionReceipt, claimReceipt = null, operationalReceipt = null }) =>
  Object.freeze({
    session_receipt: sessionReceipt,
    claim_receipt: claimReceipt,
    operational_receipt: operationalReceipt,
  });

const validateWelcomeAudioOperationSessionReceipt = (value) => {
  if (!exactObjectKeys(value, WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID };
  }
  const blocker = value.blocker_codes?.length === 1 ? value.blocker_codes[0] : null;
  const noActuation = value.effect_boundary_entered === false
    && value.modeled_send_control_actuation_count === 0;
  const oneActuation = value.effect_boundary_entered === true
    && value.modeled_send_control_actuation_count === 1;
  const twoActuations = value.effect_boundary_entered === true
    && value.modeled_send_control_actuation_count === 2;
  const retryForbidden = value.retry_disposition
    === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT;
  const retryBeforeAttempt = value.retry_disposition
    === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT;
  const fixed = value.receipt_schema_version
      === WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_SCHEMA_VERSION
    && value.operation_session_contract_version
      === WELCOME_AUDIO_OPERATION_SESSION_CONTRACT_VERSION
    && value.redaction_status === 'allowlist_only_no_private_fields'
    && value.execution_mode === WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE
    && SESSION_DECISIONS.has(value.decision)
    && typeof value.authority_consumed_by_current_invocation === 'boolean'
    && typeof value.preclaim_record_published === 'boolean'
    && typeof value.claim_receipt_present === 'boolean'
    && typeof value.operational_receipt_present === 'boolean'
    && typeof value.effect_boundary_entered === 'boolean'
    && Number.isInteger(value.modeled_send_control_actuation_count)
    && value.modeled_send_control_actuation_count >= 0
    && value.modeled_send_control_actuation_count <= 2
    && value.external_effect_invoked === false
    && value.browser_used === false
    && value.network_used === false
    && value.production_ready === false
    && value.send_allowed === false
    && value.live_authority === false
    && [
      WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
      WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
    ].includes(value.retry_disposition)
    && Array.isArray(value.blocker_codes)
    && value.blocker_codes.every((code) => SESSION_BLOCKERS.has(code))
    && new Set(value.blocker_codes).size === value.blocker_codes.length
    && (noActuation || oneActuation || twoActuations);
  const blockedBeforeAttempt = [
    WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID,
    WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID,
  ].includes(blocker)
    && value.authority_consumed_by_current_invocation === false
    && value.preclaim_record_published === false
    && retryBeforeAttempt;
  const blockedAlreadyUsed = blocker === WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED
    && value.authority_consumed_by_current_invocation === false
    && retryForbidden;
  const blockedAfterReservation = blocker !== null
    && ![
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID,
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID,
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED,
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CLAIM_NOT_CREATED,
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID,
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.COMPOSITE_FAILED,
    ].includes(blocker)
    && value.authority_consumed_by_current_invocation === true
    && retryForbidden;
  const blockedSemantics = value.claim_receipt_present === false
    && value.operational_receipt_present === false
    && noActuation
    && value.blocker_codes.length === 1
    && (blockedBeforeAttempt || blockedAlreadyUsed || blockedAfterReservation);
  const completedSemantics = value.authority_consumed_by_current_invocation === true
    && value.preclaim_record_published === true
    && value.claim_receipt_present === true
    && value.operational_receipt_present === true
    && retryForbidden
    && (noActuation || oneActuation)
    && value.blocker_codes.length === 0;
  const childInvalidSemantics = blocker
      === WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID
    && value.authority_consumed_by_current_invocation === true
    && value.preclaim_record_published === true
    && value.claim_receipt_present === true
    && retryForbidden
    && (
      (value.operational_receipt_present === false && noActuation)
      || (value.operational_receipt_present === true
        && (noActuation || oneActuation || twoActuations))
    );
  const failedSemantics = value.blocker_codes.length === 1
    && (
      (
        blocker === WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CLAIM_NOT_CREATED
        && value.authority_consumed_by_current_invocation === true
        && value.preclaim_record_published === true
        && value.claim_receipt_present === true
        && value.operational_receipt_present === false
        && noActuation
        && retryForbidden
      )
      || childInvalidSemantics
      || (
        blocker === WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED
        && value.authority_consumed_by_current_invocation === false
        && value.preclaim_record_published === true
        && (
          (
            value.claim_receipt_present === true
            && value.operational_receipt_present === true
            && noActuation
          )
          || (
            value.claim_receipt_present === false
            && value.operational_receipt_present === false
            && (noActuation || oneActuation)
          )
        )
        && retryForbidden
      )
      || (
        blocker === WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.COMPOSITE_FAILED
        && value.authority_consumed_by_current_invocation === true
        && value.preclaim_record_published === true
        && value.claim_receipt_present === false
        && value.operational_receipt_present === false
        && (noActuation || oneActuation)
        && retryForbidden
      )
    );
  const semantics = {
    [WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED]: completedSemantics,
    [WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED]: blockedSemantics,
    [WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED]: failedSemantics,
  }[value.decision] === true;
  return fixed && semantics
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID };
};

const validatePreclaimSnapshot = ({ snapshot, binding, nowMs }) => {
  const guard = validateWelcomeAudioOperation(snapshot, {
    expectedCanonicalOperationSha256: binding.expected_canonical_operation_sha256,
    nowMs,
  });
  const exactBinding = snapshot?.canonical_operation_sha256
      === binding.expected_canonical_operation_sha256
    && snapshot?.operation?.thread_anchor_sha256 === binding.thread_anchor_sha256
    && snapshot?.asset?.approved_audio_asset_sha256
      === binding.approved_audio_asset_sha256
    && snapshot?.asset?.preview_audio_asset_sha256
      === binding.approved_audio_asset_sha256
    && snapshot?.asset?.preview_thread_anchor_sha256 === binding.thread_anchor_sha256
    && snapshot?.asset?.preview_observed_at === binding.preview_observed_at;
  return guard.ok === true
    && guard.state_valid === true
    && guard.phase === WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
    && guard.decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    && guard.claim_allowed === true
    && guard.send_allowed === false
    && guard.terminal === false
    && Array.isArray(guard.blockers)
    && guard.blockers.length === 0
    && exactBinding;
};

const blockerForAuthorityStatus = (status) => ({
  [WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID]:
    WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID,
  [WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED]:
    WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED,
  [WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.BINDING_DRIFT]:
    WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.BINDING_DRIFT,
}[status] ?? WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID);

const classifyCompositeFailureEvidence = async ({ paths, registryIdentity }) => {
  const evidence = await inspectWelcomeAudioOneShotStoreEvidence({
    paths,
    registryIdentity,
  }).catch(() => null);
  if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL) {
    const terminal = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.terminal,
      registryIdentity,
    }).catch(() => null);
    const actuatorResult = terminal?.snapshot?.actuator_result;
    const count = actuatorResult?.send_control_actuation_count;
    const effectBoundaryEntered = actuatorResult?.effect_boundary_entered;
    if (
      typeof effectBoundaryEntered === 'boolean'
      && Number.isInteger(count)
      && count >= 0
      && count <= 1
      && effectBoundaryEntered === (count === 1)
    ) return { effectBoundaryEntered, modeledActuationCount: count };
    return { effectBoundaryEntered: true, modeledActuationCount: 1 };
  }
  if (
    evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN
    || evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.PENDING
  ) return { effectBoundaryEntered: true, modeledActuationCount: 1 };
  return { effectBoundaryEntered: false, modeledActuationCount: 0 };
};

const runWelcomeAudioOperationSessionOnce = async (parameters = {}) => {
  if (
    !exactObjectKeys(parameters, SESSION_INPUT_FIELDS)
    || parameters.registry_policy
      !== WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST
    || typeof parameters.registry_root !== 'string'
    || !Number.isFinite(parameters.now_ms)
    || parameters.now_ms < 0
  ) {
    return result({
      sessionReceipt: receipt({
        decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
        blockerCodes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID],
      }),
    });
  }

  const {
    registry_root: registryRoot,
    registry_policy: registryPolicy,
    canonical_operation: canonicalOperation,
    current_binding: currentBinding,
    prepared_session_authority: preparedSessionAuthority,
    branded_safari_actuator_port: brandedSafariActuatorPort,
    now_ms: nowMs,
  } = parameters;

  const reservationStatus = reserveWelcomeAudioSafariOperationAuthority({
    prepared_session_authority: preparedSessionAuthority,
    branded_safari_actuator_port: brandedSafariActuatorPort,
    current_binding: currentBinding,
  });
  const reserved = reservationStatus
    === WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.RESERVED_NOW;
  if (!reserved) {
    const authorityConsumed = reservationStatus
      === WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.BINDING_DRIFT;
    return result({
      sessionReceipt: receipt({
        decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
        authorityConsumed,
        retryDisposition: reservationStatus
            === WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED
          ? WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
          : null,
        blockerCodes: [blockerForAuthorityStatus(reservationStatus)],
      }),
    });
  }

  let preclaimPublished = false;
  let claimReceipt = null;
  let operationalReceipt = null;
  try {
    let snapshot;
    try {
      snapshot = structuredClone(canonicalOperation);
    } catch {
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed: true,
          blockerCodes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.OPERATION_INVALID],
        }),
      });
    }
    if (!validatePreclaimSnapshot({ snapshot, binding: currentBinding, nowMs })) {
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed: true,
          blockerCodes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.OPERATION_INVALID],
        }),
      });
    }

    let registryIdentity;
    let paths;
    try {
      registryIdentity = await assertWelcomeAudioOneShotStoreRoot({
        registryRoot,
        policy: registryPolicy,
      });
      paths = buildWelcomeAudioOneShotStorePaths({
        registryRoot: registryIdentity.path,
        expectedCanonicalOperationSha256:
          currentBinding.expected_canonical_operation_sha256,
        namespace: WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
      });
    } catch {
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed: true,
          blockerCodes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.REGISTRY_INVALID],
        }),
      });
    }

    const beforePreclaimStatus = verifyReservedWelcomeAudioSafariOperationAuthority({
      prepared_session_authority: preparedSessionAuthority,
      branded_safari_actuator_port: brandedSafariActuatorPort,
      current_binding: currentBinding,
    });
    if (beforePreclaimStatus !== WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.RESERVED) {
      const authorityConsumed =
        wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation({
          prepared_session_authority: preparedSessionAuthority,
          branded_safari_actuator_port: brandedSafariActuatorPort,
        });
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed,
          retryDisposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
          blockerCodes: [blockerForAuthorityStatus(beforePreclaimStatus)],
        }),
      });
    }

    try {
      await writeWelcomeAudioOneShotExclusiveDurable({
        filePath: paths.preclaim,
        value: snapshot,
        registryIdentity,
        existsReason: WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING,
      });
      preclaimPublished = true;
    } catch (error) {
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed: true,
          blockerCodes: [
            error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING
              ? WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.PRECLAIM_COLLISION
              : WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.PRECLAIM_PUBLISH_FAILED,
          ],
        }),
      });
    }

    const beforeCompositeStatus = verifyReservedWelcomeAudioSafariOperationAuthority({
      prepared_session_authority: preparedSessionAuthority,
      branded_safari_actuator_port: brandedSafariActuatorPort,
      current_binding: currentBinding,
    });
    if (beforeCompositeStatus !== WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.RESERVED) {
      const authorityConsumed =
        wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation({
          prepared_session_authority: preparedSessionAuthority,
          branded_safari_actuator_port: brandedSafariActuatorPort,
        });
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
          authorityConsumed,
          preclaimPublished,
          retryDisposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
          blockerCodes: [blockerForAuthorityStatus(beforeCompositeStatus)],
        }),
      });
    }

    let composite;
    try {
      composite = await runWelcomeAudioOperationalRailOnce({
        registry_root: registryIdentity.path,
        authoritative_preclaim_record_path: paths.preclaim,
        expected_canonical_operation_sha256:
          currentBinding.expected_canonical_operation_sha256,
        registry_policy: registryPolicy,
        branded_safari_actuator_port: brandedSafariActuatorPort,
        now_ms: nowMs,
      });
    } catch {
      const durableFailure = await classifyCompositeFailureEvidence({
        paths,
        registryIdentity,
      });
      consumeWelcomeAudioSafariOperationAuthority({
        prepared_session_authority: preparedSessionAuthority,
        branded_safari_actuator_port: brandedSafariActuatorPort,
        consumed_by_current_invocation: true,
      });
      const authorityConsumed =
        wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation({
          prepared_session_authority: preparedSessionAuthority,
          branded_safari_actuator_port: brandedSafariActuatorPort,
        });
      const blocker = authorityConsumed
        ? WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.COMPOSITE_FAILED
        : WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED;
      return result({
        sessionReceipt: receipt({
          decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED,
          authorityConsumed,
          preclaimPublished,
          effectBoundaryEntered: durableFailure.effectBoundaryEntered,
          modeledActuationCount: durableFailure.modeledActuationCount,
          retryDisposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
          blockerCodes: [blocker],
        }),
      });
    }
    claimReceipt = composite?.claim_receipt ?? null;
    operationalReceipt = composite?.operational_receipt ?? null;
    consumeWelcomeAudioSafariOperationAuthority({
      prepared_session_authority: preparedSessionAuthority,
      branded_safari_actuator_port: brandedSafariActuatorPort,
      consumed_by_current_invocation: true,
    });
    const authorityConsumed =
      wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation({
        prepared_session_authority: preparedSessionAuthority,
        branded_safari_actuator_port: brandedSafariActuatorPort,
      });
    const claimReceiptValid = validateWelcomeAudioClaimReceipt(claimReceipt).ok === true;
    const claimCreated = claimReceiptValid
      && claimReceipt.decision === WELCOME_AUDIO_CLAIM_DECISION.CREATED;
    const operationalReceiptValid = operationalReceipt !== null
      && validateWelcomeAudioSafariOperationalReceipt(operationalReceipt).ok === true;
    const operationalTupleValid = operationalReceiptValid
      && operationalReceipt.retry_disposition
        === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && [0, 1].includes(operationalReceipt.send_control_actuation_count);
    let decision = WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED;
    let blockerCodes = [];
    if (!authorityConsumed) {
      decision = WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED;
      blockerCodes = [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED];
    } else if (!claimReceiptValid) {
      decision = WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED;
      blockerCodes = [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID];
    } else if (!claimCreated) {
      decision = WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED;
      blockerCodes = [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CLAIM_NOT_CREATED];
    } else if (!operationalTupleValid) {
      decision = WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED;
      blockerCodes = [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID];
    }
    return result({
      sessionReceipt: receipt({
        decision,
        authorityConsumed,
        preclaimPublished,
        claimReceipt,
        operationalReceipt,
        retryDisposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
        blockerCodes,
      }),
      claimReceipt,
      operationalReceipt,
    });
  } finally {
    consumeWelcomeAudioSafariOperationAuthority({
      prepared_session_authority: preparedSessionAuthority,
      branded_safari_actuator_port: brandedSafariActuatorPort,
      consumed_by_current_invocation: true,
    });
  }
};

export {
  WELCOME_AUDIO_OPERATION_SESSION_BLOCKER,
  WELCOME_AUDIO_OPERATION_SESSION_CONTRACT_VERSION,
  WELCOME_AUDIO_OPERATION_SESSION_DECISION,
  WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_FIELDS,
  WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_SCHEMA_VERSION,
  runWelcomeAudioOperationSessionOnce,
  validateWelcomeAudioOperationSessionReceipt,
};
