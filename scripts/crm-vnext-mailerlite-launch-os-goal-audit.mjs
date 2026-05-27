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
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_DESIGN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_event_contract_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_qa_packet_2026-05-27.json';
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
  --onboarding-v1-audit <path>      Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-v2-design <path>     Onboarding v2 design JSON. Defaults to ${DEFAULT_ONBOARDING_V2_DESIGN}
  --onboarding-v2-execution <path>  Onboarding v2 execution JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EXECUTION}
  --onboarding-v2-event-contract <path> Onboarding v2 event contract JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EVENT_CONTRACT}
  --onboarding-handoff-policy <path> Mini-launch to onboarding handoff policy JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --brujula-plan <path>             Brújula post-inbox plan JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>            Brújula apply receipt JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --brujula-email-style-qa <path>   Brújula email style QA JSON. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_QA}
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
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingV2Design: DEFAULT_ONBOARDING_V2_DESIGN,
    onboardingV2Execution: DEFAULT_ONBOARDING_V2_EXECUTION,
    onboardingV2EventContract: DEFAULT_ONBOARDING_V2_EVENT_CONTRACT,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    brujulaEmailStyleQa: DEFAULT_BRUJULA_EMAIL_STYLE_QA,
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
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-v2-design') options.onboardingV2Design = argv[++index];
    else if (arg === '--onboarding-v2-execution') options.onboardingV2Execution = argv[++index];
    else if (arg === '--onboarding-v2-event-contract') options.onboardingV2EventContract = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--brujula-email-style-qa') options.brujulaEmailStyleQa = argv[++index];
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
    ['onboardingV1Audit', options.onboardingV1Audit, 'protected production onboarding v1 evidence', 'json'],
    ['onboardingV2Design', options.onboardingV2Design, 'Onboarding v2 design evidence', 'json'],
    ['onboardingV2Execution', options.onboardingV2Execution, 'Onboarding v2 execution gates', 'json'],
    ['onboardingV2EventContract', options.onboardingV2EventContract, 'Onboarding v2 CRM event contract', 'json'],
    ['onboardingHandoffPolicy', options.onboardingHandoffPolicy, 'mini-launch to onboarding handoff policy and closed routing gate', 'json'],
    ['brujulaPlan', options.brujulaPlan, 'Brújula post-inbox verification and creative posture', 'json'],
    ['brujulaApply', options.brujulaApply, 'Brújula test subscriber receipt assignment', 'json'],
    ['brujulaEmailStyleQa', options.brujulaEmailStyleQa, 'Brújula email style QA blockers and green criteria', 'json'],
    ['packageJson', options.packageJson, 'available commands and local test surface', 'json'],
  ];

  const values = {};
  const sourceDigests = [];
  for (const [key, path, consultedFor, kind] of specs) {
    const content = await readText(path);
    values[key] = kind === 'json' ? JSON.parse(content) : content;
    sourceDigests.push(sourceDigest(path, content, consultedFor));
  }
  return { values, sourceDigests };
};

const packageHas = (packageJson, scriptName) => Boolean(packageJson?.scripts?.[scriptName]);

const assignedGroupNames = (brujulaApply) => (brujulaApply?.assignedGroups ?? [])
  .map((group) => group?.name)
  .filter(Boolean);

const buildRequirementChecks = ({
  runbook,
  readinessBoard,
  reconciliationBoard,
  responseWorkspace,
  finalizationPreflight,
  requestBundle,
  onboardingV1Audit,
  onboardingV2Design,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingHandoffPolicy,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
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
  const validationPassed = validationStatus === 'passed';
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
      ],
      remaining: v1Protected
        ? ['Keep v1 untouched until a later exact approval names a workflow action.']
        : ['Re-run onboarding v1 audit before any further onboarding work.'],
    },
    {
      id: 'design_onboarding_v2',
      requirement: 'Design Onboarding v2 without touching production v1.',
      status: onboardingV2Design?.status && onboardingV2Execution?.status && onboardingV2EventContract?.status
        ? 'proven'
        : 'partial',
      evidence: [
        `designStatus=${onboardingV2Design?.status ?? 'missing'}`,
        `executionStatus=${onboardingV2Execution?.status ?? 'missing'}`,
        `eventContractStatus=${onboardingV2EventContract?.status ?? 'missing'}`,
        `eventCount=${onboardingV2EventContract?.eventContract?.length ?? onboardingV2EventContract?.normalizationProof?.eventsGenerated ?? 'unknown'}`,
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
        ? 'partial'
        : 'not_proven',
      evidence: [
        `brandTaxonomyChars=${brandTaxonomy.length}`,
        `brandDictionaryChars=${brandDictionary.length}`,
        `runbookCommandCount=${runbook?.commandCatalog?.length ?? 0}`,
      ],
      remaining: [
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
      ],
      remaining: [
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
        `requestBundleStatus=${requestBundleStatus ?? 'missing'}`,
        `brujulaEmailStyleQaStatus=${brujulaEmailStyleQaStatus ?? 'missing'}`,
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
        `liveMutationGateOpenCount=${liveMutationGateOpenCount}`,
        `hasGoalAuditScript=${packageHas(packageJson, 'crm:vnext:mailerlite-launch-os-goal-audit')}`,
        `validationStatus=${validationStatus}`,
        `validationSummary=${validationSummary ?? 'not supplied'}`,
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
      ],
      remaining: openLiveGates === 0
        ? ['Maintain exact approval gates for every live or live-adjacent action.']
        : ['Close live gates before proceeding.'],
    },
    {
      id: 'brujula_test_pilot_status',
      requirement: 'Keep Brújula as controlled proving ground, not a public launch.',
      status: brujulaReceiptsOk && brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence && brujulaEmailStyleQaReady
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
      ],
      remaining: [
        'Apply Brand email-style corrections, rerun test-only visual QA and keep Brújula non-public until Brand email style QA is green.',
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
      nextBestMove: 'Route the request bundle to Brand, Web Design and CRM, collect final no-live responses through the response workspace, pass them through finalization preflight, then run intake/reconciliation before any new dry-run or build request.',
      liveApprovalNeededNow: false,
      liveActionAllowedNow: false,
    },
    requirements,
    nextMoves: [
      'Use the department review request bundle to route Brand, Web Design and CRM no-live review requests without reconstructing context.',
      'Use the response workspace pending files for drafting, then save final Brand/Web/CRM response files.',
      'Run finalization preflight so empty pending templates and Codex drafts cannot be confused with final department responses.',
      'Run department review intake and reconciliation with final response files only.',
      'Use the Brújula email style QA packet as the concrete correction checklist before any future test send or public use.',
      'If Brand accepts or renames launch group candidates, rerun the launch group dry-run.',
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
