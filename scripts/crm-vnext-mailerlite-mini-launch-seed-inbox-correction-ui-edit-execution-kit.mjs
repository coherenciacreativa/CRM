#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit-2026-05-31';
const DEFAULT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.mjs [options]

Options:
  --approval-packet <path>      Seed inbox correction UI edit approval packet. Defaults to ${DEFAULT_APPROVAL_PACKET}
  --correction-preview <path>   Redacted correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --email-render-qa <path>      Local correction render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --out <path>                  Write JSON execution kit. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>         Write Markdown execution kit. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                        Show this help

Local-only execution kit for the approved MailerLite UI correction edit. It
prepares operator steps and a receipt template only. It never opens a browser,
calls MailerLite/Shopify/CRM live APIs, sends emails, schedules/publishes
campaigns, reads or mutates subscribers, creates/assigns groups or segments,
edits workflows, appends ledgers, writes cards/scoring, touches Fact Store,
prints tokens, or prints exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    approvalPacket: DEFAULT_APPROVAL_PACKET,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--approval-packet') options.approvalPacket = argv[++index];
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
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
      exactUrlsStoredInReport: false,
    },
  };
};

const buildFileEvidence = async (path, kind) => {
  const cleaned = cleanString(path);
  if (!cleaned) {
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
    const fileStat = await stat(resolve(cleaned));
    return {
      path: resolve(cleaned),
      kind,
      present: true,
      nonEmpty: fileStat.size > 0,
      sizeBytes: fileStat.size,
      blocker: fileStat.size > 0 ? null : `${kind}_file_empty`,
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return {
      path: resolve(cleaned),
      kind,
      present: false,
      nonEmpty: false,
      sizeBytes: null,
      blocker: `${kind}_file_missing`,
    };
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  browserOpened: false,
  computerUseStarted: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
  segmentsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  campaignsPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  exactUrlsPrinted: false,
  tokensPrinted: false,
});

const byStep = (rows) => new Map((rows ?? []).map((row) => [Number(row?.step), row]));

const previewPngForHtml = (htmlPath) => cleanString(htmlPath) ? `${htmlPath}.png` : null;

const buildPerDraftSteps = async ({ approvalPacket, correctionPreview, emailRenderQa }) => {
  const previewRows = byStep(correctionPreview?.previewRows ?? []);
  const qaRows = byStep(emailRenderQa?.emailQa ?? []);
  const drafts = approvalPacket?.targetDrafts ?? [];
  const steps = [];

  for (const draft of drafts) {
    const step = Number(draft?.step);
    const preview = previewRows.get(step) ?? {};
    const qa = qaRows.get(step) ?? {};
    const htmlPath = cleanString(qa?.htmlPath);
    const previewPath = cleanString(qa?.previewPath ?? qa?.pngPath) ?? previewPngForHtml(htmlPath);
    const htmlEvidence = await buildFileEvidence(htmlPath, `email_${step}_corrected_html`);
    const previewEvidence = await buildFileEvidence(previewPath, `email_${step}_corrected_preview`);
    const linkKey = cleanString(preview?.finalPublicLinkKey);

    steps.push({
      step,
      role: cleanString(preview?.role ?? qa?.role),
      draftName: cleanString(draft?.draftName ?? preview?.draftName),
      subject: cleanString(preview?.subject),
      finalPublicLinkKey: linkKey,
      placeholderToReplace:
        linkKey === 'result_or_resource_link' ? 'result_or_resource_link_placeholder'
          : linkKey === 'practice_link' ? 'practice_link_placeholder'
            : linkKey === 'editorial_note_link' ? 'editorial_note_link_placeholder'
              : null,
      htmlPath,
      previewPath,
      htmlFileEvidence: htmlEvidence,
      previewFileEvidence: previewEvidence,
      uiChecklist: [
        'confirm exact approval intake matched mini_launch_seed_inbox_correction_ui_edit before opening UI',
        'open MailerLite in Safari and stay inside the four existing draft campaigns only',
        `find existing draft exactly: ${cleanString(draft?.draftName ?? preview?.draftName) ?? 'missing_draft_name'}`,
        `replace draft content from corrected local HTML: ${htmlPath ?? 'missing_html_path'}`,
        linkKey
          ? `replace only ${linkKey} placeholder with the matching scoped Shopify preview URL from the execution receipt`
          : 'confirm no URL placeholder replacement is expected for this draft',
        'do not select recipients, groups, segments, automations or schedules',
        'save as draft only; do not send a test or public email',
        'record local receipt evidence before asking for QA/test-send approval',
      ],
      postEditEvidenceSlots: {
        draftIdOrUiReference: null,
        draftStillVisible: false,
        contentCopiedFromCorrectedHtml: false,
        placeholderReplacementChecked: false,
        noUnexpectedPlaceholderChecked: false,
        noRecipientsSelectedChecked: false,
        noGroupsOrSegmentsSelectedChecked: false,
        noWorkflowOrAutomationAttachedChecked: false,
        notScheduledChecked: false,
        notSentChecked: false,
      },
    });
  }

  return steps;
};

const validateSources = ({ approvalPacket, correctionPreview, emailRenderQa, perDraftSteps }) => {
  const blockers = [];
  const boundary = approvalPacket?.approvalBoundary ?? {};
  const decision = approvalPacket?.decision ?? {};

  if (approvalPacket?.status !== 'seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`approval_packet_not_ready:${approvalPacket?.status ?? 'missing'}`);
  }
  if (approvalPacket?.executiveSummary?.canAskAlejandroForApproval !== true) blockers.push('approval_packet_not_askable');
  if (approvalPacket?.executiveSummary?.targetDraftCount !== 4) blockers.push(`target_draft_count_not_4:${approvalPacket?.executiveSummary?.targetDraftCount ?? 'missing'}`);
  if (decision.packetIsApprovalByItself !== false) blockers.push('approval_packet_self_authorizes_unexpectedly');
  if (decision.canOpenMailerLiteUiNow !== false) blockers.push('approval_packet_ui_gate_unexpectedly_open');
  if (decision.canEditDraftsNow !== false) blockers.push('approval_packet_edit_gate_unexpectedly_open');
  if (decision.canSendNow !== false) blockers.push('approval_packet_send_gate_unexpectedly_open');
  if (!cleanString(decision.exactApprovalPhrase)) blockers.push('approval_packet_missing_exact_phrase');

  if (correctionPreview?.status !== 'seed_inbox_correction_preview_ready_no_live_changes') {
    blockers.push(`correction_preview_not_ready:${correctionPreview?.status ?? 'missing'}`);
  }
  if (correctionPreview?.executiveSummary?.redactedPayloadManifestReady !== true) blockers.push('redacted_payload_manifest_not_ready');
  if (correctionPreview?.executiveSummary?.finalPublicLinksReady !== true) blockers.push('final_public_links_not_ready');
  if (correctionPreview?.executiveSummary?.publicAudienceSendUrlGateReady !== false) blockers.push('public_audience_send_url_gate_unexpectedly_ready');
  if (correctionPreview?.executiveSummary?.exactUrlsStoredInReport !== false) blockers.push('correction_preview_exact_urls_in_report');
  if (countRows(correctionPreview?.previewRows) !== 4) blockers.push(`correction_preview_rows_not_4:${countRows(correctionPreview?.previewRows)}`);

  if (emailRenderQa?.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
    blockers.push(`email_render_qa_not_green:${emailRenderQa?.status ?? 'missing'}`);
  }
  if (emailRenderQa?.executiveSummary?.localRenderReady !== true) blockers.push('email_render_local_not_ready');
  if (emailRenderQa?.executiveSummary?.emailCount !== 4) blockers.push(`email_render_count_not_4:${emailRenderQa?.executiveSummary?.emailCount ?? 'missing'}`);
  if (emailRenderQa?.executiveSummary?.htmlWrittenCount !== 4) blockers.push(`html_written_count_not_4:${emailRenderQa?.executiveSummary?.htmlWrittenCount ?? 'missing'}`);
  if (emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount !== 4) blockers.push(`render_preview_non_empty_count_not_4:${emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? 'missing'}`);
  if (emailRenderQa?.executiveSummary?.redCheckCount !== 0) blockers.push(`email_render_red_check_count_not_0:${emailRenderQa?.executiveSummary?.redCheckCount ?? 'missing'}`);
  if (emailRenderQa?.executiveSummary?.publicUseReady !== false) blockers.push('email_render_public_gate_unexpectedly_open');
  if (emailRenderQa?.executiveSummary?.seedSendReady !== false) blockers.push('email_render_seed_send_gate_unexpectedly_open');

  if (!boundary.allowedAfterExactApproval?.includes('edit_only_the_four_existing_target_drafts')) blockers.push('approval_boundary_missing_four_draft_limit');
  if (!boundary.stillClosedEvenAfterApproval?.includes('test_send_or_seed_send')) blockers.push('approval_boundary_missing_test_send_stop');
  if (!boundary.stillClosedEvenAfterApproval?.includes('subscriber_read_assignment_import_or_mutation')) blockers.push('approval_boundary_missing_subscriber_stop');

  if (perDraftSteps.length !== 4) blockers.push(`per_draft_step_count_not_4:${perDraftSteps.length}`);
  for (const step of perDraftSteps) {
    if (!Number.isFinite(step.step)) blockers.push('per_draft_step_missing_number');
    if (!cleanString(step.draftName)) blockers.push(`step_${step.step}_missing_draft_name`);
    if (!cleanString(step.subject)) blockers.push(`step_${step.step}_missing_subject`);
    if (!step.htmlFileEvidence?.present || !step.htmlFileEvidence?.nonEmpty) blockers.push(`step_${step.step}_html_not_ready`);
    if (!step.previewFileEvidence?.present || !step.previewFileEvidence?.nonEmpty) blockers.push(`step_${step.step}_preview_not_ready`);
  }

  const safety = approvalPacket?.safety ?? {};
  if (safety.mailerLiteApiCalled !== false) blockers.push('approval_packet_reports_mailerlite_api_call');
  if (safety.mailerLiteUiOpened !== false) blockers.push('approval_packet_reports_mailerlite_ui_opened');
  if (safety.mailerLiteMutationsPerformed !== false) blockers.push('approval_packet_reports_mailerlite_mutation');
  if (safety.sendsPerformed !== false) blockers.push('approval_packet_reports_send');

  return [...new Set(blockers)];
};

const buildReceiptTemplate = (perDraftSteps) => ({
  status: 'seed_inbox_correction_ui_edit_receipt_template_not_executed',
  executed: false,
  editedDraftCount: 0,
  sendCount: 0,
  scheduleCount: 0,
  subscriberReadOrAssignmentCount: 0,
  groupOrSegmentAssignmentCount: 0,
  workflowAttachmentCount: 0,
  draftReceipts: perDraftSteps.map((step) => ({
    step: step.step,
    draftName: step.draftName,
    draftIdOrUiReference: null,
    draftStillVisible: false,
    contentCopiedFromCorrectedHtml: false,
    placeholderReplacementChecked: false,
    noUnexpectedPlaceholderChecked: false,
    noRecipientsSelectedChecked: false,
    noGroupsOrSegmentsSelectedChecked: false,
    noWorkflowOrAutomationAttachedChecked: false,
    notScheduledChecked: false,
    notSentChecked: false,
  })),
  requiredNoLiveEvidence: [
    'all_four_original_campaigns_remain_draft',
    'only_corrected_content_or_placeholders_changed',
    'no_test_send_or_public_send',
    'no_schedule_or_publish',
    'no_recipients_groups_segments_or_subscribers_selected',
    'no_workflow_or_automation_attachment',
    'no_shopify_or_crm_change',
    'no_signal_ledger_card_score_or_fact_store_write',
  ],
});

const buildExecutionKit = async ({
  approvalPacket,
  correctionPreview,
  emailRenderQa,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const perDraftSteps = await buildPerDraftSteps({ approvalPacket, correctionPreview, emailRenderQa });
  const blockers = validateSources({ approvalPacket, correctionPreview, emailRenderQa, perDraftSteps });
  const ready = blockers.length === 0;
  const exactApprovalPhrase = approvalPacket?.decision?.exactApprovalPhrase ?? null;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_seed_inbox_correction_ui_edit_execution_kit',
    generatedAt,
    ok: ready,
    status: ready
      ? 'seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes'
      : 'seed_inbox_correction_ui_edit_execution_kit_blocked_no_live_changes',
    launch: correctionPreview?.launch ?? null,
    executiveSummary: {
      approvalPacketStatus: approvalPacket?.status ?? null,
      correctionPreviewStatus: correctionPreview?.status ?? null,
      emailRenderQaStatus: emailRenderQa?.status ?? null,
      targetDraftCount: perDraftSteps.length,
      htmlSourceReadyCount: perDraftSteps.filter((step) => step.htmlFileEvidence?.present && step.htmlFileEvidence?.nonEmpty).length,
      previewReadyCount: perDraftSteps.filter((step) => step.previewFileEvidence?.present && step.previewFileEvidence?.nonEmpty).length,
      exactApprovalPhrasePresent: Boolean(cleanString(exactApprovalPhrase)),
      preferredUiBrowser: 'Safari',
      executionKitIsApprovalByItself: false,
      approvalIntakeRequired: true,
      canOpenBrowserNow: false,
      canEditDraftsNow: false,
      canSendNow: false,
      canPublishOrScheduleNow: false,
      openLiveMutationGateCount: 0,
      blockerCount: blockers.length,
      nextBestMove: ready
        ? 'Ask Alejandro for exact UI correction approval, then edit only the four existing MailerLite drafts and produce a receipt.'
        : 'Resolve local blockers before asking for UI correction approval.',
    },
    executionBoundary: {
      kitIsApprovalByItself: false,
      exactApprovalPhraseRequired: exactApprovalPhrase,
      exactApprovalIntakeMatchRequiredBeforeUi: true,
      approvalIdExpected: 'mini_launch_seed_inbox_correction_ui_edit',
      canOpenBrowserNow: false,
      canEditDraftsNow: false,
      canSendNow: false,
      canPublishNow: false,
      canScheduleNow: false,
      canAttachWorkflowNow: false,
      canReadOrAssignSubscribersNow: false,
      canCreateOrAssignGroupsNow: false,
      canTouchShopifyNow: false,
      canTouchCrmNow: false,
      allowedAfterExactApproval: approvalPacket?.approvalBoundary?.allowedAfterExactApproval ?? [],
      stillClosedEvenAfterApproval: approvalPacket?.approvalBoundary?.stillClosedEvenAfterApproval ?? [],
    },
    operatorRoute: {
      preferredBrowser: 'Safari',
      route: 'manual_mailerlite_ui_existing_draft_correction_edit',
      reason: 'Existing API edit/replacement routes were unsafe or not inert; the current safe lane is a tightly scoped UI edit of existing drafts only.',
      targetSystem: 'MailerLite UI',
      targetOperation: 'edit_only_four_existing_unsent_draft_campaigns',
      sourceContent: 'QA-green corrected local HTML from the seed inbox correction preview',
      urlPolicy: 'use scoped Shopify preview URLs from the execution receipt; do not print them in shared reports',
    },
    freshEvidenceBeforeOpeningUi: [
      {
        id: 'exact_approval_intake',
        required: true,
        status: 'not_satisfied_by_this_kit',
        instruction: 'Run approval intake and proceed only if exactly mini_launch_seed_inbox_correction_ui_edit matches.',
      },
      {
        id: 'fresh_draft_visibility_check',
        required: true,
        status: 'required_at_execution_time',
        instruction: 'Confirm all four existing target drafts are visible in MailerLite Drafts before editing.',
      },
      {
        id: 'no_recipient_or_workflow_selected',
        required: true,
        status: 'required_at_execution_time',
        instruction: 'Confirm each target draft has no recipients, groups, segments, workflows, schedule or send state selected.',
      },
      {
        id: 'local_corrected_html_sources_exist',
        required: true,
        status: perDraftSteps.every((step) => step.htmlFileEvidence?.present && step.htmlFileEvidence?.nonEmpty) ? 'satisfied_now' : 'blocked',
        instruction: 'All four corrected local HTML sources must exist and be non-empty.',
      },
      {
        id: 'local_corrected_render_previews_exist',
        required: true,
        status: perDraftSteps.every((step) => step.previewFileEvidence?.present && step.previewFileEvidence?.nonEmpty) ? 'satisfied_now' : 'blocked',
        instruction: 'All four corrected render previews must exist and be non-empty.',
      },
    ],
    perDraftSteps,
    postEditReceiptTemplate: buildReceiptTemplate(perDraftSteps),
    blockers,
    hardStops: [
      'This kit is not approval and does not open MailerLite UI.',
      'Do not start browser/computer-use until the exact approval phrase matches the current queue item.',
      'Do not send, schedule, publish, attach workflows, select recipients, read subscribers, assign groups or connect Shopify/CRM.',
      'After editing the UI drafts, produce a receipt and run real MailerLite render QA before any test-send or public-send approval.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (kit) => {
  const lines = [
    '# MailerLite Launch OS v0 - Seed Inbox Correction UI Edit Execution Kit',
    '',
    `Generated: ${kit.generatedAt}`,
    `Status: ${kit.status}`,
    '',
    '## Executive Summary',
    '',
    `- Target drafts: ${kit.executiveSummary.targetDraftCount}`,
    `- Corrected HTML sources ready: ${kit.executiveSummary.htmlSourceReadyCount}`,
    `- Corrected previews ready: ${kit.executiveSummary.previewReadyCount}`,
    `- Preferred UI browser: ${kit.executiveSummary.preferredUiBrowser}`,
    `- Kit is approval by itself: ${kit.executiveSummary.executionKitIsApprovalByItself}`,
    `- Can open browser now: ${kit.executiveSummary.canOpenBrowserNow}`,
    `- Can edit drafts now: ${kit.executiveSummary.canEditDraftsNow}`,
    `- Can send now: ${kit.executiveSummary.canSendNow}`,
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
    lines.push(`- HTML: ${step.htmlPath}`);
    lines.push(`- Preview: ${step.previewPath}`);
    lines.push(`- Placeholder to replace: ${step.placeholderToReplace ?? 'none'}`);
    lines.push(`- Link key: ${step.finalPublicLinkKey ?? 'none'}`);
    lines.push(`- HTML ready: ${step.htmlFileEvidence?.present === true && step.htmlFileEvidence?.nonEmpty === true}`);
    lines.push(`- Preview ready: ${step.previewFileEvidence?.present === true && step.previewFileEvidence?.nonEmpty === true}`);
    lines.push('- Checklist:');
    for (const item of step.uiChecklist) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## Post-Edit Receipt Template', '');
  lines.push(`- Executed now: ${kit.postEditReceiptTemplate.executed}`);
  lines.push(`- Draft receipts expected: ${kit.postEditReceiptTemplate.draftReceipts.length}`);
  lines.push(`- Required no-live evidence: ${kit.postEditReceiptTemplate.requiredNoLiveEvidence.join(', ')}`);

  lines.push('', '## Blockers', '');
  if (kit.blockers.length) {
    for (const blocker of kit.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- None.');
  }

  lines.push('', '## Safety', '');
  lines.push('- Sin navegador abierto.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin UI edits ejecutados.');
  lines.push('- Sin sends, schedules, publish, subscribers, groups, segments, workflows o automations.');
  lines.push('- Sin Shopify/CRM live mutations, ledgers, cards, scoring o Fact Store.');
  lines.push('- Sin URLs exactas impresas.');
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
  const [
    { value: approvalPacket, digest: approvalDigest },
    { value: correctionPreview, digest: correctionDigest },
    { value: emailRenderQa, digest: renderQaDigest },
  ] = await Promise.all([
    readJsonWithDigest(options.approvalPacket, 'seed inbox correction UI edit approval boundary'),
    readJsonWithDigest(options.correctionPreview, 'redacted corrected payload preview'),
    readJsonWithDigest(options.emailRenderQa, 'QA-green corrected local HTML/render evidence'),
  ]);

  return buildExecutionKit({
    approvalPacket,
    correctionPreview,
    emailRenderQa,
    sourceDigests: [approvalDigest, correctionDigest, renderQaDigest],
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
    htmlSourceReadyCount: kit.executiveSummary.htmlSourceReadyCount,
    previewReadyCount: kit.executiveSummary.previewReadyCount,
    canOpenBrowserNow: kit.executiveSummary.canOpenBrowserNow,
    canEditDraftsNow: kit.executiveSummary.canEditDraftsNow,
    canSendNow: kit.executiveSummary.canSendNow,
    exactApprovalPhrasePresent: kit.executiveSummary.exactApprovalPhrasePresent,
    blockerCount: kit.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: kit.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite seed inbox correction UI edit execution kit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildExecutionKit,
  buildFileEvidence,
  buildPerDraftSteps,
  buildReceiptTemplate,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateSources,
};
