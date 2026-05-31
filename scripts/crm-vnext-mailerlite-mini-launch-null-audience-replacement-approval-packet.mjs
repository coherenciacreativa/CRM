#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet-2026-05-31';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_NULL_AUDIENCE_LAB = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.md';
const SAFETY_GROUP_NAME = 'CC · Safety · Null audience · DO NOT SEND';
const REPLACEMENT_SUFFIX = 'API Null Audience replacement';
const PLACEHOLDERS = [
  'result_or_resource_link_placeholder',
  'practice_link_placeholder',
  'editorial_note_link_placeholder',
];
const redactedTokenFor = (key) => key ? `final_public_link_ready_redacted:${key}` : null;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs [options]

Options:
  --correction-preview <path>                  Redacted seed inbox correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --email-render-qa <path>                     Local post-correction render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --null-audience-lab <path>                   Completed MailerLite API Null Audience lab receipt. Defaults to ${DEFAULT_NULL_AUDIENCE_LAB}
  --real-mailerlite-render-qa <path>           Existing real MailerLite draft QA with source campaign IDs. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --replacement-suffix <text>                  Suffix for replacement draft names. Defaults to ${REPLACEMENT_SUFFIX}
  --out <path>                                 Write JSON approval packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown approval packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                       Show this help

Local-only approval packet for creating four MailerLite API replacement drafts
assigned only to the permanent empty Null Audience safety group. It reads local
QA evidence, HTML files and redacted URL hashes. It never calls live APIs,
opens UI, sends, publishes, schedules, mutates subscribers, creates groups,
edits workflows, touches Shopify/CRM, appends ledgers, writes cards/scoring,
touches Fact Store, prints tokens, prints sender values, or prints exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const parseArgs = (argv) => {
  const options = {
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    nullAudienceLab: DEFAULT_NULL_AUDIENCE_LAB,
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    replacementSuffix: REPLACEMENT_SUFFIX,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
    else if (arg === '--null-audience-lab') options.nullAudienceLab = argv[++index];
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
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

const readTextEvidence = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    path: resolved,
    present: true,
    chars: raw.length,
    sha256: sha256(raw),
    consultedFor,
    placeholderCounts: Object.fromEntries(PLACEHOLDERS.map((placeholder) => [
      placeholder,
      raw.split(placeholder).length - 1,
    ])),
    totalPlaceholderCount: PLACEHOLDERS.reduce((sum, placeholder) => sum + raw.split(placeholder).length - 1, 0),
    redactedFinalLinkTokenCount: (raw.match(/final_public_link_ready_redacted:/gu) ?? []).length,
    urlHashCount: [...raw.matchAll(/https?:\/\/[^"'<>\s)]+/giu)].length,
    exactUrlsPrinted: false,
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  exactUrlsStoredInReport: false,
  exactUrlsPrinted: false,
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
  senderValuesPrinted: false,
  tokensPrinted: false,
});

const buildExactApprovalPhrase = () =>
  `Apruebo crear por API únicamente 4 nuevos borradores de reemplazo del mini-lanzamiento Inteligencia para descansar en MailerLite, asignados solo al grupo vacío de seguridad ${SAFETY_GROUP_NAME} con active_count=0, usando los 4 HTML locales QA-green y reemplazando en memoria solo los tokens redacted final_public_link_ready_redacted:* por las URLs preview unlisted/noindex ya registradas en el Shopify preview route execution receipt, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos o segmentos adicionales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; dejar los borradores viejos intactos como no-use, borrar cualquier borrador creado por esta ejecución si el post-create QA falla, detenerse si el grupo no está vacío o si cualquier borrador no queda apuntando exclusivamente a ese grupo, y generar re-scan fresco y recibo local.`;

const rowByStep = (rows = []) => new Map(rows.map((row) => [Number(row?.step), row]).filter(([step]) => Number.isFinite(step)));
const campaignIdFor = (row) => cleanString(row?.campaignId);

const finalLinkKeyFor = (row) =>
  cleanString(row?.finalPublicLinkKey)
  ?? cleanString(row?.cta?.placeholder?.key)
  ?? null;

const buildReplacementTargets = ({
  correctionPreview,
  emailRenderQa,
  realMailerLiteRenderQa,
  htmlEvidenceByStep = new Map(),
  replacementSuffix = REPLACEMENT_SUFFIX,
}) => {
  const previewRows = rowByStep(correctionPreview?.previewRows ?? []);
  const payloadRows = rowByStep(correctionPreview?.redactedPayloadManifest?.payloads ?? []);
  const qaRows = rowByStep(emailRenderQa?.emailQa ?? []);
  const realRows = rowByStep(realMailerLiteRenderQa?.drafts ?? []);
  const suffix = cleanString(replacementSuffix) ?? REPLACEMENT_SUFFIX;

  return [1, 2, 3, 4].map((step) => {
    const preview = previewRows.get(step) ?? {};
    const payload = payloadRows.get(step) ?? {};
    const qa = qaRows.get(step) ?? {};
    const real = realRows.get(step) ?? {};
    const baseName = cleanString(preview.draftName ?? payload.mailerLiteAssetNameDraft ?? real.expectedName);
    const htmlPath = cleanString(qa.htmlPath);
    const linkKey = finalLinkKeyFor(preview) ?? finalLinkKeyFor(payload);
    return {
      step,
      label: `E${String(step).padStart(2, '0')}`,
      role: cleanString(preview.role ?? payload.role ?? qa.role ?? real.role),
      subject: cleanString(preview.subject ?? payload.subject ?? qa.subject ?? real.subject?.expected ?? real.subject?.observed),
      oldDraftName: cleanString(real.observedName ?? real.expectedName ?? baseName),
      oldCampaignIdSha256: campaignIdFor(real) ? sha256(campaignIdFor(real)) : null,
      oldCampaignIdPresent: Boolean(campaignIdFor(real)),
      replacementDraftName: baseName ? `${baseName} · ${suffix}` : null,
      correctedHtmlPath: htmlPath,
      correctedHtmlSha256: htmlEvidenceByStep.get(step)?.sha256 ?? null,
      correctedHtmlChars: htmlEvidenceByStep.get(step)?.chars ?? null,
      correctedHtmlTotalPlaceholderCount: htmlEvidenceByStep.get(step)?.totalPlaceholderCount ?? null,
      correctedHtmlRedactedFinalLinkTokenCount: htmlEvidenceByStep.get(step)?.redactedFinalLinkTokenCount ?? null,
      correctedHtmlUrlHashCount: htmlEvidenceByStep.get(step)?.urlHashCount ?? null,
      finalPublicLinkKey: linkKey,
      expectedRedactedFinalLinkToken: redactedTokenFor(linkKey),
      expectedFinalPublicUrlSha256: linkKey
        ? cleanString(correctionPreview?.executiveSummary?.finalPublicUrlHashesByKey?.[linkKey])
        : null,
      exactUrlStoredInPacket: false,
    };
  });
};

const nullAudienceLabCompleted = (lab) =>
  lab?.status === 'mailerlite_api_null_audience_lab_completed_null_audience_recipe_found_no_sends'
  && lab?.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts === true
  && lab?.executiveSummary?.safetyGroupActiveCountObserved === 0
  && lab?.safety?.sendsPerformed === false
  && lab?.safety?.campaignsPublished === false
  && lab?.safety?.campaignsScheduled === false
  && lab?.safety?.subscriberMutationsPerformed === false
  && lab?.safety?.workflowMutationsPerformed === false
  && lab?.safety?.realLaunchDraftsCreatedOrEdited === false;

const buildPacket = ({
  correctionPreview,
  emailRenderQa,
  shopifyPreviewRouteExecutionReceipt,
  nullAudienceLab,
  realMailerLiteRenderQa,
  htmlEvidenceByStep = new Map(),
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
  replacementSuffix = REPLACEMENT_SUFFIX,
}) => {
  const blockers = [];
  const safety = buildSafety();
  const targets = buildReplacementTargets({
    correctionPreview,
    emailRenderQa,
    realMailerLiteRenderQa,
    htmlEvidenceByStep,
    replacementSuffix,
  });
  const shopifySummary = shopifyPreviewRouteExecutionReceipt?.executionSummary ?? {};

  if (correctionPreview?.status !== 'seed_inbox_correction_preview_ready_no_live_changes') {
    blockers.push(`correction_preview_not_ready:${correctionPreview?.status ?? 'missing'}`);
  }
  if (correctionPreview?.executiveSummary?.finalPublicLinksReady !== true) blockers.push('final_public_links_not_ready');
  if (correctionPreview?.executiveSummary?.finalPublicLinkCount !== 3) blockers.push('final_public_link_count_not_3');
  if (correctionPreview?.executiveSummary?.publicAudienceSendUrlGateReady !== false) blockers.push('public_audience_send_url_gate_unexpectedly_ready');
  if (correctionPreview?.executiveSummary?.exactUrlsStoredInReport !== false) blockers.push('correction_preview_exact_urls_in_report');
  if (correctionPreview?.executiveSummary?.redactedPayloadManifestReady !== true) blockers.push('redacted_payload_manifest_not_ready');

  if (emailRenderQa?.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
    blockers.push(`email_render_qa_not_green:${emailRenderQa?.status ?? 'missing'}`);
  }
  if (emailRenderQa?.executiveSummary?.localRenderReady !== true) blockers.push('email_render_local_not_ready');
  if (emailRenderQa?.executiveSummary?.emailCount !== 4) blockers.push('email_render_expected_4_emails');
  if (emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount !== 4) blockers.push('email_render_previews_not_all_non_empty');
  if (emailRenderQa?.executiveSummary?.redCheckCount !== 0) blockers.push('email_render_has_red_checks');
  if (emailRenderQa?.executiveSummary?.publicUseReady !== false) blockers.push('email_render_public_gate_unexpectedly_ready');
  if (emailRenderQa?.executiveSummary?.seedSendReady !== false) blockers.push('email_render_seed_send_gate_unexpectedly_ready');

  if (shopifyPreviewRouteExecutionReceipt?.status !== 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm') {
    blockers.push(`shopify_preview_route_execution_not_ready:${shopifyPreviewRouteExecutionReceipt?.status ?? 'missing'}`);
  }
  if (shopifySummary.previewRouteReady !== true) blockers.push('shopify_preview_route_not_ready');
  if (shopifySummary.targetLinkCount !== 3) blockers.push('shopify_preview_route_expected_3_links');
  if (shopifySummary.canUseForLocalCorrectionPreview !== true) blockers.push('shopify_preview_route_not_allowed_for_local_correction_preview');
  if (shopifySummary.publicAudienceSendUrlGateReady !== false) blockers.push('shopify_preview_route_public_send_gate_unexpectedly_ready');

  if (!nullAudienceLabCompleted(nullAudienceLab)) {
    blockers.push(`null_audience_lab_not_completed_or_not_safe:${nullAudienceLab?.status ?? 'missing'}`);
  }
  if (nullAudienceLab?.executiveSummary?.safetyGroupName !== SAFETY_GROUP_NAME) blockers.push('null_audience_lab_safety_group_name_mismatch');
  if (nullAudienceLab?.executiveSummary?.safeNullAudienceVariantCount < 1) blockers.push('null_audience_lab_no_safe_variants');

  if (realMailerLiteRenderQa?.status !== 'mini_launch_real_mailerlite_render_qa_green_no_live_changes') {
    blockers.push(`real_mailerlite_render_qa_not_green:${realMailerLiteRenderQa?.status ?? 'missing'}`);
  }
  if (realMailerLiteRenderQa?.executiveSummary?.draftCount !== 4) blockers.push('real_mailerlite_render_qa_expected_4_drafts');
  if (realMailerLiteRenderQa?.executiveSummary?.allDraftsPreviewed !== true) blockers.push('real_mailerlite_render_qa_not_all_drafts_previewed');
  if (realMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact !== true) blockers.push('real_mailerlite_render_qa_content_not_exact');

  if (targets.length !== 4) blockers.push(`replacement_target_count_not_4:${targets.length}`);
  for (const target of targets) {
    if (!target.role) blockers.push(`target_${target.label}_missing_role`);
    if (!target.subject) blockers.push(`target_${target.label}_missing_subject`);
    if (!target.oldCampaignIdPresent) blockers.push(`target_${target.label}_missing_source_campaign_id`);
    if (!target.replacementDraftName) blockers.push(`target_${target.label}_missing_replacement_name`);
    if (!target.correctedHtmlPath) blockers.push(`target_${target.label}_missing_corrected_html_path`);
    if (!target.correctedHtmlSha256) blockers.push(`target_${target.label}_missing_corrected_html_evidence`);
    if (target.correctedHtmlChars !== null && target.correctedHtmlChars < 100) blockers.push(`target_${target.label}_corrected_html_too_small`);
    if (target.correctedHtmlTotalPlaceholderCount !== 0) blockers.push(`target_${target.label}_html_still_has_placeholders`);
    if (target.step <= 3 && !target.expectedFinalPublicUrlSha256) blockers.push(`target_${target.label}_missing_expected_url_hash`);
    if (target.step <= 3 && target.correctedHtmlRedactedFinalLinkTokenCount < 1) {
      blockers.push(`target_${target.label}_missing_redacted_final_link_token`);
    }
  }

  const canAskAlejandroForApproval = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_null_audience_replacement_approval_packet',
    generatedAt,
    ok: true,
    status: canAskAlejandroForApproval
      ? 'mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes'
      : 'mailerlite_null_audience_replacement_approval_packet_blocked_no_live_changes',
    executiveSummary: {
      canAskAlejandroForApproval,
      replacementTargetCount: targets.length,
      safetyGroupName: SAFETY_GROUP_NAME,
      safetyGroupActiveCountObserved: nullAudienceLab?.executiveSummary?.safetyGroupActiveCountObserved ?? null,
      nullAudienceRecipeReady: nullAudienceLab?.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts ?? null,
      emailRenderQaStatus: emailRenderQa?.status ?? null,
      localRenderReady: emailRenderQa?.executiveSummary?.localRenderReady ?? null,
      redCheckCount: emailRenderQa?.executiveSummary?.redCheckCount ?? null,
      finalPublicLinksReady: correctionPreview?.executiveSummary?.finalPublicLinksReady ?? null,
      publicAudienceSendUrlGateReady: correctionPreview?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      realMailerLiteRenderQaStatus: realMailerLiteRenderQa?.status ?? null,
      sourceCampaignIdCount: targets.filter((target) => target.oldCampaignIdPresent).length,
      openLiveMutationGateCount: 0,
      blockerCount: blockers.length,
      nextSafeAction: canAskAlejandroForApproval
        ? 'Ask Alejandro for exact API Null Audience replacement-draft approval before creating any real replacement drafts.'
        : 'Resolve blockers locally before asking for approval.',
    },
    launch: correctionPreview?.launch ?? emailRenderQa?.launch ?? realMailerLiteRenderQa?.launch ?? null,
    replacementTargets: targets,
    decision: {
      packetIsApprovalByItself: false,
      canCreateReplacementDraftsNow: false,
      exactApprovalPhrase: buildExactApprovalPhrase(),
      exactApprovalPhrasePrintedByConsole: false,
      allowedAfterExactApproval: [
        `read MailerLite groups and confirm ${SAFETY_GROUP_NAME} exists with active_count=0`,
        'read source draft campaign metadata/content only for sender identity and source verification',
        'create exactly 4 new MailerLite draft campaigns assigned only to the empty Null Audience safety group',
        'use only the 4 local QA-green HTML files as content source',
        'replace only final_public_link_ready_redacted:* tokens with exact preview URLs from the Shopify preview receipt in memory',
        'keep existing old mini-launch drafts intact as no-use references',
        'delete drafts created by the execution if post-create QA fails',
        'write local execution receipt with hashes/counts/booleans only',
      ],
      stillClosedEvenAfterApproval: [
        'sending_test_or_public_email',
        'publishing_or_scheduling_campaigns',
        'assigning_any_non_null_audience_group_or_segment',
        'creating_additional_groups_or_segments',
        'subscriber_read_import_assignment_or_mutation',
        'workflow_or_automation_attachment',
        'editing_or_deleting_old_existing_mini_launch_drafts',
        'shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'fresh MailerLite group scan confirms the Null Audience safety group exists and active_count=0',
        'fresh MailerLite campaign scan confirms replacement draft names do not already exist',
        'fresh source draft reads confirm all source campaigns are still draft campaigns',
        'post-create QA confirms each created draft points exclusively to the Null Audience group',
      ],
    },
    blockers,
    sourceDigests,
    safety,
  };
};

const renderList = (rows) => rows.length ? rows.map((row) => `- ${row}`) : ['- none'];

const renderMarkdown = (packet) => [
  '# MailerLite Null Audience Replacement Approval Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  `Can ask Alejandro for approval: ${packet.executiveSummary.canAskAlejandroForApproval}`,
  `Replacement target count: ${packet.executiveSummary.replacementTargetCount}`,
  `Safety group: ${packet.executiveSummary.safetyGroupName}`,
  `Safety group active_count observed in lab: ${packet.executiveSummary.safetyGroupActiveCountObserved}`,
  `Null Audience recipe ready: ${packet.executiveSummary.nullAudienceRecipeReady}`,
  `Public audience send URL gate ready: ${packet.executiveSummary.publicAudienceSendUrlGateReady}`,
  '',
  '## Targets',
  '',
  ...packet.replacementTargets.map((target) =>
    `- ${target.label}: ${target.replacementDraftName}; sourceCampaignIdPresent=${target.oldCampaignIdPresent}; htmlChars=${target.correctedHtmlChars}; placeholders=${target.correctedHtmlTotalPlaceholderCount}; redactedLinkTokens=${target.correctedHtmlRedactedFinalLinkTokenCount}; exactUrlStored=${target.exactUrlStoredInPacket}`),
  '',
  '## Exact Approval Phrase',
  '',
  '```text',
  packet.decision.exactApprovalPhrase,
  '```',
  '',
  '## Blockers',
  '',
  ...renderList(packet.blockers),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${packet.safety.mailerLiteApiCalled}`,
  `- MailerLite mutations performed: ${packet.safety.mailerLiteMutationsPerformed}`,
  `- Sends/publish/schedule: ${packet.safety.sendsPerformed}/${packet.safety.publicCampaignPublished}/${packet.safety.schedulesCreated}`,
  `- Subscribers read/mutated: ${packet.safety.subscribersRead}/${packet.safety.subscriberMutationsPerformed}`,
  `- Groups assigned/created now: ${packet.safety.groupsCreatedOrAssigned}`,
  `- Shopify/CRM touched: ${packet.safety.shopifyMutationsPerformed}/${packet.safety.crmLiveApiCalled}`,
  `- Exact URLs/tokens/sender values printed: ${packet.safety.exactUrlsPrinted}/${packet.safety.tokensPrinted}/${packet.safety.senderValuesPrinted}`,
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
    shopifyPreviewRouteExecutionReceipt,
    nullAudienceLab,
    realMailerLiteRenderQa,
  ] = await Promise.all([
    readJsonWithDigest(options.correctionPreview, 'redacted corrected payload preview and URL hashes'),
    readJsonWithDigest(options.emailRenderQa, 'local render QA and corrected HTML paths'),
    readJsonWithDigest(options.shopifyPreviewRouteExecutionReceipt, 'preview route receipt with exact URLs kept out of packet output'),
    readJsonWithDigest(options.nullAudienceLab, 'completed API Null Audience lab receipt'),
    readJsonWithDigest(options.realMailerLiteRenderQa, 'existing real MailerLite render QA with source campaign IDs'),
  ]);

  const qaByStep = rowByStep(emailRenderQa.value?.emailQa ?? []);
  const htmlEntries = await Promise.all([1, 2, 3, 4].map(async (step) => {
    const htmlPath = cleanString(qaByStep.get(step)?.htmlPath);
    if (!htmlPath) return [step, null];
    return [step, await readTextEvidence(htmlPath, `corrected_html_step_${step}`)];
  }));
  const htmlEvidenceByStep = new Map(htmlEntries.filter(([, evidence]) => evidence));

  const packet = buildPacket({
    correctionPreview: correctionPreview.value,
    emailRenderQa: emailRenderQa.value,
    shopifyPreviewRouteExecutionReceipt: shopifyPreviewRouteExecutionReceipt.value,
    nullAudienceLab: nullAudienceLab.value,
    realMailerLiteRenderQa: realMailerLiteRenderQa.value,
    htmlEvidenceByStep,
    sourceDigests: [
      correctionPreview.digest,
      emailRenderQa.digest,
      shopifyPreviewRouteExecutionReceipt.digest,
      nullAudienceLab.digest,
      realMailerLiteRenderQa.digest,
      ...[...htmlEvidenceByStep.values()].map((evidence) => ({
        path: evidence.path,
        present: evidence.present,
        chars: evidence.chars,
        consultedFor: evidence.consultedFor,
        sha256: evidence.sha256,
        exactUrlsPrinted: false,
      })),
    ],
    replacementSuffix: options.replacementSuffix,
  });

  await writeOutputs(packet, options);
  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    canAskAlejandroForApproval: packet.executiveSummary.canAskAlejandroForApproval,
    replacementTargetCount: packet.executiveSummary.replacementTargetCount,
    nullAudienceRecipeReady: packet.executiveSummary.nullAudienceRecipeReady,
    blockerCount: packet.executiveSummary.blockerCount,
    out: resolve(options.out),
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Null Audience replacement approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  SAFETY_GROUP_NAME,
  buildExactApprovalPhrase,
  buildPacket,
  buildReplacementTargets,
  nullAudienceLabCompleted,
  parseArgs,
  renderMarkdown,
};
