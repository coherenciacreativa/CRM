#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, link, mkdir, open, readFile, readdir, readlink, rename, rmdir, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { validateFinalCheckReadyReceipt as validateSharedFinalCheckReadyReceipt } from './crm-vnext-mailerlite-final-check-receipt-contract.mjs';
import { FINAL_CHECK_PRIVATE_PACKET_BINDING_CONTRACT_VERSION } from './crm-vnext-mailerlite-final-idempotency-suppression-check.mjs';
import {
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
  approvalTemplatePayload,
  validateExactOnboardingMutationApprovalPhrase,
} from './crm-vnext-mailerlite-exact-mutation-approval-contract.mjs';
import {
  PILOT_ACTIVE_NEXT_ACTION,
  PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  PILOT_DUAL_GROUP_OPERATION_CLASS,
  PILOT_FINAL_CHECK_MAX_AGE_MS,
  PILOT_MAX_MAILERLITE_UPSERTS,
  PILOT_MISSION_CONTRACT_VERSION,
  PILOT_MISSION_ID,
  validatePilotApprovalReceipt,
  validatePilotPacketBinding,
} from './crm-vnext-mailerlite-limited-pilot-dual-group-approval-contract.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-exact-onboarding-mutation-2026-07-07-v1';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const REDACTED_RECEIPT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow';
const PRIVATE_PILOT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/controlled-welcome-flow/limited-operational-pilot-2026-07-13';
const PILOT_MISSION_CONTRACT_RELATIVE_PATH = 'docs/crm-vnext/crm-core-limited-operational-pilot-mission-contract-2026-07-13-v1.md';
const PILOT_OPERATION_REGISTRY_FILENAME = 'operation_registry_private.json';
const OPERATION_CLASS = 'subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass';
const COMPLETED_FINAL_CHECK_ROUTE_STATUS = 'completed_live_readonly_packet_final_check';
const SAFE_MUTATION_CLIENT_CONTRACT = 'post_subscribers_only_current_not_found_path';
const EXACT_MUTATION_GUARD_STATUS = 'exact_mutation_execution_guard_implemented_mocked_live_tested';
const PILOT_DUAL_GROUP_GUARD_STATUS = 'limited_pilot_dual_group_direct_api_guard_implemented_mock_tested';
const PILOT_PRE_EFFECT_CLAIM_LEASE_MS = 30_000;
const PILOT_MUTEX_INITIALIZATION_GRACE_MS = 1_000;
const PILOT_MUTEX_RECOVERY_MAX_ATTEMPTS = 16;
const DEFAULT_API_BASE = ['https:', '', 'connect.mailerlite.com', 'api'].join('/');
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const DEFAULT_MAX_FINAL_CHECK_AGE_MS = 15 * 60 * 1000;
const FUTURE_EXACT_APPROVAL_PHRASE = EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE;
const APPROVED_DUAL_GROUP_EVIDENCE_STATUSES = new Set([
  'dual_group_upsert_and_first_automatic_email_recorded',
  'dual_group_upsert_automation_entry_recorded_email_pending',
  'dual_group_upsert_verified_automation_entry_not_recorded',
]);

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
  --preflight-only

Limited pilot direct dual-group mode:
  --final-check-private-result-json <owner-only final-check packet binding path>
  --pilot-approval-receipt-json <owner-only contextual approval receipt>
  --operation-registry-json <owner-only operation registry>
  --approved-dual-group-evidence-json <owner-only proven group evidence>
  --mission-contract-file <approved v1 mission contract>

Safe no-live approval contract modes:
  --print-approval-template
  --approval-template
  --validate-approval-phrase-file <path>

The safe client contract permits exactly one mutation endpoint:
POST /api/subscribers. Legacy one-group approval remains unchanged. The limited
pilot operation requires two distinct approved private group references in the
same payload, a contextual approval receipt, packet/final-check/registry binding,
and the canonical direct MailerLite API route. Raw private values are never
printed.`;

const parseArgs = (argv) => {
  const options = {
    fixtureFile: null,
    allowLiveExactOnboardingMutation: false,
    preflightOnly: false,
    approvalPhrase: null,
    approvalPhraseFile: null,
    privatePacketJson: null,
    finalCheckRedactedJson: null,
    finalCheckPrivateResultJson: null,
    pilotApprovalReceiptJson: null,
    operationRegistryJson: null,
    approvedDualGroupEvidenceJson: null,
    missionContractFile: null,
    privateResultJson: null,
    privateResultMd: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    maxFinalCheckAgeMs: DEFAULT_MAX_FINAL_CHECK_AGE_MS,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    printApprovalTemplate: false,
    validateApprovalPhraseFile: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--print-approval-template' || arg === '--approval-template') options.printApprovalTemplate = true;
    else if (arg === '--validate-approval-phrase-file') options.validateApprovalPhraseFile = argv[++index];
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--allow-live-exact-onboarding-mutation') options.allowLiveExactOnboardingMutation = true;
    else if (arg === '--preflight-only') options.preflightOnly = true;
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--approval-file' || arg === '--approval-phrase-file') options.approvalPhraseFile = argv[++index];
    else if (arg === '--private-packet-json') options.privatePacketJson = argv[++index];
    else if (arg === '--final-check-redacted-json') options.finalCheckRedactedJson = argv[++index];
    else if (arg === '--final-check-private-result-json') options.finalCheckPrivateResultJson = argv[++index];
    else if (arg === '--pilot-approval-receipt-json') options.pilotApprovalReceiptJson = argv[++index];
    else if (arg === '--operation-registry-json') options.operationRegistryJson = argv[++index];
    else if (arg === '--approved-dual-group-evidence-json') options.approvedDualGroupEvidenceJson = argv[++index];
    else if (arg === '--mission-contract-file') options.missionContractFile = argv[++index];
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
  privatePilotRoot: roots.privatePilotRoot ?? PRIVATE_PILOT_ROOT,
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
  if (!options.allowLiveExactOnboardingMutation && !options.preflightOnly) throw new Error('not_run_missing_approval');
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
  if (options.finalCheckPrivateResultJson) {
    assertOutsideRoot(options.finalCheckPrivateResultJson, resolvedRoots.repoRoot, 'final_check_private_result_json');
    assertUnderRoot(options.finalCheckPrivateResultJson, resolvedRoots.privateMailerLiteRoot, 'final_check_private_result_json');
  }
  assertUnderRoot(options.privateResultJson, resolvedRoots.privateMailerLiteRoot, 'private_result_json');
  assertUnderRoot(options.privateResultMd, resolvedRoots.privateMailerLiteRoot, 'private_result_md');
  assertUnderRoot(options.redactedReceiptJson, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_json');
  assertUnderRoot(options.redactedReceiptMd, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_md');
  if (options.pilotApprovalReceiptJson) {
    assertOutsideRoot(options.pilotApprovalReceiptJson, resolvedRoots.repoRoot, 'pilot_approval_receipt_json');
    assertUnderRoot(options.pilotApprovalReceiptJson, resolvedRoots.privatePilotRoot, 'pilot_approval_receipt_json');
  }
  if (options.operationRegistryJson) {
    assertOutsideRoot(options.operationRegistryJson, resolvedRoots.repoRoot, 'operation_registry_json');
    assertUnderRoot(options.operationRegistryJson, resolvedRoots.privatePilotRoot, 'operation_registry_json');
    if (resolve(options.operationRegistryJson) !== resolve(resolvedRoots.privatePilotRoot, PILOT_OPERATION_REGISTRY_FILENAME)) {
      throw new Error('operation_registry_json_not_canonical_pilot_registry_rejected');
    }
  }
  if (options.approvedDualGroupEvidenceJson) {
    assertOutsideRoot(options.approvedDualGroupEvidenceJson, resolvedRoots.repoRoot, 'approved_dual_group_evidence_json');
    assertUnderRoot(options.approvedDualGroupEvidenceJson, resolvedRoots.privateMailerLiteRoot, 'approved_dual_group_evidence_json');
  }
  if (options.missionContractFile) {
    assertUnderRoot(options.missionContractFile, resolvedRoots.repoRoot, 'mission_contract_file');
    if (resolve(options.missionContractFile) !== resolve(resolvedRoots.repoRoot, PILOT_MISSION_CONTRACT_RELATIVE_PATH)) {
      throw new Error('mission_contract_file_not_canonical_pilot_contract_rejected');
    }
  }
  return {
    privatePacketJson: resolve(options.privatePacketJson),
    finalCheckRedactedJson: resolve(options.finalCheckRedactedJson),
    finalCheckPrivateResultJson: options.finalCheckPrivateResultJson ? resolve(options.finalCheckPrivateResultJson) : null,
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
    pilotApprovalReceiptJson: options.pilotApprovalReceiptJson ? resolve(options.pilotApprovalReceiptJson) : null,
    operationRegistryJson: options.operationRegistryJson ? resolve(options.operationRegistryJson) : null,
    approvedDualGroupEvidenceJson: options.approvedDualGroupEvidenceJson ? resolve(options.approvedDualGroupEvidenceJson) : null,
    missionContractFile: options.missionContractFile ? resolve(options.missionContractFile) : null,
  };
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJsonWithDigest = async (path) => {
  const bytes = await readFile(path);
  return { value: JSON.parse(bytes.toString('utf8')), digest: sha256(bytes) };
};

const writeJson = async (path, value) => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(path, 0o600);
};

const writeText = async (path, value) => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, value, { encoding: 'utf8', mode: 0o600 });
  await chmod(path, 0o600);
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
const activeLiveTriggerGroupReference = (packet) => cleanString(firstValue(packet, [
  'private_lookup.active_live_trigger_group_reference',
  'privateLookup.activeLiveTriggerGroupReference',
]));
const onboardingConditionGroupReference = (packet) => cleanString(firstValue(packet, [
  'private_lookup.onboarding_condition_group_reference',
  'privateLookup.onboardingConditionGroupReference',
]));

const operationClassOf = (packet) => cleanString(packet?.operation_class);
const pilotIdentityAnchorSha256 = (packet) => {
  const rawEmail = firstValue(packet, ['private_lookup.email', 'privateLookup.email', 'privateEmailForLookup', 'email_for_lookup', 'top_level_email']);
  if (typeof rawEmail !== 'string') throw new Error('blocked_missing_private_packet_email_anchor');
  const exactTrimmedEmail = rawEmail.trim();
  if (!exactTrimmedEmail || /\s/.test(exactTrimmedEmail)) throw new Error('blocked_pilot_exact_email_identity_invalid');
  return sha256(exactTrimmedEmail.toLowerCase());
};

const groupReferencesFor = (packet) => {
  const operationClass = operationClassOf(packet);
  if (operationClass === OPERATION_CLASS) {
    const groupReference = confirmedOnboardingGroupReference(packet);
    if (!groupReference) throw new Error('blocked_missing_private_packet_group_reference');
    return [groupReference];
  }
  if (operationClass === PILOT_DUAL_GROUP_OPERATION_CLASS) {
    const triggerReference = activeLiveTriggerGroupReference(packet);
    const conditionReference = onboardingConditionGroupReference(packet);
    if (!triggerReference) throw new Error('blocked_missing_private_packet_active_trigger_group_reference');
    if (!conditionReference) throw new Error('blocked_missing_private_packet_onboarding_condition_group_reference');
    if (triggerReference === conditionReference) throw new Error('blocked_private_packet_dual_group_references_not_distinct');
    return [triggerReference, conditionReference];
  }
  throw new Error('blocked_private_packet_operation_class_mismatch');
};

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
  const operationClass = operationClassOf(packet);
  const groupReferences = groupReferencesFor(packet);
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
    operationClass,
    groupReferences,
    mappedFieldFamilies: mappedFieldFamiliesFor(packet),
  };
};

const approvalTextFrom = async (options) => {
  if (options.approvalPhrase) return options.approvalPhrase;
  if (options.approvalPhraseFile) return readFile(resolve(options.approvalPhraseFile), 'utf8');
  if (options.validateApprovalPhraseFile) return readFile(resolve(options.validateApprovalPhraseFile), 'utf8');
  return null;
};

const assertExactApprovalPhrase = async (options) => {
  const phrase = await approvalTextFrom(options);
  const validation = validateExactOnboardingMutationApprovalPhrase(phrase);
  if (!validation.ok) throw new Error(validation.reason);
  return validation;
};

const assertCanonicalPilotApiBase = (options) => {
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error('blocked_pilot_noncanonical_mailerlite_api_base');
};

const activeNextActionFrom = (content) => {
  const headings = content.match(/^## Active Next Action\s*$/gm) ?? [];
  if (headings.length !== 1) return null;
  const section = content.split(/^## Active Next Action\s*$/m)[1] ?? '';
  return cleanString(section.match(/- `next_action_id`:\s*(?:\n\s*)?`([^`]+)`/)?.[1]);
};

const defaultExecutionContextProvider = async (repoRoot) => {
  const [{ stdout: headStdout }, { stdout: statusStdout }, nextActionText] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, timeout: 10_000, maxBuffer: 1024 * 1024 }),
    execFileAsync('git', ['status', '--porcelain'], { cwd: repoRoot, timeout: 10_000, maxBuffer: 1024 * 1024 }),
    readFile(resolve(repoRoot, 'docs/crm-vnext/crm-core-next-action.md'), 'utf8'),
  ]);
  return {
    repo_head: headStdout.trim(),
    worktree_clean: statusStdout.trim() === '',
    active_next_action: activeNextActionFrom(nextActionText),
  };
};

const assertPilotRequiredPaths = (paths) => {
  for (const [key, reason] of [
    ['finalCheckPrivateResultJson', 'blocked_pilot_final_check_private_binding_path_missing'],
    ['pilotApprovalReceiptJson', 'blocked_pilot_approval_receipt_path_missing'],
    ['operationRegistryJson', 'blocked_pilot_operation_registry_path_missing'],
    ['approvedDualGroupEvidenceJson', 'blocked_pilot_group_evidence_path_missing'],
    ['missionContractFile', 'blocked_pilot_mission_contract_path_missing'],
  ]) {
    if (!paths[key]) throw new Error(reason);
  }
};

const assertPilotFinalCheckPrivateBinding = ({ packetRecord, finalCheckReceipt, privateBindingRecord }) => {
  const privateBinding = privateBindingRecord?.value;
  if (!privateBinding || typeof privateBinding !== 'object' || Array.isArray(privateBinding)) {
    throw new Error('blocked_pilot_final_check_private_binding_missing_or_invalid');
  }
  if (cleanString(privateBinding.packet_binding_contract_version) !== FINAL_CHECK_PRIVATE_PACKET_BINDING_CONTRACT_VERSION) {
    throw new Error('blocked_pilot_final_check_private_binding_contract_mismatch');
  }
  if (cleanString(privateBinding.packet_sha256_private)?.toLowerCase() !== packetRecord.digest) {
    throw new Error('blocked_pilot_final_check_private_packet_digest_mismatch');
  }
  if (cleanString(privateBinding.packet_id) !== packetIdOf(packetRecord.value)) {
    throw new Error('blocked_pilot_final_check_private_packet_id_mismatch');
  }
  if (cleanString(privateBinding.operation_id_private) !== cleanString(packetRecord.value?.operation_id)) {
    throw new Error('blocked_pilot_final_check_private_operation_id_mismatch');
  }
  if (cleanString(privateBinding.operation_class_private) !== PILOT_DUAL_GROUP_OPERATION_CLASS) {
    throw new Error('blocked_pilot_final_check_private_operation_class_mismatch');
  }
  if (
    !cleanString(finalCheckReceipt?.run_id)
    || cleanString(privateBinding.run_id) !== cleanString(finalCheckReceipt.run_id)
    || cleanString(privateBinding.completed_at) !== finalCheckTimestamp(finalCheckReceipt)
  ) {
    throw new Error('blocked_pilot_final_check_private_receipt_run_binding_mismatch');
  }
  if (
    cleanString(privateBinding.route_status) !== cleanString(finalCheckReceipt?.route_status)
    || cleanString(privateBinding?.result?.mutation_readiness_after_final_check) !== cleanString(finalCheckReceipt?.mutation_readiness_after_final_check)
  ) {
    throw new Error('blocked_pilot_final_check_private_receipt_result_mismatch');
  }
  return { private_binding_sha256: privateBindingRecord.digest };
};

const assertNoPilotIdentityReuse = ({ registry, operationId, identityAnchorSha256 }) => {
  const operations = registry?.operations;
  if (!operations || typeof operations !== 'object' || Array.isArray(operations)) {
    throw new Error('blocked_pilot_operation_registry_operations_invalid');
  }
  for (const [candidateOperationId, entry] of Object.entries(operations)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('blocked_pilot_operation_registry_entry_invalid');
    }
    const candidateIdentity = cleanString(entry.identity_anchor_sha256)?.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(candidateIdentity ?? '')) {
      throw new Error('blocked_pilot_operation_registry_identity_anchor_missing_or_invalid');
    }
    if (candidateOperationId !== operationId && candidateIdentity === identityAnchorSha256) {
      throw new Error('blocked_pilot_identity_already_registered_no_retrigger');
    }
  }
};

const assertApprovedDualGroupEvidence = ({ packet, evidence }) => {
  if (!APPROVED_DUAL_GROUP_EVIDENCE_STATUSES.has(cleanString(evidence?.final_status))) {
    throw new Error('blocked_pilot_group_evidence_status_not_approved');
  }
  if (evidence?.mutation_outcome_known !== true || evidence?.mutation_call_count !== 1) {
    throw new Error('blocked_pilot_group_evidence_single_known_mutation_not_verified');
  }
  const triggerReference = cleanString(evidence?.trigger_group_reference_private);
  const conditionReference = cleanString(evidence?.condition_group_reference_private);
  if (!triggerReference || !conditionReference || triggerReference === conditionReference) {
    throw new Error('blocked_pilot_group_evidence_references_invalid');
  }
  const packetReferences = groupReferencesFor(packet);
  if (packetReferences[0] !== triggerReference || packetReferences[1] !== conditionReference) {
    throw new Error('blocked_pilot_packet_group_references_not_approved');
  }
};

const assertPilotAuthorizationAndBinding = async ({ options, paths, packetRecord, finalCheckReceipt, deps = {} }) => {
  if (options.approvalPhrase || options.approvalPhraseFile) throw new Error('blocked_legacy_approval_phrase_cannot_authorize_dual_group_pilot');
  assertCanonicalPilotApiBase(options);
  assertPilotRequiredPaths(paths);

  const [approvalRecord, registryRecord, evidenceRecord, finalCheckPrivateRecord, contractBytes] = await Promise.all([
    readJsonWithDigest(paths.pilotApprovalReceiptJson),
    readJsonWithDigest(paths.operationRegistryJson),
    readJsonWithDigest(paths.approvedDualGroupEvidenceJson),
    readJsonWithDigest(paths.finalCheckPrivateResultJson),
    readFile(paths.missionContractFile),
  ]);
  const approval = validatePilotApprovalReceipt(approvalRecord.value);
  if (!approval.ok) throw new Error(approval.reason);
  const contractDigest = sha256(contractBytes);
  if (approval.mission_contract_sha256 !== contractDigest) throw new Error('blocked_pilot_mission_contract_digest_mismatch');
  if (approval.approved_group_evidence_sha256 !== evidenceRecord.digest) throw new Error('blocked_pilot_group_evidence_digest_mismatch');
  if (cleanString(registryRecord.value?.mission_id) !== PILOT_MISSION_ID) throw new Error('blocked_pilot_operation_registry_mission_mismatch');

  const operationId = cleanString(packetRecord.value?.operation_id);
  const registryEntry = operationId ? registryRecord.value?.operations?.[operationId] : null;
  const identityAnchorSha256 = pilotIdentityAnchorSha256(packetRecord.value);
  assertNoPilotIdentityReuse({ registry: registryRecord.value, operationId, identityAnchorSha256 });
  const contextProvider = deps.executionContextProvider ?? defaultExecutionContextProvider;
  const executionContext = await contextProvider(rootsWithDefaults(deps.roots).repoRoot);
  const binding = validatePilotPacketBinding({
    packet: packetRecord.value,
    approvalReceipt: approvalRecord.value,
    registryEntry,
    finalCheckReceipt,
    executionContext,
    nowMs: deps.nowMs ?? Date.now(),
  });
  if (!binding.ok) throw new Error(binding.reason);
  if (binding.packet_sha256 !== packetRecord.digest) throw new Error('blocked_pilot_packet_digest_mismatch');
  if (binding.pilot_approval_receipt_sha256 !== approvalRecord.digest) throw new Error('blocked_pilot_approval_receipt_digest_mismatch');
  if (binding.identity_anchor_sha256 !== identityAnchorSha256) throw new Error('blocked_pilot_registry_identity_anchor_mismatch');
  if (cleanString(registryEntry?.mission_contract_sha256)?.toLowerCase() !== contractDigest) {
    throw new Error('blocked_pilot_registry_mission_contract_digest_mismatch');
  }
  if (cleanString(registryEntry?.approved_group_evidence_sha256)?.toLowerCase() !== evidenceRecord.digest) {
    throw new Error('blocked_pilot_registry_group_evidence_digest_mismatch');
  }
  const finalCheckPrivateBinding = assertPilotFinalCheckPrivateBinding({
    packetRecord,
    finalCheckReceipt,
    privateBindingRecord: finalCheckPrivateRecord,
  });
  assertApprovedDualGroupEvidence({ packet: packetRecord.value, evidence: evidenceRecord.value });
  return {
    ...binding,
    ...finalCheckPrivateBinding,
    operation_registry_sha256: registryRecord.digest,
    operationRegistryPath: paths.operationRegistryJson,
    identity_anchor_sha256: identityAnchorSha256,
    lockPath: join(rootsWithDefaults(deps.roots).privatePilotRoot, 'locks', `${binding.operation_id}.json`),
  };
};

const assertAuthorizationForPacket = async ({ options, paths, packetRecord, finalCheckReceipt, deps = {}, preflightOnly = false }) => {
  if (operationClassOf(packetRecord.value) === PILOT_DUAL_GROUP_OPERATION_CLASS) {
    return assertPilotAuthorizationAndBinding({ options, paths, packetRecord, finalCheckReceipt, deps });
  }
  if (options.finalCheckPrivateResultJson || options.pilotApprovalReceiptJson || options.operationRegistryJson || options.approvedDualGroupEvidenceJson || options.missionContractFile) {
    throw new Error('blocked_pilot_authorization_artifacts_cannot_authorize_legacy_operation');
  }
  if (preflightOnly && !options.approvalPhrase && !options.approvalPhraseFile) {
    return { legacy_preflight_without_approval: true, lockPath: null };
  }
  await assertExactApprovalPhrase(options);
  return { legacy_exact_phrase_contract: true, lockPath: null };
};

const readPilotEffectLocks = async (lockDirectory) => {
  const entries = await readdir(lockDirectory, { withFileTypes: true });
  const locks = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    let value;
    try {
      value = await readJson(join(lockDirectory, entry.name));
    } catch {
      throw new Error('blocked_pilot_effect_lock_registry_invalid');
    }
    const state = cleanString(value?.state);
    if (
      cleanString(value?.schema_version) !== 'crm_core_limited_pilot_effect_lock_v1'
      || cleanString(value?.mission_id) !== PILOT_MISSION_ID
      || !cleanString(value?.operation_id)
      || !/^[0-9a-f]{64}$/.test(cleanString(value?.identity_anchor_sha256)?.toLowerCase() ?? '')
      || !new Set(['pre_effect_claimed', 'cancelled_pre_effect_no_network', 'attempting', 'completed_known_success']).has(state)
    ) {
      throw new Error('blocked_pilot_effect_lock_registry_invalid');
    }
    if (state === 'cancelled_pre_effect_no_network') {
      if (value?.retry_allowed !== true || value?.effect_attempted !== false || !cleanString(value?.pre_effect_claim_token)) {
        throw new Error('blocked_pilot_effect_lock_registry_invalid');
      }
      continue;
    }
    if (state === 'pre_effect_claimed') {
      const leaseExpiresAtMs = Number(value?.pre_effect_lease_expires_at_ms);
      if (
        !cleanString(value?.pre_effect_claim_token)
        || !Number.isInteger(value?.pre_effect_owner_pid)
        || !Number.isFinite(leaseExpiresAtMs)
        || value?.retry_allowed !== true
        || value?.effect_attempted !== false
      ) {
        throw new Error('blocked_pilot_effect_lock_registry_invalid');
      }
      if (pilotMutexOwnerIsAlive(value.pre_effect_owner_pid) === false) continue;
    }
    if (['attempting', 'completed_known_success'].includes(state) && (value?.retry_allowed !== false || value?.effect_attempted !== true)) {
      throw new Error('blocked_pilot_effect_lock_registry_invalid');
    }
    locks.push(value);
  }
  return locks;
};

const assertPilotBindingFreshAt = (binding, nowMs) => {
  for (const timestamp of [binding.packet_created_at_ms, binding.registry_prepared_at_ms, binding.final_check_at_ms]) {
    if (!Number.isFinite(timestamp) || timestamp > nowMs + 60_000 || nowMs - timestamp > PILOT_FINAL_CHECK_MAX_AGE_MS) {
      throw new Error('blocked_pilot_binding_expired_before_effect');
    }
  }
};

const pilotMutexOwnerIsAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'ESRCH' ? false : true;
  }
};

const acquirePilotClaimMutex = async ({ mutexPath, binding, recoveryAttempt = 0 }) => {
  if (recoveryAttempt > PILOT_MUTEX_RECOVERY_MAX_ATTEMPTS) {
    throw new Error('blocked_pilot_effect_claim_mutex_recovery_exhausted');
  }
  const leaseNowMs = Date.now();
  const mutex = {
    schema_version: 'crm_core_limited_pilot_effect_claim_mutex_v3',
    mission_id: PILOT_MISSION_ID,
    operation_id: binding.operation_id,
    owner_pid: process.pid,
    owner_token: randomUUID(),
    created_at: new Date(leaseNowMs).toISOString(),
    expires_at_ms: leaseNowMs + PILOT_PRE_EFFECT_CLAIM_LEASE_MS,
  };
  mutex.marker_name = `owner-${mutex.owner_token}`;
  try {
    await mkdir(mutexPath, { mode: 0o700 });
    try {
      await symlink(JSON.stringify(mutex), join(mutexPath, mutex.marker_name));
      return mutex;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
      }
      throw error;
    }
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }

  let entries;
  try {
    entries = await readdir(mutexPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
    }
    throw new Error('blocked_pilot_effect_claim_mutex_invalid');
  }
  if (entries.length === 0) {
    let directoryStat;
    try {
      directoryStat = await stat(mutexPath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
      }
      throw error;
    }
    if (Date.now() - directoryStat.mtimeMs <= PILOT_MUTEX_INITIALIZATION_GRACE_MS) {
      throw new Error('blocked_pilot_effect_claim_mutex_initializing');
    }
    try {
      await rmdir(mutexPath);
    } catch (error) {
      if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error?.code)) {
        return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
      }
      throw error;
    }
    return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
  }
  if (entries.length !== 1 || !entries[0].isSymbolicLink() || !entries[0].name.startsWith('owner-')) {
    throw new Error('blocked_pilot_effect_claim_mutex_invalid');
  }
  const existingMarkerName = entries[0].name;
  const existingMarkerPath = join(mutexPath, existingMarkerName);
  let existing;
  try {
    existing = JSON.parse(await readlink(existingMarkerPath));
  } catch {
    throw new Error('blocked_pilot_effect_claim_mutex_invalid');
  }
  if (
    cleanString(existing?.schema_version) !== 'crm_core_limited_pilot_effect_claim_mutex_v3'
    || cleanString(existing?.mission_id) !== PILOT_MISSION_ID
    || !cleanString(existing?.owner_token)
    || cleanString(existing?.marker_name) !== existingMarkerName
    || existingMarkerName !== `owner-${existing.owner_token}`
    || !Number.isInteger(existing?.owner_pid)
    || existing.owner_pid <= 0
    || !Number.isFinite(existing?.expires_at_ms)
  ) {
    throw new Error('blocked_pilot_effect_claim_mutex_invalid');
  }
  if (pilotMutexOwnerIsAlive(existing.owner_pid) !== false) {
    throw new Error('blocked_pilot_effect_claim_in_progress');
  }
  try {
    await unlink(existingMarkerPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
    }
    throw error;
  }
  try {
    await rmdir(mutexPath);
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error?.code)) throw error;
  }
  return acquirePilotClaimMutex({ mutexPath, binding, recoveryAttempt: recoveryAttempt + 1 });
};

const assertPilotClaimMutexOwned = async ({ mutexPath, mutex }) => {
  let entries;
  let existing;
  try {
    entries = await readdir(mutexPath, { withFileTypes: true });
    if (entries.length !== 1 || entries[0].name !== mutex.marker_name || !entries[0].isSymbolicLink()) throw new Error('invalid');
    existing = JSON.parse(await readlink(join(mutexPath, mutex.marker_name)));
  } catch {
    throw new Error('blocked_pilot_effect_claim_mutex_ownership_lost');
  }
  if (
    cleanString(existing?.schema_version) !== 'crm_core_limited_pilot_effect_claim_mutex_v3'
    || cleanString(existing?.mission_id) !== PILOT_MISSION_ID
    || cleanString(existing?.marker_name) !== mutex.marker_name
    || cleanString(existing?.owner_token) !== mutex.owner_token
    || existing?.owner_pid !== mutex.owner_pid
    || existing?.expires_at_ms !== mutex.expires_at_ms
    || Date.now() >= mutex.expires_at_ms
  ) {
    throw new Error('blocked_pilot_effect_claim_mutex_ownership_lost');
  }
};

const releasePilotClaimMutex = async ({ mutexPath, mutex }) => {
  let existing;
  const markerPath = join(mutexPath, mutex.marker_name);
  try {
    existing = JSON.parse(await readlink(markerPath));
  } catch {
    throw new Error('blocked_pilot_effect_claim_mutex_release_invalid');
  }
  if (
    cleanString(existing?.schema_version) !== 'crm_core_limited_pilot_effect_claim_mutex_v3'
    || cleanString(existing?.mission_id) !== PILOT_MISSION_ID
    || cleanString(existing?.marker_name) !== mutex.marker_name
    || cleanString(existing?.owner_token) !== mutex.owner_token
    || existing?.owner_pid !== mutex.owner_pid
  ) {
    throw new Error('blocked_pilot_effect_claim_mutex_ownership_changed');
  }
  try {
    await unlink(markerPath);
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('blocked_pilot_effect_claim_mutex_ownership_changed');
    throw error;
  }
  try {
    await rmdir(mutexPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error('blocked_pilot_effect_claim_mutex_release_invalid');
  }
  if (Date.now() >= mutex.expires_at_ms) {
    throw new Error('blocked_pilot_effect_claim_mutex_lease_expired');
  }
};

const writeNewPilotEffectLockAtomic = async ({ lockPath, value }) => {
  const pendingPath = join(dirname(lockPath), `.effect-lock-${randomUUID()}.pending`);
  let pendingHandle;
  try {
    pendingHandle = await open(pendingPath, 'wx', 0o600);
    await pendingHandle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await pendingHandle.sync();
    await pendingHandle.close();
    pendingHandle = null;
    await link(pendingPath, lockPath);
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('blocked_pilot_operation_already_claimed_no_retry');
    throw error;
  } finally {
    await pendingHandle?.close();
    try {
      await unlink(pendingPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
};

const replacePilotEffectLockAtomic = async ({ lockPath, value, label }) => {
  const pendingPath = join(dirname(lockPath), `.effect-lock-${label}-${randomUUID()}.pending`);
  let pendingHandle;
  try {
    pendingHandle = await open(pendingPath, 'wx', 0o600);
    await pendingHandle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await pendingHandle.sync();
    await pendingHandle.close();
    pendingHandle = null;
    await rename(pendingPath, lockPath);
  } finally {
    await pendingHandle?.close();
    try {
      await unlink(pendingPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
};

const runUnderPilotClaimMutex = async ({ lockPath, binding, action }) => {
  const mutexPath = join(dirname(lockPath), 'mission_effect_claim.mutex');
  const mutex = await acquirePilotClaimMutex({ mutexPath, binding });
  let result;
  let actionError = null;
  try {
    result = await action({ mutexPath, mutex });
  } catch (error) {
    actionError = error;
  }
  try {
    await releasePilotClaimMutex({ mutexPath, mutex });
  } catch (error) {
    actionError ??= error;
  }
  if (actionError) throw actionError;
  return result;
};

const pilotReservationStablyMatchesBinding = ({ reservation, binding }) => (
  cleanString(reservation?.schema_version) === 'crm_core_limited_pilot_effect_lock_v1'
  && cleanString(reservation?.mission_id) === PILOT_MISSION_ID
  && cleanString(reservation?.operation_id) === binding.operation_id
  && cleanString(reservation?.identity_anchor_sha256)?.toLowerCase() === binding.identity_anchor_sha256
);

const archiveRetryablePilotReservation = async ({ lockPath, binding }) => {
  let reservation;
  try {
    reservation = await readJson(lockPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw new Error('blocked_pilot_retryable_reservation_invalid');
  }
  if (!pilotReservationStablyMatchesBinding({ reservation, binding })) return false;

  const state = cleanString(reservation?.state);
  const cancelledWithoutNetwork = (
    state === 'cancelled_pre_effect_no_network'
    && reservation?.retry_allowed === true
    && reservation?.effect_attempted === false
    && cleanString(reservation?.pre_effect_claim_token)
    && cleanString(reservation?.cancellation_reason)
    && cleanString(reservation?.cancelled_at)
  );
  const leaseExpiresAtMs = Number(reservation?.pre_effect_lease_expires_at_ms);
  const deadOwnerBeforeNetwork = (
    state === 'pre_effect_claimed'
    && reservation?.retry_allowed === true
    && reservation?.effect_attempted === false
    && cleanString(reservation?.pre_effect_claim_token)
    && Number.isInteger(reservation?.pre_effect_owner_pid)
    && Number.isFinite(leaseExpiresAtMs)
    && cleanString(reservation?.claimed_at)
    && pilotMutexOwnerIsAlive(reservation.pre_effect_owner_pid) === false
  );
  if (!cancelledWithoutNetwork && !deadOwnerBeforeNetwork) return false;

  const archiveDirectory = join(dirname(lockPath), 'cancelled');
  await mkdir(archiveDirectory, { recursive: true, mode: 0o700 });
  await chmod(archiveDirectory, 0o700);
  const archivePath = join(
    archiveDirectory,
    `${binding.operation_id}.${state}.${randomUUID()}.json`,
  );
  try {
    await rename(lockPath, archivePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
  return true;
};

const cancelPilotPreEffectClaim = async ({ lockPath, binding, claim, reason }) => {
  return runUnderPilotClaimMutex({
    lockPath,
    binding,
    action: async ({ mutexPath, mutex }) => {
      let current;
      try {
        current = await readJson(lockPath);
      } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
      }
      if (
        cleanString(current?.state) !== 'pre_effect_claimed'
        || cleanString(current?.operation_id) !== binding.operation_id
        || cleanString(current?.pre_effect_claim_token) !== claim.claimToken
      ) {
        return false;
      }
      await assertPilotClaimMutexOwned({ mutexPath, mutex });
      await replacePilotEffectLockAtomic({
        lockPath,
        label: 'cancelled',
        value: {
          ...current,
          state: 'cancelled_pre_effect_no_network',
          retry_allowed: true,
          effect_attempted: false,
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        },
      });
      return true;
    },
  });
};

const promotePilotPreEffectClaimForNetwork = async ({ lockPath, binding, claim, nowMs }) => {
  return runUnderPilotClaimMutex({
    lockPath,
    binding,
    action: async ({ mutexPath, mutex }) => {
      assertPilotBindingFreshAt(binding, nowMs);
      const current = await readJson(lockPath);
      if (
        cleanString(current?.state) !== 'pre_effect_claimed'
        || cleanString(current?.operation_id) !== binding.operation_id
        || cleanString(current?.pre_effect_claim_token) !== claim.claimToken
        || current?.pre_effect_owner_pid !== process.pid
        || Number(current?.pre_effect_lease_expires_at_ms) <= Date.now()
      ) {
        throw new Error('blocked_pilot_pre_effect_claim_not_promotable');
      }
      await assertPilotClaimMutexOwned({ mutexPath, mutex });
      await replacePilotEffectLockAtomic({
        lockPath,
        label: 'attempting',
        value: {
          ...current,
          state: 'attempting',
          retry_allowed: false,
          effect_attempted: true,
          network_attempt_started_at: new Date(nowMs).toISOString(),
        },
      });
    },
  });
};

const claimPilotOperation = async ({ lockPath, binding, nowMs }) => {
  const lockDirectory = dirname(lockPath);
  const mutexPath = join(lockDirectory, 'mission_effect_claim.mutex');
  await mkdir(lockDirectory, { recursive: true, mode: 0o700 });
  const mutex = await acquirePilotClaimMutex({ mutexPath, binding });
  let claim = null;
  let claimPublished = false;
  let claimError = null;
  try {
    const registryRecord = await readJsonWithDigest(binding.operationRegistryPath);
    if (registryRecord.digest !== binding.operation_registry_sha256) {
      throw new Error('blocked_pilot_operation_registry_changed_before_effect');
    }
    const registryEntry = registryRecord.value?.operations?.[binding.operation_id];
    if (
      registryEntry?.state !== 'prepared'
      || cleanString(registryEntry?.packet_sha256)?.toLowerCase() !== binding.packet_sha256
      || cleanString(registryEntry?.identity_anchor_sha256)?.toLowerCase() !== binding.identity_anchor_sha256
    ) {
      throw new Error('blocked_pilot_registry_binding_changed_before_effect');
    }

    await assertPilotClaimMutexOwned({ mutexPath, mutex });
    await archiveRetryablePilotReservation({ lockPath, binding });
    const locks = await readPilotEffectLocks(lockDirectory);
    if (locks.some((item) => cleanString(item.operation_id) === binding.operation_id)) {
      throw new Error('blocked_pilot_operation_already_claimed_no_retry');
    }
    if (locks.some((item) => cleanString(item.identity_anchor_sha256)?.toLowerCase() === binding.identity_anchor_sha256)) {
      throw new Error('blocked_pilot_identity_already_claimed_no_retrigger');
    }
    if (locks.length >= PILOT_MAX_MAILERLITE_UPSERTS) {
      throw new Error('blocked_pilot_global_mailerlite_upsert_cap_reached');
    }
    assertPilotBindingFreshAt(binding, nowMs);
    await assertPilotClaimMutexOwned({ mutexPath, mutex });
    const leaseNowMs = Date.now();
    claim = {
      claimToken: randomUUID(),
      ownerPid: process.pid,
      leaseExpiresAtMs: leaseNowMs + PILOT_PRE_EFFECT_CLAIM_LEASE_MS,
    };
    await writeNewPilotEffectLockAtomic({
      lockPath,
      value: {
        schema_version: 'crm_core_limited_pilot_effect_lock_v1',
        mission_id: PILOT_MISSION_ID,
        operation_id: binding.operation_id,
        packet_id: binding.packet_id,
        packet_sha256: binding.packet_sha256,
        final_check_private_binding_sha256: binding.private_binding_sha256,
        identity_anchor_sha256: binding.identity_anchor_sha256,
        state: 'pre_effect_claimed',
        retry_allowed: true,
        effect_attempted: false,
        pre_effect_claim_token: claim.claimToken,
        pre_effect_owner_pid: claim.ownerPid,
        pre_effect_lease_expires_at_ms: claim.leaseExpiresAtMs,
        claimed_at: new Date(nowMs).toISOString(),
      },
    });
    claimPublished = true;
  } catch (error) {
    claimError = error;
  }
  try {
    await releasePilotClaimMutex({ mutexPath, mutex });
  } catch (error) {
    claimError ??= error;
  }
  if (claimError) {
    if (claimPublished) {
      await cancelPilotPreEffectClaim({
        lockPath,
        binding,
        claim,
        reason: 'claim_failed_before_network',
      });
    }
    throw claimError;
  }
  return claim;
};

const completePilotOperationLock = async ({ lockPath, binding, claim }) => {
  const current = await readJson(lockPath);
  if (
    cleanString(current?.state) !== 'attempting'
    || cleanString(current?.operation_id) !== binding.operation_id
    || cleanString(current?.packet_sha256)?.toLowerCase() !== binding.packet_sha256
    || cleanString(current?.pre_effect_claim_token) !== claim.claimToken
  ) {
    throw new Error('blocked_pilot_effect_lock_completion_binding_mismatch');
  }
  await replacePilotEffectLockAtomic({
    lockPath,
    label: 'complete',
    value: {
      ...current,
      state: 'completed_known_success',
      retry_allowed: false,
      effect_attempted: true,
      completed_at: new Date().toISOString(),
    },
  });
};

const blocker = (reason, status = 'not_run_final_check_failed') => ({ ok: false, status, reason });
const hasBlockers = (value) => Array.isArray(value) ? value.length > 0 : Boolean(value);
const finalCheckTimestamp = (receipt) => cleanString(firstValue(receipt, ['completed_at', 'checked_at']));

const validateFinalCheckReceipt = (receipt, options = {}) => {
  const validation = validateSharedFinalCheckReadyReceipt(receipt, options);
  if (!validation.ok) return blocker(validation.reason, validation.status);
  return {
    ok: true,
    status: 'passed_fresh_packet_specific_final_check',
    subscriber_lookup_status: validation.subscriber_lookup_status,
    group_assignment_status: validation.group_assignment_status,
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
  const { email, groupReferences, mappedFieldFamilies } = assertPacketReadyForMutation(packet);
  const fields = {};
  for (const family of mappedFieldFamilies) {
    const value = packetFieldValue(packet, family);
    if (value !== null && value !== undefined && value !== '') fields[family] = value;
  }
  return { email, fields, groups: groupReferences };
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
  operationClass,
  groupCount,
  mutationResultStatus,
  blockers,
  recommendedNextStep,
}) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  packet_id: packetId ? 'redacted_private_packet' : 'redacted_private_packet_unavailable',
  packet_binding_status: packetId ? 'private_exact_packet_bound' : 'private_packet_unavailable',
  mutation_attempted: mutationAttempted,
  mutation_executed: mutationExecuted,
  operation_class: operationClass,
  group_count: groupCount,
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
  operation_class: receipt.operation_class,
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

const markdownReceipt = (receipt) => `# MailerLite Exact Onboarding Mutation Guard Receipt\n\n- run_id: ${receipt.run_id}\n- packet_id: ${receipt.packet_id}\n- mutation_attempted: ${receipt.mutation_attempted}\n- mutation_executed: ${receipt.mutation_executed}\n- operation_class: ${receipt.operation_class}\n- group_count: ${receipt.group_count}\n- final_pre_execution_check_status: ${receipt.final_pre_execution_check_status}\n- subscriber_lookup_status: ${receipt.subscriber_lookup_status}\n- group_assignment_status: ${receipt.group_assignment_status}\n- mapped_field_family_count: ${receipt.mapped_field_family_count}\n- mapped_field_families: ${receipt.mapped_field_families.join(', ') || 'none'}\n- omitted_field_family_count: ${receipt.omitted_field_family_count}\n- omitted_field_families: ${receipt.omitted_field_families.join(', ')}\n- mutation_result_status: ${receipt.mutation_result_status}\n- blockers: ${receipt.blockers.length ? receipt.blockers.join(', ') : 'none'}\n- recommended_next_step: ${receipt.recommended_next_step}\n\nClosed gates remain active: ${receipt.closed_gates.join(', ')}.\n`;

const privateMarkdown = (result) => `# MailerLite Exact Onboarding Mutation Private Result\n\n- run_id: ${result.run_id}\n- packet_id: ${result.packet_id}\n- mutation_attempted: ${result.mutation_attempted}\n- mutation_executed: ${result.mutation_executed}\n- mutation_result_status: ${result.mutation_result_status}\n\n${result.private_result_notice}\n`;

const writeOutputs = async ({ paths, receipt, privateResult }) => {
  await writeJson(paths.redactedReceiptJson, receipt);
  await writeText(paths.redactedReceiptMd, markdownReceipt(receipt));
  await writeJson(paths.privateResultJson, privateResult);
  await writeText(paths.privateResultMd, privateMarkdown(privateResult));
};

const compactStdout = (receipt) => ({
  ok: receipt.mutation_executed === true || receipt.mutation_result_status === 'preflight_only_ready_for_exact_mutation_approval',
  mutation_result_status: receipt.mutation_result_status,
  mutation_attempted: receipt.mutation_attempted,
  mutation_executed: receipt.mutation_executed,
  recommended_next_step: receipt.recommended_next_step,
});

const requestUrl = (base, path) => new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
const apiBaseRelativePathFor = (path) => (path === '/api/subscribers' ? '/subscribers' : path);

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
      const response = await fetchImpl(requestUrl(options.apiBase, apiBaseRelativePathFor(path)), {
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

const receiptFrom = ({ runId, packet, finalCheck, payloadShape = null, mutationAttempted, mutationExecuted, mutationResultStatus, blockers, recommendedNextStep }) => {
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
    operationClass: operationClassOf(packet) ?? 'unknown_operation_class',
    groupCount: payloadShape?.group_count ?? 0,
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
      payloadShape,
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

const currentNowMs = (deps = {}) => {
  const value = typeof deps.nowMsProvider === 'function' ? deps.nowMsProvider() : deps.nowMs;
  return Number.isFinite(value) ? value : Date.now();
};

const loadAuthorizedLiveState = async ({ options, paths, deps = {}, preflightOnly = false }) => {
  const nowMs = currentNowMs(deps);
  const packetRecord = await readJsonWithDigest(paths.privatePacketJson);
  const pilotOperation = operationClassOf(packetRecord.value) === PILOT_DUAL_GROUP_OPERATION_CLASS;
  if (!pilotOperation && (!preflightOnly || options.approvalPhrase || options.approvalPhraseFile)) {
    await assertExactApprovalPhrase(options);
  }
  const effectiveMaxAgeMs = pilotOperation
    ? Math.min(options.maxFinalCheckAgeMs, PILOT_FINAL_CHECK_MAX_AGE_MS)
    : options.maxFinalCheckAgeMs;
  const finalCheckReceipt = await readJson(paths.finalCheckRedactedJson);
  const finalCheck = validateFinalCheckReceipt(finalCheckReceipt, { nowMs, maxAgeMs: effectiveMaxAgeMs });
  if (!finalCheck.ok) throw new Error(finalCheck.status);
  const payload = buildExactMutationPayload(packetRecord.value);
  const authorizationBinding = await assertAuthorizationForPacket({
    options,
    paths,
    packetRecord,
    finalCheckReceipt,
    deps: { ...deps, nowMs },
    preflightOnly,
  });
  return {
    packetRecord,
    packet: packetRecord.value,
    finalCheckReceipt,
    finalCheck,
    payload,
    payloadShape: buildRedactedPayloadShape(payload),
    authorizationBinding,
    pilotOperation,
    validatedAtMs: nowMs,
  };
};

const runPreflightOnlyMode = async (options, deps = {}) => {
  const paths = validateLiveOutputPaths(options, { roots: deps.roots });
  const { packet, finalCheck, payloadShape } = await loadAuthorizedLiveState({ options, paths, deps, preflightOnly: true });
  const runId = deps.runId ?? 'crm_core_mailerlite_exact_onboarding_mutation_preflight_only_2026-07-07';
  return receiptFrom({
    runId,
    packet,
    finalCheck,
    payloadShape,
    mutationAttempted: false,
    mutationExecuted: false,
    mutationResultStatus: 'preflight_only_ready_for_exact_mutation_approval',
    blockers: [],
    recommendedNextStep: 'exact_mailerlite_mutation_approval_can_be_requested_after_preflight',
  });
};

const runLiveMode = async (options, deps = {}) => {
  const paths = validateLiveOutputPaths(options, { roots: deps.roots });
  const initialState = await loadAuthorizedLiveState({ options, paths, deps });
  const runId = deps.runId ?? 'crm_core_mailerlite_exact_onboarding_mutation_guard_2026-07-07';

  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) throw new Error('blocked_missing_mailerlite_credential');
  const effectState = initialState.pilotOperation
    ? await loadAuthorizedLiveState({ options, paths, deps })
    : initialState;
  if (effectState.packetRecord.digest !== initialState.packetRecord.digest) {
    throw new Error('blocked_private_packet_changed_before_effect');
  }
  const { packet, finalCheck, payload, payloadShape, authorizationBinding } = effectState;
  const client = deps.exactMutationClient ?? createMailerLiteExactMutationClient({
    options,
    key: credential.key,
    fetchImpl: deps.fetchImpl ?? fetch,
    calls: deps.calls ?? [],
  });
  let pilotClaim = null;
  if (authorizationBinding.lockPath) {
    pilotClaim = await claimPilotOperation({
      lockPath: authorizationBinding.lockPath,
      binding: authorizationBinding,
      nowMs: currentNowMs(deps),
    });
    if (typeof deps.beforePilotPromotion === 'function') await deps.beforePilotPromotion();
    try {
      const preRequestNowMs = currentNowMs(deps);
      await promotePilotPreEffectClaimForNetwork({
        lockPath: authorizationBinding.lockPath,
        binding: authorizationBinding,
        claim: pilotClaim,
        nowMs: preRequestNowMs,
      });
    } catch (error) {
      try {
        await cancelPilotPreEffectClaim({
          lockPath: authorizationBinding.lockPath,
          binding: authorizationBinding,
          claim: pilotClaim,
          reason: 'pre_request_gate_failed_no_network',
        });
      } catch (cancellationError) {
        error.cause ??= cancellationError;
      }
      throw error;
    }
  }
  let mutationResponse;
  try {
    mutationResponse = await executeExactMutation({ client, payload });
  } catch (error) {
    if (authorizationBinding.lockPath) {
      const safeReason = /^mailerlite_(?:unauthenticated|forbidden|rate_limited|network_or_timeout|http_[0-9]+|http_unknown)$/.test(error?.message ?? '')
        ? error.message
        : 'mailerlite_mutation_outcome_unknown';
      const blockedReceipt = receiptFrom({
        runId,
        packet,
        finalCheck,
        payloadShape,
        mutationAttempted: true,
        mutationExecuted: false,
        mutationResultStatus: 'unknown_blocked_no_retry',
        blockers: [safeReason],
        recommendedNextStep: 'stop_terminal_no_retry_preserve_private_state',
      });
      const blockedPrivateResult = buildPrivateResult({
        runId,
        receipt: blockedReceipt,
        privateOutputMode: deps.exactMutationClient ? 'mocked_live_unknown_no_retry' : 'future_live_unknown_no_retry',
        redactedPayloadShape: payloadShape,
        responseStatus: safeReason,
      });
      await writeOutputs({ paths, receipt: blockedReceipt, privateResult: blockedPrivateResult });
    }
    throw error;
  }
  if (authorizationBinding.lockPath) {
    await completePilotOperationLock({
      lockPath: authorizationBinding.lockPath,
      binding: authorizationBinding,
      claim: pilotClaim,
    });
  }

  const receipt = receiptFrom({
    runId,
    packet,
    finalCheck,
    payloadShape,
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
  const receipt = options.preflightOnly
    ? await runPreflightOnlyMode(options, deps)
    : options.fixtureFile
      ? await runFixtureMode(options, deps)
      : await runLiveMode(options, deps);
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
  DEFAULT_API_BASE,
  EXACT_MUTATION_GUARD_STATUS,
  EXACT_ONBOARDING_MUTATION_APPROVAL_CONTRACT_VERSION,
  EXACT_ONBOARDING_MUTATION_APPROVAL_PHRASE,
  FUTURE_EXACT_APPROVAL_PHRASE,
  OMITTED_FIELD_FAMILIES,
  OPERATION_CLASS,
  PILOT_ACTIVE_NEXT_ACTION,
  PILOT_APPROVAL_RECEIPT_CONTRACT_VERSION,
  PILOT_DUAL_GROUP_GUARD_STATUS,
  PILOT_DUAL_GROUP_OPERATION_CLASS,
  PILOT_FINAL_CHECK_MAX_AGE_MS,
  PILOT_MAX_MAILERLITE_UPSERTS,
  PILOT_MISSION_CONTRACT_RELATIVE_PATH,
  PILOT_MISSION_CONTRACT_VERSION,
  PILOT_MISSION_ID,
  PRIVATE_PILOT_ROOT,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  SAFE_MUTATION_CLIENT_CONTRACT,
  SCHEMA_VERSION,
  assertAllowedExactMutationRequest,
  assertApprovedDualGroupEvidence,
  assertPacketReadyForMutation,
  assertPilotAuthorizationAndBinding,
  assertCanonicalPilotApiBase,
  activeNextActionFrom,
  buildExactMutationPayload,
  buildRedactedPayloadShape,
  createMailerLiteExactMutationClient,
  defaultExecutionContextProvider,
  executeExactMutation,
  isInside,
  parseArgs,
  validateExactOnboardingMutationApprovalPhrase,
  run,
  runPreflightOnlyMode,
  validateFinalCheckReceipt,
  validateFixtureOutputPaths,
  validateLiveOutputPaths,
};
