#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-exact-onboarding-mutation-2026-07-07-v1';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const REDACTED_RECEIPT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow';
const OPERATION_CLASS = 'subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass';
const COMPLETED_FINAL_CHECK_ROUTE_STATUS = 'completed_live_readonly_packet_final_check';
const SAFE_MUTATION_CLIENT_CONTRACT = 'post_subscribers_only_current_not_found_path';
const EXACT_MUTATION_GUARD_STATUS = 'exact_mutation_execution_guard_implemented_mocked_live_tested';
const DEFAULT_API_BASE = ['https:', '', 'connect.mailerlite.com', 'api'].join('/');
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const DEFAULT_MAX_FINAL_CHECK_AGE_MS = 15 * 60 * 1000;
const FUTURE_EXACT_APPROVAL_PHRASE = 'I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved repaired private onboarding packet only, using the implemented exact mutation execution guard. Use the approved operation class `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`, the approved native top-level email semantics, the approved existing field mapping, and the confirmed onboarding group. Immediately before mutation, perform or validate the packet-specific idempotency and suppression safety gate. Do not create fields, do not modify automations or campaigns, do not create or modify segments, forms, webhooks, or account settings, do not perform a broad import, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, private message text, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.';

const ALLOWED_EXACT_MUTATION_REQUESTS = new Set(['POST /api/subscribers']);
const ALLOWED_FIELD_FAMILIES = ['name', 'country', 'city'];
const OMITTED_FIELD_FAMILIES = [
  'source_channel',
  'source_context',
  'onboarding_started_at',
  'consent_or_context',
  'crm_core_private_anchor_label',
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs [options]

Fixture/mock mode:
  --fixture-file <path>
  --private-result-json <path>
  --private-result-md <path>
  --redacted-receipt-json <path>
  --redacted-receipt-md <path>

Future live exact-mutation mode:
  --allow-live-exact-onboarding-mutation
  --approval-phrase-file <path>
  --private-packet-json <approved repaired private packet path>
  --final-check-redacted-json <approved final-check redacted receipt path>
  --private-result-json <approved private result JSON path>
  --private-result-md <approved private result MD path>
  --redacted-receipt-json <approved redacted receipt JSON path>
  --redacted-receipt-md <approved redacted receipt MD path>
  --max-final-check-age-ms <milliseconds>

The v1 safe client contract permits exactly one future mutation endpoint:
POST /api/subscribers. It supports only the current packet-specific not_found
subscriber path and never prints raw private values.`;

const parseArgs = (argv) => {
  const options = {
    fixtureFile: null,
    allowLiveExactOnboardingMutation: false,
    approvalPhrase: null,
    approvalPhraseFile: null,
    privatePacketJson: null,
    finalCheckRedactedJson: null,
    privateResultJson: null,
    privateResultMd: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    maxFinalCheckAgeMs: DEFAULT_MAX_FINAL_CHECK_AGE_MS,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--allow-live-exact-onboarding-mutation') options.allowLiveExactOnboardingMutation = true;
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--approval-file' || arg === '--approval-phrase-file') options.approvalPhraseFile = argv[++index];
    else if (arg === '--private-packet-json') options.privatePacketJson = argv[++index];
    else if (arg === '--final-check-redacted-json') options.finalCheckRedactedJson = argv[++index];
    else if (arg === '--private-result-json') options.privateResultJson = argv[++index];
    else if (arg === '--private-result-md') options.privateResultMd = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (arg === '--max-final-check-age-ms') options.maxFinalCheckAgeMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (/debug|raw|env|credential|header|token/i.test(arg)) throw new Error(`forbidden_flag:${arg}`);
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  options.maxFinalCheckAgeMs = Number.isFinite(options.maxFinalCheckAgeMs) && options.maxFinalCheckAgeMs > 0
    ? options.maxFinalCheckAgeMs
    : DEFAULT_MAX_FINAL_CHECK_AGE_MS;
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const rootsWithDefaults = (roots = {}) => ({
  repoRoot: roots.repoRoot ?? REPO_ROOT,
  privateMailerLiteRoot: roots.privateMailerLiteRoot ?? PRIVATE_MAILERLITE_ROOT,
  redactedReceiptRoot: roots.redactedReceiptRoot ?? REDACTED_RECEIPT_ROOT,
});

const isInside = (targetPath, rootPath) => {
  if (!targetPath) return false;
  const resolvedTarget = resolve(targetPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, resolvedTarget);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

const assertOutsideRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (isInside(targetPath, rootPath)) throw new Error(`${label}_inside_repo_rejected`);
};

const assertUnderRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (!isInside(targetPath, rootPath) || resolve(targetPath) === resolve(rootPath)) {
    throw new Error(`${label}_outside_approved_root_rejected`);
  }
};

const validateFixtureOutputPaths = (options, { roots = {} } = {}) => {
  const resolvedRoots = rootsWithDefaults(roots);
  for (const [key, label] of [
    ['fixtureFile', 'fixture_file'],
    ['privateResultJson', 'private_result_json'],
    ['privateResultMd', 'private_result_md'],
    ['redactedReceiptJson', 'redacted_receipt_json'],
    ['redactedReceiptMd', 'redacted_receipt_md'],
  ]) {
    assertOutsideRoot(options[key], resolvedRoots.repoRoot, label);
  }
  return {
    fixtureFile: resolve(options.fixtureFile),
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
  };
};

const validateLiveOutputPaths = (options, { roots = {} } = {}) => {
  if (!options.allowLiveExactOnboardingMutation) throw new Error('not_run_missing_approval');
  const resolvedRoots = rootsWithDefaults(roots);
  for (const [key, label] of [
    ['privatePacketJson', 'private_packet_json'],
    ['finalCheckRedactedJson', 'final_check_redacted_json'],
    ['privateResultJson', 'private_result_json'],
    ['privateResultMd', 'private_result_md'],
    ['redactedReceiptJson', 'redacted_receipt_json'],
    ['redactedReceiptMd', 'redacted_receipt_md'],
  ]) {
    assertOutsideRoot(options[key], resolvedRoots.repoRoot, label);
  }
  assertUnderRoot(options.privatePacketJson, resolvedRoots.privateMailerLiteRoot, 'private_packet_json');
  assertUnderRoot(options.finalCheckRedactedJson, resolvedRoots.redactedReceiptRoot, 'final_check_redacted_json');
  assertUnderRoot(options.privateResultJson, resolvedRoots.privateMailerLiteRoot, 'private_result_json');
  assertUnderRoot(options.privateResultMd, resolvedRoots.privateMailerLiteRoot, 'private_result_md');
  assertUnderRoot(options.redactedReceiptJson, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_json');
  assertUnderRoot(options.redactedReceiptMd, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_md');
  return {
    privatePacketJson: resolve(options.privatePacketJson),
    finalCheckRedactedJson: resolve(options.finalCheckRedactedJson),
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
  };
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const writeJson = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
};

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

const firstValue = (record, keys) => {
  for (const key of keys) {
    const value = getPath(record, key);
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const packetIdOf = (packet) => cleanString(firstValue(packet, ['packet_id', 'packetId', 'run_id', 'runId'])) ?? 'unknown_packet';
const privateEmailForLookup = (packet) => cleanString(firstValue(packet, ['private_lookup.email', 'privateLookup.email', 'privateEmailForLookup', 'email_for_lookup', 'top_level_email']));
const confirmedOnboardingGroupReference = (packet) => cleanString(firstValue(packet, [
  'confirmed_onboarding_group_reference',
  'confirmedOnboardingGroupReference',
  'onboarding_group_reference',
  'target_onboarding_group_reference',
  'private_lookup.onboarding_group_reference',
  'privateLookup.onboardingGroupReference',
]));

const normalizeList = (value) => Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
const packetFieldValue = (packet, family) => firstValue(packet, [`fields.${family}`, `mapped_fields.${family}`, `private_fields.${family}`, family]);

const mappedFieldFamiliesFor = (packet) => {
  const explicit = normalizeList(packet?.mapped_field_families ?? packet?.field_families).filter((item) => ALLOWED_FIELD_FAMILIES.includes(item));
  if (explicit.length) return explicit;
  const families = [];
  for (const family of ALLOWED_FIELD_FAMILIES) {
    const value = packetFieldValue(packet, family);
    if (value !== null && value !== undefined && value !== '') families.push(family);
  }
  return families;
};

const assertPacketReadyForMutation = (packet) => {
  if (!privateEmailForLookup(packet)) throw new Error('blocked_missing_private_packet_email_anchor');
  if (!confirmedOnboardingGroupReference(packet)) throw new Error('blocked_missing_private_packet_group_reference');
  if (cleanString(packet?.operation_class) !== OPERATION_CLASS) throw new Error('blocked_private_packet_operation_class_mismatch');
  if (cleanString(packet?.top_level_email_semantics) !== 'native_top_level_subscriber_email_required') throw new Error('blocked_private_packet_email_semantics_mismatch');
  if (cleanString(packet?.consent_context_gate_status) !== 'present_private_evidence') throw new Error('blocked_private_packet_consent_context_gate_missing');
  if (cleanString(packet?.mutation_execution_status) !== 'not_executed') throw new Error('blocked_private_packet_already_executed_or_unknown');
  if (packet?.final_idempotency_check_required !== true) throw new Error('blocked_private_packet_idempotency_gate_missing');
  if (packet?.final_suppression_check_required !== true) throw new Error('blocked_private_packet_suppression_gate_missing');
  const allFamilies = normalizeList(packet?.mapped_field_families ?? packet?.field_families);
  const disallowed = allFamilies.filter((item) => !ALLOWED_FIELD_FAMILIES.includes(item));
  if (disallowed.length) throw new Error('blocked_private_packet_disallowed_field_family');
  return {
    email: privateEmailForLookup(packet),
    groupReference: confirmedOnboardingGroupReference(packet),
    mappedFieldFamilies: mappedFieldFamiliesFor(packet),
  };
};

const approvalTextFrom = async (options) => {
  if (options.approvalPhrase) return cleanString(options.approvalPhrase);
  if (options.approvalPhraseFile) return cleanString(await readFile(resolve(options.approvalPhraseFile), 'utf8'));
  return null;
};

const assertExactApprovalPhrase = async (options) => {
  const phrase = await approvalTextFrom(options);
  if (phrase !== FUTURE_EXACT_APPROVAL_PHRASE) throw new Error('not_run_missing_approval');
};

const blocker = (reason, status = 'not_run_final_check_failed') => ({ ok: false, status, reason });
const hasBlockers = (value) => Array.isArray(value) ? value.length > 0 : Boolean(value);
const finalCheckTimestamp = (receipt) => cleanString(firstValue(receipt, ['completed_at', 'checked_at']));

const validateFreshness = (receipt, { nowMs = Date.now(), maxAgeMs = DEFAULT_MAX_FINAL_CHECK_AGE_MS } = {}) => {
  const timestamp = finalCheckTimestamp(receipt);
  if (!timestamp) return blocker('final_check_timestamp_missing', 'blocked_final_check_freshness_timestamp_missing');
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return blocker('final_check_timestamp_invalid', 'blocked_final_check_freshness_timestamp_invalid');
  if (parsed > nowMs + 60_000) return blocker('final_check_timestamp_from_future', 'blocked_final_check_freshness_timestamp_invalid');
  if (nowMs - parsed > maxAgeMs) return blocker('final_check_stale', 'blocked_final_check_stale');
  return { ok: true, status: 'fresh_within_max_final_check_age_ms' };
};

const validateFinalCheckReceipt = (receipt, options = {}) => {
  if (!receipt || typeof receipt !== 'object') return blocker('final_check_missing', 'not_run_final_check_missing');
  if (receipt.route_status !== COMPLETED_FINAL_CHECK_ROUTE_STATUS) return blocker('final_check_route_status_not_completed');
  if (receipt.live_lookup_ran !== true) return blocker('final_check_live_lookup_not_confirmed');
  if (receipt.mailerlite_api_called !== true) return blocker('final_check_api_call_not_confirmed');
  if (receipt.mailerlite_api_call_scope !== 'packet_specific_subscriber_status_group_membership_readonly') return blocker('final_check_api_scope_not_packet_specific');
  if (!Object.prototype.hasOwnProperty.call(receipt, 'receipt_consistency_check')) {
    return blocker('final_check_receipt_consistency_missing', 'blocked_final_check_receipt_consistency_missing');
  }
  if (receipt.receipt_consistency_check !== 'passed') {
    return blocker('final_check_receipt_consistency_not_passed', 'blocked_final_check_receipt_consistency_not_passed');
  }
  if (hasBlockers(receipt.blockers)) return blocker('final_check_blockers_present');

  const freshness = validateFreshness(receipt, options);
  if (!freshness.ok) return freshness;

  const subscriberLookupStatus = cleanString(receipt.subscriber_lookup_status);
  const subscriberStatusClass = cleanString(receipt.subscriber_status_class ?? receipt.subscriber_status);
  const groupMembershipStatus = cleanString(receipt.onboarding_group_membership_status ?? receipt.group_assignment_status);
  const duplicateStatus = cleanString(receipt.duplicate_readd_status);
  const suppressionStatus = cleanString(receipt.suppression_status);
  const idempotencyStatus = cleanString(receipt.idempotency_status);
  const readiness = cleanString(receipt.mutation_readiness_after_final_check);

  if (subscriberLookupStatus === 'found') return blocker('blocked_existing_subscriber_path_not_supported_by_v1_guard', 'blocked_existing_subscriber_path_not_supported_by_v1_guard');
  if (subscriberLookupStatus !== 'not_found') return blocker('final_check_lookup_not_safe');
  if (subscriberStatusClass !== 'not_found') return blocker('final_check_subscriber_status_not_not_found');
  if (groupMembershipStatus !== 'not_found') return blocker('final_check_group_membership_not_safe');
  if (duplicateStatus !== 'safe_new_or_not_in_group') return blocker('final_check_duplicate_readd_not_safe');
  if (suppressionStatus !== 'pass') return blocker('final_check_suppression_not_pass');
  if (idempotencyStatus !== 'pass') return blocker('final_check_idempotency_not_pass');
  if (readiness !== 'ready_for_exact_mutation_approval') return blocker('final_check_readiness_not_ready');

  return {
    ok: true,
    status: 'passed_fresh_packet_specific_final_check',
    subscriber_lookup_status: subscriberLookupStatus,
    group_assignment_status: groupMembershipStatus,
  };
};

const forbiddenEndpointReason = ({ method = 'GET', path = '' }) => {
  const upper = String(method).toUpperCase();
  const cleanPath = String(path);
  if (upper === 'PUT' && /^\/api\/subscribers\/[^/?#]+/i.test(cleanPath)) return 'blocked_put_subscriber_update_endpoint';
  if (upper === 'POST' && /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+/i.test(cleanPath)) return 'blocked_existing_subscriber_group_assignment_endpoint_v1';
  if (upper === 'POST' && /^\/api\/subscribers\/[^/]+\/forget(?:$|\?)/i.test(cleanPath)) return 'blocked_subscriber_forget_endpoint';
  if (upper === 'DELETE' && /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+/i.test(cleanPath)) return 'blocked_group_unassign_endpoint';
  if (upper === 'DELETE' && /^\/api\/subscribers\/[^/?#]+/i.test(cleanPath)) return 'blocked_subscriber_deletion_endpoint';
  if (upper === 'POST' && /^\/api\/groups(?:$|\?)/i.test(cleanPath)) return 'blocked_group_create_endpoint';
  if (['PUT', 'PATCH'].includes(upper) && /^\/api\/groups\/[^/?#]+/i.test(cleanPath)) return 'blocked_group_update_endpoint';
  if (upper === 'DELETE' && /^\/api\/groups\/[^/?#]+/i.test(cleanPath)) return 'blocked_group_delete_endpoint';
  if (upper === 'GET' && /^\/api\/groups\/[^/]+\/subscribers/i.test(cleanPath)) return 'blocked_group_subscriber_read_in_mutation_command';
  if (upper === 'POST' && /^\/api\/groups\/[^/]+\/import-subscribers/i.test(cleanPath)) return 'blocked_group_import_endpoint';
  if (/imports?|bulk/i.test(cleanPath)) return 'blocked_broad_import_endpoint';
  if (/\/api\/automations?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_automation_mutation_endpoint';
  if (/\/api\/campaigns?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_campaign_endpoint';
  if (/\/api\/segments?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_segment_endpoint';
  if (/\/api\/forms?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_form_endpoint';
  if (/\/api\/webhooks?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_webhook_endpoint';
  if (/\/api\/account(?:\/|$|\?)|\/api\/settings(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_account_settings_endpoint';
  return 'blocked_unapproved_mutation_endpoint';
};

const assertAllowedExactMutationRequest = ({ method = 'GET', path }) => {
  const signature = `${String(method).toUpperCase()} ${String(path)}`;
  if (!ALLOWED_EXACT_MUTATION_REQUESTS.has(signature)) throw new Error(forbiddenEndpointReason({ method, path }));
  return true;
};

const buildExactMutationPayload = (packet) => {
  const { email, groupReference, mappedFieldFamilies } = assertPacketReadyForMutation(packet);
  const fields = {};
  for (const family of mappedFieldFamilies) {
    const value = packetFieldValue(packet, family);
    if (value !== null && value !== undefined && value !== '') fields[family] = value;
  }
  return { email, fields, groups: [groupReference] };
};

const buildRedactedPayloadShape = (payload) => ({
  endpoint: 'POST /api/subscribers',
  has_email: Boolean(payload.email),
  field_families: Object.keys(payload.fields),
  group_count: payload.groups.length,
  status_set: Object.prototype.hasOwnProperty.call(payload, 'status'),
  resubscribe_set: Object.prototype.hasOwnProperty.call(payload, 'resubscribe'),
});

const buildReceipt = ({
  runId,
  packetId,
  mutationAttempted,
  mutationExecuted,
  finalPreExecutionCheckStatus,
  subscriberLookupStatus,
  groupAssignmentStatus,
  mappedFieldFamilies,
  mutationResultStatus,
  blockers,
  recommendedNextStep,
}) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  packet_id: packetId,
  mutation_attempted: mutationAttempted,
  mutation_executed: mutationExecuted,
  operation_class: OPERATION_CLASS,
  final_pre_execution_check_status: finalPreExecutionCheckStatus,
  subscriber_lookup_status: subscriberLookupStatus,
  group_assignment_status: groupAssignmentStatus,
  mapped_field_family_count: mappedFieldFamilies.length,
  mapped_field_families: mappedFieldFamilies,
  omitted_field_family_count: OMITTED_FIELD_FAMILIES.length,
  omitted_field_families: OMITTED_FIELD_FAMILIES,
  mutation_result_status: mutationResultStatus,
  blockers,
  recommended_next_step: recommendedNextStep,
  closed_gates: [
    'no_broad_import',
    'no_multiple_subscribers',
    'no_put_subscriber_update',
    'no_existing_subscriber_group_assignment_endpoint_v1',
    'no_subscriber_delete_or_forget',
    'no_group_create_update_delete_import_or_unassign',
    'no_automation_mutation',
    'no_campaign_creation_or_send',
    'no_segment_form_webhook_or_account_settings_mutation',
    'no_status_or_resubscribe_fields',
    'no_crm_or_source_write',
    'no_raw_email_or_ids_in_redacted_receipt',
  ],
});

const buildPrivateResult = ({ runId, receipt, privateOutputMode, redactedPayloadShape, responseStatus }) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  private_output_mode: privateOutputMode,
  packet_id: receipt.packet_id,
  operation_class: OPERATION_CLASS,
  mutation_attempted: receipt.mutation_attempted,
  mutation_executed: receipt.mutation_executed,
  mutation_result_status: receipt.mutation_result_status,
  redacted_payload_shape: redactedPayloadShape,
  response_status: responseStatus ?? 'not_recorded',
  private_result_notice: 'Synthetic or future private-only result. This artifact intentionally omits raw email, IDs, raw payloads, credentials, headers, tokens, and private subscriber content.',
  deletion_or_redaction_controls: [
    'redacted_receipt_contains_aggregate_status_only',
    'no_raw_values_written_by_mock_path',
  ],
});

const markdownReceipt = (receipt) => `# MailerLite Exact Onboarding Mutation Guard Receipt\n\n- run_id: ${receipt.run_id}\n- packet_id: ${receipt.packet_id}\n- mutation_attempted: ${receipt.mutation_attempted}\n- mutation_executed: ${receipt.mutation_executed}\n- operation_class: ${receipt.operation_class}\n- final_pre_execution_check_status: ${receipt.final_pre_execution_check_status}\n- subscriber_lookup_status: ${receipt.subscriber_lookup_status}\n- group_assignment_status: ${receipt.group_assignment_status}\n- mapped_field_family_count: ${receipt.mapped_field_family_count}\n- mapped_field_families: ${receipt.mapped_field_families.join(', ') || 'none'}\n- omitted_field_family_count: ${receipt.omitted_field_family_count}\n- omitted_field_families: ${receipt.omitted_field_families.join(', ')}\n- mutation_result_status: ${receipt.mutation_result_status}\n- blockers: ${receipt.blockers.length ? receipt.blockers.join(', ') : 'none'}\n- recommended_next_step: ${receipt.recommended_next_step}\n\nClosed gates remain active: ${receipt.closed_gates.join(', ')}.\n`;

const privateMarkdown = (result) => `# MailerLite Exact Onboarding Mutation Private Result\n\n- run_id: ${result.run_id}\n- packet_id: ${result.packet_id}\n- mutation_attempted: ${result.mutation_attempted}\n- mutation_executed: ${result.mutation_executed}\n- mutation_result_status: ${result.mutation_result_status}\n\n${result.private_result_notice}\n`;

const writeOutputs = async ({ paths, receipt, privateResult }) => {
  await writeJson(paths.redactedReceiptJson, receipt);
  await writeText(paths.redactedReceiptMd, markdownReceipt(receipt));
  await writeJson(paths.privateResultJson, privateResult);
  await writeText(paths.privateResultMd, privateMarkdown(privateResult));
};

const compactStdout = (receipt) => ({
  ok: receipt.mutation_executed === true,
  mutation_result_status: receipt.mutation_result_status,
  mutation_attempted: receipt.mutation_attempted,
  mutation_executed: receipt.mutation_executed,
  recommended_next_step: receipt.recommended_next_step,
});

const requestUrl = (base, path) => new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const createMailerLiteExactMutationClient = ({ options, key, fetchImpl = fetch, calls = [] }) => ({
  calls,
  request: async ({ method, path, payload }) => {
    assertAllowedExactMutationRequest({ method, path });
    calls.push({ method: String(method).toUpperCase(), path });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetchImpl(requestUrl(options.apiBase, path), {
        method: String(method).toUpperCase(),
        headers: {
          Authorization: ['Bearer', key].join(' '),
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'CRM-Core-MailerLite-Exact-Onboarding-Mutation/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(classifyFailure(response.status, text));
        error.status = response.status;
        throw error;
      }
      return { ok: true, status: response.status, response_status_class: 'success_no_raw_body_recorded' };
    } catch (error) {
      if (error?.status) throw error;
      throw new Error(classifyFailure(0, error instanceof Error ? error.message : String(error)));
    } finally {
      clearTimeout(timeout);
    }
  },
});

const getKeychainSecret = async (service, account) => {
  try {
    const { stdout } = await execFileAsync('security', ['find-generic-password', '-w', '-s', service, '-a', account], { timeout: 10_000, maxBuffer: 1024 * 1024 });
    const key = stdout.trim();
    return key ? { key } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return { key: keychain.key };
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key };
  }
  return { key: null };
};

const executeExactMutation = async ({ client, payload }) => {
  assertAllowedExactMutationRequest({ method: 'POST', path: '/api/subscribers' });
  return client.request({ method: 'POST', path: '/api/subscribers', payload });
};

const receiptFrom = ({ runId, packet, finalCheck, mutationAttempted, mutationExecuted, mutationResultStatus, blockers, recommendedNextStep }) => {
  const mappedFieldFamilies = mappedFieldFamiliesFor(packet);
  return buildReceipt({
    runId,
    packetId: packetIdOf(packet),
    mutationAttempted,
    mutationExecuted,
    finalPreExecutionCheckStatus: finalCheck.status,
    subscriberLookupStatus: finalCheck.subscriber_lookup_status ?? 'blocked',
    groupAssignmentStatus: mutationExecuted ? 'post_subscribers_groups_array_included' : finalCheck.group_assignment_status ?? 'blocked',
    mappedFieldFamilies,
    mutationResultStatus,
    blockers,
    recommendedNextStep,
  });
};

const runFixtureMode = async (options, deps = {}) => {
  const paths = validateFixtureOutputPaths(options, { roots: deps.roots });
  const fixture = await readJson(paths.fixtureFile);
  const packet = fixture.packet ?? {};
  const finalCheck = validateFinalCheckReceipt(fixture.finalCheckReceipt ?? fixture.final_check_receipt ?? {}, {
    nowMs: deps.nowMs,
    maxAgeMs: options.maxFinalCheckAgeMs,
  });
  const runId = deps.runId ?? fixture.run_id ?? 'crm_core_mailerlite_exact_onboarding_mutation_fixture_mock_2026-07-07';
  let receipt;
  let payloadShape = null;
  if (finalCheck.ok) {
    const payload = buildExactMutationPayload(packet);
    payloadShape = buildRedactedPayloadShape(payload);
    receipt = receiptFrom({
      runId,
      packet,
      finalCheck,
      mutationAttempted: true,
      mutationExecuted: true,
      mutationResultStatus: 'mutation_executed_redacted_receipt_ready',
      blockers: [],
      recommendedNextStep: 'central_integration_of_exact_mutation_execution_guard',
    });
  } else {
    receipt = receiptFrom({
      runId,
      packet,
      finalCheck,
      mutationAttempted: false,
      mutationExecuted: false,
      mutationResultStatus: finalCheck.status,
      blockers: [finalCheck.reason],
      recommendedNextStep: 'resolve_final_pre_execution_gate',
    });
  }
  const privateResult = buildPrivateResult({ runId, receipt, privateOutputMode: 'fixture_mock_only', redactedPayloadShape: payloadShape });
  await writeOutputs({ paths, receipt, privateResult });
  return receipt;
};

const runLiveMode = async (options, deps = {}) => {
  const paths = validateLiveOutputPaths(options, { roots: deps.roots });
  await assertExactApprovalPhrase(options);
  const finalCheckReceipt = await readJson(paths.finalCheckRedactedJson);
  const finalCheck = validateFinalCheckReceipt(finalCheckReceipt, { nowMs: deps.nowMs, maxAgeMs: options.maxFinalCheckAgeMs });
  if (!finalCheck.ok) throw new Error(finalCheck.status);
  const packet = await readJson(paths.privatePacketJson);
  const payload = buildExactMutationPayload(packet);
  const payloadShape = buildRedactedPayloadShape(payload);
  const runId = deps.runId ?? 'crm_core_mailerlite_exact_onboarding_mutation_guard_2026-07-07';

  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) throw new Error('blocked_missing_mailerlite_credential');
  const client = deps.exactMutationClient ?? createMailerLiteExactMutationClient({
    options,
    key: credential.key,
    fetchImpl: deps.fetchImpl ?? fetch,
    calls: deps.calls ?? [],
  });
  const mutationResponse = await executeExactMutation({ client, payload });

  const receipt = receiptFrom({
    runId,
    packet,
    finalCheck,
    mutationAttempted: true,
    mutationExecuted: true,
    mutationResultStatus: 'mutation_executed_redacted_receipt_ready',
    blockers: [],
    recommendedNextStep: 'central_integration_of_exact_mutation_execution_guard',
  });
  const privateResult = buildPrivateResult({
    runId,
    receipt,
    privateOutputMode: deps.exactMutationClient ? 'mocked_live_prechecked_only' : 'future_live_prechecked_exact_route',
    redactedPayloadShape: payloadShape,
    responseStatus: mutationResponse?.response_status_class ?? 'success_no_raw_body_recorded',
  });
  await writeOutputs({ paths, receipt, privateResult });
  return receipt;
};

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }
  const receipt = options.fixtureFile ? await runFixtureMode(options, deps) : await runLiveMode(options, deps);
  console.log(JSON.stringify(compactStdout(receipt)));
  return receipt;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.log(JSON.stringify({ ok: false, status: 'blocked', reason: error?.message ?? 'unknown_error' }));
    process.exitCode = 1;
  });
}

export {
  ALLOWED_EXACT_MUTATION_REQUESTS,
  ALLOWED_FIELD_FAMILIES,
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  DEFAULT_MAX_FINAL_CHECK_AGE_MS,
  EXACT_MUTATION_GUARD_STATUS,
  FUTURE_EXACT_APPROVAL_PHRASE,
  OMITTED_FIELD_FAMILIES,
  OPERATION_CLASS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  SAFE_MUTATION_CLIENT_CONTRACT,
  SCHEMA_VERSION,
  assertAllowedExactMutationRequest,
  assertPacketReadyForMutation,
  buildExactMutationPayload,
  buildRedactedPayloadShape,
  createMailerLiteExactMutationClient,
  executeExactMutation,
  isInside,
  parseArgs,
  run,
  validateFinalCheckReceipt,
  validateFixtureOutputPaths,
  validateLiveOutputPaths,
};
