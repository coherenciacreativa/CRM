import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const script = 'scripts/crm-vnext-consultant-relay-lock.mjs';
const tmpRoots: string[] = [];
const rawTargetUrlSample = ['https://chatgpt.com', 'c', 'synthetic-private-target'].join('/');
const projectRawTargetUrlSample = ['https://chatgpt.com', 'g', `g-p-${'a'.repeat(32)}-crm-core-chief-architect`, 'c', 'synthetic-private-target'].join('/');
const rawTargetUrlPatternLabel = ['chatgpt.com', 'c', ''].join('/');
const legacyRawTargetUrlPatternLabel = ['chat.openai.com', 'c', ''].join('/');
const projectRawTargetUrlPatternLabel = ['chatgpt.com', 'g', ''].join('/');
const unsafeEmailValue = 'unsafe-lock@example.test';
const fakeOwnerTokenHash = `sha256:${'a'.repeat(64)}`;
const canonicalChiefArchitectProjectName = 'CRM Core — Chief Architect';
const canonicalChiefArchitectConsultantId = 'chief-architect-integration';
const operatingModelConsultantId = 'chief-architect-operating-model';
const operatingModelChatLabel = '01 — Operating Model & Mission Templates';
const architectureExceptionsConsultantId = 'chief-architect-architecture-exceptions';
const architectureExceptionsChatLabel = '02 — Architecture Exceptions';
const missionChiefArchitectConsultantId = 'chief-architect-mission-contract-2026-07-15-real-e2e-proof';
const missionChiefArchitectChatLabel = 'Mission — Real New Follower Welcome Proof — 2026-07-15';
const canonicalProjectRouteToken = `g-p-${'a'.repeat(32)}`;
const canonicalProjectRouteHash = `sha256:${createHash('sha256').update(canonicalProjectRouteToken).digest('hex')}`;
const canonicalChatRouteHash = `sha256:${createHash('sha256').update('synthetic-private-target').digest('hex')}`;
const missionChatRouteToken = 'synthetic-private-mission-target';
const missionChatRouteHash = `sha256:${createHash('sha256').update(missionChatRouteToken).digest('hex')}`;
const missionProjectRawTargetUrlSample = ['https://chatgpt.com', 'g', `g-p-${'a'.repeat(32)}-crm-core-chief-architect`, 'c', missionChatRouteToken].join('/');
const operatingModelChatRouteToken = 'synthetic-private-operating-model-target';
const operatingModelChatRouteHash = `sha256:${createHash('sha256').update(operatingModelChatRouteToken).digest('hex')}`;
const operatingModelProjectRawTargetUrlSample = ['https://chatgpt.com', 'g', `g-p-${'a'.repeat(32)}-crm-core-chief-architect`, 'c', operatingModelChatRouteToken].join('/');
const architectureExceptionsChatRouteToken = 'synthetic-private-architecture-exceptions-target';
const architectureExceptionsChatRouteHash = `sha256:${createHash('sha256').update(architectureExceptionsChatRouteToken).digest('hex')}`;
const architectureExceptionsProjectRawTargetUrlSample = ['https://chatgpt.com', 'g', `g-p-${'a'.repeat(32)}-crm-core-chief-architect`, 'c', architectureExceptionsChatRouteToken].join('/');
const differentProjectRouteToken = `g-p-${'b'.repeat(32)}`;
const differentProjectRouteHash = `sha256:${createHash('sha256').update(differentProjectRouteToken).digest('hex')}`;
const differentProjectMissionRawTargetUrlSample = ['https://chatgpt.com', 'g', `${differentProjectRouteToken}-crm-core-chief-architect`, 'c', missionChatRouteToken].join('/');

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

const baseChiefArchitectAcquireArgs = (lockDir: string, overrides: string[] = []) => baseAcquireArgs(lockDir, [
  '--owner-id',
  canonicalChiefArchitectConsultantId,
  '--consultant-id',
  canonicalChiefArchitectConsultantId,
  '--observed-project-name',
  canonicalChiefArchitectProjectName,
  '--observed-project-only-memory',
  'true',
  '--observed-private-unshared',
  'true',
  '--observed-instructions-match',
  'true',
  '--observed-chat-project-bound',
  'true',
  '--observed-chat-label',
  '00 — North Star & Portfolio',
  '--observed-project-route-sha256',
  canonicalProjectRouteHash,
  '--observed-chat-route-sha256',
  canonicalChatRouteHash,
  '--ui-observed-at',
  new Date().toISOString(),
  ...overrides,
]);

const canonicalInstructionsHash = async () => {
  const raw = await readFile('docs/crm-vnext/crm-core-chief-architect-project-bootstrap-v1.md', 'utf8');
  const match = raw.match(/## Canonical project instructions[\s\S]*?```text\n([\s\S]*?)\n```/);
  if (!match?.[1]) throw new Error('canonical instructions missing in fixture');
  return `sha256:${createHash('sha256').update(match[1]).digest('hex')}`;
};

const createChiefArchitectRegistry = async ({
  fileMode = 0o600,
  directoryMode = 0o700,
  projectName = canonicalChiefArchitectProjectName,
  targetUrl = projectRawTargetUrlSample,
  routeHash = canonicalProjectRouteHash,
  chatRouteHash = canonicalChatRouteHash,
  bindingVerifiedAt = '2026-07-13T12:00:00.000Z',
  instructionsHash,
}: {
  fileMode?: number;
  directoryMode?: number;
  projectName?: string;
  targetUrl?: string;
  routeHash?: string;
  chatRouteHash?: string;
  bindingVerifiedAt?: string;
  instructionsHash?: string;
} = {}) => {
  const root = await makeTmpRoot();
  const directory = join(root, 'private-registry');
  const file = join(directory, 'consultant-target-registry-v0.json');
  await mkdir(directory, { recursive: true, mode: directoryMode });
  await chmod(directory, directoryMode);
  await writeFile(file, `${JSON.stringify({
    version: 'v0',
    updated_at: bindingVerifiedAt,
    targets: {
      [canonicalChiefArchitectConsultantId]: {
        target_id: canonicalChiefArchitectConsultantId,
        expected_consultant_id: canonicalChiefArchitectConsultantId,
        target_chat_label: '00 — North Star & Portfolio',
        target_url: targetUrl,
        target_url_secret: true,
        canonical_project_name: projectName,
        canonical_project_route_sha256: routeHash,
        canonical_chat_route_sha256: chatRouteHash,
        project_only_memory: true,
        private_unshared: true,
        project_instructions_sha256: instructionsHash ?? await canonicalInstructionsHash(),
        sources_count: 13,
        required_chats_verified: true,
        bootstrap_receipt_green: true,
        legacy_project_used: false,
        project_binding_verified_at: bindingVerifiedAt,
      },
    },
  }, null, 2)}\n`, { mode: fileMode });
  await chmod(file, fileMode);
  return file;
};

const addChiefArchitectTarget = async (
  registryPath: string,
  {
    targetId,
    chatLabel,
    chatRouteToken,
    targetKind,
  }: {
    targetId: string;
    chatLabel: string;
    chatRouteToken: string;
    targetKind: 'standing' | 'mission';
  },
) => {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const standing = registry.targets[canonicalChiefArchitectConsultantId];
  const verifiedAt = '2026-07-24T12:00:00.000Z';
  const target = {
    ...standing,
    target_id: targetId,
    expected_consultant_id: targetId,
    target_kind: targetKind,
    target_chat_label: chatLabel,
    target_url: ['https://chatgpt.com', 'g', `${canonicalProjectRouteToken}-crm-core-chief-architect`, 'c', chatRouteToken].join('/'),
    canonical_chat_route_sha256: `sha256:${createHash('sha256').update(chatRouteToken).digest('hex')}`,
    project_binding_verified_at: verifiedAt,
    updated_at: verifiedAt,
  };
  registry.targets[targetId] = target;
  registry.updated_at = verifiedAt;
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
  await chmod(registryPath, 0o600);
  return target;
};

const createChiefArchitectRouteReceipt = async (target: any) => {
  const root = await makeTmpRoot();
  const file = join(root, 'route-receipt.json');
  await chmod(root, 0o700);
  await writeFile(file, `${JSON.stringify({
    schema_version: target.target_kind === 'mission'
      ? 'crm_core_chief_architect_mission_route_registration_receipt_v1'
      : 'crm_core_chief_architect_route_rebind_receipt_v1',
    target_id: target.target_id,
    target_kind: target.target_kind,
    canonical_project_name: canonicalChiefArchitectProjectName,
    canonical_project_route_sha256: target.canonical_project_route_sha256,
    canonical_chat_route_sha256: target.canonical_chat_route_sha256,
    project_binding_verified_at: target.project_binding_verified_at,
    target_registry_rebound: true,
    project_only_memory: true,
    private_unshared: true,
    instructions_match: true,
    sources_count: 13,
    required_chats_verified: true,
    legacy_project_used: false,
    registry_owner_only: true,
    raw_target_url_printed: false,
  }, null, 2)}\n`, { mode: 0o600 });
  return file;
};

const routedChiefArchitectAcquireArgs = (
  lockDir: string,
  {
    targetId,
    chatLabel,
    chatRouteHash,
    requestClass,
    declaredTargetId = targetId,
    declaredChatLabel = chatLabel,
    extra = [],
  }: {
    targetId: string;
    chatLabel: string;
    chatRouteHash: string;
    requestClass?: string;
    declaredTargetId?: string;
    declaredChatLabel?: string;
    extra?: string[];
  },
) => baseAcquireArgs(lockDir, [
  '--owner-id',
  targetId,
  '--consultant-id',
  targetId,
  '--observed-project-name',
  canonicalChiefArchitectProjectName,
  '--observed-project-only-memory',
  'true',
  '--observed-private-unshared',
  'true',
  '--observed-instructions-match',
  'true',
  '--observed-chat-project-bound',
  'true',
  '--observed-chat-label',
  chatLabel,
  '--observed-project-route-sha256',
  canonicalProjectRouteHash,
  '--observed-chat-route-sha256',
  chatRouteHash,
  '--ui-observed-at',
  new Date().toISOString(),
  ...(requestClass ? [
    '--request-class',
    requestClass,
    '--request-target-id',
    declaredTargetId,
    '--request-target-chat-label',
    declaredChatLabel,
  ] : []),
  ...extra,
]);

const createBootstrapReceipt = async () => {
  const root = await makeTmpRoot();
  const file = join(root, 'bootstrap-receipt.json');
  await writeFile(file, `${JSON.stringify({
    project_created: true,
    project_name: canonicalChiefArchitectProjectName,
    project_memory_mode: 'project_only',
    project_private: true,
    files_uploaded_count: 13,
    chat_labels: [
      '00 — North Star & Portfolio',
      '01 — Operating Model & Mission Templates',
      '02 — Architecture Exceptions',
      'Mission — Active Trigger Correction & First Email Proof — 2026-07-11',
    ],
    legacy_crm_used: false,
    blockers: [],
  }, null, 2)}\n`, { mode: 0o600 });
  return file;
};

const registryUpdateAcquireArgs = (
  lockDir: string,
  ttlMs = '300000',
  targetId = canonicalChiefArchitectConsultantId,
) => baseAcquireArgs(lockDir, [
  '--owner-id',
  'chief-architect-route-rebind',
  '--consultant-id',
  'chief-architect-route-rebind',
  '--packet-id',
  'chief_architect_route_rebind_test_packet',
  '--branch',
  'codex/crm-core-reentry',
  '--worktree',
  process.cwd(),
  '--critical-section',
  'target_registry_update',
  '--target-id',
  targetId,
  '--ttl-ms',
  ttlMs,
]);

const registryUpdateCommandArgs = (lockDir: string, overrides: string[] = []) => [
  script,
  'register-chief-architect-target',
  '--lock-dir',
  lockDir,
  '--target-id',
  canonicalChiefArchitectConsultantId,
  '--target-url-stdin',
  'true',
  '--target-chat-label',
  '00 — North Star & Portfolio',
  '--observed-project-name',
  canonicalChiefArchitectProjectName,
  '--observed-project-only-memory',
  'true',
  '--observed-private-unshared',
  'true',
  '--observed-instructions-match',
  'true',
  '--observed-chat-project-bound',
  'true',
  '--observed-chat-label',
  '00 — North Star & Portfolio',
  '--observed-project-route-sha256',
  canonicalProjectRouteHash,
  '--observed-chat-route-sha256',
  canonicalChatRouteHash,
  '--observed-required-chats',
  'true',
  '--observed-sources-count',
  '13',
  '--ui-observed-at',
  new Date().toISOString(),
  '--expected-lock-owner-id',
  'chief-architect-route-rebind',
  '--expected-lock-consultant-id',
  'chief-architect-route-rebind',
  '--expected-lock-packet-id',
  'chief_architect_route_rebind_test_packet',
  '--expected-lock-branch',
  'codex/crm-core-reentry',
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

const runCliWithInput = async (
  args: string[],
  input: string,
  env: Record<string, string | undefined> = {},
) => new Promise<{ stdout: string; stderr: string; json: any }>((resolve, reject) => {
  const child = execFile('node', args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...env,
    },
  }, (error, stdout, stderr) => {
    if (error) {
      (error as any).stdout = stdout;
      (error as any).stderr = stderr;
      reject(error);
      return;
    }
    resolve({ stdout, stderr, json: JSON.parse(stdout) });
  });
  child.stdin?.end(input);
});

const runCliWithInputFail = async (
  args: string[],
  input: string,
  env: Record<string, string | undefined> = {},
) => {
  try {
    await runCliWithInput(args, input, env);
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

  test('acquire rejects project-chat raw target URLs without leaking them', async () => {
    const lockDir = await lockDirFor();
    const failure = await runCliFail(baseAcquireArgs(lockDir, [
      '--owner-id',
      projectRawTargetUrlSample,
    ]));
    const serialized = JSON.stringify(failure.json);

    expect(failure.json.error).toContain('raw_target_url_rejected');
    expect(serialized).not.toContain(projectRawTargetUrlPatternLabel);
    expect(serialized).not.toContain('synthetic-private-target');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire passes only with canonical private registry and fresh UI observation', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const env = { CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath };
    const acquired = await runCli(baseChiefArchitectAcquireArgs(lockDir), env);

    expect(acquired.json).toMatchObject({
      ok: true,
      acquired: true,
      consultant_id: canonicalChiefArchitectConsultantId,
      chief_architect_route_preflight_passed: true,
      canonical_project_match: true,
      ui_observation_fresh: true,
      raw_target_url_printed: false,
    });
    const serialized = JSON.stringify(acquired.json);
    expect(serialized).not.toContain(projectRawTargetUrlPatternLabel);

    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      acquired.json.owner_token,
    ], env);
  });

  test('chief architect direct open uses static-only preflight before UI observation exists', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const acquired = await runCli(baseAcquireArgs(lockDir, [
      '--owner-id',
      canonicalChiefArchitectConsultantId,
      '--consultant-id',
      canonicalChiefArchitectConsultantId,
      '--critical-section',
      'direct_target_open',
    ]), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(acquired.json).toMatchObject({
      ok: true,
      acquired: true,
      chief_architect_static_route_preflight_passed: true,
      chief_architect_route_preflight_scope: 'static_open_only',
      canonical_project_match: true,
    });
    expect(acquired.json.chief_architect_route_preflight_passed).toBeUndefined();
    expect(acquired.json.ui_observation_fresh).toBeUndefined();

    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      acquired.json.owner_token,
    ], { CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath });
  });

  test('chief architect acquire fails closed when UI project observation is missing', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const args = baseChiefArchitectAcquireArgs(lockDir);
    const flagIndex = args.indexOf('--observed-chat-project-bound');
    args.splice(flagIndex, 2);
    const failure = await runCliFail(args, {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('missing_required_arg:observed-chat-project-bound');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects visible CRM build project', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir, [
      '--observed-project-name',
      'CRM build',
    ]), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_observed_project_mismatch');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects a different chat inside the canonical project', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir, [
      '--observed-chat-label',
      'Mission Correction Proof',
    ]), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_observed_chat_mismatch');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects registry that is not owner-only', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry({ fileMode: 0o644 });
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_registry_not_owner_only');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects legacy project metadata', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry({ projectName: 'CRM build' });
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_registry_project_mismatch');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects target URL drift to another project', async () => {
    const lockDir = await lockDirFor();
    const otherProjectUrl = ['https://chatgpt.com', 'g', `g-p-${'b'.repeat(32)}-legacy`, 'c', 'synthetic-private-target'].join('/');
    const registryPath = await createChiefArchitectRegistry({ targetUrl: otherProjectUrl });
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_project_route_fingerprint_mismatch');
    expect(JSON.stringify(failure.json)).not.toContain('synthetic-private-target');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects target URL drift to another chat in the same project', async () => {
    const lockDir = await lockDirFor();
    const otherChatUrl = ['https://chatgpt.com', 'g', `${canonicalProjectRouteToken}-crm-core-chief-architect`, 'c', 'different-chat'].join('/');
    const registryPath = await createChiefArchitectRegistry({ targetUrl: otherChatUrl });
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_chat_route_fingerprint_mismatch');
    expect(JSON.stringify(failure.json)).not.toContain('different-chat');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire revalidates UI freshness while waiting for the lock', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const holder = await runCli(baseAcquireArgs(lockDir, ['--ttl-ms', '300000']));
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir, [
      '--wait-ms',
      '500',
      '--poll-ms',
      '30',
    ]), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_UI_OBSERVATION_MAX_AGE_MS: '150',
    });

    expect(failure.json.error).toBe('chief_architect_ui_observation_stale');
    const status = await runCli([script, 'status', '--lock-dir', lockDir]);
    expect(status.json.locked).toBe(true);
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ]);
  });

  test('chief architect acquire rejects stale UI observation', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const staleObservedAt = new Date(Date.now() - (11 * 60 * 1000)).toISOString();
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir, [
      '--ui-observed-at',
      staleObservedAt,
    ]), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_ui_observation_stale');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect acquire rejects project instruction fingerprint drift', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry({
      instructionsHash: `sha256:${'0'.repeat(64)}`,
    });
    const failure = await runCliFail(baseChiefArchitectAcquireArgs(lockDir), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
    });

    expect(failure.json.error).toBe('chief_architect_project_instructions_fingerprint_mismatch');
    await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('chief architect target registration is owner-only, redacted, and immediately usable by dynamic preflight', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry({
      fileMode: 0o644,
      directoryMode: 0o755,
      projectName: 'CRM build',
    });
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const holder = await runCli(registryUpdateAcquireArgs(lockDir), registryEnv);
    const registered = await runCliWithInput(
      registryUpdateCommandArgs(lockDir),
      projectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );
    const registry = JSON.parse(await readFile(registryPath, 'utf8'));
    const target = registry.targets[canonicalChiefArchitectConsultantId];
    const registryStats = await stat(registryPath);
    const registryDirectoryStats = await stat(join(registryPath, '..'));
    const routeReceipt = JSON.parse(await readFile(routeReceiptPath, 'utf8'));

    expect(registered.json).toMatchObject({
      ok: true,
      canonical_project_match: true,
      target_registry_rebound: true,
      registry_owner_only: true,
      legacy_project_used: false,
      raw_target_url_printed: false,
    });
    expect(JSON.stringify(registered.json)).not.toContain(projectRawTargetUrlPatternLabel);
    expect(registryStats.mode & 0o077).toBe(0);
    expect(registryDirectoryStats.mode & 0o077).toBe(0);
    expect(target).toMatchObject({
      canonical_project_name: canonicalChiefArchitectProjectName,
      canonical_project_route_sha256: canonicalProjectRouteHash,
      canonical_chat_route_sha256: canonicalChatRouteHash,
      project_only_memory: true,
      private_unshared: true,
      legacy_project_used: false,
    });
    expect(routeReceipt).toMatchObject({
      target_registry_rebound: true,
      registry_owner_only: true,
      legacy_project_used: false,
      raw_target_url_printed: false,
    });

    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);

    const dynamic = await runCli(baseChiefArchitectAcquireArgs(lockDir), registryEnv);
    expect(dynamic.json).toMatchObject({
      chief_architect_route_preflight_passed: true,
      chief_architect_static_route_preflight_passed: true,
      chief_architect_route_preflight_scope: 'dynamic_post_open',
      ui_observation_fresh: true,
    });
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      dynamic.json.owner_token,
    ], registryEnv);

  });

  test('chief architect target registration rejects a stale registry-update lock without URL leakage', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const holder = await runCli(registryUpdateAcquireArgs(lockDir, '1'), registryEnv);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const failure = await runCliWithInputFail(
      registryUpdateCommandArgs(lockDir),
      projectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );

    expect(failure.json.error).toBe('target_registry_update_lock_stale');
    expect(JSON.stringify(failure.json)).not.toContain(projectRawTargetUrlPatternLabel);
    await expect(stat(routeReceiptPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);
  });

  test('chief architect target registration rejects another mission lock binding', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const holder = await runCli(registryUpdateAcquireArgs(lockDir), registryEnv);
    const failure = await runCliWithInputFail(
      registryUpdateCommandArgs(lockDir, [
        '--expected-lock-packet-id',
        'different_mission_packet',
      ]),
      projectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );

    expect(failure.json.error).toBe('target_registry_update_packet_id_mismatch');
    expect(JSON.stringify(failure.json)).not.toContain(projectRawTargetUrlPatternLabel);
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);
  });

  test('mission target registration preserves standing target and passes its own dynamic preflight', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'mission-route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const registryBefore = JSON.parse(await readFile(registryPath, 'utf8'));
    const standingBefore = registryBefore.targets[canonicalChiefArchitectConsultantId];
    const holder = await runCli(
      registryUpdateAcquireArgs(lockDir, '300000', missionChiefArchitectConsultantId),
      registryEnv,
    );
    const registered = await runCliWithInput(
      registryUpdateCommandArgs(lockDir, [
        '--target-id',
        missionChiefArchitectConsultantId,
        '--target-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-chat-route-sha256',
        missionChatRouteHash,
      ]),
      missionProjectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );
    const registryAfter = JSON.parse(await readFile(registryPath, 'utf8'));
    const missionTarget = registryAfter.targets[missionChiefArchitectConsultantId];
    const routeReceipt = JSON.parse(await readFile(routeReceiptPath, 'utf8'));

    expect(registered.json).toMatchObject({
      ok: true,
      target_id: missionChiefArchitectConsultantId,
      target_kind: 'mission',
      target_registry_rebound: true,
      raw_target_url_printed: false,
    });
    expect(registryAfter.targets[canonicalChiefArchitectConsultantId]).toEqual(standingBefore);
    expect(missionTarget).toMatchObject({
      target_id: missionChiefArchitectConsultantId,
      expected_consultant_id: missionChiefArchitectConsultantId,
      target_kind: 'mission',
      target_chat_label: missionChiefArchitectChatLabel,
      canonical_project_route_sha256: canonicalProjectRouteHash,
      canonical_chat_route_sha256: missionChatRouteHash,
      project_only_memory: true,
      private_unshared: true,
      legacy_project_used: false,
    });
    expect(routeReceipt).toMatchObject({
      schema_version: 'crm_core_chief_architect_mission_route_registration_receipt_v1',
      target_id: missionChiefArchitectConsultantId,
      target_kind: 'mission',
      raw_target_url_printed: false,
    });

    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);

    const dynamic = await runCli(baseChiefArchitectAcquireArgs(lockDir, [
      '--owner-id',
      missionChiefArchitectConsultantId,
      '--consultant-id',
      missionChiefArchitectConsultantId,
      '--observed-chat-label',
      missionChiefArchitectChatLabel,
      '--observed-chat-route-sha256',
      missionChatRouteHash,
    ]), registryEnv);
    expect(dynamic.json).toMatchObject({
      ok: true,
      consultant_id: missionChiefArchitectConsultantId,
      chief_architect_route_preflight_passed: true,
      canonical_project_match: true,
      ui_observation_fresh: true,
    });
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      dynamic.json.owner_token,
    ], registryEnv);

    const corruptedRegistry = structuredClone(registryAfter);
    corruptedRegistry.targets[canonicalChiefArchitectConsultantId].canonical_project_route_sha256 = `sha256:${'0'.repeat(64)}`;
    await writeFile(registryPath, `${JSON.stringify(corruptedRegistry, null, 2)}\n`, { mode: 0o600 });
    const corruptStandingFailure = await runCliFail(baseAcquireArgs(lockDir, [
      '--owner-id',
      missionChiefArchitectConsultantId,
      '--consultant-id',
      missionChiefArchitectConsultantId,
      '--critical-section',
      'direct_target_open',
    ]), registryEnv);
    expect(corruptStandingFailure.json).toMatchObject({
      ok: false,
      error: 'chief_architect_standing_project_route_fingerprint_mismatch',
      raw_target_url_printed: false,
    });

    await writeFile(registryPath, `${JSON.stringify(registryAfter, null, 2)}\n`, { mode: 0o600 });
    await rm(routeReceiptPath);
    const missingReceiptFailure = await runCliFail(baseAcquireArgs(lockDir, [
      '--owner-id',
      missionChiefArchitectConsultantId,
      '--consultant-id',
      missionChiefArchitectConsultantId,
      '--critical-section',
      'direct_target_open',
    ]), registryEnv);
    expect(missingReceiptFailure.json).toMatchObject({
      ok: false,
      error: 'chief_architect_mission_route_receipt_missing',
      raw_target_url_printed: false,
    });
  });

  test('mission target registration rejects a label whose date does not match the target id', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'mission-route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const holder = await runCli(
      registryUpdateAcquireArgs(lockDir, '300000', missionChiefArchitectConsultantId),
      registryEnv,
    );
    const failure = await runCliWithInputFail(
      registryUpdateCommandArgs(lockDir, [
        '--target-id',
        missionChiefArchitectConsultantId,
        '--target-chat-label',
        'Mission — Real New Follower Welcome Proof — 2026-07-16',
        '--observed-chat-label',
        'Mission — Real New Follower Welcome Proof — 2026-07-16',
        '--observed-chat-route-sha256',
        missionChatRouteHash,
      ]),
      missionProjectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );

    expect(failure.json).toMatchObject({
      ok: false,
      error: 'chief_architect_mission_chat_label_not_allowed',
      raw_target_url_printed: false,
    });
    await expect(stat(routeReceiptPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);
  });

  test('mission target registration rejects a different project route and preserves the standing registry', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const routeReceiptRoot = await makeTmpRoot();
    const routeReceiptPath = join(routeReceiptRoot, 'mission-route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const registryBefore = await readFile(registryPath, 'utf8');
    const holder = await runCli(
      registryUpdateAcquireArgs(lockDir, '300000', missionChiefArchitectConsultantId),
      registryEnv,
    );
    const failure = await runCliWithInputFail(
      registryUpdateCommandArgs(lockDir, [
        '--target-id',
        missionChiefArchitectConsultantId,
        '--target-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-project-route-sha256',
        differentProjectRouteHash,
        '--observed-chat-route-sha256',
        missionChatRouteHash,
      ]),
      differentProjectMissionRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );

    expect(failure.json).toMatchObject({
      ok: false,
      error: 'chief_architect_mission_project_route_mismatch',
      raw_target_url_printed: false,
    });
    expect(await readFile(registryPath, 'utf8')).toBe(registryBefore);
    await expect(stat(routeReceiptPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);
  });

  test('mission receipt write failure leaves the private registry unchanged', async () => {
    const lockDir = await lockDirFor();
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const blockedReceiptRoot = await makeTmpRoot();
    const blockedParent = join(blockedReceiptRoot, 'not-a-directory');
    await writeFile(blockedParent, 'blocked', { mode: 0o600 });
    const routeReceiptPath = join(blockedParent, 'mission-route-receipt.json');
    const registryEnv = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
    };
    const registryBefore = await readFile(registryPath, 'utf8');
    const holder = await runCli(
      registryUpdateAcquireArgs(lockDir, '300000', missionChiefArchitectConsultantId),
      registryEnv,
    );
    const failure = await runCliWithInputFail(
      registryUpdateCommandArgs(lockDir, [
        '--target-id',
        missionChiefArchitectConsultantId,
        '--target-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-chat-label',
        missionChiefArchitectChatLabel,
        '--observed-chat-route-sha256',
        missionChatRouteHash,
      ]),
      missionProjectRawTargetUrlSample,
      {
        ...registryEnv,
        CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
      },
    );

    expect(failure.json.ok).toBe(false);
    expect(failure.json.raw_target_url_printed).toBe(false);
    expect(await readFile(registryPath, 'utf8')).toBe(registryBefore);
    await runCli([
      script,
      'release',
      '--lock-dir',
      lockDir,
      '--owner-token',
      holder.json.owner_token,
    ], registryEnv);
  });

  test('closed request-class matrix accepts every class only on its declared role', async () => {
    const registryPath = await createChiefArchitectRegistry();
    const operatingTarget = await addChiefArchitectTarget(registryPath, {
      targetId: operatingModelConsultantId,
      chatLabel: operatingModelChatLabel,
      chatRouteToken: operatingModelChatRouteToken,
      targetKind: 'standing',
    });
    const architectureTarget = await addChiefArchitectTarget(registryPath, {
      targetId: architectureExceptionsConsultantId,
      chatLabel: architectureExceptionsChatLabel,
      chatRouteToken: architectureExceptionsChatRouteToken,
      targetKind: 'standing',
    });
    const missionTarget = await addChiefArchitectTarget(registryPath, {
      targetId: missionChiefArchitectConsultantId,
      chatLabel: missionChiefArchitectChatLabel,
      chatRouteToken: missionChatRouteToken,
      targetKind: 'mission',
    });
    const routes = [
      {
        targetId: canonicalChiefArchitectConsultantId,
        chatLabel: '00 — North Star & Portfolio',
        chatRouteHash: canonicalChatRouteHash,
        outputRole: '00',
        classes: ['portfolio_decision', 'next_mission_selection', 'integration_review', 'final_ceo_brief'],
        receiptPath: undefined,
      },
      {
        targetId: operatingModelConsultantId,
        chatLabel: operatingModelChatLabel,
        chatRouteHash: operatingModelChatRouteHash,
        outputRole: '01',
        classes: ['operating_model_change', 'mission_template_change', 'governance_policy_change', 'process_retrospective', 'CEO_overhead_review'],
        receiptPath: await createChiefArchitectRouteReceipt(operatingTarget),
      },
      {
        targetId: architectureExceptionsConsultantId,
        chatLabel: architectureExceptionsChatLabel,
        chatRouteHash: architectureExceptionsChatRouteHash,
        outputRole: '02',
        classes: ['architecture_exception', 'privacy_boundary_exception', 'identity_ambiguity_exception', 'irreversible_effect_exception', 'repeated_same_cause_exception', 'cross_lane_conflict'],
        receiptPath: await createChiefArchitectRouteReceipt(architectureTarget),
      },
      {
        targetId: missionChiefArchitectConsultantId,
        chatLabel: missionChiefArchitectChatLabel,
        chatRouteHash: missionChatRouteHash,
        outputRole: 'mission',
        classes: ['mission_contract', 'mission_artifact_review', 'mission_exception_within_envelope', 'mission_closeout'],
        receiptPath: await createChiefArchitectRouteReceipt(missionTarget),
      },
    ];

    for (const route of routes) {
      for (const requestClass of route.classes) {
        const lockDir = await lockDirFor();
        const result = await runCli(routedChiefArchitectAcquireArgs(lockDir, {
          ...route,
          requestClass,
        }), {
          CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
          ...(route.receiptPath
            ? { CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: route.receiptPath }
            : {}),
        });
        expect(result.json).toMatchObject({
          request_class: requestClass,
          request_target_id: route.targetId,
          request_target_role: route.outputRole,
          request_routing_green: true,
          legacy_request_class_defaulted: false,
          raw_target_url_printed: false,
        });
        if (route.outputRole === 'mission') {
          expect(result.stdout).not.toContain(route.chatLabel);
        }
        await runCli([
          script,
          'release',
          '--lock-dir',
          lockDir,
          '--owner-token',
          result.json.owner_token,
        ]);
      }
    }
  }, 20_000);

  test('every explicit cross-role request-class combination fails before lock creation', async () => {
    const registryPath = await createChiefArchitectRegistry();
    const targets = [
      {
        target: await addChiefArchitectTarget(registryPath, {
          targetId: operatingModelConsultantId,
          chatLabel: operatingModelChatLabel,
          chatRouteToken: operatingModelChatRouteToken,
          targetKind: 'standing',
        }),
        targetId: operatingModelConsultantId,
        chatLabel: operatingModelChatLabel,
        chatRouteHash: operatingModelChatRouteHash,
        allowed: new Set(['operating_model_change', 'mission_template_change', 'governance_policy_change', 'process_retrospective', 'CEO_overhead_review']),
      },
      {
        target: await addChiefArchitectTarget(registryPath, {
          targetId: architectureExceptionsConsultantId,
          chatLabel: architectureExceptionsChatLabel,
          chatRouteToken: architectureExceptionsChatRouteToken,
          targetKind: 'standing',
        }),
        targetId: architectureExceptionsConsultantId,
        chatLabel: architectureExceptionsChatLabel,
        chatRouteHash: architectureExceptionsChatRouteHash,
        allowed: new Set(['architecture_exception', 'privacy_boundary_exception', 'identity_ambiguity_exception', 'irreversible_effect_exception', 'repeated_same_cause_exception', 'cross_lane_conflict']),
      },
      {
        target: await addChiefArchitectTarget(registryPath, {
          targetId: missionChiefArchitectConsultantId,
          chatLabel: missionChiefArchitectChatLabel,
          chatRouteToken: missionChatRouteToken,
          targetKind: 'mission',
        }),
        targetId: missionChiefArchitectConsultantId,
        chatLabel: missionChiefArchitectChatLabel,
        chatRouteHash: missionChatRouteHash,
        allowed: new Set(['mission_contract', 'mission_artifact_review', 'mission_exception_within_envelope', 'mission_closeout']),
      },
    ];
    const standingTarget = JSON.parse(await readFile(registryPath, 'utf8'))
      .targets[canonicalChiefArchitectConsultantId];
    targets.unshift({
      target: standingTarget,
      targetId: canonicalChiefArchitectConsultantId,
      chatLabel: '00 — North Star & Portfolio',
      chatRouteHash: canonicalChatRouteHash,
      allowed: new Set(['portfolio_decision', 'next_mission_selection', 'integration_review', 'final_ceo_brief']),
    });
    const allClasses = [...new Set(targets.flatMap((target) => [...target.allowed]))];
    const registryBefore = await readFile(registryPath, 'utf8');

    for (const route of targets) {
      const receiptPath = route.targetId === canonicalChiefArchitectConsultantId
        ? undefined
        : await createChiefArchitectRouteReceipt(route.target);
      for (const requestClass of allClasses.filter((candidate) => !route.allowed.has(candidate))) {
        const lockDir = await lockDirFor();
        const failure = await runCliFail(routedChiefArchitectAcquireArgs(lockDir, {
          ...route,
          requestClass,
        }), {
          CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
          ...(receiptPath ? { CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: receiptPath } : {}),
        });
        expect(failure.json.error).toBe('chief_architect_request_class_wrong_role');
        expect(failure.json.raw_target_url_printed).toBe(false);
        await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
      }
    }
    expect(await readFile(registryPath, 'utf8')).toBe(registryBefore);
  }, 30_000);

  test('routing rejects unknown targets, unknown classes, missing metadata, and declared-target drift', async () => {
    const registryPath = await createChiefArchitectRegistry();
    const operatingTarget = await addChiefArchitectTarget(registryPath, {
      targetId: operatingModelConsultantId,
      chatLabel: operatingModelChatLabel,
      chatRouteToken: operatingModelChatRouteToken,
      targetKind: 'standing',
    });
    const receiptPath = await createChiefArchitectRouteReceipt(operatingTarget);
    const env = {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: receiptPath,
    };
    const missingTargetIdArgs = routedChiefArchitectAcquireArgs(await lockDirFor(), {
      targetId: operatingModelConsultantId,
      chatLabel: operatingModelChatLabel,
      chatRouteHash: operatingModelChatRouteHash,
      requestClass: 'operating_model_change',
    });
    missingTargetIdArgs.splice(missingTargetIdArgs.indexOf('--request-target-id'), 2);
    const missingTargetLabelArgs = routedChiefArchitectAcquireArgs(await lockDirFor(), {
      targetId: operatingModelConsultantId,
      chatLabel: operatingModelChatLabel,
      chatRouteHash: operatingModelChatRouteHash,
      requestClass: 'operating_model_change',
    });
    missingTargetLabelArgs.splice(missingTargetLabelArgs.indexOf('--request-target-chat-label'), 2);
    const partialLegacyTargetIdArgs = baseChiefArchitectAcquireArgs(await lockDirFor(), [
      '--request-target-id',
      canonicalChiefArchitectConsultantId,
    ]);
    const partialLegacyTargetLabelArgs = baseChiefArchitectAcquireArgs(await lockDirFor(), [
      '--request-target-chat-label',
      '00 — North Star & Portfolio',
    ]);
    const cases = [
      {
        args: routedChiefArchitectAcquireArgs(await lockDirFor(), {
          targetId: 'chief-architect-unknown-role',
          chatLabel: 'Unknown role',
          chatRouteHash: operatingModelChatRouteHash,
          requestClass: 'operating_model_change',
        }),
        error: 'chief_architect_target_id_not_allowed',
      },
      {
        args: routedChiefArchitectAcquireArgs(await lockDirFor(), {
          targetId: operatingModelConsultantId,
          chatLabel: operatingModelChatLabel,
          chatRouteHash: operatingModelChatRouteHash,
          requestClass: 'unknown_request_class',
        }),
        error: 'chief_architect_request_class_unknown',
      },
      {
        args: routedChiefArchitectAcquireArgs(await lockDirFor(), {
          targetId: operatingModelConsultantId,
          chatLabel: operatingModelChatLabel,
          chatRouteHash: operatingModelChatRouteHash,
        }),
        error: 'chief_architect_request_class_missing',
      },
      {
        args: missingTargetIdArgs,
        error: 'chief_architect_request_target_id_missing',
      },
      {
        args: missingTargetLabelArgs,
        error: 'chief_architect_request_target_chat_label_missing',
      },
      {
        args: partialLegacyTargetIdArgs,
        error: 'chief_architect_request_routing_partial',
      },
      {
        args: partialLegacyTargetLabelArgs,
        error: 'chief_architect_request_routing_partial',
      },
      {
        args: routedChiefArchitectAcquireArgs(await lockDirFor(), {
          targetId: operatingModelConsultantId,
          chatLabel: operatingModelChatLabel,
          chatRouteHash: operatingModelChatRouteHash,
          requestClass: 'operating_model_change',
          declaredTargetId: architectureExceptionsConsultantId,
        }),
        error: 'chief_architect_request_target_id_mismatch',
      },
      {
        args: routedChiefArchitectAcquireArgs(await lockDirFor(), {
          targetId: operatingModelConsultantId,
          chatLabel: operatingModelChatLabel,
          chatRouteHash: operatingModelChatRouteHash,
          requestClass: 'operating_model_change',
          declaredChatLabel: architectureExceptionsChatLabel,
        }),
        error: 'chief_architect_request_target_chat_label_mismatch',
      },
    ];

    for (const testCase of cases) {
      const lockDir = testCase.args[testCase.args.indexOf('--lock-dir') + 1];
      const failure = await runCliFail(testCase.args, env);
      expect(failure.json.error).toBe(testCase.error);
      expect(failure.json.raw_target_url_printed).toBe(false);
      await expect(stat(lockDir)).rejects.toMatchObject({ code: 'ENOENT' });
    }

    const missionTarget = await addChiefArchitectTarget(registryPath, {
      targetId: missionChiefArchitectConsultantId,
      chatLabel: missionChiefArchitectChatLabel,
      chatRouteToken: missionChatRouteToken,
      targetKind: 'mission',
    });
    const missionReceiptPath = await createChiefArchitectRouteReceipt(missionTarget);
    const missionLockDir = await lockDirFor();
    const crossMission = await runCliFail(routedChiefArchitectAcquireArgs(missionLockDir, {
      targetId: missionChiefArchitectConsultantId,
      chatLabel: missionChiefArchitectChatLabel,
      chatRouteHash: missionChatRouteHash,
      requestClass: 'mission_artifact_review',
      declaredTargetId: 'chief-architect-mission-contract-2026-07-15-another-mission',
    }), {
      CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
      CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: missionReceiptPath,
    });
    expect(crossMission.json.error).toBe('chief_architect_request_target_id_mismatch');
    await expect(stat(missionLockDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('registration supports the two standing-role targets without replacing 00', async () => {
    const registryPath = await createChiefArchitectRegistry();
    const bootstrapReceiptPath = await createBootstrapReceipt();
    const standingBefore = JSON.parse(await readFile(registryPath, 'utf8'))
      .targets[canonicalChiefArchitectConsultantId];
    const registrations = [
      {
        targetId: operatingModelConsultantId,
        chatLabel: operatingModelChatLabel,
        chatRouteHash: operatingModelChatRouteHash,
        targetUrl: operatingModelProjectRawTargetUrlSample,
      },
      {
        targetId: architectureExceptionsConsultantId,
        chatLabel: architectureExceptionsChatLabel,
        chatRouteHash: architectureExceptionsChatRouteHash,
        targetUrl: architectureExceptionsProjectRawTargetUrlSample,
      },
    ];

    for (const registration of registrations) {
      const lockDir = await lockDirFor();
      const routeReceiptRoot = await makeTmpRoot();
      const routeReceiptPath = join(routeReceiptRoot, 'standing-role-route-receipt.json');
      const registryEnv = {
        CRM_CORE_CONSULTANT_TARGET_REGISTRY_PATH: registryPath,
        CRM_CORE_CHIEF_ARCHITECT_BOOTSTRAP_RECEIPT_PATH: bootstrapReceiptPath,
        CRM_CORE_CHIEF_ARCHITECT_ROUTE_RECEIPT_PATH: routeReceiptPath,
      };
      const holder = await runCli(
        registryUpdateAcquireArgs(lockDir, '300000', registration.targetId),
        registryEnv,
      );
      const registered = await runCliWithInput(
        registryUpdateCommandArgs(lockDir, [
          '--target-id',
          registration.targetId,
          '--target-chat-label',
          registration.chatLabel,
          '--observed-chat-label',
          registration.chatLabel,
          '--observed-chat-route-sha256',
          registration.chatRouteHash,
        ]),
        registration.targetUrl,
        {
          ...registryEnv,
          CRM_CORE_CONSULTANT_RELAY_LOCK_TOKEN: holder.json.owner_token,
        },
      );
      const registry = JSON.parse(await readFile(registryPath, 'utf8'));

      expect(registered.json).toMatchObject({
        ok: true,
        target_id: registration.targetId,
        target_kind: 'standing',
        target_registry_rebound: true,
        raw_target_url_printed: false,
      });
      expect(registry.targets[canonicalChiefArchitectConsultantId]).toEqual(standingBefore);
      expect(registry.targets[registration.targetId]).toMatchObject({
        target_id: registration.targetId,
        target_chat_label: registration.chatLabel,
        target_kind: 'standing',
        canonical_project_route_sha256: canonicalProjectRouteHash,
        canonical_chat_route_sha256: registration.chatRouteHash,
      });
      await runCli([
        script,
        'release',
        '--lock-dir',
        lockDir,
        '--owner-token',
        holder.json.owner_token,
      ], registryEnv);
    }
  });
});
