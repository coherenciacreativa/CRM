#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-manual-ui-execution-kit-2026-05-28';
const DEFAULT_MANUAL_UI_BUILDER_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_builder_packet_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-execution-kit.mjs [options]

Options:
  --manual-ui-builder-packet <path>  Manual UI builder packet JSON. Defaults to ${DEFAULT_MANUAL_UI_BUILDER_PACKET}
  --out <path>                       Write JSON execution kit
  --markdown-out <path>              Write Markdown execution kit
  --help                             Show this help

Local-only execution kit for the MailerLite manual UI draft build. It prepares
operator steps and receipt templates only. It never opens a browser, calls
MailerLite, creates/edits drafts, sends emails, reads or assigns subscribers,
creates groups, attaches workflows, touches Shopify/CRM, appends ledgers, writes
cards, changes scoring, touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    manualUiBuilderPacket: DEFAULT_MANUAL_UI_BUILDER_PACKET,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--manual-ui-builder-packet') options.manualUiBuilderPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
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
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  browserOpened: false,
  computerUseStarted: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  groupsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildFileEvidence = async (path, kind) => {
  const cleanedPath = cleanString(path);
  if (!cleanedPath) {
    return {
      path: null,
      kind,
      present: false,
      nonEmpty: false,
      sizeBytes: null,
      blocker: `${kind}_path_missing`,
    };
  }

  try {
    const fileStat = await stat(resolve(cleanedPath));
    return {
      path: resolve(cleanedPath),
      kind,
      present: true,
      nonEmpty: fileStat.size > 0,
      sizeBytes: fileStat.size,
      blocker: fileStat.size > 0 ? null : `${kind}_file_empty`,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      path: resolve(cleanedPath),
      kind,
      present: false,
      nonEmpty: false,
      sizeBytes: null,
      blocker: `${kind}_file_missing`,
    };
  }
};

const collectLocalFileEvidence = async (targetDrafts) => {
  const entries = [];
  for (const target of targetDrafts) {
    entries.push(await buildFileEvidence(target.htmlPath, `email_${target.step}_html`));
    if (target.previewPath) entries.push(await buildFileEvidence(target.previewPath, `email_${target.step}_preview`));
  }
  return entries;
};

const evidenceForPath = (localFileEvidence, path) => {
  const resolved = path ? resolve(path) : null;
  return localFileEvidence.find((entry) => entry.path === resolved) ?? null;
};

const validateSourcePacket = ({ packet, targetDrafts, localFileEvidence }) => {
  const blockers = [];
  const boundary = packet?.manualUiApprovalBoundary ?? {};

  if (packet?.status !== 'mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`manual_ui_builder_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.executiveSummary?.targetDraftCount !== 4) blockers.push(`target_draft_count_not_4:${packet?.executiveSummary?.targetDraftCount ?? 'missing'}`);
  if (packet?.executiveSummary?.htmlSourceCount !== 4) blockers.push(`html_source_count_not_4:${packet?.executiveSummary?.htmlSourceCount ?? 'missing'}`);
  if (packet?.executiveSummary?.localRenderReadyCount !== 4) blockers.push(`local_render_ready_count_not_4:${packet?.executiveSummary?.localRenderReadyCount ?? 'missing'}`);
  if (packet?.executiveSummary?.advancedPlanApiBlockerConfirmed !== true) blockers.push('advanced_plan_api_blocker_not_confirmed');
  if (packet?.executiveSummary?.apiAssetMutationCount !== 0) blockers.push(`api_asset_mutation_count_not_zero:${packet?.executiveSummary?.apiAssetMutationCount ?? 'missing'}`);
  if (packet?.executiveSummary?.canAskManualUiApprovalNow !== true) blockers.push('manual_ui_approval_not_askable');
  if (packet?.executiveSummary?.canUseManualUiNow !== false) blockers.push('manual_ui_execution_gate_unexpectedly_open');
  if (packet?.executiveSummary?.canSendNow !== false) blockers.push('send_gate_unexpectedly_open');
  if (packet?.executiveSummary?.openLiveMutationGateCount !== 0) blockers.push(`open_live_mutation_gate_count_not_zero:${packet?.executiveSummary?.openLiveMutationGateCount ?? 'missing'}`);

  if (boundary.canAskAlejandroForApproval !== true) blockers.push('boundary_cannot_ask_approval');
  if (boundary.packetIsApprovalByItself !== false) blockers.push('boundary_self_authorizes_unexpectedly');
  if (boundary.canUseBrowserNow !== false) blockers.push('boundary_browser_gate_unexpectedly_open');
  if (boundary.canCreateOrEditDraftsNow !== false) blockers.push('boundary_draft_gate_unexpectedly_open');
  if (!cleanString(boundary.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (packet?.operatingPolicy?.status !== 'manual_ui_now_advanced_api_later_when_volume_justifies') {
    blockers.push(`operating_policy_not_ui_now_advanced_later:${packet?.operatingPolicy?.status ?? 'missing'}`);
  }

  if (targetDrafts.length !== 4) blockers.push(`manual_ui_target_count_not_4:${targetDrafts.length}`);
  for (const target of targetDrafts) {
    if (!cleanString(target.draftName)) blockers.push(`target_${target.step ?? 'unknown'}_missing_draft_name`);
    if (!cleanString(target.subject)) blockers.push(`target_${target.step ?? 'unknown'}_missing_subject`);
    if (!cleanString(target.preheader)) blockers.push(`target_${target.step ?? 'unknown'}_missing_preheader`);
    if (!cleanString(target.htmlPath)) blockers.push(`target_${target.step ?? 'unknown'}_missing_html_path`);
    if (!cleanString(target.previewPath)) blockers.push(`target_${target.step ?? 'unknown'}_missing_preview_path`);
    if (target.localRenderReady !== true) blockers.push(`target_${target.step ?? 'unknown'}_local_render_not_ready`);
    if (!(target.stillClosed ?? []).includes('send_or_schedule')) blockers.push(`target_${target.step ?? 'unknown'}_send_stop_missing`);
    if (!evidenceForPath(localFileEvidence, target.htmlPath)) blockers.push(`target_${target.step ?? 'unknown'}_html_evidence_missing`);
    if (!evidenceForPath(localFileEvidence, target.previewPath)) blockers.push(`target_${target.step ?? 'unknown'}_preview_evidence_missing`);
  }

  for (const evidence of localFileEvidence) {
    if (evidence.blocker) blockers.push(evidence.blocker);
  }

  const safety = packet?.safety ?? {};
  if (safety.browserOpened !== false) blockers.push('source_packet_reports_browser_opened');
  if (safety.mailerLiteApiCalled !== false) blockers.push('source_packet_reports_mailerlite_api_call');
  if (safety.mailerLiteAssetsCreatedOrEdited !== false) blockers.push('source_packet_reports_asset_mutation');
  if (safety.sendsPerformed !== false) blockers.push('source_packet_reports_send');

  return [...new Set(blockers)];
};

const buildPerDraftSteps = ({ targetDrafts, localFileEvidence }) => targetDrafts.map((target) => {
  const htmlEvidence = evidenceForPath(localFileEvidence, target.htmlPath);
  const previewEvidence = evidenceForPath(localFileEvidence, target.previewPath);
  const placeholderText = countRows(target.placeholderValues) > 0
    ? target.placeholderValues.join(', ')
    : 'reply CTA only; no URL placeholder expected';

  return {
    step: target.step,
    role: target.role,
    draftName: target.draftName,
    subject: target.subject,
    preheader: target.preheader,
    htmlPath: target.htmlPath,
    previewPath: target.previewPath,
    htmlFileEvidence: htmlEvidence,
    previewFileEvidence: previewEvidence,
    placeholderValues: target.placeholderValues ?? [],
    replyCta: target.replyCta === true,
    localRenderReady: target.localRenderReady === true,
    uiChecklist: [
      'confirm exact approval intake matched mini_launch_email_manual_ui_builder before opening UI',
      'open MailerLite in Safari and stay inside campaign draft creation/editing only',
      `set campaign draft name exactly: ${target.draftName}`,
      `set subject exactly: ${target.subject}`,
      `set preheader exactly: ${target.preheader}`,
      `copy or import HTML from local source: ${target.htmlPath}`,
      `verify CTA placeholders remain inert: ${placeholderText}`,
      'do not select recipients, groups, segments, automations or schedules',
      'save as draft only; do not send a test or public email',
      'capture draft id/status evidence for the post-build receipt',
    ],
    postBuildEvidenceSlots: {
      draftId: null,
      draftUrlOrUiReference: null,
      mailerLiteStatusExpected: 'draft',
      screenshotPath: null,
      campaignNameChecked: false,
      subjectChecked: false,
      preheaderChecked: false,
      htmlSourceChecked: false,
      placeholdersStillInertChecked: false,
      noRecipientsSelectedChecked: false,
      noGroupsOrSegmentsSelectedChecked: false,
      noWorkflowOrAutomationAttachedChecked: false,
      notScheduledChecked: false,
      notSentChecked: false,
    },
  };
});

const buildReceiptTemplate = (perDraftSteps) => ({
  status: 'manual_ui_build_receipt_template_not_executed',
  executed: false,
  createdOrEditedDraftCount: 0,
  sendCount: 0,
  subscriberReadOrAssignmentCount: 0,
  groupAssignmentCount: 0,
  workflowAttachmentCount: 0,
  scheduleCount: 0,
  draftReceipts: perDraftSteps.map((step) => ({
    step: step.step,
    draftName: step.draftName,
    draftId: null,
    status: null,
    subjectChecked: false,
    preheaderChecked: false,
    htmlSourcePath: step.htmlPath,
    placeholdersStillInertChecked: false,
    noRecipientsSelectedChecked: false,
    noGroupsOrSegmentsSelectedChecked: false,
    noWorkflowOrAutomationAttachedChecked: false,
    notScheduledChecked: false,
    notSentChecked: false,
    evidencePath: null,
  })),
  requiredNoLiveEvidence: [
    'all_four_campaigns_remain_draft',
    'no_test_send_or_public_send',
    'no_schedule',
    'no_recipients_groups_segments_or_subscribers_selected',
    'no_workflow_or_automation_attachment',
    'no_shopify_or_crm_change',
    'no_signal_ledger_card_score_or_fact_store_write',
  ],
});

const buildManualUiExecutionKit = ({
  manualUiBuilderPacket,
  localFileEvidence = [],
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const targetDrafts = manualUiBuilderPacket?.manualUiTargetDrafts ?? [];
  const blockers = validateSourcePacket({
    packet: manualUiBuilderPacket,
    targetDrafts,
    localFileEvidence,
  });
  const ready = blockers.length === 0;
  const perDraftSteps = buildPerDraftSteps({ targetDrafts, localFileEvidence });
  const exactApprovalPhrase = manualUiBuilderPacket?.manualUiApprovalBoundary?.exactApprovalPhrase ?? null;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_manual_ui_execution_kit',
    generatedAt,
    ok: ready,
    status: ready
      ? 'mini_launch_email_manual_ui_execution_kit_ready_no_live_changes'
      : 'mini_launch_email_manual_ui_execution_kit_blocked_no_live_changes',
    launch: manualUiBuilderPacket?.launch ?? null,
    executiveSummary: {
      sourcePacketStatus: manualUiBuilderPacket?.status ?? null,
      targetDraftCount: targetDrafts.length,
      htmlSourceReadyCount: perDraftSteps.filter((step) => step.htmlFileEvidence?.present && step.htmlFileEvidence?.nonEmpty).length,
      previewReadyCount: perDraftSteps.filter((step) => step.previewFileEvidence?.present && step.previewFileEvidence?.nonEmpty).length,
      exactApprovalPhrasePresent: Boolean(cleanString(exactApprovalPhrase)),
      preferredUiBrowser: 'Safari',
      executionKitIsApprovalByItself: false,
      approvalIntakeRequired: true,
      canOpenBrowserNow: false,
      canCreateOrEditDraftsNow: false,
      canSendNow: false,
      openLiveMutationGateCount: 0,
      operatingPolicyStatus: manualUiBuilderPacket?.operatingPolicy?.status ?? null,
    },
    executionBoundary: {
      kitIsApprovalByItself: false,
      exactApprovalPhraseRequired: exactApprovalPhrase,
      exactApprovalIntakeMatchRequiredBeforeUi: true,
      canOpenBrowserNow: false,
      canCreateOrEditDraftsNow: false,
      canSendNow: false,
      canPublishNow: false,
      canScheduleNow: false,
      canAttachWorkflowNow: false,
      canReadOrAssignSubscribersNow: false,
      canCreateOrAssignGroupsNow: false,
      canTouchShopifyNow: false,
      canTouchCrmNow: false,
      allowedAfterExactApproval: manualUiBuilderPacket?.manualUiApprovalBoundary?.allowedAfterExactApproval ?? [],
      stillClosedEvenAfterApproval: manualUiBuilderPacket?.manualUiApprovalBoundary?.stillClosedEvenAfterApproval ?? [],
    },
    operatorRoute: {
      preferredBrowser: 'Safari',
      route: 'manual_mailerlite_ui_campaign_draft_builder',
      reason: 'Growing Business plan blocks API HTML content submission; manual UI is the documented current route until launch frequency or subscriber tier justifies Advanced/API.',
      targetSystem: 'MailerLite UI',
      targetOperation: 'create_or_edit_exactly_4_named_unsent_draft_campaigns',
      sourceContent: 'local HTML files from the manual UI builder packet',
      futureAdvancedApiUpgradeTriggers: manualUiBuilderPacket?.operatingPolicy?.futureAdvancedApiUpgradeTriggers ?? [],
    },
    freshEvidenceBeforeOpeningUi: [
      {
        id: 'exact_approval_intake',
        required: true,
        status: 'not_satisfied_by_this_kit',
        instruction: 'Run approval intake and proceed only if exactly mini_launch_email_manual_ui_builder matches.',
      },
      {
        id: 'fresh_campaign_collision_check',
        required: true,
        status: 'required_at_execution_time',
        instruction: 'Before changing UI state, confirm the four target names are not already sent/scheduled/live campaigns.',
      },
      {
        id: 'local_html_sources_exist',
        required: true,
        status: perDraftSteps.every((step) => step.htmlFileEvidence?.present && step.htmlFileEvidence?.nonEmpty) ? 'satisfied_now' : 'blocked',
        instruction: 'All four local HTML sources must exist and be non-empty.',
      },
      {
        id: 'local_render_previews_exist',
        required: true,
        status: perDraftSteps.every((step) => step.previewFileEvidence?.present && step.previewFileEvidence?.nonEmpty) ? 'satisfied_now' : 'blocked',
        instruction: 'All four render previews must exist and be non-empty.',
      },
      {
        id: 'no_prior_partial_manual_receipt',
        required: true,
        status: 'required_at_execution_time',
        instruction: 'If any UI draft was partially created before, stop and reconcile before editing.',
      },
    ],
    perDraftSteps,
    postBuildReceiptTemplate: buildReceiptTemplate(perDraftSteps),
    blockers,
    hardStops: [
      'This kit is not approval and does not open MailerLite UI.',
      'Do not start browser/computer-use until the exact approval phrase matches one queue item.',
      'Do not send, schedule, publish, attach workflows, select recipients, read subscribers, assign groups or connect Shopify/CRM.',
      'After the UI build, produce a receipt before asking for seed-send or workflow approval.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (kit) => {
  const lines = [
    '# MailerLite Launch OS v0 - Manual UI Execution Kit',
    '',
    `Generated: ${kit.generatedAt}`,
    `Status: ${kit.status}`,
    '',
    '## Executive Summary',
    '',
    `- Target drafts: ${kit.executiveSummary.targetDraftCount}`,
    `- HTML sources ready: ${kit.executiveSummary.htmlSourceReadyCount}`,
    `- Preview files ready: ${kit.executiveSummary.previewReadyCount}`,
    `- Preferred UI browser: ${kit.executiveSummary.preferredUiBrowser}`,
    `- Kit is approval by itself: ${kit.executiveSummary.executionKitIsApprovalByItself}`,
    `- Can open browser now: ${kit.executiveSummary.canOpenBrowserNow}`,
    `- Can create/edit drafts now: ${kit.executiveSummary.canCreateOrEditDraftsNow}`,
    `- Open live mutation gates: ${kit.executiveSummary.openLiveMutationGateCount}`,
    '',
    '## Exact Approval Phrase Required',
    '',
    kit.executionBoundary.exactApprovalPhraseRequired ? '```text' : '- Missing.',
  ];

  if (kit.executionBoundary.exactApprovalPhraseRequired) {
    lines.push(kit.executionBoundary.exactApprovalPhraseRequired, '```');
  }

  lines.push('', '## Operator Route', '');
  lines.push(`- Browser: ${kit.operatorRoute.preferredBrowser}`);
  lines.push(`- Route: ${kit.operatorRoute.route}`);
  lines.push(`- Operation: ${kit.operatorRoute.targetOperation}`);
  lines.push(`- Reason: ${kit.operatorRoute.reason}`);

  lines.push('', '## Fresh Evidence Before UI', '');
  for (const evidence of kit.freshEvidenceBeforeOpeningUi) {
    lines.push(`- ${evidence.id}: ${evidence.status}; ${evidence.instruction}`);
  }

  lines.push('', '## Per-Draft Steps', '');
  for (const step of kit.perDraftSteps) {
    lines.push(`### ${step.step}. ${step.draftName}`);
    lines.push(`- Subject: ${step.subject}`);
    lines.push(`- Preheader: ${step.preheader}`);
    lines.push(`- HTML: ${step.htmlPath}`);
    lines.push(`- Preview: ${step.previewPath}`);
    lines.push(`- HTML ready: ${step.htmlFileEvidence?.present === true && step.htmlFileEvidence?.nonEmpty === true}`);
    lines.push(`- Preview ready: ${step.previewFileEvidence?.present === true && step.previewFileEvidence?.nonEmpty === true}`);
    lines.push('- Checklist:');
    for (const item of step.uiChecklist) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## Post-Build Receipt Template', '');
  lines.push(`- Executed now: ${kit.postBuildReceiptTemplate.executed}`);
  lines.push(`- Draft receipts expected: ${kit.postBuildReceiptTemplate.draftReceipts.length}`);
  lines.push(`- Required no-live evidence: ${kit.postBuildReceiptTemplate.requiredNoLiveEvidence.join(', ')}`);

  lines.push('', '## Blockers', '');
  if (kit.blockers.length) {
    for (const blocker of kit.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- None.');
  }

  lines.push('', '## Safety', '');
  lines.push('- Sin navegador abierto.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin drafts creados/editados.');
  lines.push('- Sin sends, schedules, subscribers, groups, workflows o automations.');
  lines.push('- Sin Shopify/CRM live mutations, ledgers, cards, scoring o Fact Store.');
  lines.push('- Sin tokens impresos.');

  return `${lines.join('\n')}\n`;
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

const buildKitFromFiles = async (options) => {
  const { value: manualUiBuilderPacket, digest } = await readJsonWithDigest(
    options.manualUiBuilderPacket,
    'manual UI builder fallback packet and exact approval boundary',
  );
  const localFileEvidence = await collectLocalFileEvidence(manualUiBuilderPacket?.manualUiTargetDrafts ?? []);

  return buildManualUiExecutionKit({
    manualUiBuilderPacket,
    localFileEvidence,
    sourceDigests: [digest],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const kit = await buildKitFromFiles(options);
  if (options.out) await writeJson(options.out, kit);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(kit));

  console.log(JSON.stringify({
    ok: kit.ok,
    status: kit.status,
    generatedAt: kit.generatedAt,
    targetDraftCount: kit.executiveSummary.targetDraftCount,
    canOpenBrowserNow: kit.executiveSummary.canOpenBrowserNow,
    canCreateOrEditDraftsNow: kit.executiveSummary.canCreateOrEditDraftsNow,
    exactApprovalPhrasePresent: kit.executiveSummary.exactApprovalPhrasePresent,
    blockers: kit.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: kit.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite manual UI execution kit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFileEvidence,
  buildManualUiExecutionKit,
  buildPerDraftSteps,
  buildReceiptTemplate,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateSourcePacket,
};
