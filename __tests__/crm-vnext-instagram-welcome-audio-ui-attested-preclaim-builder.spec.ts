import { createHash } from "node:crypto";
import { chmod, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST,
  createSyntheticSafariDriverForTest,
  observeWelcomeAudioSafariUiAttestedPreclaimOnceForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs";
import {
  WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION,
  validateApprovedWelcomeAudioAsset,
  validateWelcomeAudioLivePreflightReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";
import {
  createSyntheticWelcomeAudioLiveClaimStoreCapability,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs";
import {
  buildWelcomeAudioUiAttestedPreclaimBundle,
  buildWelcomeAudioUiAttestedPreclaimBundleForTest,
  validateWelcomeAudioUiAttestedLiveAuthorizationSeed,
  validateWelcomeAudioUiAttestedPreclaimBuilderReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
  materializeWelcomeAudioUiAttestedCanaryPacketDraft,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256,
  computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256,
  publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs";

const NOW_MS = Date.parse("2026-07-18T15:00:00.000Z");
const TARGET = "synthetic.target_01";
const THREAD = "synthetic-thread-reference-01";
const OWNER = "synthetic.owner_01";
const cleanupPaths: string[] = [];
let harnessSequence = 0;

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

const sourceInput = (
  relationship: "confirmed" | "recent" = "confirmed",
  suffix = "001",
) => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: `synthetic_preclaim_source_mission_${suffix}`,
  notification_row: {
    row_ordinal: 1,
    exact_target_utf8: TARGET,
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: relationship === "recent" ? "4 days" : "today",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-18T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: TARGET,
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: relationship === "recent"
      ? "recent_follow_event_no_explicit_contradiction"
      : "confirmed",
    follows_owner_evidence: relationship === "recent"
      ? "exact_recent_follow_notification_profile_binding_visible_3_to_7_day_pilot_bucket"
      : "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-18T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: THREAD,
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-18T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: OWNER,
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-18T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: TARGET,
    bound_thread_reference_utf8: THREAD,
    owner_account_reference_utf8: OWNER,
    checked_at: "2026-07-18T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const createAsset = async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "preclaim-builder-test-")));
  cleanupPaths.push(root);
  await chmod(root, 0o700);
  const bytes = Buffer.from("synthetic-approved-audio-bytes", "utf8");
  const assetPath = join(root, "approved.m4a");
  await writeFile(assetPath, bytes, { mode: 0o600 });
  await chmod(assetPath, 0o600);
  return {
    assetPath,
    audioSha256: createHash("sha256").update(bytes).digest("hex"),
  };
};

const createHarness = async ({
  relationship = "confirmed",
  observationNowMs = NOW_MS,
}: {
  relationship?: "confirmed" | "recent";
  observationNowMs?: number;
} = {}) => {
  harnessSequence += 1;
  const suffix = String(harnessSequence).padStart(3, "0");
  const asset = await createAsset();
  const source = sourceInput(relationship, suffix);
  const materialized = materializeWelcomeAudioUiAttestedCanaryPacketDraft({
    ui_attested_input: source,
    packet_request: {
      schema_version: WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
      status: "approved_for_no_live_materialization_only",
      mission_id: `synthetic_preclaim_mission_${suffix}`,
      contract_version: "synthetic_preclaim_contract_v1",
      central_repo_head: "7".repeat(40),
      authorization_id: `synthetic_preclaim_authorization_${suffix}`,
      expected_source_mission_id: source.mission_id,
      candidate_cap: 1,
      future_attempt_cap: 1,
      approved_audio_asset_id: `synthetic_preclaim_audio_${suffix}`,
      approved_audio_sha256: asset.audioSha256,
      approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
      execution_approval_authorized: false,
      external_effect_authorized: false,
    },
    now_ms: NOW_MS,
  });
  expect(materialized.private_draft).not.toBeNull();
  const draft = materialized.private_draft!;
  const projection = draft.source_projection;
  const anchors = projection.anchors;
  const seed = {
    schema_version: "crm_core_instagram_welcome_audio_ui_attested_live_authorization_seed_v1",
    status: "approved_exact_single_send_seed",
    mission_contract_sha256: "8".repeat(64),
    active_next_action_id: `synthetic_preclaim_next_action_${suffix}`,
    active_next_action_sha256: "9".repeat(64),
    approval_packet_id: `synthetic_preclaim_approval_${suffix}`,
    approved_audio_asset_path: asset.assetPath,
    approved_at: "2026-07-18T14:59:45.000Z",
    expires_at: "2026-07-18T15:04:45.000Z",
    expected_central_repo_head: draft.central_repo_head,
    expected_draft_sha256:
      computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft),
    expected_projection_sha256:
      computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(projection),
    expected_operation_id: draft.operation_id,
    expected_authorization_id: draft.authorization_id,
    expected_source_evidence_sha256: projection.source_evidence_sha256,
    expected_candidate_anchor_sha256: anchors.candidate_anchor_sha256,
    expected_thread_anchor_sha256: anchors.thread_anchor_sha256,
    expected_owner_anchor_sha256: anchors.owner_anchor_sha256,
    expected_dedupe_anchor_sha256: anchors.dedupe_anchor_sha256,
    expected_audio_sha256: draft.approved_audio_sha256,
    seed_nonce_sha256: digest(`synthetic-preclaim-seed-nonce-${suffix}`),
  };
  const audio = await validateApprovedWelcomeAudioAsset({
    asset_path: asset.assetPath,
    expected_audio_sha256: asset.audioSha256,
  });
  expect(audio.private_capability).not.toBeNull();
  expect(validateWelcomeAudioLivePreflightReceipt(audio.redacted_receipt)).toEqual({
    ok: true,
    reason: null,
  });
  expect(audio.redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID);
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
  const driver = createSyntheticSafariDriverForTest({
    scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
  });
  const observation = await observeWelcomeAudioSafariUiAttestedPreclaimOnceForTest({
    driver,
    now_ms: observationNowMs,
    authority_root: authorityRoot,
    private_store_capability: storeCapability,
    synthetic_store_root: claimRoot,
    private_audio_asset_capability: audio.private_capability,
    exact_target: TARGET,
    exact_bound_thread_reference: THREAD,
    exact_owner_account_reference: OWNER,
    approved_audio_asset_path: asset.assetPath,
    expected_audio_sha256: seed.expected_audio_sha256,
    expected_central_repo_head: seed.expected_central_repo_head,
    expected_mission_contract_sha256: seed.mission_contract_sha256,
    expected_active_next_action_id: seed.active_next_action_id,
    expected_active_next_action_sha256: seed.active_next_action_sha256,
  });
  expect(observation.private_preclaim_observation_capability).not.toBeNull();
  return {
    asset,
    audio,
    authorityRoot,
    claimRoot,
    draft,
    driver,
    observation,
    seed,
    storeCapability,
    suffix,
  };
};

const build = (item: Awaited<ReturnType<typeof createHarness>>, overrides = {}) => (
  buildWelcomeAudioUiAttestedPreclaimBundleForTest({
    private_draft: item.draft,
    private_authorization_seed: item.seed,
    private_audio_asset_capability: item.audio.private_capability,
    private_preclaim_observation_capability:
      item.observation.private_preclaim_observation_capability,
    now_ms: NOW_MS,
    ...overrides,
  })
);

const freshSeed = (
  item: Awaited<ReturnType<typeof createHarness>>,
  label: string,
) => ({
  ...item.seed,
  approval_packet_id: `synthetic_preclaim_approval_${item.suffix}_${label}`,
  seed_nonce_sha256: digest(`synthetic-preclaim-seed-${item.suffix}-${label}`),
});

const freshObservation = async (
  item: Awaited<ReturnType<typeof createHarness>>,
  nowMs = NOW_MS,
) => {
  const driver = createSyntheticSafariDriverForTest({
    scenario: WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO_FOR_TEST.CONFIRMED_NEW_AUDIO_BUBBLE,
  });
  const observed = await observeWelcomeAudioSafariUiAttestedPreclaimOnceForTest({
    driver,
    now_ms: nowMs,
    authority_root: item.authorityRoot,
    private_store_capability: item.storeCapability,
    synthetic_store_root: item.claimRoot,
    private_audio_asset_capability: item.audio.private_capability,
    exact_target: TARGET,
    exact_bound_thread_reference: THREAD,
    exact_owner_account_reference: OWNER,
    approved_audio_asset_path: item.asset.assetPath,
    expected_audio_sha256: item.seed.expected_audio_sha256,
    expected_central_repo_head: item.seed.expected_central_repo_head,
    expected_mission_contract_sha256: item.seed.mission_contract_sha256,
    expected_active_next_action_id: item.seed.active_next_action_id,
    expected_active_next_action_sha256: item.seed.active_next_action_sha256,
  });
  expect(observed.private_preclaim_observation_capability).not.toBeNull();
  return observed;
};

describe("UI-attested PRECLAIM builder", () => {
  test.each(["confirmed", "recent"] as const)(
    "builds one exact neutral PRECLAIM for %s relationship evidence",
    async (relationship) => {
      const item = await createHarness({ relationship });
      expect(validateWelcomeAudioUiAttestedLiveAuthorizationSeed(
        item.seed,
        item.draft,
        NOW_MS,
      )).not.toBeNull();
      const result = await build(item);
      expect(result.private_operation_snapshot).not.toBeNull();
      expect(result.private_publisher_authorization).not.toBeNull();
      expect(validateWelcomeAudioUiAttestedPreclaimBuilderReceipt(result.redacted_receipt))
        .toEqual({ ok: true });
      const snapshot = result.private_operation_snapshot!;
      expect(snapshot.binding.follows_owner).toBe(item.draft.source_projection.profile.follows_owner);
      expect(snapshot.follower_evidence.evidence_observed_at)
        .toBe(item.draft.source_projection.dedupe.checked_at);
      const digests = [
        snapshot.canonical_operation_sha256,
        snapshot.operation.canonical_operation_sha256,
        snapshot.approval.canonical_operation_sha256,
        snapshot.context.canonical_operation_sha256,
        snapshot.effect_claim.canonical_operation_sha256,
        snapshot.execution.canonical_operation_sha256,
        snapshot.confirmation.canonical_operation_sha256,
      ];
      expect(new Set(digests).size).toBe(1);
      expect(digests[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(snapshot.effect_claim).toMatchObject({
        status: "unclaimed",
        claim_result: "not_started",
        claim_token_status: "not_issued",
        atomic: false,
        permanent: false,
      });
      expect(snapshot.execution).toMatchObject({
        attempt_budget: 1,
        send_attempt_count: 0,
        attempt_state: "not_attempted",
        retry_requested: false,
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.operation)).toBe(true);
      expect(validateWelcomeAudioUiAttestedLiveAuthorizationSeed(
        item.seed,
        item.draft,
        NOW_MS,
      )).toBeNull();
    },
  );

  test("emits publisher-ready authorization accepted by the synthetic publisher", async () => {
    const item = await createHarness();
    const result = await build(item);
    const authorityRoot = await realpath(await mkdtemp(join(
      tmpdir(),
      WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
    )));
    cleanupPaths.push(authorityRoot);
    await chmod(authorityRoot, 0o700);
    const published = await publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: authorityRoot,
      private_draft: item.draft,
      private_authorization: result.private_publisher_authorization,
      now_ms: NOW_MS,
    });
    expect(published.private_authority_envelope).not.toBeNull();
    expect(published.private_authority_envelope!.authority.canonical_operation_sha256)
      .toBe(result.private_operation_snapshot!.canonical_operation_sha256);
  });

  test("burns the seed atomically and rejects a structurally cloned replay", async () => {
    const item = await createHarness();
    const first = await build(item);
    const second = await build(item, {
      private_authorization_seed: structuredClone(item.seed),
      private_preclaim_observation_capability:
        (await freshObservation(item)).private_preclaim_observation_capability,
    });
    expect(first.private_operation_snapshot).not.toBeNull();
    expect(second.private_operation_snapshot).toBeNull();
    expect(second.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_authorization_seed_replayed",
    ]);
    expect(validateWelcomeAudioUiAttestedLiveAuthorizationSeed(
      structuredClone(item.seed),
      item.draft,
      NOW_MS,
    )).toBeNull();
  });

  test("burns an exact seed on cross-draft mismatch before it can authorize its draft", async () => {
    const intended = await createHarness();
    const other = await createHarness();
    const mismatch = await build(other, {
      private_authorization_seed: intended.seed,
    });
    expect(mismatch.private_operation_snapshot).toBeNull();
    expect(mismatch.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_exact_binding_invalid",
    ]);
    const laterIntended = await build(intended);
    expect(laterIntended.private_operation_snapshot).toBeNull();
    expect(laterIntended.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_authorization_seed_replayed",
    ]);
  });

  test("burns a fresh seed when its observation is replayed", async () => {
    const item = await createHarness();
    expect((await build(item)).private_operation_snapshot).not.toBeNull();
    const secondSeed = freshSeed(item, "observation_replay");
    const replayedObservation = await build(item, {
      private_authorization_seed: secondSeed,
    });
    expect(replayedObservation.private_operation_snapshot).toBeNull();
    expect(replayedObservation.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_observation_invalid_or_replayed",
    ]);
    const retry = await build(item, {
      private_authorization_seed: secondSeed,
      private_preclaim_observation_capability:
        (await freshObservation(item)).private_preclaim_observation_capability,
    });
    expect(retry.private_operation_snapshot).toBeNull();
    expect(retry.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_authorization_seed_replayed",
    ]);
  });

  test("rejects stale observation, hostile envelopes, and extra live controls", async () => {
    const stale = await createHarness({ observationNowMs: NOW_MS - 300_000 });
    const staleResult = await build(stale);
    expect(staleResult.private_operation_snapshot).toBeNull();
    expect(staleResult.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_observation_invalid_or_replayed",
    ]);

    const item = await createHarness();
    const hostile = new Proxy({}, { get: () => { throw new Error("getter invoked"); } });
    expect((await buildWelcomeAudioUiAttestedPreclaimBundle(hostile as any))
      .private_operation_snapshot).toBeNull();

    const withDriver = await buildWelcomeAudioUiAttestedPreclaimBundle({
      private_draft: item.draft,
      private_authorization_seed: item.seed,
      private_audio_asset_capability: item.audio.private_capability,
      private_preclaim_observation_capability:
        item.observation.private_preclaim_observation_capability,
      now_ms: NOW_MS,
      driver: item.driver,
    } as any);
    expect(withDriver.private_operation_snapshot).toBeNull();
    expect(withDriver.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_input_invalid",
    ]);
    expect((await build(item)).private_operation_snapshot).not.toBeNull();
  });

  test("binds every authorization seed field and burns a wrong binding", async () => {
    const item = await createHarness();
    const wrongSeed = {
      ...freshSeed(item, "wrong_owner"),
      expected_owner_anchor_sha256: "a".repeat(64),
    };
    const wrong = await build(item, { private_authorization_seed: wrongSeed });
    expect(wrong.private_operation_snapshot).toBeNull();
    expect(wrong.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_exact_binding_invalid",
    ]);

    const correctedSameNonce = {
      ...wrongSeed,
      expected_owner_anchor_sha256:
        item.draft.source_projection.anchors.owner_anchor_sha256,
    };
    const retry = await build(item, {
      private_authorization_seed: correctedSameNonce,
    });
    expect(retry.private_operation_snapshot).toBeNull();
    expect(retry.redacted_receipt.blocker_codes).toEqual([
      "blocked_preclaim_builder_authorization_seed_replayed",
    ]);
  });

  test("rejects a stale authorization seed before any capability is consumed", async () => {
    const item = await createHarness();
    const staleSeed = {
      ...item.seed,
      approved_at: "2026-07-18T14:54:59.000Z",
      expires_at: "2026-07-18T14:59:59.000Z",
    };
    const result = await build(item, { private_authorization_seed: staleSeed });
    expect(result.private_operation_snapshot).toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      draft_validated: true,
      authorization_seed_validated: false,
      audio_asset_validated: false,
      preclaim_observation_consumed: false,
      blocker_codes: ["blocked_preclaim_builder_authorization_seed_invalid"],
    });
  });

  test("attributes approval, Safari observation, audio, and central checks separately", async () => {
    const observationNowMs = NOW_MS - 10_000;
    const item = await createHarness({ observationNowMs });
    const result = await build(item);
    const snapshot = result.private_operation_snapshot!;
    expect(snapshot).not.toBeNull();
    expect(snapshot.approval.checked_at).toBe(item.seed.approved_at);
    expect(snapshot.execution_surface.observed_at)
      .toBe(new Date(observationNowMs).toISOString());
    expect(snapshot.binding.observed_at).toBe(new Date(observationNowMs).toISOString());
    expect(snapshot.eligibility.observed_at).toBe(new Date(observationNowMs).toISOString());
    expect(snapshot.asset.preview_observed_at)
      .toBe(new Date(observationNowMs).toISOString());
    expect(snapshot.context.checked_at).toBe(new Date(observationNowMs).toISOString());
    expect(snapshot.approval.checked_at).not.toBe(snapshot.execution_surface.observed_at);
    expect(snapshot.asset.preview_observed_at).not.toBe(new Date(NOW_MS).toISOString());
    expect(snapshot.context.checked_at).not.toBe(new Date(NOW_MS).toISOString());
  });

  test("keeps every receipt aggregate-only", async () => {
    const item = await createHarness();
    const built = await build(item);
    const replayed = await build(item, {
      private_authorization_seed: structuredClone(item.seed),
    });
    const invalid = await buildWelcomeAudioUiAttestedPreclaimBundle({
      private_draft: item.draft,
      private_authorization_seed: freshSeed(item, "extra_field"),
      private_audio_asset_capability: item.audio.private_capability,
      private_preclaim_observation_capability:
        (await freshObservation(item)).private_preclaim_observation_capability,
      now_ms: NOW_MS,
    } as any);
    for (const result of [built, replayed, invalid]) {
      expect(validateWelcomeAudioUiAttestedPreclaimBuilderReceipt(result.redacted_receipt))
        .toEqual({ ok: true });
      const serialized = JSON.stringify(result.redacted_receipt);
      for (const privateValue of [
        TARGET,
        THREAD,
        OWNER,
        item.asset.assetPath,
        item.draft.operation_id,
        item.draft.authorization_id,
        item.seed.seed_nonce_sha256,
        item.draft.approved_audio_sha256,
        item.draft.source_projection.anchors.thread_anchor_sha256,
        "2026-07-18",
      ]) expect(serialized).not.toContain(privateValue);
    }
  });
});
