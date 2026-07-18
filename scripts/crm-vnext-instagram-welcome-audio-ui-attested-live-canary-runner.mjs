/**
 * One-shot UI-attested welcome-audio canary runner.
 *
 * The live namespace owns the fixed authority root, fixed claim store,
 * installed Computer Use runtime, Safari driver, and every clock. Callers can
 * supply only the already-private draft and the exact authorization seed.
 * The synthetic sibling is test-only and is the sole injectable surface.
 */

import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION,
  createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability,
  openFixedWelcomeAudioUiAttestedLiveAuthority,
  validateApprovedWelcomeAudioAsset,
  validateWelcomeAudioLivePreflightReceipt,
  validateWelcomeAudioUiAttestedLiveAuthorityReceipt,
  validateWelcomeAudioUiAttestedLiveOperationContext,
  validateWelcomeAudioUiAttestedLiveOperationContextReceipt,
} from './crm-vnext-instagram-welcome-audio-live-preflight.mjs';
import {
  publishFixedWelcomeAudioUiAttestedLiveAuthority,
  publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest,
  validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt,
} from './crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs';
import {
  WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION,
  observeWelcomeAudioSafariUiAttestedPreclaimOnce,
  observeWelcomeAudioSafariUiAttestedPreclaimOnceForTest,
  runWelcomeAudioSafariUiAttestedLiveCompositeOnce,
  runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest,
  validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt,
  validateWelcomeAudioSafariUiAttestedPreclaimObserverReceipt,
} from './crm-vnext-instagram-welcome-audio-safari-live-host.mjs';
import {
  admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnce,
  admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnceForTest,
  buildWelcomeAudioUiAttestedPreclaimBundle,
  buildWelcomeAudioUiAttestedPreclaimBundleForTest,
  validateWelcomeAudioUiAttestedPreclaimBuilderReceipt,
} from './crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.mjs';
import {
  validateWelcomeAudioUiAttestedCanaryPacketDraft,
} from './crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs';

const WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_canary_runner_v1';
const WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_ui_attested_live_canary_runner_receipt_v1';

const WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION = Object.freeze({
  CONFIRMED: 'terminal_confirmed_exactly_once',
  UNKNOWN: 'terminal_unknown_permanent_no_retry',
  TERMINAL_ZERO_EFFECT: 'terminal_zero_external_effect_permanent_no_retry',
  BLOCKED: 'blocked_before_external_effect',
});

const WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST = Object.freeze({
  NONE: 'none',
  AUTHORITY_PUBLICATION_RESULT_LOST:
    'authority_publication_result_lost_after_exclusive_publication',
});

const WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_live_canary_runner_input_invalid',
  DRAFT_INVALID: 'blocked_live_canary_runner_draft_invalid',
  AUTHORIZATION_SEED_INVALID: 'blocked_live_canary_runner_authorization_seed_invalid',
  AUDIO_INVALID: 'blocked_live_canary_runner_audio_invalid',
  OBSERVATION_INVALID: 'blocked_live_canary_runner_preclaim_observation_invalid',
  BUILDER_INVALID: 'blocked_live_canary_runner_preclaim_builder_invalid',
  AUTHORITY_PUBLICATION_INVALID: 'blocked_live_canary_runner_authority_publication_invalid',
  AUTHORITY_OPEN_INVALID: 'blocked_live_canary_runner_authority_open_invalid',
  OPERATION_CONTEXT_INVALID: 'blocked_live_canary_runner_operation_context_invalid',
  COMPOSITE_INVALID: 'blocked_live_canary_runner_composite_invalid',
});

const LIVE_FIELDS = Object.freeze([
  'private_draft',
  'private_authorization_seed',
]);

const SYNTHETIC_FIELDS = Object.freeze([
  'private_draft',
  'private_authorization_seed',
  'authority_root',
  'private_store_capability',
  'driver',
  'synthetic_store_root',
  'now_ms',
  'synthetic_claim_now_ms',
  'synthetic_prepare_now_ms',
  'synthetic_pending_now_ms',
  'synthetic_entry_now_ms',
  'synthetic_preupload_now_ms',
  'synthetic_attempted_at_ms',
  'synthetic_confirmation_now_ms',
  'synthetic_terminal_now_ms',
  'synthetic_runner_fault_scenario',
  'synthetic_fault_scenario',
]);

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'runner_contract_version',
  'redaction_status',
  'decision',
  'audio_validated',
  'preclaim_start_gates_validated',
  'preclaim_observed',
  'preclaim_built',
  'authority_publication_attempted',
  'authority_published',
  'authority_opened',
  'operation_context_validated',
  'composite_invoked',
  'confirmation_proven',
  'external_effect_possible',
  'retry_forbidden_permanently',
  'text_sent',
  'follow_back_invoked',
  'mailerlite_invoked',
  'campaign_touched',
  'blocker_codes',
]);

const BLOCKERS = new Set(Object.values(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER));

const isPlainObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeUtilTypes.isProxy(value)
  && (Object.getPrototypeOf(value) === Object.prototype
    || Object.getPrototypeOf(value) === null);

const exactObject = (value, fields) => {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== fields.length
    || keys.some((key) => typeof key !== 'string' || !fields.includes(key))
    || fields.some((field) => !Object.hasOwn(descriptors, field))
    || keys.some((key) => !Object.hasOwn(descriptors[key], 'value'))
  ) return null;
  return Object.freeze(Object.fromEntries(fields.map((field) => [
    field,
    descriptors[field].value,
  ])));
};

const snapshotPlainData = (value, seen = new WeakSet(), budget = { count: 0 }) => {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) return value;
  if (typeof value !== 'object' || nodeUtilTypes.isProxy(value)) {
    throw new TypeError('unsafe_plain_data');
  }
  if (seen.has(value) || budget.count > 4096) throw new TypeError('unsafe_plain_data');
  seen.add(value);
  budget.count += 1;
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError('unsafe_plain_data');
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Reflect.ownKeys(descriptors);
      if (keys.some((key) => key !== 'length' && (
        typeof key !== 'string'
        || !/^(?:0|[1-9][0-9]*)$/u.test(key)
        || Number(key) >= value.length
      ))) throw new TypeError('unsafe_plain_data');
      const result = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
          throw new TypeError('unsafe_plain_data');
        }
        result.push(snapshotPlainData(descriptor.value, seen, budget));
      }
      return Object.freeze(result);
    }
    if (!isPlainObject(value)) throw new TypeError('unsafe_plain_data');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) throw new TypeError('unsafe_plain_data');
    const result = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
        throw new TypeError('unsafe_plain_data');
      }
      result[key] = snapshotPlainData(descriptor.value, seen, budget);
    }
    return Object.freeze(result);
  } finally {
    seen.delete(value);
  }
};

const buildReceipt = ({
  decision = WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED,
  audioValidated = false,
  preclaimStartGatesValidated = false,
  preclaimObserved = false,
  preclaimBuilt = false,
  authorityPublicationAttempted = false,
  authorityPublished = false,
  authorityOpened = false,
  operationContextValidated = false,
  compositeInvoked = false,
  confirmationProven = false,
  externalEffectPossible = false,
  retryForbiddenPermanently = false,
  blockerCodes = [],
} = {}) => Object.freeze({
  receipt_schema_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_RECEIPT_SCHEMA_VERSION,
  runner_contract_version: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_CONTRACT_VERSION,
  redaction_status:
    'aggregate_allowlist_only_no_private_values_paths_ids_anchors_digests_or_timestamps',
  decision,
  audio_validated: audioValidated,
  preclaim_start_gates_validated: preclaimStartGatesValidated,
  preclaim_observed: preclaimObserved,
  preclaim_built: preclaimBuilt,
  authority_publication_attempted: authorityPublicationAttempted,
  authority_published: authorityPublished,
  authority_opened: authorityOpened,
  operation_context_validated: operationContextValidated,
  composite_invoked: compositeInvoked,
  confirmation_proven: confirmationProven,
  external_effect_possible: externalEffectPossible,
  retry_forbidden_permanently: retryForbiddenPermanently,
  text_sent: false,
  follow_back_invoked: false,
  mailerlite_invoked: false,
  campaign_touched: false,
  blocker_codes: Object.freeze([...new Set(blockerCodes)]),
});

const blocked = (blocker, flags = {}) => Object.freeze({
  redacted_receipt: buildReceipt({ ...flags, blockerCodes: [blocker] }),
});

const terminalZeroEffect = (blocker, flags = {}) => Object.freeze({
  redacted_receipt: buildReceipt({
    ...flags,
    decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.TERMINAL_ZERO_EFFECT,
    authorityPublicationAttempted: true,
    externalEffectPossible: false,
    retryForbiddenPermanently: true,
    blockerCodes: [blocker],
  }),
});

const validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt = (receipt) => {
  try {
    const value = exactObject(receipt, RECEIPT_FIELDS);
    if (!value || !Array.isArray(value.blocker_codes)) return Object.freeze({ ok: false });
    const confirmed = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.CONFIRMED;
    const unknown = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.UNKNOWN;
    const terminalZeroDecision = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.TERMINAL_ZERO_EFFECT;
    const blockedDecision = value.decision
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.BLOCKED;
    const valid = value.receipt_schema_version
        === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_RECEIPT_SCHEMA_VERSION
      && value.runner_contract_version
        === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_CONTRACT_VERSION
      && value.redaction_status
        === 'aggregate_allowlist_only_no_private_values_paths_ids_anchors_digests_or_timestamps'
      && (confirmed || unknown || terminalZeroDecision || blockedDecision)
      && [
        'audio_validated',
        'preclaim_start_gates_validated',
        'preclaim_observed',
        'preclaim_built',
        'authority_publication_attempted',
        'authority_published',
        'authority_opened',
        'operation_context_validated',
        'composite_invoked',
        'confirmation_proven',
        'external_effect_possible',
        'retry_forbidden_permanently',
      ].every((field) => typeof value[field] === 'boolean')
      && [
        'text_sent',
        'follow_back_invoked',
        'mailerlite_invoked',
        'campaign_touched',
      ].every((field) => value[field] === false)
      && (!value.preclaim_start_gates_validated || value.audio_validated)
      && (!value.preclaim_observed || value.preclaim_start_gates_validated)
      && (!value.preclaim_built || value.preclaim_observed)
      && (!value.authority_publication_attempted || value.preclaim_built)
      && (!value.authority_published || value.authority_publication_attempted)
      && (!value.authority_opened || value.authority_published)
      && (!value.operation_context_validated || value.authority_opened)
      && (!value.composite_invoked || value.operation_context_validated)
      && (!value.confirmation_proven || value.composite_invoked)
      && (!confirmed || (
        value.confirmation_proven
        && value.external_effect_possible
        && value.retry_forbidden_permanently
        && value.blocker_codes.length === 0
      ))
      && (!unknown || (
        !value.confirmation_proven
        && value.composite_invoked
        && value.external_effect_possible
        && value.retry_forbidden_permanently
        && value.blocker_codes.length === 0
      ))
      && (!terminalZeroDecision || (
        !value.confirmation_proven
        && value.authority_publication_attempted
        && !value.external_effect_possible
        && value.retry_forbidden_permanently
        && value.blocker_codes.length === 1
        && value.blocker_codes.every((code) => BLOCKERS.has(code))
      ))
      && (!blockedDecision || (
        !value.confirmation_proven
        && !value.authority_publication_attempted
        && !value.external_effect_possible
        && !value.retry_forbidden_permanently
        && value.blocker_codes.length === 1
        && value.blocker_codes.every((code) => BLOCKERS.has(code))
      ));
    return Object.freeze({ ok: valid });
  } catch {
    return Object.freeze({ ok: false });
  }
};

const commonCompositeInput = ({ draft, seed, bundle, opened, context }) => {
  const projection = draft.source_projection;
  const anchors = projection.anchors;
  const authorization = bundle.private_publisher_authorization;
  return {
    private_operation_context_capability: context.private_capability,
    private_authority_capability: opened.private_authority_capability,
    private_source_capability: opened.private_source_capability,
    private_audio_asset_capability: opened.private_audio_asset_capability,
    private_target_binding_capability: context.private_target_binding_capability,
    exact_target: projection.notification_row.exact_target_utf8,
    exact_bound_thread_reference: projection.thread.bound_thread_reference_utf8,
    exact_owner_account_reference: projection.owner.owner_account_reference_utf8,
    mission_id: draft.mission_id,
    contract_version: draft.contract_version,
    expected_mission_contract_sha256: seed.mission_contract_sha256,
    expected_active_next_action_id: seed.active_next_action_id,
    expected_active_next_action_sha256: seed.active_next_action_sha256,
    expected_approval_packet_id: seed.approval_packet_id,
    expected_authorization_id: draft.authorization_id,
    expected_operation_id: draft.operation_id,
    expected_central_repo_head: draft.central_repo_head,
    expected_canonical_operation_sha256:
      bundle.private_operation_snapshot.canonical_operation_sha256,
    expected_draft_sha256: authorization.expected_draft_sha256,
    expected_projection_sha256: authorization.expected_projection_sha256,
    expected_source_mission_id: draft.source_mission_id,
    expected_source_evidence_schema_version: projection.schema_version,
    expected_source_evidence_sha256: projection.source_evidence_sha256,
    expected_source_record_ordinal: projection.notification_row.row_ordinal,
    expected_source_record_cap: 8,
    evidence_observed_at: projection.dedupe.checked_at,
    expected_source_evidence_anchor_sha256: anchors.source_evidence_anchor_sha256,
    expected_profile_anchor_sha256: anchors.profile_anchor_sha256,
    identity_anchor_sha256: anchors.candidate_anchor_sha256,
    expected_thread_anchor_sha256: anchors.thread_anchor_sha256,
    expected_owner_anchor_sha256: anchors.owner_anchor_sha256,
    expected_dedupe_anchor_sha256: anchors.dedupe_anchor_sha256,
    expected_approved_audio_asset_id: draft.approved_audio_asset_id,
    expected_audio_sha256: draft.approved_audio_sha256,
    candidate_cap: 1,
    claim_cap: 1,
    pending_cap: 1,
    upload_cap: 1,
    send_cap: 1,
    retry_cap: 0,
    exact_follow_timestamp_claimed: false,
    provider_event_id_claimed: false,
    campaign_membership_claimed: false,
  };
};

const runInternal = async ({ input, synthetic }) => {
  const nowMs = synthetic ? input.now_ms : Date.now();
  let draft;
  let seed;
  try {
    draft = snapshotPlainData(input.private_draft);
    seed = snapshotPlainData(input.private_authorization_seed);
  } catch {
    return blocked(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.INPUT_INVALID);
  }
  if (validateWelcomeAudioUiAttestedCanaryPacketDraft(draft, { now_ms: nowMs }).ok !== true) {
    return blocked(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.DRAFT_INVALID);
  }
  const seedAdmission = synthetic
    ? admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnceForTest({
      private_authorization_seed: seed,
      private_draft: draft,
      now_ms: nowMs,
    })
    : admitWelcomeAudioUiAttestedLiveAuthorizationSeedOnce({
      private_authorization_seed: seed,
      private_draft: draft,
    });
  if (!seedAdmission) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.AUTHORIZATION_SEED_INVALID,
  );

  const asset = await validateApprovedWelcomeAudioAsset({
    asset_path: seed.approved_audio_asset_path,
    expected_audio_sha256: draft.approved_audio_sha256,
  });
  if (
    !asset.private_capability
    || validateWelcomeAudioLivePreflightReceipt(asset.redacted_receipt).ok !== true
    || asset.redacted_receipt.decision !== WELCOME_AUDIO_LIVE_PREFLIGHT_DECISION.VALID
  ) return blocked(WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.AUDIO_INVALID);
  const projection = draft.source_projection;
  const observationGateInput = {
    private_audio_asset_capability: asset.private_capability,
    exact_target: projection.notification_row.exact_target_utf8,
    exact_bound_thread_reference: projection.thread.bound_thread_reference_utf8,
    exact_owner_account_reference: projection.owner.owner_account_reference_utf8,
    approved_audio_asset_path: seed.approved_audio_asset_path,
    expected_audio_sha256: draft.approved_audio_sha256,
    expected_central_repo_head: draft.central_repo_head,
    expected_mission_contract_sha256: seed.mission_contract_sha256,
    expected_active_next_action_id: seed.active_next_action_id,
    expected_active_next_action_sha256: seed.active_next_action_sha256,
  };
  let observation;
  try {
    observation = synthetic
      ? await observeWelcomeAudioSafariUiAttestedPreclaimOnceForTest({
        ...observationGateInput,
        driver: input.driver,
        authority_root: input.authority_root,
        private_store_capability: input.private_store_capability,
        synthetic_store_root: input.synthetic_store_root,
        now_ms: input.now_ms,
      })
      : await observeWelcomeAudioSafariUiAttestedPreclaimOnce(observationGateInput);
  } catch {
    observation = null;
  }
  if (
    !observation?.private_preclaim_observation_capability
    || validateWelcomeAudioSafariUiAttestedPreclaimObserverReceipt(
      observation.redacted_receipt,
    ).ok !== true
    || observation.redacted_receipt.start_gates_validated !== true
  ) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.OBSERVATION_INVALID,
    {
      audioValidated: true,
      preclaimStartGatesValidated:
        observation?.redacted_receipt?.start_gates_validated === true,
    },
  );

  const buildInput = {
    private_draft: draft,
    private_authorization_seed: seedAdmission,
    private_audio_asset_capability: asset.private_capability,
    private_preclaim_observation_capability:
      observation.private_preclaim_observation_capability,
  };
  const bundle = synthetic
    ? await buildWelcomeAudioUiAttestedPreclaimBundleForTest({
      ...buildInput,
      now_ms: input.now_ms,
    })
    : await buildWelcomeAudioUiAttestedPreclaimBundle(buildInput);
  if (
    !bundle.private_operation_snapshot
    || !bundle.private_publisher_authorization
    || validateWelcomeAudioUiAttestedPreclaimBuilderReceipt(bundle.redacted_receipt).ok !== true
  ) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.BUILDER_INVALID,
    {
      audioValidated: true,
      preclaimStartGatesValidated: true,
      preclaimObserved: true,
    },
  );

  let published;
  try {
    published = synthetic
      ? await publishSyntheticWelcomeAudioUiAttestedLiveAuthorityForTest({
        authority_root: input.authority_root,
        private_draft: draft,
        private_authorization: bundle.private_publisher_authorization,
        now_ms: input.now_ms,
      })
      : await publishFixedWelcomeAudioUiAttestedLiveAuthority({
        private_draft: draft,
        private_authorization: bundle.private_publisher_authorization,
      });
  } catch {
    published = null;
  }
  if (
    synthetic
    && input.synthetic_runner_fault_scenario
      === WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST
        .AUTHORITY_PUBLICATION_RESULT_LOST
  ) published = null;
  if (
    !published?.private_authority_envelope
    || validateWelcomeAudioUiAttestedLiveAuthorityPublisherReceipt(
      published.redacted_receipt,
    ).ok !== true
  ) return terminalZeroEffect(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.AUTHORITY_PUBLICATION_INVALID,
    {
      audioValidated: true,
      preclaimStartGatesValidated: true,
      preclaimObserved: true,
      preclaimBuilt: true,
    },
  );

  let opened;
  try {
    opened = synthetic
      ? await createSyntheticWelcomeAudioUiAttestedLiveAuthorityCapability({
        authority_root: input.authority_root,
        expected_central_repo_head: draft.central_repo_head,
        expected_mission_contract_sha256: seed.mission_contract_sha256,
        expected_active_next_action_id: seed.active_next_action_id,
        expected_active_next_action_sha256: seed.active_next_action_sha256,
        now_ms: input.now_ms,
      })
      : await openFixedWelcomeAudioUiAttestedLiveAuthority();
  } catch {
    opened = null;
  }
  if (
    !opened?.private_authority_capability
    || !opened.private_source_capability
    || !opened.private_audio_asset_capability
    || validateWelcomeAudioUiAttestedLiveAuthorityReceipt(opened.redacted_receipt).ok !== true
  ) return terminalZeroEffect(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.AUTHORITY_OPEN_INVALID,
    {
      audioValidated: true,
      preclaimStartGatesValidated: true,
      preclaimObserved: true,
      preclaimBuilt: true,
      authorityPublished: true,
    },
  );

  let context;
  try {
    context = await validateWelcomeAudioUiAttestedLiveOperationContext({
      operation_snapshot: bundle.private_operation_snapshot,
      private_authority_capability: opened.private_authority_capability,
      private_source_capability: opened.private_source_capability,
      private_audio_asset_capability: opened.private_audio_asset_capability,
      expected_canonical_operation_sha256:
        bundle.private_operation_snapshot.canonical_operation_sha256,
      now_ms: synthetic ? input.now_ms : null,
    });
  } catch {
    context = null;
  }
  if (
    !context?.private_capability
    || !context.private_target_binding_capability
    || validateWelcomeAudioUiAttestedLiveOperationContextReceipt(
      context.redacted_receipt,
    ).ok !== true
  ) return terminalZeroEffect(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.OPERATION_CONTEXT_INVALID,
    {
      audioValidated: true,
      preclaimStartGatesValidated: true,
      preclaimObserved: true,
      preclaimBuilt: true,
      authorityPublished: true,
      authorityOpened: true,
    },
  );

  const common = commonCompositeInput({ draft, seed, bundle, opened, context });
  let composite;
  try {
    composite = synthetic
      ? await runWelcomeAudioSafariUiAttestedSyntheticCompositeOnceForTest({
        ...common,
        private_store_capability: input.private_store_capability,
        driver: input.driver,
        approved_audio_asset_path: seed.approved_audio_asset_path,
        synthetic_store_root: input.synthetic_store_root,
        synthetic_claim_now_ms: input.synthetic_claim_now_ms,
        synthetic_prepare_now_ms: input.synthetic_prepare_now_ms,
        synthetic_pending_now_ms: input.synthetic_pending_now_ms,
        synthetic_entry_now_ms: input.synthetic_entry_now_ms,
        synthetic_preupload_now_ms: input.synthetic_preupload_now_ms,
        synthetic_attempted_at_ms: input.synthetic_attempted_at_ms,
        synthetic_confirmation_now_ms: input.synthetic_confirmation_now_ms,
        synthetic_terminal_now_ms: input.synthetic_terminal_now_ms,
        synthetic_fault_scenario: input.synthetic_fault_scenario,
      })
      : await runWelcomeAudioSafariUiAttestedLiveCompositeOnce({
        ...common,
        approved_audio_asset_path: seed.approved_audio_asset_path,
      });
  } catch {
    return Object.freeze({
      redacted_receipt: buildReceipt({
        decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.UNKNOWN,
        audioValidated: true,
        preclaimStartGatesValidated: true,
        preclaimObserved: true,
        preclaimBuilt: true,
        authorityPublicationAttempted: true,
        authorityPublished: true,
        authorityOpened: true,
        operationContextValidated: true,
        compositeInvoked: true,
        externalEffectPossible: true,
        retryForbiddenPermanently: true,
      }),
    });
  }
  if (validateWelcomeAudioSafariUiAttestedLiveCompositeReceipt(
    composite?.redacted_receipt,
  ).ok !== true) return Object.freeze({
    redacted_receipt: buildReceipt({
      decision: WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.UNKNOWN,
      audioValidated: true,
      preclaimStartGatesValidated: true,
      preclaimObserved: true,
      preclaimBuilt: true,
      authorityPublicationAttempted: true,
      authorityPublished: true,
      authorityOpened: true,
      operationContextValidated: true,
      compositeInvoked: true,
      externalEffectPossible: true,
      retryForbiddenPermanently: true,
    }),
  });
  if (composite.redacted_receipt.decision
    === WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.BLOCKED_ZERO_EFFECT) {
    return terminalZeroEffect(
      WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.COMPOSITE_INVALID,
      {
        audioValidated: true,
        preclaimStartGatesValidated: true,
        preclaimObserved: true,
        preclaimBuilt: true,
        authorityPublished: true,
        authorityOpened: true,
        operationContextValidated: true,
        compositeInvoked: true,
        externalEffectPossible: false,
        retryForbiddenPermanently:
          composite.redacted_receipt.retry_forbidden_permanently,
      },
    );
  }
  const confirmed = composite.redacted_receipt.decision
    === WELCOME_AUDIO_SAFARI_LIVE_COMPOSITE_DECISION.CONFIRMED
    && composite.redacted_receipt.confirmation_proven === true;
  const resultReceipt = buildReceipt({
    decision: confirmed
      ? WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.CONFIRMED
      : WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION.UNKNOWN,
    audioValidated: true,
    preclaimStartGatesValidated: true,
    preclaimObserved: true,
    preclaimBuilt: true,
    authorityPublicationAttempted: true,
    authorityPublished: true,
    authorityOpened: true,
    operationContextValidated: true,
    compositeInvoked: true,
    confirmationProven: confirmed,
    externalEffectPossible: composite.redacted_receipt.external_effect_possible,
    retryForbiddenPermanently: composite.redacted_receipt.retry_forbidden_permanently,
  });
  return Object.freeze({ redacted_receipt: resultReceipt });
};

const runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce = async (parameters = {}) => {
  const input = exactObject(parameters, LIVE_FIELDS);
  if (!input) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.INPUT_INVALID,
  );
  return runInternal({ input, synthetic: false });
};

const runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest = async (
  parameters = {},
) => {
  const input = exactObject(parameters, SYNTHETIC_FIELDS);
  if (
    !input
    || !Number.isFinite(input.now_ms)
    || input.now_ms < 0
    || !Object.values(
      WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST,
    ).includes(input.synthetic_runner_fault_scenario)
  ) return blocked(
    WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER.INPUT_INVALID,
  );
  return runInternal({ input, synthetic: true });
};

export {
  RECEIPT_FIELDS as WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_RECEIPT_FIELDS,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_BLOCKER,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_CONTRACT_VERSION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_DECISION,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_FAULT_SCENARIO_FOR_TEST,
  WELCOME_AUDIO_UI_ATTESTED_LIVE_CANARY_RUNNER_RECEIPT_SCHEMA_VERSION,
  runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce,
  runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest,
  validateWelcomeAudioUiAttestedLiveCanaryRunnerReceipt,
};
