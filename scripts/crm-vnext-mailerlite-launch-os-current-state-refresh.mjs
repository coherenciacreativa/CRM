#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-current-state-refresh-2026-05-31';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';
const PACKAGE_JSON = '/Users/alejandrogomez/CRM/package.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs [options]

Options:
  --date <YYYY-MM-DD>       Report date. Defaults to today's ISO date
  --reports-dir <path>      Report output directory. Defaults to ${DEFAULT_REPORTS_DIR}
  --out <path>              Refresh receipt JSON output
  --markdown-out <path>     Refresh receipt Markdown output
  --skip-validation         Skip node --check and focused Vitest commands
  --help                    Show this help

Local-only current-state refresh runner. It runs syntax checks, focused tests,
then regenerates the upstream local packets that feed the Launch OS operator
runbook, goal audit, continuation guard, validation receipt and refresh receipt.
It never calls MailerLite, Shopify or CRM live APIs, opens UI, reads or mutates
subscribers, creates groups, edits workflows, sends emails, appends ledgers,
writes cards, changes scoring, writes Fact Store, or prints tokens.`;

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const mdPathFor = (path) => path.replace(/\.json$/u, '.md');
const reportPath = (reportsDir, name, date) => resolve(reportsDir, `${name}_current_${date}.json`);
const miniLaunchReportPath = (reportsDir, name, date) =>
  resolve(reportsDir, `${name}_current_inteligencia_descansar_${date}.json`);
const staticReportPath = (reportsDir, fileName) => resolve(reportsDir, fileName);
const privateReportPath = (reportsDir, fileName) => resolve(reportsDir, 'private', fileName);

const parseArgs = (argv) => {
  const options = {
    date: todayIsoDate(),
    reportsDir: DEFAULT_REPORTS_DIR,
    out: null,
    markdownOut: null,
    skipValidation: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--date') options.date = argv[++index];
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--skip-validation') options.skipValidation = true;
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(options.date)) {
    throw new Error(`invalid_date:${options.date}`);
  }

  options.reportsDir = resolve(options.reportsDir);
  const defaultOut = reportPath(options.reportsDir, 'mailerlite_launch_os_current_state_refresh', options.date);
  options.out = resolve(options.out ?? defaultOut);
  options.markdownOut = resolve(options.markdownOut ?? mdPathFor(options.out));

  return options;
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
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
  'uiOpened',
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

const buildReportPaths = ({ date, reportsDir }) => {
  const paths = {
    miniLaunchCrmSignalProjectionPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_crm_signal_projection_packet',
      date,
    ),
    miniLaunchCrmWriteApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_crm_write_approval_packet',
      date,
    ),
    miniLaunchEventContract: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json',
    ),
    miniLaunchManualUiBuildReceipt: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json',
    ),
    miniLaunchEmptyGroupCreateExecution: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_empty_group_create_execution_inteligencia_descansar_2026-05-28.json',
    ),
    miniLaunchShopifyLocalBuildReceipt: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json',
    ),
    miniLaunchAssetManifest: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_asset_manifest',
      date,
    ),
    miniLaunchShopifyPublicUrlGate: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_public_url_gate',
      date,
    ),
    miniLaunchShopifyPreviewRouteDecision: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_preview_route_decision',
      date,
    ),
    miniLaunchShopifyPreviewRouteDecisionConfirmation: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_preview_route_decision_confirmation',
      date,
    ),
    miniLaunchShopifyPreviewRouteApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_preview_route_approval_packet',
      date,
    ),
    miniLaunchShopifyPreviewRouteExecutionReceipt: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_shopify_preview_route_execution_receipt',
      date,
    ),
    miniLaunchCrmWritePolicyPacket: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_crm_write_policy_packet_inteligencia_descansar_2026-05-28.json',
    ),
    miniLaunchSeedSendApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_send_approval_packet',
      date,
    ),
    miniLaunchSeedInboxCorrectionPlan: staticReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_inbox_correction_plan_inteligencia_descansar_2026-05-31.json',
    ),
    miniLaunchSeedInboxCorrectionPreview: staticReportPath(
      reportsDir,
      `mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_${date}.json`,
    ),
    miniLaunchEmailRenderQa: staticReportPath(
      reportsDir,
      `mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_${date}.json`,
    ),
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet',
      date,
    ),
    miniLaunchSeedInboxCorrectionUiEditExecutionKit: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit',
      date,
    ),
    miniLaunchSeedInboxCorrectionApiReplacementExecutionReceipt: staticReportPath(
      reportsDir,
      `mailerlite_mini_launch_seed_inbox_correction_api_replacement_execution_receipt_current_inteligencia_descansar_${date}.json`,
    ),
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet',
      date,
    ),
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt: staticReportPath(
      reportsDir,
      `mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_${date}.json`,
    ),
    miniLaunchSeedInboxCorrectionApiEditDiagnostic: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic',
      date,
    ),
    miniLaunchRealMailerLiteRenderQaBeforeSeedSendLatest: staticReportPath(
      reportsDir,
      `mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_${date}-latest.json`,
    ),
    miniLaunchMailerLiteApiInertDraftLab: miniLaunchReportPath(
      reportsDir,
      'mailerlite_api_inert_draft_lab',
      date,
    ),
    miniLaunchMailerLiteApiNullAudienceLab: miniLaunchReportPath(
      reportsDir,
      'mailerlite_api_null_audience_lab',
      date,
    ),
    miniLaunchNullAudienceReplacementApprovalPacket: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_null_audience_replacement_approval_packet',
      date,
    ),
    miniLaunchNullAudienceReplacementExecutionReceipt: miniLaunchReportPath(
      reportsDir,
      'mailerlite_mini_launch_null_audience_replacement_execution_receipt',
      date,
    ),
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy: miniLaunchReportPath(
      reportsDir,
      'mailerlite_api_existing_draft_update_strategy',
      date,
    ),
    privateSeedEmailFile: privateReportPath(
      reportsDir,
      'mailerlite_seed_recipient_inteligencia_descansar.txt',
    ),
    privateObservedEventsFile: privateReportPath(
      reportsDir,
      'mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json',
    ),
    privateCorrectionInputsFile: privateReportPath(
      reportsDir,
      'mailerlite_mini_launch_correction_inputs_inteligencia_descansar_2026-05-31.json',
    ),
    privateInputExamplesDir: resolve(reportsDir, `mailerlite_launch_os_private_input_templates_current_${date}`),
    approvalQueue: reportPath(reportsDir, 'mailerlite_launch_os_approval_queue', date),
    approvalIntake: reportPath(reportsDir, 'mailerlite_launch_os_approval_intake', date),
    blockedGateHandoff: reportPath(reportsDir, 'mailerlite_launch_os_blocked_gate_handoff', date),
    missingInputsKit: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_kit', date),
    missingInputsIntake: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_intake', date),
    missingInputsRequestBundle: reportPath(reportsDir, 'mailerlite_launch_os_missing_inputs_request_bundle', date),
    privateInputTemplatePack: reportPath(reportsDir, 'mailerlite_launch_os_private_input_template_pack', date),
    postInputOrchestrator: reportPath(reportsDir, 'mailerlite_launch_os_post_input_orchestrator', date),
    taxonomyRefreshResponseRequestBundle: reportPath(
      reportsDir,
      'mailerlite_launch_os_taxonomy_refresh_response_request_bundle',
      date,
    ),
    continuationGuard: reportPath(reportsDir, 'mailerlite_launch_os_continuation_guard', date),
    operatorRunbook: reportPath(reportsDir, 'mailerlite_launch_os_operator_runbook', date),
    goalAudit: reportPath(reportsDir, 'mailerlite_launch_os_v0_goal_audit', date),
    validationReceipt: reportPath(reportsDir, 'mailerlite_launch_os_validation_receipt', date),
    currentStateRefresh: reportPath(reportsDir, 'mailerlite_launch_os_current_state_refresh', date),
  };

  return Object.fromEntries(
    Object.entries(paths).flatMap(([key, value]) => [
      [key, value],
      ...(String(value).endsWith('.json') ? [[`${key}Markdown`, mdPathFor(value)]] : []),
    ]),
  );
};

const command = (id, bin, args, purpose) => ({ id, bin, args, purpose });
const formatCommand = ({ bin, args }) => [bin, ...args].join(' ');
const optionalExistingArg = (flag, path) => (existsSync(path) ? [flag, path] : []);
const readOptionalJsonSync = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const mailerLiteApiInertDraftLabExecutionReceiptPresent = (path) => {
  const lab = readOptionalJsonSync(path);
  return lab?.ok === true
    && typeof lab?.status === 'string'
    && lab.status.startsWith('mailerlite_api_inert_draft_lab_completed_')
    && lab?.mode === 'execute_requested'
    && lab?.executiveSummary?.cleanupComplete === true
    && lab?.safety?.mailerLiteApiCalled === true
    && lab?.safety?.mailerLiteMutationsPerformed === true
    && lab?.safety?.originalDraftsEditedOrDeleted === false
    && lab?.safety?.sendsPerformed === false
    && lab?.safety?.campaignsPublished === false
    && lab?.safety?.campaignsScheduled === false
    && lab?.safety?.subscribersRead === false
    && lab?.safety?.subscriberMutationsPerformed === false
    && lab?.safety?.groupsCreatedOrAssigned === false
    && lab?.safety?.segmentsCreatedOrAssigned === false
    && lab?.safety?.workflowMutationsPerformed === false
    && lab?.safety?.shopifyMutationsPerformed === false
    && lab?.safety?.crmLiveApiCalled === false
    && lab?.safety?.tokensPrinted === false;
};

const mailerLiteApiNullAudienceLabExecutionReceiptPresent = (path) => {
  const lab = readOptionalJsonSync(path);
  return lab?.ok === true
    && typeof lab?.status === 'string'
    && lab.status.startsWith('mailerlite_api_null_audience_lab_completed_')
    && lab?.mode === 'execute_requested'
    && lab?.executiveSummary?.cleanupComplete === true
    && lab?.executiveSummary?.safetyGroupActiveCountObserved === 0
    && lab?.safety?.mailerLiteApiCalled === true
    && lab?.safety?.mailerLiteMutationsPerformed === true
    && lab?.safety?.originalDraftsEditedOrDeleted === false
    && lab?.safety?.realLaunchDraftsCreatedOrEdited === false
    && lab?.safety?.realCampaignAudienceAssignmentsPerformed === false
    && lab?.safety?.sendsPerformed === false
    && lab?.safety?.campaignsPublished === false
    && lab?.safety?.campaignsScheduled === false
    && lab?.safety?.subscribersRead === false
    && lab?.safety?.subscriberMutationsPerformed === false
    && lab?.safety?.additionalGroupsCreatedOrAssigned === false
    && lab?.safety?.segmentsCreatedOrAssigned === false
    && lab?.safety?.workflowMutationsPerformed === false
    && lab?.safety?.shopifyMutationsPerformed === false
    && lab?.safety?.crmLiveApiCalled === false
    && lab?.safety?.tokensPrinted === false;
};

const validationCommands = () => [
  command(
    'node_check_current_state_refresh',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs'],
    'syntax-check current-state refresh runner',
  ),
  command(
    'node_check_crm_write_approval_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-crm-write-approval-packet.mjs'],
    'syntax-check mini-launch CRM write approval packet',
  ),
  command(
    'node_check_missing_inputs_kit',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-missing-inputs-kit.mjs'],
    'syntax-check missing-inputs kit',
  ),
  command(
    'node_check_mini_launch_asset_manifest',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-asset-manifest.mjs'],
    'syntax-check mini-launch asset manifest',
  ),
  command(
    'node_check_mini_launch_shopify_public_url_gate',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-shopify-public-url-gate.mjs'],
    'syntax-check mini-launch Shopify public URL gate',
  ),
  command(
    'node_check_mini_launch_shopify_preview_route_decision_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.mjs'],
    'syntax-check mini-launch Shopify preview route decision packet',
  ),
  command(
    'node_check_mini_launch_shopify_preview_route_approval_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.mjs'],
    'syntax-check mini-launch Shopify preview route approval packet',
  ),
  command(
    'node_check_missing_inputs_intake',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs'],
    'syntax-check missing-inputs intake',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_preview',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview.mjs'],
    'syntax-check mini-launch seed inbox correction preview',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_ui_edit_approval_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet.mjs'],
    'syntax-check mini-launch seed inbox correction UI edit approval packet',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_ui_edit_execution_kit',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.mjs'],
    'syntax-check mini-launch seed inbox correction UI edit execution kit',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_ui_edit_receipt',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt.mjs'],
    'syntax-check mini-launch seed inbox correction UI edit receipt',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs'],
    'syntax-check mini-launch unsafe API replacement cleanup approval packet',
  ),
  command(
    'node_check_mini_launch_seed_inbox_correction_api_replacement_cleanup_delete',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete.mjs'],
    'syntax-check mini-launch unsafe API replacement cleanup delete runner',
  ),
  command(
    'node_check_mailerlite_api_inert_draft_lab',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-api-inert-draft-lab.mjs'],
    'syntax-check MailerLite API inert draft lab packet/runner',
  ),
  command(
    'node_check_mailerlite_api_null_audience_lab',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-api-null-audience-lab.mjs'],
    'syntax-check MailerLite API Null Audience lab packet/runner',
  ),
  command(
    'node_check_mini_launch_null_audience_replacement_approval_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs'],
    'syntax-check mini-launch MailerLite API Null Audience replacement approval packet',
  ),
  command(
    'node_check_mini_launch_null_audience_replacement_create',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs'],
    'syntax-check mini-launch MailerLite API Null Audience replacement create runner',
  ),
  command(
    'node_check_mailerlite_api_existing_draft_update_strategy_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-api-existing-draft-update-strategy-packet.mjs'],
    'syntax-check MailerLite API existing draft update strategy packet',
  ),
  command(
    'node_check_mini_launch_email_render_qa_packet',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs'],
    'syntax-check mini-launch email render QA packet',
  ),
  command(
    'node_check_missing_inputs_request_bundle',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle.mjs'],
    'syntax-check missing-inputs request bundle',
  ),
  command(
    'node_check_private_input_template_pack',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-private-input-template-pack.mjs'],
    'syntax-check private-input template pack',
  ),
  command(
    'node_check_post_input_orchestrator',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-post-input-orchestrator.mjs'],
    'syntax-check post-input orchestrator',
  ),
  command(
    'node_check_continuation_guard',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-continuation-guard.mjs'],
    'syntax-check continuation guard',
  ),
  command(
    'node_check_operator_runbook',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs'],
    'syntax-check operator runbook',
  ),
  command(
    'node_check_goal_audit',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs'],
    'syntax-check goal audit',
  ),
  command(
    'node_check_validation_receipt',
    'node',
    ['--check', 'scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs'],
    'syntax-check validation receipt',
  ),
  command(
    'focused_vitest',
    'npm',
    [
      'exec',
      'vitest',
      'run',
      '__tests__/crm-vnext-mailerlite-launch-os-current-state-refresh.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-asset-manifest.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-shopify-public-url-gate.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement.spec.ts',
      '__tests__/crm-vnext-mailerlite-api-inert-draft-lab.spec.ts',
      '__tests__/crm-vnext-mailerlite-api-null-audience-lab.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-null-audience-replacement.spec.ts',
      '__tests__/crm-vnext-mailerlite-api-existing-draft-update-strategy-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-mini-launch-crm-write-approval-packet.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-missing-inputs-kit.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-missing-inputs-intake.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-missing-inputs-request-bundle.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-private-input-template-pack.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-post-input-orchestrator.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-continuation-guard.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-operator-runbook.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-goal-audit.spec.ts',
      '__tests__/crm-vnext-mailerlite-launch-os-validation-receipt.spec.ts',
    ],
    'focused Launch OS current-state validation suite',
  ),
];

const currentStateArgs = (paths) => [
  '--approval-queue',
  paths.approvalQueue,
  '--mini-launch-crm-write-approval-packet',
  paths.miniLaunchCrmWriteApprovalPacket,
  '--mini-launch-seed-inbox-correction-plan',
  paths.miniLaunchSeedInboxCorrectionPlan,
  '--mini-launch-email-render-qa',
  paths.miniLaunchEmailRenderQa,
  '--mini-launch-seed-inbox-correction-ui-edit-approval-packet',
  paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
  '--mini-launch-shopify-preview-route-decision',
  paths.miniLaunchShopifyPreviewRouteDecision,
  '--mini-launch-shopify-preview-route-execution-receipt',
  paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
  '--approval-intake',
  paths.approvalIntake,
  '--blocked-gate-handoff',
  paths.blockedGateHandoff,
  '--missing-inputs-kit',
  paths.missingInputsKit,
  '--missing-inputs-intake',
  paths.missingInputsIntake,
  '--missing-inputs-request-bundle',
  paths.missingInputsRequestBundle,
  '--private-input-template-pack',
  paths.privateInputTemplatePack,
  '--post-input-orchestrator',
  paths.postInputOrchestrator,
  '--taxonomy-refresh-response-request-bundle',
  paths.taxonomyRefreshResponseRequestBundle,
  '--continuation-guard',
  paths.continuationGuard,
  '--validation-receipt',
  paths.validationReceipt,
];

const buildValidationSummary = (validationResult) => {
  if (!validationResult.runValidation) return 'Validation skipped by operator; report regeneration remained local-only.';
  return [
    'Local current-state refresh validation passed:',
    'node --check for current-state refresh, upstream missing-input packets, continuation guard, operator runbook, goal audit and validation receipt;',
    `focused Vitest ${validationResult.testFiles ?? 'unknown'} files / ${validationResult.testCount ?? 'unknown'} tests;`,
    'no live actions.',
  ].join(' ');
};

const buildReportCommands = (paths, validationResult) => {
  const validationSummary = buildValidationSummary(validationResult);
  const validationCommandStrings = validationResult.commands.map((entry) => formatCommand(entry));
  const validationReceiptArgs = [
    '--runbook',
    paths.operatorRunbook,
    '--goal-audit',
    paths.goalAudit,
    '--continuation-guard',
    paths.continuationGuard,
    '--missing-inputs-intake',
    paths.missingInputsIntake,
    '--missing-inputs-request-bundle',
    paths.missingInputsRequestBundle,
    '--private-input-template-pack',
    paths.privateInputTemplatePack,
    '--post-input-orchestrator',
    paths.postInputOrchestrator,
    '--taxonomy-refresh-response-request-bundle',
    paths.taxonomyRefreshResponseRequestBundle,
    '--mini-launch-shopify-preview-route-decision',
    paths.miniLaunchShopifyPreviewRouteDecision,
    '--mini-launch-shopify-preview-route-execution-receipt',
    paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
    '--validation-status',
    validationResult.runValidation ? 'passed' : 'needs_validation',
    '--validation-summary',
    validationSummary,
    '--test-files',
    String(validationResult.testFiles ?? 0),
    '--test-count',
    String(validationResult.testCount ?? 0),
    '--out',
    paths.validationReceipt,
    '--markdown-out',
    paths.validationReceiptMarkdown,
  ];

  for (const validationCommandString of validationCommandStrings) {
    validationReceiptArgs.push('--command', validationCommandString);
  }

  return [
    command(
      'refresh_mini_launch_crm_write_approval_packet',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-crm-write-approval-packet',
        '--',
        '--signal-projection-packet',
        paths.miniLaunchCrmSignalProjectionPacket,
        '--event-contract',
        paths.miniLaunchEventContract,
        '--manual-ui-build-receipt',
        paths.miniLaunchManualUiBuildReceipt,
        '--group-create-execution',
        paths.miniLaunchEmptyGroupCreateExecution,
        '--shopify-local-build-receipt',
        paths.miniLaunchShopifyLocalBuildReceipt,
        '--write-policy-packet',
        paths.miniLaunchCrmWritePolicyPacket,
        ...optionalExistingArg('--observed-events-file', paths.privateObservedEventsFile),
        '--out',
        paths.miniLaunchCrmWriteApprovalPacket,
        '--markdown-out',
        paths.miniLaunchCrmWriteApprovalPacketMarkdown,
      ],
      'regenerate current mini-launch CRM write approval packet from local evidence only',
    ),
    command(
      'refresh_mini_launch_asset_manifest',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-asset-manifest',
        '--',
        '--shopify-local-build-receipt',
        paths.miniLaunchShopifyLocalBuildReceipt,
        '--shopify-preview-route-execution-receipt',
        paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
        '--out',
        paths.miniLaunchAssetManifest,
        '--markdown-out',
        paths.miniLaunchAssetManifestMarkdown,
      ],
      'regenerate current mini-launch asset manifest from local Shopify evidence only',
    ),
    command(
      'refresh_mini_launch_shopify_public_url_gate',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-shopify-public-url-gate',
        '--',
        '--asset-manifest',
        paths.miniLaunchAssetManifest,
        '--shopify-local-build-receipt',
        paths.miniLaunchShopifyLocalBuildReceipt,
        '--out',
        paths.miniLaunchShopifyPublicUrlGate,
        '--markdown-out',
        paths.miniLaunchShopifyPublicUrlGateMarkdown,
      ],
      'regenerate current Shopify public URL gate without approval phrase or live publish',
    ),
    command(
      'refresh_mini_launch_shopify_preview_route_decision',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-shopify-preview-route-decision-packet',
        '--',
        '--shopify-public-url-gate',
        paths.miniLaunchShopifyPublicUrlGate,
        '--asset-manifest',
        paths.miniLaunchAssetManifest,
        '--shopify-local-build-receipt',
        paths.miniLaunchShopifyLocalBuildReceipt,
        '--out',
        paths.miniLaunchShopifyPreviewRouteDecision,
        '--markdown-out',
        paths.miniLaunchShopifyPreviewRouteDecisionMarkdown,
      ],
      'regenerate current Shopify preview route decision packet without approval phrase or live publish',
    ),
    command(
      'refresh_mini_launch_shopify_preview_route_approval_packet',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-shopify-preview-route-approval-packet',
        '--',
        '--preview-route-decision',
        paths.miniLaunchShopifyPreviewRouteDecision,
        '--decision-confirmation',
        paths.miniLaunchShopifyPreviewRouteDecisionConfirmation,
        '--out',
        paths.miniLaunchShopifyPreviewRouteApprovalPacket,
        '--markdown-out',
        paths.miniLaunchShopifyPreviewRouteApprovalPacketMarkdown,
      ],
      'regenerate current Shopify preview route approval packet from local confirmation evidence only',
    ),
    command(
      'refresh_mini_launch_seed_inbox_correction_ui_edit_approval_packet',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet',
        '--',
        '--correction-preview',
        paths.miniLaunchSeedInboxCorrectionPreview,
        '--email-render-qa',
        paths.miniLaunchEmailRenderQa,
        '--manual-ui-build-receipt',
        paths.miniLaunchManualUiBuildReceipt,
        '--shopify-preview-route-execution-receipt',
        paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
        '--out',
        paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
        '--markdown-out',
        paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacketMarkdown,
      ],
      'regenerate current MailerLite UI correction-edit approval packet from local QA evidence only',
    ),
    command(
      'refresh_mini_launch_seed_inbox_correction_ui_edit_execution_kit',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit',
        '--',
        '--approval-packet',
        paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
        '--correction-preview',
        paths.miniLaunchSeedInboxCorrectionPreview,
        '--email-render-qa',
        paths.miniLaunchEmailRenderQa,
        '--out',
        paths.miniLaunchSeedInboxCorrectionUiEditExecutionKit,
        '--markdown-out',
        paths.miniLaunchSeedInboxCorrectionUiEditExecutionKitMarkdown,
      ],
      'regenerate current MailerLite UI correction-edit execution kit without opening UI',
    ),
    command(
      'refresh_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet',
        '--',
        '--execution-receipt',
        paths.miniLaunchSeedInboxCorrectionApiReplacementExecutionReceipt,
        '--out',
        paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
        '--markdown-out',
        paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacketMarkdown,
      ],
      'regenerate local approval packet for cleaning unsafe API replacement drafts without deleting anything',
    ),
    ...(mailerLiteApiInertDraftLabExecutionReceiptPresent(paths.miniLaunchMailerLiteApiInertDraftLab) ? [] : [command(
      'refresh_mini_launch_mailerlite_api_inert_draft_lab',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-api-inert-draft-lab',
        '--',
        '--real-mailerlite-render-qa',
        paths.miniLaunchRealMailerLiteRenderQaBeforeSeedSendLatest,
        '--out',
        paths.miniLaunchMailerLiteApiInertDraftLab,
        '--markdown-out',
        paths.miniLaunchMailerLiteApiInertDraftLabMarkdown,
      ],
      'regenerate current MailerLite API inert draft lab packet without executing the lab',
    )]),
    ...(mailerLiteApiNullAudienceLabExecutionReceiptPresent(paths.miniLaunchMailerLiteApiNullAudienceLab) ? [] : [command(
      'refresh_mini_launch_mailerlite_api_null_audience_lab',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-api-null-audience-lab',
        '--',
        '--real-mailerlite-render-qa',
        paths.miniLaunchRealMailerLiteRenderQaBeforeSeedSendLatest,
        '--out',
        paths.miniLaunchMailerLiteApiNullAudienceLab,
        '--markdown-out',
        paths.miniLaunchMailerLiteApiNullAudienceLabMarkdown,
      ],
      'regenerate current MailerLite API Null Audience lab packet without executing the lab',
    )]),
    command(
      'refresh_mini_launch_null_audience_replacement_approval_packet',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-mini-launch-null-audience-replacement-approval-packet',
        '--',
        '--correction-preview',
        paths.miniLaunchSeedInboxCorrectionPreview,
        '--email-render-qa',
        paths.miniLaunchEmailRenderQa,
        '--shopify-preview-route-execution-receipt',
        paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
        '--null-audience-lab',
        paths.miniLaunchMailerLiteApiNullAudienceLab,
        '--real-mailerlite-render-qa',
        paths.miniLaunchRealMailerLiteRenderQaBeforeSeedSendLatest,
        '--out',
        paths.miniLaunchNullAudienceReplacementApprovalPacket,
        '--markdown-out',
        paths.miniLaunchNullAudienceReplacementApprovalPacketMarkdown,
      ],
      'regenerate local MailerLite API Null Audience replacement approval packet without calling live APIs',
    ),
    command(
      'refresh_mini_launch_mailerlite_api_existing_draft_update_strategy',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-api-existing-draft-update-strategy-packet',
        '--',
        '--api-edit-diagnostic',
        paths.miniLaunchSeedInboxCorrectionApiEditDiagnostic,
        '--api-inert-draft-lab',
        paths.miniLaunchMailerLiteApiInertDraftLab,
        '--ui-edit-approval-packet',
        paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
        '--api-replacement-cleanup-receipt',
        paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
        '--out',
        paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
        '--markdown-out',
        paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategyMarkdown,
      ],
      'regenerate local MailerLite API existing-draft update strategy without calling live APIs',
    ),
    command(
      'refresh_approval_queue',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-approval-queue',
        '--',
        '--mini-launch-seed-send-approval-packet',
        paths.miniLaunchSeedSendApprovalPacket,
        '--mini-launch-shopify-preview-route-decision',
        paths.miniLaunchShopifyPreviewRouteDecision,
        '--mini-launch-shopify-preview-route-approval-packet',
        paths.miniLaunchShopifyPreviewRouteApprovalPacket,
        '--mini-launch-shopify-preview-route-execution-receipt',
        paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
        '--mini-launch-seed-inbox-correction-ui-edit-approval-packet',
        paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
        '--mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet',
        paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
        '--mini-launch-seed-inbox-correction-api-replacement-cleanup-execution-receipt',
        paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
        '--mini-launch-mailerlite-api-inert-draft-lab',
        paths.miniLaunchMailerLiteApiInertDraftLab,
        '--mini-launch-mailerlite-api-null-audience-lab',
        paths.miniLaunchMailerLiteApiNullAudienceLab,
        '--mini-launch-null-audience-replacement-approval-packet',
        paths.miniLaunchNullAudienceReplacementApprovalPacket,
        '--mini-launch-null-audience-replacement-execution-receipt',
        paths.miniLaunchNullAudienceReplacementExecutionReceipt,
        '--mini-launch-mailerlite-api-existing-draft-update-strategy',
        paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
        '--mini-launch-crm-signal-projection-packet',
        paths.miniLaunchCrmSignalProjectionPacket,
        '--mini-launch-crm-write-approval-packet',
        paths.miniLaunchCrmWriteApprovalPacket,
        '--validation-receipt',
        paths.validationReceipt,
        '--out',
        paths.approvalQueue,
        '--markdown-out',
        paths.approvalQueueMarkdown,
      ],
      'regenerate current Launch OS approval queue report',
    ),
    command(
      'refresh_approval_intake',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-approval-intake',
        '--',
        '--approval-queue',
        paths.approvalQueue,
        '--out',
        paths.approvalIntake,
        '--markdown-out',
        paths.approvalIntakeMarkdown,
      ],
      'regenerate current approval intake with no approval text so stale approvals cannot be recycled',
    ),
    command(
      'refresh_blocked_gate_handoff',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-blocked-gate-handoff',
        '--',
        '--approval-queue',
        paths.approvalQueue,
        '--runbook',
        paths.operatorRunbook,
        '--goal-audit',
        paths.goalAudit,
        '--seed-send-approval',
        paths.miniLaunchSeedSendApprovalPacket,
        '--crm-write-approval',
        paths.miniLaunchCrmWriteApprovalPacket,
        '--out',
        paths.blockedGateHandoff,
        '--markdown-out',
        paths.blockedGateHandoffMarkdown,
      ],
      'regenerate current blocked-gate handoff from refreshed local approval queue',
    ),
    command(
      'refresh_missing_inputs_kit',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-missing-inputs-kit',
        '--',
        '--blocked-gate-handoff',
        paths.blockedGateHandoff,
        '--seed-send-approval',
        paths.miniLaunchSeedSendApprovalPacket,
        '--crm-write-approval',
        paths.miniLaunchCrmWriteApprovalPacket,
        '--runbook',
        paths.operatorRunbook,
        '--seed-inbox-correction-plan',
        paths.miniLaunchSeedInboxCorrectionPlan,
        '--private-seed-email-file',
        paths.privateSeedEmailFile,
        '--observed-events-file',
        paths.privateObservedEventsFile,
        '--correction-inputs-file',
        paths.privateCorrectionInputsFile,
        '--launch-asset-manifest',
        paths.miniLaunchAssetManifest,
        '--out',
        paths.missingInputsKit,
        '--markdown-out',
        paths.missingInputsKitMarkdown,
      ],
      'regenerate current missing-inputs kit without creating private inputs',
    ),
    command(
      'refresh_missing_inputs_intake',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-missing-inputs-intake',
        '--',
        '--missing-inputs-kit',
        paths.missingInputsKit,
        '--operator-runbook',
        paths.operatorRunbook,
        '--crm-write-approval-packet',
        paths.miniLaunchCrmWriteApprovalPacket,
        '--seed-email-file',
        paths.privateSeedEmailFile,
        '--observed-events-file',
        paths.privateObservedEventsFile,
        '--correction-inputs-file',
        paths.privateCorrectionInputsFile,
        '--launch-asset-manifest',
        paths.miniLaunchAssetManifest,
        '--out',
        paths.missingInputsIntake,
        '--markdown-out',
        paths.missingInputsIntakeMarkdown,
      ],
      'regenerate current missing-inputs intake and redacted private-input readiness',
    ),
    command(
      'refresh_missing_inputs_request_bundle',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle',
        '--',
        '--missing-inputs-kit',
        paths.missingInputsKit,
        '--missing-inputs-intake',
        paths.missingInputsIntake,
        '--blocked-gate-handoff',
        paths.blockedGateHandoff,
        '--out',
        paths.missingInputsRequestBundle,
        '--markdown-out',
        paths.missingInputsRequestBundleMarkdown,
      ],
      'regenerate current copy-ready missing-input request bundle',
    ),
    command(
      'refresh_private_input_template_pack',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-private-input-template-pack',
        '--',
        '--missing-inputs-kit',
        paths.missingInputsKit,
        '--examples-dir',
        paths.privateInputExamplesDir,
        '--no-write-examples',
        '--out',
        paths.privateInputTemplatePack,
        '--markdown-out',
        paths.privateInputTemplatePackMarkdown,
      ],
      'regenerate current inert private-input template pack report without writing example files',
    ),
    command(
      'refresh_post_input_orchestrator',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-post-input-orchestrator',
        '--',
        '--missing-inputs-intake',
        paths.missingInputsIntake,
        '--missing-inputs-request-bundle',
        paths.missingInputsRequestBundle,
        '--private-input-template-pack',
        paths.privateInputTemplatePack,
        '--out',
        paths.postInputOrchestrator,
        '--markdown-out',
        paths.postInputOrchestratorMarkdown,
      ],
      'regenerate current post-input local orchestrator report',
    ),
    command(
      'refresh_operator_runbook',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-operator-runbook',
        '--',
        '--mini-launch-crm-signal-projection-packet',
        paths.miniLaunchCrmSignalProjectionPacket,
        ...currentStateArgs(paths),
        '--out',
        paths.operatorRunbook,
        '--markdown-out',
        paths.operatorRunbookMarkdown,
      ],
      'regenerate current Launch OS operator runbook report',
    ),
    command(
      'refresh_goal_audit',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-goal-audit',
        '--',
        '--runbook',
        paths.operatorRunbook,
        ...currentStateArgs(paths),
        '--validation-status',
        validationResult.runValidation ? 'passed' : 'needs_validation',
        '--validation-summary',
        validationSummary,
        '--out',
        paths.goalAudit,
        '--markdown-out',
        paths.goalAuditMarkdown,
      ],
      'regenerate current Launch OS goal audit report',
    ),
    command(
      'refresh_continuation_guard',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-continuation-guard',
        '--',
        '--runbook',
        paths.operatorRunbook,
        '--goal-audit',
        paths.goalAudit,
        '--missing-inputs-kit',
        paths.missingInputsKit,
        '--validation-receipt',
        paths.validationReceipt,
        '--out',
        paths.continuationGuard,
        '--markdown-out',
        paths.continuationGuardMarkdown,
      ],
      'regenerate current continuation guard after refreshed runbook and goal audit',
    ),
    command(
      'refresh_validation_receipt',
      'npm',
      [
        'run',
        'crm:vnext:mailerlite-launch-os-validation-receipt',
        '--',
        ...validationReceiptArgs,
      ],
      'regenerate current Launch OS validation receipt report',
    ),
  ];
};

const buildCurrentStateRefreshPlan = ({ date, reportsDir, skipValidation = false }) => {
  const paths = buildReportPaths({ date, reportsDir });
  const checks = skipValidation ? [] : validationCommands();
  const placeholderValidation = {
    runValidation: !skipValidation,
    commands: checks,
    testFiles: null,
    testCount: null,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    date,
    reportsDir: resolve(reportsDir),
    paths,
    validationCommands: checks,
    reportCommands: buildReportCommands(paths, placeholderValidation),
    safety: buildSafety(),
  };
};

const assertLocalOnlyCommandPlan = (plan) => {
  const allCommands = [...plan.validationCommands, ...plan.reportCommands];
  const forbiddenArgs = new Set(['--write', '--execute']);
  const forbiddenScripts = [
    'crm:vnext:mailerlite-mini-launch-empty-group-create',
    'crm:vnext:mailerlite-onboarding-v2-empty-groups-create',
    'crm:vnext:mailerlite-brujula-test-lane-apply',
  ];

  for (const entry of allCommands) {
    if (entry.args.some((arg) => forbiddenArgs.has(arg))) {
      throw new Error(`non_local_command_arg:${entry.id}`);
    }
    if (entry.args.some((arg) => forbiddenScripts.includes(arg))) {
      throw new Error(`live_or_live_adjacent_script_not_allowed:${entry.id}`);
    }
  }

  if (!safetyClosed(plan.safety)) throw new Error('safety_not_closed');
  return true;
};

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/gu, '');
const tailText = (value, maxLines = 60) => stripAnsi(value ?? '').trim().split('\n').filter(Boolean).slice(-maxLines).join('\n');

const runCommand = (entry) => {
  const startedAt = new Date().toISOString();
  const result = spawnSync(entry.bin, entry.args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: false,
  });
  const finishedAt = new Date().toISOString();
  const stdoutTail = tailText(result.stdout);
  const stderrTail = tailText(result.stderr);

  return {
    id: entry.id,
    purpose: entry.purpose,
    command: formatCommand(entry),
    startedAt,
    finishedAt,
    exitCode: result.status ?? 1,
    signal: result.signal,
    ok: result.status === 0,
    stdoutTail,
    stderrTail,
    error: result.error ? result.error.message : null,
  };
};

const parseVitestCounts = (results) => {
  const vitest = results.find((result) => result.id === 'focused_vitest');
  if (!vitest) return { testFiles: null, testCount: null };
  const output = stripAnsi(`${vitest.stdoutTail}\n${vitest.stderrTail}`);
  const filesMatch = output.match(/Test Files\s+(\d+) passed/u);
  const testsMatch = output.match(/Tests\s+(\d+) passed/u);
  return {
    testFiles: filesMatch ? Number(filesMatch[1]) : null,
    testCount: testsMatch ? Number(testsMatch[1]) : null,
  };
};

const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const summarizeGeneratedReports = async (paths) => {
  const [
    crmWriteApprovalPacket,
    approvalQueue,
    approvalIntake,
    blockedGateHandoff,
    miniLaunchAssetManifest,
    miniLaunchShopifyPublicUrlGate,
    miniLaunchShopifyPreviewRouteDecision,
    miniLaunchShopifyPreviewRouteApprovalPacket,
    miniLaunchShopifyPreviewRouteExecutionReceipt,
    miniLaunchEmailRenderQa,
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
    miniLaunchSeedInboxCorrectionUiEditExecutionKit,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
    miniLaunchMailerLiteApiInertDraftLab,
    miniLaunchMailerLiteApiNullAudienceLab,
    miniLaunchNullAudienceReplacementApprovalPacket,
    miniLaunchNullAudienceReplacementExecutionReceipt,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
    missingInputsKit,
    missingInputsIntake,
    missingInputsRequestBundle,
    privateInputTemplatePack,
    postInputOrchestrator,
    continuationGuard,
    runbook,
    goalAudit,
    validationReceipt,
  ] = await Promise.all([
    readOptionalJson(paths.miniLaunchCrmWriteApprovalPacket),
    readOptionalJson(paths.approvalQueue),
    readOptionalJson(paths.approvalIntake),
    readOptionalJson(paths.blockedGateHandoff),
    readOptionalJson(paths.miniLaunchAssetManifest),
    readOptionalJson(paths.miniLaunchShopifyPublicUrlGate),
    readOptionalJson(paths.miniLaunchShopifyPreviewRouteDecision),
    readOptionalJson(paths.miniLaunchShopifyPreviewRouteApprovalPacket),
    readOptionalJson(paths.miniLaunchShopifyPreviewRouteExecutionReceipt),
    readOptionalJson(paths.miniLaunchEmailRenderQa),
    readOptionalJson(paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket),
    readOptionalJson(paths.miniLaunchSeedInboxCorrectionUiEditExecutionKit),
    readOptionalJson(paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket),
    readOptionalJson(paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt),
    readOptionalJson(paths.miniLaunchMailerLiteApiInertDraftLab),
    readOptionalJson(paths.miniLaunchMailerLiteApiNullAudienceLab),
    readOptionalJson(paths.miniLaunchNullAudienceReplacementApprovalPacket),
    readOptionalJson(paths.miniLaunchNullAudienceReplacementExecutionReceipt),
    readOptionalJson(paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy),
    readOptionalJson(paths.missingInputsKit),
    readOptionalJson(paths.missingInputsIntake),
    readOptionalJson(paths.missingInputsRequestBundle),
    readOptionalJson(paths.privateInputTemplatePack),
    readOptionalJson(paths.postInputOrchestrator),
    readOptionalJson(paths.continuationGuard),
    readOptionalJson(paths.operatorRunbook),
    readOptionalJson(paths.goalAudit),
    readOptionalJson(paths.validationReceipt),
  ]);

  return {
    crmWriteApprovalPacket: {
      path: paths.miniLaunchCrmWriteApprovalPacket,
      markdownPath: paths.miniLaunchCrmWriteApprovalPacketMarkdown,
      status: crmWriteApprovalPacket?.status ?? null,
      ok: crmWriteApprovalPacket?.ok ?? null,
      exactEventCountReady: crmWriteApprovalPacket?.executiveSummary?.exactEventCountReady ?? null,
      exactPersonCountReady: crmWriteApprovalPacket?.executiveSummary?.exactPersonCountReady ?? null,
      internalSeedOrQaCount: crmWriteApprovalPacket?.approvalBoundary?.observedEventsSummary?.internalSeedOrQaCount ?? null,
    },
    approvalQueue: {
      path: paths.approvalQueue,
      markdownPath: paths.approvalQueueMarkdown,
      status: approvalQueue?.status ?? null,
      ok: approvalQueue?.ok ?? null,
      readyApprovalRequestCount: approvalQueue?.executiveSummary?.readyApprovalRequestCount ?? null,
      blockedApprovalRequestCount: approvalQueue?.executiveSummary?.blockedApprovalRequestCount ?? null,
      openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? null,
    },
    approvalIntake: {
      path: paths.approvalIntake,
      markdownPath: paths.approvalIntakeMarkdown,
      status: approvalIntake?.status ?? null,
      ok: approvalIntake?.ok ?? null,
      approvalTextProvided: approvalIntake?.executiveSummary?.approvalTextProvided ?? null,
      matchedApprovalCount: approvalIntake?.executiveSummary?.matchedApprovalCount ?? null,
      matchedApprovalId: approvalIntake?.executiveSummary?.matchedApprovalId ?? null,
      executionAllowedNow: approvalIntake?.executiveSummary?.executionAllowedNow ?? null,
      openLiveMutationGateCount: approvalIntake?.executiveSummary?.openLiveMutationGateCount ?? null,
    },
    blockedGateHandoff: {
      path: paths.blockedGateHandoff,
      markdownPath: paths.blockedGateHandoffMarkdown,
      status: blockedGateHandoff?.status ?? null,
      ok: blockedGateHandoff?.ok ?? null,
      inputNeededCount: blockedGateHandoff?.executiveSummary?.inputNeededCount ?? null,
      openLiveMutationGateCount: blockedGateHandoff?.executiveSummary?.openLiveMutationGateCount ?? null,
    },
    miniLaunchAssetManifest: {
      path: paths.miniLaunchAssetManifest,
      markdownPath: paths.miniLaunchAssetManifestMarkdown,
      status: miniLaunchAssetManifest?.status ?? null,
      ok: miniLaunchAssetManifest?.ok ?? null,
      finalPublicLinksReady: miniLaunchAssetManifest?.executiveSummary?.finalPublicLinksReady ?? null,
      publicAudienceSendUrlGateReady: miniLaunchAssetManifest?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      linkLifecyclePolicy: miniLaunchAssetManifest?.executiveSummary?.linkLifecyclePolicy ?? null,
      requiresAlejandroManualLinks: miniLaunchAssetManifest?.executiveSummary?.requiresAlejandroManualLinks ?? null,
      subscriptionReasonPolicy: miniLaunchAssetManifest?.executiveSummary?.subscriptionReasonPolicy ?? null,
    },
    miniLaunchShopifyPublicUrlGate: {
      path: paths.miniLaunchShopifyPublicUrlGate,
      markdownPath: paths.miniLaunchShopifyPublicUrlGateMarkdown,
      status: miniLaunchShopifyPublicUrlGate?.status ?? null,
      ok: miniLaunchShopifyPublicUrlGate?.ok ?? null,
      finalPublicLinksReady: miniLaunchShopifyPublicUrlGate?.executiveSummary?.finalPublicLinksReady ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchShopifyPublicUrlGate?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      noSeparateUrlSetsRequired: miniLaunchShopifyPublicUrlGate?.executiveSummary?.noSeparateUrlSetsRequired ?? null,
      approvalPhraseAvailable: miniLaunchShopifyPublicUrlGate?.executiveSummary?.approvalPhraseAvailable ?? null,
      recommendedVisibilityTier: miniLaunchShopifyPublicUrlGate?.executiveSummary?.recommendedVisibilityTier ?? null,
      fullyPublicNavigationRequiredNow:
        miniLaunchShopifyPublicUrlGate?.executiveSummary?.fullyPublicNavigationRequiredNow ?? null,
      seoIndexingAllowedNow: miniLaunchShopifyPublicUrlGate?.executiveSummary?.seoIndexingAllowedNow ?? null,
      decisionExplanationRequiredBeforeApprovalPhrase:
        miniLaunchShopifyPublicUrlGate?.executiveSummary?.decisionExplanationRequiredBeforeApprovalPhrase ?? null,
      canPublishNow: miniLaunchShopifyPublicUrlGate?.executiveSummary?.canPublishNow ?? null,
    },
    miniLaunchShopifyPreviewRouteDecision: {
      path: paths.miniLaunchShopifyPreviewRouteDecision,
      markdownPath: paths.miniLaunchShopifyPreviewRouteDecisionMarkdown,
      status: miniLaunchShopifyPreviewRouteDecision?.status ?? null,
      ok: miniLaunchShopifyPreviewRouteDecision?.ok ?? null,
      recommendedVisibilityTier:
        miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.recommendedVisibilityTier ?? null,
      decisionExplanationReady:
        miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.decisionExplanationReady ?? null,
      exactApprovalPhraseAvailable:
        miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      exactApprovalPhrasePrinted:
        miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.exactApprovalPhrasePrinted ?? null,
      canAskApprovalNow: miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.canAskApprovalNow ?? null,
      canPublishNow: miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.canPublishNow ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchShopifyPreviewRouteDecision?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
    },
    miniLaunchShopifyPreviewRouteApprovalPacket: {
      path: paths.miniLaunchShopifyPreviewRouteApprovalPacket,
      markdownPath: paths.miniLaunchShopifyPreviewRouteApprovalPacketMarkdown,
      status: miniLaunchShopifyPreviewRouteApprovalPacket?.status ?? null,
      ok: miniLaunchShopifyPreviewRouteApprovalPacket?.ok ?? null,
      humanDecisionConfirmed:
        miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.humanDecisionConfirmed ?? null,
      exactApprovalPhraseAvailable:
        miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      exactApprovalPhrasePrinted:
        miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.exactApprovalPhrasePrinted ?? null,
      canAskApprovalNow: miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.canAskApprovalNow ?? null,
      canExecuteNow: miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.canExecuteNow ?? null,
      canPublishNow: miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.canPublishNow ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchShopifyPreviewRouteApprovalPacket?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
    },
    miniLaunchShopifyPreviewRouteExecutionReceipt: {
      path: paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
      markdownPath: paths.miniLaunchShopifyPreviewRouteExecutionReceiptMarkdown,
      status: miniLaunchShopifyPreviewRouteExecutionReceipt?.status ?? null,
      ok: miniLaunchShopifyPreviewRouteExecutionReceipt?.ok ?? null,
      previewRouteReady:
        miniLaunchShopifyPreviewRouteExecutionReceipt?.executionSummary?.previewRouteReady ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchShopifyPreviewRouteExecutionReceipt?.executionSummary?.publicAudienceSendUrlGateReady ?? null,
      targetLinkCount:
        miniLaunchShopifyPreviewRouteExecutionReceipt?.executionSummary?.targetLinkCount ?? null,
      effectivePreviewView:
        miniLaunchShopifyPreviewRouteExecutionReceipt?.executionSummary?.effectivePreviewView ?? null,
    },
    miniLaunchEmailRenderQa: {
      path: paths.miniLaunchEmailRenderQa,
      markdownPath: paths.miniLaunchEmailRenderQaMarkdown,
      status: miniLaunchEmailRenderQa?.status ?? null,
      ok: miniLaunchEmailRenderQa?.ok ?? null,
      localRenderReady: miniLaunchEmailRenderQa?.executiveSummary?.localRenderReady ?? null,
      emailCount: miniLaunchEmailRenderQa?.executiveSummary?.emailCount ?? null,
      renderPreviewNonEmptyCount:
        miniLaunchEmailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      redCheckCount: miniLaunchEmailRenderQa?.executiveSummary?.redCheckCount ?? null,
      publicUseReady: miniLaunchEmailRenderQa?.executiveSummary?.publicUseReady ?? null,
      mailerLiteBuilderReady: miniLaunchEmailRenderQa?.executiveSummary?.mailerLiteBuilderReady ?? null,
      seedSendReady: miniLaunchEmailRenderQa?.executiveSummary?.seedSendReady ?? null,
    },
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket: {
      path: paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
      markdownPath: paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacketMarkdown,
      status: miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.status ?? null,
      ok: miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.ok ?? null,
      canAskAlejandroForApproval:
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.executiveSummary?.canAskAlejandroForApproval ?? null,
      targetDraftCount:
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.executiveSummary?.targetDraftCount ?? null,
      localRenderReady:
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.executiveSummary?.emailRenderLocalReady ?? null,
      blockerCount:
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.executiveSummary?.blockerCount ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
    },
    miniLaunchSeedInboxCorrectionUiEditExecutionKit: {
      path: paths.miniLaunchSeedInboxCorrectionUiEditExecutionKit,
      markdownPath: paths.miniLaunchSeedInboxCorrectionUiEditExecutionKitMarkdown,
      status: miniLaunchSeedInboxCorrectionUiEditExecutionKit?.status ?? null,
      ok: miniLaunchSeedInboxCorrectionUiEditExecutionKit?.ok ?? null,
      targetDraftCount:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.targetDraftCount ?? null,
      htmlSourceReadyCount:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.htmlSourceReadyCount ?? null,
      previewReadyCount:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.previewReadyCount ?? null,
      canOpenBrowserNow:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.canOpenBrowserNow ?? null,
      canEditDraftsNow:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.canEditDraftsNow ?? null,
      canSendNow:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.canSendNow ?? null,
      blockerCount:
        miniLaunchSeedInboxCorrectionUiEditExecutionKit?.executiveSummary?.blockerCount ?? null,
    },
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket: {
      path: paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
      markdownPath: paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacketMarkdown,
      status: miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.status ?? null,
      ok: miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.ok ?? null,
      canAskAlejandroForApproval:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.executiveSummary?.canAskAlejandroForApproval ?? null,
      cleanupTargetCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.executiveSummary?.cleanupTargetCount ?? null,
      createdDraftCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.executiveSummary?.createdDraftCount ?? null,
      inertDraftCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.executiveSummary?.inertDraftCount ?? null,
      blockerCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket?.executiveSummary?.blockerCount ?? null,
    },
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt: {
      path: paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
      markdownPath: paths.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceiptMarkdown,
      status: miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.status ?? null,
      ok: miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.ok ?? null,
      mode: miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.mode ?? null,
      deletedDraftCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.deletedDrafts?.length ?? null,
      goneCount:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.postScan?.goneCount ?? null,
      mailerLiteDraftsDeleted:
        miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt?.safety?.mailerLiteDraftsDeleted ?? null,
    },
    miniLaunchMailerLiteApiInertDraftLab: {
      path: paths.miniLaunchMailerLiteApiInertDraftLab,
      markdownPath: paths.miniLaunchMailerLiteApiInertDraftLabMarkdown,
      status: miniLaunchMailerLiteApiInertDraftLab?.status ?? null,
      ok: miniLaunchMailerLiteApiInertDraftLab?.ok ?? null,
      mode: miniLaunchMailerLiteApiInertDraftLab?.mode ?? null,
      variantCount: miniLaunchMailerLiteApiInertDraftLab?.executiveSummary?.variantCount ?? null,
      inertVariantCount: miniLaunchMailerLiteApiInertDraftLab?.executiveSummary?.inertVariantCount ?? null,
      exactApprovalPhraseAvailable:
        miniLaunchMailerLiteApiInertDraftLab?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      canExecuteNow: miniLaunchMailerLiteApiInertDraftLab?.executiveSummary?.canExecuteNow ?? null,
      mailerLiteApiCalled: miniLaunchMailerLiteApiInertDraftLab?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteDraftsCreated: miniLaunchMailerLiteApiInertDraftLab?.safety?.mailerLiteDraftsCreated ?? null,
      mailerLiteDraftsDeleted: miniLaunchMailerLiteApiInertDraftLab?.safety?.mailerLiteDraftsDeleted ?? null,
      senderValuesPrinted: miniLaunchMailerLiteApiInertDraftLab?.safety?.senderValuesPrinted ?? null,
      tokensPrinted: miniLaunchMailerLiteApiInertDraftLab?.safety?.tokensPrinted ?? null,
    },
    miniLaunchMailerLiteApiNullAudienceLab: {
      path: paths.miniLaunchMailerLiteApiNullAudienceLab,
      markdownPath: paths.miniLaunchMailerLiteApiNullAudienceLabMarkdown,
      status: miniLaunchMailerLiteApiNullAudienceLab?.status ?? null,
      ok: miniLaunchMailerLiteApiNullAudienceLab?.ok ?? null,
      mode: miniLaunchMailerLiteApiNullAudienceLab?.mode ?? null,
      safetyGroupName: miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.safetyGroupName ?? null,
      safetyGroupActiveCountObserved:
        miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.safetyGroupActiveCountObserved ?? null,
      variantCount: miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.variantCount ?? null,
      safeNullAudienceVariantCount:
        miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.safeNullAudienceVariantCount ?? null,
      readyToUseNullAudienceRecipeForRealDrafts:
        miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts ?? null,
      exactApprovalPhraseAvailable:
        miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      canExecuteNow: miniLaunchMailerLiteApiNullAudienceLab?.executiveSummary?.canExecuteNow ?? null,
      mailerLiteApiCalled: miniLaunchMailerLiteApiNullAudienceLab?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteSafetyGroupsCreated:
        miniLaunchMailerLiteApiNullAudienceLab?.safety?.mailerLiteSafetyGroupsCreated ?? null,
      mailerLiteDraftsCreated: miniLaunchMailerLiteApiNullAudienceLab?.safety?.mailerLiteDraftsCreated ?? null,
      mailerLiteDraftsDeleted: miniLaunchMailerLiteApiNullAudienceLab?.safety?.mailerLiteDraftsDeleted ?? null,
      senderValuesPrinted: miniLaunchMailerLiteApiNullAudienceLab?.safety?.senderValuesPrinted ?? null,
      safetyGroupIdPrinted: miniLaunchMailerLiteApiNullAudienceLab?.safety?.safetyGroupIdPrinted ?? null,
      tokensPrinted: miniLaunchMailerLiteApiNullAudienceLab?.safety?.tokensPrinted ?? null,
    },
    miniLaunchNullAudienceReplacementApprovalPacket: {
      path: paths.miniLaunchNullAudienceReplacementApprovalPacket,
      markdownPath: paths.miniLaunchNullAudienceReplacementApprovalPacketMarkdown,
      status: miniLaunchNullAudienceReplacementApprovalPacket?.status ?? null,
      ok: miniLaunchNullAudienceReplacementApprovalPacket?.ok ?? null,
      canAskAlejandroForApproval:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.canAskAlejandroForApproval ?? null,
      replacementTargetCount:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.replacementTargetCount ?? null,
      nullAudienceRecipeReady:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.nullAudienceRecipeReady ?? null,
      safetyGroupActiveCountObserved:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.safetyGroupActiveCountObserved ?? null,
      localRenderReady:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.localRenderReady ?? null,
      redCheckCount:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.redCheckCount ?? null,
      publicAudienceSendUrlGateReady:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      sourceCampaignIdCount:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.sourceCampaignIdCount ?? null,
      blockerCount:
        miniLaunchNullAudienceReplacementApprovalPacket?.executiveSummary?.blockerCount ?? null,
      mailerLiteApiCalled:
        miniLaunchNullAudienceReplacementApprovalPacket?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformed:
        miniLaunchNullAudienceReplacementApprovalPacket?.safety?.mailerLiteMutationsPerformed ?? null,
      exactUrlsPrinted:
        miniLaunchNullAudienceReplacementApprovalPacket?.safety?.exactUrlsPrinted ?? null,
      tokensPrinted:
        miniLaunchNullAudienceReplacementApprovalPacket?.safety?.tokensPrinted ?? null,
    },
    miniLaunchNullAudienceReplacementExecutionReceipt: {
      path: paths.miniLaunchNullAudienceReplacementExecutionReceipt,
      markdownPath: paths.miniLaunchNullAudienceReplacementExecutionReceiptMarkdown,
      status: miniLaunchNullAudienceReplacementExecutionReceipt?.status ?? null,
      ok: miniLaunchNullAudienceReplacementExecutionReceipt?.ok ?? null,
      mode: miniLaunchNullAudienceReplacementExecutionReceipt?.mode ?? null,
      createdDraftCount: miniLaunchNullAudienceReplacementExecutionReceipt?.createdDrafts?.length ?? null,
      nullAudienceSafeCount:
        miniLaunchNullAudienceReplacementExecutionReceipt?.postCreateQa?.nullAudienceSafeCount ?? null,
      contentGreenCount:
        miniLaunchNullAudienceReplacementExecutionReceipt?.postCreateQa?.contentGreenCount ?? null,
      cleanupAttempted: miniLaunchNullAudienceReplacementExecutionReceipt?.cleanup?.attempted ?? null,
      blockerCount: miniLaunchNullAudienceReplacementExecutionReceipt?.decision?.blockers?.length ?? null,
      mailerLiteApiCalled: miniLaunchNullAudienceReplacementExecutionReceipt?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteDraftsCreated:
        miniLaunchNullAudienceReplacementExecutionReceipt?.safety?.mailerLiteDraftsCreated ?? null,
      sendsPerformed: miniLaunchNullAudienceReplacementExecutionReceipt?.safety?.sendsPerformed ?? null,
      tokensPrinted: miniLaunchNullAudienceReplacementExecutionReceipt?.safety?.tokensPrinted ?? null,
    },
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy: {
      path: paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
      markdownPath: paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategyMarkdown,
      status: miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.status ?? null,
      ok: miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.ok ?? null,
      apiConnectionStableForRead:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.apiConnectionStableForRead ?? null,
      apiExistingDraftUpdateRecommendedNow:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.apiExistingDraftUpdateRecommendedNow ?? null,
      apiCreateRealDraftsRecommendedNow:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.apiCreateRealDraftsRecommendedNow ?? null,
      allApiPayloadReady:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.allApiPayloadReady ?? null,
      allDraftsInertByApi:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.allDraftsInertByApi ?? null,
      blockerCount:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.executiveSummary?.blockerCount ?? null,
      mailerLiteApiCalled:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformed:
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy?.safety?.mailerLiteMutationsPerformed ?? null,
    },
    missingInputsKit: {
      path: paths.missingInputsKit,
      markdownPath: paths.missingInputsKitMarkdown,
      status: missingInputsKit?.status ?? null,
      ok: missingInputsKit?.ok ?? null,
      inputCount: missingInputsKit?.executiveSummary?.inputCount ?? null,
      openLiveMutationGateCount: missingInputsKit?.executiveSummary?.openLiveMutationGateCount ?? null,
    },
    missingInputsIntake: {
      path: paths.missingInputsIntake,
      markdownPath: paths.missingInputsIntakeMarkdown,
      status: missingInputsIntake?.status ?? null,
      ok: missingInputsIntake?.ok ?? null,
      readyInputCount: missingInputsIntake?.executiveSummary?.readyInputCount ?? null,
      inputCount: missingInputsIntake?.executiveSummary?.inputCount ?? null,
      readyForCrmApprovalRequest: missingInputsIntake?.executiveSummary?.readyForCrmApprovalRequest ?? null,
      readyForMiniLaunchCorrectionPreview: missingInputsIntake?.executiveSummary?.readyForMiniLaunchCorrectionPreview ?? null,
    },
    missingInputsRequestBundle: {
      path: paths.missingInputsRequestBundle,
      markdownPath: paths.missingInputsRequestBundleMarkdown,
      status: missingInputsRequestBundle?.status ?? null,
      ok: missingInputsRequestBundle?.ok ?? null,
      requestCount: missingInputsRequestBundle?.executiveSummary?.requestCount ?? null,
      canAskApprovalNow: missingInputsRequestBundle?.executiveSummary?.canAskApprovalNow ?? null,
    },
    privateInputTemplatePack: {
      path: paths.privateInputTemplatePack,
      markdownPath: paths.privateInputTemplatePackMarkdown,
      status: privateInputTemplatePack?.status ?? null,
      ok: privateInputTemplatePack?.ok ?? null,
      templateCount: privateInputTemplatePack?.executiveSummary?.templateCount ?? null,
      writeExamples: privateInputTemplatePack?.executiveSummary?.writeExamples ?? null,
    },
    postInputOrchestrator: {
      path: paths.postInputOrchestrator,
      markdownPath: paths.postInputOrchestratorMarkdown,
      status: postInputOrchestrator?.status ?? null,
      ok: postInputOrchestrator?.ok ?? null,
      readyCommandCount: postInputOrchestrator?.executiveSummary?.readyCommandCount ?? null,
      commandsExecuted: postInputOrchestrator?.executiveSummary?.commandsExecuted ?? null,
    },
    continuationGuard: {
      path: paths.continuationGuard,
      markdownPath: paths.continuationGuardMarkdown,
      status: continuationGuard?.status ?? null,
      ok: continuationGuard?.ok ?? null,
      openLiveMutationGateCount: continuationGuard?.executiveSummary?.openLiveMutationGateCount ?? null,
      oldUiWorkClosed: continuationGuard?.executiveSummary?.oldUiWorkClosed ?? null,
    },
    operatorRunbook: {
      path: paths.operatorRunbook,
      markdownPath: paths.operatorRunbookMarkdown,
      status: runbook?.status ?? null,
      ok: runbook?.ok ?? null,
      openLiveGateCount: runbook?.currentState?.liveGates?.openLiveGateCount ?? null,
      validationStatus: runbook?.currentState?.validation?.validationStatus ?? null,
    },
    goalAudit: {
      path: paths.goalAudit,
      markdownPath: paths.goalAuditMarkdown,
      status: goalAudit?.status ?? null,
      ok: goalAudit?.ok ?? null,
      readyForLiveOperation: goalAudit?.executiveSummary?.readyForLiveOperation ?? null,
      liveActionAllowedNow: goalAudit?.executiveSummary?.liveActionAllowedNow ?? null,
      provenCount: goalAudit?.executiveSummary?.provenCount ?? null,
      partialCount: goalAudit?.executiveSummary?.partialCount ?? null,
      blockedCount: goalAudit?.executiveSummary?.blockedCount ?? null,
    },
    validationReceipt: {
      path: paths.validationReceipt,
      markdownPath: paths.validationReceiptMarkdown,
      status: validationReceipt?.status ?? null,
      ok: validationReceipt?.ok ?? null,
      validationStatus: validationReceipt?.validationStatus ?? null,
      liveGatesClosed: validationReceipt?.evidence?.liveGatesClosed ?? null,
      testFiles: validationReceipt?.testScope?.testFiles ?? null,
      testCount: validationReceipt?.testScope?.testCount ?? null,
    },
  };
};

const buildRefreshReceipt = ({
  options,
  paths,
  validationResults,
  reportResults,
  generatedReports,
  validationResult,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const commandResults = [...validationResults, ...reportResults];
  const generatedReportSet = Object.values(generatedReports);
  const ok = commandResults.every((result) => result.ok)
    && generatedReportSet.every((report) => report.ok === true)
    && generatedReports.operatorRunbook.ok === true
    && generatedReports.goalAudit.ok === true
    && generatedReports.validationReceipt.ok === true
    && generatedReports.validationReceipt.liveGatesClosed === true
    && safetyClosed(safety);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    ok,
    status: ok
      ? 'mailerlite_launch_os_current_state_refresh_ready_no_live_changes'
      : 'mailerlite_launch_os_current_state_refresh_failed_no_live_changes',
    date: options.date,
    reportsDir: resolve(options.reportsDir),
    controlRoom: CONTROL_ROOM,
    packageJson: PACKAGE_JSON,
    validation: {
      runValidation: validationResult.runValidation,
      testFiles: validationResult.testFiles,
      testCount: validationResult.testCount,
      summary: buildValidationSummary(validationResult),
    },
    generatedReports,
    commandResults,
    safety,
    hardStops: [
      'No live MailerLite API calls.',
      'No MailerLite UI operation.',
      'No Shopify or CRM live API calls.',
      'No subscriber, group, workflow or send mutations.',
      'No ledgers, cards, scoring or Fact Store writes.',
      'Stop before using any exact approval phrase for a live or UI mutation.',
    ],
    outputs: {
      json: resolve(options.out),
      markdown: resolve(options.markdownOut),
      currentStateRefresh: paths.currentStateRefresh,
      currentStateRefreshMarkdown: paths.currentStateRefreshMarkdown,
    },
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (receipt) => [
  '# MailerLite Launch OS v0 - Current-State Refresh',
  '',
  `Generated: ${receipt.generatedAt}`,
  `Status: ${receipt.status}`,
  `Validation: ${receipt.validation.summary}`,
  '',
  '## Generated Reports',
  '',
  `- CRM write approval packet: ${receipt.generatedReports.crmWriteApprovalPacket.path}`,
  `- Approval queue: ${receipt.generatedReports.approvalQueue.path}`,
  `- Approval intake: ${receipt.generatedReports.approvalIntake.path}`,
  `- Blocked-gate handoff: ${receipt.generatedReports.blockedGateHandoff.path}`,
  `- Mini-launch asset manifest: ${receipt.generatedReports.miniLaunchAssetManifest.path}`,
  `- Mini-launch Shopify public URL gate: ${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.path}`,
  `- Mini-launch Shopify preview route decision: ${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.path}`,
  `- Mini-launch Shopify preview route approval packet: ${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.path}`,
  `- Mini-launch Shopify preview route execution receipt: ${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.path}`,
  `- Mini-launch email render QA: ${receipt.generatedReports.miniLaunchEmailRenderQa.path}`,
  `- Mini-launch correction UI edit approval packet: ${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.path}`,
  `- Mini-launch MailerLite API inert draft lab: ${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.path}`,
  `- Mini-launch MailerLite API Null Audience lab: ${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.path}`,
  `- Mini-launch MailerLite API Null Audience replacement approval packet: ${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.path}`,
  `- Mini-launch MailerLite API Null Audience replacement execution receipt/preflight: ${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.path}`,
  `- Mini-launch MailerLite API existing-draft update strategy: ${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.path}`,
  `- Missing-inputs kit: ${receipt.generatedReports.missingInputsKit.path}`,
  `- Missing-inputs intake: ${receipt.generatedReports.missingInputsIntake.path}`,
  `- Missing-inputs request bundle: ${receipt.generatedReports.missingInputsRequestBundle.path}`,
  `- Private-input template pack: ${receipt.generatedReports.privateInputTemplatePack.path}`,
  `- Post-input orchestrator: ${receipt.generatedReports.postInputOrchestrator.path}`,
  `- Continuation guard: ${receipt.generatedReports.continuationGuard.path}`,
  `- Operator runbook: ${receipt.generatedReports.operatorRunbook.path}`,
  `- Goal audit: ${receipt.generatedReports.goalAudit.path}`,
  `- Validation receipt: ${receipt.generatedReports.validationReceipt.path}`,
  `- Refresh receipt: ${receipt.outputs.json}`,
  '',
  '## Confirmed Results',
  '',
  `- CRM write approval: status=${receipt.generatedReports.crmWriteApprovalPacket.status}, exactEventCountReady=${receipt.generatedReports.crmWriteApprovalPacket.exactEventCountReady}, exactPersonCountReady=${receipt.generatedReports.crmWriteApprovalPacket.exactPersonCountReady}`,
  `- approval intake: status=${receipt.generatedReports.approvalIntake.status}, approvalTextProvided=${receipt.generatedReports.approvalIntake.approvalTextProvided}, matchedApprovalId=${receipt.generatedReports.approvalIntake.matchedApprovalId}, executionAllowedNow=${receipt.generatedReports.approvalIntake.executionAllowedNow}`,
  `- mini-launch asset manifest: status=${receipt.generatedReports.miniLaunchAssetManifest.status}, finalPublicLinksReady=${receipt.generatedReports.miniLaunchAssetManifest.finalPublicLinksReady}, publicAudienceSendUrlGateReady=${receipt.generatedReports.miniLaunchAssetManifest.publicAudienceSendUrlGateReady}, linkLifecyclePolicy=${receipt.generatedReports.miniLaunchAssetManifest.linkLifecyclePolicy}, requiresAlejandroManualLinks=${receipt.generatedReports.miniLaunchAssetManifest.requiresAlejandroManualLinks}, subscriptionReasonPolicy=${receipt.generatedReports.miniLaunchAssetManifest.subscriptionReasonPolicy}`,
  `- Shopify public URL gate: status=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.status}, finalPublicLinksReady=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.finalPublicLinksReady}, publicAudienceSendUrlGateReady=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.publicAudienceSendUrlGateReady}, noSeparateUrlSetsRequired=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.noSeparateUrlSetsRequired}, approvalPhraseAvailable=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.approvalPhraseAvailable}, recommendedVisibilityTier=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.recommendedVisibilityTier}, fullyPublicNavigationRequiredNow=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.fullyPublicNavigationRequiredNow}, seoIndexingAllowedNow=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.seoIndexingAllowedNow}, decisionExplanationRequiredBeforeApprovalPhrase=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.decisionExplanationRequiredBeforeApprovalPhrase}, canPublishNow=${receipt.generatedReports.miniLaunchShopifyPublicUrlGate.canPublishNow}`,
  `- Shopify preview route decision: status=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.status}, decisionExplanationReady=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.decisionExplanationReady}, exactApprovalPhraseAvailable=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.exactApprovalPhraseAvailable}, exactApprovalPhrasePrinted=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.exactApprovalPhrasePrinted}, canAskApprovalNow=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.canAskApprovalNow}, canPublishNow=${receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.canPublishNow}`,
  `- Shopify preview route approval packet: status=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.status}, humanDecisionConfirmed=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.humanDecisionConfirmed}, exactApprovalPhraseAvailable=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.exactApprovalPhraseAvailable}, canAskApprovalNow=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.canAskApprovalNow}, canExecuteNow=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.canExecuteNow}, canPublishNow=${receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.canPublishNow}`,
  `- Shopify preview route execution receipt: status=${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.status}, previewRouteReady=${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.previewRouteReady}, targetLinkCount=${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.targetLinkCount}, effectivePreviewView=${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.effectivePreviewView}, publicAudienceSendUrlGateReady=${receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.publicAudienceSendUrlGateReady}`,
  `- mini-launch email render QA: status=${receipt.generatedReports.miniLaunchEmailRenderQa.status}, localRenderReady=${receipt.generatedReports.miniLaunchEmailRenderQa.localRenderReady}, emailCount=${receipt.generatedReports.miniLaunchEmailRenderQa.emailCount}, renderPreviewNonEmptyCount=${receipt.generatedReports.miniLaunchEmailRenderQa.renderPreviewNonEmptyCount}, redCheckCount=${receipt.generatedReports.miniLaunchEmailRenderQa.redCheckCount}, publicUseReady=${receipt.generatedReports.miniLaunchEmailRenderQa.publicUseReady}, seedSendReady=${receipt.generatedReports.miniLaunchEmailRenderQa.seedSendReady}`,
  `- mini-launch correction UI edit approval packet: status=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.status}, canAskAlejandroForApproval=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.canAskAlejandroForApproval}, targetDraftCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.targetDraftCount}, localRenderReady=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.localRenderReady}, blockerCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.blockerCount}, publicAudienceSendUrlGateReady=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditApprovalPacket.publicAudienceSendUrlGateReady}`,
  `- mini-launch correction UI edit execution kit: status=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.status}, targetDraftCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.targetDraftCount}, htmlSourceReadyCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.htmlSourceReadyCount}, previewReadyCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.previewReadyCount}, canOpenBrowserNow=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.canOpenBrowserNow}, canEditDraftsNow=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.canEditDraftsNow}, blockerCount=${receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.blockerCount}`,
  `- MailerLite API inert draft lab: status=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.status}, mode=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.mode}, variantCount=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.variantCount}, inertVariantCount=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.inertVariantCount}, exactApprovalPhraseAvailable=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.exactApprovalPhraseAvailable}, canExecuteNow=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.canExecuteNow}, mailerLiteApiCalled=${receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.mailerLiteApiCalled}`,
  `- MailerLite API Null Audience lab: status=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.status}, mode=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.mode}, safetyGroup=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.safetyGroupName}, safetyGroupActiveCountObserved=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.safetyGroupActiveCountObserved}, variantCount=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.variantCount}, safeNullAudienceVariantCount=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.safeNullAudienceVariantCount}, exactApprovalPhraseAvailable=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.exactApprovalPhraseAvailable}, readyToUseNullAudienceRecipeForRealDrafts=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.readyToUseNullAudienceRecipeForRealDrafts}, mailerLiteApiCalled=${receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.mailerLiteApiCalled}`,
  `- MailerLite API Null Audience replacement approval packet: status=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.status}, canAskAlejandroForApproval=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.canAskAlejandroForApproval}, replacementTargetCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.replacementTargetCount}, nullAudienceRecipeReady=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.nullAudienceRecipeReady}, localRenderReady=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.localRenderReady}, blockerCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.blockerCount}, mailerLiteApiCalled=${receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.mailerLiteApiCalled}`,
  `- MailerLite API Null Audience replacement execution receipt/preflight: status=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.status}, mode=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.mode}, createdDraftCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.createdDraftCount}, nullAudienceSafeCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.nullAudienceSafeCount}, contentGreenCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.contentGreenCount}, blockerCount=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.blockerCount}, mailerLiteApiCalled=${receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.mailerLiteApiCalled}`,
  `- MailerLite API existing-draft update strategy: status=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.status}, apiConnectionStableForRead=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.apiConnectionStableForRead}, allApiPayloadReady=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.allApiPayloadReady}, allDraftsInertByApi=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.allDraftsInertByApi}, apiExistingDraftUpdateRecommendedNow=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.apiExistingDraftUpdateRecommendedNow}, apiCreateRealDraftsRecommendedNow=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.apiCreateRealDraftsRecommendedNow}, mailerLiteApiCalled=${receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.mailerLiteApiCalled}`,
  `- missing-inputs intake: status=${receipt.generatedReports.missingInputsIntake.status}, readyInputCount=${receipt.generatedReports.missingInputsIntake.readyInputCount}/${receipt.generatedReports.missingInputsIntake.inputCount}, readyForCrmApprovalRequest=${receipt.generatedReports.missingInputsIntake.readyForCrmApprovalRequest}, readyForMiniLaunchCorrectionPreview=${receipt.generatedReports.missingInputsIntake.readyForMiniLaunchCorrectionPreview}`,
  `- continuation-guard: status=${receipt.generatedReports.continuationGuard.status}, openLiveMutationGateCount=${receipt.generatedReports.continuationGuard.openLiveMutationGateCount}`,
  `- operator-runbook: status=${receipt.generatedReports.operatorRunbook.status}, openLiveGateCount=${receipt.generatedReports.operatorRunbook.openLiveGateCount}`,
  `- goal-audit: status=${receipt.generatedReports.goalAudit.status}, readyForLiveOperation=${receipt.generatedReports.goalAudit.readyForLiveOperation}, liveActionAllowedNow=${receipt.generatedReports.goalAudit.liveActionAllowedNow}`,
  `- validation-receipt: status=${receipt.generatedReports.validationReceipt.status}, validationStatus=${receipt.generatedReports.validationReceipt.validationStatus}, liveGatesClosed=${receipt.generatedReports.validationReceipt.liveGatesClosed}`,
  `- focused validation: ${receipt.validation.testFiles ?? 'unknown'} files / ${receipt.validation.testCount ?? 'unknown'} tests`,
  '',
  '## Commands',
  '',
  renderList(receipt.commandResults.map((result) => `${result.ok ? 'ok' : 'failed'}: ${result.command}`)),
  '',
  '## Hard Stops',
  '',
  renderList(receipt.hardStops),
  '',
  '## Safety',
  '',
  '- Local-only reports refresh.',
  '- No MailerLite, Shopify or CRM live API calls.',
  '- No UI opened.',
  '- No subscribers read or mutated.',
  '- No group, workflow, send, ledger, card, score or Fact Store mutation.',
].join('\n');

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

  const plan = buildCurrentStateRefreshPlan(options);
  assertLocalOnlyCommandPlan(plan);

  const validationResults = [];
  if (!options.skipValidation) {
    for (const entry of plan.validationCommands) {
      const result = runCommand(entry);
      validationResults.push(result);
      if (!result.ok) {
        const validationResult = {
          runValidation: true,
          commands: plan.validationCommands,
          testFiles: null,
          testCount: null,
        };
        const generatedReports = await summarizeGeneratedReports(plan.paths);
        const receipt = buildRefreshReceipt({
          options,
          paths: plan.paths,
          validationResults,
          reportResults: [],
          generatedReports,
          validationResult,
        });
        await writeJson(options.out, receipt);
        await writeText(options.markdownOut, renderMarkdown(receipt));
        throw new Error(`validation_command_failed:${entry.id}`);
      }
    }
  }

  const vitestCounts = parseVitestCounts(validationResults);
  const validationResult = {
    runValidation: !options.skipValidation,
    commands: plan.validationCommands,
    testFiles: vitestCounts.testFiles,
    testCount: vitestCounts.testCount,
  };
  const reportCommands = buildReportCommands(plan.paths, validationResult);
  const reportResults = [];

  for (const entry of reportCommands) {
    const result = runCommand(entry);
    reportResults.push(result);
    if (!result.ok) {
      const generatedReports = await summarizeGeneratedReports(plan.paths);
      const receipt = buildRefreshReceipt({
        options,
        paths: plan.paths,
        validationResults,
        reportResults,
        generatedReports,
        validationResult,
      });
      await writeJson(options.out, receipt);
      await writeText(options.markdownOut, renderMarkdown(receipt));
      throw new Error(`report_command_failed:${entry.id}`);
    }
  }

  const generatedReports = await summarizeGeneratedReports(plan.paths);
  const receipt = buildRefreshReceipt({
    options,
    paths: plan.paths,
    validationResults,
    reportResults,
    generatedReports,
    validationResult,
  });

  await writeJson(options.out, receipt);
  await writeText(options.markdownOut, renderMarkdown(receipt));

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    generatedAt: receipt.generatedAt,
    testFiles: receipt.validation.testFiles,
    testCount: receipt.validation.testCount,
    crmWriteApprovalPacketStatus: receipt.generatedReports.crmWriteApprovalPacket.status,
    approvalIntakeStatus: receipt.generatedReports.approvalIntake.status,
    approvalIntakeApprovalTextProvided: receipt.generatedReports.approvalIntake.approvalTextProvided,
    approvalIntakeMatchedApprovalId: receipt.generatedReports.approvalIntake.matchedApprovalId,
    approvalIntakeExecutionAllowedNow: receipt.generatedReports.approvalIntake.executionAllowedNow,
    miniLaunchAssetManifestStatus: receipt.generatedReports.miniLaunchAssetManifest.status,
    miniLaunchShopifyPublicUrlGateStatus: receipt.generatedReports.miniLaunchShopifyPublicUrlGate.status,
    miniLaunchShopifyPreviewRouteDecisionStatus:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.status,
    miniLaunchShopifyPreviewRouteApprovalPacketStatus:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.status,
    miniLaunchShopifyPreviewRouteExecutionReceiptStatus:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.status,
    finalPublicLinksReady: receipt.generatedReports.miniLaunchAssetManifest.finalPublicLinksReady,
    publicAudienceSendUrlGateReady: receipt.generatedReports.miniLaunchAssetManifest.publicAudienceSendUrlGateReady,
    linkLifecyclePolicy: receipt.generatedReports.miniLaunchAssetManifest.linkLifecyclePolicy,
    requiresAlejandroManualLinks: receipt.generatedReports.miniLaunchAssetManifest.requiresAlejandroManualLinks,
    publicUrlGateApprovalPhraseAvailable: receipt.generatedReports.miniLaunchShopifyPublicUrlGate.approvalPhraseAvailable,
    publicUrlGatePublicAudienceSendUrlGateReady:
      receipt.generatedReports.miniLaunchShopifyPublicUrlGate.publicAudienceSendUrlGateReady,
    publicUrlGateRecommendedVisibilityTier: receipt.generatedReports.miniLaunchShopifyPublicUrlGate.recommendedVisibilityTier,
    publicUrlGateFullyPublicNavigationRequiredNow:
      receipt.generatedReports.miniLaunchShopifyPublicUrlGate.fullyPublicNavigationRequiredNow,
    publicUrlGateSeoIndexingAllowedNow: receipt.generatedReports.miniLaunchShopifyPublicUrlGate.seoIndexingAllowedNow,
    publicUrlGateCanPublishNow: receipt.generatedReports.miniLaunchShopifyPublicUrlGate.canPublishNow,
    previewRouteDecisionExplanationReady:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.decisionExplanationReady,
    previewRouteDecisionExactApprovalPhraseAvailable:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.exactApprovalPhraseAvailable,
    previewRouteDecisionCanAskApprovalNow:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteDecision.canAskApprovalNow,
    previewRouteApprovalHumanDecisionConfirmed:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.humanDecisionConfirmed,
    previewRouteApprovalExactApprovalPhraseAvailable:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.exactApprovalPhraseAvailable,
    previewRouteApprovalCanAskApprovalNow:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteApprovalPacket.canAskApprovalNow,
    previewRouteExecutionReady:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.previewRouteReady,
    previewRouteExecutionPublicAudienceSendUrlGateReady:
      receipt.generatedReports.miniLaunchShopifyPreviewRouteExecutionReceipt.publicAudienceSendUrlGateReady,
    miniLaunchSeedInboxCorrectionUiEditExecutionKitStatus:
      receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.status,
    miniLaunchSeedInboxCorrectionUiEditExecutionKitReady:
      receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.ok,
    miniLaunchSeedInboxCorrectionUiEditExecutionKitBlockerCount:
      receipt.generatedReports.miniLaunchSeedInboxCorrectionUiEditExecutionKit.blockerCount,
    miniLaunchMailerLiteApiInertDraftLabStatus:
      receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.status,
    miniLaunchMailerLiteApiInertDraftLabMode:
      receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.mode,
    miniLaunchMailerLiteApiInertDraftLabVariantCount:
      receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.variantCount,
    miniLaunchMailerLiteApiInertDraftLabExactApprovalPhraseAvailable:
      receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.exactApprovalPhraseAvailable,
    miniLaunchMailerLiteApiInertDraftLabMailerLiteApiCalled:
      receipt.generatedReports.miniLaunchMailerLiteApiInertDraftLab.mailerLiteApiCalled,
    miniLaunchMailerLiteApiNullAudienceLabStatus:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.status,
    miniLaunchMailerLiteApiNullAudienceLabMode:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.mode,
    miniLaunchMailerLiteApiNullAudienceLabSafetyGroupName:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.safetyGroupName,
    miniLaunchMailerLiteApiNullAudienceLabExactApprovalPhraseAvailable:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.exactApprovalPhraseAvailable,
    miniLaunchMailerLiteApiNullAudienceLabReadyToUseRecipe:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.readyToUseNullAudienceRecipeForRealDrafts,
    miniLaunchMailerLiteApiNullAudienceLabMailerLiteApiCalled:
      receipt.generatedReports.miniLaunchMailerLiteApiNullAudienceLab.mailerLiteApiCalled,
    miniLaunchNullAudienceReplacementApprovalPacketStatus:
      receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.status,
    miniLaunchNullAudienceReplacementCanAskApproval:
      receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.canAskAlejandroForApproval,
    miniLaunchNullAudienceReplacementTargetCount:
      receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.replacementTargetCount,
    miniLaunchNullAudienceReplacementBlockerCount:
      receipt.generatedReports.miniLaunchNullAudienceReplacementApprovalPacket.blockerCount,
    miniLaunchNullAudienceReplacementExecutionReceiptStatus:
      receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.status,
    miniLaunchNullAudienceReplacementExecutionMode:
      receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.mode,
    miniLaunchNullAudienceReplacementExecutionCreatedDraftCount:
      receipt.generatedReports.miniLaunchNullAudienceReplacementExecutionReceipt.createdDraftCount,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategyStatus:
      receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.status,
    miniLaunchMailerLiteApiExistingDraftUpdateRecommendedNow:
      receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.apiExistingDraftUpdateRecommendedNow,
    miniLaunchMailerLiteApiCreateRealDraftsRecommendedNow:
      receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.apiCreateRealDraftsRecommendedNow,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategyMailerLiteApiCalled:
      receipt.generatedReports.miniLaunchMailerLiteApiExistingDraftUpdateStrategy.mailerLiteApiCalled,
    missingInputsIntakeStatus: receipt.generatedReports.missingInputsIntake.status,
    readyInputCount: receipt.generatedReports.missingInputsIntake.readyInputCount,
    inputCount: receipt.generatedReports.missingInputsIntake.inputCount,
    continuationGuardStatus: receipt.generatedReports.continuationGuard.status,
    operatorRunbookStatus: receipt.generatedReports.operatorRunbook.status,
    openLiveGateCount: receipt.generatedReports.operatorRunbook.openLiveGateCount,
    goalAuditStatus: receipt.generatedReports.goalAudit.status,
    readyForLiveOperation: receipt.generatedReports.goalAudit.readyForLiveOperation,
    liveActionAllowedNow: receipt.generatedReports.goalAudit.liveActionAllowedNow,
    validationReceiptStatus: receipt.generatedReports.validationReceipt.status,
    liveGatesClosed: receipt.generatedReports.validationReceipt.liveGatesClosed,
    out: receipt.outputs.json,
    markdownOut: receipt.outputs.markdown,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS current-state refresh failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  assertLocalOnlyCommandPlan,
  buildCurrentStateRefreshPlan,
  buildRefreshReceipt,
  buildReportCommands,
  buildReportPaths,
  buildSafety,
  formatCommand,
  parseArgs,
  parseVitestCounts,
  renderMarkdown,
};
