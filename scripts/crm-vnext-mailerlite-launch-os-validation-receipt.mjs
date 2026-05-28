#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-validation-receipt-2026-05-27';

const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-27.json';
const DEFAULT_GOAL_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_TRUNK_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_trunk_map_2026-05-27.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const DEFAULT_COMMANDS = [
  'node --check scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-approval-intake.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-local-email-asset-plan.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-asset-build-scope-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-builder-payload-manifest.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-asset-build.mjs',
  'npm exec vitest run __tests__/crm-vnext-mailerlite*.spec.ts',
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs [options]

Options:
  --runbook <path>               Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --goal-audit <path>            Goal audit JSON. Defaults to ${DEFAULT_GOAL_AUDIT}
  --onboarding-trunk-map <path>  Onboarding trunk map JSON. Defaults to ${DEFAULT_ONBOARDING_TRUNK_MAP}
  --package-json <path>          package.json. Defaults to ${DEFAULT_PACKAGE_JSON}
  --validation-status <status>   passed | failed | needs_validation. Defaults to needs_validation
  --validation-summary <text>    Required when status is passed
  --test-files <number>          Test file count from the validation run
  --test-count <number>          Test count from the validation run
  --command <command>            Command that was run. Can be repeated
  --out <path>                   Write JSON receipt
  --markdown-out <path>          Write Markdown receipt
  --help                         Show this help

Local-only validation receipt. It records test/check evidence after the operator
actually runs validation. It never calls MailerLite, Shopify or CRM live APIs,
reads subscribers, mutates groups/workflows/cards, sends emails, writes ledgers
or prints tokens.`;

const parseInteger = (value, name) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`invalid_${name}:${value}`);
  return parsed;
};

const parseArgs = (argv) => {
  const options = {
    runbook: DEFAULT_RUNBOOK,
    goalAudit: DEFAULT_GOAL_AUDIT,
    onboardingTrunkMap: DEFAULT_ONBOARDING_TRUNK_MAP,
    packageJson: DEFAULT_PACKAGE_JSON,
    validationStatus: 'needs_validation',
    validationSummary: null,
    testFiles: null,
    testCount: null,
    commands: [],
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--goal-audit') options.goalAudit = argv[++index];
    else if (arg === '--onboarding-trunk-map') options.onboardingTrunkMap = argv[++index];
    else if (arg === '--package-json') options.packageJson = argv[++index];
    else if (arg === '--validation-status') options.validationStatus = argv[++index];
    else if (arg === '--validation-summary') options.validationSummary = argv[++index];
    else if (arg === '--test-files') options.testFiles = parseInteger(argv[++index], 'test_files');
    else if (arg === '--test-count') options.testCount = parseInteger(argv[++index], 'test_count');
    else if (arg === '--command') options.commands.push(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!['passed', 'failed', 'needs_validation'].includes(options.validationStatus)) {
    throw new Error(`invalid_validation_status:${options.validationStatus}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const digestFor = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const packageHas = (packageJson, scriptName) => Boolean(packageJson?.scripts?.[scriptName]);

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  tokensPrinted: false,
});

const safetyClosed = (safety) => [
  'externalMessagesSent',
  'mailerLiteApiCalled',
  'shopifyApiCalled',
  'crmLiveApiCalled',
  'subscribersRead',
  'subscriberMutationsPerformed',
  'groupMutationsPerformed',
  'workflowMutationsPerformed',
  'sendsPerformed',
  'signalLedgerAppendPerformed',
  'crmCardMutationsPerformed',
  'crmScoreMutationsPerformed',
  'factStoreWritePerformed',
  'tokensPrinted',
].every((key) => safety[key] === false);

const buildValidationReceipt = ({
  runbook,
  goalAudit,
  onboardingTrunkMap,
  packageJson,
  sourceDigests = [],
  validationStatus = 'needs_validation',
  validationSummary = null,
  testFiles = null,
  testCount = null,
  commands = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const commandList = commands.length > 0 ? commands : DEFAULT_COMMANDS;
  const liveGatesClosed = runbook?.currentState?.liveGates?.openLiveGateCount === 0
    && (runbook?.currentState?.approvalQueue?.openLiveMutationGateCount ?? 0) === 0
    && goalAudit?.safety?.mailerLiteApiCalled === false
    && goalAudit?.safety?.shopifyApiCalled === false
    && goalAudit?.safety?.crmLiveApiCalled === false
    && goalAudit?.safety?.sendsPerformed === false
    && safetyClosed(safety);
  const requiredScriptsPresent = [
    'crm:vnext:mailerlite-launch-os-operator-runbook',
    'crm:vnext:mailerlite-launch-os-approval-queue',
    'crm:vnext:mailerlite-launch-os-approval-intake',
    'crm:vnext:mailerlite-launch-os-goal-audit',
    'crm:vnext:mailerlite-launch-os-validation-receipt',
    'crm:vnext:mailerlite-onboarding-trunk-map',
    'crm:vnext:mailerlite-mini-launch-department-review-response-watcher',
    'crm:vnext:mailerlite-mini-launch-local-email-asset-plan',
    'crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet',
    'crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest',
    'crm:vnext:mailerlite-mini-launch-email-render-qa-packet',
    'crm:vnext:mailerlite-mini-launch-email-asset-build',
  ].every((scriptName) => packageHas(packageJson, scriptName));
  const trunkMapReady = onboardingTrunkMap?.status === 'onboarding_trunk_map_ready_no_live_changes';
  const canMarkPassed = validationStatus === 'passed'
    && Boolean(validationSummary)
    && liveGatesClosed
    && requiredScriptsPresent
    && trunkMapReady
    && testFiles !== null
    && testCount !== null;
  const normalizedValidationStatus = canMarkPassed
    ? 'passed'
    : validationStatus === 'failed'
      ? 'failed'
      : 'needs_validation';
  const status = canMarkPassed
    ? 'mailerlite_launch_os_validation_receipt_ready_no_live_changes'
    : normalizedValidationStatus === 'failed'
      ? 'mailerlite_launch_os_validation_receipt_failed_no_live_changes'
      : 'mailerlite_launch_os_validation_receipt_needs_validation_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_validation_receipt',
    generatedAt,
    ok: true,
    status,
    validationStatus: normalizedValidationStatus,
    validationSummary,
    testScope: {
      testFiles,
      testCount,
      commands: commandList,
      commandCount: commandList.length,
    },
    evidence: {
      runbookStatus: runbook?.status ?? null,
      goalAuditStatus: goalAudit?.status ?? null,
      goalAuditReadyForLiveOperation: goalAudit?.executiveSummary?.readyForLiveOperation ?? null,
      goalAuditLiveActionAllowedNow: goalAudit?.executiveSummary?.liveActionAllowedNow ?? null,
      onboardingTrunkMapStatus: onboardingTrunkMap?.status ?? null,
      packageRequiredScriptsPresent: requiredScriptsPresent,
      liveGatesClosed,
    },
    hardStops: [
      'This receipt cannot approve live action.',
      'A passed receipt only proves local checks/tests for the current Launch OS surface.',
      'MailerLite, Shopify, CRM, workflows, subscribers, sends, ledgers, cards, scoring and Fact Store remain closed until exact approval.',
    ],
    safety,
    sourceDigests,
  };
};

const buildValidationReceiptFromFiles = async (options) => {
  const [
    runbook,
    goalAudit,
    onboardingTrunkMap,
    packageJson,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.runbook),
    readJson(options.goalAudit),
    readJson(options.onboardingTrunkMap),
    readJson(options.packageJson),
    Promise.all([
      digestFor(options.runbook, 'operator runbook state and closed gates'),
      digestFor(options.goalAudit, 'goal audit status and safety posture'),
      digestFor(options.onboardingTrunkMap, 'protected onboarding trunk evidence'),
      digestFor(options.packageJson, 'available Launch OS scripts'),
    ]),
  ]);

  return buildValidationReceipt({
    runbook,
    goalAudit,
    onboardingTrunkMap,
    packageJson,
    sourceDigests,
    validationStatus: options.validationStatus,
    validationSummary: options.validationSummary,
    testFiles: options.testFiles,
    testCount: options.testCount,
    commands: options.commands,
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (receipt) => {
  const lines = [
    '# MailerLite Launch OS v0 - Validation Receipt',
    '',
    `Generated: ${receipt.generatedAt}`,
    `Status: ${receipt.status}`,
    `Validation status: ${receipt.validationStatus}`,
    `Validation summary: ${receipt.validationSummary ?? 'not supplied'}`,
    '',
    '## Executive Summary',
    '',
    `- Test files: ${receipt.testScope.testFiles ?? 'not supplied'}`,
    `- Tests: ${receipt.testScope.testCount ?? 'not supplied'}`,
    `- Live gates closed: ${receipt.evidence.liveGatesClosed}`,
    `- Required scripts present: ${receipt.evidence.packageRequiredScriptsPresent}`,
    `- Goal audit live action allowed now: ${receipt.evidence.goalAuditLiveActionAllowedNow}`,
    '',
    '## Commands',
    '',
    renderList(receipt.testScope.commands),
    '',
    '## Hard Stops',
    '',
    renderList(receipt.hardStops),
    '',
    '## Fuentes Consultadas',
    '',
  ];

  for (const source of receipt.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor}; sha256=${source.sha256})`);
  }

  lines.push('', '## Safety', '');
  lines.push('- No live actions.');
  lines.push('- No MailerLite, Shopify or CRM live API calls.');
  lines.push('- No subscribers read or mutated.');
  lines.push('- No group, workflow, send, ledger, card, score or Fact Store mutation.');

  return lines.join('\n');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const receipt = await buildValidationReceiptFromFiles(options);
  if (options.out) await writeJson(options.out, receipt);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(receipt));

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    validationStatus: receipt.validationStatus,
    generatedAt: receipt.generatedAt,
    testFiles: receipt.testScope.testFiles,
    testCount: receipt.testScope.testCount,
    liveGatesClosed: receipt.evidence.liveGatesClosed,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS validation receipt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSafety,
  buildValidationReceipt,
  buildValidationReceiptFromFiles,
  parseArgs,
  renderMarkdown,
};
