const PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION = 'crm_core_limited_pilot_direct_dual_group_approval_receipt_v1';
const PILOT_APPROVAL_RECEIPT_SCHEMA_VERSION = 'crm_core_limited_pilot_direct_dual_group_approval_receipt_schema_v1';
const PILOT_MISSION_ID = 'crm_core_limited_operational_pilot_hardening_v1_2026-07-13';
const PILOT_MISSION_CONTRACT_VERSION = '2026-07-13.v1';
const PILOT_ACTIVE_NEXT_ACTION = PILOT_MISSION_ID;
const PILOT_DUAL_GROUP_OPERATION_CLASS = 'subscriber_upsert_with_exactly_two_approved_onboarding_groups_if_final_checks_pass';
const PILOT_APPROVED_ROUTE = 'crm_core_direct_mailerlite_api';
const PILOT_APPROVED_ENDPOINT_SIGNATURE = 'POST /api/subscribers';
const PILOT_APPROVAL_CONTEXT = 'go_v0_limits_plus_adelante_direct_api_route_correction';
const PILOT_FINAL_CHECK_MAX_AGE_MS = 5 * 60 * 1000;
const PILOT_PACKET_BINDING_MAX_AGE_MS = PILOT_FINAL_CHECK_MAX_AGE_MS;
const PILOT_MAX_MAILERLITE_UPSERTS = 5;

const cleanString = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const isSha256 = (value) => /^[0-9a-f]{64}$/i.test(cleanString(value) ?? '');

const validatePilotApprovalReceipt = (receipt) => {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { ok: false, reason: 'blocked_pilot_approval_receipt_missing_or_invalid' };
  }
  const exactChecks = [
    ['schema_version', PILOT_APPROVAL_RECEIPT_SCHEMA_VERSION],
    ['receipt_contract_version', PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION],
    ['mission_id', PILOT_MISSION_ID],
    ['mission_contract_version', PILOT_MISSION_CONTRACT_VERSION],
    ['approval_status', 'approved'],
    ['approval_message_exact', 'adelante'],
    ['approval_context', PILOT_APPROVAL_CONTEXT],
    ['approved_operation_class', PILOT_DUAL_GROUP_OPERATION_CLASS],
    ['approved_route', PILOT_APPROVED_ROUTE],
    ['approved_endpoint_signature', PILOT_APPROVED_ENDPOINT_SIGNATURE],
    ['atomicity', 'single_request_single_payload_groups_array'],
    ['proxy_scope', 'forbidden_no_further_access_or_changes'],
    ['campaign_scope', 'forbidden_not_launched'],
  ];
  for (const [key, expected] of exactChecks) {
    if (cleanString(receipt[key]) !== expected) {
      return { ok: false, reason: `blocked_pilot_approval_receipt_${key}_mismatch` };
    }
  }
  if (receipt.immediate_reply_binding !== 'passed') {
    return { ok: false, reason: 'blocked_pilot_approval_receipt_reply_binding_mismatch' };
  }
  if (receipt.execution_explicitly_approved !== true) {
    return { ok: false, reason: 'blocked_pilot_execution_not_approved' };
  }
  if (receipt.approved_group_reference_count !== 2 || receipt.group_references_must_be_distinct !== true) {
    return { ok: false, reason: 'blocked_pilot_approval_group_contract_mismatch' };
  }
  if (receipt.max_mailerlite_upserts !== PILOT_MAX_MAILERLITE_UPSERTS) {
    return { ok: false, reason: 'blocked_pilot_approval_upsert_cap_mismatch' };
  }
  if (!isSha256(receipt.mission_contract_sha256)) {
    return { ok: false, reason: 'blocked_pilot_mission_contract_digest_missing_or_invalid' };
  }
  if (!isSha256(receipt.approved_group_evidence_sha256)) {
    return { ok: false, reason: 'blocked_pilot_group_evidence_digest_missing_or_invalid' };
  }
  return {
    ok: true,
    reason: null,
    contract_version: PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
    mission_contract_sha256: receipt.mission_contract_sha256.toLowerCase(),
    approved_group_evidence_sha256: receipt.approved_group_evidence_sha256.toLowerCase(),
  };
};

const validatePilotPacketBinding = ({ packet, approvalReceipt, registryEntry, finalCheckReceipt, executionContext, nowMs = Date.now() }) => {
  const approval = validatePilotApprovalReceipt(approvalReceipt);
  if (!approval.ok) return approval;
  const packetId = cleanString(packet?.packet_id);
  const operationId = cleanString(packet?.operation_id);
  if (!packetId || !/^[a-z0-9][a-z0-9._-]{7,200}$/i.test(packetId)) {
    return { ok: false, reason: 'blocked_pilot_packet_id_invalid' };
  }
  if (!operationId || !/^[a-z0-9][a-z0-9._-]{7,200}$/i.test(operationId)) {
    return { ok: false, reason: 'blocked_pilot_operation_id_invalid' };
  }
  const exactPacketChecks = [
    ['mission_id', PILOT_MISSION_ID],
    ['mission_contract_version', PILOT_MISSION_CONTRACT_VERSION],
    ['pilot_approval_contract_version', PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION],
    ['operation_class', PILOT_DUAL_GROUP_OPERATION_CLASS],
    ['expected_active_next_action', PILOT_ACTIVE_NEXT_ACTION],
  ];
  for (const [key, expected] of exactPacketChecks) {
    if (cleanString(packet?.[key]) !== expected) {
      return { ok: false, reason: `blocked_pilot_packet_${key}_mismatch` };
    }
  }
  const packetCreatedAt = Date.parse(cleanString(packet?.mission_created_at) ?? '');
  if (!Number.isFinite(packetCreatedAt) || packetCreatedAt > nowMs + 60_000 || nowMs - packetCreatedAt > PILOT_PACKET_BINDING_MAX_AGE_MS) {
    return { ok: false, reason: 'blocked_pilot_packet_binding_stale_or_invalid' };
  }
  if (!registryEntry || typeof registryEntry !== 'object' || Array.isArray(registryEntry)) {
    return { ok: false, reason: 'blocked_pilot_registry_entry_missing' };
  }
  if (registryEntry.state !== 'prepared') {
    return { ok: false, reason: 'blocked_pilot_operation_already_attempted_or_unknown' };
  }
  if (
    cleanString(registryEntry.operation_id) !== operationId
    || cleanString(registryEntry.packet_id) !== packetId
    || cleanString(registryEntry.operation_class) !== PILOT_DUAL_GROUP_OPERATION_CLASS
    || registryEntry.expected_group_reference_count !== 2
  ) {
    return { ok: false, reason: 'blocked_pilot_registry_binding_mismatch' };
  }
  if (
    !isSha256(registryEntry.packet_sha256)
    || !isSha256(registryEntry.pilot_approval_receipt_sha256)
    || !isSha256(registryEntry.identity_anchor_sha256)
  ) {
    return { ok: false, reason: 'blocked_pilot_registry_digest_missing_or_invalid' };
  }
  const registryPreparedAt = Date.parse(cleanString(registryEntry.prepared_at) ?? '');
  const finalCheckAt = Date.parse(cleanString(finalCheckReceipt?.completed_at ?? finalCheckReceipt?.checked_at) ?? '');
  if (
    !Number.isFinite(registryPreparedAt)
    || !Number.isFinite(finalCheckAt)
    || registryPreparedAt < packetCreatedAt
    || finalCheckAt < registryPreparedAt
    || registryPreparedAt > nowMs + 60_000
    || nowMs - registryPreparedAt > PILOT_PACKET_BINDING_MAX_AGE_MS
  ) {
    return { ok: false, reason: 'blocked_pilot_registry_pre_final_check_order_or_freshness_invalid' };
  }
  if (cleanString(finalCheckReceipt?.packet_binding_status) !== 'private_exact_packet_bound') {
    return { ok: false, reason: 'blocked_pilot_final_check_public_binding_status_mismatch' };
  }
  if (!executionContext?.worktree_clean) {
    return { ok: false, reason: 'blocked_pilot_dirty_worktree' };
  }
  if (cleanString(executionContext?.repo_head) !== cleanString(packet?.expected_repo_head)) {
    return { ok: false, reason: 'blocked_pilot_repo_head_mismatch' };
  }
  if (cleanString(executionContext?.active_next_action) !== PILOT_ACTIVE_NEXT_ACTION) {
    return { ok: false, reason: 'blocked_pilot_active_next_action_mismatch' };
  }
  return {
    ok: true,
    reason: null,
    packet_id: packetId,
    operation_id: operationId,
    packet_created_at_ms: packetCreatedAt,
    registry_prepared_at_ms: registryPreparedAt,
    final_check_at_ms: finalCheckAt,
    packet_sha256: registryEntry.packet_sha256.toLowerCase(),
    pilot_approval_receipt_sha256: registryEntry.pilot_approval_receipt_sha256.toLowerCase(),
    identity_anchor_sha256: registryEntry.identity_anchor_sha256.toLowerCase(),
  };
};

export {
  PILOT_ACTIVE_NEXT_ACTION,
  PILOT_APPROVAL_CONTEXT,
  PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  PILOT_APPROVAL_RECEIPT_SCHEMA_VERSION,
  PILOT_APPROVED_ENDPOINT_SIGNATURE,
  PILOT_APPROVED_ROUTE,
  PILOT_DUAL_GROUP_OPERATION_CLASS,
  PILOT_FINAL_CHECK_MAX_AGE_MS,
  PILOT_MISSION_CONTRACT_VERSION,
  PILOT_MISSION_ID,
  PILOT_MAX_MAILERLITE_UPSERTS,
  PILOT_PACKET_BINDING_MAX_AGE_MS,
  cleanString,
  isSha256,
  validatePilotApprovalReceipt,
  validatePilotPacketBinding,
};
