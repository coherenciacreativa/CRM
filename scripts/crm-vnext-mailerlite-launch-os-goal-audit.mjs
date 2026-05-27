#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-goal-audit-2026-05-27';

const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-27.json';
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
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_map_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_qa_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';
const DEFAULT_APPROVAL_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_intake_2026-05-28.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-27.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const OBJECTIVE = 'Lleva MailerLite desde la arquitectura actual hacia un MailerLite Launch OS v0 listo para operar: preservar el onboarding productivo, disenar Onboarding v2, consolidar taxonomia de grupos/tags/recibos, preparar infraestructura para mini-lanzamientos frecuentes, coordinar con Brand Hub y CRM, documentar todo con reportes claros, validar con dry-runs y commits limpios, y detenerte a pedirme aprobacion antes de cualquier cambio vivo en MailerLite, Shopify, CRM, workflows, subscribers o envios reales.';

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
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --onboarding-v2-first-email-map <path> Onboarding v2 first-email mapping JSON. Defaults to ${DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP}
  --onboarding-handoff-policy <path> Mini-launch to onboarding handoff policy JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty group create runner dry-run JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --mini-launch-email-style-qa-packet <path> Mini-launch Email Style QA JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET}
  --mini-launch-local-email-asset-plan <path> Mini-launch local email asset plan JSON. Defaults to ${DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN}
  --mini-launch-email-asset-build-scope-packet <path> Mini-launch exact approval scope packet for future email asset build. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --mini-launch-email-builder-payload-manifest <path> Mini-launch local builder payload manifest. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --brujula-plan <path>             Brújula post-inbox plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>            Brújula apply receipt JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --brujula-email-style-qa <path>   Brújula email style QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_QA}
  --brujula-email-style-correction <path> Brújula Email 1 style correction JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>  Brújula Email 1 local render QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --approval-queue <path>           Launch OS exact approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --approval-intake <path>          Launch OS exact approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
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
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    onboardingV2FirstEmailMap: DEFAULT_ONBOARDING_V2_FIRST_EMAIL_MAP,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    miniLaunchEmailStyleQaPacket: DEFAULT_MINI_LAUNCH_EMAIL_STYLE_QA_PACKET,
    miniLaunchLocalEmailAssetPlan: DEFAULT_MINI_LAUNCH_LOCAL_EMAIL_ASSET_PLAN,
    miniLaunchEmailAssetBuildScopePacket: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    miniLaunchEmailBuilderPayloadManifest: DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    brujulaEmailStyleQa: DEFAULT_BRUJULA_EMAIL_STYLE_QA,
    brujulaEmailStyleCorrection: DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION,
    brujulaEmailRenderQa: DEFAULT_BRUJULA_EMAIL_RENDER_QA,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    approvalIntake: DEFAULT_APPROVAL_INTAKE,
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
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-first-email-map') options.onboardingV2FirstEmailMap = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--mini-launch-email-style-qa-packet') options.miniLaunchEmailStyleQaPacket = argv[++index];
    else if (arg === '--mini-launch-local-email-asset-plan') options.miniLaunchLocalEmailAssetPlan = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-scope-packet') options.miniLaunchEmailAssetBuildScopePacket = argv[++index];
    else if (arg === '--mini-launch-email-builder-payload-manifest') options.miniLaunchEmailBuilderPayloadManifest = argv[++index];
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--brujula-email-style-qa') options.brujulaEmailStyleQa = argv[++index];
    else if (arg === '--brujula-email-style-correction') options.brujulaEmailStyleCorrection = argv[++index];
    else if (arg === '--brujula-email-render-qa') options.brujulaEmailRenderQa = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--approval-intake') options.approvalIntake = argv[++index];
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
    ['onboardingV2EmptyGroupsCreateDryRun', options.onboardingV2EmptyGroupsCreateDryRun, 'Onboarding v2 empty-groups create runner dry-run with zero mutations', 'json', true],
    ['onboardingV2FirstEmailMap', options.onboardingV2FirstEmailMap, 'Onboarding v2 first-email mapping to prevent unnecessary Sent receipts', 'json', true],
    ['onboardingHandoffPolicy', options.onboardingHandoffPolicy, 'mini-launch to onboarding handoff policy and closed routing gate', 'json'],
    ['miniLaunchEmptyGroupCreateDryRun', options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty group create runner dry-run with zero mutations', 'json', true],
    ['miniLaunchEmailStyleQaPacket', options.miniLaunchEmailStyleQaPacket, 'mini-launch Email Style QA readiness for local asset planning with live gates closed', 'json', true],
    ['miniLaunchLocalEmailAssetPlan', options.miniLaunchLocalEmailAssetPlan, 'mini-launch local email asset plan with inert placeholders and build/send gates closed', 'json', true],
    ['miniLaunchEmailAssetBuildScopePacket', options.miniLaunchEmailAssetBuildScopePacket, 'mini-launch exact approval scope packet for future MailerLite draft email asset build; no execution', 'json', true],
    ['miniLaunchEmailBuilderPayloadManifest', options.miniLaunchEmailBuilderPayloadManifest, 'mini-launch local builder payload manifest with exact payloads and closed execution/send gates', 'json', true],
    ['brujulaPlan', options.brujulaPlan, 'Brújula post-inbox verification and creative posture', 'json'],
    ['brujulaApply', options.brujulaApply, 'Brújula test subscriber receipt assignment', 'json'],
    ['brujulaEmailStyleQa', options.brujulaEmailStyleQa, 'Brújula email style QA blockers and green criteria', 'json'],
    ['brujulaEmailStyleCorrection', options.brujulaEmailStyleCorrection, 'Brújula Email 1 corrected local draft and builder inputs', 'json'],
    ['brujulaEmailRenderQa', options.brujulaEmailRenderQa, 'Brújula Email 1 local render QA and preview evidence', 'json', true],
    ['approvalQueue', options.approvalQueue, 'single exact approval queue for current MailerLite Launch OS gates', 'json', true],
    ['approvalIntake', options.approvalIntake, 'local exact approval intake and fresh-evidence pre-execution plan', 'json', true],
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
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  onboardingHandoffPolicy,
  miniLaunchEmptyGroupCreateDryRun,
  miniLaunchEmailStyleQaPacket,
  miniLaunchLocalEmailAssetPlan,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  approvalQueue,
  approvalIntake,
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
  const approvalIntakeStatus = approvalIntake?.status
    ?? runbook?.currentState?.approvalIntake?.status
    ?? null;
  const approvalIntakeExecutionAllowedNow = approvalIntake?.executiveSummary?.executionAllowedNow
    ?? runbook?.currentState?.approvalIntake?.executionAllowedNow
    ?? null;
  const approvalIntakeOpenLiveGateCount = approvalIntake?.executiveSummary?.openLiveMutationGateCount
    ?? runbook?.currentState?.approvalIntake?.openLiveMutationGateCount
    ?? null;
  const approvalIntakeReady = [
    'waiting_for_exact_approval_text_no_live_changes',
    'no_exact_approval_phrase_detected_no_live_changes',
    'exact_approval_detected_requires_fresh_evidence_no_live_changes',
  ].includes(approvalIntakeStatus)
    && approvalIntakeExecutionAllowedNow === false
    && approvalIntakeOpenLiveGateCount === 0;
  const v2EmptyGroupsTargetCount = onboardingV2EmptyGroupsPacket?.sourceEvidence?.targetGroupCount
    ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.targetCount
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsTargetCount
    ?? null;
  const v2EmptyGroupsLiveGroupsRead = onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveGroupsRead
    ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveGroupsRead
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsLiveGroupsRead
    ?? null;
  const v2EmptyGroupsLiveAutomationsRead = onboardingV2EmptyGroupsPacket?.sourceEvidence?.liveAutomationsRead
    ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.liveAutomationsRead
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsLiveAutomationsRead
    ?? null;
  const v2EmptyGroupsBlockerCount = onboardingV2EmptyGroupsPacket?.blockers?.length
    ?? onboardingV2EmptyGroupsCreateDryRun?.packetSummary?.blockers?.length
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsBlockerCount
    ?? null;
  const v2EmptyGroupsCreateDryRunCreatedCount = onboardingV2EmptyGroupsCreateDryRun?.createdGroups?.length
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsCreateDryRunCreatedCount
    ?? null;
  const v2EmptyGroupsCanAskApproval = onboardingV2EmptyGroupsPacket?.approvalGate?.canAskAlejandroForApproval
    ?? runbook?.currentState?.onboarding?.v2EmptyGroupsCanAskApproval
    ?? false;
  const v2EmptyGroupsPacketReady = onboardingV2EmptyGroupsPacket?.status === 'ready_for_exact_human_approval_to_create_empty_groups'
    && v2EmptyGroupsTargetCount === 12
    && v2EmptyGroupsLiveGroupsRead >= 75
    && v2EmptyGroupsLiveAutomationsRead >= 13
    && v2EmptyGroupsBlockerCount === 0
    && v2EmptyGroupsCanAskApproval === true
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
    && v2EmptyGroupsCreateDryRunReady
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
        `emptyGroupsPacketStatus=${onboardingV2EmptyGroupsPacket?.status ?? runbook?.currentState?.onboarding?.v2EmptyGroupsPacketStatus ?? 'missing'}`,
        `emptyGroupsTargetCount=${v2EmptyGroupsTargetCount ?? 'unknown'}`,
        `emptyGroupsLiveGroupsRead=${v2EmptyGroupsLiveGroupsRead ?? 'unknown'}`,
        `emptyGroupsLiveAutomationsRead=${v2EmptyGroupsLiveAutomationsRead ?? 'unknown'}`,
        `emptyGroupsCanAskApproval=${v2EmptyGroupsCanAskApproval}`,
        `emptyGroupsBlockerCount=${v2EmptyGroupsBlockerCount ?? 'unknown'}`,
        `emptyGroupsCreateDryRunStatus=${onboardingV2EmptyGroupsCreateDryRun?.status ?? runbook?.currentState?.onboarding?.v2EmptyGroupsCreateDryRunStatus ?? 'missing'}`,
        `emptyGroupsCreateDryRunCreatedCount=${v2EmptyGroupsCreateDryRunCreatedCount ?? 'unknown'}`,
        `emptyGroupsPacketReady=${v2EmptyGroupsPacketReady}`,
        `emptyGroupsCreateDryRunReady=${v2EmptyGroupsCreateDryRunReady}`,
        `firstEmailMapStatus=${onboardingV2FirstEmailMap?.status ?? runbook?.currentState?.onboarding?.v2FirstEmailMapStatus ?? 'missing'}`,
        `firstEmailPosture=${onboardingV2FirstEmailMap?.decision?.recommendedPosture ?? runbook?.currentState?.onboarding?.v2FirstEmailRecommendedPosture ?? 'unknown'}`,
        `firstEmailSentGroup=${onboardingV2FirstEmailMap?.decision?.recommendedMailerLiteSentGroup ?? runbook?.currentState?.onboarding?.v2FirstEmailRecommendedSentGroup ?? 'none'}`,
        `firstEmailCreateNewSentGroup=${onboardingV2FirstEmailMap?.decision?.createNewSentGroup ?? runbook?.currentState?.onboarding?.v2FirstEmailCreateNewSentGroup ?? 'unknown'}`,
        `firstEmailCrmSignal=${onboardingV2FirstEmailMap?.v2ImplementationGuidance?.crmSignals?.[0]?.event ?? runbook?.currentState?.onboarding?.v2FirstEmailCrmSignal ?? 'unknown'}`,
        `firstEmailMapped=${v2FirstEmailMapped}`,
      ],
      remaining: [
        'Creating the 12 empty v2 groups remains a separate exact-approval lane.',
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
        `approvalQueueStatus=${approvalQueueStatus ?? 'missing'}`,
        `approvalQueueReadyCount=${approvalQueueReadyCount ?? 'unknown'}`,
        `approvalQueueBlockedCount=${approvalQueueBlockedCount ?? 'unknown'}`,
        `approvalQueueOpenLiveGateCount=${approvalQueueOpenLiveGateCount ?? 'unknown'}`,
        `approvalQueueNextBestHumanBoundary=${approvalQueueNextBestHumanBoundary ?? 'none'}`,
        `approvalIntakeStatus=${approvalIntakeStatus ?? 'missing'}`,
        `approvalIntakeExecutionAllowedNow=${approvalIntakeExecutionAllowedNow ?? 'unknown'}`,
        `approvalIntakeOpenLiveGateCount=${approvalIntakeOpenLiveGateCount ?? 'unknown'}`,
      ],
      remaining: pendingDepartments.length === 0 && finalizationReadyForIntake === true
        ? [
          emptyGroupApprovalPacketReady
            ? 'Current pilot is paused at the exact empty-group approval boundary; no MailerLite creation is authorized yet.'
            : 'Current pilot can continue through no-live moves: group dry-run, exact empty-group approval packet, scoped Shopify local-build request and CRM signal projection packet.',
          miniLaunchEmailStyleQaReadyForLocalAssetPlan
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
      ],
      remaining: openLiveGates === 0
        ? ['Maintain exact approval gates for every live or live-adjacent action.']
        : ['Close live gates before proceeding.'],
    },
    {
      id: 'brujula_test_pilot_status',
      requirement: 'Keep Brújula as controlled proving ground, not a public launch.',
      status: brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence && brujulaEmailStyleQaReady && brujulaCorrectionReady && brujulaRenderQaReady
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
      ],
      remaining: [
        brujulaRenderQaReady
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
  const approvalQueueReady = values.approvalQueue?.status === 'mailerlite_launch_os_approval_queue_ready_no_live_changes'
    || values.runbook?.currentState?.approvalQueue?.status === 'mailerlite_launch_os_approval_queue_ready_no_live_changes';
  const approvalQueueMove = approvalQueueReady
    ? 'Use the Launch OS approval queue as the single local map of exact approval phrases; it cannot approve or execute any operation by itself.'
    : 'Generate the Launch OS approval queue so exact approval boundaries are visible in one local surface.';
  const approvalIntakeReady = values.approvalIntake?.status === 'waiting_for_exact_approval_text_no_live_changes'
    || values.runbook?.currentState?.approvalIntake?.status === 'waiting_for_exact_approval_text_no_live_changes';
  const approvalIntakeMove = approvalIntakeReady
    ? 'Use the Launch OS approval intake to check any future exact human phrase locally; it still cannot execute and must require fresh evidence before any guarded runner.'
    : 'Generate the Launch OS approval intake so future exact human phrases are checked locally before any guarded runner.';
  const localEmailAssetPlanMove = localEmailAssetPlanReady
    ? emailBuilderPayloadManifestReady
      ? approvalQueueReady
        ? 'The email builder payload manifest is ready and represented in the approval queue as local implementation input only; exact asset-build approval is still required and builder execution, seed sends, workflow attachment and subscribers remain closed.'
        : 'The email builder payload manifest is ready as local implementation input only; exact asset-build approval is still required and builder execution, seed sends, workflow attachment and subscribers remain closed.'
      : emailAssetBuildScopePacketReady
      ? 'The email asset-build scope packet is ready for exact human approval request only; next no-live move is the local builder payload manifest; builder execution, seed sends, workflow attachment and subscribers remain closed.'
      : 'The local email asset plan is ready for exact MailerLite asset-build scope request only; builder execution, seed sends, workflow attachment and subscribers remain closed.'
    : 'Use Email Style QA to generate the local email asset plan before requesting exact MailerLite asset-build scope; builder execution remains closed.';
  const nextBestMove = departmentResponsesAccepted
    ? emptyGroupCreateDryRunNoCreateNeeded
      ? `The two mini-launch empty groups already exist and the fresh create dry-run reports no create needed; do not rerun --execute for that boundary. ${localEmailAssetPlanMove} Shopify local-build and CRM signal projection remain no-live. Live actions remain closed.`
      : emptyGroupCreateDryRunReady
      ? `The mini-launch empty-group create runner dry-run is green; pause at Alejandro exact-approval boundary before any --execute. ${localEmailAssetPlanMove} Shopify local-build and CRM signal projection remain no-live. Live actions remain closed.`
      : emptyGroupApprovalPacketReady
      ? `The mini-launch empty-group approval packet is ready; run only the create runner dry-run for a fresh scan, then pause at Alejandro exact-approval boundary if he wants the two groups created empty. ${localEmailAssetPlanMove} Live actions remain closed.`
      : `Continue with the next no-live moves unlocked by department reconciliation. ${localEmailAssetPlanMove} Prepare the exact empty-group approval packet, scoped Shopify local-build request, and CRM signal projection packet. Live actions remain closed.`
    : 'Route the request bundle to Brand, Web Design and CRM, collect final no-live responses through the response workspace, use the response watcher to confirm final file presence, pass them through finalization preflight, then run intake/reconciliation before any new dry-run or build request.';
  const departmentResponseMoves = departmentResponsesAccepted
    ? emptyGroupCreateDryRunNoCreateNeeded
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Treat the mini-launch empty-group creation boundary as closed: the two target groups already exist and no --execute rerun is needed.',
        approvalQueueMove,
        approvalIntakeMove,
        localEmailAssetPlanMove,
        'Prepare/maintain scoped Shopify local-build and CRM signal projection packets as no-live moves only.',
      ]
      : emptyGroupCreateDryRunReady
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Hold at the mini-launch empty-group create runner dry-run; it is green but not execution approval.',
        'Do not run --execute unless Alejandro gives the exact approval phrase for the two named empty groups.',
        approvalQueueMove,
        approvalIntakeMove,
        localEmailAssetPlanMove,
        'Prepare/maintain scoped Shopify local-build and CRM signal projection packets as no-live moves only.',
      ]
      : emptyGroupApprovalPacketReady
      ? [
        'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
        'Run the mini-launch empty-group create runner in dry-run mode only; it is not execution approval and still requires Alejandro exact phrase before --execute.',
        approvalQueueMove,
        approvalIntakeMove,
        localEmailAssetPlanMove,
        'Prepare/maintain scoped Shopify local-build and CRM signal projection packets as no-live moves only.',
      ]
      : [
      'Use the accepted Brand/Web/CRM final responses as the current review baseline.',
      approvalQueueMove,
      approvalIntakeMove,
      localEmailAssetPlanMove,
      'Prepare the exact mini-launch empty-group approval packet after the dry-run is ready; do not execute group creation from the dry-run alone.',
      'Prepare a scoped Shopify local-build request from the Web Design response; do not edit Shopify until that scope is explicitly approved.',
      'Prepare a no-live CRM signal projection packet from the CRM response; do not append ledgers, write cards, score, or touch Fact Store.',
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
    },
    requirements,
    nextMoves: [
      ...departmentResponseMoves,
      'Use the onboarding trunk map before any v2 approval packet, seed test or mini-launch-to-onboarding route.',
      'Use the fresh Onboarding v2 empty-groups packet and create dry-run before any exact approval request for the 12 named empty groups.',
      'Use the Onboarding v2 first-email map so the welcome/orientation email is tracked as journey_welcome_sent, not as a content Sent receipt.',
      'Use the Brújula Email 1 correction packet as local builder input before any future exact MailerLite edit/test-send approval.',
      approvalQueueMove,
      localEmailAssetPlanMove,
      'If the mini-launch empty-group approval packet is ready, stop at Alejandro exact-phrase boundary; do not create groups from the packet alone.',
      'If the mini-launch create runner dry-run is green, stop before --execute until Alejandro gives the exact approval phrase.',
      'Keep Onboarding v2 group creation, workflow draft, seed tests, production switch, Shopify preview/publish and CRM writes behind separate exact approvals.',
    ],
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
