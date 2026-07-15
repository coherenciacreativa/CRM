import { execFile } from "node:child_process";
import { watch } from "node:fs";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_ADAPTER_VERSION,
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  buildWelcomeAudioCanonicalOperationDigest,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";
import {
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  acquireWelcomeAudioOneShotStoreMutex,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  releaseWelcomeAudioOneShotStoreMutex,
} from "../scripts/crm-vnext-instagram-welcome-audio-one-shot-store.mjs";
import {
  WELCOME_AUDIO_CLAIM_DECISION,
  validateWelcomeAudioClaimReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-claim-writer.mjs";
import {
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
  WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_TIMEOUT_MS,
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  validateWelcomeAudioSafariOperationalReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs";
import {
  WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS,
  WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS,
  consumeWelcomeAudioSafariOperationAuthority,
  createWelcomeAudioSafariOperationPort,
  getWelcomeAudioSafariDeferredActuatorRendezvousStatus,
  resolveWelcomeAudioSafariDeferredActuatorRendezvous,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-operation-port.mjs";
import {
  WELCOME_AUDIO_OPERATION_SESSION_BLOCKER,
  WELCOME_AUDIO_OPERATION_SESSION_DECISION,
  WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_FIELDS,
  runWelcomeAudioOperationSessionOnce,
  validateWelcomeAudioOperationSessionReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-session.mjs";

const execFileAsync = promisify(execFile);
const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const SOURCE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const SOURCE_SHA = "1".repeat(64);
const PROFILE_SHA = "2".repeat(64);
const CANDIDATE_SHA = "3".repeat(64);
const THREAD_SHA = "4".repeat(64);
const OWNER_SHA = "5".repeat(64);
const ASSET_SHA = "6".repeat(64);
const OPERATION_ID = "synthetic_async_session_001";
const APPROVAL_PACKET_ID = "synthetic_async_approval_001";
const ASSET_ID = "synthetic_async_asset_001";
const DEFAULT_MISSION_ID = "synthetic_async_mission_001";
const PREVIEW_OBSERVED_AT = "2026-07-14T15:58:40.000Z";
const SESSION_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-operation-session.mjs",
);
const PORT_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-safari-operation-port.mjs",
);
const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const bindCanonicalOperationDigest = (input: Record<string, any>) => {
  const digest = buildWelcomeAudioCanonicalOperationDigest(input);
  input.canonical_operation_sha256 = digest;
  for (const section of [
    "operation",
    "approval",
    "context",
    "effect_claim",
    "execution",
    "confirmation",
  ]) input[section].canonical_operation_sha256 = digest;
  return input;
};

const preclaimOperation = ({ missionId = DEFAULT_MISSION_ID } = {}) =>
  bindCanonicalOperationDigest({
    adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
    contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
    canonical_operation_sha256: "0".repeat(64),
    operation: {
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      source_event_anchor_sha256: SOURCE_SHA,
      profile_anchor_sha256: PROFILE_SHA,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: ASSET_SHA,
      expected_send_count: 1,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: "0".repeat(64),
    },
    approval: {
      status: "approved_exact_single_send",
      checked_at: "2026-07-14T15:56:00.000Z",
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      source_event_anchor_sha256: SOURCE_SHA,
      profile_anchor_sha256: PROFILE_SHA,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: ASSET_SHA,
      source_recency_max_age_ms: SOURCE_MAX_AGE_MS,
      expected_send_count: 1,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: "0".repeat(64),
    },
    execution_surface: {
      surface: WELCOME_AUDIO_SURFACE.STATUS,
      surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
      browser: WELCOME_AUDIO_SURFACE.BROWSER,
      browser_mode: WELCOME_AUDIO_SURFACE.MODE,
      isolation: WELCOME_AUDIO_SURFACE.ISOLATION,
      upload_route: WELCOME_AUDIO_SURFACE.UPLOAD_ROUTE,
      private_browsing: false,
      chrome_upload_attempted: false,
      in_app_browser_upload_attempted: false,
      observed_at: "2026-07-14T15:58:10.000Z",
    },
    follower_evidence: {
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT,
      observed_at: "2026-07-14T14:00:00.000Z",
      time_bucket: "today",
      source_recency_max_age_ms: SOURCE_MAX_AGE_MS,
      source_event_anchor_sha256: SOURCE_SHA,
    },
    binding: {
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT,
      source_to_profile: "exact",
      profile_to_thread: "exact",
      follows_owner: "confirmed",
      ambiguity: "clear",
      source_event_anchor_sha256: SOURCE_SHA,
      profile_anchor_sha256: PROFILE_SHA,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      observed_at: "2026-07-14T15:58:20.000Z",
    },
    eligibility: {
      business_eligibility: "eligible_confirmed_recent_follower",
      audio_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      composer_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      attachment_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      text_fallback: "forbidden",
      observed_at: "2026-07-14T15:58:30.000Z",
    },
    asset: {
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: ASSET_SHA,
      asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT,
      preview_status: "verified_on_exact_bound_thread",
      preview_audio_asset_id: ASSET_ID,
      preview_audio_asset_sha256: ASSET_SHA,
      preview_thread_anchor_sha256: THREAD_SHA,
      preview_observed_at: PREVIEW_OBSERVED_AT,
    },
    context: {
      status: "fresh_exact_central_mission_context",
      checked_at: "2026-07-14T15:57:00.000Z",
      central_repo_head: "a".repeat(40),
      expected_central_repo_head: "a".repeat(40),
      mission_id: missionId,
      expected_mission_id: missionId,
      mission_status: "active",
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      canonical_operation_sha256: "0".repeat(64),
    },
    dedupe: {
      status: "clear_no_prior_welcome_or_attempt",
      already_welcomed_status: "not_found",
      send_history_status: "no_prior_attempt",
      checked_at: "2026-07-14T15:58:00.000Z",
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_sha256: ASSET_SHA,
    },
    effect_claim: {
      status: WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED,
      claim_result: WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED,
      claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED,
      atomic: false,
      permanent: false,
      claimed_at: null,
      claim_owner_id: null,
      claim_token_id: null,
      registry_revision: null,
      attempt_id: null,
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: ASSET_SHA,
      canonical_operation_sha256: "0".repeat(64),
    },
    execution: {
      attempt_budget: 1,
      send_attempt_count: 0,
      attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED,
      send_claim: WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
      retry_requested: false,
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      canonical_operation_sha256: "0".repeat(64),
      claim_owner_id: null,
      claim_token_id: null,
      claim_registry_revision: null,
      attempt_id: null,
      claim_token_consumed_at: null,
      attempted_at: null,
    },
    confirmation: {
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: missionId,
      canonical_operation_sha256: "0".repeat(64),
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      approved_audio_asset_sha256: ASSET_SHA,
      claim_owner_id: null,
      claim_token_id: null,
      claim_registry_revision: null,
      attempt_id: null,
      bound_to_current_operation: false,
      checked_at: null,
    },
  });

const preclaimOperationFreshForDelayedConfirmation = () => {
  const operation = preclaimOperation();
  const attemptedAt = new Date(NOW_MS).toISOString();
  operation.approval.checked_at = attemptedAt;
  operation.execution_surface.observed_at = attemptedAt;
  operation.follower_evidence.observed_at = attemptedAt;
  operation.binding.observed_at = attemptedAt;
  operation.eligibility.observed_at = attemptedAt;
  operation.asset.preview_observed_at = attemptedAt;
  operation.context.checked_at = attemptedAt;
  operation.dedupe.checked_at = attemptedAt;
  return bindCanonicalOperationDigest(operation);
};

const bindingFor = (operation: Record<string, any>) => ({
  expected_canonical_operation_sha256: operation.canonical_operation_sha256,
  thread_anchor_sha256: THREAD_SHA,
  approved_audio_asset_sha256: ASSET_SHA,
  session_revision: 1,
  preview_observed_at: operation.asset.preview_observed_at,
});

const bindingThatDriftsAfterRevisionReads = (
  operation: Record<string, any>,
  stableRevisionReads: number,
) => {
  const binding = bindingFor(operation);
  let revisionReads = 0;
  Object.defineProperty(binding, "session_revision", {
    enumerable: true,
    configurable: false,
    get: () => {
      revisionReads += 1;
      return revisionReads <= stableRevisionReads ? 1 : 2;
    },
  });
  return binding;
};

const makeRoot = async () => {
  const unresolved = await mkdtemp(join(tmpdir(), "crm-core-welcome-session-"));
  await chmod(unresolved, 0o700);
  cleanupPaths.push(unresolved);
  return realpath(unresolved);
};

const preparedPort = (
  operation: Record<string, any>,
  deterministicScenario = WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
) => createWelcomeAudioSafariOperationPort({
  execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  deterministic_scenario: deterministicScenario,
  binding: bindingFor(operation),
});

const runPrepared = async ({
  root,
  operation,
  deterministicScenario = WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
  prepared = preparedPort(operation, deterministicScenario),
  currentBinding = bindingFor(operation),
}: {
  root: string;
  operation: Record<string, any>;
  deterministicScenario?: string;
  prepared?: ReturnType<typeof preparedPort>;
  currentBinding?: Record<string, any>;
}) => runWelcomeAudioOperationSessionOnce({
  registry_root: root,
  registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
  canonical_operation: operation,
  current_binding: currentBinding,
  prepared_session_authority: prepared.prepared_session_authority,
  branded_safari_actuator_port: prepared.branded_safari_actuator_port,
  now_ms: NOW_MS,
});

const deferredActuatorResult = (overrides: Record<string, any> = {}) => Object.freeze({
  result_schema_version: WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
  bound_to_current_operation: true,
  effect_boundary_entered: true,
  send_control_actuation_count: 1,
  attempted_at: new Date(NOW_MS).toISOString(),
  confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
  confirmation_checked_at: new Date(NOW_MS + 1000).toISOString(),
  ...overrides,
});

const rendezvousStatus = (prepared: ReturnType<typeof preparedPort>) =>
  getWelcomeAudioSafariDeferredActuatorRendezvousStatus({
    deferred_actuator_rendezvous_authority:
      prepared.deferred_actuator_rendezvous_authority,
    branded_safari_actuator_port: prepared.branded_safari_actuator_port,
  });

const resolvePreparedRendezvous = ({
  prepared,
  operation,
  currentBinding = bindingFor(operation),
  actuatorResult = deferredActuatorResult(),
}: {
  prepared: ReturnType<typeof preparedPort>;
  operation: Record<string, any>;
  currentBinding?: Record<string, any>;
  actuatorResult?: Record<string, any>;
}) => resolveWelcomeAudioSafariDeferredActuatorRendezvous({
  deferred_actuator_rendezvous_authority:
    prepared.deferred_actuator_rendezvous_authority,
  branded_safari_actuator_port: prepared.branded_safari_actuator_port,
  current_binding: currentBinding,
  actuator_result: actuatorResult,
});

const waitForRendezvousStatus = async (
  prepared: ReturnType<typeof preparedPort>,
  expectedStatus: string,
) => {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const status = rendezvousStatus(prepared);
    if (status === expectedStatus) return status;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2));
  }
  throw new Error("rendezvous_status_timeout");
};

describe("Instagram welcome-audio deterministic operation session bridge", () => {
  test("returns the exact genuine executor-branded port plus a frozen opaque one-use authority", () => {
    const operation = preclaimOperation();
    const prepared = preparedPort(operation);

    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.keys(prepared).sort()).toEqual([
      "branded_safari_actuator_port",
      "deferred_actuator_rendezvous_authority",
      "prepared_session_authority",
    ]);
    expect(prepared.branded_safari_actuator_port).toEqual({
      surface: WELCOME_AUDIO_SURFACE.STATUS,
      surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
    });
    expect(Object.isFrozen(prepared.branded_safari_actuator_port)).toBe(true);
    expect(Object.isFrozen(prepared.prepared_session_authority)).toBe(true);
    expect(Object.isFrozen(prepared.deferred_actuator_rendezvous_authority)).toBe(true);
    expect(() => JSON.stringify(prepared.prepared_session_authority))
      .toThrow("prepared_session_authority_not_serializable");
    expect(() => JSON.stringify(prepared.deferred_actuator_rendezvous_authority))
      .toThrow("deferred_actuator_rendezvous_authority_not_serializable");
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.FRESH);
    expect("invoke" in prepared.branded_safari_actuator_port).toBe(false);
    expect("driver" in prepared.branded_safari_actuator_port).toBe(false);
    expect("callback" in prepared.branded_safari_actuator_port).toBe(false);
    expect("browser_handle" in prepared.branded_safari_actuator_port).toBe(false);
    expect("payload" in prepared.branded_safari_actuator_port).toBe(false);
    expect(() => createWelcomeAudioSafariOperationPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
      binding: bindingFor(operation),
      driver: () => undefined,
    } as any)).toThrow(WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID);
  });

  test("publishes PRECLAIM, delegates READY/PENDING/capability/actuation/terminal, and emits only redacted no-live receipts", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const session = await runPrepared({ root, operation });

    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: true,
      claim_receipt_present: true,
      operational_receipt_present: true,
      effect_boundary_entered: true,
      modeled_send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
      send_allowed: false,
      live_authority: false,
      blocker_codes: [],
    });
    expect(Object.keys(session.session_receipt).sort())
      .toEqual([...WELCOME_AUDIO_OPERATION_SESSION_RECEIPT_FIELDS].sort());
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(session.claim_receipt.decision).toBe(WELCOME_AUDIO_CLAIM_DECISION.CREATED);
    expect(validateWelcomeAudioClaimReceipt(session.claim_receipt))
      .toEqual({ ok: true, reason: null });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      terminal_record_present: true,
      pending_record_present: false,
      send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
    const entries = await readdir(root);
    expect(entries.filter((entry) => entry.startsWith("preclaim-")).length).toBe(1);
    expect(entries.filter((entry) => entry.startsWith("ready-")).length).toBe(1);
    expect(entries.filter((entry) => entry.startsWith("pending-")).length).toBe(0);
    expect(entries.filter((entry) => entry.startsWith("terminal-")).length).toBe(1);
  });

  test("arms only after durable PENDING and both authorities are consumed, then accepts one async resolution", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const sessionPromise = runPrepared({
      root,
      operation,
      prepared,
      deterministicScenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    });

    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );
    const entriesWhileArmed = await readdir(root);
    expect(entriesWhileArmed.filter((entry) => entry.startsWith("preclaim-"))).toHaveLength(1);
    expect(entriesWhileArmed.filter((entry) => entry.startsWith("ready-"))).toHaveLength(1);
    expect(entriesWhileArmed.filter((entry) => entry.startsWith("pending-"))).toHaveLength(1);
    expect(entriesWhileArmed.filter((entry) => entry.startsWith("terminal-"))).toHaveLength(0);
    expect(consumeWelcomeAudioSafariOperationAuthority({
      prepared_session_authority: prepared.prepared_session_authority,
      branded_safari_actuator_port: prepared.branded_safari_actuator_port,
    })).toBe(WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED);

    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED_NOW);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED);
    const session = await sessionPromise;

    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED);
    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: true,
      effect_boundary_entered: true,
      modeled_send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
      send_allowed: false,
      live_authority: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [],
    });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      terminal_record_present: true,
      pending_record_present: false,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("validates, binds, and stores one frozen data-only result snapshot without re-reading the caller object", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const sessionPromise = runPrepared({ root, operation, prepared });
    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );
    const mutableResult = { ...deferredActuatorResult() };

    expect(resolvePreparedRendezvous({
      prepared,
      operation,
      actuatorResult: mutableResult,
    })).toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED_NOW);
    mutableResult.bound_to_current_operation = false;
    mutableResult.send_control_actuation_count = 0;
    mutableResult.confirmation_marker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;

    const session = await sessionPromise;
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      confirmation_marker:
        WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
      blocker_codes: [],
    });
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED);
  });

  test("normalizes a fractional now_ms to the exact ISO invocation timestamp before rendezvous comparison", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const fractionalNowMs = NOW_MS + 0.75;
    const sessionPromise = runWelcomeAudioOperationSessionOnce({
      registry_root: root,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      canonical_operation: operation,
      current_binding: bindingFor(operation),
      prepared_session_authority: prepared.prepared_session_authority,
      branded_safari_actuator_port: prepared.branded_safari_actuator_port,
      now_ms: fractionalNowMs,
    });
    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );
    const attemptedAt = new Date(fractionalNowMs).toISOString();

    expect(resolvePreparedRendezvous({
      prepared,
      operation,
      actuatorResult: deferredActuatorResult({
        attempted_at: attemptedAt,
        confirmation_checked_at: new Date(Date.parse(attemptedAt) + 1000).toISOString(),
      }),
    })).toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED_NOW);
    const session = await sessionPromise;
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      blocker_codes: [],
    });
  });

  test("rejects forged and cross-port rendezvous authorities without changing either genuine authority", () => {
    const operation = preclaimOperation();
    const first = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const second = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    expect(resolveWelcomeAudioSafariDeferredActuatorRendezvous({
      deferred_actuator_rendezvous_authority: Object.freeze({ marker: Symbol() }),
      branded_safari_actuator_port: first.branded_safari_actuator_port,
      current_binding: bindingFor(operation),
      actuator_result: deferredActuatorResult(),
    })).toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID);
    expect(resolveWelcomeAudioSafariDeferredActuatorRendezvous({
      deferred_actuator_rendezvous_authority: first.deferred_actuator_rendezvous_authority,
      branded_safari_actuator_port: second.branded_safari_actuator_port,
      current_binding: bindingFor(operation),
      actuator_result: deferredActuatorResult(),
    })).toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID);
    expect(rendezvousStatus(first))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.FRESH);
    expect(rendezvousStatus(second))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.FRESH);
  });

  test("serializes concurrent rendezvous resolution and rejects every reuse", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const sessionPromise = runPrepared({ root, operation, prepared });
    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );

    const statuses = await Promise.all([
      Promise.resolve().then(() => resolvePreparedRendezvous({ prepared, operation })),
      Promise.resolve().then(() => resolvePreparedRendezvous({ prepared, operation })),
    ]);
    expect(statuses.sort()).toEqual([
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED_NOW,
    ].sort());
    const session = await sessionPromise;
    expect(session.session_receipt.modeled_send_control_actuation_count).toBe(1);
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED);
  });

  test("poisons an early resolution and later fails closed after PENDING with zero modeled actuation", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.EARLY);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.REJECTED);

    const session = await runPrepared({ root, operation, prepared });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      terminal_record_present: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID],
    });
    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      modeled_send_control_actuation_count: 0,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      send_allowed: false,
      live_authority: false,
    });
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED);
  });

  test.each([
    [
      "binding drift",
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.BINDING_DRIFT,
      (operation: Record<string, any>) => ({
        currentBinding: { ...bindingFor(operation), session_revision: 2 },
        actuatorResult: deferredActuatorResult(),
      }),
    ],
    [
      "missing result field",
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_INVALID,
      (operation: Record<string, any>) => {
        const { confirmation_checked_at: _removed, ...invalid } = deferredActuatorResult();
        return { currentBinding: bindingFor(operation), actuatorResult: invalid };
      },
    ],
    [
      "duplicate modeled actuation",
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_INVALID,
      (operation: Record<string, any>) => ({
        currentBinding: bindingFor(operation),
        actuatorResult: deferredActuatorResult({ send_control_actuation_count: 2 }),
      }),
    ],
    [
      "invocation timestamp mismatch",
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_MISMATCHED,
      (operation: Record<string, any>) => ({
        currentBinding: bindingFor(operation),
        actuatorResult: deferredActuatorResult({
          attempted_at: new Date(NOW_MS + 1).toISOString(),
        }),
      }),
    ],
  ])("records post-ARMED %s conservatively as one unknown no-retry boundary", async (
    _label,
    expectedStatus,
    buildResolution,
  ) => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const sessionPromise = runPrepared({ root, operation, prepared });
    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );
    const resolution = buildResolution(operation);
    expect(resolvePreparedRendezvous({
      prepared,
      operation,
      currentBinding: resolution.currentBinding,
      actuatorResult: resolution.actuatorResult,
    })).toBe(expectedStatus);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.REJECTED);

    const session = await sessionPromise;
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      terminal_record_present: true,
      pending_record_present: false,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID],
    });
    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      effect_boundary_entered: true,
      modeled_send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      send_allowed: false,
      live_authority: false,
    });
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED);
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test.each([
    [
      "accessor-bearing result",
      () => {
        let getterReads = 0;
        const actuatorResult = { ...deferredActuatorResult() };
        Object.defineProperty(actuatorResult, "confirmation_marker", {
          enumerable: true,
          configurable: true,
          get: () => {
            getterReads += 1;
            return WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER;
          },
        });
        return { actuatorResult, getterReads: () => getterReads };
      },
    ],
    [
      "Proxy result",
      () => {
        let trapReads = 0;
        const actuatorResult = new Proxy(deferredActuatorResult(), {
          get: () => {
            trapReads += 1;
            throw new Error("proxy_get_trap_must_not_run");
          },
          getOwnPropertyDescriptor: () => {
            trapReads += 1;
            throw new Error("proxy_descriptor_trap_must_not_run");
          },
          getPrototypeOf: () => {
            trapReads += 1;
            throw new Error("proxy_prototype_trap_must_not_run");
          },
          ownKeys: () => {
            trapReads += 1;
            throw new Error("proxy_own_keys_trap_must_not_run");
          },
        });
        return { actuatorResult, getterReads: () => trapReads };
      },
    ],
    [
      "non-plain result",
      () => ({
        actuatorResult: Object.assign(
          Object.create({ inherited_state: "forbidden" }),
          deferredActuatorResult(),
        ),
        getterReads: () => 0,
      }),
    ],
  ])("rejects a %s without observation, re-read, or rearm", async (_label, buildEnvelope) => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    const sessionPromise = runPrepared({ root, operation, prepared });
    await waitForRendezvousStatus(
      prepared,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    );
    const envelope = buildEnvelope();

    expect(resolvePreparedRendezvous({
      prepared,
      operation,
      actuatorResult: envelope.actuatorResult,
    })).toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_INVALID);
    expect(envelope.getterReads()).toBe(0);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.REJECTED);

    const session = await sessionPromise;
    expect(envelope.getterReads()).toBe(0);
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID],
    });
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED);
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("times out an absent result to terminal unknown and rejects every late resolution without rearming", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DEFERRED_RENDEZVOUS,
    );
    expect(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_TIMEOUT_MS).toBeGreaterThan(0);
    const session = await runPrepared({ root, operation, prepared });

    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.TIMED_OUT);
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      pending_record_present: false,
      terminal_record_present: true,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID],
    });
    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      effect_boundary_entered: true,
      modeled_send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      send_allowed: false,
      live_authority: false,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.LATE);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.TIMED_OUT);

    const replay = await runPrepared({ root, operation, prepared });
    expect(replay.session_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED,
    ]);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.TIMED_OUT);
  });

  test("rejects forged, cross-operation, reused, and binding-drift authorities before PRECLAIM", async () => {
    const operation = preclaimOperation();

    const forgedRoot = await makeRoot();
    const forgedPort = preparedPort(operation);
    const forged = await runWelcomeAudioOperationSessionOnce({
      registry_root: forgedRoot,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      canonical_operation: operation,
      current_binding: bindingFor(operation),
      prepared_session_authority: Object.freeze({ marker: Symbol() }),
      branded_safari_actuator_port: forgedPort.branded_safari_actuator_port,
      now_ms: NOW_MS,
    });
    expect(forged.session_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID,
    ]);

    const crossRoot = await makeRoot();
    const first = preparedPort(operation);
    const second = preparedPort(operation);
    const cross = await runWelcomeAudioOperationSessionOnce({
      registry_root: crossRoot,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      canonical_operation: operation,
      current_binding: bindingFor(operation),
      prepared_session_authority: first.prepared_session_authority,
      branded_safari_actuator_port: second.branded_safari_actuator_port,
      now_ms: NOW_MS,
    });
    expect(cross.session_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_INVALID,
    ]);

    const driftRoot = await makeRoot();
    const driftPrepared = preparedPort(operation);
    const driftedBinding = { ...bindingFor(operation), session_revision: 2 };
    const drift = await runPrepared({
      root: driftRoot,
      operation,
      prepared: driftPrepared,
      currentBinding: driftedBinding,
    });
    expect(drift.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: false,
      modeled_send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.BINDING_DRIFT],
    });

    const used = await runPrepared({
      root: driftRoot,
      operation,
      prepared: driftPrepared,
      currentBinding: bindingFor(operation),
    });
    expect(used.session_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED,
    ]);
    expect(used.session_receipt.retry_disposition)
      .toBe(WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT);
    expect(validateWelcomeAudioOperationSessionReceipt(used.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(await readdir(forgedRoot)).toEqual([]);
    expect(await readdir(crossRoot)).toEqual([]);
    expect(await readdir(driftRoot)).toEqual([]);
  });

  test("rejects a genuine authority bound to a different canonical operation", async () => {
    const root = await makeRoot();
    const firstOperation = preclaimOperation({ missionId: "synthetic_cross_operation_a" });
    const secondOperation = preclaimOperation({ missionId: "synthetic_cross_operation_b" });
    const prepared = preparedPort(firstOperation);

    const session = await runPrepared({
      root,
      operation: secondOperation,
      prepared,
      currentBinding: bindingFor(secondOperation),
    });

    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.BINDING_DRIFT],
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(await readdir(root)).toEqual([]);
  });

  test.each([
    ["before PRECLAIM publication", 3, 0],
    ["after PRECLAIM publication", 6, 1],
  ])("fails closed on binding drift %s", async (
    _label,
    stableRevisionReads,
    expectedPreclaimCount,
  ) => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(operation);
    const currentBinding = bindingThatDriftsAfterRevisionReads(
      operation,
      stableRevisionReads,
    );

    const session = await runPrepared({
      root,
      operation,
      prepared,
      currentBinding,
    });

    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: expectedPreclaimCount === 1,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.BINDING_DRIFT],
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect((await readdir(root)).filter((entry) => entry.startsWith("preclaim-")))
      .toHaveLength(expectedPreclaimCount);
  });

  test("serializes concurrent reuse of one authority to exactly one modeled dispatch", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(operation);
    const parameters = {
      root,
      operation,
      prepared,
      currentBinding: bindingFor(operation),
    };

    const outcomes = await Promise.all([
      runPrepared(parameters),
      runPrepared(parameters),
    ]);
    expect(outcomes.filter((entry) =>
      entry.session_receipt.decision === WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED))
      .toHaveLength(1);
    expect(outcomes.filter((entry) =>
      entry.session_receipt.blocker_codes.includes(
        WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED,
      ))).toHaveLength(1);
    expect(outcomes.reduce(
      (sum, entry) => sum + entry.session_receipt.modeled_send_control_actuation_count,
      0,
    )).toBe(1);
  });

  test("a lease revoked after READY cannot cross the pending-to-actuation boundary", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.AUTHORITY_REVOCATION_WINDOW,
    );
    let watcher: ReturnType<typeof watch> | null = null;
    const revoked = new Promise<string>((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        watcher?.close();
        rejectPromise(new Error("ready_watch_timeout"));
      }, 5000);
      watcher = watch(root, (_event, filename) => {
        if (typeof filename !== "string" || !filename.startsWith("pending-")) return;
        const status = consumeWelcomeAudioSafariOperationAuthority({
          prepared_session_authority: prepared.prepared_session_authority,
          branded_safari_actuator_port: prepared.branded_safari_actuator_port,
        });
        clearTimeout(timeout);
        watcher?.close();
        resolvePromise(status);
      });
    });

    const [session, revocationStatus] = await Promise.all([
      runPrepared({ root, operation, prepared }),
      revoked,
    ]);

    expect(revocationStatus)
      .toBe(WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.CONSUMED_NOW);
    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED,
      authority_consumed_by_current_invocation: false,
      preclaim_record_published: true,
      claim_receipt_present: true,
      operational_receipt_present: true,
      effect_boundary_entered: false,
      modeled_send_control_actuation_count: 0,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED],
    });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      terminal_record_present: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID],
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("a PRECLAIM collision is immutable, terminally blocked, and never reclaimed", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const first = await runPrepared({ root, operation });
    expect(first.session_receipt.decision)
      .toBe(WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED);
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: root,
      expectedCanonicalOperationSha256: operation.canonical_operation_sha256,
    });
    const before = await readFile(paths.preclaim, "utf8");

    const collision = await runPrepared({
      root,
      operation,
      prepared: preparedPort(operation),
    });
    const after = await readFile(paths.preclaim, "utf8");
    expect(collision.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: false,
      modeled_send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.PRECLAIM_COLLISION],
    });
    expect(after).toBe(before);
  });

  test("classifies a claim mutex collision as failed closed with no operational receipt", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const registryIdentity = await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: root,
      policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
    });
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: root,
      expectedCanonicalOperationSha256: operation.canonical_operation_sha256,
    });
    const mutexIdentity = await acquireWelcomeAudioOneShotStoreMutex({
      paths,
      registryIdentity,
    });
    expect(mutexIdentity).not.toBeNull();
    let session;
    try {
      session = await runPrepared({ root, operation });
    } finally {
      await releaseWelcomeAudioOneShotStoreMutex({
        paths,
        registryIdentity,
        mutexIdentity: mutexIdentity!,
      });
    }

    expect(session!.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: true,
      claim_receipt_present: true,
      operational_receipt_present: false,
      effect_boundary_entered: false,
      modeled_send_control_actuation_count: 0,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CLAIM_NOT_CREATED],
    });
    expect(session!.claim_receipt).toMatchObject({
      decision: WELCOME_AUDIO_CLAIM_DECISION.BUSY,
    });
    expect(session!.operational_receipt).toBeNull();
    expect(validateWelcomeAudioOperationSessionReceipt(session!.session_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test.each([
    [
      "at 61 seconds",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DELAYED_WITHIN_WINDOW,
    ],
    [
      "at the exact 300-second boundary",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.DELAYED_AT_WINDOW_LIMIT,
    ],
  ])("accepts a strong delayed confirmation %s", async (_label, deterministicScenario) => {
    const root = await makeRoot();
    const operation = preclaimOperationFreshForDelayedConfirmation();
    const prepared = preparedPort(operation, deterministicScenario);
    const session = await runPrepared({
      root,
      operation,
      prepared,
      deterministicScenario,
    });

    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      effect_boundary_entered: true,
      modeled_send_control_actuation_count: 1,
      blocker_codes: [],
    });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      terminal_record_present: true,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test.each([
    [
      "after claim creation and before PENDING",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.COMPOSITE_REJECT_AFTER_CLAIM,
      false,
      0,
      0,
    ],
    [
      "after PENDING with unknown actuation outcome",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.COMPOSITE_REJECT_AFTER_PENDING,
      true,
      1,
      1,
    ],
    [
      "after terminal publication",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.COMPOSITE_REJECT_AFTER_TERMINAL,
      true,
      1,
      1,
    ],
  ])("classifies a lost composite result %s from durable evidence", async (
    _label,
    deterministicScenario,
    expectedBoundary,
    expectedCount,
    expectedTerminalCount,
  ) => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(operation, deterministicScenario);
    const session = await runPrepared({
      root,
      operation,
      prepared,
      deterministicScenario,
    });

    expect(session.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED,
      authority_consumed_by_current_invocation: true,
      preclaim_record_published: true,
      claim_receipt_present: false,
      operational_receipt_present: false,
      effect_boundary_entered: expectedBoundary,
      modeled_send_control_actuation_count: expectedCount,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.COMPOSITE_FAILED],
    });
    expect(session.claim_receipt).toBeNull();
    expect(session.operational_receipt).toBeNull();
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect((await readdir(root)).filter((entry) => entry.startsWith("terminal-")))
      .toHaveLength(expectedTerminalCount);
  });

  test("rejects cross-field tampering in a completed session receipt", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const session = await runPrepared({ root, operation });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    const completed = structuredClone(session.session_receipt);
    const tampered = [
      { ...completed, operational_receipt_present: false },
      {
        ...completed,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
      },
      {
        ...completed,
        modeled_send_control_actuation_count: 2,
        effect_boundary_entered: true,
      },
      { ...completed, authority_consumed_by_current_invocation: false },
      { ...completed, claim_receipt_present: false },
      { ...completed, preclaim_record_published: false },
      {
        ...completed,
        blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID],
      },
    ];

    for (const candidate of tampered) {
      expect(validateWelcomeAudioOperationSessionReceipt(candidate)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.INPUT_INVALID,
      });
    }
  });

  test.each([
    [
      "cancel before modeled dispatch",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.ZERO_ACTUATION,
      0,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT,
    ],
    [
      "ambiguous confirmation timeout",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.NONE,
      1,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID,
    ],
    [
      "late confirmation after five minutes",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.LATE,
      1,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID,
    ],
    [
      "mismatched confirmation",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MISMATCHED,
      1,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID,
    ],
    [
      "ambiguous failure after dispatch boundary",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY,
      1,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_FAILED,
    ],
    [
      "invalid duplicate dispatch count",
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS,
      2,
      WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT,
    ],
  ])("closes %s without retry or live effect", async (
    _label,
    deterministicScenario,
    expectedCount,
    expectedBlocker,
  ) => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(operation, deterministicScenario);
    const session = await runPrepared({
      root,
      operation,
      deterministicScenario,
      prepared,
    });

    const invalidMultiple = deterministicScenario
      === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS;
    expect(session.session_receipt).toMatchObject({
      decision: invalidMultiple
        ? WELCOME_AUDIO_OPERATION_SESSION_DECISION.FAILED_CLOSED
        : WELCOME_AUDIO_OPERATION_SESSION_DECISION.COMPLETED,
      modeled_send_control_actuation_count: expectedCount,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: invalidMultiple
        ? [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.CHILD_RECEIPT_INVALID]
        : [],
    });
    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      terminal_record_present: true,
      pending_record_present: false,
      send_control_actuation_count: expectedCount,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [expectedBlocker],
    });
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioSafariOperationalReceipt(session.operational_receipt))
      .toEqual(invalidMultiple
        ? {
          ok: false,
          reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID,
        }
        : { ok: true, reason: null });
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED);

    const replay = await runPrepared({
      root,
      operation,
      deterministicScenario,
      prepared,
    });
    expect(replay.session_receipt).toMatchObject({
      decision: WELCOME_AUDIO_OPERATION_SESSION_DECISION.BLOCKED,
      modeled_send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_OPERATION_SESSION_BLOCKER.AUTHORITY_USED],
    });
  });

  test("consumes a THROW_AFTER_BOUNDARY rendezvous and rejects every later resolution", async () => {
    const root = await makeRoot();
    const operation = preclaimOperation();
    const prepared = preparedPort(
      operation,
      WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY,
    );
    const session = await runPrepared({
      root,
      operation,
      prepared,
      deterministicScenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY,
    });

    expect(session.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_FAILED],
    });
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED);
    expect(resolvePreparedRendezvous({ prepared, operation }))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED);
    expect(rendezvousStatus(prepared))
      .toBe(WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED);
  });

  test("never includes a private sentinel in any of the three receipt layers", async () => {
    const sentinel = "synthetic_private_sentinel_must_not_appear_001";
    const root = await makeRoot();
    const operation = preclaimOperation({ missionId: sentinel });
    const session = await runPrepared({ root, operation });

    expect(JSON.stringify(session)).not.toContain(sentinel);
    expect(validateWelcomeAudioOperationSessionReceipt(session.session_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("imports both bridge modules in a fresh process with no output or filesystem effect", async () => {
    for (const modulePath of [PORT_MODULE_PATH, SESSION_MODULE_PATH]) {
      const workdir = await mkdtemp(join(tmpdir(), "crm-core-welcome-session-import-"));
      await chmod(workdir, 0o700);
      cleanupPaths.push(workdir);
      const before = await readdir(workdir);
      const { stdout, stderr } = await execFileAsync(process.execPath, [
        "--input-type=module",
        "--eval",
        `await import(${JSON.stringify(pathToFileURL(modulePath).href)});`,
      ], { cwd: workdir, maxBuffer: 1024 * 1024 });
      const after = await readdir(workdir);

      expect(stdout).toBe("");
      expect(stderr).toBe("");
      expect(before).toEqual([]);
      expect(after).toEqual([]);
    }
  });

  test("source order is PRECLAIM publication before the composite and has no browser, network, shell, callback, or picker dependency", async () => {
    const sessionSource = await readFile(SESSION_MODULE_PATH, "utf8");
    const portSource = await readFile(PORT_MODULE_PATH, "utf8");
    const sessionImports = [...sessionSource.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);
    expect(sessionImports.sort()).toEqual([
      "./crm-vnext-instagram-welcome-audio-claim-writer.mjs",
      "./crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
      "./crm-vnext-instagram-welcome-audio-safari-operation-port.mjs",
      "./crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs",
    ].sort());
    expect(sessionSource.indexOf("await writeWelcomeAudioOneShotExclusiveDurable"))
      .toBeLessThan(sessionSource.indexOf("await runWelcomeAudioOperationalRailOnce"));
    for (const source of [sessionSource, portSource]) {
      expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/);
      expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/);
      expect(source).not.toMatch(/(?:playwright|puppeteer|webdriver|selenium)/i);
      expect(source).not.toMatch(/process\.argv|import\.meta\.main/);
      expect(source).not.toMatch(/file[_ -]?picker|browser[_ -]?handle/i);
    }
    expect(portSource).not.toMatch(/\b(?:callback|browser_handle|payload)\b/);
  });
});
