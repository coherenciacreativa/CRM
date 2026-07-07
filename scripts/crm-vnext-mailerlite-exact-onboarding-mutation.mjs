#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-exact-onboarding-mutation-2026-07-07-v0';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const REDACTED_RECEIPT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow';
const OPERATION_CLASS = 'subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass';
const COMPLETED_FINAL_CHECK_ROUTE_STATUS = 'completed_live_readonly_packet_final_check';
const BLOCKED_CLIENT_CONTRACT_MISSING = 'blocked_route_not_implemented_safe_mutation_client_contract_missing';
const FUTURE_EXACT_APPROVAL_PHRASE = 'I approve CRM Core to execute one MailerLite onboarding mutation for the explicitly approved repaired private onboarding packet only, using the implemented exact mutation execution guard. Use the approved operation class `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`, the approved native top-level email semantics, the approved existing field mapping, and the confirmed onboarding group. Immediately before mutation, perform or validate the packet-specific idempotency and suppression safety gate. Do not create fields, do not modify automations or campaigns, do not create or modify segments, forms, webhooks, or account settings, do not perform a broad import, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, private message text, private subscriber content, or private artifact contents, and write only private result artifacts plus redacted aggregate receipts.';

const ALLOWED_MOCK_MUTATION_REQUESTS = new Set([
  'POST /mock/exact-onboarding/subscriber-upsert',
  'POST /mock/exact-onboarding/onboarding-group-assignment',
]);

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
  --approval-phrase <exact phrase> OR --approval-file <path>
  --private-packet-json <approved repaired private packet path>
  --final-check-redacted-json <approved final-check redacted receipt path>
  --private-result-json <approved private result JSON path>
  --private-result-md <approved private result MD path>
  --redacted-receipt-json <approved redacted receipt JSON path>
  --redacted-receipt-md <approved redacted receipt MD path>

This command is a redaction-safe exact onboarding mutation guard. This task does
not implement a live MailerLite mutation client contract; future live mode blocks
after approval, path, final-check, packet, and redaction prechecks unless an
approved mock client is injected by tests.`;

const parseArgs = (argv) => {
  const options = {
    fixtureFile: null,
    allowLiveExactOnboardingMutation: false,
    approvalPhrase: null,
    approvalFile: null,
    privatePacketJson: null,
    finalCheckRedactedJson: null,
    privateResultJson: null,
    privateResultMd: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--allow-live-exact-onboarding-mutation') options.allowLiveExactOnboardingMutation = true;
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--approval-file') options.approvalFile = argv[++index];
    else if (arg === '--private-packet-json') options.privatePacketJson = argv[++index];
    else if (arg === '--final-check-redacted-json') options.finalCheckRedactedJson = argv[++index];
    else if (arg === '--private-result-json') options.privateResultJson = argv[++index];
    else if (arg === '--private-result-md') options.privateResultMd = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (/debug|raw|env|credential|header|token/i.test(arg)) throw new Error(`forbidden_flag:${arg}`);
    else throw new Error(`unknown_arg:${arg}`);
  }

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

const mappedFieldFamiliesFor = (packet) => {
  if (Array.isArray(packet?.mapped_field_families)) return packet.mapped_field_families.map(cleanString).filter(Boolean).filter((item) => ['name', 'country', 'city'].includes(item));
  if (Array.isArray(packet?.field_families)) return packet.field_families.map(cleanString).filter(Boolean).filter((item) => ['name', 'country', 'city'].includes(item));
  const families = [];
  const fields = packet?.fields && typeof packet.fields === 'object' ? packet.fields : {};
  for (const family of ['name', 'country', 'city']) {
    if (Object.prototype.hasOwnProperty.call(fields, family) || Object.prototype.hasOwnProperty.call(packet ?? {}, family)) families.push(family);
  }
  return families;
};

const approvalTextFrom = async (options) => {
  if (options.approvalPhrase) return cleanString(options.approvalPhrase);
  if (options.approvalFile) return cleanString(await readFile(resolve(options.approvalFile), 'utf8'));
  return null;
};

const assertExactApprovalPhrase = async (options) => {
  const phrase = await approvalTextFrom(options);
  if (phrase !== FUTURE_EXACT_APPROVAL_PHRASE) throw new Error('not_run_missing_approval');
};

const blocker = (reason, status = 'not_run_final_check_failed') => ({
  ok: false,
  status,
  reason,
});

const hasBlockers = (value) => Array.isArray(value) ? value.length > 0 : Boolean(value);

const finalCheckFreshnessStatus = (receipt) => cleanString(firstValue(receipt, [
  'freshness_status',
  'final_check_freshness_status',
  'freshness_window_status',
  'approved_freshness_status',
]));

const validateFinalCheckReceipt = (receipt) => {
  if (!receipt || typeof receipt !== 'object') return blocker('final_check_missing', 'not_run_final_check_missing');
  if (receipt.route_status !== COMPLETED_FINAL_CHECK_ROUTE_STATUS) return blocker('final_check_route_status_not_completed');
  if (receipt.live_lookup_ran !== true) return blocker('final_check_live_lookup_not_confirmed');
  if (receipt.mailerlite_api_called !== true) return blocker('final_check_api_call_not_confirmed');
  if (hasBlockers(receipt.blockers)) return blocker('final_check_blockers_present');

  const freshness = finalCheckFreshnessStatus(receipt);
  const freshnessOk = receipt.freshness_approved === true || [
    'fresh',
    'fresh_within_approved_window',
    'within_approved_window',
    'approved_freshness_window',
  ].includes(freshness);
  if (!freshnessOk) return blocker('final_check_freshness_unknown_or_stale', 'not_run_final_check_stale');

  const subscriberLookupStatus = cleanString(receipt.subscriber_lookup_status);
  const subscriberStatusClass = cleanString(receipt.subscriber_status_class ?? receipt.subscriber_status);
  const groupMembershipStatus = cleanString(receipt.onboarding_group_membership_status ?? receipt.group_assignment_status);
  const duplicateStatus = cleanString(receipt.duplicate_readd_status);
  const suppressionStatus = cleanString(receipt.suppression_status);
  const idempotencyStatus = cleanString(receipt.idempotency_status);

  if (['unsubscribed', 'bounced', 'complained', 'junk', 'unknown', 'ambiguous'].includes(subscriberStatusClass)) return blocker('final_check_subscriber_status_blocked');
  if (subscriberLookupStatus === 'found' && subscriberStatusClass !== 'active') return blocker('final_check_found_subscriber_not_active_safe_state');
  if (!['not_found', 'found'].includes(subscriberLookupStatus)) return blocker('final_check_lookup_not_safe');
  if (!['not_found', 'absent'].includes(groupMembershipStatus)) return blocker('final_check_group_membership_not_safe');
  if (duplicateStatus !== 'safe_new_or_not_in_group') return blocker('final_check_duplicate_readd_not_safe');
  if (suppressionStatus !== 'pass') return blocker('final_check_suppression_not_pass');
  if (idempotencyStatus !== 'pass') return blocker('final_check_idempotency_not_pass');

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
  if (/\/fields(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_field_creation_endpoint';
  if (/\/automations?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_automation_mutation_endpoint';
  if (/\/campaigns?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_campaign_endpoint';
  if (/\/segments?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_segment_endpoint';
  if (/\/forms?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_form_endpoint';
  if (/\/webhooks?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_webhook_endpoint';
  if (/\/account(?:\/|$|\?)/i.test(cleanPath) || /\/settings(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_account_settings_endpoint';
  if (/imports?/i.test(cleanPath)) return 'blocked_broad_import_endpoint';
  if (upper === 'DELETE' && /\/groups?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_group_removal_endpoint';
  if (upper === 'DELETE' && /\/subscribers?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_subscriber_deletion_endpoint';
  if (['PUT', 'PATCH'].includes(upper)) return 'blocked_destructive_or_partial_update_endpoint';
  return 'blocked_unapproved_mutation_endpoint';
};

const assertAllowedExactMutationRequest = ({ method = 'GET', path }) => {
  const signature = `${String(method).toUpperCase()} ${String(path)}`;
  if (!ALLOWED_MOCK_MUTATION_REQUESTS.has(signature)) throw new Error(forbiddenEndpointReason({ method, path }));
  return true;
};

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
    'no_field_creation',
    'no_automation_mutation',
    'no_campaign_creation_or_send',
    'no_segment_form_webhook_or_account_settings_mutation',
    'no_group_removal',
    'no_subscriber_deletion',
    'no_crm_or_source_write',
    'no_raw_email_or_ids_in_redacted_receipt',
  ],
});

const buildPrivateResult = ({ runId, receipt, privateOutputMode }) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  private_output_mode: privateOutputMode,
  packet_id: receipt.packet_id,
  operation_class: OPERATION_CLASS,
  mutation_attempted: receipt.mutation_attempted,
  mutation_executed: receipt.mutation_executed,
  mutation_result_status: receipt.mutation_result_status,
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
  ok: !String(receipt.mutation_result_status).startsWith('not_run') && !String(receipt.mutation_result_status).startsWith('mutation_blocked'),
  mutation_result_status: receipt.mutation_result_status,
  mutation_attempted: receipt.mutation_attempted,
  mutation_executed: receipt.mutation_executed,
  recommended_next_step: receipt.recommended_next_step,
});

const executeMockedMutation = async ({ client, mappedFieldFamilies }) => {
  assertAllowedExactMutationRequest({ method: 'POST', path: '/mock/exact-onboarding/subscriber-upsert' });
  assertAllowedExactMutationRequest({ method: 'POST', path: '/mock/exact-onboarding/onboarding-group-assignment' });
  if (client?.upsertSubscriber) await client.upsertSubscriber({ operation: 'subscriber_upsert', field_families: mappedFieldFamilies });
  if (client?.assignOnboardingGroup) await client.assignOnboardingGroup({ operation: 'onboarding_group_assignment' });
};

const runFixtureMode = async (options, deps = {}) => {
  const paths = validateFixtureOutputPaths(options, { roots: deps.roots });
  const fixture = await readJson(paths.fixtureFile);
  const packet = fixture.packet ?? {};
  const finalCheck = validateFinalCheckReceipt(fixture.finalCheckReceipt ?? fixture.final_check_receipt ?? {});
  const mappedFieldFamilies = mappedFieldFamiliesFor(packet);
  const runId = deps.runId ?? fixture.run_id ?? 'crm_core_mailerlite_exact_onboarding_mutation_fixture_mock_2026-07-07';
  const packetId = packetIdOf(packet);
  const blockers = finalCheck.ok ? [] : [finalCheck.reason];
  const mutationResultStatus = finalCheck.ok ? 'mutation_executed_redacted_receipt_ready' : finalCheck.status;
  const receipt = buildReceipt({
    runId,
    packetId,
    mutationAttempted: finalCheck.ok,
    mutationExecuted: finalCheck.ok,
    finalPreExecutionCheckStatus: finalCheck.status,
    subscriberLookupStatus: finalCheck.subscriber_lookup_status ?? 'blocked',
    groupAssignmentStatus: finalCheck.group_assignment_status ?? 'blocked',
    mappedFieldFamilies,
    mutationResultStatus,
    blockers,
    recommendedNextStep: finalCheck.ok ? 'central_integration_of_exact_mutation_execution_guard' : 'resolve_final_pre_execution_gate',
  });
  const privateResult = buildPrivateResult({ runId, receipt, privateOutputMode: 'fixture_mock_only' });
  await writeOutputs({ paths, receipt, privateResult });
  return receipt;
};

const runLiveMode = async (options, deps = {}) => {
  const paths = validateLiveOutputPaths(options, { roots: deps.roots });
  await assertExactApprovalPhrase(options);
  const finalCheckReceipt = await readJson(paths.finalCheckRedactedJson);
  const finalCheck = validateFinalCheckReceipt(finalCheckReceipt);
  if (!finalCheck.ok) throw new Error(finalCheck.status);
  const packet = await readJson(paths.privatePacketJson);
  if (!privateEmailForLookup(packet)) throw new Error('not_run_missing_private_packet_email_anchor');
  const mappedFieldFamilies = mappedFieldFamiliesFor(packet);
  const runId = deps.runId ?? 'crm_core_mailerlite_exact_onboarding_mutation_guard_2026-07-07';
  const packetId = packetIdOf(packet);

  if (deps.allowMockedMutationExecution === true && deps.exactMutationClient) {
    await executeMockedMutation({ client: deps.exactMutationClient, mappedFieldFamilies });
    const receipt = buildReceipt({
      runId,
      packetId,
      mutationAttempted: true,
      mutationExecuted: true,
      finalPreExecutionCheckStatus: finalCheck.status,
      subscriberLookupStatus: finalCheck.subscriber_lookup_status,
      groupAssignmentStatus: 'mocked_assigned',
      mappedFieldFamilies,
      mutationResultStatus: 'mutation_executed_redacted_receipt_ready',
      blockers: [],
      recommendedNextStep: 'central_integration_of_exact_mutation_execution_guard',
    });
    const privateResult = buildPrivateResult({ runId, receipt, privateOutputMode: 'mocked_live_prechecked_only' });
    await writeOutputs({ paths, receipt, privateResult });
    return receipt;
  }

  const receipt = buildReceipt({
    runId,
    packetId,
    mutationAttempted: false,
    mutationExecuted: false,
    finalPreExecutionCheckStatus: finalCheck.status,
    subscriberLookupStatus: finalCheck.subscriber_lookup_status,
    groupAssignmentStatus: finalCheck.group_assignment_status,
    mappedFieldFamilies,
    mutationResultStatus: 'not_run_route_not_redaction_safe',
    blockers: [BLOCKED_CLIENT_CONTRACT_MISSING],
    recommendedNextStep: 'resolve_safe_mutation_client_contract',
  });
  const privateResult = buildPrivateResult({ runId, receipt, privateOutputMode: 'prechecked_live_blocked_no_client_contract' });
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
  ALLOWED_MOCK_MUTATION_REQUESTS,
  BLOCKED_CLIENT_CONTRACT_MISSING,
  COMPLETED_FINAL_CHECK_ROUTE_STATUS,
  FUTURE_EXACT_APPROVAL_PHRASE,
  OMITTED_FIELD_FAMILIES,
  OPERATION_CLASS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  SCHEMA_VERSION,
  assertAllowedExactMutationRequest,
  isInside,
  parseArgs,
  run,
  validateFinalCheckReceipt,
  validateFixtureOutputPaths,
  validateLiveOutputPaths,
};
