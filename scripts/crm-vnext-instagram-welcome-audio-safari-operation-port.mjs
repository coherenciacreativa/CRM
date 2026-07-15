import { types as nodeUtilTypes } from 'node:util';

import {
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS,
  WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION,
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  createWelcomeAudioSafariActuatorPort,
  registerWelcomeAudioSafariDeferredActuatorRendezvousState,
  registerWelcomeAudioSafariOperationAuthorityState,
} from './crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs';
import {
  WELCOME_AUDIO_CONFIRMATION_MARKER,
} from './crm-vnext-instagram-welcome-audio-operation-guard.mjs';

const WELCOME_AUDIO_SAFARI_OPERATION_PORT_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_safari_operation_port_v1';

const WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS = Object.freeze({
  RESERVED_NOW: 'reserved_now',
  RESERVED: 'reserved',
  CONSUMED_NOW: 'consumed_now',
  ALREADY_USED: 'already_used',
  BINDING_DRIFT: 'binding_drift',
  INVALID: 'invalid',
});

const WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS = Object.freeze({
  FRESH: 'fresh',
  ARMED: 'armed',
  RESOLVED: 'resolved',
  CONSUMED: 'consumed',
  TIMED_OUT: 'timed_out',
  REJECTED: 'rejected',
  RESOLVED_NOW: 'resolved_now',
  INVALID: 'invalid',
  EARLY: 'early_resolution_rejected',
  ALREADY_USED: 'already_used',
  BINDING_DRIFT: 'binding_drift',
  RESULT_INVALID: 'result_invalid',
  RESULT_MISMATCHED: 'result_mismatched',
  LATE: 'late_resolution_rejected',
});

const WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS = Object.freeze([
  'expected_canonical_operation_sha256',
  'thread_anchor_sha256',
  'approved_audio_asset_sha256',
  'session_revision',
  'preview_observed_at',
]);

const AUTHORITY_STATE = new WeakMap();
const DEFERRED_RENDEZVOUS_AUTHORITY_STATE = new WeakMap();

const exactObjectKeys = (value, expected) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length
    && actual.every((key, index) => key === sorted[index]);
};

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const isCanonicalIso = (value) => typeof value === 'string'
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;

const isValidBinding = (binding) => exactObjectKeys(
  binding,
  WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS,
)
  && isSha256(binding.expected_canonical_operation_sha256)
  && isSha256(binding.thread_anchor_sha256)
  && isSha256(binding.approved_audio_asset_sha256)
  && Number.isSafeInteger(binding.session_revision)
  && binding.session_revision >= 1
  && isCanonicalIso(binding.preview_observed_at);

const copyBinding = (binding) => Object.freeze({
  expected_canonical_operation_sha256: binding.expected_canonical_operation_sha256,
  thread_anchor_sha256: binding.thread_anchor_sha256,
  approved_audio_asset_sha256: binding.approved_audio_asset_sha256,
  session_revision: binding.session_revision,
  preview_observed_at: binding.preview_observed_at,
});

const sameBinding = (actual, expected) => isValidBinding(actual)
  && WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS.every(
    (field) => actual[field] === expected[field],
  );

const snapshotDataOnlyDeferredActuatorResult = (value) => {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || nodeUtilTypes.isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Reflect.ownKeys(descriptors);
  if (
    actualKeys.some((key) => typeof key !== 'string')
    || actualKeys.length !== WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS.length
    || !WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS.every((field) => {
      const descriptor = descriptors[field];
      return descriptor
        && descriptor.enumerable === true
        && descriptor.get === undefined
        && descriptor.set === undefined
        && Object.prototype.hasOwnProperty.call(descriptor, 'value');
    })
  ) return null;
  return Object.freeze(Object.fromEntries(
    WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_FIELDS.map(
      (field) => [field, descriptors[field].value],
    ),
  ));
};

const isValidDeferredActuatorResultSnapshot = (result) =>
  result.result_schema_version === WELCOME_AUDIO_SAFARI_ACTUATOR_RESULT_SCHEMA_VERSION
  && typeof result.bound_to_current_operation === 'boolean'
  && typeof result.effect_boundary_entered === 'boolean'
  && Number.isInteger(result.send_control_actuation_count)
  && result.send_control_actuation_count >= 0
  && result.send_control_actuation_count <= 1
  && (
    (
      result.effect_boundary_entered === false
      && result.send_control_actuation_count === 0
    )
    || (
      result.effect_boundary_entered === true
      && result.send_control_actuation_count >= 1
    )
  )
  && isCanonicalIso(result.attempted_at)
  && isCanonicalIso(result.confirmation_checked_at)
  && Date.parse(result.confirmation_checked_at) >= Date.parse(result.attempted_at)
  && (
    result.effect_boundary_entered === true
    || result.confirmation_marker === WELCOME_AUDIO_CONFIRMATION_MARKER.NONE
  )
  && Object.values(WELCOME_AUDIO_CONFIRMATION_MARKER).includes(result.confirmation_marker);

const createPreparedSessionAuthority = ({ port, binding }) => {
  const authority = Object.create(null);
  Object.defineProperties(authority, {
    session_authority_marker: {
      value: Symbol('crm_core_welcome_audio_prepared_session_authority'),
      enumerable: true,
    },
    toJSON: {
      value: () => {
        throw new TypeError('prepared_session_authority_not_serializable');
      },
      enumerable: false,
    },
  });
  Object.freeze(authority);
  const authorityState = {
    port,
    binding: copyBinding(binding),
    phase: 'fresh',
    consumed_by: null,
  };
  AUTHORITY_STATE.set(authority, authorityState);
  registerWelcomeAudioSafariOperationAuthorityState({
    port,
    authorityState,
  });
  return authority;
};

const createDeferredActuatorRendezvousAuthority = ({ port, binding }) => {
  const authority = Object.create(null);
  Object.defineProperties(authority, {
    rendezvous_authority_marker: {
      value: Symbol('crm_core_welcome_audio_deferred_actuator_rendezvous_authority'),
      enumerable: true,
    },
    toJSON: {
      value: () => {
        throw new TypeError('deferred_actuator_rendezvous_authority_not_serializable');
      },
      enumerable: false,
    },
  });
  Object.freeze(authority);
  const rendezvousState = {
    port,
    binding: copyBinding(binding),
    phase: 'fresh',
    armed_at_ms: null,
    result: null,
    result_promise: null,
    resolve_waiter: null,
    rejection_status: null,
  };
  DEFERRED_RENDEZVOUS_AUTHORITY_STATE.set(authority, rendezvousState);
  registerWelcomeAudioSafariDeferredActuatorRendezvousState({
    port,
    rendezvousState,
  });
  return authority;
};

const createWelcomeAudioSafariOperationPort = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'execution_mode',
    'deterministic_scenario',
    'binding',
  ])) throw new TypeError(WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID);
  const {
    execution_mode,
    deterministic_scenario,
    binding,
  } = parameters;
  if (
    execution_mode !== WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE
    || !Object.values(WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO)
      .includes(deterministic_scenario)
    || !isValidBinding(binding)
  ) throw new TypeError(WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID);

  const brandedSafariActuatorPort = createWelcomeAudioSafariActuatorPort({
    execution_mode,
    deterministic_scenario,
  });
  const preparedSessionAuthority = createPreparedSessionAuthority({
    port: brandedSafariActuatorPort,
    binding,
  });
  const deferredActuatorRendezvousAuthority = createDeferredActuatorRendezvousAuthority({
    port: brandedSafariActuatorPort,
    binding,
  });
  return Object.freeze({
    branded_safari_actuator_port: brandedSafariActuatorPort,
    prepared_session_authority: preparedSessionAuthority,
    deferred_actuator_rendezvous_authority: deferredActuatorRendezvousAuthority,
  });
};

const getWelcomeAudioSafariDeferredActuatorRendezvousStatus = ({
  deferred_actuator_rendezvous_authority,
  branded_safari_actuator_port,
} = {}) => {
  const state = DEFERRED_RENDEZVOUS_AUTHORITY_STATE.get(
    deferred_actuator_rendezvous_authority,
  );
  if (!state || state.port !== branded_safari_actuator_port) {
    return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
  }
  return ({
    fresh: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.FRESH,
    armed: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ARMED,
    resolved: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED,
    consumed: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.CONSUMED,
    timed_out: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.TIMED_OUT,
    rejected: WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.REJECTED,
  })[state.phase] ?? WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
};

const rejectDeferredActuatorRendezvous = (state, status) => {
  const waiter = state.resolve_waiter;
  state.phase = 'rejected';
  state.rejection_status = status;
  state.result = null;
  if (typeof waiter === 'function') waiter(null);
  return status;
};

const resolveWelcomeAudioSafariDeferredActuatorRendezvous = (parameters = {}) => {
  if (!exactObjectKeys(parameters, [
    'deferred_actuator_rendezvous_authority',
    'branded_safari_actuator_port',
    'current_binding',
    'actuator_result',
  ])) return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
  const state = DEFERRED_RENDEZVOUS_AUTHORITY_STATE.get(
    parameters.deferred_actuator_rendezvous_authority,
  );
  if (!state || state.port !== parameters.branded_safari_actuator_port) {
    return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
  }
  if (state.phase === 'fresh') {
    return rejectDeferredActuatorRendezvous(
      state,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.EARLY,
    );
  }
  if (state.phase === 'timed_out') {
    return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.LATE;
  }
  if (['resolved', 'consumed', 'rejected'].includes(state.phase)) {
    return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.ALREADY_USED;
  }
  if (state.phase !== 'armed' || typeof state.resolve_waiter !== 'function') {
    return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.INVALID;
  }
  if (!sameBinding(parameters.current_binding, state.binding)) {
    return rejectDeferredActuatorRendezvous(
      state,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.BINDING_DRIFT,
    );
  }
  const actuatorResultSnapshot = snapshotDataOnlyDeferredActuatorResult(
    parameters.actuator_result,
  );
  if (
    actuatorResultSnapshot === null
    || !isValidDeferredActuatorResultSnapshot(actuatorResultSnapshot)
  ) {
    return rejectDeferredActuatorRendezvous(
      state,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_INVALID,
    );
  }
  if (
    actuatorResultSnapshot.bound_to_current_operation !== true
    || Date.parse(actuatorResultSnapshot.attempted_at) !== state.armed_at_ms
  ) {
    return rejectDeferredActuatorRendezvous(
      state,
      WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESULT_MISMATCHED,
    );
  }
  const waiter = state.resolve_waiter;
  state.phase = 'resolved';
  state.result = actuatorResultSnapshot;
  waiter(state.result);
  return WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS.RESOLVED_NOW;
};

const reserveWelcomeAudioSafariOperationAuthority = ({
  prepared_session_authority,
  branded_safari_actuator_port,
  current_binding,
}) => {
  const state = AUTHORITY_STATE.get(prepared_session_authority);
  if (!state || state.port !== branded_safari_actuator_port) {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID;
  }
  if (state.phase !== 'fresh') {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED;
  }
  if (!sameBinding(current_binding, state.binding)) {
    state.phase = 'consumed';
    state.consumed_by = 'session';
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.BINDING_DRIFT;
  }
  state.phase = 'reserved';
  return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.RESERVED_NOW;
};

const verifyReservedWelcomeAudioSafariOperationAuthority = ({
  prepared_session_authority,
  branded_safari_actuator_port,
  current_binding,
}) => {
  const state = AUTHORITY_STATE.get(prepared_session_authority);
  if (!state || state.port !== branded_safari_actuator_port) {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID;
  }
  if (state.phase !== 'reserved') {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED;
  }
  if (!sameBinding(current_binding, state.binding)) {
    state.phase = 'consumed';
    state.consumed_by = 'session';
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.BINDING_DRIFT;
  }
  return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.RESERVED;
};

const consumeWelcomeAudioSafariOperationAuthority = ({
  prepared_session_authority,
  branded_safari_actuator_port,
  consumed_by_current_invocation = false,
}) => {
  const state = AUTHORITY_STATE.get(prepared_session_authority);
  if (!state || state.port !== branded_safari_actuator_port) {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.INVALID;
  }
  if (state.phase === 'consumed') {
    return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.ALREADY_USED;
  }
  state.phase = 'consumed';
  state.consumed_by = consumed_by_current_invocation ? 'session' : 'external';
  return WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS.CONSUMED_NOW;
};

const wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation = ({
  prepared_session_authority,
  branded_safari_actuator_port,
}) => {
  const state = AUTHORITY_STATE.get(prepared_session_authority);
  return Boolean(
    state
    && state.port === branded_safari_actuator_port
    && state.phase === 'consumed'
    && ['executor', 'session'].includes(state.consumed_by),
  );
};

export {
  WELCOME_AUDIO_SAFARI_DEFERRED_RENDEZVOUS_STATUS,
  WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS,
  WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS,
  WELCOME_AUDIO_SAFARI_OPERATION_PORT_CONTRACT_VERSION,
  consumeWelcomeAudioSafariOperationAuthority,
  createWelcomeAudioSafariOperationPort,
  getWelcomeAudioSafariDeferredActuatorRendezvousStatus,
  reserveWelcomeAudioSafariOperationAuthority,
  resolveWelcomeAudioSafariDeferredActuatorRendezvous,
  verifyReservedWelcomeAudioSafariOperationAuthority,
  wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation,
};
