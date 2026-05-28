#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-missing-inputs-kit-2026-05-28';
const DEFAULT_BLOCKED_GATE_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json';
const DEFAULT_SEED_SEND_APPROVAL = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_CRM_WRITE_APPROVAL = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.md';
const DEFAULT_PRIVATE_SEED_EMAIL_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/private/mailerlite_seed_recipient_inteligencia_descansar.txt';
const DEFAULT_OBSERVED_EVENTS_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/private/mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-missing-inputs-kit.mjs [options]

Options:
  --blocked-gate-handoff <path> Launch OS blocked-gate handoff JSON. Defaults to ${DEFAULT_BLOCKED_GATE_HANDOFF}
  --seed-send-approval <path>   Mini-launch seed-send approval packet JSON. Defaults to ${DEFAULT_SEED_SEND_APPROVAL}
  --crm-write-approval <path>   Mini-launch CRM write approval packet JSON. Defaults to ${DEFAULT_CRM_WRITE_APPROVAL}
  --runbook <path>              Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --private-seed-email-file <path> Suggested private seed email file. Defaults to ${DEFAULT_PRIVATE_SEED_EMAIL_FILE}
  --observed-events-file <path> Suggested private observed events file. Defaults to ${DEFAULT_OBSERVED_EVENTS_FILE}
  --out <path>                  Write JSON kit. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>         Write Markdown kit. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                        Show this help

Local-only missing-inputs kit for MailerLite Launch OS v0. It turns current
blocked gates into exact input requests and follow-up commands. It never creates
private input files, asks for approval, sends email, calls MailerLite/Shopify/CRM
live APIs, reads subscribers, mutates groups/workflows/cards/scoring/Fact Store,
or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const unique = (items) => [...new Set((items ?? []).filter(Boolean))];
const markdownPathFor = (path) => path.replace(/\.json$/, '.md');

const parseArgs = (argv) => {
  const options = {
    blockedGateHandoff: DEFAULT_BLOCKED_GATE_HANDOFF,
    seedSendApproval: DEFAULT_SEED_SEND_APPROVAL,
    crmWriteApproval: DEFAULT_CRM_WRITE_APPROVAL,
    runbook: DEFAULT_RUNBOOK,
    privateSeedEmailFile: DEFAULT_PRIVATE_SEED_EMAIL_FILE,
    observedEventsFile: DEFAULT_OBSERVED_EVENTS_FILE,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--blocked-gate-handoff') options.blockedGateHandoff = argv[++index];
    else if (arg === '--seed-send-approval') options.seedSendApproval = argv[++index];
    else if (arg === '--crm-write-approval') options.crmWriteApproval = argv[++index];
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--private-seed-email-file') options.privateSeedEmailFile = argv[++index];
    else if (arg === '--observed-events-file') options.observedEventsFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      consultedFor,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  kitCreatesPrivateFiles: false,
  kitAsksApproval: false,
  browserOpened: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const inputById = (handoff) => new Map((handoff?.inputNeededNow ?? []).map((input) => [input.id, input]));

const seedApprovalCommand = (seedSendApproval) =>
  seedSendApproval?.inputRequest?.nextLocalCommandAfterSeedRecipient
  ?? `npm run crm:vnext:mailerlite-mini-launch-seed-send-approval-packet -- --seed-email-file <private_seed_email_file> --out ${DEFAULT_SEED_SEND_APPROVAL} --markdown-out ${markdownPathFor(DEFAULT_SEED_SEND_APPROVAL)}`;

const crmApprovalCommand = (observedEventsFile) =>
  `npm run crm:vnext:mailerlite-mini-launch-crm-write-approval-packet -- --observed-events-file ${observedEventsFile} --out ${DEFAULT_CRM_WRITE_APPROVAL} --markdown-out ${markdownPathFor(DEFAULT_CRM_WRITE_APPROVAL)}`;

const buildInputRequests = ({ handoff, seedSendApproval, crmWriteApproval, privateSeedEmailFile, observedEventsFile }) => {
  const inputs = inputById(handoff);
  const acceptedObservedEventsShape = crmWriteApproval?.observedEventInputContract?.acceptedShape
    ?? '{ events: [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }';

  const specs = [
    {
      id: 'exact_seed_recipient',
      gateId: 'mini_launch_seed_send',
      label: inputs.get('exact_seed_recipient')?.label ?? 'Exact private seed recipient',
      requiredFor: inputs.get('exact_seed_recipient')?.requiredFor
        ?? 'Generate the exact seed-send approval phrase without exposing the real address in shared reports.',
      acceptableForm: inputs.get('exact_seed_recipient')?.acceptableForm
        ?? 'One exact email address in a private local file.',
      privacy: 'private',
      captureMode: 'private_seed_email_file_preferred',
      templatePathSuggestion: privateSeedEmailFile,
      sampleOnly: false,
      mustReplaceBeforeUse: true,
      nextLocalCommandAfterInput: seedApprovalCommand(seedSendApproval).replace('<private_seed_email_file>', privateSeedEmailFile),
      approvalEffect: 'does_not_approve_send_or_execution',
    },
    {
      id: 'real_observed_events_file',
      gateId: 'crm_signal_writes',
      label: inputs.get('real_observed_events_file')?.label ?? 'Real observed events file',
      requiredFor: inputs.get('real_observed_events_file')?.requiredFor
        ?? 'Convert the sample-only CRM event contract into real evidence.',
      acceptableForm: acceptedObservedEventsShape,
      privacy: 'private_or_internal_evidence',
      captureMode: 'json_file_with_real_observed_events',
      templatePathSuggestion: observedEventsFile,
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      nextLocalCommandAfterInput: crmApprovalCommand(observedEventsFile),
      approvalEffect: 'does_not_approve_crm_writes',
    },
    {
      id: 'exact_people',
      gateId: 'crm_signal_writes',
      label: inputs.get('exact_people')?.label ?? 'Exact people or CRM identities',
      requiredFor: inputs.get('exact_people')?.requiredFor
        ?? 'Prevent anonymous or sample events from becoming CRM person history.',
      acceptableForm: inputs.get('exact_people')?.acceptableForm
        ?? 'email, instagramHandle, or personId per event.',
      privacy: 'private_or_internal_evidence',
      captureMode: 'identity_fields_inside_observed_events_file',
      templatePathSuggestion: observedEventsFile,
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      nextLocalCommandAfterInput: crmApprovalCommand(observedEventsFile),
      approvalEffect: 'does_not_approve_crm_writes',
    },
    {
      id: 'writable_event_screen',
      gateId: 'crm_signal_writes',
      label: inputs.get('writable_event_screen')?.label ?? 'Writable-event screen',
      requiredFor: inputs.get('writable_event_screen')?.requiredFor
        ?? 'Filter samples, malformed events and launch-id mismatches before any CRM write approval request.',
      acceptableForm: inputs.get('writable_event_screen')?.acceptableForm
        ?? 'Rerun CRM write approval packet after observed events exist.',
      privacy: 'derived_no_live_report',
      captureMode: 'rerun_crm_write_approval_packet',
      templatePathSuggestion: DEFAULT_CRM_WRITE_APPROVAL,
      sampleOnly: false,
      mustReplaceBeforeUse: false,
      nextLocalCommandAfterInput: crmApprovalCommand(observedEventsFile),
      approvalEffect: 'does_not_approve_crm_writes',
    },
    {
      id: 'fact_store_market_review',
      gateId: 'crm_signal_writes',
      label: inputs.get('fact_store_market_review')?.label ?? 'Aggregate market review and exact facts',
      requiredFor: inputs.get('fact_store_market_review')?.requiredFor
        ?? 'Only if the selected write family is Fact Store.',
      acceptableForm: inputs.get('fact_store_market_review')?.acceptableForm
        ?? 'A reviewed list of exact aggregate facts plus evidence ids and separate Fact Store approval later.',
      privacy: 'internal_review',
      captureMode: 'reviewed_aggregate_fact_list',
      templatePathSuggestion: observedEventsFile,
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      nextLocalCommandAfterInput: crmApprovalCommand(observedEventsFile),
      approvalEffect: 'does_not_approve_fact_store_write',
    },
  ];

  const neededIds = unique((handoff?.inputNeededNow ?? []).map((input) => input.id));
  return specs.filter((spec) => neededIds.includes(spec.id));
};

const buildTemplates = ({ privateSeedEmailFile, observedEventsFile }) => ({
  seedRecipientFile: {
    pathSuggestion: privateSeedEmailFile,
    kitCreatesFile: false,
    contentRule: 'exact_seed_email_only',
    sampleOnly: false,
    doNotPasteInSharedReports: true,
  },
  observedEventsFile: {
    pathSuggestion: observedEventsFile,
    kitCreatesFile: false,
    sampleOnly: true,
    mustReplaceBeforeUse: true,
    template: {
      events: [
        {
          eventKind: 'resource_delivered_or_clicked_real_event_kind',
          sourceKind: 'mailerlite_or_manual_observation',
          channel: 'email',
          sourceId: 'real_source_id_from_mailerlite_or_evidence',
          observedAt: '2026-05-28T00:00:00.000Z',
          metrics: {
            launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
          },
          email: 'real_person@example.com',
          evidenceSourcePath: '/absolute/path/to/real/evidence.json',
        },
      ],
    },
  },
  factStoreMarketReview: {
    pathSuggestion: observedEventsFile,
    kitCreatesFile: false,
    sampleOnly: true,
    mustReplaceBeforeUse: true,
    template: {
      aggregateFacts: [
        {
          fact: 'Replace with exact aggregate fact only after human review.',
          evidenceEventIds: ['replace_with_real_event_id'],
          writeFamily: 'fact_store',
          approvalRequiredLater: true,
        },
      ],
    },
  },
});

const buildPostInputCommands = ({ privateSeedEmailFile, observedEventsFile }) => [
  seedApprovalCommand({}).replace('<private_seed_email_file>', privateSeedEmailFile),
  crmApprovalCommand(observedEventsFile),
  `npm run crm:vnext:mailerlite-launch-os-blocked-gate-handoff -- --out ${DEFAULT_BLOCKED_GATE_HANDOFF} --markdown-out ${markdownPathFor(DEFAULT_BLOCKED_GATE_HANDOFF)}`,
  `npm run crm:vnext:mailerlite-launch-os-operator-runbook -- --out ${DEFAULT_RUNBOOK} --markdown-out ${markdownPathFor(DEFAULT_RUNBOOK)}`,
  'npm run crm:vnext:mailerlite-launch-os-goal-audit -- --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-28.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-28.md',
  'npm run crm:vnext:mailerlite-launch-os-validation-receipt -- --validation-status passed --validation-summary "<fresh validation summary>" --test-files <n> --test-count <n> --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.md',
];

const buildMissingInputsKit = ({
  handoff,
  seedSendApproval,
  crmWriteApproval,
  runbook,
  sourceDigests = [],
  privateSeedEmailFile = DEFAULT_PRIVATE_SEED_EMAIL_FILE,
  observedEventsFile = DEFAULT_OBSERVED_EVENTS_FILE,
  generatedAt = new Date().toISOString(),
}) => {
  const inputRequests = buildInputRequests({
    handoff,
    seedSendApproval,
    crmWriteApproval,
    privateSeedEmailFile,
    observedEventsFile,
  });
  const seedInputCount = inputRequests.filter((input) => input.gateId === 'mini_launch_seed_send').length;
  const crmInputCount = inputRequests.filter((input) => input.gateId === 'crm_signal_writes').length;
  const safety = buildSafety();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_missing_inputs_kit',
    generatedAt,
    ok: true,
    status: 'missing_inputs_kit_ready_no_live_changes',
    executiveSummary: {
      handoffStatus: handoff?.status ?? null,
      runbookStatus: runbook?.status ?? null,
      inputCount: inputRequests.length,
      blockedGateCount: handoff?.executiveSummary?.blockedGateCount ?? null,
      approvalReadyNow: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: handoff?.executiveSummary?.openLiveMutationGateCount ?? 0,
      seedInputCount,
      crmInputCount,
      privateInputCount: inputRequests.filter((input) => input.privacy.includes('private')).length,
      kitCreatesPrivateFiles: false,
      kitAsksApproval: false,
      nextSafeAction: 'collect_missing_inputs_without_approval_or_execution',
    },
    inputRequests,
    templates: buildTemplates({ privateSeedEmailFile, observedEventsFile }),
    postInputCommands: buildPostInputCommands({ privateSeedEmailFile, observedEventsFile }),
    hardStops: [
      'This kit is not an approval phrase and cannot execute any send or write.',
      'Do not create the private seed recipient file from this kit unless Alejandro supplies the exact address.',
      'Do not treat sample observed events, sample people or sample aggregate facts as writable evidence.',
      'After inputs exist, rerun the relevant approval packet, blocked-gate handoff, runbook, goal audit and validation receipt.',
      'Seed-send still requires fresh real MailerLite QA plus a separate exact approval phrase.',
      'CRM writes still require real observed events, exact people, selected write family and a separate exact approval phrase.',
    ],
    safety,
    sourceDigests,
  };
};

const renderList = (items, empty = '- none') => {
  if (!items || items.length === 0) return empty;
  return items.map((item) => `- ${item}`).join('\n');
};

const renderMarkdown = (kit) => [
  '# MailerLite Launch OS - Missing Inputs Kit',
  '',
  `Generated: ${kit.generatedAt}`,
  `Status: ${kit.status}`,
  `Inputs: ${kit.executiveSummary.inputCount}`,
  `Can ask approval now: ${kit.executiveSummary.canAskApprovalNow}`,
  `Open live mutation gates: ${kit.executiveSummary.openLiveMutationGateCount}`,
  '',
  '## Input Requests',
  '',
  ...kit.inputRequests.flatMap((input) => [
    `### ${input.id}`,
    '',
    `- Gate: ${input.gateId}`,
    `- Label: ${input.label}`,
    `- Required for: ${input.requiredFor}`,
    `- Acceptable form: ${input.acceptableForm}`,
    `- Privacy: ${input.privacy}`,
    `- Capture mode: ${input.captureMode}`,
    `- Suggested path: ${input.templatePathSuggestion}`,
    `- Approval effect: ${input.approvalEffect}`,
    '',
  ]),
  '## Post-Input Commands',
  '',
  renderList(kit.postInputCommands),
  '',
  '## Hard Stops',
  '',
  renderList(kit.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${kit.safety.localOnly}`,
  `- Kit creates private files: ${kit.safety.kitCreatesPrivateFiles}`,
  `- Kit asks approval: ${kit.safety.kitAsksApproval}`,
  `- MailerLite API called: ${kit.safety.mailerLiteApiCalled}`,
  `- Sends performed: ${kit.safety.sendsPerformed}`,
  `- CRM live API called: ${kit.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${kit.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const writeOutput = async (path, value) => {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, value, 'utf8');
  return absolutePath;
};

const buildFromFiles = async (options) => {
  const [
    handoffEntry,
    seedSendApprovalEntry,
    crmWriteApprovalEntry,
    runbookEntry,
  ] = await Promise.all([
    readJsonWithDigest(options.blockedGateHandoff, 'blocked gates and exact input ids'),
    readJsonWithDigest(options.seedSendApproval, 'seed-send exact-recipient boundary and UI execution plan'),
    readJsonWithDigest(options.crmWriteApproval, 'CRM observed-events and exact-people boundary'),
    readJsonWithDigest(options.runbook, 'operator runbook current no-live posture'),
  ]);

  return buildMissingInputsKit({
    handoff: handoffEntry.value,
    seedSendApproval: seedSendApprovalEntry.value,
    crmWriteApproval: crmWriteApprovalEntry.value,
    runbook: runbookEntry.value,
    privateSeedEmailFile: options.privateSeedEmailFile,
    observedEventsFile: options.observedEventsFile,
    sourceDigests: [
      { id: 'blockedGateHandoff', ...handoffEntry.digest },
      { id: 'seedSendApproval', ...seedSendApprovalEntry.digest },
      { id: 'crmWriteApproval', ...crmWriteApprovalEntry.digest },
      { id: 'runbook', ...runbookEntry.digest },
    ],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const kit = await buildFromFiles(options);
  if (options.out) await writeOutput(options.out, `${JSON.stringify(kit, null, 2)}\n`);
  if (options.markdownOut) await writeOutput(options.markdownOut, `${renderMarkdown(kit)}\n`);
  console.log(JSON.stringify({
    ok: kit.ok,
    status: kit.status,
    generatedAt: kit.generatedAt,
    inputCount: kit.executiveSummary.inputCount,
    canAskApprovalNow: kit.executiveSummary.canAskApprovalNow,
    openLiveMutationGateCount: kit.executiveSummary.openLiveMutationGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: kit.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS missing-inputs kit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildInputRequests,
  buildMissingInputsKit,
  buildSafety,
  markdownPathFor,
  parseArgs,
  renderMarkdown,
};
