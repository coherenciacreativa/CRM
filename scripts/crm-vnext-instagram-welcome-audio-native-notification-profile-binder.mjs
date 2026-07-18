import { types as nodeUtilTypes } from 'node:util';

const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_CONTRACT_VERSION =
  'crm_core_instagram_welcome_audio_native_notification_profile_binder_v1';
const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_SCHEMA_VERSION =
  'crm_core_instagram_welcome_audio_native_notification_profile_binder_receipt_v1';
const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_ACTIVATION_TTL_MS = 5 * 60 * 1000;
const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_ROWS = 8;
const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_AX_BYTES = 256 * 1024;
const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_AX_RECORDS = 4_096;

const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE = Object.freeze({
  PREPARE: 'prepare_native_notification_profile_binding',
  CONFIRM: 'confirm_native_notification_profile_binding',
});

const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION = Object.freeze({
  PREPARED: 'native_notification_profile_activation_prepared',
  CONFIRMED: 'native_notification_profile_binding_confirmed',
  BLOCKED: 'native_notification_profile_binding_blocked',
});

const WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER = Object.freeze({
  INPUT_INVALID: 'blocked_native_notification_profile_input_invalid',
  AX_INVALID: 'blocked_native_notification_profile_ax_invalid',
  SURFACE_INVALID: 'blocked_native_notification_profile_surface_invalid',
  PRIVATE_BROWSING: 'blocked_native_notification_profile_private_browsing',
  AUTH_OR_CHALLENGE: 'blocked_native_notification_profile_auth_or_challenge_visible',
  NOTIFICATIONS_INVALID: 'blocked_native_notification_profile_notifications_invalid',
  ROW_INVALID: 'blocked_native_notification_profile_row_invalid',
  PROFILE_LINK_INVALID: 'blocked_native_notification_profile_link_invalid',
  FOLLOWER_SEMANTICS_INVALID: 'blocked_native_notification_profile_follower_semantics_invalid',
  TIME_BUCKET_INVALID: 'blocked_native_notification_profile_time_bucket_invalid',
  ACTIVATION_INVALID: 'blocked_native_notification_profile_activation_invalid',
  ACTIVATION_STALE: 'blocked_native_notification_profile_activation_stale',
  SURFACE_DRIFT: 'blocked_native_notification_profile_surface_drift',
  PROFILE_ADDRESS_MISMATCH: 'blocked_native_notification_profile_address_mismatch',
  PROFILE_IDENTITY_INVALID: 'blocked_native_notification_profile_identity_invalid',
});

const RECEIPT_FIELDS = Object.freeze([
  'receipt_schema_version',
  'binder_contract_version',
  'redaction_status',
  'stage',
  'decision',
  'standard_safari',
  'isolated_surface',
  'notifications_heading_bound',
  'selected_row_bound',
  'native_profile_link_bound',
  'follower_semantics_bound',
  'visible_time_bucket_bound',
  'exact_profile_address_bound',
  'unique_profile_identity_bound',
  'capability_issued',
  'live_authority',
  'browser_used',
  'network_used',
  'external_effect_invoked',
  'blocker_codes',
]);

const METADATA_FIELDS = Object.freeze([
  'row_ordinal',
  'exact_target_utf8',
  'visible_time_bucket_utf8',
  'notification_attested_at',
  'profile_attested_at',
]);

const BLOCKERS = new Set(Object.values(
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER,
));
const STAGES = new Set(Object.values(
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE,
));
const DECISIONS = new Set(Object.values(
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION,
));

const ACTIVATION_STATES = new WeakMap();
const BINDING_STATES = new WeakMap();

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

const exactArray = (value) => {
  if (!Array.isArray(value) || nodeUtilTypes.isProxy(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== 'string')
    || descriptors.length?.get
    || descriptors.length?.set
    || keys.some((key) => key !== 'length'
      && (!/^(?:0|[1-9][0-9]*)$/u.test(key)
        || descriptors[key].get
        || descriptors[key].set))
  ) return null;
  return Object.freeze([...value]);
};

const cleanAxText = (value) => typeof value === 'string'
  && value.length > 0
  && Buffer.byteLength(value, 'utf8') <= WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_AX_BYTES
  && !value.includes('\u0000');

const validNow = (value) => Number.isSafeInteger(value)
  && value >= 0
  && value <= 8_640_000_000_000_000;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseRecords = (text) => {
  const lines = text.split(/\r?\n/u);
  if (lines.length > WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_AX_RECORDS) return null;
  const records = [];
  const stack = [];
  let hierarchyValid = true;
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const raw = lines[lineNumber];
    if (raw.trim().length === 0) continue;
    const leading = raw.match(/^[ \t]*/u)?.[0] ?? '';
    const depth = [...leading].reduce((total, character) => (
      total + (character === '\t' ? 2 : 1)
    ), 0);
    const rest = raw.slice(leading.length);
    const match = rest.match(
      /^(?:(?:\[(\d+)\]|(\d+)(?:[.:])?)\s+)?(selected\s+tab|pinned\s+tab|tab|application|navigation|list|group|toolbar|link|button|image|heading|text)\b(.*)$/u,
    );
    if (!match) {
      while (stack.length > 0 && records[stack.at(-1)].depth >= depth) stack.pop();
      if (depth > 0) hierarchyValid = false;
      continue;
    }
    while (stack.length > 0 && records[stack.at(-1)].depth >= depth) stack.pop();
    const parsedIndex = Number.parseInt(match[1] ?? match[2] ?? '', 10);
    const rolePhrase = match[3];
    const record = Object.freeze({
      line_number: lineNumber,
      depth,
      role: rolePhrase.endsWith('tab') ? 'tab' : rolePhrase,
      body: match[4].replace(/^\s+/u, ''),
      element_index: Number.isSafeInteger(parsedIndex) && parsedIndex >= 0
        ? parsedIndex
        : null,
      parent_position: stack.at(-1) ?? null,
    });
    records.push(record);
    stack.push(records.length - 1);
  }
  if (!hierarchyValid || records.length === 0) return null;
  const indexed = records.filter((record) => Number.isSafeInteger(record.element_index));
  if (new Set(indexed.map((record) => record.element_index)).size !== indexed.length) return null;
  return Object.freeze(records);
};

const primaryLabel = (record) => record.body
  .split(/,\s+(?:url|position|description|value|placeholder|enabled|selected|id)\b/iu, 1)[0]
  .trim();

const structuredFieldValues = (record, field) => Object.freeze([
  ...record.body.matchAll(new RegExp(
    `(?:^|,\\s*|\\s+)${escapeRegExp(field)}(?:\\s*[:=]\\s*|\\s+)([^,\\r\\n]*)`,
    'giu',
  )),
].map((match) => match[1].trim()));

const structuredField = (record, field) => {
  const values = structuredFieldValues(record, field);
  return values.length === 1 ? values[0] : null;
};

const nativeTabState = (record) => {
  if (record.role !== 'tab' || !Number.isSafeInteger(record.element_index)) return null;
  const pinned = record.body.match(/(?:[?&])isPinned=(true|false)(?:&|\b)/u)?.[1];
  const active = record.body.match(/(?:[?&])isActive=(true|false)(?:&|\b)/u)?.[1];
  if (pinned === undefined || active === undefined) return null;
  return Object.freeze({ pinned: pinned === 'true', active: active === 'true' });
};

const isNeutralTab = (record) => record.body.includes('file:///tmp/crm_core_computer_use_preflight.html')
  || /(?:^|[\s"'(),:=])Neutral UI Preflight(?=$|[\s"'(),:=])/u.test(record.body);

const isAddressField = (record) => record.role === 'text'
  && Number.isSafeInteger(record.element_index)
  && /^field\s+\(settable, string\)(?:\s|$)/u.test(record.body)
  && structuredField(record, 'Description') === 'smart search field'
  && structuredField(record, 'ID') === 'WEB_BROWSER_ADDRESS_AND_SEARCH_FIELD';

const parseCanonicalInstagramProfileAddress = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^https:\/\/www\.instagram\.com\/([A-Za-z0-9._]{1,30})\/$/u);
  if (!match) return null;
  const exactTarget = match[1];
  const reserved = new Set([
    'about', 'accounts', 'challenge', 'checkpoint', 'developer', 'direct',
    'directory', 'explore', 'legal', 'p', 'privacy', 'reel', 'reels',
    'stories', 'terms', 'tv', 'web',
  ]);
  if (reserved.has(exactTarget.toLowerCase())) return null;
  return Object.freeze({
    exact_url: value,
    exact_target: exactTarget,
  });
};

const exactNativeProfileLinkTarget = (record) => {
  if (record.role !== 'link' || !Number.isSafeInteger(record.element_index)) return null;
  const exactTarget = primaryLabel(record);
  if (!/^[A-Za-z0-9._]{1,30}$/u.test(exactTarget)) return null;
  const reserved = new Set([
    'about', 'accounts', 'challenge', 'checkpoint', 'developer', 'direct',
    'directory', 'explore', 'legal', 'p', 'privacy', 'reel', 'reels',
    'stories', 'terms', 'tv', 'web',
  ]);
  if (reserved.has(exactTarget.toLowerCase())) return null;
  return Object.freeze({
    exact_target: exactTarget,
    element_index: record.element_index,
  });
};

const exactFollowerEventObservation = (record) => {
  if (!['text', 'heading'].includes(record.role)) return null;
  const label = primaryLabel(record);
  const match = label.match(new RegExp(
    '^(?:([A-Za-z0-9._]{1,30})\\s+)?(?:started following you|started to follow you|is now following you|comenz[oó] a seguirte|empez[oó] a seguirte|te empez[oó] a seguir)\\.\\s+((?:3|4|5|6|7)\\s*(?:d|day|days|d[ií]a|d[ií]as))$',
    'iu',
  ));
  if (!match) return null;
  return Object.freeze({
    optional_target_prefix: match[1] ?? null,
    visible_time_bucket: match[2],
  });
};

const hasAuthOrChallenge = (records) => records.some((record) => {
  const label = primaryLabel(record);
  return /^(?:Log in|Sign in|Iniciar sesi[oó]n|Challenge required|Checkpoint|Security code|Captcha|Try again)$/iu.test(label)
    || /(?:instagram\.com\/(?:accounts\/login|challenge|checkpoint)\/)/iu.test(record.body);
});

const descendants = (records, rootPosition) => {
  const root = records[rootPosition];
  const end = records.findIndex((record, position) => (
    position > rootPosition && record.depth <= root.depth
  ));
  return records.slice(rootPosition, end === -1 ? records.length : end);
};

const nearestParentPosition = (records, position, roles) => {
  let parent = records[position].parent_position;
  while (parent !== null) {
    if (roles.includes(records[parent].role)) return parent;
    parent = records[parent].parent_position;
  }
  return null;
};

const inspectSurface = (records, exactAddress = null) => {
  const applications = records.filter((record) => record.role === 'application');
  const privateBrowsing = applications.some((record) => /private browsing/iu.test(record.body));
  const nativeTabs = records
    .map((record) => ({ record, state: nativeTabState(record) }))
    .filter(({ state }) => state !== null);
  const regularTabs = nativeTabs.filter(({ state }) => state.pinned === false);
  const activeRegularTabs = regularTabs.filter(({ state }) => state.active === true);
  const neutralTabs = regularTabs.filter(({ record, state }) => (
    state.active === false && isNeutralTab(record)
  ));
  const addressFields = records.filter(isAddressField);
  const addressMatches = exactAddress === null
    ? addressFields.filter((record) => {
      const value = structuredField(record, 'Value');
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:'
          && parsed.hostname === 'www.instagram.com'
          && parsed.username === ''
          && parsed.password === '';
      } catch {
        return false;
      }
    })
    : addressFields.filter((record) => structuredField(record, 'Value') === exactAddress);
  const isolated = applications.length === 1
    && regularTabs.length === 2
    && activeRegularTabs.length === 1
    && neutralTabs.length === 1
    && addressFields.length === 1;
  return Object.freeze({
    standard_safari: applications.length === 1 && nativeTabs.length >= 2,
    private_browsing: privateBrowsing,
    isolated_surface: isolated,
    exact_address_bound: addressMatches.length === 1,
    active_tab_index: activeRegularTabs[0]?.record.element_index ?? null,
    neutral_tab_index: neutralTabs[0]?.record.element_index ?? null,
  });
};

const inspectNotificationAx = ({ rawText, rowOrdinal }) => {
  const records = parseRecords(rawText);
  if (!records) return Object.freeze({ blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AX_INVALID });
  const surface = inspectSurface(records, 'https://www.instagram.com/');
  if (surface.private_browsing) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PRIVATE_BROWSING,
    surface,
  });
  if (hasAuthOrChallenge(records)) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AUTH_OR_CHALLENGE,
    surface,
  });
  if (!surface.isolated_surface || !surface.exact_address_bound) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_INVALID,
    surface,
  });
  const notificationHeadings = records
    .map((record, position) => ({ record, position }))
    .filter(({ record }) => record.role === 'heading'
      && /^(?:Notifications|Notificaciones)$/u.test(primaryLabel(record)));
  if (notificationHeadings.length !== 1) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.NOTIFICATIONS_INVALID,
    surface,
  });
  const panelPosition = nearestParentPosition(
    records,
    notificationHeadings[0].position,
    ['group', 'list', 'navigation'],
  );
  if (panelPosition === null) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.NOTIFICATIONS_INVALID,
    surface,
  });
  const panel = descendants(records, panelPosition);
  const panelOffset = records.indexOf(panel[0]);
  const rowGroups = panel
    .map((record, offset) => ({ record, position: panelOffset + offset }))
    .filter(({ record, position }) => (
      record.role === 'group'
      && position > notificationHeadings[0].position
      && descendants(records, position).slice(1).some((candidate) => candidate.role === 'link')
      && !descendants(records, position).slice(1).some((candidate) => (
        ['group', 'list', 'navigation'].includes(candidate.role)
      ))
    ));
  if (rowGroups.length < rowOrdinal) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ROW_INVALID,
    surface,
    notifications_heading_bound: true,
  });
  const selected = rowGroups[rowOrdinal - 1];
  const rowRecords = descendants(records, selected.position);
  const nativeLinks = rowRecords.filter((record) => record.role === 'link');
  const selectedLink = nativeLinks.length === 1
    ? exactNativeProfileLinkTarget(nativeLinks[0])
    : null;
  if (
    nativeLinks.length !== 1
    || !selectedLink
  ) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_LINK_INVALID,
    surface,
    notifications_heading_bound: true,
    selected_row_bound: true,
  });
  const matchingTargetRows = rowGroups.filter(({ position }) => {
    const candidateLinks = descendants(records, position)
      .filter((record) => record.role === 'link');
    const candidate = candidateLinks.length === 1
      ? exactNativeProfileLinkTarget(candidateLinks[0])
      : null;
    return candidate?.exact_target === selectedLink.exact_target;
  });
  if (matchingTargetRows.length !== 1) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ROW_INVALID,
    surface,
    notifications_heading_bound: true,
    selected_row_bound: true,
    native_profile_link_bound: true,
  });
  const followerEvents = rowRecords
    .map(exactFollowerEventObservation)
    .filter((value) => value !== null);
  if (
    followerEvents.length !== 1
    || (followerEvents[0].optional_target_prefix !== null
      && followerEvents[0].optional_target_prefix !== selectedLink.exact_target)
  ) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.FOLLOWER_SEMANTICS_INVALID,
    surface,
    notifications_heading_bound: true,
    selected_row_bound: true,
    native_profile_link_bound: true,
  });
  return Object.freeze({
    blocker: null,
    surface,
    notifications_heading_bound: true,
    selected_row_bound: true,
    native_profile_link_bound: true,
    follower_semantics_bound: true,
    visible_time_bucket_bound: true,
    exact_target: selectedLink.exact_target,
    profile_link_element_index: selectedLink.element_index,
    visible_time_bucket: followerEvents[0].visible_time_bucket,
  });
};

const exactPageIdentity = (record, exactTarget) => (
  ['text', 'heading'].includes(record.role)
  && [exactTarget, `${exactTarget} · Instagram`].includes(primaryLabel(record))
);

const isPositiveProfileHeader = (record) => record.role === 'group'
  && /^(?:Profile header|Profile content|Instagram profile header|User profile|Perfil|Encabezado del perfil)$/iu
    .test(primaryLabel(record));

const hasUnavailableProfileState = (records) => records.some((record) => (
  ['text', 'heading'].includes(record.role)
  && /^(?:(?:Sorry,\s*)?(?:This\s+)?(?:page|profile)\s+(?:isn['’]t|is not|not)\s+available|User\s+(?:not found|isn['’]t available|is not available)|(?:Esta\s+)?(?:p[aá]gina|perfil)\s+(?:no est[aá] disponible|no disponible)|Usuario no encontrado)\.?$/iu
    .test(primaryLabel(record))
));

const inspectProfileAx = ({ rawText, activationState }) => {
  const records = parseRecords(rawText);
  if (!records) return Object.freeze({ blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AX_INVALID });
  const surface = inspectSurface(records);
  if (surface.private_browsing) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PRIVATE_BROWSING,
    surface,
  });
  if (hasAuthOrChallenge(records)) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AUTH_OR_CHALLENGE,
    surface,
  });
  if (hasUnavailableProfileState(records)) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID,
    surface,
  });
  if (
    !surface.isolated_surface
    || surface.active_tab_index !== activationState.active_tab_index
    || surface.neutral_tab_index !== activationState.neutral_tab_index
  ) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_DRIFT,
    surface,
  });
  const addressFields = records.filter(isAddressField);
  const profileAddress = addressFields.length === 1
    ? parseCanonicalInstagramProfileAddress(structuredField(addressFields[0], 'Value'))
    : null;
  if (
    !profileAddress
    || activationState.exact_target !== profileAddress.exact_target
  ) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_ADDRESS_MISMATCH,
    surface,
  });
  const contentRoots = records
    .map((record, position) => ({ record, position }))
    .filter(({ record }) => record.role === 'group'
      && primaryLabel(record) === 'Instagram HTML content');
  const profileHeaders = contentRoots.length === 1
    ? descendants(records, contentRoots[0].position)
      .map((record) => ({ record, position: records.indexOf(record) }))
      .filter(({ record }) => isPositiveProfileHeader(record))
    : [];
  const identities = profileHeaders.length === 1
    ? descendants(records, profileHeaders[0].position).filter((record) => exactPageIdentity(
      record,
      profileAddress.exact_target,
    ))
    : [];
  if (identities.length !== 1) return Object.freeze({
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID,
    surface,
    exact_profile_address_bound: true,
  });
  return Object.freeze({
    blocker: null,
    surface,
    exact_profile_address_bound: true,
    unique_profile_identity_bound: true,
    exact_profile_url: profileAddress.exact_url,
    exact_target: profileAddress.exact_target,
  });
};

const opaqueCapability = (label) => {
  const capability = Object.create(null);
  Object.defineProperties(capability, {
    [Symbol(label)]: { value: true, enumerable: false },
    toJSON: {
      value: () => { throw new TypeError('opaque capability cannot be serialized'); },
      enumerable: false,
    },
  });
  return Object.freeze(capability);
};

const buildReceipt = ({
  stage,
  decision = WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.BLOCKED,
  blockerCodes = [],
  progress = {},
}) => Object.freeze({
  receipt_schema_version:
    WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_SCHEMA_VERSION,
  binder_contract_version:
    WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_CONTRACT_VERSION,
  redaction_status:
    'aggregate_allowlist_only_no_identity_url_ax_index_time_timestamp_screenshot_or_ocr',
  stage,
  decision,
  standard_safari: progress.standard_safari === true,
  isolated_surface: progress.isolated_surface === true,
  notifications_heading_bound: progress.notifications_heading_bound === true,
  selected_row_bound: progress.selected_row_bound === true,
  native_profile_link_bound: progress.native_profile_link_bound === true,
  follower_semantics_bound: progress.follower_semantics_bound === true,
  visible_time_bucket_bound: progress.visible_time_bucket_bound === true,
  exact_profile_address_bound: progress.exact_profile_address_bound === true,
  unique_profile_identity_bound: progress.unique_profile_identity_bound === true,
  capability_issued: decision !== WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.BLOCKED,
  live_authority: false,
  browser_used: false,
  network_used: false,
  external_effect_invoked: false,
  blocker_codes: Object.freeze([...blockerCodes]),
});

const blockedResult = ({ stage, blocker, progress = {} }) => Object.freeze({
  private_activation_capability: null,
  private_binding_capability: null,
  private_link_element_index: null,
  private_exact_target_utf8: null,
  private_visible_time_bucket_utf8: null,
  redacted_receipt: buildReceipt({
    stage,
    blockerCodes: [blocker],
    progress,
  }),
});

const prepareInternal = (parameters) => {
  const input = exactDataObject(parameters, ['raw_text', 'row_ordinal', 'now_ms']);
  if (
    !input
    || !cleanAxText(input.raw_text)
    || !Number.isSafeInteger(input.row_ordinal)
    || input.row_ordinal < 1
    || input.row_ordinal > WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_ROWS
    || !validNow(input.now_ms)
  ) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
  });
  const inspection = inspectNotificationAx({
    rawText: input.raw_text,
    rowOrdinal: input.row_ordinal,
  });
  if (inspection.blocker) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE,
    blocker: inspection.blocker,
    progress: {
      ...inspection,
      standard_safari: inspection.surface?.standard_safari,
      isolated_surface: inspection.surface?.isolated_surface,
    },
  });
  const privateActivationCapability = opaqueCapability('native-notification-profile-activation');
  ACTIVATION_STATES.set(privateActivationCapability, {
    consumed: false,
    issued_at_ms: input.now_ms,
    expires_at_ms:
      input.now_ms + WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_ACTIVATION_TTL_MS,
    row_ordinal: input.row_ordinal,
    exact_target: inspection.exact_target,
    profile_link_element_index: inspection.profile_link_element_index,
    visible_time_bucket: inspection.visible_time_bucket,
    notification_attested_at: new Date(input.now_ms).toISOString(),
    active_tab_index: inspection.surface.active_tab_index,
    neutral_tab_index: inspection.surface.neutral_tab_index,
  });
  return Object.freeze({
    private_activation_capability: privateActivationCapability,
    private_binding_capability: null,
    private_link_element_index: inspection.profile_link_element_index,
    private_exact_target_utf8: null,
    private_visible_time_bucket_utf8: null,
    redacted_receipt: buildReceipt({
      stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE,
      decision: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.PREPARED,
      progress: {
        standard_safari: true,
        isolated_surface: true,
        notifications_heading_bound: true,
        selected_row_bound: true,
        native_profile_link_bound: true,
        follower_semantics_bound: true,
        visible_time_bucket_bound: true,
      },
    }),
  });
};

const confirmInternal = (parameters) => {
  const input = exactDataObject(parameters, [
    'raw_text',
    'private_activation_capability',
    'now_ms',
  ]);
  if (!input) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
  });
  const activationState = ACTIVATION_STATES.get(input.private_activation_capability);
  if (!activationState || activationState.consumed) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ACTIVATION_INVALID,
  });
  activationState.consumed = true;
  if (!cleanAxText(input.raw_text) || !validNow(input.now_ms)) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
  });
  if (
    input.now_ms < activationState.issued_at_ms
    || input.now_ms >= activationState.expires_at_ms
  ) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ACTIVATION_STALE,
  });
  const inspection = inspectProfileAx({ rawText: input.raw_text, activationState });
  if (inspection.blocker) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: inspection.blocker,
    progress: {
      standard_safari: inspection.surface?.standard_safari,
      isolated_surface: inspection.surface?.isolated_surface,
      exact_profile_address_bound: inspection.exact_profile_address_bound,
    },
  });
  const metadata = Object.freeze({
    row_ordinal: activationState.row_ordinal,
    exact_target_utf8: inspection.exact_target,
    visible_time_bucket_utf8: activationState.visible_time_bucket,
    notification_attested_at: activationState.notification_attested_at,
    profile_attested_at: new Date(input.now_ms).toISOString(),
  });
  const privateBindingCapability = opaqueCapability('native-notification-profile-binding');
  BINDING_STATES.set(privateBindingCapability, { consumed: false, metadata });
  return Object.freeze({
    private_activation_capability: null,
    private_binding_capability: privateBindingCapability,
    private_link_element_index: null,
    private_exact_target_utf8: inspection.exact_target,
    private_visible_time_bucket_utf8: activationState.visible_time_bucket,
    redacted_receipt: buildReceipt({
      stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
      decision: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.CONFIRMED,
      progress: {
        standard_safari: true,
        isolated_surface: true,
        notifications_heading_bound: true,
        selected_row_bound: true,
        native_profile_link_bound: true,
        follower_semantics_bound: true,
        visible_time_bucket_bound: true,
        exact_profile_address_bound: true,
        unique_profile_identity_bound: true,
      },
    }),
  });
};

const prepareWelcomeAudioNativeNotificationProfileBinding = (parameters = {}) => {
  const input = exactDataObject(parameters, ['raw_text', 'row_ordinal']);
  if (!input) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
  });
  return prepareInternal({ ...input, now_ms: Date.now() });
};

const prepareWelcomeAudioNativeNotificationProfileBindingForTest = (parameters = {}) => (
  prepareInternal(parameters)
);

const confirmWelcomeAudioNativeNotificationProfileBinding = (parameters = {}) => {
  const input = exactDataObject(parameters, ['raw_text', 'private_activation_capability']);
  if (!input) return blockedResult({
    stage: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM,
    blocker: WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
  });
  return confirmInternal({ ...input, now_ms: Date.now() });
};

const confirmWelcomeAudioNativeNotificationProfileBindingForTest = (parameters = {}) => (
  confirmInternal(parameters)
);

const inspectWelcomeAudioNativeNotificationProfileBindingCapability = (capability) => {
  const state = capability !== null && typeof capability === 'object'
    ? BINDING_STATES.get(capability)
    : null;
  if (!state || state.consumed) return null;
  return state.metadata;
};

const consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce = (capability) => {
  const state = capability !== null && typeof capability === 'object'
    ? BINDING_STATES.get(capability)
    : null;
  if (!state || state.consumed) return null;
  state.consumed = true;
  return state.metadata;
};

const validateWelcomeAudioNativeNotificationProfileBindingReceipt = (value) => {
  const receipt = exactDataObject(value, RECEIPT_FIELDS);
  if (!receipt) return Object.freeze({ ok: false, reason: 'receipt_shape_invalid' });
  const blockers = exactArray(receipt.blocker_codes);
  if (
    receipt.receipt_schema_version
      !== WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_SCHEMA_VERSION
    || receipt.binder_contract_version
      !== WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_CONTRACT_VERSION
    || receipt.redaction_status
      !== 'aggregate_allowlist_only_no_identity_url_ax_index_time_timestamp_screenshot_or_ocr'
    || !STAGES.has(receipt.stage)
    || !DECISIONS.has(receipt.decision)
    || !blockers
    || blockers.some((blocker) => !BLOCKERS.has(blocker))
    || new Set(blockers).size !== blockers.length
  ) return Object.freeze({ ok: false, reason: 'receipt_contract_invalid' });
  const booleanFields = RECEIPT_FIELDS.filter((field) => [
    'standard_safari',
    'isolated_surface',
    'notifications_heading_bound',
    'selected_row_bound',
    'native_profile_link_bound',
    'follower_semantics_bound',
    'visible_time_bucket_bound',
    'exact_profile_address_bound',
    'unique_profile_identity_bound',
    'capability_issued',
    'live_authority',
    'browser_used',
    'network_used',
    'external_effect_invoked',
  ].includes(field));
  if (booleanFields.some((field) => typeof receipt[field] !== 'boolean')) {
    return Object.freeze({ ok: false, reason: 'receipt_boolean_invalid' });
  }
  const blocked = receipt.decision
    === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.BLOCKED;
  const prepared = receipt.decision
    === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.PREPARED;
  const confirmed = receipt.decision
    === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.CONFIRMED;
  const prepareMilestones = [
    receipt.standard_safari,
    receipt.isolated_surface,
    receipt.notifications_heading_bound,
    receipt.selected_row_bound,
    receipt.native_profile_link_bound,
    receipt.follower_semantics_bound,
    receipt.visible_time_bucket_bound,
  ];
  const confirmMilestones = [
    ...prepareMilestones,
    receipt.exact_profile_address_bound,
    receipt.unique_profile_identity_bound,
  ];
  const prepareProgressMonotonic = prepareMilestones.every(
    (value, index) => value !== true || index === 0 || prepareMilestones[index - 1] === true,
  );
  const confirmProgressMonotonic = (
    !receipt.isolated_surface || receipt.standard_safari
  ) && (
    !receipt.exact_profile_address_bound || receipt.isolated_surface
  ) && (
    !receipt.unique_profile_identity_bound || receipt.exact_profile_address_bound
  );
  const exactPrepared = prepared
    && receipt.stage === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE
    && prepareMilestones.every((value) => value === true)
    && receipt.exact_profile_address_bound === false
    && receipt.unique_profile_identity_bound === false;
  const exactConfirmed = confirmed
    && receipt.stage === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM
    && confirmMilestones.every((value) => value === true);
  const blockedStageProgressValid = blocked && (
    (receipt.stage === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE
      && receipt.exact_profile_address_bound === false
      && receipt.unique_profile_identity_bound === false
      && prepareProgressMonotonic)
    || (receipt.stage === WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.CONFIRM
      && receipt.notifications_heading_bound === false
      && receipt.selected_row_bound === false
      && receipt.native_profile_link_bound === false
      && receipt.follower_semantics_bound === false
      && receipt.visible_time_bucket_bound === false
      && confirmProgressMonotonic)
  );
  if (
    (blocked && (receipt.capability_issued || blockers.length !== 1))
    || (!blocked && (!receipt.capability_issued || blockers.length !== 0))
    || (!blocked && !exactPrepared && !exactConfirmed)
    || (blocked && !blockedStageProgressValid)
    || receipt.live_authority
    || receipt.browser_used
    || receipt.network_used
    || receipt.external_effect_invoked
  ) return Object.freeze({ ok: false, reason: 'receipt_decision_invalid' });
  return Object.freeze({ ok: true, reason: null });
};

export {
  METADATA_FIELDS as WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_METADATA_FIELDS,
  RECEIPT_FIELDS as WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_FIELDS,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_ACTIVATION_TTL_MS,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_CONTRACT_VERSION,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_MAX_ROWS,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_SCHEMA_VERSION,
  WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE,
  confirmWelcomeAudioNativeNotificationProfileBinding,
  confirmWelcomeAudioNativeNotificationProfileBindingForTest,
  consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce,
  inspectWelcomeAudioNativeNotificationProfileBindingCapability,
  prepareWelcomeAudioNativeNotificationProfileBinding,
  prepareWelcomeAudioNativeNotificationProfileBindingForTest,
  validateWelcomeAudioNativeNotificationProfileBindingReceipt,
};
