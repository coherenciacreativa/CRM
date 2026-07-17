import { createHash, randomBytes } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  link,
  lstat,
  open,
  readdir,
  realpath,
  unlink,
} from 'node:fs/promises';
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
  validateWelcomeAudioUiAttestedCanaryPacketDraft,
} from './crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs';

const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_PUBLISHER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_authority_publisher_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_single_recipient_live_authority_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_single_recipient_live_authority_envelope_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_authority_publisher_receipt_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME =
  'ui-attested-execution-authority-v1.json';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-ui-attested-live-authority-v1',
);
const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX =
  'crm-core-welcome-audio-ui-attested-live-authority-test-';
const MAX_AUTHORITY_BYTES = 256 * 1024;
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
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
  'instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md',
);
const execFile = promisify(execFileCallback);

const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE = Object.freeze({
  FIXED_OWNER_ONLY: 'ui_attested_fixed_owner_only',
  SYNTHETIC_TEMP_TEST_ONLY: 'ui_attested_synthetic_temp_test_only',
});

const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION = Object.freeze({
  PUBLISHED: 'published_owner_only_authority_envelope',
  BLOCKED: 'blocked_private_live_authority',
});

const WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_ui_live_authority_input_invalid',
  DRAFT_INVALID: 'blocked_ui_live_authority_draft_invalid',
  AUTHORIZATION_INVALID: 'blocked_ui_live_authority_authorization_invalid',
  AUDIO_INVALID: 'blocked_ui_live_authority_audio_invalid',
  AUDIO_CHANGED: 'blocked_ui_live_authority_audio_changed',
  AUDIO_DIGEST_MISMATCH: 'blocked_ui_live_authority_audio_digest_mismatch',
  ROOT_INVALID: 'blocked_ui_live_authority_root_invalid',
  FIXED_PUBLICATION_DISABLED: 'blocked_ui_live_authority_fixed_publication_disabled',
  TARGET_EXISTS: 'blocked_ui_live_authority_target_exists',
  PUBLICATION_FAILED: 'blocked_ui_live_authority_publication_failed',
});

const AUTHORIZATION_INPUT_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_contract_sha256',
  'active_next_action_id',
  'active_next_action_sha256',
  'approval_packet_id',
  'approved_audio_asset_path',
  'approved_at',
  'expires_at',
  'candidate_cap',
  'claim_cap',
  'pending_cap',
  'upload_cap',
  'send_cap',
  'action_time_confirmation_required',
  'execution_browser',
  'text_fallback',
  'campaign_effect_allowed',
  'mailerlite_effect_allowed',
  'expected_draft_sha256',
  'expected_projection_sha256',
  'expected_operation_id',
  'expected_canonical_operation_sha256',
  'expected_authorization_id',
  'expected_source_evidence_sha256',
  'expected_source_evidence_anchor_sha256',
  'expected_profile_anchor_sha256',
  'expected_candidate_anchor_sha256',
  'expected_thread_anchor_sha256',
  'expected_owner_anchor_sha256',
  'expected_dedupe_anchor_sha256',
  'expected_audio_sha256',
]);

const AUTHORITY_FIELDS = Object.freeze([
  'schema_version',
  'status',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'active_next_action_id',
  'active_next_action_sha256',
  'central_repo_head',
  'approval_packet_id',
  'authorization_id',
  'operation_id',
  'canonical_operation_sha256',
  'draft_sha256',
  'projection_sha256',
  'source_mission_id',
  'source_evidence_sha256',
  'source_evidence_anchor_sha256',
  'profile_anchor_sha256',
  'candidate_anchor_sha256',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'dedupe_anchor_sha256',
  'exact_target_utf8',
  'bound_thread_reference_utf8',
  'owner_account_reference_utf8',
  'approved_audio_asset_id',
  'approved_audio_asset_path',
  'approved_audio_asset_sha256',
  'candidate_cap',
  'claim_cap',
  'pending_cap',
  'upload_cap',
  'send_cap',
  'retry_cap',
  'action_time_confirmation_required',
  'execution_browser',
  'text_fallback',
  'campaign_effect_allowed',
  'mailerlite_effect_allowed',
  'exact_follow_timestamp_claimed',
  'provider_event_id_claimed',
  'campaign_membership_claimed',
  'approved_at',
  'expires_at',
]);

const ENVELOPE_FIELDS = Object.freeze([
  'schema_version',
  'publisher_contract_version',
  'status',
  'authority',
  'private_draft',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'publisher_contract_version',
  'redaction_status',
  'decision',
  'draft_validated',
  'projection_exactly_bound',
  'approval_fresh',
  'audio_bytes_exactly_bound',
  'caps_all_one',
  'nonclaims_preserved',
  'owner_only_root_verified',
  'atomic_publication_verified',
  'live_claim_issued',
  'pending_effect_recorded',
  'send_attempted',
  'external_effect_invoked',
  'blocker_codes',
]);

const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/;
const BLOCKERS = new Set(Object.values(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER));

const isPlainDataObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeUtilTypes.isProxy(value)
  && (Object.getPrototypeOf(value) === Object.prototype
    || Object.getPrototypeOf(value) === null);

const exactDataObject = (value, fields) => {
  if (!isPlainDataObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== fields.length
    || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
    || fields.some((field) => !Object.hasOwn(descriptors, field))
    || keys.some((key) => descriptors[key].get || descriptors[key].set)
  ) return null;
  return Object.freeze(Object.fromEntries(fields.map((field) => [
    field,
    descriptors[field].value,
  ])));
};

const isCleanString = (value) => typeof value === 'string'
  && value.length > 0
  && value === value.trim()
  && !/[\u0000-\u001f\u007f]/u.test(value);
const isExactIsoTimestamp = (value) => {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
};
const isAbsoluteCleanPath = (value) => typeof value === 'string'
  && isAbsolute(value)
  && value === resolve(value)
  && !value.split(sep).some((segment) => segment === '.' || segment === '..');

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainDataObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
};
const canonicalBytes = (value) => Buffer.from(`${JSON.stringify(canonicalize(value))}\n`, 'utf8');
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256 = (draft) => (
  sha256Bytes(canonicalBytes(draft))
);
const computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256 = (projection) => (
  sha256Bytes(canonicalBytes(projection))
);

const sameFile = (actual, expected) => actual.dev === expected.dev
  && actual.ino === expected.ino
  && actual.uid === expected.uid
  && actual.mode === expected.mode
  && actual.nlink === expected.nlink
  && actual.size === expected.size
  && actual.mtimeMs === expected.mtimeMs
  && actual.ctimeMs === expected.ctimeMs;

const readStableTrackedFile = async (filePath) => {
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || before.nlink !== 1
      || before.size < 1
      || before.size > 2 * 1024 * 1024
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameFile(after, before) || bytes.length !== after.size) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
    }
    return Object.freeze({ bytes, digest: sha256Bytes(bytes) });
  } finally {
    await handle?.close();
  }
};

const parseFinalActiveNextActionId = (bytes) => {
  const text = bytes.toString('utf8');
  const headings = [...text.matchAll(/^## Active Next Action$/gm)];
  if (headings.length < 1) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
  }
  const selected = headings[headings.length - 1];
  const tail = text.slice(selected.index + selected[0].length).replace(/^\r?\n/, '');
  const nextHeading = tail.search(/^## /m);
  const section = nextHeading === -1 ? tail : tail.slice(0, nextHeading);
  const ids = [...section.matchAll(
    /^- `next_action_id`:\r?\n  `([A-Za-z0-9][A-Za-z0-9._:-]{0,191})`$/gm,
  )];
  if (ids.length !== 1) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
  }
  return ids[0][1];
};

const readFixedCentralState = async () => {
  const options = { encoding: 'utf8', maxBuffer: 128 * 1024, timeout: 10_000 };
  const git = async (...args) => (await execFile(
    'git',
    ['-C', FIXED_CENTRAL_REPO_ROOT, ...args],
    options,
  )).stdout.trim();
  try {
    const [root, branch, head, upstream, status] = await Promise.all([
      git('rev-parse', '--show-toplevel'),
      git('symbolic-ref', '--quiet', '--short', 'HEAD'),
      git('rev-parse', 'HEAD'),
      git('rev-parse', '@{upstream}'),
      git('status', '--porcelain=v1', '--untracked-files=all'),
    ]);
    if (
      root !== FIXED_CENTRAL_REPO_ROOT
      || branch !== FIXED_CENTRAL_BRANCH
      || !GIT_SHA.test(head)
      || head !== upstream
      || status !== ''
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
    return Object.freeze({ head });
  } catch {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
  }
};

const validateFixedTrackedAuthorityInput = async ({ draft, authorization }) => {
  const before = await readFixedCentralState();
  const [mission, nextAction] = await Promise.all([
    readStableTrackedFile(FIXED_MISSION_CONTRACT_PATH),
    readStableTrackedFile(FIXED_ACTIVE_NEXT_ACTION_PATH),
  ]);
  const after = await readFixedCentralState();
  if (
    before.head !== after.head
    || draft.central_repo_head !== after.head
    || authorization.mission_contract_sha256 !== mission.digest
    || authorization.active_next_action_sha256 !== nextAction.digest
    || authorization.active_next_action_id !== parseFinalActiveNextActionId(nextAction.bytes)
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID);
  return true;
};

const readStableAudio = async (assetPath) => {
  let handle;
  try {
    const unresolved = await lstat(assetPath);
    if (
      !unresolved.isFile()
      || unresolved.isSymbolicLink()
      || unresolved.nlink !== 1
      || (unresolved.mode & 0o7777) !== 0o600
      || unresolved.size < 1
      || unresolved.size > MAX_AUDIO_BYTES
      || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_INVALID);
    handle = await open(assetPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (!sameFile(before, unresolved)) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_CHANGED);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    const pathAfter = await lstat(assetPath);
    if (bytes.length !== after.size || !sameFile(after, before) || !sameFile(pathAfter, before)) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_CHANGED);
    }
    return Object.freeze({
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
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ELOOP') {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const assertOwnerOnlyRoot = async ({ authorityRoot, mode }) => {
  if (!isAbsoluteCleanPath(authorityRoot)) {
    throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
  }
  if (mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
    if (authorityRoot !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT) {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
    }
  } else if (mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY) {
    const canonicalTemp = await realpath(tmpdir());
    if (
      dirname(authorityRoot) !== canonicalTemp
      || !basename(authorityRoot).startsWith(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
      )
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
  } else throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
  const unresolved = await lstat(authorityRoot);
  const canonical = await realpath(authorityRoot);
  if (
    canonical !== authorityRoot
    || !unresolved.isDirectory()
    || unresolved.isSymbolicLink()
    || (unresolved.mode & 0o7777) !== 0o700
    || (typeof process.getuid === 'function' && unresolved.uid !== process.getuid())
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
  const stable = await lstat(canonical);
  if (
    stable.dev !== unresolved.dev
    || stable.ino !== unresolved.ino
    || stable.uid !== unresolved.uid
    || stable.mode !== unresolved.mode
  ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.ROOT_INVALID);
  return Object.freeze({ path: canonical, metadata: stable });
};

const buildAuthority = ({ draft, authorization }) => {
  const projection = draft.source_projection;
  const anchors = projection.anchors;
  return Object.freeze({
    schema_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SCHEMA_VERSION,
    status: 'approved_for_ui_attested_single_recipient_live_canary',
    mission_id: draft.mission_id,
    contract_version: draft.contract_version,
    mission_contract_sha256: authorization.mission_contract_sha256,
    active_next_action_id: authorization.active_next_action_id,
    active_next_action_sha256: authorization.active_next_action_sha256,
    central_repo_head: draft.central_repo_head,
    approval_packet_id: authorization.approval_packet_id,
    authorization_id: draft.authorization_id,
    operation_id: draft.operation_id,
    canonical_operation_sha256: authorization.expected_canonical_operation_sha256,
    draft_sha256: computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft),
    projection_sha256: computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(projection),
    source_mission_id: draft.source_mission_id,
    source_evidence_sha256: projection.source_evidence_sha256,
    source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
    profile_anchor_sha256: anchors.profile_anchor_sha256,
    candidate_anchor_sha256: anchors.candidate_anchor_sha256,
    thread_anchor_sha256: anchors.thread_anchor_sha256,
    owner_anchor_sha256: anchors.owner_anchor_sha256,
    dedupe_anchor_sha256: anchors.dedupe_anchor_sha256,
    exact_target_utf8: projection.notification_row.exact_target_utf8,
    bound_thread_reference_utf8: projection.thread.bound_thread_reference_utf8,
    owner_account_reference_utf8: projection.owner.owner_account_reference_utf8,
    approved_audio_asset_id: draft.approved_audio_asset_id,
    approved_audio_asset_path: authorization.approved_audio_asset_path,
    approved_audio_asset_sha256: draft.approved_audio_sha256,
    candidate_cap: 1,
    claim_cap: 1,
    pending_cap: 1,
    upload_cap: 1,
    send_cap: 1,
    retry_cap: 0,
    action_time_confirmation_required: true,
    execution_browser: 'safari',
    text_fallback: 'forbidden',
    campaign_effect_allowed: false,
    mailerlite_effect_allowed: false,
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
    approved_at: authorization.approved_at,
    expires_at: authorization.expires_at,
  });
};

const validateAuthorizationInput = ({ authorization, draft, nowMs }) => {
  const value = exactDataObject(authorization, AUTHORIZATION_INPUT_FIELDS);
  const projection = draft?.source_projection;
  const anchors = projection?.anchors;
  const draftSha256 = draft
    ? computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256(draft)
    : null;
  const projectionSha256 = projection
    ? computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256(projection)
    : null;
  if (
    !value
    || value.schema_version
      !== 'crm_core_instagram_welcome_audio_ui_attested_live_authorization_input_v1'
    || value.status !== 'approved_for_exact_ui_attested_draft_and_audio'
    || !SHA256.test(value.mission_contract_sha256)
    || !OPAQUE_ID.test(value.active_next_action_id)
    || !SHA256.test(value.active_next_action_sha256)
    || !OPAQUE_ID.test(value.approval_packet_id)
    || !isAbsoluteCleanPath(value.approved_audio_asset_path)
    || !isExactIsoTimestamp(value.approved_at)
    || !isExactIsoTimestamp(value.expires_at)
    || Date.parse(value.approved_at) > nowMs
    || Date.parse(value.expires_at) <= nowMs
    || Date.parse(value.expires_at) <= Date.parse(value.approved_at)
    || Date.parse(value.expires_at) - Date.parse(value.approved_at)
      > WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS
    || value.candidate_cap !== 1
    || value.claim_cap !== 1
    || value.pending_cap !== 1
    || value.upload_cap !== 1
    || value.send_cap !== 1
    || value.action_time_confirmation_required !== true
    || value.execution_browser !== 'safari'
    || value.text_fallback !== 'forbidden'
    || value.campaign_effect_allowed !== false
    || value.mailerlite_effect_allowed !== false
    || value.expected_draft_sha256 !== draftSha256
    || value.expected_projection_sha256 !== projectionSha256
    || value.expected_operation_id !== draft?.operation_id
    || !SHA256.test(value.expected_canonical_operation_sha256)
    || value.expected_authorization_id !== draft?.authorization_id
    || value.expected_source_evidence_sha256 !== projection?.source_evidence_sha256
    || value.expected_source_evidence_anchor_sha256
      !== anchors?.source_evidence_anchor_sha256
    || value.expected_profile_anchor_sha256 !== anchors?.profile_anchor_sha256
    || value.expected_candidate_anchor_sha256 !== anchors?.candidate_anchor_sha256
    || value.expected_thread_anchor_sha256 !== anchors?.thread_anchor_sha256
    || value.expected_owner_anchor_sha256 !== anchors?.owner_anchor_sha256
    || value.expected_dedupe_anchor_sha256 !== anchors?.dedupe_anchor_sha256
    || value.expected_audio_sha256 !== draft?.approved_audio_sha256
  ) return null;
  return value;
};

const validateWelcomeAudioUiAttestedLiveAuthority = (authority, options = {}) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID,
  });
  try {
    const value = exactDataObject(authority, AUTHORITY_FIELDS);
    const optionValues = exactDataObject(options, ['private_draft', 'now_ms']);
    if (!value || !optionValues || !Number.isFinite(optionValues.now_ms)) return invalid();
    const draft = optionValues.private_draft;
    if (validateWelcomeAudioUiAttestedCanaryPacketDraft(
      draft,
      { now_ms: optionValues.now_ms },
    ).ok !== true) return invalid();
    const expected = buildAuthority({
      draft,
      authorization: {
        mission_contract_sha256: value.mission_contract_sha256,
        active_next_action_id: value.active_next_action_id,
        active_next_action_sha256: value.active_next_action_sha256,
        approval_packet_id: value.approval_packet_id,
        expected_canonical_operation_sha256: value.canonical_operation_sha256,
        approved_audio_asset_path: value.approved_audio_asset_path,
        approved_at: value.approved_at,
        expires_at: value.expires_at,
      },
    });
    const approvedAtMs = Date.parse(value.approved_at);
    const expiresAtMs = Date.parse(value.expires_at);
    if (
      AUTHORITY_FIELDS.some((field) => !Object.is(value[field], expected[field]))
      || !GIT_SHA.test(value.central_repo_head)
      || !isExactIsoTimestamp(value.approved_at)
      || !isExactIsoTimestamp(value.expires_at)
      || !Number.isFinite(approvedAtMs)
      || !Number.isFinite(expiresAtMs)
      || approvedAtMs > optionValues.now_ms
      || expiresAtMs <= optionValues.now_ms
      || expiresAtMs <= approvedAtMs
      || expiresAtMs - approvedAtMs > WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS
      || value.exact_follow_timestamp_claimed !== false
      || value.provider_event_id_claimed !== false
      || value.campaign_membership_claimed !== false
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const validateWelcomeAudioUiAttestedLiveAuthorityEnvelope = (envelope, options = {}) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID,
  });
  try {
    const value = exactDataObject(envelope, ENVELOPE_FIELDS);
    const optionValues = exactDataObject(options, ['now_ms']);
    if (
      !value
      || !optionValues
      || value.schema_version !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION
      || value.publisher_contract_version
        !== WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_PUBLISHER_CONTRACT_VERSION
      || value.status !== 'active_private_live_authority'
      || validateWelcomeAudioUiAttestedLiveAuthority(
        value.authority,
        { private_draft: value.private_draft, now_ms: optionValues.now_ms },
      ).ok !== true
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const buildReceipt = ({ published = false, blockerCodes = [] } = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  publisher_contract_version:
    WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_PUBLISHER_CONTRACT_VERSION,
  redaction_status: 'aggregate_allowlist_only_no_private_values_paths_times_anchors_or_digests',
  decision: published
    ? WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION.PUBLISHED
    : WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION.BLOCKED,
  draft_validated: published,
  projection_exactly_bound: published,
  approval_fresh: published,
  audio_bytes_exactly_bound: published,
  caps_all_one: published,
  nonclaims_preserved: published,
  owner_only_root_verified: published,
  atomic_publication_verified: published,
  live_claim_issued: false,
  pending_effect_recorded: false,
  send_attempted: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt = (receipt) => {
  const invalid = () => Object.freeze({
    ok: false,
    reason: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.INPUT_INVALID,
  });
  try {
    const value = exactDataObject(receipt, RECEIPT_FIELDS);
    if (!value || !Array.isArray(value.blocker_codes)) return invalid();
    const published = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION.PUBLISHED;
    const expected = buildReceipt({
      published,
      blockerCodes: published ? [] : value.blocker_codes,
    });
    if (
      RECEIPT_FIELDS.filter((field) => field !== 'blocker_codes')
        .some((field) => !Object.is(value[field], expected[field]))
      || value.blocker_codes.length !== (published ? 0 : 1)
      || value.blocker_codes.some((code) => !BLOCKERS.has(code))
      || new Set(value.blocker_codes).size !== value.blocker_codes.length
    ) return invalid();
    return Object.freeze({ ok: true, reason: null });
  } catch {
    return invalid();
  }
};

const blockedResult = (blocker) => Object.freeze({
  private_authority_envelope: null,
  authority_path: null,
  redacted_receipt: buildReceipt({ blockerCodes: [blocker] }),
});

const publishAuthorityBytesExclusive = async ({ rootIdentity, bytes }) => {
  const targetPath = join(rootIdentity.path, WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME);
  let temporaryPath;
  let temporaryHandle;
  try {
    try {
      await lstat(targetPath);
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.TARGET_EXISTS);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    temporaryPath = join(
      rootIdentity.path,
      `.ui-attested-authority-${process.pid}-${randomBytes(16).toString('hex')}.tmp`,
    );
    temporaryHandle = await open(
      temporaryPath,
      FS_CONSTANTS.O_WRONLY
        | FS_CONSTANTS.O_CREAT
        | FS_CONSTANTS.O_EXCL
        | FS_CONSTANTS.O_NOFOLLOW,
      0o600,
    );
    await temporaryHandle.writeFile(bytes);
    await temporaryHandle.sync();
    const temporaryMetadata = await temporaryHandle.stat();
    if (
      !temporaryMetadata.isFile()
      || temporaryMetadata.nlink !== 1
      || (temporaryMetadata.mode & 0o7777) !== 0o600
      || temporaryMetadata.size !== bytes.length
      || temporaryMetadata.size < 2
      || temporaryMetadata.size > MAX_AUTHORITY_BYTES
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.PUBLICATION_FAILED);
    await temporaryHandle.close();
    temporaryHandle = null;
    // A same-filesystem hard-link is the POSIX no-replace publication barrier:
    // unlike rename(), it cannot overwrite a concurrently-created authority.
    // The directory fsync immediately below durably commits the link+unlink pair.
    await link(temporaryPath, targetPath);
    await unlink(temporaryPath);
    temporaryPath = null;
    let directoryHandle;
    try {
      directoryHandle = await open(rootIdentity.path, FS_CONSTANTS.O_RDONLY);
      await directoryHandle.sync();
    } finally {
      await directoryHandle?.close();
    }
    let targetHandle;
    try {
      targetHandle = await open(targetPath, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
      const before = await targetHandle.stat();
      const publishedBytes = await targetHandle.readFile();
      const after = await targetHandle.stat();
      const pathAfter = await lstat(targetPath);
      if (
        !sameFile(after, before)
        || !sameFile(pathAfter, before)
        || before.nlink !== 1
        || (before.mode & 0o7777) !== 0o600
        || publishedBytes.length !== bytes.length
        || !publishedBytes.equals(bytes)
      ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.PUBLICATION_FAILED);
    } finally {
      await targetHandle?.close();
    }
    const rootAfter = await lstat(rootIdentity.path);
    if (
      rootAfter.dev !== rootIdentity.metadata.dev
      || rootAfter.ino !== rootIdentity.metadata.ino
      || rootAfter.uid !== rootIdentity.metadata.uid
      || rootAfter.mode !== rootIdentity.metadata.mode
    ) throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.PUBLICATION_FAILED);
    return targetPath;
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.TARGET_EXISTS);
    }
    throw error;
  } finally {
    await temporaryHandle?.close();
    if (temporaryPath) await unlink(temporaryPath).catch(() => {});
  }
};

const publishWelcomeAudioUiAttestedLiveAuthorityInternal = async (parameters = {}) => {
  let root;
  try {
    const input = exactDataObject(parameters, [
      'authority_root',
      'mode',
      'private_draft',
      'private_authorization',
      'now_ms',
    ]);
    if (!input || !Number.isFinite(input.now_ms) || input.now_ms < 0) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.INPUT_INVALID);
    }
    if (validateWelcomeAudioUiAttestedCanaryPacketDraft(
      input.private_draft,
      { now_ms: input.now_ms },
    ).ok !== true) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.DRAFT_INVALID);
    }
    const authorization = validateAuthorizationInput({
      authorization: input.private_authorization,
      draft: input.private_draft,
      nowMs: input.now_ms,
    });
    if (!authorization) {
      return blockedResult(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID,
      );
    }
    root = await assertOwnerOnlyRoot({ authorityRoot: input.authority_root, mode: input.mode });
    if ((await readdir(root.path)).length !== 0) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.TARGET_EXISTS);
    }
    if (input.mode === WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY) {
      await validateFixedTrackedAuthorityInput({
        draft: input.private_draft,
        authorization,
      });
    }
    const canonicalAudioPath = await realpath(authorization.approved_audio_asset_path);
    if (canonicalAudioPath !== authorization.approved_audio_asset_path) {
      return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_INVALID);
    }
    const audio = await readStableAudio(authorization.approved_audio_asset_path);
    if (audio.digest !== input.private_draft.approved_audio_sha256) {
      return blockedResult(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_DIGEST_MISMATCH,
      );
    }
    const authority = buildAuthority({ draft: input.private_draft, authorization });
    if (validateWelcomeAudioUiAttestedLiveAuthority(
      authority,
      { private_draft: input.private_draft, now_ms: input.now_ms },
    ).ok !== true) {
      return blockedResult(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID,
      );
    }
    const envelope = Object.freeze({
      schema_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION,
      publisher_contract_version:
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_PUBLISHER_CONTRACT_VERSION,
      status: 'active_private_live_authority',
      authority,
      private_draft: input.private_draft,
    });
    if (validateWelcomeAudioUiAttestedLiveAuthorityEnvelope(
      envelope,
      { now_ms: input.now_ms },
    ).ok !== true) {
      return blockedResult(
        WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUTHORIZATION_INVALID,
      );
    }
    const audioImmediatelyBeforePublication = await readStableAudio(
      authorization.approved_audio_asset_path,
    );
    if (
      audioImmediatelyBeforePublication.digest !== audio.digest
      || !sameFile(audioImmediatelyBeforePublication.metadata, audio.metadata)
    ) return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.AUDIO_CHANGED);
    const authorityPath = await publishAuthorityBytesExclusive({
      rootIdentity: root,
      bytes: canonicalBytes(envelope),
    });
    return Object.freeze({
      private_authority_envelope: envelope,
      authority_path: authorityPath,
      redacted_receipt: buildReceipt({ published: true }),
    });
  } catch (error) {
    const blocker = BLOCKERS.has(error?.message)
      ? error.message
      : WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.PUBLICATION_FAILED;
    return blockedResult(blocker);
  }
};

// This implementation mission may build only synthetic fixtures. A later live
// execution mission must provide an authenticated owner-only capability before
// any fixed-root publisher can exist. Deliberately do not inspect caller input.
const publishFixedWelcomeAudioUiAttestedLiveAuthority = async () => blockedResult(
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.FIXED_PUBLICATION_DISABLED,
);

const publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, [
    'authority_root',
    'private_draft',
    'private_authorization',
    'now_ms',
  ]);
  if (!input) {
    return blockedResult(WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER.INPUT_INVALID);
  }
  return publishWelcomeAudioUiAttestedLiveAuthorityInternal({
    authority_root: input.authority_root,
    mode: WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    private_draft: input.private_draft,
    private_authorization: input.private_authorization,
    now_ms: input.now_ms,
  });
};

export {
  AUTHORITY_FIELDS as WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIELDS,
  ENVELOPE_FIELDS as WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_ENVELOPE_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FILE_NAME,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_FIXED_ROOT,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_PUBLISHER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SCHEMA_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_SYNTHETIC_PREFIX,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_AUTHORITY_TTL_MS,
  computeWelcomeAudioUiAttestedLiveAuthorityDraftSha256,
  computeWelcomeAudioUiAttestedLiveAuthorityProjectionSha256,
  publishFixedWelcomeAudioUiAttestedLiveAuthority,
  publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest,
  validateWelcomeAudioUiAttestedLiveAuthority,
  validateWelcomeAudioUiAttestedLiveAuthorityEnvelope,
  validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt,
};
