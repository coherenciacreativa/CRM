#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-goal-audit-2026-05-27';

const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const DEFAULT_MIGRATION_BLUEPRINT = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';
const DEFAULT_BRAND_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RECONCILIATION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_FINALIZATION_PREFLIGHT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json';
const DEFAULT_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WATCHER = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_TRUNK_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_trunk_map_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_DESIGN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_event_contract_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_map_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_draft_repair_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
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
const DEFAULT_CONTINUATION_GUARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_continuation_guard_2026-05-28.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const OBJECTIVE = 'Lleva MailerLite desde la arquitectura actual hacia un MailerLite Launch OS v0 listo para operar: preservar el onboarding productivo, disenar Onboarding v2, consolidar taxonomia de grupos/tags/recibos, preparar infraestructura para mini-lanzamientos frecuentes, coordinar con Brand Hub y CRM, documentar todo con reportes claros, validar con dry-runs y commits limpios, y detenerte a pedirme aprobacion antes de cualquier cambio vivo en MailerLite, Shopify, CRM, workflows, subscribers o envios reales.';

const APPROVAL_INTAKE_READY_STATUSES = new Set([
  'waiting_for_exact_approval_text_no_live_changes',
  'no_exact_approval_phrase_detected_no_live_changes',
  'approval_text_present_but_no_exact_phrase_no_live_changes',
  'exact_approval_detected_requires_fresh_evidence_no_live_changes',
]);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs [options]

Options:
  --runbook <path>                  Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --control-room <path>             Control room markdown. Defaults to ${DEFAULT_CONTROL_ROOM}
  --migration-blueprint <path>      Onboarding migration blueprint markdown. Defaults to ${DEFAULT_MIGRATION_BLUEPRINT}
  --brand-taxonomy <path>           Brand taxonomy canon. Defaults to ${DEFAULT_BRAND_TAXONOMY}
  --brand-dictionary <path>         Brand group dictionary canon. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --readiness-board <path>          Mini-launch readiness JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --reconciliation-board <path>     Department review reconciliation JSON. Defaults to ${DEFAULT_RECONCILIATION}
  --response-workspace <path>       Department review response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --finalization-preflight <path>   Department finalization preflight JSON. Defaults to ${DEFAULT_FINALIZATION_PREFLIGHT}
  --request-bundle <path>           Department review request bundle JSON. Defaults to ${DEFAULT_REQUEST_BUNDLE}
  --response-watcher <path>         Department response watcher JSON. Defaults to ${DEFAULT_RESPONSE_WATCHER}
  --onboarding-v1-audit <path>      Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-trunk-map <path>     Onboarding trunk map JSON. Defaults to ${DEFAULT_ONBOARDING_TRUNK_MAP}
  --onboarding-v2-design <path>     Onboarding v2 design JSON. Defaults to ${DEFAULT_ONBOARDING_V2_DESIGN}
  --onboarding-v2-execution <path>  Onboarding v2 execution JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EXECUTION}
  --onboarding-v2-event-contract <path> Onboarding v2 event contract JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EVENT_CONTRACT}
  --onboarding-v2-empty-groups-packet <path> Onboarding v2 empty-groups approval packet JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET}
  --onboarding-v2-empty-groups-execution <path> Onboarding v2 executed empty-groups receipt JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION}
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --onboarding-v2-first-email-map <path> Onboarding v2 first-email mapping JSON. Defaults to ${DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP}
  --onboarding-handoff-policy <path> Mini-launch to onboarding handoff policy JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty group create runner dry-run JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --mini-launch-email-style-qa-packet <path> Mini-launch Email Style QA JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET}
  --mini-launch-local-email-asset-plan <path> Mini-launch local email asset plan JSON. Defaults to ${DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN}
  --mini-launch-email-asset-build-scope-packet <path> Mini-launch exact approval scope packet for future email asset build. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --mini-launch-email-builder-payload-manifest <path> Mini-launch local builder payload manifest. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --mini-launch-email-render-qa <path> Mini-launch local email render QA JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA}
  --mini-launch-email-manual-ui-build-receipt <path> Mini-launch manual UI draft build receipt JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --mini-launch-email-manual-ui-draft-repair-packet <path> Mini-launch manual UI draft repair packet JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET}
  --mini-launch-seed-test-qa-packet <path> Mini-launch seed/test QA preflight JSON. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET}
  --mini-launch-shopify-local-build-receipt <path> Mini-launch Shopify local build receipt JSON. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --mini-launch-crm-write-approval-packet <path> Mini-launch CRM write approval packet JSON. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET}
  --brujula-plan <path>             Brújula post-inbox plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>            Brújula apply receipt JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --brujula-email-style-qa <path>   Brújula email style QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_QA}
  --brujula-email-style-correction <path> Brújula Email 1 style correction JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>  Brújula Email 1 local render QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --brujula-real-mailerlite-render-qa <path> Brújula real MailerLite draft render QA JSON. Defaults to ${DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA}
  --brujula-email-manual-ui-build-receipt <path> Brújula Email 1 manual UI build receipt JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --approval-queue <path>           Launch OS exact approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --approval-intake <path>          Launch OS exact approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
  --blocked-gate-handoff <path>     Launch OS blocked-gate handoff JSON. Defaults to ${DEFAULT_BLOCKED_GATE_HANDOFF}
  --missing-inputs-kit <path>        Launch OS missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --missing-inputs-intake <path>     Launch OS missing-inputs redacted intake JSON. Defaults to ${DEFAULT_MISSING_INPUTS_INTAKE}
  --missing-inputs-request-bundle <path> Launch OS copy-ready missing-input request bundle JSON. Defaults to ${DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE}
  --private-input-template-pack <path> Launch OS inert private-input template pack JSON. Defaults to ${DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK}
  --continuation-guard <path>       Launch OS continuation guard JSON. Defaults to ${DEFAULT_CONTINUATION_GUARD}
  --validation-receipt <path>       Optional persistent validation receipt JSON. Defaults to ${DEFAULT_VALIDATION_RECEIPT}
  --package-json <path>             package.json. Defaults to ${DEFAULT_PACKAGE_JSON}
  --validation-status <status>      Optional closeout validation status, e.g. passed
  --validation-summary <text>       Optional human-readable validation receipt
  --out <path>                      Write JSON audit
  --markdown-out <path>             Write Markdown audit
  --help                            Show this help

Local-only Launch OS v0 goal audit. It converts the goal into machine-readable
requirements, points each requirement at current evidence, and explicitly marks
what remains unready. It performs no live calls and no mutations.`;

const parseArgs = (argv) => {
  const options = {
    runbook: DEFAULT_RUNBOOK,
    controlRoom: DEFAULT_CONTROL_ROOM,
    migrationBlueprint: DEFAULT_MIGRATION_BLUEPRINT,
    brandTaxonomy: DEFAULT_BRAND_TAXONOMY,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    readinessBoard: DEFAULT_READINESS_BOARD,
    reconciliationBoard: DEFAULT_RECONCILIATION,
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    finalizationPreflight: DEFAULT_FINALIZATION_PREFLIGHT,
    requestBundle: DEFAULT_REQUEST_BUNDLE,
    responseWatcher: DEFAULT_RESPONSE_WATCHER,
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingTrunkMap: DEFAULT_ONBOARDING_TRUNK_MAP,
    onboardingV2Design: DEFAULT_ONBOARDING_V2_DESIGN,
    onboardingV2Execution: DEFAULT_ONBOARDING_V2_EXECUTION,
    onboardingV2EventContract: DEFAULT_ONBOARDING_V2_EVENT_CONTRACT,
    onboardingV2EmptyGroupsPacket: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET,
    onboardingV2EmptyGroupsExecution: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_EXECUTION,
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    onboardingV2FirstEmailMap: DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    miniLaunchEmailStyleQaPacket: DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET,
    miniLaunchLocalEmailAssetPlan: DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN,
    miniLaunchEmailAssetBuildScopePacket: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    miniLaunchEmailBuilderPayloadManifest: DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    miniLaunchEmailRenderQa: DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA,
    miniLaunchEmailManualUiBuildReceipt: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT,
    miniLaunchEmailManualUiDraftRepairPacket: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET,
    miniLaunchSeedTestQaPacket: DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET,
    miniLaunchShopifyLocalBuildReceipt: DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT,
    miniLaunchCrmWriteApprovalPacket: DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET,
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
    continuationGuard: DEFAULT_CONTINUATION_GUARD,
    validationReceipt: DEFAULT_VALIDATION_RECEIPT,
    packageJson: DEFAULT_PACKAGE_JSON,
    validationStatus: 'not_supplied',
    validationSummary: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--migration-blueprint') options.migrationBlueprint = argv[++index];
    else if (arg === '--brand-taxonomy') options.brandTaxonomy = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--reconciliation-board') options.reconciliationBoard = argv[++index];
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--finalization-preflight') options.finalizationPreflight = argv[++index];
    else if (arg === '--request-bundle') options.requestBundle = argv[++index];
    else if (arg === '--response-watcher') options.responseWatcher = argv[++index];
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-trunk-map') options.onboardingTrunkMap = argv[++index];
    else if (arg === '--onboarding-v2-design') options.onboardingV2Design = argv[++index];
    else if (arg === '--onboarding-v2-execution') options.onboardingV2Execution = argv[++index];
    else if (arg === '--onboarding-v2-event-contract') options.onboardingV2EventContract = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-packet') options.onboardingV2EmptyGroupsPacket = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-execution') options.onboardingV2EmptyGroupsExecution = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-first-email-map') options.onboardingV2FirstEmailMap = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--mini-launch-email-style-qa-packet') options.miniLaunchEmailStyleQaPacket = argv[++index];
    else if (arg === '--mini-launch-local-email-asset-plan') options.miniLaunchLocalEmailAssetPlan = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-scope-packet') options.miniLaunchEmailAssetBuildScopePacket = argv[++index];
    else if (arg === '--mini-launch-email-builder-payload-manifest') options.miniLaunchEmailBuilderPayloadManifest = argv[++index];
    else if (arg === '--mini-launch-email-render-qa') options.miniLaunchEmailRenderQa = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-build-receipt') options.miniLaunchEmailManualUiBuildReceipt = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-draft-repair-packet') options.miniLaunchEmailManualUiDraftRepairPacket = argv[++index];
    else if (arg === '--mini-launch-seed-test-qa-packet') options.miniLaunchSeedTestQaPacket = argv[++index];
    else if (arg === '--mini-launch-shopify-local-build-receipt') options.miniLaunchShopifyLocalBuildReceipt = argv[++index];
    else if (arg === '--mini-launch-crm-write-approval-packet') options.miniLaunchCrmWriteApprovalPacket = argv[++index];
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
    else if (arg === '--continuation-guard') options.continuationGuard = argv[++index];
    else if (arg === '--validation-receipt') options.validationReceipt = argv[++index];
    else if (arg === '--package-json') options.packageJson = argv[++index];
    else if (arg === '--validation-status') options.validationStatus = argv[++index];
    else if (arg === '--validation-summary') options.validationSummary = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const readText = async (path) => readFile(resolve(path), 'utf8');

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const missingSourceDigest = (path, consultedFor) => ({
  path: resolve(path),
  present: false,
  chars: 0,
  consultedFor,
});

const uniqueMoves = (moves) => {
  const seen = new Set();
  return moves.filter((move) => {
    if (!move || seen.has(move)) return false;
    seen.add(move);
    return true;
  });
};

const listIncludesFragment = (items, fragment) => (items ?? [])
  .some((item) => String(item).includes(fragment));

const brujulaManualUiReceiptOutboxCount = (receipt) =>
  receipt?.executiveSummary?.outboxCountAfterBuild
    ?? receipt?.verification?.postExecutionApiVerify?.readyOutboxCampaignsRead
    ?? null;

const brujulaManualUiReceiptCampaignId = (receipt) =>
  receipt?.executiveSummary?.campaignId ?? receipt?.campaign?.id ?? null;

const brujulaManualUiReceiptClosed = (receipt) => {
  const legacyReceiptClosed = receipt?.status === 'brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends'
    && receipt?.executiveSummary?.createdOrEditedDraftCount === 1
    && brujulaManualUiReceiptOutboxCount(receipt) === 0
    && receipt?.draftReceipt?.uiVisibleInDrafts === true
    && receipt?.draftReceipt?.recipientsEmptyObserved === true
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesCreated === false
    && receipt?.safety?.subscribersReadOrAssigned === false
    && receipt?.safety?.groupsCreatedOrAssigned === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && listIncludesFragment(receipt?.stillClosedAfterThisReceipt, 'test_send_or_public_send');

  const verify = receipt?.verification?.postExecutionApiVerify ?? {};
  const greenReceiptClosed = receipt?.status === 'brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends'
    && receipt?.ok === true
    && receipt?.scope?.approvedScopeId === 'brujula_email1_builder_draft'
    && receipt?.scope?.exactApprovalMatched === true
    && receipt?.campaign?.status === 'draft'
    && receipt?.campaign?.recipientsSelected === false
    && receipt?.campaign?.groupsOrSegmentsSelected === false
    && receipt?.campaign?.scheduled === false
    && receipt?.campaign?.sent === false
    && verify?.targetInDraft === true
    && verify?.targetInReadyOutbox === false
    && verify?.readyOutboxCampaignsRead === 0
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesPerformed === false
    && receipt?.safety?.publicCampaignPublished === false
    && receipt?.safety?.subscriberMutationsPerformed === false
    && receipt?.safety?.groupsCreated === false
    && receipt?.safety?.groupAssignmentsPerformed === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && listIncludesFragment(receipt?.scope?.stillClosed, 'send_email_or_test_email');

  return legacyReceiptClosed || greenReceiptClosed;
};

const loadSources = async (options) => {
  const specs = [
    ['runbook', options.runbook, 'operator runbook state, scenarios and closed gates', 'json'],
    ['controlRoom', options.controlRoom, 'goal gates and current recommendation', 'text'],
    ['migrationBlueprint', options.migrationBlueprint, 'onboarding v1/v2 migration policy', 'text'],
    ['brandTaxonomy', options.brandTaxonomy, 'Brand Hub semantic taxonomy canon', 'text'],
    ['brandDictionary', options.brandDictionary, 'Brand Hub concrete group dictionary canon', 'text'],
    ['readinessBoard', options.readinessBoard, 'mini-launch readiness lanes and blockers', 'json'],
    ['reconciliationBoard', options.reconciliationBoard, 'department review response state', 'json'],
    ['responseWorkspace', options.responseWorkspace, 'pending response workspace and final response readiness', 'json'],
    ['finalizationPreflight', options.finalizationPreflight, 'department final response readiness and draft/pending distinction', 'json'],
    ['requestBundle', options.requestBundle, 'copy-ready department request texts for final responses', 'json'],
    ['responseWatcher', options.responseWatcher, 'file-existence watcher for final Brand/Web/CRM responses', 'json'],
    ['onboardingV1Audit', options.onboardingV1Audit, 'protected production onboarding v1 evidence', 'json'],
    ['onboardingTrunkMap', options.onboardingTrunkMap, 'onboarding trunk operator map and mini-launch handoff boundary', 'json'],
    ['onboardingV2Design', options.onboardingV2Design, 'Onboarding v2 design evidence', 'json'],
    ['onboardingV2Execution', options.onboardingV2Execution, 'Onboarding v2 execution gates', 'json'],
    ['onboardingV2EventContract', options.onboardingV2EventContract, 'Onboarding v2 CRM event contract', 'json'],
    ['onboardingV2EmptyGroupsPacket', options.onboardingV2EmptyGroupsPacket, 'Onboarding v2 empty-groups approval packet from fresh read-only scan', 'json', true],
    ['onboardingV2EmptyGroupsExecution', options.onboardingV2EmptyGroupsExecution, 'Onboarding v2 empty-groups execution receipt for already-created empty groups', 'json', true],
    ['onboardingV2EmptyGroupsCreateDryRun', options.onboardingV2EmptyGroupsCreateDryRun, 'Onboarding v2 empty-groups create runner dry-run with zero mutations', 'json', true],
    ['onboardingV2FirstEmailMap', options.onboardingV2FirstEmailMap, 'Onboarding v2 first-email mapping to prevent unnecessary Sent receipts', 'json', true],
    ['onboardingHandoffPolicy', options.onboardingHandoffPolicy, 'mini-launch to onboarding handoff policy and closed routing gate', 'json'],
    ['miniLaunchEmptyGroupCreateDryRun', options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty group create runner dry-run with zero mutations', 'json', true],
    ['miniLaunchEmailStyleQaPacket', options.miniLaunchEmailStyleQaPacket, 'mini-launch Email Style QA readiness for local asset planning with live gates closed', 'json', true],
    ['miniLaunchLocalEmailAssetPlan', options.miniLaunchLocalEmailAssetPlan, 'mini-launch local email asset plan with inert placeholders and build/send gates closed', 'json', true],
    ['miniLaunchEmailAssetBuildScopePacket', options.miniLaunchEmailAssetBuildScopePacket, 'mini-launch exact approval scope packet for future MailerLite draft email asset build; no execution', 'json', true],
    ['miniLaunchEmailBuilderPayloadManifest', options.miniLaunchEmailBuilderPayloadManifest, 'mini-launch local builder payload manifest with exact payloads and closed execution/send gates', 'json', true],
    ['miniLaunchEmailRenderQa', options.miniLaunchEmailRenderQa, 'mini-launch local email render QA with HTML and non-empty PNG preview evidence', 'json', true],
    ['miniLaunchEmailManualUiBuildReceipt', options.miniLaunchEmailManualUiBuildReceipt, 'mini-launch manual UI MailerLite draft build receipt and closed send/subscriber/workflow gates', 'json', true],
    ['miniLaunchEmailManualUiDraftRepairPacket', options.miniLaunchEmailManualUiDraftRepairPacket, 'mini-launch manual UI draft repair packet for real-render exact-copy mismatch', 'json', true],
    ['miniLaunchSeedTestQaPacket', options.miniLaunchSeedTestQaPacket, 'mini-launch seed/test QA preflight with real-render and seed-recipient blockers', 'json', true],
    ['miniLaunchShopifyLocalBuildReceipt', options.miniLaunchShopifyLocalBuildReceipt, 'mini-launch Shopify local build receipt and closed publish/form/API gates', 'json', true],
    ['miniLaunchCrmWriteApprovalPacket', options.miniLaunchCrmWriteApprovalPacket, 'mini-launch CRM write approval packet with exact observed-events/person/write-family boundary', 'json', true],
    ['brujulaPlan', options.brujulaPlan, 'Brújula post-inbox verification and creative posture', 'json'],
    ['brujulaApply', options.brujulaApply, 'Brújula test subscriber receipt assignment', 'json'],
    ['brujulaEmailStyleQa', options.brujulaEmailStyleQa, 'Brújula email style QA blockers and green criteria', 'json'],
    ['brujulaEmailStyleCorrection', options.brujulaEmailStyleCorrection, 'Brújula Email 1 corrected local draft and builder inputs', 'json'],
    ['brujulaEmailRenderQa', options.brujulaEmailRenderQa, 'Brújula Email 1 local render QA and preview evidence', 'json', true],
    ['brujulaRealMailerLiteRenderQa', options.brujulaRealMailerLiteRenderQa, 'Brújula Email 1 real MailerLite draft render QA evidence', 'json', true],
    ['brujulaEmailManualUiBuildReceipt', options.brujulaEmailManualUiBuildReceipt, 'Brújula Email 1 manual UI draft build receipt and closed gates', 'json', true],
    ['approvalQueue', options.approvalQueue, 'single exact approval queue for current MailerLite Launch OS gates', 'json', true],
    ['approvalIntake', options.approvalIntake, 'local exact approval intake and fresh-evidence pre-execution plan', 'json', true],
    ['blockedGateHandoff', options.blockedGateHandoff, 'current blocked gates and missing inputs before any new approval request', 'json', true],
    ['missingInputsKit', options.missingInputsKit, 'Launch OS missing-inputs kit with capture specs and post-input commands', 'json', true],
    ['missingInputsIntake', options.missingInputsIntake, 'Launch OS missing-inputs intake with redacted private input status', 'json', true],
    ['missingInputsRequestBundle', options.missingInputsRequestBundle, 'Launch OS copy-ready missing-input request bundle with no approval or private file creation', 'json', true],
    ['privateInputTemplatePack', options.privateInputTemplatePack, 'Launch OS inert private-input template pack with example files ignored by active intake', 'json', true],
    ['continuationGuard', options.continuationGuard, 'Launch OS continuation guard with closed hito and do-not-recycle state', 'json', true],
    ['validationReceipt', options.validationReceipt, 'persistent local validation receipt for tests/checks', 'json', true],
    ['packageJson', options.packageJson, 'available commands and local test surface', 'json'],
  ];

  const values = {};
  const sourceDigests = [];
  for (const [key, path, consultedFor, kind, optional = false] of specs) {
    let content;
    try {
      content = await readText(path);
    } catch (error) {
      if (optional && error.code === 'ENOENT') {
        values[key] = null;
        sourceDigests.push(missingSourceDigest(path, consultedFor));
        continue;
      }
      throw error;
    }
    values[key] = kind === 'json' ? JSON.parse(content) : content;
    sourceDigests.push(sourceDigest(path, content, consultedFor));
  }
  return { values, sourceDigests };
};

const packageHas = (packageJson, scriptName) => Boolean(packageJson?.scripts?.[scriptName]);

const assignedGroupNames = (brujulaApply) => (brujulaApply?.assignedGroups ?? [])
  .map((group) => group?.name)
  .filter(Boolean);

const validationReceiptPassed = (validationReceipt) => validationReceipt?.status === 'mailerlite_launch_os_validation_receipt_ready_no_live_changes'
  && validationReceipt?.validationStatus === 'passed'
  && validationReceipt?.evidence?.liveGatesClosed === true
  && validationReceipt?.safety?.mailerLiteApiCalled === false
  && validationReceipt?.safety?.shopifyApiCalled === false
  && validationReceipt?.safety?.crmLiveApiCalled === false
  && validationReceipt?.safety?.subscribersRead === false
  && validationReceipt?.safety?.groupMutationsPerformed === false
  && validationReceipt?.safety?.workflowMutationsPerformed === false
  && validationReceipt?.safety?.sendsPerformed === false
  && validationReceipt?.safety?.signalLedgerAppendPerformed === false
  && validationReceipt?.safety?.crmCardMutationsPerformed === false
  && validationReceipt?.safety?.crmScoreMutationsPerformed === false
  && validationReceipt?.safety?.factStoreWritePerformed === false;

const buildRequirementChecks = ({
  runbook,
  readinessBoard,
  reconciliationBoard,
  responseWorkspace,
  finalizationPreflight,
  requestBundle,
  responseWatcher,
  onboardingV1Audit,
  onboardingTrunkMap,
  onboardingV2Design,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsExecution,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  onboardingHandoffPolicy,
  miniLaunchEmptyGroupCreateDryRun,
  miniLaunchEmailStyleQaPacket,
  miniLaunchLocalEmailAssetPlan,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailRenderQa,
  miniLaunchEmailManualUiBuildReceipt,
  miniLaunchEmailManualUiDraftRepairPacket,
  miniLaunchSeedTestQaPacket,
  miniLaunchShopifyLocalBuildReceipt,
  miniLaunchCrmWriteApprovalPacket,
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
  continuationGuard,
  validationReceipt,
  brandTaxonomy,
  brandDictionary,
  packageJson,
  validationStatus = 'not_supplied',
  validationSummary = null,
}) => {
  const groups = assignedGroupNames(brujulaApply);
  const brujulaReceiptsOk = groups.includes('CC · Source · Resource · Brújula')
    && groups.includes('CC · Delivered · Guide · Brújula');
  const v1Protected = onboardingV1Audit?.workflow?.enabled === true
    && onboardingV1Audit?.workflow?.complete === true
    && onboardingV1Audit?.workflow?.broken === false;
  const trunkMapReady = onboardingTrunkMap?.status === 'onboarding_trunk_map_ready_no_live_changes'
    || runbook?.currentState?.onboarding?.trunkMapStatus === 'onboarding_trunk_map_ready_no_live_changes';
  const pendingDepartments = reconciliationBoard?.responseState?.pendingDepartments ?? [];
  const workspacePendingDepartments = responseWorkspace?.pendingDepartments
    ?? runbook?.currentState?.miniLaunch?.responseWorkspacePendingDepartments
    ?? [];
  const readyForResponseIntake = responseWorkspace?.readyForIntake
    ?? runbook?.currentState?.miniLaunch?.readyForResponseIntake
    ?? false;
  const responseWorkspaceStatus = responseWorkspace?.status
    ?? runbook?.currentState?.miniLaunch?.responseWorkspaceStatus
    ?? null;
  const finalizationStatus = finalizationPreflight?.status
    ?? runbook?.currentState?.miniLaunch?.finalizationPreflightStatus
    ?? null;
  const finalizationReadyForIntake = finalizationPreflight?.readyForIntake
    ?? runbook?.currentState?.miniLaunch?.finalizationReadyForIntake
    ?? false;
  const requestBundleStatus = requestBundle?.status
    ?? runbook?.currentState?.miniLaunch?.requestBundleStatus
    ?? null;
  const requestBundleRequestCount = requestBundle?.summary?.requestCount
    ?? runbook?.currentState?.miniLaunch?.requestBundleRequestCount
    ?? null;
  const requestBundleAwaitingFinalCount = requestBundle?.summary?.awaitingFinalCount ?? null;
  const responseWatcherStatus = responseWatcher?.status ?? runbook?.currentState?.miniLaunch?.responseWatcherStatus ?? null;
  const responseWatcherMissingFinalCount = responseWatcher?.summary?.missingFinalCount
    ?? runbook?.currentState?.miniLaunch?.responseWatcherMissingFinalCount
    ?? null;
  const responseWatcherFinalFilePresentCount = responseWatcher?.summary?.finalFilePresentCount
    ?? runbook?.currentState?.miniLaunch?.responseWatcherFinalFilePresentCount
    ?? null;
  const responseWatcherNextBestMove = responseWatcher?.summary?.nextBestMove
    ?? runbook?.currentState?.miniLaunch?.responseWatcherNextBestMove
    ?? null;
  const acceptedFinalDepartments = finalizationPreflight?.acceptedDepartments
    ?? runbook?.currentState?.miniLaunch?.acceptedFinalDepartments
    ?? [];
  const draftAssistDepartments = finalizationPreflight?.draftAssistDepartments
    ?? runbook?.currentState?.miniLaunch?.draftAssistDepartments
    ?? [];
  const awaitingFinalDepartments = finalizationPreflight?.awaitingDepartments
    ?? runbook?.currentState?.miniLaunch?.awaitingFinalDepartments
    ?? [];
  const pendingReadyDepartments = finalizationPreflight?.pendingReadyDepartments
    ?? runbook?.currentState?.miniLaunch?.pendingReadyDepartments
    ?? [];
  const openLiveGates = runbook?.currentState?.liveGates?.openLiveGateCount
    ?? reconciliationBoard?.liveGateSummary?.openLiveGateCount
    ?? 0;
  const readinessState = readinessBoard?.executiveSummary?.overallState ?? null;
  const readyNoLiveLaneCount = readinessBoard?.executiveSummary?.readyNoLiveLaneCount ?? 0;
  const liveMutationGateOpenCount = readinessBoard?.executiveSummary?.liveMutationGateOpenCount ?? null;
  const brandCandidateGroupsLane = readinessBoard?.lanes?.find((lane) => lane.id === 'brand_candidate_groups') ?? null;
  const groupDryRunLane = readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_group_dry_run') ?? null;
  const emailSequenceLane = readinessBoard?.lanes?.find((lane) => lane.id === 'email_sequence') ?? null;
  const emptyGroupApprovalLane = readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_empty_group_approval_packet') ?? null;
  const emptyGroupCreateDryRunLane = readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_empty_group_create_dry_run') ?? null;
  const brandCandidateDecisionClosed = brandCandidateGroupsLane?.sourceStatus === 'brand_candidate_decision_closed_ready_no_live_changes'
    && (brandCandidateGroupsLane?.readiness?.acceptedGroupCount ?? 0) >= 2
    && (brandCandidateGroupsLane?.readiness?.missingCandidateCount ?? 0) === 0
    && (brandCandidateGroupsLane?.readiness?.brandStatusBlockedCount ?? 0) === 0;
  const launchGroupsAlreadyExist = groupDryRunLane?.sourceStatus === 'mini_launch_groups_already_exist_no_create_needed';
  const launchGroupDryRunReady = [
    'mini_launch_group_dry_run_ready_for_future_empty_group_decision',
    'mini_launch_groups_already_exist_no_create_needed',
  ].includes(groupDryRunLane?.sourceStatus)
    && groupDryRunLane?.readiness?.brandDictionaryHasTargets === true
    && groupDryRunLane?.readiness?.brandApprovedForEmptyCreate === true
    && groupDryRunLane?.readiness?.canAssignSubscribersNow === false
    && groupDryRunLane?.readiness?.canSendNow === false
    && groupDryRunLane?.readiness?.canAttachWorkflowNow === false;
  const emptyGroupApprovalPacketReady = emptyGroupApprovalLane?.readyNow === true
    || runbook?.currentState?.miniLaunch?.emptyGroupApprovalPacketReady === true;
  const miniLaunchEmptyGroupCreateDryRunStatus = miniLaunchEmptyGroupCreateDryRun?.status
    ?? emptyGroupCreateDryRunLane?.sourceStatus
    ?? runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunStatus
    ?? null;
  const miniLaunchEmptyGroupCreateDryRunTargetExistingCount = miniLaunchEmptyGroupCreateDryRun?.freshScan?.targetGroupsExistingCount
    ?? emptyGroupCreateDryRunLane?.readiness?.targetGroupsExistingCount
    ?? runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunTargetExistingCount
    ?? 0;
  const miniLaunchEmptyGroupCreateDryRunTargetMissingCount = miniLaunchEmptyGroupCreateDryRun?.freshScan?.targetGroupsMissingCount
    ?? emptyGroupCreateDryRunLane?.readiness?.targetGroupsMissingCount
    ?? runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunTargetMissingCount
    ?? 2;
  const miniLaunchEmptyGroupCreateDryRunCreatedCount = miniLaunchEmptyGroupCreateDryRun?.createdGroups?.length
    ?? emptyGroupCreateDryRunLane?.readiness?.createdCount
    ?? runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunCreatedCount
    ?? 0;
  const miniLaunchEmptyGroupCreateDryRunCanExecute = miniLaunchEmptyGroupCreateDryRun?.decision?.canExecute
    ?? emptyGroupCreateDryRunLane?.readiness?.canExecute
    ?? runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunCanExecute
    ?? false;
  const miniLaunchEmptyGroupCreateDryRunMutated = miniLaunchEmptyGroupCreateDryRun?.safety?.mailerLiteMutationsPerformed
    ?? emptyGroupCreateDryRunLane?.readiness?.mailerLiteMutationsPerformed
    ?? false;
  const miniLaunchEmptyGroupCreateDryRunNoCreateNeeded = miniLaunchEmptyGroupCreateDryRunStatus === 'dry_run_no_create_needed_targets_already_exist'
    && miniLaunchEmptyGroupCreateDryRunTargetExistingCount >= 2
    && miniLaunchEmptyGroupCreateDryRunTargetMissingCount === 0
    && miniLaunchEmptyGroupCreateDryRunCreatedCount === 0
    && miniLaunchEmptyGroupCreateDryRunCanExecute === false
    && miniLaunchEmptyGroupCreateDryRunMutated === false;
  const miniLaunchEmptyGroupCreateDryRunReady = (
    miniLaunchEmptyGroupCreateDryRunStatus === 'dry_run_ready_for_exact_approval'
    && (miniLaunchEmptyGroupCreateDryRun?.mode === 'dry_run' || !miniLaunchEmptyGroupCreateDryRun)
    && miniLaunchEmptyGroupCreateDryRunTargetExistingCount === 0
    && miniLaunchEmptyGroupCreateDryRunTargetMissingCount === 2
    && miniLaunchEmptyGroupCreateDryRunCreatedCount === 0
    && miniLaunchEmptyGroupCreateDryRunCanExecute === false
    && miniLaunchEmptyGroupCreateDryRunMutated === false
  ) || miniLaunchEmptyGroupCreateDryRunNoCreateNeeded;
  const receiptPassed = validationReceiptPassed(validationReceipt);
  const reconciliationActions = reconciliationBoard?.actionPlan?.actions ?? [];
  const hasReconciliationAction = (id) => reconciliationActions.some((action) => action.id === id);
  const brandAcceptedLaunchGroupCandidates = hasReconciliationAction('rerun_group_dry_run');
  const webAcceptedScopedLocalDraft = hasReconciliationAction('prepare_scoped_shopify_local_build_request');
  const crmAcceptedSignalBoundaries = hasReconciliationAction('signal_boundaries_ready_for_future_no_live_projection_packet');
  const miniLaunchEmailStyleQaStatus = miniLaunchEmailStyleQaPacket?.status
    ?? emailSequenceLane?.sourceStatus
    ?? runbook?.currentState?.miniLaunch?.emailStyleQaPacketStatus
    ?? null;
  const miniLaunchEmailStyleQaReadyForLocalAssetPlan = miniLaunchEmailStyleQaStatus === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes'
    && (miniLaunchEmailStyleQaPacket?.approvalGate?.readyForLocalAssetPlanNow
      ?? emailSequenceLane?.readiness?.readyForLocalAssetPlanNow
      ?? runbook?.currentState?.miniLaunch?.emailStyleQaReadyForLocalAssetPlan
      ?? false) === true
    && (miniLaunchEmailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow
      ?? emailSequenceLane?.readiness?.readyForMailerLiteAssetBuildNow
      ?? runbook?.currentState?.miniLaunch?.emailStyleQaReadyForMailerLiteBuild
      ?? false) === false
    && (miniLaunchEmailStyleQaPacket?.approvalGate?.readyForSeedSendNow
      ?? emailSequenceLane?.readiness?.readyForSeedSendNow
      ?? runbook?.currentState?.miniLaunch?.emailStyleQaReadyForSeedSend
      ?? false) === false
    && (miniLaunchEmailStyleQaPacket?.safety?.mailerLiteApiCalled ?? false) === false
    && (miniLaunchEmailStyleQaPacket?.safety?.sendsPerformed ?? false) === false
    && (miniLaunchEmailStyleQaPacket?.safety?.crmLiveApiCalled ?? false) === false;
  const miniLaunchEmailStyleQaHardBlockerCount = miniLaunchEmailStyleQaPacket?.executiveSummary?.hardBlockerCount
    ?? emailSequenceLane?.readiness?.hardBlockerCount
    ?? runbook?.currentState?.miniLaunch?.emailStyleQaHardBlockerCount
    ?? null;
  const miniLaunchEmailStyleQaYellowCheckCount = miniLaunchEmailStyleQaPacket?.executiveSummary?.yellowCheckCount
    ?? emailSequenceLane?.readiness?.yellowCheckCount
    ?? runbook?.currentState?.miniLaunch?.emailStyleQaYellowCheckCount
    ?? null;
  const miniLaunchLocalEmailAssetPlanStatus = miniLaunchLocalEmailAssetPlan?.status
    ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanStatus
    ?? (emailSequenceLane?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
      ? emailSequenceLane.sourceStatus
      : null);
  const miniLaunchLocalEmailAssetPlanReady = miniLaunchLocalEmailAssetPlanStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
    && (miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForExactAssetBuildScopeRequestNow
      ?? emailSequenceLane?.readiness?.readyForExactAssetBuildScopeRequestNow
      ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanReadyForExactBuildScopeRequest
      ?? false) === true
    && (miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForMailerLiteAssetBuildNow
      ?? emailSequenceLane?.readiness?.readyForMailerLiteAssetBuildNow
      ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanReadyForMailerLiteBuild
      ?? false) === false
    && (miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForSeedSendNow
      ?? emailSequenceLane?.readiness?.readyForSeedSendNow
      ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanReadyForSeedSend
      ?? false) === false
    && (miniLaunchLocalEmailAssetPlan?.safety?.mailerLiteApiCalled ?? false) === false
    && (miniLaunchLocalEmailAssetPlan?.safety?.sendsPerformed ?? false) === false
    && (miniLaunchLocalEmailAssetPlan?.safety?.crmLiveApiCalled ?? false) === false;
  const miniLaunchLocalEmailAssetPlanAssetCount = miniLaunchLocalEmailAssetPlan?.executiveSummary?.assetCount
    ?? emailSequenceLane?.readiness?.assetCount
    ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanAssetCount
    ?? null;
  const miniLaunchLocalEmailAssetPlanPlaceholderCount = miniLaunchLocalEmailAssetPlan?.executiveSummary?.placeholderCount
    ?? emailSequenceLane?.readiness?.placeholderCount
    ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanPlaceholderCount
    ?? null;
  const miniLaunchEmailAssetBuildScopePacketStatus = miniLaunchEmailAssetBuildScopePacket?.status
    ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopePacketStatus
    ?? (emailSequenceLane?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
      ? emailSequenceLane.sourceStatus
      : null);
  const miniLaunchEmailAssetBuildScopePacketReady = miniLaunchEmailAssetBuildScopePacketStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
    && (miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.canAskAlejandroForApproval
      ?? emailSequenceLane?.readiness?.canAskAlejandroForApproval
      ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopeCanAskApproval
      ?? false) === true
    && (miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.packetIsApprovalByItself
      ?? emailSequenceLane?.readiness?.packetIsApprovalByItself
      ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopePacketIsApprovalByItself
      ?? true) === false
    && (miniLaunchEmailAssetBuildScopePacket?.requestedFutureScope?.canExecuteBuildNow
      ?? emailSequenceLane?.readiness?.canExecuteBuildNow
      ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopeCanExecuteBuildNow
      ?? true) === false
    && (miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.readyForSeedSendNow
      ?? emailSequenceLane?.readiness?.readyForSeedSendNow
      ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopeReadyForSeedSend
      ?? true) === false
    && (miniLaunchEmailAssetBuildScopePacket?.safety?.mailerLiteApiCalled ?? false) === false
    && (miniLaunchEmailAssetBuildScopePacket?.safety?.mailerLiteAssetsCreatedOrEdited ?? false) === false
    && (miniLaunchEmailAssetBuildScopePacket?.safety?.sendsPerformed ?? false) === false;
  const miniLaunchEmailAssetBuildScopeAssetCount = miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.assetCount
    ?? emailSequenceLane?.readiness?.assetCount
    ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopeAssetCount
    ?? null;
  const miniLaunchEmailAssetBuildScopePlaceholderCount = miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.inertUrlPlaceholderCount
    ?? emailSequenceLane?.readiness?.placeholderCount
    ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopePlaceholderCount
    ?? null;
  const miniLaunchEmailAssetBuildScopeReplyCtaCount = miniLaunchEmailAssetBuildScopePacket?.executiveSummary?.replyCtaCount
    ?? emailSequenceLane?.readiness?.replyCtaCount
    ?? runbook?.currentState?.miniLaunch?.emailAssetBuildScopeReplyCtaCount
    ?? null;
  const miniLaunchEmailBuilderPayloadManifestStatus = miniLaunchEmailBuilderPayloadManifest?.status
    ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestStatus
    ?? (emailSequenceLane?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes'
      ? emailSequenceLane.sourceStatus
      : null);
  const miniLaunchEmailBuilderPayloadManifestReady = miniLaunchEmailBuilderPayloadManifestStatus === 'email_builder_payload_manifest_ready_no_live_changes'
    && (miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.canExecuteBuilderNow
      ?? emailSequenceLane?.readiness?.canExecuteBuilderNow
      ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestCanExecuteBuilderNow
      ?? true) === false
    && (miniLaunchEmailBuilderPayloadManifest?.approvalBoundary?.canSendNow
      ?? emailSequenceLane?.readiness?.readyForSeedSendNow
      ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestCanSendNow
      ?? true) === false
    && (miniLaunchEmailBuilderPayloadManifest?.approvalBoundary?.manifestIsApprovalByItself
      ?? emailSequenceLane?.readiness?.manifestIsApprovalByItself
      ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestIsApprovalByItself
      ?? true) === false
    && (miniLaunchEmailBuilderPayloadManifest?.safety?.mailerLiteApiCalled ?? false) === false
    && (miniLaunchEmailBuilderPayloadManifest?.safety?.mailerLiteAssetsCreatedOrEdited ?? false) === false
    && (miniLaunchEmailBuilderPayloadManifest?.safety?.sendsPerformed ?? false) === false;
  const miniLaunchEmailBuilderPayloadManifestPayloadCount = miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.payloadCount
    ?? emailSequenceLane?.readiness?.payloadCount
    ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestPayloadCount
    ?? null;
  const miniLaunchEmailBuilderPayloadManifestContentBlockCount = miniLaunchEmailBuilderPayloadManifest?.executiveSummary?.contentBlockCount
    ?? emailSequenceLane?.readiness?.contentBlockCount
    ?? runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestContentBlockCount
    ?? null;
  const miniLaunchEmailRenderQaStatus = miniLaunchEmailRenderQa?.status
    ?? runbook?.currentState?.miniLaunch?.emailRenderQaStatus
    ?? null;
  const miniLaunchEmailRenderQaReady = miniLaunchEmailRenderQaStatus === 'mini_launch_email_render_qa_green_no_live_changes'
    && (miniLaunchEmailRenderQa?.executiveSummary?.localRenderReady
      ?? runbook?.currentState?.miniLaunch?.emailRenderQaLocalRenderReady
      ?? false) === true
    && (miniLaunchEmailRenderQa?.executiveSummary?.publicUseReady
      ?? runbook?.currentState?.miniLaunch?.emailRenderQaPublicUseReady
      ?? true) === false
    && (miniLaunchEmailRenderQa?.executiveSummary?.seedSendReady
      ?? runbook?.currentState?.miniLaunch?.emailRenderQaSeedSendReady
      ?? true) === false
    && (miniLaunchEmailRenderQa?.safety?.mailerLiteApiCalled ?? false) === false
    && (miniLaunchEmailRenderQa?.safety?.sendsPerformed ?? false) === false
    && (miniLaunchEmailRenderQa?.safety?.crmLiveApiCalled ?? false) === false;
  const miniLaunchEmailRenderQaEmailCount = miniLaunchEmailRenderQa?.executiveSummary?.emailCount
    ?? runbook?.currentState?.miniLaunch?.emailRenderQaEmailCount
    ?? null;
  const miniLaunchEmailRenderQaRenderPreviewNonEmptyCount = miniLaunchEmailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount
    ?? runbook?.currentState?.miniLaunch?.emailRenderQaRenderPreviewNonEmptyCount
    ?? null;
  const miniLaunchManualUiBuildReceiptStatus = miniLaunchEmailManualUiBuildReceipt?.status ?? null;
  const miniLaunchManualUiDraftVisibleCount = (miniLaunchEmailManualUiBuildReceipt?.draftReceipts ?? [])
    .filter((draft) => draft?.status === 'draft_visible_in_mailerlite_drafts' && draft?.uiVisibleInDrafts === true)
    .length;
  const miniLaunchManualUiBuildClosed = miniLaunchManualUiBuildReceiptStatus === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && miniLaunchManualUiDraftVisibleCount === 4
    && miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.preferredBrowserUsed === 'Safari'
    && miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.editorRoute?.usedEditor === 'new_simple_editor'
    && miniLaunchEmailManualUiBuildReceipt?.safety?.mailerLiteUiDraftMutationsRecorded === true
    && miniLaunchEmailManualUiBuildReceipt?.safety?.sendsPerformed === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.schedulesCreated === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.subscribersReadOrAssigned === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.groupsCreatedOrAssigned === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.workflowMutationsPerformed === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.crmLiveApiCalledByThisReceipt === false
    && miniLaunchEmailManualUiBuildReceipt?.safety?.factStoreWritePerformed === false
    && (miniLaunchEmailManualUiBuildReceipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send');
  const repairPacket = miniLaunchEmailManualUiDraftRepairPacket ?? null;
  const repairPacketReady = repairPacket?.status === 'mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes'
    && repairPacket?.decision?.canAskAlejandroForApproval === true
    && repairPacket?.decision?.canRepairNow === false
    && repairPacket?.executiveSummary?.openLiveMutationGateCount === 0;
  const miniLaunchSeedTestQaStatus = miniLaunchSeedTestQaPacket?.status
    ?? runbook?.currentState?.miniLaunch?.seedTestQaPacketStatus
    ?? null;
  const miniLaunchSeedTestQaCanAskApprovalNow = miniLaunchSeedTestQaPacket?.readiness?.canAskSeedSendApprovalNow
    ?? runbook?.currentState?.miniLaunch?.seedTestQaCanAskApprovalNow
    ?? false;
  const miniLaunchSeedTestQaRealMailerLiteRenderReady = miniLaunchSeedTestQaPacket?.readiness?.realMailerLiteRenderQaReady
    ?? runbook?.currentState?.miniLaunch?.seedTestQaRealMailerLiteRenderQaReady
    ?? false;
  const miniLaunchSeedTestQaSeedRecipientSupplied = miniLaunchSeedTestQaPacket?.seedIdentity?.supplied
    ?? runbook?.currentState?.miniLaunch?.seedTestQaSeedRecipientSupplied
    ?? false;
  const miniLaunchSeedTestQaTargetGroupsExist = miniLaunchSeedTestQaPacket?.readiness?.targetGroupsExist
    ?? runbook?.currentState?.miniLaunch?.seedTestQaTargetGroupsExist
    ?? false;
  const miniLaunchSeedTestQaBlockers = miniLaunchSeedTestQaPacket?.readiness?.machineBlockersBeforeSeedSendApprovalRequest
    ?? runbook?.currentState?.miniLaunch?.seedTestQaBlockersBeforeApprovalRequest
    ?? [];
  const miniLaunchCrmWriteApprovalPacketStatus = miniLaunchCrmWriteApprovalPacket?.status
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalPacketStatus
    ?? null;
  const miniLaunchCrmWriteApprovalCanAskApproval = miniLaunchCrmWriteApprovalPacket?.approvalBoundary?.canAskAlejandroForApproval
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalCanAskApproval
    ?? false;
  const miniLaunchCrmWriteApprovalExactEventCount = miniLaunchCrmWriteApprovalPacket?.executiveSummary?.exactEventCountReady
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalExactEventCount
    ?? null;
  const miniLaunchCrmWriteApprovalExactPersonCount = miniLaunchCrmWriteApprovalPacket?.executiveSummary?.exactPersonCountReady
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalExactPersonCount
    ?? null;
  const miniLaunchCrmWriteApprovalCandidateFamilyCount = miniLaunchCrmWriteApprovalPacket?.executiveSummary?.candidateWriteFamilyCount
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalCandidateFamilyCount
    ?? null;
  const miniLaunchCrmWriteApprovalOperationsExecuted = miniLaunchCrmWriteApprovalPacket?.executiveSummary?.operationsExecuted
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalOperationsExecuted
    ?? null;
  const miniLaunchCrmWriteApprovalBlockers = miniLaunchCrmWriteApprovalPacket?.approvalBoundary?.blockersBeforeApprovalRequest
    ?? runbook?.currentState?.miniLaunch?.crmWriteApprovalBlockers
    ?? [];
  const miniLaunchCrmWritePolicyPacketReady = miniLaunchCrmWriteApprovalPacket?.executiveSummary?.writePolicyPacketReady
    ?? runbook?.currentState?.miniLaunch?.crmWritePolicyPacketReady
    ?? false;
  const miniLaunchCrmWritePolicyResolvedBlockers = miniLaunchCrmWriteApprovalPacket?.policyEffect?.resolvedPolicyBlockers
    ?? runbook?.currentState?.miniLaunch?.crmWritePolicyResolvedBlockers
    ?? [];
  const miniLaunchCrmWritePolicyOpenBlockers = miniLaunchCrmWriteApprovalPacket?.policyEffect?.policyBlockersStillOpen
    ?? runbook?.currentState?.miniLaunch?.crmWritePolicyOpenBlockers
    ?? [];
  const shopifyLocalBuildReceipt = miniLaunchShopifyLocalBuildReceipt ?? null;
  const shopifyLocalBuildClosed = shopifyLocalBuildReceipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes'
    && shopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated === 5
    && shopifyLocalBuildReceipt?.validation?.jsonTemplatesParsed === true
    && shopifyLocalBuildReceipt?.validation?.noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.validation?.noMailerLiteScriptsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.validation?.noShopifyAdminApiOrPublishCommandRun === true
    && shopifyLocalBuildReceipt?.validation?.noRealFormAction === true
    && shopifyLocalBuildReceipt?.validation?.noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.placeholders?.present === true
    && shopifyLocalBuildReceipt?.placeholders?.inert === true
    && shopifyLocalBuildReceipt?.safety?.shopifyApiCalled === false
    && shopifyLocalBuildReceipt?.safety?.shopifyPublishPerformed === false
    && shopifyLocalBuildReceipt?.safety?.realFormsCreated === false
    && shopifyLocalBuildReceipt?.safety?.mailerLiteApiCalled === false
    && shopifyLocalBuildReceipt?.safety?.crmLiveApiCalled === false;
  const approvalQueueStatus = approvalQueue?.status
    ?? runbook?.currentState?.approvalQueue?.status
    ?? null;
  const approvalQueueReadyCount = approvalQueue?.executiveSummary?.readyApprovalRequestCount
    ?? runbook?.currentState?.approvalQueue?.readyApprovalRequestCount
    ?? null;
  const approvalQueueBlockedCount = approvalQueue?.executiveSummary?.blockedApprovalRequestCount
    ?? runbook?.currentState?.approvalQueue?.blockedApprovalRequestCount
    ?? null;
  const approvalQueueOpenLiveGateCount = approvalQueue?.executiveSummary?.openLiveMutationGateCount
    ?? runbook?.currentState?.approvalQueue?.openLiveMutationGateCount
    ?? null;
  const approvalQueueNextBestHumanBoundary = approvalQueue?.executiveSummary?.nextBestHumanBoundary
    ?? runbook?.currentState?.approvalQueue?.nextBestHumanBoundary
    ?? null;
  const approvalQueueReady = approvalQueueStatus === 'mailerlite_launch_os_approval_queue_ready_no_live_changes'
    && Number.isInteger(approvalQueueReadyCount)
    && approvalQueueReadyCount >= 1
    && approvalQueueOpenLiveGateCount === 0;
  const blockedGateHandoffState = blockedGateHandoff ?? runbook?.currentState?.blockedGateHandoff ?? null;
  const blockedGateHandoffStatus = blockedGateHandoffState?.status ?? null;
  const blockedGateHandoffCanAskApprovalNow = blockedGateHandoffState?.executiveSummary?.canAskApprovalNow
    ?? blockedGateHandoffState?.canAskApprovalNow
    ?? null;
  const blockedGateHandoffInputNeededCount = blockedGateHandoffState?.executiveSummary?.inputNeededCount
    ?? blockedGateHandoffState?.inputNeededCount
    ?? null;
  const blockedGateHandoffOpenLiveGateCount = blockedGateHandoffState?.executiveSummary?.openLiveMutationGateCount
    ?? blockedGateHandoffState?.openLiveMutationGateCount
    ?? null;
  const blockedGateHandoffInputIds = (blockedGateHandoffState?.inputNeededNow ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const effectiveBlockedGateInputIds = blockedGateHandoffInputIds.length > 0
    ? blockedGateHandoffInputIds
    : blockedGateHandoffState?.inputNeededIds ?? [];
  const blockedGateHandoffGateIds = (blockedGateHandoffState?.blockedGates ?? [])
    .map((gate) => gate?.id)
    .filter(Boolean);
  const effectiveBlockedGateIds = blockedGateHandoffGateIds.length > 0
    ? blockedGateHandoffGateIds
    : blockedGateHandoffState?.blockedGateIds ?? [];
  const missingInputsKitState = missingInputsKit ?? runbook?.currentState?.missingInputsKit ?? null;
  const missingInputsKitStatus = missingInputsKitState?.status ?? null;
  const missingInputsKitInputCount = missingInputsKitState?.executiveSummary?.inputCount
    ?? missingInputsKitState?.inputCount
    ?? null;
  const missingInputsKitSeedInputCount = missingInputsKitState?.executiveSummary?.seedInputCount
    ?? missingInputsKitState?.seedInputCount
    ?? null;
  const missingInputsKitCrmInputCount = missingInputsKitState?.executiveSummary?.crmInputCount
    ?? missingInputsKitState?.crmInputCount
    ?? null;
  const missingInputsKitCanAskApprovalNow = missingInputsKitState?.executiveSummary?.canAskApprovalNow
    ?? missingInputsKitState?.canAskApprovalNow
    ?? null;
  const missingInputsKitCreatesPrivateFiles = missingInputsKitState?.executiveSummary?.kitCreatesPrivateFiles
    ?? missingInputsKitState?.kitCreatesPrivateFiles
    ?? null;
  const missingInputsKitAsksApproval = missingInputsKitState?.executiveSummary?.kitAsksApproval
    ?? missingInputsKitState?.kitAsksApproval
    ?? null;
  const missingInputsKitOpenLiveGateCount = missingInputsKitState?.executiveSummary?.openLiveMutationGateCount
    ?? missingInputsKitState?.openLiveMutationGateCount
    ?? null;
  const missingInputsKitInputIdsFromPacket = (missingInputsKitState?.inputRequests ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const missingInputsKitInputIds = missingInputsKitInputIdsFromPacket.length > 0
    ? missingInputsKitInputIdsFromPacket
    : missingInputsKitState?.inputIds ?? [];
  const missingInputsIntakeState = missingInputsIntake ?? runbook?.currentState?.missingInputsIntake ?? null;
  const missingInputsIntakeStatus = missingInputsIntakeState?.status ?? null;
  const missingInputsIntakeInputCount = missingInputsIntakeState?.executiveSummary?.inputCount
    ?? missingInputsIntakeState?.inputCount
    ?? null;
  const missingInputsIntakePresentInputCount = missingInputsIntakeState?.executiveSummary?.presentInputCount
    ?? missingInputsIntakeState?.presentInputCount
    ?? null;
  const missingInputsIntakeReadyInputCount = missingInputsIntakeState?.executiveSummary?.readyInputCount
    ?? missingInputsIntakeState?.readyInputCount
    ?? null;
  const missingInputsIntakeReadyForSeedApprovalPacket = missingInputsIntakeState?.executiveSummary?.readyForSeedApprovalPacket
    ?? missingInputsIntakeState?.readyForSeedApprovalPacket
    ?? null;
  const missingInputsIntakeReadyForCrmWritePacketRegeneration = missingInputsIntakeState?.executiveSummary?.readyForCrmWritePacketRegeneration
    ?? missingInputsIntakeState?.readyForCrmWritePacketRegeneration
    ?? null;
  const missingInputsIntakeReadyForCrmApprovalRequest = missingInputsIntakeState?.executiveSummary?.readyForCrmApprovalRequest
    ?? missingInputsIntakeState?.readyForCrmApprovalRequest
    ?? null;
  const missingInputsIntakeFactStoreReviewReady = missingInputsIntakeState?.executiveSummary?.factStoreReviewReady
    ?? missingInputsIntakeState?.factStoreReviewReady
    ?? null;
  const missingInputsIntakeCanAskApprovalNow = missingInputsIntakeState?.executiveSummary?.canAskApprovalNow
    ?? missingInputsIntakeState?.canAskApprovalNow
    ?? null;
  const missingInputsIntakeFullPrivateValuesStored = missingInputsIntakeState?.executiveSummary?.fullPrivateValuesStoredInReport
    ?? missingInputsIntakeState?.fullPrivateValuesStoredInReport
    ?? null;
  const missingInputsIntakeOpenLiveGateCount = missingInputsIntakeState?.executiveSummary?.openLiveMutationGateCount
    ?? missingInputsIntakeState?.openLiveMutationGateCount
    ?? null;
  const missingInputsIntakeNextSafeAction = missingInputsIntakeState?.executiveSummary?.nextSafeAction
    ?? missingInputsIntakeState?.nextSafeAction
    ?? null;
  const missingInputsIntakeBlockerIds = missingInputsIntakeState?.executiveSummary?.blockerIds
    ?? missingInputsIntakeState?.blockerIds
    ?? [];
  const missingInputsRequestBundleState = missingInputsRequestBundle ?? runbook?.currentState?.missingInputsRequestBundle ?? null;
  const missingInputsRequestBundleStatus = missingInputsRequestBundleState?.status ?? null;
  const missingInputsRequestBundleRequestCount = missingInputsRequestBundleState?.executiveSummary?.requestCount
    ?? missingInputsRequestBundleState?.requestCount
    ?? null;
  const missingInputsRequestBundleCopyBlocksReady = missingInputsRequestBundleState?.executiveSummary?.copyBlocksReady
    ?? missingInputsRequestBundleState?.copyBlocksReady
    ?? null;
  const missingInputsRequestBundleCreatesPrivateFiles = missingInputsRequestBundleState?.executiveSummary?.createsPrivateFiles
    ?? missingInputsRequestBundleState?.createsPrivateFiles
    ?? null;
  const missingInputsRequestBundleAsksApproval = missingInputsRequestBundleState?.executiveSummary?.asksApproval
    ?? missingInputsRequestBundleState?.asksApproval
    ?? null;
  const missingInputsRequestBundleCanAskApprovalNow = missingInputsRequestBundleState?.executiveSummary?.canAskApprovalNow
    ?? missingInputsRequestBundleState?.canAskApprovalNow
    ?? null;
  const missingInputsRequestBundleOpenLiveGateCount = missingInputsRequestBundleState?.executiveSummary?.openLiveMutationGateCount
    ?? missingInputsRequestBundleState?.openLiveMutationGateCount
    ?? null;
  const missingInputsRequestBundleRequestIdsFromPacket = (missingInputsRequestBundleState?.requests ?? [])
    .map((request) => request?.id)
    .filter(Boolean);
  const missingInputsRequestBundleRequestIds = missingInputsRequestBundleRequestIdsFromPacket.length > 0
    ? missingInputsRequestBundleRequestIdsFromPacket
    : missingInputsRequestBundleState?.requestIds ?? [];
  const privateInputTemplatePackState = privateInputTemplatePack ?? runbook?.currentState?.privateInputTemplatePack ?? null;
  const privateInputTemplatePackStatus = privateInputTemplatePackState?.status ?? null;
  const privateInputTemplatePackTemplateCount = privateInputTemplatePackState?.executiveSummary?.templateCount
    ?? privateInputTemplatePackState?.templateCount
    ?? null;
  const privateInputTemplatePackExampleFileCount = privateInputTemplatePackState?.executiveSummary?.exampleFileCount
    ?? privateInputTemplatePackState?.exampleFileCount
    ?? null;
  const privateInputTemplatePackActivePathCollisionCount = privateInputTemplatePackState?.executiveSummary?.activePathCollisionCount
    ?? privateInputTemplatePackState?.activePathCollisionCount
    ?? null;
  const privateInputTemplatePackCreatesActivePrivateInputFiles = privateInputTemplatePackState?.safety?.createsActivePrivateInputFiles
    ?? privateInputTemplatePackState?.createsActivePrivateInputFiles
    ?? null;
  const privateInputTemplatePackWritesRealPrivateValues = privateInputTemplatePackState?.safety?.writesRealPrivateValues
    ?? privateInputTemplatePackState?.writesRealPrivateValues
    ?? null;
  const privateInputTemplatePackCanAskApprovalNow = privateInputTemplatePackState?.executiveSummary?.canAskApprovalNow
    ?? privateInputTemplatePackState?.canAskApprovalNow
    ?? null;
  const privateInputTemplatePackOpenLiveGateCount = privateInputTemplatePackState?.executiveSummary?.openLiveMutationGateCount
    ?? privateInputTemplatePackState?.openLiveMutationGateCount
    ?? null;
  const continuationGuardState = continuationGuard ?? runbook?.currentState?.continuationGuard ?? null;
  const continuationGuardStatus = continuationGuardState?.status ?? null;
  const continuationGuardClosedBoundaryCount = continuationGuardState?.executiveSummary?.closedBoundaryCount
    ?? continuationGuardState?.closedBoundaryCount
    ?? null;
  const continuationGuardTrackedBoundaryCount = continuationGuardState?.executiveSummary?.trackedBoundaryCount
    ?? continuationGuardState?.trackedBoundaryCount
    ?? null;
  const continuationGuardOldUiWorkClosed = continuationGuardState?.executiveSummary?.oldUiWorkClosed
    ?? continuationGuardState?.oldUiWorkClosed
    ?? null;
  const continuationGuardActiveInputCount = continuationGuardState?.executiveSummary?.activeInputCount
    ?? continuationGuardState?.activeInputCount
    ?? null;
  const continuationGuardActiveInputIdsFromPacket = (continuationGuardState?.activeInputs ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const continuationGuardActiveInputIds = continuationGuardActiveInputIdsFromPacket.length > 0
    ? continuationGuardActiveInputIdsFromPacket
    : continuationGuardState?.activeInputIds ?? [];
  const continuationGuardUiWorkAction = continuationGuardState?.executiveSummary?.uiWorkAction
    ?? continuationGuardState?.uiWorkAction
    ?? null;
  const approvalIntakeStatus = approvalIntake?.status
    ?? runbook?.currentState?.approvalIntake?.status
    ?? null;
  const approvalIntakeExecutionAllowedNow = approvalIntake?.executiveSummary?.executionAllowedNow
    ?? runbook?.currentState?.approvalIntake?.executionAllowedNow
    ?? null;
  const approvalIntakeOpenLiveGateCount = approvalIntake?.executiveSummary?.openLiveMutationGateCount
    ?? runbook?.currentState?.approvalIntake?.openLiveMutationGateCount
    ?? null;
  const approvalIntakeReady = APPROVAL_INTAKE_READY_STATUSES.has(approvalIntakeStatus)
    && approvalIntakeExecutionAllowedNow === false
    && approvalIntakeOpenLiveGateCount === 0;
  const v2EmptyGroupsTargetCount = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.targetGroupCount
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsTargetCount
    ?? null;
  const v2EmptyGroupsLiveGroupsRead = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveGroupsRead
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsLiveGroupsRead
    ?? null;
  const v2EmptyGroupsLiveAutomationsRead = onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveAutomationsRead
    ?? onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveAutomationsRead
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsLiveAutomationsRead
    ?? null;
  const v2EmptyGroupsCreateDryRunCreatedCount = onboardingV2EmptyGroupsCreateDryRun?.createdGroups?.length
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsCreateDryRunCreatedCount
    ?? null;
  const v2EmptyGroupsPacketCanAskApproval = onboardingV2EmptyGroupsPacket?.approvalGate?.canAskAlejandroForApproval
    ?? false;
  const v2EmptyGroupsPacketReady = onboardingV2EmptyGroupsPacket?.status === 'ready_for_exact_human_approval_to_create_empty_groups'
    && (onboardingV2EmptyGroupsPacket?.sourceEvidence?.targetGroupCount ?? v2EmptyGroupsTargetCount) === 12
    && (onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveGroupsRead ?? v2EmptyGroupsLiveGroupsRead) >= 75
    && (onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveAutomationsRead ?? v2EmptyGroupsLiveAutomationsRead) >= 13
    && (onboardingV2EmptyGroupsPacket?.blockers?.length ?? 0) === 0
    && v2EmptyGroupsPacketCanAskApproval === true
    && onboardingV2EmptyGroupsPacket?.safety?.readOnly === true
    && onboardingV2EmptyGroupsPacket?.safety?.mailerLiteApiCalled === true
    && onboardingV2EmptyGroupsPacket?.safety?.groupMutationsPerformed === false
    && onboardingV2EmptyGroupsPacket?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsPacket?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsPacket?.safety?.sendsPerformed === false;
  const v2EmptyGroupsCreateDryRunReady = onboardingV2EmptyGroupsCreateDryRun?.status === 'dry_run_ready_for_exact_approval'
    && onboardingV2EmptyGroupsCreateDryRun?.mode === 'dry_run'
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount === 12
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length === 0
    && v2EmptyGroupsCreateDryRunCreatedCount === 0
    && onboardingV2EmptyGroupsCreateDryRun?.decision?.canExecute === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.mode === 'dry_run_only'
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.groupMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.sendsPerformed === false;
  const v2EmptyGroupsPostExecutionAllExist = onboardingV2EmptyGroupsCreateDryRun?.status === 'dry_run_blocked'
    && onboardingV2EmptyGroupsCreateDryRun?.mode === 'dry_run'
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount === 12
    && onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead >= 89
    && (onboardingV2EmptyGroupsCreateDryRun?.decision?.targetPlan ?? []).length === 12
    && onboardingV2EmptyGroupsCreateDryRun.decision.targetPlan.every((target) => target?.existsInFreshScan === true)
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.mode === 'dry_run_only'
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.groupMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsCreateDryRun?.safety?.sendsPerformed === false;
  const v2EmptyGroupsExecutionCompleted = onboardingV2EmptyGroupsExecution?.status === 'executed_onboarding_v2_empty_group_creation'
    && onboardingV2EmptyGroupsExecution?.mode === 'execute_requested'
    && onboardingV2EmptyGroupsExecution?.createdGroups?.length === 12
    && onboardingV2EmptyGroupsExecution?.decision?.approval?.status === 'exact_approval_phrase_matched'
    && onboardingV2EmptyGroupsExecution?.safety?.groupMutationType === 'create_empty_groups_only'
    && onboardingV2EmptyGroupsExecution?.safety?.workflowMutationsPerformed === false
    && onboardingV2EmptyGroupsExecution?.safety?.subscriberRowsRead === false
    && onboardingV2EmptyGroupsExecution?.safety?.subscriberAssignmentsPerformed === false
    && onboardingV2EmptyGroupsExecution?.safety?.sendsPerformed === false;
  const v2EmptyGroupsAlreadyClosed = (v2EmptyGroupsExecutionCompleted && v2EmptyGroupsPostExecutionAllExist)
    || runbook?.currentState?.onboarding?.v2EmptyGroupsLifecycleStatus === 'executed_and_verified_all_targets_exist_no_live_followup';
  const v2EmptyGroupsBlockerCount = v2EmptyGroupsAlreadyClosed
    ? 0
    : onboardingV2EmptyGroupsPacket?.blockers?.length
      ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length
      ?? runbook?.currentState?.onboarding?.v2EmptyGroupsBlockerCount
      ?? null;
  const v2EmptyGroupsCanAskApproval = v2EmptyGroupsAlreadyClosed
    ? false
    : v2EmptyGroupsPacketCanAskApproval
      || runbook?.currentState?.onboarding?.v2EmptyGroupsCanAskApproval
      || false;
  const v2EmptyGroupsBoundaryClosed = v2EmptyGroupsCreateDryRunReady
    || v2EmptyGroupsPostExecutionAllExist
    || v2EmptyGroupsExecutionCompleted
    || v2EmptyGroupsAlreadyClosed;
  const v2FirstEmailMapped = onboardingV2FirstEmailMap?.status === 'first_email_mapping_ready_no_sent_receipt'
    && onboardingV2FirstEmailMap?.decision?.recommendedPosture === 'welcome_orientation_no_sent_receipt'
    && onboardingV2FirstEmailMap?.decision?.recommendedMailerLiteSentGroup === null
    && onboardingV2FirstEmailMap?.decision?.createNewSentGroup === false
    && onboardingV2FirstEmailMap?.v2ImplementationGuidance?.crmSignals?.[0]?.event === 'journey_welcome_sent'
    && onboardingV2FirstEmailMap?.safety?.mailerLiteApiCalled === false
    && onboardingV2FirstEmailMap?.safety?.brandHubMutationsPerformed === false
    && onboardingV2FirstEmailMap?.safety?.crmCardMutationsPerformed === false
    && onboardingV2FirstEmailMap?.safety?.subscriberRowsRead === false
    && onboardingV2FirstEmailMap?.safety?.workflowMutationsPerformed === false
    && onboardingV2FirstEmailMap?.safety?.sendsPerformed === false;
  const v2DesignProven = onboardingV2Design?.status
    && onboardingV2Execution?.status
    && onboardingV2EventContract?.status
    && v2EmptyGroupsPacketReady
    && v2EmptyGroupsBoundaryClosed
    && v2FirstEmailMapped;
  const validationPassed = validationStatus === 'passed' || receiptPassed;
  const effectiveValidationStatus = validationStatus === 'passed'
    ? 'passed'
    : receiptPassed
      ? 'passed'
      : validationStatus;
  const effectiveValidationSummary = validationSummary
    ?? validationReceipt?.validationSummary
    ?? null;
  const handoffTargetGroup = onboardingHandoffPolicy?.targetGroups?.eligible ?? null;
  const handoffReady = onboardingHandoffPolicy?.status === 'mini_launch_onboarding_handoff_policy_ready_no_live_changes';
  const handoffV1Protected = onboardingHandoffPolicy?.v1Protection?.productionV1Protected === true;
  const handoffRecommendationIsNotRouting = onboardingHandoffPolicy?.operatorRule === 'Recommendation is not routing. Routing requires a later exact approval and a fresh protected workflow/subscriber scan.'
    || onboardingHandoffPolicy?.contractCoverage?.handoffEventProjectionPosture?.includes('recommendation is not routing')
    || (onboardingHandoffPolicy?.handoffLadder ?? []).some((step) => step.action === 'recommend_onboarding_handoff'
      && step.currentAllowedState === 'store_only_event_contract');
  const handoffLiveClosed = onboardingHandoffPolicy?.safety?.mailerLiteApiCalled === false
    && onboardingHandoffPolicy?.safety?.subscriberMutationsPerformed === false
    && onboardingHandoffPolicy?.safety?.workflowMutationsPerformed === false
    && onboardingHandoffPolicy?.safety?.signalLedgerAppendPerformed === false
    && onboardingHandoffPolicy?.safety?.crmCardMutationsPerformed === false
    && onboardingHandoffPolicy?.safety?.sendsPerformed === false;
  const handoffGateClosed = (onboardingHandoffPolicy?.approvalBoundary?.closedNow ?? [])
    .some((item) => item.includes('Assign any subscriber to onboarding eligibility'))
    && (onboardingHandoffPolicy?.approvalBoundary?.closedNow ?? [])
      .some((item) => item.includes('Attach mini-launch participants to active onboarding v1'));
  const handoffPolicyProven = handoffReady
    && handoffTargetGroup === 'CC · Journey · Editorial onboarding · Eligible'
    && handoffV1Protected
    && handoffRecommendationIsNotRouting
    && handoffLiveClosed
    && handoffGateClosed;
  const brujulaEmailStyleQaStatus = brujulaEmailStyleQa?.status ?? null;
  const brujulaEmailStyleQaReady = brujulaEmailStyleQaStatus === 'brujula_email_style_qa_yellow_no_live_changes'
    && brujulaEmailStyleQa?.executiveSummary?.functionalStatus === 'green_test_delivery_verified'
    && brujulaEmailStyleQa?.executiveSummary?.publicUseReady === false
    && brujulaEmailStyleQa?.safety?.mailerLiteApiCalled === false
    && brujulaEmailStyleQa?.safety?.sendsPerformed === false;
  const brujulaEmailStyleCorrectionStatus = brujulaEmailStyleCorrection?.status ?? null;
  const brujulaCorrectionReady = brujulaEmailStyleCorrectionStatus === 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes'
    && brujulaEmailStyleCorrection?.executiveSummary?.publicUseReady === false
    && brujulaEmailStyleCorrection?.executiveSummary?.testSendReady === false
    && brujulaEmailStyleCorrection?.safety?.mailerLiteApiCalled === false
    && brujulaEmailStyleCorrection?.safety?.sendsPerformed === false;
  const brujulaEmailRenderQaStatus = brujulaEmailRenderQa?.status ?? null;
  const brujulaRenderQaReady = brujulaEmailRenderQaStatus === 'brujula_email1_local_render_qa_green_no_live_changes'
    && brujulaEmailRenderQa?.executiveSummary?.localRenderReady === true
    && brujulaEmailRenderQa?.executiveSummary?.renderPreviewNonEmpty === true
    && brujulaEmailRenderQa?.executiveSummary?.publicUseReady === false
    && brujulaEmailRenderQa?.executiveSummary?.testSendReady === false
    && brujulaEmailRenderQa?.safety?.mailerLiteApiCalled === false
    && brujulaEmailRenderQa?.safety?.sendsPerformed === false
    && brujulaEmailRenderQa?.safety?.workflowMutationsPerformed === false
    && brujulaEmailRenderQa?.safety?.factStoreWritePerformed === false;
  const brujulaRealMailerLiteRenderQaStatus = brujulaRealMailerLiteRenderQa?.status ?? null;
  const brujulaRealMailerLiteRenderReady = brujulaRealMailerLiteRenderQaStatus === 'brujula_email1_real_mailerlite_render_qa_green_no_live_changes'
    && brujulaRealMailerLiteRenderQa?.executiveSummary?.realMailerLiteRenderReady === true
    && brujulaRealMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact === true
    && brujulaRealMailerLiteRenderQa?.executiveSummary?.allSafetyGatesClosed === true
    && brujulaRealMailerLiteRenderQa?.executiveSummary?.testSendReady === false
    && brujulaRealMailerLiteRenderQa?.safety?.mailerLiteMutationsPerformed === false
    && brujulaRealMailerLiteRenderQa?.safety?.sendsPerformed === false
    && brujulaRealMailerLiteRenderQa?.safety?.subscriberMutationsPerformed === false
    && brujulaRealMailerLiteRenderQa?.safety?.groupsCreatedOrAssigned === false
    && brujulaRealMailerLiteRenderQa?.safety?.workflowMutationsPerformed === false
    && brujulaRealMailerLiteRenderQa?.safety?.factStoreWritePerformed === false;
  const brujulaManualUiBuildClosed = brujulaManualUiReceiptClosed(brujulaEmailManualUiBuildReceipt);

  return [
    {
      id: 'protect_productive_onboarding_v1',
      requirement: 'Preserve the productive onboarding while the Launch OS is built.',
      status: v1Protected ? 'proven' : 'not_proven',
      evidence: [
        `workflow=${onboardingV1Audit?.workflow?.name ?? 'unknown'}`,
        `enabled=${onboardingV1Audit?.workflow?.enabled}`,
        `complete=${onboardingV1Audit?.workflow?.complete}`,
        `broken=${onboardingV1Audit?.workflow?.broken}`,
        `recommendedPath=${onboardingV1Audit?.migrationRecommendation?.option ?? 'unknown'}`,
        `trunkMapStatus=${onboardingTrunkMap?.status ?? runbook?.currentState?.onboarding?.trunkMapStatus ?? 'missing'}`,
        `trunkSequenceItems=${onboardingTrunkMap?.executiveSummary?.sequenceItems ?? runbook?.currentState?.onboarding?.trunkMapSequenceItems ?? 'unknown'}`,
      ],
      remaining: v1Protected
        ? ['Keep v1 untouched until a later exact approval names a workflow action.']
        : ['Re-run onboarding v1 audit before any further onboarding work.'],
    },
    {
      id: 'design_onboarding_v2',
      requirement: 'Design Onboarding v2 without touching production v1.',
      status: v2DesignProven
        ? 'proven'
        : 'partial',
      evidence: [
        `designStatus=${onboardingV2Design?.status ?? 'missing'}`,
        `executionStatus=${onboardingV2Execution?.status ?? 'missing'}`,
        `eventContractStatus=${onboardingV2EventContract?.status ?? 'missing'}`,
        `eventCount=${onboardingV2EventContract?.eventContract?.length ?? onboardingV2EventContract?.normalizationProof?.eventsGenerated ?? 'unknown'}`,
        `emptyGroupsLifecycleStatus=${runbook?.currentState?.onboarding?.v2EmptyGroupsLifecycleStatus ?? (v2EmptyGroupsAlreadyClosed ? 'executed_and_verified_all_targets_exist_no_live_followup' : 'pre_execution')}`,
        `emptyGroupsPacketStatus=${onboardingV2EmptyGroupsPacket?.status ?? runbook?.currentState?.onboarding?.v2EmptyGroupsPacketStatus ?? 'missing'}`,
        `emptyGroupsTargetCount=${v2EmptyGroupsTargetCount ?? 'unknown'}`,
        `emptyGroupsLiveGroupsRead=${v2EmptyGroupsLiveGroupsRead ?? 'unknown'}`,
        `emptyGroupsLiveAutomationsRead=${v2EmptyGroupsLiveAutomationsRead ?? 'unknown'}`,
        `emptyGroupsCanAskApproval=${v2EmptyGroupsCanAskApproval}`,
        `emptyGroupsBlockerCount=${v2EmptyGroupsBlockerCount ?? 'unknown'}`,
        `emptyGroupsExecutionStatus=${onboardingV2EmptyGroupsExecution?.status ?? runbook?.currentState?.onboarding?.v2EmptyGroupsExecutionStatus ?? 'missing'}`,
        `emptyGroupsExecutedCount=${onboardingV2EmptyGroupsExecution?.createdGroups?.length ?? runbook?.currentState?.onboarding?.v2EmptyGroupsExecutedCount ?? 'unknown'}`,
        `emptyGroupsExecutionCompleted=${v2EmptyGroupsExecutionCompleted}`,
        `emptyGroupsCreateDryRunStatus=${onboardingV2EmptyGroupsCreateDryRun?.status ?? runbook?.currentState?.onboarding?.v2EmptyGroupsCreateDryRunStatus ?? 'missing'}`,
        `emptyGroupsCreateDryRunCreatedCount=${v2EmptyGroupsCreateDryRunCreatedCount ?? 'unknown'}`,
        `emptyGroupsPacketReady=${v2EmptyGroupsPacketReady}`,
        `emptyGroupsCreateDryRunReady=${v2EmptyGroupsCreateDryRunReady}`,
        `emptyGroupsPostExecutionAllExist=${v2EmptyGroupsPostExecutionAllExist}`,
        `emptyGroupsBoundaryClosed=${v2EmptyGroupsBoundaryClosed}`,
        `firstEmailMapStatus=${onboardingV2FirstEmailMap?.status ?? runbook?.currentState?.onboarding?.v2FirstEmailMapStatus ?? 'missing'}`,
        `firstEmailPosture=${onboardingV2FirstEmailMap?.decision?.recommendedPosture ?? runbook?.currentState?.onboarding?.v2FirstEmailRecommendedPosture ?? 'unknown'}`,
        `firstEmailSentGroup=${onboardingV2FirstEmailMap?.decision?.recommendedMailerLiteSentGroup ?? runbook?.currentState?.onboarding?.v2FirstEmailRecommendedSentGroup ?? 'none'}`,
        `firstEmailCreateNewSentGroup=${onboardingV2FirstEmailMap?.decision?.createNewSentGroup ?? runbook?.currentState?.onboarding?.v2FirstEmailCreateNewSentGroup ?? 'unknown'}`,
        `firstEmailCrmSignal=${onboardingV2FirstEmailMap?.v2ImplementationGuidance?.crmSignals?.[0]?.event ?? runbook?.currentState?.onboarding?.v2FirstEmailCrmSignal ?? 'unknown'}`,
        `firstEmailMapped=${v2FirstEmailMapped}`,
      ],
      remaining: [
        v2EmptyGroupsBoundaryClosed
          ? 'The 12 empty v2 groups now exist; do not rerun group creation for this boundary.'
          : 'Creating the 12 empty v2 groups remains a separate exact-approval lane.',
        'Workflow draft, seed test and production switch remain closed.',
      ],
    },
    {
      id: 'consolidate_taxonomy_receipts',
      requirement: 'Consolidate groups/tags/receipts with Brand Hub as canon and CRM as derived operator cache.',
      status: brandTaxonomy.includes('CC · Source') && brandDictionary.includes('CC ·')
        ? brandCandidateDecisionClosed && launchGroupDryRunReady
          ? 'partial_ready_no_live'
          : 'partial'
        : 'not_proven',
      evidence: [
        `brandTaxonomyChars=${brandTaxonomy.length}`,
        `brandDictionaryChars=${brandDictionary.length}`,
        `runbookCommandCount=${runbook?.commandCatalog?.length ?? 0}`,
        `brandAcceptedLaunchGroupCandidates=${brandAcceptedLaunchGroupCandidates}`,
        `brandCandidateDecisionClosed=${brandCandidateDecisionClosed}`,
        `groupDryRunReadyForFutureEmptyGroupDecision=${launchGroupDryRunReady}`,
        `launchGroupsAlreadyExist=${launchGroupsAlreadyExist}`,
        `brandCandidateAcceptedGroupCount=${brandCandidateGroupsLane?.readiness?.acceptedGroupCount ?? 'unknown'}`,
        `groupDryRunStatus=${groupDryRunLane?.sourceStatus ?? 'missing'}`,
        `reconciliationActions=${reconciliationActions.map((action) => action.id).join(',') || 'none'}`,
      ],
      remaining: brandCandidateDecisionClosed && launchGroupDryRunReady
        ? launchGroupsAlreadyExist
          ? [
          'Launch Source/Delivered names are represented, dry-run validated and already live as empty MailerLite groups; this creation boundary is closed.',
          'Sent groups for follow-up sequence remain off by default unless Brand canonizes reusable content.',
        ]
          : [
          'Launch Source/Delivered names are represented and dry-run validated; live empty-group creation remains a separate exact approval boundary.',
          'Sent groups for follow-up sequence remain off by default unless Brand canonizes reusable content.',
        ]
        : brandAcceptedLaunchGroupCandidates
        ? [
          'Represent the Brand-accepted launch candidates in the local/canonical planning surface before any creation request.',
          'Rerun the launch group dry-run; this can only unlock a decision packet, not group creation.',
        ]
        : [
          'Brand still needs to accept, rename or reject the two launch-specific candidate groups.',
          'After Brand response, rerun the launch group dry-run before any group creation approval exists.',
        ],
    },
    {
      id: 'prepare_frequent_mini_launch_infrastructure',
      requirement: 'Prepare reusable infrastructure for frequent mini-launches, including cadence and WIP limits.',
      status: readyNoLiveLaneCount >= 8 && packageHas(packageJson, 'crm:vnext:mailerlite-mini-launch-cadence-board')
        ? 'partial_ready_no_live'
        : 'partial',
      evidence: [
        `readinessState=${readinessState ?? 'unknown'}`,
        `readyNoLiveLaneCount=${readyNoLiveLaneCount}`,
        `cadence=${runbook?.currentState?.miniLaunch?.cadenceNow ?? 'unknown'}`,
        `safeToIntakeOneMoreNoLiveIdea=${runbook?.currentState?.miniLaunch?.safeToIntakeOneMoreNoLiveIdea}`,
        `miniLaunchEmptyGroupApprovalPacketStatus=${emptyGroupApprovalLane?.sourceStatus ?? runbook?.currentState?.miniLaunch?.emptyGroupApprovalPacketStatus ?? 'missing'}`,
        `miniLaunchEmptyGroupApprovalPacketReady=${emptyGroupApprovalPacketReady}`,
        `miniLaunchEmptyGroupApprovalTargetCount=${emptyGroupApprovalLane?.readiness?.targetGroupCount ?? runbook?.currentState?.miniLaunch?.emptyGroupApprovalPacketTargetCount ?? 'unknown'}`,
        `miniLaunchEmptyGroupCreateDryRunStatus=${miniLaunchEmptyGroupCreateDryRunStatus ?? 'missing'}`,
        `miniLaunchEmptyGroupCreateDryRunReady=${miniLaunchEmptyGroupCreateDryRunReady}`,
        `miniLaunchEmptyGroupCreateDryRunNoCreateNeeded=${miniLaunchEmptyGroupCreateDryRunNoCreateNeeded}`,
        `miniLaunchEmptyGroupCreateDryRunTargetExistingCount=${miniLaunchEmptyGroupCreateDryRunTargetExistingCount}`,
        `miniLaunchEmptyGroupCreateDryRunTargetMissingCount=${miniLaunchEmptyGroupCreateDryRunTargetMissingCount}`,
        `miniLaunchEmptyGroupCreateDryRunCreatedCount=${miniLaunchEmptyGroupCreateDryRunCreatedCount}`,
        `departmentReviewsAccepted=${pendingDepartments.length === 0 && finalizationReadyForIntake === true}`,
        `webAcceptedScopedLocalDraft=${webAcceptedScopedLocalDraft}`,
        `crmAcceptedSignalBoundaries=${crmAcceptedSignalBoundaries}`,
        `miniLaunchEmailStyleQaStatus=${miniLaunchEmailStyleQaStatus ?? 'missing'}`,
        `miniLaunchEmailStyleQaReadyForLocalAssetPlan=${miniLaunchEmailStyleQaReadyForLocalAssetPlan}`,
        `miniLaunchEmailStyleQaReadyForMailerLiteBuild=${miniLaunchEmailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow ?? emailSequenceLane?.readiness?.readyForMailerLiteAssetBuildNow ?? runbook?.currentState?.miniLaunch?.emailStyleQaReadyForMailerLiteBuild ?? 'unknown'}`,
        `miniLaunchEmailStyleQaReadyForSeedSend=${miniLaunchEmailStyleQaPacket?.approvalGate?.readyForSeedSendNow ?? emailSequenceLane?.readiness?.readyForSeedSendNow ?? runbook?.currentState?.miniLaunch?.emailStyleQaReadyForSeedSend ?? 'unknown'}`,
        `miniLaunchEmailStyleQaHardBlockerCount=${miniLaunchEmailStyleQaHardBlockerCount ?? 'unknown'}`,
        `miniLaunchEmailStyleQaYellowCheckCount=${miniLaunchEmailStyleQaYellowCheckCount ?? 'unknown'}`,
        `miniLaunchLocalEmailAssetPlanStatus=${miniLaunchLocalEmailAssetPlanStatus ?? 'missing'}`,
        `miniLaunchLocalEmailAssetPlanReady=${miniLaunchLocalEmailAssetPlanReady}`,
        `miniLaunchLocalEmailAssetPlanAssetCount=${miniLaunchLocalEmailAssetPlanAssetCount ?? 'unknown'}`,
        `miniLaunchLocalEmailAssetPlanPlaceholderCount=${miniLaunchLocalEmailAssetPlanPlaceholderCount ?? 'unknown'}`,
        `miniLaunchLocalEmailAssetPlanReadyForMailerLiteBuild=${miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForMailerLiteAssetBuildNow ?? emailSequenceLane?.readiness?.readyForMailerLiteAssetBuildNow ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanReadyForMailerLiteBuild ?? 'unknown'}`,
        `miniLaunchLocalEmailAssetPlanReadyForSeedSend=${miniLaunchLocalEmailAssetPlan?.approvalBoundary?.readyForSeedSendNow ?? emailSequenceLane?.readiness?.readyForSeedSendNow ?? runbook?.currentState?.miniLaunch?.localEmailAssetPlanReadyForSeedSend ?? 'unknown'}`,
        `miniLaunchEmailAssetBuildScopePacketStatus=${miniLaunchEmailAssetBuildScopePacketStatus ?? 'missing'}`,
        `miniLaunchEmailAssetBuildScopePacketReady=${miniLaunchEmailAssetBuildScopePacketReady}`,
        `miniLaunchEmailAssetBuildScopeAssetCount=${miniLaunchEmailAssetBuildScopeAssetCount ?? 'unknown'}`,
        `miniLaunchEmailAssetBuildScopePlaceholderCount=${miniLaunchEmailAssetBuildScopePlaceholderCount ?? 'unknown'}`,
        `miniLaunchEmailAssetBuildScopeReplyCtaCount=${miniLaunchEmailAssetBuildScopeReplyCtaCount ?? 'unknown'}`,
        `miniLaunchEmailBuilderPayloadManifestStatus=${miniLaunchEmailBuilderPayloadManifestStatus ?? 'missing'}`,
        `miniLaunchEmailBuilderPayloadManifestReady=${miniLaunchEmailBuilderPayloadManifestReady}`,
        `miniLaunchEmailBuilderPayloadManifestPayloadCount=${miniLaunchEmailBuilderPayloadManifestPayloadCount ?? 'unknown'}`,
        `miniLaunchEmailBuilderPayloadManifestContentBlockCount=${miniLaunchEmailBuilderPayloadManifestContentBlockCount ?? 'unknown'}`,
        `miniLaunchEmailRenderQaStatus=${miniLaunchEmailRenderQaStatus ?? 'missing'}`,
        `miniLaunchEmailRenderQaReady=${miniLaunchEmailRenderQaReady}`,
        `miniLaunchEmailRenderQaEmailCount=${miniLaunchEmailRenderQaEmailCount ?? 'unknown'}`,
        `miniLaunchEmailRenderQaRenderPreviewNonEmptyCount=${miniLaunchEmailRenderQaRenderPreviewNonEmptyCount ?? 'unknown'}`,
        `miniLaunchManualUiBuildReceiptStatus=${miniLaunchManualUiBuildReceiptStatus ?? 'missing'}`,
        `miniLaunchManualUiDraftVisibleCount=${miniLaunchManualUiDraftVisibleCount}`,
        `miniLaunchManualUiBuildClosed=${miniLaunchManualUiBuildClosed}`,
        `miniLaunchManualUiEditor=${miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.editorRoute?.usedEditor ?? 'unknown'}`,
        `miniLaunchManualUiCustomHtmlStatus=${miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.editorRoute?.customHtmlEditorStatus ?? 'unknown'}`,
        `miniLaunchManualUiPlanObserved=${miniLaunchEmailManualUiBuildReceipt?.uiEvidence?.mailerLiteAccountPlanObserved ?? 'unknown'}`,
        `miniLaunchManualUiDraftRepairPacketStatus=${repairPacket?.status ?? runbook?.currentState?.miniLaunch?.emailManualUiDraftRepairPacketStatus ?? 'missing'}`,
        `miniLaunchManualUiDraftRepairReady=${repairPacketReady || runbook?.currentState?.miniLaunch?.emailManualUiDraftRepairCanAskApproval === true}`,
        `miniLaunchManualUiDraftRepairTargetCount=${repairPacket?.executiveSummary?.targetDraftCount ?? runbook?.currentState?.miniLaunch?.emailManualUiDraftRepairTargetCount ?? 'unknown'}`,
        `miniLaunchManualUiDraftRepairMissingFragmentCount=${repairPacket?.executiveSummary?.missingFragmentCount ?? runbook?.currentState?.miniLaunch?.emailManualUiDraftRepairMissingFragmentCount ?? 'unknown'}`,
        `miniLaunchSeedTestQaStatus=${miniLaunchSeedTestQaStatus ?? 'missing'}`,
        `miniLaunchSeedTestQaCanAskApprovalNow=${miniLaunchSeedTestQaCanAskApprovalNow}`,
        `miniLaunchSeedTestQaRealMailerLiteRenderReady=${miniLaunchSeedTestQaRealMailerLiteRenderReady}`,
        `miniLaunchSeedTestQaSeedRecipientSupplied=${miniLaunchSeedTestQaSeedRecipientSupplied}`,
        `miniLaunchSeedTestQaTargetGroupsExist=${miniLaunchSeedTestQaTargetGroupsExist}`,
        `miniLaunchSeedTestQaBlockers=${miniLaunchSeedTestQaBlockers.join('|') || 'none'}`,
        `miniLaunchCrmWriteApprovalPacketStatus=${miniLaunchCrmWriteApprovalPacketStatus ?? 'missing'}`,
        `miniLaunchCrmWriteApprovalCanAskApproval=${miniLaunchCrmWriteApprovalCanAskApproval}`,
        `miniLaunchCrmWriteApprovalExactEventCount=${miniLaunchCrmWriteApprovalExactEventCount ?? 'unknown'}`,
        `miniLaunchCrmWriteApprovalExactPersonCount=${miniLaunchCrmWriteApprovalExactPersonCount ?? 'unknown'}`,
        `miniLaunchCrmWriteApprovalCandidateFamilyCount=${miniLaunchCrmWriteApprovalCandidateFamilyCount ?? 'unknown'}`,
        `miniLaunchCrmWriteApprovalOperationsExecuted=${miniLaunchCrmWriteApprovalOperationsExecuted ?? 'unknown'}`,
        `miniLaunchCrmWriteApprovalBlockers=${miniLaunchCrmWriteApprovalBlockers.join('|') || 'none'}`,
        `miniLaunchCrmWritePolicyPacketReady=${miniLaunchCrmWritePolicyPacketReady}`,
        `miniLaunchCrmWritePolicyResolvedBlockers=${miniLaunchCrmWritePolicyResolvedBlockers.join('|') || 'none'}`,
        `miniLaunchCrmWritePolicyOpenBlockers=${miniLaunchCrmWritePolicyOpenBlockers.join('|') || 'none'}`,
        `shopifyLocalBuildReceiptStatus=${shopifyLocalBuildReceipt?.status ?? 'missing'}`,
        `shopifyLocalBuildClosed=${shopifyLocalBuildClosed}`,
        `shopifyLocalBuildFileCount=${shopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated ?? 'unknown'}`,
        `shopifyLocalBuildNoPublish=${shopifyLocalBuildReceipt?.safety?.shopifyPublishPerformed === false}`,
        `shopifyLocalBuildNoApi=${shopifyLocalBuildReceipt?.safety?.shopifyApiCalled === false}`,
        `shopifyLocalBuildNoRealForms=${shopifyLocalBuildReceipt?.safety?.realFormsCreated === false}`,
        `approvalQueueStatus=${approvalQueueStatus ?? 'missing'}`,
        `approvalQueueReadyCount=${approvalQueueReadyCount ?? 'unknown'}`,
        `approvalQueueBlockedCount=${approvalQueueBlockedCount ?? 'unknown'}`,
        `approvalQueueOpenLiveGateCount=${approvalQueueOpenLiveGateCount ?? 'unknown'}`,
        `approvalQueueNextBestHumanBoundary=${approvalQueueNextBestHumanBoundary ?? 'none'}`,
        `blockedGateHandoffStatus=${blockedGateHandoffStatus ?? 'missing'}`,
        `blockedGateHandoffCanAskApprovalNow=${blockedGateHandoffCanAskApprovalNow ?? 'unknown'}`,
        `blockedGateHandoffInputNeededCount=${blockedGateHandoffInputNeededCount ?? 'unknown'}`,
        `blockedGateHandoffInputIds=${effectiveBlockedGateInputIds.join('|') || 'none'}`,
        `blockedGateHandoffGateIds=${effectiveBlockedGateIds.join('|') || 'none'}`,
        `missingInputsKitStatus=${missingInputsKitStatus ?? 'missing'}`,
        `missingInputsKitInputCount=${missingInputsKitInputCount ?? 'unknown'}`,
        `missingInputsKitSeedInputCount=${missingInputsKitSeedInputCount ?? 'unknown'}`,
        `missingInputsKitCrmInputCount=${missingInputsKitCrmInputCount ?? 'unknown'}`,
        `missingInputsKitCanAskApprovalNow=${missingInputsKitCanAskApprovalNow ?? 'unknown'}`,
        `missingInputsKitCreatesPrivateFiles=${missingInputsKitCreatesPrivateFiles ?? 'unknown'}`,
        `missingInputsKitAsksApproval=${missingInputsKitAsksApproval ?? 'unknown'}`,
        `missingInputsKitOpenLiveGateCount=${missingInputsKitOpenLiveGateCount ?? 'unknown'}`,
        `missingInputsKitInputIds=${missingInputsKitInputIds.join('|') || 'none'}`,
        `missingInputsIntakeStatus=${missingInputsIntakeStatus ?? 'missing'}`,
        `missingInputsIntakeInputCount=${missingInputsIntakeInputCount ?? 'unknown'}`,
        `missingInputsIntakePresentInputCount=${missingInputsIntakePresentInputCount ?? 'unknown'}`,
        `missingInputsIntakeReadyInputCount=${missingInputsIntakeReadyInputCount ?? 'unknown'}`,
        `missingInputsIntakeReadyForSeedApprovalPacket=${missingInputsIntakeReadyForSeedApprovalPacket ?? 'unknown'}`,
        `missingInputsIntakeReadyForCrmWritePacketRegeneration=${missingInputsIntakeReadyForCrmWritePacketRegeneration ?? 'unknown'}`,
        `missingInputsIntakeReadyForCrmApprovalRequest=${missingInputsIntakeReadyForCrmApprovalRequest ?? 'unknown'}`,
        `missingInputsIntakeFactStoreReviewReady=${missingInputsIntakeFactStoreReviewReady ?? 'unknown'}`,
        `missingInputsIntakeCanAskApprovalNow=${missingInputsIntakeCanAskApprovalNow ?? 'unknown'}`,
        `missingInputsIntakeFullPrivateValuesStored=${missingInputsIntakeFullPrivateValuesStored ?? 'unknown'}`,
        `missingInputsIntakeOpenLiveGateCount=${missingInputsIntakeOpenLiveGateCount ?? 'unknown'}`,
        `missingInputsIntakeBlockerIds=${missingInputsIntakeBlockerIds.join('|') || 'none'}`,
        `missingInputsRequestBundleStatus=${missingInputsRequestBundleStatus ?? 'missing'}`,
        `missingInputsRequestBundleRequestCount=${missingInputsRequestBundleRequestCount ?? 'unknown'}`,
        `missingInputsRequestBundleCopyBlocksReady=${missingInputsRequestBundleCopyBlocksReady ?? 'unknown'}`,
        `missingInputsRequestBundleCreatesPrivateFiles=${missingInputsRequestBundleCreatesPrivateFiles ?? 'unknown'}`,
        `missingInputsRequestBundleAsksApproval=${missingInputsRequestBundleAsksApproval ?? 'unknown'}`,
        `missingInputsRequestBundleCanAskApprovalNow=${missingInputsRequestBundleCanAskApprovalNow ?? 'unknown'}`,
        `missingInputsRequestBundleOpenLiveGateCount=${missingInputsRequestBundleOpenLiveGateCount ?? 'unknown'}`,
        `missingInputsRequestBundleRequestIds=${missingInputsRequestBundleRequestIds.join('|') || 'none'}`,
        `privateInputTemplatePackStatus=${privateInputTemplatePackStatus ?? 'missing'}`,
        `privateInputTemplatePackTemplateCount=${privateInputTemplatePackTemplateCount ?? 'unknown'}`,
        `privateInputTemplatePackExampleFileCount=${privateInputTemplatePackExampleFileCount ?? 'unknown'}`,
        `privateInputTemplatePackActivePathCollisionCount=${privateInputTemplatePackActivePathCollisionCount ?? 'unknown'}`,
        `privateInputTemplatePackCreatesActivePrivateInputFiles=${privateInputTemplatePackCreatesActivePrivateInputFiles ?? 'unknown'}`,
        `privateInputTemplatePackWritesRealPrivateValues=${privateInputTemplatePackWritesRealPrivateValues ?? 'unknown'}`,
        `privateInputTemplatePackCanAskApprovalNow=${privateInputTemplatePackCanAskApprovalNow ?? 'unknown'}`,
        `privateInputTemplatePackOpenLiveGateCount=${privateInputTemplatePackOpenLiveGateCount ?? 'unknown'}`,
        `continuationGuardStatus=${continuationGuardStatus ?? 'missing'}`,
        `continuationGuardClosedBoundaryCount=${continuationGuardClosedBoundaryCount ?? 'unknown'}`,
        `continuationGuardTrackedBoundaryCount=${continuationGuardTrackedBoundaryCount ?? 'unknown'}`,
        `continuationGuardOldUiWorkClosed=${continuationGuardOldUiWorkClosed ?? 'unknown'}`,
        `continuationGuardActiveInputCount=${continuationGuardActiveInputCount ?? 'unknown'}`,
        `continuationGuardActiveInputIds=${continuationGuardActiveInputIds.join('|') || 'none'}`,
        `continuationGuardUiWorkAction=${continuationGuardUiWorkAction ?? 'unknown'}`,
        `approvalIntakeStatus=${approvalIntakeStatus ?? 'missing'}`,
        `approvalIntakeExecutionAllowedNow=${approvalIntakeExecutionAllowedNow ?? 'unknown'}`,
        `approvalIntakeOpenLiveGateCount=${approvalIntakeOpenLiveGateCount ?? 'unknown'}`,
      ],
      remaining: pendingDepartments.length === 0 && finalizationReadyForIntake === true
        ? [
          emptyGroupApprovalPacketReady
            ? miniLaunchEmptyGroupCreateDryRunNoCreateNeeded
              ? 'Current pilot has its two mini-launch Source/Delivered groups already present; do not rerun empty-group creation.'
              : 'Current pilot is paused at the exact empty-group approval boundary; no MailerLite group creation is authorized yet.'
            : shopifyLocalBuildClosed
              ? 'Current pilot has its Shopify no-live local files built; any preview, publish or form connection remains a separate approval boundary.'
              : 'Current pilot can continue through no-live moves: group dry-run, exact empty-group approval packet, scoped Shopify local-build request and CRM signal projection packet.',
          miniLaunchManualUiBuildClosed
            ? 'The four mini-launch drafts already exist in MailerLite Drafts via approved manual UI build; use the seed/test QA packet next because seed/test send remains blocked by real MailerLite render QA, exact seed recipient, and exact send approval.'
            : miniLaunchEmailStyleQaReadyForLocalAssetPlan
            ? miniLaunchEmailBuilderPayloadManifestReady
              ? approvalQueueReady
                ? 'Email builder payload manifest is ready and the approval queue now centralizes exact human boundaries; MailerLite builder execution, seed send, workflows and subscribers remain closed until exact approval.'
                : 'Email builder payload manifest is ready as local implementation input only; MailerLite builder execution, seed send, workflows and subscribers remain closed until exact approval.'
              : miniLaunchEmailAssetBuildScopePacketReady
              ? 'Email asset-build scope packet is ready for exact human approval request only; next no-live move is the local builder payload manifest; MailerLite builder execution, seed send, workflows and subscribers remain closed.'
              : miniLaunchLocalEmailAssetPlanReady
              ? 'Local email asset plan is ready for exact MailerLite asset-build scope packet/request only; MailerLite asset build and seed send remain closed.'
              : 'Email Style QA is ready for local asset planning only; MailerLite asset build and seed send remain closed.'
            : 'Email Style QA must be generated before local asset planning becomes a reliable next step.',
          miniLaunchCrmWriteApprovalPacketStatus
            ? miniLaunchCrmWritePolicyPacketReady
              ? 'CRM write approval packet exists as the current boundary and the CRM write policy packet is ready/consumed; CRM writes still cannot be requested until real observed events, exact people, aggregate review/facts and one future exact write approval are supplied.'
              : 'CRM write approval packet exists as the current boundary; CRM writes still cannot be requested until real observed events, exact people and one write family are supplied.'
            : 'CRM signal projection remains no-live; build the CRM write approval packet before asking for any ledger/card/scoring/Fact Store write approval.',
          'Every-3-days cadence stays inactive until rehearsals and seed tests prove throughput.',
        ]
        : [
          'Current pilot is not ready for live operation until department reviews are accepted.',
          'Every-3-days cadence stays inactive until rehearsals and seed tests prove throughput.',
        ],
    },
    {
      id: 'define_mini_launch_to_onboarding_handoff',
      requirement: 'Define how mini-launch signals can recommend onboarding without routing subscribers or touching production v1.',
      status: handoffPolicyProven ? 'proven' : 'partial',
      evidence: [
        `handoffPolicyStatus=${onboardingHandoffPolicy?.status ?? 'missing'}`,
        `handoffTargetGroup=${handoffTargetGroup ?? 'missing'}`,
        `trunkHandoffTarget=${onboardingTrunkMap?.executiveSummary?.futureHandoffTarget ?? runbook?.currentState?.onboarding?.trunkMapFutureHandoffTarget ?? 'missing'}`,
        `trunkRecommendationIsRouting=${onboardingTrunkMap?.executiveSummary?.recommendationIsRouting ?? runbook?.currentState?.onboarding?.trunkMapRecommendationIsRouting ?? 'unknown'}`,
        `productionV1Protected=${handoffV1Protected}`,
        `recommendationIsNotRouting=${handoffRecommendationIsNotRouting}`,
        `liveClosed=${handoffLiveClosed}`,
        `routingGateClosed=${handoffGateClosed}`,
      ],
      remaining: handoffPolicyProven
        ? ['Keep recommendation separate from routing until a later exact approval names cohort, group and workflow posture.']
        : ['Regenerate or repair the mini-launch to onboarding handoff policy before any launch routing design.'],
    },
    {
      id: 'coordinate_brand_web_crm',
      requirement: 'Coordinate Brand Hub, Web Design and CRM through clear handoffs and review responses.',
      status: pendingDepartments.length > 0 || finalizationReadyForIntake === false
        ? 'blocked_waiting_department_final_responses'
        : 'proven',
      evidence: [
        `reconciliationStatus=${reconciliationBoard?.status ?? 'missing'}`,
        `pendingDepartments=${pendingDepartments.join(',') || 'none'}`,
        `workspacePendingDepartments=${workspacePendingDepartments.join(',') || 'none'}`,
        `packetCount=${runbook?.currentState?.miniLaunch?.packetCount ?? 'unknown'}`,
        `responseWorkspaceStatus=${responseWorkspaceStatus ?? 'missing'}`,
        `readyForResponseIntake=${readyForResponseIntake}`,
        `finalizationStatus=${finalizationStatus ?? 'missing'}`,
        `finalizationReadyForIntake=${finalizationReadyForIntake}`,
        `requestBundleStatus=${requestBundleStatus ?? 'missing'}`,
        `requestBundleRequestCount=${requestBundleRequestCount ?? 'unknown'}`,
        `requestBundleAwaitingFinalCount=${requestBundleAwaitingFinalCount ?? 'unknown'}`,
        `responseWatcherStatus=${responseWatcherStatus ?? 'missing'}`,
        `responseWatcherMissingFinalCount=${responseWatcherMissingFinalCount ?? 'unknown'}`,
        `responseWatcherFinalFilePresentCount=${responseWatcherFinalFilePresentCount ?? 'unknown'}`,
        `responseWatcherNextBestMove=${responseWatcherNextBestMove ?? 'unknown'}`,
        `acceptedFinalDepartments=${acceptedFinalDepartments.join(',') || 'none'}`,
        `draftAssistDepartments=${draftAssistDepartments.join(',') || 'none'}`,
        `pendingReadyDepartments=${pendingReadyDepartments.join(',') || 'none'}`,
        `awaitingFinalDepartments=${awaitingFinalDepartments.join(',') || 'none'}`,
      ],
      remaining: pendingDepartments.length > 0 || finalizationReadyForIntake === false
        ? ['Collect final Brand, Web Design and CRM no-live review responses through the response workspace; drafts and pending templates are not final responses.']
        : ['Run reconciliation after any later response change.'],
    },
    {
      id: 'document_reports_and_operator_surface',
      requirement: 'Document the system with clear reports and an operator surface.',
      status: runbook?.status === 'mailerlite_launch_os_operator_runbook_ready_no_live_changes'
        ? 'proven'
        : 'partial',
      evidence: [
        `runbookStatus=${runbook?.status ?? 'missing'}`,
        `scenarioCount=${runbook?.operatingScenarios?.length ?? 0}`,
        `approvalMatrixCount=${runbook?.approvalMatrix?.length ?? 0}`,
        `approvalQueueStatus=${approvalQueueStatus ?? 'missing'}`,
        `approvalQueueReadyCount=${approvalQueueReadyCount ?? 'unknown'}`,
        `approvalQueueOpenLiveGateCount=${approvalQueueOpenLiveGateCount ?? 'unknown'}`,
        `approvalIntakeStatus=${approvalIntakeStatus ?? 'missing'}`,
        `approvalIntakeReady=${approvalIntakeReady}`,
        `blockedGateHandoffStatus=${blockedGateHandoffStatus ?? 'missing'}`,
        `blockedGateHandoffCanAskApprovalNow=${blockedGateHandoffCanAskApprovalNow ?? 'unknown'}`,
        `blockedGateHandoffInputNeededCount=${blockedGateHandoffInputNeededCount ?? 'unknown'}`,
        `missingInputsKitStatus=${missingInputsKitStatus ?? 'missing'}`,
        `missingInputsKitInputCount=${missingInputsKitInputCount ?? 'unknown'}`,
        `missingInputsKitCanAskApprovalNow=${missingInputsKitCanAskApprovalNow ?? 'unknown'}`,
        `missingInputsKitCreatesPrivateFiles=${missingInputsKitCreatesPrivateFiles ?? 'unknown'}`,
        `missingInputsKitAsksApproval=${missingInputsKitAsksApproval ?? 'unknown'}`,
        `missingInputsIntakeStatus=${missingInputsIntakeStatus ?? 'missing'}`,
        `missingInputsIntakeReadyInputCount=${missingInputsIntakeReadyInputCount ?? 'unknown'}`,
        `missingInputsIntakePresentInputCount=${missingInputsIntakePresentInputCount ?? 'unknown'}`,
        `missingInputsIntakeCanAskApprovalNow=${missingInputsIntakeCanAskApprovalNow ?? 'unknown'}`,
        `missingInputsIntakeFullPrivateValuesStored=${missingInputsIntakeFullPrivateValuesStored ?? 'unknown'}`,
        `missingInputsIntakeNextSafeAction=${missingInputsIntakeNextSafeAction ?? 'unknown'}`,
        `missingInputsRequestBundleStatus=${missingInputsRequestBundleStatus ?? 'missing'}`,
        `missingInputsRequestBundleRequestCount=${missingInputsRequestBundleRequestCount ?? 'unknown'}`,
        `missingInputsRequestBundleCopyBlocksReady=${missingInputsRequestBundleCopyBlocksReady ?? 'unknown'}`,
        `missingInputsRequestBundleCreatesPrivateFiles=${missingInputsRequestBundleCreatesPrivateFiles ?? 'unknown'}`,
        `missingInputsRequestBundleAsksApproval=${missingInputsRequestBundleAsksApproval ?? 'unknown'}`,
        `missingInputsRequestBundleCanAskApprovalNow=${missingInputsRequestBundleCanAskApprovalNow ?? 'unknown'}`,
        `privateInputTemplatePackStatus=${privateInputTemplatePackStatus ?? 'missing'}`,
        `privateInputTemplatePackExampleFileCount=${privateInputTemplatePackExampleFileCount ?? 'unknown'}`,
        `privateInputTemplatePackCreatesActivePrivateInputFiles=${privateInputTemplatePackCreatesActivePrivateInputFiles ?? 'unknown'}`,
        `privateInputTemplatePackWritesRealPrivateValues=${privateInputTemplatePackWritesRealPrivateValues ?? 'unknown'}`,
        `privateInputTemplatePackCanAskApprovalNow=${privateInputTemplatePackCanAskApprovalNow ?? 'unknown'}`,
        `continuationGuardStatus=${continuationGuardStatus ?? 'missing'}`,
        `continuationGuardClosedBoundaryCount=${continuationGuardClosedBoundaryCount ?? 'unknown'}`,
        `continuationGuardOldUiWorkClosed=${continuationGuardOldUiWorkClosed ?? 'unknown'}`,
        `continuationGuardUiWorkAction=${continuationGuardUiWorkAction ?? 'unknown'}`,
        `trunkMapReady=${trunkMapReady}`,
        `requestBundleStatus=${requestBundleStatus ?? 'missing'}`,
        `responseWatcherStatus=${responseWatcherStatus ?? 'missing'}`,
        `brujulaEmailStyleQaStatus=${brujulaEmailStyleQaStatus ?? 'missing'}`,
        `brujulaEmailStyleCorrectionStatus=${brujulaEmailStyleCorrectionStatus ?? 'missing'}`,
      ],
      remaining: [
        'Keep regenerating the runbook after accepted department reviews or new dry-runs.',
      ],
    },
    {
      id: 'validate_with_dry_runs_and_tests',
      requirement: 'Validate with dry-runs, tests and clean commits before live actions.',
      status: packageHas(packageJson, 'crm:vnext:mailerlite-launch-os-operator-runbook')
        && packageHas(packageJson, 'crm:vnext:mailerlite-onboarding-v2-event-contract')
        ? validationPassed ? 'proven' : 'partial_current_turn_tests_required'
        : 'partial',
      evidence: [
        `groupDryRunStatus=${readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_group_dry_run')?.sourceStatus ?? 'unknown'}`,
        `emptyGroupApprovalPacketStatus=${emptyGroupApprovalLane?.sourceStatus ?? runbook?.currentState?.miniLaunch?.emptyGroupApprovalPacketStatus ?? 'unknown'}`,
        `emptyGroupApprovalPacketReady=${emptyGroupApprovalPacketReady}`,
        `emptyGroupCreateDryRunStatus=${miniLaunchEmptyGroupCreateDryRunStatus ?? 'unknown'}`,
        `emptyGroupCreateDryRunReady=${miniLaunchEmptyGroupCreateDryRunReady}`,
        `emptyGroupCreateDryRunNoCreateNeeded=${miniLaunchEmptyGroupCreateDryRunNoCreateNeeded}`,
        `liveMutationGateOpenCount=${liveMutationGateOpenCount}`,
        `hasGoalAuditScript=${packageHas(packageJson, 'crm:vnext:mailerlite-launch-os-goal-audit')}`,
        `validationStatus=${effectiveValidationStatus}`,
        `validationSummary=${effectiveValidationSummary ?? 'not supplied'}`,
        `validationReceiptStatus=${validationReceipt?.status ?? 'missing'}`,
        `validationReceiptTestFiles=${validationReceipt?.testScope?.testFiles ?? 'unknown'}`,
        `validationReceiptTestCount=${validationReceipt?.testScope?.testCount ?? 'unknown'}`,
      ],
      remaining: validationPassed
        ? ['Repeat focused tests after future Launch OS edits.', 'Commit only Launch OS files; leave unrelated ManyChat work out.']
        : ['Run focused tests after this audit script is added.', 'Commit only Launch OS files; leave unrelated ManyChat work out.'],
    },
    {
      id: 'enforce_live_change_approval_boundary',
      requirement: 'Stop before any live MailerLite, Shopify, CRM, workflow, subscriber or send action.',
      status: openLiveGates === 0 ? 'proven' : 'not_proven',
      evidence: [
        `openLiveGateCount=${openLiveGates}`,
        `runbookMailerLiteApiCalled=${runbook?.safety?.mailerLiteApiCalled}`,
        `runbookMutationsPerformed=${runbook?.safety?.mutationsPerformed}`,
        `runbookSendsPerformed=${runbook?.safety?.sendsPerformed}`,
        `approvalQueueOpenLiveGateCount=${approvalQueueOpenLiveGateCount ?? 'unknown'}`,
        `approvalIntakeStatus=${approvalIntakeStatus ?? 'missing'}`,
        `approvalIntakeExecutionAllowedNow=${approvalIntakeExecutionAllowedNow ?? 'unknown'}`,
        `approvalIntakeOpenLiveGateCount=${approvalIntakeOpenLiveGateCount ?? 'unknown'}`,
        `blockedGateHandoffOpenLiveGateCount=${blockedGateHandoffOpenLiveGateCount ?? 'unknown'}`,
        `blockedGateHandoffCanAskApprovalNow=${blockedGateHandoffCanAskApprovalNow ?? 'unknown'}`,
      ],
      remaining: openLiveGates === 0
        ? ['Maintain exact approval gates for every live or live-adjacent action.']
        : ['Close live gates before proceeding.'],
    },
    {
      id: 'brujula_test_pilot_status',
      requirement: 'Keep Brújula as controlled proving ground, not a public launch.',
      status: brujulaManualUiBuildClosed && brujulaRealMailerLiteRenderReady
        ? 'partial_functional_green_corrected_draft_real_mailerlite_render_green_needs_test_send_approval'
        : brujulaManualUiBuildClosed
        ? 'partial_functional_green_corrected_draft_built_in_mailerlite_needs_render_qa_and_test_send_approval'
        : brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence && brujulaEmailStyleQaReady && brujulaCorrectionReady && brujulaRenderQaReady
        ? 'partial_functional_green_corrected_draft_render_checked_needs_mailerlite_builder_qa'
        : brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence && brujulaEmailStyleQaReady && brujulaCorrectionReady
        ? 'partial_functional_green_corrected_draft_ready_needs_render_qa'
        : brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence && brujulaEmailStyleQaReady
          ? 'partial_functional_green_creative_qa_packet_ready'
        : brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence
          ? 'partial_functional_green_creative_yellow'
        : 'partial',
      evidence: [
        `assignedGroups=${groups.join(' | ') || 'none'}`,
        `currentWorkflowOffOrIncomplete=${brujulaPlan?.localEvidence?.brujulaState?.currentWorkflowOffOrIncomplete}`,
        `creativeAntiEvidence=${Boolean(brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence)}`,
        `emailStyleQaStatus=${brujulaEmailStyleQaStatus ?? 'missing'}`,
        `emailStyleQaFunctionalStatus=${brujulaEmailStyleQa?.executiveSummary?.functionalStatus ?? 'unknown'}`,
        `emailStyleQaBlockerCount=${brujulaEmailStyleQa?.executiveSummary?.blockerCount ?? 'unknown'}`,
        `emailStyleQaPublicUseReady=${brujulaEmailStyleQa?.executiveSummary?.publicUseReady ?? 'unknown'}`,
        `emailStyleCorrectionStatus=${brujulaEmailStyleCorrectionStatus ?? 'missing'}`,
        `emailStyleCorrectionHtml=${brujulaEmailStyleCorrection?.outputs?.htmlPath ?? 'missing'}`,
        `emailStyleCorrectionPublicUseReady=${brujulaEmailStyleCorrection?.executiveSummary?.publicUseReady ?? 'unknown'}`,
        `emailStyleCorrectionTestSendReady=${brujulaEmailStyleCorrection?.executiveSummary?.testSendReady ?? 'unknown'}`,
        `emailRenderQaStatus=${brujulaEmailRenderQaStatus ?? 'missing'}`,
        `emailRenderQaLocalRenderReady=${brujulaEmailRenderQa?.executiveSummary?.localRenderReady ?? 'unknown'}`,
        `emailRenderQaPreviewNonEmpty=${brujulaEmailRenderQa?.executiveSummary?.renderPreviewNonEmpty ?? 'unknown'}`,
        `emailRenderQaPreview=${brujulaEmailRenderQa?.renderPreview?.path ?? 'missing'}`,
        `emailRenderQaPreviewSize=${brujulaEmailRenderQa?.renderPreview?.fileSizeBytes ?? 'unknown'}`,
        `emailRenderQaPublicUseReady=${brujulaEmailRenderQa?.executiveSummary?.publicUseReady ?? 'unknown'}`,
        `realMailerLiteRenderQaStatus=${brujulaRealMailerLiteRenderQaStatus ?? 'missing'}`,
        `realMailerLiteRenderReady=${brujulaRealMailerLiteRenderQa?.executiveSummary?.realMailerLiteRenderReady ?? 'unknown'}`,
        `realMailerLiteRenderExactContent=${brujulaRealMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact ?? 'unknown'}`,
        `realMailerLiteRenderSafetyClosed=${brujulaRealMailerLiteRenderQa?.executiveSummary?.allSafetyGatesClosed ?? 'unknown'}`,
        `realMailerLiteRenderBlockerCount=${brujulaRealMailerLiteRenderQa?.executiveSummary?.blockerCount ?? 'unknown'}`,
        `manualUiBuildReceiptStatus=${brujulaEmailManualUiBuildReceipt?.status ?? 'missing'}`,
        `manualUiCampaignId=${brujulaManualUiReceiptCampaignId(brujulaEmailManualUiBuildReceipt) ?? 'missing'}`,
        `manualUiOutboxCount=${brujulaManualUiReceiptOutboxCount(brujulaEmailManualUiBuildReceipt) ?? 'unknown'}`,
        `manualUiBuildClosed=${brujulaManualUiBuildClosed}`,
      ],
      remaining: [
        brujulaManualUiBuildClosed
          ? brujulaRealMailerLiteRenderReady
            ? 'Real MailerLite render QA is green for the Brújula draft; before any test send/public use, still require exact recipient and exact approval.'
            : 'Use the Brújula manual UI build receipt as current draft evidence; before any test send/public use, require real MailerLite render QA on the live draft, exact recipient and exact approval.'
          : brujulaRenderQaReady
          ? 'Build/apply the corrected draft in MailerLite only after exact approval, verify real MailerLite render/test-only send, and keep Brújula non-public until Brand email style QA is green.'
          : 'Run local render QA first, then build/apply the corrected draft in MailerLite only after exact approval, rerun real render QA/test-only send, and keep Brújula non-public until Brand email style QA is green.',
      ],
    },
  ];
};

const summarizeCompletion = (requirements) => {
  const proven = requirements.filter((item) => item.status === 'proven').length;
  const partial = requirements.filter((item) => item.status.startsWith('partial')).length;
  const blocked = requirements.filter((item) => item.status.startsWith('blocked')).length;
  const notProven = requirements.filter((item) => item.status === 'not_proven').length;
  const readyForLiveOperation = notProven === 0 && blocked === 0 && partial === 0;
  return {
    requirementCount: requirements.length,
    provenCount: proven,
    partialCount: partial,
    blockedCount: blocked,
    notProvenCount: notProven,
    readyForLiveOperation,
    overallStatus: readyForLiveOperation
      ? 'goal_complete_ready_for_live_operation'
      : 'goal_active_not_ready_for_live_operation',
  };
};

const buildGoalAudit = ({
  values,
  sourceDigests,
  validationStatus = 'not_supplied',
  validationSummary = null,
  generatedAt = new Date().toISOString(),
}) => {
  const requirements = buildRequirementChecks({
    ...values,
    validationStatus,
    validationSummary,
  });
  const summary = summarizeCompletion(requirements);
  const coordinationRequirement = requirements.find((requirement) => requirement.id === 'coordinate_brand_web_crm');
  const departmentResponsesAccepted = coordinationRequirement?.status === 'proven';
  const emptyGroupApprovalPacketReady = values.readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_empty_group_approval_packet')?.readyNow === true
    || values.runbook?.currentState?.miniLaunch?.emptyGroupApprovalPacketReady === true;
  const emptyGroupCreateDryRunStatus = values.miniLaunchEmptyGroupCreateDryRun?.status
    ?? values.readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_empty_group_create_dry_run')?.sourceStatus
    ?? values.runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunStatus
    ?? null;
  const emptyGroupCreateDryRunNoCreateNeeded = emptyGroupCreateDryRunStatus === 'dry_run_no_create_needed_targets_already_exist';
  const emptyGroupCreateDryRunReady = values.readinessBoard?.lanes?.find((lane) => lane.id === 'mailerlite_empty_group_create_dry_run')?.readyNow === true
    || values.miniLaunchEmptyGroupCreateDryRun?.status === 'dry_run_ready_for_exact_approval'
    || values.miniLaunchEmptyGroupCreateDryRun?.status === 'dry_run_no_create_needed_targets_already_exist'
    || values.runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunStatus === 'dry_run_ready_for_exact_approval'
    || values.runbook?.currentState?.miniLaunch?.emptyGroupCreateDryRunStatus === 'dry_run_no_create_needed_targets_already_exist';
  const localEmailAssetPlanReady = values.miniLaunchLocalEmailAssetPlan?.status === 'mini_launch_local_email_asset_plan_ready_no_live_changes'
    || values.runbook?.currentState?.miniLaunch?.localEmailAssetPlanReady === true
    || values.readinessBoard?.lanes?.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'mini_launch_local_email_asset_plan_ready_no_live_changes';
  const emailAssetBuildScopePacketReady = values.miniLaunchEmailAssetBuildScopePacket?.status === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
    || values.runbook?.currentState?.miniLaunch?.emailAssetBuildScopePacketReady === true
    || values.readinessBoard?.lanes?.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes';
  const emailBuilderPayloadManifestReady = values.miniLaunchEmailBuilderPayloadManifest?.status === 'email_builder_payload_manifest_ready_no_live_changes'
    || values.runbook?.currentState?.miniLaunch?.emailBuilderPayloadManifestReady === true
    || values.readinessBoard?.lanes?.find((lane) => lane.id === 'email_sequence')?.sourceStatus === 'email_builder_payload_manifest_ready_no_live_changes';
  const emailRenderQaReady = values.miniLaunchEmailRenderQa?.status === 'mini_launch_email_render_qa_green_no_live_changes'
    || values.runbook?.currentState?.miniLaunch?.emailRenderQaLocalRenderReady === true;
  const manualUiBuildReceipt = values.miniLaunchEmailManualUiBuildReceipt ?? null;
  const manualUiDraftVisibleCount = (manualUiBuildReceipt?.draftReceipts ?? [])
    .filter((draft) => draft?.status === 'draft_visible_in_mailerlite_drafts' && draft?.uiVisibleInDrafts === true)
    .length;
  const manualUiBuildClosed = manualUiBuildReceipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && manualUiDraftVisibleCount === 4
    && manualUiBuildReceipt?.safety?.sendsPerformed === false
    && manualUiBuildReceipt?.safety?.schedulesCreated === false
    && manualUiBuildReceipt?.safety?.subscribersReadOrAssigned === false
    && manualUiBuildReceipt?.safety?.groupsCreatedOrAssigned === false
    && manualUiBuildReceipt?.safety?.workflowMutationsPerformed === false
    && manualUiBuildReceipt?.safety?.factStoreWritePerformed === false
    && (manualUiBuildReceipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send');
  const shopifyLocalBuildReceipt = values.miniLaunchShopifyLocalBuildReceipt ?? null;
  const shopifyLocalBuildClosed = shopifyLocalBuildReceipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes'
    && shopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated === 5
    && shopifyLocalBuildReceipt?.validation?.jsonTemplatesParsed === true
    && shopifyLocalBuildReceipt?.validation?.noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.validation?.noMailerLiteScriptsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.validation?.noShopifyAdminApiOrPublishCommandRun === true
    && shopifyLocalBuildReceipt?.validation?.noRealFormAction === true
    && shopifyLocalBuildReceipt?.validation?.noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles === true
    && shopifyLocalBuildReceipt?.placeholders?.present === true
    && shopifyLocalBuildReceipt?.placeholders?.inert === true
    && shopifyLocalBuildReceipt?.safety?.shopifyApiCalled === false
    && shopifyLocalBuildReceipt?.safety?.shopifyPublishPerformed === false
    && shopifyLocalBuildReceipt?.safety?.realFormsCreated === false
    && shopifyLocalBuildReceipt?.safety?.mailerLiteApiCalled === false
    && shopifyLocalBuildReceipt?.safety?.crmLiveApiCalled === false;
  const brujulaManualUiBuildReceipt = values.brujulaEmailManualUiBuildReceipt ?? null;
  const brujulaManualUiBuildClosed = brujulaManualUiReceiptClosed(brujulaManualUiBuildReceipt);
  const onboardingV2GroupBoundaryClosed = values.approvalQueue?.approvalItems?.find((item) => item.id === 'onboarding_v2_empty_group_creation')?.status === 'reference_only_no_approval_request_now'
    || values.runbook?.currentState?.onboarding?.v2EmptyGroupsLifecycleStatus === 'executed_and_verified_all_targets_exist_no_live_followup';
  const approvalQueueReady = values.approvalQueue?.status === 'mailerlite_launch_os_approval_queue_ready_no_live_changes'
    || values.runbook?.currentState?.approvalQueue?.status === 'mailerlite_launch_os_approval_queue_ready_no_live_changes';
  const approvalQueueMove = approvalQueueReady
    ? 'Use the Launch OS approval queue as the single local map of exact approval phrases; it cannot approve or execute any operation by itself.'
    : 'Generate the Launch OS approval queue so exact approval boundaries are visible in one local surface.';
  const blockedGateHandoffState = values.blockedGateHandoff ?? values.runbook?.currentState?.blockedGateHandoff ?? null;
  const blockedGateHandoffStatus = blockedGateHandoffState?.status ?? null;
  const blockedGateHandoffCanAskApprovalNow = blockedGateHandoffState?.executiveSummary?.canAskApprovalNow
    ?? blockedGateHandoffState?.canAskApprovalNow
    ?? null;
  const blockedGateHandoffInputIdsFromPacket = (blockedGateHandoffState?.inputNeededNow ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const blockedGateHandoffInputIds = blockedGateHandoffInputIdsFromPacket.length > 0
    ? blockedGateHandoffInputIdsFromPacket
    : blockedGateHandoffState?.inputNeededIds ?? [];
  const blockedGateHandoffGateIdsFromPacket = (blockedGateHandoffState?.blockedGates ?? [])
    .map((gate) => gate?.id)
    .filter(Boolean);
  const blockedGateHandoffGateIds = blockedGateHandoffGateIdsFromPacket.length > 0
    ? blockedGateHandoffGateIdsFromPacket
    : blockedGateHandoffState?.blockedGateIds ?? [];
  const blockedGateHandoffMove = blockedGateHandoffStatus === 'blocked_gate_handoff_ready_no_live_changes'
    ? `Use the Launch OS blocked-gate handoff before asking for more approvals; current blocked gates ${blockedGateHandoffGateIds.join('|') || 'none'}, inputs needed now ${blockedGateHandoffInputIds.join('|') || 'none'}, canAskApprovalNow=${blockedGateHandoffCanAskApprovalNow}.`
    : null;
  const missingInputsKitState = values.missingInputsKit ?? values.runbook?.currentState?.missingInputsKit ?? null;
  const missingInputsKitStatus = missingInputsKitState?.status ?? null;
  const missingInputsKitInputCount = missingInputsKitState?.executiveSummary?.inputCount
    ?? missingInputsKitState?.inputCount
    ?? null;
  const missingInputsKitInputIdsFromPacket = (missingInputsKitState?.inputRequests ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const missingInputsKitInputIds = missingInputsKitInputIdsFromPacket.length > 0
    ? missingInputsKitInputIdsFromPacket
    : missingInputsKitState?.inputIds ?? [];
  const missingInputsKitNextSafeAction = missingInputsKitState?.executiveSummary?.nextSafeAction
    ?? missingInputsKitState?.nextSafeAction
    ?? null;
  const missingInputsKitMove = missingInputsKitStatus === 'missing_inputs_kit_ready_no_live_changes'
    ? `Use the Launch OS missing-inputs kit to collect the ${missingInputsKitInputCount ?? 'current'} missing inputs (${missingInputsKitInputIds.join('|') || 'none'}) without asking approval or executing; next safe action ${missingInputsKitNextSafeAction ?? 'collect_missing_inputs_without_approval_or_execution'}.`
    : missingInputsKitStatus
      ? `Refresh the Launch OS missing-inputs kit before new approvals; current status ${missingInputsKitStatus}.`
      : null;
  const missingInputsIntakeState = values.missingInputsIntake ?? values.runbook?.currentState?.missingInputsIntake ?? null;
  const missingInputsIntakeStatus = missingInputsIntakeState?.status ?? null;
  const missingInputsIntakeInputCount = missingInputsIntakeState?.executiveSummary?.inputCount
    ?? missingInputsIntakeState?.inputCount
    ?? null;
  const missingInputsIntakePresentInputCount = missingInputsIntakeState?.executiveSummary?.presentInputCount
    ?? missingInputsIntakeState?.presentInputCount
    ?? null;
  const missingInputsIntakeReadyInputCount = missingInputsIntakeState?.executiveSummary?.readyInputCount
    ?? missingInputsIntakeState?.readyInputCount
    ?? null;
  const missingInputsIntakeCanAskApprovalNow = missingInputsIntakeState?.executiveSummary?.canAskApprovalNow
    ?? missingInputsIntakeState?.canAskApprovalNow
    ?? null;
  const missingInputsIntakeFullPrivateValuesStored = missingInputsIntakeState?.executiveSummary?.fullPrivateValuesStoredInReport
    ?? missingInputsIntakeState?.fullPrivateValuesStoredInReport
    ?? null;
  const missingInputsIntakeNextSafeAction = missingInputsIntakeState?.executiveSummary?.nextSafeAction
    ?? missingInputsIntakeState?.nextSafeAction
    ?? null;
  const missingInputsIntakeMove = missingInputsIntakeStatus === 'missing_inputs_intake_waiting_for_inputs_no_live_changes'
    ? `Use the Launch OS missing-inputs intake as redacted current state; ready inputs ${missingInputsIntakeReadyInputCount ?? 0}/${missingInputsIntakeInputCount ?? 'unknown'}, present inputs ${missingInputsIntakePresentInputCount ?? 0}, canAskApprovalNow=${missingInputsIntakeCanAskApprovalNow}.`
    : missingInputsIntakeStatus === 'missing_inputs_intake_partial_no_live_changes'
      ? `Use the Launch OS missing-inputs intake before regenerating seed/CRM packets; ready inputs ${missingInputsIntakeReadyInputCount ?? 0}/${missingInputsIntakeInputCount ?? 'unknown'}, fullPrivateValuesStored=${missingInputsIntakeFullPrivateValuesStored}.`
      : missingInputsIntakeStatus === 'missing_inputs_intake_all_inputs_ready_no_live_changes'
        ? `Use the Launch OS missing-inputs intake to regenerate seed/CRM packets without execution; all ${missingInputsIntakeInputCount ?? 'current'} inputs are ready, canAskApprovalNow=${missingInputsIntakeCanAskApprovalNow}.`
        : missingInputsIntakeStatus
          ? `Refresh the Launch OS missing-inputs intake before packet regeneration; current status ${missingInputsIntakeStatus}.`
          : 'Generate the Launch OS missing-inputs intake so private seed/CRM inputs are checked locally and redacted before any packet regeneration.';
  const missingInputsRequestBundleState = values.missingInputsRequestBundle ?? values.runbook?.currentState?.missingInputsRequestBundle ?? null;
  const missingInputsRequestBundleStatus = missingInputsRequestBundleState?.status ?? null;
  const missingInputsRequestBundleRequestCount = missingInputsRequestBundleState?.executiveSummary?.requestCount
    ?? missingInputsRequestBundleState?.requestCount
    ?? null;
  const missingInputsRequestBundleCopyBlocksReady = missingInputsRequestBundleState?.executiveSummary?.copyBlocksReady
    ?? missingInputsRequestBundleState?.copyBlocksReady
    ?? null;
  const missingInputsRequestBundleCreatesPrivateFiles = missingInputsRequestBundleState?.executiveSummary?.createsPrivateFiles
    ?? missingInputsRequestBundleState?.createsPrivateFiles
    ?? null;
  const missingInputsRequestBundleAsksApproval = missingInputsRequestBundleState?.executiveSummary?.asksApproval
    ?? missingInputsRequestBundleState?.asksApproval
    ?? null;
  const missingInputsRequestBundleMove = missingInputsRequestBundleStatus === 'missing_inputs_request_bundle_ready_no_live_changes'
    ? `Use the Launch OS missing-inputs request bundle to collect inputs only; requests ${missingInputsRequestBundleRequestCount ?? 'unknown'}, copyBlocksReady=${missingInputsRequestBundleCopyBlocksReady}, asksApproval=${missingInputsRequestBundleAsksApproval}, createsPrivateFiles=${missingInputsRequestBundleCreatesPrivateFiles}.`
    : missingInputsRequestBundleStatus
      ? `Refresh the Launch OS missing-inputs request bundle before collecting inputs; current status ${missingInputsRequestBundleStatus}.`
      : 'Generate the Launch OS missing-inputs request bundle so Alejandro can supply inputs without reopening old UI work or granting premature approvals.';
  const privateInputTemplatePackState = values.privateInputTemplatePack ?? values.runbook?.currentState?.privateInputTemplatePack ?? null;
  const privateInputTemplatePackStatus = privateInputTemplatePackState?.status ?? null;
  const privateInputTemplatePackTemplateCount = privateInputTemplatePackState?.executiveSummary?.templateCount
    ?? privateInputTemplatePackState?.templateCount
    ?? null;
  const privateInputTemplatePackExampleFileCount = privateInputTemplatePackState?.executiveSummary?.exampleFileCount
    ?? privateInputTemplatePackState?.exampleFileCount
    ?? null;
  const privateInputTemplatePackActivePathCollisionCount = privateInputTemplatePackState?.executiveSummary?.activePathCollisionCount
    ?? privateInputTemplatePackState?.activePathCollisionCount
    ?? null;
  const privateInputTemplatePackCreatesActivePrivateInputFiles = privateInputTemplatePackState?.safety?.createsActivePrivateInputFiles
    ?? privateInputTemplatePackState?.createsActivePrivateInputFiles
    ?? null;
  const privateInputTemplatePackWritesRealPrivateValues = privateInputTemplatePackState?.safety?.writesRealPrivateValues
    ?? privateInputTemplatePackState?.writesRealPrivateValues
    ?? null;
  const privateInputTemplatePackMove = privateInputTemplatePackStatus === 'private_input_template_pack_ready_no_live_changes'
    ? `Use the Launch OS private-input template pack only as inert scaffolding; templates=${privateInputTemplatePackTemplateCount ?? 'unknown'}, exampleFiles=${privateInputTemplatePackExampleFileCount ?? 'unknown'}, activePathCollisions=${privateInputTemplatePackActivePathCollisionCount ?? 'unknown'}, createsActivePrivateInputFiles=${privateInputTemplatePackCreatesActivePrivateInputFiles}, writesRealPrivateValues=${privateInputTemplatePackWritesRealPrivateValues}.`
    : privateInputTemplatePackStatus
      ? `Refresh the Launch OS private-input template pack before using examples; current status ${privateInputTemplatePackStatus}.`
      : 'Generate the Launch OS private-input template pack so examples exist without creating active private input files.';
  const continuationGuardState = values.continuationGuard ?? values.runbook?.currentState?.continuationGuard ?? null;
  const continuationGuardStatus = continuationGuardState?.status ?? null;
  const continuationGuardOldUiWorkClosed = continuationGuardState?.executiveSummary?.oldUiWorkClosed
    ?? continuationGuardState?.oldUiWorkClosed
    ?? null;
  const continuationGuardClosedBoundaryCount = continuationGuardState?.executiveSummary?.closedBoundaryCount
    ?? continuationGuardState?.closedBoundaryCount
    ?? null;
  const continuationGuardActiveInputIdsFromPacket = (continuationGuardState?.activeInputs ?? [])
    .map((input) => input?.id)
    .filter(Boolean);
  const continuationGuardActiveInputIds = continuationGuardActiveInputIdsFromPacket.length > 0
    ? continuationGuardActiveInputIdsFromPacket
    : continuationGuardState?.activeInputIds ?? [];
  const continuationGuardMove = continuationGuardStatus === 'mailerlite_launch_os_continuation_guard_ready_no_live_changes'
    ? `Use the Launch OS continuation guard after resumes/compactions; old UI work closed=${continuationGuardOldUiWorkClosed}, closed boundaries=${continuationGuardClosedBoundaryCount ?? 'unknown'}, active inputs=${continuationGuardActiveInputIds.join('|') || 'none'}. Do not reopen closed UI/group/Shopify hitos without new concrete evidence.`
    : continuationGuardStatus
      ? `Refresh the Launch OS continuation guard before acting after a resume; current status ${continuationGuardStatus}.`
      : null;
  const approvalIntakeStatus = values.approvalIntake?.status ?? values.runbook?.currentState?.approvalIntake?.status ?? null;
  const approvalIntakeExecutionAllowedNow = values.approvalIntake?.executiveSummary?.executionAllowedNow
    ?? values.runbook?.currentState?.approvalIntake?.executionAllowedNow
    ?? null;
  const approvalIntakeOpenLiveGateCount = values.approvalIntake?.executiveSummary?.openLiveMutationGateCount
    ?? values.runbook?.currentState?.approvalIntake?.openLiveMutationGateCount
    ?? null;
  const approvalIntakeReady = APPROVAL_INTAKE_READY_STATUSES.has(approvalIntakeStatus)
    && approvalIntakeExecutionAllowedNow === false
    && approvalIntakeOpenLiveGateCount === 0;
  const approvalIntakeMove = approvalIntakeReady
    ? 'Use the Launch OS approval intake to check any future exact human phrase locally; it still cannot execute and must require fresh evidence before any guarded runner.'
    : 'Generate the Launch OS approval intake so future exact human phrases are checked locally before any guarded runner.';
  const repairPacket = values.miniLaunchEmailManualUiDraftRepairPacket ?? null;
  const repairPacketReady = repairPacket?.status === 'mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes'
    && repairPacket?.decision?.canAskAlejandroForApproval === true
    && repairPacket?.decision?.canRepairNow === false
    && repairPacket?.executiveSummary?.openLiveMutationGateCount === 0;
  const repairPacketResolved = repairPacket?.status === 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed';
  const repairPacketMove = continuationGuardOldUiWorkClosed === true
    ? 'Manual UI draft repair is closed by the continuation guard; do not reopen MailerLite UI work unless new concrete mismatch evidence appears.'
    : repairPacketReady
    ? `Manual UI draft repair packet is the current mini-launch asset boundary: repair ${repairPacket.executiveSummary?.targetDraftCount ?? 'unknown'} draft / ${repairPacket.executiveSummary?.missingFragmentCount ?? 'unknown'} exact fragments, then rerun real MailerLite render QA before seed-send approval.`
    : repairPacketResolved
      ? 'Manual UI draft repair packet is reference-only: real MailerLite render QA is green and no repair approval is pending.'
      : repairPacket
      ? `Manual UI draft repair packet exists but is not ready (${repairPacket.status ?? 'unknown'}); do not repair or ask seed-send approval until it is green.`
      : 'Generate the manual UI draft repair packet if real MailerLite render QA is blocked by exact-copy mismatch.';
  const seedTestQaPacket = values.miniLaunchSeedTestQaPacket ?? null;
  const seedTestQaStatus = seedTestQaPacket?.status
    ?? values.runbook?.currentState?.miniLaunch?.seedTestQaPacketStatus
    ?? null;
  const seedTestQaBlockers = seedTestQaPacket?.readiness?.machineBlockersBeforeSeedSendApprovalRequest
    ?? values.runbook?.currentState?.miniLaunch?.seedTestQaBlockersBeforeApprovalRequest
    ?? [];
  const seedRecipientMissingOnly = seedTestQaStatus === 'seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes'
    && seedTestQaBlockers.length === 1
    && seedTestQaBlockers.includes('exact_seed_recipient_missing')
    && (seedTestQaPacket?.readiness?.realMailerLiteRenderQaReady
      ?? values.runbook?.currentState?.miniLaunch?.seedTestQaRealMailerLiteRenderQaReady
      ?? false) === true
    && (seedTestQaPacket?.readiness?.targetGroupsExist
      ?? values.runbook?.currentState?.miniLaunch?.seedTestQaTargetGroupsExist
      ?? false) === true
    && (seedTestQaPacket?.readiness?.canAskSeedSendApprovalNow
      ?? values.runbook?.currentState?.miniLaunch?.seedTestQaCanAskApprovalNow
      ?? false) === false;
  const seedRecipientMove = seedRecipientMissingOnly
    ? 'Seed/test preflight is green except for the exact seed recipient: collect only the private seed email, regenerate the seed-send approval packet, and still do not send until fresh QA plus exact send approval exist.'
    : seedTestQaStatus
      ? `Use the seed/test QA packet as the seed-send boundary; current status ${seedTestQaStatus}, blockers ${seedTestQaBlockers.join('|') || 'none'}.`
      : 'Generate the seed/test QA packet before any seed-send approval request.';
  const localEmailAssetPlanMove = localEmailAssetPlanReady
    ? manualUiBuildClosed
      ? continuationGuardOldUiWorkClosed === true
        ? `The four mini-launch email assets are now represented as MailerLite UI drafts, UI repair is closed by the continuation guard and no UI repair is pending. ${seedRecipientMove}`
        : repairPacketReady
        ? `The four mini-launch email assets are represented as MailerLite UI drafts, but real QA found a repairable mismatch. ${repairPacketMove}`
        : seedRecipientMissingOnly
          ? `The four mini-launch email assets are now represented as MailerLite UI drafts via the manual build receipt, real MailerLite QA is green and no UI repair is pending. ${seedRecipientMove}`
          : 'The four mini-launch email assets are now represented as MailerLite UI drafts via the manual build receipt; use the seed/test QA packet as the preflight source and keep API asset build reference-only on Growing Business.'
      : emailBuilderPayloadManifestReady
      ? emailRenderQaReady
        ? 'The email builder payload manifest and local render QA are green and represented in the approval queue as local implementation input only; exact asset-build approval is still required and builder execution, seed sends, workflow attachment and subscribers remain closed.'
        : approvalQueueReady
          ? 'The email builder payload manifest is ready and represented in the approval queue as local implementation input only; exact asset-build approval is still required and builder execution, seed sends, workflow attachment and subscribers remain closed.'
          : 'The email builder payload manifest is ready as local implementation input only; exact asset-build approval is still required and builder execution, seed sends, workflow attachment and subscribers remain closed.'
      : emailAssetBuildScopePacketReady
      ? 'The email asset-build scope packet is ready for exact human approval request only; next no-live move is the local builder payload manifest; builder execution, seed sends, workflow attachment and subscribers remain closed.'
      : 'The local email asset plan is ready for exact MailerLite asset-build scope request only; builder execution, seed sends, workflow attachment and subscribers remain closed.'
    : 'Use Email Style QA to generate the local email asset plan before requesting exact MailerLite asset-build scope; builder execution remains closed.';
  const shopifyLocalBuildMove = shopifyLocalBuildClosed
    ? 'The Shopify no-live local build now exists as five inert local files; publish, preview/theme push, real forms, MailerLite connection and CRM writes remain closed.'
    : 'Shopify local-build remains a no-live approval/request boundary; do not edit, preview, publish or connect forms without exact scope approval.';
  const crmWriteApprovalPacket = values.miniLaunchCrmWriteApprovalPacket ?? null;
  const crmWritePolicyPacketReady = crmWriteApprovalPacket?.executiveSummary?.writePolicyPacketReady === true;
  const crmWritePolicyResolvedBlockers = crmWriteApprovalPacket?.policyEffect?.resolvedPolicyBlockers ?? [];
  const crmWriteApprovalMove = crmWriteApprovalPacket
    ? crmWritePolicyPacketReady
      ? `CRM write approval packet is the current CRM boundary: status ${crmWriteApprovalPacket.status ?? 'unknown'}, policy packet ready/consumed with ${crmWritePolicyResolvedBlockers.length} policy blockers resolved, exact writable events ${crmWriteApprovalPacket.executiveSummary?.exactEventCountReady ?? 'unknown'}, exact people ${crmWriteApprovalPacket.executiveSummary?.exactPersonCountReady ?? 'unknown'}; do not request CRM writes until real evidence, identities, facts and future exact approval are present.`
      : `CRM write approval packet is the current CRM boundary: status ${crmWriteApprovalPacket.status ?? 'unknown'}, exact writable events ${crmWriteApprovalPacket.executiveSummary?.exactEventCountReady ?? 'unknown'}, exact people ${crmWriteApprovalPacket.executiveSummary?.exactPersonCountReady ?? 'unknown'}; do not request CRM writes until blockers are gone.`
    : 'Prepare the CRM write approval packet before any Signal Ledger, card, scoring or Fact Store approval request; CRM signal projection remains no-live.';
  const nextBestMove = departmentResponsesAccepted
    ? emptyGroupCreateDryRunNoCreateNeeded
      ? `The two mini-launch empty groups already exist and the fresh create dry-run reports no create needed; do not rerun --execute for that boundary. ${blockedGateHandoffMove ?? ''} ${missingInputsKitMove ?? ''} ${missingInputsIntakeMove ?? ''} ${missingInputsRequestBundleMove ?? ''} ${privateInputTemplatePackMove ?? ''} ${continuationGuardMove ?? ''} ${localEmailAssetPlanMove} ${shopifyLocalBuildMove} ${crmWriteApprovalMove} Live actions remain closed.`
      : emptyGroupCreateDryRunReady
      ? `The mini-launch empty-group create runner dry-run is green; pause at Alejandro exact-approval boundary before any --execute. ${blockedGateHandoffMove ?? ''} ${missingInputsKitMove ?? ''} ${missingInputsIntakeMove ?? ''} ${missingInputsRequestBundleMove ?? ''} ${privateInputTemplatePackMove ?? ''} ${continuationGuardMove ?? ''} ${localEmailAssetPlanMove} ${shopifyLocalBuildMove} ${crmWriteApprovalMove} Live actions remain closed.`
      : emptyGroupApprovalPacketReady
      ? `The mini-launch empty-group approval packet is ready; run only the create runner dry-run for a fresh scan, then pause at Alejandro exact-approval boundary if he wants the two groups created empty. ${blockedGateHandoffMove ?? ''} ${missingInputsKitMove ?? ''} ${missingInputsIntakeMove ?? ''} ${missingInputsRequestBundleMove ?? ''} ${privateInputTemplatePackMove ?? ''} ${continuationGuardMove ?? ''} ${localEmailAssetPlanMove} Live actions remain closed.`
      : `Continue with the next no-live moves unlocked by department reconciliation. ${blockedGateHandoffMove ?? ''} ${missingInputsKitMove ?? ''} ${missingInputsIntakeMove ?? ''} ${missingInputsRequestBundleMove ?? ''} ${privateInputTemplatePackMove ?? ''} ${continuationGuardMove ?? ''} ${localEmailAssetPlanMove} ${shopifyLocalBuildMove} Prepare the exact empty-group approval packet and CRM signal projection packet. Live actions remain closed.`
    : 'Route the request bundle to Brand, Web Design and CRM, collect final no-live responses through the response workspace, use the response watcher to confirm final file presence, pass them through finalization preflight, then run intake/reconciliation before any new dry-run or build request.';
  const departmentResponseMoves = departmentResponsesAccepted
    ? emptyGroupCreateDryRunNoCreateNeeded
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Treat the mini-launch empty-group creation boundary as closed: the two target groups already exist and no --execute rerun is needed.',
        approvalQueueMove,
        approvalIntakeMove,
        blockedGateHandoffMove,
        missingInputsKitMove,
        missingInputsIntakeMove,
        missingInputsRequestBundleMove,
        privateInputTemplatePackMove,
        continuationGuardMove,
        localEmailAssetPlanMove,
        shopifyLocalBuildMove,
        crmWriteApprovalMove,
      ]
      : emptyGroupCreateDryRunReady
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Hold at the mini-launch empty-group create runner dry-run; it is green but not execution approval.',
        'Do not run --execute unless Alejandro gives the exact approval phrase for the two named empty groups.',
        approvalQueueMove,
        approvalIntakeMove,
        blockedGateHandoffMove,
        missingInputsKitMove,
        missingInputsIntakeMove,
        missingInputsRequestBundleMove,
        privateInputTemplatePackMove,
        continuationGuardMove,
        localEmailAssetPlanMove,
        shopifyLocalBuildMove,
        crmWriteApprovalMove,
      ]
      : emptyGroupApprovalPacketReady
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Run the mini-launch empty-group create runner in dry-run mode only; it is not execution approval and still requires Alejandro exact phrase before --execute.',
        approvalQueueMove,
        approvalIntakeMove,
        blockedGateHandoffMove,
        missingInputsKitMove,
        missingInputsIntakeMove,
        missingInputsRequestBundleMove,
        privateInputTemplatePackMove,
        continuationGuardMove,
        localEmailAssetPlanMove,
        shopifyLocalBuildMove,
        crmWriteApprovalMove,
      ]
      : [
      'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
      approvalQueueMove,
      approvalIntakeMove,
      blockedGateHandoffMove,
      missingInputsKitMove,
      missingInputsIntakeMove,
      missingInputsRequestBundleMove,
      privateInputTemplatePackMove,
      continuationGuardMove,
      localEmailAssetPlanMove,
      shopifyLocalBuildMove,
      'Prepare the exact mini-launch empty-group approval packet after the dry-run is ready; do not execute group creation from the dry-run alone.',
      'Prepare a scoped Shopify local-build request from the Web Design response; do not edit Shopify until that scope is explicitly approved.',
      crmWriteApprovalMove,
    ]
    : [
      'Use the department review request bundle to route Brand, Web Design and CRM no-live review requests without reconstructing context.',
      'Use the response workspace pending files for drafting, then save final Brand/Web/CRM response files.',
      'Use the response watcher to confirm whether final response files exist before running finalization preflight.',
      'Run finalization preflight so empty pending templates and Codex drafts cannot be confused with final department responses.',
      'Run department review intake and reconciliation with final response files only.',
    ];
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_goal_audit',
    generatedAt,
    ok: true,
    status: summary.overallStatus,
    objective: OBJECTIVE,
    executiveSummary: {
      ...summary,
      currentOperatingPosture: 'continue_no_live_build_and_reviews',
      nextBestMove,
      liveApprovalNeededNow: false,
      liveActionAllowedNow: false,
      blockedGateHandoffStatus,
      blockedGateHandoffCanAskApprovalNow,
      blockedGateHandoffInputIds,
      blockedGateHandoffGateIds,
      missingInputsKitStatus,
      missingInputsKitInputCount,
      missingInputsKitInputIds,
      missingInputsIntakeStatus,
      missingInputsIntakeInputCount,
      missingInputsIntakeReadyInputCount,
      missingInputsIntakeCanAskApprovalNow,
      missingInputsIntakeFullPrivateValuesStored,
      missingInputsRequestBundleStatus,
      missingInputsRequestBundleRequestCount,
      missingInputsRequestBundleCopyBlocksReady,
      missingInputsRequestBundleCreatesPrivateFiles,
      missingInputsRequestBundleAsksApproval,
      privateInputTemplatePackStatus,
      privateInputTemplatePackTemplateCount,
      privateInputTemplatePackExampleFileCount,
      privateInputTemplatePackActivePathCollisionCount,
      privateInputTemplatePackCreatesActivePrivateInputFiles,
      privateInputTemplatePackWritesRealPrivateValues,
      continuationGuardStatus,
      continuationGuardOldUiWorkClosed,
      continuationGuardClosedBoundaryCount,
      continuationGuardActiveInputIds,
    },
    requirements,
    nextMoves: uniqueMoves([
      ...departmentResponseMoves,
      'Use the onboarding trunk map before any v2 approval packet, seed test or mini-launch-to-onboarding route.',
      onboardingV2GroupBoundaryClosed
        ? 'Treat Onboarding v2 empty-group creation as closed: the 12 named groups now exist, and workflow draft/seed/production switch remain separate approvals.'
        : 'Use the fresh Onboarding v2 empty-groups packet and create dry-run before any exact approval request for the 12 named empty groups.',
      'Use the Onboarding v2 first-email map so the welcome/orientation email is tracked as journey_welcome_sent, not as a content Sent receipt.',
      brujulaManualUiBuildClosed
        ? 'Use the Brújula Email 1 manual UI build receipt as current draft evidence; builder edit/create is closed, and test send/public use still need separate exact approval.'
        : 'Use the Brújula Email 1 correction packet as local builder input before any future exact MailerLite edit/test-send approval.',
      approvalQueueMove,
      blockedGateHandoffMove,
      missingInputsKitMove,
      missingInputsIntakeMove,
      missingInputsRequestBundleMove,
      privateInputTemplatePackMove,
      continuationGuardMove,
      localEmailAssetPlanMove,
      repairPacketMove,
      seedRecipientMove,
      crmWriteApprovalMove,
      emptyGroupCreateDryRunNoCreateNeeded
        ? 'Do not rerun mini-launch empty-group creation; the two target groups already exist and that boundary is closed.'
        : 'If the mini-launch empty-group approval packet is ready, stop at Alejandro exact-phrase boundary; do not create groups from the packet alone.',
      emptyGroupCreateDryRunNoCreateNeeded
        ? 'Use fresh read-only group scans only if later evidence changes; no --execute rerun is needed for the current two mini-launch groups.'
        : 'If the mini-launch create runner dry-run is green, stop before --execute until Alejandro gives the exact approval phrase.',
      onboardingV2GroupBoundaryClosed
        ? 'Keep Onboarding v2 workflow draft, seed tests, production switch, Shopify preview/publish and CRM writes behind separate exact approvals.'
        : 'Keep Onboarding v2 group creation, workflow draft, seed tests, production switch, Shopify preview/publish and CRM writes behind separate exact approvals.',
    ]),
    safety: {
      localOnly: true,
      externalMessagesSent: false,
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
      tokensPrinted: false,
    },
    sourceDigests,
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (audit) => {
  const lines = [
    '# MailerLite Launch OS v0 - Goal Audit',
    '',
    `Generated: ${audit.generatedAt}`,
    `Status: ${audit.status}`,
    '',
    '## Executive Summary',
    '',
    `- Requirements: ${audit.executiveSummary.requirementCount}`,
    `- Proven: ${audit.executiveSummary.provenCount}`,
    `- Partial: ${audit.executiveSummary.partialCount}`,
    `- Blocked: ${audit.executiveSummary.blockedCount}`,
    `- Not proven: ${audit.executiveSummary.notProvenCount}`,
    `- Ready for live operation: ${audit.executiveSummary.readyForLiveOperation}`,
    `- Live approval needed now: ${audit.executiveSummary.liveApprovalNeededNow}`,
    `- Live action allowed now: ${audit.executiveSummary.liveActionAllowedNow}`,
    `- Next best move: ${audit.executiveSummary.nextBestMove}`,
    '',
    '## Requirement Audit',
    '',
  ];

  for (const requirement of audit.requirements) {
    lines.push(`### ${requirement.id}`);
    lines.push(`- Status: ${requirement.status}`);
    lines.push(`- Requirement: ${requirement.requirement}`);
    lines.push('- Evidence:');
    lines.push(renderList(requirement.evidence));
    lines.push('- Remaining:');
    lines.push(renderList(requirement.remaining));
    lines.push('');
  }

  lines.push('## Next Moves', '');
  lines.push(renderList(audit.nextMoves));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of audit.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Safety', '');
  lines.push('- Local-only.');
  lines.push('- No external messages.');
  lines.push('- No MailerLite, Shopify or CRM live API calls.');
  lines.push('- No subscribers read or mutated.');
  lines.push('- No group, workflow, send, ledger, card, score or Fact Store mutation.');

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

const buildGoalAuditFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  return buildGoalAudit({
    values,
    sourceDigests,
    validationStatus: options.validationStatus,
    validationSummary: options.validationSummary,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const audit = await buildGoalAuditFromFiles(options);
  if (options.out) await writeJson(options.out, audit);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(audit));

  console.log(JSON.stringify({
    ok: audit.ok,
    status: audit.status,
    generatedAt: audit.generatedAt,
    provenCount: audit.executiveSummary.provenCount,
    partialCount: audit.executiveSummary.partialCount,
    blockedCount: audit.executiveSummary.blockedCount,
    readyForLiveOperation: audit.executiveSummary.readyForLiveOperation,
    liveActionAllowedNow: audit.executiveSummary.liveActionAllowedNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: audit.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS goal audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildGoalAudit,
  buildRequirementChecks,
  buildGoalAuditFromFiles,
  parseArgs,
  renderMarkdown,
  summarizeCompletion,
};
