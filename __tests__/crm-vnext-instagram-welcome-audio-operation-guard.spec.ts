import { describe, expect, test } from "vitest";

import {
  REDACTED_RECEIPT_FIELDS,
  WELCOME_AUDIO_ADAPTER_VERSION,
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
  WELCOME_AUDIO_GUARD_REASON,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_CLASS,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_BUSINESS_ELIGIBILITY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
  buildWelcomeAudioCanonicalOperationDigest,
  buildWelcomeAudioRedactedReceipt as buildWelcomeAudioRedactedReceiptRaw,
  classifyRecentFollowerBucket,
  validateWelcomeAudioOperation as validateWelcomeAudioOperationRaw,
  validateWelcomeAudioRedactedReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";

const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const SOURCE_SHA = "1".repeat(64);
const PROFILE_SHA = "2".repeat(64);
const CANDIDATE_SHA = "3".repeat(64);
const THREAD_SHA = "4".repeat(64);
const OWNER_SHA = "5".repeat(64);
const ASSET_SHA = "6".repeat(64);
const MANIFEST_SHA = "7".repeat(64);
const CAMPAIGN_INTERVAL_SHA = "8".repeat(64);
const OPERATION_ID = "welcome_audio_operation_001";
const APPROVAL_PACKET_ID = "welcome_audio_approval_001";
const ASSET_ID = "welcome_audio_asset_001";
const MISSION_ID = "crm_core_welcome_audio_mission_001";
const CLAIM_OWNER_ID = "claim_owner_current_001";
const CLAIM_TOKEN_ID = "claim_token_current_001";
const ATTEMPT_ID = "send_attempt_current_001";
const SOURCE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const UI_ATTESTED_SOURCE_MAX_AGE_MS = 5 * 60 * 1000;
const TRUSTED_CANONICAL_OPERATION_DIGESTS = new WeakMap<object, string>();

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

const trustedValidationOptions = (
  input: Record<string, any>,
  options: Record<string, any> = {},
) => ({
  expectedCanonicalOperationSha256:
    TRUSTED_CANONICAL_OPERATION_DIGESTS.get(input) ?? null,
  ...options,
});

const validateWelcomeAudioOperation = (
  input: Record<string, any>,
  options: Record<string, any> = {},
) => validateWelcomeAudioOperationRaw(input, trustedValidationOptions(input, options));

const buildWelcomeAudioRedactedReceipt = (
  input: Record<string, any>,
  options: Record<string, any> = {},
) => buildWelcomeAudioRedactedReceiptRaw(input, trustedValidationOptions(input, options));

const withReceipt = (input: Record<string, any>, receipt: Record<string, any>) => {
  const attached = { ...input, receipt };
  const trustedDigest = TRUSTED_CANONICAL_OPERATION_DIGESTS.get(input);
  if (trustedDigest) TRUSTED_CANONICAL_OPERATION_DIGESTS.set(attached, trustedDigest);
  return attached;
};

const preclaimOperation = () => {
  const input = {
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
  };
  const boundInput = bindCanonicalOperationDigest(input);
  TRUSTED_CANONICAL_OPERATION_DIGESTS.set(
    boundInput,
    boundInput.canonical_operation_sha256,
  );
  return boundInput;
};

const sendReadyOperation = (input = preclaimOperation()) => {
  input.effect_claim = {
    status: WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT,
    claim_result: WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION,
    claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION,
    atomic: true,
    permanent: true,
    claimed_at: "2026-07-14T15:59:00.000Z",
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    registry_revision: 1,
    attempt_id: ATTEMPT_ID,
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    mission_id: MISSION_ID,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: ASSET_ID,
    approved_audio_asset_sha256: ASSET_SHA,
    canonical_operation_sha256: input.canonical_operation_sha256,
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

const confirmedOperation = (
  marker = WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
) => {
  const input = sendReadyOperation();
  input.effect_claim.claim_token_status = WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED;
  input.execution = {
    ...input.execution,
    send_attempt_count: 1,
    attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL,
    send_claim: WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT,
    retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
    claim_token_consumed_at: "2026-07-14T15:59:20.000Z",
    attempted_at: "2026-07-14T15:59:30.000Z",
  };
  input.confirmation = {
    confirmation_marker: marker,
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    mission_id: MISSION_ID,
    canonical_operation_sha256: input.canonical_operation_sha256,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    approved_audio_asset_sha256: ASSET_SHA,
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    claim_registry_revision: 1,
    attempt_id: ATTEMPT_ID,
    bound_to_current_operation: true,
    checked_at: "2026-07-14T15:59:31.000Z",
  };
  return input;
};

const sealedBacklogPreclaimOperation = () => {
  const input = preclaimOperation();
  input.follower_evidence = {
    ...input.follower_evidence,
    source_recency: WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG,
    observed_at: "2026-07-10T15:58:05.000Z",
    time_bucket: "sealed_campaign_interval",
  };
  input.binding = {
    ...input.binding,
    source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG,
  };
  input.eligibility = {
    ...input.eligibility,
    business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER,
  };
  input.asset = {
    ...input.asset,
    asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE,
    preview_status: "approved_file_validated_before_upload",
  };
  input.source_provenance = {
    source_class: WELCOME_AUDIO_SOURCE_CLASS.SEALED_PAUSED_CAMPAIGN_BACKLOG_MEMBER,
    manifest_digest_sha256: MANIFEST_SHA,
    campaign_interval_digest_sha256: CAMPAIGN_INTERVAL_SHA,
    manifest_record_index: 0,
    manifest_record_count: 8,
    source_event_anchor_sha256: SOURCE_SHA,
  };
  const boundInput = bindCanonicalOperationDigest(input);
  TRUSTED_CANONICAL_OPERATION_DIGESTS.set(
    boundInput,
    boundInput.canonical_operation_sha256,
  );
  return boundInput;
};

const UI_ATTESTED_SOURCE_EVIDENCE_SHA = "9".repeat(64);

const rebindUiAttestedCanonicalDigest = (input: Record<string, any>) => {
  const boundInput = bindCanonicalOperationDigest(input);
  TRUSTED_CANONICAL_OPERATION_DIGESTS.set(
    boundInput,
    boundInput.canonical_operation_sha256,
  );
  return boundInput;
};

const uiAttestedPreclaimOperation = () => {
  const input = preclaimOperation();
  const { source_event_anchor_sha256: _operationSourceEvent, ...legacyOperation } =
    input.operation;
  const {
    source_event_anchor_sha256: _approvalSourceEvent,
    source_recency_max_age_ms: _approvalSourceAge,
    ...legacyApproval
  } = input.approval;
  const { source_event_anchor_sha256: _bindingSourceEvent, ...legacyBinding } =
    input.binding;
  input.adapter_version = WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;
  input.contract_version = WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION;
  input.operation = {
    ...legacyOperation,
    source_evidence_anchor_sha256: SOURCE_SHA,
  };
  input.approval = {
    ...legacyApproval,
    source_evidence_anchor_sha256: SOURCE_SHA,
    source_evidence_freshness_max_age_ms: UI_ATTESTED_SOURCE_MAX_AGE_MS,
  };
  input.follower_evidence = {
    source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
    evidence_observed_at: "2026-07-14T15:58:05.000Z",
    time_bucket_attestation: "explicit_visible_not_exact_timestamp",
    source_evidence_freshness_max_age_ms: UI_ATTESTED_SOURCE_MAX_AGE_MS,
    source_evidence_anchor_sha256: SOURCE_SHA,
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  };
  input.binding = {
    ...legacyBinding,
    source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
    source_evidence_anchor_sha256: SOURCE_SHA,
  };
  input.eligibility = {
    ...input.eligibility,
    business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER,
  };
  input.asset = {
    ...input.asset,
    asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE,
    preview_status: "approved_file_validated_before_upload",
  };
  input.source_provenance = {
    source_class: WELCOME_AUDIO_SOURCE_CLASS.UI_ATTESTED_FOLLOWER_SOURCE_V1,
    source_evidence_schema_version:
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
    source_evidence_sha256: UI_ATTESTED_SOURCE_EVIDENCE_SHA,
    source_evidence_anchor_sha256: SOURCE_SHA,
    source_record_ordinal: 1,
    source_record_cap: 8,
    time_bucket_attestation: "explicit_visible_not_exact_timestamp",
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  };
  return rebindUiAttestedCanonicalDigest(input);
};

describe("Instagram welcome-audio operation guard", () => {
  test("admits ui-attested follower evidence only at PRECLAIM without event id, exact follow timestamp, or campaign", () => {
    const input = uiAttestedPreclaimOperation();
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });

    expect(result).toMatchObject({
      ok: true,
      state_valid: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.PRECLAIM,
      decision: WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
      claim_allowed: true,
      send_allowed: false,
      terminal: false,
      blockers: [],
    });
    expect(receipt).toMatchObject({
      receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION,
      guard_contract_version: WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
      adapter_version: WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER,
      claim_allowed: true,
      send_allowed: false,
    });
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
    const serialized = JSON.stringify(input);
    expect(serialized).not.toContain("followed_at");
    expect(serialized).not.toContain('"provider_event_id":');
    expect(serialized).not.toContain("manifest_digest");
    expect(serialized).not.toContain("campaign_interval");
  });

  test("admits bounded recent-event relationship evidence only for UI-attested PRECLAIM", () => {
    const uiAttested = uiAttestedPreclaimOperation();
    uiAttested.binding.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
      .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
    rebindUiAttestedCanonicalDigest(uiAttested);
    const uiResult = validateWelcomeAudioOperation(uiAttested, { nowMs: NOW_MS });
    expect(uiResult).toMatchObject({
      ok: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.PRECLAIM,
      decision: WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
      claim_allowed: true,
      send_allowed: false,
      blockers: [],
    });

    const legacy = preclaimOperation();
    legacy.binding.follows_owner = WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
      .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION;
    const legacyResult = validateWelcomeAudioOperation(legacy, { nowMs: NOW_MS });
    expect(legacyResult.ok).toBe(false);
    expect(legacyResult.claim_allowed).toBe(false);
    expect(legacyResult.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.FOLLOWS_OWNER);
  });

  test.each([
    ["source bucket", (input: any) => { input.follower_evidence.time_bucket_attestation = "inferred"; }],
    ["stale evidence", (input: any) => { input.follower_evidence.evidence_observed_at = "2026-07-14T10:00:00.000Z"; }],
    ["future evidence by one millisecond", (input: any) => {
      input.follower_evidence.evidence_observed_at = new Date(NOW_MS + 1).toISOString();
    }],
    ["source binding", (input: any) => { input.binding.source_to_profile = "ambiguous"; }],
    ["follows owner", (input: any) => { input.binding.follows_owner = "unknown"; }],
    ["thread binding", (input: any) => { input.binding.thread_anchor_sha256 = "a".repeat(64); }],
    ["dedupe", (input: any) => { input.dedupe.status = "unknown"; }],
    ["source schema", (input: any) => { input.source_provenance.source_evidence_schema_version = "synthetic_other_schema_v1"; }],
    ["source freshness window", (input: any) => {
      input.approval.source_evidence_freshness_max_age_ms = 10 * 60 * 1000;
      input.follower_evidence.source_evidence_freshness_max_age_ms = 10 * 60 * 1000;
    }],
    ["exact follow timestamp claim", (input: any) => { input.source_provenance.exact_follow_timestamp_claimed = true; }],
    ["provider id claim", (input: any) => { input.source_provenance.provider_event_id_claimed = true; }],
    ["campaign claim", (input: any) => { input.source_provenance.campaign_membership_claimed = true; }],
  ])("fails closed for ui-attested %s drift", (_label, mutate) => {
    const input = uiAttestedPreclaimOperation();
    mutate(input);
    rebindUiAttestedCanonicalDigest(input);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    expect(result.claim_allowed).toBe(false);
    expect(result.send_allowed).toBe(false);
  });

  test("preserves the legacy recent-source future clock tolerance", () => {
    const input = preclaimOperation();
    input.follower_evidence.observed_at = new Date(NOW_MS + 1).toISOString();
    bindCanonicalOperationDigest(input);
    TRUSTED_CANONICAL_OPERATION_DIGESTS.set(input, input.canonical_operation_sha256);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.PRECLAIM,
      claim_allowed: true,
      send_allowed: false,
    });
  });

  test("seals ui-attested provenance into the versioned digest and never promotes it beyond PRECLAIM", () => {
    const input = uiAttestedPreclaimOperation();
    const baseline = input.canonical_operation_sha256;
    input.source_provenance.source_record_ordinal = 2;
    expect(buildWelcomeAudioCanonicalOperationDigest(input)).not.toBe(baseline);

    const postclaim = sendReadyOperation(uiAttestedPreclaimOperation());
    const result = validateWelcomeAudioOperation(postclaim, { nowMs: NOW_MS });
    expect(result.send_ready).toBe(false);
    expect(result.send_allowed).toBe(false);
    expect(result.decision).not.toBe(WELCOME_AUDIO_GUARD_DECISION.READY);
  });

  test("rejects cross-class adapter and provenance replay", () => {
    const uiAsLegacy = uiAttestedPreclaimOperation();
    uiAsLegacy.adapter_version = WELCOME_AUDIO_ADAPTER_VERSION;
    uiAsLegacy.contract_version = WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION;
    rebindUiAttestedCanonicalDigest(uiAsLegacy);
    expect(validateWelcomeAudioOperation(uiAsLegacy, { nowMs: NOW_MS }).ok).toBe(false);

    const sealedAsUi = sealedBacklogPreclaimOperation();
    sealedAsUi.source_provenance.source_class =
      WELCOME_AUDIO_SOURCE_CLASS.UI_ATTESTED_FOLLOWER_SOURCE_V1;
    bindCanonicalOperationDigest(sealedAsUi);
    TRUSTED_CANONICAL_OPERATION_DIGESTS.set(
      sealedAsUi,
      sealedAsUi.canonical_operation_sha256,
    );
    expect(validateWelcomeAudioOperation(sealedAsUi, { nowMs: NOW_MS }).ok).toBe(false);
  });

  test("admits an over-24-hour follower bound to the sealed paused-campaign backlog", () => {
    const input = sealedBacklogPreclaimOperation();
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });

    expect(result).toMatchObject({
      ok: true,
      state_valid: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.PRECLAIM,
      decision: WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
      claim_allowed: true,
      send_allowed: false,
      blockers: [],
    });
    expect(receipt).toMatchObject({
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG,
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG,
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER,
    });
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
  });

  test("seals manifest, interval, ordinal, and source anchor into the canonical digest", () => {
    const baseline = sealedBacklogPreclaimOperation();
    const mutations: Array<(input: Record<string, any>) => void> = [
      (input) => { input.source_provenance.manifest_digest_sha256 = "9".repeat(64); },
      (input) => { input.source_provenance.campaign_interval_digest_sha256 = "a".repeat(64); },
      (input) => { input.source_provenance.manifest_record_index = 1; },
      (input) => { input.source_provenance.manifest_record_count = 7; },
      (input) => { input.source_provenance.source_event_anchor_sha256 = "b".repeat(64); },
    ];

    for (const mutate of mutations) {
      const changed = structuredClone(baseline);
      mutate(changed);
      expect(buildWelcomeAudioCanonicalOperationDigest(changed))
        .not.toBe(baseline.canonical_operation_sha256);
    }
  });

  test("rejects pre-upload asset evidence for the legacy recent-follower route", () => {
    const input = preclaimOperation();
    input.asset.asset_preview_binding = WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE;
    input.asset.preview_status = "approved_file_validated_before_upload";
    bindCanonicalOperationDigest(input);
    TRUSTED_CANONICAL_OPERATION_DIGESTS.set(input, input.canonical_operation_sha256);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({ ok: false, claim_allowed: false, send_allowed: false });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW);
  });

  test("does not treat sealed pre-upload evidence as a post-claim send-ready state", () => {
    const ready = sendReadyOperation(sealedBacklogPreclaimOperation());
    const result = validateWelcomeAudioOperation(ready, { nowMs: NOW_MS });
    expect(result).toMatchObject({ ok: false, send_ready: false, send_allowed: false });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW);
  });

  test.each([
    ["missing provenance", (input: Record<string, any>) => { delete input.source_provenance; }, WELCOME_AUDIO_GUARD_REASON.SOURCE_PROVENANCE],
    ["over-cap manifest", (input: Record<string, any>) => { input.source_provenance.manifest_record_count = 9; }, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_POSITION],
    ["out-of-range ordinal", (input: Record<string, any>) => { input.source_provenance.manifest_record_index = 8; }, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_POSITION],
    ["mismatched source anchor", (input: Record<string, any>) => { input.source_provenance.source_event_anchor_sha256 = "c".repeat(64); }, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_BINDING],
  ])("rejects sealed backlog with %s", (_label, mutate, reason) => {
    const input = sealedBacklogPreclaimOperation();
    mutate(input);
    bindCanonicalOperationDigest(input);
    TRUSTED_CANONICAL_OPERATION_DIGESTS.set(input, input.canonical_operation_sha256);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({ ok: false, claim_allowed: false, send_allowed: false });
    expect(result.blockers).toContain(reason);
  });

  test("separates preclaim eligibility from send authority", () => {
    const result = validateWelcomeAudioOperation(preclaimOperation(), { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: true,
      state_valid: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.PRECLAIM,
      decision: WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM,
      claim_allowed: true,
      send_ready: false,
      send_allowed: false,
      terminal: false,
      blockers: [],
    });
  });

  test("allows one send only after a fresh current-invocation atomic claim", () => {
    const result = validateWelcomeAudioOperation(sendReadyOperation(), { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: true,
      state_valid: true,
      phase: WELCOME_AUDIO_GUARD_PHASE.SEND_READY,
      decision: WELCOME_AUDIO_GUARD_DECISION.READY,
      claim_allowed: false,
      send_ready: true,
      send_allowed: false,
      one_shot_consumer_required: true,
      terminal: false,
      blockers: [],
    });
  });

  test("treats repeated pure validation as readiness-only, never as send authority", () => {
    const input = sendReadyOperation();
    const first = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    const second = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(first.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.READY);
    expect(second.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.READY);
    expect(first.send_ready).toBe(true);
    expect(second.send_ready).toBe(true);
    expect(first.send_allowed).toBe(false);
    expect(second.send_allowed).toBe(false);
    expect(first.one_shot_consumer_required).toBe(true);
    expect(second.one_shot_consumer_required).toBe(true);
  });

  test("keeps the canonical snapshot digest stable across legitimate lifecycle transitions", () => {
    const preclaim = preclaimOperation();
    const sendReady = sendReadyOperation();
    const confirmed = confirmedOperation();
    const digest = preclaim.canonical_operation_sha256;

    expect(WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS).toBe(300_000);
    expect(buildWelcomeAudioCanonicalOperationDigest(preclaim)).toBe(digest);
    expect(buildWelcomeAudioCanonicalOperationDigest(sendReady)).toBe(digest);
    expect(buildWelcomeAudioCanonicalOperationDigest(confirmed)).toBe(digest);
    expect(sendReady.canonical_operation_sha256).toBe(digest);
    expect(confirmed.canonical_operation_sha256).toBe(digest);
  });

  test("classifies a malformed missing packet as blocked, not as an attempted operation", () => {
    const result = validateWelcomeAudioOperation({}, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: false,
      claim_allowed: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE);
  });

  test("rejects extra root fields instead of accepting a packet superset", () => {
    const input = preclaimOperation() as Record<string, unknown>;
    input.unexpected_root_field = "must_not_be_ignored";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      state_valid: false,
      terminal: false,
      claim_allowed: false,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE);
  });

  test.each([
    "operation",
    "approval",
    "execution_surface",
    "follower_evidence",
    "binding",
    "eligibility",
    "asset",
    "context",
    "dedupe",
    "effect_claim",
    "execution",
    "confirmation",
  ])("rejects extra fields in the %s section", (section) => {
    const input = preclaimOperation();
    const sections = input as unknown as Record<string, Record<string, unknown>>;
    sections[section].unexpected_nested_field = "must_not_be_ignored";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      state_valid: false,
      terminal: false,
      claim_allowed: false,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE);
  });

  test.each(["operation", "approval", "context"])(
    "requires the exact confirmation_max_delay_ms field in %s",
    (section) => {
      const input = preclaimOperation();
      const sections = input as unknown as Record<string, Record<string, unknown>>;
      delete sections[section].confirmation_max_delay_ms;
      const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
      expect(result).toMatchObject({
        ok: false,
        terminal: false,
        send_allowed: false,
        decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
      });
      expect(result.blockers).toEqual(expect.arrayContaining([
        WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE,
        WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_MAX_DELAY,
      ]));
    },
  );

  test("rejects a coherently rebound confirmation delay that is not the fixed contract value", () => {
    const input = preclaimOperation();
    input.operation.confirmation_max_delay_ms = 600_000;
    input.approval.confirmation_max_delay_ms = 600_000;
    input.context.confirmation_max_delay_ms = 600_000;
    bindCanonicalOperationDigest(input);

    const result = validateWelcomeAudioOperationRaw(input, {
      nowMs: NOW_MS,
      expectedCanonicalOperationSha256: input.canonical_operation_sha256,
    });
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_MAX_DELAY);
  });

  test.each([
    "attempt_budget",
    "send_attempt_count",
    "attempt_state",
    "send_claim",
    "retry_disposition",
    "retry_requested",
    "operation_id",
    "approval_packet_id",
    "mission_id",
    "canonical_operation_sha256",
    "claim_owner_id",
    "claim_token_id",
    "claim_registry_revision",
    "attempt_id",
    "claim_token_consumed_at",
    "attempted_at",
  ])("rejects a packet missing execution.%s", (field) => {
    const input = preclaimOperation();
    delete (input.execution as unknown as Record<string, unknown>)[field];
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      state_valid: false,
      terminal: false,
      claim_allowed: false,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE);
  });

  test("rejects reuse of an otherwise consistent approval in another mission", () => {
    const input = preclaimOperation();
    const substitutedMissionId = "crm_core_welcome_audio_mission_002";
    input.operation.mission_id = substitutedMissionId;
    input.context.mission_id = substitutedMissionId;
    input.context.expected_mission_id = substitutedMissionId;
    input.dedupe.mission_id = substitutedMissionId;
    input.effect_claim.mission_id = substitutedMissionId;
    input.execution.mission_id = substitutedMissionId;
    input.confirmation.mission_id = substitutedMissionId;
    bindCanonicalOperationDigest(input);

    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      claim_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.APPROVAL);
  });

  test("rejects approval-packet substitution even when every plain identifier agrees", () => {
    const input = preclaimOperation();
    const substitutedPacketId = "welcome_audio_approval_substituted_002";
    for (const section of [
      "operation",
      "approval",
      "context",
      "dedupe",
      "effect_claim",
      "execution",
      "confirmation",
    ]) {
      const sections = input as unknown as Record<string, Record<string, unknown>>;
      sections[section].approval_packet_id = substitutedPacketId;
    }

    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      claim_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);
  });

  test("rejects a coherently recomputed mission and approval against the trusted prior digest", () => {
    const input = preclaimOperation();
    const trustedDigest = input.canonical_operation_sha256;
    const substitutedMissionId = "crm_core_welcome_audio_mission_002";
    const substitutedPacketId = "welcome_audio_approval_substituted_002";
    const sections = input as unknown as Record<string, Record<string, unknown>>;

    for (const section of [
      "operation",
      "approval",
      "context",
      "dedupe",
      "effect_claim",
      "execution",
      "confirmation",
    ]) {
      sections[section].approval_packet_id = substitutedPacketId;
      sections[section].mission_id = substitutedMissionId;
    }
    input.context.expected_mission_id = substitutedMissionId;
    bindCanonicalOperationDigest(input);
    expect(input.canonical_operation_sha256).not.toBe(trustedDigest);

    const options = {
      nowMs: NOW_MS,
      expectedCanonicalOperationSha256: trustedDigest,
    };
    const result = validateWelcomeAudioOperation(input, options);
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      claim_allowed: false,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);

    const receipt = buildWelcomeAudioRedactedReceipt(input, options);
    expect(receipt.blocker_codes).toContain(WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
  });

  test.each([
    ["omitted", undefined],
    ["null", null],
    ["malformed", "not-a-sha256"],
  ])("fails closed when the trusted external canonical digest is %s", (_label, digest) => {
    const input = preclaimOperation();
    const options = digest === undefined
      ? { nowMs: NOW_MS }
      : { nowMs: NOW_MS, expectedCanonicalOperationSha256: digest };

    const result = validateWelcomeAudioOperationRaw(input, options);
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      claim_allowed: false,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);

    const receipt = buildWelcomeAudioRedactedReceiptRaw(input, options);
    expect(receipt.blocker_codes).toContain(WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
  });

  test("does not infer a durable attempt or a valid source receipt from claim enums alone", () => {
    const input = {
      effect_claim: {
        claim_result: WELCOME_AUDIO_CLAIM_RESULT.STALE,
        claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED,
      },
    };
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.terminal).toBe(false);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.BLOCKED);

    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    expect(receipt).toMatchObject({
      phase: WELCOME_AUDIO_GUARD_PHASE.BLOCKED,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
      effect_claim: WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED,
      claim_result: WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED,
      claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED,
      attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED,
      send_claim: WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
    });
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT,
    });
  });

  test.each([
    ["attempted_at only", "execution", "attempted_at", "2026-07-14T15:59:30.000Z", true],
    [
      "claim_token_consumed_at only",
      "execution",
      "claim_token_consumed_at",
      "2026-07-14T15:59:20.000Z",
      true,
    ],
    ["send_attempt_count above budget", "execution", "send_attempt_count", 2, true],
    ["claimed_at only", "effect_claim", "claimed_at", "2026-07-14T15:59:00.000Z", true],
    ["atomic claim flag only", "effect_claim", "atomic", true, true],
    ["claim owner only", "effect_claim", "claim_owner_id", CLAIM_OWNER_ID, true],
    ["claim token only", "effect_claim", "claim_token_id", CLAIM_TOKEN_ID, true],
    ["claim registry revision only", "effect_claim", "registry_revision", 1, true],
    ["claim attempt ID only", "effect_claim", "attempt_id", ATTEMPT_ID, true],
    [
      "non-neutral token status only",
      "effect_claim",
      "claim_token_status",
      WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION,
      false,
    ],
    [
      "non-neutral claim result only",
      "effect_claim",
      "claim_result",
      WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION,
      false,
    ],
    [
      "strong confirmation only",
      "confirmation",
      "confirmation_marker",
      WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
      false,
    ],
    [
      "terminal retry disposition only",
      "execution",
      "retry_disposition",
      WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      true,
    ],
  ])(
    "makes an exact-shape packet with %s unknown-terminal",
    (_label, section, field, value, requiresTerminalEvidence) => {
      const input = preclaimOperation();
      const sections = input as unknown as Record<string, Record<string, unknown>>;
      sections[section][field] = value;

      const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
      expect(result).toMatchObject({
        ok: false,
        phase: WELCOME_AUDIO_GUARD_PHASE.TERMINAL,
        claim_allowed: false,
        send_ready: false,
        send_allowed: false,
        terminal: true,
        decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      });
      expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY);
      expect(result.blockers.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE))
        .toBe(requiresTerminalEvidence);

      const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
      expect(receipt.blocker_codes).toContain(WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY);
      expect(receipt.blocker_codes.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE))
        .toBe(requiresTerminalEvidence);
      expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
    },
  );

  test("makes any post-claim precondition failure terminal rather than reopenable", () => {
    const input = sendReadyOperation();
    input.binding.profile_anchor_sha256 = "7".repeat(64);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.terminal).toBe(true);
    expect(result.send_allowed).toBe(false);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL);
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.BINDING_MISMATCH,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test.each([
    ["approval", "approval", "checked_at", "2026-07-14T15:55:59.000Z"],
    ["execution surface", "execution_surface", "observed_at", "2026-07-14T15:58:09.000Z"],
    ["follower evidence", "follower_evidence", "observed_at", "2026-07-14T13:59:59.000Z"],
    ["binding", "binding", "observed_at", "2026-07-14T15:58:19.000Z"],
    ["eligibility", "eligibility", "observed_at", "2026-07-14T15:58:29.000Z"],
    ["asset preview", "asset", "preview_observed_at", "2026-07-14T15:58:39.000Z"],
    ["mission context", "context", "checked_at", "2026-07-14T15:56:59.000Z"],
    ["dedupe", "dedupe", "checked_at", "2026-07-14T15:57:59.000Z"],
  ])(
    "terminalizes post-claim mutation of the trusted %s snapshot",
    (_label, section, field, value) => {
      const input = sendReadyOperation();
      const trustedDigest = input.canonical_operation_sha256;
      const sections = input as unknown as Record<string, Record<string, unknown>>;
      sections[section][field] = value;

      expect(buildWelcomeAudioCanonicalOperationDigest(input)).not.toBe(trustedDigest);
      bindCanonicalOperationDigest(input);
      expect(input.canonical_operation_sha256).not.toBe(trustedDigest);
      const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
      expect(result).toMatchObject({
        ok: false,
        terminal: true,
        send_ready: false,
        send_allowed: false,
        decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      });
      expect(result.blockers).toEqual(expect.arrayContaining([
        WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ]));
    },
  );

  test.each([
    ["effect-claim asset binding", "effect_claim", "approved_audio_asset_id", "alternate_audio_asset_002"],
    ["execution mission binding", "execution", "mission_id", "alternate_welcome_audio_mission_002"],
    ["confirmation candidate binding", "confirmation", "candidate_anchor_sha256", "7".repeat(64)],
    ["attempt budget", "execution", "attempt_budget", 2],
    ["no-retry-request restriction", "execution", "retry_requested", true],
  ])(
    "terminalizes post-claim mutation of immutable %s",
    (_label, section, field, value) => {
      const input = sendReadyOperation();
      const trustedDigest = input.canonical_operation_sha256;
      const sections = input as unknown as Record<string, Record<string, unknown>>;
      sections[section][field] = value;

      expect(buildWelcomeAudioCanonicalOperationDigest(input)).not.toBe(trustedDigest);
      bindCanonicalOperationDigest(input);
      expect(input.canonical_operation_sha256).not.toBe(trustedDigest);
      const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
      expect(result).toMatchObject({
        terminal: true,
        send_ready: false,
        send_allowed: false,
        decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      });
      expect(result.blockers).toEqual(expect.arrayContaining([
        WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ]));
    },
  );

  test.each([
    [WELCOME_AUDIO_CLAIM_RESULT.PREEXISTING_OR_REPLAYED, WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION],
    [WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION, WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED],
    [WELCOME_AUDIO_CLAIM_RESULT.STALE, WELCOME_AUDIO_CLAIM_TOKEN_STATUS.STALE],
  ])("makes a preexisting, consumed, or stale committed claim terminal", (claimResult, tokenStatus) => {
    const input = sendReadyOperation();
    input.effect_claim.claim_result = claimResult;
    input.effect_claim.claim_token_status = tokenStatus;
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test.each([
    ["not-started claim result", "claim_result", WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED],
    ["stale claim result", "claim_result", WELCOME_AUDIO_CLAIM_RESULT.STALE],
    ["mismatched claim result", "claim_result", WELCOME_AUDIO_CLAIM_RESULT.MISMATCH],
    ["not-issued token", "claim_token_status", WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED],
    ["stale token", "claim_token_status", WELCOME_AUDIO_CLAIM_TOKEN_STATUS.STALE],
    ["mismatched token", "claim_token_status", WELCOME_AUDIO_CLAIM_TOKEN_STATUS.MISMATCH],
  ])("makes the isolated non-current outcome %s terminal", (_label, field, value) => {
    const input = sendReadyOperation();
    Object.assign(input.effect_claim, { [field]: value });
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("makes a crash after durable commit terminal for a later invocation", () => {
    const input = sendReadyOperation();
    input.effect_claim.claim_result = WELCOME_AUDIO_CLAIM_RESULT.PREEXISTING_OR_REPLAYED;
    input.execution.claim_owner_id = "later_process_owner_002";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.terminal).toBe(true);
    expect(result.send_allowed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_OWNER,
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
    ]));
  });

  test.each([
    ["owner", "claim_owner_id", "mismatched_claim_owner_002"],
    ["token", "claim_token_id", "mismatched_claim_token_002"],
    ["registry revision", "claim_registry_revision", 2],
  ])("makes an execution/claim %s mismatch terminal", (_label, field, value) => {
    const input = sendReadyOperation();
    Object.assign(input.execution, { [field]: value });
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_OWNER,
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("makes an execution/claim attempt mismatch terminal", () => {
    const input = sendReadyOperation();
    input.execution.attempt_id = "mismatched_send_attempt_002";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.EXECUTION_BINDING,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test.each([
    ["owner", "claim_owner_id", "mismatched_claim_owner_002"],
    ["token", "claim_token_id", "mismatched_claim_token_002"],
    ["registry revision", "claim_registry_revision", 2],
  ])("rejects a terminal confirmation with a mismatched claim %s", (_label, field, value) => {
    const input = confirmedOperation();
    Object.assign(input.confirmation, { [field]: value });
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("rejects confirmation evidence bound to another attempt", () => {
    const input = confirmedOperation();
    input.confirmation.attempt_id = "mismatched_send_attempt_002";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test.each([
    WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
    WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
    WELCOME_AUDIO_CONFIRMATION_MARKER.SENT_MARKER_WITHOUT_NEW_AUDIO_BUBBLE,
  ])("accepts strong current-operation marker %s only as terminal no-retry", (marker) => {
    const result = validateWelcomeAudioOperation(confirmedOperation(marker), { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      state_valid: true,
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL,
    });
    expect(result.blockers).toEqual([WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY]);
  });

  test("makes attempted but unconfirmed terminal and permanently non-retryable", () => {
    const input = confirmedOperation(WELCOME_AUDIO_CONFIRMATION_MARKER.NONE);
    input.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
    input.confirmation = {
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      operation_id: OPERATION_ID,
      approval_packet_id: APPROVAL_PACKET_ID,
      mission_id: MISSION_ID,
      canonical_operation_sha256: input.canonical_operation_sha256,
      candidate_anchor_sha256: CANDIDATE_SHA,
      thread_anchor_sha256: THREAD_SHA,
      approved_audio_asset_sha256: ASSET_SHA,
      claim_owner_id: CLAIM_OWNER_ID,
      claim_token_id: CLAIM_TOKEN_ID,
      claim_registry_revision: 1,
      attempt_id: ATTEMPT_ID,
      bound_to_current_operation: false,
      checked_at: "2026-07-14T15:59:31.000Z",
    };
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      state_valid: true,
      terminal: true,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual([
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]);
  });

  test("preserves terminal decision when pre-send freshness later expires", () => {
    const input = confirmedOperation();
    const later = NOW_MS + 24 * 60 * 60 * 1000;
    const result = validateWelcomeAudioOperation(input, { nowMs: later });
    expect(result.terminal).toBe(true);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL);
    expect(result.send_allowed).toBe(false);
    expect(result.state_valid).toBe(false);
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CONTEXT_FRESHNESS);
  });

  test("rejects confirmation when the recorded attempt predates the durable claim", () => {
    const input = confirmedOperation();
    input.execution.attempted_at = "2026-07-14T15:58:59.000Z";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.terminal).toBe(true);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL);
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE);
  });

  test.each([
    ["missing", null],
    ["before the claim", "2026-07-14T15:58:59.000Z"],
    ["after the attempt", "2026-07-14T15:59:31.000Z"],
  ])("rejects a %s consumed-token timestamp", (_label, consumedAt) => {
    const input = confirmedOperation();
    input.execution.claim_token_consumed_at = consumedAt;
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.CLAIM_TOKEN_CONSUMPTION,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("rejects a consumption timestamp while the token is still unconsumed", () => {
    const input = sendReadyOperation();
    input.execution.claim_token_consumed_at = "2026-07-14T15:59:10.000Z";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.CLAIM_TOKEN_CONSUMPTION,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("binds the complete source-profile-candidate-thread-owner chain", () => {
    const input = preclaimOperation();
    input.binding.profile_anchor_sha256 = "7".repeat(64);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.claim_allowed).toBe(false);
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.BINDING_MISMATCH);
  });

  test.each(["thread", "asset", "historical"])(
    "rejects %s confirmation evidence while remaining terminal",
    (kind) => {
      const input = confirmedOperation();
      if (kind === "thread") input.confirmation.thread_anchor_sha256 = "7".repeat(64);
      if (kind === "asset") input.confirmation.approved_audio_asset_sha256 = "8".repeat(64);
      if (kind === "historical") input.confirmation.checked_at = "2026-07-14T15:59:00.000Z";
      const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
      expect(result.terminal).toBe(true);
      expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL);
      expect(result.send_allowed).toBe(false);
      expect(result.blockers).toContain(
        kind === "historical"
          ? WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_TIMESTAMP
          : WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING,
      );
    },
  );

  test("accepts a strong confirmation exactly at the immutable maximum-delay boundary", () => {
    const input = confirmedOperation();
    input.confirmation.checked_at = "2026-07-14T16:04:30.000Z";
    const result = validateWelcomeAudioOperation(input, {
      nowMs: Date.parse(input.confirmation.checked_at),
    });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL,
    });
    expect(result.blockers).not.toContain(
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_DELAY_EXCEEDED,
    );
  });

  test("makes a strong confirmation beyond the immutable maximum delay unknown-terminal", () => {
    const input = confirmedOperation();
    input.confirmation.checked_at = "2026-07-14T16:04:30.001Z";
    const options = { nowMs: Date.parse(input.confirmation.checked_at) };
    const result = validateWelcomeAudioOperation(input, options);
    expect(result).toMatchObject({
      ok: false,
      terminal: true,
      send_ready: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_DELAY_EXCEEDED,
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));

    const receipt = buildWelcomeAudioRedactedReceipt(input, options);
    expect(receipt.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL);
    expect(receipt.blocker_codes).toContain(
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_DELAY_EXCEEDED,
    );
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
  });

  test("enforces mission-bound absolute source age plus Bogota calendar bucket", () => {
    expect(classifyRecentFollowerBucket("2026-07-14T04:59:00.000Z", NOW_MS)).toBe("previous_calendar_day");
    expect(classifyRecentFollowerBucket("2026-07-14T05:00:00.000Z", NOW_MS)).toBe("today");

    const input = preclaimOperation();
    input.approval.source_recency_max_age_ms = 60 * 60 * 1000;
    input.follower_evidence.source_recency_max_age_ms = 60 * 60 * 1000;
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE);
  });

  test.each([
    ["surface", "execution_surface", "observed_at", WELCOME_AUDIO_GUARD_REASON.SURFACE_OBSERVATION],
    ["binding", "binding", "observed_at", WELCOME_AUDIO_GUARD_REASON.BINDING_OBSERVATION],
    ["eligibility", "eligibility", "observed_at", WELCOME_AUDIO_GUARD_REASON.ELIGIBILITY_OBSERVATION],
    ["asset preview", "asset", "preview_observed_at", WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW_OBSERVATION],
  ])("rejects stale %s dynamic evidence", (_label, section, field, reason) => {
    const input = preclaimOperation();
    const sections = input as unknown as Record<string, Record<string, unknown>>;
    sections[section][field] = "2026-07-14T15:54:00.000Z";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      ok: false,
      terminal: false,
      claim_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(result.blockers).toContain(reason);
  });

  test.each([
    ["approval", "approval", "checked_at"],
    ["surface", "execution_surface", "observed_at"],
    ["recent follower", "follower_evidence", "observed_at"],
    ["binding", "binding", "observed_at"],
    ["eligibility", "eligibility", "observed_at"],
    ["asset preview", "asset", "preview_observed_at"],
    ["mission context", "context", "checked_at"],
    ["dedupe", "dedupe", "checked_at"],
  ])("rejects a durable claim earlier than the %s observation", (_label, section, field) => {
    const input = sendReadyOperation();
    const sections = input as unknown as Record<string, Record<string, unknown>>;
    sections[section][field] = "2026-07-14T15:59:01.000Z";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: true,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
    });
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE);
  });

  test.each([
    ["Chrome", { browser: "chrome", chrome_upload_attempted: true }, WELCOME_AUDIO_GUARD_REASON.BROWSER],
    ["in-app", { in_app_browser_upload_attempted: true }, WELCOME_AUDIO_GUARD_REASON.IN_APP_UPLOAD],
    ["private Safari", { browser_mode: "private", private_browsing: true }, WELCOME_AUDIO_GUARD_REASON.SAFARI_MODE],
  ])("rejects %s upload surface", (_label, patch, reason) => {
    const input = preclaimOperation();
    Object.assign(input.execution_surface, patch);
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.claim_allowed).toBe(false);
    expect(result.blockers).toContain(reason);
  });

  test("keeps business eligibility separate from audio capability and forbids text fallback", () => {
    const input = preclaimOperation();
    input.eligibility.audio_capability = WELCOME_AUDIO_AUDIO_CAPABILITY.MISSING;
    input.eligibility.attachment_capability = WELCOME_AUDIO_AUDIO_CAPABILITY.DISABLED;
    input.eligibility.text_fallback = "requested";
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.AUDIO_CAPABILITY,
      WELCOME_AUDIO_GUARD_REASON.ATTACHMENT_CAPABILITY,
      WELCOME_AUDIO_GUARD_REASON.TEXT_FALLBACK,
    ]));
    expect(result.blockers).not.toContain(WELCOME_AUDIO_GUARD_REASON.BUSINESS_ELIGIBILITY);
  });

  test("requires exact asset preview, fresh context, final dedupe, and no retry request", () => {
    const input = preclaimOperation();
    input.asset.preview_audio_asset_sha256 = "7".repeat(64);
    input.context.checked_at = "2026-07-14T15:00:00.000Z";
    input.dedupe.send_history_status = "unknown";
    input.execution.retry_requested = true;
    const result = validateWelcomeAudioOperation(input, { nowMs: NOW_MS });
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.PREVIEW_BINDING,
      WELCOME_AUDIO_GUARD_REASON.CONTEXT_FRESHNESS,
      WELCOME_AUDIO_GUARD_REASON.HISTORY_STATUS,
      WELCOME_AUDIO_GUARD_REASON.RETRY_REQUESTED,
    ]));
  });

  test("builds an exact allowlist receipt without private anchors or identifiers", () => {
    const input = sendReadyOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const serialized = JSON.stringify(receipt);
    expect(Object.keys(receipt)).toEqual(REDACTED_RECEIPT_FIELDS);
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({ ok: true, reason: null });
    for (const privateValue of [
      SOURCE_SHA,
      PROFILE_SHA,
      CANDIDATE_SHA,
      THREAD_SHA,
      OWNER_SHA,
      ASSET_SHA,
      OPERATION_ID,
      APPROVAL_PACKET_ID,
      ASSET_ID,
      MISSION_ID,
      CLAIM_OWNER_ID,
      CLAIM_TOKEN_ID,
      ATTEMPT_ID,
      input.canonical_operation_sha256,
    ]) expect(serialized).not.toContain(privateValue);
  });

  test("sanitizes arbitrary input and keeps an unbound source triplet invalid", () => {
    const input = preclaimOperation();
    input.execution_surface.surface = "private-looking-handle";
    input.binding.source_binding = "private-looking-id";
    input.operation.expected_send_count = 987654321;
    input.execution.attempt_budget = 987654321;
    input.execution.send_attempt_count = 987654321;
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    expect(receipt.surface).toBe(WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL);
    expect(receipt.source_binding).toBe(WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL);
    expect(receipt.expected_send_count).toBeNull();
    expect(receipt.attempt_budget).toBeNull();
    expect(receipt.send_attempt_count).toBeNull();
    expect(JSON.stringify(receipt)).not.toContain("private-looking");
    expect(JSON.stringify(receipt)).not.toContain("987654321");
    expect(validateWelcomeAudioRedactedReceipt(receipt)).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT,
    });
  });

  test("rejects missing keys and tampered receipt enums", () => {
    const receipt = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const { phase: _phase, ...missingKey } = receipt;
    expect(validateWelcomeAudioRedactedReceipt(missingKey).ok).toBe(false);
    expect(validateWelcomeAudioRedactedReceipt({ ...receipt, decision: "made_up" })).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT,
    });
  });

  test.each([
    ["phase/decision", { decision: WELCOME_AUDIO_GUARD_DECISION.READY }],
    ["claim/readiness", { send_ready: true }],
    ["readiness/consumer", { one_shot_consumer_required: true }],
    ["send authority", { send_allowed: true }],
    ["phase/terminality", { terminal: true }],
    ["phase/effect claim", { effect_claim: WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT }],
    ["phase/attempt state", { attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED }],
    ["success/blockers", { blocker_codes: [WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY] }],
  ])("rejects a structurally valid receipt with contradictory %s fields", (_label, patch) => {
    const receipt = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({ ...receipt, ...patch });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test("rejects coordinated terminal decision tampering into a non-terminal phase", () => {
    const receipt = buildWelcomeAudioRedactedReceipt(confirmedOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      phase: WELCOME_AUDIO_GUARD_PHASE.SEND_READY,
      terminal: false,
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test.each([
    WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
    WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
    WELCOME_AUDIO_GUARD_REASON.EXECUTION_BINDING,
    WELCOME_AUDIO_GUARD_REASON.CLAIM_TOKEN_CONSUMPTION,
    WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING,
    WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_DELAY_EXCEEDED,
    WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE,
  ])("rejects a confirmed receipt with incompatible blocker %s", (blocker) => {
    const receipt = buildWelcomeAudioRedactedReceipt(confirmedOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      blocker_codes: [...receipt.blocker_codes, blocker],
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test("rejects a forged unknown-terminal receipt with a neutral public tuple", () => {
    const receipt = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      phase: WELCOME_AUDIO_GUARD_PHASE.TERMINAL,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      claim_allowed: false,
      terminal: true,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [
        WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ],
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test("does not treat derived retry policy as standalone terminal evidence", () => {
    const receipt = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      phase: WELCOME_AUDIO_GUARD_PHASE.TERMINAL,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      claim_allowed: false,
      terminal: true,
      retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT,
      blocker_codes: [
        WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ],
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test("rejects TERMINAL_EVIDENCE when the receipt already has a public terminal signal", () => {
    const receipt = buildWelcomeAudioRedactedReceipt(confirmedOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      decision: WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      send_claim: WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED,
      confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      blocker_codes: [
        WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ],
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test.each([
    ["permanent effect claim", { effect_claim: WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT }],
    ["current claim result", { claim_result: WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION }],
    ["consumed claim token", { claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED }],
    ["committed attempt", { attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED }],
    ["positive attempt count", { send_attempt_count: 1 }],
    ["attempted send claim", { send_claim: WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED }],
    [
      "strong confirmation",
      { confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER },
    ],
    ["terminal retry disposition", { retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT }],
  ])("rejects a blocked receipt carrying terminal signal %s", (_label, patch) => {
    const receipt = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const result = validateWelcomeAudioRedactedReceipt({
      ...receipt,
      ...patch,
      phase: WELCOME_AUDIO_GUARD_PHASE.BLOCKED,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
      claim_allowed: false,
      blocker_codes: [WELCOME_AUDIO_GUARD_REASON.ATTEMPT_STATE],
    });
    expect(result).toEqual({
      ok: false,
      reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS,
    });
  });

  test("compares a valid receipt structurally, independent of key order", () => {
    const input = sendReadyOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const reordered = Object.fromEntries(Object.entries(receipt).reverse());
    expect(validateWelcomeAudioRedactedReceipt(reordered).ok).toBe(true);
    const result = validateWelcomeAudioOperation(withReceipt(input, reordered), { nowMs: NOW_MS });
    expect(result.send_ready).toBe(true);
    expect(result.send_allowed).toBe(false);
    expect(result.one_shot_consumer_required).toBe(true);
  });

  test("keeps receipt failure fail-closed without reopening terminal state", () => {
    const input = confirmedOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const result = validateWelcomeAudioOperation(
      withReceipt(input, { ...receipt, decision: "made_up" }),
      { nowMs: NOW_MS },
    );
    expect(result.terminal).toBe(true);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL);
    expect(result.send_allowed).toBe(false);
    expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT);
  });

  test("makes a tampered receipt after claim terminal instead of merely blocked", () => {
    const input = sendReadyOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const result = validateWelcomeAudioOperation(
      withReceipt(input, { ...receipt, decision: "made_up" }),
      { nowMs: NOW_MS },
    );
    expect(result.terminal).toBe(true);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL);
    expect(result.send_allowed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT,
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ]));
  });

  test("binds legacy and UI-attested receipt versions to only their permitted source triplets", () => {
    const legacy = buildWelcomeAudioRedactedReceipt(preclaimOperation(), { nowMs: NOW_MS });
    const legacyReady = buildWelcomeAudioRedactedReceipt(
      sendReadyOperation(),
      { nowMs: NOW_MS },
    );
    const attemptedOperation = confirmedOperation(WELCOME_AUDIO_CONFIRMATION_MARKER.NONE);
    attemptedOperation.execution.send_claim = WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED;
    attemptedOperation.confirmation.bound_to_current_operation = false;
    const legacyAttempted = buildWelcomeAudioRedactedReceipt(
      attemptedOperation,
      { nowMs: NOW_MS },
    );
    const legacyTerminal = buildWelcomeAudioRedactedReceipt(
      confirmedOperation(),
      { nowMs: NOW_MS },
    );
    const uiAttested = buildWelcomeAudioRedactedReceipt(
      uiAttestedPreclaimOperation(),
      { nowMs: NOW_MS },
    );
    const asUiAttestedVersion = (receipt: Record<string, any>) => ({
      ...receipt,
      receipt_schema_version: uiAttested.receipt_schema_version,
      guard_contract_version: uiAttested.guard_contract_version,
      adapter_version: uiAttested.adapter_version,
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER,
    });
    const withInvalidSourceTriplet = (receipt: Record<string, any>) => ({
      ...receipt,
      source_recency: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
      source_binding: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
      business_eligibility: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
    });

    expect(validateWelcomeAudioRedactedReceipt({
      ...legacy,
      receipt_schema_version: uiAttested.receipt_schema_version,
      guard_contract_version: uiAttested.guard_contract_version,
      adapter_version: uiAttested.adapter_version,
    }).ok).toBe(false);
    expect(validateWelcomeAudioRedactedReceipt({
      ...uiAttested,
      receipt_schema_version: legacy.receipt_schema_version,
      guard_contract_version: legacy.guard_contract_version,
      adapter_version: legacy.adapter_version,
    }).ok).toBe(false);
    expect(validateWelcomeAudioRedactedReceipt({
      ...legacy,
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED,
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER,
    }).ok).toBe(false);
    expect(validateWelcomeAudioRedactedReceipt({
      ...uiAttested,
      source_recency: WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT,
      source_binding: WELCOME_AUDIO_SOURCE_BINDING.EXACT,
      business_eligibility: WELCOME_AUDIO_BUSINESS_ELIGIBILITY.RECENT_FOLLOWER,
    }).ok).toBe(false);

    const receiptsAcrossVersionFamiliesAndStates = [
      ["legacy preclaim", legacy],
      ["legacy ready", legacyReady],
      ["legacy attempted", legacyAttempted],
      ["legacy terminal", legacyTerminal],
      ["UI-attested preclaim", uiAttested],
      ["UI-attested attempted", asUiAttestedVersion(legacyAttempted)],
      ["UI-attested terminal", asUiAttestedVersion(legacyTerminal)],
    ];
    for (const [label, receipt] of receiptsAcrossVersionFamiliesAndStates) {
      expect(validateWelcomeAudioRedactedReceipt(receipt).ok, label).toBe(true);
      expect(
        validateWelcomeAudioRedactedReceipt(withInvalidSourceTriplet(receipt)).ok,
        `${label} with invalid source triplet`,
      )
        .toBe(false);
    }

    const uiAttestedReadyShape = asUiAttestedVersion(legacyReady);
    expect(validateWelcomeAudioRedactedReceipt(uiAttestedReadyShape).ok).toBe(false);
    expect(validateWelcomeAudioRedactedReceipt(
      withInvalidSourceTriplet(uiAttestedReadyShape),
    ).ok).toBe(false);
  });

  test("fails closed without executing hostile operation proxies, getters, functions, or options", () => {
    let trapCount = 0;
    const hostile = new Proxy({}, {
      get() {
        trapCount += 1;
        throw new Error("hostile get trap executed");
      },
      ownKeys() {
        trapCount += 1;
        throw new Error("hostile ownKeys trap executed");
      },
      getOwnPropertyDescriptor() {
        trapCount += 1;
        throw new Error("hostile descriptor trap executed");
      },
      getPrototypeOf() {
        trapCount += 1;
        throw new Error("hostile prototype trap executed");
      },
    });

    expect(buildWelcomeAudioCanonicalOperationDigest(hostile)).toBeNull();
    expect(validateWelcomeAudioOperationRaw(hostile, { nowMs: NOW_MS })).toMatchObject({
      ok: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
      blockers: [WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE],
    });
    expect(buildWelcomeAudioRedactedReceiptRaw(hostile, { nowMs: NOW_MS })).toMatchObject({
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
      send_allowed: false,
    });

    const nestedProxy = preclaimOperation();
    nestedProxy.binding = hostile;
    expect(validateWelcomeAudioOperationRaw(nestedProxy, { nowMs: NOW_MS })).toMatchObject({
      ok: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });

    let getterCount = 0;
    const accessorInput = preclaimOperation();
    Object.defineProperty(accessorInput, "binding", {
      enumerable: true,
      configurable: true,
      get() {
        getterCount += 1;
        throw new Error("hostile getter executed");
      },
    });
    expect(validateWelcomeAudioOperationRaw(accessorInput, { nowMs: NOW_MS })).toMatchObject({
      ok: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });

    let functionExecutionCount = 0;
    const functionInput = preclaimOperation();
    functionInput.binding = (() => {
      functionExecutionCount += 1;
    }) as any;
    expect(validateWelcomeAudioOperationRaw(functionInput, { nowMs: NOW_MS })).toMatchObject({
      ok: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(validateWelcomeAudioOperationRaw(preclaimOperation(), hostile as any)).toMatchObject({
      ok: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
    expect(trapCount).toBe(0);
    expect(getterCount).toBe(0);
    expect(functionExecutionCount).toBe(0);
  });

  test("fails closed without executing hostile receipt proxies, accessors, or blocker arrays", () => {
    const validReceipt = buildWelcomeAudioRedactedReceipt(
      preclaimOperation(),
      { nowMs: NOW_MS },
    );
    let trapCount = 0;
    const hostileHandler = {
      get() {
        trapCount += 1;
        throw new Error("hostile receipt get trap executed");
      },
      ownKeys() {
        trapCount += 1;
        throw new Error("hostile receipt ownKeys trap executed");
      },
      getOwnPropertyDescriptor() {
        trapCount += 1;
        throw new Error("hostile receipt descriptor trap executed");
      },
      getPrototypeOf() {
        trapCount += 1;
        throw new Error("hostile receipt prototype trap executed");
      },
    };
    const hostileReceipt = new Proxy(validReceipt, hostileHandler);
    expect(validateWelcomeAudioRedactedReceipt(hostileReceipt).ok).toBe(false);

    let getterCount = 0;
    const accessorReceipt = { ...validReceipt };
    Object.defineProperty(accessorReceipt, "decision", {
      enumerable: true,
      configurable: true,
      get() {
        getterCount += 1;
        throw new Error("hostile receipt getter executed");
      },
    });
    expect(validateWelcomeAudioRedactedReceipt(accessorReceipt).ok).toBe(false);

    const hostileBlockers = new Proxy([], hostileHandler);
    expect(validateWelcomeAudioRedactedReceipt({
      ...validReceipt,
      blocker_codes: hostileBlockers,
    }).ok).toBe(false);
    expect(trapCount).toBe(0);
    expect(getterCount).toBe(0);
  });
});
