#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-operator-runbook-2026-05-27-trunk-contract';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const DEFAULT_MIGRATION_BLUEPRINT = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_BACKLOG_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_backlog_board_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RECONCILIATION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json';
const DEFAULT_PACKETS_INDEX = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json';
const DEFAULT_DELIVERY_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_FINALIZATION_PREFLIGHT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json';
const DEFAULT_OPERATOR_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json';
const DEFAULT_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WATCHER = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_TRUNK_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_trunk_map_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_event_contract_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_map_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_qa_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-27.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs [options]

Options:
  --control-room <path>              Launch OS control room doc. Defaults to ${DEFAULT_CONTROL_ROOM}
  --migration-blueprint <path>       Onboarding migration blueprint doc. Defaults to ${DEFAULT_MIGRATION_BLUEPRINT}
  --readiness-board <path>           Current mini-launch readiness JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --cadence-board <path>             Mini-launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --backlog-board <path>             Mini-launch backlog board JSON. Defaults to ${DEFAULT_BACKLOG_BOARD}
  --onboarding-handoff-policy <path> Mini-launch to onboarding handoff JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --reconciliation-board <path>      Department review reconciliation JSON. Defaults to ${DEFAULT_RECONCILIATION}
  --packets-index <path>             Department review packets index JSON. Defaults to ${DEFAULT_PACKETS_INDEX}
  --delivery-pack <path>             Department review delivery pack JSON. Defaults to ${DEFAULT_DELIVERY_PACK}
  --response-workspace <path>        Department review response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --finalization-preflight <path>    Department finalization preflight JSON. Defaults to ${DEFAULT_FINALIZATION_PREFLIGHT}
  --operator-queue <path>            Department review operator queue JSON. Defaults to ${DEFAULT_OPERATOR_QUEUE}
  --request-bundle <path>            Department review request bundle JSON. Defaults to ${DEFAULT_REQUEST_BUNDLE}
  --response-watcher <path>          Department response watcher JSON. Defaults to ${DEFAULT_RESPONSE_WATCHER}
  --onboarding-v1-audit <path>       Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-trunk-map <path>      Onboarding trunk map JSON. Defaults to ${DEFAULT_ONBOARDING_TRUNK_MAP}
  --onboarding-v2-execution <path>   Onboarding v2 execution JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EXECUTION}
  --onboarding-v2-event-contract <path> Onboarding v2 event contract JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EVENT_CONTRACT}
  --onboarding-v2-empty-groups-packet <path> Onboarding v2 empty-groups approval packet JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET}
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --onboarding-v2-first-email-map <path> Onboarding v2 first-email mapping JSON. Defaults to ${DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty group create runner dry-run JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --brujula-plan <path>              Brújula post-inbox verification plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>             Brújula approved test-lane apply JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --brujula-email-style-qa <path>    Brújula email style QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_QA}
  --brujula-email-style-correction <path> Brújula Email 1 style correction JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>   Brújula Email 1 local render QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --validation-receipt <path>        Optional persistent validation receipt JSON. Defaults to ${DEFAULT_VALIDATION_RECEIPT}
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
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    reconciliationBoard: DEFAULT_RECONCILIATION,
    packetsIndex: DEFAULT_PACKETS_INDEX,
    deliveryPack: DEFAULT_DELIVERY_PACK,
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    finalizationPreflight: DEFAULT_FINALIZATION_PREFLIGHT,
    operatorQueue: DEFAULT_OPERATOR_QUEUE,
    requestBundle: DEFAULT_REQUEST_BUNDLE,
    responseWatcher: DEFAULT_RESPONSE_WATCHER,
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingTrunkMap: DEFAULT_ONBOARDING_TRUNK_MAP,
    onboardingV2Execution: DEFAULT_ONBOARDING_V2_EXECUTION,
    onboardingV2EventContract: DEFAULT_ONBOARDING_V2_EVENT_CONTRACT,
    onboardingV2EmptyGroupsPacket: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET,
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    onboardingV2FirstEmailMap: DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    brujulaEmailStyleQa: DEFAULT_BRUJULA_EMAIL_STYLE_QA,
    brujulaEmailStyleCorrection: DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION,
    brujulaEmailRenderQa: DEFAULT_BRUJULA_EMAIL_RENDER_QA,
    validationReceipt: DEFAULT_VALIDATION_RECEIPT,
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
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--reconciliation-board') options.reconciliationBoard = argv[++index];
    else if (arg === '--packets-index') options.packetsIndex = argv[++index];
    else if (arg === '--delivery-pack') options.deliveryPack = argv[++index];
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--finalization-preflight') options.finalizationPreflight = argv[++index];
    else if (arg === '--operator-queue') options.operatorQueue = argv[++index];
    else if (arg === '--request-bundle') options.requestBundle = argv[++index];
    else if (arg === '--response-watcher') options.responseWatcher = argv[++index];
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-trunk-map') options.onboardingTrunkMap = argv[++index];
    else if (arg === '--onboarding-v2-execution') options.onboardingV2Execution = argv[++index];
    else if (arg === '--onboarding-v2-event-contract') options.onboardingV2EventContract = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-packet') options.onboardingV2EmptyGroupsPacket = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-first-email-map') options.onboardingV2FirstEmailMap = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--brujula-email-style-qa') options.brujulaEmailStyleQa = argv[++index];
    else if (arg === '--brujula-email-style-correction') options.brujulaEmailStyleCorrection = argv[++index];
    else if (arg === '--brujula-email-render-qa') options.brujulaEmailRenderQa = argv[++index];
    else if (arg === '--validation-receipt') options.validationReceipt = argv[++index];
    else if (arg === '--package-json') options.packageJson = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const loadSourceDigests = async (options) => {
  const sources = [
    [options.controlRoom, 'current operator state and gate map'],
    [options.migrationBlueprint, 'onboarding v1/v2 migration context'],
    [options.readinessBoard, 'current mini-launch readiness and closed live gates'],
    [options.cadenceBoard, 'mini-launch cadence, WIP limits and stages'],
    [options.backlogBoard, 'mini-launch idea queue and intake capacity'],
    [options.onboardingHandoffPolicy, 'mini-launch to onboarding handoff boundary and closed gates'],
    [options.reconciliationBoard, 'department review state and current blockers'],
    [options.packetsIndex, 'individual Brand/Web/CRM packets'],
    [options.deliveryPack, 'safe department review delivery blocks and response paths'],
    [options.responseWorkspace, 'pending response workspace and final response readiness'],
    [options.finalizationPreflight, 'department final response readiness and draft/pending distinction'],
    [options.operatorQueue, 'operator queue for department final response collection'],
    [options.requestBundle, 'copy-ready department request texts for final responses'],
    [options.responseWatcher, 'file-existence watcher for final Brand/Web/CRM responses'],
    [options.onboardingV1Audit, 'protected production onboarding v1 audit'],
    [options.onboardingTrunkMap, 'single operator map for current onboarding, v2 and mini-launch handoff'],
    [options.onboardingV2Execution, 'onboarding v2 execution posture and protected v1'],
    [options.onboardingV2EventContract, 'onboarding v2 CRM event contract and projection boundary'],
    [options.onboardingV2EmptyGroupsPacket, 'onboarding v2 empty-groups approval packet from fresh read-only scan', true],
    [options.onboardingV2EmptyGroupsCreateDryRun, 'onboarding v2 empty-groups create runner dry-run with zero mutations', true],
    [options.onboardingV2FirstEmailMap, 'onboarding v2 first-email mapping to prevent unnecessary Sent receipts', true],
    [options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty-group create runner dry-run with zero mutations', true],
    [options.brujulaPlan, 'Brújula post-inbox verification and creative QA posture'],
    [options.brujulaApply, 'approved Brújula test subscriber receipt assignments'],
    [options.brujulaEmailStyleQa, 'Brújula email style QA blockers and green criteria'],
    [options.brujulaEmailStyleCorrection, 'Brújula Email 1 corrected local draft and builder inputs'],
    [options.brujulaEmailRenderQa, 'Brújula Email 1 local render QA and preview evidence', true],
    [options.validationReceipt, 'persistent Launch OS validation receipt', true],
    [options.packageJson, 'available local npm commands'],
  ];

  const digests = [];
  for (const [path, consultedFor, optional = false] of sources) {
    let content;
    try {
      content = await readFile(resolve(path), 'utf8');
    } catch (error) {
      if (optional && error.code === 'ENOENT') {
        digests.push({
          path: resolve(path),
          present: false,
          chars: 0,
          consultedFor,
        });
        continue;
      }
      throw error;
    }
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
  onboardingHandoffPolicy,
  reconciliationBoard,
  packetsIndex,
  responseWorkspace,
  finalizationPreflight,
  operatorQueue,
  requestBundle,
  responseWatcher,
  onboardingV1Audit,
  onboardingTrunkMap,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  miniLaunchEmptyGroupCreateDryRun,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  validationReceipt,
}) => {
  const assignedGroupNames = groupNamesFrom(brujulaApply?.assignedGroups);
  const readinessLaneById = new Map((readinessBoard?.lanes ?? []).map((lane) => [lane.id, lane]));
  const emptyGroupApprovalLane = readinessLaneById.get('mailerlite_empty_group_approval_packet');
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
      emailStyleQaStatus: brujulaEmailStyleQa?.status ?? null,
      emailStyleQaFunctionalStatus: brujulaEmailStyleQa?.executiveSummary?.functionalStatus ?? null,
      emailStyleQaBlockerCount: brujulaEmailStyleQa?.executiveSummary?.blockerCount ?? null,
      emailStyleQaPublicUseReady: brujulaEmailStyleQa?.executiveSummary?.publicUseReady ?? false,
      emailStyleCorrectionStatus: brujulaEmailStyleCorrection?.status ?? null,
      correctedDraftPublicUseReady: brujulaEmailStyleCorrection?.executiveSummary?.publicUseReady ?? false,
      correctedDraftTestSendReady: brujulaEmailStyleCorrection?.executiveSummary?.testSendReady ?? false,
      correctedDraftHtmlPath: brujulaEmailStyleCorrection?.outputs?.htmlPath ?? null,
      emailRenderQaStatus: brujulaEmailRenderQa?.status ?? null,
      localRenderReady: brujulaEmailRenderQa?.executiveSummary?.localRenderReady ?? false,
      localRenderPreviewNonEmpty: brujulaEmailRenderQa?.executiveSummary?.renderPreviewNonEmpty ?? false,
      localRenderPreviewPath: brujulaEmailRenderQa?.renderPreview?.path ?? null,
      localRenderPreviewStatus: brujulaEmailRenderQa?.renderPreview?.status ?? null,
      localRenderPreviewSize: brujulaEmailRenderQa?.renderPreview?.fileSizeBytes ?? null,
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
      v2EmptyGroupsPacketStatus: onboardingV2EmptyGroupsPacket?.status ?? null,
      v2EmptyGroupsTargetCount: onboardingV2EmptyGroupsPacket?.sourceEvidence?.targetGroupCount
        ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount
        ?? null,
      v2EmptyGroupsLiveGroupsRead: onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveGroupsRead
        ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead
        ?? null,
      v2EmptyGroupsLiveAutomationsRead: onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveAutomationsRead
        ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveAutomationsRead
        ?? null,
      v2EmptyGroupsCanAskApproval: onboardingV2EmptyGroupsPacket?.approvalGate?.canAskAlejandroForApproval ?? false,
      v2EmptyGroupsBlockerCount: onboardingV2EmptyGroupsPacket?.blockers?.length
        ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length
        ?? null,
      v2EmptyGroupsCreateDryRunStatus: onboardingV2EmptyGroupsCreateDryRun?.status ?? null,
      v2EmptyGroupsCreateDryRunCreatedCount: onboardingV2EmptyGroupsCreateDryRun?.createdGroups?.length ?? null,
      v2EmptyGroupsCreateDryRunBlockerCount: onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length ?? null,
      v2FirstEmailMapStatus: onboardingV2FirstEmailMap?.status ?? null,
      v2FirstEmailSubject: onboardingV2FirstEmailMap?.firstEmail?.subject ?? null,
      v2FirstEmailRecommendedPosture: onboardingV2FirstEmailMap?.decision?.recommendedPosture ?? null,
      v2FirstEmailRecommendedSentGroup: onboardingV2FirstEmailMap?.decision?.recommendedMailerLiteSentGroup ?? null,
      v2FirstEmailCreateNewSentGroup: onboardingV2FirstEmailMap?.decision?.createNewSentGroup ?? null,
      v2FirstEmailCrmSignal: onboardingV2FirstEmailMap?.v2ImplementationGuidance?.crmSignals?.[0]?.event ?? null,
      trunkMapStatus: onboardingTrunkMap?.status ?? null,
      trunkMapSequenceItems: onboardingTrunkMap?.executiveSummary?.sequenceItems ?? null,
      trunkMapFutureHandoffTarget: onboardingTrunkMap?.executiveSummary?.futureHandoffTarget ?? null,
      trunkMapRecommendationIsRouting: onboardingTrunkMap?.executiveSummary?.recommendationIsRouting ?? null,
      recommendedPath: onboardingV1Audit?.migrationRecommendation?.option ?? null,
      productionSwitchApproved: false,
    },
    miniLaunch: {
      currentPilot: readinessBoard?.launch ?? cadenceBoard?.currentPilot?.launch ?? reconciliationBoard?.launch ?? null,
      readinessState: readinessBoard?.executiveSummary?.overallState ?? null,
      readyNoLiveLaneCount: readinessBoard?.executiveSummary?.readyNoLiveLaneCount ?? null,
      emptyGroupApprovalPacketStatus: emptyGroupApprovalLane?.sourceStatus ?? null,
      emptyGroupApprovalPacketReady: emptyGroupApprovalLane?.readyNow ?? false,
      emptyGroupApprovalPacketTargetCount: emptyGroupApprovalLane?.readiness?.targetGroupCount ?? null,
      emptyGroupApprovalPacketCanAskApproval: emptyGroupApprovalLane?.readiness?.canAskAlejandroForApproval ?? false,
      emptyGroupApprovalPacketRequiresFreshRerun: emptyGroupApprovalLane?.readiness?.requiresFreshRerunBeforeExecution ?? null,
      emptyGroupCreateDryRunStatus: miniLaunchEmptyGroupCreateDryRun?.status
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.sourceStatus
        ?? null,
      emptyGroupCreateDryRunGroupsRead: miniLaunchEmptyGroupCreateDryRun?.freshScan?.groupsRead
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.readiness?.freshGroupsRead
        ?? null,
      emptyGroupCreateDryRunTargetExistingCount: miniLaunchEmptyGroupCreateDryRun?.freshScan?.targetGroupsExistingCount
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.readiness?.targetGroupsExistingCount
        ?? null,
      emptyGroupCreateDryRunTargetMissingCount: miniLaunchEmptyGroupCreateDryRun?.freshScan?.targetGroupsMissingCount
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.readiness?.targetGroupsMissingCount
        ?? null,
      emptyGroupCreateDryRunCreatedCount: miniLaunchEmptyGroupCreateDryRun?.createdGroups?.length
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.readiness?.createdCount
        ?? null,
      emptyGroupCreateDryRunCanExecute: miniLaunchEmptyGroupCreateDryRun?.decision?.canExecute
        ?? readinessLaneById.get('mailerlite_empty_group_create_dry_run')?.readiness?.canExecute
        ?? false,
      cadenceNow: cadenceBoard?.operatingRhythm?.activeCadenceNow ?? null,
      every3DaysStatus: cadenceBoard?.operatingRhythm?.every3DaysStatus ?? null,
      safeToIntakeOneMoreNoLiveIdea: backlogBoard?.wipSnapshot?.safeToIntakeOneMoreNoLiveIdea ?? null,
      onboardingHandoffPolicyStatus: onboardingHandoffPolicy?.status ?? null,
      onboardingHandoffTargetGroup: onboardingHandoffPolicy?.targetGroups?.eligible ?? null,
      departmentReviewStatus: reconciliationBoard?.status ?? null,
      pendingDepartments: reconciliationBoard?.responseState?.pendingDepartments ?? packetsIndex?.pendingDepartments ?? [],
      responseWorkspaceStatus: responseWorkspace?.status ?? null,
      readyForResponseIntake: responseWorkspace?.readyForIntake ?? false,
      responseWorkspacePendingDepartments: responseWorkspace?.pendingDepartments ?? [],
      finalizationPreflightStatus: finalizationPreflight?.status ?? null,
      finalizationReadyForIntake: finalizationPreflight?.readyForIntake ?? false,
      acceptedFinalDepartments: finalizationPreflight?.acceptedDepartments ?? [],
      pendingReadyDepartments: finalizationPreflight?.pendingReadyDepartments ?? [],
      draftAssistDepartments: finalizationPreflight?.draftAssistDepartments ?? [],
      awaitingFinalDepartments: finalizationPreflight?.awaitingDepartments ?? [],
      operatorQueueStatus: operatorQueue?.status ?? null,
      operatorQueueNextBestMove: operatorQueue?.summary?.nextBestMove ?? null,
      operatorQueueAwaitingFinalCount: operatorQueue?.summary?.awaitingFinalCount ?? null,
      requestBundleStatus: requestBundle?.status ?? null,
      requestBundleRequestCount: requestBundle?.summary?.requestCount ?? null,
      requestBundleRequestsDir: requestBundle?.requestsDir ?? null,
      responseWatcherStatus: responseWatcher?.status ?? null,
      responseWatcherMissingFinalCount: responseWatcher?.summary?.missingFinalCount ?? null,
      responseWatcherFinalFilePresentCount: responseWatcher?.summary?.finalFilePresentCount ?? null,
      responseWatcherNextBestMove: responseWatcher?.summary?.nextBestMove ?? null,
      departmentResponseStates: (finalizationPreflight?.departments ?? []).map((department) => ({
        department: department.department,
        state: department.state,
        acceptedFinalResponse: department.acceptedFinalResponse,
        pendingCanBecomeFinal: department.pendingCanBecomeFinal,
        codexDraftAvailable: department.codexDraftAvailable,
      })),
      packetCount: packetsIndex?.packetCount ?? null,
    },
    liveGates: {
      openLiveGateCount,
      liveApprovalNeededNow: false,
    },
    validation: {
      receiptStatus: validationReceipt?.status ?? null,
      validationStatus: validationReceipt?.validationStatus ?? null,
      validationSummary: validationReceipt?.validationSummary ?? null,
      testFiles: validationReceipt?.testScope?.testFiles ?? null,
      testCount: validationReceipt?.testScope?.testCount ?? null,
      liveGatesClosed: validationReceipt?.evidence?.liveGatesClosed ?? null,
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
    onboardingHandoffPolicy: findPath('mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json'),
    departmentReviewPacketsIndex: findPath('mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json'),
    departmentReviewDeliveryPack: findPath('mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json'),
    departmentReviewResponseWorkspace: findPath('mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json'),
    departmentReviewFinalizationPreflight: findPath('mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json'),
    departmentReviewOperatorQueue: findPath('mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json'),
    departmentReviewRequestBundle: findPath('mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json'),
    departmentReviewResponseWatcher: findPath('mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json'),
    departmentReviewReconciliation: findPath('mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json'),
    onboardingV1Audit: findPath('mailerlite_onboarding_v1_audit_2026-05-27.json'),
    onboardingTrunkMap: findPath('mailerlite_onboarding_trunk_map_2026-05-27.json'),
    onboardingV2Execution: findPath('mailerlite_onboarding_v2_execution_packet_2026-05-27.json'),
    onboardingV2EventContract: findPath('mailerlite_onboarding_v2_event_contract_2026-05-27.json'),
    onboardingV2EmptyGroupsPacket: findPath('mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json'),
    onboardingV2EmptyGroupsCreateDryRun: findPath('mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json'),
    onboardingV2FirstEmailMap: findPath('mailerlite_onboarding_v2_first_email_map_2026-05-27.json'),
    miniLaunchEmptyGroupCreateDryRun: findPath('mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json'),
    brujulaPostInboxVerify: findPath('mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json'),
    brujulaTestLaneApply: findPath('mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json'),
    brujulaEmailStyleQa: findPath('mailerlite_brujula_email_style_qa_packet_2026-05-27.json'),
    brujulaEmailStyleCorrection: findPath('mailerlite_brujula_email_style_correction_packet_2026-05-27.json'),
    brujulaEmailRenderQa: findPath('mailerlite_brujula_email_render_qa_packet_2026-05-27.json'),
    validationReceipt: findPath('mailerlite_launch_os_validation_receipt_2026-05-27.json'),
    packageJson: findPath('package.json'),
  };
};

const buildOperatingPrinciples = () => [
  {
    id: 'protected_editorial_onboarding_trunk',
    principle: 'Treat the active editorial onboarding as the protected relationship-deepening trunk.',
    operatorRule: 'It welcomes new contacts, sends the spaced article sequence, marks completion and feeds the current general campaign audience; do not edit, pause, reroute into or replace it without a separate exact approval and rollback/reinsert plan.',
  },
  {
    id: 'mini_launches_as_marked_entry_points',
    principle: 'Treat mini-products, guides, quizzes, games and small launches as marked entry points and market-learning tributaries.',
    operatorRule: 'They may create Source/Delivered/Sent receipts, seed tests and CRM signal proposals after their own gates, but they must not become parallel onboarding flows by accident.',
  },
  {
    id: 'deliberate_handoff_to_onboarding',
    principle: 'A mini-launch can point toward onboarding only through a deliberate handoff gate.',
    operatorRule: 'The future target is usually CC · Journey · Editorial onboarding · Eligible; assigning it, using it in a workflow or routing a real person still requires the onboarding gate to be open and explicitly approved.',
  },
  {
    id: 'separate_delivery_identity_and_voice',
    principle: 'Keep MailerLite delivery, CRM relationship intelligence and Brand voice/design as separate but coordinated responsibilities.',
    operatorRule: 'MailerLite should not carry rich person memory, CRM should not invent Brand canon, and Brand review should happen before public/audience-facing assets are treated as agency-quality.',
  },
];

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
        command('crm:vnext:mailerlite-mini-launch-department-review-operator-queue'),
        command('crm:vnext:mailerlite-mini-launch-department-review-request-bundle'),
        command('crm:vnext:mailerlite-mini-launch-department-review-response-watcher'),
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
        command('crm:vnext:mailerlite-mini-launch-empty-group-creation-packet'),
        command('crm:vnext:mailerlite-mini-launch-empty-group-create'),
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
        command('crm:vnext:mailerlite-mini-launch-onboarding-handoff-policy'),
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
        command('crm:vnext:mailerlite-onboarding-v2-empty-groups-create'),
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
        command('crm:vnext:mailerlite-brujula-email-style-qa-packet'),
        command('crm:vnext:mailerlite-brujula-email-style-correction-packet'),
        command('crm:vnext:mailerlite-brujula-email-render-qa-packet'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['audience send', 'workflow activation', 'public launch', 'onboarding route'],
    },
  ];
};

const buildRunbook = ({
  readinessBoard,
  cadenceBoard,
  backlogBoard,
  onboardingHandoffPolicy,
  reconciliationBoard,
  packetsIndex,
  responseWorkspace,
  finalizationPreflight,
  operatorQueue,
  requestBundle,
  responseWatcher,
  onboardingV1Audit,
  onboardingTrunkMap,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  miniLaunchEmptyGroupCreateDryRun,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  validationReceipt,
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
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      finalizationPreflight,
      operatorQueue,
      requestBundle,
      responseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmptyGroupCreateDryRun,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      validationReceipt,
      responseWorkspace,
    }),
    reportMap: buildReportMap(sourceDigests),
    operatingPrinciples: buildOperatingPrinciples(),
    commandCatalog,
    operatingScenarios: buildOperatingScenarios({ commandCatalog }),
    approvalMatrix: buildApprovalMatrix(),
    immediateNextMoves: [
      'Run no-live department reviews from the individual packets.',
      'Use the delivery pack for copy-ready no-live blocks and expected response paths.',
      'Create the response workspace so Brand/Web/CRM replies land as pending drafts before final files.',
      'Use the draft assist only as a starting point for departments; it cannot replace final Brand/Web/CRM responses.',
      'Run finalization preflight before intake so pending files, Codex drafts and final response files cannot be confused.',
      'Use the operator queue to see each department message block, Codex draft, pending blockers and final response path in one place.',
      'Use the request bundle to route copy-ready department instructions without reconstructing context by hand.',
      'Use the Brújula email style QA packet to keep functional delivery separate from public-ready creative quality.',
      'Use the Brújula Email 1 correction packet as local builder input before any future exact test-send approval.',
      'Use the Brújula Email 1 render QA packet before any later exact MailerLite builder/test-send approval.',
      'Use finalize-pending only after a department confirms a clean pending response is final; it writes local final response files only.',
      'Collect final responses through the response workspace and templates.',
      'Run reconciliation with response files before any dry-run rerun or build request.',
      'Use the backlog board only for one additional no-live idea intake, not for live production.',
      'Use the onboarding trunk map before any mini-launch-to-onboarding route, v2 group approval packet or seed test.',
      'Use the mini-launch empty-group approval packet only as a human decision boundary; it cannot create groups by itself.',
      'Use the mini-launch empty-group create runner only in dry-run until Alejandro gives the exact phrase for --execute.',
      'Use the fresh Onboarding v2 empty-groups packet and create dry-run before asking for exact approval to create the 12 named empty groups.',
      'Use the Onboarding v2 first-email map so Email 1 stays welcome/orientation without an unnecessary Sent receipt.',
      'Use the response watcher before finalization preflight so missing final response files are obvious.',
      'Check the operating principles before routing a mini-launch toward onboarding or treating a launch asset as public-ready.',
      'Use the Onboarding v2 event contract before any future Signal Event Ledger append or CRM projection around onboarding.',
      'Regenerate the validation receipt after current-turn tests so the goal audit does not depend on ephemeral CLI flags.',
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
    `- Brújula email style QA: ${runbook.currentState.brujulaPilot.emailStyleQaStatus ?? 'unknown'}`,
    `- Brújula email style QA blockers: ${runbook.currentState.brujulaPilot.emailStyleQaBlockerCount ?? 'unknown'}`,
    `- Brújula Email 1 correction: ${runbook.currentState.brujulaPilot.emailStyleCorrectionStatus ?? 'unknown'}`,
    `- Brújula corrected draft HTML: ${runbook.currentState.brujulaPilot.correctedDraftHtmlPath ?? 'unknown'}`,
    `- Brújula Email 1 render QA: ${runbook.currentState.brujulaPilot.emailRenderQaStatus ?? 'unknown'}`,
    `- Brújula local render ready: ${runbook.currentState.brujulaPilot.localRenderReady}`,
    `- Brújula local render non-empty: ${runbook.currentState.brujulaPilot.localRenderPreviewNonEmpty}`,
    `- Brújula local render preview: ${runbook.currentState.brujulaPilot.localRenderPreviewPath ?? 'unknown'}`,
    `- Brújula local render preview size: ${runbook.currentState.brujulaPilot.localRenderPreviewSize ?? 'unknown'}`,
    `- Brújula public use ready: ${runbook.currentState.brujulaPilot.emailStyleQaPublicUseReady}`,
    `- Onboarding v1 protected: ${runbook.currentState.onboarding.productionV1Protected}`,
    `- Onboarding v1 workflow: ${runbook.currentState.onboarding.productionV1Workflow.name ?? 'unknown'}`,
    `- Onboarding v2 status: ${runbook.currentState.onboarding.v2ExecutionStatus ?? 'unknown'}`,
    `- Onboarding v2 event contract: ${runbook.currentState.onboarding.v2EventContractStatus ?? 'unknown'}`,
    `- Onboarding v2 empty-groups packet: ${runbook.currentState.onboarding.v2EmptyGroupsPacketStatus ?? 'unknown'}`,
    `- Onboarding v2 empty-groups target count: ${runbook.currentState.onboarding.v2EmptyGroupsTargetCount ?? 'unknown'}`,
    `- Onboarding v2 empty-groups live groups read: ${runbook.currentState.onboarding.v2EmptyGroupsLiveGroupsRead ?? 'unknown'}`,
    `- Onboarding v2 empty-groups live automations read: ${runbook.currentState.onboarding.v2EmptyGroupsLiveAutomationsRead ?? 'unknown'}`,
    `- Onboarding v2 empty-groups can ask approval: ${runbook.currentState.onboarding.v2EmptyGroupsCanAskApproval}`,
    `- Onboarding v2 empty-groups blocker count: ${runbook.currentState.onboarding.v2EmptyGroupsBlockerCount ?? 'unknown'}`,
    `- Onboarding v2 create dry-run: ${runbook.currentState.onboarding.v2EmptyGroupsCreateDryRunStatus ?? 'unknown'}`,
    `- Onboarding v2 create dry-run created count: ${runbook.currentState.onboarding.v2EmptyGroupsCreateDryRunCreatedCount ?? 'unknown'}`,
    `- Onboarding v2 first email map: ${runbook.currentState.onboarding.v2FirstEmailMapStatus ?? 'unknown'}`,
    `- Onboarding v2 first email posture: ${runbook.currentState.onboarding.v2FirstEmailRecommendedPosture ?? 'unknown'}`,
    `- Onboarding v2 first email Sent group: ${runbook.currentState.onboarding.v2FirstEmailRecommendedSentGroup ?? 'none'}`,
    `- Onboarding v2 first email create new Sent group: ${runbook.currentState.onboarding.v2FirstEmailCreateNewSentGroup ?? 'unknown'}`,
    `- Onboarding v2 first email CRM signal: ${runbook.currentState.onboarding.v2FirstEmailCrmSignal ?? 'unknown'}`,
    `- Onboarding trunk map: ${runbook.currentState.onboarding.trunkMapStatus ?? 'unknown'}`,
    `- Onboarding trunk sequence items: ${runbook.currentState.onboarding.trunkMapSequenceItems ?? 'unknown'}`,
    `- Onboarding trunk future handoff target: ${runbook.currentState.onboarding.trunkMapFutureHandoffTarget ?? 'unknown'}`,
    `- Onboarding trunk recommendation is routing: ${runbook.currentState.onboarding.trunkMapRecommendationIsRouting ?? 'unknown'}`,
    `- Mini-launch readiness: ${runbook.currentState.miniLaunch.readinessState ?? 'unknown'}`,
    `- Mini-launch empty-group approval packet: ${runbook.currentState.miniLaunch.emptyGroupApprovalPacketStatus ?? 'unknown'}`,
    `- Mini-launch empty-group approval packet ready: ${runbook.currentState.miniLaunch.emptyGroupApprovalPacketReady}`,
    `- Mini-launch empty-group target count: ${runbook.currentState.miniLaunch.emptyGroupApprovalPacketTargetCount ?? 'unknown'}`,
    `- Mini-launch empty-group can ask approval: ${runbook.currentState.miniLaunch.emptyGroupApprovalPacketCanAskApproval}`,
    `- Mini-launch empty-group requires fresh rerun: ${runbook.currentState.miniLaunch.emptyGroupApprovalPacketRequiresFreshRerun ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunStatus ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run groups read: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunGroupsRead ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run existing targets: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunTargetExistingCount ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run missing targets: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunTargetMissingCount ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run created count: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunCreatedCount ?? 'unknown'}`,
    `- Mini-launch empty-group create dry-run can execute: ${runbook.currentState.miniLaunch.emptyGroupCreateDryRunCanExecute}`,
    `- Mini-launch cadence: ${runbook.currentState.miniLaunch.cadenceNow}`,
    `- Safe to intake one more no-live idea: ${runbook.currentState.miniLaunch.safeToIntakeOneMoreNoLiveIdea}`,
    `- Onboarding handoff policy: ${runbook.currentState.miniLaunch.onboardingHandoffPolicyStatus ?? 'unknown'}`,
    `- Onboarding handoff target: ${runbook.currentState.miniLaunch.onboardingHandoffTargetGroup ?? 'unknown'}`,
    `- Department review status: ${runbook.currentState.miniLaunch.departmentReviewStatus}`,
    `- Response workspace: ${runbook.currentState.miniLaunch.responseWorkspaceStatus ?? 'unknown'}`,
    `- Ready for response intake: ${runbook.currentState.miniLaunch.readyForResponseIntake}`,
    `- Finalization preflight: ${runbook.currentState.miniLaunch.finalizationPreflightStatus ?? 'unknown'}`,
    `- Finalization ready for intake: ${runbook.currentState.miniLaunch.finalizationReadyForIntake}`,
    `- Accepted final departments: ${runbook.currentState.miniLaunch.acceptedFinalDepartments.join(', ') || 'none'}`,
    `- Draft assist departments: ${runbook.currentState.miniLaunch.draftAssistDepartments.join(', ') || 'none'}`,
    `- Awaiting final departments: ${runbook.currentState.miniLaunch.awaitingFinalDepartments.join(', ') || 'none'}`,
    `- Operator queue: ${runbook.currentState.miniLaunch.operatorQueueStatus ?? 'unknown'}`,
    `- Operator queue awaiting final count: ${runbook.currentState.miniLaunch.operatorQueueAwaitingFinalCount ?? 'unknown'}`,
    `- Operator queue next best move: ${runbook.currentState.miniLaunch.operatorQueueNextBestMove ?? 'unknown'}`,
    `- Request bundle: ${runbook.currentState.miniLaunch.requestBundleStatus ?? 'unknown'}`,
    `- Request bundle request count: ${runbook.currentState.miniLaunch.requestBundleRequestCount ?? 'unknown'}`,
    `- Request bundle dir: ${runbook.currentState.miniLaunch.requestBundleRequestsDir ?? 'unknown'}`,
    `- Response watcher: ${runbook.currentState.miniLaunch.responseWatcherStatus ?? 'unknown'}`,
    `- Response watcher missing final count: ${runbook.currentState.miniLaunch.responseWatcherMissingFinalCount ?? 'unknown'}`,
    `- Response watcher final file present count: ${runbook.currentState.miniLaunch.responseWatcherFinalFilePresentCount ?? 'unknown'}`,
    `- Response watcher next best move: ${runbook.currentState.miniLaunch.responseWatcherNextBestMove ?? 'unknown'}`,
    `- Pending departments: ${runbook.currentState.miniLaunch.pendingDepartments.join(', ') || 'none'}`,
    `- Open live gates: ${runbook.currentState.liveGates.openLiveGateCount}`,
    `- Validation receipt: ${runbook.currentState.validation.receiptStatus ?? 'missing'}`,
    `- Validation status: ${runbook.currentState.validation.validationStatus ?? 'unknown'}`,
    `- Validation tests: ${runbook.currentState.validation.testCount ?? 'unknown'}`,
    `- Validation live gates closed: ${runbook.currentState.validation.liveGatesClosed ?? 'unknown'}`,
    '',
    '## Operating Principles',
    '',
  ];

  for (const principle of runbook.operatingPrinciples) {
    lines.push(`### ${principle.id}`);
    lines.push(`- Principle: ${principle.principle}`);
    lines.push(`- Operator rule: ${principle.operatorRule}`);
    lines.push('');
  }

  lines.push(
    '## Immediate Next Moves',
    '',
    renderList(runbook.immediateNextMoves),
    '',
    '## Operating Scenarios',
    '',
  );

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
    onboardingHandoffPolicy,
    reconciliationBoard,
    packetsIndex,
    deliveryPack,
    responseWorkspace,
    finalizationPreflight,
    operatorQueue,
    requestBundle,
    responseWatcher,
    onboardingV1Audit,
    onboardingTrunkMap,
    onboardingV2Execution,
    onboardingV2EventContract,
    onboardingV2EmptyGroupsPacket,
    onboardingV2EmptyGroupsCreateDryRun,
    onboardingV2FirstEmailMap,
    miniLaunchEmptyGroupCreateDryRun,
    brujulaPlan,
    brujulaApply,
    brujulaEmailStyleQa,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    validationReceipt,
    packageJson,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.readinessBoard),
    readJson(options.cadenceBoard),
    readJson(options.backlogBoard),
    readJson(options.onboardingHandoffPolicy),
    readJson(options.reconciliationBoard),
    readJson(options.packetsIndex),
    readJson(options.deliveryPack),
    readJson(options.responseWorkspace),
    readJson(options.finalizationPreflight),
    readJson(options.operatorQueue),
    readJson(options.requestBundle),
    readJson(options.responseWatcher),
    readJson(options.onboardingV1Audit),
    readJson(options.onboardingTrunkMap),
    readJson(options.onboardingV2Execution),
    readJson(options.onboardingV2EventContract),
    readOptionalJson(options.onboardingV2EmptyGroupsPacket),
    readOptionalJson(options.onboardingV2EmptyGroupsCreateDryRun),
    readOptionalJson(options.onboardingV2FirstEmailMap),
    readOptionalJson(options.miniLaunchEmptyGroupCreateDryRun),
    readJson(options.brujulaPlan),
    readJson(options.brujulaApply),
    readJson(options.brujulaEmailStyleQa),
    readJson(options.brujulaEmailStyleCorrection),
    readOptionalJson(options.brujulaEmailRenderQa),
    readOptionalJson(options.validationReceipt),
    readJson(options.packageJson),
    loadSourceDigests(options),
  ]);

  return buildRunbook({
    readinessBoard,
    cadenceBoard,
    backlogBoard,
    onboardingHandoffPolicy,
    reconciliationBoard,
    packetsIndex,
    deliveryPack,
    responseWorkspace,
    finalizationPreflight,
    operatorQueue,
    requestBundle,
    responseWatcher,
    onboardingV1Audit,
    onboardingTrunkMap,
    onboardingV2Execution,
    onboardingV2EventContract,
    onboardingV2EmptyGroupsPacket,
    onboardingV2EmptyGroupsCreateDryRun,
    onboardingV2FirstEmailMap,
    miniLaunchEmptyGroupCreateDryRun,
    brujulaPlan,
    brujulaApply,
    brujulaEmailStyleQa,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    validationReceipt,
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
    validationStatus: runbook.currentState.validation.validationStatus,
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
  buildOperatingPrinciples,
  buildOperatingScenarios,
  buildReportMap,
  buildRunbook,
  buildRunbookFromFiles,
  commandCatalogFrom,
  parseArgs,
  renderMarkdown,
};
