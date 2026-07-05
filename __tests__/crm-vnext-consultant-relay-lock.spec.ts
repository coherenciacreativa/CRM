import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const script = 'scripts/crm-vnext-consultant-relay-lock.mjs';
const tmpRoots: string[] = [];
const rawTargetUrlSample = ['https://chatgpt.com', 'c', 'synthetic-private-target'].join('/');
const rawTargetUrlPatternLabel = ['chatgpt.com', 'c', ''].join('/');
const legacyRawTargetUrlPatternLabel = ['chat.openai.com', 'c', ''].join('/');
const unsafeEmailValue = 'unsafe-lock@example.test';
const fakeOwnerTokenHash = `sha256:${'a'.repeat(64)}`;

const makeTmpRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-core-relay-lock-'));
  tmpRoots.push(root);
  return root;
};

const lockDirFor = async () => join(await makeTmpRoot(), '.relay-lock');

const baseAcquireArgs = (lockDir: string, overrides: string[] = []) => [
  script,
  'acquire',
  '--lock-dir',
  lockDir,
  '--owner-id',
  'welcome-audio-send-boundary',
  '--branch',
  'codex/crm-core-welcome-audio',
  '--worktree',
  '/Users/alejandrogomez/CRM-core-welcome-audio',
  '--packet-id',
  'crm_core_ui_relay_example_packet',
  '--consultant-id',
  'welcome-audio-send-boundary',
  '--critical-section',
  'send_packet',
  '--ttl-ms',
  '300000',
  ...overrides,
];

const runCli = async (args: string[], env: Record<string, string | undefined> = {}) => {
  const result = await execFileAsync('node', args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...env,
    },
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    json: JSON.parse(result.stdout),
  };
};

const runCliFail = async (args: string[], env: Record<string, string | undefined> = {}) => {
  try {
    await runCli(args, env);
    throw new Error('expected_cli_failure');
  } catch (error: any) {
    if (error.message === 'expected_cli_failure') throw error;
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      json: JSON.parse(error.stdout),
    };
  }
};

const runCliProductionFail = async (args: string[]) => runCliFail(args, { NODE_ENV: 'production' });

const readLock = async (lockDir: string) => JSON.parse(await readFile(join(lockDir, 'lock.json'), 'utf8'));

const createUnsafeExistingLock = async () => {
  const lockDir = await lockDirFor();
  await mkdir(lockDir, { recursive: true });
  await writeFile(join(lockDir, 'lock.json'), `${JSON.stringify({
    lock_version: 'v0',
    owner_id: rawTargetUrlSample,
    branch: 'codex/crm-core-welcome-audio',
    worktree: '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/synthetic',
    packet_id: unsafeEmailValue,
    consultant_id: 'welcome-audio-send-boundary',
    critical_section: 'send_packet',
    acquired_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 300000).toISOString(),
    raw_target_url_printed: false,
    owner_token_hash: fakeOwnerTokenHash,
    target_url: rawTargetUrlSample,
  }, null, 2)}\n`);
  return lockDir;
};

afterEach(async () => {
  await Promise.all(tmpRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('crm-vnext Consultant Relay Lock utility', () => {
  test('acquire creates lock directory and redacted lock.json', async () => {
    const lockDir = await lockDirFor();
    const { json, stderr } = await runCli(baseAcquireArgs(lockDir));
    const metadata = await readLock(lockDir);

    expect(stderr).toBe('');
    expect(json).toMatchObject({
      ok: true,
      acquired: true,
      lock_dir: lockDir,
      owner_id: 'welcome-audio-send-boundary',
      packet_id: 'crm_core_ui_relay_example_packet',
      consultant_id: 'welcome-audio-send-boundary',
      critical_section: 'send_packet',
      raw_target_url_printed: false,
    });
    expect(typeof json.owner_token).toBe('string');
    expect(json.owner_token.length).toBeGreaterThan(20);
    expect(metadata).toMatchObject({
      lock_version: 'v0',
      owner_id: 'welcome-audio-send-boundary',
      branch: 'codex/crm-core-welcome-audio',
      worktree: '/Users/alejandrogomez/CRM-core-welcome-audio',
      packet_id: 'crm_core_ui_relay_example_packet',
      consultant_id: 'welcome-audio-send-boundary',
      critical_section: 'send_packet',
      raw_target_url_printed: false,
    });
    expect(metadata.owner_token).toBeUndefined();
    expect(metadata.owner_token_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test('acquire stdout includes owner_token but lock.json stores only owner_token_hash', async () => {
    const lockDir = await lockDirFor();
    const { json } = await runCli(baseAcquireArgs(lockDir));
    const serializedMetadata = await readFile(join(lockDir, 'lock.json'), 'utf8');

    expect(json.owner_token).toBeTruthy();
    expect(serializedMetadata).toContain('owner_token_hash');
    expect(serializedMetadata).not.toContain(json.owner_token);
    expect(serializedMetadata).not.toContain('owner_token\"');
  });

  test('second acquire fails while lock is held', async () => {
    const lockDir = await lockDirFor();
    await runCli(baseAcquireArgs(lockDir));
    const failure = await runCliFail(baseAcquireArgs(lockDir));

    expect(failure.json).toMatchObject({
      ok: false,
      acquired: false,
      locked: true,
      stale: false,
      reason: 'lock_held',
    });
  });

  test('status reports held lock and redacted metadata', async () => {
    const lockDir = await lockDirFor();
    const acquired = await runCli(baseAcquireArgs(lockDir));
    const status = await runCli([script, 'status', '--lock-dir', lockDir]);
    const serialized = JSON.stringify(status.json);

    expect(status.json).toMatchObject({
      ok: true,
      locked: true,
      stale: false,
      raw_target_url_printed: false,
    });
    expect(status.json.metadata.owner_token_hash).toBeUndefined();
    expect(status.json.metadata.owner_token_hash_present).toBe(true);
    expect(status.json.metadata.metadata_redaction_status).toBe('safe');
    expect(serialized).not.toContain(acquired.json.owner_token);
    expect(serialized).not.toContain('owner_token\":\"');
    expect(serialized).not.toContain((await readLock(lockDir)).owner_token_hash);
  });

  test('release with wrong token fails and keeps lock', async () => {
    const lockDir = await lockDirFor();
    await runCli(baseAcquireArgs(lockDir));
    const failure = await runCliFail([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      'wrong-token',
    ]);
    const status = await runCli([script, 'status', '--lock-dir', lockDir]);

    expect(failure.json).toMatchObject({
      ok: false,
      released: false,
      reason: 'owner_token_mismatch',
    });
    expect(status.json.locked).toBe(true);
  });

  test('release with correct token removes lock', async () => {
    const lockDir = await lockDirFor();
    const acquired = await runCli(baseAcquireArgs(lockDir));
    const released = await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      acquired.json.owner_token,
    ]);

    expect(released.json).toMatchObject({
      ok: true,
      released: true,
      raw_target_url_printed: false,
    });
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('stale lock is reported as stale but not automatically broken', async () => {
    const lockDir = await lockDirFor();
    await runCli(baseAcquireArgs(lockDir, ['--ttl-ms', '1']));
    await new Promise((resolve) => setTimeout(resolve, 30));

    const status = await runCli([script, 'status', '--lock-dir', lockDir]);
    const acquireFailure = await runCliFail(baseAcquireArgs(lockDir));

    expect(status.json).toMatchObject({ locked: true, stale: true });
    expect(acquireFailure.json).toMatchObject({
      ok: false,
      acquired: false,
      locked: true,
      stale: true,
      reason: 'lock_stale_not_broken',
    });
    await stat(lockDir);
  });

  test('acquire rejects raw ChatGPT target URL patterns in arguments', async () => {
    const lockDir = await lockDirFor();
    const failure = await runCliFail([
      script,
      'acquire',
      '--lock-dir',
      lockDir,
      '--owner-id',
      rawTargetUrlSample,
      '--branch',
      'codex/crm-core-welcome-audio',
      '--worktree',
      '/Users/alejandrogomez/CRM-core-welcome-audio',
      '--packet-id',
      'crm_core_ui_relay_example_packet',
      '--consultant-id',
      'welcome-audio-send-boundary',
      '--critical-section',
      'send_packet',
    ]);

    expect(failure.json.ok).toBe(false);
    expect(failure.json.error).toContain('raw_target_url_rejected');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('lock metadata never contains raw target URL, owner token, private content, or Mantis paths', async () => {
    const lockDir = await lockDirFor();
    const acquired = await runCli(baseAcquireArgs(lockDir));
    const metadataText = await readFile(join(lockDir, 'lock.json'), 'utf8');

    expect(metadataText).not.toContain(acquired.json.owner_token);
    expect(metadataText).not.toContain(rawTargetUrlPatternLabel);
    expect(metadataText).not.toContain(legacyRawTargetUrlPatternLabel);
    expect(metadataText).not.toContain('PRIVATE_CONTENT_MARKER');
    expect(metadataText).not.toContain('Mantis-Reports');
    expect(metadataText).not.toContain('Mantis-Private-Source-Artifacts');
    expect(metadataText).not.toContain('CRM-Core-Private-Artifacts');
  });

  test('acquire rejects lock-dir inside repo outside test-safe /tmp usage', async () => {
    const repoLockDir = join(process.cwd(), 'tmp', 'relay-lock-inside-repo-test');
    const failure = await runCliFail(baseAcquireArgs(repoLockDir));

    expect(failure.json).toMatchObject({
      ok: false,
      error: 'lock_dir_inside_repo_rejected',
      raw_target_url_printed: false,
    });
    await expect(stat(repoLockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('owner token can be supplied through environment for release', async () => {
    const lockDir = await lockDirFor();
    const acquired = await runCli(baseAcquireArgs(lockDir));
    const released = await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
    ], {
      CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: acquired.json.owner_token,
    });

    expect(released.json.ok).toBe(true);
    expect(released.json.released).toBe(true);
  });

  test('status redacts unsafe existing lock metadata', async () => {
    const lockDir = await createUnsafeExistingLock();
    const status = await runCli([script, 'status', '--lock-dir', lockDir]);
    const serialized = JSON.stringify(status.json);

    expect(status.json.ok).toBe(true);
    expect(serialized).not.toContain(rawTargetUrlPatternLabel);
    expect(serialized).not.toContain(legacyRawTargetUrlPatternLabel);
    expect(serialized).not.toContain('Mantis-Private-Source-Artifacts');
    expect(serialized).not.toContain('Mantis-Reports');
    expect(serialized).not.toContain(unsafeEmailValue);
    expect(status.json.metadata.target_url).toBeUndefined();
    expect(serialized).not.toContain(fakeOwnerTokenHash);
    expect(status.json.metadata.owner_token_hash).toBeUndefined();
    expect(status.json.metadata.owner_token_hash_present).toBe(true);
    expect(status.json.metadata.metadata_redaction_status).toBe('unsafe_metadata_redacted');
  });

  test('acquire failure redacts unsafe existing lock metadata', async () => {
    const lockDir = await createUnsafeExistingLock();
    const failure = await runCliFail(baseAcquireArgs(lockDir));
    const serialized = JSON.stringify(failure.json);

    expect(failure.json.ok).toBe(false);
    expect(failure.json.acquired).toBe(false);
    expect(serialized).not.toContain(rawTargetUrlPatternLabel);
    expect(serialized).not.toContain(legacyRawTargetUrlPatternLabel);
    expect(serialized).not.toContain('Mantis-Private-Source-Artifacts');
    expect(serialized).not.toContain('Mantis-Reports');
    expect(serialized).not.toContain(unsafeEmailValue);
    expect(serialized).not.toContain(fakeOwnerTokenHash);
    expect(failure.json.raw_target_url_printed).toBe(false);
    expect(failure.json.metadata.metadata_redaction_status).toBe('unsafe_metadata_redacted');
  });

  test('acquire creates missing parent directory under /tmp', async () => {
    const root = await makeTmpRoot();
    const lockDir = join(root, 'nested', 'consultant-relay', '.relay-lock');
    const acquired = await runCli(baseAcquireArgs(lockDir));
    const lock = await readLock(lockDir);

    expect(acquired.json.ok).toBe(true);
    expect(lock.owner_id).toBe('welcome-audio-send-boundary');
    await stat(join(root, 'nested'));
    await stat(lockDir);
    await stat(join(lockDir, 'lock.json'));

    const released = await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      acquired.json.owner_token,
    ]);

    expect(released.json.ok).toBe(true);
    expect(released.json.released).toBe(true);
  });

  test('production mode rejects arbitrary /tmp lock dir before mkdir', async () => {
    const root = await makeTmpRoot();
    const lockDir = join(root, 'synthetic-crm-relay-lock');
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json).toMatchObject({
      ok: false,
      error: 'lock_dir_outside_approved_crm_core_reports_rejected',
      raw_target_url_printed: false,
    });
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('production mode rejects Mantis-Reports lock dir before mkdir', async () => {
    const root = await makeTmpRoot();
    const forbiddenDir = join(root, 'Mantis-Reports');
    const lockDir = join(forbiddenDir, '.relay-lock');
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json.error).toBe('lock_dir_mantis_reports_rejected');
    await expect(stat(forbiddenDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('production mode rejects Mantis-Private-Source-Artifacts lock dir before mkdir', async () => {
    const root = await makeTmpRoot();
    const forbiddenDir = join(root, 'Mantis-Private-Source-Artifacts');
    const lockDir = join(forbiddenDir, '.relay-lock');
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json.error).toBe('lock_dir_mantis_private_rejected');
    await expect(stat(forbiddenDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('production mode rejects CRM-Core-Private-Artifacts lock dir before mkdir', async () => {
    const root = await makeTmpRoot();
    const forbiddenDir = join(root, 'CRM-Core-Private-Artifacts');
    const lockDir = join(forbiddenDir, '.relay-lock');
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json.error).toBe('lock_dir_crm_core_private_rejected');
    await expect(stat(forbiddenDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('production mode rejects legacy CRM workspace lock dir before mkdir', async () => {
    const lockDir = '/Users/alejandrogomez/CRM/synthetic-relay-lock/.relay-lock';
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json.error).toBe('lock_dir_legacy_crm_workspace_rejected');
  });

  test('production mode rejects email-like value in lock-dir before mkdir', async () => {
    const root = await makeTmpRoot();
    const forbiddenDir = join(root, unsafeEmailValue);
    const lockDir = join(forbiddenDir, '.relay-lock');
    const failure = await runCliProductionFail(baseAcquireArgs(lockDir));

    expect(failure.json.error).toBe('lock_dir_email_like_value_rejected');
    await expect(stat(forbiddenDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('test mode can enforce mocked approved CRM-Core-Reports consultant-relay root', async () => {
    const root = await makeTmpRoot();
    const approvedRoot = join(root, 'CRM-Core-Reports', 'consultant-relay');
    const lockDir = join(approvedRoot, 'lane-a', '.relay-lock');
    const outsideLockDir = join(root, 'outside-approved-root', '.relay-lock');
    const env = {
      CRM_CORE_CONSULTANT_RELAY_APPROVED_ROOT: approvedRoot,
      CRM_CORE_CONSULTANT_RELAY_ENFORCE_APPROVED_ROOT: '1',
    };

    const acquired = await runCli(baseAcquireArgs(lockDir), env);
    expect(acquired.json.ok).toBe(true);
    await stat(lockDir);

    const released = await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      acquired.json.owner_token,
    ], env);
    expect(released.json.released).toBe(true);

    const failure = await runCliFail(baseAcquireArgs(outsideLockDir), env);
    expect(failure.json.error).toBe('lock_dir_outside_approved_crm_core_reports_rejected');
    await expect(stat(outsideLockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
