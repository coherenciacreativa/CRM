#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-blocked-gate-handoff-2026-05-28';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';
const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_GOAL_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-28.json';
const DEFAULT_SEED_TEST_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SEED_SEND_APPROVAL = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_CRM_WRITE_APPROVAL = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BACKLOG_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_backlog_board_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-blocked-gate-handoff.mjs [options]

Options:
  --approval-queue <path>       Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --runbook <path>              Launch OS operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --goal-audit <path>           Launch OS goal audit JSON. Defaults to ${DEFAULT_GOAL_AUDIT}
  --seed-test-qa <path>         Mini-launch seed/test QA packet. Defaults to ${DEFAULT_SEED_TEST_QA}
  --seed-send-approval <path>   Mini-launch seed-send approval packet. Defaults to ${DEFAULT_SEED_SEND_APPROVAL}
  --crm-write-approval <path>   Mini-launch CRM write approval packet. Defaults to ${DEFAULT_CRM_WRITE_APPROVAL}
  --backlog-board <path>        Mini-launch backlog board JSON. Defaults to ${DEFAULT_BACKLOG_BOARD}
  --out <path>                  Write JSON handoff
  --markdown-out <path>         Write Markdown handoff
  --help                        Show this help

Local-only blocked-gate handoff for MailerLite Launch OS v0. It separates
inputs needed now from approvals that are intentionally not askable yet. It
never calls MailerLite, Shopify or CRM live APIs, reads subscribers, mutates
groups/workflows/cards/scoring/Fact Store, sends email, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const unique = (values) => [...new Set((values ?? []).filter(Boolean))];
const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    runbook: DEFAULT_RUNBOOK,
    goalAudit: DEFAULT_GOAL_AUDIT,
    seedTestQa: DEFAULT_SEED_TEST_QA,
    seedSendApproval: DEFAULT_SEED_SEND_APPROVAL,
    crmWriteApproval: DEFAULT_CRM_WRITE_APPROVAL,
    backlogBoard: DEFAULT_BACKLOG_BOARD,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--goal-audit') options.goalAudit = argv[++index];
    else if (arg === '--seed-test-qa') options.seedTestQa = argv[++index];
    else if (arg === '--seed-send-approval') options.seedSendApproval = argv[++index];
    else if (arg === '--crm-write-approval') options.crmWriteApproval = argv[++index];
    else if (arg === '--backlog-board') options.backlogBoard = argv[++index];
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
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  groupAssignmentsPerformed: false,
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

const approvalItemsById = (approvalQueue) => new Map((approvalQueue?.approvalItems ?? [])
  .map((item) => [item.id, item]));

const closedReferenceOnlyApprovals = (approvalQueue) => (approvalQueue?.approvalItems ?? [])
  .filter((item) => item.status === 'reference_only_no_approval_request_now')
  .map((item) => ({
    id: item.id,
    title: item.title,
    lane: item.lane,
    status: item.status,
    operationType: item.operationType,
  }));

const seedInputNeeded = (seedPacket) => {
  const blockers = seedPacket?.blockers ?? [];
  const input = [];
  if (blockers.includes('exact_seed_recipient_missing')) {
    input.push({
      id: 'exact_seed_recipient',
      label: 'Exact private seed recipient',
      requiredFor: 'Only after this exists can the seed-send approval phrase be generated.',
      acceptableForm: 'One explicit email address supplied through a private/approved channel or file.',
    });
  }
  return input;
};

const crmInputNeeded = (crmPacket) => {
  const blockers = crmPacket?.approvalBoundary?.blockersBeforeApprovalRequest
    ?? crmPacket?.executiveSummary?.blockers
    ?? [];
  const input = [];
  if (blockers.includes('real_observed_event_file_missing') || blockers.includes('exact_observed_events_missing')) {
    input.push({
      id: 'real_observed_events_file',
      label: 'Real observed events file',
      requiredFor: 'Turns the sample-only contract into real evidence that can be previewed for writes.',
      acceptableForm: crmPacket?.observedEventInputContract?.acceptedShape
        ?? '{ events: [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }',
    });
  }
  if (blockers.includes('exact_person_identity_missing')) {
    input.push({
      id: 'exact_people',
      label: 'Exact people or CRM identities',
      requiredFor: 'Prevents sample or anonymous launch signals from becoming person history.',
      acceptableForm: 'email, instagramHandle, or personId per event.',
    });
  }
  if (blockers.includes('observed_events_not_all_writable_or_contain_samples')) {
    input.push({
      id: 'writable_event_screen',
      label: 'Writable-event screen',
      requiredFor: 'Filters samples, malformed events, and launch-id mismatches before any approval request.',
      acceptableForm: 'Rerun CRM write approval packet after observed events exist.',
    });
  }
  if (
    blockers.includes('aggregate_market_review_missing')
    || blockers.includes('exact_fact_store_facts_missing')
    || blockers.includes('fact_store_write_approval_missing')
  ) {
    input.push({
      id: 'fact_store_market_review',
      label: 'Aggregate market review and exact facts',
      requiredFor: 'Only needed if the next selected write family is Fact Store.',
      acceptableForm: 'A reviewed list of exact aggregate facts plus evidence ids and separate Fact Store approval later.',
    });
  }
  return input;
};

const buildSeedBlockedGate = ({ approvalItem, seedTestQa, seedSendApproval, sourcePaths }) => ({
  id: 'mini_launch_seed_send',
  title: 'Mini-launch seed/test send',
  lane: approvalItem?.lane ?? 'mini_launch_inteligencia_para_descansar',
  state: seedSendApproval?.status === 'seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes'
    ? 'waiting_exact_seed_recipient_before_approval_request'
    : 'blocked_before_seed_send_approval_request',
  canAskApprovalNow: seedSendApproval?.approvalBoundary?.canAskAlejandroForApproval === true,
  inputNeededNow: seedInputNeeded(seedSendApproval),
  approvalLaterNotNow: {
    id: 'exact_seed_send_approval',
    whyNotNow: 'The exact seed recipient is missing, so there is no safe exact approval phrase to ask for yet.',
    laterBoundary: 'After seed recipient is supplied, rerun real MailerLite render QA and seed-send approval packet before any test send.',
    exactApprovalPhraseAvailableNow: false,
  },
  doNotAskYetReason: unique(seedSendApproval?.blockers ?? approvalItem?.blockers ?? []),
  currentEvidence: {
    seedTestQaStatus: seedTestQa?.status ?? null,
    seedSendApprovalStatus: seedSendApproval?.status ?? null,
    manualUiDraftsBuilt: seedTestQa?.readiness?.manualUiDraftsBuilt ?? approvalItem?.evidence?.manualUiDraftsBuilt ?? null,
    realMailerLiteRenderQaReady: seedSendApproval?.executiveSummary?.realMailerLiteRenderQaReady ?? approvalItem?.evidence?.realMailerLiteRenderQaReady ?? null,
    targetGroupsExist: seedSendApproval?.executiveSummary?.targetGroupsExist ?? approvalItem?.evidence?.targetGroupsExist ?? null,
    targetDraftCount: seedSendApproval?.executiveSummary?.targetDraftCount ?? null,
    uiExecutionPlanStatus: seedSendApproval?.uiExecutionPlan?.status ?? null,
    uiExecutionCampaignTargetCount: seedSendApproval?.uiExecutionPlan?.campaignTargetCount ?? null,
    noAlejandroUiNeededAfterExactApproval: seedSendApproval?.uiExecutionPlan?.noAlejandroUiNeededAfterExactApproval ?? false,
    preferredUiBrowser: seedSendApproval?.uiExecutionPlan?.preferredBrowser ?? null,
    readyForAudienceLaunchNow: seedTestQa?.readiness?.readyForAudienceLaunchNow ?? false,
  },
  stillClosed: seedSendApproval?.approvalBoundary?.stillClosedEvenAfterApproval ?? [
    'public_or_audience_send',
    'schedule',
    'workflow_or_automation_attachment',
    'subscriber_import_or_non_seed_assignment',
    'group_creation_or_assignment',
    'shopify_preview_publish_or_form_connection',
    'crm_signal_ledger_append',
    'crm_card_write',
    'crm_scoring',
    'fact_store_write',
  ],
  sourcePackets: {
    approvalQueue: sourcePaths.approvalQueue,
    seedTestQa: sourcePaths.seedTestQa,
    seedSendApproval: sourcePaths.seedSendApproval,
  },
});

const buildCrmBlockedGate = ({ approvalItem, crmWriteApproval, sourcePaths }) => ({
  id: 'crm_signal_writes',
  title: 'CRM signal ledger/card/scoring/Fact Store writes',
  lane: approvalItem?.lane ?? 'crm_signal_projection',
  state: crmWriteApproval?.status === 'crm_write_approval_packet_blocked_missing_observed_events_no_live_changes'
    ? 'waiting_real_observed_events_and_exact_people_before_approval_request'
    : 'blocked_before_crm_write_approval_request',
  canAskApprovalNow: crmWriteApproval?.approvalBoundary?.canAskAlejandroForApproval === true,
  inputNeededNow: crmInputNeeded(crmWriteApproval),
  approvalLaterNotNow: {
    id: 'exact_crm_write_family_approval',
    whyNotNow: 'The packet has policy but no real observed events, exact people, exact facts, or selected write family ready for approval.',
    laterBoundary: 'Choose one write family at a time after observed events exist: Signal Ledger, card history, scoring, or Fact Store.',
    exactApprovalPhraseAvailableNow: false,
  },
  doNotAskYetReason: unique(
    crmWriteApproval?.approvalBoundary?.blockersBeforeApprovalRequest
    ?? crmWriteApproval?.executiveSummary?.blockers
    ?? approvalItem?.blockers
    ?? [],
  ),
  currentEvidence: {
    crmWriteApprovalStatus: crmWriteApproval?.status ?? null,
    projectionPacketStatus: crmWriteApproval?.launchEvidenceState?.projectionPacketStatus ?? null,
    writePolicyPacketReady: crmWriteApproval?.executiveSummary?.writePolicyPacketReady ?? false,
    resolvedPolicyBlockers: crmWriteApproval?.policyEffect?.resolvedPolicyBlockers ?? [],
    policyBlockersStillOpen: crmWriteApproval?.policyEffect?.policyBlockersStillOpen ?? [],
    exactEventCountReady: crmWriteApproval?.executiveSummary?.exactEventCountReady ?? 0,
    exactPersonCountReady: crmWriteApproval?.executiveSummary?.exactPersonCountReady ?? 0,
    candidateWriteFamilyCount: crmWriteApproval?.executiveSummary?.candidateWriteFamilyCount ?? countRows(crmWriteApproval?.writeFamilies),
    operationsPreviewed: crmWriteApproval?.executiveSummary?.operationsPreviewed ?? 0,
    operationsExecuted: crmWriteApproval?.executiveSummary?.operationsExecuted ?? 0,
    observedEventsSummary: crmWriteApproval?.approvalBoundary?.observedEventsSummary ?? null,
  },
  stillClosed: [
    'signal_ledger_append',
    'crm_card_write',
    'crm_scoring',
    'fact_store_write',
    'subscribers',
    'workflows_or_automations',
    'mailerlite_sends_or_mutations',
    'shopify_live_changes',
  ],
  sourcePackets: {
    approvalQueue: sourcePaths.approvalQueue,
    crmWriteApproval: sourcePaths.crmWriteApproval,
  },
});

const buildBlockedGateHandoff = ({
  approvalQueue,
  runbook,
  goalAudit,
  seedTestQa,
  seedSendApproval,
  crmWriteApproval,
  backlogBoard,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const itemsById = approvalItemsById(approvalQueue);
  const sourcePaths = Object.fromEntries(sourceDigests.map((digest) => [digest.id, digest.path]));
  const blockedGates = [
    buildSeedBlockedGate({
      approvalItem: itemsById.get('mini_launch_seed_send'),
      seedTestQa,
      seedSendApproval,
      sourcePaths,
    }),
    buildCrmBlockedGate({
      approvalItem: itemsById.get('crm_signal_writes'),
      crmWriteApproval,
      sourcePaths,
    }),
  ];
  const inputNeededNow = blockedGates.flatMap((gate) => gate.inputNeededNow.map((input) => ({
    gateId: gate.id,
    ...input,
  })));
  const safety = buildSafety();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_blocked_gate_handoff',
    generatedAt,
    ok: true,
    status: 'blocked_gate_handoff_ready_no_live_changes',
    executiveSummary: {
      approvalQueueStatus: approvalQueue?.status ?? null,
      runbookStatus: runbook?.status ?? null,
      goalAuditStatus: goalAudit?.status ?? null,
      readyApprovalCount: approvalQueue?.executiveSummary?.readyApprovalRequestCount ?? 0,
      blockedGateCount: blockedGates.length,
      openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? 0,
      canAskApprovalNow: blockedGates.some((gate) => gate.canAskApprovalNow),
      inputNeededCount: inputNeededNow.length,
      safeToIntakeOneMoreNoLiveIdea: backlogBoard?.wipSnapshot?.safeToIntakeOneMoreNoLiveIdea ?? false,
      nextBestHumanAction: inputNeededNow.length > 0
        ? 'supply_missing_inputs_before_any_new_approval_phrase'
        : null,
    },
    blockedGates,
    inputNeededNow,
    closedReferenceOnlyApprovals: closedReferenceOnlyApprovals(approvalQueue),
    allowedNoLiveWork: {
      safeToIntakeOneMoreNoLiveIdea: backlogBoard?.wipSnapshot?.safeToIntakeOneMoreNoLiveIdea ?? false,
      remainingNoLivePrepCapacity: backlogBoard?.wipSnapshot?.remainingNoLivePrepCapacity ?? null,
      rule: backlogBoard?.wipSnapshot?.rule ?? 'Backlog capacity never grants live operation permission.',
    },
    hardStops: [
      'Do not ask for seed-send approval until the exact seed recipient exists and fresh QA is green.',
      'Do not ask for CRM writes until real observed events, exact people, selected write family and exact approval text exist.',
      'Do not treat reference-only completed approvals as reusable live permission.',
      'Do not perform MailerLite, Shopify, CRM, subscriber, workflow, send, ledger, card, scoring or Fact Store live actions from this handoff.',
    ],
    sourceDigests,
    safety,
  };
};

const renderList = (items, empty = '- none') => {
  if (!items || items.length === 0) return [empty];
  return items.map((item) => `- ${item}`);
};

const renderMarkdown = (handoff) => {
  const lines = [
    '# MailerLite Launch OS - Blocked Gate Handoff',
    '',
    `- Generated: ${handoff.generatedAt}`,
    `- Status: ${handoff.status}`,
    `- Ready approvals now: ${handoff.executiveSummary.readyApprovalCount}`,
    `- Blocked gates: ${handoff.executiveSummary.blockedGateCount}`,
    `- Open live mutation gates: ${handoff.executiveSummary.openLiveMutationGateCount}`,
    `- Can ask approval now: ${handoff.executiveSummary.canAskApprovalNow}`,
    `- Inputs needed now: ${handoff.executiveSummary.inputNeededCount}`,
    '',
    '## Blocked Gates',
    '',
  ];

  for (const gate of handoff.blockedGates) {
    lines.push(
      `### ${gate.id}`,
      '',
      `- State: ${gate.state}`,
      `- Can ask approval now: ${gate.canAskApprovalNow}`,
      '',
      'Input needed now:',
      ...renderList(gate.inputNeededNow.map((item) => `${item.label}: ${item.requiredFor}`)),
      '',
      'Approval later, not now:',
      `- ${gate.approvalLaterNotNow.whyNotNow}`,
      `- Later boundary: ${gate.approvalLaterNotNow.laterBoundary}`,
      '',
      'Do not ask yet reason:',
      ...renderList(gate.doNotAskYetReason),
      '',
      ...(gate.id === 'mini_launch_seed_send'
        ? [
          'UI execution prep:',
          `- Plan: ${gate.currentEvidence.uiExecutionPlanStatus ?? 'missing'}`,
          `- Preferred browser: ${gate.currentEvidence.preferredUiBrowser ?? 'unknown'}`,
          `- Campaign targets: ${gate.currentEvidence.uiExecutionCampaignTargetCount ?? 'unknown'}`,
          `- No Alejandro UI needed after exact approval: ${gate.currentEvidence.noAlejandroUiNeededAfterExactApproval}`,
          '',
        ]
        : []),
      'Still closed:',
      ...renderList(gate.stillClosed),
      '',
    );
  }

  lines.push(
    '## Closed Reference-Only Approvals',
    '',
    ...renderList(handoff.closedReferenceOnlyApprovals.map((item) => `${item.id}: ${item.status}`)),
    '',
    '## Allowed No-Live Work',
    '',
    `- Safe to intake one more no-live idea: ${handoff.allowedNoLiveWork.safeToIntakeOneMoreNoLiveIdea}`,
    `- Remaining no-live prep capacity: ${handoff.allowedNoLiveWork.remainingNoLivePrepCapacity ?? 'unknown'}`,
    `- Rule: ${handoff.allowedNoLiveWork.rule}`,
    '',
    '## Hard Stops',
    '',
    ...renderList(handoff.hardStops),
    '',
    '## Safety',
    '',
    `- Local only: ${handoff.safety.localOnly}`,
    `- Reports only: ${handoff.safety.reportsOnly}`,
    `- MailerLite API called: ${handoff.safety.mailerLiteApiCalled}`,
    `- Shopify API called: ${handoff.safety.shopifyApiCalled}`,
    `- CRM live API called: ${handoff.safety.crmLiveApiCalled}`,
    `- Sends performed: ${handoff.safety.sendsPerformed}`,
    `- Fact Store write performed: ${handoff.safety.factStoreWritePerformed}`,
    `- Tokens printed: ${handoff.safety.tokensPrinted}`,
    '- No live actions are authorized or performed by this handoff.',
    '',
  );

  return `${lines.join('\n')}\n`;
};

const writeOutput = async (path, value) => {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, value, 'utf8');
  return absolutePath;
};

const buildFromFiles = async (options) => {
  const [
    approvalQueueEntry,
    runbookEntry,
    goalAuditEntry,
    seedTestQaEntry,
    seedSendApprovalEntry,
    crmWriteApprovalEntry,
    backlogBoardEntry,
  ] = await Promise.all([
    readJsonWithDigest(options.approvalQueue, 'approval queue ready/blocked/reference-only boundaries'),
    readJsonWithDigest(options.runbook, 'operator runbook current state and reference-only approvals'),
    readJsonWithDigest(options.goalAudit, 'goal audit current posture and partial requirements'),
    readJsonWithDigest(options.seedTestQa, 'seed/test QA state before any seed send approval'),
    readJsonWithDigest(options.seedSendApproval, 'seed-send approval packet and exact-recipient blocker'),
    readJsonWithDigest(options.crmWriteApproval, 'CRM write approval packet and real-evidence blockers'),
    readJsonWithDigest(options.backlogBoard, 'mini-launch backlog capacity and current next gate'),
  ]);

  return buildBlockedGateHandoff({
    approvalQueue: approvalQueueEntry.value,
    runbook: runbookEntry.value,
    goalAudit: goalAuditEntry.value,
    seedTestQa: seedTestQaEntry.value,
    seedSendApproval: seedSendApprovalEntry.value,
    crmWriteApproval: crmWriteApprovalEntry.value,
    backlogBoard: backlogBoardEntry.value,
    sourceDigests: [
      { id: 'approvalQueue', ...approvalQueueEntry.digest },
      { id: 'runbook', ...runbookEntry.digest },
      { id: 'goalAudit', ...goalAuditEntry.digest },
      { id: 'seedTestQa', ...seedTestQaEntry.digest },
      { id: 'seedSendApproval', ...seedSendApprovalEntry.digest },
      { id: 'crmWriteApproval', ...crmWriteApprovalEntry.digest },
      { id: 'backlogBoard', ...backlogBoardEntry.digest },
    ],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const handoff = await buildFromFiles(options);
  if (options.out) await writeOutput(options.out, `${JSON.stringify(handoff, null, 2)}\n`);
  if (options.markdownOut) await writeOutput(options.markdownOut, renderMarkdown(handoff));
  console.log(JSON.stringify({
    ok: handoff.ok,
    status: handoff.status,
    generatedAt: handoff.generatedAt,
    readyApprovalCount: handoff.executiveSummary.readyApprovalCount,
    blockedGateCount: handoff.executiveSummary.blockedGateCount,
    canAskApprovalNow: handoff.executiveSummary.canAskApprovalNow,
    inputNeededCount: handoff.executiveSummary.inputNeededCount,
    openLiveMutationGateCount: handoff.executiveSummary.openLiveMutationGateCount,
    blockedGateIds: handoff.blockedGates.map((gate) => gate.id),
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: handoff.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS blocked gate handoff failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBlockedGateHandoff,
  buildCrmBlockedGate,
  buildSafety,
  buildSeedBlockedGate,
  crmInputNeeded,
  parseArgs,
  renderMarkdown,
  seedInputNeeded,
};
