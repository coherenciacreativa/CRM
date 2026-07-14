import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rmdir,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
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
const MAX_READY_RECORD_BYTES = 256 * 1024;

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

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const stableJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');

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

const isInside = (candidate, parent) => {
  const suffix = relative(parent, candidate);
  return suffix !== '' && suffix !== '..' && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
};

const assertSyntheticRegistry = async (registryDir, expectedIdentity = null) => {
  const unresolvedRegistryPath = resolve(registryDir);
  const unresolvedTempRoot = resolve(tmpdir());
  const tempRoot = await realpath(tmpdir());
  const directUnderUnresolvedTemp = isInside(unresolvedRegistryPath, unresolvedTempRoot)
    && dirname(unresolvedRegistryPath) === unresolvedTempRoot;
  const directUnderCanonicalTemp = isInside(unresolvedRegistryPath, tempRoot)
    && dirname(unresolvedRegistryPath) === tempRoot;
  if (
    !directUnderUnresolvedTemp
    && !directUnderCanonicalTemp
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  const unresolvedMetadata = await lstat(unresolvedRegistryPath);
  if (
    !unresolvedMetadata.isDirectory()
    || unresolvedMetadata.isSymbolicLink()
    || !hasExactPermissionBits(unresolvedMetadata, 0o700)
    || (typeof process.getuid === 'function' && unresolvedMetadata.uid !== process.getuid())
  ) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  }
  const registryPath = await realpath(unresolvedRegistryPath);
  const metadata = await lstat(registryPath);
  if (
    !isInside(registryPath, tempRoot)
    || dirname(registryPath) !== tempRoot
    || registryPath !== join(tempRoot, basename(unresolvedRegistryPath))
    || !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !hasExactPermissionBits(metadata, 0o700)
    || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    || metadata.dev !== unresolvedMetadata.dev
    || metadata.ino !== unresolvedMetadata.ino
    || metadata.uid !== unresolvedMetadata.uid
    || metadata.mode !== unresolvedMetadata.mode
    || (expectedIdentity && (
      metadata.dev !== expectedIdentity.dev
      || metadata.ino !== expectedIdentity.ino
      || metadata.uid !== expectedIdentity.uid
    ))
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  return { path: registryPath, dev: metadata.dev, ino: metadata.ino, uid: metadata.uid };
};

const buildWelcomeAudioOneShotSyntheticRegistryPaths = ({
  registryDir,
  expectedCanonicalOperationSha256,
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
  const fingerprint = sha256(
    `${WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION}:${expectedCanonicalOperationSha256}`,
  );
  const root = resolve(registryDir);
  return Object.freeze({
    root,
    ready: join(root, `ready-${fingerprint}.json`),
    pending: join(root, `pending-${fingerprint}.json`),
    terminal: join(root, `terminal-${fingerprint}.json`),
    mutex: join(root, `mutex-${fingerprint}.lock`),
    pendingTempPrefix: `.pending-${fingerprint}.json.tmp-`,
    terminalTempPrefix: `.terminal-${fingerprint}.json.tmp-`,
  });
};

const syncDirectory = async (directoryPath, expectedIdentity = null) => {
  let handle;
  try {
    handle = await open(directoryPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await handle.stat();
    if (
      !metadata.isDirectory()
      || !hasExactPermissionBits(metadata, 0o700)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
      || (expectedIdentity && (
        metadata.dev !== expectedIdentity.dev
        || metadata.ino !== expectedIdentity.ino
        || metadata.uid !== expectedIdentity.uid
      ))
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
    await handle.sync();
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
    throw error;
  } finally {
    await handle?.close();
  }
};

const readReadyRecordStable = async (filePath) => {
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || !hasExactPermissionBits(before, 0o600)
      || before.nlink !== 1
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
      || before.size < 2
      || before.size > MAX_READY_RECORD_BYTES
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      !after.isFile()
      || !hasExactPermissionBits(after, 0o600)
      || after.nlink !== 1
      || (typeof process.getuid === 'function' && after.uid !== process.getuid())
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || before.ctimeMs !== after.ctimeMs
      || before.mode !== after.mode
      || before.nlink !== after.nlink
      || before.uid !== after.uid
      || bytes.length !== after.size
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED);
    let snapshot;
    try {
      snapshot = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    }
    return {
      snapshot,
      digest: sha256(bytes),
      metadata: {
        dev: after.dev,
        ino: after.ino,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
        mode: after.mode,
        nlink: after.nlink,
        uid: after.uid,
      },
    };
  } catch (error) {
    if (error?.code === 'ELOOP' || error?.code === 'ENOENT') {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const assertSameReadyRecord = (before, after) => {
  if (
    before.digest !== after.digest
    || before.metadata.dev !== after.metadata.dev
    || before.metadata.ino !== after.metadata.ino
    || before.metadata.size !== after.metadata.size
    || before.metadata.mtimeMs !== after.metadata.mtimeMs
    || before.metadata.ctimeMs !== after.metadata.ctimeMs
    || before.metadata.mode !== after.metadata.mode
    || before.metadata.nlink !== after.metadata.nlink
    || before.metadata.uid !== after.metadata.uid
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED);
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
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`,
  );
  let handle;
  try {
    await assertSyntheticRegistry(dirname(filePath), registryIdentity);
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
    await handle.close();
    handle = null;
    await assertSyntheticRegistry(dirname(filePath), registryIdentity);
    await link(temporaryPath, filePath);
    await assertSyntheticRegistry(dirname(filePath), registryIdentity);
    await unlink(temporaryPath);
    await syncDirectory(dirname(filePath), registryIdentity);
    const metadata = await lstat(filePath);
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.nlink !== 1
      || !hasExactPermissionBits(metadata, 0o600)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
    return metadata;
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(existsReason);
    throw error;
  } finally {
    await handle?.close();
    try {
      await assertSyntheticRegistry(dirname(filePath), registryIdentity);
      await unlink(temporaryPath);
      await assertSyntheticRegistry(dirname(filePath), registryIdentity);
    } catch {
      // Identity drift or a missing temp file must leave cleanup fail-closed.
    }
  }
};

const inspectTerminalEvidence = async ({ paths, registryIdentity }) => {
  await assertSyntheticRegistry(paths.root, registryIdentity);
  const entries = await readdir(paths.root);
  if (entries.includes(basename(paths.terminal))) return 'terminal';
  if (
    entries.includes(basename(paths.pending))
    || entries.some((entry) => entry.startsWith(paths.pendingTempPrefix))
    || entries.some((entry) => entry.startsWith(paths.terminalTempPrefix))
  ) return 'unknown';
  return null;
};

const acquireMutex = async ({ paths, registryIdentity }) => {
  try {
    await assertSyntheticRegistry(paths.root, registryIdentity);
    await mkdir(paths.mutex, { mode: 0o700 });
    await syncDirectory(paths.root, registryIdentity);
    const metadata = await lstat(paths.mutex);
    if (
      !metadata.isDirectory()
      || metadata.isSymbolicLink()
      || !hasExactPermissionBits(metadata, 0o700)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
    await assertSyntheticRegistry(paths.root, registryIdentity);
    return {
      dev: metadata.dev,
      ino: metadata.ino,
      uid: metadata.uid,
      mode: metadata.mode,
    };
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
};

const releaseMutex = async ({ paths, registryIdentity, mutexIdentity }) => {
  await assertSyntheticRegistry(paths.root, registryIdentity);
  const metadata = await lstat(paths.mutex);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !hasExactPermissionBits(metadata, 0o700)
    || metadata.dev !== mutexIdentity.dev
    || metadata.ino !== mutexIdentity.ino
    || metadata.uid !== mutexIdentity.uid
    || metadata.mode !== mutexIdentity.mode
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  await rmdir(paths.mutex);
  await syncDirectory(paths.root, registryIdentity);
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

    await assertSyntheticRegistry(paths.root, registryIdentity);
    try {
      await link(paths.pending, paths.terminal);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING);
      }
      throw error;
    }
    await assertSyntheticRegistry(paths.root, registryIdentity);
    await syncDirectory(paths.root, registryIdentity);
    if (faultPoint === WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.AFTER_TERMINAL_PUBLISH) {
      preserveMutex = true;
      throw new SyntheticFaultError(faultPoint);
    }

    await assertSyntheticRegistry(paths.root, registryIdentity);
    await unlink(paths.pending);
    await syncDirectory(paths.root, registryIdentity);
    const terminalMetadata = await lstat(paths.terminal);
    if (
      !terminalMetadata.isFile()
      || terminalMetadata.isSymbolicLink()
      || terminalMetadata.nlink !== 1
      || !hasExactPermissionBits(terminalMetadata, 0o600)
      || (typeof process.getuid === 'function' && terminalMetadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS);
    await assertSyntheticRegistry(paths.root, registryIdentity);
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
