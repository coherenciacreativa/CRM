import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { constants as FS_CONSTANTS } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
  sep,
} from 'node:path';
import { promisify, types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_GUARD_DECISION,
  WELCOME_AUDIO_GUARD_PHASE,
  validateWelcomeAudioOperation,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS,
  validateWelcomeAudioUiAttestedFollowerSourceProjection,
} from './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-adapter.mjs';
import {
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS,
  validateWelcomeAudioUiAttestedLiveAuthorityEnvelope,
} from './crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs';

const WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_live_preflight_v1';
const WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_sealed_backlog_manifest_v1';
const WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_sealed_campaign_interval_v1';
const WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_preflight_receipt_v1';
const WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE =
  'local_private_validation_no_source_no_send';
const WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS = 8;
const WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_operation_context_receipt_v1';
const WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_execution_authority_v1';
const WELCOME_AUDIO_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_authority_receipt_v1';
const WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION =
  'crm_core_instagram_exact_target_identity_anchor_v1';
const WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_DOMAIN =
  'crm-core:instagram:exact-target-utf8:v1\0';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_source_preflight_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_source_preflight_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_UI_ATTESTED_LIVE_PREFLIGHT_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_single_recipient_live_preflight_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_single_recipient_live_authority_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_operation_context_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE = Object.freeze({
  SYNTHETIC_PROOF_ONLY: 'synthetic_proof_only',
});
const WELCOME_AUDIO_LIVE_AUTHORITY_TTL_MS = 5 * 60 * 1000;
const FIXED_AUTHORITY_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-live-authority-v1',
);
const FIXED_CENTRAL_REPO_ROOT = '/Users/alejandrogomez/CRM-core';
const FIXED_CENTRAL_BRANCH = 'codex/crm-core-reentry';
const FIXED_ACTIVE_NEXT_ACTION_PATH = join(
  FIXED_CENTRAL_REPO_ROOT,
  'docs',
  'crm-vnext',
  'crm-core-next-action.md',
);
const FIXED_MISSION_CONTRACT_PATH = join(
  FIXED_CENTRAL_REPO_ROOT,
  'docs',
  'crm-vnext',
  'crm-core-real-new-follower-welcome-e2e-proof-mission-v0.md',
);
const FIXED_UI_ATTESTED_MISSION_CONTRACT_PATH = join(
  FIXED_CENTRAL_REPO_ROOT,
  'docs',
  'crm-vnext',
  'instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md',
);
const AUTHORITY_FILE_NAMES = Object.freeze({
  approval: 'execution-approval-v1.json',
  manifest: 'sealed-backlog-manifest-v1.json',
  interval: 'campaign-interval-v1.json',
});
const SYNTHETIC_AUTHORITY_PREFIX = 'crm-core-welcome-audio-live-authority-test-';
const MAX_AUDIO_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_PRIVATE_AUTHORITY_FILE_BYTES = 256 * 1024;
const execFile = promisify(execFileCallback);

const WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION = Object.freeze({
  VALID: 'validated_private_input',
  BLOCKED: 'blocked_private_input',
});

const WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT = Object.freeze({
  SEALED_MANIFEST: 'sealed_backlog_manifest',
  AUDIO_ASSET: 'approved_audio_asset',
});

const WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_preflight_input_invalid',
  MANIFEST_SCHEMA_INVALID: 'blocked_manifest_schema_invalid',
  MANIFEST_DIGEST_MISMATCH: 'blocked_manifest_digest_mismatch',
  MANIFEST_OVER_CAP: 'blocked_manifest_record_cap_exceeded',
  MANIFEST_ORDER_INVALID: 'blocked_manifest_order_invalid',
  MANIFEST_IDENTITY_DUPLICATE: 'blocked_manifest_identity_duplicate',
  CAMPAIGN_INTERVAL_BINDING_INVALID: 'blocked_campaign_interval_binding_invalid',
  FOLLOW_OUTSIDE_CAMPAIGN_INTERVAL: 'blocked_follow_outside_campaign_interval',
  AUDIO_PATH_INVALID: 'blocked_audio_path_invalid',
  AUDIO_FILE_INVALID: 'blocked_audio_file_invalid',
  AUDIO_FILE_CHANGED: 'blocked_audio_file_changed',
  AUDIO_HASH_MISMATCH: 'blocked_audio_hash_mismatch',
  OPERATION_CONTEXT_INVALID: 'blocked_live_operation_context_invalid',
  OPERATION_GUARD_NOT_PRECLAIM: 'blocked_live_operation_guard_not_preclaim',
  OPERATION_BINDING_DRIFT: 'blocked_live_operation_binding_drift',
  AUTHORITY_INVALID: 'blocked_live_authority_invalid',
  AUTHORITY_EXPIRED: 'blocked_live_authority_expired',
  AUTHORITY_CONSUMED: 'blocked_live_authority_consumed',
  CENTRAL_REPO_INVALID: 'blocked_live_central_repo_not_clean_exact_upstream',
  UI_ATTESTED_SOURCE_INVALID: 'blocked_ui_attested_source_invalid',
  UI_ATTESTED_SOURCE_MODE_INVALID: 'blocked_ui_attested_source_mode_invalid',
  UI_ATTESTED_SOURCE_CAPABILITY_INVALID:
    'blocked_ui_attested_source_capability_invalid',
});

const WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
});

const WELCOME_AUDIO_LIVE_AUTHORITY_MODE = Object.freeze({
  FIXED_OWNER_ONLY: 'fixed_owner_only',
  SYNTHETIC_TEMP_TEST_ONLY: 'synthetic_temp_test_only',
});

const WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'subject',
  'decision',
  'private_capability_issued',
  'records_checked_count',
  'manifest_record_cap',
  'digest_verified',
  'campaign_interval_bound',
  'order_verified',
  'identity_uniqueness_verified',
  'regular_file_verified',
  'stable_file_verified',
  'asset_hash_verified',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const MANIFEST_CAPABILITY_STATE = new WeakMap();
const AUDIO_CAPABILITY_STATE = new WeakMap();
const OPERATION_CONTEXT_CAPABILITY_STATE = new WeakMap();
const AUTHORITY_CAPABILITY_STATE = new WeakMap();
const TARGET_BINDING_CAPABILITY_STATE = new WeakMap();
const UI_ATTESTED_SOURCE_CAPABILITY_STATE = new WeakMap();
const UI_ATTESTED_LIVE_AUTHORITY_CAPABILITY_STATE = new WeakMap();
const UI_ATTESTED_LIVE_SOURCE_CAPABILITY_STATE = new WeakMap();
const UI_ATTESTED_LIVE_OPERATION_CONTEXT_CAPABILITY_STATE = new WeakMap();
const UI_ATTESTED_LIVE_TARGET_BINDING_CAPABILITY_STATE = new WeakMap();
const RECEIPT_DECISIONS = new Set(Object.values(WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION));
const RECEIPT_SUBJECTS = new Set(Object.values(WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT));
const RECEIPT_BLOCKERS = new Set(Object.values(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER));

const WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'pure_guard_preclaim_valid',
  'central_commit_bound',
  'approval_bound',
  'operation_bound',
  'canonical_operation_bound',
  'source_provenance_bound',
  'private_capability_issued',
  'private_target_binding_capability_issued',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_LIVE_AUTHORITY_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'authority_files_owner_only',
  'authority_files_stable',
  'approval_exactly_bound',
  'manifest_exactly_bound',
  'central_repo_clean_exact_upstream',
  'private_authority_capability_issued',
  'private_manifest_capability_issued',
  'private_audio_asset_capability_issued',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'authority_file_owner_only',
  'authority_file_stable',
  'draft_exactly_bound',
  'projection_exactly_bound',
  'tracked_mission_bound',
  'tracked_next_action_bound',
  'central_repo_clean_exact_upstream',
  'audio_asset_exactly_bound',
  'caps_all_one',
  'nonclaims_preserved',
  'private_authority_capability_issued',
  'private_source_capability_issued',
  'private_audio_asset_capability_issued',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'ui_attested_guard_preclaim_valid',
  'authority_bound',
  'draft_bound',
  'projection_bound',
  'source_bound',
  'operation_bound',
  'canonical_operation_bound',
  'central_context_bound',
  'approval_bound',
  'target_bound',
  'audio_bound',
  'dedupe_bound',
  'caps_bound',
  'nonclaims_bound',
  'private_context_capability_issued',
  'private_target_capability_issued',
  'live_claim_issued',
  'pending_effect_recorded',
  'send_allowed',
  'external_effect_invoked',
  'blocker_codes',
]);

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'preflight_contract_version',
  'redaction_status',
  'execution_mode',
  'decision',
  'ui_attested_source_bound',
  'exact_identity_bound',
  'profile_bound',
  'follows_owner_bound',
  'thread_bound',
  'owner_bound',
  'dedupe_bound',
  'private_ui_attested_source_capability_issued',
  'live_authority',
  'live_claim_issued',
  'private_live_claim_capability_issued',
  'live_claim_record_persisted',
  'send_allowed',
  'external_effect_invoked',
  'browser_used',
  'network_used',
  'blocker_codes',
]);

const WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_BINDING_FIELDS = Object.freeze([
  'private_ui_attested_source_capability',
  'required_mode',
  'mission_id',
  'source_evidence_schema_version',
  'source_evidence_sha256',
  'source_record_ordinal',
  'source_evidence_anchor_sha256',
  'profile_anchor_sha256',
  'candidate_anchor_sha256',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'dedupe_anchor_sha256',
  'evidence_observed_at',
  'minimum_issued_at_ms',
  'now_ms',
]);
const WELCOME_AUDIO_UI_ATTESTED_CONNECTED_SOURCE_CAPABILITY_BINDING_FIELDS = Object.freeze([
  ...WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_BINDING_FIELDS,
  'private_slot_binding',
]);

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isOpaqueId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const isExactIsoTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const fatalUtf8Decoder = new TextDecoder('utf-8', { fatal: true });
const isWellFormedUnicode = (value) => {
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
const canonicalSha256 = (value) => sha256Bytes(
  Buffer.from(JSON.stringify(canonicalize(value)), 'utf8'),
);

const computeWelcomeAudioCampaignIntervalSha256 = (campaignInterval) =>
  canonicalSha256(campaignInterval);
const computeWelcomeAudioSealedManifestSha256 = (manifest) => canonicalSha256(manifest);
const computeWelcomeAudioExactIdentityAnchorSha256 = (exactTarget) => {
  if (typeof exactTarget !== 'string' || !isWellFormedUnicode(exactTarget)) {
    throw new TypeError('exact_target_must_be_well_formed_string');
  }
  const targetBytes = Buffer.from(exactTarget, 'utf8');
  if (targetBytes.length < 1 || targetBytes.length > 512) {
    throw new TypeError('exact_target_utf8_length_invalid');
  }
  return sha256Bytes(Buffer.concat([
    Buffer.from(WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_DOMAIN, 'utf8'),
    targetBytes,
  ]));
};

const buildReceipt = ({
  subject,
  valid = false,
  recordsCheckedCount = 0,
  manifest = {},
  asset = {},
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_paths_identities_digests_or_private_values',
  execution_mode: WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  subject,
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  private_capability_issued: valid,
  records_checked_count: recordsCheckedCount,
  manifest_record_cap: WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
  digest_verified: manifest.digest === true,
  campaign_interval_bound: manifest.interval === true,
  order_verified: manifest.order === true,
  identity_uniqueness_verified: manifest.unique === true,
  regular_file_verified: asset.regular === true,
  stable_file_verified: asset.stable === true,
  asset_hash_verified: asset.hash === true,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const blocked = ({ subject, blocker, recordsCheckedCount = 0, manifest, asset }) => ({
  private_capability: null,
  redacted_receipt: buildReceipt({
    subject,
    recordsCheckedCount,
    manifest,
    asset,
    blockerCodes: [blocker],
  }),
});

const createCapability = (stateMap, state, marker) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: { value: Symbol(marker), enumerable: true },
    toJSON: {
      value: () => { throw new TypeError('private_preflight_capability_not_serializable'); },
    },
  });
  Object.freeze(capability);
  stateMap.set(capability, Object.freeze(state));
  return capability;
};

const createOneUseCapability = (stateMap, state, marker) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    capability_marker: { value: Symbol(marker), enumerable: true },
    toJSON: {
      value: () => { throw new TypeError('private_preflight_capability_not_serializable'); },
    },
  });
  Object.freeze(capability);
  stateMap.set(capability, { ...state, consumed: false });
  return capability;
};

const exactMode = (metadata, expected) => (metadata.mode & 0o7777) === expected;

const assertOwnerOnlyAuthorityRoot = async (authorityRoot) => {
  if (
    typeof authorityRoot !== 'string'
    || !isAbsolute(authorityRoot)
    || authorityRoot !== resolve(authorityRoot)
    || authorityRoot.split(sep).some((segment) => segment === '.' || segment === '..')
  ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  const unresolved = await lstat(authorityRoot);
  if (
    !unresolved.isDirectory()
    || unresolved.isSymbolicLink()
    || !exactMode(unresolved, 0o700)
    || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  const canonical = await realpath(authorityRoot);
  if (canonical !== authorityRoot) {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  const metadata = await lstat(canonical);
  if (
    !metadata.isDirectory()
    || metadata.isSymbolicLink()
    || !exactMode(metadata, 0o700)
    || metadata.dev !== unresolved.dev
    || metadata.ino !== unresolved.ino
    || metadata.uid !== unresolved.uid
    || metadata.mode !== unresolved.mode
  ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  return Object.freeze({
    path: canonical,
    dev: metadata.dev,
    ino: metadata.ino,
    uid: metadata.uid,
    mode: metadata.mode,
  });
};

const readStableOwnerOnlyJson = async ({ authorityIdentity, fileName }) => {
  if (![
    ...Object.values(AUTHORITY_FILE_NAMES),
    WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME,
  ].includes(fileName)) {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  const filePath = join(authorityIdentity.path, fileName);
  if (dirname(filePath) !== authorityIdentity.path || basename(filePath) !== fileName) {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  let handle;
  try {
    const unresolved = await lstat(filePath);
    if (
      !unresolved.isFile()
      || unresolved.isSymbolicLink()
      || unresolved.nlink !== 1
      || !exactMode(unresolved, 0o600)
      || unresolved.dev !== authorityIdentity.dev
      || unresolved.size < 2
      || unresolved.size > MAX_PRIVATE_AUTHORITY_FILE_BYTES
      || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      before.dev !== unresolved.dev
      || before.ino !== unresolved.ino
      || before.uid !== unresolved.uid
      || before.mode !== unresolved.mode
      || before.nlink !== unresolved.nlink
      || before.size !== unresolved.size
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(filePath);
    if (
      !sameFileMetadata(after, before)
      || !sameFileMetadata(pathAfter, before)
      || bytes.length !== after.size
    ) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    let snapshot;
    try {
      snapshot = JSON.parse(fatalUtf8Decoder.decode(bytes));
    } catch {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    return Object.freeze({
      snapshot,
      digest: sha256Bytes(bytes),
      metadata: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        uid: after.uid,
        mode: after.mode,
        nlink: after.nlink,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
      }),
    });
  } finally {
    await handle?.close();
  }
};

const readFixedCentralRepoState = async () => {
  const options = {
    encoding: 'utf8',
    maxBuffer: 128 * 1024,
    timeout: 10_000,
  };
  const runGit = async (...args) => (await execFile(
    'git',
    ['-C', FIXED_CENTRAL_REPO_ROOT, ...args],
    options,
  )).stdout.trim();
  try {
    const root = await runGit('rev-parse', '--show-toplevel');
    const branch = await runGit('symbolic-ref', '--quiet', '--short', 'HEAD');
    const head = await runGit('rev-parse', 'HEAD');
    const upstreamHead = await runGit('rev-parse', '@{upstream}');
    const status = await runGit('status', '--porcelain=v1', '--untracked-files=all');
    if (
      root !== FIXED_CENTRAL_REPO_ROOT
      || branch !== FIXED_CENTRAL_BRANCH
      || !/^[a-f0-9]{40}$/.test(head)
      || upstreamHead !== head
      || status !== ''
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    return Object.freeze({ head });
  } catch {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  }
};

const readStableTrackedFile = async (filePath) => {
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await handle.stat();
    if (
      !metadata.isFile()
      || metadata.nlink !== 1
      || metadata.size < 1
      || metadata.size > 2 * 1024 * 1024
      || (typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameFileMetadata(after, metadata) || bytes.length !== after.size) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    }
    return Object.freeze({ bytes, digest: sha256Bytes(bytes) });
  } finally {
    await handle?.close();
  }
};

const parseFinalActiveNextActionId = (bytes) => {
  const text = bytes.toString('utf8');
  const headingPattern = /^## Active Next Action$/gm;
  const matches = [...text.matchAll(headingPattern)];
  if (matches.length < 1) {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  }
  const selected = matches[matches.length - 1];
  const start = selected.index + selected[0].length;
  const remainder = text.slice(start).replace(/^\r?\n/, '');
  const nextHeadingOffset = remainder.search(/^## /m);
  const section = nextHeadingOffset === -1
    ? remainder
    : remainder.slice(0, nextHeadingOffset);
  const idMatches = [...section.matchAll(
    /^- `next_action_id`:\r?\n  `([A-Za-z0-9][A-Za-z0-9._:-]{0,159})`$/gm,
  )];
  if (idMatches.length !== 1 || !isOpaqueId(idMatches[0][1])) {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  }
  return idMatches[0][1];
};

const validateFixedTrackedAuthority = async (approval, beforeState) => {
  try {
    const [nextAction, missionContract] = await Promise.all([
      readStableTrackedFile(FIXED_ACTIVE_NEXT_ACTION_PATH),
      readStableTrackedFile(FIXED_MISSION_CONTRACT_PATH),
    ]);
    const afterState = await readFixedCentralRepoState();
    if (
      !isOpaqueId(approval.active_next_action_id)
      || !isSha256(approval.active_next_action_sha256)
      || nextAction.digest !== approval.active_next_action_sha256
      || parseFinalActiveNextActionId(nextAction.bytes) !== approval.active_next_action_id
      || missionContract.digest !== approval.mission_contract_sha256
      || beforeState?.head !== afterState.head
      || approval.central_repo_head !== afterState.head
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    return true;
  } catch {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  }
};

const WELCOME_AUDIO_LIVE_EXECUTION_APPROVAL_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'active_next_action_id',
  'active_next_action_sha256',
  'central_repo_head',
  'approval_packet_id',
  'manifest_sha256',
  'campaign_interval_sha256',
  'approved_audio_asset_path',
  'approved_audio_asset_sha256',
  'inspection_cap',
  'mission_claim_cap',
  'per_candidate_send_cap',
  'stage_1_confirmation_required',
  'execution_browser',
  'text_fallback',
  'campaign_effect_allowed',
  'approved_at',
  'expires_at',
  'operation_bindings',
]);

const WELCOME_AUDIO_LIVE_EXECUTION_OPERATION_BINDING_FIELDS = Object.freeze([
  'manifest_ordinal',
  'operation_id',
  'exact_target_utf8',
  'identity_anchor_sha256',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
]);

const validateExecutionApproval = ({ approval, manifest, interval, nowMs, centralHead }) => {
  if (
    !exactObjectKeys(approval, WELCOME_AUDIO_LIVE_EXECUTION_APPROVAL_FIELDS)
    || approval.schema_version !== WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION
    || approval.status !== 'approved_for_bounded_live_canary'
    || !isOpaqueId(approval.mission_id)
    || !isOpaqueId(approval.contract_version)
    || !isSha256(approval.mission_contract_sha256)
    || !isOpaqueId(approval.active_next_action_id)
    || !isSha256(approval.active_next_action_sha256)
    || !/^[a-f0-9]{40}$/.test(approval.central_repo_head)
    || approval.central_repo_head !== centralHead
    || !isOpaqueId(approval.approval_packet_id)
    || !isSha256(approval.manifest_sha256)
    || !isSha256(approval.campaign_interval_sha256)
    || typeof approval.approved_audio_asset_path !== 'string'
    || !isAbsolute(approval.approved_audio_asset_path)
    || approval.approved_audio_asset_path !== resolve(approval.approved_audio_asset_path)
    || approval.approved_audio_asset_path.split(sep)
      .some((segment) => segment === '.' || segment === '..')
    || !isSha256(approval.approved_audio_asset_sha256)
    || approval.inspection_cap !== WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS
    || approval.mission_claim_cap !== 3
    || approval.per_candidate_send_cap !== 1
    || approval.stage_1_confirmation_required !== true
    || approval.execution_browser !== 'safari'
    || approval.text_fallback !== 'forbidden'
    || approval.campaign_effect_allowed !== false
    || !isExactIsoTimestamp(approval.approved_at)
    || !isExactIsoTimestamp(approval.expires_at)
    || Date.parse(approval.approved_at) > nowMs
    || Date.parse(approval.expires_at) <= nowMs
    || Date.parse(approval.expires_at) <= Date.parse(approval.approved_at)
    || approval.mission_id !== manifest.mission_id
    || approval.contract_version !== manifest.contract_version
    || approval.manifest_sha256 !== computeWelcomeAudioSealedManifestSha256(manifest)
    || approval.campaign_interval_sha256 !== computeWelcomeAudioCampaignIntervalSha256(interval)
    || !Array.isArray(approval.operation_bindings)
    || approval.operation_bindings.length < 1
    || approval.operation_bindings.length > WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS
  ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  const seenOrdinals = new Set();
  const seenOperations = new Set();
  for (const binding of approval.operation_bindings) {
    const manifestRecord = manifest.ordered_records[binding?.manifest_ordinal - 1];
    if (
      !exactObjectKeys(binding, WELCOME_AUDIO_LIVE_EXECUTION_OPERATION_BINDING_FIELDS)
      || !Number.isInteger(binding.manifest_ordinal)
      || binding.manifest_ordinal < 1
      || binding.manifest_ordinal > manifest.ordered_records.length
      || !isOpaqueId(binding.operation_id)
      || typeof binding.exact_target_utf8 !== 'string'
      || computeWelcomeAudioExactIdentityAnchorSha256(binding.exact_target_utf8)
        !== binding.identity_anchor_sha256
      || !isSha256(binding.identity_anchor_sha256)
      || !isSha256(binding.thread_anchor_sha256)
      || !isSha256(binding.owner_anchor_sha256)
      || !manifestRecord
      || manifestRecord.identity_anchor_sha256 !== binding.identity_anchor_sha256
      || seenOrdinals.has(binding.manifest_ordinal)
      || seenOperations.has(binding.operation_id)
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    seenOrdinals.add(binding.manifest_ordinal);
    seenOperations.add(binding.operation_id);
  }
  return true;
};

const buildAuthorityReceipt = ({ valid = false, blockerCodes = [], fixed = false }) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_paths_commits_approval_ids_anchors_or_digests',
  execution_mode: WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  authority_files_owner_only: valid,
  authority_files_stable: valid,
  approval_exactly_bound: valid,
  manifest_exactly_bound: valid,
  central_repo_clean_exact_upstream: valid && fixed,
  private_authority_capability_issued: valid,
  private_manifest_capability_issued: valid,
  private_audio_asset_capability_issued: valid,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const loadWelcomeAudioLiveAuthority = async ({ authorityRoot, mode, nowMs }) => {
  const blockedAuthority = (blocker) => ({
    private_authority_capability: null,
    private_manifest_capability: null,
    private_audio_asset_capability: null,
    redacted_receipt: buildAuthorityReceipt({ blockerCodes: [blocker] }),
  });
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    return blockedAuthority(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  try {
    const authorityIdentity = await assertOwnerOnlyAuthorityRoot(authorityRoot);
    const [approvalLoaded, manifestLoaded, intervalLoaded] = await Promise.all([
      readStableOwnerOnlyJson({
        authorityIdentity,
        fileName: AUTHORITY_FILE_NAMES.approval,
      }),
      readStableOwnerOnlyJson({
        authorityIdentity,
        fileName: AUTHORITY_FILE_NAMES.manifest,
      }),
      readStableOwnerOnlyJson({
        authorityIdentity,
        fileName: AUTHORITY_FILE_NAMES.interval,
      }),
    ]);
    const authorityIdentityAfter = await assertOwnerOnlyAuthorityRoot(authorityRoot);
    if (
      authorityIdentityAfter.dev !== authorityIdentity.dev
      || authorityIdentityAfter.ino !== authorityIdentity.ino
      || authorityIdentityAfter.uid !== authorityIdentity.uid
      || authorityIdentityAfter.mode !== authorityIdentity.mode
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    const approval = approvalLoaded.snapshot;
    const manifest = manifestLoaded.snapshot;
    const interval = intervalLoaded.snapshot;
    const centralState = mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? await readFixedCentralRepoState()
      : Object.freeze({ head: approval.central_repo_head });
    validateExecutionApproval({
      approval,
      manifest,
      interval,
      nowMs,
      centralHead: centralState.head,
    });
    if (mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
      await validateFixedTrackedAuthority(approval, centralState);
    }
    const manifestResult = validateSealedWelcomeAudioBacklogManifest({
      manifest,
      campaign_interval: interval,
      expected_manifest_sha256: approval.manifest_sha256,
      expected_campaign_interval_sha256: approval.campaign_interval_sha256,
      expected_mission_id: approval.mission_id,
      expected_contract_version: approval.contract_version,
    });
    if (!manifestResult.private_capability) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    const assetResult = await validateApprovedWelcomeAudioAsset({
      asset_path: approval.approved_audio_asset_path,
      expected_audio_sha256: approval.approved_audio_asset_sha256,
    });
    if (!assetResult.private_capability) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    const capabilityIssuedAt = mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? Date.now()
      : nowMs;
    validateExecutionApproval({
      approval,
      manifest,
      interval,
      nowMs: capabilityIssuedAt,
      centralHead: centralState.head,
    });
    const capability = createCapability(
      AUTHORITY_CAPABILITY_STATE,
      {
        mode,
        authority_identity: authorityIdentity,
        approval_loaded: approvalLoaded,
        manifest_loaded: manifestLoaded,
        interval_loaded: intervalLoaded,
        approval,
        manifest_capability: manifestResult.private_capability,
        audio_asset_capability: assetResult.private_capability,
        issued_at_ms: capabilityIssuedAt,
        expires_at_ms: Math.min(
          capabilityIssuedAt + WELCOME_AUDIO_LIVE_AUTHORITY_TTL_MS,
          Date.parse(approval.expires_at),
        ),
      },
      'crm_core_welcome_audio_private_live_authority_capability',
    );
    return {
      private_authority_capability: capability,
      private_manifest_capability: manifestResult.private_capability,
      private_audio_asset_capability: assetResult.private_capability,
      redacted_receipt: buildAuthorityReceipt({
        valid: true,
        fixed: mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
      }),
    };
  } catch (error) {
    return blockedAuthority(RECEIPT_BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
};

const openFixedWelcomeAudioLiveAuthority = async () => loadWelcomeAudioLiveAuthority({
  authorityRoot: FIXED_AUTHORITY_ROOT,
  mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
  nowMs: Date.now(),
});

const createSyntheticWelcomeAudioLiveAuthorityCapability = async ({
  authority_root,
  now_ms,
}) => {
  let canonicalTemp;
  try {
    canonicalTemp = await realpath(tmpdir());
  } catch {
    return {
      private_authority_capability: null,
      private_manifest_capability: null,
      private_audio_asset_capability: null,
      redacted_receipt: buildAuthorityReceipt({
        blockerCodes: [WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID],
      }),
    };
  }
  if (
    typeof authority_root !== 'string'
    || dirname(authority_root) !== canonicalTemp
    || !basename(authority_root).startsWith(SYNTHETIC_AUTHORITY_PREFIX)
  ) return {
    private_authority_capability: null,
    private_manifest_capability: null,
    private_audio_asset_capability: null,
    redacted_receipt: buildAuthorityReceipt({
      blockerCodes: [WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID],
    }),
  };
  return loadWelcomeAudioLiveAuthority({
    authorityRoot: authority_root,
    mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    nowMs: now_ms,
  });
};

const buildUiAttestedLiveAuthorityReceipt = ({
  valid = false,
  blockerCodes = [],
  fixed = false,
} = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_values_paths_times_commits_anchors_or_digests',
  execution_mode: WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  authority_file_owner_only: valid,
  authority_file_stable: valid,
  draft_exactly_bound: valid,
  projection_exactly_bound: valid,
  tracked_mission_bound: valid && fixed,
  tracked_next_action_bound: valid && fixed,
  central_repo_clean_exact_upstream: valid && fixed,
  audio_asset_exactly_bound: valid,
  caps_all_one: valid,
  nonclaims_preserved: valid,
  private_authority_capability_issued: valid,
  private_source_capability_issued: valid,
  private_audio_asset_capability_issued: valid,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const blockedUiAttestedLiveAuthority = (blocker) => Object.freeze({
  private_authority_capability: null,
  private_source_capability: null,
  private_audio_asset_capability: null,
  redacted_receipt: buildUiAttestedLiveAuthorityReceipt({ blockerCodes: [blocker] }),
});

const validateFixedUiAttestedTrackedAuthority = async (authority, beforeState) => {
  try {
    const [nextAction, missionContract] = await Promise.all([
      readStableTrackedFile(FIXED_ACTIVE_NEXT_ACTION_PATH),
      readStableTrackedFile(FIXED_UI_ATTESTED_MISSION_CONTRACT_PATH),
    ]);
    const afterState = await readFixedCentralRepoState();
    if (
      nextAction.digest !== authority.active_next_action_sha256
      || parseFinalActiveNextActionId(nextAction.bytes) !== authority.active_next_action_id
      || missionContract.digest !== authority.mission_contract_sha256
      || beforeState?.head !== afterState.head
      || authority.central_repo_head !== afterState.head
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    return true;
  } catch {
    throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  }
};

const assertUiAttestedLiveAuthorityRootForMode = async ({ authorityRoot, mode }) => {
  if (mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
    if (authorityRoot !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
  } else if (
    mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY
  ) {
    const canonicalTemp = await realpath(tmpdir());
    if (
      dirname(authorityRoot) !== canonicalTemp
      || !basename(authorityRoot).startsWith(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
      )
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  } else throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  return assertOwnerOnlyAuthorityRoot(authorityRoot);
};

const validateSyntheticUiAttestedTrackedBindings = ({ authority, expected }) => {
  if (
    !expected
    || authority.central_repo_head !== expected.central_repo_head
    || authority.mission_contract_sha256 !== expected.mission_contract_sha256
    || authority.active_next_action_id !== expected.active_next_action_id
    || authority.active_next_action_sha256 !== expected.active_next_action_sha256
  ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
  return true;
};

const loadWelcomeAudioUiAttestedLiveAuthority = async ({
  authorityRoot,
  mode,
  nowMs,
  syntheticExpected,
}) => {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    return blockedUiAttestedLiveAuthority(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  try {
    const authorityIdentity = await assertUiAttestedLiveAuthorityRootForMode({
      authorityRoot,
      mode,
    });
    const entries = await readdir(authorityIdentity.path);
    if (
      entries.length !== 1
      || entries[0] !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    const loaded = await readStableOwnerOnlyJson({
      authorityIdentity,
      fileName: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME,
    });
    const identityAfter = await assertUiAttestedLiveAuthorityRootForMode({
      authorityRoot,
      mode,
    });
    if (
      identityAfter.dev !== authorityIdentity.dev
      || identityAfter.ino !== authorityIdentity.ino
      || identityAfter.uid !== authorityIdentity.uid
      || identityAfter.mode !== authorityIdentity.mode
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    if (
      loaded.snapshot?.schema_version
        !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION
      || validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
        loaded.snapshot,
        { now_ms: nowMs },
      ).ok !== true
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    const authority = loaded.snapshot.authority;
    const draft = loaded.snapshot.private_draft;
    const centralState = mode
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? await readFixedCentralRepoState()
      : Object.freeze({ head: syntheticExpected?.central_repo_head ?? null });
    if (authority.central_repo_head !== centralState.head) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CENTRAL_REPO_INVALID);
    }
    if (mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
      await validateFixedUiAttestedTrackedAuthority(authority, centralState);
    } else validateSyntheticUiAttestedTrackedBindings({
      authority,
      expected: syntheticExpected,
    });
    const audioMetadata = await lstat(authority.approved_audio_asset_path);
    if ((audioMetadata.mode & 0o7777) !== 0o600) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    const asset = await validateApprovedWelcomeAudioAsset({
      asset_path: authority.approved_audio_asset_path,
      expected_audio_sha256: authority.approved_audio_asset_sha256,
    });
    if (!asset.private_capability) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    }
    const effectiveIssuedAt = mode
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? Date.now()
      : nowMs;
    if (validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
      loaded.snapshot,
      { now_ms: effectiveIssuedAt },
    ).ok !== true) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
    const sourceCapability = createOneUseCapability(
      UI_ATTESTED_LIVE_SOURCE_CAPABILITY_STATE,
      {
        mode,
        authority_file_digest: loaded.digest,
        mission_id: authority.mission_id,
        contract_version: authority.contract_version,
        operation_id: authority.operation_id,
        source_mission_id: authority.source_mission_id,
        source_evidence_schema_version: draft.source_projection.schema_version,
        source_evidence_sha256: authority.source_evidence_sha256,
        source_record_ordinal: draft.source_projection.notification_row.row_ordinal,
        source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
        profile_anchor_sha256: authority.profile_anchor_sha256,
        candidate_anchor_sha256: authority.candidate_anchor_sha256,
        thread_anchor_sha256: authority.thread_anchor_sha256,
        owner_anchor_sha256: authority.owner_anchor_sha256,
        dedupe_anchor_sha256: authority.dedupe_anchor_sha256,
        exact_target_utf8: authority.exact_target_utf8,
        bound_thread_reference_utf8: authority.bound_thread_reference_utf8,
        owner_account_reference_utf8: authority.owner_account_reference_utf8,
        evidence_observed_at: draft.source_projection.dedupe.checked_at,
        issued_at_ms: effectiveIssuedAt,
        expires_at_ms: Math.min(
          effectiveIssuedAt + WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS,
          Date.parse(authority.expires_at),
        ),
      },
      'crm_core_welcome_audio_private_ui_attested_live_source_capability',
    );
    const capability = createCapability(
      UI_ATTESTED_LIVE_AUTHORITY_CAPABILITY_STATE,
      {
        mode,
        authority_identity: authorityIdentity,
        authority_loaded: loaded,
        envelope: loaded.snapshot,
        authority,
        private_source_capability: sourceCapability,
        private_audio_asset_capability: asset.private_capability,
        synthetic_expected: syntheticExpected,
        issued_at_ms: effectiveIssuedAt,
        expires_at_ms: Math.min(
          effectiveIssuedAt + WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS,
          Date.parse(authority.expires_at),
        ),
      },
      'crm_core_welcome_audio_private_ui_attested_live_authority_capability',
    );
    return Object.freeze({
      private_authority_capability: capability,
      private_source_capability: sourceCapability,
      private_audio_asset_capability: asset.private_capability,
      redacted_receipt: buildUiAttestedLiveAuthorityReceipt({
        valid: true,
        fixed: mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
      }),
    });
  } catch (error) {
    return blockedUiAttestedLiveAuthority(RECEIPT_BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
};

const openFixedWelcomeAudioUiAttestedLiveAuthority = async () => (
  loadWelcomeAudioUiAttestedLiveAuthority({
    authorityRoot: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT,
    mode: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
    nowMs: Date.now(),
    syntheticExpected: null,
  })
);

const createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability = async (
  parameters = {},
) => {
  const envelope = inspectExactUiAttestedEnvelope(parameters, [
    'authority_root',
    'expected_central_repo_head',
    'expected_mission_contract_sha256',
    'expected_active_next_action_id',
    'expected_active_next_action_sha256',
    'now_ms',
  ]);
  if (!envelope.valid) {
    return blockedUiAttestedLiveAuthority(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  return loadWelcomeAudioUiAttestedLiveAuthority({
    authorityRoot: envelope.values.authority_root,
    mode: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    nowMs: envelope.values.now_ms,
    syntheticExpected: Object.freeze({
      central_repo_head: envelope.values.expected_central_repo_head,
      mission_contract_sha256: envelope.values.expected_mission_contract_sha256,
      active_next_action_id: envelope.values.expected_active_next_action_id,
      active_next_action_sha256: envelope.values.expected_active_next_action_sha256,
    }),
  });
};

const revalidateWelcomeAudioUiAttestedLiveAuthorityCapability = async ({
  private_authority_capability,
  now_ms,
}) => {
  const state = UI_ATTESTED_LIVE_AUTHORITY_CAPABILITY_STATE.get(
    private_authority_capability,
  );
  const effectiveNow = state?.mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : now_ms;
  if (
    !state
    || !Number.isFinite(effectiveNow)
    || effectiveNow < state.issued_at_ms
    || effectiveNow >= state.expires_at_ms
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  try {
    const identity = await assertUiAttestedLiveAuthorityRootForMode({
      authorityRoot: state.authority_identity.path,
      mode: state.mode,
    });
    if (
      identity.dev !== state.authority_identity.dev
      || identity.ino !== state.authority_identity.ino
      || identity.uid !== state.authority_identity.uid
      || identity.mode !== state.authority_identity.mode
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    const entries = await readdir(identity.path);
    if (
      entries.length !== 1
      || entries[0] !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    const loaded = await readStableOwnerOnlyJson({
      authorityIdentity: identity,
      fileName: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME,
    });
    if (
      loaded.digest !== state.authority_loaded.digest
      || !sameFileMetadata(loaded.metadata, state.authority_loaded.metadata)
      || validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
        loaded.snapshot,
        { now_ms: effectiveNow },
      ).ok !== true
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    const centralState = state.mode
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? await readFixedCentralRepoState()
      : Object.freeze({ head: state.synthetic_expected?.central_repo_head ?? null });
    if (loaded.snapshot.authority.central_repo_head !== centralState.head) {
      return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    }
    if (state.mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
      await validateFixedUiAttestedTrackedAuthority(loaded.snapshot.authority, centralState);
    } else validateSyntheticUiAttestedTrackedBindings({
      authority: loaded.snapshot.authority,
      expected: state.synthetic_expected,
    });
    if (await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
      private_audio_asset_capability: state.private_audio_asset_capability,
      asset_path: state.authority.approved_audio_asset_path,
      expected_audio_sha256: state.authority.approved_audio_asset_sha256,
    }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
      return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    }
    const audioMetadata = await lstat(state.authority.approved_audio_asset_path);
    if ((audioMetadata.mode & 0o7777) !== 0o600) {
      return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    }
    const finalNow = state.mode
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? Date.now()
      : effectiveNow;
    if (
      !Number.isFinite(finalNow)
      || finalNow < state.issued_at_ms
      || finalNow >= state.expires_at_ms
      || validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
        loaded.snapshot,
        { now_ms: finalNow },
      ).ok !== true
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
  } catch {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
};

const inspectUiAttestedLiveOperationSnapshotBinding = (snapshot) => {
  try {
    const operation = snapshot?.operation;
    const approval = snapshot?.approval;
    const context = snapshot?.context;
    const binding = snapshot?.binding;
    const asset = snapshot?.asset;
    const provenance = snapshot?.source_provenance;
    const follower = snapshot?.follower_evidence;
    if (
      !snapshot
      || typeof snapshot !== 'object'
      || Array.isArray(snapshot)
      || nodeUtilTypes.isProxy(snapshot)
      || !operation
      || !approval
      || !context
      || !binding
      || !asset
      || !provenance
      || !follower
    ) return null;
    return Object.freeze({
      canonical_operation_sha256: snapshot.canonical_operation_sha256,
      operation,
      approval,
      context,
      binding,
      asset,
      provenance,
      follower,
    });
  } catch {
    return null;
  }
};

const validateWelcomeAudioUiAttestedLiveOperationContext = async (parameters = {}) => {
  const blockedContext = (blocker) => Object.freeze({
    private_capability: null,
    private_target_binding_capability: null,
    redacted_receipt: buildUiAttestedLiveOperationContextReceipt({
      blockerCodes: [blocker],
    }),
  });
  const input = inspectExactUiAttestedEnvelope(parameters, [
    'operation_snapshot',
    'private_authority_capability',
    'private_source_capability',
    'private_audio_asset_capability',
    'expected_canonical_operation_sha256',
    'now_ms',
  ]);
  if (!input.valid) {
    return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID);
  }
  const values = input.values;
  const authorityState = UI_ATTESTED_LIVE_AUTHORITY_CAPABILITY_STATE.get(
    values.private_authority_capability,
  );
  const sourceState = UI_ATTESTED_LIVE_SOURCE_CAPABILITY_STATE.get(
    values.private_source_capability,
  );
  const effectiveNow = authorityState?.mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : values.now_ms;
  if (
    !authorityState
    || !sourceState
    || sourceState.consumed
    || authorityState.private_source_capability !== values.private_source_capability
    || authorityState.private_audio_asset_capability !== values.private_audio_asset_capability
    || !isSha256(values.expected_canonical_operation_sha256)
    || !Number.isFinite(effectiveNow)
    || effectiveNow < authorityState.issued_at_ms
    || effectiveNow >= authorityState.expires_at_ms
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID);
  if (await revalidateWelcomeAudioUiAttestedLiveAuthorityCapability({
    private_authority_capability: values.private_authority_capability,
    now_ms: effectiveNow,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
    return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }
  let guard;
  try {
    guard = validateWelcomeAudioOperation(values.operation_snapshot, {
      expectedCanonicalOperationSha256: values.expected_canonical_operation_sha256,
      nowMs: effectiveNow,
    });
  } catch {
    return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_GUARD_NOT_PRECLAIM);
  }
  if (
    guard?.ok !== true
    || guard?.state_valid !== true
    || guard?.phase !== WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
    || guard?.decision !== WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    || guard?.claim_allowed !== true
    || guard?.send_ready !== false
    || guard?.send_allowed !== false
    || guard?.terminal !== false
    || !Array.isArray(guard?.blockers)
    || guard.blockers.length !== 0
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_GUARD_NOT_PRECLAIM);
  const snapshot = inspectUiAttestedLiveOperationSnapshotBinding(values.operation_snapshot);
  const authority = authorityState.authority;
  if (
    !snapshot
    || snapshot.canonical_operation_sha256 !== values.expected_canonical_operation_sha256
    || snapshot.canonical_operation_sha256 !== authority.canonical_operation_sha256
    || snapshot.operation.mission_id !== authority.mission_id
    || snapshot.operation.approval_packet_id !== authority.approval_packet_id
    || snapshot.operation.operation_id !== authority.operation_id
    || snapshot.operation.source_evidence_anchor_sha256
      !== authority.source_evidence_anchor_sha256
    || snapshot.operation.profile_anchor_sha256 !== authority.profile_anchor_sha256
    || snapshot.operation.candidate_anchor_sha256 !== authority.candidate_anchor_sha256
    || snapshot.operation.thread_anchor_sha256 !== authority.thread_anchor_sha256
    || snapshot.operation.owner_anchor_sha256 !== authority.owner_anchor_sha256
    || snapshot.operation.approved_audio_asset_sha256
      !== authority.approved_audio_asset_sha256
    || snapshot.approval.mission_id !== authority.mission_id
    || snapshot.approval.approval_packet_id !== authority.approval_packet_id
    || snapshot.approval.operation_id !== authority.operation_id
    || snapshot.approval.source_evidence_anchor_sha256
      !== authority.source_evidence_anchor_sha256
    || snapshot.approval.profile_anchor_sha256 !== authority.profile_anchor_sha256
    || snapshot.approval.candidate_anchor_sha256 !== authority.candidate_anchor_sha256
    || snapshot.approval.thread_anchor_sha256 !== authority.thread_anchor_sha256
    || snapshot.approval.owner_anchor_sha256 !== authority.owner_anchor_sha256
    || snapshot.approval.approved_audio_asset_sha256
      !== authority.approved_audio_asset_sha256
    || snapshot.context.central_repo_head !== authority.central_repo_head
    || snapshot.context.expected_central_repo_head !== authority.central_repo_head
    || snapshot.context.mission_id !== authority.mission_id
    || snapshot.context.expected_mission_id !== authority.mission_id
    || snapshot.context.approval_packet_id !== authority.approval_packet_id
    || snapshot.context.operation_id !== authority.operation_id
    || snapshot.binding.source_evidence_anchor_sha256
      !== authority.source_evidence_anchor_sha256
    || snapshot.binding.profile_anchor_sha256 !== authority.profile_anchor_sha256
    || snapshot.binding.candidate_anchor_sha256 !== authority.candidate_anchor_sha256
    || snapshot.binding.thread_anchor_sha256 !== authority.thread_anchor_sha256
    || snapshot.binding.owner_anchor_sha256 !== authority.owner_anchor_sha256
    || snapshot.asset.approved_audio_asset_sha256 !== authority.approved_audio_asset_sha256
    || snapshot.provenance.source_evidence_schema_version
      !== sourceState.source_evidence_schema_version
    || snapshot.provenance.source_evidence_sha256 !== authority.source_evidence_sha256
    || snapshot.provenance.source_evidence_anchor_sha256
      !== authority.source_evidence_anchor_sha256
    || snapshot.provenance.source_record_ordinal !== sourceState.source_record_ordinal
    || snapshot.provenance.exact_follow_timestamp_claimed !== false
    || snapshot.provenance.provider_event_id_claimed !== false
    || snapshot.provenance.campaign_membership_claimed !== false
    || snapshot.follower.evidence_observed_at !== sourceState.evidence_observed_at
    || sourceState.authority_file_digest !== authorityState.authority_loaded.digest
    || sourceState.operation_id !== authority.operation_id
    || sourceState.candidate_anchor_sha256 !== authority.candidate_anchor_sha256
    || sourceState.thread_anchor_sha256 !== authority.thread_anchor_sha256
    || sourceState.owner_anchor_sha256 !== authority.owner_anchor_sha256
    || sourceState.dedupe_anchor_sha256 !== authority.dedupe_anchor_sha256
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_BINDING_DRIFT);
  const contextCapability = createOneUseCapability(
    UI_ATTESTED_LIVE_OPERATION_CONTEXT_CAPABILITY_STATE,
    {
      private_authority_capability: values.private_authority_capability,
      private_source_capability: values.private_source_capability,
      private_audio_asset_capability: values.private_audio_asset_capability,
      authority_mode: authorityState.mode,
      mission_id: authority.mission_id,
      contract_version: authority.contract_version,
      mission_contract_sha256: authority.mission_contract_sha256,
      active_next_action_id: authority.active_next_action_id,
      active_next_action_sha256: authority.active_next_action_sha256,
      approval_packet_id: authority.approval_packet_id,
      authorization_id: authority.authorization_id,
      operation_id: authority.operation_id,
      central_repo_head: authority.central_repo_head,
      canonical_operation_sha256: values.expected_canonical_operation_sha256,
      draft_sha256: authority.draft_sha256,
      projection_sha256: authority.projection_sha256,
      source_mission_id: authority.source_mission_id,
      source_evidence_schema_version: sourceState.source_evidence_schema_version,
      source_evidence_sha256: authority.source_evidence_sha256,
      source_record_ordinal: sourceState.source_record_ordinal,
      source_record_cap: WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
      evidence_observed_at: sourceState.evidence_observed_at,
      source_evidence_anchor_sha256: authority.source_evidence_anchor_sha256,
      profile_anchor_sha256: authority.profile_anchor_sha256,
      identity_anchor_sha256: authority.candidate_anchor_sha256,
      thread_anchor_sha256: authority.thread_anchor_sha256,
      owner_anchor_sha256: authority.owner_anchor_sha256,
      dedupe_anchor_sha256: authority.dedupe_anchor_sha256,
      approved_audio_asset_id: authority.approved_audio_asset_id,
      approved_audio_asset_path: authority.approved_audio_asset_path,
      audio_asset_sha256: authority.approved_audio_asset_sha256,
      candidate_cap: 1,
      claim_cap: 1,
      pending_cap: 1,
      upload_cap: 1,
      send_cap: 1,
      retry_cap: 0,
      exact_follow_timestamp_claimed: false,
      provider_event_id_claimed: false,
      campaign_membership_claimed: false,
      issued_at_ms: effectiveNow,
      expires_at_ms: authorityState.expires_at_ms,
    },
    'crm_core_welcome_audio_private_ui_attested_live_operation_context_capability',
  );
  const targetCapability = createOneUseCapability(
    UI_ATTESTED_LIVE_TARGET_BINDING_CAPABILITY_STATE,
    {
      private_authority_capability: values.private_authority_capability,
      private_source_capability: values.private_source_capability,
      authority_mode: authorityState.mode,
      operation_id: authority.operation_id,
      draft_sha256: authority.draft_sha256,
      projection_sha256: authority.projection_sha256,
      source_evidence_sha256: authority.source_evidence_sha256,
      exact_target_utf8: authority.exact_target_utf8,
      bound_thread_reference_utf8: authority.bound_thread_reference_utf8,
      owner_account_reference_utf8: authority.owner_account_reference_utf8,
      identity_anchor_sha256: authority.candidate_anchor_sha256,
      thread_anchor_sha256: authority.thread_anchor_sha256,
      owner_anchor_sha256: authority.owner_anchor_sha256,
      dedupe_anchor_sha256: authority.dedupe_anchor_sha256,
      issued_at_ms: effectiveNow,
      expires_at_ms: authorityState.expires_at_ms,
    },
    'crm_core_welcome_audio_private_ui_attested_live_target_binding_capability',
  );
  return Object.freeze({
    private_capability: contextCapability,
    private_target_binding_capability: targetCapability,
    redacted_receipt: buildUiAttestedLiveOperationContextReceipt({ valid: true }),
  });
};

const inspectWelcomeAudioUiAttestedLiveOperationContextCapability = async (parameters = {}) => {
  const input = inspectExactUiAttestedEnvelope(parameters, [
    'private_operation_context_capability',
    'private_authority_capability',
    'private_audio_asset_capability',
    'required_authority_mode',
    'mission_id',
    'contract_version',
    'mission_contract_sha256',
    'active_next_action_id',
    'active_next_action_sha256',
    'approval_packet_id',
    'authorization_id',
    'operation_id',
    'central_repo_head',
    'canonical_operation_sha256',
    'draft_sha256',
    'projection_sha256',
    'source_mission_id',
    'source_evidence_schema_version',
    'source_evidence_sha256',
    'source_record_ordinal',
    'source_record_cap',
    'evidence_observed_at',
    'source_evidence_anchor_sha256',
    'profile_anchor_sha256',
    'identity_anchor_sha256',
    'thread_anchor_sha256',
    'owner_anchor_sha256',
    'dedupe_anchor_sha256',
    'approved_audio_asset_id',
    'approved_audio_asset_path',
    'audio_asset_sha256',
    'candidate_cap',
    'claim_cap',
    'pending_cap',
    'upload_cap',
    'send_cap',
    'retry_cap',
    'exact_follow_timestamp_claimed',
    'provider_event_id_claimed',
    'campaign_membership_claimed',
    'now_ms',
  ]);
  if (!input.valid) return Object.freeze({
    status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    state: null,
  });
  const state = UI_ATTESTED_LIVE_OPERATION_CONTEXT_CAPABILITY_STATE.get(
    input.values.private_operation_context_capability,
  );
  const values = input.values;
  const effectiveNow = state?.authority_mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : values.now_ms;
  const exact = state
    && !state.consumed
    && state.private_authority_capability === values.private_authority_capability
    && state.private_audio_asset_capability === values.private_audio_asset_capability
    && state.authority_mode === values.required_authority_mode
    && state.mission_id === values.mission_id
    && state.contract_version === values.contract_version
    && state.mission_contract_sha256 === values.mission_contract_sha256
    && state.active_next_action_id === values.active_next_action_id
    && state.active_next_action_sha256 === values.active_next_action_sha256
    && state.approval_packet_id === values.approval_packet_id
    && state.authorization_id === values.authorization_id
    && state.operation_id === values.operation_id
    && state.central_repo_head === values.central_repo_head
    && state.canonical_operation_sha256 === values.canonical_operation_sha256
    && state.draft_sha256 === values.draft_sha256
    && state.projection_sha256 === values.projection_sha256
    && state.source_mission_id === values.source_mission_id
    && state.source_evidence_schema_version === values.source_evidence_schema_version
    && state.source_evidence_sha256 === values.source_evidence_sha256
    && state.source_record_ordinal === values.source_record_ordinal
    && state.source_record_cap === values.source_record_cap
    && state.evidence_observed_at === values.evidence_observed_at
    && state.source_evidence_anchor_sha256 === values.source_evidence_anchor_sha256
    && state.profile_anchor_sha256 === values.profile_anchor_sha256
    && state.identity_anchor_sha256 === values.identity_anchor_sha256
    && state.thread_anchor_sha256 === values.thread_anchor_sha256
    && state.owner_anchor_sha256 === values.owner_anchor_sha256
    && state.dedupe_anchor_sha256 === values.dedupe_anchor_sha256
    && state.approved_audio_asset_id === values.approved_audio_asset_id
    && state.approved_audio_asset_path === values.approved_audio_asset_path
    && state.audio_asset_sha256 === values.audio_asset_sha256
    && state.candidate_cap === values.candidate_cap
    && state.claim_cap === values.claim_cap
    && state.pending_cap === values.pending_cap
    && state.upload_cap === values.upload_cap
    && state.send_cap === values.send_cap
    && state.retry_cap === values.retry_cap
    && state.exact_follow_timestamp_claimed === values.exact_follow_timestamp_claimed
    && state.provider_event_id_claimed === values.provider_event_id_claimed
    && state.campaign_membership_claimed === values.campaign_membership_claimed
    && Number.isFinite(effectiveNow)
    && effectiveNow >= state.issued_at_ms
    && effectiveNow < state.expires_at_ms;
  if (!exact || await revalidateWelcomeAudioUiAttestedLiveAuthorityCapability({
    private_authority_capability: state.private_authority_capability,
    now_ms: effectiveNow,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) return Object.freeze({
    status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    state: null,
  });
  const finalNow = state.authority_mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : effectiveNow;
  if (
    !Number.isFinite(finalNow)
    || finalNow < state.issued_at_ms
    || finalNow >= state.expires_at_ms
  ) return Object.freeze({
    status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
    state: null,
  });
  return Object.freeze({
    status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
    state,
  });
};

const verifyWelcomeAudioUiAttestedLiveOperationContextCapabilityBinding = async (
  parameters = {},
) => (await inspectWelcomeAudioUiAttestedLiveOperationContextCapability(parameters)).status;

const consumeWelcomeAudioUiAttestedLiveOperationContextCapabilityOnce = async (
  parameters = {},
) => {
  const inspected = await inspectWelcomeAudioUiAttestedLiveOperationContextCapability(parameters);
  if (
    inspected.status !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
    || !inspected.state
    || inspected.state.consumed
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  const sourceState = UI_ATTESTED_LIVE_SOURCE_CAPABILITY_STATE.get(
    inspected.state.private_source_capability,
  );
  if (!sourceState || sourceState.consumed) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  sourceState.consumed = true;
  inspected.state.consumed = true;
  return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
};

const consumeWelcomeAudioUiAttestedLiveAdmissionCapabilitySetOnce =
  consumeWelcomeAudioUiAttestedLiveOperationContextCapabilityOnce;

const consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce = async (
  parameters = {},
) => {
  const input = inspectExactUiAttestedEnvelope(parameters, [
    'private_target_binding_capability',
    'private_authority_capability',
    'private_source_capability',
    'required_authority_mode',
    'exact_target',
    'exact_bound_thread_reference',
    'exact_owner_account_reference',
    'expected_operation_id',
    'expected_draft_sha256',
    'expected_projection_sha256',
    'expected_source_evidence_sha256',
    'expected_identity_anchor_sha256',
    'expected_thread_anchor_sha256',
    'expected_owner_anchor_sha256',
    'expected_dedupe_anchor_sha256',
    'now_ms',
  ]);
  if (!input.valid) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  const values = input.values;
  const state = UI_ATTESTED_LIVE_TARGET_BINDING_CAPABILITY_STATE.get(
    values.private_target_binding_capability,
  );
  const effectiveNow = state?.authority_mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : values.now_ms;
  if (
    !state
    || state.consumed
    || state.private_authority_capability !== values.private_authority_capability
    || state.private_source_capability !== values.private_source_capability
    || state.authority_mode !== values.required_authority_mode
    || state.exact_target_utf8 !== values.exact_target
    || state.bound_thread_reference_utf8 !== values.exact_bound_thread_reference
    || state.owner_account_reference_utf8 !== values.exact_owner_account_reference
    || state.operation_id !== values.expected_operation_id
    || state.draft_sha256 !== values.expected_draft_sha256
    || state.projection_sha256 !== values.expected_projection_sha256
    || state.source_evidence_sha256 !== values.expected_source_evidence_sha256
    || state.identity_anchor_sha256 !== values.expected_identity_anchor_sha256
    || state.thread_anchor_sha256 !== values.expected_thread_anchor_sha256
    || state.owner_anchor_sha256 !== values.expected_owner_anchor_sha256
    || state.dedupe_anchor_sha256 !== values.expected_dedupe_anchor_sha256
    || !Number.isFinite(effectiveNow)
    || effectiveNow < state.issued_at_ms
    || effectiveNow >= state.expires_at_ms
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  if (await revalidateWelcomeAudioUiAttestedLiveAuthorityCapability({
    private_authority_capability: state.private_authority_capability,
    now_ms: effectiveNow,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  const finalNow = state.authority_mode
    === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : effectiveNow;
  if (
    !Number.isFinite(finalNow)
    || finalNow < state.issued_at_ms
    || finalNow >= state.expires_at_ms
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  if (state.consumed) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  state.consumed = true;
  return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
};

const validateCampaignInterval = ({ campaignInterval, expectedSha256 }) => {
  if (!exactObjectKeys(campaignInterval, ['schema_version', 'start_at', 'end_at'])) {
    return { ok: false, blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_SCHEMA_INVALID };
  }
  if (
    campaignInterval.schema_version !== WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION
    || !isExactIsoTimestamp(campaignInterval.start_at)
    || !isExactIsoTimestamp(campaignInterval.end_at)
    || Date.parse(campaignInterval.start_at) > Date.parse(campaignInterval.end_at)
    || !isSha256(expectedSha256)
    || computeWelcomeAudioCampaignIntervalSha256(campaignInterval) !== expectedSha256
  ) return {
    ok: false,
    blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.CAMPAIGN_INTERVAL_BINDING_INVALID,
  };
  return {
    ok: true,
    startMs: Date.parse(campaignInterval.start_at),
    endMs: Date.parse(campaignInterval.end_at),
  };
};

const validateSealedWelcomeAudioBacklogManifest = ({
  manifest,
  campaign_interval,
  expected_manifest_sha256,
  expected_campaign_interval_sha256,
  expected_mission_id,
  expected_contract_version,
}) => {
  const subject = WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT.SEALED_MANIFEST;
  if (
    !isSha256(expected_manifest_sha256)
    || !isSha256(expected_campaign_interval_sha256)
    || !isOpaqueId(expected_mission_id)
    || !isOpaqueId(expected_contract_version)
  ) return blocked({ subject, blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.INPUT_INVALID });

  if (!exactObjectKeys(manifest, [
    'schema_version',
    'identity_anchor_schema_version',
    'mission_id',
    'contract_version',
    'campaign_interval_sha256',
    'ordered_records',
  ]) || !Array.isArray(manifest.ordered_records)) {
    return blocked({ subject, blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_SCHEMA_INVALID });
  }
  const recordsCheckedCount = manifest.ordered_records.length;
  if (recordsCheckedCount < 1 || recordsCheckedCount > WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS) {
    return blocked({
      subject,
      blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_OVER_CAP,
      recordsCheckedCount,
    });
  }
  if (
    manifest.schema_version !== WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION
    || manifest.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || manifest.mission_id !== expected_mission_id
    || manifest.contract_version !== expected_contract_version
    || manifest.campaign_interval_sha256 !== expected_campaign_interval_sha256
  ) return blocked({
    subject,
    blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_SCHEMA_INVALID,
    recordsCheckedCount,
  });

  const interval = validateCampaignInterval({
    campaignInterval: campaign_interval,
    expectedSha256: expected_campaign_interval_sha256,
  });
  if (!interval.ok) return blocked({ subject, blocker: interval.blocker, recordsCheckedCount });
  if (computeWelcomeAudioSealedManifestSha256(manifest) !== expected_manifest_sha256) {
    return blocked({
      subject,
      blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_DIGEST_MISMATCH,
      recordsCheckedCount,
      manifest: { interval: true },
    });
  }

  const identityOrdinals = new Map();
  for (let index = 0; index < manifest.ordered_records.length; index += 1) {
    const record = manifest.ordered_records[index];
    if (!exactObjectKeys(record, [
      'ordinal',
      'identity_anchor_sha256',
      'followed_at',
      'campaign_interval_sha256',
    ]) || record.ordinal !== index + 1) {
      return blocked({
        subject,
        blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_ORDER_INVALID,
        recordsCheckedCount,
        manifest: { digest: true, interval: true },
      });
    }
    if (
      !isSha256(record.identity_anchor_sha256)
      || !isExactIsoTimestamp(record.followed_at)
      || record.campaign_interval_sha256 !== expected_campaign_interval_sha256
    ) return blocked({
      subject,
      blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_SCHEMA_INVALID,
      recordsCheckedCount,
      manifest: { digest: true, interval: true, order: true },
    });
    if (identityOrdinals.has(record.identity_anchor_sha256)) {
      return blocked({
        subject,
        blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.MANIFEST_IDENTITY_DUPLICATE,
        recordsCheckedCount,
        manifest: { digest: true, interval: true, order: true },
      });
    }
    const followedAtMs = Date.parse(record.followed_at);
    if (followedAtMs < interval.startMs || followedAtMs > interval.endMs) {
      return blocked({
        subject,
        blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.FOLLOW_OUTSIDE_CAMPAIGN_INTERVAL,
        recordsCheckedCount,
        manifest: { digest: true, interval: true, order: true, unique: true },
      });
    }
    identityOrdinals.set(record.identity_anchor_sha256, record.ordinal);
  }

  const capability = createCapability(
    MANIFEST_CAPABILITY_STATE,
    {
      mission_id: expected_mission_id,
      contract_version: expected_contract_version,
      manifest_sha256: expected_manifest_sha256,
      campaign_interval_sha256: expected_campaign_interval_sha256,
      identity_ordinals: identityOrdinals,
      records_checked_count: recordsCheckedCount,
    },
    'crm_core_welcome_audio_private_manifest_capability',
  );
  return {
    private_capability: capability,
    redacted_receipt: buildReceipt({
      subject,
      valid: true,
      recordsCheckedCount,
      manifest: { digest: true, interval: true, order: true, unique: true },
    }),
  };
};

const sameFileMetadata = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs
  && actual.ctimeMs === expected.ctimeMs;

const revalidateWelcomeAudioLiveAuthorityCapability = async ({
  private_authority_capability,
  now_ms,
}) => {
  const state = AUTHORITY_CAPABILITY_STATE.get(private_authority_capability);
  if (!state) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  const effectiveNow = state.mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : now_ms;
  if (
    !Number.isFinite(effectiveNow)
    || effectiveNow < state.issued_at_ms
    || effectiveNow >= state.expires_at_ms
  ) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  try {
    const identity = await assertOwnerOnlyAuthorityRoot(state.authority_identity.path);
    if (
      identity.dev !== state.authority_identity.dev
      || identity.ino !== state.authority_identity.ino
      || identity.uid !== state.authority_identity.uid
      || identity.mode !== state.authority_identity.mode
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    const [approvalLoaded, manifestLoaded, intervalLoaded] = await Promise.all([
      readStableOwnerOnlyJson({ authorityIdentity: identity, fileName: AUTHORITY_FILE_NAMES.approval }),
      readStableOwnerOnlyJson({ authorityIdentity: identity, fileName: AUTHORITY_FILE_NAMES.manifest }),
      readStableOwnerOnlyJson({ authorityIdentity: identity, fileName: AUTHORITY_FILE_NAMES.interval }),
    ]);
    const identityAfter = await assertOwnerOnlyAuthorityRoot(state.authority_identity.path);
    if (
      identityAfter.dev !== identity.dev
      || identityAfter.ino !== identity.ino
      || identityAfter.uid !== identity.uid
      || identityAfter.mode !== identity.mode
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    for (const [fresh, expected] of [
      [approvalLoaded, state.approval_loaded],
      [manifestLoaded, state.manifest_loaded],
      [intervalLoaded, state.interval_loaded],
    ]) {
      if (
        fresh.digest !== expected.digest
        || !sameFileMetadata(fresh.metadata, expected.metadata)
      ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    }
    const centralState = state.mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? await readFixedCentralRepoState()
      : Object.freeze({ head: state.approval.central_repo_head });
    validateExecutionApproval({
      approval: approvalLoaded.snapshot,
      manifest: manifestLoaded.snapshot,
      interval: intervalLoaded.snapshot,
      nowMs: effectiveNow,
      centralHead: centralState.head,
    });
    if (state.mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
      await validateFixedTrackedAuthority(approvalLoaded.snapshot, centralState);
    }
    if (await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
      private_audio_asset_capability: state.audio_asset_capability,
      asset_path: approvalLoaded.snapshot.approved_audio_asset_path,
      expected_audio_sha256: approvalLoaded.snapshot.approved_audio_asset_sha256,
    }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
      return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    }
    const finalNow = state.mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
      ? Date.now()
      : effectiveNow;
    if (
      !Number.isFinite(finalNow)
      || finalNow < state.issued_at_ms
      || finalNow >= state.expires_at_ms
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    validateExecutionApproval({
      approval: approvalLoaded.snapshot,
      manifest: manifestLoaded.snapshot,
      interval: intervalLoaded.snapshot,
      nowMs: finalNow,
      centralHead: centralState.head,
    });
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
  } catch {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
};

const readStableAudioAsset = async (assetPath) => {
  let handle;
  try {
    const pathMetadata = await lstat(assetPath);
    if (
      !pathMetadata.isFile()
      || pathMetadata.isSymbolicLink()
      || pathMetadata.nlink !== 1
      || pathMetadata.size < 1
      || pathMetadata.size > MAX_AUDIO_ASSET_BYTES
      || (typeof process.getuid === 'function' && pathMetadata.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_INVALID);
    handle = await open(assetPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (!sameFileMetadata(before, pathMetadata)) {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_CHANGED);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(assetPath);
    if (
      bytes.length !== after.size
      || !sameFileMetadata(after, before)
      || !sameFileMetadata(pathAfter, before)
    ) throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_CHANGED);
    return {
      digest: sha256Bytes(bytes),
      metadata: Object.freeze({
        dev: after.dev,
        ino: after.ino,
        uid: after.uid,
        mode: after.mode,
        nlink: after.nlink,
        size: after.size,
        mtimeMs: after.mtimeMs,
        ctimeMs: after.ctimeMs,
      }),
    };
  } catch (error) {
    if (error?.code === 'ELOOP' || error?.code === 'ENOENT') {
      throw new Error(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const validateApprovedWelcomeAudioAsset = async ({
  asset_path,
  expected_audio_sha256,
}) => {
  const subject = WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT.AUDIO_ASSET;
  const segments = typeof asset_path === 'string' ? asset_path.split(sep) : [];
  if (
    typeof asset_path !== 'string'
    || !isAbsolute(asset_path)
    || asset_path !== resolve(asset_path)
    || segments.some((segment) => segment === '.' || segment === '..')
    || !isSha256(expected_audio_sha256)
  ) return blocked({ subject, blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_PATH_INVALID });

  try {
    const canonicalPath = await realpath(asset_path);
    if (canonicalPath !== asset_path) {
      return blocked({ subject, blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_PATH_INVALID });
    }
    const stable = await readStableAudioAsset(asset_path);
    if (stable.digest !== expected_audio_sha256) {
      return blocked({
        subject,
        blocker: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_HASH_MISMATCH,
        asset: { regular: true, stable: true },
      });
    }
    const capability = createCapability(
      AUDIO_CAPABILITY_STATE,
      {
        asset_path,
        expected_audio_sha256,
        metadata: stable.metadata,
      },
      'crm_core_welcome_audio_private_asset_capability',
    );
    return {
      private_capability: capability,
      redacted_receipt: buildReceipt({
        subject,
        valid: true,
        asset: { regular: true, stable: true, hash: true },
      }),
    };
  } catch (error) {
    const blocker = RECEIPT_BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUDIO_FILE_INVALID;
    return blocked({ subject, blocker });
  }
};

const verifySealedWelcomeAudioManifestCapability = ({
  private_manifest_capability,
  mission_id,
  contract_version,
  manifest_sha256,
  campaign_interval_sha256,
  identity_anchor_sha256,
  manifest_ordinal,
}) => {
  const state = MANIFEST_CAPABILITY_STATE.get(private_manifest_capability);
  return state
    && state.mission_id === mission_id
    && state.contract_version === contract_version
    && state.manifest_sha256 === manifest_sha256
    && state.campaign_interval_sha256 === campaign_interval_sha256
    && state.identity_ordinals.get(identity_anchor_sha256) === manifest_ordinal
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
};

const revalidateApprovedWelcomeAudioAssetCapability = async ({
  private_audio_asset_capability,
  expected_audio_sha256,
}) => {
  const state = AUDIO_CAPABILITY_STATE.get(private_audio_asset_capability);
  if (!state || state.expected_audio_sha256 !== expected_audio_sha256) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  try {
    const stable = await readStableAudioAsset(state.asset_path);
    return stable.digest === expected_audio_sha256
      && sameFileMetadata(stable.metadata, state.metadata)
      ? WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
      : WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  } catch {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
};

const verifyApprovedWelcomeAudioAssetCapabilityPathBinding = async ({
  private_audio_asset_capability,
  asset_path,
  expected_audio_sha256,
}) => {
  const state = AUDIO_CAPABILITY_STATE.get(private_audio_asset_capability);
  if (
    !state
    || typeof asset_path !== 'string'
    || state.asset_path !== asset_path
    || state.expected_audio_sha256 !== expected_audio_sha256
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  return revalidateApprovedWelcomeAudioAssetCapability({
    private_audio_asset_capability,
    expected_audio_sha256,
  });
};

const buildOperationContextReceipt = ({ valid = false, blockerCodes = [] }) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_commits_approval_ids_operations_anchors_or_digests',
  execution_mode: WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  pure_guard_preclaim_valid: valid,
  central_commit_bound: valid,
  approval_bound: valid,
  operation_bound: valid,
  canonical_operation_bound: valid,
  source_provenance_bound: valid,
  private_capability_issued: valid,
  private_target_binding_capability_issued: valid,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const buildUiAttestedLiveOperationContextReceipt = ({
  valid = false,
  blockerCodes = [],
} = {}) => Object.freeze({
  receipt_schema_version:
    WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_values_paths_times_commits_anchors_or_digests',
  execution_mode: WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  ui_attested_guard_preclaim_valid: valid,
  authority_bound: valid,
  draft_bound: valid,
  projection_bound: valid,
  source_bound: valid,
  operation_bound: valid,
  canonical_operation_bound: valid,
  central_context_bound: valid,
  approval_bound: valid,
  target_bound: valid,
  audio_bound: valid,
  dedupe_bound: valid,
  caps_bound: valid,
  nonclaims_bound: valid,
  private_context_capability_issued: valid,
  private_target_capability_issued: valid,
  live_claim_issued: false,
  pending_effect_recorded: false,
  send_allowed: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const validateWelcomeAudioLiveOperationContext = async ({
  operation_snapshot,
  private_authority_capability,
  expected_canonical_operation_sha256,
  expected_mission_id,
  expected_contract_version,
  expected_mission_contract_sha256,
  expected_approval_packet_id,
  expected_operation_id,
  expected_central_repo_head,
  expected_manifest_sha256,
  expected_campaign_interval_sha256,
  expected_identity_anchor_sha256,
  expected_thread_anchor_sha256,
  expected_owner_anchor_sha256,
  expected_audio_sha256,
  expected_manifest_ordinal,
  private_manifest_capability,
  private_audio_asset_capability,
  now_ms,
}) => {
  const blockedContext = (blocker) => ({
    private_capability: null,
    private_target_binding_capability: null,
    redacted_receipt: buildOperationContextReceipt({ blockerCodes: [blocker] }),
  });
  const authorityState = AUTHORITY_CAPABILITY_STATE.get(private_authority_capability);
  const effectiveNow = authorityState?.mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : now_ms;
  if (
    !authorityState
    || !isSha256(expected_canonical_operation_sha256)
    || !isOpaqueId(expected_mission_id)
    || !isOpaqueId(expected_contract_version)
    || !isSha256(expected_mission_contract_sha256)
    || !isOpaqueId(expected_approval_packet_id)
    || !isOpaqueId(expected_operation_id)
    || typeof expected_central_repo_head !== 'string'
    || !/^[a-f0-9]{40}$/.test(expected_central_repo_head)
    || !isSha256(expected_manifest_sha256)
    || !isSha256(expected_campaign_interval_sha256)
    || !isSha256(expected_identity_anchor_sha256)
    || !isSha256(expected_thread_anchor_sha256)
    || !isSha256(expected_owner_anchor_sha256)
    || !isSha256(expected_audio_sha256)
    || !Number.isInteger(expected_manifest_ordinal)
    || expected_manifest_ordinal < 1
    || expected_manifest_ordinal > WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS
    || !Number.isFinite(effectiveNow)
    || effectiveNow < 0
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID);

  if (await revalidateWelcomeAudioLiveAuthorityCapability({
    private_authority_capability,
    now_ms: effectiveNow,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
    return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID);
  }

  let guard;
  try {
    guard = validateWelcomeAudioOperation(operation_snapshot, {
      expectedCanonicalOperationSha256: expected_canonical_operation_sha256,
      nowMs: effectiveNow,
    });
  } catch {
    return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_GUARD_NOT_PRECLAIM);
  }
  if (
    guard?.ok !== true
    || guard?.state_valid !== true
    || guard?.phase !== WELCOME_AUDIO_GUARD_PHASE.PRECLAIM
    || guard?.decision !== WELCOME_AUDIO_GUARD_DECISION.ELIGIBLE_TO_CLAIM
    || guard?.claim_allowed !== true
    || guard?.send_allowed !== false
    || guard?.terminal !== false
    || !Array.isArray(guard?.blockers)
    || guard.blockers.length !== 0
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_GUARD_NOT_PRECLAIM);

  const manifestStatus = verifySealedWelcomeAudioManifestCapability({
    private_manifest_capability,
    mission_id: expected_mission_id,
    contract_version: expected_contract_version,
    manifest_sha256: expected_manifest_sha256,
    campaign_interval_sha256: expected_campaign_interval_sha256,
    identity_anchor_sha256: expected_identity_anchor_sha256,
    manifest_ordinal: expected_manifest_ordinal,
  });
  const operation = operation_snapshot?.operation;
  const approval = operation_snapshot?.approval;
  const context = operation_snapshot?.context;
  const binding = operation_snapshot?.binding;
  const asset = operation_snapshot?.asset;
  const sourceProvenance = operation_snapshot?.source_provenance;
  const manifestCapabilityState = MANIFEST_CAPABILITY_STATE.get(private_manifest_capability);
  const authorityApproval = authorityState.approval;
  const authorityBinding = authorityApproval.operation_bindings.find(
    (candidate) => candidate.manifest_ordinal === expected_manifest_ordinal,
  );
  if (
    manifestStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
    || !manifestCapabilityState
    || authorityState.manifest_capability !== private_manifest_capability
    || authorityState.audio_asset_capability !== private_audio_asset_capability
    || authorityApproval.mission_id !== expected_mission_id
    || authorityApproval.contract_version !== expected_contract_version
    || authorityApproval.mission_contract_sha256 !== expected_mission_contract_sha256
    || authorityApproval.approval_packet_id !== expected_approval_packet_id
    || authorityApproval.central_repo_head !== expected_central_repo_head
    || authorityApproval.manifest_sha256 !== expected_manifest_sha256
    || authorityApproval.campaign_interval_sha256 !== expected_campaign_interval_sha256
    || authorityApproval.approved_audio_asset_sha256 !== expected_audio_sha256
    || !authorityBinding
    || authorityBinding.operation_id !== expected_operation_id
    || authorityBinding.identity_anchor_sha256 !== expected_identity_anchor_sha256
    || authorityBinding.thread_anchor_sha256 !== expected_thread_anchor_sha256
    || authorityBinding.owner_anchor_sha256 !== expected_owner_anchor_sha256
    || operation_snapshot?.canonical_operation_sha256 !== expected_canonical_operation_sha256
    || operation?.canonical_operation_sha256 !== expected_canonical_operation_sha256
    || operation?.mission_id !== expected_mission_id
    || operation?.approval_packet_id !== expected_approval_packet_id
    || operation?.operation_id !== expected_operation_id
    || operation?.candidate_anchor_sha256 !== expected_identity_anchor_sha256
    || operation?.thread_anchor_sha256 !== expected_thread_anchor_sha256
    || operation?.owner_anchor_sha256 !== expected_owner_anchor_sha256
    || operation?.approved_audio_asset_sha256 !== expected_audio_sha256
    || approval?.mission_id !== expected_mission_id
    || approval?.approval_packet_id !== expected_approval_packet_id
    || approval?.operation_id !== expected_operation_id
    || approval?.candidate_anchor_sha256 !== expected_identity_anchor_sha256
    || approval?.thread_anchor_sha256 !== expected_thread_anchor_sha256
    || approval?.owner_anchor_sha256 !== expected_owner_anchor_sha256
    || approval?.approved_audio_asset_sha256 !== expected_audio_sha256
    || context?.central_repo_head !== expected_central_repo_head
    || context?.expected_central_repo_head !== expected_central_repo_head
    || context?.mission_id !== expected_mission_id
    || context?.expected_mission_id !== expected_mission_id
    || context?.approval_packet_id !== expected_approval_packet_id
    || context?.operation_id !== expected_operation_id
    || binding?.candidate_anchor_sha256 !== expected_identity_anchor_sha256
    || binding?.thread_anchor_sha256 !== expected_thread_anchor_sha256
    || binding?.owner_anchor_sha256 !== expected_owner_anchor_sha256
    || asset?.approved_audio_asset_sha256 !== expected_audio_sha256
    || sourceProvenance?.manifest_digest_sha256 !== expected_manifest_sha256
    || sourceProvenance?.campaign_interval_digest_sha256
      !== expected_campaign_interval_sha256
    || sourceProvenance?.manifest_record_index !== expected_manifest_ordinal - 1
    || sourceProvenance?.manifest_record_count
      !== manifestCapabilityState.records_checked_count
  ) return blockedContext(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_BINDING_DRIFT);

  const approvalBindingSha256 = canonicalSha256({
    mission_id: expected_mission_id,
    contract_version: expected_contract_version,
    mission_contract_sha256: expected_mission_contract_sha256,
    approval_packet_id: expected_approval_packet_id,
    operation_id: expected_operation_id,
    central_repo_head: expected_central_repo_head,
    canonical_operation_sha256: expected_canonical_operation_sha256,
    manifest_sha256: expected_manifest_sha256,
    campaign_interval_sha256: expected_campaign_interval_sha256,
    identity_anchor_sha256: expected_identity_anchor_sha256,
    thread_anchor_sha256: expected_thread_anchor_sha256,
    owner_anchor_sha256: expected_owner_anchor_sha256,
    audio_asset_sha256: expected_audio_sha256,
    manifest_ordinal: expected_manifest_ordinal,
  });
  const capability = createOneUseCapability(
    OPERATION_CONTEXT_CAPABILITY_STATE,
    {
      private_authority_capability,
      private_audio_asset_capability,
      authority_mode: authorityState.mode,
      mission_id: expected_mission_id,
      contract_version: expected_contract_version,
      mission_contract_sha256: expected_mission_contract_sha256,
      approval_packet_id: expected_approval_packet_id,
      operation_id: expected_operation_id,
      central_repo_head: expected_central_repo_head,
      canonical_operation_sha256: expected_canonical_operation_sha256,
      manifest_sha256: expected_manifest_sha256,
      campaign_interval_sha256: expected_campaign_interval_sha256,
      identity_anchor_sha256: expected_identity_anchor_sha256,
      thread_anchor_sha256: expected_thread_anchor_sha256,
      owner_anchor_sha256: expected_owner_anchor_sha256,
      audio_asset_sha256: expected_audio_sha256,
      manifest_ordinal: expected_manifest_ordinal,
      manifest_record_count: manifestCapabilityState.records_checked_count,
      approval_binding_sha256: approvalBindingSha256,
      issued_at_ms: effectiveNow,
      expires_at_ms: Math.min(
        effectiveNow + WELCOME_AUDIO_LIVE_AUTHORITY_TTL_MS,
        Date.parse(authorityApproval.expires_at),
      ),
    },
    'crm_core_welcome_audio_private_live_operation_context_capability',
  );
  const targetBindingCapability = createOneUseCapability(
    TARGET_BINDING_CAPABILITY_STATE,
    {
      private_authority_capability,
      authority_mode: authorityState.mode,
      operation_id: expected_operation_id,
      identity_anchor_sha256: expected_identity_anchor_sha256,
      thread_anchor_sha256: expected_thread_anchor_sha256,
      issued_at_ms: effectiveNow,
      expires_at_ms: Math.min(
        effectiveNow + WELCOME_AUDIO_LIVE_AUTHORITY_TTL_MS,
        Date.parse(authorityApproval.expires_at),
      ),
    },
    'crm_core_welcome_audio_private_live_target_binding_capability',
  );
  return {
    private_capability: capability,
    private_target_binding_capability: targetBindingCapability,
    redacted_receipt: buildOperationContextReceipt({ valid: true }),
  };
};

const consumeWelcomeAudioLiveTargetBindingCapabilityOnce = async ({
  private_target_binding_capability,
  required_authority_mode,
  exact_target,
  expected_operation_id,
  expected_identity_anchor_sha256,
  expected_thread_anchor_sha256,
  now_ms,
}) => {
  const state = TARGET_BINDING_CAPABILITY_STATE.get(private_target_binding_capability);
  const effectiveNow = state?.authority_mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : now_ms;
  let derivedAnchor = null;
  try {
    derivedAnchor = computeWelcomeAudioExactIdentityAnchorSha256(exact_target);
  } catch {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  if (
    !state
    || state.consumed
    || state.authority_mode !== required_authority_mode
    || state.operation_id !== expected_operation_id
    || state.identity_anchor_sha256 !== expected_identity_anchor_sha256
    || state.thread_anchor_sha256 !== expected_thread_anchor_sha256
    || derivedAnchor !== expected_identity_anchor_sha256
    || !Number.isFinite(effectiveNow)
    || effectiveNow < state.issued_at_ms
    || effectiveNow >= state.expires_at_ms
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  if (await revalidateWelcomeAudioLiveAuthorityCapability({
    private_authority_capability: state.private_authority_capability,
    now_ms: effectiveNow,
  }) !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  if (state.consumed) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  state.consumed = true;
  return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
};

const verifyWelcomeAudioLiveOperationContextCapabilityBinding = async ({
  private_operation_context_capability,
  private_authority_capability,
  private_audio_asset_capability,
  required_authority_mode,
  mission_id,
  contract_version,
  mission_contract_sha256,
  approval_packet_id,
  operation_id,
  central_repo_head,
  canonical_operation_sha256,
  manifest_sha256,
  campaign_interval_sha256,
  identity_anchor_sha256,
  thread_anchor_sha256,
  owner_anchor_sha256,
  audio_asset_sha256,
  manifest_ordinal,
  now_ms,
}) => {
  const state = OPERATION_CONTEXT_CAPABILITY_STATE.get(private_operation_context_capability);
  const effectiveNow = state?.authority_mode === WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY
    ? Date.now()
    : now_ms;
  const exactBinding = state
    && state.consumed === false
    && Object.values(WELCOME_AUDIO_LIVE_AUTHORITY_MODE).includes(required_authority_mode)
    && state.authority_mode === required_authority_mode
    && state.private_authority_capability === private_authority_capability
    && state.private_audio_asset_capability === private_audio_asset_capability
    && state.mission_id === mission_id
    && state.contract_version === contract_version
    && state.mission_contract_sha256 === mission_contract_sha256
    && state.approval_packet_id === approval_packet_id
    && state.operation_id === operation_id
    && state.central_repo_head === central_repo_head
    && state.canonical_operation_sha256 === canonical_operation_sha256
    && state.manifest_sha256 === manifest_sha256
    && state.campaign_interval_sha256 === campaign_interval_sha256
    && state.identity_anchor_sha256 === identity_anchor_sha256
    && state.thread_anchor_sha256 === thread_anchor_sha256
    && state.owner_anchor_sha256 === owner_anchor_sha256
    && state.audio_asset_sha256 === audio_asset_sha256
    && state.manifest_ordinal === manifest_ordinal
    && Number.isInteger(state.manifest_record_count)
    && state.manifest_record_count >= manifest_ordinal
    && Number.isFinite(effectiveNow)
    && effectiveNow >= state.issued_at_ms
    && effectiveNow < state.expires_at_ms;
  if (!exactBinding) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  return revalidateWelcomeAudioLiveAuthorityCapability({
    private_authority_capability: state.private_authority_capability,
    now_ms: effectiveNow,
  });
};

const consumeWelcomeAudioLiveOperationContextCapabilityOnce = async (binding) => {
  const state = OPERATION_CONTEXT_CAPABILITY_STATE.get(
    binding?.private_operation_context_capability,
  );
  if (!state || state.consumed) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  const status = await verifyWelcomeAudioLiveOperationContextCapabilityBinding(binding);
  if (status !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID || state.consumed) {
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  }
  state.consumed = true;
  return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
};

const inspectExactUiAttestedEnvelope = (value, expectedFields) => {
  try {
    if (
      value === null
      || typeof value !== 'object'
      || nodeUtilTypes.isProxy(value)
      || Array.isArray(value)
    ) return Object.freeze({ valid: false, values: Object.freeze({}) });
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return Object.freeze({ valid: false, values: Object.freeze({}) });
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== expectedFields.length
      || keys.some((key) => typeof key !== 'string' || !expectedFields.includes(key))
    ) return Object.freeze({ valid: false, values: Object.freeze({}) });
    const values = {};
    for (const field of expectedFields) {
      const descriptor = descriptors[field];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true
      ) return Object.freeze({ valid: false, values: Object.freeze({}) });
      values[field] = descriptor.value;
    }
    return Object.freeze({ valid: true, values: Object.freeze(values) });
  } catch {
    return Object.freeze({ valid: false, values: Object.freeze({}) });
  }
};

const snapshotExactUiAttestedDataArray = (value) => {
  if (
    nodeUtilTypes.isProxy(value)
    || !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => {
      if (key === 'length') return false;
      if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) return true;
      const index = Number(key);
      return !Number.isSafeInteger(index) || index < 0 || index >= value.length;
    })) return null;
    const snapshot = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true
      ) return null;
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
};

const buildWelcomeAudioUiAttestedSourcePreflightReceipt = ({
  valid = false,
  followsOwnerBound = false,
  blockerCodes = [],
} = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_SCHEMA_VERSION,
  preflight_contract_version: WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_values_anchors_timestamps_or_digests',
  execution_mode: 'synthetic_ui_attested_source_preflight_no_live',
  decision: valid
    ? WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
    : WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.BLOCKED,
  ui_attested_source_bound: valid,
  exact_identity_bound: valid,
  profile_bound: valid,
  follows_owner_bound: valid && followsOwnerBound,
  thread_bound: valid,
  owner_bound: valid,
  dedupe_bound: valid,
  private_ui_attested_source_capability_issued: valid,
  live_authority: false,
  live_claim_issued: false,
  private_live_claim_capability_issued: false,
  live_claim_record_persisted: false,
  send_allowed: false,
  external_effect_invoked: false,
  browser_used: false,
  network_used: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const validateWelcomeAudioUiAttestedSourcePreflight = (parameters = {}) => {
  const blocked = (blocker) => ({
    private_capability: null,
    redacted_receipt: buildWelcomeAudioUiAttestedSourcePreflightReceipt({
      blockerCodes: [blocker],
    }),
  });
  try {
    const envelope = inspectExactUiAttestedEnvelope(parameters, [
      'private_source_projection',
      'mode',
      'now_ms',
    ]);
    if (!envelope.valid) {
      return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID);
    }
    const { private_source_projection: projection, mode, now_ms: nowMs } = envelope.values;
    if (mode !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY) {
      return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_MODE_INVALID);
    }
    if (!Number.isFinite(nowMs) || nowMs < 0) {
      return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID);
    }
    const validation = validateWelcomeAudioUiAttestedFollowerSourceProjection(
      projection,
      { nowMs },
    );
    if (validation?.ok !== true) {
      return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID);
    }
    const anchors = projection?.anchors;
    if (
      projection?.source_class !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS
      || !isOpaqueId(projection?.mission_id)
      || !isSha256(projection?.source_evidence_sha256)
      || !Number.isInteger(projection?.notification_row?.row_ordinal)
      || projection.notification_row.row_ordinal < 1
      || projection.notification_row.row_ordinal
        > WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS
      || !isSha256(anchors?.source_evidence_anchor_sha256)
      || !isSha256(anchors?.profile_anchor_sha256)
      || !isSha256(anchors?.candidate_anchor_sha256)
      || !isSha256(anchors?.thread_anchor_sha256)
      || !isSha256(anchors?.owner_anchor_sha256)
      || !isSha256(anchors?.dedupe_anchor_sha256)
      || projection.exact_follow_timestamp_claimed !== false
      || projection.provider_event_id_claimed !== false
      || projection.campaign_membership_claimed !== false
    ) return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID);

    const capability = createOneUseCapability(
      UI_ATTESTED_SOURCE_CAPABILITY_STATE,
      {
        mode,
        mission_id: projection.mission_id,
        source_class: projection.source_class,
        source_evidence_schema_version: projection.schema_version,
        source_evidence_sha256: projection.source_evidence_sha256,
        source_record_ordinal: projection.notification_row.row_ordinal,
        source_record_cap: WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
        source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
        profile_anchor_sha256: anchors.profile_anchor_sha256,
        candidate_anchor_sha256: anchors.candidate_anchor_sha256,
        thread_anchor_sha256: anchors.thread_anchor_sha256,
        owner_anchor_sha256: anchors.owner_anchor_sha256,
        dedupe_anchor_sha256: anchors.dedupe_anchor_sha256,
        evidence_observed_at: projection.dedupe.checked_at,
        issued_at_ms: nowMs,
        expires_at_ms: nowMs + WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_TTL_MS,
      },
      'crm_core_welcome_audio_private_ui_attested_source_capability',
    );
    return {
      private_capability: capability,
      redacted_receipt: buildWelcomeAudioUiAttestedSourcePreflightReceipt({
        valid: true,
        followsOwnerBound: projection.profile.follows_owner
          === WELCOME_AUDIO_UI_ATTESTED_RELATIONSHIP_STATE
            .CURRENT_FOLLOWS_OWNER_CONFIRMED,
      }),
    };
  } catch {
    return blocked(WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID);
  }
};

const inspectWelcomeAudioUiAttestedSourceCapabilityBinding = (parameters) => {
  try {
    const envelope = inspectExactUiAttestedEnvelope(
      parameters,
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_BINDING_FIELDS,
    );
    if (!envelope.valid) return Object.freeze({
      status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
      state: null,
    });
    const values = envelope.values;
    const state = UI_ATTESTED_SOURCE_CAPABILITY_STATE.get(
      values.private_ui_attested_source_capability,
    );
    if (
      !state
      || state.consumed
      || values.required_mode !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY
      || state.mode !== values.required_mode
      || state.source_class !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS
      || state.mission_id !== values.mission_id
      || state.source_evidence_schema_version !== values.source_evidence_schema_version
      || state.source_evidence_sha256 !== values.source_evidence_sha256
      || state.source_record_ordinal !== values.source_record_ordinal
      || state.source_evidence_anchor_sha256 !== values.source_evidence_anchor_sha256
      || state.profile_anchor_sha256 !== values.profile_anchor_sha256
      || state.candidate_anchor_sha256 !== values.candidate_anchor_sha256
      || state.thread_anchor_sha256 !== values.thread_anchor_sha256
      || state.owner_anchor_sha256 !== values.owner_anchor_sha256
      || state.dedupe_anchor_sha256 !== values.dedupe_anchor_sha256
      || state.evidence_observed_at !== values.evidence_observed_at
      || !Number.isFinite(values.minimum_issued_at_ms)
      || values.minimum_issued_at_ms < 0
      || state.issued_at_ms <= values.minimum_issued_at_ms
      || !Number.isFinite(values.now_ms)
      || values.now_ms < state.issued_at_ms
      || values.now_ms >= state.expires_at_ms
    ) return Object.freeze({
      status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
      state: null,
    });
    return Object.freeze({
      status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
      state,
    });
  } catch {
    return Object.freeze({
      status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
      state: null,
    });
  }
};

const verifyWelcomeAudioUiAttestedSourceCapabilityBinding = (parameters = {}) => (
  inspectWelcomeAudioUiAttestedSourceCapabilityBinding(parameters).status
);

const consumeWelcomeAudioUiAttestedSourceCapabilityOnce = (parameters = {}) => {
  const inspection = inspectWelcomeAudioUiAttestedSourceCapabilityBinding(parameters);
  if (
    inspection.status !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
    || !inspection.state
    || inspection.state.consumed
  ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
  inspection.state.consumed = true;
  return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
};

const createWelcomeAudioUiAttestedConnectedSourcePreflightBridge = () => {
  const connectedCapabilityState = new WeakMap();
  const activeSlotBindings = new WeakSet();
  const blocked = (blocker = WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID) => ({
    private_capability: null,
    redacted_receipt: buildWelcomeAudioUiAttestedSourcePreflightReceipt({
      blockerCodes: [blocker],
    }),
  });

  const issue = (parameters = {}) => {
    try {
      const envelope = inspectExactUiAttestedEnvelope(parameters, [
        'private_source_projection',
        'mode',
        'now_ms',
        'minimum_issued_at_ms',
        'private_slot_binding',
      ]);
      if (!envelope.valid) return blocked();
      const values = envelope.values;
      if (
        values.private_slot_binding === null
        || typeof values.private_slot_binding !== 'object'
        || Array.isArray(values.private_slot_binding)
        || nodeUtilTypes.isProxy(values.private_slot_binding)
        || !Number.isFinite(values.minimum_issued_at_ms)
        || values.minimum_issued_at_ms < 0
        || !Number.isFinite(values.now_ms)
        || values.now_ms <= values.minimum_issued_at_ms
      ) return blocked();

      const standalone = validateWelcomeAudioUiAttestedSourcePreflight({
        private_source_projection: values.private_source_projection,
        mode: values.mode,
        now_ms: values.now_ms,
      });
      const standaloneState = UI_ATTESTED_SOURCE_CAPABILITY_STATE.get(
        standalone.private_capability,
      );
      if (!standaloneState || standaloneState.consumed) return blocked();
      standaloneState.consumed = true;
      const privateCapability = createOneUseCapability(
        connectedCapabilityState,
        {
          ...standaloneState,
          minimum_issued_at_ms: values.minimum_issued_at_ms,
          private_slot_binding: values.private_slot_binding,
        },
        'crm_core_welcome_audio_private_ui_attested_connected_source_capability',
      );
      activeSlotBindings.add(values.private_slot_binding);
      return {
        private_capability: privateCapability,
        redacted_receipt: standalone.redacted_receipt,
      };
    } catch {
      return blocked();
    }
  };

  const inspect = (parameters = {}) => {
    try {
      const envelope = inspectExactUiAttestedEnvelope(
        parameters,
        WELCOME_AUDIO_UI_ATTESTED_CONNECTED_SOURCE_CAPABILITY_BINDING_FIELDS,
      );
      if (!envelope.valid) return Object.freeze({
        status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
        state: null,
      });
      const values = envelope.values;
      const state = connectedCapabilityState.get(
        values.private_ui_attested_source_capability,
      );
      if (
        !state
        || state.consumed
        || !activeSlotBindings.has(state.private_slot_binding)
        || state.private_slot_binding !== values.private_slot_binding
        || state.minimum_issued_at_ms !== values.minimum_issued_at_ms
        || values.required_mode !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE.SYNTHETIC_PROOF_ONLY
        || state.mode !== values.required_mode
        || state.source_class !== WELCOME_AUDIO_UI_ATTESTED_SOURCE_CLASS
        || state.mission_id !== values.mission_id
        || state.source_evidence_schema_version !== values.source_evidence_schema_version
        || state.source_evidence_sha256 !== values.source_evidence_sha256
        || state.source_record_ordinal !== values.source_record_ordinal
        || state.source_evidence_anchor_sha256 !== values.source_evidence_anchor_sha256
        || state.profile_anchor_sha256 !== values.profile_anchor_sha256
        || state.candidate_anchor_sha256 !== values.candidate_anchor_sha256
        || state.thread_anchor_sha256 !== values.thread_anchor_sha256
        || state.owner_anchor_sha256 !== values.owner_anchor_sha256
        || state.dedupe_anchor_sha256 !== values.dedupe_anchor_sha256
        || state.evidence_observed_at !== values.evidence_observed_at
        || !Number.isFinite(values.minimum_issued_at_ms)
        || values.minimum_issued_at_ms < 0
        || state.issued_at_ms <= values.minimum_issued_at_ms
        || !Number.isFinite(values.now_ms)
        || values.now_ms < state.issued_at_ms
        || values.now_ms >= state.expires_at_ms
      ) return Object.freeze({
        status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
        state: null,
      });
      return Object.freeze({
        status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID,
        state,
      });
    } catch {
      return Object.freeze({
        status: WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID,
        state: null,
      });
    }
  };

  const verify = (parameters = {}) => inspect(parameters).status;
  const consume = (parameters = {}) => {
    const inspection = inspect(parameters);
    if (
      inspection.status !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID
      || !inspection.state
      || inspection.state.consumed
    ) return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.INVALID;
    inspection.state.consumed = true;
    return WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID;
  };
  const retire = (privateSlotBinding) => {
    if (
      privateSlotBinding === null
      || typeof privateSlotBinding !== 'object'
      || nodeUtilTypes.isProxy(privateSlotBinding)
    ) return false;
    return activeSlotBindings.delete(privateSlotBinding);
  };

  return Object.freeze({ blocked, consume, issue, retire, verify });
};

const validateWelcomeAudioUiAttestedSourcePreflightReceipt = (receipt) => {
  const invalid = () => ({
    ok: false,
    reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.UI_ATTESTED_SOURCE_INVALID,
  });
  try {
    const envelope = inspectExactUiAttestedEnvelope(
      receipt,
      WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS,
    );
    if (!envelope.valid) return invalid();
    const data = envelope.values;
    const blockerCodes = snapshotExactUiAttestedDataArray(data.blocker_codes);
    if (!blockerCodes) return invalid();
    const valid = data.decision === WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
    const expected = buildWelcomeAudioUiAttestedSourcePreflightReceipt({
      valid,
      followsOwnerBound: valid && data.follows_owner_bound,
      blockerCodes: valid ? [] : blockerCodes,
    });
    const scalarFieldsValid = WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS
      .filter((field) => field !== 'blocker_codes')
      .every((field) => Object.is(data[field], expected[field]));
    const semanticsValid = blockerCodes.length === (valid ? 0 : 1)
      && blockerCodes.every((blocker) => RECEIPT_BLOCKERS.has(blocker))
      && scalarFieldsValid
      && blockerCodes.length === expected.blocker_codes.length
      && blockerCodes.every((blocker, index) => blocker === expected.blocker_codes[index]);
    return semanticsValid ? { ok: true, reason: null } : invalid();
  } catch {
    return invalid();
  }
};

const validateWelcomeAudioLiveOperationContextReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID };
  }
  const valid = receipt.decision === WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION
    || receipt.preflight_contract_version !== WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_commits_approval_ids_operations_anchors_or_digests'
    || receipt.execution_mode !== WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE
    || !RECEIPT_DECISIONS.has(receipt.decision)
    || [
      'pure_guard_preclaim_valid',
      'central_commit_bound',
      'approval_bound',
      'operation_bound',
      'canonical_operation_bound',
      'source_provenance_bound',
      'private_capability_issued',
      'private_target_binding_capability_issued',
    ].some((field) => receipt[field] !== valid)
    || receipt.send_allowed !== false
    || receipt.external_effect_invoked !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || receipt.blocker_codes.length !== (valid ? 0 : 1)
  ) return { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID };
  return { ok: true, reason: null };
};

const validateWelcomeAudioUiAttestedLiveAuthorityReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID };
  }
  const valid = receipt.decision === WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
  const expected = buildUiAttestedLiveAuthorityReceipt({
    valid,
    fixed: receipt.central_repo_clean_exact_upstream === true,
    blockerCodes: valid ? [] : receipt.blocker_codes,
  });
  return WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_FIELDS
    .filter((field) => field !== 'blocker_codes')
    .every((field) => Object.is(receipt[field], expected[field]))
    && Array.isArray(receipt.blocker_codes)
    && receipt.blocker_codes.length === (valid ? 0 : 1)
    && receipt.blocker_codes.every((blocker) => RECEIPT_BLOCKERS.has(blocker))
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.AUTHORITY_INVALID };
};

const validateWelcomeAudioUiAttestedLiveOperationContextReceipt = (receipt) => {
  if (!exactObjectKeys(
    receipt,
    WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS,
  )) return {
    ok: false,
    reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID,
  };
  const valid = receipt.decision === WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
  const expected = buildUiAttestedLiveOperationContextReceipt({
    valid,
    blockerCodes: valid ? [] : receipt.blocker_codes,
  });
  return WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS
    .filter((field) => field !== 'blocker_codes')
    .every((field) => Object.is(receipt[field], expected[field]))
    && Array.isArray(receipt.blocker_codes)
    && receipt.blocker_codes.length === (valid ? 0 : 1)
    && receipt.blocker_codes.every((blocker) => RECEIPT_BLOCKERS.has(blocker))
    ? { ok: true, reason: null }
    : {
      ok: false,
      reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.OPERATION_CONTEXT_INVALID,
    };
};

const validateWelcomeAudioLivePreflightReceipt = (receipt) => {
  if (!exactObjectKeys(receipt, WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.INPUT_INVALID };
  }
  if (
    receipt.receipt_schema_version !== WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_SCHEMA_VERSION
    || receipt.preflight_contract_version !== WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION
    || receipt.redaction_status !== 'allowlist_only_no_paths_identities_digests_or_private_values'
    || receipt.execution_mode !== WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE
    || !RECEIPT_SUBJECTS.has(receipt.subject)
    || !RECEIPT_DECISIONS.has(receipt.decision)
    || typeof receipt.private_capability_issued !== 'boolean'
    || !Number.isInteger(receipt.records_checked_count)
    || receipt.records_checked_count < 0
    || receipt.manifest_record_cap !== WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS
    || [
      'private_capability_issued',
      'digest_verified',
      'campaign_interval_bound',
      'order_verified',
      'identity_uniqueness_verified',
      'regular_file_verified',
      'stable_file_verified',
      'asset_hash_verified',
    ].some((field) => typeof receipt[field] !== 'boolean')
    || receipt.send_allowed !== false
    || receipt.external_effect_invoked !== false
    || !Array.isArray(receipt.blocker_codes)
    || receipt.blocker_codes.some((code) => !RECEIPT_BLOCKERS.has(code))
    || new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length
  ) return { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.INPUT_INVALID };
  const valid = receipt.decision === WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID;
  const subjectValid = receipt.subject === WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT.SEALED_MANIFEST
    ? (!valid || (receipt.digest_verified === true
      && receipt.campaign_interval_bound === true
      && receipt.order_verified === true
      && receipt.identity_uniqueness_verified === true))
      && receipt.regular_file_verified === false
      && receipt.stable_file_verified === false
      && receipt.asset_hash_verified === false
    : receipt.digest_verified === false
      && receipt.campaign_interval_bound === false
      && receipt.order_verified === false
      && receipt.identity_uniqueness_verified === false
      && (!valid || (receipt.regular_file_verified === true
        && receipt.stable_file_verified === true
        && receipt.asset_hash_verified === true));
  return subjectValid
    && receipt.private_capability_issued === valid
    && receipt.blocker_codes.length === (valid ? 0 : 1)
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER.INPUT_INVALID };
};

export {
  WELCOME_AUDIO_CAMPAIGN_INTERVAL_SCHEMA_VERSION,
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_LIVE_AUTHORITY_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_BLOCKER,
  WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_CONTRACT_VERSION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_EXECUTION_MODE,
  WELCOME_AUDIO_LIVE_PREFLIGHT_MAX_MANIFEST_RECORDS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_PREFLIGHT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_PREFLIGHT_SUBJECT,
  WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS,
  WELCOME_AUDIO_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_SEALED_MANIFEST_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_CAPABILITY_TTL_MS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_MODE,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_SOURCE_PREFLIGHT_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_PREFLIGHT_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_OPERATION_CONTEXT_RECEIPT_SCHEMA_VERSION,
  computeWelcomeAudioExactIdentityAnchorSha256,
  computeWelcomeAudioCampaignIntervalSha256,
  computeWelcomeAudioSealedManifestSha256,
  consumeWelcomeAudioLiveOperationContextCapabilityOnce,
  consumeWelcomeAudioLiveTargetBindingCapabilityOnce,
  consumeWelcomeAudioUiAttestedSourceCapabilityOnce,
  consumeWelcomeAudioUiAttestedLiveOperationContextCapabilityOnce,
  consumeWelcomeAudioUiAttestedLiveAdmissionCapabilitySetOnce,
  consumeWelcomeAudioUiAttestedLiveTargetBindingCapabilityOnce,
  createWelcomeAudioUiAttestedConnectedSourcePreflightBridge,
  createSyntheticWelcomeAudioLiveAuthorityCapability,
  createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability,
  openFixedWelcomeAudioLiveAuthority,
  openFixedWelcomeAudioUiAttestedLiveAuthority,
  revalidateApprovedWelcomeAudioAssetCapability,
  revalidateWelcomeAudioLiveAuthorityCapability,
  revalidateWelcomeAudioUiAttestedLiveAuthorityCapability,
  validateApprovedWelcomeAudioAsset,
  validateSealedWelcomeAudioBacklogManifest,
  validateWelcomeAudioLiveOperationContext,
  validateWelcomeAudioLiveOperationContextReceipt,
  validateWelcomeAudioUiAttestedLiveAuthorityReceipt,
  validateWelcomeAudioUiAttestedLiveOperationContext,
  validateWelcomeAudioUiAttestedLiveOperationContextReceipt,
  validateWelcomeAudioLivePreflightReceipt,
  validateWelcomeAudioUiAttestedSourcePreflight,
  validateWelcomeAudioUiAttestedSourcePreflightReceipt,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
  verifyWelcomeAudioLiveOperationContextCapabilityBinding,
  verifyWelcomeAudioUiAttestedLiveOperationContextCapabilityBinding,
  verifyWelcomeAudioUiAttestedSourceCapabilityBinding,
  verifySealedWelcomeAudioManifestCapability,
};
