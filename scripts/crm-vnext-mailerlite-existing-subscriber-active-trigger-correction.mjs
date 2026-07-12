#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import { access, lstat, mkdir, open, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
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
const SCHEMA_VERSION = 'crm-vnext-mailerlite-existing-subscriber-active-trigger-correction-2026-07-11-v2';
const GUARD_STATUS = 'implemented_and_mock_tested';
const DEFAULT_API_BASE = ['https:', '', 'connect.mailerlite.com', 'api'].join('/');
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const MISSION_ACTIVE_NEXT_ACTION = 'crm_core_controlled_welcome_flow_active_trigger_correction_and_first_email_proof_awaiting_fresh_approval_v0';
const MISSION_PACKET_MAX_AGE_MS = 120 * 60 * 1000;
const CONTROLLED_INBOX_LOOKBACK_SECONDS = 90 * 24 * 60 * 60;
const MAILBOX_EVIDENCE_MAX_TOTAL_CHECKS = 8;
const PRE_EFFECT_LIVE_ATTEMPT_LIMIT = 3;
const MAILBOX_POST_POLL_DELAYS_MS = Object.freeze([0, 5_000, 10_000, 15_000, 30_000, 45_000, 60_000]);
const GOG_BIN = '/opt/homebrew/bin/gog';
const GOG_MAILBOX_SEARCH_TIMEOUT_MS = 30_000;
const FILE_BRIDGE_SCHEMA_VERSION = 'crm-core-controlled-mailbox-file-bridge-v1';
const FILE_BRIDGE_RESPONSE_TIMEOUT_MS = 90_000;
const FILE_BRIDGE_RESPONSE_KEYS = Object.freeze([
  'connector_operation',
  'has_more',
  'id_digests_private',
  'mission_binding_private',
  'profile_email_private',
  'query_binding_status',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'search_executed_at_epoch_seconds',
  'schema_version',
  'worker_consumption_status',
]);
const FILE_BRIDGE_READY_KEYS = Object.freeze([
  'publication_status',
  'response_digest_private',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'schema_version',
]);
const FILE_BRIDGE_CONSUMPTION_KEYS = Object.freeze([
  'claimed_at_epoch_seconds',
  'consumption_status',
  'mission_binding_private',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'retry_allowed',
  'schema_version',
]);
const FILE_BRIDGE_MISSION_BINDING_KEYS = Object.freeze([
  'approval_contract_version',
  'mailbox_check_ordinal',
  'packet_id',
  'run_id',
]);
const FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS = 30;
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
  --mailbox-evidence-provider <gog|file-bridge>
  --private-mailbox-bridge-dir <path>

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
    mailboxEvidenceProvider: 'gog',
    privateMailboxBridgeDir: null,
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
    else if (arg === '--mailbox-evidence-provider') options.mailboxEvidenceProvider = argv[++index];
    else if (arg === '--private-mailbox-bridge-dir') options.privateMailboxBridgeDir = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (/email|subscriber.?id|group.?id|raw|debug|token|header|credential|env/i.test(arg)) throw new Error('forbidden_cli_argument');
    else throw new Error('unknown_cli_argument');
  }
  options.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 30_000) throw new Error('blocked_timeout_out_of_bounds');
  if (!['gog', 'file-bridge'].includes(options.mailboxEvidenceProvider)) throw new Error('blocked_mailbox_evidence_provider_invalid');
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
  if (options.mailboxEvidenceProvider === 'file-bridge') {
    assertOutsideRoot(options.privateMailboxBridgeDir, resolvedRoots.repoRoot, 'private_mailbox_bridge_dir');
    assertUnderRoot(options.privateMailboxBridgeDir, resolvedRoots.privateMailerLiteRoot, 'private_mailbox_bridge_dir');
  } else if (options.privateMailboxBridgeDir) {
    throw new Error('blocked_mailbox_bridge_dir_without_provider');
  }
  return {
    privateCorrectionPacketJson: resolve(options.privateCorrectionPacketJson),
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
    privateMailboxBridgeDir: options.privateMailboxBridgeDir ? resolve(options.privateMailboxBridgeDir) : null,
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

const missionBudgetStatePath = ({ roots, approvalContractVersion }) => {
  if (approvalContractVersion !== MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) throw new Error('blocked_mission_budget_contract_version_mismatch');
  return join(
    rootsWithDefaults(roots).privateMailerLiteRoot,
    'controlled-welcome-flow',
    'mission-attempt-locks',
    'mission-contract-2026-07-11-v1--budget-state.json',
  );
};

const validBudgetCount = (value) => Number.isInteger(value) && value >= 0;

const updateMissionBudgetState = async ({ roots, approvalContractVersion, updater }) => {
  const statePath = missionBudgetStatePath({ roots, approvalContractVersion });
  const mutexPath = `${statePath}.mutex`;
  const tempPath = `${statePath}.tmp-${process.pid}`;
  await mkdir(dirname(statePath), { recursive: true });
  let mutex;
  try {
    mutex = await open(mutexPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('blocked_mission_budget_state_locked');
    throw error;
  }
  try {
    let current = {
      schema_version: 'crm-core-mailerlite-mission-budget-state-v1',
      approval_contract_version: approvalContractVersion,
      pre_effect_live_attempt_count: 0,
      mailbox_evidence_check_count: 0,
    };
    try {
      const metadata = await stat(statePath);
      if (!metadata.isFile() || (metadata.mode & 0o077) !== 0 || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())) {
        throw new Error('blocked_mission_budget_state_permissions');
      }
      const parsed = JSON.parse(await readFile(statePath, 'utf8'));
      if (
        parsed?.schema_version !== current.schema_version
        || parsed?.approval_contract_version !== approvalContractVersion
        || !validBudgetCount(parsed?.pre_effect_live_attempt_count)
        || !validBudgetCount(parsed?.mailbox_evidence_check_count)
      ) throw new Error('blocked_mission_budget_state_invalid');
      current = parsed;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const next = updater({ ...current });
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(tempPath, statePath);
    return next;
  } finally {
    await mutex?.close();
    await unlink(mutexPath).catch(() => {});
    await unlink(tempPath).catch(() => {});
  }
};

const claimPreEffectLiveAttemptBudget = ({ roots, approvalContractVersion, runId, packetId }) => updateMissionBudgetState({
  roots,
  approvalContractVersion,
  updater: (state) => {
    if (state.pre_effect_live_attempt_count >= PRE_EFFECT_LIVE_ATTEMPT_LIMIT) throw new Error('blocked_pre_effect_live_attempt_budget_exhausted');
    return {
      ...state,
      pre_effect_live_attempt_count: state.pre_effect_live_attempt_count + 1,
      last_run_id: runId,
      last_packet_id: packetId,
    };
  },
});

const claimMailboxEvidenceCheckBudget = ({ roots, approvalContractVersion, runId, packetId }) => updateMissionBudgetState({
  roots,
  approvalContractVersion,
  updater: (state) => {
    if (state.mailbox_evidence_check_count >= MAILBOX_EVIDENCE_MAX_TOTAL_CHECKS) throw new Error('blocked_mailbox_evidence_check_budget_exhausted');
    return {
      ...state,
      mailbox_evidence_check_count: state.mailbox_evidence_check_count + 1,
      last_run_id: runId,
      last_packet_id: packetId,
    };
  },
});

const assertFreshOutputPaths = async (paths, deterministicExecutionLockPath = null) => {
  const candidates = [
    paths.privateResultJson,
    paths.privateResultMd,
    paths.redactedReceiptJson,
    paths.redactedReceiptMd,
    paths.privateMailboxBridgeDir,
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
      terminal_or_mutation_effect_scope_claimed: true,
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

const exactEmailAddress = (value) => {
  const text = cleanString(value);
  if (!text) return null;
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) ?? [];
  return matches.length === 1 ? matches[0].toLowerCase() : null;
};

const gmailAuthenticatedAccountForAnchor = (mailboxAnchor) => {
  const exact = exactEmailAddress(mailboxAnchor);
  if (!exact || exact !== cleanString(mailboxAnchor)?.toLowerCase()) return null;
  const at = exact.lastIndexOf('@');
  const local = exact.slice(0, at);
  const domain = exact.slice(at + 1);
  if (domain !== 'gmail.com') return exact;
  const plus = local.indexOf('+');
  if (plus < 0) return exact;
  if (plus === 0 || plus === local.length - 1 || plus !== local.lastIndexOf('+')) return null;
  return `${local.slice(0, plus)}@${domain}`;
};

const controlledMailboxProfileMatchesAnchor = (profileEmail, mailboxAnchor) => {
  const profile = exactEmailAddress(profileEmail);
  const expectedAuthenticatedAccount = gmailAuthenticatedAccountForAnchor(mailboxAnchor);
  return Boolean(
    profile
    && expectedAuthenticatedAccount
    && profile === cleanString(profileEmail)?.toLowerCase()
    && profile === expectedAuthenticatedAccount
  );
};

const firstEmailLocatorFromAutomation = (response) => {
  const automation = automationFromResponse(response);
  const steps = arrayFrom(automation?.steps);
  if (!steps.length) return { ok: false, status: 'missing_automation_steps' };
  const idOf = (step) => cleanString(step?.id ?? step?.step_id);
  const parentOf = (step) => cleanString(step?.parent_id ?? step?.parentId);
  const byId = new Map(steps.map((step) => [idOf(step), step]).filter(([id]) => Boolean(id)));
  if (byId.size !== steps.length) return { ok: false, status: 'incomplete_or_duplicate_step_identity' };
  const roots = steps.filter((step) => !parentOf(step) || !byId.has(parentOf(step)));
  if (roots.length !== 1) return { ok: false, status: 'ambiguous_first_step' };
  const childrenByParent = new Map();
  for (const step of steps) {
    const parent = parentOf(step);
    if (!parent) continue;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(idOf(step));
  }
  let cursor = roots[0];
  const visited = new Set();
  while (cursor) {
    const cursorId = idOf(cursor);
    if (!cursorId || visited.has(cursorId)) return { ok: false, status: 'ambiguous_or_cyclic_first_email_path' };
    visited.add(cursorId);
    const type = cleanString(cursor?.type)?.toLowerCase();
    if (type === 'email') {
      if (cursor?.complete !== true || cursor?.broken !== false) return { ok: false, status: 'first_email_step_incomplete_or_broken' };
      const subject = cleanString(cursor?.subject ?? cursor?.email?.subject);
      const sender = exactEmailAddress(cursor?.from)
        ?? exactEmailAddress(cursor?.from?.email)
        ?? exactEmailAddress(cursor?.from?.address)
        ?? exactEmailAddress(cursor?.email?.from)
        ?? exactEmailAddress(cursor?.email?.from?.email)
        ?? exactEmailAddress(cursor?.email?.from?.address)
        ?? exactEmailAddress(cursor?.from_email)
        ?? exactEmailAddress(cursor?.email?.from_email);
      if (!subject || !sender) return { ok: false, status: 'first_email_locator_incomplete' };
      return {
        ok: true,
        status: 'exact_first_email_locator_verified',
        subject_private: subject,
        sender_private: sender,
      };
    }
    const nextIds = [...new Set([
      cleanString(cursor?.yes_step_id),
      cleanString(cursor?.no_step_id),
      ...arrayFrom(childrenByParent.get(cursorId)),
    ].filter(Boolean))];
    if (nextIds.length !== 1) return { ok: false, status: 'ambiguous_first_email_path' };
    cursor = byId.get(nextIds[0]);
  }
  return { ok: false, status: 'first_email_not_found' };
};

const gmailQueryQuote = (value) => `"${String(value).replace(/[\r\n]+/g, ' ').replace(/([\\"])/g, '\\$1')}"`;

const controlledInboxQuery = ({ mailboxAnchor, locator, afterEpochSeconds, beforeEpochSeconds }) => [
  'in:inbox',
  `to:${gmailQueryQuote(mailboxAnchor)}`,
  `from:${gmailQueryQuote(locator.sender_private)}`,
  `subject:${gmailQueryQuote(locator.subject_private)}`,
  `after:${Math.floor(afterEpochSeconds)}`,
  `before:${Math.floor(beforeEpochSeconds)}`,
  '-in:trash',
  '-in:spam',
  '-in:sent',
  '-in:drafts',
].join(' ');

const parseGogMessageIdResult = (raw) => {
  let payload;
  try { payload = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return { ok: false, ids_private: [], has_more: false }; }
  const collections = [
    Array.isArray(payload) ? payload : null,
    payload?.messages,
    payload?.emails,
    payload?.results,
    payload?.data?.messages,
    payload?.data?.results,
  ];
  const collection = collections.find(Array.isArray);
  if (!collection) return { ok: false, ids_private: [], has_more: false };
  const ids = [...new Set(collection.map((item) => cleanString(typeof item === 'string' ? item : item?.id)).filter(Boolean))];
  const hasMore = Boolean(payload?.nextPageToken ?? payload?.next_page_token ?? payload?.data?.nextPageToken ?? payload?.data?.next_page_token);
  if (ids.length !== collection.length) return { ok: false, ids_private: [], has_more: hasMore };
  return { ok: true, ids_private: ids, has_more: hasMore };
};

const searchControlledInboxIds = async ({ mailboxAnchor, locator, afterEpochSeconds, beforeEpochSeconds, execFileImpl = execFileAsync, nowMs = () => Date.now() }) => {
  const exactMailboxAnchor = exactEmailAddress(mailboxAnchor);
  const account = gmailAuthenticatedAccountForAnchor(mailboxAnchor);
  if (!exactMailboxAnchor || !account) throw new Error('blocked_controlled_mailbox_binding_invalid');
  if (!locator?.ok || !locator.sender_private || !locator.subject_private) throw new Error('blocked_first_email_locator_not_verified');
  const searchStartedAtEpochSeconds = Math.floor(nowMs() / 1000);
  const query = controlledInboxQuery({
    mailboxAnchor: exactMailboxAnchor,
    locator,
    afterEpochSeconds,
    beforeEpochSeconds: Math.max(
      beforeEpochSeconds,
      searchStartedAtEpochSeconds + Math.ceil(GOG_MAILBOX_SEARCH_TIMEOUT_MS / 1000) + 2,
    ),
  });
  try {
    const { stdout } = await execFileImpl(GOG_BIN, [
      'gmail', 'messages', 'search', query,
      '--json',
      '--no-input',
      '--max=2',
      '--select=id',
      '--account', account,
    ], { timeout: GOG_MAILBOX_SEARCH_TIMEOUT_MS, maxBuffer: 1024 * 1024 });
    const parsed = parseGogMessageIdResult(stdout);
    if (!parsed.ok) throw new Error('blocked_controlled_mailbox_response_invalid');
    return { ...parsed, source_checked_at_epoch_seconds: searchStartedAtEpochSeconds };
  } catch (error) {
    if (String(error?.message ?? '').startsWith('blocked_')) throw error;
    throw new Error('blocked_controlled_mailbox_search_failed');
  }
};

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
};

const fileBridgeRequestDigest = (requestWithoutDigest) => createHash('sha256')
  .update(JSON.stringify(requestWithoutDigest))
  .digest('hex');

const fileBridgeResponseDigest = (responseBytes) => createHash('sha256')
  .update(responseBytes)
  .digest('hex');

const validFileBridgeMissionBinding = (binding) => (
  exactObjectKeys(binding, FILE_BRIDGE_MISSION_BINDING_KEYS)
  && cleanString(binding.approval_contract_version) === MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION
  && Boolean(cleanString(binding.run_id))
  && Boolean(cleanString(binding.packet_id))
  && Number.isInteger(binding.mailbox_check_ordinal)
  && binding.mailbox_check_ordinal >= 1
  && binding.mailbox_check_ordinal <= MAILBOX_EVIDENCE_MAX_TOTAL_CHECKS
);

const sameFileBridgeMissionBinding = (left, right) => (
  validFileBridgeMissionBinding(left)
  && validFileBridgeMissionBinding(right)
  && left.approval_contract_version === right.approval_contract_version
  && left.run_id === right.run_id
  && left.packet_id === right.packet_id
  && left.mailbox_check_ordinal === right.mailbox_check_ordinal
);

const assertPrivateBridgeDirectory = async ({ bridgeDir, privateRoot, expectedIdentity = null }) => {
  const metadataBefore = await lstat(bridgeDir);
  const resolvedBridgeDir = await realpath(bridgeDir);
  const resolvedPrivateRoot = await realpath(privateRoot);
  const metadata = await lstat(bridgeDir);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || (metadata.mode & 0o777) !== 0o700
    || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    || !isInside(resolvedBridgeDir, resolvedPrivateRoot)
    || resolve(resolvedBridgeDir) === resolve(resolvedPrivateRoot)
    || metadataBefore.dev !== metadata.dev
    || metadataBefore.ino !== metadata.ino
    || (expectedIdentity && (metadata.dev !== expectedIdentity.dev || metadata.ino !== expectedIdentity.ino))
  ) throw new Error('blocked_mailbox_bridge_directory_permissions_or_scope');
  return metadata;
};

const assertPrivateBridgeFile = async (filePath) => {
  const metadata = await lstat(filePath);
  if (
    !metadata.isFile()
    || metadata.isSymbolicLink()
    || (metadata.mode & 0o777) !== 0o600
    || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
  ) throw new Error('blocked_mailbox_bridge_response_permissions');
  return metadata;
};

const readPrivateBridgeFileNoFollow = async (filePath) => {
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || (before.mode & 0o777) !== 0o600
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) throw new Error('blocked_mailbox_bridge_response_permissions');
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || after.size !== bytes.length
    ) throw new Error('blocked_mailbox_bridge_response_changed_during_read');
    return { metadata: after, bytes };
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error('blocked_mailbox_bridge_response_permissions');
    throw error;
  } finally {
    await handle?.close();
  }
};

const validateFileBridgeReady = ({ ready, request }) => {
  if (!exactObjectKeys(ready, FILE_BRIDGE_READY_KEYS)) throw new Error('blocked_mailbox_bridge_ready_invalid');
  if (ready.schema_version !== FILE_BRIDGE_SCHEMA_VERSION) throw new Error('blocked_mailbox_bridge_ready_version_mismatch');
  if (ready.request_id !== request.request_id) throw new Error('blocked_mailbox_bridge_ready_request_mismatch');
  if (ready.request_nonce_private !== request.request_nonce_private) throw new Error('blocked_mailbox_bridge_ready_nonce_mismatch');
  if (ready.request_digest_private !== request.request_digest_private) throw new Error('blocked_mailbox_bridge_ready_digest_mismatch');
  if (!/^[a-f0-9]{64}$/i.test(cleanString(ready.response_digest_private))) throw new Error('blocked_mailbox_bridge_ready_response_digest_invalid');
  if (ready.publication_status !== 'atomic_response_ready') throw new Error('blocked_mailbox_bridge_ready_status_mismatch');
  return true;
};

const validateFileBridgeConsumption = ({ consumption, request }) => {
  if (!exactObjectKeys(consumption, FILE_BRIDGE_CONSUMPTION_KEYS)) throw new Error('blocked_mailbox_bridge_consumption_invalid');
  if (consumption.schema_version !== FILE_BRIDGE_SCHEMA_VERSION) throw new Error('blocked_mailbox_bridge_consumption_version_mismatch');
  if (consumption.request_id !== request.request_id) throw new Error('blocked_mailbox_bridge_consumption_request_mismatch');
  if (consumption.request_nonce_private !== request.request_nonce_private) throw new Error('blocked_mailbox_bridge_consumption_nonce_mismatch');
  if (consumption.request_digest_private !== request.request_digest_private) throw new Error('blocked_mailbox_bridge_consumption_digest_mismatch');
  if (!sameFileBridgeMissionBinding(consumption.mission_binding_private, request.mission_binding_private)) throw new Error('blocked_mailbox_bridge_consumption_mission_binding_mismatch');
  if (consumption.consumption_status !== 'claimed_before_connector_call' || consumption.retry_allowed !== false) throw new Error('blocked_mailbox_bridge_consumption_policy_mismatch');
  if (
    !Number.isInteger(consumption.claimed_at_epoch_seconds)
    || consumption.claimed_at_epoch_seconds < request.requested_at_epoch_seconds - 1
  ) throw new Error('blocked_mailbox_bridge_consumption_time_invalid');
  return true;
};

const validateFileBridgeResponse = ({ response, request, acceptedAtEpochSeconds }) => {
  if (!response || typeof response !== 'object') throw new Error('blocked_mailbox_bridge_response_invalid');
  if (!exactObjectKeys(response, FILE_BRIDGE_RESPONSE_KEYS)) throw new Error('blocked_mailbox_bridge_response_fields_invalid');
  if (response.schema_version !== FILE_BRIDGE_SCHEMA_VERSION) throw new Error('blocked_mailbox_bridge_response_version_mismatch');
  if (response.request_id !== request.request_id) throw new Error('blocked_mailbox_bridge_request_mismatch');
  if (response.request_nonce_private !== request.request_nonce_private) throw new Error('blocked_mailbox_bridge_nonce_mismatch');
  if (response.request_digest_private !== request.request_digest_private) throw new Error('blocked_mailbox_bridge_digest_mismatch');
  if (!sameFileBridgeMissionBinding(response.mission_binding_private, request.mission_binding_private)) throw new Error('blocked_mailbox_bridge_mission_binding_mismatch');
  if (response.connector_operation !== 'gmail_search_email_ids') throw new Error('blocked_mailbox_bridge_operation_mismatch');
  if (response.query_binding_status !== 'matched') throw new Error('blocked_mailbox_bridge_query_binding_mismatch');
  if (!controlledMailboxProfileMatchesAnchor(response.profile_email_private, request.mailbox_anchor_private)) throw new Error('blocked_mailbox_bridge_profile_mismatch');
  if (response.has_more !== false) throw new Error('blocked_mailbox_bridge_pagination_or_ambiguity');
  if (response.worker_consumption_status !== 'consumed_once') throw new Error('blocked_mailbox_bridge_worker_consumption_invalid');
  if (
    !Number.isInteger(response.search_executed_at_epoch_seconds)
    || response.search_executed_at_epoch_seconds < request.requested_at_epoch_seconds - 1
    || response.search_executed_at_epoch_seconds > acceptedAtEpochSeconds + 1
    || acceptedAtEpochSeconds - response.search_executed_at_epoch_seconds > FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS
  ) throw new Error('blocked_mailbox_bridge_search_execution_stale_or_invalid');
  if (
    !Array.isArray(response.id_digests_private)
    || response.id_digests_private.some((value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value))
  ) {
    throw new Error('blocked_mailbox_bridge_id_digests_invalid');
  }
  const ids = response.id_digests_private.map((value) => value.toLowerCase());
  if (ids.length > 2 || new Set(ids).size !== ids.length) throw new Error('blocked_mailbox_bridge_id_digests_invalid');
  return {
    ok: true,
    ids_private: ids,
    has_more: false,
    source_checked_at_epoch_seconds: response.search_executed_at_epoch_seconds,
  };
};

const createFileBridgeMailboxEvidenceProvider = ({
  bridgeDir,
  privateRoot,
  sleep = waitFor,
  nowMs = () => Date.now(),
  nonceProvider = () => randomBytes(32).toString('hex'),
}) => {
  if (!bridgeDir) throw new Error('blocked_mailbox_bridge_dir_missing');
  if (!privateRoot) throw new Error('blocked_mailbox_bridge_private_root_missing');
  let requestCounter = 0;
  let bridgeInitialized = false;
  let canonicalBridgeDir = null;
  let bridgeIdentity = null;
  const usedNonces = new Set();
  return {
    search: async ({ phase, mailboxAnchor, locator, afterEpochSeconds, beforeEpochSeconds, budgetClaim }) => {
      if (!bridgeInitialized) {
        const requestedBridgeDir = resolve(bridgeDir);
        const requestedParent = dirname(requestedBridgeDir);
        const targetName = basename(requestedBridgeDir);
        const [resolvedPrivateRoot, resolvedParent, privateRootMetadata, parentMetadata] = await Promise.all([
          realpath(privateRoot),
          realpath(requestedParent),
          lstat(privateRoot),
          lstat(requestedParent),
        ]);
        if (
          resolve(privateRoot) !== resolvedPrivateRoot
          || resolve(requestedParent) !== resolvedParent
          || !privateRootMetadata.isDirectory()
          || privateRootMetadata.isSymbolicLink()
          || !parentMetadata.isDirectory()
          || parentMetadata.isSymbolicLink()
          || (parentMetadata.mode & 0o022) !== 0
          || (typeof process.getuid === 'function' && (privateRootMetadata.uid !== process.getuid() || parentMetadata.uid !== process.getuid()))
          || !isInside(resolvedParent, resolvedPrivateRoot)
          || !targetName
          || targetName === '.'
          || targetName === '..'
        ) throw new Error('blocked_mailbox_bridge_parent_scope_or_permissions');
        canonicalBridgeDir = join(resolvedParent, targetName);
        try {
          await mkdir(canonicalBridgeDir, { mode: 0o700 });
        } catch (error) {
          if (error?.code === 'EEXIST') throw new Error('blocked_mailbox_bridge_directory_preexisting');
          throw error;
        }
        bridgeInitialized = true;
        const createdMetadata = await assertPrivateBridgeDirectory({ bridgeDir: canonicalBridgeDir, privateRoot });
        bridgeIdentity = { dev: createdMetadata.dev, ino: createdMetadata.ino };
      }
      await assertPrivateBridgeDirectory({ bridgeDir: canonicalBridgeDir, privateRoot, expectedIdentity: bridgeIdentity });
      if (!validFileBridgeMissionBinding(budgetClaim)) throw new Error('blocked_mailbox_bridge_budget_binding_invalid');
      requestCounter += 1;
      const requestId = `${String(requestCounter).padStart(2, '0')}-${phase}`;
      const requestPath = join(canonicalBridgeDir, `${requestId}.request.json`);
      const responsePath = join(canonicalBridgeDir, `${requestId}.response.json`);
      const readyPath = join(canonicalBridgeDir, `${requestId}.ready.json`);
      const consumptionPath = join(canonicalBridgeDir, `${requestId}.consumed.json`);
      const requestNonce = cleanString(nonceProvider());
      if (!/^[a-f0-9]{64}$/i.test(requestNonce) || usedNonces.has(requestNonce)) throw new Error('blocked_mailbox_bridge_nonce_invalid_or_reused');
      usedNonces.add(requestNonce);
      const requestedAtEpochSeconds = Math.floor(nowMs() / 1000);
      const bridgeSafeBeforeEpochSeconds = requestedAtEpochSeconds + Math.ceil(FILE_BRIDGE_RESPONSE_TIMEOUT_MS / 1000) + 2;
      const requestWithoutDigest = {
        schema_version: FILE_BRIDGE_SCHEMA_VERSION,
        request_id: requestId,
        request_nonce_private: requestNonce,
        requested_at_epoch_seconds: requestedAtEpochSeconds,
        mission_binding_private: { ...budgetClaim },
        worker_contract: 'one_shot_request_id_no_reprocessing',
        digest_contract: {
          request_digest: 'sha256_lowercase_hex_of_utf8_json_stringify_request_without_request_digest_private',
          response_digest: 'sha256_lowercase_hex_of_exact_response_file_bytes',
          message_id_digest: 'sha256_lowercase_hex_of_utf8_raw_gmail_message_id',
        },
        connector_operation: 'gmail_search_email_ids',
        phase,
        label_ids: ['INBOX'],
        max_results: 2,
        mailbox_anchor_private: mailboxAnchor,
        locator_private: {
          sender: locator?.sender_private,
          subject: locator?.subject_private,
        },
        query_private: controlledInboxQuery({
          mailboxAnchor,
          locator,
          afterEpochSeconds,
          beforeEpochSeconds: Math.max(beforeEpochSeconds, bridgeSafeBeforeEpochSeconds),
        }),
      };
      const request = {
        ...requestWithoutDigest,
        request_digest_private: fileBridgeRequestDigest(requestWithoutDigest),
      };
      const tempRequestPath = `${requestPath}.tmp-${process.pid}`;
      try {
        await writeFile(tempRequestPath, `${JSON.stringify(request, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        await rename(tempRequestPath, requestPath);
      } finally {
        await unlink(tempRequestPath).catch(() => {});
      }
      await assertPrivateBridgeDirectory({ bridgeDir: canonicalBridgeDir, privateRoot, expectedIdentity: bridgeIdentity });
      const requestMetadata = await assertPrivateBridgeFile(requestPath);
      const deadline = nowMs() + FILE_BRIDGE_RESPONSE_TIMEOUT_MS;
      while (nowMs() <= deadline) {
        try {
          await assertPrivateBridgeDirectory({ bridgeDir: canonicalBridgeDir, privateRoot, expectedIdentity: bridgeIdentity });
          const consumptionFile = await readPrivateBridgeFileNoFollow(consumptionPath);
          const readyFile = await readPrivateBridgeFileNoFollow(readyPath);
          const responseFile = await readPrivateBridgeFileNoFollow(responsePath);
          const consumptionMetadata = consumptionFile.metadata;
          const readyMetadata = readyFile.metadata;
          const responseMetadata = responseFile.metadata;
          if (
            responseMetadata.mtimeMs <= requestMetadata.mtimeMs
            || consumptionMetadata.mtimeMs <= requestMetadata.mtimeMs
            || consumptionMetadata.mtimeMs > responseMetadata.mtimeMs
            || readyMetadata.mtimeMs < responseMetadata.mtimeMs
            || readyMetadata.mtimeMs <= requestMetadata.mtimeMs
          ) throw new Error('blocked_mailbox_bridge_response_stale_or_non_atomic');
          const consumption = JSON.parse(consumptionFile.bytes.toString('utf8'));
          validateFileBridgeConsumption({ consumption, request });
          const ready = JSON.parse(readyFile.bytes.toString('utf8'));
          validateFileBridgeReady({ ready, request });
          if (ready.response_digest_private !== fileBridgeResponseDigest(responseFile.bytes)) throw new Error('blocked_mailbox_bridge_response_digest_mismatch');
          const response = JSON.parse(responseFile.bytes.toString('utf8'));
          if (consumption.claimed_at_epoch_seconds > response.search_executed_at_epoch_seconds) throw new Error('blocked_mailbox_bridge_consumption_after_search');
          const validated = validateFileBridgeResponse({ response, request, acceptedAtEpochSeconds: Math.floor(nowMs() / 1000) });
          await assertPrivateBridgeDirectory({ bridgeDir: canonicalBridgeDir, privateRoot, expectedIdentity: bridgeIdentity });
          return validated;
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
          await sleep(250);
        }
      }
      throw new Error('blocked_mailbox_bridge_response_timeout');
    },
  };
};

const validateMailboxSearchResult = (result) => {
  const ids = arrayFrom(result?.ids_private).map(cleanString).filter(Boolean);
  if (result?.ok !== true || result?.has_more === true || ids.length > 1 || new Set(ids).size !== ids.length) {
    return { ok: false, status: 'ambiguous_or_invalid', ids_private: [] };
  }
  return {
    ok: true,
    status: 'bounded_exact_id_search',
    ids_private: ids,
    source_checked_at_epoch_seconds: Number.isInteger(result?.source_checked_at_epoch_seconds)
      ? result.source_checked_at_epoch_seconds
      : null,
  };
};

const waitFor = (delayMs) => new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));

const pollFirstEmailEvidence = async ({ mailboxEvidenceProvider, mailboxAnchor, locator, baselineIds, baselineAt, nowProvider, claimEvidenceCheck, sleep = waitFor }) => {
  const baselineSet = new Set(baselineIds);
  let checkCount = 0;
  const privateIdsSeen = [];
  for (const delayMs of MAILBOX_POST_POLL_DELAYS_MS.slice(0, MAILBOX_EVIDENCE_MAX_TOTAL_CHECKS - 1)) {
    if (delayMs) await sleep(delayMs);
    let budgetClaim;
    try { budgetClaim = await claimEvidenceCheck(); }
    catch { return { status: 'not_verified_evidence_budget_exhausted_no_resend', check_count: checkCount, new_match_count: 0, private_ids_seen: privateIdsSeen }; }
    checkCount += 1;
    let result;
    try {
      const now = nowProvider();
      result = validateMailboxSearchResult(await mailboxEvidenceProvider.search({
        phase: 'post_action',
        mailboxAnchor,
        locator,
        afterEpochSeconds: Math.floor(baselineAt.getTime() / 1000) - CONTROLLED_INBOX_LOOKBACK_SECONDS,
        beforeEpochSeconds: Math.floor(now.getTime() / 1000) + 60,
        budgetClaim,
      }));
    } catch {
      return { status: 'not_verified_mailbox_search_failed_no_resend', check_count: checkCount, new_match_count: 0, private_ids_seen: privateIdsSeen };
    }
    if (!result.ok) return { status: 'not_verified_mailbox_result_ambiguous_no_resend', check_count: checkCount, new_match_count: 0, private_ids_seen: privateIdsSeen };
    privateIdsSeen.push(...result.ids_private);
    const newIds = result.ids_private.filter((id) => !baselineSet.has(id));
    if (newIds.length === 1) return { status: 'inbox_received_unique_bounded_locator_match', check_count: checkCount, new_match_count: 1, private_ids_seen: privateIdsSeen };
    if (newIds.length > 1) return { status: 'not_verified_multiple_new_matches_no_resend', check_count: checkCount, new_match_count: newIds.length, private_ids_seen: privateIdsSeen };
  }
  return { status: 'not_verified_after_bounded_checks_no_resend', check_count: checkCount, new_match_count: 0, private_ids_seen: privateIdsSeen };
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
  firstEmailLocatorStatus = 'not_run',
  mailboxBindingStatus = 'not_run',
  preEffectLiveAttemptCount = 0,
  mailboxBaselineCount = 0,
  mailboxEvidenceCheckCount = 0,
  firstEmailNewMatchCount = 0,
  firstEmailEvidenceStatus = 'not_run',
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
  first_email_locator_status: firstEmailLocatorStatus,
  mailbox_binding_status: mailboxBindingStatus,
  pre_effect_live_attempt_count: preEffectLiveAttemptCount,
  mailbox_baseline_count: mailboxBaselineCount,
  mailbox_evidence_check_count: mailboxEvidenceCheckCount,
  first_email_new_match_count: firstEmailNewMatchCount,
  first_email_evidence_status: firstEmailEvidenceStatus,
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
    'controlled_mailbox_exact_id_search_only',
    'no_mail_body_snippet_or_thread_read',
    'no_direct_send_resend_or_retrigger',
    'no_crm_or_source_write',
  ],
});

const markdownReceipt = (receipt) => `# MailerLite Existing Subscriber Active Trigger Correction Receipt\n\n- run_id: ${receipt.run_id}\n- packet_id: ${receipt.packet_id}\n- operation_class: ${receipt.operation_class}\n- approval_contract_version: ${receipt.approval_contract_version}\n- execution_binding_status: ${receipt.execution_binding_status}\n- automation_reference_match_status: ${receipt.automation_reference_match_status}\n- automation_active_status: ${receipt.automation_active_status}\n- automation_trigger_mapping_status: ${receipt.automation_trigger_mapping_status}\n- automation_mapping_checked_at: ${receipt.automation_mapping_checked_at ?? 'not_run'}\n- first_email_locator_status: ${receipt.first_email_locator_status}\n- mailbox_binding_status: ${receipt.mailbox_binding_status}\n- pre_effect_live_attempt_count: ${receipt.pre_effect_live_attempt_count}\n- mailbox_baseline_count: ${receipt.mailbox_baseline_count}\n- mailbox_evidence_check_count: ${receipt.mailbox_evidence_check_count}\n- first_email_new_match_count: ${receipt.first_email_new_match_count}\n- first_email_evidence_status: ${receipt.first_email_evidence_status}\n- correction_attempted: ${receipt.correction_attempted}\n- correction_executed: ${receipt.correction_executed}\n- mutation_outcome_status: ${receipt.mutation_outcome_status}\n- correction_result_status: ${receipt.correction_result_status}\n- subscriber_lookup_status: ${receipt.subscriber_lookup_status}\n- subscriber_status_class: ${receipt.subscriber_status_class}\n- identity_verification_status: ${receipt.identity_verification_status}\n- active_trigger_membership_before: ${receipt.active_trigger_membership_before}\n- active_trigger_membership_after: ${receipt.active_trigger_membership_after}\n- prior_non_active_group_preservation_status: ${receipt.prior_non_active_group_preservation_status}\n- all_prior_groups_preservation_status: ${receipt.all_prior_groups_preservation_status}\n- group_transition_status: ${receipt.group_transition_status}\n- mutation_endpoint_call_count: ${receipt.mutation_endpoint_call_count}\n- post_correction_verification_status: ${receipt.post_correction_verification_status}\n- blockers: ${receipt.blockers.length ? receipt.blockers.join(', ') : 'none'}\n- recommended_next_step: ${receipt.recommended_next_step}\n`;

const buildPrivateResult = ({ receipt, privateOutputMode }) => ({
  schema_version: SCHEMA_VERSION,
  private_output_mode: privateOutputMode,
  run_id: receipt.run_id,
  packet_id: receipt.packet_id,
  operation_class: receipt.operation_class,
  correction_attempted: receipt.correction_attempted,
  correction_executed: receipt.correction_executed,
  correction_result_status: receipt.correction_result_status,
  first_email_evidence_status: receipt.first_email_evidence_status,
  mailbox_evidence_check_count: receipt.mailbox_evidence_check_count,
  private_result_notice: 'Private correction run metadata only. Raw private lookup anchors, subscriber rows, raw payloads, credentials, headers, tokens, and private subscriber content are intentionally omitted by this guard.',
});

const privateMarkdown = (result) => `# MailerLite Active Trigger Correction Private Result\n\n- run_id: ${result.run_id}\n- packet_id: ${result.packet_id}\n- correction_attempted: ${result.correction_attempted}\n- correction_executed: ${result.correction_executed}\n- correction_result_status: ${result.correction_result_status}\n- first_email_evidence_status: ${result.first_email_evidence_status}\n- mailbox_evidence_check_count: ${result.mailbox_evidence_check_count}\n\n${result.private_result_notice}\n`;

const sensitiveValuesFor = (packetValidation, lookupBefore = {}, lookupAfter = {}, automationReference = null, extraPrivateValues = []) => [
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
  ...arrayFrom(extraPrivateValues),
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
  ok: receipt.correction_result_status === 'preflight_only_ready_for_exact_active_trigger_correction_approval'
    || (SUCCESS_RESULT_STATUSES.has(receipt.correction_result_status) && ['inbox_received_unique_bounded_locator_match', 'inbox_received_preexisting_unique_bounded_locator_match'].includes(receipt.first_email_evidence_status)),
  correction_result_status: receipt.correction_result_status,
  correction_attempted: receipt.correction_attempted,
  correction_executed: receipt.correction_executed,
  first_email_evidence_status: receipt.first_email_evidence_status,
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
  const liveBudgetState = await claimPreEffectLiveAttemptBudget({
    roots: deps.roots,
    approvalContractVersion: approvalValidation.contract_version,
    runId,
    packetId: packetValidation.packet_id,
  });
  const preEffectLiveAttemptCount = liveBudgetState.pre_effect_live_attempt_count;
  const baseClient = deps.correctionClient ?? createMailerLiteActiveTriggerCorrectionClient({ options, key: credential.key, fetchImpl: deps.fetchImpl ?? fetch, calls: deps.calls ?? [] });
  const limiter = mutationAttemptLimiter();
  const nowProvider = deps.nowProvider ?? (() => deps.now ?? new Date());
  const now = nowProvider();
  const mailboxEvidenceProvider = deps.mailboxEvidenceProvider ?? (options.mailboxEvidenceProvider === 'file-bridge'
    ? createFileBridgeMailboxEvidenceProvider({
      bridgeDir: paths.privateMailboxBridgeDir,
      privateRoot: rootsWithDefaults(deps.roots).privateMailerLiteRoot,
      sleep: deps.bridgeSleep ?? waitFor,
    })
    : { search: (request) => searchControlledInboxIds(request) });
  let mapping = {
    automation_reference_match_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
    automation_active_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
    automation_trigger_mapping_status: isMissionContract ? 'not_run' : 'not_required_by_selected_legacy_contract',
  };
  let mappingCheckedAt = null;
  let firstEmailLocator = null;
  let firstEmailLocatorStatus = 'not_run';
  let mailboxBindingStatus = 'not_run';
  let mailboxBaseline = { ids_private: [] };
  let mailboxBaselineCount = 0;
  let mailboxBaselineSourceCheckedAtEpochSeconds = null;
  let mailboxEvidenceCheckCount = 0;
  let firstEmailNewMatchCount = 0;
  let firstEmailEvidenceStatus = 'not_run';
  const mailboxPrivateEvidenceValues = [];
  const claimEvidenceCheck = async () => {
    const state = await claimMailboxEvidenceCheckBudget({
      roots: deps.roots,
      approvalContractVersion: approvalValidation.contract_version,
      runId,
      packetId: packetValidation.packet_id,
    });
    mailboxEvidenceCheckCount = state.mailbox_evidence_check_count;
    return {
      approval_contract_version: approvalValidation.contract_version,
      run_id: runId,
      packet_id: packetValidation.packet_id,
      mailbox_check_ordinal: mailboxEvidenceCheckCount,
    };
  };

  const receiptBase = () => ({
    runId,
    packetValidation,
    approvalContractVersion: approvalValidation.contract_version,
    executionBindingStatus,
    automationReferenceMatchStatus: mapping.automation_reference_match_status,
    automationActiveStatus: mapping.automation_active_status,
    automationTriggerMappingStatus: mapping.automation_trigger_mapping_status,
    automationMappingCheckedAt: mappingCheckedAt,
    firstEmailLocatorStatus,
    mailboxBindingStatus,
    preEffectLiveAttemptCount,
    mailboxBaselineCount,
    mailboxEvidenceCheckCount,
    firstEmailNewMatchCount,
    firstEmailEvidenceStatus,
  });
  const finish = async (receipt, before = {}, after = {}) => {
    await writeOutputs({
      paths,
      receipt,
      privateResult: buildPrivateResult({ receipt, privateOutputMode: deps.correctionClient || deps.automationClient ? 'mocked_live_atomic_route' : 'live_atomic_route' }),
      sensitiveValues: sensitiveValuesFor(packetValidation, before, after, automationReference, [
        firstEmailLocator?.subject_private,
        firstEmailLocator?.sender_private,
        ...mailboxPrivateEvidenceValues,
      ]),
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
      firstEmailLocator = firstEmailLocatorFromAutomation(mappingResponse);
      firstEmailLocatorStatus = firstEmailLocator.status;
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
    if (!firstEmailLocator?.ok) {
      return finish(buildReceipt({
        ...receiptBase(),
        correctionResultStatus: 'blocked_first_email_locator_not_verified',
        blockers: ['first_email_locator_not_verified'],
        recommendedNextStep: 'stop_before_subscriber_read_or_mutation',
      }));
    }
  }

  const baselineAt = nowProvider();
  try {
    const budgetClaim = await claimEvidenceCheck();
    const baselineResult = validateMailboxSearchResult(await mailboxEvidenceProvider.search({
      phase: 'baseline',
      mailboxAnchor: packetValidation.existing_subscriber_lookup_anchor,
      locator: firstEmailLocator,
      afterEpochSeconds: Math.floor(baselineAt.getTime() / 1000) - CONTROLLED_INBOX_LOOKBACK_SECONDS,
      beforeEpochSeconds: Math.floor(baselineAt.getTime() / 1000) + 1,
      budgetClaim,
    }));
    if (!baselineResult.ok) throw new Error('blocked_controlled_mailbox_baseline_ambiguous');
    mailboxBaseline = baselineResult;
    mailboxBaselineCount = baselineResult.ids_private.length;
    mailboxBaselineSourceCheckedAtEpochSeconds = baselineResult.source_checked_at_epoch_seconds
      ?? (deps.mailboxEvidenceProvider ? Math.floor(nowProvider().getTime() / 1000) : null);
    if (!Number.isInteger(mailboxBaselineSourceCheckedAtEpochSeconds)) throw new Error('blocked_controlled_mailbox_baseline_source_time_missing');
    mailboxBindingStatus = 'matched_exact_controlled_mailbox';
    mailboxPrivateEvidenceValues.push(...baselineResult.ids_private);
  } catch {
    mailboxBindingStatus = 'not_verified';
    firstEmailEvidenceStatus = 'not_run_baseline_failed';
    return finish(buildReceipt({
      ...receiptBase(),
      correctionResultStatus: 'blocked_controlled_mailbox_baseline_not_verified',
      blockers: ['controlled_mailbox_baseline_not_verified'],
      recommendedNextStep: 'stop_before_subscriber_read_or_mutation',
    }));
  }

  try {
    const refreshedAutomationClient = deps.automationClient ?? createMailerLiteExactAutomationClient({
      options,
      key: credential.key,
      expectedAutomationReference: automationReference,
      fetchImpl: deps.fetchImpl ?? fetch,
      calls: deps.automationCalls ?? [],
    });
    const refreshedAutomationResponse = await refreshedAutomationClient.request({ method: 'GET', path: exactAutomationGetPath(automationReference) });
    const refreshedMapping = classifyExactAutomationMapping(
      refreshedAutomationResponse,
      automationReference,
      packetValidation.active_live_trigger_group_reference,
    );
    const refreshedLocator = firstEmailLocatorFromAutomation(refreshedAutomationResponse);
    if (
      !refreshedMapping.ok
      || !refreshedLocator.ok
      || !sameReference(refreshedLocator.sender_private, firstEmailLocator.sender_private)
      || cleanString(refreshedLocator.subject_private) !== cleanString(firstEmailLocator.subject_private)
    ) throw new Error('blocked_fresh_automation_mapping_or_locator_mismatch');
    mapping = refreshedMapping;
    mappingCheckedAt = nowProvider().toISOString();
  } catch {
    return finish(buildReceipt({
      ...receiptBase(),
      correctionResultStatus: 'blocked_fresh_automation_mapping_not_verified_after_mailbox_baseline',
      blockers: ['fresh_automation_mapping_not_verified_after_mailbox_baseline'],
      recommendedNextStep: 'stop_before_subscriber_read_or_mutation',
    }));
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
  const mutationDecisionAtEpochSeconds = Math.floor(nowProvider().getTime() / 1000);
  const refreshedAutomationCheckedAtEpochSeconds = Number.isFinite(Date.parse(mappingCheckedAt))
    ? Math.floor(Date.parse(mappingCheckedAt) / 1000)
    : null;
  const mutationFreshnessVerifiedAt = (checkedAtEpochSeconds) => (
    Number.isInteger(mailboxBaselineSourceCheckedAtEpochSeconds)
    && mailboxBaselineSourceCheckedAtEpochSeconds <= checkedAtEpochSeconds + 1
    && checkedAtEpochSeconds - mailboxBaselineSourceCheckedAtEpochSeconds <= FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS
    && Number.isInteger(refreshedAutomationCheckedAtEpochSeconds)
    && refreshedAutomationCheckedAtEpochSeconds <= checkedAtEpochSeconds + 1
    && checkedAtEpochSeconds - refreshedAutomationCheckedAtEpochSeconds <= FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS
  );
  const mutationFreshnessVerified = mutationFreshnessVerifiedAt(mutationDecisionAtEpochSeconds);
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
        firstEmailEvidenceStatus = mailboxBaselineCount === 1
          ? 'inbox_received_preexisting_unique_bounded_locator_match'
          : 'not_verified_noop_no_retrigger';
        firstEmailNewMatchCount = 0;
        const emailVerified = firstEmailEvidenceStatus === 'inbox_received_preexisting_unique_bounded_locator_match';
        await claimMissionExecution({ roots: deps.roots, runId, packetId: packetValidation.packet_id, approvalContractVersion: approvalValidation.contract_version, executionClass: 'verified_noop' });
        receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'already_present_idempotent_noop_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'present', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed_noop_immediate_reread', blockers: emailVerified ? [] : ['first_email_delivery_not_verified_no_retrigger'], recommendedNextStep: emailVerified ? 'independent_review_and_closeout' : 'closeout_email_evidence_not_verified_no_retrigger' });
      } else {
        receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_noop_immediate_verification_failed', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'present', activeTriggerMembershipAfter: after.active_trigger_membership, priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: transition.all_prior_groups_preserved ? 'all_preserved' : 'failed_or_unknown', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed', blockers: ['noop_immediate_verification_failed'], recommendedNextStep: 'stop_without_mutation_or_retrigger' });
      }
    } catch {
      receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_noop_immediate_verification_failed', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: 'unknown_after_read_failure', activeTriggerMembershipBefore: 'present', mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'failed', blockers: ['noop_immediate_verification_read_failed'], recommendedNextStep: 'stop_without_mutation_or_retrigger' });
    }
  } else if (mailboxBaselineCount !== 0) {
    firstEmailEvidenceStatus = 'preexisting_unique_bounded_locator_match_assignment_blocked';
    await claimMissionExecution({ roots: deps.roots, runId, packetId: packetValidation.packet_id, approvalContractVersion: approvalValidation.contract_version, executionClass: 'preexisting_first_email_assignment_blocked' });
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_preexisting_first_email_evidence_before_assignment', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: 'absent', mutationEndpointCallCount: limiter.count, blockers: ['preexisting_first_email_evidence_before_assignment'], recommendedNextStep: 'stop_without_assignment_or_retrigger' });
  } else if (!mutationFreshnessVerified) {
    receipt = buildReceipt({ ...receiptBase(), correctionResultStatus: 'blocked_pre_mutation_freshness_not_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: before.identity_anchor_match, activeTriggerMembershipBefore: 'absent', mutationEndpointCallCount: limiter.count, blockers: ['mailbox_or_automation_freshness_not_verified'], recommendedNextStep: 'stop_without_assignment_or_retrigger' });
  } else {
    await claimMissionExecution({ roots: deps.roots, runId, packetId: packetValidation.packet_id, approvalContractVersion: approvalValidation.contract_version, executionClass: 'single_add_only_assignment_attempt' });
    const postLockAtEpochSeconds = Math.floor(nowProvider().getTime() / 1000);
    if (!mutationFreshnessVerifiedAt(postLockAtEpochSeconds)) {
      return finish(buildReceipt({
        ...receiptBase(),
        correctionResultStatus: 'blocked_post_lock_pre_post_freshness_not_verified_no_retry',
        subscriberLookupStatus: before.subscriber_lookup_status,
        subscriberStatusClass: before.subscriber_status_class,
        identityVerificationStatus: before.identity_anchor_match,
        activeTriggerMembershipBefore: 'absent',
        mutationEndpointCallCount: limiter.count,
        blockers: ['post_lock_pre_post_freshness_not_verified_no_retry'],
        recommendedNextStep: 'stop_terminal_without_assignment_or_retrigger',
      }), before);
    }
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
    let emailEvidenceBlockers = [];
    let emailEvidenceRecommendedNextStep = 'closeout_email_evidence_not_verified_no_resend';
    if (verifiedEffect) {
      const emailEvidence = await pollFirstEmailEvidence({
        mailboxEvidenceProvider,
        mailboxAnchor: packetValidation.existing_subscriber_lookup_anchor,
        locator: firstEmailLocator,
        baselineIds: mailboxBaseline.ids_private,
        baselineAt,
        nowProvider,
        claimEvidenceCheck,
        sleep: deps.sleep ?? waitFor,
      });
      firstEmailNewMatchCount = emailEvidence.new_match_count;
      firstEmailEvidenceStatus = emailEvidence.status;
      mailboxPrivateEvidenceValues.push(...emailEvidence.private_ids_seen);
      if (firstEmailEvidenceStatus === 'inbox_received_unique_bounded_locator_match') {
        emailEvidenceRecommendedNextStep = 'independent_review_and_closeout';
      } else {
        emailEvidenceBlockers = ['first_email_delivery_not_verified_no_resend'];
      }
    } else {
      firstEmailEvidenceStatus = 'not_run_correction_verification_failed_no_resend';
    }
    if (verifiedEffect && postOutcome === 'acknowledged') {
      receipt = buildReceipt({ ...receiptBase(), correctionAttempted: true, correctionExecuted: true, mutationOutcomeStatus: 'acknowledged_and_effect_verified', correctionResultStatus: 'correction_executed_verified', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed', blockers: emailEvidenceBlockers, recommendedNextStep: emailEvidenceRecommendedNextStep });
    } else if (verifiedEffect && postOutcome === 'unknown_no_retry') {
      receipt = buildReceipt({ ...receiptBase(), correctionAttempted: true, correctionExecuted: null, mutationOutcomeStatus: 'response_unknown_effect_verified_no_retry', correctionResultStatus: 'assignment_effect_verified_after_unknown_post_outcome', subscriberLookupStatus: before.subscriber_lookup_status, subscriberStatusClass: before.subscriber_status_class, identityVerificationStatus: identity, activeTriggerMembershipBefore: 'absent', activeTriggerMembershipAfter: 'present', priorNonActiveGroupPreservationStatus: preservation, allPriorGroupsPreservationStatus: 'all_preserved', groupTransitionStatus: transition.status, mutationEndpointCallCount: limiter.count, postCorrectionVerificationStatus: 'passed_effect_only', blockers: ['post_response_unknown_no_retry', ...emailEvidenceBlockers], recommendedNextStep: firstEmailEvidenceStatus === 'inbox_received_unique_bounded_locator_match' ? 'independent_review_and_closeout_no_assignment_retry' : 'closeout_email_evidence_not_verified_never_retry_assignment' });
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
  controlledInboxQuery,
  controlledMailboxProfileMatchesAnchor,
  createFileBridgeMailboxEvidenceProvider,
  createMailerLiteActiveTriggerCorrectionClient,
  createMailerLiteExactAutomationClient,
  firstEmailLocatorFromAutomation,
  gmailAuthenticatedAccountForAnchor,
  exactAutomationGetPath,
  forbiddenEndpointReason,
  isInside,
  mutationAttemptLimiter,
  parseGogMessageIdResult,
  parseArgs,
  pollFirstEmailEvidence,
  priorPreservationStatus,
  redactScan,
  run,
  runLiveMode,
  runPreflightOnlyMode,
  searchControlledInboxIds,
  subscriberGetPath,
  verifyGroupTransition,
  verifyIdentityContinuity,
  validateFileBridgeResponse,
  validateActiveTriggerCorrectionApprovalPhrase,
  validateActiveTriggerCorrectionPacket,
  validatePathPolicy,
};
