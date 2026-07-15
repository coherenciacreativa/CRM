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
  unlink,
  utimes,
  writeFile,
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
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_REASON,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  buildWelcomeAudioCanonicalOperationDigest,
  validateWelcomeAudioOperation,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";
import {
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  readWelcomeAudioOneShotRecordStable,
} from "../scripts/crm-vnext-instagram-welcome-audio-one-shot-store.mjs";
import {
  WELCOME_AUDIO_CLAIM_BLOCKER,
  WELCOME_AUDIO_CLAIM_DECISION,
  WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS,
  WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS,
  WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS,
  consumeWelcomeAudioPrivateClaimCapability,
  issueWelcomeAudioClaim,
  validateWelcomeAudioClaimReceipt,
  verifyWelcomeAudioPrivateClaimCapabilityBinding,
  verifyWelcomeAudioPrivateClaimReadyBinding,
} from "../scripts/crm-vnext-instagram-welcome-audio-claim-writer.mjs";
import {
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS,
  createWelcomeAudioSafariActuatorPort,
  executeWelcomeAudioSafariAttempt,
  runWelcomeAudioOperationalRailOnce,
  validateWelcomeAudioSafariOperationalReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs";

const execFileAsync = promisify(execFile);
const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const SOURCE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const SOURCE_SHA = "1".repeat(64);
const PROFILE_SHA = "2".repeat(64);
const CANDIDATE_SHA = "3".repeat(64);
const THREAD_SHA = "4".repeat(64);
const OWNER_SHA = "5".repeat(64);
const ASSET_SHA = "6".repeat(64);
const OPERATION_ID = "synthetic_operational_claim_001";
const APPROVAL_PACKET_ID = "synthetic_operational_approval_001";
const ASSET_ID = "synthetic_operational_asset_001";
const MISSION_ID = "synthetic_operational_mission_001";
const CLAIM_WRITER_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-claim-writer.mjs",
);
const OPERATIONAL_EXECUTOR_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs",
);
const OPERATION_GUARD_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs",
);
const ONE_SHOT_STORE_MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
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

const makeFixture = async () => {
  const unresolvedRoot = await mkdtemp(join(tmpdir(), "crm-core-welcome-claim-test-"));
  await chmod(unresolvedRoot, 0o700);
  cleanupPaths.push(unresolvedRoot);
  const root = await realpath(unresolvedRoot);
  const preclaim = preclaimOperation();
  const paths = buildWelcomeAudioOneShotStorePaths({
    registryRoot: root,
    expectedCanonicalOperationSha256: preclaim.canonical_operation_sha256,
  });
  const preclaimPath = paths.preclaim;
  await writeFile(preclaimPath, `${JSON.stringify(preclaim)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  return {
    expectedDigest: preclaim.canonical_operation_sha256,
    preclaim,
    preclaimPath,
    root,
  };
};

const issue = (fixture: Awaited<ReturnType<typeof makeFixture>>) => {
  const parameters = {
    registry_root: fixture.root,
    authoritative_preclaim_record_path: fixture.preclaimPath,
    expected_canonical_operation_sha256: fixture.expectedDigest,
    registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
    now_ms: NOW_MS,
  };
  return issueWelcomeAudioClaim(parameters);
};

const runClaimSubprocess = async (parameters: Record<string, any>) => {
  const worker = [
    `const module = await import(${JSON.stringify(pathToFileURL(CLAIM_WRITER_MODULE_PATH).href)});`,
    "const parameters = JSON.parse(Buffer.from(process.argv[1], 'base64').toString('utf8'));",
    "const result = await module.issueWelcomeAudioClaim(parameters);",
    "process.stdout.write(JSON.stringify({ redacted_receipt: result.redacted_receipt, capability_exposed: Object.hasOwn(result, 'private_claim_capability') && result.private_claim_capability !== null }));",
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

const importFaultInjectedOperationalModule = async ({
  linkBeforeFailure,
}: {
  linkBeforeFailure: boolean;
}) => {
  const workdir = await mkdtemp(join(tmpdir(), "crm-core-welcome-operational-fault-"));
  await chmod(workdir, 0o700);
  cleanupPaths.push(workdir);
  const shimPath = join(workdir, "one-shot-store-shim.mjs");
  const executorPath = join(workdir, "safari-operational-executor.mjs");
  const storeUrl = pathToFileURL(ONE_SHOT_STORE_MODULE_PATH).href;
  const shimSource = [
    'import { link } from "node:fs/promises";',
    `export * from ${JSON.stringify(storeUrl)};`,
    "export const promoteWelcomeAudioOneShotPendingToTerminal = async ({ paths }) => {",
    linkBeforeFailure ? "  await link(paths.pending, paths.terminal);" : "",
    '  throw new Error("synthetic_terminal_promotion_failure");',
    "};",
  ].filter(Boolean).join("\n");
  await writeFile(shimPath, `${shimSource}\n`, { flag: "wx", mode: 0o600 });

  const executorSource = (await readFile(OPERATIONAL_EXECUTOR_MODULE_PATH, "utf8"))
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
      pathToFileURL(OPERATION_GUARD_MODULE_PATH).href,
    )
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-claim-writer.mjs",
      pathToFileURL(CLAIM_WRITER_MODULE_PATH).href,
    )
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
      pathToFileURL(shimPath).href,
    );
  await writeFile(executorPath, executorSource, { flag: "wx", mode: 0o600 });
  return import(`${pathToFileURL(executorPath).href}?fault=${String(linkBeforeFailure)}`);
};

const importInvalidPortRaceOperationalModule = async () => {
  const workdir = await mkdtemp(join(tmpdir(), "crm-core-welcome-invalid-port-race-"));
  await chmod(workdir, 0o700);
  cleanupPaths.push(workdir);
  const executorPath = join(workdir, "safari-operational-executor.mjs");
  const invalidPortBranch = "  if (!ACTUATOR_PORT_STATE.has(branded_safari_actuator_port)) {";
  const originalSource = await readFile(OPERATIONAL_EXECUTOR_MODULE_PATH, "utf8");
  expect(originalSource).toContain(invalidPortBranch);
  const executorSource = originalSource
    .replace(
      invalidPortBranch,
      [
        "  globalThis.__crmCoreInvalidPortGateReached?.();",
        "  await globalThis.__crmCoreInvalidPortGate;",
        invalidPortBranch,
      ].join("\n"),
    )
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
      pathToFileURL(OPERATION_GUARD_MODULE_PATH).href,
    )
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-claim-writer.mjs",
      pathToFileURL(CLAIM_WRITER_MODULE_PATH).href,
    )
    .replaceAll(
      "./crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
      pathToFileURL(ONE_SHOT_STORE_MODULE_PATH).href,
    );
  await writeFile(executorPath, executorSource, { flag: "wx", mode: 0o600 });
  return import(`${pathToFileURL(executorPath).href}?invalid-port-race=1`);
};

describe("Instagram welcome-audio durable claim writer", () => {
  test("wins once and publishes owner-only durable READY evidence bound to the trusted digest", async () => {
    const fixture = await makeFixture();
    expect(fixture.expectedDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST)
      .toBe("deterministic_no_effect_test");
    expect(Number.isFinite(NOW_MS)).toBe(true);
    const result = await issue(fixture);

    expect(result.redacted_receipt.blocker_codes).toEqual([]);
    expect(result.redacted_receipt.decision).toBe(WELCOME_AUDIO_CLAIM_DECISION.CREATED);
    expect(result.private_claim_capability).toBeTruthy();
    expect(result.redacted_receipt).toMatchObject({
      redaction_status: "allowlist_only_no_private_fields",
      decision: WELCOME_AUDIO_CLAIM_DECISION.CREATED,
      claim_created_by_current_invocation: true,
      ready_record_present: true,
      terminal_or_ambiguous_evidence_present: false,
    });
    expect(Object.keys(result.redacted_receipt).sort())
      .toEqual([...WELCOME_AUDIO_CLAIM_RECEIPT_FIELDS].sort());
    expect(validateWelcomeAudioClaimReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(JSON.stringify(result.redacted_receipt)).not.toContain(fixture.expectedDigest);

    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    const readyMetadata = await lstat(paths.ready);
    expect(readyMetadata.isFile()).toBe(true);
    expect(readyMetadata.isSymbolicLink()).toBe(false);
    expect(readyMetadata.nlink).toBe(1);
    expect(readyMetadata.mode & 0o777).toBe(0o600);
    const ready = JSON.parse(await readFile(paths.ready, "utf8"));
    expect(ready.canonical_operation_sha256).toBe(fixture.expectedDigest);
    expect(ready.effect_claim).toMatchObject({
      atomic: true,
      permanent: true,
    });
    expect(ready.execution).toMatchObject({
      attempt_budget: 1,
      send_attempt_count: 0,
      attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED,
    });
  });

  test("serializes multiprocess contenders so only one invocation can hold capability", async () => {
    const fixture = await makeFixture();
    const parameters = {
      registry_root: fixture.root,
      authoritative_preclaim_record_path: fixture.preclaimPath,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      now_ms: NOW_MS,
    };
    const results = await Promise.all(Array.from({ length: 8 }, () => runClaimSubprocess(parameters)));

    expect(results.filter((result) => result.capability_exposed)).toHaveLength(1);
    expect(results.filter((result) => result.redacted_receipt.claim_created_by_current_invocation))
      .toHaveLength(1);
    expect(results.every((result) => (
      result.redacted_receipt.decision === WELCOME_AUDIO_CLAIM_DECISION.CREATED
      || result.redacted_receipt.decision === WELCOME_AUDIO_CLAIM_DECISION.REPLAYED
      || result.redacted_receipt.decision === WELCOME_AUDIO_CLAIM_DECISION.BUSY
    ))).toBe(true);
  });

  test("blocks replay and trusted-digest mismatch without minting another capability", async () => {
    const fixture = await makeFixture();
    const first = await issue(fixture);
    const replay = await issue(fixture);
    const mismatch = await issueWelcomeAudioClaim({
      registry_root: fixture.root,
      authoritative_preclaim_record_path: fixture.preclaimPath,
      expected_canonical_operation_sha256: "f".repeat(64),
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      now_ms: NOW_MS,
    });

    expect(first.private_claim_capability).toBeTruthy();
    expect(replay.private_claim_capability).toBeNull();
    expect(mismatch.private_claim_capability).toBeNull();
    expect(replay.redacted_receipt.claim_created_by_current_invocation).toBe(false);
    expect(mismatch.redacted_receipt.claim_created_by_current_invocation).toBe(false);
  });

  test("keeps the capability opaque, nonserializable, noncloneable, and same-process only", async () => {
    const fixture = await makeFixture();
    const { private_claim_capability: capability } = await issue(fixture);

    expect(capability).toBeTruthy();
    expect(() => JSON.stringify(capability)).toThrow("private_claim_capability_not_serializable");
    expect(() => structuredClone(capability)).toThrow();
    expect(Object.keys(capability)).toEqual(["capability_marker"]);
    expect(() => String(capability)).toThrow();
  });

  test("exposes only fixed non-introspective capability bridge statuses", async () => {
    const fixture = await makeFixture();
    const { private_claim_capability: capability } = await issue(fixture);
    const moduleNamespace = await import(pathToFileURL(CLAIM_WRITER_MODULE_PATH).href);
    expect(Object.keys(moduleNamespace)).not.toEqual(expect.arrayContaining([
      "inspectWelcomeAudioPrivateClaimCapability",
      "peekWelcomeAudioPrivateClaimCapability",
    ]));

    const registryIdentity = await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: fixture.root,
      policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
    });
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: registryIdentity.path,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    const readyRecord = await readWelcomeAudioOneShotRecordStable({
      filePath: paths.ready,
      registryIdentity,
    });
    const bindingStatus = verifyWelcomeAudioPrivateClaimCapabilityBinding({
      private_claim_capability: capability,
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256: fixture.expectedDigest,
    });
    const readyStatus = verifyWelcomeAudioPrivateClaimReadyBinding({
      private_claim_capability: capability,
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      ready_record_digest: readyRecord.digest,
      ready_record_metadata: readyRecord.metadata,
    });
    expect(bindingStatus).toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.FRESH);
    expect(readyStatus).toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.FRESH);
    expect(typeof bindingStatus).toBe("string");
    expect(typeof readyStatus).toBe("string");
    const publicBridgeOutput = JSON.stringify([bindingStatus, readyStatus]);
    expect(publicBridgeOutput).not.toContain(fixture.root);
    expect(publicBridgeOutput).not.toContain(fixture.expectedDigest);
    expect(publicBridgeOutput).not.toMatch(/claim_owner|claim_token|attempt_id|ready_metadata/);

    expect(consumeWelcomeAudioPrivateClaimCapability(capability))
      .toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW);
    expect(verifyWelcomeAudioPrivateClaimCapabilityBinding({
      private_claim_capability: capability,
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256: fixture.expectedDigest,
    })).toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.CONSUMED);
    expect(consumeWelcomeAudioPrivateClaimCapability(capability))
      .toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.ALREADY_CONSUMED);
    expect(verifyWelcomeAudioPrivateClaimCapabilityBinding({
      private_claim_capability: Object.freeze({}),
      registry_root: registryIdentity.path,
      registry_identity: registryIdentity,
      expected_canonical_operation_sha256: fixture.expectedDigest,
    })).toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CAPABILITY_STATUS.INVALID);
  });

  test.each(["symlink", "hardlink", "unsafe_mode"])(
    "blocks an unsafe authoritative PRECLAIM %s before claim issuance",
    async (variant) => {
      const fixture = await makeFixture();
      if (variant === "symlink") {
        const target = join(fixture.root, "synthetic-preclaim-target.json");
        await writeFile(target, `${JSON.stringify(fixture.preclaim)}\n`, {
          flag: "wx",
          mode: 0o600,
        });
        await unlink(fixture.preclaimPath);
        await symlink(target, fixture.preclaimPath);
      } else if (variant === "hardlink") {
        await link(fixture.preclaimPath, join(fixture.root, "synthetic-preclaim-alias.json"));
      } else {
        await chmod(fixture.preclaimPath, 0o644);
      }

      const result = await issue(fixture);
      expect(result.private_claim_capability).toBeNull();
      expect(result.redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_CLAIM_DECISION.BLOCKED,
        claim_created_by_current_invocation: false,
        ready_record_present: false,
        blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_INVALID],
      });
    },
  );

  test("never reclaims a stale claim mutex", async () => {
    const fixture = await makeFixture();
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    await mkdir(paths.mutex, { mode: 0o700 });
    await utimes(paths.mutex, new Date(0), new Date(0));

    const result = await issue(fixture);
    expect(result.private_claim_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_CLAIM_DECISION.BUSY,
      claim_created_by_current_invocation: false,
      blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.SERIALIZATION_BUSY],
    });
    expect((await lstat(paths.mutex)).isDirectory()).toBe(true);
    await expect(lstat(paths.ready)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test.each(["pending", "terminal"])(
    "treats preexisting %s evidence as permanent unknown/no-retry dominance",
    async (evidenceKind) => {
      const fixture = await makeFixture();
      const paths = buildWelcomeAudioOneShotStorePaths({
        registryRoot: fixture.root,
        expectedCanonicalOperationSha256: fixture.expectedDigest,
      });
      await writeFile(paths[evidenceKind as "pending" | "terminal"], "{}\n", {
        flag: "wx",
        mode: 0o600,
      });

      const result = await issue(fixture);
      expect(result.private_claim_capability).toBeNull();
      expect(result.redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL,
        claim_created_by_current_invocation: false,
        terminal_or_ambiguous_evidence_present: true,
        blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS],
      });
    },
  );

  test("distinguishes an in-flight READY temp under mutex from an abandoned partial publication", async () => {
    const fixture = await makeFixture();
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    await writeFile(join(fixture.root, `${paths.readyTempPrefix}partial`), "{}\n", {
      flag: "wx",
      mode: 0o600,
    });
    await mkdir(paths.mutex, { mode: 0o700 });

    const inFlight = await issue(fixture);
    expect(inFlight.private_claim_capability).toBeNull();
    expect(inFlight.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_CLAIM_DECISION.BUSY,
      claim_created_by_current_invocation: false,
      ready_record_present: false,
      terminal_or_ambiguous_evidence_present: false,
      blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.SERIALIZATION_BUSY],
    });

    await rm(paths.mutex, { recursive: true, force: false });

    const result = await issue(fixture);
    expect(result.private_claim_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_CLAIM_DECISION.UNKNOWN_TERMINAL,
      claim_created_by_current_invocation: false,
      ready_record_present: false,
      terminal_or_ambiguous_evidence_present: true,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.TERMINAL_AMBIGUOUS],
    });
    expect(validateWelcomeAudioClaimReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("rejects claim receipt key, privacy, and semantic tampering", async () => {
    const fixture = await makeFixture();
    const { redacted_receipt: receipt } = await issue(fixture);
    const { blocker_codes: _removed, ...missingField } = receipt;
    const tampered = [
      { ...receipt, unexpected: true },
      missingField,
      { ...receipt, canonical_operation_sha256: fixture.expectedDigest },
      { ...receipt, claim_owner_id: "synthetic-private-owner" },
      { ...receipt, claim_created_by_current_invocation: false },
      { ...receipt, ready_record_present: false },
      { ...receipt, blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID] },
    ];
    for (const candidate of tampered) {
      expect(validateWelcomeAudioClaimReceipt(candidate)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID,
      });
    }

    const blocked = (await issueWelcomeAudioClaim({
      registry_root: fixture.root,
      authoritative_preclaim_record_path: fixture.preclaimPath,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      registry_policy: "unsupported",
      now_ms: NOW_MS,
    })).redacted_receipt;
    expect(validateWelcomeAudioClaimReceipt(blocked)).toEqual({ ok: true, reason: null });
    for (const impossible of [
      {
        ...blocked,
        preclaim_guard_decision: WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
      },
      {
        ...blocked,
        blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.PRECLAIM_CHANGED],
      },
      {
        ...blocked,
        blocker_codes: [WELCOME_AUDIO_CLAIM_BLOCKER.READY_INVALID],
      },
    ]) {
      expect(validateWelcomeAudioClaimReceipt(impossible)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_CLAIM_BLOCKER.INPUT_INVALID,
      });
    }
  });

  test("a non-branded port consumes the durable claim and cannot later actuate", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const invalid = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: Object.freeze({
        surface: WELCOME_AUDIO_SURFACE.STATUS,
        surface_detail: WELCOME_AUDIO_SURFACE.DETAIL,
        execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      }),
      now_ms: NOW_MS,
    });
    expect(invalid).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claim_consumed_by_current_invocation: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATOR_INVALID],
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(invalid))
      .toEqual({ ok: true, reason: null });
    for (const impossible of [
      {
        ...invalid,
        effect_boundary_entered: true,
        send_control_actuation_count: 1,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
      },
      {
        ...invalid,
        terminal_guard_decision: WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CONFIRMATION_INVALID],
      },
      {
        ...invalid,
        pending_record_present: true,
        terminal_record_present: true,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_AMBIGUOUS],
      },
      {
        ...invalid,
        ready_guard_decision: WELCOME_AUDIO_GUARD_DECISION.READY,
        claim_consumed_by_current_invocation: false,
        pending_record_present: true,
        effect_boundary_entered: true,
        send_control_actuation_count: 1,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_INVALID],
      },
    ]) {
      expect(validateWelcomeAudioSafariOperationalReceipt(impossible)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID,
      });
    }

    const validPort = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    });
    const retry = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: validPort,
      now_ms: NOW_MS,
    });
    expect(retry).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claim_consumed_by_current_invocation: false,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(retry))
      .toEqual({ ok: true, reason: null });
  });

  test("normalizes an invalid-port ALREADY_CONSUMED race to CAPABILITY_INVALID", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const instrumented = await importInvalidPortRaceOperationalModule();
    let markGateReached!: () => void;
    let releaseGate!: () => void;
    const gateReached = new Promise<void>((resolveGateReached) => {
      markGateReached = resolveGateReached;
    });
    const gate = new Promise<void>((resolveGate) => {
      releaseGate = resolveGate;
    });
    (globalThis as any).__crmCoreInvalidPortGateReached = markGateReached;
    (globalThis as any).__crmCoreInvalidPortGate = gate;
    try {
      const attempt = instrumented.executeWelcomeAudioSafariAttempt({
        registry_root: fixture.root,
        private_claim_capability: claim.private_claim_capability,
        expected_canonical_operation_sha256: fixture.expectedDigest,
        branded_safari_actuator_port: Object.freeze({}),
        now_ms: NOW_MS,
      });
      await gateReached;
      expect(consumeWelcomeAudioPrivateClaimCapability(claim.private_claim_capability))
        .toBe(WELCOME_AUDIO_PRIVATE_CLAIM_CONSUME_STATUS.CONSUMED_NOW);
      releaseGate();
      const result = await attempt;
      expect(result).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claim_consumed_by_current_invocation: false,
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.CAPABILITY_INVALID],
      });
      expect(instrumented.validateWelcomeAudioSafariOperationalReceipt(result))
        .toEqual({ ok: true, reason: null });
    } finally {
      delete (globalThis as any).__crmCoreInvalidPortGateReached;
      delete (globalThis as any).__crmCoreInvalidPortGate;
    }
  });

  test("serializes simultaneous use of the same capability with at most one modeled actuation", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const ports = Array.from({ length: 2 }, () => createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    }));

    const receipts = await Promise.all(ports.map((port) => executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    })));

    expect(receipts.filter((item) => item.claim_consumed_by_current_invocation)).toHaveLength(1);
    expect(receipts.reduce(
      (total, item) => total + Number(item.effect_boundary_entered),
      0,
    )).toBeLessThanOrEqual(1);
    expect(receipts.reduce(
      (total, item) => total + item.send_control_actuation_count,
      0,
    )).toBeLessThanOrEqual(1);
    expect(receipts.every(
      (item) => validateWelcomeAudioSafariOperationalReceipt(item).ok,
    )).toBe(true);
    expect(receipts.every((item) => (
      item.decision !== WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BUSY
      || item.claim_consumed_by_current_invocation === true
    ))).toBe(true);
    expect(receipts.every((item) => (
      item.claim_consumed_by_current_invocation === true
      || item.decision === WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN
      || item.decision === WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED
    ))).toBe(true);
  });

  test("emits BUSY only when the mutex loser consumes now and normalizes later reuse to UNKNOWN", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    await mkdir(paths.mutex, { mode: 0o700 });
    const port = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    });

    const busy = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });
    expect(busy).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.BUSY,
      claim_consumed_by_current_invocation: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(busy))
      .toEqual({ ok: true, reason: null });

    await rm(paths.mutex, { recursive: true, force: false });
    const reuse = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });
    expect(reuse).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claim_consumed_by_current_invocation: false,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(reuse))
      .toEqual({ ok: true, reason: null });
  });

  test.each(["pending", "terminal"])(
    "consumes a fresh capability when preexisting %s evidence dominates, then reports replay consumption accurately",
    async (evidenceKind) => {
      const fixture = await makeFixture();
      const claim = await issue(fixture);
      const paths = buildWelcomeAudioOneShotStorePaths({
        registryRoot: fixture.root,
        expectedCanonicalOperationSha256: fixture.expectedDigest,
      });
      await writeFile(paths[evidenceKind as "pending" | "terminal"], "{}\n", {
        flag: "wx",
        mode: 0o600,
      });
      const port = createWelcomeAudioSafariActuatorPort({
        execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
        deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
      });

      const first = await executeWelcomeAudioSafariAttempt({
        registry_root: fixture.root,
        private_claim_capability: claim.private_claim_capability,
        expected_canonical_operation_sha256: fixture.expectedDigest,
        branded_safari_actuator_port: port,
        now_ms: NOW_MS,
      });
      expect(first).toMatchObject({
        decision: evidenceKind === "terminal"
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED
          : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claim_consumed_by_current_invocation: true,
        pending_record_present: evidenceKind === "pending",
        terminal_record_present: evidenceKind === "terminal",
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      });
      expect(validateWelcomeAudioSafariOperationalReceipt(first))
        .toEqual({ ok: true, reason: null });

      const replay = await executeWelcomeAudioSafariAttempt({
        registry_root: fixture.root,
        private_claim_capability: claim.private_claim_capability,
        expected_canonical_operation_sha256: fixture.expectedDigest,
        branded_safari_actuator_port: port,
        now_ms: NOW_MS,
      });
      expect(replay).toMatchObject({
        decision: first.decision,
        claim_consumed_by_current_invocation: false,
        pending_record_present: evidenceKind === "pending",
        terminal_record_present: evidenceKind === "terminal",
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      });
      expect(validateWelcomeAudioSafariOperationalReceipt(replay))
        .toEqual({ ok: true, reason: null });
    },
  );

  test("claim-writer import is inert and exposes no CLI, browser, network, or callback surface", async () => {
    const workdir = await mkdtemp(join(tmpdir(), "crm-core-welcome-claim-import-"));
    await chmod(workdir, 0o700);
    cleanupPaths.push(workdir);
    const before = await readdir(workdir);
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(pathToFileURL(CLAIM_WRITER_MODULE_PATH).href)});`,
    ], { cwd: workdir, maxBuffer: 1024 * 1024 });
    const after = await readdir(workdir);
    const source = await readFile(CLAIM_WRITER_MODULE_PATH, "utf8");
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1]);

    expect(stdout).toBe("");
    expect(stderr).toBe("");
    expect(before).toEqual([]);
    expect(after).toEqual([]);
    expect(imports).toEqual([
      "node:crypto",
      "node:path",
      "./crm-vnext-instagram-welcome-audio-operation-guard.mjs",
      "./crm-vnext-instagram-welcome-audio-one-shot-store.mjs",
    ]);
    expect(source).not.toMatch(/process\.argv|node:child_process|\bfetch\s*\(|XMLHttpRequest/);
    expect(source).not.toMatch(/playwright|puppeteer|selenium|globalThis\.browser|agent\.browsers/);
    expect(source).not.toMatch(/\bcallback\b|console\.(?:log|info|warn|error)/);
  });

  test("consumes the capability before one deterministic Safari boundary and publishes a confirmed tombstone", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const port = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    });

    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });
    const expectedTerminal = JSON.parse(await readFile(paths.ready, "utf8"));
    const attemptedAt = new Date(NOW_MS).toISOString();
    const checkedAt = new Date(NOW_MS + 1000).toISOString();
    expectedTerminal.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
    expectedTerminal.execution.send_attempt_count = 1;
    expectedTerminal.execution.attempt_state = WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL;
    expectedTerminal.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT;
    expectedTerminal.execution.retry_disposition = WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT;
    expectedTerminal.execution.claim_token_consumed_at = attemptedAt;
    expectedTerminal.execution.attempted_at = attemptedAt;
    expectedTerminal.confirmation.confirmation_marker =
      WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER;
    expectedTerminal.confirmation.bound_to_current_operation = true;
    expectedTerminal.confirmation.checked_at = checkedAt;
    const expectedGuard = validateWelcomeAudioOperation(expectedTerminal, {
      expectedCanonicalOperationSha256: fixture.expectedDigest,
      nowMs: NOW_MS + 1000,
    });
    expect(expectedGuard.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL);
    expect(expectedGuard.blockers).toEqual([WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY]);

    const receipt = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });

    expect(receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      claim_consumed_by_current_invocation: true,
      terminal_record_present: true,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
      blocker_codes: [],
    });
    expect(Object.keys(receipt).sort())
      .toEqual([...WELCOME_AUDIO_SAFARI_OPERATIONAL_RECEIPT_FIELDS].sort());
    expect(validateWelcomeAudioSafariOperationalReceipt(receipt))
      .toEqual({ ok: true, reason: null });

    const replay = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });
    expect(replay.decision).toBe(WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED);
    expect(replay.effect_boundary_entered).toBe(false);
    expect(replay.send_control_actuation_count).toBe(0);
  });

  test("terminalizes deterministic zero actuation with a validator-passing fail-closed receipt", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const port = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.ZERO_ACTUATION,
    });
    const paths = buildWelcomeAudioOneShotStorePaths({
      registryRoot: fixture.root,
      expectedCanonicalOperationSha256: fixture.expectedDigest,
    });

    const result = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });

    expect(result).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      ready_guard_decision: WELCOME_AUDIO_GUARD_DECISION.READY,
      terminal_guard_decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      claim_consumed_by_current_invocation: true,
      pending_record_present: false,
      terminal_record_present: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT],
    });
    const boundaryEntryCount = Number(result.effect_boundary_entered);
    expect(boundaryEntryCount).toBe(0);
    expect(validateWelcomeAudioSafariOperationalReceipt(result))
      .toEqual({ ok: true, reason: null });

    const terminalRecord = JSON.parse(await readFile(paths.terminal, "utf8"));
    expect(terminalRecord).toMatchObject({
      terminal_guard_decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      actuator_result: {
        bound_to_current_operation: true,
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      },
      terminal_snapshot: {
        effect_claim: {
          claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED,
        },
        execution: {
          send_attempt_count: 1,
          attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL,
          send_claim: WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED,
          retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
        },
      },
    });
    await expect(lstat(paths.pending)).rejects.toMatchObject({ code: "ENOENT" });

    for (const impossible of [
      { ...result, terminal_record_present: false },
      { ...result, claim_consumed_by_current_invocation: false },
      { ...result, terminal_guard_decision: null },
      { ...result, effect_boundary_entered: true },
      { ...result, send_control_actuation_count: 2 },
    ]) {
      expect(validateWelcomeAudioSafariOperationalReceipt(impossible)).toEqual({
        ok: false,
        reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID,
      });
    }
  });

  test("replays a zero-actuation terminal without later actuation or a second capability effect", async () => {
    const fixture = await makeFixture();
    const claim = await issue(fixture);
    const zeroPort = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.ZERO_ACTUATION,
    });
    const first = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: zeroPort,
      now_ms: NOW_MS,
    });
    expect(first).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claim_consumed_by_current_invocation: true,
      terminal_record_present: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT],
    });

    const strongPort = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.STRONG_CONFIRMED,
    });
    const replay = await executeWelcomeAudioSafariAttempt({
      registry_root: fixture.root,
      private_claim_capability: claim.private_claim_capability,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      branded_safari_actuator_port: strongPort,
      now_ms: NOW_MS,
    });
    expect(replay).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED,
      claim_consumed_by_current_invocation: false,
      terminal_record_present: true,
      effect_boundary_entered: false,
      send_control_actuation_count: 0,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(replay))
      .toEqual({ ok: true, reason: null });

    const repeatedClaim = await issue(fixture);
    expect(repeatedClaim.private_claim_capability).toBeNull();
    expect(repeatedClaim.redacted_receipt.claim_created_by_current_invocation).toBe(false);

    const independentFixture = await makeFixture();
    const independentClaim = await issue(independentFixture);
    const independentResult = await executeWelcomeAudioSafariAttempt({
      registry_root: independentFixture.root,
      private_claim_capability: independentClaim.private_claim_capability,
      expected_canonical_operation_sha256: independentFixture.expectedDigest,
      branded_safari_actuator_port: strongPort,
      now_ms: NOW_MS,
    });
    expect(independentResult).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.CONFIRMED,
      claim_consumed_by_current_invocation: true,
      effect_boundary_entered: true,
      send_control_actuation_count: 1,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(independentResult))
      .toEqual({ ok: true, reason: null });
  });

  test.each([
    ["pending-only promotion failure", false, true, false],
    ["terminal-plus-pending partial publication", true, false, true],
  ])(
    "preserves modeled boundary truth and evidence dominance after %s",
    async (_label, linkBeforeFailure, pendingPresent, terminalPresent) => {
      const fixture = await makeFixture();
      const claim = await issue(fixture);
      const instrumented = await importFaultInjectedOperationalModule({
        linkBeforeFailure,
      });
      const port = instrumented.createWelcomeAudioSafariActuatorPort({
        execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
        deterministic_scenario: WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY,
      });

      const first = await instrumented.executeWelcomeAudioSafariAttempt({
        registry_root: fixture.root,
        private_claim_capability: claim.private_claim_capability,
        expected_canonical_operation_sha256: fixture.expectedDigest,
        branded_safari_actuator_port: port,
        now_ms: NOW_MS,
      });
      expect(first).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claim_consumed_by_current_invocation: true,
        pending_record_present: pendingPresent,
        terminal_record_present: terminalPresent,
        effect_boundary_entered: true,
        send_control_actuation_count: 1,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
        external_effect_invoked: false,
        browser_used: false,
        network_used: false,
        production_ready: false,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.TERMINAL_INVALID],
      });
      expect(instrumented.validateWelcomeAudioSafariOperationalReceipt(first))
        .toEqual({ ok: true, reason: null });

      const second = await instrumented.executeWelcomeAudioSafariAttempt({
        registry_root: fixture.root,
        private_claim_capability: claim.private_claim_capability,
        expected_canonical_operation_sha256: fixture.expectedDigest,
        branded_safari_actuator_port: port,
        now_ms: NOW_MS,
      });
      expect(second).toMatchObject({
        decision: terminalPresent
          ? WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.REPLAYED
          : WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
        claim_consumed_by_current_invocation: false,
        effect_boundary_entered: false,
        send_control_actuation_count: 0,
        retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      });
      expect(instrumented.validateWelcomeAudioSafariOperationalReceipt(second))
        .toEqual({ ok: true, reason: null });
      expect(first.send_control_actuation_count + second.send_control_actuation_count).toBe(1);
    },
  );

  test.each([
    WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.NONE,
    WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.LATE,
    WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MISMATCHED,
    WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.THROW_AFTER_BOUNDARY,
    WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS,
  ])("terminalizes non-confirmed actuator scenario %s with no retry", async (scenario) => {
    const fixture = await makeFixture();
    const port = createWelcomeAudioSafariActuatorPort({
      execution_mode: WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
      deterministic_scenario: scenario,
    });

    const result = await runWelcomeAudioOperationalRailOnce({
      registry_root: fixture.root,
      authoritative_preclaim_record_path: fixture.preclaimPath,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });

    expect(result.claim_receipt.decision).toBe(WELCOME_AUDIO_CLAIM_DECISION.CREATED);
    expect(result.operational_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_OPERATIONAL_DECISION.UNKNOWN,
      claim_consumed_by_current_invocation: true,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      production_ready: false,
    });
    expect(validateWelcomeAudioSafariOperationalReceipt(result.operational_receipt))
      .toEqual(scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS
        ? { ok: false, reason: WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.INPUT_INVALID }
        : { ok: true, reason: null });
    if (scenario === WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO.MULTIPLE_ACTUATIONS) {
      expect(result.operational_receipt).toMatchObject({
        terminal_record_present: true,
        effect_boundary_entered: true,
        send_control_actuation_count: 2,
        blocker_codes: [WELCOME_AUDIO_SAFARI_OPERATIONAL_BLOCKER.ACTUATION_COUNT],
      });
    }

    const replay = await runWelcomeAudioOperationalRailOnce({
      registry_root: fixture.root,
      authoritative_preclaim_record_path: fixture.preclaimPath,
      expected_canonical_operation_sha256: fixture.expectedDigest,
      registry_policy: WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST,
      branded_safari_actuator_port: port,
      now_ms: NOW_MS,
    });
    expect(replay.operational_receipt).toBeNull();
    expect(replay.claim_receipt.claim_created_by_current_invocation).toBe(false);
  });
});
