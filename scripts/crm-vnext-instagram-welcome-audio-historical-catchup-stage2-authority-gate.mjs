import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_GATE_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_historical_catchup_stage2_authority_gate_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SCHEMA_VERSION =
  'crm_core_historical_catchup_stage2_private_authority_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_ID =
  'crm_core_historical_catchup_productive_stage2_authority_gate_repo_only_v1_20260722';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_CONTRACT_VERSION =
  'v1_preimplementation_chief_architect_review_no_live';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT =
  'crm-core/historical-catchup-stage2-authority-runtime/v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS =
  'crmCoreHistoricalCatchupStage2AuthorityRuntimeV1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND =
  'crm_core_historical_catchup_stage2_authority_runtime_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH =
  'codex/crm-core-reentry';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SOURCE_BACKEND =
  'codex_in_app_browser_semantic_read_only_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SELECTION_POLICY =
  'historical_catchup_pilot_v1';
const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_COMMAND =
  'stage_2_qualification_only';

const WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_historical_catchup_stage2_authority_input_invalid',
  RUNTIME_INVALID: 'blocked_historical_catchup_stage2_authority_runtime_invalid',
  CROSS_MODE_RUNTIME:
    'blocked_historical_catchup_stage2_authority_cross_mode_runtime',
  CONSUME_FAILED: 'blocked_historical_catchup_stage2_authority_consume_failed',
  AUTHORITY_INVALID: 'blocked_historical_catchup_stage2_authority_invalid',
});

const AUTHORITY_FIELDS = Object.freeze([
  'authority_schema_version',
  'mission_id',
  'contract_version',
  'approval_instance_sha256',
  'approved_central_commit',
  'observed_central_commit',
  'observed_upstream_commit',
  'target_branch',
  'observed_branch',
  'upstream_present',
  'repository_clean',
  'mission_contract_sha256',
  'next_action_sha256',
  'approved_owner_account_anchor_sha256',
  'source_runtime_owner_account_anchor_sha256',
  'source_runtime_account_binding_attested',
  'source_backend',
  'selection_policy',
  'command',
  'issued_at_ms',
  'expires_at_ms',
  'max_rows_total',
  'exact_distinct_traversals',
  'max_threads',
  'max_seen_transitions',
  'capabilities_issued',
  'stage_3_authorized',
  'send_authorized',
  'mission_ledger_claimed_once',
  'prior_mission_ledger_claims',
]);

const RESULT_FIELDS = Object.freeze([
  'authority_recognized',
  'authority_consumed',
  'authority_valid',
  'private_authority',
  'blocker_code',
]);

const RUNTIME_FACADE_FIELDS = Object.freeze([
  'brand',
  'consume_historical_catchup_stage2_authority_once',
]);

const CONSUME_SCENARIO_FOR_TEST = Object.freeze({
  EXACT: 'exact',
  THROWS_AFTER_CLAIM: 'throws_after_claim',
  MALFORMED_AFTER_CLAIM: 'malformed_after_claim',
});

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_COMMIT = /^[a-f0-9]{40}$/u;
const PRODUCTIVE_READ_NOW_MS = Date.now.bind(Date);
const RUNTIME_SYMBOL = Symbol.for(
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT,
);
const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
const MISSION_CONTRACT_PATH = join(
  MODULE_ROOT,
  '..',
  'docs',
  'crm-vnext',
  'missions',
  'crm-core-historical-catchup-productive-stage2-authority-v1.md',
);
const NEXT_ACTION_PATH = join(
  MODULE_ROOT,
  '..',
  'docs',
  'crm-vnext',
  'crm-core-next-action.md',
);

let installedTestRuntimeBinding = null;
const productionRuntimeIdentities = new WeakSet();
const testRuntimeIdentities = new WeakSet();
const validatedAuthorityIdentities = new WeakSet();
const claimedTestApprovalNonces = new Set();

const isPlainDataObject = (value) => {
  try {
    return value !== null
      && typeof value === 'object'
      && !Array.isArray(value)
      && !nodeUtilTypes.isProxy(value)
      && Object.getPrototypeOf(value) === Object.prototype;
  } catch {
    return false;
  }
};

const exactDataObject = (value, fields) => {
  try {
    if (!isPlainDataObject(value)) return null;
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

const safeNowMs = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const sha256File = (path) => createHash('sha256')
  .update(readFileSync(path))
  .digest('hex');

const currentTrackedDigests = () => {
  try {
    return Object.freeze({
      mission_contract_sha256: sha256File(MISSION_CONTRACT_PATH),
      next_action_sha256: sha256File(NEXT_ACTION_PATH),
    });
  } catch {
    return null;
  }
};

const captureExactRuntimeFacade = (runtime) => {
  try {
    if (
      runtime === null
      || typeof runtime !== 'object'
      || Array.isArray(runtime)
      || nodeUtilTypes.isProxy(runtime)
      || Object.getPrototypeOf(runtime) !== Object.prototype
      || Object.isFrozen(runtime) !== true
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(runtime);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== RUNTIME_FACADE_FIELDS.length
      || keys.some((key) => typeof key !== 'string' || !RUNTIME_FACADE_FIELDS.includes(key))
      || RUNTIME_FACADE_FIELDS.some((field) => {
        const descriptor = descriptors[field];
        return !descriptor
          || !Object.hasOwn(descriptor, 'value')
          || descriptor.get !== undefined
          || descriptor.set !== undefined
          || descriptor.writable !== false
          || descriptor.enumerable !== false
          || descriptor.configurable !== false;
      })
      || descriptors.brand.value
        !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND
      || typeof descriptors.consume_historical_catchup_stage2_authority_once.value
        !== 'function'
      || nodeUtilTypes.isProxy(
        descriptors.consume_historical_catchup_stage2_authority_once.value,
      )
    ) return null;
    return Object.freeze({
      runtime,
      consume: descriptors.consume_historical_catchup_stage2_authority_once.value
        .bind(runtime),
    });
  } catch {
    return null;
  }
};

const captureExactInstalledProductionRuntimeBinding = () => {
  try {
    const slotDescriptor = Object.getOwnPropertyDescriptor(globalThis, RUNTIME_SYMBOL);
    const aliasDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS,
    );
    if (
      !slotDescriptor
      || !aliasDescriptor
      || !Object.hasOwn(slotDescriptor, 'value')
      || !Object.hasOwn(aliasDescriptor, 'value')
      || slotDescriptor.get !== undefined
      || slotDescriptor.set !== undefined
      || aliasDescriptor.get !== undefined
      || aliasDescriptor.set !== undefined
      || slotDescriptor.writable !== false
      || slotDescriptor.enumerable !== false
      || slotDescriptor.configurable !== false
      || aliasDescriptor.writable !== false
      || aliasDescriptor.enumerable !== false
      || aliasDescriptor.configurable !== false
      || slotDescriptor.value !== aliasDescriptor.value
    ) return null;
    return captureExactRuntimeFacade(slotDescriptor.value);
  } catch {
    return null;
  }
};

// The productive capability is captured exactly once during module
// initialization. The environment therefore has to install it before import;
// a later structurally identical object never becomes productive authority.
const initiallyInstalledProductionRuntimeBinding =
  captureExactInstalledProductionRuntimeBinding();
if (initiallyInstalledProductionRuntimeBinding) {
  productionRuntimeIdentities.add(initiallyInstalledProductionRuntimeBinding.runtime);
}

const validatePrivateAuthorityStatic = (candidate) => {
  const authority = exactDataObject(candidate, AUTHORITY_FIELDS);
  const digests = currentTrackedDigests();
  if (
    !authority
    || !digests
    || authority.authority_schema_version
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SCHEMA_VERSION
    || authority.mission_id
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_ID
    || authority.contract_version
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_CONTRACT_VERSION
    || !SHA256.test(authority.approval_instance_sha256)
    || !GIT_COMMIT.test(authority.approved_central_commit)
    || authority.approved_central_commit !== authority.observed_central_commit
    || authority.approved_central_commit !== authority.observed_upstream_commit
    || authority.target_branch
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH
    || authority.observed_branch
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH
    || authority.upstream_present !== true
    || authority.repository_clean !== true
    || !SHA256.test(authority.mission_contract_sha256)
    || authority.mission_contract_sha256 !== digests.mission_contract_sha256
    || !SHA256.test(authority.next_action_sha256)
    || authority.next_action_sha256 !== digests.next_action_sha256
    || !SHA256.test(authority.approved_owner_account_anchor_sha256)
    || authority.approved_owner_account_anchor_sha256
      !== authority.source_runtime_owner_account_anchor_sha256
    || authority.source_runtime_account_binding_attested !== true
    || authority.source_backend
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SOURCE_BACKEND
    || authority.selection_policy
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SELECTION_POLICY
    || authority.command !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_COMMAND
    || !safeNowMs(authority.issued_at_ms)
    || !safeNowMs(authority.expires_at_ms)
    || authority.expires_at_ms - authority.issued_at_ms
      !== WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TTL_MS
    || authority.max_rows_total !== 8
    || authority.exact_distinct_traversals !== 2
    || authority.max_threads !== 0
    || authority.max_seen_transitions !== 0
    || authority.capabilities_issued !== 0
    || authority.stage_3_authorized !== false
    || authority.send_authorized !== false
    || authority.mission_ledger_claimed_once !== true
    || authority.prior_mission_ledger_claims !== 0
  ) return null;
  return authority;
};

const validatePrivateAuthorityInternal = (candidate, nowMs) => {
  if (!safeNowMs(nowMs)) return null;
  const authority = validatePrivateAuthorityStatic(candidate);
  if (
    !authority
    || authority.issued_at_ms > nowMs
    || nowMs >= authority.expires_at_ms
  ) return null;
  return authority;
};

const buildResult = ({
  recognized = false,
  consumed = false,
  authority = null,
  blocker = null,
}) => Object.freeze({
  authority_recognized: recognized,
  authority_consumed: consumed,
  authority_valid: authority !== null,
  private_authority: authority,
  blocker_code: blocker,
});

const consumeInternal = async ({ readNowMs, runtimeBinding, family }) => {
  if (!runtimeBinding) {
    return buildResult({
      blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.RUNTIME_INVALID,
    });
  }
  const crossMode = family === 'production'
    ? testRuntimeIdentities.has(runtimeBinding.runtime)
    : productionRuntimeIdentities.has(runtimeBinding.runtime);

  let candidate;
  try {
    candidate = await runtimeBinding.consume();
  } catch {
    return buildResult({
      recognized: true,
      consumed: true,
      blocker: crossMode
        ? WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CROSS_MODE_RUNTIME
        : WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CONSUME_FAILED,
    });
  }
  if (crossMode) {
    return buildResult({
      recognized: true,
      consumed: true,
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CROSS_MODE_RUNTIME,
    });
  }
  let nowMs;
  try {
    nowMs = readNowMs();
  } catch {
    nowMs = null;
  }
  const authority = validatePrivateAuthorityInternal(candidate, nowMs);
  if (!authority) {
    return buildResult({
      recognized: true,
      consumed: true,
      blocker:
        WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
    });
  }
  validatedAuthorityIdentities.add(authority);
  return buildResult({ recognized: true, consumed: true, authority });
};

const captureProductiveRuntimeForConsume = () => {
  if (initiallyInstalledProductionRuntimeBinding) {
    return initiallyInstalledProductionRuntimeBinding;
  }
  // A known ForTest facade is still allowed to cross this boundary so the
  // gate can consume/burn it and return the explicit cross-mode blocker. No
  // other post-import binding is accepted or registered.
  const current = captureExactInstalledProductionRuntimeBinding();
  return current && testRuntimeIdentities.has(current.runtime) ? current : null;
};

const consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce = async (...args) => {
  if (args.length !== 0) {
    return buildResult({
      blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.INPUT_INVALID,
    });
  }
  return consumeInternal({
    readNowMs: PRODUCTIVE_READ_NOW_MS,
    runtimeBinding: captureProductiveRuntimeForConsume(),
    family: 'production',
  });
};

const consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['now_ms']);
  if (!input || !safeNowMs(input.now_ms)) {
    return buildResult({
      blocker: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.INPUT_INVALID,
    });
  }
  return consumeInternal({
    readNowMs: () => input.now_ms,
    runtimeBinding: installedTestRuntimeBinding,
    family: 'test',
  });
};

const buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest = (
  overrides = {},
  { now_ms: nowMs = 1_000_000 } = {},
) => {
  if (!isPlainDataObject(overrides) || !safeNowMs(nowMs)) return null;
  const overrideKeys = Reflect.ownKeys(overrides);
  if (overrideKeys.some((key) => typeof key !== 'string' || !AUTHORITY_FIELDS.includes(key))) {
    return null;
  }
  const digests = currentTrackedDigests();
  if (!digests) return null;
  const commit = 'b'.repeat(40);
  return Object.freeze({
    authority_schema_version:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SCHEMA_VERSION,
    mission_id: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_ID,
    contract_version:
      WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_CONTRACT_VERSION,
    approval_instance_sha256: createHash('sha256')
      .update(`synthetic-stage2-approval:${nowMs}`)
      .digest('hex'),
    approved_central_commit: commit,
    observed_central_commit: commit,
    observed_upstream_commit: commit,
    target_branch: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH,
    observed_branch: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH,
    upstream_present: true,
    repository_clean: true,
    mission_contract_sha256: digests.mission_contract_sha256,
    next_action_sha256: digests.next_action_sha256,
    approved_owner_account_anchor_sha256: 'c'.repeat(64),
    source_runtime_owner_account_anchor_sha256: 'c'.repeat(64),
    source_runtime_account_binding_attested: true,
    source_backend: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SOURCE_BACKEND,
    selection_policy: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SELECTION_POLICY,
    command: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_COMMAND,
    issued_at_ms: nowMs,
    expires_at_ms: nowMs + WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TTL_MS,
    max_rows_total: 8,
    exact_distinct_traversals: 2,
    max_threads: 0,
    max_seen_transitions: 0,
    capabilities_issued: 0,
    stage_3_authorized: false,
    send_authorized: false,
    mission_ledger_claimed_once: true,
    prior_mission_ledger_claims: 0,
    ...overrides,
  });
};

const createTestFacade = ({ privateAuthority, consumeScenario }) => {
  const candidateNonce = isPlainDataObject(privateAuthority)
    ? Object.getOwnPropertyDescriptor(privateAuthority, 'approval_instance_sha256')?.value
    : null;
  const approvalNonce = typeof candidateNonce === 'string' && SHA256.test(candidateNonce)
    ? candidateNonce
    : createHash('sha256')
      .update(`synthetic-invalid-authority:${String(candidateNonce)}`)
      .digest('hex');
  const state = {
    method_call_count: 0,
    mission_ledger_claim_count: 0,
    prior_mission_ledger_claims: 0,
    duplicate_claim_blocked_count: 0,
    successful_return_count: 0,
    consumed: false,
  };
  const consume = async (...args) => {
    state.method_call_count += 1;
    if (args.length !== 0 || state.consumed) return null;
    state.consumed = true;
    if (claimedTestApprovalNonces.has(approvalNonce)) {
      state.prior_mission_ledger_claims = 1;
      state.duplicate_claim_blocked_count += 1;
      return null;
    }
    claimedTestApprovalNonces.add(approvalNonce);
    state.mission_ledger_claim_count += 1;
    if (consumeScenario === CONSUME_SCENARIO_FOR_TEST.THROWS_AFTER_CLAIM) {
      throw new TypeError('synthetic_authority_consume_failed');
    }
    state.successful_return_count += 1;
    if (consumeScenario === CONSUME_SCENARIO_FOR_TEST.MALFORMED_AFTER_CLAIM) {
      return Object.freeze({ malformed: true });
    }
    return privateAuthority;
  };
  const facade = {};
  Object.defineProperties(facade, {
    brand: {
      value: WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    consume_historical_catchup_stage2_authority_once: {
      value: consume,
      writable: false,
      enumerable: false,
      configurable: false,
    },
  });
  Object.freeze(facade);
  return Object.freeze({ facade, state });
};

const installWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest = (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['private_authority', 'consume_scenario']);
  if (
    !input
    || installedTestRuntimeBinding !== null
    || !Object.values(CONSUME_SCENARIO_FOR_TEST).includes(input.consume_scenario)
  ) return false;
  const testRuntime = createTestFacade({
    privateAuthority: input.private_authority,
    consumeScenario: input.consume_scenario,
  });
  const binding = captureExactRuntimeFacade(testRuntime.facade);
  if (!binding) return false;
  testRuntimeIdentities.add(testRuntime.facade);
  installedTestRuntimeBinding = Object.freeze({
    ...binding,
    state: testRuntime.state,
  });
  return true;
};

const resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest = () => {
  if (installedTestRuntimeBinding === null) return false;
  installedTestRuntimeBinding = null;
  return true;
};

const resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest = () => {
  if (claimedTestApprovalNonces.size === 0) return false;
  claimedTestApprovalNonces.clear();
  return true;
};

const inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest = () => {
  if (!installedTestRuntimeBinding) return Object.freeze({
    installed: false,
    method_call_count: 0,
    mission_ledger_claim_count: 0,
    prior_mission_ledger_claims: 0,
    duplicate_claim_blocked_count: 0,
    successful_return_count: 0,
  });
  return Object.freeze({
    installed: true,
    method_call_count: installedTestRuntimeBinding.state.method_call_count,
    mission_ledger_claim_count: installedTestRuntimeBinding.state.mission_ledger_claim_count,
    prior_mission_ledger_claims:
      installedTestRuntimeBinding.state.prior_mission_ledger_claims,
    duplicate_claim_blocked_count:
      installedTestRuntimeBinding.state.duplicate_claim_blocked_count,
    successful_return_count: installedTestRuntimeBinding.state.successful_return_count,
  });
};

const inspectWelcomeAudioHistoricalCatchupStage2AuthorityRuntimeForTest = () => (
  installedTestRuntimeBinding?.runtime ?? null
);

const validateWelcomeAudioHistoricalCatchupStage2AuthorityResult = (value) => {
  const result = exactDataObject(value, RESULT_FIELDS);
  if (
    !result
    || typeof result.authority_recognized !== 'boolean'
    || typeof result.authority_consumed !== 'boolean'
    || typeof result.authority_valid !== 'boolean'
    || (result.blocker_code !== null
      && !Object.values(
        WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER,
      ).includes(result.blocker_code))
  ) return Object.freeze({ ok: false });

  if (result.authority_valid) {
    if (
      result.authority_recognized !== true
      || result.authority_consumed !== true
      || result.blocker_code !== null
      || !validatedAuthorityIdentities.has(result.private_authority)
      || validatePrivateAuthorityStatic(result.private_authority) === null
    ) return Object.freeze({ ok: false });
    return Object.freeze({ ok: true });
  }

  if (result.private_authority !== null || result.blocker_code === null) {
    return Object.freeze({ ok: false });
  }
  const unreachable = result.authority_recognized === false
    && result.authority_consumed === false
    ? ![
        WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.INPUT_INVALID,
        WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.RUNTIME_INVALID,
      ].includes(result.blocker_code)
    : result.authority_recognized === true && result.authority_consumed === true
      ? ![
          WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CROSS_MODE_RUNTIME,
          WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.CONSUME_FAILED,
          WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER.AUTHORITY_INVALID,
        ].includes(result.blocker_code)
      : true;
  if (unreachable) return Object.freeze({ ok: false });
  return Object.freeze({ ok: true });
};

export {
  AUTHORITY_FIELDS as WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_FIELDS,
  CONSUME_SCENARIO_FOR_TEST as WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST,
  RESULT_FIELDS as WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RESULT_FIELDS,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_BLOCKER,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_COMMAND,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_GATE_CONTRACT_VERSION,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_CONTRACT_VERSION,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_MISSION_ID,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_ALIAS,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_BRAND,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_RUNTIME_SLOT,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SELECTION_POLICY,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_SOURCE_BACKEND,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TARGET_BRANCH,
  WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_TTL_MS,
  buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest,
  consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnce,
  consumeWelcomeAudioHistoricalCatchupStage2AuthorityOnceForTest,
  inspectWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest,
  inspectWelcomeAudioHistoricalCatchupStage2AuthorityRuntimeForTest,
  installWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest,
  resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest,
  resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest,
  validateWelcomeAudioHistoricalCatchupStage2AuthorityResult,
};
