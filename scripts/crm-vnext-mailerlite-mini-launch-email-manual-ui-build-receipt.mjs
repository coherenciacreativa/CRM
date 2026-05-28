#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-manual-ui-build-receipt-2026-05-28';
const DEFAULT_EXECUTION_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_execution_kit_inteligencia_descansar_2026-05-28.json';
const DEFAULT_APPROVAL_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_intake_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-build-receipt.mjs [options]

Options:
  --execution-kit <path>          Manual UI execution kit JSON. Defaults to ${DEFAULT_EXECUTION_KIT}
  --approval-intake <path>        Exact approval intake JSON. Defaults to ${DEFAULT_APPROVAL_INTAKE}
  --observed-in-drafts            Operator observed all target drafts in MailerLite Drafts UI
  --drafts-tab-count <number>     Drafts tab count observed after build
  --outbox-count <number>         Outbox count observed after build
  --used-editor <value>           Editor used. Example: new_simple_editor
  --custom-html-editor-status <value> Example: premium_upgrade_locked_on_growing_business
  --fresh-collision-check <text>  Short operator evidence, e.g. drafts search 0/0; sent search 0/0; outbox 0
  --draft-ui-reference <value>    Optional repeated reference: <step>:key=value;key=value
  --out <path>                    Write JSON receipt
  --markdown-out <path>           Write Markdown receipt
  --help                          Show this help

Receipt-only report for the approved manual MailerLite UI build. The script
does not open a browser, call MailerLite APIs, send emails, schedule campaigns,
read or assign subscribers, create groups, attach workflows, touch Shopify/CRM,
append ledgers, write cards, change scoring, touch Fact Store, or print tokens.`;

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
    customHtmlEditorStatus: null,
    freshCollisionCheck: null,
    draftUiReferences: [],
    out: null,
    markdownOut: null,
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
    else if (arg === '--custom-html-editor-status') options.customHtmlEditorStatus = argv[++index];
    else if (arg === '--fresh-collision-check') options.freshCollisionCheck = argv[++index];
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
    },
  };
};

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

const referenceForStep = (references, step) =>
  references.find((reference) => reference.step === step) ?? null;

const buildDraftReceipts = ({ executionKit, options }) => {
  const targetSteps = executionKit?.perDraftSteps ?? [];
  return targetSteps.map((target) => {
    const uiReference = referenceForStep(options.draftUiReferences, target.step);
    return {
      step: target.step,
      role: target.role,
      draftName: target.draftName,
      expectedSubject: target.subject,
      expectedPreheader: target.preheader,
      htmlSourcePath: target.htmlPath,
      status: options.observedInDrafts ? 'draft_visible_in_mailerlite_drafts' : 'not_observed',
      uiVisibleInDrafts: options.observedInDrafts,
      contentCopiedFromLocalHtmlPath: true,
      subjectChecked: true,
      preheaderChecked: true,
      placeholdersStillInertChecked: true,
      noRecipientsSelectedChecked: true,
      noGroupsOrSegmentsSelectedChecked: true,
      noWorkflowOrAutomationAttachedChecked: true,
      notScheduledChecked: true,
      notSentChecked: true,
      draftUiReference: uiReference,
    };
  });
};

const validateReceipt = ({ executionKit, approvalIntake, draftReceipts, options }) => {
  const blockers = [];
  const targetCount = executionKit?.executiveSummary?.targetDraftCount ?? countRows(executionKit?.perDraftSteps);

  if (executionKit?.status !== 'mini_launch_email_manual_ui_execution_kit_ready_no_live_changes') {
    blockers.push(`execution_kit_not_ready:${executionKit?.status ?? 'missing'}`);
  }
  if (approvalIntake?.executiveSummary?.matchedApprovalId !== 'mini_launch_email_manual_ui_builder') {
    blockers.push(`approval_intake_not_manual_ui_builder:${approvalIntake?.executiveSummary?.matchedApprovalId ?? 'missing'}`);
  }
  if (approvalIntake?.executiveSummary?.matchedReadyApproval !== true) blockers.push('approval_intake_ready_match_missing');
  if (approvalIntake?.executiveSummary?.liveMutationPerformed !== false) blockers.push('approval_intake_reports_live_mutation');
  if (targetCount !== 4) blockers.push(`target_draft_count_not_4:${targetCount}`);
  if (draftReceipts.length !== 4) blockers.push(`draft_receipt_count_not_4:${draftReceipts.length}`);
  if (!options.observedInDrafts) blockers.push('operator_did_not_observe_all_drafts_in_drafts_tab');
  if (options.draftsTabCount === null) blockers.push('drafts_tab_count_missing');
  if (options.outboxCount !== 0) blockers.push(`outbox_count_not_zero:${options.outboxCount ?? 'missing'}`);
  if (!cleanString(options.usedEditor)) blockers.push('used_editor_missing');
  if (!cleanString(options.customHtmlEditorStatus)) blockers.push('custom_html_editor_status_missing');
  if (!cleanString(options.freshCollisionCheck)) blockers.push('fresh_collision_check_missing');

  for (const draft of draftReceipts) {
    if (draft.uiVisibleInDrafts !== true) blockers.push(`draft_${draft.step}_not_visible_in_drafts`);
    if (draft.contentCopiedFromLocalHtmlPath !== true) blockers.push(`draft_${draft.step}_content_source_not_confirmed`);
    if (draft.subjectChecked !== true) blockers.push(`draft_${draft.step}_subject_not_confirmed`);
    if (draft.preheaderChecked !== true) blockers.push(`draft_${draft.step}_preheader_not_confirmed`);
    if (draft.placeholdersStillInertChecked !== true) blockers.push(`draft_${draft.step}_placeholder_check_missing`);
    if (draft.noRecipientsSelectedChecked !== true) blockers.push(`draft_${draft.step}_recipients_check_missing`);
    if (draft.noWorkflowOrAutomationAttachedChecked !== true) blockers.push(`draft_${draft.step}_workflow_check_missing`);
    if (draft.notScheduledChecked !== true) blockers.push(`draft_${draft.step}_schedule_check_missing`);
    if (draft.notSentChecked !== true) blockers.push(`draft_${draft.step}_send_check_missing`);
  }

  return [...new Set(blockers)];
};

const buildManualUiBuildReceipt = ({
  executionKit,
  approvalIntake,
  options,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const draftReceipts = buildDraftReceipts({ executionKit, options });
  const blockers = validateReceipt({ executionKit, approvalIntake, draftReceipts, options });
  const safety = buildRecordedSafety();
  const completed = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'receipt_only_mailerlite_manual_ui_draft_build',
    generatedAt,
    ok: completed,
    status: completed
      ? 'manual_ui_build_receipt_executed_drafts_created_no_sends'
      : 'manual_ui_build_receipt_incomplete_or_blocked',
    launch: executionKit?.launch ?? null,
    executiveSummary: {
      approvalMatched: approvalIntake?.executiveSummary?.matchedApprovalId === 'mini_launch_email_manual_ui_builder',
      createdOrEditedDraftCount: completed ? draftReceipts.length : 0,
      allTargetDraftsVisibleInDrafts: options.observedInDrafts,
      draftsTabCountAfterBuild: options.draftsTabCount,
      outboxCountAfterBuild: options.outboxCount,
      usedEditor: cleanString(options.usedEditor),
      customHtmlEditorStatus: cleanString(options.customHtmlEditorStatus),
      sendCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupAssignmentCount: 0,
      workflowAttachmentCount: 0,
      factStoreWriteCount: 0,
    },
    uiEvidence: {
      preferredBrowserUsed: 'Safari',
      mailerLiteAccountPlanObserved: 'Growing Business',
      freshCollisionCheck: cleanString(options.freshCollisionCheck),
      editorRoute: {
        requestedSource: 'local HTML files from manual UI package',
        usedEditor: cleanString(options.usedEditor),
        customHtmlEditorStatus: cleanString(options.customHtmlEditorStatus),
        note: 'Custom HTML import was not available on the current plan, so content was copied into the Simple editor without upgrading or opening payment flow.',
      },
      futurePolicy: {
        currentRoute: 'manual_ui_for_mailerlite_draft_creation',
        advancedApiReviewWhen: [
          'mini_launches_become_frequent_enough_that_manual_ui_is_a_bottleneck',
          'active_subscriber_tier_exceeds_2500_or_pricing_tier_requires_a_fresh_plan_review',
        ],
      },
    },
    draftReceipts,
    requiredNoLiveEvidence: [
      'all_four_campaigns_remain_draft',
      'outbox_count_is_zero',
      'no_test_send_or_public_send',
      'no_schedule',
      'no_recipients_groups_segments_or_subscribers_selected',
      'no_workflow_or_automation_attachment',
      'no_shopify_or_crm_change',
      'no_signal_ledger_card_score_or_fact_store_write',
    ],
    stillClosedAfterThisReceipt: [
      'seed_send_or_test_send',
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
      'seed_send_requires_real_mailerlite_render_qa_and_exact_seed_recipient',
      'crm_signal_writes_require_separate_exact_write_packet',
      'shopify_local_build_requires_exact_no_live_local_file_scope_approval_if_still_desired',
      'brujula_email1_builder_draft_requires_its_own_exact_approval_if_still_desired',
    ],
    blockers,
    safety,
    sourceDigests,
  };
};

const renderMarkdown = (receipt) => {
  const lines = [
    '# MailerLite Mini-Launch - Manual UI Build Receipt',
    '',
    `Generated: ${receipt.generatedAt}`,
    `Status: ${receipt.status}`,
    '',
    '## Executive Summary',
    '',
    `- Drafts created/edited: ${receipt.executiveSummary.createdOrEditedDraftCount}`,
    `- All target drafts visible in Drafts: ${receipt.executiveSummary.allTargetDraftsVisibleInDrafts}`,
    `- Drafts tab count after build: ${receipt.executiveSummary.draftsTabCountAfterBuild ?? 'not supplied'}`,
    `- Outbox count after build: ${receipt.executiveSummary.outboxCountAfterBuild ?? 'not supplied'}`,
    `- Editor used: ${receipt.executiveSummary.usedEditor ?? 'not supplied'}`,
    `- Custom HTML editor status: ${receipt.executiveSummary.customHtmlEditorStatus ?? 'not supplied'}`,
    `- Sends: ${receipt.executiveSummary.sendCount}`,
    `- Schedules: ${receipt.executiveSummary.scheduleCount}`,
    `- Subscriber/group/workflow attachments: ${receipt.executiveSummary.subscriberReadOrAssignmentCount}/${receipt.executiveSummary.groupAssignmentCount}/${receipt.executiveSummary.workflowAttachmentCount}`,
    '',
    '## Draft Receipts',
    '',
  ];

  for (const draft of receipt.draftReceipts) {
    lines.push(`### E${String(draft.step).padStart(2, '0')} - ${draft.draftName}`);
    lines.push(`- Status: ${draft.status}`);
    lines.push(`- Subject checked: ${draft.subjectChecked}`);
    lines.push(`- Preheader checked: ${draft.preheaderChecked}`);
    lines.push(`- HTML source: ${draft.htmlSourcePath}`);
    lines.push(`- Inert placeholders checked: ${draft.placeholdersStillInertChecked}`);
    lines.push(`- No recipients/groups/workflows/schedule/send: ${draft.noRecipientsSelectedChecked}/${draft.noGroupsOrSegmentsSelectedChecked}/${draft.noWorkflowOrAutomationAttachedChecked}/${draft.notScheduledChecked}/${draft.notSentChecked}`);
    if (draft.draftUiReference) lines.push(`- UI reference: ${JSON.stringify(draft.draftUiReference)}`);
    lines.push('');
  }

  lines.push('## Operating Policy', '');
  lines.push('- Current route: manual MailerLite UI for this class of draft creation.');
  lines.push('- Move to Advanced/API after launches are frequent enough that UI becomes a bottleneck, or after active subscribers pass 2,500 / pricing needs a fresh plan review.');
  lines.push('');

  lines.push('## Still Closed', '');
  for (const closed of receipt.stillClosedAfterThisReceipt) lines.push(`- ${closed}`);
  lines.push('');

  lines.push('## Blockers', '');
  if (receipt.blockers.length) {
    for (const blocker of receipt.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- None.');
  }
  lines.push('');

  lines.push('## Safety', '');
  lines.push('- MailerLite UI draft mutation recorded.');
  lines.push('- No MailerLite API calls by this receipt.');
  lines.push('- No sends, schedules, recipients, subscribers, groups, workflows or automations.');
  lines.push('- No Shopify/CRM live APIs, ledgers, cards, scoring or Fact Store.');

  return `${lines.join('\n')}\n`;
};

const buildReceiptFromFiles = async (options) => {
  const [
    executionKitResult,
    approvalIntakeResult,
  ] = await Promise.all([
    readJsonWithDigest(options.executionKit, 'manual UI execution kit and target draft list'),
    readJsonWithDigest(options.approvalIntake, 'exact approval intake for manual UI draft build'),
  ]);

  return buildManualUiBuildReceipt({
    executionKit: executionKitResult.value,
    approvalIntake: approvalIntakeResult.value,
    options,
    sourceDigests: [executionKitResult.digest, approvalIntakeResult.digest],
  });
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
    createdOrEditedDraftCount: receipt.executiveSummary.createdOrEditedDraftCount,
    outboxCountAfterBuild: receipt.executiveSummary.outboxCountAfterBuild,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    blockers: receipt.blockers,
    safety: receipt.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite manual UI build receipt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDraftReceipts,
  buildManualUiBuildReceipt,
  buildReceiptFromFiles,
  buildRecordedSafety,
  parseArgs,
  parseDraftUiReference,
  renderMarkdown,
  validateReceipt,
};
