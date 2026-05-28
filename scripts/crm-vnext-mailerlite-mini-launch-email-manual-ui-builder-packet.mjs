#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-manual-ui-builder-packet-2026-05-28';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_ASSET_BUILD_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_fresh_dry_run_before_execution_inteligencia_descansar_2026-05-28.json';
const DEFAULT_ASSET_BUILD_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_EXECUTED_retry_with_validation_detail_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-builder-packet.mjs [options]

Options:
  --payload-manifest <path>        Email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --render-qa <path>               Local render QA JSON. Defaults to ${DEFAULT_RENDER_QA}
  --asset-build-dry-run <path>     Fresh asset-build dry-run JSON. Defaults to ${DEFAULT_ASSET_BUILD_DRY_RUN}
  --asset-build-execution <path>   Failed API execution receipt JSON. Defaults to ${DEFAULT_ASSET_BUILD_EXECUTION}
  --out <path>                     Write JSON packet
  --markdown-out <path>            Write Markdown packet
  --help                           Show this help

Local-only approval packet for a manual MailerLite UI builder fallback after
the API content-submission path is blocked by plan limits. It never opens a
browser, calls MailerLite, creates/edits drafts, sends emails, reads or assigns
subscribers, creates groups, attaches workflows, touches Shopify/CRM, appends
ledgers, writes cards, changes scoring, touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    renderQa: DEFAULT_RENDER_QA,
    assetBuildDryRun: DEFAULT_ASSET_BUILD_DRY_RUN,
    assetBuildExecution: DEFAULT_ASSET_BUILD_EXECUTION,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--render-qa') options.renderQa = argv[++index];
    else if (arg === '--asset-build-dry-run') options.assetBuildDryRun = argv[++index];
    else if (arg === '--asset-build-execution') options.assetBuildExecution = argv[++index];
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

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const executionHasAdvancedPlanContentBlocker = (executionAttempt) =>
  (executionAttempt?.errors ?? []).some((error) =>
    (error?.details ?? []).some((detail) =>
      /content submission is only available on advanced plan/i.test(cleanString(detail?.message) ?? ''),
    ),
  );

const placeholderValuesFrom = (payloads) => [...new Set(payloads
  .map((payload) => payload?.cta?.placeholder?.value)
  .filter(Boolean)
  .map(cleanString)
  .filter(Boolean))];

const targetRowsFrom = ({ payloadManifest, renderQa }) => {
  const renderRowsByStep = new Map((renderQa?.emailQa ?? []).map((row) => [row.step, row]));
  return (payloadManifest?.payloads ?? []).map((payload) => {
    const renderRow = renderRowsByStep.get(payload.step) ?? {};
    return {
      step: payload.step,
      role: cleanString(payload.role),
      draftName: cleanString(payload.mailerLiteAssetNameDraft),
      subject: cleanString(payload.subject),
      preheader: cleanString(payload.preheader),
      htmlPath: cleanString(renderRow.htmlPath),
      previewPath: cleanString(renderRow.renderPreview?.path),
      localRenderReady: renderRow.localRenderReady === true,
      placeholderValues: placeholderValuesFrom([payload]),
      replyCta: payload?.cta?.destinationType === 'reply_to_email',
      manualUiAction: 'create_or_edit_named_mailerlite_draft_only',
      stillClosed: [
        'send_or_schedule',
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
    };
  });
};

const exactApprovalPhraseFor = ({ launch, targetRows, placeholders }) => {
  const resourceName = cleanString(launch?.resourceName) ?? 'Inteligencia para descansar';
  const placeholderText = placeholders.length ? placeholders.join(', ') : 'sin placeholders URL';
  return `Apruebo construir manualmente en MailerLite UI únicamente estos ${targetRows.length} borradores del mini-lanzamiento ${resourceName}, copiando el contenido desde los HTML locales del paquete manual UI, usando placeholders inertes (${placeholderText}), sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;
};

const validateReadiness = ({
  payloadManifest,
  renderQa,
  assetBuildDryRun,
  assetBuildExecution,
}) => {
  const issues = [];
  const payloads = Array.isArray(payloadManifest?.payloads) ? payloadManifest.payloads : [];
  const renderRows = Array.isArray(renderQa?.emailQa) ? renderQa.emailQa : [];

  if (payloadManifest?.ok !== true) issues.push('payload_manifest_not_ok');
  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    issues.push(`payload_manifest_status_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (payloadManifest?.approvalBoundary?.canSendNow !== false) issues.push('payload_manifest_send_gate_open');
  if (payloadManifest?.approvalBoundary?.canAttachWorkflowNow !== false) issues.push('payload_manifest_workflow_gate_open');
  if (payloadManifest?.approvalBoundary?.canReadOrAssignSubscribersNow !== false) issues.push('payload_manifest_subscriber_gate_open');
  if (payloadManifest?.approvalBoundary?.canCreateGroupsNow !== false) issues.push('payload_manifest_group_gate_open');
  if (payloads.length !== 4) issues.push(`payload_manifest_expected_4_payloads:${payloads.length}`);

  if (renderQa?.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
    issues.push(`render_qa_not_green:${renderQa?.status ?? 'missing'}`);
  }
  if (renderQa?.executiveSummary?.localRenderReady !== true) issues.push('render_qa_local_render_not_ready');
  if (renderQa?.executiveSummary?.publicUseReady !== false) issues.push('render_qa_public_gate_open');
  if (renderQa?.executiveSummary?.seedSendReady !== false) issues.push('render_qa_seed_send_gate_open');
  if (renderQa?.safety?.mailerLiteApiCalled !== false) issues.push('render_qa_reports_mailerlite_api_call');
  if (renderQa?.safety?.sendsPerformed !== false) issues.push('render_qa_reports_send');
  if (renderRows.length !== 4) issues.push(`render_qa_expected_4_rows:${renderRows.length}`);

  if (assetBuildDryRun?.status !== 'dry_run_ready_for_exact_asset_build_approval') {
    issues.push(`asset_build_dry_run_not_ready:${assetBuildDryRun?.status ?? 'missing'}`);
  }
  if ((assetBuildDryRun?.freshScan?.conflictCount ?? 0) !== 0) issues.push('asset_build_dry_run_has_conflicts');
  if ((assetBuildDryRun?.freshScan?.createDraftCount ?? 0) + (assetBuildDryRun?.freshScan?.updateDraftCount ?? 0) !== 4) {
    issues.push('asset_build_dry_run_target_count_not_4');
  }
  if (assetBuildDryRun?.safety?.sendsPerformed !== false) issues.push('asset_build_dry_run_reports_send');
  if (assetBuildDryRun?.safety?.subscribersRead !== false) issues.push('asset_build_dry_run_reports_subscriber_read');
  if (assetBuildDryRun?.safety?.groupsCreatedOrAssigned !== false) issues.push('asset_build_dry_run_reports_group_assignment');

  if (assetBuildExecution?.status !== 'failed_during_mini_launch_email_asset_build') {
    issues.push(`asset_build_execution_not_failed_as_expected:${assetBuildExecution?.status ?? 'missing'}`);
  }
  if (!executionHasAdvancedPlanContentBlocker(assetBuildExecution)) {
    issues.push('asset_build_execution_missing_advanced_plan_blocker');
  }
  if (countRows(assetBuildExecution?.assetMutations) !== 0) issues.push('asset_build_execution_has_partial_mutations');
  if (assetBuildExecution?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('asset_build_execution_reports_asset_mutation');
  if (assetBuildExecution?.safety?.sendsPerformed !== false) issues.push('asset_build_execution_reports_send');
  if (assetBuildExecution?.safety?.subscribersRead !== false) issues.push('asset_build_execution_reports_subscriber_read');
  if (assetBuildExecution?.safety?.groupsCreatedOrAssigned !== false) issues.push('asset_build_execution_reports_group_assignment');
  if (assetBuildExecution?.safety?.workflowMutationsPerformed !== false) issues.push('asset_build_execution_reports_workflow_mutation');

  for (const payload of payloads) {
    if (!cleanString(payload?.mailerLiteAssetNameDraft)) issues.push(`payload_missing_draft_name:${payload?.step ?? 'unknown'}`);
    if (!cleanString(payload?.subject)) issues.push(`payload_missing_subject:${payload?.step ?? 'unknown'}`);
    if (!cleanString(payload?.preheader)) issues.push(`payload_missing_preheader:${payload?.step ?? 'unknown'}`);
  }
  for (const renderRow of renderRows) {
    if (!cleanString(renderRow?.htmlPath)) issues.push(`render_row_missing_html_path:${renderRow?.step ?? 'unknown'}`);
    if (renderRow?.localRenderReady !== true) issues.push(`render_row_not_ready:${renderRow?.step ?? 'unknown'}`);
    if (renderRow?.renderPreviewNonEmpty !== true) issues.push(`render_row_preview_empty:${renderRow?.step ?? 'unknown'}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    payloads,
    renderRows,
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  browserOpened: false,
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
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildManualUiBuilderPacket = ({
  payloadManifest,
  renderQa,
  assetBuildDryRun,
  assetBuildExecution,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const readiness = validateReadiness({
    payloadManifest,
    renderQa,
    assetBuildDryRun,
    assetBuildExecution,
  });
  const targetRows = targetRowsFrom({ payloadManifest, renderQa });
  const placeholders = placeholderValuesFrom(readiness.payloads);
  const canAskApproval = readiness.ok;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_manual_ui_builder_fallback_packet',
    generatedAt,
    ok: canAskApproval,
    status: canAskApproval
      ? 'mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes'
      : 'mini_launch_email_manual_ui_builder_packet_blocked_before_approval',
    launch: payloadManifest?.launch ?? renderQa?.launch ?? null,
    executiveSummary: {
      targetDraftCount: targetRows.length,
      htmlSourceCount: targetRows.filter((row) => row.htmlPath).length,
      localRenderReadyCount: targetRows.filter((row) => row.localRenderReady).length,
      advancedPlanApiBlockerConfirmed: executionHasAdvancedPlanContentBlocker(assetBuildExecution),
      apiAssetMutationCount: countRows(assetBuildExecution?.assetMutations),
      canAskManualUiApprovalNow: canAskApproval,
      canUseManualUiNow: false,
      canSendNow: false,
      canAttachWorkflowNow: false,
      canReadOrAssignSubscribersNow: false,
      canCreateOrAssignGroupsNow: false,
      openLiveMutationGateCount: 0,
      nextBestMove: canAskApproval
        ? 'Ask for the exact manual UI builder approval only if Alejandro wants Codex to create/edit these drafts in MailerLite UI instead of API.'
        : 'Resolve blockers before asking for any manual UI builder approval.',
    },
    sourceEvidence: {
      payloadManifestStatus: payloadManifest?.status ?? null,
      renderQaStatus: renderQa?.status ?? null,
      assetBuildDryRunStatus: assetBuildDryRun?.status ?? null,
      assetBuildExecutionStatus: assetBuildExecution?.status ?? null,
      assetBuildExecutionErrors: (assetBuildExecution?.errors ?? []).map((error) => ({
        step: error.step,
        reason: cleanString(error.reason),
        status: error.status ?? null,
        details: (error.details ?? []).map((detail) => ({
          field: cleanString(detail.field),
          message: cleanString(detail.message),
        })),
      })),
    },
    manualUiApprovalBoundary: {
      canAskAlejandroForApproval: canAskApproval,
      packetIsApprovalByItself: false,
      canUseBrowserNow: false,
      canCreateOrEditDraftsNow: false,
      exactApprovalPhrase: canAskApproval
        ? exactApprovalPhraseFor({
          launch: payloadManifest?.launch ?? renderQa?.launch,
          targetRows,
          placeholders,
        })
        : null,
      allowedAfterExactApproval: [
        'open_mailerlite_ui_manually_prefer_safari',
        'create_or_edit_exactly_4_named_draft_campaigns_only',
        'copy_content_only_from_the_4_local_html_sources_in_this_packet',
        'use_inert_placeholders_or_exact_non_live_preview_urls_only',
        'keep_every_campaign_unsent_unpublished_unscheduled_and_unattached',
      ],
      stillClosedEvenAfterApproval: [
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
      requiredFreshEvidenceBeforeExecution: [
        'freshly confirm the four target draft names in MailerLite UI or read-only campaign scan',
        'confirm no existing sent/ready campaign has any target name',
        'confirm all four local HTML paths still exist and render QA remains green',
        'after UI build, produce a manual execution receipt with draft ids and no-send evidence',
        'run real MailerLite render QA before any seed-send approval request',
      ],
    },
    manualUiTargetDrafts: targetRows,
    operatorChecklist: [
      'Use Safari if computer-use/browser UI work is approved.',
      'Create or edit only the four target drafts listed here.',
      'Do not select recipients, groups, segments, automations or schedules.',
      'Do not send test emails from this approval.',
      'Leave CTA URLs as inert placeholders unless a separate exact non-live URL approval exists.',
      'Capture post-build evidence without subscriber rows or tokens.',
    ],
    blockers: readiness.issues,
    hardStops: [
      'This packet is not approval.',
      'The previous API approval was used and failed with zero mutations; this packet defines a new manual UI boundary.',
      'Do not use this packet to send, schedule, attach workflows, read subscribers, assign groups or publish anything.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Manual UI Builder Fallback Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Executive Summary',
    '',
    `- Target drafts: ${packet.executiveSummary.targetDraftCount}`,
    `- HTML sources: ${packet.executiveSummary.htmlSourceCount}`,
    `- Local render ready count: ${packet.executiveSummary.localRenderReadyCount}`,
    `- Advanced-plan API blocker confirmed: ${packet.executiveSummary.advancedPlanApiBlockerConfirmed}`,
    `- API asset mutation count: ${packet.executiveSummary.apiAssetMutationCount}`,
    `- Can ask manual UI approval now: ${packet.executiveSummary.canAskManualUiApprovalNow}`,
    `- Can use manual UI now: ${packet.executiveSummary.canUseManualUiNow}`,
    `- Can send now: ${packet.executiveSummary.canSendNow}`,
    `- Open live mutation gates: ${packet.executiveSummary.openLiveMutationGateCount}`,
    '',
    '## Exact Approval Phrase',
    '',
    packet.manualUiApprovalBoundary.exactApprovalPhrase
      ? '```text'
      : '- Not available.',
  ];

  if (packet.manualUiApprovalBoundary.exactApprovalPhrase) {
    lines.push(packet.manualUiApprovalBoundary.exactApprovalPhrase, '```');
  }

  lines.push('', '## Target Drafts', '');
  for (const target of packet.manualUiTargetDrafts) {
    lines.push(
      `- ${target.step}. ${target.draftName}`,
      `  - Subject: ${target.subject}`,
      `  - Preheader: ${target.preheader}`,
      `  - HTML: ${target.htmlPath}`,
      `  - Preview: ${target.previewPath ?? 'none'}`,
    );
  }

  lines.push('', '## Still Closed', '');
  for (const item of packet.manualUiApprovalBoundary.stillClosedEvenAfterApproval) lines.push(`- ${item}`);

  lines.push('', '## Required Fresh Evidence Before Execution', '');
  for (const item of packet.manualUiApprovalBoundary.requiredFreshEvidenceBeforeExecution) lines.push(`- ${item}`);

  lines.push('', '## Blockers', '');
  if (packet.blockers.length) {
    for (const blocker of packet.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- None.');
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- Sin navegador abierto.',
    '- Sin MailerLite API calls.',
    '- Sin drafts creados/editados.',
    '- Sin subscribers, groups, workflows o sends.',
    '- Sin Shopify/CRM live mutations, ledgers, cards, scoring o Fact Store.',
    '- Sin tokens impresos.',
    '',
  );

  return `${lines.join('\n')}\n`;
};

const writeJson = async (path, value) => {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = async (path, value) => {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), value);
};

const buildPacketFromFiles = async (options) => {
  const entries = await Promise.all([
    readJsonWithDigest(options.payloadManifest, 'local builder payload manifest'),
    readJsonWithDigest(options.renderQa, 'local HTML and PNG render QA evidence'),
    readJsonWithDigest(options.assetBuildDryRun, 'fresh read-only campaign scan before asset build'),
    readJsonWithDigest(options.assetBuildExecution, 'failed API execution receipt with zero mutations and Advanced-plan blocker'),
  ]);
  const [payloadManifest, renderQa, assetBuildDryRun, assetBuildExecution] = entries.map((entry) => entry.value);

  return buildManualUiBuilderPacket({
    payloadManifest,
    renderQa,
    assetBuildDryRun,
    assetBuildExecution,
    sourceDigests: entries.map((entry) => entry.digest),
  });
};

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
    targetDraftCount: packet.executiveSummary.targetDraftCount,
    canAskManualUiApprovalNow: packet.executiveSummary.canAskManualUiApprovalNow,
    canUseManualUiNow: packet.executiveSummary.canUseManualUiNow,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite manual UI builder packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildManualUiBuilderPacket,
  buildSafety,
  exactApprovalPhraseFor,
  executionHasAdvancedPlanContentBlocker,
  parseArgs,
  renderMarkdown,
  targetRowsFrom,
  validateReadiness,
};
