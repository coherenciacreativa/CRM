const FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION = 'mailerlite_final_check_ready_receipt_v1';
const FINAL_CHECK_READY_RECEIPT_CONTRACT_CHECK = 'passed';
const FINAL_CHECK_READY_RECEIPT_CONTRACT_RESULT = 'passed_ready_contract';
const FINAL_CHECK_READY_RECEIPT_CONSISTENCY_CHECK = 'passed';
const FINAL_CHECK_READY_FRESHNESS_TIMESTAMP_STATUS = 'valid_iso8601_present';
const COMPLETED_FINAL_CHECK_ROUTE_STATUS = 'completed_live_readonly_packet_final_check';
const PACKET_SPECIFIC_READONLY_SCOPE = 'packet_specific_subscriber_status_group_membership_readonly';
const READY_FOR_EXACT_MUTATION_APPROVAL = 'ready_for_exact_mutation_approval';
const DEFAULT_MAX_FINAL_CHECK_AGE_MS = 15 * 60 * 1000;

const hasOwn = (record, key) => Object.prototype.hasOwnProperty.call(record ?? {}, key);

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const blocker = (reason, status = 'not_run_final_check_failed') => ({ reason, status });

const hasBlockers = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined || value === '' || value === 'none') return false;
  return Boolean(value);
};

const finalCheckTimestamp = (receipt) => cleanString(receipt?.completed_at ?? receipt?.checked_at);

const freshnessTimestampStatusFor = (timestamp) => {
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return 'invalid_or_missing';
  return FINAL_CHECK_READY_FRESHNESS_TIMESTAMP_STATUS;
};

const buildFinalCheckReadyContractFields = ({ completedAt, checkedAt } = {}) => {
  const timestamp = completedAt ?? checkedAt ?? new Date().toISOString();
  return {
    receipt_contract_version: FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION,
    receipt_contract_check: FINAL_CHECK_READY_RECEIPT_CONTRACT_CHECK,
    receipt_contract_check_result: FINAL_CHECK_READY_RECEIPT_CONTRACT_RESULT,
    receipt_consistency_check: FINAL_CHECK_READY_RECEIPT_CONSISTENCY_CHECK,
    freshness_timestamp_status: freshnessTimestampStatusFor(timestamp),
  };
};

const buildFinalCheckNotReadyContractFields = ({ completedAt, checkedAt } = {}) => {
  const timestamp = completedAt ?? checkedAt ?? new Date().toISOString();
  return {
    receipt_contract_version: FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION,
    receipt_contract_check: 'not_applicable',
    receipt_contract_check_result: 'not_ready_contract',
    receipt_consistency_check: 'not_applicable',
    freshness_timestamp_status: freshnessTimestampStatusFor(timestamp),
  };
};

const explainFinalCheckReadyReceiptBlockers = (receipt, {
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_MAX_FINAL_CHECK_AGE_MS,
} = {}) => {
  const blockers = [];
  if (!receipt || typeof receipt !== 'object') return [blocker('final_check_missing', 'not_run_final_check_missing')];

  if (!hasOwn(receipt, 'receipt_contract_check_result')) {
    blockers.push(blocker('final_check_receipt_contract_check_result_missing', 'blocked_final_check_receipt_contract_check_result_missing'));
  } else if (receipt.receipt_contract_check_result !== FINAL_CHECK_READY_RECEIPT_CONTRACT_RESULT) {
    blockers.push(blocker('final_check_receipt_contract_check_result_not_passed', 'blocked_final_check_receipt_contract_check_result_not_passed'));
  }

  if (!hasOwn(receipt, 'receipt_contract_check')) {
    blockers.push(blocker('final_check_receipt_contract_check_missing', 'blocked_final_check_receipt_contract_check_missing'));
  } else if (receipt.receipt_contract_check !== FINAL_CHECK_READY_RECEIPT_CONTRACT_CHECK) {
    blockers.push(blocker('final_check_receipt_contract_check_not_passed', 'blocked_final_check_receipt_contract_check_not_passed'));
  }

  if (!hasOwn(receipt, 'receipt_consistency_check')) {
    blockers.push(blocker('final_check_receipt_consistency_missing', 'blocked_final_check_receipt_consistency_missing'));
  } else if (receipt.receipt_consistency_check !== FINAL_CHECK_READY_RECEIPT_CONSISTENCY_CHECK) {
    blockers.push(blocker('final_check_receipt_consistency_not_passed', 'blocked_final_check_receipt_consistency_not_passed'));
  }

  const timestamp = finalCheckTimestamp(receipt);
  if (!timestamp) {
    blockers.push(blocker('final_check_timestamp_missing', 'blocked_final_check_freshness_timestamp_missing'));
  } else {
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) {
      blockers.push(blocker('final_check_timestamp_invalid', 'blocked_final_check_freshness_timestamp_invalid'));
    } else {
      if (parsed > nowMs + 60_000) blockers.push(blocker('final_check_timestamp_from_future', 'blocked_final_check_freshness_timestamp_invalid'));
      if (Number.isFinite(maxAgeMs) && nowMs - parsed > maxAgeMs) blockers.push(blocker('final_check_stale', 'blocked_final_check_stale'));
    }
  }

  if (!hasOwn(receipt, 'freshness_timestamp_status')) {
    blockers.push(blocker('final_check_freshness_timestamp_status_missing', 'blocked_final_check_freshness_timestamp_status_missing'));
  } else if (receipt.freshness_timestamp_status !== FINAL_CHECK_READY_FRESHNESS_TIMESTAMP_STATUS) {
    blockers.push(blocker('final_check_freshness_timestamp_status_not_valid', 'blocked_final_check_freshness_timestamp_status_not_valid'));
  }

  if (!hasOwn(receipt, 'receipt_contract_version')) {
    blockers.push(blocker('final_check_receipt_contract_version_missing', 'blocked_final_check_receipt_contract_version_missing'));
  } else if (receipt.receipt_contract_version !== FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION) {
    blockers.push(blocker('final_check_receipt_contract_version_mismatch', 'blocked_final_check_receipt_contract_version_mismatch'));
  }

  if (receipt.route_status !== COMPLETED_FINAL_CHECK_ROUTE_STATUS) blockers.push(blocker('final_check_route_status_not_completed'));
  if (receipt.live_lookup_ran !== true) blockers.push(blocker('final_check_live_lookup_not_confirmed'));
  if (receipt.mailerlite_api_called !== true) blockers.push(blocker('final_check_api_call_not_confirmed'));
  if (receipt.mailerlite_api_call_scope !== PACKET_SPECIFIC_READONLY_SCOPE) blockers.push(blocker('final_check_api_scope_not_packet_specific'));
  if (cleanString(receipt.subscriber_lookup_status) === 'found') {
    blockers.push(blocker('blocked_existing_subscriber_path_not_supported_by_v1_guard', 'blocked_existing_subscriber_path_not_supported_by_v1_guard'));
  } else if (cleanString(receipt.subscriber_lookup_status) !== 'not_found') {
    blockers.push(blocker('final_check_lookup_not_safe'));
  }
  if (cleanString(receipt.subscriber_status_class ?? receipt.subscriber_status) !== 'not_found') {
    blockers.push(blocker('final_check_subscriber_status_not_not_found'));
  }
  if (cleanString(receipt.onboarding_group_membership_status ?? receipt.group_assignment_status) !== 'not_found') {
    blockers.push(blocker('final_check_group_membership_not_safe'));
  }
  if (cleanString(receipt.duplicate_readd_status) !== 'safe_new_or_not_in_group') blockers.push(blocker('final_check_duplicate_readd_not_safe'));
  if (cleanString(receipt.suppression_status) !== 'pass') blockers.push(blocker('final_check_suppression_not_pass'));
  if (cleanString(receipt.idempotency_status) !== 'pass') blockers.push(blocker('final_check_idempotency_not_pass'));
  if (cleanString(receipt.mutation_readiness_after_final_check) !== READY_FOR_EXACT_MUTATION_APPROVAL) blockers.push(blocker('final_check_readiness_not_ready'));
  if (hasBlockers(receipt.blockers)) blockers.push(blocker('final_check_blockers_present', 'blocked_final_check_blockers_present'));
  if (!Array.isArray(receipt.blockers)) blockers.push(blocker('final_check_blockers_not_array', 'blocked_final_check_blockers_not_array'));

  return blockers;
};

const validateFinalCheckReadyReceipt = (receipt, options = {}) => {
  const blockers = explainFinalCheckReadyReceiptBlockers(receipt, options);
  if (blockers.length) {
    const first = blockers[0];
    return {
      ok: false,
      status: first.status,
      reason: first.reason,
      blockers,
    };
  }
  return {
    ok: true,
    status: 'passed_fresh_packet_specific_final_check',
    reason: 'passed_ready_contract',
    subscriber_lookup_status: cleanString(receipt.subscriber_lookup_status),
    group_assignment_status: cleanString(receipt.onboarding_group_membership_status ?? receipt.group_assignment_status),
    blockers: [],
  };
};

export {
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  DEFAULT_MAX_FINAL_CHECK_AGE_MS,
  FINAL_CHECK_READY_FRESHNESS_TIMESTAMP_STATUS,
  FINAL_CHECK_READY_RECEIPT_CONSISTENCY_CHECK,
  FINAL_CHECK_READY_RECEIPT_CONTRACT_CHECK,
  FINAL_CHECK_READY_RECEIPT_CONTRACT_RESULT,
  FINAL_CHECK_READY_RECEIPT_CONTRACT_VERSION,
  PACKET_SPECIFIC_READONLY_SCOPE,
  READY_FOR_EXACT_MUTATION_APPROVAL,
  buildFinalCheckNotReadyContractFields,
  buildFinalCheckReadyContractFields,
  explainFinalCheckReadyReceiptBlockers,
  finalCheckTimestamp,
  freshnessTimestampStatusFor,
  validateFinalCheckReadyReceipt,
};
