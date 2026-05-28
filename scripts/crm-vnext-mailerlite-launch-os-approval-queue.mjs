#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-approval-queue-2026-05-28';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_EXECUTED_retry_with_validation_detail_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_builder_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_request_inteligencia_descansar_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs [options]

Options:
  --mini-launch-empty-group-packet <path>         Mini-launch empty-group approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty-group create dry-run. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --onboarding-v2-empty-groups-packet <path>      Onboarding v2 empty-groups approval packet. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET}
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --mini-launch-email-asset-build-scope-packet <path> Mini-launch email asset-build scope packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --mini-launch-email-builder-payload-manifest <path> Mini-launch email builder payload manifest. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --mini-launch-email-render-qa <path>         Mini-launch local email render QA packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA}
  --mini-launch-email-asset-build-dry-run <path> Mini-launch email asset-build dry-run. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN}
  --mini-launch-email-asset-build-execution <path> Mini-launch email asset-build execution attempt. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION}
  --mini-launch-email-manual-ui-builder-packet <path> Mini-launch manual UI builder fallback packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET}
  --mini-launch-shopify-local-build-request <path> Shopify no-live local build request. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST}
  --mini-launch-crm-signal-projection-packet <path> CRM signal projection packet. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET}
  --brujula-email-style-correction <path>         Brújula corrected Email 1 packet. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>                Brújula local render QA packet. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --validation-receipt <path>                     Validation receipt. Defaults to ${DEFAULT_VALIDATION_RECEIPT}
  --out <path>                                    Write JSON queue
  --markdown-out <path>                           Write Markdown queue
  --help                                          Show this help

Local-only approval queue for MailerLite Launch OS v0. It consolidates exact
human approval boundaries from existing reports. It never approves anything by
itself, calls MailerLite/Shopify/CRM live APIs, reads subscribers, creates
groups, edits workflows, sends email, appends ledgers, writes cards, changes
scoring, touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    miniLaunchEmptyGroupPacket: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    onboardingV2EmptyGroupsPacket: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET,
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    miniLaunchEmailAssetBuildScopePacket: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    miniLaunchEmailBuilderPayloadManifest: DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    miniLaunchEmailRenderQa: DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA,
    miniLaunchEmailAssetBuildDryRun: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN,
    miniLaunchEmailAssetBuildExecution: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION,
    miniLaunchEmailManualUiBuilderPacket: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET,
    miniLaunchShopifyLocalBuildRequest: DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST,
    miniLaunchCrmSignalProjectionPacket: DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET,
    brujulaEmailStyleCorrection: DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION,
    brujulaEmailRenderQa: DEFAULT_BRUJULA_EMAIL_RENDER_QA,
    validationReceipt: DEFAULT_VALIDATION_RECEIPT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--mini-launch-empty-group-packet') options.miniLaunchEmptyGroupPacket = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-packet') options.onboardingV2EmptyGroupsPacket = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-scope-packet') options.miniLaunchEmailAssetBuildScopePacket = argv[++index];
    else if (arg === '--mini-launch-email-builder-payload-manifest') options.miniLaunchEmailBuilderPayloadManifest = argv[++index];
    else if (arg === '--mini-launch-email-render-qa') options.miniLaunchEmailRenderQa = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-dry-run') options.miniLaunchEmailAssetBuildDryRun = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-execution') options.miniLaunchEmailAssetBuildExecution = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-builder-packet') options.miniLaunchEmailManualUiBuilderPacket = argv[++index];
    else if (arg === '--mini-launch-shopify-local-build-request') options.miniLaunchShopifyLocalBuildRequest = argv[++index];
    else if (arg === '--mini-launch-crm-signal-projection-packet') options.miniLaunchCrmSignalProjectionPacket = argv[++index];
    else if (arg === '--brujula-email-style-correction') options.brujulaEmailStyleCorrection = argv[++index];
    else if (arg === '--brujula-email-render-qa') options.brujulaEmailRenderQa = argv[++index];
    else if (arg === '--validation-receipt') options.validationReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
    const raw = await readFile(resolved, 'utf8');
    return {
      value: JSON.parse(raw),
      digest: {
        path: resolved,
        present: true,
        chars: raw.length,
        consultedFor,
      },
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        chars: 0,
        consultedFor,
      },
    };
  }
};

const targetNamesFrom = (...values) => [...new Set(values
  .flatMap((value) => Array.isArray(value) ? value : [])
  .map((row) => typeof row === 'string'
    ? cleanString(row)
    : cleanString(row?.name ?? row?.mailerLiteAssetNameDraft ?? row?.path))
  .filter(Boolean))];

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const itemStatusFor = ({ canAskNow, blockers }) => {
  if (canAskNow) return 'ready_for_exact_approval_request';
  if ((blockers ?? []).length > 0) return 'prepared_but_blocked_before_approval_request';
  return 'reference_only_no_approval_request_now';
};

const buildApprovalItem = ({
  id,
  title,
  lane,
  operationType,
  approvalType,
  canAskNow,
  exactApprovalPhrase,
  sourceStatuses,
  targetNames = [],
  allowedAfterExactApproval = [],
  stillClosed = [],
  requiredFreshEvidence = [],
  blockers = [],
  evidence = {},
  commandAfterApproval = null,
  notes = [],
}) => {
  const phrase = cleanString(exactApprovalPhrase);

  return {
    id,
    title,
    lane,
    operationType,
    approvalType,
    status: itemStatusFor({ canAskNow, blockers }),
    canAskAlejandroNow: canAskNow,
    exactApprovalPhrase: canAskNow ? phrase : null,
    exactApprovalPhrasePresent: Boolean(phrase),
    packetIsApprovalByItself: false,
    targetCount: targetNames.length,
    targetNames,
    sourceStatuses,
    allowedAfterExactApproval,
    stillClosed,
    requiredFreshEvidence,
    blockers,
    evidence,
    commandAfterApproval,
    notes,
  };
};

const buildMiniLaunchEmptyGroupItem = ({ packet, dryRun }) => {
  const targetNames = targetNamesFrom(packet?.targetGroups);
  const blockers = [];
  const packetReadyForApproval = packet?.status === 'ready_for_exact_human_approval_to_create_mini_launch_empty_groups';
  const packetReferenceAlreadyCompleted = packet?.status === 'reference_only_empty_group_creation_already_completed';
  const targetGroupsAlreadyExist = dryRun?.status === 'dry_run_no_create_needed_targets_already_exist'
    || (
      dryRun?.freshScan?.targetGroupsMissingCount === 0
      && dryRun?.freshScan?.targetGroupsExistingCount === targetNames.length
      && targetNames.length > 0
    );

  if (!targetGroupsAlreadyExist && !packetReadyForApproval) {
    blockers.push(`mini_launch_empty_group_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (targetGroupsAlreadyExist && !packetReadyForApproval && !packetReferenceAlreadyCompleted) {
    blockers.push(`mini_launch_empty_group_packet_not_reference_or_ready:${packet?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && dryRun?.status !== 'dry_run_ready_for_exact_approval') {
    blockers.push(`mini_launch_empty_group_create_dry_run_not_ready:${dryRun?.status ?? 'missing'}`);
  }
  if (countRows(dryRun?.createdGroups) !== 0) blockers.push('dry_run_unexpectedly_reports_created_groups');
  if (!targetGroupsAlreadyExist && !cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_target_groups');

  const canAskNow = !targetGroupsAlreadyExist
    && blockers.length === 0
    && packet?.decision?.canAskAlejandroForApproval === true;

  return buildApprovalItem({
    id: 'mini_launch_empty_group_creation',
    title: 'Mini-launch empty MailerLite groups',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: targetGroupsAlreadyExist
      ? 'live_mailerlite_group_creation_already_completed'
      : 'live_mailerlite_group_creation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase,
    sourceStatuses: {
      approvalPacket: packet?.status ?? null,
      dryRun: dryRun?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.approvalBoundary?.stillClosedEvenAfterThisApproval ?? [],
    requiredFreshEvidence: packet?.approvalBoundary?.requiredBeforeAnyExecutorRun ?? [],
    blockers,
    evidence: {
      sourceDryRunGroupsRead: packet?.safety?.sourceDryRunMailerLiteGroupsRead ?? dryRun?.safety?.mailerLiteGroupsRead ?? null,
      targetMissingCount: dryRun?.freshScan?.targetGroupsMissingCount ?? targetNames.length,
      targetExistingCount: dryRun?.freshScan?.targetGroupsExistingCount ?? null,
      targetGroupsAlreadyExist,
      mutationsPerformed: dryRun?.safety?.mailerLiteMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-empty-group-create -- --execute --approval-phrase "<exact phrase>"',
    notes: [
      targetGroupsAlreadyExist
        ? 'The two named empty groups already exist; no new approval request is needed for this boundary.'
        : 'Approval covers only the two named empty groups.',
      'No subscribers, workflows, sends, onboarding route or Shopify/CRM action is included.',
    ],
  });
};

const buildOnboardingV2EmptyGroupItem = ({ packet, dryRun }) => {
  const targetNames = targetNamesFrom(packet?.targetPlan, dryRun?.decision?.targetPlan);
  const targetPlan = dryRun?.decision?.targetPlan ?? packet?.targetPlan ?? [];
  const executionCompleted = dryRun?.status === 'executed_onboarding_v2_empty_group_creation'
    && countRows(dryRun?.createdGroups) === targetNames.length
    && targetNames.length > 0;
  const postExecutionAllExist = targetNames.length > 0
    && targetPlan.length === targetNames.length
    && targetPlan.every((target) => target?.existsInFreshScan === true);
  const targetGroupsAlreadyExist = executionCompleted || postExecutionAllExist;
  const blockers = [];

  if (!targetGroupsAlreadyExist && packet?.status !== 'ready_for_exact_human_approval_to_create_empty_groups') {
    blockers.push(`onboarding_v2_empty_groups_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && dryRun?.status !== 'dry_run_ready_for_exact_approval') {
    blockers.push(`onboarding_v2_empty_groups_create_dry_run_not_ready:${dryRun?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && countRows(dryRun?.createdGroups) !== 0) blockers.push('dry_run_unexpectedly_reports_created_groups');
  if (!targetGroupsAlreadyExist && !cleanString(packet?.approvalGate?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_target_groups');

  const canAskNow = !targetGroupsAlreadyExist
    && blockers.length === 0
    && packet?.approvalGate?.canAskAlejandroForApproval === true;

  return buildApprovalItem({
    id: 'onboarding_v2_empty_group_creation',
    title: 'Onboarding v2 empty MailerLite groups',
    lane: 'onboarding_v2',
    operationType: targetGroupsAlreadyExist
      ? 'live_mailerlite_group_creation_already_completed'
      : 'live_mailerlite_group_creation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.approvalGate?.exactApprovalPhrase,
    sourceStatuses: {
      approvalPacket: packet?.status ?? null,
      dryRun: dryRun?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: ['create_only_the_named_empty_onboarding_v2_groups_after_fresh_rescan'],
    stillClosed: [
      'onboarding_v1_changes',
      'workflow_or_automation_activation',
      'subscriber_assignment_or_import',
      'sends',
      'mini_launch_routing',
      'crm_writes',
      'fact_store_write',
    ],
    requiredFreshEvidence: [
      'rerun onboarding v2 empty-groups packet or fresh create dry-run',
      'confirm all target groups are still missing',
      'confirm Onboarding v1 remains untouched',
      'provide exact approval phrase unchanged',
    ],
    blockers,
    evidence: {
      targetCount: targetNames.length,
      liveGroupsRead: dryRun?.packetSummary?.liveGroupsRead ?? packet?.sourceEvidence?.liveGroupCount ?? null,
      liveAutomationsRead: dryRun?.packetSummary?.liveAutomationsRead ?? packet?.sourceEvidence?.liveAutomationCount ?? null,
      targetGroupsAlreadyExist,
      createdCount: countRows(dryRun?.createdGroups),
      mutationsPerformed: dryRun?.safety?.groupMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-onboarding-v2-empty-groups-create -- --execute --approval-phrase "<exact phrase>"',
    notes: [
      targetGroupsAlreadyExist
        ? 'The twelve named empty groups already exist; no new approval request is needed for this boundary.'
        : 'Approval covers empty group creation only.',
      'It is not permission to build or switch the Onboarding v2 workflow.',
    ],
  });
};

const executionHasAdvancedPlanContentBlocker = (executionAttempt) =>
  (executionAttempt?.errors ?? []).some((error) =>
    (error?.details ?? []).some((detail) =>
      /content submission is only available on advanced plan/i.test(cleanString(detail?.message) ?? ''),
    ),
  );

const buildMiniLaunchEmailAssetBuildItem = ({
  scopePacket,
  payloadManifest,
  renderQa = null,
  dryRun = null,
  executionAttempt = null,
}) => {
  const targetNames = targetNamesFrom(scopePacket?.assetBuildScope?.assets, payloadManifest?.payloads);
  const executionStatus = executionAttempt?.status ?? null;
  const executionAttemptPresent = Boolean(executionAttempt);
  const executionMutations = countRows(executionAttempt?.assetMutations);
  const executionErrors = executionAttempt?.errors ?? [];
  const executionAdvancedPlanBlocker = executionHasAdvancedPlanContentBlocker(executionAttempt);
  const executionCompleted = executionStatus === 'executed_mini_launch_email_asset_build'
    && executionMutations === targetNames.length
    && executionAttempt?.safety?.mailerLiteAssetsCreatedOrEdited === true
    && executionAttempt?.safety?.sendsPerformed === false
    && executionAttempt?.safety?.subscribersRead === false
    && executionAttempt?.safety?.groupsCreatedOrAssigned === false
    && executionAttempt?.safety?.workflowMutationsPerformed === false;

  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_email_asset_build',
      title: 'Mini-launch MailerLite draft email assets',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_builder_draft_mutation_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        scopePacket: scopePacket?.status ?? null,
        payloadManifest: payloadManifest?.status ?? null,
        renderQa: renderQa?.status ?? null,
        dryRun: dryRun?.status ?? null,
        executionAttempt: executionStatus,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval ?? payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval ?? [],
      requiredFreshEvidence: [
        'run real MailerLite builder/render QA before any seed-send approval request',
        'confirm exact seed recipient before any test send',
      ],
      blockers: [],
      evidence: {
        executionAttemptStatus: executionStatus,
        assetMutationCount: executionMutations,
        createdOrEditedDrafts: true,
        sendsPerformed: executionAttempt?.safety?.sendsPerformed ?? null,
        subscribersRead: executionAttempt?.safety?.subscribersRead ?? null,
        groupsCreatedOrAssigned: executionAttempt?.safety?.groupsCreatedOrAssigned ?? null,
        workflowMutationsPerformed: executionAttempt?.safety?.workflowMutationsPerformed ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The approved draft asset-build boundary has already been used.',
        'Seed send remains a separate later approval after real MailerLite render QA.',
      ],
    });
  }

  const blockers = [];

  if (scopePacket?.status !== 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`email_asset_build_scope_packet_not_ready:${scopePacket?.status ?? 'missing'}`);
  }
  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    blockers.push(`email_builder_payload_manifest_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (scopePacket?.requestedFutureScope?.canAskAlejandroForApproval !== true) {
    blockers.push('scope_packet_cannot_ask_approval_now');
  }
  if (scopePacket?.requestedFutureScope?.canExecuteBuildNow !== false) {
    blockers.push('scope_packet_build_gate_unexpectedly_open');
  }
  if (payloadManifest?.approvalBoundary?.canExecuteBuilderNow !== false) {
    blockers.push('payload_manifest_build_gate_unexpectedly_open');
  }
  if (renderQa) {
    if (renderQa.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
      blockers.push(`email_render_qa_not_green:${renderQa.status ?? 'missing'}`);
    }
    if (renderQa.executiveSummary?.localRenderReady !== true) blockers.push('email_render_qa_local_render_not_ready');
    if (renderQa.executiveSummary?.publicUseReady !== false) blockers.push('email_render_qa_public_gate_unexpectedly_open');
    if (renderQa.executiveSummary?.seedSendReady !== false) blockers.push('email_render_qa_seed_send_gate_unexpectedly_open');
    if (renderQa.safety?.mailerLiteApiCalled !== false) blockers.push('email_render_qa_reports_mailerlite_api_call');
    if (renderQa.safety?.sendsPerformed !== false) blockers.push('email_render_qa_reports_send');
  } else {
    blockers.push('email_render_qa_missing');
  }
  if (dryRun) {
    if (dryRun.status !== 'dry_run_ready_for_exact_asset_build_approval') {
      blockers.push(`email_asset_build_dry_run_not_ready:${dryRun.status ?? 'missing'}`);
    }
    if ((dryRun.freshScan?.conflictCount ?? 0) > 0) blockers.push('email_asset_build_dry_run_has_campaign_conflicts');
    if (countRows(dryRun.assetMutations) !== 0) blockers.push('dry_run_unexpectedly_reports_asset_mutations');
    if (dryRun.safety?.mailerLiteMutationsPerformed !== false) blockers.push('dry_run_reports_mailerlite_mutation');
    if (dryRun.safety?.mailerLiteAssetsCreatedOrEdited !== false) blockers.push('dry_run_reports_asset_create_or_edit');
    if (dryRun.safety?.sendsPerformed !== false) blockers.push('dry_run_reports_send');
    if (dryRun.safety?.subscribersRead !== false) blockers.push('dry_run_reports_subscriber_read');
    if (dryRun.safety?.groupsCreatedOrAssigned !== false) blockers.push('dry_run_reports_group_create_or_assignment');
  }
  if (executionAttemptPresent) {
    if (executionStatus === 'failed_during_mini_launch_email_asset_build') {
      blockers.push(executionAdvancedPlanBlocker
        ? 'mailerlite_api_content_submission_requires_advanced_plan'
        : 'email_asset_build_execution_attempt_failed');
    } else if (executionStatus && executionStatus !== 'dry_run_ready_for_exact_asset_build_approval') {
      blockers.push(`email_asset_build_execution_attempt_not_completed:${executionStatus}`);
    }
    if (executionMutations > 0 && executionStatus !== 'executed_mini_launch_email_asset_build') {
      blockers.push('email_asset_build_partial_mutation_requires_manual_reconciliation');
    }
    if (executionAttempt?.safety?.sendsPerformed !== false) blockers.push('execution_attempt_reports_send');
    if (executionAttempt?.safety?.subscribersRead !== false) blockers.push('execution_attempt_reports_subscriber_read');
    if (executionAttempt?.safety?.groupsCreatedOrAssigned !== false) blockers.push('execution_attempt_reports_group_create_or_assignment');
    if (executionAttempt?.safety?.workflowMutationsPerformed !== false) blockers.push('execution_attempt_reports_workflow_mutation');
  }
  if (!cleanString(scopePacket?.requestedFutureScope?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_asset_targets');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_email_asset_build',
    title: 'Mini-launch MailerLite draft email assets',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_builder_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: scopePacket?.requestedFutureScope?.exactApprovalPhrase,
    sourceStatuses: {
      scopePacket: scopePacket?.status ?? null,
      payloadManifest: payloadManifest?.status ?? null,
      renderQa: renderQa?.status ?? null,
      dryRun: dryRun?.status ?? null,
      executionAttempt: executionStatus,
    },
    targetNames,
    allowedAfterExactApproval: scopePacket?.requestedFutureScope?.allowedAfterExactApproval ?? [],
    stillClosed: scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval ?? payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval ?? [],
    requiredFreshEvidence: scopePacket?.preExecutionChecklist ?? [],
    blockers,
    evidence: {
      assetCount: scopePacket?.executiveSummary?.assetCount ?? payloadManifest?.executiveSummary?.payloadCount ?? null,
      payloadCount: payloadManifest?.executiveSummary?.payloadCount ?? null,
      contentBlockCount: payloadManifest?.executiveSummary?.contentBlockCount ?? null,
      placeholders: payloadManifest?.executiveSummary?.inertUrlPlaceholderCount ?? null,
      localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
      renderPreviewNonEmptyCount: renderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      htmlWrittenCount: renderQa?.executiveSummary?.htmlWrittenCount ?? null,
      campaignsRead: dryRun?.freshScan?.campaignsRead ?? null,
      createDraftCount: dryRun?.freshScan?.createDraftCount ?? null,
      updateDraftCount: dryRun?.freshScan?.updateDraftCount ?? null,
      conflictCount: dryRun?.freshScan?.conflictCount ?? null,
      assetMutationsPerformed: dryRun?.safety?.mailerLiteAssetsCreatedOrEdited ?? false,
      executionAttemptStatus: executionStatus,
      executionAssetMutationCount: executionMutations,
      executionErrorCount: executionErrors.length,
      executionAdvancedPlanContentBlocker: executionAdvancedPlanBlocker,
      sendsAllowedNow: payloadManifest?.approvalBoundary?.canSendNow ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-email-asset-build -- --execute --approval-phrase "<exact phrase>" --from-email "<verified sender>" --from-name "<sender name>"',
    notes: [
      'The payload manifest is local input, not approval.',
      executionAdvancedPlanBlocker
        ? 'MailerLite API rejected HTML content submission because the account is not on an Advanced plan; use Advanced/API, manual UI build, or a separately approved shell-draft fallback.'
        : null,
      dryRun
        ? 'Fresh campaign dry-run is attached; execute still needs exact approval and verified sender identity.'
        : 'Attach a fresh email asset-build dry-run before execute.',
      'Seed send remains a later separate gate after builder/render QA.',
    ].filter(Boolean),
  });
};

const buildMiniLaunchEmailManualUiBuilderItem = ({ packet }) => {
  const targetNames = targetNamesFrom((packet?.manualUiTargetDrafts ?? []).map((row) => row?.draftName));
  const blockers = [];

  if (packet?.status !== 'mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`manual_ui_builder_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.manualUiApprovalBoundary?.canAskAlejandroForApproval !== true) {
    blockers.push('manual_ui_builder_cannot_ask_approval_now');
  }
  if (packet?.manualUiApprovalBoundary?.packetIsApprovalByItself !== false) {
    blockers.push('manual_ui_builder_packet_self_authorizes_unexpectedly');
  }
  if (packet?.manualUiApprovalBoundary?.canUseBrowserNow !== false) {
    blockers.push('manual_ui_browser_gate_unexpectedly_open');
  }
  if (packet?.manualUiApprovalBoundary?.canCreateOrEditDraftsNow !== false) {
    blockers.push('manual_ui_draft_gate_unexpectedly_open');
  }
  if (packet?.executiveSummary?.advancedPlanApiBlockerConfirmed !== true) {
    blockers.push('advanced_plan_api_blocker_not_confirmed');
  }
  if ((packet?.executiveSummary?.apiAssetMutationCount ?? null) !== 0) {
    blockers.push(`api_asset_mutation_count_not_zero:${packet?.executiveSummary?.apiAssetMutationCount ?? 'missing'}`);
  }
  if (packet?.safety?.browserOpened !== false) blockers.push('manual_ui_packet_reports_browser_opened');
  if (packet?.safety?.mailerLiteApiCalled !== false) blockers.push('manual_ui_packet_reports_mailerlite_api_call');
  if (packet?.safety?.mailerLiteAssetsCreatedOrEdited !== false) blockers.push('manual_ui_packet_reports_asset_mutation');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('manual_ui_packet_reports_send');
  if (!cleanString(packet?.manualUiApprovalBoundary?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length !== 4) blockers.push(`manual_ui_target_count_not_4:${targetNames.length}`);

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_email_manual_ui_builder',
    title: 'Mini-launch MailerLite manual UI draft build',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_ui_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.manualUiApprovalBoundary?.exactApprovalPhrase,
    sourceStatuses: {
      packet: packet?.status ?? null,
      apiExecution: packet?.sourceEvidence?.assetBuildExecutionStatus ?? null,
      renderQa: packet?.sourceEvidence?.renderQaStatus ?? null,
      payloadManifest: packet?.sourceEvidence?.payloadManifestStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.manualUiApprovalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.manualUiApprovalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.manualUiApprovalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      targetDraftCount: packet?.executiveSummary?.targetDraftCount ?? null,
      htmlSourceCount: packet?.executiveSummary?.htmlSourceCount ?? null,
      localRenderReadyCount: packet?.executiveSummary?.localRenderReadyCount ?? null,
      advancedPlanApiBlockerConfirmed: packet?.executiveSummary?.advancedPlanApiBlockerConfirmed ?? null,
      apiAssetMutationCount: packet?.executiveSummary?.apiAssetMutationCount ?? null,
      canUseManualUiNow: packet?.executiveSummary?.canUseManualUiNow ?? null,
      canSendNow: packet?.executiveSummary?.canSendNow ?? null,
    },
    commandAfterApproval: 'manual MailerLite UI builder work only after exact approval; prefer Safari; no sends/workflows/subscribers/groups',
    notes: [
      'Fallback for API HTML content submission blocked by the current non-Advanced MailerLite plan.',
      'This approval would open only draft creation/editing in MailerLite UI; seed send remains separate.',
    ],
  });
};

const buildShopifyLocalBuildItem = ({ request }) => {
  const suggestedFiles = targetNamesFrom(
    request?.requestedLocalScope?.files,
    request?.requestedLocalScope?.shopifyFiles,
    request?.requestedLocalScope?.proposedFiles,
  );
  const blockers = [];

  if (request?.status !== 'ready_for_human_or_web_design_scope_approval_no_live_changes') {
    blockers.push(`shopify_local_build_request_not_ready:${request?.status ?? 'missing'}`);
  }
  if (!cleanString(request?.approvalGate?.requiredPhraseBeforeLocalFiles)) blockers.push('missing_exact_approval_phrase');
  if (request?.approvalGate?.canBuildLocalFilesNow !== false) blockers.push('local_build_gate_unexpectedly_open');
  if (request?.approvalGate?.canPublishOrConnectNow !== false) blockers.push('publish_or_connect_gate_unexpectedly_open');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'shopify_no_live_local_build',
    title: 'Shopify local no-live build files',
    lane: 'web_design_shopify_local_only',
    operationType: 'local_repo_edit_after_exact_no_live_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: request?.approvalGate?.requiredPhraseBeforeLocalFiles,
    sourceStatuses: {
      request: request?.status ?? null,
    },
    targetNames: suggestedFiles,
    allowedAfterExactApproval: [
      'edit_only_local_shopify_repo_files_named_in_the_request',
      'use inert placeholders only',
      'do not publish or call APIs',
    ],
    stillClosed: [
      'shopify_api_or_live_theme',
      'publish',
      'real_forms',
      'mailerlite_live_connection',
      'crm_live_write',
      'subscriber_or_workflow_mutation',
    ],
    requiredFreshEvidence: [
      'confirm exact file scope',
      'confirm inert placeholders',
      'confirm no Shopify CLI/API publish action',
    ],
    blockers,
    evidence: {
      suggestedFileCount: suggestedFiles.length,
      canPublishOrConnectNow: request?.approvalGate?.canPublishOrConnectNow ?? null,
    },
    commandAfterApproval: 'local Shopify repo edits only in /Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite',
    notes: ['This is a no-live local build approval, not a Shopify publish or MailerLite form approval.'],
  });
};

const buildBrujulaBuilderDraftItem = ({ correction, renderQa }) => {
  const subject = cleanString(correction?.draft?.subject) ?? 'Brújula Email 1';
  const htmlPath = cleanString(correction?.outputs?.htmlPath);
  const blockers = [];

  if (correction?.status !== 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes') {
    blockers.push(`brujula_correction_not_ready:${correction?.status ?? 'missing'}`);
  }
  if (renderQa?.status !== 'brujula_email1_local_render_qa_green_no_live_changes') {
    blockers.push(`brujula_render_qa_not_green:${renderQa?.status ?? 'missing'}`);
  }
  if (renderQa?.executiveSummary?.localRenderReady !== true) blockers.push('local_render_not_ready');
  if (!htmlPath) blockers.push('missing_local_html_path');

  const canAskNow = blockers.length === 0;
  const exactPhrase = `Apruebo SOLO crear/editar como borrador en MailerLite el Email 1 corregido de Brújula usando el HTML local ${htmlPath ?? '<html path missing>'}, sin enviar correos, sin publicar, sin activar workflows, sin subscribers, sin crear grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;

  return buildApprovalItem({
    id: 'brujula_email1_builder_draft',
    title: 'Brújula Email 1 corrected MailerLite draft',
    lane: 'brujula_test_pilot',
    operationType: 'live_mailerlite_builder_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: exactPhrase,
    sourceStatuses: {
      correction: correction?.status ?? null,
      renderQa: renderQa?.status ?? null,
    },
    targetNames: [subject],
    allowedAfterExactApproval: [
      'create_or_edit_only_the_brujula_email1_draft_in_mailerlite',
      'use_the_local_corrected_html_and_plain_text',
      'run_real_mailerlite_render_qa_before_any_test_send_request',
    ],
    stillClosed: [
      'test_send_or_public_send',
      'workflow_activation',
      'subscriber_or_group_mutation',
      'shopify_publish',
      'crm_write',
      'fact_store_write',
    ],
    requiredFreshEvidence: [
      'confirm local HTML path exists',
      'confirm local render QA is still green',
      'confirm target MailerLite draft identity before edit',
    ],
    blockers,
    evidence: {
      htmlPath,
      localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
      testSendReady: renderQa?.executiveSummary?.testSendReady ?? correction?.executiveSummary?.testSendReady ?? null,
    },
    commandAfterApproval: 'future MailerLite builder draft edit only after exact approval; no test send',
    notes: ['This advances the Brújula pilot toward builder QA but does not make it public-use ready.'],
  });
};

const buildMiniLaunchSeedSendItem = ({ payloadManifest, renderQa = null }) => buildApprovalItem({
  id: 'mini_launch_seed_send',
  title: 'Mini-launch seed/test send',
  lane: 'mini_launch_inteligencia_para_descansar',
  operationType: 'mailerLite_seed_send_after_later_exact_approval',
  approvalType: 'not_ready_for_request',
  canAskNow: false,
  exactApprovalPhrase: null,
  sourceStatuses: {
    payloadManifest: payloadManifest?.status ?? null,
    renderQa: renderQa?.status ?? null,
  },
  targetNames: [],
  allowedAfterExactApproval: [],
  stillClosed: [
    'seed_send',
    'workflow_or_automation_attachment',
    'subscriber_read_assignment_or_import',
    'audience_launch',
  ],
  requiredFreshEvidence: [
    'assets must first be built as drafts after exact asset-build approval',
    'real MailerLite builder/render QA must pass',
    'exact seed recipient and asset scope must be named',
  ],
  blockers: [
    'asset_build_not_executed',
    'real_mailerlite_render_qa_missing',
    'exact_seed_recipient_missing',
  ],
  evidence: {
    readyForSeedSendNow: payloadManifest?.executiveSummary?.readyForSeedSendNow ?? null,
    localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
    renderPreviewNonEmptyCount: renderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
  },
  commandAfterApproval: null,
  notes: ['Do not ask for seed-send approval from the asset-build packet alone.'],
});

const buildCrmSignalWriteItem = ({ packet }) => buildApprovalItem({
  id: 'crm_signal_writes',
  title: 'CRM signal ledger/card/scoring/Fact Store writes',
  lane: 'crm_signal_projection',
  operationType: 'crm_live_write_after_future_specific_approval_packet',
  approvalType: 'not_ready_for_request',
  canAskNow: false,
  exactApprovalPhrase: null,
  sourceStatuses: {
    projectionPacket: packet?.status ?? null,
  },
  targetNames: [],
  allowedAfterExactApproval: [],
  stillClosed: [
    'signal_ledger_append',
    'crm_card_write',
    'crm_scoring',
    'fact_store_write',
    'mailerlite_or_shopify_mutation',
  ],
  requiredFreshEvidence: [
    'build a separate CRM write approval packet with exact events, people and fields',
    'confirm no subscriber/workflow/send action is bundled',
  ],
  blockers: ['separate_crm_write_approval_packet_missing'],
  evidence: {
    canAppendSignalLedgerNow: packet?.approvalGate?.canAppendSignalLedgerNow ?? null,
    canWriteCardsNow: packet?.approvalGate?.canWriteCardsNow ?? null,
    canScoreNow: packet?.approvalGate?.canScoreNow ?? null,
    canWriteFactStoreNow: packet?.approvalGate?.canWriteFactStoreNow ?? null,
  },
  commandAfterApproval: null,
  notes: ['Current packet is a no-live interpretation bridge only.'],
});

const buildApprovalQueue = ({
  miniLaunchEmptyGroupPacket,
  miniLaunchEmptyGroupCreateDryRun,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailRenderQa,
  miniLaunchEmailAssetBuildDryRun,
  miniLaunchEmailAssetBuildExecution,
  miniLaunchEmailManualUiBuilderPacket,
  miniLaunchShopifyLocalBuildRequest,
  miniLaunchCrmSignalProjectionPacket,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  validationReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const approvalItems = [
    buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: miniLaunchEmptyGroupCreateDryRun,
    }),
    buildOnboardingV2EmptyGroupItem({
      packet: onboardingV2EmptyGroupsPacket,
      dryRun: onboardingV2EmptyGroupsCreateDryRun,
    }),
    buildMiniLaunchEmailAssetBuildItem({
      scopePacket: miniLaunchEmailAssetBuildScopePacket,
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      dryRun: miniLaunchEmailAssetBuildDryRun,
      executionAttempt: miniLaunchEmailAssetBuildExecution,
    }),
    buildMiniLaunchEmailManualUiBuilderItem({
      packet: miniLaunchEmailManualUiBuilderPacket,
    }),
    buildShopifyLocalBuildItem({
      request: miniLaunchShopifyLocalBuildRequest,
    }),
    buildBrujulaBuilderDraftItem({
      correction: brujulaEmailStyleCorrection,
      renderQa: brujulaEmailRenderQa,
    }),
    buildMiniLaunchSeedSendItem({
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
    }),
    buildCrmSignalWriteItem({
      packet: miniLaunchCrmSignalProjectionPacket,
    }),
  ];

  const readyItems = approvalItems.filter((item) => item.status === 'ready_for_exact_approval_request');
  const blockedItems = approvalItems.filter((item) => item.status === 'prepared_but_blocked_before_approval_request');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_approval_queue',
    generatedAt,
    ok: true,
    status: 'mailerlite_launch_os_approval_queue_ready_no_live_changes',
    executiveSummary: {
      totalApprovalItems: approvalItems.length,
      readyApprovalRequestCount: readyItems.length,
      blockedApprovalRequestCount: blockedItems.length,
      openLiveMutationGateCount: 0,
      validationStatus: validationReceipt?.validationStatus ?? null,
      validationTestFiles: validationReceipt?.testScope?.testFiles ?? null,
      validationTestCount: validationReceipt?.testScope?.testCount ?? null,
      nextBestHumanBoundary: readyItems[0]?.id ?? null,
      readyApprovalIds: readyItems.map((item) => item.id),
      blockedApprovalIds: blockedItems.map((item) => item.id),
    },
    approvalItems,
    hardStops: [
      'This queue is not approval.',
      'Only exact approval phrases can open the single named operation they describe.',
      'A group approval never authorizes subscribers, workflows or sends.',
      'An asset-build approval never authorizes seed sends, workflow attachment or audience launch.',
      'A Shopify local-build approval never authorizes publish, API calls, real forms or MailerLite/CRM live writes.',
      'CRM signal writes require a separate exact CRM write approval packet.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (queue) => {
  const lines = [
    '# MailerLite Launch OS v0 - Approval Queue',
    '',
    `Generated: ${queue.generatedAt}`,
    `Status: ${queue.status}`,
    '',
    '## Executive Summary',
    '',
    `- Ready approval requests: ${queue.executiveSummary.readyApprovalRequestCount}`,
    `- Blocked approval requests: ${queue.executiveSummary.blockedApprovalRequestCount}`,
    `- Open live mutation gates: ${queue.executiveSummary.openLiveMutationGateCount}`,
    `- Validation: ${queue.executiveSummary.validationStatus ?? 'unknown'} (${queue.executiveSummary.validationTestFiles ?? 'unknown'} files / ${queue.executiveSummary.validationTestCount ?? 'unknown'} tests)`,
    `- Next human boundary: ${queue.executiveSummary.nextBestHumanBoundary ?? 'none'}`,
    '',
    '## Approval Items',
    '',
  ];

  for (const item of queue.approvalItems) {
    lines.push(
      `### ${item.id}`,
      '',
      `- Title: ${item.title}`,
      `- Status: ${item.status}`,
      `- Can ask Alejandro now: ${item.canAskAlejandroNow}`,
      `- Lane: ${item.lane}`,
      `- Operation type: ${item.operationType}`,
      `- Target count: ${item.targetCount}`,
    );

    if (item.targetNames.length) {
      lines.push('- Targets:');
      for (const target of item.targetNames) lines.push(`  - ${target}`);
    }

    if (item.exactApprovalPhrase) {
      lines.push('', 'Exact approval phrase:', '', '```text', item.exactApprovalPhrase, '```');
    }

    if (item.blockers.length) {
      lines.push('', 'Blockers:');
      for (const blocker of item.blockers) lines.push(`- ${blocker}`);
    }

    if (item.allowedAfterExactApproval.length) {
      lines.push('', 'Allowed after exact approval:');
      for (const allowed of item.allowedAfterExactApproval) lines.push(`- ${allowed}`);
    }

    if (item.stillClosed.length) {
      lines.push('', 'Still closed:');
      for (const closed of item.stillClosed) lines.push(`- ${closed}`);
    }

    if (item.requiredFreshEvidence.length) {
      lines.push('', 'Required fresh evidence before execution:');
      for (const evidence of item.requiredFreshEvidence) lines.push(`- ${evidence}`);
    }

    lines.push('');
  }

  lines.push('## Hard Stops', '');
  for (const stop of queue.hardStops) lines.push(`- ${stop}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const buildQueueFromFiles = async (options) => {
  const entries = await Promise.all([
    readOptionalJsonWithDigest(options.miniLaunchEmptyGroupPacket, 'mini-launch empty-group approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty-group create dry-run'),
    readOptionalJsonWithDigest(options.onboardingV2EmptyGroupsPacket, 'onboarding v2 empty-groups approval packet'),
    readOptionalJsonWithDigest(options.onboardingV2EmptyGroupsCreateDryRun, 'onboarding v2 empty-groups create dry-run'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildScopePacket, 'mini-launch email asset-build scope packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmailBuilderPayloadManifest, 'mini-launch email builder payload manifest'),
    readOptionalJsonWithDigest(options.miniLaunchEmailRenderQa, 'mini-launch local email render QA packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildDryRun, 'mini-launch email asset-build dry-run'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildExecution, 'mini-launch email asset-build execution attempt'),
    readOptionalJsonWithDigest(options.miniLaunchEmailManualUiBuilderPacket, 'mini-launch manual UI builder fallback approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyLocalBuildRequest, 'Shopify no-live local build request'),
    readOptionalJsonWithDigest(options.miniLaunchCrmSignalProjectionPacket, 'CRM signal projection packet'),
    readOptionalJsonWithDigest(options.brujulaEmailStyleCorrection, 'Brújula corrected Email 1 packet'),
    readOptionalJsonWithDigest(options.brujulaEmailRenderQa, 'Brújula local render QA packet'),
    readOptionalJsonWithDigest(options.validationReceipt, 'latest validation receipt'),
  ]);

  const [
    miniLaunchEmptyGroupPacket,
    miniLaunchEmptyGroupCreateDryRun,
    onboardingV2EmptyGroupsPacket,
    onboardingV2EmptyGroupsCreateDryRun,
    miniLaunchEmailAssetBuildScopePacket,
    miniLaunchEmailBuilderPayloadManifest,
    miniLaunchEmailRenderQa,
    miniLaunchEmailAssetBuildDryRun,
    miniLaunchEmailAssetBuildExecution,
    miniLaunchEmailManualUiBuilderPacket,
    miniLaunchShopifyLocalBuildRequest,
    miniLaunchCrmSignalProjectionPacket,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    validationReceipt,
  ] = entries.map((entry) => entry.value);

  return buildApprovalQueue({
    miniLaunchEmptyGroupPacket,
    miniLaunchEmptyGroupCreateDryRun,
    onboardingV2EmptyGroupsPacket,
    onboardingV2EmptyGroupsCreateDryRun,
    miniLaunchEmailAssetBuildScopePacket,
    miniLaunchEmailBuilderPayloadManifest,
    miniLaunchEmailRenderQa,
    miniLaunchEmailAssetBuildDryRun,
    miniLaunchEmailAssetBuildExecution,
    miniLaunchEmailManualUiBuilderPacket,
    miniLaunchShopifyLocalBuildRequest,
    miniLaunchCrmSignalProjectionPacket,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    validationReceipt,
    sourceDigests: entries.map((entry) => entry.digest),
  });
};

const writeOutputs = async ({ queue, out, markdownOut }) => {
  if (out) {
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(resolve(out), `${JSON.stringify(queue, null, 2)}\n`);
  }

  if (markdownOut) {
    await mkdir(dirname(resolve(markdownOut)), { recursive: true });
    await writeFile(resolve(markdownOut), renderMarkdown(queue));
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const queue = await buildQueueFromFiles(options);
  await writeOutputs({ queue, out: options.out, markdownOut: options.markdownOut });

  console.log(JSON.stringify({
    ok: queue.ok,
    status: queue.status,
    generatedAt: queue.generatedAt,
    readyApprovalRequestCount: queue.executiveSummary.readyApprovalRequestCount,
    blockedApprovalRequestCount: queue.executiveSummary.blockedApprovalRequestCount,
    openLiveMutationGateCount: queue.executiveSummary.openLiveMutationGateCount,
    readyApprovalIds: queue.executiveSummary.readyApprovalIds,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: queue.safety,
  }, null, 2));
};

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildApprovalQueue,
  buildBrujulaBuilderDraftItem,
  buildMiniLaunchEmailAssetBuildItem,
  buildMiniLaunchEmailManualUiBuilderItem,
  buildMiniLaunchEmptyGroupItem,
  buildOnboardingV2EmptyGroupItem,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
