import { execFile } from "node:child_process";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_ADAPTER_VERSION,
  buildWelcomeAudioCanonicalOperationDigest,
  validateWelcomeAudioOperation,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";
import {
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
} from "../scripts/crm-vnext-instagram-welcome-audio-one-shot-executor.mjs";

const execFileAsync = promisify(execFile);
const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const SOURCE_SHA = "1".repeat(64);
const PROFILE_SHA = "2".repeat(64);
const CANDIDATE_SHA = "3".repeat(64);
const THREAD_SHA = "4".repeat(64);
const OWNER_SHA = "5".repeat(64);
const ASSET_SHA = "6".repeat(64);
const OPERATION_ID = "synthetic_welcome_audio_operation_001";
const APPROVAL_PACKET_ID = "synthetic_welcome_audio_approval_001";
const ASSET_ID = "synthetic_welcome_audio_asset_001";
const MISSION_ID = "synthetic_crm_core_welcome_audio_mission_001";
const CLAIM_OWNER_ID = "synthetic_claim_owner_current_001";
const CLAIM_TOKEN_ID = "synthetic_claim_token_current_001";
const ATTEMPT_ID = "synthetic_send_attempt_current_001";
const SOURCE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const EXPECTED_LINEAGE = Object.freeze({
  claim_owner_id: CLAIM_OWNER_ID,
  claim_token_id: CLAIM_TOKEN_ID,
  registry_revision: 1,
  attempt_id: ATTEMPT_ID,
});
const EXECUTOR_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-one-shot-executor.mjs",
);
const GUARD_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs",
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

// This is the same synthetic READY fixture used by the guard specification.
// The claim transition intentionally does not rebuild the canonical digest:
// those lineage/lifecycle fields are outside the frozen operation payload.
const preclaimOperation = () => bindCanonicalOperationDigest({
  adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
  contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  canonical_operation_sha256: "0".repeat(64),
  operation: {
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    mission_id: MISSION_ID,
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
    mission_id: MISSION_ID,
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
    preview_observed_at: "2026-07-14T15:58:40.000Z",
  },
  context: {
    status: "fresh_exact_central_mission_context",
    checked_at: "2026-07-14T15:57:00.000Z",
    central_repo_head: "a".repeat(40),
    expected_central_repo_head: "a".repeat(40),
    mission_id: MISSION_ID,
    expected_mission_id: MISSION_ID,
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
    mission_id: MISSION_ID,
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
    mission_id: MISSION_ID,
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
    mission_id: MISSION_ID,
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
    mission_id: MISSION_ID,
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

const sendReadyOperation = () => {
  const input = preclaimOperation();
  input.effect_claim = {
    ...input.effect_claim,
    status: WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT,
    claim_result: WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION,
    claim_token_status:
      WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION,
    atomic: true,
    permanent: true,
    claimed_at: "2026-07-14T15:59:00.000Z",
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    registry_revision: 1,
    attempt_id: ATTEMPT_ID,
  };
  input.execution = {
    ...input.execution,
    attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED,
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    claim_registry_revision: 1,
    attempt_id: ATTEMPT_ID,
  };
  input.confirmation = {
    ...input.confirmation,
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    claim_registry_revision: 1,
    attempt_id: ATTEMPT_ID,
  };
  return input;
};

const terminalOperation = () => {
  const input = sendReadyOperation();
  const attemptedAt = new Date(NOW_MS).toISOString();
  input.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
  input.execution.send_attempt_count = 1;
  input.execution.attempt_state = WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL;
  input.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
  input.execution.retry_disposition = WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT;
  input.execution.claim_token_consumed_at = attemptedAt;
  input.execution.attempted_at = attemptedAt;
  input.confirmation.confirmation_marker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;
  input.confirmation.bound_to_current_operation = false;
  input.confirmation.checked_at = attemptedAt;
  return input;
};

const makeRegistry = async () => {
  const registry = await mkdtemp(join(tmpdir(), "crm-core-welcome-executor-test-"));
  await chmod(registry, 0o700);
  cleanupPaths.push(registry);
  return registry;
};

const writeReady = async (
  registryDir: string,
  snapshot: Record<string, any> = sendReadyOperation(),
) => {
  const expectedCanonicalOperationSha256 = snapshot.canonical_operation_sha256;
  const paths = buildWelcomeAudioOneShotSyntheticRegistryPaths({
    registryDir,
    expectedCanonicalOperationSha256,
  });
  await writeFile(paths.ready, `${JSON.stringify(snapshot)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  return { expectedCanonicalOperationSha256, paths, snapshot };
};

const invocation = ({
  registryDir,
  expectedCanonicalOperationSha256,
  expectedClaimLineage = EXPECTED_LINEAGE,
  faultPoint = null,
}: {
  registryDir: string;
  expectedCanonicalOperationSha256: string;
  expectedClaimLineage?: Record<string, any>;
  faultPoint?: string | null;
}) => ({
  registryDir,
  expectedCanonicalOperationSha256,
  expectedClaimLineage,
  nowMs: NOW_MS,
  faultPoint,
});

const expectBlocked = (
  receipt: Record<string, any>,
  blocker: string,
) => {
  expect(receipt.decision).toBe(WELCOME_AUDIO_ONE_SHOT_DECISION.BLOCKED);
  expect(receipt.blocker_codes).toEqual([blocker]);
  expect(receipt.attempt_budget_consumed).toBe(false);
  expect(receipt.external_effect_invoked).toBe(false);
  expect(validateWelcomeAudioOneShotExecutorReceipt(receipt)).toEqual({
    ok: true,
    reason: null,
  });
};

const runSubprocess = async (parameters: Record<string, any>) => {
  const worker = [
    `const module = await import(${JSON.stringify(pathToFileURL(EXECUTOR_MODULE_PATH).href)});`,
    "const parameters = JSON.parse(Buffer.from(process.argv[1], 'base64').toString('utf8'));",
    "const receipt = await module.executeWelcomeAudioOneShotSynthetic(parameters);",
    "process.stdout.write(JSON.stringify(receipt));",
  ].join("\n");
  const encoded = Buffer.from(JSON.stringify(parameters), "utf8").toString("base64");
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    "--input-type=module",
    "--eval",
    worker,
    encoded,
  ], { maxBuffer: 1024 * 1024 });
  expect(stderr).toBe("");
  return JSON.parse(stdout);
};

const loadInstrumentedExecutor = async ({
  registryDir,
  expectedCanonicalOperationSha256,
  injectionMode,
  replacementBytes = null,
}: {
  registryDir: string;
  expectedCanonicalOperationSha256: string;
  injectionMode:
    | "replace_ready"
    | "collide_pending"
    | "collide_terminal"
    | "swap_registry"
    | "foreign_ready_owner";
  replacementBytes?: string | null;
}) => {
  const canonicalRegistryDir = await realpath(registryDir);
  const paths = buildWelcomeAudioOneShotSyntheticRegistryPaths({
    registryDir: canonicalRegistryDir,
    expectedCanonicalOperationSha256,
  });
  const wrapperPath = join(registryDir, `synthetic-fs-wrapper-${injectionMode}.mjs`);
  const modulePath = join(registryDir, `synthetic-executor-${injectionMode}.mjs`);
  const registryBackupPath = `${canonicalRegistryDir}.swapped`;
  cleanupPaths.push(registryBackupPath);
  const collisionBytes = `${JSON.stringify({ synthetic_collision: injectionMode })}\n`;
  const wrapperSource = [
    "import * as fs from 'node:fs/promises';",
    `const mode = ${JSON.stringify(injectionMode)};`,
    `const readyPath = ${JSON.stringify(paths.ready)};`,
    `const pendingPath = ${JSON.stringify(paths.pending)};`,
    `const terminalPath = ${JSON.stringify(paths.terminal)};`,
    `const mutexPath = ${JSON.stringify(paths.mutex)};`,
    `const registryPath = ${JSON.stringify(canonicalRegistryDir)};`,
    `const registryBackupPath = ${JSON.stringify(registryBackupPath)};`,
    `const replacementBytes = ${JSON.stringify(replacementBytes)};`,
    `const collisionBytes = ${JSON.stringify(collisionBytes)};`,
    "let injected = false;",
    "export const lstat = fs.lstat;",
    "export const open = async (...args) => {",
    "  const handle = await fs.open(...args);",
    "  if (mode !== 'foreign_ready_owner' || args[0] !== readyPath) return handle;",
    "  return {",
    "    stat: async () => {",
    "      const metadata = await handle.stat();",
    "      return new Proxy(metadata, {",
    "        get: (target, key) => key === 'uid' ? target.uid + 1 : Reflect.get(target, key, target),",
    "      });",
    "    },",
    "    readFile: (...readArgs) => handle.readFile(...readArgs),",
    "    close: (...closeArgs) => handle.close(...closeArgs),",
    "  };",
    "};",
    "export const readdir = fs.readdir;",
    "export const realpath = fs.realpath;",
    "export const rmdir = fs.rmdir;",
    "export const unlink = fs.unlink;",
    "export const mkdir = async (path, options) => {",
    "  if (!injected && mode === 'swap_registry' && path === mutexPath) {",
    "    injected = true;",
    "    await fs.rename(registryPath, registryBackupPath);",
    "    await fs.mkdir(registryPath, { mode: 0o700 });",
    "  }",
    "  if (!injected && mode === 'replace_ready' && path === mutexPath) {",
    "    injected = true;",
    "    const replacementPath = `${readyPath}.replacement`;",
    "    await fs.writeFile(replacementPath, replacementBytes, { flag: 'wx', mode: 0o600 });",
    "    await fs.rename(replacementPath, readyPath);",
    "  }",
    "  return fs.mkdir(path, options);",
    "};",
    "export const link = async (source, destination) => {",
    "  const pendingCollision = mode === 'collide_pending' && destination === pendingPath;",
    "  const terminalCollision = mode === 'collide_terminal' && destination === terminalPath;",
    "  if (!injected && (pendingCollision || terminalCollision)) {",
    "    injected = true;",
    "    await fs.writeFile(destination, collisionBytes, { flag: 'wx', mode: 0o600 });",
    "  }",
    "  return fs.link(source, destination);",
    "};",
  ].join("\n");
  await writeFile(wrapperPath, `${wrapperSource}\n`, { flag: "wx", mode: 0o600 });

  const executorSource = await readFile(EXECUTOR_MODULE_PATH, "utf8");
  const instrumentedSource = executorSource
    .replace(
      "from 'node:fs/promises';",
      `from '${pathToFileURL(wrapperPath).href}';`,
    )
    .replace(
      "from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';",
      `from '${pathToFileURL(GUARD_MODULE_PATH).href}';`,
    );
  expect(instrumentedSource).not.toBe(executorSource);
  await writeFile(modulePath, instrumentedSource, { flag: "wx", mode: 0o600 });
  return {
    module: await import(pathToFileURL(modulePath).href),
    paths,
    collisionBytes,
  };
};

describe("Instagram welcome-audio one-shot synthetic executor", () => {
  test("publishes one owner-only terminal record and an exact 15-field redacted receipt", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);

    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));

    expect(receipt).toEqual({
      receipt_schema_version: WELCOME_AUDIO_ONE_SHOT_RECEIPT_SCHEMA_VERSION,
      executor_contract_version: WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
      redaction_status: "allowlist_only_no_private_fields",
      execution_mode: WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE,
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
      input_guard_decision: WELCOME_AUDIO_GUARD_DECISION.READY,
      terminal_guard_decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      consumed_by_current_invocation: true,
      terminal_record_present: true,
      attempt_budget_consumed: true,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [],
    });
    expect(Object.keys(receipt).sort()).toEqual([...WELCOME_AUDIO_ONE_SHOT_RECEIPT_FIELDS].sort());
    expect(Object.keys(receipt)).toHaveLength(15);
    expect(validateWelcomeAudioOneShotExecutorReceipt(receipt)).toEqual({ ok: true, reason: null });

    const metadata = await lstat(ready.paths.terminal);
    expect(metadata.isFile()).toBe(true);
    expect(metadata.isSymbolicLink()).toBe(false);
    expect(metadata.mode & 0o777).toBe(0o600);
    expect(metadata.nlink).toBe(1);
    await expect(lstat(ready.paths.pending)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(ready.paths.mutex)).rejects.toMatchObject({ code: "ENOENT" });

    const record = JSON.parse(await readFile(ready.paths.terminal, "utf8"));
    expect(record).toMatchObject({
      record_schema_version: WELCOME_AUDIO_ONE_SHOT_TERMINAL_RECORD_SCHEMA_VERSION,
      executor_contract_version: WELCOME_AUDIO_ONE_SHOT_EXECUTOR_CONTRACT_VERSION,
      execution_mode: WELCOME_AUDIO_ONE_SHOT_EXECUTION_MODE,
      canonical_operation_sha256: ready.expectedCanonicalOperationSha256,
      claim_lineage: EXPECTED_LINEAGE,
      terminal_guard_decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(record.terminal_snapshot.effect_claim.claim_token_status).toBe(
      WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED,
    );
    expect(record.terminal_snapshot.execution).toMatchObject({
      send_attempt_count: 1,
      attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL,
      send_claim: WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
    });

    const publicBytes = JSON.stringify(receipt);
    for (const privateValue of [
      CLAIM_OWNER_ID,
      CLAIM_TOKEN_ID,
      ATTEMPT_ID,
      OPERATION_ID,
      MISSION_ID,
      ready.expectedCanonicalOperationSha256,
      registryDir,
    ]) expect(publicBytes).not.toContain(privateValue);
  });

  test("replay returns terminal no-retry without rewriting the tombstone", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const parameters = invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    });
    const first = await executeWelcomeAudioOneShotSynthetic(parameters);
    const before = await lstat(ready.paths.terminal);
    const second = await executeWelcomeAudioOneShotSynthetic(parameters);
    const after = await lstat(ready.paths.terminal);

    expect(first.decision).toBe(WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE);
    expect(second).toMatchObject({
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL,
      consumed_by_current_invocation: false,
      terminal_record_present: true,
      attempt_budget_consumed: true,
      external_effect_invoked: false,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING],
    });
    expect(after.ino).toBe(before.ino);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(validateWelcomeAudioOneShotExecutorReceipt(second)).toEqual({ ok: true, reason: null });
  });

  test.each([
    ["owner", { ...EXPECTED_LINEAGE, claim_owner_id: "synthetic_other_owner" }],
    ["token", { ...EXPECTED_LINEAGE, claim_token_id: "synthetic_other_token" }],
    ["revision", { ...EXPECTED_LINEAGE, registry_revision: 2 }],
    ["attempt", { ...EXPECTED_LINEAGE, attempt_id: "synthetic_other_attempt" }],
  ])("blocks %s lineage rebinding before consumption", async (_label, expectedClaimLineage) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      expectedClaimLineage,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    await expect(lstat(ready.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("blocks trusted digest mismatch before reading a different operation", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: "f".repeat(64),
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    await expect(lstat(ready.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("proves the terminal rejection fixture is a valid integrated-guard terminal", () => {
    const fixture = terminalOperation();
    const guard = validateWelcomeAudioOperation(fixture, {
      nowMs: NOW_MS,
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    });
    expect(guard).toMatchObject({
      state_valid: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.TERMINAL,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      terminal: true,
      send_ready: false,
      send_allowed: false,
    });
  });

  test.each([
    ["preclaim guard state", () => preclaimOperation()],
    ["terminal guard state", () => terminalOperation()],
    ["changed claim status", () => {
      const input = sendReadyOperation();
      input.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
      return input;
    }],
    ["changed canonical payload", () => {
      const input = sendReadyOperation();
      input.operation.expected_send_count = 2;
      return input;
    }],
  ])("blocks non-authoritative READY: %s", async (_label, fixture) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir, fixture());
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
  });

  test.each([2, 32])("serializes %i same-process contenders with exactly one consumer", async (count) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const parameters = invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    });
    const receipts = await Promise.all(
      Array.from({ length: count }, () => executeWelcomeAudioOneShotSynthetic(parameters)),
    );

    expect(receipts.filter(
      (receipt) => receipt.decision === WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
    )).toHaveLength(1);
    expect(receipts.every((receipt) => [
      WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
      WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY,
      WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL,
      WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL,
    ].includes(receipt.decision))).toBe(true);
    expect(receipts.every(
      (receipt) => validateWelcomeAudioOneShotExecutorReceipt(receipt).ok,
    )).toBe(true);
    expect(receipts.every((receipt) => receipt.external_effect_invoked === false)).toBe(true);
  });

  test("serializes true multiprocess contenders with exactly one consumer", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const parameters = invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    });
    const receipts = await Promise.all(
      Array.from({ length: 8 }, () => runSubprocess(parameters)),
    );

    expect(receipts.filter(
      (receipt) => receipt.decision === WELCOME_AUDIO_ONE_SHOT_DECISION.CONSUMED_ONCE,
    )).toHaveLength(1);
    expect(receipts.every((receipt) => receipt.attempt_budget_consumed
      || receipt.decision === WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY)).toBe(true);
    expect(receipts.every(
      (receipt) => validateWelcomeAudioOneShotExecutorReceipt(receipt).ok,
    )).toBe(true);
  }, 20_000);

  test("blocks a real READY replacement between precheck and serialized reread", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const replacementBytes = `${JSON.stringify(ready.snapshot, null, 2)}\n`;
    const instrumented = await loadInstrumentedExecutor({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      injectionMode: "replace_ready",
      replacementBytes,
    });
    const receipt = await instrumented.module.executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));

    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED);
    expect(await readFile(instrumented.paths.ready, "utf8")).toBe(replacementBytes);
    await expect(lstat(instrumented.paths.pending)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(instrumented.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("never replaces an EEXIST collision at pending publication", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const instrumented = await loadInstrumentedExecutor({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      injectionMode: "collide_pending",
    });
    const receipt = await instrumented.module.executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));

    expect(receipt.decision).toBe(WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL);
    expect(receipt.attempt_budget_consumed).toBe(true);
    expect(receipt.external_effect_invoked).toBe(false);
    expect(await readFile(instrumented.paths.pending, "utf8")).toBe(
      instrumented.collisionBytes,
    );
    await expect(lstat(instrumented.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("never replaces an EEXIST collision at final publication", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const instrumented = await loadInstrumentedExecutor({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      injectionMode: "collide_terminal",
    });
    const receipt = await instrumented.module.executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));

    expect(receipt.decision).toBe(WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL);
    expect(receipt.attempt_budget_consumed).toBe(true);
    expect(receipt.external_effect_invoked).toBe(false);
    expect(await readFile(instrumented.paths.terminal, "utf8")).toBe(
      instrumented.collisionBytes,
    );
  });

  test("detects registry inode replacement and fails closed without a terminal write", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const instrumented = await loadInstrumentedExecutor({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      injectionMode: "swap_registry",
    });
    const receipt = await instrumented.module.executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));

    expect(receipt).toMatchObject({
      decision: WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL,
      attempt_budget_consumed: true,
      external_effect_invoked: false,
      blocker_codes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS],
    });
    await expect(lstat(instrumented.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test.each([
    [
      WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.BEFORE_PENDING_PUBLISH,
      WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY,
      WELCOME_AUDIO_ONE_SHOT_BLOCKER.SERIALIZATION_BUSY,
    ],
    [
      WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.AFTER_PENDING_PUBLISH,
      WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL,
      WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_AMBIGUOUS,
    ],
    [
      WELCOME_AUDIO_ONE_SHOT_FAULT_POINT.AFTER_TERMINAL_PUBLISH,
      WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL,
      WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_PREEXISTING,
    ],
  ])("crash point %s fails closed on re-entry", async (faultPoint, decision, blocker) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const parameters = invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      faultPoint,
    });

    await expect(executeWelcomeAudioOneShotSynthetic(parameters)).rejects.toMatchObject({
      code: "CRM_CORE_SYNTHETIC_FAULT",
    });
    const reentry = await executeWelcomeAudioOneShotSynthetic({
      ...parameters,
      faultPoint: null,
    });
    expect(reentry).toMatchObject({
      decision,
      consumed_by_current_invocation: false,
      external_effect_invoked: false,
      blocker_codes: [blocker],
    });
    expect(validateWelcomeAudioOneShotExecutorReceipt(reentry)).toEqual({ ok: true, reason: null });
  });

  test.each([
    ["pending", "pending", WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL],
    ["terminal", "terminal", WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL],
    ["partial pending temp", "pendingTemp", WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL],
    ["partial terminal temp", "terminalTemp", WELCOME_AUDIO_ONE_SHOT_DECISION.UNKNOWN_TERMINAL],
    ["coexistent pending and terminal", "coexistent", WELCOME_AUDIO_ONE_SHOT_DECISION.REPLAYED_TERMINAL],
  ])("classifies %s evidence without consuming", async (_label, evidence, decision) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const evidenceFiles = {
      pending: [ready.paths.pending],
      terminal: [ready.paths.terminal],
      pendingTemp: [join(registryDir, `${ready.paths.pendingTempPrefix}partial`)],
      terminalTemp: [join(registryDir, `${ready.paths.terminalTempPrefix}partial`)],
      coexistent: [ready.paths.pending, ready.paths.terminal],
    }[evidence] as string[];
    await Promise.all(evidenceFiles.map((path) => writeFile(path, "{}\n", {
      flag: "wx",
      mode: 0o600,
    })));

    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expect(receipt.decision).toBe(decision);
    expect(receipt.consumed_by_current_invocation).toBe(false);
    expect(receipt.attempt_budget_consumed).toBe(true);
    expect(receipt.external_effect_invoked).toBe(false);
    expect(validateWelcomeAudioOneShotExecutorReceipt(receipt)).toEqual({ ok: true, reason: null });
  });

  test("never reclaims a stale mutex", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    await mkdir(ready.paths.mutex, { mode: 0o700 });
    const old = new Date("2000-01-01T00:00:00.000Z");
    await utimes(ready.paths.mutex, old, old);
    const parameters = invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    });

    const first = await executeWelcomeAudioOneShotSynthetic(parameters);
    const second = await executeWelcomeAudioOneShotSynthetic(parameters);
    for (const receipt of [first, second]) {
      expect(receipt).toMatchObject({
        decision: WELCOME_AUDIO_ONE_SHOT_DECISION.BUSY,
        attempt_budget_consumed: false,
        external_effect_invoked: false,
        blocker_codes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.SERIALIZATION_BUSY],
      });
    }
    expect((await lstat(ready.paths.mutex)).isDirectory()).toBe(true);
    await expect(lstat(ready.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("blocks a lexically traversed registry alias even when it resolves to a private temp root", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const traversalAlias = `${registryDir}/../${basename(registryDir)}`;
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: traversalAlias,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expect(receipt.decision).toBe(WELCOME_AUDIO_ONE_SHOT_DECISION.BLOCKED);
    expect(receipt.external_effect_invoked).toBe(false);
    expect(receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID,
    ]);
  });

  test("blocks a nested non-registry private path", async () => {
    const parent = await makeRegistry();
    const nested = join(parent, "nested-registry");
    await mkdir(nested, { mode: 0o700 });
    const fixture = sendReadyOperation();
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: nested,
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  });

  test("blocks a real path outside the direct system-temp registry boundary", async () => {
    const fixture = sendReadyOperation();
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: process.cwd(),
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  });

  test("blocks a registry symlink", async () => {
    const target = await makeRegistry();
    const linkPath = `${target}-link`;
    cleanupPaths.push(linkPath);
    await symlink(target, linkPath);
    const fixture = sendReadyOperation();
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: linkPath,
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  });

  test("blocks a READY symlink", async () => {
    const registryDir = await makeRegistry();
    const fixture = sendReadyOperation();
    const paths = buildWelcomeAudioOneShotSyntheticRegistryPaths({
      registryDir,
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    });
    const target = join(registryDir, "synthetic-ready-target.json");
    await writeFile(target, `${JSON.stringify(fixture)}\n`, { flag: "wx", mode: 0o600 });
    await symlink(target, paths.ready);
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: fixture.canonical_operation_sha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
  });

  test.each([
    ["registry", 0o755],
    ["registry", 0o4700],
    ["READY", 0o644],
    ["READY", 0o4600],
  ])("blocks unsafe %s mode", async (target, mode) => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    await chmod(target === "registry" ? registryDir : ready.paths.ready, mode);
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expectBlocked(
      receipt,
      target === "registry"
        ? WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID
        : WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID,
    );
  });

  test("blocks foreign registry ownership semantics", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const originalGetuid = process.getuid;
    Object.defineProperty(process, "getuid", {
      value: () => originalGetuid() + 1,
      configurable: true,
      writable: true,
    });
    let receipt: Record<string, any>;
    try {
      receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
        registryDir,
        expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      }));
    } finally {
      Object.defineProperty(process, "getuid", {
        value: originalGetuid,
        configurable: true,
        writable: true,
      });
    }
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID);
  });

  test("blocks foreign READY ownership after the registry gate passes", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const instrumented = await loadInstrumentedExecutor({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
      injectionMode: "foreign_ready_owner",
    });
    const receipt = await instrumented.module.executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
    await expect(lstat(instrumented.paths.pending)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(instrumented.paths.terminal)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("blocks a hardlinked READY record", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    await link(ready.paths.ready, join(registryDir, "synthetic-ready-hardlink.json"));
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID);
  });

  test("exposes and validates exactly five public outcomes", async () => {
    expect(WELCOME_AUDIO_ONE_SHOT_DECISION).toEqual({
      CONSUMED_ONCE: "consumed_once_terminal_unconfirmed_no_effect",
      BLOCKED: "blocked_before_consume",
      BUSY: "serialization_busy_no_consume",
      REPLAYED_TERMINAL: "preexisting_or_replayed_terminal",
      UNKNOWN_TERMINAL: "unknown_terminal_no_retry",
    });

    const consumedRegistry = await makeRegistry();
    const consumedReady = await writeReady(consumedRegistry);
    const consumedParameters = invocation({
      registryDir: consumedRegistry,
      expectedCanonicalOperationSha256: consumedReady.expectedCanonicalOperationSha256,
    });
    const consumed = await executeWelcomeAudioOneShotSynthetic(consumedParameters);
    const replayed = await executeWelcomeAudioOneShotSynthetic(consumedParameters);

    const blockedRegistry = await makeRegistry();
    const blockedReady = await writeReady(blockedRegistry);
    const blocked = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: blockedRegistry,
      expectedCanonicalOperationSha256: blockedReady.expectedCanonicalOperationSha256,
      expectedClaimLineage: { ...EXPECTED_LINEAGE, registry_revision: 9 },
    }));

    const busyRegistry = await makeRegistry();
    const busyReady = await writeReady(busyRegistry);
    await mkdir(busyReady.paths.mutex, { mode: 0o700 });
    const busy = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: busyRegistry,
      expectedCanonicalOperationSha256: busyReady.expectedCanonicalOperationSha256,
    }));

    const unknownRegistry = await makeRegistry();
    const unknownReady = await writeReady(unknownRegistry);
    await writeFile(unknownReady.paths.pending, "{}\n", { flag: "wx", mode: 0o600 });
    const unknown = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir: unknownRegistry,
      expectedCanonicalOperationSha256: unknownReady.expectedCanonicalOperationSha256,
    }));

    const receipts = [consumed, blocked, busy, replayed, unknown];
    expect(new Set(receipts.map((receipt) => receipt.decision))).toEqual(
      new Set(Object.values(WELCOME_AUDIO_ONE_SHOT_DECISION)),
    );
    expect(receipts.every(
      (receipt) => validateWelcomeAudioOneShotExecutorReceipt(receipt).ok,
    )).toBe(true);

    const impossibleReceipts = [
      { ...consumed, input_guard_decision: null },
      { ...busy, input_guard_decision: null },
      { ...replayed, input_guard_decision: WELCOME_AUDIO_GUARD_DECISION.READY },
      { ...unknown, input_guard_decision: WELCOME_AUDIO_GUARD_DECISION.READY },
      { ...blocked, input_guard_decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED },
    ];
    for (const impossible of impossibleReceipts) {
      expect(validateWelcomeAudioOneShotExecutorReceipt(impossible)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID,
      });
    }

    const blockedInputMatrix = [
      [WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID, [null]],
      [
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.REGISTRY_INVALID,
        [null, WELCOME_AUDIO_GUARD_DECISION.READY],
      ],
      [
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_INVALID,
        [null, WELCOME_AUDIO_GUARD_DECISION.READY],
      ],
      [
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.READY_CHANGED,
        [null, WELCOME_AUDIO_GUARD_DECISION.READY],
      ],
      [
        WELCOME_AUDIO_ONE_SHOT_BLOCKER.TERMINAL_VALIDATION,
        [WELCOME_AUDIO_GUARD_DECISION.READY],
      ],
    ] as const;
    const candidateInputDecisions = [
      null,
      WELCOME_AUDIO_GUARD_DECISION.READY,
      WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    ];
    for (const [blocker, allowedInputDecisions] of blockedInputMatrix) {
      for (const inputGuardDecision of candidateInputDecisions) {
        const candidate = {
          ...blocked,
          input_guard_decision: inputGuardDecision,
          blocker_codes: [blocker],
        };
        expect(validateWelcomeAudioOneShotExecutorReceipt(candidate).ok).toBe(
          allowedInputDecisions.includes(inputGuardDecision as never),
        );
      }
    }
  });

  test("rejects receipt schema, privacy, and semantic tampering", async () => {
    const registryDir = await makeRegistry();
    const ready = await writeReady(registryDir);
    const receipt = await executeWelcomeAudioOneShotSynthetic(invocation({
      registryDir,
      expectedCanonicalOperationSha256: ready.expectedCanonicalOperationSha256,
    }));
    expect(validateWelcomeAudioOneShotExecutorReceipt(receipt).ok).toBe(true);

    const missingField = { ...receipt };
    delete missingField.browser_used;
    const tampered = [
      { ...receipt, private_identity: "synthetic_private_value" },
      missingField,
      { ...receipt, consumed_by_current_invocation: false },
      { ...receipt, terminal_record_present: false },
      { ...receipt, attempt_budget_consumed: false },
      { ...receipt, external_effect_invoked: true },
      { ...receipt, browser_used: true },
      { ...receipt, network_used: true },
      { ...receipt, retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT },
      { ...receipt, blocker_codes: [WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID] },
      { ...receipt, decision: WELCOME_AUDIO_ONE_SHOT_DECISION.BLOCKED },
      { ...receipt, input_guard_decision: null },
      { ...receipt, terminal_guard_decision: null },
    ];
    for (const candidate of tampered) {
      expect(validateWelcomeAudioOneShotExecutorReceipt(candidate)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID,
      });
    }
  });

  test("has no operational CLI, network, browser, child-process, or actuator surface", async () => {
    const source = await readFile(EXECUTOR_MODULE_PATH, "utf8");
    const importedModules = [...source.matchAll(/from\s+["']([^"']+)["']/g)]
      .map((match) => match[1]);
    expect(importedModules).toEqual([
      "node:crypto",
      "node:fs",
      "node:fs/promises",
      "node:os",
      "node:path",
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
    ]);
    expect(source.startsWith("#!")).toBe(false);
    expect(source).not.toMatch(/process\.argv|node:child_process|\bspawn\s*\(|\bexecFile\s*\(/);
    expect(source).not.toMatch(/node:(?:http|https|net|tls|dgram)|\bfetch\s*\(|XMLHttpRequest/);
    expect(source).not.toMatch(/playwright|puppeteer|selenium|globalThis\.browser|agent\.browsers/);
    expect(source).not.toMatch(/\bactuat(?:e|or|ion)\b|\bcallback\b/);
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)|process\.stdout|process\.stderr/);
  });

  test("imports in a fresh process with zero filesystem or output effects", async () => {
    const sandbox = await makeRegistry();
    const before = await readdir(sandbox);
    const worker = `await import(${JSON.stringify(pathToFileURL(EXECUTOR_MODULE_PATH).href)});`;
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "--eval",
      worker,
    ], {
      cwd: sandbox,
      env: {
        ...process.env,
        TMPDIR: sandbox,
        TMP: sandbox,
        TEMP: sandbox,
      },
      maxBuffer: 1024 * 1024,
    });
    expect(stdout).toBe("");
    expect(stderr).toBe("");
    expect(await readdir(sandbox)).toEqual(before);
  });

  test("rejects non-absolute and malformed public inputs without filesystem effects", async () => {
    const receipt = await executeWelcomeAudioOneShotSynthetic({
      registryDir: "relative/synthetic-registry",
      expectedCanonicalOperationSha256: "not-a-digest",
      expectedClaimLineage: { ...EXPECTED_LINEAGE },
      nowMs: NOW_MS,
      faultPoint: null,
    });
    expectBlocked(receipt, WELCOME_AUDIO_ONE_SHOT_BLOCKER.INPUT_INVALID);
    expect(dirname(resolve("relative/synthetic-registry"))).not.toBe(tmpdir());
  });
});
