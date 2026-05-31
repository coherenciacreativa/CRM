#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt-2026-05-31';
const DEFAULT_EXECUTION_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_APPROVAL_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_intake_current_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_receipt_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt.mjs [options]

Options:
  --execution-kit <path>       UI correction execution kit JSON. Defaults to ${DEFAULT_EXECUTION_KIT}
  --approval-intake <path>     Exact approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
  --observed-in-drafts         Operator observed all target drafts in MailerLite Drafts UI after editing
  --drafts-tab-count <number>  Drafts tab count observed after editing
  --outbox-count <number>      Outbox count observed after editing
  --used-editor <value>        Editor used. Example: mailerlite_drag_drop_editor
  --fresh-draft-state-check <text> Short operator evidence, e.g. all 4 drafts visible; outbox 0; no recipients/workflows/schedules
  --draft-ui-reference <value> Optional repeated reference: <step>:key=value;key=value
  --out <path>                 Write JSON receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>        Write Markdown receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                       Show this help

Receipt-only report for the approved MailerLite UI correction edit. The script
does not open a browser, call MailerLite APIs, send emails, schedule/publish
campaigns, read or assign subscribers, create groups or segments, attach
workflows, touch Shopify/CRM, append ledgers, write cards, change scoring,
touch Fact Store, print exact URLs, or print tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseInteger = (value, name) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`invalid_${name}:${value}`);
  return parsed;
};

const parseDraftUiReference = (value) => {
  const cleaned = cleanString(value);
  if (!cleaned) throw new Error('empty_draft_ui_reference');
  const separatorIndex = cleaned.indexOf(':');
  const stepPart = separatorIndex === -1 ? cleaned : cleaned.slice(0, separatorIndex);
  const rawPairs = separatorIndex === -1 ? '' : cleaned.slice(separatorIndex + 1);
  const step = parseInteger(stepPart, 'draft_ui_reference_step');
  const reference = { step };
  for (const rawPair of rawPairs.split(';')) {
    const pair = cleanString(rawPair);
    if (!pair) continue;
    const separator = pair.indexOf('=');
    if (separator === -1) throw new Error(`invalid_draft_ui_reference_pair:${pair}`);
    const key = cleanString(pair.slice(0, separator));
    const val = cleanString(pair.slice(separator + 1));
    if (key && val) reference[key] = val;
  }
  return reference;
};

const parseArgs = (argv) => {
  const options = {
    executionKit: DEFAULT_EXECUTION_KIT,
    approvalIntake: DEFAULT_APPROVAL_INTAKE,
    observedInDrafts: false,
    draftsTabCount: null,
    outboxCount: null,
    usedEditor: null,
    freshDraftStateCheck: null,
    draftUiReferences: [],
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--execution-kit') options.executionKit = argv[++index];
    else if (arg === '--approval-intake') options.approvalIntake = argv[++index];
    else if (arg === '--observed-in-drafts') options.observedInDrafts = true;
    else if (arg === '--drafts-tab-count') options.draftsTabCount = parseInteger(argv[++index], 'drafts_tab_count');
    else if (arg === '--outbox-count') options.outboxCount = parseInteger(argv[++index], 'outbox_count');
    else if (arg === '--used-editor') options.usedEditor = argv[++index];
    else if (arg === '--fresh-draft-state-check') options.freshDraftStateCheck = argv[++index];
    else if (arg === '--draft-ui-reference') options.draftUiReferences.push(parseDraftUiReference(argv[++index]));
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

const referenceForStep = (references, step) =>
  references.find((reference) => reference.step === step) ?? null;

const buildRecordedSafety = () => ({
  receiptOnly: true,
  browserOpenedByOperator: true,
  computerUseStartedByOperator: true,
  mailerLiteUiDraftMutationsRecorded: true,
  mailerLiteApiCalledByThisReceipt: false,
  shopifyApiCalledByThisReceipt: false,
  crmLiveApiCalledByThisReceipt: false,
  subscribersReadOrAssigned: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
  segmentsCreatedOrAssigned: false,
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
  exactUrlsPrinted: false,
  tokensPrinted: false,
});

const buildDraftReceipts = ({ executionKit, options }) =>
  (executionKit?.perDraftSteps ?? []).map((step) => {
    const uiReference = referenceForStep(options.draftUiReferences, step.step);
    const expectsPlaceholderReplacement = Boolean(cleanString(step.placeholderToReplace));
    return {
      step: step.step,
      role: step.role,
      draftName: step.draftName,
      expectedSubject: step.subject,
      correctedHtmlSourcePath: step.htmlPath,
      expectedPlaceholderReplacement: step.placeholderToReplace,
      expectedLinkKey: step.finalPublicLinkKey,
      status: options.observedInDrafts ? 'draft_visible_in_mailerlite_drafts_after_correction' : 'not_observed',
      draftStillVisible: options.observedInDrafts,
      contentCopiedFromCorrectedHtml: options.observedInDrafts,
      placeholderReplacementChecked: options.observedInDrafts && expectsPlaceholderReplacement,
      noUnexpectedPlaceholderChecked: options.observedInDrafts,
      noRecipientsSelectedChecked: options.observedInDrafts,
      noGroupsOrSegmentsSelectedChecked: options.observedInDrafts,
      noWorkflowOrAutomationAttachedChecked: options.observedInDrafts,
      notPublishedChecked: options.observedInDrafts,
      notScheduledChecked: options.observedInDrafts,
      notSentChecked: options.observedInDrafts,
      exactUrlPrinted: false,
      draftUiReference: uiReference,
    };
  });

const validateReceipt = ({ executionKit, approvalIntake, draftReceipts, options }) => {
  const blockers = [];
  const targetCount = executionKit?.executiveSummary?.targetDraftCount ?? countRows(executionKit?.perDraftSteps);

  if (executionKit?.status !== 'seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes') {
    blockers.push(`execution_kit_not_ready:${executionKit?.status ?? 'missing'}`);
  }
  if (approvalIntake?.executiveSummary?.matchedApprovalId !== 'mini_launch_seed_inbox_correction_ui_edit') {
    blockers.push(`approval_intake_not_seed_inbox_correction_ui_edit:${approvalIntake?.executiveSummary?.matchedApprovalId ?? 'missing'}`);
  }
  if (approvalIntake?.executiveSummary?.matchedReadyApproval !== true) blockers.push('approval_intake_ready_match_missing');
  if (approvalIntake?.executiveSummary?.liveMutationPerformed !== false) blockers.push('approval_intake_reports_live_mutation');
  if (targetCount !== 4) blockers.push(`target_draft_count_not_4:${targetCount}`);
  if (draftReceipts.length !== 4) blockers.push(`draft_receipt_count_not_4:${draftReceipts.length}`);
  if (!options.observedInDrafts) blockers.push('operator_did_not_observe_all_drafts_after_edit');
  if (options.draftsTabCount === null) blockers.push('drafts_tab_count_missing');
  if (options.outboxCount !== 0) blockers.push(`outbox_count_not_zero:${options.outboxCount ?? 'missing'}`);
  if (!cleanString(options.usedEditor)) blockers.push('used_editor_missing');
  if (!cleanString(options.freshDraftStateCheck)) blockers.push('fresh_draft_state_check_missing');

  for (const draft of draftReceipts) {
    const expectsPlaceholderReplacement = Boolean(cleanString(draft.expectedPlaceholderReplacement));
    if (draft.draftStillVisible !== true) blockers.push(`draft_${draft.step}_not_visible_after_edit`);
    if (draft.contentCopiedFromCorrectedHtml !== true) blockers.push(`draft_${draft.step}_corrected_html_not_confirmed`);
    if (expectsPlaceholderReplacement && draft.placeholderReplacementChecked !== true) blockers.push(`draft_${draft.step}_placeholder_replacement_not_confirmed`);
    if (draft.noUnexpectedPlaceholderChecked !== true) blockers.push(`draft_${draft.step}_unexpected_placeholder_check_missing`);
    if (draft.noRecipientsSelectedChecked !== true) blockers.push(`draft_${draft.step}_recipients_check_missing`);
    if (draft.noGroupsOrSegmentsSelectedChecked !== true) blockers.push(`draft_${draft.step}_groups_segments_check_missing`);
    if (draft.noWorkflowOrAutomationAttachedChecked !== true) blockers.push(`draft_${draft.step}_workflow_check_missing`);
    if (draft.notPublishedChecked !== true) blockers.push(`draft_${draft.step}_publish_check_missing`);
    if (draft.notScheduledChecked !== true) blockers.push(`draft_${draft.step}_schedule_check_missing`);
    if (draft.notSentChecked !== true) blockers.push(`draft_${draft.step}_send_check_missing`);
    if (draft.exactUrlPrinted !== false) blockers.push(`draft_${draft.step}_exact_url_printed`);
  }

  return [...new Set(blockers)];
};

const buildSeedInboxCorrectionUiEditReceipt = ({
  executionKit,
  approvalIntake,
  options,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const draftReceipts = buildDraftReceipts({ executionKit, options });
  const blockers = validateReceipt({ executionKit, approvalIntake, draftReceipts, options });
  const completed = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'receipt_only_mailerlite_seed_inbox_correction_ui_edit',
    generatedAt,
    ok: completed,
    status: completed
      ? 'seed_inbox_correction_ui_edit_receipt_executed_existing_drafts_updated_no_sends'
      : 'seed_inbox_correction_ui_edit_receipt_incomplete_or_blocked',
    launch: executionKit?.launch ?? null,
    executiveSummary: {
      approvalMatched: approvalIntake?.executiveSummary?.matchedApprovalId === 'mini_launch_seed_inbox_correction_ui_edit',
      editedDraftCount: completed ? draftReceipts.length : 0,
      allTargetDraftsVisibleInDrafts: options.observedInDrafts,
      draftsTabCountAfterEdit: options.draftsTabCount,
      outboxCountAfterEdit: options.outboxCount,
      usedEditor: cleanString(options.usedEditor),
      freshDraftStateCheck: cleanString(options.freshDraftStateCheck),
      sendCount: 0,
      publishCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupOrSegmentAssignmentCount: 0,
      workflowAttachmentCount: 0,
      factStoreWriteCount: 0,
      exactUrlPrinted: false,
      blockerCount: blockers.length,
    },
    uiEvidence: {
      preferredBrowserUsed: 'Safari',
      targetOperation: 'edit_existing_mailerlite_drafts_only',
      freshDraftStateCheck: cleanString(options.freshDraftStateCheck),
      usedEditor: cleanString(options.usedEditor),
      note: 'Receipt records operator-observed UI outcome only; this script did not open MailerLite or call MailerLite APIs.',
    },
    draftReceipts,
    requiredNoLiveEvidence: [
      'all_four_existing_campaigns_remain_draft',
      'only_corrected_content_or_named_placeholders_changed',
      'no_test_send_or_public_send',
      'no_schedule_or_publish',
      'no_recipients_groups_segments_or_subscribers_selected',
      'no_workflow_or_automation_attachment',
      'no_shopify_or_crm_change',
      'no_signal_ledger_card_score_or_fact_store_write',
    ],
    stillClosedAfterThisReceipt: [
      'real_mailerlite_render_qa',
      'seed_send_or_test_send',
      'public_audience_send',
      'schedule_or_public_send',
      'workflow_or_automation_attachment',
      'subscriber_read_assignment_or_import',
      'group_creation_or_assignment',
      'shopify_preview_publish_or_form_connection',
      'crm_signal_ledger_append',
      'crm_card_write',
      'crm_scoring',
      'fact_store_write',
      'audience_launch',
    ],
    nextHumanBoundaries: [
      'real_mailerlite_render_qa_or_seed_send_requires_separate_exact_scope_after_receipt',
      'crm_signal_writes_require_separate_exact_write_packet',
      'public_audience_send_requires_public_readiness_and_separate_exact_approval',
    ],
    blockers,
    safety: buildRecordedSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (receipt) => {
  const lines = [
    '# MailerLite Mini-Launch - Seed Inbox Correction UI Edit Receipt',
    '',
    `Generated: ${receipt.generatedAt}`,
    `Status: ${receipt.status}`,
    '',
    '## Executive Summary',
    '',
    `- Drafts edited: ${receipt.executiveSummary.editedDraftCount}`,
    `- All target drafts visible in Drafts: ${receipt.executiveSummary.allTargetDraftsVisibleInDrafts}`,
    `- Drafts tab count after edit: ${receipt.executiveSummary.draftsTabCountAfterEdit ?? 'not supplied'}`,
    `- Outbox count after edit: ${receipt.executiveSummary.outboxCountAfterEdit ?? 'not supplied'}`,
    `- Editor used: ${receipt.executiveSummary.usedEditor ?? 'not supplied'}`,
    `- Sends/publish/schedules: ${receipt.executiveSummary.sendCount}/${receipt.executiveSummary.publishCount}/${receipt.executiveSummary.scheduleCount}`,
    `- Subscriber/group/workflow attachments: ${receipt.executiveSummary.subscriberReadOrAssignmentCount}/${receipt.executiveSummary.groupOrSegmentAssignmentCount}/${receipt.executiveSummary.workflowAttachmentCount}`,
    `- Exact URLs printed: ${receipt.executiveSummary.exactUrlPrinted}`,
    '',
    '## Draft Receipts',
    '',
  ];

  for (const draft of receipt.draftReceipts) {
    lines.push(
      `### ${draft.step}. ${draft.draftName}`,
      `- Status: ${draft.status}`,
      `- Corrected HTML source: ${draft.correctedHtmlSourcePath}`,
      `- Placeholder expected: ${draft.expectedPlaceholderReplacement ?? 'none'}`,
      `- Placeholder replacement checked: ${draft.placeholderReplacementChecked}`,
      `- No recipients/groups/segments/workflows: ${draft.noRecipientsSelectedChecked}/${draft.noGroupsOrSegmentsSelectedChecked}/${draft.noWorkflowOrAutomationAttachedChecked}`,
      `- Not published/scheduled/sent: ${draft.notPublishedChecked}/${draft.notScheduledChecked}/${draft.notSentChecked}`,
      `- Exact URL printed: ${draft.exactUrlPrinted}`,
      '',
    );
  }

  lines.push('## Required No-Live Evidence', '', ...receipt.requiredNoLiveEvidence.map((item) => `- ${item}`));
  lines.push('', '## Still Closed', '', ...receipt.stillClosedAfterThisReceipt.map((item) => `- ${item}`));

  lines.push('', '## Blockers', '');
  if (receipt.blockers.length) {
    for (const blocker of receipt.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- None.');
  }

  lines.push('', '## Safety', '');
  lines.push('- Receipt-only; this script did not open UI or call MailerLite API.');
  lines.push('- No sends, publish, schedules, subscribers, groups, segments, workflows or automations.');
  lines.push('- No Shopify/CRM live mutations, ledgers, cards, scoring or Fact Store.');
  lines.push('- No exact URLs printed.');
  lines.push('- No tokens printed.');

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

const buildReceiptFromFiles = async (options) => {
  const [
    { value: executionKit, digest: executionKitDigest },
    { value: approvalIntake, digest: approvalIntakeDigest },
  ] = await Promise.all([
    readJsonWithDigest(options.executionKit, 'seed inbox correction UI edit execution kit'),
    readJsonWithDigest(options.approvalIntake, 'exact approval intake for seed inbox correction UI edit'),
  ]);

  return buildSeedInboxCorrectionUiEditReceipt({
    executionKit,
    approvalIntake,
    options,
    sourceDigests: [executionKitDigest, approvalIntakeDigest],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const receipt = await buildReceiptFromFiles(options);
  if (options.out) await writeJson(options.out, receipt);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(receipt));

  console.log(JSON.stringify({
    ok: receipt.ok,
    status: receipt.status,
    generatedAt: receipt.generatedAt,
    editedDraftCount: receipt.executiveSummary.editedDraftCount,
    outboxCountAfterEdit: receipt.executiveSummary.outboxCountAfterEdit,
    sendCount: receipt.executiveSummary.sendCount,
    publishCount: receipt.executiveSummary.publishCount,
    scheduleCount: receipt.executiveSummary.scheduleCount,
    blockerCount: receipt.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite seed inbox correction UI edit receipt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDraftReceipts,
  buildRecordedSafety,
  buildSeedInboxCorrectionUiEditReceipt,
  parseArgs,
  parseDraftUiReference,
  renderMarkdown,
  validateReceipt,
};
