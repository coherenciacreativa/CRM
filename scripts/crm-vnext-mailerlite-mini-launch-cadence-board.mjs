#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-cadence-board-2026-05-27';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_LAUNCH_OS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.json';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const DEFAULT_MIGRATION_BLUEPRINT = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-cadence-board.mjs [options]

Options:
  --readiness-board <path>       Existing Mini-Launch readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --launch-os-packet <path>      Mini-Launch OS v0 packet JSON. Defaults to ${DEFAULT_LAUNCH_OS_PACKET}
  --control-room <path>          Launch OS control room doc. Defaults to ${DEFAULT_CONTROL_ROOM}
  --migration-blueprint <path>   Onboarding migration blueprint doc. Defaults to ${DEFAULT_MIGRATION_BLUEPRINT}
  --out <path>                   Write JSON cadence board
  --markdown-out <path>          Write Markdown cadence board
  --help                         Show this help

Local-only cadence board for MailerLite Launch OS v0. It turns one prepared
mini-launch into a repeatable weekly-to-every-3-days operating rhythm while
keeping Brand, Web, CRM, MailerLite, onboarding and live approvals separated.
It never calls MailerLite, Shopify, CRM live APIs, reads subscribers, edits
workflows, sends email, appends ledgers, writes cards, changes scoring, or
touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    readinessBoard: DEFAULT_READINESS_BOARD,
    launchOsPacket: DEFAULT_LAUNCH_OS_PACKET,
    controlRoom: DEFAULT_CONTROL_ROOM,
    migrationBlueprint: DEFAULT_MIGRATION_BLUEPRINT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--launch-os-packet') options.launchOsPacket = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--migration-blueprint') options.migrationBlueprint = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const loadSourceDigests = async (options) => {
  const sources = [
    [options.readinessBoard, 'current pilot state and live-gate posture'],
    [options.launchOsPacket, 'reusable Mini-Launch OS v0 architecture'],
    [options.controlRoom, 'operator control room and current evidence list'],
    [options.migrationBlueprint, 'onboarding protection and migration context'],
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

const buildCadenceStrategy = () => ({
  currentRecommendation: 'weekly_first_then_every_3_days_after_throughput_proof',
  phases: [
    {
      id: 'phase_1_weekly_foundation',
      cadence: 'weekly',
      status: 'recommended_now',
      purpose: 'Learn the operating loop without flooding Brand, Web, CRM or MailerLite.',
      advanceCriteria: [
        'Two no-live mini-launch rehearsals reach readiness board state without unresolved routing confusion.',
        'At least one approved seed test proves asset rendering, receipt logic and inbox delivery for a test address.',
        'Brand can review copy/semantics without changing the underlying taxonomy every time.',
        'Web Design has a reusable Shopify draft/handoff pattern that does not require ad hoc HTML.',
        'CRM can record market signals as local reviewed evidence without automatic scoring or card mutation.',
      ],
      defaultDecision: 'Operate here until the machine feels boring, legible and repeatable.',
    },
    {
      id: 'phase_2_every_3_days_growth',
      cadence: 'every_3_days',
      status: 'not_active_until_phase_1_evidence',
      purpose: 'Increase learning velocity once templates, reviews and gates are stable.',
      activationCriteria: [
        'Stable Brand brief, copy sequence and visual handoff templates exist.',
        'No unresolved confusion between public copy, internal strategy and technical implementation notes.',
        'MailerLite seed-test lane has exact approval grammar and receipt verification.',
        'CRM market-signal review can classify responses without treating operational receipts as warmth.',
        'Onboarding handoff remains a separate protected gate, not an automatic post-launch action.',
      ],
      defaultDecision: 'Prepare for this cadence, but do not operate it yet.',
    },
  ],
});

const buildWipLimits = () => ({
  liveAdjacentLaunches: 1,
  noLivePrepLaunches: 2,
  activeWebBuilds: 1,
  activeMailerLiteSeedTests: 1,
  activeBrandReviews: 2,
  activeCrmSignalReviews: 1,
  rule: 'Start less than feels exciting so the system can learn cleanly and avoid hidden debt.',
});

const buildPipelineStages = () => [
  {
    id: 'idea_intake',
    owner: 'Alejandro / Brand Front Desk',
    purpose: 'Choose one testable idea from the idea bucket.',
    definitionOfReady: ['One public promise', 'one audience hypothesis', 'one resource type', 'one learning question'],
    definitionOfDone: ['launch_id assigned', 'status set to intake_ready', 'risks noted'],
    liveGate: 'closed',
  },
  {
    id: 'brand_brief',
    owner: 'Brand',
    purpose: 'Turn the idea into voice, promise, claims and creative direction.',
    definitionOfReady: ['idea_intake done', 'Brand Hub sources available'],
    definitionOfDone: ['public/internal separation checked', 'claims safe', 'copy direction approved for draft'],
    liveGate: 'closed',
  },
  {
    id: 'web_shopify_handoff',
    owner: 'Web Design / Shopify',
    purpose: 'Prepare the landing/resource/quiz handoff in Shopify-native terms.',
    definitionOfReady: ['brand_brief done', 'resource type known'],
    definitionOfDone: ['suggested files or local draft scope clear', 'form/publish still closed'],
    liveGate: 'closed_until_explicit_scope',
  },
  {
    id: 'resource_or_quiz_or_game_production',
    owner: 'Brand / Content / Web',
    purpose: 'Produce the actual useful object people receive or complete.',
    definitionOfReady: ['format selected', 'public promise defined'],
    definitionOfDone: ['asset draft ready for Brand review', 'delivery mode identified'],
    liveGate: 'closed',
  },
  {
    id: 'email_sequence',
    owner: 'Brand / Email',
    purpose: 'Create the relationship arc after capture or interaction.',
    definitionOfReady: ['resource draft exists', 'audience hypothesis known'],
    definitionOfDone: ['delivery email plus follow-up arc drafted', 'public scan clean', 'style QA pending or done'],
    liveGate: 'closed',
  },
  {
    id: 'brand_candidate_review',
    owner: 'Brand',
    purpose: 'Decide whether launch-specific receipt groups belong in the Brand dictionary.',
    definitionOfReady: ['proposed group names exist', 'purpose/layer/contentId/status included'],
    definitionOfDone: ['Brand marks candidate, rename, reject or crm_first'],
    liveGate: 'closed',
  },
  {
    id: 'group_dry_run',
    owner: 'CRM / MailerLite Planner',
    purpose: 'Compare Brand canon with live MailerLite groups before asking for creation approval.',
    definitionOfReady: ['Brand candidate review done', 'fresh MailerLite scan allowed'],
    definitionOfDone: ['dry-run report says create/not-create/use status with no mutations'],
    liveGate: 'closed_until_exact_approval',
  },
  {
    id: 'seed_test_qa',
    owner: 'MailerLite / QA',
    purpose: 'Test rendering and receipt behavior on an approved test address only.',
    definitionOfReady: ['Brand-approved copy', 'email style QA', 'exact test recipient', 'fresh dry-run'],
    definitionOfDone: ['test delivery verified', 'creative/readback issues classified'],
    liveGate: 'closed_until_exact_seed_scope',
  },
  {
    id: 'exact_approval_live_adjacent_step',
    owner: 'Alejandro',
    purpose: 'Authorize one narrow live-adjacent action if the prior gates are ready.',
    definitionOfReady: ['decision packet names exact action', 'blast radius is one lane', 'rollback/stop path known'],
    definitionOfDone: ['only approved action performed', 'execution report created'],
    liveGate: 'human_required',
  },
  {
    id: 'market_signal_review',
    owner: 'CRM',
    purpose: 'Turn opens, replies, comments, likes, completions and qualitative responses into learning.',
    definitionOfReady: ['signals collected or imported', 'source/provenance clear'],
    definitionOfDone: ['learn/continue/archive recommendation ready', 'no automatic CRM writes unless separately approved'],
    liveGate: 'closed',
  },
  {
    id: 'continue_archive_decision',
    owner: 'Alejandro / Brand / CRM',
    purpose: 'Decide whether the idea deserves more development, a second test, or archival.',
    definitionOfReady: ['market_signal_review done', 'cost/effort noted'],
    definitionOfDone: ['decision recorded', 'next launch slot released'],
    liveGate: 'closed',
  },
];

const buildRoutingPolicy = () => ({
  brand: 'Owns voice, promise, visual/copy criteria, semantic status of MailerLite group names and public/internal separation.',
  webDesign: 'Owns Shopify-native implementation, previews, mobile UX and form placement. Loose HTML is fallback only after blocker declaration.',
  crm: 'Owns relationship intelligence, launch_id, signal interpretation, market learning, card/write gates and CRM-first experiment identity.',
  mailerLite: 'Executes email delivery, groups/receipts and seed tests only after Brand/CRM dry-runs and exact human approval.',
  onboarding: 'Protected trunk. Mini-launches may recommend a future handoff, but no participant is routed into onboarding automatically.',
  alejandro: 'Approves live-adjacent steps, audience launches, workflow changes, subscriber mutations and any Shopify/MailerLite public operation.',
});

const buildOperatingRhythm = () => ({
  weekly: [
    'Slot 0: choose one idea, one resource type and one learning question.',
    'Slot 1: Brand brief, promise, claims and first copy direction.',
    'Slot 2: Web/Shopify handoff plus email sequence draft.',
    'Slot 3: Brand candidate review, group dry-run and seed-test QA decision packet.',
    'Slot 4: optional approved seed test or learning review; release the next idea only after the board is legible.',
  ],
  every3Days: [
    'Day 0: idea intake, Brand brief and resource skeleton.',
    'Day 1: Shopify handoff/draft plus email sequence and Brand candidate review.',
    'Day 2: group dry-run, seed-test QA packet and exact approval decision if warranted.',
    'Day 3: market signal review, continue/archive decision and next idea slot.',
  ],
  activeCadenceNow: 'weekly',
  every3DaysStatus: 'designed_but_not_active',
});

const buildBacklogFields = () => [
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

const buildCurrentPilot = (readinessBoard) => ({
  launch: readinessBoard?.launch ?? null,
  state: readinessBoard?.executiveSummary?.overallState ?? 'unknown',
  readyNoLiveLaneCount: readinessBoard?.executiveSummary?.readyNoLiveLaneCount ?? null,
  liveMutationGateOpenCount: readinessBoard?.executiveSummary?.liveMutationGateOpenCount ?? null,
  nextNoLiveMoves: readinessBoard?.executiveSummary?.nextBestNoLiveMoves ?? [],
});

const buildCadenceBoard = ({
  readinessBoard,
  launchOsPacket,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const pipelineStages = buildPipelineStages();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_cadence_board',
    generatedAt,
    ok: true,
    status: 'mini_launch_cadence_board_ready_no_live_changes',
    currentPilot: buildCurrentPilot(readinessBoard),
    launchOsStatus: launchOsPacket?.status ?? null,
    cadenceStrategy: buildCadenceStrategy(),
    wipLimits: buildWipLimits(),
    pipelineStages,
    routingPolicy: buildRoutingPolicy(),
    operatingRhythm: buildOperatingRhythm(),
    backlogFields: buildBacklogFields(),
    gateDefaults: buildGateDefaults(),
    nextNoLiveMoves: [
      'Ask Brand to review the full email sequence and group candidate semantics for the current pilot.',
      'Ask Web Design to review the Shopify handoff before any local draft or preview work.',
      'Keep weekly cadence until two no-live rehearsals and one seed test prove the loop.',
      'Use the backlog fields for the next mini-launch idea before creating new MailerLite groups.',
    ],
    operatorWarnings: [
      'Every-3-days cadence is designed, not active.',
      'Do not let mini-launch speed bypass Brand semantic review or Web/Shopify review.',
      'Do not use receipt groups as human-interest signals without CRM interpretation.',
      'Do not route participants into onboarding automatically; onboarding remains a separate protected gate.',
      'Do not keep more than one live-adjacent launch open at a time.',
    ],
    sourceDigests,
    safety: buildSafety(),
    metrics: {
      pipelineStageCount: pipelineStages.length,
      closedLiveGateCount: buildGateDefaults().length,
      openLiveGateCount: 0,
    },
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');
const renderIndentedList = (items) => items.map((item) => `  - ${item}`).join('\n');

const renderMarkdown = (board) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Cadence Board',
    '',
    `Generated: ${board.generatedAt}`,
    `Status: ${board.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este tablero convierte el primer piloto preparado en una maquina repetible de mini-lanzamientos. No autoriza acciones vivas: organiza cadencia, WIP, roles, etapas y gates.',
    '',
    `Cadencia activa recomendada: ${board.operatingRhythm.activeCadenceNow}`,
    `Cadencia cada 3 dias: ${board.operatingRhythm.every3DaysStatus}`,
    `Piloto actual: ${board.currentPilot.launch?.resourceName ?? 'unknown'} (${board.currentPilot.state})`,
    '',
    '## Cadence Strategy',
    '',
  ];

  for (const phase of board.cadenceStrategy.phases) {
    lines.push(`### ${phase.id}`);
    lines.push(`- Cadence: ${phase.cadence}`);
    lines.push(`- Status: ${phase.status}`);
    lines.push(`- Purpose: ${phase.purpose}`);
    lines.push('- Criteria:');
    lines.push(renderIndentedList(phase.advanceCriteria ?? phase.activationCriteria));
    lines.push(`- Default decision: ${phase.defaultDecision}`);
    lines.push('');
  }

  lines.push('## WIP Limits', '');
  for (const [key, value] of Object.entries(board.wipLimits)) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push('', '## Pipeline Stages', '');
  for (const stage of board.pipelineStages) {
    lines.push(`### ${stage.id}`);
    lines.push(`- Owner: ${stage.owner}`);
    lines.push(`- Purpose: ${stage.purpose}`);
    lines.push(`- Ready: ${stage.definitionOfReady.join('; ')}`);
    lines.push(`- Done: ${stage.definitionOfDone.join('; ')}`);
    lines.push(`- Live gate: ${stage.liveGate}`);
    lines.push('');
  }

  lines.push('## Routing Policy', '');
  for (const [owner, policy] of Object.entries(board.routingPolicy)) {
    lines.push(`- ${owner}: ${policy}`);
  }

  lines.push('', '## Weekly Rhythm', '');
  lines.push(renderList(board.operatingRhythm.weekly));

  lines.push('', '## Every 3 Days Rhythm', '');
  lines.push(renderList(board.operatingRhythm.every3Days));

  lines.push('', '## Backlog Fields', '');
  lines.push(renderList(board.backlogFields));

  lines.push('', '## Live Gates Closed By Default', '');
  for (const gate of board.gateDefaults) {
    lines.push(`- ${gate.id}: ${gate.status}; approvalRequired=${gate.approvalRequired}`);
  }

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
  const [readinessBoard, launchOsPacket, sourceDigests] = await Promise.all([
    readJson(options.readinessBoard),
    readJson(options.launchOsPacket),
    loadSourceDigests(options),
  ]);

  return buildCadenceBoard({
    readinessBoard,
    launchOsPacket,
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
    activeCadenceNow: board.operatingRhythm.activeCadenceNow,
    every3DaysStatus: board.operatingRhythm.every3DaysStatus,
    pipelineStageCount: board.metrics.pipelineStageCount,
    openLiveGateCount: board.metrics.openLiveGateCount,
    currentPilotState: board.currentPilot.state,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: board.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch cadence board failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBacklogFields,
  buildCadenceBoard,
  buildCadenceStrategy,
  buildGateDefaults,
  buildOperatingRhythm,
  buildPipelineStages,
  buildRoutingPolicy,
  buildWipLimits,
  parseArgs,
  renderMarkdown,
};
