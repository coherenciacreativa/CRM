import { createHash, randomBytes } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioSealedManifestSha256,
  validateSealedWelcomeAudioBacklogManifest,
} from './crm-vnext-instagram-welcome-audio-live-preflight.mjs';

const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_authority_bootstrap_builder_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_authority_bootstrap_authorization_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_authority_bootstrap_source_capture_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_authority_bootstrap_asset_selection_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_no_live_operation_bindings_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_authority_bootstrap_receipt_v1';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID =
  'crm_core_sealed_backlog_manifest_bootstrap_no_effect_v1_20260716';
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS = 8;
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_EXECUTION_MODE =
  'local_owner_only_no_live_staging_no_external_effect';

const PRIVATE_INSTAGRAM_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
);
const FIXED_BOOTSTRAP_INPUT_ROOT = join(
  PRIVATE_INSTAGRAM_ROOT,
  'crm-core-welcome-audio-authority-bootstrap-input-v1',
);
const FIXED_BOOTSTRAP_STAGING_ROOT = join(
  PRIVATE_INSTAGRAM_ROOT,
  'crm-core-welcome-audio-authority-bootstrap-staging-v1',
);
const FIXED_LIVE_AUTHORITY_ROOT = join(
  PRIVATE_INSTAGRAM_ROOT,
  'crm-core-welcome-audio-live-authority-v1',
);

const BOOTSTRAP_INPUT_FILE_NAMES = Object.freeze({
  authorization: 'bootstrap-authorization-v1.json',
  sourceCapture: 'source-capture-v1.json',
  assetSelection: 'asset-selection-v1.json',
});
const BOOTSTRAP_STAGING_FILE_NAMES = Object.freeze({
  interval: 'campaign-interval-v1.json',
  manifest: 'sealed-backlog-manifest-v1.json',
  operationBindings: 'operation-bindings-v1.json',
  receipt: 'bootstrap-redacted-receipt-v1.json',
});
const FORBIDDEN_LIVE_FILE_NAME = 'execution-approval-v1.json';
const SYNTHETIC_TEST_ROOT_PREFIX = 'crm-core-welcome-audio-authority-bootstrap-test-';
const MAX_PRIVATE_JSON_BYTES = 256 * 1024;
const MAX_AUDIO_ASSET_BYTES = 64 * 1024 * 1024;
const APPROVED_AUDIO_EXTENSIONS = new Set(['.aac', '.m4a', '.mp3', '.ogg', '.wav']);

const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION = Object.freeze({
  STAGED: 'staged_no_live_bundle',
  BLOCKED: 'blocked_no_live_bundle',
});

const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER = Object.freeze({
  ROOT_INVALID: 'blocked_bootstrap_owner_only_root_invalid',
  INPUT_FILE_INVALID: 'blocked_bootstrap_input_file_invalid',
  INPUT_JSON_INVALID: 'blocked_bootstrap_input_json_invalid',
  INPUT_SCHEMA_INVALID: 'blocked_bootstrap_input_schema_invalid',
  INPUT_BINDING_INVALID: 'blocked_bootstrap_input_binding_invalid',
  AUTHORIZATION_INVALID: 'blocked_bootstrap_authorization_invalid',
  SOURCE_CAPTURE_INVALID: 'blocked_bootstrap_source_capture_invalid',
  RECORD_CAP_INVALID: 'blocked_bootstrap_record_cap_invalid',
  RECORD_ORDER_INVALID: 'blocked_bootstrap_record_order_invalid',
  IDENTITY_EVIDENCE_AMBIGUOUS: 'blocked_bootstrap_identity_evidence_ambiguous',
  THREAD_EVIDENCE_AMBIGUOUS: 'blocked_bootstrap_thread_evidence_ambiguous',
  OWNER_EVIDENCE_AMBIGUOUS: 'blocked_bootstrap_owner_evidence_ambiguous',
  CAMPAIGN_EVIDENCE_AMBIGUOUS: 'blocked_bootstrap_campaign_evidence_ambiguous',
  TIME_EVIDENCE_AMBIGUOUS: 'blocked_bootstrap_time_evidence_ambiguous',
  DUPLICATE_BINDING: 'blocked_bootstrap_duplicate_binding',
  ASSET_SELECTION_INVALID: 'blocked_bootstrap_asset_selection_invalid',
  AUDIO_FILE_INVALID: 'blocked_bootstrap_audio_file_invalid',
  AUDIO_FILE_CHANGED: 'blocked_bootstrap_audio_file_changed',
  AUDIO_DIGEST_MISMATCH: 'blocked_bootstrap_audio_digest_mismatch',
  STAGING_TARGET_INVALID: 'blocked_bootstrap_staging_target_invalid',
  STAGING_TARGET_EXISTS: 'blocked_bootstrap_staging_target_exists',
  ATOMIC_PUBLICATION_FAILED: 'blocked_bootstrap_atomic_publication_failed',
  LIVE_AUTHORITY_BOUNDARY: 'blocked_bootstrap_live_authority_boundary',
  UNEXPECTED_LOCAL_FAILURE: 'blocked_bootstrap_unexpected_local_failure',
});

const AUTHORIZATION_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'bootstrap_mission_id',
  'target_mission_id',
  'target_contract_version',
  'central_repo_head',
  'authorization_id',
  'record_cap',
  'source_capture_sha256',
  'asset_selection_sha256',
  'approved_at',
  'authority_scope',
  'execution_approval_authorized',
  'external_effect_authorized',
]);

const SOURCE_CAPTURE_FIELDS = Object.freeze([
  'schema_version',
  'capture_status',
  'capture_method',
  'captured_at',
  'timestamp_evidence',
  'campaign_evidence',
  'owner_account_reference_utf8',
  'owner_binding_evidence',
  'ordered_records',
]);

const CAMPAIGN_EVIDENCE_FIELDS = Object.freeze([
  'start_at',
  'end_at',
  'interval_evidence',
  'campaign_membership_evidence',
  'inference_status',
]);

const SOURCE_RECORD_FIELDS = Object.freeze([
  'ordinal',
  'exact_target_utf8',
  'identity_binding_evidence',
  'followed_at',
  'source_observed_at',
  'follow_time_evidence',
  'campaign_membership_evidence',
  'bound_thread_reference_utf8',
  'thread_binding_evidence',
  'owner_account_reference_utf8',
  'owner_binding_evidence',
  'source_event_reference_utf8',
  'source_event_binding_evidence',
]);

const ASSET_SELECTION_FIELDS = Object.freeze([
  'schema_version',
  'selection_status',
  'asset_id',
  'source_path',
  'expected_sha256',
  'asset_approval_evidence',
  'inference_status',
]);

const OPERATION_BINDINGS_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_id',
  'contract_version',
  'central_repo_head',
  'authorization_id',
  'manifest_sha256',
  'campaign_interval_sha256',
  'approved_audio_asset_path',
  'approved_audio_asset_sha256',
  'asset_id',
  'operation_bindings',
]);

const OPERATION_BINDING_FIELDS = Object.freeze([
  'manifest_ordinal',
  'operation_id',
  'exact_target_utf8',
  'identity_anchor_sha256',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'source_event_anchor_sha256',
  'source_observed_at',
]);

const WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'builder_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'input_files_verified',
  'records_seen_count',
  'records_staged_count',
  'record_cap',
  'campaign_evidence_exact',
  'identity_evidence_exact',
  'thread_evidence_exact',
  'owner_evidence_exact',
  'absolute_time_evidence_exact',
  'audio_regular_single_link_verified',
  'audio_digest_verified',
  'atomic_publication_verified',
  'execution_approval_published',
  'live_authority_root_touched',
  'external_effect_invoked',
  'blocker_codes',
]);

const ANCHOR_DOMAINS = Object.freeze({
  thread: 'crm-core:instagram:bound-thread-reference-utf8:v1\0',
  owner: 'crm-core:instagram:owner-account-reference-utf8:v1\0',
  sourceEvent: 'crm-core:instagram:source-event-reference-utf8:v1\0',
  operation: 'crm-core:instagram:welcome-audio-operation:v1\0',
});

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isGitSha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isOpaqueId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const isExactIsoTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};
const isWellFormedUnicode = (value) => {
  if (typeof value !== 'string') return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
};

const assertPrivateUtf8 = (value, maxBytes, blocker) => {
  if (
    typeof value !== 'string'
    || !isWellFormedUnicode(value)
    || /[\0\r\n]/.test(value)
  ) throw new Error(blocker);
  const length = Buffer.byteLength(value, 'utf8');
  if (length < 1 || length > maxBytes) throw new Error(blocker);
  return value;
};

const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const canonicalBytes = (value) => Buffer.from(
  `${JSON.stringify(canonicalize(value))}\n`,
  'utf8',
);

const deriveDomainSeparatedAnchorSha256 = ({ domain, exactUtf8 }) => {
  assertPrivateUtf8(exactUtf8, 2_048, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);
  const bytes = Buffer.from(exactUtf8, 'utf8');
  const size = Buffer.allocUnsafe(4);
  size.writeUInt32BE(bytes.length, 0);
  return sha256Bytes(Buffer.concat([Buffer.from(domain, 'utf8'), size, bytes]));
};

const deriveThreadAnchorSha256 = (exactThreadReference) =>
  deriveDomainSeparatedAnchorSha256({
    domain: ANCHOR_DOMAINS.thread,
    exactUtf8: exactThreadReference,
  });
const deriveOwnerAnchorSha256 = (exactOwnerReference) =>
  deriveDomainSeparatedAnchorSha256({
    domain: ANCHOR_DOMAINS.owner,
    exactUtf8: exactOwnerReference,
  });
const deriveSourceEventAnchorSha256 = (exactSourceEventReference) =>
  deriveDomainSeparatedAnchorSha256({
    domain: ANCHOR_DOMAINS.sourceEvent,
    exactUtf8: exactSourceEventReference,
  });

const buildOperationId = ({ missionId, ordinal, identityAnchor, threadAnchor, ownerAnchor }) => {
  const binding = canonicalBytes({
    mission_id: missionId,
    ordinal,
    identity_anchor_sha256: identityAnchor,
    thread_anchor_sha256: threadAnchor,
    owner_anchor_sha256: ownerAnchor,
  });
  return `welcome_audio_${sha256Bytes(Buffer.concat([
    Buffer.from(ANCHOR_DOMAINS.operation, 'utf8'),
    binding,
  ]))}`;
};

const buildReceipt = ({
  decision = WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.BLOCKED,
  recordsSeenCount = 0,
  recordsStagedCount = 0,
  blockerCodes = [],
}) => {
  const staged = decision === WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.STAGED;
  return Object.freeze({
    receipt_schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_SCHEMA_VERSION,
    builder_contract_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_CONTRACT_VERSION,
    redaction_status: 'aggregate_allowlist_only_no_paths_ids_anchors_digests_or_private_values',
    execution_mode: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_EXECUTION_MODE,
    decision,
    input_files_verified: staged,
    records_seen_count: recordsSeenCount,
    records_staged_count: recordsStagedCount,
    record_cap: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS,
    campaign_evidence_exact: staged,
    identity_evidence_exact: staged,
    thread_evidence_exact: staged,
    owner_evidence_exact: staged,
    absolute_time_evidence_exact: staged,
    audio_regular_single_link_verified: staged,
    audio_digest_verified: staged,
    atomic_publication_verified: staged,
    execution_approval_published: false,
    live_authority_root_touched: false,
    external_effect_invoked: false,
    blocker_codes: Object.freeze([...blockerCodes]),
  });
};

class WelcomeAudioAuthorityBootstrapBlocked extends Error {
  constructor(code, { recordsSeenCount = 0 } = {}) {
    super(code);
    this.name = 'WelcomeAudioAuthorityBootstrapBlocked';
    this.code = code;
    this.redacted_receipt = buildReceipt({
      recordsSeenCount,
      blockerCodes: [code],
    });
  }
}

const fail = (code, context) => {
  throw new WelcomeAudioAuthorityBootstrapBlocked(code, context);
};

const exactMode = (metadata, mode) => (metadata.mode & 0o7777) === mode;
const sameFileMetadata = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs
  && actual.ctimeMs === expected.ctimeMs;

const isPathInside = (candidate, parent) => {
  const rel = relative(parent, candidate);
  return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel);
};

const assertCanonicalOwnerOnlyDirectory = async (directoryPath, blocker) => {
  if (
    typeof directoryPath !== 'string'
    || !isAbsolute(directoryPath)
    || resolve(directoryPath) !== directoryPath
  ) fail(blocker);
  try {
    const unresolved = await lstat(directoryPath);
    const canonical = await realpath(directoryPath);
    const resolved = await lstat(canonical);
    if (
      canonical !== directoryPath
      || !unresolved.isDirectory()
      || unresolved.isSymbolicLink()
      || !resolved.isDirectory()
      || resolved.isSymbolicLink()
      || !exactMode(resolved, 0o700)
      || (typeof process.getuid === 'function' && resolved.uid !== process.getuid())
      || unresolved.dev !== resolved.dev
      || unresolved.ino !== resolved.ino
      || unresolved.uid !== resolved.uid
      || unresolved.mode !== resolved.mode
    ) fail(blocker);
    return Object.freeze({
      path: canonical,
      dev: resolved.dev,
      ino: resolved.ino,
      uid: resolved.uid,
      mode: resolved.mode,
    });
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(blocker);
  }
};

const assertDirectoryIdentity = async (identity, blocker) => {
  const current = await assertCanonicalOwnerOnlyDirectory(identity.path, blocker);
  if (
    current.dev !== identity.dev
    || current.ino !== identity.ino
    || current.uid !== identity.uid
    || current.mode !== identity.mode
  ) fail(blocker);
  return current;
};

const readStableOwnerOnlyFile = async ({ rootIdentity, fileName, maxBytes, blocker }) => {
  if (basename(fileName) !== fileName || fileName === FORBIDDEN_LIVE_FILE_NAME) fail(blocker);
  const filePath = join(rootIdentity.path, fileName);
  let handle;
  try {
    const unresolved = await lstat(filePath);
    if (
      !unresolved.isFile()
      || unresolved.isSymbolicLink()
      || !exactMode(unresolved, 0o600)
      || unresolved.nlink !== 1
      || unresolved.dev !== rootIdentity.dev
      || unresolved.size < 2
      || unresolved.size > maxBytes
      || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
    ) fail(blocker);
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (!sameFileMetadata(before, unresolved)) fail(blocker);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(filePath);
    if (
      bytes.length !== after.size
      || !sameFileMetadata(after, before)
      || !sameFileMetadata(pathAfter, before)
    ) fail(blocker);
    return Object.freeze({
      path: filePath,
      bytes,
      digest: sha256Bytes(bytes),
      metadata: before,
    });
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(blocker);
  } finally {
    await handle?.close();
  }
};

const rereadStableOwnerOnlyFile = async ({ loaded, rootIdentity, fileName }) => {
  const fresh = await readStableOwnerOnlyFile({
    rootIdentity,
    fileName,
    maxBytes: MAX_PRIVATE_JSON_BYTES,
    blocker: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_FILE_INVALID,
  });
  if (fresh.digest !== loaded.digest || !sameFileMetadata(fresh.metadata, loaded.metadata)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_BINDING_INVALID);
  }
};

const parsePrivateJson = (loaded) => {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(loaded.bytes);
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_JSON_INVALID);
    }
    return value;
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_JSON_INVALID);
  }
};

const validateAuthorization = ({ authorization, sourceCaptureLoaded, assetSelectionLoaded, nowMs }) => {
  if (!exactObjectKeys(authorization, AUTHORIZATION_FIELDS)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);
  }
  if (
    authorization.schema_version
      !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION
    || authorization.status !== 'approved_for_no_live_bootstrap_only'
    || authorization.bootstrap_mission_id !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID
    || !isOpaqueId(authorization.target_mission_id)
    || !isOpaqueId(authorization.target_contract_version)
    || !isGitSha(authorization.central_repo_head)
    || !isOpaqueId(authorization.authorization_id)
    || authorization.record_cap !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS
    || !isSha256(authorization.source_capture_sha256)
    || authorization.source_capture_sha256 !== sourceCaptureLoaded.digest
    || !isSha256(authorization.asset_selection_sha256)
    || authorization.asset_selection_sha256 !== assetSelectionLoaded.digest
    || !isExactIsoTimestamp(authorization.approved_at)
    || Date.parse(authorization.approved_at) > nowMs
    || authorization.authority_scope !== 'owner_only_staging_without_live_execution_authority'
    || authorization.execution_approval_authorized !== false
    || authorization.external_effect_authorized !== false
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID);
};

const validateCampaignEvidence = ({ evidence, capturedAtMs }) => {
  if (!exactObjectKeys(evidence, CAMPAIGN_EVIDENCE_FIELDS)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS);
  }
  if (
    !isExactIsoTimestamp(evidence.start_at)
    || !isExactIsoTimestamp(evidence.end_at)
    || Date.parse(evidence.start_at) >= Date.parse(evidence.end_at)
    || Date.parse(evidence.end_at) > capturedAtMs
    || evidence.interval_evidence !== 'exact_approved_campaign_interval'
    || evidence.campaign_membership_evidence !== 'explicit_source_event_membership'
    || evidence.inference_status !== 'explicit_not_inferred'
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS);
  return Object.freeze({
    startMs: Date.parse(evidence.start_at),
    endMs: Date.parse(evidence.end_at),
  });
};

const validateSourceCaptureFreshness = ({ sourceCapture, nowMs }) => {
  if (!Number.isFinite(nowMs) || !Array.isArray(sourceCapture?.ordered_records)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS);
  }
  for (const record of sourceCapture.ordered_records) {
    if (
      !isExactIsoTimestamp(record?.followed_at)
      || !isExactIsoTimestamp(record?.source_observed_at)
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS, {
      recordsSeenCount: sourceCapture.ordered_records.length,
    });
    const followedAtMs = Date.parse(record.followed_at);
    const sourceObservedAtMs = Date.parse(record.source_observed_at);
    if (
      sourceObservedAtMs < followedAtMs
      || sourceObservedAtMs > nowMs
      || nowMs - sourceObservedAtMs > WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS, {
      recordsSeenCount: sourceCapture.ordered_records.length,
    });
  }
  return true;
};

const validateSourceCapture = (sourceCapture, nowMs) => {
  if (!exactObjectKeys(sourceCapture, SOURCE_CAPTURE_FIELDS)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);
  }
  if (
    sourceCapture.schema_version
      !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION
    || sourceCapture.capture_status !== 'exact_private_source_capture_complete'
    || sourceCapture.capture_method !== 'safari_native_instagram_read_only'
    || !isExactIsoTimestamp(sourceCapture.captured_at)
    || Date.parse(sourceCapture.captured_at) > nowMs
    || sourceCapture.timestamp_evidence !== 'absolute_timestamps_only_not_relative'
    || sourceCapture.owner_binding_evidence !== 'exact_owner_account_observed'
    || !Array.isArray(sourceCapture.ordered_records)
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.SOURCE_CAPTURE_INVALID);

  assertPrivateUtf8(
    sourceCapture.owner_account_reference_utf8,
    2_048,
    WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.OWNER_EVIDENCE_AMBIGUOUS,
  );
  const count = sourceCapture.ordered_records.length;
  if (count < 1 || count > WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.RECORD_CAP_INVALID, {
      recordsSeenCount: count,
    });
  }
  const capturedAtMs = Date.parse(sourceCapture.captured_at);
  const interval = validateCampaignEvidence({
    evidence: sourceCapture.campaign_evidence,
    capturedAtMs,
  });
  const seenIdentities = new Set();
  const seenThreads = new Set();
  const seenSourceEvents = new Set();

  validateSourceCaptureFreshness({ sourceCapture, nowMs });

  const records = sourceCapture.ordered_records.map((record, index) => {
    if (!exactObjectKeys(record, SOURCE_RECORD_FIELDS) || record.ordinal !== index + 1) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.RECORD_ORDER_INVALID, {
        recordsSeenCount: count,
      });
    }
    assertPrivateUtf8(
      record.exact_target_utf8,
      512,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.IDENTITY_EVIDENCE_AMBIGUOUS,
    );
    if (record.identity_binding_evidence !== 'exact_profile_identity_and_follow_signal_observed') {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.IDENTITY_EVIDENCE_AMBIGUOUS, {
        recordsSeenCount: count,
      });
    }
    if (
      !isExactIsoTimestamp(record.followed_at)
      || !isExactIsoTimestamp(record.source_observed_at)
      || record.follow_time_evidence !== 'exact_absolute_source_timestamp'
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS, {
      recordsSeenCount: count,
    });
    const followedAtMs = Date.parse(record.followed_at);
    const sourceObservedAtMs = Date.parse(record.source_observed_at);
    if (
      followedAtMs < interval.startMs
      || followedAtMs > interval.endMs
      || followedAtMs > capturedAtMs
      || sourceObservedAtMs > capturedAtMs
      || record.campaign_membership_evidence
        !== 'exact_follow_timestamp_within_approved_campaign_interval'
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS, {
      recordsSeenCount: count,
    });
    assertPrivateUtf8(
      record.bound_thread_reference_utf8,
      2_048,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.THREAD_EVIDENCE_AMBIGUOUS,
    );
    if (record.thread_binding_evidence !== 'exact_bound_thread_observed') {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.THREAD_EVIDENCE_AMBIGUOUS, {
        recordsSeenCount: count,
      });
    }
    assertPrivateUtf8(
      record.owner_account_reference_utf8,
      2_048,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.OWNER_EVIDENCE_AMBIGUOUS,
    );
    if (
      record.owner_binding_evidence !== 'exact_owner_account_observed'
      || record.owner_account_reference_utf8 !== sourceCapture.owner_account_reference_utf8
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.OWNER_EVIDENCE_AMBIGUOUS, {
      recordsSeenCount: count,
    });
    assertPrivateUtf8(
      record.source_event_reference_utf8,
      2_048,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS,
    );
    if (record.source_event_binding_evidence !== 'exact_source_event_observed') {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.CAMPAIGN_EVIDENCE_AMBIGUOUS, {
        recordsSeenCount: count,
      });
    }

    const identityAnchor = computeWelcomeAudioExactIdentityAnchorSha256(record.exact_target_utf8);
    const threadAnchor = deriveThreadAnchorSha256(record.bound_thread_reference_utf8);
    const sourceEventAnchor = deriveSourceEventAnchorSha256(record.source_event_reference_utf8);
    if (
      seenIdentities.has(identityAnchor)
      || seenThreads.has(threadAnchor)
      || seenSourceEvents.has(sourceEventAnchor)
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.DUPLICATE_BINDING, {
      recordsSeenCount: count,
    });
    seenIdentities.add(identityAnchor);
    seenThreads.add(threadAnchor);
    seenSourceEvents.add(sourceEventAnchor);
    return Object.freeze({
      record,
      identityAnchor,
      threadAnchor,
      sourceEventAnchor,
    });
  });
  return Object.freeze({
    count,
    records,
    ownerAnchor: deriveOwnerAnchorSha256(sourceCapture.owner_account_reference_utf8),
  });
};

const validateAssetSelection = (assetSelection) => {
  if (!exactObjectKeys(assetSelection, ASSET_SELECTION_FIELDS)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);
  }
  if (
    assetSelection.schema_version
      !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION
    || assetSelection.selection_status !== 'exact_audio_asset_explicitly_approved'
    || !isOpaqueId(assetSelection.asset_id)
    || typeof assetSelection.source_path !== 'string'
    || !isAbsolute(assetSelection.source_path)
    || resolve(assetSelection.source_path) !== assetSelection.source_path
    || assetSelection.source_path.split(sep).some((segment) => segment === '.' || segment === '..')
    || !APPROVED_AUDIO_EXTENSIONS.has(extname(assetSelection.source_path).toLowerCase())
    || !isSha256(assetSelection.expected_sha256)
    || assetSelection.asset_approval_evidence !== 'exact_asset_bytes_explicitly_approved'
    || assetSelection.inference_status !== 'explicit_not_inferred'
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ASSET_SELECTION_INVALID);
};

const readStableApprovedAudio = async (assetSelection) => {
  validateAssetSelection(assetSelection);
  const assetPath = assetSelection.source_path;
  let handle;
  try {
    const canonical = await realpath(assetPath);
    const unresolved = await lstat(assetPath);
    if (
      canonical !== assetPath
      || !unresolved.isFile()
      || unresolved.isSymbolicLink()
      || unresolved.nlink !== 1
      || unresolved.size < 1
      || unresolved.size > MAX_AUDIO_ASSET_BYTES
      || (unresolved.mode & 0o022) !== 0
      || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_INVALID);
    handle = await open(assetPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (!sameFileMetadata(before, unresolved)) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_CHANGED);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(assetPath);
    if (
      bytes.length !== after.size
      || !sameFileMetadata(after, before)
      || !sameFileMetadata(pathAfter, before)
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_CHANGED);
    const digest = sha256Bytes(bytes);
    if (digest !== assetSelection.expected_sha256) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_DIGEST_MISMATCH);
    }
    return Object.freeze({ bytes, digest, metadata: before, path: assetPath });
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_INVALID);
  } finally {
    await handle?.close();
  }
};

const revalidateApprovedAudio = async (loaded, assetSelection) => {
  const fresh = await readStableApprovedAudio(assetSelection);
  if (fresh.digest !== loaded.digest || !sameFileMetadata(fresh.metadata, loaded.metadata)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUDIO_FILE_CHANGED);
  }
};

const assertStagingBoundary = ({ stagingRoot, liveRoot }) => {
  if (
    typeof stagingRoot !== 'string'
    || !isAbsolute(stagingRoot)
    || resolve(stagingRoot) !== stagingRoot
    || typeof liveRoot !== 'string'
    || !isAbsolute(liveRoot)
    || resolve(liveRoot) !== liveRoot
    || stagingRoot === liveRoot
    || isPathInside(stagingRoot, liveRoot)
    || isPathInside(liveRoot, stagingRoot)
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.LIVE_AUTHORITY_BOUNDARY);
};

const assertPathMissing = async (filePath, blocker) => {
  try {
    await lstat(filePath);
    fail(blocker);
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
};

const syncDirectory = async (directoryPath) => {
  let handle;
  try {
    handle = await open(directoryPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await handle.stat();
    if (!metadata.isDirectory()) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    await handle.sync();
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
  } finally {
    await handle?.close();
  }
};

const writeExclusiveOwnerOnly = async ({ filePath, bytes }) => {
  let handle;
  try {
    handle = await open(
      filePath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(bytes);
    await handle.sync();
    const metadata = await handle.stat();
    if (
      !metadata.isFile()
      || metadata.isSymbolicLink()
      || !exactMode(metadata, 0o600)
      || metadata.nlink !== 1
      || metadata.size !== bytes.length
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    return metadata;
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
  } finally {
    await handle?.close();
  }
};

const verifyPublishedFile = async ({ rootIdentity, fileName, expectedBytes }) => {
  const loaded = await readStableOwnerOnlyFile({
    rootIdentity,
    fileName,
    maxBytes: fileName.startsWith('approved-welcome-audio')
      ? MAX_AUDIO_ASSET_BYTES
      : MAX_PRIVATE_JSON_BYTES,
    blocker: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
  });
  if (
    loaded.bytes.length !== expectedBytes.length
    || !loaded.bytes.equals(expectedBytes)
    || loaded.digest !== sha256Bytes(expectedBytes)
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
};

const validateWelcomeAudioAuthorityBootstrapReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID };
  }
  const validDecision = Object.values(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION)
    .includes(receipt.decision);
  const staged = receipt.decision === WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.STAGED;
  const blockerCodes = new Set(Object.values(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER));
  if (
    receipt.receipt_schema_version
      !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_SCHEMA_VERSION
    || receipt.builder_contract_version !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_CONTRACT_VERSION
    || receipt.redaction_status
      !== 'aggregate_allowlist_only_no_paths_ids_anchors_digests_or_private_values'
    || receipt.execution_mode !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_EXECUTION_MODE
    || !validDecision
    || !Number.isSafeInteger(receipt.records_seen_count)
    || receipt.records_seen_count < 0
    || !Number.isSafeInteger(receipt.records_staged_count)
    || receipt.records_staged_count < 0
    || receipt.records_staged_count > WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS
    || receipt.record_cap !== WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS
    || [
      'input_files_verified',
      'campaign_evidence_exact',
      'identity_evidence_exact',
      'thread_evidence_exact',
      'owner_evidence_exact',
      'absolute_time_evidence_exact',
      'audio_regular_single_link_verified',
      'audio_digest_verified',
      'atomic_publication_verified',
    ].some((field) => receipt[field] !== staged)
    || receipt.records_staged_count !== (staged ? receipt.records_seen_count : 0)
    || receipt.execution_approval_published !== false
    || receipt.live_authority_root_touched !== false
    || receipt.external_effect_invoked !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !blockerCodes.has(code))
    || receipt.blocker_codes.length !== (staged ? 0 : 1)
  ) return {
    ok: false,
    reason: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID,
  };
  return { ok: true, reason: null };
};

const buildPrivateBundle = ({ authorization, sourceCapture, validatedCapture, assetSelection, stagingRoot }) => {
  const campaignInterval = {
    schema_version: WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
    start_at: sourceCapture.campaign_evidence.start_at,
    end_at: sourceCapture.campaign_evidence.end_at,
  };
  const campaignIntervalSha256 = computeWelcomeAudioCampaignIntervalSha256(campaignInterval);
  const manifest = {
    schema_version: WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
    identity_anchor_schema_version: WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
    mission_id: authorization.target_mission_id,
    contract_version: authorization.target_contract_version,
    campaign_interval_sha256: campaignIntervalSha256,
    ordered_records: validatedCapture.records.map(({ record, identityAnchor }) => ({
      ordinal: record.ordinal,
      identity_anchor_sha256: identityAnchor,
      followed_at: record.followed_at,
      campaign_interval_sha256: campaignIntervalSha256,
    })),
  };
  const manifestSha256 = computeWelcomeAudioSealedManifestSha256(manifest);
  const audioExtension = extname(assetSelection.source_path).toLowerCase();
  const audioFileName = `approved-welcome-audio${audioExtension}`;
  const approvedAudioAssetPath = join(stagingRoot, audioFileName);
  const operationBindings = {
    schema_version: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION,
    status: 'prepared_no_live_staging_only',
    mission_id: authorization.target_mission_id,
    contract_version: authorization.target_contract_version,
    central_repo_head: authorization.central_repo_head,
    authorization_id: authorization.authorization_id,
    manifest_sha256: manifestSha256,
    campaign_interval_sha256: campaignIntervalSha256,
    approved_audio_asset_path: approvedAudioAssetPath,
    approved_audio_asset_sha256: assetSelection.expected_sha256,
    asset_id: assetSelection.asset_id,
    operation_bindings: validatedCapture.records.map(({
      record,
      identityAnchor,
      threadAnchor,
      sourceEventAnchor,
    }) => ({
      manifest_ordinal: record.ordinal,
      operation_id: buildOperationId({
        missionId: authorization.target_mission_id,
        ordinal: record.ordinal,
        identityAnchor,
        threadAnchor,
        ownerAnchor: validatedCapture.ownerAnchor,
      }),
      exact_target_utf8: record.exact_target_utf8,
      identity_anchor_sha256: identityAnchor,
      thread_anchor_sha256: threadAnchor,
      owner_anchor_sha256: validatedCapture.ownerAnchor,
      source_event_anchor_sha256: sourceEventAnchor,
      source_observed_at: record.source_observed_at,
    })),
  };
  if (
    !exactObjectKeys(operationBindings, OPERATION_BINDINGS_FIELDS)
    || operationBindings.operation_bindings.some(
      (binding) => !exactObjectKeys(binding, OPERATION_BINDING_FIELDS),
    )
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
  const manifestValidation = validateSealedWelcomeAudioBacklogManifest({
    manifest,
    campaign_interval: campaignInterval,
    expected_manifest_sha256: manifestSha256,
    expected_campaign_interval_sha256: campaignIntervalSha256,
    expected_mission_id: authorization.target_mission_id,
    expected_contract_version: authorization.target_contract_version,
  });
  if (manifestValidation.redacted_receipt.decision !== 'validated_private_input') {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_BINDING_INVALID, {
      recordsSeenCount: validatedCapture.count,
    });
  }
  return Object.freeze({
    campaignInterval,
    manifest,
    operationBindings,
    audioFileName,
  });
};

const removePublishedBundleIfSameIdentity = async ({ stagingRoot, expectedIdentity }) => {
  try {
    const metadata = await lstat(stagingRoot);
    if (
      metadata.isDirectory()
      && !metadata.isSymbolicLink()
      && metadata.dev === expectedIdentity.dev
      && metadata.ino === expectedIdentity.ino
      && metadata.uid === expectedIdentity.uid
      && metadata.mode === expectedIdentity.mode
    ) await rm(stagingRoot, { recursive: true, force: true });
  } catch {
    // Failure cleanup is best effort and never widens beyond the exact directory identity published here.
  }
};

const prepareWelcomeAudioAuthorityBootstrapStaging = async ({
  inputRoot,
  stagingRoot,
  liveRoot,
  nowMs,
  testOnlyBeforePublish = null,
}) => {
  if (typeof nowMs !== 'function') {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID);
  }
  const effectiveNowMs = nowMs();
  if (!Number.isFinite(effectiveNowMs)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.AUTHORIZATION_INVALID);
  }
  assertStagingBoundary({ stagingRoot, liveRoot });
  const inputIdentity = await assertCanonicalOwnerOnlyDirectory(
    inputRoot,
    WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID,
  );
  const stagingParentIdentity = await assertCanonicalOwnerOnlyDirectory(
    dirname(stagingRoot),
    WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_INVALID,
  );
  if (stagingParentIdentity.path !== dirname(stagingRoot)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_INVALID);
  }
  await assertPathMissing(
    stagingRoot,
    WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_EXISTS,
  );
  const inputEntries = await readdir(inputRoot);
  const expectedInputEntries = Object.values(BOOTSTRAP_INPUT_FILE_NAMES).sort();
  if (
    inputEntries.length !== expectedInputEntries.length
    || inputEntries.sort().some((entry, index) => entry !== expectedInputEntries[index])
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);

  const [authorizationLoaded, sourceCaptureLoaded, assetSelectionLoaded] = await Promise.all([
    readStableOwnerOnlyFile({
      rootIdentity: inputIdentity,
      fileName: BOOTSTRAP_INPUT_FILE_NAMES.authorization,
      maxBytes: MAX_PRIVATE_JSON_BYTES,
      blocker: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_FILE_INVALID,
    }),
    readStableOwnerOnlyFile({
      rootIdentity: inputIdentity,
      fileName: BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture,
      maxBytes: MAX_PRIVATE_JSON_BYTES,
      blocker: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_FILE_INVALID,
    }),
    readStableOwnerOnlyFile({
      rootIdentity: inputIdentity,
      fileName: BOOTSTRAP_INPUT_FILE_NAMES.assetSelection,
      maxBytes: MAX_PRIVATE_JSON_BYTES,
      blocker: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_FILE_INVALID,
    }),
  ]);
  const authorization = parsePrivateJson(authorizationLoaded);
  const sourceCapture = parsePrivateJson(sourceCaptureLoaded);
  const assetSelection = parsePrivateJson(assetSelectionLoaded);
  validateAuthorization({
    authorization,
    sourceCaptureLoaded,
    assetSelectionLoaded,
    nowMs: effectiveNowMs,
  });
  const validatedCapture = validateSourceCapture(sourceCapture, effectiveNowMs);
  validateAssetSelection(assetSelection);
  const audio = await readStableApprovedAudio(assetSelection);
  const bundle = buildPrivateBundle({
    authorization,
    sourceCapture,
    validatedCapture,
    assetSelection,
    stagingRoot,
  });
  const successReceipt = buildReceipt({
    decision: WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION.STAGED,
    recordsSeenCount: validatedCapture.count,
    recordsStagedCount: validatedCapture.count,
  });
  if (!validateWelcomeAudioAuthorityBootstrapReceipt(successReceipt).ok) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
  }
  const outputBytes = new Map([
    [BOOTSTRAP_STAGING_FILE_NAMES.interval, canonicalBytes(bundle.campaignInterval)],
    [BOOTSTRAP_STAGING_FILE_NAMES.manifest, canonicalBytes(bundle.manifest)],
    [BOOTSTRAP_STAGING_FILE_NAMES.operationBindings, canonicalBytes(bundle.operationBindings)],
    [BOOTSTRAP_STAGING_FILE_NAMES.receipt, canonicalBytes(successReceipt)],
    [bundle.audioFileName, audio.bytes],
  ]);
  if (outputBytes.has(FORBIDDEN_LIVE_FILE_NAME)) {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.LIVE_AUTHORITY_BOUNDARY);
  }

  const temporaryRoot = join(
    stagingParentIdentity.path,
    `.${basename(stagingRoot)}.pending-${process.pid}-${randomBytes(12).toString('hex')}`,
  );
  let published = false;
  let publishedExpectedIdentity = null;
  try {
    await assertPathMissing(
      temporaryRoot,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    let temporaryHandle;
    try {
      temporaryHandle = await open(
        temporaryRoot,
        FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_DIRECTORY | FS_CONSTANTS.O_NOFOLLOW,
      );
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    } catch (error) {
      if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
      if (error?.code !== 'ENOENT') {
        fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
      }
    } finally {
      await temporaryHandle?.close();
    }
    await mkdir(temporaryRoot, { mode: 0o700 });
    const temporaryIdentity = await assertCanonicalOwnerOnlyDirectory(
      temporaryRoot,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    if (temporaryIdentity.dev !== stagingParentIdentity.dev) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    }
    for (const [fileName, bytes] of outputBytes) {
      await writeExclusiveOwnerOnly({
        filePath: join(temporaryRoot, fileName),
        bytes,
      });
    }
    await syncDirectory(temporaryRoot);
    if (testOnlyBeforePublish) await testOnlyBeforePublish(Object.freeze({ temporaryRoot }));

    await Promise.all([
      assertDirectoryIdentity(inputIdentity, WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID),
      assertDirectoryIdentity(
        stagingParentIdentity,
        WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_INVALID,
      ),
      ...[
        [authorizationLoaded, BOOTSTRAP_INPUT_FILE_NAMES.authorization],
        [sourceCaptureLoaded, BOOTSTRAP_INPUT_FILE_NAMES.sourceCapture],
        [assetSelectionLoaded, BOOTSTRAP_INPUT_FILE_NAMES.assetSelection],
      ].map(([loaded, fileName]) => rereadStableOwnerOnlyFile({
        loaded,
        rootIdentity: inputIdentity,
        fileName,
      })),
      revalidateApprovedAudio(audio, assetSelection),
    ]);
    const freshTemporaryIdentity = await assertDirectoryIdentity(
      temporaryIdentity,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    const freshEntries = (await readdir(temporaryRoot)).sort();
    const expectedEntries = [...outputBytes.keys()].sort();
    if (
      freshEntries.length !== expectedEntries.length
      || freshEntries.some((entry, index) => entry !== expectedEntries[index])
      || freshEntries.includes(FORBIDDEN_LIVE_FILE_NAME)
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    for (const [fileName, bytes] of outputBytes) {
      await verifyPublishedFile({
        rootIdentity: freshTemporaryIdentity,
        fileName,
        expectedBytes: bytes,
      });
    }
    await assertPathMissing(
      stagingRoot,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.STAGING_TARGET_EXISTS,
    );
    const publicationNowMs = nowMs();
    if (!Number.isFinite(publicationNowMs) || publicationNowMs < effectiveNowMs) {
      fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.TIME_EVIDENCE_AMBIGUOUS, {
        recordsSeenCount: validatedCapture.count,
      });
    }
    validateSourceCaptureFreshness({ sourceCapture, nowMs: publicationNowMs });
    await rename(temporaryRoot, stagingRoot);
    published = true;
    publishedExpectedIdentity = freshTemporaryIdentity;
    await syncDirectory(stagingParentIdentity.path);
    const publishedIdentity = await assertCanonicalOwnerOnlyDirectory(
      stagingRoot,
      WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED,
    );
    for (const [fileName, bytes] of outputBytes) {
      await verifyPublishedFile({ rootIdentity: publishedIdentity, fileName, expectedBytes: bytes });
    }
    const publishedEntries = (await readdir(stagingRoot)).sort();
    const expectedPublishedEntries = [...outputBytes.keys()].sort();
    if (
      publishedEntries.length !== expectedPublishedEntries.length
      || publishedEntries.some((entry, index) => entry !== expectedPublishedEntries[index])
      || publishedEntries.includes(FORBIDDEN_LIVE_FILE_NAME)
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED);
    return Object.freeze({
      staging_root: stagingRoot,
      redacted_receipt: successReceipt,
    });
  } catch (error) {
    if (published && publishedExpectedIdentity) {
      await removePublishedBundleIfSameIdentity({
        stagingRoot,
        expectedIdentity: publishedExpectedIdentity,
      });
      await syncDirectory(stagingParentIdentity.path).catch(() => {});
    }
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED, {
      recordsSeenCount: validatedCapture.count,
    });
  } finally {
    if (!published) await rm(temporaryRoot, { recursive: true, force: true }).catch(() => {});
  }
};

const redactPublicPreparationFailure = async (task) => {
  try {
    return await task();
  } catch (error) {
    if (error instanceof WelcomeAudioAuthorityBootstrapBlocked) throw error;
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.UNEXPECTED_LOCAL_FAILURE);
  }
};

const prepareFixedWelcomeAudioAuthorityBootstrapStaging = async () =>
  redactPublicPreparationFailure(() => prepareWelcomeAudioAuthorityBootstrapStaging({
    inputRoot: FIXED_BOOTSTRAP_INPUT_ROOT,
    stagingRoot: FIXED_BOOTSTRAP_STAGING_ROOT,
    liveRoot: FIXED_LIVE_AUTHORITY_ROOT,
    nowMs: () => Date.now(),
  }));

const assertSyntheticTestRoot = async (testRoot) => {
  let canonicalTemp;
  try {
    canonicalTemp = await realpath(tmpdir());
  } catch {
    fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID);
  }
  if (
    typeof testRoot !== 'string'
    || dirname(testRoot) !== canonicalTemp
    || !basename(testRoot).startsWith(SYNTHETIC_TEST_ROOT_PREFIX)
  ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID);
  return assertCanonicalOwnerOnlyDirectory(
    testRoot,
    WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ROOT_INVALID,
  );
};

const prepareSyntheticWelcomeAudioAuthorityBootstrapStaging = async (options = {}) =>
  redactPublicPreparationFailure(async () => {
    const {
      test_root,
      now_ms,
      test_only_before_publish = null,
    } = options;
    await assertSyntheticTestRoot(test_root);
    if (
      typeof now_ms !== 'function'
      || (test_only_before_publish !== null && typeof test_only_before_publish !== 'function')
    ) fail(WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.INPUT_SCHEMA_INVALID);
    return prepareWelcomeAudioAuthorityBootstrapStaging({
      inputRoot: join(test_root, 'input'),
      stagingRoot: join(test_root, 'staging'),
      liveRoot: join(test_root, 'live-authority'),
      nowMs: now_ms,
      testOnlyBeforePublish: test_only_before_publish,
    });
  });

const isDirectInvocation = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectInvocation) {
  prepareFixedWelcomeAudioAuthorityBootstrapStaging()
    .then(({ redacted_receipt: receipt }) => {
      process.stdout.write(`${JSON.stringify(receipt)}\n`);
    })
    .catch((error) => {
      const receipt = error instanceof WelcomeAudioAuthorityBootstrapBlocked
        ? error.redacted_receipt
        : buildReceipt({
          blockerCodes: [WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER.ATOMIC_PUBLICATION_FAILED],
        });
      process.stderr.write(`${JSON.stringify(receipt)}\n`);
      process.exitCode = 1;
    });
}

export {
  ASSET_SELECTION_FIELDS,
  AUTHORIZATION_FIELDS,
  BOOTSTRAP_INPUT_FILE_NAMES,
  BOOTSTRAP_STAGING_FILE_NAMES,
  CAMPAIGN_EVIDENCE_FIELDS,
  FIXED_BOOTSTRAP_INPUT_ROOT,
  FIXED_BOOTSTRAP_STAGING_ROOT,
  FIXED_LIVE_AUTHORITY_ROOT,
  FORBIDDEN_LIVE_FILE_NAME,
  SOURCE_CAPTURE_FIELDS,
  SOURCE_RECORD_FIELDS,
  SYNTHETIC_TEST_ROOT_PREFIX,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_ASSET_SELECTION_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_AUTHORIZATION_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_BLOCKER,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_CONTRACT_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_DECISION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_EXECUTION_MODE,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MAX_RECORDS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_MISSION_ID,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_OPERATION_BINDINGS_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_FIELDS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_FRESHNESS_MS,
  WELCOME_AUDIO_AUTHORITY_BOOTSTRAP_SOURCE_CAPTURE_SCHEMA_VERSION,
  WelcomeAudioAuthorityBootstrapBlocked,
  canonicalBytes,
  deriveOwnerAnchorSha256,
  deriveSourceEventAnchorSha256,
  deriveThreadAnchorSha256,
  prepareFixedWelcomeAudioAuthorityBootstrapStaging,
  prepareSyntheticWelcomeAudioAuthorityBootstrapStaging,
  validateWelcomeAudioAuthorityBootstrapReceipt,
};
