import { createHash } from "node:crypto";
import {
  chmod,
  link,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER,
  WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT,
  WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_TTL_MS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE,
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioSealedManifestSha256,
  consumeWelcomeAudioLiveOperationContextCapabilityOnce,
  consumeWelcomeAudioLiveTargetBindingCapabilityOnce,
  consumeWelcomeAudioUiAttestedSourceCapabilityOnce,
  consumeWelcomeAudioUiAttestedLiveAdmissionCapabilitySetOnce,
  consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce,
  createWelcomeAudioUiAttestedConnectedSourcePreflightBridge,
  createSyntheticWelcomeAudioLiveAuthorityCapability,
  createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability,
  revalidateApprovedWelcomeAudioAssetCapability,
  revalidateWelcomeAudioLiveAuthorityCapability,
  revalidateWelcomeAudioUiAttestedLiveAuthorityCapability,
  validateApprovedWelcomeAudioAsset,
  validateSealedWelcomeAudioBacklogManifest,
  validateWelcomeAudioLiveOperationContext,
  validateWelcomeAudioLiveOperationContextReceipt,
  validateWelcomeAudioLivePreflightReceipt,
  validateWelcomeAudioUiAttestedSourcePreflight,
  validateWelcomeAudioUiAttestedSourcePreflightReceipt,
  validateWelcomeAudioUiAttestedLiveAuthorityReceipt,
  validateWelcomeAudioUiAttestedLiveOperationContext,
  validateWelcomeAudioUiAttestedLiveOperationContextReceipt,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
  verifyWelcomeAudioLiveOperationContextCapabilityBinding,
  verifyWelcomeAudioUiAttestedSourceCapabilityBinding,
  verifyWelcomeAudioUiAttestedLiveOperationContextCapabilityBinding,
  verifySealedWelcomeAudioManifestCapability,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";
import * as uiAttestedMaterializer from
  "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs";
import * as uiAttestedPublisher from
  "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs";
import {
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  adaptWelcomeAudioUiAttestedFollowerSource,
} from "../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs";
import {
  WELCOME_AUDIO_ADAPTER_VERSION,
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_BUSINESS_ELIGIBILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
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
const CONTEXT_NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const UI_LIVE_NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");

const createUiAttestedLiveAuthorityFixture = async () => {
  const asset = await createSyntheticAsset();
  const authorityRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    uiAttestedPublisher.WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  )));
  cleanupPaths.push(authorityRoot);
  await chmod(authorityRoot, 0o700);
  const sourceInput = uiAttestedSourceInputFixture();
  const materialized = uiAttestedMaterializer
    .materializeWelcomeAudioUiAttestedCanaryPacketDraft({
      ui_attested_input: sourceInput,
      packet_request: {
        schema_version:
          uiAttestedMaterializer.WELCOME_AUDIO_UI_ATTESTED_CANARY_REQUEST_SCHEMA_VERSION,
        status: "approved_for_no_live_materialization_only",
        mission_id: "synthetic_ui_attested_live_preflight_mission_001",
        contract_version: "synthetic_ui_attested_live_preflight_contract_v1",
        central_repo_head: "7".repeat(40),
        authorization_id: "synthetic_ui_live_preflight_authorization_001",
        expected_source_mission_id: sourceInput.mission_id,
        candidate_cap: 1,
        future_attempt_cap: 1,
        approved_audio_asset_id: "synthetic_ui_live_preflight_audio_001",
        approved_audio_sha256: asset.digest,
        approved_audio_binding_evidence: "exact_approved_audio_binding_revalidated",
        execution_approval_authorized: false,
        external_effect_authorized: false,
      },
      now_ms: UI_LIVE_NOW_MS,
    });
  expect(materialized.private_draft).not.toBeNull();
  const draft = materialized.private_draft!;
  const projection = draft.source_projection;
  const authorization: Record<string, any> = {
    schema_version: "crm_core_instagram_welcome_audio_ui_attested_live_authorization_input_v1",
    status: "approved_for_exact_ui_attested_draft_and_audio",
    mission_contract_sha256: "8".repeat(64),
    active_next_action_id: "synthetic_ui_live_next_action_001",
    active_next_action_sha256: "9".repeat(64),
    approval_packet_id: "synthetic_ui_live_approval_packet_001",
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
      uiAttestedPublisher.computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(
        projection,
      ),
    expected_operation_id: draft.operation_id,
    expected_canonical_operation_sha256: "a".repeat(64),
    expected_authorization_id: draft.authorization_id,
    expected_source_evidence_sha256: projection.source_evidence_sha256,
    expected_source_evidence_anchor_sha256:
      projection.anchors.source_evidence_anchor_sha256,
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
  const operationSnapshot = uiAttestedLiveOperationFixture({
    liveFixture: {
      projection,
      asset,
      published: {
        private_authority_envelope: { authority: provisionalAuthority },
      },
    } as any,
  });
  authorization.expected_canonical_operation_sha256 =
    operationSnapshot.canonical_operation_sha256;
  const published = await uiAttestedPublisher
    .publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
      authority_root: authorityRoot,
      private_draft: draft,
      private_authorization: authorization,
      now_ms: UI_LIVE_NOW_MS,
    });
  return {
    asset,
    authorityRoot,
    draft,
    projection,
    authorization,
    operationSnapshot,
    published,
  };
};

describe("UI-attested single-recipient live authority preflight", () => {
  test("loads and revalidates the one-file synthetic authority without claiming tracked state", async () => {
    const fixture = await createUiAttestedLiveAuthorityFixture();
    expect(fixture.published.private_authority_envelope).not.toBeNull();
    const opened = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: fixture.authorityRoot,
      expected_central_repo_head: fixture.draft.central_repo_head,
      expected_mission_contract_sha256: fixture.authorization.mission_contract_sha256,
      expected_active_next_action_id: fixture.authorization.active_next_action_id,
      expected_active_next_action_sha256: fixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    expect(opened.private_authority_capability).not.toBeNull();
    expect(opened.private_source_capability).not.toBeNull();
    expect(opened.private_audio_asset_capability).not.toBeNull();
    expect(opened.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      tracked_mission_bound: false,
      tracked_next_action_bound: false,
      central_repo_clean_exact_upstream: false,
      caps_all_one: true,
      nonclaims_preserved: true,
      send_allowed: false,
      external_effect_invoked: false,
    });
    expect(validateWelcomeAudioUiAttestedLiveAuthorityReceipt(
      opened.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(await revalidateWelcomeAudioUiAttestedLiveAuthorityCapability({
      private_authority_capability: opened.private_authority_capability,
      now_ms: UI_LIVE_NOW_MS + 1,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await revalidateWelcomeAudioUiAttestedLiveAuthorityCapability({
      private_authority_capability: opened.private_authority_capability,
      now_ms: Date.parse(fixture.authorization.expires_at),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("rejects mixed authority roots and declared tracked-binding drift", async () => {
    const fixture = await createUiAttestedLiveAuthorityFixture();
    await writeFile(join(fixture.authorityRoot, "execution-approval-v1.json"), "{}\n", {
      mode: 0o600,
    });
    const mixed = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: fixture.authorityRoot,
      expected_central_repo_head: fixture.draft.central_repo_head,
      expected_mission_contract_sha256: fixture.authorization.mission_contract_sha256,
      expected_active_next_action_id: fixture.authorization.active_next_action_id,
      expected_active_next_action_sha256: fixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    expect(mixed.private_authority_capability).toBeNull();

    const cleanFixture = await createUiAttestedLiveAuthorityFixture();
    const drift = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: cleanFixture.authorityRoot,
      expected_central_repo_head: "0".repeat(40),
      expected_mission_contract_sha256: cleanFixture.authorization.mission_contract_sha256,
      expected_active_next_action_id: cleanFixture.authorization.active_next_action_id,
      expected_active_next_action_sha256:
        cleanFixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    expect(drift.private_authority_capability).toBeNull();

    const malformedTimeFixture = await createUiAttestedLiveAuthorityFixture();
    const malformedEnvelope = JSON.parse(await readFile(
      malformedTimeFixture.published.authority_path!,
      "utf8",
    ));
    malformedEnvelope.authority.expires_at = "not-a-timestamp";
    await writeFile(
      malformedTimeFixture.published.authority_path!,
      `${JSON.stringify(malformedEnvelope)}\n`,
      { mode: 0o600 },
    );
    const malformedTime = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: malformedTimeFixture.authorityRoot,
      expected_central_repo_head: malformedTimeFixture.draft.central_repo_head,
      expected_mission_contract_sha256:
        malformedTimeFixture.authorization.mission_contract_sha256,
      expected_active_next_action_id:
        malformedTimeFixture.authorization.active_next_action_id,
      expected_active_next_action_sha256:
        malformedTimeFixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    expect(malformedTime.private_authority_capability).toBeNull();

    const nonExpiringFixture = await createUiAttestedLiveAuthorityFixture();
    const nonExpiringEnvelope = JSON.parse(await readFile(
      nonExpiringFixture.published.authority_path!,
      "utf8",
    ));
    nonExpiringEnvelope.authority.expires_at = "2026-07-16T15:59:45.000Z";
    await writeFile(
      nonExpiringFixture.published.authority_path!,
      `${JSON.stringify(nonExpiringEnvelope)}\n`,
      { mode: 0o600 },
    );
    const nonExpiring = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: nonExpiringFixture.authorityRoot,
      expected_central_repo_head: nonExpiringFixture.draft.central_repo_head,
      expected_mission_contract_sha256:
        nonExpiringFixture.authorization.mission_contract_sha256,
      expected_active_next_action_id:
        nonExpiringFixture.authorization.active_next_action_id,
      expected_active_next_action_sha256:
        nonExpiringFixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    expect(nonExpiring.private_authority_capability).toBeNull();
  });

  test("binds one UI PRECLAIM and atomically consumes context/source while leaving target once", async () => {
    const fixture = await createUiAttestedLiveAuthorityFixture();
    const opened = await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
      authority_root: fixture.authorityRoot,
      expected_central_repo_head: fixture.draft.central_repo_head,
      expected_mission_contract_sha256: fixture.authorization.mission_contract_sha256,
      expected_active_next_action_id: fixture.authorization.active_next_action_id,
      expected_active_next_action_sha256: fixture.authorization.active_next_action_sha256,
      now_ms: UI_LIVE_NOW_MS,
    });
    const context = await validateWelcomeAudioUiAttestedLiveOperationContext({
      operation_snapshot: fixture.operationSnapshot,
      private_authority_capability: opened.private_authority_capability,
      private_source_capability: opened.private_source_capability,
      private_audio_asset_capability: opened.private_audio_asset_capability,
      expected_canonical_operation_sha256:
        fixture.operationSnapshot.canonical_operation_sha256,
      now_ms: UI_LIVE_NOW_MS + 1,
    });
    expect(context.private_capability, context.redacted_receipt.blocker_codes.join(","))
      .not.toBeNull();
    expect(context.private_target_binding_capability).not.toBeNull();
    expect(validateWelcomeAudioUiAttestedLiveOperationContextReceipt(
      context.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    const authority = fixture.published.private_authority_envelope!.authority;
    const contextBinding = {
      private_operation_context_capability: context.private_capability,
      private_authority_capability: opened.private_authority_capability,
      private_audio_asset_capability: opened.private_audio_asset_capability,
      required_authority_mode:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: authority.mission_id,
      contract_version: authority.contract_version,
      mission_contract_sha256: authority.mission_contract_sha256,
      active_next_action_id: authority.active_next_action_id,
      active_next_action_sha256: authority.active_next_action_sha256,
      approval_packet_id: authority.approval_packet_id,
      authorization_id: authority.authorization_id,
      operation_id: authority.operation_id,
      central_repo_head: authority.central_repo_head,
      canonical_operation_sha256: authority.canonical_operation_sha256,
      draft_sha256: authority.draft_sha256,
      projection_sha256: authority.projection_sha256,
      source_mission_id: authority.source_mission_id,
      source_evidence_schema_version: fixture.projection.schema_version,
      source_evidence_sha256: authority.source_evidence_sha256,
      source_record_ordinal: fixture.projection.notification_row.row_ordinal,
      source_record_cap: 8,
      evidence_observed_at: fixture.projection.dedupe.checked_at,
      source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
      profile_anchor_sha256: authority.profile_anchor_sha256,
      identity_anchor_sha256: authority.candidate_anchor_sha256,
      thread_anchor_sha256: authority.thread_anchor_sha256,
      owner_anchor_sha256: authority.owner_anchor_sha256,
      dedupe_anchor_sha256: authority.dedupe_anchor_sha256,
      approved_audio_asset_id: authority.approved_audio_asset_id,
      approved_audio_asset_path: authority.approved_audio_asset_path,
      audio_asset_sha256: authority.approved_audio_asset_sha256,
      candidate_cap: 1,
      claim_cap: 1,
      pending_cap: 1,
      upload_cap: 1,
      send_cap: 1,
      retry_cap: 0,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
      now_ms: UI_LIVE_NOW_MS + 2,
    };
    expect(await verifyWelcomeAudioUiAttestedLiveOperationContextCapabilityBinding(
      contextBinding,
    )).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await verifyWelcomeAudioUiAttestedLiveOperationContextCapabilityBinding({
      ...contextBinding,
      now_ms: Date.parse(authority.expires_at),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(await consumeWelcomeAudioUiAttestedLiveAdmissionCapabilitySetOnce(
      contextBinding,
    )).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await consumeWelcomeAudioUiAttestedLiveAdmissionCapabilitySetOnce(
      contextBinding,
    )).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    const targetBinding = {
      private_target_binding_capability: context.private_target_binding_capability,
      private_authority_capability: opened.private_authority_capability,
      private_source_capability: opened.private_source_capability,
      required_authority_mode:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      exact_target: authority.exact_target_utf8,
      exact_bound_thread_reference: authority.bound_thread_reference_utf8,
      exact_owner_account_reference: authority.owner_account_reference_utf8,
      expected_operation_id: authority.operation_id,
      expected_draft_sha256: authority.draft_sha256,
      expected_projection_sha256: authority.projection_sha256,
      expected_source_evidence_sha256: authority.source_evidence_sha256,
      expected_identity_anchor_sha256: authority.candidate_anchor_sha256,
      expected_thread_anchor_sha256: authority.thread_anchor_sha256,
      expected_owner_anchor_sha256: authority.owner_anchor_sha256,
      expected_dedupe_anchor_sha256: authority.dedupe_anchor_sha256,
      now_ms: UI_LIVE_NOW_MS + 3,
    };
    expect(await consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce({
      ...targetBinding,
      now_ms: Date.parse(authority.expires_at),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    const concurrentTargetResults = await Promise.all([
      consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce(targetBinding),
      consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce(targetBinding),
    ]);
    expect(concurrentTargetResults.filter(
      (status) => status === WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    )).toHaveLength(1);
    expect(concurrentTargetResults.filter(
      (status) => status === WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    )).toHaveLength(1);
    expect(await consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce(
      targetBinding,
    )).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });
});

const interval = () => ({
  schema_version: WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  start_at: "2026-07-13T12:00:00.000Z",
  end_at: "2026-07-14T12:00:00.000Z",
});

const manifestFixture = (count = 3) => {
  const campaignInterval = interval();
  const campaignIntervalSha256 = computeWelcomeAudioCampaignIntervalSha256(campaignInterval);
  const exactTargets = Array.from({ length: count }, (_, index) =>
    `Synthetic.Target+${index + 1}@Example.COM`);
  const manifest = {
    schema_version: WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
    identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
    mission_id: MISSION_ID,
    contract_version: CONTRACT_VERSION,
    campaign_interval_sha256: campaignIntervalSha256,
    ordered_records: Array.from({ length: count }, (_, index) => ({
      ordinal: index + 1,
      identity_anchor_sha256: computeWelcomeAudioExactIdentityAnchorSha256(exactTargets[index]),
      followed_at: `2026-07-13T${String(13 + index).padStart(2, "0")}:00:00.000Z`,
      campaign_interval_sha256: campaignIntervalSha256,
    })),
  };
  return {
    campaignInterval,
    campaignIntervalSha256,
    manifest,
    exactTargets,
    manifestSha256: computeWelcomeAudioSealedManifestSha256(manifest),
  };
};

const createSyntheticAsset = async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "crm-core-live-audio-preflight-")));
  cleanupPaths.push(root);
  const assetPath = join(root, "synthetic-approved-audio.m4a");
  const bytes = Buffer.from("synthetic approved audio fixture only", "utf8");
  await writeFile(assetPath, bytes, { mode: 0o600 });
  return {
    root,
    assetPath,
    bytes,
    digest: createHash("sha256").update(bytes).digest("hex"),
  };
};

const validateFixture = (fixture: ReturnType<typeof manifestFixture>) =>
  validateSealedWelcomeAudioBacklogManifest({
    manifest: fixture.manifest,
    campaign_interval: fixture.campaignInterval,
    expected_manifest_sha256: fixture.manifestSha256,
    expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
    expected_mission_id: MISSION_ID,
    expected_contract_version: CONTRACT_VERSION,
  });

const authorityFixture = async ({
  fixture,
  audioSha256,
  audioPath,
  beforeOpen,
}: {
  fixture: ReturnType<typeof manifestFixture>;
  audioSha256: string;
  audioPath: string;
  beforeOpen?: (root: string) => Promise<void>;
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
    approved_audio_asset_path: audioPath,
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
    operation_bindings: fixture.manifest.ordered_records.map((record, index) => ({
      manifest_ordinal: index + 1,
      operation_id: index === 0 ? OPERATION_ID : `synthetic_live_operation_${index + 1}`,
      exact_target_utf8: fixture.exactTargets[index],
      identity_anchor_sha256: record.identity_anchor_sha256,
      thread_anchor_sha256: index === 0 ? THREAD_SHA : createHash("sha256")
        .update(`thread:${index + 1}`).digest("hex"),
      owner_anchor_sha256: OWNER_SHA,
    })),
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
  await beforeOpen?.(root);
  const loaded = await createSyntheticWelcomeAudioLiveAuthorityCapability({
    authority_root: root,
    now_ms: CONTEXT_NOW_MS,
  });
  return { ...loaded, authorityRoot: root };
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
  ordinal = 1,
}: {
  fixture: ReturnType<typeof manifestFixture>;
  audioSha256: string;
  ordinal?: number;
}) => {
  const identitySha = fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256;
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
      observed_at: fixture.manifest.ordered_records[ordinal - 1].followed_at,
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
      manifest_record_index: ordinal - 1,
      manifest_record_count: fixture.manifest.ordered_records.length,
      source_event_anchor_sha256: SOURCE_SHA,
    },
  });
};

const uiAttestedLiveOperationFixture = ({
  liveFixture,
}: {
  liveFixture: Awaited<ReturnType<typeof createUiAttestedLiveAuthorityFixture>>;
}) => {
  const projection = liveFixture.projection;
  const authority = liveFixture.published.private_authority_envelope!.authority;
  const baseFixture = manifestFixture(1);
  const base = operationFixture({
    fixture: baseFixture,
    audioSha256: liveFixture.asset.digest,
  });
  const replacements = new Map<any, any>([
    [MISSION_ID, authority.mission_id],
    [CONTRACT_VERSION, authority.contract_version],
    [OPERATION_ID, authority.operation_id],
    [APPROVAL_PACKET_ID, authority.approval_packet_id],
    [CENTRAL_HEAD, authority.central_repo_head],
    [SOURCE_SHA, authority.source_evidence_anchor_sha256],
    [PROFILE_SHA, authority.profile_anchor_sha256],
    [baseFixture.manifest.ordered_records[0].identity_anchor_sha256,
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
  operation.asset.asset_preview_binding =
    WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE;
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

const validateOperationContextFixture = ({
  fixture,
  operationSnapshot,
  audioSha256,
  manifestCapability,
  authorityCapability,
  assetCapability,
  ordinal = 1,
}: {
  fixture: ReturnType<typeof manifestFixture>;
  operationSnapshot: Record<string, any>;
  audioSha256: string;
  manifestCapability: unknown;
  authorityCapability: unknown;
  assetCapability: unknown;
  ordinal?: number;
}) => validateWelcomeAudioLiveOperationContext({
  operation_snapshot: operationSnapshot,
  private_authority_capability: authorityCapability,
  private_audio_asset_capability: assetCapability,
  expected_canonical_operation_sha256: operationSnapshot.canonical_operation_sha256,
  expected_mission_id: MISSION_ID,
  expected_contract_version: CONTRACT_VERSION,
  expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
  expected_approval_packet_id: APPROVAL_PACKET_ID,
  expected_operation_id: OPERATION_ID,
  expected_central_repo_head: CENTRAL_HEAD,
  expected_manifest_sha256: fixture.manifestSha256,
  expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
  expected_identity_anchor_sha256:
    fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256,
  expected_thread_anchor_sha256: THREAD_SHA,
  expected_owner_anchor_sha256: OWNER_SHA,
  expected_audio_sha256: audioSha256,
  expected_manifest_ordinal: ordinal,
  private_manifest_capability: manifestCapability,
  now_ms: CONTEXT_NOW_MS,
});

describe("Instagram welcome-audio sealed backlog preflight", () => {
  test("validates exact digest, campaign interval, order, uniqueness, and membership", () => {
    const fixture = manifestFixture();
    const result = validateFixture(fixture);

    expect(result.redacted_receipt).toMatchObject({
      subject: WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT.SEALED_MANIFEST,
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      records_checked_count: 3,
      manifest_record_cap: WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
      digest_verified: true,
      campaign_interval_bound: true,
      order_verified: true,
      identity_uniqueness_verified: true,
      send_allowed: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioLivePreflightReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(verifySealedWelcomeAudioManifestCapability({
      private_manifest_capability: result.private_capability,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      manifest_sha256: fixture.manifestSha256,
      campaign_interval_sha256: fixture.campaignIntervalSha256,
      identity_anchor_sha256: fixture.manifest.ordered_records[1].identity_anchor_sha256,
      manifest_ordinal: 2,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(() => JSON.stringify(result.private_capability)).toThrow(
      "private_preflight_capability_not_serializable",
    );
  });

  test("rejects forged capability bindings without returning private material", () => {
    const fixture = manifestFixture();
    const result = validateFixture(fixture);
    expect(verifySealedWelcomeAudioManifestCapability({
      private_manifest_capability: result.private_capability,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      manifest_sha256: fixture.manifestSha256,
      campaign_interval_sha256: fixture.campaignIntervalSha256,
      identity_anchor_sha256: "f".repeat(64),
      manifest_ordinal: 2,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(verifySealedWelcomeAudioManifestCapability({
      private_manifest_capability: {},
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      manifest_sha256: fixture.manifestSha256,
      campaign_interval_sha256: fixture.campaignIntervalSha256,
      identity_anchor_sha256: fixture.manifest.ordered_records[0].identity_anchor_sha256,
      manifest_ordinal: 1,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("rejects over-cap, unordered, duplicate, and out-of-interval manifests", () => {
    const overCap = manifestFixture(9);
    expect(validateFixture(overCap).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_OVER_CAP,
    ]);

    const unordered = manifestFixture();
    unordered.manifest.ordered_records[1].ordinal = 3;
    unordered.manifestSha256 = computeWelcomeAudioSealedManifestSha256(unordered.manifest);
    expect(validateFixture(unordered).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_ORDER_INVALID,
    ]);

    const duplicate = manifestFixture();
    duplicate.manifest.ordered_records[1].identity_anchor_sha256 =
      duplicate.manifest.ordered_records[0].identity_anchor_sha256;
    duplicate.manifestSha256 = computeWelcomeAudioSealedManifestSha256(duplicate.manifest);
    expect(validateFixture(duplicate).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_IDENTITY_DUPLICATE,
    ]);

    const outside = manifestFixture();
    outside.manifest.ordered_records[0].followed_at = "2026-07-15T12:00:00.000Z";
    outside.manifestSha256 = computeWelcomeAudioSealedManifestSha256(outside.manifest);
    expect(validateFixture(outside).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.FOLLOW_OUTSIDE_CAMPAIGN_INTERVAL,
    ]);
  });

  test("requires independently supplied exact manifest and interval digests", () => {
    const fixture = manifestFixture();
    expect(validateSealedWelcomeAudioBacklogManifest({
      manifest: fixture.manifest,
      campaign_interval: fixture.campaignInterval,
      expected_manifest_sha256: "f".repeat(64),
      expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
      expected_mission_id: MISSION_ID,
      expected_contract_version: CONTRACT_VERSION,
    }).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_DIGEST_MISMATCH,
    ]);

    expect(validateSealedWelcomeAudioBacklogManifest({
      manifest: fixture.manifest,
      campaign_interval: fixture.campaignInterval,
      expected_manifest_sha256: fixture.manifestSha256,
      expected_campaign_interval_sha256: "e".repeat(64),
      expected_mission_id: MISSION_ID,
      expected_contract_version: CONTRACT_VERSION,
    }).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_SCHEMA_INVALID,
    ]);
  });

  test("publishes an exact redacted receipt allowlist", () => {
    const fixture = manifestFixture();
    const receipt = validateFixture(fixture).redacted_receipt;
    expect(Object.keys(receipt).sort()).toEqual([...WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_FIELDS].sort());
    const serialized = JSON.stringify(receipt);
    for (const privateValue of [
      MISSION_ID,
      CONTRACT_VERSION,
      fixture.manifestSha256,
      fixture.campaignIntervalSha256,
      fixture.manifest.ordered_records[0].identity_anchor_sha256,
    ]) expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toMatch(/(?:identity_anchor_sha256|campaign_interval_sha256|asset_path|manifest_sha256)/);
  });
});

describe("Instagram welcome-audio guarded operation context", () => {
  const contextFixture = async () => {
    const fixture = manifestFixture(3);
    const asset = await createSyntheticAsset();
    const audioSha256 = asset.digest;
    const authority = await authorityFixture({
      fixture,
      audioSha256,
      audioPath: asset.assetPath,
    });
    const operationSnapshot = operationFixture({ fixture, audioSha256 });
    return {
      fixture,
      manifestCapability: authority.private_manifest_capability,
      authorityCapability: authority.private_authority_capability,
      assetCapability: authority.private_audio_asset_capability,
      authorityRoot: authority.authorityRoot,
      exactTarget: fixture.exactTargets[0],
      assetPath: asset.assetPath,
      audioSha256,
      operationSnapshot,
    };
  };

  test.each([
    ["authority root", async (root: string) => chmod(root, 0o755)],
    ["authority file", async (root: string) => chmod(
      join(root, "execution-approval-v1.json"),
      0o644,
    )],
  ])("rejects wrong owner-only mode on %s", async (_label, beforeOpen) => {
    const fixture = manifestFixture(1);
    const asset = await createSyntheticAsset();
    const result = await authorityFixture({
      fixture,
      audioSha256: asset.digest,
      audioPath: asset.assetPath,
      beforeOpen,
    });
    expect(result.private_authority_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID,
    ]);
  });

  test.each(["symlink", "hardlink"])(
    "rejects %s substitution after authority and operation capabilities are minted",
    async (substitution) => {
      const item = await contextFixture();
      const operation = await validateOperationContextFixture(item);
      const approvalPath = join(item.authorityRoot, "execution-approval-v1.json");
      const externalRoot = await realpath(await mkdtemp(join(
        tmpdir(),
        "crm-core-welcome-audio-authority-substitution-",
      )));
      cleanupPaths.push(externalRoot);
      const externalPath = join(externalRoot, "substitute.json");
      await writeFile(externalPath, await readFile(approvalPath), { mode: 0o600 });
      await rm(approvalPath, { force: true });
      if (substitution === "symlink") await symlink(externalPath, approvalPath);
      else await link(externalPath, approvalPath);

      expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce({
        private_target_binding_capability: operation.private_target_binding_capability,
        required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
        exact_target: item.exactTarget,
        expected_operation_id: OPERATION_ID,
        expected_identity_anchor_sha256:
          item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
        expected_thread_anchor_sha256: THREAD_SHA,
        now_ms: CONTEXT_NOW_MS,
      })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
      expect(await consumeWelcomeAudioLiveOperationContextCapabilityOnce({
        private_operation_context_capability: operation.private_capability,
        private_authority_capability: item.authorityCapability,
        private_audio_asset_capability: item.assetCapability,
        required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
        mission_id: MISSION_ID,
        contract_version: CONTRACT_VERSION,
        mission_contract_sha256: MISSION_CONTRACT_SHA,
        approval_packet_id: APPROVAL_PACKET_ID,
        operation_id: OPERATION_ID,
        central_repo_head: CENTRAL_HEAD,
        canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
        manifest_sha256: item.fixture.manifestSha256,
        campaign_interval_sha256: item.fixture.campaignIntervalSha256,
        identity_anchor_sha256:
          item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
        thread_anchor_sha256: THREAD_SHA,
        owner_anchor_sha256: OWNER_SHA,
        audio_asset_sha256: item.audioSha256,
        manifest_ordinal: 1,
        now_ms: CONTEXT_NOW_MS,
      })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    },
  );

  test("detects in-place authority tamper before either one-use consume boundary", async () => {
    const item = await contextFixture();
    const operation = await validateOperationContextFixture(item);
    const approvalPath = join(item.authorityRoot, "execution-approval-v1.json");
    await writeFile(approvalPath, Buffer.concat([
      await readFile(approvalPath),
      Buffer.from(" ", "utf8"),
    ]), { mode: 0o600 });
    const targetBinding = {
      private_target_binding_capability: operation.private_target_binding_capability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      exact_target: item.exactTarget,
      expected_operation_id: OPERATION_ID,
      expected_identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      expected_thread_anchor_sha256: THREAD_SHA,
      now_ms: CONTEXT_NOW_MS,
    };
    expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce(targetBinding))
      .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(await consumeWelcomeAudioLiveOperationContextCapabilityOnce({
      private_operation_context_capability: operation.private_capability,
      private_authority_capability: item.authorityCapability,
      private_audio_asset_capability: item.assetCapability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      approval_packet_id: APPROVAL_PACKET_ID,
      operation_id: OPERATION_ID,
      central_repo_head: CENTRAL_HEAD,
      canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
      manifest_sha256: item.fixture.manifestSha256,
      campaign_interval_sha256: item.fixture.campaignIntervalSha256,
      identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      audio_asset_sha256: item.audioSha256,
      manifest_ordinal: 1,
      now_ms: CONTEXT_NOW_MS,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("uses the injected clock only in synthetic mode and rejects mode confusion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(CONTEXT_NOW_MS + 24 * 60 * 60 * 1000);
    try {
      const item = await contextFixture();
      const operation = await validateOperationContextFixture(item);
      expect(operation.redacted_receipt.decision)
        .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID);
      expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce({
        private_target_binding_capability: operation.private_target_binding_capability,
        required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
        exact_target: item.exactTarget,
        expected_operation_id: OPERATION_ID,
        expected_identity_anchor_sha256:
          item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
        expected_thread_anchor_sha256: THREAD_SHA,
        now_ms: CONTEXT_NOW_MS,
      })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    } finally {
      vi.useRealTimers();
    }
  });

  test("rejects a one-use target capability at the exact expiry instant", async () => {
    const item = await contextFixture();
    const operation = await validateOperationContextFixture(item);
    expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce({
      private_target_binding_capability: operation.private_target_binding_capability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      exact_target: item.exactTarget,
      expected_operation_id: OPERATION_ID,
      expected_identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      expected_thread_anchor_sha256: THREAD_SHA,
      now_ms: CONTEXT_NOW_MS + 5 * 60 * 1000,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("revalidates the authority capability at both sides of its exact expiry", async () => {
    const item = await contextFixture();
    expect(await revalidateWelcomeAudioLiveAuthorityCapability({
      private_authority_capability: item.authorityCapability,
      now_ms: CONTEXT_NOW_MS + 5 * 60 * 1000 - 1,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await revalidateWelcomeAudioLiveAuthorityCapability({
      private_authority_capability: item.authorityCapability,
      now_ms: CONTEXT_NOW_MS + 5 * 60 * 1000,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("issues only one-use opaque capabilities for an exact PRECLAIM sealed-backlog binding", async () => {
    const item = await contextFixture();
    const result = await validateOperationContextFixture(item);

    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      pure_guard_preclaim_valid: true,
      central_commit_bound: true,
      approval_bound: true,
      operation_bound: true,
      canonical_operation_bound: true,
      source_provenance_bound: true,
      private_capability_issued: true,
      send_allowed: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(Object.keys(result.redacted_receipt).sort()).toEqual(
      [...WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS].sort(),
    );
    expect(validateWelcomeAudioLiveOperationContextReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(await verifyWelcomeAudioLiveOperationContextCapabilityBinding({
      private_operation_context_capability: result.private_capability,
      private_authority_capability: item.authorityCapability,
      private_audio_asset_capability: item.assetCapability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      approval_packet_id: APPROVAL_PACKET_ID,
      operation_id: OPERATION_ID,
      central_repo_head: CENTRAL_HEAD,
      canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
      manifest_sha256: item.fixture.manifestSha256,
      campaign_interval_sha256: item.fixture.campaignIntervalSha256,
      identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      audio_asset_sha256: item.audioSha256,
      manifest_ordinal: 1,
      now_ms: CONTEXT_NOW_MS,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await verifyWelcomeAudioLiveOperationContextCapabilityBinding({
      private_operation_context_capability: result.private_capability,
      private_authority_capability: item.authorityCapability,
      private_audio_asset_capability: item.assetCapability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      approval_packet_id: APPROVAL_PACKET_ID,
      operation_id: OPERATION_ID,
      central_repo_head: CENTRAL_HEAD,
      canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
      manifest_sha256: item.fixture.manifestSha256,
      campaign_interval_sha256: item.fixture.campaignIntervalSha256,
      identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      audio_asset_sha256: item.audioSha256,
      manifest_ordinal: 1,
      now_ms: CONTEXT_NOW_MS + 5 * 60 * 1000,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(() => JSON.stringify(result.private_capability)).toThrow(
      "private_preflight_capability_not_serializable",
    );
    const serialized = JSON.stringify(result.redacted_receipt);
    for (const privateValue of [
      APPROVAL_PACKET_ID,
      OPERATION_ID,
      CENTRAL_HEAD,
      THREAD_SHA,
      OWNER_SHA,
      item.fixture.manifestSha256,
      item.fixture.campaignIntervalSha256,
    ]) expect(serialized).not.toContain(privateValue);
  });

  test.each([
    ["manifest digest", (snapshot: Record<string, any>) => {
      snapshot.source_provenance.manifest_digest_sha256 = "7".repeat(64);
    }],
    ["campaign interval digest", (snapshot: Record<string, any>) => {
      snapshot.source_provenance.campaign_interval_digest_sha256 = "8".repeat(64);
    }],
    ["manifest record index", (snapshot: Record<string, any>) => {
      snapshot.source_provenance.manifest_record_index = 1;
    }],
    ["manifest record count", (snapshot: Record<string, any>) => {
      snapshot.source_provenance.manifest_record_count = 4;
    }],
  ])("blocks %s provenance drift after the pure guard remains green", async (_label, mutate) => {
    const item = await contextFixture();
    mutate(item.operationSnapshot);
    bindCanonicalDigest(item.operationSnapshot);
    const result = await validateOperationContextFixture(item);
    expect(result.private_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_BINDING_DRIFT,
    ]);
  });

  test.each([
    ["approval", { expected_approval_packet_id: "different_approval_packet" }],
    ["operation", { expected_operation_id: "different_operation_id" }],
    ["central commit", { expected_central_repo_head: "f".repeat(40) }],
  ])("blocks %s binding drift", async (_label, overrides) => {
    const item = await contextFixture();
    const result = await validateWelcomeAudioLiveOperationContext({
      operation_snapshot: item.operationSnapshot,
      private_authority_capability: item.authorityCapability,
      private_audio_asset_capability: item.assetCapability,
      expected_canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
      expected_mission_id: MISSION_ID,
      expected_contract_version: CONTRACT_VERSION,
      expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
      expected_approval_packet_id: APPROVAL_PACKET_ID,
      expected_operation_id: OPERATION_ID,
      expected_central_repo_head: CENTRAL_HEAD,
      expected_manifest_sha256: item.fixture.manifestSha256,
      expected_campaign_interval_sha256: item.fixture.campaignIntervalSha256,
      expected_identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      expected_thread_anchor_sha256: THREAD_SHA,
      expected_owner_anchor_sha256: OWNER_SHA,
      expected_audio_sha256: item.audioSha256,
      expected_manifest_ordinal: 1,
      private_manifest_capability: item.manifestCapability,
      now_ms: CONTEXT_NOW_MS,
      ...overrides,
    });
    expect(result.private_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_BINDING_DRIFT,
    ]);
  });

  test("preserves exact identity bytes and consumes target and operation capabilities once", async () => {
    const item = await contextFixture();
    const result = await validateOperationContextFixture(item);
    const targetBinding = {
      private_target_binding_capability: result.private_target_binding_capability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      exact_target: item.exactTarget,
      expected_operation_id: OPERATION_ID,
      expected_identity_anchor_sha256:
        item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      expected_thread_anchor_sha256: THREAD_SHA,
      now_ms: CONTEXT_NOW_MS,
    };
    expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce(targetBinding))
      .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce(targetBinding))
      .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    const second = await validateOperationContextFixture(item);
    expect(await consumeWelcomeAudioLiveTargetBindingCapabilityOnce({
      ...targetBinding,
      private_target_binding_capability: second.private_target_binding_capability,
      exact_target: item.exactTarget.toLowerCase(),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    const operationBinding = {
      private_operation_context_capability: result.private_capability,
      private_authority_capability: item.authorityCapability,
      private_audio_asset_capability: item.assetCapability,
      required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: MISSION_ID,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      approval_packet_id: APPROVAL_PACKET_ID,
      operation_id: OPERATION_ID,
      central_repo_head: CENTRAL_HEAD,
      canonical_operation_sha256: item.operationSnapshot.canonical_operation_sha256,
      manifest_sha256: item.fixture.manifestSha256,
      campaign_interval_sha256: item.fixture.campaignIntervalSha256,
      identity_anchor_sha256: item.fixture.manifest.ordered_records[0].identity_anchor_sha256,
      thread_anchor_sha256: THREAD_SHA,
      owner_anchor_sha256: OWNER_SHA,
      audio_asset_sha256: item.audioSha256,
      manifest_ordinal: 1,
      now_ms: CONTEXT_NOW_MS,
    };
    expect(await consumeWelcomeAudioLiveOperationContextCapabilityOnce(operationBinding))
      .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await consumeWelcomeAudioLiveOperationContextCapabilityOnce(operationBinding))
      .toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(() => computeWelcomeAudioExactIdentityAnchorSha256("broken\ud800target"))
      .toThrow("exact_target_must_be_well_formed_string");
  });

  test("rejects a separately minted asset capability even for the same path and hash", async () => {
    const item = await contextFixture();
    const separatelyMinted = await validateApprovedWelcomeAudioAsset({
      asset_path: item.assetPath,
      expected_audio_sha256: item.audioSha256,
    });
    const result = await validateOperationContextFixture({
      ...item,
      assetCapability: separatelyMinted.private_capability,
    });
    expect(result.private_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_BINDING_DRIFT,
    ]);
  });

  test("rejects invalid UTF-8 in an owner-only authority file", async () => {
    const fixture = manifestFixture(1);
    const root = await realpath(await mkdtemp(join(
      tmpdir(),
      "crm-core-welcome-audio-live-authority-invalid-utf8-",
    )));
    cleanupPaths.push(root);
    await chmod(root, 0o700);
    await Promise.all([
      writeFile(
        join(root, "execution-approval-v1.json"),
        Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]),
        { mode: 0o600 },
      ),
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
    const result = await createSyntheticWelcomeAudioLiveAuthorityCapability({
      authority_root: root,
      now_ms: CONTEXT_NOW_MS,
    });
    expect(result.private_authority_capability).toBeNull();
    expect(result.private_manifest_capability).toBeNull();
    expect(result.private_audio_asset_capability).toBeNull();
    expect(result.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID,
    ]);
  });
});

describe("Instagram welcome-audio exact asset preflight", () => {
  test("validates a stable real file by no-follow stat and exact hash", async () => {
    const asset = await createSyntheticAsset();
    const result = await validateApprovedWelcomeAudioAsset({
      asset_path: asset.assetPath,
      expected_audio_sha256: asset.digest,
    });

    expect(result.redacted_receipt).toMatchObject({
      subject: WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT.AUDIO_ASSET,
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      regular_file_verified: true,
      stable_file_verified: true,
      asset_hash_verified: true,
      send_allowed: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioLivePreflightReceipt(result.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect(await revalidateApprovedWelcomeAudioAssetCapability({
      private_audio_asset_capability: result.private_capability,
      expected_audio_sha256: asset.digest,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
      private_audio_asset_capability: result.private_capability,
      asset_path: asset.assetPath,
      expected_audio_sha256: asset.digest,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID);
    expect(await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
      private_audio_asset_capability: result.private_capability,
      asset_path: join(asset.root, "different.m4a"),
      expected_audio_sha256: asset.digest,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    await writeFile(asset.assetPath, Buffer.from("changed", "utf8"), { mode: 0o600 });
    expect(await revalidateApprovedWelcomeAudioAssetCapability({
      private_audio_asset_capability: result.private_capability,
      expected_audio_sha256: asset.digest,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
  });

  test("rejects symlink, wrong hash, missing file, and non-absolute path", async () => {
    const asset = await createSyntheticAsset();
    const symlinkPath = join(asset.root, "synthetic-link.m4a");
    await symlink(asset.assetPath, symlinkPath);

    expect((await validateApprovedWelcomeAudioAsset({
      asset_path: symlinkPath,
      expected_audio_sha256: asset.digest,
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_PATH_INVALID,
    ]);
    expect((await validateApprovedWelcomeAudioAsset({
      asset_path: asset.assetPath,
      expected_audio_sha256: "f".repeat(64),
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_HASH_MISMATCH,
    ]);
    expect((await validateApprovedWelcomeAudioAsset({
      asset_path: join(asset.root, "missing.m4a"),
      expected_audio_sha256: asset.digest,
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_INVALID,
    ]);
    expect((await validateApprovedWelcomeAudioAsset({
      asset_path: "relative.m4a",
      expected_audio_sha256: asset.digest,
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_PATH_INVALID,
    ]);
  });

  test("does not leak asset paths or hashes in blocked or green receipts", async () => {
    const asset = await createSyntheticAsset();
    for (const expectedHash of [asset.digest, "f".repeat(64)]) {
      const receipt = (await validateApprovedWelcomeAudioAsset({
        asset_path: asset.assetPath,
        expected_audio_sha256: expectedHash,
      })).redacted_receipt;
      const serialized = JSON.stringify(receipt);
      expect(serialized).not.toContain(asset.assetPath);
      expect(serialized).not.toContain(asset.digest);
      expect(serialized).not.toContain(expectedHash);
    }
  });

  test("module import is inert and creates no filesystem entries", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "crm-core-live-preflight-import-")));
    cleanupPaths.push(root);
    await chmod(root, 0o700);
    const before = await readdir(root);
    await import(`${resolve("scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs")}?inert=1`);
    expect(await readdir(root)).toEqual(before);
  });
});

const UI_ATTESTED_NOW_MS = Date.parse("2026-07-16T15:00:00.000Z");

const uiAttestedSourceInputFixture = () => ({
  schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_INPUT_SCHEMA_VERSION,
  source_class: WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  mission_id: "synthetic_ui_attested_preflight_mission_001",
  notification_row: {
    row_ordinal: 3,
    exact_target_utf8: "Synthetic.Preflight+Exact_é",
    notification_evidence: "explicit_recent_follower_notification_row",
    follower_signal: "started_following_owner",
    time_bucket_utf8: "synthetic visible bucket 2 d",
    time_bucket_evidence: "explicit_visible_relative_time_label",
    attested_at: "2026-07-16T14:59:00.000Z",
    inference_status: "explicit_not_inferred",
  },
  profile: {
    exact_target_utf8: "Synthetic.Preflight+Exact_é",
    notification_to_profile_binding: "exact",
    profile_identity_evidence: "exact_private_visual_profile_identity",
    follows_owner: "confirmed",
    follows_owner_evidence: "explicit_visible_follows_owner_signal",
    attested_at: "2026-07-16T14:59:10.000Z",
    inference_status: "explicit_not_inferred",
  },
  thread: {
    bound_thread_reference_utf8: "synthetic-thread-reference/Preflight+Exact",
    profile_to_thread_binding: "exact",
    thread_binding_evidence: "exact_bound_thread_observed",
    attested_at: "2026-07-16T14:59:20.000Z",
    inference_status: "explicit_not_inferred",
  },
  owner: {
    owner_account_reference_utf8: "synthetic-owner-reference/Preflight+Exact",
    owner_binding_evidence: "exact_owner_account_observed",
    attested_at: "2026-07-16T14:59:30.000Z",
    inference_status: "explicit_not_inferred",
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    exact_target_utf8: "Synthetic.Preflight+Exact_é",
    bound_thread_reference_utf8: "synthetic-thread-reference/Preflight+Exact",
    owner_account_reference_utf8: "synthetic-owner-reference/Preflight+Exact",
    checked_at: "2026-07-16T14:59:40.000Z",
    dedupe_evidence: "exact_bound_thread_history_observed",
    inference_status: "explicit_not_inferred",
  },
  exact_follow_timestamp_claimed: false,
  provider_event_id_claimed: false,
  campaign_membership_claimed: false,
});

const validUiAttestedProjection = () => {
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
    uiAttestedSourceInputFixture(),
    { nowMs: UI_ATTESTED_NOW_MS },
  );
  expect(adapted.private_projection).not.toBeNull();
  return adapted.private_projection!;
};

const validUiAttestedRecentEventProjection = () => {
  const input = uiAttestedSourceInputFixture();
  input.notification_row.time_bucket_utf8 = "synthetic visible bucket 4 d";
  input.profile.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
    .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
  input.profile.follows_owner_evidence = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_EVIDENCE
    .RECENT_EVENT_VISIBLE_3_TO_7_DAY_PILOT_BUCKET;
  const adapted = adaptWelcomeAudioUiAttestedFollowerSource(
    input,
    { nowMs: UI_ATTESTED_NOW_MS },
  );
  expect(adapted.private_projection).not.toBeNull();
  return adapted.private_projection!;
};

const uiAttestedCapabilityBinding = (
  privateCapability: unknown,
  projection: ReturnType<typeof validUiAttestedProjection>,
  nowMs = UI_ATTESTED_NOW_MS,
  minimumIssuedAtMs = UI_ATTESTED_NOW_MS - 1,
) => ({
  private_ui_attested_source_capability: privateCapability,
  required_mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
  mission_id: projection.mission_id,
  source_evidence_schema_version: projection.schema_version,
  source_evidence_sha256: projection.source_evidence_sha256,
  source_record_ordinal: projection.notification_row.row_ordinal,
  source_evidence_anchor_sha256: projection.anchors.source_evidence_anchor_sha256,
  profile_anchor_sha256: projection.anchors.profile_anchor_sha256,
  candidate_anchor_sha256: projection.anchors.candidate_anchor_sha256,
  thread_anchor_sha256: projection.anchors.thread_anchor_sha256,
  owner_anchor_sha256: projection.anchors.owner_anchor_sha256,
  dedupe_anchor_sha256: projection.anchors.dedupe_anchor_sha256,
  evidence_observed_at: projection.dedupe.checked_at,
  minimum_issued_at_ms: minimumIssuedAtMs,
  now_ms: nowMs,
});

describe("Instagram welcome-audio synthetic UI-attested source preflight", () => {
  test("binds the exact adapter projection and issues one non-serializable capability", () => {
    const projection = validUiAttestedProjection();
    const result = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    });

    expect(result.private_capability).not.toBeNull();
    expect(Object.isFrozen(result.private_capability)).toBe(true);
    expect(() => JSON.stringify(result.private_capability)).toThrow(
      "private_preflight_capability_not_serializable",
    );
    expect(Object.keys(result.redacted_receipt)).toEqual([
      ...WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS,
    ]);
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      ui_attested_source_bound: true,
      exact_identity_bound: true,
      profile_bound: true,
      follows_owner_bound: true,
      thread_bound: true,
      owner_bound: true,
      dedupe_bound: true,
      private_ui_attested_source_capability_issued: true,
      live_authority: false,
      live_claim_issued: false,
      private_live_claim_capability_issued: false,
      live_claim_record_persisted: false,
      send_allowed: false,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    const binding = uiAttestedCapabilityBinding(
      result.private_capability,
      projection,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
  });

  test("binds bounded recent-event evidence without claiming a current follows-owner badge", () => {
    const projection = validUiAttestedRecentEventProjection();
    const result = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    });

    expect(result.private_capability).not.toBeNull();
    expect(result.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID,
      ui_attested_source_bound: true,
      follows_owner_bound: false,
      thread_bound: true,
      dedupe_bound: true,
      send_allowed: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      result.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
  });

  test("rejects binding drift and the exact capability expiry boundary", () => {
    const projection = validUiAttestedProjection();
    const result = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    });
    const binding = uiAttestedCapabilityBinding(result.private_capability, projection);
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...binding,
      thread_anchor_sha256: "0".repeat(64),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...binding,
      source_evidence_sha256: "f".repeat(64),
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...binding,
      now_ms: UI_ATTESTED_NOW_MS + WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_TTL_MS,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
  });

  test("requires post-slot issuance and exact projection observation-time binding", () => {
    const projection = validUiAttestedProjection();
    const preSlot = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    });
    const preSlotBinding = uiAttestedCapabilityBinding(
      preSlot.private_capability,
      projection,
      UI_ATTESTED_NOW_MS + 1,
      UI_ATTESTED_NOW_MS + 1,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(preSlotBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(preSlotBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...preSlotBinding,
      minimum_issued_at_ms: UI_ATTESTED_NOW_MS,
      evidence_observed_at: "2026-07-16T14:59:39.999Z",
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...preSlotBinding,
      minimum_issued_at_ms: UI_ATTESTED_NOW_MS,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    const postSlot = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS + 2,
    });
    const postSlotBinding = uiAttestedCapabilityBinding(
      postSlot.private_capability,
      projection,
      UI_ATTESTED_NOW_MS + 3,
      UI_ATTESTED_NOW_MS + 1,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(postSlotBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(postSlotBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
  });

  test("keeps connected source capabilities private to one opaque slot bridge", () => {
    const projection = validUiAttestedProjection();
    const channelA = createWelcomeAudioUiAttestedConnectedSourcePreflightBridge();
    const channelB = createWelcomeAudioUiAttestedConnectedSourcePreflightBridge();
    const privateSlotBinding = Object.freeze({ synthetic_slot: "a" });
    const otherSlotBinding = Object.freeze({ synthetic_slot: "b" });
    const equalTime = channelA.issue({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
      minimum_issued_at_ms: UI_ATTESTED_NOW_MS,
      private_slot_binding: privateSlotBinding,
    });
    expect(equalTime.private_capability).toBeNull();

    const connected = channelA.issue({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS + 1,
      minimum_issued_at_ms: UI_ATTESTED_NOW_MS,
      private_slot_binding: privateSlotBinding,
    });
    expect(connected.private_capability).not.toBeNull();
    const connectedBinding = {
      ...uiAttestedCapabilityBinding(
        connected.private_capability,
        projection,
        UI_ATTESTED_NOW_MS + 2,
        UI_ATTESTED_NOW_MS,
      ),
      private_slot_binding: privateSlotBinding,
    };
    expect(channelA.verify(connectedBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(channelA.verify({
      ...connectedBinding,
      private_slot_binding: otherSlotBinding,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(channelB.verify(connectedBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(
      connectedBinding,
    )).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    const standalone = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS + 1,
    });
    expect(channelA.verify({
      ...connectedBinding,
      private_ui_attested_source_capability: standalone.private_capability,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);
    expect(channelA.consume(connectedBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(channelA.verify(connectedBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );

    const retired = channelA.issue({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS + 3,
      minimum_issued_at_ms: UI_ATTESTED_NOW_MS,
      private_slot_binding: privateSlotBinding,
    });
    const retiredBinding = {
      ...connectedBinding,
      private_ui_attested_source_capability: retired.private_capability,
      now_ms: UI_ATTESTED_NOW_MS + 4,
    };
    expect(channelA.retire(privateSlotBinding)).toBe(true);
    expect(channelA.verify(retiredBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
  });

  test("blocks stale or tampered adapter projections before capability issuance", () => {
    const projection = validUiAttestedProjection();
    const stale = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS + 5 * 60 * 1000 + 1,
    });
    expect(stale.private_capability).toBeNull();
    expect(stale.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
      private_ui_attested_source_capability_issued: false,
      live_authority: false,
      live_claim_issued: false,
      private_live_claim_capability_issued: false,
      live_claim_record_persisted: false,
      send_allowed: false,
      external_effect_invoked: false,
      browser_used: false,
      network_used: false,
      blocker_codes: [WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID],
    });
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      stale.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    for (const mutate of [
      (value: any) => { value.source_evidence_sha256 = "0".repeat(64); },
      (value: any) => { value.anchors.profile_anchor_sha256 = "1".repeat(64); },
      (value: any) => { value.exact_follow_timestamp_claimed = true; },
    ]) {
      const tampered = structuredClone(projection);
      mutate(tampered);
      const blocked = validateWelcomeAudioUiAttestedSourcePreflight({
        private_source_projection: tampered,
        mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
        now_ms: UI_ATTESTED_NOW_MS,
      });
      expect(blocked.private_capability).toBeNull();
      expect(blocked.redacted_receipt.blocker_codes).toEqual([
        WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID,
      ]);
      expect(blocked.redacted_receipt).toMatchObject({
        live_authority: false,
        live_claim_issued: false,
        private_live_claim_capability_issued: false,
        live_claim_record_persisted: false,
        send_allowed: false,
        external_effect_invoked: false,
        browser_used: false,
        network_used: false,
      });
    }
  });

  test("keeps all aggregate receipts free of private source material", () => {
    const input = uiAttestedSourceInputFixture();
    const projection = validUiAttestedProjection();
    const receipts = [
      validateWelcomeAudioUiAttestedSourcePreflight({
        private_source_projection: projection,
        mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
        now_ms: UI_ATTESTED_NOW_MS,
      }).redacted_receipt,
      validateWelcomeAudioUiAttestedSourcePreflight({
        private_source_projection: projection,
        mode: "live",
        now_ms: UI_ATTESTED_NOW_MS,
      }).redacted_receipt,
    ];
    const privateValues = [
      input.mission_id,
      input.notification_row.exact_target_utf8,
      input.notification_row.time_bucket_utf8,
      input.notification_row.attested_at,
      input.thread.bound_thread_reference_utf8,
      input.owner.owner_account_reference_utf8,
      input.dedupe.checked_at,
      projection.source_evidence_sha256,
      ...Object.values(projection.anchors),
    ];
    for (const receipt of receipts) {
      const serialized = JSON.stringify(receipt);
      for (const value of privateValues) expect(serialized).not.toContain(value);
      expect(serialized).not.toContain("/Users/");
      expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(receipt))
        .toEqual({ ok: true, reason: null });
    }
  });

  test("fails closed for hostile public preflight, receipt, and capability inputs", () => {
    const projection = validUiAttestedProjection();
    const validResult = validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    });
    const binding = uiAttestedCapabilityBinding(
      validResult.private_capability,
      projection,
    );
    let trapCount = 0;
    let getterCount = 0;

    const hostilePreflightEnvelope = new Proxy({
      private_source_projection: projection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    }, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedSourcePreflight(
      hostilePreflightEnvelope,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflight(
      hostilePreflightEnvelope,
    ).private_capability).toBeNull();

    const accessorPreflightEnvelope: any = {
      private_source_projection: projection,
      now_ms: UI_ATTESTED_NOW_MS,
    };
    Object.defineProperty(accessorPreflightEnvelope, "mode", {
      enumerable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY;
      },
    });
    expect(() => validateWelcomeAudioUiAttestedSourcePreflight(
      accessorPreflightEnvelope,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflight(
      accessorPreflightEnvelope,
    ).private_capability).toBeNull();

    const nestedProjection: any = structuredClone(projection);
    nestedProjection.anchors = new Proxy(nestedProjection.anchors, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: nestedProjection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    })).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflight({
      private_source_projection: nestedProjection,
      mode: WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY,
      now_ms: UI_ATTESTED_NOW_MS,
    }).private_capability).toBeNull();

    const hostileBinding = new Proxy(binding, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => verifyWelcomeAudioUiAttestedSourceCapabilityBinding(
      hostileBinding,
    )).not.toThrow();
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(hostileBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(() => consumeWelcomeAudioUiAttestedSourceCapabilityOnce(
      hostileBinding,
    )).not.toThrow();
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(hostileBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );

    const accessorBinding: any = { ...binding };
    Object.defineProperty(accessorBinding, "mission_id", {
      enumerable: true,
      get() {
        getterCount += 1;
        return projection.mission_id;
      },
    });
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(accessorBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );
    expect(consumeWelcomeAudioUiAttestedSourceCapabilityOnce(accessorBinding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    );

    const capabilityProxy = new Proxy(validResult.private_capability, {
      get() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding({
      ...binding,
      private_ui_attested_source_capability: capabilityProxy,
    })).toBe(WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID);

    const hostileReceipt = new Proxy(validResult.redacted_receipt, {
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      hostileReceipt,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(hostileReceipt).ok)
      .toBe(false);

    const nestedArrayProxyReceipt: any = structuredClone(validResult.redacted_receipt);
    nestedArrayProxyReceipt.blocker_codes = new Proxy([], {
      get() {
        trapCount += 1;
        throw new Error("must not run");
      },
      ownKeys() {
        trapCount += 1;
        throw new Error("must not run");
      },
    });
    expect(() => validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      nestedArrayProxyReceipt,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      nestedArrayProxyReceipt,
    ).ok).toBe(false);

    const accessorArrayReceipt: any = structuredClone(validResult.redacted_receipt);
    const accessorArray: any[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID;
      },
    });
    accessorArrayReceipt.blocker_codes = accessorArray;
    expect(() => validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      accessorArrayReceipt,
    )).not.toThrow();
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(
      accessorArrayReceipt,
    ).ok).toBe(false);

    const accessorReceipt: any = structuredClone(validResult.redacted_receipt);
    Object.defineProperty(accessorReceipt, "decision", {
      enumerable: true,
      get() {
        getterCount += 1;
        return WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
      },
    });
    expect(validateWelcomeAudioUiAttestedSourcePreflightReceipt(accessorReceipt).ok)
      .toBe(false);

    expect(verifyWelcomeAudioUiAttestedSourceCapabilityBinding(binding)).toBe(
      WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    );
    expect(trapCount).toBe(0);
    expect(getterCount).toBe(0);
  });
});
