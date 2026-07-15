import { createHash } from "node:crypto";
import { constants as FS_CONSTANTS } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

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
import {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioSealedManifestSha256,
  createSyntheticWelcomeAudioLiveAuthorityCapability,
  validateWelcomeAudioLiveOperationContext,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs";
import {
  WELCOME_AUDIO_LIVE_ATTEMPT_DECISION,
  WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME,
  WELCOME_AUDIO_LIVE_CLAIM_BLOCKER,
  WELCOME_AUDIO_LIVE_CLAIM_DECISION,
  WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION,
  WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP,
  WELCOME_AUDIO_LIVE_STATE_DECISION,
  WELCOME_AUDIO_LIVE_STORE_MODE,
  cancelWelcomeAudioLiveReservationZeroEffect,
  claimNextWelcomeAudioLiveManifestInspection,
  consumeWelcomeAudioLiveHostPendingCapabilityOnce,
  createSyntheticWelcomeAudioLiveClaimStoreCapability,
  enterWelcomeAudioLiveAttemptBoundary,
  finalizeWelcomeAudioLiveAttemptAsUnknown,
  issueWelcomeAudioLiveClaim,
  recoverWelcomeAudioLivePendingAttemptAfterOwnerExit,
  recordWelcomeAudioLiveInspectionResult,
  validateWelcomeAudioLiveAttemptReceipt,
  validateWelcomeAudioLiveClaimReceipt,
  validateWelcomeAudioLiveStateReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs";

const cleanupPaths: string[] = [];
const DEFAULT_MISSION_ID = "synthetic_live_claim_mission";
const CONTRACT_VERSION = "synthetic_live_contract_v1";
const CENTRAL_HEAD = "a".repeat(40);
const OWNER_SHA = "b".repeat(64);
const MISSION_CONTRACT_SHA = "9".repeat(64);
const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, {
    recursive: true,
    force: true,
  })));
});

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

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

type Fixture = Awaited<ReturnType<typeof setup>>;

const operationSnapshot = ({
  missionId,
  operationId,
  approvalPacketId,
  sourceSha,
  profileSha,
  identitySha,
  threadSha,
  audioSha256,
  manifestSha256,
  campaignIntervalSha256,
  manifestOrdinal,
  manifestRecordCount,
  followedAt,
}: Record<string, any>) => bindCanonicalDigest({
  adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
  contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  canonical_operation_sha256: "0".repeat(64),
  operation: {
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    mission_id: missionId,
    source_event_anchor_sha256: sourceSha,
    profile_anchor_sha256: profileSha,
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: "synthetic_welcome_audio_asset_001",
    approved_audio_asset_sha256: audioSha256,
    expected_send_count: 1,
    confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    canonical_operation_sha256: "0".repeat(64),
  },
  approval: {
    status: "approved_exact_single_send",
    checked_at: "2026-07-14T15:56:00.000Z",
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    mission_id: missionId,
    source_event_anchor_sha256: sourceSha,
    profile_anchor_sha256: profileSha,
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: "synthetic_welcome_audio_asset_001",
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
    observed_at: followedAt,
    time_bucket: "sealed_campaign_interval",
    source_recency_max_age_ms: 14 * 24 * 60 * 60 * 1000,
    source_event_anchor_sha256: sourceSha,
  },
  binding: {
    source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG,
    source_to_profile: "exact",
    profile_to_thread: "exact",
    follows_owner: "confirmed",
    ambiguity: "clear",
    source_event_anchor_sha256: sourceSha,
    profile_anchor_sha256: profileSha,
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
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
    approved_audio_asset_id: "synthetic_welcome_audio_asset_001",
    approved_audio_asset_sha256: audioSha256,
    asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE,
    preview_status: "approved_file_validated_before_upload",
    preview_audio_asset_id: "synthetic_welcome_audio_asset_001",
    preview_audio_asset_sha256: audioSha256,
    preview_thread_anchor_sha256: threadSha,
    preview_observed_at: "2026-07-14T15:58:40.000Z",
  },
  context: {
    status: "fresh_exact_central_mission_context",
    checked_at: "2026-07-14T15:57:00.000Z",
    central_repo_head: CENTRAL_HEAD,
    expected_central_repo_head: CENTRAL_HEAD,
    mission_id: missionId,
    expected_mission_id: missionId,
    mission_status: "active",
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    confirmation_max_delay_ms: WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
    canonical_operation_sha256: "0".repeat(64),
  },
  dedupe: {
    status: "clear_no_prior_welcome_or_attempt",
    already_welcomed_status: "not_found",
    send_history_status: "no_prior_attempt",
    checked_at: "2026-07-14T15:58:00.000Z",
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    mission_id: missionId,
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
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
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    mission_id: missionId,
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: "synthetic_welcome_audio_asset_001",
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
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
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
    operation_id: operationId,
    approval_packet_id: approvalPacketId,
    mission_id: missionId,
    canonical_operation_sha256: "0".repeat(64),
    candidate_anchor_sha256: identitySha,
    thread_anchor_sha256: threadSha,
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
    manifest_digest_sha256: manifestSha256,
    campaign_interval_digest_sha256: campaignIntervalSha256,
    manifest_record_index: manifestOrdinal - 1,
    manifest_record_count: manifestRecordCount,
    source_event_anchor_sha256: sourceSha,
  },
});

async function setup({
  count = 4,
  missionId = DEFAULT_MISSION_ID,
  exactTargets,
  shared,
}: {
  count?: number;
  missionId?: string;
  exactTargets?: string[];
  shared?: Fixture;
} = {}) {
  let storeRoot: string;
  let storeCapability: unknown;
  let assetRoot: string;
  let assetPath: string;
  let audioSha256: string;
  if (shared) {
    ({
      storeRoot,
      storeCapability,
      assetRoot,
      assetPath,
      audioSha256,
    } = shared);
  } else {
    storeRoot = await realpath(await mkdtemp(join(
      tmpdir(),
      "crm-core-welcome-audio-live-claim-store-test-",
    )));
    assetRoot = await realpath(await mkdtemp(join(tmpdir(), "crm-core-live-asset-fixture-")));
    cleanupPaths.push(storeRoot, assetRoot);
    await chmod(storeRoot, 0o700);
    storeCapability = await createSyntheticWelcomeAudioLiveClaimStoreCapability({
      store_root: storeRoot,
    });
    assetPath = join(assetRoot, "approved-audio.m4a");
    const assetBytes = Buffer.from("synthetic approved audio bytes", "utf8");
    await writeFile(assetPath, assetBytes, { mode: 0o600 });
    audioSha256 = sha256(assetBytes);
  }

  const campaignInterval = {
    schema_version: WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
    start_at: "2026-07-13T12:00:00.000Z",
    end_at: "2026-07-14T12:00:00.000Z",
  };
  const campaignIntervalSha256 = computeWelcomeAudioCampaignIntervalSha256(campaignInterval);
  const boundExactTargets = Array.from({ length: count }, (_, index) =>
    exactTargets?.[index] ?? `Synthetic.Target+${index + 1}@Example.COM`);
  const records = Array.from({ length: count }, (_, index) => ({
    ordinal: index + 1,
    identity_anchor_sha256: computeWelcomeAudioExactIdentityAnchorSha256(
      boundExactTargets[index],
    ),
    followed_at: `2026-07-13T${String(13 + index).padStart(2, "0")}:00:00.000Z`,
    campaign_interval_sha256: campaignIntervalSha256,
  }));
  const manifest = {
    schema_version: WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
    identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
    mission_id: missionId,
    contract_version: CONTRACT_VERSION,
    campaign_interval_sha256: campaignIntervalSha256,
    ordered_records: records,
  };
  const manifestSha256 = computeWelcomeAudioSealedManifestSha256(manifest);
  const approvalPacketId = `synthetic_live_approval_${missionId}`;
  const bindings = records.map((record, index) => ({
    manifest_ordinal: index + 1,
    operation_id: `synthetic_live_operation_${index + 1}_${missionId}`,
    exact_target_utf8: boundExactTargets[index],
    identity_anchor_sha256: record.identity_anchor_sha256,
    thread_anchor_sha256: sha256(`thread:${missionId}:${index + 1}`),
    owner_anchor_sha256: OWNER_SHA,
  }));
  const authorityRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    "crm-core-welcome-audio-live-authority-test-",
  )));
  cleanupPaths.push(authorityRoot);
  await chmod(authorityRoot, 0o700);
  const approval = {
    schema_version: WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
    status: "approved_for_bounded_live_canary",
    mission_id: missionId,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    active_next_action_id: "synthetic_welcome_audio_canary",
    active_next_action_sha256: "8".repeat(64),
    central_repo_head: CENTRAL_HEAD,
    approval_packet_id: approvalPacketId,
    manifest_sha256: manifestSha256,
    campaign_interval_sha256: campaignIntervalSha256,
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
    operation_bindings: bindings,
  };
  await Promise.all([
    writeFile(
      join(authorityRoot, "execution-approval-v1.json"),
      `${JSON.stringify(approval)}\n`,
      { mode: 0o600 },
    ),
    writeFile(
      join(authorityRoot, "sealed-backlog-manifest-v1.json"),
      `${JSON.stringify(manifest)}\n`,
      { mode: 0o600 },
    ),
    writeFile(
      join(authorityRoot, "campaign-interval-v1.json"),
      `${JSON.stringify(campaignInterval)}\n`,
      { mode: 0o600 },
    ),
  ]);
  const authority = await createSyntheticWelcomeAudioLiveAuthorityCapability({
    authority_root: authorityRoot,
    now_ms: NOW_MS,
  });
  if (!authority.private_authority_capability) {
    throw new Error("synthetic authority failed");
  }
  const authorityCapability = authority.private_authority_capability;
  const manifestCapability = authority.private_manifest_capability;
  const assetCapability = authority.private_audio_asset_capability;
  const operations = await Promise.all(records.map(async (record, index) => {
    const ordinal = index + 1;
    const operationId = bindings[index].operation_id;
    const threadSha = bindings[index].thread_anchor_sha256;
    const snapshot = operationSnapshot({
      missionId,
      operationId,
      approvalPacketId,
      sourceSha: sha256(`source:${missionId}:${ordinal}`),
      profileSha: sha256(`profile:${missionId}:${ordinal}`),
      identitySha: record.identity_anchor_sha256,
      threadSha,
      audioSha256,
      manifestSha256,
      campaignIntervalSha256,
      manifestOrdinal: ordinal,
      manifestRecordCount: records.length,
      followedAt: record.followed_at,
    });
    const context = await validateWelcomeAudioLiveOperationContext({
      operation_snapshot: snapshot,
      private_authority_capability: authorityCapability,
      private_audio_asset_capability: assetCapability,
      expected_canonical_operation_sha256: snapshot.canonical_operation_sha256,
      expected_mission_id: missionId,
      expected_contract_version: CONTRACT_VERSION,
      expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
      expected_approval_packet_id: approvalPacketId,
      expected_operation_id: operationId,
      expected_central_repo_head: CENTRAL_HEAD,
      expected_manifest_sha256: manifestSha256,
      expected_campaign_interval_sha256: campaignIntervalSha256,
      expected_identity_anchor_sha256: record.identity_anchor_sha256,
      expected_thread_anchor_sha256: threadSha,
      expected_owner_anchor_sha256: OWNER_SHA,
      expected_audio_sha256: audioSha256,
      expected_manifest_ordinal: ordinal,
      private_manifest_capability: manifestCapability,
      now_ms: NOW_MS,
    });
    if (!context.private_capability) throw new Error("synthetic operation context failed");
    return {
      operationId,
      approvalPacketId,
      threadSha,
      canonicalOperationSha256: snapshot.canonical_operation_sha256,
      operationContextCapability: context.private_capability,
      snapshot,
    };
  }));
  return {
    missionId,
    storeRoot,
    storeCapability,
    assetRoot,
    assetPath,
    audioSha256,
    assetCapability,
    authorityRoot,
    authorityCapability,
    exactTargets: boundExactTargets,
    campaignIntervalSha256,
    manifest,
    manifestSha256,
    manifestCapability,
    operations,
  };
}

const inspection = async (
  fixture: Fixture,
  ordinal: number,
  classification = WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE,
) => {
  const claim = await claimNextWelcomeAudioLiveManifestInspection({
    private_store_capability: fixture.storeCapability,
    mission_id: fixture.missionId,
    contract_version: CONTRACT_VERSION,
    identity_anchor_sha256:
      fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256,
    manifest_ordinal: ordinal,
    expected_manifest_sha256: fixture.manifestSha256,
    expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
    private_manifest_capability: fixture.manifestCapability,
    now_ms: NOW_MS + ordinal * 10,
  });
  if (!claim.private_capability) return claim;
  return recordWelcomeAudioLiveInspectionResult({
    private_inspection_capability: claim.private_capability,
    classification,
    now_ms: NOW_MS + ordinal * 10 + 1,
  });
};

const issue = async (
  fixture: Fixture,
  ordinal: number,
  overrides: Record<string, unknown> = {},
) => {
  const operation = fixture.operations[ordinal - 1];
  return issueWelcomeAudioLiveClaim({
    private_store_capability: fixture.storeCapability,
    private_operation_context_capability: operation.operationContextCapability,
    private_authority_capability: fixture.authorityCapability,
    mission_id: fixture.missionId,
    contract_version: CONTRACT_VERSION,
    expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
    expected_approval_packet_id: operation.approvalPacketId,
    expected_operation_id: operation.operationId,
    expected_central_repo_head: CENTRAL_HEAD,
    expected_canonical_operation_sha256: operation.canonicalOperationSha256,
    identity_anchor_sha256:
      fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256,
    expected_thread_anchor_sha256: operation.threadSha,
    expected_owner_anchor_sha256: OWNER_SHA,
    manifest_ordinal: ordinal,
    expected_manifest_sha256: fixture.manifestSha256,
    expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
    expected_audio_sha256: fixture.audioSha256,
    private_manifest_capability: fixture.manifestCapability,
    private_audio_asset_capability: fixture.assetCapability,
    approved_audio_asset_path: fixture.assetPath,
    now_ms: NOW_MS + ordinal * 100,
    ...overrides,
  });
};

const claimBinding = (fixture: Fixture, ordinal: number, capability: unknown) => {
  const operation = fixture.operations[ordinal - 1];
  return {
    private_claim_capability: capability,
    mission_id: fixture.missionId,
    contract_version: CONTRACT_VERSION,
    mission_contract_sha256: MISSION_CONTRACT_SHA,
    approval_packet_id: operation.approvalPacketId,
    operation_id: operation.operationId,
    central_repo_head: CENTRAL_HEAD,
    canonical_operation_sha256: operation.canonicalOperationSha256,
    identity_anchor_sha256:
      fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256,
    thread_anchor_sha256: operation.threadSha,
    owner_anchor_sha256: OWNER_SHA,
    manifest_sha256: fixture.manifestSha256,
    campaign_interval_sha256: fixture.campaignIntervalSha256,
    audio_asset_sha256: fixture.audioSha256,
    manifest_ordinal: ordinal,
    required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    private_audio_asset_capability: fixture.assetCapability,
    approved_audio_asset_path: fixture.assetPath,
  };
};

const independentlyReadPendingEvidence = async (fixture: Fixture) => {
  const storeMetadata = await lstat(fixture.storeRoot);
  const pendingName = (await readdir(fixture.storeRoot)).find(
    (name) => name.startsWith("pending-") && name.endsWith(".json"),
  );
  if (!pendingName) throw new Error("pending fixture missing");
  const pendingPath = join(fixture.storeRoot, pendingName);
  const handle = await open(
    pendingPath,
    FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat();
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(pendingPath);
    for (const field of ["dev", "ino", "uid", "mode", "nlink", "size", "mtimeMs", "ctimeMs"] as const) {
      if (before[field] !== after[field] || after[field] !== pathAfter[field]) {
        throw new Error("pending fixture unstable");
      }
    }
    return {
      store_identity: {
        path: fixture.storeRoot,
        dev: storeMetadata.dev,
        ino: storeMetadata.ino,
        uid: storeMetadata.uid,
        mode: storeMetadata.mode,
      },
      pending_path: pendingPath,
      pending_digest: sha256(bytes),
      pending_metadata: {
        dev: after.dev,
        ino: after.ino,
        uid: after.uid,
        mode: after.mode,
        nlink: after.nlink,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
      },
      pending_snapshot: JSON.parse(bytes.toString("utf8")),
    };
  } finally {
    await handle.close();
  }
};

const hostPendingBinding = (
  fixture: Fixture,
  ordinal: number,
  capability: unknown,
  evidence: Awaited<ReturnType<typeof independentlyReadPendingEvidence>>,
) => {
  const operation = fixture.operations[ordinal - 1];
  return {
    private_host_pending_capability: capability,
    required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    independently_read_pending_evidence: evidence,
    expected_mission_id: fixture.missionId,
    expected_operation_id: operation.operationId,
    expected_identity_anchor_sha256:
      fixture.manifest.ordered_records[ordinal - 1].identity_anchor_sha256,
    expected_thread_anchor_sha256: operation.threadSha,
    expected_audio_sha256: fixture.audioSha256,
  };
};

const refreshOperationContext = async (
  fixture: Fixture,
  ordinal: number,
  nowMs = NOW_MS,
) => {
  const operation = fixture.operations[ordinal - 1];
  const record = fixture.manifest.ordered_records[ordinal - 1];
  const authority = await createSyntheticWelcomeAudioLiveAuthorityCapability({
    authority_root: fixture.authorityRoot,
    now_ms: nowMs,
  });
  if (!authority.private_authority_capability) {
    throw new Error("synthetic authority refresh failed");
  }
  fixture.authorityCapability = authority.private_authority_capability;
  fixture.manifestCapability = authority.private_manifest_capability;
  fixture.assetCapability = authority.private_audio_asset_capability;
  const freshIso = new Date(nowMs - 1_000).toISOString();
  operation.snapshot.approval.checked_at = freshIso;
  operation.snapshot.execution_surface.observed_at = freshIso;
  operation.snapshot.binding.observed_at = freshIso;
  operation.snapshot.eligibility.observed_at = freshIso;
  operation.snapshot.asset.preview_observed_at = freshIso;
  operation.snapshot.context.checked_at = freshIso;
  operation.snapshot.dedupe.checked_at = freshIso;
  bindCanonicalDigest(operation.snapshot);
  operation.canonicalOperationSha256 = operation.snapshot.canonical_operation_sha256;
  const context = await validateWelcomeAudioLiveOperationContext({
    operation_snapshot: operation.snapshot,
    private_authority_capability: fixture.authorityCapability,
    private_audio_asset_capability: fixture.assetCapability,
    expected_canonical_operation_sha256: operation.canonicalOperationSha256,
    expected_mission_id: fixture.missionId,
    expected_contract_version: CONTRACT_VERSION,
    expected_mission_contract_sha256: MISSION_CONTRACT_SHA,
    expected_approval_packet_id: operation.approvalPacketId,
    expected_operation_id: operation.operationId,
    expected_central_repo_head: CENTRAL_HEAD,
    expected_manifest_sha256: fixture.manifestSha256,
    expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
    expected_identity_anchor_sha256: record.identity_anchor_sha256,
    expected_thread_anchor_sha256: operation.threadSha,
    expected_owner_anchor_sha256: OWNER_SHA,
    expected_audio_sha256: fixture.audioSha256,
    expected_manifest_ordinal: ordinal,
    private_manifest_capability: fixture.manifestCapability,
    now_ms: nowMs,
  });
  if (!context.private_capability) throw new Error("synthetic context refresh failed");
  operation.operationContextCapability = context.private_capability;
};

describe("Instagram welcome-audio live reservation and PENDING boundary", () => {
  test("rejects an inspection capability at the exact five-minute expiry", async () => {
    const fixture = await setup({ count: 1 });
    const identityAnchor = fixture.manifest.ordered_records[0].identity_anchor_sha256;
    const claimed = await claimNextWelcomeAudioLiveManifestInspection({
      private_store_capability: fixture.storeCapability,
      mission_id: fixture.missionId,
      contract_version: CONTRACT_VERSION,
      identity_anchor_sha256: identityAnchor,
      manifest_ordinal: 1,
      expected_manifest_sha256: fixture.manifestSha256,
      expected_campaign_interval_sha256: fixture.campaignIntervalSha256,
      private_manifest_capability: fixture.manifestCapability,
      now_ms: NOW_MS + 10,
    });
    expect(claimed.private_capability).not.toBeNull();
    const expired = await recordWelcomeAudioLiveInspectionResult({
      private_inspection_capability: claimed.private_capability,
      classification: WELCOME_AUDIO_LIVE_INSPECTION_CLASSIFICATION.ELIGIBLE,
      now_ms: NOW_MS + 10 + 5 * 60 * 1000,
    });
    expect(expired.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.BLOCKED,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INPUT_INVALID],
    });
  });

  test("uses authority-issued capabilities and enforces inspection and eligible order", async () => {
    const fixture = await setup({ count: 3 });
    expect((await inspection(fixture, 2)).redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.BLOCKED,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_ORDER_INVALID],
    });
    await inspection(fixture, 1);
    await inspection(fixture, 2);
    expect((await issue(fixture, 2)).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.INSPECTION_ORDER_INVALID,
    ]);
    expect((await issue(fixture, 1)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED);
  });

  test("creates a five-minute reservation, cancels only at zero effect, and allows a fresh claim", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    expect(claimed.redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED);
    expect(validateWelcomeAudioLiveClaimReceipt(claimed.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    const cancelled = await cancelWelcomeAudioLiveReservationZeroEffect({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      cancelled_at_ms: NOW_MS + 101,
    });
    expect(cancelled.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CANCELLED);
    expect(validateWelcomeAudioLiveClaimReceipt(cancelled.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect((await readdir(fixture.storeRoot)).filter((name) => name.startsWith("claim-")))
      .toHaveLength(0);

    await refreshOperationContext(fixture, 1);
    expect((await issue(fixture, 1, { now_ms: NOW_MS + 102 })).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED);
  });

  test("caps one mission at three reservations", async () => {
    const fixture = await setup({ count: 4 });
    for (let ordinal = 1; ordinal <= 4; ordinal += 1) await inspection(fixture, ordinal);
    for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
      expect((await issue(fixture, ordinal)).redacted_receipt).toMatchObject({
        decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED,
        mission_claim_count: ordinal,
      });
    }
    expect((await issue(fixture, 4)).redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.CAP_REACHED,
      mission_claim_count: WELCOME_AUDIO_LIVE_MISSION_CLAIM_CAP,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.MISSION_CAP_REACHED],
    });
  });

  test("persists PENDING before actuation and permits only UNKNOWN terminal finalization", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const armed = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    expect(armed.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.ARMED,
      pending_record_present: true,
      terminal_record_present: false,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      retry_disposition: "terminal_no_retry",
    });
    expect(validateWelcomeAudioLiveAttemptReceipt(armed.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    const finalized = await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      attempted_at_ms: NOW_MS + 112,
      finalized_at_ms: NOW_MS + 113,
    });
    expect(finalized.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
      pending_record_present: false,
      terminal_record_present: true,
      retry_disposition: "terminal_no_retry",
    });
    expect(validateWelcomeAudioLiveAttemptReceipt(finalized.redacted_receipt))
      .toEqual({ ok: true, reason: null });
    expect((await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      attempted_at_ms: NOW_MS + 114,
      finalized_at_ms: NOW_MS + 115,
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN,
    ]);
  });

  test("mints separate opaque host and actuation capabilities over the same durable PENDING", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const armed = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    expect(armed.private_host_pending_capability).not.toBeNull();
    expect(armed.private_actuation_capability).not.toBeNull();
    expect(() => JSON.stringify(armed.private_host_pending_capability))
      .toThrow("private_live_state_capability_not_serializable");
    const evidence = await independentlyReadPendingEvidence(fixture);
    const binding = hostPendingBinding(
      fixture,
      1,
      armed.private_host_pending_capability,
      evidence,
    );
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce({
      ...binding,
      private_host_pending_capability: evidence.pending_snapshot,
    })).toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);
    const consumed = await consumeWelcomeAudioLiveHostPendingCapabilityOnce(binding);
    expect(consumed).toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.VALID);
    expect(JSON.stringify(consumed)).toBe('"valid_host_pending_capability_consumed"');
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce(binding))
      .toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);

    const finalized = await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: true,
      send_control_actuation_count: 1,
      attempted_at_ms: NOW_MS + 112,
      finalized_at_ms: NOW_MS + 113,
    });
    expect(finalized.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
  });

  test.each([
    ["store inode", (evidence: Record<string, any>) => {
      evidence.store_identity.ino += 1;
    }],
    ["pending path", (evidence: Record<string, any>) => {
      evidence.pending_path = `${evidence.pending_path}.forged`;
    }],
    ["pending digest", (evidence: Record<string, any>) => {
      evidence.pending_digest = "f".repeat(64);
    }],
    ["pending inode", (evidence: Record<string, any>) => {
      evidence.pending_metadata.ino += 1;
    }],
    ["pending metadata", (evidence: Record<string, any>) => {
      evidence.pending_metadata.size += 1;
    }],
    ["pending binding field", (evidence: Record<string, any>) => {
      evidence.pending_snapshot.operation_id = "forged_operation";
    }],
    ["attempt nonce", (evidence: Record<string, any>) => {
      evidence.pending_snapshot.attempt_nonce = "f".repeat(64);
    }],
  ])("burns the host capability fail-closed on wrong %s without consuming actuation", async (
    _label,
    mutate,
  ) => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const armed = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    const evidence = await independentlyReadPendingEvidence(fixture);
    const forgedEvidence = structuredClone(evidence) as Record<string, any>;
    mutate(forgedEvidence);
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce({
      ...hostPendingBinding(
        fixture,
        1,
        armed.private_host_pending_capability,
        evidence,
      ),
      independently_read_pending_evidence: forgedEvidence,
    })).toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce(hostPendingBinding(
      fixture,
      1,
      armed.private_host_pending_capability,
      evidence,
    ))).toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);

    const finalized = await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      attempted_at_ms: NOW_MS + 112,
      finalized_at_ms: NOW_MS + 113,
    });
    expect(finalized.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
  });

  test("burns host attestation on a wrong independently prepared permit binding", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const armed = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    const evidence = await independentlyReadPendingEvidence(fixture);
    const binding = hostPendingBinding(
      fixture,
      1,
      armed.private_host_pending_capability,
      evidence,
    );
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce({
      ...binding,
      expected_audio_sha256: "f".repeat(64),
    })).toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);
    expect(await consumeWelcomeAudioLiveHostPendingCapabilityOnce(binding))
      .toBe(WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.INVALID);
  });

  test("rejects impossible terminal evidence where send actuation precedes upload", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const armed = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    const impossible = await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: false,
      send_control_actuation_count: 1,
      attempted_at_ms: NOW_MS + 112,
      finalized_at_ms: NOW_MS + 113,
    });
    expect(impossible.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_FINALIZATION_UNKNOWN],
    });
    expect((await readdir(fixture.storeRoot)).some((name) => name.startsWith("terminal-")))
      .toBe(false);
    const coherent = await finalizeWelcomeAudioLiveAttemptAsUnknown({
      private_actuation_capability: armed.private_actuation_capability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: false,
      send_control_actuation_count: 0,
      attempted_at_ms: NOW_MS + 114,
      finalized_at_ms: NOW_MS + 115,
    });
    expect(coherent.redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN);
  });

  test("cancels an expired reservation at zero effect before PENDING and permits a fresh claim", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const expired = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 100 + 5 * 60 * 1000,
    });
    expect(expired.redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
    ]);
    expect(expired.redacted_receipt.claim_capability_consumed).toBe(true);
    expect((await readdir(fixture.storeRoot)).filter(
      (name) => name.startsWith("reservation-cancel-"),
    )).toHaveLength(1);
    const freshNow = NOW_MS + 100 + 5 * 60 * 1000 + 1;
    await refreshOperationContext(fixture, 1, freshNow);
    expect((await issue(fixture, 1, {
      now_ms: freshNow,
    })).redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED);
  });

  test("revalidates the exact authority-issued audio immediately before PENDING", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    await writeFile(fixture.assetPath, Buffer.from("drifted audio", "utf8"), { mode: 0o600 });
    const blocked = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    expect(blocked.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
      pending_record_present: false,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID],
    });
    expect((await readdir(fixture.storeRoot)).some((name) => name.startsWith("pending-")))
      .toBe(false);
    expect(blocked.redacted_receipt.claim_capability_consumed).toBe(true);
    expect((await readdir(fixture.storeRoot)).filter(
      (name) => name.startsWith("reservation-cancel-"),
    )).toHaveLength(1);
    expect((await cancelWelcomeAudioLiveReservationZeroEffect({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      cancelled_at_ms: NOW_MS + 112,
    })).redacted_receipt.decision).toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.BLOCKED);
  });

  test("revalidates the full authority after reservation and auto-cancels before PENDING", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    const approvalPath = join(fixture.authorityRoot, "execution-approval-v1.json");
    await writeFile(approvalPath, Buffer.concat([
      await readFile(approvalPath),
      Buffer.from(" ", "utf8"),
    ]), { mode: 0o600 });
    const blocked = await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    expect(blocked.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.BLOCKED,
      pending_record_present: false,
      claim_capability_consumed: true,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID],
    });
    expect((await readdir(fixture.storeRoot)).filter(
      (name) => name.startsWith("reservation-cancel-"),
    )).toHaveLength(1);
    expect((await readdir(fixture.storeRoot)).some((name) => name.startsWith("pending-")))
      .toBe(false);
  });

  test("recovers a dead-owner PENDING only to UNKNOWN with null effect facts", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    const pendingName = (await readdir(fixture.storeRoot))
      .find((name) => name.startsWith("pending-") && name.endsWith(".json"));
    expect(pendingName).toBeTruthy();
    const pendingPath = join(fixture.storeRoot, pendingName!);
    const pending = JSON.parse(await readFile(pendingPath, "utf8"));
    pending.owner_pid = 2_147_483_647;
    await writeFile(pendingPath, `${JSON.stringify(pending)}\n`, { mode: 0o600 });
    const recovered = await recoverWelcomeAudioLivePendingAttemptAfterOwnerExit({
      private_store_capability: fixture.storeCapability,
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY,
      mission_id: fixture.missionId,
      contract_version: CONTRACT_VERSION,
      mission_contract_sha256: MISSION_CONTRACT_SHA,
      identity_anchor_sha256: fixture.manifest.ordered_records[0].identity_anchor_sha256,
      manifest_ordinal: 1,
      now_ms: NOW_MS + 120,
    });
    expect(recovered.redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_ATTEMPT_DECISION.FINALIZED_UNKNOWN,
      terminal_record_present: true,
      attachment_upload_entered: null,
      send_control_actuation_count: null,
      retry_disposition: "terminal_no_retry",
    });
    const terminalName = (await readdir(fixture.storeRoot))
      .find((name) => name.startsWith("terminal-") && name.endsWith(".json"));
    const terminal = JSON.parse(await readFile(join(fixture.storeRoot, terminalName!), "utf8"));
    expect(terminal).toMatchObject({
      outcome: WELCOME_AUDIO_LIVE_ATTEMPT_OUTCOME.UNKNOWN,
      attachment_upload_entered: null,
      send_control_actuation_count: null,
    });
  });

  test("dedupes an exact identity globally once PENDING is durable", async () => {
    const first = await setup({ count: 1, missionId: "synthetic_global_dedupe_a" });
    const second = await setup({
      count: 1,
      missionId: "synthetic_global_dedupe_b",
      exactTargets: [first.exactTargets[0]],
      shared: first,
    });
    await inspection(first, 1);
    await inspection(second, 1);
    const firstClaim = await issue(first, 1);
    await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(first, 1, firstClaim.private_claim_capability),
      entered_at_ms: NOW_MS + 111,
    });
    expect((await issue(second, 1)).redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_CLAIM_DECISION.DUPLICATE,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.DUPLICATE_IDENTITY],
    });
  });

  test("serializes concurrent callers to one exact reservation", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const results = await Promise.all(Array.from({ length: 8 }, () => issue(fixture, 1)));
    expect(results.filter((result) =>
      result.redacted_receipt.decision === WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED))
      .toHaveLength(1);
    expect((await readdir(fixture.storeRoot)).filter((name) => name.startsWith("claim-")))
      .toHaveLength(1);
  });

  test("recovers a post-link dead-owner lock while a stale hardlink remains", async () => {
    const recoveredFixture = await setup({ count: 2 });
    const lockPath = join(recoveredFixture.storeRoot, "mutex-global-ledger.lock");
    const ownerTemporary = join(
      recoveredFixture.storeRoot,
      `.mutex-owner-${process.pid}-${"d".repeat(64)}.json`,
    );
    await writeFile(ownerTemporary, `${JSON.stringify({
      owner_pid: 2_147_483_647,
      owner_nonce: "d".repeat(64),
    })}\n`, { mode: 0o600 });
    await link(ownerTemporary, lockPath);
    expect((await lstat(lockPath)).ino).toBe((await lstat(ownerTemporary)).ino);
    expect((await inspection(recoveredFixture, 1)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_RECORDED);
    await expect(lstat(lockPath)).rejects.toThrow();
    expect((await lstat(ownerTemporary)).isFile()).toBe(true);
    expect((await inspection(recoveredFixture, 2)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_RECORDED);
  });

  test("ignores nonblocking crash temporaries when no fixed lock was published", async () => {
    const orphanFixture = await setup({ count: 1 });
    await writeFile(
      join(orphanFixture.storeRoot, `.mutex-owner-${process.pid}-${"e".repeat(64)}.json`),
      `${JSON.stringify({ owner_pid: 2_147_483_647, owner_nonce: "e".repeat(64) })}\n`,
      { mode: 0o600 },
    );
    await writeFile(
      join(orphanFixture.storeRoot, `.mutex-recovery-${process.pid}-${"f".repeat(64)}.json`),
      `${JSON.stringify({ owner_pid: 2_147_483_647, owner_nonce: "f".repeat(64) })}\n`,
      { mode: 0o600 },
    );
    expect((await inspection(orphanFixture, 1)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_STATE_DECISION.INSPECTION_RECORDED);
  });

  test("does not recover or mutate a fixed lock whose owner is still live", async () => {
    const fixture = await setup({ count: 1 });
    const lockPath = join(fixture.storeRoot, "mutex-global-ledger.lock");
    const owner = `${JSON.stringify({
      owner_pid: process.pid,
      owner_nonce: "a".repeat(64),
    })}\n`;
    await writeFile(lockPath, owner, { mode: 0o600 });
    const before = await lstat(lockPath);
    expect((await inspection(fixture, 1)).redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION],
    });
    const after = await lstat(lockPath);
    expect(after.ino).toBe(before.ino);
    expect(after.nlink).toBe(before.nlink);
    expect(await readFile(lockPath, "utf8")).toBe(owner);
  });

  test("retains a corrupt fixed lock fail-closed because atomic publication cannot create it", async () => {
    const fixture = await setup({ count: 1 });
    const lockPath = join(fixture.storeRoot, "mutex-global-ledger.lock");
    await writeFile(lockPath, "{}\n", { mode: 0o600 });
    expect((await inspection(fixture, 1)).redacted_receipt).toMatchObject({
      decision: WELCOME_AUDIO_LIVE_STATE_DECISION.UNKNOWN_TERMINAL,
      blocker_codes: [WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.SERIALIZATION_COLLISION],
    });
    expect((await lstat(lockPath)).isFile()).toBe(true);
  });

  test("reconciles only a verified linked publication temporary and retains ambiguity", async () => {
    const fixture = await setup({ count: 2 });
    await inspection(fixture, 1);
    await inspection(fixture, 2);
    await issue(fixture, 1);
    const claimName = (await readdir(fixture.storeRoot)).find((name) => name.startsWith("claim-"));
    const linkedTemporary = join(fixture.storeRoot, `.claim-${process.pid}-verified.json`);
    await link(join(fixture.storeRoot, claimName!), linkedTemporary);
    expect((await issue(fixture, 2)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.CREATED);
    await expect(lstat(linkedTemporary)).rejects.toThrow();

    const ambiguous = await setup({ count: 1 });
    await inspection(ambiguous, 1);
    const ambiguousPath = join(ambiguous.storeRoot, `.claim-${process.pid}-ambiguous.json`);
    await writeFile(ambiguousPath, "{}\n", { mode: 0o600 });
    expect((await issue(ambiguous, 1)).redacted_receipt.decision)
      .toBe(WELCOME_AUDIO_LIVE_CLAIM_DECISION.UNKNOWN_TERMINAL);
    expect((await lstat(ambiguousPath)).isFile()).toBe(true);
  });

  test("keeps store modes separate and all durable records owner-only", async () => {
    const fixture = await setup({ count: 1 });
    await inspection(fixture, 1);
    const claimed = await issue(fixture, 1);
    expect((await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      required_store_mode: WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY,
      entered_at_ms: NOW_MS + 111,
    })).redacted_receipt.blocker_codes).toEqual([
      WELCOME_AUDIO_LIVE_CLAIM_BLOCKER.ATTEMPT_BOUNDARY_INVALID,
    ]);
    await enterWelcomeAudioLiveAttemptBoundary({
      ...claimBinding(fixture, 1, claimed.private_claim_capability),
      entered_at_ms: NOW_MS + 112,
    });
    for (const name of (await readdir(fixture.storeRoot)).filter((entry) => entry.endsWith(".json"))) {
      const metadata = await lstat(join(fixture.storeRoot, name));
      expect(metadata.isFile()).toBe(true);
      expect(metadata.isSymbolicLink()).toBe(false);
      expect(metadata.nlink).toBe(1);
      expect(metadata.mode & 0o7777).toBe(0o600);
    }
  });

  test("contains no browser, network, campaign, MailerLite, or send implementation", async () => {
    const source = await readFile(resolve(
      "scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs",
    ), "utf8");
    expect(source).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/);
    expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/);
    expect(source).not.toMatch(/(?:playwright|puppeteer|webdriver|selenium|instagram\.com|mailerlite)/i);
    expect(WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY)
      .toBe("synthetic_temp_test_only");
  });
});
