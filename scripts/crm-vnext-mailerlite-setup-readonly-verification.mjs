#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-setup-readonly-verification-2026-07-06';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANTIS_REPORTS_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports';
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';

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

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-setup-readonly-verification.mjs --fixture-file <path> --redacted-receipt-json <path> --redacted-receipt-md <path>

Options:
  --fixture-file <path>                         Synthetic setup metadata fixture. Required for this task.
  --redacted-receipt-json <path>                Write redacted JSON receipt outside the repo.
  --redacted-receipt-md <path>                  Write redacted Markdown receipt outside the repo.
  --allow-live-readonly-setup-verification      Future live-read approval flag. Live mode is not implemented in this task.
  --private-artifact-path <path>                Future live private setup refs path under ${PRIVATE_MAILERLITE_ROOT}.
  --help                                        Show this help.

Fixture-first redaction guard for future MailerLite onboarding setup/config verification.
This command does not call MailerLite APIs in fixture mode and blocks live mode unless an explicit future approval flag is present.`;

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
  /\b(?:group|automation|field|subscriber)[_-]?id\b/i,
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
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--allow-live-readonly-setup-verification') options.allowLiveReadonlySetupVerification = true;
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (arg === '--private-artifact-path') options.privateArtifactPath = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const isInside = (targetPath, rootPath) => {
  const resolvedTarget = resolve(targetPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, resolvedTarget);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

const assertOutsideRepo = (targetPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (isInside(targetPath, REPO_ROOT)) throw new Error(`${label}_inside_repo_rejected`);
};

const assertUnderRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (!isInside(targetPath, rootPath) || resolve(targetPath) === resolve(rootPath)) {
    throw new Error(`${label}_outside_approved_root_rejected`);
  }
};

const validateOutputPaths = (options, { requirePrivateArtifact = false } = {}) => {
  assertOutsideRepo(options.redactedReceiptJson, 'redacted_receipt_json');
  assertOutsideRepo(options.redactedReceiptMd, 'redacted_receipt_md');

  if (options.privateArtifactPath || requirePrivateArtifact) {
    assertOutsideRepo(options.privateArtifactPath, 'private_artifact_path');
    assertUnderRoot(options.privateArtifactPath, PRIVATE_MAILERLITE_ROOT, 'private_artifact_path');
  }

  return {
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
    privateArtifactPath: options.privateArtifactPath ? resolve(options.privateArtifactPath) : null,
    mantisReportsAllowed: isInside(options.redactedReceiptJson, MANTIS_REPORTS_ROOT)
      || isInside(options.redactedReceiptMd, MANTIS_REPORTS_ROOT),
  };
};

const asArray = (value) => Array.isArray(value) ? value : [];

const labelOf = (item) => safeLabel(item?.label ?? item?.name ?? item?.key ?? item?.title);
const rawLabelOf = (item) => cleanString(item?.label ?? item?.name ?? item?.key ?? item?.title);

const expectedEntries = (fixture, key, fallback = []) => {
  const explicit = fixture?.expectedMappings?.[key] ?? fixture?.expected?.[key] ?? fixture?.[key];
  const source = Array.isArray(explicit) ? explicit : fallback;
  return source.map((entry) => typeof entry === 'string' ? { label: entry } : entry).filter(Boolean);
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

const classifyGroup = (fixture) => {
  const expected = expectedEntries(fixture, 'groups', []).find(Boolean);
  return statusFromMatches({
    expected,
    items: fixture?.setupMetadata?.groups ?? fixture?.groups,
    allowedStatuses: GROUP_STATUS,
    confirmedStatus: 'confirmed_current_existing_label',
  });
};

const classifyAutomation = (fixture) => {
  const expected = expectedEntries(fixture, 'automations', []).find(Boolean);
  return statusFromMatches({
    expected,
    items: fixture?.setupMetadata?.automations ?? fixture?.automations,
    allowedStatuses: AUTOMATION_STATUS,
    confirmedStatus: 'confirmed_current_existing_label',
  });
};

const classifyFields = (fixture) => {
  const expected = expectedEntries(fixture, 'fields', []);
  const items = fixture?.setupMetadata?.fields ?? fixture?.fields;
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

const classifyTrigger = (fixture) => {
  const explicit = fixture?.triggerBehaviorStatus ?? fixture?.behavior?.triggerBehaviorStatus;
  if (TRIGGER_STATUS.has(explicit)) return explicit;
  if (fixture?.behavior?.confirmedGroupTrigger === true || fixture?.triggerBehavior?.confirmedGroupTrigger === true) {
    return 'confirmed_group_trigger';
  }
  return 'unknown_requires_behavior_check';
};

const classifyRetrigger = (fixture) => {
  const explicit = fixture?.retriggerBehaviorStatus ?? fixture?.behavior?.retriggerBehaviorStatus;
  if (RETRIGGER_STATUS.has(explicit)) return explicit;
  if (fixture?.behavior?.retriggerConfirmed === true || fixture?.retriggerBehavior?.confirmed === true) return 'confirmed';
  return 'unknown_blocks_mutation';
};

const classifySuppression = (fixture) => {
  const explicit = fixture?.suppressionStatus ?? fixture?.suppression?.status;
  if (SUPPRESSION_STATUS.has(explicit)) return explicit;
  if (fixture?.suppression?.aggregateVerifiedNoPrivateRows === true) return 'aggregate_verified_no_private_rows';
  return 'not_verified_no_subscriber_read';
};

const mutationReadiness = ({ groupMappingStatus, automationMappingStatus, fieldMappingStatusCounts, triggerBehaviorStatus, retriggerBehaviorStatus, suppressionStatus }) => {
  const fieldBlockers = [
    fieldMappingStatusCounts.requires_setup_inventory,
    fieldMappingStatusCounts.missing_or_not_found,
    fieldMappingStatusCounts.ambiguous,
    fieldMappingStatusCounts.not_verified,
  ].some((count) => count > 0);

  if (groupMappingStatus !== 'confirmed_current_existing_label' || automationMappingStatus !== 'confirmed_current_existing_label') {
    return 'blocked_missing_setup_inventory';
  }
  if (fieldBlockers) return 'blocked_field_mapping';
  if (triggerBehaviorStatus !== 'confirmed_group_trigger') return 'blocked_trigger_behavior_unknown';
  if (retriggerBehaviorStatus !== 'confirmed') return 'blocked_retrigger_behavior_unknown';
  if (suppressionStatus !== 'aggregate_verified_no_private_rows') return 'blocked_suppression_unknown';
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
  return [...new Set(blockers)].sort();
};

const redactedLabels = (entries) => entries.map((entry) => safeLabel(entry?.label ?? entry?.name ?? entry?.key)).filter(Boolean);

const buildReportFromFixture = (fixture, { generatedAt = new Date().toISOString() } = {}) => {
  const expectedGroups = expectedEntries(fixture, 'groups', []);
  const expectedAutomations = expectedEntries(fixture, 'automations', []);
  const expectedFields = expectedEntries(fixture, 'fields', []);
  const summary = {
    groupMappingStatus: classifyGroup(fixture),
    automationMappingStatus: classifyAutomation(fixture),
    fieldMappingStatusCounts: classifyFields(fixture),
    triggerBehaviorStatus: classifyTrigger(fixture),
    retriggerBehaviorStatus: classifyRetrigger(fixture),
    suppressionStatus: classifySuppression(fixture),
  };
  summary.mutationReadiness = mutationReadiness(summary);
  summary.blockerClasses = blockerClasses(summary);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'fixture_redaction_guard',
    finalState: 'fixture_setup_verification_receipt_created',
    sourceFamily: 'MailerLite setup/config metadata',
    command: 'npm run crm:vnext:mailerlite-setup-readonly-verification',
    sourceCounts: {
      groupsObserved: asArray(fixture?.setupMetadata?.groups ?? fixture?.groups).length,
      automationsObserved: asArray(fixture?.setupMetadata?.automations ?? fixture?.automations).length,
      fieldsObserved: asArray(fixture?.setupMetadata?.fields ?? fixture?.fields).length,
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
      liveMailerLiteApiCalled: false,
      mailerLiteUiUsed: false,
      liveSourceAccessed: false,
      subscriberRowsRead: false,
      sourceMutationPerformed: false,
      crmWritePerformed: false,
      privateArtifactRead: false,
      privateArtifactWritten: false,
      sourceOperatorReceiptWritten: true,
      rawPrivateContentPrinted: false,
      secretValuePrinted: false,
    },
    nextSafeStep: summary.mutationReadiness === 'ready_for_no_write_mutation_review'
      ? 'Request separate approval for no-write mutation review; do not mutate.'
      : 'Run one separately approved live read-only setup verification before mutation review.',
  };
};

const renderMarkdown = (report) => `# MailerLite Setup Read-Only Verification Redacted Receipt\n\n` +
  `- schema_version: \`${report.schemaVersion}\`\n` +
  `- final_state: \`${report.finalState}\`\n` +
  `- mode: \`${report.mode}\`\n` +
  `- source_family: \`${report.sourceFamily}\`\n` +
  `- group_mapping_status: \`${report.setupReadiness.groupMappingStatus}\`\n` +
  `- automation_mapping_status: \`${report.setupReadiness.automationMappingStatus}\`\n` +
  `- trigger_behavior_status: \`${report.setupReadiness.triggerBehaviorStatus}\`\n` +
  `- retrigger_behavior_status: \`${report.setupReadiness.retriggerBehaviorStatus}\`\n` +
  `- suppression_status: \`${report.setupReadiness.suppressionStatus}\`\n` +
  `- mutation_readiness: \`${report.setupReadiness.mutationReadiness}\`\n\n` +
  `## Field Mapping Status Counts\n\n` +
  Object.entries(report.setupReadiness.fieldMappingStatusCounts).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n\n## Blockers\n\n` +
  (report.setupReadiness.blockerClasses.length
    ? report.setupReadiness.blockerClasses.map((blocker) => `- \`${blocker}\``).join('\n')
    : '- none') +
  `\n\n## Closed Gates\n\n` +
  Object.entries(report.closedGates).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n\n## Next Safe Step\n\n${report.nextSafeStep}\n`;

const writeReceiptFiles = async (report, options) => {
  await mkdir(dirname(options.redactedReceiptJson), { recursive: true });
  await mkdir(dirname(options.redactedReceiptMd), { recursive: true });
  await writeFile(options.redactedReceiptJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(options.redactedReceiptMd, renderMarkdown(report), 'utf8');
};

const readFixture = async (fixtureFile) => {
  if (!fixtureFile) throw new Error('missing_fixture_file');
  const raw = await readFile(fixtureFile, 'utf8');
  return JSON.parse(raw);
};

const run = async (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }

  if (!options.fixtureFile) {
    if (!options.allowLiveReadonlySetupVerification) {
      const error = new Error('live_readonly_setup_verification_requires_explicit_approval');
      error.exitCode = 2;
      throw error;
    }
    validateOutputPaths(options, { requirePrivateArtifact: true });
    const error = new Error('live_readonly_setup_verification_not_implemented_in_fixture_task');
    error.exitCode = 2;
    throw error;
  }

  const outputPaths = validateOutputPaths(options);
  const fixture = await readFixture(options.fixtureFile);
  const report = buildReportFromFixture(fixture);
  await writeReceiptFiles(report, outputPaths);

  const compact = {
    ok: true,
    mode: report.mode,
    finalState: report.finalState,
    groupMappingStatus: report.setupReadiness.groupMappingStatus,
    automationMappingStatus: report.setupReadiness.automationMappingStatus,
    mutationReadiness: report.setupReadiness.mutationReadiness,
    redactedReceiptsWritten: true,
    liveMailerLiteApiCalled: false,
    subscriberRowsRead: false,
  };
  console.log(JSON.stringify(compact));
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
  PRIVATE_MAILERLITE_ROOT,
  REPO_ROOT,
  buildReportFromFixture,
  classifyAutomation,
  classifyFields,
  classifyGroup,
  classifyRetrigger,
  classifySuppression,
  classifyTrigger,
  mutationReadiness,
  parseArgs,
  renderMarkdown,
  run,
  validateOutputPaths,
};
