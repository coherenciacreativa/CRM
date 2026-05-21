#!/usr/bin/env node
import { execFile } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-snapshot-2026-05-21';
const MAGIC = Buffer.from('CRMVNEXTSNAP1\n', 'utf8');
const DEFAULT_KEYCHAIN_SERVICE = process.env.CRM_VNEXT_SNAPSHOT_KEYCHAIN_SERVICE || 'CRM-vNext-Snapshot';
const DEFAULT_KEYCHAIN_ACCOUNT = process.env.CRM_VNEXT_SNAPSHOT_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_ICLOUD_DIR = join(
  homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/Mantis-Archive/CRM-vNext-Snapshots',
);
const DEFAULT_REPORTS_DIR = join(homedir(), 'Documents/Mantis-Reports');

const usage = `Usage:
  node scripts/crm-vnext-snapshot.mjs [options]

Options:
  --repo-root <path>              CRM repo root. Defaults to current working directory.
  --local-dir <path>              Local encrypted snapshot directory. Defaults to .crm-vnext/snapshots/local
  --dest-dir <path>               Cloud copy directory. Defaults to iCloud Drive Mantis-Archive/CRM-vNext-Snapshots
  --reports-dir <path>            Report directory. Defaults to ~/Documents/Mantis-Reports
  --keychain-service <name>       Keychain service. Defaults to ${DEFAULT_KEYCHAIN_SERVICE}
  --keychain-account <name>       Keychain account. Defaults to ${DEFAULT_KEYCHAIN_ACCOUNT}
  --init-keychain-secret          Create a strong Keychain secret if missing
  --no-cloud-copy                 Write only the local encrypted snapshot
  --exclude-backups               Exclude .crm-vnext/backups from the snapshot
  --verify                        Decrypt and inspect the snapshot after writing
  --out <path>                    Write JSON report to a specific path
  --markdown-out <path>           Write Markdown summary to a specific path
  --help                          Show this help

Creates an encrypted CRM vNext snapshot of .crm-vnext, excluding nested snapshots.
The encrypted file can be copied to iCloud/Drive safely because the cloud receives
only ciphertext. The encryption secret is read from CRM_VNEXT_SNAPSHOT_SECRET or
from macOS Keychain; no secret or CRM personal content is printed.`;

const parseArgs = (argv) => {
  const options = {
    repoRoot: process.cwd(),
    localDir: null,
    destDir: DEFAULT_ICLOUD_DIR,
    reportsDir: DEFAULT_REPORTS_DIR,
    keychainService: DEFAULT_KEYCHAIN_SERVICE,
    keychainAccount: DEFAULT_KEYCHAIN_ACCOUNT,
    initKeychainSecret: false,
    cloudCopy: true,
    includeBackups: true,
    verify: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--init-keychain-secret') options.initKeychainSecret = true;
    else if (arg === '--no-cloud-copy') options.cloudCopy = false;
    else if (arg === '--exclude-backups') options.includeBackups = false;
    else if (arg === '--verify') options.verify = true;
    else if (arg === '--repo-root') options.repoRoot = argv[++index];
    else if (arg === '--local-dir') options.localDir = argv[++index];
    else if (arg === '--dest-dir') options.destDir = argv[++index];
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--keychain-service') options.keychainService = argv[++index];
    else if (arg === '--keychain-account') options.keychainAccount = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.repoRoot = resolve(options.repoRoot);
  options.localDir = resolve(options.repoRoot, options.localDir || '.crm-vnext/snapshots/local');
  options.destDir = resolve(options.destDir);
  options.reportsDir = resolve(options.reportsDir);
  if (!options.keychainService) throw new Error('missing_keychain_service');
  if (!options.keychainAccount) throw new Error('missing_keychain_account');
  return options;
};

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const timestampForFile = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const compactError = (error) => {
  const text = [
    error?.stderr ? String(error.stderr) : '',
    error?.stdout ? String(error.stdout) : '',
    error instanceof Error ? error.message : String(error),
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (/could not be found|item could not be found/i.test(text)) return 'keychain_secret_missing';
  if (/user interaction is not allowed/i.test(text)) return 'keychain_requires_user_unlock';
  return text.slice(0, 240) || 'unknown_error';
};

const getKeychainSecret = async (service, account) => {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-w',
      '-s',
      service,
      '-a',
      account,
    ], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    const secret = stdout.trim();
    return secret ? { secret, source: `keychain:${service}/${account}`, created: false } : null;
  } catch (error) {
    const reason = compactError(error);
    if (reason === 'keychain_secret_missing') return null;
    const wrapped = new Error(reason);
    wrapped.reason = reason;
    throw wrapped;
  }
};

const createKeychainSecret = async (service, account) => {
  const secret = randomBytes(32).toString('base64url');
  await execFileAsync('security', [
    'add-generic-password',
    '-U',
    '-s',
    service,
    '-a',
    account,
    '-w',
    secret,
  ], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  return { secret, source: `keychain:${service}/${account}`, created: true };
};

const getSecret = async (options) => {
  const envSecret = process.env.CRM_VNEXT_SNAPSHOT_SECRET;
  if (envSecret) {
    return { secret: envSecret, source: 'env:CRM_VNEXT_SNAPSHOT_SECRET', created: false };
  }

  const existing = await getKeychainSecret(options.keychainService, options.keychainAccount);
  if (existing) return existing;

  if (!options.initKeychainSecret) {
    const error = new Error('snapshot_secret_missing');
    error.reason = 'snapshot_secret_missing';
    throw error;
  }

  return createKeychainSecret(options.keychainService, options.keychainAccount);
};

const validateStore = async (repoRoot) => {
  const storePath = join(repoRoot, '.crm-vnext/person-card-store/person-cards-vnext.json');
  const store = await readJson(storePath);
  if (!store || typeof store !== 'object' || !Array.isArray(store.cards)) {
    throw new Error('invalid_person_card_store');
  }
  return {
    path: storePath,
    schemaVersion: store.schemaVersion || null,
    cardCount: store.cards.length,
  };
};

const createPlainArchive = async (options, tmpRoot) => {
  const archivePath = join(tmpRoot, 'crm-vnext-plain.tgz');
  const args = [
    '--exclude',
    '.crm-vnext/snapshots',
  ];
  if (!options.includeBackups) {
    args.push('--exclude', '.crm-vnext/backups');
  }
  args.push('-czf', archivePath, '-C', options.repoRoot, '.crm-vnext');
  await execFileAsync('tar', args, {
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return archivePath;
};

const encryptBuffer = (plaintext, secret) => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1 });
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const header = {
    schemaVersion: SCHEMA_VERSION,
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    kdfParams: { N: 16384, r: 8, p: 1, keyLength: 32 },
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
  const headerBuffer = Buffer.from(`${JSON.stringify(header)}\n`, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(headerBuffer.length, 0);
  return {
    buffer: Buffer.concat([MAGIC, lengthBuffer, headerBuffer, ciphertext]),
    header,
  };
};

const decryptSnapshot = async (snapshotPath, secret) => {
  const payload = await readFile(snapshotPath);
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('invalid_snapshot_magic');
  }
  const headerLength = payload.readUInt32BE(MAGIC.length);
  const headerStart = MAGIC.length + 4;
  const headerEnd = headerStart + headerLength;
  const header = JSON.parse(payload.subarray(headerStart, headerEnd).toString('utf8'));
  const ciphertext = payload.subarray(headerEnd);
  const key = scryptSync(secret, Buffer.from(header.salt, 'base64'), 32, header.kdfParams);
  const decipher = createDecipheriv(header.algorithm, key, Buffer.from(header.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(header.authTag, 'base64'));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

const verifySnapshot = async ({ snapshotPath, secret, expectedPlainSha256, expectedCardCount, tmpRoot }) => {
  const decrypted = await decryptSnapshot(snapshotPath, secret);
  const decryptedSha256 = sha256(decrypted);
  if (decryptedSha256 !== expectedPlainSha256) {
    throw new Error('snapshot_plaintext_hash_mismatch');
  }

  const restoreRoot = join(tmpRoot, 'restore-check');
  await mkdir(restoreRoot, { recursive: true });
  const restoredArchive = join(tmpRoot, 'restored.tgz');
  await writeFile(restoredArchive, decrypted);
  await execFileAsync('tar', ['-xzf', restoredArchive, '-C', restoreRoot], {
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const restoredStore = await readJson(join(
    restoreRoot,
    '.crm-vnext/person-card-store/person-cards-vnext.json',
  ));
  if (!Array.isArray(restoredStore.cards) || restoredStore.cards.length !== expectedCardCount) {
    throw new Error('restored_card_count_mismatch');
  }
  return {
    ok: true,
    restoredCardCount: restoredStore.cards.length,
    plaintextSha256Matches: true,
  };
};

const fileSize = async (path) => (await stat(path)).size;

const writeReport = async (options, report) => {
  const stamp = report.snapshot.startedAt.slice(0, 19).replace(/[-:T]/g, '').slice(0, 12);
  const jsonPath = resolve(options.out || join(
    options.reportsDir,
    `crm_vnext_snapshot_${stamp}.json`,
  ));
  const markdownPath = resolve(options.markdownOut || join(
    options.reportsDir,
    `crm_vnext_snapshot_${stamp}.md`,
  ));
  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, renderMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
};

const renderMarkdown = (report) => `# CRM vNext Snapshot

- Status: ${report.ok ? 'ok' : 'blocked'}
- Created at: ${report.snapshot.startedAt}
- Cards: ${report.source.cardCount}
- Local encrypted snapshot: \`${report.snapshot.localPath}\`
- Cloud encrypted snapshot: ${report.snapshot.cloudPath ? `\`${report.snapshot.cloudPath}\`` : 'not copied'}
- Encrypted size: ${report.snapshot.encryptedBytes} bytes
- Plain archive SHA-256: \`${report.snapshot.plainArchiveSha256}\`
- Encrypted snapshot SHA-256: \`${report.snapshot.encryptedSnapshotSha256}\`
- Verify: ${report.verify?.ok ? `ok (${report.verify.restoredCardCount} cards restored in temp check)` : 'not run'}
- Key source: ${report.key.source}
- Key created now: ${report.key.created ? 'yes' : 'no'}

## Safety

- CRM personal content printed: no
- Encryption secret printed: no
- Outbound/contact messages sent: no
- External systems mutated: no
- Cloud upload contents: encrypted snapshot only

## Recovery Notes

The automation can use the Keychain secret on this Mac. For disaster recovery,
keep an independent recovery copy of the snapshot secret in a password manager
or sealed physical recovery kit. Do not store the secret in this repo or in chat.
`;

const buildSnapshot = async (options) => {
  const startedAt = new Date().toISOString();
  const secretInfo = await getSecret(options);
  const source = await validateStore(options.repoRoot);
  const tmpRoot = await mkdtemp(join(tmpdir(), 'crm-vnext-snapshot-'));
  try {
    await mkdir(options.localDir, { recursive: true });
    if (options.cloudCopy) await mkdir(options.destDir, { recursive: true });

    const plainArchivePath = await createPlainArchive(options, tmpRoot);
    const plaintext = await readFile(plainArchivePath);
    const plainArchiveSha256 = sha256(plaintext);
    const encrypted = encryptBuffer(plaintext, secretInfo.secret);
    const name = `crm-vnext-snapshot-${timestampForFile(new Date(startedAt))}.tgz.enc`;
    const localPath = join(options.localDir, name);
    await writeFile(localPath, encrypted.buffer);
    const encryptedSnapshotSha256 = sha256(encrypted.buffer);
    const cloudPath = options.cloudCopy ? join(options.destDir, name) : null;
    if (cloudPath) await copyFile(localPath, cloudPath);

    const verify = options.verify
      ? await verifySnapshot({
        snapshotPath: localPath,
        secret: secretInfo.secret,
        expectedPlainSha256: plainArchiveSha256,
        expectedCardCount: source.cardCount,
        tmpRoot,
      })
      : null;

    const report = {
      schemaVersion: SCHEMA_VERSION,
      ok: true,
      mode: 'encrypted_local_snapshot_with_optional_cloud_copy',
      source: {
        repoRoot: options.repoRoot,
        crmVnextRoot: join(options.repoRoot, '.crm-vnext'),
        personCardStorePath: source.path,
        personCardStoreSchemaVersion: source.schemaVersion,
        cardCount: source.cardCount,
        included: options.includeBackups
          ? '.crm-vnext excluding nested snapshots'
          : '.crm-vnext excluding nested snapshots and backups',
      },
      snapshot: {
        startedAt,
        localPath,
        cloudPath,
        filename: basename(localPath),
        encryptedBytes: await fileSize(localPath),
        cloudEncryptedBytes: cloudPath ? await fileSize(cloudPath) : null,
        plainArchiveSha256,
        encryptedSnapshotSha256,
        encryption: {
          algorithm: encrypted.header.algorithm,
          kdf: encrypted.header.kdf,
          kdfParams: encrypted.header.kdfParams,
        },
      },
      key: {
        source: secretInfo.source,
        created: secretInfo.created,
        printed: false,
      },
      verify,
      safety: {
        localOnlyBeforeCloudCopy: true,
        cloudCopyEncryptedOnly: Boolean(cloudPath),
        crmPersonalContentPrinted: false,
        encryptionSecretPrinted: false,
        outboundPerformed: false,
        externalMutationsPerformed: false,
      },
    };
    const paths = await writeReport(options, report);
    report.report = paths;
    await writeFile(paths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return report;
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
};

const compactReport = (report) => ({
  ok: report.ok,
  schemaVersion: report.schemaVersion,
  cards: report.source.cardCount,
  localPath: report.snapshot.localPath,
  cloudPath: report.snapshot.cloudPath,
  encryptedBytes: report.snapshot.encryptedBytes,
  verify: report.verify,
  key: {
    source: report.key.source,
    created: report.key.created,
    printed: report.key.printed,
  },
  report: report.report,
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildSnapshot(options);
  console.log(JSON.stringify(compactReport(report), null, 2));
};

main().catch((error) => {
  const reason = error?.reason || error?.message || 'unknown_snapshot_error';
  if (reason === 'snapshot_secret_missing') {
    console.error([
      'crm-vnext snapshot failed: snapshot_secret_missing.',
      'Run once with --init-keychain-secret, or provide CRM_VNEXT_SNAPSHOT_SECRET in the local environment.',
      'Do not paste the secret in chat.',
    ].join(' '));
  } else {
    console.error(`crm-vnext snapshot failed: ${reason}`);
  }
  process.exitCode = 1;
});
