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
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioSealedManifestSha256,
  consumeWelcomeAudioLiveOperationContextCapabilityOnce,
  consumeWelcomeAudioLiveTargetBindingCapabilityOnce,
  createSyntheticWelcomeAudioLiveAuthorityCapability,
  revalidateApprovedWelcomeAudioAssetCapability,
  revalidateWelcomeAudioLiveAuthorityCapability,
  validateApprovedWelcomeAudioAsset,
  validateSealedWelcomeAudioBacklogManifest,
  validateWelcomeAudioLiveOperationContext,
  validateWelcomeAudioLiveOperationContextReceipt,
  validateWelcomeAudioLivePreflightReceipt,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
  verifyWelcomeAudioLiveOperationContextCapabilityBinding,
  verifySealedWelcomeAudioManifestCapability,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";
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
