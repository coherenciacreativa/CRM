#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-operator-runbook-2026-05-27-trunk-contract';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const DEFAULT_MIGRATION_BLUEPRINT = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_BACKLOG_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_backlog_board_2026-05-28.json';
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
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_map_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_draft_repair_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_execution_receipt_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_qa_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_real_mailerlite_render_qa_2026-05-28.json';
const DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';
const DEFAULT_APPROVAL_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_intake_2026-05-28.json';
const DEFAULT_BLOCKED_GATE_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json';
const DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_template_pack_2026-05-28.json';
const DEFAULT_POST_INPUT_ORCHESTRATOR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_post_input_orchestrator_2026-05-28.json';
const DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.json';
const DEFAULT_CONTINUATION_GUARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_continuation_guard_2026-05-28.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.json';
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
  --onboarding-v2-empty-groups-execution <path> Onboarding v2 executed empty-groups receipt JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION}
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --onboarding-v2-first-email-map <path> Onboarding v2 first-email mapping JSON. Defaults to ${DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty group create runner dry-run JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --mini-launch-crm-signal-projection-packet <path> Mini-launch CRM signal projection JSON. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET}
  --mini-launch-crm-write-approval-packet <path> Mini-launch CRM write approval JSON. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET}
  --mini-launch-email-style-qa-packet <path> Mini-launch Email Style QA JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET}
  --mini-launch-local-email-asset-plan <path> Mini-launch local email asset plan JSON. Defaults to ${DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN}
  --mini-launch-email-asset-build-scope-packet <path> Mini-launch exact approval scope packet for future email asset build. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --mini-launch-email-builder-payload-manifest <path> Mini-launch local builder payload manifest. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --mini-launch-email-render-qa <path> Mini-launch local email render QA JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA}
  --mini-launch-email-manual-ui-build-receipt <path> Mini-launch manual UI draft build receipt JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --mini-launch-email-manual-ui-draft-repair-packet <path> Mini-launch manual UI draft repair packet JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET}
  --mini-launch-seed-test-qa-packet <path> Mini-launch seed/test QA preflight JSON. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET}
  --mini-launch-seed-test-execution-receipt <path> Mini-launch completed seed/test execution receipt JSON. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT}
  --mini-launch-shopify-local-build-receipt <path> Mini-launch Shopify local build receipt JSON. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --brujula-plan <path>              Brújula post-inbox verification plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>             Brújula approved test-lane apply JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --brujula-email-style-qa <path>    Brújula email style QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_QA}
  --brujula-email-style-correction <path> Brújula Email 1 style correction JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>   Brújula Email 1 local render QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --brujula-real-mailerlite-render-qa <path> Brújula real MailerLite draft render QA JSON. Defaults to ${DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA}
  --brujula-email-manual-ui-build-receipt <path> Brújula Email 1 manual UI build receipt JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --approval-queue <path>            Launch OS exact approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --approval-intake <path>           Launch OS exact approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
  --blocked-gate-handoff <path>      Launch OS blocked-gate handoff JSON. Defaults to ${DEFAULT_BLOCKED_GATE_HANDOFF}
  --missing-inputs-kit <path>         Launch OS missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --missing-inputs-intake <path>      Launch OS missing-inputs redacted intake JSON. Defaults to ${DEFAULT_MISSING_INPUTS_INTAKE}
  --missing-inputs-request-bundle <path> Launch OS copy-ready missing-input request bundle JSON. Defaults to ${DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE}
  --private-input-template-pack <path> Launch OS inert private-input template pack JSON. Defaults to ${DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK}
  --post-input-orchestrator <path> Launch OS post-input local orchestrator JSON. Defaults to ${DEFAULT_POST_INPUT_ORCHESTRATOR}
  --taxonomy-consolidation-audit <path> Launch OS taxonomy consolidation audit JSON. Defaults to ${DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT}
  --taxonomy-refresh-handoff <path> Launch OS Brand/CRM taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --taxonomy-refresh-response-workspace <path> Launch OS Brand/CRM taxonomy response workspace JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE}
  --taxonomy-refresh-decision-intake <path> Launch OS Brand/CRM taxonomy decision intake JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE}
  --taxonomy-refresh-response-request-bundle <path> Launch OS Brand/CRM taxonomy response request bundle JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE}
  --continuation-guard <path>        Launch OS continuation guard JSON. Defaults to ${DEFAULT_CONTINUATION_GUARD}
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
    onboardingV2EmptyGroupsExecution: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION,
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    onboardingV2FirstEmailMap: DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    miniLaunchCrmSignalProjectionPacket: DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET,
    miniLaunchCrmWriteApprovalPacket: DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET,
    miniLaunchEmailStyleQaPacket: DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET,
    miniLaunchLocalEmailAssetPlan: DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN,
    miniLaunchEmailAssetBuildScopePacket: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    miniLaunchEmailBuilderPayloadManifest: DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    miniLaunchEmailRenderQa: DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA,
    miniLaunchEmailManualUiBuildReceipt: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT,
    miniLaunchEmailManualUiDraftRepairPacket: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET,
    miniLaunchSeedTestQaPacket: DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET,
    miniLaunchSeedTestExecutionReceipt: DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT,
    miniLaunchShopifyLocalBuildReceipt: DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT,
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    brujulaEmailStyleQa: DEFAULT_BRUJULA_EMAIL_STYLE_QA,
    brujulaEmailStyleCorrection: DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION,
    brujulaEmailRenderQa: DEFAULT_BRUJULA_EMAIL_RENDER_QA,
    brujulaRealMailerLiteRenderQa: DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA,
    brujulaEmailManualUiBuildReceipt: DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    approvalIntake: DEFAULT_APPROVAL_INTAKE,
    blockedGateHandoff: DEFAULT_BLOCKED_GATE_HANDOFF,
    missingInputsKit: DEFAULT_MISSING_INPUTS_KIT,
    missingInputsIntake: DEFAULT_MISSING_INPUTS_INTAKE,
    missingInputsRequestBundle: DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE,
    privateInputTemplatePack: DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK,
    postInputOrchestrator: DEFAULT_POST_INPUT_ORCHESTRATOR,
    taxonomyConsolidationAudit: DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT,
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    taxonomyRefreshResponseWorkspace: DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE,
    taxonomyRefreshDecisionIntake: DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE,
    taxonomyRefreshResponseRequestBundle: DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE,
    continuationGuard: DEFAULT_CONTINUATION_GUARD,
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
    else if (arg === '--onboarding-v2-empty-groups-execution') options.onboardingV2EmptyGroupsExecution = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-first-email-map') options.onboardingV2FirstEmailMap = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--mini-launch-crm-signal-projection-packet') options.miniLaunchCrmSignalProjectionPacket = argv[++index];
    else if (arg === '--mini-launch-crm-write-approval-packet') options.miniLaunchCrmWriteApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-email-style-qa-packet') options.miniLaunchEmailStyleQaPacket = argv[++index];
    else if (arg === '--mini-launch-local-email-asset-plan') options.miniLaunchLocalEmailAssetPlan = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-scope-packet') options.miniLaunchEmailAssetBuildScopePacket = argv[++index];
    else if (arg === '--mini-launch-email-builder-payload-manifest') options.miniLaunchEmailBuilderPayloadManifest = argv[++index];
    else if (arg === '--mini-launch-email-render-qa') options.miniLaunchEmailRenderQa = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-build-receipt') options.miniLaunchEmailManualUiBuildReceipt = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-draft-repair-packet') options.miniLaunchEmailManualUiDraftRepairPacket = argv[++index];
    else if (arg === '--mini-launch-seed-test-qa-packet') options.miniLaunchSeedTestQaPacket = argv[++index];
    else if (arg === '--mini-launch-seed-test-execution-receipt') options.miniLaunchSeedTestExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-shopify-local-build-receipt') options.miniLaunchShopifyLocalBuildReceipt = argv[++index];
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--brujula-email-style-qa') options.brujulaEmailStyleQa = argv[++index];
    else if (arg === '--brujula-email-style-correction') options.brujulaEmailStyleCorrection = argv[++index];
    else if (arg === '--brujula-email-render-qa') options.brujulaEmailRenderQa = argv[++index];
    else if (arg === '--brujula-real-mailerlite-render-qa') options.brujulaRealMailerLiteRenderQa = argv[++index];
    else if (arg === '--brujula-email-manual-ui-build-receipt') options.brujulaEmailManualUiBuildReceipt = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--approval-intake') options.approvalIntake = argv[++index];
    else if (arg === '--blocked-gate-handoff') options.blockedGateHandoff = argv[++index];
    else if (arg === '--missing-inputs-kit') options.missingInputsKit = argv[++index];
    else if (arg === '--missing-inputs-intake') options.missingInputsIntake = argv[++index];
    else if (arg === '--missing-inputs-request-bundle') options.missingInputsRequestBundle = argv[++index];
    else if (arg === '--private-input-template-pack') options.privateInputTemplatePack = argv[++index];
    else if (arg === '--post-input-orchestrator') options.postInputOrchestrator = argv[++index];
    else if (arg === '--taxonomy-consolidation-audit') options.taxonomyConsolidationAudit = argv[++index];
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--taxonomy-refresh-response-workspace') options.taxonomyRefreshResponseWorkspace = argv[++index];
    else if (arg === '--taxonomy-refresh-decision-intake') options.taxonomyRefreshDecisionIntake = argv[++index];
    else if (arg === '--taxonomy-refresh-response-request-bundle') options.taxonomyRefreshResponseRequestBundle = argv[++index];
    else if (arg === '--continuation-guard') options.continuationGuard = argv[++index];
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
    [options.onboardingV2EmptyGroupsExecution, 'onboarding v2 empty-groups execution receipt for already-created empty groups', true],
    [options.onboardingV2EmptyGroupsCreateDryRun, 'onboarding v2 empty-groups create runner dry-run with zero mutations', true],
    [options.onboardingV2FirstEmailMap, 'onboarding v2 first-email mapping to prevent unnecessary Sent receipts', true],
    [options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty-group create runner dry-run with zero mutations', true],
    [options.miniLaunchCrmSignalProjectionPacket, 'mini-launch CRM signal projection packet with closed write gates', true],
    [options.miniLaunchCrmWriteApprovalPacket, 'mini-launch CRM write approval packet with exact events/people/fields boundary', true],
    [options.miniLaunchEmailStyleQaPacket, 'mini-launch Email Style QA packet after final Brand sequence approval', true],
    [options.miniLaunchLocalEmailAssetPlan, 'mini-launch local email asset plan with inert placeholders and build/send gates closed', true],
    [options.miniLaunchEmailAssetBuildScopePacket, 'mini-launch exact approval scope packet for future MailerLite draft email asset build; no execution', true],
    [options.miniLaunchEmailBuilderPayloadManifest, 'mini-launch local builder payload manifest with exact payloads and closed execution/send gates', true],
    [options.miniLaunchEmailRenderQa, 'mini-launch local email render QA with HTML and non-empty PNG preview evidence', true],
    [options.miniLaunchEmailManualUiBuildReceipt, 'mini-launch manual UI draft build receipt and closed send/subscriber/workflow gates', true],
    [options.miniLaunchEmailManualUiDraftRepairPacket, 'mini-launch manual UI draft repair packet for real-render exact-copy mismatch', true],
    [options.miniLaunchSeedTestQaPacket, 'mini-launch seed/test QA preflight with real-render and seed-recipient blockers', true],
    [options.miniLaunchSeedTestExecutionReceipt, 'mini-launch completed seed/test execution receipt with Gmail verification and closed public gates', true],
    [options.miniLaunchShopifyLocalBuildReceipt, 'mini-launch Shopify local build receipt and closed publish/form/API gates', true],
    [options.brujulaPlan, 'Brújula post-inbox verification and creative QA posture'],
    [options.brujulaApply, 'approved Brújula test subscriber receipt assignments'],
    [options.brujulaEmailStyleQa, 'Brújula email style QA blockers and green criteria'],
    [options.brujulaEmailStyleCorrection, 'Brújula Email 1 corrected local draft and builder inputs'],
    [options.brujulaEmailRenderQa, 'Brújula Email 1 local render QA and preview evidence', true],
    [options.brujulaRealMailerLiteRenderQa, 'Brújula Email 1 real MailerLite draft render QA evidence', true],
    [options.brujulaEmailManualUiBuildReceipt, 'Brújula Email 1 manual UI draft build receipt and closed gates', true],
    [options.approvalQueue, 'single exact approval queue for current MailerLite Launch OS gates', true],
    [options.approvalIntake, 'local exact approval intake and fresh-evidence pre-execution plan', true],
    [options.blockedGateHandoff, 'current blocked gates and missing inputs before any new approval request', true],
    [options.missingInputsKit, 'Launch OS missing-inputs kit with capture specs and post-input commands', true],
    [options.missingInputsIntake, 'Launch OS missing-inputs intake with redacted private input status', true],
    [options.missingInputsRequestBundle, 'Launch OS copy-ready missing-input request bundle with no approval or private file creation', true],
    [options.privateInputTemplatePack, 'Launch OS inert private-input template pack with example files ignored by active intake', true],
    [options.postInputOrchestrator, 'Launch OS post-input orchestrator with local packet regeneration plan and no execution', true],
    [options.taxonomyConsolidationAudit, 'Launch OS taxonomy consolidation audit across Brand dictionary, CRM manifest and approved empty-group receipts', true],
    [options.taxonomyRefreshHandoff, 'Launch OS Brand/CRM taxonomy refresh handoff prepared from consolidation drift', true],
    [options.taxonomyRefreshResponseWorkspace, 'Launch OS Brand/CRM taxonomy response workspace with pending/final file separation', true],
    [options.taxonomyRefreshDecisionIntake, 'Launch OS Brand/CRM taxonomy decision intake with local patch preview gate state', true],
    [options.taxonomyRefreshResponseRequestBundle, 'Launch OS Brand/CRM taxonomy final-response request bundle with no approval or execution', true],
    [options.continuationGuard, 'Launch OS continuation guard with closed hito and do-not-recycle state', true],
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

const isFalse = (value) => value === false;
const anyIncludes = (items, fragments) => (items ?? [])
  .some((item) => fragments.some((fragment) => String(item).includes(fragment)));
const allContentChecksGreen = (checks) =>
  Boolean(checks) && Object.values(checks).every((value) => value === true);
const brujulaManualUiStatus = (receipt) => receipt?.status ?? null;
const brujulaManualUiCampaignId = (receipt) =>
  receipt?.executiveSummary?.campaignId ?? receipt?.campaign?.id ?? null;
const brujulaManualUiCampaignName = (receipt) =>
  receipt?.executiveSummary?.campaignName ?? receipt?.campaign?.name ?? null;
const brujulaManualUiSubject = (receipt) =>
  receipt?.executiveSummary?.subject ?? receipt?.campaign?.subject ?? null;
const brujulaManualUiPreheader = (receipt) =>
  receipt?.executiveSummary?.preheader ?? receipt?.campaign?.preheader ?? null;
const brujulaManualUiOutboxCount = (receipt) =>
  receipt?.executiveSummary?.outboxCountAfterBuild
    ?? receipt?.verification?.postExecutionApiVerify?.readyOutboxCampaignsRead
    ?? null;
const brujulaManualUiCreatedOrEditedCount = (receipt) =>
  receipt?.executiveSummary?.createdOrEditedDraftCount
    ?? (receipt?.campaign?.id && receipt?.campaign?.status === 'draft' ? 1 : null);

const brujulaManualUiBuildClosed = (receipt) => {
  const status = brujulaManualUiStatus(receipt);
  const oldSchemaClosed = status === 'brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends'
    && brujulaManualUiCreatedOrEditedCount(receipt) === 1
    && brujulaManualUiOutboxCount(receipt) === 0
    && receipt?.draftReceipt?.uiVisibleInDrafts === true
    && receipt?.draftReceipt?.recipientsEmptyObserved === true
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesCreated === false
    && receipt?.safety?.subscribersReadOrAssigned === false
    && receipt?.safety?.groupsCreatedOrAssigned === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && anyIncludes(receipt?.stillClosedAfterThisReceipt, ['test_send_or_public_send']);

  const verify = receipt?.verification?.postExecutionApiVerify ?? {};
  const greenReceiptClosed = status === 'brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends'
    && receipt?.ok === true
    && receipt?.scope?.approvedScopeId === 'brujula_email1_builder_draft'
    && receipt?.scope?.exactApprovalMatched === true
    && brujulaManualUiCreatedOrEditedCount(receipt) === 1
    && receipt?.campaign?.status === 'draft'
    && isFalse(receipt?.campaign?.recipientsSelected)
    && isFalse(receipt?.campaign?.groupsOrSegmentsSelected)
    && isFalse(receipt?.campaign?.scheduled)
    && isFalse(receipt?.campaign?.sent)
    && verify?.status === 'post_ui_paste_verify_green'
    && verify?.targetInDraft === true
    && verify?.targetInReadyOutbox === false
    && verify?.targetInSent === false
    && allContentChecksGreen(verify?.contentChecks)
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesPerformed === false
    && receipt?.safety?.publicCampaignPublished === false
    && receipt?.safety?.subscriberMutationsPerformed === false
    && receipt?.safety?.groupsCreated === false
    && receipt?.safety?.groupAssignmentsPerformed === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && anyIncludes(receipt?.scope?.stillClosed, ['send_email_or_test_email', 'cards_scoring_or_fact_store_writes']);

  return oldSchemaClosed || greenReceiptClosed;
};

const seedTestExecutionCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'seed_test_execution_completed_verified_by_gmail_no_public_send'
  && receipt?.gmailVerification?.observedTestMessageCount === 4
  && receipt?.gmailVerification?.expectedTestMessageCount === 4
  && receipt?.gmailVerification?.allSubjectsMatchedExpected === true
  && receipt?.gmailVerification?.allRecipientsMatchedApprovedSeedRecipient === true
  && receipt?.uiExecution?.verificationEmail?.sentOnlyToApprovedSeedRecipient === true
  && receipt?.uiExecution?.verificationEmail?.completed === true
  && receipt?.uiExecution?.outboxCountObservedAfterExecution === 0
  && receipt?.safety?.testEmailsSentToSeedRecipientCount === 4
  && receipt?.safety?.verificationEmailSentToSeedRecipientCount === 1
  && receipt?.safety?.publicCampaignSendPerformed === false
  && receipt?.safety?.audienceSendPerformed === false
  && receipt?.safety?.subscribersCreatedOrImported === false
  && receipt?.safety?.subscribersAssignedOutsideSeedRecipient === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowsOrAutomationsCreatedOrEditedOrActivated === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.shopifyFilesChangedByThisExecution === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.signalLedgerAppendPerformed === false
  && receipt?.safety?.crmCardMutationsPerformed === false
  && receipt?.safety?.crmScoreMutationsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.secretsOrVerificationTokensPrinted === false;

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
  onboardingV2EmptyGroupsExecution,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  miniLaunchEmptyGroupCreateDryRun,
  miniLaunchCrmSignalProjectionPacket,
  miniLaunchCrmWriteApprovalPacket,
  miniLaunchEmailStyleQaPacket,
  miniLaunchLocalEmailAssetPlan,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailRenderQa,
  miniLaunchEmailManualUiBuildReceipt,
  miniLaunchEmailManualUiDraftRepairPacket,
  miniLaunchSeedTestQaPacket,
  miniLaunchSeedTestExecutionReceipt,
  miniLaunchShopifyLocalBuildReceipt,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  brujulaRealMailerLiteRenderQa,
  brujulaEmailManualUiBuildReceipt,
  approvalQueue,
  approvalIntake,
  blockedGateHandoff,
  missingInputsKit,
  missingInputsIntake,
  missingInputsRequestBundle,
  privateInputTemplatePack,
  postInputOrchestrator,
  taxonomyConsolidationAudit,
  taxonomyRefreshHandoff,
  taxonomyRefreshResponseWorkspace,
  taxonomyRefreshDecisionIntake,
  taxonomyRefreshResponseRequestBundle,
  continuationGuard,
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
  const manualUiDraftVisibleCount = (miniLaunchEmailManualUiBuildReceipt?.draftReceipts ?? [])
    .filter((draft) => draft?.status === 'draft_visible_in_mailerlite_drafts' && draft?.uiVisibleInDrafts === true)
    .length;
  const manualUiBuildClosed = miniLaunchEmailManualUiBuildReceipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && manualUiDraftVisibleCount === 4
    && miniLaunchEmailManualUiBuildReceipt?.safety?.sendsPerformed === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.schedulesCreated === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.subscribersReadOrAssigned === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.groupsCreatedOrAssigned === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.workflowMutationsPerformed === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.factStoreWritePerformed === false
    && (miniLaunchEmailManualUiBuildReceipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send');
  const miniLaunchSeedTestExecutionCompleted = seedTestExecutionCompleted(miniLaunchSeedTestExecutionReceipt);
  const brujulaManualUiBuildClosedNow = brujulaManualUiBuildClosed(brujulaEmailManualUiBuildReceipt);
  const shopifyLocalBuildClosed = miniLaunchShopifyLocalBuildReceipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes'
    && miniLaunchShopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated === 5
    && miniLaunchShopifyLocalBuildReceipt?.validation?.jsonTemplatesParsed === true
    && miniLaunchShopifyLocalBuildReceipt?.validation?.noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles === true
    && miniLaunchShopifyLocalBuildReceipt?.validation?.noMailerLiteScriptsFoundInNewFiles === true
    && miniLaunchShopifyLocalBuildReceipt?.validation?.noShopifyAdminApiOrPublishCommandRun === true
    && miniLaunchShopifyLocalBuildReceipt?.validation?.noRealFormAction === true
    && miniLaunchShopifyLocalBuildReceipt?.validation?.noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles === true
    && miniLaunchShopifyLocalBuildReceipt?.placeholders?.present === true
    && miniLaunchShopifyLocalBuildReceipt?.placeholders?.inert === true
    && miniLaunchShopifyLocalBuildReceipt?.safety?.shopifyApiCalled === false
    && miniLaunchShopifyLocalBuildReceipt?.safety?.shopifyPublishPerformed === false
    && miniLaunchShopifyLocalBuildReceipt?.safety?.realFormsCreated === false
    && miniLaunchShopifyLocalBuildReceipt?.safety?.mailerLiteApiCalled === false
    && miniLaunchShopifyLocalBuildReceipt?.safety?.crmLiveApiCalled === false;
  const v2EmptyGroupsExecutionCompleted = onboardingV2EmptyGroupsExecution?.status === 'executed_onboarding_v2_empty_group_creation'
    && onboardingV2EmptyGroupsExecution?.mode === 'execute_requested'
    && onboardingV2EmptyGroupsExecution?.createdGroups?.length === 12
    && onboardingV2EmptyGroupsExecution?.decision?.approval?.status === 'exact_approval_phrase_matched'
    && onboardingV2EmptyGroupsExecution?.safety?.groupMutationType === 'create_empty_groups_only'
    && onboardingV2EmptyGroupsExecution?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsExecution?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsExecution?.safety?.subscriberAssignmentsPerformed === false
    && onboardingV2EmptyGroupsExecution?.safety?.sendsPerformed === false;
  const v2EmptyGroupsTargetPlan = onboardingV2EmptyGroupsCreateDryRun?.decision?.targetPlan ?? [];
  const v2EmptyGroupsPostExecutionAllExist = onboardingV2EmptyGroupsCreateDryRun?.status === 'dry_run_blocked'
    && onboardingV2EmptyGroupsCreateDryRun?.mode === 'dry_run'
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount === 12
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead >= 89
    && v2EmptyGroupsTargetPlan.length === 12
    && v2EmptyGroupsTargetPlan.every((target) => target?.existsInFreshScan === true)
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.mode === 'dry_run_only'
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.groupMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.sendsPerformed === false;
  const v2EmptyGroupsClosed = v2EmptyGroupsExecutionCompleted && v2EmptyGroupsPostExecutionAllExist;
  const v2EmptyGroupsExistingTargetCount = v2EmptyGroupsTargetPlan
    .filter((target) => target?.existsInFreshScan === true)
    .length;
  const v2EmptyGroupsAlreadyExistsBlockerCount = (onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers ?? [])
    .filter((blocker) => String(blocker).includes('already_exists_in_fresh_scan'))
    .length;
  const v2EmptyGroupsTargetCount = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.targetGroupCount
    ?? null;
  const v2EmptyGroupsLiveGroupsRead = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveGroupsRead
    ?? null;
  const v2EmptyGroupsLiveAutomationsRead = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveAutomationsRead
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveAutomationsRead
    ?? null;
  const v2EmptyGroupsPacketBlockerCount = onboardingV2EmptyGroupsPacket?.blockers?.length
    ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length
    ?? null;
  const approvalItemStatusById = Object.fromEntries(
    (approvalQueue?.approvalItems ?? [])
      .filter((item) => item?.id)
      .map((item) => [item.id, item.status ?? null]),
  );
  const referenceOnlyApprovalIds = Object.entries(approvalItemStatusById)
    .filter(([, status]) => status === 'reference_only_no_approval_request_now')
    .map(([id]) => id);
  const blockedGateInputNeededIds = (blockedGateHandoff?.inputNeededNow ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const blockedGateIds = (blockedGateHandoff?.blockedGates ?? [])
    .map((gate) => gate?.id)
    .filter(Boolean);
  const missingInputsKitInputIds = (missingInputsKit?.inputRequests ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const missingInputsIntakeInputIds = (missingInputsIntake?.inputStates ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const missingInputsIntakeBlockerIds = missingInputsIntake?.executiveSummary?.blockerIds ?? [];
  const missingInputsRequestBundleIds = (missingInputsRequestBundle?.requests ?? [])
    .map((request) => request?.id)
    .filter(Boolean);
  const privateInputTemplateIds = (privateInputTemplatePack?.templateRows ?? [])
    .map((template) => template?.id)
    .filter(Boolean);
  const continuationGuardClosedBoundaryIds = (continuationGuard?.closedBoundaries ?? [])
    .filter((boundary) => boundary?.closed === true)
    .map((boundary) => boundary.id)
    .filter(Boolean);
  const continuationGuardActiveInputIds = (continuationGuard?.activeInputs ?? [])
    .map((input) => input?.id)
    .filter(Boolean);

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
      realMailerLiteRenderQaStatus: brujulaRealMailerLiteRenderQa?.status ?? null,
      realMailerLiteRenderReady: brujulaRealMailerLiteRenderQa?.executiveSummary?.realMailerLiteRenderReady ?? false,
      realMailerLiteRenderExactContent: brujulaRealMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact ?? false,
      realMailerLiteRenderSafetyClosed: brujulaRealMailerLiteRenderQa?.executiveSummary?.allSafetyGatesClosed ?? false,
      realMailerLiteRenderBlockerCount: brujulaRealMailerLiteRenderQa?.executiveSummary?.blockerCount ?? null,
      manualUiBuildReceiptStatus: brujulaEmailManualUiBuildReceipt?.status ?? null,
      manualUiBuildClosed: brujulaManualUiBuildClosedNow,
      manualUiCampaignId: brujulaManualUiCampaignId(brujulaEmailManualUiBuildReceipt),
      manualUiCampaignName: brujulaManualUiCampaignName(brujulaEmailManualUiBuildReceipt),
      manualUiSubject: brujulaManualUiSubject(brujulaEmailManualUiBuildReceipt),
      manualUiPreheader: brujulaManualUiPreheader(brujulaEmailManualUiBuildReceipt),
      manualUiOutboxCount: brujulaManualUiOutboxCount(brujulaEmailManualUiBuildReceipt),
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
      v2EmptyGroupsLifecycleStatus: v2EmptyGroupsClosed
        ? 'executed_and_verified_all_targets_exist_no_live_followup'
        : onboardingV2EmptyGroupsPacket?.status ?? onboardingV2EmptyGroupsCreateDryRun?.status ?? null,
      v2EmptyGroupsExecutionStatus: onboardingV2EmptyGroupsExecution?.status ?? null,
      v2EmptyGroupsExecutionMode: onboardingV2EmptyGroupsExecution?.mode ?? null,
      v2EmptyGroupsExecutedCount: onboardingV2EmptyGroupsExecution?.createdGroups?.length ?? null,
      v2EmptyGroupsExecutionApproved: onboardingV2EmptyGroupsExecution?.decision?.approval?.status === 'exact_approval_phrase_matched',
      v2EmptyGroupsPostExecutionAllExist,
      v2EmptyGroupsExistingTargetCount,
      v2EmptyGroupsTargetCount,
      v2EmptyGroupsLiveGroupsRead,
      v2EmptyGroupsLiveAutomationsRead,
      v2EmptyGroupsCanAskApproval: v2EmptyGroupsClosed
        ? false
        : onboardingV2EmptyGroupsPacket?.approvalGate?.canAskAlejandroForApproval ?? false,
      v2EmptyGroupsBlockerCount: v2EmptyGroupsClosed ? 0 : v2EmptyGroupsPacketBlockerCount,
      v2EmptyGroupsCreateDryRunStatus: onboardingV2EmptyGroupsCreateDryRun?.status ?? null,
      v2EmptyGroupsCreateDryRunCreatedCount: onboardingV2EmptyGroupsCreateDryRun?.createdGroups?.length ?? null,
      v2EmptyGroupsCreateDryRunBlockerCount: onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length ?? null,
      v2EmptyGroupsPostExecutionVerifyAlreadyExistsBlockerCount: v2EmptyGroupsAlreadyExistsBlockerCount,
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
      crmSignalProjectionPacketStatus: miniLaunchCrmSignalProjectionPacket?.status
        ?? readinessLaneById.get('crm_signal_projection_packet')?.sourceStatus
        ?? null,
      crmSignalProjectionReady: miniLaunchCrmSignalProjectionPacket?.status === 'ready_for_no_live_signal_projection_design'
        || readinessLaneById.get('crm_signal_projection_packet')?.readyNow === true,
      crmSignalProjectionSignalsGenerated: miniLaunchCrmSignalProjectionPacket?.projectionProof?.projection?.signalsGenerated
        ?? readinessLaneById.get('crm_signal_projection_packet')?.readiness?.signalsGenerated
        ?? null,
      crmSignalProjectionStoreOnlyNowCount: miniLaunchCrmSignalProjectionPacket?.projectionModel?.storeOnlyNow?.length
        ?? readinessLaneById.get('crm_signal_projection_packet')?.readiness?.storeOnlyNowCount
        ?? null,
      crmSignalProjectionCanAppendLedger: miniLaunchCrmSignalProjectionPacket?.approvalGate?.canAppendSignalLedgerNow
        ?? readinessLaneById.get('crm_signal_projection_packet')?.readiness?.canAppendSignalLedgerNow
        ?? false,
      crmSignalProjectionCanWriteCards: miniLaunchCrmSignalProjectionPacket?.approvalGate?.canWriteCardsNow
        ?? readinessLaneById.get('crm_signal_projection_packet')?.readiness?.canWriteCardsNow
        ?? false,
      crmSignalProjectionCanScore: miniLaunchCrmSignalProjectionPacket?.approvalGate?.canScoreNow
        ?? readinessLaneById.get('crm_signal_projection_packet')?.readiness?.canScoreNow
        ?? false,
      crmWriteApprovalPacketStatus: miniLaunchCrmWriteApprovalPacket?.status ?? null,
      crmWriteApprovalCanAskApproval: miniLaunchCrmWriteApprovalPacket?.approvalBoundary?.canAskAlejandroForApproval ?? false,
      crmWriteApprovalExactEventCount: miniLaunchCrmWriteApprovalPacket?.executiveSummary?.exactEventCountReady ?? null,
      crmWriteApprovalExactPersonCount: miniLaunchCrmWriteApprovalPacket?.executiveSummary?.exactPersonCountReady ?? null,
      crmWriteApprovalCandidateFamilyCount: miniLaunchCrmWriteApprovalPacket?.executiveSummary?.candidateWriteFamilyCount ?? null,
      crmWriteApprovalOperationsExecuted: miniLaunchCrmWriteApprovalPacket?.executiveSummary?.operationsExecuted ?? null,
      crmWriteApprovalBlockers: miniLaunchCrmWriteApprovalPacket?.approvalBoundary?.blockersBeforeApprovalRequest ?? [],
      crmWritePolicyPacketReady: miniLaunchCrmWriteApprovalPacket?.executiveSummary?.writePolicyPacketReady ?? false,
      crmWritePolicyPacketConsumed: miniLaunchCrmWriteApprovalPacket?.policyEffect?.consumedPolicyPacket ?? false,
      crmWritePolicyResolvedBlockers: miniLaunchCrmWriteApprovalPacket?.policyEffect?.resolvedPolicyBlockers ?? [],
      crmWritePolicyOpenBlockers: miniLaunchCrmWriteApprovalPacket?.policyEffect?.policyBlockersStillOpen ?? [],
      emailStyleQaPacketStatus: miniLaunchEmailStyleQaPacket?.status
        ?? readinessLaneById.get('email_sequence')?.sourceStatus
        ?? null,
      emailStyleQaReadyForLocalAssetPlan: miniLaunchEmailStyleQaPacket?.approvalGate?.readyForLocalAssetPlanNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForLocalAssetPlanNow
        ?? false,
      emailStyleQaReadyForMailerLiteBuild: miniLaunchEmailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForMailerLiteAssetBuildNow
        ?? false,
      emailStyleQaReadyForSeedSend: miniLaunchEmailStyleQaPacket?.approvalGate?.readyForSeedSendNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForSeedSendNow
        ?? false,
      emailStyleQaHardBlockerCount: miniLaunchEmailStyleQaPacket?.executiveSummary?.hardBlockerCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.hardBlockerCount
        ?? null,
      emailStyleQaYellowCheckCount: miniLaunchEmailStyleQaPacket?.executiveSummary?.yellowCheckCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.yellowCheckCount
        ?? null,
      localEmailAssetPlanStatus: miniLaunchLocalEmailAssetPlan?.status
        ?? (readinessLaneById.get('email_sequence')?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
          ? readinessLaneById.get('email_sequence')?.sourceStatus
          : null),
      localEmailAssetPlanReady: miniLaunchLocalEmailAssetPlan?.status === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
        || readinessLaneById.get('email_sequence')?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes',
      localEmailAssetPlanAssetCount: miniLaunchLocalEmailAssetPlan?.executiveSummary?.assetCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.assetCount
        ?? null,
      localEmailAssetPlanPlaceholderCount: miniLaunchLocalEmailAssetPlan?.executiveSummary?.placeholderCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.placeholderCount
        ?? null,
      localEmailAssetPlanReadyForExactBuildScopeRequest: miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForExactAssetBuildScopeRequestNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForExactAssetBuildScopeRequestNow
        ?? false,
      localEmailAssetPlanReadyForMailerLiteBuild: miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForMailerLiteAssetBuildNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForMailerLiteAssetBuildNow
        ?? false,
      localEmailAssetPlanReadyForSeedSend: miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForSeedSendNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForSeedSendNow
        ?? false,
      emailAssetBuildScopePacketStatus: miniLaunchEmailAssetBuildScopePacket?.status
        ?? (readinessLaneById.get('email_sequence')?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
          ? readinessLaneById.get('email_sequence')?.sourceStatus
          : null),
      emailAssetBuildScopePacketReady: miniLaunchEmailAssetBuildScopePacket?.status === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
        || readinessLaneById.get('email_sequence')?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes',
      emailAssetBuildScopeAssetCount: miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.assetCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.assetCount
        ?? null,
      emailAssetBuildScopePlaceholderCount: miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.inertUrlPlaceholderCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.placeholderCount
        ?? null,
      emailAssetBuildScopeReplyCtaCount: miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.replyCtaCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.replyCtaCount
        ?? null,
      emailAssetBuildScopeCanAskApproval: miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.canAskAlejandroForApproval
        ?? readinessLaneById.get('email_sequence')?.readiness?.canAskAlejandroForApproval
        ?? false,
      emailAssetBuildScopePacketIsApprovalByItself: miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.packetIsApprovalByItself
        ?? readinessLaneById.get('email_sequence')?.readiness?.packetIsApprovalByItself
        ?? false,
      emailAssetBuildScopeCanExecuteBuildNow: miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.canExecuteBuildNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.canExecuteBuildNow
        ?? false,
      emailAssetBuildScopeReadyForSeedSend: miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.readyForSeedSendNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForSeedSendNow
        ?? false,
      emailBuilderPayloadManifestStatus: miniLaunchEmailBuilderPayloadManifest?.status
        ?? (readinessLaneById.get('email_sequence')?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes'
          ? readinessLaneById.get('email_sequence')?.sourceStatus
          : null),
      emailBuilderPayloadManifestReady: miniLaunchEmailBuilderPayloadManifest?.status === 'email_builder_payload_manifest_ready_no_live_changes'
        || readinessLaneById.get('email_sequence')?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes',
      emailBuilderPayloadManifestPayloadCount: miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.payloadCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.payloadCount
        ?? null,
      emailBuilderPayloadManifestContentBlockCount: miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.contentBlockCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.contentBlockCount
        ?? null,
      emailBuilderPayloadManifestPlaceholderCount: miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.inertUrlPlaceholderCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.placeholderCount
        ?? null,
      emailBuilderPayloadManifestReplyCtaCount: miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.replyCtaCount
        ?? readinessLaneById.get('email_sequence')?.readiness?.replyCtaCount
        ?? null,
      emailBuilderPayloadManifestCanExecuteBuilderNow: miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.canExecuteBuilderNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.canExecuteBuilderNow
        ?? false,
      emailBuilderPayloadManifestCanSendNow: miniLaunchEmailBuilderPayloadManifest?.approvalBoundary?.canSendNow
        ?? readinessLaneById.get('email_sequence')?.readiness?.readyForSeedSendNow
        ?? false,
      emailBuilderPayloadManifestIsApprovalByItself: miniLaunchEmailBuilderPayloadManifest?.approvalBoundary?.manifestIsApprovalByItself
        ?? readinessLaneById.get('email_sequence')?.readiness?.manifestIsApprovalByItself
        ?? false,
      emailRenderQaStatus: miniLaunchEmailRenderQa?.status ?? null,
      emailRenderQaLocalRenderReady: miniLaunchEmailRenderQa?.executiveSummary?.localRenderReady ?? false,
      emailRenderQaEmailCount: miniLaunchEmailRenderQa?.executiveSummary?.emailCount ?? null,
      emailRenderQaHtmlWrittenCount: miniLaunchEmailRenderQa?.executiveSummary?.htmlWrittenCount ?? null,
      emailRenderQaRenderPreviewNonEmptyCount: miniLaunchEmailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      emailRenderQaPublicUseReady: miniLaunchEmailRenderQa?.executiveSummary?.publicUseReady ?? false,
      emailRenderQaMailerLiteBuilderReady: miniLaunchEmailRenderQa?.executiveSummary?.mailerLiteBuilderReady ?? false,
      emailRenderQaSeedSendReady: miniLaunchEmailRenderQa?.executiveSummary?.seedSendReady ?? false,
      emailManualUiBuildReceiptStatus: miniLaunchEmailManualUiBuildReceipt?.status ?? null,
      emailManualUiDraftVisibleCount: manualUiDraftVisibleCount,
      emailManualUiBuildClosed: manualUiBuildClosed,
      emailManualUiPlanObserved: miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.mailerLiteAccountPlanObserved ?? null,
      emailManualUiUsedEditor: miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.editorRoute?.usedEditor ?? null,
      emailManualUiCustomHtmlStatus: miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.editorRoute?.customHtmlEditorStatus ?? null,
      emailManualUiCurrentRoute: miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.futurePolicy?.currentRoute ?? null,
      emailManualUiSeedSendStillClosed: (miniLaunchEmailManualUiBuildReceipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send'),
      emailManualUiDraftRepairPacketStatus: miniLaunchEmailManualUiDraftRepairPacket?.status ?? null,
      emailManualUiDraftRepairCanAskApproval: miniLaunchEmailManualUiDraftRepairPacket?.decision?.canAskAlejandroForApproval ?? false,
      emailManualUiDraftRepairTargetCount: miniLaunchEmailManualUiDraftRepairPacket?.executiveSummary?.targetDraftCount ?? null,
      emailManualUiDraftRepairMissingFragmentCount: miniLaunchEmailManualUiDraftRepairPacket?.executiveSummary?.missingFragmentCount ?? null,
      emailManualUiDraftRepairCampaignIds: (miniLaunchEmailManualUiDraftRepairPacket?.repairTargets ?? [])
        .map((target) => target?.campaignId)
        .filter(Boolean),
      seedTestQaPacketStatus: miniLaunchSeedTestQaPacket?.status ?? null,
      seedTestQaCanAskApprovalNow: miniLaunchSeedTestQaPacket?.readiness?.canAskSeedSendApprovalNow ?? false,
      seedTestQaManualUiDraftsBuilt: miniLaunchSeedTestQaPacket?.readiness?.manualUiDraftsBuilt ?? false,
      seedTestQaLocalRenderReady: miniLaunchSeedTestQaPacket?.readiness?.localRenderReady ?? false,
      seedTestQaRealMailerLiteRenderQaReady: miniLaunchSeedTestQaPacket?.readiness?.realMailerLiteRenderQaReady ?? false,
      seedTestQaSeedRecipientSupplied: miniLaunchSeedTestQaPacket?.seedIdentity?.supplied ?? false,
      seedTestQaTargetGroupsExist: miniLaunchSeedTestQaPacket?.readiness?.targetGroupsExist ?? false,
      seedTestQaBlockersBeforeApprovalRequest: miniLaunchSeedTestQaPacket?.readiness?.machineBlockersBeforeSeedSendApprovalRequest ?? [],
      seedTestExecutionReceiptStatus: miniLaunchSeedTestExecutionReceipt?.status ?? null,
      seedTestExecutionCompleted: miniLaunchSeedTestExecutionCompleted,
      seedTestExecutionObservedMessageCount: miniLaunchSeedTestExecutionReceipt?.gmailVerification?.observedTestMessageCount ?? null,
      seedTestExecutionExpectedMessageCount: miniLaunchSeedTestExecutionReceipt?.gmailVerification?.expectedTestMessageCount ?? null,
      seedTestExecutionAllSubjectsMatched: miniLaunchSeedTestExecutionReceipt?.gmailVerification?.allSubjectsMatchedExpected ?? null,
      seedTestExecutionAllRecipientsMatched: miniLaunchSeedTestExecutionReceipt?.gmailVerification?.allRecipientsMatchedApprovedSeedRecipient ?? null,
      seedTestExecutionVerificationEmailSentCount: miniLaunchSeedTestExecutionReceipt?.safety?.verificationEmailSentToSeedRecipientCount ?? null,
      seedTestExecutionTestEmailsSentCount: miniLaunchSeedTestExecutionReceipt?.safety?.testEmailsSentToSeedRecipientCount ?? null,
      seedTestExecutionOutboxCount: miniLaunchSeedTestExecutionReceipt?.uiExecution?.outboxCountObservedAfterExecution ?? null,
      seedTestExecutionPublicSendPerformed: miniLaunchSeedTestExecutionReceipt?.safety?.publicCampaignSendPerformed ?? null,
      seedTestExecutionAudienceSendPerformed: miniLaunchSeedTestExecutionReceipt?.safety?.audienceSendPerformed ?? null,
      seedTestExecutionSubscriberMutationsPerformed: miniLaunchSeedTestExecutionReceipt
        ? miniLaunchSeedTestExecutionReceipt.safety?.subscribersCreatedOrImported !== false
          || miniLaunchSeedTestExecutionReceipt.safety?.subscribersAssignedOutsideSeedRecipient !== false
        : null,
      seedTestExecutionGroupsCreatedOrAssigned: miniLaunchSeedTestExecutionReceipt?.safety?.groupsCreatedOrAssigned ?? null,
      seedTestExecutionWorkflowsMutated: miniLaunchSeedTestExecutionReceipt?.safety?.workflowsOrAutomationsCreatedOrEditedOrActivated ?? null,
      seedTestExecutionRemainingClosedGates: miniLaunchSeedTestExecutionReceipt?.remainingClosedGates ?? [],
      shopifyLocalBuildReceiptStatus: miniLaunchShopifyLocalBuildReceipt?.status ?? null,
      shopifyLocalBuildFileCount: miniLaunchShopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated ?? 0,
      shopifyLocalBuildClosed,
      shopifyLocalBuildNoPublish: miniLaunchShopifyLocalBuildReceipt?.safety?.shopifyPublishPerformed === false,
      shopifyLocalBuildNoApi: miniLaunchShopifyLocalBuildReceipt?.safety?.shopifyApiCalled === false,
      shopifyLocalBuildNoRealForms: miniLaunchShopifyLocalBuildReceipt?.safety?.realFormsCreated === false,
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
    approvalQueue: {
      status: approvalQueue?.status ?? null,
      readyApprovalRequestCount: approvalQueue?.executiveSummary?.readyApprovalRequestCount ?? null,
      blockedApprovalRequestCount: approvalQueue?.executiveSummary?.blockedApprovalRequestCount ?? null,
      openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextBestHumanBoundary: approvalQueue?.executiveSummary?.nextBestHumanBoundary ?? null,
      readyApprovalIds: approvalQueue?.executiveSummary?.readyApprovalIds ?? [],
      blockedApprovalIds: approvalQueue?.executiveSummary?.blockedApprovalIds ?? [],
      referenceOnlyApprovalIds,
      approvalItemStatusById,
    },
    approvalIntake: {
      status: approvalIntake?.status ?? null,
      approvalTextProvided: approvalIntake?.executiveSummary?.approvalTextProvided ?? null,
      matchedApprovalCount: approvalIntake?.executiveSummary?.matchedApprovalCount ?? null,
      matchedApprovalId: approvalIntake?.executiveSummary?.matchedApprovalId ?? null,
      canProceedToFreshEvidence: approvalIntake?.executiveSummary?.canProceedToFreshEvidence ?? null,
      executionAllowedNow: approvalIntake?.executiveSummary?.executionAllowedNow ?? null,
      openLiveMutationGateCount: approvalIntake?.executiveSummary?.openLiveMutationGateCount ?? null,
    },
    blockedGateHandoff: {
      status: blockedGateHandoff?.status ?? null,
      readyApprovalCount: blockedGateHandoff?.executiveSummary?.readyApprovalCount ?? null,
      blockedGateCount: blockedGateHandoff?.executiveSummary?.blockedGateCount ?? null,
      canAskApprovalNow: blockedGateHandoff?.executiveSummary?.canAskApprovalNow ?? null,
      inputNeededCount: blockedGateHandoff?.executiveSummary?.inputNeededCount ?? null,
      inputNeededIds: blockedGateInputNeededIds,
      blockedGateIds,
      openLiveMutationGateCount: blockedGateHandoff?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextBestHumanAction: blockedGateHandoff?.executiveSummary?.nextBestHumanAction ?? null,
      safeToIntakeOneMoreNoLiveIdea: blockedGateHandoff?.executiveSummary?.safeToIntakeOneMoreNoLiveIdea ?? null,
    },
    missingInputsKit: {
      status: missingInputsKit?.status ?? null,
      inputCount: missingInputsKit?.executiveSummary?.inputCount ?? null,
      seedInputCount: missingInputsKit?.executiveSummary?.seedInputCount ?? null,
      crmInputCount: missingInputsKit?.executiveSummary?.crmInputCount ?? null,
      privateInputCount: missingInputsKit?.executiveSummary?.privateInputCount ?? null,
      canAskApprovalNow: missingInputsKit?.executiveSummary?.canAskApprovalNow ?? null,
      kitCreatesPrivateFiles: missingInputsKit?.executiveSummary?.kitCreatesPrivateFiles ?? null,
      kitAsksApproval: missingInputsKit?.executiveSummary?.kitAsksApproval ?? null,
      openLiveMutationGateCount: missingInputsKit?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: missingInputsKit?.executiveSummary?.nextSafeAction ?? null,
      inputIds: missingInputsKitInputIds,
      postInputCommandCount: missingInputsKit?.postInputCommands?.length ?? null,
    },
    missingInputsIntake: {
      status: missingInputsIntake?.status ?? null,
      inputCount: missingInputsIntake?.executiveSummary?.inputCount ?? null,
      presentInputCount: missingInputsIntake?.executiveSummary?.presentInputCount ?? null,
      readyInputCount: missingInputsIntake?.executiveSummary?.readyInputCount ?? null,
      readyForSeedApprovalPacket: missingInputsIntake?.executiveSummary?.readyForSeedApprovalPacket ?? null,
      readyForCrmWritePacketRegeneration: missingInputsIntake?.executiveSummary?.readyForCrmWritePacketRegeneration ?? null,
      readyForCrmApprovalRequest: missingInputsIntake?.executiveSummary?.readyForCrmApprovalRequest ?? null,
      factStoreReviewReady: missingInputsIntake?.executiveSummary?.factStoreReviewReady ?? null,
      fullPrivateValuesStoredInReport: missingInputsIntake?.executiveSummary?.fullPrivateValuesStoredInReport ?? null,
      canAskApprovalNow: missingInputsIntake?.executiveSummary?.canAskApprovalNow ?? null,
      openLiveMutationGateCount: missingInputsIntake?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: missingInputsIntake?.executiveSummary?.nextSafeAction ?? null,
      inputIds: missingInputsIntakeInputIds,
      blockerIds: missingInputsIntakeBlockerIds,
    },
    missingInputsRequestBundle: {
      status: missingInputsRequestBundle?.status ?? null,
      requestCount: missingInputsRequestBundle?.executiveSummary?.requestCount ?? null,
      inputCount: missingInputsRequestBundle?.executiveSummary?.inputCount ?? null,
      readyInputCount: missingInputsRequestBundle?.executiveSummary?.readyInputCount ?? null,
      requestIds: missingInputsRequestBundleIds,
      copyBlocksReady: missingInputsRequestBundle?.executiveSummary?.copyBlocksReady ?? null,
      createsPrivateFiles: missingInputsRequestBundle?.executiveSummary?.createsPrivateFiles ?? null,
      asksApproval: missingInputsRequestBundle?.executiveSummary?.asksApproval ?? null,
      canAskApprovalNow: missingInputsRequestBundle?.executiveSummary?.canAskApprovalNow ?? null,
      openLiveMutationGateCount: missingInputsRequestBundle?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextHumanAction: missingInputsRequestBundle?.executiveSummary?.nextHumanAction ?? null,
      nextSafeAction: missingInputsRequestBundle?.executiveSummary?.nextSafeAction ?? null,
    },
    privateInputTemplatePack: {
      status: privateInputTemplatePack?.status ?? null,
      templateCount: privateInputTemplatePack?.executiveSummary?.templateCount ?? null,
      exampleFileCount: privateInputTemplatePack?.executiveSummary?.exampleFileCount ?? null,
      writeExamples: privateInputTemplatePack?.executiveSummary?.writeExamples ?? null,
      examplesDir: privateInputTemplatePack?.executiveSummary?.examplesDir ?? null,
      activePathCollisionCount: privateInputTemplatePack?.executiveSummary?.activePathCollisionCount ?? null,
      canAskApprovalNow: privateInputTemplatePack?.executiveSummary?.canAskApprovalNow ?? null,
      openLiveMutationGateCount: privateInputTemplatePack?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: privateInputTemplatePack?.executiveSummary?.nextSafeAction ?? null,
      templateIds: privateInputTemplateIds,
      createsActivePrivateInputFiles: privateInputTemplatePack?.safety?.createsActivePrivateInputFiles ?? null,
      writesRealPrivateValues: privateInputTemplatePack?.safety?.writesRealPrivateValues ?? null,
    },
    postInputOrchestrator: {
      status: postInputOrchestrator?.status ?? null,
      readyInputCount: postInputOrchestrator?.executiveSummary?.readyInputCount ?? null,
      readyCommandCount: postInputOrchestrator?.executiveSummary?.readyCommandCount ?? null,
      allReadyCommandsAllowed: postInputOrchestrator?.executiveSummary?.allReadyCommandsAllowed ?? null,
      canAskApprovalNow: postInputOrchestrator?.executiveSummary?.canAskApprovalNow ?? null,
      commandsExecuted: postInputOrchestrator?.executiveSummary?.commandsExecuted ?? null,
      openLiveMutationGateCount: postInputOrchestrator?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: postInputOrchestrator?.executiveSummary?.nextSafeAction ?? null,
    },
    taxonomyConsolidationAudit: {
      status: taxonomyConsolidationAudit?.status ?? null,
      liveEvidenceGroupCount: taxonomyConsolidationAudit?.executiveSummary?.liveEvidenceGroupCount ?? null,
      brandPromotionNeededCount: taxonomyConsolidationAudit?.executiveSummary?.brandPromotionNeededCount ?? null,
      crmManifestRefreshNeededCount: taxonomyConsolidationAudit?.executiveSummary?.crmManifestRefreshNeededCount ?? null,
      allLiveEvidencePromotedInBrandDictionary: taxonomyConsolidationAudit?.executiveSummary?.allLiveEvidencePromotedInBrandDictionary ?? null,
      allLiveEvidenceHasCrmLiveIds: taxonomyConsolidationAudit?.executiveSummary?.allLiveEvidenceHasCrmLiveIds ?? null,
      canAskApprovalNow: taxonomyConsolidationAudit?.executiveSummary?.canAskApprovalNow ?? null,
      openLiveMutationGateCount: taxonomyConsolidationAudit?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: taxonomyConsolidationAudit?.executiveSummary?.nextSafeAction ?? null,
    },
    taxonomyRefreshHandoff: {
      status: taxonomyRefreshHandoff?.status ?? null,
      brandPromotionDecisionCount: taxonomyRefreshHandoff?.executiveSummary?.brandPromotionDecisionCount ?? null,
      crmManifestPatchCount: taxonomyRefreshHandoff?.executiveSummary?.crmManifestPatchCount ?? null,
      handoffItemCount: taxonomyRefreshHandoff?.executiveSummary?.handoffItemCount ?? null,
      canAskApprovalNow: taxonomyRefreshHandoff?.executiveSummary?.canAskApprovalNow ?? null,
      canApplyBrandDictionaryPatchNow: taxonomyRefreshHandoff?.executiveSummary?.canApplyBrandDictionaryPatchNow ?? null,
      canApplyCrmManifestPatchNow: taxonomyRefreshHandoff?.executiveSummary?.canApplyCrmManifestPatchNow ?? null,
      openLiveMutationGateCount: taxonomyRefreshHandoff?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: taxonomyRefreshHandoff?.executiveSummary?.nextSafeAction ?? null,
    },
    taxonomyRefreshResponseWorkspace: {
      status: taxonomyRefreshResponseWorkspace?.status ?? null,
      brandDecisionRowCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.brandDecisionRowCount ?? null,
      crmManifestPatchRowCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.crmManifestPatchRowCount ?? null,
      acceptedActorCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.acceptedActorCount ?? null,
      pendingActorCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.pendingActorCount ?? null,
      readyPendingActorCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.readyPendingActorCount ?? null,
      readyForIntake: taxonomyRefreshResponseWorkspace?.executiveSummary?.readyForIntake ?? null,
      canAskApprovalNow: taxonomyRefreshResponseWorkspace?.executiveSummary?.canAskApprovalNow ?? null,
      canApplyBrandDictionaryPatchNow: taxonomyRefreshResponseWorkspace?.executiveSummary?.canApplyBrandDictionaryPatchNow ?? null,
      canApplyCrmManifestPatchNow: taxonomyRefreshResponseWorkspace?.executiveSummary?.canApplyCrmManifestPatchNow ?? null,
      openLiveMutationGateCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: taxonomyRefreshResponseWorkspace?.executiveSummary?.nextSafeAction ?? null,
      acceptedActors: taxonomyRefreshResponseWorkspace?.acceptedActors ?? [],
      pendingActors: taxonomyRefreshResponseWorkspace?.pendingActors ?? [],
      readyPendingActors: taxonomyRefreshResponseWorkspace?.readyPendingActors ?? [],
    },
    taxonomyRefreshDecisionIntake: {
      status: taxonomyRefreshDecisionIntake?.status ?? null,
      brandDecisionStatus: taxonomyRefreshDecisionIntake?.executiveSummary?.brandDecisionStatus ?? null,
      crmDecisionStatus: taxonomyRefreshDecisionIntake?.executiveSummary?.crmDecisionStatus ?? null,
      brandDecisionRowsNeeded: taxonomyRefreshDecisionIntake?.executiveSummary?.brandDecisionRowsNeeded ?? null,
      brandDecisionRowsPresent: taxonomyRefreshDecisionIntake?.executiveSummary?.brandDecisionRowsPresent ?? null,
      brandPromoteCount: taxonomyRefreshDecisionIntake?.executiveSummary?.brandPromoteCount ?? null,
      brandRenameCount: taxonomyRefreshDecisionIntake?.executiveSummary?.brandRenameCount ?? null,
      brandRejectCount: taxonomyRefreshDecisionIntake?.executiveSummary?.brandRejectCount ?? null,
      crmManifestPatchRowsNeeded: taxonomyRefreshDecisionIntake?.executiveSummary?.crmManifestPatchRowsNeeded ?? null,
      crmManifestPatchRowsAccepted: taxonomyRefreshDecisionIntake?.executiveSummary?.crmManifestPatchRowsAccepted ?? null,
      readyForLocalPatchPreview: taxonomyRefreshDecisionIntake?.executiveSummary?.readyForLocalPatchPreview ?? null,
      canAskApprovalNow: taxonomyRefreshDecisionIntake?.executiveSummary?.canAskApprovalNow ?? null,
      canApplyBrandDictionaryPatchNow: taxonomyRefreshDecisionIntake?.executiveSummary?.canApplyBrandDictionaryPatchNow ?? null,
      canApplyCrmManifestPatchNow: taxonomyRefreshDecisionIntake?.executiveSummary?.canApplyCrmManifestPatchNow ?? null,
      openLiveMutationGateCount: taxonomyRefreshDecisionIntake?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: taxonomyRefreshDecisionIntake?.executiveSummary?.nextSafeAction ?? null,
      blockerCount: taxonomyRefreshDecisionIntake?.blockers?.length ?? null,
      unsafeReasonCount: taxonomyRefreshDecisionIntake?.unsafeReasons?.length ?? null,
    },
    taxonomyRefreshResponseRequestBundle: {
      status: taxonomyRefreshResponseRequestBundle?.status ?? null,
      requestCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.requestCount ?? null,
      pendingActorCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.pendingActorCount ?? null,
      missingFinalResponseCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.missingFinalResponseCount ?? null,
      pendingActors: taxonomyRefreshResponseRequestBundle?.executiveSummary?.pendingActors ?? [],
      missingFinalResponseActors: taxonomyRefreshResponseRequestBundle?.executiveSummary?.missingFinalResponseActors ?? [],
      unsafeActors: taxonomyRefreshResponseRequestBundle?.executiveSummary?.unsafeActors ?? [],
      copyBlocksReady: taxonomyRefreshResponseRequestBundle?.executiveSummary?.copyBlocksReady ?? null,
      asksApproval: taxonomyRefreshResponseRequestBundle?.executiveSummary?.asksApproval ?? null,
      asksLiveApproval: taxonomyRefreshResponseRequestBundle?.executiveSummary?.asksLiveApproval ?? null,
      createsFinalResponseFiles: taxonomyRefreshResponseRequestBundle?.executiveSummary?.createsFinalResponseFiles ?? null,
      canAskApprovalNow: taxonomyRefreshResponseRequestBundle?.executiveSummary?.canAskApprovalNow ?? null,
      canApplyCrmManifestPatchNow: taxonomyRefreshResponseRequestBundle?.executiveSummary?.canApplyCrmManifestPatchNow ?? null,
      openLiveMutationGateCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: taxonomyRefreshResponseRequestBundle?.executiveSummary?.nextSafeAction ?? null,
    },
    continuationGuard: {
      status: continuationGuard?.status ?? null,
      allTrackedBoundariesClosed: continuationGuard?.executiveSummary?.allTrackedBoundariesClosed ?? null,
      closedBoundaryCount: continuationGuard?.executiveSummary?.closedBoundaryCount ?? null,
      trackedBoundaryCount: continuationGuard?.executiveSummary?.trackedBoundaryCount ?? null,
      oldUiWorkClosed: continuationGuard?.executiveSummary?.oldUiWorkClosed ?? null,
      activeInputCount: continuationGuard?.executiveSummary?.activeInputCount ?? null,
      activeInputIds: continuationGuardActiveInputIds,
      recycledActionBlockCount: continuationGuard?.executiveSummary?.recycledActionBlockCount ?? null,
      openLiveMutationGateCount: continuationGuard?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextSafeAction: continuationGuard?.executiveSummary?.nextSafeAction ?? null,
      uiWorkAction: continuationGuard?.executiveSummary?.uiWorkAction ?? null,
      closedBoundaryIds: continuationGuardClosedBoundaryIds,
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
    backlogBoard: findPath('mailerlite_mini_launch_backlog_board_2026-05-28.json'),
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
    onboardingV2EmptyGroupsExecution: findPath('mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json'),
    onboardingV2EmptyGroupsCreateDryRun: findPath('mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json'),
    onboardingV2FirstEmailMap: findPath('mailerlite_onboarding_v2_first_email_map_2026-05-27.json'),
    miniLaunchEmptyGroupCreateDryRun: findPath('mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json'),
    miniLaunchCrmSignalProjectionPacket: findPath('mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json'),
    miniLaunchCrmWriteApprovalPacket: findPath('mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json'),
    miniLaunchLocalEmailAssetPlan: findPath('mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json'),
    miniLaunchEmailAssetBuildScopePacket: findPath('mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json'),
    miniLaunchEmailBuilderPayloadManifest: findPath('mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json'),
    miniLaunchEmailRenderQa: findPath('mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json'),
    miniLaunchEmailManualUiBuildReceipt: findPath('mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json'),
    miniLaunchEmailManualUiDraftRepairPacket: findPath('mailerlite_mini_launch_email_manual_ui_draft_repair_packet_inteligencia_descansar_2026-05-28.json'),
    miniLaunchSeedTestQaPacket: findPath('mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json'),
    miniLaunchSeedTestExecutionReceipt: findPath('mailerlite_mini_launch_seed_test_execution_receipt_inteligencia_descansar_2026-05-31.json'),
    miniLaunchShopifyLocalBuildReceipt: findPath('mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json'),
    brujulaPostInboxVerify: findPath('mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json'),
    brujulaTestLaneApply: findPath('mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json'),
    brujulaEmailStyleQa: findPath('mailerlite_brujula_email_style_qa_packet_2026-05-27.json'),
    brujulaEmailStyleCorrection: findPath('mailerlite_brujula_email_style_correction_packet_2026-05-27.json'),
    brujulaEmailRenderQa: findPath('mailerlite_brujula_email_render_qa_packet_2026-05-27.json'),
    brujulaRealMailerLiteRenderQa: findPath('mailerlite_brujula_real_mailerlite_render_qa_2026-05-28.json'),
    brujulaEmailManualUiBuildReceipt: findPath('mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json'),
    approvalQueue: findPath('mailerlite_launch_os_approval_queue_2026-05-28.json'),
    approvalIntake: findPath('mailerlite_launch_os_approval_intake_2026-05-28.json'),
    blockedGateHandoff: findPath('mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json'),
    missingInputsKit: findPath('mailerlite_launch_os_missing_inputs_kit_2026-05-28.json'),
    missingInputsIntake: findPath('mailerlite_launch_os_missing_inputs_intake_2026-05-28.json'),
    missingInputsRequestBundle: findPath('mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json'),
    privateInputTemplatePack: findPath('mailerlite_launch_os_private_input_template_pack_2026-05-28.json'),
    postInputOrchestrator: findPath('mailerlite_launch_os_post_input_orchestrator_2026-05-28.json'),
    taxonomyConsolidationAudit: findPath('mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json'),
    taxonomyRefreshHandoff: findPath('mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json'),
    taxonomyRefreshResponseWorkspace: findPath('mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json'),
    taxonomyRefreshDecisionIntake: findPath('mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json'),
    taxonomyRefreshResponseRequestBundle: findPath('mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.json'),
    continuationGuard: findPath('mailerlite_launch_os_continuation_guard_2026-05-28.json'),
    validationReceipt: findPath('mailerlite_launch_os_validation_receipt_2026-05-28.json'),
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
    action: 'mailerlite_email_asset_build',
    status: 'closed_until_exact_asset_build_scope_approval',
    reason: 'The asset-build scope packet can ask for approval, but cannot execute builder mutations by itself.',
  },
  {
    action: 'mailerlite_email_manual_ui_build',
    status: 'closed_after_approved_execution_reference_only',
    reason: 'The current mini-launch drafts were created by exact approval in UI; do not duplicate by API/manual builder unless a later exact repair scope says so.',
  },
  {
    action: 'mailerlite_email_builder_payload_manifest',
    status: 'allowed_no_live_local_payloads_only',
    reason: 'The manifest can prepare exact local payloads, but cannot create/edit assets or send.',
  },
  {
    action: 'seed_test_email_or_subscriber_assignment',
    status: 'seed_test_completed_reference_only_additional_sends_closed',
    reason: 'The current mini-launch seed/test send was completed to the approved seed only; any additional test, public/audience send or subscriber assignment remains a separate exact approval.',
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

const uniqueMoves = (moves) => {
  const seen = new Set();
  return moves.filter((move) => {
    if (!move || seen.has(move)) return false;
    seen.add(move);
    return true;
  });
};

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
        command('crm:vnext:mailerlite-mini-launch-crm-signal-projection-packet'),
        command('crm:vnext:mailerlite-mini-launch-crm-write-policy-packet'),
        command('crm:vnext:mailerlite-mini-launch-crm-write-approval-packet'),
        command('crm:vnext:mailerlite-mini-launch-email-style-qa-packet'),
        command('crm:vnext:mailerlite-mini-launch-local-email-asset-plan'),
        command('crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet'),
        command('crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest'),
        command('crm:vnext:mailerlite-mini-launch-email-manual-ui-builder-packet'),
        command('crm:vnext:mailerlite-mini-launch-email-manual-ui-execution-kit'),
        command('crm:vnext:mailerlite-mini-launch-email-manual-ui-build-receipt'),
        command('crm:vnext:mailerlite-mini-launch-email-manual-ui-draft-repair-packet'),
        command('crm:vnext:mailerlite-launch-os-approval-queue'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['group creation', 'subscriber assignment', 'workflow use', 'MailerLite asset build', 'seed send', 'Signal Ledger append', 'card/scoring/Fact Store writes'],
    },
    {
      id: 'approval_queue_review',
      when: 'The operator needs to know which exact approvals are ready to ask and which are still blocked.',
      firstMove: 'Use the approval queue as a local map only; never treat it as approval or execution.',
      commands: [
        command('crm:vnext:mailerlite-launch-os-approval-queue'),
        command('crm:vnext:mailerlite-launch-os-approval-intake'),
        command('crm:vnext:mailerlite-launch-os-blocked-gate-handoff'),
        command('crm:vnext:mailerlite-launch-os-missing-inputs-intake'),
        command('crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle'),
        command('crm:vnext:mailerlite-launch-os-private-input-template-pack'),
        command('crm:vnext:mailerlite-launch-os-post-input-orchestrator'),
        command('crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['all operations until their own exact phrase is supplied', 'subscriber assignment', 'workflow use', 'send', 'Shopify publish', 'CRM writes'],
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
        command('crm:vnext:mailerlite-brujula-real-mailerlite-render-qa'),
      ].filter(Boolean),
      liveGatesRemainClosed: ['audience send', 'workflow activation', 'public launch', 'onboarding route'],
    },
  ];
};

const buildDepartmentReviewCollectionMoves = () => [
  'Run no-live department reviews from the individual packets.',
  'Use the delivery pack for copy-ready no-live blocks and expected response paths.',
  'Create the response workspace so Brand/Web/CRM replies land as pending drafts before final files.',
  'Use the draft assist only as a starting point for departments; it cannot replace final Brand/Web/CRM responses.',
  'Run finalization preflight before intake so pending files, Codex drafts and final response files cannot be confused.',
  'Use the operator queue to see each department message block, Codex draft, pending blockers and final response path in one place.',
  'Use the request bundle to route copy-ready department instructions without reconstructing context by hand.',
  'Use finalize-pending only after a department confirms a clean pending response is final; it writes local final response files only.',
  'Collect final responses through the response workspace and templates.',
  'Run reconciliation with response files before any dry-run rerun or build request.',
  'Use the response watcher before finalization preflight so missing final response files are obvious.',
];

const miniLaunchEmptyGroupsAlreadyExist = (currentState) => {
  const miniLaunch = currentState?.miniLaunch ?? {};
  return miniLaunch.emptyGroupCreateDryRunStatus === 'dry_run_no_create_needed_targets_already_exist'
    || (
      (miniLaunch.emptyGroupCreateDryRunTargetExistingCount ?? 0) >= 2
      && (miniLaunch.emptyGroupCreateDryRunTargetMissingCount ?? 2) === 0
      && (miniLaunch.emptyGroupCreateDryRunCreatedCount ?? 0) === 0
    );
};

const miniLaunchManualUiBuildClosed = (currentState) => currentState?.miniLaunch?.emailManualUiBuildClosed === true;
const miniLaunchShopifyLocalBuildClosed = (currentState) => currentState?.miniLaunch?.shopifyLocalBuildClosed === true;
const miniLaunchSeedTestCompleted = (currentState) => currentState?.miniLaunch?.seedTestExecutionCompleted === true;

const buildBlockedGateHandoffMove = (currentState) => {
  const handoff = currentState?.blockedGateHandoff;
  if (!handoff?.status) return null;
  const blockedGateIds = handoff.blockedGateIds.join(', ') || 'none';
  const inputNeededIds = handoff.inputNeededIds.join(', ') || 'none';
  return `Use the Launch OS blocked-gate handoff before asking for more approvals; blocked gates: ${blockedGateIds}; inputs needed now: ${inputNeededIds}; can ask approval now: ${handoff.canAskApprovalNow}.`;
};

const buildMissingInputsKitMove = (currentState) => {
  const kit = currentState?.missingInputsKit;
  if (!kit?.status) return null;
  if (kit.status === 'missing_inputs_kit_ready_no_live_changes') {
    return `Use the Launch OS missing-inputs kit to collect the ${kit.inputCount ?? 'current'} missing inputs without turning them into approval or execution; input ids: ${kit.inputIds.join(', ') || 'none'}; next safe action: ${kit.nextSafeAction ?? 'collect_missing_inputs_without_approval_or_execution'}.`;
  }
  return `Refresh the Launch OS missing-inputs kit before requesting new approvals; current status: ${kit.status}.`;
};

const buildMissingInputsIntakeMove = (currentState) => {
  const intake = currentState?.missingInputsIntake;
  if (!intake?.status) return 'Generate the Launch OS missing-inputs intake so seed/CRM private inputs are checked locally and redacted before any packet regeneration.';
  if (intake.status === 'missing_inputs_intake_waiting_for_inputs_no_live_changes') {
    return `Use the Launch OS missing-inputs intake as the current redacted input state; ready inputs ${intake.readyInputCount ?? 0}/${intake.inputCount ?? 'unknown'}, blockers ${intake.blockerIds.join(', ') || 'none'}, can ask approval now: ${intake.canAskApprovalNow}.`;
  }
  if (intake.status === 'missing_inputs_intake_partial_no_live_changes') {
    return `Use the Launch OS missing-inputs intake before regenerating packets; ready inputs ${intake.readyInputCount ?? 0}/${intake.inputCount ?? 'unknown'}, present inputs ${intake.presentInputCount ?? 0}, blockers ${intake.blockerIds.join(', ') || 'none'}, full private values stored: ${intake.fullPrivateValuesStoredInReport}.`;
  }
  if (intake.status === 'missing_inputs_intake_all_inputs_ready_no_live_changes') {
    return `Use the Launch OS missing-inputs intake to regenerate the relevant seed/CRM packets without execution; ready inputs ${intake.readyInputCount}/${intake.inputCount}, can ask approval now: ${intake.canAskApprovalNow}, full private values stored: ${intake.fullPrivateValuesStoredInReport}.`;
  }
  return `Refresh the Launch OS missing-inputs intake before packet regeneration; current status: ${intake.status}.`;
};

const buildMissingInputsRequestBundleMove = (currentState) => {
  const bundle = currentState?.missingInputsRequestBundle;
  if (!bundle?.status) return 'Generate the Launch OS missing-inputs request bundle so the remaining inputs can be collected without reopening old UI work or asking premature approvals.';
  if (bundle.status === 'missing_inputs_request_bundle_ready_no_live_changes') {
    return `Use the Launch OS missing-inputs request bundle to collect inputs only; requests ${bundle.requestCount ?? 'unknown'}, copy blocks ready: ${bundle.copyBlocksReady}, asks approval: ${bundle.asksApproval}, creates private files: ${bundle.createsPrivateFiles}, next human action: ${bundle.nextHumanAction ?? 'supply_requested_inputs_only_not_approval'}.`;
  }
  return `Refresh the Launch OS missing-inputs request bundle before asking for more inputs; current status: ${bundle.status}.`;
};

const buildPrivateInputTemplatePackMove = (currentState) => {
  const pack = currentState?.privateInputTemplatePack;
  if (!pack?.status) return 'Generate the Launch OS private-input template pack so seed/events examples exist as inert .example files that active intake ignores.';
  if (pack.status === 'private_input_template_pack_ready_no_live_changes') {
    return `Use the Launch OS private-input template pack only as inert scaffolding; templates ${pack.templateCount ?? 'unknown'}, example files ${pack.exampleFileCount ?? 'unknown'}, creates active private files: ${pack.createsActivePrivateInputFiles}, writes real private values: ${pack.writesRealPrivateValues}, active path collisions: ${pack.activePathCollisionCount ?? 'unknown'}.`;
  }
  return `Refresh the Launch OS private-input template pack before using examples; current status: ${pack.status}.`;
};

const buildPostInputOrchestratorMove = (currentState) => {
  const orchestrator = currentState?.postInputOrchestrator;
  if (!orchestrator?.status) return 'Generate the Launch OS post-input orchestrator so future private inputs route to local packet regeneration instead of reopening closed UI work.';
  if (orchestrator.status === 'post_input_orchestrator_ready_for_local_packet_regeneration_no_live_changes') {
    return `Use the Launch OS post-input orchestrator to regenerate local seed/CRM packets only; ready commands ${orchestrator.readyCommandCount ?? 'unknown'}, all commands allowed: ${orchestrator.allReadyCommandsAllowed}, commands executed: ${orchestrator.commandsExecuted}.`;
  }
  return `Use the Launch OS post-input orchestrator as the current wait state; ready inputs ${orchestrator.readyInputCount ?? 0}, ready commands ${orchestrator.readyCommandCount ?? 0}, can ask approval now: ${orchestrator.canAskApprovalNow}, commands executed: ${orchestrator.commandsExecuted}.`;
};

const buildTaxonomyConsolidationMove = (currentState) => {
  const audit = currentState?.taxonomyConsolidationAudit;
  if (!audit?.status) return 'Generate the Launch OS taxonomy consolidation audit so Brand dictionary, CRM manifest and approved group receipts stay reconciled before any further live use.';
  if (audit.status === 'taxonomy_receipts_consolidated_no_live_changes') {
    return `Use the Launch OS taxonomy consolidation audit as current read-only taxonomy evidence; live groups ${audit.liveEvidenceGroupCount ?? 'unknown'}, Brand promotions needed 0, CRM manifest refresh needed 0.`;
  }
  return `Use the Launch OS taxonomy consolidation audit before claiming taxonomy is complete; live groups ${audit.liveEvidenceGroupCount ?? 'unknown'}, Brand promotions needed ${audit.brandPromotionNeededCount ?? 'unknown'}, CRM manifest refresh needed ${audit.crmManifestRefreshNeededCount ?? 'unknown'}, no live gates open.`;
};

const buildTaxonomyRefreshHandoffMove = (currentState) => {
  const handoff = currentState?.taxonomyRefreshHandoff;
  if (!handoff?.status) return 'Generate the Launch OS taxonomy refresh handoff so Brand and CRM can resolve proven live group drift without reopening UI or live MailerLite work.';
  if (handoff.status === 'taxonomy_refresh_handoff_ready_no_live_changes') {
    return `Use the Launch OS taxonomy refresh handoff for Brand/CRM only; Brand decisions ${handoff.brandPromotionDecisionCount ?? 'unknown'}, CRM manifest patch rows ${handoff.crmManifestPatchCount ?? 'unknown'}, can ask approval now: ${handoff.canAskApprovalNow}, can apply CRM manifest patch now: ${handoff.canApplyCrmManifestPatchNow}.`;
  }
  return `Taxonomy refresh handoff is not needed right now; current status: ${handoff.status}.`;
};

const buildTaxonomyRefreshResponseWorkspaceMove = (currentState) => {
  const workspace = currentState?.taxonomyRefreshResponseWorkspace;
  if (!workspace?.status) return 'Generate the Launch OS taxonomy response workspace so Brand/CRM decisions have final response files separate from pending drafts and no live approvals.';
  if (workspace.status === 'taxonomy_refresh_response_workspace_ready_for_intake_no_live_changes') {
    return `Use the Launch OS taxonomy response workspace as accepted input only for a future local patch plan; accepted actors ${workspace.acceptedActors.join(', ') || 'none'}, can apply CRM manifest patch now: ${workspace.canApplyCrmManifestPatchNow}.`;
  }
  if (workspace.status === 'taxonomy_refresh_response_workspace_has_ready_pending_responses_no_live_changes') {
    return `Finalize ready pending taxonomy responses before intake; ready pending actors ${workspace.readyPendingActors.join(', ') || 'none'}, final files still required, no live gates open.`;
  }
  return `Use the Launch OS taxonomy response workspace to collect final Brand/CRM taxonomy decisions; pending actors ${workspace.pendingActors.join(', ') || 'unknown'}, can ask approval now: ${workspace.canAskApprovalNow}, can apply patches now: ${workspace.canApplyCrmManifestPatchNow}.`;
};

const buildTaxonomyRefreshDecisionIntakeMove = (currentState) => {
  const intake = currentState?.taxonomyRefreshDecisionIntake;
  if (!intake?.status) return 'Generate the Launch OS taxonomy decision intake after the response workspace so Brand/CRM decisions can be validated before any local patch preview.';
  if (intake.status === 'taxonomy_refresh_decision_intake_ready_for_local_patch_preview_no_live_changes') {
    return `Use taxonomy decision intake only to prepare a local patch preview; Brand decisions ${intake.brandDecisionRowsPresent ?? 'unknown'}/${intake.brandDecisionRowsNeeded ?? 'unknown'}, CRM patch rows ${intake.crmManifestPatchRowsAccepted ?? 'unknown'}/${intake.crmManifestPatchRowsNeeded ?? 'unknown'}, can apply patches now: ${intake.canApplyCrmManifestPatchNow}.`;
  }
  if (intake.status === 'taxonomy_refresh_decision_intake_blocked_unsafe_decision_no_live_changes') {
    return `Stop at taxonomy decision intake: unsafe decision content found (${intake.unsafeReasonCount ?? 'unknown'} reasons); do not ask approval or apply patches.`;
  }
  return `Use taxonomy decision intake as the current wait state; Brand decisions ${intake.brandDecisionRowsPresent ?? 0}/${intake.brandDecisionRowsNeeded ?? 'unknown'}, CRM patch rows ${intake.crmManifestPatchRowsAccepted ?? 0}/${intake.crmManifestPatchRowsNeeded ?? 'unknown'}, blockers ${intake.blockerCount ?? 'unknown'}, can ask approval now: ${intake.canAskApprovalNow}.`;
};

const buildTaxonomyRefreshResponseRequestBundleMove = (currentState) => {
  const bundle = currentState?.taxonomyRefreshResponseRequestBundle;
  if (!bundle?.status) return 'Generate the Launch OS taxonomy response request bundle so Brand/CRM know the exact final response files to supply without live approval or execution.';
  if (bundle.status === 'taxonomy_refresh_response_request_bundle_all_responses_present_no_live_changes') {
    return `Use the taxonomy response request bundle as closed request evidence; pending actors ${bundle.pendingActors.join(', ') || 'none'}, then rerun workspace and decision intake before any local patch preview.`;
  }
  if (bundle.status === 'taxonomy_refresh_response_request_bundle_blocked_unsafe_response_no_live_changes') {
    return `Stop at taxonomy response request bundle: unsafe actors ${(bundle.unsafeActors ?? []).join(', ') || 'unknown'}; do not ask approval or apply patches.`;
  }
  return `Use the taxonomy response request bundle to collect final Brand/CRM response files only; pending actors ${bundle.pendingActors.join(', ') || 'unknown'}, missing final responses ${bundle.missingFinalResponseActors.join(', ') || 'unknown'}, asks live approval: ${bundle.asksLiveApproval}, creates final files: ${bundle.createsFinalResponseFiles}.`;
};

const buildContinuationGuardMove = (currentState) => {
  const guard = currentState?.continuationGuard;
  if (!guard?.status) return null;
  if (guard.status === 'mailerlite_launch_os_continuation_guard_ready_no_live_changes') {
    return `Use the Launch OS continuation guard after resumes/compactions; old UI work closed: ${guard.oldUiWorkClosed}; closed boundaries: ${guard.closedBoundaryIds.join(', ') || 'none'}; do not reopen UI or group creation unless new concrete evidence changes those boundaries.`;
  }
  return `Refresh the Launch OS continuation guard before acting after a resume; current status: ${guard.status}.`;
};

const buildApprovalPhaseMoves = (currentState) => {
  const miniLaunchEmptyGroupBoundaryClosed = approvalItemStatus(currentState, 'mini_launch_empty_group_creation') === 'reference_only_no_approval_request_now'
    || miniLaunchEmptyGroupsAlreadyExist(currentState);

  return [
    'Use the Launch OS approval queue as the current source of human boundaries; do not reopen department-review collection while pendingDepartments is empty.',
    'Use the Launch OS approval intake only when Alejandro provides exact approval text; require a single exact phrase match before any fresh-evidence plan.',
    buildBlockedGateHandoffMove(currentState),
    buildMissingInputsKitMove(currentState),
    buildMissingInputsIntakeMove(currentState),
    buildMissingInputsRequestBundleMove(currentState),
    buildPrivateInputTemplatePackMove(currentState),
    buildPostInputOrchestratorMove(currentState),
    buildTaxonomyConsolidationMove(currentState),
    buildTaxonomyRefreshHandoffMove(currentState),
    buildTaxonomyRefreshResponseWorkspaceMove(currentState),
    buildTaxonomyRefreshDecisionIntakeMove(currentState),
    buildTaxonomyRefreshResponseRequestBundleMove(currentState),
    buildContinuationGuardMove(currentState),
    miniLaunchEmptyGroupBoundaryClosed
    ? 'Mini-launch empty groups already exist; do not rerun --execute for that closed boundary. Continue with the next separate approval queue item.'
    : 'Hold at the mini-launch empty-group create runner dry-run: it is green, createdCount remains 0, and --execute still requires the exact phrase plus a fresh group scan.',
    miniLaunchManualUiBuildClosed(currentState)
    ? 'Mini-launch manual UI draft build is complete; use the receipt as current asset evidence and do not request duplicate API/manual asset build unless a later exact repair scope names it.'
    : 'Use the mini-launch email builder payload manifest only as local implementation input; it cannot execute MailerLite builder mutations or sends.',
    currentState?.miniLaunch?.emailManualUiDraftRepairCanAskApproval === true
    ? 'Current real MailerLite QA found a repairable Email 1 copy mismatch; the next useful human boundary is the exact manual UI draft repair approval, not a seed-send approval.'
    : currentState?.miniLaunch?.emailManualUiDraftRepairPacketStatus === 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed'
      ? 'Real MailerLite render QA is green; keep the manual UI draft repair packet as evidence only and do not ask for repair approval.'
      : 'If real MailerLite render QA is not green, generate or refresh the manual UI draft repair packet before asking for any seed-send scope.',
    miniLaunchSeedTestCompleted(currentState)
    ? `Mini-launch seed/test send is complete and verified by Gmail (${currentState?.miniLaunch?.seedTestExecutionObservedMessageCount ?? 'unknown'}/${currentState?.miniLaunch?.seedTestExecutionExpectedMessageCount ?? 'unknown'}); use the receipt for inbox QA and keep public/audience sends, workflows and subscriber mutations closed.`
    : miniLaunchManualUiBuildClosed(currentState)
    ? 'Use the mini-launch seed/test QA packet before any seed/test send; it currently requires real MailerLite render QA, an exact seed recipient and an exact send approval.'
    : 'Use the mini-launch email asset-build scope packet only as a human approval boundary; it cannot execute MailerLite builder mutations.',
    currentState?.miniLaunch?.crmWriteApprovalPacketStatus
    ? currentState?.miniLaunch?.crmWritePolicyPacketReady === true
      ? 'Use the CRM write approval packet as the current CRM boundary; the CRM write policy packet is ready and consumed, so the remaining blockers are evidence, identity, aggregate review, Fact Store or future exact approval gates.'
      : 'Use the CRM write approval packet as the current CRM boundary; it cannot ask approval until real observed events, exact people and one write family are named.'
    : 'Use the mini-launch CRM signal projection packet as no-live interpretation only; it cannot append ledgers, write cards, score, or touch Fact Store.',
    miniLaunchShopifyLocalBuildClosed(currentState)
    ? 'Shopify no-live local build is complete; keep the five files inert and do not publish, preview, connect forms or call APIs without a later exact scope.'
    : 'Use the Shopify local-build request only after exact no-live scope approval, and keep placeholders inert.',
  ];
};

const approvalItemStatus = (currentState, id) => currentState?.approvalQueue?.approvalItemStatusById?.[id] ?? null;

const buildSharedImmediateMoves = (currentState) => {
  const miniLaunchEmptyGroupBoundaryClosed = approvalItemStatus(currentState, 'mini_launch_empty_group_creation') === 'reference_only_no_approval_request_now'
    || miniLaunchEmptyGroupsAlreadyExist(currentState);
  const onboardingV2GroupBoundaryClosed = approvalItemStatus(currentState, 'onboarding_v2_empty_group_creation') === 'reference_only_no_approval_request_now';

  return [
    'Use the Brújula email style QA packet to keep functional delivery separate from public-ready creative quality.',
    currentState?.brujulaPilot?.manualUiBuildClosed === true
      ? 'Use the Brújula Email 1 manual UI build receipt as current draft evidence; builder creation/edit gate is closed and test send/public use still need separate exact approval.'
      : 'Use the Brújula Email 1 correction packet as local builder input before any future exact test-send approval.',
    currentState?.brujulaPilot?.manualUiBuildClosed === true
      ? currentState?.brujulaPilot?.realMailerLiteRenderReady === true
        ? 'Brújula real MailerLite render QA is green; before any Brújula test send, still require exact recipient and exact send approval.'
        : 'Before any Brújula test send, require real MailerLite render QA on the live draft, exact recipient and exact send approval.'
      : 'Use the Brújula Email 1 render QA packet before any later exact MailerLite builder/test-send approval.',
    'Use the backlog board only for one additional no-live idea intake, not for live production.',
    'Use the onboarding trunk map before any mini-launch-to-onboarding route, v2 group approval packet or seed test.',
    miniLaunchEmptyGroupBoundaryClosed
      ? 'Mini-launch empty-group packet and create runner are evidence only now; the two groups already exist and no creation rerun is pending.'
      : 'Use the mini-launch empty-group approval packet only as a human decision boundary; it cannot create groups by itself.',
    miniLaunchEmptyGroupBoundaryClosed
      ? 'Use mini-launch group scans only as fresh read-only evidence if later state changes; do not rerun --execute for the current two groups.'
      : 'Use the mini-launch empty-group create runner only for dry-run or post-execution no-create-needed verification unless a new exact approval boundary is opened.',
    miniLaunchManualUiBuildClosed(currentState)
      ? 'Use the mini-launch manual UI build receipt as the current draft state; keep the local asset plan and payload manifest as provenance, not as a new build request.'
      : 'Use the mini-launch local email asset plan only to request exact build scope; it cannot create MailerLite assets or send tests.',
    miniLaunchSeedTestCompleted(currentState)
      ? 'Use the mini-launch seed/test execution receipt as closed seed evidence; next useful work is inbox QA or correction planning, not the same seed-send approval.'
      : 'Use the mini-launch seed/test QA packet before any seed-send approval request.',
    miniLaunchShopifyLocalBuildClosed(currentState)
      ? 'Use the Shopify local build receipt as current Web surface evidence; preview/publish/form connection remains outside this closed local build boundary.'
      : 'Use the Shopify local-build request as a scope boundary only; it cannot publish, preview, connect forms or call APIs.',
    onboardingV2GroupBoundaryClosed
      ? 'Treat Onboarding v2 empty-group creation as closed evidence; workflow draft, seed test and production switch remain separate approval gates.'
      : 'Use the fresh Onboarding v2 empty-groups packet and create dry-run before asking for exact approval to create the 12 named empty groups.',
    buildBlockedGateHandoffMove(currentState),
    buildMissingInputsKitMove(currentState),
    buildMissingInputsIntakeMove(currentState),
    buildMissingInputsRequestBundleMove(currentState),
    buildPrivateInputTemplatePackMove(currentState),
    buildPostInputOrchestratorMove(currentState),
    buildTaxonomyConsolidationMove(currentState),
    buildTaxonomyRefreshHandoffMove(currentState),
    buildContinuationGuardMove(currentState),
    'Use the Onboarding v2 first-email map so Email 1 stays welcome/orientation without an unnecessary Sent receipt.',
    'Check the operating principles before routing a mini-launch toward onboarding or treating a launch asset as public-ready.',
    'Use the Onboarding v2 event contract before any future Signal Event Ledger append or CRM projection around onboarding.',
    'Regenerate the validation receipt after current-turn tests so the goal audit does not depend on ephemeral CLI flags.',
    'Keep every live gate closed until a later exact Alejandro approval names the action and scope.',
  ];
};

const departmentFinalResponsesAccepted = (currentState) => {
  const miniLaunch = currentState?.miniLaunch ?? {};
  const pendingDepartments = miniLaunch.pendingDepartments ?? [];
  const acceptedDepartments = new Set(miniLaunch.acceptedFinalDepartments ?? []);
  return pendingDepartments.length === 0
    && miniLaunch.finalizationReadyForIntake === true
    && ['brand', 'web_design', 'crm'].every((department) => acceptedDepartments.has(department));
};

const buildImmediateNextMoves = ({ currentState }) => uniqueMoves([
  ...(departmentFinalResponsesAccepted(currentState)
    ? buildApprovalPhaseMoves(currentState)
    : buildDepartmentReviewCollectionMoves()),
  ...buildSharedImmediateMoves(currentState),
]);

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
  onboardingV2EmptyGroupsExecution,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  miniLaunchEmptyGroupCreateDryRun,
  miniLaunchCrmSignalProjectionPacket,
  miniLaunchCrmWriteApprovalPacket,
  miniLaunchEmailStyleQaPacket,
  miniLaunchLocalEmailAssetPlan,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailRenderQa,
  miniLaunchEmailManualUiBuildReceipt,
  miniLaunchEmailManualUiDraftRepairPacket,
  miniLaunchSeedTestQaPacket,
  miniLaunchSeedTestExecutionReceipt,
  miniLaunchShopifyLocalBuildReceipt,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  brujulaRealMailerLiteRenderQa,
  brujulaEmailManualUiBuildReceipt,
  approvalQueue,
  approvalIntake,
  blockedGateHandoff,
  missingInputsKit,
  missingInputsIntake,
  missingInputsRequestBundle,
  privateInputTemplatePack,
  postInputOrchestrator,
  taxonomyConsolidationAudit,
  taxonomyRefreshHandoff,
  taxonomyRefreshResponseWorkspace,
  taxonomyRefreshDecisionIntake,
  taxonomyRefreshResponseRequestBundle,
  continuationGuard,
  validationReceipt,
  packageJson,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const commandCatalog = commandCatalogFrom(packageJson);
  const currentState = buildCurrentState({
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
    onboardingV2EmptyGroupsExecution,
    onboardingV2EmptyGroupsCreateDryRun,
    onboardingV2FirstEmailMap,
    miniLaunchEmptyGroupCreateDryRun,
    miniLaunchCrmSignalProjectionPacket,
    miniLaunchCrmWriteApprovalPacket,
    miniLaunchEmailStyleQaPacket,
    miniLaunchLocalEmailAssetPlan,
    miniLaunchEmailAssetBuildScopePacket,
    miniLaunchEmailBuilderPayloadManifest,
    miniLaunchEmailRenderQa,
    miniLaunchEmailManualUiBuildReceipt,
    miniLaunchEmailManualUiDraftRepairPacket,
    miniLaunchSeedTestQaPacket,
    miniLaunchSeedTestExecutionReceipt,
    miniLaunchShopifyLocalBuildReceipt,
    brujulaPlan,
    brujulaApply,
    brujulaEmailStyleQa,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    brujulaRealMailerLiteRenderQa,
    brujulaEmailManualUiBuildReceipt,
    approvalQueue,
    approvalIntake,
    blockedGateHandoff,
    missingInputsKit,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    taxonomyConsolidationAudit,
    taxonomyRefreshHandoff,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshDecisionIntake,
    taxonomyRefreshResponseRequestBundle,
    continuationGuard,
    validationReceipt,
    responseWorkspace,
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_operator_runbook',
    generatedAt,
    ok: true,
    status: 'mailerlite_launch_os_operator_runbook_ready_no_live_changes',
    currentState,
    reportMap: buildReportMap(sourceDigests),
    operatingPrinciples: buildOperatingPrinciples(),
    commandCatalog,
    operatingScenarios: buildOperatingScenarios({ commandCatalog }),
    approvalMatrix: buildApprovalMatrix(),
    immediateNextMoves: buildImmediateNextMoves({ currentState }),
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
    `- Brújula real MailerLite render QA: ${runbook.currentState.brujulaPilot.realMailerLiteRenderQaStatus ?? 'unknown'}`,
    `- Brújula real MailerLite render ready: ${runbook.currentState.brujulaPilot.realMailerLiteRenderReady}`,
    `- Brújula public use ready: ${runbook.currentState.brujulaPilot.emailStyleQaPublicUseReady}`,
    `- Onboarding v1 protected: ${runbook.currentState.onboarding.productionV1Protected}`,
    `- Onboarding v1 workflow: ${runbook.currentState.onboarding.productionV1Workflow.name ?? 'unknown'}`,
    `- Onboarding v2 status: ${runbook.currentState.onboarding.v2ExecutionStatus ?? 'unknown'}`,
    `- Onboarding v2 event contract: ${runbook.currentState.onboarding.v2EventContractStatus ?? 'unknown'}`,
    `- Onboarding v2 empty-groups lifecycle: ${runbook.currentState.onboarding.v2EmptyGroupsLifecycleStatus ?? 'unknown'}`,
    `- Onboarding v2 empty-groups execution: ${runbook.currentState.onboarding.v2EmptyGroupsExecutionStatus ?? 'unknown'}`,
    `- Onboarding v2 empty-groups executed count: ${runbook.currentState.onboarding.v2EmptyGroupsExecutedCount ?? 'unknown'}`,
    `- Onboarding v2 empty-groups post-execution all exist: ${runbook.currentState.onboarding.v2EmptyGroupsPostExecutionAllExist}`,
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
    `- Mini-launch CRM signal projection packet: ${runbook.currentState.miniLaunch.crmSignalProjectionPacketStatus ?? 'unknown'}`,
    `- Mini-launch CRM signal projection ready: ${runbook.currentState.miniLaunch.crmSignalProjectionReady}`,
    `- Mini-launch CRM signal projection signals generated: ${runbook.currentState.miniLaunch.crmSignalProjectionSignalsGenerated ?? 'unknown'}`,
    `- Mini-launch CRM signal projection store-only count: ${runbook.currentState.miniLaunch.crmSignalProjectionStoreOnlyNowCount ?? 'unknown'}`,
    `- Mini-launch CRM signal projection can append ledger: ${runbook.currentState.miniLaunch.crmSignalProjectionCanAppendLedger}`,
    `- Mini-launch CRM write approval packet: ${runbook.currentState.miniLaunch.crmWriteApprovalPacketStatus ?? 'unknown'}`,
    `- Mini-launch CRM write approval can ask approval: ${runbook.currentState.miniLaunch.crmWriteApprovalCanAskApproval}`,
    `- Mini-launch CRM write approval exact events ready: ${runbook.currentState.miniLaunch.crmWriteApprovalExactEventCount ?? 'unknown'}`,
    `- Mini-launch CRM write approval exact people ready: ${runbook.currentState.miniLaunch.crmWriteApprovalExactPersonCount ?? 'unknown'}`,
    `- Mini-launch CRM write approval blockers: ${runbook.currentState.miniLaunch.crmWriteApprovalBlockers.join(', ') || 'none'}`,
    `- Mini-launch CRM write policy packet ready: ${runbook.currentState.miniLaunch.crmWritePolicyPacketReady}`,
    `- Mini-launch CRM write policy consumed: ${runbook.currentState.miniLaunch.crmWritePolicyPacketConsumed}`,
    `- Mini-launch CRM write policy resolved blockers: ${runbook.currentState.miniLaunch.crmWritePolicyResolvedBlockers.join(', ') || 'none'}`,
    `- Mini-launch CRM write policy open blockers: ${runbook.currentState.miniLaunch.crmWritePolicyOpenBlockers.join(', ') || 'none'}`,
    `- Mini-launch Email Style QA packet: ${runbook.currentState.miniLaunch.emailStyleQaPacketStatus ?? 'unknown'}`,
    `- Mini-launch Email Style QA local asset plan ready: ${runbook.currentState.miniLaunch.emailStyleQaReadyForLocalAssetPlan}`,
    `- Mini-launch Email Style QA MailerLite build ready: ${runbook.currentState.miniLaunch.emailStyleQaReadyForMailerLiteBuild}`,
    `- Mini-launch Email Style QA seed send ready: ${runbook.currentState.miniLaunch.emailStyleQaReadyForSeedSend}`,
    `- Mini-launch Email Style QA hard blockers: ${runbook.currentState.miniLaunch.emailStyleQaHardBlockerCount ?? 'unknown'}`,
    `- Mini-launch Email Style QA yellow checks: ${runbook.currentState.miniLaunch.emailStyleQaYellowCheckCount ?? 'unknown'}`,
    `- Mini-launch local email asset plan: ${runbook.currentState.miniLaunch.localEmailAssetPlanStatus ?? 'unknown'}`,
    `- Mini-launch local email asset plan ready: ${runbook.currentState.miniLaunch.localEmailAssetPlanReady}`,
    `- Mini-launch local email asset count: ${runbook.currentState.miniLaunch.localEmailAssetPlanAssetCount ?? 'unknown'}`,
    `- Mini-launch local email placeholder count: ${runbook.currentState.miniLaunch.localEmailAssetPlanPlaceholderCount ?? 'unknown'}`,
    `- Mini-launch local email exact build-scope request ready: ${runbook.currentState.miniLaunch.localEmailAssetPlanReadyForExactBuildScopeRequest}`,
    `- Mini-launch local email MailerLite build ready: ${runbook.currentState.miniLaunch.localEmailAssetPlanReadyForMailerLiteBuild}`,
    `- Mini-launch local email seed send ready: ${runbook.currentState.miniLaunch.localEmailAssetPlanReadyForSeedSend}`,
    `- Mini-launch email asset-build scope packet: ${runbook.currentState.miniLaunch.emailAssetBuildScopePacketStatus ?? 'unknown'}`,
    `- Mini-launch email asset-build scope ready: ${runbook.currentState.miniLaunch.emailAssetBuildScopePacketReady}`,
    `- Mini-launch email asset-build scope asset count: ${runbook.currentState.miniLaunch.emailAssetBuildScopeAssetCount ?? 'unknown'}`,
    `- Mini-launch email asset-build scope placeholders: ${runbook.currentState.miniLaunch.emailAssetBuildScopePlaceholderCount ?? 'unknown'}`,
    `- Mini-launch email asset-build scope reply CTAs: ${runbook.currentState.miniLaunch.emailAssetBuildScopeReplyCtaCount ?? 'unknown'}`,
    `- Mini-launch email asset-build scope can ask approval: ${runbook.currentState.miniLaunch.emailAssetBuildScopeCanAskApproval}`,
    `- Mini-launch email asset-build scope packet is approval: ${runbook.currentState.miniLaunch.emailAssetBuildScopePacketIsApprovalByItself}`,
    `- Mini-launch email asset-build scope can execute build now: ${runbook.currentState.miniLaunch.emailAssetBuildScopeCanExecuteBuildNow}`,
    `- Mini-launch email builder payload manifest: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestStatus ?? 'unknown'}`,
    `- Mini-launch email builder payload manifest ready: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestReady}`,
    `- Mini-launch email builder payload count: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestPayloadCount ?? 'unknown'}`,
    `- Mini-launch email builder content blocks: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestContentBlockCount ?? 'unknown'}`,
    `- Mini-launch email builder placeholders: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestPlaceholderCount ?? 'unknown'}`,
    `- Mini-launch email builder reply CTAs: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestReplyCtaCount ?? 'unknown'}`,
    `- Mini-launch email builder can execute now: ${runbook.currentState.miniLaunch.emailBuilderPayloadManifestCanExecuteBuilderNow}`,
    `- Mini-launch email render QA: ${runbook.currentState.miniLaunch.emailRenderQaStatus ?? 'unknown'}`,
    `- Mini-launch email render local ready: ${runbook.currentState.miniLaunch.emailRenderQaLocalRenderReady}`,
    `- Mini-launch email render count: ${runbook.currentState.miniLaunch.emailRenderQaEmailCount ?? 'unknown'}`,
    `- Mini-launch email render non-empty previews: ${runbook.currentState.miniLaunch.emailRenderQaRenderPreviewNonEmptyCount ?? 'unknown'}`,
    `- Mini-launch manual UI build receipt: ${runbook.currentState.miniLaunch.emailManualUiBuildReceiptStatus ?? 'unknown'}`,
    `- Mini-launch manual UI drafts visible: ${runbook.currentState.miniLaunch.emailManualUiDraftVisibleCount ?? 'unknown'}`,
    `- Mini-launch manual UI build closed: ${runbook.currentState.miniLaunch.emailManualUiBuildClosed}`,
    `- Mini-launch manual UI editor: ${runbook.currentState.miniLaunch.emailManualUiUsedEditor ?? 'unknown'}`,
    `- Mini-launch manual UI plan observed: ${runbook.currentState.miniLaunch.emailManualUiPlanObserved ?? 'unknown'}`,
    `- Mini-launch manual UI seed send still closed: ${runbook.currentState.miniLaunch.emailManualUiSeedSendStillClosed}`,
    `- Mini-launch manual UI draft repair packet: ${runbook.currentState.miniLaunch.emailManualUiDraftRepairPacketStatus ?? 'unknown'}`,
    `- Mini-launch manual UI draft repair can ask approval: ${runbook.currentState.miniLaunch.emailManualUiDraftRepairCanAskApproval}`,
    `- Mini-launch manual UI draft repair targets: ${runbook.currentState.miniLaunch.emailManualUiDraftRepairTargetCount ?? 'unknown'}`,
    `- Mini-launch manual UI draft repair missing fragments: ${runbook.currentState.miniLaunch.emailManualUiDraftRepairMissingFragmentCount ?? 'unknown'}`,
    `- Mini-launch manual UI draft repair campaign IDs: ${runbook.currentState.miniLaunch.emailManualUiDraftRepairCampaignIds.join(', ') || 'none'}`,
    `- Mini-launch seed/test QA packet: ${runbook.currentState.miniLaunch.seedTestQaPacketStatus ?? 'unknown'}`,
    `- Mini-launch seed/test can ask approval now: ${runbook.currentState.miniLaunch.seedTestQaCanAskApprovalNow}`,
    `- Mini-launch seed/test real MailerLite render QA ready: ${runbook.currentState.miniLaunch.seedTestQaRealMailerLiteRenderQaReady}`,
    `- Mini-launch seed/test seed recipient supplied: ${runbook.currentState.miniLaunch.seedTestQaSeedRecipientSupplied}`,
    `- Mini-launch seed/test blockers: ${runbook.currentState.miniLaunch.seedTestQaBlockersBeforeApprovalRequest.join(', ') || 'none'}`,
    `- Mini-launch seed/test execution receipt: ${runbook.currentState.miniLaunch.seedTestExecutionReceiptStatus ?? 'unknown'}`,
    `- Mini-launch seed/test execution completed: ${runbook.currentState.miniLaunch.seedTestExecutionCompleted}`,
    `- Mini-launch seed/test Gmail receipts: ${runbook.currentState.miniLaunch.seedTestExecutionObservedMessageCount ?? 'unknown'}/${runbook.currentState.miniLaunch.seedTestExecutionExpectedMessageCount ?? 'unknown'}`,
    `- Mini-launch seed/test public send performed: ${runbook.currentState.miniLaunch.seedTestExecutionPublicSendPerformed ?? 'unknown'}`,
    `- Mini-launch seed/test audience send performed: ${runbook.currentState.miniLaunch.seedTestExecutionAudienceSendPerformed ?? 'unknown'}`,
    `- Mini-launch seed/test outbox count after execution: ${runbook.currentState.miniLaunch.seedTestExecutionOutboxCount ?? 'unknown'}`,
    `- Mini-launch Shopify local build receipt: ${runbook.currentState.miniLaunch.shopifyLocalBuildReceiptStatus ?? 'unknown'}`,
    `- Mini-launch Shopify local files: ${runbook.currentState.miniLaunch.shopifyLocalBuildFileCount ?? 'unknown'}`,
    `- Mini-launch Shopify local build closed: ${runbook.currentState.miniLaunch.shopifyLocalBuildClosed}`,
    `- Mini-launch Shopify no publish: ${runbook.currentState.miniLaunch.shopifyLocalBuildNoPublish}`,
    `- Mini-launch Shopify no API: ${runbook.currentState.miniLaunch.shopifyLocalBuildNoApi}`,
    `- Mini-launch Shopify no real forms: ${runbook.currentState.miniLaunch.shopifyLocalBuildNoRealForms}`,
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
    `- Approval queue: ${runbook.currentState.approvalQueue.status ?? 'missing'}`,
    `- Approval queue ready requests: ${runbook.currentState.approvalQueue.readyApprovalRequestCount ?? 'unknown'}`,
    `- Approval queue blocked requests: ${runbook.currentState.approvalQueue.blockedApprovalRequestCount ?? 'unknown'}`,
    `- Approval queue next human boundary: ${runbook.currentState.approvalQueue.nextBestHumanBoundary ?? 'none'}`,
    `- Approval queue open live mutation gates: ${runbook.currentState.approvalQueue.openLiveMutationGateCount ?? 'unknown'}`,
    `- Approval intake: ${runbook.currentState.approvalIntake.status ?? 'missing'}`,
    `- Approval intake matched approval: ${runbook.currentState.approvalIntake.matchedApprovalId ?? 'none'}`,
    `- Approval intake can proceed to fresh evidence: ${runbook.currentState.approvalIntake.canProceedToFreshEvidence ?? 'unknown'}`,
    `- Approval intake execution allowed now: ${runbook.currentState.approvalIntake.executionAllowedNow ?? 'unknown'}`,
    `- Blocked-gate handoff: ${runbook.currentState.blockedGateHandoff.status ?? 'missing'}`,
    `- Blocked-gate can ask approval now: ${runbook.currentState.blockedGateHandoff.canAskApprovalNow ?? 'unknown'}`,
    `- Blocked-gate inputs needed: ${runbook.currentState.blockedGateHandoff.inputNeededIds.join(', ') || 'none'}`,
    `- Blocked-gate ids: ${runbook.currentState.blockedGateHandoff.blockedGateIds.join(', ') || 'none'}`,
    `- Blocked-gate open live mutation gates: ${runbook.currentState.blockedGateHandoff.openLiveMutationGateCount ?? 'unknown'}`,
    `- Missing-inputs kit: ${runbook.currentState.missingInputsKit.status ?? 'missing'}`,
    `- Missing-inputs count: ${runbook.currentState.missingInputsKit.inputCount ?? 'unknown'}`,
    `- Missing-inputs ids: ${runbook.currentState.missingInputsKit.inputIds.join(', ') || 'none'}`,
    `- Missing-inputs next safe action: ${runbook.currentState.missingInputsKit.nextSafeAction ?? 'unknown'}`,
    `- Missing-inputs creates private files: ${runbook.currentState.missingInputsKit.kitCreatesPrivateFiles ?? 'unknown'}`,
    `- Missing-inputs intake: ${runbook.currentState.missingInputsIntake.status ?? 'missing'}`,
    `- Missing-inputs intake ready: ${runbook.currentState.missingInputsIntake.readyInputCount ?? 'unknown'}/${runbook.currentState.missingInputsIntake.inputCount ?? 'unknown'}`,
    `- Missing-inputs intake present: ${runbook.currentState.missingInputsIntake.presentInputCount ?? 'unknown'}`,
    `- Missing-inputs intake blockers: ${runbook.currentState.missingInputsIntake.blockerIds.join(', ') || 'none'}`,
    `- Missing-inputs intake can ask approval now: ${runbook.currentState.missingInputsIntake.canAskApprovalNow ?? 'unknown'}`,
    `- Missing-inputs intake full private values stored: ${runbook.currentState.missingInputsIntake.fullPrivateValuesStoredInReport ?? 'unknown'}`,
    `- Missing-inputs request bundle: ${runbook.currentState.missingInputsRequestBundle.status ?? 'missing'}`,
    `- Missing-inputs request count: ${runbook.currentState.missingInputsRequestBundle.requestCount ?? 'unknown'}`,
    `- Missing-inputs request copy blocks ready: ${runbook.currentState.missingInputsRequestBundle.copyBlocksReady ?? 'unknown'}`,
    `- Missing-inputs request asks approval: ${runbook.currentState.missingInputsRequestBundle.asksApproval ?? 'unknown'}`,
    `- Missing-inputs request creates private files: ${runbook.currentState.missingInputsRequestBundle.createsPrivateFiles ?? 'unknown'}`,
    `- Private-input template pack: ${runbook.currentState.privateInputTemplatePack.status ?? 'missing'}`,
    `- Private-input template count: ${runbook.currentState.privateInputTemplatePack.templateCount ?? 'unknown'}`,
    `- Private-input example file count: ${runbook.currentState.privateInputTemplatePack.exampleFileCount ?? 'unknown'}`,
    `- Private-input active path collisions: ${runbook.currentState.privateInputTemplatePack.activePathCollisionCount ?? 'unknown'}`,
    `- Private-input creates active files: ${runbook.currentState.privateInputTemplatePack.createsActivePrivateInputFiles ?? 'unknown'}`,
    `- Private-input writes real values: ${runbook.currentState.privateInputTemplatePack.writesRealPrivateValues ?? 'unknown'}`,
    `- Post-input orchestrator: ${runbook.currentState.postInputOrchestrator.status ?? 'missing'}`,
    `- Post-input ready commands: ${runbook.currentState.postInputOrchestrator.readyCommandCount ?? 'unknown'}`,
    `- Post-input commands executed: ${runbook.currentState.postInputOrchestrator.commandsExecuted ?? 'unknown'}`,
    `- Taxonomy consolidation audit: ${runbook.currentState.taxonomyConsolidationAudit.status ?? 'missing'}`,
    `- Taxonomy live evidence groups: ${runbook.currentState.taxonomyConsolidationAudit.liveEvidenceGroupCount ?? 'unknown'}`,
    `- Taxonomy Brand promotions needed: ${runbook.currentState.taxonomyConsolidationAudit.brandPromotionNeededCount ?? 'unknown'}`,
    `- Taxonomy CRM manifest refresh needed: ${runbook.currentState.taxonomyConsolidationAudit.crmManifestRefreshNeededCount ?? 'unknown'}`,
    `- Taxonomy refresh handoff: ${runbook.currentState.taxonomyRefreshHandoff.status ?? 'missing'}`,
    `- Taxonomy refresh Brand decisions: ${runbook.currentState.taxonomyRefreshHandoff.brandPromotionDecisionCount ?? 'unknown'}`,
    `- Taxonomy refresh CRM patch rows: ${runbook.currentState.taxonomyRefreshHandoff.crmManifestPatchCount ?? 'unknown'}`,
    `- Taxonomy refresh can apply CRM patch now: ${runbook.currentState.taxonomyRefreshHandoff.canApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy response workspace: ${runbook.currentState.taxonomyRefreshResponseWorkspace.status ?? 'missing'}`,
    `- Taxonomy response pending actors: ${runbook.currentState.taxonomyRefreshResponseWorkspace.pendingActors.join(', ') || 'none'}`,
    `- Taxonomy response ready for intake: ${runbook.currentState.taxonomyRefreshResponseWorkspace.readyForIntake ?? 'unknown'}`,
    `- Taxonomy response can apply CRM patch now: ${runbook.currentState.taxonomyRefreshResponseWorkspace.canApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy decision intake: ${runbook.currentState.taxonomyRefreshDecisionIntake.status ?? 'missing'}`,
    `- Taxonomy decision rows present: ${runbook.currentState.taxonomyRefreshDecisionIntake.brandDecisionRowsPresent ?? 'unknown'}/${runbook.currentState.taxonomyRefreshDecisionIntake.brandDecisionRowsNeeded ?? 'unknown'}`,
    `- Taxonomy decision ready for local patch preview: ${runbook.currentState.taxonomyRefreshDecisionIntake.readyForLocalPatchPreview ?? 'unknown'}`,
    `- Taxonomy decision can apply CRM patch now: ${runbook.currentState.taxonomyRefreshDecisionIntake.canApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy response request bundle: ${runbook.currentState.taxonomyRefreshResponseRequestBundle.status ?? 'missing'}`,
    `- Taxonomy response request pending actors: ${runbook.currentState.taxonomyRefreshResponseRequestBundle.pendingActors.join(', ') || 'none'}`,
    `- Taxonomy response request missing final responses: ${runbook.currentState.taxonomyRefreshResponseRequestBundle.missingFinalResponseActors.join(', ') || 'none'}`,
    `- Taxonomy response request asks live approval: ${runbook.currentState.taxonomyRefreshResponseRequestBundle.asksLiveApproval ?? 'unknown'}`,
    `- Continuation guard: ${runbook.currentState.continuationGuard.status ?? 'missing'}`,
    `- Continuation guard closed boundaries: ${runbook.currentState.continuationGuard.closedBoundaryCount ?? 'unknown'}/${runbook.currentState.continuationGuard.trackedBoundaryCount ?? 'unknown'}`,
    `- Continuation guard old UI work closed: ${runbook.currentState.continuationGuard.oldUiWorkClosed ?? 'unknown'}`,
    `- Continuation guard active inputs: ${runbook.currentState.continuationGuard.activeInputIds.join(', ') || 'none'}`,
    `- Continuation guard UI action: ${runbook.currentState.continuationGuard.uiWorkAction ?? 'unknown'}`,
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
    onboardingV2EmptyGroupsExecution,
    onboardingV2EmptyGroupsCreateDryRun,
    onboardingV2FirstEmailMap,
    miniLaunchEmptyGroupCreateDryRun,
    miniLaunchCrmSignalProjectionPacket,
    miniLaunchCrmWriteApprovalPacket,
    miniLaunchEmailStyleQaPacket,
    miniLaunchLocalEmailAssetPlan,
    miniLaunchEmailAssetBuildScopePacket,
    miniLaunchEmailBuilderPayloadManifest,
    miniLaunchEmailRenderQa,
    miniLaunchEmailManualUiBuildReceipt,
    miniLaunchEmailManualUiDraftRepairPacket,
    miniLaunchSeedTestQaPacket,
    miniLaunchSeedTestExecutionReceipt,
    miniLaunchShopifyLocalBuildReceipt,
    brujulaPlan,
    brujulaApply,
    brujulaEmailStyleQa,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    brujulaRealMailerLiteRenderQa,
    brujulaEmailManualUiBuildReceipt,
    approvalQueue,
    approvalIntake,
    blockedGateHandoff,
    missingInputsKit,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    taxonomyConsolidationAudit,
    taxonomyRefreshHandoff,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshDecisionIntake,
    taxonomyRefreshResponseRequestBundle,
    continuationGuard,
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
    readOptionalJson(options.onboardingV2EmptyGroupsExecution),
    readOptionalJson(options.onboardingV2EmptyGroupsCreateDryRun),
    readOptionalJson(options.onboardingV2FirstEmailMap),
    readOptionalJson(options.miniLaunchEmptyGroupCreateDryRun),
    readOptionalJson(options.miniLaunchCrmSignalProjectionPacket),
    readOptionalJson(options.miniLaunchCrmWriteApprovalPacket),
    readOptionalJson(options.miniLaunchEmailStyleQaPacket),
    readOptionalJson(options.miniLaunchLocalEmailAssetPlan),
    readOptionalJson(options.miniLaunchEmailAssetBuildScopePacket),
    readOptionalJson(options.miniLaunchEmailBuilderPayloadManifest),
    readOptionalJson(options.miniLaunchEmailRenderQa),
    readOptionalJson(options.miniLaunchEmailManualUiBuildReceipt),
    readOptionalJson(options.miniLaunchEmailManualUiDraftRepairPacket),
    readOptionalJson(options.miniLaunchSeedTestQaPacket),
    readOptionalJson(options.miniLaunchSeedTestExecutionReceipt),
    readOptionalJson(options.miniLaunchShopifyLocalBuildReceipt),
    readJson(options.brujulaPlan),
    readJson(options.brujulaApply),
    readJson(options.brujulaEmailStyleQa),
    readJson(options.brujulaEmailStyleCorrection),
    readOptionalJson(options.brujulaEmailRenderQa),
    readOptionalJson(options.brujulaRealMailerLiteRenderQa),
    readOptionalJson(options.brujulaEmailManualUiBuildReceipt),
    readOptionalJson(options.approvalQueue),
    readOptionalJson(options.approvalIntake),
    readOptionalJson(options.blockedGateHandoff),
    readOptionalJson(options.missingInputsKit),
    readOptionalJson(options.missingInputsIntake),
    readOptionalJson(options.missingInputsRequestBundle),
    readOptionalJson(options.privateInputTemplatePack),
    readOptionalJson(options.postInputOrchestrator),
    readOptionalJson(options.taxonomyConsolidationAudit),
    readOptionalJson(options.taxonomyRefreshHandoff),
    readOptionalJson(options.taxonomyRefreshResponseWorkspace),
    readOptionalJson(options.taxonomyRefreshDecisionIntake),
    readOptionalJson(options.taxonomyRefreshResponseRequestBundle),
    readOptionalJson(options.continuationGuard),
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
    onboardingV2EmptyGroupsExecution,
    onboardingV2EmptyGroupsCreateDryRun,
    onboardingV2FirstEmailMap,
    miniLaunchEmptyGroupCreateDryRun,
    miniLaunchCrmSignalProjectionPacket,
    miniLaunchCrmWriteApprovalPacket,
    miniLaunchEmailStyleQaPacket,
    miniLaunchLocalEmailAssetPlan,
    miniLaunchEmailAssetBuildScopePacket,
    miniLaunchEmailBuilderPayloadManifest,
    miniLaunchEmailRenderQa,
    miniLaunchEmailManualUiBuildReceipt,
    miniLaunchEmailManualUiDraftRepairPacket,
    miniLaunchSeedTestQaPacket,
    miniLaunchSeedTestExecutionReceipt,
    miniLaunchShopifyLocalBuildReceipt,
    brujulaPlan,
    brujulaApply,
    brujulaEmailStyleQa,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    brujulaRealMailerLiteRenderQa,
    brujulaEmailManualUiBuildReceipt,
    approvalQueue,
    approvalIntake,
    blockedGateHandoff,
    missingInputsKit,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    taxonomyConsolidationAudit,
    taxonomyRefreshHandoff,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshDecisionIntake,
    taxonomyRefreshResponseRequestBundle,
    continuationGuard,
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
    approvalQueueStatus: runbook.currentState.approvalQueue.status,
    approvalQueueReadyCount: runbook.currentState.approvalQueue.readyApprovalRequestCount,
    approvalIntakeStatus: runbook.currentState.approvalIntake.status,
    approvalIntakeCanProceedToFreshEvidence: runbook.currentState.approvalIntake.canProceedToFreshEvidence,
    blockedGateHandoffStatus: runbook.currentState.blockedGateHandoff.status,
    blockedGateHandoffInputNeededCount: runbook.currentState.blockedGateHandoff.inputNeededCount,
    blockedGateHandoffCanAskApprovalNow: runbook.currentState.blockedGateHandoff.canAskApprovalNow,
    missingInputsKitStatus: runbook.currentState.missingInputsKit.status,
    missingInputsKitInputCount: runbook.currentState.missingInputsKit.inputCount,
    missingInputsIntakeStatus: runbook.currentState.missingInputsIntake.status,
    missingInputsIntakeReadyInputCount: runbook.currentState.missingInputsIntake.readyInputCount,
    missingInputsIntakeCanAskApprovalNow: runbook.currentState.missingInputsIntake.canAskApprovalNow,
    missingInputsRequestBundleStatus: runbook.currentState.missingInputsRequestBundle.status,
    missingInputsRequestBundleRequestCount: runbook.currentState.missingInputsRequestBundle.requestCount,
    privateInputTemplatePackStatus: runbook.currentState.privateInputTemplatePack.status,
    privateInputTemplatePackExampleFileCount: runbook.currentState.privateInputTemplatePack.exampleFileCount,
    postInputOrchestratorStatus: runbook.currentState.postInputOrchestrator.status,
    postInputOrchestratorReadyCommandCount: runbook.currentState.postInputOrchestrator.readyCommandCount,
    postInputOrchestratorCommandsExecuted: runbook.currentState.postInputOrchestrator.commandsExecuted,
    taxonomyConsolidationAuditStatus: runbook.currentState.taxonomyConsolidationAudit.status,
    taxonomyConsolidationBrandPromotionNeededCount: runbook.currentState.taxonomyConsolidationAudit.brandPromotionNeededCount,
    taxonomyConsolidationCrmManifestRefreshNeededCount: runbook.currentState.taxonomyConsolidationAudit.crmManifestRefreshNeededCount,
    taxonomyRefreshHandoffStatus: runbook.currentState.taxonomyRefreshHandoff.status,
    taxonomyRefreshBrandPromotionDecisionCount: runbook.currentState.taxonomyRefreshHandoff.brandPromotionDecisionCount,
    taxonomyRefreshCrmManifestPatchCount: runbook.currentState.taxonomyRefreshHandoff.crmManifestPatchCount,
    taxonomyRefreshCanApplyCrmManifestPatchNow: runbook.currentState.taxonomyRefreshHandoff.canApplyCrmManifestPatchNow,
    taxonomyRefreshResponseWorkspaceStatus: runbook.currentState.taxonomyRefreshResponseWorkspace.status,
    taxonomyRefreshResponsePendingActorCount: runbook.currentState.taxonomyRefreshResponseWorkspace.pendingActorCount,
    taxonomyRefreshResponseReadyForIntake: runbook.currentState.taxonomyRefreshResponseWorkspace.readyForIntake,
    taxonomyRefreshResponseCanApplyCrmManifestPatchNow: runbook.currentState.taxonomyRefreshResponseWorkspace.canApplyCrmManifestPatchNow,
    taxonomyRefreshDecisionIntakeStatus: runbook.currentState.taxonomyRefreshDecisionIntake.status,
    taxonomyRefreshDecisionRowsPresent: runbook.currentState.taxonomyRefreshDecisionIntake.brandDecisionRowsPresent,
    taxonomyRefreshDecisionReadyForLocalPatchPreview: runbook.currentState.taxonomyRefreshDecisionIntake.readyForLocalPatchPreview,
    taxonomyRefreshDecisionCanApplyCrmManifestPatchNow: runbook.currentState.taxonomyRefreshDecisionIntake.canApplyCrmManifestPatchNow,
    taxonomyRefreshResponseRequestBundleStatus: runbook.currentState.taxonomyRefreshResponseRequestBundle.status,
    taxonomyRefreshResponseRequestPendingActorCount: runbook.currentState.taxonomyRefreshResponseRequestBundle.pendingActorCount,
    taxonomyRefreshResponseRequestMissingFinalResponseCount: runbook.currentState.taxonomyRefreshResponseRequestBundle.missingFinalResponseCount,
    taxonomyRefreshResponseRequestAsksLiveApproval: runbook.currentState.taxonomyRefreshResponseRequestBundle.asksLiveApproval,
    continuationGuardStatus: runbook.currentState.continuationGuard.status,
    continuationGuardOldUiWorkClosed: runbook.currentState.continuationGuard.oldUiWorkClosed,
    continuationGuardClosedBoundaryCount: runbook.currentState.continuationGuard.closedBoundaryCount,
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
  buildImmediateNextMoves,
  buildOperatingPrinciples,
  buildOperatingScenarios,
  buildReportMap,
  buildRunbook,
  buildRunbookFromFiles,
  commandCatalogFrom,
  parseArgs,
  renderMarkdown,
};
