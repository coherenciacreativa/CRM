#!/usr/bin/env node

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APPROVED_PRODUCTION_LOCK_ROOT = '/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay';
const DEFAULT_LOCK_DIR = `${APPROVED_PRODUCTION_LOCK_ROOT}/.relay-lock`;
const DEFAULT_TARGET_REGISTRY_PATH = '/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json';
const DEFAULT_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH = '/Users/alejandrogomez/Documents/CRM-Core-Reports/chief-architect-bootstrap/crm_core_chief_architect_project_bootstrap_v1_2026-07-11.json';
const DEFAULT_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH = '/Users/alejandrogomez/Documents/CRM-Core-Reports/chief-architect-bootstrap/crm_core_chief_architect_route_rebind_v1_2026-07-13.json';
const LEGACY_CRM_WORKSPACE_ROOT = '/Users/alejandrogomez/CRM';
const TARGET_HOSTS = ['chatgpt.com', 'chat.openai.com'];
const RAW_TARGET_URL_PATTERN = new RegExp(`(?:https?://)?(?:${TARGET_HOSTS.map((host) => host.replaceAll('.', '\\.')).join('|')})/(?:[^\\s/?#]+/)*c/`, 'i');
const CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME = 'CRM Core — Chief Architect';
const CANONICAL_CHIEF_ARCHITECT_CHAT_LABEL = '00 — North Star & Portfolio';
const CHIEF_ARCHITECT_CONSULTANT_IDS = new Set(['chief-architect-integration']);
const CHIEF_ARCHITECT_BOOTSTRAP_NOT_BEFORE = Date.parse('2026-07-11T00:00:00.000Z');
const CHIEF_ARCHITECT_UI_OBSERVATION_MAX_AGE_MS = 10 * 60 * 1000;
const CHIEF_ARCHITECT_BOOTSTRAP_SPEC_PATH = 'docs/crm-vnext/crm-core-chief-architect-project-bootstrap-v1.md';
const EMAIL_LIKE_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
const FORBIDDEN_METADATA_PATTERNS = [
  RAW_TARGET_URL_PATTERN,
  /Mantis-Reports/i,
  /Mantis-Private-Source-Artifacts/i,
  /CRM-Core-Private-Artifacts/i,
  EMAIL_LIKE_PATTERN,
];
const PRIVATE_OR_LAUNCH_FRAGMENT_PATTERN = /openclaw|launch os|launch-os/i;
const OUTPUT_METADATA_FIELDS = [
  'lock_version',
  'owner_id',
  'branch',
  'worktree',
  'packet_id',
  'consultant_id',
  'critical_section',
  'acquired_at',
  'expires_at',
  'raw_target_url_printed',
  'chief_architect_route_preflight_passed',
  'canonical_project_match',
  'ui_observation_fresh',
  'chief_architect_static_route_preflight_passed',
  'chief_architect_route_preflight_scope',
  'target_id',
];
const REDACTED_UNSAFE_METADATA = '[redacted_unsafe_metadata]';
const CRITICAL_SECTIONS = new Set([
  'target_registry_update',
  'direct_target_open',
  'handshake_send',
  'handshake_capture',
  'send_packet',
  'capture_reply',
  'reformat_request',
  'receipt_capture',
  'other_consultant_relay_critical_section',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readStdin = async () => {
  let value = '';
  for await (const chunk of process.stdin) value += chunk;
  return value;
};

const hashToken = (token) => `sha256:${createHash('sha256').update(token).digest('hex')}`;

const printJson = (payload, exitCode = 0) => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
};

const parseArgs = (argv) => {
  const [command, ...rest] = argv.slice(2);
  const flags = new Map();

  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith('--')) {
      throw new Error(`unexpected_positional_arg:${key}`);
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing_value:${key}`);
    }
    flags.set(key.slice(2), value);
    index += 1;
  }

  return { command, flags, rawValues: rest };
};

const flag = (flags, name, fallback = undefined) => flags.get(name) ?? fallback;

const requiredFlag = (flags, name) => {
  const value = flag(flags, name);
  if (!value) throw new Error(`missing_required_arg:${name}`);
  return value;
};

const numberFlag = (flags, name, fallback) => {
  const raw = flag(flags, name, String(fallback));
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`invalid_number_arg:${name}`);
  }
  return value;
};

const trueFlag = (flags, name) => requiredFlag(flags, name) === 'true';

const chiefArchitectUiObservationMaxAgeMs = () => {
  if (process.env.NODE_ENV === 'test' && process.env.CRM_CORE_CHIEF_ARCHITECT_UI_OBSERVATION_MAX_AGE_MS) {
    const value = Number(process.env.CRM_CORE_CHIEF_ARCHITECT_UI_OBSERVATION_MAX_AGE_MS);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return CHIEF_ARCHITECT_UI_OBSERVATION_MAX_AGE_MS;
};

const targetRegistryPath = () => {
  if (process.env.NODE_ENV === 'test' && process.env.CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH) {
    return path.resolve(process.env.CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH);
  }
  return DEFAULT_TARGET_REGISTRY_PATH;
};

const chiefArchitectBootstrapReceiptPath = () => {
  if (process.env.NODE_ENV === 'test' && process.env.CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH) {
    return path.resolve(process.env.CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH);
  }
  return DEFAULT_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH;
};

const chiefArchitectRouteReceiptPath = () => {
  if (process.env.NODE_ENV === 'test' && process.env.CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH) {
    return path.resolve(process.env.CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH);
  }
  return DEFAULT_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH;
};

const canonicalInstructionsHash = async () => {
  const raw = await readFile(path.resolve(process.cwd(), CHIEF_ARCHITECT_BOOTSTRAP_SPEC_PATH), 'utf8');
  const match = raw.match(/## Canonical project instructions[\s\S]*?```text\n([\s\S]*?)\n```/);
  if (!match?.[1]) throw new Error('chief_architect_canonical_instructions_missing');
  return hashToken(match[1]);
};

const parseCanonicalProjectTarget = (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    throw new Error('chief_architect_target_url_invalid');
  }

  if (parsed.protocol !== 'https:' || !TARGET_HOSTS.includes(parsed.hostname)) {
    throw new Error('chief_architect_target_host_invalid');
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 4 || segments[0] !== 'g' || segments[2] !== 'c') {
    throw new Error('chief_architect_target_not_project_chat');
  }

  const projectIdMatch = segments[1].match(/^(g-p-[a-f0-9]{32})(?:-|$)/i);
  if (!projectIdMatch) throw new Error('chief_architect_project_route_invalid');

  return {
    projectRouteHash: hashToken(projectIdMatch[1].toLowerCase()),
    chatRouteHash: hashToken(segments[3]),
  };
};

const registryTarget = (registry, targetId) => {
  if (Array.isArray(registry?.targets)) {
    return registry.targets.find((target) => target?.target_id === targetId || target?.id === targetId) ?? null;
  }
  if (registry?.targets && typeof registry.targets === 'object' && !Array.isArray(registry.targets)) {
    const target = registry.targets[targetId];
    return target && typeof target === 'object' ? target : null;
  }
  return null;
};

const readJson = async (filePath, errorCode) => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    throw new Error(errorCode);
  }
};

const assertOwnerOnly = async (filePath) => {
  let fileStats;
  let directoryStats;
  try {
    fileStats = await stat(filePath);
    directoryStats = await stat(path.dirname(filePath));
  } catch {
    throw new Error('chief_architect_registry_missing');
  }

  if (!fileStats.isFile() || (fileStats.mode & 0o077) !== 0) {
    throw new Error('chief_architect_registry_not_owner_only');
  }
  if (!directoryStats.isDirectory() || (directoryStats.mode & 0o077) !== 0) {
    throw new Error('chief_architect_registry_directory_not_owner_only');
  }
};

const assertFreshUiObservation = (flags) => {
  if (requiredFlag(flags, 'observed-project-name') !== CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME) {
    throw new Error('chief_architect_observed_project_mismatch');
  }
  if (!trueFlag(flags, 'observed-project-only-memory')) {
    throw new Error('chief_architect_project_only_memory_not_observed');
  }
  if (!trueFlag(flags, 'observed-private-unshared')) {
    throw new Error('chief_architect_private_unshared_not_observed');
  }
  if (!trueFlag(flags, 'observed-instructions-match')) {
    throw new Error('chief_architect_instructions_not_observed');
  }
  if (!trueFlag(flags, 'observed-chat-project-bound')) {
    throw new Error('chief_architect_chat_project_binding_not_observed');
  }
  if (requiredFlag(flags, 'observed-chat-label') !== CANONICAL_CHIEF_ARCHITECT_CHAT_LABEL) {
    throw new Error('chief_architect_observed_chat_mismatch');
  }

  const observedAt = Date.parse(requiredFlag(flags, 'ui-observed-at'));
  const age = Date.now() - observedAt;
  if (!Number.isFinite(observedAt) || age < -30_000 || age > chiefArchitectUiObservationMaxAgeMs()) {
    throw new Error('chief_architect_ui_observation_stale');
  }

  const projectRouteHash = requiredFlag(flags, 'observed-project-route-sha256');
  const chatRouteHash = requiredFlag(flags, 'observed-chat-route-sha256');
  const hashPattern = /^sha256:[a-f0-9]{64}$/;
  if (!hashPattern.test(projectRouteHash) || !hashPattern.test(chatRouteHash)) {
    throw new Error('chief_architect_observed_route_fingerprint_invalid');
  }

  return { observedAt, projectRouteHash, chatRouteHash };
};

const chiefArchitectRoutePreflight = async (flags) => {
  const consultantId = requiredFlag(flags, 'consultant-id');
  if (!CHIEF_ARCHITECT_CONSULTANT_IDS.has(consultantId)) return null;

  const criticalSection = requiredFlag(flags, 'critical-section');
  const requiresUiObservation = criticalSection !== 'direct_target_open';
  const uiObservation = requiresUiObservation ? assertFreshUiObservation(flags) : null;
  const registryPath = targetRegistryPath();
  await assertOwnerOnly(registryPath);
  const registry = await readJson(registryPath, 'chief_architect_registry_unreadable');
  const target = registryTarget(registry, consultantId);
  if (!target) throw new Error('chief_architect_target_missing');
  if (target.expected_consultant_id !== consultantId) throw new Error('chief_architect_consultant_id_mismatch');
  if (target.target_chat_label !== CANONICAL_CHIEF_ARCHITECT_CHAT_LABEL) {
    throw new Error('chief_architect_registry_chat_mismatch');
  }
  if (target.target_url_secret !== true) throw new Error('chief_architect_target_url_not_secret');
  if (target.canonical_project_name !== CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME) {
    throw new Error('chief_architect_registry_project_mismatch');
  }
  if (target.project_only_memory !== true) throw new Error('chief_architect_registry_project_only_missing');
  if (target.private_unshared !== true) throw new Error('chief_architect_registry_private_unshared_missing');
  if (target.legacy_project_used !== false) throw new Error('chief_architect_legacy_project_route_rejected');
  if (target.bootstrap_receipt_green !== true) throw new Error('chief_architect_bootstrap_receipt_not_green');
  if (target.sources_count !== 13) throw new Error('chief_architect_source_count_mismatch');
  if (target.required_chats_verified !== true) throw new Error('chief_architect_required_chats_not_verified');

  const bindingVerifiedAt = Date.parse(target.project_binding_verified_at);
  if (!Number.isFinite(bindingVerifiedAt) || bindingVerifiedAt < CHIEF_ARCHITECT_BOOTSTRAP_NOT_BEFORE) {
    throw new Error('chief_architect_project_binding_stale');
  }

  const parsedTarget = parseCanonicalProjectTarget(target.target_url);
  if (parsedTarget.projectRouteHash !== target.canonical_project_route_sha256) {
    throw new Error('chief_architect_project_route_fingerprint_mismatch');
  }
  if (parsedTarget.chatRouteHash !== target.canonical_chat_route_sha256) {
    throw new Error('chief_architect_chat_route_fingerprint_mismatch');
  }
  if (uiObservation && uiObservation.projectRouteHash !== target.canonical_project_route_sha256) {
    throw new Error('chief_architect_observed_project_route_mismatch');
  }
  if (uiObservation && uiObservation.chatRouteHash !== target.canonical_chat_route_sha256) {
    throw new Error('chief_architect_observed_chat_route_mismatch');
  }
  if (target.project_instructions_sha256 !== await canonicalInstructionsHash()) {
    throw new Error('chief_architect_project_instructions_fingerprint_mismatch');
  }

  const staticResult = {
    chief_architect_static_route_preflight_passed: true,
    canonical_project_match: true,
    chief_architect_route_preflight_scope: requiresUiObservation
      ? 'dynamic_post_open'
      : 'static_open_only',
  };
  return requiresUiObservation
    ? {
        ...staticResult,
        chief_architect_route_preflight_passed: true,
        ui_observation_fresh: true,
      }
    : staticResult;
};

const assertNoRawTargetUrl = (label, value) => {
  if (RAW_TARGET_URL_PATTERN.test(String(value))) {
    throw new Error(`raw_target_url_rejected:${label}`);
  }
};

const assertMetadataValueSafe = (label, value) => {
  const text = String(value);
  for (const pattern of FORBIDDEN_METADATA_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`unsafe_lock_metadata_rejected:${label}`);
    }
  }
};

const assertAllArgValuesSafe = (values) => {
  for (const value of values) {
    assertNoRawTargetUrl('argument', value);
  }
};

const isUnsafeMetadataValue = (value) => {
  try {
    const text = String(value);
    return FORBIDDEN_METADATA_PATTERNS.some((pattern) => pattern.test(text));
  } catch {
    return true;
  }
};

const redactMetadataValueForOutput = (value) => {
  if (typeof value === 'string') {
    return isUnsafeMetadataValue(value) ? REDACTED_UNSAFE_METADATA : value;
  }
  return value;
};

const sanitizeMetadataForOutput = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const output = {};
  let unsafeRedacted = false;

  for (const field of OUTPUT_METADATA_FIELDS) {
    if (!Object.hasOwn(metadata, field)) continue;
    const value = redactMetadataValueForOutput(metadata[field]);
    if (value === REDACTED_UNSAFE_METADATA) unsafeRedacted = true;
    output[field] = value;
  }

  output.owner_token_hash_present = Boolean(metadata.owner_token_hash);
  output.metadata_redaction_status = unsafeRedacted ? 'unsafe_metadata_redacted' : 'safe';

  return output;
};

const isInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const approvedProductionLockRoot = () => {
  if (process.env.NODE_ENV === 'test' && process.env.CRM_CORE_CONSULTANT_RELAY_APPROVED_ROOT) {
    return path.resolve(process.env.CRM_CORE_CONSULTANT_RELAY_APPROVED_ROOT);
  }
  return path.resolve(APPROVED_PRODUCTION_LOCK_ROOT);
};

const assertLockDirPathSafe = (requested, lockDir) => {
  const text = `${requested}\n${lockDir}`;
  assertNoRawTargetUrl('lock_dir', text);

  if (EMAIL_LIKE_PATTERN.test(text)) {
    throw new Error('lock_dir_email_like_value_rejected');
  }

  if (/Mantis-Reports/i.test(text)) {
    throw new Error('lock_dir_mantis_reports_rejected');
  }

  if (/Mantis-Private-Source-Artifacts/i.test(text)) {
    throw new Error('lock_dir_mantis_private_rejected');
  }

  if (/CRM-Core-Private-Artifacts/i.test(text)) {
    throw new Error('lock_dir_crm_core_private_rejected');
  }

  if (isInside(path.resolve(LEGACY_CRM_WORKSPACE_ROOT), lockDir)) {
    throw new Error('lock_dir_legacy_crm_workspace_rejected');
  }

  if (PRIVATE_OR_LAUNCH_FRAGMENT_PATTERN.test(text)) {
    throw new Error('lock_dir_private_or_launch_fragment_rejected');
  }
};

const resolveLockDir = (flags) => {
  const requested = flag(flags, 'lock-dir') ?? process.env.CRM_CORE_CONSULTANT_RELAY_LOCK_DIR ?? DEFAULT_LOCK_DIR;
  const lockDir = path.resolve(requested);
  const repoRoot = path.resolve(process.cwd());
  const testMode = process.env.NODE_ENV === 'test';
  const enforceApprovedRoot = testMode && process.env.CRM_CORE_CONSULTANT_RELAY_ENFORCE_APPROVED_ROOT === '1';

  assertLockDirPathSafe(requested, lockDir);

  if (isInside(repoRoot, lockDir)) {
    throw new Error('lock_dir_inside_repo_rejected');
  }

  if (testMode && !isInside(path.resolve(tmpdir()), lockDir)) {
    throw new Error('test_lock_dir_must_be_under_tmp');
  }

  if (testMode && !enforceApprovedRoot) {
    return lockDir;
  }

  const approvedRoot = approvedProductionLockRoot();
  assertLockDirPathSafe(approvedRoot, approvedRoot);

  if (testMode && !isInside(path.resolve(tmpdir()), approvedRoot)) {
    throw new Error('test_approved_root_must_be_under_tmp');
  }

  if (lockDir === approvedRoot || !isInside(approvedRoot, lockDir)) {
    throw new Error('lock_dir_outside_approved_crm_core_reports_rejected');
  }

  return lockDir;
};

const lockPath = (lockDir) => path.join(lockDir, 'lock.json');

const isMissing = (error) => error && error.code === 'ENOENT';

const readLockMetadata = async (lockDir) => {
  try {
    const raw = await readFile(lockPath(lockDir), 'utf8');
    const metadata = JSON.parse(raw);
    return { exists: true, metadata, metadata_readable: true };
  } catch (error) {
    if (isMissing(error)) {
      try {
        await stat(lockDir);
        return { exists: true, metadata: null, metadata_readable: false };
      } catch (statError) {
        if (isMissing(statError)) {
          return { exists: false, metadata: null, metadata_readable: false };
        }
        throw statError;
      }
    }
    return { exists: true, metadata: null, metadata_readable: false };
  }
};

const isStale = (metadata) => {
  if (!metadata?.expires_at) return false;
  const expiresAt = Date.parse(metadata.expires_at);
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
};

const statusPayload = async (lockDir) => {
  const lock = await readLockMetadata(lockDir);
  const stale = lock.exists ? isStale(lock.metadata) : false;
  return {
    ok: true,
    locked: lock.exists,
    lock_dir: lockDir,
    stale,
    metadata_readable: lock.metadata_readable,
    metadata: sanitizeMetadataForOutput(lock.metadata),
    raw_target_url_printed: false,
  };
};

const buildMetadata = (flags, ownerToken, routePreflight = null) => {
  const criticalSection = requiredFlag(flags, 'critical-section');
  if (!CRITICAL_SECTIONS.has(criticalSection)) {
    throw new Error(`unknown_critical_section:${criticalSection}`);
  }

  const ttlMs = numberFlag(flags, 'ttl-ms', 300000);
  if (ttlMs <= 0) throw new Error('invalid_number_arg:ttl-ms');

  const acquiredAtMs = Date.now();
  const metadata = {
    lock_version: 'v0',
    owner_id: requiredFlag(flags, 'owner-id'),
    branch: requiredFlag(flags, 'branch'),
    worktree: requiredFlag(flags, 'worktree'),
    packet_id: requiredFlag(flags, 'packet-id'),
    consultant_id: requiredFlag(flags, 'consultant-id'),
    critical_section: criticalSection,
    acquired_at: new Date(acquiredAtMs).toISOString(),
    expires_at: new Date(acquiredAtMs + ttlMs).toISOString(),
    owner_token_hash: hashToken(ownerToken),
    raw_target_url_printed: false,
    ...(routePreflight ?? {}),
  };
  const targetId = flag(flags, 'target-id');
  if (targetId) metadata.target_id = targetId;

  for (const [key, value] of Object.entries(metadata)) {
    assertMetadataValueSafe(key, value);
  }

  return metadata;
};

const createLock = async (lockDir, flags, routePreflight = null) => {
  const ownerToken = randomUUID?.() ?? randomBytes(24).toString('hex');
  const metadata = buildMetadata(flags, ownerToken, routePreflight);

  await mkdir(path.dirname(lockDir), { recursive: true });
  await mkdir(lockDir);
  try {
    await writeFile(lockPath(lockDir), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
  } catch (error) {
    await rm(lockDir, { recursive: true, force: true });
    throw error;
  }

  return { metadata, ownerToken };
};

const acquire = async (lockDir, flags) => {
  const waitMs = numberFlag(flags, 'wait-ms', 0);
  const pollMs = Math.max(numberFlag(flags, 'poll-ms', 1000), 10);
  const deadline = Date.now() + waitMs;

  while (true) {
    try {
      const routePreflight = await chiefArchitectRoutePreflight(flags);
      const { metadata, ownerToken } = await createLock(lockDir, flags, routePreflight);
      printJson({
        ok: true,
        acquired: true,
        lock_dir: lockDir,
        owner_id: metadata.owner_id,
        packet_id: metadata.packet_id,
        consultant_id: metadata.consultant_id,
        critical_section: metadata.critical_section,
        expires_at: metadata.expires_at,
        owner_token: ownerToken,
        raw_target_url_printed: false,
        ...(routePreflight ?? {}),
      });
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;

      const payload = await statusPayload(lockDir);
      if (payload.stale || waitMs === 0 || Date.now() >= deadline) {
        printJson({
          ...payload,
          ok: false,
          acquired: false,
          reason: payload.stale ? 'lock_stale_not_broken' : 'lock_held',
        }, 1);
        return;
      }

      await sleep(Math.min(pollMs, Math.max(deadline - Date.now(), 0)));
    }
  }
};

const release = async (lockDir, flags) => {
  const ownerToken = flag(flags, 'owner-token') ?? process.env.CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN;
  if (!ownerToken) throw new Error('missing_required_arg:owner-token');
  assertNoRawTargetUrl('owner_token', ownerToken);

  const lock = await readLockMetadata(lockDir);
  if (!lock.exists || !lock.metadata_readable || !lock.metadata?.owner_token_hash) {
    printJson({
      ok: false,
      released: false,
      reason: 'lock_missing_or_unreadable',
      lock_dir: lockDir,
      raw_target_url_printed: false,
    }, 1);
    return;
  }

  if (hashToken(ownerToken) !== lock.metadata.owner_token_hash) {
    printJson({
      ok: false,
      released: false,
      reason: 'owner_token_mismatch',
      lock_dir: lockDir,
      locked: true,
      raw_target_url_printed: false,
    }, 1);
    return;
  }

  await rm(lockPath(lockDir), { force: true });
  await rmdir(lockDir);
  printJson({
    ok: true,
    released: true,
    lock_dir: lockDir,
    raw_target_url_printed: false,
  });
};

const writeJsonAtomically = async (filePath, payload, mode = 0o600) => {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporaryPath = `${filePath}.tmp-${randomUUID?.() ?? randomBytes(12).toString('hex')}`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, { mode, flag: 'wx' });
  await rename(temporaryPath, filePath);
  await chmod(filePath, mode);
};

const assertRegistryUpdateLockOwner = async (lockDir, flags, targetId) => {
  const ownerToken = process.env.CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN;
  if (!ownerToken) throw new Error('missing_required_env:CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN');
  assertNoRawTargetUrl('owner_token', ownerToken);

  const lock = await readLockMetadata(lockDir);
  if (!lock.exists || !lock.metadata_readable || !lock.metadata?.owner_token_hash) {
    throw new Error('target_registry_update_lock_missing_or_unreadable');
  }
  if (hashToken(ownerToken) !== lock.metadata.owner_token_hash) {
    throw new Error('target_registry_update_lock_owner_mismatch');
  }
  if (isStale(lock.metadata)) {
    throw new Error('target_registry_update_lock_stale');
  }
  if (lock.metadata.critical_section !== 'target_registry_update') {
    throw new Error('target_registry_update_wrong_critical_section');
  }
  if (lock.metadata.owner_id !== requiredFlag(flags, 'expected-lock-owner-id')) {
    throw new Error('target_registry_update_owner_id_mismatch');
  }
  if (lock.metadata.consultant_id !== requiredFlag(flags, 'expected-lock-consultant-id')) {
    throw new Error('target_registry_update_consultant_id_mismatch');
  }
  if (lock.metadata.packet_id !== requiredFlag(flags, 'expected-lock-packet-id')) {
    throw new Error('target_registry_update_packet_id_mismatch');
  }
  if (lock.metadata.branch !== requiredFlag(flags, 'expected-lock-branch')) {
    throw new Error('target_registry_update_branch_mismatch');
  }
  if (lock.metadata.worktree !== path.resolve(process.cwd())) {
    throw new Error('target_registry_update_worktree_mismatch');
  }
  if (lock.metadata.target_id !== targetId) {
    throw new Error('target_registry_update_target_id_mismatch');
  }
};

const validateBootstrapReceipt = async () => {
  const receipt = await readJson(
    chiefArchitectBootstrapReceiptPath(),
    'chief_architect_bootstrap_receipt_unreadable',
  );
  const expectedChats = [
    '00 — North Star & Portfolio',
    '01 — Operating Model & Mission Templates',
    '02 — Architecture Exceptions',
    'Mission — Active Trigger Correction & First Email Proof — 2026-07-11',
  ];
  const chats = Array.isArray(receipt.chat_labels) ? receipt.chat_labels : [];
  const blockers = Array.isArray(receipt.blockers) ? receipt.blockers : ['invalid'];
  const green = receipt.project_created === true
    && receipt.project_name === CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME
    && receipt.project_memory_mode === 'project_only'
    && receipt.project_private === true
    && receipt.files_uploaded_count === 13
    && expectedChats.every((chat) => chats.includes(chat))
    && receipt.legacy_crm_used === false
    && blockers.length === 0;
  if (!green) throw new Error('chief_architect_bootstrap_receipt_not_green');
};

const registerChiefArchitectTarget = async (lockDir, flags) => {
  if (requiredFlag(flags, 'target-url-stdin') !== 'true') {
    throw new Error('chief_architect_target_url_must_use_stdin');
  }
  const targetId = requiredFlag(flags, 'target-id');
  if (!CHIEF_ARCHITECT_CONSULTANT_IDS.has(targetId)) {
    throw new Error('chief_architect_target_id_not_allowed');
  }
  await assertRegistryUpdateLockOwner(lockDir, flags, targetId);
  if (requiredFlag(flags, 'target-chat-label') !== CANONICAL_CHIEF_ARCHITECT_CHAT_LABEL) {
    throw new Error('chief_architect_target_chat_label_not_allowed');
  }

  assertFreshUiObservation(flags);
  if (!trueFlag(flags, 'observed-required-chats')) {
    throw new Error('chief_architect_required_chats_not_observed');
  }
  if (numberFlag(flags, 'observed-sources-count', 0) !== 13) {
    throw new Error('chief_architect_source_count_mismatch');
  }
  await validateBootstrapReceipt();

  const targetUrl = (await readStdin()).trim();
  const uiObservation = assertFreshUiObservation(flags);
  const observedAt = uiObservation.observedAt;
  const parsedTarget = parseCanonicalProjectTarget(targetUrl);
  if (uiObservation.projectRouteHash !== parsedTarget.projectRouteHash) {
    throw new Error('chief_architect_observed_project_route_mismatch');
  }
  if (uiObservation.chatRouteHash !== parsedTarget.chatRouteHash) {
    throw new Error('chief_architect_observed_chat_route_mismatch');
  }
  const instructionsHash = await canonicalInstructionsHash();
  const registryPath = targetRegistryPath();
  const registry = await readJson(registryPath, 'chief_architect_registry_unreadable');
  if (!registry.targets || typeof registry.targets !== 'object' || Array.isArray(registry.targets)) {
    throw new Error('chief_architect_registry_shape_invalid');
  }

  const existing = registry.targets[targetId] && typeof registry.targets[targetId] === 'object'
    ? registry.targets[targetId]
    : {};
  const verifiedAt = new Date(observedAt).toISOString();
  const updatedRegistry = {
    ...registry,
    updated_at: verifiedAt,
    targets: {
      ...registry.targets,
      [targetId]: {
        ...existing,
        target_id: targetId,
        expected_consultant_id: targetId,
        target_chat_label: requiredFlag(flags, 'target-chat-label'),
        target_url: targetUrl,
        target_url_secret: true,
        canonical_project_name: CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME,
        canonical_project_route_sha256: parsedTarget.projectRouteHash,
        canonical_chat_route_sha256: parsedTarget.chatRouteHash,
        project_only_memory: true,
        private_unshared: true,
        project_instructions_sha256: instructionsHash,
        sources_count: 13,
        required_chats_verified: true,
        bootstrap_receipt_green: true,
        legacy_project_used: false,
        project_binding_verified_at: verifiedAt,
        project_binding_verification_method: 'live_chrome_ui_exact_project_and_chat',
        confirmation_method: 'canonical_project_binding_then_required_handshake',
        last_handshake_status: 'pending_canonical_handshake',
        last_confirmed_at: null,
        last_confirmed_packet_id: null,
        source: 'canonical_chief_architect_project_rebind_v1',
        updated_at: verifiedAt,
        raw_target_url_printed: false,
      },
    },
  };

  await writeJsonAtomically(registryPath, updatedRegistry, 0o600);
  if (registryPath === DEFAULT_TARGET_REGISTRY_PATH) {
    await chmod(path.dirname(path.dirname(registryPath)), 0o700);
  }

  const routeReceipt = {
    schema_version: 'crm_core_chief_architect_route_rebind_receipt_v1',
    target_id: targetId,
    canonical_project_name: CANONICAL_CHIEF_ARCHITECT_PROJECT_NAME,
    target_registry_rebound: true,
    project_only_memory: true,
    private_unshared: true,
    instructions_match: true,
    sources_count: 13,
    required_chats_verified: true,
    legacy_project_used: false,
    registry_owner_only: true,
    ui_observed_at: verifiedAt,
    transport: {
      full_prompt_prepared_before_ui: true,
      single_paste_required: true,
      send_button_required: true,
      enter_send_forbidden: true,
      copy_response_button_required: true,
      clipboard_replacement_verification_required: true,
    },
    raw_target_url_printed: false,
  };
  await writeJsonAtomically(chiefArchitectRouteReceiptPath(), routeReceipt, 0o600);

  printJson({
    ok: true,
    target_id: targetId,
    canonical_project_match: true,
    target_registry_rebound: true,
    registry_owner_only: true,
    route_receipt_written: true,
    legacy_project_used: false,
    raw_target_url_printed: false,
  });
};

const main = async () => {
  const { command, flags, rawValues } = parseArgs(process.argv);
  assertAllArgValuesSafe(rawValues);
  const lockDir = resolveLockDir(flags);

  if (command === 'acquire') {
    await acquire(lockDir, flags);
    return;
  }

  if (command === 'release') {
    await release(lockDir, flags);
    return;
  }

  if (command === 'status') {
    printJson(await statusPayload(lockDir));
    return;
  }

  if (command === 'register-chief-architect-target') {
    await registerChiefArchitectTarget(lockDir, flags);
    return;
  }

  throw new Error(`unknown_command:${command ?? 'missing'}`);
};

main().catch((error) => {
  printJson({
    ok: false,
    error: error.message,
    raw_target_url_printed: false,
  }, 1);
});
