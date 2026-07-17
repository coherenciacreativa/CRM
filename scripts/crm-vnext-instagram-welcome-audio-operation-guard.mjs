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

import { createHash } from 'node:crypto';
import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_ADAPTER_VERSION = 'instagram_welcome_audio_safari_action_adapter_v1';
const WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_v1';
const WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_redacted_receipt_v1';
const WELCOME_AUDIO_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS = 60 * 1000;
const WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS = 300_000;
const WELCOME_AUDIO_ATTEMPT_BUDGET = 1;
const WELCOME_AUDIO_TIME_ZONE = 'America/Bogota';
const WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL = 'invalid_or_unknown';
const WELCOME_AUDIO_CANONICAL_OPERATION_PROJECTION_VERSION =
  'crm_core_instagram_welcome_audio_canonical_operation_projection_v1';
const WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION =
  'instagram_welcome_audio_ui_attested_action_adapter_v1';
const WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_ui_attested_v1';
const WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_operation_guard_ui_attested_redacted_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_CANONICAL_OPERATION_PROJECTION_VERSION =
  'crm_core_instagram_welcome_audio_canonical_operation_projection_ui_attested_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_follower_source_projection_v1';

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
  SEALED_PAUSED_CAMPAIGN_BACKLOG: 'sealed_paused_campaign_backlog',
  UI_ATTESTED_CAPTURE_FRESH: 'ui_attested_capture_fresh',
  STALE: 'stale',
  UNKNOWN: 'unknown',
});

const WELCOME_AUDIO_SOURCE_BINDING = Object.freeze({
  EXACT: 'exact_recent_source_bound',
  EXACT_SEALED_BACKLOG: 'exact_sealed_backlog_member_bound',
  EXACT_UI_ATTESTED: 'exact_ui_attested_source_bound',
  MISMATCH: 'mismatch',
  AMBIGUOUS: 'ambiguous',
  MISSING: 'missing',
});

const WELCOME_AUDIO_SOURCE_CLASS = Object.freeze({
  SEALED_PAUSED_CAMPAIGN_BACKLOG_MEMBER: 'sealed_paused_campaign_backlog_member',
  UI_ATTESTED_FOLLOWER_SOURCE_V1: 'ui_attested_follower_source_v1',
});

const WELCOME_AUDIO_BUSINESS_ELIGIBILITY = Object.freeze({
  RECENT_FOLLOWER: 'eligible_confirmed_recent_follower',
  SEALED_BACKLOG_FOLLOWER: 'eligible_confirmed_sealed_campaign_backlog_follower',
  UI_ATTESTED_FOLLOWER: 'eligible_confirmed_ui_attested_follower',
});

const WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE = Object.freeze({
  CURRENT_FOLLOWS_OWNER_CONFIRMED: 'confirmed',
  RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION:
    'recent_follow_event_no_explicit_contradiction',
});

const WELCOME_AUDIO_AUDIO_CAPABILITY = Object.freeze({
  PRESENT_AND_USABLE: 'present_and_usable',
  MISSING: 'missing',
  DISABLED: 'disabled',
  AMBIGUOUS: 'ambiguous',
});

const WELCOME_AUDIO_ASSET_PREVIEW_BINDING = Object.freeze({
  EXACT: 'exact_asset_and_preview_match',
  PREUPLOAD_APPROVED_FILE: 'approved_asset_file_bound_before_upload',
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
  INPUT_SHAPE: 'blocked_input_shape_unknown_or_missing_fields',
  ADAPTER_VERSION: 'blocked_adapter_version_mismatch',
  CONTRACT_VERSION: 'blocked_guard_contract_version_mismatch',
  OPERATION_IDENTITY: 'blocked_operation_identity_missing_or_invalid',
  CANONICAL_OPERATION: 'blocked_canonical_operation_digest_missing_or_mismatched',
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
  SURFACE_OBSERVATION: 'blocked_surface_observation_stale_or_invalid',
  SOURCE_RECENCY: 'blocked_recent_follower_evidence_missing_stale_or_ambiguous',
  SOURCE_TIMESTAMP: 'blocked_follower_evidence_timestamp_invalid',
  SOURCE_MAX_AGE: 'blocked_follower_evidence_exceeds_mission_bound_max_age',
  SOURCE_CALENDAR_WINDOW: 'blocked_follower_not_today_or_previous_calendar_day_bogota',
  SOURCE_BUCKET: 'blocked_follower_time_bucket_mismatch',
  SOURCE_PROVENANCE: 'blocked_sealed_backlog_provenance_missing_or_invalid',
  SOURCE_MANIFEST_BINDING: 'blocked_sealed_backlog_manifest_or_interval_binding_mismatch',
  SOURCE_MANIFEST_POSITION: 'blocked_sealed_backlog_manifest_position_invalid',
  SOURCE_BINDING: 'blocked_source_profile_thread_binding_not_exact',
  SOURCE_TO_PROFILE: 'blocked_source_to_profile_binding_not_exact',
  PROFILE_TO_THREAD: 'blocked_profile_to_thread_binding_not_exact',
  FOLLOWS_OWNER: 'blocked_follows_owner_not_confirmed',
  IDENTITY_AMBIGUITY: 'blocked_source_profile_thread_binding_ambiguous',
  PRIVATE_ANCHORS: 'blocked_private_binding_anchors_missing_or_invalid',
  BINDING_MISMATCH: 'blocked_private_source_profile_thread_binding_mismatch',
  BINDING_OBSERVATION: 'blocked_source_profile_thread_observation_stale_or_invalid',
  BUSINESS_ELIGIBILITY: 'blocked_business_eligibility_not_confirmed_recent_follower',
  AUDIO_CAPABILITY: 'blocked_audio_capability_not_present_and_usable',
  COMPOSER_CAPABILITY: 'blocked_dm_composer_not_present_and_usable',
  ATTACHMENT_CAPABILITY: 'blocked_attachment_control_not_present_and_usable',
  TEXT_FALLBACK: 'blocked_text_fallback_forbidden',
  ELIGIBILITY_OBSERVATION: 'blocked_business_capability_observation_stale_or_invalid',
  ASSET: 'blocked_approved_audio_asset_missing_or_invalid',
  ASSET_APPROVAL: 'blocked_approved_audio_asset_binding_mismatch',
  ASSET_PREVIEW: 'blocked_exact_asset_and_preview_binding_missing',
  PREVIEW_BINDING: 'blocked_preview_does_not_match_exact_asset_or_thread',
  ASSET_PREVIEW_OBSERVATION: 'blocked_asset_preview_observation_stale_or_invalid',
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
  TERMINAL_EVIDENCE: 'blocked_non_neutral_lifecycle_evidence_terminal_no_retry',
  EXECUTION_BINDING: 'blocked_execution_not_bound_to_current_operation_claim_or_attempt',
  CLAIM_TOKEN_CONSUMPTION: 'blocked_claim_token_not_consumed_before_attempt',
  ATTEMPT_BUDGET: 'blocked_attempt_budget_must_equal_one',
  SEND_COUNT: 'blocked_send_attempt_count_exceeds_one',
  ATTEMPT_STATE: 'blocked_attempt_state_invalid_or_inconsistent',
  SEND_CLAIM: 'blocked_send_claim_invalid_or_inconsistent',
  CONFIRMATION_ENUM: 'blocked_confirmation_marker_not_in_exact_enum',
  CONFIRMATION_BINDING: 'blocked_confirmation_not_bound_to_current_operation_thread_asset',
  CONFIRMATION_TIMESTAMP: 'blocked_confirmation_not_observed_after_current_attempt',
  CONFIRMATION_MAX_DELAY: 'blocked_confirmation_max_delay_must_equal_300000',
  CONFIRMATION_DELAY_EXCEEDED:
    'blocked_strong_confirmation_observed_after_maximum_delay_terminal_no_retry',
  RETRY_DISPOSITION: 'blocked_retry_disposition_invalid_or_inconsistent',
  RETRY_REQUESTED: 'blocked_retry_forbidden_after_attempt_or_unknown',
  TERMINAL_NO_RETRY: 'blocked_operation_already_committed_attempted_or_unknown_no_retry',
  CONFIRMATION_INSUFFICIENT: 'blocked_attempted_unconfirmed_terminal_no_retry',
  RECEIPT_PRIVATE_FIELDS: 'blocked_redacted_receipt_contains_private_or_extra_fields',
  RECEIPT_CONTRACT: 'blocked_redacted_receipt_contract_mismatch',
  RECEIPT_SEMANTICS: 'blocked_redacted_receipt_semantic_mismatch',
});

const STRONG_CONFIRMATION_MARKERS = new Set([
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MARKER.SENT_MARKER_WITHOUT_NEW_AUDIO_BUBBLE,
]);

const enumSet = (values) => new Set(Object.values(values));
const SOURCE_RECENCIES = enumSet(WELCOME_AUDIO_SOURCE_RECENCY);
const SOURCE_BINDINGS = enumSet(WELCOME_AUDIO_SOURCE_BINDING);
const BUSINESS_ELIGIBILITIES = enumSet(WELCOME_AUDIO_BUSINESS_ELIGIBILITY);
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

const CONFIRMED_TERMINAL_COMPATIBLE_BLOCKERS = new Set([
  WELCOME_AUDIO_GUARD_REASON.APPROVAL_FRESHNESS,
  WELCOME_AUDIO_GUARD_REASON.SURFACE_OBSERVATION,
  WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE,
  WELCOME_AUDIO_GUARD_REASON.SOURCE_CALENDAR_WINDOW,
  WELCOME_AUDIO_GUARD_REASON.SOURCE_BUCKET,
  WELCOME_AUDIO_GUARD_REASON.BINDING_OBSERVATION,
  WELCOME_AUDIO_GUARD_REASON.ELIGIBILITY_OBSERVATION,
  WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW_OBSERVATION,
  WELCOME_AUDIO_GUARD_REASON.CONTEXT_FRESHNESS,
  WELCOME_AUDIO_GUARD_REASON.DEDUPE_FRESHNESS,
  WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_FRESHNESS,
  WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
]);

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

const WELCOME_AUDIO_INPUT_ROOT_FIELDS = Object.freeze([
  'adapter_version',
  'contract_version',
  'canonical_operation_sha256',
  'operation',
  'approval',
  'execution_surface',
  'follower_evidence',
  'binding',
  'eligibility',
  'asset',
  'context',
  'dedupe',
  'effect_claim',
  'execution',
  'confirmation',
]);

const WELCOME_AUDIO_INPUT_SECTION_FIELDS = Object.freeze({
  operation: Object.freeze([
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'source_event_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'expected_send_count',
    'confirmation_max_delay_ms',
    'canonical_operation_sha256',
  ]),
  approval: Object.freeze([
    'status',
    'checked_at',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'source_event_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'source_recency_max_age_ms',
    'expected_send_count',
    'confirmation_max_delay_ms',
    'canonical_operation_sha256',
  ]),
  execution_surface: Object.freeze([
    'surface',
    'surface_detail',
    'browser',
    'browser_mode',
    'isolation',
    'upload_route',
    'private_browsing',
    'chrome_upload_attempted',
    'in_app_browser_upload_attempted',
    'observed_at',
  ]),
  follower_evidence: Object.freeze([
    'source_recency',
    'observed_at',
    'time_bucket',
    'source_recency_max_age_ms',
    'source_event_anchor_sha256',
  ]),
  binding: Object.freeze([
    'source_binding',
    'source_to_profile',
    'profile_to_thread',
    'follows_owner',
    'ambiguity',
    'source_event_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'observed_at',
  ]),
  eligibility: Object.freeze([
    'business_eligibility',
    'audio_capability',
    'composer_capability',
    'attachment_capability',
    'text_fallback',
    'observed_at',
  ]),
  asset: Object.freeze([
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'asset_preview_binding',
    'preview_status',
    'preview_audio_asset_id',
    'preview_audio_asset_sha256',
    'preview_thread_anchor_sha256',
    'preview_observed_at',
  ]),
  context: Object.freeze([
    'status',
    'checked_at',
    'central_repo_head',
    'expected_central_repo_head',
    'mission_id',
    'expected_mission_id',
    'mission_status',
    'operation_id',
    'approval_packet_id',
    'confirmation_max_delay_ms',
    'canonical_operation_sha256',
  ]),
  dedupe: Object.freeze([
    'status',
    'already_welcomed_status',
    'send_history_status',
    'checked_at',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_sha256',
  ]),
  effect_claim: Object.freeze([
    'status',
    'claim_result',
    'claim_token_status',
    'atomic',
    'permanent',
    'claimed_at',
    'claim_owner_id',
    'claim_token_id',
    'registry_revision',
    'attempt_id',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'canonical_operation_sha256',
  ]),
  execution: Object.freeze([
    'attempt_budget',
    'send_attempt_count',
    'attempt_state',
    'send_claim',
    'retry_disposition',
    'retry_requested',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'canonical_operation_sha256',
    'claim_owner_id',
    'claim_token_id',
    'claim_registry_revision',
    'attempt_id',
    'claim_token_consumed_at',
    'attempted_at',
  ]),
  confirmation: Object.freeze([
    'confirmation_marker',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'canonical_operation_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'approved_audio_asset_sha256',
    'claim_owner_id',
    'claim_token_id',
    'claim_registry_revision',
    'attempt_id',
    'bound_to_current_operation',
    'checked_at',
  ]),
});

const WELCOME_AUDIO_SOURCE_PROVENANCE_FIELDS = Object.freeze([
  'source_class',
  'manifest_digest_sha256',
  'campaign_interval_digest_sha256',
  'manifest_record_index',
  'manifest_record_count',
  'source_event_anchor_sha256',
]);

const WELCOME_AUDIO_UI_ATTESTED_INPUT_SECTION_FIELDS = Object.freeze({
  ...WELCOME_AUDIO_INPUT_SECTION_FIELDS,
  operation: Object.freeze([
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'source_evidence_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'expected_send_count',
    'confirmation_max_delay_ms',
    'canonical_operation_sha256',
  ]),
  approval: Object.freeze([
    'status',
    'checked_at',
    'operation_id',
    'approval_packet_id',
    'mission_id',
    'source_evidence_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_sha256',
    'source_evidence_freshness_max_age_ms',
    'expected_send_count',
    'confirmation_max_delay_ms',
    'canonical_operation_sha256',
  ]),
  follower_evidence: Object.freeze([
    'source_recency',
    'evidence_observed_at',
    'time_bucket_attestation',
    'source_evidence_freshness_max_age_ms',
    'source_evidence_anchor_sha256',
    'exact_follow_timestamp_claimed',
    'provider_event_id_claimed',
    'campaign_membership_claimed',
  ]),
  binding: Object.freeze([
    'source_binding',
    'source_to_profile',
    'profile_to_thread',
    'follows_owner',
    'ambiguity',
    'source_evidence_anchor_sha256',
    'profile_anchor_sha256',
    'candidate_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'observed_at',
  ]),
});

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROVENANCE_FIELDS = Object.freeze([
  'source_class',
  'source_evidence_schema_version',
  'source_evidence_sha256',
  'source_evidence_anchor_sha256',
  'source_record_ordinal',
  'source_record_cap',
  'time_bucket_attestation',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
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
  if (!Number.isFinite(nowMs) || nowMs < 0) return null;
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

const inspectPlainDataObject = (value) => {
  try {
    if (
      value === null
      || typeof value !== 'object'
      || Array.isArray(value)
      || nodeUtilTypes.isProxy(value)
    ) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return null;
    const values = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      values[key] = descriptor.value;
    }
    return Object.freeze({
      keys: Object.freeze(keys),
      values: Object.freeze(values),
    });
  } catch {
    return null;
  }
};

const inspectPlainDataArray = (value) => {
  try {
    if (!Array.isArray(value) || nodeUtilTypes.isProxy(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const lengthDescriptor = descriptors.length;
    if (
      Object.getPrototypeOf(value) !== Array.prototype
      || !lengthDescriptor
      || !Object.hasOwn(lengthDescriptor, 'value')
      || lengthDescriptor.get !== undefined
      || lengthDescriptor.set !== undefined
      || !Number.isInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || keys.length !== lengthDescriptor.value + 1
    ) return null;
    const values = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
        || (descriptor.value !== null
          && !['string', 'number', 'boolean', 'undefined'].includes(typeof descriptor.value))
      ) return null;
      values.push(descriptor.value);
    }
    if (keys.some((key) => (
      key !== 'length'
      && (typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(key))
    ))) return null;
    return Object.freeze(values);
  } catch {
    return null;
  }
};

const primitiveDataValue = (value) => value === null
  || ['string', 'number', 'boolean', 'undefined'].includes(typeof value);

const exactFieldSet = (keys, fields) => keys.length === fields.length
  && keys.every((key) => fields.includes(key));

const operationInputGraphIsSafe = (input) => {
  const root = inspectPlainDataObject(input);
  if (!root) return false;
  for (const [key, value] of Object.entries(root.values)) {
    if (primitiveDataValue(value)) continue;
    if (typeof value === 'function') return false;
    if (key === 'receipt') {
      const receipt = inspectPlainDataObject(value);
      if (!receipt) return false;
      for (const [receiptKey, receiptValue] of Object.entries(receipt.values)) {
        if (receiptKey === 'blocker_codes') {
          if (!inspectPlainDataArray(receiptValue)) return false;
        } else if (!primitiveDataValue(receiptValue)) return false;
      }
      continue;
    }
    const section = inspectPlainDataObject(value);
    if (!section) return false;
    if (Object.values(section.values).some((sectionValue) => !primitiveDataValue(sectionValue))) {
      return false;
    }
  }
  return true;
};

const inspectEvaluationOptions = (options, allowedFields) => {
  const inspected = inspectPlainDataObject(options);
  if (
    !inspected
    || inspected.keys.some((key) => !allowedFields.includes(key))
    || Object.values(inspected.values).some((value) => !primitiveDataValue(value))
  ) return null;
  return inspected.values;
};

const blockedUnsafeInputEvaluation = () => ({
  ok: false,
  state_valid: false,
  phase: WELCOME_AUDIO_GUARD_PHASE.BLOCKED,
  claim_allowed: false,
  send_ready: false,
  send_allowed: false,
  one_shot_consumer_required: false,
  terminal: false,
  decision: WELCOME_AUDIO_GUARD_DECISION.BLOCKED,
  reason: WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE,
  blockers: [WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE],
});

const validateWelcomeAudioInputShape = (input) => {
  if (!operationInputGraphIsSafe(input)) return false;
  const uiAttested = input?.adapter_version === WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;
  const sourceProvenancePresent = input?.source_provenance !== undefined;
  const baseRootFields = sourceProvenancePresent
    ? [...WELCOME_AUDIO_INPUT_ROOT_FIELDS, 'source_provenance']
    : WELCOME_AUDIO_INPUT_ROOT_FIELDS;
  const rootFields = input?.receipt === undefined
    ? baseRootFields
    : [...baseRootFields, 'receipt'];
  if (!exactObjectKeys(input, rootFields)) return false;
  if (uiAttested && !sourceProvenancePresent) return false;
  const sectionFields = uiAttested
    ? WELCOME_AUDIO_UI_ATTESTED_INPUT_SECTION_FIELDS
    : WELCOME_AUDIO_INPUT_SECTION_FIELDS;
  const provenanceFields = uiAttested
    ? WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROVENANCE_FIELDS
    : WELCOME_AUDIO_SOURCE_PROVENANCE_FIELDS;
  return Object.entries(sectionFields)
    .every(([section, fields]) => exactObjectKeys(input[section], fields))
    && (!sourceProvenancePresent || exactObjectKeys(
      input.source_provenance,
      provenanceFields,
    ));
};

const canonicalLegacyOperationProjection = (input) => ({
  projection_version: WELCOME_AUDIO_CANONICAL_OPERATION_PROJECTION_VERSION,
  adapter_version: input?.adapter_version ?? null,
  contract_version: input?.contract_version ?? null,
  operation: {
    operation_id: input?.operation?.operation_id ?? null,
    approval_packet_id: input?.operation?.approval_packet_id ?? null,
    mission_id: input?.operation?.mission_id ?? null,
    source_event_anchor_sha256: input?.operation?.source_event_anchor_sha256 ?? null,
    profile_anchor_sha256: input?.operation?.profile_anchor_sha256 ?? null,
    candidate_anchor_sha256: input?.operation?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.operation?.thread_anchor_sha256 ?? null,
    owner_anchor_sha256: input?.operation?.owner_anchor_sha256 ?? null,
    approved_audio_asset_id: input?.operation?.approved_audio_asset_id ?? null,
    approved_audio_asset_sha256: input?.operation?.approved_audio_asset_sha256 ?? null,
    expected_send_count: input?.operation?.expected_send_count ?? null,
    confirmation_max_delay_ms: input?.operation?.confirmation_max_delay_ms ?? null,
  },
  approval: {
    status: input?.approval?.status ?? null,
    checked_at: input?.approval?.checked_at ?? null,
    operation_id: input?.approval?.operation_id ?? null,
    approval_packet_id: input?.approval?.approval_packet_id ?? null,
    mission_id: input?.approval?.mission_id ?? null,
    source_event_anchor_sha256: input?.approval?.source_event_anchor_sha256 ?? null,
    profile_anchor_sha256: input?.approval?.profile_anchor_sha256 ?? null,
    candidate_anchor_sha256: input?.approval?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.approval?.thread_anchor_sha256 ?? null,
    owner_anchor_sha256: input?.approval?.owner_anchor_sha256 ?? null,
    approved_audio_asset_id: input?.approval?.approved_audio_asset_id ?? null,
    approved_audio_asset_sha256: input?.approval?.approved_audio_asset_sha256 ?? null,
    source_recency_max_age_ms: input?.approval?.source_recency_max_age_ms ?? null,
    expected_send_count: input?.approval?.expected_send_count ?? null,
    confirmation_max_delay_ms: input?.approval?.confirmation_max_delay_ms ?? null,
  },
  execution_surface: {
    surface: input?.execution_surface?.surface ?? null,
    surface_detail: input?.execution_surface?.surface_detail ?? null,
    browser: input?.execution_surface?.browser ?? null,
    browser_mode: input?.execution_surface?.browser_mode ?? null,
    isolation: input?.execution_surface?.isolation ?? null,
    upload_route: input?.execution_surface?.upload_route ?? null,
    private_browsing: input?.execution_surface?.private_browsing ?? null,
    chrome_upload_attempted: input?.execution_surface?.chrome_upload_attempted ?? null,
    in_app_browser_upload_attempted:
      input?.execution_surface?.in_app_browser_upload_attempted ?? null,
    observed_at: input?.execution_surface?.observed_at ?? null,
  },
  follower_evidence: {
    source_recency: input?.follower_evidence?.source_recency ?? null,
    observed_at: input?.follower_evidence?.observed_at ?? null,
    time_bucket: input?.follower_evidence?.time_bucket ?? null,
    source_recency_max_age_ms: input?.follower_evidence?.source_recency_max_age_ms ?? null,
    source_event_anchor_sha256: input?.follower_evidence?.source_event_anchor_sha256 ?? null,
  },
  ...(input?.source_provenance === undefined ? {} : {
    source_provenance: {
      source_class: input?.source_provenance?.source_class ?? null,
      manifest_digest_sha256: input?.source_provenance?.manifest_digest_sha256 ?? null,
      campaign_interval_digest_sha256:
        input?.source_provenance?.campaign_interval_digest_sha256 ?? null,
      manifest_record_index: input?.source_provenance?.manifest_record_index ?? null,
      manifest_record_count: input?.source_provenance?.manifest_record_count ?? null,
      source_event_anchor_sha256:
        input?.source_provenance?.source_event_anchor_sha256 ?? null,
    },
  }),
  binding: {
    source_binding: input?.binding?.source_binding ?? null,
    source_to_profile: input?.binding?.source_to_profile ?? null,
    profile_to_thread: input?.binding?.profile_to_thread ?? null,
    follows_owner: input?.binding?.follows_owner ?? null,
    ambiguity: input?.binding?.ambiguity ?? null,
    source_event_anchor_sha256: input?.binding?.source_event_anchor_sha256 ?? null,
    profile_anchor_sha256: input?.binding?.profile_anchor_sha256 ?? null,
    candidate_anchor_sha256: input?.binding?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.binding?.thread_anchor_sha256 ?? null,
    owner_anchor_sha256: input?.binding?.owner_anchor_sha256 ?? null,
    observed_at: input?.binding?.observed_at ?? null,
  },
  eligibility: {
    business_eligibility: input?.eligibility?.business_eligibility ?? null,
    audio_capability: input?.eligibility?.audio_capability ?? null,
    composer_capability: input?.eligibility?.composer_capability ?? null,
    attachment_capability: input?.eligibility?.attachment_capability ?? null,
    text_fallback: input?.eligibility?.text_fallback ?? null,
    observed_at: input?.eligibility?.observed_at ?? null,
  },
  asset: {
    approved_audio_asset_id: input?.asset?.approved_audio_asset_id ?? null,
    approved_audio_asset_sha256: input?.asset?.approved_audio_asset_sha256 ?? null,
    asset_preview_binding: input?.asset?.asset_preview_binding ?? null,
    preview_status: input?.asset?.preview_status ?? null,
    preview_audio_asset_id: input?.asset?.preview_audio_asset_id ?? null,
    preview_audio_asset_sha256: input?.asset?.preview_audio_asset_sha256 ?? null,
    preview_thread_anchor_sha256: input?.asset?.preview_thread_anchor_sha256 ?? null,
    preview_observed_at: input?.asset?.preview_observed_at ?? null,
  },
  context: {
    status: input?.context?.status ?? null,
    checked_at: input?.context?.checked_at ?? null,
    operation_id: input?.context?.operation_id ?? null,
    approval_packet_id: input?.context?.approval_packet_id ?? null,
    mission_id: input?.context?.mission_id ?? null,
    expected_mission_id: input?.context?.expected_mission_id ?? null,
    mission_status: input?.context?.mission_status ?? null,
    central_repo_head: input?.context?.central_repo_head ?? null,
    expected_central_repo_head: input?.context?.expected_central_repo_head ?? null,
    confirmation_max_delay_ms: input?.context?.confirmation_max_delay_ms ?? null,
  },
  dedupe: {
    status: input?.dedupe?.status ?? null,
    already_welcomed_status: input?.dedupe?.already_welcomed_status ?? null,
    send_history_status: input?.dedupe?.send_history_status ?? null,
    checked_at: input?.dedupe?.checked_at ?? null,
    operation_id: input?.dedupe?.operation_id ?? null,
    approval_packet_id: input?.dedupe?.approval_packet_id ?? null,
    mission_id: input?.dedupe?.mission_id ?? null,
    candidate_anchor_sha256: input?.dedupe?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.dedupe?.thread_anchor_sha256 ?? null,
    owner_anchor_sha256: input?.dedupe?.owner_anchor_sha256 ?? null,
    approved_audio_asset_sha256: input?.dedupe?.approved_audio_asset_sha256 ?? null,
  },
  effect_claim_static_binding: {
    operation_id: input?.effect_claim?.operation_id ?? null,
    approval_packet_id: input?.effect_claim?.approval_packet_id ?? null,
    mission_id: input?.effect_claim?.mission_id ?? null,
    candidate_anchor_sha256: input?.effect_claim?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.effect_claim?.thread_anchor_sha256 ?? null,
    owner_anchor_sha256: input?.effect_claim?.owner_anchor_sha256 ?? null,
    approved_audio_asset_id: input?.effect_claim?.approved_audio_asset_id ?? null,
    approved_audio_asset_sha256: input?.effect_claim?.approved_audio_asset_sha256 ?? null,
  },
  execution_static_binding: {
    attempt_budget: input?.execution?.attempt_budget ?? null,
    retry_requested: input?.execution?.retry_requested ?? null,
    operation_id: input?.execution?.operation_id ?? null,
    approval_packet_id: input?.execution?.approval_packet_id ?? null,
    mission_id: input?.execution?.mission_id ?? null,
  },
  confirmation_static_binding: {
    operation_id: input?.confirmation?.operation_id ?? null,
    approval_packet_id: input?.confirmation?.approval_packet_id ?? null,
    mission_id: input?.confirmation?.mission_id ?? null,
    candidate_anchor_sha256: input?.confirmation?.candidate_anchor_sha256 ?? null,
    thread_anchor_sha256: input?.confirmation?.thread_anchor_sha256 ?? null,
    approved_audio_asset_sha256: input?.confirmation?.approved_audio_asset_sha256 ?? null,
  },
});

const canonicalUiAttestedOperationProjection = (input) => {
  const legacy = canonicalLegacyOperationProjection(input);
  return {
    projection_version: WELCOME_AUDIO_UI_ATTESTED_CANONICAL_OPERATION_PROJECTION_VERSION,
    adapter_version: input?.adapter_version ?? null,
    contract_version: input?.contract_version ?? null,
    operation: {
      operation_id: input?.operation?.operation_id ?? null,
      approval_packet_id: input?.operation?.approval_packet_id ?? null,
      mission_id: input?.operation?.mission_id ?? null,
      source_evidence_anchor_sha256:
        input?.operation?.source_evidence_anchor_sha256 ?? null,
      profile_anchor_sha256: input?.operation?.profile_anchor_sha256 ?? null,
      candidate_anchor_sha256: input?.operation?.candidate_anchor_sha256 ?? null,
      thread_anchor_sha256: input?.operation?.thread_anchor_sha256 ?? null,
      owner_anchor_sha256: input?.operation?.owner_anchor_sha256 ?? null,
      approved_audio_asset_id: input?.operation?.approved_audio_asset_id ?? null,
      approved_audio_asset_sha256: input?.operation?.approved_audio_asset_sha256 ?? null,
      expected_send_count: input?.operation?.expected_send_count ?? null,
      confirmation_max_delay_ms: input?.operation?.confirmation_max_delay_ms ?? null,
    },
    approval: {
      status: input?.approval?.status ?? null,
      checked_at: input?.approval?.checked_at ?? null,
      operation_id: input?.approval?.operation_id ?? null,
      approval_packet_id: input?.approval?.approval_packet_id ?? null,
      mission_id: input?.approval?.mission_id ?? null,
      source_evidence_anchor_sha256:
        input?.approval?.source_evidence_anchor_sha256 ?? null,
      profile_anchor_sha256: input?.approval?.profile_anchor_sha256 ?? null,
      candidate_anchor_sha256: input?.approval?.candidate_anchor_sha256 ?? null,
      thread_anchor_sha256: input?.approval?.thread_anchor_sha256 ?? null,
      owner_anchor_sha256: input?.approval?.owner_anchor_sha256 ?? null,
      approved_audio_asset_id: input?.approval?.approved_audio_asset_id ?? null,
      approved_audio_asset_sha256: input?.approval?.approved_audio_asset_sha256 ?? null,
      source_evidence_freshness_max_age_ms:
        input?.approval?.source_evidence_freshness_max_age_ms ?? null,
      expected_send_count: input?.approval?.expected_send_count ?? null,
      confirmation_max_delay_ms: input?.approval?.confirmation_max_delay_ms ?? null,
    },
    execution_surface: legacy.execution_surface,
    follower_evidence: {
      source_recency: input?.follower_evidence?.source_recency ?? null,
      evidence_observed_at: input?.follower_evidence?.evidence_observed_at ?? null,
      time_bucket_attestation: input?.follower_evidence?.time_bucket_attestation ?? null,
      source_evidence_freshness_max_age_ms:
        input?.follower_evidence?.source_evidence_freshness_max_age_ms ?? null,
      source_evidence_anchor_sha256:
        input?.follower_evidence?.source_evidence_anchor_sha256 ?? null,
      exact_follow_timestamp_claimed:
        input?.follower_evidence?.exact_follow_timestamp_claimed ?? null,
      provider_event_id_claimed:
        input?.follower_evidence?.provider_event_id_claimed ?? null,
      campaign_membership_claimed:
        input?.follower_evidence?.campaign_membership_claimed ?? null,
    },
    source_provenance: {
      source_class: input?.source_provenance?.source_class ?? null,
      source_evidence_schema_version:
        input?.source_provenance?.source_evidence_schema_version ?? null,
      source_evidence_sha256: input?.source_provenance?.source_evidence_sha256 ?? null,
      source_evidence_anchor_sha256:
        input?.source_provenance?.source_evidence_anchor_sha256 ?? null,
      source_record_ordinal: input?.source_provenance?.source_record_ordinal ?? null,
      source_record_cap: input?.source_provenance?.source_record_cap ?? null,
      time_bucket_attestation:
        input?.source_provenance?.time_bucket_attestation ?? null,
      exact_follow_timestamp_claimed:
        input?.source_provenance?.exact_follow_timestamp_claimed ?? null,
      provider_event_id_claimed:
        input?.source_provenance?.provider_event_id_claimed ?? null,
      campaign_membership_claimed:
        input?.source_provenance?.campaign_membership_claimed ?? null,
    },
    binding: {
      source_binding: input?.binding?.source_binding ?? null,
      source_to_profile: input?.binding?.source_to_profile ?? null,
      profile_to_thread: input?.binding?.profile_to_thread ?? null,
      follows_owner: input?.binding?.follows_owner ?? null,
      ambiguity: input?.binding?.ambiguity ?? null,
      source_evidence_anchor_sha256:
        input?.binding?.source_evidence_anchor_sha256 ?? null,
      profile_anchor_sha256: input?.binding?.profile_anchor_sha256 ?? null,
      candidate_anchor_sha256: input?.binding?.candidate_anchor_sha256 ?? null,
      thread_anchor_sha256: input?.binding?.thread_anchor_sha256 ?? null,
      owner_anchor_sha256: input?.binding?.owner_anchor_sha256 ?? null,
      observed_at: input?.binding?.observed_at ?? null,
    },
    eligibility: legacy.eligibility,
    asset: legacy.asset,
    context: legacy.context,
    dedupe: legacy.dedupe,
    effect_claim_static_binding: legacy.effect_claim_static_binding,
    execution_static_binding: legacy.execution_static_binding,
    confirmation_static_binding: legacy.confirmation_static_binding,
  };
};

const canonicalOperationProjection = (input) => (
  input?.adapter_version === WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION
    ? canonicalUiAttestedOperationProjection(input)
    : canonicalLegacyOperationProjection(input)
);

const buildWelcomeAudioCanonicalOperationDigest = (input) => (
  operationInputGraphIsSafe(input)
    ? createHash('sha256')
      .update(JSON.stringify(canonicalOperationProjection(input)), 'utf8')
      .digest('hex')
    : null
);

const receiptEnum = (value, allowed) => value === WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL
  || allowed.has(value);

const receiptHasPublicTerminalSignal = (receipt) => (
  receipt.effect_claim === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
  || (CLAIM_RESULTS.has(receipt.claim_result)
    && receipt.claim_result !== WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED)
  || (CLAIM_TOKEN_STATUSES.has(receipt.claim_token_status)
    && receipt.claim_token_status !== WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED)
  || receipt.send_attempt_count === 1
  || (ATTEMPT_STATES.has(receipt.attempt_state)
    && receipt.attempt_state !== WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED)
  || (SEND_CLAIMS.has(receipt.send_claim)
    && receipt.send_claim !== WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED)
  || STRONG_CONFIRMATION_MARKERS.has(receipt.confirmation_marker)
);

const validateReceiptSemantics = (receipt) => {
  const blockers = receipt.blocker_codes;
  const uniqueBlockers = new Set(blockers);
  const phaseDecisionValid = (
    receipt.phase === WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
      && receipt.decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
  ) || (
    receipt.phase === WELCOME_AUDIO_GUARD_PHASE.SEND_READY
      && receipt.decision === WELCOME_AUDIO_GUARD_DECISION.READY
  ) || (
    receipt.phase === WELCOME_AUDIO_GUARD_PHASE.TERMINAL
      && [
        WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL,
        WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL,
      ].includes(receipt.decision)
  ) || (
    receipt.phase === WELCOME_AUDIO_GUARD_PHASE.BLOCKED
      && receipt.decision === WELCOME_AUDIO_GUARD_DECISION.BLOCKED
  );
  const commonValid = receipt.send_allowed === false
    && phaseDecisionValid
    && receipt.one_shot_consumer_required === receipt.send_ready
    && uniqueBlockers.size === blockers.length
    && receipt.claim_allowed === (
      receipt.phase === WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
      && receipt.decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    )
    && receipt.send_ready === (
      receipt.phase === WELCOME_AUDIO_GUARD_PHASE.SEND_READY
      && receipt.decision === WELCOME_AUDIO_GUARD_DECISION.READY
    )
    && receipt.terminal === (receipt.phase === WELCOME_AUDIO_GUARD_PHASE.TERMINAL);
  if (!commonValid) return false;

  const exactSourceEvidence = (
    receipt.source_recency === WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT
      && receipt.source_binding === WELCOME_AUDIO_SOURCE_BINDING.EXACT
      && receipt.business_eligibility === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.RECENT_FOLLOWER
  ) || (
    receipt.source_recency === WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG
      && receipt.source_binding === WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG
      && receipt.business_eligibility
        === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER
  ) || (
    receipt.source_recency === WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH
      && receipt.source_binding === WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED
      && receipt.business_eligibility
        === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER
  );
  const claimAssetEvidence = [
    WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG,
    WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH,
  ].includes(receipt.source_recency)
    ? receipt.asset_preview_binding
      === WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE
    : receipt.asset_preview_binding === WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT;
  const exactPreAttemptEvidence = receipt.expected_send_count === 1
    && receipt.attempt_budget === 1
    && receipt.send_attempt_count === 0
    && receipt.surface === WELCOME_AUDIO_SURFACE.STATUS
    && receipt.surface_detail === WELCOME_AUDIO_SURFACE.DETAIL
    && exactSourceEvidence
    && receipt.audio_capability === WELCOME_AUDIO_AUDIO_CAPABILITY.PRESENT_AND_USABLE
    && claimAssetEvidence
    && receipt.context_status === 'fresh_exact_central_mission_context'
    && receipt.dedupe_status === 'clear_no_prior_welcome_or_attempt';

  if (receipt.decision === WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM) {
    return exactPreAttemptEvidence
      && receipt.effect_claim === WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED
      && receipt.claim_result === WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED
      && receipt.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED
      && receipt.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED
      && receipt.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
      && receipt.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && receipt.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
      && blockers.length === 0;
  }

  if (receipt.decision === WELCOME_AUDIO_GUARD_DECISION.READY) {
    return exactPreAttemptEvidence
      && receipt.asset_preview_binding === WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT
      && receipt.effect_claim === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
      && receipt.claim_result === WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION
      && receipt.claim_token_status
        === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION
      && receipt.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED
      && receipt.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
      && receipt.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && receipt.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
      && blockers.length === 0;
  }

  if (receipt.decision === WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL) {
    return receipt.expected_send_count === 1
      && receipt.attempt_budget === 1
      && receipt.send_attempt_count === 1
      && receipt.effect_claim === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
      && receipt.claim_result === WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION
      && receipt.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED
      && receipt.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
      && receipt.send_claim === WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT
      && STRONG_CONFIRMATION_MARKERS.has(receipt.confirmation_marker)
      && receipt.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && blockers.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY)
      && blockers.every((reason) => CONFIRMED_TERMINAL_COMPATIBLE_BLOCKERS.has(reason));
  }

  if (receipt.decision === WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL) {
    const publicTerminalSignal = receiptHasPublicTerminalSignal(receipt);
    const publicEffectClaimSignal = receipt.effect_claim
        === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
      || (CLAIM_RESULTS.has(receipt.claim_result)
        && receipt.claim_result !== WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED)
      || (CLAIM_TOKEN_STATUSES.has(receipt.claim_token_status)
        && receipt.claim_token_status !== WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED);
    const evidenceReasonCoherent = (
      blockers.includes(WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY)
        && publicEffectClaimSignal
    ) || (
      blockers.includes(WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT)
        && publicTerminalSignal
    ) || (
      blockers.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE)
        && !publicTerminalSignal
    );
    const everyEvidenceReasonCoherent = (
      !blockers.includes(WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY)
        || publicEffectClaimSignal
    ) && (
      !blockers.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE)
        || !publicTerminalSignal
    );
    return [null, 1].includes(receipt.expected_send_count)
      && [null, 1].includes(receipt.attempt_budget)
      && [null, 0, 1].includes(receipt.send_attempt_count)
      && receipt.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      && blockers.includes(WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY)
      && evidenceReasonCoherent
      && everyEvidenceReasonCoherent;
  }

  return receipt.decision === WELCOME_AUDIO_GUARD_DECISION.BLOCKED
    && receipt.phase === WELCOME_AUDIO_GUARD_PHASE.BLOCKED
    && receipt.claim_allowed === false
    && receipt.send_ready === false
    && receipt.terminal === false
    && blockers.length > 0
    && !receiptHasPublicTerminalSignal(receipt)
    && receipt.retry_disposition !== WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
    && !blockers.some((reason) => [
      WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY,
      WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_INSUFFICIENT,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE,
      WELCOME_AUDIO_GUARD_REASON.TERMINAL_NO_RETRY,
    ].includes(reason));
};

const receiptGraphIsSafe = (receipt) => {
  const inspected = inspectPlainDataObject(receipt);
  if (!inspected || !exactFieldSet(inspected.keys, REDACTED_RECEIPT_FIELDS)) return false;
  for (const [key, value] of Object.entries(inspected.values)) {
    if (key === 'blocker_codes') {
      if (!inspectPlainDataArray(value)) return false;
    } else if (!primitiveDataValue(value)) return false;
  }
  return true;
};

const sourceTripletMatchesLegacyContract = ({
  source_recency: sourceRecency,
  source_binding: sourceBinding,
  business_eligibility: businessEligibility,
}) => (
  sourceRecency === WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT
    && sourceBinding === WELCOME_AUDIO_SOURCE_BINDING.EXACT
    && businessEligibility === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.RECENT_FOLLOWER
) || (
  sourceRecency === WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG
    && sourceBinding === WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG
    && businessEligibility === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER
);

const sourceTripletMatchesUiAttestedContract = ({
  source_recency: sourceRecency,
  source_binding: sourceBinding,
  business_eligibility: businessEligibility,
}) => sourceRecency === WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH
  && sourceBinding === WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED
  && businessEligibility === WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER;

const validateReceiptShape = (receipt) => {
  if (!receiptGraphIsSafe(receipt)) {
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

  const legacyVersionTuple = receipt.receipt_schema_version
      === WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION
    && receipt.guard_contract_version === WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION
    && receipt.adapter_version === WELCOME_AUDIO_ADAPTER_VERSION;
  const uiAttestedVersionTuple = receipt.receipt_schema_version
      === WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION
    && receipt.guard_contract_version
      === WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION
    && receipt.adapter_version === WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;
  const sourceTripletMatchesVersion = (
    legacyVersionTuple && sourceTripletMatchesLegacyContract(receipt)
  ) || (
    uiAttestedVersionTuple && sourceTripletMatchesUiAttestedContract(receipt)
  );
  const fixedValid = (legacyVersionTuple || uiAttestedVersionTuple)
    && sourceTripletMatchesVersion
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
    && receiptEnum(receipt.business_eligibility, BUSINESS_ELIGIBILITIES)
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
  if (!fixedValid) {
    return { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_CONTRACT };
  }
  return validateReceiptSemantics(receipt)
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_GUARD_REASON.RECEIPT_SEMANTICS };
};

const evaluateWelcomeAudioOperation = (input, options = {}) => {
  const safeOptions = inspectEvaluationOptions(options, [
    'nowMs',
    'validateReceipt',
    'expectedCanonicalOperationSha256',
  ]);
  if (!safeOptions || !operationInputGraphIsSafe(input)) {
    return blockedUnsafeInputEvaluation();
  }
  const {
    nowMs = Date.now(),
    validateReceipt = true,
    expectedCanonicalOperationSha256 = null,
  } = safeOptions;
  const reasons = [];
  const inputShapeValid = validateWelcomeAudioInputShape(input);
  const operation = input?.operation ?? {};
  const approval = input?.approval ?? {};
  const surface = input?.execution_surface ?? {};
  const follower = input?.follower_evidence ?? {};
  const sourceProvenance = input?.source_provenance ?? null;
  const binding = input?.binding ?? {};
  const eligibility = input?.eligibility ?? {};
  const asset = input?.asset ?? {};
  const context = input?.context ?? {};
  const dedupe = input?.dedupe ?? {};
  const effectClaim = input?.effect_claim ?? {};
  const execution = input?.execution ?? {};
  const confirmation = input?.confirmation ?? {};
  const uiAttestedInput = input?.adapter_version === WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;

  if (!inputShapeValid) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.INPUT_SHAPE);

  if (![WELCOME_AUDIO_ADAPTER_VERSION, WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION]
    .includes(input?.adapter_version)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ADAPTER_VERSION);
  }
  const expectedGuardContractVersion = uiAttestedInput
    ? WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION
    : WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION;
  if (input?.contract_version !== expectedGuardContractVersion) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTRACT_VERSION);
  }

  const operationAnchors = [
    uiAttestedInput
      ? operation.source_evidence_anchor_sha256
      : operation.source_event_anchor_sha256,
    operation.profile_anchor_sha256,
    operation.candidate_anchor_sha256,
    operation.thread_anchor_sha256,
    operation.owner_anchor_sha256,
  ];
  if (!isOpaqueId(operation.operation_id)
    || !isOpaqueId(operation.approval_packet_id)
    || !isOpaqueId(operation.mission_id)
    || !isOpaqueId(operation.approved_audio_asset_id)
    || !isSha256(operation.approved_audio_asset_sha256)
    || !operationAnchors.every(isSha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.OPERATION_IDENTITY);
  }
  if (operation.expected_send_count !== 1) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EXPECTED_SEND_COUNT);
  }
  const confirmationMaximumDelayValid = operation.confirmation_max_delay_ms
      === WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    && approval.confirmation_max_delay_ms === WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    && context.confirmation_max_delay_ms === WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    && approval.confirmation_max_delay_ms === operation.confirmation_max_delay_ms
    && context.confirmation_max_delay_ms === operation.confirmation_max_delay_ms;
  if (!confirmationMaximumDelayValid) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_MAX_DELAY);
  }

  const approvalSourceAnchorMatches = uiAttestedInput
    ? sameSha256(
      approval.source_evidence_anchor_sha256,
      operation.source_evidence_anchor_sha256,
    )
    : sameSha256(approval.source_event_anchor_sha256, operation.source_event_anchor_sha256);
  const approvalSourceMaxAge = uiAttestedInput
    ? approval.source_evidence_freshness_max_age_ms
    : approval.source_recency_max_age_ms;
  const approvalValid = approval.status === 'approved_exact_single_send'
    && approval.expected_send_count === 1
    && sameCleanString(approval.operation_id, operation.operation_id)
    && sameCleanString(approval.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(approval.mission_id, operation.mission_id)
    && approvalSourceAnchorMatches
    && sameSha256(approval.profile_anchor_sha256, operation.profile_anchor_sha256)
    && sameSha256(approval.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(approval.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(approval.owner_anchor_sha256, operation.owner_anchor_sha256)
    && sameCleanString(approval.approved_audio_asset_id, operation.approved_audio_asset_id)
    && sameSha256(approval.approved_audio_asset_sha256, operation.approved_audio_asset_sha256)
    && isPositiveInteger(approvalSourceMaxAge)
    && approval.confirmation_max_delay_ms === operation.confirmation_max_delay_ms;
  if (!approvalValid) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.APPROVAL);
  if (!isFreshTimestamp(approval.checked_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.APPROVAL_FRESHNESS);
  }

  const computedCanonicalOperationSha256 = buildWelcomeAudioCanonicalOperationDigest(input);
  const canonicalOperationDigests = [
    input?.canonical_operation_sha256,
    operation.canonical_operation_sha256,
    approval.canonical_operation_sha256,
    context.canonical_operation_sha256,
    effectClaim.canonical_operation_sha256,
    execution.canonical_operation_sha256,
    confirmation.canonical_operation_sha256,
  ];
  const canonicalOperationValid = isSha256(expectedCanonicalOperationSha256)
    && sameSha256(expectedCanonicalOperationSha256, computedCanonicalOperationSha256)
    && canonicalOperationDigests.every((digest) => sameSha256(
      digest,
      computedCanonicalOperationSha256,
    ));
  if (!canonicalOperationValid) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CANONICAL_OPERATION);
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
  if (!isFreshTimestamp(surface.observed_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SURFACE_OBSERVATION);
  }

  const sealedBacklogSource = follower.source_recency
    === WELCOME_AUDIO_SOURCE_RECENCY.SEALED_PAUSED_CAMPAIGN_BACKLOG;
  const exactRecentSource = follower.source_recency === WELCOME_AUDIO_SOURCE_RECENCY.EXACT_RECENT;
  const uiAttestedSource = uiAttestedInput
    && follower.source_recency === WELCOME_AUDIO_SOURCE_RECENCY.UI_ATTESTED_CAPTURE_FRESH;
  if (!exactRecentSource && !sealedBacklogSource && !uiAttestedSource) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_RECENCY);
  }
  const sourceObservedAt = uiAttestedSource
    ? follower.evidence_observed_at
    : follower.observed_at;
  const observedAtMs = parseTimestamp(sourceObservedAt);
  const sourceFutureToleranceMs = uiAttestedSource
    ? 0
    : WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;
  if (observedAtMs === null || observedAtMs > nowMs + sourceFutureToleranceMs) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_TIMESTAMP);
  }
  const sourceFreshnessMaxAge = uiAttestedSource
    ? follower.source_evidence_freshness_max_age_ms
    : follower.source_recency_max_age_ms;
  const approvedSourceFreshnessMaxAge = uiAttestedSource
    ? approval.source_evidence_freshness_max_age_ms
    : approval.source_recency_max_age_ms;
  const sourceMaxAgeValid = isPositiveInteger(sourceFreshnessMaxAge)
    && sourceFreshnessMaxAge === approvedSourceFreshnessMaxAge
    && (!uiAttestedSource || sourceFreshnessMaxAge === WELCOME_AUDIO_CONTEXT_MAX_AGE_MS);
  if (!sourceMaxAgeValid) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE);
  }
  if (exactRecentSource) {
    if (observedAtMs === null
      || nowMs - observedAtMs > follower.source_recency_max_age_ms) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE);
    }
    const actualBucket = classifyRecentFollowerBucket(follower.observed_at, nowMs);
    if (!['today', 'previous_calendar_day'].includes(actualBucket)) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_CALENDAR_WINDOW);
    }
    if (follower.time_bucket !== actualBucket) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BUCKET);
    }
  } else if (sealedBacklogSource) {
    if (follower.time_bucket !== 'sealed_campaign_interval') {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BUCKET);
    }
    const sourceProvenanceValid = sourceProvenance !== null
      && sourceProvenance.source_class
        === WELCOME_AUDIO_SOURCE_CLASS.SEALED_PAUSED_CAMPAIGN_BACKLOG_MEMBER
      && isSha256(sourceProvenance.manifest_digest_sha256)
      && isSha256(sourceProvenance.campaign_interval_digest_sha256)
      && isSha256(sourceProvenance.source_event_anchor_sha256);
    if (!sourceProvenanceValid) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_PROVENANCE);
    }
    if (!Number.isInteger(sourceProvenance?.manifest_record_index)
      || !Number.isInteger(sourceProvenance?.manifest_record_count)
      || sourceProvenance.manifest_record_count < 1
      || sourceProvenance.manifest_record_count > 8
      || sourceProvenance.manifest_record_index < 0
      || sourceProvenance.manifest_record_index >= sourceProvenance.manifest_record_count) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_POSITION);
    }
    if (!sameSha256(
      sourceProvenance?.source_event_anchor_sha256,
      operation.source_event_anchor_sha256,
    )) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_BINDING);
    }
  } else if (uiAttestedSource) {
    if (observedAtMs === null || nowMs - observedAtMs > sourceFreshnessMaxAge) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MAX_AGE);
    }
    if (follower.time_bucket_attestation !== 'explicit_visible_not_exact_timestamp') {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BUCKET);
    }
    const sourceProvenanceValid = sourceProvenance !== null
      && sourceProvenance.source_class
        === WELCOME_AUDIO_SOURCE_CLASS.UI_ATTESTED_FOLLOWER_SOURCE_V1
      && sourceProvenance.source_evidence_schema_version
        === WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION
      && isSha256(sourceProvenance.source_evidence_sha256)
      && isSha256(sourceProvenance.source_evidence_anchor_sha256)
      && Number.isInteger(sourceProvenance.source_record_ordinal)
      && sourceProvenance.source_record_ordinal >= 1
      && sourceProvenance.source_record_ordinal <= 8
      && sourceProvenance.source_record_cap === 8
      && sourceProvenance.time_bucket_attestation
        === 'explicit_visible_not_exact_timestamp'
      && sourceProvenance.exact_follow_timestamp_claimed === false
      && sourceProvenance.provider_event_id_claimed === false
      && sourceProvenance.campaign_membership_claimed === false
      && follower.exact_follow_timestamp_claimed === false
      && follower.provider_event_id_claimed === false
      && follower.campaign_membership_claimed === false;
    if (!sourceProvenanceValid) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_PROVENANCE);
    }
    if (!sameSha256(
      sourceProvenance?.source_evidence_anchor_sha256,
      operation.source_evidence_anchor_sha256,
    ) || !sameSha256(
      follower.source_evidence_anchor_sha256,
      operation.source_evidence_anchor_sha256,
    )) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_MANIFEST_BINDING);
    }
  }
  if (!sealedBacklogSource && !uiAttestedSource && sourceProvenance !== null) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_PROVENANCE);
  }

  const expectedSourceBinding = uiAttestedSource
    ? WELCOME_AUDIO_SOURCE_BINDING.EXACT_UI_ATTESTED
    : sealedBacklogSource
      ? WELCOME_AUDIO_SOURCE_BINDING.EXACT_SEALED_BACKLOG
      : WELCOME_AUDIO_SOURCE_BINDING.EXACT;
  if (binding.source_binding !== expectedSourceBinding) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_BINDING);
  }
  if (binding.source_to_profile !== 'exact') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.SOURCE_TO_PROFILE);
  if (binding.profile_to_thread !== 'exact') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PROFILE_TO_THREAD);
  const followsOwnerEvidenceValid = binding.follows_owner
      === WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE.CURRENT_FOLLOWS_OWNER_CONFIRMED
    || (uiAttestedSource && binding.follows_owner
      === WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
        .RECENT_FOLLOW_EVENT_NO_EXPLICIT_CONTRADICTION);
  if (!followsOwnerEvidenceValid) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.FOLLOWS_OWNER);
  if (binding.ambiguity !== 'clear') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.IDENTITY_AMBIGUITY);

  const bindingAnchors = [
    uiAttestedSource
      ? follower.source_evidence_anchor_sha256
      : follower.source_event_anchor_sha256,
    uiAttestedSource
      ? binding.source_evidence_anchor_sha256
      : binding.source_event_anchor_sha256,
    binding.profile_anchor_sha256,
    binding.candidate_anchor_sha256,
    binding.thread_anchor_sha256,
    binding.owner_anchor_sha256,
  ];
  if (!bindingAnchors.every(isSha256)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PRIVATE_ANCHORS);
  const operationSourceAnchor = uiAttestedSource
    ? operation.source_evidence_anchor_sha256
    : operation.source_event_anchor_sha256;
  const followerSourceAnchor = uiAttestedSource
    ? follower.source_evidence_anchor_sha256
    : follower.source_event_anchor_sha256;
  const bindingSourceAnchor = uiAttestedSource
    ? binding.source_evidence_anchor_sha256
    : binding.source_event_anchor_sha256;
  const exactBinding = sameSha256(followerSourceAnchor, operationSourceAnchor)
    && sameSha256(bindingSourceAnchor, operationSourceAnchor)
    && sameSha256(binding.profile_anchor_sha256, operation.profile_anchor_sha256)
    && sameSha256(binding.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(binding.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(binding.owner_anchor_sha256, operation.owner_anchor_sha256);
  if (!exactBinding) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.BINDING_MISMATCH);
  if (!isFreshTimestamp(binding.observed_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.BINDING_OBSERVATION);
  }

  const expectedBusinessEligibility = uiAttestedSource
    ? WELCOME_AUDIO_BUSINESS_ELIGIBILITY.UI_ATTESTED_FOLLOWER
    : sealedBacklogSource
      ? WELCOME_AUDIO_BUSINESS_ELIGIBILITY.SEALED_BACKLOG_FOLLOWER
      : WELCOME_AUDIO_BUSINESS_ELIGIBILITY.RECENT_FOLLOWER;
  if (eligibility.business_eligibility !== expectedBusinessEligibility) {
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
  if (!isFreshTimestamp(eligibility.observed_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ELIGIBILITY_OBSERVATION);
  }

  if (!isOpaqueId(asset.approved_audio_asset_id) || !isSha256(asset.approved_audio_asset_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET);
  }
  if (!sameCleanString(asset.approved_audio_asset_id, approval.approved_audio_asset_id)
    || !sameSha256(asset.approved_audio_asset_sha256, approval.approved_audio_asset_sha256)
    || !sameCleanString(asset.approved_audio_asset_id, operation.approved_audio_asset_id)
    || !sameSha256(asset.approved_audio_asset_sha256, operation.approved_audio_asset_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_APPROVAL);
  }
  const exactAssetPreview = asset.asset_preview_binding
    === WELCOME_AUDIO_ASSET_PREVIEW_BINDING.EXACT;
  const preclaimPreuploadAsset = (sealedBacklogSource || uiAttestedSource)
    && asset.asset_preview_binding
      === WELCOME_AUDIO_ASSET_PREVIEW_BINDING.PREUPLOAD_APPROVED_FILE;
  if (!exactAssetPreview && !preclaimPreuploadAsset) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW);
  }
  const expectedPreviewStatus = preclaimPreuploadAsset
    ? 'approved_file_validated_before_upload'
    : 'verified_on_exact_bound_thread';
  if (asset.preview_status !== expectedPreviewStatus
    || !sameCleanString(asset.preview_audio_asset_id, asset.approved_audio_asset_id)
    || !sameSha256(asset.preview_audio_asset_sha256, asset.approved_audio_asset_sha256)
    || !sameSha256(asset.preview_thread_anchor_sha256, operation.thread_anchor_sha256)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.PREVIEW_BINDING);
  }
  if (!isFreshTimestamp(asset.preview_observed_at, nowMs)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW_OBSERVATION);
  }

  if (context.status !== 'fresh_exact_central_mission_context') addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTEXT_STATUS);
  if (!isFreshTimestamp(context.checked_at, nowMs)) addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONTEXT_FRESHNESS);
  if (!isGitHead(context.central_repo_head)
    || !sameCleanString(context.central_repo_head, context.expected_central_repo_head)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CENTRAL_HEAD);
  }
  if (!isOpaqueId(context.mission_id)
    || !sameCleanString(context.mission_id, context.expected_mission_id)
    || !sameCleanString(context.mission_id, operation.mission_id)
    || !sameCleanString(context.operation_id, operation.operation_id)
    || !sameCleanString(context.approval_packet_id, operation.approval_packet_id)
    || context.confirmation_max_delay_ms !== operation.confirmation_max_delay_ms
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

  const effectClaimOperationBindingMatches = sameCleanString(
    effectClaim.operation_id,
    operation.operation_id,
  )
    && sameCleanString(effectClaim.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(effectClaim.mission_id, operation.mission_id)
    && sameSha256(effectClaim.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(effectClaim.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(effectClaim.owner_anchor_sha256, operation.owner_anchor_sha256)
    && sameCleanString(effectClaim.approved_audio_asset_id, operation.approved_audio_asset_id)
    && sameSha256(
      effectClaim.approved_audio_asset_sha256,
      operation.approved_audio_asset_sha256,
    )
    && sameSha256(effectClaim.canonical_operation_sha256, computedCanonicalOperationSha256);

  const executionOperationBindingMatches = sameCleanString(
    execution.operation_id,
    operation.operation_id,
  )
    && sameCleanString(execution.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(execution.mission_id, operation.mission_id)
    && sameSha256(execution.canonical_operation_sha256, computedCanonicalOperationSha256);
  if (!executionOperationBindingMatches) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EXECUTION_BINDING);
  }

  const confirmationOperationBindingMatches = sameCleanString(
    confirmation.operation_id,
    operation.operation_id,
  )
    && sameCleanString(confirmation.approval_packet_id, operation.approval_packet_id)
    && sameCleanString(confirmation.mission_id, operation.mission_id)
    && sameSha256(confirmation.canonical_operation_sha256, computedCanonicalOperationSha256)
    && sameSha256(confirmation.candidate_anchor_sha256, operation.candidate_anchor_sha256)
    && sameSha256(confirmation.thread_anchor_sha256, operation.thread_anchor_sha256)
    && sameSha256(
      confirmation.approved_audio_asset_sha256,
      operation.approved_audio_asset_sha256,
    );
  if (!confirmationOperationBindingMatches) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING);
  }

  const neutralEffectClaimLifecycle = effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED
    && effectClaim.claim_result === WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED
    && effectClaim.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED
    && effectClaim.atomic === false
    && effectClaim.permanent === false
    && effectClaim.claimed_at == null
    && effectClaim.claim_owner_id == null
    && effectClaim.claim_token_id == null
    && effectClaim.registry_revision == null
    && effectClaim.attempt_id == null;
  const neutralExecutionLifecycle = execution.send_attempt_count === 0
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    && execution.claim_owner_id == null
    && execution.claim_token_id == null
    && execution.claim_registry_revision == null
    && execution.attempt_id == null
    && execution.claim_token_consumed_at == null
    && execution.attempted_at == null;
  const neutralConfirmationLifecycle = confirmation.confirmation_marker
      === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmation.claim_owner_id == null
    && confirmation.claim_token_id == null
    && confirmation.claim_registry_revision == null
    && confirmation.attempt_id == null
    && confirmation.bound_to_current_operation === false
    && confirmation.checked_at == null;
  const lifecycleNeutralExact = inputShapeValid
    && neutralEffectClaimLifecycle
    && neutralExecutionLifecycle
    && neutralConfirmationLifecycle;

  const explicitNonNeutral = (section, field, neutralValue) => Object.prototype
    .hasOwnProperty.call(section, field)
    && section[field] != null
    && section[field] !== neutralValue;
  const durableLifecycleEvidence = explicitNonNeutral(
    effectClaim,
    'status',
    WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED,
  )
    || effectClaim.atomic === true
    || effectClaim.permanent === true
    || effectClaim.claimed_at != null
    || effectClaim.claim_owner_id != null
    || effectClaim.claim_token_id != null
    || effectClaim.registry_revision != null
    || effectClaim.attempt_id != null
    || (Number.isFinite(execution.send_attempt_count) && execution.send_attempt_count > 0)
    || explicitNonNeutral(
      execution,
      'attempt_state',
      WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED,
    )
    || explicitNonNeutral(
      execution,
      'send_claim',
      WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED,
    )
    || explicitNonNeutral(
      execution,
      'retry_disposition',
      WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT,
    )
    || execution.claim_owner_id != null
    || execution.claim_token_id != null
    || execution.claim_registry_revision != null
    || execution.attempt_id != null
    || execution.claim_token_consumed_at != null
    || execution.attempted_at != null
    || explicitNonNeutral(
      confirmation,
      'confirmation_marker',
      WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
    )
    || confirmation.claim_owner_id != null
    || confirmation.claim_token_id != null
    || confirmation.claim_registry_revision != null
    || confirmation.attempt_id != null
    || confirmation.bound_to_current_operation === true
    || confirmation.checked_at != null;

  const neutralClaim = effectClaimOperationBindingMatches
    && neutralEffectClaimLifecycle;

  const claimBindingMatches = effectClaimOperationBindingMatches
    && effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && effectClaim.atomic === true
    && effectClaim.permanent === true
    && isOpaqueId(effectClaim.claim_owner_id)
    && isOpaqueId(effectClaim.claim_token_id)
    && isPositiveInteger(effectClaim.registry_revision)
    && isOpaqueId(effectClaim.attempt_id);

  const claimOwnedByExecution = claimBindingMatches
    && executionOperationBindingMatches
    && sameCleanString(execution.claim_owner_id, effectClaim.claim_owner_id)
    && sameCleanString(execution.claim_token_id, effectClaim.claim_token_id)
    && execution.claim_registry_revision === effectClaim.registry_revision
    && sameCleanString(execution.attempt_id, effectClaim.attempt_id);
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && !claimOwnedByExecution) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EXECUTION_BINDING);
  }

  const confirmationClaimBindingMatches = confirmationOperationBindingMatches
    && sameCleanString(confirmation.claim_owner_id, effectClaim.claim_owner_id)
    && sameCleanString(confirmation.claim_token_id, effectClaim.claim_token_id)
    && confirmation.claim_registry_revision === effectClaim.registry_revision
    && sameCleanString(confirmation.attempt_id, effectClaim.attempt_id);
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && !confirmationClaimBindingMatches) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING);
  }

  const neutralConfirmationClaimBinding = confirmationOperationBindingMatches
    && confirmation.claim_owner_id == null
    && confirmation.claim_token_id == null
    && confirmation.claim_registry_revision == null
    && confirmation.attempt_id == null;

  const preclaimState = inputShapeValid
    && canonicalOperationValid
    && lifecycleNeutralExact
    && neutralClaim
    && executionOperationBindingMatches
    && execution.send_attempt_count === 0
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    && execution.claim_owner_id == null
    && execution.claim_token_id == null
    && execution.claim_registry_revision == null
    && execution.attempt_id == null
    && execution.claim_token_consumed_at == null
    && execution.attempted_at == null
    && neutralConfirmationClaimBinding
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmation.bound_to_current_operation === false
    && confirmation.checked_at == null;

  const sendReadyState = inputShapeValid
    && canonicalOperationValid
    && claimOwnedByExecution
    && confirmationClaimBindingMatches
    && effectClaim.claim_result === WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION
    && effectClaim.claim_token_status
      === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.FRESH_UNCONSUMED_CURRENT_INVOCATION
    && isFreshTimestamp(effectClaim.claimed_at, nowMs)
    && execution.send_attempt_count === 0
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPT_COMMITTED
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
    && execution.claim_token_consumed_at == null
    && execution.attempted_at == null
    && confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmation.bound_to_current_operation === false
    && confirmation.checked_at == null;
  if (preclaimPreuploadAsset && !preclaimState) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ASSET_PREVIEW);
  }
  if (uiAttestedSource && !preclaimState) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY);
  }

  const claimAtMs = parseTimestamp(effectClaim.claimed_at);
  const tokenConsumedAtMs = parseTimestamp(execution.claim_token_consumed_at);
  const attemptedAtMs = parseTimestamp(execution.attempted_at);
  const confirmationAtMs = parseTimestamp(confirmation.checked_at);
  const requiredObservationAtMs = [
    approval.checked_at,
    surface.observed_at,
    sourceObservedAt,
    binding.observed_at,
    eligibility.observed_at,
    asset.preview_observed_at,
    context.checked_at,
    dedupe.checked_at,
  ].map(parseTimestamp);
  const claimFollowsRequiredObservations = claimAtMs !== null
    && requiredObservationAtMs.every((timestampMs) => timestampMs !== null)
    && requiredObservationAtMs.every((timestampMs) => claimAtMs >= timestampMs);
  const tokenConsumptionSequenceValid = claimAtMs !== null
    && tokenConsumedAtMs !== null
    && attemptedAtMs !== null
    && tokenConsumedAtMs >= claimAtMs
    && tokenConsumedAtMs <= attemptedAtMs
    && attemptedAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;

  const afterAttemptState = inputShapeValid
    && canonicalOperationValid
    && claimOwnedByExecution
    && confirmationClaimBindingMatches
    && effectClaim.claim_result === WELCOME_AUDIO_CLAIM_RESULT.FRESH_CURRENT_INVOCATION
    && effectClaim.claim_token_status === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED
    && claimFollowsRequiredObservations
    && execution.send_attempt_count === 1
    && execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
    && execution.retry_disposition === WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
    && tokenConsumptionSequenceValid;

  const nonCurrentClaimOutcome = inputShapeValid && (
    [
      WELCOME_AUDIO_CLAIM_RESULT.PREEXISTING_OR_REPLAYED,
      WELCOME_AUDIO_CLAIM_RESULT.STALE,
      WELCOME_AUDIO_CLAIM_RESULT.MISMATCH,
    ].includes(effectClaim.claim_result)
    || [
      WELCOME_AUDIO_CLAIM_TOKEN_STATUS.STALE,
      WELCOME_AUDIO_CLAIM_TOKEN_STATUS.MISMATCH,
    ].includes(effectClaim.claim_token_status)
  );

  const terminalSignal = inputShapeValid
    ? !lifecycleNeutralExact
    : durableLifecycleEvidence;
  const publicTerminalSignal = effectClaim.status
      === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    || (CLAIM_RESULTS.has(effectClaim.claim_result)
      && effectClaim.claim_result !== WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED)
    || (CLAIM_TOKEN_STATUSES.has(effectClaim.claim_token_status)
      && effectClaim.claim_token_status !== WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED)
    || execution.send_attempt_count === 1
    || (ATTEMPT_STATES.has(execution.attempt_state)
      && execution.attempt_state !== WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED)
    || (SEND_CLAIMS.has(execution.send_claim)
      && execution.send_claim !== WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED)
    || STRONG_CONFIRMATION_MARKERS.has(confirmation.confirmation_marker);

  if (!preclaimState && !terminalSignal) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.ATTEMPT_STATE);
  }
  if (terminalSignal && !claimBindingMatches) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_BINDING);
  }
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT) {
    if (!isFreshTimestamp(effectClaim.claimed_at, nowMs)) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_FRESHNESS);
    }
    if (!claimFollowsRequiredObservations) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_SEQUENCE);
    }
  }
  if (nonCurrentClaimOutcome
    || (!sendReadyState
      && !afterAttemptState
      && effectClaim.status
        === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT)) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_REENTRY);
  }
  if (effectClaim.status === WELCOME_AUDIO_EFFECT_CLAIM.PERMANENTLY_CLAIMED_BEFORE_ATTEMPT
    && !claimOwnedByExecution) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.EFFECT_CLAIM_OWNER);
  }

  const tokenConsumptionExpected = effectClaim.claim_token_status
      === WELCOME_AUDIO_CLAIM_TOKEN_STATUS.CONSUMED
    || execution.claim_token_consumed_at != null
    || execution.attempt_state === WELCOME_AUDIO_ATTEMPT_STATE.ATTEMPTED_TERMINAL
    || execution.send_attempt_count === 1
    || execution.send_claim !== WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED;
  if (tokenConsumptionExpected && !tokenConsumptionSequenceValid) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CLAIM_TOKEN_CONSUMPTION);
  }

  const strongConfirmation = STRONG_CONFIRMATION_MARKERS.has(confirmation.confirmation_marker);
  const confirmationStaticAndClaimBindingValid = confirmationClaimBindingMatches
    && confirmation.bound_to_current_operation === true;
  const confirmationTimestampOrdered = confirmationAtMs !== null
    && attemptedAtMs !== null
    && confirmationAtMs >= attemptedAtMs
    && confirmationAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;
  const confirmationWithinMaximumDelay = confirmationTimestampOrdered
    && Number.isInteger(operation.confirmation_max_delay_ms)
    && confirmationAtMs <= attemptedAtMs + operation.confirmation_max_delay_ms;
  const confirmationBound = strongConfirmation
    && confirmationStaticAndClaimBindingValid
    && confirmationMaximumDelayValid
    && confirmationWithinMaximumDelay;
  const unknownConfirmation = confirmation.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
    && confirmationClaimBindingMatches
    && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.ATTEMPTED_UNCONFIRMED
    && confirmation.bound_to_current_operation === false
    && confirmationAtMs !== null
    && attemptedAtMs !== null
    && confirmationAtMs >= attemptedAtMs
    && confirmationAtMs <= nowMs + WELCOME_AUDIO_FUTURE_CLOCK_TOLERANCE_MS;

  if (afterAttemptState && strongConfirmation && !confirmationBound) {
    if (!confirmationStaticAndClaimBindingValid) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_BINDING);
    }
    if (!confirmationTimestampOrdered) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_TIMESTAMP);
    } else if (confirmationMaximumDelayValid && !confirmationWithinMaximumDelay) {
      addReason(reasons, WELCOME_AUDIO_GUARD_REASON.CONFIRMATION_DELAY_EXCEEDED);
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
  if (terminalSignal
    && !(sendReadyState && reasons.length === 0)
    && execution.retry_disposition !== WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT) {
    addReason(reasons, WELCOME_AUDIO_GUARD_REASON.RETRY_DISPOSITION);
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
      && execution.send_claim === WELCOME_AUDIO_SEND_CLAIM.CONFIRMED_SENT
      && reasons.every((reason) => CONFIRMED_TERMINAL_COMPATIBLE_BLOCKERS.has(reason))) {
      decision = WELCOME_AUDIO_GUARD_DECISION.CONFIRMED_TERMINAL;
    } else {
      decision = WELCOME_AUDIO_GUARD_DECISION.UNKNOWN_TERMINAL;
      if (!publicTerminalSignal) {
        addReason(reasons, WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE);
      }
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
        WELCOME_AUDIO_GUARD_REASON.TERMINAL_EVIDENCE,
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
    const expectedReceipt = buildWelcomeAudioRedactedReceipt(input, {
      nowMs,
      expectedCanonicalOperationSha256,
    });
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

const buildWelcomeAudioRedactedReceipt = (input, options = {}) => {
  const safeOptions = inspectEvaluationOptions(options, [
    'nowMs',
    'expectedCanonicalOperationSha256',
  ]);
  const inputSafe = operationInputGraphIsSafe(input);
  const safeInput = inputSafe ? input : {};
  const {
    nowMs = Date.now(),
    expectedCanonicalOperationSha256 = null,
  } = safeOptions ?? {};
  const result = safeOptions && inputSafe
    ? evaluateWelcomeAudioOperation(safeInput, {
      nowMs,
      validateReceipt: false,
      expectedCanonicalOperationSha256,
    })
    : blockedUnsafeInputEvaluation();
  const blockedLifecycle = result.decision === WELCOME_AUDIO_GUARD_DECISION.BLOCKED;
  const uiAttested = safeInput?.adapter_version === WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION;
  const candidateSourceTriplet = Object.freeze({
    source_recency: safeEnum(safeInput?.follower_evidence?.source_recency, SOURCE_RECENCIES),
    source_binding: safeEnum(safeInput?.binding?.source_binding, SOURCE_BINDINGS),
    business_eligibility: safeEnum(
      safeInput?.eligibility?.business_eligibility,
      BUSINESS_ELIGIBILITIES,
    ),
  });
  const sourceTripletValid = uiAttested
    ? sourceTripletMatchesUiAttestedContract(candidateSourceTriplet)
    : sourceTripletMatchesLegacyContract(candidateSourceTriplet);
  const receiptSourceTriplet = sourceTripletValid
    ? candidateSourceTriplet
    : Object.freeze({
      source_recency: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
      source_binding: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
      business_eligibility: WELCOME_AUDIO_RECEIPT_INVALID_SENTINEL,
    });
  return {
    receipt_schema_version: uiAttested
      ? WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION
      : WELCOME_AUDIO_REDACTED_RECEIPT_SCHEMA_VERSION,
    guard_contract_version: uiAttested
      ? WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION
      : WELCOME_AUDIO_OPERATION_GUARD_CONTRACT_VERSION,
    adapter_version: uiAttested
      ? WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION
      : WELCOME_AUDIO_ADAPTER_VERSION,
    redaction_status: 'allowlist_only_no_private_fields',
    phase: result.phase,
    decision: result.decision,
    claim_allowed: result.claim_allowed,
    send_ready: result.send_ready,
    send_allowed: result.send_allowed,
    one_shot_consumer_required: result.one_shot_consumer_required,
    terminal: result.terminal,
    expected_send_count: safeAllowedInteger(safeInput?.operation?.expected_send_count, new Set([1])),
    attempt_budget: safeAllowedInteger(safeInput?.execution?.attempt_budget, new Set([1])),
    send_attempt_count: blockedLifecycle
      ? 0
      : safeAllowedInteger(safeInput?.execution?.send_attempt_count, new Set([0, 1])),
    surface: safeEnum(safeInput?.execution_surface?.surface, new Set([WELCOME_AUDIO_SURFACE.STATUS])),
    surface_detail: safeEnum(safeInput?.execution_surface?.surface_detail, new Set([WELCOME_AUDIO_SURFACE.DETAIL])),
    source_recency: receiptSourceTriplet.source_recency,
    source_binding: receiptSourceTriplet.source_binding,
    business_eligibility: receiptSourceTriplet.business_eligibility,
    audio_capability: safeEnum(safeInput?.eligibility?.audio_capability, AUDIO_CAPABILITIES),
    asset_preview_binding: safeEnum(safeInput?.asset?.asset_preview_binding, ASSET_PREVIEW_BINDINGS),
    context_status: safeEnum(safeInput?.context?.status, new Set(['fresh_exact_central_mission_context'])),
    dedupe_status: safeEnum(safeInput?.dedupe?.status, new Set(['clear_no_prior_welcome_or_attempt'])),
    effect_claim: blockedLifecycle
      ? WELCOME_AUDIO_EFFECT_CLAIM.UNCLAIMED
      : safeEnum(safeInput?.effect_claim?.status, EFFECT_CLAIMS),
    claim_result: blockedLifecycle
      ? WELCOME_AUDIO_CLAIM_RESULT.NOT_STARTED
      : safeEnum(safeInput?.effect_claim?.claim_result, CLAIM_RESULTS),
    claim_token_status: blockedLifecycle
      ? WELCOME_AUDIO_CLAIM_TOKEN_STATUS.NOT_ISSUED
      : safeEnum(safeInput?.effect_claim?.claim_token_status, CLAIM_TOKEN_STATUSES),
    attempt_state: blockedLifecycle
      ? WELCOME_AUDIO_ATTEMPT_STATE.NOT_ATTEMPTED
      : safeEnum(safeInput?.execution?.attempt_state, ATTEMPT_STATES),
    send_claim: blockedLifecycle
      ? WELCOME_AUDIO_SEND_CLAIM.NOT_ATTEMPTED
      : safeEnum(safeInput?.execution?.send_claim, SEND_CLAIMS),
    confirmation_marker: blockedLifecycle
      ? WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      : safeEnum(safeInput?.confirmation?.confirmation_marker, CONFIRMATION_MARKERS),
    retry_disposition: result.terminal
      ? WELCOME_AUDIO_RETRY_DISPOSITION.FORBIDDEN_AFTER_ATTEMPT
      : blockedLifecycle
        ? WELCOME_AUDIO_RETRY_DISPOSITION.BEFORE_ATTEMPT
        : safeEnum(safeInput?.execution?.retry_disposition, RETRY_DISPOSITIONS),
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
  WELCOME_AUDIO_CANONICAL_OPERATION_PROJECTION_VERSION,
  WELCOME_AUDIO_CLAIM_RESULT,
  WELCOME_AUDIO_CLAIM_TOKEN_STATUS,
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
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
  WELCOME_AUDIO_SOURCE_CLASS,
  WELCOME_AUDIO_SOURCE_RECENCY,
  WELCOME_AUDIO_BUSINESS_ELIGIBILITY,
  WELCOME_AUDIO_SURFACE,
  WELCOME_AUDIO_TIME_ZONE,
  WELCOME_AUDIO_UI_ATTESTED_ADAPTER_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_CANONICAL_OPERATION_PROJECTION_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_OPERATION_GUARD_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_REDACTED_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PROJECTION_SCHEMA_VERSION,
  bogotaCalendarDayNumber,
  buildInstagramWelcomeAudioRedactedReceipt,
  buildWelcomeAudioCanonicalOperationDigest,
  buildWelcomeAudioRedactedReceipt,
  classifyRecentFollowerBucket,
  validateInstagramWelcomeAudioOperation,
  validateWelcomeAudioOperation,
  validateWelcomeAudioRedactedReceipt,
};
