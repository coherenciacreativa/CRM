#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-validation-receipt-2026-05-27';

const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_GOAL_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-28.json';
const DEFAULT_CONTINUATION_GUARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_continuation_guard_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json';
const DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_private_input_template_pack_2026-05-28.json';
const DEFAULT_POST_INPUT_ORCHESTRATOR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_post_input_orchestrator_2026-05-28.json';
const DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.json';
const DEFAULT_ONBOARDING_TRUNK_MAP = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_trunk_map_2026-05-27.json';
const DEFAULT_PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const DEFAULT_COMMANDS = [
  'node --check scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-approval-intake.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-blocked-gate-handoff.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-missing-inputs-kit.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-private-input-template-pack.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-post-input-orchestrator.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-taxonomy-consolidation-audit.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-handoff.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-decision-intake.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-workspace.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-request-bundle.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-continuation-guard.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs',
  'node --check scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs',
  'node --check scripts/crm-vnext-mailerlite-brujula-email-manual-ui-build-receipt.mjs',
  'node --check scripts/crm-vnext-mailerlite-brujula-real-mailerlite-render-qa.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-backlog-board.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-local-email-asset-plan.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-asset-build-scope-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-builder-payload-manifest.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-real-mailerlite-render-qa.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-asset-build.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-builder-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-execution-kit.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-build-receipt.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-draft-repair-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-seed-send-approval-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-plan.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-crm-write-policy-packet.mjs',
  'node --check scripts/crm-vnext-mailerlite-mini-launch-crm-write-approval-packet.mjs',
  'npm exec vitest run __tests__/crm-vnext-mailerlite*.spec.ts',
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs [options]

Options:
  --runbook <path>               Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --goal-audit <path>            Goal audit JSON. Defaults to ${DEFAULT_GOAL_AUDIT}
  --continuation-guard <path>    Continuation guard JSON. Defaults to ${DEFAULT_CONTINUATION_GUARD}
  --missing-inputs-intake <path>  Missing-inputs intake JSON. Defaults to ${DEFAULT_MISSING_INPUTS_INTAKE}
  --missing-inputs-request-bundle <path> Missing-inputs request bundle JSON. Defaults to ${DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE}
  --private-input-template-pack <path> Private-input template pack JSON. Defaults to ${DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK}
  --post-input-orchestrator <path> Post-input orchestrator JSON. Defaults to ${DEFAULT_POST_INPUT_ORCHESTRATOR}
  --taxonomy-consolidation-audit <path> Taxonomy consolidation audit JSON. Defaults to ${DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT}
  --taxonomy-refresh-handoff <path> Taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --taxonomy-refresh-decision-intake <path> Taxonomy decision intake JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE}
  --taxonomy-refresh-response-workspace <path> Taxonomy response workspace JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE}
  --taxonomy-refresh-response-request-bundle <path> Taxonomy response request bundle JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE}
  --onboarding-trunk-map <path>  Onboarding trunk map JSON. Defaults to ${DEFAULT_ONBOARDING_TRUNK_MAP}
  --package-json <path>          package.json. Defaults to ${DEFAULT_PACKAGE_JSON}
  --validation-status <status>   passed | failed | needs_validation. Defaults to needs_validation
  --validation-summary <text>    Required when status is passed
  --test-files <number>          Test file count from the validation run
  --test-count <number>          Test count from the validation run
  --command <command>            Command that was run. Can be repeated
  --out <path>                   Write JSON receipt
  --markdown-out <path>          Write Markdown receipt
  --help                         Show this help

Local-only validation receipt. It records test/check evidence after the operator
actually runs validation. It never calls MailerLite, Shopify or CRM live APIs,
reads subscribers, mutates groups/workflows/cards, sends emails, writes ledgers
or prints tokens.`;

const parseInteger = (value, name) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`invalid_${name}:${value}`);
  return parsed;
};

const parseArgs = (argv) => {
  const options = {
    runbook: DEFAULT_RUNBOOK,
    goalAudit: DEFAULT_GOAL_AUDIT,
    continuationGuard: DEFAULT_CONTINUATION_GUARD,
    missingInputsIntake: DEFAULT_MISSING_INPUTS_INTAKE,
    missingInputsRequestBundle: DEFAULT_MISSING_INPUTS_REQUEST_BUNDLE,
    privateInputTemplatePack: DEFAULT_PRIVATE_INPUT_TEMPLATE_PACK,
    postInputOrchestrator: DEFAULT_POST_INPUT_ORCHESTRATOR,
    taxonomyConsolidationAudit: DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT,
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    taxonomyRefreshDecisionIntake: DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE,
    taxonomyRefreshResponseWorkspace: DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE,
    taxonomyRefreshResponseRequestBundle: DEFAULT_TAXONOMY_REFRESH_RESPONSE_REQUEST_BUNDLE,
    onboardingTrunkMap: DEFAULT_ONBOARDING_TRUNK_MAP,
    packageJson: DEFAULT_PACKAGE_JSON,
    validationStatus: 'needs_validation',
    validationSummary: null,
    testFiles: null,
    testCount: null,
    commands: [],
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--goal-audit') options.goalAudit = argv[++index];
    else if (arg === '--continuation-guard') options.continuationGuard = argv[++index];
    else if (arg === '--missing-inputs-intake') options.missingInputsIntake = argv[++index];
    else if (arg === '--missing-inputs-request-bundle') options.missingInputsRequestBundle = argv[++index];
    else if (arg === '--private-input-template-pack') options.privateInputTemplatePack = argv[++index];
    else if (arg === '--post-input-orchestrator') options.postInputOrchestrator = argv[++index];
    else if (arg === '--taxonomy-consolidation-audit') options.taxonomyConsolidationAudit = argv[++index];
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--taxonomy-refresh-decision-intake') options.taxonomyRefreshDecisionIntake = argv[++index];
    else if (arg === '--taxonomy-refresh-response-workspace') options.taxonomyRefreshResponseWorkspace = argv[++index];
    else if (arg === '--taxonomy-refresh-response-request-bundle') options.taxonomyRefreshResponseRequestBundle = argv[++index];
    else if (arg === '--onboarding-trunk-map') options.onboardingTrunkMap = argv[++index];
    else if (arg === '--package-json') options.packageJson = argv[++index];
    else if (arg === '--validation-status') options.validationStatus = argv[++index];
    else if (arg === '--validation-summary') options.validationSummary = argv[++index];
    else if (arg === '--test-files') options.testFiles = parseInteger(argv[++index], 'test_files');
    else if (arg === '--test-count') options.testCount = parseInteger(argv[++index], 'test_count');
    else if (arg === '--command') options.commands.push(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!['passed', 'failed', 'needs_validation'].includes(options.validationStatus)) {
    throw new Error(`invalid_validation_status:${options.validationStatus}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const digestFor = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const packageHas = (packageJson, scriptName) => Boolean(packageJson?.scripts?.[scriptName]);

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
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
});

const safetyClosed = (safety) => [
  'externalMessagesSent',
  'mailerLiteApiCalled',
  'shopifyApiCalled',
  'crmLiveApiCalled',
  'subscribersRead',
  'subscriberMutationsPerformed',
  'groupMutationsPerformed',
  'workflowMutationsPerformed',
  'sendsPerformed',
  'signalLedgerAppendPerformed',
  'crmCardMutationsPerformed',
  'crmScoreMutationsPerformed',
  'factStoreWritePerformed',
  'tokensPrinted',
].every((key) => safety[key] === false);

const buildValidationReceipt = ({
  runbook,
  goalAudit,
  continuationGuard,
  missingInputsIntake = null,
  missingInputsRequestBundle = null,
  privateInputTemplatePack = null,
  postInputOrchestrator = null,
  taxonomyConsolidationAudit = null,
  taxonomyRefreshHandoff = null,
  taxonomyRefreshDecisionIntake = null,
  taxonomyRefreshResponseWorkspace = null,
  taxonomyRefreshResponseRequestBundle = null,
  onboardingTrunkMap,
  packageJson,
  sourceDigests = [],
  validationStatus = 'needs_validation',
  validationSummary = null,
  testFiles = null,
  testCount = null,
  commands = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const commandList = commands.length > 0 ? commands : DEFAULT_COMMANDS;
  const liveGatesClosed = runbook?.currentState?.liveGates?.openLiveGateCount === 0
    && (runbook?.currentState?.approvalQueue?.openLiveMutationGateCount ?? 0) === 0
    && goalAudit?.safety?.mailerLiteApiCalled === false
    && goalAudit?.safety?.shopifyApiCalled === false
    && goalAudit?.safety?.crmLiveApiCalled === false
    && goalAudit?.safety?.sendsPerformed === false
    && safetyClosed(safety);
  const requiredScriptsPresent = [
    'crm:vnext:mailerlite-launch-os-operator-runbook',
    'crm:vnext:mailerlite-launch-os-approval-queue',
    'crm:vnext:mailerlite-launch-os-approval-intake',
    'crm:vnext:mailerlite-launch-os-blocked-gate-handoff',
    'crm:vnext:mailerlite-launch-os-missing-inputs-kit',
    'crm:vnext:mailerlite-launch-os-missing-inputs-intake',
    'crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle',
    'crm:vnext:mailerlite-launch-os-private-input-template-pack',
    'crm:vnext:mailerlite-launch-os-post-input-orchestrator',
    'crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit',
    'crm:vnext:mailerlite-launch-os-taxonomy-refresh-handoff',
    'crm:vnext:mailerlite-launch-os-taxonomy-refresh-decision-intake',
    'crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace',
    'crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-request-bundle',
    'crm:vnext:mailerlite-launch-os-continuation-guard',
    'crm:vnext:mailerlite-launch-os-goal-audit',
    'crm:vnext:mailerlite-launch-os-validation-receipt',
    'crm:vnext:mailerlite-launch-os-current-state-refresh',
    'crm:vnext:mailerlite-brujula-email-manual-ui-build-receipt',
    'crm:vnext:mailerlite-brujula-real-mailerlite-render-qa',
    'crm:vnext:mailerlite-onboarding-trunk-map',
    'crm:vnext:mailerlite-mini-launch-department-review-response-watcher',
    'crm:vnext:mailerlite-mini-launch-backlog-board',
    'crm:vnext:mailerlite-mini-launch-local-email-asset-plan',
    'crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet',
    'crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest',
    'crm:vnext:mailerlite-mini-launch-email-render-qa-packet',
    'crm:vnext:mailerlite-mini-launch-real-mailerlite-render-qa',
    'crm:vnext:mailerlite-mini-launch-email-asset-build',
    'crm:vnext:mailerlite-mini-launch-email-manual-ui-builder-packet',
    'crm:vnext:mailerlite-mini-launch-email-manual-ui-execution-kit',
    'crm:vnext:mailerlite-mini-launch-email-manual-ui-build-receipt',
    'crm:vnext:mailerlite-mini-launch-email-manual-ui-draft-repair-packet',
    'crm:vnext:mailerlite-mini-launch-seed-send-approval-packet',
    'crm:vnext:mailerlite-mini-launch-seed-test-qa-packet',
    'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-plan',
    'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-preview',
    'crm:vnext:mailerlite-mini-launch-crm-write-policy-packet',
    'crm:vnext:mailerlite-mini-launch-crm-write-approval-packet',
  ].every((scriptName) => packageHas(packageJson, scriptName));
  const trunkMapReady = onboardingTrunkMap?.status === 'onboarding_trunk_map_ready_no_live_changes';
  const canMarkPassed = validationStatus === 'passed'
    && Boolean(validationSummary)
    && liveGatesClosed
    && requiredScriptsPresent
    && trunkMapReady
    && testFiles !== null
    && testCount !== null;
  const normalizedValidationStatus = canMarkPassed
    ? 'passed'
    : validationStatus === 'failed'
      ? 'failed'
      : 'needs_validation';
  const status = canMarkPassed
    ? 'mailerlite_launch_os_validation_receipt_ready_no_live_changes'
    : normalizedValidationStatus === 'failed'
      ? 'mailerlite_launch_os_validation_receipt_failed_no_live_changes'
      : 'mailerlite_launch_os_validation_receipt_needs_validation_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_validation_receipt',
    generatedAt,
    ok: true,
    status,
    validationStatus: normalizedValidationStatus,
    validationSummary,
    testScope: {
      testFiles,
      testCount,
      commands: commandList,
      commandCount: commandList.length,
    },
    evidence: {
      runbookStatus: runbook?.status ?? null,
      goalAuditStatus: goalAudit?.status ?? null,
      goalAuditReadyForLiveOperation: goalAudit?.executiveSummary?.readyForLiveOperation ?? null,
      goalAuditLiveActionAllowedNow: goalAudit?.executiveSummary?.liveActionAllowedNow ?? null,
      continuationGuardStatus: continuationGuard?.status ?? runbook?.currentState?.continuationGuard?.status ?? null,
      continuationGuardOldUiWorkClosed: continuationGuard?.executiveSummary?.oldUiWorkClosed
        ?? runbook?.currentState?.continuationGuard?.oldUiWorkClosed
        ?? null,
      continuationGuardClosedBoundaryCount: continuationGuard?.executiveSummary?.closedBoundaryCount
        ?? runbook?.currentState?.continuationGuard?.closedBoundaryCount
        ?? null,
      missingInputsIntakeStatus: missingInputsIntake?.status
        ?? runbook?.currentState?.missingInputsIntake?.status
        ?? null,
      missingInputsIntakeReadyInputCount: missingInputsIntake?.executiveSummary?.readyInputCount
        ?? runbook?.currentState?.missingInputsIntake?.readyInputCount
        ?? null,
      missingInputsIntakeReadyForMiniLaunchCorrectionPreview: missingInputsIntake?.executiveSummary?.readyForMiniLaunchCorrectionPreview
        ?? runbook?.currentState?.missingInputsIntake?.readyForMiniLaunchCorrectionPreview
        ?? null,
      missingInputsIntakeFullPrivateValuesStored: missingInputsIntake?.executiveSummary?.fullPrivateValuesStoredInReport
        ?? runbook?.currentState?.missingInputsIntake?.fullPrivateValuesStoredInReport
        ?? null,
      missingInputsRequestBundleStatus: missingInputsRequestBundle?.status
        ?? runbook?.currentState?.missingInputsRequestBundle?.status
        ?? null,
      missingInputsRequestBundleRequestCount: missingInputsRequestBundle?.executiveSummary?.requestCount
        ?? runbook?.currentState?.missingInputsRequestBundle?.requestCount
        ?? null,
      missingInputsRequestBundleCopyBlocksReady: missingInputsRequestBundle?.executiveSummary?.copyBlocksReady
        ?? runbook?.currentState?.missingInputsRequestBundle?.copyBlocksReady
        ?? null,
      missingInputsRequestBundleAsksApproval: missingInputsRequestBundle?.executiveSummary?.asksApproval
        ?? runbook?.currentState?.missingInputsRequestBundle?.asksApproval
        ?? null,
      missingInputsRequestBundleCreatesPrivateFiles: missingInputsRequestBundle?.executiveSummary?.createsPrivateFiles
        ?? runbook?.currentState?.missingInputsRequestBundle?.createsPrivateFiles
        ?? null,
      privateInputTemplatePackStatus: privateInputTemplatePack?.status
        ?? runbook?.currentState?.privateInputTemplatePack?.status
        ?? null,
      privateInputTemplatePackTemplateCount: privateInputTemplatePack?.executiveSummary?.templateCount
        ?? runbook?.currentState?.privateInputTemplatePack?.templateCount
        ?? null,
      privateInputTemplatePackExampleFileCount: privateInputTemplatePack?.executiveSummary?.exampleFileCount
        ?? runbook?.currentState?.privateInputTemplatePack?.exampleFileCount
        ?? null,
      privateInputTemplatePackActivePathCollisionCount: privateInputTemplatePack?.executiveSummary?.activePathCollisionCount
        ?? runbook?.currentState?.privateInputTemplatePack?.activePathCollisionCount
        ?? null,
      privateInputTemplatePackCreatesActivePrivateInputFiles: privateInputTemplatePack?.safety?.createsActivePrivateInputFiles
        ?? runbook?.currentState?.privateInputTemplatePack?.createsActivePrivateInputFiles
        ?? null,
      privateInputTemplatePackWritesRealPrivateValues: privateInputTemplatePack?.safety?.writesRealPrivateValues
        ?? runbook?.currentState?.privateInputTemplatePack?.writesRealPrivateValues
        ?? null,
      postInputOrchestratorStatus: postInputOrchestrator?.status
        ?? runbook?.currentState?.postInputOrchestrator?.status
        ?? null,
      postInputOrchestratorReadyCommandCount: postInputOrchestrator?.executiveSummary?.readyCommandCount
        ?? runbook?.currentState?.postInputOrchestrator?.readyCommandCount
        ?? null,
      postInputOrchestratorCommandsExecuted: postInputOrchestrator?.executiveSummary?.commandsExecuted
        ?? runbook?.currentState?.postInputOrchestrator?.commandsExecuted
        ?? null,
      postInputOrchestratorCanAskApprovalNow: postInputOrchestrator?.executiveSummary?.canAskApprovalNow
        ?? runbook?.currentState?.postInputOrchestrator?.canAskApprovalNow
        ?? null,
      taxonomyConsolidationAuditStatus: taxonomyConsolidationAudit?.status
        ?? runbook?.currentState?.taxonomyConsolidationAudit?.status
        ?? null,
      taxonomyConsolidationLiveEvidenceGroupCount: taxonomyConsolidationAudit?.executiveSummary?.liveEvidenceGroupCount
        ?? runbook?.currentState?.taxonomyConsolidationAudit?.liveEvidenceGroupCount
        ?? null,
      taxonomyConsolidationBrandPromotionNeededCount: taxonomyConsolidationAudit?.executiveSummary?.brandPromotionNeededCount
        ?? runbook?.currentState?.taxonomyConsolidationAudit?.brandPromotionNeededCount
        ?? null,
      taxonomyConsolidationCrmManifestRefreshNeededCount: taxonomyConsolidationAudit?.executiveSummary?.crmManifestRefreshNeededCount
        ?? runbook?.currentState?.taxonomyConsolidationAudit?.crmManifestRefreshNeededCount
        ?? null,
      taxonomyConsolidationCanAskApprovalNow: taxonomyConsolidationAudit?.executiveSummary?.canAskApprovalNow
        ?? runbook?.currentState?.taxonomyConsolidationAudit?.canAskApprovalNow
        ?? null,
      taxonomyRefreshHandoffStatus: taxonomyRefreshHandoff?.status
        ?? runbook?.currentState?.taxonomyRefreshHandoff?.status
        ?? null,
      taxonomyRefreshBrandPromotionDecisionCount: taxonomyRefreshHandoff?.executiveSummary?.brandPromotionDecisionCount
        ?? runbook?.currentState?.taxonomyRefreshHandoff?.brandPromotionDecisionCount
        ?? null,
      taxonomyRefreshCrmManifestPatchCount: taxonomyRefreshHandoff?.executiveSummary?.crmManifestPatchCount
        ?? runbook?.currentState?.taxonomyRefreshHandoff?.crmManifestPatchCount
        ?? null,
      taxonomyRefreshCanApplyCrmManifestPatchNow: taxonomyRefreshHandoff?.executiveSummary?.canApplyCrmManifestPatchNow
        ?? runbook?.currentState?.taxonomyRefreshHandoff?.canApplyCrmManifestPatchNow
        ?? null,
      taxonomyRefreshDecisionIntakeStatus: taxonomyRefreshDecisionIntake?.status
        ?? runbook?.currentState?.taxonomyRefreshDecisionIntake?.status
        ?? null,
      taxonomyRefreshDecisionBrandRowsPresent: taxonomyRefreshDecisionIntake?.executiveSummary?.brandDecisionRowsPresent
        ?? runbook?.currentState?.taxonomyRefreshDecisionIntake?.brandDecisionRowsPresent
        ?? null,
      taxonomyRefreshDecisionBrandRowsNeeded: taxonomyRefreshDecisionIntake?.executiveSummary?.brandDecisionRowsNeeded
        ?? runbook?.currentState?.taxonomyRefreshDecisionIntake?.brandDecisionRowsNeeded
        ?? null,
      taxonomyRefreshDecisionReadyForLocalPatchPreview: taxonomyRefreshDecisionIntake?.executiveSummary?.readyForLocalPatchPreview
        ?? runbook?.currentState?.taxonomyRefreshDecisionIntake?.readyForLocalPatchPreview
        ?? null,
      taxonomyRefreshDecisionCanApplyCrmManifestPatchNow: taxonomyRefreshDecisionIntake?.executiveSummary?.canApplyCrmManifestPatchNow
        ?? runbook?.currentState?.taxonomyRefreshDecisionIntake?.canApplyCrmManifestPatchNow
        ?? null,
      taxonomyRefreshResponseWorkspaceStatus: taxonomyRefreshResponseWorkspace?.status
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.status
        ?? null,
      taxonomyRefreshResponseBrandDecisionRowCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.brandDecisionRowCount
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.brandDecisionRowCount
        ?? null,
      taxonomyRefreshResponseCrmManifestPatchRowCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.crmManifestPatchRowCount
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.crmManifestPatchRowCount
        ?? null,
      taxonomyRefreshResponsePendingActorCount: taxonomyRefreshResponseWorkspace?.executiveSummary?.pendingActorCount
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.pendingActorCount
        ?? null,
      taxonomyRefreshResponseReadyForIntake: taxonomyRefreshResponseWorkspace?.executiveSummary?.readyForIntake
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.readyForIntake
        ?? null,
      taxonomyRefreshResponseCanApplyCrmManifestPatchNow: taxonomyRefreshResponseWorkspace?.executiveSummary?.canApplyCrmManifestPatchNow
        ?? runbook?.currentState?.taxonomyRefreshResponseWorkspace?.canApplyCrmManifestPatchNow
        ?? null,
      taxonomyRefreshResponseRequestBundleStatus: taxonomyRefreshResponseRequestBundle?.status
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.status
        ?? null,
      taxonomyRefreshResponseRequestCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.requestCount
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.requestCount
        ?? null,
      taxonomyRefreshResponseRequestPendingActorCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.pendingActorCount
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.pendingActorCount
        ?? null,
      taxonomyRefreshResponseRequestMissingFinalResponseCount: taxonomyRefreshResponseRequestBundle?.executiveSummary?.missingFinalResponseCount
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.missingFinalResponseCount
        ?? null,
      taxonomyRefreshResponseRequestCopyBlocksReady: taxonomyRefreshResponseRequestBundle?.executiveSummary?.copyBlocksReady
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.copyBlocksReady
        ?? null,
      taxonomyRefreshResponseRequestAsksLiveApproval: taxonomyRefreshResponseRequestBundle?.executiveSummary?.asksLiveApproval
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.asksLiveApproval
        ?? null,
      taxonomyRefreshResponseRequestCreatesFinalResponseFiles: taxonomyRefreshResponseRequestBundle?.executiveSummary?.createsFinalResponseFiles
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.createsFinalResponseFiles
        ?? null,
      taxonomyRefreshResponseRequestCanApplyCrmManifestPatchNow: taxonomyRefreshResponseRequestBundle?.executiveSummary?.canApplyCrmManifestPatchNow
        ?? runbook?.currentState?.taxonomyRefreshResponseRequestBundle?.canApplyCrmManifestPatchNow
        ?? null,
      onboardingTrunkMapStatus: onboardingTrunkMap?.status ?? null,
      packageRequiredScriptsPresent: requiredScriptsPresent,
      liveGatesClosed,
    },
    hardStops: [
      'This receipt cannot approve live action.',
      'A passed receipt only proves local checks/tests for the current Launch OS surface.',
      'MailerLite, Shopify, CRM, workflows, subscribers, sends, ledgers, cards, scoring and Fact Store remain closed until exact approval.',
    ],
    safety,
    sourceDigests,
  };
};

const buildValidationReceiptFromFiles = async (options) => {
  const [
    runbook,
    goalAudit,
    continuationGuard,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    taxonomyConsolidationAudit,
    taxonomyRefreshHandoff,
    taxonomyRefreshDecisionIntake,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshResponseRequestBundle,
    onboardingTrunkMap,
    packageJson,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.runbook),
    readJson(options.goalAudit),
    readJson(options.continuationGuard),
    readJson(options.missingInputsIntake),
    readJson(options.missingInputsRequestBundle),
    readJson(options.privateInputTemplatePack),
    readJson(options.postInputOrchestrator),
    readJson(options.taxonomyConsolidationAudit),
    readJson(options.taxonomyRefreshHandoff),
    readJson(options.taxonomyRefreshDecisionIntake),
    readJson(options.taxonomyRefreshResponseWorkspace),
    readJson(options.taxonomyRefreshResponseRequestBundle),
    readJson(options.onboardingTrunkMap),
    readJson(options.packageJson),
    Promise.all([
      digestFor(options.runbook, 'operator runbook state and closed gates'),
      digestFor(options.goalAudit, 'goal audit status and safety posture'),
      digestFor(options.continuationGuard, 'continuation guard closed hito and do-not-recycle state'),
      digestFor(options.missingInputsIntake, 'missing-inputs intake redacted private input status'),
      digestFor(options.missingInputsRequestBundle, 'copy-ready missing-input request bundle with no approval or private file creation'),
      digestFor(options.privateInputTemplatePack, 'inert private-input template pack ignored by active intake'),
      digestFor(options.postInputOrchestrator, 'post-input orchestrator local packet regeneration plan and no execution'),
      digestFor(options.taxonomyConsolidationAudit, 'taxonomy consolidation audit across approved group receipts, Brand dictionary and CRM manifest'),
      digestFor(options.taxonomyRefreshHandoff, 'taxonomy refresh handoff for Brand and CRM semantic/cache decisions'),
      digestFor(options.taxonomyRefreshDecisionIntake, 'taxonomy decision intake for local-only Brand and CRM decisions'),
      digestFor(options.taxonomyRefreshResponseWorkspace, 'taxonomy response workspace with pending/final Brand and CRM decisions'),
      digestFor(options.taxonomyRefreshResponseRequestBundle, 'taxonomy response request bundle for Brand/CRM final files'),
      digestFor(options.onboardingTrunkMap, 'protected onboarding trunk evidence'),
      digestFor(options.packageJson, 'available Launch OS scripts'),
    ]),
  ]);

  return buildValidationReceipt({
    runbook,
    goalAudit,
    continuationGuard,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    taxonomyConsolidationAudit,
    taxonomyRefreshHandoff,
    taxonomyRefreshDecisionIntake,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshResponseRequestBundle,
    onboardingTrunkMap,
    packageJson,
    sourceDigests,
    validationStatus: options.validationStatus,
    validationSummary: options.validationSummary,
    testFiles: options.testFiles,
    testCount: options.testCount,
    commands: options.commands,
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (receipt) => {
  const lines = [
    '# MailerLite Launch OS v0 - Validation Receipt',
    '',
    `Generated: ${receipt.generatedAt}`,
    `Status: ${receipt.status}`,
    `Validation status: ${receipt.validationStatus}`,
    `Validation summary: ${receipt.validationSummary ?? 'not supplied'}`,
    '',
    '## Executive Summary',
    '',
    `- Test files: ${receipt.testScope.testFiles ?? 'not supplied'}`,
    `- Tests: ${receipt.testScope.testCount ?? 'not supplied'}`,
    `- Live gates closed: ${receipt.evidence.liveGatesClosed}`,
    `- Required scripts present: ${receipt.evidence.packageRequiredScriptsPresent}`,
    `- Goal audit live action allowed now: ${receipt.evidence.goalAuditLiveActionAllowedNow}`,
    `- Continuation guard: ${receipt.evidence.continuationGuardStatus ?? 'missing'}`,
    `- Old UI work closed: ${receipt.evidence.continuationGuardOldUiWorkClosed ?? 'unknown'}`,
    `- Missing-inputs intake: ${receipt.evidence.missingInputsIntakeStatus ?? 'missing'}`,
    `- Missing-inputs intake ready: ${receipt.evidence.missingInputsIntakeReadyInputCount ?? 'unknown'}`,
    `- Missing-inputs intake ready for mini-launch correction preview: ${receipt.evidence.missingInputsIntakeReadyForMiniLaunchCorrectionPreview ?? 'unknown'}`,
    `- Missing-inputs intake full private values stored: ${receipt.evidence.missingInputsIntakeFullPrivateValuesStored ?? 'unknown'}`,
    `- Missing-inputs request bundle: ${receipt.evidence.missingInputsRequestBundleStatus ?? 'missing'}`,
    `- Missing-inputs request count: ${receipt.evidence.missingInputsRequestBundleRequestCount ?? 'unknown'}`,
    `- Missing-inputs request copy blocks ready: ${receipt.evidence.missingInputsRequestBundleCopyBlocksReady ?? 'unknown'}`,
    `- Private-input template pack: ${receipt.evidence.privateInputTemplatePackStatus ?? 'missing'}`,
    `- Private-input example files: ${receipt.evidence.privateInputTemplatePackExampleFileCount ?? 'unknown'}`,
    `- Private-input active path collisions: ${receipt.evidence.privateInputTemplatePackActivePathCollisionCount ?? 'unknown'}`,
    `- Private-input creates active files: ${receipt.evidence.privateInputTemplatePackCreatesActivePrivateInputFiles ?? 'unknown'}`,
    `- Private-input writes real values: ${receipt.evidence.privateInputTemplatePackWritesRealPrivateValues ?? 'unknown'}`,
    `- Post-input orchestrator: ${receipt.evidence.postInputOrchestratorStatus ?? 'missing'}`,
    `- Post-input ready commands: ${receipt.evidence.postInputOrchestratorReadyCommandCount ?? 'unknown'}`,
    `- Post-input commands executed: ${receipt.evidence.postInputOrchestratorCommandsExecuted ?? 'unknown'}`,
    `- Taxonomy consolidation audit: ${receipt.evidence.taxonomyConsolidationAuditStatus ?? 'missing'}`,
    `- Taxonomy live evidence groups: ${receipt.evidence.taxonomyConsolidationLiveEvidenceGroupCount ?? 'unknown'}`,
    `- Taxonomy Brand promotions needed: ${receipt.evidence.taxonomyConsolidationBrandPromotionNeededCount ?? 'unknown'}`,
    `- Taxonomy CRM manifest refresh needed: ${receipt.evidence.taxonomyConsolidationCrmManifestRefreshNeededCount ?? 'unknown'}`,
    `- Taxonomy refresh handoff: ${receipt.evidence.taxonomyRefreshHandoffStatus ?? 'missing'}`,
    `- Taxonomy refresh Brand decisions: ${receipt.evidence.taxonomyRefreshBrandPromotionDecisionCount ?? 'unknown'}`,
    `- Taxonomy refresh CRM patch rows: ${receipt.evidence.taxonomyRefreshCrmManifestPatchCount ?? 'unknown'}`,
    `- Taxonomy refresh can apply CRM patch now: ${receipt.evidence.taxonomyRefreshCanApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy decision intake: ${receipt.evidence.taxonomyRefreshDecisionIntakeStatus ?? 'missing'}`,
    `- Taxonomy decision rows present: ${receipt.evidence.taxonomyRefreshDecisionBrandRowsPresent ?? 'unknown'}/${receipt.evidence.taxonomyRefreshDecisionBrandRowsNeeded ?? 'unknown'}`,
    `- Taxonomy decision ready for local patch preview: ${receipt.evidence.taxonomyRefreshDecisionReadyForLocalPatchPreview ?? 'unknown'}`,
    `- Taxonomy decision can apply CRM patch now: ${receipt.evidence.taxonomyRefreshDecisionCanApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy response workspace: ${receipt.evidence.taxonomyRefreshResponseWorkspaceStatus ?? 'missing'}`,
    `- Taxonomy response pending actors: ${receipt.evidence.taxonomyRefreshResponsePendingActorCount ?? 'unknown'}`,
    `- Taxonomy response ready for intake: ${receipt.evidence.taxonomyRefreshResponseReadyForIntake ?? 'unknown'}`,
    `- Taxonomy response can apply CRM patch now: ${receipt.evidence.taxonomyRefreshResponseCanApplyCrmManifestPatchNow ?? 'unknown'}`,
    `- Taxonomy response request bundle: ${receipt.evidence.taxonomyRefreshResponseRequestBundleStatus ?? 'missing'}`,
    `- Taxonomy response request count: ${receipt.evidence.taxonomyRefreshResponseRequestCount ?? 'unknown'}`,
    `- Taxonomy response request pending actors: ${receipt.evidence.taxonomyRefreshResponseRequestPendingActorCount ?? 'unknown'}`,
    `- Taxonomy response request missing finals: ${receipt.evidence.taxonomyRefreshResponseRequestMissingFinalResponseCount ?? 'unknown'}`,
    `- Taxonomy response request asks live approval: ${receipt.evidence.taxonomyRefreshResponseRequestAsksLiveApproval ?? 'unknown'}`,
    `- Taxonomy response request creates final files: ${receipt.evidence.taxonomyRefreshResponseRequestCreatesFinalResponseFiles ?? 'unknown'}`,
    '',
    '## Commands',
    '',
    renderList(receipt.testScope.commands),
    '',
    '## Hard Stops',
    '',
    renderList(receipt.hardStops),
    '',
    '## Fuentes Consultadas',
    '',
  ];

  for (const source of receipt.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor}; sha256=${source.sha256})`);
  }

  lines.push('', '## Safety', '');
  lines.push('- No live actions.');
  lines.push('- No MailerLite, Shopify or CRM live API calls.');
  lines.push('- No subscribers read or mutated.');
  lines.push('- No group, workflow, send, ledger, card, score or Fact Store mutation.');

  return lines.join('\n');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const receipt = await buildValidationReceiptFromFiles(options);
  if (options.out) await writeJson(options.out, receipt);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(receipt));

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    validationStatus: receipt.validationStatus,
    generatedAt: receipt.generatedAt,
    testFiles: receipt.testScope.testFiles,
    testCount: receipt.testScope.testCount,
    liveGatesClosed: receipt.evidence.liveGatesClosed,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS validation receipt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSafety,
  buildValidationReceipt,
  buildValidationReceiptFromFiles,
  parseArgs,
  renderMarkdown,
};
