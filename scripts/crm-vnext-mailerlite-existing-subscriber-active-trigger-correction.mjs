#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION,
  ACTIVE_TRIGGER_CORRECTION_APPROVAL_PHRASE,
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  MISSION_CONTRACT_APPROVAL_PHRASE,
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
const MISSION_ACTIVE_NEXT_ACTION = 'crm_core_controlled_welcome_flow_active_trigger_correction_and_first_email_proof_awaiting_fresh_approval_v0';
const MISSION_PACKET_MAX_AGE_MS = 120 * 60 * 1000;
const ALLOWED_CORRECTION_REQUESTS = [
  { method: 'GET', pattern: /^\/api\/subscribers\/[^/?#]+\?include=groups$/i, label: 'packet_specific_subscriber_get_with_groups' },
  { method: 'POST', pattern: /^\/api\/subscribers\/[^/]+\/groups\/[^/?#]+$/i, label: 'packet_specific_subscriber_group_assignment' },
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs [options]

Safe modes:
  --help
  --print-approval-template
  --validate-approval-phrase-file <path>
  --approval-contract-version <version>
  --preflight-only

Future live correction mode:
  --allow-live-existing-subscriber-active-trigger-correction
  --private-correction-packet-json <path>
  --private-result-json <path>
  --private-result-md <path>
  --redacted-receipt-json <path>
  --redacted-receipt-md <path>
  --approval-phrase-file <path>
  --approval-contract-version <version>
  --expected-repo-head <40-hex-sha>
  --expected-active-next-action <id>
  --expected-packet-id <id>
  --run-id <id>

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
    approvalContractVersion: null,
    expectedRepoHead: null,
    expectedActiveNextAction: null,
    expectedPacketId: null,
    runId: null,
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
    else if (arg === '--approval-contract-version') options.approvalContractVersion = argv[++index];
    else if (arg === '--expected-repo-head') options.expectedRepoHead = argv[++index];
    else if (arg === '--expected-active-next-action') options.expectedActiveNextAction = argv[++index];
    else if (arg === '--expected-packet-id') options.expectedPacketId = argv[++index];
    else if (arg === '--run-id') options.runId = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (/email|subscriber.?id|group.?id|raw|debug|token|header|credential|env/i.test(arg)) throw new Error('forbidden_cli_argument');
    else throw new Error('unknown_cli_argument');
  }
  options.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 30_000) throw new Error('blocked_timeout_out_of_bounds');
  return options;
};

const rootsWithDefaults = (roots = {}) => ({
  repoRoot: roots.repoRoot ?? REPO_ROOT,
  privateMailerLiteRoot: roots.privateMailerLiteRoot ?? PRIVATE_MAILERLITE_ROOT,
  redactedReceiptRoot: roots.redactedReceiptRoot ?? REDACTED_RECEIPT_ROOT,
});

const safeBindingValue = (value, pattern, reason) => {
  const normalized = cleanString(value);
  if (!normalized || !pattern.test(normalized)) throw new Error(reason);
  return normalized;
};

const assertApprovedMailerLiteOptions = (options) => {
  let parsed;
  try { parsed = new URL(options.apiBase); }
  catch { throw new Error('blocked_unapproved_mailerlite_api_base'); }
  if (
    options.apiBase !== DEFAULT_API_BASE
    || parsed.protocol !== 'https:'
    || parsed.hostname !== 'connect.mailerlite.com'
    || parsed.port
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/api'
    || parsed.search
    || parsed.hash
  ) throw new Error('blocked_unapproved_mailerlite_api_base');
  if (options.service !== DEFAULT_SERVICE || options.account !== DEFAULT_ACCOUNT) throw new Error('blocked_unapproved_mailerlite_credential_binding');
  return true;
};

const activeNextActionIdFromText = (text) => {
  const marker = '## Active Next Action';
  const index = String(text).lastIndexOf(marker);
  if (index < 0) return null;
  const activeSection = String(text).slice(index + marker.length);
  return activeSection.match(/- `next_action_id`:\s*\n\s*`([^`]+)`/)?.[1] ?? null;
};

const defaultExecutionContextProvider = async (repoRoot) => {
  const [{ stdout: head }, { stdout: status }, nextActionText] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, timeout: 10_000, maxBuffer: 1024 * 1024 }),
    execFileAsync('git', ['status', '--porcelain'], { cwd: repoRoot, timeout: 10_000, maxBuffer: 1024 * 1024 }),
    readFile(join(repoRoot, 'docs/crm-vnext/crm-core-next-action.md'), 'utf8'),
  ]);
  return {
    repo_head: head.trim(),
    worktree_clean: status.trim() === '',
    active_next_action: activeNextActionIdFromText(nextActionText),
  };
};

const missionPacketAutomationReference = (packet) => {
  const values = [
    packet?.private_lookup?.active_onboarding_automation_reference,
    packet?.private_lookup?.exact_onboarding_automation_reference,
    packet?.active_onboarding_automation_reference,
  ].map(cleanString).filter(Boolean);
  const unique = [...new Set(values)];
  if (!unique.length) throw new Error('blocked_mission_automation_reference_missing');
  if (unique.length !== 1) throw new Error('blocked_mission_automation_reference_ambiguous');
  return unique[0];
};

const assertMissionPacketBinding = ({ options, packet, packetValidation, executionContext, now = new Date() }) => {
  const runId = safeBindingValue(options.runId, /^[a-z0-9][a-z0-9._-]{7,160}$/i, 'blocked_mission_run_id_invalid');
  const expectedHead = safeBindingValue(options.expectedRepoHead, /^[0-9a-f]{40}$/i, 'blocked_expected_repo_head_invalid');
  const expectedAction = safeBindingValue(options.expectedActiveNextAction, /^[a-z0-9][a-z0-9._-]{7,200}$/i, 'blocked_expected_active_next_action_invalid');
  const expectedPacketId = safeBindingValue(options.expectedPacketId, /^[a-z0-9][a-z0-9._-]{7,200}$/i, 'blocked_expected_packet_id_invalid');
  if (expectedAction !== MISSION_ACTIVE_NEXT_ACTION) throw new Error('blocked_active_next_action_not_mission');
  if (!executionContext?.worktree_clean) throw new Error('blocked_dirty_worktree');
  if (cleanString(executionContext?.repo_head) !== expectedHead) throw new Error('blocked_repo_head_mismatch');
  if (cleanString(executionContext?.active_next_action) !== expectedAction) throw new Error('blocked_active_next_action_mismatch');
  if (packetValidation.packet_id !== expectedPacketId) throw new Error('blocked_packet_id_mismatch');
  if (cleanString(packet?.mission_contract_version) !== MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) throw new Error('blocked_mission_packet_contract_version_mismatch');
  if (cleanString(packet?.mission_run_id) !== runId) throw new Error('blocked_mission_packet_run_id_mismatch');
  if (cleanString(packet?.expected_repo_head) !== expectedHead) throw new Error('blocked_mission_packet_repo_head_mismatch');
  if (cleanString(packet?.expected_active_next_action) !== expectedAction) throw new Error('blocked_mission_packet_active_next_action_mismatch');
  const createdAt = Date.parse(cleanString(packet?.mission_created_at) ?? '');
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(createdAt) || !Number.isFinite(currentTime) || createdAt > currentTime || currentTime - createdAt > MISSION_PACKET_MAX_AGE_MS) {
    throw new Error('blocked_mission_packet_stale_or_invalid');
  }
  return {
    run_id: runId,
    expected_repo_head: expectedHead,
    expected_active_next_action: expectedAction,
    expected_packet_id: expectedPacketId,
    automation_reference_private: missionPacketAutomationReference(packet),
  };
};

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

const fileExists = async (filePath) => {
  try { await access(filePath); return true; }
  catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const missionExecutionLockPath = ({ roots, approvalContractVersion }) => {
  if (approvalContractVersion !== MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) throw new Error('blocked_mutation_lock_contract_version_mismatch');
  return join(
    rootsWithDefaults(roots).privateMailerLiteRoot,
    'controlled-welcome-flow',
    'mission-attempt-locks',
    'mission-contract-2026-07-11-v1--active-trigger-correction-and-first-email-proof.json',
  );
};

const assertFreshOutputPaths = async (paths, deterministicExecutionLockPath = null) => {
  const candidates = [
    paths.privateResultJson,
    paths.privateResultMd,
    paths.redactedReceiptJson,
    paths.redactedReceiptMd,
    deterministicExecutionLockPath,
  ].filter(Boolean);
  for (const filePath of candidates) {
    if (await fileExists(filePath)) throw new Error('blocked_existing_output_or_attempt_state');
  }
  return true;
};

const claimMissionExecution = async ({ roots, runId, packetId, approvalContractVersion, executionClass }) => {
  const lockPath = missionExecutionLockPath({ roots, approvalContractVersion });
  await mkdir(dirname(lockPath), { recursive: true });
  let handle;
  try {
    handle = await open(lockPath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify({
      schema_version: 'crm-core-mailerlite-mission-execution-lock-v1',
      run_id: runId,
      packet_id: packetId,
      approval_contract_version: approvalContractVersion,
      mission_execution_class: executionClass,
      mutation_attempt_claimed: executionClass === 'single_add_only_assignment_attempt',
      verified_noop_claimed: executionClass === 'verified_noop',
      retry_allowed: false,
    }, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('blocked_mission_approval_already_consumed');
    throw error;
  } finally {
    await handle?.close();
  }
  return lockPath;
};

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value, mode = 0o644) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
};
const writeText = async (filePath, value, mode = 0o644) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, value, { encoding: 'utf8', mode });
};

const approvalTextFrom = async (options) => {
  const filePath = options.approvalPhraseFile ?? options.validateApprovalPhraseFile;
  if (!filePath) return null;
  try {
    const resolvedPath = resolve(filePath);
    const metadata = await stat(resolvedPath);
    if (!metadata.isFile() || (metadata.mode & 0o077) !== 0 || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())) {
      throw new Error('blocked_approval_file_permissions');
    }
    return await readFile(resolvedPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const assertExactApprovalPhrase = async (options) => {
  const validation = validateActiveTriggerCorrectionApprovalPhrase(await approvalTextFrom(options), options.approvalContractVersion);
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

const exactAutomationGetPath = (automationReference) => `/api/automations/${encodeURIComponent(String(automationReference))}`;

const assertAllowedExactAutomationRequest = ({ method = 'GET', path, expectedAutomationReference }) => {
  const expectedPath = exactAutomationGetPath(expectedAutomationReference);
  if (String(method).toUpperCase() !== 'GET' || String(path) !== expectedPath) throw new Error('blocked_non_exact_automation_read');
  return true;
};

const apiBaseRelativePathFor = (requestPath) => requestPath.replace(/^\/api\//, '/');
const requestUrl = (base, requestPath) => {
  assertApprovedMailerLiteOptions({ apiBase: base, service: DEFAULT_SERVICE, account: DEFAULT_ACCOUNT });
  const relativePath = apiBaseRelativePathFor(requestPath);
  const url = new URL(`${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`);
  if (url.origin !== 'https://connect.mailerlite.com' || !url.pathname.startsWith('/api/')) throw new Error('blocked_unapproved_mailerlite_request_url');
  return url;
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
        if (response.status === 404 && String(method).toUpperCase() === 'GET') {
          return {
            subscriber_lookup_status: 'not_found',
            status: 404,
          };
        }
        const error = new Error(classifyFailure(response.status, text));
        error.status = response.status;
        throw error;
      }
      if (!text) return { ok: true };
      try { return JSON.parse(text); }
      catch { return { ok: true, response_status_class: 'success_no_raw_body_recorded' }; }
    } catch (error) {
      if (error?.status || String(error?.message ?? '').startsWith('blocked_')) throw error;
      throw new Error(classifyFailure(0, error instanceof Error ? error.message : String(error)));
    } finally {
      clearTimeout(timeout);
    }
  },
});

const createMailerLiteExactAutomationClient = ({ options, key, expectedAutomationReference, fetchImpl = fetch, calls = [] }) => ({
  calls,
  request: async ({ method, path }) => {
    assertAllowedExactAutomationRequest({ method, path, expectedAutomationReference });
    calls.push({ method: String(method).toUpperCase(), path });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetchImpl(requestUrl(options.apiBase, path), {
        method: 'GET',
        headers: {
          Authorization: ['Bearer', key].join(' '),
          Accept: 'application/json',
          'User-Agent': 'CRM-Core-MailerLite-Exact-Automation-Proof/1.0',
        },
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(classifyFailure(response.status, text));
        error.status = response.status;
        throw error;
      }
      if (!text) throw new Error('mailerlite_exact_automation_empty_response');
      try { return JSON.parse(text); }
      catch { throw new Error('mailerlite_exact_automation_invalid_response'); }
    } catch (error) {
      if (error?.status || /^(mailerlite_exact_automation_|blocked_)/.test(String(error?.message ?? ''))) throw error;
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
  return { key: null };
};

const encodePathPart = (value) => encodeURIComponent(String(value));
const subscriberGetPath = (anchor) => `/api/subscribers/${encodePathPart(anchor)}?include=groups`;
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

const groupSnapshotFrom = (subscriberLike) => {
  const rawGroups = valueFrom(subscriberLike, ['groups', 'data.groups', 'subscriber.groups', 'data.subscriber.groups']);
  if (!Array.isArray(rawGroups)) return {
    observed: false,
    complete: false,
    entries_private: [],
    stable_keys_private: [],
  };
  const entries = [];
  let complete = true;
  for (const group of rawGroups) {
    const scalar = typeof group === 'string' || typeof group === 'number' ? cleanString(group) : null;
    const stableKey = scalar ?? cleanString(group?.id ?? group?.group_id ?? group?.reference);
    const aliases = [scalar, group?.id, group?.group_id, group?.reference, group?.name].map(cleanString).filter(Boolean);
    if (!stableKey || !aliases.length) {
      complete = false;
      continue;
    }
    entries.push({ stable_key_private: stableKey, aliases_private: [...new Set(aliases)] });
  }
  const normalizedKeys = entries.map((entry) => entry.stable_key_private.toLowerCase());
  if (new Set(normalizedKeys).size !== normalizedKeys.length) complete = false;
  return {
    observed: true,
    complete,
    entries_private: entries,
    stable_keys_private: entries.map((entry) => entry.stable_key_private),
  };
};

const snapshotHasReference = (snapshot, reference) => snapshot.entries_private
  .some((entry) => entry.aliases_private.some((alias) => sameReference(alias, reference)));

const subscriberFromResponse = (response) => valueFrom(response, ['subscriber', 'data', 'record', 'records.0']) ?? response?.subscriber ?? response?.data ?? response;

const classifySubscriberLookup = (response, activeReference, priorReference = null, expectedAnchor = null) => {
  if (!response || response.status === 404 || response.subscriber_lookup_status === 'not_found') {
    return { subscriber_lookup_status: 'not_found', subscriber_status_class: 'not_found', identity_anchor_match: 'unknown', active_trigger_membership: 'unknown', prior_non_active_group_present: 'unknown', group_snapshot_status: 'unknown' };
  }
  const records = arrayFrom(response.records ?? response.data?.records);
  if (response.subscriber_lookup_status === 'ambiguous' || records.length > 1) {
    return { subscriber_lookup_status: 'ambiguous', subscriber_status_class: 'unknown', identity_anchor_match: 'unknown', active_trigger_membership: 'unknown', prior_non_active_group_present: 'unknown', group_snapshot_status: 'unknown' };
  }
  const subscriber = subscriberFromResponse(response);
  const subscriberId = cleanString(valueFrom(subscriber, ['id', 'subscriber_id', 'subscriberId'])) ?? cleanString(response.subscriber_id);
  const subscriberEmail = cleanString(valueFrom(subscriber, ['email', 'email_address', 'address'])) ?? cleanString(response.email);
  const identityAliases = [subscriberId, subscriberEmail].filter(Boolean);
  const identityAnchorMatch = expectedAnchor
    ? (identityAliases.some((value) => sameReference(value, expectedAnchor)) ? 'matched' : (identityAliases.length ? 'mismatch' : 'unknown'))
    : 'not_checked';
  const status = cleanString(response.subscriber_status_class ?? valueFrom(subscriber, ['status', 'state']))?.toLowerCase() ?? null;
  const subscriberSnapshot = groupSnapshotFrom(subscriber);
  const responseSnapshot = groupSnapshotFrom(response);
  const snapshot = subscriberSnapshot.observed ? subscriberSnapshot : responseSnapshot;
  const activePresent = snapshotHasReference(snapshot, activeReference);
  const priorPresent = priorReference ? snapshotHasReference(snapshot, priorReference) : null;
  const membership = snapshot.complete ? (activePresent ? 'present' : 'absent') : 'unknown';
  let subscriberStatusClass = 'unknown';
  if (['active', 'subscribed'].includes(status ?? '')) subscriberStatusClass = 'active';
  else if (['unsubscribed', 'bounced', 'junk', 'spam_complaint', 'complained', 'inactive'].includes(status ?? '')) subscriberStatusClass = 'unsafe_or_suppressed';
  else if (response.subscriber_status_class) subscriberStatusClass = cleanString(response.subscriber_status_class);
  return {
    subscriber_lookup_status: subscriberId ? 'found' : 'unknown',
    subscriber_status_class: subscriberStatusClass,
    subscriber_id_private: subscriberId,
    subscriber_email_private: subscriberEmail,
    identity_anchor_match: identityAnchorMatch,
    active_trigger_membership: membership,
    prior_non_active_group_present: priorReference ? (priorPresent ? 'present' : 'absent') : 'not_applicable',
    group_count: snapshot.stable_keys_private.length,
    group_snapshot_status: snapshot.complete ? 'complete' : (snapshot.observed ? 'incomplete' : 'missing'),
    group_entries_private: snapshot.entries_private,
    group_keys_private: snapshot.stable_keys_private,
  };
};

const priorPreservationStatus = (before, after, priorReference) => {
  if (!priorReference) return 'not_applicable';
  if (before.prior_non_active_group_present === 'present' && after.prior_non_active_group_present === 'present') return 'present_preserved';
  if (before.prior_non_active_group_present === 'present' && after.prior_non_active_group_present !== 'present') return 'failed_removed_or_unverified';
  if (before.prior_non_active_group_present === 'absent') return 'absent_before_correction';
  return 'unknown';
};

const verifyIdentityContinuity = (before, after) => {
  if (before.identity_anchor_match !== 'matched' || after.identity_anchor_match !== 'matched') return 'failed_anchor_mismatch_or_unknown';
  if (!before.subscriber_id_private || !after.subscriber_id_private || !sameReference(before.subscriber_id_private, after.subscriber_id_private)) return 'failed_subscriber_changed_or_unknown';
  if (after.subscriber_status_class !== 'active') return 'failed_subscriber_not_active_after';
  return 'passed';
};

const verifyGroupTransition = ({ before, after, activeReference, mode }) => {
  if (before.group_snapshot_status !== 'complete' || after.group_snapshot_status !== 'complete') {
    return { status: 'failed_incomplete_group_snapshot', all_prior_groups_preserved: false, unrelated_group_additions: 'unknown' };
  }
  const beforeKeys = new Set(before.group_keys_private.map((value) => value.toLowerCase()));
  const afterKeys = new Set(after.group_keys_private.map((value) => value.toLowerCase()));
  const missing = [...beforeKeys].filter((value) => !afterKeys.has(value));
  const addedEntries = after.group_entries_private.filter((entry) => !beforeKeys.has(entry.stable_key_private.toLowerCase()));
  if (missing.length) return { status: 'failed_prior_group_removed', all_prior_groups_preserved: false, unrelated_group_additions: addedEntries.length };
  if (mode === 'noop') {
    if (addedEntries.length || beforeKeys.size !== afterKeys.size) return { status: 'failed_noop_group_drift', all_prior_groups_preserved: true, unrelated_group_additions: addedEntries.length };
    if (after.active_trigger_membership !== 'present') return { status: 'failed_active_trigger_missing_after_noop', all_prior_groups_preserved: true, unrelated_group_additions: 0 };
    return { status: 'passed_noop_exact_group_set', all_prior_groups_preserved: true, unrelated_group_additions: 0 };
  }
  const expectedAdds = addedEntries.filter((entry) => entry.aliases_private.some((alias) => sameReference(alias, activeReference)));
  if (addedEntries.length !== 1 || expectedAdds.length !== 1) {
    return { status: 'failed_unrelated_or_missing_group_addition', all_prior_groups_preserved: true, unrelated_group_additions: Math.max(0, addedEntries.length - expectedAdds.length) };
  }
  if (after.active_trigger_membership !== 'present') return { status: 'failed_active_trigger_missing_after_assignment', all_prior_groups_preserved: true, unrelated_group_additions: 0 };
  return { status: 'passed_exact_add_only_transition', all_prior_groups_preserved: true, unrelated_group_additions: 0 };
};

const automationFromResponse = (response) => (response?.data && typeof response.data === 'object' ? response.data : response);

const triggerGroupAliases = (trigger) => [
  ...arrayFrom(trigger?.group_ids),
  ...arrayFrom(trigger?.groups).flatMap((group) => [group?.id, group?.group_id, group?.reference]),
].map(cleanString).filter(Boolean);

const classifyExactAutomationMapping = (response, expectedAutomationReference, expectedGroupReference) => {
  const automation = automationFromResponse(response);
  const automationReference = cleanString(valueFrom(automation, ['id', 'automation_id', 'automationId']));
  const referenceMatch = automationReference && sameReference(automationReference, expectedAutomationReference) ? 'matched' : (automationReference ? 'mismatch' : 'unknown');
  const active = automation?.enabled === true && automation?.complete === true && automation?.broken === false;
  const triggers = arrayFrom(automation?.triggers);
  const matches = triggers.filter((trigger) => triggerGroupAliases(trigger).some((value) => sameReference(value, expectedGroupReference)));
  const target = matches[0];
  const excluded = arrayFrom(target?.exclude_group_ids).map(cleanString).filter(Boolean).some((value) => sameReference(value, expectedGroupReference));
  const triggerType = cleanString(target?.type)?.toLowerCase() ?? '';
  const typeIsJoin = /group/.test(triggerType) && /(join|add|subscrib)/.test(triggerType);
  const triggerStrictlyValid = matches.length === 1 && typeIsJoin && target?.complete === true && target?.broken === false && !excluded;
  const mappingPassed = referenceMatch === 'matched' && active && triggerStrictlyValid;
  return {
    ok: mappingPassed,
    automation_reference_match_status: referenceMatch,
    automation_active_status: active ? 'active_complete_not_broken' : 'not_strictly_active_or_unknown',
    automation_trigger_mapping_status: mappingPassed ? 'exact_active_trigger_mapping_verified' : 'not_verified_or_ambiguous',
    target_trigger_match_count: matches.length,
  };
};

const buildReceipt = ({
  runId,
  packetValidation,
  approvalContractVersion = 'not_run',
  executionBindingStatus = 'not_run',
  automationReferenceMatchStatus = 'not_run',
  automationActiveStatus = 'not_run',
  automationTriggerMappingStatus = 'not_run',
  automationMappingCheckedAt = null,
  correctionAttempted = false,
  correctionExecuted = false,
  mutationOutcomeStatus = 'not_attempted',
  correctionResultStatus,
  subscriberLookupStatus = 'not_run',
  subscriberStatusClass = 'not_run',
  identityVerificationStatus = 'not_run',
  activeTriggerMembershipBefore = 'not_run',
  activeTriggerMembershipAfter = 'not_run',
  priorNonActiveGroupPreservationStatus = 'not_run',
  allPriorGroupsPreservationStatus = 'not_run',
  groupTransitionStatus = 'not_run',
  mutationEndpointCallCount = 0,
  postCorrectionVerificationStatus = 'not_run',
  blockers = [],
  recommendedNextStep,
}) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  packet_id: packetValidation?.packet_id ?? 'unknown_packet',
  operation_class: CORRECTION_OPERATION_CLASS,
  approval_contract_version: approvalContractVersion,
  execution_binding_status: executionBindingStatus,
  automation_reference_match_status: automationReferenceMatchStatus,
  automation_active_status: automationActiveStatus,
  automation_trigger_mapping_status: automationTriggerMappingStatus,
  automation_mapping_checked_at: automationMappingCheckedAt,
  correction_attempted: correctionAttempted,
  correction_executed: correctionExecuted,
  mutation_outcome_status: mutationOutcomeStatus,
  correction_result_status: correctionResultStatus,
  subscriber_lookup_status: subscriberLookupStatus,
  subscriber_status_class: subscriberStatusClass,
  identity_verification_status: identityVerificationStatus,
  active_trigger_membership_before: activeTriggerMembershipBefore,
  active_trigger_membership_after: activeTriggerMembershipAfter,
  prior_non_active_group_preservation_status: priorNonActiveGroupPreservationStatus,
  all_prior_groups_preservation_status: allPriorGroupsPreservationStatus,
  group_transition_status: groupTransitionStatus,
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

const markdownReceipt = (receipt) => `# MailerLite Existing Subscriber Active Trigger Correction Receipt\n\n- run_id: ${receipt.run_id}\n- packet_id: ${receipt.packet_id}\n- operation_class: ${receipt.operation_class}\n- approval_contract_version: ${receipt.approval_contract_version}\n- execution_binding_status: ${receipt.execution_binding_status}\n- automation_reference_match_status: ${receipt.automation_reference_match_status}\n- automation_active_status: ${receipt.automation_active_status}\n- automation_trigger_mapping_status: ${receipt.automation_trigger_mapping_status}\n- automation_mapping_checked_at: ${receipt.automation_mapping_checked_at ?? 'not_run'}\n- correction_attempted: ${receipt.correction_attempted}\n- correction_executed: ${receipt.correction_executed}\n- mutation_outcome_status: ${receipt.mutation_outcome_status}\n- correction_result_status: ${receipt.correction_result_status}\n- subscriber_lookup_status: ${receipt.subscriber_lookup_status}\n- subscriber_status_class: ${receipt.subscriber_status_class}\n- identity_verification_status: ${receipt.identity_verification_status}\n- active_trigger_membership_before: ${receipt.active_trigger_membership_before}\n- active_trigger_membership_after: ${receipt.active_trigger_membership_after}\n- prior_non_active_group_preservation_status: ${receipt.prior_non_active_group_preservation_status}\n- all_prior_groups_preservation_status: ${receipt.all_prior_groups_preservation_status}\n- group_transition_status: ${receipt.group_transition_status}\n- mutation_endpoint_call_count: ${receipt.mutation_endpoint_call_count}\n- post_correction_verification_status: ${receipt.post_correction_verification_status}\n- blockers: ${receipt.blockers.length ? receipt.blockers.join(', ') : 'none'}\n- recommended_next_step: ${receipt.recommended_next_step}\n`;

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

const sensitiveValuesFor = (packetValidation, lookupBefore = {}, lookupAfter = {}, automationReference = null) => [
  packetValidation?.existing_subscriber_lookup_anchor,
  packetValidation?.active_live_trigger_group_reference,
  packetValidation?.prior_non_active_group_reference,
  automationReference,
  lookupBefore?.subscriber_id_private,
  lookupBefore?.subscriber_email_private,
  lookupAfter?.subscriber_id_private,
  lookupAfter?.subscriber_email_private,
  ...arrayFrom(lookupBefore?.group_keys_private),
  ...arrayFrom(lookupAfter?.group_keys_private),
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
  await writeJson(paths.privateResultJson, privateResult, 0o600);
  await writeText(paths.privateResultMd, privateMarkdown(privateResult), 0o600);
};

const SUCCESS_RESULT_STATUSES = new Set([
  'already_present_idempotent_noop_verified',
  'correction_executed_verified',
  'assignment_effect_verified_after_unknown_post_outcome',
  'preflight_only_ready_for_exact_active_trigger_correction_approval',
]);

const compactStdout = (receipt) => ({
  ok: SUCCESS_RESULT_STATUSES.has(receipt.correction_result_status),
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
  assertApprovedMailerLiteOptions(options);
  if (options.approvalPhraseFile) await assertExactApprovalPhrase(options);
  const packet = await readJson(paths.privateCorrectionPacketJson);
  const packetValidation = validateActiveTriggerCorrectionPacket(packet);
  if (!packetValidation.ok) throw new Error(packetValidation.reason);
  let runId = deps.runId ?? options.runId ?? 'crm_core_mailerlite_active_trigger_correction_preflight_only_2026-07-11';
  let executionBindingStatus = 'not_required_by_selected_legacy_contract';
  if (options.approvalContractVersion === MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) {
    const contextProvider = deps.executionContextProvider ?? defaultExecutionContextProvider;
    const executionContext = await contextProvider(rootsWithDefaults(deps.roots).repoRoot);
    const binding = assertMissionPacketBinding({ options, packet, packetValidation, executionContext, now: deps.now ?? new Date() });
    runId = binding.run_id;
    executionBindingStatus = 'passed_clean_head_active_action_packet_and_freshness_binding';
    await assertFreshOutputPaths(paths);
  }
  return buildReceipt({
    runId,
    packetValidation,
    approvalContractVersion: options.approvalContractVersion ?? 'not_supplied',
    executionBindingStatus,
    correctionResultStatus: 'preflight_only_ready_for_exact_active_trigger_correction_approval',
    recommendedNextStep: 'request_exact_active_trigger_correction_approval',
  });
};

const runLiveMode = async (options, deps = {}) => {
  if (!options.allowLiveExistingSubscriberActiveTriggerCorrection) throw new Error('not_run_missing_approval');
  const paths = validatePathPolicy(options, { roots: deps.roots });
  assertApprovedMailerLiteOptions(options);
  const approvalValidation = await assertExactApprovalPhrase(options);
  if (approvalValidation.contract_version !== MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) throw new Error('blocked_live_requires_current_mission_contract');
  const packet = await readJson(paths.privateCorrectionPacketJson);
  const packetValidation = validateActiveTriggerCorrectionPacket(packet);
  if (!packetValidation.ok) throw new Error('blocked_private_packet_contract_invalid');
  const isMissionContract = true;
  let runId = deps.runId ?? options.runId ?? 'crm_core_mailerlite_existing_subscriber_active_trigger_correction_2026-07-11';
  let executionBindingStatus = 'not_required_by_selected_legacy_contract';
  let automationReference = null;
  if (isMissionContract) {
    const contextProvider = deps.executionContextProvider ?? defaultExecutionContextProvider;
    const executionContext = await contextProvider(rootsWithDefaults(deps.roots).repoRoot);
    const binding = assertMissionPacketBinding({ options, packet, packetValidation, executionContext, now: deps.now ?? new Date() });
    runId = binding.run_id;
    executionBindingStatus = 'passed_clean_head_active_action_packet_and_freshness_binding';
    automationReference = binding.automation_reference_private;
  }
  const deterministicExecutionLockPath = missionExecutionLockPath({ roots: deps.roots, approvalContractVersion: approvalValidation.contract_version });
  await assertFreshOutputPaths(paths, deterministicExecutionLockPath);

  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) throw new Error('blocked_missing_mailerlite_credential');
  const baseClient = deps.correctionClient ?? createMailerLiteActiveTriggerCorrectionClient({ options, key: credential.key, fetchImpl: deps.fetchImpl ?? fetch, calls: deps.calls ?? [] });
  const limiter = mutationAttemptLimiter();
  const now = deps.now ?? new Date();
  let mapping = {
    automation_reference_match_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
    automation_active_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
    automation_trigger_mapping_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
  };
  let mappingCheckedAt = null;

  const receiptBase = () => ({
    runId,
    packetValidation,
    approvalContractVersion: approvalValidation.contract_version,
    executionBindingStatus,
    automationReferenceMatchStatus: mapping.automation_reference_match_status,
    automationActiveStatus: mapping.automation_active_status,
    automationTriggerMappingStatus: mapping.automation_trigger_mapping_status,
    automationMappingCheckedAt: mappingCheckedAt,
  });
  const finish = async (receipt, before = {}, after = {}) => {
    await writeOutputs({
      paths,
      receipt,
      privateResult: buildPrivateResult({ receipt, privateOutputMode: deps.correctionClient || deps.automationClient ? 'mocked_live_atomic_route' : 'live_atomic_route' }),
      sensitiveValues: sensitiveValuesFor(packetValidation, before, after, automationReference),
    });
    return receipt;
  };

  if (isMissionContract) {
    mappingCheckedAt = (now instanceof Date ? now : new Date(now)).toISOString();
    try {
      const automationClient = deps.automationClient ?? createMailerLiteExactAutomationClient({
        options,
        key: credential.key,
        expectedAutomationReference: automationReference,
        fetchImpl: deps.fetchImpl ?? fetch,
        calls: deps.automationCalls ?? [],
      });
      const mappingResponse = await automationClient.request({ method: 'GET', path: exactAutomationGetPath(automationReference) });
      mapping = classifyExactAutomationMapping(mappingResponse, automationReference, packetValidation.active_live_trigger_group_reference);
    } catch {
      mapping = {
        automation_reference_match_status: 'unknown',
        automation_active_status: 'unknown',
        automation_trigger_mapping_status: 'read_failed_not_verified',
      };
    }
    if (!mapping.ok) {
      return finish(buildReceipt({
        ...receiptBase(),
        correctionResultStatus: 'blocked_exact_automation_trigger_mapping_not_verified',
        blockers: ['exact_automation_trigger_mapping_not_verified'],
        recommendedNextStep: 'stop_before_subscriber_read_or_mutation',
      }));
    }
  }

  let beforeResponse;
  try {
    beforeResponse = await guardedRequest(baseClient, limiter, { method: 'GET', path: subscriberGetPath(packetValidation.existing_subscriber_lookup_anchor) });
  } catch {
    return finish(buildReceipt({
      ...receiptBase(),
      correctionResultStatus: 'blocked_subscriber_lookup_failed',
      mutationEndpointCallCount: limiter.count,
      blockers: ['subscriber_lookup_failed'],
      recommendedNextStep: 'stop_without_mutation',
    }));
  }
  const before = classifySubscriberLookup(
    beforeResponse,
    packetValidation.active_live_trigger_group_reference,
    packetValidation.prior_non_active_group_reference,
    packetValidation.existing_subscriber_lookup_anchor,
  );
  let receipt;
  let after = {};
  if (before.subscriber_lookup_status !== 'found') {
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_subscriber_not_found', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: ['subscriber_not_found_or_ambiguous'], recommendedNextStep: 'stop_without_mutation' });
  } else if (before.identity_anchor_match !== 'matched') {
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_subscriber_identity_mismatch_or_unknown', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: ['subscriber_identity_mismatch_or_unknown'], recommendedNextStep: 'stop_without_mutation' });
  } else if (before.subscriber_status_class !== 'active') {
    const status = before.subscriber_status_class === 'unsafe_or_suppressed' ? 'blocked_subscriber_status_unsafe_or_suppressed' : 'blocked_subscriber_status_not_active';
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: status, subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: [status], recommendedNextStep: 'stop_without_mutation' });
  } else if (before.active_trigger_membership === 'unknown') {
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_active_trigger_membership_unknown', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: before.active_trigger_membership, mutationEndpointCallCount: limiter.count, blockers: ['active_trigger_membership_or_full_group_snapshot_unknown'], recommendedNextStep: 'stop_without_mutation' });
  } else if (before.active_trigger_membership === 'present') {
    try {
      const afterResponse = await guardedRequest(baseClient, limiter, { method: 'GET', path: subscriberGetPath(packetValidation.existing_subscriber_lookup_anchor) });
      after = classifySubscriberLookup(afterResponse, packetValidation.active_live_trigger_group_reference, packetValidation.prior_non_active_group_reference, packetValidation.existing_subscriber_lookup_anchor);
      const identity = verifyIdentityContinuity(before, after);
      const transition = verifyGroupTransition({ before, after, activeReference: packetValidation.active_live_trigger_group_reference, mode: 'noop' });
      const preservation = priorPreservationStatus(before, after, packetValidation.prior_non_active_group_reference);
      if (identity === 'passed' && transition.status === 'passed_noop_exact_group_set') {
        await claimMissionExecution({ roots: deps.roots, runId, packetId: packetValidation.packet_id, approvalContractVersion: approvalValidation.contract_version, executionClass: 'verified_noop' });
        receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'already_present_idempotent_noop_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'present', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed_noop_immediate_reread', recommendedNextStep: 'continue_to_bounded_first_email_evidence' });
      } else {
        receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_noop_immediate_verification_failed', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'present', activeTriggerMembershipAfter: after.active_trigger_membership, priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: transition.all_prior_groups_preserved ? 'all_preserved' : 'failed_or_unknown', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed', blockers: ['noop_immediate_verification_failed'], recommendedNextStep: 'stop_without_mutation_or_retrigger' });
      }
    } catch {
      receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_noop_immediate_verification_failed', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: 'unknown_after_read_failure', activeTriggerMembershipBefore: 'present', mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed', blockers: ['noop_immediate_verification_read_failed'], recommendedNextStep: 'stop_without_mutation_or_retrigger' });
    }
  } else {
    await claimMissionExecution({ roots: deps.roots, runId, packetId: packetValidation.packet_id, approvalContractVersion: approvalValidation.contract_version, executionClass: 'single_add_only_assignment_attempt' });
    let postOutcome = 'unknown_no_retry';
    try {
      await guardedRequest(baseClient, limiter, { method: 'POST', path: assignmentPath(before.subscriber_id_private, packetValidation.active_live_trigger_group_reference), payload: null });
      postOutcome = 'acknowledged';
    } catch {
      postOutcome = 'unknown_no_retry';
    }
    try {
      const afterResponse = await guardedRequest(baseClient, limiter, { method: 'GET', path: subscriberGetPath(packetValidation.existing_subscriber_lookup_anchor) });
      after = classifySubscriberLookup(afterResponse, packetValidation.active_live_trigger_group_reference, packetValidation.prior_non_active_group_reference, packetValidation.existing_subscriber_lookup_anchor);
    } catch {
      after = { active_trigger_membership: 'unknown', identity_anchor_match: 'unknown', subscriber_status_class: 'unknown', group_snapshot_status: 'unknown', group_keys_private: [], group_entries_private: [] };
    }
    const identity = verifyIdentityContinuity(before, after);
    const transition = verifyGroupTransition({ before, after, activeReference: packetValidation.active_live_trigger_group_reference, mode: 'assignment' });
    const preservation = priorPreservationStatus(before, after, packetValidation.prior_non_active_group_reference);
    const verifiedEffect = identity === 'passed' && transition.status === 'passed_exact_add_only_transition';
    if (verifiedEffect && postOutcome === 'acknowledged') {
      receipt = buildReceipt({ ...receiptBase(), correctionAttempted: true, correctionExecuted: true, mutationOutcomeStatus: 'acknowledged_and_effect_verified', correctionResultStatus: 'correction_executed_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed', recommendedNextStep: 'continue_to_bounded_first_email_evidence' });
    } else if (verifiedEffect && postOutcome === 'unknown_no_retry') {
      receipt = buildReceipt({ ...receiptBase(), correctionAttempted: true, correctionExecuted: null, mutationOutcomeStatus: 'response_unknown_effect_verified_no_retry', correctionResultStatus: 'assignment_effect_verified_after_unknown_post_outcome', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed_effect_only', blockers: ['post_response_unknown_no_retry'], recommendedNextStep: 'continue_read_only_evidence_only_never_retry_assignment' });
    } else {
      const resultStatus = postOutcome === 'unknown_no_retry' ? 'blocked_assignment_outcome_unknown_no_retry' : 'blocked_post_correction_verification_failed_no_retry';
      receipt = buildReceipt({ ...receiptBase(), correctionAttempted: true, correctionExecuted: postOutcome === 'acknowledged' ? true : null, mutationOutcomeStatus: postOutcome, correctionResultStatus: resultStatus, subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: after.active_trigger_membership ?? 'unknown', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: transition.all_prior_groups_preserved ? 'all_preserved' : 'failed_or_unknown', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed_or_unknown', blockers: [resultStatus], recommendedNextStep: 'stop_no_retry_escalate_terminal_receipt' });
    }
  }
  return finish(receipt, before, after);
};

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }
  if (options.printApprovalTemplate) {
    const payload = approvalTemplatePayload(options.approvalContractVersion ?? ACTIVE_TRIGGER_CORRECTION_APPROVAL_CONTRACT_VERSION);
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
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  MISSION_CONTRACT_APPROVAL_PHRASE,
  ALLOWED_CORRECTION_REQUESTS,
  CORRECTION_OPERATION_CLASS,
  CORRECTION_PACKET_CONTRACT_VERSION,
  DEFAULT_API_BASE,
  GUARD_STATUS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  SCHEMA_VERSION,
  MISSION_ACTIVE_NEXT_ACTION,
  assertAllowedCorrectionRequest,
  assertAllowedExactAutomationRequest,
  assertApprovedMailerLiteOptions,
  assertMissionPacketBinding,
  classifyExactAutomationMapping,
  classifySubscriberLookup,
  createMailerLiteActiveTriggerCorrectionClient,
  createMailerLiteExactAutomationClient,
  exactAutomationGetPath,
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
  verifyGroupTransition,
  verifyIdentityContinuity,
  validateActiveTriggerCorrectionApprovalPhrase,
  validateActiveTriggerCorrectionPacket,
  validatePathPolicy,
};
