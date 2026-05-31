#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-current-state-refresh-2026-05-31';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs [options]

Options:
  --date <YYYY-MM-DD>       Report date. Defaults to today's ISO date
  --reports-dir <path>      Report output directory. Defaults to ${DEFAULT_REPORTS_DIR}
  --out <path>              Refresh receipt JSON output
  --markdown-out <path>     Refresh receipt Markdown output
  --skip-validation         Skip node --check and focused Vitest commands
  --help                    Show this help

Local-only current-state refresh runner. It runs syntax checks, focused tests,
then regenerates the Launch OS operator runbook, goal audit, validation receipt
and a refresh receipt. It never calls MailerLite, Shopify or CRM live APIs,
opens UI, reads or mutates subscribers, creates groups, edits workflows, sends
emails, appends ledgers, writes cards, changes scoring, writes Fact Store, or
prints tokens.`;

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const mdPathFor = (path) => path.replace(/\.json$/u, '.md');
const reportPath = (reportsDir, name, date) => resolve(reportsDir, `${name}_current_${date}.json`);

const parseArgs = (argv) => {
  const options = {
    date: todayIsoDate(),
    reportsDir: DEFAULT_REPORTS_DIR,
    out: null,
    markdownOut: null,
    skipValidation: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--date') options.date = argv[++index];
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--skip-validation') options.skipValidation = true;
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(options.date)) {
    throw new Error(`invalid_date:${options.date}`);
  }

  options.reportsDir = resolve(options.reportsDir);
  const defaultOut = reportPath(options.reportsDir, 'mailerlite_launch_os_current_state_refresh', options.date);
  options.out = resolve(options.out ?? defaultOut);
  options.markdownOut = resolve(options.markdownOut ?? mdPathFor(options.out));

  return options;
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
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
  'uiOpened',
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

const buildReportPaths = ({ date, reportsDir }) => {
  const paths = {
    approvalQueue: reportPath(reportsDir, 'mailerlite_launch_os_approval_queue', date),
    approvalIntake: reportPath(reportsDir, 'mailerlite_launch_os_approval_intake', date),
    blockedGateHandoff: reportPath(reportsDir, 'mailerlite_launch_os_blocked_gate_handoff', date),
    missingInputsKit: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_kit', date),
    missingInputsIntake: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_intake', date),
    missingInputsRequestBundle: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_request_bundle', date),
    privateInputTemplatePack: reportPath(reportsDir, 'mailerlite_launch_os_private_input_template_pack', date),
    postInputOrchestrator: reportPath(reportsDir, 'mailerlite_launch_os_post_input_orchestrator', date),
    taxonomyRefreshResponseRequestBundle: reportPath(
      reportsDir,
      'mailerlite_launch_os_taxonomy_refresh_response_request_bundle',
      date,
    ),
    continuationGuard: reportPath(reportsDir, 'mailerlite_launch_os_continuation_guard', date),
    operatorRunbook: reportPath(reportsDir, 'mailerlite_launch_os_operator_runbook', date),
    goalAudit: reportPath(reportsDir, 'mailerlite_launch_os_v0_goal_audit', date),
    validationReceipt: reportPath(reportsDir, 'mailerlite_launch_os_validation_receipt', date),
    currentStateRefresh: reportPath(reportsDir, 'mailerlite_launch_os_current_state_refresh', date),
  };

  return Object.fromEntries(
    Object.entries(paths).flatMap(([key, jsonPath]) => [
      [key, jsonPath],
      [`${key}Markdown`, mdPathFor(jsonPath)],
    ]),
  );
};

const command = (id, bin, args, purpose) => ({ id, bin, args, purpose });
const formatCommand = ({ bin, args }) => [bin, ...args].join(' ');

const validationCommands = () => [
  command(
    'node_check_current_state_refresh',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs'],
    'syntax-check current-state refresh runner',
  ),
  command(
    'node_check_operator_runbook',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs'],
    'syntax-check operator runbook',
  ),
  command(
    'node_check_goal_audit',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs'],
    'syntax-check goal audit',
  ),
  command(
    'node_check_validation_receipt',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs'],
    'syntax-check validation receipt',
  ),
  command(
    'focused_vitest',
    'npm',
    [
      'exec',
      'vitest',
      'run',
      '__tests__/crm-vnext-mailerlite-launch-os-current-state-refresh.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-operator-runbook.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-goal-audit.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-validation-receipt.spec.ts',
    ],
    'focused Launch OS current-state validation suite',
  ),
];

const currentStateArgs = (paths) => [
  '--approval-queue',
  paths.approvalQueue,
  '--approval-intake',
  paths.approvalIntake,
  '--blocked-gate-handoff',
  paths.blockedGateHandoff,
  '--missing-inputs-kit',
  paths.missingInputsKit,
  '--missing-inputs-intake',
  paths.missingInputsIntake,
  '--missing-inputs-request-bundle',
  paths.missingInputsRequestBundle,
  '--private-input-template-pack',
  paths.privateInputTemplatePack,
  '--post-input-orchestrator',
  paths.postInputOrchestrator,
  '--taxonomy-refresh-response-request-bundle',
  paths.taxonomyRefreshResponseRequestBundle,
  '--continuation-guard',
  paths.continuationGuard,
  '--validation-receipt',
  paths.validationReceipt,
];

const buildValidationSummary = (validationResult) => {
  if (!validationResult.runValidation) return 'Validation skipped by operator; report regeneration remained local-only.';
  return [
    'Local current-state refresh validation passed:',
    'node --check for current-state refresh, operator runbook, goal audit and validation receipt;',
    `focused Vitest ${validationResult.testFiles ?? 'unknown'} files / ${validationResult.testCount ?? 'unknown'} tests;`,
    'no live actions.',
  ].join(' ');
};

const buildReportCommands = (paths, validationResult) => {
  const validationSummary = buildValidationSummary(validationResult);
  const validationCommandStrings = validationResult.commands.map((entry) => formatCommand(entry));
  const validationReceiptArgs = [
    '--runbook',
    paths.operatorRunbook,
    '--goal-audit',
    paths.goalAudit,
    '--continuation-guard',
    paths.continuationGuard,
    '--missing-inputs-intake',
    paths.missingInputsIntake,
    '--missing-inputs-request-bundle',
    paths.missingInputsRequestBundle,
    '--private-input-template-pack',
    paths.privateInputTemplatePack,
    '--post-input-orchestrator',
    paths.postInputOrchestrator,
    '--taxonomy-refresh-response-request-bundle',
    paths.taxonomyRefreshResponseRequestBundle,
    '--validation-status',
    validationResult.runValidation ? 'passed' : 'needs_validation',
    '--validation-summary',
    validationSummary,
    '--test-files',
    String(validationResult.testFiles ?? 0),
    '--test-count',
    String(validationResult.testCount ?? 0),
    '--out',
    paths.validationReceipt,
    '--markdown-out',
    paths.validationReceiptMarkdown,
  ];

  for (const validationCommandString of validationCommandStrings) {
    validationReceiptArgs.push('--command', validationCommandString);
  }

  return [
    command(
      'refresh_operator_runbook',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-operator-runbook',
        '--',
        ...currentStateArgs(paths),
        '--out',
        paths.operatorRunbook,
        '--markdown-out',
        paths.operatorRunbookMarkdown,
      ],
      'regenerate current Launch OS operator runbook report',
    ),
    command(
      'refresh_goal_audit',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-goal-audit',
        '--',
        '--runbook',
        paths.operatorRunbook,
        ...currentStateArgs(paths),
        '--validation-status',
        validationResult.runValidation ? 'passed' : 'needs_validation',
        '--validation-summary',
        validationSummary,
        '--out',
        paths.goalAudit,
        '--markdown-out',
        paths.goalAuditMarkdown,
      ],
      'regenerate current Launch OS goal audit report',
    ),
    command(
      'refresh_validation_receipt',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-validation-receipt',
        '--',
        ...validationReceiptArgs,
      ],
      'regenerate current Launch OS validation receipt report',
    ),
  ];
};

const buildCurrentStateRefreshPlan = ({ date, reportsDir, skipValidation = false }) => {
  const paths = buildReportPaths({ date, reportsDir });
  const checks = skipValidation ? [] : validationCommands();
  const placeholderValidation = {
    runValidation: !skipValidation,
    commands: checks,
    testFiles: null,
    testCount: null,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    date,
    reportsDir: resolve(reportsDir),
    paths,
    validationCommands: checks,
    reportCommands: buildReportCommands(paths, placeholderValidation),
    safety: buildSafety(),
  };
};

const assertLocalOnlyCommandPlan = (plan) => {
  const allCommands = [...plan.validationCommands, ...plan.reportCommands];
  const forbiddenArgs = new Set(['--write', '--execute']);
  const forbiddenScripts = [
    'crm:vnext:mailerlite-mini-launch-empty-group-create',
    'crm:vnext:mailerlite-onboarding-v2-empty-groups-create',
    'crm:vnext:mailerlite-brujula-test-lane-apply',
  ];

  for (const entry of allCommands) {
    if (entry.args.some((arg) => forbiddenArgs.has(arg))) {
      throw new Error(`non_local_command_arg:${entry.id}`);
    }
    if (entry.args.some((arg) => forbiddenScripts.includes(arg))) {
      throw new Error(`live_or_live_adjacent_script_not_allowed:${entry.id}`);
    }
  }

  if (!safetyClosed(plan.safety)) throw new Error('safety_not_closed');
  return true;
};

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/gu, '');
const tailText = (value, maxLines = 60) => stripAnsi(value ?? '').trim().split('\n').filter(Boolean).slice(-maxLines).join('\n');

const runCommand = (entry) => {
  const startedAt = new Date().toISOString();
  const result = spawnSync(entry.bin, entry.args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: false,
  });
  const finishedAt = new Date().toISOString();
  const stdoutTail = tailText(result.stdout);
  const stderrTail = tailText(result.stderr);

  return {
    id: entry.id,
    purpose: entry.purpose,
    command: formatCommand(entry),
    startedAt,
    finishedAt,
    exitCode: result.status ?? 1,
    signal: result.signal,
    ok: result.status === 0,
    stdoutTail,
    stderrTail,
    error: result.error ? result.error.message : null,
  };
};

const parseVitestCounts = (results) => {
  const vitest = results.find((result) => result.id === 'focused_vitest');
  if (!vitest) return { testFiles: null, testCount: null };
  const output = stripAnsi(`${vitest.stdoutTail}\n${vitest.stderrTail}`);
  const filesMatch = output.match(/Test Files\s+(\d+) passed/u);
  const testsMatch = output.match(/Tests\s+(\d+) passed/u);
  return {
    testFiles: filesMatch ? Number(filesMatch[1]) : null,
    testCount: testsMatch ? Number(testsMatch[1]) : null,
  };
};

const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const summarizeGeneratedReports = async (paths) => {
  const [runbook, goalAudit, validationReceipt] = await Promise.all([
    readOptionalJson(paths.operatorRunbook),
    readOptionalJson(paths.goalAudit),
    readOptionalJson(paths.validationReceipt),
  ]);

  return {
    operatorRunbook: {
      path: paths.operatorRunbook,
      markdownPath: paths.operatorRunbookMarkdown,
      status: runbook?.status ?? null,
      ok: runbook?.ok ?? null,
      openLiveGateCount: runbook?.currentState?.liveGates?.openLiveGateCount ?? null,
      validationStatus: runbook?.currentState?.validation?.validationStatus ?? null,
    },
    goalAudit: {
      path: paths.goalAudit,
      markdownPath: paths.goalAuditMarkdown,
      status: goalAudit?.status ?? null,
      ok: goalAudit?.ok ?? null,
      readyForLiveOperation: goalAudit?.executiveSummary?.readyForLiveOperation ?? null,
      liveActionAllowedNow: goalAudit?.executiveSummary?.liveActionAllowedNow ?? null,
      provenCount: goalAudit?.executiveSummary?.provenCount ?? null,
      partialCount: goalAudit?.executiveSummary?.partialCount ?? null,
      blockedCount: goalAudit?.executiveSummary?.blockedCount ?? null,
    },
    validationReceipt: {
      path: paths.validationReceipt,
      markdownPath: paths.validationReceiptMarkdown,
      status: validationReceipt?.status ?? null,
      ok: validationReceipt?.ok ?? null,
      validationStatus: validationReceipt?.validationStatus ?? null,
      liveGatesClosed: validationReceipt?.evidence?.liveGatesClosed ?? null,
      testFiles: validationReceipt?.testScope?.testFiles ?? null,
      testCount: validationReceipt?.testScope?.testCount ?? null,
    },
  };
};

const buildRefreshReceipt = ({
  options,
  paths,
  validationResults,
  reportResults,
  generatedReports,
  validationResult,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const commandResults = [...validationResults, ...reportResults];
  const ok = commandResults.every((result) => result.ok)
    && generatedReports.operatorRunbook.ok === true
    && generatedReports.goalAudit.ok === true
    && generatedReports.validationReceipt.ok === true
    && generatedReports.validationReceipt.liveGatesClosed === true
    && safetyClosed(safety);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    ok,
    status: ok
      ? 'mailerlite_launch_os_current_state_refresh_ready_no_live_changes'
      : 'mailerlite_launch_os_current_state_refresh_failed_no_live_changes',
    date: options.date,
    reportsDir: resolve(options.reportsDir),
    controlRoom: CONTROL_ROOM,
    packageJson: PACKAGE_JSON,
    validation: {
      runValidation: validationResult.runValidation,
      testFiles: validationResult.testFiles,
      testCount: validationResult.testCount,
      summary: buildValidationSummary(validationResult),
    },
    generatedReports,
    commandResults,
    safety,
    hardStops: [
      'No live MailerLite API calls.',
      'No MailerLite UI operation.',
      'No Shopify or CRM live API calls.',
      'No subscriber, group, workflow or send mutations.',
      'No ledgers, cards, scoring or Fact Store writes.',
      'Stop before any future live gate or exact approval phrase.',
    ],
    outputs: {
      json: resolve(options.out),
      markdown: resolve(options.markdownOut),
      currentStateRefresh: paths.currentStateRefresh,
      currentStateRefreshMarkdown: paths.currentStateRefreshMarkdown,
    },
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (receipt) => [
  '# MailerLite Launch OS v0 - Current-State Refresh',
  '',
  `Generated: ${receipt.generatedAt}`,
  `Status: ${receipt.status}`,
  `Validation: ${receipt.validation.summary}`,
  '',
  '## Generated Reports',
  '',
  `- Operator runbook: ${receipt.generatedReports.operatorRunbook.path}`,
  `- Goal audit: ${receipt.generatedReports.goalAudit.path}`,
  `- Validation receipt: ${receipt.generatedReports.validationReceipt.path}`,
  `- Refresh receipt: ${receipt.outputs.json}`,
  '',
  '## Confirmed Results',
  '',
  `- operator-runbook: status=${receipt.generatedReports.operatorRunbook.status}, openLiveGateCount=${receipt.generatedReports.operatorRunbook.openLiveGateCount}`,
  `- goal-audit: status=${receipt.generatedReports.goalAudit.status}, readyForLiveOperation=${receipt.generatedReports.goalAudit.readyForLiveOperation}, liveActionAllowedNow=${receipt.generatedReports.goalAudit.liveActionAllowedNow}`,
  `- validation-receipt: status=${receipt.generatedReports.validationReceipt.status}, validationStatus=${receipt.generatedReports.validationReceipt.validationStatus}, liveGatesClosed=${receipt.generatedReports.validationReceipt.liveGatesClosed}`,
  `- focused validation: ${receipt.validation.testFiles ?? 'unknown'} files / ${receipt.validation.testCount ?? 'unknown'} tests`,
  '',
  '## Commands',
  '',
  renderList(receipt.commandResults.map((result) => `${result.ok ? 'ok' : 'failed'}: ${result.command}`)),
  '',
  '## Hard Stops',
  '',
  renderList(receipt.hardStops),
  '',
  '## Safety',
  '',
  '- Local-only reports refresh.',
  '- No MailerLite, Shopify or CRM live API calls.',
  '- No UI opened.',
  '- No subscribers read or mutated.',
  '- No group, workflow, send, ledger, card, score or Fact Store mutation.',
].join('\n');

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

  const plan = buildCurrentStateRefreshPlan(options);
  assertLocalOnlyCommandPlan(plan);

  const validationResults = [];
  if (!options.skipValidation) {
    for (const entry of plan.validationCommands) {
      const result = runCommand(entry);
      validationResults.push(result);
      if (!result.ok) {
        const validationResult = {
          runValidation: true,
          commands: plan.validationCommands,
          testFiles: null,
          testCount: null,
        };
        const generatedReports = await summarizeGeneratedReports(plan.paths);
        const receipt = buildRefreshReceipt({
          options,
          paths: plan.paths,
          validationResults,
          reportResults: [],
          generatedReports,
          validationResult,
        });
        await writeJson(options.out, receipt);
        await writeText(options.markdownOut, renderMarkdown(receipt));
        throw new Error(`validation_command_failed:${entry.id}`);
      }
    }
  }

  const vitestCounts = parseVitestCounts(validationResults);
  const validationResult = {
    runValidation: !options.skipValidation,
    commands: plan.validationCommands,
    testFiles: vitestCounts.testFiles,
    testCount: vitestCounts.testCount,
  };
  const reportCommands = buildReportCommands(plan.paths, validationResult);
  const reportResults = [];

  for (const entry of reportCommands) {
    const result = runCommand(entry);
    reportResults.push(result);
    if (!result.ok) {
      const generatedReports = await summarizeGeneratedReports(plan.paths);
      const receipt = buildRefreshReceipt({
        options,
        paths: plan.paths,
        validationResults,
        reportResults,
        generatedReports,
        validationResult,
      });
      await writeJson(options.out, receipt);
      await writeText(options.markdownOut, renderMarkdown(receipt));
      throw new Error(`report_command_failed:${entry.id}`);
    }
  }

  const generatedReports = await summarizeGeneratedReports(plan.paths);
  const receipt = buildRefreshReceipt({
    options,
    paths: plan.paths,
    validationResults,
    reportResults,
    generatedReports,
    validationResult,
  });

  await writeJson(options.out, receipt);
  await writeText(options.markdownOut, renderMarkdown(receipt));

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    generatedAt: receipt.generatedAt,
    testFiles: receipt.validation.testFiles,
    testCount: receipt.validation.testCount,
    operatorRunbookStatus: receipt.generatedReports.operatorRunbook.status,
    openLiveGateCount: receipt.generatedReports.operatorRunbook.openLiveGateCount,
    goalAuditStatus: receipt.generatedReports.goalAudit.status,
    readyForLiveOperation: receipt.generatedReports.goalAudit.readyForLiveOperation,
    liveActionAllowedNow: receipt.generatedReports.goalAudit.liveActionAllowedNow,
    validationReceiptStatus: receipt.generatedReports.validationReceipt.status,
    liveGatesClosed: receipt.generatedReports.validationReceipt.liveGatesClosed,
    out: receipt.outputs.json,
    markdownOut: receipt.outputs.markdown,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS current-state refresh failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  assertLocalOnlyCommandPlan,
  buildCurrentStateRefreshPlan,
  buildRefreshReceipt,
  buildReportCommands,
  buildReportPaths,
  buildSafety,
  formatCommand,
  parseArgs,
  parseVitestCounts,
  renderMarkdown,
};
