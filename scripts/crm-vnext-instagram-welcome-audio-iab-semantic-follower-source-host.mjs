import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_iab_semantic_follower_source_host_v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_MISSION_ID =
  'crm_core_iab_semantic_source_to_safari_handoff_proof_v1_20260719';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND =
  'codex_in_app_browser_semantic_read_only_v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_SLOT =
  'crm-core/iab-semantic-source-runtime/v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_ALIAS =
  'crmCoreIabSemanticSourceRuntimeV1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_BRAND =
  'crm_core_iab_semantic_source_runtime_facade_v1';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS = 8;

const RUNTIME_SYMBOL = Symbol.for(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_SLOT);

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE = Object.freeze({
  QUALIFY_NOTIFICATION_PROFILE_PAIR:
    'stage_2_notification_profile_pair_qualification_read_only',
  OBSERVE_COMPLETE_CANDIDATE:
    'stage_3_complete_follower_candidate_observation_read_only',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION = Object.freeze({
  QUALIFIED: 'notification_profile_pairs_qualified_read_only',
  READY: 'complete_source_candidate_qualified_read_only',
  BLOCKED: 'blocked_zero_live_effect',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER = Object.freeze({
  CALLER_INPUT_FORBIDDEN: 'blocked_iab_semantic_source_caller_input_forbidden',
  RUNTIME_INVALID: 'blocked_iab_semantic_source_runtime_invalid',
  ISOLATED_TAB_OPEN_INVALID: 'blocked_iab_semantic_source_isolated_tab_open_invalid',
  RUNTIME_ACTION_FAILED: 'blocked_iab_semantic_source_runtime_action_failed',
  QUALIFICATION_REPORT_INVALID:
    'blocked_iab_semantic_source_notification_profile_report_invalid',
  QUALIFICATION_PAIR_COUNT_INVALID:
    'blocked_iab_semantic_source_notification_profile_pair_count_invalid',
  QUALIFICATION_PAIR_NOT_DISTINCT:
    'blocked_iab_semantic_source_notification_profile_pairs_not_distinct',
  ROW_CAP_EXCEEDED: 'blocked_iab_semantic_source_row_cap_exceeded',
  THREAD_OPEN_FORBIDDEN: 'blocked_iab_semantic_source_thread_open_forbidden',
  SEEN_TRANSITION_FORBIDDEN: 'blocked_iab_semantic_source_seen_transition_forbidden',
  CANDIDATE_REPORT_INVALID: 'blocked_iab_semantic_source_candidate_report_invalid',
  PREOPEN_UNREAD_INVALID:
    'blocked_iab_semantic_source_preopen_unread_not_explicit_none',
  COMPLETE_BINDING_INVALID: 'blocked_iab_semantic_source_complete_binding_invalid',
  RELATIONSHIP_INVALID: 'blocked_iab_semantic_source_relationship_invalid',
  PRIOR_WELCOME_INVALID:
    'blocked_iab_semantic_source_prior_welcome_absence_not_explicit',
  DEDUPE_INVALID: 'blocked_iab_semantic_source_dedupe_not_clear',
  COMPOSER_INVALID: 'blocked_iab_semantic_source_composer_not_visible',
  ATTACHMENT_CONTROL_INVALID:
    'blocked_iab_semantic_source_attachment_control_not_visible_and_usable',
  CHALLENGE_OR_ERROR: 'blocked_iab_semantic_source_challenge_or_error_present',
  FINALIZE_INVALID: 'blocked_iab_semantic_source_isolated_tab_finalize_invalid',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_iab_semantic_notification_profile_qualification_receipt_v2';
const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_iab_semantic_complete_candidate_observation_receipt_v2';

const QUALIFICATION_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'source_contract_version',
  'source_backend',
  'redaction_status',
  'stage',
  'decision',
  'rows_scanned',
  'notification_profile_pairs_qualified',
  'distinct_pairs_proven',
  'threads_opened',
  'seen_transitions',
  'challenge_or_error_absent',
  'isolated_tab_opened',
  'isolated_tab_finalized',
  'capability_issued',
  'read_only_source_action_attempted',
  'read_only_source_action_performed',
  'external_effect_invoked',
  'external_effect_possible_or_unknown',
  'blocker_codes',
]);

const OBSERVATION_RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'source_contract_version',
  'source_backend',
  'redaction_status',
  'stage',
  'decision',
  'rows_scanned',
  'candidates_qualified',
  'notification_profile_bound',
  'profile_thread_bound',
  'owner_account_bound',
  'visible_time_bucket_valid',
  'relationship_bound',
  'preopen_unread_explicit_none',
  'seen_transition_absent',
  'seen_transition_observed',
  'prior_welcome_audio_explicit_none',
  'prior_welcome_attempt_explicit_none',
  'dedupe_clear',
  'composer_visible',
  'attachment_control_visible_and_usable',
  'challenge_or_error_absent',
  'threads_opened',
  'isolated_tab_opened',
  'isolated_tab_finalized',
  'capability_issued',
  'read_only_source_action_attempted',
  'read_only_source_action_performed',
  'external_effect_invoked',
  'external_effect_possible_or_unknown',
  'blocker_codes',
]);

const COMPLETE_SOURCE_PAYLOAD_FIELDS = Object.freeze([
  'source_contract_version',
  'source_backend',
  'source_mission_id',
  'source_observed_at',
  'source_expires_at',
  'source_row_ordinal',
  'exact_target_utf8',
  'exact_notification_reference',
  'exact_profile_reference',
  'exact_thread_reference',
  'exact_owner_account_reference',
  'visible_time_bucket_utf8',
  'notification_profile_binding',
  'profile_thread_binding',
  'owner_account_binding',
  'relationship_binding',
  'preopen_unread_inbound',
  'seen_transition',
  'prior_welcome_audio',
  'prior_welcome_attempt',
  'dedupe_status',
  'composer_status',
  'attachment_control_status',
  'challenge_or_error_status',
  'isolated_tab_finalized',
]);

const RUNTIME_FACADE_FIELDS = Object.freeze([
  'brand',
  'open_isolated_instagram_tab_once',
  'qualify_notification_profile_pairs_once',
  'observe_follower_candidate_once',
  'finalize_isolated_tab_once',
]);

const OPEN_REPORT_FIELDS = Object.freeze([
  'isolated_tab_opened',
  'source_backend',
]);

const QUALIFICATION_REPORT_FIELDS = Object.freeze([
  'rows_scanned',
  'thread_open_count',
  'seen_transition_count',
  'challenge_or_error_status',
  'pairs',
]);

const QUALIFICATION_PAIR_FIELDS = Object.freeze([
  'row_ordinal',
  'notification_identity_utf8',
  'profile_identity_utf8',
  'notification_reference',
  'profile_reference',
  'visible_time_bucket_utf8',
  'notification_profile_binding',
  'follower_event_binding',
]);

const OBSERVATION_REPORT_FIELDS = Object.freeze([
  'rows_scanned',
  'source_row_ordinal',
  'exact_target_utf8',
  'exact_notification_reference',
  'exact_profile_reference',
  'exact_thread_reference',
  'exact_owner_account_reference',
  'visible_time_bucket_utf8',
  'notification_profile_binding',
  'profile_thread_binding',
  'owner_account_binding',
  'relationship_binding',
  'preopen_unread_inbound',
  'thread_open_count',
  'seen_transition',
  'prior_welcome_audio',
  'prior_welcome_attempt',
  'dedupe_status',
  'composer_status',
  'attachment_control_status',
  'challenge_or_error_status',
]);

const FINALIZE_REPORT_FIELDS = Object.freeze([
  'isolated_tab_finalized',
  'finalize_count',
]);

const REDACTION_STATUS =
  'aggregate_allowlist_only_no_identity_handle_url_reference_thread_owner_dom_selector_screenshot_coordinate_or_private_text';

const PRE_OPEN_BLOCKERS = new Set([
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
]);

const OBSERVATION_REPORT_BLOCKERS = new Set([
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.DEDUPE_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPOSER_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ATTACHMENT_CONTROL_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
]);

const QUALIFICATION_ALLOWED_BLOCKERS = new Set([
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_COUNT_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_NOT_DISTINCT,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
]);

const OBSERVATION_ALLOWED_BLOCKERS = new Set([
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.DEDUPE_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPOSER_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ATTACHMENT_CONTROL_INVALID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
]);
const PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES = new WeakMap();
const TEST_COMPLETE_SOURCE_CAPABILITY_STATES = new WeakMap();

const COMPLETE_SOURCE_CAPABILITY_FAMILY = Object.freeze({
  PRODUCTION: 'production_iab_semantic_source',
  TEST: 'synthetic_iab_semantic_source_for_test',
});

let installedTestRuntimeBinding = null;

const isPlainDataObject = (value) => {
  try {
    if (
      value === null
      || typeof value !== 'object'
      || nodeUtilTypes.isProxy(value)
      || Array.isArray(value)
    ) return false;
    return Object.getPrototypeOf(value) === Object.prototype;
  } catch {
    return false;
  }
};

const exactDataObject = (value, fields) => {
  if (!isPlainDataObject(value)) return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== fields.length
      || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
      || fields.some((field) => {
        const descriptor = descriptors[field];
        return !descriptor
          || !Object.hasOwn(descriptor, 'value')
          || descriptor.get !== undefined
          || descriptor.set !== undefined;
      })
    ) return null;
    return Object.freeze(Object.fromEntries(fields.map((field) => [
      field,
      descriptors[field].value,
    ])));
  } catch {
    return null;
  }
};

const exactArray = (value, maxLength = WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS) => {
  try {
    if (nodeUtilTypes.isProxy(value) || !Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const lengthDescriptor = descriptors.length;
    if (
      !lengthDescriptor
      || !Object.hasOwn(lengthDescriptor, 'value')
      || lengthDescriptor.get !== undefined
      || lengthDescriptor.set !== undefined
      || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > maxLength
      || keys.length !== lengthDescriptor.value + 1
    ) return null;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      if (typeof key !== 'string') return null;
      if (key === 'length') continue;
      if (!/^(?:0|[1-9][0-9]*)$/u.test(key)) return null;
      const ordinal = Number(key);
      const descriptor = descriptors[key];
      if (
        ordinal < 0
        || ordinal >= lengthDescriptor.value
        || !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
    }
    const copy = new Array(lengthDescriptor.value);
    for (let ordinal = 0; ordinal < lengthDescriptor.value; ordinal += 1) {
      const descriptor = descriptors[String(ordinal)];
      if (
        !descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) return null;
      copy[ordinal] = descriptor.value;
    }
    return Object.freeze(copy);
  } catch {
    return null;
  }
};

const validNow = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000
    - WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS;

const exactIso = (value) => typeof value === 'string'
  && Number.isFinite(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;

const exactPrivateReference = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= 2_048
  && !/[\u0000-\u001f\u007f]/u.test(value);

const exactTarget = (value) => typeof value === 'string'
  && /^[A-Za-z0-9._]{1,30}$/u.test(value);

const exactVisibleTimeBucket = (value) => typeof value === 'string'
  && value.length >= 1
  && value.length <= 80
  && !/[\u0000-\u001f\u007f]/u.test(value)
  && /^(?:3|4|5|6|7)\s*(?:d|day|days|d[ií]a|d[ií]as)$/iu.test(value);

const opaqueCapability = () => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol('crm_core_iab_semantic_complete_source_capability')]: {
      value: true,
      enumerable: false,
    },
    toJSON: {
      value: () => {
        throw new TypeError('complete_source_capability_not_serializable');
      },
      enumerable: false,
    },
    clone_guard: {
      value: Symbol('opaque_complete_source_capability'),
      enumerable: true,
    },
  });
  return Object.freeze(capability);
};

const captureExactRuntimeFacade = (runtime) => {
  try {
    if (
      runtime === null
      || typeof runtime !== 'object'
      || Array.isArray(runtime)
      || nodeUtilTypes.isProxy(runtime)
      || Object.getPrototypeOf(runtime) !== Object.prototype
      || Object.isFrozen(runtime) !== true
    ) return null;
    const descriptors = Object.getOwnPropertyDescriptors(runtime);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== RUNTIME_FACADE_FIELDS.length
      || keys.some((key) => typeof key !== 'string' || !RUNTIME_FACADE_FIELDS.includes(key))
      || RUNTIME_FACADE_FIELDS.some((field) => {
        const descriptor = descriptors[field];
        return !descriptor
          || !Object.hasOwn(descriptor, 'value')
          || descriptor.get !== undefined
          || descriptor.set !== undefined;
      })
      || descriptors.brand.value !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_BRAND
      || RUNTIME_FACADE_FIELDS.slice(1).some(
        (field) => typeof descriptors[field].value !== 'function'
          || nodeUtilTypes.isProxy(descriptors[field].value),
      )
    ) return null;
    return Object.freeze({
      runtime,
      methods: Object.freeze({
        open: descriptors.open_isolated_instagram_tab_once.value.bind(runtime),
        qualify: descriptors.qualify_notification_profile_pairs_once.value.bind(runtime),
        observe: descriptors.observe_follower_candidate_once.value.bind(runtime),
        finalize: descriptors.finalize_isolated_tab_once.value.bind(runtime),
      }),
    });
  } catch {
    return null;
  }
};

const captureExactInstalledRuntimeBinding = () => {
  try {
    const slotDescriptor = Object.getOwnPropertyDescriptor(globalThis, RUNTIME_SYMBOL);
    const aliasDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_ALIAS,
    );
    if (
      !slotDescriptor
      || !aliasDescriptor
      || !Object.hasOwn(slotDescriptor, 'value')
      || !Object.hasOwn(aliasDescriptor, 'value')
      || slotDescriptor.get !== undefined
      || slotDescriptor.set !== undefined
      || aliasDescriptor.get !== undefined
      || aliasDescriptor.set !== undefined
      || slotDescriptor.value !== aliasDescriptor.value
      || slotDescriptor.writable !== false
      || slotDescriptor.configurable !== false
      || slotDescriptor.enumerable !== false
      || aliasDescriptor.writable !== false
      || aliasDescriptor.configurable !== false
      || aliasDescriptor.enumerable !== false
    ) return null;
    return captureExactRuntimeFacade(slotDescriptor.value);
  } catch {
    return null;
  }
};

const buildQualificationReceipt = ({
  decision = WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
  blocker = null,
  progress = {},
}) => Object.freeze({
  receipt_schema_version:
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_RECEIPT_SCHEMA_VERSION,
  source_contract_version: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
  source_backend: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
  redaction_status: REDACTION_STATUS,
  stage: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE.QUALIFY_NOTIFICATION_PROFILE_PAIR,
  decision,
  rows_scanned: Number.isSafeInteger(progress.rows_scanned) ? progress.rows_scanned : 0,
  notification_profile_pairs_qualified:
    Number.isSafeInteger(progress.notification_profile_pairs_qualified)
      ? progress.notification_profile_pairs_qualified
      : 0,
  distinct_pairs_proven: progress.distinct_pairs_proven === true,
  threads_opened: Number.isSafeInteger(progress.threads_opened)
    ? progress.threads_opened
    : 0,
  seen_transitions: Number.isSafeInteger(progress.seen_transitions)
    ? progress.seen_transitions
    : 0,
  challenge_or_error_absent: progress.challenge_or_error_absent === true,
  isolated_tab_opened: progress.isolated_tab_opened === true,
  isolated_tab_finalized: progress.isolated_tab_finalized === true,
  capability_issued: false,
  read_only_source_action_attempted: progress.read_only_source_action_attempted === true,
  read_only_source_action_performed: progress.read_only_source_action_performed === true,
  external_effect_invoked: progress.external_effect_invoked === true,
  external_effect_possible_or_unknown:
    progress.external_effect_possible_or_unknown === true,
  blocker_codes: Object.freeze(blocker === null ? [] : [blocker]),
});

const buildObservationReceipt = ({
  decision = WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
  blocker = null,
  progress = {},
}) => Object.freeze({
  receipt_schema_version:
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_RECEIPT_SCHEMA_VERSION,
  source_contract_version: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
  source_backend: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
  redaction_status: REDACTION_STATUS,
  stage: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE.OBSERVE_COMPLETE_CANDIDATE,
  decision,
  rows_scanned: Number.isSafeInteger(progress.rows_scanned) ? progress.rows_scanned : 0,
  candidates_qualified:
    decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY
      && Number.isSafeInteger(progress.candidates_qualified)
      ? progress.candidates_qualified
      : 0,
  notification_profile_bound: progress.notification_profile_bound === true,
  profile_thread_bound: progress.profile_thread_bound === true,
  owner_account_bound: progress.owner_account_bound === true,
  visible_time_bucket_valid: progress.visible_time_bucket_valid === true,
  relationship_bound: progress.relationship_bound === true,
  preopen_unread_explicit_none: progress.preopen_unread_explicit_none === true,
  seen_transition_absent: progress.seen_transition_absent === true,
  seen_transition_observed: progress.seen_transition_observed === true,
  prior_welcome_audio_explicit_none:
    progress.prior_welcome_audio_explicit_none === true,
  prior_welcome_attempt_explicit_none:
    progress.prior_welcome_attempt_explicit_none === true,
  dedupe_clear: progress.dedupe_clear === true,
  composer_visible: progress.composer_visible === true,
  attachment_control_visible_and_usable:
    progress.attachment_control_visible_and_usable === true,
  challenge_or_error_absent: progress.challenge_or_error_absent === true,
  threads_opened: Number.isSafeInteger(progress.threads_opened)
    ? progress.threads_opened
    : 0,
  isolated_tab_opened: progress.isolated_tab_opened === true,
  isolated_tab_finalized: progress.isolated_tab_finalized === true,
  capability_issued: decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
  read_only_source_action_attempted: progress.read_only_source_action_attempted === true,
  read_only_source_action_performed: progress.read_only_source_action_performed === true,
  external_effect_invoked: progress.external_effect_invoked === true,
  external_effect_possible_or_unknown:
    progress.external_effect_possible_or_unknown === true,
  blocker_codes: Object.freeze(blocker === null ? [] : [blocker]),
});

const blockedQualificationResult = ({ blocker, progress = {} }) => Object.freeze({
  private_complete_source_capability: null,
  redacted_receipt: buildQualificationReceipt({ blocker, progress }),
});

const blockedObservationResult = ({ blocker, progress = {} }) => Object.freeze({
  private_complete_source_capability: null,
  redacted_receipt: buildObservationReceipt({ blocker, progress }),
});

const inspectOpenReport = (value) => {
  const report = exactDataObject(value, OPEN_REPORT_FIELDS);
  return report
    && report.isolated_tab_opened === true
    && report.source_backend === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND
    ? report
    : null;
};

const inspectFinalizeReport = (value) => {
  const report = exactDataObject(value, FINALIZE_REPORT_FIELDS);
  return report
    && report.isolated_tab_finalized === true
    && report.finalize_count === 1
    ? report
    : null;
};

const safeObservedCount = (value) => (
  Number.isSafeInteger(value) && value >= 0 ? value : 0
);

const inspectQualificationReport = (value) => {
  const report = exactDataObject(value, QUALIFICATION_REPORT_FIELDS);
  if (!report) return Object.freeze({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    progress: Object.freeze({ external_effect_possible_or_unknown: true }),
  });
  const rowsValid = Number.isSafeInteger(report.rows_scanned) && report.rows_scanned >= 1;
  const threadsValid = Number.isSafeInteger(report.thread_open_count)
    && report.thread_open_count >= 0;
  const seenValid = Number.isSafeInteger(report.seen_transition_count)
    && report.seen_transition_count >= 0;
  const rowsScanned = safeObservedCount(report.rows_scanned);
  const threadsOpened = safeObservedCount(report.thread_open_count);
  const seenTransitions = safeObservedCount(report.seen_transition_count);
  const pairs = exactArray(report.pairs);
  const inspectedPairs = [];
  let pairShapeValid = pairs !== null;
  const qualifiedRowOrdinals = new Set();
  const validPair = (pair) => pair !== null
    && Number.isSafeInteger(pair.row_ordinal)
    && pair.row_ordinal >= 1
    && pair.row_ordinal <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
    && rowsValid
    && pair.row_ordinal <= rowsScanned
    && exactTarget(pair.notification_identity_utf8)
    && pair.notification_identity_utf8 === pair.profile_identity_utf8
    && exactPrivateReference(pair.notification_reference)
    && exactPrivateReference(pair.profile_reference)
    && pair.notification_reference !== pair.profile_reference
    && exactVisibleTimeBucket(pair.visible_time_bucket_utf8)
    && pair.notification_profile_binding === 'exact'
    && pair.follower_event_binding === 'started_following_owner';
  if (pairs !== null) {
    for (let index = 0; index < pairs.length; index += 1) {
      const inspected = exactDataObject(pairs[index], QUALIFICATION_PAIR_FIELDS);
      inspectedPairs[index] = inspected;
      if (validPair(inspected)) qualifiedRowOrdinals.add(inspected.row_ordinal);
      else pairShapeValid = false;
    }
  }
  const distinct = pairShapeValid
    && pairs.length === 2
    && inspectedPairs[0].row_ordinal !== inspectedPairs[1].row_ordinal
    && inspectedPairs[0].notification_identity_utf8
      !== inspectedPairs[1].notification_identity_utf8
    && inspectedPairs[0].notification_reference !== inspectedPairs[1].notification_reference
    && inspectedPairs[0].profile_reference !== inspectedPairs[1].profile_reference
    && inspectedPairs[0].notification_reference !== inspectedPairs[1].profile_reference
    && inspectedPairs[0].profile_reference !== inspectedPairs[1].notification_reference;
  const effectInvoked = seenValid && seenTransitions > 0;
  const effectPossibleOrUnknown = !threadsValid
    || !seenValid
    || threadsOpened > 0
    || seenTransitions > 0;
  const progress = Object.freeze({
    rows_scanned: rowsScanned,
    notification_profile_pairs_qualified: qualifiedRowOrdinals.size,
    distinct_pairs_proven: distinct,
    threads_opened: threadsOpened,
    seen_transitions: seenTransitions,
    challenge_or_error_absent: report.challenge_or_error_status === 'absent',
    external_effect_invoked: effectInvoked,
    external_effect_possible_or_unknown: effectPossibleOrUnknown,
  });
  const result = (blocker) => Object.freeze({ blocker, progress });
  const invalidResult = () => Object.freeze({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID,
    progress: Object.freeze({
      ...progress,
      challenge_or_error_absent: false,
      external_effect_possible_or_unknown: true,
    }),
  });
  if (!rowsValid || !threadsValid || !seenValid) {
    return invalidResult();
  }
  if (rowsScanned > WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS) {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED);
  }
  if (threadsOpened !== 0) {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN);
  }
  if (seenTransitions !== 0) {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN);
  }
  if (report.challenge_or_error_status !== 'absent') {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR);
  }
  if (!pairShapeValid) {
    return invalidResult();
  }
  if (pairs.length !== 2) {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_COUNT_INVALID);
  }
  if (!distinct) {
    return result(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_NOT_DISTINCT);
  }
  return result(null);
};

const inspectObservationReport = (value) => {
  const report = exactDataObject(value, OBSERVATION_REPORT_FIELDS);
  if (!report) return Object.freeze({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
    progress: Object.freeze({ external_effect_possible_or_unknown: true }),
  });
  const notificationProfileBound = exactTarget(report.exact_target_utf8)
    && exactPrivateReference(report.exact_notification_reference)
    && exactPrivateReference(report.exact_profile_reference)
    && report.exact_notification_reference !== report.exact_profile_reference
    && report.notification_profile_binding === 'exact';
  const profileThreadBound = exactPrivateReference(report.exact_profile_reference)
    && exactPrivateReference(report.exact_thread_reference)
    && report.exact_profile_reference !== report.exact_thread_reference
    && report.profile_thread_binding === 'exact';
  const ownerAccountBound = exactPrivateReference(report.exact_owner_account_reference)
    && new Set([
      report.exact_notification_reference,
      report.exact_profile_reference,
      report.exact_thread_reference,
      report.exact_owner_account_reference,
    ]).size === 4
    && report.owner_account_binding === 'exact';
  const rowsValid = Number.isSafeInteger(report.rows_scanned) && report.rows_scanned >= 1;
  const rowOrdinalValid = Number.isSafeInteger(report.source_row_ordinal)
    && report.source_row_ordinal >= 1
    && rowsValid
    && report.source_row_ordinal <= report.rows_scanned;
  const threadCountValid = Number.isSafeInteger(report.thread_open_count)
    && report.thread_open_count >= 0;
  const unreadStatusValid = [
    'explicit_none',
    'present',
    'unknown',
  ].includes(report.preopen_unread_inbound);
  const seenStatusValid = ['absent', 'present', 'unknown'].includes(report.seen_transition);
  const threadsOpened = safeObservedCount(report.thread_open_count);
  const safeSeenAbsence = seenStatusValid
    && report.seen_transition === 'absent'
    && threadCountValid
    && (
      threadsOpened === 0
      || (
        threadsOpened === 1
        && report.preopen_unread_inbound === 'explicit_none'
      )
    );
  const visibleTimeBucketValid = exactVisibleTimeBucket(report.visible_time_bucket_utf8);
  const progress = Object.freeze({
    rows_scanned: safeObservedCount(report.rows_scanned),
    notification_profile_bound: notificationProfileBound,
    profile_thread_bound: profileThreadBound,
    owner_account_bound: ownerAccountBound,
    visible_time_bucket_valid: visibleTimeBucketValid,
    relationship_bound: report.relationship_binding === 'follows_owner',
    preopen_unread_explicit_none: report.preopen_unread_inbound === 'explicit_none',
    seen_transition_absent: safeSeenAbsence,
    seen_transition_observed: report.seen_transition === 'present',
    prior_welcome_audio_explicit_none: report.prior_welcome_audio === 'explicit_none',
    prior_welcome_attempt_explicit_none: report.prior_welcome_attempt === 'explicit_none',
    dedupe_clear: report.dedupe_status === 'clear',
    composer_visible: report.composer_status === 'visible',
    attachment_control_visible_and_usable:
      report.attachment_control_status === 'visible_and_usable',
    challenge_or_error_absent: report.challenge_or_error_status === 'absent',
    threads_opened: threadsOpened,
    external_effect_invoked: report.seen_transition === 'present',
    external_effect_possible_or_unknown: !safeSeenAbsence,
  });
  const blocked = (blocker) => Object.freeze({ blocker, progress });
  const invalidBlocked = () => Object.freeze({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
    progress: Object.freeze({
      ...progress,
      challenge_or_error_absent: false,
      seen_transition_absent: false,
      external_effect_possible_or_unknown: true,
    }),
  });
  if (
    !rowsValid
    || !rowOrdinalValid
    || !threadCountValid
    || !unreadStatusValid
    || !seenStatusValid
  ) {
    return invalidBlocked();
  }
  if (report.rows_scanned > WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS) {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED);
  }
  if (report.preopen_unread_inbound !== 'explicit_none') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID);
  }
  if (report.thread_open_count !== 1) {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID);
  }
  if (report.seen_transition !== 'absent') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN);
  }
  if (
    !notificationProfileBound
    || !profileThreadBound
    || !ownerAccountBound
    || !visibleTimeBucketValid
  ) return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID);
  if (report.relationship_binding !== 'follows_owner') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID);
  }
  if (
    report.prior_welcome_audio !== 'explicit_none'
    || report.prior_welcome_attempt !== 'explicit_none'
  ) return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID);
  if (report.dedupe_status !== 'clear') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.DEDUPE_INVALID);
  }
  if (report.composer_status !== 'visible') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPOSER_INVALID);
  }
  if (report.attachment_control_status !== 'visible_and_usable') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ATTACHMENT_CONTROL_INVALID);
  }
  if (report.challenge_or_error_status !== 'absent') {
    return blocked(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR);
  }
  return Object.freeze({ blocker: null, report, progress });
};

const runQualificationInternal = async ({ nowMs, runtimeBinding }) => {
  if (!validNow(nowMs)) return blockedQualificationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  const binding = runtimeBinding === undefined
    ? captureExactInstalledRuntimeBinding()
    : runtimeBinding;
  if (!binding) return blockedQualificationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
  });
  const progress = {
    isolated_tab_opened: false,
    isolated_tab_finalized: false,
    read_only_source_action_attempted: false,
    read_only_source_action_performed: false,
    external_effect_invoked: false,
    external_effect_possible_or_unknown: false,
    rows_scanned: 0,
    notification_profile_pairs_qualified: 0,
    distinct_pairs_proven: false,
    threads_opened: 0,
    seen_transitions: 0,
    challenge_or_error_absent: false,
  };
  let blocker = null;
  let inspection = null;
  let phase = 'before_open';
  const setPrimaryBlocker = (candidate) => {
    if (blocker === null) blocker = candidate;
  };
  try {
    progress.read_only_source_action_attempted = true;
    phase = 'open_pending';
    const openReport = inspectOpenReport(await binding.methods.open());
    phase = 'open_returned';
    if (!openReport) {
      progress.external_effect_possible_or_unknown = true;
      setPrimaryBlocker(
        WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID,
      );
    }
    else {
      progress.isolated_tab_opened = true;
      progress.read_only_source_action_performed = true;
      phase = 'qualification_pending';
      inspection = inspectQualificationReport(await binding.methods.qualify());
      phase = 'qualification_returned';
      Object.assign(progress, inspection.progress ?? {});
      if (inspection.blocker !== null) setPrimaryBlocker(inspection.blocker);
    }
  } catch {
    if (phase === 'open_pending' || phase === 'qualification_pending') {
      progress.external_effect_possible_or_unknown = true;
    }
    setPrimaryBlocker(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED);
  } finally {
    try {
      progress.isolated_tab_finalized = inspectFinalizeReport(
        await binding.methods.finalize(),
      ) !== null;
    } catch {
      progress.isolated_tab_finalized = false;
    }
  }
  if (!progress.isolated_tab_finalized) setPrimaryBlocker(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
  );
  if (blocker !== null) return blockedQualificationResult({ blocker, progress });
  return Object.freeze({
    private_complete_source_capability: null,
    redacted_receipt: buildQualificationReceipt({
      decision: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
      progress,
    }),
  });
};

const runObservationInternal = async ({ nowMs, runtimeBinding, capabilityFamily }) => {
  if (!validNow(nowMs)) return blockedObservationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  const binding = runtimeBinding === undefined
    ? captureExactInstalledRuntimeBinding()
    : runtimeBinding;
  if (!binding) return blockedObservationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
  });
  const progress = {
    isolated_tab_opened: false,
    isolated_tab_finalized: false,
    read_only_source_action_attempted: false,
    read_only_source_action_performed: false,
    external_effect_invoked: false,
    external_effect_possible_or_unknown: false,
    rows_scanned: 0,
    candidates_qualified: 0,
    threads_opened: 0,
  };
  let blocker = null;
  let inspection = null;
  let phase = 'before_open';
  const setPrimaryBlocker = (candidate) => {
    if (blocker === null) blocker = candidate;
  };
  try {
    progress.read_only_source_action_attempted = true;
    phase = 'open_pending';
    const openReport = inspectOpenReport(await binding.methods.open());
    phase = 'open_returned';
    if (!openReport) {
      progress.external_effect_possible_or_unknown = true;
      setPrimaryBlocker(
        WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID,
      );
    }
    else {
      progress.isolated_tab_opened = true;
      progress.read_only_source_action_performed = true;
      phase = 'observation_pending';
      inspection = inspectObservationReport(await binding.methods.observe());
      phase = 'observation_returned';
      Object.assign(progress, inspection.progress ?? {});
      if (inspection.blocker !== null) setPrimaryBlocker(inspection.blocker);
      if (blocker === null) {
        progress.candidates_qualified = 1;
      }
    }
  } catch {
    if (phase === 'open_pending' || phase === 'observation_pending') {
      progress.external_effect_possible_or_unknown = true;
    }
    setPrimaryBlocker(WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED);
  } finally {
    try {
      progress.isolated_tab_finalized = inspectFinalizeReport(
        await binding.methods.finalize(),
      ) !== null;
    } catch {
      progress.isolated_tab_finalized = false;
    }
  }
  if (!progress.isolated_tab_finalized) setPrimaryBlocker(
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
  );
  if (blocker !== null || !inspection?.report) {
    return blockedObservationResult({
      blocker: blocker
        ?? WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
      progress,
    });
  }
  const observedAt = new Date(nowMs).toISOString();
  const expiresAtMs = nowMs + WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS;
  const payload = Object.freeze({
    source_contract_version: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
    source_backend: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
    source_mission_id: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_MISSION_ID,
    source_observed_at: observedAt,
    source_expires_at: new Date(expiresAtMs).toISOString(),
    source_row_ordinal: inspection.report.source_row_ordinal,
    exact_target_utf8: inspection.report.exact_target_utf8,
    exact_notification_reference: inspection.report.exact_notification_reference,
    exact_profile_reference: inspection.report.exact_profile_reference,
    exact_thread_reference: inspection.report.exact_thread_reference,
    exact_owner_account_reference: inspection.report.exact_owner_account_reference,
    visible_time_bucket_utf8: inspection.report.visible_time_bucket_utf8,
    notification_profile_binding: 'exact',
    profile_thread_binding: 'exact',
    owner_account_binding: 'exact',
    relationship_binding: 'follows_owner',
    preopen_unread_inbound: 'explicit_none',
    seen_transition: 'absent',
    prior_welcome_audio: 'explicit_none',
    prior_welcome_attempt: 'explicit_none',
    dedupe_status: 'clear',
    composer_status: 'visible',
    attachment_control_status: 'visible_and_usable',
    challenge_or_error_status: 'absent',
    isolated_tab_finalized: 'exactly_once',
  });
  const capabilityRegistry = capabilityFamily === COMPLETE_SOURCE_CAPABILITY_FAMILY.PRODUCTION
    ? PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES
    : capabilityFamily === COMPLETE_SOURCE_CAPABILITY_FAMILY.TEST
      ? TEST_COMPLETE_SOURCE_CAPABILITY_STATES
      : null;
  if (capabilityRegistry === null) return blockedObservationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID,
    progress,
  });
  const privateCompleteSourceCapability = opaqueCapability();
  capabilityRegistry.set(privateCompleteSourceCapability, {
    consumed: false,
    family: capabilityFamily,
    issued_at_ms: nowMs,
    expires_at_ms: expiresAtMs,
    payload,
  });
  return Object.freeze({
    private_complete_source_capability: privateCompleteSourceCapability,
    redacted_receipt: buildObservationReceipt({
      decision: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
      progress,
    }),
  });
};

const qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce = async (...args) => {
  if (args.length !== 0) return blockedQualificationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  return runQualificationInternal({ nowMs: Date.now() });
};

const observeWelcomeAudioIabSemanticFollowerCandidateOnce = async (...args) => {
  if (args.length !== 0) return blockedObservationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  return runObservationInternal({
    nowMs: Date.now(),
    capabilityFamily: COMPLETE_SOURCE_CAPABILITY_FAMILY.PRODUCTION,
  });
};

const consumeCompleteSourceCapabilityStateOnce = ({ state, expectedFamily }) => {
  if (!state || state.consumed) return null;
  state.consumed = true;
  const nowMs = Date.now();
  if (
    state.family !== expectedFamily
    || !validNow(nowMs)
    || nowMs < state.issued_at_ms
    || nowMs >= state.expires_at_ms
    || !exactDataObject(state.payload, COMPLETE_SOURCE_PAYLOAD_FIELDS)
    || !exactIso(state.payload.source_observed_at)
    || !exactIso(state.payload.source_expires_at)
    || Date.parse(state.payload.source_expires_at) !== state.expires_at_ms
  ) return null;
  return state.payload;
};

const consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce = (capability) => {
  if (capability === null || typeof capability !== 'object') return null;
  const productionState = PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES.get(capability);
  if (productionState) return consumeCompleteSourceCapabilityStateOnce({
    state: productionState,
    expectedFamily: COMPLETE_SOURCE_CAPABILITY_FAMILY.PRODUCTION,
  });
  const testState = TEST_COMPLETE_SOURCE_CAPABILITY_STATES.get(capability);
  if (testState && !testState.consumed) testState.consumed = true;
  return null;
};

const consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest = (capability) => {
  if (capability === null || typeof capability !== 'object') return null;
  const testState = TEST_COMPLETE_SOURCE_CAPABILITY_STATES.get(capability);
  if (testState) return consumeCompleteSourceCapabilityStateOnce({
    state: testState,
    expectedFamily: COMPLETE_SOURCE_CAPABILITY_FAMILY.TEST,
  });
  const productionState = PRODUCTION_COMPLETE_SOURCE_CAPABILITY_STATES.get(capability);
  if (productionState && !productionState.consumed) productionState.consumed = true;
  return null;
};

const validateQualificationReceipt = (value) => {
  const receipt = exactDataObject(value, QUALIFICATION_RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes, 1);
  const booleanFields = [
    'distinct_pairs_proven',
    'challenge_or_error_absent',
    'isolated_tab_opened',
    'isolated_tab_finalized',
    'capability_issued',
    'read_only_source_action_attempted',
    'read_only_source_action_performed',
    'external_effect_invoked',
    'external_effect_possible_or_unknown',
  ];
  let booleansValid = true;
  for (let index = 0; index < booleanFields.length; index += 1) {
    if (typeof receipt[booleanFields[index]] !== 'boolean') booleansValid = false;
  }
  let blockersValid = blockers !== null;
  if (blockers !== null) {
    for (let index = 0; index < blockers.length; index += 1) {
      if (!QUALIFICATION_ALLOWED_BLOCKERS.has(blockers[index])) blockersValid = false;
    }
  }
  if (
    receipt.receipt_schema_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_RECEIPT_SCHEMA_VERSION
    || receipt.source_contract_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION
    || receipt.source_backend !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND
    || receipt.redaction_status !== REDACTION_STATUS
    || receipt.stage
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE.QUALIFY_NOTIFICATION_PROFILE_PAIR
    || ![
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
    ].includes(receipt.decision)
    || !blockersValid
    || !booleansValid
    || !Number.isSafeInteger(receipt.rows_scanned)
    || receipt.rows_scanned < 0
    || !Number.isSafeInteger(receipt.notification_profile_pairs_qualified)
    || receipt.notification_profile_pairs_qualified < 0
    || !Number.isSafeInteger(receipt.threads_opened)
    || receipt.threads_opened < 0
    || !Number.isSafeInteger(receipt.seen_transitions)
    || receipt.seen_transitions < 0
    || receipt.notification_profile_pairs_qualified
      > WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
    || receipt.notification_profile_pairs_qualified > receipt.rows_scanned
    || receipt.capability_issued
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });
  const success = receipt.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.QUALIFIED;
  const blocker = blockers.length === 1 ? blockers[0] : null;
  const stageProgressClear = receipt.rows_scanned === 0
    && receipt.notification_profile_pairs_qualified === 0
    && receipt.distinct_pairs_proven === false
    && receipt.threads_opened === 0
    && receipt.seen_transitions === 0
    && receipt.challenge_or_error_absent === false
    && receipt.external_effect_invoked === false;
  const preOpenProgressClear = stageProgressClear
    && receipt.isolated_tab_opened === false
    && receipt.isolated_tab_finalized === false
    && receipt.external_effect_possible_or_unknown === false;
  const exactSemanticEffectState = receipt.external_effect_invoked
      === (receipt.seen_transitions > 0)
    && receipt.external_effect_possible_or_unknown
      === (receipt.threads_opened > 0 || receipt.seen_transitions > 0);
  const canonicalInvalidReportEffectState = receipt.external_effect_invoked
      === (receipt.seen_transitions > 0)
    && receipt.external_effect_possible_or_unknown;
  const fullQualification = receipt.rows_scanned >= 2
    && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
    && receipt.notification_profile_pairs_qualified === 2
    && receipt.distinct_pairs_proven
    && receipt.threads_opened === 0
    && receipt.seen_transitions === 0
    && receipt.challenge_or_error_absent
    && receipt.external_effect_invoked === false
    && receipt.external_effect_possible_or_unknown === false
    && receipt.read_only_source_action_attempted
    && receipt.read_only_source_action_performed
    && receipt.isolated_tab_opened;
  const semanticReportBlocker = [
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_COUNT_INVALID,
    WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_NOT_DISTINCT,
  ].includes(blocker);
  let blockerStateValid = false;
  if (success) {
    blockerStateValid = blocker === null
      && blockers.length === 0
      && fullQualification
      && receipt.isolated_tab_finalized;
  } else if (PRE_OPEN_BLOCKERS.has(blocker)) {
    blockerStateValid = receipt.read_only_source_action_attempted === false
      && receipt.read_only_source_action_performed === false
      && preOpenProgressClear;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && !receipt.read_only_source_action_performed
      && !receipt.isolated_tab_opened
      && stageProgressClear
      && receipt.external_effect_possible_or_unknown;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && receipt.read_only_source_action_performed === receipt.isolated_tab_opened
      && stageProgressClear
      && receipt.external_effect_possible_or_unknown;
  } else if (
    blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_REPORT_INVALID
  ) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && receipt.read_only_source_action_performed
      && receipt.isolated_tab_opened
      && !receipt.challenge_or_error_absent
      && (
        receipt.rows_scanned === 0
        || receipt.threads_opened === 0
        || receipt.seen_transitions === 0
      )
      && canonicalInvalidReportEffectState;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED) {
    blockerStateValid = receipt.rows_scanned > WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.threads_opened > 0;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.threads_opened === 0
      && receipt.seen_transitions > 0;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.threads_opened === 0
      && receipt.seen_transitions === 0
      && !receipt.challenge_or_error_absent;
  } else if (
    blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_COUNT_INVALID
  ) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.threads_opened === 0
      && receipt.seen_transitions === 0
      && receipt.challenge_or_error_absent
      && !receipt.distinct_pairs_proven;
  } else if (
    blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.QUALIFICATION_PAIR_NOT_DISTINCT
  ) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.threads_opened === 0
      && receipt.seen_transitions === 0
      && receipt.challenge_or_error_absent
      && receipt.notification_profile_pairs_qualified >= 1
      && receipt.notification_profile_pairs_qualified <= 2
      && !receipt.distinct_pairs_proven;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID) {
    blockerStateValid = fullQualification && !receipt.isolated_tab_finalized;
  }
  if (
    receipt.read_only_source_action_performed !== receipt.isolated_tab_opened
    || (receipt.read_only_source_action_performed
      && !receipt.read_only_source_action_attempted)
    || (receipt.distinct_pairs_proven
      && receipt.notification_profile_pairs_qualified !== 2)
    || (semanticReportBlocker && !exactSemanticEffectState)
    || (semanticReportBlocker && (!receipt.read_only_source_action_attempted
      || !receipt.read_only_source_action_performed
      || !receipt.isolated_tab_opened))
    || !blockerStateValid
    || (!success && blockers.length !== 1)
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  return Object.freeze({ ok: true, reason: null });
};

const validateObservationReceipt = (value) => {
  const receipt = exactDataObject(value, OBSERVATION_RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes, 1);
  const booleanFields = OBSERVATION_RECEIPT_FIELDS.filter((field) => [
    'notification_profile_bound',
    'profile_thread_bound',
    'owner_account_bound',
    'visible_time_bucket_valid',
    'relationship_bound',
    'preopen_unread_explicit_none',
    'seen_transition_absent',
    'seen_transition_observed',
    'prior_welcome_audio_explicit_none',
    'prior_welcome_attempt_explicit_none',
    'dedupe_clear',
    'composer_visible',
    'attachment_control_visible_and_usable',
    'challenge_or_error_absent',
    'isolated_tab_opened',
    'isolated_tab_finalized',
    'capability_issued',
    'read_only_source_action_attempted',
    'read_only_source_action_performed',
    'external_effect_invoked',
    'external_effect_possible_or_unknown',
  ].includes(field));
  let booleansValid = true;
  for (let index = 0; index < booleanFields.length; index += 1) {
    if (typeof receipt[booleanFields[index]] !== 'boolean') booleansValid = false;
  }
  let blockersValid = blockers !== null;
  if (blockers !== null) {
    for (let index = 0; index < blockers.length; index += 1) {
      if (!OBSERVATION_ALLOWED_BLOCKERS.has(blockers[index])) blockersValid = false;
    }
  }
  if (
    receipt.receipt_schema_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_RECEIPT_SCHEMA_VERSION
    || receipt.source_contract_version
      !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION
    || receipt.source_backend !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND
    || receipt.redaction_status !== REDACTION_STATUS
    || receipt.stage !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE.OBSERVE_COMPLETE_CANDIDATE
    || ![
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.BLOCKED,
    ].includes(receipt.decision)
    || !blockersValid
    || !booleansValid
    || !Number.isSafeInteger(receipt.rows_scanned)
    || receipt.rows_scanned < 0
    || !Number.isSafeInteger(receipt.candidates_qualified)
    || ![0, 1].includes(receipt.candidates_qualified)
    || !Number.isSafeInteger(receipt.threads_opened)
    || receipt.threads_opened < 0
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });
  const ready = receipt.decision === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION.READY;
  const blocker = blockers.length === 1 ? blockers[0] : null;
  const milestoneFields = booleanFields.filter((field) => ![
    'capability_issued',
    'isolated_tab_opened',
    'isolated_tab_finalized',
    'read_only_source_action_attempted',
    'read_only_source_action_performed',
    'seen_transition_observed',
    'external_effect_invoked',
    'external_effect_possible_or_unknown',
  ].includes(field));
  let milestoneProgressClear = true;
  for (let index = 0; index < milestoneFields.length; index += 1) {
    if (receipt[milestoneFields[index]] !== false) milestoneProgressClear = false;
  }
  const stageProgressClear = receipt.rows_scanned === 0
    && receipt.candidates_qualified === 0
    && milestoneProgressClear
    && receipt.threads_opened === 0
    && receipt.seen_transition_observed === false
    && receipt.external_effect_invoked === false;
  const preOpenProgressClear = stageProgressClear
    && !receipt.isolated_tab_opened
    && !receipt.isolated_tab_finalized
    && !receipt.external_effect_possible_or_unknown;
  const semanticEffectConsistent = receipt.external_effect_possible_or_unknown
      === !receipt.seen_transition_absent
    && receipt.external_effect_invoked === receipt.seen_transition_observed
    && (!receipt.external_effect_invoked
      || (
        receipt.external_effect_possible_or_unknown
        && !receipt.seen_transition_absent
      ));
  const seenAbsenceThreadReachable = !receipt.seen_transition_absent
    || receipt.threads_opened === 0
    || (
      receipt.threads_opened === 1
      && receipt.preopen_unread_explicit_none
    );
  const allBindings = receipt.notification_profile_bound
    && receipt.profile_thread_bound
    && receipt.owner_account_bound
    && receipt.visible_time_bucket_valid;
  const allPriorClear = receipt.prior_welcome_audio_explicit_none
    && receipt.prior_welcome_attempt_explicit_none;
  let allMilestones = true;
  for (let index = 0; index < milestoneFields.length; index += 1) {
    if (receipt[milestoneFields[index]] !== true) allMilestones = false;
  }
  const fullObservation = receipt.rows_scanned >= 1
    && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
    && receipt.threads_opened === 1
    && allMilestones
    && receipt.read_only_source_action_attempted
    && receipt.read_only_source_action_performed
    && receipt.isolated_tab_opened
    && !receipt.external_effect_invoked
    && !receipt.external_effect_possible_or_unknown;
  const semanticReportBlocker = OBSERVATION_REPORT_BLOCKERS.has(blocker)
    && blocker !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID;
  const boundedObservationRows = receipt.rows_scanned >= 1
    && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS;
  let blockerStateValid = false;
  if (ready) {
    blockerStateValid = blocker === null
      && blockers.length === 0
      && fullObservation
      && receipt.isolated_tab_finalized
      && receipt.candidates_qualified === 1
      && receipt.capability_issued;
  } else if (PRE_OPEN_BLOCKERS.has(blocker)) {
    blockerStateValid = !receipt.read_only_source_action_attempted
      && !receipt.read_only_source_action_performed
      && preOpenProgressClear;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && !receipt.read_only_source_action_performed
      && !receipt.isolated_tab_opened
      && stageProgressClear
      && receipt.external_effect_possible_or_unknown;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && receipt.read_only_source_action_performed === receipt.isolated_tab_opened
      && stageProgressClear
      && receipt.external_effect_possible_or_unknown;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CANDIDATE_REPORT_INVALID) {
    blockerStateValid = receipt.read_only_source_action_attempted
      && receipt.read_only_source_action_performed
      && receipt.isolated_tab_opened
      && !receipt.challenge_or_error_absent
      && !receipt.seen_transition_absent
      && receipt.external_effect_possible_or_unknown
      && semanticEffectConsistent;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED) {
    blockerStateValid = receipt.rows_scanned > WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PREOPEN_UNREAD_INVALID) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && !receipt.preopen_unread_explicit_none;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPLETE_BINDING_INVALID) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.preopen_unread_explicit_none
      && (
        receipt.threads_opened !== 1
        || (receipt.seen_transition_absent && !allBindings)
      );
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN) {
    blockerStateValid = receipt.rows_scanned >= 1
      && receipt.rows_scanned <= WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS
      && receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && !receipt.seen_transition_absent;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RELATIONSHIP_INVALID) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && !receipt.relationship_bound;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.PRIOR_WELCOME_INVALID) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && receipt.relationship_bound
      && !allPriorClear;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.DEDUPE_INVALID) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && receipt.relationship_bound
      && allPriorClear
      && !receipt.dedupe_clear;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.COMPOSER_INVALID) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && receipt.relationship_bound
      && allPriorClear
      && receipt.dedupe_clear
      && !receipt.composer_visible;
  } else if (
    blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ATTACHMENT_CONTROL_INVALID
  ) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && receipt.relationship_bound
      && allPriorClear
      && receipt.dedupe_clear
      && receipt.composer_visible
      && !receipt.attachment_control_visible_and_usable;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CHALLENGE_OR_ERROR) {
    blockerStateValid = receipt.preopen_unread_explicit_none
      && receipt.threads_opened === 1
      && receipt.seen_transition_absent
      && allBindings
      && receipt.relationship_bound
      && allPriorClear
      && receipt.dedupe_clear
      && receipt.composer_visible
      && receipt.attachment_control_visible_and_usable
      && !receipt.challenge_or_error_absent;
  } else if (blocker === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID) {
    blockerStateValid = fullObservation
      && !receipt.isolated_tab_finalized
      && receipt.candidates_qualified === 0
      && !receipt.capability_issued;
  }
  if (
    receipt.read_only_source_action_performed !== receipt.isolated_tab_opened
    || (receipt.read_only_source_action_performed
      && !receipt.read_only_source_action_attempted)
    || (receipt.read_only_source_action_attempted && !semanticEffectConsistent)
    || !seenAbsenceThreadReachable
    || (receipt.seen_transition_absent && receipt.external_effect_invoked)
    || receipt.external_effect_invoked !== receipt.seen_transition_observed
    || (receipt.external_effect_invoked
      && !receipt.external_effect_possible_or_unknown)
    || (receipt.read_only_source_action_attempted
      && !receipt.seen_transition_absent
      && !receipt.external_effect_possible_or_unknown)
    || (semanticReportBlocker && !semanticEffectConsistent)
    || (semanticReportBlocker
      && blocker !== WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED
      && !boundedObservationRows)
    || (semanticReportBlocker && (!receipt.read_only_source_action_attempted
      || !receipt.read_only_source_action_performed
      || !receipt.isolated_tab_opened))
    || !blockerStateValid
    || (!ready && (
      blockers.length !== 1
      || receipt.candidates_qualified !== 0
      || receipt.capability_issued
    ))
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  return Object.freeze({ ok: true, reason: null });
};

const validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt = (value) => (
  validateQualificationReceipt(value)
);

const validateWelcomeAudioIabSemanticFollowerCandidateReceipt = (value) => (
  validateObservationReceipt(value)
);

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST = Object.freeze({
  EXACT_TWO_PAIRS: 'exact_two_pairs',
  ONE_PAIR: 'one_pair',
  ONE_PAIR_THREAD_OPENED: 'one_pair_thread_opened',
  DUPLICATE_PAIR: 'duplicate_pair',
  TOO_MANY_ROWS: 'too_many_rows',
  ROW_CAP_WITH_INVALID_THREAD_COUNT: 'row_cap_with_invalid_thread_count',
  THREAD_OPENED: 'thread_opened',
  SEEN_TRANSITION: 'seen_transition',
  CHALLENGE: 'challenge',
  REPORT_PROXY: 'report_proxy',
  PAIR_ARRAY_INHERITED_ITERATOR: 'pair_array_inherited_iterator',
  ACTION_THROWS: 'action_throws',
});

const WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST = Object.freeze({
  EXACT_CANDIDATE: 'exact_candidate',
  TOO_MANY_ROWS: 'too_many_rows',
  ROW_CAP_WITH_INVALID_THREAD_COUNT: 'row_cap_with_invalid_thread_count',
  UNREAD_PRESENT: 'unread_present',
  UNREAD_UNKNOWN: 'unread_unknown',
  UNREAD_PRESENT_THREAD_OPENED: 'unread_present_thread_opened',
  UNREAD_UNKNOWN_THREAD_OPENED: 'unread_unknown_thread_opened',
  SEEN_TRANSITION: 'seen_transition',
  SEEN_UNKNOWN: 'seen_unknown',
  THREAD_NOT_OPENED: 'thread_not_opened',
  THREAD_MULTIPLE: 'thread_multiple',
  BINDING_INCOMPLETE: 'binding_incomplete',
  RELATIONSHIP_UNKNOWN: 'relationship_unknown',
  PRIOR_AUDIO_PRESENT: 'prior_audio_present',
  PRIOR_ATTEMPT_UNKNOWN: 'prior_attempt_unknown',
  DEDUPE_UNKNOWN: 'dedupe_unknown',
  COMPOSER_MISSING: 'composer_missing',
  ATTACHMENT_MISSING: 'attachment_missing',
  CHALLENGE: 'challenge',
  REPORT_PROXY: 'report_proxy',
  ACTION_THROWS: 'action_throws',
});

const buildTestQualificationReport = (scenario) => {
  const pair = (ordinal, identity) => Object.freeze({
    row_ordinal: ordinal,
    notification_identity_utf8: identity,
    profile_identity_utf8: identity,
    notification_reference: `private-notification-${ordinal}`,
    profile_reference: `private-profile-${ordinal}`,
    visible_time_bucket_utf8: `${ordinal + 2}d`,
    notification_profile_binding: 'exact',
    follower_event_binding: 'started_following_owner',
  });
  if (scenario === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ACTION_THROWS) {
    throw new TypeError('synthetic_runtime_action_failed');
  }
  const first = pair(1, 'private_candidate_a');
  const second = scenario
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.DUPLICATE_PAIR
    ? first
    : pair(2, 'private_candidate_b');
  const report = {
    rows_scanned: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS
      || scenario
        === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
          .ROW_CAP_WITH_INVALID_THREAD_COUNT
      ? 9
      : 8,
    thread_open_count: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT
      ? -1
      : [
          WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.THREAD_OPENED,
          WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
            .ONE_PAIR_THREAD_OPENED,
        ].includes(scenario)
        ? 1
        : 0,
    seen_transition_count: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.SEEN_TRANSITION
      ? 1
      : 0,
    challenge_or_error_status: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.CHALLENGE
      ? 'present'
      : 'absent',
    pairs: Object.freeze([
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR_THREAD_OPENED,
    ].includes(scenario)
      ? [first]
      : [first, second]),
  };
  if (
    scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
        .PAIR_ARRAY_INHERITED_ITERATOR
  ) {
    const hostilePrototype = Object.create(Array.prototype);
    Object.defineProperty(hostilePrototype, Symbol.iterator, {
      get: () => {
        throw new TypeError('inherited_iterator_must_not_run');
      },
    });
    const hostilePairs = [first, second];
    Object.setPrototypeOf(hostilePairs, hostilePrototype);
    report.pairs = Object.freeze(hostilePairs);
  }
  const frozen = Object.freeze(report);
  return scenario
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.REPORT_PROXY
    ? new Proxy(frozen, {})
    : frozen;
};

const buildTestObservationReport = (scenario) => {
  if (scenario === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.ACTION_THROWS) {
    throw new TypeError('synthetic_runtime_action_failed');
  }
  const report = Object.freeze({
    rows_scanned: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.TOO_MANY_ROWS
      || scenario
        === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .ROW_CAP_WITH_INVALID_THREAD_COUNT
      ? 9
      : 8,
    source_row_ordinal: 1,
    exact_target_utf8: 'private_candidate_a',
    exact_notification_reference: 'private-notification-1',
    exact_profile_reference: 'private-profile-1',
    exact_thread_reference: 'private-thread-1',
    exact_owner_account_reference: 'private.owner.1',
    visible_time_bucket_utf8: '3d',
    notification_profile_binding: 'exact',
    profile_thread_binding: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.BINDING_INCOMPLETE
      ? 'unknown'
      : 'exact',
    owner_account_binding: 'exact',
    relationship_binding: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.RELATIONSHIP_UNKNOWN
      ? 'unknown'
      : 'follows_owner',
    preopen_unread_inbound: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_PRESENT
      || scenario
        === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
          .UNREAD_PRESENT_THREAD_OPENED
      ? 'present'
      : scenario
        === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_UNKNOWN
        || scenario
          === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
            .UNREAD_UNKNOWN_THREAD_OPENED
        ? 'unknown'
        : 'explicit_none',
    thread_open_count: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
        .ROW_CAP_WITH_INVALID_THREAD_COUNT
      ? -1
      : [
          WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_NOT_OPENED,
          WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_PRESENT,
          WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.UNREAD_UNKNOWN,
        ].includes(scenario)
        ? 0
        : scenario
          === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.THREAD_MULTIPLE
          ? 2
          : 1,
    seen_transition: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_TRANSITION
      ? 'present'
      : scenario
        === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.SEEN_UNKNOWN
        ? 'unknown'
      : 'absent',
    prior_welcome_audio: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.PRIOR_AUDIO_PRESENT
      ? 'present'
      : 'explicit_none',
    prior_welcome_attempt: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.PRIOR_ATTEMPT_UNKNOWN
      ? 'unknown'
      : 'explicit_none',
    dedupe_status: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.DEDUPE_UNKNOWN
      ? 'unknown'
      : 'clear',
    composer_status: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.COMPOSER_MISSING
      ? 'missing'
      : 'visible',
    attachment_control_status: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.ATTACHMENT_MISSING
      ? 'missing'
      : 'visible_and_usable',
    challenge_or_error_status: scenario
      === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.CHALLENGE
      ? 'present'
      : 'absent',
  });
  return scenario
    === WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.REPORT_PROXY
    ? new Proxy(report, {})
    : report;
};

const createTestRuntime = ({
  openScenario,
  qualificationScenario,
  observationScenario,
  finalizeScenario,
}) => {
  const state = {
    open_count: 0,
    qualification_count: 0,
    observation_count: 0,
    finalize_count: 0,
    finalized: false,
  };
  const runtime = Object.freeze({
    brand: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_BRAND,
    open_isolated_instagram_tab_once: async () => {
      state.open_count += 1;
      if (openScenario === 'throws') throw new TypeError('synthetic_open_failed');
      if (openScenario === 'malformed') return Object.freeze({
        isolated_tab_opened: 'unknown',
        source_backend: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
      });
      return Object.freeze({
        isolated_tab_opened: true,
        source_backend: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
      });
    },
    qualify_notification_profile_pairs_once: async () => {
      state.qualification_count += 1;
      return buildTestQualificationReport(qualificationScenario);
    },
    observe_follower_candidate_once: async () => {
      state.observation_count += 1;
      return buildTestObservationReport(observationScenario);
    },
    finalize_isolated_tab_once: async () => {
      state.finalize_count += 1;
      state.finalized = true;
      if (finalizeScenario === 'throws') throw new TypeError('synthetic_finalize_failed');
      return Object.freeze({
        isolated_tab_finalized: finalizeScenario !== 'invalid',
        finalize_count: state.finalize_count,
      });
    },
  });
  return runtime;
};

const installWelcomeAudioIabSemanticRuntimeFacadeForTest = (parameters = {}) => {
  const legacyInput = exactDataObject(parameters, [
    'qualification_scenario',
    'observation_scenario',
    'finalize_scenario',
  ]);
  const candidate = legacyInput
    ? Object.freeze({
        open_scenario: 'exact',
        qualification_scenario: legacyInput.qualification_scenario,
        observation_scenario: legacyInput.observation_scenario,
        finalize_scenario: legacyInput.finalize_scenario,
      })
    : parameters;
  const input = exactDataObject(candidate, [
    'open_scenario',
    'qualification_scenario',
    'observation_scenario',
    'finalize_scenario',
  ]);
  if (
    !input
    || !Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST,
    ).includes(input.qualification_scenario)
    || !Object.values(
      WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST,
    ).includes(input.observation_scenario)
    || !['exact', 'throws', 'malformed'].includes(input.open_scenario)
    || !['exact', 'invalid', 'throws'].includes(input.finalize_scenario)
    || installedTestRuntimeBinding !== null
  ) return false;
  const runtime = createTestRuntime({
    openScenario: input.open_scenario,
    qualificationScenario: input.qualification_scenario,
    observationScenario: input.observation_scenario,
    finalizeScenario: input.finalize_scenario,
  });
  const binding = captureExactRuntimeFacade(runtime);
  if (!binding) return false;
  installedTestRuntimeBinding = binding;
  return true;
};

const resetWelcomeAudioIabSemanticRuntimeFacadeForTest = () => {
  if (installedTestRuntimeBinding === null) return false;
  installedTestRuntimeBinding = null;
  return true;
};

const qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['now_ms']);
  if (!input) return blockedQualificationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  return runQualificationInternal({
    nowMs: input.now_ms,
    runtimeBinding: installedTestRuntimeBinding,
  });
};

const observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest = async (
  parameters = {},
) => {
  const input = exactDataObject(parameters, ['now_ms']);
  if (!input) return blockedObservationResult({
    blocker: WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.CALLER_INPUT_FORBIDDEN,
  });
  return runObservationInternal({
    nowMs: input.now_ms,
    runtimeBinding: installedTestRuntimeBinding,
    capabilityFamily: COMPLETE_SOURCE_CAPABILITY_FAMILY.TEST,
  });
};

export {
  COMPLETE_SOURCE_PAYLOAD_FIELDS as WELCOME_AUDIO_IAB_SEMANTIC_COMPLETE_SOURCE_PAYLOAD_FIELDS,
  OBSERVATION_RECEIPT_FIELDS as WELCOME_AUDIO_IAB_SEMANTIC_OBSERVATION_RECEIPT_FIELDS,
  QUALIFICATION_RECEIPT_FIELDS as WELCOME_AUDIO_IAB_SEMANTIC_QUALIFICATION_RECEIPT_FIELDS,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BACKEND,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_CAPABILITY_TTL_MS,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_DECISION,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_CONTRACT_VERSION,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_HOST_MISSION_ID,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_MAX_ROWS,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_ALIAS,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_BRAND,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_RUNTIME_SLOT,
  WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_STAGE,
  consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce,
  consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest,
  installWelcomeAudioIabSemanticRuntimeFacadeForTest,
  observeWelcomeAudioIabSemanticFollowerCandidateOnce,
  observeWelcomeAudioIabSemanticFollowerCandidateOnceForTest,
  qualifyWelcomeAudioIabSemanticNotificationProfilePairOnce,
  qualifyWelcomeAudioIabSemanticNotificationProfilePairOnceForTest,
  resetWelcomeAudioIabSemanticRuntimeFacadeForTest,
  validateWelcomeAudioIabSemanticFollowerCandidateReceipt,
  validateWelcomeAudioIabSemanticNotificationProfileQualificationReceipt,
};
