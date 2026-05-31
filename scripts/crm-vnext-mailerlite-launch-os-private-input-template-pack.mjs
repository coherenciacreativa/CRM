#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-private-input-template-pack-2026-05-28';
const DEFAULT_MISSING_INPUTS_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_EXAMPLES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_templates_2026-05-28';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_template_pack_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_template_pack_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-private-input-template-pack.mjs [options]

Options:
  --missing-inputs-kit <path> Missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --examples-dir <path>       Directory for inert .example files. Defaults to ${DEFAULT_EXAMPLES_DIR}
  --out <path>                Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>       Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --no-write-examples         Only write the report, not the inert examples.
  --help                      Show this help

Local-only template pack for private Launch OS inputs. It writes only inert
.example files that are deliberately not the active intake paths. It never
creates the private seed recipient file, never writes real identities, never asks
approval, opens no UI, calls no APIs, reads no subscribers, mutates no
MailerLite/Shopify/CRM state, sends no emails, appends no ledgers, changes no
cards/scoring and writes nothing to Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    missingInputsKit: DEFAULT_MISSING_INPUTS_KIT,
    examplesDir: DEFAULT_EXAMPLES_DIR,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    writeExamples: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--missing-inputs-kit') options.missingInputsKit = argv[++index];
    else if (arg === '--examples-dir') options.examplesDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--no-write-examples') options.writeExamples = false;
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const activePathBasename = (input) => basename(cleanString(input?.templatePathSuggestion) ?? input.id);

const examplePathFor = ({ examplesDir, input, extension }) => {
  const activeBase = activePathBasename(input);
  const ext = extension ?? extname(activeBase) ?? '';
  const stem = activeBase.replace(new RegExp(`${ext.replace('.', '\\.')}$`), '');
  return resolve(examplesDir, `${stem}.example${ext || '.txt'}`);
};

const seedExample = [
  '# Replace this whole file with one exact seed-recipient email only.',
  '# Do not add names, comments, commas, multiple addresses, or approval text.',
  '# Save the real value only to the active private path from the missing-inputs kit.',
  'seed.person@example.invalid',
  '',
].join('\n');

const observedEventsExample = {
  events: [
    {
      eventKind: 'replace_with_real_event_kind',
      sourceKind: 'mailerlite_or_manual_observation',
      channel: 'email',
      sourceId: 'replace_with_real_campaign_or_evidence_id',
      observedAt: '2026-05-28T00:00:00.000Z',
      metrics: {
        launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      },
      email: 'real.person@example.invalid',
      evidenceSourcePath: '/absolute/path/to/real/evidence.json',
    },
  ],
  factStoreMarketReview: {
    reviewed: false,
    facts: [
      {
        summary: 'Replace only after aggregate market review is complete.',
        evidenceEventIds: ['replace_with_real_event_id'],
      },
    ],
  },
};

const correctionInputsExample = {
  finalPublicLinks: {
    result_or_resource_link: 'https://replace-with-final-result-or-resource-link.example.invalid',
    practice_link: 'https://replace-with-final-practice-link.example.invalid',
    editorial_note_link: 'https://replace-with-final-editorial-note-link.example.invalid',
  },
  subscriptionReasonPolicy: 'include_once_in_all_emails',
  allowedSubscriptionReasonPolicies: [
    'include_once_in_all_emails',
    'remove_custom_line_and_rely_on_platform_footer',
  ],
};

const exampleContentFor = (input) => {
  if (input.id === 'exact_seed_recipient') return seedExample;
  if (input.gateId === 'mini_launch_seed_inbox_correction') return `${JSON.stringify(correctionInputsExample, null, 2)}\n`;
  if (input.gateId === 'crm_signal_writes') return `${JSON.stringify(observedEventsExample, null, 2)}\n`;
  return `${JSON.stringify({ replace: 'with_real_input_only_after_it_exists' }, null, 2)}\n`;
};

const buildSafety = ({ writeExamples }) => ({
  localOnly: true,
  reportsOnly: true,
  writesInertExampleFiles: writeExamples,
  createsActivePrivateInputFiles: false,
  writesRealPrivateValues: false,
  asksApproval: false,
  uiOpened: false,
  browserOpened: false,
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
  outboundPerformed: false,
  tokensPrinted: false,
  exactPrivateValuesStored: false,
});

const buildTemplateRows = ({ missingInputsKit, examplesDir }) =>
  (missingInputsKit?.inputRequests ?? []).map((input) => {
    const derivedReportOnly = input.id === 'writable_event_screen';
    const extension = input.id === 'exact_seed_recipient' ? '.txt' : '.json';
    const activePath = resolve(cleanString(input.templatePathSuggestion) ?? examplesDir);
    const examplePath = derivedReportOnly
      ? null
      : examplePathFor({ examplesDir, input, extension });
    return {
      id: input.id,
      gateId: input.gateId,
      label: input.label,
      activeInputPath: activePath,
      examplePath,
      templateKind: derivedReportOnly ? 'derived_report_no_example_file' : 'inert_example_file',
      exampleIsActiveInputPath: examplePath === activePath,
      sampleOnly: !derivedReportOnly,
      mustReplaceBeforeUse: !derivedReportOnly,
      approvalEffect: input.approvalEffect,
      intakeWillIgnoreExample: true,
      content: derivedReportOnly ? null : exampleContentFor(input),
    };
  });

const buildPrivateInputTemplatePack = ({
  missingInputsKit,
  examplesDir = DEFAULT_EXAMPLES_DIR,
  writeExamples = true,
  generatedAt = new Date().toISOString(),
}) => {
  const templateRows = buildTemplateRows({ missingInputsKit, examplesDir });
  const activePathCollisionCount = templateRows.filter((row) => row.exampleIsActiveInputPath).length;
  const exampleFileCount = new Set(templateRows.map((row) => row.examplePath).filter(Boolean)).size;
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_private_input_template_pack',
    generatedAt,
    ok: activePathCollisionCount === 0,
    status: activePathCollisionCount === 0
      ? 'private_input_template_pack_ready_no_live_changes'
      : 'private_input_template_pack_blocked_active_path_collision_no_live_changes',
    executiveSummary: {
      missingInputsKitStatus: missingInputsKit?.status ?? null,
      templateCount: templateRows.length,
      exampleFileCount,
      writeExamples,
      examplesDir: resolve(examplesDir),
      activePathCollisionCount,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: 'copy_real_values_into_active_private_paths_only_when_they_exist',
    },
    templateRows: templateRows.map(({ content, ...row }) => row),
    hardStops: [
      'Example files are inert scaffolds, not private input files.',
      'Do not rename .example files into active inputs unless the real value exists.',
      'Do not use example identities, example facts or .invalid emails as launch evidence.',
      'Do not paste final public URLs into shared reports; real correction inputs belong in the private active path only.',
      'This template pack is not approval for seed sends, CRM writes, Fact Store writes or live operations.',
      'After real inputs exist, rerun missing-inputs intake and the relevant approval packet before any execution.',
    ],
    safety: buildSafety({ writeExamples }),
  };
};

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const writeExamples = async (templateRows) => {
  const written = [];
  const seen = new Set();
  for (const row of templateRows) {
    if (!row.examplePath || !row.content || seen.has(row.examplePath)) continue;
    if (row.exampleIsActiveInputPath) {
      throw new Error(`example_active_path_collision:${row.id}:${row.examplePath}`);
    }
    seen.add(row.examplePath);
    written.push(await writeText(row.examplePath, row.content));
  }
  return written;
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Private Input Template Pack',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Templates: ${report.executiveSummary.templateCount}`,
  `Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `Open live mutation gates: ${report.executiveSummary.openLiveMutationGateCount}`,
  '',
  '## Templates',
  '',
  ...report.templateRows.flatMap((row) => [
    `### ${row.id}`,
    '',
    `- Gate: ${row.gateId}`,
    `- Template kind: ${row.templateKind}`,
    `- Example path: ${row.examplePath ?? 'none - derived report only'}`,
    `- Active input path: ${row.activeInputPath}`,
    `- Example is active path: ${row.exampleIsActiveInputPath}`,
    `- Approval effect: ${row.approvalEffect}`,
    '',
  ]),
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Writes inert example files: ${report.safety.writesInertExampleFiles}`,
  `- Creates active private input files: ${report.safety.createsActivePrivateInputFiles}`,
  `- Writes real private values: ${report.safety.writesRealPrivateValues}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const buildFromFiles = async (options) => {
  const missingInputsKit = await readJson(options.missingInputsKit);
  return buildPrivateInputTemplatePack({
    missingInputsKit,
    examplesDir: options.examplesDir,
    writeExamples: options.writeExamples,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const missingInputsKit = await readJson(options.missingInputsKit);
  const templateRowsWithContent = buildTemplateRows({
    missingInputsKit,
    examplesDir: options.examplesDir,
  });
  if (options.writeExamples) await writeExamples(templateRowsWithContent);

  const report = buildPrivateInputTemplatePack({
    missingInputsKit,
    examplesDir: options.examplesDir,
    writeExamples: options.writeExamples,
  });

  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    templateCount: report.executiveSummary.templateCount,
    examplesDir: report.executiveSummary.examplesDir,
    canAskApprovalNow: report.executiveSummary.canAskApprovalNow,
    openLiveMutationGateCount: report.executiveSummary.openLiveMutationGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS private-input template pack failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPrivateInputTemplatePack,
  buildSafety,
  buildTemplateRows,
  parseArgs,
  renderMarkdown,
};
