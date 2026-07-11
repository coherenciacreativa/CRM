#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  approvalTemplatePayload,
  validateActiveTriggerCorrectionApprovalPhrase,
} from './crm-vnext-mailerlite-active-trigger-correction-approval-contract.mjs';
import {
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  cleanString,
  sameReference,
  validateActiveTriggerCorrectionPacket,
} from './crm-vnext-mailerlite-active-trigger-correction-contract.mjs';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const REDACTED_RECEIPT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow';
const SCHEMA_VERSION = 'crm-vnext-mailerlite-existing-subscriber-active-trigger-correction-2026-07-11-v1';
const GUARD_STATUS = 'implemented_and_mock_tested';
const DEFAULT_API_BASE = ['https:', '', 'connect.mailerlite.com', 'api'].join('/');
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const ALLOWED_CORRECTION_REQUESTS = [
  { method: 'GET', pattern: /^\/api\/subscribers\/[^/?#]+(?:\?.*)?$/i, label: 'packet_specific_subscriber_get' },
  { method: 'POST', pattern: /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+$/i, label: 'packet_specific_subscriber_group_assignment' },
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs [options]

Safe modes:
  --help
  --print-approval-template
  --validate-approval-phrase-file <path>
  --preflight-only

Future live correction mode:
  --allow-live-existing-subscriber-active-trigger-correction
  --private-correction-packet-json <path>
  --private-result-json <path>
  --private-result-md <path>
  --redacted-receipt-json <path>
  --redacted-receipt-md <path>
  --approval-phrase-file <path>

No raw email, subscriber ID or group ID is accepted on the CLI.`;

const parseArgs = (argv) => {
  const options = {
    help: false,
    printApprovalTemplate: false,
    validateApprovalPhraseFile: null,
    preflightOnly: false,
    allowLiveExistingSubscriberActiveTriggerCorrection: false,
    privateCorrectionPacketJson: null,
    privateResultJson: null,
    privateResultMd: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    approvalPhraseFile: null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--print-approval-template') options.printApprovalTemplate = true;
    else if (arg === '--validate-approval-phrase-file') options.validateApprovalPhraseFile = argv[++index];
    else if (arg === '--preflight-only') options.preflightOnly = true;
    else if (arg === '--allow-live-existing-subscriber-active-trigger-correction') options.allowLiveExistingSubscriberActiveTriggerCorrection = true;
    else if (arg === '--private-correction-packet-json') options.privateCorrectionPacketJson = argv[++index];
    else if (arg === '--private-result-json') options.privateResultJson = argv[++index];
    else if (arg === '--private-result-md') options.privateResultMd = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (arg === '--approval-phrase-file') options.approvalPhraseFile = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (/email|subscriber.?id|group.?id|raw|debug|token|header|credential|env/i.test(arg)) throw new Error(`forbidden_flag:${arg}`);
    else throw new Error(`unknown_arg:${arg}`);
  }
  options.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
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
  if (isInside(targetPath, rootPath)) throw new Error('blocked_output_path_policy');
};

const assertUnderRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (!isInside(targetPath, rootPath) || resolve(targetPath) === resolve(rootPath)) throw new Error('blocked_output_path_policy');
};

const validatePathPolicy = (options, { roots = {} } = {}) => {
  const resolvedRoots = rootsWithDefaults(roots);
  for (const [key, label] of [
    ['privateCorrectionPacketJson', 'private_correction_packet_json'],
    ['privateResultJson', 'private_result_json'],
    ['privateResultMd', 'private_result_md'],
    ['redactedReceiptJson', 'redacted_receipt_json'],
    ['redactedReceiptMd', 'redacted_receipt_md'],
  ]) assertOutsideRoot(options[key], resolvedRoots.repoRoot, label);
  assertUnderRoot(options.privateCorrectionPacketJson, resolvedRoots.privateMailerLiteRoot, 'private_correction_packet_json');
  assertUnderRoot(options.privateResultJson, resolvedRoots.privateMailerLiteRoot, 'private_result_json');
  assertUnderRoot(options.privateResultMd, resolvedRoots.privateMailerLiteRoot, 'private_result_md');
  assertUnderRoot(options.redactedReceiptJson, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_json');
  assertUnderRoot(options.redactedReceiptMd, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_md');
  return {
    privateCorrectionPacketJson: resolve(options.privateCorrectionPacketJson),
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
  };
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const writeText = async (filePath, value) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
};

const approvalTextFrom = async (options) => {
  const filePath = options.approvalPhraseFile ?? options.validateApprovalPhraseFile;
  if (!filePath) return null;
  try {
    return await readFile(resolve(filePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const assertExactApprovalPhrase = async (options) => {
  const validation = validateActiveTriggerCorrectionApprovalPhrase(await approvalTextFrom(options));
  if (!validation.ok) throw new Error(validation.reason);
  return validation;
};

const forbiddenEndpointReason = ({ method = 'GET', path = '' }) => {
  const upper = String(method).toUpperCase();
  const cleanPath = String(path);
  if (upper === 'GET' && /^\/api\/subscribers(?:$|\?)/i.test(cleanPath)) return 'blocked_broad_subscriber_list_endpoint';
  if (upper === 'POST' && /^\/api\/subscribers(?:$|\?)/i.test(cleanPath)) return 'blocked_subscriber_upsert_endpoint_for_correction';
  if (upper === 'PUT' && /^\/api\/subscribers\/[^/?#]+/i.test(cleanPath)) return 'blocked_put_subscriber_update_endpoint';
  if (upper === 'DELETE' && /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+/i.test(cleanPath)) return 'blocked_group_unassign_endpoint';
  if (upper === 'DELETE' && /^\/api\/subscribers\/[^/?#]+/i.test(cleanPath)) return 'blocked_subscriber_delete_endpoint';
  if (upper === 'POST' && /^\/api\/subscribers\/[^/]+\/forget/i.test(cleanPath)) return 'blocked_subscriber_forget_endpoint';
  if (upper === 'GET' && /^\/api\/groups\/[^/]+\/subscribers/i.test(cleanPath)) return 'blocked_group_subscriber_export_endpoint';
  if (upper === 'POST' && /^\/api\/groups\/[^/]+\/import-subscribers/i.test(cleanPath)) return 'blocked_bulk_import_endpoint';
  if (/\/api\/fields?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_field_endpoint';
  if (/imports?|bulk|batch/i.test(cleanPath)) return 'blocked_bulk_import_endpoint';
  if (/\/api\/groups?(?:\/|$|\?)/i.test(cleanPath) && !(upper === 'POST' && /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+$/i.test(cleanPath))) return 'blocked_group_management_endpoint';
  if (/\/api\/automations?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_automation_endpoint';
  if (/\/api\/campaigns?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_campaign_endpoint';
  if (/\/api\/segments?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_segment_endpoint';
  if (/\/api\/forms?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_form_endpoint';
  if (/\/api\/webhooks?(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_webhook_endpoint';
  if (/\/api\/account(?:\/|$|\?)|\/api\/settings(?:\/|$|\?)/i.test(cleanPath)) return 'blocked_account_settings_endpoint';
  return 'blocked_endpoint_not_allowlisted';
};

const assertAllowedCorrectionRequest = ({ method = 'GET', path }) => {
  const upper = String(method).toUpperCase();
  const cleanPath = String(path);
  const allowed = ALLOWED_CORRECTION_REQUESTS.some((item) => item.method === upper && item.pattern.test(cleanPath));
  if (!allowed) throw new Error(forbiddenEndpointReason({ method, path }));
  return true;
};

const apiBaseRelativePathFor = (requestPath) => requestPath.replace(/^\/api\//, '/');
const requestUrl = (base, requestPath) => {
  const relativePath = apiBaseRelativePathFor(requestPath);
  return new URL(`${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`);
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 404) return 'mailerlite_not_found';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const createMailerLiteActiveTriggerCorrectionClient = ({ options, key, fetchImpl = fetch, calls = [] }) => ({
  calls,
  request: async ({ method, path, payload }) => {
    assertAllowedCorrectionRequest({ method, path });
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
          'User-Agent': 'CRM-Core-MailerLite-Active-Trigger-Correction/1.0',
        },
        body: payload === undefined || payload === null ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(classifyFailure(response.status, text));
        error.status = response.status;
        throw error;
      }
      if (!text) return { ok: true };
      try { return JSON.parse(text); }
      catch { return { ok: true, response_status_class: 'success_no_raw_body_recorded' }; }
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

const encodePathPart = (value) => encodeURIComponent(String(value));
const subscriberGetPath = (anchor) => `/api/subscribers/${encodePathPart(anchor)}`;
const assignmentPath = (subscriberId, groupReference) => `/api/subscribers/${encodePathPart(subscriberId)}/groups/${encodePathPart(groupReference)}`;

const arrayFrom = (value) => Array.isArray(value) ? value : [];
const valueFrom = (record, keys) => {
  for (const key of keys) {
    const parts = key.split('.');
    let cursor = record;
    for (const part of parts) cursor = cursor && typeof cursor === 'object' ? cursor[part] : undefined;
    if (cursor !== undefined && cursor !== null && cursor !== '') return cursor;
  }
  return null;
};

const groupReferencesFrom = (subscriberLike) => {
  const groups = arrayFrom(valueFrom(subscriberLike, ['groups', 'data.groups', 'subscriber.groups', 'data.subscriber.groups']));
  return groups.flatMap((group) => [group, group?.id, group?.group_id, group?.reference, group?.name]).map(cleanString).filter(Boolean);
};

const subscriberFromResponse = (response) => valueFrom(response, ['subscriber', 'data', 'record', 'records.0']) ?? response?.subscriber ?? response?.data ?? response;

const classifySubscriberLookup = (response, activeReference, priorReference = null) => {
  if (!response || response.status === 404 || response.subscriber_lookup_status === 'not_found') {
    return { subscriber_lookup_status: 'not_found', subscriber_status_class: 'not_found', active_trigger_membership: 'unknown', prior_non_active_group_present: 'unknown' };
  }
  const records = arrayFrom(response.records ?? response.data?.records);
  if (response.subscriber_lookup_status === 'ambiguous' || records.length > 1) {
    return { subscriber_lookup_status: 'ambiguous', subscriber_status_class: 'unknown', active_trigger_membership: 'unknown', prior_non_active_group_present: 'unknown' };
  }
  const subscriber = subscriberFromResponse(response);
  const subscriberId = cleanString(valueFrom(subscriber, ['id', 'subscriber_id', 'subscriberId'])) ?? cleanString(response.subscriber_id);
  const status = cleanString(response.subscriber_status_class ?? valueFrom(subscriber, ['status', 'state']))?.toLowerCase() ?? null;
  const groups = groupReferencesFrom(subscriber).length ? groupReferencesFrom(subscriber) : groupReferencesFrom(response);
  const activePresent = groups.some((group) => sameReference(group, activeReference));
  const priorPresent = priorReference ? groups.some((group) => sameReference(group, priorReference)) : null;
  const membership = groups.length ? (activePresent ? 'present' : 'absent') : 'unknown';
  let subscriberStatusClass = 'unknown';
  if (['active', 'subscribed'].includes(status ?? '')) subscriberStatusClass = 'active';
  else if (['unsubscribed', 'bounced', 'junk', 'spam_complaint', 'complained', 'inactive'].includes(status ?? '')) subscriberStatusClass = 'unsafe_or_suppressed';
  else if (response.subscriber_status_class) subscriberStatusClass = cleanString(response.subscriber_status_class);
  return {
    subscriber_lookup_status: subscriberId ? 'found' : 'unknown',
    subscriber_status_class: subscriberStatusClass,
    subscriber_id_private: subscriberId,
    active_trigger_membership: membership,
    prior_non_active_group_present: priorReference ? (priorPresent ? 'present' : 'absent') : 'not_applicable',
    group_count: groups.length,
  };
};

const priorPreservationStatus = (before, after, priorReference) => {
  if (!priorReference) return 'not_applicable';
  if (before.prior_non_active_group_present === 'present' && after.prior_non_active_group_present === 'present') return 'present_preserved';
  if (before.prior_non_active_group_present === 'present' && after.prior_non_active_group_present !== 'present') return 'failed_removed_or_unverified';
  if (before.prior_non_active_group_present === 'absent') return 'absent_before_correction';
  return 'unknown';
};

const buildReceipt = ({
  runId,
  packetValidation,
  correctionAttempted = false,
  correctionExecuted = false,
  correctionResultStatus,
  subscriberLookupStatus = 'not_run',
  subscriberStatusClass = 'not_run',
  activeTriggerMembershipBefore = 'not_run',
  activeTriggerMembershipAfter = 'not_run',
  priorNonActiveGroupPreservationStatus = 'not_run',
  mutationEndpointCallCount = 0,
  postCorrectionVerificationStatus = 'not_run',
  blockers = [],
  recommendedNextStep,
}) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  packet_id: packetValidation?.packet_id ?? 'unknown_packet',
  operation_class: CORRECTION_OPERATION_CLASS,
  correction_attempted: correctionAttempted,
  correction_executed: correctionExecuted,
  correction_result_status: correctionResultStatus,
  subscriber_lookup_status: subscriberLookupStatus,
  subscriber_status_class: subscriberStatusClass,
  active_trigger_membership_before: activeTriggerMembershipBefore,
  active_trigger_membership_after: activeTriggerMembershipAfter,
  prior_non_active_group_preservation_status: priorNonActiveGroupPreservationStatus,
  mutation_endpoint_call_count: mutationEndpointCallCount,
  post_correction_verification_status: postCorrectionVerificationStatus,
  blockers,
  recommended_next_step: recommendedNextStep,
  closed_gates: [
    'no_group_removal',
    'no_group_replacement',
    'no_put_subscriber_update',
    'no_subscriber_upsert_post_for_correction',
    'no_status_or_resubscribe_set',
    'no_field_creation_or_update',
    'no_automation_or_campaign_mutation',
    'no_broad_import',
    'no_raw_private_values_in_redacted_receipts',
    'no_crm_or_source_write',
  ],
});

const markdownReceipt = (receipt) => `# MailerLite Existing Subscriber Active Trigger Correction Receipt\n\n- run_id: ${receipt.run_id}\n- packet_id: ${receipt.packet_id}\n- operation_class: ${receipt.operation_class}\n- correction_attempted: ${receipt.correction_attempted}\n- correction_executed: ${receipt.correction_executed}\n- correction_result_status: ${receipt.correction_result_status}\n- subscriber_lookup_status: ${receipt.subscriber_lookup_status}\n- subscriber_status_class: ${receipt.subscriber_status_class}\n- active_trigger_membership_before: ${receipt.active_trigger_membership_before}\n- active_trigger_membership_after: ${receipt.active_trigger_membership_after}\n- prior_non_active_group_preservation_status: ${receipt.prior_non_active_group_preservation_status}\n- mutation_endpoint_call_count: ${receipt.mutation_endpoint_call_count}\n- post_correction_verification_status: ${receipt.post_correction_verification_status}\n- blockers: ${receipt.blockers.length ? receipt.blockers.join(', ') : 'none'}\n- recommended_next_step: ${receipt.recommended_next_step}\n`;

const buildPrivateResult = ({ receipt, privateOutputMode }) => ({
  schema_version: SCHEMA_VERSION,
  private_output_mode: privateOutputMode,
  run_id: receipt.run_id,
  packet_id: receipt.packet_id,
  operation_class: receipt.operation_class,
  correction_attempted: receipt.correction_attempted,
  correction_executed: receipt.correction_executed,
  correction_result_status: receipt.correction_result_status,
  private_result_notice: 'Private correction run metadata only. Raw private lookup anchors, subscriber rows, raw payloads, credentials, headers, tokens, and private subscriber content are intentionally omitted by this guard.',
});

const privateMarkdown = (result) => `# MailerLite Active Trigger Correction Private Result\n\n- run_id: ${result.run_id}\n- packet_id: ${result.packet_id}\n- correction_attempted: ${result.correction_attempted}\n- correction_executed: ${result.correction_executed}\n- correction_result_status: ${result.correction_result_status}\n\n${result.private_result_notice}\n`;

const sensitiveValuesFor = (packetValidation, lookupBefore = {}, lookupAfter = {}) => [
  packetValidation?.existing_subscriber_lookup_anchor,
  packetValidation?.active_live_trigger_group_reference,
  packetValidation?.prior_non_active_group_reference,
  lookupBefore?.subscriber_id_private,
  lookupAfter?.subscriber_id_private,
].filter(Boolean);

const redactScan = (text, sensitiveValues = []) => {
  const generic = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /bearer\s+[a-z0-9._~+/=-]+/i,
    /api[_ -]?key\s*[:=]/i,
    /token\s*[:=]/i,
    /secret\s*[:=]/i,
    /authorization\s*[:=]/i,
  ];
  if (generic.some((re) => re.test(text))) return false;
  return sensitiveValues.every((value) => !String(value) || String(value).length < 3 || !text.includes(String(value)));
};

const writeOutputs = async ({ paths, receipt, privateResult, sensitiveValues }) => {
  const receiptJson = `${JSON.stringify(receipt, null, 2)}\n`;
  const receiptMd = markdownReceipt(receipt);
  if (!redactScan(receiptJson, sensitiveValues) || !redactScan(receiptMd, sensitiveValues)) throw new Error('blocked_redaction_failure');
  await writeJson(paths.redactedReceiptJson, receipt);
  await writeText(paths.redactedReceiptMd, receiptMd);
  await writeJson(paths.privateResultJson, privateResult);
  await writeText(paths.privateResultMd, privateMarkdown(privateResult));
};

const compactStdout = (receipt) => ({
  ok: !String(receipt.correction_result_status).startsWith('blocked_'),
  correction_result_status: receipt.correction_result_status,
  correction_attempted: receipt.correction_attempted,
  correction_executed: receipt.correction_executed,
  recommended_next_step: receipt.recommended_next_step,
});

const mutationAttemptLimiter = () => {
  let mutationEndpointCallCount = 0;
  return {
    get count() { return mutationEndpointCallCount; },
    assertAndCount(request) {
      assertAllowedCorrectionRequest(request);
      if (String(request.method).toUpperCase() === 'POST' && /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+$/i.test(String(request.path))) {
        mutationEndpointCallCount += 1;
        if (mutationEndpointCallCount > 1) throw new Error('blocked_multiple_mutation_attempts');
      }
    },
  };
};

const guardedRequest = async (client, limiter, request) => {
  limiter.assertAndCount(request);
  return client.request(request);
};

const runPreflightOnlyMode = async (options, deps = {}) => {
  const paths = validatePathPolicy(options, { roots: deps.roots });
  if (options.approvalPhraseFile) await assertExactApprovalPhrase(options);
  const packet = await readJson(paths.privateCorrectionPacketJson);
  const packetValidation = validateActiveTriggerCorrectionPacket(packet);
  if (!packetValidation.ok) throw new Error(packetValidation.reason);
  return buildReceipt({
    runId: deps.runId ?? 'crm_core_mailerlite_active_trigger_correction_preflight_only_2026-07-11',
    packetValidation,
    correctionResultStatus: 'preflight_only_ready_for_exact_active_trigger_correction_approval',
    recommendedNextStep: 'request_exact_active_trigger_correction_approval',
  });
};

const runLiveMode = async (options, deps = {}) => {
  if (!options.allowLiveExistingSubscriberActiveTriggerCorrection) throw new Error('not_run_missing_approval');
  const paths = validatePathPolicy(options, { roots: deps.roots });
  await assertExactApprovalPhrase(options);
  const packet = await readJson(paths.privateCorrectionPacketJson);
  const packetValidation = validateActiveTriggerCorrectionPacket(packet);
  if (!packetValidation.ok) throw new Error('blocked_private_packet_contract_invalid');
  const runId = deps.runId ?? 'crm_core_mailerlite_existing_subscriber_active_trigger_correction_2026-07-11';

  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) throw new Error('blocked_missing_mailerlite_credential');
  const baseClient = deps.correctionClient ?? createMailerLiteActiveTriggerCorrectionClient({ options, key: credential.key, fetchImpl: deps.fetchImpl ?? fetch, calls: deps.calls ?? [] });
  const limiter = mutationAttemptLimiter();

  const beforeResponse = await guardedRequest(baseClient, limiter, { method: 'GET', path: subscriberGetPath(packetValidation.existing_subscriber_lookup_anchor) });
  const before = classifySubscriberLookup(beforeResponse, packetValidation.active_live_trigger_group_reference, packetValidation.prior_non_active_group_reference);
  let receipt;
  let after = {};
  if (before.subscriber_lookup_status !== 'found') {
    receipt = buildReceipt({ runId, packetValidation, correctionResultStatus: 'blocked_subscriber_not_found', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: ['subscriber_not_found_or_ambiguous'], recommendedNextStep: 'resolve_correction_blocker_before_retry' });
  } else if (before.subscriber_status_class !== 'active') {
    const status = before.subscriber_status_class === 'unsafe_or_suppressed' ? 'blocked_subscriber_status_unsafe_or_suppressed' : 'blocked_subscriber_status_not_active';
    receipt = buildReceipt({ runId, packetValidation, correctionResultStatus: status, subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: [status], recommendedNextStep: 'resolve_correction_blocker_before_retry' });
  } else if (before.active_trigger_membership === 'unknown') {
    receipt = buildReceipt({ runId, packetValidation, correctionResultStatus: 'blocked_active_trigger_membership_unknown', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: ['active_trigger_membership_unknown'], recommendedNextStep: 'resolve_correction_blocker_before_retry' });
  } else if (before.active_trigger_membership === 'present') {
    receipt = buildReceipt({ runId, packetValidation, correctionResultStatus: 'already_present_idempotent_noop', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: 'present', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: before.prior_non_active_group_present === 'present' ? 'present_preserved' : before.prior_non_active_group_present, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'retained_pre_correction_membership_present', recommendedNextStep: 'central_closeout_existing_subscriber_active_trigger_correction_result' });
  } else {
    await guardedRequest(baseClient, limiter, { method: 'POST', path: assignmentPath(before.subscriber_id_private, packetValidation.active_live_trigger_group_reference), payload: null });
    const afterResponse = await guardedRequest(baseClient, limiter, { method: 'GET', path: subscriberGetPath(packetValidation.existing_subscriber_lookup_anchor) });
    after = classifySubscriberLookup(afterResponse, packetValidation.active_live_trigger_group_reference, packetValidation.prior_non_active_group_reference);
    const preservation = priorPreservationStatus(before, after, packetValidation.prior_non_active_group_reference);
    if (after.active_trigger_membership !== 'present' || preservation === 'failed_removed_or_unverified') {
      receipt = buildReceipt({ runId, packetValidation, correctionAttempted: true, correctionExecuted: true, correctionResultStatus: 'blocked_post_correction_verification_failed', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: after.active_trigger_membership, priorNonActiveGroupPreservationStatus: preservation, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed', blockers: ['post_correction_verification_failed'], recommendedNextStep: 'resolve_correction_blocker_before_retry' });
    } else {
      receipt = buildReceipt({ runId, packetValidation, correctionAttempted: true, correctionExecuted: true, correctionResultStatus: 'correction_executed_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed', recommendedNextStep: 'central_closeout_existing_subscriber_active_trigger_correction_result' });
    }
  }

  await writeOutputs({
    paths,
    receipt,
    privateResult: buildPrivateResult({ receipt, privateOutputMode: deps.correctionClient ? 'mocked_live_atomic_route' : 'future_live_atomic_route' }),
    sensitiveValues: sensitiveValuesFor(packetValidation, before, after),
  });
  return receipt;
};

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }
  if (options.printApprovalTemplate) {
    const payload = approvalTemplatePayload();
    console.log(JSON.stringify(payload));
    return { ok: true, approval_template_printed: true, ...payload };
  }
  if (options.validateApprovalPhraseFile) {
    const validation = await assertExactApprovalPhrase(options);
    console.log(JSON.stringify({ ok: true, status: validation.status, contract_version: validation.contract_version }));
    return validation;
  }
  const receipt = options.preflightOnly ? await runPreflightOnlyMode(options, deps) : await runLiveMode(options, deps);
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
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  ALLOWED_CORRECTION_REQUESTS,
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  DEFAULT_API_BASE,
  GUARD_STATUS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  SCHEMA_VERSION,
  assertAllowedCorrectionRequest,
  classifySubscriberLookup,
  createMailerLiteActiveTriggerCorrectionClient,
  forbiddenEndpointReason,
  isInside,
  mutationAttemptLimiter,
  parseArgs,
  priorPreservationStatus,
  redactScan,
  run,
  runLiveMode,
  runPreflightOnlyMode,
  subscriberGetPath,
  validateActiveTriggerCorrectionApprovalPhrase,
  validateActiveTriggerCorrectionPacket,
  validatePathPolicy,
};
