import { createHash } from "node:crypto";
import { chmod, lstat, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import {
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import * as materializer from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import * as publisher from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs";

const NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");
const PRIVATE_TARGET = "Synthetic.Exact+Tag_é";
const PRIVATE_THREAD = "synthetic-thread-reference/Exact+Case";
const PRIVATE_OWNER = "synthetic-owner-reference/Exact+Case";
const roots: string[] = [];

const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

const createRoot = async () => {
  const created = await mkdtemp(join(
    tmpdir(),
    publisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  ));
  const root = await realpath(created);
  await chmod(root, 0o700);
  roots.push(root);
  return root;
};

const createAudioRoot = async () => {
  const created = await mkdtemp(join(tmpdir(), "crm-core-welcome-audio-asset-test-"));
  const root = await realpath(created);
  await chmod(root, 0o700);
  roots.push(root);
  return root;
};

const sourceInput = () => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: "synthetic_ui_attested_source_mission_001",
  notification_row: {
    row_ordinal: 1,
    exact_target_utf8: PRIVATE_TARGET,
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: "synthetic visible bucket 2 d",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-16T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: PRIVATE_TARGET,
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: "confirmed",
    follows_owner_evidence: "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-16T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: PRIVATE_THREAD,
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-16T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: PRIVATE_OWNER,
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-16T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: PRIVATE_TARGET,
    bound_thread_reference_utf8: PRIVATE_THREAD,
    owner_account_reference_utf8: PRIVATE_OWNER,
    checked_at: "2026-07-16T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const makeFixture = async () => {
  const root = await createRoot();
  const audioRoot = await createAudioRoot();
  const audioBytes = Buffer.from("synthetic approved audio bytes", "utf8");
  const audioPath = join(audioRoot, "approved-audio.m4a");
  await writeFile(audioPath, audioBytes, { mode: 0o600 });
  const audioSha = sha256(audioBytes);
  const result = materializer.materializeWelcomeAudioUiAttestedCanaryPacketDraft({
    ui_attested_input: sourceInput(),
    packet_request: {
      schema_version: materializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
      status: "approved_for_no_live_materialization_only",
      mission_id: "synthetic_ui_attested_live_bridge_mission_001",
      contract_version: "synthetic_ui_attested_live_bridge_contract_v1",
      central_repo_head: "b".repeat(40),
      authorization_id: "synthetic_live_bridge_authorization_001",
      expected_source_mission_id: sourceInput().mission_id,
      candidate_cap: 1,
      future_attempt_cap: 1,
      approved_audio_asset_id: "synthetic_approved_audio_asset_001",
      approved_audio_sha256: audioSha,
      approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
      execution_approval_authorized: false,
      external_effect_authorized: false,
    },
    now_ms: NOW_MS,
  });
  expect(result.private_draft).not.toBeNull();
  const authorization = {
    schema_version: "crm_core_instagram_welcome_audio_ui_attested_live_authorization_input_v1",
    status: "approved_for_exact_ui_attested_draft_and_audio",
    mission_contract_sha256: "c".repeat(64),
    active_next_action_id: "synthetic_active_next_action_001",
    active_next_action_sha256: "d".repeat(64),
    approval_packet_id: "synthetic_approval_packet_001",
    approved_audio_asset_path: audioPath,
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
      publisher.computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(result.private_draft),
    expected_projection_sha256:
      publisher.computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(
        result.private_draft.source_projection,
      ),
    expected_operation_id: result.private_draft.operation_id,
    expected_canonical_operation_sha256: "e".repeat(64),
    expected_authorization_id: result.private_draft.authorization_id,
    expected_source_evidence_sha256:
      result.private_draft.source_projection.source_evidence_sha256,
    expected_source_evidence_anchor_sha256:
      result.private_draft.source_projection.anchors.source_evidence_anchor_sha256,
    expected_profile_anchor_sha256:
      result.private_draft.source_projection.anchors.profile_anchor_sha256,
    expected_candidate_anchor_sha256:
      result.private_draft.source_projection.anchors.candidate_anchor_sha256,
    expected_thread_anchor_sha256:
      result.private_draft.source_projection.anchors.thread_anchor_sha256,
    expected_owner_anchor_sha256:
      result.private_draft.source_projection.anchors.owner_anchor_sha256,
    expected_dedupe_anchor_sha256:
      result.private_draft.source_projection.anchors.dedupe_anchor_sha256,
    expected_audio_sha256: result.private_draft.approved_audio_sha256,
  };
  return { root, audioPath, draft: result.private_draft, authorization };
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("UI-attested one-recipient live authority publisher", () => {
  test("publishes one owner-only atomic envelope bound to exact draft and audio bytes", async () => {
    const fixture = await makeFixture();
    const result = await publisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: fixture.root,
      private_draft: fixture.draft,
      private_authorization: fixture.authorization,
      now_ms: NOW_MS,
    });
    expect(result.private_authority_envelope, result.redacted_receipt.blocker_codes.join(","))
      .not.toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: publisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION.PUBLISHED,
      caps_all_one: true,
      nonclaims_preserved: true,
      live_claim_issued: false,
      pending_effect_recorded: false,
      send_attempted: false,
      external_effect_invoked: false,
    });
    expect(publisher.validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
      result.private_authority_envelope,
      { now_ms: NOW_MS },
    )).toEqual({ ok: true, reason: null });
    expect(publisher.validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    const metadata = await lstat(result.authority_path);
    expect(metadata.mode & 0o7777).toBe(0o600);
    expect(metadata.nlink).toBe(1);
  });

  test("fails closed on a cap drift, audio mismatch, and duplicate publication", async () => {
    const capFixture = await makeFixture();
    const capResult = await publisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: capFixture.root,
      private_draft: capFixture.draft,
      private_authorization: { ...capFixture.authorization, send_cap: 2 },
      now_ms: NOW_MS,
    });
    expect(capResult.private_authority_envelope).toBeNull();

    const bindingFixture = await makeFixture();
    const bindingResult = await publisher
      .publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
        authority_root: bindingFixture.root,
        private_draft: bindingFixture.draft,
        private_authorization: {
          ...bindingFixture.authorization,
          expected_candidate_anchor_sha256: "0".repeat(64),
        },
        now_ms: NOW_MS,
      });
    expect(bindingResult.private_authority_envelope).toBeNull();

    const audioFixture = await makeFixture();
    await writeFile(audioFixture.audioPath, "changed bytes", { mode: 0o600 });
    const audioResult = await publisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: audioFixture.root,
      private_draft: audioFixture.draft,
      private_authorization: audioFixture.authorization,
      now_ms: NOW_MS,
    });
    expect(audioResult.private_authority_envelope).toBeNull();

    const modeFixture = await makeFixture();
    await chmod(modeFixture.audioPath, 0o644);
    const modeResult = await publisher
      .publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
        authority_root: modeFixture.root,
        private_draft: modeFixture.draft,
        private_authorization: modeFixture.authorization,
        now_ms: NOW_MS,
      });
    expect(modeResult.private_authority_envelope).toBeNull();

    const duplicateFixture = await makeFixture();
    const publish = () => publisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: duplicateFixture.root,
      private_draft: duplicateFixture.draft,
      private_authorization: duplicateFixture.authorization,
      now_ms: NOW_MS,
    });
    const first = await publish();
    expect(first.private_authority_envelope, first.redacted_receipt.blocker_codes.join(","))
      .not.toBeNull();
    const duplicate = await publish();
    expect(duplicate.private_authority_envelope).toBeNull();
    expect(duplicate.redacted_receipt.blocker_codes).toEqual([
      publisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.TARGET_EXISTS,
    ]);
  });

  test("rejects a symlinked or non-owner-mode authority root", async () => {
    const fixture = await makeFixture();
    const parent = await createRoot();
    const alias = join(parent, "alias");
    await symlink(fixture.root, alias);
    const result = await publisher.publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: alias,
      private_draft: fixture.draft,
      private_authorization: fixture.authorization,
      now_ms: NOW_MS,
    });
    expect(result.private_authority_envelope).toBeNull();
    expect("publishWelcomeAudioUiAttestedLiveAuthority" in publisher).toBe(false);
  });

  test("keeps fixed-root publication disabled before inspecting fabricated caller objects", async () => {
    let trapCount = 0;
    const fabricated = new Proxy({}, {
      get() {
        trapCount += 1;
        throw new Error("must not inspect caller data");
      },
      ownKeys() {
        trapCount += 1;
        throw new Error("must not inspect caller data");
      },
    });
    const result = await publisher.publishFixedWelcomeAudioUiAttestedLiveAuthority(
      fabricated as any,
    );
    expect(trapCount).toBe(0);
    expect(result.private_authority_envelope).toBeNull();
    expect(result.authority_path).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      publisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER
        .FIXED_PUBLICATION_DISABLED,
    ]);
    expect(publisher.validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });
});
