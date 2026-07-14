import { describe, expect, test } from "vitest";

import {
  REDACTED_RECEIPT_FIELDS,
  WELCOME_AUDIO_ADAPTER_VERSION,
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
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
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  buildWelcomeAudioRedactedReceipt,
  classifyRecentFollowerBucket,
  validateWelcomeAudioOperation,
  validateWelcomeAudioRedactedReceipt,
} from "../scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs";

const NOW_MS = Date.parse("2026-07-14T16:00:00.000Z");
const SOURCE_SHA = "1".repeat(64);
const PROFILE_SHA = "2".repeat(64);
const CANDIDATE_SHA = "3".repeat(64);
const THREAD_SHA = "4".repeat(64);
const OWNER_SHA = "5".repeat(64);
const ASSET_SHA = "6".repeat(64);
const OPERATION_ID = "welcome_audio_operation_001";
const APPROVAL_PACKET_ID = "welcome_audio_approval_001";
const ASSET_ID = "welcome_audio_asset_001";
const MISSION_ID = "crm_core_welcome_audio_mission_001";
const CLAIM_OWNER_ID = "claim_owner_current_001";
const CLAIM_TOKEN_ID = "claim_token_current_001";
const SOURCE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const preclaimOperation = () => ({
  adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
  contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  operation: {
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    source_event_anchor_sha256: SOURCE_SHA,
    profile_anchor_sha256: PROFILE_SHA,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    owner_anchor_sha256: OWNER_SHA,
    expected_send_count: 1,
  },
  approval: {
    status: "approved_exact_single_send",
    checked_at: "2026-07-14T15:56:00.000Z",
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    source_event_anchor_sha256: SOURCE_SHA,
    profile_anchor_sha256: PROFILE_SHA,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: ASSET_ID,
    approved_audio_asset_sha256: ASSET_SHA,
    source_recency_max_age_ms: SOURCE_MAX_AGE_MS,
    expected_send_count: 1,
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
  },
  eligibility: {
    business_eligibility: "eligible_confirmed_recent_follower",
    audio_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
    composer_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
    attachment_capability: WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE,
    text_fallback: "forbidden",
  },
  asset: {
    approved_audio_asset_id: ASSET_ID,
    approved_audio_asset_sha256: ASSET_SHA,
    asset_preview_binding: WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT,
    preview_status: "verified_on_exact_bound_thread",
    preview_audio_asset_id: ASSET_ID,
    preview_audio_asset_sha256: ASSET_SHA,
    preview_thread_anchor_sha256: THREAD_SHA,
  },
  context: {
    status: "fresh_exact_central_mission_context",
    checked_at: "2026-07-14T15:57:00.000Z",
    central_repo_head: "a".repeat(40),
    expected_central_repo_head: "a".repeat(40),
    mission_id: MISSION_ID,
    expected_mission_id: MISSION_ID,
    mission_status: "active",
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
  },
  execution: {
    attempt_budget: 1,
    send_attempt_count: 0,
    attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED,
    send_claim: WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED,
    retry_disposition: WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
    retry_requested: false,
    claim_owner_id: null,
    claim_token_id: null,
    claim_registry_revision: null,
    attempted_at: null,
  },
  confirmation: {
    confirmation_marker: WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
    operation_id: null,
    candidate_anchor_sha256: null,
    thread_anchor_sha256: null,
    approved_audio_asset_sha256: null,
    bound_to_current_operation: false,
    checked_at: null,
  },
});

const sendReadyOperation = () => {
  const input = preclaimOperation();
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
    operation_id: OPERATION_ID,
    approval_packet_id: APPROVAL_PACKET_ID,
    mission_id: MISSION_ID,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    owner_anchor_sha256: OWNER_SHA,
    approved_audio_asset_id: ASSET_ID,
    approved_audio_asset_sha256: ASSET_SHA,
  };
  input.execution = {
    ...input.execution,
    attempt_state: WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED,
    claim_owner_id: CLAIM_OWNER_ID,
    claim_token_id: CLAIM_TOKEN_ID,
    claim_registry_revision: 1,
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
    attempted_at: "2026-07-14T15:59:30.000Z",
  };
  input.confirmation = {
    confirmation_marker: marker,
    operation_id: OPERATION_ID,
    candidate_anchor_sha256: CANDIDATE_SHA,
    thread_anchor_sha256: THREAD_SHA,
    approved_audio_asset_sha256: ASSET_SHA,
    bound_to_current_operation: true,
    checked_at: "2026-07-14T15:59:31.000Z",
  };
  return input;
};

describe("Instagram welcome-audio operation guard", () => {
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

  test("classifies a malformed missing packet as blocked, not as an attempted operation", () => {
    const result = validateWelcomeAudioOperation({}, { nowMs: NOW_MS });
    expect(result).toMatchObject({
      terminal: false,
      claim_allowed: false,
      send_allowed: false,
      decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
    });
  });

  test("does not infer a durable attempt from claim enums alone", () => {
    const result = validateWelcomeAudioOperation({
      effect_claim: {
        claim_result: WELCOME_AUDIO_CLAIM_RESULT.STALE,
        claim_token_status: WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED,
      },
    }, { nowMs: NOW_MS });
    expect(result.terminal).toBe(false);
    expect(result.decision).toBe(WELCOME_AUDIO_GUARD_DECISION.BLOCKED);
  });

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
      operation_id: null,
      candidate_anchor_sha256: null,
      thread_anchor_sha256: null,
      approved_audio_asset_sha256: null,
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
      expect(result.blockers).toContain(WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING);
    },
  );

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
      CLAIM_OWNER_ID,
      CLAIM_TOKEN_ID,
    ]) expect(serialized).not.toContain(privateValue);
  });

  test("sanitizes arbitrary input instead of copying it into a receipt", () => {
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
    expect(validateWelcomeAudioRedactedReceipt(receipt).ok).toBe(true);
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

  test("compares a valid receipt structurally, independent of key order", () => {
    const input = sendReadyOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const reordered = Object.fromEntries(Object.entries(receipt).reverse());
    expect(validateWelcomeAudioRedactedReceipt(reordered).ok).toBe(true);
    const result = validateWelcomeAudioOperation({ ...input, receipt: reordered }, { nowMs: NOW_MS });
    expect(result.send_ready).toBe(true);
    expect(result.send_allowed).toBe(false);
    expect(result.one_shot_consumer_required).toBe(true);
  });

  test("keeps receipt failure fail-closed without reopening terminal state", () => {
    const input = confirmedOperation();
    const receipt = buildWelcomeAudioRedactedReceipt(input, { nowMs: NOW_MS });
    const result = validateWelcomeAudioOperation(
      { ...input, receipt: { ...receipt, decision: "made_up" } },
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
      { ...input, receipt: { ...receipt, decision: "made_up" } },
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
});
