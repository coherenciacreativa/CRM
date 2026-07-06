#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-setup-readonly-verification-2026-07-06-v2';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANTIS_REPORTS_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports';
const REDACTED_RECEIPT_ROOT = `${MANTIS_REPORTS_ROOT}/mailerlite/controlled-welcome-flow`;
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const SETUP_ENDPOINTS = [
  { key: 'groups', path: '/groups' },
  { key: 'automations', path: '/automations' },
  { key: 'fields', path: '/fields' },
];

const GROUP_STATUS = new Set([
  'confirmed_current_existing_label',
  'historical_prefill_only',
  'missing_or_not_found',
  'ambiguous',
  'not_verified',
]);
const AUTOMATION_STATUS = GROUP_STATUS;
const FIELD_STATUS = new Set([
  'confirmed_existing_field',
  'historical_prefill_only',
  'requires_setup_inventory',
  'missing_or_not_found',
  'ambiguous',
  'not_verified',
]);
const TRIGGER_STATUS = new Set([
  'confirmed_group_trigger',
  'unknown_requires_behavior_check',
  'not_verified',
  'blocked',
]);
const RETRIGGER_STATUS = new Set([
  'confirmed',
  'unknown_blocks_mutation',
  'not_verified',
  'blocked',
]);
const SUPPRESSION_STATUS = new Set([
  'aggregate_verified_no_private_rows',
  'not_verified_no_subscriber_read',
  'unknown_blocks_mutation',
  'blocked',
]);
const IDEMPOTENCY_STATUS = new Set([
  'no_write_preview_only',
  'not_verified_no_subscriber_read',
  'blocked_idempotency_unknown_for_mutation',
  'ready_for_mutation_review_after_final_check',
]);

const DEFAULT_EXPECTED_MAPPINGS = {
  groups: ['CC · Journey · Editorial onboarding · Eligible'],
  automations: ['Onboarding flow'],
  fields: [
    'email',
    'name',
    'country',
    'city',
    'source_channel',
    'source_context',
    'onboarding_started_at',
    'consent_or_context',
    'crm_core_private_anchor_label',
  ],
};

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs --fixture-file <path> --redacted-receipt-json <path> --redacted-receipt-md <path>

Fixture mode:
  --fixture-file <path>                         Synthetic setup metadata fixture.

Future live read-only mode:
  --allow-live-readonly-setup-verification      Required explicit approval flag.
  --private-artifact-path <path>                Private setup refs JSON under ${PRIVATE_MAILERLITE_ROOT}.
  --private-artifact-json <path>                Alias for --private-artifact-path.
  --redacted-receipt-json <path>                Redacted JSON under ${REDACTED_RECEIPT_ROOT} for live mode.
  --redacted-receipt-md <path>                  Redacted Markdown under ${REDACTED_RECEIPT_ROOT} for live mode.
  --service <name>                              Stored credential service. Defaults to ${DEFAULT_SERVICE}.
  --account <name>                              Stored credential account. Defaults to ${DEFAULT_ACCOUNT}.
  --api-base <url>                              MailerLite API base. Defaults to ${DEFAULT_API_BASE}.
  --timeout-ms <n>                              Request timeout. Defaults to 30000.
  --max-pages <n>                               Setup collection page cap. Defaults to 10.
  --help                                        Show this help.

Fixture-first redaction guard for MailerLite onboarding setup/config verification.
Live mode is read-only setup/config metadata only, requires explicit approval, validates paths before credentials, never reads subscriber rows, and never mutates MailerLite.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalize = (value) =>
  cleanString(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const sensitivePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:grp|auto|fld|sub)_fake_secret_[A-Za-z0-9_-]+\b/i,
  /\b(?:group|automation|field|subscriber|form|segment|webhook)[_-]?id\b/i,
  /\b(?:api[_-]?key|token|bearer|cookie|authorization|header|raw[_-]?payload)\b/i,
];

const safeLabel = (value) => {
  const label = cleanString(value);
  if (!label) return null;
  if (sensitivePatterns.some((pattern) => pattern.test(label))) return '[redacted_label]';
  return label;
};

const parseArgs = (argv) => {
  const options = {
    fixtureFile: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    allowLiveReadonlySetupVerification: false,
    privateArtifactPath: null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    maxPages: 10,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--allow-live-readonly-setup-verification') options.allowLiveReadonlySetupVerification = true;
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (arg === '--private-artifact-path' || arg === '--private-artifact-json') options.privateArtifactPath = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--max-pages') options.maxPages = Number.parseInt(argv[++index], 10);
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/, '') ?? DEFAULT_API_BASE;
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? Math.min(options.maxPages, 25) : 10;
  return options;
};

const rootsWithDefaults = (roots = {}) => ({
  repoRoot: roots.repoRoot ?? REPO_ROOT,
  redactedReceiptRoot: roots.redactedReceiptRoot ?? REDACTED_RECEIPT_ROOT,
  privateMailerLiteRoot: roots.privateMailerLiteRoot ?? PRIVATE_MAILERLITE_ROOT,
});

const isInside = (targetPath, rootPath) => {
  const resolvedTarget = resolve(targetPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, resolvedTarget);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

const assertOutsideRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (isInside(targetPath, rootPath)) throw new Error(`${label}_inside_repo_rejected`);
};

const assertUnderRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (!isInside(targetPath, rootPath) || resolve(targetPath) === resolve(rootPath)) {
    throw new Error(`${label}_outside_approved_root_rejected`);
  }
};

const validateOutputPaths = (options, { mode = 'fixture', requirePrivateArtifact = false, roots = {} } = {}) => {
  const resolvedRoots = rootsWithDefaults(roots);
  assertOutsideRoot(options.redactedReceiptJson, resolvedRoots.repoRoot, 'redacted_receipt_json');
  assertOutsideRoot(options.redactedReceiptMd, resolvedRoots.repoRoot, 'redacted_receipt_md');

  if (mode === 'live') {
    assertUnderRoot(options.redactedReceiptJson, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_json');
    assertUnderRoot(options.redactedReceiptMd, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_md');
  }

  if (options.privateArtifactPath || requirePrivateArtifact) {
    assertOutsideRoot(options.privateArtifactPath, resolvedRoots.repoRoot, 'private_artifact_path');
    assertUnderRoot(options.privateArtifactPath, resolvedRoots.privateMailerLiteRoot, 'private_artifact_path');
  }

  return {
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
    privateArtifactPath: options.privateArtifactPath ? resolve(options.privateArtifactPath) : null,
    redactedReceiptRoot: resolve(resolvedRoots.redactedReceiptRoot),
    privateMailerLiteRoot: resolve(resolvedRoots.privateMailerLiteRoot),
  };
};

const asArray = (value) => Array.isArray(value) ? value : [];
const rawLabelOf = (item) => cleanString(item?.label ?? item?.name ?? item?.key ?? item?.title);
const itemId = (item) => cleanString(item?.id ?? item?.field_id ?? item?.group_id ?? item?.automation_id);

const expectedEntries = (source, key, fallback = DEFAULT_EXPECTED_MAPPINGS[key] ?? []) => {
  const explicit = source?.expectedMappings?.[key] ?? source?.expected?.[key] ?? source?.[key] ?? fallback;
  const entries = Array.isArray(explicit) ? explicit : fallback;
  return entries.map((entry) => typeof entry === 'string' ? { label: entry } : entry).filter(Boolean);
};

const matchByLabel = (items, expectedLabel) => {
  const wanted = normalize(expectedLabel);
  if (!wanted) return [];
  return asArray(items).filter((item) => normalize(rawLabelOf(item)) === wanted);
};

const statusFromMatches = ({ expected, items, allowedStatuses, confirmedStatus }) => {
  if (allowedStatuses.has(expected?.status)) return expected.status;
  if (expected?.historicalPrefillOnly === true) return 'historical_prefill_only';
  const expectedLabel = cleanString(expected?.label ?? expected?.name ?? expected?.key);
  if (!expectedLabel) return 'not_verified';
  const matches = matchByLabel(items, expectedLabel);
  if (matches.length === 1) return confirmedStatus;
  if (matches.length > 1) return 'ambiguous';
  return 'missing_or_not_found';
};

const countByStatus = (statuses, allowed) => {
  const counts = Object.fromEntries([...allowed].map((status) => [status, 0]));
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1;
  return counts;
};

const classifyGroup = (source) => {
  const expected = expectedEntries(source, 'groups').find(Boolean);
  return statusFromMatches({
    expected,
    items: source?.setupMetadata?.groups ?? source?.groups,
    allowedStatuses: GROUP_STATUS,
    confirmedStatus: 'confirmed_current_existing_label',
  });
};

const classifyAutomation = (source) => {
  const expected = expectedEntries(source, 'automations').find(Boolean);
  return statusFromMatches({
    expected,
    items: source?.setupMetadata?.automations ?? source?.automations,
    allowedStatuses: AUTOMATION_STATUS,
    confirmedStatus: 'confirmed_current_existing_label',
  });
};

const classifyFields = (source) => {
  const expected = expectedEntries(source, 'fields');
  const items = source?.setupMetadata?.fields ?? source?.fields;
  const statuses = expected.map((field) => {
    if (FIELD_STATUS.has(field?.status)) return field.status;
    if (field?.requiresSetupInventory === true) return 'requires_setup_inventory';
    if (field?.historicalPrefillOnly === true) return 'historical_prefill_only';
    const matches = matchByLabel(items, field?.label ?? field?.name ?? field?.key);
    if (matches.length === 1) return 'confirmed_existing_field';
    if (matches.length > 1) return 'ambiguous';
    return field?.optional === true ? 'requires_setup_inventory' : 'missing_or_not_found';
  });
  return countByStatus(statuses, FIELD_STATUS);
};

const classifyTrigger = (source) => {
  const explicit = source?.triggerBehaviorStatus ?? source?.behavior?.triggerBehaviorStatus;
  if (TRIGGER_STATUS.has(explicit)) return explicit;
  if (source?.behavior?.confirmedGroupTrigger === true || source?.triggerBehavior?.confirmedGroupTrigger === true) {
    return 'confirmed_group_trigger';
  }
  const expectedGroup = expectedEntries(source, 'groups').find(Boolean);
  const expectedAutomation = expectedEntries(source, 'automations').find(Boolean);
  const automation = matchByLabel(source?.setupMetadata?.automations ?? source?.automations, expectedAutomation?.label ?? expectedAutomation?.name).find(Boolean);
  const triggerLabel = cleanString(automation?.triggerGroupLabel ?? automation?.trigger?.groupLabel ?? automation?.trigger?.group_name);
  if (triggerLabel && normalize(triggerLabel) === normalize(expectedGroup?.label ?? expectedGroup?.name)) {
    return 'confirmed_group_trigger';
  }
  return 'unknown_requires_behavior_check';
};

const classifyRetrigger = (source) => {
  const explicit = source?.retriggerBehaviorStatus ?? source?.behavior?.retriggerBehaviorStatus;
  if (RETRIGGER_STATUS.has(explicit)) return explicit;
  if (source?.behavior?.retriggerConfirmed === true || source?.retriggerBehavior?.confirmed === true) return 'confirmed';
  return 'unknown_blocks_mutation';
};

const classifySuppression = (source) => {
  const explicit = source?.suppressionStatus ?? source?.suppression?.status;
  if (SUPPRESSION_STATUS.has(explicit)) return explicit;
  if (source?.suppression?.aggregateVerifiedNoPrivateRows === true) return 'aggregate_verified_no_private_rows';
  return 'not_verified_no_subscriber_read';
};

const classifyIdempotency = (source, suppressionStatus) => {
  const explicit = source?.idempotencyStatus ?? source?.idempotency?.status;
  if (IDEMPOTENCY_STATUS.has(explicit)) return explicit;
  if (source?.idempotency?.readyForMutationReviewAfterFinalCheck === true) return 'ready_for_mutation_review_after_final_check';
  if (suppressionStatus === 'not_verified_no_subscriber_read') return 'not_verified_no_subscriber_read';
  return 'blocked_idempotency_unknown_for_mutation';
};

const mutationReadiness = ({ groupMappingStatus, automationMappingStatus, fieldMappingStatusCounts, triggerBehaviorStatus, retriggerBehaviorStatus, suppressionStatus, idempotencyStatus }) => {
  const fieldBlockers = [
    fieldMappingStatusCounts.requires_setup_inventory,
    fieldMappingStatusCounts.missing_or_not_found,
    fieldMappingStatusCounts.ambiguous,
    fieldMappingStatusCounts.not_verified,
  ].some((count) => count > 0);

  if (groupMappingStatus !== 'confirmed_current_existing_label' || automationMappingStatus !== 'confirmed_current_existing_label') return 'blocked_missing_setup_inventory';
  if (fieldBlockers) return 'blocked_field_mapping';
  if (triggerBehaviorStatus !== 'confirmed_group_trigger') return 'blocked_trigger_behavior_unknown';
  if (retriggerBehaviorStatus !== 'confirmed') return 'blocked_retrigger_behavior_unknown';
  if (suppressionStatus !== 'aggregate_verified_no_private_rows') return 'blocked_suppression_unknown';
  if (idempotencyStatus !== 'ready_for_mutation_review_after_final_check') return 'blocked_idempotency_unknown';
  return 'ready_for_no_write_mutation_review';
};

const blockerClasses = (summary) => {
  const blockers = [];
  if (summary.groupMappingStatus !== 'confirmed_current_existing_label') blockers.push('group_mapping_not_confirmed');
  if (summary.automationMappingStatus !== 'confirmed_current_existing_label') blockers.push('automation_mapping_not_confirmed');
  for (const [status, count] of Object.entries(summary.fieldMappingStatusCounts)) {
    if (count > 0 && status !== 'confirmed_existing_field') blockers.push(`field_mapping_${status}`);
  }
  if (summary.triggerBehaviorStatus !== 'confirmed_group_trigger') blockers.push('trigger_behavior_not_confirmed');
  if (summary.retriggerBehaviorStatus !== 'confirmed') blockers.push('retrigger_behavior_not_confirmed');
  if (summary.suppressionStatus !== 'aggregate_verified_no_private_rows') blockers.push('suppression_not_verified');
  if (summary.idempotencyStatus !== 'ready_for_mutation_review_after_final_check') blockers.push('idempotency_not_verified');
  return [...new Set(blockers)].sort();
};

const redactedLabels = (entries) => entries.map((entry) => safeLabel(entry?.label ?? entry?.name ?? entry?.key)).filter(Boolean);

const buildSetupReport = ({ source, mode, generatedAt = new Date().toISOString(), liveMailerLiteApiCalled = false, finalState = null }) => {
  const expectedGroups = expectedEntries(source, 'groups');
  const expectedAutomations = expectedEntries(source, 'automations');
  const expectedFields = expectedEntries(source, 'fields');
  const groups = asArray(source?.setupMetadata?.groups ?? source?.groups);
  const automations = asArray(source?.setupMetadata?.automations ?? source?.automations);
  const fields = asArray(source?.setupMetadata?.fields ?? source?.fields);
  const summary = {
    groupMappingStatus: classifyGroup(source),
    automationMappingStatus: classifyAutomation(source),
    fieldMappingStatusCounts: classifyFields(source),
    triggerBehaviorStatus: classifyTrigger(source),
    retriggerBehaviorStatus: classifyRetrigger(source),
    suppressionStatus: classifySuppression(source),
  };
  summary.idempotencyStatus = classifyIdempotency(source, summary.suppressionStatus);
  summary.mutationReadiness = mutationReadiness(summary);
  summary.blockerClasses = blockerClasses(summary);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode,
    finalState: finalState ?? (mode === 'live_readonly_setup_verification' ? 'live_readonly_setup_verification_receipt_created' : 'fixture_setup_verification_receipt_created'),
    setupVerificationStatus: mode === 'live_readonly_setup_verification' ? 'completed_live_readonly_setup_config_metadata' : 'completed_fixture_redaction_guard',
    sourceFamily: 'MailerLite setup/config metadata',
    command: 'npm run crm:vnext:mailerlite-setup-readonly-verification',
    sourceCounts: {
      groupsObserved: groups.length,
      automationsObserved: automations.length,
      fieldsObserved: fields.length,
      subscriberRowsRead: 0,
      rawPayloadsWritten: 0,
    },
    requestedMappings: {
      groupLabels: redactedLabels(expectedGroups),
      automationLabels: redactedLabels(expectedAutomations),
      fieldLabels: redactedLabels(expectedFields),
    },
    setupReadiness: summary,
    receiptSafety: {
      redactedAggregateOnly: true,
      nonSecretLabelsOnly: true,
      rawIdsOmitted: true,
      rawEmailsOmitted: true,
      rawPayloadOmitted: true,
      subscriberRowsOmitted: true,
    },
    closedGates: {
      liveMailerLiteApiCalled,
      mailerLiteUiUsed: false,
      liveSourceAccessed: liveMailerLiteApiCalled,
      subscriberRowsRead: false,
      sourceMutationPerformed: false,
      crmWritePerformed: false,
      privateArtifactRead: false,
      privateArtifactWritten: mode === 'live_readonly_setup_verification',
      sourceOperatorReceiptWritten: true,
      rawPrivateContentPrinted: false,
      secretValuePrinted: false,
    },
    nextSafeStep: summary.mutationReadiness === 'ready_for_no_write_mutation_review'
      ? 'Prepare a separate no-write mutation review packet; do not mutate.'
      : 'Review live read-only setup verification blockers before any mutation review.',
  };
};

const buildReportFromFixture = (fixture, { generatedAt = new Date().toISOString() } = {}) => buildSetupReport({
  source: fixture,
  mode: 'fixture_redaction_guard',
  generatedAt,
  liveMailerLiteApiCalled: false,
});

const renderMarkdown = (report) => `# MailerLite Setup Read-Only Verification Redacted Receipt\n\n` +
  `- schema_version: \`${report.schemaVersion}\`\n` +
  `- final_state: \`${report.finalState}\`\n` +
  `- setup_verification_status: \`${report.setupVerificationStatus}\`\n` +
  `- mode: \`${report.mode}\`\n` +
  `- source_family: \`${report.sourceFamily}\`\n` +
  `- group_mapping_status: \`${report.setupReadiness.groupMappingStatus}\`\n` +
  `- automation_mapping_status: \`${report.setupReadiness.automationMappingStatus}\`\n` +
  `- trigger_behavior_status: \`${report.setupReadiness.triggerBehaviorStatus}\`\n` +
  `- retrigger_behavior_status: \`${report.setupReadiness.retriggerBehaviorStatus}\`\n` +
  `- suppression_status: \`${report.setupReadiness.suppressionStatus}\`\n` +
  `- idempotency_status: \`${report.setupReadiness.idempotencyStatus}\`\n` +
  `- mutation_readiness: \`${report.setupReadiness.mutationReadiness}\`\n\n` +
  `## Source Counts\n\n` +
  Object.entries(report.sourceCounts).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n\n## Field Mapping Status Counts\n\n` +
  Object.entries(report.setupReadiness.fieldMappingStatusCounts).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n\n## Blockers\n\n` +
  (report.setupReadiness.blockerClasses.length
    ? report.setupReadiness.blockerClasses.map((blocker) => `- \`${blocker}\``).join('\n')
    : '- none') +
  `\n\n## Closed Gates\n\n` +
  Object.entries(report.closedGates).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n\n## Next Safe Step\n\n${report.nextSafeStep}\n`;

const writeReceiptFiles = async (report, paths) => {
  await mkdir(dirname(paths.redactedReceiptJson), { recursive: true });
  await mkdir(dirname(paths.redactedReceiptMd), { recursive: true });
  await writeFile(paths.redactedReceiptJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(paths.redactedReceiptMd, renderMarkdown(report), 'utf8');
};

const privateSetupRefs = ({ source, report }) => ({
  schemaVersion: `${SCHEMA_VERSION}-private-refs`,
  generatedAt: report.generatedAt,
  mode: 'live_readonly_private_setup_refs',
  sourceFamily: report.sourceFamily,
  setupRefs: {
    groups: asArray(source?.setupMetadata?.groups ?? source?.groups).map((item) => ({ id: itemId(item), label: rawLabelOf(item) })).filter((item) => item.id || item.label),
    automations: asArray(source?.setupMetadata?.automations ?? source?.automations).map((item) => ({ id: itemId(item), label: rawLabelOf(item) })).filter((item) => item.id || item.label),
    fields: asArray(source?.setupMetadata?.fields ?? source?.fields).map((item) => ({ id: itemId(item), label: rawLabelOf(item) })).filter((item) => item.id || item.label),
  },
  redactionNotice: 'Private setup refs only. Do not print, commit, paste, or write into redacted receipts.',
  closedGates: {
    subscriberRowsRead: false,
    subscriberRowsIncluded: false,
    sourceMutationPerformed: false,
    credentialMaterialIncluded: false,
  },
});

const writePrivateSetupArtifact = async ({ source, report, path }) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(privateSetupRefs({ source, report }), null, 2)}\n`, 'utf8');
};

const readFixture = async (fixtureFile) => {
  if (!fixtureFile) throw new Error('missing_fixture_file');
  const raw = await readFile(fixtureFile, 'utf8');
  return JSON.parse(raw);
};

const getKeychainSecret = async (service, account) => {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-w',
      '-s',
      service,
      '-a',
      account,
    ], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    const key = stdout.trim();
    return key ? { key } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return { key: keychain.key };
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key };
  }
  return { key: null };
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 404 || /not found/i.test(text)) return 'mailerlite_endpoint_not_found';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const assertSafeSetupRequest = ({ method = 'GET', path }) => {
  if (method !== 'GET') throw new Error('blocked_live_contract_not_redaction_safe');
  if (/\/subscribers?(?:\/|$|\?)/i.test(path) || /subscriber/i.test(path)) {
    throw new Error('blocked_live_contract_not_redaction_safe');
  }
  if (!SETUP_ENDPOINTS.some((endpoint) => endpoint.path === path || path.startsWith(`${endpoint.path}?`))) {
    throw new Error('blocked_live_contract_not_redaction_safe');
  }
};

const fetchSetupJson = async ({ options, key, path, params = {}, fetchImpl = fetch }) => {
  assertSafeSetupRequest({ method: 'GET', path });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(urlWithParams(options.apiBase, path, params), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-Core-MailerLite-Setup-Readonly-Verification/1.0',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    if (!response.ok) {
      const reason = classifyFailure(response.status, text);
      const error = new Error(reason);
      error.status = response.status;
      error.reason = reason;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.reason || error?.message === 'blocked_live_contract_not_redaction_safe') throw error;
    const reason = classifyFailure(0, error instanceof Error ? error.message : String(error));
    const wrapped = new Error(reason);
    wrapped.status = 0;
    wrapped.reason = reason;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
};

const extractItems = (payload, family) => {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  for (const key of ['data', family, 'items', 'results']) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  }
  return [];
};

const extractNextCursor = (payload) => {
  for (const container of [payload, payload?.meta]) {
    if (!container || typeof container !== 'object') continue;
    for (const key of ['next_cursor', 'nextCursor']) {
      if (typeof container[key] === 'string' && container[key]) return container[key];
    }
    const nextLink = container.links?.next;
    if (typeof nextLink === 'string' && nextLink) {
      try {
        const parsed = new URL(nextLink);
        for (const key of ['cursor', 'next_cursor', 'page[cursor]']) {
          const value = parsed.searchParams.get(key);
          if (value) return value;
        }
      } catch {
        // Treat malformed pagination as terminal.
      }
    }
  }
  return null;
};

const createMailerLiteSetupClient = ({ options, key, fetchImpl = fetch, calls = [] }) => ({
  calls,
  scanCollection: async (path, family) => {
    assertSafeSetupRequest({ method: 'GET', path });
    const items = [];
    let cursor = null;
    for (let page = 0; page < options.maxPages; page += 1) {
      const params = { limit: 100 };
      if (cursor) params.cursor = cursor;
      calls.push({ method: 'GET', path });
      const payload = await fetchSetupJson({ options, key, path, params, fetchImpl });
      items.push(...extractItems(payload, family));
      cursor = extractNextCursor(payload);
      if (!cursor) break;
    }
    return items;
  },
});

const collectLiveSetupMetadata = async (client) => {
  const setupMetadata = {};
  for (const endpoint of SETUP_ENDPOINTS) {
    setupMetadata[endpoint.key] = await client.scanCollection(endpoint.path, endpoint.key);
  }
  return setupMetadata;
};

const runLiveReadonlySetupVerification = async (options, deps = {}) => {
  const paths = validateOutputPaths(options, { mode: 'live', requirePrivateArtifact: true, roots: deps.roots });
  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) {
    const error = new Error('blocked_missing_mailerlite_credential');
    error.exitCode = 2;
    throw error;
  }

  const calls = [];
  const client = deps.setupClient ?? createMailerLiteSetupClient({
    options,
    key: credential.key,
    fetchImpl: deps.fetchImpl ?? fetch,
    calls,
  });
  const setupMetadata = await collectLiveSetupMetadata(client);
  const source = {
    expectedMappings: deps.expectedMappings ?? DEFAULT_EXPECTED_MAPPINGS,
    setupMetadata,
    behavior: deps.behavior ?? {},
    suppression: deps.suppression ?? {},
    idempotency: deps.idempotency ?? {},
  };
  const report = buildSetupReport({
    source,
    mode: 'live_readonly_setup_verification',
    generatedAt: deps.generatedAt ?? new Date().toISOString(),
    liveMailerLiteApiCalled: true,
  });
  await writePrivateSetupArtifact({ source, report, path: paths.privateArtifactPath });
  await writeReceiptFiles(report, paths);
  return report;
};

const runFixtureMode = async (options, deps = {}) => {
  const paths = validateOutputPaths(options, { mode: 'fixture', roots: deps.roots });
  const fixture = await readFixture(options.fixtureFile);
  const report = buildReportFromFixture(fixture, { generatedAt: deps.generatedAt ?? new Date().toISOString() });
  await writeReceiptFiles(report, paths);
  return report;
};

const compactForStdout = (report) => ({
  ok: true,
  mode: report.mode,
  finalState: report.finalState,
  setupVerificationStatus: report.setupVerificationStatus,
  groupMappingStatus: report.setupReadiness.groupMappingStatus,
  automationMappingStatus: report.setupReadiness.automationMappingStatus,
  mutationReadiness: report.setupReadiness.mutationReadiness,
  redactedReceiptsWritten: true,
  liveMailerLiteApiCalled: report.closedGates.liveMailerLiteApiCalled,
  subscriberRowsRead: false,
});

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }

  if (options.fixtureFile) {
    const report = await runFixtureMode(options, deps);
    console.log(JSON.stringify(compactForStdout(report)));
    return report;
  }

  if (!options.allowLiveReadonlySetupVerification) {
    const error = new Error('live_readonly_setup_verification_requires_explicit_approval');
    error.exitCode = 2;
    throw error;
  }

  const report = await runLiveReadonlySetupVerification(options, deps);
  console.log(JSON.stringify(compactForStdout(report)));
  return report;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    const payload = {
      ok: false,
      status: 'blocked',
      reason: error?.message ?? 'unknown_error',
    };
    console.log(JSON.stringify(payload));
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  });
}

export {
  DEFAULT_EXPECTED_MAPPINGS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  assertSafeSetupRequest,
  buildReportFromFixture,
  buildSetupReport,
  classifyAutomation,
  classifyFields,
  classifyGroup,
  classifyIdempotency,
  classifyRetrigger,
  classifySuppression,
  classifyTrigger,
  collectLiveSetupMetadata,
  createMailerLiteSetupClient,
  mutationReadiness,
  parseArgs,
  renderMarkdown,
  run,
  validateOutputPaths,
};
