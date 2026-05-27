#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-operator-runbook-2026-05-27';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const DEFAULT_MIGRATION_BLUEPRINT = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_BACKLOG_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_backlog_board_2026-05-27.json';
const DEFAULT_RECONCILIATION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json';
const DEFAULT_PACKETS_INDEX = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json';
const DEFAULT_DELIVERY_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_event_contract_2026-05-27.json';
const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs [options]

Options:
  --control-room <path>              Launch OS control room doc. Defaults to ${DEFAULT_CONTROL_ROOM}
  --migration-blueprint <path>       Onboarding migration blueprint doc. Defaults to ${DEFAULT_MIGRATION_BLUEPRINT}
  --readiness-board <path>           Current mini-launch readiness JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --cadence-board <path>             Mini-launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --backlog-board <path>             Mini-launch backlog board JSON. Defaults to ${DEFAULT_BACKLOG_BOARD}
  --reconciliation-board <path>      Department review reconciliation JSON. Defaults to ${DEFAULT_RECONCILIATION}
  --packets-index <path>             Department review packets index JSON. Defaults to ${DEFAULT_PACKETS_INDEX}
  --delivery-pack <path>             Department review delivery pack JSON. Defaults to ${DEFAULT_DELIVERY_PACK}
  --response-workspace <path>        Department review response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --onboarding-v1-audit <path>       Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-v2-execution <path>   Onboarding v2 execution JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EXECUTION}
  --onboarding-v2-event-contract <path> Onboarding v2 event contract JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EVENT_CONTRACT}
  --brujula-plan <path>              Brújula post-inbox verification plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>             Brújula approved test-lane apply JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --package-json <path>              package.json with npm scripts. Defaults to ${DEFAULT_PACKAGE_JSON}
  --out <path>                       Write JSON runbook
  --markdown-out <path>              Write Markdown runbook
  --help                             Show this help

Local-only MailerLite Launch OS operator runbook. It maps current artifacts,
commands, scenarios, gates and next moves so Mantis/Codex can operate without
inventing state. It never sends messages, calls MailerLite/Shopify/CRM APIs,
reads subscribers, creates groups, edits workflows, sends emails, appends
ledgers, writes cards, changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    controlRoom: DEFAULT_CONTROL_ROOM,
    migrationBlueprint: DEFAULT_MIGRATION_BLUEPRINT,
    readinessBoard: DEFAULT_READINESS_BOARD,
    cadenceBoard: DEFAULT_CADENCE_BOARD,
    backlogBoard: DEFAULT_BACKLOG_BOARD,
    reconciliationBoard: DEFAULT_RECONCILIATION,
    packetsIndex: DEFAULT_PACKETS_INDEX,
    deliveryPack: DEFAULT_DELIVERY_PACK,
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingV2Execution: DEFAULT_ONBOARDING_V2_EXECUTION,
    onboardingV2EventContract: DEFAULT_ONBOARDING_V2_EVENT_CONTRACT,
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    packageJson: DEFAULT_PACKAGE_JSON,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--migration-blueprint') options.migrationBlueprint = argv[++index];
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--cadence-board') options.cadenceBoard = argv[++index];
    else if (arg === '--backlog-board') options.backlogBoard = argv[++index];
    else if (arg === '--reconciliation-board') options.reconciliationBoard = argv[++index];
    else if (arg === '--packets-index') options.packetsIndex = argv[++index];
    else if (arg === '--delivery-pack') options.deliveryPack = argv[++index];
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-v2-execution') options.onboardingV2Execution = argv[++index];
    else if (arg === '--onboarding-v2-event-contract') options.onboardingV2EventContract = argv[++index];
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--package-json') options.packageJson = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const loadSourceDigests = async (options) => {
  const sources = [
    [options.controlRoom, 'current operator state and gate map'],
    [options.migrationBlueprint, 'onboarding v1/v2 migration context'],
    [options.readinessBoard, 'current mini-launch readiness and closed live gates'],
    [options.cadenceBoard, 'mini-launch cadence, WIP limits and stages'],
    [options.backlogBoard, 'mini-launch idea queue and intake capacity'],
    [options.reconciliationBoard, 'department review state and current blockers'],
    [options.packetsIndex, 'individual Brand/Web/CRM packets'],
    [options.deliveryPack, 'safe department review delivery blocks and response paths'],
    [options.responseWorkspace, 'pending response workspace and final response readiness'],
    [options.onboardingV1Audit, 'protected production onboarding v1 audit'],
    [options.onboardingV2Execution, 'onboarding v2 execution posture and protected v1'],
    [options.onboardingV2EventContract, 'onboarding v2 CRM event contract and projection boundary'],
    [options.brujulaPlan, 'Brújula post-inbox verification and creative QA posture'],
    [options.brujulaApply, 'approved Brújula test subscriber receipt assignments'],
    [options.packageJson, 'available local npm commands'],
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

const commandCatalogFrom = (packageJson) => {
  const scripts = packageJson.scripts ?? {};
  const entries = Object.entries(scripts)
    .filter(([name]) => name.startsWith('crm:vnext:mailerlite'))
    .map(([name, command]) => ({
      name,
      command: `npm run ${name}`,
      script: command,
      family: name.includes('onboarding')
        ? 'onboarding'
        : name.includes('department-review')
          ? 'department_review'
          : name.includes('mini-launch')
            ? 'mini_launch'
            : name.includes('brujula')
              ? 'brujula_test_lane'
              : 'taxonomy_or_health',
      liveRisk: name.includes('apply') || name.includes('create')
        ? 'guarded_live_or_live_adjacent_requires_exact_approval'
        : 'local_or_read_only_by_default',
    }));

  return entries;
};

const groupNamesFrom = (groups) => (groups ?? []).map((group) => group.name).filter(Boolean);

const buildCurrentState = ({
  readinessBoard,
  cadenceBoard,
  backlogBoard,
  reconciliationBoard,
  packetsIndex,
  responseWorkspace,
  onboardingV1Audit,
  onboardingV2Execution,
  onboardingV2EventContract,
  brujulaPlan,
  brujulaApply,
}) => {
  const assignedGroupNames = groupNamesFrom(brujulaApply?.assignedGroups);
  const brujulaReceiptsAssigned = assignedGroupNames.includes('CC · Source · Resource · Brújula')
    && assignedGroupNames.includes('CC · Delivered · Guide · Brújula');
  const readinessLiveMutationGateOpenCount = readinessBoard?.executiveSummary?.liveMutationGateOpenCount
    ?? readinessBoard?.executiveSummary?.liveGateOpenCount
    ?? 0;
  const openLiveGateCount = Math.max(
    readinessLiveMutationGateOpenCount,
    cadenceBoard?.metrics?.openLiveGateCount ?? 0,
    packetsIndex?.liveGateSummary?.openLiveGateCount ?? 0,
    reconciliationBoard?.liveGateSummary?.openLiveGateCount ?? 0,
    backlogBoard?.gateDefaults?.filter((gate) => gate.status !== 'closed_by_default').length ?? 0,
  );

  return {
    brujulaPilot: {
      functionalStatus: brujulaReceiptsAssigned
        ? 'test_delivery_verified_creative_qa_pending'
        : 'not_ready_or_not_verified',
      receiptsAssignedToApprovedTestSubscriber: brujulaReceiptsAssigned,
      assignedGroupNames,
      workflowStillProtected: brujulaPlan?.localEvidence?.brujulaState?.currentWorkflowOffOrIncomplete ?? true,
      creativeStatus: brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence
        ? 'yellow_needs_brand_email_style_qa'
        : 'unknown_review_needed',
      publicUseReady: false,
    },
    onboarding: {
      productionV1Protected: onboardingV1Audit?.workflow?.enabled === true
        && onboardingV1Audit?.workflow?.complete === true
        && onboardingV1Audit?.workflow?.broken === false,
      productionV1Workflow: {
        id: onboardingV1Audit?.workflow?.id ?? null,
        name: onboardingV1Audit?.workflow?.name ?? null,
        enabled: onboardingV1Audit?.workflow?.enabled ?? null,
        complete: onboardingV1Audit?.workflow?.complete ?? null,
        broken: onboardingV1Audit?.workflow?.broken ?? null,
        emailsCount: onboardingV1Audit?.workflow?.emailsCount ?? null,
      },
      v2ExecutionStatus: onboardingV2Execution?.status ?? null,
      v2EventContractStatus: onboardingV2EventContract?.status ?? null,
      recommendedPath: onboardingV1Audit?.migrationRecommendation?.option ?? null,
      productionSwitchApproved: false,
    },
    miniLaunch: {
      currentPilot: readinessBoard?.launch ?? cadenceBoard?.currentPilot?.launch ?? reconciliationBoard?.launch ?? null,
      readinessState: readinessBoard?.executiveSummary?.overallState ?? null,
      readyNoLiveLaneCount: readinessBoard?.executiveSummary?.readyNoLiveLaneCount ?? null,
      cadenceNow: cadenceBoard?.operatingRhythm?.activeCadenceNow ?? null,
      every3DaysStatus: cadenceBoard?.operatingRhythm?.every3DaysStatus ?? null,
      safeToIntakeOneMoreNoLiveIdea: backlogBoard?.wipSnapshot?.safeToIntakeOneMoreNoLiveIdea ?? null,
      departmentReviewStatus: reconciliationBoard?.status ?? null,
      pendingDepartments: reconciliationBoard?.responseState?.pendingDepartments ?? packetsIndex?.pendingDepartments ?? [],
      responseWorkspaceStatus: responseWorkspace?.status ?? null,
      readyForResponseIntake: responseWorkspace?.readyForIntake ?? false,
      responseWorkspacePendingDepartments: responseWorkspace?.pendingDepartments ?? [],
      packetCount: packetsIndex?.packetCount ?? null,
    },
    liveGates: {
      openLiveGateCount,
      liveApprovalNeededNow: false,
    },
  };
};

const buildReportMap = (sourceDigests) => {
  const findPath = (suffix) => sourceDigests.find((source) => source.path.endsWith(suffix))?.path ?? null;
  return {
    controlRoom: findPath('mailerlite-launch-os-v0-control-room.md'),
    migrationBlueprint: findPath('mailerlite-onboarding-vnext-migration-blueprint.md'),
    readinessBoard: findPath('mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json'),
    cadenceBoard: findPath('mailerlite_mini_launch_cadence_board_2026-05-27.json'),
    backlogBoard: findPath('mailerlite_mini_launch_backlog_board_2026-05-27.json'),
    departmentReviewPacketsIndex: findPath('mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json'),
    departmentReviewDeliveryPack: findPath('mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json'),
    departmentReviewResponseWorkspace: findPath('mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json'),
    departmentReviewReconciliation: findPath('mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json'),
    onboardingV1Audit: findPath('mailerlite_onboarding_v1_audit_2026-05-27.json'),
    onboardingV2Execution: findPath('mailerlite_onboarding_v2_execution_packet_2026-05-27.json'),
    onboardingV2EventContract: findPath('mailerlite_onboarding_v2_event_contract_2026-05-27.json'),
    brujulaPostInboxVerify: findPath('mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json'),
    brujulaTestLaneApply: findPath('mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json'),
    packageJson: findPath('package.json'),
  };
};

const buildApprovalMatrix = () => [
  {
    action: 'read_reports_or_generate_local_packets',
    status: 'allowed_no_approval',
    reason: 'Local files only, no live systems.',
  },
  {
    action: 'department_review_requests',
    status: 'allowed_no_live_review_only',
    reason: 'Review requests and response templates cannot grant live permissions.',
  },
  {
    action: 'rerun_group_dry_run',
    status: 'allowed_after_accepted_brand_response',
    reason: 'Dry-run reads/plans only; group creation remains closed.',
  },
  {
    action: 'create_mailerlite_groups',
    status: 'closed_until_exact_alejandro_approval',
    reason: 'Requires Brand dictionary state, fresh dry-run and exact group list.',
  },
  {
    action: 'shopify_local_build',
    status: 'closed_until_scoped_build_approval',
    reason: 'A Web review can unlock a request, not file edits.',
  },
  {
    action: 'shopify_preview_publish_or_form_connection',
    status: 'closed_until_exact_alejandro_approval',
    reason: 'Public surface/form connection is live-adjacent.',
  },
  {
    action: 'seed_test_email_or_subscriber_assignment',
    status: 'closed_until_exact_seed_scope',
    reason: 'Requires exact recipient, asset, receipt scope and approval.',
  },
  {
    action: 'workflow_edit_activation_or_onboarding_switch',
    status: 'closed_until_exact_alejandro_approval',
    reason: 'Production onboarding remains protected.',
  },
  {
    action: 'crm_signal_ledger_card_scoring_fact_store',
    status: 'closed_until_separate_crm_approval_packet',
    reason: 'Review signals do not mutate CRM state.',
  },
];

const buildOperatingScenarios = ({ commandCatalog }) => {
  const commandNames = new Set(commandCatalog.map((entry) => entry.name));
  const command = (name) => commandNames.has(name) ? `npm run ${name}` : null;

  return [
    {
      id: 'backlog_intake',
      when: 'Alejandro has a new mini-launch idea but the current pilot is still waiting for department reviews.',
      firstMove: 'Use the backlog board to allow at most one more no-live idea intake with complete fields.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-backlog-board'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['platform build', 'MailerLite assets', 'receipts', 'onboarding handoff', 'CRM writes'],
    },
    {
      id: 'department_review_delivery',
      when: 'The individual review packets are ready but department responses do not exist yet.',
      firstMove: 'Use the delivery pack to route safe no-live review blocks and expected response files.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-department-review-delivery-pack'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['external send authorization', 'MailerLite mutations', 'Shopify edits', 'CRM writes', 'onboarding routing'],
    },
    {
      id: 'department_response_workspace',
      when: 'Department review packets are ready and the operator needs a clean place for Brand/Web/CRM replies.',
      firstMove: 'Create pending response working copies and wait for final response files before intake.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-department-review-response-workspace'),
        command('crm:vnext:mailerlite-mini-launch-department-review-draft-assist'),
        command('crm:vnext:mailerlite-mini-launch-department-review-finalization-preflight'),
        command('crm:vnext:mailerlite-mini-launch-department-review-finalize-pending'),
        command('crm:vnext:mailerlite-mini-launch-department-review-intake'),
        command('crm:vnext:mailerlite-mini-launch-department-review-reconciliation'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['Codex drafts as final responses', 'final responses as live approval', 'MailerLite mutations', 'Shopify edits', 'CRM writes', 'onboarding routing'],
    },
    {
      id: 'current_pilot_department_reviews',
      when: 'You need Brand, Web Design and CRM review for Inteligencia para descansar.',
      firstMove: 'Use the individual packets index and packet files in Mantis-Reports.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-department-review-packets'),
        command('crm:vnext:mailerlite-mini-launch-department-review-intake'),
        command('crm:vnext:mailerlite-mini-launch-department-review-reconciliation'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['MailerLite groups', 'Shopify edits', 'emails', 'CRM writes', 'onboarding routing'],
    },
    {
      id: 'after_brand_response',
      when: 'Brand returns a structured no-live response.',
      firstMove: 'Run intake/reconciliation with the Brand response file; rerun group dry-run only if reconciliation accepts it.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-department-review-intake'),
        command('crm:vnext:mailerlite-mini-launch-department-review-reconciliation'),
        command('crm:vnext:mailerlite-mini-launch-group-dry-run'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['group creation', 'subscriber assignment', 'workflow use'],
    },
    {
      id: 'new_mini_launch_idea',
      when: 'Alejandro chooses a new mini-product, quiz, guide, game or lead magnet idea.',
      firstMove: 'Create a no-live path packet and rehearsal before any platform work.',
      commands: [
        command('crm:vnext:mailerlite-mini-launch-path-packet'),
        command('crm:vnext:mailerlite-mini-launch-v0-packet'),
        command('crm:vnext:mailerlite-mini-launch-rehearsal-packet'),
        command('crm:vnext:mailerlite-mini-launch-event-contract'),
        command('crm:vnext:mailerlite-mini-launch-seed-test-qa-packet'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['Shopify', 'MailerLite', 'subscribers', 'audience send', 'CRM mutation'],
    },
    {
      id: 'onboarding_v2_lane',
      when: 'The protected editorial onboarding is being migrated or piloted.',
      firstMove: 'Use v1 audit and v2 packets; do not touch production v1.',
      commands: [
        command('crm:vnext:mailerlite-onboarding-v1-audit'),
        command('crm:vnext:mailerlite-onboarding-v2-design-packet'),
        command('crm:vnext:mailerlite-onboarding-v2-empty-groups-packet'),
        command('crm:vnext:mailerlite-onboarding-v2-execution-packet'),
        command('crm:vnext:mailerlite-onboarding-v2-event-contract'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['v1 edit', 'v2 activation', 'entry switch', 'workflow clone', 'seed sends'],
    },
    {
      id: 'brujula_test_lane',
      when: 'The existing Brújula test-only pilot needs verification or extension.',
      firstMove: 'Use Brújula lane plan/apply reports; do not expand scope without exact approval.',
      commands: [
        command('crm:vnext:mailerlite-brujula-test-lane-plan'),
        command('crm:vnext:mailerlite-brujula-test-lane-apply'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['audience send', 'workflow activation', 'public launch', 'onboarding route'],
    },
  ];
};

const buildRunbook = ({
  readinessBoard,
  cadenceBoard,
  backlogBoard,
  reconciliationBoard,
  packetsIndex,
  responseWorkspace,
  onboardingV1Audit,
  onboardingV2Execution,
  onboardingV2EventContract,
  brujulaPlan,
  brujulaApply,
  packageJson,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const commandCatalog = commandCatalogFrom(packageJson);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_operator_runbook',
    generatedAt,
    ok: true,
    status: 'mailerlite_launch_os_operator_runbook_ready_no_live_changes',
    currentState: buildCurrentState({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      reconciliationBoard,
      packetsIndex,
      onboardingV1Audit,
      onboardingV2Execution,
      onboardingV2EventContract,
      brujulaPlan,
      brujulaApply,
      responseWorkspace,
    }),
    reportMap: buildReportMap(sourceDigests),
    commandCatalog,
    operatingScenarios: buildOperatingScenarios({ commandCatalog }),
    approvalMatrix: buildApprovalMatrix(),
    immediateNextMoves: [
      'Run no-live department reviews from the individual packets.',
      'Use the delivery pack for copy-ready no-live blocks and expected response paths.',
      'Create the response workspace so Brand/Web/CRM replies land as pending drafts before final files.',
      'Use the draft assist only as a starting point for departments; it cannot replace final Brand/Web/CRM responses.',
      'Run finalization preflight before intake so pending files, Codex drafts and final response files cannot be confused.',
      'Use finalize-pending only after a department confirms a clean pending response is final; it writes local final response files only.',
      'Collect final responses through the response workspace and templates.',
      'Run reconciliation with response files before any dry-run rerun or build request.',
      'Use the backlog board only for one additional no-live idea intake, not for live production.',
      'Use the Onboarding v2 event contract before any future Signal Event Ledger append or CRM projection around onboarding.',
      'Keep every live gate closed until a later exact Alejandro approval names the action and scope.',
    ],
    safety: {
      localOnly: true,
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      mutationsPerformed: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
      crmScoreMutationsPerformed: false,
      factStoreWritePerformed: false,
      tokensPrinted: false,
    },
    sourceDigests,
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (runbook) => {
  const lines = [
    '# MailerLite Launch OS v0 - Operator Runbook',
    '',
    `Generated: ${runbook.generatedAt}`,
    `Status: ${runbook.status}`,
    '',
    '## Current State',
    '',
    `- Brújula functional: ${runbook.currentState.brujulaPilot.functionalStatus}`,
    `- Brújula creative: ${runbook.currentState.brujulaPilot.creativeStatus}`,
    `- Onboarding v1 protected: ${runbook.currentState.onboarding.productionV1Protected}`,
    `- Onboarding v1 workflow: ${runbook.currentState.onboarding.productionV1Workflow.name ?? 'unknown'}`,
    `- Onboarding v2 status: ${runbook.currentState.onboarding.v2ExecutionStatus ?? 'unknown'}`,
    `- Onboarding v2 event contract: ${runbook.currentState.onboarding.v2EventContractStatus ?? 'unknown'}`,
    `- Mini-launch readiness: ${runbook.currentState.miniLaunch.readinessState ?? 'unknown'}`,
    `- Mini-launch cadence: ${runbook.currentState.miniLaunch.cadenceNow}`,
    `- Safe to intake one more no-live idea: ${runbook.currentState.miniLaunch.safeToIntakeOneMoreNoLiveIdea}`,
    `- Department review status: ${runbook.currentState.miniLaunch.departmentReviewStatus}`,
    `- Response workspace: ${runbook.currentState.miniLaunch.responseWorkspaceStatus ?? 'unknown'}`,
    `- Ready for response intake: ${runbook.currentState.miniLaunch.readyForResponseIntake}`,
    `- Pending departments: ${runbook.currentState.miniLaunch.pendingDepartments.join(', ') || 'none'}`,
    `- Open live gates: ${runbook.currentState.liveGates.openLiveGateCount}`,
    '',
    '## Immediate Next Moves',
    '',
    renderList(runbook.immediateNextMoves),
    '',
    '## Operating Scenarios',
    '',
  ];

  for (const scenario of runbook.operatingScenarios) {
    lines.push(`### ${scenario.id}`);
    lines.push(`- When: ${scenario.when}`);
    lines.push(`- First move: ${scenario.firstMove}`);
    lines.push('- Commands:');
    lines.push(renderList(scenario.commands));
    lines.push('- Live gates remain closed:');
    lines.push(renderList(scenario.liveGatesRemainClosed));
    lines.push('');
  }

  lines.push('## Approval Matrix', '');
  for (const gate of runbook.approvalMatrix) {
    lines.push(`- ${gate.action}: ${gate.status}; ${gate.reason}`);
  }

  lines.push('', '## Command Catalog', '');
  for (const entry of runbook.commandCatalog) {
    lines.push(`- ${entry.name}: ${entry.liveRisk}`);
  }

  lines.push('', '## Report Map', '');
  for (const [name, path] of Object.entries(runbook.reportMap)) {
    lines.push(`- ${name}: ${path ?? 'missing'}`);
  }

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of runbook.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin envio de mensajes externos.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin mutaciones, envios ni tokens impresos.');

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

const buildRunbookFromFiles = async (options) => {
  const [
    readinessBoard,
    cadenceBoard,
    backlogBoard,
    reconciliationBoard,
    packetsIndex,
    deliveryPack,
    responseWorkspace,
    onboardingV1Audit,
    onboardingV2Execution,
    onboardingV2EventContract,
    brujulaPlan,
    brujulaApply,
    packageJson,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.readinessBoard),
    readJson(options.cadenceBoard),
    readJson(options.backlogBoard),
    readJson(options.reconciliationBoard),
    readJson(options.packetsIndex),
    readJson(options.deliveryPack),
    readJson(options.responseWorkspace),
    readJson(options.onboardingV1Audit),
    readJson(options.onboardingV2Execution),
    readJson(options.onboardingV2EventContract),
    readJson(options.brujulaPlan),
    readJson(options.brujulaApply),
    readJson(options.packageJson),
    loadSourceDigests(options),
  ]);

  return buildRunbook({
    readinessBoard,
    cadenceBoard,
    backlogBoard,
    reconciliationBoard,
    packetsIndex,
    deliveryPack,
    responseWorkspace,
    onboardingV1Audit,
    onboardingV2Execution,
    onboardingV2EventContract,
    brujulaPlan,
    brujulaApply,
    packageJson,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const runbook = await buildRunbookFromFiles(options);
  if (options.out) await writeJson(options.out, runbook);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(runbook));

  console.log(JSON.stringify({
    ok: runbook.ok,
    status: runbook.status,
    generatedAt: runbook.generatedAt,
    commandCount: runbook.commandCatalog.length,
    scenarioCount: runbook.operatingScenarios.length,
    openLiveGateCount: runbook.currentState.liveGates.openLiveGateCount,
    pendingDepartments: runbook.currentState.miniLaunch.pendingDepartments,
    safeToIntakeOneMoreNoLiveIdea: runbook.currentState.miniLaunch.safeToIntakeOneMoreNoLiveIdea,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: runbook.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS operator runbook failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalMatrix,
  buildCurrentState,
  buildOperatingScenarios,
  buildReportMap,
  buildRunbook,
  buildRunbookFromFiles,
  commandCatalogFrom,
  parseArgs,
  renderMarkdown,
};
