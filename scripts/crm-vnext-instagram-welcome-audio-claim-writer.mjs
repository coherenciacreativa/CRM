import { randomBytes } from 'node:crypto';
import { dirname } from 'node:path';

import {
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
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
  readWelcomeAudioOneShotRecordStable,
  releaseWelcomeAudioOneShotStoreMutex,
  writeWelcomeAudioOneShotExclusiveDurable,
} from './crm-vnext-instagram-welcome-audio-one-shot-store.mjs';

const WELCOME_AUDIO_CLAIM_WRITER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_claim_writer_v1';
const WELCOME_AUDIO_CLAIM_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_claim_receipt_v1';
const WELCOME_AUDIO_CLAIM_EXECUTION_MODE = 'deterministic_no_effect_test';

const WELCOME_AUDIO_CLAIM_DECISION = Object.freeze({
  CREATED: 'claim_created_ready_no_effect',
  BLOCKED: 'blocked_before_claim',
  BUSY: 'serialization_busy_no_claim',
  REPLAYED: 'preexisting_or_replayed_claim',
  UNKNOWN_TERMINAL: 'unknown_terminal_no_retry',
});

const WELCOME_AUDIO_CLAIM_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_claim_writer_input_invalid',
  REGISTRY_INVALID: 'blocked_claim_registry_invalid',
  PRECLAIM_INVALID: 'blocked_preclaim_record_not_authoritative',
  PRECLAIM_CHANGED: 'blocked_preclaim_record_changed_under_serialization',
  SERIALIZATION_BUSY: 'blocked_claim_serialization_mutex_held',
  PREEXISTING_CLAIM: 'blocked_preexisting_ready_claim',
  TERMINAL_AMBIGUOUS: 'blocked_pending_or_terminal_claim_evidence',
  READY_INVALID: 'blocked_claim_ready_record_not_authoritative',
});

const WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'claim_writer_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'preclaim_guard_decision',
  'ready_guard_decision',
  'claim_created_by_current_invocation',
  'ready_record_present',
  'terminal_or_ambiguous_evidence_present',
  'retry_disposition',
  'blocker_codes',
]);

const RECEIPT_DECISIONS = new Set(Object.values(WELCOME_AUDIO_CLAIM_DECISION));
const RECEIPT_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_CLAIM_BLOCKER));
const CAPABILITY_STATE = new WeakMap();
const WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS = Object.freeze({
  FRESH: 'fresh',
  CONSUMED: 'consumed',
  INVALID: 'invalid',
});
const WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS = Object.freeze({
  CONSUMED_NOW: 'consumed_now',
  ALREADY_CONSUMED: 'already_consumed',
  INVALID: 'invalid',
});

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const opaqueId = (prefix) => `${prefix}_${randomBytes(24).toString('hex')}`;

const buildReceipt = ({
  decision,
  preclaimGuardDecision = null,
  readyGuardDecision = null,
  blockerCodes = [],
}) => {
  const claimCreated = decision === WELCOME_AUDIO_CLAIM_DECISION.CREATED;
  const preexisting = decision === WELCOME_AUDIO_CLAIM_DECISION.REPLAYED;
  const ambiguous = decision === WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL;
  return Object.freeze({
    receipt_schema_version: WELCOME_AUDIO_CLAIM_RECEIPT_SCHEMA_VERSION,
    claim_writer_contract_version: WELCOME_AUDIO_CLAIM_WRITER_CONTRACT_VERSION,
    redaction_status: 'allowlist_only_no_private_fields',
    execution_mode: WELCOME_AUDIO_CLAIM_EXECUTION_MODE,
    decision,
    preclaim_guard_decision: preclaimGuardDecision,
    ready_guard_decision: readyGuardDecision,
    claim_created_by_current_invocation: claimCreated,
    ready_record_present: claimCreated || preexisting,
    terminal_or_ambiguous_evidence_present: ambiguous,
    retry_disposition: claimCreated || preexisting || ambiguous
      ? WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      : WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

const validateWelcomeAudioClaimReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID };
  }
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_CLAIM_RECEIPT_SCHEMA_VERSION
    || receipt.claim_writer_contract_version !== WELCOME_AUDIO_CLAIM_WRITER_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_private_fields'
    || receipt.execution_mode !== WELCOME_AUDIO_CLAIM_EXECUTION_MODE
    || !RECEIPT_DECISIONS.has(receipt.decision)
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length
  ) return { ok: false, reason: WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID };
  const expected = buildReceipt({
    decision: receipt.decision,
    preclaimGuardDecision: receipt.preclaim_guard_decision,
    readyGuardDecision: receipt.ready_guard_decision,
    blockerCodes: receipt.blocker_codes,
  });
  const exact = WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS.every(
    (field) => JSON.stringify(receipt[field]) === JSON.stringify(expected[field]),
  );
  const expectedBlockerCount = receipt.decision === WELCOME_AUDIO_CLAIM_DECISION.CREATED ? 0 : 1;
  const blockedPreclaimSemantics = {
    [WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID]:
      receipt.preclaim_guard_decision === null,
    [WELCOME_AUDIO_CLAIM_BLOCKER.REGISTRY_INVALID]:
      receipt.preclaim_guard_decision === null
      || receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
    [WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID]:
      receipt.preclaim_guard_decision === null
      || receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
    [WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_CHANGED]:
      receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
    [WELCOME_AUDIO_CLAIM_BLOCKER.READY_INVALID]:
      receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
  }[receipt.blocker_codes[0]] === true;
  const semantics = {
    [WELCOME_AUDIO_CLAIM_DECISION.CREATED]:
      receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
      && receipt.ready_guard_decision === WELCOME_AUDIO_GUARD_DECISION.READY,
    [WELCOME_AUDIO_CLAIM_DECISION.BUSY]:
      receipt.preclaim_guard_decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
      && receipt.ready_guard_decision === null
      && receipt.blocker_codes[0] === WELCOME_AUDIO_CLAIM_BLOCKER.SERIALIZATION_BUSY,
    [WELCOME_AUDIO_CLAIM_DECISION.REPLAYED]:
      receipt.preclaim_guard_decision === null
      && receipt.ready_guard_decision === null
      && receipt.blocker_codes[0] === WELCOME_AUDIO_CLAIM_BLOCKER.PREEXISTING_CLAIM,
    [WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL]:
      receipt.preclaim_guard_decision === null
      && receipt.ready_guard_decision === null
      && receipt.blocker_codes[0] === WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS,
    [WELCOME_AUDIO_CLAIM_DECISION.BLOCKED]:
      receipt.ready_guard_decision === null
      && blockedPreclaimSemantics,
  }[receipt.decision] === true;
  return exact && semantics && receipt.blocker_codes.length === expectedBlockerCount
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID };
};

const createPrivateCapability = (state) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: {
      value: Symbol('crm_core_welcome_audio_private_claim_capability'),
      enumerable: true,
    },
    toJSON: {
      value: () => {
        throw new TypeError('private_claim_capability_not_serializable');
      },
      enumerable: false,
    },
  });
  Object.freeze(capability);
  CAPABILITY_STATE.set(capability, { ...state, consumed: false });
  return capability;
};

const consumeWelcomeAudioPrivateClaimCapability = (capability) => {
  const state = CAPABILITY_STATE.get(capability);
  if (!state) return WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.INVALID;
  if (state.consumed) {
    return WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.ALREADY_CONSUMED;
  }
  state.consumed = true;
  return WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW;
};

const sameRegistryIdentity = (actual, expected) => actual?.path === expected.path
  && actual?.dev === expected.dev
  && actual?.ino === expected.ino
  && actual?.uid === expected.uid
  && actual?.policy === expected.policy;

const sameReadyMetadata = (actual, expected) => actual?.dev === expected.dev
  && actual?.ino === expected.ino
  && actual?.size === expected.size
  && actual?.mtimeMs === expected.mtimeMs
  && actual?.ctimeMs === expected.ctimeMs
  && actual?.mode === expected.mode
  && actual?.nlink === expected.nlink
  && actual?.uid === expected.uid;

const statusForCapabilityState = (state) => state.consumed
  ? WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.CONSUMED
  : WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.FRESH;

const verifyWelcomeAudioPrivateClaimCapabilityBinding = ({
  private_claim_capability,
  registry_root,
  registry_identity,
  expected_canonical_operation_sha256,
}) => {
  const state = CAPABILITY_STATE.get(private_claim_capability);
  if (
    !state
    || registry_root !== state.registry_root
    || expected_canonical_operation_sha256
      !== state.expected_canonical_operation_sha256
    || !sameRegistryIdentity(registry_identity, state.registry_identity)
  ) return WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.INVALID;
  return statusForCapabilityState(state);
};

const verifyWelcomeAudioPrivateClaimReadyBinding = ({
  private_claim_capability,
  registry_root,
  registry_identity,
  expected_canonical_operation_sha256,
  ready_record_digest,
  ready_record_metadata,
}) => {
  const state = CAPABILITY_STATE.get(private_claim_capability);
  if (
    !state
    || registry_root !== state.registry_root
    || expected_canonical_operation_sha256
      !== state.expected_canonical_operation_sha256
    || !sameRegistryIdentity(registry_identity, state.registry_identity)
    || ready_record_digest !== state.ready_digest
    || !sameReadyMetadata(ready_record_metadata, state.ready_metadata)
  ) return WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.INVALID;
  return statusForCapabilityState(state);
};

const blocked = (blocker, preclaimGuardDecision = null) => ({
  private_claim_capability: null,
  redacted_receipt: buildReceipt({
    decision: WELCOME_AUDIO_CLAIM_DECISION.BLOCKED,
    preclaimGuardDecision,
    blockerCodes: [blocker],
  }),
});

const validatePreclaim = ({ snapshot, expectedDigest, nowMs }) => {
  const guard = validateWelcomeAudioOperation(snapshot, {
    expectedCanonicalOperationSha256: expectedDigest,
    nowMs,
  });
  if (
    guard.ok !== true
    || guard.state_valid !== true
    || guard.phase !== WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
    || guard.decision !== WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    || guard.claim_allowed !== true
    || guard.send_allowed !== false
    || guard.terminal !== false
    || !Array.isArray(guard.blockers)
    || guard.blockers.length !== 0
  ) throw new Error(WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID);
  return guard;
};

const deriveReady = ({ snapshot, nowMs, lineage }) => {
  const ready = structuredClone(snapshot);
  const claimedAt = new Date(nowMs).toISOString();
  Object.assign(ready.effect_claim, {
    status: WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT,
    claim_result: WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION,
    claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION,
    atomic: true,
    permanent: true,
    claimed_at: claimedAt,
    claim_owner_id: lineage.claim_owner_id,
    claim_token_id: lineage.claim_token_id,
    registry_revision: lineage.registry_revision,
    attempt_id: lineage.attempt_id,
  });
  Object.assign(ready.execution, {
    attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED,
    claim_owner_id: lineage.claim_owner_id,
    claim_token_id: lineage.claim_token_id,
    claim_registry_revision: lineage.registry_revision,
    attempt_id: lineage.attempt_id,
  });
  Object.assign(ready.confirmation, {
    claim_owner_id: lineage.claim_owner_id,
    claim_token_id: lineage.claim_token_id,
    claim_registry_revision: lineage.registry_revision,
    attempt_id: lineage.attempt_id,
  });
  return ready;
};

const validateReady = ({ snapshot, expectedDigest, lineage, nowMs }) => {
  const guard = validateWelcomeAudioOperation(snapshot, {
    expectedCanonicalOperationSha256: expectedDigest,
    nowMs,
  });
  const lineageMatches = snapshot?.effect_claim?.claim_owner_id === lineage.claim_owner_id
    && snapshot?.effect_claim?.claim_token_id === lineage.claim_token_id
    && snapshot?.effect_claim?.registry_revision === lineage.registry_revision
    && snapshot?.effect_claim?.attempt_id === lineage.attempt_id
    && snapshot?.execution?.claim_owner_id === lineage.claim_owner_id
    && snapshot?.execution?.claim_token_id === lineage.claim_token_id
    && snapshot?.execution?.claim_registry_revision === lineage.registry_revision
    && snapshot?.execution?.attempt_id === lineage.attempt_id
    && snapshot?.confirmation?.claim_owner_id === lineage.claim_owner_id
    && snapshot?.confirmation?.claim_token_id === lineage.claim_token_id
    && snapshot?.confirmation?.claim_registry_revision === lineage.registry_revision
    && snapshot?.confirmation?.attempt_id === lineage.attempt_id;
  if (
    guard.ok !== true
    || guard.state_valid !== true
    || guard.phase !== WELCOME_AUDIO_GUARD_PHASE.SEND_READY
    || guard.decision !== WELCOME_AUDIO_GUARD_DECISION.READY
    || guard.send_ready !== true
    || guard.send_allowed !== false
    || guard.one_shot_consumer_required !== true
    || guard.terminal !== false
    || guard.blockers.length !== 0
    || snapshot.canonical_operation_sha256 !== expectedDigest
    || !lineageMatches
  ) throw new Error(WELCOME_AUDIO_CLAIM_BLOCKER.READY_INVALID);
  return guard;
};

const issueWelcomeAudioClaim = async ({
  registry_root,
  authoritative_preclaim_record_path,
  expected_canonical_operation_sha256,
  registry_policy,
  now_ms,
}) => {
  if (
    registry_policy !== WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST
    || !isSha256(expected_canonical_operation_sha256)
    || !Number.isFinite(now_ms)
    || now_ms < 0
  ) return blocked(WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID);

  let registryIdentity;
  let paths;
  let initialPreclaim;
  let initialGuard;
  try {
    registryIdentity = await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: registry_root,
      policy: registry_policy,
    });
    paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: registryIdentity.path,
      expectedCanonicalOperationSha256: expected_canonical_operation_sha256,
      namespace: WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
    });
    if (
      authoritative_preclaim_record_path !== paths.preclaim
      || dirname(authoritative_preclaim_record_path) !== registryIdentity.path
    ) return blocked(WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID);
    const evidence = await inspectWelcomeAudioOneShotStoreEvidence({ paths, registryIdentity });
    if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.REPLAYED,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.PREEXISTING_CLAIM],
        }),
      };
    }
    if (
      evidence
      && evidence !== WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY_PARTIAL
    ) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS],
        }),
      };
    }
    initialPreclaim = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.preclaim,
      registryIdentity,
    });
    initialGuard = validatePreclaim({
      snapshot: initialPreclaim.snapshot,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: now_ms,
    });
  } catch (error) {
    const blocker = error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_CHANGED
      ? WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
      : error?.message === WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID
        ? WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
      : error?.message === WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
        ? WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
        : WELCOME_AUDIO_CLAIM_BLOCKER.REGISTRY_INVALID;
    return blocked(blocker);
  }

  let mutexIdentity = null;
  try {
    mutexIdentity = await acquireWelcomeAudioOneShotStoreMutex({ paths, registryIdentity });
    if (!mutexIdentity) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.BUSY,
          preclaimGuardDecision: initialGuard.decision,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.SERIALIZATION_BUSY],
        }),
      };
    }
    const evidence = await inspectWelcomeAudioOneShotStoreEvidence({ paths, registryIdentity });
    if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.REPLAYED,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.PREEXISTING_CLAIM],
        }),
      };
    }
    if (evidence) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS],
        }),
      };
    }
    const lockedPreclaim = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.preclaim,
      registryIdentity,
    });
    try {
      assertSameWelcomeAudioOneShotRecord(initialPreclaim, lockedPreclaim);
    } catch {
      return blocked(WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_CHANGED, initialGuard.decision);
    }
    validatePreclaim({
      snapshot: lockedPreclaim.snapshot,
      expectedDigest: expected_canonical_operation_sha256,
      nowMs: now_ms,
    });
    const lineage = Object.freeze({
      claim_owner_id: opaqueId('claim_owner'),
      claim_token_id: opaqueId('claim_token'),
      registry_revision: 1,
      attempt_id: opaqueId('attempt'),
    });
    const ready = deriveReady({ snapshot: lockedPreclaim.snapshot, nowMs: now_ms, lineage });
    const readyGuard = validateReady({
      snapshot: ready,
      expectedDigest: expected_canonical_operation_sha256,
      lineage,
      nowMs: now_ms,
    });
    await writeWelcomeAudioOneShotExclusiveDurable({
      filePath: paths.ready,
      value: ready,
      registryIdentity,
      existsReason: WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING,
    });
    const published = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.ready,
      registryIdentity,
    });
    validateReady({
      snapshot: published.snapshot,
      expectedDigest: expected_canonical_operation_sha256,
      lineage,
      nowMs: now_ms,
    });
    const capability = createPrivateCapability({
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256,
      lineage,
      ready_digest: published.digest,
      ready_metadata: published.metadata,
      registry_policy,
    });
    return {
      private_claim_capability: capability,
      redacted_receipt: buildReceipt({
        decision: WELCOME_AUDIO_CLAIM_DECISION.CREATED,
        preclaimGuardDecision: initialGuard.decision,
        readyGuardDecision: readyGuard.decision,
      }),
    };
  } catch (error) {
    const evidence = await inspectWelcomeAudioOneShotStoreEvidence({
      paths,
      registryIdentity,
    }).catch(() => WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN);
    if (evidence === WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.REPLAYED,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.PREEXISTING_CLAIM],
        }),
      };
    }
    if (evidence) {
      return {
        private_claim_capability: null,
        redacted_receipt: buildReceipt({
          decision: WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL,
          blockerCodes: [WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS],
        }),
      };
    }
    const blocker = error?.message === WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
      ? WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID
      : error?.message === WELCOME_AUDIO_CLAIM_BLOCKER.READY_INVALID
        ? WELCOME_AUDIO_CLAIM_BLOCKER.READY_INVALID
        : WELCOME_AUDIO_CLAIM_BLOCKER.REGISTRY_INVALID;
    return blocked(blocker, initialGuard?.decision ?? null);
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

export {
  WELCOME_AUDIO_CLAIM_BLOCKER,
  WELCOME_AUDIO_CLAIM_DECISION,
  WELCOME_AUDIO_CLAIM_EXECUTION_MODE,
  WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS,
  WELCOME_AUDIO_CLAIM_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_CLAIM_WRITER_CONTRACT_VERSION,
  WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS,
  WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS,
  consumeWelcomeAudioPrivateClaimCapability,
  issueWelcomeAudioClaim,
  validateWelcomeAudioClaimReceipt,
  verifyWelcomeAudioPrivateClaimCapabilityBinding,
  verifyWelcomeAudioPrivateClaimReadyBinding,
};
