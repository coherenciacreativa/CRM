const CORRECTION_PACKET_CONTRACT_VERSION = 'mailerlite_existing_subscriber_active_trigger_correction_packet_v1';
const CORRECTION_OPERATION_CLASS = 'existing_subscriber_add_to_active_live_onboarding_trigger_group_if_not_present';
const REQUIRED_IMPACT_ON_E2E_RESULT = 'technical_e2e_completed_but_active_onboarding_not_verified';
const PASSED_PACKET_STATUS = 'passed_existing_subscriber_active_trigger_correction_packet_contract';

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const getPath = (record, key) => {
  if (!record || typeof record !== 'object') return null;
  if (!key.includes('.')) return record[key] ?? null;
  let cursor = record;
  for (const part of key.split('.')) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return cursor ?? null;
};

const collectValues = (record, keys) => {
  const values = [];
  for (const key of keys) {
    const value = getPath(record, key);
    if (Array.isArray(value)) values.push(...value);
    else if (value && typeof value === 'object') {
      for (const nestedKey of ['reference', 'id', 'group_reference', 'groupReference', 'anchor', 'value']) values.push(value[nestedKey]);
    } else values.push(value);
  }
  return [...new Set(values.map(cleanString).filter(Boolean))];
};

const normalizeReference = (value) => cleanString(value)?.toLowerCase() ?? null;
const sameReference = (left, right) => Boolean(normalizeReference(left) && normalizeReference(left) === normalizeReference(right));
const blocker = (reason, extra = {}) => ({ ok: false, status: reason, reason, ...extra });

const oneRequiredValue = (packet, keys, missingReason, ambiguousReason) => {
  const values = collectValues(packet, keys);
  if (!values.length) return blocker(missingReason);
  if (values.length > 1) return blocker(ambiguousReason, { values });
  return { ok: true, value: values[0] };
};

const booleanTrue = (value) => value === true || value === 'true' || value === 'yes' || value === 'present';
const containsToken = (value, token) => Array.isArray(value) && value.includes(token);

const closedGatePresent = (packet, gate) => {
  const gates = packet?.closed_gates;
  if (Array.isArray(gates)) return containsToken(gates, gate);
  if (gates && typeof gates === 'object') return booleanTrue(gates[gate]);
  return false;
};

const scopeValue = (packet, key) => {
  const scope = packet?.allowed_correction_scope ?? packet?.allowed_scope ?? packet?.correction_scope;
  if (Array.isArray(scope)) return scope.includes(key);
  if (scope && typeof scope === 'object') return scope[key];
  return undefined;
};

const forbiddenAuthorizationPresent = (packet) => {
  const checks = [
    packet?.authorizes_group_removal,
    packet?.authorizes_group_replace,
    packet?.authorizes_broad_import,
    packet?.authorizes_field_creation,
    packet?.authorizes_automation_mutation,
    packet?.authorizes_campaign_mutation,
    packet?.authorizes_status_update,
    packet?.authorizes_resubscribe,
    scopeValue(packet, 'remove_groups'),
    scopeValue(packet, 'replace_groups'),
    scopeValue(packet, 'broad_import'),
    scopeValue(packet, 'create_fields'),
    scopeValue(packet, 'modify_automations'),
    scopeValue(packet, 'modify_campaigns'),
    scopeValue(packet, 'set_status'),
    scopeValue(packet, 'set_resubscribe'),
  ];
  if (checks.some(booleanTrue)) return true;
  const mutationClasses = packet?.authorized_mutation_classes ?? packet?.mutation_classes;
  if (Array.isArray(mutationClasses)) {
    return mutationClasses.some((item) => cleanString(item) && cleanString(item) !== CORRECTION_OPERATION_CLASS);
  }
  return false;
};

const scopeIsSafe = (packet) => {
  const addOnly = booleanTrue(scopeValue(packet, 'add_only_active_live_trigger_group')) || booleanTrue(scopeValue(packet, 'add_only_confirmed_active_live_trigger_group'));
  const preserve = booleanTrue(scopeValue(packet, 'preserve_existing_groups')) || booleanTrue(scopeValue(packet, 'preserve_prior_non_active_group'));
  const noRemoval = closedGatePresent(packet, 'no_group_removal') || booleanTrue(scopeValue(packet, 'no_group_removal'));
  const noBroadImport = closedGatePresent(packet, 'no_broad_import') || booleanTrue(scopeValue(packet, 'no_broad_import'));
  return addOnly && preserve && noRemoval && noBroadImport;
};

const consentContextPresent = (packet) => {
  const status = cleanString(packet?.consent_context_gate_status ?? packet?.consent_or_context_gate_status);
  return ['present_private_evidence', 'approved_controlled_source_context', 'controlled_source_context_approved'].includes(status)
    || booleanTrue(packet?.approved_controlled_source_context)
    || booleanTrue(packet?.controlled_source_context_approved);
};

const packetIdOf = (packet) => cleanString(packet?.packet_id ?? packet?.packetId ?? packet?.run_id ?? packet?.runId);

const validateActiveTriggerCorrectionPacket = (packet) => {
  if (!packet || typeof packet !== 'object') return blocker('blocked_private_packet_contract_invalid');
  const packetId = packetIdOf(packet);
  if (!packetId) return blocker('blocked_private_packet_id_missing');
  if (cleanString(packet.packet_contract_version) !== CORRECTION_PACKET_CONTRACT_VERSION) return blocker('blocked_private_packet_contract_version_mismatch');
  if (cleanString(packet.operation_class) !== CORRECTION_OPERATION_CLASS) return blocker('blocked_private_packet_operation_class_mismatch');

  const subscriberAnchor = oneRequiredValue(packet, [
    'existing_subscriber_lookup_anchor',
    'existingSubscriberLookupAnchor',
    'private_lookup.existing_subscriber_lookup_anchor',
    'private_lookup.email',
    'private_lookup.subscriber_anchor',
    'private_lookup.subscriber_lookup_anchor',
  ], 'blocked_missing_existing_subscriber_lookup_anchor', 'blocked_existing_subscriber_lookup_anchor_ambiguous');
  if (!subscriberAnchor.ok) return subscriberAnchor;

  const activeRef = oneRequiredValue(packet, [
    'active_live_trigger_group_reference',
    'activeLiveTriggerGroupReference',
    'private_lookup.active_live_trigger_group_reference',
    'private_lookup.active_trigger_group_reference',
    'active_live_trigger.reference',
    'active_live_trigger.group_reference',
  ], 'blocked_active_trigger_reference_missing', 'blocked_group_reference_ambiguous');
  if (!activeRef.ok) return activeRef;

  const priorValues = collectValues(packet, [
    'prior_non_active_group_reference',
    'priorNonActiveGroupReference',
    'private_lookup.prior_non_active_group_reference',
    'private_lookup.previous_non_active_group_reference',
    'prior_non_active_group.reference',
  ]);
  if (priorValues.length > 1) return blocker('blocked_group_reference_ambiguous');
  const priorRef = priorValues[0] ?? null;
  if (priorRef && sameReference(activeRef.value, priorRef)) return blocker('blocked_active_and_prior_group_reference_identical');

  if (packet.mismatch_confirmed !== true) return blocker('blocked_private_packet_missing_mismatch_confirmation');
  if (cleanString(packet.impact_on_e2e_result) !== REQUIRED_IMPACT_ON_E2E_RESULT) return blocker('blocked_private_packet_impact_mismatch');
  if (cleanString(packet.mutation_execution_status) !== 'not_executed') return blocker('blocked_private_packet_already_executed_or_unknown');
  if (cleanString(packet.crm_write_status) !== 'not_written') return blocker('blocked_private_packet_crm_write_not_closed');
  if (!consentContextPresent(packet)) return blocker('blocked_consent_or_context_gate_missing');
  if (forbiddenAuthorizationPresent(packet)) return blocker('blocked_private_packet_authorizes_disallowed_mutation');
  if (!scopeIsSafe(packet)) return blocker('blocked_private_packet_scope_not_safe');

  for (const gate of ['no_group_removal', 'no_broad_import', 'no_field_creation', 'no_automation_or_campaign_mutation', 'no_crm_source_write']) {
    if (!closedGatePresent(packet, gate)) return blocker(`blocked_private_packet_closed_gate_missing:${gate}`);
  }

  return {
    ok: true,
    status: PASSED_PACKET_STATUS,
    contract_version: CORRECTION_PACKET_CONTRACT_VERSION,
    packet_id: packetId,
    operation_class: CORRECTION_OPERATION_CLASS,
    existing_subscriber_lookup_anchor: subscriberAnchor.value,
    active_live_trigger_group_reference: activeRef.value,
    prior_non_active_group_reference: priorRef,
  };
};

export {
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  PASSED_PACKET_STATUS,
  REQUIRED_IMPACT_ON_E2E_RESULT,
  cleanString,
  collectValues,
  normalizeReference,
  sameReference,
  validateActiveTriggerCorrectionPacket,
};
