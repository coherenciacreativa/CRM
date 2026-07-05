#!/usr/bin/env node

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APPROVED_PRODUCTION_LOCK_ROOT = '/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay';
const DEFAULT_LOCK_DIR = `${APPROVED_PRODUCTION_LOCK_ROOT}/.relay-lock`;
const LEGACY_CRM_WORKSPACE_ROOT = '/Users/alejandrogomez/CRM';
const TARGET_HOSTS = ['chatgpt.com', 'chat.openai.com'];
const RAW_TARGET_URL_PATTERN = new RegExp(`(${TARGET_HOSTS.map((host) => host.replaceAll('.', '\\.')).join('|')})/c/`, 'i');
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

const buildMetadata = (flags, ownerToken) => {
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
  };

  for (const [key, value] of Object.entries(metadata)) {
    assertMetadataValueSafe(key, value);
  }

  return metadata;
};

const createLock = async (lockDir, flags) => {
  const ownerToken = randomUUID?.() ?? randomBytes(24).toString('hex');
  const metadata = buildMetadata(flags, ownerToken);

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
      const { metadata, ownerToken } = await createLock(lockDir, flags);
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

  throw new Error(`unknown_command:${command ?? 'missing'}`);
};

main().catch((error) => {
  printJson({
    ok: false,
    error: error.message,
    raw_target_url_printed: false,
  }, 1);
});
