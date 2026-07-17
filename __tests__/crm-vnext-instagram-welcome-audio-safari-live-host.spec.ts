import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE,
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioSealedManifestSha256,
  createSyntheticWelcomeAudioLiveAuthorityCapability,
  createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability,
  validateWelcomeAudioLiveOperationContext,
  validateWelcomeAudioUiAttestedLiveOperationContext,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";
import {
  WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION,
  WELCOME_AUDIO_LIVE_CLAIM_DECISION,
  WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_OBSERVATION_DECISION,
  WELCOME_AUDIO_LIVE_STORE_MODE,
  WELCOME_AUDIO_LIVE_ATTEMPT_DECISION,
  WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST,
  claimWelcomeAudioLiveReplyObservation,
  claimWelcomeAudioLiveReplyObservationForTest,
  claimNextWelcomeAudioLiveManifestInspection,
  consumeWelcomeAudioLiveReplyObservationCapabilityOnce,
  createSyntheticWelcomeAudioLiveClaimStoreCapability,
  configureWelcomeAudioLiveTerminalVerifierScenarioForTest,
  enterWelcomeAudioLiveAttemptBoundary,
  finalizeWelcomeAudioLiveAttempt,
  issueWelcomeAudioLiveClaim,
  recoverWelcomeAudioLivePendingAttemptAfterOwnerExit,
  recordWelcomeAudioLiveInspectionResult,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs";
import {
  WELCOME_AUDIO_ADAPTER_VERSION,
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_BUSINESS_ELIGIBILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_CLASS,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
  buildWelcomeAudioCanonicalOperationDigest,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";
import {
  SAFARI_APP_ID,
  WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS,
  WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER,
  WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE,
  WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS,
  consumeWelcomeAudioSafariSyntheticAttemptEvidenceCapabilityOnceForTest as consumeWelcomeAudioSafariAttemptEvidenceCapabilityOnce,
  consumeWelcomeAudioSafariSyntheticVisualConfirmationCapabilityOnceForTest as consumeWelcomeAudioSafariVisualConfirmationCapabilityOnce,
  configureSyntheticSafariPendingModeTamperAfterFinalFreshStateForTest,
  createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest,
  createSyntheticSafariDriverForTest,
  executeWelcomeAudioSafariSyntheticPostPendingForTest as executeWelcomeAudioSafariLivePostPending,
  inspectInstalledComputerUseRuntimeBindingForTest,
  inspectInstalledComputerUseRuntimeReplacementResistanceForTest,
  inspectSyntheticLiveSafariStateForTest,
  inspectSyntheticSafariDriverForTest,
  prepareWelcomeAudioSafariSyntheticTargetForTest as prepareWelcomeAudioSafariLiveTarget,
  runWelcomeAudioSafariSyntheticCompositeOnceForTest,
  runWelcomeAudioSafariLiveCompositeOnce,
  runWelcomeAudioSafariUiAttestedLiveCompositeOnce,
  runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest,
  validateWelcomeAudioSafariLiveCompositeReceipt,
  validateWelcomeAudioSafariLiveHostReceipt,
  validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import * as uiAttestedMaterializer from
  "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import * as uiAttestedPublisher from
  "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs";

const cleanupPaths: string[] = [];
const MISSION_ID = "synthetic_live_claim_mission";
const CONTRACT_VERSION = "synthetic_live_contract_v1";
const OPERATION_ID = "synthetic_live_operation_001";
const APPROVAL_PACKET_ID = "synthetic_live_approval_001";
const CENTRAL_HEAD = "a".repeat(40);
const THREAD_SHA = "b".repeat(64);
const OWNER_SHA = "c".repeat(64);
const PROFILE_SHA = "d".repeat(64);
const SOURCE_SHA = "e".repeat(64);
const ASSET_ID = "synthetic_welcome_audio_asset_001";
const MISSION_CONTRACT_SHA = "9".repeat(64);
const APPROVAL_BINDING_SHA = "7".repeat(64);
const CONTEXT_NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const PENDING_AT_MS = CONTEXT_NOW_MS + 1_000;
const ENTRY_AT_MS = CONTEXT_NOW_MS + 1_100;
const PREUPLOAD_AT_MS = CONTEXT_NOW_MS + 1_200;
const ATTEMPTED_AT_MS = CONTEXT_NOW_MS + 1_500;
const CONFIRMATION_AT_MS = CONTEXT_NOW_MS + 2_000;
const ATTEMPT_NONCE = "4".repeat(64);
const MODULE_PATH = resolve(
  process.cwd(),
  "scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs",
);

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

describe("UI-attested Safari sibling composite", () => {
  test("owns one synthetic claim through stable PENDING and one confirmed Send", async () => {
    const item = await createUiAttestedCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runUiAttestedComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.CONFIRMED,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      pending_durable: true,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      terminal_durable: true,
      confirmation_proven: true,
      retry_forbidden_permanently: true,
      blocker_codes: [],
    });
    const names = await readdir(item.claimRoot);
    expect(names.filter((name) => name.startsWith("claim-"))).toHaveLength(1);
    expect(names.filter((name) => name.startsWith("pending-"))).toHaveLength(0);
    expect(names.filter((name) => name.startsWith("terminal-"))).toHaveLength(1);
    const terminal = JSON.parse(await readFile(
      join(item.claimRoot, names.find((name) => name.startsWith("terminal-"))!),
      "utf8",
    ));
    expect(terminal).toMatchObject({
      authority_family: "ui_attested_single_recipient",
      mission_slot: 1,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      outcome: "confirmed_exact_thread_new_audio_terminal_no_retry",
    });
    expect(terminal).not.toHaveProperty("manifest_sha256");
    expect(terminal).not.toHaveProperty("campaign_interval_sha256");
  });

  test("a preparation failure leaves the UI claim permanent with no cancellation or Send", async () => {
    const item = await createUiAttestedCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.MIXED_OR_PRIVATE_SURFACE,
    );
    const result = await runUiAttestedComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      pending_durable: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      terminal_durable: false,
      confirmation_proven: false,
      external_effect_possible: false,
      retry_forbidden_permanently: true,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.PREPARE_BLOCKED],
    });
    const names = await readdir(item.claimRoot);
    expect(names.filter((name) => name.startsWith("claim-"))).toHaveLength(1);
    expect(names.some((name) => name.startsWith("pending-"))).toBe(false);
    expect(names.some((name) => name.startsWith("terminal-"))).toBe(false);
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(0);
  });

  test.each([
    [WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SENT_MARKER_ONLY, {}],
    [WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.COMPOSE_RESET_ONLY, {}],
    [WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SEND_ACTION_THROWS, {}],
    [WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE, {
      synthetic_confirmation_now_ms:
        UI_ATTESTED_ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      synthetic_terminal_now_ms:
        UI_ATTESTED_ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS + 1,
    }],
  ])("terminalizes UI post-PENDING ambiguity with no retry: %s", async (scenario, clocks) => {
    const item = await createUiAttestedCompositeHarness(scenario as Scenario);
    const result = await runUiAttestedComposite(item, clocks);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.UNKNOWN,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      pending_durable: true,
      terminal_durable: true,
      confirmation_proven: false,
      retry_forbidden_permanently: true,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.POST_PENDING_UNKNOWN],
    });
    expect((await readdir(item.claimRoot)).filter(
      (name) => name.startsWith("terminal-"),
    )).toHaveLength(1);
  });

  test("a lost confirmed return is permanently deduped with zero additional Send", async () => {
    const item = await createUiAttestedCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runUiAttestedComposite(item);
    const before = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    await refreshUiAttestedCompositeOperation(item, UI_ATTESTED_NOW_MS + 3_000);
    const replay = await runUiAttestedComposite(item, {
      synthetic_claim_now_ms: UI_ATTESTED_NOW_MS + 3_100,
    });
    expect(replay.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      external_effect_possible: false,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.CLAIM_BLOCKED],
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual(before);
  });

  test("keeps UI and sealed receipts, capabilities, and public validators family-exact", async () => {
    const uiItem = await createUiAttestedCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const ui = await runUiAttestedComposite(uiItem);
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(ui.redacted_receipt).ok).toBe(false);
    const sealedItem = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const sealed = await runComposite(sealedItem);
    expect(validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt(
      sealed.redacted_receipt,
    ).ok).toBe(false);
  });

  test("the UI live wrapper rejects caller driver, store, clocks, callbacks, and outcomes", async () => {
    const empty = await runWelcomeAudioSafariUiAttestedLiveCompositeOnce({});
    expect(validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt(empty.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(empty.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      external_effect_possible: false,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.INPUT_INVALID],
    });
    for (const input of [
      { driver: {} },
      { private_store_capability: {} },
      { now_ms: UI_ATTESTED_NOW_MS },
      { callback: () => true },
      { outcome: "confirmed" },
    ]) {
      const result = await runWelcomeAudioSafariUiAttestedLiveCompositeOnce(input);
      expect(result.redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
        claim_created: false,
        external_effect_possible: false,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.INPUT_INVALID],
      });
      expect(validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt(
        result.redacted_receipt,
      )).toEqual({ ok: true, reason: null });
    }
  });

  test("the UI live dispatch shares the synthetic sequence but owns store, Safari, and clocks", async () => {
    const source = await readFile(MODULE_PATH, "utf8");
    expect(source).toMatch(
      /const runWelcomeAudioSafariUiAttestedLiveCompositeOnce = async[\s\S]*?UI_ATTESTED_COMPOSITE_LIVE_FIELDS[\s\S]*?runWelcomeAudioSafariUiAttestedCompositeInternal\(\{[\s\S]*?synthetic: false/u,
    );
    expect(source).toMatch(
      /const runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest = async[\s\S]*?runWelcomeAudioSafariUiAttestedCompositeInternal\(\{[\s\S]*?synthetic: true/u,
    );
    expect(source).toContain(": await openFixedWelcomeAudioLiveClaimStore()");
    expect(source).toContain("createInstalledComputerUseSafariUiAttestedLiveHostCapability(");
    expect(source).toMatch(/now_ms: synthetic \? input\.synthetic_claim_now_ms : Date\.now\(\)/u);
    expect(source).toMatch(/entered_at_ms: synthetic \? input\.synthetic_pending_now_ms : Date\.now\(\)/u);
    expect(source).not.toMatch(/UI_ATTESTED_COMPOSITE_LIVE_FIELDS[\s\S]{0,700}'driver'/u);
    expect(source).not.toMatch(/UI_ATTESTED_COMPOSITE_LIVE_FIELDS[\s\S]{0,700}'private_store_capability'/u);
  });
});

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

const manifestFixture = () => {
  const campaignInterval = {
    schema_version: WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
    start_at: "2026-07-13T12:00:00.000Z",
    end_at: "2026-07-14T12:00:00.000Z",
  };
  const campaignIntervalSha256 = computeWelcomeAudioCampaignIntervalSha256(campaignInterval);
  const exactTarget = "Synthetic.Target+1@Example.COM";
  const manifest = {
    schema_version: WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
    identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    campaign_interval_sha256: campaignIntervalSha256,
    ordered_records: [{
      ordinal: 1,
      identity_anchor_sha256: computeWelcomeAudioExactIdentityAnchorSha256(exactTarget),
      followed_at: "2026-07-13T13:00:00.000Z",
      campaign_interval_sha256: campaignIntervalSha256,
    }],
  };
  return {
    campaignInterval,
    campaignIntervalSha256,
    exactTarget,
    manifest,
    manifestSha256: computeWelcomeAudioSealedManifestSha256(manifest),
  };
};

const createSyntheticAsset = async () => {
  const root = await realpath(await mkdtemp(join(
    tmpdir(),
    "crm-core-live-host-approved-audio-test-",
  )));
  cleanupPaths.push(root);
  const assetPath = join(root, "synthetic-approved-audio.m4a");
  const bytes = Buffer.from("synthetic approved audio fixture only", "utf8");
  await writeFile(assetPath, bytes, { mode: 0o600 });
  return { assetPath, audioSha256: sha256(bytes) };
};

const createAuthority = async ({
  fixture,
  assetPath,
  audioSha256,
}: {
  fixture: ReturnType<typeof manifestFixture>;
  assetPath: string;
  audioSha256: string;
}) => {
  const root = await realpath(await mkdtemp(join(
    tmpdir(),
    "crm-core-welcome-audio-live-authority-test-",
  )));
  cleanupPaths.push(root);
  await chmod(root, 0o700);
  const approval = {
    schema_version: WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
    status: "approved_for_bounded_live_canary",
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    active_next_action_id: "synthetic_welcome_audio_canary",
    active_next_action_sha256: "8".repeat(64),
    central_repo_head: CENTRAL_HEAD,
    approval_packet_id: APPROVAL_PACKET_ID,
    manifest_sha256: fixture.manifestSha256,
    campaign_interval_sha256: fixture.campaignIntervalSha256,
    approved_audio_asset_path: assetPath,
    approved_audio_asset_sha256: audioSha256,
    inspection_cap: 8,
    mission_claim_cap: 3,
    per_candidate_send_cap: 1,
    stage_1_confirmation_required: true,
    execution_browser: "safari",
    text_fallback: "forbidden",
    campaign_effect_allowed: false,
    approved_at: "2026-07-14T15:55:00.000Z",
    expires_at: "2026-07-14T17:00:00.000Z",
    operation_bindings: [{
      manifest_ordinal: 1,
      operation_id: OPERATION_ID,
      exact_target_utf8: fixture.exactTarget,
      identity_anchor_sha256: fixture.manifest.ordered_records[0].identity_anchor_sha256,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
    }],
  };
  await Promise.all([
    writeFile(join(root, "execution-approval-v1.json"), `${JSON.stringify(approval)}\n`, {
      mode: 0o600,
    }),
    writeFile(
      join(root, "sealed-backlog-manifest-v1.json"),
      `${JSON.stringify(fixture.manifest)}\n`,
      { mode: 0o600 },
    ),
    writeFile(
      join(root, "campaign-interval-v1.json"),
      `${JSON.stringify(fixture.campaignInterval)}\n`,
      { mode: 0o600 },
    ),
  ]);
  return createSyntheticWelcomeAudioLiveAuthorityCapability({
    authority_root: root,
    now_ms: CONTEXT_NOW_MS,
  });
};

const bindCanonicalDigest = (input: Record<string, any>) => {
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

const operationFixture = ({
  fixture,
  audioSha256,
}: {
  fixture: ReturnType<typeof manifestFixture>;
  audioSha256: string;
}) => {
  const identitySha = fixture.manifest.ordered_records[0].identity_anchor_sha256;
  return bindCanonicalDigest({
    adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
    contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
    canonical_operation_sha256: "0".repeat(64),
    operation: {
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: MISSION_ID,
      source_event_anchor_sha256: SOURCE_SHA,
      profile_anchor_sha256: PROFILE_SHA,
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: audioSha256,
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
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: audioSha256,
      source_recency_max_age_ms: 14 * 24 * 60 * 60 * 1000,
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
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG,
      observed_at: fixture.manifest.ordered_records[0].followed_at,
      time_bucket: "sealed_campaign_interval",
      source_recency_max_age_ms: 14 * 24 * 60 * 60 * 1000,
      source_event_anchor_sha256: SOURCE_SHA,
    },
    binding: {
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG,
      source_to_profile: "exact",
      profile_to_thread: "exact",
      follows_owner: "confirmed",
      ambiguity: "clear",
      source_event_anchor_sha256: SOURCE_SHA,
      profile_anchor_sha256: PROFILE_SHA,
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      observed_at: "2026-07-14T15:58:20.000Z",
    },
    eligibility: {
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER,
      audio_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      composer_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      attachment_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
      text_fallback: "forbidden",
      observed_at: "2026-07-14T15:58:30.000Z",
    },
    asset: {
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: audioSha256,
      asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE,
      preview_status: "approved_file_validated_before_upload",
      preview_audio_asset_id: ASSET_ID,
      preview_audio_asset_sha256: audioSha256,
      preview_thread_anchor_sha256: THREAD_SHA,
      preview_observed_at: "2026-07-14T15:58:40.000Z",
    },
    context: {
      status: "fresh_exact_central_mission_context",
      checked_at: "2026-07-14T15:57:00.000Z",
      central_repo_head: CENTRAL_HEAD,
      expected_central_repo_head: CENTRAL_HEAD,
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
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_sha256: audioSha256,
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
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      approved_audio_asset_id: ASSET_ID,
      approved_audio_asset_sha256: audioSha256,
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
      candidate_anchor_sha256: identitySha,
      thread_anchor_sha256: THREAD_SHA,
      approved_audio_asset_sha256: audioSha256,
      claim_owner_id: null,
      claim_token_id: null,
      claim_registry_revision: null,
      attempt_id: null,
      bound_to_current_operation: false,
      checked_at: null,
    },
    source_provenance: {
      source_class: WELCOME_AUDIO_SOURCE_CLASS.SEALED_PAUSED_CAMPAIGN_BACKLOG_MEMBER,
      manifest_digest_sha256: fixture.manifestSha256,
      campaign_interval_digest_sha256: fixture.campaignIntervalSha256,
      manifest_record_index: 0,
      manifest_record_count: 1,
      source_event_anchor_sha256: SOURCE_SHA,
    },
  });
};

type Scenario = typeof WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST[keyof typeof WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST];

const createHarness = async ({
  scenario = WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
  exactTargetOverride,
  threadShaOverride,
  prepare = true,
}: {
  scenario?: Scenario;
  exactTargetOverride?: string;
  threadShaOverride?: string;
  prepare?: boolean;
} = {}) => {
  const fixture = manifestFixture();
  const asset = await createSyntheticAsset();
  const authority = await createAuthority({ fixture, ...asset });
  const operationSnapshot = operationFixture({ fixture, audioSha256: asset.audioSha256 });
  const operation = await validateWelcomeAudioLiveOperationContext({
    operation_snapshot: operationSnapshot,
    private_authority_capability: authority.private_authority_capability,
    private_audio_asset_capability: authority.private_audio_asset_capability,
    expected_canonical_operation_sha256: operationSnapshot.canonical_operation_sha256,
    expected_mission_id: MISSION_ID,
    expected_contract_version: CONTRACT_VERSION,
    expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
    expected_approval_packet_id: APPROVAL_PACKET_ID,
    expected_operation_id: OPERATION_ID,
    expected_central_repo_head: CENTRAL_HEAD,
    expected_manifest_sha256: fixture.manifestSha256,
    expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
    expected_identity_anchor_sha256: fixture.manifest.ordered_records[0].identity_anchor_sha256,
    expected_thread_anchor_sha256: THREAD_SHA,
    expected_owner_anchor_sha256: OWNER_SHA,
    expected_audio_sha256: asset.audioSha256,
    expected_manifest_ordinal: 1,
    private_manifest_capability: authority.private_manifest_capability,
    now_ms: CONTEXT_NOW_MS,
  });
  expect(operation.private_target_binding_capability).not.toBeNull();
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
  const identitySha = fixture.manifest.ordered_records[0].identity_anchor_sha256;
  let prepared = null;
  if (prepare) {
    const host = createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest({
      driver,
      private_audio_asset_capability: authority.private_audio_asset_capability,
      pending_store_root: claimRoot,
    });
    prepared = await prepareWelcomeAudioSafariLiveTarget({
      private_live_host_capability: host,
      private_target_binding_capability: operation.private_target_binding_capability,
      exact_target: exactTargetOverride ?? fixture.exactTarget,
      expected_mission_id: MISSION_ID,
      expected_operation_id: OPERATION_ID,
      expected_identity_anchor_sha256: identitySha,
      expected_thread_anchor_sha256: threadShaOverride ?? THREAD_SHA,
      expected_audio_sha256: asset.audioSha256,
      now_ms: CONTEXT_NOW_MS,
    });
  }
  return {
    ...asset,
    fixture,
    authority,
    operation,
    operationSnapshot,
    claimRoot,
    storeCapability,
    driver,
    identitySha,
    prepared,
  };
};

const pendingPaths = (item: Awaited<ReturnType<typeof createHarness>>) => {
  const identityFingerprint = sha256(`identity:${item.identitySha}`);
  return {
    pending: join(item.claimRoot, `pending-${identityFingerprint}.json`),
    terminal: join(item.claimRoot, `terminal-${identityFingerprint}.json`),
  };
};

const pendingRecord = (
  item: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, unknown> = {},
) => ({
  record_schema_version: "crm_core_instagram_welcome_audio_live_pending_attempt_v1",
  mission_id: MISSION_ID,
  contract_version: CONTRACT_VERSION,
  mission_contract_sha256: MISSION_CONTRACT_SHA,
  approval_packet_id: APPROVAL_PACKET_ID,
  operation_id: OPERATION_ID,
  central_repo_head: CENTRAL_HEAD,
  canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
  approval_binding_sha256: APPROVAL_BINDING_SHA,
  identity_anchor_sha256: item.identitySha,
  identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  thread_anchor_sha256: THREAD_SHA,
  owner_anchor_sha256: OWNER_SHA,
  manifest_sha256: item.fixture.manifestSha256,
  campaign_interval_sha256: item.fixture.campaignIntervalSha256,
  audio_asset_sha256: item.audioSha256,
  manifest_ordinal: 1,
  claim_nonce: "1".repeat(64),
  owner_pid: process.pid,
  owner_nonce: "2".repeat(64),
  entered_at: new Date(PENDING_AT_MS).toISOString(),
  boundary_status: "pending_durable_before_attachment_upload",
  attachment_upload_entered: false,
  send_control_actuation_count: 0,
  attempt_nonce: ATTEMPT_NONCE,
  ...overrides,
});

const writePending = async (
  item: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, unknown> = {},
) => {
  const { pending } = pendingPaths(item);
  await writeFile(pending, `${JSON.stringify(pendingRecord(item, overrides))}\n`, {
    mode: 0o600,
  });
  return pending;
};

const armPendingWithRealIssuer = async (
  item: Awaited<ReturnType<typeof createHarness>>,
) => {
  const inspectionClaim = await claimNextWelcomeAudioLiveManifestInspection({
    private_store_capability: item.storeCapability,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    identity_anchor_sha256: item.identitySha,
    manifest_ordinal: 1,
    expected_manifest_sha256: item.fixture.manifestSha256,
    expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
    private_manifest_capability: item.authority.private_manifest_capability,
    now_ms: CONTEXT_NOW_MS + 10,
  });
  expect(inspectionClaim.private_capability).not.toBeNull();
  const recorded = await recordWelcomeAudioLiveInspectionResult({
    private_inspection_capability: inspectionClaim.private_capability,
    classification: WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE,
    now_ms: CONTEXT_NOW_MS + 11,
  });
  expect(recorded.private_capability).toBeNull();
  const claimed = await issueWelcomeAudioLiveClaim({
    private_store_capability: item.storeCapability,
    private_operation_context_capability: item.operation.private_capability,
    private_authority_capability: item.authority.private_authority_capability,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
    expected_approval_packet_id: APPROVAL_PACKET_ID,
    expected_operation_id: OPERATION_ID,
    expected_central_repo_head: CENTRAL_HEAD,
    expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
    identity_anchor_sha256: item.identitySha,
    expected_thread_anchor_sha256: THREAD_SHA,
    expected_owner_anchor_sha256: OWNER_SHA,
    manifest_ordinal: 1,
    expected_manifest_sha256: item.fixture.manifestSha256,
    expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
    expected_audio_sha256: item.audioSha256,
    private_manifest_capability: item.authority.private_manifest_capability,
    private_audio_asset_capability: item.authority.private_audio_asset_capability,
    approved_audio_asset_path: item.assetPath,
    now_ms: CONTEXT_NOW_MS + 100,
  });
  expect(claimed.private_claim_capability).not.toBeNull();
  const armed = await enterWelcomeAudioLiveAttemptBoundary({
    private_claim_capability: claimed.private_claim_capability,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    approval_packet_id: APPROVAL_PACKET_ID,
    operation_id: OPERATION_ID,
    central_repo_head: CENTRAL_HEAD,
    canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
    identity_anchor_sha256: item.identitySha,
    thread_anchor_sha256: THREAD_SHA,
    owner_anchor_sha256: OWNER_SHA,
    manifest_sha256: item.fixture.manifestSha256,
    campaign_interval_sha256: item.fixture.campaignIntervalSha256,
    audio_asset_sha256: item.audioSha256,
    manifest_ordinal: 1,
    required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    private_audio_asset_capability: item.authority.private_audio_asset_capability,
    approved_audio_asset_path: item.assetPath,
    entered_at_ms: PENDING_AT_MS,
  });
  expect(armed.private_actuation_capability).not.toBeNull();
  expect(armed.private_host_pending_capability).not.toBeNull();
  return armed;
};

const validExecuteEnvelope = (
  item: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, unknown> = {},
) => ({
  private_prepared_permit: item.prepared.private_prepared_permit,
  private_host_pending_capability: null,
  approved_audio_asset_path: item.assetPath,
  expected_thread_anchor_sha256: THREAD_SHA,
  synthetic_entry_now_ms: ENTRY_AT_MS,
  synthetic_preupload_now_ms: PREUPLOAD_AT_MS,
  synthetic_attempted_at_ms: ATTEMPTED_AT_MS,
  synthetic_confirmation_now_ms: CONFIRMATION_AT_MS,
  ...overrides,
});

const execute = (
  item: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, unknown> = {},
) => executeWelcomeAudioSafariLivePostPending(validExecuteEnvelope(item, overrides));

const consumeAttempt = (
  capability: unknown,
  overrides: Record<string, unknown> = {},
) => consumeWelcomeAudioSafariAttemptEvidenceCapabilityOnce({
  private_attempt_evidence_capability: capability,
  expected_operation_id: OPERATION_ID,
  expected_thread_anchor_sha256: THREAD_SHA,
  ...overrides,
});

const expectUnknownAttempt = (
  result: Awaited<ReturnType<typeof executeWelcomeAudioSafariLivePostPending>>,
  status: string,
) => {
  expect(result.private_attempt_evidence_capability).not.toBeNull();
  expect(result.private_visual_confirmation_capability).toBeNull();
  expect(result.redacted_receipt).toMatchObject({
    decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
    attempt_evidence_capability_issued: true,
    visual_confirmation_capability_issued: false,
    retry_forbidden_permanently: true,
  });
  expect(consumeAttempt(result.private_attempt_evidence_capability)).toBe(status);
};

const executeArmed = async (
  item: Awaited<ReturnType<typeof createHarness>>,
  overrides: Record<string, unknown> = {},
) => {
  const armed = await armPendingWithRealIssuer(item);
  return {
    armed,
    result: await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
      ...overrides,
    }),
  };
};

const consumeVisual = (
  result: Awaited<ReturnType<typeof executeWelcomeAudioSafariLivePostPending>>,
  overrides: Record<string, unknown> = {},
) => consumeWelcomeAudioSafariVisualConfirmationCapabilityOnce({
  private_visual_confirmation_capability: result.private_visual_confirmation_capability,
  private_attempt_evidence_capability: result.private_attempt_evidence_capability,
  expected_operation_id: OPERATION_ID,
  expected_thread_anchor_sha256: THREAD_SHA,
  synthetic_now_ms: CONFIRMATION_AT_MS,
  ...overrides,
});

const createCompositeHarness = async (scenario: Scenario) => {
  const item = await createHarness({ scenario, prepare: false });
  const inspectionClaim = await claimNextWelcomeAudioLiveManifestInspection({
    private_store_capability: item.storeCapability,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    identity_anchor_sha256: item.identitySha,
    manifest_ordinal: 1,
    expected_manifest_sha256: item.fixture.manifestSha256,
    expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
    private_manifest_capability: item.authority.private_manifest_capability,
    now_ms: CONTEXT_NOW_MS + 10,
  });
  await recordWelcomeAudioLiveInspectionResult({
    private_inspection_capability: inspectionClaim.private_capability,
    classification: WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE,
    now_ms: CONTEXT_NOW_MS + 11,
  });
  return item;
};

const refreshCompositeOperation = async (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
) => validateWelcomeAudioLiveOperationContext({
  operation_snapshot: item.operationSnapshot,
  private_authority_capability: item.authority.private_authority_capability,
  private_audio_asset_capability: item.authority.private_audio_asset_capability,
  expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
  expected_mission_id: MISSION_ID,
  expected_contract_version: CONTRACT_VERSION,
  expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
  expected_approval_packet_id: APPROVAL_PACKET_ID,
  expected_operation_id: OPERATION_ID,
  expected_central_repo_head: CENTRAL_HEAD,
  expected_manifest_sha256: item.fixture.manifestSha256,
  expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
  expected_identity_anchor_sha256: item.identitySha,
  expected_thread_anchor_sha256: THREAD_SHA,
  expected_owner_anchor_sha256: OWNER_SHA,
  expected_audio_sha256: item.audioSha256,
  expected_manifest_ordinal: 1,
  private_manifest_capability: item.authority.private_manifest_capability,
  now_ms: CONTEXT_NOW_MS,
});

const issueCompositeClaim = async (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
  operation: Awaited<ReturnType<typeof refreshCompositeOperation>>,
  nowMs: number,
) => issueWelcomeAudioLiveClaim({
  private_store_capability: item.storeCapability,
  private_operation_context_capability: operation.private_capability,
  private_authority_capability: item.authority.private_authority_capability,
  mission_id: MISSION_ID,
  contract_version: CONTRACT_VERSION,
  expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
  expected_approval_packet_id: APPROVAL_PACKET_ID,
  expected_operation_id: OPERATION_ID,
  expected_central_repo_head: CENTRAL_HEAD,
  expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
  identity_anchor_sha256: item.identitySha,
  expected_thread_anchor_sha256: THREAD_SHA,
  expected_owner_anchor_sha256: OWNER_SHA,
  manifest_ordinal: 1,
  expected_manifest_sha256: item.fixture.manifestSha256,
  expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
  expected_audio_sha256: item.audioSha256,
  private_manifest_capability: item.authority.private_manifest_capability,
  private_audio_asset_capability: item.authority.private_audio_asset_capability,
  approved_audio_asset_path: item.assetPath,
  now_ms: nowMs,
});

const compositeCommonInput = (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
) => ({
  private_operation_context_capability: item.operation.private_capability,
  private_authority_capability: item.authority.private_authority_capability,
  private_manifest_capability: item.authority.private_manifest_capability,
  private_audio_asset_capability: item.authority.private_audio_asset_capability,
  private_target_binding_capability: item.operation.private_target_binding_capability,
  exact_target: item.fixture.exactTarget,
  approved_audio_asset_path: item.assetPath,
  mission_id: MISSION_ID,
  contract_version: CONTRACT_VERSION,
  expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
  expected_approval_packet_id: APPROVAL_PACKET_ID,
  expected_operation_id: OPERATION_ID,
  expected_central_repo_head: CENTRAL_HEAD,
  expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
  identity_anchor_sha256: item.identitySha,
  expected_thread_anchor_sha256: THREAD_SHA,
  expected_owner_anchor_sha256: OWNER_SHA,
  manifest_ordinal: 1,
  expected_manifest_sha256: item.fixture.manifestSha256,
  expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
  expected_audio_sha256: item.audioSha256,
});

const runComposite = async (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
  faultScenario = WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.NONE,
  overrides: Record<string, unknown> = {},
) => {
  const result = await runWelcomeAudioSafariSyntheticCompositeOnceForTest({
    ...compositeCommonInput(item),
    private_store_capability: item.storeCapability,
    driver: item.driver,
    synthetic_store_root: item.claimRoot,
    synthetic_claim_now_ms: CONTEXT_NOW_MS + 100,
    synthetic_prepare_now_ms: CONTEXT_NOW_MS + 200,
    synthetic_pending_now_ms: PENDING_AT_MS,
    synthetic_entry_now_ms: ENTRY_AT_MS,
    synthetic_preupload_now_ms: PREUPLOAD_AT_MS,
    synthetic_attempted_at_ms: ATTEMPTED_AT_MS,
    synthetic_confirmation_now_ms: CONFIRMATION_AT_MS,
    synthetic_terminal_now_ms: CONFIRMATION_AT_MS + 100,
    synthetic_fault_scenario: faultScenario,
    ...overrides,
  });
  expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
    .toEqual({ ok: true, reason: null });
  return result;
};

const UI_ATTESTED_NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");
const UI_ATTESTED_PENDING_AT_MS = UI_ATTESTED_NOW_MS + 1_000;
const UI_ATTESTED_ENTRY_AT_MS = UI_ATTESTED_NOW_MS + 1_100;
const UI_ATTESTED_PREUPLOAD_AT_MS = UI_ATTESTED_NOW_MS + 1_200;
const UI_ATTESTED_ATTEMPTED_AT_MS = UI_ATTESTED_NOW_MS + 1_500;
const UI_ATTESTED_CONFIRMATION_AT_MS = UI_ATTESTED_NOW_MS + 2_000;
const UI_PRIVATE_TARGET = "Synthetic.UiAttested+Exact_é";
const UI_PRIVATE_THREAD = "synthetic-thread-reference/UiAttested+Exact";
const UI_PRIVATE_OWNER = "synthetic-owner-reference/UiAttested+Exact";

const uiAttestedSourceInput = () => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: "synthetic_ui_attested_host_source_mission_001",
  notification_row: {
    row_ordinal: 1,
    exact_target_utf8: UI_PRIVATE_TARGET,
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: "synthetic visible bucket 2 d",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-16T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: UI_PRIVATE_TARGET,
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: "confirmed",
    follows_owner_evidence: "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-16T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: UI_PRIVATE_THREAD,
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-16T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: UI_PRIVATE_OWNER,
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-16T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: UI_PRIVATE_TARGET,
    bound_thread_reference_utf8: UI_PRIVATE_THREAD,
    owner_account_reference_utf8: UI_PRIVATE_OWNER,
    checked_at: "2026-07-16T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const uiAttestedOperationFixture = ({
  projection,
  authority,
  audioSha256,
}: {
  projection: Record<string, any>;
  authority: Record<string, any>;
  audioSha256: string;
}) => {
  const sealedFixture = manifestFixture();
  const base = operationFixture({ fixture: sealedFixture, audioSha256 });
  const replacements = new Map<any, any>([
    [MISSION_ID, authority.mission_id],
    [CONTRACT_VERSION, authority.contract_version],
    [OPERATION_ID, authority.operation_id],
    [APPROVAL_PACKET_ID, authority.approval_packet_id],
    [CENTRAL_HEAD, authority.central_repo_head],
    [SOURCE_SHA, authority.source_evidence_anchor_sha256],
    [PROFILE_SHA, authority.profile_anchor_sha256],
    [sealedFixture.manifest.ordered_records[0].identity_anchor_sha256,
      authority.candidate_anchor_sha256],
    [THREAD_SHA, authority.thread_anchor_sha256],
    [OWNER_SHA, authority.owner_anchor_sha256],
    [ASSET_ID, authority.approved_audio_asset_id],
  ]);
  const replace = (value: any): any => {
    if (replacements.has(value)) return replacements.get(value);
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, replace(nested)]));
    }
    return value;
  };
  const operation = replace(base);
  const { source_event_anchor_sha256: _operationSource, ...operationSection } =
    operation.operation;
  const {
    source_event_anchor_sha256: _approvalSource,
    source_recency_max_age_ms: _approvalAge,
    ...approvalSection
  } = operation.approval;
  const { source_event_anchor_sha256: _bindingSource, ...bindingSection } =
    operation.binding;
  operation.adapter_version = WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;
  operation.contract_version = WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION;
  operation.operation = {
    ...operationSection,
    source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
    owner_anchor_sha256: authority.owner_anchor_sha256,
  };
  operation.approval = {
    ...approvalSection,
    checked_at: "2026-07-16T14:59:42.000Z",
    source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
    owner_anchor_sha256: authority.owner_anchor_sha256,
    source_evidence_freshness_max_age_ms: 5 * 60 * 1000,
  };
  operation.execution_surface.observed_at = "2026-07-16T14:59:43.000Z";
  operation.follower_evidence = {
    source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
    evidence_observed_at: projection.dedupe.checked_at,
    time_bucket_attestation: "explicit_visible_not_exact_timestamp",
    source_evidence_freshness_max_age_ms: 5 * 60 * 1000,
    source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  };
  operation.binding = {
    ...bindingSection,
    source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
    source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
    owner_anchor_sha256: authority.owner_anchor_sha256,
    observed_at: "2026-07-16T14:59:44.000Z",
  };
  operation.eligibility.business_eligibility =
    WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER;
  operation.eligibility.observed_at = "2026-07-16T14:59:44.000Z";
  operation.asset.asset_preview_binding = WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE;
  operation.asset.preview_status = "approved_file_validated_before_upload";
  operation.asset.preview_observed_at = "2026-07-16T14:59:44.000Z";
  operation.context.checked_at = "2026-07-16T14:59:43.000Z";
  operation.dedupe.checked_at = projection.dedupe.checked_at;
  operation.source_provenance = {
    source_class: WELCOME_AUDIO_SOURCE_CLASS.UI_ATTESTED_FOLLOWER_SOURCE_V1,
    source_evidence_schema_version: projection.schema_version,
    source_evidence_sha256: projection.source_evidence_sha256,
    source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
    source_record_ordinal: projection.notification_row.row_ordinal,
    source_record_cap: 8,
    time_bucket_attestation: "explicit_visible_not_exact_timestamp",
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  };
  operation.canonical_operation_sha256 = "0".repeat(64);
  for (const section of [
    "operation",
    "approval",
    "context",
    "effect_claim",
    "execution",
    "confirmation",
  ]) operation[section].canonical_operation_sha256 = "0".repeat(64);
  return bindCanonicalDigest(operation);
};

const createUiAttestedCompositeHarness = async (scenario: Scenario) => {
  const asset = await createSyntheticAsset();
  const authorityRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    uiAttestedPublisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  )));
  cleanupPaths.push(authorityRoot);
  await chmod(authorityRoot, 0o700);
  const source = uiAttestedSourceInput();
  const materialized = uiAttestedMaterializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft({
    ui_attested_input: source,
    packet_request: {
      schema_version: uiAttestedMaterializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
      status: "approved_for_no_live_materialization_only",
      mission_id: "synthetic_ui_attested_host_mission_001",
      contract_version: "synthetic_ui_attested_host_contract_v1",
      central_repo_head: "7".repeat(40),
      authorization_id: "synthetic_ui_attested_host_authorization_001",
      expected_source_mission_id: source.mission_id,
      candidate_cap: 1,
      future_attempt_cap: 1,
      approved_audio_asset_id: "synthetic_ui_attested_host_audio_001",
      approved_audio_sha256: asset.audioSha256,
      approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
      execution_approval_authorized: false,
      external_effect_authorized: false,
    },
    now_ms: UI_ATTESTED_NOW_MS,
  });
  expect(materialized.private_draft).not.toBeNull();
  const draft = materialized.private_draft!;
  const projection = draft.source_projection;
  const authorization: Record<string, any> = {
    schema_version: "crm_core_instagram_welcome_audio_ui_attested_live_authorization_input_v1",
    status: "approved_for_exact_ui_attested_draft_and_audio",
    mission_contract_sha256: "8".repeat(64),
    active_next_action_id: "synthetic_ui_attested_host_next_action_001",
    active_next_action_sha256: "9".repeat(64),
    approval_packet_id: "synthetic_ui_attested_host_approval_001",
    approved_audio_asset_path: asset.assetPath,
    approved_at: "2026-07-16T14:59:45.000Z",
    expires_at: "2026-07-16T15:04:45.000Z",
    candidate_cap: 1,
    claim_cap: 1,
    pending_cap: 1,
    upload_cap: 1,
    send_cap: 1,
    action_time_confirmation_required: true,
    execution_browser: "safari",
    text_fallback: "forbidden",
    campaign_effect_allowed: false,
    mailerlite_effect_allowed: false,
    expected_draft_sha256:
      uiAttestedPublisher.computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft),
    expected_projection_sha256:
      uiAttestedPublisher.computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(projection),
    expected_operation_id: draft.operation_id,
    expected_canonical_operation_sha256: "a".repeat(64),
    expected_authorization_id: draft.authorization_id,
    expected_source_evidence_sha256: projection.source_evidence_sha256,
    expected_source_evidence_anchor_sha256: projection.anchors.source_evidence_anchor_sha256,
    expected_profile_anchor_sha256: projection.anchors.profile_anchor_sha256,
    expected_candidate_anchor_sha256: projection.anchors.candidate_anchor_sha256,
    expected_thread_anchor_sha256: projection.anchors.thread_anchor_sha256,
    expected_owner_anchor_sha256: projection.anchors.owner_anchor_sha256,
    expected_dedupe_anchor_sha256: projection.anchors.dedupe_anchor_sha256,
    expected_audio_sha256: draft.approved_audio_sha256,
  };
  const provisionalAuthority = {
    mission_id: draft.mission_id,
    contract_version: draft.contract_version,
    operation_id: draft.operation_id,
    approval_packet_id: authorization.approval_packet_id,
    central_repo_head: draft.central_repo_head,
    source_evidence_anchor_sha256: projection.anchors.source_evidence_anchor_sha256,
    profile_anchor_sha256: projection.anchors.profile_anchor_sha256,
    candidate_anchor_sha256: projection.anchors.candidate_anchor_sha256,
    thread_anchor_sha256: projection.anchors.thread_anchor_sha256,
    owner_anchor_sha256: projection.anchors.owner_anchor_sha256,
    dedupe_anchor_sha256: projection.anchors.dedupe_anchor_sha256,
    approved_audio_asset_id: draft.approved_audio_asset_id,
  };
  const operationSnapshot = uiAttestedOperationFixture({
    projection,
    authority: provisionalAuthority,
    audioSha256: asset.audioSha256,
  });
  authorization.expected_canonical_operation_sha256 = operationSnapshot.canonical_operation_sha256;
  const published = await uiAttestedPublisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
    authority_root: authorityRoot,
    private_draft: draft,
    private_authorization: authorization,
    now_ms: UI_ATTESTED_NOW_MS,
  });
  expect(published.private_authority_envelope).not.toBeNull();
  const authority = published.private_authority_envelope!.authority;
  const opened = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
    authority_root: authorityRoot,
    expected_central_repo_head: draft.central_repo_head,
    expected_mission_contract_sha256: authorization.mission_contract_sha256,
    expected_active_next_action_id: authorization.active_next_action_id,
    expected_active_next_action_sha256: authorization.active_next_action_sha256,
    now_ms: UI_ATTESTED_NOW_MS,
  });
  const operation = await validateWelcomeAudioUiAttestedLiveOperationContext({
    operation_snapshot: operationSnapshot,
    private_authority_capability: opened.private_authority_capability,
    private_source_capability: opened.private_source_capability,
    private_audio_asset_capability: opened.private_audio_asset_capability,
    expected_canonical_operation_sha256: operationSnapshot.canonical_operation_sha256,
    now_ms: UI_ATTESTED_NOW_MS,
  });
  expect(operation.private_capability).not.toBeNull();
  const claimRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    "crm-core-welcome-audio-live-claim-store-test-",
  )));
  cleanupPaths.push(claimRoot);
  await chmod(claimRoot, 0o700);
  const storeCapability = await createSyntheticWelcomeAudioLiveClaimStoreCapability({
    store_root: claimRoot,
  });
  return {
    asset,
    authorityRoot,
    claimRoot,
    storeCapability,
    driver: createSyntheticSafariDriverForTest({ scenario }),
    draft,
    projection,
    authorization,
    authority,
    opened,
    operation,
    operationSnapshot,
  };
};

const uiAttestedCompositeCommonInput = (
  item: Awaited<ReturnType<typeof createUiAttestedCompositeHarness>>,
) => ({
  private_operation_context_capability: item.operation.private_capability,
  private_authority_capability: item.opened.private_authority_capability,
  private_source_capability: item.opened.private_source_capability,
  private_audio_asset_capability: item.opened.private_audio_asset_capability,
  private_target_binding_capability: item.operation.private_target_binding_capability,
  exact_target: item.projection.notification_row.exact_target_utf8,
  exact_bound_thread_reference: item.projection.thread.bound_thread_reference_utf8,
  exact_owner_account_reference: item.projection.owner.owner_account_reference_utf8,
  mission_id: item.authority.mission_id,
  contract_version: item.authority.contract_version,
  expected_mission_contract_sha256: item.authority.mission_contract_sha256,
  expected_active_next_action_id: item.authority.active_next_action_id,
  expected_active_next_action_sha256: item.authority.active_next_action_sha256,
  expected_approval_packet_id: item.authority.approval_packet_id,
  expected_authorization_id: item.authority.authorization_id,
  expected_operation_id: item.authority.operation_id,
  expected_central_repo_head: item.authority.central_repo_head,
  expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
  expected_draft_sha256: item.authority.draft_sha256,
  expected_projection_sha256: item.authority.projection_sha256,
  expected_source_mission_id: item.authority.source_mission_id,
  expected_source_evidence_schema_version: item.projection.schema_version,
  expected_source_evidence_sha256: item.authority.source_evidence_sha256,
  expected_source_record_ordinal: item.projection.notification_row.row_ordinal,
  expected_source_record_cap: 8,
  evidence_observed_at: item.projection.dedupe.checked_at,
  expected_source_evidence_anchor_sha256: item.authority.source_evidence_anchor_sha256,
  expected_profile_anchor_sha256: item.authority.profile_anchor_sha256,
  identity_anchor_sha256: item.authority.candidate_anchor_sha256,
  expected_thread_anchor_sha256: item.authority.thread_anchor_sha256,
  expected_owner_anchor_sha256: item.authority.owner_anchor_sha256,
  expected_dedupe_anchor_sha256: item.authority.dedupe_anchor_sha256,
  expected_approved_audio_asset_id: item.authority.approved_audio_asset_id,
  expected_audio_sha256: item.authority.approved_audio_asset_sha256,
  candidate_cap: 1,
  claim_cap: 1,
  pending_cap: 1,
  upload_cap: 1,
  send_cap: 1,
  retry_cap: 0,
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const runUiAttestedComposite = async (
  item: Awaited<ReturnType<typeof createUiAttestedCompositeHarness>>,
  overrides: Record<string, unknown> = {},
) => {
  const result = await runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest({
    ...uiAttestedCompositeCommonInput(item),
    private_store_capability: item.storeCapability,
    driver: item.driver,
    approved_audio_asset_path: item.asset.assetPath,
    synthetic_store_root: item.claimRoot,
    synthetic_claim_now_ms: UI_ATTESTED_NOW_MS + 100,
    synthetic_prepare_now_ms: UI_ATTESTED_NOW_MS + 200,
    synthetic_pending_now_ms: UI_ATTESTED_PENDING_AT_MS,
    synthetic_entry_now_ms: UI_ATTESTED_ENTRY_AT_MS,
    synthetic_preupload_now_ms: UI_ATTESTED_PREUPLOAD_AT_MS,
    synthetic_attempted_at_ms: UI_ATTESTED_ATTEMPTED_AT_MS,
    synthetic_confirmation_now_ms: UI_ATTESTED_CONFIRMATION_AT_MS,
    synthetic_terminal_now_ms: UI_ATTESTED_CONFIRMATION_AT_MS + 100,
    synthetic_fault_scenario:
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.NONE,
    ...overrides,
  });
  expect(validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt(result.redacted_receipt))
    .toEqual({ ok: true, reason: null });
  return result;
};

const refreshUiAttestedCompositeOperation = async (
  item: Awaited<ReturnType<typeof createUiAttestedCompositeHarness>>,
  nowMs: number,
) => {
  const opened = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
    authority_root: item.authorityRoot,
    expected_central_repo_head: item.draft.central_repo_head,
    expected_mission_contract_sha256: item.authorization.mission_contract_sha256,
    expected_active_next_action_id: item.authorization.active_next_action_id,
    expected_active_next_action_sha256: item.authorization.active_next_action_sha256,
    now_ms: nowMs,
  });
  const operation = await validateWelcomeAudioUiAttestedLiveOperationContext({
    operation_snapshot: item.operationSnapshot,
    private_authority_capability: opened.private_authority_capability,
    private_source_capability: opened.private_source_capability,
    private_audio_asset_capability: opened.private_audio_asset_capability,
    expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
    now_ms: nowMs,
  });
  expect(operation.private_capability).not.toBeNull();
  item.opened = opened;
  item.operation = operation;
};

const claimObservation = async (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
  nowMs: number,
) => {
  const terminalPath = join(
    item.claimRoot,
    `terminal-${sha256(`identity:${item.identitySha}`)}.json`,
  );
  const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
  const result = await claimWelcomeAudioLiveReplyObservation({
    private_store_capability: item.storeCapability,
    required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    operation_id: OPERATION_ID,
    identity_anchor_sha256: item.identitySha,
    thread_anchor_sha256: THREAD_SHA,
    attempt_nonce: terminal.attempt_nonce,
    now_ms: nowMs,
  });
  return { result, terminal };
};

const claimObservationForTerminal = async (
  item: Awaited<ReturnType<typeof createCompositeHarness>>,
  terminal: Record<string, any>,
  nowMs: number,
) => ({
  terminal,
  result: await claimWelcomeAudioLiveReplyObservation({
    private_store_capability: item.storeCapability,
    required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    operation_id: terminal.operation_id,
    identity_anchor_sha256: terminal.identity_anchor_sha256,
    thread_anchor_sha256: terminal.thread_anchor_sha256,
    attempt_nonce: terminal.attempt_nonce,
    now_ms: nowMs,
  }),
});

const observationConsumeEnvelope = (
  capability: unknown,
  terminal: Record<string, any>,
  nowMs: number,
  overrides: Record<string, unknown> = {},
) => ({
  private_observation_capability: capability,
  required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
  expected_mission_id: MISSION_ID,
  expected_operation_id: OPERATION_ID,
  expected_identity_anchor_sha256: terminal.identity_anchor_sha256,
  expected_thread_anchor_sha256: THREAD_SHA,
  expected_attempt_nonce: terminal.attempt_nonce,
  expected_mission_slot: terminal.mission_slot,
  now_ms: nowMs,
  ...overrides,
});

const consumeObservation = async (
  capability: unknown,
  terminal: Record<string, any>,
  nowMs: number,
  overrides: Record<string, unknown> = {},
) => consumeWelcomeAudioLiveReplyObservationCapabilityOnce(
  observationConsumeEnvelope(capability, terminal, nowMs, overrides),
);

const finalizeHostAttempt = async (
  armed: Awaited<ReturnType<typeof armPendingWithRealIssuer>>,
  result: Awaited<ReturnType<typeof executeWelcomeAudioSafariLivePostPending>>,
  nowMs = CONFIRMATION_AT_MS + 100,
  overrides: Record<string, unknown> = {},
) => finalizeWelcomeAudioLiveAttempt({
  private_terminal_capability: armed.private_terminal_capability,
  required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
  private_attempt_evidence_capability: result.private_attempt_evidence_capability,
  private_visual_confirmation_capability: result.private_visual_confirmation_capability,
  synthetic_now_ms: nowMs,
  ...overrides,
});

const recoverAttempt = async (
  item: Awaited<ReturnType<typeof createHarness>>,
) => recoverWelcomeAudioLivePendingAttemptAfterOwnerExit({
  private_store_capability: item.storeCapability,
  required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
  mission_id: MISSION_ID,
  contract_version: CONTRACT_VERSION,
  mission_contract_sha256: MISSION_CONTRACT_SHA,
  identity_anchor_sha256: item.identitySha,
  manifest_ordinal: 1,
  now_ms: CONFIRMATION_AT_MS + 200,
});

describe("Safari live-host prepare boundary", () => {
  test("invalid input before capability binding still returns a schema-valid unbound receipt", async () => {
    const malformedPrepare = await prepareWelcomeAudioSafariLiveTarget({});
    const invalidHostPrepare = await prepareWelcomeAudioSafariLiveTarget({
      private_live_host_capability: Object.freeze({}),
      private_target_binding_capability: Object.freeze({}),
      exact_target: "synthetic.invalid.target",
      expected_mission_id: MISSION_ID,
      expected_operation_id: OPERATION_ID,
      expected_identity_anchor_sha256: "1".repeat(64),
      expected_thread_anchor_sha256: THREAD_SHA,
      expected_audio_sha256: "2".repeat(64),
      now_ms: CONTEXT_NOW_MS,
    });
    const malformedExecute = await executeWelcomeAudioSafariLivePostPending({});
    const invalidPermitExecute = await executeWelcomeAudioSafariLivePostPending({
      private_prepared_permit: Object.freeze({}),
      private_host_pending_capability: null,
      approved_audio_asset_path: "/synthetic/invalid-before-capability.m4a",
      expected_thread_anchor_sha256: THREAD_SHA,
      synthetic_entry_now_ms: null,
      synthetic_preupload_now_ms: null,
      synthetic_attempted_at_ms: null,
      synthetic_confirmation_now_ms: null,
    });
    for (const result of [
      malformedPrepare,
      invalidHostPrepare,
      malformedExecute,
      invalidPermitExecute,
    ]) {
      expect(result.redacted_receipt).toMatchObject({
        execution_mode: WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.UNBOUND,
        decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
        attachment_upload_entered: false,
        send_control_actuation_count: 0,
        external_effect_possible: false,
      });
      expect(validateWelcomeAudioSafariLiveHostReceipt(result.redacted_receipt))
        .toEqual({ ok: true, reason: null });
    }
  });

  test("consumes the exact target binding and opens only the native chooser", async () => {
    const item = await createHarness();

    expect(item.prepared.private_prepared_permit).not.toBeNull();
    expect(item.prepared.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.PREPARED,
      host_capability_consumed: true,
      target_binding_capability_consumed: true,
      source_thread_bound: true,
      native_chooser_opened: true,
      fixed_ui_action_count: 1,
      pending_record_validation_count: 0,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      external_effect_possible: false,
      blocker_codes: [],
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual({
      stage: "chooser",
      action_count: 1,
      state_read_count: 2,
    });
    expect(validateWelcomeAudioSafariLiveHostReceipt(item.prepared.redacted_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test.each([
    ["wrong target", { exactTargetOverride: "Different.Target@Example.COM" }],
    ["wrong thread", { threadShaOverride: "f".repeat(64) }],
  ])("blocks %s before any UI action", async (_label, overrides) => {
    const item = await createHarness(overrides);

    expect(item.prepared.private_prepared_permit).toBeNull();
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(0);
    expect(item.prepared.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.TARGET_BINDING_INVALID,
    ]);
  });

  test("blocks an exact-capability target on a mismatched synthetic thread", async () => {
    const item = await createHarness({
      scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.THREAD_MISMATCH,
    });

    expect(item.prepared.private_prepared_permit).toBeNull();
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(0);
    expect(item.prepared.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SOURCE_THREAD_INVALID,
    ]);
  });

  test.each([
    ["case-variant target", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.TARGET_CASE_VARIANT],
    [
      "target outside thread semantics",
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.TARGET_OUTSIDE_THREAD_SEMANTICS,
    ],
  ])("blocks %s with zero UI actions", async (_label, scenario) => {
    const item = await createHarness({ scenario });

    expect(item.prepared.private_prepared_permit).toBeNull();
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(0);
    expect(item.prepared.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SOURCE_THREAD_INVALID,
    ]);
  });

  test.each([
    ["a pre-existing outgoing audio", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.PRIOR_AUDIO_PRESENT,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PRIOR_AUDIO_PRESENT_OR_UNKNOWN],
    ["draft text", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.DRAFT_TEXT_PRESENT,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.COMPOSER_NOT_EMPTY],
  ])("blocks %s before opening the chooser", async (_label, scenario, blocker) => {
    const item = await createHarness({ scenario });

    expect(item.prepared.private_prepared_permit).toBeNull();
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(0);
    expect(item.prepared.redacted_receipt.blocker_codes).toEqual([blocker]);
  });
});

describe("durable PENDING boundary", () => {
  test("direct execute without durable exact PENDING performs zero execute UI", async () => {
    const item = await createHarness();
    const before = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    const result = await execute(item);
    const after = inspectSyntheticSafariDriverForTest({ driver: item.driver });

    expect(before?.action_count).toBe(1);
    expect(after?.action_count).toBe(before?.action_count);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      pending_record_validation_count: 0,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_forbidden_permanently: true,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test.each([
    ["stale handcrafted record", { entered_at: new Date(CONTEXT_NOW_MS - 1).toISOString() }],
    ["restart PID mismatch", { owner_pid: process.pid + 1 }],
    ["binding tamper", { audio_asset_sha256: "f".repeat(64) }],
  ])("%s cannot cross the upload boundary", async (_label, recordOverrides) => {
    const item = await createHarness();
    await writePending(item, recordOverrides);
    const result = await execute(item);

    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(1);
    expect(result.redacted_receipt.attachment_upload_entered).toBe(false);
    expect(result.redacted_receipt.send_control_actuation_count).toBe(0);
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test("valid PENDING is validated twice and rechecked immediately before path typing", async () => {
    const item = await createHarness();
    const { result } = await executeArmed(item);

    expect(result.redacted_receipt).toMatchObject({
      pending_record_validation_count: 2,
      pending_revalidated_immediately_before_upload: true,
      asset_path_capability_validated_before_upload: true,
      attachment_upload_entered: true,
    });
    const source = await readFile(MODULE_PATH, "utf8");
    const finalFreshState = source.indexOf("const immediatelyBeforeUpload = await acquireFreshState");
    const secondRead = source.indexOf("const revalidatedPending = await readStablePending");
    const enterUpload = source.indexOf("attachmentUploadEntered = true", secondRead);
    const typePath = source.indexOf("action: 'type_private_audio_path'", enterUpload);
    expect(finalFreshState).toBeGreaterThan(0);
    expect(secondRead).toBeGreaterThan(finalFreshState);
    expect(enterUpload).toBeGreaterThan(secondRead);
    expect(typePath).toBeGreaterThan(enterUpload);
  });

  test("tamper during the final fresh-state read is caught by the exact post-state PENDING reread", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    expect(configureSyntheticSafariPendingModeTamperAfterFinalFreshStateForTest({
      driver: item.driver,
      pending_path: pendingPaths(item).pending,
    })).toBe(true);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      pending_record_validation_count: 1,
      pending_revalidated_immediately_before_upload: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_forbidden_permanently: true,
    });
    expect(validateWelcomeAudioSafariLiveHostReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "go_to_folder", action_count: 2, state_read_count: 5 });
    expect((await lstat(pendingPaths(item).pending)).mode & 0o7777).toBe(0o644);
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test("an exact path mismatch performs no upload or send", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
      approved_audio_asset_path: join(item.claimRoot, "different-audio.m4a"),
    });

    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      stage: "go_to_folder",
      action_count: 2,
    });
    expect(result.redacted_receipt).toMatchObject({
      pending_record_validation_count: 1,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ASSET_PATH_BINDING_INVALID],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test("a valid permit with a wrong execute-thread binding returns unknown evidence, not a throw", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
      expected_thread_anchor_sha256: "f".repeat(64),
    });

    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(1);
    expect(result.redacted_receipt).toMatchObject({
      pending_record_validation_count: 0,
      attachment_upload_entered: false,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test("entry may be fresh while the exact five-minute preupload boundary fails closed", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
      synthetic_entry_now_ms: PENDING_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS - 1,
      synthetic_preupload_now_ms: PENDING_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      synthetic_attempted_at_ms: PENDING_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
      synthetic_confirmation_now_ms: PENDING_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    });

    expect(result.redacted_receipt).toMatchObject({
      pending_record_validation_count: 1,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID],
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      stage: "go_to_folder",
      action_count: 2,
    });
  });

  test("a host-pending capability mismatch is one-use and burns the mismatched capability", async () => {
    const first = await createHarness();
    const second = await createHarness();
    const firstArmed = await armPendingWithRealIssuer(first);
    const secondArmed = await armPendingWithRealIssuer(second);

    const mismatched = await execute(first, {
      private_host_pending_capability: secondArmed.private_host_pending_capability,
    });
    expect(mismatched.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID,
    ]);
    expect(inspectSyntheticSafariDriverForTest({ driver: first.driver })?.action_count).toBe(1);

    const burned = await execute(second, {
      private_host_pending_capability: secondArmed.private_host_pending_capability,
    });
    expect(burned.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID,
    ]);
    expect(inspectSyntheticSafariDriverForTest({ driver: second.driver })?.action_count).toBe(1);
    expect(firstArmed.private_host_pending_capability).not.toBeNull();
  });

  test.each([
    ["mode 0644", async (item: Awaited<ReturnType<typeof createHarness>>) => {
      await chmod(pendingPaths(item).pending, 0o644);
    }],
    ["hard-link count 2", async (item: Awaited<ReturnType<typeof createHarness>>) => {
      await link(pendingPaths(item).pending, join(item.claimRoot, "pending-hard-link.json"));
    }],
    ["missing record", async (item: Awaited<ReturnType<typeof createHarness>>) => {
      await unlink(pendingPaths(item).pending);
    }],
    ["temporary evidence", async (item: Awaited<ReturnType<typeof createHarness>>) => {
      await writeFile(join(item.claimRoot, ".pending-incomplete.json"), "{}\n", { mode: 0o600 });
    }],
    ["terminal evidence", async (item: Awaited<ReturnType<typeof createHarness>>) => {
      await writeFile(pendingPaths(item).terminal, "{}\n", { mode: 0o600 });
    }],
  ])("rejects %s before upload", async (_label, mutate) => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    await mutate(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });

    expect(result.redacted_receipt).toMatchObject({
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(1);
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
  });

  test.each([
    ["owner nonce", { owner_nonce: "f".repeat(64) }],
    ["attempt nonce", { attempt_nonce: "e".repeat(64) }],
    ["full binding", { mission_contract_sha256: "d".repeat(64) }],
  ])("rejects %s tamper against the issuer capability", async (_label, overrides) => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const path = pendingPaths(item).pending;
    const record = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, `${JSON.stringify({ ...record, ...overrides })}\n`, { mode: 0o600 });
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });

    expect(result.redacted_receipt).toMatchObject({
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })?.action_count).toBe(1);
  });
});

describe("post-PENDING attempt and visual evidence", () => {
  test("an upload with no exact preview is terminal unknown with zero send", async () => {
    const item = await createHarness({
      scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.UPLOAD_UNKNOWN,
    });
    const { result } = await executeArmed(item);

    expect(result.private_visual_confirmation_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      attachment_upload_entered: true,
      asset_preview_verified: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PREVIEW_INVALID],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_0_SEND,
    );
  });

  test.each([
    ["sent marker only", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SENT_MARKER_ONLY],
    ["compose reset only", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.COMPOSE_RESET_ONLY],
  ])("%s never counts as confirmation", async (_label, scenario) => {
    const item = await createHarness({ scenario });
    const { result } = await executeArmed(item);

    expect(result.private_visual_confirmation_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      new_outgoing_audio_bubble_delta: 0,
      sent_marker_only_accepted: false,
      compose_reset_accepted: false,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.CONFIRMATION_UNKNOWN],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_1_SEND,
    );
  });

  test("a same-thread fresh +1 outgoing audio bubble yields one-use evidence", async () => {
    const item = await createHarness();
    const { result } = await executeArmed(item);

    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.VISUAL_EVIDENCE_READY,
      pending_record_validation_count: 2,
      attachment_upload_entered: true,
      asset_preview_verified: true,
      send_control_actuation_count: 1,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
      new_outgoing_audio_bubble_delta: 1,
      visual_confirmation_capability_issued: true,
      blocker_codes: [],
    });
    expect(consumeAttempt(result.private_attempt_evidence_capability))
      .toBe(WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.CONFIRMED_UPLOAD_1_SEND_1);
    expect(consumeAttempt(result.private_attempt_evidence_capability))
      .toBe(WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.INVALID);

    expect(consumeVisual(result))
      .toBe(WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.VALID);
    expect(consumeVisual(result))
      .toBe(WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.INVALID);
    expect(validateWelcomeAudioSafariLiveHostReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });

    const serialized = JSON.stringify(result.redacted_receipt);
    for (const privateValue of [
      item.fixture.exactTarget,
      item.assetPath,
      item.identitySha,
      THREAD_SHA,
    ]) expect(serialized).not.toContain(privateValue);
  });

  test("a wrong attempt consume burns the attempt and makes associated visual evidence invalid", async () => {
    const item = await createHarness();
    const { result } = await executeArmed(item);

    expect(consumeAttempt(result.private_attempt_evidence_capability, {
      expected_operation_id: "wrong-operation",
    })).toBe(WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.INVALID);
    expect(consumeVisual(result))
      .toBe(WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.INVALID);
  });

  test.each([
    ["draft appears", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.DRAFT_TEXT_BEFORE_SEND,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.COMPOSER_NOT_EMPTY],
    ["second attachment appears", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SECOND_ATTACHMENT_PREVIEW,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PREVIEW_INVALID],
    ["concurrent audio appears", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.PRIOR_AUDIO_BEFORE_SEND,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PREVIEW_INVALID],
  ])("%s before Send is unknown with no Send actuation", async (_label, scenario, blocker) => {
    const item = await createHarness({ scenario });
    const { result } = await executeArmed(item);

    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 0,
      blocker_codes: [blocker],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_0_SEND,
    );
  });

  test("a Send action throw is terminal UNKNOWN with exactly one attempted Send", async () => {
    const item = await createHarness({
      scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SEND_ACTION_THROWS,
    });
    const { result } = await executeArmed(item);

    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SEND_ACTUATION_UNKNOWN],
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_1_SEND,
    );
  });

  test("malformed execute input after a valid prepared permit returns UNKNOWN evidence", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
      synthetic_entry_now_ms: Number.NaN,
    });

    expect(result.private_attempt_evidence_capability).not.toBeNull();
    expect(result.private_visual_confirmation_capability).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID],
    });
  });

  test("invalid non-Proxy envelopes burn a located permit without invoking accessors", async () => {
    const mutations: Array<[
      string,
      (base: Record<PropertyKey, unknown>, accessorReads: { count: number }) => object,
    ]> = [
      ["extra field", (base) => ({ ...base, extra_field: true })],
      ["missing field", (base) => {
        Reflect.deleteProperty(base, "synthetic_confirmation_now_ms");
        return base;
      }],
      ["symbol field", (base) => {
        base[Symbol("extra")] = true;
        return base;
      }],
      ["null prototype", (base) => Object.assign(Object.create(null), base)],
      ["class instance", (base) => {
        class InvalidEnvelope {}
        return Object.assign(new InvalidEnvelope(), base);
      }],
      ["throwing getter", (base, accessorReads) => {
        Object.defineProperty(base, "approved_audio_asset_path", {
          get() {
            accessorReads.count += 1;
            throw new Error("must_not_run");
          },
          configurable: true,
          enumerable: true,
        });
        return base;
      }],
      ["setter-only field", (base, accessorReads) => {
        Object.defineProperty(base, "expected_thread_anchor_sha256", {
          set() {
            accessorReads.count += 1;
          },
          configurable: true,
          enumerable: true,
        });
        return base;
      }],
    ];

    for (const [label, mutate] of mutations) {
      const item = await createHarness();
      const armed = await armPendingWithRealIssuer(item);
      const accessorReads = { count: 0 };
      const envelope = mutate(validExecuteEnvelope(item, {
        private_host_pending_capability: armed.private_host_pending_capability,
      }), accessorReads);
      const before = inspectSyntheticSafariDriverForTest({ driver: item.driver });
      const result = await executeWelcomeAudioSafariLivePostPending(envelope);

      expect(accessorReads.count, label).toBe(0);
      expect(result.redacted_receipt.decision, label)
        .toBe(WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN);
      expect(result.redacted_receipt.blocker_codes, label)
        .toEqual([WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID]);
      expect(consumeAttempt(result.private_attempt_evidence_capability), label)
        .toBe(WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND);
      expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }), label).toEqual(before);

      const retry = await execute(item, {
        private_host_pending_capability: armed.private_host_pending_capability,
      });
      expect(retry.private_attempt_evidence_capability, label).toBeNull();
      expect(retry.redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PERMIT_INVALID],
      });
    }
  });

  test("whole-envelope Proxy and revoked Proxy trigger no traps and do not burn the permit", async () => {
    for (const revoked of [false, true]) {
      const item = await createHarness();
      const armed = await armPendingWithRealIssuer(item);
      const envelope = validExecuteEnvelope(item, {
        private_host_pending_capability: armed.private_host_pending_capability,
      });
      let trapCount = 0;
      const revocable = Proxy.revocable(envelope, {
        ownKeys() {
          trapCount += 1;
          throw new Error("must_not_run");
        },
        getOwnPropertyDescriptor() {
          trapCount += 1;
          throw new Error("must_not_run");
        },
        get() {
          trapCount += 1;
          throw new Error("must_not_run");
        },
      });
      if (revoked) revocable.revoke();

      const rejected = await executeWelcomeAudioSafariLivePostPending(revocable.proxy);
      expect(trapCount).toBe(0);
      expect(rejected.private_attempt_evidence_capability).toBeNull();
      expect(rejected.redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID],
      });

      const normal = await executeWelcomeAudioSafariLivePostPending(envelope);
      expect(normal.private_visual_confirmation_capability).not.toBeNull();
      expect(normal.redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.VISUAL_EVIDENCE_READY);
    }
  });

  test("a permit accessor is never invoked and therefore cannot burn the real permit", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const envelope = validExecuteEnvelope(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });
    let accessorReads = 0;
    Object.defineProperty(envelope, "private_prepared_permit", {
      get() {
        accessorReads += 1;
        throw new Error("must_not_run");
      },
      configurable: true,
      enumerable: true,
    });

    const rejected = await executeWelcomeAudioSafariLivePostPending(envelope);
    expect(accessorReads).toBe(0);
    expect(rejected.private_attempt_evidence_capability).toBeNull();
    expect(rejected.redacted_receipt.blocker_codes)
      .toEqual([WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID]);

    const normal = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });
    expect(normal.private_visual_confirmation_capability).not.toBeNull();
  });

  test("opaque capabilities cannot be serialized", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });

    for (const capability of [
      item.prepared.private_prepared_permit,
      armed.private_host_pending_capability,
      result.private_attempt_evidence_capability,
      result.private_visual_confirmation_capability,
    ]) expect(() => JSON.stringify(capability)).toThrow(/not_serializable/u);
  });
});

describe("strict Safari semantic parser", () => {
  const parsed = (scenario: string) => inspectSyntheticLiveSafariStateForTest({
    scenario,
    exact_target: "Synthetic.Target+1@Example.COM",
    approved_audio_asset_path: "/synthetic/private/approved-audio.m4a",
  });

  test.each([
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.EXACT_ACTIVE_THREAD, true],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.TARGET_SIDEBAR_ONLY, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.TARGET_CASE_VARIANT, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.AMBIGUOUS_DUPLICATE_THREAD, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.ROLELESS_THREAD_DECOY, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.MALFORMED_DEDENT_REINDENT, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.DUPLICATE_ACTIVE_ROOT, false],
    [WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.TARGET_SUBSTRING_DECOY, false],
  ])("binds only exact unique active thread semantics: %s", (scenario, expected) => {
    expect(parsed(scenario)?.exact_thread_bound).toBe(expected);
  });

  test("does not accept a filename outside the one exact attachment preview", () => {
    expect(parsed(
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.FILENAME_OUTSIDE_PREVIEW,
    )?.exact_asset_preview_visible).toBe(false);
    expect(parsed(
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.EXACT_ATTACHMENT_PREVIEW,
    )?.exact_asset_preview_visible).toBe(true);
  });

  test("counts only an outgoing audio bubble scoped to the exact active thread", () => {
    for (const scenario of [
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.UNRELATED_OUTGOING_BUBBLE,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.DEDENTED_OUTGOING_BUBBLE,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.MALFORMED_DEDENT_REINDENT,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.STATIC_TEXT_OUTGOING_VOICE,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.INCOMING_VOICE_BUBBLE,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.OUTGOING_TEXT_BUBBLE,
    ]) expect(parsed(scenario)?.outgoing_audio_bubble_count, scenario).toBe(0);
    for (const scenario of [
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.EXACT_THREAD_OUTGOING_BUBBLE,
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.LIST_ITEM_OUTGOING_VOICE,
    ]) expect(parsed(scenario)?.outgoing_audio_bubble_count, scenario).toBe(1);
  });

  test("ignores composer and attachment controls outside the exact active root", () => {
    expect(parsed(
      WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.CONTROLS_OUTSIDE_ACTIVE_ROOT,
    )).toMatchObject({
      exact_thread_bound: true,
      message_input_visible: false,
      message_composer_empty: false,
      attachment_control_index: null,
      exact_asset_preview_visible: false,
      attachment_preview_count: 0,
      send_control_index: null,
    });
  });

  test.each([
    WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.DUPLICATE_SCOPED_CONTROLS_SAME_INDEX,
    WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO_FOR_TEST.DUPLICATE_SCOPED_CONTROLS_UNINDEXED,
  ])("fails closed on ambiguous scoped controls: %s", (scenario) => {
    expect(parsed(scenario)).toMatchObject({
      exact_thread_bound: true,
      attachment_control_index: null,
      send_control_index: null,
    });
  });
});

describe("driver and source confinement", () => {
  test("exports no live driver or host mint and rejects a caller-supplied four-method fake", async () => {
    const namespace = await import(
      "../scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs"
    );
    const fakeDriver = Object.freeze({
      get_app_state: () => null,
      click: () => null,
      press_key: () => null,
      type_text: () => null,
    });

    expect("createSkySafariDriver" in namespace).toBe(false);
    expect("createWelcomeAudioSafariLiveHostCapability" in namespace).toBe(false);
    expect("createInstalledComputerUseSafariLiveHostCapability" in namespace).toBe(false);
    expect(() => createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest({
      driver: fakeDriver,
      private_audio_asset_capability: Object.freeze({}),
      pending_store_root: "/synthetic/not-used",
    })).toThrow(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
  });

  test("accepts only exact frozen installed-runtime identity and rejects a wrapper fake", () => {
    const runtimeSymbol = Symbol.for("openai.computer-use.runtime");
    const originalRuntime = Object.getOwnPropertyDescriptor(globalThis, runtimeSymbol);
    const originalSky = Object.getOwnPropertyDescriptor(globalThis, "sky");
    const method = () => null;
    const exactRuntime = Object.freeze({
      get_app_state: method,
      click: method,
      press_key: method,
      type_text: method,
    });
    try {
      Object.defineProperty(globalThis, runtimeSymbol, {
        value: exactRuntime,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "sky", {
        value: exactRuntime,
        writable: true,
        configurable: true,
      });
      expect(inspectInstalledComputerUseRuntimeBindingForTest()).toBe(true);

      Object.defineProperty(globalThis, runtimeSymbol, {
        value: Object.freeze({ sky: exactRuntime }),
        writable: true,
        configurable: true,
      });
      expect(inspectInstalledComputerUseRuntimeBindingForTest()).toBe(false);
    } finally {
      if (originalRuntime) Object.defineProperty(globalThis, runtimeSymbol, originalRuntime);
      else Reflect.deleteProperty(globalThis, runtimeSymbol);
      if (originalSky) Object.defineProperty(globalThis, "sky", originalSky);
      else Reflect.deleteProperty(globalThis, "sky");
    }
  });

  test("captures the installed runtime once and resists replacement between check and use", async () => {
    const runtimeSymbol = Symbol.for("openai.computer-use.runtime");
    const originalRuntime = Object.getOwnPropertyDescriptor(globalThis, runtimeSymbol);
    const originalSky = Object.getOwnPropertyDescriptor(globalThis, "sky");
    let originalCalls = 0;
    let replacementCalls = 0;
    const method = () => {
      originalCalls += 1;
      return null;
    };
    const exactRuntime = Object.freeze({
      get_app_state: method,
      click: method,
      press_key: method,
      type_text: method,
    });
    const replacementRuntime = Object.freeze({
      get_app_state: () => {
        replacementCalls += 1;
        return { replaced: true };
      },
      click: () => ({ replaced: true }),
      press_key: () => ({ replaced: true }),
      type_text: () => ({ replaced: true }),
    });
    try {
      Object.defineProperty(globalThis, runtimeSymbol, {
        value: exactRuntime,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, "sky", {
        value: exactRuntime,
        writable: true,
        configurable: true,
      });
      expect(await inspectInstalledComputerUseRuntimeReplacementResistanceForTest({
        replacement_runtime: replacementRuntime,
      })).toBe(true);
      expect(originalCalls).toBe(1);
      expect(replacementCalls).toBe(0);
      expect(Object.getOwnPropertyDescriptor(globalThis, runtimeSymbol)?.value).toBe(exactRuntime);
      expect(Object.getOwnPropertyDescriptor(globalThis, "sky")?.value).toBe(exactRuntime);
    } finally {
      if (originalRuntime) Object.defineProperty(globalThis, runtimeSymbol, originalRuntime);
      else Reflect.deleteProperty(globalThis, runtimeSymbol);
      if (originalSky) Object.defineProperty(globalThis, "sky", originalSky);
      else Reflect.deleteProperty(globalThis, "sky");
    }
  });

  test("hardcodes Safari, exposes no generic callback surface, and contains no network path", async () => {
    const source = await readFile(MODULE_PATH, "utf8");

    expect(SAFARI_APP_ID).toBe("com.apple.Safari");
    expect(source).toContain("const SAFARI_APP_ID = 'com.apple.Safari'");
    expect(source).not.toMatch(/from\s+['"]@oai\/sky['"]/u);
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|axios|https?\.request)\s*\(/u);
    expect(source).not.toMatch(/\b(?:callback|execute_command|raw_action|coordinates?)\b/iu);
    expect(source).not.toMatch(/\b(?:x|y)\s*:/u);
    expect(source).toMatch(/get_app_state\(\{ app: SAFARI_APP_ID,/u);
    expect(source).toMatch(/\.click\(\{ app: SAFARI_APP_ID, element_index:/u);
    expect(source).toMatch(/\.press_key\(\{ app: SAFARI_APP_ID, key:/u);
    expect(source).toMatch(/\.type_text\(\{ app: SAFARI_APP_ID, text:/u);
  });

  test("confirmed receipt is coherent, secret-free, and the driver performs one Send only", async () => {
    const item = await createHarness();
    const { result } = await executeArmed(item);
    const audit = inspectSyntheticSafariDriverForTest({ driver: item.driver });

    expect(audit).toEqual({ stage: "after_send", action_count: 6, state_read_count: 9 });
    expect(result.redacted_receipt.send_control_actuation_count).toBe(1);
    expect(validateWelcomeAudioSafariLiveHostReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(validateWelcomeAudioSafariLiveHostReceipt({
      ...result.redacted_receipt,
      send_control_actuation_count: 0,
    })).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID,
    });
    const serialized = JSON.stringify(result.redacted_receipt);
    for (const privateValue of [
      item.fixture.exactTarget,
      item.assetPath,
      item.identitySha,
      THREAD_SHA,
      OPERATION_ID,
    ]) expect(serialized).not.toContain(privateValue);
  });

  test("rejects malformed UTF-8 PENDING bytes before upload", async () => {
    const item = await createHarness();
    const armed = await armPendingWithRealIssuer(item);
    await writeFile(pendingPaths(item).pending, Buffer.from([0xc3, 0x28]), { mode: 0o600 });
    const result = await execute(item, {
      private_host_pending_capability: armed.private_host_pending_capability,
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND,
    );
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      stage: "chooser",
      action_count: 1,
    });
  });

  test("the exact five-minute confirmation boundary is UNKNOWN, never CONFIRMED", async () => {
    const item = await createHarness();
    const { result } = await executeArmed(item, {
      synthetic_confirmation_now_ms: ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      visual_confirmation_capability_issued: false,
      retry_forbidden_permanently: true,
    });
    expectUnknownAttempt(
      result,
      WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_1_SEND,
    );
  });

  test("the synthetic composite owns claim through one durable CONFIRMED terminal", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.CONFIRMED,
      claim_created: true,
      pending_durable: true,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      terminal_durable: true,
      confirmation_proven: true,
      retry_forbidden_permanently: true,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "after_send", action_count: 6, state_read_count: 9 });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(item.fixture.exactTarget);
    expect(serialized).not.toContain(item.assetPath);
    expect(serialized).not.toContain(item.identitySha);
    expect((await readdir(item.claimRoot)).some(
      (name) => name.startsWith("pending-") || name.startsWith(".pending-"),
    )).toBe(false);
  });

  test("a proven pre-PENDING cancellation leaves the slot reusable for one fresh composite", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const cancelled = await runComposite(
      item,
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST
        .PRE_PENDING_REVALIDATION_FAILURE,
    );
    expect(cancelled.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: true,
      zero_effect_claim_cancelled: true,
      native_chooser_opened: true,
      pending_durable: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_forbidden_permanently: false,
      blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.PENDING_BLOCKED],
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "chooser", action_count: 1, state_read_count: 2 });
    item.operation = await refreshCompositeOperation(item);
    item.driver = createSyntheticSafariDriverForTest({
      scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    });
    const confirmed = await runComposite(item, undefined, {
      synthetic_claim_now_ms: CONTEXT_NOW_MS + 102,
      synthetic_prepare_now_ms: CONTEXT_NOW_MS + 202,
    });
    expect(confirmed.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.CONFIRMED,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      terminal_durable: true,
      confirmation_proven: true,
    });
  });

  test("the live composite rejects injected store, driver, and clock fields before any host action", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runWelcomeAudioSafariLiveCompositeOnce({
      ...compositeCommonInput(item),
      private_store_capability: item.storeCapability,
      driver: item.driver,
      synthetic_terminal_now_ms: CONFIRMATION_AT_MS + 100,
    });
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      native_chooser_opened: false,
      pending_durable: false,
      send_control_actuation_count: 0,
    });
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "thread", action_count: 0, state_read_count: 0 });
  });

  test("the composite receipt validator enforces the full decision truth table", async () => {
    const blocked = (await runWelcomeAudioSafariLiveCompositeOnce({})).redacted_receipt;
    const unknownItem = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SENT_MARKER_ONLY,
    );
    const unknown = (await runComposite(unknownItem)).redacted_receipt;
    const confirmedItem = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const confirmed = (await runComposite(confirmedItem)).redacted_receipt;
    for (const baseline of [blocked, unknown, confirmed]) {
      expect(validateWelcomeAudioSafariLiveCompositeReceipt(baseline))
        .toEqual({ ok: true, reason: null });
    }
    const invalidReceipts = [
      { ...blocked, native_chooser_opened: true },
      { ...blocked, pending_durable: null },
      { ...blocked, terminal_durable: true },
      { ...blocked, zero_effect_claim_cancelled: true },
      {
        ...blocked,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.PREPARE_BLOCKED],
      },
      {
        ...blocked,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.POST_PENDING_UNKNOWN],
      },
      {
        ...unknown,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.PREPARE_BLOCKED],
      },
      {
        ...unknown,
        attachment_upload_entered: false,
        send_control_actuation_count: 1,
      },
      {
        ...unknown,
        pending_durable: null,
        attachment_upload_entered: null,
        send_control_actuation_count: null,
        terminal_durable: true,
      },
      { ...unknown, external_effect_possible: false },
      { ...unknown, native_chooser_opened: false },
      { ...unknown, zero_effect_claim_cancelled: true },
      { ...unknown, pending_durable: false },
      { ...confirmed, native_chooser_opened: false },
      { ...confirmed, pending_durable: null },
      { ...confirmed, send_control_actuation_count: 0 },
      { ...confirmed, terminal_durable: false },
      { ...confirmed, confirmation_proven: false },
      { ...confirmed, external_effect_possible: false },
      {
        ...confirmed,
        blocker_codes: [WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.POST_PENDING_UNKNOWN],
      },
    ];
    for (const receipt of invalidReceipts) {
      expect(validateWelcomeAudioSafariLiveCompositeReceipt(receipt))
        .toEqual({
          ok: false,
          reason: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_BLOCKER.INPUT_INVALID,
        });
    }
  });

  test.each([
    ["sent marker only", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.SENT_MARKER_ONLY, {}],
    ["compose reset only", WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.COMPOSE_RESET_ONLY, {}],
    [
      "visual confirmation at exact five-minute expiry",
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
      {
        synthetic_confirmation_now_ms:
          ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
        synthetic_terminal_now_ms:
          ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS + 1,
      },
    ],
  ])("the sole composite terminalizes weak or stale confirmation as UNKNOWN: %s", async (
    _label,
    scenario,
    overrides,
  ) => {
    const item = await createCompositeHarness(scenario as Scenario);
    const result = await runComposite(
      item,
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.NONE,
      overrides,
    );
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.UNKNOWN,
      claim_created: true,
      pending_durable: true,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      terminal_durable: true,
      confirmation_proven: false,
      retry_forbidden_permanently: true,
    });
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
  });

  test("a lost CONFIRMED return is deduped on rerun with zero additional Send", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(item); // The caller intentionally discards the successful return.
    const afterFirst = inspectSyntheticSafariDriverForTest({ driver: item.driver });
    expect(afterFirst).toEqual({ stage: "after_send", action_count: 6, state_read_count: 9 });
    item.operation = await refreshCompositeOperation(item);
    const rerun = await runComposite(item);
    expect(rerun.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      send_control_actuation_count: 0,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toEqual(afterFirst);
  });

  test("a legacy v1 PENDING artifact blocks the composite without migration or Send", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await writePending(item);
    const result = await runComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      native_chooser_opened: false,
      send_control_actuation_count: 0,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "thread", action_count: 0, state_read_count: 0 });
    expect(JSON.parse(await readFile(pendingPaths(item).pending, "utf8")))
      .toMatchObject({ record_schema_version: "crm_core_instagram_welcome_audio_live_pending_attempt_v1" });
  });

  test("a legacy v1 orphan TERMINAL blocks before runtime, UI, or Send", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await writeFile(
      pendingPaths(item).terminal,
      `${JSON.stringify({
        record_schema_version: "crm_core_instagram_welcome_audio_live_terminal_attempt_v1",
      })}\n`,
      { mode: 0o600 },
    );
    const result = await runComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      zero_effect_claim_cancelled: false,
      native_chooser_opened: false,
      pending_durable: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      terminal_durable: false,
      external_effect_possible: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "thread", action_count: 0, state_read_count: 0 });
    expect(JSON.parse(await readFile(pendingPaths(item).terminal, "utf8")))
      .toEqual({
        record_schema_version: "crm_core_instagram_welcome_audio_live_terminal_attempt_v1",
      });
  });

  test("a valid zero-effect preparation block cancels and reuses the slot", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.PRIOR_AUDIO_PRESENT,
    );
    const result = await runComposite(item);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: true,
      zero_effect_claim_cancelled: true,
      native_chooser_opened: false,
      pending_durable: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      action_count: 0,
    });
  });

  test("a host-factory failure before UI cancels only the proven zero-effect claim", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runComposite(
      item,
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.NONE,
      { driver: Object.freeze({}) },
    );
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: true,
      zero_effect_claim_cancelled: true,
      native_chooser_opened: false,
      pending_durable: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_forbidden_permanently: false,
    });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver }))
      .toEqual({ stage: "thread", action_count: 0, state_read_count: 0 });
  });

  test.each([
    WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.THROW_AFTER_CHOOSER,
    WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.INVALID_PREPARED_RECEIPT,
  ])("a preparation receipt failure stays fail-closed without cancellation or Send: %s", async (
    faultScenario,
  ) => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runComposite(item, faultScenario);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      native_chooser_opened: true,
      pending_durable: false,
      terminal_durable: false,
      external_effect_possible: false,
      retry_forbidden_permanently: true,
    });
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      stage: "chooser",
      action_count: 1,
    });
    const names = await readdir(item.claimRoot);
    expect(names.filter((name) => name.startsWith("claim-"))).toHaveLength(1);
    expect(names.some((name) => name.startsWith("reservation-cancel-"))).toBe(false);
    item.operation = await refreshCompositeOperation(item);
    const rerun = await runComposite(item);
    expect(rerun.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT,
      claim_created: false,
      zero_effect_claim_cancelled: false,
    });
  });

  test("a throw after durable PENDING publishes UNKNOWN and never reaches upload or Send", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    const result = await runComposite(
      item,
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.THROW_AFTER_PENDING_LINK,
    );
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.UNKNOWN,
      claim_created: true,
      zero_effect_claim_cancelled: false,
      pending_durable: true,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      terminal_durable: true,
      confirmation_proven: false,
      external_effect_possible: false,
      retry_forbidden_permanently: true,
    });
    expect(validateWelcomeAudioSafariLiveCompositeReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(inspectSyntheticSafariDriverForTest({ driver: item.driver })).toMatchObject({
      stage: "chooser",
      action_count: 1,
    });
    const names = await readdir(item.claimRoot);
    expect(names.some((name) => name.startsWith("terminal-"))).toBe(true);
    expect(names.some((name) => name.startsWith("pending-"))).toBe(false);
    expect(names.some((name) => name.startsWith("reservation-cancel-"))).toBe(false);
  });

  test("the general issuer finalizer consumes valid host evidence into CONFIRMED", async () => {
    const item = await createHarness();
    const { armed, result } = await executeArmed(item);
    const terminal = await finalizeHostAttempt(armed, result);
    expect(terminal.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED,
      pending_record_present: false,
      terminal_record_present: true,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
    });
  });

  test("forged, cross-attempt, replayed, and stale evidence becomes durable UNKNOWN", async () => {
    const forgedItem = await createHarness();
    const forgedAttempt = await executeArmed(forgedItem);
    const forged = await finalizeHostAttempt(forgedAttempt.armed, forgedAttempt.result, undefined, {
      private_attempt_evidence_capability: Object.freeze({ forged: true }),
    });
    expect(forged.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
    expect((await finalizeHostAttempt(forgedAttempt.armed, forgedAttempt.result)).redacted_receipt)
      .toMatchObject({ decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED });

    const leftItem = await createHarness();
    const rightItem = await createHarness();
    const left = await executeArmed(leftItem);
    const right = await executeArmed(rightItem);
    expect((await finalizeHostAttempt(left.armed, right.result)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
    expect((await finalizeHostAttempt(right.armed, right.result)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);

    const staleItem = await createHarness();
    const stale = await executeArmed(staleItem);
    expect((await finalizeHostAttempt(
      stale.armed,
      stale.result,
      ATTEMPTED_AT_MS + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    )).redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
  });

  test("a backward attempt clock is replaced by a safe durable UNKNOWN terminal", async () => {
    const item = await createHarness();
    const attempt = await executeArmed(item, {
      synthetic_attempted_at_ms: PENDING_AT_MS - 1,
      synthetic_confirmation_now_ms: PENDING_AT_MS,
    });
    expect((await finalizeHostAttempt(attempt.armed, attempt.result)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
    const names = await readdir(item.claimRoot);
    expect(names.some((name) => name.startsWith("terminal-"))).toBe(true);
    expect(names.some((name) => name.startsWith("pending-"))).toBe(false);
  });

  test.each([
    WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.IMPORT_FAILURE,
    WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.MODULE_IDENTITY_FAILURE,
    WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.VERIFIER_FAILURE,
  ])("terminal verifier fault is durable UNKNOWN: %s", async (scenario) => {
    const item = await createHarness();
    const attempt = await executeArmed(item);
    expect(configureWelcomeAudioLiveTerminalVerifierScenarioForTest({
      private_terminal_capability: attempt.armed.private_terminal_capability,
      scenario,
    })).toBe("fresh");
    expect((await finalizeHostAttempt(attempt.armed, attempt.result)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
  });

  test.each(["extra", "symbol", "null-prototype", "class"])(
    "invalid non-Proxy finalizer envelope burns the located cap into UNKNOWN: %s",
    async (kind) => {
      const item = await createHarness();
      const attempt = await executeArmed(item);
      const base = {
        private_terminal_capability: attempt.armed.private_terminal_capability,
        required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
        private_attempt_evidence_capability: attempt.result.private_attempt_evidence_capability,
        private_visual_confirmation_capability:
          attempt.result.private_visual_confirmation_capability,
        synthetic_now_ms: CONFIRMATION_AT_MS + 100,
      } as Record<PropertyKey, unknown>;
      let envelope: object = base;
      if (kind === "extra") envelope = { ...base, unexpected: true };
      if (kind === "symbol") {
        envelope = { ...base };
        Object.defineProperty(envelope, Symbol("unexpected"), { value: true, enumerable: true });
      }
      if (kind === "null-prototype") envelope = Object.assign(Object.create(null), base);
      if (kind === "class") envelope = Object.assign(new (class Envelope {})(), base);
      expect((await finalizeWelcomeAudioLiveAttempt(envelope)).redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
      expect((await finalizeHostAttempt(attempt.armed, attempt.result)).redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED);
    },
  );

  test.each(["accessor", "proxy", "revoked"])(
    "unlocatable finalizer cap is not invoked or burned: %s",
    async (kind) => {
      const item = await createHarness();
      const attempt = await executeArmed(item);
      const base = {
        private_terminal_capability: attempt.armed.private_terminal_capability,
        required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
        private_attempt_evidence_capability: attempt.result.private_attempt_evidence_capability,
        private_visual_confirmation_capability:
          attempt.result.private_visual_confirmation_capability,
        synthetic_now_ms: CONFIRMATION_AT_MS + 100,
      };
      let reads = 0;
      let envelope: object;
      if (kind === "accessor") {
        envelope = { ...base };
        Object.defineProperty(envelope, "private_terminal_capability", {
          enumerable: true,
          get() { reads += 1; return attempt.armed.private_terminal_capability; },
        });
      } else if (kind === "proxy") {
        envelope = new Proxy(base, {
          get() { reads += 1; throw new Error("trap"); },
          ownKeys() { reads += 1; throw new Error("trap"); },
          getOwnPropertyDescriptor() { reads += 1; throw new Error("trap"); },
          getPrototypeOf() { reads += 1; throw new Error("trap"); },
        });
      } else {
        const revocable = Proxy.revocable(base, {});
        revocable.revoke();
        envelope = revocable.proxy;
      }
      expect((await finalizeWelcomeAudioLiveAttempt(envelope)).redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED);
      expect(reads).toBe(0);
      expect((await finalizeHostAttempt(attempt.armed, attempt.result)).redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED);
    },
  );

  test.each(["confirmed", "unknown"])(
    "terminal post-link crash recovers cleanup without outcome downgrade: %s",
    async (outcome) => {
      const item = await createHarness();
      const attempt = await executeArmed(item);
      expect(configureWelcomeAudioLiveTerminalVerifierScenarioForTest({
        private_terminal_capability: attempt.armed.private_terminal_capability,
        scenario: WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST.CRASH_AFTER_TERMINAL_PUBLISH,
      })).toBe("fresh");
      const terminal = await finalizeHostAttempt(attempt.armed, attempt.result, undefined, outcome
        === "confirmed"
        ? {}
        : {
          private_attempt_evidence_capability: null,
          private_visual_confirmation_capability: null,
        });
      expect(terminal.redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL);
      const recovered = await recoverAttempt(item);
      expect(recovered.redacted_receipt.decision).toBe(outcome === "confirmed"
        ? WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_CONFIRMED
        : WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
      const names = await readdir(item.claimRoot);
      expect(names.some((name) => name.startsWith("pending-"))).toBe(false);
    },
  );

  test("terminal publication never deletes a substituted PENDING or reports success", async () => {
    const item = await createHarness();
    const attempt = await executeArmed(item);
    expect(configureWelcomeAudioLiveTerminalVerifierScenarioForTest({
      private_terminal_capability: attempt.armed.private_terminal_capability,
      scenario: WELCOME_AUDIO_LIVE_TERMINAL_VERIFIER_SCENARIO_FOR_TEST
        .REPLACE_PENDING_AFTER_TERMINAL_PUBLISH,
    })).toBe("fresh");
    const terminal = await finalizeHostAttempt(attempt.armed, attempt.result);
    expect(terminal.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.UNKNOWN_TERMINAL,
      terminal_record_present: true,
      claim_capability_consumed: true,
    });
    const retained = (await readdir(item.claimRoot)).filter(
      (name) => name.startsWith("pending-") || name.startsWith(".pending-"),
    );
    expect(retained.length).toBeGreaterThanOrEqual(2);
    for (const name of retained) {
      expect((await lstat(join(item.claimRoot, name))).mode & 0o7777).toBe(0o600);
    }
    const operation = await refreshCompositeOperation(item);
    expect((await issueCompositeClaim(item, operation, CONTEXT_NOW_MS + 200))
      .redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL);
  });

  test("observation ledger reconciles a true post-link crash and advances the ordinal", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    expect((await runComposite(item)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.CONFIRMED);
    const first = await claimObservation(item, CONFIRMATION_AT_MS + 200);
    expect(first.result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
      thread_observation_count: 1,
      mission_observation_count: 1,
    });
    const firstName = (await readdir(item.claimRoot)).find(
      (name) => name.startsWith("observation-"),
    )!;
    const missionHash = /^observation-([a-f0-9]{64})-/u.exec(firstName)![1];
    const linkedTemp = join(
      item.claimRoot,
      `.observation-${missionHash}-${process.pid}-${"a".repeat(32)}.json`,
    );
    await link(join(item.claimRoot, firstName), linkedTemp);
    const second = await claimObservation(item, CONFIRMATION_AT_MS + 201);
    expect(second.result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
      thread_observation_count: 2,
      mission_observation_count: 2,
    });
    await expect(lstat(linkedTemp)).rejects.toThrow();
    const third = await claimObservation(item, CONFIRMATION_AT_MS + 202);
    expect(third.result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
      thread_observation_count: 3,
      mission_observation_count: 3,
    });
    expect(await consumeObservation(
      third.result.private_observation_capability,
      third.terminal,
      CONFIRMATION_AT_MS + 203,
      { expected_operation_id: "wrong_operation" },
    )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
    expect(await consumeObservation(
      third.result.private_observation_capability,
      third.terminal,
      CONFIRMATION_AT_MS + 204,
    )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
    expect((await claimObservation(item, CONFIRMATION_AT_MS + 205)).result.redacted_receipt)
      .toMatchObject({
        decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED,
        thread_observation_count: 3,
        mission_observation_count: 3,
      });
  });

  test("an observation published before a lost return consumes its ordinal", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(item);
    const terminal = JSON.parse(await readFile(pendingPaths(item).terminal, "utf8"));
    const lost = await claimWelcomeAudioLiveReplyObservationForTest({
      private_store_capability: item.storeCapability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      operation_id: terminal.operation_id,
      identity_anchor_sha256: terminal.identity_anchor_sha256,
      thread_anchor_sha256: terminal.thread_anchor_sha256,
      attempt_nonce: terminal.attempt_nonce,
      now_ms: CONFIRMATION_AT_MS + 200,
      crash_after_publish: true,
    });
    expect(lost.private_observation_capability).toBeNull();
    expect(lost.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED,
      thread_observation_count: 1,
      mission_observation_count: 1,
    });
    expect((await claimObservation(item, CONFIRMATION_AT_MS + 201)).result.redacted_receipt)
      .toMatchObject({
        decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
        thread_observation_count: 2,
        mission_observation_count: 2,
      });
  });

  test("UNKNOWN terminal cannot mint an observation capability", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(
      item,
      WELCOME_AUDIO_SAFARI_SYNTHETIC_COMPOSITE_FAULT_SCENARIO_FOR_TEST.THROW_AFTER_PENDING_LINK,
    );
    const observation = await claimObservation(item, CONFIRMATION_AT_MS + 200);
    expect(observation.result.private_observation_capability).toBeNull();
    expect(observation.result.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED);
  });

  test("concurrent observation claims never publish duplicate ordinals", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(item);
    await Promise.all([
      claimObservation(item, CONFIRMATION_AT_MS + 200),
      claimObservation(item, CONFIRMATION_AT_MS + 200),
      claimObservation(item, CONFIRMATION_AT_MS + 200),
    ]);
    const readOrdinals = async () => Promise.all((await readdir(item.claimRoot))
      .filter((name) => name.startsWith("observation-"))
      .map(async (name) => JSON.parse(await readFile(join(item.claimRoot, name), "utf8"))
        .thread_observation_ordinal));
    let ordinals = await readOrdinals();
    expect(new Set(ordinals).size).toBe(ordinals.length);
    while (ordinals.length < 3) {
      await claimObservation(item, CONFIRMATION_AT_MS + 201 + ordinals.length);
      ordinals = await readOrdinals();
    }
    expect([...ordinals].sort((left, right) => left - right)).toEqual([1, 2, 3]);
    expect((await claimObservation(item, CONFIRMATION_AT_MS + 210)).result.redacted_receipt)
      .toMatchObject({
        decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED,
        thread_observation_count: 3,
        mission_observation_count: 3,
      });
  });

  test("terminal and observation-record tamper block later observation claims", async () => {
    const terminalItem = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(terminalItem);
    const terminalPath = pendingPaths(terminalItem).terminal;
    const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
    await writeFile(terminalPath, `${JSON.stringify({ ...terminal, unexpected: true })}\n`, {
      mode: 0o600,
    });
    expect((await claimObservation(terminalItem, CONFIRMATION_AT_MS + 200))
      .result.redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED);

    const recordItem = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(recordItem);
    await claimObservation(recordItem, CONFIRMATION_AT_MS + 200);
    const observationName = (await readdir(recordItem.claimRoot))
      .find((name) => name.startsWith("observation-"))!;
    const observationPath = join(recordItem.claimRoot, observationName);
    const record = JSON.parse(await readFile(observationPath, "utf8"));
    await writeFile(observationPath, `${JSON.stringify({ ...record, unexpected: true })}\n`, {
      mode: 0o600,
    });
    expect((await claimObservation(recordItem, CONFIRMATION_AT_MS + 201))
      .result.redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED);
  });

  test("observation mission cap advances 1 through 9 and blocks 10", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(item);
    const originalPath = pendingPaths(item).terminal;
    const original = JSON.parse(await readFile(originalPath, "utf8"));
    const originalClaimPath = join(
      item.claimRoot,
      `claim-${sha256(`identity:${item.identitySha}`)}.json`,
    );
    const originalClaim = JSON.parse(await readFile(originalClaimPath, "utf8"));
    const terminals = [original];
    for (const index of [2, 3]) {
      const lineage = {
        operation_id: `synthetic_live_operation_00${index}`,
        identity_anchor_sha256: String(index).repeat(64),
        thread_anchor_sha256: String(index + 3).repeat(64),
        manifest_ordinal: index,
        mission_slot: index,
        claim_nonce: String(index + 5).repeat(64),
        owner_nonce: String(index + 6).repeat(64),
      };
      const cloned = {
        ...original,
        ...lineage,
        attempt_nonce: (index === 2 ? "9" : "a").repeat(64),
      };
      const clonedClaim = { ...originalClaim, ...lineage };
      const clonedPath = join(
        item.claimRoot,
        `terminal-${sha256(`identity:${cloned.identity_anchor_sha256}`)}.json`,
      );
      const clonedClaimPath = join(
        item.claimRoot,
        `claim-${sha256(`identity:${cloned.identity_anchor_sha256}`)}.json`,
      );
      await writeFile(clonedClaimPath, `${JSON.stringify(clonedClaim)}\n`, { mode: 0o600 });
      await writeFile(clonedPath, `${JSON.stringify(cloned)}\n`, { mode: 0o600 });
      terminals.push(cloned);
    }
    let missionCount = 0;
    for (const terminal of terminals) {
      for (let threadCount = 1; threadCount <= 3; threadCount += 1) {
        missionCount += 1;
        const observation = await claimObservationForTerminal(
          item,
          terminal,
          CONFIRMATION_AT_MS + 200 + missionCount,
        );
        expect(observation.result.redacted_receipt).toMatchObject({
          decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.CLAIMED,
          thread_observation_count: threadCount,
          mission_observation_count: missionCount,
        });
      }
    }
    const tenth = await claimWelcomeAudioLiveReplyObservation({
      private_store_capability: item.storeCapability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      operation_id: "synthetic_live_operation_004",
      identity_anchor_sha256: "4".repeat(64),
      thread_anchor_sha256: "8".repeat(64),
      attempt_nonce: "b".repeat(64),
      now_ms: CONFIRMATION_AT_MS + 300,
    });
    expect(tenth.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED,
      thread_observation_count: 0,
      mission_observation_count: 9,
    });
  });

  test("observation caps reject exact expiry and safely handle invalid envelopes", async () => {
    const item = await createCompositeHarness(
      WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
    );
    await runComposite(item);
    const claimedAt = CONFIRMATION_AT_MS + 200;
    const expired = await claimObservation(item, claimedAt);
    expect(await consumeObservation(
      expired.result.private_observation_capability,
      expired.terminal,
      claimedAt + WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
    expect((await claimObservation(
      item,
      Date.parse(expired.terminal.observation_window_expires_at),
    )).result.redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_DECISION.BLOCKED);

    const extra = await claimObservation(item, claimedAt + 1);
    expect(await consumeWelcomeAudioLiveReplyObservationCapabilityOnce({
      ...observationConsumeEnvelope(
        extra.result.private_observation_capability,
        extra.terminal,
        claimedAt + 2,
      ),
      unexpected: true,
    })).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
    expect(await consumeObservation(
      extra.result.private_observation_capability,
      extra.terminal,
      claimedAt + 3,
    )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);

    const accessor = await claimObservation(item, claimedAt + 4);
    const validEnvelope = observationConsumeEnvelope(
      accessor.result.private_observation_capability,
      accessor.terminal,
      claimedAt + 5,
    );
    let accessorReads = 0;
    const accessorEnvelope = { ...validEnvelope } as Record<string, unknown>;
    Object.defineProperty(accessorEnvelope, "private_observation_capability", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return accessor.result.private_observation_capability;
      },
    });
    expect(await consumeWelcomeAudioLiveReplyObservationCapabilityOnce(accessorEnvelope))
      .toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
    expect(accessorReads).toBe(0);
    expect(await consumeObservation(
      accessor.result.private_observation_capability,
      accessor.terminal,
      claimedAt + 6,
    )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.VALID);
  });

  test.each(["proxy", "revoked"])(
    "observation consume rejects a %s envelope without traps or capability burn",
    async (kind) => {
      const item = await createCompositeHarness(
        WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
      );
      await runComposite(item);
      const claimedAt = CONFIRMATION_AT_MS + 200;
      const observation = await claimObservation(item, claimedAt);
      const valid = observationConsumeEnvelope(
        observation.result.private_observation_capability,
        observation.terminal,
        claimedAt + 1,
      );
      let traps = 0;
      let envelope: object;
      if (kind === "proxy") {
        envelope = new Proxy(valid, {
          get() { traps += 1; throw new Error("trap"); },
          ownKeys() { traps += 1; throw new Error("trap"); },
          getOwnPropertyDescriptor() { traps += 1; throw new Error("trap"); },
          getPrototypeOf() { traps += 1; throw new Error("trap"); },
        });
      } else {
        const revocable = Proxy.revocable(valid, {});
        revocable.revoke();
        envelope = revocable.proxy;
      }
      expect(await consumeWelcomeAudioLiveReplyObservationCapabilityOnce(envelope))
        .toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.INVALID);
      expect(traps).toBe(0);
      expect(await consumeObservation(
        observation.result.private_observation_capability,
        observation.terminal,
        claimedAt + 2,
      )).toBe(WELCOME_AUDIO_LIVE_OBSERVATION_CAPABILITY_STATUS.VALID);
    },
  );

  test("the host namespace exposes one live composite and no raw live primitives", async () => {
    const namespace = await import(
      "../scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs"
    );
    expect(namespace.runWelcomeAudioSafariLiveCompositeOnce).toBeTypeOf("function");
    expect(namespace.runWelcomeAudioSafariSyntheticCompositeOnceForTest).toBeTypeOf("function");
    expect(namespace.runWelcomeAudioSafariUiAttestedLiveCompositeOnce).toBeTypeOf("function");
    expect(namespace.runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest)
      .toBeTypeOf("function");
    expect(namespace.validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt)
      .toBeTypeOf("function");
    for (const forbidden of [
      "prepareWelcomeAudioSafariLiveTarget",
      "executeWelcomeAudioSafariLivePostPending",
      "consumeWelcomeAudioSafariAttemptEvidenceCapabilityOnce",
      "consumeWelcomeAudioSafariVisualConfirmationCapabilityOnce",
      "createInstalledComputerUseSafariLiveHostCapability",
      "createTrustedSkySafariDriverFromInstalledRuntime",
    ]) expect(namespace).not.toHaveProperty(forbidden);
    const unsuffixedEffectful = Object.keys(namespace).filter((name) => (
      /^(?:run|prepare|execute|consume|create)/u.test(name)
      && !name.endsWith("ForTest")
    ));
    expect(unsuffixedEffectful).toEqual([
      "runWelcomeAudioSafariLiveCompositeOnce",
      "runWelcomeAudioSafariUiAttestedLiveCompositeOnce",
    ]);
    const unsuffixedSyntheticScenarioOrFaultControls = Object.keys(namespace).filter((name) => (
      /synthetic/iu.test(name)
      && /(?:scenario|fault)/iu.test(name)
      && !/(?:_FOR_TEST|ForTest)$/u.test(name)
    ));
    expect(unsuffixedSyntheticScenarioOrFaultControls).toEqual([]);
  });
});
