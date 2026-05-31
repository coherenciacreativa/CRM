#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-approval-packet-2026-05-31';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_API_EDIT_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_edit_receipt_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.md';

const REPLACEMENT_STEPS = new Set([2, 3]);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-approval-packet.mjs [options]

Options:
  --correction-preview <path>                  Redacted seed inbox correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --email-render-qa <path>                     Local post-correction render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --manual-ui-build-receipt <path>             Existing manual UI draft build receipt JSON. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --api-edit-receipt <path>                    Stopped API correction attempt receipt JSON. Defaults to ${DEFAULT_API_EDIT_RECEIPT}
  --replacement-suffix <text>                  Suffix for proposed replacement draft names. Defaults to API replacement
  --out <path>                                 Write JSON approval packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown approval packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                       Show this help

Local-only approval packet for a future MailerLite API replacement-draft route.
It records that existing E02/E03 drafts are unsafe to patch because recipient
gates were observed open, then proposes creating two new inert replacement
drafts by API after exact human approval. It never calls MailerLite, Shopify or
CRM live APIs, opens UI, sends emails, schedules campaigns, reads or mutates
subscribers, creates or assigns groups, edits workflows, appends ledgers,
writes cards/scoring, touches Fact Store, prints tokens, or stores exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    apiEditReceipt: DEFAULT_API_EDIT_RECEIPT,
    replacementSuffix: 'API replacement',
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
    else if (arg === '--manual-ui-build-receipt') options.manualUiBuildReceipt = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
    else if (arg === '--api-edit-receipt') options.apiEditReceipt = argv[++index];
    else if (arg === '--replacement-suffix') options.replacementSuffix = argv[++index];
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

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  exactUrlsStoredInReport: false,
  exactUrlsPrinted: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
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

const manualUiReceiptCompleted = (receipt) =>
  receipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
  && receipt?.executiveSummary?.createdOrEditedDraftCount === 4
  && receipt?.executiveSummary?.sendCount === 0
  && receipt?.executiveSummary?.scheduleCount === 0
  && receipt?.executiveSummary?.subscriberReadOrAssignmentCount === 0
  && receipt?.executiveSummary?.groupAssignmentCount === 0
  && receipt?.executiveSummary?.workflowAttachmentCount === 0
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false;

const buildReplacementTargets = ({ correctionPreview, manualUiBuildReceipt, replacementSuffix }) => {
  const payloads = correctionPreview?.payloads ?? correctionPreview?.redactedPayloadManifest?.payloads ?? [];
  const draftReceipts = manualUiBuildReceipt?.draftReceipts ?? [];

  return payloads
    .filter((payload) => REPLACEMENT_STEPS.has(Number(payload?.step)))
    .map((payload) => {
      const step = Number(payload.step);
      const oldDraft = draftReceipts.find((draft) => Number(draft?.step) === step);
      const baseName = cleanString(payload.mailerLiteAssetNameDraft ?? oldDraft?.draftName);
      const suffix = cleanString(replacementSuffix) ?? 'API replacement';
      return {
        step,
        label: `E${String(step).padStart(2, '0')}`,
        role: cleanString(payload.role ?? oldDraft?.role),
        oldDraftName: cleanString(oldDraft?.draftName ?? payload.mailerLiteAssetNameDraft),
        replacementDraftName: baseName ? `${baseName} · ${suffix}` : null,
        subject: cleanString(payload.subject ?? oldDraft?.expectedSubject),
        expectedLinkMode: payload?.cta?.destinationType ?? null,
        exactUrlStoredInPacket: false,
      };
    });
};

const apiAttemptShowsRecipientGateProblem = (apiEditReceipt) => {
  const skippedReasons = (apiEditReceipt?.skipped ?? []).map((row) => cleanString(row?.reason)).filter(Boolean);
  const operationErrors = (apiEditReceipt?.operations ?? []).map((row) => cleanString(row?.error)).filter(Boolean);
  const combined = [...skippedReasons, ...operationErrors].join(' ');
  return /recipient_gate_not_inert|no_recipient_filter|no_basic_filter|can_be_scheduled_true/i.test(combined);
};

const apiAttemptMutatedNothing = (apiEditReceipt) =>
  apiEditReceipt?.status === 'mini_launch_seed_inbox_correction_api_edit_failed_stopped'
  && apiEditReceipt?.safety?.mailerLiteDraftsEdited === 0
  && apiEditReceipt?.safety?.mailerLiteMutationsPerformed === false
  && apiEditReceipt?.safety?.sendsPerformed === false
  && apiEditReceipt?.safety?.campaignsPublished === false
  && apiEditReceipt?.safety?.campaignsScheduled === false
  && apiEditReceipt?.safety?.subscriberMutationsPerformed === false
  && apiEditReceipt?.safety?.groupsCreatedOrAssigned === false
  && apiEditReceipt?.safety?.workflowMutationsPerformed === false
  && apiEditReceipt?.safety?.tokensPrinted === false
  && apiEditReceipt?.safety?.exactUrlsPrinted === false;

const buildExactApprovalPhrase = () =>
  'Apruebo crear por API únicamente 2 nuevos borradores de reemplazo en MailerLite para E02 y E03 del mini-lanzamiento Inteligencia para descansar, usando el contenido corregido con las URLs preview unlisted/noindex ya registradas, sin recipients, sin groups, sin segments, sin subscribers, sin workflows, sin enviar, sin publicar, sin programar, sin Shopify adicional, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; dejar los borradores viejos intactos como no-use y generar re-scan fresco y recibo local.';

const buildPacket = ({
  correctionPreview,
  emailRenderQa,
  manualUiBuildReceipt,
  shopifyPreviewRouteExecutionReceipt,
  apiEditReceipt,
  replacementSuffix = 'API replacement',
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = [];
  const safety = buildSafety();
  const replacementTargets = buildReplacementTargets({
    correctionPreview,
    manualUiBuildReceipt,
    replacementSuffix,
  });
  const executionSummary = shopifyPreviewRouteExecutionReceipt?.executionSummary ?? {};

  if (correctionPreview?.status !== 'seed_inbox_correction_preview_ready_no_live_changes') {
    blockers.push(`correction_preview_not_ready:${correctionPreview?.status ?? 'missing'}`);
  }
  if (correctionPreview?.executiveSummary?.finalPublicLinksReady !== true) blockers.push('final_public_links_not_ready');
  if (correctionPreview?.executiveSummary?.redactedPayloadManifestReady !== true) blockers.push('redacted_payload_manifest_not_ready');
  if (correctionPreview?.executiveSummary?.exactUrlsStoredInReport !== false) blockers.push('correction_preview_exact_urls_in_report');

  if (emailRenderQa?.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
    blockers.push(`email_render_qa_not_green:${emailRenderQa?.status ?? 'missing'}`);
  }
  if (emailRenderQa?.executiveSummary?.localRenderReady !== true) blockers.push('email_render_local_not_ready');
  if (emailRenderQa?.executiveSummary?.emailCount !== 4) blockers.push('email_render_expected_4_emails');
  if (emailRenderQa?.executiveSummary?.redCheckCount !== 0) blockers.push('email_render_has_red_checks');
  if (emailRenderQa?.executiveSummary?.publicUseReady !== false) blockers.push('email_render_public_gate_unexpectedly_open');
  if (emailRenderQa?.executiveSummary?.seedSendReady !== false) blockers.push('email_render_seed_send_gate_unexpectedly_open');

  if (!manualUiReceiptCompleted(manualUiBuildReceipt)) blockers.push('manual_ui_build_receipt_not_closed_or_missing');

  if (shopifyPreviewRouteExecutionReceipt?.status !== 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm') {
    blockers.push(`shopify_preview_route_execution_not_ready:${shopifyPreviewRouteExecutionReceipt?.status ?? 'missing'}`);
  }
  if (executionSummary.previewRouteReady !== true) blockers.push('shopify_preview_route_not_ready');
  if (executionSummary.targetLinkCount !== 3) blockers.push('shopify_preview_route_expected_3_links');
  if (executionSummary.canUseForLocalCorrectionPreview !== true) blockers.push('shopify_preview_route_not_allowed_for_local_correction_preview');
  if (executionSummary.publicAudienceSendUrlGateReady !== false) blockers.push('shopify_preview_route_audience_url_gate_unexpectedly_open');

  if (!apiAttemptMutatedNothing(apiEditReceipt)) blockers.push('api_edit_receipt_not_failed_stopped_with_zero_mutations');
  if (!apiAttemptShowsRecipientGateProblem(apiEditReceipt)) blockers.push('api_edit_receipt_does_not_show_existing_draft_recipient_gate_problem');
  if (replacementTargets.length !== 2) blockers.push(`replacement_target_count_not_2:${replacementTargets.length}`);
  for (const target of replacementTargets) {
    if (!target.oldDraftName) blockers.push(`replacement_target_${target.label}_missing_old_draft_name`);
    if (!target.replacementDraftName) blockers.push(`replacement_target_${target.label}_missing_replacement_draft_name`);
    if (!target.subject) blockers.push(`replacement_target_${target.label}_missing_subject`);
  }

  const canAskAlejandroForApproval = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_seed_inbox_correction_api_replacement_approval_packet',
    generatedAt,
    ok: true,
    status: canAskAlejandroForApproval
      ? 'seed_inbox_correction_api_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes'
      : 'seed_inbox_correction_api_replacement_approval_packet_blocked_no_live_changes',
    executiveSummary: {
      canAskAlejandroForApproval,
      replacementTargetCount: replacementTargets.length,
      oldDraftsRemainIntact: true,
      routePreference: 'api_replacement_drafts_over_mailerlite_ui',
      reason: 'Existing E02/E03 drafts have recipient/basic-filter gate risk; replacement drafts can be born inert and avoid more UI work.',
      correctionPreviewStatus: correctionPreview?.status ?? null,
      emailRenderQaStatus: emailRenderQa?.status ?? null,
      emailRenderLocalReady: emailRenderQa?.executiveSummary?.localRenderReady ?? null,
      redCheckCount: emailRenderQa?.executiveSummary?.redCheckCount ?? null,
      shopifyPreviewRouteExecutionStatus: shopifyPreviewRouteExecutionReceipt?.status ?? null,
      apiEditReceiptStatus: apiEditReceipt?.status ?? null,
      apiEditReceiptShowsRecipientGateProblem: apiAttemptShowsRecipientGateProblem(apiEditReceipt),
      apiEditReceiptMutatedNothing: apiAttemptMutatedNothing(apiEditReceipt),
      publicAudienceSendUrlGateReady: executionSummary.publicAudienceSendUrlGateReady ?? null,
      openLiveMutationGateCount: 0,
      blockerCount: blockers.length,
      nextBestMove: canAskAlejandroForApproval
        ? 'Ask Alejandro for the exact scoped API replacement-draft approval before creating any MailerLite drafts.'
        : 'Resolve local blockers before requesting API replacement-draft approval.',
    },
    replacementTargets,
    existingDraftHandling: {
      oldE02E03DraftsMustRemainIntact: true,
      oldE02E03DraftsShouldBeTreatedAsNoUseByOperator: true,
      deletionOrArchivalApproved: false,
      reason: 'Avoid mutating existing drafts whose recipient/basic-filter gates are no longer unequivocally inert.',
    },
    correctionScope: {
      createOnlyReplacementDraftsForSteps: [2, 3],
      sourcePayload: 'corrected_payload_preview_with_exact_urls_from_shopify_preview_route_execution_receipt',
      exactUrlsStoredInThisPacket: false,
      exactUrlsPrinted: false,
      useOnlyPreviewUrlsFromShopifyExecutionReceipt: true,
      noRecipientsGroupsSegmentsSubscribersOrWorkflows: true,
    },
    decision: {
      canAskAlejandroForApproval,
      packetIsApprovalByItself: false,
      canCreateReplacementDraftsNow: false,
      canEditExistingDraftsNow: false,
      canSendNow: false,
      exactApprovalPhrase: canAskAlejandroForApproval ? buildExactApprovalPhrase() : null,
    },
    approvalBoundary: {
      allowedAfterExactApproval: [
        'fresh_rescan_mailerlite_campaigns_for_existing_e02_e03_and_replacement_name_collisions',
        'create_only_two_new_mailerlite_draft_campaigns_for_e02_and_e03',
        'use_corrected_content_and_exact_preview_urls_from_the_shopify_preview_route_execution_receipt',
        'leave_old_e02_e03_drafts_intact_as_no_use',
        'set_no_recipients_no_groups_no_segments_no_subscribers_no_workflows',
        'record_fresh_local_execution_receipt_and_rescan',
      ],
      stillClosedEvenAfterApproval: [
        'editing_old_e02_e03_drafts',
        'deleting_or_archiving_old_drafts',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'publish_or_schedule_campaign',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'group_creation_or_assignment',
        'additional_shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'freshly scan MailerLite campaigns and verify no replacement-name collision',
        'confirm replacement drafts will be created with no recipients, groups, segments, workflows or schedules',
        'use only exact preview URLs from the scoped Shopify preview route execution receipt',
        'after creation, re-scan both replacement drafts and verify they are draft, inert and not schedulable',
        'record a local receipt with zero sends, zero schedules, zero subscriber mutations and zero group assignments',
      ],
    },
    blockers,
    safety,
    sourceDigests,
  };
};

const renderMarkdown = (packet) => [
  '# MailerLite Mini-Launch Seed Inbox Correction API Replacement Approval Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  `OK: ${packet.ok}`,
  '',
  '## Summary',
  '',
  `- Can ask Alejandro for approval: ${packet.executiveSummary.canAskAlejandroForApproval}`,
  `- Route preference: ${packet.executiveSummary.routePreference}`,
  `- Replacement target count: ${packet.executiveSummary.replacementTargetCount}`,
  `- Existing E02/E03 drafts remain intact: ${packet.executiveSummary.oldDraftsRemainIntact}`,
  `- API edit receipt mutated nothing: ${packet.executiveSummary.apiEditReceiptMutatedNothing}`,
  `- API edit receipt shows recipient gate problem: ${packet.executiveSummary.apiEditReceiptShowsRecipientGateProblem}`,
  `- Public/audience send URL gate ready: ${packet.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Open live mutation gate count: ${packet.executiveSummary.openLiveMutationGateCount}`,
  '',
  '## Replacement Targets',
  '',
  ...packet.replacementTargets.flatMap((target) => [
    `- ${target.label}: ${target.replacementDraftName}`,
    `  - old draft: ${target.oldDraftName}`,
    `  - exact URL stored here: ${target.exactUrlStoredInPacket}`,
  ]),
  '',
  '## Approval Boundary',
  '',
  `- Packet is approval by itself: ${packet.decision.packetIsApprovalByItself}`,
  `- Can create replacement drafts now: ${packet.decision.canCreateReplacementDraftsNow}`,
  `- Can send now: ${packet.decision.canSendNow}`,
  `- Exact approval phrase available: ${Boolean(packet.decision.exactApprovalPhrase)}`,
  '',
  'Allowed after exact approval:',
  ...packet.approvalBoundary.allowedAfterExactApproval.map((item) => `- ${item}`),
  '',
  'Still closed even after approval:',
  ...packet.approvalBoundary.stillClosedEvenAfterApproval.map((item) => `- ${item}`),
  '',
  '## Safety',
  '',
  `- MailerLite API called by this packet: ${packet.safety.mailerLiteApiCalled}`,
  `- MailerLite UI opened by this packet: ${packet.safety.mailerLiteUiOpened}`,
  `- MailerLite mutations performed: ${packet.safety.mailerLiteMutationsPerformed}`,
  `- Sends performed: ${packet.safety.sendsPerformed}`,
  `- Subscribers read: ${packet.safety.subscribersRead}`,
  `- Exact URLs printed: ${packet.safety.exactUrlsPrinted}`,
  `- Tokens printed: ${packet.safety.tokensPrinted}`,
  '',
  '## Blockers',
  '',
  ...(packet.blockers.length ? packet.blockers.map((item) => `- ${item}`) : ['- none']),
  '',
].join('\n');

const writeOutputs = async (packet, options) => {
  await mkdir(dirname(resolve(options.out)), { recursive: true });
  await writeFile(resolve(options.out), `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  if (options.markdownOut) {
    await mkdir(dirname(resolve(options.markdownOut)), { recursive: true });
    await writeFile(resolve(options.markdownOut), `${renderMarkdown(packet)}\n`, 'utf8');
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const [
    correctionPreview,
    emailRenderQa,
    manualUiBuildReceipt,
    shopifyPreviewRouteExecutionReceipt,
    apiEditReceipt,
  ] = await Promise.all([
    readJsonWithDigest(options.correctionPreview, 'redacted corrected payload preview and URL/footer readiness'),
    readJsonWithDigest(options.emailRenderQa, 'local render QA for corrected payload'),
    readJsonWithDigest(options.manualUiBuildReceipt, 'existing draft names and closed initial draft-build receipt'),
    readJsonWithDigest(options.shopifyPreviewRouteExecutionReceipt, 'source of exact preview URLs by hash without printing them'),
    readJsonWithDigest(options.apiEditReceipt, 'stopped API edit attempt and recipient-gate evidence'),
  ]);

  const packet = buildPacket({
    correctionPreview: correctionPreview.value,
    emailRenderQa: emailRenderQa.value,
    manualUiBuildReceipt: manualUiBuildReceipt.value,
    shopifyPreviewRouteExecutionReceipt: shopifyPreviewRouteExecutionReceipt.value,
    apiEditReceipt: apiEditReceipt.value,
    replacementSuffix: options.replacementSuffix,
    sourceDigests: [
      correctionPreview.digest,
      emailRenderQa.digest,
      manualUiBuildReceipt.digest,
      shopifyPreviewRouteExecutionReceipt.digest,
      apiEditReceipt.digest,
    ],
  });

  await writeOutputs(packet, options);
  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    canAskAlejandroForApproval: packet.executiveSummary.canAskAlejandroForApproval,
    replacementTargetCount: packet.executiveSummary.replacementTargetCount,
    blockerCount: packet.executiveSummary.blockerCount,
    out: resolve(options.out),
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  apiAttemptMutatedNothing,
  apiAttemptShowsRecipientGateProblem,
  buildExactApprovalPhrase,
  buildPacket,
  buildReplacementTargets,
  parseArgs,
  renderMarkdown,
};
