import {
  WELCOME_AUDIO_SAFARI_DETERMINISTIC_SCENARIO,
  WELCOME_AUDIO_SAFARI_OPERATIONAL_EXECUTION_MODE,
  createWelcomeAudioSafariActuatorPort,
  registerWelcomeAudioSafariOperationAuthorityState,
} from './crm-vnext-instagram-welcome-audio-safari-operational-executor.mjs';

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

const WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS = Object.freeze([
  'expected_canonical_operation_sha256',
  'thread_anchor_sha256',
  'approved_audio_asset_sha256',
  'session_revision',
  'preview_observed_at',
]);

const AUTHORITY_STATE = new WeakMap();

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
  return Object.freeze({
    branded_safari_actuator_port: brandedSafariActuatorPort,
    prepared_session_authority: preparedSessionAuthority,
  });
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
  WELCOME_AUDIO_SAFARI_OPERATION_AUTHORITY_STATUS,
  WELCOME_AUDIO_SAFARI_OPERATION_BINDING_FIELDS,
  WELCOME_AUDIO_SAFARI_OPERATION_PORT_CONTRACT_VERSION,
  consumeWelcomeAudioSafariOperationAuthority,
  createWelcomeAudioSafariOperationPort,
  reserveWelcomeAudioSafariOperationAuthority,
  verifyReservedWelcomeAudioSafariOperationAuthority,
  wasWelcomeAudioSafariOperationAuthorityConsumedByCurrentInvocation,
};
