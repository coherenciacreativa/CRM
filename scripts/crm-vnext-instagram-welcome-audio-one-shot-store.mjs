import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rmdir,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

const WELCOME_AUDIO_ONE_SHOT_STORE_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_one_shot_store_v1';
const WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE =
  'crm_core_instagram_welcome_audio_operational_rail_v1';
const WELCOME_AUDIO_ONE_SHOT_STORE_POLICY = Object.freeze({
  DETERMINISTIC_NO_EFFECT_TEST: 'deterministic_no_effect_test',
});
const WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE = Object.freeze({
  READY: 'ready',
  READY_PARTIAL: 'ready_partial',
  PENDING: 'pending',
  TERMINAL: 'terminal',
  UNKNOWN: 'unknown',
});
const WELCOME_AUDIO_ONE_SHOT_STORE_ERROR = Object.freeze({
  INPUT_INVALID: 'store_input_invalid',
  ROOT_INVALID: 'store_root_invalid',
  RECORD_INVALID: 'store_record_invalid',
  RECORD_CHANGED: 'store_record_changed',
  MUTEX_BUSY: 'store_mutex_busy',
  EVIDENCE_PREEXISTING: 'store_evidence_preexisting',
  EVIDENCE_AMBIGUOUS: 'store_evidence_ambiguous',
});

const MAX_RECORD_BYTES = 256 * 1024;

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const hasExactPermissionBits = (metadata, expected) =>
  (metadata.mode & 0o7777) === expected;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const stableJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`, 'utf8');

const isInside = (candidate, parent) => {
  const suffix = relative(parent, candidate);
  return suffix !== ''
    && suffix !== '..'
    && !suffix.startsWith(`..${sep}`)
    && !isAbsolute(suffix);
};

const assertAbsoluteCleanPath = (value) => {
  const segments = typeof value === 'string' ? value.split(sep) : [];
  if (
    typeof value !== 'string'
    || !isAbsolute(value)
    || value !== resolve(value)
    || segments.some((segment) => segment === '.' || segment === '..')
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.INPUT_INVALID);
};

const buildWelcomeAudioOneShotStorePaths = ({
  registryRoot,
  expectedCanonicalOperationSha256,
  namespace = WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
}) => {
  assertAbsoluteCleanPath(registryRoot);
  if (!isSha256(expectedCanonicalOperationSha256)) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.INPUT_INVALID);
  }
  if (
    typeof namespace !== 'string'
    || !/^[a-z0-9_]{1,160}$/.test(namespace)
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.INPUT_INVALID);
  const fingerprint = sha256(`${namespace}:${expectedCanonicalOperationSha256}`);
  const root = resolve(registryRoot);
  return Object.freeze({
    root,
    preclaim: join(root, `preclaim-${fingerprint}.json`),
    ready: join(root, `ready-${fingerprint}.json`),
    pending: join(root, `pending-${fingerprint}.json`),
    terminal: join(root, `terminal-${fingerprint}.json`),
    mutex: join(root, `mutex-${fingerprint}.lock`),
    pendingTempPrefix: `.pending-${fingerprint}.json.tmp-`,
    terminalTempPrefix: `.terminal-${fingerprint}.json.tmp-`,
    readyTempPrefix: `.ready-${fingerprint}.json.tmp-`,
  });
};

const assertWelcomeAudioOneShotStoreRoot = async ({
  registryRoot,
  policy,
  expectedIdentity = null,
}) => {
  assertAbsoluteCleanPath(registryRoot);
  if (policy !== WELCOME_AUDIO_ONE_SHOT_STORE_POLICY.DETERMINISTIC_NO_EFFECT_TEST) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
  }
  const unresolvedRoot = resolve(registryRoot);
  const unresolvedTempRoot = resolve(tmpdir());
  const canonicalTempRoot = await realpath(tmpdir());
  const directUnderUnresolvedTemp = isInside(unresolvedRoot, unresolvedTempRoot)
    && dirname(unresolvedRoot) === unresolvedTempRoot;
  const directUnderCanonicalTemp = isInside(unresolvedRoot, canonicalTempRoot)
    && dirname(unresolvedRoot) === canonicalTempRoot;
  if (!directUnderUnresolvedTemp && !directUnderCanonicalTemp) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
  }
  const unresolvedMetadata = await lstat(unresolvedRoot);
  if (
    !unresolvedMetadata.isDirectory()
    || unresolvedMetadata.isSymbolicLink()
    || !hasExactPermissionBits(unresolvedMetadata, 0o700)
    || (typeof process.getuid === 'function' && unresolvedMetadata.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);

  const canonicalRoot = await realpath(unresolvedRoot);
  const metadata = await lstat(canonicalRoot);
  if (
    !isInside(canonicalRoot, canonicalTempRoot)
    || dirname(canonicalRoot) !== canonicalTempRoot
    || canonicalRoot !== join(canonicalTempRoot, basename(unresolvedRoot))
    || !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !hasExactPermissionBits(metadata, 0o700)
    || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    || metadata.dev !== unresolvedMetadata.dev
    || metadata.ino !== unresolvedMetadata.ino
    || metadata.uid !== unresolvedMetadata.uid
    || metadata.mode !== unresolvedMetadata.mode
    || (expectedIdentity && (
      metadata.dev !== expectedIdentity.dev
      || metadata.ino !== expectedIdentity.ino
      || metadata.uid !== expectedIdentity.uid
    ))
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
  return Object.freeze({
    path: canonicalRoot,
    dev: metadata.dev,
    ino: metadata.ino,
    uid: metadata.uid,
    policy,
  });
};

const syncWelcomeAudioOneShotStoreDirectory = async ({
  registryIdentity,
}) => {
  let handle;
  try {
    handle = await open(
      registryIdentity.path,
      FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW,
    );
    const metadata = await handle.stat();
    if (
      !metadata.isDirectory()
      || !hasExactPermissionBits(metadata, 0o700)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
      || metadata.dev !== registryIdentity.dev
      || metadata.ino !== registryIdentity.ino
      || metadata.uid !== registryIdentity.uid
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
    await handle.sync();
  } catch (error) {
    if (error?.code === 'ELOOP') {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const readWelcomeAudioOneShotRecordStable = async ({
  filePath,
  registryIdentity,
  maxBytes = MAX_RECORD_BYTES,
}) => {
  assertAbsoluteCleanPath(filePath);
  if (dirname(filePath) !== registryIdentity.path) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID);
  }
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || !hasExactPermissionBits(before, 0o600)
      || before.nlink !== 1
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
      || before.dev !== registryIdentity.dev
      || before.size < 2
      || before.size > maxBytes
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      !after.isFile()
      || !hasExactPermissionBits(after, 0o600)
      || after.nlink !== 1
      || (typeof process.getuid === 'function' && after.uid !== process.getuid())
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || before.ctimeMs !== after.ctimeMs
      || before.mode !== after.mode
      || before.nlink !== after.nlink
      || before.uid !== after.uid
      || bytes.length !== after.size
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_CHANGED);
    let snapshot;
    try {
      snapshot = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID);
    }
    return Object.freeze({
      snapshot,
      bytes,
      digest: sha256(bytes),
      metadata: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
        mode: after.mode,
        nlink: after.nlink,
        uid: after.uid,
      }),
    });
  } catch (error) {
    if (error?.code === 'ELOOP' || error?.code === 'ENOENT') {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const assertSameWelcomeAudioOneShotRecord = (before, after) => {
  if (
    before.digest !== after.digest
    || before.metadata.dev !== after.metadata.dev
    || before.metadata.ino !== after.metadata.ino
    || before.metadata.size !== after.metadata.size
    || before.metadata.mtimeMs !== after.metadata.mtimeMs
    || before.metadata.ctimeMs !== after.metadata.ctimeMs
    || before.metadata.mode !== after.metadata.mode
    || before.metadata.nlink !== after.metadata.nlink
    || before.metadata.uid !== after.metadata.uid
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_CHANGED);
};

const acquireWelcomeAudioOneShotStoreMutex = async ({
  paths,
  registryIdentity,
}) => {
  try {
    await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: paths.root,
      policy: registryIdentity.policy,
      expectedIdentity: registryIdentity,
    });
    await mkdir(paths.mutex, { mode: 0o700 });
    await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
    const metadata = await lstat(paths.mutex);
    if (
      !metadata.isDirectory()
      || metadata.isSymbolicLink()
      || !hasExactPermissionBits(metadata, 0o700)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
      || metadata.dev !== registryIdentity.dev
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
    return Object.freeze({
      dev: metadata.dev,
      ino: metadata.ino,
      uid: metadata.uid,
      mode: metadata.mode,
    });
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
};

const releaseWelcomeAudioOneShotStoreMutex = async ({
  paths,
  registryIdentity,
  mutexIdentity,
}) => {
  await assertWelcomeAudioOneShotStoreRoot({
    registryRoot: paths.root,
    policy: registryIdentity.policy,
    expectedIdentity: registryIdentity,
  });
  const metadata = await lstat(paths.mutex);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !hasExactPermissionBits(metadata, 0o700)
    || metadata.dev !== mutexIdentity.dev
    || metadata.ino !== mutexIdentity.ino
    || metadata.uid !== mutexIdentity.uid
    || metadata.mode !== mutexIdentity.mode
  ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
  await rmdir(paths.mutex);
  await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
};

const writeWelcomeAudioOneShotExclusiveDurable = async ({
  filePath,
  value,
  registryIdentity,
  existsReason = WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING,
}) => {
  assertAbsoluteCleanPath(filePath);
  if (dirname(filePath) !== registryIdentity.path) {
    throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.ROOT_INVALID);
  }
  const temporaryPath = join(
    registryIdentity.path,
    `.${basename(filePath)}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`,
  );
  let handle;
  try {
    await assertWelcomeAudioOneShotStoreRoot({
      registryRoot: registryIdentity.path,
      policy: registryIdentity.policy,
      expectedIdentity: registryIdentity,
    });
    handle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(stableJsonBytes(value));
    await handle.sync();
    await handle.close();
    handle = null;
    await link(temporaryPath, filePath);
    await unlink(temporaryPath);
    await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
    const metadata = await lstat(filePath);
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.nlink !== 1
      || !hasExactPermissionBits(metadata, 0o600)
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
      || metadata.dev !== registryIdentity.dev
    ) throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.RECORD_INVALID);
    return metadata;
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(existsReason);
    throw error;
  } finally {
    await handle?.close();
    try {
      await unlink(temporaryPath);
    } catch {
      // Missing temporary evidence is expected after a successful link/unlink.
    }
  }
};

const promoteWelcomeAudioOneShotPendingToTerminal = async ({
  paths,
  registryIdentity,
}) => {
  try {
    await link(paths.pending, paths.terminal);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING);
    }
    throw error;
  }
  await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
  await unlink(paths.pending);
  await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
};

const publishWelcomeAudioOneShotTerminalFromPending = async ({
  paths,
  terminalValue,
  registryIdentity,
}) => {
  await writeWelcomeAudioOneShotExclusiveDurable({
    filePath: paths.terminal,
    value: terminalValue,
    registryIdentity,
    existsReason: WELCOME_AUDIO_ONE_SHOT_STORE_ERROR.EVIDENCE_PREEXISTING,
  });
  await unlink(paths.pending);
  await syncWelcomeAudioOneShotStoreDirectory({ registryIdentity });
};

const inspectWelcomeAudioOneShotStoreEvidence = async ({
  paths,
  registryIdentity,
}) => {
  await assertWelcomeAudioOneShotStoreRoot({
    registryRoot: paths.root,
    policy: registryIdentity.policy,
    expectedIdentity: registryIdentity,
  });
  const entries = await readdir(paths.root);
  if (entries.includes(basename(paths.terminal))) {
    return WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.TERMINAL;
  }
  if (
    entries.includes(basename(paths.pending))
    || entries.some((entry) => entry.startsWith(paths.pendingTempPrefix))
    || entries.some((entry) => entry.startsWith(paths.terminalTempPrefix))
  ) return WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.UNKNOWN;
  if (entries.some((entry) => entry.startsWith(paths.readyTempPrefix))) {
    return WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY_PARTIAL;
  }
  if (entries.includes(basename(paths.ready))) {
    return WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE.READY;
  }
  return null;
};

export {
  WELCOME_AUDIO_ONE_SHOT_STORE_CONTRACT_VERSION,
  WELCOME_AUDIO_ONE_SHOT_STORE_ERROR,
  WELCOME_AUDIO_ONE_SHOT_STORE_EVIDENCE,
  WELCOME_AUDIO_ONE_SHOT_STORE_POLICY,
  WELCOME_AUDIO_OPERATIONAL_RAIL_NAMESPACE,
  acquireWelcomeAudioOneShotStoreMutex,
  assertSameWelcomeAudioOneShotRecord,
  assertWelcomeAudioOneShotStoreRoot,
  buildWelcomeAudioOneShotStorePaths,
  inspectWelcomeAudioOneShotStoreEvidence,
  publishWelcomeAudioOneShotTerminalFromPending,
  promoteWelcomeAudioOneShotPendingToTerminal,
  readWelcomeAudioOneShotRecordStable,
  releaseWelcomeAudioOneShotStoreMutex,
  stableJsonBytes,
  syncWelcomeAudioOneShotStoreDirectory,
  writeWelcomeAudioOneShotExclusiveDurable,
};
