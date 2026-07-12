#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import { link, lstat, open, realpath, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import {
  MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION,
  PRIVATE_MAILERLITE_ROOT,
  controlledInboxQuery,
  controlledMailboxProfileMatchesAnchor,
} from './crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs';

const FILE_BRIDGE_SCHEMA_VERSION = 'crm-core-controlled-mailbox-file-bridge-v1';
const FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS = 30;
const FILE_BRIDGE_REQUEST_MAX_AGE_SECONDS = 90;
const DEFAULT_COMMAND_TIMEOUT_MS = 60_000;
const MAX_COMMAND_BYTES = 16 * 1024;

const REQUEST_KEYS = Object.freeze([
  'connector_operation',
  'digest_contract',
  'label_ids',
  'locator_private',
  'mailbox_anchor_private',
  'max_results',
  'mission_binding_private',
  'phase',
  'query_private',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'requested_at_epoch_seconds',
  'schema_version',
  'worker_contract',
]);
const MISSION_BINDING_KEYS = Object.freeze([
  'approval_contract_version',
  'mailbox_check_ordinal',
  'packet_id',
  'run_id',
]);
const DIGEST_CONTRACT_KEYS = Object.freeze([
  'message_id_digest',
  'request_digest',
  'response_digest',
]);
const LOCATOR_KEYS = Object.freeze(['sender', 'subject']);
const CLAIM_COMMAND_KEYS = Object.freeze(['command']);
const PUBLISH_COMMAND_KEYS = Object.freeze([
  'command',
  'connector_operation',
  'executed_query_private',
  'has_more',
  'profile_email_private',
  'raw_ids_private',
  'search_executed_at_epoch_seconds',
]);
const CONSUMPTION_KEYS = Object.freeze([
  'claimed_at_epoch_seconds',
  'consumption_status',
  'mission_binding_private',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'retry_allowed',
  'schema_version',
]);
const RESPONSE_KEYS = Object.freeze([
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
const READY_KEYS = Object.freeze([
  'publication_status',
  'response_digest_private',
  'request_digest_private',
  'request_id',
  'request_nonce_private',
  'schema_version',
]);

const usage = `Usage:
  node scripts/crm-vnext-controlled-mailbox-file-bridge-publisher.mjs \\
    --private-mailbox-request-json <absolute-path> [--timeout-ms <1000..60000>]

The publisher requires an interactive TTY. It never calls Gmail and never prints
private request or response values.`;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
};

const isInside = (candidate, root) => {
  const scoped = relative(resolve(root), resolve(candidate));
  return Boolean(scoped) && scoped !== '..' && !scoped.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(scoped);
};

const safeReason = (error) => {
  const reason = String(error?.message ?? 'blocked_unknown_publisher_error');
  return /^blocked_[a-z0-9_]+$/.test(reason) ? reason : 'blocked_unknown_publisher_error';
};

const assertSafeBindingString = (value, reason) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,180}$/.test(value)) throw new Error(reason);
  return value;
};

const assertPrivateText = (value, reason, maxLength = 998) => {
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength || /[\r\n\0]/.test(value)) throw new Error(reason);
  return value;
};

const assertExactGmailPlusAnchor = (value) => {
  if (typeof value !== 'string' || value !== value.toLowerCase() || /\s/.test(value)) throw new Error('blocked_publisher_mailbox_anchor_invalid');
  const match = value.match(/^([a-z0-9._%+-]+)@gmail\.com$/);
  if (!match) throw new Error('blocked_publisher_mailbox_anchor_invalid');
  const local = match[1];
  const plus = local.indexOf('+');
  if (plus <= 0 || plus === local.length - 1 || plus !== local.lastIndexOf('+')) throw new Error('blocked_publisher_mailbox_anchor_invalid');
  return value;
};

const parseArgs = (argv) => {
  const options = { help: false, requestPath: null, timeoutMs: DEFAULT_COMMAND_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--private-mailbox-request-json') options.requestPath = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else throw new Error('blocked_publisher_cli_argument_invalid');
  }
  if (!options.help && (!options.requestPath || !isAbsolute(options.requestPath))) throw new Error('blocked_publisher_request_path_invalid');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > DEFAULT_COMMAND_TIMEOUT_MS) {
    throw new Error('blocked_publisher_timeout_invalid');
  }
  return options;
};

const readPrivateFileStable = async (filePath, invalidReason) => {
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || (before.mode & 0o777) !== 0o600
      || before.nlink !== 1
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
      || before.size < 2
      || before.size > 128 * 1024
    ) throw new Error(invalidReason);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs
      || bytes.length !== after.size
    ) throw new Error(invalidReason);
    return { bytes, metadata: after };
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error(invalidReason);
    throw error;
  } finally {
    await handle?.close();
  }
};

const assertPrivateBridgeDirectory = async ({ bridgeDir, privateRoot, expectedIdentity = null }) => {
  const parentDir = dirname(bridgeDir);
  const [rootPath, parentPath, bridgePath] = await Promise.all([realpath(privateRoot), realpath(parentDir), realpath(bridgeDir)]);
  const [rootMetadata, parentBefore, before] = await Promise.all([lstat(privateRoot), lstat(parentDir), lstat(bridgeDir)]);
  const [parentAfter, after] = await Promise.all([lstat(parentDir), lstat(bridgeDir)]);
  if (
    rootPath !== resolve(privateRoot)
    || parentPath !== resolve(parentDir)
    || bridgePath !== resolve(bridgeDir)
    || !rootMetadata.isDirectory()
    || rootMetadata.isSymbolicLink()
    || (rootMetadata.mode & 0o022) !== 0
    || (typeof process.getuid === 'function' && rootMetadata.uid !== process.getuid())
    || !parentAfter.isDirectory()
    || parentAfter.isSymbolicLink()
    || (parentAfter.mode & 0o022) !== 0
    || (typeof process.getuid === 'function' && parentAfter.uid !== process.getuid())
    || parentBefore.dev !== parentAfter.dev
    || parentBefore.ino !== parentAfter.ino
    || !after.isDirectory()
    || after.isSymbolicLink()
    || (after.mode & 0o777) !== 0o700
    || (typeof process.getuid === 'function' && after.uid !== process.getuid())
    || before.dev !== after.dev
    || before.ino !== after.ino
    || !isInside(bridgePath, rootPath)
    || (expectedIdentity && (
      after.dev !== expectedIdentity.dev
      || after.ino !== expectedIdentity.ino
      || parentAfter.dev !== expectedIdentity.parentDev
      || parentAfter.ino !== expectedIdentity.parentIno
      || rootMetadata.dev !== expectedIdentity.rootDev
      || rootMetadata.ino !== expectedIdentity.rootIno
    ))
  ) throw new Error('blocked_publisher_bridge_directory_invalid');
  return { path: bridgePath, metadata: after, parentMetadata: parentAfter, rootMetadata };
};

const assertOutputMissing = async (filePath) => {
  try {
    await lstat(filePath);
    throw new Error('blocked_publisher_output_already_exists');
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
};

const validateMissionBinding = (binding) => {
  if (!exactObjectKeys(binding, MISSION_BINDING_KEYS)) throw new Error('blocked_publisher_mission_binding_invalid');
  if (binding.approval_contract_version !== MISSION_CONTRACT_APPROVAL_CONTRACT_VERSION) {
    throw new Error('blocked_publisher_mission_binding_invalid');
  }
  assertSafeBindingString(binding.run_id, 'blocked_publisher_mission_binding_invalid');
  assertSafeBindingString(binding.packet_id, 'blocked_publisher_mission_binding_invalid');
  if (!Number.isInteger(binding.mailbox_check_ordinal) || binding.mailbox_check_ordinal < 4 || binding.mailbox_check_ordinal > 8) {
    throw new Error('blocked_publisher_mission_binding_invalid');
  }
  return true;
};

const validateDigestContract = (contract) => {
  if (
    !exactObjectKeys(contract, DIGEST_CONTRACT_KEYS)
    || contract.request_digest !== 'sha256_lowercase_hex_of_utf8_json_stringify_request_without_request_digest_private'
    || contract.response_digest !== 'sha256_lowercase_hex_of_exact_response_file_bytes'
    || contract.message_id_digest !== 'sha256_lowercase_hex_of_utf8_raw_gmail_message_id'
  ) throw new Error('blocked_publisher_digest_contract_invalid');
  return true;
};

const validateRequest = ({ request, requestPath, nowMs }) => {
  if (!exactObjectKeys(request, REQUEST_KEYS)) throw new Error('blocked_publisher_request_fields_invalid');
  if (request.schema_version !== FILE_BRIDGE_SCHEMA_VERSION) throw new Error('blocked_publisher_request_version_invalid');
  if (!/^\d{2}-(?:baseline|post_action)$/.test(request.request_id)) throw new Error('blocked_publisher_request_id_invalid');
  if (basename(requestPath) !== `${request.request_id}.request.json`) throw new Error('blocked_publisher_request_filename_mismatch');
  if (!/^[a-f0-9]{64}$/.test(request.request_nonce_private) || !/^[a-f0-9]{64}$/.test(request.request_digest_private)) {
    throw new Error('blocked_publisher_request_digest_invalid');
  }
  if (
    !Number.isInteger(request.requested_at_epoch_seconds)
    || request.requested_at_epoch_seconds < 1
    || request.requested_at_epoch_seconds > Math.floor(nowMs() / 1000) + 1
    || Math.floor(nowMs() / 1000) - request.requested_at_epoch_seconds > FILE_BRIDGE_REQUEST_MAX_AGE_SECONDS
  ) throw new Error('blocked_publisher_request_stale_or_invalid');
  validateMissionBinding(request.mission_binding_private);
  validateDigestContract(request.digest_contract);
  if (request.worker_contract !== 'one_shot_request_id_no_reprocessing') throw new Error('blocked_publisher_worker_contract_invalid');
  if (request.connector_operation !== 'gmail_search_email_ids') throw new Error('blocked_publisher_connector_operation_invalid');
  if (!['baseline', 'post_action'].includes(request.phase) || !request.request_id.endsWith(`-${request.phase}`)) {
    throw new Error('blocked_publisher_phase_invalid');
  }
  if (!Array.isArray(request.label_ids) || request.label_ids.length !== 1 || request.label_ids[0] !== 'INBOX' || request.max_results !== 2) {
    throw new Error('blocked_publisher_search_bounds_invalid');
  }
  assertExactGmailPlusAnchor(request.mailbox_anchor_private);
  if (!exactObjectKeys(request.locator_private, LOCATOR_KEYS)) throw new Error('blocked_publisher_locator_invalid');
  assertPrivateText(request.locator_private.sender, 'blocked_publisher_locator_invalid');
  assertPrivateText(request.locator_private.subject, 'blocked_publisher_locator_invalid');
  assertPrivateText(request.query_private, 'blocked_publisher_query_invalid', 8 * 1024);
  const times = request.query_private.match(/\safter:(\d+)\sbefore:(\d+)\s/);
  if (!times) throw new Error('blocked_publisher_query_invalid');
  const afterEpochSeconds = Number.parseInt(times[1], 10);
  const beforeEpochSeconds = Number.parseInt(times[2], 10);
  if (!Number.isSafeInteger(afterEpochSeconds) || !Number.isSafeInteger(beforeEpochSeconds) || afterEpochSeconds >= beforeEpochSeconds) {
    throw new Error('blocked_publisher_query_invalid');
  }
  const expectedQuery = controlledInboxQuery({
    mailboxAnchor: request.mailbox_anchor_private,
    locator: {
      sender_private: request.locator_private.sender,
      subject_private: request.locator_private.subject,
    },
    afterEpochSeconds,
    beforeEpochSeconds,
  });
  if (request.query_private !== expectedQuery) throw new Error('blocked_publisher_query_invalid');
  const { request_digest_private: ignored, ...requestWithoutDigest } = request;
  if (sha256(JSON.stringify(requestWithoutDigest)) !== request.request_digest_private) {
    throw new Error('blocked_publisher_request_digest_invalid');
  }
  return true;
};

const parseJsonBytes = (bytes, reason) => {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { throw new Error(reason); }
};

const prepareFileBridgePublisher = async ({ requestPath, privateRoot = PRIVATE_MAILERLITE_ROOT, nowMs = () => Date.now() }) => {
  if (!requestPath || !isAbsolute(requestPath)) throw new Error('blocked_publisher_request_path_invalid');
  const bridgeDir = dirname(resolve(requestPath));
  const bridge = await assertPrivateBridgeDirectory({ bridgeDir, privateRoot });
  const canonicalRequestPath = await realpath(requestPath);
  if (canonicalRequestPath !== resolve(requestPath) || dirname(canonicalRequestPath) !== bridge.path) {
    throw new Error('blocked_publisher_request_path_invalid');
  }
  const requestFile = await readPrivateFileStable(canonicalRequestPath, 'blocked_publisher_request_permissions_or_stability');
  const request = parseJsonBytes(requestFile.bytes, 'blocked_publisher_request_json_invalid');
  validateRequest({ request, requestPath: canonicalRequestPath, nowMs });
  const paths = {
    request: canonicalRequestPath,
    consumption: resolve(bridge.path, `${request.request_id}.consumed.json`),
    response: resolve(bridge.path, `${request.request_id}.response.json`),
    ready: resolve(bridge.path, `${request.request_id}.ready.json`),
  };
  await Promise.all([paths.consumption, paths.response, paths.ready].map(assertOutputMissing));
  return {
    bridgeDir: bridge.path,
    bridgeIdentity: {
      dev: bridge.metadata.dev,
      ino: bridge.metadata.ino,
      parentDev: bridge.parentMetadata.dev,
      parentIno: bridge.parentMetadata.ino,
      rootDev: bridge.rootMetadata.dev,
      rootIno: bridge.rootMetadata.ino,
    },
    privateRoot: resolve(privateRoot),
    paths,
    request,
    requestFileDigest: sha256(requestFile.bytes),
    requestMetadata: requestFile.metadata,
  };
};

const assertPublisherContextStable = async (context) => {
  await assertPrivateBridgeDirectory({
    bridgeDir: context.bridgeDir,
    privateRoot: context.privateRoot,
    expectedIdentity: context.bridgeIdentity,
  });
  const requestFile = await readPrivateFileStable(context.paths.request, 'blocked_publisher_request_permissions_or_stability');
  if (
    requestFile.metadata.dev !== context.requestMetadata.dev
    || requestFile.metadata.ino !== context.requestMetadata.ino
    || requestFile.metadata.mtimeMs !== context.requestMetadata.mtimeMs
    || requestFile.metadata.size !== context.requestMetadata.size
    || sha256(requestFile.bytes) !== context.requestFileDigest
  ) throw new Error('blocked_publisher_request_changed');
  return true;
};

const syncDirectory = async (directoryPath) => {
  let directory;
  try {
    directory = await open(directoryPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await directory.stat();
    if (!metadata.isDirectory()) throw new Error('blocked_publisher_bridge_directory_invalid');
    await directory.sync();
  } catch (error) {
    if (error?.code === 'ELOOP') throw new Error('blocked_publisher_bridge_directory_invalid');
    throw error;
  } finally {
    await directory?.close();
  }
};

const writeExclusiveAtomic = async ({ filePath, bytes, existsReason }) => {
  const tempPath = resolve(dirname(filePath), `.${basename(filePath)}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`);
  let handle;
  try {
    handle = await open(
      tempPath,
      FS_CONSTANTS.O_WRONLY | FS_CONSTANTS.O_CREAT | FS_CONSTANTS.O_EXCL | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await link(tempPath, filePath);
    await unlink(tempPath);
    await syncDirectory(dirname(filePath));
    const metadata = await lstat(filePath);
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || metadata.nlink !== 1
      || (metadata.mode & 0o777) !== 0o600
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) throw new Error('blocked_publisher_output_permissions_invalid');
    return metadata;
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(existsReason);
    throw error;
  } finally {
    await handle?.close();
    await unlink(tempPath).catch(() => {});
  }
};

const waitForFilesystemTick = async (previousMtimeMs, sleep = (delayMs) => new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs))) => {
  const delayMs = Math.max(2, Math.ceil(previousMtimeMs - Date.now()) + 2);
  if (delayMs > 1_000) throw new Error('blocked_publisher_file_time_invalid');
  await sleep(delayMs);
};

const expectedConsumption = ({ request, claimedAtEpochSeconds }) => ({
  schema_version: request.schema_version,
  request_id: request.request_id,
  request_nonce_private: request.request_nonce_private,
  request_digest_private: request.request_digest_private,
  mission_binding_private: request.mission_binding_private,
  consumption_status: 'claimed_before_connector_call',
  retry_allowed: false,
  claimed_at_epoch_seconds: claimedAtEpochSeconds,
});

const validateConsumption = ({ consumption, request }) => {
  if (!exactObjectKeys(consumption, CONSUMPTION_KEYS)) throw new Error('blocked_publisher_consumption_invalid');
  if (
    consumption.schema_version !== request.schema_version
    || consumption.request_id !== request.request_id
    || consumption.request_nonce_private !== request.request_nonce_private
    || consumption.request_digest_private !== request.request_digest_private
    || JSON.stringify(consumption.mission_binding_private) !== JSON.stringify(request.mission_binding_private)
    || consumption.consumption_status !== 'claimed_before_connector_call'
    || consumption.retry_allowed !== false
    || !Number.isInteger(consumption.claimed_at_epoch_seconds)
    || consumption.claimed_at_epoch_seconds < request.requested_at_epoch_seconds - 1
  ) throw new Error('blocked_publisher_consumption_invalid');
  return true;
};

const claimFileBridgeConsumption = async ({ context, nowMs = () => Date.now(), sleep }) => {
  await assertPublisherContextStable(context);
  await Promise.all([context.paths.consumption, context.paths.response, context.paths.ready].map(assertOutputMissing));
  const claimedAtEpochSeconds = Math.floor(nowMs() / 1000);
  if (
    claimedAtEpochSeconds < context.request.requested_at_epoch_seconds - 1
    || claimedAtEpochSeconds - context.request.requested_at_epoch_seconds > FILE_BRIDGE_REQUEST_MAX_AGE_SECONDS
  ) throw new Error('blocked_publisher_claim_time_invalid');
  const consumption = expectedConsumption({ request: context.request, claimedAtEpochSeconds });
  await waitForFilesystemTick(context.requestMetadata.mtimeMs, sleep);
  await assertPublisherContextStable(context);
  const metadata = await writeExclusiveAtomic({
    filePath: context.paths.consumption,
    bytes: `${JSON.stringify(consumption)}\n`,
    existsReason: 'blocked_publisher_consumption_already_claimed',
  });
  await assertPublisherContextStable(context);
  if (metadata.mtimeMs <= context.requestMetadata.mtimeMs) throw new Error('blocked_publisher_consumption_file_time_invalid');
  return { consumption, metadata };
};

const validateRawIds = (rawIds) => {
  if (!Array.isArray(rawIds) || rawIds.length > 2) throw new Error('blocked_publisher_raw_ids_invalid');
  if (rawIds.some((value) => typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(value))) {
    throw new Error('blocked_publisher_raw_ids_invalid');
  }
  if (new Set(rawIds).size !== rawIds.length) throw new Error('blocked_publisher_raw_ids_invalid');
  return rawIds;
};

const validatePublishCommand = ({ command, context, consumption, nowMs }) => {
  if (!exactObjectKeys(command, PUBLISH_COMMAND_KEYS) || command.command !== 'publish_result') {
    throw new Error('blocked_publisher_publish_command_invalid');
  }
  if (command.connector_operation !== 'gmail_search_email_ids' || command.executed_query_private !== context.request.query_private) {
    throw new Error('blocked_publisher_query_binding_invalid');
  }
  if (!controlledMailboxProfileMatchesAnchor(command.profile_email_private, context.request.mailbox_anchor_private)) {
    throw new Error('blocked_publisher_profile_binding_invalid');
  }
  validateRawIds(command.raw_ids_private);
  if (command.has_more !== false) throw new Error('blocked_publisher_pagination_invalid');
  const acceptedAtEpochSeconds = Math.floor(nowMs() / 1000);
  if (
    !Number.isInteger(command.search_executed_at_epoch_seconds)
    || command.search_executed_at_epoch_seconds < context.request.requested_at_epoch_seconds - 1
    || command.search_executed_at_epoch_seconds < consumption.claimed_at_epoch_seconds
    || command.search_executed_at_epoch_seconds > acceptedAtEpochSeconds + 1
    || acceptedAtEpochSeconds - command.search_executed_at_epoch_seconds > FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS
  ) throw new Error('blocked_publisher_search_time_invalid');
  return true;
};

const validateResponse = ({ response, request, acceptedAtEpochSeconds }) => {
  if (!exactObjectKeys(response, RESPONSE_KEYS)) throw new Error('blocked_publisher_response_invalid');
  if (
    response.schema_version !== request.schema_version
    || response.request_id !== request.request_id
    || response.request_nonce_private !== request.request_nonce_private
    || response.request_digest_private !== request.request_digest_private
    || JSON.stringify(response.mission_binding_private) !== JSON.stringify(request.mission_binding_private)
    || response.connector_operation !== 'gmail_search_email_ids'
    || response.query_binding_status !== 'matched'
    || !controlledMailboxProfileMatchesAnchor(response.profile_email_private, request.mailbox_anchor_private)
    || response.has_more !== false
    || response.worker_consumption_status !== 'consumed_once'
    || !Array.isArray(response.id_digests_private)
    || response.id_digests_private.length > 2
    || response.id_digests_private.some((value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    || new Set(response.id_digests_private).size !== response.id_digests_private.length
    || !Number.isInteger(response.search_executed_at_epoch_seconds)
    || response.search_executed_at_epoch_seconds > acceptedAtEpochSeconds + 1
    || acceptedAtEpochSeconds - response.search_executed_at_epoch_seconds > FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS
  ) throw new Error('blocked_publisher_response_invalid');
  return true;
};

const publishFileBridgeResult = async ({ context, claimed, command, nowMs = () => Date.now(), sleep }) => {
  await assertPublisherContextStable(context);
  await Promise.all([context.paths.response, context.paths.ready].map(assertOutputMissing));
  let consumptionFile;
  try {
    consumptionFile = await readPrivateFileStable(context.paths.consumption, 'blocked_publisher_consumption_invalid');
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('blocked_publisher_consumption_missing');
    throw error;
  }
  const consumption = parseJsonBytes(consumptionFile.bytes, 'blocked_publisher_consumption_invalid');
  validateConsumption({ consumption, request: context.request });
  if (
    !claimed
    || claimed.metadata.dev !== consumptionFile.metadata.dev
    || claimed.metadata.ino !== consumptionFile.metadata.ino
    || JSON.stringify(claimed.consumption) !== JSON.stringify(consumption)
  ) throw new Error('blocked_publisher_consumption_context_mismatch');
  validatePublishCommand({ command, context, consumption, nowMs });
  const response = {
    schema_version: context.request.schema_version,
    request_id: context.request.request_id,
    request_nonce_private: context.request.request_nonce_private,
    request_digest_private: context.request.request_digest_private,
    mission_binding_private: context.request.mission_binding_private,
    connector_operation: 'gmail_search_email_ids',
    query_binding_status: 'matched',
    profile_email_private: command.profile_email_private,
    id_digests_private: command.raw_ids_private.map((value) => sha256(value)),
    has_more: false,
    search_executed_at_epoch_seconds: command.search_executed_at_epoch_seconds,
    worker_consumption_status: 'consumed_once',
  };
  validateResponse({ response, request: context.request, acceptedAtEpochSeconds: Math.floor(nowMs() / 1000) });
  const responseBytes = `${JSON.stringify(response)}\n`;
  await waitForFilesystemTick(consumptionFile.metadata.mtimeMs, sleep);
  await assertPublisherContextStable(context);
  const responseMetadata = await writeExclusiveAtomic({
    filePath: context.paths.response,
    bytes: responseBytes,
    existsReason: 'blocked_publisher_response_already_exists',
  });
  await assertPublisherContextStable(context);
  if (responseMetadata.mtimeMs <= consumptionFile.metadata.mtimeMs) throw new Error('blocked_publisher_response_file_time_invalid');
  const ready = {
    schema_version: context.request.schema_version,
    request_id: context.request.request_id,
    request_nonce_private: context.request.request_nonce_private,
    request_digest_private: context.request.request_digest_private,
    response_digest_private: sha256(responseBytes),
    publication_status: 'atomic_response_ready',
  };
  if (!exactObjectKeys(ready, READY_KEYS)) throw new Error('blocked_publisher_ready_invalid');
  await waitForFilesystemTick(responseMetadata.mtimeMs, sleep);
  await assertPublisherContextStable(context);
  const readyMetadata = await writeExclusiveAtomic({
    filePath: context.paths.ready,
    bytes: `${JSON.stringify(ready)}\n`,
    existsReason: 'blocked_publisher_ready_already_exists',
  });
  await assertPublisherContextStable(context);
  if (readyMetadata.mtimeMs < responseMetadata.mtimeMs || readyMetadata.mtimeMs <= context.requestMetadata.mtimeMs) {
    throw new Error('blocked_publisher_ready_file_time_invalid');
  }
  return { idCount: response.id_digests_private.length };
};

const parseCommandLine = (line, reason) => {
  if (typeof line !== 'string' || Buffer.byteLength(line, 'utf8') > MAX_COMMAND_BYTES) throw new Error(reason);
  try { return JSON.parse(line); }
  catch { throw new Error(reason); }
};

const readNextLine = async ({ iterator, timeoutMs, reason }) => {
  let timeout;
  try {
    const result = await Promise.race([
      iterator.next(),
      new Promise((_, rejectPromise) => {
        timeout = setTimeout(() => rejectPromise(new Error(reason)), timeoutMs);
      }),
    ]);
    if (!result || result.done) throw new Error(reason);
    return result.value;
  } finally {
    clearTimeout(timeout);
  }
};

const remainingRequestTimeout = ({ context, nowMs, configuredTimeoutMs }) => {
  const requestDeadlineMs = (context.request.requested_at_epoch_seconds + FILE_BRIDGE_REQUEST_MAX_AGE_SECONDS) * 1000;
  const remaining = requestDeadlineMs - nowMs();
  if (remaining < 1) throw new Error('blocked_publisher_request_stale_or_invalid');
  return Math.max(1, Math.min(configuredTimeoutMs, remaining));
};

const runPublisherSession = async ({
  requestPath,
  privateRoot = PRIVATE_MAILERLITE_ROOT,
  terminal,
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
  nowMs = () => Date.now(),
  sleep,
}) => {
  if (!terminal?.isTTY || typeof terminal.setRawMode !== 'function') {
    terminal?.close?.();
    throw new Error('blocked_publisher_interactive_tty_required');
  }
  if (!terminal?.iterator || typeof terminal.iterator.next !== 'function' || typeof terminal.writeEvent !== 'function') {
    throw new Error('blocked_publisher_terminal_contract_invalid');
  }
  let rawModeEnabled = false;
  try {
    terminal.setRawMode(true);
    rawModeEnabled = true;
    const context = await prepareFileBridgePublisher({ requestPath, privateRoot, nowMs });
    terminal.writeEvent({ status: 'waiting_for_consumption_claim', request_id: context.request.request_id });
    const claimLine = await readNextLine({
      iterator: terminal.iterator,
      timeoutMs: remainingRequestTimeout({ context, nowMs, configuredTimeoutMs: timeoutMs }),
      reason: 'blocked_publisher_claim_timeout_or_eof',
    });
    const claimCommand = parseCommandLine(claimLine, 'blocked_publisher_claim_command_invalid');
    if (!exactObjectKeys(claimCommand, CLAIM_COMMAND_KEYS) || claimCommand.command !== 'claim_consumption') {
      throw new Error('blocked_publisher_claim_command_invalid');
    }
    const claimed = await claimFileBridgeConsumption({ context, nowMs, sleep });
    terminal.writeEvent({
      status: 'consumption_claimed',
      request_id: context.request.request_id,
      mailbox_check_ordinal: context.request.mission_binding_private.mailbox_check_ordinal,
    });
    const publishLine = await readNextLine({
      iterator: terminal.iterator,
      timeoutMs: remainingRequestTimeout({ context, nowMs, configuredTimeoutMs: timeoutMs }),
      reason: 'blocked_publisher_result_timeout_or_eof',
    });
    const command = parseCommandLine(publishLine, 'blocked_publisher_publish_command_invalid');
    const published = await publishFileBridgeResult({ context, claimed, command, nowMs, sleep });
    terminal.writeEvent({
      status: 'response_ready',
      request_id: context.request.request_id,
      id_count: published.idCount,
      raw_private_values_emitted: false,
    });
    return { ok: true, status: 'response_ready', id_count: published.idCount };
  } finally {
    if (rawModeEnabled) terminal.setRawMode(false);
    terminal.close?.();
  }
};

const orchestrateOneShotMailboxBridge = async ({ startPublisher, claimConsumption, connectorSearch, publishResult }) => {
  const publisher = await startPublisher();
  if (!publisher?.waiting || !publisher?.session) {
    return { ok: false, status: 'blocked_publisher_not_waiting', claim_count: 0, connector_call_count: 0, publication_count: 0 };
  }
  const claimAcknowledgment = await claimConsumption(publisher.session);
  if (claimAcknowledgment?.claimed !== true) {
    return { ok: false, status: 'blocked_consumption_claim_not_confirmed', claim_count: 0, connector_call_count: 0, publication_count: 0 };
  }
  const connectorResult = await connectorSearch();
  await publishResult(publisher.session, connectorResult);
  return { ok: true, status: 'published_once', claim_count: 1, connector_call_count: 1, publication_count: 1 };
};

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage}\n`);
    return { ok: true, help: true };
  }
  const input = deps.stdin ?? process.stdin;
  const output = deps.stdout ?? process.stdout;
  const lineReader = deps.lineReader ?? createInterface({ input, crlfDelay: Infinity, terminal: false });
  const terminal = deps.terminal ?? {
    isTTY: Boolean(input.isTTY && output.isTTY),
    setRawMode: (enabled) => input.setRawMode(enabled),
    iterator: lineReader[Symbol.asyncIterator](),
    writeEvent: (event) => output.write(`${JSON.stringify(event)}\n`),
    close: () => lineReader.close(),
  };
  return runPublisherSession({
    requestPath: options.requestPath,
    privateRoot: deps.privateRoot ?? PRIVATE_MAILERLITE_ROOT,
    terminal,
    timeoutMs: options.timeoutMs,
    nowMs: deps.nowMs ?? (() => Date.now()),
    sleep: deps.sleep,
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stdout.write(`${JSON.stringify({ ok: false, status: 'blocked', reason: safeReason(error) })}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_COMMAND_TIMEOUT_MS,
  FILE_BRIDGE_REQUEST_MAX_AGE_SECONDS,
  FILE_BRIDGE_RESPONSE_FRESHNESS_SECONDS,
  FILE_BRIDGE_SCHEMA_VERSION,
  claimFileBridgeConsumption,
  orchestrateOneShotMailboxBridge,
  parseArgs,
  prepareFileBridgePublisher,
  publishFileBridgeResult,
  run,
  runPublisherSession,
  safeReason,
  validateRequest,
};
