#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-post-input-orchestrator-2026-05-28';
const DEFAULT_MISSING_INPUTS_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json';
const DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_template_pack_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_post_input_orchestrator_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_post_input_orchestrator_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-post-input-orchestrator.mjs [options]

Options:
  --missing-inputs-intake <path>       Missing-inputs intake JSON. Defaults to ${DEFAULT_MISSING_INPUTS_INTAKE}
  --missing-inputs-request-bundle <path> Missing-input request bundle JSON. Defaults to ${DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE}
  --private-input-template-pack <path> Private-input template pack JSON. Defaults to ${DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK}
  --out <path>                        Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                              Show this help

Local-only post-input orchestrator for MailerLite Launch OS. It reads the
redacted input intake and produces the exact local packet-regeneration plan for
when private inputs exist. It does not run commands, ask approval, open UI, call
live APIs, read subscribers, mutate MailerLite/Shopify/CRM, send emails, append
ledgers, change cards/scoring, write Fact Store, or print private values.`;

const parseArgs = (argv) => {
  const options = {
    missingInputsIntake: DEFAULT_MISSING_INPUTS_INTAKE,
    missingInputsRequestBundle: DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE,
    privateInputTemplatePack: DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--missing-inputs-intake') options.missingInputsIntake = argv[++index];
    else if (arg === '--missing-inputs-request-bundle') options.missingInputsRequestBundle = argv[++index];
    else if (arg === '--private-input-template-pack') options.privateInputTemplatePack = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const sourceDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const content = await readFile(resolved, 'utf8');
  return {
    path: resolved,
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  commandsExecuted: false,
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

const commandAllowed = (command) => {
  if (typeof command !== 'string' || !command.startsWith('npm run ')) return false;
  const allowedScripts = [
    'crm:vnext:mailerlite-mini-launch-seed-send-approval-packet',
    'crm:vnext:mailerlite-mini-launch-crm-write-approval-packet',
    'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-preview',
    'crm:vnext:mailerlite-launch-os-missing-inputs-intake',
    'crm:vnext:mailerlite-launch-os-blocked-gate-handoff',
    'crm:vnext:mailerlite-launch-os-operator-runbook',
    'crm:vnext:mailerlite-launch-os-goal-audit',
    'crm:vnext:mailerlite-launch-os-validation-receipt',
  ];
  return allowedScripts.some((script) => command.startsWith(`npm run ${script}`));
};

const buildActionPlan = ({ intake }) => {
  const commands = [];
  const seedCommand = intake?.postInputCommands?.seedApprovalPacket ?? null;
  const crmCommand = intake?.postInputCommands?.crmWriteApprovalPacket ?? null;
  const miniLaunchCorrectionCommand = intake?.postInputCommands?.miniLaunchCorrectionPreview ?? null;

  if (intake?.executiveSummary?.readyForSeedApprovalPacket === true && seedCommand) {
    commands.push({
      id: 'regenerate_seed_send_approval_packet',
      gateId: 'mini_launch_seed_send',
      command: seedCommand,
      allowedByOrchestrator: commandAllowed(seedCommand),
      effect: 'local_packet_regeneration_only',
      stillRequiresLaterApproval: true,
    });
  }

  if (intake?.executiveSummary?.readyForCrmWritePacketRegeneration === true && crmCommand) {
    commands.push({
      id: 'regenerate_crm_write_approval_packet',
      gateId: 'crm_signal_writes',
      command: crmCommand,
      allowedByOrchestrator: commandAllowed(crmCommand),
      effect: 'local_packet_regeneration_only',
      stillRequiresLaterApproval: true,
    });
  }

  if (intake?.executiveSummary?.readyForMiniLaunchCorrectionPreview === true && miniLaunchCorrectionCommand) {
    commands.push({
      id: 'prepare_mini_launch_seed_inbox_correction_preview',
      gateId: 'mini_launch_seed_inbox_correction',
      command: miniLaunchCorrectionCommand,
      allowedByOrchestrator: commandAllowed(miniLaunchCorrectionCommand),
      effect: 'local_redacted_corrected_payload_preview_only',
      stillRequiresLaterApproval: true,
    });
  }

  const followUpCommands = [
    'npm run crm:vnext:mailerlite-launch-os-missing-inputs-intake',
    'npm run crm:vnext:mailerlite-launch-os-blocked-gate-handoff',
    'npm run crm:vnext:mailerlite-launch-os-operator-runbook',
    'npm run crm:vnext:mailerlite-launch-os-goal-audit',
    'npm run crm:vnext:mailerlite-launch-os-validation-receipt',
  ].map((command) => ({
    id: command.split(':').at(-1),
    command,
    allowedByOrchestrator: commandAllowed(command),
    effect: 'refresh_local_control_room_only',
    stillRequiresLaterApproval: false,
  }));

  return {
    readyCommandCount: commands.length,
    commands,
    followUpCommands,
    allReadyCommandsAllowed: commands.every((command) => command.allowedByOrchestrator),
  };
};

const buildPostInputOrchestrator = ({
  intake,
  requestBundle,
  privateInputTemplatePack,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const actionPlan = buildActionPlan({ intake });
  const readyInputCount = intake?.executiveSummary?.readyInputCount ?? 0;
  const inputCount = intake?.executiveSummary?.inputCount ?? null;
  const status = actionPlan.readyCommandCount > 0
    ? 'post_input_orchestrator_ready_for_local_packet_regeneration_no_live_changes'
    : 'post_input_orchestrator_waiting_for_inputs_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_post_input_orchestrator',
    generatedAt,
    ok: true,
    status,
    executiveSummary: {
      intakeStatus: intake?.status ?? null,
      requestBundleStatus: requestBundle?.status ?? null,
      privateInputTemplatePackStatus: privateInputTemplatePack?.status ?? null,
      inputCount,
      readyInputCount,
      readyForSeedApprovalPacket: intake?.executiveSummary?.readyForSeedApprovalPacket ?? false,
      readyForCrmWritePacketRegeneration: intake?.executiveSummary?.readyForCrmWritePacketRegeneration ?? false,
      readyForMiniLaunchCorrectionPreview: intake?.executiveSummary?.readyForMiniLaunchCorrectionPreview ?? false,
      readyCommandCount: actionPlan.readyCommandCount,
      allReadyCommandsAllowed: actionPlan.allReadyCommandsAllowed,
      canAskApprovalNow: false,
      commandsExecuted: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: actionPlan.readyCommandCount > 0
        ? 'operator_may_run_listed_local_packet_regeneration_commands_then_refresh_control_room'
        : 'keep_collecting_missing_inputs_without_approval_or_execution',
    },
    actionPlan,
    hardStops: [
      'This orchestrator report does not execute commands.',
      'Packet regeneration is not approval for seed sends, CRM writes or MailerLite UI edits.',
      'A correction preview is not approval for another test send or public/audience send.',
      'Do not run listed commands if the intake still reports missing or invalid private inputs.',
      'Do not paste exact private seed emails, people or facts into shared reports.',
      'Live MailerLite, Shopify, CRM, subscriber, workflow, send, ledger, card, scoring and Fact Store actions remain closed.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Post-Input Orchestrator',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Inputs ready: ${report.executiveSummary.readyInputCount}/${report.executiveSummary.inputCount ?? 'unknown'}`,
  `Ready for mini-launch correction preview: ${report.executiveSummary.readyForMiniLaunchCorrectionPreview}`,
  `Ready commands: ${report.executiveSummary.readyCommandCount}`,
  `Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `Commands executed: ${report.executiveSummary.commandsExecuted}`,
  '',
  '## Ready Commands',
  '',
  renderList(report.actionPlan.commands.map((command) =>
    `${command.id}: ${command.command} (allowed=${command.allowedByOrchestrator})`)),
  '',
  '## Follow-Up Refresh Commands',
  '',
  renderList(report.actionPlan.followUpCommands.map((command) => command.command)),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Commands executed: ${report.safety.commandsExecuted}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildFromFiles = async (options) => {
  const [intake, requestBundle, privateInputTemplatePack, sourceDigests] = await Promise.all([
    readJson(options.missingInputsIntake),
    readJson(options.missingInputsRequestBundle),
    readJson(options.privateInputTemplatePack),
    Promise.all([
      sourceDigest(options.missingInputsIntake, 'redacted input readiness and post-input commands'),
      sourceDigest(options.missingInputsRequestBundle, 'copy-ready missing-input requests'),
      sourceDigest(options.privateInputTemplatePack, 'inert private-input example scaffolding'),
    ]),
  ]);

  return buildPostInputOrchestrator({
    intake,
    requestBundle,
    privateInputTemplatePack,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildFromFiles(options);
  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    readyInputCount: report.executiveSummary.readyInputCount,
    readyCommandCount: report.executiveSummary.readyCommandCount,
    canAskApprovalNow: report.executiveSummary.canAskApprovalNow,
    commandsExecuted: report.executiveSummary.commandsExecuted,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS post-input orchestrator failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildActionPlan,
  buildPostInputOrchestrator,
  buildSafety,
  commandAllowed,
  parseArgs,
  renderMarkdown,
};
