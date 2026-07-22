import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST,
  createSyntheticSafariDriverForTest,
  inspectSyntheticSafariDriverForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs";
import {
  WELCOME_AUDIO_LIVE_STORE_MODE,
  createSyntheticWelcomeAudioLiveClaimStoreCapability,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256,
  computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs";
import {
  WELCOME_AUDIO_IAB_SEMANTIC_CANARY_REQUEST_SCHEMA_VERSION_V2,
  materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import {
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST,
  installWelcomeAudioIabSemanticRuntimeFacadeForTest,
  observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest,
  resetWelcomeAudioIabSemanticRuntimeFacadeForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs";
import {
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3,
  publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST,
  runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce,
  runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest as
    runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTestWithoutClockHarness,
  validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.mjs";

const NOW_MS = Date.now();
const TARGET = "synthetic.target_02";
const THREAD = "synthetic-thread-reference-02";
const OWNER = "synthetic.owner_02";
const cleanupPaths: string[] = [];
const execFile = promisify(execFileCallback);
let harnessOrdinal = 0;

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const createHarness = async (
  scenario = WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
  sourceSuffix = "",
) => {
  harnessOrdinal += 1;
  const assetRoot = await realpath(await mkdtemp(join(tmpdir(), "live-runner-asset-test-")));
  cleanupPaths.push(assetRoot);
  await chmod(assetRoot, 0o700);
  const audioBytes = Buffer.from("synthetic-runner-approved-audio", "utf8");
  const assetPath = join(assetRoot, "approved.m4a");
  await writeFile(assetPath, audioBytes, { mode: 0o600 });
  await chmod(assetPath, 0o600);
  const audioSha256 = createHash("sha256").update(audioBytes).digest("hex");
  let observed;
  let materialized;
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
  try {
    installWelcomeAudioIabSemanticRuntimeFacadeForTest({
      qualification_scenario:
        WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.EXACT_TWO_PAIRS,
      observation_scenario:
        WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.EXACT_CANDIDATE,
      finalize_scenario: "exact",
    });
    try {
      observed = await observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest({
        now_ms: NOW_MS,
      });
    } finally {
      resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
    }
    expect(observed.private_complete_source_capability).not.toBeNull();
    const artifactRoot = await realpath(await mkdtemp(join(
      tmpdir(),
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V3,
    )));
    cleanupPaths.push(artifactRoot);
    await chmod(artifactRoot, 0o700);
    const artifact = await publishSyntheticWelcomeAudioIabSemanticFollowerSourceArtifactV3ForTest({
      artifact_root: artifactRoot,
      private_complete_source_capability: observed.private_complete_source_capability,
      now_ms: NOW_MS,
    });
    expect(artifact.private_source_artifact_capability).not.toBeNull();
    materialized = materializeWelcomeAudioIabSemanticCanaryPacketDraftOnceForTest({
      private_source_artifact_capability: artifact.private_source_artifact_capability,
      packet_request: {
        schema_version: WELCOME_AUDIO_IAB_SEMANTIC_CANARY_REQUEST_SCHEMA_VERSION_V2,
        status: "approved_for_no_live_materialization_only",
        mission_id: "synthetic_iab_canary_mission_001",
        contract_version: "synthetic_iab_canary_contract_v2",
        central_repo_head: "7".repeat(40),
        authorization_id: `synthetic_iab_authorization_${sourceSuffix || harnessOrdinal}`,
        expected_source_mission_id:
          "crm_core_iab_semantic_source_to_safari_handoff_proof_v1_20260719",
        candidate_cap: 1,
        future_attempt_cap: 1,
        approved_audio_asset_id: "synthetic_runner_audio_001",
        approved_audio_sha256: audioSha256,
        approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
        execution_approval_authorized: false,
        external_effect_authorized: false,
      },
      now_ms: NOW_MS,
    });
  } finally {
    resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
    vi.useRealTimers();
  }
  expect(materialized.private_draft).not.toBeNull();
  expect(materialized.private_draft_admission_capability).not.toBeNull();
  const draft = materialized.private_draft!;
  const seed = {
    schema_version: "crm_core_instagram_welcome_audio_ui_attested_live_authorization_seed_v1",
    status: "approved_exact_single_send_seed",
    seed_nonce_sha256: createHash("sha256")
      .update(`synthetic-runner-seed-${harnessOrdinal}`)
      .digest("hex"),
    mission_contract_sha256: "8".repeat(64),
    active_next_action_id: "synthetic_runner_next_action_001",
    active_next_action_sha256: "9".repeat(64),
    approval_packet_id: "synthetic_runner_approval_001",
    approved_audio_asset_path: assetPath,
    expected_central_repo_head: draft.central_repo_head,
    expected_draft_sha256: computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft),
    expected_projection_sha256:
      computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(draft.source_projection),
    expected_operation_id: draft.operation_id,
    expected_authorization_id: draft.authorization_id,
    expected_source_evidence_sha256: draft.source_projection.source_evidence_sha256,
    expected_candidate_anchor_sha256:
      draft.source_projection.anchors.candidate_anchor_sha256,
    expected_thread_anchor_sha256: draft.source_projection.anchors.thread_anchor_sha256,
    expected_owner_anchor_sha256: draft.source_projection.anchors.owner_anchor_sha256,
    expected_dedupe_anchor_sha256: draft.source_projection.anchors.dedupe_anchor_sha256,
    expected_audio_sha256: draft.approved_audio_sha256,
    approved_at: new Date(NOW_MS - 15_000).toISOString(),
    expires_at: new Date(NOW_MS + 285_000).toISOString(),
  };
  const authorityRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  )));
  cleanupPaths.push(authorityRoot);
  await chmod(authorityRoot, 0o700);
  const claimRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    "crm-core-welcome-audio-live-claim-store-test-",
  )));
  cleanupPaths.push(claimRoot);
  await chmod(claimRoot, 0o700);
  const storeCapability = await createSyntheticWelcomeAudioLiveClaimStoreCapability({
    store_root: claimRoot,
  });
  const driver = createSyntheticSafariDriverForTest({ scenario });
  return {
    assetPath,
    audioSha256,
    authorityRoot,
    claimRoot,
    draft,
    draftAdmissionCapability: materialized.private_draft_admission_capability,
    driver,
    seed,
    storeCapability,
  };
};

const syntheticInput = (item: Awaited<ReturnType<typeof createHarness>>) => ({
  draft_admission_capability: item.draftAdmissionCapability,
  private_authorization_seed: item.seed,
  authority_root: item.authorityRoot,
  private_store_capability: item.storeCapability,
  driver: item.driver,
  synthetic_store_root: item.claimRoot,
  now_ms: NOW_MS,
  synthetic_claim_now_ms: NOW_MS + 100,
  synthetic_prepare_now_ms: NOW_MS + 200,
  synthetic_pending_now_ms: NOW_MS + 1_000,
  synthetic_entry_now_ms: NOW_MS + 1_100,
  synthetic_preupload_now_ms: NOW_MS + 1_200,
  synthetic_attempted_at_ms: NOW_MS + 1_500,
  synthetic_confirmation_now_ms: NOW_MS + 2_000,
  synthetic_terminal_now_ms: NOW_MS + 2_100,
  synthetic_runner_fault_scenario:
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST.NONE,
  synthetic_fault_scenario:
    WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.NONE,
});

const runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest = async (
  input: ReturnType<typeof syntheticInput>,
) => {
  vi.useFakeTimers();
  vi.setSystemTime(input.now_ms);
  try {
    return await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTestWithoutClockHarness(
      input,
    );
  } finally {
    vi.useRealTimers();
  }
};

describe("UI-attested one-shot live canary runner", () => {
  test("imports inertly and exposes only the capability-plus-seed live namespace", async () => {
    const isolatedHome = await realpath(await mkdtemp(join(tmpdir(), "runner-inert-home-")));
    cleanupPaths.push(isolatedHome);
    await chmod(isolatedHome, 0o700);
    const moduleUrl = pathToFileURL(join(
      process.cwd(),
      "scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.mjs",
    )).href;
    const childScript = `
      let runtimeReads = 0;
      Object.defineProperty(globalThis, Symbol.for('openai.computer-use.runtime'), {
        configurable: true,
        get() { runtimeReads += 1; throw new Error('runtime_read_during_import'); },
      });
      const namespace = await import(${JSON.stringify(moduleUrl)});
      if (runtimeReads !== 0) process.exit(31);
      if (typeof namespace.runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce !== 'function') {
        process.exit(32);
      }
      process.stdout.write('fresh_import_inert');
    `;
    const imported = await execFile(process.execPath, [
      "--input-type=module",
      "--eval",
      childScript,
    ], {
      cwd: process.cwd(),
      env: { HOME: isolatedHome, PATH: "" },
      maxBuffer: 64 * 1024,
      timeout: 10_000,
    });
    expect(imported.stdout).toBe("fresh_import_inert");
    expect(await readdir(isolatedHome)).toEqual([]);
    const item = await createHarness();
    const result = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      private_draft: item.draft,
      private_authorization_seed: item.seed,
      driver: item.driver,
    } as any);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_input_invalid"],
      external_effect_possible: false,
      retry_forbidden_permanently: false,
    });
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt({
      ...result.redacted_receipt,
      external_effect_possible: true,
    })).toEqual({ ok: false });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test("keeps the legacy raw draft path nonproductive in the live export", async () => {
    const item = await createHarness();
    const result = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      private_draft: item.draft,
      private_authorization_seed: item.seed,
    } as any);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_input_invalid"],
      preclaim_start_gates_validated: false,
      external_effect_possible: false,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test("rejects forged draft-admission capabilities before any live source read", async () => {
    const item = await createHarness();
    const result = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      draft_admission_capability: Object.freeze({}),
      private_authorization_seed: item.seed,
    });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_draft_admission_invalid"],
      preclaim_start_gates_validated: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test.each([
    "audio_validated",
    "preclaim_start_gates_validated",
    "preclaim_observed",
    "preclaim_built",
    "authority_publication_attempted",
    "authority_published",
    "authority_opened",
    "operation_context_validated",
    "composite_invoked",
    "confirmation_proven",
    "external_effect_possible",
    "retry_forbidden_permanently",
  ])("DRAFT_ADMISSION_INVALID rejects impossible progress at %s", async (field) => {
    const item = await createHarness();
    const result = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      draft_admission_capability: Object.freeze({}),
      private_authorization_seed: item.seed,
    });
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt({
      ...result.redacted_receipt,
      [field]: true,
    })).toEqual({ ok: false });
  });

  test("receipt decisions reject blockers from unreachable lifecycle phases", async () => {
    const item = await createHarness();
    const early = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      draft_admission_capability: Object.freeze({}),
      private_authorization_seed: item.seed,
    });
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt({
      ...early.redacted_receipt,
      decision:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.TERMINAL_ZERO_EFFECT,
      authority_publication_attempted: true,
      retry_forbidden_permanently: true,
    })).toEqual({ ok: false });

    const publicationItem = await createHarness();
    const terminal = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest({
      ...syntheticInput(publicationItem),
      synthetic_runner_fault_scenario:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST
          .AUTHORITY_PUBLICATION_RESULT_LOST,
    });
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt({
      ...terminal.redacted_receipt,
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      authority_publication_attempted: false,
      retry_forbidden_permanently: false,
    })).toEqual({ ok: false });
  });

  test("the fixed runner burns and rejects a synthetic admission capability", async () => {
    const item = await createHarness();
    const fixed = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      draft_admission_capability: item.draftAdmissionCapability,
      private_authorization_seed: item.seed,
    });
    expect(fixed.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_draft_admission_invalid"],
      preclaim_start_gates_validated: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
    });
    const replay = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    expect(replay.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_draft_admission_invalid"],
      preclaim_start_gates_validated: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test.each([
    ["driver", Object.freeze({})],
    ["url", "https://example.invalid/"],
    ["selector", "synthetic-selector"],
    ["identity", "synthetic-identity"],
    ["thread", "synthetic-thread"],
    ["owner", "synthetic-owner"],
    ["now_ms", NOW_MS],
    ["profile_to_thread_binding", true],
    ["follows_owner", true],
  ])("rejects caller-controlled live field %s", async (field, value) => {
    const item = await createHarness();
    const result = await runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce({
      draft_admission_capability: Object.freeze({}),
      private_authorization_seed: item.seed,
      [field]: value,
    } as any);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_input_invalid"],
      preclaim_start_gates_validated: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test("chains the complete synthetic rail to one strongly confirmed terminal", async () => {
    const item = await createHarness();
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt(result.redacted_receipt))
      .toEqual({ ok: true });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.CONFIRMED,
      audio_validated: true,
      preclaim_start_gates_validated: true,
      preclaim_observed: true,
      preclaim_built: true,
      authority_publication_attempted: true,
      authority_published: true,
      authority_opened: true,
      operation_context_validated: true,
      composite_invoked: true,
      confirmation_proven: true,
      external_effect_possible: true,
      retry_forbidden_permanently: true,
      text_sent: false,
      follow_back_invoked: false,
      mailerlite_invoked: false,
      campaign_touched: false,
    });
    const driver = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    expect(driver?.action_count).toBe(6);
    expect(await readdir(item.claimRoot)).toHaveLength(2);
  });

  test("blocks prior-audio ambiguity before authority, claim, chooser, or Send", async () => {
    const item = await createHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.PRIOR_AUDIO_PRESENT,
    );
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt(result.redacted_receipt))
      .toEqual({ ok: true });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      blocker_codes: ["blocked_live_canary_runner_preclaim_observation_invalid"],
      preclaim_start_gates_validated: true,
      authority_published: false,
      composite_invoked: false,
      external_effect_possible: false,
    });
    expect(await readdir(item.authorityRoot)).toEqual([]);
    expect(await readdir(item.claimRoot)).toEqual([]);
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 1,
    });
  });

  test("blocks an unhealthy authority start gate before any Safari state read", async () => {
    const item = await createHarness();
    await writeFile(join(item.authorityRoot, "unexpected"), "synthetic", { mode: 0o600 });
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt(result.redacted_receipt))
      .toEqual({ ok: true });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      preclaim_start_gates_validated: false,
      preclaim_observed: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
    expect(await readdir(item.claimRoot)).toEqual([]);
  });

  test("burns a cross-draft seed before any Safari read and forbids later reuse", async () => {
    const intended = await createHarness();
    const other = await createHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
      "other",
    );
    const mismatched = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest({
      ...syntheticInput(other),
      private_authorization_seed: intended.seed,
    });
    expect(mismatched.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
      preclaim_start_gates_validated: false,
      preclaim_observed: false,
      authority_publication_attempted: false,
      external_effect_possible: false,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: other.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });

    const replay = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(intended),
    );
    expect(replay.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED);
    expect(inspectSyntheticSafariDriverForTest({ driver: intended.driver })).toEqual({
      stage: "thread",
      action_count: 0,
      state_read_count: 0,
    });
  });

  test("a lost publication result leaves occupied authority terminal and no-retry", async () => {
    const item = await createHarness();
    const input = {
      ...syntheticInput(item),
      synthetic_runner_fault_scenario:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST
          .AUTHORITY_PUBLICATION_RESULT_LOST,
    };
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(input);
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt(result.redacted_receipt))
      .toEqual({ ok: true });
    expect(result.redacted_receipt).toMatchObject({
      decision:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.TERMINAL_ZERO_EFFECT,
      authority_publication_attempted: true,
      authority_published: false,
      composite_invoked: false,
      external_effect_possible: false,
      retry_forbidden_permanently: true,
    });
    expect(await readdir(item.authorityRoot)).toHaveLength(1);
    expect(await readdir(item.claimRoot)).toEqual([]);
    const driverAfterFirst = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    const replay = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(input);
    expect(replay.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED);
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual(driverAfterFirst);
  });

  test("replay cannot produce a second synthetic actuation", async () => {
    const item = await createHarness();
    const input = syntheticInput(item);
    const first = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(input);
    const afterFirst = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    const second = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(input);
    const afterSecond = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    expect(first.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.CONFIRMED);
    expect(second.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED);
    expect(afterSecond).toEqual(afterFirst);
  });

  test("keeps a post-PENDING preupload ambiguity terminal with no retry", async () => {
    const item = await createHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.DRAFT_TEXT_BEFORE_SEND,
    );
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt(result.redacted_receipt))
      .toEqual({ ok: true });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.UNKNOWN,
      authority_publication_attempted: true,
      composite_invoked: true,
      confirmation_proven: false,
      external_effect_possible: true,
      retry_forbidden_permanently: true,
    });
    expect(validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt({
      ...result.redacted_receipt,
      external_effect_possible: false,
    })).toEqual({ ok: false });
  });

  test("receipts never contain synthetic private bindings", async () => {
    const item = await createHarness();
    const result = await runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest(
      syntheticInput(item),
    );
    const serialized = JSON.stringify(result.redacted_receipt);
    for (const privateValue of [
      TARGET,
      THREAD,
      OWNER,
      item.assetPath,
      item.draft.operation_id,
      item.audioSha256,
      "2026-07-18",
    ]) expect(serialized).not.toContain(privateValue);
    expect(WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY)
      .toBe("synthetic_temp_test_only");
  });
});
