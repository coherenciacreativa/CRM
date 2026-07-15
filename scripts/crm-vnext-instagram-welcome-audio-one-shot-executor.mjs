import {
  lstat,
} from 'node:fs/promises';
import {
  isAbsolute,
  resolve,
  sep,
} from 'node:path';

import {
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_ONE_SHOT_STORE_ERROR,
  WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE,
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  acquireWelcomeAudioOneShotStoreMutex,
  assertSameWelcomeAudioOneShotRecord,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  inspectWelcomeAudioOneShotStoreEvidence,
  promoteWelcomeAudioOneShotPendingToTerminal,
  readWelcomeAudioOneShotRecordStable,
  releaseWelcomeAudioOneShotStoreMutex,
  stableJsonBytes,
  writeWelcomeAudioOneShotExclusiveDurable,
} from './crm-vnext-instagram-welcome-audio-one-shot-store.mjs';

const WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_one_shot_executor_v1';
const WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE = 'synthetic_no_effect_proof_only';
const WELCOME_AUDIO_ONE_SHOT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_one_shot_executor_receipt_v1';
const WELCOME_AUDIO_ONE_SHOT_TERMINAL_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_one_shot_terminal_record_v1';

const WELCOME_AUDIO_ONE_SHOT_DECISION = Object.freeze({
  CONSUMED_ONCE: 'consumed_once_terminal_unconfirmed_no_effect',
  BLOCKED: 'blocked_before_consume',
  BUSY: 'serialization_busy_no_consume',
  REPLAYED_TERMINAL: 'preexisting_or_replayed_terminal',
  UNKNOWN_TERMINAL: 'unknown_terminal_no_retry',
});

const WELCOME_AUDIO_ONE_SHOT_FAULT_POINT = Object.freeze({
  BEFORE_PENDING_PUBLISH: 'before_pending_publish',
  AFTER_PENDING_PUBLISH: 'after_pending_publish',
  AFTER_TERMINAL_PUBLISH: 'after_terminal_publish',
});

const WELCOME_AUDIO_ONE_SHOT_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_executor_input_invalid',
  REGISTRY_INVALID: 'blocked_synthetic_registry_invalid',
  READY_INVALID: 'blocked_ready_record_not_authoritative',
  READY_CHANGED: 'blocked_ready_record_changed_under_serialization',
  SERIALIZATION_BUSY: 'blocked_serialization_mutex_held',
  TERMINAL_PREEXISTING: 'blocked_preexisting_terminal_tombstone',
  TERMINAL_AMBIGUOUS: 'blocked_pending_or_partial_terminal_evidence',
  TERMINAL_VALIDATION: 'blocked_terminal_snapshot_guard_invalid',
});

const WELCOME_AUDIO_ONE_SHOT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'executor_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'input_guard_decision',
  'terminal_guard_decision',
  'consumed_by_current_invocation',
  'terminal_record_present',
  'attempt_budget_consumed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'retry_disposition',
  'blocker_codes',
]);

const RECEIPT_DECISIONS = new Set(Object.values(WELCOME_AUDIO_ONE_SHOT_DECISION));
const RECEIPT_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_ONE_SHOT_BLOCKER));
const GUARD_DECISIONS = new Set(Object.values(WELCOME_AUDIO_GUARD_DECISION));
const FAULT_POINTS = new Set(Object.values(WELCOME_AUDIO_ONE_SHOT_FAULT_POINT));
const CLAIM_LINEAGE_FIELDS = Object.freeze([
  'claim_owner_id',
  'claim_token_id',
  'registry_revision',
  'attempt_id',
]);
const TERMINAL_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'executor_contract_version',
  'execution_mode',
  'canonical_operation_sha256',
  'claim_lineage',
  'terminal_guard_decision',
  'terminal_snapshot',
]);

class SyntheticFaultError extends Error {
  constructor(faultPoint) {
    super(`synthetic_fault_injected:${faultPoint}`);
    this.name = 'SyntheticFaultError';
    this.code = 'CRM_CORE_SYNTHETIC_FAULT';
  }
}

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === [...expected].sort()[index]);
};

const isCleanPrivateIdentifier = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= 512
  && value === value.trim()
  && !/[\r\n\0]/.test(value);

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const hasExactPermissionBits = (metadata, expected) =>
  (metadata.mode & 0o7777) === expected;


const publicReceipt = ({
  decision,
  inputGuardDecision = null,
  terminalGuardDecision = null,
  blockerCodes = [],
}) => {
  const terminalRecordPresent = decision === WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE
    || decision === WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL;
  const attemptBudgetConsumed = terminalRecordPresent
    || decision === WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL;
  return {
    receipt_schema_version: WELCOME_AUDIO_ONE_SHOT_RECEIPT_SCHEMA_VERSION,
    executor_contract_version: WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
    redaction_status: 'allowlist_only_no_private_fields',
    execution_mode: WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE,
    decision,
    input_guard_decision: inputGuardDecision,
    terminal_guard_decision: terminalGuardDecision,
    consumed_by_current_invocation: decision === WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
    terminal_record_present: terminalRecordPresent,
    attempt_budget_consumed: attemptBudgetConsumed,
    external_effect_invoked: false,
    browser_used: false,
    network_used: false,
    retry_disposition: attemptBudgetConsumed
      ? WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      : WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
    blocker_codes: [...blockerCodes],
  };
};

const validateWelcomeAudioOneShotExecutorReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_ONE_SHOT_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID };
  }
  const decisionValid = RECEIPT_DECISIONS.has(receipt.decision);
  const inputDecisionValid = receipt.input_guard_decision === null
    || GUARD_DECISIONS.has(receipt.input_guard_decision);
  const terminalDecisionValid = receipt.terminal_guard_decision === null
    || GUARD_DECISIONS.has(receipt.terminal_guard_decision);
  const blockersValid = Array.isArray(receipt.blocker_codes)
    && receipt.blocker_codes.every((code) => RECEIPT_BLOCKERS.has(code))
    && new Set(receipt.blocker_codes).size === receipt.blocker_codes.length;
  const booleanFieldsValid = [
    receipt.consumed_by_current_invocation,
    receipt.terminal_record_present,
    receipt.attempt_budget_consumed,
    receipt.external_effect_invoked,
    receipt.browser_used,
    receipt.network_used,
  ].every((value) => typeof value === 'boolean');
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_ONE_SHOT_RECEIPT_SCHEMA_VERSION
    || receipt.executor_contract_version !== WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_private_fields'
    || receipt.execution_mode !== WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE
    || !decisionValid
    || !inputDecisionValid
    || !terminalDecisionValid
    || !blockersValid
    || !booleanFieldsValid
    || receipt.external_effect_invoked !== false
    || receipt.browser_used !== false
    || receipt.network_used !== false
  ) return { ok: false, reason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID };

  const expected = publicReceipt({
    decision: receipt.decision,
    inputGuardDecision: receipt.input_guard_decision,
    terminalGuardDecision: receipt.terminal_guard_decision,
    blockerCodes: receipt.blocker_codes,
  });
  const blockedInputSemantics = {
    [WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID]:
      receipt.input_guard_decision === null,
    [WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID]:
      receipt.input_guard_decision === null
        || receipt.input_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY,
    [WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID]:
      receipt.input_guard_decision === null
        || receipt.input_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY,
    [WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED]:
      receipt.input_guard_decision === null
        || receipt.input_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY,
    [WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_VALIDATION]:
      receipt.input_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY,
  };
  const decisionSemantics = {
    [WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE]: receipt.input_guard_decision
      === WELCOME_AUDIO_GUARD_DECISION.READY
      && receipt.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
      && receipt.blocker_codes.length === 0,
    [WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY]: receipt.input_guard_decision
      === WELCOME_AUDIO_GUARD_DECISION.READY
      && receipt.terminal_guard_decision === null
      && receipt.blocker_codes.length === 1
      && receipt.blocker_codes[0] === WELCOME_AUDIO_ONE_SHOT_BLOCKER.SERIALIZATION_BUSY,
    [WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL]: receipt.input_guard_decision === null
      && receipt.terminal_guard_decision === null
      && receipt.blocker_codes.length === 1
      && receipt.blocker_codes[0] === WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING,
    [WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL]: receipt.input_guard_decision === null
      && receipt.terminal_guard_decision === null
      && receipt.blocker_codes.length === 1
      && receipt.blocker_codes[0] === WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS,
    [WELCOME_AUDIO_ONE_SHOT_DECISION.BLOCKED]: receipt.terminal_guard_decision === null
      && receipt.blocker_codes.length === 1
      && ![
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.SERIALIZATION_BUSY,
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING,
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS,
      ].includes(receipt.blocker_codes[0])
      && blockedInputSemantics[receipt.blocker_codes[0]] === true,
  }[receipt.decision] === true;
  const semanticallyEqual = WELCOME_AUDIO_ONE_SHOT_RECEIPT_FIELDS.every(
    (field) => JSON.stringify(receipt[field]) === JSON.stringify(expected[field]),
  );
  return semanticallyEqual && decisionSemantics
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID };
};

const assertExecutorInput = ({
  registryDir,
  expectedCanonicalOperationSha256,
  expectedClaimLineage,
  nowMs,
  faultPoint,
}) => {
  const registrySegments = typeof registryDir === 'string' ? registryDir.split(sep) : [];
  if (
    !isAbsolute(registryDir)
    || registryDir !== resolve(registryDir)
    || registrySegments.some((segment) => segment === '.' || segment === '..')
    || !isSha256(expectedCanonicalOperationSha256)
  ) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID);
  }
  if (
    !exactObjectKeys(expectedClaimLineage, CLAIM_LINEAGE_FIELDS)
    || !isCleanPrivateIdentifier(expectedClaimLineage.claim_owner_id)
    || !isCleanPrivateIdentifier(expectedClaimLineage.claim_token_id)
    || !Number.isInteger(expectedClaimLineage.registry_revision)
    || expectedClaimLineage.registry_revision < 1
    || !isCleanPrivateIdentifier(expectedClaimLineage.attempt_id)
    || !Number.isFinite(nowMs)
    || nowMs < 0
    || (faultPoint !== null && !FAULT_POINTS.has(faultPoint))
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID);
};

const assertSyntheticRegistry = async (registryDir, expectedIdentity = null) => {
  try {
    return await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: registryDir,
      policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      expectedIdentity,
    });
  } catch {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  }
};

const buildWelcomeAudioOneShotSyntheticRegistryPaths = ({
  registryDir,
  expectedCanonicalOperationSha256,
}) => {
  try {
    return buildWelcomeAudioOneShotStorePaths({
      registryRoot: registryDir,
      expectedCanonicalOperationSha256,
      namespace: WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
    });
  } catch {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID);
  }
};

const readReadyRecordStable = async (filePath) => {
  try {
    const registryIdentity = await assertSyntheticRegistry(resolve(filePath, '..'));
    return await readWelcomeAudioOneShotRecordStable({
      filePath,
      registryIdentity,
    });
  } catch (error) {
    if (error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_CHANGED) {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED);
    }
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
  }
};

const assertSameReadyRecord = (before, after) => {
  try {
    assertSameWelcomeAudioOneShotRecord(before, after);
  } catch {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED);
  }
};

const validateAuthoritativeReady = ({
  snapshot,
  expectedCanonicalOperationSha256,
  expectedClaimLineage,
  nowMs,
}) => {
  const guard = validateWelcomeAudioOperation(snapshot, {
    nowMs,
    expectedCanonicalOperationSha256,
  });
  const lineageMatches = snapshot?.effect_claim?.claim_owner_id
    === expectedClaimLineage.claim_owner_id
    && snapshot?.effect_claim?.claim_token_id === expectedClaimLineage.claim_token_id
    && snapshot?.effect_claim?.registry_revision === expectedClaimLineage.registry_revision
    && snapshot?.effect_claim?.attempt_id === expectedClaimLineage.attempt_id
    && snapshot?.execution?.claim_owner_id === expectedClaimLineage.claim_owner_id
    && snapshot?.execution?.claim_token_id === expectedClaimLineage.claim_token_id
    && snapshot?.execution?.claim_registry_revision === expectedClaimLineage.registry_revision
    && snapshot?.execution?.attempt_id === expectedClaimLineage.attempt_id
    && snapshot?.confirmation?.claim_owner_id === expectedClaimLineage.claim_owner_id
    && snapshot?.confirmation?.claim_token_id === expectedClaimLineage.claim_token_id
    && snapshot?.confirmation?.claim_registry_revision === expectedClaimLineage.registry_revision
    && snapshot?.confirmation?.attempt_id === expectedClaimLineage.attempt_id;
  const authoritative = guard.ok === true
    && guard.state_valid === true
    && guard.phase === WELCOME_AUDIO_GUARD_PHASE.SEND_READY
    && guard.decision === WELCOME_AUDIO_GUARD_DECISION.READY
    && guard.send_ready === true
    && guard.send_allowed === false
    && guard.one_shot_consumer_required === true
    && guard.terminal === false
    && Array.isArray(guard.blockers)
    && guard.blockers.length === 0
    && snapshot?.canonical_operation_sha256 === expectedCanonicalOperationSha256
    && lineageMatches;
  if (!authoritative) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
  return guard;
};

const deriveTerminalSnapshot = ({ snapshot, nowMs }) => {
  const terminal = structuredClone(snapshot);
  const boundaryTimestamp = new Date(nowMs).toISOString();
  terminal.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
  terminal.execution.send_attempt_count = 1;
  terminal.execution.attempt_state = WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL;
  terminal.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
  terminal.execution.retry_disposition = WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT;
  terminal.execution.retry_requested = false;
  terminal.execution.claim_token_consumed_at = boundaryTimestamp;
  terminal.execution.attempted_at = boundaryTimestamp;
  terminal.confirmation.confirmation_marker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;
  terminal.confirmation.bound_to_current_operation = false;
  terminal.confirmation.checked_at = boundaryTimestamp;
  return terminal;
};

const validateTerminalSnapshot = ({
  snapshot,
  expectedCanonicalOperationSha256,
  nowMs,
}) => {
  const guard = validateWelcomeAudioOperation(snapshot, {
    nowMs,
    expectedCanonicalOperationSha256,
  });
  if (
    guard.state_valid !== true
    || guard.phase !== WELCOME_AUDIO_GUARD_PHASE.TERMINAL
    || guard.decision !== WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
    || guard.terminal !== true
    || guard.send_ready !== false
    || guard.send_allowed !== false
    || guard.one_shot_consumer_required !== false
    || snapshot?.effect_claim?.claim_token_status !== WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED
    || snapshot?.execution?.send_attempt_count !== 1
    || snapshot?.execution?.attempt_state !== WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
    || snapshot?.execution?.send_claim !== WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED
    || snapshot?.execution?.retry_disposition
      !== WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
    || snapshot?.confirmation?.confirmation_marker !== WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_VALIDATION);
  return guard;
};

const terminalRecord = ({
  terminalSnapshot,
  expectedCanonicalOperationSha256,
  expectedClaimLineage,
  terminalGuardDecision,
}) => ({
  record_schema_version: WELCOME_AUDIO_ONE_SHOT_TERMINAL_RECORD_SCHEMA_VERSION,
  executor_contract_version: WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
  execution_mode: WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE,
  canonical_operation_sha256: expectedCanonicalOperationSha256,
  claim_lineage: { ...expectedClaimLineage },
  terminal_guard_decision: terminalGuardDecision,
  terminal_snapshot: terminalSnapshot,
});

const validateTerminalRecord = (record) => exactObjectKeys(record, TERMINAL_RECORD_FIELDS)
  && record.record_schema_version === WELCOME_AUDIO_ONE_SHOT_TERMINAL_RECORD_SCHEMA_VERSION
  && record.executor_contract_version === WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION
  && record.execution_mode === WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE
  && isSha256(record.canonical_operation_sha256)
  && exactObjectKeys(record.claim_lineage, CLAIM_LINEAGE_FIELDS)
  && record.terminal_guard_decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL
  && record.terminal_snapshot
  && typeof record.terminal_snapshot === 'object';

const writeExclusiveDurable = async ({
  filePath,
  bytes,
  existsReason,
  registryIdentity,
}) => {
  try {
    return await writeWelcomeAudioOneShotExclusiveDurable({
      filePath,
      value: JSON.parse(bytes.toString('utf8')),
      registryIdentity,
      existsReason,
    });
  } catch (error) {
    if (error?.message === existsReason) throw error;
    if (error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING) {
      throw new Error(existsReason);
    }
    if (error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID) {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
    }
    throw error;
  }
};

const inspectTerminalEvidence = async ({ paths, registryIdentity }) => {
  const evidence = await inspectWelcomeAudioOneShotStoreEvidence({
    paths,
    registryIdentity,
  });
  if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL) return 'terminal';
  if (
    evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN
    || evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY_PARTIAL
  ) return 'unknown';
  return null;
};

const acquireMutex = async ({ paths, registryIdentity }) => {
  try {
    return await acquireWelcomeAudioOneShotStoreMutex({ paths, registryIdentity });
  } catch (error) {
    if (error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.MUTEX_BUSY) return false;
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  }
};

const releaseMutex = async ({ paths, registryIdentity, mutexIdentity }) => {
  try {
    await releaseWelcomeAudioOneShotStoreMutex({
      paths,
      registryIdentity,
      mutexIdentity,
    });
  } catch {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  }
};

const receiptForEvidence = (evidence) => evidence === 'terminal'
  ? publicReceipt({
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL,
      blockerCodes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING],
    })
  : publicReceipt({
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL,
      blockerCodes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS],
    });

const blockedReceipt = (blockerCode, inputGuardDecision = null) => publicReceipt({
  decision: WELCOME_AUDIO_ONE_SHOT_DECISION.BLOCKED,
  inputGuardDecision,
  blockerCodes: [blockerCode],
});

const executeWelcomeAudioOneShotSynthetic = async ({
  registryDir,
  expectedCanonicalOperationSha256,
  expectedClaimLineage,
  nowMs = Date.now(),
  faultPoint = null,
}) => {
  try {
    assertExecutorInput({
      registryDir,
      expectedCanonicalOperationSha256,
      expectedClaimLineage,
      nowMs,
      faultPoint,
    });
  } catch {
    return blockedReceipt(WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID);
  }

  let paths = buildWelcomeAudioOneShotSyntheticRegistryPaths({
    registryDir,
    expectedCanonicalOperationSha256,
  });
  let registryIdentity;
  let initialReady;
  let initialGuard;
  try {
    registryIdentity = await assertSyntheticRegistry(paths.root);
    paths = buildWelcomeAudioOneShotSyntheticRegistryPaths({
      registryDir: registryIdentity.path,
      expectedCanonicalOperationSha256,
    });
    await assertSyntheticRegistry(paths.root, registryIdentity);
    const evidence = await inspectTerminalEvidence({ paths, registryIdentity });
    if (evidence) return receiptForEvidence(evidence);
    initialReady = await readReadyRecordStable(paths.ready);
    initialGuard = validateAuthoritativeReady({
      snapshot: initialReady.snapshot,
      expectedCanonicalOperationSha256,
      expectedClaimLineage,
      nowMs,
    });
  } catch (error) {
    const blocker = RECEIPT_BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID;
    return blockedReceipt(blocker);
  }

  let mutexIdentity = null;
  let preserveMutex = false;
  try {
    mutexIdentity = await acquireMutex({ paths, registryIdentity });
    if (!mutexIdentity) {
      return publicReceipt({
        decision: WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY,
        inputGuardDecision: initialGuard.decision,
        blockerCodes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.SERIALIZATION_BUSY],
      });
    }

    let evidence = await inspectTerminalEvidence({ paths, registryIdentity });
    if (evidence) return receiptForEvidence(evidence);

    const lockedReady = await readReadyRecordStable(paths.ready);
    assertSameReadyRecord(initialReady, lockedReady);
    const lockedGuard = validateAuthoritativeReady({
      snapshot: lockedReady.snapshot,
      expectedCanonicalOperationSha256,
      expectedClaimLineage,
      nowMs,
    });
    const finalReadyCheck = await readReadyRecordStable(paths.ready);
    assertSameReadyRecord(lockedReady, finalReadyCheck);
    validateAuthoritativeReady({
      snapshot: finalReadyCheck.snapshot,
      expectedCanonicalOperationSha256,
      expectedClaimLineage,
      nowMs,
    });

    const terminalSnapshot = deriveTerminalSnapshot({
      snapshot: finalReadyCheck.snapshot,
      nowMs,
    });
    const terminalGuard = validateTerminalSnapshot({
      snapshot: terminalSnapshot,
      expectedCanonicalOperationSha256,
      nowMs,
    });
    const record = terminalRecord({
      terminalSnapshot,
      expectedCanonicalOperationSha256,
      expectedClaimLineage,
      terminalGuardDecision: terminalGuard.decision,
    });
    if (!validateTerminalRecord(record)) {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_VALIDATION);
    }

    if (faultPoint === WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.BEFORE_PENDING_PUBLISH) {
      preserveMutex = true;
      throw new SyntheticFaultError(faultPoint);
    }

    await writeExclusiveDurable({
      filePath: paths.pending,
      bytes: stableJsonBytes(record),
      existsReason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS,
      registryIdentity,
    });
    if (faultPoint === WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.AFTER_PENDING_PUBLISH) {
      preserveMutex = true;
      throw new SyntheticFaultError(faultPoint);
    }

    try {
      await promoteWelcomeAudioOneShotPendingToTerminal({
        paths,
        registryIdentity,
      });
    } catch (error) {
      if (error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING) {
        throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING);
      }
      throw error;
    }
    if (faultPoint === WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.AFTER_TERMINAL_PUBLISH) {
      preserveMutex = true;
      throw new SyntheticFaultError(faultPoint);
    }
    const terminalMetadata = await lstat(paths.terminal);
    if (
      !terminalMetadata.isFile()
      || terminalMetadata.isSymbolicLink()
      || terminalMetadata.nlink !== 1
      || !hasExactPermissionBits(terminalMetadata, 0o600)
      || (typeof process.getuid === 'function' && terminalMetadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS);
    return publicReceipt({
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
      inputGuardDecision: lockedGuard.decision,
      terminalGuardDecision: terminalGuard.decision,
      blockerCodes: [],
    });
  } catch (error) {
    if (error?.code === 'CRM_CORE_SYNTHETIC_FAULT') throw error;
    let evidence = null;
    try {
      evidence = await inspectTerminalEvidence({ paths, registryIdentity });
    } catch {
      evidence = 'unknown';
    }
    if (evidence) return receiptForEvidence(evidence);
    const blocker = RECEIPT_BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID;
    return blockedReceipt(blocker, initialGuard?.decision ?? null);
  } finally {
    if (mutexIdentity && !preserveMutex) {
      await releaseMutex({ paths, registryIdentity, mutexIdentity }).catch(() => {});
    }
  }
};

export {
  WELCOME_AUDIO_ONE_SHOT_BLOCKER,
  WELCOME_AUDIO_ONE_SHOT_DECISION,
  WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE,
  WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
  WELCOME_AUDIO_ONE_SHOT_FAULT_POINT,
  WELCOME_AUDIO_ONE_SHOT_RECEIPT_FIELDS,
  WELCOME_AUDIO_ONE_SHOT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_ONE_SHOT_TERMINAL_RECORD_SCHEMA_VERSION,
  buildWelcomeAudioOneShotSyntheticRegistryPaths,
  executeWelcomeAudioOneShotSynthetic,
  validateWelcomeAudioOneShotExecutorReceipt,
};
