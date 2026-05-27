#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-backlog-board-2026-05-27';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_REVIEW_PACKETS_INDEX = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-backlog-board.mjs [options]

Options:
  --cadence-board <path>        Mini-launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --readiness-board <path>      Current pilot readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --review-packets-index <path> Department review packets index JSON. Defaults to ${DEFAULT_REVIEW_PACKETS_INDEX}
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
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const loadSourceDigests = async (options) => {
  const sources = [
    [options.cadenceBoard, 'cadence strategy, WIP limits and backlog fields'],
    [options.readinessBoard, 'current pilot state and next no-live moves'],
    [options.reviewPacketsIndex, 'department review packet state and pending departments'],
  ];

  const digests = [];
  for (const [path, consultedFor] of sources) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push({
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor,
    });
  }
  return digests;
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

const buildCurrentPilotRow = ({ readinessBoard, reviewPacketsIndex }) => {
  const launch = readinessBoard.launch ?? reviewPacketsIndex.launch ?? {};
  return {
    idea_id: launch.launchId ?? 'unknown_launch',
    theme: launch.resourceName ?? 'unknown',
    resource_type: launch.resourceType ?? 'unknown',
    audience_hypothesis: 'pending_department_review',
    public_promise: 'pending_brand_review',
    learning_question: 'Can this mini-launch create useful market and relationship signals without weakening the onboarding trunk?',
    status: 'department_review_pending',
    owner: 'MailerLite Launch OS',
    evidence: [
      '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.md',
      '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.md',
    ],
    risk: [
      'Do not treat review packets as live approval.',
      'Do not create launch-specific MailerLite groups before Brand response and fresh dry-run.',
      'Do not route participants into onboarding automatically.',
    ],
    brand_review_status: reviewPacketsIndex.pendingDepartments?.includes('brand') ? 'pending' : 'unknown',
    web_status: reviewPacketsIndex.pendingDepartments?.includes('web_design') ? 'pending' : 'unknown',
    mailerlite_status: 'no_live_groups_or_assets',
    crm_signal_status: reviewPacketsIndex.pendingDepartments?.includes('crm') ? 'pending' : 'unknown',
    onboarding_handoff_status: 'protected_no_auto_routing',
    next_gate: 'collect_department_reviews',
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
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const backlogRows = [
    buildCurrentPilotRow({
      readinessBoard,
      reviewPacketsIndex,
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
      'Collect Brand/Web/CRM reviews for the current pilot.',
      'Allow at most one additional no-live idea intake while the current pilot waits for review responses.',
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
  const [cadenceBoard, readinessBoard, reviewPacketsIndex, sourceDigests] = await Promise.all([
    readJson(options.cadenceBoard),
    readJson(options.readinessBoard),
    readJson(options.reviewPacketsIndex),
    loadSourceDigests(options),
  ]);

  return buildBacklogBoard({
    cadenceBoard,
    readinessBoard,
    reviewPacketsIndex,
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
  buildBacklogBoard,
  buildCurrentPilotRow,
  buildGateDefaults,
  buildIdeaTemplate,
  buildIntakePolicy,
  buildSafety,
  buildWipSnapshot,
  parseArgs,
  renderMarkdown,
};
