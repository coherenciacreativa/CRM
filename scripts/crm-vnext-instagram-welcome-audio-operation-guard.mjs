/**
 * Pure, local, fail-closed validator for one Instagram welcome-audio operation.
 *
 * This module never opens a browser, reads or writes a claim registry, performs
 * network I/O, or sends a message. The caller owns the durable owner-only CAS
 * claim writer. The guard distinguishes pre-claim eligibility from a fresh
 * current-invocation post-claim snapshot; it never pretends that validation
 * persisted or consumed the claim. A READY result is readiness-only and keeps
 * send_allowed=false. A separately integrated one-shot executor must consume
 * the token atomically before the UI effect. Revalidating the same immutable
 * snapshot is never a second send authorization.
 */

const WELCOME_AUDIO_ADAPTER_VERSION = 'instagram_welcome_audio_safari_action_adapter_v1';
const WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_v1';
const WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_redacted_receipt_v1';
const WELCOME_AUDIO_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS = 60 * 1000;
const WELCOME_AUDIO_ATTEMPT_BUDGET = 1;
const WELCOME_AUDIO_TIME_ZONE = 'America/Bogota';
const WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL = 'invalid_or_unknown';

const WELCOME_AUDIO_SURFACE = Object.freeze({
  STATUS: 'safari_instagram_web_dm',
  DETAIL: 'safari_standard_isolated_native_picker',
  BROWSER: 'safari',
  MODE: 'standard',
  ISOLATION: 'isolated',
  UPLOAD_ROUTE: 'native_file_picker',
});

const WELCOME_AUDIO_SOURCE_RECENCY = Object.freeze({
  EXACT_RECENT: 'exact_recent',
  STALE: 'stale',
  UNKNOWN: 'unknown',
});

const WELCOME_AUDIO_SOURCE_BINDING = Object.freeze({
  EXACT: 'exact_recent_source_bound',
  MISMATCH: 'mismatch',
  AMBIGUOUS: 'ambiguous',
  MISSING: 'missing',
});

const WELCOME_AUDIO_AUDIO_CAPABILITY = Object.freeze({
  PRESENT_AND_USABLE: 'present_and_usable',
  MISSING: 'missing',
  DISABLED: 'disabled',
  AMBIGUOUS: 'ambiguous',
});

const WELCOME_AUDIO_ASSET_PREVIEW_BINDING = Object.freeze({
  EXACT: 'exact_asset_and_preview_match',
  ASSET_MISMATCH: 'asset_mismatch',
  PREVIEW_MISMATCH: 'preview_mismatch',
  PREVIEW_UNAVAILABLE: 'preview_unavailable',
});

const WELCOME_AUDIO_ATTEMPT_STATE = Object.freeze({
  NOT_ATTEMPTED: 'not_attempted',
  ATTEMPT_COMMITTED: 'attempt_committed',
  ATTEMPTED_TERMINAL: 'attempted_terminal',
});

const WELCOME_AUDIO_EFFECT_CLAIM = Object.freeze({
  UNCLAIMED: 'unclaimed',
  PERMANENTLY_CLAIMED_BEFORE_ATTEMPT: 'permanently_claimed_before_attempt',
});

const WELCOME_AUDIO_CLAIM_RESULT = Object.freeze({
  NOT_STARTED: 'not_started',
  FRESH_CURRENT_INVOCATION: 'fresh_atomic_claim_won_current_invocation',
  PREEXISTING_OR_REPLAYED: 'preexisting_or_replayed',
  STALE: 'stale',
  MISMATCH: 'mismatch',
});

const WELCOME_AUDIO_CLAIM_TOKEN_STATUS = Object.freeze({
  NOT_ISSUED: 'not_issued',
  FRESH_UNCONSUMED_CURRENT_INVOCATION: 'fresh_unconsumed_current_invocation',
  CONSUMED: 'consumed',
  STALE: 'stale',
  MISMATCH: 'mismatch',
});

const WELCOME_AUDIO_SEND_CLAIM = Object.freeze({
  NOT_ATTEMPTED: 'not_attempted',
  ATTEMPTED_UNCONFIRMED: 'attempted_unconfirmed',
  CONFIRMED_SENT: 'confirmed_sent',
});

const WELCOME_AUDIO_CONFIRMATION_MARKER = Object.freeze({
  NEW_AUDIO_BUBBLE_WITH_SENT_MARKER: 'new_audio_bubble_with_sent_marker',
  NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER: 'new_audio_bubble_without_sent_marker',
  SENT_MARKER_WITHOUT_NEW_AUDIO_BUBBLE: 'sent_marker_without_new_audio_bubble',
  NONE: 'none',
});

const WELCOME_AUDIO_RETRY_DISPOSITION = Object.freeze({
  BEFORE_ATTEMPT: 'not_applicable_before_attempt',
  FORBIDDEN_AFTER_ATTEMPT: 'retry_forbidden_permanently_after_attempt',
});

const WELCOME_AUDIO_GUARD_PHASE = Object.freeze({
  PRECLAIM: 'preclaim_eligible',
  SEND_READY: 'postclaim_send_ready',
  TERMINAL: 'terminal_no_retry',
  BLOCKED: 'blocked',
});

const WELCOME_AUDIO_GUARD_DECISION = Object.freeze({
  ELIGIBLE_TO_CLAIM: 'eligible_for_atomic_claim',
  READY: 'ready_for_one_send_attempt',
  CONFIRMED_TERMINAL: 'confirmed_sent_terminal_no_retry',
  UNKNOWN_TERMINAL: 'attempted_or_unknown_terminal_no_retry',
  BLOCKED: 'blocked_fail_closed',
});

const WELCOME_AUDIO_GUARD_REASON = Object.freeze({
  ADAPTER_VERSION: 'blocked_adapter_version_mismatch',
  CONTRACT_VERSION: 'blocked_guard_contract_version_mismatch',
  OPERATION_IDENTITY: 'blocked_operation_identity_missing_or_invalid',
  APPROVAL: 'blocked_exact_operation_approval_missing_or_mismatched',
  APPROVAL_FRESHNESS: 'blocked_exact_operation_approval_stale_or_invalid',
  EXPECTED_SEND_COUNT: 'blocked_expected_send_count_must_equal_one',
  SURFACE: 'blocked_surface_must_be_safari_instagram_web_dm',
  SURFACE_DETAIL: 'blocked_surface_detail_must_be_safari_standard_isolated_native_picker',
  BROWSER: 'blocked_upload_browser_must_be_safari',
  SAFARI_MODE: 'blocked_safari_private_or_nonstandard_mode',
  SAFARI_ISOLATION: 'blocked_safari_surface_not_isolated',
  UPLOAD_ROUTE: 'blocked_upload_route_must_use_native_file_picker',
  CHROME_UPLOAD: 'blocked_chrome_upload_forbidden',
  IN_APP_UPLOAD: 'blocked_in_app_browser_upload_forbidden',
  SOURCE_RECENCY: 'blocked_recent_follower_evidence_missing_stale_or_ambiguous',
  SOURCE_TIMESTAMP: 'blocked_follower_evidence_timestamp_invalid',
  SOURCE_MAX_AGE: 'blocked_follower_evidence_exceeds_mission_bound_max_age',
  SOURCE_CALENDAR_WINDOW: 'blocked_follower_not_today_or_previous_calendar_day_bogota',
  SOURCE_BUCKET: 'blocked_follower_time_bucket_mismatch',
  SOURCE_BINDING: 'blocked_source_profile_thread_binding_not_exact',
  SOURCE_TO_PROFILE: 'blocked_source_to_profile_binding_not_exact',
  PROFILE_TO_THREAD: 'blocked_profile_to_thread_binding_not_exact',
  FOLLOWS_OWNER: 'blocked_follows_owner_not_confirmed',
  IDENTITY_AMBIGUITY: 'blocked_source_profile_thread_binding_ambiguous',
  PRIVATE_ANCHORS: 'blocked_private_binding_anchors_missing_or_invalid',
  BINDING_MISMATCH: 'blocked_private_source_profile_thread_binding_mismatch',
  BUSINESS_ELIGIBILITY: 'blocked_business_eligibility_not_confirmed_recent_follower',
  AUDIO_CAPABILITY: 'blocked_audio_capability_not_present_and_usable',
  COMPOSER_CAPABILITY: 'blocked_dm_composer_not_present_and_usable',
  ATTACHMENT_CAPABILITY: 'blocked_attachment_control_not_present_and_usable',
  TEXT_FALLBACK: 'blocked_text_fallback_forbidden',
  ASSET: 'blocked_approved_audio_asset_missing_or_invalid',
  ASSET_APPROVAL: 'blocked_approved_audio_asset_binding_mismatch',
  ASSET_PREVIEW: 'blocked_exact_asset_and_preview_binding_missing',
  PREVIEW_BINDING: 'blocked_preview_does_not_match_exact_asset_or_thread',
  CONTEXT_STATUS: 'blocked_central_mission_context_not_fresh_exact',
  CONTEXT_FRESHNESS: 'blocked_central_mission_context_stale_or_invalid',
  CENTRAL_HEAD: 'blocked_central_repo_head_mismatch',
  MISSION_CONTEXT: 'blocked_active_mission_context_mismatch',
  DEDUPE_STATUS: 'blocked_final_dedupe_not_clear',
  HISTORY_STATUS: 'blocked_already_welcomed_or_send_history_not_clear',
  DEDUPE_FRESHNESS: 'blocked_final_dedupe_stale_or_invalid',
  DEDUPE_BINDING: 'blocked_final_dedupe_binding_mismatch',
  EFFECT_CLAIM: 'blocked_atomic_permanent_pre_send_claim_invalid',
  EFFECT_CLAIM_BINDING: 'blocked_effect_claim_binding_mismatch',
  EFFECT_CLAIM_FRESHNESS: 'blocked_effect_claim_stale_or_invalid',
  EFFECT_CLAIM_SEQUENCE: 'blocked_effect_claim_sequence_invalid',
  EFFECT_CLAIM_OWNER: 'blocked_effect_claim_not_owned_by_current_invocation',
  EFFECT_CLAIM_REENTRY: 'blocked_preexisting_replayed_or_consumed_claim_terminal_no_retry',
  ATTEMPT_BUDGET: 'blocked_attempt_budget_must_equal_one',
  SEND_COUNT: 'blocked_send_attempt_count_exceeds_one',
  ATTEMPT_STATE: 'blocked_attempt_state_invalid_or_inconsistent',
  SEND_CLAIM: 'blocked_send_claim_invalid_or_inconsistent',
  CONFIRMATION_ENUM: 'blocked_confirmation_marker_not_in_exact_enum',
  CONFIRMATION_BINDING: 'blocked_confirmation_not_bound_to_current_operation_thread_asset',
  CONFIRMATION_TIMESTAMP: 'blocked_confirmation_not_observed_after_current_attempt',
  RETRY_DISPOSITION: 'blocked_retry_disposition_invalid_or_inconsistent',
  RETRY_REQUESTED: 'blocked_retry_forbidden_after_attempt_or_unknown',
  TERMINAL_NO_RETRY: 'blocked_operation_already_committed_attempted_or_unknown_no_retry',
  CONFIRMATION_INSUFFICIENT: 'blocked_attempted_unconfirmed_terminal_no_retry',
  RECEIPT_PRIVATE_FIELDS: 'blocked_redacted_receipt_contains_private_or_extra_fields',
  RECEIPT_CONTRACT: 'blocked_redacted_receipt_contract_mismatch',
});

const STRONG_CONFIRMATION_MARKERS = new Set([
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.SENT_MARKER_WITHOUT_NEW_AUDIO_BUBBLE,
]);

const enumSet = (values) => new Set(Object.values(values));
const SOURCE_RECENCIES = enumSet(WELCOME_AUDIO_SOURCE_RECENCY);
const SOURCE_BINDINGS = enumSet(WELCOME_AUDIO_SOURCE_BINDING);
const AUDIO_CAPABILITIES = enumSet(WELCOME_AUDIO_AUDIO_CAPABILITY);
const ASSET_PREVIEW_BINDINGS = enumSet(WELCOME_AUDIO_ASSET_PREVIEW_BINDING);
const ATTEMPT_STATES = enumSet(WELCOME_AUDIO_ATTEMPT_STATE);
const EFFECT_CLAIMS = enumSet(WELCOME_AUDIO_EFFECT_CLAIM);
const CLAIM_RESULTS = enumSet(WELCOME_AUDIO_CLAIM_RESULT);
const CLAIM_TOKEN_STATUSES = enumSet(WELCOME_AUDIO_CLAIM_TOKEN_STATUS);
const SEND_CLAIMS = enumSet(WELCOME_AUDIO_SEND_CLAIM);
const CONFIRMATION_MARKERS = enumSet(WELCOME_AUDIO_CONFIRMATION_MARKER);
const RETRY_DISPOSITIONS = enumSet(WELCOME_AUDIO_RETRY_DISPOSITION);
const GUARD_PHASES = enumSet(WELCOME_AUDIO_GUARD_PHASE);
const GUARD_DECISIONS = enumSet(WELCOME_AUDIO_GUARD_DECISION);
const REASON_CODES = enumSet(WELCOME_AUDIO_GUARD_REASON);

const REDACTED_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'guard_contract_version',
  'adapter_version',
  'redaction_status',
  'phase',
  'decision',
  'claim_allowed',
  'send_ready',
  'send_allowed',
  'one_shot_consumer_required',
  'terminal',
  'expected_send_count',
  'attempt_budget',
  'send_attempt_count',
  'surface',
  'surface_detail',
  'source_recency',
  'source_binding',
  'business_eligibility',
  'audio_capability',
  'asset_preview_binding',
  'context_status',
  'dedupe_status',
  'effect_claim',
  'claim_result',
  'claim_token_status',
  'attempt_state',
  'send_claim',
  'confirmation_marker',
  'retry_disposition',
  'blocker_codes',
]);

const cleanString = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const isOpaqueId = (value) => /^[a-z0-9][a-z0-9._:-]{7,200}$/i.test(cleanString(value) ?? '');
const isSha256 = (value) => /^[0-9a-f]{64}$/i.test(cleanString(value) ?? '');
const isGitHead = (value) => /^[0-9a-f]{40,64}$/i.test(cleanString(value) ?? '');
const sameCleanString = (left, right) => cleanString(left) !== null && cleanString(left) === cleanString(right);
const sameSha256 = (left, right) => isSha256(left)
  && cleanString(left).toLowerCase() === cleanString(right)?.toLowerCase();
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const parseTimestamp = (value) => {
  const parsed = Date.parse(cleanString(value) ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

const isFreshTimestamp = (value, nowMs, maxAgeMs = WELCOME_AUDIO_CONTEXT_MAX_AGE_MS) => {
  const timestampMs = parseTimestamp(value);
  return timestampMs !== null
    && timestampMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS
    && nowMs - timestampMs <= maxAgeMs;
};

const bogotaCalendarDayNumber = (timestampMs) => {
  if (!Number.isFinite(timestampMs)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WELCOME_AUDIO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestampMs));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(byType.year);
  const month = Number(byType.month);
  const day = Number(byType.day);
  if (![year, month, day].every(Number.isInteger)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

const classifyRecentFollowerBucket = (observedAt, nowMs) => {
  const observedAtMs = parseTimestamp(observedAt);
  if (observedAtMs === null || observedAtMs > nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS) return null;
  const observedDay = bogotaCalendarDayNumber(observedAtMs);
  const currentDay = bogotaCalendarDayNumber(nowMs);
  if (observedDay === null || currentDay === null) return null;
  const ageInCalendarDays = currentDay - observedDay;
  if (ageInCalendarDays === 0) return 'today';
  if (ageInCalendarDays === 1) return 'previous_calendar_day';
  return 'stale';
};

const addReason = (reasons, reason) => {
  if (!reasons.includes(reason)) reasons.push(reason);
};

const safeEnum = (value, allowed) => allowed.has(value)
  ? value
  : WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL;
const safeAllowedInteger = (value, allowed) => allowed.has(value) ? value : null;
const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
};

const receiptEnum = (value, allowed) => value === WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL
  || allowed.has(value);

const validateReceiptShape = (receipt) => {
  if (!exactObjectKeys(receipt, REDACTED_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_PRIVATE_FIELDS };
  }

  let serialized;
  try {
    serialized = JSON.stringify(receipt);
  } catch {
    return { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT };
  }
  if (/https?:\/\//i.test(serialized)
    || /\/Users\//.test(serialized)
    || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(serialized)
    || /\b(?:bearer|authorization|cookie|password|credential|client_secret|access_token)\b/i.test(serialized)
    || /[0-9a-f]{40,64}/i.test(serialized)) {
    return { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_PRIVATE_FIELDS };
  }

  const fixedValid = receipt.receipt_schema_version === WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION
    && receipt.guard_contract_version === WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION
    && receipt.adapter_version === WELCOME_AUDIO_ADAPTER_VERSION
    && receipt.redaction_status === 'allowlist_only_no_private_fields'
    && GUARD_PHASES.has(receipt.phase)
    && GUARD_DECISIONS.has(receipt.decision)
    && typeof receipt.claim_allowed === 'boolean'
    && typeof receipt.send_ready === 'boolean'
    && typeof receipt.send_allowed === 'boolean'
    && typeof receipt.one_shot_consumer_required === 'boolean'
    && typeof receipt.terminal === 'boolean'
    && (receipt.expected_send_count === null || receipt.expected_send_count === 1)
    && (receipt.attempt_budget === null || receipt.attempt_budget === 1)
    && (receipt.send_attempt_count === null || [0, 1].includes(receipt.send_attempt_count))
    && receiptEnum(receipt.surface, new Set([WELCOME_AUDIO_SURFACE.STATUS]))
    && receiptEnum(receipt.surface_detail, new Set([WELCOME_AUDIO_SURFACE.DETAIL]))
    && receiptEnum(receipt.source_recency, SOURCE_RECENCIES)
    && receiptEnum(receipt.source_binding, SOURCE_BINDINGS)
    && receiptEnum(receipt.business_eligibility, new Set(['eligible_confirmed_recent_follower']))
    && receiptEnum(receipt.audio_capability, AUDIO_CAPABILITIES)
    && receiptEnum(receipt.asset_preview_binding, ASSET_PREVIEW_BINDINGS)
    && receiptEnum(receipt.context_status, new Set(['fresh_exact_central_mission_context']))
    && receiptEnum(receipt.dedupe_status, new Set(['clear_no_prior_welcome_or_attempt']))
    && receiptEnum(receipt.effect_claim, EFFECT_CLAIMS)
    && receiptEnum(receipt.claim_result, CLAIM_RESULTS)
    && receiptEnum(receipt.claim_token_status, CLAIM_TOKEN_STATUSES)
    && receiptEnum(receipt.attempt_state, ATTEMPT_STATES)
    && receiptEnum(receipt.send_claim, SEND_CLAIMS)
    && receiptEnum(receipt.confirmation_marker, CONFIRMATION_MARKERS)
    && receiptEnum(receipt.retry_disposition, RETRY_DISPOSITIONS)
    && Array.isArray(receipt.blocker_codes)
    && receipt.blocker_codes.every((reason) => REASON_CODES.has(reason));
  return fixedValid
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT };
};

const evaluateWelcomeAudioOperation = (input, { nowMs = Date.now(), validateReceipt = true } = {}) => {
  const reasons = [];
  const operation = input?.operation ?? {};
  const approval = input?.approval ?? {};
  const surface = input?.execution_surface ?? {};
  const follower = input?.follower_evidence ?? {};
  const binding = input?.binding ?? {};
  const eligibility = input?.eligibility ?? {};
  const asset = input?.asset ?? {};
  const context = input?.context ?? {};
  const dedupe = input?.dedupe ?? {};
  const effectClaim = input?.effect_claim ?? {};
  const execution = input?.execution ?? {};
  const confirmation = input?.confirmation ?? {};

  if (input?.adapter_version !== WELCOME_AUDIO_ADAPTER_VERSION) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ADAPTER_VERSION);
  }
  if (input?.contract_version !== WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTRACT_VERSION);
  }

  const operationAnchors = [
    operation.source_event_anchor_sha256,
    operation.profile_anchor_sha256,
    operation.candidate_anchor_sha256,
    operation.thread_anchor_sha256,
    operation.owner_anchor_sha256,
  ];
  if (!isOpaqueId(operation.operation_id)
    || !isOpaqueId(operation.approval_packet_id)
    || !operationAnchors.every(isSha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.OPERATION_IDENTITY);
  }
  if (operation.expected_send_count !== 1) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EXPECTED_SEND_COUNT);
  }

  const approvalValid = approval.status === 'approved_exact_single_send'
    && approval.expected_send_count === 1
    && sameCleanString(approval.operation_id, operation.operation_id)
    && sameCleanString(approval.approval_packet_id, operation.approval_packet_id)
    && sameSha256(approval.source_event_anchor_sha256, operation.source_event_anchor_sha256)
    && sameSha256(approval.profile_anchor_sha256, operation.profile_anchor_sha256)
    && sameSha256(approval.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(approval.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(approval.owner_anchor_sha256, operation.owner_anchor_sha256)
    && isPositiveInteger(approval.source_recency_max_age_ms);
  if (!approvalValid) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.APPROVAL);
  if (!isFreshTimestamp(approval.checked_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.APPROVAL_FRESHNESS);
  }

  if (surface.surface !== WELCOME_AUDIO_SURFACE.STATUS) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SURFACE);
  if (surface.surface_detail !== WELCOME_AUDIO_SURFACE.DETAIL) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SURFACE_DETAIL);
  if (surface.browser !== WELCOME_AUDIO_SURFACE.BROWSER) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.BROWSER);
  if (surface.browser_mode !== WELCOME_AUDIO_SURFACE.MODE || surface.private_browsing !== false) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SAFARI_MODE);
  }
  if (surface.isolation !== WELCOME_AUDIO_SURFACE.ISOLATION) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SAFARI_ISOLATION);
  if (surface.upload_route !== WELCOME_AUDIO_SURFACE.UPLOAD_ROUTE) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.UPLOAD_ROUTE);
  if (surface.chrome_upload_attempted !== false) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CHROME_UPLOAD);
  if (surface.in_app_browser_upload_attempted !== false) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.IN_APP_UPLOAD);

  if (follower.source_recency !== WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_RECENCY);
  }
  const observedAtMs = parseTimestamp(follower.observed_at);
  if (observedAtMs === null || observedAtMs > nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_TIMESTAMP);
  }
  const sourceMaxAgeValid = isPositiveInteger(follower.source_recency_max_age_ms)
    && follower.source_recency_max_age_ms === approval.source_recency_max_age_ms;
  if (!sourceMaxAgeValid
    || observedAtMs === null
    || nowMs - observedAtMs > follower.source_recency_max_age_ms) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE);
  }
  const actualBucket = classifyRecentFollowerBucket(follower.observed_at, nowMs);
  if (!['today', 'previous_calendar_day'].includes(actualBucket)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_CALENDAR_WINDOW);
  }
  if (follower.time_bucket !== actualBucket) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BUCKET);

  if (binding.source_binding !== WELCOME_AUDIO_SOURCE_BINDING.EXACT) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BINDING);
  if (binding.source_to_profile !== 'exact') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_TO_PROFILE);
  if (binding.profile_to_thread !== 'exact') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PROFILE_TO_THREAD);
  if (binding.follows_owner !== 'confirmed') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.FOLLOWS_OWNER);
  if (binding.ambiguity !== 'clear') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.IDENTITY_AMBIGUITY);

  const bindingAnchors = [
    follower.source_event_anchor_sha256,
    binding.source_event_anchor_sha256,
    binding.profile_anchor_sha256,
    binding.candidate_anchor_sha256,
    binding.thread_anchor_sha256,
    binding.owner_anchor_sha256,
  ];
  if (!bindingAnchors.every(isSha256)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PRIVATE_ANCHORS);
  const exactBinding = sameSha256(follower.source_event_anchor_sha256, operation.source_event_anchor_sha256)
    && sameSha256(binding.source_event_anchor_sha256, operation.source_event_anchor_sha256)
    && sameSha256(binding.profile_anchor_sha256, operation.profile_anchor_sha256)
    && sameSha256(binding.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(binding.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(binding.owner_anchor_sha256, operation.owner_anchor_sha256);
  if (!exactBinding) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.BINDING_MISMATCH);

  if (eligibility.business_eligibility !== 'eligible_confirmed_recent_follower') {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.BUSINESS_ELIGIBILITY);
  }
  if (eligibility.audio_capability !== WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.AUDIO_CAPABILITY);
  }
  if (eligibility.composer_capability !== WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.COMPOSER_CAPABILITY);
  }
  if (eligibility.attachment_capability !== WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ATTACHMENT_CAPABILITY);
  }
  if (eligibility.text_fallback !== 'forbidden') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.TEXT_FALLBACK);

  if (!isOpaqueId(asset.approved_audio_asset_id) || !isSha256(asset.approved_audio_asset_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET);
  }
  if (!sameCleanString(asset.approved_audio_asset_id, approval.approved_audio_asset_id)
    || !sameSha256(asset.approved_audio_asset_sha256, approval.approved_audio_asset_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_APPROVAL);
  }
  if (asset.asset_preview_binding !== WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW);
  }
  if (asset.preview_status !== 'verified_on_exact_bound_thread'
    || !sameCleanString(asset.preview_audio_asset_id, asset.approved_audio_asset_id)
    || !sameSha256(asset.preview_audio_asset_sha256, asset.approved_audio_asset_sha256)
    || !sameSha256(asset.preview_thread_anchor_sha256, operation.thread_anchor_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PREVIEW_BINDING);
  }

  if (context.status !== 'fresh_exact_central_mission_context') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTEXT_STATUS);
  if (!isFreshTimestamp(context.checked_at, nowMs)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTEXT_FRESHNESS);
  if (!isGitHead(context.central_repo_head)
    || !sameCleanString(context.central_repo_head, context.expected_central_repo_head)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CENTRAL_HEAD);
  }
  if (!isOpaqueId(context.mission_id)
    || !sameCleanString(context.mission_id, context.expected_mission_id)
    || context.mission_status !== 'active') {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.MISSION_CONTEXT);
  }

  if (dedupe.status !== 'clear_no_prior_welcome_or_attempt') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.DEDUPE_STATUS);
  if (dedupe.already_welcomed_status !== 'not_found' || dedupe.send_history_status !== 'no_prior_attempt') {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.HISTORY_STATUS);
  }
  if (!isFreshTimestamp(dedupe.checked_at, nowMs)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.DEDUPE_FRESHNESS);
  const dedupeBindingMatches = sameCleanString(dedupe.operation_id, operation.operation_id)
    && sameCleanString(dedupe.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(dedupe.mission_id, context.mission_id)
    && sameSha256(dedupe.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(dedupe.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(dedupe.owner_anchor_sha256, operation.owner_anchor_sha256)
    && sameSha256(dedupe.approved_audio_asset_sha256, asset.approved_audio_asset_sha256);
  if (!dedupeBindingMatches) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.DEDUPE_BINDING);

  if (execution.attempt_budget !== WELCOME_AUDIO_ATTEMPT_BUDGET) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ATTEMPT_BUDGET);
  if (!Number.isInteger(execution.send_attempt_count)
    || execution.send_attempt_count < 0
    || execution.send_attempt_count > WELCOME_AUDIO_ATTEMPT_BUDGET) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SEND_COUNT);
  }
  if (!ATTEMPT_STATES.has(execution.attempt_state)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ATTEMPT_STATE);
  if (!SEND_CLAIMS.has(execution.send_claim)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SEND_CLAIM);
  if (!CONFIRMATION_MARKERS.has(confirmation.confirmation_marker)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_ENUM);
  if (!RETRY_DISPOSITIONS.has(execution.retry_disposition)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.RETRY_DISPOSITION);
  if (execution.retry_requested !== false) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.RETRY_REQUESTED);
  if (!EFFECT_CLAIMS.has(effectClaim.status)
    || !CLAIM_RESULTS.has(effectClaim.claim_result)
    || !CLAIM_TOKEN_STATUSES.has(effectClaim.claim_token_status)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM);
  }

  const neutralClaim = effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED
    && effectClaim.claim_result === WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED
    && effectClaim.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED
    && effectClaim.atomic === false
    && effectClaim.permanent === false
    && effectClaim.claimed_at == null
    && effectClaim.claim_owner_id == null
    && effectClaim.claim_token_id == null
    && effectClaim.registry_revision == null;

  const claimBindingMatches = effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && effectClaim.atomic === true
    && effectClaim.permanent === true
    && isOpaqueId(effectClaim.claim_owner_id)
    && isOpaqueId(effectClaim.claim_token_id)
    && isPositiveInteger(effectClaim.registry_revision)
    && sameCleanString(effectClaim.operation_id, operation.operation_id)
    && sameCleanString(effectClaim.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(effectClaim.mission_id, context.mission_id)
    && sameSha256(effectClaim.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(effectClaim.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(effectClaim.owner_anchor_sha256, operation.owner_anchor_sha256)
    && sameCleanString(effectClaim.approved_audio_asset_id, asset.approved_audio_asset_id)
    && sameSha256(effectClaim.approved_audio_asset_sha256, asset.approved_audio_asset_sha256);

  const claimOwnedByExecution = claimBindingMatches
    && sameCleanString(execution.claim_owner_id, effectClaim.claim_owner_id)
    && sameCleanString(execution.claim_token_id, effectClaim.claim_token_id)
    && execution.claim_registry_revision === effectClaim.registry_revision;

  const preclaimState = neutralClaim
    && execution.send_attempt_count === 0
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    && execution.claim_owner_id == null
    && execution.claim_token_id == null
    && execution.claim_registry_revision == null
    && execution.attempted_at == null
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmation.bound_to_current_operation === false
    && confirmation.checked_at == null;

  const sendReadyState = claimOwnedByExecution
    && effectClaim.claim_result === WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION
    && effectClaim.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION
    && isFreshTimestamp(effectClaim.claimed_at, nowMs)
    && execution.send_attempt_count === 0
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    && execution.attempted_at == null
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmation.bound_to_current_operation === false
    && confirmation.checked_at == null;

  const claimAtMs = parseTimestamp(effectClaim.claimed_at);
  const attemptedAtMs = parseTimestamp(execution.attempted_at);
  const confirmationAtMs = parseTimestamp(confirmation.checked_at);
  const afterAttemptState = claimBindingMatches
    && effectClaim.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED
    && execution.send_attempt_count === 1
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
    && attemptedAtMs !== null
    && claimAtMs !== null
    && attemptedAtMs >= claimAtMs
    && attemptedAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;

  const terminalSignal = effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    || execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED
    || execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
    || (Number.isInteger(execution.send_attempt_count) && execution.send_attempt_count > 0)
    || (SEND_CLAIMS.has(execution.send_claim)
      && execution.send_claim !== WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED);

  if (!preclaimState && !terminalSignal) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ATTEMPT_STATE);
  if (terminalSignal && !claimBindingMatches) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_BINDING);
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT) {
    const contextAtMs = parseTimestamp(context.checked_at);
    const approvalAtMs = parseTimestamp(approval.checked_at);
    const dedupeAtMs = parseTimestamp(dedupe.checked_at);
    if (!isFreshTimestamp(effectClaim.claimed_at, nowMs)) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_FRESHNESS);
    }
    if (claimAtMs === null
      || contextAtMs === null
      || approvalAtMs === null
      || dedupeAtMs === null
      || claimAtMs < contextAtMs
      || claimAtMs < approvalAtMs
      || claimAtMs < dedupeAtMs) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE);
    }
  }
  if (!sendReadyState
    && effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY);
  }
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && !claimOwnedByExecution) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_OWNER);
  }

  const strongConfirmation = STRONG_CONFIRMATION_MARKERS.has(confirmation.confirmation_marker);
  const confirmationBound = strongConfirmation
    && sameCleanString(confirmation.operation_id, operation.operation_id)
    && sameSha256(confirmation.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(confirmation.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(confirmation.approved_audio_asset_sha256, asset.approved_audio_asset_sha256)
    && confirmation.bound_to_current_operation === true
    && confirmationAtMs !== null
    && attemptedAtMs !== null
    && confirmationAtMs >= attemptedAtMs
    && confirmationAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;
  const unknownConfirmation = confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED
    && confirmation.bound_to_current_operation === false
    && confirmationAtMs !== null
    && attemptedAtMs !== null
    && confirmationAtMs >= attemptedAtMs
    && confirmationAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;

  if (afterAttemptState && strongConfirmation && !confirmationBound) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING);
    if (confirmationAtMs === null || attemptedAtMs === null || confirmationAtMs < attemptedAtMs) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_TIMESTAMP);
    }
  }
  if (afterAttemptState
    && strongConfirmation
    && execution.send_claim !== WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SEND_CLAIM);
  }
  if (afterAttemptState
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && execution.send_claim !== WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SEND_CLAIM);
  }
  if (attemptedAtMs !== null && claimAtMs !== null && attemptedAtMs < claimAtMs) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE);
  }
  if (afterAttemptState
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && !unknownConfirmation) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_TIMESTAMP);
  }

  let phase = WELCOME_AUDIO_GUARD_PHASE.BLOCKED;
  let decision = WELCOME_AUDIO_GUARD_DECISION.BLOCKED;
  let terminal = false;
  let claimAllowed = false;
  let sendReady = false;

  if (preclaimState && reasons.length === 0) {
    phase = WELCOME_AUDIO_GUARD_PHASE.PRECLAIM;
    decision = WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM;
    claimAllowed = true;
  } else if (sendReadyState && reasons.length === 0) {
    phase = WELCOME_AUDIO_GUARD_PHASE.SEND_READY;
    decision = WELCOME_AUDIO_GUARD_DECISION.READY;
    sendReady = true;
  } else if (terminalSignal) {
    phase = WELCOME_AUDIO_GUARD_PHASE.TERMINAL;
    terminal = true;
    if (afterAttemptState
      && strongConfirmation
      && confirmationBound
      && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT) {
      decision = WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL;
    } else {
      decision = WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL;
      if (!reasons.includes(WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY)) {
        addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT);
      }
    }
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY);
  }

  const result = {
    ok: claimAllowed || sendReady,
    state_valid: decision !== WELCOME_AUDIO_GUARD_DECISION.BLOCKED
      && (claimAllowed || sendReady || reasons.every((reason) => [
        WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
        WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
      ].includes(reason))),
    phase,
    claim_allowed: claimAllowed,
    send_ready: sendReady,
    send_allowed: false,
    one_shot_consumer_required: sendReady,
    terminal,
    decision,
    reason: reasons[0] ?? null,
    blockers: [...reasons],
  };

  if (validateReceipt && input?.receipt !== undefined) {
    const receiptValidation = validateWelcomeAudioRedactedReceipt(input.receipt);
    const expectedReceipt = buildWelcomeAudioRedactedReceipt(input, { nowMs });
    const structurallyEqual = receiptValidation.ok
      && REDACTED_RECEIPT_FIELDS.every((field) => JSON.stringify(input.receipt[field])
        === JSON.stringify(expectedReceipt[field]));
    if (!structurallyEqual) {
      result.ok = false;
      result.state_valid = false;
      result.claim_allowed = false;
      result.send_ready = false;
      result.send_allowed = false;
      result.one_shot_consumer_required = false;
      addReason(
        result.blockers,
        receiptValidation.ok
          ? WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT
          : receiptValidation.reason,
      );
      result.reason = result.blockers[0];
      if (terminalSignal && !result.terminal) {
        result.terminal = true;
        result.phase = WELCOME_AUDIO_GUARD_PHASE.TERMINAL;
        result.decision = WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL;
        addReason(result.blockers, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY);
        addReason(result.blockers, WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY);
      } else if (!result.terminal) {
        result.phase = WELCOME_AUDIO_GUARD_PHASE.BLOCKED;
        result.decision = WELCOME_AUDIO_GUARD_DECISION.BLOCKED;
      }
    }
  }

  return result;
};

const buildWelcomeAudioRedactedReceipt = (input, { nowMs = Date.now() } = {}) => {
  const result = evaluateWelcomeAudioOperation(input, { nowMs, validateReceipt: false });
  return {
    receipt_schema_version: WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION,
    guard_contract_version: WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
    adapter_version: WELCOME_AUDIO_ADAPTER_VERSION,
    redaction_status: 'allowlist_only_no_private_fields',
    phase: result.phase,
    decision: result.decision,
    claim_allowed: result.claim_allowed,
    send_ready: result.send_ready,
    send_allowed: result.send_allowed,
    one_shot_consumer_required: result.one_shot_consumer_required,
    terminal: result.terminal,
    expected_send_count: safeAllowedInteger(input?.operation?.expected_send_count, new Set([1])),
    attempt_budget: safeAllowedInteger(input?.execution?.attempt_budget, new Set([1])),
    send_attempt_count: safeAllowedInteger(input?.execution?.send_attempt_count, new Set([0, 1])),
    surface: safeEnum(input?.execution_surface?.surface, new Set([WELCOME_AUDIO_SURFACE.STATUS])),
    surface_detail: safeEnum(input?.execution_surface?.surface_detail, new Set([WELCOME_AUDIO_SURFACE.DETAIL])),
    source_recency: safeEnum(input?.follower_evidence?.source_recency, SOURCE_RECENCIES),
    source_binding: safeEnum(input?.binding?.source_binding, SOURCE_BINDINGS),
    business_eligibility: safeEnum(
      input?.eligibility?.business_eligibility,
      new Set(['eligible_confirmed_recent_follower']),
    ),
    audio_capability: safeEnum(input?.eligibility?.audio_capability, AUDIO_CAPABILITIES),
    asset_preview_binding: safeEnum(input?.asset?.asset_preview_binding, ASSET_PREVIEW_BINDINGS),
    context_status: safeEnum(input?.context?.status, new Set(['fresh_exact_central_mission_context'])),
    dedupe_status: safeEnum(input?.dedupe?.status, new Set(['clear_no_prior_welcome_or_attempt'])),
    effect_claim: safeEnum(input?.effect_claim?.status, EFFECT_CLAIMS),
    claim_result: safeEnum(input?.effect_claim?.claim_result, CLAIM_RESULTS),
    claim_token_status: safeEnum(input?.effect_claim?.claim_token_status, CLAIM_TOKEN_STATUSES),
    attempt_state: safeEnum(input?.execution?.attempt_state, ATTEMPT_STATES),
    send_claim: safeEnum(input?.execution?.send_claim, SEND_CLAIMS),
    confirmation_marker: safeEnum(input?.confirmation?.confirmation_marker, CONFIRMATION_MARKERS),
    retry_disposition: safeEnum(input?.execution?.retry_disposition, RETRY_DISPOSITIONS),
    blocker_codes: [...result.blockers],
  };
};

const validateWelcomeAudioRedactedReceipt = (receipt) => validateReceiptShape(receipt);
const validateWelcomeAudioOperation = (input, options = {}) => evaluateWelcomeAudioOperation(input, options);
const validateInstagramWelcomeAudioOperation = validateWelcomeAudioOperation;
const buildInstagramWelcomeAudioRedactedReceipt = buildWelcomeAudioRedactedReceipt;

export {
  REDACTED_RECEIPT_FIELDS,
  WELCOME_AUDIO_ADAPTER_VERSION,
  WELCOME_AUDIO_ASSET_PREVIEW_BINDING,
  WELCOME_AUDIO_ATTEMPT_BUDGET,
  WELCOME_AUDIO_ATTEMPT_STATE,
  WELCOME_AUDIO_AUDIO_CAPABILITY,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONTEXT_MAX_AGE_MS,
  WELCOME_AUDIO_EFFECT_CLAIM,
  WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS,
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  WELCOME_AUDIO_GUARD_REASON,
  WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
  WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_RETRY_DISPOSITION,
  WELCOME_AUDIO_SEND_CLAIM,
  WELCOME_AUDIO_SOURCE_BINDING,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_TIME_ZONE,
  bogotaCalendarDayNumber,
  buildInstagramWelcomeAudioRedactedReceipt,
  buildWelcomeAudioRedactedReceipt,
  classifyRecentFollowerBucket,
  validateInstagramWelcomeAudioOperation,
  validateWelcomeAudioOperation,
  validateWelcomeAudioRedactedReceipt,
};
