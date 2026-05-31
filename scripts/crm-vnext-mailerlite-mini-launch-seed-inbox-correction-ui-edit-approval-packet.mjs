#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet-2026-05-31';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet.mjs [options]

Options:
  --correction-preview <path>                  Redacted seed inbox correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --email-render-qa <path>                     Local post-correction render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --manual-ui-build-receipt <path>             Existing manual UI draft build receipt JSON. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --out <path>                                 Write JSON approval packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown approval packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                       Show this help

Local-only approval packet for a future MailerLite UI edit of the four existing
Inteligencia para descansar draft emails. It checks redacted correction preview,
local render QA, existing draft receipt and Shopify preview-route evidence. It
never opens MailerLite UI, calls MailerLite/Shopify/CRM live APIs, sends emails,
schedules campaigns, reads or mutates subscribers, creates or assigns groups,
edits workflows, publishes Shopify, appends ledgers, writes cards/scoring,
touches Fact Store, prints tokens, or stores exact URLs in shared reports.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
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

const manualUiReceiptCompleted = (receipt) =>
  receipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
  && receipt?.executiveSummary?.createdOrEditedDraftCount === 4
  && receipt?.executiveSummary?.outboxCountAfterBuild === 0
  && receipt?.executiveSummary?.sendCount === 0
  && receipt?.executiveSummary?.scheduleCount === 0
  && receipt?.executiveSummary?.subscriberReadOrAssignmentCount === 0
  && receipt?.executiveSummary?.groupAssignmentCount === 0
  && receipt?.executiveSummary?.workflowAttachmentCount === 0
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && (receipt?.draftReceipts ?? []).length === 4
  && (receipt?.draftReceipts ?? []).every((draft) => draft?.uiVisibleInDrafts === true);

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

const targetDraftsFrom = (receipt) => (receipt?.draftReceipts ?? []).map((draft) => ({
  step: Number(draft?.step),
  draftName: cleanString(draft?.draftName),
  uiVisibleInDrafts: draft?.uiVisibleInDrafts === true,
})).filter((draft) => Number.isFinite(draft.step) && draft.draftName);

const buildExactApprovalPhrase = () =>
  'Apruebo editar manualmente en MailerLite UI únicamente los 4 borradores existentes del mini-lanzamiento Inteligencia para descansar para aplicar el payload corregido local QA-green y reemplazar solo los placeholders inertes result_or_resource_link_placeholder, practice_link_placeholder y editorial_note_link_placeholder por las 3 URLs preview unlisted/noindex registradas en el Shopify preview route execution receipt, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify adicional, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.';

const buildPacket = ({
  correctionPreview,
  emailRenderQa,
  manualUiBuildReceipt,
  shopifyPreviewRouteExecutionReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = [];
  const safety = buildSafety();

  if (correctionPreview?.status !== 'seed_inbox_correction_preview_ready_no_live_changes') {
    blockers.push(`correction_preview_not_ready:${correctionPreview?.status ?? 'missing'}`);
  }
  if (correctionPreview?.executiveSummary?.finalPublicLinksReady !== true) blockers.push('final_public_links_not_ready_for_correction_preview');
  if (correctionPreview?.executiveSummary?.subscriptionReasonPolicyReady !== true) blockers.push('subscription_reason_policy_not_ready');
  if (correctionPreview?.executiveSummary?.redactedPayloadManifestReady !== true) blockers.push('redacted_payload_manifest_not_ready');
  if (correctionPreview?.safety?.exactUrlsStoredInReport !== false) blockers.push('correction_preview_exact_urls_in_report');

  if (emailRenderQa?.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
    blockers.push(`email_render_qa_not_green:${emailRenderQa?.status ?? 'missing'}`);
  }
  if (emailRenderQa?.executiveSummary?.localRenderReady !== true) blockers.push('email_render_local_not_ready');
  if (emailRenderQa?.executiveSummary?.emailCount !== 4) blockers.push('email_render_expected_4_emails');
  if (emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount !== 4) blockers.push('email_render_previews_not_all_non_empty');
  if (emailRenderQa?.executiveSummary?.redCheckCount !== 0) blockers.push('email_render_has_red_checks');
  if (emailRenderQa?.executiveSummary?.publicUseReady !== false) blockers.push('email_render_public_gate_unexpectedly_open');
  if (emailRenderQa?.executiveSummary?.seedSendReady !== false) blockers.push('email_render_seed_send_gate_unexpectedly_open');

  if (!manualUiReceiptCompleted(manualUiBuildReceipt)) blockers.push('manual_ui_build_receipt_not_closed_or_missing');

  const executionSummary = shopifyPreviewRouteExecutionReceipt?.executionSummary ?? {};
  if (shopifyPreviewRouteExecutionReceipt?.status !== 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm') {
    blockers.push(`shopify_preview_route_execution_not_ready:${shopifyPreviewRouteExecutionReceipt?.status ?? 'missing'}`);
  }
  if (executionSummary.previewRouteReady !== true) blockers.push('shopify_preview_route_not_ready');
  if (executionSummary.targetLinkCount !== 3) blockers.push('shopify_preview_route_expected_3_links');
  if (executionSummary.canUseForLocalCorrectionPreview !== true) blockers.push('shopify_preview_route_not_allowed_for_local_correction_preview');
  if (executionSummary.canUseForPublicAudienceSend !== false) blockers.push('shopify_preview_route_public_send_gate_unexpectedly_open');
  if (executionSummary.publicAudienceSendUrlGateReady !== false) blockers.push('shopify_preview_route_audience_url_gate_unexpectedly_open');

  const targetDrafts = targetDraftsFrom(manualUiBuildReceipt);
  if (targetDrafts.length !== 4) blockers.push('expected_4_existing_target_drafts');

  const canAskAlejandroForApproval = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_seed_inbox_correction_ui_edit_approval_packet',
    generatedAt,
    ok: true,
    status: canAskAlejandroForApproval
      ? 'seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes'
      : 'seed_inbox_correction_ui_edit_approval_packet_blocked_no_live_changes',
    executiveSummary: {
      canAskAlejandroForApproval,
      targetDraftCount: targetDrafts.length,
      correctionPreviewStatus: correctionPreview?.status ?? null,
      emailRenderQaStatus: emailRenderQa?.status ?? null,
      emailRenderLocalReady: emailRenderQa?.executiveSummary?.localRenderReady ?? null,
      renderPreviewNonEmptyCount: emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      redCheckCount: emailRenderQa?.executiveSummary?.redCheckCount ?? null,
      manualUiBuildReceiptStatus: manualUiBuildReceipt?.status ?? null,
      shopifyPreviewRouteExecutionStatus: shopifyPreviewRouteExecutionReceipt?.status ?? null,
      publicAudienceSendUrlGateReady: executionSummary.publicAudienceSendUrlGateReady ?? null,
      openLiveMutationGateCount: 0,
      blockerCount: blockers.length,
      nextBestMove: canAskAlejandroForApproval
        ? 'Ask Alejandro for the exact scoped MailerLite UI correction-edit approval before opening MailerLite or editing drafts.'
        : 'Resolve local blockers before requesting any MailerLite UI edit approval.',
    },
    targetDrafts,
    correctionScope: {
      replaceOnlyThesePlaceholders: [
        'result_or_resource_link_placeholder',
        'practice_link_placeholder',
        'editorial_note_link_placeholder',
      ],
      useOnlyPreviewUrlsFromShopifyExecutionReceipt: true,
      exactUrlsStoredInThisPacket: false,
      exactUrlsPrinted: false,
      customSubscriptionReasonPolicy: correctionPreview?.redactedPayloadManifest?.subscriptionReasonPolicy?.policy ?? 'remove_custom_line_and_rely_on_platform_footer',
    },
    decision: {
      canAskAlejandroForApproval,
      packetIsApprovalByItself: false,
      canOpenMailerLiteUiNow: false,
      canEditDraftsNow: false,
      canSendNow: false,
      exactApprovalPhrase: canAskAlejandroForApproval ? buildExactApprovalPhrase() : null,
    },
    approvalBoundary: {
      allowedAfterExactApproval: [
        'open_mailerlite_ui_manually_prefer_safari',
        'edit_only_the_four_existing_target_drafts',
        'apply_only_the_redacted_corrected_payload_preview',
        'replace_only_the_three_named_inert_placeholders_with_scoped_preview_urls_from_the_shopify_execution_receipt',
        'keep_drafts_unpublished_unscheduled_unattached_and_unsent',
        'record_a_local_execution_receipt_after_editing',
      ],
      stillClosedEvenAfterApproval: [
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
        'freshly confirm the four target drafts are still visible in MailerLite Drafts',
        'confirm no recipients, groups, segments, workflows, schedules or sends are selected',
        'use only exact preview URLs from the scoped Shopify preview route execution receipt',
        'after edits, run real MailerLite render QA before any later test-send approval',
      ],
    },
    blockers,
    safety,
    sourceDigests,
  };
};

const buildPacketFromFiles = async (options) => {
  const [correctionPreview, emailRenderQa, manualUiBuildReceipt, shopifyPreviewRouteExecutionReceipt] = await Promise.all([
    readJsonWithDigest(options.correctionPreview, 'redacted corrected payload preview and link/footer correction boundary'),
    readJsonWithDigest(options.emailRenderQa, 'local post-correction HTML/PNG render QA'),
    readJsonWithDigest(options.manualUiBuildReceipt, 'existing four MailerLite manual UI draft receipts with no sends'),
    readJsonWithDigest(options.shopifyPreviewRouteExecutionReceipt, 'scoped Shopify preview route execution receipt and URL hashes'),
  ]);

  return buildPacket({
    correctionPreview: correctionPreview.value,
    emailRenderQa: emailRenderQa.value,
    manualUiBuildReceipt: manualUiBuildReceipt.value,
    shopifyPreviewRouteExecutionReceipt: shopifyPreviewRouteExecutionReceipt.value,
    sourceDigests: [
      correctionPreview.digest,
      emailRenderQa.digest,
      manualUiBuildReceipt.digest,
      shopifyPreviewRouteExecutionReceipt.digest,
    ],
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Seed Inbox Correction UI Edit Approval Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    `Can ask Alejandro: ${packet.executiveSummary.canAskAlejandroForApproval}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete prepara una frontera exacta para editar en MailerLite UI los 4 borradores existentes con el payload corregido y los links preview ya QA-green. No abre MailerLite, no edita drafts y no envia nada.',
    '',
    '## Summary',
    '',
    `- Target drafts: ${packet.executiveSummary.targetDraftCount}`,
    `- Correction preview: ${packet.executiveSummary.correctionPreviewStatus}`,
    `- Local render QA: ${packet.executiveSummary.emailRenderQaStatus}`,
    `- Local render ready: ${packet.executiveSummary.emailRenderLocalReady}`,
    `- Render preview non-empty count: ${packet.executiveSummary.renderPreviewNonEmptyCount}`,
    `- Red check count: ${packet.executiveSummary.redCheckCount}`,
    `- Shopify preview route execution: ${packet.executiveSummary.shopifyPreviewRouteExecutionStatus}`,
    `- Public/audience URL gate ready: ${packet.executiveSummary.publicAudienceSendUrlGateReady}`,
    `- Open live mutation gates: ${packet.executiveSummary.openLiveMutationGateCount}`,
    '',
    '## Approval Phrase',
    '',
    packet.decision.exactApprovalPhrase ? `\`${packet.decision.exactApprovalPhrase}\`` : '- No approval phrase available while blockers remain.',
    '',
    '## Target Drafts',
    '',
    renderList(packet.targetDrafts.map((draft) => `E${draft.step}: ${draft.draftName}`)),
    '',
    '## Allowed After Exact Approval',
    '',
    renderList(packet.approvalBoundary.allowedAfterExactApproval),
    '',
    '## Still Closed',
    '',
    renderList(packet.approvalBoundary.stillClosedEvenAfterApproval),
    '',
    '## Required Fresh Evidence Before Execution',
    '',
    renderList(packet.approvalBoundary.requiredFreshEvidenceBeforeExecution),
    '',
    '## Blockers',
    '',
    packet.blockers.length ? renderList(packet.blockers) : '- none',
    '',
    '## Fuentes Consultadas',
    '',
    renderList(packet.sourceDigests.map((source) => `${source.path} (${source.consultedFor})`)),
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Shared report stores no exact URLs.',
    '- Sin MailerLite UI/API, Shopify API, CRM API, sends, subscribers, grupos, workflows, ledgers, cards, scoring ni Fact Store.',
  ];

  return `${lines.join('\n')}\n`;
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

  const packet = await buildPacketFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    canAskAlejandroForApproval: packet.executiveSummary.canAskAlejandroForApproval,
    targetDraftCount: packet.executiveSummary.targetDraftCount,
    localRenderReady: packet.executiveSummary.emailRenderLocalReady,
    publicAudienceSendUrlGateReady: packet.executiveSummary.publicAudienceSendUrlGateReady,
    blockerCount: packet.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed inbox correction UI edit approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPacket,
  buildPacketFromFiles,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
