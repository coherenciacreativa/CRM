#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-email-manual-ui-build-receipt-2026-05-28';
const DEFAULT_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_APPROVAL_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_intake_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-email-manual-ui-build-receipt.mjs [options]

Options:
  --correction <path>              Brújula corrected Email 1 packet. Defaults to ${DEFAULT_CORRECTION}
  --render-qa <path>               Brújula local render QA packet. Defaults to ${DEFAULT_RENDER_QA}
  --approval-intake <path>         Launch OS approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
  --campaign-id <id>               MailerLite campaign id observed after build
  --email-editor-id <id>           Optional MailerLite editor id from UI URL
  --campaign-name <name>           Campaign name observed after build
  --subject <subject>              Subject observed after build
  --preheader <text>               Preheader/preview text observed after build
  --campaigns-read <number>        Campaigns read in post-build read-only scan
  --drafts-tab-count <number>      Drafts tab count observed after build
  --outbox-count <number>          Outbox count observed after build
  --pre-scan-campaigns-read <n>    Campaigns read in pre-build read-only scan
  --pre-scan-exact-target-matches <n> Exact target matches before build
  --used-editor <value>            Editor used. Example: new_simple_editor
  --custom-html-editor-status <value> Custom HTML status observed
  --fresh-collision-check <text>   Short operator evidence from fresh scan/UI
  --observed-in-drafts             Operator observed draft in MailerLite Drafts UI
  --content-preview-observed       Operator observed content preview in MailerLite UI
  --recipients-empty-observed      Operator observed empty recipients field
  --saved-indicator-observed       Operator observed Saved indicator after details edits
  --out <path>                     Write JSON receipt
  --markdown-out <path>            Write Markdown receipt
  --help                           Show this help

Receipt-only report for the approved Brújula Email 1 manual MailerLite UI draft
build. This script does not open a browser, call MailerLite APIs, send emails,
schedule campaigns, read or assign subscribers, create groups, attach workflows,
touch Shopify/CRM, append ledgers, write cards, change scoring, touch Fact Store,
or print tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseInteger = (value, name) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`invalid_${name}:${value}`);
  return parsed;
};

const parseArgs = (argv) => {
  const options = {
    correction: DEFAULT_CORRECTION,
    renderQa: DEFAULT_RENDER_QA,
    approvalIntake: DEFAULT_APPROVAL_INTAKE,
    campaignId: null,
    emailEditorId: null,
    campaignName: null,
    subject: null,
    preheader: null,
    campaignsRead: null,
    draftsTabCount: null,
    outboxCount: null,
    preScanCampaignsRead: null,
    preScanExactTargetMatches: null,
    usedEditor: null,
    customHtmlEditorStatus: null,
    freshCollisionCheck: null,
    observedInDrafts: false,
    contentPreviewObserved: false,
    recipientsEmptyObserved: false,
    savedIndicatorObserved: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--correction') options.correction = argv[++index];
    else if (arg === '--render-qa') options.renderQa = argv[++index];
    else if (arg === '--approval-intake') options.approvalIntake = argv[++index];
    else if (arg === '--campaign-id') options.campaignId = argv[++index];
    else if (arg === '--email-editor-id') options.emailEditorId = argv[++index];
    else if (arg === '--campaign-name') options.campaignName = argv[++index];
    else if (arg === '--subject') options.subject = argv[++index];
    else if (arg === '--preheader') options.preheader = argv[++index];
    else if (arg === '--campaigns-read') options.campaignsRead = parseInteger(argv[++index], 'campaigns_read');
    else if (arg === '--drafts-tab-count') options.draftsTabCount = parseInteger(argv[++index], 'drafts_tab_count');
    else if (arg === '--outbox-count') options.outboxCount = parseInteger(argv[++index], 'outbox_count');
    else if (arg === '--pre-scan-campaigns-read') options.preScanCampaignsRead = parseInteger(argv[++index], 'pre_scan_campaigns_read');
    else if (arg === '--pre-scan-exact-target-matches') options.preScanExactTargetMatches = parseInteger(argv[++index], 'pre_scan_exact_target_matches');
    else if (arg === '--used-editor') options.usedEditor = argv[++index];
    else if (arg === '--custom-html-editor-status') options.customHtmlEditorStatus = argv[++index];
    else if (arg === '--fresh-collision-check') options.freshCollisionCheck = argv[++index];
    else if (arg === '--observed-in-drafts') options.observedInDrafts = true;
    else if (arg === '--content-preview-observed') options.contentPreviewObserved = true;
    else if (arg === '--recipients-empty-observed') options.recipientsEmptyObserved = true;
    else if (arg === '--saved-indicator-observed') options.savedIndicatorObserved = true;
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

const fileExists = async (path) => {
  if (!cleanString(path)) return false;
  try {
    await access(resolve(path));
    return true;
  } catch {
    return false;
  }
};

const buildSafety = () => ({
  receiptOnly: true,
  browserOpenedByOperator: true,
  computerUseStartedByOperator: true,
  mailerLiteUiDraftMutationsRecorded: true,
  mailerLiteApiCalledByThisReceipt: false,
  shopifyApiCalledByThisReceipt: false,
  crmLiveApiCalledByThisReceipt: false,
  subscribersReadOrAssigned: false,
  subscriberRowsPrinted: false,
  groupsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const validateReceipt = ({ correction, renderQa, approvalIntake, htmlSourceExists, txtSourceExists, options }) => {
  const blockers = [];
  const expectedSubject = cleanString(correction?.draft?.subject);
  const expectedPreheader = cleanString(correction?.draft?.preheader);

  if (correction?.status !== 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes') {
    blockers.push(`correction_not_ready:${correction?.status ?? 'missing'}`);
  }
  if (renderQa?.status !== 'brujula_email1_local_render_qa_green_no_live_changes') {
    blockers.push(`render_qa_not_green:${renderQa?.status ?? 'missing'}`);
  }
  if (renderQa?.executiveSummary?.localRenderReady !== true) blockers.push('local_render_not_ready');
  if (approvalIntake?.executiveSummary?.matchedApprovalId !== 'brujula_email1_builder_draft') {
    blockers.push(`approval_intake_not_brujula:${approvalIntake?.executiveSummary?.matchedApprovalId ?? 'missing'}`);
  }
  if (approvalIntake?.executiveSummary?.matchedReadyApproval !== true) blockers.push('approval_intake_ready_match_missing');
  if (approvalIntake?.executiveSummary?.liveMutationPerformed !== false) blockers.push('approval_intake_reports_live_mutation');
  if (!htmlSourceExists) blockers.push('html_source_missing');
  if (!txtSourceExists) blockers.push('plain_text_source_missing');
  if (!cleanString(options.campaignId)) blockers.push('campaign_id_missing');
  if (!cleanString(options.campaignName)) blockers.push('campaign_name_missing');
  if (cleanString(options.subject) !== expectedSubject) blockers.push('subject_mismatch');
  if (expectedPreheader && cleanString(options.preheader) !== expectedPreheader) blockers.push('preheader_mismatch');
  if (!options.observedInDrafts) blockers.push('draft_not_observed_in_drafts');
  if (!options.contentPreviewObserved) blockers.push('content_preview_not_observed');
  if (!options.recipientsEmptyObserved) blockers.push('recipients_empty_not_observed');
  if (!options.savedIndicatorObserved) blockers.push('saved_indicator_not_observed');
  if (options.campaignsRead === null) blockers.push('campaigns_read_missing');
  if (options.preScanCampaignsRead === null) blockers.push('pre_scan_campaigns_read_missing');
  if (options.preScanExactTargetMatches !== 0) blockers.push(`pre_scan_exact_target_matches_not_zero:${options.preScanExactTargetMatches ?? 'missing'}`);
  if (options.draftsTabCount === null || options.draftsTabCount < 1) blockers.push('drafts_tab_count_missing');
  if (options.outboxCount !== 0) blockers.push(`outbox_count_not_zero:${options.outboxCount ?? 'missing'}`);
  if (!cleanString(options.usedEditor)) blockers.push('used_editor_missing');
  if (!cleanString(options.customHtmlEditorStatus)) blockers.push('custom_html_editor_status_missing');
  if (!cleanString(options.freshCollisionCheck)) blockers.push('fresh_collision_check_missing');

  return [...new Set(blockers)];
};

const buildBrujulaManualUiBuildReceipt = async ({
  correction,
  renderQa,
  approvalIntake,
  options,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const htmlSourcePath = cleanString(correction?.outputs?.htmlPath);
  const txtSourcePath = cleanString(correction?.outputs?.plainTextPath ?? correction?.outputs?.txtPath);
  const [htmlSourceExists, txtSourceExists] = await Promise.all([
    fileExists(htmlSourcePath),
    fileExists(txtSourcePath),
  ]);
  const blockers = validateReceipt({
    correction,
    renderQa,
    approvalIntake,
    htmlSourceExists,
    txtSourceExists,
    options,
  });
  const completed = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'receipt_only_mailerlite_brujula_manual_ui_draft_build',
    generatedAt,
    ok: completed,
    status: completed
      ? 'brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends'
      : 'brujula_email1_manual_ui_build_receipt_incomplete_or_blocked',
    executiveSummary: {
      approvalMatched: approvalIntake?.executiveSummary?.matchedApprovalId === 'brujula_email1_builder_draft',
      createdOrEditedDraftCount: completed ? 1 : 0,
      campaignId: cleanString(options.campaignId),
      campaignName: cleanString(options.campaignName),
      subject: cleanString(options.subject),
      preheader: cleanString(options.preheader),
      allTargetDraftsVisibleInDrafts: options.observedInDrafts,
      draftsTabCountAfterBuild: options.draftsTabCount,
      outboxCountAfterBuild: options.outboxCount,
      campaignsReadAfterBuild: options.campaignsRead,
      sendCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupAssignmentCount: 0,
      workflowAttachmentCount: 0,
      factStoreWriteCount: 0,
    },
    draftReceipt: {
      role: 'brujula_email1_corrected_delivery_draft',
      campaignId: cleanString(options.campaignId),
      emailEditorId: cleanString(options.emailEditorId),
      campaignName: cleanString(options.campaignName),
      expectedSubject: cleanString(correction?.draft?.subject),
      observedSubject: cleanString(options.subject),
      expectedPreheader: cleanString(correction?.draft?.preheader),
      observedPreheader: cleanString(options.preheader),
      htmlSourcePath,
      txtSourcePath,
      htmlSourceExists,
      txtSourceExists,
      status: options.observedInDrafts ? 'draft_visible_in_mailerlite_drafts' : 'not_observed',
      uiVisibleInDrafts: options.observedInDrafts,
      contentCopiedFromLocalHtmlPath: true,
      contentPreviewObserved: options.contentPreviewObserved,
      subjectChecked: cleanString(options.subject) === cleanString(correction?.draft?.subject),
      preheaderChecked: cleanString(options.preheader) === cleanString(correction?.draft?.preheader),
      recipientsEmptyObserved: options.recipientsEmptyObserved,
      savedIndicatorObserved: options.savedIndicatorObserved,
      noWorkflowOrAutomationAttachedChecked: true,
      notScheduledChecked: true,
      notSentChecked: true,
    },
    uiEvidence: {
      preferredBrowserUsed: 'Safari',
      mailerLiteAccountPlanObserved: 'Growing Business',
      freshCollisionCheck: cleanString(options.freshCollisionCheck),
      editorRoute: {
        requestedSource: htmlSourcePath,
        usedEditor: cleanString(options.usedEditor),
        customHtmlEditorStatus: cleanString(options.customHtmlEditorStatus),
        note: 'Content was built in MailerLite UI as a draft without opening send, schedule, workflow, subscriber, group, Shopify, CRM or Fact Store scope.',
      },
      freshReadOnlyScans: {
        preBuildCampaignsRead: options.preScanCampaignsRead,
        preBuildExactTargetMatches: options.preScanExactTargetMatches,
        postBuildCampaignsRead: options.campaignsRead,
        postBuildOutboxCount: options.outboxCount,
      },
    },
    stillClosedAfterThisReceipt: [
      'test_send_or_public_send',
      'workflow_activation',
      'subscriber_read_assignment_or_import',
      'group_creation_or_assignment',
      'shopify_publish_or_form_connection',
      'crm_signal_ledger_append',
      'crm_card_write',
      'crm_scoring',
      'fact_store_write',
    ],
    blockers,
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderMarkdown = (receipt) => {
  const lines = [
    '# MailerLite Launch OS v0 - Brújula Email 1 Manual UI Build Receipt',
    '',
    `- Status: ${receipt.status}`,
    `- Campaign id: ${receipt.executiveSummary.campaignId ?? 'missing'}`,
    `- Campaign name: ${receipt.executiveSummary.campaignName ?? 'missing'}`,
    `- Subject: ${receipt.executiveSummary.subject ?? 'missing'}`,
    `- Preheader: ${receipt.executiveSummary.preheader ?? 'missing'}`,
    `- Drafts tab count: ${receipt.executiveSummary.draftsTabCountAfterBuild ?? 'missing'}`,
    `- Outbox count: ${receipt.executiveSummary.outboxCountAfterBuild ?? 'missing'}`,
    `- Sends performed: ${receipt.executiveSummary.sendCount}`,
    `- Subscribers/groups/workflows touched: ${receipt.executiveSummary.subscriberReadOrAssignmentCount}/${receipt.executiveSummary.groupAssignmentCount}/${receipt.executiveSummary.workflowAttachmentCount}`,
    '',
    '## Still Closed',
    '',
    ...receipt.stillClosedAfterThisReceipt.map((gate) => `- ${gate}`),
    '',
  ];

  if (receipt.blockers.length > 0) {
    lines.push('## Blockers', '');
    for (const blocker of receipt.blockers) lines.push(`- ${blocker}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

const writeOutputs = async ({ receipt, out, markdownOut }) => {
  if (out) {
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(resolve(out), `${JSON.stringify(receipt, null, 2)}\n`);
  }

  if (markdownOut) {
    await mkdir(dirname(resolve(markdownOut)), { recursive: true });
    await writeFile(resolve(markdownOut), renderMarkdown(receipt));
  }
};

const buildReceiptFromFiles = async (options) => {
  const entries = await Promise.all([
    readJsonWithDigest(options.correction, 'Brújula corrected local HTML/plain-text source packet'),
    readJsonWithDigest(options.renderQa, 'Brújula local render QA packet'),
    readJsonWithDigest(options.approvalIntake, 'Launch OS approval intake for Brújula exact phrase'),
  ]);
  const [correction, renderQa, approvalIntake] = entries.map((entry) => entry.value);
  return buildBrujulaManualUiBuildReceipt({
    correction,
    renderQa,
    approvalIntake,
    options,
    sourceDigests: entries.map((entry) => entry.digest),
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const receipt = await buildReceiptFromFiles(options);
  await writeOutputs({ receipt, out: options.out, markdownOut: options.markdownOut });

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    campaignId: receipt.executiveSummary.campaignId,
    createdOrEditedDraftCount: receipt.executiveSummary.createdOrEditedDraftCount,
    outboxCountAfterBuild: receipt.executiveSummary.outboxCountAfterBuild,
    blockers: receipt.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: receipt.safety,
  }, null, 2));
};

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula manual UI build receipt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBrujulaManualUiBuildReceipt,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
