#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-backlog-board-2026-05-27';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_REVIEW_PACKETS_INDEX = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json';
const DEFAULT_OPERATOR_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';
const DEFAULT_SEED_SEND_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_CRM_WRITE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-backlog-board.mjs [options]

Options:
  --cadence-board <path>        Mini-launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --readiness-board <path>      Current pilot readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --review-packets-index <path> Department review packets index JSON. Defaults to ${DEFAULT_REVIEW_PACKETS_INDEX}
  --operator-runbook <path>     Launch OS operator runbook JSON. Defaults to ${DEFAULT_OPERATOR_RUNBOOK}
  --approval-queue <path>       Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --seed-send-approval-packet <path> Seed send approval packet JSON. Defaults to ${DEFAULT_SEED_SEND_APPROVAL_PACKET}
  --crm-write-approval-packet <path> CRM write approval packet JSON. Defaults to ${DEFAULT_CRM_WRITE_APPROVAL_PACKET}
  --out <path>                  Write JSON backlog board
  --markdown-out <path>         Write Markdown backlog board
  --help                        Show this help

Local-only backlog board for MailerLite Launch OS v0. It materializes the
mini-launch backlog fields from the cadence board, keeps the current pilot in
the queue, defines intake criteria for future ideas, and preserves all live
gates. It never calls MailerLite, Shopify, CRM live APIs, reads subscribers,
creates groups, edits workflows, sends emails, appends ledgers, writes cards,
changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    cadenceBoard: DEFAULT_CADENCE_BOARD,
    readinessBoard: DEFAULT_READINESS_BOARD,
    reviewPacketsIndex: DEFAULT_REVIEW_PACKETS_INDEX,
    operatorRunbook: DEFAULT_OPERATOR_RUNBOOK,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    seedSendApprovalPacket: DEFAULT_SEED_SEND_APPROVAL_PACKET,
    crmWriteApprovalPacket: DEFAULT_CRM_WRITE_APPROVAL_PACKET,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--cadence-board') options.cadenceBoard = argv[++index];
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--review-packets-index') options.reviewPacketsIndex = argv[++index];
    else if (arg === '--operator-runbook') options.operatorRunbook = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--seed-send-approval-packet') options.seedSendApprovalPacket = argv[++index];
    else if (arg === '--crm-write-approval-packet') options.crmWriteApprovalPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const sourceDigest = async (path, consultedFor, optional = false) => {
  if (!path) return null;
  try {
    const content = await readFile(resolve(path), 'utf8');
    return {
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor,
    };
  } catch (error) {
    if (optional && error?.code === 'ENOENT') {
      return {
        path: resolve(path),
        present: false,
        chars: 0,
        consultedFor,
      };
    }
    throw error;
  }
};

const loadSourceDigests = async (options) => {
  const sources = [
    [options.cadenceBoard, 'cadence strategy, WIP limits and backlog fields'],
    [options.readinessBoard, 'current pilot state and next no-live moves'],
    [options.reviewPacketsIndex, 'department review packet state and pending departments'],
    [options.operatorRunbook, 'current Launch OS operator state, approval queue and pilot gates', true],
    [options.approvalQueue, 'current approval readiness and blocked live gates', true],
    [options.seedSendApprovalPacket, 'seed send boundary and exact-recipient blocker', true],
    [options.crmWriteApprovalPacket, 'CRM write boundary and real-evidence blockers', true],
  ];

  return (await Promise.all(sources.map(([path, consultedFor, optional]) =>
    sourceDigest(path, consultedFor, optional)
  ))).filter(Boolean);
};

const buildIdeaTemplate = (cadenceBoard) => {
  const fields = cadenceBoard.backlogFields ?? [
    'idea_id',
    'theme',
    'resource_type',
    'audience_hypothesis',
    'public_promise',
    'learning_question',
    'status',
    'owner',
    'evidence',
    'risk',
    'brand_review_status',
    'web_status',
    'mailerlite_status',
    'crm_signal_status',
    'onboarding_handoff_status',
    'next_gate',
  ];

  return {
    fields,
    allowedResourceTypes: ['guide', 'quiz', 'game', 'audio', 'email_course', 'checklist', 'worksheet'],
    allowedStatuses: [
      'idea_seed',
      'intake_ready',
      'department_review_pending',
      'no_live_rehearsal_ready',
      'seed_test_candidate',
      'seed_test_candidate_blocked_waiting_seed_recipient',
      'crm_signal_review_blocked_waiting_observed_events',
      'market_signal_review_pending',
      'continue',
      'archive',
      'blocked',
    ],
    requiredBeforeIntakeReady: [
      'theme',
      'resource_type',
      'audience_hypothesis',
      'public_promise',
      'learning_question',
    ],
  };
};

const acceptedDepartment = ({ runbook, department }) => {
  const accepted = runbook?.currentState?.miniLaunch?.acceptedFinalDepartments ?? [];
  const states = runbook?.currentState?.miniLaunch?.departmentResponseStates ?? [];
  return accepted.includes(department)
    || states.some((state) => state?.department === department && state?.acceptedFinalResponse === true);
};

const buildCurrentPilotStatus = ({ runbook, seedSendApprovalPacket, crmWriteApprovalPacket }) => {
  const seedBlockers = seedSendApprovalPacket?.blockers
    ?? runbook?.currentState?.miniLaunch?.seedTestQaBlockersBeforeApprovalRequest
    ?? [];
  if (seedBlockers.includes('exact_seed_recipient_missing')) {
    return 'seed_test_candidate_blocked_waiting_seed_recipient';
  }

  if (crmWriteApprovalPacket?.status === 'crm_write_approval_packet_blocked_missing_observed_events_no_live_changes') {
    return 'crm_signal_review_blocked_waiting_observed_events';
  }

  if (runbook?.currentState?.miniLaunch?.departmentReviewStatus === 'department_reviews_reconciled_ready_for_next_no_live_moves') {
    return 'no_live_rehearsal_ready';
  }

  return 'department_review_pending';
};

const buildCurrentPilotRow = ({
  readinessBoard,
  reviewPacketsIndex,
  operatorRunbook = null,
  approvalQueue = null,
  seedSendApprovalPacket = null,
  crmWriteApprovalPacket = null,
}) => {
  const runbookLaunch = operatorRunbook?.currentState?.miniLaunch?.currentPilot ?? null;
  const launch = runbookLaunch ?? readinessBoard.launch ?? reviewPacketsIndex.launch ?? {};
  const currentStatus = buildCurrentPilotStatus({
    runbook: operatorRunbook,
    seedSendApprovalPacket,
    crmWriteApprovalPacket,
  });
  const seedBlockers = seedSendApprovalPacket?.blockers
    ?? operatorRunbook?.currentState?.miniLaunch?.seedTestQaBlockersBeforeApprovalRequest
    ?? [];
  const crmBlockers = crmWriteApprovalPacket?.executiveSummary?.blockers
    ?? operatorRunbook?.currentState?.miniLaunch?.crmWriteApprovalBlockers
    ?? [];
  const readyApprovalIds = approvalQueue?.executiveSummary?.readyApprovalIds
    ?? operatorRunbook?.currentState?.approvalQueue?.readyApprovalIds
    ?? [];
  const blockedApprovalIds = approvalQueue?.executiveSummary?.blockedApprovalIds
    ?? operatorRunbook?.currentState?.approvalQueue?.blockedApprovalIds
    ?? [];
  const manualDraftsBuilt = operatorRunbook?.currentState?.miniLaunch?.emailManualUiBuildClosed === true
    || operatorRunbook?.currentState?.miniLaunch?.emailManualUiDraftVisibleCount >= 4;
  const realRenderGreen = operatorRunbook?.currentState?.miniLaunch?.seedTestQaRealMailerLiteRenderQaReady === true
    || seedSendApprovalPacket?.executiveSummary?.realMailerLiteRenderQaReady === true;
  const seedRecipientSupplied = seedSendApprovalPacket?.executiveSummary?.seedRecipientSupplied === true
    || operatorRunbook?.currentState?.miniLaunch?.seedTestQaSeedRecipientSupplied === true;
  const shopifyClosed = operatorRunbook?.currentState?.miniLaunch?.shopifyLocalBuildClosed === true;
  const crmPolicyReady = crmWriteApprovalPacket?.executiveSummary?.writePolicyPacketReady === true;

  return {
    idea_id: launch.launchId ?? 'unknown_launch',
    theme: launch.resourceName ?? 'unknown',
    resource_type: launch.resourceType ?? 'unknown',
    audience_hypothesis: operatorRunbook
      ? 'accepted_department_reviews_but_seed_audience_not_selected'
      : 'pending_department_review',
    public_promise: operatorRunbook
      ? 'validated_draft_sequence_waiting_seed_recipient'
      : 'pending_brand_review',
    learning_question: 'Can this mini-launch create useful market and relationship signals without weakening the onboarding trunk?',
    status: currentStatus,
    owner: 'MailerLite Launch OS',
    evidence: [
      operatorRunbook
        ? '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.md'
        : '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.md',
      approvalQueue
        ? '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.md'
        : '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.md',
      seedSendApprovalPacket
        ? '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.md'
        : null,
      crmWriteApprovalPacket
        ? '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.md'
        : null,
    ].filter(Boolean),
    readiness: {
      acceptedDepartments: operatorRunbook?.currentState?.miniLaunch?.acceptedFinalDepartments ?? [],
      manualDraftsBuilt,
      realMailerLiteRenderQaGreen: realRenderGreen,
      seedRecipientSupplied,
      targetGroupsExist: seedSendApprovalPacket?.executiveSummary?.targetGroupsExist
        ?? operatorRunbook?.currentState?.miniLaunch?.seedTestQaTargetGroupsExist
        ?? null,
      shopifyLocalBuildClosed: shopifyClosed,
      crmWritePolicyReady: crmPolicyReady,
      readyApprovalIds,
      blockedApprovalIds,
    },
    blockers: [
      ...seedBlockers,
      ...crmBlockers,
    ],
    risk: [
      'Do not treat review packets as live approval.',
      'Do not use a seed test without exact recipient and fresh QA.',
      'Do not route participants into onboarding automatically.',
      'Do not turn real engagement into CRM writes without observed events, exact people and one separate exact write approval.',
    ],
    brand_review_status: acceptedDepartment({ runbook: operatorRunbook, department: 'brand' })
      ? 'accepted_final_response'
      : reviewPacketsIndex.pendingDepartments?.includes('brand') ? 'pending' : 'unknown',
    web_status: acceptedDepartment({ runbook: operatorRunbook, department: 'web_design' })
      ? shopifyClosed ? 'accepted_local_build_closed_no_live' : 'accepted_final_response'
      : reviewPacketsIndex.pendingDepartments?.includes('web_design') ? 'pending' : 'unknown',
    mailerlite_status: manualDraftsBuilt && realRenderGreen
      ? 'manual_ui_drafts_built_real_render_green_seed_send_closed'
      : 'no_live_groups_or_assets',
    crm_signal_status: crmPolicyReady
      ? 'policy_ready_waiting_real_observed_events'
      : reviewPacketsIndex.pendingDepartments?.includes('crm') ? 'pending' : 'unknown',
    onboarding_handoff_status: operatorRunbook?.currentState?.miniLaunch?.onboardingHandoffPolicyStatus === 'mini_launch_onboarding_handoff_policy_ready_no_live_changes'
      ? 'policy_ready_protected_no_auto_routing'
      : 'protected_no_auto_routing',
    next_gate: operatorRunbook
      ? seedRecipientSupplied
        ? 'fresh_seed_send_qa_and_exact_test_send_approval'
        : 'exact_seed_recipient_for_test_send'
      : 'collect_department_reviews',
  };
};

const buildWipSnapshot = ({ cadenceBoard, backlogRows }) => {
  const limits = cadenceBoard.wipLimits ?? {};
  const activeNoLivePrep = backlogRows.filter((row) => [
    'idea_seed',
    'intake_ready',
    'department_review_pending',
    'no_live_rehearsal_ready',
  ].includes(row.status)).length;
  const activeLiveAdjacent = backlogRows.filter((row) => [
    'seed_test_candidate',
    'seed_test_candidate_blocked_waiting_seed_recipient',
    'crm_signal_review_blocked_waiting_observed_events',
    'market_signal_review_pending',
  ].includes(row.status)).length;

  return {
    limits,
    activeNoLivePrep,
    activeLiveAdjacent,
    remainingNoLivePrepCapacity: Math.max((limits.noLivePrepLaunches ?? 0) - activeNoLivePrep, 0),
    remainingLiveAdjacentCapacity: Math.max((limits.liveAdjacentLaunches ?? 0) - activeLiveAdjacent, 0),
    safeToIntakeOneMoreNoLiveIdea: activeNoLivePrep < (limits.noLivePrepLaunches ?? 0),
    safeToOpenLiveAdjacentLaunch: false,
    rule: 'Backlog capacity never grants live operation permission.',
  };
};

const buildIntakePolicy = () => ({
  defaultDecision: 'allow_one_more_no_live_idea_intake_if_fields_are_complete',
  sourceOfTruth: 'Backlog rows are operating queue entries, not Brand canon or CRM card facts.',
  requiredIntakeQuestions: [
    'What is the theme?',
    'What resource type is this: guide, quiz, game, audio, email course, checklist, or worksheet?',
    'Who is the audience hypothesis?',
    'What is the public promise in one sentence?',
    'What learning question should this mini-launch answer?',
  ],
  rejectionReasons: [
    'public_promise_missing',
    'learning_question_missing',
    'resource_type_unclear',
    'would_require_live_change_now',
    'would_bypass_brand_or_crm_review',
    'would_auto_route_to_onboarding',
  ],
});

const buildGateDefaults = () => [
  'shopify_preview',
  'shopify_publish',
  'form_connection',
  'mailerlite_group_creation',
  'mailerlite_asset_build',
  'seed_send',
  'receipt_seed_test',
  'workflow_use',
  'onboarding_handoff',
  'audience_launch',
  'crm_card_write',
  'crm_scoring_mutation',
  'signal_ledger_append',
  'fact_store_write',
].map((id) => ({
  id,
  status: 'closed_by_default',
  approvalRequired: true,
}));

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  signalLedgerAppendPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildBacklogBoard = ({
  cadenceBoard,
  readinessBoard,
  reviewPacketsIndex,
  operatorRunbook = null,
  approvalQueue = null,
  seedSendApprovalPacket = null,
  crmWriteApprovalPacket = null,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const backlogRows = [
    buildCurrentPilotRow({
      readinessBoard,
      reviewPacketsIndex,
      operatorRunbook,
      approvalQueue,
      seedSendApprovalPacket,
      crmWriteApprovalPacket,
    }),
  ];
  const wipSnapshot = buildWipSnapshot({ cadenceBoard, backlogRows });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_backlog_board',
    generatedAt,
    ok: true,
    status: 'mini_launch_backlog_board_ready_no_live_changes',
    activeCadenceNow: cadenceBoard.operatingRhythm?.activeCadenceNow ?? 'weekly',
    every3DaysStatus: cadenceBoard.operatingRhythm?.every3DaysStatus ?? 'designed_but_not_active',
    ideaTemplate: buildIdeaTemplate(cadenceBoard),
    intakePolicy: buildIntakePolicy(),
    backlogRows,
    wipSnapshot,
    gateDefaults: buildGateDefaults(),
    nextNoLiveMoves: [
      'Keep the current pilot parked at seed-test boundary until an exact seed recipient exists.',
      'Keep CRM signal writes parked until real observed events and exact people exist.',
      'Allow at most one additional no-live idea intake while the current pilot waits at approval boundaries.',
      'Do not create new MailerLite groups for a new idea before Brand candidate review and fresh dry-run.',
      'Do not promote every-3-days cadence until throughput proof criteria are met.',
    ],
    operatorWarnings: [
      'A backlog row is not permission to build, send, publish, score or route.',
      'New ideas enter as no-live idea_seed or intake_ready only.',
      'Onboarding handoff remains protected and separate from mini-launch intake.',
      'CRM signal meaning must be reviewed before any card, scoring, ledger or Fact Store write.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (board) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Backlog Board',
    '',
    `Generated: ${board.generatedAt}`,
    `Status: ${board.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Cadence now: ${board.activeCadenceNow}`,
    `Every 3 days: ${board.every3DaysStatus}`,
    `Safe to intake one more no-live idea: ${board.wipSnapshot.safeToIntakeOneMoreNoLiveIdea}`,
    `Open live gates: ${board.gateDefaults.filter((gate) => gate.status !== 'closed_by_default').length}`,
    '',
    'Este backlog convierte los campos de cadencia en una cola operable de ideas. No crea piezas, no envia mensajes y no abre permisos vivos.',
    '',
    '## Current Backlog',
    '',
  ];

  for (const row of board.backlogRows) {
    lines.push(`### ${row.idea_id}`);
    lines.push(`- Theme: ${row.theme}`);
    lines.push(`- Resource type: ${row.resource_type}`);
    lines.push(`- Status: ${row.status}`);
    lines.push(`- Next gate: ${row.next_gate}`);
    lines.push(`- Brand review: ${row.brand_review_status}`);
    lines.push(`- Web status: ${row.web_status}`);
    lines.push(`- MailerLite status: ${row.mailerlite_status}`);
    lines.push(`- CRM signal status: ${row.crm_signal_status}`);
    lines.push(`- Onboarding handoff: ${row.onboarding_handoff_status}`);
    lines.push(`- Ready approvals: ${row.readiness?.readyApprovalIds?.join(', ') || 'none'}`);
    lines.push(`- Blocked approvals: ${row.readiness?.blockedApprovalIds?.join(', ') || 'none'}`);
    lines.push(`- Blockers: ${row.blockers?.join(', ') || 'none'}`);
    lines.push('');
  }

  lines.push('## Idea Intake Template', '');
  lines.push(`Fields: ${board.ideaTemplate.fields.join(', ')}`);
  lines.push('');
  lines.push('Required before intake_ready:');
  lines.push(renderList(board.ideaTemplate.requiredBeforeIntakeReady));

  lines.push('', '## WIP Snapshot', '');
  lines.push(`- Active no-live prep: ${board.wipSnapshot.activeNoLivePrep}`);
  lines.push(`- Remaining no-live prep capacity: ${board.wipSnapshot.remainingNoLivePrepCapacity}`);
  lines.push(`- Active live-adjacent: ${board.wipSnapshot.activeLiveAdjacent}`);
  lines.push(`- Remaining live-adjacent capacity: ${board.wipSnapshot.remainingLiveAdjacentCapacity}`);
  lines.push(`- Safe to open live-adjacent launch: ${board.wipSnapshot.safeToOpenLiveAdjacentLaunch}`);

  lines.push('', '## Next No-Live Moves', '');
  lines.push(renderList(board.nextNoLiveMoves));

  lines.push('', '## Operator Warnings', '');
  lines.push(renderList(board.operatorWarnings));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of board.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin browser.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin emails enviados.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

  return lines.join('\n');
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const buildBoardFromFiles = async (options) => {
  const [
    cadenceBoard,
    readinessBoard,
    reviewPacketsIndex,
    operatorRunbook,
    approvalQueue,
    seedSendApprovalPacket,
    crmWriteApprovalPacket,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.cadenceBoard),
    readJson(options.readinessBoard),
    readJson(options.reviewPacketsIndex),
    readOptionalJson(options.operatorRunbook),
    readOptionalJson(options.approvalQueue),
    readOptionalJson(options.seedSendApprovalPacket),
    readOptionalJson(options.crmWriteApprovalPacket),
    loadSourceDigests(options),
  ]);

  return buildBacklogBoard({
    cadenceBoard,
    readinessBoard,
    reviewPacketsIndex,
    operatorRunbook,
    approvalQueue,
    seedSendApprovalPacket,
    crmWriteApprovalPacket,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const board = await buildBoardFromFiles(options);
  if (options.out) await writeJson(options.out, board);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(board));

  console.log(JSON.stringify({
    ok: board.ok,
    status: board.status,
    generatedAt: board.generatedAt,
    backlogCount: board.backlogRows.length,
    safeToIntakeOneMoreNoLiveIdea: board.wipSnapshot.safeToIntakeOneMoreNoLiveIdea,
    activeNoLivePrep: board.wipSnapshot.activeNoLivePrep,
    openLiveGateCount: board.gateDefaults.filter((gate) => gate.status !== 'closed_by_default').length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: board.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch backlog board failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  acceptedDepartment,
  buildBacklogBoard,
  buildCurrentPilotRow,
  buildCurrentPilotStatus,
  buildGateDefaults,
  buildIdeaTemplate,
  buildIntakePolicy,
  buildSafety,
  buildWipSnapshot,
  parseArgs,
  renderMarkdown,
};
