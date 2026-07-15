import { createHash } from 'node:crypto';
import { constants as FS_CONSTANTS } from 'node:fs';
import {
  open,
  readdir,
  realpath,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
} from 'node:path';
import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_CONFIRMATION_MARKER,
  WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';
import {
  WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION,
  WELCOME_AUDIO_LIVE_AUTHORITY_MODE,
  WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS,
  consumeWelcomeAudioLiveTargetBindingCapabilityOnce,
  verifyApprovedWelcomeAudioAssetCapabilityPathBinding,
} from './crm-vnext-instagram-welcome-audio-live-preflight.mjs';
import {
  WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS,
  WELCOME_AUDIO_LIVE_STORE_MODE,
  consumeWelcomeAudioLiveHostPendingCapabilityOnce,
} from './crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs';
import {
  WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS,
  getWelcomeAudioSafariDeferredActuatorRendezvousStatus,
  resolveWelcomeAudioSafariDeferredActuatorRendezvous,
} from './crm-vnext-instagram-welcome-audio-safari-operation-port.mjs';

const SAFARI_APP_ID = 'com.apple.Safari';
const COMPUTER_USE_INSTALLED_RUNTIME_SYMBOL = Symbol.for('openai.computer-use.runtime');
const WELCOME_AUDIO_SAFARI_LIVE_HOST_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_safari_live_host_v1';
const WELCOME_AUDIO_SAFARI_LIVE_HOST_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_safari_live_host_receipt_v1';
const WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_live_pending_attempt_v1';
const MAX_PENDING_RECORD_BYTES = 32 * 1024;
const FIXED_LIVE_CLAIM_STORE_ROOT = resolve(
  homedir(),
  'Documents',
  'Mantis-Private-Source-Artifacts',
  'instagram',
  'crm-core-welcome-audio-live-claim-store-v1',
);
const SYNTHETIC_CLAIM_STORE_PREFIX = 'crm-core-welcome-audio-live-claim-store-test-';

const WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE = Object.freeze({
  LIVE: 'live_computer_use_owner_only',
  SYNTHETIC: 'synthetic_temp_test_only',
});

const WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE = Object.freeze({
  PREPARATION: 'preparation_before_durable_attempt_boundary',
  POST_PENDING_ATTEMPT: 'post_pending_attachment_and_send',
});

const WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION = Object.freeze({
  PREPARED: 'prepared_native_chooser_no_upload',
  BLOCKED: 'blocked_zero_external_effect',
  VISUAL_EVIDENCE_READY: 'visual_confirmation_evidence_ready_not_terminal',
  ATTEMPT_UNKNOWN: 'attempt_evidence_ready_unknown_terminal_required',
});

const WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_live_host_input_invalid',
  DRIVER_INVALID: 'blocked_live_host_driver_invalid',
  LIVE_DRIVER_REQUIRED: 'blocked_live_host_live_driver_required',
  CAPABILITY_INVALID: 'blocked_live_host_capability_invalid_or_used',
  TARGET_BINDING_INVALID: 'blocked_live_host_target_binding_capability_invalid_or_used',
  SURFACE_INVALID: 'blocked_live_host_safari_surface_not_standard_isolated',
  FRESH_STATE_INVALID: 'blocked_live_host_fresh_state_invalid_or_reused',
  SOURCE_THREAD_INVALID: 'blocked_live_host_exact_source_or_thread_not_bound',
  ATTACHMENT_CONTROL_INVALID: 'blocked_live_host_attachment_control_missing_or_ambiguous',
  NATIVE_CHOOSER_INVALID: 'blocked_live_host_native_file_chooser_not_exact',
  COMPOSER_NOT_EMPTY: 'blocked_live_host_message_composer_not_explicitly_empty',
  PRIOR_AUDIO_PRESENT_OR_UNKNOWN:
    'blocked_live_host_prior_audio_absence_not_proven_in_exact_thread',
  PERMIT_INVALID: 'blocked_live_host_prepared_permit_invalid_or_used',
  PENDING_INVALID: 'blocked_live_host_durable_pending_invalid_or_missing',
  PENDING_CHANGED: 'blocked_live_host_durable_pending_changed_before_upload',
  TERMINAL_OR_TEMP_PRESENT: 'blocked_live_host_terminal_or_temporary_evidence_present',
  ASSET_PATH_BINDING_INVALID: 'blocked_live_host_asset_path_capability_invalid',
  ATTACHMENT_UPLOAD_UNKNOWN: 'blocked_live_host_attachment_upload_unknown_no_retry',
  PREVIEW_INVALID: 'blocked_live_host_attachment_preview_not_exact',
  SEND_CONTROL_INVALID: 'blocked_live_host_send_control_missing_or_ambiguous',
  SEND_ACTUATION_UNKNOWN: 'blocked_live_host_send_actuation_unknown_no_retry',
  CONFIRMATION_UNKNOWN: 'blocked_live_host_new_outgoing_audio_bubble_not_proven',
  ATTEMPT_EVIDENCE_INVALID: 'blocked_live_host_attempt_evidence_invalid_or_used',
  VISUAL_EVIDENCE_INVALID: 'blocked_live_host_visual_evidence_invalid_or_used',
  ORACLE_INVALID: 'blocked_live_host_deterministic_oracle_invalid',
});

const WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO = Object.freeze({
  CONFIRMED_NEW_AUDIO_BUBBLE: 'confirmed_new_outgoing_audio_bubble',
  SENT_MARKER_ONLY: 'sent_marker_only_unknown',
  COMPOSE_RESET_ONLY: 'compose_reset_only_unknown',
  UPLOAD_UNKNOWN: 'attachment_upload_unknown',
  THREAD_MISMATCH: 'thread_binding_mismatch',
  TARGET_CASE_VARIANT: 'target_case_variant_not_exact',
  TARGET_OUTSIDE_THREAD_SEMANTICS: 'target_outside_thread_semantics',
  SEND_ACTION_THROWS: 'synthetic_send_action_throws',
  DRAFT_TEXT_PRESENT: 'synthetic_message_composer_has_draft_text',
  DRAFT_TEXT_BEFORE_SEND: 'synthetic_message_composer_draft_appears_before_send',
  SECOND_ATTACHMENT_PREVIEW: 'synthetic_second_attachment_preview_present',
  PRIOR_AUDIO_PRESENT: 'synthetic_prior_outgoing_audio_present',
  PRIOR_AUDIO_BEFORE_SEND: 'synthetic_outgoing_audio_appears_before_send',
  MIXED_OR_PRIVATE_SURFACE: 'mixed_or_private_safari_surface',
});

const WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO = Object.freeze({
  EXACT_ACTIVE_THREAD: 'exact_active_thread',
  TARGET_SIDEBAR_ONLY: 'target_sidebar_only',
  TARGET_CASE_VARIANT: 'target_case_variant',
  AMBIGUOUS_DUPLICATE_THREAD: 'ambiguous_duplicate_thread',
  UNRELATED_ATTACHMENT_CONTROL: 'unrelated_attachment_control',
  FILENAME_OUTSIDE_PREVIEW: 'filename_outside_attachment_preview',
  EXACT_ATTACHMENT_PREVIEW: 'exact_attachment_preview',
  UNRELATED_OUTGOING_BUBBLE: 'unrelated_outgoing_audio_bubble',
  EXACT_THREAD_OUTGOING_BUBBLE: 'exact_thread_outgoing_audio_bubble',
  ROLELESS_THREAD_DECOY: 'roleless_exact_thread_lexical_decoy',
  DEDENTED_OUTGOING_BUBBLE: 'dedented_outgoing_audio_bubble_sibling',
  MALFORMED_DEDENT_REINDENT: 'malformed_dedent_then_reindented_bubble',
  STATIC_TEXT_OUTGOING_VOICE: 'static_text_outgoing_voice_decoy',
  INCOMING_VOICE_BUBBLE: 'incoming_voice_bubble',
  OUTGOING_TEXT_BUBBLE: 'outgoing_text_bubble',
  LIST_ITEM_OUTGOING_VOICE: 'list_item_outgoing_voice',
  DUPLICATE_ACTIVE_ROOT: 'duplicate_exact_active_root',
  CONTROLS_OUTSIDE_ACTIVE_ROOT: 'controls_outside_exact_active_root',
  DUPLICATE_SCOPED_CONTROLS_SAME_INDEX: 'duplicate_scoped_controls_same_index',
  DUPLICATE_SCOPED_CONTROLS_UNINDEXED: 'duplicate_scoped_controls_unindexed',
  TARGET_SUBSTRING_DECOY: 'exact_target_substring_decoy',
});

const WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS = Object.freeze({
  CONFIRMED_UPLOAD_1_SEND_1: 'confirmed_upload_1_send_1',
  UNKNOWN_NO_UPLOAD_0_SEND: 'unknown_no_upload_0_send',
  UNKNOWN_UPLOAD_0_SEND: 'unknown_upload_0_send',
  UNKNOWN_UPLOAD_1_SEND: 'unknown_upload_1_send',
  INVALID: 'invalid',
});

const WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS = Object.freeze({
  VALID: 'valid_exact_thread_attempt_fresh_new_outgoing_audio_bubble',
  INVALID: 'invalid_or_consumed',
});

const PENDING_RECORD_FIELDS = Object.freeze([
  'record_schema_version',
  'mission_id',
  'contract_version',
  'mission_contract_sha256',
  'approval_packet_id',
  'operation_id',
  'central_repo_head',
  'canonical_operation_sha256',
  'approval_binding_sha256',
  'identity_anchor_sha256',
  'identity_anchor_schema_version',
  'thread_anchor_sha256',
  'owner_anchor_sha256',
  'manifest_sha256',
  'campaign_interval_sha256',
  'audio_asset_sha256',
  'manifest_ordinal',
  'claim_nonce',
  'owner_pid',
  'owner_nonce',
  'entered_at',
  'boundary_status',
  'attachment_upload_entered',
  'send_control_actuation_count',
  'attempt_nonce',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'live_host_contract_version',
  'redaction_status',
  'execution_mode',
  'phase',
  'decision',
  'host_capability_consumed',
  'target_binding_capability_consumed',
  'prepared_permit_issued',
  'prepared_permit_consumed',
  'safari_standard_isolated',
  'fresh_state_before_every_ui_action',
  'fresh_state_check_count',
  'fixed_ui_action_count',
  'source_thread_bound',
  'native_chooser_opened',
  'pending_record_validation_count',
  'pending_revalidated_immediately_before_upload',
  'asset_path_capability_validated_before_upload',
  'attachment_upload_entered',
  'asset_preview_verified',
  'send_control_actuation_count',
  'confirmation_marker',
  'new_outgoing_audio_bubble_delta',
  'sent_marker_only_accepted',
  'compose_reset_accepted',
  'attempt_evidence_capability_issued',
  'visual_confirmation_capability_issued',
  'durable_terminal_published_by_host',
  'external_effect_possible',
  'retry_forbidden_permanently',
  'blocker_codes',
]);

const DRIVER_STATE = new WeakMap();
const HOST_CAPABILITY_STATE = new WeakMap();
const PREPARED_PERMIT_STATE = new WeakMap();
const ATTEMPT_EVIDENCE_STATE = new WeakMap();
const VISUAL_EVIDENCE_STATE = new WeakMap();

const exactObjectKeys = (value, expected) => {
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || Array.isArray(value)
  ) return false;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Reflect.ownKeys(descriptors);
    return actual.length === expected.length
      && actual.every((key) => typeof key === 'string' && expected.includes(key))
      && expected.every((key) => (
        descriptors[key]
        && Object.hasOwn(descriptors[key], 'value')
        && descriptors[key].get === undefined
        && descriptors[key].set === undefined
      ));
  } catch {
    return false;
  }
};

const isPlainDataObject = (value) => {
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || Array.isArray(value)
  ) return false;
  try {
    return Object.getPrototypeOf(value) === Object.prototype;
  } catch {
    return false;
  }
};

const inspectExactDataEnvelope = (value, expectedFields) => {
  const invalid = Object.freeze({
    valid: false,
    values: Object.freeze(Object.create(null)),
    private_prepared_permit: null,
  });
  if (
    !value
    || typeof value !== 'object'
    || nodeUtilTypes.isProxy(value)
    || Array.isArray(value)
  ) return invalid;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const values = Object.create(null);
    for (const field of expectedFields) {
      const descriptor = descriptors[field];
      if (descriptor && Object.hasOwn(descriptor, 'value')) values[field] = descriptor.value;
    }
    const privatePreparedPermit = Object.hasOwn(
      descriptors.private_prepared_permit ?? {},
      'value',
    ) ? descriptors.private_prepared_permit.value : null;
    const valid = Object.getPrototypeOf(value) === Object.prototype
      && keys.length === expectedFields.length
      && keys.every((key) => typeof key === 'string' && expectedFields.includes(key))
      && expectedFields.every((field) => {
        const descriptor = descriptors[field];
        return descriptor
          && Object.hasOwn(descriptor, 'value')
          && descriptor.get === undefined
          && descriptor.set === undefined;
      });
    return Object.freeze({
      valid,
      values: Object.freeze(values),
      private_prepared_permit: privatePreparedPermit,
    });
  } catch {
    return invalid;
  }
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isOpaqueId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
const isExactIso = (value) => typeof value === 'string'
  && Number.isFinite(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const safeKnownBlockerMessage = (error) => {
  if (
    !error
    || (typeof error !== 'object' && typeof error !== 'function')
    || nodeUtilTypes.isProxy(error)
  ) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'message');
    return descriptor
      && Object.hasOwn(descriptor, 'value')
      && typeof descriptor.value === 'string'
      && Object.values(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER).includes(descriptor.value)
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
};
const exactMode = (metadata, expected) => (metadata.mode & 0o7777) === expected;

const sameMetadata = (left, right) => left.dev === right.dev
  && left.ino === right.ino
  && left.uid === right.uid
  && left.mode === right.mode
  && left.nlink === right.nlink
  && left.size === right.size
  && left.mtimeMs === right.mtimeMs
  && left.ctimeMs === right.ctimeMs;

const metadataSnapshot = (metadata) => Object.freeze({
  dev: metadata.dev,
  ino: metadata.ino,
  uid: metadata.uid,
  mode: metadata.mode,
  nlink: metadata.nlink,
  size: metadata.size,
  mtimeMs: metadata.mtimeMs,
  ctimeMs: metadata.ctimeMs,
});

const opaqueCapability = (marker, serializationError) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [marker]: {
      value: Symbol(marker),
      enumerable: false,
    },
    toJSON: {
      value: () => { throw new TypeError(serializationError); },
      enumerable: false,
    },
  });
  return Object.freeze(capability);
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseElementIndex = (line) => {
  const match = line.match(/(?:element[_ ]index\s*[:=]\s*|\[)(\d+)(?:\])?/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const parseAccessibilityTree = (text) => {
  const nodes = [];
  const stack = [];
  let hierarchyValid = true;
  for (const raw of text.split(/\r?\n/u)) {
    if (raw.trim().length === 0) continue;
    const leading = raw.match(/^[ \t]*/u)?.[0] ?? '';
    const rawDepth = [...leading].reduce((total, character) => (
      total + (character === '\t' ? 2 : 1)
    ), 0);
    const match = raw.match(/^([ \t]*)(?:\[(\d+)\]\s*)?(AX[A-Za-z][A-Za-z0-9]*)\b(.*)$/u);
    if (!match) {
      while (stack.length > 0 && stack.at(-1).depth >= rawDepth) stack.pop();
      if (rawDepth > 0) hierarchyValid = false;
      continue;
    }
    const depth = [...match[1]].reduce((total, character) => (
      total + (character === '\t' ? 2 : 1)
    ), 0);
    while (stack.length > 0 && stack.at(-1).depth >= depth) stack.pop();
    const parsedBracketIndex = match[2] === undefined
      ? null
      : Number.parseInt(match[2], 10);
    const node = {
      role: match[3],
      label: match[4].trim(),
      raw,
      depth,
      element_index: Number.isSafeInteger(parsedBracketIndex)
        ? parsedBracketIndex
        : parseElementIndex(raw),
      parent: stack.at(-1) ?? null,
    };
    nodes.push(node);
    stack.push(node);
  }
  return Object.freeze({ nodes, hierarchy_valid: hierarchyValid });
};

const isDescendantOf = (node, ancestor) => {
  let cursor = node?.parent ?? null;
  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = cursor.parent;
  }
  return false;
};

const exactTargetHeadingLabel = (label, exactTarget) => [
  exactTarget,
  `Conversation with ${exactTarget}`,
  `Thread with ${exactTarget}`,
  `Chat with ${exactTarget}`,
  `Direct messages with ${exactTarget}`,
].includes(label);

const isActiveConversationContainer = (node) => (
  /^(?:AXGroup|AXRegion)$/u.test(node.role)
  && /\b(?:active|current|selected)\b/i.test(node.label)
  && /\b(?:conversation|thread|chat|direct\s+messages?)\b/i.test(node.label)
  && !/\b(?:history|sidebar|search|result|suggestion|recommended)\b/i.test(node.label)
);

const exactTargetContainerLabel = (label, exactTarget) => [
  `Active conversation with ${exactTarget}`,
  `Current conversation with ${exactTarget}`,
  `Selected conversation with ${exactTarget}`,
  `Active thread with ${exactTarget}`,
  `Current thread with ${exactTarget}`,
  `Selected thread with ${exactTarget}`,
  `Active chat with ${exactTarget}`,
  `Current chat with ${exactTarget}`,
  `Selected chat with ${exactTarget}`,
  `Active direct messages with ${exactTarget}`,
  `Current direct messages with ${exactTarget}`,
  `Selected direct messages with ${exactTarget}`,
].includes(label);

const isHistoryContainer = (node) => (
  /^(?:AXGroup|AXRegion|AXList)$/u.test(node.role)
  && /\bmessage\s+history\b/i.test(node.label)
);

const isMessageComposer = (node) => (
  /^(?:AXTextArea|AXTextField)$/u.test(node.role)
  && /\b(?:message|chat)\b/i.test(node.label)
  && /\b(?:composer|input|field)\b/i.test(node.label)
);

const composerIsExplicitlyEmpty = (node) => (
  /(?:value\s*[:=]\s*["']{2}|empty\s*[:=]\s*true|explicitly\s+empty|empty\s+(?:message|chat)\s+composer)/i
    .test(node.label)
);

const isAttachmentControl = (node) => (
  node.role === 'AXButton'
  && /\b(?:attach|attachment|add\s+(?:photo|image|file)|upload\s+file)\b/i.test(node.label)
);

const isAttachmentPreview = (node) => (
  /^(?:AXGroup|AXRegion|AXRow|AXListItem)$/u.test(node.role)
  && /\b(?:attachment\s+preview|audio\s+attachment|file\s+preview|selected\s+(?:audio\s+)?file)\b/i
    .test(node.label)
);

const isSendControl = (node) => (
  node.role === 'AXButton'
  && /^Send(?:\s+(?:attachment|audio|file|in|the|active|current|conversation|thread|chat|message|composer|button))*$/i
    .test(node.label)
);

const isOutgoingAudioBubble = (node) => (
  /^(?:AXGroup|AXRegion|AXRow|AXListItem)$/u.test(node.role)
  && /\b(?:audio|voice)\s+message\b/i.test(node.label)
  && /\b(?:outgoing|sent\s+by\s+you|your\s+message|from\s+you)\b/i.test(node.label)
  && /\b(?:bubble|message)\b/i.test(node.label)
);

const inspectExactActiveThreadSubtree = ({
  nodes,
  hierarchyValid,
  exactTarget,
  assetName,
}) => {
  const roots = nodes.filter(isActiveConversationContainer);
  if (
    hierarchyValid !== true
    || roots.length !== 1
    || !exactTargetContainerLabel(roots[0].label, exactTarget)
  ) return Object.freeze({
    exact_thread_bound: false,
    message_input_visible: false,
    message_composer_empty: false,
    attachment_control_index: null,
    exact_asset_preview_visible: false,
    attachment_preview_count: 0,
    send_control_index: null,
    outgoing_audio_bubble_count: 0,
    outgoing_audio_scope_proven: false,
    explicit_sent_marker_visible: false,
  });
  const root = roots[0];
  const subtree = nodes.filter((node) => isDescendantOf(node, root));
  const headings = subtree.filter((node) => (
    node.role === 'AXHeading' && exactTargetHeadingLabel(node.label, exactTarget)
  ));
  const histories = subtree.filter(isHistoryContainer);
  const composers = subtree.filter(isMessageComposer);
  const attachmentControls = subtree.filter(isAttachmentControl);
  const previews = subtree.filter(isAttachmentPreview);
  const sendControls = subtree.filter(isSendControl);
  const exactThreadBound = headings.length === 1 && histories.length === 1;
  const history = exactThreadBound ? histories[0] : null;
  const historySubtree = history
    ? nodes.filter((node) => isDescendantOf(node, history))
    : [];
  const bubbles = historySubtree.filter(isOutgoingAudioBubble);
  const exactAssetPattern = assetName.length === 0
    ? null
    : new RegExp(
      `(?:^|[^A-Za-z0-9_.-])${escapeRegExp(assetName)}(?:$|[^A-Za-z0-9_.-])`,
    );
  return Object.freeze({
    exact_thread_bound: exactThreadBound,
    message_input_visible: exactThreadBound && composers.length === 1,
    message_composer_empty: exactThreadBound
      && composers.length === 1
      && composerIsExplicitlyEmpty(composers[0]),
    attachment_control_index: exactThreadBound
      && attachmentControls.length === 1
      && Number.isSafeInteger(attachmentControls[0].element_index)
      ? attachmentControls[0].element_index
      : null,
    exact_asset_preview_visible: exactThreadBound
      && previews.length === 1
      && exactAssetPattern !== null
      && exactAssetPattern.test(previews[0].label),
    attachment_preview_count: exactThreadBound ? previews.length : 0,
    send_control_index: exactThreadBound
      && sendControls.length === 1
      && Number.isSafeInteger(sendControls[0].element_index)
      ? sendControls[0].element_index
      : null,
    outgoing_audio_bubble_count: exactThreadBound ? bubbles.length : 0,
    outgoing_audio_scope_proven: exactThreadBound,
    explicit_sent_marker_visible: exactThreadBound
      && historySubtree.some((node) => (
        /^(?:AXStaticText|AXGroup|AXRow)$/u.test(node.role)
        && /^(?:Sent|Delivered|Seen)$/i.test(node.label)
      )),
  });
};

const inspectLiveSafariState = ({ raw, exactTarget, approvedAssetPath, revision }) => {
  if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') return null;
  const text = raw.text;
  const parsedTree = parseAccessibilityTree(text);
  const { nodes } = parsedTree;
  const tabs = nodes.filter((node) => node.role === 'AXTab');
  const regularTabs = tabs.filter((node) => !/pinned/i.test(node.label));
  const instagramRegularTabs = regularTabs.filter((node) => /instagram/i.test(node.label));
  const assetName = typeof approvedAssetPath === 'string' ? basename(approvedAssetPath) : '';
  const thread = inspectExactActiveThreadSubtree({
    nodes,
    hierarchyValid: parsedTree.hierarchy_valid,
    exactTarget,
    assetName,
  });
  return Object.freeze({
    revision,
    standard_safari: raw.app === SAFARI_APP_ID,
    isolated_surface: regularTabs.length === 1 && instagramRegularTabs.length === 1,
    private_browsing: /private\s+(?:browsing|window)/i.test(text),
    unrelated_regular_tabs_present: regularTabs.length !== instagramRegularTabs.length,
    challenge_or_error_visible:
      /(?:challenge|required|try\s+again|couldn['’]t\s+send|error)/i.test(text),
    exact_source_target_bound: thread.exact_thread_bound,
    exact_thread_bound: thread.exact_thread_bound,
    message_input_visible: thread.message_input_visible,
    message_composer_empty: thread.message_composer_empty,
    attachment_control_index: thread.attachment_control_index,
    native_file_chooser_visible:
      /(?:go\s+to\s+the\s+folder|choose\s+a\s+file|open\s+file|file\s+chooser)/i.test(text),
    go_to_folder_visible: /go\s+to\s+the\s+folder/i.test(text),
    exact_asset_preview_visible: thread.exact_asset_preview_visible,
    attachment_preview_count: thread.attachment_preview_count,
    send_control_index: thread.send_control_index,
    outgoing_audio_bubble_count: thread.outgoing_audio_bubble_count,
    outgoing_audio_scope_proven: thread.outgoing_audio_scope_proven,
    explicit_sent_marker_visible: thread.explicit_sent_marker_visible,
    compose_reset_visible: /(?:new\s+message|to:|search\s+recipient)/i.test(text)
      && !thread.exact_thread_bound,
  });
};

const syntheticObservation = ({ state, exactTarget, approvedAssetPath }) => {
  const badSurface = state.scenario
    === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.MIXED_OR_PRIVATE_SURFACE;
  const threadMismatch = [
    WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.THREAD_MISMATCH,
    WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.TARGET_CASE_VARIANT,
    WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.TARGET_OUTSIDE_THREAD_SEMANTICS,
  ].includes(state.scenario);
  const confirmed = state.stage === 'after_send'
    && state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.CONFIRMED_NEW_AUDIO_BUBBLE;
  const sentMarkerOnly = state.stage === 'after_send'
    && state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.SENT_MARKER_ONLY;
  const composeReset = state.stage === 'after_send'
    && state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.COMPOSE_RESET_ONLY;
  const inThread = !threadMismatch && !composeReset;
  const draftText = state.scenario
    === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.DRAFT_TEXT_PRESENT
    || (state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.DRAFT_TEXT_BEFORE_SEND
      && state.stage === 'preview');
  const secondAttachment = state.scenario
    === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.SECOND_ATTACHMENT_PREVIEW;
  return Object.freeze({
    revision: state.revision,
    standard_safari: true,
    isolated_surface: !badSurface,
    private_browsing: badSurface,
    unrelated_regular_tabs_present: badSurface,
    challenge_or_error_visible: false,
    exact_source_target_bound: inThread && typeof exactTarget === 'string',
    exact_thread_bound: inThread && typeof exactTarget === 'string',
    message_input_visible: inThread,
    message_composer_empty: inThread && !draftText,
    attachment_control_index: state.stage === 'thread' && inThread ? 41 : null,
    native_file_chooser_visible: [
      'chooser',
      'go_to_folder',
      'path_typed',
      'file_resolved',
    ].includes(state.stage),
    go_to_folder_visible: ['go_to_folder', 'path_typed'].includes(state.stage),
    exact_asset_preview_visible: state.stage === 'preview'
      && !secondAttachment
      && typeof approvedAssetPath === 'string'
      && basename(approvedAssetPath).length > 0,
    attachment_preview_count: state.stage === 'preview' ? (secondAttachment ? 2 : 1) : 0,
    send_control_index: state.stage === 'preview' ? 87 : null,
    outgoing_audio_bubble_count: confirmed
      ? state.baseline_audio_count + 1
      : state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.PRIOR_AUDIO_BEFORE_SEND
        && state.stage === 'preview'
        ? 1
        : state.baseline_audio_count,
    outgoing_audio_scope_proven: inThread,
    explicit_sent_marker_visible: confirmed || sentMarkerOnly,
    compose_reset_visible: composeReset,
  });
};

const hasExactInstalledComputerUseRuntimeBinding = () => {
  try {
    const runtimeDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      COMPUTER_USE_INSTALLED_RUNTIME_SYMBOL,
    );
    const skyDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sky');
    const runtime = runtimeDescriptor && Object.hasOwn(runtimeDescriptor, 'value')
      ? runtimeDescriptor.value
      : null;
    const sky = skyDescriptor && Object.hasOwn(skyDescriptor, 'value')
      ? skyDescriptor.value
      : null;
    const methodDescriptors = runtime
      && typeof runtime === 'object'
      && !nodeUtilTypes.isProxy(runtime)
      ? Object.getOwnPropertyDescriptors(runtime)
      : Object.create(null);
    return Boolean(
      runtimeDescriptor
      && Object.hasOwn(runtimeDescriptor, 'value')
      && runtimeDescriptor.get === undefined
      && runtimeDescriptor.set === undefined
      && skyDescriptor
      && Object.hasOwn(skyDescriptor, 'value')
      && skyDescriptor.get === undefined
      && skyDescriptor.set === undefined
      && runtime
      && typeof runtime === 'object'
      && !nodeUtilTypes.isProxy(runtime)
      && Object.isFrozen(runtime) === true
      && runtime === sky
      && ['get_app_state', 'click', 'press_key', 'type_text']
        .every((method) => (
          methodDescriptors[method]
          && Object.hasOwn(methodDescriptors[method], 'value')
          && typeof methodDescriptors[method].value === 'function'
          && methodDescriptors[method].get === undefined
          && methodDescriptors[method].set === undefined
        )),
    );
  } catch {
    return false;
  }
};

const inspectInstalledComputerUseRuntimeBindingForTest = () => (
  hasExactInstalledComputerUseRuntimeBinding()
);

const createTrustedSkySafariDriverFromInstalledRuntime = () => {
  if (!hasExactInstalledComputerUseRuntimeBinding()) {
    throw new TypeError(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.DRIVER_INVALID);
  }
  const sky = Object.getOwnPropertyDescriptor(globalThis, 'sky').value;
  const driver = opaqueCapability(
    'crm_core_sky_safari_live_driver',
    'sky_safari_live_driver_not_serializable',
  );
  DRIVER_STATE.set(driver, {
    kind: 'sky_live',
    sky,
    revision: 0,
  });
  return driver;
};

const createSyntheticSafariDriverForTest = (parameters = {}) => {
  if (
    !exactObjectKeys(parameters, ['scenario'])
    || !Object.values(WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO).includes(parameters.scenario)
  ) throw new TypeError(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.DRIVER_INVALID);
  const driver = opaqueCapability(
    'crm_core_synthetic_safari_driver_for_test',
    'synthetic_safari_driver_not_serializable',
  );
  DRIVER_STATE.set(driver, {
    kind: 'synthetic_test',
    scenario: parameters.scenario,
    revision: 0,
    stage: 'thread',
    action_count: 0,
    baseline_audio_count: parameters.scenario
      === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.PRIOR_AUDIO_PRESENT ? 1 : 0,
  });
  return driver;
};

const inspectSyntheticSafariDriverForTest = (parameters = {}) => {
  if (!exactObjectKeys(parameters, ['driver'])) return null;
  const state = DRIVER_STATE.get(parameters.driver);
  if (!state || state.kind !== 'synthetic_test') return null;
  return Object.freeze({
    stage: state.stage,
    action_count: state.action_count,
    state_read_count: state.revision,
  });
};

const inspectSyntheticLiveSafariStateForTest = (parameters = {}) => {
  if (
    !exactObjectKeys(parameters, ['scenario', 'exact_target', 'approved_audio_asset_path'])
    || !Object.values(WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO)
      .includes(parameters.scenario)
    || typeof parameters.exact_target !== 'string'
    || parameters.exact_target.length === 0
    || typeof parameters.approved_audio_asset_path !== 'string'
  ) return null;
  const exactTarget = parameters.exact_target;
  const caseVariant = exactTarget.toUpperCase() === exactTarget
    ? exactTarget.toLowerCase()
    : exactTarget.toUpperCase();
  const assetName = basename(parameters.approved_audio_asset_path);
  const S = WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO;
  const substringTarget = `${exactTarget}.substring`;
  const rootTarget = parameters.scenario === S.TARGET_SUBSTRING_DECOY
    ? substringTarget
    : exactTarget;
  const headingLines = parameters.scenario === S.TARGET_SIDEBAR_ONLY
    ? ['    AXHeading Conversation with another.synthetic.target']
    : parameters.scenario === S.TARGET_CASE_VARIANT
      ? [`    AXHeading Conversation with ${caseVariant}`]
      : parameters.scenario === S.AMBIGUOUS_DUPLICATE_THREAD
        ? [
          `    AXHeading Conversation with ${exactTarget}`,
          `    AXHeading Conversation with ${exactTarget}`,
        ]
        : parameters.scenario === S.ROLELESS_THREAD_DECOY
          ? [`    AXStaticText Conversation with ${exactTarget}`]
          : parameters.scenario === S.TARGET_SUBSTRING_DECOY
            ? [`    AXHeading Conversation with ${substringTarget}`]
            : [`    AXHeading Conversation with ${exactTarget}`];
  const historyChildren = {
    [S.EXACT_THREAD_OUTGOING_BUBBLE]: [
      '      AXGroup Outgoing audio message bubble from you',
    ],
    [S.STATIC_TEXT_OUTGOING_VOICE]: [
      '      AXStaticText Outgoing voice message from you',
    ],
    [S.INCOMING_VOICE_BUBBLE]: [
      '      AXGroup Incoming voice message bubble from contact',
    ],
    [S.OUTGOING_TEXT_BUBBLE]: [
      '      AXGroup Outgoing text message bubble from you',
    ],
    [S.LIST_ITEM_OUTGOING_VOICE]: [
      '      AXListItem Outgoing voice message from you',
    ],
  }[parameters.scenario] ?? [];
  const unrelatedAttachment = parameters.scenario
    === S.UNRELATED_ATTACHMENT_CONTROL;
  const controlsOutside = parameters.scenario === S.CONTROLS_OUTSIDE_ACTIVE_ROOT;
  const duplicateSameIndex = parameters.scenario === S.DUPLICATE_SCOPED_CONTROLS_SAME_INDEX;
  const duplicateUnindexed = parameters.scenario === S.DUPLICATE_SCOPED_CONTROLS_UNINDEXED;
  const siblingBubble = [S.UNRELATED_OUTGOING_BUBBLE, S.DEDENTED_OUTGOING_BUBBLE]
    .includes(parameters.scenario)
    ? ['    AXGroup Outgoing audio message bubble from you']
    : [];
  const previewLines = parameters.scenario === S.FILENAME_OUTSIDE_PREVIEW
    ? [
      `    AXStaticText Recent file ${assetName}`,
      '    AXGroup Attachment preview for another-file.m4a',
    ]
    : [S.EXACT_ATTACHMENT_PREVIEW, S.DUPLICATE_SCOPED_CONTROLS_SAME_INDEX,
      S.DUPLICATE_SCOPED_CONTROLS_UNINDEXED].includes(parameters.scenario)
      ? [`    AXGroup Attachment preview ${assetName}`, '    [87] AXButton Send attachment']
      : [];
  const malformedLines = parameters.scenario === S.MALFORMED_DEDENT_REINDENT
    ? ['  roleless malformed sibling', '    AXGroup Outgoing audio message bubble from you']
    : [];
  const common = [
    'AXApplication Instagram in Safari',
    '  [1] AXTab Instagram',
    `  AXGroup Active conversation with ${rootTarget}`,
    ...headingLines,
    ...malformedLines,
    ...siblingBubble,
    '    [5] AXGroup Message history',
    ...historyChildren,
    ...(controlsOutside ? [] : ['    [7] AXTextArea Message composer value="" explicitly empty']),
    ...(unrelatedAttachment || controlsOutside
      ? []
      : ['    [9] AXButton Attach file in message composer']),
    ...(duplicateSameIndex ? [
      '    [9] AXButton Attach file in message composer',
      '    [87] AXButton Send attachment',
    ] : []),
    ...(duplicateUnindexed ? [
      '    AXButton Attach file in message composer',
      '    AXButton Send attachment',
    ] : []),
    ...previewLines,
    '  AXGroup Sidebar conversations',
    `    AXRow Conversation with ${exactTarget}`,
    ...(unrelatedAttachment
      ? ['  AXGroup Profile editor', '    [9] AXButton Upload file in profile editor']
      : []),
    ...(controlsOutside ? [
      '  AXGroup Profile editor',
      '    [7] AXTextArea Message composer value="" explicitly empty',
      '    [9] AXButton Attach file in message composer',
      `    AXGroup Attachment preview ${assetName}`,
      '    [87] AXButton Send attachment',
    ] : []),
    ...(parameters.scenario === S.DUPLICATE_ACTIVE_ROOT ? [
      `  AXGroup Active conversation with ${exactTarget}`,
      `    AXHeading Conversation with ${exactTarget}`,
      '    AXGroup Message history',
    ] : []),
  ];
  return inspectLiveSafariState({
    raw: {
      app: SAFARI_APP_ID,
      text: common.join('\n'),
    },
    exactTarget,
    approvedAssetPath: parameters.approved_audio_asset_path,
    revision: 1,
  });
};

const getFreshDriverObservation = async ({ driver, exactTarget, approvedAssetPath }) => {
  const state = DRIVER_STATE.get(driver);
  if (!state) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.DRIVER_INVALID);
  state.revision += 1;
  if (state.kind === 'synthetic_test') {
    return syntheticObservation({ state, exactTarget, approvedAssetPath });
  }
  const raw = await state.sky.get_app_state({ app: SAFARI_APP_ID, disableDiff: true });
  return inspectLiveSafariState({
    raw,
    exactTarget,
    approvedAssetPath,
    revision: state.revision,
  });
};

const performDriverAction = async ({
  driver,
  action,
  elementIndex = null,
  privateText = null,
}) => {
  const state = DRIVER_STATE.get(driver);
  if (!state) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.DRIVER_INVALID);
  if (state.kind === 'synthetic_test') {
    const transitions = {
      open_attachment: ['thread', 'chooser'],
      open_go_to_folder: ['chooser', 'go_to_folder'],
      type_private_audio_path: ['go_to_folder', 'path_typed'],
      resolve_private_audio_path: ['path_typed', 'file_resolved'],
      choose_resolved_audio_file: [
        'file_resolved',
        state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.UPLOAD_UNKNOWN
          ? 'upload_unknown'
          : 'preview',
      ],
      actuate_send_once: ['preview', 'after_send'],
    };
    const transition = transitions[action];
    if (!transition || state.stage !== transition[0]) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.FRESH_STATE_INVALID);
    }
    if (
      state.scenario === WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO.SEND_ACTION_THROWS
      && action === 'actuate_send_once'
    ) {
      state.action_count += 1;
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SEND_ACTUATION_UNKNOWN);
    }
    state.stage = transition[1];
    state.action_count += 1;
    return;
  }
  switch (action) {
    case 'open_attachment':
    case 'actuate_send_once':
      if (!Number.isSafeInteger(elementIndex) || elementIndex < 0) {
        throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
      }
      await state.sky.click({ app: SAFARI_APP_ID, element_index: elementIndex });
      return;
    case 'open_go_to_folder':
      await state.sky.press_key({ app: SAFARI_APP_ID, key: 'super+shift+g' });
      return;
    case 'type_private_audio_path':
      if (typeof privateText !== 'string' || privateText.length === 0) {
        throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
      }
      await state.sky.type_text({ app: SAFARI_APP_ID, text: privateText });
      return;
    case 'resolve_private_audio_path':
    case 'choose_resolved_audio_file':
      await state.sky.press_key({ app: SAFARI_APP_ID, key: 'Return' });
      return;
    default:
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
  }
};

const isExactIsolatedSafari = (observation) => observation !== null
  && observation.standard_safari === true
  && observation.isolated_surface === true
  && observation.private_browsing === false
  && observation.unrelated_regular_tabs_present === false
  && observation.challenge_or_error_visible === false;

const acquireFreshState = async (state) => {
  const observation = await getFreshDriverObservation({
    driver: state.driver,
    exactTarget: state.exact_target,
    approvedAssetPath: state.approved_audio_asset_path,
  });
  state.fresh_state_check_count += 1;
  if (
    !observation
    || !Number.isSafeInteger(observation.revision)
    || observation.revision <= state.last_revision
  ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.FRESH_STATE_INVALID);
  state.last_revision = observation.revision;
  if (!isExactIsolatedSafari(observation)) {
    throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SURFACE_INVALID);
  }
  state.safari_standard_isolated = true;
  return observation;
};

const fixedUiAction = async (state, parameters) => {
  state.fixed_ui_action_count += 1;
  await performDriverAction({ driver: state.driver, ...parameters });
};

const resolveStoreRoot = async ({ executionMode, pendingStoreRoot }) => {
  const requested = executionMode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
    ? FIXED_LIVE_CLAIM_STORE_ROOT
    : pendingStoreRoot;
  if (typeof requested !== 'string' || !isAbsolute(requested)) {
    throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  }
  if (executionMode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.SYNTHETIC) {
    const canonicalTemp = await realpath(tmpdir());
    if (
      dirname(requested) !== canonicalTemp
      || !basename(requested).startsWith(SYNTHETIC_CLAIM_STORE_PREFIX)
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  }
  const canonical = await realpath(requested);
  if (canonical !== resolve(requested)) {
    throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  }
  let handle;
  try {
    handle = await open(canonical, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const metadata = await handle.stat();
    if (
      !metadata.isDirectory()
      || !exactMode(metadata, 0o700)
      || metadata.uid !== process.getuid()
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
    return Object.freeze({
      path: canonical,
      dev: metadata.dev,
      ino: metadata.ino,
      uid: metadata.uid,
      mode: metadata.mode,
    });
  } finally {
    await handle?.close();
  }
};

const assertStableStoreRoot = async (identity) => {
  const current = await resolveStoreRoot({
    executionMode: identity.execution_mode,
    pendingStoreRoot: identity.path,
  });
  if (
    current.path !== identity.path
    || current.dev !== identity.dev
    || current.ino !== identity.ino
    || current.uid !== identity.uid
    || current.mode !== identity.mode
  ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  return current;
};

const validatePendingRecord = ({ record, binding, preparedAtMs, nowMs }) => {
  const enteredAtMs = Date.parse(record?.entered_at ?? '');
  if (
    !exactObjectKeys(record, PENDING_RECORD_FIELDS)
    || record.record_schema_version !== WELCOME_AUDIO_LIVE_PENDING_RECORD_SCHEMA_VERSION
    || !isOpaqueId(record.mission_id)
    || record.mission_id !== binding.expected_mission_id
    || !isOpaqueId(record.contract_version)
    || !isSha256(record.mission_contract_sha256)
    || !isOpaqueId(record.approval_packet_id)
    || !isOpaqueId(record.operation_id)
    || record.operation_id !== binding.expected_operation_id
    || !/^[a-f0-9]{40}$/.test(record.central_repo_head)
    || !isSha256(record.canonical_operation_sha256)
    || !isSha256(record.approval_binding_sha256)
    || record.identity_anchor_sha256 !== binding.expected_identity_anchor_sha256
    || record.identity_anchor_schema_version
      !== WELCOME_AUDIO_EXACT_IDENTITY_ANCHOR_SCHEMA_VERSION
    || record.thread_anchor_sha256 !== binding.expected_thread_anchor_sha256
    || !isSha256(record.owner_anchor_sha256)
    || !isSha256(record.manifest_sha256)
    || !isSha256(record.campaign_interval_sha256)
    || record.audio_asset_sha256 !== binding.expected_audio_sha256
    || !Number.isInteger(record.manifest_ordinal)
    || record.manifest_ordinal < 1
    || record.manifest_ordinal > 8
    || !/^[a-f0-9]{64}$/.test(record.claim_nonce)
    || record.owner_pid !== process.pid
    || !/^[a-f0-9]{64}$/.test(record.owner_nonce)
    || !isExactIso(record.entered_at)
    || enteredAtMs < preparedAtMs
    || enteredAtMs > nowMs
    || nowMs - enteredAtMs >= WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    || record.boundary_status !== 'pending_durable_before_attachment_upload'
    || record.attachment_upload_entered !== false
    || record.send_control_actuation_count !== 0
    || !/^[a-f0-9]{64}$/.test(record.attempt_nonce)
  ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  return true;
};

const pendingNames = ({ storeRoot, identityAnchorSha256 }) => {
  const identity = sha256(`identity:${identityAnchorSha256}`);
  return Object.freeze({
    pending: join(storeRoot, `pending-${identity}.json`),
    terminal: `terminal-${identity}.json`,
  });
};

const assertNoTerminalOrTemporaryEvidence = async ({ storeIdentity, names }) => {
  const entries = await readdir(storeIdentity.path);
  if (
    entries.includes(names.terminal)
    || entries.some((entry) => entry.startsWith('.pending-'))
    || entries.some((entry) => entry.startsWith('.terminal-'))
  ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.TERMINAL_OR_TEMP_PRESENT);
};

const readStablePending = async ({
  storeIdentity,
  binding,
  preparedAtMs,
  nowMs,
}) => {
  await assertStableStoreRoot(storeIdentity);
  const names = pendingNames({
    storeRoot: storeIdentity.path,
    identityAnchorSha256: binding.expected_identity_anchor_sha256,
  });
  await assertNoTerminalOrTemporaryEvidence({ storeIdentity, names });
  let handle;
  try {
    handle = await open(names.pending, FS_CONSTANTS.O_RDONLY | FS_CONSTANTS.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || !exactMode(before, 0o600)
      || before.nlink !== 1
      || before.uid !== process.getuid()
      || before.dev !== storeIdentity.dev
      || before.size < 2
      || before.size > MAX_PENDING_RECORD_BYTES
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameMetadata(metadataSnapshot(before), metadataSnapshot(after))) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_CHANGED);
    }
    let record;
    try {
      record = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
    }
    validatePendingRecord({ record, binding, preparedAtMs, nowMs });
    return Object.freeze({
      path: names.pending,
      digest: sha256(bytes),
      metadata: metadataSnapshot(after),
      record: Object.freeze(record),
    });
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ELOOP') {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
    }
    throw error;
  } finally {
    await handle?.close();
  }
};

const storeModeForExecutionMode = (executionMode) => (
  executionMode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
    ? WELCOME_AUDIO_LIVE_STORE_MODE.FIXED_LIVE_OWNER_ONLY
    : WELCOME_AUDIO_LIVE_STORE_MODE.SYNTHETIC_TEMP_TEST_ONLY
);

const buildIndependentPendingEvidence = ({ storeIdentity, loaded }) => Object.freeze({
  store_identity: Object.freeze({
    path: storeIdentity.path,
    dev: storeIdentity.dev,
    ino: storeIdentity.ino,
    uid: storeIdentity.uid,
    mode: storeIdentity.mode,
  }),
  pending_path: loaded.path,
  pending_digest: loaded.digest,
  pending_metadata: loaded.metadata,
  pending_snapshot: loaded.record,
});

const buildReceipt = ({
  executionMode,
  phase,
  decision,
  hostCapabilityConsumed = false,
  targetBindingConsumed = false,
  preparedPermitIssued = false,
  preparedPermitConsumed = false,
  safariStandardIsolated = false,
  freshStateCheckCount = 0,
  fixedUiActionCount = 0,
  sourceThreadBound = false,
  nativeChooserOpened = false,
  pendingValidationCount = 0,
  pendingRevalidatedBeforeUpload = false,
  assetPathValidatedBeforeUpload = false,
  attachmentUploadEntered = false,
  assetPreviewVerified = false,
  sendControlActuationCount = 0,
  confirmationMarker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
  newAudioBubbleDelta = 0,
  attemptEvidenceIssued = false,
  visualEvidenceIssued = false,
  externalEffectPossible = false,
  retryForbiddenPermanently = false,
  blockerCodes = [],
}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_SAFARI_LIVE_HOST_RECEIPT_SCHEMA_VERSION,
  live_host_contract_version: WELCOME_AUDIO_SAFARI_LIVE_HOST_CONTRACT_VERSION,
  redaction_status: 'allowlist_only_no_private_identity_path_anchor_state_digest_or_payload',
  execution_mode: executionMode,
  phase,
  decision,
  host_capability_consumed: hostCapabilityConsumed,
  target_binding_capability_consumed: targetBindingConsumed,
  prepared_permit_issued: preparedPermitIssued,
  prepared_permit_consumed: preparedPermitConsumed,
  safari_standard_isolated: safariStandardIsolated,
  fresh_state_before_every_ui_action: freshStateCheckCount >= fixedUiActionCount,
  fresh_state_check_count: freshStateCheckCount,
  fixed_ui_action_count: fixedUiActionCount,
  source_thread_bound: sourceThreadBound,
  native_chooser_opened: nativeChooserOpened,
  pending_record_validation_count: pendingValidationCount,
  pending_revalidated_immediately_before_upload: pendingRevalidatedBeforeUpload,
  asset_path_capability_validated_before_upload: assetPathValidatedBeforeUpload,
  attachment_upload_entered: attachmentUploadEntered,
  asset_preview_verified: assetPreviewVerified,
  send_control_actuation_count: sendControlActuationCount,
  confirmation_marker: confirmationMarker,
  new_outgoing_audio_bubble_delta: newAudioBubbleDelta,
  sent_marker_only_accepted: false,
  compose_reset_accepted: false,
  attempt_evidence_capability_issued: attemptEvidenceIssued,
  visual_confirmation_capability_issued: visualEvidenceIssued,
  durable_terminal_published_by_host: false,
  external_effect_possible: externalEffectPossible,
  retry_forbidden_permanently: retryForbiddenPermanently,
  blocker_codes: Object.freeze([...new Set(blockerCodes)]),
});

const createWelcomeAudioSafariLiveHostCapability = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'driver',
    'execution_mode',
    'private_audio_asset_capability',
    'required_authority_mode',
    'pending_store_root',
  ])) throw new TypeError(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
  const driverState = DRIVER_STATE.get(parameters.driver);
  const live = parameters.execution_mode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE;
  const synthetic = parameters.execution_mode
    === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.SYNTHETIC;
  if (
    !driverState
    || (!live && !synthetic)
    || (live && driverState.kind !== 'sky_live')
    || (synthetic && driverState.kind !== 'synthetic_test')
    || (live && parameters.required_authority_mode
      !== WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY)
    || (synthetic && parameters.required_authority_mode
      !== WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY)
    || (live && parameters.pending_store_root !== null)
    || (synthetic && typeof parameters.pending_store_root !== 'string')
    || !parameters.private_audio_asset_capability
    || typeof parameters.private_audio_asset_capability !== 'object'
  ) throw new TypeError(
    live && driverState?.kind !== 'sky_live'
      ? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.LIVE_DRIVER_REQUIRED
      : WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID,
  );
  const capability = opaqueCapability(
    'crm_core_welcome_audio_safari_live_host_capability',
    'welcome_audio_safari_live_host_capability_not_serializable',
  );
  HOST_CAPABILITY_STATE.set(capability, {
    phase: 'fresh',
    driver: parameters.driver,
    execution_mode: parameters.execution_mode,
    private_audio_asset_capability: parameters.private_audio_asset_capability,
    required_authority_mode: parameters.required_authority_mode,
    pending_store_root: parameters.pending_store_root,
  });
  return capability;
};

const createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'driver',
    'private_audio_asset_capability',
    'pending_store_root',
  ])) throw new TypeError(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
  return createWelcomeAudioSafariLiveHostCapability({
    driver: parameters.driver,
    execution_mode: WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.SYNTHETIC,
    private_audio_asset_capability: parameters.private_audio_asset_capability,
    required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.SYNTHETIC_TEMP_TEST_ONLY,
    pending_store_root: parameters.pending_store_root,
  });
};

// Stage C must be composed in this module and call this binder directly. It is
// intentionally not exported: callers cannot supply Sky, a driver brand, or a
// live execution mode.
const createInstalledComputerUseSafariLiveHostCapability = (
  privateAudioAssetCapability,
) => createWelcomeAudioSafariLiveHostCapability({
  driver: createTrustedSkySafariDriverFromInstalledRuntime(),
  execution_mode: WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE,
  private_audio_asset_capability: privateAudioAssetCapability,
  required_authority_mode: WELCOME_AUDIO_LIVE_AUTHORITY_MODE.FIXED_OWNER_ONLY,
  pending_store_root: null,
});

const prepareWelcomeAudioSafariLiveTarget = async (parameters = {}) => {
  const blocked = (executionMode, blocker) => Object.freeze({
    private_prepared_permit: null,
    redacted_receipt: buildReceipt({
      executionMode,
      phase: WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.PREPARATION,
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
      blockerCodes: [blocker],
    }),
  });
  if (!exactObjectKeys(parameters, [
    'private_live_host_capability',
    'private_target_binding_capability',
    'exact_target',
    'expected_mission_id',
    'expected_operation_id',
    'expected_identity_anchor_sha256',
    'expected_thread_anchor_sha256',
    'expected_audio_sha256',
    'now_ms',
  ])) return blocked(null, WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
  const host = HOST_CAPABILITY_STATE.get(parameters.private_live_host_capability);
  if (!host || host.phase !== 'fresh') {
    return blocked(
      host?.execution_mode ?? null,
      WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.CAPABILITY_INVALID,
    );
  }
  host.phase = 'consumed';
  const effectiveNow = host.execution_mode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
    ? Date.now()
    : parameters.now_ms;
  const state = {
    driver: host.driver,
    execution_mode: host.execution_mode,
    required_authority_mode: host.required_authority_mode,
    private_audio_asset_capability: host.private_audio_asset_capability,
    pending_store_root: host.pending_store_root,
    exact_target: parameters.exact_target,
    approved_audio_asset_path: null,
    binding: Object.freeze({
      expected_mission_id: parameters.expected_mission_id,
      expected_operation_id: parameters.expected_operation_id,
      expected_identity_anchor_sha256: parameters.expected_identity_anchor_sha256,
      expected_thread_anchor_sha256: parameters.expected_thread_anchor_sha256,
      expected_audio_sha256: parameters.expected_audio_sha256,
    }),
    prepared_at_ms: effectiveNow,
    phase: 'preparing',
    last_revision: 0,
    fresh_state_check_count: 0,
    fixed_ui_action_count: 0,
    safari_standard_isolated: false,
    target_binding_consumed: false,
    source_thread_bound: false,
    native_chooser_opened: false,
    baseline_outgoing_audio_bubble_count: null,
    store_identity: null,
  };
  const receipt = (decision, blockerCodes = [], permitIssued = false) => buildReceipt({
    executionMode: state.execution_mode,
    phase: WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.PREPARATION,
    decision,
    hostCapabilityConsumed: true,
    targetBindingConsumed: state.target_binding_consumed,
    preparedPermitIssued: permitIssued,
    safariStandardIsolated: state.safari_standard_isolated,
    freshStateCheckCount: state.fresh_state_check_count,
    fixedUiActionCount: state.fixed_ui_action_count,
    sourceThreadBound: state.source_thread_bound,
    nativeChooserOpened: state.native_chooser_opened,
    blockerCodes,
  });
  try {
    if (
      typeof parameters.exact_target !== 'string'
      || parameters.exact_target.length === 0
      || !isOpaqueId(parameters.expected_mission_id)
      || !isOpaqueId(parameters.expected_operation_id)
      || !isSha256(parameters.expected_identity_anchor_sha256)
      || !isSha256(parameters.expected_thread_anchor_sha256)
      || !isSha256(parameters.expected_audio_sha256)
      || !Number.isFinite(effectiveNow)
      || effectiveNow < 0
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
    state.store_identity = Object.freeze({
      ...(await resolveStoreRoot({
        executionMode: state.execution_mode,
        pendingStoreRoot: state.pending_store_root,
      })),
      execution_mode: state.execution_mode,
    });
    const targetStatus = await consumeWelcomeAudioLiveTargetBindingCapabilityOnce({
      private_target_binding_capability: parameters.private_target_binding_capability,
      required_authority_mode: state.required_authority_mode,
      exact_target: parameters.exact_target,
      expected_operation_id: parameters.expected_operation_id,
      expected_identity_anchor_sha256: parameters.expected_identity_anchor_sha256,
      expected_thread_anchor_sha256: parameters.expected_thread_anchor_sha256,
      now_ms: effectiveNow,
    });
    if (targetStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.TARGET_BINDING_INVALID);
    }
    state.target_binding_consumed = true;
    const thread = await acquireFreshState(state);
    if (
      thread.exact_source_target_bound !== true
      || thread.exact_thread_bound !== true
      || thread.message_input_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SOURCE_THREAD_INVALID);
    if (thread.message_composer_empty !== true) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.COMPOSER_NOT_EMPTY);
    }
    if (
      thread.outgoing_audio_scope_proven !== true
      || thread.outgoing_audio_bubble_count !== 0
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PRIOR_AUDIO_PRESENT_OR_UNKNOWN);
    if (thread.attachment_preview_count !== 0) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PREVIEW_INVALID);
    }
    if (thread.attachment_control_index === null) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ATTACHMENT_CONTROL_INVALID);
    }
    state.source_thread_bound = true;
    state.baseline_outgoing_audio_bubble_count = thread.outgoing_audio_bubble_count;
    await fixedUiAction(state, {
      action: 'open_attachment',
      elementIndex: thread.attachment_control_index,
    });
    const chooser = await acquireFreshState(state);
    if (
      chooser.exact_source_target_bound !== true
      || chooser.exact_thread_bound !== true
      || chooser.native_file_chooser_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.NATIVE_CHOOSER_INVALID);
    state.native_chooser_opened = true;
    state.phase = 'prepared';
    const permit = opaqueCapability(
      'crm_core_welcome_audio_safari_prepared_permit',
      'welcome_audio_safari_prepared_permit_not_serializable',
    );
    PREPARED_PERMIT_STATE.set(permit, state);
    return Object.freeze({
      private_prepared_permit: permit,
      redacted_receipt: receipt(
        WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.PREPARED,
        [],
        true,
      ),
    });
  } catch (error) {
    state.phase = 'blocked';
    state.exact_target = null;
    return Object.freeze({
      private_prepared_permit: null,
      redacted_receipt: receipt(
        WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
        [safeKnownBlockerMessage(error)
          ?? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID],
      ),
    });
  }
};

const createAttemptEvidence = ({
  state,
  attemptNonce,
  status,
  attachmentUploadEntered,
  sendControlActuationCount,
}) => {
  const capability = opaqueCapability(
    'crm_core_welcome_audio_safari_attempt_evidence',
    'welcome_audio_safari_attempt_evidence_not_serializable',
  );
  ATTEMPT_EVIDENCE_STATE.set(capability, {
    consumed: false,
    consumed_validly: false,
    expected_operation_id: state.binding.expected_operation_id,
    expected_thread_anchor_sha256: state.binding.expected_thread_anchor_sha256,
    attempt_nonce: attemptNonce,
    status,
    attachment_upload_entered: attachmentUploadEntered,
    send_control_actuation_count: sendControlActuationCount,
  });
  return capability;
};

const createVisualEvidence = ({ state, attemptNonce, observedAtMs }) => {
  const capability = opaqueCapability(
    'crm_core_welcome_audio_safari_visual_confirmation',
    'welcome_audio_safari_visual_confirmation_not_serializable',
  );
  VISUAL_EVIDENCE_STATE.set(capability, {
    consumed: false,
    execution_mode: state.execution_mode,
    expected_operation_id: state.binding.expected_operation_id,
    expected_thread_anchor_sha256: state.binding.expected_thread_anchor_sha256,
    attempt_nonce: attemptNonce,
    observed_at_ms: observedAtMs,
    new_outgoing_audio_bubble_delta: 1,
  });
  return capability;
};

const executeWelcomeAudioSafariLivePostPending = async (parameters = {}) => {
  const invalid = (executionMode, blocker) => Object.freeze({
    private_attempt_evidence_capability: null,
    private_visual_confirmation_capability: null,
    redacted_receipt: buildReceipt({
      executionMode,
      phase: WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.POST_PENDING_ATTEMPT,
      decision: WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED,
      blockerCodes: [blocker],
    }),
  });
  const inputEnvelope = inspectExactDataEnvelope(parameters, [
    'private_prepared_permit',
    'private_host_pending_capability',
    'approved_audio_asset_path',
    'expected_thread_anchor_sha256',
    'synthetic_entry_now_ms',
    'synthetic_preupload_now_ms',
    'synthetic_attempted_at_ms',
    'synthetic_confirmation_now_ms',
  ]);
  const inputShapeValid = inputEnvelope.valid;
  const input = inputEnvelope.values;
  const state = PREPARED_PERMIT_STATE.get(inputEnvelope.private_prepared_permit);
  if (!state || state.phase !== 'prepared') {
    return invalid(
      state?.execution_mode ?? null,
      inputShapeValid
        ? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PERMIT_INVALID
        : WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID,
    );
  }
  state.phase = 'attempting';
  state.approved_audio_asset_path = input.approved_audio_asset_path ?? null;
  let effectiveEntryNow = null;
  let pendingValidationCount = 0;
  let pendingRevalidatedBeforeUpload = false;
  let assetPathValidatedBeforeUpload = false;
  let attachmentUploadEntered = false;
  let assetPreviewVerified = false;
  let sendControlActuationCount = 0;
  let confirmationMarker = WELCOME_AUDIO_CONFIRMATION_MARKER.NONE;
  let newAudioBubbleDelta = 0;
  let visualCapability = null;
  let blocker = null;
  let initialPending = null;
  let attemptNonce = null;
  let attemptedAtMs = null;
  try {
    const live = state.execution_mode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE;
    const synthetic = state.execution_mode
      === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.SYNTHETIC;
    effectiveEntryNow = live ? Date.now() : input.synthetic_entry_now_ms;
    if (
      !inputShapeValid
      || typeof input.approved_audio_asset_path !== 'string'
      || input.approved_audio_asset_path.length === 0
      || input.expected_thread_anchor_sha256
        !== state.binding.expected_thread_anchor_sha256
      || !Number.isFinite(effectiveEntryNow)
      || (live && [
        input.synthetic_entry_now_ms,
        input.synthetic_preupload_now_ms,
        input.synthetic_attempted_at_ms,
        input.synthetic_confirmation_now_ms,
      ].some((value) => value !== null))
      || (synthetic && ![
        input.synthetic_entry_now_ms,
        input.synthetic_preupload_now_ms,
        input.synthetic_attempted_at_ms,
        input.synthetic_confirmation_now_ms,
      ].every(Number.isFinite))
      || (synthetic && input.synthetic_entry_now_ms < state.prepared_at_ms)
      || (synthetic && input.synthetic_preupload_now_ms
        < input.synthetic_entry_now_ms)
      || (synthetic && input.synthetic_attempted_at_ms
        < input.synthetic_preupload_now_ms)
      || (synthetic && input.synthetic_confirmation_now_ms
        < input.synthetic_attempted_at_ms)
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID);
    initialPending = await readStablePending({
      storeIdentity: state.store_identity,
      binding: state.binding,
      preparedAtMs: state.prepared_at_ms,
      nowMs: effectiveEntryNow,
    });
    pendingValidationCount += 1;
    const hostPendingStatus = await consumeWelcomeAudioLiveHostPendingCapabilityOnce({
      private_host_pending_capability: input.private_host_pending_capability,
      required_store_mode: storeModeForExecutionMode(state.execution_mode),
      independently_read_pending_evidence: buildIndependentPendingEvidence({
        storeIdentity: state.store_identity,
        loaded: initialPending,
      }),
      expected_mission_id: state.binding.expected_mission_id,
      expected_operation_id: state.binding.expected_operation_id,
      expected_identity_anchor_sha256: state.binding.expected_identity_anchor_sha256,
      expected_thread_anchor_sha256: state.binding.expected_thread_anchor_sha256,
      expected_audio_sha256: state.binding.expected_audio_sha256,
    });
    if (hostPendingStatus !== WELCOME_AUDIO_LIVE_HOST_PENDING_CAPABILITY_STATUS.VALID) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
    }
    attemptNonce = initialPending.record.attempt_nonce;
    const chooser = await acquireFreshState(state);
    if (
      chooser.exact_source_target_bound !== true
      || chooser.exact_thread_bound !== true
      || chooser.native_file_chooser_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.NATIVE_CHOOSER_INVALID);
    await fixedUiAction(state, { action: 'open_go_to_folder' });
    const goToFolder = await acquireFreshState(state);
    if (
      goToFolder.exact_source_target_bound !== true
      || goToFolder.exact_thread_bound !== true
      || goToFolder.native_file_chooser_visible !== true
      || goToFolder.go_to_folder_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.NATIVE_CHOOSER_INVALID);
    const assetStatus = await verifyApprovedWelcomeAudioAssetCapabilityPathBinding({
      private_audio_asset_capability: state.private_audio_asset_capability,
      asset_path: input.approved_audio_asset_path,
      expected_audio_sha256: state.binding.expected_audio_sha256,
    });
    if (assetStatus !== WELCOME_AUDIO_LIVE_PREFLIGHT_CAPABILITY_STATUS.VALID) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ASSET_PATH_BINDING_INVALID);
    }
    assetPathValidatedBeforeUpload = true;
    const effectivePreuploadNow = state.execution_mode
      === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
      ? Date.now()
      : input.synthetic_preupload_now_ms;
    const revalidatedPending = await readStablePending({
      storeIdentity: state.store_identity,
      binding: state.binding,
      preparedAtMs: state.prepared_at_ms,
      nowMs: effectivePreuploadNow,
    });
    pendingValidationCount += 1;
    const preuploadBoundaryNow = state.execution_mode
      === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
      ? Date.now()
      : input.synthetic_preupload_now_ms;
    validatePendingRecord({
      record: revalidatedPending.record,
      binding: state.binding,
      preparedAtMs: state.prepared_at_ms,
      nowMs: preuploadBoundaryNow,
    });
    if (
      revalidatedPending.digest !== initialPending.digest
      || !sameMetadata(revalidatedPending.metadata, initialPending.metadata)
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_CHANGED);
    pendingRevalidatedBeforeUpload = true;
    const immediatelyBeforeUpload = await acquireFreshState(state);
    if (
      immediatelyBeforeUpload.exact_source_target_bound !== true
      || immediatelyBeforeUpload.exact_thread_bound !== true
      || immediatelyBeforeUpload.native_file_chooser_visible !== true
      || immediatelyBeforeUpload.go_to_folder_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.NATIVE_CHOOSER_INVALID);
    attemptedAtMs = state.execution_mode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
      ? Date.now()
      : input.synthetic_attempted_at_ms;
    validatePendingRecord({
      record: revalidatedPending.record,
      binding: state.binding,
      preparedAtMs: state.prepared_at_ms,
      nowMs: attemptedAtMs,
    });
    attachmentUploadEntered = true;
    await fixedUiAction(state, {
      action: 'type_private_audio_path',
      privateText: input.approved_audio_asset_path,
    });
    const pathTyped = await acquireFreshState(state);
    if (
      pathTyped.native_file_chooser_visible !== true
      || pathTyped.go_to_folder_visible !== true
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ATTACHMENT_UPLOAD_UNKNOWN);
    await fixedUiAction(state, { action: 'resolve_private_audio_path' });
    const fileResolved = await acquireFreshState(state);
    if (fileResolved.native_file_chooser_visible !== true) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ATTACHMENT_UPLOAD_UNKNOWN);
    }
    await fixedUiAction(state, { action: 'choose_resolved_audio_file' });
    const preview = await acquireFreshState(state);
    if (
      preview.exact_source_target_bound !== true
      || preview.exact_thread_bound !== true
      || preview.exact_asset_preview_visible !== true
      || preview.attachment_preview_count !== 1
      || preview.outgoing_audio_scope_proven !== true
      || preview.outgoing_audio_bubble_count !== state.baseline_outgoing_audio_bubble_count
    ) throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PREVIEW_INVALID);
    if (preview.message_composer_empty !== true) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.COMPOSER_NOT_EMPTY);
    }
    if (preview.send_control_index === null) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SEND_CONTROL_INVALID);
    }
    assetPreviewVerified = true;
    sendControlActuationCount = 1;
    await fixedUiAction(state, {
      action: 'actuate_send_once',
      elementIndex: preview.send_control_index,
    });
    const confirmation = await acquireFreshState(state);
    const observedAtMs = state.execution_mode
      === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
      ? Date.now()
      : input.synthetic_confirmation_now_ms;
    newAudioBubbleDelta = confirmation.outgoing_audio_bubble_count
      - state.baseline_outgoing_audio_bubble_count;
    const confirmationFresh = observedAtMs >= attemptedAtMs
      && observedAtMs - attemptedAtMs <= WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS;
    const strong = confirmation.exact_source_target_bound === true
      && confirmation.exact_thread_bound === true
      && confirmation.outgoing_audio_scope_proven === true
      && confirmation.challenge_or_error_visible === false
      && newAudioBubbleDelta === 1
      && confirmationFresh;
    if (!strong) {
      throw new Error(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.CONFIRMATION_UNKNOWN);
    }
    confirmationMarker = confirmation.explicit_sent_marker_visible === true
      ? WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER
      : WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER;
    visualCapability = createVisualEvidence({
      state,
      attemptNonce,
      observedAtMs,
    });
  } catch (error) {
    blocker = safeKnownBlockerMessage(error)
      ?? (sendControlActuationCount === 1
        ? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.SEND_ACTUATION_UNKNOWN
        : attachmentUploadEntered
          ? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.ATTACHMENT_UPLOAD_UNKNOWN
          : WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.PENDING_INVALID);
  }
  const attemptStatus = visualCapability !== null
    ? WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.CONFIRMED_UPLOAD_1_SEND_1
    : attachmentUploadEntered === false
      ? WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_NO_UPLOAD_0_SEND
      : sendControlActuationCount === 0
        ? WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_0_SEND
        : WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.UNKNOWN_UPLOAD_1_SEND;
  const attemptCapability = createAttemptEvidence({
    state,
    attemptNonce,
    status: attemptStatus,
    attachmentUploadEntered,
    sendControlActuationCount,
  });
  state.phase = 'terminal_evidence_issued';
  state.exact_target = null;
  state.approved_audio_asset_path = null;
  const confirmed = visualCapability !== null;
  return Object.freeze({
    private_attempt_evidence_capability: attemptCapability,
    private_visual_confirmation_capability: visualCapability,
    redacted_receipt: buildReceipt({
      executionMode: state.execution_mode,
      phase: WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.POST_PENDING_ATTEMPT,
      decision: confirmed
        ? WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.VISUAL_EVIDENCE_READY
        : WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN,
      hostCapabilityConsumed: true,
      targetBindingConsumed: true,
      preparedPermitIssued: true,
      preparedPermitConsumed: true,
      safariStandardIsolated: state.safari_standard_isolated,
      freshStateCheckCount: state.fresh_state_check_count,
      fixedUiActionCount: state.fixed_ui_action_count,
      sourceThreadBound: state.source_thread_bound,
      nativeChooserOpened: state.native_chooser_opened,
      pendingValidationCount,
      pendingRevalidatedBeforeUpload,
      assetPathValidatedBeforeUpload,
      attachmentUploadEntered,
      assetPreviewVerified,
      sendControlActuationCount,
      confirmationMarker: confirmed ? confirmationMarker : WELCOME_AUDIO_CONFIRMATION_MARKER.NONE,
      newAudioBubbleDelta: confirmed ? 1 : 0,
      attemptEvidenceIssued: true,
      visualEvidenceIssued: confirmed,
      externalEffectPossible: state.execution_mode
        === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE
        && attachmentUploadEntered,
      retryForbiddenPermanently: true,
      blockerCodes: confirmed ? [] : [
        blocker ?? WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.CONFIRMATION_UNKNOWN,
      ],
    }),
  });
};

const consumeWelcomeAudioSafariAttemptEvidenceCapabilityOnce = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'private_attempt_evidence_capability',
    'expected_operation_id',
    'expected_thread_anchor_sha256',
  ])) return WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.INVALID;
  const state = ATTEMPT_EVIDENCE_STATE.get(parameters.private_attempt_evidence_capability);
  if (!state || state.consumed) return WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.INVALID;
  state.consumed = true;
  state.consumed_validly = state.expected_operation_id === parameters.expected_operation_id
    && state.expected_thread_anchor_sha256 === parameters.expected_thread_anchor_sha256
  return state.consumed_validly
    ? state.status
    : WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.INVALID;
};

const consumeWelcomeAudioSafariVisualConfirmationCapabilityOnce = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'private_visual_confirmation_capability',
    'private_attempt_evidence_capability',
    'expected_operation_id',
    'expected_thread_anchor_sha256',
    'synthetic_now_ms',
  ])) return WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.INVALID;
  const state = VISUAL_EVIDENCE_STATE.get(parameters.private_visual_confirmation_capability);
  const attempt = ATTEMPT_EVIDENCE_STATE.get(parameters.private_attempt_evidence_capability);
  if (!state || state.consumed) return WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.INVALID;
  state.consumed = true;
  const live = state.execution_mode === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.LIVE;
  const synthetic = state.execution_mode
    === WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE.SYNTHETIC;
  const effectiveNow = live ? Date.now() : parameters.synthetic_now_ms;
  return attempt
    && attempt.consumed === true
    && attempt.consumed_validly === true
    && attempt.status === WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS.CONFIRMED_UPLOAD_1_SEND_1
    && attempt.expected_operation_id === state.expected_operation_id
    && attempt.expected_thread_anchor_sha256 === state.expected_thread_anchor_sha256
    && attempt.attempt_nonce === state.attempt_nonce
    && state.expected_operation_id === parameters.expected_operation_id
    && state.expected_thread_anchor_sha256 === parameters.expected_thread_anchor_sha256
    && state.new_outgoing_audio_bubble_delta === 1
    && ((live && parameters.synthetic_now_ms === null)
      || (synthetic && Number.isFinite(parameters.synthetic_now_ms)))
    && Number.isFinite(effectiveNow)
    && effectiveNow >= state.observed_at_ms
    && effectiveNow - state.observed_at_ms <= WELCOME_AUDIO_CONFIRMATION_MAX_DELAY_MS
    ? WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.VALID
    : WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS.INVALID;
};

const validateWelcomeAudioSafariLiveHostReceipt = (value) => {
  if (!isPlainDataObject(value) || !exactObjectKeys(value, RECEIPT_FIELDS)) {
    return { ok: false, reason: WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID };
  }
  const booleans = [
    'host_capability_consumed',
    'target_binding_capability_consumed',
    'prepared_permit_issued',
    'prepared_permit_consumed',
    'safari_standard_isolated',
    'fresh_state_before_every_ui_action',
    'source_thread_bound',
    'native_chooser_opened',
    'pending_revalidated_immediately_before_upload',
    'asset_path_capability_validated_before_upload',
    'attachment_upload_entered',
    'asset_preview_verified',
    'sent_marker_only_accepted',
    'compose_reset_accepted',
    'attempt_evidence_capability_issued',
    'visual_confirmation_capability_issued',
    'durable_terminal_published_by_host',
    'external_effect_possible',
    'retry_forbidden_permanently',
  ];
  const strongConfirmationMarkers = new Set([
    WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITH_SENT_MARKER,
    WELCOME_AUDIO_CONFIRMATION_MARKER.NEW_AUDIO_BUBBLE_WITHOUT_SENT_MARKER,
  ]);
  const blockerCount = Array.isArray(value.blocker_codes) ? value.blocker_codes.length : -1;
  const decisionCoherent = (
    value.decision === WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.PREPARED
      && value.phase === WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.PREPARATION
      && value.host_capability_consumed === true
      && value.target_binding_capability_consumed === true
      && value.prepared_permit_issued === true
      && value.prepared_permit_consumed === false
      && value.safari_standard_isolated === true
      && value.source_thread_bound === true
      && value.native_chooser_opened === true
      && value.pending_record_validation_count === 0
      && value.pending_revalidated_immediately_before_upload === false
      && value.asset_path_capability_validated_before_upload === false
      && value.attachment_upload_entered === false
      && value.asset_preview_verified === false
      && value.send_control_actuation_count === 0
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.new_outgoing_audio_bubble_delta === 0
      && value.attempt_evidence_capability_issued === false
      && value.visual_confirmation_capability_issued === false
      && value.external_effect_possible === false
      && value.retry_forbidden_permanently === false
      && blockerCount === 0
  ) || (
    value.decision === WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.BLOCKED
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.new_outgoing_audio_bubble_delta === 0
      && value.attempt_evidence_capability_issued === false
      && value.visual_confirmation_capability_issued === false
      && value.durable_terminal_published_by_host === false
      && value.external_effect_possible === false
      && value.retry_forbidden_permanently === false
      && blockerCount === 1
  ) || (
    value.decision === WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.ATTEMPT_UNKNOWN
      && value.phase === WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.POST_PENDING_ATTEMPT
      && value.host_capability_consumed === true
      && value.target_binding_capability_consumed === true
      && value.prepared_permit_issued === true
      && value.prepared_permit_consumed === true
      && value.source_thread_bound === true
      && value.native_chooser_opened === true
      && value.attempt_evidence_capability_issued === true
      && value.visual_confirmation_capability_issued === false
      && value.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
      && value.new_outgoing_audio_bubble_delta === 0
      && value.retry_forbidden_permanently === true
      && blockerCount === 1
      && (value.attachment_upload_entered === true
        || (value.asset_preview_verified === false
          && value.send_control_actuation_count === 0))
  ) || (
    value.decision === WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION.VISUAL_EVIDENCE_READY
      && value.phase === WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE.POST_PENDING_ATTEMPT
      && value.host_capability_consumed === true
      && value.target_binding_capability_consumed === true
      && value.prepared_permit_issued === true
      && value.prepared_permit_consumed === true
      && value.safari_standard_isolated === true
      && value.source_thread_bound === true
      && value.native_chooser_opened === true
      && value.pending_record_validation_count === 2
      && value.pending_revalidated_immediately_before_upload === true
      && value.asset_path_capability_validated_before_upload === true
      && value.attachment_upload_entered === true
      && value.asset_preview_verified === true
      && value.send_control_actuation_count === 1
      && strongConfirmationMarkers.has(value.confirmation_marker)
      && value.new_outgoing_audio_bubble_delta === 1
      && value.attempt_evidence_capability_issued === true
      && value.visual_confirmation_capability_issued === true
      && value.retry_forbidden_permanently === true
      && blockerCount === 0
  );
  const valid = value.receipt_schema_version
      === WELCOME_AUDIO_SAFARI_LIVE_HOST_RECEIPT_SCHEMA_VERSION
    && value.live_host_contract_version === WELCOME_AUDIO_SAFARI_LIVE_HOST_CONTRACT_VERSION
    && value.redaction_status
      === 'allowlist_only_no_private_identity_path_anchor_state_digest_or_payload'
    && Object.values(WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE).includes(value.execution_mode)
    && Object.values(WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE).includes(value.phase)
    && Object.values(WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION).includes(value.decision)
    && booleans.every((field) => typeof value[field] === 'boolean')
    && value.fresh_state_before_every_ui_action
      === (value.fresh_state_check_count >= value.fixed_ui_action_count)
    && value.sent_marker_only_accepted === false
    && value.compose_reset_accepted === false
    && value.durable_terminal_published_by_host === false
    && Number.isSafeInteger(value.fresh_state_check_count)
    && value.fresh_state_check_count >= 0
    && Number.isSafeInteger(value.fixed_ui_action_count)
    && value.fixed_ui_action_count >= 0
    && Number.isSafeInteger(value.pending_record_validation_count)
    && value.pending_record_validation_count >= 0
    && value.pending_record_validation_count <= 2
    && [0, 1].includes(value.send_control_actuation_count)
    && [0, 1].includes(value.new_outgoing_audio_bubble_delta)
    && Object.values(WELCOME_AUDIO_CONFIRMATION_MARKER).includes(value.confirmation_marker)
    && Array.isArray(value.blocker_codes)
    && value.blocker_codes.every(
      (code) => Object.values(WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER).includes(code),
    )
    && new Set(value.blocker_codes).size === value.blocker_codes.length
    && decisionCoherent;
  return valid
    ? { ok: true, reason: null }
    : { ok: false, reason: WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER.INPUT_INVALID };
};

const resolveWelcomeAudioSafariLiveHostDeterministicOracle = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'deferred_actuator_rendezvous_authority',
    'branded_safari_actuator_port',
    'current_binding',
    'actuator_result',
  ])) return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
  const status = getWelcomeAudioSafariDeferredActuatorRendezvousStatus({
    deferred_actuator_rendezvous_authority: parameters.deferred_actuator_rendezvous_authority,
    branded_safari_actuator_port: parameters.branded_safari_actuator_port,
  });
  if (status !== WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED) return status;
  return resolveWelcomeAudioSafariDeferredActuatorRendezvous(parameters);
};

export {
  SAFARI_APP_ID,
  WELCOME_AUDIO_SAFARI_ATTEMPT_EVIDENCE_STATUS,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_BLOCKER,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_CONTRACT_VERSION,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_DECISION,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_EXECUTION_MODE,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_PHASE,
  WELCOME_AUDIO_SAFARI_LIVE_HOST_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_SAFARI_LIVE_PARSER_SYNTHETIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_SYNTHETIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_VISUAL_CONFIRMATION_STATUS,
  consumeWelcomeAudioSafariAttemptEvidenceCapabilityOnce,
  consumeWelcomeAudioSafariVisualConfirmationCapabilityOnce,
  createSyntheticSafariDriverForTest,
  createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest,
  executeWelcomeAudioSafariLivePostPending,
  inspectInstalledComputerUseRuntimeBindingForTest,
  inspectSyntheticLiveSafariStateForTest,
  inspectSyntheticSafariDriverForTest,
  prepareWelcomeAudioSafariLiveTarget,
  resolveWelcomeAudioSafariLiveHostDeterministicOracle,
  validateWelcomeAudioSafariLiveHostReceipt,
};
